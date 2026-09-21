"""Motor de backtest sobre velas historicas.

Decisiones que hacen que el resultado no mienta:

- Solo se opera al cierre de la vela, nunca dentro de una vela abierta.
- Comisiones y deslizamiento se cobran en cada entrada y en cada salida.
- Si una vela toca stop y objetivo a la vez, se asume que toco el stop primero.
  Es la lectura pesimista, y la unica honesta sin datos de tick.
- El dimensionamiento y los cortacircuitos son los mismos que usa el bot en
  vivo (``bot.risk``), no una version simplificada.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .marketdata import Velas
from .risk import EstadoRiesgo, GestorDeRiesgo
from .strategies.base import COMPRAR, VENDER, Contexto, Estrategia

MINUTOS_POR_ANIO = 525_600.0


@dataclass
class Operacion:
    simbolo: str
    entrada_tiempo: int
    entrada_precio: float
    salida_tiempo: int
    salida_precio: float
    cantidad: float
    motivo: str
    pnl: float
    pnl_pct: float
    comisiones: float

    def como_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Posicion:
    entrada_tiempo: int
    entrada_precio: float
    cantidad: float
    stop: float
    objetivo: float
    comision_entrada: float


@dataclass
class ResultadoBacktest:
    simbolo: str
    intervalo: str
    operaciones: List[Operacion] = field(default_factory=list)
    curva: List[Tuple[int, float]] = field(default_factory=list)
    metricas: Dict[str, Any] = field(default_factory=dict)
    desde: str = ""
    hasta: str = ""

    def como_dict(self) -> Dict[str, Any]:
        return {
            "simbolo": self.simbolo,
            "intervalo": self.intervalo,
            "desde": self.desde,
            "hasta": self.hasta,
            "metricas": self.metricas,
            "operaciones": [o.como_dict() for o in self.operaciones],
        }


class Backtest:
    def __init__(self, cfg, estrategia: Estrategia) -> None:
        self.cfg = cfg
        self.estrategia = estrategia
        self.capital_inicial = float(cfg.get("riesgo.capital_inicial", 1000.0))
        self.comision_pct = float(cfg.get("costos.comision_pct", 0.1))
        self.deslizamiento_pct = float(cfg.get("costos.deslizamiento_pct", 0.05))
        self.atr_periodo = int(cfg.get("riesgo.atr_periodo", 14))

    # -- costos -----------------------------------------------------------
    def _precio_compra(self, precio: float) -> float:
        return precio * (1.0 + self.deslizamiento_pct / 100.0)

    def _precio_venta(self, precio: float) -> float:
        return precio * (1.0 - self.deslizamiento_pct / 100.0)

    def _comision(self, notional: float) -> float:
        return abs(notional) * self.comision_pct / 100.0

    # -- ejecucion --------------------------------------------------------
    def ejecutar(self, velas: Velas) -> ResultadoBacktest:
        contexto = Contexto(velas)
        gestor = GestorDeRiesgo(self.cfg.seccion("riesgo"), EstadoRiesgo())
        # El freno de emergencia es cosa del bot en vivo; en backtest se ignora.
        gestor.archivo_freno = "\0no-existe"

        calentamiento = max(self.estrategia.calentamiento(), self.atr_periodo + 1)
        resultado = ResultadoBacktest(simbolo=velas.simbolo, intervalo=velas.intervalo)
        if len(velas) <= calentamiento + 1:
            resultado.metricas = {
                "error": (
                    f"Hacen falta mas de {calentamiento + 1} velas para esta estrategia "
                    f"y solo hay {len(velas)}"
                )
            }
            return resultado

        efectivo = self.capital_inicial
        posicion: Optional[Posicion] = None
        barras_en_mercado = 0

        for i in range(calentamiento, len(velas)):
            vela = velas[i]
            equity = efectivo + (posicion.cantidad * vela.cierre if posicion else 0.0)
            gestor.revisar_dia(equity, vela.tiempo)

            # 1. Salidas automaticas dentro de la vela.
            if posicion is not None:
                salida = None
                if vela.minimo <= posicion.stop:
                    salida = (self._precio_venta(posicion.stop), "stop")
                elif vela.maximo >= posicion.objetivo:
                    salida = (self._precio_venta(posicion.objetivo), "objetivo")
                if salida is not None:
                    efectivo += self._cerrar(
                        resultado, velas, posicion, vela.tiempo, salida[0], salida[1], gestor
                    )
                    posicion = None

            senal = self.estrategia.evaluar(contexto, i)

            # 2. Salida por senal de la estrategia.
            if posicion is not None and senal.accion == VENDER:
                efectivo += self._cerrar(
                    resultado, velas, posicion, vela.tiempo,
                    self._precio_venta(vela.cierre), "senal", gestor,
                )
                posicion = None

            # 3. Entrada.
            if posicion is None and senal.accion == COMPRAR:
                permitido, _ = gestor.puede_abrir(efectivo, 0, vela.tiempo)
                if permitido:
                    precio = self._precio_compra(vela.cierre)
                    atr = contexto.valor(f"atr:{self.atr_periodo}", i)
                    plan = gestor.plan_de_entrada(efectivo, precio, atr)
                    if plan is not None:
                        comision = self._comision(plan.notional)
                        if plan.notional + comision <= efectivo:
                            efectivo -= plan.notional + comision
                            posicion = Posicion(
                                entrada_tiempo=vela.tiempo,
                                entrada_precio=precio,
                                cantidad=plan.cantidad,
                                stop=plan.stop,
                                objetivo=plan.objetivo,
                                comision_entrada=comision,
                            )

            if posicion is not None:
                barras_en_mercado += 1
            equity = efectivo + (posicion.cantidad * vela.cierre if posicion else 0.0)
            resultado.curva.append((vela.tiempo, equity))

        # Cierre forzado al final del periodo: una posicion abierta no es un resultado.
        if posicion is not None:
            ultima = velas[len(velas) - 1]
            efectivo += self._cerrar(
                resultado, velas, posicion, ultima.tiempo,
                self._precio_venta(ultima.cierre), "fin del periodo", gestor,
            )
            if resultado.curva:
                resultado.curva[-1] = (ultima.tiempo, efectivo)

        resultado.desde = velas[calentamiento].fecha
        resultado.hasta = velas[len(velas) - 1].fecha
        resultado.metricas = calcular_metricas(
            resultado.operaciones,
            resultado.curva,
            self.capital_inicial,
            velas,
            calentamiento,
            barras_en_mercado,
        )
        return resultado

    def _cerrar(
        self,
        resultado: ResultadoBacktest,
        velas: Velas,
        posicion: Posicion,
        tiempo: int,
        precio: float,
        motivo: str,
        gestor: GestorDeRiesgo,
    ) -> float:
        ingreso = posicion.cantidad * precio
        comision = self._comision(ingreso)
        coste = posicion.cantidad * posicion.entrada_precio
        pnl = ingreso - comision - coste - posicion.comision_entrada
        resultado.operaciones.append(
            Operacion(
                simbolo=velas.simbolo,
                entrada_tiempo=posicion.entrada_tiempo,
                entrada_precio=posicion.entrada_precio,
                salida_tiempo=tiempo,
                salida_precio=precio,
                cantidad=posicion.cantidad,
                motivo=motivo,
                pnl=pnl,
                pnl_pct=(pnl / coste * 100.0) if coste else 0.0,
                comisiones=comision + posicion.comision_entrada,
            )
        )
        gestor.registrar_cierre(pnl, tiempo)
        return ingreso - comision


def calcular_metricas(
    operaciones: List[Operacion],
    curva: List[Tuple[int, float]],
    capital_inicial: float,
    velas: Velas,
    calentamiento: int,
    barras_en_mercado: int,
) -> Dict[str, Any]:
    if not curva:
        return {"error": "sin datos"}

    capital_final = curva[-1][1]
    ganancias = [o.pnl for o in operaciones if o.pnl > 0]
    perdidas = [o.pnl for o in operaciones if o.pnl <= 0]
    suma_perdidas = abs(sum(perdidas))

    pico = curva[0][1]
    max_dd = 0.0
    for _, valor in curva:
        pico = max(pico, valor)
        if pico > 0:
            max_dd = max(max_dd, (pico - valor) / pico * 100.0)

    precio_inicio = velas[calentamiento].cierre
    precio_fin = velas[len(velas) - 1].cierre
    comprar_y_mantener = (
        (precio_fin - precio_inicio) / precio_inicio * 100.0 if precio_inicio else 0.0
    )

    factor = (
        float("inf") if (ganancias and not suma_perdidas) else
        (sum(ganancias) / suma_perdidas if suma_perdidas else 0.0)
    )

    return {
        "capital_inicial": round(capital_inicial, 2),
        "capital_final": round(capital_final, 2),
        "retorno_total_pct": round((capital_final - capital_inicial) / capital_inicial * 100.0, 2),
        "comprar_y_mantener_pct": round(comprar_y_mantener, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "operaciones": len(operaciones),
        "ganadoras": len(ganancias),
        "perdedoras": len(perdidas),
        "tasa_acierto_pct": round(len(ganancias) / len(operaciones) * 100.0, 2) if operaciones else 0.0,
        "factor_beneficio": factor if factor == float("inf") else round(factor, 2),
        "ganancia_media": round(sum(ganancias) / len(ganancias), 2) if ganancias else 0.0,
        "perdida_media": round(sum(perdidas) / len(perdidas), 2) if perdidas else 0.0,
        "mejor_operacion": round(max((o.pnl for o in operaciones), default=0.0), 2),
        "peor_operacion": round(min((o.pnl for o in operaciones), default=0.0), 2),
        "comisiones_totales": round(sum(o.comisiones for o in operaciones), 2),
        "exposicion_pct": round(barras_en_mercado / max(1, len(curva)) * 100.0, 2),
        "sharpe": _sharpe(curva, velas.minutos_por_vela()),
        "velas_analizadas": len(curva),
    }


def _sharpe(curva: List[Tuple[int, float]], minutos_por_vela: int) -> float:
    """Sharpe anualizado sobre los retornos por vela, con tasa libre de riesgo 0."""
    if len(curva) < 3:
        return 0.0
    retornos = []
    for anterior, actual in zip(curva, curva[1:]):
        if anterior[1] <= 0:
            continue
        retornos.append((actual[1] - anterior[1]) / anterior[1])
    if len(retornos) < 2:
        return 0.0
    media = sum(retornos) / len(retornos)
    varianza = sum((r - media) ** 2 for r in retornos) / (len(retornos) - 1)
    desviacion = math.sqrt(varianza)
    if desviacion == 0:
        return 0.0
    barras_por_anio = MINUTOS_POR_ANIO / max(1, minutos_por_vela)
    return round(media / desviacion * math.sqrt(barras_por_anio), 2)
