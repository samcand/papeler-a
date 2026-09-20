/**
 * logros.js (vista) — Medallas y estrellas.
 *
 * Dos cosas se dicen aquí en voz alta, porque son las que hacen que esto no sea
 * un juego tonto: las medallas **salen de lo que ya está medido** (no hay nada
 * que marcar a mano) y **nada castiga** — perder una racha no quita nada y
 * mañana las estrellas vuelven a cero sin deber nada.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoLargo } from '../fechas.js';
import {
  NIVELES, cantidad, estrellasDelDia, marcarVistas, nivel, nuevasDesde,
  resumenLogros, textoFalta, tiraDeEstrellas,
} from '../logros.js';
import { barra, dato, tituloVista } from '../componentes.js';
import { store } from '../store.js';

export function vistaLogros(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());

  const pintar = () => {
    const r = resumenLogros(store.estado, hoyISO);
    const tira = tiraDeEstrellas(store.estado, hoyISO, 14);
    const nuevas = nuevasDesde(store.estado, store.estado.ajustes.medallasVistas || {}, hoyISO);

    render(host,
      tituloVista('Logros', textoLargo(hoyISO)),

      nuevas.length ? el('section', { class: 'card nuevo-logro' },
        el('h2', { class: 'card-title' }, nuevas.length === 1 ? 'Medalla nueva' : `${nuevas.length} medallas nuevas`),
        ...nuevas.map((n) => el('p', {},
          `${nivel(n.nivel).icono} ${n.medalla.icono} ${n.medalla.nombre} — ${nivel(n.nivel).nombre.toLowerCase()}`,
          el('span', { class: 'muted small' }, ` · ${cantidad(n.valor, n.medalla)}`))),
        button('Visto', () => {
          store.ajustar({ medallasVistas: marcarVistas(store.estado, hoyISO) });
          pintar();
        }, { variant: 'primary chico' })) : null,

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Las estrellas de hoy'),
        panelEstrellas(r.estrellasHoy),
        el('div', { class: 'tira-estrellas' },
          ...tira.map((d) => el('div', {
            class: `dia-estrellas ${d.fecha === hoyISO ? 'hoy' : ''}`.trim(),
            title: `${d.fecha}: ${d.estrellas} de ${d.de}`,
          }, el('span', {}, '★'.repeat(d.estrellas) || '·')))),
        el('p', { class: 'muted small' },
          'Como mucho tres al día, y solo por cosas que pasaron de verdad. Mañana vuelven a cero sin deber nada.')),

      el('div', { class: 'tarjetas' },
        dato(r.oro, 'de oro', { clase: r.oro ? 'positivo' : '' }),
        dato(r.plata, 'de plata'),
        dato(r.bronce, 'de bronce'),
        dato(`${r.conseguidas}/${r.total}`, 'medallas con algún metal')),

      r.cerca.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Lo que tienes más cerca'),
        ...r.cerca.map((x) => el('div', { class: 'salud-fila' },
          el('span', { style: 'min-width:180px' }, `${x.medalla.icono} ${x.medalla.nombre}`),
          el('div', { class: 'grow' }, barra(x.pct, 'var(--accent-2)')),
          el('span', { class: 'muted small', style: 'min-width:190px;text-align:right' },
            `${textoFalta(x)} para ${nivel(x.siguiente).icono}`)))) : null,

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Todas las medallas'),
        el('p', { class: 'muted small' },
          'Salen de lo que ya está medido: no hay ninguna que se consiga marcando una casilla. '
          + 'Bronce es haberlo empezado de verdad, plata es que ya es un hábito y oro es que te define.'),
        el('div', { class: 'rejilla-medallas' }, ...r.medallas.map(tarjetaMedalla))));
  };

  function panelEstrellas(e) {
    return el('div', {},
      el('div', { class: 'estrellas-hoy' },
        ...Array.from({ length: e.de }, (_, i) => el('span', {
          class: `estrella ${i < e.estrellas ? 'ganada' : ''}`.trim(),
        }, i < e.estrellas ? '★' : '☆')),
        el('span', { class: 'muted', style: 'margin-left:10px' }, e.frase)),
      el('div', { class: 'lista-chequeo', style: 'margin-top:8px' },
        ...e.criterios.map((c) => el('label', {},
          el('input', { type: 'checkbox', checked: c.cumplido, disabled: true }),
          el('span', { class: c.cumplido ? '' : 'muted' }, c.texto),
          el('span', { class: 'muted small' }, ` · ${c.detalle}`)))));
  }

  function tarjetaMedalla(x) {
    const conseguida = !!x.nivel;
    return el('div', { class: `medalla ${conseguida ? x.nivel : 'sin'}`.trim() },
      el('div', { class: 'medalla-cara' },
        el('span', { class: 'icono' }, x.medalla.icono),
        conseguida ? el('span', { class: 'metal' }, nivel(x.nivel).icono) : null),
      el('div', { class: 'grow' },
        el('div', { class: 'fila entre' },
          el('b', {}, x.medalla.nombre),
          el('span', { class: 'muted small' }, conseguida ? nivel(x.nivel).nombre : 'sin conseguir')),
        el('p', { class: 'muted small' }, x.medalla.descripcion),
        barra(x.pct, conseguida ? 'var(--ok, #35c48b)' : 'var(--accent-2)'),
        el('p', { class: 'small' }, x.frase),
        x.nota ? el('p', { class: 'muted small' }, x.nota) : null,
        el('div', { class: 'chip-list' },
          ...NIVELES.map((n) => el('span', {
            class: `chip ${x.valor >= x.medalla.umbrales[n.id] ? 'activa' : ''}`.trim(),
            title: `${n.nombre}: ${x.medalla.umbrales[n.id]} ${x.medalla.unidad}`,
          }, `${n.icono} ${x.medalla.umbrales[n.id]}`)))));
  }

  pintar();
  render(root, host);
}
