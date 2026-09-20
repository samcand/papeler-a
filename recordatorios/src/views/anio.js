/**
 * anio.js (vista) — El año en una página.
 *
 * Para revisar en enero con datos en vez de con memoria, y para enseñarlo si
 * apetece. Sale de lo que ya estaba guardado y no se maquilla: si el año fue
 * flojo, se nota, que para eso se mira.
 */

import { button, copyText, download, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import { aniosConDatos, resumenDelAnio, textoDelAnio } from '../anio.js';
import { nivel } from '../logros.js';
import { barra, dato, grafico, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaAnio(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let anio = Number(ctx.query?.anio) || Number(hoyISO.slice(0, 4));

  const pintar = () => {
    const r = resumenDelAnio(store.estado, anio, hoyISO);
    const anios = aniosConDatos(store.estado);
    const maxMes = Math.max(1, ...r.porMes.map((m) => m.total));

    render(host,
      tituloVista(`El año ${anio}`, r.enCurso ? 'todavía en curso' : 'cerrado'),

      el('div', { class: 'chip-list' },
        ...(anios.length ? anios : [anio]).map((a) => el('button', {
          class: `chip ${a === anio ? 'activa' : ''}`.trim(), type: 'button',
          onClick: () => { anio = a; pintar(); },
        }, String(a)))),

      el('p', { class: 'muted' }, r.frase),

      !r.cerradas ? vacio('De este año no hay nada apuntado todavía.', '📅') : el('div', {},
        el('div', { class: 'tarjetas' },
          dato(r.cerradas, 'cosas cerradas', { pie: `${r.mediaDiaria} al día` }),
          dato(r.horas, 'horas medidas'),
          dato(r.mejorRacha, 'mejor racha', { pie: 'días seguidos' }),
          dato(r.logrados.length, 'metas cumplidas', { clase: r.logrados.length ? 'positivo' : '' })),

        el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, 'Mes a mes'),
          grafico(r.porMes.map((m) => ({
            valor: m.total, etiqueta: `${m.nombre}: ${m.total}`,
            destacado: m.mes === r.mejorMes.mes,
          }))),
          el('p', { class: 'muted small' },
            `El mejor fue ${r.mejorMes.nombre}, con ${r.mejorMes.total}.`)),

        r.porModulo.length ? el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, 'En qué se fue el año'),
          ...r.porModulo.map((m) => el('div', { class: 'salud-fila' },
            el('span', { style: 'min-width:150px' }, `${m.icono} ${m.nombre}`),
            el('div', { class: 'grow' }, barra(Math.round((m.total / r.cerradas) * 100))),
            el('span', { class: 'muted small' }, String(m.total)))),
          r.porProyecto.length ? el('p', { class: 'muted small', style: 'margin-top:10px' },
            'Los proyectos del año: ' + r.porProyecto.map((p) => `${p.proyecto} (${p.total})`).join(' · ')) : null) : null,

        (r.logrados.length || r.abandonados.length) ? el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, 'Metas'),
          ...r.logrados.map((o) => el('div', { class: 'salud-fila' },
            el('span', { style: 'min-width:26px' }, '🏆'),
            el('span', { class: 'grow' }, o.que),
            el('span', { class: 'muted small', style: 'min-width:110px;text-align:right' }, o.logradoEn))),
          ...r.abandonados.map((o) => el('div', { class: 'salud-fila' },
            el('span', { style: 'min-width:26px' }, '🚪'),
            el('span', { class: 'grow muted' }, o.que, o.porque ? el('span', { class: 'small' }, ` — ${o.porque}`) : null),
            el('span', { class: 'muted small', style: 'min-width:110px;text-align:right' }, 'dejada'))),
          el('p', { class: 'muted small' }, 'Lo que dejaste también cuenta: decidir que algo no era para este año es una decisión.')) : null,

        r.puntualidad.total ? el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, 'Palabra cumplida'),
          barra(r.puntualidad.pct ?? 0, (r.puntualidad.pct ?? 0) >= 80 ? 'var(--ok, #35c48b)' : 'var(--danger)'),
          el('p', { class: 'small' }, r.puntualidad.frase)) : null,

        (r.viajes.length || r.lecturas || r.diario) ? el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, 'Lo demás'),
          el('div', { class: 'tarjetas' },
            r.viajes.length ? dato(r.viajes.length, 'viajes', { pie: `${r.diasDeViaje} días` }) : null,
            r.lecturas ? dato(r.lecturas, 'lecturas') : null,
            r.diario ? dato(r.diario, 'días de diario') : null,
            r.gastos.total ? dato(r.gastos.total.toLocaleString('es'), 'gastado') : null),
          r.viajes.length ? el('p', { class: 'muted small' },
            'Viajes: ' + r.viajes.map((v) => v.nombre).join(' · ')) : null) : null,

        r.medallas.length ? el('section', { class: 'card' },
          el('h2', { class: 'card-title' }, 'Medallas en pie'),
          el('div', { class: 'chip-list' },
            ...r.medallas.map((m) => el('span', { class: 'chip', title: m.frase },
              `${nivel(m.nivel).icono} ${m.medalla.icono} ${m.medalla.nombre}`))),
          el('p', { class: 'muted small' }, 'Las medallas son de ahora mismo, no del 31 de diciembre: se recalculan siempre.')) : null,

        el('section', { class: 'card' },
          el('div', { class: 'fila entre' },
            el('h2', { class: 'card-title', style: 'margin:0' }, 'Para copiar o guardar'),
            el('div', { class: 'fila' },
              button('Copiar', () => { copyText(textoDelAnio(r)); toast('Copiado'); }, { variant: 'ghost chico' }),
              button('Descargar .txt', () => download(`año-${anio}.txt`, textoDelAnio(r), 'text/plain'), { variant: 'ghost chico' }),
              button('🖨 Imprimir', () => window.print(), { variant: 'ghost chico' }))),
          el('pre', { class: 'small', style: 'white-space:pre-wrap' }, textoDelAnio(r)))));
  };

  pintar();
  render(root, host);
}
