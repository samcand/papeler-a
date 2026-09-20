/**
 * panel.js (vista) — El panel de vida: el día, el dinero, los objetivos, las
 * fechas, lo que vence y el viaje que viene, en una pantalla.
 *
 * No inventa datos: si una parte está vacía lo dice y ofrece empezarla, que es
 * más honesto que enseñar un cero con pinta de dato.
 */

import { el, render } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoLargo } from '../fechas.js';
import { panelDeVida } from '../panel.js';
import { tituloVista } from '../componentes.js';
import { store } from '../store.js';

const NIVELES = { mal: 'negativo', ojo: '', bien: 'positivo', vacio: 'muted' };

export function vistaPanel(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());

  const pintar = () => {
    const p = panelDeVida(store.estado, hoyISO);

    render(host,
      tituloVista('Panel de vida', textoLargo(hoyISO)),

      p.avisos.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `Pide atención (${p.avisos.length})`),
        ...p.avisos.slice(0, 8).map((a) => el('div', { class: `alerta ${a.nivel}` },
          el('div', {},
            el('div', {}, a.texto),
            el('div', { class: 'accion' },
              el('a', { href: '#' + a.ruta }, 'ir a verlo'))))),
        p.avisos.length > 8 ? el('p', { class: 'muted small' }, `Y ${p.avisos.length - 8} más.`) : null)
        : el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, 'Nada pide atención'),
          el('p', { class: 'muted' }, 'Ni fechas vencidas, ni presupuesto pasado, ni mantenimientos por hacer.')),

      el('div', { class: 'tarjetas panel-vida' },
        ...p.tarjetas.map((t) => el('a', { class: `dato tarjeta-panel ${t.nivel}`, href: '#' + t.ruta },
          el('div', { class: 'etiqueta' }, `${t.icono} ${t.titulo}`),
          el('div', { class: `valor ${NIVELES[t.nivel] || ''}`.trim() }, String(t.valor)),
          el('div', { class: 'etiqueta' }, t.pie),
          el('div', { class: 'muted small', style: 'margin-top:6px' }, t.frase)))),

      p.vacias.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Todavía sin datos'),
        el('p', { class: 'muted small' },
          `${p.vacias.join(', ')}. Un panel se llena usándolo; no hay nada que rellenar de golpe.`)) : null);
  };

  pintar();
  const soltar = store.suscribir(pintar);
  render(root, host);
  return soltar;
}
