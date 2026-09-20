/**
 * registro.js — El calendario de días: quién trabajó, cuánto y en qué
 * condiciones. Es la base de todo lo demás.
 */

import {
  h, tarjeta, campo, entrada, seleccion, boton, pesos, chip, mensaje, modal,
  formatoCorto, hoy, inicioDeMes, finDeMes, numero, vacio, tabla,
} from '../ui.js';
import { rango, diaSemana, sumarMeses, DIAS, MESES, partes } from '../fechas.js';
import { esFestivo, nombreFestivo } from '../festivos.js';
import { TIPOS_DIA, tipoDia } from '../nomina.js';
import * as calc from '../calculo.js';

const COLORES = {
  trabajo: 'dia-trabajo',
  descanso: 'dia-descanso',
  vacaciones: 'dia-vacaciones',
  'incapacidad-comun': 'dia-incapacidad',
  'incapacidad-laboral': 'dia-incapacidad',
  maternidad: 'dia-licencia',
  paternidad: 'dia-licencia',
  luto: 'dia-licencia',
  'licencia-remunerada': 'dia-licencia',
  'licencia-no-remunerada': 'dia-sin-pago',
  suspension: 'dia-sin-pago',
  ausencia: 'dia-sin-pago',
};

export function vista(store, params = {}) {
  const contenedor = h('div', { class: 'vista' });
  const contratos = store.contratosActivos();
  if (!contratos.length) {
    return h('div', { class: 'vista' }, tarjeta('Registro de días',
      vacio('Primero crea un empleado con contrato.',
        boton('Ir a Empleados', () => { window.location.hash = '#/empleados'; }, 'primario'))));
  }

  const contrato = store.contrato(params.id) || contratos[0];
  const empleado = store.empleado(contrato.empleadoId);
  const mesActual = params.mes || hoy().slice(0, 7);

  const cabecera = h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Días trabajados'),
      h('p', { class: 'ayuda' }, empleado ? empleado.nombre : '', ' · ',
        `${pesos(calc.valorDia(contrato, `${mesActual}-01`))} por día · `,
        `${pesos(calc.valorHora(contrato, `${mesActual}-01`))} la hora ordinaria`)),
    h('div', { class: 'acciones' },
      seleccion(contratos.map((c) => {
        const e = store.empleado(c.empleadoId);
        return { value: c.id, label: e ? e.nombre : c.id };
      }), contrato.id, { onChange: (e) => { window.location.hash = `#/registro/${e.target.value}`; } }),
      boton('◀', () => irAlMes(contrato.id, sumarMeses(`${mesActual}-01`, -1).slice(0, 7))),
      h('strong', { class: 'mes-titulo' }, `${MESES[Number(mesActual.slice(5, 7)) - 1]} ${mesActual.slice(0, 4)}`),
      boton('▶', () => irAlMes(contrato.id, sumarMeses(`${mesActual}-01`, 1).slice(0, 7)))));
  contenedor.append(cabecera);

  contenedor.append(tarjeta('', h('div', { class: 'acciones acciones-envueltas' },
    boton('Marcar mes laboral completo', () => marcarMes(store, contrato, mesActual), 'primario'),
    boton('Registrar rango (vacaciones, incapacidad…)', () => abrirRango(store, contrato, mesActual)),
    boton('Borrar el mes', () => {
      if (window.confirm('¿Borrar todos los registros de este mes?')) {
        store.guardarNovedadesRango(contrato.id, `${mesActual}-01`, finDeMes(`${mesActual}-01`), null);
        mensaje('Mes borrado.');
      }
    }, 'peligro'),
    boton('Liquidar este mes', () => { window.location.hash = `#/nomina/${contrato.id}/${mesActual}`; }, 'primario'))));

  contenedor.append(calendario(store, contrato, mesActual));
  contenedor.append(resumenMes(store, contrato, mesActual));
  contenedor.append(leyenda());
  return contenedor;
}

function irAlMes(contratoId, mes) {
  window.location.hash = `#/registro/${contratoId}/${mes}`;
}

function calendario(store, contrato, mes) {
  const primero = `${mes}-01`;
  const ultimo = finDeMes(primero);
  const novedades = store.novedades(contrato.id);
  const rejilla = h('div', { class: 'calendario' });

  for (const d of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
    rejilla.append(h('div', { class: 'calendario-cabecera' }, d));
  }
  const primerDia = diaSemana(primero);
  const huecos = primerDia === 0 ? 6 : primerDia - 1;
  for (let i = 0; i < huecos; i++) rejilla.append(h('div', { class: 'calendario-hueco' }));

  const diaDescanso = Number(contrato.diaDescanso ?? 0);
  for (const fecha of rango(primero, ultimo)) {
    const nov = novedades[fecha];
    const festivo = esFestivo(fecha);
    const esDescansoSemanal = diaSemana(fecha) === diaDescanso;
    const tipo = nov?.tipo || (festivo || esDescansoSemanal ? 'descanso' : 'trabajo');
    const clases = ['calendario-dia', COLORES[tipo] || ''];
    if (!nov) clases.push('sin-registro');
    if (festivo) clases.push('es-festivo');
    if (fecha === hoy()) clases.push('es-hoy');

    const celda = h('button', {
      class: clases.join(' '),
      type: 'button',
      title: `${formatoCorto(fecha)} ${festivo ? `· ${nombreFestivo(fecha)}` : ''}`,
      onClick: () => abrirDia(store, contrato, fecha),
    },
    h('span', { class: 'calendario-numero' }, String(Number(fecha.slice(8, 10)))),
    festivo ? h('span', { class: 'calendario-festivo' }, '★') : null,
    nov?.inicio ? h('small', {}, `${nov.inicio}–${nov.fin}`) : null,
    nov && tipo !== 'trabajo' ? h('small', {}, tipoDia(tipo).nombre.slice(0, 14)) : null);
    rejilla.append(celda);
  }

  return tarjeta('', rejilla);
}

function resumenMes(store, contrato, mes) {
  const primero = `${mes}-01`;
  const ultimo = finDeMes(primero);
  const novedades = store.novedades(contrato.id);
  const cuenta = new Map();
  let horas = 0;
  let valorRecargos = 0;
  const diaDescanso = Number(contrato.diaDescanso ?? 0);

  for (const fecha of rango(primero, ultimo)) {
    const nov = novedades[fecha];
    if (!nov) continue;
    cuenta.set(nov.tipo, (cuenta.get(nov.tipo) || 0) + 1);
    if (nov.tipo === 'trabajo' && nov.inicio && nov.fin) {
      const t = calc.valorizarTurno({
        contrato, fecha, inicio: nov.inicio, fin: nov.fin,
        compensatorio: !!nov.compensatorio, diaDescanso,
      });
      horas += t.horasTotales;
      valorRecargos += t.total;
    }
  }

  if (!cuenta.size) {
    return tarjeta('Resumen del mes', h('p', { class: 'ayuda' }, 'Todavía no hay días registrados. Usa "Marcar mes laboral completo" o toca cada día.'));
  }

  return tarjeta('Resumen del mes',
    tabla([{ titulo: 'Concepto' }, { titulo: 'Días', clase: 'num' }],
      [...cuenta.entries()].map(([tipo, n]) => ({ celdas: [tipoDia(tipo).nombre, String(n)] }))),
    h('p', {}, `Horas registradas con horario: ${numero(horas, 1)} · Recargos, extras y trabajo en días de descanso: `,
      h('strong', {}, pesos(valorRecargos))));
}

function leyenda() {
  return h('div', { class: 'leyenda' },
    chip('Trabajo', 'dia-trabajo'), chip('Descanso', 'dia-descanso'),
    chip('Vacaciones', 'dia-vacaciones'), chip('Incapacidad', 'dia-incapacidad'),
    chip('Licencia', 'dia-licencia'), chip('Sin pago', 'dia-sin-pago'),
    h('span', { class: 'ayuda' }, '★ festivo'));
}

function abrirDia(store, contrato, fecha) {
  const novedades = store.novedades(contrato.id);
  const actual = novedades[fecha] || {};
  const datos = {
    tipo: actual.tipo || 'trabajo',
    inicio: actual.inicio || '',
    fin: actual.fin || '',
    compensatorio: !!actual.compensatorio,
    nota: actual.nota || '',
  };
  const festivo = esFestivo(fecha);
  const esDescansoSemanal = diaSemana(fecha) === Number(contrato.diaDescanso ?? 0);

  const previo = h('div', { class: 'previo' });
  const calcularPrevio = () => {
    previo.replaceChildren();
    if (datos.tipo !== 'trabajo' || !datos.inicio || !datos.fin) return;
    try {
      const t = calc.valorizarTurno({
        contrato, fecha, inicio: datos.inicio, fin: datos.fin,
        compensatorio: datos.compensatorio, diaDescanso: Number(contrato.diaDescanso ?? 0),
      });
      previo.append(
        h('p', {}, `${numero(t.horasTotales, 2)} horas en total.`),
        tabla([{ titulo: 'Concepto' }, { titulo: 'Horas', clase: 'num' }, { titulo: 'Factor', clase: 'num' }, { titulo: 'Valor', clase: 'num' }],
          t.conceptos.map((c) => ({
            celdas: [
              h('span', {}, c.nombre, c.incluidaEnSueldo ? h('small', { class: 'norma' }, ' (ya va en el sueldo)') : null),
              numero(c.horas, 2), numero(c.factor, 2), pesos(c.valor),
            ],
          }))),
        h('p', {}, 'Adicional a pagar: ', h('strong', {}, pesos(t.total))));
    } catch (error) {
      previo.append(h('p', { class: 'aviso aviso-error' }, error.message));
    }
  };

  const cuerpo = h('div', { class: 'formulario' },
    h('p', { class: 'ayuda' },
      `${DIAS[diaSemana(fecha)]} ${formatoCorto(fecha)}`,
      festivo ? ` · Festivo: ${nombreFestivo(fecha)}` : '',
      esDescansoSemanal ? ' · Día de descanso semanal' : ''),
    campo('¿Qué pasó ese día?', seleccion(TIPOS_DIA.map((t) => ({ value: t.id, label: t.nombre })), datos.tipo, {
      onChange: (e) => { datos.tipo = e.target.value; calcularPrevio(); },
    })),
    h('div', { class: 'rejilla rejilla-2' },
      campo('Entrada', entrada({ type: 'time', value: datos.inicio, onInput: (e) => { datos.inicio = e.target.value; calcularPrevio(); } })),
      campo('Salida', entrada({ type: 'time', value: datos.fin, onInput: (e) => { datos.fin = e.target.value; calcularPrevio(); } }))),
    (festivo || esDescansoSemanal)
      ? campo('¿Se le dio descanso compensatorio?', seleccion([
        { value: '', label: 'No: se paga el día más el recargo' },
        { value: '1', label: 'Sí: se paga solo el recargo' },
      ], datos.compensatorio ? '1' : '', { onChange: (e) => { datos.compensatorio = !!e.target.value; calcularPrevio(); } }),
      'Trabajar hasta 2 días de descanso al mes es ocasional; 3 o más es habitual (CST art. 179 y 180).')
      : null,
    campo('Nota', entrada({ value: datos.nota, onInput: (e) => { datos.nota = e.target.value; } })),
    previo);
  calcularPrevio();

  const dlg = modal(`Día ${formatoCorto(fecha)}`, cuerpo, [
    boton('Quitar registro', () => { store.guardarNovedad(contrato.id, fecha, null); dlg.cerrar(); }, 'peligro'),
    boton('Cancelar', () => dlg.cerrar()),
    boton('Guardar', () => {
      store.guardarNovedad(contrato.id, fecha, datos);
      dlg.cerrar();
      mensaje('Día guardado.');
    }, 'primario'),
  ]);
}

function marcarMes(store, contrato, mes) {
  const primero = `${mes}-01`;
  const ultimo = finDeMes(primero);
  const diaDescanso = Number(contrato.diaDescanso ?? 0);
  const inicio = contrato.horaInicio || '08:00';
  const horas = calc.horasOrdinariasDia(contrato, primero);
  const fin = sumarHoras(inicio, horas + (horas > 5 ? 1 : 0)); // + hora de almuerzo si la jornada es larga
  let n = 0;
  for (const fecha of rango(primero, ultimo)) {
    if (fecha < contrato.inicio) continue;
    if (contrato.fin && fecha > contrato.fin) continue;
    const esDescanso = diaSemana(fecha) === diaDescanso || esFestivo(fecha);
    store.guardarNovedad(contrato.id, fecha, esDescanso
      ? { tipo: 'descanso' }
      : { tipo: 'trabajo', inicio, fin, compensatorio: false, nota: '' });
    n++;
  }
  mensaje(`${n} días marcados. Ajusta los que tengan novedad.`);
}

function sumarHoras(hhmm, horas) {
  const [h1, m1] = hhmm.split(':').map(Number);
  const total = h1 * 60 + m1 + Math.round(horas * 60);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(Math.floor(total / 60) % 24)}:${p(total % 60)}`;
}

function abrirRango(store, contrato, mes) {
  const datos = { tipo: 'vacaciones', desde: `${mes}-01`, hasta: finDeMes(`${mes}-01`), nota: '' };
  const cuerpo = h('div', { class: 'formulario' },
    campo('Novedad', seleccion(TIPOS_DIA.filter((t) => t.id !== 'trabajo').map((t) => ({ value: t.id, label: t.nombre })), datos.tipo, {
      onChange: (e) => { datos.tipo = e.target.value; },
    })),
    h('div', { class: 'rejilla rejilla-2' },
      campo('Desde', entrada({ type: 'date', value: datos.desde, onInput: (e) => { datos.desde = e.target.value; } })),
      campo('Hasta', entrada({ type: 'date', value: datos.hasta, onInput: (e) => { datos.hasta = e.target.value; } }))),
    campo('Nota', entrada({ value: '', onInput: (e) => { datos.nota = e.target.value; } })),
    h('p', { class: 'ayuda' }, 'Las vacaciones se cuentan en días hábiles; los domingos y festivos que caigan en la mitad no se descuentan del saldo.'));

  const dlg = modal('Registrar un rango de días', cuerpo, [
    boton('Cancelar', () => dlg.cerrar()),
    boton('Guardar', () => {
      if (datos.hasta < datos.desde) { mensaje('El rango está al revés.', 'error'); return; }
      store.guardarNovedadesRango(contrato.id, datos.desde, datos.hasta, { tipo: datos.tipo, nota: datos.nota });
      dlg.cerrar();
      mensaje('Rango registrado.');
    }, 'primario'),
  ]);
}
