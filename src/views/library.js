/** library.js — Repertorio: buscar, crear, importar y exportar canciones. */

import { el, button, input, toast, download, confirmDialog, chip } from '../ui.js';
import { store } from '../store.js';
import { chordsUsed } from '../chordpro.js';
import { keyInfo } from '../music.js';

export function libraryView(root, { navigate }) {
  let query = '';
  let tagFilter = '';

  const list = el('div', { class: 'song-grid' });

  const render = () => {
    list.replaceChildren();
    const q = query.trim().toLowerCase();
    const songs = store.songs.filter((s) => {
      const matchQ = !q || [s.title, s.author, (s.tags || []).join(' '), s.body]
        .join(' ').toLowerCase().includes(q);
      const matchTag = !tagFilter || (s.tags || []).includes(tagFilter);
      return matchQ && matchTag;
    });
    if (!songs.length) {
      list.append(el('p', { class: 'muted' }, 'No hay canciones con ese filtro. Crea una nueva o limpia la búsqueda.'));
      return;
    }
    for (const song of songs) {
      const chords = chordsUsed(song.body).slice(0, 6);
      const learned = store.practiceFor(song.id).chordsLearned.length;
      list.append(el('article', { class: 'song-card' },
        el('header', {},
          el('h3', { onClick: () => navigate(`/cancion/${song.id}`) }, song.title),
          el('p', { class: 'muted small' }, song.author || 'Sin autor')),
        el('div', { class: 'meta-row' },
          chip(`Tono ${song.key}`, { class: 'key' }),
          chip(`${song.bpm || '?'} BPM`),
          chip(song.timeSignature || '4/4'),
          song.capo ? chip(`Capo ${song.capo}`) : null,
          song.youtubeId ? chip('▶ YouTube', { class: 'yt' }) : null),
        el('p', { class: 'chords-preview' }, chords.join('  ·  ') || '—'),
        learned ? el('p', { class: 'muted small' }, `${learned} acordes marcados como aprendidos`) : null,
        el('div', { class: 'row wrap' },
          button('Abrir', () => navigate(`/cancion/${song.id}`), { variant: 'primary' }),
          button('Instrumentos', () => navigate(`/instrumentos/${song.id}`)),
          button('YouTube', () => navigate(`/sync/${song.id}`)),
          button('Practicar', () => navigate(`/practica/${song.id}`)),
          button('⋯', (e) => openMenu(e, song), { variant: 'ghost' }))));
    }
  };

  const openMenu = (e, song) => {
    const menu = el('div', { class: 'menu' },
      button('Duplicar', () => { const c = store.duplicateSong(song.id); menu.remove(); navigate(`/cancion/${c.id}`); }, { variant: 'ghost' }),
      button('Exportar esta canción', () => {
        download(`${song.title.replace(/\s+/g, '-').toLowerCase()}.json`, JSON.stringify(song, null, 2));
        menu.remove();
      }, { variant: 'ghost' }),
      button('Eliminar', () => {
        if (confirmDialog(`¿Eliminar "${song.title}"? No se puede deshacer.`)) {
          store.deleteSong(song.id); toast('Canción eliminada'); render();
        }
        menu.remove();
      }, { variant: 'ghost danger' }));
    menu.style.left = `${e.clientX - 120}px`;
    menu.style.top = `${e.clientY + 8}px`;
    document.body.append(menu);
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
  };

  const allTags = [...new Set(store.songs.flatMap((s) => s.tags || []))].sort();

  const importFile = el('input', { type: 'file', accept: '.json', class: 'hidden' });
  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const count = store.importJSON(await file.text());
      toast(`Importado. Ahora tienes ${count} canciones.`, 'ok');
      render();
    } catch (err) {
      toast('Archivo inválido: ' + err.message, 'warn');
    }
  });

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Mi repertorio'),
        el('p', { class: 'muted' }, `${store.songs.length} canciones guardadas en este dispositivo`)),
      el('div', { class: 'row wrap' },
        button('+ Nueva canción', () => { const s = store.newSong(); navigate(`/cancion/${s.id}`); }, { variant: 'primary' }),
        button('Importar', () => importFile.click()),
        button('Exportar todo', () => download('alabanza-respaldo.json', store.exportJSON())),
        importFile)),
    el('div', { class: 'toolbar' },
      input('', (v) => { query = v; render(); }, { placeholder: 'Buscar por título, autor, letra o etiqueta…' }),
      el('div', { class: 'row wrap tags' },
        (() => {
          const all = chip('Todas', { class: !tagFilter ? 'active' : '' });
          all.addEventListener('click', () => { tagFilter = ''; render(); });
          return all;
        })(),
        allTags.map((t) => {
          const c = chip(t, { class: tagFilter === t ? 'active' : '' });
          c.addEventListener('click', () => { tagFilter = tagFilter === t ? '' : t; render(); });
          return c;
        }))),
    list,
    el('div', { class: 'card tip-card' },
      el('h2', { class: 'card-title' }, 'Cómo escribir una canción aquí'),
      el('pre', { class: 'code' }, `{Verso 1}
[G]Escribe la letra con el acorde [D]entre corchetes
justo antes de la sílaba donde cam[Em7]bia

{Coro}
| [C] | [G] | [D] |   ← compases instrumentales
// Esto es una nota solo para el músico`),
      el('p', { class: 'muted' }, 'Con eso la app ya sabe la progresión, puede transponer, generar la línea de tiempo del video y decirle a cada instrumento qué hacer.')),
  );

  render();
}
