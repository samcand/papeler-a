/**
 * importar-lista.js (vista) — Recibir una lista compartida por enlace.
 *
 * Se enseña qué trae antes de guardar nada: aceptar a ciegas lo que llega por
 * un enlace es justo lo que no queremos.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoRelativo } from '../fechas.js';
import { MODULOS } from '../modelo.js';
import { listaDeEnlace } from '../compartir.js';
import { listaTareas, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaImportarLista(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let paquete = null;
  let proyecto = '';
  let modulo = '';

  const pintar = () => {
    render(host,
      tituloVista('Lista compartida', paquete ? paquete.nombre : 'Leyendo el enlace…'),

      !paquete ? vacio('Este enlace no trae ninguna lista, o está incompleto.', '🔗')
        : el('div', {},
          el('p', { class: 'muted small' },
            `${paquete.tareas.length} tareas${paquete.fecha ? ` · compartidas el ${paquete.fecha}` : ''}. `,
            'Nada se guarda hasta que lo aceptes.'),

          el('section', { class: 'card' },
            el('h2', { class: 'card-title' }, 'Qué trae'),
            el('table', { class: 'tabla' },
              el('tbody', {}, ...paquete.tareas.map((t) => el('tr', {},
                el('td', {}, t.titulo),
                el('td', { class: 'small muted' }, t.fecha ? `${t.fecha}${t.hora ? ` ${t.hora}` : ''}` : 'sin fecha'),
                el('td', { class: 'small muted' }, t.duracion ? `${t.duracion} min` : ''))))))
,
          el('div', { class: 'fila' },
            el('label', { class: 'field', style: 'width:200px' },
              el('span', { class: 'field-label' }, 'Guardar en el proyecto'),
              el('select', { class: 'input', onChange: (e) => { proyecto = e.target.value; } },
                el('option', { value: '' }, '— sin proyecto —'),
                ...store.estado.proyectos.map((p) => el('option', { value: p.nombre }, p.nombre)))),
            el('label', { class: 'field', style: 'width:200px' },
              el('span', { class: 'field-label' }, 'Módulo'),
              el('select', { class: 'input', onChange: (e) => { modulo = e.target.value; } },
                el('option', { value: '' }, '—'),
                ...MODULOS.map((m) => el('option', { value: m.id }, `${m.icono} ${m.nombre}`))))),

          el('div', { class: 'fila', style: 'margin-top:12px' },
            button(`Añadir las ${paquete.tareas.length} tareas`, () => {
              store.instantanea('Importar lista compartida');
              const n = store.sembrarTareas(paquete.tareas.map((t) => ({
                ...t, proyecto: proyecto || null, modulo: modulo || null,
              })), `compartida-${paquete.nombre}-${paquete.fecha}`);
              toast(n ? `${n} tareas añadidas` : 'Ya las tenías');
              location.hash = '#/hoy';
            }, { variant: 'primary' }),
            button('No, gracias', () => { location.hash = '#/hoy'; }, { variant: 'ghost' }))));
  };

  pintar();
  render(root, host);

  listaDeEnlace(ctx.query?.d).then((p) => { paquete = p; pintar(); });
}
