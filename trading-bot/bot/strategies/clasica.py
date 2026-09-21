"""Estrategia de indicadores tecnicos clasicos.

Cinco votos ponderados (tendencia, cruce de medias, RSI, MACD y Bollinger) que
se combinan en un puntaje de -1 a +1. El volumen no vota: confirma o rebaja la
conviccion del resto, porque un movimiento sin volumen suele deshacerse.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .. import indicators as ind
from .base import Contexto, Estrategia, Senal, accion_desde_puntaje


def _recortar(valor: float, minimo: float = -1.0, maximo: float = 1.0) -> float:
    return max(minimo, min(maximo, valor))


class EstrategiaClasica(Estrategia):
    nombre = "clasica"

    def __init__(self, cfg: Dict[str, Any], umbral_compra: float, umbral_venta: float) -> None:
        self.cfg = cfg
        self.umbral_compra = umbral_compra
        self.umbral_venta = umbral_venta
        self.ema_rapida = int(cfg.get("ema_rapida", 20))
        self.ema_lenta = int(cfg.get("ema_lenta", 50))
        self.ema_tendencia = int(cfg.get("ema_tendencia", 200))
        self.rsi_periodo = int(cfg.get("rsi_periodo", 14))
        self.rsi_sobreventa = float(cfg.get("rsi_sobreventa", 30))
        self.rsi_sobrecompra = float(cfg.get("rsi_sobrecompra", 70))
        macd_cfg = cfg.get("macd", {}) or {}
        self.macd_rapida = int(macd_cfg.get("rapida", 12))
        self.macd_lenta = int(macd_cfg.get("lenta", 26))
        self.macd_senal = int(macd_cfg.get("senal", 9))
        bb_cfg = cfg.get("bollinger", {}) or {}
        self.bb_periodo = int(bb_cfg.get("periodo", 20))
        self.bb_mult = float(bb_cfg.get("multiplicador", 2.0))
        self.volumen_periodo = int(cfg.get("volumen_periodo", 20))
        self.pesos = dict(cfg.get("pesos", {}) or {})
        self.factor_volumen = float(cfg.get("factor_volumen", 0.85))

    def calentamiento(self) -> int:
        return max(
            self.ema_tendencia,
            self.ema_lenta,
            self.macd_lenta + self.macd_senal,
            self.bb_periodo,
            self.rsi_periodo + 1,
            self.volumen_periodo,
        ) + 2

    def evaluar(self, contexto: Contexto, i: int) -> Senal:
        votos: Dict[str, float] = {}
        motivos: List[str] = []
        precio = contexto.precio(i)

        # 1. Tendencia de fondo: por encima de la EMA larga solo buscamos compras.
        tendencia = contexto.valor(f"ema:{self.ema_tendencia}", i)
        if tendencia is not None:
            distancia = (precio - tendencia) / tendencia * 100.0
            votos["tendencia"] = _recortar(distancia / 5.0)
            lado = "por encima" if distancia >= 0 else "por debajo"
            motivos.append(
                f"Precio {lado} de la EMA{self.ema_tendencia} ({distancia:+.1f}%)"
            )

        # 2. Cruce de medias: el evento pesa mas que el estado.
        serie_rapida = contexto.serie(f"ema:{self.ema_rapida}")
        serie_lenta = contexto.serie(f"ema:{self.ema_lenta}")
        cruce = 0.0
        for retraso in range(0, 3):
            j = i - retraso
            if ind.cruza_arriba(serie_rapida, serie_lenta, j):
                cruce = 1.0 - 0.2 * retraso
                motivos.append(
                    f"Cruce alcista EMA{self.ema_rapida}/EMA{self.ema_lenta} hace {retraso} velas"
                )
                break
            if ind.cruza_abajo(serie_rapida, serie_lenta, j):
                cruce = -1.0 + 0.2 * retraso
                motivos.append(
                    f"Cruce bajista EMA{self.ema_rapida}/EMA{self.ema_lenta} hace {retraso} velas"
                )
                break
        else:
            rapida, lenta = serie_rapida[i], serie_lenta[i]
            if rapida is not None and lenta is not None:
                cruce = 0.5 if rapida > lenta else -0.5
        if serie_rapida[i] is not None and serie_lenta[i] is not None:
            votos["cruce"] = cruce

        # 3. RSI: mapeo lineal centrado en 50.
        rsi = contexto.valor(f"rsi:{self.rsi_periodo}", i)
        if rsi is not None:
            ancho = max(1.0, 50.0 - self.rsi_sobreventa)
            votos["rsi"] = _recortar((50.0 - rsi) / ancho)
            if rsi <= self.rsi_sobreventa:
                motivos.append(f"RSI en sobreventa ({rsi:.0f})")
            elif rsi >= self.rsi_sobrecompra:
                motivos.append(f"RSI en sobrecompra ({rsi:.0f})")
            else:
                motivos.append(f"RSI neutro ({rsi:.0f})")

        # 4. MACD: signo del histograma, reforzado si esta creciendo.
        clave_macd = f"{self.macd_rapida}:{self.macd_lenta}:{self.macd_senal}"
        hist = contexto.serie(f"macd_hist:{clave_macd}")
        if hist[i] is not None:
            # Un histograma practicamente nulo no es una senal bajista: es ausencia
            # de senal. Sin esta tolerancia, el ruido de coma flotante en un mercado
            # sin sesgo se lee como venta clara.
            umbral = max(abs(precio) * 1e-6, 1e-12)
            if abs(hist[i]) <= umbral:
                votos["macd"] = 0.0
                motivos.append("MACD pegado a su senal: sin sesgo")
            else:
                voto = 0.5 if hist[i] > 0 else -0.5
                previo = hist[i - 1] if i > 0 else None
                if previo is not None and abs(hist[i] - previo) > umbral:
                    creciendo = hist[i] > previo
                    if (hist[i] > 0 and creciendo) or (hist[i] < 0 and not creciendo):
                        voto *= 2.0
                votos["macd"] = _recortar(voto)
                motivos.append(
                    "MACD " + ("por encima" if hist[i] > 0 else "por debajo") + " de su senal"
                )

        # 5. Bollinger: reversion a la media dentro de la banda.
        bb_pct = contexto.valor(f"bb_pct:{self.bb_periodo}:{self.bb_mult}", i)
        if bb_pct is not None:
            votos["bollinger"] = _recortar(-(bb_pct - 0.5) * 2.0)
            if bb_pct <= 0.05:
                motivos.append("Precio pegado a la banda inferior de Bollinger")
            elif bb_pct >= 0.95:
                motivos.append("Precio pegado a la banda superior de Bollinger")

        if not votos:
            return Senal(motivos=["Sin datos suficientes para opinar"])

        total_peso = 0.0
        total = 0.0
        for clave, voto in votos.items():
            peso = float(self.pesos.get(clave, 0.2))
            total += peso * voto
            total_peso += peso
        puntaje = total / total_peso if total_peso else 0.0

        # Confirmacion por volumen.
        volumen = contexto.valor("volumen", i)
        volumen_medio = contexto.valor(f"vol_sma:{self.volumen_periodo}", i)
        if volumen is not None and volumen_medio:
            if volumen < volumen_medio:
                puntaje *= self.factor_volumen
                motivos.append("Volumen por debajo de su media: conviccion recortada")
            else:
                motivos.append("Volumen por encima de su media: movimiento confirmado")

        accion = accion_desde_puntaje(puntaje, self.umbral_compra, self.umbral_venta)
        return Senal(
            accion=accion,
            puntaje=puntaje,
            confianza=abs(puntaje),
            motivos=motivos,
            detalles={"votos": votos, "precio": precio},
        )
