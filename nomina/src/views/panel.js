/**
 * panel.js — Lo primero que se ve: quién está activo, qué se debe pagar y
 * qué cambió en la ley.
 */

import { h, tarjeta, tabla, pesos, boton, chip, aviso, vacio, formatoCorto, formatoLargo, hoy } from '../ui.js';
import { dias360, inicioDeMes, finDeMes, diasCalendario, sumarDias } from '../fechas.js';
import { obligacionesDelAnio, saldoVacaciones, derechoDotacion } from '../prestaciones.js';
import { festivos } from '../festivos.js';
import * as vigilancia from '../vigilancia.js';
import * as calc from '../calculo.js';
import * as ley from '../normativa.js';

export function vista(store) {
  const hoyISO = hoy();
  const anio = Number(hoyISO.slice(0, 4));
  const contratos = store.contratosActivos();
  const contenedor = h('div', { class: 'vista' });

  const valores = ley.valoresAnuales(hoyISO);
  const jornada = ley.jornada(hoyISO);
  const dominical = ley.recargoDescanso(hoyISO);
  const franja = ley.franjaDiurna(hoyISO);

  contenedor.append(
    h('div', { class: 'rejilla rejilla-4' },
      indicador('Salario mínimo', pesos(valores.smmlv), valores.normaSalario),
      indicador('Auxilio de transporte', pesos(valores.auxilioTransporte), valores.normaAuxilio),
      indicador('Jornada máxima', `${jornada.horasSemana} h/semana`, `Divisor ${jornada.divisor} · ${jornada.norma}`),
      indicador('Recargo dominical y festivo', `${Math.round(dominical.factor * 100)} %`, dominical.norma),
    ),
  );

  // ——— Alertas normativas ———
  const alertas = vigilancia.alertas(hoyISO);
  if (alertas.length) {
    contenedor.append(tarjeta('Cambios en la ley que te tocan',
      ...alertas.map((a) => h('div', { class: `alerta alerta-${a.nivel}` },
        h('strong', {}, a.titulo),
        h('p', {}, a.detalle))),
      h('p', { class: 'ayuda' },
        'Revisa el módulo de ',
        h('a', { href: '#/vigilancia' }, 'Vigilancia normativa'),
        ' para consultar las fuentes oficiales.')));
  }

  // ——— Personal activo ———
  if (!contratos.length) {
    contenedor.append(tarjeta('Empieza por aquí',
      vacio('Todavía no hay empleados con contrato.',
        boton('Crear el primer empleado', () => { window.location.hash = '#/empleados'; }, 'primario')),
      h('p', { class: 'ayuda' }, 'Después podrás registrar los días trabajados, liquidar la nómina del periodo y hacer la liquidación final.')));
  } else {
    const filas = contratos.map((c) => {
      const emp = store.empleado(c.empleadoId);
      const salario = calc.salarioMensualEquivalente(c, hoyISO);
      const vac = saldoVacaciones({
        ingreso: c.inicio,
        corte: hoyISO,
        diasDisfrutados: Number(c.diasVacacionesDisfrutados) || 0,
        diasCompensados: Number(c.diasVacacionesCompensados) || 0,
      });
      const dot = derechoDotacion({ salarioMensual: salario, ingreso: c.inicio, corte: hoyISO });
      return {
        celdas: [
          h('a', { href: `#/registro/${c.id}` }, emp ? emp.nombre : 'Sin nombre'),
          etiquetaModalidad(c),
          pesos(salario),
          `${dias360(c.inicio, hoyISO)} días`,
          `${vac.pendientes} días`,
          dot.tiene ? chip('Sí', 'ok') : chip('No', 'gris'),
          alertaContrato(c, hoyISO),
        ],
      };
    });
    contenedor.append(tarjeta(`Personal activo (${contratos.length})`,
      tabla([
        { titulo: 'Empleado' }, { titulo: 'Modalidad' }, { titulo: 'Remuneración al mes', clase: 'num' },
        { titulo: 'Antigüedad', clase: 'num' }, { titulo: 'Vacaciones pendientes', clase: 'num' },
        { titulo: 'Dotación' }, { titulo: 'Avisos' },
      ], filas)));
  }

  // ——— Calendario de obligaciones ———
  const obligaciones = obligacionesDelAnio(anio)
    .concat(obligacionesDelAnio(anio + 1))
    .filter((o) => o.fecha >= hoyISO)
    .slice(0, 5);
  contenedor.append(tarjeta('Próximas fechas de ley',
    tabla([{ titulo: 'Fecha' }, { titulo: 'Obligación' }, { titulo: 'Norma' }],
      obligaciones.map((o) => ({
        celdas: [
          `${formatoCorto(o.fecha)} (${diasCalendario(hoyISO, o.fecha)} días)`,
          o.titulo,
          h('span', { class: 'norma' }, o.norma),
        ],
      }))),
    h('p', { class: 'ayuda' }, 'El calendario completo, con festivos y periodos de pago, está en ',
      h('a', { href: '#/calendario' }, 'Calendario'), '.')));

  // ——— Últimas nóminas ———
  const nominas = [...store.nominas()].sort((a, b) => (a.hasta < b.hasta ? 1 : -1)).slice(0, 6);
  if (nominas.length) {
    contenedor.append(tarjeta('Últimos pagos registrados',
      tabla([
        { titulo: 'Empleado' }, { titulo: 'Periodo' }, { titulo: 'Neto', clase: 'num' },
        { titulo: 'Pagado el' }, { titulo: 'Estado' },
      ], nominas.map((n) => {
        const c = store.contrato(n.contratoId);
        const emp = c ? store.empleado(c.empleadoId) : null;
        return {
          celdas: [
            emp ? emp.nombre : '—',
            `${formatoCorto(n.desde)} a ${formatoCorto(n.hasta)}`,
            pesos(n.neto),
            n.fechaPago ? formatoCorto(n.fechaPago) : '—',
            n.pagado ? chip('Pagado', 'ok') : chip('Pendiente', 'alerta'),
          ],
        };
      }))));
  }

  const proximoFestivo = festivos(anio).concat(festivos(anio + 1)).find((f) => f.fecha >= hoyISO);
  contenedor.append(h('p', { class: 'pie-nota' },
    `Jornada nocturna desde las ${franja.finDiurna}:00 (${franja.norma}). `,
    proximoFestivo ? `Próximo festivo: ${proximoFestivo.nombre}, ${formatoLargo(proximoFestivo.fecha)}.` : ''));

  return contenedor;
}

function indicador(titulo, valor, nota) {
  return h('div', { class: 'indicador' },
    h('span', { class: 'indicador-titulo' }, titulo),
    h('strong', {}, valor),
    h('small', { class: 'norma' }, nota));
}

function etiquetaModalidad(c) {
  const m = calc.MODALIDADES.find((x) => x.id === (c.modalidad || 'mensual'));
  const tipo = ley.CONTRATOS.find((t) => t.id === (c.tipo || 'indefinido'));
  return h('span', {}, `${m ? m.nombre : ''} · `, h('span', { class: 'norma' }, tipo ? tipo.nombre : ''));
}

function alertaContrato(c, fecha) {
  const avisos = [];
  if (c.tipo === 'fijo' && c.fin) {
    const faltan = diasCalendario(fecha, c.fin);
    if (faltan >= 0 && faltan <= 45) {
      avisos.push(chip(`Vence en ${faltan} días: avisa con 30 de anticipación`, 'alerta'));
    }
    const aniosTotales = dias360(c.inicio, c.fin) / 360;
    if (aniosTotales > 4) avisos.push(chip('Supera los 4 años de término fijo', 'error'));
  }
  const periodoPrueba = c.tipo === 'indefinido' ? 60 : Math.round(dias360(c.inicio, c.fin || fecha) / 5);
  if (diasCalendario(c.inicio, fecha) <= periodoPrueba) {
    avisos.push(chip(`En periodo de prueba hasta ${formatoCorto(sumarDias(c.inicio, periodoPrueba))}`, 'gris'));
  }
  return avisos.length ? h('div', { class: 'chips' }, ...avisos) : '—';
}
