"""Combina varias estrategias en una sola senal.

El ensemble suma los puntajes ponderados de las estrategias de voto. La IA
puede entrar de dos formas, segun ``estrategia.llm.papel``:

- ``voto``: su puntaje se suma como el de cualquier otra.
- ``filtro`` (por defecto): no suma, pero puede vetar. Si el ensemble quiere
  comprar y la IA no lo acompana, la senal baja a ESPERAR.
"""

from __future__ import annotations

from typing import List, Optional, Tuple

from .base import COMPRAR, ESPERAR, VENDER, Contexto, Estrategia, Senal, accion_desde_puntaje


class EstrategiaEnsemble(Estrategia):
    nombre = "ensemble"

    def __init__(
        self,
        votantes: List[Tuple[Estrategia, float]],
        umbral_compra: float,
        umbral_venta: float,
        filtro_llm: Optional[Estrategia] = None,
        requiere_confirmacion_llm: bool = True,
    ) -> None:
        if not votantes and filtro_llm is None:
            raise ValueError("El ensemble necesita al menos una estrategia")
        self.votantes = votantes
        self.umbral_compra = umbral_compra
        self.umbral_venta = umbral_venta
        self.filtro_llm = filtro_llm
        self.requiere_confirmacion_llm = requiere_confirmacion_llm

    def calentamiento(self) -> int:
        calentamientos = [e.calentamiento() for e, _ in self.votantes]
        if self.filtro_llm is not None:
            calentamientos.append(self.filtro_llm.calentamiento())
        return max(calentamientos) if calentamientos else 1

    def evaluar(self, contexto: Contexto, i: int) -> Senal:
        motivos: List[str] = []
        detalles = {}
        total = 0.0
        total_peso = 0.0

        for estrategia, peso in self.votantes:
            senal = estrategia.evaluar(contexto, i)
            total += peso * senal.puntaje
            total_peso += peso
            detalles[estrategia.nombre] = senal.puntaje
            motivos += [f"[{estrategia.nombre}] {m}" for m in senal.motivos]

        puntaje = total / total_peso if total_peso else 0.0
        accion = accion_desde_puntaje(puntaje, self.umbral_compra, self.umbral_venta)

        if self.filtro_llm is not None:
            opinion = self.filtro_llm.evaluar(contexto, i)
            detalles["llm"] = opinion.puntaje
            motivos += [f"[llm] {m}" for m in opinion.motivos]
            accion, puntaje, veto = self._aplicar_filtro(accion, puntaje, opinion)
            if veto:
                motivos.append(f"[llm] Veto aplicado: {veto}")

        return Senal(
            accion=accion,
            puntaje=puntaje,
            confianza=abs(puntaje),
            motivos=motivos,
            detalles=detalles,
        )

    def _aplicar_filtro(
        self, accion: str, puntaje: float, opinion: Senal
    ) -> Tuple[str, float, Optional[str]]:
        """Devuelve (accion, puntaje, motivo del veto si lo hubo)."""
        if accion == COMPRAR:
            if opinion.accion == VENDER:
                return ESPERAR, min(puntaje, 0.0), "la IA ve venta donde los indicadores ven compra"
            if self.requiere_confirmacion_llm and opinion.accion != COMPRAR:
                return ESPERAR, puntaje * 0.5, "la IA no confirma la compra"
        elif accion == VENDER and opinion.accion == COMPRAR:
            # Para salir nunca pedimos permiso: proteger el capital manda.
            return VENDER, puntaje, "la IA discrepa, pero las salidas no se vetan"
        return accion, puntaje, None
