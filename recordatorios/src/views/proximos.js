/** proximos.js (vista) — Los próximos días, agrupados por fecha. */

import { button, el, render } from '../../../src/ui.js';
import { aISO, deISO, hoy as fechaHoy, sumarDias, textoLargo, textoRelativo } from '../fechas.js';
import { entradaRapida, listaTareas, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaProximos(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let dias = 7;

  const pintar = () => {
    const limite = aISO(sumarDias(hoyISO, dias));
    const pendientes = store.tareas.filter((t) => !t.completada && !t.padre);
    const enRango = pendientes.filter((t) => t.fecha && t.fecha >= hoyISO && t.fecha <= limite);
    const sinFecha = pendientes.filter((t) => !t.fecha);

    const grupos = [];
    for (let i = 0; i <= dias; i++) {
      const iso = aISO(sumarDias(hoyISO, i));
      const delDia = enRango.filter((t) => t.fecha === iso);
      if (!delDia.length && i > 0) continue;
      grupos.push(el('section', { class: 'grupo-dia' },
        el('h3', {},
          el('span', {}, textoRelativo(iso, deISO(hoyISO))),
          el('span', { class: 'muted' }, textoLargo(iso)),
          el('span', { class: 'grow' }),
          button('+', () => {
            const t = store.agregar({ titulo: 'Nueva tarea', fecha: iso });
            pintar();
          }, { variant: 'ghost chico', title: 'Añadir en este día' })),
        delDia.length ? listaTareas(delDia, { alCambiar: pintar, hoy: hoyISO, conSubtareas: true })
          : el('p', { class: 'muted small', style: 'padding:8px 2px' }, 'Libre.')));
    }

    render(host,
      tituloVista('Próximos', `${enRango.length} tareas en ${dias} días`,
        el('span', { class: 'grow' }),
        ...[7, 14, 30].map((n) => el('button', {
          class: `chip ${dias === n ? 'activa' : ''}`.trim(),
          onClick: () => { dias = n; pintar(); },
        }, `${n} días`))),
      entradaRapida({}, pintar),
      ...grupos,
      sinFecha.length ? el('details', { style: 'margin-top:20px' },
        el('summary', { class: 'muted small' }, `Sin fecha (${sinFecha.length}) — decidir cuándo`),
        listaTareas(sinFecha, { alCambiar: pintar, hoy: hoyISO })) : null);
  };

  pintar();
  render(root, host);
}
