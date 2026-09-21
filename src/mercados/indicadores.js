/**
 * indicadores.js — Indicadores técnicos sobre series de velas.
 * Matemática pura, sin navegador: se prueba en Node igual que dsp.js.
 *
 * Una vela es { t, o, h, l, c, v }: t en milisegundos (apertura de la vela),
 * o/h/l/c precios y v volumen. Las series devueltas tienen SIEMPRE la misma
 * longitud que la entrada, con NaN donde el indicador todavía no existe;
 * así el dibujante puede recorrerlas por índice sin ajustar desfases.
 */

const vacio = (n) => new Array(n).fill(NaN);

/** Cierres de una serie de velas. */
export const cierres = (velas) => velas.map((k) => k.c);

/** Media móvil simple. */
export function sma(vals, periodo) {
  const out = vacio(vals.length);
  if (periodo < 1) return out;
  let suma = 0, cuenta = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (Number.isFinite(v)) { suma += v; cuenta++; }
    if (i >= periodo) {
      const viejo = vals[i - periodo];
      if (Number.isFinite(viejo)) { suma -= viejo; cuenta--; }
    }
    if (i >= periodo - 1 && cuenta === periodo) out[i] = suma / periodo;
  }
  return out;
}

/** Media móvil exponencial. Arranca con una SMA para no depender del primer dato. */
export function ema(vals, periodo) {
  const out = vacio(vals.length);
  if (periodo < 1 || vals.length < periodo) return out;
  const k = 2 / (periodo + 1);
  let suma = 0;
  for (let i = 0; i < periodo; i++) suma += vals[i];
  let prev = suma / periodo;
  out[periodo - 1] = prev;
  for (let i = periodo; i < vals.length; i++) {
    prev = vals[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Suavizado de Wilder (el que usan RSI, ATR y ADX). */
function wilder(vals, periodo) {
  const out = vacio(vals.length);
  if (vals.length < periodo) return out;
  let suma = 0;
  for (let i = 0; i < periodo; i++) suma += vals[i];
  let prev = suma / periodo;
  out[periodo - 1] = prev;
  for (let i = periodo; i < vals.length; i++) {
    prev = (prev * (periodo - 1) + vals[i]) / periodo;
    out[i] = prev;
  }
  return out;
}

/** RSI de Wilder. Devuelve 0..100. */
export function rsi(vals, periodo = 14) {
  const n = vals.length;
  const out = vacio(n);
  if (n <= periodo) return out;
  const subidas = new Array(n - 1), bajadas = new Array(n - 1);
  for (let i = 1; i < n; i++) {
    const d = vals[i] - vals[i - 1];
    subidas[i - 1] = d > 0 ? d : 0;
    bajadas[i - 1] = d < 0 ? -d : 0;
  }
  const mediaS = wilder(subidas, periodo);
  const mediaB = wilder(bajadas, periodo);
  for (let i = 0; i < n - 1; i++) {
    const s = mediaS[i], b = mediaB[i];
    if (!Number.isFinite(s) || !Number.isFinite(b)) continue;
    // Sin bajadas el RSI satura en 100; evita la división por cero.
    out[i + 1] = b === 0 ? 100 : 100 - 100 / (1 + s / b);
  }
  return out;
}

/** MACD: línea, señal e histograma. */
export function macd(vals, rapida = 12, lenta = 26, señal = 9) {
  const er = ema(vals, rapida), el = ema(vals, lenta);
  const linea = vals.map((_, i) => (Number.isFinite(er[i]) && Number.isFinite(el[i]) ? er[i] - el[i] : NaN));
  // La señal es una EMA de la línea, que empieza tarde: se calcula sobre el tramo válido.
  const desde = linea.findIndex(Number.isFinite);
  const sig = vacio(vals.length);
  if (desde >= 0) {
    const tramo = ema(linea.slice(desde), señal);
    for (let i = 0; i < tramo.length; i++) sig[desde + i] = tramo[i];
  }
  const hist = linea.map((v, i) => (Number.isFinite(v) && Number.isFinite(sig[i]) ? v - sig[i] : NaN));
  return { linea, señal: sig, hist };
}

/** Bandas de Bollinger con desviación estándar poblacional. */
export function bollinger(vals, periodo = 20, desv = 2) {
  const media = sma(vals, periodo);
  const arriba = vacio(vals.length), abajo = vacio(vals.length);
  for (let i = periodo - 1; i < vals.length; i++) {
    if (!Number.isFinite(media[i])) continue;
    let acc = 0;
    for (let j = i - periodo + 1; j <= i; j++) acc += (vals[j] - media[i]) ** 2;
    const sd = Math.sqrt(acc / periodo);
    arriba[i] = media[i] + desv * sd;
    abajo[i] = media[i] - desv * sd;
  }
  return { media, arriba, abajo };
}

/** Rango verdadero de cada vela. */
function rangosVerdaderos(velas) {
  const out = new Array(velas.length);
  out[0] = velas.length ? velas[0].h - velas[0].l : NaN;
  for (let i = 1; i < velas.length; i++) {
    const k = velas[i], p = velas[i - 1].c;
    out[i] = Math.max(k.h - k.l, Math.abs(k.h - p), Math.abs(k.l - p));
  }
  return out;
}

/** ATR de Wilder: cuánto se mueve el activo, en precio. */
export function atr(velas, periodo = 14) {
  return wilder(rangosVerdaderos(velas), periodo);
}

/**
 * VWAP anclado por sesión: se reinicia cada día (hora local del navegador).
 * En cripto 24/7 eso da el VWAP diario, que es como se usa en la práctica.
 */
export function vwap(velas) {
  const out = vacio(velas.length);
  let dia = null, pv = 0, vol = 0;
  for (let i = 0; i < velas.length; i++) {
    const k = velas[i];
    const d = new Date(k.t).toDateString();
    if (d !== dia) { dia = d; pv = 0; vol = 0; }
    const tipico = (k.h + k.l + k.c) / 3;
    pv += tipico * (k.v || 0);
    vol += k.v || 0;
    out[i] = vol > 0 ? pv / vol : k.c;
  }
  return out;
}

/** Estocástico %K/%D. */
export function estocastico(velas, periodo = 14, suave = 3) {
  const n = velas.length;
  const crudo = vacio(n);
  for (let i = periodo - 1; i < n; i++) {
    let alto = -Infinity, bajo = Infinity;
    for (let j = i - periodo + 1; j <= i; j++) {
      if (velas[j].h > alto) alto = velas[j].h;
      if (velas[j].l < bajo) bajo = velas[j].l;
    }
    crudo[i] = alto === bajo ? 50 : ((velas[i].c - bajo) / (alto - bajo)) * 100;
  }
  const k = sma(crudo, suave);
  const d = sma(k, suave);
  return { k, d };
}

/** Velas Heikin-Ashi: suavizan el ruido para ver la tendencia. */
export function heikinAshi(velas) {
  const out = [];
  for (let i = 0; i < velas.length; i++) {
    const k = velas[i];
    const c = (k.o + k.h + k.l + k.c) / 4;
    const o = i === 0 ? (k.o + k.c) / 2 : (out[i - 1].o + out[i - 1].c) / 2;
    out.push({ t: k.t, o, h: Math.max(k.h, o, c), l: Math.min(k.l, o, c), c, v: k.v });
  }
  return out;
}

/**
 * Catálogo de indicadores que la interfaz sabe dibujar.
 * `panel: 'precio'` se superpone a las velas; lo demás va en su propio panel.
 */
export const CATALOGO = {
  sma20: { nombre: 'SMA 20', panel: 'precio', calcular: (v) => [{ datos: sma(cierres(v), 20), color: '#5ec8f2' }] },
  sma50: { nombre: 'SMA 50', panel: 'precio', calcular: (v) => [{ datos: sma(cierres(v), 50), color: '#ffb454' }] },
  sma200: { nombre: 'SMA 200', panel: 'precio', calcular: (v) => [{ datos: sma(cierres(v), 200), color: '#f87171' }] },
  ema9: { nombre: 'EMA 9', panel: 'precio', calcular: (v) => [{ datos: ema(cierres(v), 9), color: '#c084fc' }] },
  ema21: { nombre: 'EMA 21', panel: 'precio', calcular: (v) => [{ datos: ema(cierres(v), 21), color: '#4ade80' }] },
  bollinger: {
    nombre: 'Bollinger', panel: 'precio',
    calcular: (v) => {
      const b = bollinger(cierres(v), 20, 2);
      return [
        { datos: b.arriba, color: '#94a1b2' },
        { datos: b.media, color: '#94a1b2', guiones: [4, 4] },
        { datos: b.abajo, color: '#94a1b2', relleno: 0 },
      ];
    },
  },
  vwap: { nombre: 'VWAP', panel: 'precio', calcular: (v) => [{ datos: vwap(v), color: '#38bdf8', guiones: [2, 3] }] },
  volumen: { nombre: 'Volumen', panel: 'volumen', altura: 0.18, calcular: () => [] },
  rsi: {
    nombre: 'RSI 14', panel: 'rsi', altura: 0.2, rango: [0, 100], lineas: [30, 50, 70],
    calcular: (v) => [{ datos: rsi(cierres(v), 14), color: '#ffb454' }],
  },
  macd: {
    nombre: 'MACD', panel: 'macd', altura: 0.22,
    calcular: (v) => {
      const m = macd(cierres(v));
      return [
        { datos: m.hist, color: '#4ade80', tipo: 'histograma' },
        { datos: m.linea, color: '#5ec8f2' },
        { datos: m.señal, color: '#f87171' },
      ];
    },
  },
  estocastico: {
    nombre: 'Estocástico', panel: 'estocastico', altura: 0.2, rango: [0, 100], lineas: [20, 80],
    calcular: (v) => {
      const e = estocastico(v);
      return [{ datos: e.k, color: '#5ec8f2' }, { datos: e.d, color: '#ffb454' }];
    },
  },
  atr: { nombre: 'ATR 14', panel: 'atr', altura: 0.18, calcular: (v) => [{ datos: atr(v, 14), color: '#fb923c' }] },
};
