/**
 * nomina.js (vista) — Liquidar el periodo y sacar el comprobante de pago.
 */

import {
  h, tarjeta, tabla, campo, entrada, seleccion, boton, pesos, numero, chip,
  mensaje, aviso, vacio, formatoCorto, formatoLargo, hoy, inicioDeMes, finDeMes,
  imprimir, descargar, csv, modal,
} from '../ui.js';
import { sumarMeses, sumarDias, MESES } from '../fechas.js';
import { liquidarPeriodo } from '../nomina.js';
import { registroSuplementario, aFilasCsv as extrasCsv } from '../extras.js';
import * as ley from '../normativa.js';

export function vista(store, params = {}) {
  const contratos = store.contratosActivos();
  if (!contratos.length) {
    return h('div', { class: 'vista' }, tarjeta('Nómina',
      vacio('Primero crea un empleado con contrato.',
        boton('Ir a Empleados', () => { window.location.hash = '#/empleados'; }, 'primario'))));
  }

  const contrato = store.contrato(params.id) || contratos[0];
  const empleado = store.empleado(contrato.empleadoId);
  const mes = params.mes || hoy().slice(0, 7);
  const contenedor = h('div', { class: 'vista' });

  const periodo = {
    desde: `${mes}-01`,
    hasta: finDeMes(`${mes}-01`),
    tipo: 'mensual',
  };
  const extras = {
    comisiones: 0, bonificaciones: 0, noSalariales: 0,
    deducciones: [], tieneDependientes: false, calcularRetencion: true,
  };

  const salida = h('div');
  const recalcular = () => {
    salida.replaceChildren(resultado(store, contrato, empleado, periodo, extras));
  };

  contenedor.append(h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Nómina del periodo'),
      h('p', { class: 'ayuda' }, empleado ? empleado.nombre : '')),
    h('div', { class: 'acciones' },
      seleccion(contratos.map((c) => {
        const e = store.empleado(c.empleadoId);
        return { value: c.id, label: e ? e.nombre : c.id };
      }), contrato.id, { onChange: (e) => { window.location.hash = `#/nomina/${e.target.value}/${mes}`; } }))));

  const desdeInput = entrada({ type: 'date', value: periodo.desde, onInput: (e) => { periodo.desde = e.target.value; recalcular(); } });
  const hastaInput = entrada({ type: 'date', value: periodo.hasta, onInput: (e) => { periodo.hasta = e.target.value; recalcular(); } });

  const controles = h('div', { class: 'rejilla rejilla-4' },
    campo('Periodo', seleccion([
      { value: 'mensual', label: 'Mes completo' },
      { value: 'primera', label: 'Primera quincena' },
      { value: 'segunda', label: 'Segunda quincena' },
      { value: 'libre', label: 'Fechas libres' },
    ], periodo.tipo, {
      onChange: (e) => {
        periodo.tipo = e.target.value;
        if (periodo.tipo === 'mensual') { periodo.desde = `${mes}-01`; periodo.hasta = finDeMes(`${mes}-01`); }
        if (periodo.tipo === 'primera') { periodo.desde = `${mes}-01`; periodo.hasta = `${mes}-15`; }
        if (periodo.tipo === 'segunda') { periodo.desde = `${mes}-16`; periodo.hasta = finDeMes(`${mes}-01`); }
        desdeInput.value = periodo.desde; hastaInput.value = periodo.hasta;
        recalcular();
      },
    })),
    campo('Desde', desdeInput),
    campo('Hasta', hastaInput),
    campo('Mes', h('div', { class: 'acciones' },
      boton('◀', () => { window.location.hash = `#/nomina/${contrato.id}/${sumarMeses(`${mes}-01`, -1).slice(0, 7)}`; }),
      h('strong', { class: 'mes-titulo' }, `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`),
      boton('▶', () => { window.location.hash = `#/nomina/${contrato.id}/${sumarMeses(`${mes}-01`, 1).slice(0, 7)}`; }))));
  contenedor.append(tarjeta('', controles,
    h('div', { class: 'rejilla rejilla-4' },
      campo('Comisiones', entrada({ type: 'number', min: 0, step: 1000, value: 0, onInput: (e) => { extras.comisiones = Number(e.target.value) || 0; recalcular(); } }), 'Son salario: entran al IBC y a las prestaciones.'),
      campo('Bonificaciones salariales', entrada({ type: 'number', min: 0, step: 1000, value: 0, onInput: (e) => { extras.bonificaciones = Number(e.target.value) || 0; recalcular(); } })),
      campo('Pagos no salariales', entrada({ type: 'number', min: 0, step: 1000, value: 0, onInput: (e) => { extras.noSalariales = Number(e.target.value) || 0; recalcular(); } }), 'Tope del 40 % (Ley 1393 de 2010).'),
      campo('Otras deducciones', entrada({ type: 'number', min: 0, step: 1000, value: 0, onInput: (e) => { extras.deducciones = [{ concepto: 'Otras deducciones', valor: Number(e.target.value) || 0 }]; recalcular(); } }), 'Préstamos, libranzas, embargos.'))));

  contenedor.append(salida);
  recalcular();
  return contenedor;
}

function resultado(store, contrato, empleado, periodo, extras) {
  let r;
  try {
    r = liquidarPeriodo({
      contrato,
      empresa: store.estado.empresa,
      desde: periodo.desde,
      hasta: periodo.hasta,
      novedades: store.novedades(contrato.id),
      extras,
    });
  } catch (error) {
    return tarjeta('No se pudo liquidar', aviso(error.message, 'error'));
  }

  const comprobante = h('div', { class: 'comprobante' },
    h('h2', {}, 'Comprobante de pago de nómina'),
    h('p', {}, h('strong', {}, store.estado.empresa.nombre || 'Empleador'),
      store.estado.empresa.nit ? ` · NIT ${store.estado.empresa.nit}` : ''),
    h('p', {}, `${empleado ? empleado.nombre : ''} · ${empleado?.tipoDocumento || 'CC'} ${empleado?.documento || ''} · ${empleado?.cargo || ''}`),
    h('p', {}, `Periodo del ${formatoLargo(r.desde)} al ${formatoLargo(r.hasta)} · ${r.diasSalario} días de salario`),
    tabla([{ titulo: 'Devengado' }, { titulo: 'Detalle' }, { titulo: 'Valor', clase: 'num' }],
      r.devengados.map((d) => ({
        celdas: [h('span', {}, d.concepto, d.norma ? h('small', { class: 'norma' }, ` ${d.norma}`) : null),
          d.detalle || '', pesos(d.valor)],
      })).concat([{
        clase: 'total',
        celdas: ['Total devengado', '', pesos(r.totalDevengado)],
      }])),
    tabla([{ titulo: 'Deducción' }, { titulo: 'Detalle' }, { titulo: 'Valor', clase: 'num' }],
      r.deducciones.map((d) => ({
        celdas: [h('span', {}, d.concepto, d.norma ? h('small', { class: 'norma' }, ` ${d.norma}`) : null), '', pesos(d.valor)],
      })).concat([{
        clase: 'total',
        celdas: ['Total deducciones', '', pesos(r.totalDeducciones)],
      }])),
    h('p', { class: 'neto' }, 'Neto a pagar: ', h('strong', {}, pesos(r.neto))));

  const acciones = h('div', { class: 'acciones acciones-envueltas' },
    boton('Imprimir comprobante', () => imprimir(`Comprobante ${empleado?.nombre || ''}`, comprobante), 'primario'),
    boton('Exportar CSV', () => {
      const filas = [['Concepto', 'Detalle', 'Valor']];
      for (const d of r.devengados) filas.push([d.concepto, d.detalle || '', d.valor]);
      filas.push(['Total devengado', '', r.totalDevengado]);
      for (const d of r.deducciones) filas.push([d.concepto, '', -d.valor]);
      filas.push(['Neto', '', r.neto]);
      descargar(`nomina-${empleado?.documento || contrato.id}-${r.desde}.csv`, csv(filas), 'text/csv');
    }),
    boton('Registrar como pagada', () => registrarPago(store, contrato, r), 'primario'));

  const yaPagada = store.nominas(contrato.id).find((n) => n.desde === r.desde && n.hasta === r.hasta);

  return h('div', {},
    r.avisos.length ? tarjeta('Avisos', ...r.avisos.map((a) => aviso(a, 'alerta'))) : null,
    tarjeta('', comprobante, acciones,
      yaPagada ? h('p', { class: 'ayuda' }, `Ya registrada como ${yaPagada.pagado ? 'pagada' : 'pendiente'} el ${formatoCorto(yaPagada.fechaPago || yaPagada.hasta)}.`) : null),
    tarjeta('Seguridad social y parafiscales (planilla PILA)',
      h('p', {}, 'IBC del periodo: ', h('strong', {}, pesos(r.ibc)),
        ` · ${r.diasCotizados} días cotizados`,
        r.aportes.aplicaExoneracion ? h('small', { class: 'norma' }, ' · Exonerado de salud del empleador, SENA e ICBF (E.T. art. 114-1)') : null),
      tabla([{ titulo: 'Aporte' }, { titulo: 'Trabajador', clase: 'num' }, { titulo: 'Empleador', clase: 'num' }], [
        { celdas: ['Salud', pesos(r.aportes.trabajador.salud), pesos(r.aportes.empleador.salud)] },
        { celdas: ['Pensión', pesos(r.aportes.trabajador.pension), pesos(r.aportes.empleador.pension)] },
        { celdas: ['Fondo de solidaridad', pesos(r.aportes.trabajador.fsp), '—'] },
        { celdas: [`ARL (clase ${contrato.claseArl || 'I'}, ${numero(r.aportes.tarifas.arl * 100, 3)} %)`, '—', pesos(r.aportes.empleador.arl)] },
        { celdas: ['Caja de compensación', '—', pesos(r.aportes.empleador.caja)] },
        { celdas: ['ICBF', '—', pesos(r.aportes.empleador.icbf)] },
        { celdas: ['SENA', '—', pesos(r.aportes.empleador.sena)] },
        { clase: 'total', celdas: ['Total', pesos(r.aportes.trabajador.total), pesos(r.aportes.empleador.total)] },
      ])),
    tarjeta('Lo que cuesta el empleado',
      tabla([{ titulo: 'Concepto' }, { titulo: 'Valor', clase: 'num' }], [
        { celdas: ['Pagado al trabajador', pesos(r.totalDevengado)] },
        { celdas: ['Aportes del empleador', pesos(r.aportes.empleador.total)] },
        { celdas: ['Provisión de prima (8,33 %)', pesos(r.provisiones.prima)] },
        { celdas: ['Provisión de cesantías (8,33 %)', pesos(r.provisiones.cesantias)] },
        { celdas: ['Provisión de intereses (1 %)', pesos(r.provisiones.intereses)] },
        { celdas: ['Provisión de vacaciones (4,17 %)', pesos(r.provisiones.vacaciones)] },
        { clase: 'total', celdas: ['Costo total del periodo', pesos(r.costoTotal)] },
      ]),
      h('p', { class: 'ayuda' }, r.provisiones.nota)),
    r.retencion ? tarjeta('Retención en la fuente',
      r.retencion.retencion > 0
        ? tabla([{ titulo: 'Paso' }, { titulo: 'Valor', clase: 'num' }],
          r.retencion.pasos.map((p) => ({ celdas: [p.paso + (p.uvt ? ` (${p.uvt} UVT)` : ''), pesos(p.valor)] })))
        : h('p', {}, `No hay retención: la base gravable (${numero(r.retencion.baseUvt, 2)} UVT) no pasa de 95 UVT, que este año son ${pesos(95 * r.retencion.valorUvt)}.`),
      h('p', { class: 'ayuda' }, r.retencion.nota)) : null,
    registroExtras(store, contrato, empleado, r),
    tarjeta('Día por día',
      tabla([{ titulo: 'Fecha' }, { titulo: 'Tipo' }, { titulo: 'Horario' }, { titulo: 'Horas', clase: 'num' }, { titulo: 'Recargos', clase: 'num' }],
        r.detalleDias.filter((d) => d.tipo !== 'descanso' || d.valor).map((d) => ({
          celdas: [
            h('span', {}, formatoCorto(d.fecha), d.festivo ? h('small', { class: 'norma' }, ` ★ ${d.festivo}`) : null),
            d.nombreTipo,
            d.inicio ? `${d.inicio}–${d.fin}` : '—',
            d.horas ? numero(d.horas, 2) : '—',
            d.valor ? pesos(d.valor) : '—',
          ],
        })))),
    tarjeta('Con qué parámetros se liquidó',
      tabla([{ titulo: 'Parámetro' }, { titulo: 'Valor' }], [
        { celdas: ['Salario mínimo', pesos(r.parametros.smmlv)] },
        { celdas: ['Auxilio de transporte', pesos(r.parametros.auxilioTransporte)] },
        { celdas: [`Jornada máxima (${r.parametros.jornada.norma})`, `${r.parametros.jornada.horasSemana} h/semana · divisor ${r.parametros.jornada.divisor}`] },
        { celdas: ['Valor de la hora ordinaria', pesos(r.parametros.valorHora)] },
        { celdas: ['Valor del día', pesos(r.parametros.valorDia)] },
        { celdas: [`Recargo dominical y festivo (${r.parametros.recargoDescanso.norma})`, `${Math.round(r.parametros.recargoDescanso.factor * 100)} %`] },
        { celdas: ['Jornada nocturna', `desde las ${r.parametros.franjaDiurna.finDiurna}:00 (${r.parametros.franjaDiurna.norma})`] },
      ])));
}

/**
 * Registro de trabajo suplementario: la Ley 2466 de 2025 obliga a llevarlo y a
 * entregárselo al trabajador junto con el soporte del pago.
 */
function registroExtras(store, contrato, empleado, r) {
  const registro = registroSuplementario({
    contrato, empleado, desde: r.desde, hasta: r.hasta, novedades: store.novedades(contrato.id),
  });
  if (!registro.filas.length) return null;

  const t = registro.totales;
  const hoja = h('div', { class: 'comprobante' },
    h('h2', {}, 'Registro de trabajo suplementario'),
    h('p', {}, h('strong', {}, store.estado.empresa.nombre || 'Empleador'),
      store.estado.empresa.nit ? ` · NIT ${store.estado.empresa.nit}` : ''),
    h('p', {}, `${empleado?.nombre || ''} · ${empleado?.tipoDocumento || 'CC'} ${empleado?.documento || ''}`),
    h('p', {}, `Del ${formatoLargo(r.desde)} al ${formatoLargo(r.hasta)}`),
    tabla([
      { titulo: 'Fecha' }, { titulo: 'Actividad' }, { titulo: 'Horario' },
      { titulo: 'Extra diurna', clase: 'num' }, { titulo: 'Extra nocturna', clase: 'num' },
      { titulo: 'Recargo nocturno', clase: 'num' }, { titulo: 'En descanso', clase: 'num' },
      { titulo: 'Valor', clase: 'num' },
    ], registro.filas.map((f) => ({
      celdas: [
        h('span', {}, formatoCorto(f.fecha), f.festivo ? h('small', { class: 'norma' }, ` ★ ${f.festivo}`) : null),
        f.actividad, f.horario,
        f.extraDiurna ? numero(f.extraDiurna, 2) : '—',
        f.extraNocturna ? numero(f.extraNocturna, 2) : '—',
        f.recargoNocturno ? numero(f.recargoNocturno, 2) : '—',
        (f.descansoDiurna + f.descansoNocturna) ? numero(f.descansoDiurna + f.descansoNocturna, 2) : '—',
        pesos(f.valor),
      ],
    })).concat([{
      clase: 'total',
      celdas: ['Totales', '', '', numero(t.extraDiurna, 2), numero(t.extraNocturna, 2),
        numero(t.recargoNocturno, 2), numero(t.descansoDiurna + t.descansoNocturna, 2), pesos(t.valor)],
    }])),
    h('p', { class: 'ayuda' }, registro.nota),
    h('div', { class: 'firmas' },
      h('div', { class: 'firma' }, h('div', { class: 'firma-linea' }), h('strong', {}, 'EL EMPLEADOR')),
      h('div', { class: 'firma' }, h('div', { class: 'firma-linea' }), h('strong', {}, 'EL TRABAJADOR'),
        h('p', {}, 'Recibí este registro con el soporte del pago'))));

  return tarjeta('Registro de trabajo suplementario',
    registro.avisos.length ? h('div', {}, ...registro.avisos.map((a) => aviso(a, 'alerta'))) : null,
    hoja,
    h('div', { class: 'acciones acciones-envueltas' },
      boton('Imprimir el registro', () => imprimir('Registro de trabajo suplementario', hoja), 'primario'),
      boton('Exportar CSV', () => descargar(
        `horas-extra-${empleado?.documento || contrato.id}-${r.desde}.csv`,
        csv(extrasCsv(registro)), 'text/csv',
      ))),
    h('p', { class: 'ayuda' }, `Fundamento: ${registro.norma}.`));
}

function registrarPago(store, contrato, r) {
  const datos = { fechaPago: hoy(), medio: 'transferencia', pagado: true };
  const cuerpo = h('div', { class: 'formulario' },
    h('p', {}, `Neto a pagar: `, h('strong', {}, pesos(r.neto))),
    campo('Fecha de pago', entrada({ type: 'date', value: datos.fechaPago, onInput: (e) => { datos.fechaPago = e.target.value; } })),
    campo('Medio', seleccion([
      { value: 'transferencia', label: 'Transferencia' },
      { value: 'efectivo', label: 'Efectivo' },
      { value: 'cheque', label: 'Cheque' },
    ], datos.medio, { onChange: (e) => { datos.medio = e.target.value; } })),
    h('p', { class: 'ayuda' }, 'Queda guardado en el historial de pagos, con el detalle del periodo.'));

  const dlg = modal('Registrar el pago', cuerpo, [
    boton('Cancelar', () => dlg.cerrar()),
    boton('Guardar', () => {
      store.registrarNomina({
        contratoId: contrato.id,
        desde: r.desde,
        hasta: r.hasta,
        neto: r.neto,
        totalDevengado: r.totalDevengado,
        totalDeducciones: r.totalDeducciones,
        ibc: r.ibc,
        aportes: r.aportes,
        costoTotal: r.costoTotal,
        devengados: r.devengados,
        deducciones: r.deducciones,
        ...datos,
      });
      dlg.cerrar();
      mensaje('Pago registrado.');
    }, 'primario'),
  ]);
}
