/** song.js — Vista de canción: letra con acordes, transposición y edición. */

import { el, button, input, select, textarea, toast, copyText, download, chip, section, field, drawer } from '../ui.js';
import { store } from '../store.js';
import { renderSheet, semitonesFor, openChordDrawer } from './sheet.js';
import { chordsUsed, lyricsOnly, transposeSource } from '../chordpro.js';
import { toHojaTexto, toHojaJSON } from '../hoja.js';
import { buildDocx, docxFileName } from '../docx.js';
import { keyInfo, capoSuggestions, intervalBetweenKeys, keyPrefersFlats, transposeChord, normalizeKeyName, preferredKeyName, noteToPc, MAJOR_KEY_NAMES, MINOR_KEY_NAMES } from '../music.js';

const KEY_OPTIONS = [...MAJOR_KEY_NAMES, ...MINOR_KEY_NAMES];

export function songView(root, { navigate, params }) {
  const song = store.song(params.id);
  if (!song) {
    root.replaceChildren(el('p', {}, 'Esa canción ya no existe. '), button('Volver al repertorio', () => navigate('/')));
    return;
  }

  let displayKey = song.key;
  let notation = store.state.settings.notation;
  let fontSize = store.state.settings.fontSize;
  let editing = false;
  let scrollSpeed = 0;
  let scrollRaf = null;

  const sheetHost = el('div', { class: 'sheet-host' });
  const capoHost = el('div', { class: 'capo-host' });
  const chordBar = el('div', { class: 'chord-bar' });

  const stopScroll = () => { cancelAnimationFrame(scrollRaf); scrollRaf = null; };
  const startScroll = () => {
    stopScroll();
    if (!scrollSpeed) return;
    let last = performance.now();
    const step = (now) => {
      const dt = (now - last) / 1000; last = now;
      window.scrollBy(0, scrollSpeed * 18 * dt);
      scrollRaf = requestAnimationFrame(step);
    };
    scrollRaf = requestAnimationFrame(step);
  };

  const renderChordBar = () => {
    const semis = semitonesFor(song, displayKey);
    const flats = keyPrefersFlats(displayKey);
    const learned = new Set(store.practiceFor(song.id).chordsLearned);
    chordBar.replaceChildren(
      el('span', { class: 'muted small' }, 'Acordes de la canción:'),
      ...chordsUsed(song.body).map((c) => {
        const shown = semis ? transposeChord(c, semis, flats) : c;
        const b = button(shown + (learned.has(shown) ? ' ✓' : ''), () => openChordDrawer(shown, song.id), { variant: 'chip' });
        return b;
      }));
  };

  const renderCapo = () => {
    const suggestions = capoSuggestions(displayKey);
    capoHost.replaceChildren(
      el('span', { class: 'muted small' }, 'Cejilla sugerida (guitarra):'),
      ...(suggestions.length
        ? suggestions.map((s) => {
            const b = button(`${s.label} → formas de ${s.shapeKey}`, () => {
              store.updateSong(song.id, { capo: s.fret });
              toast(`Capo ${s.fret}: toca las formas de ${s.shapeKey} y sonará en ${displayKey}`);
            }, { variant: song.capo === s.fret ? 'ok' : 'chip' });
            return b;
          })
        : [el('span', { class: 'muted small' }, 'Sin posición cómoda con capo: usa cejilla o cambia de tonalidad.')]));
  };

  const renderSheetHost = () => {
    const semis = semitonesFor(song, displayKey);
    sheetHost.style.fontSize = fontSize + 'px';
    sheetHost.replaceChildren(
      editing
        ? el('div', { class: 'editor' },
            textarea(song.body, (v) => { song.body = v; }, { rows: 24, placeholder: 'Letra con [acordes]' }),
            el('div', { class: 'row' },
              button('Guardar', () => {
                store.updateSong(song.id, { body: song.body });
                editing = false; toast('Guardado', 'ok'); renderAll();
              }, { variant: 'primary' }),
              button('Cancelar', () => { editing = false; renderAll(); })))
        : renderSheet(song, { semitones: semis, notation, key: displayKey }));
  };

  /** La canción tal como se ve ahora (ya transpuesta), sin tocar la guardada. */
  const cancionMostrada = () => {
    const semis = semitonesFor(song, displayKey);
    if (!semis) return song;
    return { ...song, key: displayKey, body: transposeSource(song.body, semis, keyPrefersFlats(displayKey)) };
  };

  const transposeBy = (n) => {
    const info = keyInfo(displayKey);
    const pc = (noteToPc(info.tonic) || 0) + n;
    displayKey = preferredKeyName(pc, info.minor);
    renderAll();
  };

  const header = el('div', { class: 'page-head' });
  const controls = el('div', { class: 'toolbar sticky' });
  const meta = el('div', { class: 'meta-panel' });

  const renderAll = () => {
    const info = keyInfo(displayKey);
    const semis = semitonesFor(song, displayKey);

    header.replaceChildren(
      el('div', {},
        el('h1', { class: 'editable', title: 'Haz clic para renombrar', onClick: () => {
          const v = prompt('Título de la canción', song.title);
          if (v) { store.updateSong(song.id, { title: v }); renderAll(); }
        } }, song.title),
        el('p', { class: 'muted' }, song.author || 'Sin autor'),
        el('div', { class: 'meta-row' },
          chip(`Tonalidad original: ${song.key}`),
          semis ? chip(`Mostrando en ${displayKey} (${semis > 6 ? semis - 12 : '+' + semis} semitonos)`, { class: 'key' }) : null,
          chip(`${song.bpm || '?'} BPM`),
          chip(song.timeSignature || '4/4'),
          chip(`Relativo: ${info.relative}`))),
      el('div', { class: 'row wrap' },
        button('Instrumentos', () => navigate(`/instrumentos/${song.id}`)),
        button('Sincronizar con YouTube', () => navigate(`/sync/${song.id}`)),
        button('Practicar', () => navigate(`/practica/${song.id}`)),
        button('▶ Modo atril', () => navigate(`/atril/${song.id}`), { variant: 'primary' })));

    controls.replaceChildren(
      el('div', { class: 'control-group' },
        el('span', { class: 'ctl-label' }, 'Tono'),
        button('−', () => transposeBy(-1), { title: 'Bajar medio tono' }),
        select(KEY_OPTIONS, displayKey, (v) => { displayKey = v; renderAll(); }),
        button('+', () => transposeBy(1), { title: 'Subir medio tono' }),
        semis ? button('Guardar en este tono', () => {
          store.updateSong(song.id, {
            body: transposeSource(song.body, semis, keyPrefersFlats(displayKey)),
            key: displayKey,
          });
          toast(`Canción guardada en ${displayKey}`, 'ok');
          renderAll();
        }, { variant: 'ok' }) : null),
      el('div', { class: 'control-group' },
        el('span', { class: 'ctl-label' }, 'Notación'),
        select([
          { value: 'americana', label: 'C D E (americana)' },
          { value: 'latina', label: 'Do Re Mi (latina)' },
          { value: 'nashville', label: '1 4 5 (Nashville)' },
        ], notation, (v) => { notation = v; store.setSetting('notation', v); renderAll(); })),
      el('div', { class: 'control-group' },
        el('span', { class: 'ctl-label' }, 'Letra'),
        button('A−', () => { fontSize = Math.max(12, fontSize - 1); store.setSetting('fontSize', fontSize); renderSheetHost(); }),
        button('A+', () => { fontSize = Math.min(34, fontSize + 1); store.setSetting('fontSize', fontSize); renderSheetHost(); })),
      el('div', { class: 'control-group' },
        el('span', { class: 'ctl-label' }, 'Auto-scroll'),
        el('input', {
          type: 'range', min: 0, max: 5, step: 1, value: scrollSpeed, class: 'slider',
          onInput: (e) => { scrollSpeed = Number(e.target.value); startScroll(); },
        }),
        button('⏸', () => { scrollSpeed = 0; stopScroll(); }, { title: 'Detener' })),
      el('div', { class: 'control-group' },
        button(editing ? 'Ver hoja' : '✎ Editar letra', () => { editing = !editing; renderAll(); }),
        button('⎙ Imprimir', () => window.print()),
        button('Copiar solo letra', () => copyText(lyricsOnly(song.body)))));

    meta.replaceChildren(
      section('Datos de la canción',
        el('div', { class: 'grid-2' },
          field('Autor', input(song.author, (v) => store.updateSong(song.id, { author: v }))),
          field('Tonalidad original', select(KEY_OPTIONS, song.key, (v) => { store.updateSong(song.id, { key: v }); displayKey = v; renderAll(); })),
          field('BPM', input(song.bpm, (v) => store.updateSong(song.id, { bpm: Number(v) || 0 }), { type: 'number', min: 30, max: 220 })),
          field('Compás', select(['4/4', '3/4', '6/8', '2/4', '12/8'], song.timeSignature, (v) => store.updateSong(song.id, { timeSignature: v }))),
          field('Aire', select(['balada', 'suave', 'rock', 'fiesta', '6/8', '3/4', 'shuffle', 'acustico', 'ambiental'], song.feel, (v) => store.updateSong(song.id, { feel: v }))),
          field('Capo', input(song.capo, (v) => store.updateSong(song.id, { capo: Number(v) || 0 }), { type: 'number', min: 0, max: 9 })),
          field('Video de YouTube', input(song.youtubeId, (v) => store.updateSong(song.id, { youtubeId: v }), { placeholder: 'Pega la URL o el ID' })),
          field('Licencia / CCLI', input(song.ccli, (v) => store.updateSong(song.id, { ccli: v }), { placeholder: 'Nº de licencia o "dominio público"' })),
          field('Etiquetas', input((song.tags || []).join(', '), (v) => store.updateSong(song.id, { tags: v.split(',').map((x) => x.trim()).filter(Boolean) }), { placeholder: 'adoración, apertura, himno' }))),
        field('Notas generales del arreglo', textarea(song.notes, (v) => store.updateSong(song.id, { notes: v }), { rows: 3 })),
        el('div', { class: 'row wrap' },
          button('Exportar canción', () => download(`${song.title}.json`, JSON.stringify(song, null, 2))),
          button('Copiar hoja de acordes', () => copyText(song.body)))),
      section('Hoja en el formato del equipo',
        el('p', { class: 'muted' },
          'Título con la tonalidad, autor debajo, acordes en negrita sobre la sílaba y las repeticiones ' +
          'abreviadas con "(Igual)". Se exporta en la tonalidad que estés viendo ahora' +
          (semis ? ` (${displayKey})` : '') + '.'),
        el('div', { class: 'row wrap' },
          button('Ver / copiar como texto', () => {
            const texto = toHojaTexto(cancionMostrada(), { tonalidad: displayKey });
            drawer('Hoja de acordes — ' + song.title,
              el('div', { class: 'drawer-content' },
                el('pre', { class: 'code hoja' }, texto),
                el('div', { class: 'row' }, button('Copiar', () => copyText(texto), { variant: 'primary' }))));
          }),
          button('Descargar .docx', () => {
            const doc = toHojaJSON(cancionMostrada(), { tonalidad: displayKey });
            const bytes = buildDocx(doc, { mono: store.state.settings.docxMono || false });
            download(docxFileName(doc), bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            toast('Documento descargado', 'ok');
          }, { variant: 'primary' }),
          button('JSON para generar_docx.py', () => {
            const doc = toHojaJSON(cancionMostrada(), { tonalidad: displayKey });
            download(`${song.title}.json`, JSON.stringify(doc, null, 2));
          }),
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Fuente monoespaciada'),
            el('input', {
              type: 'checkbox', checked: store.state.settings.docxMono || false,
              onChange: (e) => store.setSetting('docxMono', e.target.checked),
            })))));

    renderSheetHost();
    renderChordBar();
    renderCapo();
  };

  root.replaceChildren(header, controls, chordBar, capoHost, sheetHost, meta);
  renderAll();

  return () => stopScroll();
}
