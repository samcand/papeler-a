"""Ayudas para construir escenarios de mercado deterministas en los tests."""

from typing import List, Optional, Sequence

from bot.marketdata import Vela, Velas
from bot.strategies.base import ESPERAR, Contexto, Estrategia, Senal

MS_POR_HORA = 3_600_000


def construir_velas(
    cierres: Sequence[float],
    rango: float = 1.0,
    simbolo: str = "TESTUSDT",
    intervalo: str = "1h",
    volumen: float = 1000.0,
) -> Velas:
    """Velas con un rango fijo arriba y abajo del cierre (ATR predecible)."""
    items: List[Vela] = []
    for i, cierre in enumerate(cierres):
        items.append(
            Vela(
                tiempo=1_600_000_000_000 + i * MS_POR_HORA,
                apertura=cierre,
                maximo=cierre + rango,
                minimo=cierre - rango,
                cierre=cierre,
                volumen=volumen,
            )
        )
    return Velas(simbolo, intervalo, items)


class EstrategiaGuion(Estrategia):
    """Estrategia de mentira: devuelve lo que le digan en cada indice."""

    nombre = "guion"

    def __init__(self, guion: dict, calentamiento: int = 20) -> None:
        self.guion = guion
        self._calentamiento = calentamiento

    def calentamiento(self) -> int:
        return self._calentamiento

    def evaluar(self, contexto: Contexto, i: int) -> Senal:
        accion = self.guion.get(i, ESPERAR)
        puntaje = {"COMPRAR": 1.0, "VENDER": -1.0, ESPERAR: 0.0}.get(accion, 0.0)
        return Senal(accion=accion, puntaje=puntaje, confianza=abs(puntaje), motivos=["guion"])


class RespuestaFalsa:
    """Imita la respuesta del SDK de Anthropic."""

    class _Bloque:
        def __init__(self, texto: str) -> None:
            self.type = "text"
            self.text = texto

    def __init__(self, texto: str, stop_reason: str = "end_turn") -> None:
        self.content = [self._Bloque(texto)]
        self.stop_reason = stop_reason


class ClienteFalso:
    """Cliente de Anthropic falso: no sale a la red, registra lo que le piden."""

    def __init__(self, respuesta: Optional[str] = None, error: Optional[Exception] = None) -> None:
        self.respuesta = respuesta
        self.error = error
        self.llamadas: List[dict] = []
        self.messages = self

    def create(self, **kwargs):
        self.llamadas.append(kwargs)
        if self.error is not None:
            raise self.error
        return RespuestaFalsa(self.respuesta or "{}")
