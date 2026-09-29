/**
 * plantillas.js (vista) — Listas reutilizables.
 *
 * Elegir la plantilla, elegir el día señalado y ver exactamente qué tareas se
 * van a crear y en qué fechas antes de crear nada.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, deISO, hoy as fechaHoy, sumarDias, textoRelativo, MESES_CORTO } from '../fechas.js';
import { MODULOS } from '../modelo.js';
import {
  PLANTILLAS_INICIALES, aplicarPlantilla, plantillaDesdeTareas, plantillaVacia,
  previsualizar, resumenPlantilla,
} from '../plantillasLista.js';
import { dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaPlantillas(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let seleccionada = ctx.query?.p || store.estado.plantillas[0]?.id || null;
  let ancla = hoyISO;
  let editando = false;

  const plantilla = () => store.estado.plantillas.find((p) => p.id === seleccionada) || null;
  const guardar = () => { store.guardar(); pintar(); };

  const pintar = () => {
    const p = plantilla();
    render(host,
      tituloVista('Plantillas', 'Listas que se repiten enteras, con sus distancias entre tareas'),

      el('div', { class: 'chip-list', style: 'margin-bottom:14px' },
        ...store.estado.plantillas.map((x) => el('button', {
          class: `chip ${x.id === seleccionada ? 'activa' : ''}`.trim(),
          onClick: () => { seleccionada = x.id; editando = false; pintar(); },
        }, `${MODULOS.find((m) => m.id === x.modulo)?.icono || '📋'} ${x.nombre}`)),
        el('button', {
          class: 'chip', onClick: () => {
            const nueva = store.agregarPlantilla(plantillaVacia());
            seleccionada = nueva.id;
            editando = true;
            pintar();
          },
        }, '+ nueva'),
        el('button', { class: 'chip', onClick: crearDesdeLista }, '+ desde un proyecto')),

      !p ? vacio('Sin plantillas. Crea una o guarda una lista que ya uses.', '📋') : panel(p));
  };

  function panel(p) {
    const r = resumenPlantilla(p);
    const previa = previsualizar(p, ancla);

    return el('div', {},
      el('section', { class: 'card' },
        el('div', { class: 'fila entre' },
          el('div', { class: 'grow' },
            el('h2', { class: 'card-title', style: 'margin-bottom:2px' }, p.nombre),
            p.descripcion ? el('p', { class: 'muted small', style: 'margin:0' }, p.descripcion) : null),
          el('div', { class: 'fila' },
            button(editando ? 'Listo' : 'Editar', () => { editando = !editando; pintar(); }, { variant: 'ghost chico' }),
            button('🗑', () => {
              if (!window.confirm(`¿Borrar la plantilla “${p.nombre}”?`)) return;
              store.borrarPlantilla(p.id);
              seleccionada = store.estado.plantillas[0]?.id || null;
              pintar();
            }, { variant: 'ghost chico danger' }))),

        el('div', { class: 'tarjetas', style: 'margin-top:10px' },
          dato(r.total, 'pasos'),
          dato(`${r.desde} a +${r.hasta}`, 'días alrededor del ancla'),
          dato(r.minutos ? `${Math.round(r.minutos / 6) / 10} h` : '—', 'trabajo estimado')),

        el('div', { class: 'fila', style: 'margin-top:14px' },
          el('label', { class: 'field', style: 'width:200px' },
            el('span', { class: 'field-label' }, `¿Cuándo es ${p.anclaNombre}?`),
            el('input', { class: 'input', type: 'date', value: ancla, onChange: (e) => { ancla = e.target.value || hoyISO; pintar(); } })),
          el('label', { class: 'field', style: 'width:200px' },
            el('span', { class: 'field-label' }, 'Proyecto donde crearlas'),
            el('select', { class: 'input', id: 'proyecto-destino' },
              el('option', { value: '' }, p.proyecto || '— el de la plantilla —'),
              ...store.estado.proyectos.map((x) => el('option', { value: x.nombre }, x.nombre)))),
          button('Crear las tareas', () => {
            const destino = document.getElementById('proyecto-destino')?.value || null;
            const tareas = aplicarPlantilla(p, ancla, destino ? { proyecto: destino } : {});
            const n = store.sembrarTareas(tareas, `plantilla-${p.id}-${ancla}`);
            toast(n ? `${n} tareas creadas` : 'Ya estaban creadas para esa fecha');
          }, { variant: 'primary' }))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `Qué se va a crear (${previa.length})`),
        el('table', { class: 'tabla' },
          el('tbody', {}, ...previa.map((t) => el('tr', {},
            el('td', { class: 'small muted', style: 'width:110px' },
              t.fecha ? `${formatoCorto(t.fecha)}${t.hora ? ` ${t.hora}` : ''}` : 'sin fecha'),
            el('td', { class: 'small muted', style: 'width:110px' }, t.fecha ? textoRelativo(t.fecha, deISO(hoyISO)) : ''),
            el('td', {}, t.titulo)))))),

      editando ? editor(p) : null);
  }

  function editor(p) {
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Editar la plantilla'),
      el('div', { class: 'fila' },
        campo('Nombre', p.nombre, (v) => { p.nombre = v; guardar(); }, 220),
        campo('Cómo se llama el día ancla', p.anclaNombre, (v) => { p.anclaNombre = v; guardar(); }, 200),
        el('label', { class: 'field', style: 'width:170px' },
          el('span', { class: 'field-label' }, 'Módulo'),
          el('select', { class: 'input', onChange: (e) => { p.modulo = e.target.value || null; guardar(); } },
            el('option', { value: '' }, '—'),
            ...MODULOS.map((m) => el('option', { value: m.id, selected: m.id === p.modulo }, `${m.icono} ${m.nombre}`))))),
      campo('Descripción', p.descripcion || '', (v) => { p.descripcion = v; guardar(); }, 460),

      el('div', { class: 'tabla-scroll' },
        el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {},
            ...['Paso', 'Días (− antes, + después)', 'Hora', 'Min', 'Prio', ''].map((h) => el('th', {}, h)))),
          el('tbody', {}, ...(p.items || []).map((item, i) => el('tr', {},
            el('td', {}, el('input', {
              class: 'input', style: 'width:260px;padding:4px 6px', value: item.titulo,
              onChange: (e) => { item.titulo = e.target.value; guardar(); },
            })),
            el('td', {}, el('input', {
              class: 'input', style: 'width:80px;padding:4px 6px', type: 'number', value: item.offset ?? 0,
              disabled: item.sinFecha,
              onChange: (e) => { item.offset = Number(e.target.value) || 0; guardar(); },
            }),
            el('label', { class: 'chip', style: 'margin-left:6px;cursor:pointer' },
              el('input', {
                type: 'checkbox', checked: !!item.sinFecha,
                onChange: (e) => { item.sinFecha = e.target.checked || undefined; guardar(); },
              }), 'sin fecha')),
            el('td', {}, el('input', {
              class: 'input', style: 'width:100px;padding:4px 6px', type: 'time', value: item.hora || '',
              onChange: (e) => { item.hora = e.target.value || null; guardar(); },
            })),
            el('td', {}, el('input', {
              class: 'input', style: 'width:70px;padding:4px 6px', type: 'number', value: item.duracion || '',
              onChange: (e) => { item.duracion = Number(e.target.value) || null; guardar(); },
            })),
            el('td', {}, el('input', {
              class: 'input', style: 'width:60px;padding:4px 6px', type: 'number', min: 1, max: 4, value: item.prioridad || 3,
              onChange: (e) => { item.prioridad = Number(e.target.value) || 3; guardar(); },
            })),
            el('td', {}, button('🗑', () => { p.items.splice(i, 1); guardar(); }, { variant: 'ghost chico danger' }))))))),

      el('div', { class: 'fila', style: 'margin-top:10px' },
        button('+ Paso', () => {
          p.items = [...(p.items || []), { titulo: 'Paso nuevo', offset: 0, prioridad: 3 }];
          guardar();
        }),
        button('Ordenar por fecha', () => {
          p.items.sort((a, b) => (a.offset || 0) - (b.offset || 0));
          guardar();
        }, { variant: 'ghost' })));
  }

  /** Guardar como plantilla una lista de tareas que ya existe. */
  function crearDesdeLista() {
    const proyectos = store.estado.proyectos.map((p) => p.nombre);
    const nombre = window.prompt(`¿De qué proyecto? (${proyectos.join(', ')})`);
    if (!nombre) return;
    const tareas = store.tareas.filter((t) => t.proyecto === nombre && !t.padre);
    if (!tareas.length) { toast('Ese proyecto no tiene tareas', 'warn'); return; }
    const nueva = plantillaDesdeTareas(tareas, {
      nombre: `${nombre} (plantilla)`,
      descripcion: `Creada desde el proyecto ${nombre}.`,
      anclaNombre: 'el día señalado',
    });
    store.agregarPlantilla(nueva);
    seleccionada = nueva.id;
    editando = true;
    toast(`Plantilla creada con ${nueva.items.length} pasos`);
    pintar();
  }

  pintar();
  render(root, host);
}

function campo(etiqueta, valor, alCambiar, ancho = 200) {
  return el('label', { class: 'field', style: `width:${ancho}px` },
    el('span', { class: 'field-label' }, etiqueta),
    el('input', { class: 'input', value: valor, onChange: (e) => alCambiar(e.target.value) }));
}

function formatoCorto(iso) {
  const d = deISO(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTO[d.getMonth()]}`;
}
