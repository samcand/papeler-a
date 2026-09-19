import assert from 'node:assert/strict';
import { spectrum, hann, chroma, reconocerAcorde, detectarTono, frecuenciaANota, notaAFrecuencia } from '../src/dsp.js';

const SR = 44100;
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

/** Genera una señal con varias frecuencias (y un poco de armónicos, como un instrumento real). */
function tono(freqs, n = 8192, sr = SR, armonicos = 3) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const f of freqs) {
      for (let h = 1; h <= armonicos; h++) v += (1 / h) * Math.sin((2 * Math.PI * f * h * i) / sr);
    }
    out[i] = v / (freqs.length * 1.6);
  }
  return out;
}

const midiAFreq = (m) => notaAFrecuencia(m);
const acorde = (semis, base = 60) => semis.map((s) => midiAFreq(base + s));

t('detecta el tono de un La 440', () => {
  const f = detectarTono(tono([440], 4096), SR);
  assert.ok(Math.abs(f - 440) < 2, `esperaba ~440, dio ${f}`);
  const n = frecuenciaANota(f);
  assert.equal(n.nota, 'A');
  assert.equal(n.octava, 4);
  assert.ok(Math.abs(n.cents) <= 8);
});

t('detecta cuerdas de guitarra al aire', () => {
  for (const [midi, nombre] of [[40, 'E'], [45, 'A'], [50, 'D'], [55, 'G'], [59, 'B'], [64, 'E']]) {
    const f = detectarTono(tono([midiAFreq(midi)], 8192), SR);
    const n = frecuenciaANota(f);
    assert.equal(n.nota, nombre, `cuerda midi ${midi}: esperaba ${nombre}, dio ${n?.nota}`);
    assert.equal(n.midi, midi);
  }
});

t('mide desafinación en cents', () => {
  const f = detectarTono(tono([midiAFreq(40) * Math.pow(2, 25 / 1200)], 8192), SR);
  const n = frecuenciaANota(f);
  assert.equal(n.midi, 40);
  assert.ok(n.cents > 15 && n.cents < 35, `esperaba ~25 cents, dio ${n.cents}`);
});

t('el silencio no produce nota', () => {
  assert.equal(detectarTono(new Float32Array(4096), SR), 0);
});

t('reconoce acordes desde el audio', () => {
  const casos = [
    [[0, 4, 7], 'C'], [[0, 3, 7], 'Cm'], [[2, 6, 9], 'D'], [[7, 11, 14], 'G'],
    [[0, 4, 7, 10], 'C7'], [[9, 12, 16, 19], 'Am7'], [[0, 5, 7], 'Csus4'],
  ];
  for (const [semis, esperado] of casos) {
    const señal = tono(acorde(semis), 8192, SR, 2);
    const mag = spectrum(señal, hann(8192));
    const c = chroma(mag, SR, 8192);
    const [mejor] = reconocerAcorde(c);
    assert.equal(mejor.nombre, esperado, `esperaba ${esperado}, dio ${mejor.nombre} (${mejor.score.toFixed(2)})`);
  }
});

console.log(`\n${passed} pruebas OK`);
