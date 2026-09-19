/**
 * transcribe.js — Saca de un archivo de audio lo que un músico necesita:
 * tempo, tonalidad, la secuencia de acordes con sus tiempos y la melodía
 * nota por nota.
 *
 * Qué esperar de verdad: el reconocimiento de acordes funciona bien con
 * grabaciones limpias de guitarra/piano/banda y acordes comunes; con mezclas
 * muy cargadas o con mucha percusión se equivoca a veces — por eso cada acorde
 * viene con su nivel de confianza y todo es editable después.
 * La melodía se detecta nota por nota (monofónica): sirve para una voz, una
 * flauta o una línea de guitarra, no para transcribir un piano tocando acordes.
 */

import { spectrum, hann, chroma, reconocerAcorde, detectarTono, frecuenciaANota } from './dsp.js';
import { energyEnvelope, onsetCurve, estimateBpm } from './analysis.js';
import { keyInfo, MAJOR_KEY_NAMES, MINOR_KEY_NAMES, parseChord } from './music.js';

const VENTANA = 8192;

function mezclaMono(buffer) {
  const n = buffer.length;
  const out = new Float32Array(n);
  const canales = Math.min(buffer.numberOfChannels, 2);
  for (let c = 0; c < canales; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += data[i] / canales;
  }
  return out;
}

/** Acordes a lo largo del tiempo, suavizados para que no parpadeen. */
export function detectarAcordes(mono, sampleRate, { hop = 0.25, minDuracion = 0.6 } = {}) {
  const win = hann(VENTANA);
  const salto = Math.floor(sampleRate * hop);
  const crudos = [];
  for (let i = 0; i + VENTANA <= mono.length; i += salto) {
    const bloque = mono.subarray(i, i + VENTANA);
    let energia = 0;
    for (let k = 0; k < bloque.length; k += 8) energia += bloque[k] * bloque[k];
    if (Math.sqrt(energia / (bloque.length / 8)) < 0.008) {
      crudos.push({ t: i / sampleRate, acorde: null, score: 0 });
      continue;
    }
    const c = chroma(spectrum(bloque, win), sampleRate, VENTANA);
    const [mejor] = reconocerAcorde(c, { top: 1 });
    crudos.push({ t: i / sampleRate, acorde: mejor.nombre, score: mejor.score });
  }

  // Suavizado por mayoría en una ventana de 5: quita los saltos de un solo cuadro.
  const suave = crudos.map((c, i) => {
    const vecinos = crudos.slice(Math.max(0, i - 2), i + 3).map((x) => x.acorde);
    const cuenta = new Map();
    for (const v of vecinos) if (v) cuenta.set(v, (cuenta.get(v) || 0) + 1);
    let ganador = c.acorde, max = 0;
    for (const [k, v] of cuenta) if (v > max) { max = v; ganador = k; }
    return { ...c, acorde: ganador };
  });

  // Unir cuadros consecutivos iguales en segmentos.
  const segmentos = [];
  for (const cuadro of suave) {
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && ultimo.acorde === cuadro.acorde) {
      ultimo.end = cuadro.t + hop;
      ultimo.scores.push(cuadro.score);
    } else {
      segmentos.push({ acorde: cuadro.acorde, start: cuadro.t, end: cuadro.t + hop, scores: [cuadro.score] });
    }
  }
  return segmentos
    .filter((s) => s.acorde && s.end - s.start >= minDuracion)
    .map((s) => ({
      acorde: s.acorde,
      start: Number(s.start.toFixed(2)),
      end: Number(s.end.toFixed(2)),
      confianza: Number((s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(2)),
    }));
}

/**
 * Tonalidad más probable: la que contiene más tiempo de acordes diatónicos.
 * Si empatan mayor y su relativa menor, gana la que aparece en el primer y
 * último acorde de la canción (que casi siempre es la tónica).
 */
export function estimarTonalidad(acordes = []) {
  if (!acordes.length) return { tonalidad: 'C', confianza: 0 };
  const candidatas = [...MAJOR_KEY_NAMES, ...MINOR_KEY_NAMES];
  const puntajes = candidatas.map((tonalidad) => {
    const diatonicos = new Set(keyInfo(tonalidad).chords.map((c) => c.replace(/dim$/, '')));
    let puntos = 0, total = 0;
    for (const a of acordes) {
      const dur = a.end - a.start;
      total += dur;
      const base = a.acorde.replace(/(7|maj7|sus4|sus2|add9|9|6)$/, '');
      if (diatonicos.has(base)) puntos += dur;
    }
    const primero = acordes[0].acorde.replace(/(7|maj7|sus4|sus2|add9|9|6)$/, '');
    const ultimo = acordes[acordes.length - 1].acorde.replace(/(7|maj7|sus4|sus2|add9|9|6)$/, '');
    const tonica = keyInfo(tonalidad).chords[0].replace(/dim$/, '');
    let bono = 0;
    if (ultimo === tonica) bono += 0.12;
    if (primero === tonica) bono += 0.08;
    return { tonalidad, score: (total ? puntos / total : 0) + bono };
  });
  puntajes.sort((a, b) => b.score - a.score);
  // El puntaje puede pasar de 1 por los bonos de primer/último acorde: se recorta.
  return {
    tonalidad: puntajes[0].tonalidad,
    confianza: Number(Math.min(1, puntajes[0].score).toFixed(2)),
    alternativas: puntajes.slice(1, 4).map((a) => ({ ...a, score: Number(Math.min(1, a.score).toFixed(2)) })),
  };
}

/** Melodía nota por nota (monofónica) con YIN. */
export function transcribirMelodia(mono, sampleRate, { hop = 0.04, minDuracion = 0.09 } = {}) {
  const ventana = 2048;
  const salto = Math.max(1, Math.floor(sampleRate * hop));
  const cuadros = [];
  for (let i = 0; i + ventana <= mono.length; i += salto) {
    const f = detectarTono(mono.subarray(i, i + ventana), sampleRate);
    const nota = f ? frecuenciaANota(f) : null;
    cuadros.push({ t: i / sampleRate, midi: nota ? nota.midi : null });
  }
  // Mediana de 3 para quitar saltos de octava sueltos.
  const limpio = cuadros.map((c, i) => {
    const v = [cuadros[i - 1]?.midi, c.midi, cuadros[i + 1]?.midi].filter((x) => x != null).sort((a, b) => a - b);
    return { t: c.t, midi: v.length ? v[Math.floor(v.length / 2)] : null };
  });

  const notas = [];
  for (const cuadro of limpio) {
    const ultima = notas[notas.length - 1];
    if (ultima && ultima.midi === cuadro.midi && cuadro.midi != null) ultima.end = cuadro.t + hop;
    else if (cuadro.midi != null) notas.push({ midi: cuadro.midi, start: cuadro.t, end: cuadro.t + hop });
  }
  return notas
    .filter((n) => n.end - n.start >= minDuracion)
    .map((n) => {
      const info = frecuenciaANota(440 * Math.pow(2, (n.midi - 69) / 12));
      return {
        midi: n.midi, nota: info.nota, octava: info.octava,
        start: Number(n.start.toFixed(2)), end: Number(n.end.toFixed(2)),
      };
    });
}

/** Análisis completo de un archivo: tempo, tonalidad y acordes. */
export async function analizarArchivo(file, { onProgress, conMelodia = false } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  onProgress?.('Leyendo el archivo…');
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  onProgress?.('Midiendo el tempo…');
  const mono = mezclaMono(buffer);
  const { values, hop } = energyEnvelope(buffer);
  const pico = Math.max(...values) || 1;
  const normal = values.map((v) => v / pico);
  const bpm = estimateBpm(onsetCurve(normal), hop);
  onProgress?.('Reconociendo acordes… (esto tarda unos segundos)');
  const acordes = detectarAcordes(mono, buffer.sampleRate);
  onProgress?.('Deduciendo la tonalidad…');
  const { tonalidad, confianza, alternativas } = estimarTonalidad(acordes);
  let melodia = [];
  if (conMelodia) {
    onProgress?.('Transcribiendo la melodía…');
    melodia = transcribirMelodia(mono, buffer.sampleRate);
  }
  ctx.close?.();
  return { duracion: buffer.duration, bpm, tonalidad, confianza, alternativas, acordes, melodia, canales: buffer.numberOfChannels };
}

/** Agrupa los acordes detectados en secciones para crear una canción en la app. */
export function acordesABody(acordes = [], { compasesPorLinea = 4 } = {}) {
  if (!acordes.length) return '';
  const lineas = [];
  for (let i = 0; i < acordes.length; i += compasesPorLinea) {
    const grupo = acordes.slice(i, i + compasesPorLinea);
    lineas.push('| ' + grupo.map((a) => `[${a.acorde}]`).join(' | ') + ' |');
  }
  return `{Detectado del audio}\n${lineas.join('\n')}\n`;
}

/** Piano roll de la melodía transcrita. */
export function pianoRollSVG(notas = [], { width = 760, height = 220, duracion = null } = {}) {
  if (!notas.length) return '<p class="muted">No se detectó melodía clara.</p>';
  const dur = duracion || Math.max(...notas.map((n) => n.end));
  const minMidi = Math.min(...notas.map((n) => n.midi)) - 2;
  const maxMidi = Math.max(...notas.map((n) => n.midi)) + 2;
  const rango = Math.max(6, maxMidi - minMidi);
  const dy = (height - 20) / rango;
  const p = [`<svg viewBox="0 0 ${width} ${height}" class="pianoroll" role="img" aria-label="Melodía transcrita">`];
  for (let m = minMidi; m <= maxMidi; m++) {
    const y = height - 10 - (m - minMidi) * dy;
    const negra = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
    p.push(`<rect x="0" y="${y - dy}" width="${width}" height="${dy}" class="roll-row${negra ? ' black' : ''}"/>`);
  }
  for (const n of notas) {
    const x = (n.start / dur) * width;
    const w = Math.max(2, ((n.end - n.start) / dur) * width);
    const y = height - 10 - (n.midi - minMidi) * dy;
    p.push(`<rect x="${x}" y="${y - dy + 1}" width="${w}" height="${dy - 2}" rx="2" class="roll-note"><title>${n.nota}${n.octava} · ${n.start}s</title></rect>`);
  }
  p.push('</svg>');
  return p.join('');
}
