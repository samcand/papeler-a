/**
 * tablero.js (vista) — Kanban de las mismas tareas.
 *
 * Las columnas salen de la fecha, no de un campo "estado" que haya que
 * mantener: arrastrar una tarjeta a otra columna **es** cambiarle la fecha.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoRelativo } from '../fechas.js';
import { MODULOS } from '../modelo.js';
import { alSoltar, tablero } from '../tablero.js';
import { colorModulo, entradaRapida, panelTarea, tituloVista } from '../componentes.js';
import { formatoMinutos } from '../tiempo.js';
import { store } from '../store.js';

export function vistaTablero(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let modulo = ctx.query?.modulo || '';
  let arrastrando = null;

  const pintar = () => {
    const columnas = tablero(store.tareas, hoyISO, { modulo: modulo || undefined });

    render(host,
      tituloVista('Tablero', 'Las columnas son fechas: mover una tarjeta es cambiarle el día',
        el('span', { class: 'grow' }),
        el('select', { class: 'input', style: 'width:auto', onChange: (e) => { modulo = e.target.value; pintar(); } },
          el('option', { value: '' }, 'Todos los módulos'),
          ...MODULOS.map((m) => el('option', { value: m.id, selected: m.id === modulo }, `${m.icono} ${m.nombre}`)))),

      entradaRapida({ modulo: modulo || null }, pintar),

      el('div', { class: 'tablero' },
        ...columnas.map((c) => el('div', {
          class: 'columna-tablero',
          dataset: { columna: c.id },
          onDragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('encima'); },
          onDragleave: (e) => e.currentTarget.classList.remove('encima'),
          onDrop: (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('encima');
            soltar(c.id);
          },
        },
        el('div', { class: 'cabecera-columna' },
          el('b', {}, c.nombre),
          el('span', { class: 'muted small' }, ` ${c.tareas.length}`),
          c.minutos ? el('span', { class: 'muted small' }, ` · ${formatoMinutos(c.minutos)}`) : null,
          el('div', { class: 'muted small' }, c.descripcion)),

        ...c.tareas.map((t) => tarjeta(t, c.id)),

        c.id !== 'hechas' ? button('+', () => {
          const cambios = alSoltar({ }, c.id, hoyISO) || {};
          const nueva = store.agregar({ titulo: 'Tarea nueva', fecha: cambios.fecha ?? null, modulo: modulo || null });
          panelTarea(nueva, pintar);
        }, { variant: 'ghost chico', title: 'Añadir aquí' }) : null))));
  };

  function tarjeta(t, columnaId) {
    return el('div', {
      class: `tarjeta${t.completada ? ' hecha' : ''}`,
      draggable: 'true',
      style: `border-left-color:${t.modulo ? colorModulo(t.modulo) : 'var(--line)'}`,
      onDragstart: (e) => { arrastrando = t; e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('arrastrando'); },
      onDragend: (e) => { e.currentTarget.classList.remove('arrastrando'); arrastrando = null; },
      onClick: () => panelTarea(t, pintar),
    },
    el('div', { class: `punto-prioridad p${t.prioridad}` }),
    el('div', { class: 'grow' },
      el('div', {}, t.titulo),
      el('div', { class: 'tarea-meta' },
        t.fecha ? el('span', { class: t.fecha < hoyISO && !t.completada ? 'vencida' : '' }, textoRelativo(t.fecha)) : null,
        t.duracion ? el('span', {}, `${t.duracion} min`) : null,
        t.proyecto ? el('span', {}, `# ${t.proyecto}`) : null)));
  }

  function soltar(columnaId) {
    if (!arrastrando) return;
    const cambios = alSoltar(arrastrando, columnaId, hoyISO);
    if (!cambios) { arrastrando = null; return; }
    store.instantanea('Mover en el tablero');
    if (cambios.completar) store.alternarCompletada(arrastrando.id, hoyISO);
    else {
      if (cambios.reabrir) store.alternarCompletada(arrastrando.id, hoyISO);
      const { completar, reabrir, ...campos } = cambios;
      store.actualizar(arrastrando.id, campos);
    }
    arrastrando = null;
    pintar();
  }

  pintar();
  render(root, host);
}
