/**
 * texto.js — Carga del texto bíblico y de las referencias cruzadas.
 *
 * Los datos están partidos por libro (datos/<version>/NN.json) para abrir
 * rápido: leer Juan solo descarga Juan. La búsqueda sí necesita la Biblia
 * entera; se carga una vez y queda en memoria (y en la caché del service
 * worker, así que funciona sin internet).
 */

import { idVerso, partesId } from './libros.js';

const BASE = new URL('../datos/', import.meta.url);
const cache = new Map();

function cargarJson(ruta) {
  if (!cache.has(ruta)) {
    cache.set(ruta, fetch(new URL(ruta, BASE)).then((r) => {
      if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
      return r.json();
    }).catch((e) => { cache.delete(ruta); throw e; }));
  }
  return cache.get(ruta);
}

const archivo = (b) => String(b).padStart(2, '0') + '.json';

let indice = null;
export async function cargarIndice() {
  indice = await cargarJson('indice.json');
  return indice;
}
export const indiceCargado = () => indice;

export const versiones = () => indice?.versiones || [];
export const version = (id) => versiones().find((v) => v.id === id);

/** ¿Esta versión tiene este libro? (el hebreo solo el AT, el griego solo el NT) */
export function tieneLibro(idVersion, b) {
  if (idVersion === 'wlc') return b <= 39;
  if (idVersion === 'tr') return b >= 40;
  return true;
}

/** Capítulos de un libro: capitulos[c-1][v-1] = texto. */
export async function libroCompleto(idVersion, b) {
  if (!tieneLibro(idVersion, b)) return null;
  return cargarJson(`${idVersion}/${archivo(b)}`);
}

export async function capitulo(idVersion, b, c) {
  const libro = await libroCompleto(idVersion, b);
  return libro?.[c - 1] || [];
}

/** Número de versículos del capítulo según el índice (RV1909). */
export function versiculosEn(b, c) {
  return indice?.versiculos?.[b - 1]?.[c - 1] || 0;
}

/** Texto de un rango de versículos (puede cruzar capítulos). */
export async function textoRango(idVersion, desde, hasta = desde) {
  const a = partesId(desde), z = partesId(hasta);
  const libro = await libroCompleto(idVersion, a.b);
  if (!libro) return [];
  const salida = [];
  for (let c = a.c; c <= (a.b === z.b ? z.c : a.c); c++) {
    const caps = libro[c - 1] || [];
    const v1 = c === a.c ? a.v : 1;
    const v2 = c === z.c && a.b === z.b ? Math.min(z.v, caps.length) : caps.length;
    for (let v = v1; v <= v2; v++) if (caps[v - 1]) salida.push({ id: idVerso(a.b, c, v), c, v, texto: caps[v - 1] });
    if (salida.length > 200) break;
  }
  return salida;
}

/** Lectura síncrona de un versículo ya cargado (o undefined). Para listas largas. */
const cargados = new Map();
export function textoSiCargado(idVersion, id) {
  const { b, c, v } = partesId(id);
  return cargados.get(`${idVersion}/${b}`)?.[c - 1]?.[v - 1];
}

/** Toda la Biblia de una versión (para buscar). Avisa del progreso. */
export async function bibliaCompleta(idVersion, alAvanzar) {
  const libros = new Array(66);
  let hechos = 0;
  const tareas = [];
  for (let b = 1; b <= 66; b++) {
    if (!tieneLibro(idVersion, b)) { hechos++; continue; }
    tareas.push(libroCompleto(idVersion, b).then((l) => {
      libros[b - 1] = l;
      cargados.set(`${idVersion}/${b}`, l);
      alAvanzar?.(++hechos / 66);
    }));
  }
  await Promise.all(tareas);
  return libros;
}

/** Deja un libro en el mapa síncrono (lo usa el lector al abrir un capítulo). */
export async function precargar(idVersion, b) {
  const l = await libroCompleto(idVersion, b);
  if (l) cargados.set(`${idVersion}/${b}`, l);
  return l;
}

/**
 * Referencias cruzadas de un versículo: [{ desde, hasta, votos }], ordenadas
 * de la más votada a la menos.
 */
export async function referenciasDe(id) {
  const { b, c, v } = partesId(id);
  const datos = await cargarJson(`xref/${archivo(b)}`);
  return (datos[`${c}:${v}`] || []).map(([desde, hasta, votos]) => ({ desde, hasta: hasta || desde, votos }));
}

/** Cuántas referencias tiene cada versículo del capítulo (para el indicador al margen). */
export async function referenciasPorVerso(b, c) {
  const datos = await cargarJson(`xref/${archivo(b)}`);
  const salida = {};
  const prefijo = `${c}:`;
  for (const clave of Object.keys(datos)) {
    if (clave.startsWith(prefijo)) salida[Number(clave.slice(prefijo.length))] = datos[clave].length;
  }
  return salida;
}
