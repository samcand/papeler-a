/** historial.js — Qué se cantó, cuándo, y qué conviene hacer con el repertorio. */

import { el, button, chip, section, render } from '../ui.js';
import { store } from '../store.js';
import { resumen, historialPorCancion, sugerencias } from '../historial.js';

export function historialView(root, { navigate }) {
  const hoy = new Date();
  const r = resumen(store.state.setlists, store.songs, hoy);
  const h = historialPorCancion(store.state.setlists, store.songs, hoy);
  const avisos = sugerencias(h);

  const tarjeta = (valor, etiqueta) => el('div', { class: 'stat' },
    el('strong', {}, String(valor)), el('span', { class: 'muted small' }, etiqueta));

  const fechaCorta = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

  render(root, 
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Historial del repertorio'),
        el('p', { class: 'muted' }, 'Sale de las listas de servicio con fecha')),
      el('div', { class: 'row wrap' },
        button('Listas', () => navigate('/listas')),
        button('Repertorio', () => navigate('/')))),

    r.servicios === 0
      ? el('div', { class: 'card' },
          el('p', {}, 'Todavía no hay servicios registrados.'),
          el('p', { class: 'muted' }, 'Crea una lista de servicio con su fecha y aparecerá aquí automáticamente. Con tres o cuatro domingos ya empieza a ser útil.'),
          button('Crear una lista', () => navigate('/listas'), { variant: 'primary' }))
      : el('div', {},
          el('div', { class: 'stats' },
            tarjeta(r.servicios, 'servicios'),
            tarjeta(r.cancionesDistintas, 'canciones distintas'),
            tarjeta(r.promedioPorServicio, 'canciones por servicio'),
            tarjeta(r.repertorioActivo, 'activas (últimos 90 días)'),
            tarjeta(r.sinUsar, 'nunca usadas')),

          avisos.length ? section('Avisos',
            el('ul', { class: 'tips' }, avisos.slice(0, 8).map((a) => el('li', {},
              el('strong', {}, a.tipo === 'repetida' ? '🔁 ' : a.tipo === 'olvidada' ? '💤 ' : '✨ '),
              a.texto,
              ' ',
              button('Abrir', () => navigate(`/cancion/${a.cancion.id}`), { variant: 'chip' }))))) : null,

          section('Cuándo se cantó cada una',
            el('table', { class: 'tl-table' },
              el('thead', {}, el('tr', {},
                el('th', {}, 'Canción'), el('th', {}, 'Veces'), el('th', {}, 'Última vez'),
                el('th', {}, 'Hace'), el('th', {}, 'Tonalidad habitual'), el('th', {}, ''))),
              el('tbody', {},
                h.cantadas.map((e) => el('tr', {},
                  el('td', {}, e.song.title),
                  el('td', {}, String(e.veces) + (e.seguidas > 1 ? ` (${e.seguidas} seguidas)` : '')),
                  el('td', {}, fechaCorta(e.ultima)),
                  el('td', {}, e.dias != null ? `${e.dias} días` : '—'),
                  el('td', {}, chip(e.tonalidadMasUsada, { class: 'key' })),
                  el('td', {}, button('Abrir', () => navigate(`/cancion/${e.song.id}`), { variant: 'chip' }))))))),

          r.tonalidades.length ? section('Tonalidades que más usan',
            el('div', { class: 'chip-list' },
              r.tonalidades.map(([k, n]) => chip(`${k} · ${n}`, { class: 'key' }))),
            el('p', { class: 'muted small' },
              'Si casi todo está en dos o tres tonalidades, el set suena plano. Variar ayuda, pero sin salirse del rango donde la congregación canta.')) : null,

          h.nunca.length ? section('En el repertorio pero sin estrenar',
            el('div', { class: 'chip-list' },
              h.nunca.map((e) => {
                const c = chip(e.song.title);
                c.addEventListener('click', () => navigate(`/cancion/${e.song.id}`));
                c.style.cursor = 'pointer';
                return c;
              }))) : null));
}
