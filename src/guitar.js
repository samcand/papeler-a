/**
 * guitar.js — Diagramas de acordes, digitaciones y técnica de ejecución.
 * Cuerdas de la 6ª a la 1ª: E A D G B e
 */

import { parseChord, FORMULAS, pcName, chordNotes } from './music.js';

export const STRING_PC = [4, 9, 2, 7, 11, 4];        // E A D G B e
export const STRING_NAMES = ['6ª (Mi)', '5ª (La)', '4ª (Re)', '3ª (Sol)', '2ª (Si)', '1ª (mi)'];

/** Acordes abiertos: digitaciones cómodas que ganan a cualquier cálculo. */
export const OPEN_CHORDS = {
  'C':      { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'C7':     { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  'Cmaj7':  { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  'Cadd9':  { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },
  'Csus4':  { frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
  'C/E':    { frets: [0, 3, 2, 0, 1, 0],  fingers: [0, 3, 2, 0, 1, 0] },
  'C/G':    { frets: [3, 3, 2, 0, 1, 0],  fingers: [3, 4, 2, 0, 1, 0] },
  'D':      { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'Dm':     { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  'D7':     { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  'Dm7':    { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  'Dmaj7':  { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 1, 1] },
  'Dsus2':  { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  'Dsus4':  { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  'D/F#':   { frets: [2, -1, 0, 2, 3, 2],  fingers: [1, 0, 0, 2, 4, 3] },
  'E':      { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  'Em':     { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  'E7':     { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  'Em7':    { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0] },
  'Esus4':  { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0] },
  'F':      { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  'Fmaj7':  { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  'G':      { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  'G7':     { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  'Gmaj7':  { frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, 0, 0, 0, 1] },
  'Gsus4':  { frets: [3, -1, 0, 0, 1, 3], fingers: [3, 0, 0, 0, 1, 4] },
  'Gadd9':  { frets: [3, -1, 0, 2, 0, 3], fingers: [2, 0, 0, 1, 0, 3] },
  'G/B':    { frets: [-1, 2, 0, 0, 0, 3], fingers: [0, 1, 0, 0, 0, 3] },
  'A':      { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'Am':     { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  'A7':     { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  'Am7':    { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  'Amaj7':  { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 3, 1, 2, 0] },
  'Asus2':  { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  'Asus4':  { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'Am/G':   { frets: [3, 0, 2, 2, 1, 0],  fingers: [3, 0, 2, 4, 1, 0] },
  'B7':     { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  'Bm7':    { frets: [-1, 2, 0, 2, 0, 2], fingers: [0, 2, 0, 3, 0, 4] },
  'E7sus4': { frets: [0, 2, 0, 2, 0, 0], fingers: [0, 2, 0, 3, 0, 0] },
  'Asus2/E':{ frets: [0, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  'A7sus4': { frets: [-1, 0, 2, 0, 3, 0], fingers: [0, 0, 2, 0, 4, 0] },
  'Em9':    { frets: [0, 2, 0, 0, 0, 2], fingers: [0, 2, 0, 0, 0, 3] },
  'Dadd9':  { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  'Aadd9':  { frets: [-1, 0, 2, 4, 2, 0], fingers: [0, 0, 1, 4, 2, 0] },
  'Bm':     { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 } },
};

/** Formas movibles: offsets respecto al traste de la cejilla (-1 = cuerda muda). */
const MOVABLE = {
  6: { // fundamental en la 6ª cuerda (forma de Mi)
    '':      { offsets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
    'm':     { offsets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
    '7':     { offsets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
    'm7':    { offsets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
    'maj7':  { offsets: [0, 2, 1, 1, 0, 0], fingers: [1, 3, 2, 2, 1, 1] },
    'sus4':  { offsets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
    '7sus4': { offsets: [0, 2, 0, 2, 0, 0], fingers: [1, 3, 1, 4, 1, 1] },
    '9':     { offsets: [0, 2, 0, 1, 0, 2], fingers: [1, 3, 1, 2, 1, 4] },
    '5':     { offsets: [0, 2, 2, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
    'm9':    { offsets: [0, 2, 0, 0, 0, 2], fingers: [1, 3, 1, 1, 1, 4] },
  },
  5: { // fundamental en la 5ª cuerda (forma de La)
    '':      { offsets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 3, 3, 3, 1] },
    'm':     { offsets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
    '7':     { offsets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
    'm7':    { offsets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
    'maj7':  { offsets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 4, 2, 3, 1] },
    'sus4':  { offsets: [-1, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1] },
    'sus2':  { offsets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1] },
    '7sus4': { offsets: [-1, 0, 2, 0, 3, 0], fingers: [0, 1, 3, 1, 4, 1] },
    '5':     { offsets: [-1, 0, 2, 2, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
    'm7b5':  { offsets: [-1, 0, 1, 0, 1, -1], fingers: [0, 2, 3, 1, 4, 0] },
    'dim7':  { offsets: [-1, 0, 1, -1, 1, -1], fingers: [0, 2, 3, 0, 4, 0] },
  },
  4: { // fundamental en la 4ª cuerda (forma de Re)
    '':      { offsets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 1, 2, 4, 3] },
    'm':     { offsets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 1, 3, 4, 2] },
    '7':     { offsets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4] },
    'm7':    { offsets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 1, 3, 2, 2] },
    'maj7':  { offsets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 1, 2, 3, 4] },
    'sus4':  { offsets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 1, 2, 3, 4] },
    'sus2':  { offsets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  },
};

const ROOT_STRING_PC = { 6: 4, 5: 9, 4: 2 };

function movableShape(rootPc, suffix, rootString) {
  const tpl = MOVABLE[rootString]?.[suffix];
  if (!tpl) return null;
  let barreFret = ((rootPc - ROOT_STRING_PC[rootString]) % 12 + 12) % 12;
  if (barreFret === 0) barreFret = 12;
  const frets = tpl.offsets.map((o) => (o < 0 ? -1 : o + barreFret));
  const barreStrings = tpl.offsets
    .map((o, i) => (o === 0 ? i : -1))
    .filter((i) => i >= 0);
  const isBarre = barreStrings.length > 1;
  return {
    frets,
    fingers: tpl.fingers.slice(),
    barre: isBarre
      ? { fret: barreFret, from: Math.min(...barreStrings), to: Math.max(...barreStrings) }
      : null,
    rootString,
    label: `Forma de ${rootString === 6 ? 'Mi' : rootString === 5 ? 'La' : 'Re'} en traste ${barreFret}`,
    type: isBarre ? 'cejilla' : 'movible',
  };
}

/**
 * Voicing calculado cuando no hay plantilla: busca notas del acorde cerca
 * de la fundamental en las cuerdas centrales. No es una digitación de libro,
 * pero suena y es alcanzable.
 */
function computedShape(chord) {
  const formula = FORMULAS[chord.suffix] || FORMULAS[''];
  const tones = new Set(formula.map((iv) => ((chord.pc + iv) % 12 + 12) % 12));
  const rootString = ((chord.pc - 4) % 12 + 12) % 12 <= 7 ? 0 : 1;
  let rootFret = ((chord.pc - STRING_PC[rootString]) % 12 + 12) % 12;
  if (rootFret === 0 && rootString === 0) rootFret = 0;
  const frets = [-1, -1, -1, -1, -1, -1];
  frets[rootString] = rootFret;
  for (let s = rootString + 1; s < 6; s++) {
    let best = -1;
    for (let f = Math.max(0, rootFret - 1); f <= rootFret + 3; f++) {
      if (tones.has(((STRING_PC[s] + f) % 12 + 12) % 12)) { best = f; break; }
    }
    frets[s] = best;
  }
  return {
    frets,
    fingers: frets.map((f) => (f > 0 ? 1 : 0)),
    barre: null,
    rootString: rootString === 0 ? 6 : 5,
    label: 'Voicing calculado',
    type: 'calculado',
  };
}

/** Devuelve posibles digitaciones, la más fácil primero. */
export function chordShapes(chordName) {
  const chord = parseChord(chordName);
  if (!chord) return [];
  const shapes = [];
  const open = OPEN_CHORDS[chordName] || OPEN_CHORDS[chord.root + chord.suffix];
  if (open) {
    shapes.push({
      frets: open.frets.slice(),
      fingers: (open.fingers || open.frets.map((f) => (f > 0 ? 1 : 0))).slice(),
      barre: open.barre || null,
      label: open.barre ? 'Cejilla (posición base)' : 'Posición abierta',
      type: open.barre ? 'cejilla' : 'abierto',
    });
  }
  const movable = [];
  for (const rootString of [6, 5, 4]) {
    const s = movableShape(chord.pc, chord.suffix, rootString);
    if (s && !shapes.some((x) => x.frets.join() === s.frets.join())) movable.push(s);
  }
  // Primero la posición más cercana a la cejuela: es la que casi siempre se toca.
  movable.sort((a, b) => {
    const fa = Math.min(...a.frets.filter((f) => f > 0));
    const fb = Math.min(...b.frets.filter((f) => f > 0));
    if (fa !== fb) return fa - fb;
    return a.frets.filter((f) => f === -1).length - b.frets.filter((f) => f === -1).length;
  });
  shapes.push(...movable);
  if (!shapes.length) shapes.push(computedShape(chord));
  return shapes;
}

/** SVG del diagrama de acorde. Devuelve una cadena lista para innerHTML. */
export function chordDiagramSVG(shape, options = {}) {
  const { name = '', width = 132, height = 168 } = options;
  const played = shape.frets.filter((f) => f > 0);
  const minFret = played.length ? Math.min(...played) : 1;
  const maxFret = played.length ? Math.max(...played) : 1;
  const startFret = maxFret <= 4 ? 1 : Math.max(1, minFret);
  const FRETS = 5;
  const left = 18, top = 34, right = width - 14;
  const gridW = right - left;
  const gridH = height - top - 24;
  const dx = gridW / 5;
  const dy = gridH / FRETS;
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${width} ${height}" class="chord-diagram" role="img" aria-label="Diagrama de ${name}">`);
  if (name) parts.push(`<text x="${width / 2}" y="14" text-anchor="middle" class="cd-name">${name}</text>`);

  // Cejuela o número de traste
  if (startFret === 1) {
    parts.push(`<rect x="${left - 2}" y="${top - 5}" width="${gridW + 4}" height="5" class="cd-nut"/>`);
  } else {
    parts.push(`<text x="${left - 8}" y="${top + dy * 0.7}" text-anchor="end" class="cd-fretnum">${startFret}</text>`);
  }
  for (let i = 0; i <= FRETS; i++) {
    parts.push(`<line x1="${left}" y1="${top + dy * i}" x2="${right}" y2="${top + dy * i}" class="cd-line"/>`);
  }
  for (let s = 0; s < 6; s++) {
    parts.push(`<line x1="${left + dx * s}" y1="${top}" x2="${left + dx * s}" y2="${top + gridH}" class="cd-line"/>`);
  }

  // Cejilla
  if (shape.barre && shape.barre.fret >= startFret && shape.barre.fret < startFret + FRETS) {
    const row = shape.barre.fret - startFret;
    const x1 = left + dx * shape.barre.from;
    const x2 = left + dx * shape.barre.to;
    parts.push(`<rect x="${x1 - 6}" y="${top + dy * row + dy / 2 - 6}" width="${x2 - x1 + 12}" height="12" rx="6" class="cd-barre"/>`);
  }

  shape.frets.forEach((fret, s) => {
    const x = left + dx * s;
    if (fret === -1) {
      parts.push(`<text x="${x}" y="${top - 8}" text-anchor="middle" class="cd-mark">✕</text>`);
    } else if (fret === 0) {
      parts.push(`<circle cx="${x}" cy="${top - 12}" r="4.5" class="cd-open"/>`);
    } else if (fret >= startFret && fret < startFret + FRETS) {
      const row = fret - startFret;
      const cy = top + dy * row + dy / 2;
      const finger = shape.fingers?.[s];
      const inBarre = shape.barre && shape.barre.fret === fret
        && s >= shape.barre.from && s <= shape.barre.to;
      if (!inBarre) parts.push(`<circle cx="${x}" cy="${cy}" r="7.5" class="cd-dot"/>`);
      if (finger) parts.push(`<text x="${x}" y="${cy + 3.5}" text-anchor="middle" class="cd-finger">${finger}</text>`);
    }
  });

  // Nombres de las notas bajo el diagrama
  const flats = /b/.test(name);
  shape.frets.forEach((fret, s) => {
    if (fret < 0) return;
    const note = pcName(STRING_PC[s] + fret, flats);
    parts.push(`<text x="${left + dx * s}" y="${height - 6}" text-anchor="middle" class="cd-note">${note}</text>`);
  });
  parts.push('</svg>');
  return parts.join('');
}

const FINGER_NAMES = { 1: 'índice', 2: 'medio', 3: 'anular', 4: 'meñique' };

/** Instrucciones concretas de cómo ejecutar el acorde. */
export function chordTechnique(chordName, shape) {
  const chord = parseChord(chordName);
  if (!chord || !shape) return [];
  const tips = [];
  const notes = chordNotes(chordName, /b/.test(chordName));
  tips.push(`Notas: ${notes.join(' – ')}. La fundamental es ${chord.root}; es la nota que debe sonar más grave.`);

  const placements = shape.frets
    .map((f, s) => ({ f, s, finger: shape.fingers?.[s] }))
    .filter((x) => x.f > 0 && x.finger);
  if (placements.length) {
    const list = placements.map((p) =>
      `${FINGER_NAMES[p.finger] || 'dedo ' + p.finger} en la ${STRING_NAMES[p.s]}, traste ${p.f}`);
    tips.push('Digitación: ' + list.join('; ') + '.');
  }

  const muted = shape.frets.map((f, s) => (f === -1 ? STRING_NAMES[s] : null)).filter(Boolean);
  if (muted.length) tips.push(`No toques (o apaga con el pulgar/yema) la ${muted.join(' y la ')}.`);

  if (shape.barre) {
    tips.push(`Cejilla con el índice en el traste ${shape.barre.fret}: ponlo recto y ligeramente girado hacia el lado del hueso, pegado al traste, y empuja con el pulgar detrás del mástil (no apretando de más: si suena limpio, sobra fuerza).`);
    tips.push('Si zumba una cuerda, mueve el índice 1-2 mm hacia el traste antes de apretar más fuerte.');
  } else {
    tips.push('Arquea los dedos para pisar con la punta: así las cuerdas vecinas quedan libres y suenan abiertas.');
  }

  if (chord.suffix.startsWith('sus')) {
    tips.push('Un acorde sus crea tensión: resuélvelo al acorde mayor o menor del mismo nombre antes de cambiar de armonía.');
  }
  if (chord.suffix === 'm7' || chord.suffix === 'maj7') {
    tips.push('Con séptima, rasguea más suave y deja sonar: es un color, no un golpe.');
  }
  if (chord.bass) {
    tips.push(`Es un acorde con bajo invertido: asegúrate de que la nota más grave sea ${chord.bass}. En la congregación, esto hace que el cambio suene "caminando" en vez de saltando.`);
  }
  return tips;
}

/** Patrones de rasgueo/arpegio según el aire de la canción. */
export const STRUM_PATTERNS = [
  {
    id: 'balada-4-4',
    name: 'Balada 4/4 (la más usada en adoración)',
    feel: 'balada',
    pattern: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'],
    counts: ['1', '&', '2', '&', '3', '&', '4', '&'],
    tip: 'La mano derecha no para nunca: baja en los tiempos, sube entre ellos, y simplemente no toques las cuerdas donde hay silencio.',
  },
  {
    id: 'arpegio-4-4',
    name: 'Arpegio suave 4/4 (versos e intimidad)',
    feel: 'suave',
    pattern: ['p', 'i', 'm', 'a', 'm', 'i', 'm', 'a'],
    counts: ['1', '&', '2', '&', '3', '&', '4', '&'],
    tip: 'Pulgar (p) al bajo del acorde; índice-medio-anular a 3ª-2ª-1ª. Ideal para el primer verso y para cuando alguien ora.',
  },
  {
    id: 'rock-worship',
    name: 'Worship moderno / coro fuerte',
    feel: 'rock',
    pattern: ['D', 'D', 'U', '-', 'U', 'D', 'U', '-'],
    counts: ['1', '&', '2', '&', '3', '&', '4', '&'],
    tip: 'Acentúa el 2 y el 4 para que enganche con la caja de la batería.',
  },
  {
    id: 'seis-octavos',
    name: '6/8 (himnos y baladas de vaivén)',
    feel: '6/8',
    pattern: ['D', '-', 'U', 'D', '-', 'U'],
    counts: ['1', '2', '3', '4', '5', '6'],
    tip: 'Piensa en "UNO-dos-tres, DOS-dos-tres". Marca el 1 y el 4 con fuerza y deja lo demás ligero.',
  },
  {
    id: 'tres-cuartos',
    name: '3/4 (vals, himnos clásicos)',
    feel: '3/4',
    pattern: ['D', 'U', 'U', 'D', 'U', 'U'],
    counts: ['1', '&', '2', '&', '3', '&'],
    tip: 'Bajo en el 1, rasgueos ligeros en 2 y 3. Nunca aceleres al final de la frase.',
  },
  {
    id: 'percusivo',
    name: 'Percusivo (sin batería)',
    feel: 'percusivo',
    pattern: ['D', 'x', 'D', 'U', 'x', 'U', 'D', 'x'],
    counts: ['1', '&', '2', '&', '3', '&', '4', '&'],
    tip: 'La "x" es golpe apagado con el canto de la mano en los tiempos 2 y 4: reemplaza a la caja cuando el equipo es pequeño.',
  },
  {
    id: 'pad',
    name: 'Colchón / pad con guitarra',
    feel: 'ambiental',
    pattern: ['D', '-', '-', '-', '-', '-', '-', '-'],
    counts: ['1', '&', '2', '&', '3', '&', '4', '&'],
    tip: 'Un solo rasgueo muy suave por compás, con reverb larga. Sirve para sostener el momento de oración sin estorbar a la voz.',
  },
];

export function strumFor(feel = 'balada') {
  return STRUM_PATTERNS.find((p) => p.feel === feel) || STRUM_PATTERNS[0];
}

/** Dificultad estimada, para ordenar el plan de práctica. */
export function chordDifficulty(chordName) {
  const shapes = chordShapes(chordName);
  if (!shapes.length) return 5;
  const s = shapes[0];
  if (s.type === 'abierto') return s.frets.filter((f) => f > 0).length <= 2 ? 1 : 2;
  if (s.type === 'cejilla') return 4;
  if (s.type === 'calculado') return 5;
  return 3;
}
