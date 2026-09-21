"""Las reglas del usuario se interpretan, no se ejecutan: aqui se comprueba."""

import unittest

from bot.marketdata import Vela, Velas
from bot.strategies.base import COMPRAR, ESPERAR, VENDER, Contexto
from bot.strategies.reglas import ErrorDeRegla, EstrategiaReglas, parsear_condicion


def velas_de(cierres):
    items = [
        Vela(1_600_000_000_000 + i * 3_600_000, c, c * 1.01, c * 0.99, c, 1000.0)
        for i, c in enumerate(cierres)
    ]
    return Velas("TESTUSDT", "1h", items)


class PruebaParseo(unittest.TestCase):
    def test_formato_texto(self):
        condicion = parsear_condicion("rsi:14 < 30")
        self.assertEqual(condicion.izquierda, "rsi:14")
        self.assertEqual(condicion.derecha_numero, 30.0)

    def test_formato_diccionario(self):
        condicion = parsear_condicion(
            {"izquierda": "cierre", "op": "cruza_arriba", "derecha": "ema:10"}
        )
        self.assertEqual(condicion.derecha_serie, "ema:10")

    def test_operador_desconocido(self):
        with self.assertRaises(ErrorDeRegla):
            parsear_condicion("cierre ~ 10")

    def test_texto_incompleto(self):
        with self.assertRaises(ErrorDeRegla):
            parsear_condicion("cierre >")

    def test_tipo_no_soportado(self):
        with self.assertRaises(ErrorDeRegla):
            parsear_condicion(42)

    def test_no_se_ejecuta_codigo_arbitrario(self):
        # Una "regla" con codigo dentro debe fallar al parsear, no evaluarse.
        with self.assertRaises(ErrorDeRegla):
            parsear_condicion("__import__('os').system('ls')")


class PruebaEstrategiaReglas(unittest.TestCase):
    def test_todas_las_condiciones_deben_cumplirse(self):
        contexto = Contexto(velas_de([float(100 + i) for i in range(60)]))
        estrategia = EstrategiaReglas(
            {
                "modo": "todas",
                "compra": ["cierre > sma:5", "cierre > sma:20"],
                "calentamiento": 25,
            },
            0.35,
            -0.35,
        )
        senal = estrategia.evaluar(contexto, 59)
        self.assertEqual(senal.accion, COMPRAR)

    def test_una_condicion_falsa_anula_la_compra(self):
        contexto = Contexto(velas_de([float(100 + i) for i in range(60)]))
        estrategia = EstrategiaReglas(
            {"modo": "todas", "compra": ["cierre > sma:5", "cierre < sma:20"]}, 0.35, -0.35
        )
        self.assertEqual(estrategia.evaluar(contexto, 59).accion, ESPERAR)

    def test_modo_alguna_puntua_parcialmente(self):
        contexto = Contexto(velas_de([float(100 + i) for i in range(60)]))
        estrategia = EstrategiaReglas(
            {"modo": "alguna", "compra": ["cierre > sma:5", "cierre < sma:20"]}, 0.35, -0.35
        )
        senal = estrategia.evaluar(contexto, 59)
        self.assertAlmostEqual(senal.puntaje, 0.5)

    def test_reglas_de_venta_restan(self):
        contexto = Contexto(velas_de([float(200 - i) for i in range(60)]))
        estrategia = EstrategiaReglas(
            {"modo": "todas", "venta": ["cierre < sma:20"]}, 0.35, -0.35
        )
        self.assertEqual(estrategia.evaluar(contexto, 59).accion, VENDER)

    def test_sin_datos_no_opina(self):
        contexto = Contexto(velas_de([100.0, 101.0, 102.0]))
        estrategia = EstrategiaReglas({"compra": ["cierre > sma:20"]}, 0.35, -0.35)
        self.assertEqual(estrategia.evaluar(contexto, 2).accion, ESPERAR)

    def test_modo_invalido(self):
        with self.assertRaises(ErrorDeRegla):
            EstrategiaReglas({"modo": "cualquiera", "compra": ["cierre > 1"]}, 0.35, -0.35)


if __name__ == "__main__":
    unittest.main()
