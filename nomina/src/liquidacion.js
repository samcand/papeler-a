/**
 * liquidacion.js — La cuenta final cuando termina el contrato.
 *
 * Reúne lo que quedó causado y no se ha pagado (salario, prima, cesantías,
 * intereses y vacaciones), agrega la indemnización cuando el despido fue sin
 * justa causa y avisa de las sanciones por pagar tarde.
 */

import { dias360, diasCalendario, hoy, formatoLargo } from './fechas.js';
import * as pres from './prestaciones.js';
import * as ley from './normativa.js';

export const MOTIVOS = [
  { id: 'sin-justa-causa', nombre: 'Despido sin justa causa', indemniza: true },
  { id: 'despido-indirecto', nombre: 'Renuncia motivada (despido indirecto)', indemniza: true },
  { id: 'justa-causa', nombre: 'Despido con justa causa', indemniza: false },
  { id: 'renuncia', nombre: 'Renuncia voluntaria', indemniza: false },
  { id: 'mutuo-acuerdo', nombre: 'Mutuo acuerdo', indemniza: false },
  { id: 'vencimiento', nombre: 'Vencimiento del plazo pactado', indemniza: false },
  { id: 'obra-terminada', nombre: 'Terminación de la obra o labor', indemniza: false },
  { id: 'muerte', nombre: 'Muerte del trabajador', indemniza: false },
  { id: 'periodo-prueba', nombre: 'Terminación en periodo de prueba', indemniza: false },
];

/**
 * Indemnización del artículo 64 del CST.
 * Contrato indefinido: 30 días por el primer año y 20 por cada año siguiente
 * (20 y 15 si devenga 10 salarios mínimos o más). Contrato fijo y de obra:
 * los salarios que falten, con un mínimo de 15 días en el de obra.
 */
export function indemnizacion({ tipoContrato, salarioMensual, ingreso, terminacion, finPactado, fecha }) {
  const valorDia = salarioMensual / 30;
  const dias = dias360(ingreso, terminacion);
  const minimo = ley.smmlv(fecha || terminacion);

  if (tipoContrato === 'fijo' || tipoContrato === 'obra' || tipoContrato === 'aprendizaje') {
    const faltantes = finPactado && finPactado > terminacion
      ? Math.max(0, diasCalendario(terminacion, finPactado))
      : 0;
    const diasPago = tipoContrato === 'obra' ? Math.max(faltantes, 15) : faltantes;
    return {
      aplica: diasPago > 0,
      dias: diasPago,
      valor: Math.round(valorDia * diasPago),
      detalle: tipoContrato === 'obra'
        ? `Salarios del tiempo que falta para terminar la obra (mínimo 15 días): ${diasPago} días.`
        : `Salarios del tiempo que falta para el vencimiento del plazo: ${diasPago} días.`,
      norma: ley.INDEMNIZACION.norma,
    };
  }

  const regla = salarioMensual < 10 * minimo
    ? ley.INDEMNIZACION.indefinido[0]
    : ley.INDEMNIZACION.indefinido[1];

  let diasPago;
  let detalle;
  if (dias <= 360) {
    diasPago = regla.primerAnio;
    detalle = `${regla.primerAnio} días por el primer año de servicio (o fracción).`;
  } else {
    const adicionales = dias - 360;
    diasPago = regla.primerAnio + (adicionales * regla.aniosSiguientes) / 360;
    detalle = `${regla.primerAnio} días por el primer año más ${regla.aniosSiguientes} días por cada año siguiente: `
      + `${regla.primerAnio} + (${adicionales} × ${regla.aniosSiguientes} ÷ 360).`;
  }

  return {
    aplica: true,
    dias: Math.round(diasPago * 100) / 100,
    valor: Math.round(valorDia * diasPago),
    detalle,
    norma: ley.INDEMNIZACION.norma,
    regla: regla.descripcion,
  };
}

/**
 * Sanción moratoria del artículo 65 del CST: un día de salario por cada día
 * de retardo en el pago de salarios y prestaciones al terminar el contrato,
 * hasta 24 meses; después corren intereses moratorios.
 */
export function sancionMoratoria({ salarioMensual, terminacion, fechaPago }) {
  const diasRetardo = Math.max(0, diasCalendario(terminacion, fechaPago) - 1);
  const tope = 720; // 24 meses
  const diasSancion = Math.min(diasRetardo, tope);
  return {
    diasRetardo,
    valor: Math.round((salarioMensual / 30) * diasSancion),
    tope: diasRetardo > tope,
    norma: 'CST art. 65',
    nota: diasRetardo > tope
      ? 'Pasados 24 meses la sanción se reemplaza por intereses moratorios a la tasa máxima de créditos de libre asignación.'
      : 'Un día de salario por cada día de retardo, desde la terminación del contrato.',
  };
}

/** Sanción por no consignar las cesantías antes del 15 de febrero. */
export function sancionCesantias({ salarioMensual, limite, fechaConsignacion }) {
  const diasRetardo = Math.max(0, diasCalendario(limite, fechaConsignacion));
  return {
    diasRetardo,
    valor: Math.round((salarioMensual / 30) * diasRetardo),
    norma: 'Ley 50 de 1990, art. 99 num. 3',
  };
}

/**
 * Liquidación final completa.
 */
export function liquidacionFinal({
  ingreso,
  terminacion,
  tipoContrato = 'indefinido',
  finPactado = '',
  motivo = 'renuncia',
  salarioMensual,
  promedioVariable = 0,
  auxilioTransporte = 0,
  salarioIntegral = false,
  cesantiasPagadasHasta = '',
  primaPagadaHasta = '',
  diasVacacionesDisfrutados = 0,
  diasVacacionesCompensados = 0,
  diasSalarioPendientes = 0,
  otrosDevengados = 0,
  deducciones = 0,
  fechaPago = '',
}) {
  const base = pres.baseLiquidacion({ salarioMensual, promedioVariable, auxilioTransporte });
  const conceptos = [];
  const avisos = [];

  const desdeCesantias = cesantiasPagadasHasta && cesantiasPagadasHasta > ingreso
    ? pres.sumarDias(cesantiasPagadasHasta, 1)
    : ingreso;
  const semestre = pres.semestreDe(terminacion);
  const desdePrima = primaPagadaHasta && primaPagadaHasta > ingreso
    ? pres.sumarDias(primaPagadaHasta, 1)
    : (ingreso > semestre.inicio ? ingreso : semestre.inicio);

  const diasTotales = dias360(ingreso, terminacion);
  const diasCesantias = dias360(desdeCesantias, terminacion);
  const diasPrima = dias360(desdePrima, terminacion);

  if (diasSalarioPendientes > 0) {
    conceptos.push({
      concepto: 'Salario pendiente',
      dias: diasSalarioPendientes,
      valor: Math.round((salarioMensual / 30) * diasSalarioPendientes),
      formula: `(${Math.round(salarioMensual).toLocaleString('es-CO')} ÷ 30) × ${diasSalarioPendientes}`,
      norma: 'CST art. 127',
    });
    if (auxilioTransporte > 0) {
      conceptos.push({
        concepto: 'Auxilio de transporte pendiente',
        dias: diasSalarioPendientes,
        valor: Math.round((auxilioTransporte / 30) * diasSalarioPendientes),
        formula: `(${auxilioTransporte.toLocaleString('es-CO')} ÷ 30) × ${diasSalarioPendientes}`,
        norma: 'Ley 15 de 1959',
      });
    }
  }

  if (salarioIntegral) {
    avisos.push('Salario integral: no se liquidan prima, cesantías ni intereses, porque ya están dentro del factor prestacional. Las vacaciones sí se pagan.');
  } else {
    const ces = pres.cesantias({ base: base.conAuxilio, dias: diasCesantias });
    const int = pres.interesesCesantias({ valorCesantias: ces.valor, dias: diasCesantias });
    const pri = pres.prima({ base: base.conAuxilio, dias: diasPrima });
    conceptos.push(ces, int, pri);
  }

  const saldo = pres.saldoVacaciones({
    ingreso,
    corte: terminacion,
    diasDisfrutados: diasVacacionesDisfrutados,
    diasCompensados: diasVacacionesCompensados,
  });
  const diasVacacionesPagar = Math.max(0, saldo.pendientes);
  const valorVacaciones = Math.round((base.sinAuxilio / 30) * diasVacacionesPagar);
  conceptos.push({
    concepto: 'Vacaciones compensadas en dinero',
    dias: Math.round(diasVacacionesPagar * 100) / 100,
    diasCausados: saldo.causados,
    valor: valorVacaciones,
    formula: `(${Math.round(base.sinAuxilio).toLocaleString('es-CO')} ÷ 30) × ${Math.round(diasVacacionesPagar * 100) / 100} días pendientes`,
    norma: 'CST art. 186 y 189',
  });
  if (saldo.pendientes < 0) {
    avisos.push(`El trabajador disfrutó ${Math.abs(saldo.pendientes)} días de vacaciones más de los causados.`);
  }

  if (otrosDevengados > 0) {
    conceptos.push({ concepto: 'Otros pagos', valor: Math.round(otrosDevengados), norma: '' });
  }

  const motivoInfo = MOTIVOS.find((m) => m.id === motivo) || MOTIVOS[3];
  let indem = null;
  if (motivoInfo.indemniza) {
    indem = indemnizacion({
      tipoContrato, salarioMensual, ingreso, terminacion, finPactado, fecha: terminacion,
    });
    if (indem.aplica) {
      conceptos.push({
        concepto: 'Indemnización por despido sin justa causa',
        dias: indem.dias,
        valor: indem.valor,
        formula: indem.detalle,
        norma: indem.norma,
        noSalarial: true,
      });
    }
  }

  const totalDevengado = conceptos.reduce((s, c) => s + c.valor, 0);
  const neto = totalDevengado - deducciones;

  const mora = fechaPago
    ? sancionMoratoria({ salarioMensual, terminacion, fechaPago })
    : null;
  if (mora && mora.diasRetardo > 0) {
    avisos.push(`El pago se hizo ${mora.diasRetardo} día(s) después de terminar el contrato: se expone a la sanción del artículo 65 del CST (${mora.valor.toLocaleString('es-CO')} al día de hoy).`);
  }

  if (tipoContrato === 'fijo' && finPactado && motivo === 'vencimiento') {
    avisos.push('Para no prorrogar un contrato a término fijo hay que avisar por escrito con 30 días de anticipación (CST art. 46).');
  }

  return {
    ingreso,
    terminacion,
    diasTotales,
    tiempoServicio: describirTiempo(diasTotales),
    base,
    conceptos,
    totalDevengado,
    deducciones,
    neto,
    indemnizacion: indem,
    sancionMoratoria: mora,
    avisos,
    detalleCortes: {
      cesantiasDesde: desdeCesantias, diasCesantias,
      primaDesde: desdePrima, diasPrima,
      vacaciones: saldo,
    },
    resumenLegal: [
      `Tiempo de servicio: ${describirTiempo(diasTotales)} (${diasTotales} días por el método comercial de 360).`,
      `Motivo de terminación: ${motivoInfo.nombre}.`,
      `El pago debe hacerse al terminar el contrato; si no, corre la sanción del artículo 65 del CST.`,
      `Liquidado con los valores vigentes al ${formatoLargo(terminacion)}.`,
    ],
  };
}

export function describirTiempo(dias) {
  const anios = Math.floor(dias / 360);
  const meses = Math.floor((dias % 360) / 30);
  const d = dias % 30;
  const partes = [];
  if (anios) partes.push(`${anios} año${anios > 1 ? 's' : ''}`);
  if (meses) partes.push(`${meses} mes${meses > 1 ? 'es' : ''}`);
  if (d || !partes.length) partes.push(`${d} día${d === 1 ? '' : 's'}`);
  return partes.join(', ');
}

export { hoy };
