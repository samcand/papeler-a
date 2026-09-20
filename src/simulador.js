/**
 * simulador.js — Cuánto cuesta de verdad, y cuánto costará.
 *
 * Tres preguntas que se hacen antes de firmar nada:
 *   1. ¿Cuánto me cuesta contratar a alguien en $X?
 *   2. ¿Cuánto me va a costar la nómina este año, mes por mes?
 *   3. ¿Cuánto sube cuando cambie la ley (o el salario mínimo)?
 */

import { MESES, formatoCorto } from './fechas.js';
import * as calc from './calculo.js';
import * as seg from './seguridad.js';
import * as ley from './normativa.js';

const redondear = (n) => Math.round(Number(n) || 0);

/**
 * Costo mensual y anual de un trabajador, con todo incluido.
 */
export function costoContratar({
  salario = 0,
  modalidad = 'mensual',
  valorDia = 0,
  valorHora = 0,
  diasSemana = 6,
  fecha,
  claseArl = 'I',
  nivelArl = 'media',
  exonerado = true,
  aportaCaja = true,
  salarioIntegral = false,
  auxilioTransporte = true,
  variableMes = 0,
}) {
  const contrato = { modalidad, salario, valorDia, valorHora, diasSemana, salarioIntegral };
  const salarioMes = calc.salarioMensualEquivalente(contrato, fecha) + variableMes;
  const tieneAuxilio = auxilioTransporte && !salarioIntegral && ley.tieneAuxilioTransporte(salarioMes, fecha);
  const auxilio = tieneAuxilio ? ley.auxilioTransporte(fecha) : 0;

  const { ibc } = seg.calcularIbc({ devengadoSalarial: salarioMes, fecha, diasCotizados: 30, salarioIntegral });
  const aportes = seg.liquidarAportes({
    ibc, fecha, salarioMensual: salarioMes, claseArl, nivelArl, exonerado, aportaCaja,
  });
  const provisiones = salarioIntegral
    ? { prima: 0, cesantias: 0, intereses: 0, vacaciones: redondear((salarioMes) * 0.0417), total: 0, nota: 'Con salario integral solo se provisionan vacaciones.' }
    : seg.provisiones({ baseMes: salarioMes + auxilio, baseSinAuxilio: salarioMes });
  if (salarioIntegral) provisiones.total = provisiones.vacaciones;

  const pagaAlTrabajador = salarioMes + auxilio;
  const costoEmpresa = pagaAlTrabajador + aportes.empleador.total + provisiones.total;
  const recibeNeto = pagaAlTrabajador - aportes.trabajador.total;

  return {
    fecha,
    salarioMes: redondear(salarioMes),
    auxilio,
    pagaAlTrabajador: redondear(pagaAlTrabajador),
    recibeNeto: redondear(recibeNeto),
    ibc,
    aportes,
    provisiones,
    costoMensual: redondear(costoEmpresa),
    costoAnual: redondear(costoEmpresa * 12),
    factor: salarioMes ? Math.round((costoEmpresa / salarioMes) * 1000) / 1000 : 0,
    desglose: [
      { concepto: 'Salario', valor: redondear(salarioMes), quien: 'trabajador' },
      { concepto: 'Auxilio de transporte', valor: auxilio, quien: 'trabajador' },
      { concepto: 'Salud (empleador)', valor: aportes.empleador.salud, quien: 'empresa' },
      { concepto: 'Pensión (empleador)', valor: aportes.empleador.pension, quien: 'empresa' },
      { concepto: 'Riesgos laborales', valor: aportes.empleador.arl, quien: 'empresa' },
      { concepto: 'Caja de compensación', valor: aportes.empleador.caja, quien: 'empresa' },
      { concepto: 'SENA', valor: aportes.empleador.sena, quien: 'empresa' },
      { concepto: 'ICBF', valor: aportes.empleador.icbf, quien: 'empresa' },
      { concepto: 'Prima de servicios', valor: provisiones.prima, quien: 'provision' },
      { concepto: 'Cesantías', valor: provisiones.cesantias, quien: 'provision' },
      { concepto: 'Intereses sobre cesantías', valor: provisiones.intereses, quien: 'provision' },
      { concepto: 'Vacaciones', valor: provisiones.vacaciones, quien: 'provision' },
    ].filter((d) => d.valor > 0),
    nota: aportes.aplicaExoneracion
      ? 'Con la exoneración del artículo 114-1 del Estatuto Tributario: no se paga salud del empleador, SENA ni ICBF.'
      : 'Sin exoneración: se pagan todos los aportes.',
  };
}

/**
 * Presupuesto del año, mes por mes, con los desembolsos grandes en su fecha:
 * prima en junio y diciembre, cesantías e intereses en febrero.
 */
export function presupuestoAnual({ contratos = [], anio, empresa = {} }) {
  const meses = [];
  let totalAnual = 0;

  for (let m = 1; m <= 12; m++) {
    const fecha = `${anio}-${String(m).padStart(2, '0')}-28`;
    let nomina = 0;
    let aportes = 0;
    let provision = 0;
    let activos = 0;

    for (const c of contratos) {
      const fin = c.terminacion || (c.estado === 'terminado' ? c.fin : '') || '9999-12-31';
      if (c.inicio > fecha || fin < `${anio}-${String(m).padStart(2, '0')}-01`) continue;
      activos++;
      const costo = costoContratar({
        salario: c.salario, modalidad: c.modalidad, valorDia: c.valorDia, valorHora: c.valorHora,
        diasSemana: c.diasSemana, fecha, claseArl: c.claseArl || empresa.claseArl || 'I',
        nivelArl: c.nivelArl || 'media', exonerado: empresa.exonerado !== false,
        aportaCaja: empresa.aportaCaja !== false, salarioIntegral: c.salarioIntegral,
        auxilioTransporte: c.auxilioTransporte !== false,
      });
      nomina += costo.pagaAlTrabajador;
      aportes += costo.aportes.empleador.total;
      provision += costo.provisiones.total;
    }

    const desembolsos = [];
    if (m === 6) desembolsos.push({ concepto: 'Prima del primer semestre', valor: redondear(provision ? nomina * 0.5 : 0) });
    if (m === 12) desembolsos.push({ concepto: 'Prima del segundo semestre', valor: redondear(provision ? nomina * 0.5 : 0) });
    if (m === 2) {
      desembolsos.push({ concepto: 'Cesantías al fondo (año anterior)', valor: redondear(nomina) });
      desembolsos.push({ concepto: 'Intereses sobre cesantías', valor: redondear(nomina * 0.12) });
    }

    // Se acumula el total ya redondeado para que la suma de los meses cuadre
    // exactamente con el total del año.
    const total = redondear(nomina) + redondear(aportes) + redondear(provision);
    totalAnual += total;
    meses.push({
      mes: m,
      nombre: MESES[m - 1],
      activos,
      nomina: redondear(nomina),
      aportes: redondear(aportes),
      provision: redondear(provision),
      total,
      desembolsos,
      caja: redondear(nomina + aportes + desembolsos.reduce((s, d) => s + d.valor, 0)),
    });
  }

  return {
    anio,
    meses,
    totalAnual: redondear(totalAnual),
    promedioMes: redondear(totalAnual / 12),
    nota: 'La columna "caja" es lo que sale del banco ese mes: nómina, aportes y los desembolsos de prestaciones. '
      + 'La provisión no sale del banco, pero hay que guardarla.',
  };
}

/** Escenarios de cambio normativo que se pueden simular. */
export const ESCENARIOS = [
  {
    id: 'dominical-100',
    nombre: 'El recargo dominical y festivo pasa al 100 %',
    fecha: '2027-07-01',
    norma: 'Ley 2466 de 2025',
    detalle: 'Última etapa de la gradualidad de la reforma laboral.',
  },
  {
    id: 'smmlv',
    nombre: 'Sube el salario mínimo',
    fecha: `${new Date().getFullYear() + 1}-01-01`,
    norma: 'Decreto anual del Gobierno',
    detalle: 'Arrastra el auxilio de transporte, los topes de auxilio y dotación, y los salarios que están en el mínimo.',
    parametro: { nombre: 'Alza esperada', valor: 0.10, tipo: 'porcentaje' },
  },
  {
    id: 'jornada-40',
    nombre: 'La jornada baja a 40 horas',
    fecha: '',
    norma: 'Hipotético: hoy el piso legal son 42 horas',
    detalle: 'El sueldo no baja, así que la hora ordinaria sube y con ella las extras y los recargos.',
  },
];

/**
 * Impacto en pesos de un cambio normativo sobre la nómina actual.
 *
 * @param {Array} p.trabajadores [{ nombre, salarioMes, horasDescansoMes, horasExtraMes, horasNocturnasMes, modalidad, diasSemana }]
 */
export function impactoNormativo({ trabajadores = [], escenario = 'dominical-100', fecha, parametro = null }) {
  const hoyFecha = fecha || `${new Date().getFullYear()}-01-01`;
  const filas = [];
  let antesTotal = 0;
  let despuesTotal = 0;

  for (const t of trabajadores) {
    const contrato = {
      modalidad: t.modalidad || 'mensual', salario: t.salarioMes,
      valorDia: t.valorDia, valorHora: t.valorHora, diasSemana: t.diasSemana || 6,
    };
    const vh = calc.valorHora(contrato, hoyFecha);
    let antes = 0;
    let despues = 0;
    let concepto = '';

    if (escenario === 'dominical-100') {
      const factorHoy = ley.recargoDescanso(hoyFecha).factor;
      const factorNuevo = 1.00;
      antes = vh * (t.horasDescansoMes || 0) * factorHoy;
      despues = vh * (t.horasDescansoMes || 0) * factorNuevo;
      concepto = `${t.horasDescansoMes || 0} horas al mes en día de descanso o festivo`;
    } else if (escenario === 'smmlv') {
      const alza = parametro ?? 0.10;
      const minimo = ley.smmlv(hoyFecha);
      const auxilio = ley.auxilioTransporte(hoyFecha);
      const estaEnMinimo = t.salarioMes <= minimo * 1.02;
      const salarioNuevo = estaEnMinimo ? minimo * (1 + alza) : t.salarioMes;
      const auxilioHoy = ley.tieneAuxilioTransporte(t.salarioMes, hoyFecha) ? auxilio : 0;
      const auxilioNuevo = ley.tieneAuxilioTransporte(salarioNuevo, hoyFecha) ? auxilio * (1 + alza) : 0;
      antes = t.salarioMes + auxilioHoy;
      despues = salarioNuevo + auxilioNuevo;
      concepto = estaEnMinimo ? 'Está en el salario mínimo: sube todo' : 'Sobre el mínimo: solo cambia el auxilio si aplica';
    } else if (escenario === 'jornada-40') {
      const divisorHoy = calc.divisorHoras(contrato, hoyFecha);
      const divisorNuevo = (40 / 6) * 30;
      const horasPagadas = (t.horasExtraMes || 0) * 1.25 + (t.horasNocturnasMes || 0) * 0.35
        + (t.horasDescansoMes || 0) * ley.recargoDescanso(hoyFecha).factor;
      antes = (t.salarioMes / divisorHoy) * horasPagadas;
      despues = (t.salarioMes / divisorNuevo) * horasPagadas;
      concepto = `La hora ordinaria pasa de ${redondear(t.salarioMes / divisorHoy)} a ${redondear(t.salarioMes / divisorNuevo)}`;
    }

    antesTotal += antes;
    despuesTotal += despues;
    filas.push({
      nombre: t.nombre || '',
      concepto,
      antes: redondear(antes),
      despues: redondear(despues),
      diferencia: redondear(despues - antes),
    });
  }

  const info = ESCENARIOS.find((e) => e.id === escenario) || ESCENARIOS[0];
  const diferenciaMes = redondear(despuesTotal - antesTotal);
  return {
    escenario: info,
    filas,
    antes: redondear(antesTotal),
    despues: redondear(despuesTotal),
    diferenciaMes,
    diferenciaAnual: diferenciaMes * 12,
    porcentaje: antesTotal ? Math.round(((despuesTotal - antesTotal) / antesTotal) * 1000) / 10 : 0,
  };
}

export { MESES, formatoCorto };
