/**
 * dsp.js — Procesamiento de señal: FFT, cromagrama, reconocimiento de acordes
 * y detección de tono (YIN). Es matemática pura, sin dependencias del navegador,
 * así que se puede probar fuera de él.
 */

/** FFT radix-2 in-place. `re` e `im` deben tener longitud potencia de 2. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

export function hann(size) {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  return w;
}

/** Magnitudes del espectro de un bloque de muestras. */
export function spectrum(samples, window = null) {
  const n = samples.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = samples[i] * (window ? window[i] : 1);
  fft(re, im);
  const mag = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

/**
 * Cromagrama: cuánta energía hay en cada una de las 12 notas, sin importar
 * la octava. Es la base para reconocer acordes.
 */
export function chroma(mag, sampleRate, fftSize, { fMin = 65, fMax = 2200 } = {}) {
  const out = new Float64Array(12);
  for (let k = 1; k < mag.length; k++) {
    const f = (k * sampleRate) / fftSize;
    if (f < fMin || f > fMax) continue;
    const midi = 69 + 12 * Math.log2(f / 440);
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    out[pc] += mag[k] * mag[k];
  }
  const max = Math.max(...out) || 1;
  for (let i = 0; i < 12; i++) out[i] /= max;
  return out;
}

const NOMBRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Plantillas de acorde: intervalos y peso relativo de cada nota. */
const PLANTILLAS = [
  { sufijo: '',     grados: [0, 4, 7],          peso: 1.00 },
  { sufijo: 'm',    grados: [0, 3, 7],          peso: 1.00 },
  { sufijo: '7',    grados: [0, 4, 7, 10],      peso: 0.96 },
  { sufijo: 'm7',   grados: [0, 3, 7, 10],      peso: 0.96 },
  { sufijo: 'maj7', grados: [0, 4, 7, 11],      peso: 0.94 },
  { sufijo: 'sus4', grados: [0, 5, 7],          peso: 0.92 },
  { sufijo: 'sus2', grados: [0, 2, 7],          peso: 0.90 },
  { sufijo: 'dim',  grados: [0, 3, 6],          peso: 0.88 },
  { sufijo: 'aug',  grados: [0, 4, 8],          peso: 0.85 },
  { sufijo: '5',    grados: [0, 7],             peso: 0.80 },
];

function coseno(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 12; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Reconoce el acorde más probable de un cromagrama.
 * Devuelve varias opciones ordenadas por confianza.
 */
export function reconocerAcorde(chromaVector, { top = 3 } = {}) {
  const candidatos = [];
  for (let raiz = 0; raiz < 12; raiz++) {
    for (const plantilla of PLANTILLAS) {
      const t = new Float64Array(12);
      plantilla.grados.forEach((g, i) => { t[(raiz + g) % 12] = i === 0 ? 1.15 : 1; });
      const score = coseno(chromaVector, t) * plantilla.peso;
      candidatos.push({ nombre: NOMBRES[raiz] + plantilla.sufijo, raiz, sufijo: plantilla.sufijo, score });
    }
  }
  candidatos.sort((a, b) => b.score - a.score);
  return candidatos.slice(0, top);
}

/**
 * YIN: detección de tono monofónico. Devuelve la frecuencia en Hz o 0 si no
 * hay una nota clara. Es lo que usa el afinador y la transcripción de melodía.
 */
export function detectarTono(samples, sampleRate, { umbral = 0.12, fMin = 60, fMax = 1400 } = {}) {
  const tauMin = Math.floor(sampleRate / fMax);
  const tauMax = Math.min(Math.floor(sampleRate / fMin), Math.floor(samples.length / 2));
  if (tauMax <= tauMin) return 0;

  // Energía: si el bloque está casi en silencio, no hay nota.
  let energia = 0;
  for (let i = 0; i < samples.length; i++) energia += samples[i] * samples[i];
  if (Math.sqrt(energia / samples.length) < 0.005) return 0;

  const diff = new Float64Array(tauMax);
  for (let tau = tauMin; tau < tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < tauMax; i++) {
      const d = samples[i] - samples[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  const cmnd = new Float64Array(tauMax);
  cmnd[0] = 1;
  let acumulado = 0;
  for (let tau = tauMin; tau < tauMax; tau++) {
    acumulado += diff[tau];
    cmnd[tau] = (diff[tau] * (tau - tauMin + 1)) / (acumulado || 1);
  }

  let tauElegido = -1;
  for (let tau = tauMin; tau < tauMax; tau++) {
    if (cmnd[tau] < umbral) {
      while (tau + 1 < tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauElegido = tau;
      break;
    }
  }
  if (tauElegido === -1) {
    let mejor = tauMin;
    for (let tau = tauMin; tau < tauMax; tau++) if (cmnd[tau] < cmnd[mejor]) mejor = tau;
    if (cmnd[mejor] > 0.6) return 0;
    tauElegido = mejor;
  }

  // Interpolación parabólica para afinar el resultado entre muestras.
  const x0 = Math.max(tauMin, tauElegido - 1);
  const x2 = Math.min(tauMax - 1, tauElegido + 1);
  const s0 = cmnd[x0], s1 = cmnd[tauElegido], s2 = cmnd[x2];
  const denom = 2 * (2 * s1 - s2 - s0);
  const tauFinal = denom !== 0 ? tauElegido + (s2 - s0) / denom : tauElegido;
  return sampleRate / tauFinal;
}

/** Frecuencia -> nota, octava y desviación en cents. */
export function frecuenciaANota(freq, referencia = 440) {
  if (!freq || freq <= 0) return null;
  const midiExacto = 69 + 12 * Math.log2(freq / referencia);
  const midi = Math.round(midiExacto);
  return {
    freq,
    midi,
    nota: NOMBRES[((midi % 12) + 12) % 12],
    octava: Math.floor(midi / 12) - 1,
    cents: Math.round((midiExacto - midi) * 100),
    objetivo: referencia * Math.pow(2, (midi - 69) / 12),
  };
}

export function notaAFrecuencia(midi, referencia = 440) {
  return referencia * Math.pow(2, (midi - 69) / 12);
}

export { NOMBRES as NOMBRES_NOTA };
