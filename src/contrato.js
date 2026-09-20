/**
 * contrato.js — El contrato de trabajo escrito, listo para imprimir y firmar.
 *
 * Arma el documento a partir de los datos del empleador, el trabajador y las
 * condiciones pactadas, con las cláusulas que exige el Código Sustantivo del
 * Trabajo y la duración que corresponda: por días, por meses, por un año,
 * continuo (indefinido), por obra o labor o de aprendizaje.
 *
 * El texto no es un formato genérico: cambia según lo pactado (forma de pago,
 * jornada, día de descanso, salario integral) y cita la norma de cada cosa.
 */

import { dias360, diasCalendario, sumarDias, sumarMeses, formatoLargo, hoy, partes } from './fechas.js';
import * as calc from './calculo.js';
import * as ley from './normativa.js';

export const DURACIONES = [
  {
    id: 'dias',
    nombre: 'Por días',
    tipoContrato: 'fijo',
    ayuda: 'Un plazo corto en días. Se pacta por escrito; si además se paga por jornal, cada día trabajado se liquida aparte.',
  },
  {
    id: 'meses',
    nombre: 'Por meses',
    tipoContrato: 'fijo',
    ayuda: 'Término fijo inferior a un año: se puede prorrogar, pero después de la cuarta prórroga la renovación no puede ser por menos de un año.',
  },
  {
    id: 'anio',
    nombre: 'Por un año o más',
    tipoContrato: 'fijo',
    ayuda: 'Término fijo de uno a cuatro años. Se prorroga solo si no se avisa lo contrario con 30 días de anticipación.',
  },
  {
    id: 'indefinido',
    nombre: 'Continuo (término indefinido)',
    tipoContrato: 'indefinido',
    ayuda: 'No tiene fecha de terminación. Es la forma preferente de contratación según la Ley 2466 de 2025.',
  },
  {
    id: 'obra',
    nombre: 'Por obra o labor',
    tipoContrato: 'obra',
    ayuda: 'Dura lo que dure la obra, que hay que describir con precisión en el contrato.',
  },
  {
    id: 'aprendizaje',
    nombre: 'De aprendizaje',
    tipoContrato: 'aprendizaje',
    ayuda: 'Contrato laboral especial a término fijo (Ley 2466 de 2025). Revisa la reglamentación vigente.',
  },
];

export function duracion(id) {
  return DURACIONES.find((d) => d.id === id) || DURACIONES[3];
}

/**
 * Periodo de prueba máximo que se puede pactar (CST art. 76 a 78).
 * En los contratos a término fijo menores a un año no puede pasar de la
 * quinta parte del plazo, y nunca de dos meses.
 */
export function periodoPruebaMaximo({ duracionId, inicio, fin }) {
  const tope = ley.PERIODO_PRUEBA.maximoDias;
  if (duracionId === 'indefinido') {
    return { dias: tope, regla: 'Hasta dos meses (CST art. 78).' };
  }
  if (!fin || !inicio) {
    return { dias: tope, regla: 'Hasta dos meses (CST art. 78).' };
  }
  const plazo = diasCalendario(inicio, fin) + 1;
  if (plazo >= 365) {
    return { dias: tope, regla: 'Hasta dos meses (CST art. 78).' };
  }
  const quinta = Math.floor(plazo * ley.PERIODO_PRUEBA.fraccionDelPlazo);
  return {
    dias: Math.min(quinta, tope),
    regla: `La quinta parte del plazo pactado (${plazo} días ÷ 5 = ${quinta} días), sin pasar de dos meses (CST art. 78).`,
  };
}

/** Fecha de terminación según la duración elegida. */
export function calcularFin({ duracionId, inicio, cantidadDias = 0, cantidadMeses = 0, cantidadAnios = 0 }) {
  if (duracionId === 'indefinido' || duracionId === 'obra') return '';
  if (duracionId === 'dias') return sumarDias(inicio, Math.max(1, cantidadDias) - 1);
  if (duracionId === 'meses') return sumarDias(sumarMeses(inicio, Math.max(1, cantidadMeses)), -1);
  return sumarDias(sumarMeses(inicio, Math.max(1, cantidadAnios) * 12), -1);
}

/** Cierra con punto lo que escriba el usuario, para que la cláusula no quede coja. */
function puntoFinal(texto) {
  const t = String(texto || '').trim();
  if (!t) return t;
  return /[.;:!?]$/.test(t) ? t : `${t}.`;
}

const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

function enLetras(valor) {
  // Suficiente para escribir cifras de salario en el contrato.
  const n = Math.round(Number(valor) || 0);
  if (n === 0) return 'cero pesos';
  const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
    'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const hasta999 = (x) => {
    if (x === 0) return '';
    if (x === 100) return 'cien';
    const c = Math.floor(x / 100);
    const resto = x % 100;
    let texto = centenas[c];
    if (resto) {
      let r;
      if (resto < 20) r = unidades[resto];
      else if (resto < 30) r = resto === 20 ? 'veinte' : `veinti${unidades[resto - 20]}`;
      else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        r = decenas[d] + (u ? ` y ${unidades[u]}` : '');
      }
      texto = texto ? `${texto} ${r}` : r;
    }
    return texto;
  };

  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  const trozos = [];
  if (millones) trozos.push(millones === 1 ? 'un millón' : `${hasta999(millones)} millones`);
  if (miles) trozos.push(miles === 1 ? 'mil' : `${hasta999(miles)} mil`);
  if (resto) trozos.push(hasta999(resto));
  // "dos millones DE pesos", pero "dos millones quinientos mil pesos".
  const cierre = millones && !miles && !resto ? 'de pesos' : 'pesos';
  return `${trozos.join(' ')} ${cierre}`.replace(/\s+/g, ' ').trim();
}

/**
 * Arma el contrato completo.
 * @returns {{titulo, encabezado, clausulas, firmas, avisos, anexos}}
 */
export function generarContrato({ empresa = {}, empleado = {}, contrato = {}, datos = {} }) {
  const d = {
    duracionId: contrato.duracionId || duracionDesdeContrato(contrato),
    ciudadContrato: empresa.ciudad || '',
    lugarTrabajo: '',
    funciones: '',
    horario: '',
    periodoPruebaDias: 0,
    fechaFirma: hoy(),
    representante: empresa.representante || '',
    documentoRepresentante: empresa.documentoRepresentante || '',
    descripcionObra: '',
    salarioEspecie: 0,
    pagosNoSalariales: '',
    testigos: false,
    ...datos,
  };

  const inicio = contrato.inicio || d.fechaFirma;
  const fin = contrato.fin || '';
  const dur = duracion(d.duracionId);
  const fecha = inicio;
  const modalidad = contrato.modalidad || 'mensual';
  const salarioMes = calc.salarioMensualEquivalente(contrato, fecha);
  const jornada = ley.jornada(fecha);
  const franja = ley.franjaDiurna(fecha);
  const recargoDom = ley.recargoDescanso(fecha);
  const diaDescanso = Number(contrato.diaDescanso ?? 0);
  const nombreDiaDescanso = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][diaDescanso];
  const avisos = [];

  // ——— Encabezado con los datos del artículo 39 ———
  const encabezado = [
    ['Empleador', `${empresa.nombre || '—'}${empresa.nit ? `, NIT ${empresa.nit}` : ''}`],
    ['Representante legal', `${d.representante || '—'}${d.documentoRepresentante ? `, C.C. ${d.documentoRepresentante}` : ''}`],
    ['Domicilio del empleador', empresa.ciudad || '—'],
    ['Trabajador', `${empleado.nombre || '—'}, ${empleado.tipoDocumento || 'C.C.'} ${empleado.documento || '—'}`],
    ['Lugar y fecha de nacimiento', `${empleado.lugarNacimiento || '—'}${empleado.fechaNacimiento ? `, ${formatoLargo(empleado.fechaNacimiento)}` : ''}`],
    ['Dirección del trabajador', empleado.direccion || '—'],
    ['Cargo', empleado.cargo || '—'],
    ['Lugar donde se presta el servicio', d.lugarTrabajo || '—'],
    ['Ciudad donde se celebra el contrato', d.ciudadContrato || '—'],
    ['Fecha de iniciación', formatoLargo(inicio)],
    ['Clase de contrato', dur.nombre],
    ['Duración', textoDuracion({ dur, inicio, fin, descripcionObra: d.descripcionObra })],
    ['Remuneración', textoRemuneracion({ contrato, modalidad, salarioMes, fecha })],
    ['Periodo de pago', textoPeriodoPago(modalidad)],
  ];

  for (const [etiqueta, valor] of encabezado) {
    if (valor === '—') avisos.push(`Falta un dato que exige el artículo 39 del CST: ${etiqueta.toLowerCase()}.`);
  }

  // ——— Cláusulas ———
  const clausulas = [];
  const c = (titulo, ...parrafos) => clausulas.push({ titulo, parrafos: parrafos.filter(Boolean) });

  c('Objeto',
    `EL TRABAJADOR se obliga a prestar sus servicios personales a EL EMPLEADOR en el cargo de ${empleado.cargo || '[cargo]'}, `
    + 'bajo su continuada dependencia y subordinación, y a cumplir las órdenes e instrucciones que reciba sobre el modo, tiempo y '
    + 'cantidad de trabajo (Código Sustantivo del Trabajo, artículo 23).',
    d.funciones
      ? `Las funciones a su cargo serán: ${puntoFinal(d.funciones)}`
      : 'Las funciones a su cargo serán las propias del oficio contratado y las que le sean asignadas por su superior, siempre que sean compatibles con sus aptitudes y condición.');

  c('Lugar de trabajo',
    `EL TRABAJADOR prestará sus servicios en ${d.lugarTrabajo || '[lugar]'}. `
    + 'EL EMPLEADOR podrá trasladarlo a otro lugar o variar las condiciones de la prestación del servicio, siempre que no se '
    + 'desmejoren sus condiciones laborales ni se le causen perjuicios (facultad de ius variandi, CST artículo 23).');

  c('Duración del contrato', ...parrafosDuracion({ dur, inicio, fin, descripcionObra: d.descripcionObra, avisos }));

  const tope = periodoPruebaMaximo({ duracionId: d.duracionId, inicio, fin });
  if (Number(d.periodoPruebaDias) > 0) {
    if (Number(d.periodoPruebaDias) > tope.dias) {
      avisos.push(`El periodo de prueba pactado (${d.periodoPruebaDias} días) pasa del máximo legal de ${tope.dias} días. ${tope.regla}`);
    }
    c('Periodo de prueba',
      `Las partes pactan un periodo de prueba de ${d.periodoPruebaDias} días calendario, contados desde la fecha de iniciación, `
      + `esto es, hasta el ${formatoLargo(sumarDias(inicio, Number(d.periodoPruebaDias) - 1))}. `
      + 'Durante este periodo cualquiera de las partes puede dar por terminado el contrato unilateralmente y sin previo aviso, '
      + 'sin que haya lugar a indemnización (CST artículos 76 a 80).',
      `El máximo que la ley permite en este contrato es de ${tope.dias} días. ${tope.regla}`);
  } else {
    avisos.push(`No se pactó periodo de prueba. Si lo quieren, debe constar por escrito en el contrato; el máximo aquí es de ${tope.dias} días.`);
  }

  c('Jornada de trabajo',
    `La jornada máxima legal es de ${jornada.horasSemana} horas a la semana (${jornada.norma}), distribuidas de común acuerdo `
    + `entre las partes${d.horario ? ` así: ${d.horario}` : ''}. El día de descanso obligatorio remunerado será el ${nombreDiaDescanso}.`,
    `El trabajo diurno es el comprendido entre las ${franja.inicioDiurna}:00 y las ${franja.finDiurna}:00, y el nocturno entre `
    + `las ${franja.finDiurna}:00 y las ${franja.inicioDiurna}:00 (${franja.norma}).`,
    'El trabajo suplementario requiere autorización previa de EL EMPLEADOR y no podrá exceder de dos horas diarias ni doce semanales '
    + '(CST artículo 167).');

  c('Salario', ...parrafosSalario({ contrato, modalidad, salarioMes, fecha, salarioEspecie: d.salarioEspecie, avisos }));

  c('Recargos y trabajo suplementario',
    `El trabajo nocturno se remunera con un recargo del ${Math.round(ley.RECARGOS.nocturno * 100)} %; la hora extra diurna con el `
    + `${Math.round(ley.RECARGOS.extraDiurna * 100)} % y la nocturna con el ${Math.round(ley.RECARGOS.extraNocturna * 100)} % `
    + `sobre el valor de la hora ordinaria (CST artículo 168).`,
    `El trabajo en día de descanso obligatorio o festivo se remunera con un recargo del ${Math.round(recargoDom.factor * 100)} % `
    + `sobre el salario ordinario en proporción a las horas laboradas (${recargoDom.norma}). Si el trabajo en esos días es ocasional, `
    + 'EL TRABAJADOR podrá escoger entre el recargo en dinero o un día compensatorio de descanso; si es habitual, tendrá derecho al '
    + 'descanso compensatorio remunerado además del recargo (CST artículos 179 a 181).');

  if (!contrato.salarioIntegral) {
    c('Prestaciones sociales',
      'EL EMPLEADOR reconocerá y pagará las prestaciones sociales de ley: prima de servicios equivalente a treinta (30) días de '
      + 'salario por año, pagadera en dos cuotas (CST artículo 306); cesantías equivalentes a un mes de salario por año de servicio, '
      + 'que se consignarán en el fondo elegido por EL TRABAJADOR a más tardar el 14 de febrero del año siguiente (CST artículo 249 y '
      + 'Ley 50 de 1990); intereses sobre las cesantías del 12 % anual, pagaderos a más tardar el 31 de enero (Ley 52 de 1975); y '
      + 'vacaciones de quince (15) días hábiles consecutivos por cada año de servicio (CST artículo 186).');
  } else {
    c('Salario integral',
      'Las partes acuerdan que la remuneración pactada es SALARIO INTEGRAL en los términos del artículo 132 del Código Sustantivo del '
      + 'Trabajo: además de retribuir el trabajo ordinario, compensa de antemano el valor de prestaciones, recargos y beneficios '
      + 'legales y extralegales, con excepción de las vacaciones, que se seguirán disfrutando y pagando. Los aportes a seguridad '
      + 'social se liquidan sobre el 70 % de este salario.');
  }

  if (ley.tieneAuxilioTransporte(salarioMes, fecha) && contrato.auxilioTransporte !== false && !contrato.salarioIntegral) {
    c('Auxilio de transporte',
      `Como EL TRABAJADOR devenga hasta dos salarios mínimos, EL EMPLEADOR le pagará el auxilio de transporte legal, que para el año `
      + `${partes(fecha).anio} es de ${pesos(ley.auxilioTransporte(fecha))} mensuales (Ley 15 de 1959 y decreto anual). `
      + 'Este auxilio no constituye salario, pero se incluye en la base de la prima y de las cesantías.');
  }

  c('Seguridad social y aportes',
    'EL EMPLEADOR afiliará a EL TRABAJADOR al Sistema de Seguridad Social Integral: salud, pensiones y riesgos laborales, y a la '
    + `caja de compensación familiar. EL TRABAJADOR autoriza el descuento de su parte de los aportes (4 % en salud y 4 % en pensión) `
    + 'y de los demás que ordene la ley (Ley 100 de 1993).'
    + (contrato.claseArl ? ` La actividad contratada está clasificada en la clase de riesgo ${contrato.claseArl} para efectos de la ARL.` : ''));

  c('Obligaciones del trabajador',
    'Además de las obligaciones generales del artículo 58 del Código Sustantivo del Trabajo, EL TRABAJADOR se obliga a: cumplir el '
    + 'horario y las funciones asignadas; guardar reserva sobre la información de la empresa; cuidar los elementos de trabajo que se '
    + 'le entreguen; observar el reglamento interno de trabajo y las normas de seguridad y salud en el trabajo; y abstenerse de las '
    + 'conductas prohibidas en el artículo 60 del mismo Código.');

  c('Terminación del contrato',
    'El contrato termina por las causas señaladas en el artículo 61 del Código Sustantivo del Trabajo. Son justas causas de '
    + 'terminación por parte de EL EMPLEADOR y de EL TRABAJADOR las enumeradas en los artículos 62 y 63, cuyo texto declaran conocer '
    + 'las partes.',
    'Si EL EMPLEADOR termina el contrato sin justa causa, pagará la indemnización del artículo 64 del Código Sustantivo del Trabajo. '
    + 'A la terminación, EL EMPLEADOR pagará los salarios y prestaciones pendientes; el retardo injustificado da lugar a la '
    + 'indemnización moratoria del artículo 65 del mismo Código.');

  c('Reglamento interno y seguridad y salud en el trabajo',
    'EL TRABAJADOR declara conocer y se obliga a cumplir el reglamento interno de trabajo, el reglamento de higiene y seguridad '
    + 'industrial y el Sistema de Gestión de la Seguridad y Salud en el Trabajo (Decreto 1072 de 2015), así como a asistir a los '
    + 'exámenes médicos ocupacionales de ingreso, periódicos y de retiro (Resolución 2346 de 2007).');

  c('Prevención del acoso laboral',
    'Las partes se obligan a cumplir la Ley 1010 de 2006 sobre prevención y sanción del acoso laboral, y EL TRABAJADOR podrá acudir '
    + 'al comité de convivencia laboral de la empresa.');

  c('Confidencialidad y propiedad intelectual',
    'EL TRABAJADOR guardará absoluta reserva sobre la información, bases de datos, clientes, precios, procesos y demás datos de la '
    + 'empresa a los que acceda con ocasión de su trabajo, obligación que subsiste después de terminado el contrato.',
    'Las obras, invenciones y desarrollos que EL TRABAJADOR realice en cumplimiento de sus funciones o por encargo de EL EMPLEADOR '
    + 'pertenecen a este último, sin perjuicio de los derechos morales de autor, que son irrenunciables (Ley 23 de 1982 y artículo 28 '
    + 'de la Ley 1450 de 2011).');

  c('Tratamiento de datos personales',
    'EL TRABAJADOR autoriza a EL EMPLEADOR para recolectar, almacenar y usar sus datos personales con fines laborales, de seguridad '
    + 'social y de cumplimiento de obligaciones legales, conforme a la Ley 1581 de 2012 y a la política de tratamiento de datos de la '
    + 'empresa, y podrá ejercer sus derechos de conocer, actualizar, rectificar y suprimir sus datos.');

  if (d.pagosNoSalariales) {
    c('Pagos que no constituyen salario',
      `Las partes acuerdan expresamente que los siguientes pagos no constituyen salario, en los términos de los artículos 128 y 15 `
      + `del Código Sustantivo del Trabajo: ${puntoFinal(d.pagosNoSalariales)} `
      + 'Estos pagos no podrán exceder del 40 % del total de la remuneración; el exceso se incluirá en la base de cotización a '
      + 'seguridad social (Ley 1393 de 2010, artículo 30).');
  }

  c('Modificaciones',
    'Toda modificación a este contrato constará por escrito en un otrosí firmado por las partes y hará parte integrante del mismo. '
    + 'Este contrato reemplaza cualquier acuerdo verbal o escrito anterior sobre la misma materia.');

  c('Domicilio y ley aplicable',
    `Para todos los efectos, las partes fijan como domicilio contractual la ciudad de ${d.ciudadContrato || '[ciudad]'} y se someten `
    + 'a la legislación laboral colombiana.');

  const firmas = {
    lugar: d.ciudadContrato || '[ciudad]',
    fecha: d.fechaFirma,
    texto: `Para constancia se firma en dos ejemplares del mismo tenor, uno para cada parte, en ${d.ciudadContrato || '[ciudad]'}, `
      + `el ${formatoLargo(d.fechaFirma)}.`,
    empleador: {
      titulo: 'EL EMPLEADOR',
      nombre: d.representante || empresa.nombre || '',
      documento: d.documentoRepresentante ? `C.C. ${d.documentoRepresentante}` : (empresa.nit ? `NIT ${empresa.nit}` : ''),
      detalle: d.representante && empresa.nombre ? `Representante legal de ${empresa.nombre}` : '',
    },
    trabajador: {
      titulo: 'EL TRABAJADOR',
      nombre: empleado.nombre || '',
      documento: empleado.documento ? `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento}` : '',
      detalle: '',
    },
    testigos: d.testigos,
  };

  return {
    titulo: tituloContrato(dur),
    encabezado,
    clausulas,
    firmas,
    avisos,
    requisitos: ley.REQUISITOS_CONTRATO,
    periodoPruebaMaximo: tope,
  };
}

function duracionDesdeContrato(contrato) {
  if (contrato.tipo === 'obra') return 'obra';
  if (contrato.tipo === 'aprendizaje') return 'aprendizaje';
  if (contrato.tipo === 'fijo') {
    if (!contrato.fin) return 'meses';
    const dias = diasCalendario(contrato.inicio, contrato.fin);
    if (dias < 31) return 'dias';
    return dias >= 365 ? 'anio' : 'meses';
  }
  return 'indefinido';
}

function tituloContrato(dur) {
  if (dur.id === 'indefinido') return 'CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO INDEFINIDO';
  if (dur.id === 'obra') return 'CONTRATO INDIVIDUAL DE TRABAJO POR DURACIÓN DE LA OBRA O LABOR CONTRATADA';
  if (dur.id === 'aprendizaje') return 'CONTRATO DE APRENDIZAJE';
  return 'CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO';
}

function textoDuracion({ dur, inicio, fin, descripcionObra }) {
  if (dur.id === 'indefinido') return 'Indefinida';
  if (dur.id === 'obra') return descripcionObra ? `Lo que dure: ${descripcionObra}` : '—';
  if (!fin) return '—';
  const dias = diasCalendario(inicio, fin) + 1;
  return `Del ${formatoLargo(inicio)} al ${formatoLargo(fin)} (${dias} días)`;
}

function parrafosDuracion({ dur, inicio, fin, descripcionObra, avisos }) {
  if (dur.id === 'indefinido') {
    return [
      `Este contrato es a término indefinido y empieza el ${formatoLargo(inicio)}. Tendrá vigencia mientras subsistan las causas que `
      + 'le dieron origen y la materia del trabajo (CST artículo 47).',
      'Cualquiera de las partes podrá darlo por terminado en cualquier momento, con las consecuencias que la ley señala para la '
      + 'terminación con o sin justa causa.',
    ];
  }
  if (dur.id === 'obra') {
    if (!descripcionObra) avisos.push('Falta describir la obra o labor contratada: sin esa descripción el contrato se entiende a término indefinido.');
    return [
      `Este contrato se celebra por el tiempo que dure la realización de la siguiente obra o labor determinada: `
      + `${puntoFinal(descripcionObra || '[describir la obra con precisión]')} Empieza el ${formatoLargo(inicio)} y termina cuando la obra concluya, `
      + 'lo que las partes reconocen como justa causa de terminación (CST artículo 45 y 61).',
      'Si EL EMPLEADOR termina el contrato antes de que la obra concluya y sin justa causa, deberá pagar los salarios correspondientes '
      + 'al tiempo que falte para terminarla, sin que la indemnización sea inferior a quince (15) días (CST artículo 64).',
    ];
  }
  if (dur.id === 'aprendizaje') {
    return [
      `Este contrato de aprendizaje va del ${formatoLargo(inicio)} al ${fin ? formatoLargo(fin) : '[fecha]'}. Es un contrato laboral `
      + 'especial a término fijo, regido por las normas sustantivas del Código Sustantivo del Trabajo (Ley 2466 de 2025).',
      'Las partes verificarán la reglamentación vigente sobre etapa lectiva y práctica, apoyo de sostenimiento y afiliación a '
      + 'seguridad social.',
    ];
  }

  const dias = fin ? diasCalendario(inicio, fin) + 1 : 0;
  if (!fin) avisos.push('Falta la fecha de terminación: un contrato a término fijo sin plazo escrito se entiende indefinido.');
  if (dias > 4 * 365 + 1) avisos.push('El plazo pactado supera los 4 años, que es el máximo del contrato a término fijo (CST artículo 46, modificado por la Ley 2466 de 2025).');

  const parrafos = [
    `Este contrato se celebra a término fijo, del ${formatoLargo(inicio)} al ${fin ? formatoLargo(fin) : '[fecha]'}`
    + `${dias ? ` (${dias} días)` : ''}. En ningún caso podrá superar los cuatro (4) años (CST artículo 46, modificado por la `
    + 'Ley 2466 de 2025).',
    'Si antes de la fecha de vencimiento ninguna de las partes avisa por escrito a la otra, con una antelación no inferior a treinta '
    + '(30) días, su determinación de no prorrogarlo, el contrato se entenderá renovado por un periodo igual al inicialmente pactado, '
    + 'y así sucesivamente.',
  ];
  if (dias && dias < 365) {
    parrafos.push('Por ser inferior a un año, el contrato podrá prorrogarse las veces que las partes acuerden; después de la cuarta '
      + 'prórroga no podrá renovarse por un periodo inferior a un (1) año (CST artículo 46).');
  }
  parrafos.push('Si EL EMPLEADOR lo termina antes del vencimiento y sin justa causa, pagará los salarios correspondientes al tiempo '
    + 'que falte para cumplir el plazo (CST artículo 64).');
  return parrafos;
}

function textoRemuneracion({ contrato, modalidad, salarioMes, fecha }) {
  if (modalidad === 'jornal') {
    return `${pesos(contrato.valorDia)} por día trabajado`;
  }
  if (modalidad === 'horas') {
    return `${pesos(contrato.valorHora)} por hora trabajada`;
  }
  return `${pesos(salarioMes)} mensuales${contrato.salarioIntegral ? ' (salario integral)' : ''}`;
}

function textoPeriodoPago(modalidad) {
  if (modalidad === 'jornal') return 'Por días trabajados, en los periodos acordados';
  if (modalidad === 'horas') return 'Por horas trabajadas, en los periodos acordados';
  return 'Mensual o quincenal, según lo acordado';
}

function parrafosSalario({ contrato, modalidad, salarioMes, fecha, salarioEspecie, avisos }) {
  const minimo = ley.smmlv(fecha);
  const parrafos = [];

  if (modalidad === 'jornal') {
    const dia = Number(contrato.valorDia) || 0;
    if (dia < minimo / 30) avisos.push(`El valor del día (${pesos(dia)}) es inferior al mínimo legal diario (${pesos(minimo / 30)}).`);
    parrafos.push(
      `EL EMPLEADOR pagará a EL TRABAJADOR la suma de ${pesos(dia)} (${enLetras(dia)}) por cada día efectivamente trabajado, `
      + 'que remunera la jornada ordinaria de ese día.',
      'Además del jornal, EL EMPLEADOR reconocerá el descanso dominical y los festivos remunerados cuando EL TRABAJADOR haya laborado '
      + 'todos los días laborables de la semana respectiva (CST artículos 173, 176 y 177), así como los recargos y el trabajo '
      + 'suplementario a que haya lugar.',
    );
  } else if (modalidad === 'horas') {
    const hora = Number(contrato.valorHora) || 0;
    parrafos.push(
      `EL EMPLEADOR pagará a EL TRABAJADOR la suma de ${pesos(hora)} (${enLetras(hora)}) por cada hora ordinaria efectivamente `
      + 'trabajada, más los recargos y el trabajo suplementario a que haya lugar.',
      'En ningún caso la remuneración será inferior al mínimo legal en proporción a la jornada pactada.',
    );
  } else {
    if (salarioMes < minimo && !contrato.salarioIntegral) {
      avisos.push(`El salario pactado (${pesos(salarioMes)}) es inferior al mínimo legal mensual (${pesos(minimo)}). Solo es válido si la jornada es parcial y la remuneración es proporcional.`);
    }
    if (contrato.salarioIntegral && salarioMes < ley.minimoIntegral(fecha)) {
      avisos.push(`El salario integral no puede ser inferior a 13 salarios mínimos (${pesos(ley.minimoIntegral(fecha))}).`);
    }
    parrafos.push(
      `EL EMPLEADOR pagará a EL TRABAJADOR un salario de ${pesos(salarioMes)} (${enLetras(salarioMes)}) mensuales, `
      + `${contrato.salarioIntegral ? 'como salario integral, ' : ''}pagaderos por mensualidades o quincenas vencidas en el lugar de trabajo.`,
    );
  }

  if (Number(salarioEspecie) > 0) {
    parrafos.push(
      `Las partes estiman en ${pesos(salarioEspecie)} mensuales el valor del salario en especie, el cual en ningún caso podrá `
      + 'exceder del 50 % del total del salario, ni del 30 % cuando EL TRABAJADOR devengue el salario mínimo (CST artículo 129).',
    );
  }

  parrafos.push('El salario remunera el trabajo ordinario de la jornada pactada. Los descuentos distintos de los autorizados por la '
    + 'ley requieren autorización escrita de EL TRABAJADOR (CST artículos 149 a 152).');

  return parrafos;
}

export { enLetras };
