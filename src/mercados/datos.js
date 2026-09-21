/**
 * datos.js — De dónde salen las velas.
 *
 * Cada proveedor traduce su propio formato al mismo objeto vela
 * { t, o, h, l, c, v } y se elige desde la interfaz. Las claves de API son del
 * usuario y viven solo en su navegador (localStorage), nunca se envían a
 * ningún sitio que no sea el proveedor elegido.
 *
 * - binance  : cripto, sin clave, con actualización en vivo por WebSocket.
 * - twelvedata / polygon / alpaca : acciones de EE.UU. con clave gratuita.
 * - demo     : camino aleatorio reproducible, para probar sin red ni claves.
 */

/** Duración de cada temporalidad en milisegundos. */
export const INTERVALOS = {
  '1m': 60e3, '5m': 300e3, '15m': 900e3, '1h': 3600e3,
  '4h': 14400e3, '1d': 86400e3, '1w': 604800e3,
};

export const ETIQUETAS = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1S' };

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Ordena por tiempo y descarta duplicados y velas rotas. */
function limpiar(velas) {
  const vistas = new Map();
  for (const k of velas) {
    if (!Number.isFinite(k.t) || !Number.isFinite(k.c)) continue;
    vistas.set(k.t, k);
  }
  return [...vistas.values()].sort((a, b) => a.t - b.t);
}

async function pedirJson(url, opciones) {
  let res;
  try {
    res = await fetch(url, opciones);
  } catch {
    // fetch solo dice "Failed to fetch": sin red, bloqueado por CORS o por una
    // extensión. Al usuario hay que decirle qué mirar.
    throw new Error(`No se pudo conectar con ${new URL(url).hostname}. Revisa la conexión, el bloqueador de anuncios o la VPN.`);
  }
  if (res.status === 401 || res.status === 403) throw new Error('Clave rechazada: revísala en Ajustes.');
  if (res.status === 429) throw new Error('Te pasaste del límite del plan gratuito. Espera un minuto.');
  if (res.status === 404) throw new Error('Ese símbolo no existe en este proveedor.');
  if (!res.ok) {
    let detalle = '';
    try { detalle = (await res.text()).slice(0, 160); } catch { /* respuesta sin cuerpo */ }
    throw new Error(`${res.status} ${res.statusText}${detalle ? ` — ${detalle}` : ''}`);
  }
  return res.json();
}

/** Rango [desde, hasta] que cubre `limite` velas de esa temporalidad. */
function rango(intervalo, limite) {
  const hasta = new Date();
  // Los mercados cierran de noche y fines de semana: se pide de más para
  // no quedarse corto en las temporalidades intradía de acciones.
  const holgura = intervalo === '1d' || intervalo === '1w' ? 1.45 : 3.2;
  const desde = new Date(hasta.getTime() - INTERVALOS[intervalo] * limite * holgura);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { desde, hasta, desdeIso: iso(desde), hastaIso: iso(hasta) };
}

export const PROVEEDORES = {
  binance: {
    nombre: 'Binance (cripto)',
    activos: 'cripto',
    clave: null,
    ejemplos: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'],
    nota: 'Gratis y sin registro. Datos en vivo por WebSocket.',
    async velas(simbolo, intervalo, limite = 1000) {
      const u = new URL('https://api.binance.com/api/v3/klines');
      u.searchParams.set('symbol', simbolo.toUpperCase());
      u.searchParams.set('interval', intervalo);
      u.searchParams.set('limit', String(Math.min(limite, 1000)));
      const filas = await pedirJson(u);
      return limpiar(filas.map((f) => ({
        t: num(f[0]), o: num(f[1]), h: num(f[2]), l: num(f[3]), c: num(f[4]), v: num(f[5]),
      })));
    },
    /** Suscripción en vivo: devuelve una función para cortarla. */
    enVivo(simbolo, intervalo, alRecibir) {
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${simbolo.toLowerCase()}@kline_${intervalo}`);
      ws.onmessage = (ev) => {
        const k = JSON.parse(ev.data).k;
        if (k) alRecibir({ t: num(k.t), o: num(k.o), h: num(k.h), l: num(k.l), c: num(k.c), v: num(k.v) });
      };
      return () => { try { ws.close(); } catch { /* ya estaba cerrado */ } };
    },
  },

  twelvedata: {
    nombre: 'Twelve Data (acciones + cripto)',
    activos: 'acciones, cripto, forex',
    clave: { campos: ['apikey'], alta: 'https://twelvedata.com/pricing' },
    ejemplos: ['AAPL', 'NVDA', 'MSFT', 'SPY', 'TSLA'],
    nota: 'Plan gratuito: 800 peticiones al día, 8 por minuto. Diferido 15 min.',
    async velas(simbolo, intervalo, limite = 1000, claves = {}) {
      const mapa = { '1m': '1min', '5m': '5min', '15m': '15min', '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week' };
      const u = new URL('https://api.twelvedata.com/time_series');
      u.searchParams.set('symbol', simbolo.toUpperCase());
      u.searchParams.set('interval', mapa[intervalo]);
      u.searchParams.set('outputsize', String(Math.min(limite, 5000)));
      u.searchParams.set('apikey', claves.apikey || '');
      const j = await pedirJson(u);
      if (j.status === 'error') throw new Error(j.message || 'Twelve Data rechazó la petición');
      return limpiar((j.values || []).map((f) => ({
        t: new Date(f.datetime.length <= 10 ? `${f.datetime}T00:00:00` : f.datetime.replace(' ', 'T')).getTime(),
        o: num(f.open), h: num(f.high), l: num(f.low), c: num(f.close), v: num(f.volume),
      })));
    },
  },

  polygon: {
    nombre: 'Polygon.io (acciones)',
    activos: 'acciones, cripto, forex',
    clave: { campos: ['apikey'], alta: 'https://polygon.io/pricing' },
    ejemplos: ['AAPL', 'NVDA', 'MSFT', 'SPY', 'AMD'],
    nota: 'Plan gratuito: 5 peticiones por minuto, cierre del día anterior.',
    async velas(simbolo, intervalo, limite = 1000, claves = {}) {
      const mapa = {
        '1m': [1, 'minute'], '5m': [5, 'minute'], '15m': [15, 'minute'],
        '1h': [1, 'hour'], '4h': [4, 'hour'], '1d': [1, 'day'], '1w': [1, 'week'],
      };
      const [mult, unidad] = mapa[intervalo];
      const r = rango(intervalo, limite);
      const u = new URL(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(simbolo.toUpperCase())}/range/${mult}/${unidad}/${r.desdeIso}/${r.hastaIso}`);
      u.searchParams.set('adjusted', 'true');
      u.searchParams.set('sort', 'asc');
      u.searchParams.set('limit', '50000');
      u.searchParams.set('apiKey', claves.apikey || '');
      const j = await pedirJson(u);
      if (j.status === 'ERROR') throw new Error(j.error || 'Polygon rechazó la petición');
      return limpiar((j.results || []).map((f) => ({
        t: num(f.t), o: num(f.o), h: num(f.h), l: num(f.l), c: num(f.c), v: num(f.v),
      })));
    },
  },

  alpaca: {
    nombre: 'Alpaca (acciones)',
    activos: 'acciones, cripto',
    clave: { campos: ['id', 'secreto'], alta: 'https://alpaca.markets/' },
    ejemplos: ['AAPL', 'NVDA', 'MSFT', 'SPY', 'GOOGL'],
    nota: 'Cuenta gratuita: feed IEX en tiempo real, histórico completo.',
    async velas(simbolo, intervalo, limite = 1000, claves = {}) {
      const mapa = { '1m': '1Min', '5m': '5Min', '15m': '15Min', '1h': '1Hour', '4h': '4Hour', '1d': '1Day', '1w': '1Week' };
      const r = rango(intervalo, limite);
      const u = new URL(`https://data.alpaca.markets/v2/stocks/${encodeURIComponent(simbolo.toUpperCase())}/bars`);
      u.searchParams.set('timeframe', mapa[intervalo]);
      u.searchParams.set('start', r.desde.toISOString());
      u.searchParams.set('limit', String(Math.min(limite, 10000)));
      u.searchParams.set('feed', 'iex');
      const j = await pedirJson(u, {
        headers: { 'APCA-API-KEY-ID': claves.id || '', 'APCA-API-SECRET-KEY': claves.secreto || '' },
      });
      return limpiar((j.bars || []).map((f) => ({
        t: new Date(f.t).getTime(), o: num(f.o), h: num(f.h), l: num(f.l), c: num(f.c), v: num(f.v),
      })));
    },
  },

  demo: {
    nombre: 'Demo (sin red)',
    activos: 'lo que escribas',
    clave: null,
    ejemplos: ['DEMO', 'PRUEBA'],
    nota: 'Datos inventados y reproducibles. Sirve para probar la interfaz.',
    async velas(simbolo, intervalo, limite = 500) {
      return generarDemo(simbolo, intervalo, Math.min(limite, 1500));
    },
  },
};

/**
 * Camino aleatorio reproducible: el mismo símbolo da siempre la misma serie.
 * No es un mercado, pero se comporta como uno para probar el dibujo.
 */
export function generarDemo(simbolo = 'DEMO', intervalo = '1h', cuantas = 500, ahora = Date.now()) {
  let semilla = 7;
  for (const ch of String(simbolo)) semilla = (semilla * 31 + ch.charCodeAt(0)) >>> 0;
  const azar = () => {
    // xorshift32: barato y determinista.
    semilla ^= semilla << 13; semilla >>>= 0;
    semilla ^= semilla >> 17;
    semilla ^= semilla << 5; semilla >>>= 0;
    return semilla / 4294967296;
  };
  const paso = INTERVALOS[intervalo] || INTERVALOS['1h'];
  const inicio = Math.floor((ahora - cuantas * paso) / paso) * paso;
  const velas = [];
  let precio = 100 + azar() * 200;
  let deriva = 0;
  for (let i = 0; i < cuantas; i++) {
    deriva = deriva * 0.97 + (azar() - 0.5) * 0.0025;
    const o = precio;
    const c = Math.max(1, o * (1 + deriva + (azar() - 0.5) * 0.012));
    const mecha = o * (0.002 + azar() * 0.01);
    velas.push({
      t: inicio + i * paso,
      o, c,
      h: Math.max(o, c) + mecha * azar(),
      l: Math.min(o, c) - mecha * azar(),
      v: Math.round(1e5 + azar() * 9e5),
    });
    precio = c;
  }
  return velas;
}

/** Pide velas al proveedor indicado, con las claves guardadas del usuario. */
export async function cargarVelas({ proveedor, simbolo, intervalo, limite = 1000, claves = {} }) {
  const p = PROVEEDORES[proveedor];
  if (!p) throw new Error(`Proveedor desconocido: ${proveedor}`);
  if (p.clave && !p.clave.campos.every((c) => claves[c])) {
    throw new Error(`${p.nombre} necesita tu clave: ponla en Ajustes.`);
  }
  const velas = await p.velas(simbolo, intervalo, limite, claves);
  if (!velas.length) throw new Error(`Sin datos para ${simbolo} en ${intervalo}.`);
  return velas;
}

/**
 * Mete una vela nueva en la serie: reemplaza la última si es la misma,
 * la añade si es posterior y la ignora si llega atrasada.
 */
export function fusionarVela(velas, vela) {
  if (!velas.length) return [vela];
  const ultima = velas[velas.length - 1];
  if (vela.t === ultima.t) { velas[velas.length - 1] = vela; return velas; }
  if (vela.t > ultima.t) { velas.push(vela); return velas; }
  return velas;
}
