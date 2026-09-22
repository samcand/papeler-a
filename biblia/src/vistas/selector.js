/**
 * selector.js — Elegir libro y capítulo: primero el libro (AT / NT), luego
 * la cuadrícula de capítulos, con los ya leídos marcados.
 */

import { el, render, $ } from '../ui.js';
import { LIBROS, SECCIONES } from '../libros.js';
import { almacen } from '../almacen.js';

/** Lista de libros agrupada por secciones. `alElegir(b)` recibe el número de libro. */
export function listaLibros(alElegir, actual) {
  const grupo = (desde, hasta, titulo) => el('div', { class: 'grupo-libros' },
    el('h3', {}, titulo),
    SECCIONES.filter((s) => s.desde >= desde && s.hasta <= hasta).map((s) => el('div', { class: 'seccion-libros' },
      el('div', { class: 'seccion-nombre' }, s.nombre),
      el('div', { class: 'libros' }, LIBROS.slice(s.desde - 1, s.hasta).map((l) =>
        el('button', {
          type: 'button', class: `libro-btn ${l.n === actual ? 'actual' : ''}`, title: l.nombre,
          onClick: () => alElegir(l.n),
        }, el('span', { class: 'abrev' }, l.abrev), el('span', { class: 'nombre' }, l.nombre)))))));
  return el('div', { class: 'lista-libros' },
    grupo(1, 39, 'Antiguo Testamento'),
    grupo(40, 66, 'Nuevo Testamento'));
}

export function cuadriculaCapitulos(b, alElegir, actual) {
  const l = LIBROS[b - 1];
  return el('div', { class: 'capitulos' }, Array.from({ length: l.capitulos }, (_, i) => {
    const c = i + 1;
    return el('button', {
      type: 'button',
      class: `cap-btn ${almacen.leido(b, c) ? 'leido' : ''} ${c === actual ? 'actual' : ''}`,
      title: `${l.nombre} ${c}${almacen.leido(b, c) ? ' (leído)' : ''}`,
      onClick: () => alElegir(c),
    }, c);
  }));
}

/** Ventana de selección. Abre en el libro actual y lleva al capítulo elegido. */
export function elegirPasaje(bActual, cActual) {
  const dialogo = $('#dialogo');
  const cuerpo = el('div', { class: 'selector-cuerpo' });

  const irA = (b, c) => { dialogo.close(); location.hash = `#/leer/${b}.${c}`; };
  const verLibros = () => {
    render(cuerpo, listaLibros((b) => (LIBROS[b - 1].capitulos === 1 ? irA(b, 1) : verCapitulos(b)), bActual));
  };
  const verCapitulos = (b) => {
    render(cuerpo,
      el('div', { class: 'selector-cab' },
        el('button', { type: 'button', class: 'btn chico', onClick: verLibros }, '← Libros'),
        el('h3', {}, LIBROS[b - 1].nombre)),
      cuadriculaCapitulos(b, (c) => irA(b, c), b === bActual ? cActual : 0));
  };

  render(dialogo, el('div', { class: 'selector' },
    el('header', { class: 'dialogo-cab' },
      el('h2', {}, 'Ir a…'),
      el('button', { type: 'button', class: 'btn icono', title: 'Cerrar', onClick: () => dialogo.close() }, '✕')),
    cuerpo));
  verLibros();
  dialogo.showModal();
}
