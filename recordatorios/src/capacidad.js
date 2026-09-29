/**
 * capacidad.js — Cuántas horas tienes de verdad y cuántas has prometido.
 *
 * El recurso escaso que provoca todos los choques entre cartera, docencia,
 * investigación, alabanza y casa eres tú. Esto compara, día a día, las horas
 * disponibles con las comprometidas, y dice qué semana no cabe en la semana.
 */

import { aISO, deISO, diaSemana, esFinDeSemana, hoy, inicioSemana, minutosDeHora, semanaISO, sumarDias } from './fechas.js';
import { MODULOS } from './modelo.js';

export const JORNADA_POR_DEFECTO = { inicio: '08:00', fin: '18:00' };
export const MINUTOS_FINDE = 240;

/** Minutos que tiene una jornada laboral normal. */
export function minutosJornada(jornada = JORNADA_POR_DEFECTO) {
  const inicio = minutosDeHora(jornada.inicio || JORNADA_POR_DEFECTO.inicio);
  const fin = minutosDeHora(jornada.fin || JORNADA_POR_DEFECTO.fin);
  return Math.max(0, fin - inicio);
}

/** Minutos disponibles un día concreto: el fin de semana no es un día laboral. */
export function minutosDisponibles(diaISO, ajustes = {}) {
  const jornada = ajustes.jornada || JORNADA_POR_DEFECTO;
  if (esFinDeSemana(diaISO)) return Number.isFinite(ajustes.minutosFinde) ? ajustes.minutosFinde : MINUTOS_FINDE;
  return minutosJornada(jornada);
}

/** Estado de un día según lo lleno que esté. */
export function nivelCarga(pct) {
  if (pct > 100) return 'imposible';
  if (pct >= 80) return 'ajustado';
  if (pct >= 40) return 'normal';
  return 'holgado';
}

/**
 * Un día: lo disponible, lo comprometido y el reparto por módulo.
 * Lo atrasado cuenta en el día de hoy, porque es trabajo que sigue ahí.
 */
export function capacidadDia(tareas = [], diaISO, ajustes = {}, hoyISO = aISO(hoy())) {
  // Un día que ya pasó no ofrece horas: lo que quedó pendiente en él cuenta hoy.
  const pasado = diaISO < hoyISO;
  const delDia = pasado ? [] : tareas.filter((t) => !t.completada && !t.archivada && !t.padre
    && (t.fecha === diaISO || (diaISO === hoyISO && t.fecha && t.fecha < hoyISO)));
  const comprometidos = delDia.reduce((s, t) => s + (Number(t.duracion) || 0), 0);
  const disponibles = pasado ? 0 : minutosDisponibles(diaISO, ajustes);
  const pct = disponibles ? Math.round((comprometidos / disponibles) * 100) : 0;

  const porModulo = new Map();
  for (const t of delDia) {
    const clave = t.modulo || 'sin-modulo';
    porModulo.set(clave, (porModulo.get(clave) || 0) + (Number(t.duracion) || 0));
  }

  return {
    fecha: diaISO,
    esHoy: diaISO === hoyISO,
    pasado,
    finDeSemana: esFinDeSemana(diaISO),
    tareas: delDia.length,
    sinEstimar: delDia.filter((t) => !t.duracion).length,
    comprometidos,
    disponibles,
    libres: Math.max(0, disponibles - comprometidos),
    pct,
    nivel: pasado ? 'pasado' : nivelCarga(pct),
    porModulo: [...porModulo.entries()].map(([modulo, minutos]) => ({ modulo, minutos })).sort((a, b) => b.minutos - a.minutos),
  };
}

/** Varias semanas seguidas, para el mapa de calor. */
export function capacidadSemanas(tareas = [], desdeISO = aISO(hoy()), semanas = 4, ajustes = {}, hoyISO = aISO(hoy())) {
  const lunes = inicioSemana(desdeISO);
  const out = [];
  for (let s = 0; s < semanas; s++) {
    const dias = [];
    for (let d = 0; d < 7; d++) {
      dias.push(capacidadDia(tareas, aISO(sumarDias(lunes, s * 7 + d)), ajustes, hoyISO));
    }
    const comprometidos = dias.reduce((x, y) => x + y.comprometidos, 0);
    const disponibles = dias.reduce((x, y) => x + y.disponibles, 0);
    out.push({
      numero: semanaISO(dias[0].fecha),
      desde: dias[0].fecha,
      hasta: dias[6].fecha,
      dias,
      comprometidos,
      disponibles,
      libres: Math.max(0, disponibles - comprometidos),
      pct: disponibles ? Math.round((comprometidos / disponibles) * 100) : 0,
      nivel: nivelCarga(disponibles ? (comprometidos / disponibles) * 100 : 0),
      imposibles: dias.filter((x) => x.nivel === 'imposible').length,
    });
  }
  return out;
}

/**
 * La foto de la semana: cuánto has prometido, a qué módulo se lo has prometido
 * y qué día se rompe. Con una frase que se pueda leer sin interpretar números.
 */
export function resumenCapacidad(tareas = [], ajustes = {}, hoyISO = aISO(hoy())) {
  const semana = capacidadSemanas(tareas, hoyISO, 1, ajustes, hoyISO)[0];
  const porModulo = new Map();
  for (const dia of semana.dias) {
    for (const m of dia.porModulo) porModulo.set(m.modulo, (porModulo.get(m.modulo) || 0) + m.minutos);
  }
  const reparto = [...porModulo.entries()]
    .map(([modulo, minutos]) => ({
      modulo,
      nombre: MODULOS.find((x) => x.id === modulo)?.nombre || 'Sin módulo',
      icono: MODULOS.find((x) => x.id === modulo)?.icono || '•',
      minutos,
      pct: semana.comprometidos ? Math.round((minutos / semana.comprometidos) * 100) : 0,
    }))
    .sort((a, b) => b.minutos - a.minutos);

  const peor = [...semana.dias].sort((a, b) => b.pct - a.pct)[0];
  const sinEstimar = semana.dias.reduce((s, d) => s + d.sinEstimar, 0);

  let frase;
  if (semana.pct > 100) {
    frase = `Esta semana has prometido ${horas(semana.comprometidos)} y tienes ${horas(semana.disponibles)}. No es optimismo: no cabe.`;
  } else if (semana.imposibles) {
    frase = `La semana cabe en total, pero ${semana.imposibles} día${semana.imposibles === 1 ? '' : 's'} no: hay que repartir.`;
  } else if (semana.pct >= 80) {
    frase = 'La semana está llena. Cualquier imprevisto se come algo de la lista.';
  } else {
    frase = `Te quedan ${horas(semana.libres)} libres esta semana.`;
  }
  if (sinEstimar) frase += ` Ojo: ${sinEstimar} tarea${sinEstimar === 1 ? '' : 's'} sin estimar, así que la cuenta se queda corta.`;

  return { semana, reparto, peor, sinEstimar, frase };
}

function horas(minutos) {
  const h = Math.round((minutos / 60) * 10) / 10;
  return `${h} h`;
}
