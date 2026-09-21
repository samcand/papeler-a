"""Piezas comunes a todas las estrategias: la senal y el contexto de mercado."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .. import indicators as ind
from ..marketdata import Velas

COMPRAR = "COMPRAR"
VENDER = "VENDER"
ESPERAR = "ESPERAR"


@dataclass
class Senal:
    """Lo que una estrategia opina sobre una vela concreta.

    ``puntaje`` va de -1 (venta clara) a +1 (compra clara). ``motivos`` es lo
    que se le ensena al usuario: una recomendacion sin explicacion no sirve.
    """

    accion: str = ESPERAR
    puntaje: float = 0.0
    confianza: float = 0.0
    motivos: List[str] = field(default_factory=list)
    detalles: Dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.puntaje = max(-1.0, min(1.0, float(self.puntaje)))
        self.confianza = max(0.0, min(1.0, float(self.confianza)))

    def resumen(self) -> str:
        return f"{self.accion} (puntaje {self.puntaje:+.2f}, confianza {self.confianza:.0%})"


def accion_desde_puntaje(puntaje: float, umbral_compra: float, umbral_venta: float) -> str:
    if puntaje >= umbral_compra:
        return COMPRAR
    if puntaje <= umbral_venta:
        return VENDER
    return ESPERAR


class Contexto:
    """Velas + indicadores calculados bajo demanda y cacheados.

    Las estrategias piden series por nombre (``"ema:50"``, ``"rsi:14"``), asi
    que anadir un indicador a una regla del usuario no obliga a tocar codigo.
    """

    def __init__(self, velas: Velas) -> None:
        self.velas = velas
        self._cache: Dict[str, List[Optional[float]]] = {}

    def __len__(self) -> int:
        return len(self.velas)

    def precio(self, i: int) -> float:
        return self.velas[i].cierre

    def serie(self, clave: str) -> List[Optional[float]]:
        clave = clave.strip().lower()
        if clave in self._cache:
            return self._cache[clave]
        serie = self._calcular(clave)
        self._cache[clave] = serie
        return serie

    def valor(self, clave: str, i: int) -> Optional[float]:
        serie = self.serie(clave)
        if i < 0 or i >= len(serie):
            return None
        return serie[i]

    # -- interno ----------------------------------------------------------
    def _calcular(self, clave: str) -> List[Optional[float]]:
        partes = clave.split(":")
        nombre = partes[0]
        args = [int(float(p)) if float(p).is_integer() else float(p) for p in partes[1:]]

        cierres = self.velas.cierres
        if nombre in ("cierre", "close"):
            return list(cierres)
        if nombre in ("apertura", "open"):
            return [v.apertura for v in self.velas.items]
        if nombre in ("maximo", "high"):
            return list(self.velas.maximos)
        if nombre in ("minimo", "low"):
            return list(self.velas.minimos)
        if nombre in ("volumen", "volume"):
            return list(self.velas.volumenes)
        if nombre == "sma":
            return ind.sma(cierres, int(args[0]) if args else 20)
        if nombre == "ema":
            return ind.ema(cierres, int(args[0]) if args else 20)
        if nombre == "rsi":
            return ind.rsi(cierres, int(args[0]) if args else 14)
        if nombre == "atr":
            return ind.atr(
                self.velas.maximos, self.velas.minimos, cierres,
                int(args[0]) if args else 14,
            )
        if nombre in ("vol_sma", "volumen_sma"):
            return ind.sma(self.velas.volumenes, int(args[0]) if args else 20)
        if nombre in ("macd", "macd_senal", "macd_hist"):
            rapida = int(args[0]) if len(args) > 0 else 12
            lenta = int(args[1]) if len(args) > 1 else 26
            senal = int(args[2]) if len(args) > 2 else 9
            linea, linea_senal, histograma = ind.macd(cierres, rapida, lenta, senal)
            return {"macd": linea, "macd_senal": linea_senal, "macd_hist": histograma}[nombre]
        if nombre in ("bb_sup", "bb_med", "bb_inf", "bb_pct"):
            periodo = int(args[0]) if len(args) > 0 else 20
            mult = float(args[1]) if len(args) > 1 else 2.0
            sup, med, inf = ind.bollinger(cierres, periodo, mult)
            if nombre == "bb_sup":
                return sup
            if nombre == "bb_med":
                return med
            if nombre == "bb_inf":
                return inf
            # bb_pct: 0 = banda inferior, 1 = banda superior.
            salida: List[Optional[float]] = []
            for i in range(len(cierres)):
                if sup[i] is None or inf[i] is None or sup[i] == inf[i]:
                    salida.append(None)
                else:
                    salida.append((cierres[i] - inf[i]) / (sup[i] - inf[i]))
            return salida
        raise ValueError(f"Indicador desconocido en la configuracion: {clave!r}")


class Estrategia:
    """Interfaz comun. ``evaluar`` mira la vela ``i`` y opina."""

    nombre = "base"

    def evaluar(self, contexto: Contexto, i: int) -> Senal:  # pragma: no cover
        raise NotImplementedError

    def calentamiento(self) -> int:
        """Velas minimas antes de que la estrategia pueda opinar."""
        return 1
