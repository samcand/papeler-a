"""Estrategia de reglas escritas por el usuario en el YAML.

No se usa ``eval``: las condiciones se declaran y se interpretan. Eso evita que
un archivo de configuracion pueda ejecutar codigo arbitrario, y de paso da
mensajes de error claros cuando la regla esta mal escrita.

Dos formas equivalentes de escribir la misma condicion:

    - "rsi:14 < 30"
    - {izquierda: "rsi:14", op: "<", derecha: 30}
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from .base import Contexto, Estrategia, Senal, accion_desde_puntaje

OPERADORES_SIMPLES = {
    "<": lambda a, b: a < b,
    "<=": lambda a, b: a <= b,
    ">": lambda a, b: a > b,
    ">=": lambda a, b: a >= b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}
OPERADORES_CRUCE = {"cruza_arriba", "cruza_abajo"}


class ErrorDeRegla(ValueError):
    """La regla no se entiende; mejor fallar al arrancar que operar a ciegas."""


class Condicion:
    def __init__(self, izquierda: str, op: str, derecha: Any) -> None:
        self.izquierda = str(izquierda).strip().lower()
        self.op = str(op).strip().lower()
        if self.op not in OPERADORES_SIMPLES and self.op not in OPERADORES_CRUCE:
            raise ErrorDeRegla(f"Operador no soportado: {op!r}")
        self.derecha_numero: Optional[float] = None
        self.derecha_serie: Optional[str] = None
        try:
            self.derecha_numero = float(derecha)
        except (TypeError, ValueError):
            self.derecha_serie = str(derecha).strip().lower()
        if self.op in OPERADORES_CRUCE and self.derecha_serie is None:
            # Cruzar contra un numero fijo es legitimo (p. ej. RSI cruza 50),
            # asi que lo permitimos tratandolo como serie constante.
            pass

    def __str__(self) -> str:
        derecha = self.derecha_serie if self.derecha_serie is not None else self.derecha_numero
        return f"{self.izquierda} {self.op} {derecha}"

    def _lado_derecho(self, contexto: Contexto, i: int) -> Optional[float]:
        if self.derecha_serie is not None:
            return contexto.valor(self.derecha_serie, i)
        return self.derecha_numero

    def cumple(self, contexto: Contexto, i: int) -> Optional[bool]:
        """True/False, o None si faltan datos en esa vela."""
        if self.op in OPERADORES_CRUCE:
            return self._cumple_cruce(contexto, i)
        a = contexto.valor(self.izquierda, i)
        b = self._lado_derecho(contexto, i)
        if a is None or b is None:
            return None
        return OPERADORES_SIMPLES[self.op](a, b)

    def _cumple_cruce(self, contexto: Contexto, i: int) -> Optional[bool]:
        if i < 1:
            return None
        a1 = contexto.valor(self.izquierda, i)
        a0 = contexto.valor(self.izquierda, i - 1)
        b1 = self._lado_derecho(contexto, i)
        b0 = (
            self.derecha_numero
            if self.derecha_serie is None
            else contexto.valor(self.derecha_serie, i - 1)
        )
        if None in (a0, a1, b0, b1):
            return None
        if self.op == "cruza_arriba":
            return a0 <= b0 and a1 > b1
        return a0 >= b0 and a1 < b1


def parsear_condicion(entrada: Any) -> Condicion:
    if isinstance(entrada, str):
        partes = entrada.split()
        if len(partes) != 3:
            raise ErrorDeRegla(
                f"Regla mal escrita: {entrada!r}. Esperaba tres partes, p. ej. 'rsi:14 < 30'"
            )
        return Condicion(partes[0], partes[1], partes[2])
    if isinstance(entrada, dict):
        faltan = {"izquierda", "op", "derecha"} - set(entrada)
        if faltan:
            raise ErrorDeRegla(f"A la regla {entrada!r} le faltan claves: {sorted(faltan)}")
        return Condicion(entrada["izquierda"], entrada["op"], entrada["derecha"])
    raise ErrorDeRegla(f"Regla no reconocida: {entrada!r}")


class EstrategiaReglas(Estrategia):
    nombre = "reglas"

    def __init__(self, cfg: Dict[str, Any], umbral_compra: float, umbral_venta: float) -> None:
        self.umbral_compra = umbral_compra
        self.umbral_venta = umbral_venta
        self.modo = str(cfg.get("modo", "todas")).lower()
        if self.modo not in ("todas", "alguna"):
            raise ErrorDeRegla("estrategia.reglas.modo debe ser 'todas' o 'alguna'")
        self.compra = [parsear_condicion(r) for r in (cfg.get("compra") or [])]
        self.venta = [parsear_condicion(r) for r in (cfg.get("venta") or [])]
        self.calentamiento_minimo = int(cfg.get("calentamiento", 210))

    def calentamiento(self) -> int:
        return self.calentamiento_minimo

    def _evaluar_lado(
        self, condiciones: List[Condicion], contexto: Contexto, i: int
    ) -> Tuple[float, List[str]]:
        if not condiciones:
            return 0.0, []
        cumplidas = 0
        evaluables = 0
        motivos: List[str] = []
        for condicion in condiciones:
            resultado = condicion.cumple(contexto, i)
            if resultado is None:
                continue
            evaluables += 1
            if resultado:
                cumplidas += 1
                motivos.append(f"se cumple: {condicion}")
        if evaluables == 0:
            return 0.0, []
        if self.modo == "todas":
            completo = cumplidas == len(condiciones)
            return (1.0 if completo else 0.0), motivos
        return cumplidas / len(condiciones), motivos

    def evaluar(self, contexto: Contexto, i: int) -> Senal:
        puntaje_compra, motivos_compra = self._evaluar_lado(self.compra, contexto, i)
        puntaje_venta, motivos_venta = self._evaluar_lado(self.venta, contexto, i)
        puntaje = puntaje_compra - puntaje_venta
        motivos = [f"Compra: {m}" for m in motivos_compra]
        motivos += [f"Venta: {m}" for m in motivos_venta]
        if not motivos:
            motivos = ["Ninguna regla del usuario se activo"]
        return Senal(
            accion=accion_desde_puntaje(puntaje, self.umbral_compra, self.umbral_venta),
            puntaje=puntaje,
            confianza=abs(puntaje),
            motivos=motivos,
            detalles={"compra": puntaje_compra, "venta": puntaje_venta},
        )
