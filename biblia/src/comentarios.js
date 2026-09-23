/**
 * comentarios.js — Comentarios clásicos de dominio público (Matthew Henry,
 * Jamieson-Fausset-Brown) ordenados por versículo. Los datos se generan con
 * tools/biblia-comentarios.mjs a partir de los módulos OSIS de CrossWire.
 */

import { cargarJson } from './texto.js';
import { partesId } from './libros.js';

export const COMENTARIOS = [
  { id: 'mhc', nombre: 'Matthew Henry — Comentario completo', abrev: 'M. Henry', año: '1706–1721', idioma: 'en',
    descripcion: 'El clásico devocional y expositivo puritano: rico en aplicación pastoral y bosquejos homiléticos.' },
  { id: 'jfb', nombre: 'Jamieson, Fausset y Brown', abrev: 'JFB', año: '1871', idioma: 'en',
    descripcion: 'Crítico y explicativo, versículo por versículo: gramática, historia, geografía y variantes.' },
  { id: 'mhcc', nombre: 'Matthew Henry — Conciso', abrev: 'M. Henry (conciso)', año: '1706–1721', idioma: 'en',
    descripcion: 'La síntesis de Matthew Henry: el sentido y la aplicación de cada sección en pocas líneas.' },
];

export const comentario = (id) => COMENTARIOS.find((c) => c.id === id) || COMENTARIOS[0];

export const libroComentario = (id, b) => cargarJson(`com/${id}/${String(b).padStart(2, '0')}.json`);

/**
 * Lo que dice un comentario sobre un rango: la introducción del capítulo (si
 * el rango empieza al principio o se pide) y las secciones que lo tocan.
 *   → { intro, secciones: [{ v1, v2, html }] }
 */
export async function comentarioSobre(id, desde, hasta = desde, { conIntro = false } = {}) {
  const a = partesId(desde), z = partesId(hasta);
  const libro = await libroComentario(id, a.b).catch(() => null);
  const cap = libro?.[a.c];
  if (!cap) return { intro: '', secciones: [] };
  const v1 = a.v, v2 = z.c === a.c ? z.v : 999;
  const secciones = (cap.s || [])
    .filter(([x1, x2]) => x1 <= v2 && x2 >= v1)
    .map(([x1, x2, html]) => ({ v1: x1, v2: x2, html }));
  return { intro: conIntro || !secciones.length ? cap.i || '' : '', secciones };
}

/** Convierte el HTML del comentario en nodos, con las citas enlazadas al lector. */
export function htmlANodos(html) {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = html;
  for (const a of plantilla.content.querySelectorAll('a.ref[data-ref]')) a.setAttribute('href', `#/leer/${a.dataset.ref}`);
  // Solo el marcado que genera tools/biblia-comentarios.mjs; cualquier otra cosa se descarta
  for (const n of plantilla.content.querySelectorAll('*')) {
    if (!['P', 'H5', 'B', 'I', 'U', 'SUP', 'UL', 'LI', 'A', 'SPAN', 'BR'].includes(n.tagName)) n.replaceWith(...n.childNodes);
    for (const at of [...n.attributes]) if (!['class', 'data-ref', 'href'].includes(at.name)) n.removeAttribute(at.name);
  }
  return plantilla.content;
}
