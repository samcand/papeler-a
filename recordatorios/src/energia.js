/**
 * energia.js — Qué puedo hacer *ahora*.
 *
 * Elegir tarea no es solo prioridad: a las siete de la tarde, después de cuatro
 * horas de clase, la tarea "escribir la discusión" no se va a hacer por mucho
 * que sea P1. Cruzar el tiempo que tienes con la energía que te queda acierta
 * más que cualquier lista ordenada.
 */

import { aISO, hoy } from './fechas.js';

export const NIVELES = [
  { id: 'alta', nombre: 'Cabeza fresca', icono: '🧠', descripcion: 'Escribir, decidir, estudiar algo nuevo.' },
  { id: 'media', nombre: 'Normal', icono: '🙂', descripcion: 'Preparar, corregir, organizar.' },
  { id: 'baja', nombre: 'Cansado', icono: '🥱', descripcion: 'Llamadas, correos, archivar, trámites.' },
];

/** La energía que se le supone a una tarea si no se la has puesto. */
export function energiaDe(tarea) {
  if (tarea.energia) return tarea.energia;
  const t = String(tarea.titulo || '').toLowerCase();
  if (/escrib|redact|analiz|dise[ñn]|estudi|investig|pensar|plantear|tesis/.test(t)) return 'alta';
  if (/llam|correo|email|archiv|ordenar|pagar|imprim|enviar|subir|copiar/.test(t)) return 'baja';
  return 'media';
}

/**
 * Qué cabe en el hueco que tienes, con la energía que tienes.
 *
 * Con energía alta valen todas (aprovechar una cabeza fresca en un trámite es
 * un desperdicio, pero prohibirlo sería paternalista); con energía baja, solo
 * lo que no pide cabeza.
 */
export function quePuedoHacer(tareas = [], { minutos = 30, energia = 'media', hoyISO = aISO(hoy()) } = {}) {
  const orden = { alta: 3, media: 2, baja: 1 };
  const disponible = orden[energia] || 2;

  const candidatas = tareas
    .filter((t) => !t.completada && !t.archivada && !t.padre)
    .filter((t) => !t.fecha || t.fecha <= hoyISO)
    .map((t) => ({ ...t, energiaEfectiva: energiaDe(t), duracionEfectiva: Number(t.duracion) || 30 }))
    .filter((t) => orden[t.energiaEfectiva] <= disponible)
    .filter((t) => t.duracionEfectiva <= minutos);

  // Primero lo urgente, después lo que mejor aprovecha el hueco.
  candidatas.sort((a, b) => a.prioridad - b.prioridad
    || (b.duracionEfectiva - a.duracionEfectiva));

  return {
    minutos,
    energia,
    tareas: candidatas.slice(0, 8),
    total: candidatas.length,
    frase: candidatas.length
      ? `${candidatas.length} cosa${candidatas.length === 1 ? '' : 's'} caben en ${minutos} minutos con la cabeza así.`
      : `Nada de lo pendiente cabe en ${minutos} minutos con esa energía. Igual toca descansar, o trocear algo grande.`,
  };
}

/** Reparto de lo pendiente por energía, para ver si te has llenado el día de tareas duras. */
export function repartoEnergia(tareas = [], hoyISO = aISO(hoy())) {
  const cuenta = { alta: 0, media: 0, baja: 0 };
  const minutos = { alta: 0, media: 0, baja: 0 };
  for (const t of tareas) {
    if (t.completada || t.archivada || t.padre) continue;
    if (!t.fecha || t.fecha > hoyISO) continue;
    const e = energiaDe(t);
    cuenta[e]++;
    minutos[e] += Number(t.duracion) || 0;
  }
  const total = cuenta.alta + cuenta.media + cuenta.baja;
  return {
    cuenta,
    minutos,
    total,
    aviso: total >= 4 && cuenta.alta / total > 0.7
      ? 'Casi todo lo de hoy pide cabeza fresca. Nadie tiene tantas horas buenas en un día.'
      : null,
  };
}
