"""Descarga y manejo de velas (OHLCV).

La fuente por defecto es el endpoint publico de Binance: no pide cuenta ni
clave de API. Tambien se puede leer y escribir CSV para hacer backtests sin red
y para que los resultados sean reproducibles.
"""

from __future__ import annotations

import csv
import os
import time
from dataclasses import dataclass
from typing import List, Optional, Sequence

try:
    import requests
except ImportError:  # pragma: no cover - depende del entorno
    requests = None  # type: ignore[assignment]

URL_PUBLICA = "https://api.binance.com"
URL_TESTNET = "https://testnet.binance.vision"

# Binance limita a 1000 velas por peticion.
LIMITE_POR_PETICION = 1000

INTERVALOS_EN_MINUTOS = {
    "1m": 1, "3m": 3, "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "2h": 120, "4h": 240, "6h": 360, "8h": 480, "12h": 720,
    "1d": 1440, "3d": 4320, "1w": 10080,
}


class ErrorDeDatos(RuntimeError):
    """No se pudieron obtener velas utilizables."""


@dataclass(frozen=True)
class Vela:
    tiempo: int          # milisegundos de apertura (epoch UTC)
    apertura: float
    maximo: float
    minimo: float
    cierre: float
    volumen: float

    @property
    def fecha(self) -> str:
        return time.strftime("%Y-%m-%d %H:%M", time.gmtime(self.tiempo / 1000))


class Velas:
    """Coleccion de velas con acceso por columnas."""

    def __init__(self, simbolo: str, intervalo: str, velas: Sequence[Vela]) -> None:
        self.simbolo = simbolo
        self.intervalo = intervalo
        self.items: List[Vela] = list(velas)

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, i: int) -> Vela:
        return self.items[i]

    @property
    def cierres(self) -> List[float]:
        return [v.cierre for v in self.items]

    @property
    def maximos(self) -> List[float]:
        return [v.maximo for v in self.items]

    @property
    def minimos(self) -> List[float]:
        return [v.minimo for v in self.items]

    @property
    def volumenes(self) -> List[float]:
        return [v.volumen for v in self.items]

    def minutos_por_vela(self) -> int:
        return INTERVALOS_EN_MINUTOS.get(self.intervalo, 60)


def _sesion():
    if requests is None:
        raise ErrorDeDatos("Falta la libreria requests. Instalala: pip install requests")
    return requests


def descargar_velas(
    simbolo: str,
    intervalo: str = "1h",
    cantidad: int = 500,
    testnet: bool = False,
    tiempo_limite: int = 20,
) -> Velas:
    """Descarga las ultimas ``cantidad`` velas cerradas de Binance.

    La vela en curso se descarta: operar sobre una vela sin cerrar produce
    senales que cambian de opinion a mitad de camino.
    """
    if intervalo not in INTERVALOS_EN_MINUTOS:
        raise ErrorDeDatos(f"Intervalo no soportado: {intervalo}")
    red = _sesion()
    base = URL_TESTNET if testnet else URL_PUBLICA
    pendientes = int(cantidad) + 1  # +1 por la vela en curso que vamos a tirar
    recogidas: List[Vela] = []
    fin: Optional[int] = None

    while pendientes > 0:
        lote = min(LIMITE_POR_PETICION, pendientes)
        parametros = {"symbol": simbolo.upper(), "interval": intervalo, "limit": lote}
        if fin is not None:
            parametros["endTime"] = fin
        try:
            respuesta = red.get(
                f"{base}/api/v3/klines", params=parametros, timeout=tiempo_limite
            )
            respuesta.raise_for_status()
            crudo = respuesta.json()
        except Exception as error:  # noqa: BLE001 - cualquier fallo de red es el mismo problema
            raise ErrorDeDatos(f"No se pudieron bajar velas de {simbolo}: {error}") from error

        if not crudo:
            break
        bloque = [
            Vela(
                tiempo=int(fila[0]),
                apertura=float(fila[1]),
                maximo=float(fila[2]),
                minimo=float(fila[3]),
                cierre=float(fila[4]),
                volumen=float(fila[5]),
            )
            for fila in crudo
        ]
        recogidas = bloque + recogidas
        pendientes -= len(bloque)
        fin = bloque[0].tiempo - 1
        if len(bloque) < lote:
            break

    if not recogidas:
        raise ErrorDeDatos(f"Binance no devolvio velas para {simbolo} {intervalo}")

    # Quitamos la ultima si todavia no ha cerrado.
    minutos = INTERVALOS_EN_MINUTOS[intervalo]
    ahora_ms = int(time.time() * 1000)
    if recogidas and recogidas[-1].tiempo + minutos * 60_000 > ahora_ms:
        recogidas.pop()

    return Velas(simbolo.upper(), intervalo, recogidas[-int(cantidad):])


def precio_actual(simbolo: str, testnet: bool = False, tiempo_limite: int = 10) -> float:
    red = _sesion()
    base = URL_TESTNET if testnet else URL_PUBLICA
    try:
        respuesta = red.get(
            f"{base}/api/v3/ticker/price",
            params={"symbol": simbolo.upper()},
            timeout=tiempo_limite,
        )
        respuesta.raise_for_status()
        return float(respuesta.json()["price"])
    except Exception as error:  # noqa: BLE001
        raise ErrorDeDatos(f"No se pudo leer el precio de {simbolo}: {error}") from error


def guardar_csv(velas: Velas, ruta: str) -> None:
    carpeta = os.path.dirname(os.path.abspath(ruta))
    os.makedirs(carpeta, exist_ok=True)
    with open(ruta, "w", encoding="utf-8", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["tiempo", "apertura", "maximo", "minimo", "cierre", "volumen"])
        for v in velas.items:
            escritor.writerow([v.tiempo, v.apertura, v.maximo, v.minimo, v.cierre, v.volumen])


def cargar_csv(ruta: str, simbolo: str = "CSV", intervalo: str = "1h") -> Velas:
    with open(ruta, "r", encoding="utf-8") as archivo:
        lector = csv.DictReader(archivo)
        items = [
            Vela(
                tiempo=int(fila["tiempo"]),
                apertura=float(fila["apertura"]),
                maximo=float(fila["maximo"]),
                minimo=float(fila["minimo"]),
                cierre=float(fila["cierre"]),
                volumen=float(fila["volumen"]),
            )
            for fila in lector
        ]
    if not items:
        raise ErrorDeDatos(f"El CSV {ruta} no tiene velas")
    return Velas(simbolo, intervalo, items)
