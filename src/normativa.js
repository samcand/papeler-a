/**
 * normativa.js — Los números que pone la ley, con su vigencia y su fuente.
 *
 * Todo cálculo de la app sale de esta tabla: nada de constantes sueltas
 * regadas por el código. Cada valor dice desde cuándo rige, qué norma lo fijó
 * y dónde consultarla, para que el día que cambie la ley se edite aquí —
 * y para que el módulo de Vigilancia pueda avisar cuándo un valor venció.
 *
 * Última verificación de datos: 2026-09-20.
 */

export const VERIFICADO_EL = '2026-09-20';

/** Fuentes oficiales. El módulo de Vigilancia las usa para revisar cambios. */
export const FUENTES = [
  {
    id: 'mintrabajo-normatividad',
    nombre: 'Ministerio del Trabajo — Normatividad',
    url: 'https://www.mintrabajo.gov.co/normatividad',
    tipo: 'oficial',
    revisar: 'Decretos, resoluciones y circulares del Ministerio.',
  },
  {
    id: 'mintrabajo-comunicados',
    nombre: 'Ministerio del Trabajo — Comunicados y noticias',
    url: 'https://www.mintrabajo.gov.co/prensa/comunicados',
    tipo: 'oficial',
    revisar: 'Anuncios de salario mínimo, reglamentación de la reforma laboral.',
  },
  {
    id: 'mintrabajo-conceptos',
    nombre: 'Ministerio del Trabajo — Conceptos jurídicos',
    url: 'https://www.mintrabajo.gov.co/atencion-al-ciudadano/conceptos-juridicos',
    tipo: 'oficial',
    revisar: 'Interpretación oficial de jornada, recargos y liquidaciones.',
  },
  {
    id: 'gestor-normativo',
    nombre: 'Función Pública — Gestor Normativo',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=260676',
    tipo: 'oficial',
    revisar: 'Texto vigente de la Ley 2466 de 2025 (reforma laboral).',
  },
  {
    id: 'cst',
    nombre: 'Código Sustantivo del Trabajo',
    url: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=33104',
    tipo: 'oficial',
    revisar: 'Articulado base: jornada, recargos, prestaciones, indemnizaciones.',
  },
  {
    id: 'diario-oficial',
    nombre: 'Diario Oficial — Imprenta Nacional',
    url: 'https://www.imprenta.gov.co/diariooficial/',
    tipo: 'oficial',
    revisar: 'Publicación de leyes y decretos: es la fecha que cuenta.',
  },
  {
    id: 'dian-uvt',
    nombre: 'DIAN — Normatividad (UVT y retención)',
    url: 'https://www.dian.gov.co/normatividad/Paginas/Resoluciones.aspx',
    tipo: 'oficial',
    revisar: 'Resolución anual de la UVT y tablas de retención en la fuente.',
  },
  {
    id: 'ugpp',
    nombre: 'UGPP — Aportes al sistema de la protección social',
    url: 'https://www.ugpp.gov.co/',
    tipo: 'oficial',
    revisar: 'Fiscalización de aportes, IBC y planilla PILA.',
  },
  {
    id: 'corte-constitucional',
    nombre: 'Corte Constitucional — Relatoría',
    url: 'https://www.corteconstitucional.gov.co/relatoria/',
    tipo: 'oficial',
    revisar: 'Demandas contra la reforma laboral y la reforma pensional.',
  },
];

/** Valores que cambian cada año por decreto o resolución. */
export const ANUALES = [
  {
    anio: 2023,
    smmlv: 1160000,
    auxilioTransporte: 140606,
    uvt: 42412,
    normaSalario: 'Decreto 2613 de 2022',
    normaAuxilio: 'Decreto 2614 de 2022',
    normaUvt: 'Resolución DIAN 1264 de 2022',
  },
  {
    anio: 2024,
    smmlv: 1300000,
    auxilioTransporte: 162000,
    uvt: 47065,
    normaSalario: 'Decreto 2292 de 2023',
    normaAuxilio: 'Decreto 2293 de 2023',
    normaUvt: 'Resolución DIAN 187 de 2023',
  },
  {
    anio: 2025,
    smmlv: 1423500,
    auxilioTransporte: 200000,
    uvt: 49799,
    normaSalario: 'Decreto 1572 de 2024',
    normaAuxilio: 'Decreto 1573 de 2024',
    normaUvt: 'Resolución DIAN 193 de 2024',
  },
  {
    anio: 2026,
    smmlv: 1750905,
    auxilioTransporte: 249095,
    uvt: 52374,
    normaSalario: 'Decreto 1469 de 2025',
    normaAuxilio: 'Decreto 1470 de 2025',
    normaUvt: 'Resolución DIAN 000238 de 2025',
  },
];

/**
 * Jornada máxima semanal (Ley 2101 de 2021, gradualidad terminada el
 * 15 de julio de 2026) y el divisor mensual que sale de ella:
 * (horas semana / 6) × 30. Es el número de horas que "contiene" el mes y con
 * el que se saca el valor de la hora ordinaria.
 */
export const JORNADA = [
  { desde: '1900-01-01', horasSemana: 48, divisor: 240, norma: 'CST art. 161' },
  { desde: '2023-07-15', horasSemana: 47, divisor: 235, norma: 'Ley 2101 de 2021' },
  { desde: '2024-07-15', horasSemana: 46, divisor: 230, norma: 'Ley 2101 de 2021' },
  { desde: '2025-07-15', horasSemana: 44, divisor: 220, norma: 'Ley 2101 de 2021' },
  { desde: '2026-07-15', horasSemana: 42, divisor: 210, norma: 'Ley 2101 de 2021' },
];

/**
 * Franja diurna. La Ley 2466 de 2025 devolvió la jornada nocturna a las
 * 7:00 p. m. seis meses después de su vigencia, esto es, desde el 25 de
 * diciembre de 2025 (antes empezaba a las 9:00 p. m.).
 */
export const NOCTURNIDAD = [
  { desde: '1900-01-01', inicioDiurna: 6, finDiurna: 21, norma: 'CST art. 160 (Ley 789 de 2002)' },
  { desde: '2025-12-25', inicioDiurna: 6, finDiurna: 19, norma: 'CST art. 160 (Ley 2466 de 2025)' },
];

/**
 * Recargo por trabajar en el día de descanso obligatorio (domingo o el día
 * pactado) y en festivos. La Ley 2466 de 2025 lo sube por etapas.
 */
export const RECARGO_DESCANSO = [
  { desde: '1900-01-01', factor: 0.75, norma: 'CST art. 179 (Ley 789 de 2002)' },
  { desde: '2025-07-01', factor: 0.80, norma: 'CST art. 179 (Ley 2466 de 2025)' },
  { desde: '2026-07-01', factor: 0.90, norma: 'CST art. 179 (Ley 2466 de 2025)' },
  { desde: '2027-07-01', factor: 1.00, norma: 'CST art. 179 (Ley 2466 de 2025)' },
];

/** Recargos que no han cambiado con la reforma (CST art. 168). */
export const RECARGOS = {
  nocturno: 0.35,
  extraDiurna: 0.25,
  extraNocturna: 0.75,
  norma: 'CST art. 168',
};

/** Topes de trabajo suplementario (CST art. 167 y Ley 2466 de 2025). */
export const TOPES_EXTRAS = { diarias: 2, semanales: 12 };

/** Aportes a la seguridad social y parafiscales. */
export const APORTES = {
  salud: { total: 0.125, empleador: 0.085, trabajador: 0.04, norma: 'Ley 100 de 1993 art. 204' },
  pension: { total: 0.16, empleador: 0.12, trabajador: 0.04, norma: 'Ley 100 de 1993 art. 20' },
  parafiscales: {
    caja: 0.04,
    icbf: 0.03,
    sena: 0.02,
    norma: 'Ley 21 de 1982, Ley 27 de 1974, Ley 89 de 1988',
  },
  // Exoneración de salud del empleador, SENA e ICBF por trabajadores que
  // devenguen menos de 10 SMMLV (aplica a sociedades y a personas naturales
  // con dos o más empleados). La caja de compensación NO se exonera.
  exoneracion: { topeSmmlv: 10, norma: 'Estatuto Tributario art. 114-1' },
  ibc: { pisoSmmlv: 1, techoSmmlv: 25, integralPorcentaje: 0.70 },
};

/** Fondo de Solidaridad Pensional: lo paga el trabajador (Ley 797 de 2003). */
export const FSP = [
  { desdeSmmlv: 4, hastaSmmlv: 16, tarifa: 0.010 },
  { desdeSmmlv: 16, hastaSmmlv: 17, tarifa: 0.012 },
  { desdeSmmlv: 17, hastaSmmlv: 18, tarifa: 0.014 },
  { desdeSmmlv: 18, hastaSmmlv: 19, tarifa: 0.016 },
  { desdeSmmlv: 19, hastaSmmlv: 20, tarifa: 0.018 },
  { desdeSmmlv: 20, hastaSmmlv: Infinity, tarifa: 0.020 },
];

/** Tarifas de ARL por clase de riesgo (Decreto 1072 de 2015, art. 2.2.4.3.5). */
export const ARL = [
  { clase: 'I', minima: 0.00348, media: 0.00522, maxima: 0.00696, ejemplo: 'Oficinas, comercio, actividades administrativas.' },
  { clase: 'II', minima: 0.00435, media: 0.01044, maxima: 0.01653, ejemplo: 'Talleres pequeños, procesos manuales livianos.' },
  { clase: 'III', minima: 0.00783, media: 0.02436, maxima: 0.04089, ejemplo: 'Manufactura, agricultura, transporte.' },
  { clase: 'IV', minima: 0.01740, media: 0.04350, maxima: 0.06960, ejemplo: 'Construcción liviana, metalmecánica pesada.' },
  { clase: 'V', minima: 0.03219, media: 0.06960, maxima: 0.08700, ejemplo: 'Construcción en altura, minería, manejo de explosivos.' },
];

/** Prestaciones sociales y sus fechas límite de pago. */
export const PRESTACIONES = {
  prima: {
    diasPorAnio: 30,
    norma: 'CST art. 306 (Ley 1788 de 2016)',
    cortes: [
      { corte: '06-30', limite: '06-30', nombre: 'Prima del primer semestre' },
      { corte: '12-31', limite: '12-20', nombre: 'Prima del segundo semestre' },
    ],
  },
  cesantias: {
    diasPorAnio: 30,
    norma: 'CST art. 249 y Ley 50 de 1990 art. 99',
    corte: '12-31',
    limiteConsignacion: '02-14',
    sancion: 'Un día de salario por cada día de retardo (Ley 50 de 1990, art. 99).',
  },
  intereses: {
    tasaAnual: 0.12,
    norma: 'Ley 52 de 1975',
    limitePago: '01-31',
    sancion: 'Indemnización igual al valor de los intereses no pagados.',
  },
  vacaciones: {
    diasHabilesPorAnio: 15,
    norma: 'CST art. 186 y 189',
    nota: 'Se calculan sobre el salario ordinario, sin auxilio de transporte.',
  },
  dotacion: {
    topeSmmlv: 2,
    mesesMinimos: 3,
    entregas: ['04-30', '08-31', '12-20'],
    norma: 'CST art. 230 y 232',
  },
};

/** Indemnización por despido sin justa causa (CST art. 64). */
export const INDEMNIZACION = {
  indefinido: [
    {
      topeSmmlv: 10,
      primerAnio: 30,
      aniosSiguientes: 20,
      descripcion: '30 días por el primer año y 20 días por cada año siguiente (proporcional por fracción).',
    },
    {
      topeSmmlv: Infinity,
      primerAnio: 20,
      aniosSiguientes: 15,
      descripcion: '20 días por el primer año y 15 días por cada año siguiente (proporcional por fracción).',
    },
  ],
  fijo: 'Los salarios del tiempo que falte para terminar el plazo pactado.',
  obra: 'Los salarios del tiempo que falte para terminar la obra, mínimo 15 días.',
  norma: 'CST art. 64',
};

/** Incapacidades y licencias (porcentajes sobre el IBC). */
export const AUSENCIAS = {
  incapacidadComun: {
    diasEmpleador: 2,
    porcentajeHasta90: 2 / 3,
    porcentajeDesde91: 0.5,
    pisoSmmlv: 1,
    norma: 'Decreto 780 de 2016 y Ley 1753 de 2015 art. 67',
    nota: 'Los dos primeros días los paga el empleador; del 3 al 90 la EPS al 66,67 %; del 91 al 180 al 50 %. Nunca por debajo del salario mínimo.',
  },
  incapacidadLaboral: {
    porcentaje: 1,
    norma: 'Decreto 1072 de 2015',
    nota: 'Accidente de trabajo o enfermedad laboral: la ARL paga el 100 % desde el día siguiente.',
  },
  licenciaMaternidad: { semanas: 18, porcentaje: 1, norma: 'CST art. 236 (Ley 2114 de 2021)' },
  licenciaPaternidad: { semanas: 2, porcentaje: 1, norma: 'CST art. 236 par. 2 (Ley 2114 de 2021)' },
  licenciaLuto: { dias: 5, porcentaje: 1, aCargoDe: 'empleador', norma: 'Ley 1280 de 2009' },
};

/** Contratos y sus límites (CST y Ley 2466 de 2025). */
export const CONTRATOS = [
  {
    id: 'indefinido',
    nombre: 'Término indefinido',
    nota: 'Es la regla general: la Ley 2466 de 2025 lo declaró la forma preferente de contratación.',
  },
  {
    id: 'fijo',
    nombre: 'Término fijo',
    nota: 'Máximo 4 años en total. Si es menor a un año se puede prorrogar, pero después de la cuarta prórroga la renovación no puede ser por menos de un año. Preaviso de 30 días para no prorrogarlo.',
    maxAnios: 4,
  },
  {
    id: 'obra',
    nombre: 'Obra o labor',
    nota: 'Debe constar por escrito la obra concreta; termina cuando la obra termina.',
  },
  {
    id: 'aprendizaje',
    nombre: 'Aprendizaje',
    nota: 'Con la Ley 2466 de 2025 es un contrato laboral especial a término fijo. Revisa la reglamentación vigente antes de liquidar aportes de la etapa lectiva.',
  },
];

/**
 * Periodo de prueba (CST art. 76 a 80).
 *  - Debe pactarse por escrito, si no, no existe.
 *  - Indefinido: hasta 2 meses.
 *  - Término fijo menor a un año: hasta la quinta parte del plazo, sin pasar
 *    de 2 meses.
 */
export const PERIODO_PRUEBA = {
  maximoDias: 60,
  fraccionDelPlazo: 1 / 5,
  norma: 'CST art. 76 a 80',
};

/** Datos que el contrato escrito debe contener (CST art. 39). */
export const REQUISITOS_CONTRATO = [
  'Identificación y domicilio de las partes.',
  'Lugar y fecha de nacimiento del trabajador.',
  'Clase de trabajo y lugar donde va a prestarse.',
  'Cuantía de la remuneración, forma y periodos de pago.',
  'Estimación del valor del salario en especie, si lo hay.',
  'Duración del contrato, su desahucio y terminación.',
];

/** Cambios que ya están en el calendario: el módulo de Vigilancia los anuncia. */
export const CAMBIOS_PROGRAMADOS = [
  {
    fecha: '2027-01-01',
    titulo: 'Nuevo salario mínimo, auxilio de transporte y UVT',
    detalle: 'Se fijan por decreto a finales de diciembre. Hay que actualizar la tabla de valores anuales.',
    norma: 'Decretos anuales del Gobierno Nacional / Resolución DIAN',
  },
  {
    fecha: '2027-07-01',
    titulo: 'El recargo por día de descanso y festivos llega al 100 %',
    detalle: 'Última etapa de la gradualidad de la reforma laboral: pasa del 90 % al 100 %.',
    norma: 'Ley 2466 de 2025 (CST art. 179)',
  },
];

// ——— Consultas ———————————————————————————————————————————————

function vigenteEn(tabla, fecha) {
  let elegida = tabla[0];
  for (const fila of tabla) {
    if (fila.desde <= fecha) elegida = fila;
  }
  return elegida;
}

export function anioDe(fecha) {
  return Number(String(fecha).slice(0, 4));
}

/** Valores anuales de la fecha. Si el año no está en la tabla, usa el último conocido y lo advierte. */
export function valoresAnuales(fecha) {
  const anio = anioDe(fecha);
  const exacto = ANUALES.find((a) => a.anio === anio);
  if (exacto) return { ...exacto, estimado: false };
  const ultimo = ANUALES[ANUALES.length - 1];
  const primero = ANUALES[0];
  if (anio < primero.anio) return { ...primero, estimado: true };
  return { ...ultimo, estimado: true };
}

export function smmlv(fecha) {
  return valoresAnuales(fecha).smmlv;
}

export function auxilioTransporte(fecha) {
  return valoresAnuales(fecha).auxilioTransporte;
}

export function uvt(fecha) {
  return valoresAnuales(fecha).uvt;
}

export function jornada(fecha) {
  return vigenteEn(JORNADA, fecha);
}

export function franjaDiurna(fecha) {
  return vigenteEn(NOCTURNIDAD, fecha);
}

export function recargoDescanso(fecha) {
  return vigenteEn(RECARGO_DESCANSO, fecha);
}

export function tarifaFsp(ibc, fecha) {
  const enSmmlv = ibc / smmlv(fecha);
  if (enSmmlv < 4) return 0;
  const fila = FSP.find((f) => enSmmlv >= f.desdeSmmlv && enSmmlv < f.hastaSmmlv);
  return fila ? fila.tarifa : 0.02;
}

export function tarifaArl(clase, nivel = 'media') {
  const fila = ARL.find((a) => a.clase === String(clase).toUpperCase());
  if (!fila) return ARL[0].media;
  return fila[nivel] ?? fila.media;
}

/** ¿Tiene derecho a auxilio de transporte? Hasta 2 SMMLV. */
export function tieneAuxilioTransporte(salarioMensual, fecha) {
  return salarioMensual <= 2 * smmlv(fecha);
}

/** Salario mínimo integral: 10 SMMLV + 30 % de factor prestacional. */
export function minimoIntegral(fecha) {
  return smmlv(fecha) * 13;
}
