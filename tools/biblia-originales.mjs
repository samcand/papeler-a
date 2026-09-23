/**
 * biblia-originales.mjs — Datos de idiomas originales para el interlineal.
 *
 *   Hebreo: Open Scriptures Hebrew Bible (texto WLC de dominio público; lemas
 *           y morfología CC-BY 4.0, Open Scriptures Hebrew Bible Project).
 *   Griego: SBL Greek New Testament con el análisis de MorphGNT (texto bajo la
 *           licencia de uso de SBLGNT; análisis CC-BY-SA, J. K. Tauber).
 *   Léxico: Diccionarios de Strong (dominio público; edición JSON CC-BY-SA de
 *           Open Scriptures) y el léxico griego de Dodson (dominio público).
 *
 * Genera en biblia/datos/:
 *   heb/NN.json   capítulos[c][v] = [[palabra, strong, morfología], …]
 *   gri/NN.json   capítulos[c][v] = [[palabra, strong, morfología, lema], …]
 *   lexico/H.json y lexico/G.json   { número: [lema, transliteración, definición, KJV, derivación, glosa] }
 *
 *   node tools/biblia-originales.mjs            descarga de GitHub
 *   node tools/biblia-originales.mjs ./fuentes  usa copias locales con los mismos nombres
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBROS } from '../biblia/src/libros.js';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DESTINO = join(RAIZ, 'biblia', 'datos');
const LOCAL = process.argv[2] ? resolve(process.argv[2]) : null;

const FUENTES = {
  oshb: (osis) => `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${osis}.xml`,
  sblgnt: (nombre) => `https://raw.githubusercontent.com/morphgnt/sblgnt/master/${nombre}-morphgnt.txt`,
  griego: 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js',
  hebreo: 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js',
  dodson: 'https://raw.githubusercontent.com/biblicalhumanities/Dodson-Greek-Lexicon/master/dodson.csv',
};

// Nombres de archivo de MorphGNT, en el orden de Mateo a Apocalipsis
const SBLGNT = ['61-Mt', '62-Mk', '63-Lk', '64-Jn', '65-Ac', '66-Ro', '67-1Co', '68-2Co', '69-Ga', '70-Eph',
  '71-Php', '72-Col', '73-1Th', '74-2Th', '75-1Ti', '76-2Ti', '77-Tit', '78-Phm', '79-Heb', '80-Jas',
  '81-1Pe', '82-2Pe', '83-1Jn', '84-2Jn', '85-3Jn', '86-Jud', '87-Re'];

async function leer(url, nombreLocal) {
  if (LOCAL) return readFile(join(LOCAL, nombreLocal), 'utf8');
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (intento >= 4) throw new Error(`${url}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 1000 * 2 ** intento));
    }
  }
}

const sinAcentos = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** "b/7225" → 7225; "1254 a" → 1254; "c/d/776" → 776; sin número → 0 */
export function strongDeLema(lema) {
  const partes = String(lema || '').split('/');
  for (let i = partes.length - 1; i >= 0; i--) {
    const m = /(\d+)/.exec(partes[i]);
    if (m) return Number(m[1]);
  }
  return 0;
}

/** Un libro del OSHB (XML) → capítulos[c-1][v-1] = [[palabra, strong, morfología], …] */
export function leerOshb(xml) {
  const capitulos = [];
  const limpio = xml.replace(/<note\b[\s\S]*?<\/note>/g, '');
  for (const mv of limpio.matchAll(/<verse osisID="[^.]+\.(\d+)\.(\d+)">([\s\S]*?)<\/verse>/g)) {
    const c = Number(mv[1]), v = Number(mv[2]);
    const palabras = [];
    for (const t of mv[3].matchAll(/<w\b([^>]*)>([^<]*)<\/w>|<seg type="x-(maqqef|sof-pasuq|pe|samekh|paseq)">([^<]*)<\/seg>/g)) {
      if (t[2] != null && t[1] != null) {
        const lema = /lemma="([^"]*)"/.exec(t[1])?.[1];
        const morfo = /morph="([^"]*)"/.exec(t[1])?.[1] || '';   // H… hebreo, A… arameo
        palabras.push([t[2].replace(/\//g, ''), strongDeLema(lema), morfo]);
      } else if (palabras.length && (t[3] === 'maqqef' || t[3] === 'sof-pasuq')) {
        palabras[palabras.length - 1][0] += t[4];
      }
    }
    (capitulos[c - 1] ||= [])[v - 1] = palabras;
  }
  return rellenar(capitulos);
}

/** Un libro de MorphGNT (texto) → capítulos con [palabra, strong, morfología, lema] */
export function leerMorphgnt(texto, strongDe) {
  const capitulos = [];
  for (const linea of texto.split('\n')) {
    const [ref, pos, analisis, conPuntuacion, , , lema] = linea.trim().split(' ');
    if (!ref || !lema) continue;
    const c = Number(ref.slice(2, 4)), v = Number(ref.slice(4, 6));
    // Se quitan los signos del aparato crítico de SBLGNT (⸀ ⸁ ⸂ ⸃ ⸄ ⸅)
    const palabra = conPuntuacion.replace(/[\u2E00-\u2E0F]/g, '');
    ((capitulos[c - 1] ||= [])[v - 1] ||= []).push([palabra, strongDe(lema), `${pos}${analisis}`, lema]);
  }
  return rellenar(capitulos);
}

function rellenar(capitulos) {
  for (let i = 0; i < capitulos.length; i++) {
    capitulos[i] ||= [];
    for (let j = 0; j < capitulos[i].length; j++) capitulos[i][j] ||= [];
  }
  return capitulos;
}

/** El diccionario de Strong viene como JS: `var x = {...}; module.exports = x;` */
export function leerDiccionarioJs(js) {
  const inicio = js.indexOf('{', js.indexOf('='));
  const fin = js.lastIndexOf('};');
  return JSON.parse(js.slice(inicio, fin + 1));
}

/** Glosa breve de la KJV: "favour, good deed(-liness), kindly" → "favour" */
export function glosaKjv(kjv) {
  let sinParentesis = String(kjv || '').replace(/[×+]/g, '');
  // Paréntesis anidados: se quitan de adentro hacia afuera
  while (/\([^()]*\)/.test(sinParentesis)) sinParentesis = sinParentesis.replace(/\([^()]*\)/g, '');
  sinParentesis = sinParentesis.replace(/\(.*$/, '');
  return sinParentesis.split(/[,;:]/)[0].replace(/\s+/g, ' ').trim();
}

function leerDodson(csv) {
  const salida = new Map();
  for (const linea of csv.split('\n').slice(1)) {
    const campos = [...linea.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    if (campos.length >= 4) salida.set(Number(campos[0]), campos[3]);
  }
  return salida;
}

async function main() {
  const [dicG, dicH, dodsonCsv] = await Promise.all([
    leer(FUENTES.griego, 'strongs-greek-dictionary.js'),
    leer(FUENTES.hebreo, 'strongs-hebrew-dictionary.js'),
    leer(FUENTES.dodson, 'dodson.csv'),
  ]);
  const griego = leerDiccionarioJs(dicG);
  const hebreo = leerDiccionarioJs(dicH);
  const dodson = leerDodson(dodsonCsv);

  // Léxicos compactos
  await mkdir(join(DESTINO, 'lexico'), { recursive: true });
  const lexH = {};
  for (const [k, e] of Object.entries(hebreo)) {
    lexH[Number(k.slice(1))] = [e.lemma, e.xlit || '', (e.strongs_def || '').trim(), (e.kjv_def || '').trim(), (e.derivation || '').trim(), glosaKjv(e.strongs_def) || glosaKjv(e.kjv_def)];
    // la fuente trae algún carácter dañado (U+FFFD), p. ej. en H7374
    lexH[Number(k.slice(1))] = lexH[Number(k.slice(1))].map((x) => String(x).replace(/\s*\uFFFD/g, ''));
  }
  const lexG = {};
  const lemaAStrong = new Map();
  const lemaAStrongPlano = new Map();
  for (const [k, e] of Object.entries(griego)) {
    const n = Number(k.slice(1));
    lexG[n] = [e.lemma, e.translit || '', (e.strongs_def || '').trim(), (e.kjv_def || '').trim(), (e.derivation || '').trim(), dodson.get(n) || glosaKjv(e.kjv_def)];
    if (e.lemma && !lemaAStrong.has(e.lemma)) lemaAStrong.set(e.lemma, n);
    if (e.lemma && !lemaAStrongPlano.has(sinAcentos(e.lemma))) lemaAStrongPlano.set(sinAcentos(e.lemma), n);
  }
  await writeFile(join(DESTINO, 'lexico', 'H.json'), JSON.stringify(lexH));
  await writeFile(join(DESTINO, 'lexico', 'G.json'), JSON.stringify(lexG));
  console.log(`  léxico: ${Object.keys(lexH).length} entradas hebreas, ${Object.keys(lexG).length} griegas`);

  // Hebreo
  const carpetaH = join(DESTINO, 'heb');
  await rm(carpetaH, { recursive: true, force: true });
  await mkdir(carpetaH, { recursive: true });
  let palabrasH = 0;
  for (const l of LIBROS.slice(0, 39)) {
    const caps = leerOshb(await leer(FUENTES.oshb(l.osis), `${l.osis}.xml`));
    palabrasH += caps.flat().reduce((s, v) => s + v.length, 0);
    await writeFile(join(carpetaH, `${String(l.n).padStart(2, '0')}.json`), JSON.stringify(caps));
  }
  console.log(`  hebreo: ${palabrasH} palabras`);

  // Griego
  const carpetaG = join(DESTINO, 'gri');
  await rm(carpetaG, { recursive: true, force: true });
  await mkdir(carpetaG, { recursive: true });
  let palabrasG = 0, sinStrong = 0;
  const strongDe = (lema) => {
    // "οὕτω(ς)": se prueba con y sin la letra opcional
    const formas = /\(/.test(lema) ? [lema.replace(/[()]/g, ''), lema.replace(/\([^)]*\)/g, '')] : [lema];
    let n = 0;
    for (const f of formas) { n ||= lemaAStrong.get(f) || lemaAStrongPlano.get(sinAcentos(f)) || 0; }
    if (!n) sinStrong++;
    return n;
  };
  for (let i = 0; i < 27; i++) {
    const caps = leerMorphgnt(await leer(FUENTES.sblgnt(SBLGNT[i]), `${SBLGNT[i]}-morphgnt.txt`), strongDe);
    palabrasG += caps.flat().reduce((s, v) => s + v.length, 0);
    await writeFile(join(carpetaG, `${40 + i}.json`), JSON.stringify(caps));
  }
  console.log(`  griego: ${palabrasG} palabras (${sinStrong} sin número Strong)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
