/**
 * seguridad.js — Aportes a seguridad social y parafiscales (la planilla PILA).
 *
 * Lo que descuenta el trabajador (4 % salud + 4 % pensión + fondo de
 * solidaridad) y lo que pone el empleador encima del salario (8,5 % salud,
 * 12 % pensión, ARL y parafiscales), con las exoneraciones del artículo 114-1
 * del Estatuto Tributario.
 */

import * as ley from './normativa.js';

/**
 * Ingreso Base de Cotización del mes.
 * - Solo entra lo que es salario: no el auxilio de transporte ni los pagos
 *   que las partes pactaron como no salariales (con el tope del 40 %).
 * - Piso: un salario mínimo (proporcional a los días cotizados).
 * - Techo: 25 salarios mínimos.
 * - Salario integral: se cotiza sobre el 70 %.
 */
export function calcularIbc({ devengadoSalarial, fecha, diasCotizados = 30, salarioIntegral = false }) {
  const mimimo = ley.smmlv(fecha);
  let base = Math.max(0, devengadoSalarial);
  if (salarioIntegral) base = base * ley.APORTES.ibc.integralPorcentaje;

  const piso = (mimimo * Math.min(diasCotizados, 30)) / 30;
  const techo = mimimo * ley.APORTES.ibc.techoSmmlv;
  const avisos = [];
  if (base < piso) {
    avisos.push(`El IBC se subió al mínimo legal (${Math.round(piso).toLocaleString('es-CO')}) por ${diasCotizados} días cotizados.`);
    base = piso;
  }
  if (base > techo) {
    avisos.push(`El IBC se limitó al tope de 25 salarios mínimos (${Math.round(techo).toLocaleString('es-CO')}).`);
    base = techo;
  }
  return { ibc: Math.round(base), piso: Math.round(piso), techo: Math.round(techo), avisos };
}

/** Aportes del mes sobre un IBC ya calculado. */
export function liquidarAportes({
  ibc,
  fecha,
  salarioMensual = 0,
  claseArl = 'I',
  nivelArl = 'media',
  exonerado = true,
  aportaCaja = true,
}) {
  const a = ley.APORTES;
  const minimo = ley.smmlv(fecha);
  // La exoneración solo cubre a quien devengue menos de 10 salarios mínimos.
  const aplicaExoneracion = exonerado && salarioMensual < a.exoneracion.topeSmmlv * minimo;
  const tarifaFsp = ley.tarifaFsp(ibc, fecha);
  const tarifaArl = ley.tarifaArl(claseArl, nivelArl);

  const trabajador = {
    salud: Math.round(ibc * a.salud.trabajador),
    pension: Math.round(ibc * a.pension.trabajador),
    fsp: Math.round(ibc * tarifaFsp),
  };
  trabajador.total = trabajador.salud + trabajador.pension + trabajador.fsp;

  const empleador = {
    salud: aplicaExoneracion ? 0 : Math.round(ibc * a.salud.empleador),
    pension: Math.round(ibc * a.pension.empleador),
    arl: Math.round(ibc * tarifaArl),
    caja: aportaCaja ? Math.round(ibc * a.parafiscales.caja) : 0,
    icbf: aplicaExoneracion ? 0 : Math.round(ibc * a.parafiscales.icbf),
    sena: aplicaExoneracion ? 0 : Math.round(ibc * a.parafiscales.sena),
  };
  empleador.total = empleador.salud + empleador.pension + empleador.arl
    + empleador.caja + empleador.icbf + empleador.sena;

  return {
    ibc,
    aplicaExoneracion,
    tarifas: { fsp: tarifaFsp, arl: tarifaArl },
    trabajador,
    empleador,
    total: trabajador.total + empleador.total,
    notas: aplicaExoneracion
      ? ['Exonerado de salud del empleador, SENA e ICBF (Estatuto Tributario art. 114-1). La caja de compensación siempre se paga.']
      : [],
  };
}

/** Provisión mensual de prestaciones: lo que cuesta de verdad el empleado. */
export function provisiones({ baseMes, baseSinAuxilio }) {
  const prima = Math.round(baseMes * 0.0833);
  const cesantias = Math.round(baseMes * 0.0833);
  const intereses = Math.round(cesantias * 0.12);
  const vacaciones = Math.round((baseSinAuxilio ?? baseMes) * 0.0417);
  return {
    prima,
    cesantias,
    intereses,
    vacaciones,
    total: prima + cesantias + intereses + vacaciones,
    nota: 'Prima y cesantías 8,33 % (30 días al año), intereses 12 % de las cesantías y vacaciones 4,17 % (15 días hábiles al año).',
  };
}
