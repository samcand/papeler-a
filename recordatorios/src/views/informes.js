/**
 * informes.js (vista) — Elegir qué medir y verlo, sin pasar por una hoja de
 * cálculo. Tres menús: qué, cómo se agrupa y en qué periodo.
 */

import { button, download, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import { AGRUPACIONES, INFORMES_GUARDADOS, METRICAS, PERIODOS, informe, informeCSV } from '../informes.js';
import { barra, dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaInformes(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let opciones = { metrica: 'completadas', agrupacion: 'modulo', dias: 30 };

  const menu = (valor, lista, alCambiar, texto = (x) => x.nombre) => {
    const sel = el('select', { class: 'input', onChange: (e) => alCambiar(e.target.value) });
    for (const x of lista) sel.append(el('option', { value: String(x.id), selected: String(x.id) === String(valor) }, texto(x)));
    return sel;
  };

  const pintar = () => {
    const r = informe(store.estado, { ...opciones, hoyISO });
    const maximo = Math.max(1, ...r.filas.map((f) => f.valor));
    const unidad = (v) => (r.unidad === 'minutos' ? `${Math.round(v / 60 * 10) / 10} h` : `${v}`);

    render(host,
      tituloVista('Informes', 'Lo que se puede medir con lo que ya hay guardado'),

      el('section', { class: 'card' },
        el('div', { class: 'fila' },
          el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'Qué medir'),
            menu(opciones.metrica, METRICAS, (v) => { opciones = { ...opciones, metrica: v }; pintar(); })),
          el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'Agrupado'),
            menu(opciones.agrupacion, AGRUPACIONES, (v) => { opciones = { ...opciones, agrupacion: v }; pintar(); })),
          el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'Periodo'),
            menu(opciones.dias, PERIODOS, (v) => { opciones = { ...opciones, dias: Number(v) }; pintar(); }))),
        el('div', { class: 'chip-list' },
          ...INFORMES_GUARDADOS.map((g) => el('button', {
            class: 'chip', type: 'button',
            onClick: () => { opciones = { metrica: g.metrica, agrupacion: g.agrupacion, dias: g.dias }; pintar(); },
          }, g.nombre)),
          ...(store.estado.informes || []).map((g) => el('span', { class: 'chip' },
            el('button', {
              class: 'btn ghost chico', type: 'button',
              onClick: () => { opciones = { metrica: g.metrica, agrupacion: g.agrupacion, dias: g.dias }; pintar(); },
            }, `★ ${g.nombre}`),
            el('button', {
              class: 'btn ghost chico danger', type: 'button', title: 'Quitar',
              onClick: () => { store.borrarEn('informes', g.id); pintar(); },
            }, '✕')))),
        el('div', { class: 'tarjetas', style: 'margin-top:12px' },
          dato(unidad(r.total), `${r.unidad === 'minutos' ? 'en total' : r.unidad}`, { pie: `del ${r.desde} al ${r.hasta}` }),
          dato(r.filas.length, 'grupos'),
          dato(r.filas[0]?.clave || '—', 'el que más', { pie: r.filas[0] ? `${unidad(r.filas[0].valor)} · ${r.filas[0].pct} %` : '' }))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, r.nombre),
        r.vacio
          ? vacio('No hay datos en ese periodo. Con menos de dos semanas de uso, casi todo sale vacío.', '📉')
          : el('div', {}, ...r.filas.map((f) => el('div', { class: 'salud-fila' },
            el('span', { style: 'min-width:150px' }, f.clave),
            barra(Math.round((f.valor / maximo) * 100), 'var(--acento)'),
            el('span', { class: 'muted small', style: 'min-width:90px;text-align:right' }, `${unidad(f.valor)} · ${f.pct} %`)))),
        el('div', { class: 'fila', style: 'margin-top:12px' },
          button('Descargar CSV', () => {
            download(`informe-${r.metrica}-${r.agrupacion}.csv`, informeCSV(r), 'text/csv');
          }),
          button('Guardar este informe', () => {
            const nombre = window.prompt('¿Cómo lo llamas?', r.nombre);
            if (!nombre) return;
            store.agregarEn('informes', { id: 'inf-' + Math.random().toString(36).slice(2, 8), nombre, ...opciones });
            toast('Guardado');
            pintar();
          }))),

      el('p', { class: 'muted small' },
        'Los minutos salen del tiempo medido con el pomodoro y el cronómetro; lo que no mediste no aparece.'));
  };

  pintar();
  root.append(host);
}
