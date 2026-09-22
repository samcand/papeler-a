/**
 * estante.js — Dónde viven los libros de la biblioteca: IndexedDB (admite
 * cientos de megas, a diferencia de localStorage).
 *
 *   libros: { id, titulo, autor, formato, origen, agregado, nParrafos, nCitas, indice }
 *   textos: { id, parrafos }   (se cargan solo al abrir un libro o buscar)
 *
 * También carga los libros incluidos con la app (carpeta biblia/biblioteca/,
 * listados en su indice.json), para poder distribuir obras de dominio público.
 */

import { leerZip } from './zip.js';
import { nuevoId } from './marcas.js';
import {
  partirTexto, parrafosDeHtml, parrafosDeDocx, rutasEpub, indexar, tituloDeArchivo,
} from './biblioteca.js';

const BD = 'estudio-biblico-biblioteca';
// Súbelo cuando mejore el detector de citas: los libros guardados se reindexan solos.
const VERSION_INDICE = 2;
let conexion = null;
let catalogo = null;           // Map id → libro (sin parrafos)
const textos = new Map();      // id → parrafos

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BD, 1);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      db.createObjectStore('libros', { keyPath: 'id' });
      db.createObjectStore('textos', { keyPath: 'id' });
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
  return conexion;
}

async function operar(almacenes, modo, fn) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(almacenes, modo);
    let resultado;
    Promise.resolve(fn(tx)).then((r) => { resultado = r; });
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Operación cancelada (¿sin espacio?)'));
  });
}

const pedir = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

/** Todos los libros (metadatos + índice de citas). */
let cargando = null;
export async function libros() {
  cargando ||= (async () => {
    const lista = await operar(['libros'], 'readonly', (tx) => pedir(tx.objectStore('libros').getAll()));
    catalogo = new Map((lista || []).map((l) => [l.id, l]));
    for (const l of catalogo.values()) {
      if (l.versionIndice === VERSION_INDICE) continue;
      const indice = indexar(await parrafos(l.id));
      await cambiar(l.id, { indice, nCitas: indice.length, versionIndice: VERSION_INDICE });
    }
    await cargarIncluidos();
  })();
  await cargando;
  return [...catalogo.values()].sort((a, b) => a.titulo.localeCompare(b.titulo));
}

export async function libro(id) {
  if (!catalogo) await libros();
  // (dentro de cargarIncluidos el catálogo ya existe: no se espera a sí mismo)
  return catalogo.get(id) || null;
}

export async function parrafos(id) {
  if (!textos.has(id)) {
    const t = await operar(['textos'], 'readonly', (tx) => pedir(tx.objectStore('textos').get(id)));
    textos.set(id, t?.parrafos || []);
  }
  return textos.get(id);
}

/** Todos los libros con sus párrafos (para buscar en la biblioteca). */
export async function librosConTexto() {
  const lista = await libros();
  return Promise.all(lista.map(async (l) => ({ ...l, parrafos: await parrafos(l.id) })));
}

export async function guardar({ titulo, autor = '', formato, origen = 'importado', parrafos: ps, id = nuevoId('lib') }) {
  const indice = indexar(ps);
  const meta = { id, titulo, autor, formato, origen, agregado: Date.now(), nParrafos: ps.length, nCitas: indice.length, indice, versionIndice: VERSION_INDICE };
  await operar(['libros', 'textos'], 'readwrite', (tx) => {
    tx.objectStore('libros').put(meta);
    tx.objectStore('textos').put({ id, parrafos: ps });
  });
  if (!catalogo) await libros();
  catalogo.set(id, meta);
  textos.set(id, ps);
  return meta;
}

export async function cambiar(id, cambios) {
  const l = await libro(id);
  if (!l) return;
  Object.assign(l, cambios);
  await operar(['libros'], 'readwrite', (tx) => tx.objectStore('libros').put(l));
}

export async function borrar(id) {
  await operar(['libros', 'textos'], 'readwrite', (tx) => {
    tx.objectStore('libros').delete(id);
    tx.objectStore('textos').delete(id);
  });
  catalogo?.delete(id);
  textos.delete(id);
}

/** Convierte un archivo en { titulo, autor, formato, parrafos }. */
export async function leerArchivoLibro(archivo) {
  const nombre = archivo.name || 'libro';
  const ext = nombre.split('.').pop().toLowerCase();
  if (['txt', 'md', 'markdown', 'text'].includes(ext)) {
    return { titulo: tituloDeArchivo(nombre), formato: ext, parrafos: partirTexto(await archivo.text()) };
  }
  if (['html', 'htm', 'xhtml'].includes(ext)) {
    const html = await archivo.text();
    const titulo = /<title[^>]*>([^<]+)</i.exec(html)?.[1]?.trim();
    return { titulo: titulo || tituloDeArchivo(nombre), formato: 'html', parrafos: parrafosDeHtml(html) };
  }
  if (ext === 'epub') {
    const entradas = await leerZip(await archivo.arrayBuffer());
    const porNombre = new Map(entradas.map((e) => [e.nombre, e.texto]));
    const contenedor = porNombre.get('META-INF/container.xml');
    if (!contenedor) throw new Error('No parece un EPUB válido');
    const { rutas, titulo, autor } = rutasEpub(contenedor, (ruta) => porNombre.get(ruta) || '');
    const ps = rutas.flatMap((r) => parrafosDeHtml(porNombre.get(r) || ''));
    return { titulo: titulo || tituloDeArchivo(nombre), autor, formato: 'epub', parrafos: ps };
  }
  if (ext === 'docx') {
    const entradas = await leerZip(await archivo.arrayBuffer());
    const doc = entradas.find((e) => e.nombre === 'word/document.xml');
    if (!doc) throw new Error('No parece un documento de Word válido');
    const core = entradas.find((e) => e.nombre === 'docProps/core.xml')?.texto || '';
    const titulo = /<dc:title>([^<]+)</.exec(core)?.[1];
    const autor = /<dc:creator>([^<]+)</.exec(core)?.[1] || '';
    return { titulo: titulo || tituloDeArchivo(nombre), autor, formato: 'docx', parrafos: parrafosDeDocx(doc.texto) };
  }
  if (ext === 'pdf') throw new Error('Los PDF no se pueden leer directamente: ábrelo y guárdalo como texto (.txt) o conviértelo a EPUB o Word.');
  throw new Error(`Formato .${ext} no soportado. Usa .txt, .md, .html, .epub o .docx`);
}

/**
 * Libros que vienen con la app (biblia/biblioteca/indice.json). Se indexan la
 * primera vez y quedan guardados; si el archivo cambia de versión, se rehacen.
 *   [{ id, archivo, titulo, autor, version }]
 */
async function cargarIncluidos() {
  let lista = [];
  try {
    const r = await fetch(new URL('../biblioteca/indice.json', import.meta.url));
    if (r.ok) lista = await r.json();
  } catch { /* sin libros incluidos */ }
  for (const item of Array.isArray(lista) ? lista : []) {
    const id = `incluido-${item.id}`;
    const actual = catalogo.get(id);
    if (actual && actual.version === (item.version || 1)) continue;
    try {
      const r = await fetch(new URL(`../biblioteca/${item.archivo}`, import.meta.url));
      if (!r.ok) continue;
      const archivo = new File([await r.blob()], item.archivo);
      const leido = await leerArchivoLibro(archivo);
      const meta = await guardar({
        ...leido, id, origen: 'incluido',
        titulo: item.titulo || leido.titulo, autor: item.autor || leido.autor || '',
      });
      meta.version = item.version || 1;
      meta.licencia = item.licencia || '';
      await cambiar(id, { version: meta.version, licencia: meta.licencia });
    } catch (e) {
      console.warn('No se pudo cargar el libro incluido', item.archivo, e);
    }
  }
}
