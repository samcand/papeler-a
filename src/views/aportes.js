/**
 * aportes.js (vista) — La planilla PILA del mes y la revisión previa al pago.
 */

import {
  h, tarjeta, tabla, campo, entrada, seleccion, boton, pesos, numero, chip,
  mensaje, aviso, vacio, formatoCorto, formatoLargo, hoy, imprimir, descargar, csv, modal,
} from '../ui.js';
import { sumarMeses, finDeMes, MESES } from '../fechas.js';
import { liquidarPeriodo } from '../nomina.js';
import * as pila from '../pila.js';
import * as ugpp from '../ugpp.js';

export function vista(store, params = {}) {
  const contenedor = h('div', { class: 'vista' });
  const mes = params.id && /^\d{4}-\d{2}$/.test(params.id) ? params.id : hoy().slice(0, 7);
  const contratos = store.contratos();
  const empresa = store.estado.empresa;

  contenedor.append(h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Aportes y control'),
      h('p', { class: 'ayuda' }, 'La planilla del mes y la revisión de lo que la UGPP suele encontrar.')),
    h('div', { class: 'acciones' },
      boton('◀', () => { window.location.hash = `#/aportes/${sumarMeses(`${mes}-01`, -1).slice(0, 7)}`; }),
      h('strong', { class: 'mes-titulo' }, `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`),
      boton('▶', () => { window.location.hash = `#/aportes/${sumarMeses(`${mes}-01`, 1).slice(0, 7)}`; }))));

  // ——— Planilla del mes ———
  const desde = `${mes}-01`;
  const hasta = finDeMes(desde);
  const lineas = [];
  const errores = [];

  for (const c of contratos) {
    const fin = c.terminacion || (c.estado === 'terminado' ? c.fin : '') || '9999-12-31';
    if (c.inicio > hasta || fin < desde) continue;
    const empleado = store.empleado(c.empleadoId) || {};
    try {
      const resultado = liquidarPeriodo({
        contrato: c, empresa, desde, hasta, novedades: store.novedades(c.id),
      });
      lineas.push(pila.lineaCotizante({ contrato: c, empleado, resultado, empresa }));
    } catch (error) {
      errores.push(`${empleado.nombre || c.id}: ${error.message}`);
    }
  }

  if (!lineas.length) {
    contenedor.append(tarjeta('Planilla del mes',
      vacio('No hay contratos vigentes en este mes.')));
  } else {
    const planilla = pila.armarPlanilla({ empresa, mes, lineas });
    contenedor.append(planillaVista(store, planilla, mes));
  }
  if (errores.length) contenedor.append(tarjeta('No se pudo liquidar', ...errores.map((e) => aviso(e, 'error'))));

  // ——— Autoauditoría ———
  const revision = ugpp.auditar({
    empresa,
    contratos,
    empleado: (id) => store.empleado(id),
    nominas: store.nominas(),
    hasta: hoy(),
  });
  contenedor.append(auditoria(revision));

  return contenedor;
}

function planillaVista(store, planilla, mes) {
  const e = planilla.encabezado;
  const t = planilla.totales;

  const resumen = h('div', { class: 'comprobante' },
    h('h2', {}, `Planilla de aportes — ${mes}`),
    h('p', {}, h('strong', {}, e.razonSocial || 'Aportante'), e.documentoAportante ? ` · NIT ${e.documentoAportante}` : ''),
    h('p', {}, `${e.numeroCotizantes} cotizante(s) · planilla tipo ${e.modalidadPlanilla} · periodo salud y pensión ${e.periodoSalud}`),
    tabla([
      { titulo: 'Trabajador' }, { titulo: 'Tipo cot.' }, { titulo: 'Días', clase: 'num' }, { titulo: 'IBC', clase: 'num' },
      { titulo: 'Pensión', clase: 'num' }, { titulo: 'Salud', clase: 'num' }, { titulo: 'ARL', clase: 'num' },
      { titulo: 'Caja', clase: 'num' }, { titulo: 'SENA', clase: 'num' }, { titulo: 'ICBF', clase: 'num' },
      { titulo: 'Novedades' },
    ], planilla.lineas.map((l) => ({
      celdas: [
        h('div', {}, l.nombre, h('p', { class: 'norma' }, `${l.tipoDocumento} ${l.documento}`)),
        l.tipoCotizante,
        String(l.diasCotizadosSalud),
        pesos(l.ibcSalud),
        pesos(l.cotizacionPension + l.aporteFsp),
        pesos(l.cotizacionSalud),
        pesos(l.cotizacionArl),
        pesos(l.aporteCcf),
        pesos(l.aporteSena),
        pesos(l.aporteIcbf),
        h('div', { class: 'chips' }, ...l.novedades.map((n) => chip(
          `${n.codigo}${n.dias ? ` ${n.dias}d` : ''}`,
          n.codigo === 'ING' || n.codigo === 'RET' ? 'ok' : 'alerta',
        ))),
      ],
    })).concat([{
      clase: 'total',
      celdas: ['TOTALES', '', '', '', pesos(t.pension + t.fsp), pesos(t.salud), pesos(t.arl),
        pesos(t.ccf), pesos(t.sena), pesos(t.icbf), ''],
    }])),
    h('p', { class: 'neto' }, 'Total a pagar: ', h('strong', {}, pesos(t.general))));

  return h('div', {},
    planilla.avisos.length
      ? tarjeta('La planilla tiene observaciones', ...planilla.avisos.map((a) => aviso(a, 'alerta')))
      : null,
    tarjeta('', resumen,
      h('div', { class: 'acciones acciones-envueltas' },
        boton('Imprimir', () => imprimir(`Planilla ${mes}`, resumen), 'primario'),
        boton('Exportar CSV', () => {
          descargar(`pila-${mes}.csv`, csv(pila.aFilasCsv(planilla)), 'text/csv');
          mensaje('Archivo descargado.');
        }, 'primario'),
        boton('Archivo plano', () => descargarPlano(planilla, mes)),
        boton('Ver estructura del archivo', () => verEstructura()))),
    tarjeta('Novedades que reporta la planilla',
      tabla([{ titulo: 'Código' }, { titulo: 'Qué es' }, { titulo: 'De dónde la saca la app' }],
        pila.NOVEDADES.filter((n) => planilla.lineas.some((l) => l.novedades.some((x) => x.codigo === n.codigo))
          || ['ING', 'RET', 'IGE', 'VAC', 'SLN', 'LMA', 'IRL'].includes(n.codigo))
          .map((n) => ({ celdas: [chip(n.codigo, 'gris'), n.nombre, n.origen] }))),
      h('p', { class: 'ayuda' }, `Fundamento: ${planilla.norma}.`)));
}

function descargarPlano(planilla, mes) {
  const contenido = pila.aArchivoPlano(planilla);
  const dlg = modal('Archivo plano de la PILA', h('div', {},
    aviso('El orden y la longitud de los campos están en los anexos técnicos de la Resolución 2388 de 2016, que cada operador '
      + 'actualiza. Antes del primer cargue, coteja la estructura con el anexo vigente de tu operador: la tabla se edita en '
      + 'src/pila.js sin tocar el cálculo.', 'alerta'),
    h('p', {}, `${planilla.lineas.length} registro(s), ${contenido.split('\r\n')[0]?.length || 0} caracteres cada uno.`),
    h('pre', { class: 'plano' }, contenido.slice(0, 600) + (contenido.length > 600 ? '\n…' : ''))),
  [
    boton('Cancelar', () => dlg.cerrar()),
    boton('Descargar de todos modos', () => {
      descargar(`pila-${mes}.txt`, contenido, 'text/plain');
      dlg.cerrar();
      mensaje('Archivo descargado. Valídalo con tu operador antes de pagar.');
    }, 'primario'),
  ]);
}

function verEstructura() {
  const dlg = modal('Estructura del registro tipo 2', h('div', {},
    h('p', { class: 'ayuda' }, 'Un campo por fila, en el orden en que salen al archivo. Se edita en src/pila.js.'),
    tabla([{ titulo: '#' }, { titulo: 'Campo' }, { titulo: 'Largo', clase: 'num' }],
      pila.CAMPOS_REGISTRO_2.map((c) => ({ celdas: [String(c.n), c.nombre, String(c.largo)] })))),
  [boton('Cerrar', () => dlg.cerrar(), 'primario')]);
}

function auditoria(revision) {
  const r = revision.resumen;
  const contenido = h('div', {});

  contenido.append(h('div', { class: 'rejilla rejilla-4' },
    indicador('Hallazgos altos', String(r.alto), r.alto ? 'Corrige antes de pagar' : 'Nada urgente'),
    indicador('Hallazgos medios', String(r.medio), 'Revisa cuando puedas'),
    indicador('Aportes en discusión', revision.exposicion ? pesos(revision.exposicion) : '—', 'Diferencia estimada'),
    indicador('Sanción posible', revision.sancionEstimada
      ? `${pesos(revision.sancionEstimada.minima)} a ${pesos(revision.sancionEstimada.maxima)}`
      : '—', 'Del 35 % al 200 % (Ley 1819 de 2016)')));

  if (!revision.hallazgos.length) {
    contenido.append(aviso('No se encontraron los errores que la UGPP suele buscar. Igual conserva los soportes de cada pago.', 'info'));
  } else {
    contenido.append(tabla([{ titulo: 'Nivel' }, { titulo: 'Hallazgo' }, { titulo: 'Norma' }],
      revision.hallazgos.map((hh) => ({
        celdas: [
          chip(hh.nivel, hh.nivel === 'alto' ? 'error' : 'alerta'),
          h('div', {}, h('strong', {}, hh.titulo), h('p', { class: 'ayuda' }, hh.detalle),
            hh.sugerencia ? h('p', { class: 'ayuda' }, `→ ${hh.sugerencia}`) : null),
          h('span', { class: 'norma' }, hh.norma || ''),
        ],
      }))));
  }

  contenido.append(h('h3', {}, 'Qué revisa esta pantalla'),
    h('ul', { class: 'lista-guia' }, ...revision.revisiones.map((x) => h('li', {}, x.titulo))),
    h('p', { class: 'ayuda' },
      'No reemplaza una auditoría: revisa lo que la app puede ver. Los soportes de pago, los contratos de prestación de '
      + 'servicios y los pagos hechos por fuera de la nómina hay que revisarlos aparte.'));

  return tarjeta('Revisión antes de pagar (UGPP)', contenido);
}

function indicador(titulo, valor, nota) {
  return h('div', { class: 'indicador' },
    h('span', { class: 'indicador-titulo' }, titulo),
    h('strong', {}, valor),
    h('small', { class: 'norma' }, nota));
}
