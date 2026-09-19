/**
 * docx.js — Genera el .docx de la hoja de alabanza en el navegador,
 * replicando el formato de referencia del equipo: título + tonalidad en
 * negrita a 16pt, autor debajo, cuerpo en tabla sin bordes de 1 o 2 columnas,
 * acordes en negrita justo sobre la letra.
 *
 * Toma la misma estructura JSON que el script de la skill
 * ({titulo, tonalidad, autor, bloques}), así que lo que se exporte aquí
 * también sirve para generar el documento desde la terminal.
 */

import { zipSync } from './zip.js';

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/\u0000/g, '');

const PPR_COMPACTO = '<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>';

function run(text, { bold = false, size = null, mono = false } = {}) {
  const props = [];
  if (mono) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>');
  if (bold) props.push('<w:b/>');
  if (size) props.push(`<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>`);
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

const parrafo = (contenido) => `<w:p>${PPR_COMPACTO}${contenido}</w:p>`;

function bloquesXml(bloques, mono) {
  const out = [];
  bloques.forEach((bloque, i) => {
    if (i > 0) out.push(parrafo(''));
    out.push(parrafo(run(bloque.etiqueta, { bold: true, mono })));
    for (const linea of bloque.lineas || []) {
      if (linea.acordes) out.push(parrafo(run(linea.acordes, { bold: true, mono })));
      if (linea.letra || !linea.acordes) out.push(parrafo(run(linea.letra || '', { mono })));
    }
  });
  return out.join('');
}

const SIN_BORDES = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
  .map((lado) => `<w:${lado} w:val="none" w:sz="0" w:space="0"/>`).join('');

function cuerpoDeCancion({ titulo, tonalidad, autor, bloques }, mono) {
  const cabecera =
    `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(titulo)} (${esc(tonalidad)})</w:t></w:r>` +
    `<w:r><w:br/></w:r>` +
    (autor ? run(autor) : '') +
    `</w:p><w:p/>`;

  const columnas = [...new Set(bloques.map((b) => b.columna || 1))].sort();
  let cuerpo;
  if (columnas.length <= 1) {
    cuerpo = bloquesXml(bloques, mono);
  } else {
    const n = Math.max(...columnas);
    const ancho = Math.floor(9360 / n);
    const celdas = Array.from({ length: n }, (_, i) =>
      `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/></w:tcPr>` +
      bloquesXml(bloques.filter((b) => (b.columna || 1) === i + 1), mono) +
      `</w:tc>`).join('');
    cuerpo =
      `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${SIN_BORDES}</w:tblBorders></w:tblPr>` +
      `<w:tblGrid>${Array.from({ length: n }, () => `<w:gridCol w:w="${ancho}"/>`).join('')}</w:tblGrid>` +
      `<w:tr>${celdas}</w:tr></w:tbl><w:p/>`;
  }

  return cabecera + cuerpo;
}

const SALTO_PAGINA = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

function documentXml(canciones, mono) {
  const lista = Array.isArray(canciones) ? canciones : [canciones];
  const cuerpo = lista.map((c) => cuerpoDeCancion(c, mono)).join(SALTO_PAGINA);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${cuerpo}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const coreXml = (titulo) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(titulo)}</dc:title><dc:creator>Alabanza</dc:creator><cp:lastModifiedBy>Alabanza</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created>
</cp:coreProperties>`;

/**
 * Devuelve los bytes del .docx.
 * Acepta una canción o una lista (cada una empieza en una página nueva),
 * que es lo que se usa para entregarle el set completo a cada músico.
 */
export function buildDocx(cancion, { mono = false } = {}) {
  const primera = Array.isArray(cancion) ? cancion[0] : cancion;
  return zipSync([
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: RELS },
    { name: 'docProps/core.xml', data: coreXml(primera?.titulo || 'Alabanza') },
    { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>` },
    { name: 'word/document.xml', data: documentXml(cancion, mono) },
  ]);
}

/** Nombre de archivo igual al de la referencia: "Título (Tonalidad).docx". */
export function docxFileName({ titulo, tonalidad, autor }) {
  // El autor solo entra si es corto (un nombre, no una ficha completa).
  const corto = String(autor || '').split(/[·(,]/)[0].trim();
  const conAutor = corto && corto.length <= 28 ? ` (${corto})` : '';
  return `${titulo}${conAutor} (${tonalidad})`.replace(/[\\/:*?"<>|]/g, '-') + '.docx';
}
