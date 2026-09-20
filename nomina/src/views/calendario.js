/**
 * calendario.js — Festivos del año, fechas límite de ley y pagos registrados.
 */

import { h, tarjeta, tabla, boton, chip, pesos, formatoCorto, formatoLargo, hoy, DIAS, seleccion } from '../ui.js';
import { festivos } from '../festivos.js';
import { obligacionesDelAnio } from '../prestaciones.js';
import { diasCalendario, diaSemana } from '../fechas.js';
import * as ley from '../normativa.js';

export function vista(store, params = {}) {
  const anio = Number(params.anio) || Number(hoy().slice(0, 4));
  const contenedor = h('div', { class: 'vista' });

  contenedor.append(h('div', { class: 'barra' },
    h('h1', {}, `Calendario ${anio}`),
    h('div', { class: 'acciones' },
      boton('◀', () => { window.location.hash = `#/calendario/${anio - 1}`; }),
      boton('Hoy', () => { window.location.hash = `#/calendario/${hoy().slice(0, 4)}`; }),
      boton('▶', () => { window.location.hash = `#/calendario/${anio + 1}`; }))));

  // ——— Obligaciones ———
  contenedor.append(tarjeta('Fechas que impone la ley',
    tabla([{ titulo: 'Fecha' }, { titulo: 'Obligación' }, { titulo: 'Norma' }, { titulo: 'Estado' }],
      obligacionesDelAnio(anio).map((o) => ({
        celdas: [
          formatoCorto(o.fecha),
          o.titulo,
          h('span', { class: 'norma' }, o.norma),
          o.fecha < hoy() ? chip('Pasó', 'gris') : chip(`En ${diasCalendario(hoy(), o.fecha)} días`, 'ok'),
        ],
      }))),
    h('p', { class: 'ayuda' },
      'Las cesantías se consignan en el fondo antes del 15 de febrero; si no, la sanción es un día de salario por cada día de retardo (Ley 50 de 1990, art. 99).')));

  // ——— Cambios normativos programados ———
  const cambios = ley.CAMBIOS_PROGRAMADOS.filter((c) => c.fecha.startsWith(String(anio)) || c.fecha > hoy());
  if (cambios.length) {
    contenedor.append(tarjeta('Cambios de ley con fecha puesta',
      tabla([{ titulo: 'Desde' }, { titulo: 'Qué cambia' }, { titulo: 'Norma' }],
        cambios.map((c) => ({
          celdas: [formatoCorto(c.fecha), h('div', {}, h('strong', {}, c.titulo), h('p', { class: 'ayuda' }, c.detalle)), h('span', { class: 'norma' }, c.norma)],
        })))));
  }

  // ——— Festivos ———
  const lista = festivos(anio);
  contenedor.append(tarjeta(`Festivos (${lista.length})`,
    tabla([{ titulo: 'Fecha' }, { titulo: 'Día' }, { titulo: 'Festivo' }, { titulo: 'Tipo' }],
      lista.map((f) => ({
        clase: f.fecha < hoy() ? 'pasado' : '',
        celdas: [
          formatoCorto(f.fecha),
          DIAS[diaSemana(f.fecha)],
          f.nombre,
          f.tipo === 'trasladado' ? chip('Trasladado al lunes', 'gris')
            : f.tipo === 'movil' ? chip('Depende de la Pascua', 'gris') : chip('Fijo', 'gris'),
        ],
      }))),
    h('p', { class: 'ayuda' },
      'Trabajar un festivo se paga con el recargo del ',
      h('strong', {}, `${Math.round(ley.recargoDescanso(`${anio}-12-31`).factor * 100)} %`),
      ' sobre la hora ordinaria (CST art. 179, con la gradualidad de la Ley 2466 de 2025).')));

  // ——— Pagos registrados ———
  const nominas = store.nominas().filter((n) => n.hasta.startsWith(String(anio)))
    .sort((a, b) => (a.hasta < b.hasta ? 1 : -1));
  if (nominas.length) {
    const total = nominas.reduce((s, n) => s + (n.neto || 0), 0);
    contenedor.append(tarjeta('Pagos de nómina registrados este año',
      tabla([{ titulo: 'Empleado' }, { titulo: 'Periodo' }, { titulo: 'Pagado el' }, { titulo: 'Medio' }, { titulo: 'Neto', clase: 'num' }],
        nominas.map((n) => {
          const c = store.contrato(n.contratoId);
          const e = c ? store.empleado(c.empleadoId) : null;
          return {
            celdas: [
              e ? e.nombre : '—',
              `${formatoCorto(n.desde)} a ${formatoCorto(n.hasta)}`,
              n.fechaPago ? formatoCorto(n.fechaPago) : chip('Pendiente', 'alerta'),
              n.medio || '—',
              pesos(n.neto),
            ],
          };
        }).concat([{ clase: 'total', celdas: ['Total', '', '', '', pesos(total)] }]))));
  }

  return contenedor;
}
