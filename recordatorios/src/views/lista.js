/**
 * lista.js (vista) — Una lista cualquiera: un proyecto, un filtro guardado,
 * una etiqueta o una búsqueda. Todas comparten la misma pantalla.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import { aplicarFiltro } from '../filtros.js';
import { MODULOS, progreso } from '../modelo.js';
import { entradaRapida, listaTareas, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaLista(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const tipo = ctx.params?.tipo || 'proyecto';
  const clave = decodeURIComponent(ctx.params?.clave || '');
  let mostrarHechas = false;
  let orden = store.estado.ajustes.ordenPorDefecto;

  const pintar = () => {
    const proyecto = store.estado.proyectos.find((p) => p.nombre === clave);
    const filtro = store.estado.filtros.find((f) => f.id === clave || f.nombre === clave);
    let tareas = [];
    let titulo = clave;
    let subtitulo = '';

    if (tipo === 'filtro' && filtro) {
      tareas = aplicarFiltro(filtro.expresion, store.tareas, { hoy: hoyISO });
      titulo = `${filtro.icono || '🔎'} ${filtro.nombre}`;
      subtitulo = filtro.expresion;
    } else if (tipo === 'etiqueta') {
      tareas = store.tareas.filter((t) => (t.etiquetas || []).includes(clave));
      titulo = '@' + clave;
    } else if (tipo === 'buscar') {
      tareas = aplicarFiltro(`buscar: ${clave}`, store.tareas, { hoy: hoyISO });
      titulo = `Resultados de “${clave}”`;
    } else {
      tareas = store.tareas.filter((t) => t.proyecto === clave);
      titulo = clave;
      subtitulo = proyecto?.modulo ? MODULOS.find((m) => m.id === proyecto.modulo)?.nombre : '';
    }

    const visibles = mostrarHechas ? tareas : tareas.filter((t) => !t.completada);
    const raices = visibles.filter((t) => !t.padre);
    const av = progreso(tareas);

    render(host,
      tituloVista(titulo, subtitulo,
        el('span', { class: 'grow' }),
        el('button', { class: `chip ${mostrarHechas ? 'activa' : ''}`.trim(), onClick: () => { mostrarHechas = !mostrarHechas; pintar(); } }, 'ver hechas'),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { orden = e.target.value; pintar(); },
        },
        ...[['fecha', 'por fecha'], ['prioridad', 'por prioridad'], ['manual', 'manual'], ['alfabetico', 'A–Z']]
          .map(([v, t]) => el('option', { value: v, selected: v === orden }, t)))),

      av.total ? el('p', { class: 'small muted' }, `${av.hechas} de ${av.total} completadas (${av.pct} %)`) : null,
      entradaRapida({ proyecto: tipo === 'proyecto' ? clave : null, modulo: proyecto?.modulo || null }, pintar),
      raices.length
        ? listaTareas(raices, { alCambiar: pintar, hoy: hoyISO, orden, conSubtareas: true })
        : vacio('Esta lista está vacía. Escribe arriba para empezar.', '🗒️'),

      tipo === 'proyecto' && proyecto ? el('div', { class: 'fila', style: 'margin-top:20px' },
        button('Borrar proyecto', () => {
          if (!window.confirm(`¿Borrar el proyecto “${clave}”? Las tareas se quedan sin proyecto.`)) return;
          store.borrarProyecto(proyecto.id);
          location.hash = '#/hoy';
        }, { variant: 'ghost danger chico' })) : null,

      tipo === 'filtro' && filtro && !filtro.id.startsWith('f-') ? el('div', { class: 'fila', style: 'margin-top:20px' },
        button('Borrar filtro', () => { store.borrarFiltro(filtro.id); location.hash = '#/hoy'; }, { variant: 'ghost danger chico' })) : null);
  };

  pintar();
  render(root, host);
}

/** Pantalla para crear un filtro nuevo con ayuda del lenguaje de filtros. */
export function vistaFiltroNuevo(root) {
  const host = el('div', {});
  let nombre = '';
  let expresion = 'hoy | vencidas';

  const pintar = () => {
    const resultado = (() => {
      try { return aplicarFiltro(expresion, store.tareas, { hoy: aISO(fechaHoy()) }); }
      catch { return []; }
    })();

    render(host,
      tituloVista('Filtro nuevo', 'Guarda una búsqueda que uses cada semana'),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Nombre'),
        input(nombre, (v) => { nombre = v; })),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Expresión'),
        input(expresion, (v) => { expresion = v; pintar(); })),
      el('div', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Cómo se escribe'),
        el('ul', { class: 'small muted' },
          el('li', {}, '`hoy`, `vencidas`, `7 días`, `sin fecha`, `pendientes`, `completadas`, `repetidas`'),
          el('li', {}, '`p1`…`p4` · `#Proyecto` · `@etiqueta` · `módulo:inversiones`'),
          el('li', {}, '`buscar: texto` · `antes de: 15 de octubre` · `después de: mañana`'),
          el('li', {}, 'Se combinan con `&` (y), `|` (o), `!` (no) y paréntesis.'))),
      el('p', { class: 'muted small' }, `${resultado.length} tareas coinciden ahora mismo:`),
      listaTareas(resultado.slice(0, 15), { alCambiar: pintar }),
      el('div', { class: 'fila', style: 'margin-top:14px' },
        button('Guardar filtro', () => {
          if (!nombre.trim()) { toast('Ponle un nombre', 'warn'); return; }
          const f = store.agregarFiltro(nombre.trim(), expresion);
          location.hash = `#/filtro/${f.id}`;
        }, { variant: 'primary' })));
  };

  pintar();
  render(root, host);
}
