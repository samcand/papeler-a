"""El backtest decide si el bot puede operar, asi que tiene que ser exacto."""

import unittest

from bot.backtest import Backtest
from bot.config import Config
from bot.strategies.base import COMPRAR, ESPERAR, VENDER
from tests.utiles import EstrategiaGuion, construir_velas

# Rango fijo de 1 arriba y abajo -> ATR estable en 2.0
CONFIG = {
    "riesgo": {
        "capital_inicial": 1000.0,
        "riesgo_por_operacion_pct": 1.0,
        "max_posicion_pct": 20.0,
        "stop_atr": 2.0,
        "objetivo_atr": 3.0,
        "atr_periodo": 14,
        "min_notional": 10.0,
    },
    "costos": {"comision_pct": 0.1, "deslizamiento_pct": 0.05},
}


def config(**extra):
    datos = {**CONFIG}
    for clave, valor in extra.items():
        datos.setdefault(clave, {})
        datos[clave] = {**datos.get(clave, {}), **valor}
    return Config(datos)


class PruebaBacktest(unittest.TestCase):
    def test_toma_beneficios_en_el_objetivo(self):
        cierres = [100.0] * 40 + [100.0 + i for i in range(1, 16)]
        velas = construir_velas(cierres)
        resultado = Backtest(config(), EstrategiaGuion({30: COMPRAR})).ejecutar(velas)

        self.assertEqual(len(resultado.operaciones), 1)
        operacion = resultado.operaciones[0]
        self.assertEqual(operacion.motivo, "objetivo")
        self.assertGreater(operacion.pnl, 0)
        self.assertGreater(resultado.metricas["capital_final"], 1000.0)
        self.assertEqual(resultado.metricas["ganadoras"], 1)

    def test_corta_la_perdida_en_el_stop(self):
        cierres = [100.0] * 40 + [100.0 - i for i in range(1, 16)]
        velas = construir_velas(cierres)
        resultado = Backtest(config(), EstrategiaGuion({30: COMPRAR})).ejecutar(velas)

        self.assertEqual(len(resultado.operaciones), 1)
        operacion = resultado.operaciones[0]
        self.assertEqual(operacion.motivo, "stop")
        self.assertLess(operacion.pnl, 0)
        # El stop esta a 2 ATR = 4 USD sobre un precio de ~100: la perdida ronda el 4%.
        self.assertLess(abs(operacion.pnl_pct + 4.0), 1.5)

    def test_el_tamano_respeta_el_tope_de_posicion(self):
        velas = construir_velas([100.0] * 60)
        resultado = Backtest(config(), EstrategiaGuion({30: COMPRAR})).ejecutar(velas)
        operacion = resultado.operaciones[0]
        notional = operacion.cantidad * operacion.entrada_precio
        self.assertLessEqual(notional, 200.0 + 1e-6)  # 20% de 1000

    def test_entrar_y_salir_enseguida_solo_cuesta_dinero(self):
        velas = construir_velas([100.0] * 60)
        resultado = Backtest(config(), EstrategiaGuion({30: COMPRAR, 31: VENDER})).ejecutar(velas)
        operacion = resultado.operaciones[0]
        self.assertEqual(operacion.motivo, "senal")
        self.assertLess(operacion.pnl, 0)
        self.assertGreater(operacion.comisiones, 0)

    def test_la_posicion_abierta_se_cierra_al_final_del_periodo(self):
        velas = construir_velas([100.0] * 45 + [100.5] * 10)
        resultado = Backtest(config(), EstrategiaGuion({40: COMPRAR})).ejecutar(velas)
        self.assertEqual(len(resultado.operaciones), 1)
        self.assertEqual(resultado.operaciones[0].motivo, "fin del periodo")

    def test_sin_senales_no_hay_operaciones(self):
        velas = construir_velas([100.0] * 60)
        resultado = Backtest(config(), EstrategiaGuion({})).ejecutar(velas)
        self.assertEqual(resultado.operaciones, [])
        self.assertEqual(resultado.metricas["retorno_total_pct"], 0.0)

    def test_pocas_velas_devuelve_error_en_vez_de_resultados(self):
        velas = construir_velas([100.0] * 10)
        resultado = Backtest(config(), EstrategiaGuion({}, calentamiento=20)).ejecutar(velas)
        self.assertIn("error", resultado.metricas)
        self.assertEqual(resultado.operaciones, [])

    def test_es_determinista(self):
        velas = construir_velas([100.0 + (i % 7) for i in range(200)])
        guion = {30: COMPRAR, 80: COMPRAR, 120: VENDER}
        uno = Backtest(config(), EstrategiaGuion(guion)).ejecutar(velas)
        dos = Backtest(config(), EstrategiaGuion(guion)).ejecutar(velas)
        self.assertEqual(uno.metricas, dos.metricas)

    def test_no_se_compra_dos_veces_el_mismo_simbolo(self):
        velas = construir_velas([100.0] * 60)
        resultado = Backtest(config(), EstrategiaGuion({30: COMPRAR, 31: COMPRAR, 32: COMPRAR})).ejecutar(velas)
        self.assertEqual(len(resultado.operaciones), 1)

    def test_metricas_basicas_coherentes(self):
        cierres = [100.0] * 40 + [100.0 + i for i in range(1, 16)]
        velas = construir_velas(cierres)
        metricas = Backtest(config(), EstrategiaGuion({30: COMPRAR})).ejecutar(velas).metricas
        self.assertEqual(
            metricas["operaciones"], metricas["ganadoras"] + metricas["perdedoras"]
        )
        self.assertGreaterEqual(metricas["max_drawdown_pct"], 0.0)
        self.assertGreater(metricas["exposicion_pct"], 0.0)
        self.assertIn("comprar_y_mantener_pct", metricas)

    def test_la_perdida_diaria_maxima_frena_nuevas_entradas(self):
        # Un stop tras otro en el mismo dia debe acabar cerrando el grifo.
        cfg = config(riesgo={**CONFIG["riesgo"], "perdida_diaria_max_pct": 0.5,
                             "max_perdidas_consecutivas": 99})
        cierres = [100.0] * 40 + [96.0] * 5 + [100.0] * 20
        velas = construir_velas(cierres)
        guion = {i: COMPRAR for i in range(30, 60)}
        resultado = Backtest(cfg, EstrategiaGuion(guion)).ejecutar(velas)
        self.assertLessEqual(len(resultado.operaciones), 2)


if __name__ == "__main__":
    unittest.main()
