/**
 * dia.js — Las tres cosas del día y las tareas que se aplazan para siempre.
 *
 * Dos ideas pequeñas que cambian el uso diario: obligar a elegir tres cosas, y
 * mirar de frente lo que llevas posponiendo desde hace un mes.
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';
import { estaVencida } from './modelo.js';

/* ------------------------------------------------------------------ *
 * Las tres del día
 * ------------------------------------------------------------------ */

/** Las tres elegidas para hoy; se olvidan solas al cambiar el día. */
export function tresDelDia(ajustes = {}, tareas = [], hoyISO = aISO(hoy())) {
  const guardado = ajustes.tresDelDia;
  const ids = guardado && guardado.fecha === hoyISO ? (guardado.ids || []) : [];
  const elegidas = ids.map((id) => tareas.find((t) => t.id === id)).filter(Boolean);
  return {
    elegidas,
    ids: elegidas.map((t) => t.id),
    hechas: elegidas.filter((t) => t.completada).length,
    libres: Math.max(0, 3 - elegidas.length),
    completo: elegidas.length > 0 && elegidas.every((t) => t.completada),
  };
}

/**
 * Propuesta automática: lo urgente primero, después lo que tiene hora y por
 * último lo más prioritario del día. La misma regla del resumen de la mañana.
 */
export function proponerTres(tareas = [], hoyISO = aISO(hoy())) {
  const pendientes = tareas.filter((t) => !t.completada && !t.padre && !t.archivada);
  const vencidas = pendientes.filter((t) => estaVencida(t, hoyISO));
  const deHoy = pendientes.filter((t) => t.fecha === hoyISO);
  const urgentes = [...vencidas, ...deHoy].filter((t) => t.prioridad === 1);
  const conHora = deHoy.filter((t) => t.hora).sort((a, b) => a.hora.localeCompare(b.hora));
  const resto = [...deHoy].sort((a, b) => a.prioridad - b.prioridad);

  const elegidas = [];
  for (const t of [...urgentes, ...conHora, ...resto, ...vencidas]) {
    if (elegidas.length >= 3) break;
    if (!elegidas.some((x) => x.id === t.id)) elegidas.push(t);
  }
  return elegidas;
}

/** Añade o quita una tarea de las tres; no deja pasar de tres. */
export function alternarTres(ajustes = {}, tareaId, hoyISO = aISO(hoy())) {
  const guardado = ajustes.tresDelDia;
  const actuales = guardado && guardado.fecha === hoyISO ? [...(guardado.ids || [])] : [];
  const i = actuales.indexOf(tareaId);
  if (i >= 0) actuales.splice(i, 1);
  else if (actuales.length < 3) actuales.push(tareaId);
  else return { fecha: hoyISO, ids: actuales, lleno: true };
  return { fecha: hoyISO, ids: actuales, lleno: false };
}

/* ------------------------------------------------------------------ *
 * Tareas que se aplazan para siempre
 * ------------------------------------------------------------------ */

export const UMBRAL_APLAZAMIENTOS = 5;

/**
 * Lo que llevas posponiendo tantas veces que ya es una decisión tomada sin
 * admitirlo. Devuelve también cuánto tiempo lleva rodando.
 */
export function zombis(tareas = [], hoyISO = aISO(hoy()), umbral = UMBRAL_APLAZAMIENTOS) {
  return tareas
    .filter((t) => !t.completada && !t.archivada && (t.aplazamientos || 0) >= umbral)
    .map((t) => ({
      ...t,
      diasRodando: t.creadaEn ? diferenciaDias(String(t.creadaEn).slice(0, 10), hoyISO) : null,
    }))
    .sort((a, b) => (b.aplazamientos || 0) - (a.aplazamientos || 0));
}

/**
 * ¿Este cambio de fecha cuenta como aplazamiento? Solo si empuja la tarea hacia
 * adelante: traer algo a hoy desde el pasado es ponerse al día, no posponer.
 */
export function esAplazamiento(fechaAnterior, fechaNueva) {
  if (!fechaNueva) return false;
  if (!fechaAnterior) return false;
  return fechaNueva > fechaAnterior;
}

/** Las cuatro salidas honestas para una tarea zombi. */
export const SALIDAS_ZOMBI = [
  { id: 'hoy', texto: 'Hacerla hoy', descripcion: 'Si lleva cinco aplazamientos y sigue viva, hoy es el día.' },
  { id: 'algunDia', texto: 'Quitarle la fecha', descripcion: 'Que viva en "algún día" sin fingir que tiene día.' },
  { id: 'trocear', texto: 'Trocearla', descripcion: 'Casi siempre se pospone porque es demasiado grande para un hueco.' },
  { id: 'borrar', texto: 'Borrarla', descripcion: 'No pasa nada. Llevas un mes decidiendo esto sin decirlo.' },
];
