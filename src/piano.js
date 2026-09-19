/**
 * piano.js — Teclado, voicings y técnica de piano/teclado para adoración.
 * Las notas se manejan como números MIDI (C4 = 60).
 */

import { parseChord, FORMULAS, pcName, chordNotes } from './music.js';

export const MIDDLE_C = 60;
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 };

/** Notas MIDI del acorde en posición fundamental, a partir de una octava. */
export function chordMidi(chordName, octave = 4) {
  const c = parseChord(chordName);
  if (!c) return [];
  const formula = FORMULAS[c.suffix] || FORMULAS[''];
  const base = 12 * (octave + 1) + c.pc;
  const notes = formula.map((iv) => base + iv);
  if (c.bassPc != null) {
    let bass = 12 * octave + c.bassPc;
    while (bass >= notes[0]) bass -= 12;
    return [bass, ...notes];
  }
  return notes;
}

/** Inversión N (0 = fundamental). */
export function invert(notes, n = 0) {
  const out = notes.slice().sort((a, b) => a - b);
  for (let i = 0; i < n; i++) out.push(out.shift() + 12);
  return out;
}

/**
 * Elige la inversión más cercana a lo que la mano ya estaba tocando.
 * Esto es conducción de voces: menos saltos, sonido más pegado.
 */
export function nearestVoicing(chordName, previousNotes = [], octave = 4) {
  const base = chordMidi(chordName, octave);
  if (!base.length) return [];
  if (!previousNotes.length) return base;
  const prevAvg = previousNotes.reduce((a, b) => a + b, 0) / previousNotes.length;
  let best = base;
  let bestScore = Infinity;
  for (let inv = 0; inv < base.length; inv++) {
    for (const shift of [-12, 0, 12]) {
      const cand = invert(base, inv).map((n) => n + shift);
      const avg = cand.reduce((a, b) => a + b, 0) / cand.length;
      const score = Math.abs(avg - prevAvg);
      if (score < bestScore) { bestScore = score; best = cand; }
    }
  }
  return best;
}

/** Catálogo de voicings con explicación de para qué sirve cada uno. */
export function voicings(chordName) {
  const c = parseChord(chordName);
  if (!c) return [];
  const root = chordMidi(chordName, 4);
  const flats = /b/.test(chordName);
  const name = (notes) => notes.map((n) => pcName(n, flats)).join(' ');
  const fifth = c.pc + 7;
  const ninth = c.pc + 14;
  const list = [
    {
      id: 'fundamental',
      name: 'Posición fundamental (MD)',
      notes: root,
      hand: 'derecha',
      use: 'Para aprender el acorde y para tocar melodía sencilla encima. Dedos 1-3-5.',
    },
    {
      id: 'inv1',
      name: 'Primera inversión',
      notes: invert(root, 1),
      hand: 'derecha',
      use: 'Evita saltos: si vienes de un acorde cercano, usa la inversión que mueva menos los dedos.',
    },
    {
      id: 'inv2',
      name: 'Segunda inversión',
      notes: invert(root, 2),
      hand: 'derecha',
      use: 'Suena estable y "flotante"; muy útil bajo la voz del cantante.',
    },
    {
      id: 'octava-quinta',
      name: 'Mano izquierda: octava + quinta',
      notes: [12 * 3 + c.pc, 12 * 3 + c.pc + 7, 12 * 4 + c.pc],
      hand: 'izquierda',
      use: 'El cimiento. Si hay bajista, toca solo la octava o incluso solo la fundamental: no invadas su rango.',
    },
    {
      id: 'worship-pad',
      name: 'Voicing de adoración (1-5-9)',
      notes: [12 * 4 + c.pc, 12 * 4 + fifth, 12 * 4 + ninth],
      hand: 'derecha',
      use: 'Abierto y sin 3ª: suena grande, no choca con las guitarras y funciona igual si la canción es mayor o menor.',
    },
    {
      id: 'shell',
      name: 'Shell (1-3-7)',
      notes: FORMULAS[c.suffix]?.length >= 4
        ? [12 * 4 + c.pc, 12 * 4 + c.pc + FORMULAS[c.suffix][1], 12 * 4 + c.pc + FORMULAS[c.suffix][3]]
        : [12 * 4 + c.pc, 12 * 4 + c.pc + (FORMULAS[c.suffix]?.[1] ?? 4), 12 * 4 + c.pc + 10],
      hand: 'derecha',
      use: 'Solo lo esencial del color. Ideal cuando la banda está llena y el piano solo debe pintar.',
    },
  ];
  return list.map((v) => ({ ...v, noteNames: name(v.notes) }));
}

/** Dibuja un teclado de 2 octavas resaltando las notas indicadas. */
export function pianoSVG(midiNotes = [], options = {}) {
  const { octaves = 2, startMidi = 48, width = 420, height = 118, labels = true } = options;
  const whiteCount = 7 * octaves;
  const w = width / whiteCount;
  const bh = height * 0.62;
  const bw = w * 0.62;
  const set = new Set(midiNotes);
  const rootPc = midiNotes.length ? ((Math.min(...midiNotes) % 12) + 12) % 12 : null;
  const parts = [`<svg viewBox="0 0 ${width} ${height}" class="piano" role="img" aria-label="Teclado">`];

  // Teclas blancas
  for (let i = 0; i < whiteCount; i++) {
    const oct = Math.floor(i / 7);
    const midi = startMidi + oct * 12 + WHITE_OFFSETS[i % 7];
    const active = set.has(midi);
    const isRoot = active && ((midi % 12) + 12) % 12 === rootPc;
    parts.push(`<rect x="${i * w}" y="0" width="${w - 1}" height="${height}" rx="3" class="key white${active ? ' active' : ''}${isRoot ? ' root' : ''}"/>`);
    if (labels && active) {
      parts.push(`<text x="${i * w + w / 2}" y="${height - 8}" text-anchor="middle" class="key-label">${pcName(midi)}</text>`);
    }
  }
  // Teclas negras
  for (let i = 0; i < whiteCount; i++) {
    const step = WHITE_OFFSETS[i % 7];
    if (!(step in BLACK_AFTER)) continue;
    const oct = Math.floor(i / 7);
    const midi = startMidi + oct * 12 + BLACK_AFTER[step];
    const active = set.has(midi);
    const isRoot = active && ((midi % 12) + 12) % 12 === rootPc;
    const x = (i + 1) * w - bw / 2;
    parts.push(`<rect x="${x}" y="0" width="${bw}" height="${bh}" rx="2" class="key black${active ? ' active' : ''}${isRoot ? ' root' : ''}"/>`);
    if (labels && active) {
      parts.push(`<text x="${x + bw / 2}" y="${bh - 6}" text-anchor="middle" class="key-label dark">${pcName(midi)}</text>`);
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

const FINGERS_3 = ['1', '3', '5'];
const FINGERS_4 = ['1', '2', '3', '5'];

/** Cómo ejecutar el acorde en el teclado, paso a paso. */
export function chordTechnique(chordName) {
  const c = parseChord(chordName);
  if (!c) return [];
  const flats = /b/.test(chordName);
  const notes = chordNotes(chordName, flats);
  const fingers = notes.length >= 4 ? FINGERS_4 : FINGERS_3;
  const tips = [];
  tips.push(`Mano derecha: ${notes.map((n, i) => `${n} con el dedo ${fingers[i] || 5}`).join(', ')}.`);
  tips.push(`Mano izquierda: ${c.bass || c.root} grave, sola o en octava. Si hay bajista, toca una sola nota y déjale el registro grave.`);
  if (c.suffix === 'm') tips.push('Acorde menor: la 3ª baja medio tono respecto al mayor. Es el "color triste"; tócalo un poco más suave.');
  if (c.suffix.includes('sus')) tips.push('Sin 3ª: suena suspendido. Es perfecto para sostener bajo una oración y resolver cuando entra la congregación.');
  if (c.suffix.includes('7')) tips.push('La 7ª pide movimiento: normalmente lleva al siguiente acorde. No la dejes sonando sola al final de la canción.');
  if (c.bass) tips.push(`Bajo en ${c.bass}: la mano izquierda toca ${c.bass}, no ${c.root}. Esto crea una línea de bajo que camina por grados.`);
  tips.push('Regla de oro: mueve lo menos posible entre acordes. Si dos acordes comparten notas, déjalas quietas y mueve solo lo que cambia.');
  return tips;
}

/** Ejercicios de teclado por nivel, ligados a la tonalidad de la canción. */
export function practiceDrills(keyChords = []) {
  const [I, ii, , IV, V, vi] = keyChords;
  return [
    {
      level: 1,
      name: 'Los cuatro acordes del culto',
      detail: `Toca ${[I, V, vi, IV].filter(Boolean).join(' – ')} en redondas, 4 tiempos cada uno, sin mirar las manos.`,
    },
    {
      level: 2,
      name: 'Inversiones cercanas',
      detail: 'Repite la misma vuelta, pero usando la inversión que mueva menos los dedos. La mano casi no debe viajar.',
    },
    {
      level: 3,
      name: 'Manos separadas',
      detail: 'Izquierda solo fundamentales en blancas; derecha el acorde en negras. Después invierte los roles.',
    },
    {
      level: 4,
      name: 'Colchón 1-5-9',
      detail: `Sostén ${I || 'el I'} en 1-5-9 durante 8 compases mientras alguien habla u ora: aprende a no llenar.`,
    },
    {
      level: 5,
      name: `Cadencia ${ii || 'ii'} – ${V || 'V'} – ${I || 'I'}`,
      detail: 'Úsala para cerrar la canción o para volver al coro. Practícala en las 12 tonalidades, una por semana.',
    },
  ];
}
