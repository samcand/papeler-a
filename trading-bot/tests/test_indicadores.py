"""Los indicadores son el cimiento: si estos fallan, todo lo demas miente."""

import unittest

from bot import indicators as ind


class PruebaIndicadores(unittest.TestCase):
    def test_sma_valores_conocidos(self):
        valores = [1, 2, 3, 4, 5]
        self.assertEqual(ind.sma(valores, 3), [None, None, 2.0, 3.0, 4.0])

    def test_sma_longitud_igual_a_la_entrada(self):
        valores = list(range(50))
        self.assertEqual(len(ind.sma(valores, 10)), 50)

    def test_ema_se_siembra_con_la_sma(self):
        valores = [1.0] * 10
        serie = ind.ema(valores, 5)
        self.assertIsNone(serie[3])
        self.assertAlmostEqual(serie[4], 1.0)
        self.assertAlmostEqual(serie[9], 1.0)

    def test_ema_reacciona_mas_rapido_que_la_sma(self):
        valores = [10.0] * 20 + [20.0] * 5
        media_exp = ind.ema(valores, 10)[-1]
        media_simple = ind.sma(valores, 10)[-1]
        self.assertGreater(media_exp, media_simple)

    def test_rsi_en_subida_continua_es_100(self):
        valores = [float(i) for i in range(1, 40)]
        self.assertAlmostEqual(ind.rsi(valores, 14)[-1], 100.0)

    def test_rsi_en_bajada_continua_es_0(self):
        valores = [float(i) for i in range(40, 1, -1)]
        self.assertAlmostEqual(ind.rsi(valores, 14)[-1], 0.0)

    def test_rsi_siempre_entre_0_y_100(self):
        valores = [10, 12, 11, 15, 14, 18, 13, 19, 21, 17, 22, 20, 25, 23, 28, 26, 30]
        for valor in ind.rsi([float(v) for v in valores], 5):
            if valor is not None:
                self.assertGreaterEqual(valor, 0.0)
                self.assertLessEqual(valor, 100.0)

    def test_macd_de_una_recta_tiende_a_constante(self):
        valores = [float(i) for i in range(100)]
        linea, senal, histograma = ind.macd(valores)
        self.assertIsNotNone(linea[-1])
        self.assertAlmostEqual(histograma[-1], 0.0, places=6)

    def test_bollinger_encierra_al_precio(self):
        valores = [10, 11, 12, 11, 10, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 9, 10, 11, 12, 13, 14]
        superior, media, inferior = ind.bollinger([float(v) for v in valores], 20)
        self.assertIsNotNone(superior[-1])
        self.assertGreater(superior[-1], media[-1])
        self.assertLess(inferior[-1], media[-1])

    def test_atr_es_positivo_y_refleja_el_rango(self):
        maximos = [float(10 + i % 3) for i in range(40)]
        minimos = [float(8 + i % 3) for i in range(40)]
        cierres = [float(9 + i % 3) for i in range(40)]
        serie = ind.atr(maximos, minimos, cierres, 14)
        self.assertIsNotNone(serie[-1])
        self.assertGreater(serie[-1], 0)

    def test_cruces(self):
        rapida = [1.0, 2.0, 3.0]
        lenta = [2.0, 2.0, 2.0]
        self.assertTrue(ind.cruza_arriba(rapida, lenta, 2))
        self.assertFalse(ind.cruza_abajo(rapida, lenta, 2))
        self.assertFalse(ind.cruza_arriba([None, 2.0], [None, 1.0], 1))

    def test_periodo_invalido(self):
        with self.assertRaises(ValueError):
            ind.sma([1.0, 2.0], 0)


if __name__ == "__main__":
    unittest.main()
