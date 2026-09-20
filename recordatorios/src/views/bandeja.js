/**
 * bandeja.js (vista) — La bandeja de entrada universal.
 *
 * Capturar y decidir son dos trabajos distintos: aquí se suelta cualquier cosa
 * sin pensar dónde va, y cuando toca, se procesa una por una. Un elemento sale
 * de la bandeja en cuanto tiene proyecto o módulo.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, deISO, diferenciaDias, hoy as fechaHoy, inicioSemana, sumarDias, textoRelativo } from '../fechas.js';
import { MODULOS, estadoBandeja } from '../modelo.js';
import { proyectoVacio, tareaProyecto } from '../proyectos.js';
import { colorModulo, entradaRapida, itemTarea, listaTareas, panelTarea, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaBandeja(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let procesando = false;
  let indice = 0;

  const pintar = () => {
    const b = estadoBandeja(store.tareas, hoyISO);
    if (indice >= b.items.length) indice = 0;

    render(host,
      tituloVista('Bandeja', b.total ? `${b.total} sin clasificar` : 'vacía',
        el('span', { class: 'grow' }),
        b.total ? el('button', {
          class: `chip ${procesando ? 'activa' : ''}`.trim(),
          onClick: () => { procesando = !procesando; indice = 0; pintar(); },
        }, procesando ? 'ver la lista' : 'procesar una por una') : null),

      el('p', { class: 'muted small' },
        'Suelta aquí lo que se te ocurra sin decidir nada. Una cosa sale de la bandeja cuando tiene proyecto o módulo.'),

      entradaRapida({}, () => { indice = 0; pintar(); }),

      b.total && b.conviéneVaciar ? el('div', { class: 'alerta medio' },
        el('div', {},
          el('div', {}, b.masViejo >= 3
            ? `Lo más antiguo lleva ${b.masViejo} días aquí.`
            : `Hay ${b.total} cosas esperando una decisión.`),
          el('div', { class: 'accion' }, 'Procesar la bandeja son cinco minutos; dejarla crecer cuesta mucho más.'))) : null,

      !b.total ? vacio('Bandeja vacía. Eso sí es tener la cabeza despejada.', '🎉')
        : procesando ? procesador(b) : listaCompleta(b));
  };

  /* --------------------- procesar de una en una --------------------- */

  function procesador(b) {
    const tarea = b.items[indice];
    if (!tarea) return vacio('No queda nada por procesar.', '🎉');
    const dias = diferenciaDias(String(tarea.creadaEn).slice(0, 10), hoyISO);

    const clasificar = (cambios, mensaje) => {
      store.actualizar(tarea.id, cambios);
      if (mensaje) toast(mensaje);
      pintar();
    };

    return el('section', { class: 'card procesador' },
      el('p', { class: 'muted small' }, `${indice + 1} de ${b.items.length} · capturada ${dias === 0 ? 'hoy' : `hace ${dias} días`}`),
      el('input', {
        class: 'input', style: 'font-size:1.15rem;padding:12px', value: tarea.titulo,
        onChange: (e) => store.actualizar(tarea.id, { titulo: e.target.value }),
      }),
      tarea.notas ? el('p', { class: 'muted small' }, tarea.notas) : null,

      el('p', { class: 'field-label', style: 'margin-top:14px' }, '¿Cuándo?'),
      el('div', { class: 'chip-list' },
        ...[['Hoy', hoyISO], ['Mañana', aISO(sumarDias(hoyISO, 1))],
          ['Esta semana', aISO(sumarDias(inicioSemana(hoyISO), 4))], ['Próxima semana', aISO(sumarDias(inicioSemana(hoyISO), 7))]]
          .map(([texto, fecha]) => el('button', {
            class: 'chip', onClick: () => clasificar({ fecha }, `Para ${texto.toLowerCase()}`),
          }, texto)),
        el('button', { class: 'chip', onClick: () => clasificar({ fecha: null }, 'Sin fecha') }, 'Algún día')),

      el('p', { class: 'field-label', style: 'margin-top:12px' }, '¿De qué es?'),
      el('div', { class: 'chip-list' },
        ...MODULOS.map((m) => el('button', {
          class: 'chip', style: `border-color:${m.color}`,
          onClick: () => clasificar({ modulo: m.id }, `A ${m.nombre}`),
        }, `${m.icono} ${m.nombre}`))),

      el('p', { class: 'field-label', style: 'margin-top:12px' }, '¿A qué lista?'),
      el('div', { class: 'fila' },
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => {
            if (!e.target.value) return;
            const proyecto = store.estado.proyectos.find((p) => p.nombre === e.target.value);
            clasificar({ proyecto: e.target.value, modulo: proyecto?.modulo || tarea.modulo }, `A ${e.target.value}`);
          },
        }, el('option', { value: '' }, 'Elegir proyecto…'),
        ...store.estado.proyectos.map((p) => el('option', { value: p.nombre }, p.nombre))),
        button('Editar a fondo', () => panelTarea(tarea, pintar), { variant: 'ghost' })),

      el('div', { class: 'fila', style: 'margin-top:16px;border-top:1px solid var(--line);padding-top:12px' },
        button('✅ Hecha ahora (regla de 2 min)', () => {
          store.alternarCompletada(tarea.id, hoyISO);
          store.registrarTiempo({ tipo: 'rapida', tareaId: tarea.id, minutos: 2, fecha: hoyISO, fin: new Date().toISOString() });
          toast('Hecha y fuera');
          pintar();
        }, { variant: 'ok' }),
        button('📐 Es un proyecto', () => {
          const plan = proyectoVacio(tarea.titulo, hoyISO);
          plan.tareas = [tareaProyecto({ nombre: 'Primer paso', duracion: 1 })];
          store.agregarPlan(plan);
          store.actualizar(tarea.id, { modulo: 'proyectos', proyecto: null, notas: `${tarea.notas || ''}\nPlanificado en Proyectos.`.trim() });
          toast('Creado como proyecto');
          location.hash = '#/proyectos';
        }, { title: 'Si no se hace en un paso, no es una tarea' }),
        button('⏭ Saltar', () => { indice = (indice + 1) % b.items.length; pintar(); }, { variant: 'ghost' }),
        button('🗑 Borrar', () => { store.borrar(tarea.id); pintar(); }, { variant: 'ghost danger' })),

      el('p', { class: 'field-hint', style: 'margin-top:10px' },
        'Atajos: H hoy · M mañana · S esta semana · Enter saltar · Supr borrar.'));
  }

  function listaCompleta(b) {
    return el('div', {},
      el('div', { class: 'lista-tareas' },
        ...b.items.map((t) => el('div', { class: 'item-bandeja' },
          itemTarea(t, { alCambiar: pintar, hoy: hoyISO }),
          el('div', { class: 'chip-list', style: 'padding:0 0 10px 30px' },
            ...MODULOS.map((m) => el('button', {
              class: 'chip chico', style: `color:${m.color}`,
              title: `Mandar a ${m.nombre}`,
              onClick: () => { store.actualizar(t.id, { modulo: m.id }); pintar(); },
            }, m.icono)),
            el('button', {
              class: 'chip', onClick: () => { store.actualizar(t.id, { fecha: hoyISO }); pintar(); },
            }, 'hoy'),
            el('button', {
              class: 'chip', onClick: () => { store.actualizar(t.id, { fecha: aISO(sumarDias(hoyISO, 1)) }); pintar(); },
            }, 'mañana'))))));
  }

  /* --------------------------- atajos --------------------------- */

  const alPulsar = (e) => {
    if (!procesando) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const b = estadoBandeja(store.tareas, hoyISO);
    const tarea = b.items[indice];
    if (!tarea) return;
    const teclas = {
      h: () => store.actualizar(tarea.id, { fecha: hoyISO }),
      m: () => store.actualizar(tarea.id, { fecha: aISO(sumarDias(hoyISO, 1)) }),
      s: () => store.actualizar(tarea.id, { fecha: aISO(sumarDias(inicioSemana(hoyISO), 4)) }),
      Delete: () => store.borrar(tarea.id),
      Enter: () => { indice = (indice + 1) % Math.max(1, b.items.length); },
    };
    const accion = teclas[e.key];
    if (!accion) return;
    e.preventDefault();
    accion();
    pintar();
  };
  document.addEventListener('keydown', alPulsar);

  pintar();
  render(root, host);
  return () => document.removeEventListener('keydown', alPulsar);
}
