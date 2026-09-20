/**
 * festivos.js — Los festivos de Colombia, calculados, no copiados a mano.
 *
 * Son tres grupos:
 *  1. Fijos: caen siempre en la misma fecha.
 *  2. Trasladables (Ley 51 de 1983, "Ley Emiliani"): si no caen lunes, se pasan
 *     al lunes siguiente.
 *  3. Móviles: dependen de la Pascua. Jueves y Viernes Santos se quedan donde
 *     caen; Ascensión, Corpus Christi y Sagrado Corazón se trasladan al lunes.
 */

import { aISO, aDate, sumarDias, diaSemana } from './fechas.js';

const FIJOS = [
  { mes: 1, dia: 1, nombre: 'Año Nuevo' },
  { mes: 5, dia: 1, nombre: 'Día del Trabajo' },
  { mes: 7, dia: 20, nombre: 'Día de la Independencia' },
  { mes: 8, dia: 7, nombre: 'Batalla de Boyacá' },
  { mes: 12, dia: 8, nombre: 'Inmaculada Concepción' },
  { mes: 12, dia: 25, nombre: 'Navidad' },
];

const TRASLADABLES = [
  { mes: 1, dia: 6, nombre: 'Reyes Magos' },
  { mes: 3, dia: 19, nombre: 'Día de San José' },
  { mes: 6, dia: 29, nombre: 'San Pedro y San Pablo' },
  { mes: 8, dia: 15, nombre: 'Asunción de la Virgen' },
  { mes: 10, dia: 12, nombre: 'Día de la Raza' },
  { mes: 11, dia: 1, nombre: 'Todos los Santos' },
  { mes: 11, dia: 11, nombre: 'Independencia de Cartagena' },
];

// Días después del Domingo de Pascua. Los tres últimos ya vienen corridos al lunes.
const MOVILES = [
  { offset: -3, nombre: 'Jueves Santo' },
  { offset: -2, nombre: 'Viernes Santo' },
  { offset: 43, nombre: 'Ascensión del Señor' },
  { offset: 64, nombre: 'Corpus Christi' },
  { offset: 71, nombre: 'Sagrado Corazón de Jesús' },
];

/** Domingo de Pascua por el algoritmo de Butcher (calendario gregoriano). */
export function pascua(anio) {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aISO(new Date(anio, mes - 1, dia, 12));
}

/** Corre la fecha al lunes siguiente si no cae lunes (Ley Emiliani). */
export function alLunes(iso) {
  const dow = diaSemana(iso);
  return dow === 1 ? iso : sumarDias(iso, (8 - dow) % 7);
}

/** Festivos del año: [{ fecha, nombre, tipo }] ordenados. */
export function festivos(anio) {
  const salida = new Map();
  const poner = (fecha, nombre, tipo) => {
    if (salida.has(fecha)) {
      // Puede pasar: en 2025 San Pedro y el Sagrado Corazón cayeron el mismo día.
      const previo = salida.get(fecha);
      salida.set(fecha, { ...previo, nombre: `${previo.nombre} / ${nombre}` });
      return;
    }
    salida.set(fecha, { fecha, nombre, tipo });
  };

  for (const f of FIJOS) poner(aISO(new Date(anio, f.mes - 1, f.dia, 12)), f.nombre, 'fijo');
  for (const f of TRASLADABLES) {
    poner(alLunes(aISO(new Date(anio, f.mes - 1, f.dia, 12))), f.nombre, 'trasladado');
  }
  const domingoPascua = pascua(anio);
  for (const f of MOVILES) poner(sumarDias(domingoPascua, f.offset), f.nombre, 'movil');

  return [...salida.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

const cache = new Map();

function mapaDelAnio(anio) {
  if (!cache.has(anio)) {
    cache.set(anio, new Map(festivos(anio).map((f) => [f.fecha, f])));
  }
  return cache.get(anio);
}

export function esFestivo(fecha) {
  return mapaDelAnio(Number(String(fecha).slice(0, 4))).has(fecha);
}

export function nombreFestivo(fecha) {
  const f = mapaDelAnio(Number(String(fecha).slice(0, 4))).get(fecha);
  return f ? f.nombre : '';
}

/**
 * ¿Es día de descanso obligatorio o festivo, para efectos del recargo?
 * La Ley 2466 de 2025 permite pactar otro día de descanso distinto al domingo:
 * `diaDescanso` es 0 (domingo) por omisión.
 */
export function esDiaDeDescanso(fecha, diaDescanso = 0) {
  return diaSemana(fecha) === diaDescanso || esFestivo(fecha);
}

/** Días hábiles entre dos fechas, sin domingos ni festivos (para vacaciones). */
export function diasHabiles(desde, hasta) {
  let cuenta = 0;
  let cursor = desde;
  let guarda = 0;
  while (cursor <= hasta && guarda++ < 4000) {
    if (diaSemana(cursor) !== 0 && !esFestivo(cursor)) cuenta++;
    cursor = sumarDias(cursor, 1);
  }
  return cuenta;
}

/**
 * Fecha en que terminan unas vacaciones de `dias` hábiles contados desde
 * `inicio`. Los sábados cuentan como hábiles salvo que se indique lo contrario
 * (muchas empresas con semana de 5 días los excluyen por acuerdo).
 */
export function finDeVacaciones(inicio, dias, sabadoHabil = true) {
  let restantes = dias;
  let cursor = inicio;
  let ultimo = inicio;
  let guarda = 0;
  while (restantes > 0 && guarda++ < 4000) {
    const dow = diaSemana(cursor);
    const habil = dow !== 0 && !esFestivo(cursor) && (sabadoHabil || dow !== 6);
    if (habil) {
      restantes--;
      ultimo = cursor;
    }
    if (restantes > 0) cursor = sumarDias(cursor, 1);
  }
  return ultimo;
}

export { aDate };
