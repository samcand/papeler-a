/**
 * planificar.js (vista) — Poner el día en bloques y ver qué es urgente de
 * verdad. Es la pantalla que responde a "¿esto cabe hoy?".
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, sumarDias, textoLargo } from '../fechas.js';
import { paraHoy } from '../modelo.js';
import { formatoMinutos, matrizEisenhower, planificarDia } from '../tiempo.js';
import { colorModulo, dato, listaTareas, tituloVista } from '../componentes.js';
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

      el('section', { style: 'margin-top:14px' },
        el('h2', {}, 'Urgente frente a importante'),
        el('p', { class: 'muted small' }, 'Si casi todo cae en “hacer ya”, el problema no es el día: es la semana pasada.'),
        el('div', { class: 'matriz' },
          ...Object.entries(matriz).map(([clave, c]) => el('div', { class: `cuadrante ${clave}` },
            el('h3', {}, c.titulo, ' ', el('span', { class: 'muted small' }, `(${c.tareas.length})`)),
            el('p', { class: 'muted small' }, c.descripcion),
            listaTareas(c.tareas.slice(0, 6), { alCambiar: pintar, hoy: diaISO, vacio: 'Nada aquí.', icono: '·' }))))));
  };

  pintar();
  render(root, host);
}
