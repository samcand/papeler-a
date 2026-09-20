/**
 * planificar.js (vista) — Poner el día en bloques y ver qué es urgente de
 * verdad. Es la pantalla que responde a "¿esto cabe hoy?".
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, sumarDias, textoLargo } from '../fechas.js';
import { paraHoy } from '../modelo.js';
import { formatoMinutos, matrizEisenhower, planificarDia } from '../tiempo.js';
import { colorModulo, dato, listaTareas, tituloVista } from '../componentes.js';
import { capacidadSemanas, resumenCapacidad } from '../capacidad.js';
import { store } from '../store.js';

export function vistaPlanificar(root) {
  const host = el('div', {});
  let diaISO = aISO(fechaHoy());

  const pintar = () => {
    const jornada = store.estado.ajustes.jornada;
    const tareas = store.tareas.filter((t) => !t.completada && t.fecha === diaISO);
    const conAtrasadas = diaISO === aISO(fechaHoy()) ? paraHoy(store.tareas, diaISO) : tareas;
    const plan = planificarDia(conAtrasadas, { inicio: jornada.inicio, fin: jornada.fin });
    const matriz = matrizEisenhower(store.tareas, diaISO);

    render(host,
      tituloVista('Planificar', textoLargo(diaISO),
        el('span', { class: 'grow' }),
        button('‹', () => { diaISO = aISO(sumarDias(diaISO, -1)); pintar(); }),
        button('›', () => { diaISO = aISO(sumarDias(diaISO, 1)); pintar(); })),

      el('div', { class: 'fila' },
        el('label', { class: 'field', style: 'width:130px' },
          el('span', { class: 'field-label' }, 'Empiezo a las'),
          el('input', { class: 'input', type: 'time', value: jornada.inicio,
            onChange: (e) => { store.ajustar({ jornada: { ...jornada, inicio: e.target.value } }); pintar(); } })),
        el('label', { class: 'field', style: 'width:130px' },
          el('span', { class: 'field-label' }, 'Termino a las'),
          el('input', { class: 'input', type: 'time', value: jornada.fin,
            onChange: (e) => { store.ajustar({ jornada: { ...jornada, fin: e.target.value } }); pintar(); } }))),

      el('div', { class: 'tarjetas' },
        dato(formatoMinutos(plan.minutosPlanificados), 'planificado'),
        dato(formatoMinutos(plan.minutosLibres), 'libre'),
        dato(plan.fuera, 'no caben', { clase: plan.fuera ? 'negativo' : '' })),

      plan.fuera ? el('p', { class: 'small muted', style: 'margin-top:8px' },
        'Lo que no cabe no desaparece por meterlo en la lista: muévelo a otro día o quítale algo al día de hoy.') : null,

      el('section', { class: 'card', style: 'margin-top:14px' },
        el('h2', { class: 'card-title' }, 'El día por bloques'),
        plan.bloques.length ? el('div', {},
          ...plan.bloques.map((b) => el('div', {
            class: 'franja',
            style: b.tipo === 'nocabe' ? 'opacity:.55' : '',
          },
          el('div', { class: 'hora' }, b.desde),
          el('div', { class: 'grow' },
            el('div', {}, b.tipo === 'descanso' ? '☕ Descanso' : b.tarea.titulo,
              b.tipo === 'nocabe' ? el('span', { class: 'chip', style: 'margin-left:8px' }, 'no cabe hoy') : null,
              b.tipo === 'fija' ? el('span', { class: 'chip', style: 'margin-left:8px' }, 'hora fija') : null),
            el('div', { class: 'muted small' },
              `${formatoMinutos(b.minutos)}${b.hasta ? ` · hasta ${b.hasta}` : ''}${b.tarea.proyecto ? ` · ${b.tarea.proyecto}` : ''}`)),
          b.tarea.modulo ? el('span', { class: 'punto-modulo', style: `background:${colorModulo(b.tarea.modulo)}` }) : null)))
          : el('p', { class: 'muted' }, 'No hay tareas con fecha para este día.')),

      panelCapacidad(),

      el('section', { style: 'margin-top:14px' },
        el('h2', {}, 'Urgente frente a importante'),
        el('p', { class: 'muted small' }, 'Si casi todo cae en “hacer ya”, el problema no es el día: es la semana pasada.'),
        el('div', { class: 'matriz' },
          ...Object.entries(matriz).map(([clave, c]) => el('div', { class: `cuadrante ${clave}` },
            el('h3', {}, c.titulo, ' ', el('span', { class: 'muted small' }, `(${c.tareas.length})`)),
            el('p', { class: 'muted small' }, c.descripcion),
            listaTareas(c.tareas.slice(0, 6), { alCambiar: pintar, hoy: diaISO, vacio: 'Nada aquí.', icono: '·' }))))));
  };

  /**
   * Tu capacidad real: el recurso escaso que provoca todos los choques entre
   * cartera, docencia, investigación, alabanza y casa eres tú.
   */
  function panelCapacidad() {
    const ajustes = store.estado.ajustes;
    const r = resumenCapacidad(store.tareas, ajustes, aISO(fechaHoy()));
    const semanas = capacidadSemanas(store.tareas, aISO(fechaHoy()), 4, ajustes, aISO(fechaHoy()));

    return el('section', { class: 'card', style: 'margin-top:14px' },
      el('h2', { class: 'card-title' }, 'Tu capacidad, semana a semana'),
      el('p', { class: r.semana.pct > 100 ? 'negativo' : 'muted' }, r.frase),

      el('div', { class: 'mapa-calor' },
        el('div', { class: 'mapa-cabecera' },
          el('span', {}, ''), ...['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => el('span', {}, d)), el('span', {}, 'total')),
        ...semanas.map((s) => el('div', { class: 'mapa-fila' },
          el('span', { class: 'muted small' }, `sem ${s.numero}`),
          ...s.dias.map((d) => el('span', {
            class: `celda-carga ${d.nivel}${d.esHoy ? ' hoy' : ''}`,
            title: `${d.fecha}: ${formatoMinutos(d.comprometidos)} de ${formatoMinutos(d.disponibles)} (${d.pct} %)`,
          }, d.comprometidos ? String(Math.round(d.comprometidos / 60)) : '')),
          el('span', { class: `small ${s.nivel === 'imposible' ? 'negativo' : 'muted'}` }, `${s.pct} %`)))),

      r.reparto.length ? el('div', { style: 'margin-top:12px' },
        el('p', { class: 'field-label' }, 'A quién le has prometido tus horas esta semana'),
        ...r.reparto.map((m) => el('div', { style: 'margin-bottom:6px' },
          el('div', { class: 'fila entre small' },
            el('span', {}, `${m.icono} ${m.nombre}`),
            el('span', { class: 'muted' }, `${formatoMinutos(m.minutos)} · ${m.pct} %`)),
          el('div', { class: 'barra' }, el('div', { style: `width:${m.pct}%;background:${colorModulo(m.modulo)}` }))))) : null,

      el('div', { class: 'fila', style: 'margin-top:12px' },
        el('label', { class: 'field', style: 'width:220px;margin:0' },
          el('span', { class: 'field-label' }, 'Horas disponibles el fin de semana'),
          el('input', {
            class: 'input', type: 'number', min: 0, max: 16, step: 0.5,
            value: Math.round(((ajustes.minutosFinde ?? 240) / 60) * 10) / 10,
            onChange: (e) => { store.ajustar({ minutosFinde: Math.round(Number(e.target.value) * 60) }); pintar(); },
          }))));
  }

  pintar();
  render(root, host);
}
