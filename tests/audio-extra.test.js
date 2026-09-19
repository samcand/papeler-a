import assert from 'node:assert/strict';
import { estirarTiempo } from '../src/timestretch.js';
import { detectarTono } from '../src/dsp.js';
import { generarClick, generarPad, codificarWav, seccionesDesdeCancion } from '../src/clicktrack.js';
import { generarQR, qrSVG, capacidadBytes } from '../src/qr.js';
import { crearCodigo, leerCodigo, crearEnlace, evaluarEnlace } from '../src/share.js';
import { historialPorCancion, resumen, sugerencias, diasDesde } from '../src/historial.js';
import { hojaParaRol, hojasDeSet, ROLES } from '../src/hojasequipo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const ta = async (name, fn) => { await fn(); passed++; console.log('  ok  ' + name); };

const SR = 44100;
const seno = (freq, segundos) => {
  const n = Math.floor(SR * segundos);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / SR) * 0.6;
  return out;
};

t('estira el tiempo sin tocar el tono', () => {
  const x = seno(440, 2);
  for (const velocidad of [0.5, 0.75, 1.5]) {
    const y = estirarTiempo(x, velocidad);
    const duracion = y.length / SR;
    assert.ok(Math.abs(duracion - 2 / velocidad) < 0.1, `duración con ${velocidad}×: ${duracion}`);
    const f = detectarTono(y.subarray(SR >> 1, (SR >> 1) + 4096), SR);
    assert.ok(Math.abs(f - 440) < 4, `el tono cambió a ${f} Hz con ${velocidad}×`);
  }
  assert.equal(estirarTiempo(x, 1).length, x.length);
});

t('genera una pista de clic con su estructura', () => {
  const click = generarClick({
    bpm: 120, compas: '4/4', cuentaEntrada: 1,
    secciones: [{ nombre: 'Verso', compases: 4 }, { nombre: 'Coro', compases: 8 }],
  });
  assert.equal(click.totalCompases, 13);                 // 1 de cuenta + 4 + 8
  assert.deepEqual(click.marcas.map((m) => m.nombre), ['Verso', 'Coro']);
  assert.equal(click.marcas[0].t, 2);                    // tras el compás de cuenta
  assert.equal(click.marcas[1].t, 10);
  assert.ok(click.audio.some((v) => Math.abs(v) > 0.1), 'debe sonar algo');
});

t('el pad suena en la tonalidad y no satura', () => {
  const pad = generarPad({ key: 'G', duracion: 2 });
  let pico = 0;
  for (const v of pad.audio) pico = Math.max(pico, Math.abs(v));
  assert.ok(pico > 0.1 && pico <= 0.3, `pico ${pico}`);
  assert.equal(pad.audio.length, 2 * 44100);
});

t('calcula los compases de cada sección', () => {
  const song = { bpm: 120, timeSignature: '4/4' };
  const secciones = seccionesDesdeCancion(song, [
    { name: 'Intro', start: 0, end: 8 }, { name: 'Verso', start: 8, end: 24 },
  ]);
  assert.deepEqual(secciones, [{ nombre: 'Intro', compases: 4 }, { nombre: 'Verso', compases: 8 }]);
});

t('empaqueta el audio en un .wav válido', () => {
  const wav = codificarWav([seno(440, 0.1)], SR);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), 'WAVE');
  const view = new DataView(wav.buffer);
  assert.equal(view.getUint16(22, true), 1, 'un canal');
  assert.equal(view.getUint32(24, true), SR);
  assert.equal(view.getUint16(34, true), 16, '16 bits');
});

t('genera códigos QR con la estructura del estándar', () => {
  const { matriz, tam, version } = generarQR('HOLA');
  assert.equal(version, 1);
  assert.equal(tam, 21);
  // Patrones de búsqueda en las tres esquinas
  for (const [f, c] of [[0, 0], [0, 14], [14, 0]]) {
    assert.equal(matriz[f][c], 1);
    assert.equal(matriz[f + 1][c + 1], 0);
    assert.equal(matriz[f + 3][c + 3], 1, 'centro del patrón');
  }
  // Sincronía alternada
  for (let i = 8; i < 13; i++) assert.equal(matriz[6][i], i % 2 === 0 ? 1 : 0);
  assert.ok(capacidadBytes(1) >= 17 && capacidadBytes(40) > 2900);
  assert.ok(qrSVG('prueba').startsWith('<svg'));
  assert.throws(() => generarQR('x'.repeat(4000)), /demasiado largo/);
});

await ta('comparte y recupera un set completo', async () => {
  const songs = [
    { id: '1', title: 'Santo', author: 'Heber', key: 'D', bpm: 72, timeSignature: '4/4', feel: 'balada',
      body: '{Coro}\n[D]Santo [A]santo\n', tags: ['himno'], timeline: [{ t: 0, name: 'Intro' }] },
  ];
  const setlist = { name: 'Domingo', date: '2026-09-20', notes: 'nota', songs: [{ songId: '1', key: 'E' }] };
  const codigo = await crearCodigo(setlist, songs);
  const vuelta = await leerCodigo(codigo);
  assert.equal(vuelta.setlist.name, 'Domingo');
  assert.equal(vuelta.songs[0].title, 'Santo');
  assert.equal(vuelta.songs[0].body, songs[0].body);
  assert.deepEqual(vuelta.tonalidades, ['E']);
  const enlace = crearEnlace(codigo, 'https://ejemplo/');
  assert.ok(enlace.includes('#/importar?d='));
  assert.ok(evaluarEnlace(enlace).cabeEnQR);
  await assert.rejects(() => leerCodigo('zBASURA'), /.*/);
});

t('lleva el historial del repertorio', () => {
  const songs = [{ id: '1', title: 'A', key: 'G' }, { id: '2', title: 'B', key: 'C' }];
  const setlists = [
    { date: '2026-09-13', songs: [{ songId: '1', key: 'G' }] },
    { date: '2026-09-06', songs: [{ songId: '1', key: 'G' }] },
    { date: '2026-08-30', songs: [{ songId: '1', key: 'A' }] },
    { date: '2026-08-23', songs: [{ songId: '1', key: 'G' }] },
  ];
  const hoy = new Date('2026-09-19T12:00:00');
  const h = historialPorCancion(setlists, songs, hoy);
  assert.equal(h.cantadas.length, 1);
  assert.equal(h.cantadas[0].veces, 4);
  assert.equal(h.cantadas[0].seguidas, 4);
  assert.equal(h.cantadas[0].tonalidadMasUsada, 'G');
  assert.equal(h.nunca.length, 1);
  assert.equal(diasDesde('2026-09-13', hoy), 6);

  const avisos = sugerencias(h);
  assert.ok(avisos.some((a) => a.tipo === 'repetida'));
  assert.ok(avisos.some((a) => a.tipo === 'sin-estrenar'));

  const r = resumen(setlists, songs, hoy);
  assert.equal(r.servicios, 4);
  assert.equal(r.promedioPorServicio, 1);
});

t('arma una hoja distinta para cada músico', () => {
  const song = {
    id: '1', title: 'Prueba', author: 'Equipo', key: 'G', bpm: 80, timeSignature: '4/4', feel: 'balada',
    body: '{Intro}\n| [G] | [D] |\n\n{Verso 1}\n[G]Hola [D]mundo\n\n{Coro}\n[Em7]Canta [C]conmigo\n',
    instrumentNotes: { guitarra: 'capo 2' },
  };
  const voz = hojaParaRol(song, 'voz');
  const textoVoz = JSON.stringify(voz);
  assert.ok(!textoVoz.includes('"acordes"'), 'la hoja de voces no lleva acordes');
  assert.ok(textoVoz.includes('Hola mundo'));

  const guitarra = hojaParaRol(song, 'guitarra');
  assert.ok(guitarra.bloques[0].etiqueta.includes('DIGITACIONES'));
  assert.ok(JSON.stringify(guitarra).includes('capo 2'));

  const bateria = hojaParaRol(song, 'bateria');
  assert.ok(!JSON.stringify(bateria).includes('Em7'), 'la batería no necesita acordes');
  assert.ok(JSON.stringify(bateria).includes('80 BPM'));

  const numeros = hojaParaRol(song, 'nashville');
  assert.ok(JSON.stringify(numeros).includes('| 1 | 5 |'), 'los acordes van como grados');

  const set = hojasDeSet({ songs: [{ songId: '1', key: 'A' }] }, [song], 'completa');
  assert.equal(set.length, 1);
  assert.equal(set[0].tonalidad, 'A');
  assert.equal(ROLES.length, 7);
});

console.log(`\n${passed} pruebas OK`);
