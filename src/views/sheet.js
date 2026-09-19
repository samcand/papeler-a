/**
 * sheet.js — Render de la hoja de acordes y el panel de detalle de un acorde.
 * Se usa en la vista de canción y en la de sincronización con YouTube.
 */

import { el, drawer, button, toast } from '../ui.js';
import { parseSong } from '../chordpro.js';
import { transposeChord, toNashville, toLatin, keyPrefersFlats, chordNotes, intervalBetweenKeys } from '../music.js';
import { chordShapes, chordDiagramSVG, chordTechnique as guitarTechnique, chordDifficulty } from '../guitar.js';
import { buscarDigitaciones, diagramaSVG, INSTRUMENTOS } from '../fretboard.js';
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
  const learned = songId ? store.practiceFor(songId).chordsLearned.includes(chord) : false;
  const diagramas = el('div', {});
  const consejos = el('ul', { class: 'tips' });
  let instrumentoId = store.state.settings.instrumentoTrastes || 'guitarra';

  const pintarTrastes = () => {
    store.setSetting('instrumentoTrastes', instrumentoId);
    // Para la guitarra estándar se usan las digitaciones de siempre; para el resto
    // de instrumentos y afinaciones se calculan sobre el mástil.
    if (instrumentoId === 'guitarra') {
      const formas = chordShapes(chord);
      diagramas.replaceChildren(el('div', { class: 'shape-row' },
        formas.slice(0, 3).map((forma) => el('figure', { class: 'shape' },
          el('div', { html: chordDiagramSVG(forma, { name: chord }) }),
          el('figcaption', {}, forma.label)))));
      consejos.replaceChildren(...guitarTechnique(chord, formas[0]).map((t) => el('li', {}, t)));
    } else {
      const formas = buscarDigitaciones(chord, instrumentoId, { max: 3 });
      diagramas.replaceChildren(formas.length
        ? el('div', { class: 'shape-row' },
            formas.map((forma, i) => el('figure', { class: 'shape' },
              el('div', { html: diagramaSVG(forma, { nombre: chord, instrumentoId }) }),
              el('figcaption', {}, i === 0 ? 'Posición más fácil' : `Alternativa ${i}`))))
        : el('p', { class: 'muted' }, 'Este acorde no cae cómodo en este instrumento: prueba otra inversión o simplifícalo.'));
      consejos.replaceChildren(...tecnicaTrastes(chord, formas[0], instrumentoId).map((t) => el('li', {}, t)));
    }
  };

  const selector = el('div', { class: 'row wrap' },
    ['guitarra', 'ukelele', 'bajo', 'cuatro'].map((id) => {
      const b = button(INSTRUMENTOS[id].nombre.split(' ')[0], () => { instrumentoId = id; pintarTrastes(); pintarSelector(); },
        { variant: id === instrumentoId ? 'ok' : 'chip' });
      b.dataset.inst = id;
      return b;
    }),
    (() => {
      const otras = Object.entries(INSTRUMENTOS).filter(([id]) => !['guitarra', 'ukelele', 'bajo', 'cuatro'].includes(id));
      const sel = el('select', { class: 'input auto', onChange: (e) => { instrumentoId = e.target.value; pintarTrastes(); pintarSelector(); } },
        el('option', { value: '' }, 'Otra afinación…'),
        otras.map(([id, inst]) => el('option', { value: id, selected: id === instrumentoId }, inst.nombre)));
      return sel;
    })());

  const pintarSelector = () => {
    selector.querySelectorAll('[data-inst]').forEach((b) => {
      b.classList.toggle('ok', b.dataset.inst === instrumentoId);
      b.classList.toggle('chip', b.dataset.inst !== instrumentoId);
    });
  };

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

  pintarTrastes();

  return drawer(`Acorde ${chord}`,
    el('div', { class: 'drawer-content' },
      el('p', { class: 'muted' }, `Notas: ${chordNotes(chord, /b/.test(chord)).join(' – ')} · Dificultad estimada: ${'★'.repeat(chordDifficulty(chord))}${'☆'.repeat(5 - chordDifficulty(chord))}`),
      el('h4', {}, 'Instrumentos de cuerda'), selector, diagramas, consejos,
      el('h4', {}, 'Piano / teclado'), pianoBox, pianoTips,
      el('div', { class: 'row' }, learnBtn)));
}

const NOMBRE_DEDO = { 1: 'índice', 2: 'medio', 3: 'anular', 4: 'meñique' };

/** Consejos de ejecución para instrumentos calculados sobre el mástil. */
function tecnicaTrastes(chord, forma, instrumentoId) {
  const inst = INSTRUMENTOS[instrumentoId];
  if (!forma) return [`En ${inst.nombre} este acorde no tiene una posición cómoda cerca de la cejuela.`];
  const tips = [];
  const puestos = forma.frets
    .map((f, i) => ({ f, i, dedo: forma.fingers?.[i] }))
    .filter((x) => x.f > 0);
  const enCejilla = forma.barre
    ? puestos.filter((x) => x.f === forma.barre.fret && x.i >= forma.barre.from && x.i <= forma.barre.to)
    : [];
  const sueltos = puestos.filter((x) => !enCejilla.includes(x));
  if (puestos.length) {
    const partes = [];
    if (enCejilla.length) {
      partes.push(`índice haciendo cejilla en el traste ${forma.barre.fret} (de la ${inst.etiquetas[enCejilla[0].i]} a la ${inst.etiquetas[enCejilla[enCejilla.length - 1].i]})`);
    }
    partes.push(...sueltos.map((p) => `${NOMBRE_DEDO[p.dedo] || 'dedo ' + p.dedo} en la ${inst.etiquetas[p.i]}, traste ${p.f}`));
    tips.push('Digitación: ' + partes.join('; ') + '.');
  } else {
    tips.push('Todas las cuerdas van al aire: solo rasguea.');
  }
  const mudas = forma.frets.map((f, i) => (f === -1 ? inst.etiquetas[i] : null)).filter(Boolean);
  if (mudas.length) tips.push(`No toques la ${mudas.join(' ni la ')}.`);
  if (forma.barre) tips.push(`La cejilla se hace con el índice recto y el pulgar detrás del mástil; si zumba, acércalo un poco más al traste antes de apretar más fuerte.`);
  if (inst.reentrante) tips.push('Este instrumento es reentrante: la cuerda más gruesa no es la más grave, así que el acorde suena "abierto" aunque la fundamental no esté abajo.');
  if (inst.grave) tips.push('En el bajo casi nunca se tocan acordes completos: lo normal es fundamental y quinta, y dejar la armonía a los demás.');
  return tips;
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
