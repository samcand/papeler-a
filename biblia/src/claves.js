/**
 * claves.js — Palabras clave marcadas automáticamente (método inductivo).
 *
 * En vez de marcar "pacto" a mano cada vez, se define una regla una sola vez
 * (palabra, estilo, color, símbolo) y la app la marca en todo el libro o en
 * toda la Biblia. Las reglas se agrupan en "juegos" (p. ej. "Romanos:
 * justificación") que se encienden o apagan según el estudio.
 *   { id, palabra, raiz, estilo, color, simbolo, alcance: 0 (toda) | n.º de libro,
 *     version, juego, activa, creada }
 */

import { analizarConsulta } from './busqueda.js';
import { normalizar } from './referencias.js';
import { nuevoId } from './marcas.js';

export function crearClave({ palabra, raiz = false, estilo = 'resaltar', color = 'amarillo', simbolo = '', alcance = 0, version = 'rv1909', juego = '' }) {
  return {
    id: nuevoId('k'), palabra: String(palabra).trim(), raiz: Boolean(raiz), estilo, color,
    simbolo: simbolo || '', alcance: Number(alcance) || 0, version, juego: String(juego || '').trim(),
    activa: true, creada: Date.now(),
  };
}

/** Expresión de búsqueda de una regla ("hijo del hombre" se busca como frase). */
export function consultaDe(regla) {
  const p = regla.palabra.trim();
  if (/\s/.test(p)) return `"${p}"`;
  return regla.raiz ? `${p}*` : p;
}

/** Deja listas las reglas que aplican a una versión y un libro. */
export function compilarClaves(reglas, { version, b, juegosOcultos = [] }) {
  const salida = [];
  for (const regla of reglas || []) {
    if (!regla.activa || regla.version !== version) continue;
    if (regla.alcance && regla.alcance !== b) continue;
    if (regla.juego && juegosOcultos.includes(regla.juego)) continue;
    const q = analizarConsulta(consultaDe(regla));
    const termino = q.grupos[0]?.[0];
    if (termino) salida.push({ regla, re: new RegExp(termino.re.source, 'g') });
  }
  return salida;
}

/**
 * Marcas "virtuales" que las reglas producen en un versículo. Tienen fecha 0
 * para que cualquier marca hecha a mano quede por encima.
 */
export function marcasDeClaves(texto, id, compiladas) {
  if (!compiladas.length) return [];
  const plano = normalizar(texto);
  const marcas = [];
  for (const { regla, re } of compiladas) {
    re.lastIndex = 0;
    for (const m of plano.matchAll(re)) {
      const base = { version: regla.version, color: regla.color, creada: 0, clave: regla.id };
      marcas.push({ ...base, id: `${regla.id}-${id}-${m.index}`, estilo: regla.estilo,
        desde: { id, o: m.index }, hasta: { id, o: m.index + m[0].length } });
      if (regla.simbolo && regla.estilo !== 'simbolo') {
        marcas.push({ ...base, id: `${regla.id}-${id}-${m.index}-s`, estilo: 'simbolo', simbolo: regla.simbolo,
          desde: { id, o: m.index }, hasta: { id, o: m.index + m[0].length } });
      } else if (regla.estilo === 'simbolo') {
        marcas[marcas.length - 1].simbolo = regla.simbolo || '★';
      }
    }
  }
  return marcas;
}

/** Cuántas veces aparece la regla en su alcance: libros[b-1][c-1][v-1]. */
export function contarClave(libros, regla) {
  const [{ re } = {}] = compilarClaves([{ ...regla, activa: true }], { version: regla.version, b: regla.alcance || 1 });
  if (!re) return 0;
  let n = 0;
  for (let b = 1; b <= 66; b++) {
    if (regla.alcance && regla.alcance !== b) continue;
    for (const cap of libros[b - 1] || []) {
      for (const t of cap || []) {
        if (!t) continue;
        re.lastIndex = 0;
        n += (normalizar(t).match(re) || []).length;
      }
    }
  }
  return n;
}

export function juegos(reglas) {
  return [...new Set((reglas || []).map((r) => r.juego).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
