/**
 * documentos.js — Las cartas y constancias del ciclo del empleado.
 *
 * Todas siguen la misma forma: ciudad y fecha, destinatario, cuerpo y firmas.
 * Cada una cita la norma que la sustenta y avisa cuando algo del caso no
 * cuadra con la ley (un preaviso tardío, un descuento que deja al trabajador
 * por debajo del mínimo, una terminación sin motivos expresados).
 */

import { formatoLargo, diasCalendario, sumarDias, dias360, hoy } from './fechas.js';
import * as calc from './calculo.js';
import * as ley from './normativa.js';

const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

export const CATALOGO = [
  { id: 'otrosi', nombre: 'Otrosí al contrato', grupo: 'Durante el contrato', norma: 'CST art. 23 y 43' },
  { id: 'preaviso', nombre: 'Preaviso de no prórroga', grupo: 'Terminación', norma: 'CST art. 46' },
  { id: 'llamado', nombre: 'Llamado de atención', grupo: 'Disciplina', norma: 'CST art. 115' },
  { id: 'descargos', nombre: 'Citación a descargos', grupo: 'Disciplina', norma: 'CST art. 115 y debido proceso' },
  { id: 'terminacion-justa', nombre: 'Terminación con justa causa', grupo: 'Terminación', norma: 'CST art. 62 y 66' },
  { id: 'terminacion-sin-justa', nombre: 'Terminación sin justa causa', grupo: 'Terminación', norma: 'CST art. 64' },
  { id: 'acepta-renuncia', nombre: 'Aceptación de renuncia', grupo: 'Terminación', norma: 'CST art. 61' },
  { id: 'autorizacion-descuento', nombre: 'Autorización de descuento', grupo: 'Durante el contrato', norma: 'CST art. 149' },
  { id: 'autorizacion-datos', nombre: 'Autorización de tratamiento de datos', grupo: 'Ingreso', norma: 'Ley 1581 de 2012' },
  { id: 'dotacion', nombre: 'Entrega de dotación', grupo: 'Durante el contrato', norma: 'CST art. 230 a 233' },
  { id: 'entrega-documentos', nombre: 'Constancia de entrega de documentos', grupo: 'Ingreso', norma: 'CST art. 120 y Ley 2191 de 2022' },
  { id: 'certificado-laboral', nombre: 'Certificado laboral', grupo: 'Certificados', norma: 'CST art. 57 num. 7' },
  { id: 'certificado-220', nombre: 'Certificado de ingresos y retenciones', grupo: 'Certificados', norma: 'E.T. art. 378 y 379' },
  { id: 'paz-salvo', nombre: 'Paz y salvo', grupo: 'Terminación', norma: '' },
];

export function tipoDocumento(id) {
  return CATALOGO.find((d) => d.id === id) || CATALOGO[0];
}

/**
 * @returns {{titulo, encabezado, cuerpo, cierre, firmas, avisos, norma}}
 */
export function generarDocumento({ tipo, empresa = {}, empleado = {}, contrato = {}, datos = {}, historial = {} }) {
  const d = {
    ciudad: empresa.ciudad || '',
    fecha: hoy(),
    representante: empresa.representante || '',
    documentoRepresentante: empresa.documentoRepresentante || '',
    cargoRepresentante: 'Representante legal',
    ...datos,
  };
  const avisos = [];
  const info = tipoDocumento(tipo);
  const salarioMes = calc.salarioMensualEquivalente(contrato, d.fecha);

  const armar = (titulo, cuerpo, opciones = {}) => ({
    titulo,
    norma: info.norma,
    encabezado: [
      `${d.ciudad || '[ciudad]'}, ${formatoLargo(d.fecha)}`,
      '',
      'Señor(a)',
      (empleado.nombre || '[trabajador]').toUpperCase(),
      empleado.documento ? `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento}` : '',
      empleado.cargo ? `${empleado.cargo}` : '',
      empleado.direccion || '',
    ].filter((l) => l !== ''),
    asunto: opciones.asunto || titulo,
    cuerpo: cuerpo.filter(Boolean),
    cierre: opciones.cierre || 'Atentamente,',
    firmas: opciones.firmas || [
      {
        rol: 'EL EMPLEADOR',
        nombre: d.representante || empresa.nombre || '',
        documento: d.documentoRepresentante ? `C.C. ${d.documentoRepresentante}` : (empresa.nit ? `NIT ${empresa.nit}` : ''),
        detalle: d.representante && empresa.nombre ? `${d.cargoRepresentante} de ${empresa.nombre}` : '',
      },
      ...(opciones.firmaTrabajador === false ? [] : [{
        rol: opciones.rolTrabajador || 'RECIBIDO — EL TRABAJADOR',
        nombre: empleado.nombre || '',
        documento: empleado.documento ? `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento}` : '',
        detalle: opciones.detalleTrabajador || 'Recibí copia de este documento',
      }]),
    ],
    avisos,
    meta: opciones.meta || [],
  });

  switch (tipo) {
    // ——— Durante el contrato ———
    case 'otrosi': {
      const cambios = (d.cambios || []).filter((c) => c && c.concepto);
      if (!cambios.length) avisos.push('No se registró ningún cambio: un otrosí sin cambios no dice nada.');
      if (d.desmejora) {
        avisos.push('Ojo: el empleador no puede desmejorar unilateralmente las condiciones del trabajador. '
          + 'Un cambio desfavorable necesita el acuerdo libre del trabajador y no puede vulnerar derechos ciertos e indiscutibles (CST art. 14 y 43).');
      }
      return armar('OTROSÍ AL CONTRATO INDIVIDUAL DE TRABAJO', [
        `Entre ${empresa.nombre || '[empleador]'}${empresa.nit ? `, NIT ${empresa.nit}` : ''}, representada por `
        + `${d.representante || '[representante]'}, y ${empleado.nombre || '[trabajador]'}, `
        + `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento || '[documento]'}, vinculados por contrato de trabajo `
        + `vigente desde el ${formatoLargo(contrato.inicio || d.fecha)}, se acuerda modificarlo así:`,
        ...cambios.map((c, i) => `${i + 1}. ${c.concepto}: pasa de ${c.antes || '[antes]'} a ${c.despues || '[después]'}`
          + `${c.desde ? `, a partir del ${formatoLargo(c.desde)}` : ''}.`),
        'Las demás cláusulas del contrato continúan vigentes y sin modificación. Este otrosí hace parte integrante del '
        + 'contrato de trabajo y se firma por las partes en dos ejemplares del mismo tenor.',
      ], {
        cierre: 'En señal de acuerdo firman las partes,',
        rolTrabajador: 'EL TRABAJADOR',
        detalleTrabajador: 'Acepto los cambios aquí acordados',
      });
    }

    case 'autorizacion-descuento': {
      const valor = Number(d.valor) || 0;
      const cuotas = Number(d.cuotas) || 1;
      const cuota = cuotas > 0 ? valor / cuotas : valor;
      const minimo = ley.smmlv(d.fecha);
      if (salarioMes - cuota < minimo && !d.esAlimentos && !d.esCooperativa) {
        avisos.push(`La cuota de ${pesos(cuota)} dejaría el salario por debajo del mínimo legal (${pesos(minimo)}). `
          + 'Salvo cuota alimentaria o cooperativas autorizadas, del salario mínimo no se puede descontar (CST art. 149 a 156).');
      }
      return armar('AUTORIZACIÓN DE DESCUENTO DE NÓMINA', [
        `Yo, ${empleado.nombre || '[trabajador]'}, identificado(a) con ${empleado.tipoDocumento || 'C.C.'} `
        + `${empleado.documento || '[documento]'}, en mi calidad de trabajador(a) de ${empresa.nombre || '[empleador]'}, `
        + 'autorizo de manera libre, expresa y voluntaria que se descuente de mi salario lo siguiente:',
        `Concepto: ${d.concepto || '[concepto]'}.`,
        `Valor total: ${pesos(valor)}${cuotas > 1 ? `, en ${cuotas} cuotas de ${pesos(cuota)} cada una` : ''}.`,
        d.desde ? `A partir del pago correspondiente a ${formatoLargo(d.desde)}.` : '',
        'Entiendo que esta autorización es revocable por escrito, que el descuento no puede afectar el salario mínimo legal '
        + 'ni los derechos irrenunciables, y que si el contrato termina antes de completar el pago, autorizo que el saldo se '
        + 'descuente de mi liquidación final, dentro de los límites de los artículos 149 a 156 del Código Sustantivo del Trabajo.',
      ], {
        cierre: 'En constancia firmo,',
        firmas: [{
          rol: 'EL TRABAJADOR',
          nombre: empleado.nombre || '',
          documento: empleado.documento ? `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento}` : '',
          detalle: '',
        }],
      });
    }

    case 'autorizacion-datos':
      return armar('AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES', [
        `Yo, ${empleado.nombre || '[trabajador]'}, identificado(a) con ${empleado.tipoDocumento || 'C.C.'} `
        + `${empleado.documento || '[documento]'}, autorizo a ${empresa.nombre || '[empleador]'}`
        + `${empresa.nit ? `, NIT ${empresa.nit}` : ''}, para recolectar, almacenar, usar, circular y suprimir mis datos `
        + 'personales, conforme a la Ley 1581 de 2012 y al Decreto 1377 de 2013.',
        'Finalidades: la ejecución del contrato de trabajo, la liquidación y el pago de la nómina, las afiliaciones y aportes '
        + 'al sistema de seguridad social, el cumplimiento de obligaciones tributarias y laborales, la seguridad y salud en el '
        + 'trabajo, la expedición de certificaciones y la comunicación conmigo.',
        d.datosSensibles
          ? 'Autorizo además el tratamiento de los siguientes datos sensibles, cuya entrega es facultativa y para los que se me '
            + `informó que no estoy obligado(a) a autorizarlos: ${d.datosSensibles}. Entiendo la finalidad concreta de su uso y `
            + 'que se suprimirán cuando termine la relación laboral y cese la obligación legal de conservarlos.'
          : '',
        'Conozco que tengo derecho a conocer, actualizar y rectificar mis datos, a solicitar prueba de esta autorización, a ser '
        + 'informado sobre su uso, a presentar quejas ante la Superintendencia de Industria y Comercio y a revocar la '
        + 'autorización o solicitar la supresión cuando no proceda un deber legal de conservarlos.',
        `Para ejercer estos derechos puedo dirigirme a ${d.contacto || empresa.nombre || '[canal de contacto]'}.`,
      ], {
        cierre: 'En constancia firmo,',
        firmas: [{
          rol: 'EL TITULAR DE LOS DATOS',
          nombre: empleado.nombre || '',
          documento: empleado.documento ? `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento}` : '',
          detalle: '',
        }],
      });

    case 'dotacion': {
      const derecho = salarioMes <= 2 * ley.smmlv(d.fecha);
      if (!derecho) avisos.push(`El trabajador gana más de dos salarios mínimos (${pesos(2 * ley.smmlv(d.fecha))}): la dotación legal no le aplica, aunque la empresa puede entregarla igual.`);
      const meses = contrato.inicio ? dias360(contrato.inicio, d.fecha) / 30 : 0;
      if (contrato.inicio && meses <= 3) avisos.push('Todavía no cumple más de 3 meses de servicio, que es cuando nace el derecho a la dotación (CST art. 232).');
      return armar('ENTREGA DE CALZADO Y VESTIDO DE LABOR (DOTACIÓN)', [
        `Hago constar que en la fecha recibí de ${empresa.nombre || '[empleador]'} la dotación correspondiente a la entrega `
        + `de ${d.entrega || '[abril / agosto / diciembre]'}, así:`,
        ...(d.elementos || []).filter(Boolean).map((e, i) => `${i + 1}. ${e}`),
        'Me comprometo a usar la dotación en las labores contratadas. Su no uso sin motivo válido exime al empleador de '
        + 'entregar la siguiente (CST art. 233). La dotación no constituye salario y no puede compensarse en dinero.',
      ], {
        cierre: 'En constancia firmo,',
        rolTrabajador: 'EL TRABAJADOR',
        detalleTrabajador: 'Recibí la dotación descrita',
      });
    }

    case 'entrega-documentos':
      return armar('CONSTANCIA DE ENTREGA DE DOCUMENTOS AL INGRESO', [
        'Hago constar que recibí de la empresa, y que me fueron explicados, los siguientes documentos:',
        ...(d.documentos && d.documentos.length ? d.documentos : [
          'Copia del contrato individual de trabajo firmado.',
          'Reglamento interno de trabajo (CST art. 120).',
          'Reglamento de higiene y seguridad industrial (CST art. 349).',
          'Política de prevención del acoso laboral (Ley 1010 de 2006).',
          'Política de desconexión laboral (Ley 2191 de 2022).',
          'Política de tratamiento de datos personales (Ley 1581 de 2012).',
          'Información sobre el Sistema de Gestión de Seguridad y Salud en el Trabajo y mi inducción.',
        ]).map((x, i) => `${i + 1}. ${x}`),
        'Me comprometo a cumplirlos y a consultarlos cuando lo requiera.',
      ], { cierre: 'En constancia firmo,', rolTrabajador: 'EL TRABAJADOR', detalleTrabajador: 'Recibí y me fueron explicados' });

    // ——— Disciplina ———
    case 'llamado':
      return armar('LLAMADO DE ATENCIÓN', [
        `Por medio de la presente le hago un llamado de atención por los siguientes hechos, ocurridos el `
        + `${d.fechaHechos ? formatoLargo(d.fechaHechos) : '[fecha]'}:`,
        d.hechos || '[describir los hechos de manera concreta: qué pasó, cuándo y dónde]',
        `Esta conducta incumple ${d.norma || 'sus obligaciones como trabajador (CST art. 58) y el reglamento interno de trabajo'}.`,
        'Le solicito ajustar su comportamiento. Este llamado queda en su hoja de vida y la reiteración de la conducta podrá dar '
        + 'lugar a las sanciones previstas en el reglamento interno, previo el procedimiento disciplinario correspondiente.',
        'Si tiene observaciones, puede presentarlas por escrito.',
      ], { asunto: 'Llamado de atención escrito' });

    case 'descargos': {
      const fechaDiligencia = d.fechaDiligencia || sumarDias(d.fecha, 3);
      if (diasCalendario(d.fecha, fechaDiligencia) < 2) {
        avisos.push('Entre la citación y la diligencia debe haber un tiempo razonable para que el trabajador prepare su defensa. Dos o tres días hábiles es lo usual.');
      }
      return armar('CITACIÓN A DILIGENCIA DE DESCARGOS', [
        'Le informo que la empresa adelanta un procedimiento disciplinario por los siguientes hechos:',
        d.hechos || '[describir los hechos de manera concreta: qué pasó, cuándo, dónde y qué norma o cláusula se habría incumplido]',
        `Por lo anterior, se le cita a diligencia de descargos el ${formatoLargo(fechaDiligencia)} a las `
        + `${d.hora || '[hora]'}, en ${d.lugar || '[lugar]'}.`,
        'En la diligencia usted podrá dar su versión de los hechos, presentar y solicitar las pruebas que considere, y hacerse '
        + 'acompañar por dos compañeros de trabajo o por un representante del sindicato, si lo hubiere. De la diligencia se '
        + 'levantará un acta que firmarán los asistentes.',
        'Esta citación no implica una decisión tomada: su finalidad es garantizarle el derecho de defensa antes de que la '
        + 'empresa adopte cualquier determinación.',
      ], { asunto: 'Citación a diligencia de descargos' });
    }

    // ——— Terminación ———
    case 'preaviso': {
      const vence = contrato.fin || d.vencimiento || '';
      const dias = vence ? diasCalendario(d.fecha, vence) : null;
      if (vence && dias !== null && dias < 30) {
        avisos.push(`Faltan ${dias} días para el vencimiento: el preaviso debe darse con no menos de 30 días de anticipación. `
          + 'Si se envía tarde, el contrato se entiende prorrogado por un periodo igual al pactado (CST art. 46).');
      }
      if (!vence) avisos.push('Falta la fecha de vencimiento del contrato.');
      return armar('PREAVISO DE NO PRÓRROGA DEL CONTRATO A TÉRMINO FIJO', [
        `De manera atenta le informo que ${empresa.nombre || 'la empresa'} ha decidido no prorrogar el contrato individual de `
        + `trabajo a término fijo que celebramos${contrato.inicio ? ` el ${formatoLargo(contrato.inicio)}` : ''}, el cual `
        + `vence el ${vence ? formatoLargo(vence) : '[fecha de vencimiento]'}.`,
        'En consecuencia, el contrato terminará en esa fecha por vencimiento del plazo pactado, causa legal de terminación '
        + 'prevista en el artículo 61 del Código Sustantivo del Trabajo.',
        (dias === null || dias >= 30
          ? 'Esta comunicación se le entrega con una antelación no inferior a treinta (30) días, como lo exige el artículo 46 del '
            + 'mismo Código.'
          : 'El artículo 46 del mismo Código exige que este aviso se dé con una antelación no inferior a treinta (30) días.')
        + ' En la fecha de terminación se le pagará la liquidación de las prestaciones sociales y demás acreencias laborales a '
        + 'que tenga derecho.',
        'Agradezco los servicios prestados.',
      ], { asunto: 'Preaviso de no prórroga', detalleTrabajador: 'Recibí el preaviso en la fecha indicada' });
    }

    case 'terminacion-justa': {
      if (!d.hechos) avisos.push('Hay que expresar los motivos concretos: después no se pueden alegar causales distintas (CST art. 62, parágrafo).');
      if (!d.huboDescargos) avisos.push('Antes de despedir con justa causa hay que oír al trabajador en descargos. Sin ese paso, el despido suele declararse injusto.');
      return armar('TERMINACIÓN DEL CONTRATO DE TRABAJO CON JUSTA CAUSA', [
        `Le comunico que ${empresa.nombre || 'la empresa'} da por terminado su contrato individual de trabajo a partir del `
        + `${formatoLargo(d.fechaTerminacion || d.fecha)}, con justa causa.`,
        'Los hechos que motivan esta decisión son:',
        d.hechos || '[describir los hechos concretos, con fechas]',
        `Estos hechos configuran la causal ${d.causal || '[numeral]'} del artículo 62 del Código Sustantivo del Trabajo`
        + `${d.clausula ? ` y ${d.clausula}` : ''}.`,
        d.huboDescargos
          ? `Usted fue escuchado en diligencia de descargos el ${d.fechaDescargos ? formatoLargo(d.fechaDescargos) : '[fecha]'}, `
            + 'y sus explicaciones fueron valoradas antes de tomar esta decisión.'
          : '',
        'Se le liquidarán y pagarán los salarios y prestaciones sociales causados hasta la fecha de terminación. La empresa '
        + 'reportará la novedad de retiro ante las entidades de seguridad social.',
      ], { asunto: 'Terminación del contrato con justa causa', detalleTrabajador: 'Recibí esta comunicación' });
    }

    case 'terminacion-sin-justa': {
      const dias = contrato.inicio ? dias360(contrato.inicio, d.fechaTerminacion || d.fecha) : 0;
      return armar('TERMINACIÓN UNILATERAL DEL CONTRATO DE TRABAJO', [
        `Le comunico que ${empresa.nombre || 'la empresa'} da por terminado su contrato individual de trabajo a partir del `
        + `${formatoLargo(d.fechaTerminacion || d.fecha)}, por decisión unilateral y sin justa causa.`,
        `En consecuencia, además de la liquidación de salarios y prestaciones sociales causados${dias ? ` por ${dias} días de servicio` : ''}, `
        + 'se le pagará la indemnización prevista en el artículo 64 del Código Sustantivo del Trabajo.',
        d.valorIndemnizacion
          ? `El valor de la indemnización asciende a ${pesos(d.valorIndemnizacion)}, según la liquidación que se le entrega con esta comunicación.`
          : '',
        'El pago se hará en la fecha de terminación. La empresa reportará la novedad de retiro ante las entidades de seguridad social.',
        'Agradezco los servicios prestados.',
      ], { asunto: 'Terminación sin justa causa', detalleTrabajador: 'Recibí esta comunicación' });
    }

    case 'acepta-renuncia':
      return armar('ACEPTACIÓN DE RENUNCIA', [
        `Acuso recibo de su carta de renuncia${d.fechaRenuncia ? ` del ${formatoLargo(d.fechaRenuncia)}` : ''}, mediante la cual `
        + 'manifiesta su decisión voluntaria de dar por terminado el contrato de trabajo.',
        `La empresa acepta su renuncia, la cual se hará efectiva el ${formatoLargo(d.fechaTerminacion || d.fecha)}.`,
        'En esa fecha se le liquidarán y pagarán los salarios y prestaciones sociales causados hasta el último día laborado. '
        + 'Le solicito hacer entrega de los elementos de trabajo a su cargo.',
        'Le deseo éxitos en sus nuevos proyectos.',
      ], { asunto: 'Aceptación de renuncia', detalleTrabajador: 'Recibí esta comunicación' });

    case 'paz-salvo':
      return armar('PAZ Y SALVO', [
        `${empresa.nombre || '[empleador]'} hace constar que ${empleado.nombre || '[trabajador]'}, `
        + `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento || '[documento]'}, quien se desempeñó como `
        + `${empleado.cargo || '[cargo]'} entre el ${formatoLargo(contrato.inicio || d.fecha)} y el `
        + `${formatoLargo(d.fechaTerminacion || d.fecha)}, hizo entrega de los elementos a su cargo y se encuentra a paz y salvo `
        + 'con la empresa por todo concepto.',
        d.observaciones || '',
        'Se expide a solicitud del interesado.',
      ], { asunto: 'Paz y salvo', firmaTrabajador: false });

    // ——— Certificados ———
    case 'certificado-laboral': {
      const hasta = contrato.estado === 'terminado' ? (contrato.terminacion || d.fecha) : d.fecha;
      const cuerpo = [
        `${empresa.nombre || '[empleador]'}${empresa.nit ? `, NIT ${empresa.nit}` : ''}`,
        '',
        'HACE CONSTAR:',
        '',
        `Que ${empleado.nombre || '[trabajador]'}, identificado(a) con ${empleado.tipoDocumento || 'C.C.'} `
        + `${empleado.documento || '[documento]'}, ${contrato.estado === 'terminado' ? 'laboró' : 'labora'} en esta empresa `
        + `desde el ${formatoLargo(contrato.inicio || d.fecha)}`
        + `${contrato.estado === 'terminado' ? ` hasta el ${formatoLargo(hasta)}` : ''}, `
        + `desempeñando el cargo de ${empleado.cargo || '[cargo]'}, mediante contrato de trabajo a `
        + `${(ley.CONTRATOS.find((c) => c.id === (contrato.tipo || 'indefinido')) || {}).nombre || 'término indefinido'}.`,
      ];
      if (d.incluirSalario) {
        cuerpo.push(`Su remuneración ${contrato.estado === 'terminado' ? 'fue' : 'es'} de ${pesos(salarioMes)} mensuales.`);
      }
      if (d.incluirFunciones && empleado.funciones) cuerpo.push(`Funciones: ${empleado.funciones}`);
      cuerpo.push('', `Se expide a solicitud del interesado, en ${d.ciudad || '[ciudad]'}, el ${formatoLargo(d.fecha)}.`);
      return armar('CERTIFICADO LABORAL', cuerpo, {
        asunto: 'Certificado laboral',
        firmaTrabajador: false,
        cierre: '',
      });
    }

    case 'certificado-220': {
      const anio = Number(d.anio) || Number(d.fecha.slice(0, 4)) - 1;
      const v = d.valores || {};
      const limite = `${anio + 1}-03-31`;
      if (d.fecha > limite) {
        avisos.push(`El certificado del año gravable ${anio} debía expedirse a más tardar el último día hábil de marzo de ${anio + 1}. `
          + 'No expedirlo se sanciona (E.T. art. 667).');
      }
      return armar(`CERTIFICADO DE INGRESOS Y RETENCIONES — AÑO GRAVABLE ${anio}`, [
        `${empresa.nombre || '[empleador]'}${empresa.nit ? `, NIT ${empresa.nit}` : ''}, certifica los pagos efectuados a `
        + `${empleado.nombre || '[trabajador]'}, ${empleado.tipoDocumento || 'C.C.'} ${empleado.documento || '[documento]'}, `
        + `durante el año gravable ${anio}, así:`,
      ], {
        asunto: 'Certificado de ingresos y retenciones (formulario 220)',
        firmaTrabajador: false,
        meta: [
          ['Pagos por salarios', pesos(v.salarios)],
          ['Pagos por honorarios, servicios y comisiones', pesos(v.honorarios)],
          ['Cesantías e intereses efectivamente pagados', pesos(v.cesantias)],
          ['Pagos por otros conceptos (auxilios, bonificaciones)', pesos(v.otros)],
          ['Total de pagos del periodo', pesos((v.salarios || 0) + (v.honorarios || 0) + (v.cesantias || 0) + (v.otros || 0))],
          ['Aportes obligatorios a salud del trabajador', pesos(v.salud)],
          ['Aportes obligatorios a pensión del trabajador y FSP', pesos(v.pension)],
          ['Retención en la fuente practicada', pesos(v.retencion)],
        ],
      });
    }

    default:
      return armar(info.nombre.toUpperCase(), ['[documento sin plantilla]']);
  }
}

/** Texto plano del documento: es lo que se firma y sobre lo que se saca la huella. */
export function aTexto(doc) {
  const lineas = [...doc.encabezado, '', `Asunto: ${doc.asunto}`, '', ...doc.cuerpo];
  if (doc.meta && doc.meta.length) {
    lineas.push('');
    for (const [etiqueta, valor] of doc.meta) lineas.push(`${etiqueta}: ${valor}`);
  }
  if (doc.cierre) lineas.push('', doc.cierre);
  for (const f of doc.firmas) {
    lineas.push('', '', '______________________________', f.rol, f.nombre, f.documento, f.detalle);
  }
  return lineas.filter((l) => l !== undefined).join('\n');
}

export { pesos };
