/**
 * hoja.js — Formato de hoja de alabanza del equipo (acordes sobre la letra).
 *
 *   10.000 RAZONES (G)
 *   Matt Redman
 *
 *   CORO
 *   C           G           D/F#         Em
 *   Alma mía bendice, bendice al señor
 *
 *   CORO (Igual)
 *
 * Convierte en ambos sentidos entre ese formato y el formato interno de la app
 * ([acordes] entre corchetes), y arma el JSON que espera el generador de .docx.
 */

import { parseChord } from './music.js';
import { parseSong } from './chordpro.js';

/** ¿La línea es una línea de acordes (y no letra)? */
export function esLineaDeAcordes(linea) {
  const tokens = String(linea).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const utiles = tokens.filter((t) => t !== '|' && !/^\(?x\d\)?$/i.test(t));
  if (!utiles.length) return false;
  // Exigimos acordes reconocidos: si no, palabras como "CORO" (Do + "ORO")
  // se colarían como línea de acordes.
  return utiles.every((t) => {
    const limpio = t.replace(/^\|+|\|+$/g, '');
    if (limpio.length > 8) return false;
    const acorde = parseChord(limpio);
    return acorde !== null && acorde.known;
  });
}

const ETIQUETA_RE = /^\(?\s*(CORO|ESTRIBILLO|VERSO|ESTROFA|PRE-?CORO|PUENTE|BRIDGE|INTRO|INTERLUDIO|INSTRUMENTAL|FINAL|OUTRO|CIERRE|TAG|SOLO)\b/i;

export function esEtiquetaSeccion(linea) {
  const t = String(linea).trim();
  return t.length > 0 && t.length < 44 && ETIQUETA_RE.test(t) && !esLineaDeAcordes(t);
}

/** Inserta los acordes de la línea superior dentro de la letra, por columna. */
export function fusionarAcordes(lineaAcordes = '', lineaLetra = '') {
  const marcas = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(lineaAcordes))) marcas.push({ pos: m.index, texto: m[0] });
  if (!marcas.length) return lineaLetra;

  let salida = '';
  let cursor = 0;
  for (const marca of marcas) {
    let corte = Math.min(marca.pos, lineaLetra.length);
    // Si el acorde cae uno o dos caracteres dentro de una palabra, casi siempre
    // es desalineación de la hoja original: lo pegamos al inicio de la palabra.
    if (corte > 0 && corte < lineaLetra.length && /\S/.test(lineaLetra[corte]) && /\S/.test(lineaLetra[corte - 1])) {
      let inicio = corte;
      while (inicio > 0 && /\S/.test(lineaLetra[inicio - 1])) inicio--;
      if (corte - inicio <= 2 && inicio >= cursor) corte = inicio;
    }
    salida += lineaLetra.slice(cursor, corte);
    salida += `[${marca.texto.replace(/\|/g, '').trim() || marca.texto}]`;
    cursor = corte;
  }
  salida += lineaLetra.slice(cursor);
  return salida;
}

/**
 * Lee una hoja pegada en el formato del equipo y devuelve los datos de la
 * canción listos para guardar en la app.
 */
export function parseHoja(texto = '') {
  const lineas = String(texto).replace(/\r/g, '').split('\n');
  const datos = { titulo: '', tonalidad: '', autor: '', body: '' };
  let i = 0;

  // Encabezado: "TÍTULO (G)" y autor debajo
  while (i < lineas.length && !lineas[i].trim()) i++;
  if (i < lineas.length && !esLineaDeAcordes(lineas[i]) && !esEtiquetaSeccion(lineas[i])) {
    const cab = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(lineas[i].trim());
    if (cab) { datos.titulo = cab[1].trim(); datos.tonalidad = cab[2].trim(); }
    else datos.titulo = lineas[i].trim();
    i++;
    if (i < lineas.length && lineas[i].trim() && !esLineaDeAcordes(lineas[i]) && !esEtiquetaSeccion(lineas[i])) {
      datos.autor = lineas[i].trim();
      i++;
    }
  }

  const salida = [];
  for (; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea.trim()) { salida.push(''); continue; }
    if (esEtiquetaSeccion(linea)) {
      salida.push(`{${linea.trim()}}`);
      continue;
    }
    if (esLineaDeAcordes(linea)) {
      const siguiente = lineas[i + 1];
      if (siguiente !== undefined && siguiente.trim() && !esLineaDeAcordes(siguiente) && !esEtiquetaSeccion(siguiente)) {
        salida.push(fusionarAcordes(linea, siguiente));
        i++;
      } else {
        // Línea instrumental: solo acordes
        salida.push(linea.trim().split(/\s+/)
          .map((t) => (parseChord(t) ? `[${t}]` : t)).join(' '));
      }
      continue;
    }
    salida.push(linea.trimEnd());
  }

  datos.body = salida.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  if (!datos.tonalidad) {
    const primero = /\[([^\]\s]+)\]/.exec(datos.body);
    datos.tonalidad = primero ? primero[1] : 'C';
  }
  return datos;
}

const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** "Verso 2" -> "VERSO II"; "Coro" -> "CORO". */
export function etiquetaSeccion(nombre = '') {
  const limpio = nombre.trim();
  const m = /^(.*?)\s*(\d+)\s*$/.exec(limpio);
  if (m && ROMANOS[Number(m[2])]) return `${m[1].toUpperCase()} ${ROMANOS[Number(m[2])]}`.trim();
  return limpio.toUpperCase();
}

/** Convierte una sección de la app en líneas {acordes, letra} alineadas. */
function lineasDeSeccion(seccion) {
  const lineas = [];
  for (const linea of seccion.lines) {
    if (linea.type === 'blank' || linea.type === 'note') continue;
    if (linea.type === 'bars') {
      lineas.push({ acordes: (linea.raw || '').replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim(), letra: '' });
      continue;
    }
    let acordes = '';
    let letra = '';
    for (const seg of linea.segments || []) {
      if (seg.chord) {
        while (acordes.length < letra.length) acordes += ' ';
        if (acordes.length > letra.length) acordes += ' ';
        acordes += seg.chord;
      }
      letra += seg.text || '';
    }
    lineas.push({ acordes: acordes.trimEnd(), letra: letra.trimEnd() });
  }
  return lineas;
}

const huella = (lineas) => lineas.map((l) => `${l.acordes}|${l.letra}`).join('\n');

/**
 * Arma la estructura {titulo, tonalidad, autor, bloques} del formato de
 * referencia: repeticiones abreviadas con "(Igual)" y reparto en 1 o 2 columnas.
 * El último bloque siempre se escribe completo (es el cierre de la canción).
 */
export function toHojaJSON(song, { tonalidad = null, maxLineasPorColumna = 30 } = {}) {
  const secciones = parseSong(song.body || '').filter((s) => s.name || s.lines.some((l) => l.segments));
  const vistas = new Map();
  const bloques = [];

  secciones.forEach((seccion, idx) => {
    const lineas = lineasDeSeccion(seccion);
    if (!lineas.length && !seccion.name) return;
    const etiqueta = etiquetaSeccion(seccion.name || 'SECCIÓN');
    const clave = huella(lineas);
    const esUltima = idx === secciones.length - 1;
    const previa = vistas.get(clave);
    if (previa && !esUltima && lineas.length) {
      bloques.push({ etiqueta: `${etiqueta}${previa === etiqueta ? '' : ` (igual a ${previa})`}${previa === etiqueta ? ' (Igual)' : ''}` });
      return;
    }
    if (!previa) vistas.set(clave, etiqueta);
    bloques.push({ etiqueta, lineas });
  });

  // Reparto en columnas: la estructura base a la izquierda, el resto a la derecha.
  const total = bloques.reduce((n, b) => n + 1 + (b.lineas?.length || 0) * 2, 0);
  if (total > maxLineasPorColumna) {
    let acumulado = 0;
    for (const bloque of bloques) {
      const alto = 1 + (bloque.lineas?.length || 0) * 2;
      bloque.columna = acumulado + alto <= Math.ceil(total / 2) ? 1 : 2;
      acumulado += alto;
    }
  }

  return {
    titulo: (song.title || 'Sin título').toUpperCase(),
    tonalidad: tonalidad || song.key || 'C',
    autor: song.author || '',
    bloques,
  };
}

/** Texto plano en el formato del equipo (para pegar en el chat o imprimir). */
export function toHojaTexto(song, opts = {}) {
  const doc = toHojaJSON(song, opts);
  const partes = [`${doc.titulo} (${doc.tonalidad})`];
  if (doc.autor) partes.push(doc.autor);
  partes.push('');
  doc.bloques.forEach((bloque, i) => {
    if (i > 0) partes.push('');
    partes.push(bloque.etiqueta);
    for (const linea of bloque.lineas || []) {
      if (linea.acordes) partes.push(linea.acordes);
      if (linea.letra || !linea.acordes) partes.push(linea.letra);
    }
  });
  return partes.join('\n');
}
