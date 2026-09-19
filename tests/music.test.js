import assert from 'node:assert/strict';
import {
  parseChord, transposeChord, chordNotes, keyInfo, toNashville,
  capoSuggestions, intervalBetweenKeys, barsToSeconds, toLatin, formatTime,
} from '../src/music.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('parsea acordes complejos', () => {
  const c = parseChord('F#m7/C#');
  assert.equal(c.root, 'F#');
  assert.equal(c.suffix, 'm7');
  assert.equal(c.bass, 'C#');
  assert.equal(parseChord('Hola'), null);
  assert.equal(parseChord('Bbmaj7').suffix, 'maj7');
  assert.equal(parseChord('Asus').suffix, 'sus4');
});

t('transpone respetando bemoles', () => {
  assert.equal(transposeChord('G', 2), 'A');
  assert.equal(transposeChord('Bm7', 1, true), 'Cm7');
  assert.equal(transposeChord('D/F#', -2), 'C/E');
  assert.equal(transposeChord('A', 1, true), 'Bb');
});

t('calcula notas del acorde', () => {
  assert.deepEqual(chordNotes('C'), ['C', 'E', 'G']);
  assert.deepEqual(chordNotes('Am7'), ['A', 'C', 'E', 'G']);
  assert.deepEqual(chordNotes('G/B'), ['B', 'G', 'D']);
});

t('describe la tonalidad', () => {
  const g = keyInfo('G');
  assert.deepEqual(g.chords, ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
  assert.equal(g.relative, 'Em');
  const f = keyInfo('F');
  assert.equal(f.preferFlats, true);
  assert.equal(f.chords[3], 'Bb');
});

t('convierte a Nashville', () => {
  assert.equal(toNashville('C', 'G'), '4');
  assert.equal(toNashville('Em', 'G'), '6m');
  assert.equal(toNashville('D/F#', 'G'), '5/7');
});

t('sugiere capo', () => {
  const s = capoSuggestions('Bb');
  assert.ok(s.some((x) => x.fret === 3 && x.shapeKey === 'G'));
});

t('utilidades de tiempo', () => {
  assert.equal(intervalBetweenKeys('G', 'A'), 2);
  assert.equal(barsToSeconds(4, 120, 4), 8);
  assert.equal(formatTime(125), '2:05');
  assert.equal(toLatin('Am7'), 'Lam7');
});

console.log(`\n${passed} pruebas OK`);
