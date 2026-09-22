/**
 * notas.js — Apuntes de estudio.
 *
 * Una nota puede ir pegada a un pasaje (desde/hasta son ids de versículo) o
 * ser un apunte libre (un sermón, un bosquejo, un estudio temático). El texto
 * admite un Markdown sencillo y cualquier cita que escribas ("ver Ro 5:8")
 * se vuelve un enlace al pasaje.
 *   { id, desde, hasta, titulo, cuerpo, etiquetas:[], creada, editada }
 */

import { detectar, formatearRango, aClave, rango } from './referencias.js';

export function escaparHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Texto en línea: **negrita**, *cursiva*, ==resaltado==, `código` y citas enlazadas. */
export function enLinea(texto) {
  const refs = detectar(texto);
  let html = '';
  let pos = 0;
  for (const r of refs) {
    html += formato(texto.slice(pos, r.inicio));
    html += `<a class="ref" href="#/leer/${aClave(r.ref)}" data-ref="${aClave(r.ref)}">${escaparHtml(r.texto)}</a>`;
    pos = r.fin;
  }
  return html + formato(texto.slice(pos));
}

function formato(t) {
  return escaparHtml(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

/** Markdown sencillo a HTML seguro (todo el texto se escapa antes). */
export function notaAHtml(cuerpo) {
  const lineas = String(cuerpo || '').replace(/\r/g, '').split('\n');
  const salida = [];
  let lista = null;
  let parrafo = [];
  const cerrarParrafo = () => { if (parrafo.length) { salida.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`); parrafo = []; } };
  const cerrarLista = () => { if (lista) { salida.push(`</${lista}>`); lista = null; } };

  for (const linea of lineas) {
    const t = linea.trimEnd();
    let m;
    if (!t.trim()) { cerrarParrafo(); cerrarLista(); continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(t))) {
      cerrarParrafo(); cerrarLista();
      const n = m[1].length + 2; // # → h3, ## → h4, ### → h5
      salida.push(`<h${n}>${enLinea(m[2])}</h${n}>`);
    } else if ((m = /^\s*[-*•]\s+(.*)$/.exec(t))) {
      cerrarParrafo();
      if (lista !== 'ul') { cerrarLista(); salida.push('<ul>'); lista = 'ul'; }
      salida.push(`<li>${enLinea(m[1])}</li>`);
    } else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(t))) {
      cerrarParrafo();
      if (lista !== 'ol') { cerrarLista(); salida.push('<ol>'); lista = 'ol'; }
      salida.push(`<li>${enLinea(m[1])}</li>`);
    } else if ((m = /^>\s?(.*)$/.exec(t))) {
      cerrarParrafo(); cerrarLista();
      salida.push(`<blockquote>${enLinea(m[1])}</blockquote>`);
    } else if (/^-{3,}$/.test(t.trim())) {
      cerrarParrafo(); cerrarLista();
      salida.push('<hr>');
    } else {
      cerrarLista();
      parrafo.push(t);
    }
  }
  cerrarParrafo(); cerrarLista();
  return salida.join('');
}

/** Etiquetas escritas como "#gracia #fe" o "gracia, fe". */
export function leerEtiquetas(texto) {
  return [...new Set(String(texto).split(/[\s,;]+/).map((e) => e.replace(/^#/, '').trim().toLowerCase()).filter(Boolean))];
}

/** Notas que tocan un rango de versículos (para ponerles el icono al leer). */
export function notasEn(notas, desde, hasta) {
  return notas.filter((n) => n.desde && n.desde <= hasta && (n.hasta || n.desde) >= desde);
}

/** Filtra el cuaderno por texto, etiqueta y libro. */
export function filtrarNotas(notas, { texto = '', etiqueta = '', libro = 0 } = {}) {
  const q = texto.trim().toLowerCase();
  return notas
    .filter((n) => !etiqueta || (n.etiquetas || []).includes(etiqueta))
    .filter((n) => !libro || (n.desde && Math.floor(n.desde / 1e6) === Number(libro)))
    .filter((n) => !q || `${n.titulo || ''} ${n.cuerpo || ''} ${(n.etiquetas || []).join(' ')} ${n.desde ? formatearRango(n.desde, n.hasta) : ''}`
      .toLowerCase().includes(q))
    .sort((a, b) => (b.editada || 0) - (a.editada || 0));
}

export function todasLasEtiquetas(notas) {
  const cuenta = new Map();
  for (const n of notas) for (const e of n.etiquetas || []) cuenta.set(e, (cuenta.get(e) || 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Pasa las citas de una nota ("Ro 5:8") a rangos, para listar "pasajes mencionados". */
export function pasajesMencionados(cuerpo) {
  return detectar(cuerpo).map((h) => ({ ...rango(h.ref), texto: h.texto }));
}

/** Todo el cuaderno en un archivo Markdown, ordenado por pasaje. */
export function exportarMarkdown(notas, { titulo = 'Mis notas de estudio' } = {}) {
  const orden = [...notas].sort((a, b) => (a.desde || 9e9) - (b.desde || 9e9) || (a.creada || 0) - (b.creada || 0));
  const partes = [`# ${titulo}`, ''];
  for (const n of orden) {
    const pasaje = n.desde ? formatearRango(n.desde, n.hasta || n.desde) : 'Apunte libre';
    partes.push(`## ${n.titulo ? `${n.titulo} — ` : ''}${pasaje}`);
    if (n.etiquetas?.length) partes.push(n.etiquetas.map((e) => `#${e}`).join(' '));
    partes.push('', String(n.cuerpo || '').trim(), '');
  }
  return partes.join('\n');
}
