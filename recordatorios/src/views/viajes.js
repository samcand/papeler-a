/**
 * viajes.js (vista) — El viaje entero en una pantalla.
 *
 * No guarda nada por duplicado: el itinerario son las tareas que caen entre las
 * dos fechas, y el presupuesto son los gastos marcados con este viaje. Apuntar
 * un gasto del viaje es apuntar un gasto, y no hay dos verdades.
 */

import { button, el, input, render, textarea, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoLargo } from '../fechas.js';
import { cuentaAtras, diasDeViaje, estadoViaje, itinerario, preparacion, presupuestoViaje, resumenViajes, viajeNuevo } from '../viajes.js';
import { PLANTILLAS_INICIALES, aplicarPlantilla } from '../plantillasLista.js';
import { barra, dato, listaTareas, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaViajes(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let elegido = ctx.query?.v || null;

  const viajes = () => store.estado.viajes || [];
  const actual = () => viajes().find((v) => v.id === elegido) || null;

  const pintar = () => {
    const r = resumenViajes(viajes(), hoyISO);
    if (!elegido) elegido = (r.enCurso || r.proximo || viajes()[0])?.id || null;
    const v = actual();

    render(host,
      tituloVista('Viajes', 'Fechas, itinerario, papeles y lo que llevas gastado'),

      el('div', { class: 'fila', style: 'margin-bottom:12px' },
        viajes().length ? el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { elegido = e.target.value; pintar(); },
        }, ...viajes().map((x) => el('option', { value: x.id, selected: x.id === elegido }, x.nombre))) : null,
        button('+ Viaje', () => {
          const nuevo = store.agregarEn('viajes', viajeNuevo({ nombre: 'Viaje nuevo' }));
          elegido = nuevo.id;
          pintar();
        }, { variant: 'primary' })),

      el('p', { class: 'muted small' }, r.frase),

      !v ? vacio('Ningún viaje todavía.', '✈️') : el('div', {},
        ficha(v), panelPreparacion(v), panelItinerario(v), panelDinero(v)));
  };

  function ficha(v) {
    const cuenta = cuentaAtras(v, hoyISO);
    const estado = estadoViaje(v, hoyISO);
    return el('section', { class: 'card' },
      el('div', { class: 'fila' },
        el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'Nombre'),
          input(v.nombre, (x) => { v.nombre = x; store.guardar(); })),
        el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'Destino'),
          input(v.destino || '', (x) => { v.destino = x; store.guardar(); })),
        button('🗑', () => {
          if (!window.confirm(`¿Borrar “${v.nombre}”? Los gastos se quedan, sin viaje.`)) return;
          store.borrarEn('viajes', v.id);
          elegido = null;
          pintar();
        }, { variant: 'ghost danger chico', title: 'Borrar el viaje' })),
      el('div', { class: 'fila' },
        el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Salida'),
          el('input', { class: 'input', type: 'date', value: v.desde, onChange: (e) => { v.desde = e.target.value; store.guardar(); pintar(); } })),
        el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Vuelta'),
          el('input', { class: 'input', type: 'date', value: v.hasta, onChange: (e) => { v.hasta = e.target.value; store.guardar(); pintar(); } })),
        el('label', { class: 'field', style: 'width:150px' }, el('span', { class: 'field-label' }, 'Presupuesto'),
          el('input', {
            class: 'input', type: 'number', value: v.presupuesto || '',
            onChange: (e) => { v.presupuesto = Number(e.target.value) || 0; store.guardar(); pintar(); },
          })),
        el('label', { class: 'field', style: 'width:120px' }, el('span', { class: 'field-label' }, 'Personas'),
          el('input', {
            class: 'input', type: 'number', min: 1, value: v.personas || 1,
            onChange: (e) => { v.personas = Number(e.target.value) || 1; store.guardar(); pintar(); },
          }))),
      el('div', { class: 'tarjetas' },
        dato(cuenta.dias, estado === 'encurso' ? 'día de viaje' : (estado === 'proximo' ? 'días para salir' : 'días desde la vuelta')),
        dato(diasDeViaje(v), 'días en total'),
        dato(textoLargo(v.desde).replace(/ de \d{4}$/, ''), 'salida')),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Notas'),
        textarea(v.notas || '', (x) => { v.notas = x; store.guardar(); }, { rows: 3, placeholder: 'Reservas, direcciones, quién recoge las llaves…' })));
  }

  function panelPreparacion(v) {
    const pendientes = preparacion(v, store.tareas);
    // La tuya si la has tocado; si no, la que viene puesta.
    const plantilla = (store.estado.plantillas || []).find((p) => p.id === 'pl-viaje')
      || PLANTILLAS_INICIALES.find((p) => p.id === 'pl-viaje');
    return el('section', { class: 'card' },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' }, `Preparación (${pendientes.length})`),
        plantilla ? button('Traer la lista del viaje', () => {
          const tareas = aplicarPlantilla(plantilla, v.desde).map((t) => ({ ...t, proyecto: v.nombre }));
          const n = store.sembrarTareas(tareas, `viaje-${v.id}`);
          toast(n ? `${n} tareas creadas` : 'Ya estaban creadas');
          pintar();
        }, { variant: 'ghost chico' }) : null),
      pendientes.length
        ? listaTareas(pendientes, { alCambiar: pintar, hoy: hoyISO })
        : el('p', { class: 'muted small' },
          'Nada pendiente antes de salir. Las tareas cuentan como del viaje si están en su proyecto o llevan su nombre.'));
  }

  function panelItinerario(v) {
    const dias = itinerario(v, store.tareas);
    const conAlgo = dias.filter((d) => d.tareas.length);
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Itinerario'),
      !conAlgo.length
        ? el('p', { class: 'muted small' }, 'Sin nada planificado todavía. Cualquier tarea con fecha entre la salida y la vuelta aparece aquí.')
        : el('div', {}, ...dias.map((d) => el('div', { class: 'grupo-dia' },
          el('h3', {}, `Día ${d.numero}`, ' ', el('span', { class: 'muted small' }, d.texto)),
          d.tareas.length
            ? listaTareas(d.tareas, { alCambiar: pintar, hoy: hoyISO })
            : el('p', { class: 'muted small' }, 'Libre.')))));
  }

  function panelDinero(v) {
    const p = presupuestoViaje(v, store.estado.gastos || [], hoyISO);
    return el('section', { class: 'card' },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' }, 'Dinero'),
        el('a', { class: 'btn ghost chico', href: '#/gastos' }, 'Apuntar un gasto')),
      p.presupuesto ? barra(p.pct ?? 0, p.pasado ? 'var(--danger)' : 'var(--accent-2)') : null,
      el('p', { class: p.pasado ? 'negativo' : 'muted small' }, p.frase),
      el('div', { class: 'tarjetas' },
        dato(p.gastado.toLocaleString('es'), 'gastado'),
        dato(p.porDia.toLocaleString('es'), 'por día'),
        p.porPersona != null ? dato(p.porPersona.toLocaleString('es'), 'por persona') : null,
        p.quedaPorDia != null ? dato(p.quedaPorDia.toLocaleString('es'), 'queda por día') : null),
      p.porCategoria.length ? el('div', {}, ...p.porCategoria.map((c) => el('div', { class: 'salud-fila' },
        el('span', { style: 'min-width:150px' }, `${c.icono} ${c.nombre}`),
        el('div', { class: 'grow' }, barra(c.pct)),
        el('span', { class: 'muted small' }, `${c.importe.toLocaleString('es')} · ${c.pct} %`)))) : null);
  }

  pintar();
  render(root, host);
}
