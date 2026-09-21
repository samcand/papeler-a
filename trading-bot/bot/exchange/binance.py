"""Ejecutor real contra Binance (spot).

Requisitos de seguridad que este modulo da por sentados:

- Las claves se leen de variables de entorno, nunca del YAML ni del codigo.
- La clave de API debe estar creada SIN permiso de retiro. El bot solo
  necesita "Enable Spot Trading"; si la clave puede retirar fondos, una fuga
  deja de ser un susto y pasa a ser una perdida.
- Solo se mandan ordenes de mercado en spot. Nada de margen ni de futuros: sin
  apalancamiento, la peor perdida posible es el dinero que hay en la cuenta.
"""

from __future__ import annotations

import hashlib
import hmac
import math
import os
import time
import urllib.parse
from typing import Any, Dict, Optional

try:
    import requests
except ImportError:  # pragma: no cover - depende del entorno
    requests = None  # type: ignore[assignment]

from .base import ErrorDeExchange, Exchange, Orden, moneda_base, moneda_cotizada

URL_PRODUCCION = "https://api.binance.com"
URL_TESTNET = "https://testnet.binance.vision"


class BinanceExchange(Exchange):
    nombre = "binance"
    simulado = False

    def __init__(self, cfg, clave: Optional[str] = None, secreto: Optional[str] = None) -> None:
        if requests is None:  # pragma: no cover
            raise ErrorDeExchange("Falta requests. Instalalo con: pip install requests")
        self.cfg = cfg
        self.testnet = bool(cfg.get("exchange.testnet", True))
        self.base = URL_TESTNET if self.testnet else URL_PRODUCCION
        self.recv_window = int(cfg.get("exchange.recv_window_ms", 5000))
        self.clave = clave or os.environ.get("BINANCE_API_KEY", "")
        self.secreto = secreto or os.environ.get("BINANCE_API_SECRET", "")
        if not self.clave or not self.secreto:
            raise ErrorDeExchange(
                "Faltan las claves. Exporta BINANCE_API_KEY y BINANCE_API_SECRET "
                "(del testnet si exchange.testnet es true)."
            )
        self._filtros: Dict[str, Dict[str, float]] = {}

    # -- transporte -------------------------------------------------------
    def _publico(self, ruta: str, parametros: Dict[str, Any]) -> Any:
        try:
            respuesta = requests.get(f"{self.base}{ruta}", params=parametros, timeout=20)
            respuesta.raise_for_status()
            return respuesta.json()
        except Exception as error:  # noqa: BLE001
            raise ErrorDeExchange(f"GET {ruta} fallo: {error}") from error

    def _firmar(self, parametros: Dict[str, Any]) -> str:
        consulta = urllib.parse.urlencode(parametros)
        firma = hmac.new(
            self.secreto.encode("utf-8"), consulta.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return f"{consulta}&signature={firma}"

    def _privado(self, metodo: str, ruta: str, parametros: Dict[str, Any]) -> Any:
        parametros = dict(parametros)
        parametros["timestamp"] = int(time.time() * 1000)
        parametros["recvWindow"] = self.recv_window
        cuerpo = self._firmar(parametros)
        cabeceras = {"X-MBX-APIKEY": self.clave}
        url = f"{self.base}{ruta}?{cuerpo}"
        try:
            if metodo == "GET":
                respuesta = requests.get(url, headers=cabeceras, timeout=20)
            else:
                respuesta = requests.post(url, headers=cabeceras, timeout=20)
            if respuesta.status_code >= 400:
                raise ErrorDeExchange(
                    f"{metodo} {ruta} devolvio {respuesta.status_code}: {respuesta.text}"
                )
            return respuesta.json()
        except ErrorDeExchange:
            raise
        except Exception as error:  # noqa: BLE001
            raise ErrorDeExchange(f"{metodo} {ruta} fallo: {error}") from error

    # -- consultas --------------------------------------------------------
    def precio(self, simbolo: str) -> float:
        datos = self._publico("/api/v3/ticker/price", {"symbol": simbolo.upper()})
        return float(datos["price"])

    def saldo(self, moneda: str) -> float:
        cuenta = self._privado("GET", "/api/v3/account", {})
        for activo in cuenta.get("balances", []):
            if activo.get("asset") == moneda.upper():
                return float(activo.get("free", 0.0))
        return 0.0

    def filtros(self, simbolo: str) -> Dict[str, float]:
        """stepSize / minQty / minNotional del simbolo, cacheados."""
        simbolo = simbolo.upper()
        if simbolo in self._filtros:
            return self._filtros[simbolo]
        datos = self._publico("/api/v3/exchangeInfo", {"symbol": simbolo})
        simbolos = datos.get("symbols") or []
        if not simbolos:
            raise ErrorDeExchange(f"Binance no conoce el simbolo {simbolo}")
        resultado = {"step": 0.0, "min_qty": 0.0, "min_notional": 0.0}
        for filtro in simbolos[0].get("filters", []):
            tipo = filtro.get("filterType")
            if tipo == "LOT_SIZE":
                resultado["step"] = float(filtro.get("stepSize", 0.0))
                resultado["min_qty"] = float(filtro.get("minQty", 0.0))
            elif tipo in ("NOTIONAL", "MIN_NOTIONAL"):
                resultado["min_notional"] = float(
                    filtro.get("minNotional", filtro.get("notional", 0.0))
                )
        self._filtros[simbolo] = resultado
        return resultado

    def normalizar_cantidad(self, simbolo: str, cantidad: float) -> float:
        """Redondea hacia abajo al stepSize; si no llega al minimo, devuelve 0."""
        filtros = self.filtros(simbolo)
        paso = filtros.get("step", 0.0)
        if paso > 0:
            cantidad = math.floor(cantidad / paso) * paso
            # El floor en coma flotante deja colas de decimales que Binance rechaza.
            decimales = max(0, int(round(-math.log10(paso)))) if paso < 1 else 0
            cantidad = round(cantidad, decimales)
        if cantidad < filtros.get("min_qty", 0.0):
            return 0.0
        return cantidad

    def minimo_notional(self, simbolo: str) -> Optional[float]:
        valor = self.filtros(simbolo).get("min_notional", 0.0)
        return valor or None

    # -- ordenes ----------------------------------------------------------
    def comprar(self, simbolo: str, notional: float) -> Orden:
        minimo = self.minimo_notional(simbolo) or 0.0
        if notional < minimo:
            raise ErrorDeExchange(
                f"La compra de {notional:.2f} no llega al minimo de {simbolo} ({minimo})"
            )
        datos = self._privado(
            "POST",
            "/api/v3/order",
            {
                "symbol": simbolo.upper(),
                "side": "BUY",
                "type": "MARKET",
                # quoteOrderQty = "gasta este importe", evita calcular la cantidad
                # con un precio que ya cambio entre la consulta y la orden.
                "quoteOrderQty": f"{notional:.8f}",
            },
        )
        return self._orden_desde_respuesta(simbolo, "COMPRA", datos)

    def vender(self, simbolo: str, cantidad: float) -> Orden:
        cantidad = self.normalizar_cantidad(simbolo, cantidad)
        if cantidad <= 0:
            raise ErrorDeExchange(
                f"La cantidad a vender de {simbolo} queda por debajo del minimo del exchange"
            )
        datos = self._privado(
            "POST",
            "/api/v3/order",
            {
                "symbol": simbolo.upper(),
                "side": "SELL",
                "type": "MARKET",
                "quantity": f"{cantidad:.8f}",
            },
        )
        return self._orden_desde_respuesta(simbolo, "VENTA", datos)

    def _orden_desde_respuesta(self, simbolo: str, lado: str, datos: Dict[str, Any]) -> Orden:
        ejecutada = float(datos.get("executedQty", 0.0) or 0.0)
        importe = float(datos.get("cummulativeQuoteQty", 0.0) or 0.0)
        comision = 0.0
        cotizada = moneda_cotizada(simbolo)
        for relleno in datos.get("fills", []) or []:
            coste = float(relleno.get("commission", 0.0) or 0.0)
            activo = relleno.get("commissionAsset", "")
            if activo == cotizada:
                comision += coste
            elif activo == moneda_base(simbolo) and ejecutada:
                # Comision cobrada en la moneda comprada: la valoramos al precio medio.
                comision += coste * (importe / ejecutada if ejecutada else 0.0)
            else:
                # Comision en BNB u otra moneda: no la convertimos, la anotamos aparte.
                comision += 0.0
        precio = (importe / ejecutada) if ejecutada else 0.0
        return Orden(
            simbolo=simbolo.upper(),
            lado=lado,
            cantidad=ejecutada,
            precio=precio,
            notional=importe,
            comision=comision,
            identificador=str(datos.get("orderId", "")),
            simulada=False,
        )
