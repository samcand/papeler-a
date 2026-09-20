/**
 * simulador.js (vista) — Cuánto cuesta contratar, cuánto costará el año y
 * cuánto sube cuando cambie la ley.
 */

import {
  h, tarjeta, tabla, campo, entrada, seleccion, boton, pesos, numero, chip,
  formatoCorto, formatoLargo, hoy, imprimir, descargar, csv, aviso,
} from '../ui.js';
import { costoContratar, presupuestoAnual, impactoNormativo, ESCENARIOS } from '../simulador.js';
import { rango, finDeMes, sumarMeses } from '../fechas.js';
import { esDiaDeDescanso } from '../festivos.js';
import * as calc from '../calculo.js';
import * as ley from '../normativa.js';

export function vista(store) {
  const contenedor = h('div', { class: 'vista' });
  const empresa = store.estado.empresa;
  const fecha = hoy();

  contenedor.append(h('h1', {}, 'Simulador'));

  // ——— 1. ¿Cuánto cuesta contratar? ———
  const entradaDatos = {
    salario: ley.smmlv(fecha),
    modalidad: 'mensual',
    claseArl: empresa.claseArl || 'I',
    exonerado: empresa.exonerado !== false,
    salarioIntegral: false,
    variableMes: 0,
  };
  const salidaCosto = h('div');
  const recalcularCosto = () => {
    const c = costoContratar({ ...entradaDatos, fecha, aportaCaja: empresa.aportaCaja !== false });
    salidaCosto.replaceChildren(
      h('div', { class: 'rejilla rejilla-4' },
        indicador('Recibe el trabajador', pesos(c.recibeNeto), 'Neto, después de salud y pensión'),
        indicador('Se le paga', pesos(c.pagaAlTrabajador), 'Salario más auxilio'),
        indicador('Le cuesta a la empresa', pesos(c.costoMensual), `Factor ${numero(c.factor, 2)} veces el salario`),
        indicador('Al año', pesos(c.costoAnual), 'Con prestaciones y aportes')),
      tabla([{ titulo: 'Concepto' }, { titulo: 'Quién lo asume' }, { titulo: 'Valor', clase: 'num' }],
        c.desglose.map((d) => ({
          celdas: [d.concepto,
            d.quien === 'trabajador' ? chip('Va al trabajador', 'ok')
              : d.quien === 'empresa' ? chip('Aporte del empleador', 'alerta')
                : chip('Provisión', 'gris'),
            pesos(d.valor)],
        })).concat([{ clase: 'total', celdas: ['Costo total del mes', '', pesos(c.costoMensual)] }])),
      h('p', { class: 'ayuda' }, c.nota),
      h('p', { class: 'ayuda' }, c.provisiones.nota || ''));
  };

  contenedor.append(tarjeta('¿Cuánto cuesta contratar?',
    h('div', { class: 'rejilla rejilla-4' },
      campo('Salario mensual', entrada({
        type: 'number', step: 50000, value: entradaDatos.salario,
        onInput: (e) => { entradaDatos.salario = Number(e.target.value) || 0; recalcularCosto(); },
      })),
      campo('Variable al mes', entrada({
        type: 'number', step: 50000, value: 0,
        onInput: (e) => { entradaDatos.variableMes = Number(e.target.value) || 0; recalcularCosto(); },
      }), 'Comisiones, extras, recargos.'),
      campo('Clase de riesgo', seleccion(ley.ARL.map((a) => ({ value: a.clase, label: `Clase ${a.clase}` })), entradaDatos.claseArl, {
        onChange: (e) => { entradaDatos.claseArl = e.target.value; recalcularCosto(); },
      })),
      campo('¿Exonerado de parafiscales?', seleccion([
        { value: '1', label: 'Sí' }, { value: '', label: 'No' },
      ], entradaDatos.exonerado ? '1' : '', {
        onChange: (e) => { entradaDatos.exonerado = !!e.target.value; recalcularCosto(); },
      }))),
    salidaCosto));
  recalcularCosto();

  // ——— 2. Presupuesto del año ———
  const anio = Number(fecha.slice(0, 4));
  const contratos = store.contratosActivos();
  if (contratos.length) {
    const p = presupuestoAnual({ contratos, anio, empresa });
    const cuerpo = h('div', {},
      tabla([
        { titulo: 'Mes' }, { titulo: 'Personas', clase: 'num' }, { titulo: 'Nómina', clase: 'num' },
        { titulo: 'Aportes', clase: 'num' }, { titulo: 'Provisión', clase: 'num' },
        { titulo: 'Sale del banco', clase: 'num' },
      ], p.meses.map((m) => ({
        clase: m.desembolsos.length ? 'destacado' : '',
        celdas: [
          h('div', {}, m.nombre, ...m.desembolsos.map((d) => h('p', { class: 'norma' }, `+ ${d.concepto}`))),
          String(m.activos), pesos(m.nomina), pesos(m.aportes), pesos(m.provision), pesos(m.caja),
        ],
      })).concat([{ clase: 'total', celdas: ['Total del año', '', '', '', '', pesos(p.totalAnual)] }])),
      h('p', { class: 'ayuda' }, p.nota));
    contenedor.append(tarjeta(`Presupuesto ${anio}`, cuerpo,
      h('div', { class: 'acciones' },
        boton('Imprimir', () => imprimir(`Presupuesto ${anio}`, cuerpo)),
        boton('Exportar CSV', () => descargar(`presupuesto-${anio}.csv`, csv([
          ['Mes', 'Personas', 'Nómina', 'Aportes', 'Provisión', 'Sale del banco'],
          ...p.meses.map((m) => [m.nombre, m.activos, m.nomina, m.aportes, m.provision, m.caja]),
        ]), 'text/csv')))));
  }

  // ——— 3. Impacto de un cambio de ley ———
  const trabajadores = contratos.map((c) => {
    const emp = store.empleado(c.empleadoId) || {};
    return {
      nombre: emp.nombre || '',
      salarioMes: calc.salarioMensualEquivalente(c, fecha),
      modalidad: c.modalidad,
      valorDia: c.valorDia,
      valorHora: c.valorHora,
      diasSemana: c.diasSemana,
      ...horasDelUltimoTrimestre(store, c, fecha),
    };
  });

  const estado = { escenario: 'dominical-100', alza: 10 };
  const salidaImpacto = h('div');
  const recalcularImpacto = () => {
    if (!trabajadores.length) {
      salidaImpacto.replaceChildren(h('p', { class: 'ayuda' }, 'Registra empleados y sus días para ver el impacto.'));
      return;
    }
    const r = impactoNormativo({
      trabajadores, escenario: estado.escenario, fecha, parametro: estado.alza / 100,
    });
    salidaImpacto.replaceChildren(
      h('div', { class: 'rejilla rejilla-3' },
        indicador('Hoy', pesos(r.antes), 'Al mes, por el concepto que cambia'),
        indicador('Después', pesos(r.despues), r.escenario.fecha ? `Desde ${formatoLargo(r.escenario.fecha)}` : ''),
        indicador('Diferencia', `${r.diferenciaMes >= 0 ? '+' : ''}${pesos(r.diferenciaMes)}`,
          `${r.porcentaje} % · ${pesos(r.diferenciaAnual)} al año`)),
      tabla([{ titulo: 'Trabajador' }, { titulo: 'Base del cálculo' }, { titulo: 'Hoy', clase: 'num' },
        { titulo: 'Después', clase: 'num' }, { titulo: 'Diferencia', clase: 'num' }],
      r.filas.map((f) => ({
        celdas: [f.nombre, f.concepto, pesos(f.antes), pesos(f.despues),
          h('strong', {}, `${f.diferencia >= 0 ? '+' : ''}${pesos(f.diferencia)}`)],
      }))),
      h('p', { class: 'ayuda' }, `${r.escenario.detalle} Fundamento: ${r.escenario.norma}.`),
      h('p', { class: 'ayuda' }, 'Las horas en día de descanso salen del promedio de los últimos tres meses registrados.'));
  };

  contenedor.append(tarjeta('¿Qué pasa cuando cambie la ley?',
    h('div', { class: 'rejilla rejilla-2' },
      campo('Escenario', seleccion(ESCENARIOS.map((e) => ({ value: e.id, label: e.nombre })), estado.escenario, {
        onChange: (e) => { estado.escenario = e.target.value; recalcularImpacto(); },
      })),
      campo('Alza del salario mínimo (%)', entrada({
        type: 'number', step: 0.5, value: estado.alza,
        onInput: (e) => { estado.alza = Number(e.target.value) || 0; recalcularImpacto(); },
      }), 'Solo aplica al escenario del salario mínimo.')),
    salidaImpacto));
  recalcularImpacto();

  return contenedor;
}

/** Promedio mensual de horas en día de descanso, extras y nocturnas. */
function horasDelUltimoTrimestre(store, contrato, fecha) {
  const novedades = store.novedades(contrato.id);
  const diaDescanso = Number(contrato.diaDescanso ?? 0);
  let descanso = 0;
  let extra = 0;
  let nocturna = 0;
  const desde = sumarMeses(fecha, -3);

  for (const [dia, nov] of Object.entries(novedades)) {
    if (dia < desde || dia > fecha) continue;
    if (nov.tipo !== 'trabajo' || !nov.inicio || !nov.fin) continue;
    try {
      const t = calc.clasificarTurno({
        fecha: dia, inicio: nov.inicio, fin: nov.fin,
        limiteOrdinarioDiario: calc.horasOrdinariasDia(contrato, dia), diaDescanso,
      });
      for (const s of t.segmentos) {
        if (s.descanso) descanso += s.horas;
        if (s.extra) extra += s.horas;
        if (s.nocturna && !s.extra) nocturna += s.horas;
      }
    } catch { /* turno inválido: se ignora */ }
  }
  return {
    horasDescansoMes: Math.round((descanso / 3) * 10) / 10,
    horasExtraMes: Math.round((extra / 3) * 10) / 10,
    horasNocturnasMes: Math.round((nocturna / 3) * 10) / 10,
  };
}

function indicador(titulo, valor, nota) {
  return h('div', { class: 'indicador' },
    h('span', { class: 'indicador-titulo' }, titulo),
    h('strong', {}, valor),
    h('small', { class: 'norma' }, nota));
}
