/**
 * pila.js — Planilla Integrada de Liquidación de Aportes.
 *
 * Arma, para cada trabajador y cada mes, la línea que pide la PILA: tipo de
 * cotizante, días cotizados por subsistema, IBC de cada uno, tarifas, valores
 * y las novedades con sus fechas (ingreso, retiro, incapacidades, licencias,
 * vacaciones, suspensiones y cambios de salario).
 *
 * Normativa: Resolución 2388 de 2016 del Ministerio de Salud y Protección
 * Social, con sus modificaciones, que adopta los anexos técnicos de la PILA.
 *
 * ⚠ Sobre el archivo plano: el orden y la longitud exacta de los campos están
 * en los anexos técnicos de esa resolución, que cada operador actualiza. Por
 * eso la estructura vive en la tabla CAMPOS_REGISTRO_2 de este archivo, como
 * dato editable y no enterrada en el código: antes del primer cargue hay que
 * cotejarla con el anexo vigente del operador. El cálculo —que es lo difícil—
 * no depende de esa tabla, y la exportación en CSV sirve igual para revisar y
 * para los cargues por plantilla.
 */

import { rango, sumarDias, diasCalendario, partes, finDeMes, inicioDeMes, formatoCorto } from './fechas.js';
import * as ley from './normativa.js';

/** Tipos de cotizante más usados por un empleador (tabla de la Res. 2388). */
export const TIPOS_COTIZANTE = [
  { codigo: '01', nombre: 'Dependiente' },
  { codigo: '02', nombre: 'Servicio doméstico' },
  { codigo: '12', nombre: 'Aprendiz en etapa lectiva' },
  { codigo: '19', nombre: 'Aprendiz en etapa productiva' },
  { codigo: '18', nombre: 'Funcionario público sin tope' },
  { codigo: '21', nombre: 'Estudiante de posgrado en salud' },
  { codigo: '22', nombre: 'Profesor de establecimiento particular' },
  { codigo: '23', nombre: 'Estudiante (Decreto 055 de 2015)' },
  { codigo: '30', nombre: 'Dependiente de entidad beneficiaria del SGP' },
  { codigo: '51', nombre: 'Trabajador de tiempo parcial (Decreto 2616 de 2013)' },
  { codigo: '75', nombre: 'Dependiente con permanencia en el régimen subsidiado' },
];

export const SUBTIPOS_COTIZANTE = [
  { codigo: '00', nombre: 'Ninguno' },
  { codigo: '01', nombre: 'Dependiente pensionado por vejez activo' },
  { codigo: '02', nombre: 'Persona con discapacidad' },
  { codigo: '03', nombre: 'Persona en proceso de reintegración o desmovilizada' },
  { codigo: '04', nombre: 'Madre comunitaria' },
];

export const TIPOS_PLANILLA = [
  { codigo: 'E', nombre: 'Empleados', uso: 'La normal de cada mes.' },
  { codigo: 'N', nombre: 'Correcciones', uso: 'Para corregir una planilla ya pagada.' },
  { codigo: 'Y', nombre: 'Independientes empresas', uso: 'Contratistas que la empresa reporta.' },
  { codigo: 'S', nombre: 'Empleados de empresas liquidadas', uso: 'Casos especiales.' },
  { codigo: 'H', nombre: 'Manual', uso: 'Cuando el operador lo autoriza.' },
];

/** Novedades de la planilla y de dónde las saca la app. */
export const NOVEDADES = [
  { codigo: 'ING', nombre: 'Ingreso', clase: 'permanente', origen: 'Fecha de inicio del contrato dentro del mes.' },
  { codigo: 'RET', nombre: 'Retiro', clase: 'permanente', origen: 'Fecha de terminación dentro del mes.' },
  { codigo: 'TDE', nombre: 'Traslado desde otra EPS', clase: 'permanente', origen: 'Se marca a mano.' },
  { codigo: 'TAE', nombre: 'Traslado a otra EPS', clase: 'permanente', origen: 'Se marca a mano.' },
  { codigo: 'TDP', nombre: 'Traslado desde otra AFP', clase: 'permanente', origen: 'Se marca a mano.' },
  { codigo: 'TAP', nombre: 'Traslado a otra AFP', clase: 'permanente', origen: 'Se marca a mano.' },
  { codigo: 'VSP', nombre: 'Variación permanente de salario', clase: 'permanente', origen: 'Cambio de salario del contrato.' },
  { codigo: 'VST', nombre: 'Variación transitoria de salario', clase: 'transitoria', origen: 'Se marca a mano.' },
  { codigo: 'SLN', nombre: 'Suspensión o licencia no remunerada', clase: 'transitoria', origen: 'Días de suspensión o licencia no remunerada.' },
  { codigo: 'IGE', nombre: 'Incapacidad general', clase: 'transitoria', origen: 'Días de incapacidad de origen común.' },
  { codigo: 'IRL', nombre: 'Incapacidad por riesgo laboral', clase: 'transitoria', origen: 'Días de incapacidad de origen laboral.' },
  { codigo: 'LMA', nombre: 'Licencia de maternidad o paternidad', clase: 'transitoria', origen: 'Días de licencia de maternidad o paternidad.' },
  { codigo: 'VAC', nombre: 'Vacaciones o licencia remunerada', clase: 'transitoria', origen: 'Días de vacaciones o licencia remunerada.' },
  { codigo: 'AVP', nombre: 'Aporte voluntario a pensión', clase: 'transitoria', origen: 'Se marca a mano.' },
];

/** Qué novedad le corresponde a cada tipo de día del calendario de la app. */
const NOVEDAD_POR_TIPO = {
  'incapacidad-comun': 'IGE',
  'incapacidad-laboral': 'IRL',
  maternidad: 'LMA',
  paternidad: 'LMA',
  vacaciones: 'VAC',
  'licencia-remunerada': 'VAC',
  luto: 'VAC',
  'licencia-no-remunerada': 'SLN',
  suspension: 'SLN',
};

/**
 * Línea de planilla de un trabajador en un mes.
 *
 * @param {Object} p
 * @param {Object} p.contrato
 * @param {Object} p.empleado
 * @param {Object} p.resultado  Salida de liquidarPeriodo del mismo mes.
 * @param {Object} p.empresa
 */
export function lineaCotizante({ contrato, empleado = {}, resultado, empresa = {}, novedadesExtra = [] }) {
  const mes = resultado.hasta.slice(0, 7);
  const primero = `${mes}-01`;
  const ultimo = finDeMes(primero);
  const fecha = resultado.hasta;
  const minimo = ley.smmlv(fecha);
  const a = ley.APORTES;

  const novedades = detectarNovedades({
    contrato, desde: resultado.desde, hasta: resultado.hasta, detalleDias: resultado.detalleDias,
  }).concat(novedadesExtra);

  // Días cotizados. La PILA cuenta meses de 30 días; los días de suspensión o
  // licencia no remunerada no se cotizan a pensión ni a parafiscales.
  const diasMes = Math.min(30, diasCalendario(primero, ultimo) + 1);
  const diasNoCotizados = resultado.dias.noRemunerados;
  const diasBase = Math.max(0, Math.min(30, diasCalendario(resultado.desde, resultado.hasta) + 1));
  const diasCotizados = Math.max(0, Math.min(30, diasBase - diasNoCotizados));

  const ibc = resultado.ibc;
  const exonerado = resultado.aportes.aplicaExoneracion;
  const tarifaArl = resultado.aportes.tarifas.arl;
  const tarifaFsp = resultado.aportes.tarifas.fsp;

  return {
    // Identificación
    tipoDocumento: empleado.tipoDocumento || 'CC',
    documento: (empleado.documento || '').replace(/\D/g, ''),
    tipoCotizante: contrato.tipoCotizante || (contrato.tipo === 'aprendizaje' ? '19' : '01'),
    subtipoCotizante: contrato.subtipoCotizante || '00',
    nombre: empleado.nombre || '',
    // Entidades
    eps: empleado.eps || '',
    afp: empleado.afp || '',
    ccf: empleado.ccf || empresa.ccf || '',
    arl: empresa.arl || '',
    // Periodo
    periodoSalud: mes,
    periodoPension: mes,
    // Días
    diasCotizadosPension: diasCotizados,
    diasCotizadosSalud: diasCotizados,
    diasCotizadosArl: Math.min(30, diasBase),
    diasCotizadosCcf: diasCotizados,
    // Bases
    ibcPension: ibc,
    ibcSalud: ibc,
    ibcArl: ibc,
    ibcCcf: ibc,
    salarioBasico: Math.round(resultado.devengadoSalarial),
    // Tarifas
    tarifaPension: a.pension.total,
    tarifaSalud: a.salud.total,
    tarifaArl,
    tarifaCcf: a.parafiscales.caja,
    // Valores
    cotizacionPension: resultado.aportes.trabajador.pension + resultado.aportes.empleador.pension,
    aporteFsp: resultado.aportes.trabajador.fsp,
    tarifaFsp,
    cotizacionSalud: resultado.aportes.trabajador.salud + resultado.aportes.empleador.salud,
    cotizacionArl: resultado.aportes.empleador.arl,
    aporteCcf: resultado.aportes.empleador.caja,
    aporteSena: resultado.aportes.empleador.sena,
    aporteIcbf: resultado.aportes.empleador.icbf,
    exoneradoSaludSenaIcbf: exonerado,
    // Novedades
    novedades,
    // Control
    totalTrabajador: resultado.aportes.trabajador.total,
    totalEmpleador: resultado.aportes.empleador.total,
    total: resultado.aportes.total,
    avisos: revisarLinea({ ibc, minimo, diasCotizados, diasMes, novedades, contrato, resultado }),
  };
}

/** Novedades con sus fechas, a partir del calendario de días. */
export function detectarNovedades({ contrato, desde, hasta, detalleDias = [] }) {
  const salida = [];

  if (contrato.inicio >= desde && contrato.inicio <= hasta) {
    salida.push({ codigo: 'ING', desde: contrato.inicio, hasta: '', detalle: 'Inicio del contrato' });
  }
  const fin = contrato.terminacion || (contrato.estado === 'terminado' ? contrato.fin : '');
  if (fin && fin >= desde && fin <= hasta) {
    salida.push({ codigo: 'RET', desde: fin, hasta: '', detalle: 'Terminación del contrato' });
  }
  if (contrato.cambioSalarioDesde && contrato.cambioSalarioDesde >= desde && contrato.cambioSalarioDesde <= hasta) {
    salida.push({ codigo: 'VSP', desde: contrato.cambioSalarioDesde, hasta: '', detalle: 'Cambio de salario' });
  }

  // Rachas de días con la misma novedad.
  let racha = null;
  for (const dia of detalleDias) {
    const codigo = NOVEDAD_POR_TIPO[dia.tipo] || null;
    if (racha && (!codigo || codigo !== racha.codigo || dia.fecha !== sumarDias(racha.hasta, 1))) {
      salida.push(racha);
      racha = null;
    }
    if (codigo) {
      if (racha) racha.hasta = dia.fecha;
      else racha = { codigo, desde: dia.fecha, hasta: dia.fecha, detalle: dia.nombreTipo };
    }
  }
  if (racha) salida.push(racha);

  for (const n of salida) n.dias = n.hasta ? diasCalendario(n.desde, n.hasta) + 1 : 0;
  return salida.sort((x, y) => (x.desde < y.desde ? -1 : 1));
}

function revisarLinea({ ibc, minimo, diasCotizados, diasMes, novedades, contrato, resultado }) {
  const avisos = [];
  const tieneNovedad = (c) => novedades.some((n) => n.codigo === c);

  if (diasCotizados < diasMes && !tieneNovedad('ING') && !tieneNovedad('RET') && !tieneNovedad('SLN')) {
    avisos.push(`Se reportan ${diasCotizados} días de ${diasMes} sin novedad que lo explique: la PILA lo rechaza o la UGPP lo marca.`);
  }
  if (ibc < minimo && !tieneNovedad('SLN') && !tieneNovedad('ING') && !tieneNovedad('RET')) {
    avisos.push('El IBC quedó por debajo del salario mínimo sin una novedad que lo justifique.');
  }
  if (contrato.tipo === 'aprendizaje' && (contrato.tipoCotizante || '19') === '01') {
    avisos.push('Un aprendiz se reporta con tipo de cotizante 12 (etapa lectiva) o 19 (etapa productiva), no con 01.');
  }
  if (resultado.dias.incapacidadComun > 0 && !tieneNovedad('IGE')) {
    avisos.push('Hay días de incapacidad que no quedaron como novedad IGE.');
  }
  return avisos;
}

/** Planilla completa del mes. */
export function armarPlanilla({ empresa = {}, mes, lineas = [], tipoPlanilla = 'E', numeroPlanilla = '' }) {
  const totales = lineas.reduce((t, l) => ({
    pension: t.pension + l.cotizacionPension,
    fsp: t.fsp + l.aporteFsp,
    salud: t.salud + l.cotizacionSalud,
    arl: t.arl + l.cotizacionArl,
    ccf: t.ccf + l.aporteCcf,
    sena: t.sena + l.aporteSena,
    icbf: t.icbf + l.aporteIcbf,
  }), { pension: 0, fsp: 0, salud: 0, arl: 0, ccf: 0, sena: 0, icbf: 0 });
  totales.general = Object.values(totales).reduce((a, b) => a + b, 0);

  return {
    encabezado: {
      tipoRegistro: '01',
      modalidadPlanilla: tipoPlanilla,
      numeroPlanilla: numeroPlanilla || `${mes.replace('-', '')}01`,
      tipoDocumentoAportante: empresa.tipoDocumento || 'NI',
      documentoAportante: nitSinVerificacion(empresa.nit),
      razonSocial: empresa.nombre || '',
      periodoPension: mes,
      periodoSalud: mes,
      numeroCotizantes: lineas.length,
      fechaPago: '',
    },
    lineas,
    totales,
    avisos: lineas.flatMap((l) => l.avisos.map((a) => `${l.nombre}: ${a}`)),
    norma: 'Resolución 2388 de 2016 del Ministerio de Salud y Protección Social',
  };
}

/**
 * Estructura del registro tipo 2 (un cotizante). Cada campo dice su longitud
 * y de dónde sale. ⚠ Coteja el orden y las longitudes con el anexo técnico
 * vigente de tu operador antes del primer cargue.
 */
export const CAMPOS_REGISTRO_2 = [
  { n: 1, nombre: 'Tipo de registro', largo: 2, valor: () => '02' },
  { n: 2, nombre: 'Secuencia', largo: 5, valor: (l, i) => String(i + 1) },
  { n: 3, nombre: 'Tipo de documento', largo: 2, valor: (l) => l.tipoDocumento },
  { n: 4, nombre: 'Número de documento', largo: 16, valor: (l) => l.documento },
  { n: 5, nombre: 'Tipo de cotizante', largo: 2, valor: (l) => l.tipoCotizante },
  { n: 6, nombre: 'Subtipo de cotizante', largo: 2, valor: (l) => l.subtipoCotizante },
  { n: 7, nombre: 'Primer apellido', largo: 20, valor: (l) => parteNombre(l.nombre, 'apellido1') },
  { n: 8, nombre: 'Segundo apellido', largo: 30, valor: (l) => parteNombre(l.nombre, 'apellido2') },
  { n: 9, nombre: 'Primer nombre', largo: 20, valor: (l) => parteNombre(l.nombre, 'nombre1') },
  { n: 10, nombre: 'Segundo nombre', largo: 30, valor: (l) => parteNombre(l.nombre, 'nombre2') },
  { n: 11, nombre: 'Novedad ingreso (ING)', largo: 1, valor: (l) => marca(l, 'ING') },
  { n: 12, nombre: 'Novedad retiro (RET)', largo: 1, valor: (l) => marca(l, 'RET') },
  { n: 13, nombre: 'Variación permanente de salario (VSP)', largo: 1, valor: (l) => marca(l, 'VSP') },
  { n: 14, nombre: 'Variación transitoria de salario (VST)', largo: 1, valor: (l) => marca(l, 'VST') },
  { n: 15, nombre: 'Suspensión o licencia no remunerada (SLN)', largo: 1, valor: (l) => marca(l, 'SLN') },
  { n: 16, nombre: 'Incapacidad general (IGE)', largo: 1, valor: (l) => marca(l, 'IGE') },
  { n: 17, nombre: 'Licencia de maternidad o paternidad (LMA)', largo: 1, valor: (l) => marca(l, 'LMA') },
  { n: 18, nombre: 'Vacaciones o licencia remunerada (VAC)', largo: 1, valor: (l) => marca(l, 'VAC') },
  { n: 19, nombre: 'Incapacidad por riesgo laboral (IRL)', largo: 1, valor: (l) => marca(l, 'IRL') },
  { n: 20, nombre: 'Código EPS', largo: 6, valor: (l) => l.eps },
  { n: 21, nombre: 'Código AFP', largo: 6, valor: (l) => l.afp },
  { n: 22, nombre: 'Código CCF', largo: 6, valor: (l) => l.ccf },
  { n: 23, nombre: 'Días cotizados a pensión', largo: 2, numero: true, valor: (l) => l.diasCotizadosPension },
  { n: 24, nombre: 'Días cotizados a salud', largo: 2, numero: true, valor: (l) => l.diasCotizadosSalud },
  { n: 25, nombre: 'Días cotizados a riesgos laborales', largo: 2, numero: true, valor: (l) => l.diasCotizadosArl },
  { n: 26, nombre: 'Días cotizados a caja', largo: 2, numero: true, valor: (l) => l.diasCotizadosCcf },
  { n: 27, nombre: 'Salario básico', largo: 9, numero: true, valor: (l) => l.salarioBasico },
  { n: 28, nombre: 'IBC pensión', largo: 9, numero: true, valor: (l) => l.ibcPension },
  { n: 29, nombre: 'IBC salud', largo: 9, numero: true, valor: (l) => l.ibcSalud },
  { n: 30, nombre: 'IBC riesgos laborales', largo: 9, numero: true, valor: (l) => l.ibcArl },
  { n: 31, nombre: 'IBC caja', largo: 9, numero: true, valor: (l) => l.ibcCcf },
  { n: 32, nombre: 'Tarifa de pensión', largo: 7, decimal: 4, valor: (l) => l.tarifaPension },
  { n: 33, nombre: 'Cotización obligatoria a pensión', largo: 9, numero: true, valor: (l) => l.cotizacionPension },
  { n: 34, nombre: 'Aporte al fondo de solidaridad', largo: 9, numero: true, valor: (l) => l.aporteFsp },
  { n: 35, nombre: 'Tarifa de salud', largo: 7, decimal: 4, valor: (l) => l.tarifaSalud },
  { n: 36, nombre: 'Cotización obligatoria a salud', largo: 9, numero: true, valor: (l) => l.cotizacionSalud },
  { n: 37, nombre: 'Tarifa de riesgos laborales', largo: 9, decimal: 6, valor: (l) => l.tarifaArl },
  { n: 38, nombre: 'Cotización de riesgos laborales', largo: 9, numero: true, valor: (l) => l.cotizacionArl },
  { n: 39, nombre: 'Tarifa de caja', largo: 7, decimal: 4, valor: (l) => l.tarifaCcf },
  { n: 40, nombre: 'Aporte a caja de compensación', largo: 9, numero: true, valor: (l) => l.aporteCcf },
  { n: 41, nombre: 'Aporte al SENA', largo: 9, numero: true, valor: (l) => l.aporteSena },
  { n: 42, nombre: 'Aporte al ICBF', largo: 9, numero: true, valor: (l) => l.aporteIcbf },
  { n: 43, nombre: 'Fecha de ingreso', largo: 10, valor: (l) => fechaNovedad(l, 'ING') },
  { n: 44, nombre: 'Fecha de retiro', largo: 10, valor: (l) => fechaNovedad(l, 'RET') },
  { n: 45, nombre: 'Fecha inicio SLN', largo: 10, valor: (l) => fechaNovedad(l, 'SLN') },
  { n: 46, nombre: 'Fecha fin SLN', largo: 10, valor: (l) => fechaNovedad(l, 'SLN', 'hasta') },
  { n: 47, nombre: 'Fecha inicio IGE', largo: 10, valor: (l) => fechaNovedad(l, 'IGE') },
  { n: 48, nombre: 'Fecha fin IGE', largo: 10, valor: (l) => fechaNovedad(l, 'IGE', 'hasta') },
  { n: 49, nombre: 'Fecha inicio VAC', largo: 10, valor: (l) => fechaNovedad(l, 'VAC') },
  { n: 50, nombre: 'Fecha fin VAC', largo: 10, valor: (l) => fechaNovedad(l, 'VAC', 'hasta') },
];

/**
 * El NIT va sin el dígito de verificación: "900.123.456-1" entra como
 * 900123456, no como 9001234561.
 */
export function nitSinVerificacion(valor) {
  const texto = String(valor || '').trim();
  const conGuion = /^(.+)-(\d)$/.exec(texto);
  return (conGuion ? conGuion[1] : texto).replace(/\D/g, '');
}

function marca(linea, codigo) {
  return linea.novedades.some((n) => n.codigo === codigo) ? 'X' : '';
}

function fechaNovedad(linea, codigo, campo = 'desde') {
  const n = linea.novedades.find((x) => x.codigo === codigo);
  return n ? (n[campo] || '') : '';
}

function parteNombre(completo, cual) {
  const partesNombre = String(completo || '').trim().split(/\s+/);
  // Se asume "Nombre1 Nombre2 Apellido1 Apellido2"; con dos palabras, nombre y apellido.
  if (partesNombre.length >= 4) {
    return { nombre1: partesNombre[0], nombre2: partesNombre[1], apellido1: partesNombre[2], apellido2: partesNombre.slice(3).join(' ') }[cual] || '';
  }
  if (partesNombre.length === 3) {
    return { nombre1: partesNombre[0], nombre2: '', apellido1: partesNombre[1], apellido2: partesNombre[2] }[cual] || '';
  }
  return { nombre1: partesNombre[0] || '', nombre2: '', apellido1: partesNombre[1] || '', apellido2: '' }[cual] || '';
}

function rellenar(valor, campo) {
  let texto;
  if (campo.decimal) texto = Number(valor || 0).toFixed(campo.decimal).replace('.', '');
  else if (campo.numero) texto = String(Math.round(Number(valor) || 0));
  else texto = String(valor ?? '');
  texto = texto.slice(0, campo.largo);
  return campo.numero || campo.decimal
    ? texto.padStart(campo.largo, '0')
    : texto.padEnd(campo.largo, ' ');
}

/** Archivo plano posicional, según la tabla CAMPOS_REGISTRO_2. */
export function aArchivoPlano(planilla, campos = CAMPOS_REGISTRO_2) {
  const lineas = planilla.lineas.map((l, i) => campos.map((c) => rellenar(c.valor(l, i), c)).join(''));
  return lineas.join('\r\n');
}

/** Tabla legible: sirve para revisar y para los cargues por plantilla. */
export function aFilasCsv(planilla) {
  const cabecera = [
    'Tipo documento', 'Documento', 'Nombre', 'Tipo cotizante', 'Subtipo', 'EPS', 'AFP', 'CCF',
    'Días pensión', 'Días salud', 'Días ARL', 'Días CCF',
    'Salario básico', 'IBC pensión', 'IBC salud', 'IBC ARL', 'IBC CCF',
    'Pensión', 'FSP', 'Salud', 'ARL', 'Caja', 'SENA', 'ICBF', 'Novedades',
  ];
  const filas = planilla.lineas.map((l) => [
    l.tipoDocumento, l.documento, l.nombre, l.tipoCotizante, l.subtipoCotizante, l.eps, l.afp, l.ccf,
    l.diasCotizadosPension, l.diasCotizadosSalud, l.diasCotizadosArl, l.diasCotizadosCcf,
    l.salarioBasico, l.ibcPension, l.ibcSalud, l.ibcArl, l.ibcCcf,
    l.cotizacionPension, l.aporteFsp, l.cotizacionSalud, l.cotizacionArl, l.aporteCcf, l.aporteSena, l.aporteIcbf,
    l.novedades.map((n) => `${n.codigo}${n.desde ? ` ${formatoCorto(n.desde)}` : ''}${n.hasta && n.hasta !== n.desde ? `-${formatoCorto(n.hasta)}` : ''}`).join(' '),
  ]);
  const t = planilla.totales;
  filas.push(['', '', 'TOTALES', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    t.pension, t.fsp, t.salud, t.arl, t.ccf, t.sena, t.icbf, '']);
  return [cabecera, ...filas];
}

export { inicioDeMes, finDeMes };
