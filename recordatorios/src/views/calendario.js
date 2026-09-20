/**
 * calendario.js (vista) — Mes, semana y día.
 *
 * El mes muestra puntos de color por módulo (se lee de un vistazo si la semana
 * está cargada de clases o de mercado) y al tocar un día se abre su agenda.
 */

import { button, download, el, render, toast } from '../../../src/ui.js';
import { aISO, deISO, hoy as fechaHoy, sumarDias, textoLargo, textoRelativo, DIAS_CORTO, MESES } from '../fechas.js';
import { agendaDia, agendaSemana, matrizMes, mesAnterior, mesSiguiente, resumenMes } from '../calendario.js';
import { colorModulo, entradaRapida, listaTareas, tituloVista } from '../componentes.js';
import { aICS } from '../exportar.js';
import { formatoMinutos, tiempoRealDelDia } from '../tiempo.js';
import { store } from '../store.js';

export function vistaCalendario(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let modo = ctx.query?.modo || 'mes';
  let cursor = deISO(ctx.query?.dia || hoyISO);
  let diaElegido = hoyISO;
  let verReal = false;

  const pintar = () => {
    const tareas = store.tareas.filter((t) => !t.padre);
    render(host,
      tituloVista('Calendario', modo === 'mes' ? `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}` : '',
        el('span', { class: 'grow' }),
        ...[['mes', 'Mes'], ['semana', 'Semana'], ['dia', 'Día']].map(([id, txt]) =>
          el('button', { class: `chip ${modo === id ? 'activa' : ''}`.trim(), onClick: () => { modo = id; pintar(); } }, txt))),

      el('div', { class: 'cal-cabecera' },
        button('‹', () => { mover(-1); }, { title: 'Anterior' }),
        button('Hoy', () => { cursor = deISO(hoyISO); diaElegido = hoyISO; pintar(); }),
        button('›', () => { mover(1); }, { title: 'Siguiente' }),
        el('span', { class: 'grow' }),
        el('label', { class: 'chip', style: 'cursor:pointer' },
          el('input', {
            type: 'checkbox', checked: verReal,
            onChange: (e) => { verReal = e.target.checked; pintar(); },
          }), 'Tiempo medido'),
        button('📤 Exportar .ics', exportar, { title: 'Llevar estas fechas al calendario del teléfono' })),

      modo === 'mes' ? vistaMes(tareas) : modo === 'semana' ? vistaSemana(tareas) : vistaDia(tareas),

      modo === 'mes' ? panelDelDia(tareas) : null);
  };

  function mover(paso) {
    if (modo === 'mes') {
      const m = paso > 0 ? mesSiguiente(cursor.getFullYear(), cursor.getMonth()) : mesAnterior(cursor.getFullYear(), cursor.getMonth());
      cursor = deISO(`${m.anio}-${String(m.mes + 1).padStart(2, '0')}-01`);
    } else if (modo === 'semana') {
      cursor = sumarDias(cursor, 7 * paso);
    } else {
      cursor = sumarDias(cursor, paso);
      diaElegido = aISO(cursor);
    }
    pintar();
  }

  function vistaMes(tareas) {
    const rejilla = matrizMes(cursor.getFullYear(), cursor.getMonth(), { hoy: hoyISO });
    const resumen = resumenMes(tareas, cursor.getFullYear(), cursor.getMonth());
    const porDiaTareas = new Map();
    for (const t of tareas) {
      if (!t.fecha || t.completada) continue;
      if (!porDiaTareas.has(t.fecha)) porDiaTareas.set(t.fecha, []);
      porDiaTareas.get(t.fecha).push(t);
    }

    return el('div', {},
      el('div', { class: 'cal-rejilla' }, ...rejilla.cabecera.map((d) => el('div', { class: 'cal-dia-nombre' }, d))),
      el('div', { class: 'cal-rejilla' },
        ...rejilla.semanas.flatMap((s) => s.dias.map((d) => {
          const lista = porDiaTareas.get(d.iso) || [];
          const info = resumen.get(d.iso);
          return el('div', {
            class: `cal-celda${d.delMes ? '' : ' fuera'}${d.esHoy ? ' hoy' : ''}${d.finDeSemana ? ' finde' : ''}`,
            onClick: () => { diaElegido = d.iso; pintar(); },
          },
          el('div', { class: 'cal-num' }, String(d.dia)),
          ...(verReal ? [bloqueReal(d.iso)] : []),
          ...lista.slice(0, 3).map((t) => el('div', {
            class: 'cal-evento',
            style: `border-left-color:${colorModulo(t.modulo)}`,
            title: t.titulo,
          }, `${t.hora ? t.hora + ' ' : ''}${t.titulo}`)),
          lista.length > 3 ? el('div', { class: 'cal-mas' }, `+${lista.length - 3} más`) : null,
          el('div', { class: 'cal-punto-fila' },
            ...(info?.modulos || []).map((m) => el('span', { class: 'punto-modulo', style: `background:${colorModulo(m)}` }))));
        }))));
  }

  function vistaSemana(tareas) {
    const semana = agendaSemana(tareas, aISO(cursor), { hoy: hoyISO });
    return el('div', {},
      el('p', { class: 'muted small' }, `Semana ${semana.numero} · ${textoLargo(semana.desde)} → ${textoLargo(semana.hasta)}`),
      el('div', { class: 'semana-rejilla' },
        ...semana.dias.map((d) => el('div', { class: `semana-col${d.esHoy ? ' hoy' : ''}` },
          el('h4', {}, `${DIAS_CORTO[deISO(d.iso).getDay()]} ${deISO(d.iso).getDate()}`),
          ...d.tareas.map((t) => el('div', {
            class: 'mini',
            style: `border-left:3px solid ${colorModulo(t.modulo)};padding-left:5px`,
            onClick: () => { diaElegido = d.iso; modo = 'dia'; cursor = deISO(d.iso); pintar(); },
          }, `${t.hora ? t.hora + ' · ' : ''}${t.titulo}`)),
          d.minutos ? el('div', { class: 'muted small', style: 'margin-top:6px' }, `${Math.round(d.minutos / 6) / 10} h`) : null))));
  }

  function vistaDia(tareas) {
    const iso = aISO(cursor);
    const dia = agendaDia(tareas, iso);
    return el('div', {},
      el('h2', {}, textoLargo(iso)),
      entradaRapida({ fecha: iso }, pintar),
      dia.sinHora.length ? el('div', { style: 'margin-bottom:14px' },
        el('p', { class: 'muted small' }, 'Sin hora fija'),
        listaTareas(dia.sinHora, { alCambiar: pintar, hoy: hoyISO })) : null,
      ...dia.franjas.map((f) => el('div', { class: 'franja' },
        el('div', { class: 'hora' }, f.hora),
        el('div', { class: 'grow' },
          f.tareas.length ? listaTareas(f.tareas, { alCambiar: pintar, hoy: hoyISO }) : el('span', { class: 'muted small' }, '')))));
  }

  /**
   * Lo medido, no lo planificado: la diferencia entre las dos columnas es el
   * plan contra la vida. Sale del pomodoro y del cronómetro; lo que no mediste
   * no aparece, y eso también es información.
   */
  function bloqueReal(iso) {
    const r = tiempoRealDelDia(store.estado.tiempo, iso, store.tareas);
    if (!r.real) return null;
    return el('div', {
      class: 'cal-real',
      title: `${formatoMinutos(r.real)} medidos frente a ${formatoMinutos(r.planificado)} planificados`,
    }, `⏱ ${formatoMinutos(r.real)}`);
  }

  function panelDelDia(tareas) {
    const delDia = tareas.filter((t) => t.fecha === diaElegido);
    const real = tiempoRealDelDia(store.estado.tiempo, diaElegido, store.tareas);
    return el('section', { style: 'margin-top:18px' },
      el('h3', {}, textoLargo(diaElegido), ' ', el('span', { class: 'muted small' }, textoRelativo(diaElegido, deISO(hoyISO)))),
      entradaRapida({ fecha: diaElegido }, pintar),
      listaTareas(delDia, { alCambiar: pintar, hoy: hoyISO, vacio: 'Nada este día.' }),
      real.real ? el('div', { class: 'card' },
        el('h3', { class: 'card-title' }, 'Tiempo medido ese día'),
        el('p', { class: 'muted small' },
          `${formatoMinutos(real.real)} medidos frente a ${formatoMinutos(real.planificado)} planificados`,
          real.planificado ? ` · ${real.desvio >= 0 ? '+' : ''}${formatoMinutos(Math.abs(real.desvio))}` : ''),
        ...real.bloques.map((b) => el('div', { class: 'salud-fila' },
          el('span', { class: 'grow' }, b.titulo),
          el('span', { class: 'muted small' }, `${formatoMinutos(b.minutos)} · ${b.sesiones} sesión(es)`)))) : null);
  }

  function exportar() {
    const conFecha = store.tareas.filter((t) => t.fecha && !t.completada);
    if (!conFecha.length) { toast('No hay fechas que exportar', 'warn'); return; }
    download('recordatorios.ics', aICS(conFecha, { nombre: 'Recordatorios' }), 'text/calendar');
    toast(`${conFecha.length} fechas exportadas`);
  }

  pintar();
  render(root, host);
}
