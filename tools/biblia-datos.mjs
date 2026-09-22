/**
 * biblia-datos.mjs — Genera los datos de la app de estudio bíblico (biblia/datos).
 *
 * Descarga (o lee de una carpeta local) las versiones de dominio público
 * publicadas por el proyecto scrollmapper/bible_databases y las referencias
 * cruzadas de OpenBible.info (CC-BY), y las guarda partidas por libro para
 * que la app cargue solo lo que se está leyendo.
 *
 *   node tools/biblia-datos.mjs               -> descarga de GitHub
 *   node tools/biblia-datos.mjs ./fuentes     -> usa SpaRV.json, KJV.json, WLC.json,
 *                                                TR.json y cross_references.txt locales
 *
 * Los datos ya generados vienen en el repositorio: solo hace falta correr esto
 * para regenerarlos o cambiar el umbral de votos de las referencias cruzadas.
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBROS, libroPorOsis, idVerso } from '../biblia/src/libros.js';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DESTINO = join(RAIZ, 'biblia', 'datos');
const FUENTE = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master';
const LOCAL = process.argv[2] ? resolve(process.argv[2]) : null;

// Referencias con menos votos que esto se descartan: son las más discutibles
// y duplicarían el tamaño de los datos.
const VOTOS_MINIMOS = 3;

export const VERSIONES = [
  { id: 'rv1909', archivo: 'SpaRV', nombre: 'Reina-Valera 1909', abrev: 'RV1909', idioma: 'es',
    licencia: 'Dominio público' },
  { id: 'kjv', archivo: 'KJV', nombre: 'King James Version (1769)', abrev: 'KJV', idioma: 'en',
    licencia: 'Dominio público' },
  { id: 'wlc', archivo: 'WLC', nombre: 'Códice de Leningrado (hebreo)', abrev: 'WLC', idioma: 'he',
    licencia: 'Dominio público', dir: 'rtl' },
  { id: 'tr', archivo: 'TR', nombre: 'Textus Receptus (griego)', abrev: 'TR', idioma: 'el',
    licencia: 'Dominio público' },
];

// Nombres en inglés de las fuentes, en el orden de LIBROS. El códice hebreo
// sigue el orden del Tanaj, así que se ubica cada libro por nombre, no por posición.
const INGLES = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges',
  'Ruth', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'I Chronicles', 'II Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
  'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark',
  'Luke', 'John', 'Acts', 'Romans', 'I Corinthians', 'II Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', 'I Thessalonians', 'II Thessalonians', 'I Timothy', 'II Timothy',
  'Titus', 'Philemon', 'Hebrews', 'James', 'I Peter', 'II Peter', 'I John', 'II John', 'III John',
  'Jude', 'Revelation of John'];
const POR_NOMBRE = new Map(INGLES.map((nombre, i) => [nombre.toLowerCase(), i + 1]));

async function leer(nombre) {
  if (LOCAL) return readFile(join(LOCAL, nombre), 'utf8');
  const ruta = nombre.endsWith('.txt') ? `sources/extras/${nombre}` : `formats/json/${nombre}`;
  console.log('  descargando', ruta);
  const r = await fetch(`${FUENTE}/${ruta}`);
  if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
  return r.text();
}

/** "EN el principio" → "En el principio": las ediciones impresas ponen la primera palabra en versalitas. */
export function limpiarTexto(texto, primero) {
  let t = String(texto).replace(/\s+/g, ' ').replace(/¶\s*/g, '').trim();
  if (primero) t = t.replace(/^([¿¡(«"]*\p{Lu})(\p{Lu}+)(?!\p{L})/u, (_, a, b) => a + b.toLowerCase());
  return t;
}

async function generarVersion(v, indice) {
  const datos = JSON.parse(await leer(`${v.archivo}.json`));
  const carpeta = join(DESTINO, v.id);
  await rm(carpeta, { recursive: true, force: true });
  await mkdir(carpeta, { recursive: true });
  let versos = 0;
  for (let i = 0; i < datos.books.length; i++) {
    const n = POR_NOMBRE.get(String(datos.books[i].name).toLowerCase());
    const L = LIBROS[n - 1];
    if (!L) { console.warn(`  aviso: ${v.abrev} trae un libro desconocido: ${datos.books[i].name}`); continue; }
    const capitulos = [];
    for (const cap of datos.books[i].chapters) {
      const lista = [];
      for (const vs of cap.verses) {
        lista[vs.verse - 1] = limpiarTexto(vs.text, vs.verse === 1 && v.idioma === 'es');
      }
      for (let k = 0; k < lista.length; k++) if (lista[k] == null) lista[k] = '';
      capitulos[cap.chapter - 1] = lista;
    }
    for (let k = 0; k < capitulos.length; k++) if (!capitulos[k]) capitulos[k] = [];
    // El Textus Receptus trae el Antiguo Testamento vacío
    if (capitulos.every((c) => c.every((t) => !t))) continue;
    if (capitulos.length !== L.capitulos) {
      console.warn(`  aviso: ${v.abrev} ${L.nombre} trae ${capitulos.length} capítulos (esperados ${L.capitulos})`);
    }
    versos += capitulos.reduce((s, c) => s + c.filter(Boolean).length, 0);
    if (indice) indice[n - 1] = capitulos.map((c) => c.length);
    await writeFile(join(carpeta, `${String(n).padStart(2, '0')}.json`), JSON.stringify(capitulos));
  }
  console.log(`  ${v.abrev}: ${versos} versículos`);
}

/** "Prov.8.22-Prov.8.30" → [id inicial, id final (0 si es uno solo)] */
export function leerOsis(texto) {
  const [a, z] = texto.split('-');
  const id = (s) => {
    const [osis, c, v] = s.split('.');
    const b = libroPorOsis(osis);
    return b ? idVerso(b, Number(c), Number(v)) : 0;
  };
  const desde = id(a);
  const hasta = z ? id(z) : 0;
  return [desde, hasta > desde ? hasta : 0];
}

async function generarReferencias() {
  const texto = await leer('cross_references.txt');
  const porLibro = Array.from({ length: 66 }, () => ({}));
  let total = 0;
  for (const linea of texto.split('\n').slice(1)) {
    const [de, a, votosTxt] = linea.trim().split('\t');
    if (!de || !a) continue;
    const votos = Number(votosTxt);
    if (!(votos >= VOTOS_MINIMOS)) continue;
    const [origen] = leerOsis(de);
    const [desde, hasta] = leerOsis(a);
    if (!origen || !desde) continue;
    const b = Math.floor(origen / 1e6);
    const clave = `${Math.floor(origen / 1000) % 1000}:${origen % 1000}`;
    (porLibro[b - 1][clave] ||= []).push(hasta ? [desde, hasta, votos] : [desde, 0, votos]);
    total++;
  }
  const carpeta = join(DESTINO, 'xref');
  await rm(carpeta, { recursive: true, force: true });
  await mkdir(carpeta, { recursive: true });
  for (let i = 0; i < 66; i++) {
    for (const lista of Object.values(porLibro[i])) lista.sort((x, y) => y[2] - x[2]);
    await writeFile(join(carpeta, `${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(porLibro[i]));
  }
  console.log(`  referencias cruzadas: ${total} (con ${VOTOS_MINIMOS} votos o más)`);
}

async function main() {
  await mkdir(DESTINO, { recursive: true });
  const indice = [];
  for (const v of VERSIONES) await generarVersion(v, v.id === 'rv1909' ? indice : null);
  await generarReferencias();
  const meta = {
    generado: new Date().toISOString().slice(0, 10),
    versiones: VERSIONES.map(({ archivo, ...resto }) => resto),
    versiculos: indice,   // versículos por capítulo en RV1909, para planes y rangos
    referencias: { fuente: 'OpenBible.info', licencia: 'CC-BY', votosMinimos: VOTOS_MINIMOS },
  };
  await writeFile(join(DESTINO, 'indice.json'), JSON.stringify(meta));
  console.log('Listo:', DESTINO);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
