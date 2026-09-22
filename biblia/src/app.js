/**
 * app.js — Arranque y rutas de la app de estudio bíblico.
 *
 *   #/leer/43.3.16      lector (Juan 3:16)
 *   #/buscar?q=gracia   búsqueda en todo el texto
 *   #/palabra/amor      estudio de una palabra
 *   #/cuaderno/notas    notas, resaltados y marcadores
 *   #/plan              planes de lectura y avance
 *   #/familia/esposa    devocionales para la familia
 *   #/biblioteca        tus libros, con sus citas bíblicas indexadas
 *   #/ajustes           apariencia, versiones y respaldo
 */

import { $, $$, render, el, toast } from './ui.js';
import { almacen } from './almacen.js';
import { cargarIndice } from './texto.js';
import { parsearLista, aClave } from './referencias.js';
import { vistaLector } from './vistas/lector.js';
import { vistaBuscar } from './vistas/buscar.js';
import { vistaPalabra } from './vistas/palabra.js';
import { vistaCuaderno } from './vistas/cuaderno.js';
import { vistaPlan } from './vistas/plan.js';
import { vistaAjustes } from './vistas/ajustes.js';
import { vistaFamilia } from './vistas/familia.js';
import { vistaBiblioteca } from './vistas/biblioteca.js';
import { instalarVistazo } from './vistas/vistazo.js';

const RUTAS = {
  leer: vistaLector,
  buscar: vistaBuscar,
  palabra: vistaPalabra,
  cuaderno: vistaCuaderno,
  plan: vistaPlan,
  familia: vistaFamilia,
  biblioteca: vistaBiblioteca,
  ajustes: vistaAjustes,
};

let limpiarVista = null;

function leerRuta() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [camino, consulta = ''] = hash.split('?');
  const [nombre = 'leer', ...resto] = camino.split('/');
  return { nombre: RUTAS[nombre] ? nombre : 'leer', partes: resto.map(decodeURIComponent), params: new URLSearchParams(consulta) };
}

function ir(ruta) {
  if (location.hash === ruta) enrutar();
  else location.hash = ruta;
}

async function enrutar() {
  const ruta = leerRuta();
  for (const a of $$('.pestanas a')) a.classList.toggle('activa', a.dataset.ruta === ruta.nombre);
  const app = $('#app');
  // El lector se reutiliza al cambiar de capítulo: así no parpadea ni pierde el panel
  if (limpiarVista && !(ruta.nombre === 'leer' && app.dataset.vista === 'leer')) {
    limpiarVista();
    limpiarVista = null;
  }
  app.dataset.vista = ruta.nombre;
  document.body.dataset.vista = ruta.nombre;
  try {
    const resultado = await RUTAS[ruta.nombre](app, ruta);
    if (typeof resultado === 'function') limpiarVista = resultado;
  } catch (e) {
    console.error(e);
    render(app, el('div', { class: 'vacio' },
      el('h2', {}, 'Algo salió mal'),
      el('p', {}, String(e.message || e)),
      el('p', { class: 'tenue' }, 'Si abriste el archivo con doble clic, ábrelo con un servidor: npm start')));
  }
}

function aplicarAjustes() {
  const a = almacen.ajustes;
  const raiz = document.documentElement;
  raiz.dataset.tema = a.tema;
  raiz.dataset.fuente = a.fuente;
  raiz.style.setProperty('--letra', `${a.letra}px`);
  const color = { oscuro: '#14161b', claro: '#f7f5f0', sepia: '#f3e9d2' }[a.tema];
  $('meta[name="theme-color"]')?.setAttribute('content', color);
}

function cajaIr() {
  const form = $('#ir');
  const entrada = $('#ir-texto');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = entrada.value.trim();
    if (!texto) return;
    const refs = parsearLista(texto);
    if (refs.length) {
      ir(`#/leer/${aClave(refs[0])}`);
    } else {
      ir(`#/buscar?q=${encodeURIComponent(texto)}`);
    }
    entrada.value = '';
    entrada.blur();
  });
  document.addEventListener('keydown', (e) => {
    const escribiendo = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === '/' && !escribiendo) { e.preventDefault(); entrada.focus(); }
  });
}

async function iniciar() {
  aplicarAjustes();
  almacen.alCambiar(aplicarAjustes);
  cajaIr();
  instalarVistazo();
  try {
    await cargarIndice();
  } catch (e) {
    render($('#app'), el('div', { class: 'vacio' },
      el('h2', {}, 'No se encontraron los datos de la Biblia'),
      el('p', {}, 'Abre la app con un servidor (npm start) y verifica que exista la carpeta biblia/datos.'),
      el('p', { class: 'tenue' }, 'Para regenerarlos: node tools/biblia-datos.mjs')));
    return;
  }
  window.addEventListener('hashchange', enrutar);
  if (!location.hash) {
    const p = almacen.estado.posicion;
    history.replaceState(null, '', `#/leer/${p.b}.${p.c}${p.v ? `.${p.v}` : ''}`);
  }
  enrutar();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'estudio-biblico.v1') toast('Hay cambios de otra pestaña: recarga para verlos');
  });
}

iniciar();
