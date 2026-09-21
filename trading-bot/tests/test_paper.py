"""El ejecutor simulado tiene que cobrar comisiones como el de verdad."""

import unittest

from bot.config import Config
from bot.exchange.paper import PaperExchange


def exchange(precio=100.0, **cfg_extra):
    cfg = Config({"riesgo": {"capital_inicial": 1000.0}, **cfg_extra})
    return PaperExchange(cfg, cartera={}, proveedor_precio=lambda s: precio)


class PruebaPaperExchange(unittest.TestCase):
    def test_la_compra_descuenta_efectivo_y_comision(self):
        ex = exchange()
        orden = ex.comprar("BTCUSDT", 200.0)
        self.assertAlmostEqual(orden.comision, 0.2)          # 0.1% de 200
        self.assertAlmostEqual(orden.precio, 100.05)         # 0.05% de deslizamiento
        self.assertAlmostEqual(ex.cartera["efectivo"], 799.8)
        self.assertAlmostEqual(ex.saldo("BTC"), 200.0 / 100.05)

    def test_la_venta_devuelve_efectivo_menos_comision(self):
        ex = exchange()
        ex.comprar("BTCUSDT", 200.0)
        cantidad = ex.saldo("BTC")
        ex.vender("BTCUSDT", cantidad)
        self.assertAlmostEqual(ex.saldo("BTC"), 0.0)
        # Ida y vuelta al mismo precio siempre pierde: 0.2% de comisiones + 0.1% de horquilla.
        self.assertLess(ex.cartera["efectivo"], 1000.0)
        self.assertGreater(ex.cartera["efectivo"], 998.0)

    def test_no_se_puede_gastar_mas_de_lo_que_hay(self):
        ex = exchange()
        with self.assertRaises(ValueError):
            ex.comprar("BTCUSDT", 2000.0)

    def test_no_se_puede_vender_lo_que_no_se_tiene(self):
        ex = exchange()
        with self.assertRaises(ValueError):
            ex.vender("BTCUSDT", 1.0)

    def test_equity_suma_efectivo_y_posiciones(self):
        ex = exchange()
        ex.comprar("BTCUSDT", 200.0)
        # 1000 - 0.20 de comision - 0.10 que se va en la horquilla de entrada.
        self.assertAlmostEqual(ex.equity(["BTCUSDT"]), 999.70, places=2)

    def test_la_cartera_es_persistible(self):
        cartera = {}
        cfg = Config({"riesgo": {"capital_inicial": 500.0}})
        ex = PaperExchange(cfg, cartera=cartera, proveedor_precio=lambda s: 50.0)
        ex.comprar("ETHUSDT", 100.0)
        # El diccionario que se paso es el mismo que se guarda en estado.json.
        self.assertLess(cartera["efectivo"], 500.0)
        self.assertIn("ETH", cartera["activos"])


if __name__ == "__main__":
    unittest.main()
