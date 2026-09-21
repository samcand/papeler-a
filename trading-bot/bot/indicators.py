"""Indicadores tecnicos en Python puro, sin dependencias externas.

Todas las funciones reciben una lista de numeros y devuelven una lista de la
misma longitud, con ``None`` en las posiciones donde todavia no hay datos
suficientes (periodo de calentamiento). Eso permite alinear cualquier
indicador con las velas por indice, sin desfases silenciosos.
"""

from __future__ import annotations

from typing import List, Optional, Sequence, Tuple

Serie = List[Optional[float]]


def _validar_periodo(periodo: int) -> None:
    if periodo < 1:
        raise ValueError("el periodo debe ser >= 1")


def sma(valores: Sequence[float], periodo: int) -> Serie:
    """Media movil simple."""
    _validar_periodo(periodo)
    salida: Serie = [None] * len(valores)
    acumulado = 0.0
    for i, v in enumerate(valores):
        acumulado += v
        if i >= periodo:
            acumulado -= valores[i - periodo]
        if i >= periodo - 1:
            salida[i] = acumulado / periodo
    return salida


def ema(valores: Sequence[float], periodo: int) -> Serie:
    """Media movil exponencial, sembrada con la SMA del primer bloque."""
    _validar_periodo(periodo)
    salida: Serie = [None] * len(valores)
    if len(valores) < periodo:
        return salida
    k = 2.0 / (periodo + 1.0)
    previo = sum(valores[:periodo]) / periodo
    salida[periodo - 1] = previo
    for i in range(periodo, len(valores)):
        previo = valores[i] * k + previo * (1.0 - k)
        salida[i] = previo
    return salida


def _ema_disperso(valores: Serie, periodo: int) -> Serie:
    """EMA sobre una serie que arranca con ``None`` (p. ej. la linea MACD)."""
    salida: Serie = [None] * len(valores)
    indices = [i for i, v in enumerate(valores) if v is not None]
    if not indices:
        return salida
    compacto = [float(valores[i]) for i in indices]  # type: ignore[arg-type]
    calculado = ema(compacto, periodo)
    for posicion, indice in enumerate(indices):
        salida[indice] = calculado[posicion]
    return salida


def rsi(valores: Sequence[float], periodo: int = 14) -> Serie:
    """RSI con suavizado de Wilder (el clasico de Wilder, no el de media simple)."""
    _validar_periodo(periodo)
    salida: Serie = [None] * len(valores)
    if len(valores) <= periodo:
        return salida

    ganancias = 0.0
    perdidas = 0.0
    for i in range(1, periodo + 1):
        cambio = valores[i] - valores[i - 1]
        if cambio >= 0:
            ganancias += cambio
        else:
            perdidas -= cambio
    media_g = ganancias / periodo
    media_p = perdidas / periodo
    salida[periodo] = _rsi_desde_medias(media_g, media_p)

    for i in range(periodo + 1, len(valores)):
        cambio = valores[i] - valores[i - 1]
        subida = cambio if cambio > 0 else 0.0
        bajada = -cambio if cambio < 0 else 0.0
        media_g = (media_g * (periodo - 1) + subida) / periodo
        media_p = (media_p * (periodo - 1) + bajada) / periodo
        salida[i] = _rsi_desde_medias(media_g, media_p)
    return salida


def _rsi_desde_medias(media_g: float, media_p: float) -> float:
    if media_p == 0:
        return 100.0 if media_g > 0 else 50.0
    rs = media_g / media_p
    return 100.0 - (100.0 / (1.0 + rs))


def macd(
    valores: Sequence[float],
    rapida: int = 12,
    lenta: int = 26,
    senal: int = 9,
) -> Tuple[Serie, Serie, Serie]:
    """Devuelve (linea MACD, linea de senal, histograma)."""
    if rapida >= lenta:
        raise ValueError("la EMA rapida debe ser menor que la lenta")
    ema_rapida = ema(valores, rapida)
    ema_lenta = ema(valores, lenta)
    linea: Serie = [
        None if (a is None or b is None) else a - b
        for a, b in zip(ema_rapida, ema_lenta)
    ]
    linea_senal = _ema_disperso(linea, senal)
    histograma: Serie = [
        None if (a is None or b is None) else a - b
        for a, b in zip(linea, linea_senal)
    ]
    return linea, linea_senal, histograma


def desviacion(valores: Sequence[float]) -> float:
    """Desviacion estandar poblacional."""
    n = len(valores)
    if n == 0:
        return 0.0
    media = sum(valores) / n
    return (sum((v - media) ** 2 for v in valores) / n) ** 0.5


def bollinger(
    valores: Sequence[float],
    periodo: int = 20,
    multiplicador: float = 2.0,
) -> Tuple[Serie, Serie, Serie]:
    """Devuelve (banda superior, banda media, banda inferior)."""
    _validar_periodo(periodo)
    media = sma(valores, periodo)
    superior: Serie = [None] * len(valores)
    inferior: Serie = [None] * len(valores)
    for i in range(len(valores)):
        if media[i] is None:
            continue
        sigma = desviacion(valores[i - periodo + 1 : i + 1])
        superior[i] = media[i] + multiplicador * sigma
        inferior[i] = media[i] - multiplicador * sigma
    return superior, media, inferior


def rango_verdadero(
    maximos: Sequence[float],
    minimos: Sequence[float],
    cierres: Sequence[float],
) -> List[float]:
    tr: List[float] = []
    for i in range(len(cierres)):
        if i == 0:
            tr.append(maximos[i] - minimos[i])
            continue
        anterior = cierres[i - 1]
        tr.append(
            max(
                maximos[i] - minimos[i],
                abs(maximos[i] - anterior),
                abs(minimos[i] - anterior),
            )
        )
    return tr


def atr(
    maximos: Sequence[float],
    minimos: Sequence[float],
    cierres: Sequence[float],
    periodo: int = 14,
) -> Serie:
    """Average True Range con suavizado de Wilder."""
    _validar_periodo(periodo)
    salida: Serie = [None] * len(cierres)
    if len(cierres) < periodo:
        return salida
    tr = rango_verdadero(maximos, minimos, cierres)
    previo = sum(tr[:periodo]) / periodo
    salida[periodo - 1] = previo
    for i in range(periodo, len(tr)):
        previo = (previo * (periodo - 1) + tr[i]) / periodo
        salida[i] = previo
    return salida


def cruza_arriba(serie: Serie, referencia: Serie, i: int) -> bool:
    """True si ``serie`` cruzo de abajo hacia arriba a ``referencia`` en ``i``."""
    if i < 1:
        return False
    a0, a1 = serie[i - 1], serie[i]
    b0, b1 = referencia[i - 1], referencia[i]
    if None in (a0, a1, b0, b1):
        return False
    return a0 <= b0 and a1 > b1


def cruza_abajo(serie: Serie, referencia: Serie, i: int) -> bool:
    """True si ``serie`` cruzo de arriba hacia abajo a ``referencia`` en ``i``."""
    if i < 1:
        return False
    a0, a1 = serie[i - 1], serie[i]
    b0, b1 = referencia[i - 1], referencia[i]
    if None in (a0, a1, b0, b1):
        return False
    return a0 >= b0 and a1 < b1


def pendiente_pct(serie: Serie, i: int, ventana: int = 5) -> Optional[float]:
    """Variacion porcentual de una serie en las ultimas ``ventana`` barras."""
    j = i - ventana
    if j < 0 or i >= len(serie):
        return None
    actual, previo = serie[i], serie[j]
    if actual is None or previo is None or previo == 0:
        return None
    return (actual - previo) / abs(previo) * 100.0
