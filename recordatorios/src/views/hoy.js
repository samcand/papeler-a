/** hoy.js (vista) — Lo de hoy, lo que se quedó atrás y cómo va el día. */

import { button, el, render } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, sumarDias, textoLargo } from '../fechas.js';
import { cargaDelDia, estadisticas, paraHoy } from '../modelo.js';
import { copyText } from '../../../src/ui.js';
import { rachaHabito } from '../plantillas.js';
import { barra, dato, entradaRapida, listaTareas, tituloVista, vacio } from '../componentes.js';
import { resumenDelDia, textoResumen, tocaResumen } from '../resumen.js';
import { estadoBandeja } from '../modelo.js';
import { formatoMinutos, resumenTiempo } from '../tiempo.js';
import { store } from '../store.js';

export function vistaHoy(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());

  let mostrarResumen = tocaResumen(store.estado.ajustes, hoyISO);

  /**
   * Tarjeta de "buenos días": el resumen que la notificación no siempre puede
   * dar. Se enseña una vez al día y se cierra al empezar.
   */
  function tarjetaResumen() {
    const r = resumenDelDia(store.estado, hoyISO);
    return el('section', { class: 'card resumen-dia' },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' }, r.titulo),
        el('div', { class: 'fila' },
          button('Copiar', () => copyText(textoResumen(r)), { variant: 'ghost chico' }),
          button('Empezar', () => {
            store.ajustar({ resumenVistoEn: hoyISO });
            mostrarResumen = false;
            pintar();
          }, { variant: 'primary chico' }))),

      el('p', { class: 'small' },
        r.vencidas ? el('b', { class: 'negativo' }, `${r.vencidas} de días anteriores · `) : null,
        `${r.hoy} para hoy`,
        r.carga.minutos ? ` · ${formatoMinutos(r.carga.minutos)} comprometidos` : '',
        r.primera ? ` · lo primero con hora: ${r.primera.hora} ${r.primera.titulo}` : ''),

      r.foco.length ? el('div', {},
        el('p', { class: 'field-label' }, 'Si solo salen tres cosas, que sean estas'),
        el('ol', { class: 'foco' }, ...r.foco.map((t) => el('li', {},
          t.hora ? el('b', {}, `${t.hora} `) : null, t.titulo,
          t.proyecto ? el('span', { class: 'muted small' }, ` · ${t.proyecto}`) : null)))) : null,

      r.avisos.length ? el('div', {},
        el('p', { class: 'field-label' }, 'Ojo con'),
        el('ul', { class: 'small muted' }, ...r.avisos.map((a) => el('li', {}, a)))) : null,

      el('p', { class: 'field-hint' },
        `Ayer: ${r.completadasAyer} completadas y ${formatoMinutos(r.enfoqueAyer)} de enfoque.`,
        r.racha ? ` Racha de ${r.racha} días.` : '',
        r.mañana ? ` Mañana hay ${r.mañana} tareas.` : ''));
  }

  const pintar = () => {
    const todas = store.tareas.filter((t) => !t.padre);
    const pendientes = todas.filter((t) => !t.completada);
    const vencidas = pendientes.filter((t) => t.fecha && t.fecha < hoyISO);
    const deHoy = pendientes.filter((t) => t.fecha === hoyISO);
    const hechasHoy = store.tareas.filter((t) => t.completada && String(t.completadaEn || '').slice(0, 10) === hoyISO);
    const carga = cargaDelDia(paraHoy(todas, hoyISO), minutosJornada());
    const est = estadisticas(store.estado.historial, hoyISO, store.estado.ajustes.metaDiaria);
    const tiempo = resumenTiempo(store.estado.tiempo, hoyISO);

    render(host,
      tituloVista('Hoy', textoLargo(hoyISO),
        el('span', { class: 'grow' }),
        !mostrarResumen ? el('button', { class: 'chip', onClick: () => { mostrarResumen = true; pintar(); } }, '☀️ resumen del día') : null),
      mostrarResumen ? tarjetaResumen() : null,
      entradaRapida({ fecha: hoyISO }, pintar),

      el('div', { class: 'tarjetas' },
        dato(deHoy.length + vencidas.length, 'por hacer', { pie: vencidas.length ? `${vencidas.length} atrasadas` : 'al día' }),
        dato(est.hoy, 'completadas hoy', { pie: `meta: ${est.meta}` }),
        dato(formatoMinutos(tiempo.hoy), 'enfoque hoy', { pie: `${tiempo.pomodorosHoy} pomodoros` }),
        dato(carga.excedido ? `${carga.horas} h` : `${carga.horas} h`, 'comprometidas',
          { clase: carga.excedido ? 'negativo' : '', pie: carga.excedido ? 'el día no da para tanto' : `de ${Math.round(carga.disponibles / 60)} h` })),

      carga.minutos ? el('div', { style: 'margin:12px 0 18px' },
        barra(carga.pct, carga.excedido ? 'var(--danger)' : 'var(--accent-2)'),
        el('p', { class: 'small muted', style: 'margin-top:6px' },
          `${formatoMinutos(carga.minutos)} planificados${carga.sinEstimar ? ` · ${carga.sinEstimar} tarea${carga.sinEstimar === 1 ? '' : 's'} sin estimar` : ''}`,
          ' · ', el('a', { href: '#/planificar' }, 'planificar el día'))) : null,

      vencidas.length ? el('section', { class: 'grupo-dia' },
        el('h3', {},
          el('span', { style: 'color:var(--p1)' }, `Atrasadas (${vencidas.length})`),
          el('span', { class: 'grow' }),
          button('Mover todas a hoy', () => {
            vencidas.forEach((t) => store.aplazar(t.id, hoyISO));
            pintar();
          }, { variant: 'ghost chico' })),
        listaTareas(vencidas, { alCambiar: pintar, hoy: hoyISO, conSubtareas: true })) : null,

      el('section', { class: 'grupo-dia' },
        el('h3', {}, `Hoy (${deHoy.length})`),
        deHoy.length
          ? listaTareas(deHoy, { alCambiar: pintar, hoy: hoyISO, conSubtareas: true })
          : vacio(vencidas.length ? 'Nada más para hoy: primero lo atrasado.' : 'Día limpio. Disfrútalo o adelanta lo de mañana.', '✅')),

      avisoBandeja(hoyISO),

      habitosDelDia(hoyISO, pintar),

      hechasHoy.length ? el('details', { style: 'margin-top:18px' },
        el('summary', { class: 'muted small' }, `Completadas hoy (${hechasHoy.length})`),
        listaTareas(hechasHoy, { alCambiar: pintar, hoy: hoyISO })) : null);
  };

  function minutosJornada() {
    const { inicio, fin } = store.estado.ajustes.jornada;
    const [hi, mi] = inicio.split(':').map(Number);
    const [hf, mf] = fin.split(':').map(Number);
    return Math.max(60, (hf * 60 + mf) - (hi * 60 + mi));
  }

  pintar();
  render(root, host);
}

/** Recordar la bandeja solo cuando de verdad pide atención. */
function avisoBandeja(hoyISO) {
  const b = estadoBandeja(store.tareas, hoyISO);
  if (!b.conviéneVaciar) return null;
  return el('p', { class: 'small muted', style: 'margin-top:14px' },
    `📥 La bandeja tiene ${b.total} cosas sin clasificar`,
    b.masViejo >= 3 ? ` (la más antigua, de hace ${b.masViejo} días)` : '',
    '. ', el('a', { href: '#/bandeja' }, 'Vaciarla'), '.');
}

/** Los hábitos se marcan aquí mismo: un toque, sin abrir nada. */
function habitosDelDia(hoyISO, alCambiar) {
  const habitos = store.estado.habitos;
  if (!habitos.length) return null;
  return el('section', { class: 'card', style: 'margin-top:18px' },
    el('h2', { class: 'card-title' }, 'Hábitos'),
    el('div', { class: 'chip-list' },
      ...habitos.map((h) => {
        const hecho = h.dias.includes(hoyISO);
        const { racha } = rachaHabito(h.dias, hoyISO);
        return el('button', {
          class: `chip ${hecho ? 'activa' : ''}`.trim(),
          onClick: () => { store.marcarHabito(h.id, hoyISO); alCambiar(); },
          title: racha ? `Racha: ${racha} días` : 'Sin racha todavía',
        }, `${h.icono} ${h.nombre}${racha ? ` · ${racha}` : ''}`);
      })));
}
