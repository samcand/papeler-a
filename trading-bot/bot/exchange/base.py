"""Interfaz comun de los ejecutores de ordenes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

COTIZADAS_CONOCIDAS = ("USDT", "FDUSD", "USDC", "BUSD", "TUSD", "EUR", "TRY", "BTC", "ETH", "BNB")


class ErrorDeExchange(RuntimeError):
    """Fallo al consultar o al mandar una orden."""


@dataclass
class Orden:
    simbolo: str
    lado: str            # COMPRA | VENTA
    cantidad: float
    precio: float        # precio medio de ejecucion
    notional: float
    comision: float
    identificador: str = ""
    simulada: bool = True

    def resumen(self) -> str:
        etiqueta = "SIMULADA" if self.simulada else "REAL"
        return (
            f"[{etiqueta}] {self.lado} {self.cantidad:.8f} {self.simbolo} "
            f"@ {self.precio:.4f} = {self.notional:.2f} (comision {self.comision:.4f})"
        )


def moneda_cotizada(simbolo: str) -> str:
    """De 'BTCUSDT' saca 'USDT': la moneda en la que se mide el saldo."""
    simbolo = simbolo.upper()
    for moneda in COTIZADAS_CONOCIDAS:
        if simbolo.endswith(moneda):
            return moneda
    return "USDT"


def moneda_base(simbolo: str) -> str:
    """De 'BTCUSDT' saca 'BTC': la moneda que se compra."""
    return simbolo.upper()[: -len(moneda_cotizada(simbolo))] or simbolo.upper()


class Exchange:
    nombre = "base"
    simulado = True

    def precio(self, simbolo: str) -> float:  # pragma: no cover
        raise NotImplementedError

    def saldo(self, moneda: str) -> float:  # pragma: no cover
        raise NotImplementedError

    def comprar(self, simbolo: str, notional: float) -> Orden:  # pragma: no cover
        raise NotImplementedError

    def vender(self, simbolo: str, cantidad: float) -> Orden:  # pragma: no cover
        raise NotImplementedError

    def normalizar_cantidad(self, simbolo: str, cantidad: float) -> float:
        return cantidad

    def minimo_notional(self, simbolo: str) -> Optional[float]:
        return None
