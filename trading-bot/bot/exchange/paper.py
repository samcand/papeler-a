"""Ejecutor simulado: precios reales, dinero ficticio.

Es el modo por defecto y el unico que se deberia usar hasta tener semanas de
registro. Aplica las mismas comisiones y el mismo deslizamiento que el
backtest, asi que un resultado raro aqui es una senal, no ruido.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from ..marketdata import precio_actual
from .base import Exchange, Orden, moneda_base, moneda_cotizada


class PaperExchange(Exchange):
    nombre = "paper"
    simulado = True

    def __init__(
        self,
        cfg,
        cartera: Optional[Dict[str, Any]] = None,
        proveedor_precio: Optional[Callable[[str], float]] = None,
    ) -> None:
        self.cfg = cfg
        self.comision_pct = float(cfg.get("costos.comision_pct", 0.1))
        self.deslizamiento_pct = float(cfg.get("costos.deslizamiento_pct", 0.05))
        self.testnet = bool(cfg.get("exchange.testnet", True))
        self._proveedor = proveedor_precio
        self.cartera: Dict[str, Any] = cartera if cartera is not None else {}
        self.cartera.setdefault("efectivo", float(cfg.get("riesgo.capital_inicial", 1000.0)))
        self.cartera.setdefault("activos", {})

    # -- consultas --------------------------------------------------------
    def precio(self, simbolo: str) -> float:
        if self._proveedor is not None:
            return float(self._proveedor(simbolo))
        # El precio se lee siempre del mercado real, aunque el dinero sea ficticio.
        return precio_actual(simbolo, testnet=False)

    def saldo(self, moneda: str) -> float:
        moneda = moneda.upper()
        if moneda in ("USDT", "USDC", "BUSD", "FDUSD", "EUR"):
            return float(self.cartera.get("efectivo", 0.0))
        return float(self.cartera.get("activos", {}).get(moneda, 0.0))

    # -- ordenes ----------------------------------------------------------
    def comprar(self, simbolo: str, notional: float) -> Orden:
        precio = self.precio(simbolo) * (1.0 + self.deslizamiento_pct / 100.0)
        comision = notional * self.comision_pct / 100.0
        efectivo = float(self.cartera.get("efectivo", 0.0))
        if notional + comision > efectivo:
            raise ValueError(
                f"Saldo simulado insuficiente: hacen falta {notional + comision:.2f} "
                f"y hay {efectivo:.2f}"
            )
        cantidad = notional / precio
        self.cartera["efectivo"] = efectivo - notional - comision
        activos = self.cartera.setdefault("activos", {})
        base = moneda_base(simbolo)
        activos[base] = activos.get(base, 0.0) + cantidad
        return Orden(
            simbolo=simbolo, lado="COMPRA", cantidad=cantidad, precio=precio,
            notional=notional, comision=comision, identificador="paper", simulada=True,
        )

    def vender(self, simbolo: str, cantidad: float) -> Orden:
        precio = self.precio(simbolo) * (1.0 - self.deslizamiento_pct / 100.0)
        activos = self.cartera.setdefault("activos", {})
        base = moneda_base(simbolo)
        disponible = float(activos.get(base, 0.0))
        if cantidad > disponible + 1e-12:
            raise ValueError(
                f"No hay {cantidad:.8f} {base} en la cartera simulada (hay {disponible:.8f})"
            )
        ingreso = cantidad * precio
        comision = ingreso * self.comision_pct / 100.0
        activos[base] = disponible - cantidad
        self.cartera["efectivo"] = float(self.cartera.get("efectivo", 0.0)) + ingreso - comision
        return Orden(
            simbolo=simbolo, lado="VENTA", cantidad=cantidad, precio=precio,
            notional=ingreso, comision=comision, identificador="paper", simulada=True,
        )

    def equity(self, simbolos) -> float:
        """Efectivo mas el valor de mercado de lo que se tiene."""
        total = float(self.cartera.get("efectivo", 0.0))
        for simbolo in simbolos:
            cantidad = self.saldo(moneda_base(simbolo))
            if cantidad > 0:
                total += cantidad * self.precio(simbolo)
        return total

    def moneda_de_saldo(self, simbolo: str) -> str:
        return moneda_cotizada(simbolo)
