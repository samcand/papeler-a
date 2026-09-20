/**
 * autocompletar.js — Sugerencias al escribir # y @.
 *
 * Es lo que evita acabar con "cartera", "Cartera" y "carteras" como tres
 * proyectos distintos. Funciona sobre el texto y la posición del cursor, sin
 * tocar el DOM, para poder probarlo.
 */

const LIMITE = 6;

function limpia(txt) {
  return String(txt).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Qué sugerir para lo que se está escribiendo justo antes del cursor.
 * Devuelve null si el cursor no está sobre un #proyecto o una @etiqueta.
 */
export function sugerencias(texto = '', cursor = texto.length, fuentes = {}) {
  const antes = String(texto).slice(0, cursor);
  const m = antes.match(/(^|\s)([#@])([\wáéíóúüñÁÉÍÓÚÜÑ.-]*)$/);
  if (!m) return null;

  const simbolo = m[2];
  const prefijo = m[3];
  const candidatos = simbolo === '#' ? (fuentes.proyectos || []) : (fuentes.etiquetas || []);
  const p = limpia(prefijo);

  const empiezan = candidatos.filter((c) => limpia(c).startsWith(p));
  const contienen = candidatos.filter((c) => !limpia(c).startsWith(p) && limpia(c).includes(p));
  const opciones = [...empiezan, ...contienen].slice(0, LIMITE);

  return {
    simbolo,
    prefijo,
    inicio: cursor - prefijo.length - 1,   // incluye el símbolo
    fin: cursor,
    opciones,
    // Sin ninguna coincidencia, lo que escribes creará uno nuevo: conviene decirlo.
    nuevo: prefijo.length > 0 && opciones.length === 0,
  };
}

/** Mete la opción elegida en el texto y dice dónde queda el cursor. */
export function aplicar(texto = '', sugerencia, valor) {
  if (!sugerencia) return { texto, cursor: texto.length };
  const necesitaComillas = /\s/.test(valor);
  const nombre = necesitaComillas ? `"${valor}"` : valor;
  // Si ya hay un espacio detrás no se añade otro: el cursor salta por encima.
  const siguiente = texto.slice(sugerencia.fin, sugerencia.fin + 1);
  const yaHayEspacio = /\s/.test(siguiente);
  const trozo = `${sugerencia.simbolo}${nombre}${yaHayEspacio ? '' : ' '}`;
  const nuevo = texto.slice(0, sugerencia.inicio) + trozo + texto.slice(sugerencia.fin);
  return { texto: nuevo, cursor: sugerencia.inicio + trozo.length + (yaHayEspacio ? 1 : 0) };
}

/** Proyectos y etiquetas que ya existen, para alimentar las sugerencias. */
export function fuentesDe(estado = {}) {
  const etiquetas = new Set();
  for (const t of estado.tareas || []) for (const e of t.etiquetas || []) etiquetas.add(e);
  return {
    proyectos: (estado.proyectos || []).map((p) => p.nombre),
    etiquetas: [...etiquetas].sort(),
  };
}
