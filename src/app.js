/** app.js — Router y armazón de la aplicación. */

import { el, $, toast } from './ui.js';
import { store } from './store.js';
import { libraryView } from './views/library.js';
import { songView } from './views/song.js';
import { instrumentsView } from './views/instruments.js';
import { syncView } from './views/sync.js';
import { practiceView } from './views/practice.js';
import { academyView } from './views/academy.js';
import { setlistsView } from './views/setlists.js';
import { ideasView } from './views/ideas.js';
import { afinadorView } from './views/afinador.js';
import { estudioView } from './views/estudio.js';
import { atrilView } from './views/atril.js';
import { cantoView } from './views/canto.js';
import { importarView } from './views/importar.js';
import { historialView } from './views/historial.js';
import { calentamientoView } from './views/calentamiento.js';

const ROUTES = [
  { path: /^\/?$/, view: libraryView, nav: 'repertorio' },
  { path: /^\/cancion\/([^/]+)$/, view: songView, keys: ['id'] },
  { path: /^\/instrumentos\/([^/]+)$/, view: instrumentsView, keys: ['id'] },
  { path: /^\/sync\/([^/]+)$/, view: syncView, keys: ['id'] },
  { path: /^\/practica(?:\/([^/]+))?$/, view: practiceView, keys: ['id'], nav: 'practica' },
  { path: /^\/academia$/, view: academyView, nav: 'academia' },
  { path: /^\/afinador$/, view: afinadorView, nav: 'afinador' },
  { path: /^\/estudio$/, view: estudioView, nav: 'estudio' },
  { path: /^\/canto(?:\/([^/]+))?$/, view: cantoView, keys: ['id'], nav: 'canto' },
  { path: /^\/atril\/set\/([^/]+)$/, view: atrilView, keys: ['setlistId'] },
  { path: /^\/atril\/([^/]+)$/, view: atrilView, keys: ['id'] },
  { path: /^\/historial$/, view: historialView, nav: 'historial' },
  { path: /^\/calentamiento(?:\/([^/]+))?$/, view: calentamientoView, keys: ['instrumento'], nav: 'calentamiento' },
  { path: /^\/importar$/, view: importarView },
  { path: /^\/listas$/, view: setlistsView, nav: 'listas' },
  { path: /^\/ideas$/, view: ideasView, nav: 'ideas' },
];

const NAV = [
  { href: '#/', label: 'Repertorio', id: 'repertorio' },
  { href: '#/listas', label: 'Listas', id: 'listas' },
  { href: '#/practica', label: 'Practicar', id: 'practica' },
  { href: '#/calentamiento', label: 'Calentar', id: 'calentamiento' },
  { href: '#/canto', label: 'Canto', id: 'canto' },
  { href: '#/afinador', label: 'Afinador', id: 'afinador' },
  { href: '#/estudio', label: 'Estudio', id: 'estudio' },
  { href: '#/historial', label: 'Historial', id: 'historial' },
  { href: '#/academia', label: 'Academia', id: 'academia' },
  { href: '#/ideas', label: '100 ideas', id: 'ideas' },
];

let cleanup = null;

function navigate(path) {
  location.hash = '#' + path;
}

function currentPath() {
  return ((location.hash || '#/').slice(1) || '/').split('?')[0];
}

/** Parámetros después del "?" del hash (los usa el enlace para compartir). */
function currentQuery() {
  const partes = (location.hash || '').split('?');
  if (partes.length < 2) return {};
  const out = {};
  for (const par of partes.slice(1).join('?').split('&')) {
    const i = par.indexOf('=');
    if (i === -1) out[decodeURIComponent(par)] = '';
    else out[decodeURIComponent(par.slice(0, i))] = decodeURIComponent(par.slice(i + 1));
  }
  return out;
}

function render() {
  const root = $('#app');
  const path = currentPath();
  cleanup?.();
  cleanup = null;
  root.replaceChildren();
  window.scrollTo(0, 0);

  for (const route of ROUTES) {
    const match = route.path.exec(path);
    if (!match) continue;
    const params = {};
    (route.keys || []).forEach((k, i) => { params[k] = match[i + 1]; });
    try {
      cleanup = route.view(root, { navigate, params, query: currentQuery() }) || null;
    } catch (err) {
      console.error(err);
      root.replaceChildren(el('div', { class: 'card' },
        el('h2', {}, 'Algo falló al dibujar esta pantalla'),
        el('pre', { class: 'code' }, String(err && err.stack || err))));
    }
    highlightNav(route.nav || path.split('/')[1]);
    return;
  }
  root.replaceChildren(el('div', { class: 'card' },
    el('h2', {}, 'Página no encontrada'),
    el('a', { href: '#/' }, 'Volver al repertorio')));
}

function highlightNav(id) {
  document.querySelectorAll('.nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.id === id);
  });
}

function mountShell() {
  const header = el('header', { class: 'topbar' },
    el('a', { class: 'brand', href: '#/' },
      el('span', { class: 'logo' }, '♪'),
      el('span', {}, 'Alabanza')),
    el('nav', { class: 'nav' },
      NAV.map((n) => el('a', { href: n.href, dataset: { id: n.id } }, n.label))),
    el('div', { class: 'topbar-right' },
      el('button', {
        class: 'btn ghost', title: 'Cambiar tema',
        onClick: () => {
          const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
          document.documentElement.dataset.theme = next;
          store.setSetting('theme', next);
        },
      }, '◐')));
  document.body.prepend(header);
}

// Instalación y funcionamiento sin internet
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.info('La app funcionará igual, pero sin modo offline:', err.message);
    });
  });
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.theme = store.state.settings.theme || 'dark';
  mountShell();
  render();
});

// Atajos de teclado útiles en el atril.
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === '/') { e.preventDefault(); navigate('/'); }
  if (e.key === 'a') navigate('/academia');
  if (e.key === 'p') navigate('/practica');
  if (e.key === 't') navigate('/afinador');
  if (e.key === 'e') navigate('/estudio');
  if (e.key === 'c') navigate('/canto');
  if (e.key === 'w') navigate('/calentamiento');
});
