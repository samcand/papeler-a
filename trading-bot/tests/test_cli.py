"""La linea de comandos, de punta a punta y sin tocar la red."""

import json
import os
import shutil
import tempfile
import unittest

import yaml

from bot.cli import main
from bot.marketdata import guardar_csv
from tests.utiles import construir_velas

CONFIG = {
    "modo": "paper",
    "mercado": {"simbolos": ["TESTUSDT"], "intervalo": "1h", "velas": 300},
    "estrategia": {"tipo": "clasica"},
    "riesgo": {"capital_inicial": 1000.0},
    "backtest": {"velas": 300},
}


class PruebaCLI(unittest.TestCase):
    def setUp(self):
        self.carpeta = tempfile.mkdtemp()
        self.config = os.path.join(self.carpeta, "config.yaml")
        with open(self.config, "w", encoding="utf-8") as archivo:
            yaml.safe_dump(CONFIG, archivo)
        self.csv = os.path.join(self.carpeta, "velas.csv")
        # Serie con subidas y bajadas para que la estrategia tenga algo que decidir.
        cierres = [100.0 + (i % 40) * 0.8 - (i % 17) * 0.5 for i in range(400)]
        guardar_csv(construir_velas(cierres), self.csv)

    def tearDown(self):
        shutil.rmtree(self.carpeta, ignore_errors=True)

    def _ejecutar(self, *argumentos):
        return main(["--config", self.config, "--carpeta", self.carpeta, *argumentos])

    def test_backtest_desde_csv(self):
        salida = os.path.join(self.carpeta, "resultado.json")
        codigo = self._ejecutar("backtest", "--csv", self.csv, "--simbolo", "TESTUSDT",
                                "--json", salida)
        self.assertEqual(codigo, 0)
        with open(salida, encoding="utf-8") as archivo:
            datos = json.load(archivo)
        self.assertIn("metricas", datos)
        self.assertEqual(datos["simbolo"], "TESTUSDT")

    def test_freno_encendido_y_apagado(self):
        ruta = os.path.join(self.carpeta, "FRENO_DE_EMERGENCIA")
        self.assertEqual(self._ejecutar("freno", "on"), 0)
        self.assertTrue(os.path.exists(ruta))
        self.assertEqual(self._ejecutar("freno", "off"), 0)
        self.assertFalse(os.path.exists(ruta))

    def test_estado_sin_operaciones(self):
        self.assertEqual(self._ejecutar("estado"), 0)

    def test_una_configuracion_inexistente_falla_con_codigo_2(self):
        codigo = main(["--config", os.path.join(self.carpeta, "no-existe.yaml"), "estado"])
        self.assertEqual(codigo, 2)

    def test_una_configuracion_invalida_falla_con_codigo_2(self):
        ruta = os.path.join(self.carpeta, "malo.yaml")
        with open(ruta, "w", encoding="utf-8") as archivo:
            yaml.safe_dump({"modo": "apuesta_fuerte"}, archivo)
        self.assertEqual(main(["--config", ruta, "estado"]), 2)

    def test_modo_live_exige_confirmacion_explicita(self):
        ruta = os.path.join(self.carpeta, "live.yaml")
        with open(ruta, "w", encoding="utf-8") as archivo:
            yaml.safe_dump({**CONFIG, "modo": "live"}, archivo)
        # Sin la bandera no se manda ni una orden: devuelve 2 y no arranca el bucle.
        codigo = main(["--config", ruta, "--carpeta", self.carpeta, "ejecutar", "--ciclos", "1"])
        self.assertEqual(codigo, 2)

    def test_modo_live_sin_puerta_se_niega_a_operar(self):
        ruta = os.path.join(self.carpeta, "live_sin_puerta.yaml")
        with open(ruta, "w", encoding="utf-8") as archivo:
            yaml.safe_dump(
                {**CONFIG, "modo": "live", "puerta": {"habilitada": False}}, archivo
            )
        codigo = main([
            "--config", ruta, "--carpeta", self.carpeta,
            "ejecutar", "--ciclos", "1", "--confirmo-riesgo-real",
        ])
        self.assertEqual(codigo, 2)


if __name__ == "__main__":
    unittest.main()
