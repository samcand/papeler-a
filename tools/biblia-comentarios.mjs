/**
 * biblia-comentarios.mjs — Convierte comentarios clásicos de dominio público
 * (módulos OSIS de CrossWire) al formato de la app: un archivo por libro,
 * con la introducción de cada capítulo y las secciones por versículos.
 *
 *   node tools/biblia-comentarios.mjs             -> descarga de gitlab.com/crosswire-bible-society
 *   node tools/biblia-comentarios.mjs ./fuentes   -> usa mhc.osis.xml, mhcc.osis.xml, jfb.osis.xml locales
 *
 * Salida: biblia/datos/com/<id>/NN.json
 *   { "3": { "i": "<p>introducción del capítulo…</p>",
 *            "s": [[1, 21, "<p>comentario de 3:1-21…</p>"], …] } }
 * El HTML es un subconjunto fijo (p, h5, b, i, sup, u, ul, li, a.ref) que se
 * genera aquí mismo a partir del OSIS; nada del marcado original pasa sin filtrar.
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { libroPorOsis } from '../biblia/src/libros.js';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DESTINO = join(RAIZ, 'biblia', 'datos', 'com');
const LOCAL = process.argv[2] ? resolve(process.argv[2]) : null;
const GITLAB = 'https://gitlab.com/api/v4/projects/crosswire-bible-society%2F';

export const COMENTARIOS = [
  { id: 'mhc', nombre: 'Matthew Henry — Comentario completo (1706–1721)', abrev: 'Matthew Henry', idioma: 'en', porSecciones: true },
  { id: 'mhcc', nombre: 'Matthew Henry — Comentario conciso', abrev: 'M. Henry (conciso)', idioma: 'en', porSecciones: true },
  { id: 'jfb', nombre: 'Jamieson, Fausset y Brown (1871)', abrev: 'JFB', idioma: 'en' },
];

async function leer(id) {
  if (LOCAL) return readFile(join(LOCAL, `${id}.osis.xml`), 'utf8');
  console.log('  descargando', id);
  const r = await fetch(`${GITLAB}${id}/repository/files/${id}.osis.xml/raw?ref=HEAD`);
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  return r.text();
}

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const desescapar = (s) => s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e]);
const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const atributo = (tag, nombre) => (new RegExp(`\\b${nombre}="([^"]*)"`).exec(tag) || [])[1];

/** "John.3.16" → { b, c, v } */
function punto(osis) {
  const [lib, c, v] = String(osis).split('.');
  const b = libroPorOsis(lib);
  return b ? { b, c: Number(c) || 1, v: v == null ? null : Number(v) } : null;
}

/** osisRef "John.3.1-John.3.21" → clave de la app "43.3.1-21" (o null) */
export function claveDeOsis(ref) {
  const [a, z] = String(ref).split(/\s+/)[0].split('-');
  const p = punto(a);
  if (!p) return null;
  const q = z ? punto(z) : null;
  const base = `${p.b}.${p.c}${p.v != null ? `.${p.v}` : ''}`;
  if (!q || q.b !== p.b) return base;
  if (p.v == null) return q.c !== p.c ? `${base}-${q.c}` : base;
  if (q.c !== p.c) return `${base}-${q.c}.${q.v ?? 999}`;
  return q.v != null && q.v !== p.v ? `${base}-${q.v}` : base;
}

const HI = { bold: 'b', italic: 'i', super: 'sup', underline: 'u', 'small-caps': 'span class="vers"' };

/** Recorre el OSIS y reparte el HTML por libro → capítulo → sección. */
export function convertir(xml) {
  const libros = {};
  let b = 0, c = 0;
  let destino = null; // { html: [] }
  const pila = []; // etiquetas HTML abiertas que hay que cerrar
  const nuevaSeccion = (desde, hasta) => {
    const cap = ((libros[b] ||= {})[c] ||= { i: [], s: [] });
    const s = { v1: desde, v2: hasta, html: [] };
    cap.s.push(s);
    destino = s.html;
  };
  const alCapitulo = () => {
    const cap = ((libros[b] ||= {})[c] ||= { i: [], s: [] });
    destino = cap.i;
  };
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  let enCabecera = true;
  while ((m = re.exec(xml))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[5] != null) {
      if (!destino || enCabecera) continue;
      const t = escapar(desescapar(m[5]).replace(/\s+/g, ' '));
      if (t) destino.push(t);
      continue;
    }
    const [, cierre, nombre, attrs, sola] = m;
    const tag = m[0];
    if (nombre === 'header') { enCabecera = !cierre; continue; }
    if (enCabecera) continue;
    if (nombre === 'div' && !cierre && atributo(tag, 'type') === 'book') {
      b = libroPorOsis(atributo(tag, 'osisID')) || 0; c = 0; destino = null; continue;
    }
    if (!b) continue;
    if (nombre === 'chapter' && !cierre && atributo(tag, 'sID')) {
      const p = punto(atributo(tag, 'osisID') || atributo(tag, 'sID'));
      if (p && p.b === b) { c = p.c; alCapitulo(); }
      continue;
    }
    if (nombre === 'verse') {
      const ids = atributo(tag, 'osisID');
      if (!ids || !atributo(tag, 'sID')) continue;
      const lista = ids.split(/\s+/).map(punto).filter((p) => p && p.b === b && p.v != null);
      if (!lista.length) continue;
      const a = lista[0], z = lista[lista.length - 1];
      if (a.c !== c) { c = a.c; }
      nuevaSeccion(a.v, z.c === a.c ? z.v : 999);
      if (z.c !== a.c) for (let k = a.c + 1; k <= z.c; k++) ((libros[b] ||= {})[k] ||= { i: [], s: [] }).s.push({ v1: 1, v2: k === z.c ? z.v : 999, alias: destino });
      continue;
    }
    if (!destino) continue;
    let html = '';
    switch (nombre) {
      case 'p': html = cierre ? '</p>' : '<p>'; break;
      case 'title': html = cierre ? '</h5>' : '<h5>'; break;
      case 'lg': html = cierre ? '</p>' : '<p class="poema">'; break;
      case 'l': html = cierre ? '<br>' : ''; break;
      case 'lb': html = '<br>'; break;
      case 'table': html = cierre ? '</ul>' : '<ul class="c-bosquejo">'; break;
      case 'row': html = cierre ? '</li>' : '<li>'; break;
      case 'cell': if (!cierre && destino.at(-1) !== '<li>') html = ' — '; break;
      case 'note': html = cierre ? ']</span>' : '<span class="c-nota">['; break;
      case 'hi': {
        if (cierre) { html = `</${(pila.pop() || 'span').split(' ')[0]}>`; break; }
        if (sola) break;
        const t = HI[atributo(tag, 'type')] || 'span';
        pila.push(t);
        html = `<${t}>`;
        break;
      }
      case 'reference': {
        if (cierre) { html = pila.pop() === 'a' ? '</a>' : ''; break; }
        const clave = claveDeOsis(atributo(tag, 'osisRef') || '');
        if (clave) { pila.push('a'); html = `<a class="ref" data-ref="${clave}">`; } else pila.push('');
        break;
      }
      default: break;
    }
    if (html) destino.push(html);
  }
  return libros;
}

/** Cierra lo que quedó abierto y quita cierres huérfanos (los hitos de versículo caen dentro de párrafos). */
export function equilibrar(html) {
  const abiertas = [];
  let salida = html.replace(/<(\/?)(p|h5|ul|li|b|i|u|sup|a|span)\b[^>]*>/g, (tag, cierre, nombre) => {
    if (!cierre) { abiertas.push(nombre); return tag; }
    const k = abiertas.lastIndexOf(nombre);
    if (k < 0) return '';
    const extra = abiertas.splice(k).slice(1).reverse().map((n) => `</${n}>`).join('');
    return extra + tag;
  });
  salida += abiertas.reverse().map((n) => `</${n}>`).join('');
  // texto suelto al principio (venía de un párrafo abierto en la sección anterior)
  return salida.replace(/^(?:[^<]|<\/?(?:b|i|a|span|sup|u|br)\b[^>]*>)+(?=<(?:p|h5|ul)\b|$)/, (m) => (m.trim() ? `<p>${m}</p>` : ''));
}

/** Limpia el HTML: párrafos vacíos, espacios sobrantes, encabezados de "CHAPTER 3". */
export function pulir(html, { sinTextoBiblico = false } = {}) {
  let t = equilibrar(html.replace(/\s+/g, ' '))
    .replace(/<h5>\s*(?:chapter|cap[ií]tulo)\s+[ivxlc\d]+\.?\s*<\/h5>/gi, '');
  // Matthew Henry copia el texto KJV del pasaje antes de comentarlo: la app ya lo muestra
  if (sinTextoBiblico) t = t.replace(/<p>\s*<sup>\d+<\/sup>[\s\S]*?<\/p>/g, '');
  for (let k = 0; k < 3; k++) t = t.replace(/<(p|h5|b|i|u|sup|li|ul|span|a)\b[^>]*>\s*<\/\1>/g, '');
  return t.replace(/\s*(<\/?(?:p|h5|li|ul)\b[^>]*>)\s*/g, '$1').trim();
}

async function generar(com) {
  const libros = convertir(await leer(com.id));
  const carpeta = join(DESTINO, com.id);
  await rm(carpeta, { recursive: true, force: true });
  await mkdir(carpeta, { recursive: true });
  let secciones = 0, bytes = 0;
  for (const [b, caps] of Object.entries(libros)) {
    const salida = {};
    for (const [c, cap] of Object.entries(caps)) {
      const i = pulir(cap.i.join(''), { sinTextoBiblico: com.id === 'mhc' });
      const s = cap.s
        .map((x) => [x.v1, x.v2, pulir((x.alias || x.html).join(''), { sinTextoBiblico: com.id === 'mhc' })])
        .filter((x) => x[2] && x[2].replace(/<[^>]+>/g, '').trim().length > 2);
      // Matthew Henry comenta por secciones: si la etiqueta de una sección se queda corta
      // (p. ej. "Jn 3:1-8" cuando el texto llega hasta el 21), cubre hasta la siguiente.
      if (com.porSecciones) {
        for (let k = 0; k < s.length - 1; k++) if (s[k + 1][0] > s[k][1] + 1 && s[k + 1][0] > s[k][0]) s[k][1] = s[k + 1][0] - 1;
      }
      if (!i && !s.length) continue;
      salida[c] = s.length ? (i ? { i, s } : { s }) : { i };
      secciones += s.length;
    }
    const json = JSON.stringify(salida);
    bytes += json.length;
    await writeFile(join(carpeta, `${String(b).padStart(2, '0')}.json`), json);
  }
  console.log(`  ${com.abrev}: ${Object.keys(libros).length} libros, ${secciones} secciones, ${(bytes / 1e6).toFixed(1)} MB`);
}

async function main() {
  for (const com of COMENTARIOS) await generar(com);
  await writeFile(join(DESTINO, 'indice.json'), JSON.stringify({
    fuente: 'CrossWire Bible Society (módulos OSIS)', licencia: 'Dominio público',
    comentarios: COMENTARIOS.map(({ porSecciones, ...c }) => c),
  }));
  console.log('Listo:', DESTINO);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
