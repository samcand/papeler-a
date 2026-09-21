"""Seleccion del ejecutor segun el modo de la configuracion."""

from __future__ import annotations

from typing import Any, Dict, Optional

from .base import ErrorDeExchange, Exchange, Orden, moneda_base, moneda_cotizada
from .binance import BinanceExchange
from .paper import PaperExchange

__all__ = [
    "ErrorDeExchange",
    "Exchange",
    "Orden",
    "PaperExchange",
    "BinanceExchange",
    "construir_exchange",
    "moneda_base",
    "moneda_cotizada",
]


def construir_exchange(cfg, cartera: Optional[Dict[str, Any]] = None) -> Exchange:
    """``modo: paper`` -> simulado. ``modo: live`` -> ordenes reales."""
    if cfg.es_live:
        nombre = str(cfg.get("exchange.nombre", "binance")).lower()
        if nombre != "binance":
            raise ErrorDeExchange(f"Exchange no soportado todavia: {nombre}")
        return BinanceExchange(cfg)
    return PaperExchange(cfg, cartera=cartera)
