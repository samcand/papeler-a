/**
 * music.js — Núcleo de teoría musical.
 * Sin dependencias: parsea acordes, transpone, calcula notas, tonalidades,
 * números de Nashville y sugerencias de cejilla (capo).
 */

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Nombres latinos (Do Re Mi) para mostrar a músicos que no leen cifrado americano. */
export const LATIN = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

const PITCH = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0,
};

/** Tonalidades que se escriben con bemoles. */
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

/** Fórmulas interválicas (semitonos desde la fundamental). */
export const FORMULAS = {
  '':       [0, 4, 7],
  'm':      [0, 3, 7],
  'dim':    [0, 3, 6],
  'aug':    [0, 4, 8],
  'sus2':   [0, 2, 7],
  'sus4':   [0, 5, 7],
  '5':      [0, 7],
  '6':      [0, 4, 7, 9],
  'm6':     [0, 3, 7, 9],
  '69':     [0, 4, 7, 9, 14],
  '7':      [0, 4, 7, 10],
  'maj7':   [0, 4, 7, 11],
  'm7':     [0, 3, 7, 10],
  'mmaj7':  [0, 3, 7, 11],
  'm7b5':   [0, 3, 6, 10],
  'dim7':   [0, 3, 6, 9],
  '7sus4':  [0, 5, 7, 10],
  '7sus2':  [0, 2, 7, 10],
  '9':      [0, 4, 7, 10, 14],
  'maj9':   [0, 4, 7, 11, 14],
  'm9':     [0, 3, 7, 10, 14],
  'add9':   [0, 4, 7, 14],
  'madd9':  [0, 3, 7, 14],
  'add11':  [0, 4, 7, 17],
  '11':     [0, 7, 10, 14, 17],
  'm11':    [0, 3, 7, 10, 14, 17],
  '13':     [0, 4, 7, 10, 14, 21],
  'maj13':  [0, 4, 7, 11, 14, 21],
  'm13':    [0, 3, 7, 10, 14, 21],
  '7b9':    [0, 4, 7, 10, 13],
  '7#9':    [0, 4, 7, 10, 15],
  '7#5':    [0, 4, 8, 10],
  '7b5':    [0, 4, 6, 10],
};

/** Alias de sufijos que la gente escribe de mil maneras -> forma canónica. */
const SUFFIX_ALIASES = {
  'maj': '', 'M': '', 'major': '', 'mayor': '',
  'min': 'm', '-': 'm', 'menor': 'm',
  'M7': 'maj7', 'Maj7': 'maj7', 'ma7': 'maj7', '^7': 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7',
  'min7': 'm7', '-7': 'm7', 'm-7': 'm7',
  'sus': 'sus4', '4': 'sus4', 'sus11': 'sus4',
  '2': 'add9', 'add2': 'add9', '(add9)': 'add9',
  'o': 'dim', '°': 'dim', 'o7': 'dim7', '°7': 'dim7',
  '+': 'aug', 'aug5': 'aug', '#5': 'aug',
  'ø': 'm7b5', 'ø7': 'm7b5', 'm7-5': 'm7b5', 'min7b5': 'm7b5',
  'M9': 'maj9', 'min9': 'm9',
  '7/4': '7sus4', '7sus': '7sus4',
};

export function normalizeSuffix(suffix = '') {
  const s = suffix.trim();
  if (Object.prototype.hasOwnProperty.call(SUFFIX_ALIASES, s)) return SUFFIX_ALIASES[s];
  if (Object.prototype.hasOwnProperty.call(FORMULAS, s)) return s;
  // "m" seguido de algo (m11, madd9...) o sufijos con paréntesis
  const cleaned = s.replace(/[()]/g, '');
  if (Object.prototype.hasOwnProperty.call(FORMULAS, cleaned)) return cleaned;
  return s;
}

const CHORD_RE = /^([A-G])([#b]?)([^/\s]*)(?:\/([A-G])([#b]?))?$/;

/**
 * Parsea un acorde en cifrado americano. Devuelve null si no es un acorde.
 * Ej: "F#m7/C#" -> { root:'F#', suffix:'m7', bass:'C#', pc:6, bassPc:1 }
 */
export function parseChord(text) {
  if (typeof text !== 'string') return null;
  const raw = text.trim();
  const m = CHORD_RE.exec(raw);
  if (!m) return null;
  const root = m[1] + (m[2] || '');
  const suffix = normalizeSuffix(m[3] || '');
  const bass = m[4] ? m[4] + (m[5] || '') : null;
  if (!Object.prototype.hasOwnProperty.call(PITCH, root)) return null;
  return {
    raw,
    root,
    suffix,
    bass,
    pc: PITCH[root],
    bassPc: bass != null ? PITCH[bass] : null,
    known: Object.prototype.hasOwnProperty.call(FORMULAS, suffix),
  };
}

export function isChordToken(text) {
  return parseChord(text) !== null;
}

export function pcName(pc, preferFlats = false) {
  const i = ((pc % 12) + 12) % 12;
  return preferFlats ? FLAT_NAMES[i] : SHARP_NAMES[i];
}

export function noteToPc(name) {
  return PITCH[name] ?? null;
}

export function keyPrefersFlats(key = 'C') {
  return FLAT_KEYS.has(String(key).trim());
}

/** Transpone un acorde N semitonos. */
export function transposeChord(text, semitones, preferFlats = false) {
  const c = parseChord(text);
  if (!c) return text;
  const root = pcName(c.pc + semitones, preferFlats);
  const bass = c.bassPc != null ? '/' + pcName(c.bassPc + semitones, preferFlats) : '';
  return root + c.suffix + bass;
}

/** Semitonos de una tonalidad a otra (usa la distancia más corta hacia arriba). */
export function intervalBetweenKeys(fromKey, toKey) {
  const a = parseChord(fromKey);
  const b = parseChord(toKey);
  if (!a || !b) return 0;
  return ((b.pc - a.pc) % 12 + 12) % 12;
}

/** Notas (nombres) que componen el acorde. */
export function chordNotes(text, preferFlats = false) {
  const c = parseChord(text);
  if (!c) return [];
  const formula = FORMULAS[c.suffix] || FORMULAS[''];
  const notes = formula.map((iv) => pcName(c.pc + iv, preferFlats));
  if (c.bass) {
    const bassName = pcName(c.bassPc, preferFlats);
    return [bassName, ...notes.filter((n) => n !== bassName)];
  }
  return notes;
}

/** Semitonos absolutos (sin nombre) del acorde, útil para dibujar el piano. */
export function chordPitches(text) {
  const c = parseChord(text);
  if (!c) return [];
  const formula = FORMULAS[c.suffix] || FORMULAS[''];
  return formula.map((iv) => c.pc + iv);
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', ''];
const MAJOR_ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_ROMAN = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

/** Info completa de una tonalidad: escala, acordes diatónicos, relativo. */
export function keyInfo(key = 'C') {
  const raw = String(key).trim();
  const minor = /m$/.test(raw) && !/maj/.test(raw);
  const tonic = minor ? raw.slice(0, -1) : raw;
  const c = parseChord(tonic);
  if (!c) return keyInfo('C');
  const flats = keyPrefersFlats(raw);
  const scaleSteps = minor ? MINOR_SCALE : MAJOR_SCALE;
  const quals = minor ? MINOR_QUALITIES : MAJOR_QUALITIES;
  const roman = minor ? MINOR_ROMAN : MAJOR_ROMAN;
  const scale = scaleSteps.map((s) => pcName(c.pc + s, flats));
  const chords = scaleSteps.map((s, i) => pcName(c.pc + s, flats) + quals[i]);
  return {
    key: raw,
    tonic: pcName(c.pc, flats),
    minor,
    preferFlats: flats,
    scale,
    chords,
    roman,
    relative: minor ? pcName(c.pc + 3, flats) : pcName(c.pc + 9, flats) + 'm',
    dominant: pcName(c.pc + 7, flats) + (minor ? '7' : ''),
    subdominant: pcName(c.pc + 5, flats) + (minor ? 'm' : ''),
  };
}

/** Nombres de tonalidad como los escribe un músico (Eb, no D#). */
export const MAJOR_KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MINOR_KEY_NAMES = ['Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'];

export function preferredKeyName(pc, minor = false) {
  const i = ((pc % 12) + 12) % 12;
  return minor ? MINOR_KEY_NAMES[i] : MAJOR_KEY_NAMES[i];
}

/** Reescribe una tonalidad con su nombre habitual (D#m -> Ebm). */
export function normalizeKeyName(key = 'C') {
  const raw = String(key).trim();
  const minor = /m$/.test(raw) && !/maj/.test(raw);
  const c = parseChord(minor ? raw.slice(0, -1) : raw);
  if (!c) return raw;
  return preferredKeyName(c.pc, minor);
}

const NASHVILLE_DEGREE = { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7' };

/** Convierte un acorde a número de Nashville dentro de una tonalidad. */
export function toNashville(text, key = 'C') {
  const c = parseChord(text);
  if (!c) return text;
  const info = keyInfo(key);
  const tonicPc = noteToPc(info.tonic);
  const rel = ((c.pc - tonicPc) % 12 + 12) % 12;
  let degree = NASHVILLE_DEGREE[rel];
  if (!degree) {
    // Grado alterado: se escribe con b delante del grado superior.
    degree = 'b' + NASHVILLE_DEGREE[(rel + 1) % 12];
  }
  const suffix = c.suffix === '' ? '' : c.suffix === 'm' ? 'm' : c.suffix;
  const bass = c.bassPc != null
    ? '/' + (NASHVILLE_DEGREE[((c.bassPc - tonicPc) % 12 + 12) % 12] || '?')
    : '';
  return degree + suffix + bass;
}

/**
 * Sugerencias de cejilla: en qué traste poner el capo para tocar la canción
 * con formas de acordes abiertos fáciles, sin cambiar el tono que suena.
 */
const EASY_SHAPE_KEYS = ['G', 'C', 'D', 'A', 'E', 'Em', 'Am', 'Dm'];

export function capoSuggestions(key = 'C', maxFret = 7) {
  const info = keyInfo(key);
  const minor = info.minor;
  const target = noteToPc(info.tonic);
  const out = [];
  for (let fret = 0; fret <= maxFret; fret++) {
    const shapePc = ((target - fret) % 12 + 12) % 12;
    const shapeName = pcName(shapePc, false) + (minor ? 'm' : '');
    if (EASY_SHAPE_KEYS.includes(shapeName)) {
      out.push({
        fret,
        shapeKey: shapeName,
        label: fret === 0 ? 'Sin capo' : `Capo ${fret}`,
        chords: keyInfo(shapeName).chords,
      });
    }
  }
  return out;
}

/** Duración en segundos de N compases a X BPM con cierto compás. */
export function barsToSeconds(bars, bpm, beatsPerBar = 4) {
  if (!bpm) return 0;
  return (bars * beatsPerBar * 60) / bpm;
}

export function secondsToBars(seconds, bpm, beatsPerBar = 4) {
  if (!bpm) return 0;
  return (seconds * bpm) / (60 * beatsPerBar);
}

export function formatTime(seconds = 0) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function parseTime(text = '') {
  const t = String(text).trim();
  if (/^\d+:\d{1,2}(\.\d+)?$/.test(t)) {
    const [m, s] = t.split(':');
    return Number(m) * 60 + Number(s);
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

/** Nombre latino (Do, Re, Mi...) de un acorde, para músicos de oído. */
export function toLatin(text) {
  const c = parseChord(text);
  if (!c) return text;
  const letter = c.root[0];
  const accidental = c.root.slice(1) === '#' ? '#' : c.root.slice(1) === 'b' ? 'b' : '';
  const bass = c.bass ? '/' + LATIN[c.bass[0]] + (c.bass.slice(1) || '') : '';
  const quality = c.suffix === 'm' ? 'm' : c.suffix;
  return LATIN[letter] + accidental + quality + bass;
}
