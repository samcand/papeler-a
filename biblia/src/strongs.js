/**
 * strongs.js — Números Strong para cada palabra de la RV1909.
 *
 * La alineación es automática (tools/biblia-strong.mjs aprende de los textos
 * hebreo y griego qué palabra española corresponde a cada palabra original):
 * sirve para llegar del español al léxico con un toque, no como texto crítico.
 */

import { cargarJson } from './texto.js';

export const VERSION_CON_STRONG = 'rv1909';

const libroStrong = (b) => cargarJson(`rvs/${String(b).padStart(2, '0')}.json`);
export const traducciones = () => cargarJson('rvs/traducciones.json');

/** Palabras del versículo con su posición: [{ w, k, inicio, fin }] */
export function palabrasDe(texto) {
  const salida = [];
  const re = /\p{L}+/gu;
  let m;
  while ((m = re.exec(texto))) salida.push({ w: m[0], k: salida.length, inicio: m.index, fin: m.index + m[0].length });
  return salida;
}

/** Números Strong del capítulo: [versículo][palabra] = 'H430' | '' */
export async function strongsCapitulo(b, c) {
  const libro = await libroStrong(b);
  const letra = b <= 39 ? 'H' : 'G';
  return (libro[c - 1] || []).map((cadena) => String(cadena || '').split(',').map((n) => (n ? letra + n : '')));
}

/**
 * Parte un trozo de texto (que empieza en `inicio` dentro del versículo) en
 * pedazos: palabras con número y el resto. Devuelve [{ texto, k?, s? }].
 */
export function trocearConStrong(texto, inicio, palabras, numeros) {
  const fin = inicio + texto.length;
  const salida = [];
  let cursor = inicio;
  for (const p of palabras) {
    if (p.fin <= inicio || p.inicio >= fin) continue;
    const s = numeros[p.k];
    if (!s) continue;
    const a = Math.max(p.inicio, inicio), z = Math.min(p.fin, fin);
    if (a > cursor) salida.push({ texto: texto.slice(cursor - inicio, a - inicio) });
    salida.push({ texto: texto.slice(a - inicio, z - inicio), k: p.k, s, fin: z === p.fin });
    cursor = z;
  }
  if (cursor < fin) salida.push({ texto: texto.slice(cursor - inicio) });
  return salida;
}

/** Versículos de la RV1909 donde una palabra traduce el número dado: [{ id, palabras: [k…] }] */
export async function versosConStrong(numero, b) {
  const caps = await strongsCapitulosLibro(b);
  const salida = [];
  caps.forEach((cap, c) => cap.forEach((nums, v) => {
    const ks = nums.flatMap((s, k) => (s === numero ? [k] : []));
    if (ks.length) salida.push({ id: b * 1_000_000 + (c + 1) * 1000 + v + 1, palabras: ks });
  }));
  return salida;
}

async function strongsCapitulosLibro(b) {
  const libro = await libroStrong(b);
  const letra = b <= 39 ? 'H' : 'G';
  return libro.map((cap) => cap.map((cadena) => String(cadena || '').split(',').map((n) => (n ? letra + n : ''))));
}
