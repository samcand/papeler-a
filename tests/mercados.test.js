import assert from 'node:assert/strict';
import {
  sma, ema, rsi, macd, bollinger, atr, vwap, estocastico, heikinAshi, cierres, CATALOGO,
} from '../src/mercados/indicadores.js';
import { generarDemo, fusionarVela, INTERVALOS } from '../src/mercados/datos.js';
import { pasoBonito, decimales, formatearVolumen, formatearPrecio, esMarca, etiquetaTiempo } from '../src/mercados/grafico.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

const rampa = (n, desde = 1, paso = 1) => Array.from({ length: n }, (_, i) => desde + i * paso);
const velasDe = (cierres) => cierres.map((c, i) => ({
  t: i * 3600e3, o: c, h: c + 1, l: c - 1, c, v: 1000 + i,
}));

// ---------- medias ----------

t('la SMA promedia la ventana y deja NaN antes de tenerla completa', () => {
  const s = sma([1, 2, 3, 4, 5], 3);
  assert.ok(Number.isNaN(s[0]) && Number.isNaN(s[1]));
  assert.equal(s[2], 2);
  assert.equal(s[3], 3);
  assert.equal(s[4], 4);
  assert.equal(s.length, 5);
});

t('la SMA de una serie constante es esa constante', () => {
  const s = sma(new Array(50).fill(7), 20);
  assert.equal(s[49], 7);
});

t('la EMA arranca en la SMA y reacciona más rápido que ella', () => {
  const vals = [...new Array(20).fill(10), ...new Array(20).fill(20)];
  const e = ema(vals, 10), s = sma(vals, 10);
  assert.equal(e[9], 10);
  assert.ok(e[25] > s[25], 'la EMA debería ir por delante en un salto al alza');
  assert.ok(e[39] < 20 && e[39] > 19, `esperaba casi 20, dio ${e[39]}`);
});

// ---------- osciladores ----------

t('el RSI de una subida continua satura cerca de 100', () => {
  const r = rsi(rampa(60), 14);
  assert.equal(r[59], 100);
  assert.ok(Number.isNaN(r[13]));
});

t('el RSI de una bajada continua se hunde a 0', () => {
  const r = rsi(rampa(60, 100, -1), 14);
  assert.ok(r[59] < 0.001, `esperaba ~0, dio ${r[59]}`);
});

t('el RSI se queda en la zona media cuando el precio oscila', () => {
  const vals = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 3) * 5);
  const r = rsi(vals, 14).filter(Number.isFinite);
  assert.ok(r.every((v) => v >= 0 && v <= 100));
  const medio = r.reduce((a, b) => a + b, 0) / r.length;
  assert.ok(medio > 35 && medio < 65, `media fuera de rango: ${medio}`);
});

t('el histograma del MACD es la línea menos la señal', () => {
  const vals = Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 7) * 10 + i * 0.2);
  const m = macd(vals);
  for (let i = 0; i < vals.length; i++) {
    if (!Number.isFinite(m.hist[i])) continue;
    assert.ok(Math.abs(m.hist[i] - (m.linea[i] - m.señal[i])) < 1e-9);
  }
  assert.ok(m.linea.filter(Number.isFinite).length > 80);
  assert.ok(m.señal.filter(Number.isFinite).length > 70);
});

t('el estocástico marca 100 en el máximo y 0 en el mínimo del rango', () => {
  // Sin mechas, el cierre es el extremo del rango y %K satura.
  const planas = (cs) => cs.map((c, i) => ({ t: i * 60e3, o: c, h: c, l: c, c, v: 1 }));
  const e = estocastico(planas(rampa(40)), 14, 1);
  assert.ok(Math.abs(e.k[39] - 100) < 1e-9, `esperaba 100, dio ${e.k[39]}`);
  const bajando = estocastico(planas(rampa(40, 100, -1)), 14, 1);
  assert.ok(Math.abs(bajando.k[39]) < 1e-9, `esperaba 0, dio ${bajando.k[39]}`);
  // Con mechas el cierre queda dentro del rango, nunca en el extremo.
  const conMecha = estocastico(velasDe(rampa(40)), 14, 1);
  assert.ok(conMecha.k[39] > 80 && conMecha.k[39] < 100, `fuera de rango: ${conMecha.k[39]}`);
});

// ---------- bandas y rango ----------

t('las bandas de Bollinger encierran la media y colapsan sin volatilidad', () => {
  const vals = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 2) * 4);
  const b = bollinger(vals, 20, 2);
  for (let i = 19; i < vals.length; i++) {
    assert.ok(b.arriba[i] > b.media[i] && b.media[i] > b.abajo[i]);
  }
  const plana = bollinger(new Array(40).fill(50), 20, 2);
  assert.ok(Math.abs(plana.arriba[39] - plana.abajo[39]) < 1e-9);
});

t('el ATR promedia el rango de la vela cuando no hay huecos', () => {
  // Rango fijo de 4 y avance de 1 por vela: el hueco no supera al rango.
  const velas = rampa(40).map((c, i) => ({ t: i * 60e3, o: c, h: c + 2, l: c - 2, c, v: 1 }));
  const a = atr(velas, 14);
  assert.ok(Math.abs(a[39] - 4) < 1e-9, `esperaba 4, dio ${a[39]}`);
});

t('el ATR sube cuando el precio abre con un hueco', () => {
  const plano = new Array(30).fill(10).map((c, i) => ({ t: i * 60e3, o: c, h: c + 1, l: c - 1, c, v: 1 }));
  const conHueco = [...plano, { t: 30 * 60e3, o: 30, h: 31, l: 29, c: 30, v: 1 }];
  const antes = atr(plano, 14)[29];
  const despues = atr(conHueco, 14)[30];
  assert.ok(Math.abs(antes - 2) < 1e-9, `rango plano esperado 2, dio ${antes}`);
  // El salto de 10 a 29 entra como rango verdadero y tira la media hacia arriba.
  assert.ok(despues > antes + 1, `el hueco debería subir el ATR: ${antes} -> ${despues}`);
});

t('el VWAP se reinicia cada día y queda dentro del rango de precios', () => {
  const dia = 86400e3;
  const velas = [
    { t: 0, o: 10, h: 10, l: 10, c: 10, v: 100 },
    { t: 3600e3, o: 20, h: 20, l: 20, c: 20, v: 100 },
    { t: dia, o: 50, h: 50, l: 50, c: 50, v: 100 },
  ];
  const v = vwap(velas);
  assert.equal(v[0], 10);
  assert.equal(v[1], 15);
  assert.equal(v[2], 50, 'el segundo día debe empezar de cero');
});

t('el VWAP sin volumen cae al cierre en vez de dividir por cero', () => {
  const v = vwap([{ t: 0, o: 5, h: 5, l: 5, c: 5, v: 0 }]);
  assert.equal(v[0], 5);
});

// ---------- transformaciones ----------

t('Heikin-Ashi mantiene la coherencia máximo/mínimo', () => {
  const ha = heikinAshi(generarDemo('HA', '1h', 120));
  assert.equal(ha.length, 120);
  for (const k of ha) {
    assert.ok(k.h >= Math.max(k.o, k.c) - 1e-9);
    assert.ok(k.l <= Math.min(k.o, k.c) + 1e-9);
  }
});

t('todos los indicadores del catálogo devuelven series del largo de la entrada', () => {
  const velas = generarDemo('CAT', '1d', 260);
  for (const [clave, def] of Object.entries(CATALOGO)) {
    for (const serie of def.calcular(velas)) {
      assert.equal(serie.datos.length, velas.length, `${clave} devolvió otro largo`);
      assert.ok(serie.color, `${clave} no trae color`);
    }
  }
  assert.equal(cierres(velas).length, velas.length);
});

// ---------- datos ----------

t('el generador demo es reproducible y coherente', () => {
  const a = generarDemo('BTC', '1h', 200, 1700000000000);
  const b = generarDemo('BTC', '1h', 200, 1700000000000);
  assert.deepEqual(a, b);
  assert.notEqual(a[50].c, generarDemo('ETH', '1h', 200, 1700000000000)[50].c);
  for (const k of a) {
    assert.ok(k.h >= Math.max(k.o, k.c) && k.l <= Math.min(k.o, k.c));
    assert.ok(k.c > 0 && k.v > 0);
  }
  for (let i = 1; i < a.length; i++) {
    assert.equal(a[i].t - a[i - 1].t, INTERVALOS['1h'], 'las velas deben ir espaciadas por su intervalo');
  }
});

t('fusionarVela reemplaza la última, añade la siguiente e ignora las atrasadas', () => {
  const velas = [{ t: 100, o: 1, h: 1, l: 1, c: 1, v: 1 }];
  fusionarVela(velas, { t: 100, o: 1, h: 3, l: 1, c: 3, v: 9 });
  assert.equal(velas.length, 1);
  assert.equal(velas[0].c, 3, 'la vela en curso debe actualizarse');
  fusionarVela(velas, { t: 200, o: 3, h: 4, l: 3, c: 4, v: 2 });
  assert.equal(velas.length, 2);
  fusionarVela(velas, { t: 50, o: 9, h: 9, l: 9, c: 9, v: 9 });
  assert.equal(velas.length, 2, 'una vela vieja no debe entrar');
  assert.equal(velas[1].c, 4);
});

// ---------- formato del gráfico ----------

t('el paso del eje cae siempre en 1, 2, 2.5 o 5 por potencia de diez', () => {
  for (const span of [0.004, 1, 7, 93, 1234, 987654]) {
    const p = pasoBonito(span, 6);
    const norm = p / Math.pow(10, Math.floor(Math.log10(p)));
    assert.ok([1, 2, 2.5, 5].some((v) => Math.abs(norm - v) < 1e-9), `paso raro: ${p} (span ${span})`);
    assert.ok(span / p > 2 && span / p < 15, `el eje quedaría con muy pocas o muchas marcas: ${span / p}`);
  }
  assert.equal(pasoBonito(0), 1, 'un rango vacío no debe romper el eje');
});

t('los decimales se ajustan al precio del activo', () => {
  assert.equal(decimales(64000), 2);
  assert.equal(decimales(1.5), 3);
  assert.equal(decimales(0.00004321), 8);
  assert.equal(formatearPrecio(1234.5678), '1234.57');
  assert.equal(formatearPrecio(NaN), '—');
});

t('el volumen se compacta', () => {
  assert.equal(formatearVolumen(1500), '1.5K');
  assert.equal(formatearVolumen(2340000), '2.34M');
  assert.equal(formatearVolumen(4e9), '4.00B');
  assert.equal(formatearVolumen(42), '42');
});

t('el eje de tiempo marca fronteras redondas, no múltiplos de vela', () => {
  const HORA = 3600e3, DIA = 86400e3;
  // Con paso de 6 horas solo se marca al cruzar una hora local múltiplo de 6.
  const base = new Date(2026, 2, 10, 5, 0, 0).getTime();
  assert.equal(esMarca(base + HORA, base, 6 * HORA), true, 'las 6:00 son frontera');
  assert.equal(esMarca(base + 2 * HORA, base + HORA, 6 * HORA), false, 'las 7:00 no');
  // Con paso diario, la frontera es el cambio de día local.
  const noche = new Date(2026, 2, 10, 23, 0, 0).getTime();
  assert.equal(esMarca(noche + 2 * HORA, noche, DIA), true);
  assert.equal(esMarca(noche - HORA, noche - 2 * HORA, DIA), false);
  // Con paso mensual, el cambio de mes.
  assert.equal(esMarca(new Date(2026, 3, 1).getTime(), new Date(2026, 2, 31).getTime(), 30 * DIA), true);
  assert.equal(esMarca(new Date(2026, 2, 12).getTime(), new Date(2026, 2, 11).getTime(), 30 * DIA), false);
});

t('la etiqueta del eje pasa de hora a fecha al cambiar de día', () => {
  const t1 = new Date(2026, 2, 10, 14, 30).getTime();
  assert.match(etiquetaTiempo(t1, 3600e3, false), /14:30/);
  assert.match(etiquetaTiempo(t1, 3600e3, true), /10/, 'al cambiar de día manda la fecha');
  assert.equal(etiquetaTiempo(t1, 365 * 86400e3, false), '2026');
});

console.log(`\n${passed} pruebas de mercados pasadas`);
