/**
 * formatos.js — Importar canciones desde ChordPro y OnSong (y exportar a ChordPro).
 *
 * Son los dos formatos que usa casi todo el mundo: ChordPro es el estándar de
 * toda la vida (y lo que exportan SongSelect, Planning Center o Songbook Pro),
 * y OnSong es un superconjunto suyo con los metadatos escritos como "Key: G"
 * al principio del archivo.
 *
 * La lista de directivas y sus abreviaturas sigue la especificación de ChordPro
 * (t/st/c/soc/eoc/sov/eov/sob/sot/sog/sop y los metadatos title, subtitle,
 * artist, composer, lyricist, album, year, key, time, tempo, duration, capo,
 * copyright, sorttitle, arranger, transpose y los personalizados x_algo).
 */

import { parseChord } from './music.js';
import { esLineaDeAcordes, esEtiquetaSeccion, fusionarAcordes } from './hoja.js';

/** Abreviaturas oficiales -> nombre largo de la directiva. */
const ALIAS = {
  t: 'title', st: 'subtitle', c: 'comment', ci: 'comment_italic', cb: 'comment_box',
  soc: 'start_of_chorus', eoc: 'end_of_chorus',
  sov: 'start_of_verse', eov: 'end_of_verse',
  sob: 'start_of_bridge', eob: 'end_of_bridge',
  sog: 'start_of_grid', eog: 'end_of_grid',
  sot: 'start_of_tab', eot: 'end_of_tab',
  sop: 'start_of_part', eop: 'end_of_part', p: 'start_of_part', ep: 'end_of_part',
  ns: 'new_song', np: 'new_page', npp: 'new_physical_page', colb: 'column_break',
  nk: 'new_key', cf: 'chordfont', cs: 'chordsize', tf: 'textfont', ts: 'textsize',
};

/** Nombres de sección en inglés -> español, que es como los lee el equipo. */
const TRADUCCION = [
  [/^pre[-\s]?chorus/i, 'Pre-Coro'], [/^chorus/i, 'Coro'], [/^verse/i, 'Verso'],
  [/^bridge/i, 'Puente'], [/^intro/i, 'Intro'], [/^outro/i, 'Final'],
  [/^ending/i, 'Final'], [/^refrain/i, 'Estribillo'], [/^interlude/i, 'Interludio'],
  [/^instrumental/i, 'Instrumental'], [/^solo/i, 'Solo'], [/^tag/i, 'Tag'],
  [/^vamp/i, 'Vamp'], [/^turnaround/i, 'Turnaround'], [/^part/i, 'Parte'],
  [/^coda/i, 'Coda'], [/^breakdown/i, 'Bajada'],
];

function traducirSeccion(nombre = '', traducir = true) {
  const limpio = nombre.trim().replace(/[:：]\s*$/, '');
  if (!traducir) return limpio;
  for (const [patron, español] of TRADUCCION) {
    if (patron.test(limpio)) {
      const numero = /(\d+|[IVX]+)\s*$/.exec(limpio);
      return numero ? `${español} ${numero[1]}` : español;
    }
  }
  return limpio;
}

const DIRECTIVA_RE = /^\s*\{\s*([^}:]+?)\s*(?::\s*([\s\S]*?))?\s*\}\s*$/;

/** Lee una línea de directiva: devuelve {nombre, valor} o null. */
export function leerDirectiva(linea) {
  const m = DIRECTIVA_RE.exec(linea);
  if (!m) return null;
  const bruto = m[1].trim().toLowerCase();
  const nombre = ALIAS[bruto] || bruto;
  let valor = (m[2] || '').trim();
  // Las secciones admiten etiqueta: {start_of_verse: label="Verso 1"}
  const etiqueta = /label\s*=\s*"([^"]*)"|label\s*=\s*'([^']*)'/.exec(valor);
  if (etiqueta) valor = (etiqueta[1] ?? etiqueta[2] ?? '').trim();
  return { nombre, valor };
}

/** ¿Qué formato tiene este texto? */
export function detectarFormato(texto = '', nombre = '') {
  const ext = (nombre.split('.').pop() || '').toLowerCase();
  const tieneDirectivas = /^\s*\{\s*(title|t|subtitle|st|soc|start_of_\w+|c|comment|key|artist)\b/im.test(texto);
  const tieneMetaOnSong = /^\s*(key|tempo|time|capo|ccli|duration|copyright|artist|book|flow|keywords)\s*:\s*\S/im.test(texto);
  const tieneAcordesEnLinea = /\[[A-G][#b]?[^\]]{0,12}\]/.test(texto);

  if (tieneDirectivas && tieneMetaOnSong) return 'onsong';
  if (tieneDirectivas) return 'chordpro';
  if (tieneMetaOnSong) return 'onsong';
  if (['onsong'].includes(ext)) return 'onsong';
  if (['cho', 'chopro', 'chordpro', 'crd', 'pro', 'chord'].includes(ext)) return 'chordpro';
  if (tieneAcordesEnLinea) return 'chordpro';
  return 'acordes-sobre-letra';
}

const NUM_ROMANO = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * Convierte un texto ChordPro (u OnSong) en una o varias canciones de la app.
 * @returns {{canciones: object[], avisos: string[]}}
 */
export function importarTexto(texto = '', { nombre = '', traducirSecciones = true } = {}) {
  const formato = detectarFormato(texto, nombre);
  const bloques = String(texto).replace(/\r\n?/g, '\n').split(/^\s*\{\s*(?:ns|new_song)\s*\}\s*$/im);
  const canciones = [];
  const avisos = [];
  for (const bloque of bloques) {
    if (!bloque.trim()) continue;
    const { cancion, avisos: propios } = convertir(bloque, { formato, nombre, traducirSecciones });
    if (cancion) canciones.push(cancion);
    avisos.push(...propios);
  }
  return { canciones, avisos, formato };
}

function convertir(texto, { formato, nombre, traducirSecciones }) {
  const avisos = [];
  const meta = {};
  const salida = [];
  let seccionAbierta = null;
  let enTab = false;
  let versos = 0;
  let hayLetra = false;

  const lineas = texto.split('\n');
  let i = 0;

  // --- Cabecera estilo OnSong: título, autor y "Clave: valor" ---
  if (formato === 'onsong') {
    while (i < lineas.length && !lineas[i].trim()) i++;
    const primera = lineas[i];
    if (primera && !leerDirectiva(primera) && !/^\s*[\w ]+\s*:\s*\S/.test(primera)
      && !esLineaDeAcordes(primera) && !esEtiquetaSeccion(primera)) {
      meta.title = primera.trim();
      i++;
      const segunda = lineas[i];
      if (segunda && segunda.trim() && !/^\s*[\w ]+\s*:\s*\S/.test(segunda)
        && !leerDirectiva(segunda) && !esLineaDeAcordes(segunda) && !esEtiquetaSeccion(segunda)) {
        meta.artist = segunda.trim();
        i++;
      }
    }
    // Pares "Clave: valor" hasta la primera línea en blanco
    for (; i < lineas.length; i++) {
      const linea = lineas[i];
      if (!linea.trim()) { i++; break; }
      const par = /^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ_ ]{2,20})\s*:\s*(.*)$/.exec(linea);
      if (!par || esEtiquetaSeccion(linea)) break;
      meta[par[1].trim().toLowerCase()] = par[2].trim();
    }
  }

  const abrirSeccion = (etiqueta) => {
    const limpia = traducirSeccion(etiqueta, traducirSecciones);
    seccionAbierta = limpia;
    salida.push(`{${limpia}}`);
  };

  for (; i < lineas.length; i++) {
    const linea = lineas[i];
    const directiva = leerDirectiva(linea);

    if (directiva) {
      const { nombre: d, valor } = directiva;
      if (d === 'start_of_tab') { enTab = true; abrirSeccion(valor || 'Tablatura'); continue; }
      if (d === 'end_of_tab') { enTab = false; continue; }
      if (d.startsWith('start_of_')) {
        const tipo = d.replace('start_of_', '');
        if (tipo === 'verse') versos++;
        const porDefecto = { chorus: 'Coro', verse: `Verso ${NUM_ROMANO[versos] || versos}`, bridge: 'Puente', grid: 'Cuadrícula', part: 'Parte', abc: 'Partitura', ly: 'Partitura', textblock: 'Texto' }[tipo] || tipo;
        abrirSeccion(valor || porDefecto);
        continue;
      }
      if (d.startsWith('end_of_')) { seccionAbierta = null; continue; }
      if (d === 'chorus') { salida.push('', '{Coro (Igual)}'); continue; }
      if (['comment', 'comment_italic', 'comment_box', 'highlight'].includes(d)) {
        if (valor) salida.push(`// ${valor}`);
        continue;
      }
      if (['new_page', 'new_physical_page', 'column_break'].includes(d)) { salida.push(''); continue; }
      if (d === 'define' || d === 'chord') { avisos.push(`Se ignoró una definición de acorde: {${d}: ${valor}}`); continue; }
      if (/^(chordfont|chordsize|textfont|textsize|chordcolour|textcolour|titles|columns|grid|no_grid|image|transpose)$/.test(d)) continue;
      // Metadatos: {title}, {key}, {x_algo}, {meta: nombre valor}…
      if (d === 'meta') {
        const par = /^(\S+)\s+([\s\S]*)$/.exec(valor);
        if (par) meta[par[1].toLowerCase()] = par[2].trim();
        continue;
      }
      meta[d.replace(/^x_/, '')] = valor;
      continue;
    }

    if (/^\s*#/.test(linea)) continue;                       // comentario del archivo
    if (!linea.trim()) { salida.push(''); continue; }

    if (enTab) { salida.push(linea.replace(/[[\]]/g, '')); continue; }

    // Etiqueta de sección estilo OnSong: "Coro:", "Verse 2:"
    if (/:\s*$/.test(linea.trim()) && linea.trim().length < 40 && !esLineaDeAcordes(linea)) {
      abrirSeccion(linea.trim());
      continue;
    }
    if (esEtiquetaSeccion(linea) && !/\[/.test(linea)) { abrirSeccion(linea.trim()); continue; }

    // Acordes encima de la letra (OnSong y hojas pegadas)
    if (esLineaDeAcordes(linea)) {
      const siguiente = lineas[i + 1];
      if (siguiente !== undefined && siguiente.trim() && !esLineaDeAcordes(siguiente)
        && !leerDirectiva(siguiente) && !esEtiquetaSeccion(siguiente)) {
        salida.push(fusionarAcordes(linea, siguiente));
        hayLetra = true;
        i++;
        continue;
      }
      salida.push(linea.trim().split(/\s+/).map((t) => (parseChord(t) ? `[${t}]` : t)).join(' '));
      continue;
    }

    if (/\[[^\]]+\]/.test(linea)) hayLetra = true;
    salida.push(linea.trimEnd());
    if (linea.trim()) hayLetra = true;
  }

  const cuerpo = salida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!cuerpo) return { cancion: null, avisos: [...avisos, `"${nombre || 'archivo'}" no tenía contenido reconocible.`] };
  if (!hayLetra) avisos.push(`"${meta.title || nombre}" parece no tener letra, solo acordes.`);

  const cancion = {
    title: meta.title || meta.sorttitle || (nombre ? nombre.replace(/\.[^.]+$/, '') : 'Sin título'),
    author: [meta.artist, meta.composer, meta.lyricist, meta.subtitle].filter(Boolean).join(' · '),
    key: normalizarTonalidad(meta.key) || deducirTonalidad(cuerpo),
    bpm: Number.parseInt(meta.tempo, 10) || 0,
    timeSignature: /^\d+\/\d+$/.test(meta.time || '') ? meta.time : '4/4',
    capo: Number.parseInt(meta.capo, 10) || 0,
    ccli: meta.ccli || meta['ccli song'] || meta.copyright || '',
    body: cuerpo + '\n',
    tags: (meta.keywords || meta.tags || meta.topic || '').split(/[,;]/).map((t) => t.trim()).filter(Boolean),
    notes: [
      meta.copyright && meta.ccli ? `Derechos: ${meta.copyright}` : '',
      meta.album ? `Álbum: ${meta.album}${meta.year ? ` (${meta.year})` : ''}` : '',
      meta.duration ? `Duración: ${meta.duration}` : '',
      meta.flow ? `Orden sugerido: ${meta.flow}` : '',
      meta.arranger ? `Arreglo: ${meta.arranger}` : '',
      nombre ? `Importado de ${nombre}` : '',
    ].filter(Boolean).join('\n'),
  };

  if (!cancion.bpm && meta.bpm) cancion.bpm = Number.parseInt(meta.bpm, 10) || 0;
  if (!cancion.bpm) cancion.bpm = 80;
  const enlace = /(https?:\/\/\S*(?:youtube\.com|youtu\.be)\S*)/i.exec([meta.link, meta.url, meta.video, texto].filter(Boolean).join(' '));
  if (enlace) cancion.youtubeId = enlace[1];

  return { cancion, avisos };
}

/** "G major" / "Gm" / "sol" -> "G" / "Gm" */
function normalizarTonalidad(valor) {
  if (!valor) return '';
  const limpio = String(valor).trim()
    .replace(/\s*(major|mayor|maj)\s*$/i, '')
    .replace(/\s*(minor|menor|min)\s*$/i, 'm');
  const latino = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' };
  const enLatin = /^([a-záéíóú]+)([#b]?)(m?)$/i.exec(limpio);
  if (enLatin && latino[enLatin[1].toLowerCase()]) {
    return latino[enLatin[1].toLowerCase()] + (enLatin[2] || '') + (enLatin[3] || '');
  }
  return parseChord(limpio) ? limpio : '';
}

/** Si el archivo no trae tonalidad, se usa el primer acorde: suele ser la tónica. */
function deducirTonalidad(cuerpo) {
  const m = /\[([^\]\s]+)\]/.exec(cuerpo);
  if (!m) return 'C';
  const acorde = parseChord(m[1]);
  if (!acorde) return 'C';
  return acorde.root + (acorde.suffix.startsWith('m') && !acorde.suffix.startsWith('maj') ? 'm' : '');
}

/** Exporta una canción de la app a ChordPro estándar. */
export function aChordPro(song, { tonalidad = null } = {}) {
  const lineas = [
    `{title: ${song.title}}`,
    song.author ? `{artist: ${song.author}}` : '',
    `{key: ${tonalidad || song.key}}`,
    song.bpm ? `{tempo: ${song.bpm}}` : '',
    song.timeSignature ? `{time: ${song.timeSignature}}` : '',
    song.capo ? `{capo: ${song.capo}}` : '',
    song.ccli ? `{ccli: ${song.ccli}}` : '',
    (song.tags || []).length ? `{x_tags: ${song.tags.join(', ')}}` : '',
    '',
  ].filter((l) => l !== '');

  for (const linea of (song.body || '').split('\n')) {
    const seccion = /^\s*\{([^}]+)\}\s*$/.exec(linea);
    if (seccion) {
      const nombre = seccion[1].trim();
      const tipo = /coro|chorus/i.test(nombre) ? 'chorus'
        : /puente|bridge/i.test(nombre) ? 'bridge'
          : /tablatura|tab/i.test(nombre) ? 'tab' : 'verse';
      lineas.push('', `{start_of_${tipo}: ${nombre}}`);
      continue;
    }
    if (/^\s*\/\//.test(linea)) { lineas.push(`{comment: ${linea.replace(/^\s*\/\/\s?/, '')}}`); continue; }
    lineas.push(linea);
  }

  // Cerrar la última sección abierta
  const texto = lineas.join('\n');
  return texto.replace(/(\{start_of_(\w+)[^}]*\}[\s\S]*?)(?=\n\{start_of_|\s*$)/g, (bloque, cuerpo, tipo) => `${cuerpo.trimEnd()}\n{end_of_${tipo}}`) + '\n';
}
