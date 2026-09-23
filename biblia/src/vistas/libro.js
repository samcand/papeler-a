/**
 * libro.js (vista) — Introducción a un libro de la Biblia (#/libro/45) y la
 * tarjeta resumida que aparece en la guía de cada capítulo.
 */

import { el, render } from '../ui.js';
import { LIBROS, seccionDe } from '../libros.js';
import { parsear, aClave, formatear } from '../referencias.js';
import { enLinea } from '../notas.js';
import { introduccion } from '../introducciones.js';
import { almacen } from '../almacen.js';

const enlaceCita = (cita) => {
  const r = parsear(cita);
  return r ? el('a', { class: 'ref', href: `#/leer/${aClave(r)}`, dataset: { ref: aClave(r) } }, formatear(r, { abreviado: true })) : cita;
};

/** Datos de la introducción como lista de definiciones. Las citas del texto se vuelven enlaces. */
function ficha(i) {
  const fila = (etiqueta, valor) => (valor && valor !== '—' ? [el('dt', {}, etiqueta), el('dd', { html: enLinea(valor) })] : null);
  return el('dl', { class: 'ficha-libro' },
    fila('Autor', i.autor), fila('Fecha', i.fecha), fila('Destinatarios', i.destinatarios), fila('Género', i.genero),
    fila('Propósito', i.proposito), fila('Tema', i.tema), fila('Cristo en el libro', i.cristo), fila('Debates', i.debate));
}

function estructura(i, b) {
  return el('ol', { class: 'estructura-libro' }, i.estructura.map(([titulo, cita]) => {
    const r = parsear(cita);
    return el('li', {}, el('span', {}, titulo), ' ', r ? el('a', { class: 'ref', href: `#/leer/${aClave(r)}`, dataset: { ref: aClave(r) } }, formatear(r, { abreviado: true }).replace(`${LIBROS[b - 1].abrev} `, '')) : cita);
  }));
}

/** Tarjeta para la guía del capítulo: tema, versículo clave y estructura, con enlace a la ficha completa. */
export function tarjetaIntroduccion(b) {
  const i = introduccion(b);
  if (!i) return null;
  return el('section', { class: 'bloque' },
    el('details', { class: 'intro-libro', open: almacen.ajustes.introAbierta ? true : null, onToggle: (e) => almacen.ajustar({ introAbierta: e.currentTarget.open }) },
      el('summary', {}, el('h3', { class: 'intro-titulo' }, `Introducción a ${LIBROS[b - 1].nombre}`)),
      el('p', { class: 'small' }, el('strong', {}, 'Tema: '), i.tema),
      el('p', { class: 'small' }, el('strong', {}, 'Versículo clave: '), enlaceCita(i.clave)),
      el('p', { class: 'small tenue' }, i.autor, ' · ', i.fecha),
      estructura(i, b),
      el('a', { class: 'btn chico', href: `#/libro/${b}` }, 'Introducción completa →')));
}

export function vistaLibro(app, ruta) {
  const b = Number(ruta.partes[0]) || 1;
  const L = LIBROS[b - 1];
  const i = introduccion(b);
  if (!L || !i) { location.hash = '#/libro/1'; return; }
  const anterior = LIBROS[b - 2], siguiente = LIBROS[b];
  render(app, el('div', { class: 'pagina angosta' },
    el('div', { class: 'vecinos' },
      anterior ? el('a', { class: 'btn chico', href: `#/libro/${b - 1}` }, `← ${anterior.nombre}`) : el('span'),
      el('select', { class: 'input chico', onChange: (e) => { location.hash = `#/libro/${e.target.value}`; } },
        LIBROS.map((l) => el('option', { value: l.n, selected: l.n === b }, l.nombre))),
      siguiente ? el('a', { class: 'btn chico', href: `#/libro/${b + 1}` }, `${siguiente.nombre} →`) : el('span')),
    el('div', { class: 'panel-sub' }, `${L.testamento === 'AT' ? 'Antiguo' : 'Nuevo'} Testamento · ${seccionDe(b).nombre} · ${L.capitulos} ${L.capitulos === 1 ? 'capítulo' : 'capítulos'}`),
    el('h1', { class: 'titulo-libro' }, L.nombre),
    el('div', { class: 'devo-idea' }, el('span', { class: 'panel-sub' }, 'Versículo clave'), el('p', {}, enlaceCita(i.clave))),
    ficha(i),
    el('h2', {}, 'Estructura'),
    estructura(i, b),
    el('div', { class: 'acciones' },
      el('a', { class: 'btn primario', href: `#/leer/${b}.1` }, `📖 Leer ${L.nombre}`),
      el('a', { class: 'btn', href: `#/concordancia?v=${almacen.ajustes.principal}` }, '📇 Concordancia'),
      el('a', { class: 'btn', href: `#/buscar?en=l${b}` }, `🔎 Buscar en ${L.nombre}`)),
    el('p', { class: 'tenue small' }, 'Se presenta la posición tradicional y, en "Debates", las alternativas principales de la erudición. Las fechas son aproximadas.')));
}
