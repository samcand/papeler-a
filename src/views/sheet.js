/**
 * sheet.js — Render de la hoja de acordes y el panel de detalle de un acorde.
 * Se usa en la vista de canción y en la de sincronización con YouTube.
 */

import { el, drawer, button, toast } from '../ui.js';
import { parseSong } from '../chordpro.js';
import { transposeChord, toNashville, toLatin, keyPrefersFlats, chordNotes, intervalBetweenKeys } from '../music.js';
import { chordShapes, chordDiagramSVG, chordTechnique as guitarTechnique, chordDifficulty } from '../guitar.js';
import { pianoSVG, chordMidi, voicings, chordTechnique as pianoTechnique } from '../piano.js';
import { store } from '../store.js';

/** Convierte un acorde a la notación elegida por el usuario. */
export function displayChord(chord, { semitones = 0, notation = 'americana', key = 'C' } = {}) {
  const flats = keyPrefersFlats(key);
  const moved = semitones ? transposeChord(chord, semitones, flats) : chord;
  if (notation === 'nashville') return toNashville(moved, key);
  if (notation === 'latina') return toLatin(moved);
  return moved;
}

/** Panel con todo lo necesario para ejecutar un acorde. */
export function openChordDrawer(chord, songId) {
  const shapes = chordShapes(chord);
  const learned = songId ? store.practiceFor(songId).chordsLearned.includes(chord) : false;

  const diagrams = el('div', { class: 'shape-row' },
    shapes.slice(0, 3).map((shape) => el('figure', { class: 'shape' },
      el('div', { html: chordDiagramSVG(shape, { name: chord }) }),
      el('figcaption', {}, shape.label))));

  const guitarTips = el('ul', { class: 'tips' },
    guitarTechnique(chord, shapes[0]).map((t) => el('li', {}, t)));

  const vs = voicings(chord);
  const pianoBox = el('div', { class: 'voicings' },
    vs.map((v) => el('div', { class: 'voicing' },
      el('div', { class: 'voicing-head' },
        el('strong', {}, v.name),
        el('span', { class: 'muted' }, v.noteNames)),
      el('div', { html: pianoSVG(v.notes, { width: 360, height: 96 }) }),
      el('p', { class: 'muted small' }, v.use))));

  const pianoTips = el('ul', { class: 'tips' }, pianoTechnique(chord).map((t) => el('li', {}, t)));

  const learnBtn = button(learned ? '✓ Ya lo domino' : 'Marcar como aprendido', (e) => {
    if (!songId) return toast('Abre el acorde desde una canción para guardar tu progreso', 'warn');
    store.toggleChordLearned(songId, chord);
    const now = store.practiceFor(songId).chordsLearned.includes(chord);
    e.target.textContent = now ? '✓ Ya lo domino' : 'Marcar como aprendido';
    toast(now ? `${chord} marcado como aprendido` : `${chord} vuelve a práctica`);
  }, { variant: learned ? 'ok' : '' });

  return drawer(`Acorde ${chord}`,
    el('div', { class: 'drawer-content' },
      el('p', { class: 'muted' }, `Notas: ${chordNotes(chord, /b/.test(chord)).join(' – ')} · Dificultad estimada: ${'★'.repeat(chordDifficulty(chord))}${'☆'.repeat(5 - chordDifficulty(chord))}`),
      el('h4', {}, 'Guitarra'), diagrams, guitarTips,
      el('h4', {}, 'Piano / teclado'), pianoBox, pianoTips,
      el('div', { class: 'row' }, learnBtn)));
}

/**
 * Dibuja la hoja de acordes.
 * @param {object} song
 * @param {object} opts { semitones, notation, onChordClick, highlightSection }
 */
export function renderSheet(song, opts = {}) {
  const { semitones = 0, notation = 'americana', highlightSection = null, compact = false } = opts;
  const key = opts.key || song.key;
  const wrap = el('div', { class: `sheet${compact ? ' compact' : ''}` });

  for (const sec of parseSong(song.body || '')) {
    const isActive = highlightSection && sec.name &&
      sec.name.toLowerCase() === String(highlightSection).toLowerCase();
    const block = el('div', { class: `sheet-section${isActive ? ' active' : ''}`, dataset: { section: sec.name || '' } });
    if (sec.name) block.append(el('h3', { class: 'sheet-section-name' }, sec.name));

    for (const line of sec.lines) {
      if (line.type === 'blank') { block.append(el('div', { class: 'sheet-blank' })); continue; }
      if (line.type === 'note') {
        block.append(el('div', { class: 'sheet-note' }, '✎ ' + line.text));
        continue;
      }
      const lineNode = el('div', { class: `sheet-line ${line.type}` });
      const inlineChords = line.type === 'bars';
      for (const seg of line.segments) {
        const segNode = el('span', { class: 'seg' });
        if (seg.chord) {
          const shown = seg.chord.split(/\s+/)
            .map((c) => displayChord(c, { semitones, notation, key })).join(' ');
          const chordNode = el('button', {
            class: `chord${inlineChords ? ' inline' : ''}`, type: 'button', title: 'Ver cómo se toca ' + shown,
            onClick: () => (opts.onChordClick || openChordDrawer)(
              transposeChord(seg.chord.split(/\s+/)[0], semitones, keyPrefersFlats(key)), song.id),
          }, shown);
          segNode.append(chordNode);
        } else if (!inlineChords) {
          segNode.append(el('span', { class: 'chord empty' }, ''));
        }
        segNode.append(el('span', { class: 'lyr' }, seg.text || ' '));
        lineNode.append(segNode);
      }
      block.append(lineNode);
    }
    wrap.append(block);
  }
  return wrap;
}

/** Semitonos entre la tonalidad original y la mostrada. */
export function semitonesFor(song, displayKey) {
  if (!displayKey || displayKey === song.key) return 0;
  return intervalBetweenKeys(song.key, displayKey);
}
