/**
 * chordpro.js — Formato de letra con acordes.
 *
 * Reglas del formato:
 *   {Coro}            -> encabezado de sección (también sirve "#Coro")
 *   [G]Santo, [D]sa.. -> acorde inline, suena justo en esa sílaba
 *   | [G] | [D] |     -> línea instrumental por compases
 *   (x2)              -> texto libre, se muestra tal cual
 *   // comentario     -> nota solo para el músico
 */

import { parseChord, transposeChord } from './music.js';

const SECTION_RE = /^\s*(?:\{([^}]+)\}|#\s*(.+?))\s*$/;

/** Divide una línea en segmentos {chord, text} conservando el orden. */
export function splitLine(line) {
  const segments = [];
  let buffer = '';
  let pendingChord = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '[') {
      const close = line.indexOf(']', i);
      if (close === -1) { buffer += ch; continue; }
      const token = line.slice(i + 1, close);
      if (buffer !== '' || pendingChord !== null) {
        segments.push({ chord: pendingChord, text: buffer });
        buffer = '';
      }
      pendingChord = token;
      i = close;
    } else {
      buffer += ch;
    }
  }
  if (buffer !== '' || pendingChord !== null) {
    segments.push({ chord: pendingChord, text: buffer });
  }
  return segments;
}

/** Analiza el cuerpo completo de una canción y devuelve secciones. */
export function parseSong(text = '') {
  const sections = [];
  let current = { name: '', lines: [] };
  const push = () => {
    if (current.name || current.lines.length) sections.push(current);
  };
  for (const rawLine of String(text).replace(/\r/g, '').split('\n')) {
    const line = rawLine.trimEnd();
    const header = SECTION_RE.exec(line);
    if (header) {
      push();
      current = { name: (header[1] || header[2] || '').trim(), lines: [] };
      continue;
    }
    if (/^\s*\/\//.test(line)) {
      current.lines.push({ type: 'note', text: line.replace(/^\s*\/\/\s?/, '') });
      continue;
    }
    if (line.trim() === '') {
      current.lines.push({ type: 'blank' });
      continue;
    }
    const segments = splitLine(line);
    const hasChords = segments.some((s) => s.chord != null);
    const isBars = /^\s*\|/.test(line);
    current.lines.push({
      type: isBars ? 'bars' : hasChords ? 'lyric' : 'text',
      segments,
      raw: line,
    });
  }
  push();
  return sections.length ? sections : [{ name: '', lines: [] }];
}

/** Todos los acordes usados, únicos y en orden de aparición. */
export function chordsUsed(text = '') {
  const seen = new Set();
  const out = [];
  for (const section of parseSong(text)) {
    for (const line of section.lines) {
      for (const seg of line.segments || []) {
        if (seg.chord && parseChord(seg.chord) && !seen.has(seg.chord)) {
          seen.add(seg.chord);
          out.push(seg.chord);
        }
      }
    }
  }
  return out;
}

/** Progresión por sección, útil para la vista de instrumentos y la línea de tiempo. */
export function sectionProgressions(text = '') {
  return parseSong(text).map((section) => {
    const chords = [];
    for (const line of section.lines) {
      for (const seg of line.segments || []) {
        if (seg.chord && parseChord(seg.chord)) chords.push(seg.chord);
      }
    }
    return { name: section.name || 'Sección', chords };
  }).filter((s) => s.chords.length || s.name);
}

/** Reescribe el texto fuente transponiendo todos los acordes. */
export function transposeSource(text = '', semitones = 0, preferFlats = false) {
  if (!semitones) return text;
  return String(text).replace(/\[([^\]]+)\]/g, (match, token) => {
    // Puede haber varios acordes dentro de un compás: [G D]
    const parts = token.split(/\s+/);
    const moved = parts.map((p) => (parseChord(p) ? transposeChord(p, semitones, preferFlats) : p));
    return '[' + moved.join(' ') + ']';
  });
}

/** Cantidad aproximada de compases de una sección (líneas "| ... |"). */
export function countBars(section) {
  let bars = 0;
  for (const line of section.lines || []) {
    if (line.type === 'bars' && line.raw) {
      bars += (line.raw.match(/\|/g) || []).length - 1;
    }
  }
  return Math.max(0, bars);
}

/** Texto plano (solo letra, sin acordes) para proyectar o imprimir. */
export function lyricsOnly(text = '') {
  return parseSong(text).map((section) => {
    const head = section.name ? section.name.toUpperCase() + '\n' : '';
    const body = section.lines.map((line) => {
      if (line.type === 'blank') return '';
      if (line.type === 'note') return '';
      if (line.type === 'bars') return '';
      return (line.segments || []).map((s) => s.text).join('').trim();
    }).filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
    return head + body;
  }).join('\n\n').trim();
}
