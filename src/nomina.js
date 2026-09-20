/**
 * nomina.js — Liquidación de un periodo de pago (mes, quincena o semana).
 *
 * Toma el contrato y las novedades del periodo (días trabajados, turnos,
 * incapacidades, vacaciones, licencias) y arma el comprobante: devengados,
 * deducciones, neto y lo que le cuesta al empleador.
 */

import { dias360, rango, diaSemana, formatoCorto } from './fechas.js';
import { esFestivo, nombreFestivo, esDiaDeDescanso } from './festivos.js';
import * as calc from './calculo.js';
import * as seg from './seguridad.js';
import * as ret from './retencion.js';
import * as ley from './normativa.js';

export const TIPOS_DIA = [
  { id: 'trabajo', nombre: 'Día trabajado', remunerado: true, cotiza: true },
  { id: 'descanso', nombre: 'Descanso', remunerado: true, cotiza: true },
  { id: 'vacaciones', nombre: 'Vacaciones', remunerado: true, cotiza: true, concepto: 'vacaciones' },
  { id: 'incapacidad-comun', nombre: 'Incapacidad por enfermedad general', remunerado: true, cotiza: true, concepto: 'incapacidad' },
  { id: 'incapacidad-laboral', nombre: 'Incapacidad por accidente o enfermedad laboral', remunerado: true, cotiza: true, concepto: 'incapacidad' },
  { id: 'maternidad', nombre: 'Licencia de maternidad', remunerado: true, cotiza: true, concepto: 'licencia' },
  { id: 'paternidad', nombre: 'Licencia de paternidad', remunerado: true, cotiza: true, concepto: 'licencia' },
  { id: 'luto', nombre: 'Licencia por luto', remunerado: true, cotiza: true, concepto: 'licencia' },
  { id: 'licencia-remunerada', nombre: 'Licencia remunerada', remunerado: true, cotiza: true, concepto: 'licencia' },
  { id: 'licencia-no-remunerada', nombre: 'Licencia no remunerada', remunerado: false, cotiza: false },
  { id: 'suspension', nombre: 'Suspensión disciplinaria', remunerado: false, cotiza: false },
  { id: 'ausencia', nombre: 'Ausencia injustificada', remunerado: false, cotiza: false },
];

export function tipoDia(id) {
  return TIPOS_DIA.find((t) => t.id === id) || TIPOS_DIA[0];
}

const pesos = (n) => Math.round(n);

/**
 * @param {Object} p
 * @param {Object} p.contrato   Contrato del empleado.
 * @param {Object} p.empresa    Datos del empleador (ARL, exoneración, caja).
 * @param {string} p.desde      Inicio del periodo (YYYY-MM-DD).
 * @param {string} p.hasta      Fin del periodo (YYYY-MM-DD).
 * @param {Object} p.novedades  { 'YYYY-MM-DD': { tipo, inicio, fin, compensatorio, horas } }
 * @param {Object} p.extras     { comisiones, bonificaciones, noSalariales, otrasDeducciones, prestamo, ... }
 */
export function liquidarPeriodo({
  contrato,
  empresa = {},
  desde,
  hasta,
  novedades = {},
  extras = {},
}) {
  // El periodo se recorta a la vigencia del contrato: a quien entra el 8 no se
  // le paga desde el 1, y a quien sale el 20 no se le paga hasta el 30.
  const finContrato = contrato.terminacion
    || (contrato.estado === 'terminado' ? contrato.fin : '')
    || '';
  const desdeEfectivo = contrato.inicio && contrato.inicio > desde ? contrato.inicio : desde;
  const hastaEfectivo = finContrato && finContrato < hasta ? finContrato : hasta;

  const fechaRef = hastaEfectivo;
  const modalidad = contrato.modalidad || 'mensual';
  const diaDescanso = Number(contrato.diaDescanso ?? 0);
  const diasSemana = Number(contrato.diasSemana) || 6;
  const diasPeriodo = hastaEfectivo >= desdeEfectivo ? dias360(desdeEfectivo, hastaEfectivo) : 0;
  const salarioMensual = calc.salarioMensualEquivalente(contrato, fechaRef);
  const vDia = calc.valorDia(contrato, fechaRef);

  const devengados = [];
  const deduccionesLista = [];
  const avisos = [];
  const dias = {
    trabajados: 0, descanso: 0, vacaciones: 0, incapacidadComun: 0,
    incapacidadLaboral: 0, licencia: 0, noRemunerados: 0, festivosTrabajados: 0,
  };

  // ——— 1. Recorrido día por día ———
  const detalleDias = [];
  const turnos = [];
  for (const fecha of (hastaEfectivo >= desdeEfectivo ? rango(desdeEfectivo, hastaEfectivo) : [])) {
    const nov = novedades[fecha] || null;
    const esDescansoLegal = esDiaDeDescanso(fecha, diaDescanso);
    const id = nov?.tipo || (esDescansoLegal ? 'descanso' : (modalidad === 'mensual' ? 'trabajo' : 'ausencia'));
    const tipo = tipoDia(id);
    const fila = {
      fecha,
      diaSemana: diaSemana(fecha),
      tipo: tipo.id,
      nombreTipo: tipo.nombre,
      festivo: esFestivo(fecha) ? nombreFestivo(fecha) : '',
      esDescanso: esDescansoLegal,
      inicio: nov?.inicio || '',
      fin: nov?.fin || '',
      horas: 0,
      valor: 0,
    };

    if (tipo.id === 'trabajo') {
      if (esDescansoLegal) dias.festivosTrabajados++;
      else dias.trabajados++;
      if (nov?.inicio && nov?.fin) {
        const t = calc.valorizarTurno({
          contrato, fecha, inicio: nov.inicio, fin: nov.fin,
          compensatorio: !!nov.compensatorio, diaDescanso,
        });
        fila.horas = t.horasTotales;
        fila.valor = t.total;
        turnos.push({ fecha, ...t });
      } else if (nov?.horas) {
        fila.horas = Number(nov.horas);
      } else {
        fila.horas = calc.horasOrdinariasDia(contrato, fecha);
      }
      if (esDescansoLegal && !nov?.inicio) {
        // Día de descanso trabajado sin horario: se recarga la jornada completa.
        const horas = fila.horas;
        const f = calc.factoresHora({
          fecha, extra: false, nocturna: false, descanso: true,
          modalidad, compensatorio: !!nov?.compensatorio,
        });
        fila.valor = pesos(calc.valorHora(contrato, fecha) * horas * f.factor);
        turnos.push({
          fecha,
          conceptos: [{
            fecha,
            nombre: `Trabajo en ${esFestivo(fecha) ? 'festivo' : 'día de descanso'}`,
            horas, valorHora: calc.valorHora(contrato, fecha), factor: f.factor,
            valor: fila.valor, notas: f.notas, festivo: fila.festivo,
          }],
          total: fila.valor,
          horasTotales: horas,
        });
      }
    } else if (tipo.id === 'descanso') {
      dias.descanso++;
    } else if (tipo.id === 'vacaciones') {
      dias.vacaciones++;
    } else if (tipo.id === 'incapacidad-comun') {
      dias.incapacidadComun++;
    } else if (tipo.id === 'incapacidad-laboral') {
      dias.incapacidadLaboral++;
    } else if (tipo.concepto === 'licencia') {
      dias.licencia++;
    } else if (!tipo.remunerado) {
      dias.noRemunerados++;
    }
    detalleDias.push(fila);
  }

  // ——— 2. Salario del periodo ———
  const diasSalario = Math.max(0, diasPeriodo - dias.vacaciones - dias.incapacidadComun
    - dias.incapacidadLaboral - dias.licencia - dias.noRemunerados);

  if (modalidad === 'mensual') {
    devengados.push({
      concepto: 'Salario',
      detalle: `${diasSalario} días × ${pesos(salarioMensual / 30).toLocaleString('es-CO')}`,
      dias: diasSalario,
      valor: pesos((salarioMensual / 30) * diasSalario),
      salarial: true,
      norma: 'CST art. 127',
    });
  } else if (modalidad === 'jornal') {
    const diasPagados = dias.trabajados + dias.festivosTrabajados;
    const descansosRemunerados = descansosRemuneradosJornal({
      detalleDias, diasSemana, diaDescanso,
    });
    devengados.push({
      concepto: 'Jornales',
      detalle: `${diasPagados} días × ${pesos(vDia).toLocaleString('es-CO')}`,
      dias: diasPagados,
      valor: pesos(vDia * diasPagados),
      salarial: true,
      norma: 'CST art. 133',
    });
    if (descansosRemunerados.dias > 0) {
      devengados.push({
        concepto: 'Descanso dominical y festivos remunerados',
        detalle: `${descansosRemunerados.dias} día(s): ${descansosRemunerados.explicacion}`,
        dias: descansosRemunerados.dias,
        valor: pesos(vDia * descansosRemunerados.dias),
        salarial: true,
        norma: 'CST art. 173, 176 y 177',
      });
    }
    if (descansosRemunerados.aviso) avisos.push(descansosRemunerados.aviso);
  } else {
    const horasOrdinarias = turnos.reduce((s, t) => s
      + t.conceptos.filter((c) => !/extra/i.test(c.nombre)).reduce((x, c) => x + c.horas, 0), 0);
    devengados.push({
      concepto: 'Horas ordinarias',
      detalle: `${calc.redondearHoras(horasOrdinarias)} horas × ${pesos(calc.valorHora(contrato, fechaRef)).toLocaleString('es-CO')}`,
      horas: calc.redondearHoras(horasOrdinarias),
      valor: pesos(calc.valorHora(contrato, fechaRef) * horasOrdinarias),
      salarial: true,
      norma: 'CST art. 133',
    });
  }

  // ——— 3. Recargos, extras y trabajo en días de descanso ———
  const porConcepto = new Map();
  for (const t of turnos) {
    for (const c of t.conceptos) {
      if (c.incluidaEnSueldo && modalidad !== 'horas') continue;
      if (modalidad === 'horas' && !/extra|recargo|descanso|festivo|nocturna/i.test(c.nombre)) continue;
      const clave = c.nombre;
      const acum = porConcepto.get(clave) || { concepto: clave, horas: 0, valor: 0, factor: c.factor, notas: c.notas };
      acum.horas += c.horas;
      acum.valor += c.valor;
      porConcepto.set(clave, acum);
    }
  }
  for (const c of porConcepto.values()) {
    if (c.valor <= 0) continue;
    devengados.push({
      concepto: c.concepto,
      detalle: `${calc.redondearHoras(c.horas)} h × factor ${c.factor}`,
      horas: calc.redondearHoras(c.horas),
      valor: pesos(c.valor),
      salarial: true,
      norma: /descanso|festivo/i.test(c.concepto) ? 'CST art. 179 y 180' : ley.RECARGOS.norma,
    });
  }

  // ——— 4. Auxilio de transporte ———
  const tieneAuxilio = contrato.auxilioTransporte !== false
    && !contrato.salarioIntegral
    && ley.tieneAuxilioTransporte(salarioMensual, fechaRef);
  const auxilioMes = tieneAuxilio ? ley.auxilioTransporte(fechaRef) : 0;
  if (auxilioMes > 0 && diasSalario > 0) {
    devengados.push({
      concepto: 'Auxilio de transporte',
      detalle: `${diasSalario} días × ${pesos(auxilioMes / 30).toLocaleString('es-CO')}`,
      dias: diasSalario,
      valor: pesos((auxilioMes / 30) * diasSalario),
      salarial: false,
      baseePrestaciones: true,
      norma: 'Ley 15 de 1959',
    });
  }

  // ——— 5. Vacaciones, incapacidades y licencias ———
  if (dias.vacaciones > 0) {
    devengados.push({
      concepto: 'Vacaciones disfrutadas',
      detalle: `${dias.vacaciones} días × ${pesos(salarioMensual / 30).toLocaleString('es-CO')} (sin auxilio de transporte)`,
      dias: dias.vacaciones,
      valor: pesos((salarioMensual / 30) * dias.vacaciones),
      salarial: true,
      norma: 'CST art. 186 y 192',
    });
  }
  if (dias.incapacidadComun > 0) {
    const inc = valorIncapacidadComun({ salarioMensual, dias: dias.incapacidadComun, fecha: fechaRef, diaInicial: extras.diaInicialIncapacidad || 1 });
    devengados.push({
      concepto: 'Incapacidad por enfermedad general',
      detalle: inc.detalle,
      dias: dias.incapacidadComun,
      valor: inc.valor,
      salarial: false,
      norma: ley.AUSENCIAS.incapacidadComun.norma,
    });
    avisos.push(...inc.avisos);
  }
  if (dias.incapacidadLaboral > 0) {
    devengados.push({
      concepto: 'Incapacidad de origen laboral',
      detalle: `${dias.incapacidadLaboral} días al 100 % del IBC, a cargo de la ARL`,
      dias: dias.incapacidadLaboral,
      valor: pesos((salarioMensual / 30) * dias.incapacidadLaboral),
      salarial: false,
      norma: ley.AUSENCIAS.incapacidadLaboral.norma,
    });
  }
  if (dias.licencia > 0) {
    devengados.push({
      concepto: 'Licencias remuneradas',
      detalle: `${dias.licencia} días al 100 %`,
      dias: dias.licencia,
      valor: pesos((salarioMensual / 30) * dias.licencia),
      salarial: false,
      norma: 'CST art. 236 y Ley 1280 de 2009',
    });
  }

  // ——— 6. Otros pagos ———
  const comisiones = Number(extras.comisiones) || 0;
  const bonificaciones = Number(extras.bonificaciones) || 0;
  const noSalariales = Number(extras.noSalariales) || 0;
  if (comisiones) devengados.push({ concepto: 'Comisiones', valor: pesos(comisiones), salarial: true, norma: 'CST art. 127' });
  if (bonificaciones) devengados.push({ concepto: 'Bonificaciones salariales', valor: pesos(bonificaciones), salarial: true, norma: 'CST art. 127' });
  if (noSalariales) devengados.push({ concepto: 'Pagos no salariales', valor: pesos(noSalariales), salarial: false, norma: 'CST art. 128' });

  const totalDevengado = devengados.reduce((s, d) => s + d.valor, 0);
  const devengadoSalarial = devengados.filter((d) => d.salarial).reduce((s, d) => s + d.valor, 0);

  // Tope del 40 % de pagos no salariales (Ley 1393 de 2010, art. 30).
  let baseIbc = devengadoSalarial;
  if (noSalariales > 0 && totalDevengado > 0) {
    const proporcion = noSalariales / totalDevengado;
    if (proporcion > 0.40) {
      const exceso = noSalariales - totalDevengado * 0.40;
      baseIbc += exceso;
      avisos.push(`Los pagos no salariales superan el 40 % del total: ${pesos(exceso).toLocaleString('es-CO')} entran al IBC (Ley 1393 de 2010, art. 30).`);
    }
  }
  // Las incapacidades y licencias también cotizan.
  const baseAusencias = devengados
    .filter((d) => /Incapacidad|Licencias/.test(d.concepto))
    .reduce((s, d) => s + d.valor, 0);
  baseIbc += baseAusencias;

  // ——— 7. Seguridad social ———
  const diasCotizados = Math.min(30, Math.max(0, diasPeriodo - dias.noRemunerados));
  const { ibc, avisos: avisosIbc } = seg.calcularIbc({
    devengadoSalarial: baseIbc,
    fecha: fechaRef,
    diasCotizados,
    salarioIntegral: !!contrato.salarioIntegral,
  });
  avisos.push(...avisosIbc);

  const aportes = seg.liquidarAportes({
    ibc,
    fecha: fechaRef,
    salarioMensual,
    claseArl: contrato.claseArl || empresa.claseArl || 'I',
    nivelArl: contrato.nivelArl || empresa.nivelArl || 'media',
    exonerado: empresa.exonerado !== false,
    aportaCaja: empresa.aportaCaja !== false,
  });

  deduccionesLista.push(
    { concepto: 'Aporte a salud (4 %)', valor: aportes.trabajador.salud, norma: ley.APORTES.salud.norma },
    { concepto: 'Aporte a pensión (4 %)', valor: aportes.trabajador.pension, norma: ley.APORTES.pension.norma },
  );
  if (aportes.trabajador.fsp > 0) {
    deduccionesLista.push({
      concepto: `Fondo de solidaridad pensional (${(aportes.tarifas.fsp * 100).toFixed(1)} %)`,
      valor: aportes.trabajador.fsp,
      norma: 'Ley 797 de 2003',
    });
  }

  // ——— 8. Retención en la fuente ———
  let retencion = null;
  if (extras.calcularRetencion !== false) {
    retencion = ret.retencionProcedimiento1({
      ingresoLaboral: totalDevengado,
      fecha: fechaRef,
      aportesObligatorios: aportes.trabajador.total,
      ingresosNoConstitutivos: (auxilioMes > 0 ? pesos((auxilioMes / 30) * diasSalario) : 0) + noSalariales,
      deducciones: extras.deduccionesTributarias || {},
      tieneDependientes: !!extras.tieneDependientes,
    });
    if (retencion.retencion > 0) {
      deduccionesLista.push({
        concepto: 'Retención en la fuente',
        valor: retencion.retencion,
        norma: 'Estatuto Tributario art. 383',
      });
    }
  }

  for (const d of extras.deducciones || []) {
    if (!d || !Number(d.valor)) continue;
    deduccionesLista.push({ concepto: d.concepto || 'Deducción', valor: pesos(Number(d.valor)), norma: d.norma || '' });
  }

  const totalDeducciones = deduccionesLista.reduce((s, d) => s + d.valor, 0);
  const neto = totalDevengado - totalDeducciones;

  // Tope de embargabilidad: solo el excedente del mínimo es embargable (CST art. 154-156).
  if (totalDeducciones > totalDevengado * 0.5) {
    avisos.push('Las deducciones pasan del 50 % del devengado: revisa los límites de los artículos 149 a 156 del CST (salvo cooperativas y libranzas legales).');
  }

  // ——— 9. Costo del empleador ———
  const baseProvision = devengadoSalarial + (auxilioMes > 0 ? pesos((auxilioMes / 30) * diasSalario) : 0);
  const prov = seg.provisiones({ baseMes: baseProvision, baseSinAuxilio: devengadoSalarial });
  const costoTotal = totalDevengado + aportes.empleador.total + prov.total;

  // ——— 10. Avisos de jornada ———
  const extrasSemana = agruparExtrasPorSemana(turnos);
  for (const [semana, horas] of extrasSemana) {
    for (const aviso of calc.avisosExtras({ extrasSemana: horas })) {
      avisos.push(`Semana del ${formatoCorto(semana)}: ${aviso}`);
    }
  }
  if (modalidad === 'mensual' && diasSalario > 30) {
    avisos.push('El periodo tiene más de 30 días de salario: revisa las fechas.');
  }
  if (desdeEfectivo !== desde) {
    avisos.push(`El contrato empieza el ${formatoCorto(desdeEfectivo)}: se liquida desde esa fecha, no desde el inicio del periodo.`);
  }
  if (hastaEfectivo !== hasta) {
    avisos.push(`El contrato termina el ${formatoCorto(hastaEfectivo)}: se liquida hasta esa fecha, no hasta el fin del periodo.`);
  }
  if (hastaEfectivo < desdeEfectivo) {
    avisos.push('El contrato no estuvo vigente en este periodo.');
  }

  return {
    contrato: contrato.id,
    desde: desdeEfectivo,
    hasta: hastaEfectivo,
    periodoSolicitado: { desde, hasta },
    diasPeriodo,
    dias,
    diasSalario,
    diasCotizados,
    detalleDias,
    devengados,
    deducciones: deduccionesLista,
    totalDevengado,
    devengadoSalarial,
    totalDeducciones,
    neto,
    ibc,
    aportes,
    provisiones: prov,
    retencion,
    costoTotal,
    avisos,
    parametros: {
      smmlv: ley.smmlv(fechaRef),
      auxilioTransporte: ley.auxilioTransporte(fechaRef),
      jornada: ley.jornada(fechaRef),
      recargoDescanso: ley.recargoDescanso(fechaRef),
      franjaDiurna: ley.franjaDiurna(fechaRef),
      valorHora: pesos(calc.valorHora(contrato, fechaRef)),
      valorDia: pesos(vDia),
    },
  };
}

/**
 * Descanso dominical y festivos que hay que pagarle a quien se le paga por día:
 * tiene derecho si trabajó todos los días laborables de la semana
 * (CST art. 173). Se cuenta semana por semana.
 */
function descansosRemuneradosJornal({ detalleDias, diasSemana, diaDescanso }) {
  const semanas = new Map();
  for (const d of detalleDias) {
    const clave = inicioSemana(d.fecha);
    const s = semanas.get(clave) || { laborables: 0, trabajados: 0, descansosNoTrabajados: 0 };
    const esDescansoSemanal = d.diaSemana === diaDescanso;
    const esFest = !!d.festivo;
    if (!esDescansoSemanal && !esFest) {
      s.laborables++;
      if (d.tipo === 'trabajo') s.trabajados++;
    } else if (d.tipo !== 'trabajo') {
      s.descansosNoTrabajados++;
    }
    semanas.set(clave, s);
  }
  let dias = 0;
  let incompletas = 0;
  for (const s of semanas.values()) {
    if (s.laborables > 0 && s.trabajados >= Math.min(s.laborables, diasSemana - 1)) {
      dias += s.descansosNoTrabajados;
    } else if (s.descansosNoTrabajados > 0) {
      incompletas++;
    }
  }
  return {
    dias,
    explicacion: 'domingos y festivos de las semanas trabajadas completas',
    aviso: incompletas
      ? `${incompletas} semana(s) quedaron incompletas: el descanso remunerado solo se paga cuando se trabajan todos los días laborables (CST art. 173).`
      : '',
  };
}

function inicioSemana(fecha) {
  const dow = diaSemana(fecha);
  const dias = dow === 0 ? 6 : dow - 1; // semana de lunes a domingo
  const d = new Date(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)) - dias, 12);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function agruparExtrasPorSemana(turnos) {
  const mapa = new Map();
  for (const t of turnos) {
    const clave = inicioSemana(t.fecha);
    const horas = t.conceptos.filter((c) => /extra/i.test(c.nombre)).reduce((s, c) => s + c.horas, 0);
    mapa.set(clave, (mapa.get(clave) || 0) + horas);
  }
  return mapa;
}

/** Valor de una incapacidad de origen común. */
export function valorIncapacidadComun({ salarioMensual, dias, fecha, diaInicial = 1 }) {
  const reglas = ley.AUSENCIAS.incapacidadComun;
  const minimoDia = ley.smmlv(fecha) / 30;
  const diaSalario = salarioMensual / 30;
  const avisos = [];
  let valor = 0;
  let empleador = 0;
  let eps = 0;

  for (let i = 0; i < dias; i++) {
    const numero = diaInicial + i;
    let porcentaje;
    if (numero <= reglas.diasEmpleador) porcentaje = reglas.porcentajeHasta90;
    else if (numero <= 90) porcentaje = reglas.porcentajeHasta90;
    else if (numero <= 180) porcentaje = reglas.porcentajeDesde91;
    else porcentaje = reglas.porcentajeDesde91;
    let valorDia = diaSalario * porcentaje;
    if (valorDia < minimoDia) valorDia = minimoDia; // nunca por debajo del mínimo
    valor += valorDia;
    if (numero <= reglas.diasEmpleador) empleador += valorDia; else eps += valorDia;
    if (numero === 181) avisos.push('Desde el día 181 la incapacidad la asume el fondo de pensiones; revisa el concepto de rehabilitación.');
  }

  return {
    valor: Math.round(valor),
    aCargoEmpleador: Math.round(empleador),
    aCargoEps: Math.round(eps),
    detalle: `${dias} días: los 2 primeros los paga el empleador y el resto la EPS, al 66,67 % del salario (nunca menos del mínimo).`,
    avisos,
  };
}
