"""El gestor de riesgo es lo unico que separa una mala racha de la ruina."""

import os
import tempfile
import unittest

from bot.risk import EstadoRiesgo, GestorDeRiesgo

BASE = {
    "riesgo_por_operacion_pct": 1.0,
    "max_posicion_pct": 20.0,
    "max_posiciones": 2,
    "stop_atr": 2.0,
    "objetivo_atr": 3.0,
    "perdida_diaria_max_pct": 5.0,
    "max_perdidas_consecutivas": 3,
    "min_notional": 10.0,
}


class PruebaDimensionamiento(unittest.TestCase):
    def test_arriesga_el_porcentaje_configurado(self):
        gestor = GestorDeRiesgo(dict(BASE, max_posicion_pct=100.0))
        plan = gestor.plan_de_entrada(equity=1000.0, precio=100.0, atr=1.0)
        # 1% de 1000 = 10 USD de riesgo; el stop esta a 2 ATR = 2 USD por unidad.
        self.assertAlmostEqual(plan.cantidad, 5.0)
        self.assertAlmostEqual(plan.riesgo_usd, 10.0)
        self.assertAlmostEqual(plan.stop, 98.0)
        self.assertAlmostEqual(plan.objetivo, 103.0)

    def test_el_tope_de_posicion_recorta_el_tamano(self):
        gestor = GestorDeRiesgo(BASE)
        plan = gestor.plan_de_entrada(equity=1000.0, precio=100.0, atr=1.0)
        self.assertAlmostEqual(plan.notional, 200.0)  # 20% de 1000
        self.assertLess(plan.riesgo_usd, 10.0)

    def test_mas_volatilidad_implica_menos_tamano(self):
        gestor = GestorDeRiesgo(dict(BASE, max_posicion_pct=100.0))
        tranquila = gestor.plan_de_entrada(1000.0, 100.0, 1.0)
        volatil = gestor.plan_de_entrada(1000.0, 100.0, 5.0)
        self.assertLess(volatil.cantidad, tranquila.cantidad)
        self.assertAlmostEqual(volatil.riesgo_usd, tranquila.riesgo_usd)

    def test_sin_atr_no_hay_operacion(self):
        gestor = GestorDeRiesgo(BASE)
        self.assertIsNone(gestor.plan_de_entrada(1000.0, 100.0, None))
        self.assertIsNone(gestor.plan_de_entrada(1000.0, 100.0, 0.0))

    def test_por_debajo_del_minimo_no_hay_operacion(self):
        gestor = GestorDeRiesgo(dict(BASE, min_notional=500.0))
        self.assertIsNone(gestor.plan_de_entrada(1000.0, 100.0, 1.0))

    def test_capital_agotado(self):
        gestor = GestorDeRiesgo(BASE)
        self.assertIsNone(gestor.plan_de_entrada(0.0, 100.0, 1.0))


class PruebaCortacircuitos(unittest.TestCase):
    def test_limite_de_perdida_diaria(self):
        gestor = GestorDeRiesgo(BASE)
        gestor.puede_abrir(1000.0, 0)
        gestor.registrar_cierre(-51.0)
        permitido, motivo = gestor.puede_abrir(949.0, 0)
        self.assertFalse(permitido)
        self.assertIn("perdida diaria", motivo)

    def test_perdidas_pequenas_no_bloquean(self):
        gestor = GestorDeRiesgo(BASE)
        gestor.puede_abrir(1000.0, 0)
        gestor.registrar_cierre(-10.0)
        self.assertTrue(gestor.puede_abrir(990.0, 0)[0])

    def test_racha_de_perdidas(self):
        gestor = GestorDeRiesgo(dict(BASE, perdida_diaria_max_pct=100.0))
        gestor.puede_abrir(1000.0, 0)
        for _ in range(3):
            gestor.registrar_cierre(-1.0)
        permitido, motivo = gestor.puede_abrir(997.0, 0)
        self.assertFalse(permitido)
        self.assertIn("perdidas seguidas", motivo)

    def test_una_ganancia_reinicia_la_racha(self):
        gestor = GestorDeRiesgo(dict(BASE, perdida_diaria_max_pct=100.0))
        gestor.puede_abrir(1000.0, 0)
        gestor.registrar_cierre(-1.0)
        gestor.registrar_cierre(-1.0)
        gestor.registrar_cierre(5.0)
        self.assertEqual(gestor.estado.racha_perdidas, 0)
        self.assertTrue(gestor.puede_abrir(1003.0, 0)[0])

    def test_tope_de_posiciones_abiertas(self):
        gestor = GestorDeRiesgo(BASE)
        permitido, motivo = gestor.puede_abrir(1000.0, 2)
        self.assertFalse(permitido)
        self.assertIn("posiciones abiertas", motivo)

    def test_freno_de_emergencia(self):
        with tempfile.TemporaryDirectory() as carpeta:
            gestor = GestorDeRiesgo(dict(BASE, archivo_freno="PARA"))
            self.assertTrue(gestor.puede_abrir(1000.0, 0, None, carpeta)[0])
            open(os.path.join(carpeta, "PARA"), "w").close()
            permitido, motivo = gestor.puede_abrir(1000.0, 0, None, carpeta)
            self.assertFalse(permitido)
            self.assertIn("Freno de emergencia", motivo)

    def test_el_dia_nuevo_reinicia_el_contador(self):
        gestor = GestorDeRiesgo(BASE)
        ayer = 1_600_000_000_000
        hoy = ayer + 30 * 3_600_000
        gestor.puede_abrir(1000.0, 0, ayer)
        gestor.registrar_cierre(-100.0, ayer)
        self.assertFalse(gestor.puede_abrir(900.0, 0, ayer)[0])
        self.assertTrue(gestor.puede_abrir(900.0, 0, hoy)[0])

    def test_estado_va_y_viene_del_disco(self):
        gestor = GestorDeRiesgo(BASE)
        gestor.puede_abrir(1000.0, 0)
        gestor.registrar_cierre(-5.0)
        copia = EstadoRiesgo.desde_dict(gestor.estado.como_dict())
        self.assertEqual(copia.racha_perdidas, 1)
        self.assertAlmostEqual(copia.pnl_dia, -5.0)


if __name__ == "__main__":
    unittest.main()
