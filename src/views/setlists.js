/** setlists.js — Listas de servicio: orden, tonalidades y flujo. */

import { el, button, input, select, textarea, toast, copyText, chip, section, confirmDialog } from '../ui.js';
import { store } from '../store.js';
import { keyInfo, intervalBetweenKeys, MAJOR_KEY_NAMES, MINOR_KEY_NAMES, formatTime } from '../music.js';

const KEY_OPTIONS = [...MAJOR_KEY_NAMES, ...MINOR_KEY_NAMES];

export function setlistsView(root, { navigate }) {
  let currentId = store.state.setlists[0]?.id || null;
  const host = el('div', {});

  const transitionNote = (fromKey, toKey, fromBpm, toBpm) => {
    const semis = intervalBetweenKeys(fromKey, toKey);
    const notes = [];
    if (semis === 0) notes.push('Misma tonalidad: puedes encadenar sin pausa.');
    else if (semis === 7 || semis === 5) notes.push(`De ${fromKey} a ${toKey} hay una quinta: enlaza natural, casi no se nota el cambio.`);
    else if (semis === 2 || semis === 10) notes.push(`De ${fromKey} a ${toKey}: sube o baja un tono. Usa el V de ${toKey} como puente.`);
    else if (semis === 1 || semis === 11) notes.push(`Medio tono: efectivo para subir energía, pero hazlo con un compás de transición.`);
    else notes.push(`Cambio grande (${semis} semitonos): mejor hablar, orar o leer un versículo entre ambas.`);
    const diff = Math.abs((toBpm || 0) - (fromBpm || 0));
    if (diff > 25) notes.push(`Además cambia mucho el tempo (${fromBpm} → ${toBpm} BPM): no lo encadenes en seco.`);
    return notes.join(' ');
  };

  const render = () => {
    const setlists = store.state.setlists;
    const current = currentId ? store.setlist(currentId) : null;

    const listPanel = el('aside', { class: 'setlist-side' },
      el('div', { class: 'row wrap' },
        button('+ Nueva lista', () => { const sl = store.newSetlist(); currentId = sl.id; render(); }, { variant: 'primary' })),
      el('ul', { class: 'setlist-list' },
        setlists.map((sl) => {
          const li = el('li', { class: sl.id === currentId ? 'active' : '' },
            el('strong', {}, sl.name),
            el('span', { class: 'muted small' }, `${sl.songs.length} canciones · ${sl.date || ''}`));
          li.addEventListener('click', () => { currentId = sl.id; render(); });
          return li;
        })));

    if (!current) {
      host.replaceChildren(el('div', { class: 'setlist-layout' }, listPanel,
        el('div', {}, el('p', { class: 'muted' }, 'Crea una lista para planear el servicio.'))));
      return;
    }

    const rows = current.songs.map((item, i) => {
      const song = store.song(item.songId);
      if (!song) return null;
      const prev = i > 0 ? store.song(current.songs[i - 1].songId) : null;
      const prevKey = prev ? (current.songs[i - 1].key || prev.key) : null;
      const key = item.key || song.key;
      return el('div', { class: 'setlist-row' },
        el('div', { class: 'order' }, String(i + 1)),
        el('div', { class: 'grow' },
          el('h4', { onClick: () => navigate(`/cancion/${song.id}`) }, song.title),
          el('div', { class: 'meta-row' },
            el('label', { class: 'field inline' },
              el('span', { class: 'field-label' }, 'Tono'),
              select(KEY_OPTIONS, key, (v) => {
                current.songs[i].key = v;
                store.updateSetlist(current.id, { songs: current.songs });
                render();
              })),
            chip(`${song.bpm || '?'} BPM`),
            chip(song.timeSignature || '4/4'),
            key !== song.key ? chip(`original ${song.key}`, { class: 'warn' }) : null),
          prev ? el('p', { class: 'muted small transition' }, '↳ ' + transitionNote(prevKey, key, prev.bpm, song.bpm)) : null,
          input(item.notes || '', (v) => {
            current.songs[i].notes = v;
            store.updateSetlist(current.id, { songs: current.songs });
          }, { placeholder: 'Nota para el equipo: quién inicia, repeticiones, oración…' })),
        el('div', { class: 'row' },
          button('↑', () => { if (i > 0) { [current.songs[i - 1], current.songs[i]] = [current.songs[i], current.songs[i - 1]]; store.updateSetlist(current.id, { songs: current.songs }); render(); } }, { variant: 'ghost' }),
          button('↓', () => { if (i < current.songs.length - 1) { [current.songs[i + 1], current.songs[i]] = [current.songs[i], current.songs[i + 1]]; store.updateSetlist(current.id, { songs: current.songs }); render(); } }, { variant: 'ghost' }),
          button('✕', () => { current.songs.splice(i, 1); store.updateSetlist(current.id, { songs: current.songs }); render(); }, { variant: 'ghost danger' })));
    }).filter(Boolean);

    const addSelect = select(
      [{ value: '', label: 'Añadir canción…' }, ...store.songs.map((s) => ({ value: s.id, label: `${s.title} (${s.key})` }))],
      '', (v) => {
        if (!v) return;
        current.songs.push({ songId: v, key: store.song(v).key, notes: '' });
        store.updateSetlist(current.id, { songs: current.songs });
        render();
      });

    const asText = () => [
      current.name, current.date, '',
      ...current.songs.map((it, i) => {
        const s = store.song(it.songId);
        return `${i + 1}. ${s?.title || '?'} — ${it.key || s?.key} — ${s?.bpm || '?'} BPM${it.notes ? ' · ' + it.notes : ''}`;
      }),
      current.notes ? '\n' + current.notes : '',
    ].join('\n');

    host.replaceChildren(el('div', { class: 'setlist-layout' }, listPanel,
      el('div', {},
        section('',
          el('div', { class: 'row wrap' },
            input(current.name, (v) => store.updateSetlist(current.id, { name: v })),
            input(current.date, (v) => store.updateSetlist(current.id, { date: v }), { type: 'date' }),
            addSelect,
            button('Copiar lista', () => copyText(asText())),
            button('Eliminar lista', () => {
              if (confirmDialog('¿Eliminar esta lista?')) { store.deleteSetlist(current.id); currentId = null; render(); }
            }, { variant: 'ghost danger' })),
          rows.length ? el('div', { class: 'setlist-rows' }, rows) : el('p', { class: 'muted' }, 'Lista vacía: añade canciones arriba.'),
          el('label', { class: 'field' },
            el('span', { class: 'field-label' }, 'Notas del servicio'),
            textarea(current.notes, (v) => store.updateSetlist(current.id, { notes: v }), { rows: 3, placeholder: 'Tema de la predicación, momentos de oración, avisos…' }))),
        section('Cómo ordenar un set que funcione',
          el('ul', { class: 'tips' },
            el('li', {}, 'Empieza con algo conocido y de tempo medio: la gente necesita "engancharse" antes de una canción lenta.'),
            el('li', {}, 'Sube la energía hacia la mitad y baja hacia el final si sigue la predicación.'),
            el('li', {}, 'Máximo una canción nueva por servicio, y repítela 3 o 4 domingos seguidos.'),
            el('li', {}, 'Agrupa las canciones por tonalidades vecinas para encadenar sin cortes.'),
            el('li', {}, 'Ten preparada una canción extra por si el momento se alarga.'))))));
  };

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {}, el('h1', {}, 'Listas de servicio'), el('p', { class: 'muted' }, 'Planea el orden, las tonalidades y las transiciones')),
      el('div', {}, button('Repertorio', () => navigate('/')))),
    host);
  render();
}
