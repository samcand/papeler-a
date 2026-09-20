/**
 * calculo.js — Valor de la hora, clasificación de un turno y recargos.
 *
 * La regla de oro: el salario mensual ya paga las horas ordinarias del mes.
 * Por eso aquí se separa el "factor base" (¿hay que pagar la hora otra vez?)
 * del "factor recargo" (el porcentaje que la ley agrega encima).
 */

import { minutos, sumarDias, diaSemana } from './fechas.js';
import { esFestivo, nombreFestivo } from './festivos.js';
import * as ley from './normativa.js';

export const MODALIDADES = [
  { id: 'mensual', nombre: 'Mensual', nota: 'Sueldo fijo al mes; se paga por mes o por quincena.' },
  { id: 'jornal', nombre: 'Por día (jornal)', nota: 'Se paga por día trabajado, más los descansos que ordena la ley.' },
  { id: 'horas', nombre: 'Por horas', nota: 'Se paga por hora efectivamente trabajada.' },
];

/** Divisor mensual de horas para el contrato en esa fecha. */
export function divisorHoras(contrato, fecha) {
  if (contrato && contrato.divisorHoras && contrato.divisorHoras !== 'auto') {
    return Number(contrato.divisorHoras);
  }
  return ley.jornada(fecha).divisor;
}

/** Horas ordinarias que se pueden trabajar al día según lo pactado. */
export function horasOrdinariasDia(contrato, fecha) {
  if (contrato && contrato.horasDiarias) return Number(contrato.horasDiarias);
  const semanal = ley.jornada(fecha).horasSemana;
  const dias = Number(contrato?.diasSemana) || 6;
  return semanal / dias;
}

/**
 * Valor de una hora ordinaria.
 *  - mensual: salario del mes ÷ divisor (240, 220, 210… según la jornada legal)
 *  - jornal:  valor del día ÷ horas ordinarias del día
 *  - horas:   el valor pactado por hora
 */
export function valorHora(contrato, fecha) {
  const modalidad = contrato?.modalidad || 'mensual';
  if (modalidad === 'horas') return Number(contrato.valorHora) || 0;
  if (modalidad === 'jornal') {
    const horas = horasOrdinariasDia(contrato, fecha) || 8;
    return (Number(contrato.valorDia) || 0) / horas;
  }
  return (Number(contrato.salario) || 0) / divisorHoras(contrato, fecha);
}

/** Valor de un día de salario ordinario (el que se usa en prestaciones). */
export function valorDia(contrato, fecha) {
  const modalidad = contrato?.modalidad || 'mensual';
  if (modalidad === 'jornal') return Number(contrato.valorDia) || 0;
  if (modalidad === 'horas') {
    return (Number(contrato.valorHora) || 0) * horasOrdinariasDia(contrato, fecha);
  }
  return (Number(contrato.salario) || 0) / 30;
}

/** Salario mensual equivalente: sirve para el IBC, el auxilio y las prestaciones. */
export function salarioMensualEquivalente(contrato, fecha) {
  const modalidad = contrato?.modalidad || 'mensual';
  if (modalidad === 'mensual') return Number(contrato.salario) || 0;
  return valorDia(contrato, fecha) * 30;
}

/** ¿La hora que empieza en ese minuto es nocturna? */
export function esMinutoNocturno(fecha, minutoDelDia) {
  const franja = ley.franjaDiurna(fecha);
  const hora = Math.floor(((minutoDelDia % 1440) + 1440) % 1440 / 60);
  return hora < franja.inicioDiurna || hora >= franja.finDiurna;
}

/**
 * Parte un turno en horas diurnas/nocturnas, ordinarias/extras y por día
 * calendario (un turno que cruza la medianoche cuenta en los dos días, y el
 * recargo dominical o festivo se mira día por día).
 *
 * @returns {{segmentos: Array, totales: Object, horasTotales: number}}
 */
export function clasificarTurno({ fecha, inicio, fin, limiteOrdinarioDiario = 8, diaDescanso = 0 }) {
  const ini = minutos(inicio);
  let fi = minutos(fin);
  if (fi <= ini) fi += 1440; // el turno cruza la medianoche
  const duracion = fi - ini;
  if (duracion <= 0 || duracion > 24 * 60) {
    throw new Error('El turno debe durar entre 1 minuto y 24 horas.');
  }

  const cubos = new Map();
  const limite = limiteOrdinarioDiario * 60;

  for (let t = 0; t < duracion; t++) {
    const absoluto = ini + t;
    const diaExtra = Math.floor(absoluto / 1440);
    const fechaDia = diaExtra === 0 ? fecha : sumarDias(fecha, diaExtra);
    const nocturno = esMinutoNocturno(fechaDia, absoluto);
    const extra = t >= limite;
    const descanso = diaSemana(fechaDia) === diaDescanso || esFestivo(fechaDia);
    const clave = `${fechaDia}|${descanso ? 'D' : 'O'}|${extra ? 'E' : 'N'}|${nocturno ? 'noc' : 'diu'}`;
    const actual = cubos.get(clave) || {
      fecha: fechaDia,
      descanso,
      extra,
      nocturna: nocturno,
      minutos: 0,
      festivo: esFestivo(fechaDia) ? nombreFestivo(fechaDia) : '',
    };
    actual.minutos++;
    cubos.set(clave, actual);
  }

  const segmentos = [...cubos.values()]
    .map((s) => ({ ...s, horas: s.minutos / 60 }))
    .sort((a, b) => (a.fecha === b.fecha ? Number(a.extra) - Number(b.extra) : a.fecha < b.fecha ? -1 : 1));

  const totales = {
    ordinariaDiurna: 0,
    ordinariaNocturna: 0,
    extraDiurna: 0,
    extraNocturna: 0,
    ordinariaDiurnaDescanso: 0,
    ordinariaNocturnaDescanso: 0,
    extraDiurnaDescanso: 0,
    extraNocturnaDescanso: 0,
  };
  for (const s of segmentos) {
    const clave = `${s.extra ? 'extra' : 'ordinaria'}${s.nocturna ? 'Nocturna' : 'Diurna'}${s.descanso ? 'Descanso' : ''}`;
    totales[clave] += s.horas;
  }

  return { segmentos, totales, horasTotales: duracion / 60 };
}

/**
 * Factores de pago de una hora.
 *  base:    1 si esa hora hay que pagarla aparte; 0 si ya va dentro del sueldo.
 *  recargo: el porcentaje que ordena la ley encima de la hora ordinaria.
 */
export function factoresHora({ fecha, extra, nocturna, descanso, modalidad = 'mensual', compensatorio = false }) {
  const rec = ley.RECARGOS;
  const dominical = ley.recargoDescanso(fecha).factor;
  let recargo = 0;
  let base = 0;
  const notas = [];

  if (extra) {
    base = 1; // la hora extra siempre se paga completa, no está dentro del sueldo
    recargo += nocturna ? rec.extraNocturna : rec.extraDiurna;
    notas.push(nocturna ? 'Hora extra nocturna (75 %)' : 'Hora extra diurna (25 %)');
  } else {
    if (nocturna) {
      recargo += rec.nocturno;
      notas.push('Recargo nocturno (35 %)');
    }
    // Las horas ordinarias ya están pagadas con el sueldo del mes o con el
    // día/jornal del día trabajado, salvo cuando se paga por horas.
    base = modalidad === 'horas' ? 1 : 0;
  }

  if (descanso) {
    recargo += dominical;
    notas.push(`Recargo por día de descanso o festivo (${Math.round(dominical * 100)} %)`);
    if (!extra && !compensatorio) {
      // Sin día compensatorio, el día de descanso trabajado se paga además del
      // salario ordinario de la semana (CST art. 180).
      base = 1;
      notas.push('Sin descanso compensatorio: se paga el día además del recargo');
    }
  }

  return { base, recargo, factor: base + recargo, notas };
}

/** Convierte un turno clasificado en conceptos con valor en pesos. */
export function valorizarTurno({ contrato, fecha, inicio, fin, compensatorio = false, diaDescanso = 0 }) {
  const limiteOrdinarioDiario = horasOrdinariasDia(contrato, fecha);
  const { segmentos, horasTotales } = clasificarTurno({
    fecha, inicio, fin, limiteOrdinarioDiario, diaDescanso,
  });
  const modalidad = contrato?.modalidad || 'mensual';

  const conceptos = segmentos
    .map((s) => {
      const vh = valorHora(contrato, s.fecha);
      const f = factoresHora({
        fecha: s.fecha,
        extra: s.extra,
        nocturna: s.nocturna,
        descanso: s.descanso,
        modalidad,
        compensatorio,
      });
      return {
        fecha: s.fecha,
        nombre: nombreConcepto(s),
        horas: redondearHoras(s.horas),
        valorHora: vh,
        factor: f.factor,
        valor: Math.round(vh * s.horas * f.factor),
        notas: f.notas,
        festivo: s.festivo,
        // Las horas ordinarias de un día común no suman: ya están pagadas con
        // el sueldo. Se muestran igual para que el comprobante cuadre.
        incluidaEnSueldo: f.factor === 0,
      };
    });

  return {
    horasTotales: redondearHoras(horasTotales),
    conceptos,
    total: conceptos.reduce((s, c) => s + c.valor, 0),
    segmentos,
  };
}

function nombreConcepto(s) {
  const partes = [s.extra ? 'Hora extra' : 'Hora ordinaria'];
  partes.push(s.nocturna ? 'nocturna' : 'diurna');
  if (s.descanso) partes.push(s.festivo ? `en festivo (${s.festivo})` : 'en día de descanso');
  return partes.join(' ');
}

export function redondearHoras(h) {
  return Math.round(h * 100) / 100;
}

/** Avisos de topes legales de trabajo suplementario. */
export function avisosExtras({ extrasDia = 0, extrasSemana = 0 }) {
  const avisos = [];
  const topes = ley.TOPES_EXTRAS;
  if (extrasDia > topes.diarias) {
    avisos.push(`Se registraron ${redondearHoras(extrasDia)} horas extra en un día; la ley permite ${topes.diarias} (CST art. 167).`);
  }
  if (extrasSemana > topes.semanales) {
    avisos.push(`Se registraron ${redondearHoras(extrasSemana)} horas extra en la semana; la ley permite ${topes.semanales} (CST art. 167).`);
  }
  return avisos;
}
