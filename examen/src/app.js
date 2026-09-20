/**
 * app.js — Router y armazón. Cinco pantallas, sin framework y sin build.
 */

import { el, pintar, $ } from './ui.js';
import { store } from './store.js';
import { inicioVista } from './vistas/inicio.js';
import { temarioVista } from './vistas/temario.js';
import { practicaVista } from './vistas/practica.js';
import { simulacroVista } from './vistas/simulacro.js';
import { progresoVista } from './vistas/progreso.js';
import { escrituraVista } from './vistas/escritura.js';

const RUTAS = [
  { ruta: /^\/?$/, vista: inicioVista, nav: 'inicio' },
  { ruta: /^\/temario(?:\/([^/]+))?$/, vista: temarioVista, claves: ['asignatura'], nav: 'temario' },
  { ruta: /^\/practicar(?:\/([^/]+))?$/, vista: practicaVista, claves: ['asignatura'], nav: 'practicar' },
  { ruta: /^\/simulacro$/, vista: simulacroVista, nav: 'simulacro' },
  { ruta: /^\/escribir$/, vista: escrituraVista, nav: 'escribir' },
  { ruta: /^\/progreso$/, vista: progresoVista, nav: 'progreso' },
];

const NAV = [
  { href: '#/', id: 'inicio', texto: 'Inicio' },
  { href: '#/temario', id: 'temario', texto: 'Temario' },
  { href: '#/practicar', id: 'practicar', texto: 'Practicar' },
  { href: '#/simulacro', id: 'simulacro', texto: 'Simulacro' },
  { href: '#/escribir', id: 'escribir', texto: 'Escribir' },
  { href: '#/progreso', id: 'progreso', texto: 'Progreso' },
];

let limpiar = null;

function rutaActual() {
  return ((location.hash || '#/').slice(1) || '/').split('?')[0];
}

function consulta() {
  const partes = (location.hash || '').split('?');
  if (partes.length < 2) return {};
  const salida = {};
  for (const [k, v] of new URLSearchParams(partes.slice(1).join('?'))) salida[k] = v;
  return salida;
}

function cabecera(activo) {
  return el('header', { class: 'cabecera' },
    el('a', { class: 'marca', href: '#/' },
      el('span', { class: 'logo' }, '🎓'),
      el('span', {}, el('b', {}, 'Ingreso'), el('span', {}, 'Preparación para la prueba de admisión'))),
    el('nav', { class: 'nav' },
      NAV.map((n) => el('a', { href: n.href, class: n.id === activo ? 'activo' : '' }, n.texto))));
}

function render() {
  const raiz = $('#app');
  const camino = rutaActual();
  limpiar?.();
  limpiar = null;

  for (const entrada of RUTAS) {
    const encontrado = camino.match(entrada.ruta);
    if (!encontrado) continue;
    const params = { ...consulta() };
    (entrada.claves || []).forEach((clave, i) => {
      if (encontrado[i + 1]) params[clave] = decodeURIComponent(encontrado[i + 1]);
    });
    const contenido = el('div');
    pintar(raiz, cabecera(entrada.nav), contenido);
    // Una vista puede devolver una función para soltar temporizadores o teclado.
    const salida = entrada.vista(contenido, params);
    limpiar = typeof salida === 'function' ? salida : null;
    return;
  }

  pintar(raiz, cabecera(null),
    el('section', { class: 'tarjeta' },
      el('h2', {}, 'Esa página no existe'),
      el('p', { class: 'sub' }, 'Vuelve al inicio y sigue desde ahí.'),
      el('a', { class: 'boton primario', href: '#/' }, 'Ir al inicio')));
}

function aplicarTema() {
  document.documentElement.dataset.tema = store.state.ajustes.tema || 'oscuro';
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => { aplicarTema(); render(); });

if (document.readyState !== 'loading') { aplicarTema(); render(); }

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin conexión o file://: da igual */ });
  });
}
