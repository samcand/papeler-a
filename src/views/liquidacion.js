/**
 * liquidacion.js (vista) — La cuenta final del contrato, explicada renglón
 * por renglón y con la norma que la sustenta.
 */

import {
  h, tarjeta, tabla, campo, entrada, seleccion, boton, pesos, numero, aviso,
  mensaje, vacio, formatoCorto, formatoLargo, hoy, imprimir, descargar, csv,
} from '../ui.js';
import { liquidacionFinal, MOTIVOS, sancionMoratoria } from '../liquidacion.js';
import { saldoVacaciones } from '../prestaciones.js';
import * as calc from '../calculo.js';
import * as ley from '../normativa.js';

export function vista(store, params = {}) {
  const contratos = store.contratos();
  if (!contratos.length) {
    return h('div', { class: 'vista' }, tarjeta('Liquidación final',
      vacio('No hay contratos para liquidar.',
        boton('Ir a Empleados', () => { window.location.hash = '#/empleados'; }, 'primario'))));
  }

  const contrato = store.contrato(params.id) || contratos[0];
  const empleado = store.empleado(contrato.empleadoId);
  const contenedor = h('div', { class: 'vista' });

  const salarioMensual = calc.salarioMensualEquivalente(contrato, hoy());
  const datos = {
    ingreso: contrato.inicio,
    terminacion: hoy(),
    tipoContrato: contrato.tipo || 'indefinido',
    finPactado: contrato.fin || '',
    motivo: 'renuncia',
    salarioMensual,
    promedioVariable: 0,
    auxilioTransporte: ley.tieneAuxilioTransporte(salarioMensual, hoy()) && contrato.auxilioTransporte !== false
      ? ley.auxilioTransporte(hoy()) : 0,
    salarioIntegral: !!contrato.salarioIntegral,
    cesantiasPagadasHasta: contrato.cesantiasPagadasHasta || '',
    primaPagadaHasta: contrato.primaPagadaHasta || '',
    diasVacacionesDisfrutados: Number(contrato.diasVacacionesDisfrutados) || 0,
    diasVacacionesCompensados: Number(contrato.diasVacacionesCompensados) || 0,
    diasSalarioPendientes: 0,
    otrosDevengados: 0,
    deducciones: 0,
    fechaPago: hoy(),
  };

  const salida = h('div');
  const recalcular = () => salida.replaceChildren(resultado(store, contrato, empleado, datos));
  const set = (k, num = false) => (e) => {
    datos[k] = num ? Number(e.target.value) || 0 : e.target.value;
    recalcular();
  };

  contenedor.append(h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Liquidación final'),
      h('p', { class: 'ayuda' }, empleado ? empleado.nombre : '', ' · ',
        `ingresó el ${formatoLargo(contrato.inicio)}`)),
    seleccion(contratos.map((c) => {
      const e = store.empleado(c.empleadoId);
      return { value: c.id, label: `${e ? e.nombre : c.id}${c.estado === 'terminado' ? ' (terminado)' : ''}` };
    }), contrato.id, { onChange: (e) => { window.location.hash = `#/liquidacion/${e.target.value}`; } })));

  contenedor.append(tarjeta('Datos de la terminación',
    h('div', { class: 'rejilla rejilla-3' },
      campo('Fecha de ingreso', entrada({ type: 'date', value: datos.ingreso, onInput: set('ingreso') })),
      campo('Fecha de terminación', entrada({ type: 'date', value: datos.terminacion, onInput: set('terminacion') })),
      campo('Motivo', seleccion(MOTIVOS.map((m) => ({ value: m.id, label: m.nombre })), datos.motivo, { onChange: set('motivo') }),
        'Solo el despido sin justa causa (y el indirecto) genera indemnización.')),
    h('div', { class: 'rejilla rejilla-3' },
      campo('Salario mensual', entrada({ type: 'number', step: 1000, value: datos.salarioMensual, onInput: set('salarioMensual', true) })),
      campo('Promedio de recargos y comisiones', entrada({ type: 'number', step: 1000, value: 0, onInput: set('promedioVariable', true) }),
        'Promedio mensual del último año: entra a la base de prestaciones.'),
      campo('Auxilio de transporte', entrada({ type: 'number', step: 1000, value: datos.auxilioTransporte, onInput: set('auxilioTransporte', true) }),
        'Entra a prima y cesantías; no a vacaciones.')),
    h('div', { class: 'rejilla rejilla-3' },
      campo('Cesantías consignadas hasta', entrada({ type: 'date', value: datos.cesantiasPagadasHasta, onInput: set('cesantiasPagadasHasta') })),
      campo('Prima pagada hasta', entrada({ type: 'date', value: datos.primaPagadaHasta, onInput: set('primaPagadaHasta') })),
      campo('Vacaciones disfrutadas (días)', entrada({ type: 'number', step: 0.5, value: datos.diasVacacionesDisfrutados, onInput: set('diasVacacionesDisfrutados', true) }))),
    h('div', { class: 'rejilla rejilla-3' },
      campo('Días de salario pendientes', entrada({ type: 'number', step: 1, value: 0, onInput: set('diasSalarioPendientes', true) }),
        'Los del último periodo que no se alcanzó a pagar.'),
      campo('Otros pagos', entrada({ type: 'number', step: 1000, value: 0, onInput: set('otrosDevengados', true) })),
      campo('Deducciones', entrada({ type: 'number', step: 1000, value: 0, onInput: set('deducciones', true) }),
        'Préstamos, anticipos, embargos.')),
    h('div', { class: 'rejilla rejilla-2' },
      campo('Fecha en que se paga', entrada({ type: 'date', value: datos.fechaPago, onInput: set('fechaPago') }),
        'Si es posterior a la terminación, corre la sanción del artículo 65 del CST.'),
      campo('Fin pactado (fijo u obra)', entrada({ type: 'date', value: datos.finPactado, onInput: set('finPactado') })))));

  contenedor.append(salida);
  recalcular();
  return contenedor;
}

function resultado(store, contrato, empleado, datos) {
  let r;
  try {
    r = liquidacionFinal(datos);
  } catch (error) {
    return tarjeta('No se pudo liquidar', aviso(error.message, 'error'));
  }

  const documento = h('div', { class: 'comprobante' },
    h('h2', {}, 'Liquidación definitiva del contrato de trabajo'),
    h('p', {}, h('strong', {}, store.estado.empresa.nombre || 'Empleador'),
      store.estado.empresa.nit ? ` · NIT ${store.estado.empresa.nit}` : ''),
    h('p', {}, `${empleado ? empleado.nombre : ''} · ${empleado?.tipoDocumento || 'CC'} ${empleado?.documento || ''}`),
    h('p', {}, `Del ${formatoLargo(r.ingreso)} al ${formatoLargo(r.terminacion)} · ${r.tiempoServicio}`),
    tabla([
      { titulo: 'Concepto' }, { titulo: 'Base', clase: 'num' }, { titulo: 'Días', clase: 'num' },
      { titulo: 'Cómo se calculó' }, { titulo: 'Valor', clase: 'num' },
    ], r.conceptos.map((c) => ({
      celdas: [
        h('span', {}, c.concepto, c.norma ? h('small', { class: 'norma' }, ` ${c.norma}`) : null),
        c.base ? pesos(c.base) : '—',
        c.dias !== undefined ? numero(c.dias, 2) : '—',
        c.formula || '',
        pesos(c.valor),
      ],
    })).concat([
      { clase: 'total', celdas: ['Total devengado', '', '', '', pesos(r.totalDevengado)] },
      ...(r.deducciones ? [{ celdas: ['Deducciones', '', '', '', pesos(-r.deducciones)] }] : []),
      { clase: 'total', celdas: ['Neto a pagar', '', '', '', pesos(r.neto)] },
    ])),
    h('ul', { class: 'lista-legal' }, ...r.resumenLegal.map((t) => h('li', {}, t))));

  return h('div', {},
    r.avisos.length ? tarjeta('Ojo con esto', ...r.avisos.map((a) => aviso(a, 'alerta'))) : null,
    tarjeta('', documento,
      h('div', { class: 'acciones acciones-envueltas' },
        boton('Imprimir liquidación', () => imprimir(`Liquidación ${empleado?.nombre || ''}`, documento), 'primario'),
        boton('Exportar CSV', () => {
          const filas = [['Concepto', 'Base', 'Días', 'Cálculo', 'Valor']];
          for (const c of r.conceptos) filas.push([c.concepto, c.base || '', c.dias ?? '', c.formula || '', c.valor]);
          filas.push(['Neto', '', '', '', r.neto]);
          descargar(`liquidacion-${empleado?.documento || contrato.id}.csv`, csv(filas), 'text/csv');
        }),
        boton('Guardar y marcar contrato terminado', () => {
          store.registrarLiquidacion({
            contratoId: contrato.id, ...datos, total: r.neto, conceptos: r.conceptos, fecha: hoy(),
          });
          store.guardarContrato({ id: contrato.id, estado: 'terminado', terminacion: datos.terminacion, motivoTerminacion: datos.motivo });
          mensaje('Liquidación guardada y contrato cerrado.');
        }, 'primario'))),
    tarjeta('De dónde sale cada cifra',
      tabla([{ titulo: 'Concepto' }, { titulo: 'Periodo que se liquida' }, { titulo: 'Días' }], [
        { celdas: ['Cesantías e intereses', `Desde ${formatoCorto(r.detalleCortes.cesantiasDesde)} hasta ${formatoCorto(r.terminacion)}`, r.detalleCortes.diasCesantias] },
        { celdas: ['Prima de servicios', `Desde ${formatoCorto(r.detalleCortes.primaDesde)} hasta ${formatoCorto(r.terminacion)}`, r.detalleCortes.diasPrima] },
        { celdas: ['Vacaciones', `Causadas ${r.detalleCortes.vacaciones.causados} días, disfrutadas ${r.detalleCortes.vacaciones.disfrutados}`, r.detalleCortes.vacaciones.pendientes] },
      ]),
      h('p', { class: 'ayuda' },
        'Base de prima y cesantías: ', h('strong', {}, pesos(r.base.conAuxilio)),
        ' (salario + promedio variable + auxilio de transporte). Base de vacaciones: ',
        h('strong', {}, pesos(r.base.sinAuxilio)), ' (sin auxilio, CST art. 192).')),
    r.indemnizacion ? tarjeta('Indemnización',
      h('p', {}, r.indemnizacion.detalle),
      r.indemnizacion.regla ? h('p', { class: 'ayuda' }, r.indemnizacion.regla) : null,
      h('p', {}, `${numero(r.indemnizacion.dias, 2)} días · `, h('strong', {}, pesos(r.indemnizacion.valor)),
        h('small', { class: 'norma' }, ` ${r.indemnizacion.norma}`)),
      h('p', { class: 'ayuda' }, 'La indemnización no es salario: no se le descuenta seguridad social, pero sí puede tener retención en la fuente si el salario supera 204 UVT mensuales (E.T. art. 401-3).')) : null,
    tarjeta('Si el pago se demora',
      h('p', {}, 'El artículo 65 del CST castiga el pago tardío con un día de salario por cada día de mora, hasta 24 meses.'),
      tabla([{ titulo: 'Si paga el' }, { titulo: 'Días de mora', clase: 'num' }, { titulo: 'Sanción', clase: 'num' }],
        [30, 60, 90, 180].map((d) => {
          const fecha = sumarDiasISO(datos.terminacion, d);
          const s = sancionMoratoria({ salarioMensual: datos.salarioMensual, terminacion: datos.terminacion, fechaPago: fecha });
          return { celdas: [formatoCorto(fecha), String(s.diasRetardo), pesos(s.valor)] };
        }))));
}

function sumarDiasISO(iso, dias) {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + dias, 12);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
