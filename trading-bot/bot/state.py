"""Estado persistente del bot: posiciones, puertas y registro de operaciones.

Se guarda en JSON plano dentro de la carpeta de trabajo. Si el proceso muere,
al arrancar de nuevo el bot sabe que tenia abierto y por que.
"""

from __future__ import annotations

import csv
import json
import os
from typing import Any, Dict, List, Optional


class Estado:
    def __init__(self, ruta: str) -> None:
        self.ruta = ruta
        self.datos: Dict[str, Any] = {
            "posiciones": {},
            "puertas": {},
            "riesgo": {},
            "efectivo": None,
            "historial": [],
        }
        self.cargar()

    def cargar(self) -> None:
        if not os.path.exists(self.ruta):
            return
        try:
            with open(self.ruta, "r", encoding="utf-8") as archivo:
                guardado = json.load(archivo)
            if isinstance(guardado, dict):
                self.datos.update(guardado)
        except (json.JSONDecodeError, OSError) as error:
            # Un estado corrupto no debe impedir arrancar, pero si avisar.
            print(f"[aviso] No se pudo leer {self.ruta}: {error}. Se empieza de cero.")

    def guardar(self) -> None:
        carpeta = os.path.dirname(os.path.abspath(self.ruta))
        os.makedirs(carpeta, exist_ok=True)
        temporal = f"{self.ruta}.tmp"
        with open(temporal, "w", encoding="utf-8") as archivo:
            json.dump(self.datos, archivo, indent=2, ensure_ascii=False)
        os.replace(temporal, self.ruta)  # escritura atomica

    # -- posiciones -------------------------------------------------------
    def posicion(self, simbolo: str) -> Optional[Dict[str, Any]]:
        return self.datos.get("posiciones", {}).get(simbolo)

    def guardar_posicion(self, simbolo: str, posicion: Dict[str, Any]) -> None:
        self.datos.setdefault("posiciones", {})[simbolo] = posicion
        self.guardar()

    def borrar_posicion(self, simbolo: str) -> None:
        self.datos.setdefault("posiciones", {}).pop(simbolo, None)
        self.guardar()

    @property
    def posiciones_abiertas(self) -> int:
        return len(self.datos.get("posiciones", {}))

    # -- puertas ----------------------------------------------------------
    def puerta(self, simbolo: str) -> Optional[Dict[str, Any]]:
        return self.datos.get("puertas", {}).get(simbolo)

    def guardar_puerta(self, simbolo: str, datos: Dict[str, Any]) -> None:
        self.datos.setdefault("puertas", {})[simbolo] = datos
        self.guardar()

    # -- historial --------------------------------------------------------
    def anotar(self, entrada: Dict[str, Any], registro_csv: Optional[str] = None) -> None:
        historial: List[Dict[str, Any]] = self.datos.setdefault("historial", [])
        historial.append(entrada)
        del historial[:-500]  # no dejamos crecer el JSON sin limite
        self.guardar()
        if registro_csv:
            self._anotar_csv(registro_csv, entrada)

    @staticmethod
    def _anotar_csv(ruta: str, entrada: Dict[str, Any]) -> None:
        existe = os.path.exists(ruta)
        carpeta = os.path.dirname(os.path.abspath(ruta))
        os.makedirs(carpeta, exist_ok=True)
        with open(ruta, "a", encoding="utf-8", newline="") as archivo:
            escritor = csv.DictWriter(archivo, fieldnames=sorted(entrada.keys()))
            if not existe:
                escritor.writeheader()
            escritor.writerow(entrada)
