"""Asesor basado en Claude.

Le pasamos una foto numerica del mercado (indicadores ya calculados, no texto
de noticias) y pedimos una respuesta en JSON con esquema fijo. El modelo nunca
manda ordenes: su salida es un voto mas, o un veto, segun ``papel``.

Si la API falla, no hay clave, o falta el paquete ``anthropic``, la estrategia
devuelve ESPERAR con el motivo. Un bot que opera igual cuando su asesor esta
caido es un bot que no tiene asesor.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .base import COMPRAR, ESPERAR, VENDER, Contexto, Estrategia, Senal

ESQUEMA_RESPUESTA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "accion": {"type": "string", "enum": [COMPRAR, VENDER, ESPERAR]},
        "confianza": {"type": "number", "minimum": 0, "maximum": 1},
        "razonamiento": {"type": "string"},
        "riesgos": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["accion", "confianza", "razonamiento", "riesgos"],
    "additionalProperties": False,
}

SISTEMA = """Eres un analista tecnico prudente que asesora a un bot de trading de criptomonedas.

Recibes una foto numerica del mercado: indicadores ya calculados y las ultimas velas.
Tu trabajo es emitir una opinion, no una orden: el bot decide el tamano y el riesgo.

Reglas:
- Solo puedes usar los datos que recibes. No inventes noticias, ni precios, ni contexto macro.
- Ante duda, responde ESPERAR. No operar es una decision valida y suele ser la correcta.
- La confianza debe reflejar la evidencia real en los numeros, no el entusiasmo.
- El razonamiento va en espanol, en dos o tres frases concretas, citando los valores que usaste.
- En 'riesgos' pon lo que invalidaria tu lectura (por ejemplo: volumen flojo, rango estrecho,
  indicadores en desacuerdo)."""


class EstrategiaLLM(Estrategia):
    nombre = "llm"

    def __init__(self, cfg: Dict[str, Any], cliente: Optional[Any] = None) -> None:
        self.cfg = cfg or {}
        self.modelo = str(self.cfg.get("modelo", "claude-opus-5"))
        self.esfuerzo = str(self.cfg.get("esfuerzo", "medium"))
        self.max_tokens = int(self.cfg.get("max_tokens", 4000))
        self.velas_contexto = int(self.cfg.get("velas_contexto", 60))
        self.papel = str(self.cfg.get("papel", "filtro")).lower()
        self._cliente = cliente
        self._cache: Dict[Any, Senal] = {}

    def calentamiento(self) -> int:
        return 210

    # -- cliente ----------------------------------------------------------
    def cliente(self) -> Any:
        if self._cliente is not None:
            return self._cliente
        try:
            import anthropic  # importacion tardia: el bot funciona sin la IA
        except ImportError as error:  # pragma: no cover - depende del entorno
            raise RuntimeError(
                "Falta el paquete anthropic. Instalalo con: pip install anthropic"
            ) from error
        self._cliente = anthropic.Anthropic()
        return self._cliente

    # -- foto del mercado -------------------------------------------------
    def resumen_mercado(self, contexto: Contexto, i: int) -> Dict[str, Any]:
        velas = contexto.velas
        precio = contexto.precio(i)

        def cambio(barras: int) -> Optional[float]:
            j = i - barras
            if j < 0:
                return None
            anterior = contexto.precio(j)
            if anterior == 0:
                return None
            return round((precio - anterior) / anterior * 100.0, 2)

        def redondear(clave: str) -> Optional[float]:
            valor = contexto.valor(clave, i)
            return None if valor is None else round(valor, 6)

        atr = contexto.valor("atr:14", i)
        volumen = contexto.valor("volumen", i)
        volumen_medio = contexto.valor("vol_sma:20", i)

        desde = max(0, i - self.velas_contexto + 1)
        ultimas = [
            {
                "t": velas[j].fecha,
                "o": velas[j].apertura,
                "h": velas[j].maximo,
                "l": velas[j].minimo,
                "c": velas[j].cierre,
                "v": round(velas[j].volumen, 2),
            }
            for j in range(desde, i + 1)
        ]

        return {
            "simbolo": velas.simbolo,
            "intervalo": velas.intervalo,
            "precio": precio,
            "cambio_pct": {
                "1_vela": cambio(1),
                "5_velas": cambio(5),
                "20_velas": cambio(20),
            },
            "indicadores": {
                "ema20": redondear("ema:20"),
                "ema50": redondear("ema:50"),
                "ema200": redondear("ema:200"),
                "rsi14": redondear("rsi:14"),
                "macd_hist": redondear("macd_hist:12:26:9"),
                "bollinger_pct": redondear("bb_pct:20:2.0"),
                "atr14": None if atr is None else round(atr, 6),
                "atr_pct_precio": None if atr is None else round(atr / precio * 100, 2),
                "volumen": volumen,
                "volumen_medio_20": None if volumen_medio is None else round(volumen_medio, 2),
            },
            "ultimas_velas": ultimas,
        }

    # -- evaluacion -------------------------------------------------------
    def evaluar(self, contexto: Contexto, i: int) -> Senal:
        clave = (contexto.velas.simbolo, contexto.velas[i].tiempo)
        if clave in self._cache:
            return self._cache[clave]

        resumen = self.resumen_mercado(contexto, i)
        try:
            senal = self._preguntar(resumen)
        except Exception as error:  # noqa: BLE001 - cualquier fallo se trata igual: no operar
            senal = Senal(
                accion=ESPERAR,
                motivos=[f"El asesor IA no respondio: {error}"],
                detalles={"error": str(error)},
            )
        self._cache[clave] = senal
        return senal

    def _preguntar(self, resumen: Dict[str, Any]) -> Senal:
        cliente = self.cliente()
        respuesta = cliente.messages.create(
            model=self.modelo,
            max_tokens=self.max_tokens,
            system=SISTEMA,
            thinking={"type": "adaptive"},
            output_config={
                "effort": self.esfuerzo,
                "format": {"type": "json_schema", "schema": ESQUEMA_RESPUESTA},
            },
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Analiza estos datos de mercado y responde con tu opinion.\n\n"
                        + json.dumps(resumen, ensure_ascii=False)
                    ),
                }
            ],
        )

        if getattr(respuesta, "stop_reason", None) == "refusal":
            return Senal(
                accion=ESPERAR,
                motivos=["El modelo declino responder a esta peticion"],
                detalles={"stop_reason": "refusal"},
            )

        texto = next(
            (b.text for b in respuesta.content if getattr(b, "type", None) == "text"), None
        )
        if not texto:
            return Senal(accion=ESPERAR, motivos=["El asesor IA devolvio una respuesta vacia"])

        datos = json.loads(texto)
        accion = str(datos.get("accion", ESPERAR)).upper()
        if accion not in (COMPRAR, VENDER, ESPERAR):
            accion = ESPERAR
        confianza = float(datos.get("confianza", 0.0))
        signo = {COMPRAR: 1.0, VENDER: -1.0, ESPERAR: 0.0}[accion]

        motivos: List[str] = [f"IA: {datos.get('razonamiento', '').strip()}"]
        for riesgo in datos.get("riesgos", []) or []:
            motivos.append(f"IA (riesgo): {riesgo}")

        return Senal(
            accion=accion,
            puntaje=signo * confianza,
            confianza=confianza,
            motivos=motivos,
            detalles={"respuesta": datos, "modelo": self.modelo},
        )
