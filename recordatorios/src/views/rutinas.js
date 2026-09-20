/**
 * rutinas.js (vista) — La rutina de la mañana y la de la noche.
 *
 * Una rutina es una sola cosa con pasos dentro, no cinco tareas sueltas que se
 * aplazan de una en una. Se marca de un toque y se ve cuánto dura de verdad,
 * que suele ser más de lo que uno cree.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, DIAS_CORTO, hoy as fechaHoy } from '../fechas.js';
import {
  MOMENTOS, RUTINAS_EJEMPLO, duracionRutina, pasoNuevo, rachaRutina,
  resumenRutinas, rutinaNueva, rutinasDeHoy,
} from '../rutinas.js';
import { barra, dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaRutinas(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let editando = null;

  const rutinas = () => store.estado.rutinas || [];
  const hechas = () => store.estado.rutinasHechas || [];

  const pintar = () => {
    const deHoy = rutinasDeHoy(rutinas(), hechas(), hoyISO);
    const r = resumenRutinas(rutinas(), hechas(), hoyISO);

    render(host,
      tituloVista('Rutinas', 'Lo que se hace todos los días sin pensarlo'),

      el('div', { class: 'tarjetas' },
        dato(deHoy.filter((x) => x.progreso.completa).length + '/' + deHoy.length, 'hechas hoy'),
        dato(r.minutos, 'minutos de rutina hoy'),
        dato(Math.max(0, ...deHoy.map((x) => x.racha)), 'mejor racha viva')),

      el('p', { class: 'muted small' }, r.frase),

      !rutinas().length ? el('section', { class: 'card' },
        vacio('Ninguna rutina montada.', '🌅'),
        el('div', { class: 'fila' },
          button('Traer las de ejemplo', () => {
            for (const r2 of RUTINAS_EJEMPLO) store.agregarEn('rutinas', rutinaNueva(r2));
            pintar();
          }, { variant: 'primary' }),
          button('Empezar una vacía', () => {
            const nueva = store.agregarEn('rutinas', rutinaNueva());
            editando = nueva.id;
            pintar();
          }))) : null,

      ...deHoy.map(({ rutina, progreso, racha }) => tarjetaHoy(rutina, progreso, racha)),

      rutinas().length ? el('section', { class: 'card' },
        el('div', { class: 'fila entre' },
          el('h2', { class: 'card-title', style: 'margin:0' }, 'Todas las rutinas'),
          button('+ Rutina', () => {
            const nueva = store.agregarEn('rutinas', rutinaNueva());
            editando = nueva.id;
            pintar();
          }, { variant: 'primary chico' })),
        ...rutinas().map((r2) => (editando === r2.id ? editor(r2) : fila(r2)))) : null);
  };

  function tarjetaHoy(rutina, progreso, racha) {
    const momento = MOMENTOS.find((m) => m.id === rutina.momento);
    return el('section', { class: `card rutina ${progreso.completa ? 'completa' : ''}`.trim() },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' },
          `${momento?.icono || '🕐'} ${rutina.nombre}`,
          rutina.hora ? el('span', { class: 'muted small' }, ` · ${rutina.hora}`) : null),
        el('span', { class: 'muted small' },
          racha ? `${racha} día${racha === 1 ? '' : 's'} seguidos` : 'sin racha')),
      barra(progreso.pct, progreso.completa ? 'var(--ok, #35c48b)' : 'var(--accent-2)'),
      el('div', { class: 'lista-chequeo', style: 'margin-top:10px' },
        ...progreso.pasos.map((p) => el('label', {},
          el('input', {
            type: 'checkbox', checked: p.hecho,
            onChange: () => { store.alternarPasoRutina(rutina.id, p.id, hoyISO); pintar(); },
          }),
          el('span', { class: p.hecho ? 'muted' : '' }, p.texto),
          el('span', { class: 'muted small' }, ` ${p.minutos} min`)))),
      el('p', { class: 'muted small' },
        progreso.completa
          ? 'Hecha. Mañana otra vez.'
          : `Quedan ${progreso.minutosRestantes} min de los ${duracionRutina(rutina)} que dura.`));
  }

  function fila(r2) {
    return el('div', { class: 'salud-fila' },
      el('span', { style: 'min-width:30px' }, MOMENTOS.find((m) => m.id === r2.momento)?.icono || '🕐'),
      el('span', { class: 'grow' }, r2.nombre),
      el('span', { class: 'muted small' }, `${(r2.pasos || []).length} pasos · ${duracionRutina(r2)} min`),
      el('span', { class: 'muted small' }, (r2.dias || []).map((d) => DIAS_CORTO[d]).join(' ')),
      button(r2.activa === false ? 'Parada' : 'Activa', () => {
        store.actualizarEn('rutinas', r2.id, { activa: r2.activa === false });
        pintar();
      }, { variant: 'ghost chico' }),
      button('✏️', () => { editando = r2.id; pintar(); }, { variant: 'ghost chico', title: 'Editar' }));
  }

  function editor(r2) {
    return el('div', { class: 'idea' },
      el('div', { class: 'fila' },
        input(r2.nombre, (v) => { r2.nombre = v; store.guardar(); }),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { r2.momento = e.target.value; store.guardar(); pintar(); },
        }, ...MOMENTOS.map((m) => el('option', { value: m.id, selected: m.id === r2.momento }, `${m.icono} ${m.nombre}`))),
        el('input', {
          class: 'input', type: 'time', style: 'width:130px', value: r2.hora || '',
          onChange: (e) => { r2.hora = e.target.value || null; store.guardar(); },
        })),
      el('div', { class: 'chip-list' },
        ...DIAS_CORTO.map((d, i) => el('button', {
          class: `chip ${(r2.dias || []).includes(i) ? 'activa' : ''}`.trim(), type: 'button',
          onClick: () => {
            const dias = new Set(r2.dias || []);
            if (dias.has(i)) dias.delete(i); else dias.add(i);
            r2.dias = [...dias].sort();
            store.guardar();
            pintar();
          },
        }, d))),
      ...(r2.pasos || []).map((p, i) => el('div', { class: 'fila' },
        input(p.texto, (v) => { p.texto = v; store.guardar(); }, { placeholder: 'Paso' }),
        el('input', {
          class: 'input', type: 'number', style: 'width:100px', value: p.minutos,
          onChange: (e) => { p.minutos = Number(e.target.value) || 0; store.guardar(); pintar(); },
        }),
        button('↑', () => {
          if (!i) return;
          [r2.pasos[i - 1], r2.pasos[i]] = [r2.pasos[i], r2.pasos[i - 1]];
          store.guardar();
          pintar();
        }, { variant: 'ghost chico', title: 'Subir' }),
        button('✕', () => { r2.pasos.splice(i, 1); store.guardar(); pintar(); },
          { variant: 'ghost chico', title: 'Quitar el paso' }))),
      el('div', { class: 'fila' },
        button('+ Paso', () => { r2.pasos = [...(r2.pasos || []), pasoNuevo('', 5)]; store.guardar(); pintar(); }),
        el('span', { class: 'muted small grow' }, `Dura ${duracionRutina(r2)} min en total.`),
        button('Listo', () => { editando = null; toast('Guardada'); pintar(); }, { variant: 'primary chico' }),
        button('Borrar', () => {
          if (!window.confirm('¿Borrar la rutina?')) return;
          store.borrarEn('rutinas', r2.id);
          editando = null;
          pintar();
        }, { variant: 'ghost danger chico' })));
  }

  pintar();
  render(root, host);
}
