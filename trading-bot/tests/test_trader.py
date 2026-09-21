"""Ciclo completo del bot, sin red: senal -> puerta -> riesgo -> ejecucion."""

import os
import shutil
import tempfile
import unittest

from bot.config import Config
from bot.exchange.paper import PaperExchange
from bot.state import Estado
from bot.strategies.base import COMPRAR, ESPERAR, VENDER
from bot.trader import Trader
from tests.utiles import EstrategiaGuion, construir_velas

CIERRES = [100.0] * 60


class PruebaTrader(unittest.TestCase):
    def setUp(self):
        self.carpeta = tempfile.mkdtemp()
        self.precio = 100.0
        self.velas = construir_velas(CIERRES)

    def tearDown(self):
        shutil.rmtree(self.carpeta, ignore_errors=True)

    def _trader(self, guion=None, **extra) -> Trader:
        datos = {
            "mercado": {"simbolos": ["TESTUSDT"], "intervalo": "1h", "velas": 60},
            "puerta": {"habilitada": False},
            "riesgo": {"capital_inicial": 1000.0, "max_posicion_pct": 20.0},
        }
        for clave, valor in extra.items():
            datos[clave] = {**datos.get(clave, {}), **valor}
        cfg = Config(datos)
        exchange = PaperExchange(cfg, cartera={}, proveedor_precio=lambda s: self.precio)
        trader = Trader(cfg, carpeta=self.carpeta, exchange=exchange, usar_llm=False)
        trader.estrategia = EstrategiaGuion(
            guion if guion is not None else {len(CIERRES) - 1: COMPRAR}, calentamiento=1
        )
        trader.descargar = lambda simbolo, cantidad=None: self.velas
        return trader

    # -- entradas ---------------------------------------------------------
    def test_compra_cuando_hay_senal(self):
        trader = self._trader()
        informe = trader.ciclo()[0]
        self.assertTrue(informe.ejecutado)
        posicion = trader.estado.posicion("TESTUSDT")
        self.assertIsNotNone(posicion)
        self.assertLess(trader.exchange.cartera["efectivo"], 1000.0)
        self.assertLess(posicion["stop"], posicion["precio"])
        self.assertGreater(posicion["objetivo"], posicion["precio"])

    def test_no_compra_si_la_senal_es_esperar(self):
        trader = self._trader(guion={})
        informe = trader.ciclo()[0]
        self.assertFalse(informe.ejecutado)
        self.assertIsNone(trader.estado.posicion("TESTUSDT"))

    def test_no_abre_dos_veces_el_mismo_simbolo(self):
        trader = self._trader()
        trader.ciclo()
        informe = trader.ciclo()[0]
        self.assertFalse(informe.ejecutado)
        self.assertIn("Posicion abierta", informe.mensaje)
        self.assertEqual(trader.estado.posiciones_abiertas, 1)

    # -- salidas ----------------------------------------------------------
    def test_vende_al_tocar_el_objetivo(self):
        trader = self._trader()
        trader.ciclo()
        self.precio = 200.0
        informe = trader.ciclo()[0]
        self.assertEqual(informe.accion, VENDER)
        self.assertIn("objetivo", informe.mensaje)
        self.assertIsNone(trader.estado.posicion("TESTUSDT"))
        self.assertGreater(trader.estado.datos["historial"][-1]["pnl"], 0)

    def test_vende_al_tocar_el_stop(self):
        trader = self._trader()
        trader.ciclo()
        self.precio = 50.0
        informe = trader.ciclo()[0]
        self.assertIn("stop", informe.mensaje)
        self.assertLess(trader.estado.datos["historial"][-1]["pnl"], 0)
        self.assertEqual(trader.gestor.estado.racha_perdidas, 1)

    def test_vende_por_senal_de_la_estrategia(self):
        trader = self._trader()
        trader.ciclo()
        trader.estrategia = EstrategiaGuion({len(CIERRES) - 1: VENDER}, calentamiento=1)
        informe = trader.ciclo()[0]
        self.assertIn("senal", informe.mensaje)
        self.assertIsNone(trader.estado.posicion("TESTUSDT"))

    # -- bloqueos ---------------------------------------------------------
    def test_una_puerta_rechazada_impide_comprar(self):
        trader = self._trader(puerta={"habilitada": True, "vigencia_horas": 24})
        trader.estado.guardar_puerta(
            "TESTUSDT",
            {"simbolo": "TESTUSDT", "aprobada": False, "fallos": ["factor de beneficio 0.4 < 1.2"],
             "metricas": {}, "evaluada_en": __import__("time").time()},
        )
        informe = trader.ciclo()[0]
        self.assertFalse(informe.ejecutado)
        self.assertTrue(any("RECHAZADA" in b for b in informe.bloqueos))

    def test_una_puerta_aprobada_deja_comprar(self):
        trader = self._trader(puerta={"habilitada": True, "vigencia_horas": 24})
        trader.estado.guardar_puerta(
            "TESTUSDT",
            {"simbolo": "TESTUSDT", "aprobada": True, "fallos": [], "metricas": {},
             "evaluada_en": __import__("time").time()},
        )
        self.assertTrue(trader.ciclo()[0].ejecutado)

    def test_el_freno_de_emergencia_impide_comprar(self):
        trader = self._trader()
        open(os.path.join(self.carpeta, "FRENO_DE_EMERGENCIA"), "w").close()
        informe = trader.ciclo()[0]
        self.assertFalse(informe.ejecutado)
        self.assertTrue(any("Freno de emergencia" in b for b in informe.bloqueos))

    def test_el_freno_no_impide_vender(self):
        trader = self._trader()
        trader.ciclo()
        open(os.path.join(self.carpeta, "FRENO_DE_EMERGENCIA"), "w").close()
        self.precio = 50.0
        informe = trader.ciclo()[0]
        self.assertEqual(informe.accion, VENDER)
        self.assertIsNone(trader.estado.posicion("TESTUSDT"))

    def test_un_error_en_un_simbolo_no_tumba_el_ciclo(self):
        trader = self._trader()

        def explota(simbolo, cantidad=None):
            raise RuntimeError("la red se cayo")

        trader.descargar = explota
        informe = trader.ciclo()[0]
        self.assertIn("Error en el ciclo", informe.mensaje)

    # -- persistencia y recomendacion -------------------------------------
    def test_el_estado_sobrevive_a_un_reinicio(self):
        trader = self._trader()
        trader.ciclo()
        otro = self._trader()
        self.assertIsNotNone(otro.estado.posicion("TESTUSDT"))

    def test_las_operaciones_quedan_en_el_csv(self):
        trader = self._trader()
        trader.ciclo()
        ruta = os.path.join(self.carpeta, "operaciones.csv")
        self.assertTrue(os.path.exists(ruta))
        with open(ruta, encoding="utf-8") as archivo:
            self.assertIn("COMPRA", archivo.read())

    def test_recomendar_no_ejecuta_nada(self):
        trader = self._trader()
        informe = trader.recomendar("TESTUSDT")
        self.assertEqual(informe.accion, COMPRAR)
        self.assertIsNotNone(informe.plan)
        self.assertIsNone(trader.estado.posicion("TESTUSDT"))
        self.assertEqual(trader.exchange.cartera["efectivo"], 1000.0)


if __name__ == "__main__":
    unittest.main()
