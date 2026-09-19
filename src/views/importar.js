/** importar.js — Recibe un set compartido por enlace o QR y lo guarda. */

import { el, button, chip, section, toast } from '../ui.js';
import { store } from '../store.js';
import { leerCodigo } from '../share.js';
import { chordsUsed } from '../chordpro.js';

export function importarView(root, { navigate, query }) {
  const codigo = query?.d;
  const cuerpo = el('div', {});

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Recibir canciones'),
        el('p', { class: 'muted' }, 'Alguien de tu equipo compartió un set contigo'))),
    cuerpo);

  if (!codigo) {
    cuerpo.replaceChildren(el('div', { class: 'card' },
      el('p', {}, 'Este enlace no trae canciones. Pídele a quien te lo mandó que use el botón "Compartir set" de la lista de servicio.'),
      button('Ir al repertorio', () => navigate('/'), { variant: 'primary' })));
    return;
  }

  cuerpo.replaceChildren(el('div', { class: 'card' }, el('p', { class: 'muted' }, 'Leyendo el código…')));

  leerCodigo(codigo).then(({ setlist, songs, tonalidades }) => {
    const existentes = new Map(store.songs.map((s) => [s.title.toLowerCase().trim(), s]));
    const nuevas = songs.filter((s) => !existentes.has(s.title.toLowerCase().trim()));
    const repetidas = songs.length - nuevas.length;

    cuerpo.replaceChildren(
      section(setlist ? `Set: ${setlist.name}` : 'Canciones compartidas',
        setlist?.date ? el('p', { class: 'muted' }, `Fecha: ${setlist.date}`) : null,
        setlist?.notes ? el('p', {}, setlist.notes) : null,
        el('ol', { class: 'lista-importar' },
          songs.map((s, i) => el('li', {},
            el('strong', {}, s.title),
            chip(tonalidades[i] || s.key, { class: 'key' }),
            chip(`${s.bpm} BPM`),
            existentes.has(s.title.toLowerCase().trim()) ? chip('ya la tienes', { class: 'warn' }) : null,
            el('p', { class: 'muted small' }, chordsUsed(s.body).slice(0, 8).join(' · '))))),
        el('p', { class: 'muted' },
          `${nuevas.length} canción(es) nueva(s)` + (repetidas ? ` · ${repetidas} que ya tienes` : '')),
        el('div', { class: 'row wrap' },
          button('Guardar las nuevas', () => {
            for (const s of nuevas) store.newSong(s);
            if (setlist) crearLista(setlist, songs, tonalidades);
            toast(`${nuevas.length} canciones guardadas`, 'ok');
            navigate(setlist ? '/listas' : '/');
          }, { variant: 'primary' }),
          button('Guardar todo (duplica las repetidas)', () => {
            for (const s of songs) store.newSong(s);
            if (setlist) crearLista(setlist, songs, tonalidades);
            toast('Todo guardado', 'ok');
            navigate('/');
          }),
          button('Cancelar', () => navigate('/'), { variant: 'ghost' }))),
      el('p', { class: 'muted small' },
        'Las canciones viajan dentro del propio enlace: no se subieron a ningún servidor.'));
  }).catch((err) => {
    cuerpo.replaceChildren(el('div', { class: 'card' },
      el('h2', {}, 'No se pudo leer el código'),
      el('p', { class: 'muted' }, err.message),
      el('p', { class: 'muted small' }, 'Puede que el enlace se haya cortado al copiarlo: pide que te lo manden completo.'),
      button('Ir al repertorio', () => navigate('/'))));
  });

  function crearLista(setlist, songs, tonalidades) {
    const porTitulo = new Map(store.songs.map((s) => [s.title.toLowerCase().trim(), s]));
    const items = songs.map((s, i) => {
      const guardada = porTitulo.get(s.title.toLowerCase().trim());
      return guardada ? { songId: guardada.id, key: tonalidades[i] || s.key, notes: '' } : null;
    }).filter(Boolean);
    store.newSetlist({ name: setlist.name, date: setlist.date, notes: setlist.notes, songs: items });
  }
}
