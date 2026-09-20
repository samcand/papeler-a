/**
 * ideas.js (vista) — Las 100 ideas como lista de chequeo y hoja de ruta.
 *
 * Lo que ya hace la app aparece marcado de serie; lo demás se puede marcar a
 * mano según se vaya implementando, o convertir en tareas del proyecto.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import { CATEGORIAS, IDEAS } from '../ideas.js';
import { barra, tituloVista } from '../componentes.js';
import { store } from '../store.js';

export function vistaIdeas(root) {
  const host = el('div', {});
  let categoria = '';
  let soloPendientes = false;

  const pintar = () => {
    const marcadas = new Set(store.estado.ajustes.ideasHechas || []);
    const hechas = IDEAS.filter((i) => i.hecho || marcadas.has(i.n));
    const visibles = IDEAS
      .filter((i) => !categoria || i.c === categoria)
      .filter((i) => !soloPendientes || !(i.hecho || marcadas.has(i.n)));

    render(host,
      tituloVista('100 ideas', 'Lo que ya hace la app y lo que vendría bien añadir'),

      el('p', { class: 'muted small' },
        `${hechas.length} de ${IDEAS.length} implementadas. Las marcadas de serie son las que la app ya hace hoy.`),
      barra(Math.round((hechas.length / IDEAS.length) * 100), 'var(--accent-2)'),

      el('div', { class: 'chip-list', style: 'margin:14px 0' },
        el('button', { class: `chip ${!categoria ? 'activa' : ''}`.trim(), onClick: () => { categoria = ''; pintar(); } }, 'Todas'),
        ...CATEGORIAS.map((c) => {
          const total = IDEAS.filter((i) => i.c === c.id).length;
          const listas = IDEAS.filter((i) => i.c === c.id && (i.hecho || marcadas.has(i.n))).length;
          return el('button', {
            class: `chip ${categoria === c.id ? 'activa' : ''}`.trim(),
            onClick: () => { categoria = categoria === c.id ? '' : c.id; pintar(); },
          }, `${c.nombre} ${listas}/${total}`);
        }),
        el('button', {
          class: `chip ${soloPendientes ? 'activa' : ''}`.trim(),
          onClick: () => { soloPendientes = !soloPendientes; pintar(); },
        }, 'solo pendientes')),

      ...CATEGORIAS
        .filter((c) => visibles.some((i) => i.c === c.id))
        .map((c) => el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, c.nombre),
          el('div', { class: 'lista-chequeo' },
            ...visibles.filter((i) => i.c === c.id).map((idea) => {
              const lista = idea.hecho || marcadas.has(idea.n);
              return el('label', { class: 'idea' },
                el('input', {
                  type: 'checkbox', checked: lista, disabled: idea.hecho,
                  title: idea.hecho ? 'Ya implementada' : 'Marcar cuando la implementes',
                  onChange: () => {
                    const actuales = new Set(store.estado.ajustes.ideasHechas || []);
                    actuales.has(idea.n) ? actuales.delete(idea.n) : actuales.add(idea.n);
                    store.ajustar({ ideasHechas: [...actuales] });
                    pintar();
                  },
                }),
                el('span', {},
                  el('b', { class: lista ? 'muted' : '' }, `${idea.n}. ${idea.t}.`),
                  ' ',
                  el('span', { class: 'muted small' }, idea.d),
                  idea.hecho ? el('span', { class: 'chip', style: 'margin-left:6px' }, 'ya está') : null),
                !idea.hecho ? button('+ tarea', (e) => {
                  e.preventDefault();
                  store.agregar({
                    titulo: idea.t,
                    notas: idea.d,
                    modulo: 'proyectos',
                    proyecto: 'Mejoras de la app',
                    prioridad: 3,
                    etiquetas: ['idea', c.id],
                  });
                  toast('Añadida a tu agenda');
                }, { variant: 'ghost chico' }) : null);
            })))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Cómo usar esta lista'),
        el('p', { class: 'muted small' },
          'No intentes implementarlas todas: elige dos por mes y compáralas con lo que de verdad te frena. ',
          'Una app de tareas mejora cuando quita fricción a lo que ya haces, no cuando añade una pantalla más.'),
        button('Convertir todas las pendientes en tareas', () => {
          const pendientes = IDEAS.filter((i) => !i.hecho && !(store.estado.ajustes.ideasHechas || []).includes(i.n));
          const n = store.sembrarTareas(pendientes.map((i) => ({
            titulo: i.t, notas: i.d, modulo: 'proyectos', proyecto: 'Mejoras de la app', prioridad: 4, etiquetas: ['idea', i.c],
          })), 'ideas-app');
          toast(n ? `${n} ideas añadidas como tareas` : 'Ya estaban todas');
        }, { variant: 'ghost' })));
  };

  pintar();
  render(root, host);
}
