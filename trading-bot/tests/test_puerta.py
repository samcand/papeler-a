"""La puerta: sin backtest reciente y solvente, no se opera."""

import time
import unittest

from bot.backtest import ResultadoBacktest
from bot.config import Config
from bot.gate import ResultadoPuerta, esta_vigente, evaluar_puerta

METRICAS_BUENAS = {
    "operaciones": 40,
    "factor_beneficio": 1.8,
    "max_drawdown_pct": 12.0,
    "tasa_acierto_pct": 55.0,
}


def resultado_con(**cambios) -> ResultadoBacktest:
    metricas = {**METRICAS_BUENAS, **cambios}
    return ResultadoBacktest(simbolo="BTCUSDT", intervalo="1h", metricas=metricas)


class PruebaPuerta(unittest.TestCase):
    def setUp(self):
        self.cfg = Config()

    def test_aprueba_un_backtest_solvente(self):
        puerta = evaluar_puerta(self.cfg, resultado_con())
        self.assertTrue(puerta.aprobada)
        self.assertEqual(puerta.fallos, [])

    def test_rechaza_por_pocas_operaciones(self):
        puerta = evaluar_puerta(self.cfg, resultado_con(operaciones=3))
        self.assertFalse(puerta.aprobada)
        self.assertIn("operaciones", puerta.fallos[0])

    def test_rechaza_por_factor_de_beneficio(self):
        puerta = evaluar_puerta(self.cfg, resultado_con(factor_beneficio=0.9))
        self.assertFalse(puerta.aprobada)

    def test_rechaza_por_drawdown(self):
        puerta = evaluar_puerta(self.cfg, resultado_con(max_drawdown_pct=60.0))
        self.assertFalse(puerta.aprobada)

    def test_rechaza_por_acierto_bajo(self):
        puerta = evaluar_puerta(self.cfg, resultado_con(tasa_acierto_pct=10.0))
        self.assertFalse(puerta.aprobada)

    def test_acumula_todos_los_fallos(self):
        puerta = evaluar_puerta(
            self.cfg, resultado_con(operaciones=2, factor_beneficio=0.5, max_drawdown_pct=80.0)
        )
        self.assertEqual(len(puerta.fallos), 3)

    def test_un_backtest_roto_no_aprueba(self):
        puerta = evaluar_puerta(self.cfg, resultado_con(error="faltan velas"))
        self.assertFalse(puerta.aprobada)

    def test_factor_infinito_es_valido(self):
        puerta = evaluar_puerta(self.cfg, resultado_con(factor_beneficio=float("inf")))
        self.assertTrue(puerta.aprobada)
        # En el JSON el infinito se guarda como texto, no revienta el volcado.
        self.assertEqual(puerta.como_dict()["metricas"]["factor_beneficio"], "infinito")

    def test_la_aprobacion_caduca(self):
        vieja = ResultadoPuerta(simbolo="BTCUSDT", aprobada=True, evaluada_en=time.time() - 48 * 3600)
        self.assertFalse(esta_vigente(vieja, 24))
        reciente = ResultadoPuerta(simbolo="BTCUSDT", aprobada=True)
        self.assertTrue(esta_vigente(reciente, 24))
        self.assertFalse(esta_vigente(None, 24))

    def test_va_y_vuelve_del_json(self):
        puerta = evaluar_puerta(self.cfg, resultado_con(operaciones=1))
        copia = ResultadoPuerta.desde_dict(puerta.como_dict())
        self.assertEqual(copia.aprobada, puerta.aprobada)
        self.assertEqual(copia.fallos, puerta.fallos)


if __name__ == "__main__":
    unittest.main()
