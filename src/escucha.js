/**
 * escucha.js — Escucha por micrófono y reconoce lo que estás tocando:
 * una nota sola o un acorde completo. Es el motor del modo "practica y te
 * corrijo" y del entrenador de armonías.
 */

import { spectrum, hann, chroma, reconocerAcorde, detectarTono, frecuenciaANota } from './dsp.js';
import { parseChord } from './music.js';

const VENTANA = 8192;

export class Escucha {
  constructor({ onResultado = null, modo = 'acorde' } = {}) {
    this.onResultado = onResultado;
    this.modo = modo;                 // 'acorde' | 'nota'
    this.ctx = null;
    this.stream = null;
    this.analizador = null;
    this.buffer = null;
    this.ventana = hann(VENTANA);
    this.activo = false;
    this.raf = null;
    this.historial = [];
  }

  async iniciar() {
    if (this.activo) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const fuente = this.ctx.createMediaStreamSource(this.stream);
    this.analizador = this.ctx.createAnalyser();
    this.analizador.fftSize = VENTANA;
    fuente.connect(this.analizador);
    this.buffer = new Float32Array(VENTANA);
    this.activo = true;
    this._bucle();
  }

  detener() {
    this.activo = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close?.();
    this.ctx = null;
    this.historial = [];
  }

  _bucle() {
    if (!this.activo) return;
    this.analizador.getFloatTimeDomainData(this.buffer);
    let energia = 0;
    for (let i = 0; i < this.buffer.length; i += 4) energia += this.buffer[i] * this.buffer[i];
    const rms = Math.sqrt(energia / (this.buffer.length / 4));

    if (rms < 0.006) {
      this.historial.length = 0;
      this.onResultado?.({ silencio: true, rms });
    } else if (this.modo === 'nota') {
      const f = detectarTono(this.buffer, this.ctx.sampleRate);
      this.onResultado?.(f ? { nota: frecuenciaANota(f), rms } : { silencio: true, rms });
    } else {
      const c = chroma(spectrum(this.buffer, this.ventana), this.ctx.sampleRate, VENTANA);
      const candidatos = reconocerAcorde(c, { top: 3 });
      // Estabilizar: el acorde que más se repite en las últimas lecturas
      this.historial.push(candidatos[0].nombre);
      if (this.historial.length > 8) this.historial.shift();
      const cuenta = new Map();
      for (const n of this.historial) cuenta.set(n, (cuenta.get(n) || 0) + 1);
      const [estable, apariciones] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0];
      this.onResultado?.({
        acorde: estable,
        confianza: candidatos[0].score,
        estabilidad: apariciones / this.historial.length,
        alternativas: candidatos.slice(1),
        rms,
      });
    }
    this.raf = requestAnimationFrame(() => this._bucle());
  }
}

/** ¿Lo que se escuchó es el acorde esperado? Acepta equivalencias razonables. */
export function coincideAcorde(escuchado, esperado) {
  if (!escuchado || !esperado) return false;
  if (escuchado === esperado) return true;
  const a = parseChord(escuchado);
  const b = parseChord(esperado);
  if (!a || !b) return false;
  if (a.pc !== b.pc) return false;
  // Mismo fundamental: se acepta si la calidad básica coincide (mayor/menor).
  const familia = (suf) => (suf.startsWith('m') && !suf.startsWith('maj') ? 'menor' : suf.startsWith('sus') ? 'sus' : 'mayor');
  return familia(a.suffix) === familia(b.suffix);
}
