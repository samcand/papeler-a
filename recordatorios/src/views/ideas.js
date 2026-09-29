/**
 * ideas.js (vista) — Lo que queda.
 *
 * La hoja de ruta de la app en tres bloques: lo pendiente por olas (que es lo
 * que se mira), lo ya hecho y lo descartado con su motivo. Cualquier pendiente
 * se convierte en tarea con un botón.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { CATEGORIAS, DESCARTADAS, HECHAS, IDEAS, OLAS, PENDIENTES, porOla } from '../ideas.js';
import { barra, tituloVista } from '../componentes.js';
import { store } from '../store.js';

export function vistaIdeas(root) {
  const host = el('div', {});
  let categoria = '';

  const pintar = () => {
    const marcadas = new Set(store.estado.ajustes.ideasHechas || []);
    const hechas = IDEAS.filter((i) => i.estado === 'hecho' || marcadas.has(i.n));
    const quedan = PENDIENTES.filter((i) => !marcadas.has(i.n));
    const filtra = (lista) => lista.filter((i) => !categoria || i.c === categoria);

    render(host,
      tituloVista('Lo que queda', `${quedan.length} pendientes · ${hechas.length} hechas · ${DESCARTADAS.length} descartadas`),

      barra(Math.round((hechas.length / IDEAS.length) * 100), 'var(--accent-2)'),
      el('p', { class: 'muted small', style: 'margin-top:6px' },
        'Las olas son el orden recomendado, no un compromiso. Marca una pendiente para darla por hecha, o conviértela en tarea.'),

      el('div', { class: 'chip-list', style: 'margin:14px 0' },
        el('button', { class: `chip ${!categoria ? 'activa' : ''}`.trim(), onClick: () => { categoria = ''; pintar(); } }, 'Todo'),
        ...CATEGORIAS.map((c) => {
          const n = quedan.filter((i) => i.c === c.id).length;
          if (!n) return null;
          return el('button', {
            class: `chip ${categoria === c.id ? 'activa' : ''}`.trim(),
            onClick: () => { categoria = categoria === c.id ? '' : c.id; pintar(); },
          }, `${c.nombre} · ${n}`);
        })),

      !quedan.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'No queda nada pendiente'),
        el('p', {}, `Las ${hechas.length} ideas de la lista están hechas y las ${DESCARTADAS.length} descartadas siguen abajo con su motivo.`),
        el('p', { class: 'muted small' },
          'Lo siguiente sale de usarla: cuando algo moleste tres veces en una semana, eso es la idea 111.')) : null,

      ...OLAS.map((ola) => {
        const items = filtra(porOla(ola.n).filter((i) => !marcadas.has(i.n)));
        if (!items.length) return null;
        return el('section', { class: `card ola-${ola.n}` },
          el('h2', { class: 'card-title' }, `${ola.nombre} · ${items.length}`),
          el('p', { class: 'muted small', style: 'margin-top:-6px' }, ola.descripcion),
          el('div', { class: 'lista-chequeo' }, ...items.map((idea) => filaIdea(idea, marcadas, pintar))));
      }),

      el('details', { style: 'margin-top:18px' },
        el('summary', { class: 'muted small' }, `Ya está hecho (${hechas.length})`),
        el('div', { class: 'lista-chequeo' },
          ...filtra(hechas).map((idea) => el('label', { class: 'idea' },
            el('input', { type: 'checkbox', checked: true, disabled: idea.estado === 'hecho', onChange: () => desmarcar(idea, pintar) }),
            el('span', { class: 'muted' }, `${idea.n}. ${idea.t}.`))))),

      el('details', { style: 'margin-top:10px' },
        el('summary', { class: 'muted small' }, `Descartado, y por qué (${DESCARTADAS.length})`),
        el('p', { class: 'muted small' },
          'Se queda escrito a propósito: una decisión sin motivo se vuelve a discutir cada tres meses.'),
        ...filtra(DESCARTADAS).map((idea) => el('div', { class: 'alerta bajo' },
          el('div', {},
            el('div', { class: 'muted' }, `${idea.n}. ${idea.t}`),
            el('div', { class: 'accion' }, idea.motivo))))),

      (() => {
        // La ola 1 se vacía cuando se termina: el botón apunta a la siguiente con trabajo.
        const siguiente = OLAS.find((o) => porOla(o.n).some((i) => !marcadas.has(i.n)));
        if (!siguiente) return el('p', { class: 'positivo' }, 'No queda nada pendiente. Eso sí que es raro.');
        return el('div', { class: 'fila', style: 'margin-top:16px' },
          button(`Convertir "${siguiente.nombre}" en tareas`, () => {
            const n = store.sembrarTareas(porOla(siguiente.n).filter((i) => !marcadas.has(i.n)).map((i) => ({
              titulo: i.t, notas: i.d, modulo: 'proyectos', proyecto: 'Mejoras de la app', prioridad: siguiente.n === 1 ? 2 : 3,
              etiquetas: [`ola-${siguiente.n}`, i.c],
            })), `hoja-de-ruta-${siguiente.n}`);
            toast(n ? `${n} tareas creadas` : 'Ya estaban creadas');
          }, { variant: 'primary' }));
      })());
  };

  function filaIdea(idea, marcadas, alCambiar) {
    return el('label', { class: 'idea' },
      el('input', {
        type: 'checkbox', checked: marcadas.has(idea.n), title: 'Marcar como hecha',
        onChange: () => {
          const actuales = new Set(store.estado.ajustes.ideasHechas || []);
          actuales.has(idea.n) ? actuales.delete(idea.n) : actuales.add(idea.n);
          store.ajustar({ ideasHechas: [...actuales] });
          alCambiar();
        },
      }),
      el('span', {},
        el('b', {}, `${idea.n}. ${idea.t}.`), ' ',
        el('span', { class: 'muted small' }, idea.d)),
      button('+ tarea', (e) => {
        e.preventDefault();
        store.agregar({
          titulo: idea.t, notas: idea.d, modulo: 'proyectos', proyecto: 'Mejoras de la app',
          prioridad: idea.ola === 1 ? 2 : 3, etiquetas: [`ola-${idea.ola}`, idea.c],
        });
        toast('Añadida a tu agenda');
      }, { variant: 'ghost chico' }));
  }

  function desmarcar(idea, alCambiar) {
    const actuales = new Set(store.estado.ajustes.ideasHechas || []);
    actuales.delete(idea.n);
    store.ajustar({ ideasHechas: [...actuales] });
    alCambiar();
  }

  pintar();
  render(root, host);
}
