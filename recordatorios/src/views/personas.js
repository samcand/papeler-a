/**
 * personas.js (vista) — Cumpleaños, fechas que no se olvidan y regalos.
 *
 * El problema no es acordarse el día: es acordarse con tiempo. Por eso cada
 * fecha lleva sus días de antelación y la tarea se crea entonces, no la víspera.
 */

import { button, el, input, render, textarea, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoLargo } from '../fechas.js';
import { agenda, edad, personaNueva, regalosPendientes, resumenPersonas, tareaDeFecha, tocaPreparar } from '../personas.js';
import { dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaPersonas(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let abierta = null;

  const personas = () => store.estado.personas || [];

  const pintar = () => {
    const r = resumenPersonas(personas(), hoyISO);
    const proximos = agenda(personas(), hoyISO, 120);
    const preparar = tocaPreparar(personas(), hoyISO);
    const regalos = regalosPendientes(personas());

    render(host,
      tituloVista('Personas', 'Cumpleaños, fechas y las ideas de regalo de cada uno'),

      el('div', { class: 'tarjetas' },
        dato(personas().length, 'personas'),
        dato(proximos.length, 'fechas en 4 meses'),
        dato(preparar.length, 'para preparar ya', { clase: preparar.length ? 'negativo' : '' }),
        dato(regalos.length, 'regalos pensados')),

      preparar.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Toca preparar'),
        ...preparar.map((ev) => el('div', { class: 'alerta medio' },
          el('div', {},
            el('div', {}, `${ev.texto} — en ${ev.faltan} día${ev.faltan === 1 ? '' : 's'}`),
            el('div', { class: 'accion' },
              button('Hacer tarea', () => {
                store.agregar(tareaDeFecha(ev));
                toast('Tarea creada');
              }, { variant: 'ghost chico' })))))) : null,

      el('section', { class: 'card' },
        el('div', { class: 'fila entre' },
          el('h2', { class: 'card-title', style: 'margin:0' }, 'Lo que viene'),
          button('+ Persona', () => {
            const p = store.agregarEn('personas', personaNueva({ nombre: '' }));
            abierta = p.id;
            pintar();
          }, { variant: 'primary chico' })),
        !proximos.length ? vacio('Nada en los próximos cuatro meses.', '🎂')
          : el('div', {}, ...proximos.map((ev) => el('div', { class: 'salud-fila' },
            el('span', { style: 'min-width:34px' }, ev.tipo === 'cumple' ? '🎂' : '📌'),
            el('span', { class: 'grow' }, ev.texto),
            el('span', { class: 'muted small' }, `en ${ev.faltan} d`),
            button('Abrir', () => { abierta = ev.persona.id; pintar(); }, { variant: 'ghost chico' })))),
        el('p', { class: 'muted small' }, r.frase)),

      ...personas().map(ficha),

      regalos.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Regalos pensados y no comprados'),
        ...regalos.map(({ persona, regalo }) => el('div', { class: 'salud-fila' },
          el('span', { class: 'grow' }, `${regalo.que} — para ${persona.nombre}`),
          regalo.precio ? el('span', { class: 'muted small' }, String(regalo.precio)) : null,
          button('Comprado', () => {
            const r2 = persona.regalos.find((x) => x.id === regalo.id);
            r2.comprado = true;
            store.guardar();
            pintar();
          }, { variant: 'ghost chico' })))) : null);
  };

  function ficha(p) {
    if (abierta !== p.id) {
      const anios = edad(p.cumple, hoyISO);
      return el('section', { class: 'card' },
        el('div', { class: 'fila entre' },
          el('h3', { class: 'card-title', style: 'margin:0' },
            p.nombre || 'Sin nombre', p.relacion ? el('span', { class: 'muted small' }, ` · ${p.relacion}`) : null),
          el('div', { class: 'fila' },
            el('span', { class: 'muted small' },
              p.cumple ? `${textoLargo(p.cumple).replace(/ de \d{4}$/, '')}${anios != null ? ` · ${anios} años` : ''}` : 'sin cumpleaños'),
            button('✏️', () => { abierta = p.id; pintar(); }, { variant: 'ghost chico', title: 'Editar' }))));
    }

    return el('section', { class: 'card' },
      el('div', { class: 'fila' },
        el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'Nombre'),
          input(p.nombre, (v) => { p.nombre = v; store.guardar(); }, { placeholder: 'Cómo la llamas' })),
        el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Relación'),
          input(p.relacion || '', (v) => { p.relacion = v; store.guardar(); }, { placeholder: 'hermana, colega…' })),
        el('label', { class: 'field', style: 'width:180px' }, el('span', { class: 'field-label' }, 'Cumpleaños'),
          el('input', {
            class: 'input', type: 'date', value: p.cumple || '',
            onChange: (e) => { p.cumple = e.target.value || null; store.guardar(); pintar(); },
          })),
        el('label', { class: 'field', style: 'width:140px' }, el('span', { class: 'field-label' }, 'Avisar (días antes)'),
          el('input', {
            class: 'input', type: 'number', value: p.avisarAntes ?? 14,
            onChange: (e) => { p.avisarAntes = Number(e.target.value) || 0; store.guardar(); pintar(); },
          }))),

      el('div', { class: 'field' },
        el('span', { class: 'field-label' }, 'Otras fechas'),
        ...(p.fechas || []).map((f, i) => el('div', { class: 'fila' },
          input(f.que || '', (v) => { f.que = v; store.guardar(); }, { placeholder: 'Aniversario, santo…' }),
          el('input', {
            class: 'input', type: 'date', style: 'width:170px', value: f.fecha || '',
            onChange: (e) => { f.fecha = e.target.value; store.guardar(); pintar(); },
          }),
          el('label', { class: 'chip', style: 'cursor:pointer' },
            el('input', {
              type: 'checkbox', checked: f.anual !== false,
              onChange: (e) => { f.anual = e.target.checked; store.guardar(); pintar(); },
            }), 'cada año'),
          button('✕', () => { p.fechas.splice(i, 1); store.guardar(); pintar(); },
            { variant: 'ghost chico', title: 'Quitar la fecha' }))),
        button('+ Fecha', () => {
          p.fechas = [...(p.fechas || []), { id: 'f' + Math.random().toString(36).slice(2, 6), que: '', fecha: hoyISO, anual: true, avisarAntes: 7 }];
          store.guardar();
          pintar();
        }, { variant: 'ghost chico' })),

      el('div', { class: 'field' },
        el('span', { class: 'field-label' }, 'Ideas de regalo'),
        el('span', { class: 'field-hint' }, 'La idea se te ocurre en marzo; el cumpleaños es en noviembre.'),
        ...(p.regalos || []).map((g, i) => el('div', { class: 'fila' },
          input(g.que || '', (v) => { g.que = v; store.guardar(); }, { placeholder: 'Qué' }),
          el('input', {
            class: 'input', type: 'number', style: 'width:120px', placeholder: 'precio', value: g.precio ?? '',
            onChange: (e) => { g.precio = Number(e.target.value) || null; store.guardar(); },
          }),
          el('label', { class: 'chip', style: 'cursor:pointer' },
            el('input', {
              type: 'checkbox', checked: !!g.comprado,
              onChange: (e) => { g.comprado = e.target.checked; store.guardar(); pintar(); },
            }), 'comprado'),
          button('✕', () => { p.regalos.splice(i, 1); store.guardar(); pintar(); },
            { variant: 'ghost chico', title: 'Quitar la idea' }))),
        button('+ Idea', () => {
          p.regalos = [...(p.regalos || []), { id: 'g' + Math.random().toString(36).slice(2, 6), que: '', comprado: false }];
          store.guardar();
          pintar();
        }, { variant: 'ghost chico' })),

      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Notas'),
        textarea(p.notas || '', (v) => { p.notas = v; store.guardar(); }, { rows: 3, placeholder: 'Tallas, gustos, alergias, de qué hablasteis…' })),

      el('div', { class: 'fila' },
        button('Listo', () => { abierta = null; pintar(); }, { variant: 'primary' }),
        button('Borrar', () => {
          if (!window.confirm(`¿Borrar a ${p.nombre}?`)) return;
          store.borrarEn('personas', p.id);
          abierta = null;
          pintar();
        }, { variant: 'ghost danger chico' })));
  }

  pintar();
  render(root, host);
}
