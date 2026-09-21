"""Construccion de estrategias a partir de la configuracion."""

from __future__ import annotations

from typing import Any, List, Optional, Tuple

from .base import COMPRAR, ESPERAR, VENDER, Contexto, Estrategia, Senal, accion_desde_puntaje
from .clasica import EstrategiaClasica
from .ensemble import EstrategiaEnsemble
from .llm import EstrategiaLLM
from .reglas import EstrategiaReglas

__all__ = [
    "COMPRAR",
    "VENDER",
    "ESPERAR",
    "Contexto",
    "Estrategia",
    "Senal",
    "EstrategiaClasica",
    "EstrategiaEnsemble",
    "EstrategiaLLM",
    "EstrategiaReglas",
    "accion_desde_puntaje",
    "construir_estrategia",
]


def construir_estrategia(cfg, usar_llm: bool = True, cliente_llm: Optional[Any] = None) -> Estrategia:
    """Arma la estrategia descrita en la configuracion.

    ``usar_llm=False`` desactiva el asesor aunque este habilitado en el YAML:
    lo usa el backtest, donde una llamada a la API por vela costaria una
    fortuna y ademas no seria reproducible.
    """
    tipo = cfg.get("estrategia.tipo", "ensemble")
    compra = float(cfg.get("estrategia.umbral_compra", 0.35))
    venta = float(cfg.get("estrategia.umbral_venta", -0.35))
    cfg_llm = cfg.seccion("estrategia.llm")
    llm_activo = bool(cfg_llm.get("habilitado", False)) and usar_llm

    if tipo == "clasica":
        return EstrategiaClasica(cfg.seccion("estrategia.clasica"), compra, venta)
    if tipo == "reglas":
        return EstrategiaReglas(cfg.seccion("estrategia.reglas"), compra, venta)
    if tipo == "llm":
        if not llm_activo:
            raise ValueError(
                "estrategia.tipo=llm pero el asesor esta deshabilitado "
                "(pon estrategia.llm.habilitado: true)"
            )
        return EstrategiaLLM(cfg_llm, cliente=cliente_llm)

    # ensemble
    pesos = cfg.seccion("estrategia.pesos")
    votantes: List[Tuple[Estrategia, float]] = []
    peso_clasica = float(pesos.get("clasica", 1.0))
    if peso_clasica > 0:
        votantes.append(
            (EstrategiaClasica(cfg.seccion("estrategia.clasica"), compra, venta), peso_clasica)
        )
    cfg_reglas = cfg.seccion("estrategia.reglas")
    peso_reglas = float(pesos.get("reglas", 1.0))
    if peso_reglas > 0 and (cfg_reglas.get("compra") or cfg_reglas.get("venta")):
        votantes.append((EstrategiaReglas(cfg_reglas, compra, venta), peso_reglas))

    filtro = None
    if llm_activo:
        asesor = EstrategiaLLM(cfg_llm, cliente=cliente_llm)
        if str(cfg_llm.get("papel", "filtro")).lower() == "voto":
            votantes.append((asesor, float(pesos.get("llm", 1.0))))
        else:
            filtro = asesor

    return EstrategiaEnsemble(
        votantes,
        compra,
        venta,
        filtro_llm=filtro,
        requiere_confirmacion_llm=bool(
            cfg.get("estrategia.requiere_confirmacion_llm", True)
        ),
    )
