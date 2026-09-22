/**
 * referencias.js — Entender y escribir citas bíblicas en español.
 *
 * Acepta lo que la gente escribe de verdad: "Juan 3:16", "jn 3.16-18",
 * "1 Co 13", "Primera de Corintios 13:4", "Sal 23", "Ro 8:28–9:1", "Judas 3"
 * (libro de un solo capítulo), y listas "Jn 3:16, 18; Ro 5:8".
 *
 * Una referencia es { b, c, v, c2, v2 }: v nulo significa capítulo completo.
 */

import { LIBROS, libro, idVerso, partesId } from './libros.js';

export function normalizar(texto) {
  return String(texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const ORDINALES = [
  [/^(primera|primer|primero|1ra|1ro|1a|1o|1º|1ª|i)(\s+de)?\s+/, '1'],
  [/^(segunda|segundo|2da|2do|2a|2o|2º|2ª|ii)(\s+de)?\s+/, '2'],
  [/^(tercera|tercero|3ra|3ro|3a|3o|3º|3ª|iii)(\s+de)?\s+/, '3'],
];

/** "Primera de Corintios" → "1corintios"; "1 Co." → "1co". */
export function claveLibro(texto) {
  let t = normalizar(texto).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  for (const [re, n] of ORDINALES) {
    if (re.test(t)) { t = t.replace(re, n); break; }
  }
  return t.replace(/\s+/g, '');
}

const INDICE = new Map();
for (const l of LIBROS) {
  for (const nombre of [l.nombre, l.abrev, l.osis, ...l.alias]) {
    const k = claveLibro(nombre);
    if (!INDICE.has(k)) INDICE.set(k, l.n);
  }
}
const NOMBRES = LIBROS.map((l) => [claveLibro(l.nombre), l.n]);

/** Número de libro (1-66) a partir de un nombre o abreviatura; 0 si no se reconoce. */
export function buscarLibro(texto) {
  const k = claveLibro(texto);
  if (!k) return 0;
  if (INDICE.has(k)) return INDICE.get(k);
  if (k.length < 2) return 0;
  const candidatos = NOMBRES.filter(([nombre]) => nombre.startsWith(k));
  return candidatos.length === 1 ? candidatos[0][1] : 0;
}

const RE_CITA = /^\s*((?:[123]\s*)?[^\d\s].*?)\.?\s*(\d+)(?:\s*[:.]\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*[:.]\s*(\d+))?)?\s*$/i;

/** Convierte una cita escrita en { b, c, v, c2, v2 }, o null si no se entiende. */
export function parsear(texto) {
  const m = RE_CITA.exec(String(texto).trim());
  if (!m) return null;
  const b = buscarLibro(m[1]);
  if (!b) return null;
  const L = libro(b);
  let [c, v, x, y] = [m[2], m[3], m[4], m[5]].map((n) => (n == null ? null : Number(n)));

  // Libros de un capítulo: "Judas 3" es el versículo 3, no el capítulo 3.
  if (L.capitulos === 1 && v == null && !(c === 1 && x == null)) {
    if (x != null && y == null) return valida({ b, c: 1, v: c, c2: 1, v2: x });
    return valida({ b, c: 1, v: c, c2: 1, v2: c });
  }
  if (v == null) {
    // "Jn 3" o "Jn 3-4": capítulos completos
    return valida({ b, c, v: null, c2: x ?? c, v2: null });
  }
  if (x == null) return valida({ b, c, v, c2: c, v2: v });
  if (y == null) return valida({ b, c, v, c2: c, v2: x });   // "3:16-18"
  return valida({ b, c, v, c2: x, v2: y });                  // "3:16-4:2"
}

function valida(r) {
  const L = libro(r.b);
  if (r.c < 1 || r.c > L.capitulos) return null;
  if (r.c2 < r.c || r.c2 > L.capitulos) r.c2 = r.c;
  if (r.v != null && r.v < 1) return null;
  if (r.v != null && r.c2 === r.c && r.v2 < r.v) r.v2 = r.v;
  return r;
}

/** "Jn 3:16, 18; Ro 5:8; 6:23" → varias referencias (lo que no nombra libro sigue el anterior). */
export function parsearLista(texto) {
  const salida = [];
  let anterior = null;
  for (const [i, parte] of String(texto).split(';').entries()) {
    for (const [j, trozo] of parte.split(',').entries()) {
      const t = trozo.trim();
      if (!t) continue;
      let r = parsear(t);
      if (!r && anterior && /^\d+[:.]\d+/.test(t)) {
        // "24:3-4" después de "Pr 14:1": mismo libro, otro capítulo
        r = parsear(`${libro(anterior.b).nombre} ${t}`);
      } else if (!r && anterior && /^\d+(\s*[-–]\s*\d+)?$/.test(t)) {
        // "18" o "18-20": tras coma, versículos del mismo capítulo; tras punto y coma, capítulos
        const [a, z] = t.split(/[-–]/).map((n) => Number(n.trim()));
        const nuevoCapitulo = anterior.v == null || (j === 0 && i > 0);
        r = nuevoCapitulo
          ? valida({ b: anterior.b, c: a, v: null, c2: z || a, v2: null })
          : valida({ b: anterior.b, c: anterior.c2, v: a, c2: anterior.c2, v2: z || a });
      }
      if (r) { salida.push(r); anterior = r; }
    }
  }
  return salida;
}

/** Límites numéricos de una referencia. Capítulo completo termina en el versículo 999. */
export function rango(r) {
  return { desde: idVerso(r.b, r.c, r.v ?? 1), hasta: idVerso(r.b, r.c2 ?? r.c, r.v2 ?? r.v ?? 999) };
}

export function refDesdeRango(desde, hasta = desde) {
  const a = partesId(desde), z = partesId(hasta);
  if (a.b !== z.b) return { b: a.b, c: a.c, v: a.v, c2: a.c, v2: a.v };
  if (z.v >= 999 && a.v <= 1) return { b: a.b, c: a.c, v: null, c2: z.c, v2: null };
  return { b: a.b, c: a.c, v: a.v, c2: z.c, v2: z.v >= 999 ? a.v : z.v };
}

/** Escribe una referencia: "Juan 3:16-18", "1 Co 13" (abreviado), "Romanos 8:28–9:1". */
export function formatear(r, { abreviado = false } = {}) {
  if (!r) return '';
  const L = libro(r.b);
  const nombre = abreviado ? L.abrev : L.nombre;
  const c2 = r.c2 ?? r.c;
  if (r.v == null) return c2 !== r.c ? `${nombre} ${r.c}-${c2}` : `${nombre} ${r.c}`;
  if (c2 !== r.c) return `${nombre} ${r.c}:${r.v}–${c2}:${r.v2}`;
  if (r.v2 != null && r.v2 !== r.v) return `${nombre} ${r.c}:${r.v}-${r.v2}`;
  return `${nombre} ${r.c}:${r.v}`;
}

export const formatearId = (id, opts) => { const p = partesId(id); return formatear({ ...p, c2: p.c, v2: p.v }, opts); };
export const formatearRango = (desde, hasta, opts) => formatear(refDesdeRango(desde, hasta), opts);

/** Para la URL: 43.3.16-18 */
export function aClave(r) {
  const base = `${r.b}.${r.c}` + (r.v != null ? `.${r.v}` : '');
  if (r.v == null) return (r.c2 ?? r.c) !== r.c ? `${base}-${r.c2}` : base;
  if ((r.c2 ?? r.c) !== r.c) return `${base}-${r.c2}.${r.v2}`;
  return r.v2 != null && r.v2 !== r.v ? `${base}-${r.v2}` : base;
}

export function deClave(clave) {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-(\d+)(?:\.(\d+))?)?$/.exec(String(clave || ''));
  if (!m) return null;
  const [b, c, v, x, y] = m.slice(1).map((n) => (n == null ? null : Number(n)));
  if (b < 1 || b > 66) return null;
  if (v == null) return valida({ b, c, v: null, c2: x ?? c, v2: null });
  if (x == null) return valida({ b, c, v, c2: c, v2: v });
  if (y == null) return valida({ b, c, v, c2: c, v2: x });
  return valida({ b, c, v, c2: x, v2: y });
}

/**
 * Encuentra citas dentro de un texto libre (tus notas) para volverlas enlaces.
 * Para no confundir "he 2 hijos" con Hebreos 2, el libro debe ir con mayúscula
 * o la cita debe llevar dos puntos ("he 2:3").
 */
const RE_DETECTAR = /((?:\b[123]\s?)?\b[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{1,20}\.?)\s(\d{1,3})(?:[:.](\d{1,3})(?:\s?[-–]\s?(\d{1,3})(?:[:.](\d{1,3}))?)?|\s?[-–]\s?(\d{1,3}))?(?![\d:])/g;

export function detectar(texto) {
  const hallazgos = [];
  const re = new RegExp(RE_DETECTAR.source, 'g');
  const s = String(texto);
  let m;
  while ((m = re.exec(s))) {
    const r = citaValida(m);
    if (r) {
      hallazgos.push({ inicio: m.index, fin: m.index + m[0].length, texto: m[0], ref: r });
    } else {
      // "también 1 Jn 4:10": si "también 1" no es cita, reintenta desde la palabra siguiente
      re.lastIndex = m.index + m[1].length;
    }
  }
  return hallazgos;
}

function citaValida(m) {
  const nombre = m[1];
  const conDosPuntos = m[3] != null;
  const letra = nombre.replace(/^[123]\s?/, '')[0];
  if (!conDosPuntos && letra !== letra.toUpperCase()) return null;
  if (!buscarLibro(nombre)) return null;
  return parsear(m[0]);
}
