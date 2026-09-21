"""Gestion de riesgo: cuanto comprar, donde salir y cuando parar del todo.

Este modulo lo usan por igual el backtest y la ejecucion real. Si el backtest
usara reglas de riesgo distintas a las del bot en vivo, sus resultados no
dirian nada sobre lo que va a pasar con dinero de verdad.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple


@dataclass
class PlanDeEntrada:
    cantidad: float
    precio: float
    stop: float
    objetivo: float
    riesgo_usd: float
    notional: float

    def resumen(self) -> str:
        return (
            f"{self.cantidad:.8f} @ {self.precio:.4f} "
            f"(stop {self.stop:.4f}, objetivo {self.objetivo:.4f}, "
            f"riesgo {self.riesgo_usd:.2f})"
        )


@dataclass
class EstadoRiesgo:
    racha_perdidas: int = 0
    dia: str = ""
    pnl_dia: float = 0.0
    equity_inicio_dia: float = 0.0
    pausado_hasta_dia_siguiente: bool = False

    def como_dict(self) -> Dict[str, Any]:
        return {
            "racha_perdidas": self.racha_perdidas,
            "dia": self.dia,
            "pnl_dia": self.pnl_dia,
            "equity_inicio_dia": self.equity_inicio_dia,
            "pausado_hasta_dia_siguiente": self.pausado_hasta_dia_siguiente,
        }

    @classmethod
    def desde_dict(cls, datos: Optional[Dict[str, Any]]) -> "EstadoRiesgo":
        datos = datos or {}
        return cls(
            racha_perdidas=int(datos.get("racha_perdidas", 0)),
            dia=str(datos.get("dia", "")),
            pnl_dia=float(datos.get("pnl_dia", 0.0)),
            equity_inicio_dia=float(datos.get("equity_inicio_dia", 0.0)),
            pausado_hasta_dia_siguiente=bool(datos.get("pausado_hasta_dia_siguiente", False)),
        )


def _dia_de(tiempo_ms: Optional[int]) -> str:
    segundos = (tiempo_ms / 1000.0) if tiempo_ms else time.time()
    return time.strftime("%Y-%m-%d", time.gmtime(segundos))


class GestorDeRiesgo:
    """Calcula tamanos de posicion y corta la operativa cuando toca."""

    def __init__(self, cfg: Dict[str, Any], estado: Optional[EstadoRiesgo] = None) -> None:
        self.riesgo_pct = float(cfg.get("riesgo_por_operacion_pct", 1.0))
        self.max_posicion_pct = float(cfg.get("max_posicion_pct", 20.0))
        self.max_posiciones = int(cfg.get("max_posiciones", 3))
        self.stop_atr = float(cfg.get("stop_atr", 2.0))
        self.objetivo_atr = float(cfg.get("objetivo_atr", 3.0))
        self.atr_periodo = int(cfg.get("atr_periodo", 14))
        self.perdida_diaria_max_pct = float(cfg.get("perdida_diaria_max_pct", 5.0))
        self.max_perdidas_consecutivas = int(cfg.get("max_perdidas_consecutivas", 3))
        self.min_notional = float(cfg.get("min_notional", 10.0))
        self.archivo_freno = str(cfg.get("archivo_freno", "FRENO_DE_EMERGENCIA"))
        self.estado = estado or EstadoRiesgo()

    # -- freno de emergencia ---------------------------------------------
    def freno_activo(self, carpeta: str = ".") -> bool:
        """Un archivo en disco detiene el bot sin tener que matar el proceso."""
        return os.path.exists(os.path.join(carpeta, self.archivo_freno))

    # -- ciclo diario -----------------------------------------------------
    def revisar_dia(self, equity: float, tiempo_ms: Optional[int] = None) -> None:
        dia = _dia_de(tiempo_ms)
        if dia != self.estado.dia:
            self.estado.dia = dia
            self.estado.pnl_dia = 0.0
            self.estado.equity_inicio_dia = equity
            self.estado.pausado_hasta_dia_siguiente = False

    def registrar_cierre(self, pnl: float, tiempo_ms: Optional[int] = None) -> None:
        self.estado.pnl_dia += pnl
        if pnl < 0:
            self.estado.racha_perdidas += 1
        else:
            self.estado.racha_perdidas = 0

        base = self.estado.equity_inicio_dia
        if base > 0 and self.perdida_diaria_max_pct > 0:
            limite = -abs(base * self.perdida_diaria_max_pct / 100.0)
            if self.estado.pnl_dia <= limite:
                self.estado.pausado_hasta_dia_siguiente = True

    # -- permisos ---------------------------------------------------------
    def puede_abrir(
        self,
        equity: float,
        posiciones_abiertas: int,
        tiempo_ms: Optional[int] = None,
        carpeta: str = ".",
    ) -> Tuple[bool, str]:
        if self.freno_activo(carpeta):
            return False, f"Freno de emergencia activo (existe el archivo {self.archivo_freno})"
        self.revisar_dia(equity, tiempo_ms)
        if self.estado.pausado_hasta_dia_siguiente:
            return False, (
                f"Limite de perdida diaria alcanzado ({self.estado.pnl_dia:.2f}); "
                "no se abren posiciones hasta manana"
            )
        if (
            self.max_perdidas_consecutivas > 0
            and self.estado.racha_perdidas >= self.max_perdidas_consecutivas
        ):
            return False, (
                f"{self.estado.racha_perdidas} perdidas seguidas: "
                "el bot se detiene y pide revision humana"
            )
        if posiciones_abiertas >= self.max_posiciones:
            return False, f"Ya hay {posiciones_abiertas} posiciones abiertas (maximo {self.max_posiciones})"
        if equity <= 0:
            return False, "No queda capital"
        return True, "ok"

    def reanudar(self) -> None:
        """Reinicia los cortacircuitos. Solo deberia llamarlo una persona."""
        self.estado.racha_perdidas = 0
        self.estado.pausado_hasta_dia_siguiente = False

    # -- dimensionamiento -------------------------------------------------
    def plan_de_entrada(
        self, equity: float, precio: float, atr: Optional[float]
    ) -> Optional[PlanDeEntrada]:
        """Tamano de la posicion a partir del riesgo, no del capital disponible.

        Se arriesga un porcentaje fijo del capital por operacion; la distancia
        al stop (en ATR) decide cuantas unidades son. Asi una moneda volatil
        entra con menos tamano que una tranquila, para el mismo riesgo.
        """
        if precio <= 0 or equity <= 0:
            return None
        if not atr or atr <= 0:
            return None

        distancia = self.stop_atr * atr
        if distancia <= 0:
            return None

        riesgo_usd = equity * self.riesgo_pct / 100.0
        cantidad = riesgo_usd / distancia

        tope_notional = equity * self.max_posicion_pct / 100.0
        if cantidad * precio > tope_notional:
            cantidad = tope_notional / precio
            riesgo_usd = cantidad * distancia

        notional = cantidad * precio
        if notional < self.min_notional or notional > equity:
            return None

        return PlanDeEntrada(
            cantidad=cantidad,
            precio=precio,
            stop=precio - distancia,
            objetivo=precio + self.objetivo_atr * atr,
            riesgo_usd=riesgo_usd,
            notional=notional,
        )
