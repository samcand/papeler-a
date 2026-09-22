/**
 * biblioteca.js — Tus libros de consulta (comentarios, teologías, sermones,
 * apuntes de seminario) convertidos en párrafos, con un índice de todas las
 * citas bíblicas que contienen.
 *
 * Así, al leer Romanos 5:8, la Guía del pasaje muestra qué dice cada libro de
 * tu biblioteca sobre ese versículo. Formatos: .txt, .md, .html, .epub, .docx.
 *
 * Esta parte no toca el DOM ni el almacenamiento: se puede probar en Node.
 */

import { detectar, rango } from './referencias.js';

/** Texto plano o Markdown → párrafos. Une las líneas cortadas a mano dentro de un párrafo. */
export function partirTexto(texto) {
  const limpio = String(texto).replace(/\r\n?/g, '\n').replace(/\u00ad/g, '');
  const bloques = limpio.split(/\n\s*\n+/);
  // Si no hay líneas en blanco (texto de una línea por párrafo), cada línea es un párrafo
  const partes = bloques.length === 1 && limpio.split('\n').length > 3 ? limpio.split('\n') : bloques;
  return partes
    .map((p) => p.replace(/-\n(?=\p{Ll})/gu, '').replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter((p) => p.length > 1);
}

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', middot: '·', para: '¶', sect: '§',
};
export function decodificarEntidades(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTIDADES[e] ?? ENTIDADES[e.toLowerCase()] ?? m;
  });
}

/**
 * HTML/XHTML → párrafos, sin DOM: cada bloque (p, h1-h6, li, blockquote, div,
 * td) es un párrafo. Suficiente para capítulos de EPUB y páginas guardadas.
 */
export function parrafosDeHtml(html) {
  const cuerpo = String(html).replace(/^[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '');
  const sinRuido = cuerpo
    .replace(/<(script|style|head|nav)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ');
  const marcado = sinRuido.replace(/<\/?(p|h[1-6]|li|blockquote|div|td|tr|section|article|dt|dd|pre)\b[^>]*>/gi, '\n\n');
  return partirTexto(decodificarEntidades(marcado.replace(/<[^>]+>/g, '')));
}

/** document.xml de un .docx → párrafos (cada <w:p> es uno). */
export function parrafosDeDocx(xml) {
  const salida = [];
  for (const m of String(xml).matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const texto = [...m[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)]
      .map((t) => (t[1] != null ? t[1] : ' ')).join('');
    const limpio = decodificarEntidades(texto).replace(/\s+/g, ' ').trim();
    if (limpio) salida.push(limpio);
  }
  return salida;
}

/** Orden de lectura de un EPUB: container.xml → .opf → spine → rutas de los capítulos. */
export function rutasEpub(containerXml, leerOpf) {
  const rutaOpf = /full-path="([^"]+)"/.exec(containerXml)?.[1];
  if (!rutaOpf) throw new Error('El EPUB no tiene container.xml válido');
  const opf = leerOpf(rutaOpf);
  const base = rutaOpf.includes('/') ? rutaOpf.slice(0, rutaOpf.lastIndexOf('/') + 1) : '';
  const items = new Map();
  for (const m of opf.matchAll(/<item\b[^>]*>/g)) {
    const id = /\bid="([^"]+)"/.exec(m[0])?.[1];
    const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
    if (id && href) items.set(id, decodeURIComponent(href));
  }
  const orden = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map((m) => items.get(m[1])).filter(Boolean);
  const titulo = decodificarEntidades(/<dc:title[^>]*>([^<]+)</.exec(opf)?.[1] || '').trim();
  const autor = decodificarEntidades(/<dc:creator[^>]*>([^<]+)</.exec(opf)?.[1] || '').trim();
  return { rutas: orden.map((h) => base + h), titulo, autor, rutaOpf };
}

/**
 * Índice de citas: [[párrafo, desde, hasta], …]. Una cita de capítulo entero
 * ("Romanos 8") cubre todo el capítulo.
 */
export function indexar(parrafos) {
  const indice = [];
  parrafos.forEach((p, i) => {
    for (const h of detectar(p)) {
      const { desde, hasta } = rango(h.ref);
      indice.push([i, desde, hasta]);
    }
  });
  return indice;
}

/**
 * Qué párrafos de qué libros citan un rango de versículos. Las citas exactas
 * van primero; las de capítulo completo o rangos amplios, después.
 *   libros: [{ id, titulo, autor, indice }]
 */
export function citasEn(libros, desde, hasta, { limite = 40 } = {}) {
  const hallazgos = [];
  for (const libro of libros) {
    const vistos = new Set();
    for (const [p, a, z] of libro.indice || []) {
      if (a > hasta || z < desde || vistos.has(p)) continue;
      vistos.add(p);
      hallazgos.push({ libro, parrafo: p, desde: a, hasta: z, amplitud: z - a });
    }
  }
  hallazgos.sort((x, y) => x.amplitud - y.amplitud || x.libro.titulo.localeCompare(y.libro.titulo) || x.parrafo - y.parrafo);
  return hallazgos.slice(0, limite);
}

/** Fragmento del párrafo centrado en la cita, para no mostrar páginas enteras. */
export function fragmento(texto, { largo = 320, centro = null } = {}) {
  if (texto.length <= largo) return texto;
  let c = centro;
  if (c == null) c = detectar(texto)[0]?.inicio ?? 0;
  let inicio = Math.max(0, c - Math.floor(largo / 2));
  const fin = Math.min(texto.length, inicio + largo);
  inicio = Math.max(0, fin - largo);
  return `${inicio > 0 ? '… ' : ''}${texto.slice(inicio, fin).trim()}${fin < texto.length ? ' …' : ''}`;
}

/** Título a partir del nombre de archivo: "calvino-institucion_tomo1.epub" → "Calvino institucion tomo1". */
export function tituloDeArchivo(nombre) {
  const base = String(nombre).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Busca palabras en la biblioteca (sin tildes): devuelve párrafos con coincidencias. */
export function buscarEnLibros(libros, consulta, normalizar, { limite = 200 } = {}) {
  const terminos = normalizar(consulta).split(/\s+/).filter((t) => t.length > 1);
  if (!terminos.length) return [];
  const salida = [];
  for (const libro of libros) {
    (libro.parrafos || []).forEach((p, i) => {
      const plano = normalizar(p);
      if (terminos.every((t) => plano.includes(t)) && salida.length < limite) {
        salida.push({ libro, parrafo: i, texto: p, centro: plano.indexOf(terminos[0]) });
      }
    });
  }
  return salida;
}
