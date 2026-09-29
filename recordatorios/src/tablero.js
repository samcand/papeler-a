/**
 * tablero.js — Las mismas tareas vistas por estado.
 *
 * No se inventa un campo "estado" que haya que mantener a mano: las columnas
 * salen de la fecha, que es lo que ya decides. Mover una tarjeta cambia la
 * fecha, y eso es exactamente lo que significa moverla de columna.
 */

import { aISO, deISO, diferenciaDias, hoy, inicioSemana, sumarDias } from './fechas.js';

/**
 * Último día de "esta semana". Si hoy ya es el último (un domingo), la columna
 * miraría a un cajón vacío, así que se estira a la semana siguiente.
 */
export function finDeLaSemana(hoyISO) {
  const domingo = aISO(sumarDias(inicioSemana(hoyISO), 6));
  return domingo > hoyISO ? domingo : aISO(sumarDias(domingo, 7));
}

export const COLUMNAS = [
  { id: 'bandeja', nombre: 'Bandeja', descripcion: 'Sin decidir', fecha: () => null },
  { id: 'hoy', nombre: 'Hoy', descripcion: 'Hoy y lo atrasado', fecha: (hoyISO) => hoyISO },
  { id: 'semana', nombre: 'Esta semana', descripcion: 'Hasta el domingo', fecha: (hoyISO) => aISO(sumarDias(finDeLaSemana(hoyISO), -2)) },
  { id: 'despues', nombre: 'Después', descripcion: 'Más adelante', fecha: (hoyISO) => aISO(sumarDias(finDeLaSemana(hoyISO), 1)) },
  { id: 'hechas', nombre: 'Hechas', descripcion: 'Últimos 7 días', fecha: () => null },
];

/** En qué columna cae una tarea. */
export function columnaDe(tarea, hoyISO = aISO(hoy())) {
  if (tarea.completada) {
    const cuando = String(tarea.completadaEn || '').slice(0, 10);
    return cuando && diferenciaDias(cuando, hoyISO) <= 7 ? 'hechas' : null;
  }
  if (!tarea.fecha) return tarea.proyecto || tarea.modulo ? 'despues' : 'bandeja';
  if (tarea.fecha <= hoyISO) return 'hoy';
  return tarea.fecha <= finDeLaSemana(hoyISO) ? 'semana' : 'despues';
}

/** El tablero completo, con las tarjetas ya repartidas y ordenadas. */
export function tablero(tareas = [], hoyISO = aISO(hoy()), opciones = {}) {
  const visibles = tareas.filter((t) => !t.padre && !t.archivada
    && (!opciones.modulo || t.modulo === opciones.modulo)
    && (!opciones.proyecto || t.proyecto === opciones.proyecto));

  return COLUMNAS.map((c) => {
    const tarjetas = visibles.filter((t) => columnaDe(t, hoyISO) === c.id)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return {
      ...c,
      tareas: tarjetas,
      minutos: tarjetas.reduce((s, t) => s + (Number(t.duracion) || 0), 0),
    };
  });
}

/**
 * Qué cambia al soltar una tarjeta en otra columna. Devuelve los campos a
 * actualizar, o null si el movimiento no tiene sentido.
 */
export function alSoltar(tarea, columnaId, hoyISO = aISO(hoy())) {
  if (columnaId === 'hechas') return tarea.completada ? null : { completar: true };
  const cambios = {};
  if (tarea.completada) cambios.reabrir = true;
  const columna = COLUMNAS.find((c) => c.id === columnaId);
  if (!columna) return null;
  cambios.fecha = columna.fecha(hoyISO);
  if (columnaId === 'bandeja') { cambios.proyecto = null; cambios.modulo = null; }
  return cambios;
}

/* ------------------------------------------------------------------ *
 * Trabajo en curso
 * ------------------------------------------------------------------ */

export const LIMITE_WIP = 5;

/**
 * Lo que tienes empezado a la vez: tareas comprometidas para hoy o antes.
 * El trabajo en curso es deuda, no progreso.
 */
export function trabajoEnCurso(tareas = [], hoyISO = aISO(hoy()), limite = LIMITE_WIP) {
  const enCurso = tareas.filter((t) => !t.completada && !t.archivada && !t.padre && t.fecha && t.fecha <= hoyISO);
  const exceso = Math.max(0, enCurso.length - limite);
  return {
    total: enCurso.length,
    limite,
    exceso,
    excedido: exceso > 0,
    tareas: enCurso,
    frase: exceso
      ? `Tienes ${enCurso.length} cosas abiertas a la vez y tu límite son ${limite}. Termina ${exceso} antes de empezar otra.`
      : `${enCurso.length} de ${limite} en curso.`,
  };
}
