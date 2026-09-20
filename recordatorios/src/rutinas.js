/**
 * rutinas.js — La rutina de la mañana y la de la noche.
 *
 * Cinco tareas sueltas repetidas todos los días ensucian la lista y se aplazan
 * de una en una. Una rutina es **una sola cosa** con pasos dentro: se marca de
 * un toque, se ve cuánto dura de verdad y tiene racha.
 *
 * La duración importa más de lo que parece: una rutina de mañana de 50 minutos
 * explicada paso a paso es la razón por la que se sale tarde de casa.
 */

import { aISO, diferenciaDias, hoy, sumarDias } from './fechas.js';

export const MOMENTOS = [
  { id: 'manana', nombre: 'Mañana', icono: '🌅' },
  { id: 'noche', nombre: 'Noche', icono: '🌙' },
  { id: 'otro', nombre: 'Otro momento', icono: '🕐' },
];

export function rutinaNueva(campos = {}) {
  return {
    id: 'rut-' + Math.random().toString(36).slice(2, 8),
    nombre: 'Rutina nueva',
    momento: 'manana',
    hora: null,
    dias: [1, 2, 3, 4, 5],        // 0 = domingo, como en JavaScript
    pasos: [],                    // { id, texto, minutos }
    activa: true,
    ...campos,
  };
}

export function pasoNuevo(texto = '', minutos = 5) {
  return { id: 'pas-' + Math.random().toString(36).slice(2, 8), texto, minutos };
}

export function duracionRutina(rutina) {
  return (rutina.pasos || []).reduce((s, p) => s + (Number(p.minutos) || 0), 0);
}

export function tocaHoy(rutina, hoyISO = aISO(hoy())) {
  if (rutina.activa === false) return false;
  const dia = new Date(`${hoyISO}T12:00:00`).getDay();
  return (rutina.dias || []).includes(dia);
}

/**
 * Cómo va la rutina de un día. Los registros son `{ rutina, fecha, pasos: [] }`
 * con los ids de los pasos ya hechos.
 */
export function progresoRutina(rutina, registros = [], diaISO = aISO(hoy())) {
  const registro = registros.find((r) => r.rutina === rutina.id && r.fecha === diaISO);
  const hechos = new Set(registro?.pasos || []);
  const pasos = (rutina.pasos || []).map((p) => ({ ...p, hecho: hechos.has(p.id) }));
  const total = pasos.length;
  const cuantos = pasos.filter((p) => p.hecho).length;
  return {
    pasos,
    hechos: cuantos,
    total,
    completa: total > 0 && cuantos === total,
    pct: total ? Math.round((cuantos / total) * 100) : 0,
    minutosRestantes: pasos.filter((p) => !p.hecho).reduce((s, p) => s + (Number(p.minutos) || 0), 0),
  };
}

/** Marca o desmarca un paso y devuelve los registros ya actualizados. */
export function alternarPaso(registros = [], rutinaId, pasoId, diaISO = aISO(hoy())) {
  const i = registros.findIndex((r) => r.rutina === rutinaId && r.fecha === diaISO);
  if (i === -1) return [...registros, { rutina: rutinaId, fecha: diaISO, pasos: [pasoId] }];
  const actual = registros[i];
  const pasos = actual.pasos.includes(pasoId)
    ? actual.pasos.filter((p) => p !== pasoId)
    : [...actual.pasos, pasoId];
  const copia = [...registros];
  copia[i] = { ...actual, pasos };
  return copia;
}

/**
 * Días seguidos completándola, saltando los días en que no tocaba: si la rutina
 * es de lunes a viernes, el sábado no rompe la racha.
 */
export function rachaRutina(rutina, registros = [], hoyISO = aISO(hoy())) {
  const completos = new Set(registros
    .filter((r) => r.rutina === rutina.id && (r.pasos || []).length >= (rutina.pasos || []).length && rutina.pasos?.length)
    .map((r) => r.fecha));
  if (!completos.size) return 0;

  let racha = 0;
  let cursor = hoyISO;
  // Si hoy tocaba y aún no está hecha, la racha se mide desde ayer.
  if (tocaHoy(rutina, cursor) && !completos.has(cursor)) cursor = aISO(sumarDias(cursor, -1));
  for (let i = 0; i < 400; i++) {
    if (!tocaHoy(rutina, cursor)) { cursor = aISO(sumarDias(cursor, -1)); continue; }
    if (!completos.has(cursor)) break;
    racha++;
    cursor = aISO(sumarDias(cursor, -1));
  }
  return racha;
}

/** Las rutinas de hoy con su progreso, para la tarjeta de la pantalla Hoy. */
export function rutinasDeHoy(rutinas = [], registros = [], hoyISO = aISO(hoy())) {
  return rutinas
    .filter((r) => tocaHoy(r, hoyISO))
    .map((r) => ({ rutina: r, progreso: progresoRutina(r, registros, hoyISO), racha: rachaRutina(r, registros, hoyISO) }))
    .sort((a, b) => MOMENTOS.findIndex((m) => m.id === a.rutina.momento) - MOMENTOS.findIndex((m) => m.id === b.rutina.momento));
}

export function resumenRutinas(rutinas = [], registros = [], hoyISO = aISO(hoy())) {
  const hoyLista = rutinasDeHoy(rutinas, registros, hoyISO);
  const pendientes = hoyLista.filter((x) => !x.progreso.completa);
  const minutos = hoyLista.reduce((s, x) => s + duracionRutina(x.rutina), 0);
  return {
    hoy: hoyLista,
    pendientes: pendientes.length,
    minutos,
    frase: !rutinas.length ? 'Ninguna rutina montada.'
      : !hoyLista.length ? 'Hoy no toca ninguna rutina.'
        : pendientes.length
          ? `${pendientes.length} rutina${pendientes.length === 1 ? '' : 's'} por hacer hoy, ${pendientes.reduce((s, x) => s + x.progreso.minutosRestantes, 0)} min.`
          : 'Las rutinas de hoy, hechas.',
  };
}

/** Dos rutinas para empezar, que además enseñan la idea. */
export const RUTINAS_EJEMPLO = [
  {
    nombre: 'Mañana', momento: 'manana', hora: '06:00', dias: [1, 2, 3, 4, 5],
    pasos: [
      pasoNuevo('Agua y estiramientos', 5),
      pasoNuevo('Mirar el día en la app', 5),
      pasoNuevo('Las tres cosas del día', 5),
      pasoNuevo('Desayuno sin pantalla', 20),
    ],
  },
  {
    nombre: 'Noche', momento: 'noche', hora: '21:30', dias: [0, 1, 2, 3, 4, 5, 6],
    pasos: [
      pasoNuevo('Vaciar la bandeja', 10),
      pasoNuevo('Planificar mañana', 10),
      pasoNuevo('Escribir el diario', 5),
      pasoNuevo('Dejar el móvil fuera del cuarto', 1),
    ],
  },
];
