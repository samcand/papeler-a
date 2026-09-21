"""Estrategia clasica, asesor IA y ensemble (incluido el veto)."""

import json
import unittest

from bot.config import Config
from bot.strategies import construir_estrategia
from bot.strategies.base import COMPRAR, ESPERAR, VENDER, Contexto, Estrategia, Senal
from bot.strategies.clasica import EstrategiaClasica
from bot.strategies.ensemble import EstrategiaEnsemble
from bot.strategies.llm import EstrategiaLLM
from tests.utiles import ClienteFalso, EstrategiaGuion, construir_velas

CFG_CLASICA = Config({"estrategia": {"tipo": "clasica"}}).seccion("estrategia.clasica")


class OpinionFija(Estrategia):
    nombre = "llm"

    def __init__(self, accion, puntaje=0.8):
        self.accion = accion
        self.puntaje = puntaje if accion == COMPRAR else -puntaje if accion == VENDER else 0.0

    def calentamiento(self):
        return 1

    def evaluar(self, contexto, i):
        return Senal(accion=self.accion, puntaje=self.puntaje, confianza=abs(self.puntaje),
                     motivos=["opinion fija"])


class PruebaClasica(unittest.TestCase):
    def setUp(self):
        self.estrategia = EstrategiaClasica(CFG_CLASICA, 0.35, -0.35)

    def test_tendencia_alcista_puntua_positivo(self):
        velas = construir_velas([100.0 + i * 0.5 for i in range(300)])
        senal = self.estrategia.evaluar(Contexto(velas), 299)
        self.assertGreater(senal.puntaje, 0)

    def test_tendencia_bajista_puntua_negativo(self):
        velas = construir_velas([250.0 - i * 0.5 for i in range(300)])
        senal = self.estrategia.evaluar(Contexto(velas), 299)
        self.assertLess(senal.puntaje, 0)

    def test_mercado_plano_no_recomienda_nada(self):
        velas = construir_velas([100.0] * 300)
        senal = self.estrategia.evaluar(Contexto(velas), 299)
        self.assertEqual(senal.accion, ESPERAR)

    def test_sin_datos_suficientes_espera(self):
        velas = construir_velas([100.0] * 10)
        senal = self.estrategia.evaluar(Contexto(velas), 9)
        self.assertEqual(senal.accion, ESPERAR)
        self.assertIn("Sin datos", senal.motivos[0])

    def test_siempre_explica_sus_motivos(self):
        velas = construir_velas([100.0 + i * 0.5 for i in range(300)])
        senal = self.estrategia.evaluar(Contexto(velas), 299)
        self.assertTrue(senal.motivos)

    def test_el_macd_plano_no_vota(self):
        # Regresion: con el histograma en cero, el ruido de coma flotante se leia
        # como venta clara y hundia el puntaje de una tendencia alcista.
        velas = construir_velas([100.0 + i * 0.5 for i in range(300)])
        senal = self.estrategia.evaluar(Contexto(velas), 299)
        self.assertEqual(senal.detalles["votos"]["macd"], 0.0)

    def test_el_calentamiento_cubre_la_media_larga(self):
        self.assertGreaterEqual(self.estrategia.calentamiento(), 200)

    def test_el_puntaje_nunca_se_sale_del_rango(self):
        velas = construir_velas([100.0 * (1.02 ** i) for i in range(300)])
        senal = self.estrategia.evaluar(Contexto(velas), 299)
        self.assertGreaterEqual(senal.puntaje, -1.0)
        self.assertLessEqual(senal.puntaje, 1.0)


class PruebaAsesorIA(unittest.TestCase):
    def setUp(self):
        self.velas = construir_velas([100.0 + i * 0.3 for i in range(260)])
        self.contexto = Contexto(self.velas)

    def _asesor(self, respuesta=None, error=None):
        cliente = ClienteFalso(respuesta=respuesta, error=error)
        return EstrategiaLLM({"modelo": "claude-opus-5"}, cliente=cliente), cliente

    def test_traduce_la_respuesta_a_una_senal(self):
        cuerpo = json.dumps(
            {"accion": "COMPRAR", "confianza": 0.8, "razonamiento": "tendencia clara",
             "riesgos": ["volumen flojo"]}
        )
        asesor, _ = self._asesor(cuerpo)
        senal = asesor.evaluar(self.contexto, 259)
        self.assertEqual(senal.accion, COMPRAR)
        self.assertAlmostEqual(senal.puntaje, 0.8)
        self.assertTrue(any("volumen flojo" in m for m in senal.motivos))

    def test_un_fallo_de_la_api_no_tumba_el_bot(self):
        asesor, _ = self._asesor(error=RuntimeError("503 sin servicio"))
        senal = asesor.evaluar(self.contexto, 259)
        self.assertEqual(senal.accion, ESPERAR)
        self.assertIn("503", senal.motivos[0])

    def test_una_respuesta_sin_sentido_se_traduce_a_esperar(self):
        asesor, _ = self._asesor(json.dumps({"accion": "APOSTAR_TODO", "confianza": 1.0,
                                             "razonamiento": "", "riesgos": []}))
        self.assertEqual(asesor.evaluar(self.contexto, 259).accion, ESPERAR)

    def test_no_repite_la_llamada_para_la_misma_vela(self):
        asesor, cliente = self._asesor(json.dumps({"accion": "ESPERAR", "confianza": 0.1,
                                                   "razonamiento": "", "riesgos": []}))
        asesor.evaluar(self.contexto, 259)
        asesor.evaluar(self.contexto, 259)
        self.assertEqual(len(cliente.llamadas), 1)

    def test_usa_el_modelo_configurado_y_pide_json(self):
        asesor, cliente = self._asesor(json.dumps({"accion": "ESPERAR", "confianza": 0.0,
                                                   "razonamiento": "", "riesgos": []}))
        asesor.evaluar(self.contexto, 259)
        llamada = cliente.llamadas[0]
        self.assertEqual(llamada["model"], "claude-opus-5")
        self.assertEqual(llamada["output_config"]["format"]["type"], "json_schema")

    def test_el_resumen_lleva_los_indicadores(self):
        asesor, _ = self._asesor()
        resumen = asesor.resumen_mercado(self.contexto, 259)
        self.assertEqual(resumen["simbolo"], "TESTUSDT")
        self.assertIn("rsi14", resumen["indicadores"])
        self.assertTrue(resumen["ultimas_velas"])


class PruebaEnsemble(unittest.TestCase):
    def setUp(self):
        self.velas = construir_velas([100.0 + i * 0.3 for i in range(260)])
        self.contexto = Contexto(self.velas)
        self.guion_compra = EstrategiaGuion({259: COMPRAR}, calentamiento=1)
        self.guion_venta = EstrategiaGuion({259: VENDER}, calentamiento=1)

    def test_la_ia_veta_una_compra_cuando_ve_venta(self):
        ensemble = EstrategiaEnsemble(
            [(self.guion_compra, 1.0)], 0.35, -0.35, filtro_llm=OpinionFija(VENDER)
        )
        senal = ensemble.evaluar(self.contexto, 259)
        self.assertEqual(senal.accion, ESPERAR)
        self.assertTrue(any("Veto" in m for m in senal.motivos))

    def test_sin_confirmacion_de_la_ia_no_se_compra(self):
        ensemble = EstrategiaEnsemble(
            [(self.guion_compra, 1.0)], 0.35, -0.35,
            filtro_llm=OpinionFija(ESPERAR), requiere_confirmacion_llm=True,
        )
        self.assertEqual(ensemble.evaluar(self.contexto, 259).accion, ESPERAR)

    def test_con_confirmacion_desactivada_la_duda_no_bloquea(self):
        ensemble = EstrategiaEnsemble(
            [(self.guion_compra, 1.0)], 0.35, -0.35,
            filtro_llm=OpinionFija(ESPERAR), requiere_confirmacion_llm=False,
        )
        self.assertEqual(ensemble.evaluar(self.contexto, 259).accion, COMPRAR)

    def test_si_la_ia_confirma_se_compra(self):
        ensemble = EstrategiaEnsemble(
            [(self.guion_compra, 1.0)], 0.35, -0.35, filtro_llm=OpinionFija(COMPRAR)
        )
        self.assertEqual(ensemble.evaluar(self.contexto, 259).accion, COMPRAR)

    def test_las_ventas_no_se_vetan(self):
        ensemble = EstrategiaEnsemble(
            [(self.guion_venta, 1.0)], 0.35, -0.35, filtro_llm=OpinionFija(COMPRAR)
        )
        self.assertEqual(ensemble.evaluar(self.contexto, 259).accion, VENDER)

    def test_los_pesos_se_respetan(self):
        ensemble = EstrategiaEnsemble(
            [(self.guion_compra, 3.0), (self.guion_venta, 1.0)], 0.35, -0.35
        )
        senal = ensemble.evaluar(self.contexto, 259)
        self.assertAlmostEqual(senal.puntaje, 0.5)  # (3*1 + 1*-1) / 4


class PruebaFabrica(unittest.TestCase):
    def test_ensemble_por_defecto(self):
        estrategia = construir_estrategia(Config(), usar_llm=False)
        self.assertIsInstance(estrategia, EstrategiaEnsemble)

    def test_la_ia_se_puede_apagar_para_el_backtest(self):
        cfg = Config({"estrategia": {"llm": {"habilitado": True}}})
        ensemble = construir_estrategia(cfg, usar_llm=False)
        self.assertIsNone(ensemble.filtro_llm)

    def test_la_ia_como_voto_entra_en_el_ensemble(self):
        cfg = Config({"estrategia": {"llm": {"habilitado": True, "papel": "voto"}}})
        ensemble = construir_estrategia(cfg, usar_llm=True)
        self.assertIsNone(ensemble.filtro_llm)
        self.assertTrue(any(e.nombre == "llm" for e, _ in ensemble.votantes))

    def test_tipo_llm_sin_habilitar_es_un_error(self):
        cfg = Config({"estrategia": {"tipo": "llm"}})
        with self.assertRaises(ValueError):
            construir_estrategia(cfg)

    def test_las_reglas_del_usuario_entran_en_el_ensemble(self):
        cfg = Config({"estrategia": {"reglas": {"compra": ["rsi:14 < 30"]}}})
        ensemble = construir_estrategia(cfg, usar_llm=False)
        self.assertTrue(any(e.nombre == "reglas" for e, _ in ensemble.votantes))


if __name__ == "__main__":
    unittest.main()
