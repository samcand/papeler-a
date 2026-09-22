/**
 * busqueda.js — Búsqueda en todo el texto y estudio de palabras (concordancia).
 *
 * Sintaxis de la consulta, pensada para no tener que leer un manual:
 *   gracia fe          todas las palabras (en cualquier orden)
 *   "el verbo"         frase exacta
 *   amor | caridad     cualquiera de las dos
 *   justic*            palabras que empiezan así (justicia, justicias, justificado…)
 *   -ley               excluye versículos con esa palabra
 * Por defecto no distingue tildes ni mayúsculas: "jehova" encuentra "Jehová".
 */

import { normalizar } from './referencias.js';

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LETRA = 'a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\\u0370-\\u03ff\\u1f00-\\u1fff\\u0590-\\u05ff';

/** Traduce la consulta a términos: { grupos: [[término|término]...], excluir: [] } */
export function analizarConsulta(consulta, { tildes = false } = {}) {
  const prep = (s) => (tildes ? s.toLowerCase() : normalizar(s));
  const fichas = [];
  const re = /(-?)"([^"]+)"|(\S+)/g;
  for (const m of String(consulta).matchAll(re)) {
    if (m[2]) fichas.push({ texto: prep(m[2]).trim(), frase: true, negar: m[1] === '-' });
    else fichas.push({ texto: m[3], frase: false, negar: false });
  }
  const grupos = [];
  const excluir = [];
  let unir = false;
  for (const f of fichas) {
    if (f.texto === '|' || /^o$/i.test(f.texto) && grupos.length && !f.frase) { unir = true; continue; }
    let texto = f.frase ? f.texto : prep(f.texto);
    let negar = f.negar;
    if (!f.frase && texto.startsWith('-') && texto.length > 1) { negar = true; texto = texto.slice(1); }
    if (!f.frase) {
      // "amor|caridad" sin espacios
      if (texto.includes('|')) {
        const alternativas = texto.split('|').filter(Boolean).map((t) => termino(t, false));
        if (alternativas.length) grupos.push(alternativas);
        unir = false;
        continue;
      }
      texto = texto.replace(/[^\p{L}\p{N}*]/gu, '');
    }
    if (!texto) continue;
    const t = termino(texto, f.frase);
    if (negar) excluir.push(t);
    else if (unir && grupos.length) grupos[grupos.length - 1].push(t);
    else grupos.push([t]);
    unir = false;
  }
  return { grupos, excluir, tildes };
}

function termino(texto, frase) {
  const prefijo = texto.endsWith('*');
  const limpio = texto.replace(/\*+$/, '');
  const cuerpo = limpio.split(/\s+/).map(escapar).join('\\s+');
  const re = new RegExp(`(?<![${LETRA}])${cuerpo}${prefijo ? `[${LETRA}]*` : `(?![${LETRA}])`}`, 'g');
  return { texto: limpio, frase, prefijo, re };
}

/** ¿El versículo cumple la consulta? Devuelve los tramos a resaltar, o null. */
export function coincide(texto, consulta) {
  const plano = consulta.tildes ? texto.toLowerCase() : normalizar(texto);
  for (const t of consulta.excluir) { t.re.lastIndex = 0; if (t.re.test(plano)) return null; }
  const tramos = [];
  for (const grupo of consulta.grupos) {
    let alguno = false;
    for (const t of grupo) {
      t.re.lastIndex = 0;
      for (const m of plano.matchAll(t.re)) { tramos.push([m.index, m.index + m[0].length]); alguno = true; }
    }
    if (!alguno) return null;
  }
  return tramos.length ? unirTramos(tramos) : null;
}

export function unirTramos(tramos) {
  const orden = [...tramos].sort((a, b) => a[0] - b[0]);
  const salida = [];
  for (const t of orden) {
    const u = salida[salida.length - 1];
    if (u && t[0] <= u[1]) u[1] = Math.max(u[1], t[1]);
    else salida.push([...t]);
  }
  return salida;
}

/**
 * Busca en una Biblia completa: libros[n-1] = capítulos[c-1] = versículos[v-1].
 * filtro(b) decide qué libros entran (todo, AT, NT, un libro…).
 */
export function buscar(libros, consultaTexto, { filtro = () => true, tildes = false, limite = 2000 } = {}) {
  const consulta = analizarConsulta(consultaTexto, { tildes });
  const resultados = [];
  const porLibro = new Array(66).fill(0);
  let total = 0;
  if (!consulta.grupos.length) return { resultados, porLibro, total, consulta };
  for (let b = 1; b <= 66; b++) {
    const libro = libros[b - 1];
    if (!libro || !filtro(b)) continue;
    for (let c = 0; c < libro.length; c++) {
      const caps = libro[c] || [];
      for (let v = 0; v < caps.length; v++) {
        const texto = caps[v];
        if (!texto) continue;
        const tramos = coincide(texto, consulta);
        if (!tramos) continue;
        total++;
        porLibro[b - 1]++;
        if (resultados.length < limite) resultados.push({ b, c: c + 1, v: v + 1, texto, tramos });
      }
    }
  }
  return { resultados, porLibro, total, consulta };
}

// Palabras vacías: no dicen nada del tema de un pasaje
const VACIAS = new Set(('a al ante bajo con contra de del desde en entre hacia hasta para por segun sin so sobre tras ' +
  'el la los las lo un una unos unas y e o u ni que qui quien cual como cuando donde mas pero sino ' +
  'se su sus mi mis tu tus te me le les nos os yo el ella ellos ellas vosotros nosotros usted es son fue fueron ' +
  'sera seran era eran ha han he has hay esta este estos estas ese esa esos esas aquel aquella aquellos aquellas ' +
  'no si ya asi tambien porque pues muy todo toda todos todas cosa cosas dijo dice dijeron ser estar haber ' +
  'vuestro vuestra vuestros vuestras nuestro nuestra nuestros nuestras suyo suya aqui alli entonces mas cual ' +
  'cuales sobre mismo misma tan tanto uno dos 1 2 3').split(' '));

/**
 * Estudio de una palabra: cuántas veces aparece, dónde se concentra, su primera
 * mención y con qué palabras suele ir acompañada.
 */
export function estudiarPalabra(libros, palabra, opciones = {}) {
  const { resultados, porLibro, total } = buscar(libros, palabra, { ...opciones, limite: 100000 });
  let apariciones = 0;
  const vecinas = new Map();
  const objetivo = normalizar(palabra).replace(/\*$/, '');
  for (const r of resultados) {
    apariciones += r.tramos.length;
    const palabras = normalizar(r.texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const vistas = new Set();
    for (const p of palabras) {
      if (p.length < 3 || VACIAS.has(p) || p.startsWith(objetivo) || vistas.has(p)) continue;
      vistas.add(p);
      vecinas.set(p, (vecinas.get(p) || 0) + 1);
    }
  }
  const at = porLibro.slice(0, 39).reduce((s, n) => s + n, 0);
  return {
    palabra,
    versiculos: total,
    apariciones,
    at,
    nt: total - at,
    porLibro,
    primera: resultados[0] || null,
    ultima: resultados[resultados.length - 1] || null,
    acompanantes: [...vecinas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    resultados,
  };
}
