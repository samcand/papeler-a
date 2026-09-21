"""La configuracion es la ultima linea de defensa antes de mover dinero."""

import os
import unittest

import yaml

from bot.config import Config, ErrorDeConfiguracion

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class PruebaConfig(unittest.TestCase):
    def test_los_valores_por_defecto_son_validos_y_simulados(self):
        cfg = Config()
        self.assertEqual(cfg.get("modo"), "paper")
        self.assertFalse(cfg.es_live)
        self.assertTrue(cfg.get("exchange.testnet"))
        self.assertTrue(cfg.get("puerta.habilitada"))

    def test_el_config_de_ejemplo_carga_sin_errores(self):
        ruta = os.path.join(RAIZ, "config.example.yaml")
        with open(ruta, encoding="utf-8") as archivo:
            datos = yaml.safe_load(archivo)
        cfg = Config(datos)
        self.assertEqual(cfg.get("modo"), "paper")
        self.assertIn("BTCUSDT", cfg.get("mercado.simbolos"))

    def test_la_fusion_es_profunda(self):
        cfg = Config({"riesgo": {"stop_atr": 3.0}})
        self.assertEqual(cfg.get("riesgo.stop_atr"), 3.0)
        self.assertEqual(cfg.get("riesgo.objetivo_atr"), 3.0)  # sigue el valor por defecto

    def test_get_devuelve_el_defecto_si_no_existe(self):
        self.assertEqual(Config().get("no.existe", "vacio"), "vacio")

    def test_modo_invalido(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config({"modo": "casino"})

    def test_estrategia_invalida(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config({"estrategia": {"tipo": "adivinacion"}})

    def test_sin_simbolos(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config({"mercado": {"simbolos": []}})

    def test_riesgo_por_operacion_desorbitado(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config({"riesgo": {"riesgo_por_operacion_pct": 25.0}})

    def test_numeros_negativos(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config({"riesgo": {"stop_atr": -1.0}})

    def test_posicion_mayor_que_el_capital(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config({"riesgo": {"max_posicion_pct": 150.0}})

    def test_tipo_reglas_sin_reglas(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config({"estrategia": {"tipo": "reglas"}})

    def test_archivo_inexistente(self):
        with self.assertRaises(ErrorDeConfiguracion):
            Config.desde_archivo("/tmp/no-existe-jamas.yaml")


if __name__ == "__main__":
    unittest.main()
