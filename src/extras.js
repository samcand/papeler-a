/**
 * extras.js — Registro de trabajo suplementario.
 *
 * La reforma laboral dejó obligación expresa: llevar un registro de las horas
 * extra de cada trabajador con su nombre, la actividad realizada y el número
 * de horas, precisando si son diurnas o nocturnas; entregárselo al trabajador
 * que lo pida junto con el soporte del pago; y mostrarlo a las autoridades
 * judiciales y administrativas cuando lo requieran. No llevarlo puede costar
 * la suspensión por seis meses de la facultad de autorizar trabajo
 * suplementario (Ley 2466 de 2025, CST art. 162).
 *
 * La app ya tiene el dato exacto turno por turno: aquí solo se ordena.
 */

import { rango, diaSemana, formatoCorto } from './fechas.js';
import { esFestivo, nombreFestivo, esDiaDeDescanso } from './festivos.js';
import * as calc from './calculo.js';
import * as ley from './normativa.js';

/**
 * @returns {{filas, totales, avisos, semanas}}
 */
export function registroSuplementario({ contrato, empleado = {}, desde, hasta, novedades = {} }) {
  const diaDescanso = Number(contrato.diaDescanso ?? 0);
  const filas = [];
  const totales = {
    extraDiurna: 0, extraNocturna: 0, recargoNocturno: 0,
    descansoDiurna: 0, descansoNocturna: 0, horasTotales: 0, valor: 0,
  };
  const porSemana = new Map();

  for (const fecha of rango(desde, hasta)) {
    const nov = novedades[fecha];
    if (!nov || nov.tipo !== 'trabajo' || !nov.inicio || !nov.fin) continue;

    const t = calc.valorizarTurno({
      contrato, fecha, inicio: nov.inicio, fin: nov.fin,
      compensatorio: !!nov.compensatorio, diaDescanso,
    });

    const fila = {
      fecha,
      trabajador: empleado.nombre || '',
      documento: empleado.documento ? `${empleado.tipoDocumento || 'C.C.'} ${empleado.documento}` : '',
      actividad: nov.nota || empleado.cargo || 'Labores propias del cargo',
      horario: `${nov.inicio} a ${nov.fin}`,
      horasTotales: t.horasTotales,
      extraDiurna: 0, extraNocturna: 0, recargoNocturno: 0,
      descansoDiurna: 0, descansoNocturna: 0,
      esDescanso: esDiaDeDescanso(fecha, diaDescanso),
      festivo: esFestivo(fecha) ? nombreFestivo(fecha) : '',
      valor: t.total,
      conceptos: t.conceptos.filter((c) => !c.incluidaEnSueldo),
    };

    for (const s of t.segmentos) {
      if (s.extra && !s.nocturna) fila.extraDiurna += s.horas;
      else if (s.extra && s.nocturna) fila.extraNocturna += s.horas;
      else if (!s.extra && s.nocturna) fila.recargoNocturno += s.horas;
      if (s.descanso && !s.nocturna) fila.descansoDiurna += s.horas;
      if (s.descanso && s.nocturna) fila.descansoNocturna += s.horas;
    }

    const extrasDia = fila.extraDiurna + fila.extraNocturna;
    if (extrasDia > ley.TOPES_EXTRAS.diarias) {
      fila.aviso = `${calc.redondearHoras(extrasDia)} horas extra en un día; el tope legal es ${ley.TOPES_EXTRAS.diarias}.`;
    }

    const clave = inicioSemana(fecha);
    const sem = porSemana.get(clave) || { semana: clave, extras: 0, dias: 0, valor: 0 };
    sem.extras += extrasDia;
    sem.dias++;
    sem.valor += t.total;
    porSemana.set(clave, sem);

    for (const k of ['extraDiurna', 'extraNocturna', 'recargoNocturno', 'descansoDiurna', 'descansoNocturna', 'horasTotales', 'valor']) {
      totales[k] += fila[k];
    }
    filas.push(fila);
  }

  for (const k of Object.keys(totales)) {
    totales[k] = k === 'valor' ? Math.round(totales[k]) : calc.redondearHoras(totales[k]);
  }

  const avisos = [];
  for (const fila of filas) if (fila.aviso) avisos.push(`${formatoCorto(fila.fecha)}: ${fila.aviso}`);
  for (const sem of porSemana.values()) {
    if (sem.extras > ley.TOPES_EXTRAS.semanales) {
      avisos.push(`Semana del ${formatoCorto(sem.semana)}: ${calc.redondearHoras(sem.extras)} horas extra; el tope legal es ${ley.TOPES_EXTRAS.semanales}.`);
    }
  }

  return {
    filas,
    totales,
    semanas: [...porSemana.values()].sort((a, b) => (a.semana < b.semana ? -1 : 1)),
    avisos,
    norma: 'Ley 2466 de 2025 (CST art. 162) y CST art. 167 y 168',
    nota: 'El empleador debe llevar este registro, entregarlo al trabajador que lo solicite junto con el soporte del pago, '
      + 'y presentarlo a las autoridades judiciales y administrativas cuando lo requieran.',
  };
}

function inicioSemana(fecha) {
  const dow = diaSemana(fecha);
  const dias = dow === 0 ? 6 : dow - 1;
  const d = new Date(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)) - dias, 12);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Filas planas para exportar a CSV. */
export function aFilasCsv(registro) {
  const cabecera = [
    'Fecha', 'Trabajador', 'Documento', 'Actividad', 'Horario', 'Horas del turno',
    'Extra diurna', 'Extra nocturna', 'Recargo nocturno', 'En descanso diurna',
    'En descanso nocturna', 'Valor',
  ];
  const filas = registro.filas.map((f) => [
    f.fecha, f.trabajador, f.documento, f.actividad, f.horario, f.horasTotales,
    f.extraDiurna, f.extraNocturna, f.recargoNocturno, f.descansoDiurna, f.descansoNocturna, f.valor,
  ]);
  const t = registro.totales;
  filas.push(['TOTAL', '', '', '', '', t.horasTotales, t.extraDiurna, t.extraNocturna,
    t.recargoNocturno, t.descansoDiurna, t.descansoNocturna, t.valor]);
  return [cabecera, ...filas];
}
