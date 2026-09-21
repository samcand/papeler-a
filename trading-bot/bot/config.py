"""Carga y validacion de la configuracion del bot.

La configuracion vive en un YAML. Aqui se define el diccionario de valores por
defecto, se fusiona con lo que trae el archivo del usuario y se validan los
campos que, mal puestos, costarian dinero.
"""

from __future__ import annotations

import copy
import os
from typing import Any, Dict, Optional

try:  # PyYAML es la unica forma comoda de leer el archivo; si falta, avisamos.
    import yaml
except ImportError:  # pragma: no cover - depende del entorno
    yaml = None  # type: ignore[assignment]


DEFECTOS: Dict[str, Any] = {
    # paper = simulado con dinero ficticio. live = ordenes reales.
    "modo": "paper",
    "exchange": {
        "nombre": "binance",
        # El testnet de Binance usa claves propias, distintas a las de produccion.
        "testnet": True,
        "recv_window_ms": 5000,
    },
    "mercado": {
        "simbolos": ["BTCUSDT"],
        "intervalo": "1h",
        "velas": 500,
    },
    "estrategia": {
        "tipo": "ensemble",  # clasica | reglas | llm | ensemble
        "umbral_compra": 0.35,
        "umbral_venta": -0.35,
        "pesos": {"clasica": 1.0, "reglas": 1.0, "llm": 1.0},
        # Si la IA esta activa y esto es True, ninguna compra sale sin su visto bueno.
        "requiere_confirmacion_llm": True,
        "clasica": {
            "ema_rapida": 20,
            "ema_lenta": 50,
            "ema_tendencia": 200,
            "rsi_periodo": 14,
            "rsi_sobreventa": 30,
            "rsi_sobrecompra": 70,
            "macd": {"rapida": 12, "lenta": 26, "senal": 9},
            "bollinger": {"periodo": 20, "multiplicador": 2.0},
            "volumen_periodo": 20,
            "pesos": {
                "tendencia": 0.30,
                "cruce": 0.20,
                "rsi": 0.20,
                "macd": 0.20,
                "bollinger": 0.10,
            },
            # El volumen no vota: confirma o penaliza al resto.
            "factor_volumen": 0.85,
        },
        "reglas": {"compra": [], "venta": []},
        "llm": {
            "habilitado": False,
            "modelo": "claude-opus-5",
            "esfuerzo": "medium",
            "papel": "filtro",  # filtro = solo veta | voto = suma al ensemble
            "max_tokens": 4000,
            "velas_contexto": 60,
        },
    },
    "riesgo": {
        "capital_inicial": 1000.0,
        "riesgo_por_operacion_pct": 1.0,
        "max_posicion_pct": 20.0,
        "max_posiciones": 3,
        "stop_atr": 2.0,
        "objetivo_atr": 3.0,
        "atr_periodo": 14,
        "perdida_diaria_max_pct": 5.0,
        "max_perdidas_consecutivas": 3,
        "min_notional": 10.0,
        "archivo_freno": "FRENO_DE_EMERGENCIA",
    },
    "costos": {
        "comision_pct": 0.1,
        "deslizamiento_pct": 0.05,
    },
    "backtest": {
        "velas": 1500,
    },
    # La "puerta": el bot no opera en real si el backtest reciente no pasa estos minimos.
    "puerta": {
        "habilitada": True,
        "min_operaciones": 20,
        "min_factor_beneficio": 1.2,
        "max_drawdown_pct": 25.0,
        "min_tasa_acierto_pct": 40.0,
        "vigencia_horas": 24,
    },
    "ejecucion": {
        "intervalo_segundos": 3600,
        "archivo_estado": "estado.json",
        "archivo_registro": "operaciones.csv",
    },
}

MODOS_VALIDOS = {"paper", "live"}
TIPOS_ESTRATEGIA = {"clasica", "reglas", "llm", "ensemble"}


class ErrorDeConfiguracion(ValueError):
    """La configuracion es invalida y seguir seria peligroso."""


def _fusionar(base: Dict[str, Any], encima: Dict[str, Any]) -> Dict[str, Any]:
    salida = copy.deepcopy(base)
    for clave, valor in (encima or {}).items():
        if isinstance(valor, dict) and isinstance(salida.get(clave), dict):
            salida[clave] = _fusionar(salida[clave], valor)
        else:
            salida[clave] = copy.deepcopy(valor)
    return salida


class Config:
    """Configuracion con acceso por ruta: ``cfg.get("riesgo.stop_atr")``."""

    def __init__(self, datos: Optional[Dict[str, Any]] = None) -> None:
        self.datos = _fusionar(DEFECTOS, datos or {})
        self.validar()

    @classmethod
    def desde_archivo(cls, ruta: str) -> "Config":
        if yaml is None:
            raise ErrorDeConfiguracion(
                "Falta PyYAML. Instalalo con: pip install pyyaml"
            )
        if not os.path.exists(ruta):
            raise ErrorDeConfiguracion(f"No existe el archivo de configuracion: {ruta}")
        with open(ruta, "r", encoding="utf-8") as archivo:
            datos = yaml.safe_load(archivo) or {}
        if not isinstance(datos, dict):
            raise ErrorDeConfiguracion("El YAML debe ser un diccionario en la raiz")
        return cls(datos)

    def get(self, ruta: str, defecto: Any = None) -> Any:
        actual: Any = self.datos
        for parte in ruta.split("."):
            if not isinstance(actual, dict) or parte not in actual:
                return defecto
            actual = actual[parte]
        return actual

    def seccion(self, ruta: str) -> Dict[str, Any]:
        valor = self.get(ruta, {})
        return valor if isinstance(valor, dict) else {}

    # -- validaciones -----------------------------------------------------
    def validar(self) -> None:
        modo = self.get("modo")
        if modo not in MODOS_VALIDOS:
            raise ErrorDeConfiguracion(
                f"modo invalido: {modo!r}. Usa uno de {sorted(MODOS_VALIDOS)}"
            )

        tipo = self.get("estrategia.tipo")
        if tipo not in TIPOS_ESTRATEGIA:
            raise ErrorDeConfiguracion(
                f"estrategia.tipo invalido: {tipo!r}. Usa uno de {sorted(TIPOS_ESTRATEGIA)}"
            )

        simbolos = self.get("mercado.simbolos")
        if not isinstance(simbolos, list) or not simbolos:
            raise ErrorDeConfiguracion("mercado.simbolos debe ser una lista no vacia")

        positivos = [
            "riesgo.capital_inicial",
            "riesgo.riesgo_por_operacion_pct",
            "riesgo.max_posicion_pct",
            "riesgo.stop_atr",
            "riesgo.objetivo_atr",
            "mercado.velas",
            "ejecucion.intervalo_segundos",
        ]
        for ruta in positivos:
            valor = self.get(ruta)
            if not isinstance(valor, (int, float)) or valor <= 0:
                raise ErrorDeConfiguracion(f"{ruta} debe ser un numero mayor que cero")

        riesgo_op = float(self.get("riesgo.riesgo_por_operacion_pct"))
        if riesgo_op > 5.0:
            raise ErrorDeConfiguracion(
                "riesgo.riesgo_por_operacion_pct > 5% es imprudente; bajalo a proposito "
                "editando este limite si de verdad lo quieres"
            )
        if float(self.get("riesgo.max_posicion_pct")) > 100.0:
            raise ErrorDeConfiguracion("riesgo.max_posicion_pct no puede pasar de 100")
        if float(self.get("riesgo.objetivo_atr")) <= 0:
            raise ErrorDeConfiguracion("riesgo.objetivo_atr debe ser mayor que cero")

        if self.get("estrategia.tipo") == "reglas":
            reglas = self.seccion("estrategia.reglas")
            if not reglas.get("compra") and not reglas.get("venta"):
                raise ErrorDeConfiguracion(
                    "estrategia.tipo=reglas pero no definiste reglas de compra ni de venta"
                )

    @property
    def es_live(self) -> bool:
        return self.get("modo") == "live"
