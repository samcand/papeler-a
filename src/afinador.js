/**
 * afinador.js — Afinador cromático por micrófono para guitarra, ukelele, bajo
 * y cualquier afinación. Usa YIN (src/dsp.js), que aguanta bien las notas
 * graves del bajo, donde los afinadores por FFT suelen fallar.
 */

import { detectarTono, frecuenciaANota, notaAFrecuencia } from './dsp.js';
import { INSTRUMENTOS } from './fretboard.js';

export const AFINACIONES = Object.entries(INSTRUMENTOS).map(([id, inst]) => ({
  id, nombre: inst.nombre, cuerdas: inst.cuerdas, etiquetas: inst.etiquetas,
}));

export class Afinador {
  constructor({ referencia = 440, onLectura = null } = {}) {
    this.referencia = referencia;
    this.onLectura = onLectura;
    this.ctx = null;
    this.stream = null;
    this.analizador = null;
    this.buffer = null;
    this.raf = null;
    this.activo = false;
    this.historial = [];
  }

  async iniciar() {
    if (this.activo) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false, noiseSuppression: false,
        autoGainControl: false, channelCount: 1,
      },
    });
    const fuente = this.ctx.createMediaStreamSource(this.stream);
    this.analizador = this.ctx.createAnalyser();
    this.analizador.fftSize = 4096;
    fuente.connect(this.analizador);
    this.buffer = new Float32Array(this.analizador.fftSize);
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
    const freq = detectarTono(this.buffer, this.ctx.sampleRate, { fMin: 28, fMax: 1400 });
    if (freq) {
      // Promedio de las últimas lecturas: la aguja deja de temblar.
      this.historial.push(freq);
      if (this.historial.length > 6) this.historial.shift();
      const ordenado = [...this.historial].sort((a, b) => a - b);
      const mediana = ordenado[Math.floor(ordenado.length / 2)];
      this.onLectura?.(frecuenciaANota(mediana, this.referencia));
    } else {
      this.historial.length = 0;
      this.onLectura?.(null);
    }
    this.raf = requestAnimationFrame(() => this._bucle());
  }
}

/** Cuerda más cercana a lo que se está tocando, para resaltarla en pantalla. */
export function cuerdaMasCercana(midiDetectado, cuerdas = []) {
  if (midiDetectado == null || !cuerdas.length) return null;
  let mejor = 0;
  for (let i = 1; i < cuerdas.length; i++) {
    if (Math.abs(cuerdas[i] - midiDetectado) < Math.abs(cuerdas[mejor] - midiDetectado)) mejor = i;
  }
  return mejor;
}

/** Nota de referencia para afinar de oído (la app la toca). */
export function tocarNota(midi, { referencia = 440, duracion = 1.6 } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = notaAFrecuencia(midi, referencia);
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duracion + 0.1);
  setTimeout(() => ctx.close?.(), (duracion + 0.5) * 1000);
}

export function estadoAfinacion(cents) {
  if (cents == null) return { texto: '—', clase: '' };
  if (Math.abs(cents) <= 5) return { texto: 'Afinada', clase: 'ok' };
  if (cents < 0) return { texto: `Baja ${Math.abs(cents)}¢ — tensa la cuerda`, clase: 'bajo' };
  return { texto: `Alta ${cents}¢ — afloja la cuerda`, clase: 'alto' };
}
