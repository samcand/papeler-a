/**
 * anotaciones.js — Marcas a mano sobre la hoja de acordes: círculos, flechas,
 * "aquí corta". Lo que todo el mundo hace con lápiz sobre el papel.
 *
 * El problema de dibujar sobre una hoja que cambia: si subes el tamaño de letra
 * o transpones, la hoja se reacomoda y un dibujo con coordenadas fijas queda
 * flotando en el sitio equivocado. Por eso cada trazo se ancla a la sección
 * sobre la que se dibujó y se guarda en coordenadas relativas a esa sección
 * (0 a 1). Así la marca viaja con su verso aunque la hoja se reacomode.
 */

export const HERRAMIENTAS = [
  { id: 'lapiz', nombre: 'Lápiz', ancho: 2.4, opacidad: 1 },
  { id: 'marcador', nombre: 'Resaltador', ancho: 16, opacidad: 0.32 },
  { id: 'borrador', nombre: 'Borrador', ancho: 18, opacidad: 1 },
];

export const COLORES = [
  { id: 'rojo', valor: '#f87171', nombre: 'Rojo' },
  { id: 'ambar', valor: '#ffb454', nombre: 'Ámbar' },
  { id: 'verde', valor: '#4ade80', nombre: 'Verde' },
  { id: 'azul', valor: '#5ec8f2', nombre: 'Azul' },
  { id: 'violeta', valor: '#c084fc', nombre: 'Violeta' },
];

let contador = 0;
export function nuevoId() {
  contador += 1;
  return `tr-${Date.now().toString(36)}-${contador.toString(36)}`;
}

/** Redondeo corto: cuatro decimales sobran para una hoja de acordes. */
const r4 = (n) => Math.round(n * 10000) / 10000;

/**
 * Simplifica un trazo (Ramer-Douglas-Peucker). Un trazo a mano trae cientos de
 * puntos casi idénticos; guardarlos todos llena el almacenamiento sin mejorar
 * en nada lo que se ve.
 */
export function simplificar(puntos, tolerancia = 0.002) {
  if (!Array.isArray(puntos) || puntos.length <= 2) return puntos || [];

  const distanciaARecta = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const largo2 = dx * dx + dy * dy;
    if (largo2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };

  const recorrer = (desde, hasta) => {
    let maxDist = 0;
    let indice = -1;
    for (let i = desde + 1; i < hasta; i++) {
      const d = distanciaARecta(puntos[i], puntos[desde], puntos[hasta]);
      if (d > maxDist) { maxDist = d; indice = i; }
    }
    if (maxDist > tolerancia && indice !== -1) {
      return [...recorrer(desde, indice), ...recorrer(indice, hasta).slice(1)];
    }
    return [puntos[desde], puntos[hasta]];
  };

  return recorrer(0, puntos.length - 1);
}

/** Crea un trazo listo para guardar. `puntos` ya vienen normalizados (0 a 1). */
export function crearTrazo({ herramienta = 'lapiz', color = 'ambar', seccion = -1, puntos = [] }) {
  const simplificados = simplificar(puntos).map((p) => [r4(p[0]), r4(p[1])]);
  return { id: nuevoId(), h: herramienta, c: color, s: seccion, p: simplificados };
}

/** Convierte un trazo en el atributo `d` de un path SVG, suavizando las esquinas. */
export function pathDeTrazo(trazo, caja) {
  const puntos = (trazo.p || []).map(([x, y]) => [x * caja.ancho, y * caja.alto]);
  if (!puntos.length) return '';
  if (puntos.length === 1) {
    const [x, y] = puntos[0];
    return `M ${r4(x)} ${r4(y)} l 0.1 0`;   // un punto suelto también se ve
  }
  const partes = [`M ${r4(puntos[0][0])} ${r4(puntos[0][1])}`];
  for (let i = 1; i < puntos.length - 1; i++) {
    const medioX = (puntos[i][0] + puntos[i + 1][0]) / 2;
    const medioY = (puntos[i][1] + puntos[i + 1][1]) / 2;
    partes.push(`Q ${r4(puntos[i][0])} ${r4(puntos[i][1])} ${r4(medioX)} ${r4(medioY)}`);
  }
  const ultimo = puntos[puntos.length - 1];
  partes.push(`L ${r4(ultimo[0])} ${r4(ultimo[1])}`);
  return partes.join(' ');
}

/**
 * ¿El borrador toca este trazo?
 *
 * Con `caja` (ancho y alto en píxeles) la distancia se mide en píxeles, que es
 * lo correcto: una sección es mucho más ancha que alta, y medir en coordenadas
 * relativas haría que el borrador perdonara 25 px en horizontal y solo 4 en
 * vertical. Sin `caja` se mide en coordenadas relativas.
 */
export function tocaTrazo(trazo, punto, radio = 14, caja = null) {
  const escalaX = caja ? caja.ancho : 1;
  const escalaY = caja ? caja.alto : 1;
  const puntos = (trazo.p || []).map(([x, y]) => [x * escalaX, y * escalaY]);
  if (!puntos.length) return false;
  const px = punto[0] * escalaX;
  const py = punto[1] * escalaY;
  if (puntos.length === 1) return Math.hypot(puntos[0][0] - px, puntos[0][1] - py) <= radio;
  for (let i = 1; i < puntos.length; i++) {
    const [ax, ay] = puntos[i - 1];
    const [bx, by] = puntos[i];
    const dx = bx - ax;
    const dy = by - ay;
    const largo2 = dx * dx + dy * dy;
    let t = largo2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / largo2;
    t = Math.max(0, Math.min(1, t));
    if (Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= radio) return true;
  }
  return false;
}

/** Borra los trazos que toca el borrador. Devuelve los que quedan y cuántos se fueron. */
export function borrarEn(trazos, punto, { seccion = -1, radio = 14, caja = null } = {}) {
  const quedan = trazos.filter((t) => !((t.s ?? -1) === seccion && tocaTrazo(t, punto, radio, caja)));
  return { trazos: quedan, borrados: trazos.length - quedan.length };
}

export function estiloDeTrazo(trazo) {
  const herramienta = HERRAMIENTAS.find((h) => h.id === trazo.h) || HERRAMIENTAS[0];
  const color = COLORES.find((c) => c.id === trazo.c) || COLORES[1];
  return {
    color: color.valor,
    ancho: herramienta.ancho,
    opacidad: herramienta.opacidad,
    remate: herramienta.id === 'marcador' ? 'butt' : 'round',
  };
}

/** Agrupa los trazos por sección, que es como se dibujan las capas. */
export function porSeccion(trazos = []) {
  const mapa = new Map();
  for (const t of trazos) {
    const clave = t.s ?? -1;
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(t);
  }
  return mapa;
}

/** Cuenta para mostrar en la interfaz ("3 marcas en el Coro"). */
export function resumenAnotaciones(trazos = [], nombresSeccion = []) {
  const mapa = porSeccion(trazos);
  return [...mapa.entries()]
    .map(([seccion, lista]) => ({
      seccion,
      nombre: seccion === -1 ? 'Toda la hoja' : (nombresSeccion[seccion] || `Sección ${seccion + 1}`),
      marcas: lista.length,
    }))
    .sort((a, b) => a.seccion - b.seccion);
}

/** Tamaño aproximado en el almacenamiento, para avisar antes de llenarlo. */
export function pesoAproximado(trazos = []) {
  return JSON.stringify(trazos).length;
}
