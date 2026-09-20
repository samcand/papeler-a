/** app.js — Router y armazón de la app de recordatorios. */

import { el, render as pintar, toast } from '../../src/ui.js';
import { aISO, hoy as fechaHoy } from './fechas.js';
import { aplicarFiltro } from './filtros.js';
import { MODULOS, estaVencida } from './modelo.js';
import { programarDelDia } from './notificaciones.js';
import { store } from './store.js';

import { vistaHoy } from './views/hoy.js';
import { vistaProximos } from './views/proximos.js';
import { vistaCalendario } from './views/calendario.js';
import { vistaEnfoque } from './views/enfoque.js';
import { vistaPlanificar } from './views/planificar.js';
import { vistaLista, vistaFiltroNuevo } from './views/lista.js';
import { vistaInversiones } from './views/inversiones.js';
import { vistaProyectos } from './views/proyectos.js';
import { vistaDocencia } from './views/docencia.js';
import { vistaInvestigacion } from './views/investigacion.js';
import { vistaAlabanza } from './views/alabanza.js';
import { vistaRevision } from './views/revision.js';
import { vistaIdeas } from './views/ideas.js';
import { vistaAjustes } from './views/ajustes.js';

const RUTAS = [
  { ruta: /^\/?$/, vista: vistaHoy, nav: 'hoy' },
  { ruta: /^\/hoy$/, vista: vistaHoy, nav: 'hoy' },
  { ruta: /^\/proximos$/, vista: vistaProximos, nav: 'proximos' },
  { ruta: /^\/calendario$/, vista: vistaCalendario, nav: 'calendario' },
  { ruta: /^\/enfoque$/, vista: vistaEnfoque, nav: 'enfoque' },
  { ruta: /^\/planificar$/, vista: vistaPlanificar, nav: 'planificar' },
  { ruta: /^\/revision$/, vista: vistaRevision, nav: 'revision' },
  { ruta: /^\/inversiones$/, vista: vistaInversiones, nav: 'inversiones' },
  { ruta: /^\/proyectos$/, vista: vistaProyectos, nav: 'proyectos' },
  { ruta: /^\/docencia$/, vista: vistaDocencia, nav: 'docencia' },
  { ruta: /^\/investigacion$/, vista: vistaInvestigacion, nav: 'investigacion' },
  { ruta: /^\/alabanza$/, vista: vistaAlabanza, nav: 'alabanza' },
  { ruta: /^\/ideas$/, vista: vistaIdeas, nav: 'ideas' },
  { ruta: /^\/ajustes$/, vista: vistaAjustes, nav: 'ajustes' },
  { ruta: /^\/filtro\/nuevo$/, vista: vistaFiltroNuevo },
  { ruta: /^\/(proyecto|filtro|etiqueta|buscar)\/(.+)$/, vista: vistaLista, claves: ['tipo', 'clave'] },
];

let limpiar = null;

function rutaActual() {
  return ((location.hash || '#/').slice(1) || '/').split('?')[0];
}

function consulta() {
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

function navegar(camino) {
  location.hash = '#' + camino;
}

function dibujar() {
  const raiz = document.getElementById('app');
  const camino = rutaActual();
  limpiar?.();
  limpiar = null;
  pintar(raiz);
  window.scrollTo(0, 0);

  for (const r of RUTAS) {
    const coincide = r.ruta.exec(camino);
    if (!coincide) continue;
    const params = {};
    (r.claves || []).forEach((k, i) => { params[k] = coincide[i + 1]; });
    try {
      limpiar = r.vista(raiz, { navegar, params, query: consulta() }) || null;
    } catch (err) {
      console.error(err);
      pintar(raiz, el('div', { class: 'card' },
        el('h2', {}, 'Algo falló al dibujar esta pantalla'),
        el('pre', { style: 'white-space:pre-wrap;font-size:.8rem' }, String(err?.stack || err))));
    }
    marcarNav(r.nav || camino.split('/')[1]);
    return;
  }
  pintar(raiz, el('div', { class: 'card' },
    el('h2', {}, 'Esta pantalla no existe'),
    el('a', { href: '#/hoy' }, 'Volver a Hoy')));
}

function marcarNav(id) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('activo', a.dataset.nav === id);
  });
}

/* ------------------------------------------------------------------ *
 * Armazón: barra lateral y barra inferior
 * ------------------------------------------------------------------ */

const PRINCIPAL = [
  { id: 'hoy', icono: '📋', texto: 'Hoy', href: '#/hoy' },
  { id: 'proximos', icono: '🗓️', texto: 'Próximos', href: '#/proximos' },
  { id: 'calendario', icono: '📅', texto: 'Calendario', href: '#/calendario' },
  { id: 'enfoque', icono: '⏱️', texto: 'Enfoque', href: '#/enfoque' },
  { id: 'planificar', icono: '🧭', texto: 'Planificar', href: '#/planificar' },
  { id: 'revision', icono: '🔄', texto: 'Revisión', href: '#/revision' },
];

const TRABAJO = [
  { id: 'inversiones', icono: '📈', texto: 'Inversiones', href: '#/inversiones' },
  { id: 'proyectos', icono: '📐', texto: 'Proyectos', href: '#/proyectos' },
  { id: 'docencia', icono: '🎓', texto: 'Docencia', href: '#/docencia' },
  { id: 'investigacion', icono: '🔬', texto: 'Investigación', href: '#/investigacion' },
  { id: 'alabanza', icono: '🎵', texto: 'Alabanza', href: '#/alabanza' },
];

const MOVIL = [
  { id: 'hoy', icono: '📋', texto: 'Hoy', href: '#/hoy' },
  { id: 'calendario', icono: '📅', texto: 'Calendario', href: '#/calendario' },
  { id: 'enfoque', icono: '⏱️', texto: 'Enfoque', href: '#/enfoque' },
  { id: 'inversiones', icono: '📈', texto: 'Cartera', href: '#/inversiones' },
  { id: 'ajustes', icono: '⋯', texto: 'Más', href: '#/ajustes' },
];

function enlace(item, cuenta) {
  return el('a', { class: 'nav-item', href: item.href, dataset: { nav: item.id } },
    el('span', {}, item.icono),
    el('span', { class: 'grow' }, item.texto),
    cuenta ? el('span', { class: `cuenta ${cuenta.urgente ? 'rojo' : ''}`.trim() }, String(cuenta.n)) : null);
}

function montarArmazon() {
  const hoyISO = aISO(fechaHoy());
  const pendientes = store.tareas.filter((t) => !t.completada);
  const cuentaHoy = pendientes.filter((t) => t.fecha && t.fecha <= hoyISO).length;
  const vencidas = pendientes.filter((t) => estaVencida(t, hoyISO)).length;

  const lateral = el('aside', { class: 'lateral' },
    el('div', { class: 'marca' }, el('span', {}, '✓'), 'Recordatorios'),
    buscador(),
    ...PRINCIPAL.map((i) => enlace(i, i.id === 'hoy' && cuentaHoy ? { n: cuentaHoy, urgente: vencidas > 0 } : null)),
    el('div', { class: 'nav-titulo' }, 'Trabajo'),
    ...TRABAJO.map((i) => enlace(i, cuentaModulo(i.id))),
    el('div', { class: 'nav-titulo' }, 'Filtros'),
    ...store.estado.filtros.map((f) => el('a', {
      class: 'nav-item', href: `#/filtro/${f.id}`, dataset: { nav: f.id },
    }, el('span', {}, f.icono || '🔎'), el('span', { class: 'grow' }, f.nombre),
    el('span', { class: 'cuenta' }, String(aplicarFiltro(f.expresion, store.tareas, { hoy: hoyISO }).length)))),
    el('a', { class: 'nav-item muted', href: '#/filtro/nuevo' }, el('span', {}, '＋'), el('span', {}, 'Filtro nuevo')),
    el('div', { class: 'nav-titulo' }, 'Proyectos'),
    ...store.estado.proyectos.map((p) => el('a', {
      class: 'nav-item', href: `#/proyecto/${encodeURIComponent(p.nombre)}`, dataset: { nav: p.nombre },
    }, el('span', { class: 'punto-modulo', style: `background:${p.color}` }), el('span', { class: 'grow' }, p.nombre),
    el('span', { class: 'cuenta' }, String(pendientes.filter((t) => t.proyecto === p.nombre).length)))),
    el('div', { class: 'nav-titulo' }, ''),
    enlace({ id: 'ideas', icono: '💡', texto: '100 ideas', href: '#/ideas' }),
    enlace({ id: 'ajustes', icono: '⚙️', texto: 'Ajustes', href: '#/ajustes' }));

  const inferior = el('nav', { class: 'barra-inferior' },
    ...MOVIL.map((i) => el('a', { class: 'nav-item', href: i.href, dataset: { nav: i.id } },
      el('span', {}, i.icono), el('span', {}, i.texto))));

  const marco = el('div', { class: 'marco' }, lateral, el('main', { class: 'contenido', id: 'app' }));
  document.body.prepend(marco);
  document.body.append(inferior);

  function cuentaModulo(id) {
    const n = pendientes.filter((t) => t.modulo === id && t.fecha && t.fecha <= hoyISO).length;
    return n ? { n } : null;
  }
}

function buscador() {
  const campo = el('input', {
    class: 'input', type: 'search', placeholder: 'Buscar…  (/)',
    onKeydown: (e) => {
      if (e.key !== 'Enter') return;
      const q = e.target.value.trim();
      if (q) navegar(`/buscar/${encodeURIComponent(q)}`);
    },
  });
  campo.id = 'buscador';
  return el('div', { style: 'padding:0 10px 10px' }, campo);
}

/** Vuelve a montar la barra lateral cuando cambian las cuentas. */
function refrescarArmazon() {
  const viejo = document.querySelector('.marco');
  const contenido = document.getElementById('app');
  if (!viejo) return;
  const lateral = viejo.querySelector('.lateral');
  const activo = document.activeElement;
  if (activo && activo.id === 'buscador') return; // no interrumpir la escritura
  lateral?.remove();
  document.querySelector('.barra-inferior')?.remove();
  viejo.remove();
  montarArmazon();
  document.getElementById('app').replaceWith(contenido);
  marcarNav(rutaActual().split('/')[1] || 'hoy');
}

/* ------------------------------------------------------------------ *
 * Atajos de teclado
 * ------------------------------------------------------------------ */

function atajos() {
  document.addEventListener('keydown', (e) => {
    const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (escribiendo) return;
    if (e.key === '/') { e.preventDefault(); document.getElementById('buscador')?.focus(); return; }
    if (e.key === 'a') { e.preventDefault(); document.querySelector('[data-rapida]')?.focus(); return; }
    const destinos = { h: '/hoy', p: '/proximos', c: '/calendario', e: '/enfoque', i: '/inversiones', g: '/proyectos', r: '/revision' };
    if (destinos[e.key]) { e.preventDefault(); navegar(destinos[e.key]); }
  });
}

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ */

document.documentElement.dataset.theme = store.estado.ajustes.tema || 'dark';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.info('La app funciona igual, pero sin modo offline:', err.message);
    });
  });
}

window.addEventListener('hashchange', dibujar);
window.addEventListener('DOMContentLoaded', () => {
  montarArmazon();
  atajos();
  if (!location.hash || location.hash === '#/') location.hash = '#/' + (store.estado.ajustes.vistaInicio || 'hoy');
  dibujar();

  // Las cuentas de la barra lateral se refrescan cuando cambian los datos.
  store.suscribir(() => {
    clearTimeout(window.__refrescoArmazon);
    window.__refrescoArmazon = setTimeout(refrescarArmazon, 120);
  });

  if (store.estado.ajustes.notificaciones) programarDelDia(store.tareas);
});
