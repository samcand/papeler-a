/**
 * prestaciones.js — Prima, cesantías, intereses y vacaciones.
 *
 * Todas se calculan con el año comercial de 360 días y con la misma base:
 * el salario del trabajador más lo que sea salario (recargos, extras y
 * comisiones promediadas) y, cuando corresponda, el auxilio de transporte.
 * Las vacaciones son la excepción: van sin auxilio de transporte.
 */

import { dias360, sumarDias, inicioDeMes, aISO, aDate, partes } from './fechas.js';
import * as ley from './normativa.js';

/**
 * Base de liquidación del periodo.
 * @param {Object} p
 * @param {number} p.salarioMensual  Salario básico mensual (o su equivalente si se paga por día u hora).
 * @param {number} p.promedioVariable Promedio mensual de recargos, extras y comisiones del periodo.
 * @param {number} p.auxilioTransporte Auxilio mensual (0 si no tiene derecho).
 */
export function baseLiquidacion({ salarioMensual, promedioVariable = 0, auxilioTransporte = 0 }) {
  const conVariable = salarioMensual + promedioVariable;
  return {
    salarioMensual,
    promedioVariable,
    auxilioTransporte,
    conAuxilio: conVariable + auxilioTransporte,   // prima y cesantías
    sinAuxilio: conVariable,                        // vacaciones
  };
}

/** Prima de servicios: 30 días de salario al año (CST art. 306). */
export function prima({ base, dias }) {
  const valor = Math.round((base * dias) / 360);
  return {
    concepto: 'Prima de servicios',
    base,
    dias,
    valor,
    formula: `(${Math.round(base).toLocaleString('es-CO')} × ${dias}) ÷ 360`,
    norma: ley.PRESTACIONES.prima.norma,
  };
}

/** Cesantías: un mes de salario por año trabajado (CST art. 249). */
export function cesantias({ base, dias }) {
  const valor = Math.round((base * dias) / 360);
  return {
    concepto: 'Cesantías',
    base,
    dias,
    valor,
    formula: `(${Math.round(base).toLocaleString('es-CO')} × ${dias}) ÷ 360`,
    norma: ley.PRESTACIONES.cesantias.norma,
  };
}

/** Intereses sobre las cesantías: 12 % anual (Ley 52 de 1975). */
export function interesesCesantias({ valorCesantias, dias }) {
  const valor = Math.round((valorCesantias * dias * 0.12) / 360);
  return {
    concepto: 'Intereses sobre cesantías',
    base: valorCesantias,
    dias,
    valor,
    formula: `(${Math.round(valorCesantias).toLocaleString('es-CO')} × ${dias} × 12 %) ÷ 360`,
    norma: ley.PRESTACIONES.intereses.norma,
  };
}

/**
 * Vacaciones en dinero: 15 días hábiles por año, sobre el salario ordinario
 * sin auxilio de transporte (CST art. 186 y 192). En dinero equivalen a
 * 15 días de salario por año, de ahí el divisor 720.
 */
export function vacaciones({ base, dias }) {
  const valor = Math.round((base * dias) / 720);
  const diasCausados = Math.round((dias * 15) / 360 * 100) / 100;
  return {
    concepto: 'Vacaciones',
    base,
    dias,
    diasCausados,
    valor,
    formula: `(${Math.round(base).toLocaleString('es-CO')} × ${dias}) ÷ 720`,
    norma: ley.PRESTACIONES.vacaciones.norma,
  };
}

/** Días de vacaciones causados y pendientes a una fecha. */
export function saldoVacaciones({ ingreso, corte, diasDisfrutados = 0, diasCompensados = 0 }) {
  const dias = dias360(ingreso, corte);
  const causados = (dias * 15) / 360;
  const pendientes = causados - diasDisfrutados - diasCompensados;
  return {
    diasTrabajados: dias,
    causados: Math.round(causados * 100) / 100,
    disfrutados: diasDisfrutados,
    compensados: diasCompensados,
    pendientes: Math.round(pendientes * 100) / 100,
  };
}

/** Corte del semestre de prima al que pertenece una fecha. */
export function semestreDe(fecha) {
  const { anio, mes } = partes(fecha);
  return mes <= 6
    ? { inicio: `${anio}-01-01`, fin: `${anio}-06-30`, nombre: `Primer semestre ${anio}`, limite: `${anio}-06-30` }
    : { inicio: `${anio}-07-01`, fin: `${anio}-12-31`, nombre: `Segundo semestre ${anio}`, limite: `${anio}-12-20` };
}

/**
 * Fechas límite legales del año: prima, cesantías, intereses y dotación.
 * Sirven para el calendario de obligaciones.
 */
export function obligacionesDelAnio(anio) {
  const p = ley.PRESTACIONES;
  return [
    { fecha: `${anio}-01-31`, titulo: 'Pagar intereses sobre cesantías del año anterior', norma: p.intereses.norma, tipo: 'prestacion' },
    { fecha: `${anio}-02-14`, titulo: 'Consignar cesantías del año anterior al fondo', norma: p.cesantias.norma, tipo: 'prestacion' },
    { fecha: `${anio}-04-30`, titulo: 'Primera entrega de dotación', norma: p.dotacion.norma, tipo: 'dotacion' },
    { fecha: `${anio}-06-30`, titulo: 'Pagar la prima del primer semestre', norma: p.prima.norma, tipo: 'prestacion' },
    { fecha: `${anio}-08-31`, titulo: 'Segunda entrega de dotación', norma: p.dotacion.norma, tipo: 'dotacion' },
    { fecha: `${anio}-12-20`, titulo: 'Pagar la prima del segundo semestre y tercera dotación', norma: p.prima.norma, tipo: 'prestacion' },
    { fecha: `${anio}-12-31`, titulo: 'Corte anual de cesantías', norma: p.cesantias.norma, tipo: 'prestacion' },
  ];
}

/** ¿Le toca dotación? Hasta 2 SMMLV y con más de 3 meses en la empresa. */
export function derechoDotacion({ salarioMensual, ingreso, corte }) {
  const tope = ley.PRESTACIONES.dotacion.topeSmmlv * ley.smmlv(corte);
  const meses = dias360(ingreso, corte) / 30;
  return {
    tiene: salarioMensual <= tope && meses > ley.PRESTACIONES.dotacion.mesesMinimos,
    tope,
    meses: Math.round(meses * 10) / 10,
    norma: ley.PRESTACIONES.dotacion.norma,
  };
}

export { dias360, sumarDias, inicioDeMes, aISO, aDate };
