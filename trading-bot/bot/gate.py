"""La puerta: ningun simbolo opera en real sin un backtest reciente que pase.

Es la traduccion literal de "que se alimente del backtesting antes de operar".
Si la estrategia no demuestra en datos historicos un minimo de operaciones,
factor de beneficio, acierto y control de drawdown, el bot no abre posiciones
con ese simbolo. Las salidas nunca se bloquean: proteger lo que ya esta
abierto no depende de ninguna metrica.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .backtest import ResultadoBacktest


@dataclass
class ResultadoPuerta:
    simbolo: str
    aprobada: bool
    fallos: List[str] = field(default_factory=list)
    metricas: Dict[str, Any] = field(default_factory=dict)
    evaluada_en: float = field(default_factory=time.time)

    def como_dict(self) -> Dict[str, Any]:
        return {
            "simbolo": self.simbolo,
            "aprobada": self.aprobada,
            "fallos": self.fallos,
            "metricas": _sin_infinitos(self.metricas),
            "evaluada_en": self.evaluada_en,
        }

    @classmethod
    def desde_dict(cls, datos: Dict[str, Any]) -> "ResultadoPuerta":
        return cls(
            simbolo=datos.get("simbolo", ""),
            aprobada=bool(datos.get("aprobada", False)),
            fallos=list(datos.get("fallos", [])),
            metricas=dict(datos.get("metricas", {})),
            evaluada_en=float(datos.get("evaluada_en", 0.0)),
        )

    def resumen(self) -> str:
        if self.aprobada:
            return f"{self.simbolo}: puerta APROBADA"
        return f"{self.simbolo}: puerta RECHAZADA -> " + "; ".join(self.fallos)


def _sin_infinitos(metricas: Dict[str, Any]) -> Dict[str, Any]:
    """JSON no tiene infinito; lo guardamos como texto para no perder el dato."""
    salida = {}
    for clave, valor in metricas.items():
        if isinstance(valor, float) and valor == float("inf"):
            salida[clave] = "infinito"
        else:
            salida[clave] = valor
    return salida


def evaluar_puerta(cfg, resultado: ResultadoBacktest) -> ResultadoPuerta:
    reglas = cfg.seccion("puerta")
    metricas = resultado.metricas
    fallos: List[str] = []

    if "error" in metricas:
        return ResultadoPuerta(
            simbolo=resultado.simbolo,
            aprobada=False,
            fallos=[f"El backtest no se pudo completar: {metricas['error']}"],
            metricas=metricas,
        )

    minimo_ops = int(reglas.get("min_operaciones", 20))
    if metricas.get("operaciones", 0) < minimo_ops:
        fallos.append(
            f"solo {metricas.get('operaciones', 0)} operaciones, se exigen {minimo_ops} "
            "(muestra insuficiente para confiar en el resto de metricas)"
        )

    factor = metricas.get("factor_beneficio", 0.0)
    factor_num = float("inf") if factor in (float("inf"), "infinito") else float(factor)
    min_factor = float(reglas.get("min_factor_beneficio", 1.2))
    if factor_num < min_factor:
        fallos.append(f"factor de beneficio {factor_num:.2f} < {min_factor}")

    max_dd = float(reglas.get("max_drawdown_pct", 25.0))
    if float(metricas.get("max_drawdown_pct", 100.0)) > max_dd:
        fallos.append(f"drawdown {metricas.get('max_drawdown_pct')}% > {max_dd}%")

    min_acierto = float(reglas.get("min_tasa_acierto_pct", 40.0))
    if float(metricas.get("tasa_acierto_pct", 0.0)) < min_acierto:
        fallos.append(f"acierto {metricas.get('tasa_acierto_pct')}% < {min_acierto}%")

    return ResultadoPuerta(
        simbolo=resultado.simbolo,
        aprobada=not fallos,
        fallos=fallos,
        metricas=metricas,
    )


def esta_vigente(puerta: Optional[ResultadoPuerta], vigencia_horas: float) -> bool:
    """Una aprobacion caduca: el mercado de hace una semana ya no es este."""
    if puerta is None:
        return False
    if vigencia_horas <= 0:
        return True
    return (time.time() - puerta.evaluada_en) < vigencia_horas * 3600.0
