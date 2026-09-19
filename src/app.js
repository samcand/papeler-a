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

const ROUTES = [
  { path: /^\/?$/, view: libraryView, nav: 'repertorio' },
  { path: /^\/cancion\/([^/]+)$/, view: songView, keys: ['id'] },
  { path: /^\/instrumentos\/([^/]+)$/, view: instrumentsView, keys: ['id'] },
  { path: /^\/sync\/([^/]+)$/, view: syncView, keys: ['id'] },
  { path: /^\/practica(?:\/([^/]+))?$/, view: practiceView, keys: ['id'], nav: 'practica' },
  { path: /^\/academia$/, view: academyView, nav: 'academia' },
  { path: /^\/listas$/, view: setlistsView, nav: 'listas' },
  { path: /^\/ideas$/, view: ideasView, nav: 'ideas' },
];

const NAV = [
  { href: '#/', label: 'Repertorio', id: 'repertorio' },
  { href: '#/listas', label: 'Listas', id: 'listas' },
  { href: '#/practica', label: 'Practicar', id: 'practica' },
  { href: '#/academia', label: 'Academia', id: 'academia' },
  { href: '#/ideas', label: '100 ideas', id: 'ideas' },
];

let cleanup = null;

function navigate(path) {
  location.hash = '#' + path;
}

function currentPath() {
  return (location.hash || '#/').slice(1) || '/';
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
      cleanup = route.view(root, { navigate, params }) || null;
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
});
