/**
 * analysis.js — Análisis de audio de un archivo local (Web Audio).
 *
 * Importante y honesto: el navegador NO puede leer el audio de un video de
 * YouTube incrustado (el reproductor está aislado por seguridad). Por eso el
 * análisis automático de forma de onda trabaja con un archivo que tú subas
 * (mp3/wav/m4a, por ejemplo el audio que ya tienes de ensayo), y la
 * sincronización con YouTube se hace con marcas de tiempo sobre el reproductor.
 */

/** Envolvente de energía (RMS) en ventanas de ~50 ms. */
function energyEnvelope(buffer, hop = 0.05) {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const win = Math.floor(sr * hop);
  const out = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0;
    for (let j = 0; j < win; j++) sum += data[i + j] * data[i + j];
    out.push(Math.sqrt(sum / win));
  }
  return { values: out, hop };
}

/** Flujo espectral simplificado: subidas de energía = posibles golpes. */
function onsetCurve(env) {
  const out = [0];
  for (let i = 1; i < env.length; i++) out.push(Math.max(0, env[i] - env[i - 1]));
  return out;
}

/** Estima BPM por autocorrelación de la curva de ataques. */
function estimateBpm(onsets, hop) {
  const minBpm = 60, maxBpm = 180;
  const minLag = Math.round(60 / maxBpm / hop);
  const maxLag = Math.round(60 / minBpm / hop);
  let best = { bpm: 0, score: -1 };
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let i = 0; i + lag < onsets.length; i++) score += onsets[i] * onsets[i + lag];
    score /= (onsets.length - lag);
    if (score > best.score) best = { bpm: 60 / (lag * hop), score };
  }
  let bpm = best.bpm;
  while (bpm > 0 && bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm);
}

/**
 * Detecta cambios grandes de energía sostenidos: normalmente coinciden con
 * entradas de coro, puentes y bajadas.
 */
function detectSections(env, hop, minGap = 12) {
  const smooth = [];
  const w = 20; // ~1 s
  for (let i = 0; i < env.length; i++) {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - w); j < Math.min(env.length, i + w); j++) { sum += env[j]; n++; }
    smooth.push(sum / n);
  }
  const novelty = smooth.map((v, i) => (i === 0 ? 0 : Math.abs(v - smooth[i - 1])));
  const mean = novelty.reduce((a, b) => a + b, 0) / (novelty.length || 1);
  const threshold = mean * 3;
  const marks = [];
  let last = -Infinity;
  for (let i = 1; i < novelty.length - 1; i++) {
    if (novelty[i] > threshold && novelty[i] >= novelty[i - 1] && novelty[i] >= novelty[i + 1] && i - last > minGap) {
      marks.push(i * hop);
      last = i;
    }
  }
  return marks;
}

const LEVEL_LABELS = [
  { max: 0.18, label: 'muy suave', cue: 'Solo colchón y voz. Batería fuera o en escobillas; guitarra en arpegio.' },
  { max: 0.35, label: 'suave', cue: 'Groove mínimo, hi-hat cerrado, piano en inversiones cercanas.' },
  { max: 0.55, label: 'medio', cue: 'Banda completa a volumen medio. Guitarra rítmica constante.' },
  { max: 0.75, label: 'fuerte', cue: 'Coro abierto: crash, ride, acordes completos, voces en armonía.' },
  { max: 1.01, label: 'máximo', cue: 'Punto más alto de la canción. Todo el equipo. Cuida no acelerar.' },
];

function levelFor(norm) {
  return LEVEL_LABELS.find((l) => norm <= l.max) || LEVEL_LABELS[LEVEL_LABELS.length - 1];
}

/**
 * Analiza un archivo de audio y devuelve un mapa de la canción instante a instante.
 * @param {File|ArrayBuffer} file
 */
export async function analyzeAudioFile(file, { onProgress } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  onProgress?.('Decodificando audio…');
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  onProgress?.('Midiendo energía…');
  const { values, hop } = energyEnvelope(buffer);
  const peak = Math.max(...values) || 1;
  const normalized = values.map((v) => v / peak);
  onProgress?.('Estimando tempo…');
  const onsets = onsetCurve(normalized);
  const bpm = estimateBpm(onsets, hop);
  onProgress?.('Buscando cambios de sección…');
  const boundaries = detectSections(normalized, hop);
  const duration = buffer.duration;

  const segments = [];
  const marks = [0, ...boundaries, duration];
  for (let i = 0; i < marks.length - 1; i++) {
    const start = marks[i], end = marks[i + 1];
    if (end - start < 4) continue;
    const from = Math.floor(start / hop), to = Math.floor(end / hop);
    const slice = normalized.slice(from, to);
    const avg = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
    const level = levelFor(avg);
    segments.push({
      start, end, energy: Number(avg.toFixed(3)),
      level: level.label, cue: level.cue,
      bars: Math.round(((end - start) * bpm) / 60 / 4),
    });
  }
  ctx.close?.();
  return { duration, bpm, hop, curve: normalized, segments };
}

/** Sugiere nombres de sección a partir de la forma de la energía. */
export function guessSectionNames(segments = []) {
  const names = [];
  let verso = 0, coro = 0;
  const sorted = [...segments].sort((a, b) => b.energy - a.energy);
  const loudThreshold = sorted.length ? sorted[Math.floor(sorted.length / 3)].energy : 0.5;
  segments.forEach((seg, i) => {
    if (i === 0 && seg.energy < loudThreshold) return names.push('Intro');
    if (i === segments.length - 1 && seg.energy < loudThreshold) return names.push('Final');
    if (seg.energy >= loudThreshold) { coro++; return names.push(`Coro ${coro}`); }
    verso++;
    return names.push(`Verso ${verso}`);
  });
  return names;
}
