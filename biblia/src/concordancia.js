/**
 * concordancia.js — Concordancias, como las impresas pero al instante.
 *
 *   · Del texto traducido: índice alfabético de todas las palabras con su
 *     frecuencia, y cada aparición en una línea con el contexto a ambos lados
 *     (formato KWIC), ordenable por orden bíblico o por el contexto.
 *   · Del texto original: todas las apariciones de un número Strong.
 *
 * Los libros llegan como libros[b-1][c-1][v-1] (texto, o lista de palabras
 * [palabra, strong, morfología] en el caso del original).
 */

import { normalizar } from './referencias.js';
import { analizarConsulta } from './busqueda.js';

const RE_PALABRA = /[\p{L}\p{M}]+(?:['’][\p{L}]+)?/gu;

/** Clave de orden alfabético: sin tildes ni mayúsculas, pero la ñ sigue siendo ñ. */
export function claveOrden(palabra) {
  return String(palabra).toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'ñ');
}

/**
 * Índice alfabético de las palabras de una versión.
 * Devuelve [{ clave, forma, n, formas: [[forma, n]], libros }] ordenado alfabéticamente;
 * `clave` no lleva tildes ni mayúsculas, `forma` es la escritura más frecuente.
 */
export function indicePalabras(libros, { filtro = () => true } = {}) {
  const mapa = new Map();
  let total = 0;
  for (let b = 1; b <= 66; b++) {
    const libro = libros[b - 1];
    if (!libro || !filtro(b)) continue;
    for (const cap of libro) {
      for (const texto of cap || []) {
        if (!texto) continue;
        for (const m of texto.matchAll(RE_PALABRA)) {
          const forma = m[0].toLowerCase();
          const clave = claveOrden(forma);
          let e = mapa.get(clave);
          if (!e) { e = { clave, n: 0, formas: new Map(), escrituras: new Map(), libros: new Set() }; mapa.set(clave, e); }
          e.n++;
          e.formas.set(forma, (e.formas.get(forma) || 0) + 1);
          // Mayúsculas a mitad de versículo = nombre propio (Gaal, Jehová); al inicio no cuentan
          if (m.index > 0) e.escrituras.set(m[0], (e.escrituras.get(m[0]) || 0) + 1);
          e.libros.add(b);
          total++;
        }
      }
    }
  }
  const lista = [...mapa.values()].map((e) => {
    const formas = [...e.formas.entries()].sort((a, z) => z[1] - a[1]);
    const escritura = [...e.escrituras.entries()].sort((a, z) => z[1] - a[1])[0]?.[0];
    const forma = escritura && escritura.toLowerCase() === formas[0][0] ? escritura : formas[0][0];
    return { clave: e.clave, forma, n: e.n, formas, libros: e.libros.size };
  });
  lista.sort((a, z) => a.clave.localeCompare(z.clave, 'es'));
  return { palabras: lista, total, distintas: lista.length, hapax: lista.filter((e) => e.n === 1).length };
}

/** Recorta el contexto a palabras completas: "…de tal manera" en vez de "e tal manera". */
function recortar(texto, ancho, lado) {
  if (texto.length <= ancho) return { texto, cortado: false };
  if (lado === 'izq') {
    const parte = texto.slice(texto.length - ancho);
    const i = parte.indexOf(' ');
    return { texto: i >= 0 && i < ancho / 2 ? parte.slice(i + 1) : parte, cortado: true };
  }
  const parte = texto.slice(0, ancho);
  const i = parte.lastIndexOf(' ');
  return { texto: i > ancho / 2 ? parte.slice(0, i) : parte, cortado: true };
}

/**
 * Concordancia de un término: cada aparición con su contexto.
 *   modo 'exacta'  → la palabra tal cual (sin distinguir tildes)
 *   modo 'raiz'    → todas las palabras que empiezan así (justific → justificado, justificación…)
 *   modo 'frase'   → varias palabras seguidas ("hijo del hombre")
 * Devuelve { lineas, porLibro, apariciones, versiculos, formas }.
 */
export function concordancia(libros, termino, { modo = 'exacta', tildes = false, filtro = () => true, ancho = 70, limite = 50000 } = {}) {
  let t = String(termino).trim().replace(/^"|"$/g, '').replace(/\*+$/, '');
  if (!t) return { lineas: [], porLibro: new Array(66).fill(0), apariciones: 0, versiculos: 0, formas: [] };
  const consulta = modo === 'raiz' ? `${t}*` : /\s/.test(t) ? `"${t}"` : t;
  const re = new RegExp(analizarConsulta(consulta, { tildes }).grupos[0][0].re.source, 'g');
  const lineas = [];
  const porLibro = new Array(66).fill(0);
  const formas = new Map();
  let versiculos = 0;
  for (let b = 1; b <= 66; b++) {
    const libro = libros[b - 1];
    if (!libro || !filtro(b)) continue;
    for (let c = 0; c < libro.length; c++) {
      for (let v = 0; v < (libro[c] || []).length; v++) {
        const texto = libro[c][v];
        if (!texto) continue;
        const plano = tildes ? texto.toLowerCase() : normalizar(texto);
        let enVerso = false;
        re.lastIndex = 0;
        for (const m of plano.matchAll(re)) {
          const i = m.index, j = i + m[0].length;
          const palabra = texto.slice(i, j);
          const izq = recortar(texto.slice(0, i), ancho, 'izq');
          const der = recortar(texto.slice(j), ancho, 'der');
          if (lineas.length < limite) lineas.push({ b, c: c + 1, v: v + 1, izq: izq.texto, palabra, der: der.texto, cortadoIzq: izq.cortado, cortadoDer: der.cortado });
          porLibro[b - 1]++;
          formas.set(palabra.toLowerCase(), (formas.get(palabra.toLowerCase()) || 0) + 1);
          enVerso = true;
        }
        if (enVerso) versiculos++;
      }
    }
  }
  return {
    lineas, porLibro, versiculos,
    apariciones: porLibro.reduce((s, n) => s + n, 0),
    formas: [...formas.entries()].sort((a, z) => z[1] - a[1]),
  };
}

const ultimaPalabra = (t) => normalizar((t.match(RE_PALABRA) || ['']).at(-1) || '');

/**
 * Orden de las líneas:
 *   'biblico'   → Génesis a Apocalipsis (el de siempre)
 *   'derecha'   → por la palabra que sigue (agrupa "amor de Dios", "amor fraternal"…)
 *   'izquierda' → por la palabra que precede (agrupa "su amor", "tu amor"…)
 */
export function ordenarLineas(lineas, orden = 'biblico') {
  const biblico = (a, z) => a.b - z.b || a.c - z.c || a.v - z.v;
  if (orden === 'derecha') {
    return [...lineas].sort((a, z) => normalizar(a.der.trim()).localeCompare(normalizar(z.der.trim()), 'es') || biblico(a, z));
  }
  if (orden === 'izquierda') {
    return [...lineas].sort((a, z) => ultimaPalabra(a.izq).localeCompare(ultimaPalabra(z.izq), 'es') || biblico(a, z));
  }
  return [...lineas].sort(biblico);
}

/** Palabras que más se repiten justo antes y justo después (colocaciones), con su tilde. */
export function colocaciones(lineas, cuantas = 12) {
  const antes = new Map(), despues = new Map();
  const sumar = (mapa, palabra) => {
    if (!palabra) return;
    const k = normalizar(palabra);
    const e = mapa.get(k) || { forma: palabra.toLowerCase(), n: 0 };
    e.n++;
    mapa.set(k, e);
  };
  for (const l of lineas) {
    sumar(antes, (l.izq.match(RE_PALABRA) || []).at(-1));
    sumar(despues, (l.der.match(RE_PALABRA) || [])[0]);
  }
  const orden = (m) => [...m.values()].sort((x, y) => y.n - x.n).slice(0, cuantas).map((e) => [e.forma, e.n]);
  return { antes: orden(antes), despues: orden(despues) };
}

/** La concordancia en texto plano, lista para imprimir o pegar en un documento. */
export function concordanciaATexto(lineas, { titulo = '', formatearRef = (l) => `${l.b}.${l.c}.${l.v}` } = {}) {
  const filas = lineas.map((l) => `${formatearRef(l).padEnd(22)} ${l.cortadoIzq ? '…' : ''}${l.izq}${l.palabra.toUpperCase()}${l.der}${l.cortadoDer ? '…' : ''}`);
  const cabecera = titulo ? [titulo, '='.repeat(titulo.length), ''] : [];
  return [...cabecera, ...filas, ''].join('\n');
}

/** Quita acentos, cantilación y puntuación para agrupar formas iguales. */
export function formaBase(palabra) {
  return String(palabra)
    .normalize('NFD')
    .replace(/[\u0591-\u05AF\u05BD\u05C0\u05C3]/g, '')   // acentos hebreos (se conservan las vocales)
    .replace(/[\u0300-\u0345]/g, '')                       // acentos griegos
    .replace(/[\u05C3\u05BE.,;·:!?“”"()[\]]/g, '')
    .normalize('NFC')
    .toLowerCase();
}

/**
 * Del código hebreo "HC/Vqw3ms" solo interesa la palabra misma ("HVqw3ms"),
 * no la conjunción, la preposición, el artículo ni el sufijo pegados a ella.
 */
export function morfologiaPrincipal(codigo) {
  const c = String(codigo || '');
  if (!/^[HA]/.test(c) || !c.includes('/')) return c;
  const partes = c.slice(1).split('/');
  const principal = partes.find((p) => 'NAVP'.includes(p[0])) || partes[partes.length - 1];
  return c[0] + principal;
}

export function estudioOriginal(libros, strong) {
  const lugares = [];
  const porLibro = new Array(66).fill(0);
  const formas = new Map();
  const morfologias = new Map();
  let versiculos = 0;
  for (let b = 1; b <= 66; b++) {
    const libro = libros[b - 1];
    if (!libro) continue;
    for (let c = 0; c < libro.length; c++) {
      for (let v = 0; v < (libro[c] || []).length; v++) {
        const tokens = libro[c][v] || [];
        let enVerso = false;
        tokens.forEach((w, k) => {
          if (w[1] !== strong) return;
          lugares.push({ b, c: c + 1, v: v + 1, k });
          porLibro[b - 1]++;
          const f = formaBase(w[0]);
          formas.set(f, (formas.get(f) || 0) + 1);
          const m = morfologiaPrincipal(w[2]);
          morfologias.set(m, (morfologias.get(m) || 0) + 1);
          enVerso = true;
        });
        if (enVerso) versiculos++;
      }
    }
  }
  const orden = (mapa) => [...mapa.entries()].sort((a, z) => z[1] - a[1]);
  return { lugares, porLibro, apariciones: lugares.length, versiculos, formas: orden(formas), morfologias: orden(morfologias) };
}
