/**
 * gastos.js (vista) — Lo que sale, con presupuesto por categoría.
 *
 * Se escribe a mano, igual que los precios de la cartera: no hay conexión con
 * el banco y por eso esto funciona sin internet y no le cuenta a nadie en qué
 * gastas. El aviso que sirve no es el total, es el ritmo: cuánto del mes ha
 * pasado frente a cuánto del dinero se ha ido.
 */

import { button, download, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoRelativo } from '../fechas.js';
import {
  CATEGORIAS_GASTO, gastoNuevo, iconoCategoria, nombreCategoria, porMes,
  presupuestoDelMes, rangoDelMes, repetirFijos, resumenGastos,
} from '../gastos.js';
import { barra, dato, grafico, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaGastos(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let mes = ctx.query?.mes || hoyISO.slice(0, 7);
  let nuevo = gastoNuevo({ fecha: hoyISO });

  const gastos = () => store.estado.gastos || [];

  const pintar = () => {
    const { desde, hasta } = rangoDelMes(mes);
    const r = resumenGastos(gastos(), desde, hasta);
    const pres = presupuestoDelMes(gastos(), store.estado.presupuestos || {}, mes, hoyISO);
    const deViajes = r.total - pres.total;
    const meses = porMes(gastos(), 6, hoyISO);

    render(host,
      tituloVista('Gastos', 'Escritos a mano, como los precios: nada sale del dispositivo'),

      el('div', { class: 'cal-cabecera' },
        button('‹', () => { mes = mesRelativo(mes, -1); pintar(); }, { title: 'Mes anterior' }),
        el('span', { class: 'grow' }, pres.nombre),
        button('›', () => { mes = mesRelativo(mes, 1); pintar(); }, { title: 'Mes siguiente' })),

      el('div', { class: 'tarjetas' },
        dato(r.total.toLocaleString('es'), 'gastado este mes',
          {
            clase: pres.pasadas.length ? 'negativo' : '',
            // Ojo: el presupuesto se compara sin los viajes, que van a su propia cuenta.
            pie: deViajes ? `${deViajes.toLocaleString('es')} de viajes, aparte del presupuesto` : (pres.totalLimite ? `presupuesto de ${pres.totalLimite.toLocaleString('es')}` : 'sin presupuesto'),
          }),
        dato(r.media.toLocaleString('es'), 'al día'),
        dato(r.fijos.toLocaleString('es'), 'en recibos fijos'),
        dato(pres.porDiaRestante != null ? pres.porDiaRestante.toLocaleString('es') : '—', 'por día que queda',
          { pie: `${pres.diasRestantes} días` })),

      el('p', { class: pres.pctDinero > pres.pctTiempo + 10 ? 'negativo' : 'muted small' }, pres.frase),

      formulario(),
      panelPresupuesto(pres),
      panelReparto(r),
      panelLista(r),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Los últimos seis meses'),
        grafico(meses.map((m) => ({ valor: m.total, etiqueta: `${m.nombre}: ${m.total.toLocaleString('es')}`, destacado: m.mes === mes }))),
        el('div', { class: 'chip-list', style: 'margin-top:10px' },
          ...meses.map((m) => el('button', {
            class: `chip ${m.mes === mes ? 'activa' : ''}`.trim(), type: 'button',
            onClick: () => { mes = m.mes; pintar(); },
          }, `${m.nombre.split(' ')[0]} ${m.total.toLocaleString('es')}`)))));
  };

  function mesRelativo(m, paso) {
    const [a, mm] = m.split('-').map(Number);
    const d = new Date(a, mm - 1 + paso, 1, 12);
    return aISO(d).slice(0, 7);
  }

  function formulario() {
    return el('section', { class: 'card' },
      el('div', { class: 'fila' },
        el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'En qué'),
          input(nuevo.que, (v) => { nuevo.que = v; })),
        el('label', { class: 'field', style: 'width:130px' }, el('span', { class: 'field-label' }, 'Cuánto'),
          el('input', {
            class: 'input', type: 'number', step: '0.01', value: nuevo.importe || '',
            onInput: (e) => { nuevo.importe = Number(e.target.value) || 0; },
          })),
        el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Categoría'),
          el('select', { class: 'input', onChange: (e) => { nuevo.categoria = e.target.value; } },
            ...CATEGORIAS_GASTO.map((c) => el('option', { value: c.id, selected: c.id === nuevo.categoria }, `${c.icono} ${c.nombre}`)))),
        el('label', { class: 'field', style: 'width:160px' }, el('span', { class: 'field-label' }, 'Cuándo'),
          el('input', {
            class: 'input', type: 'date', value: nuevo.fecha,
            onChange: (e) => { nuevo.fecha = e.target.value; },
          })),
        el('label', { class: 'field', style: 'width:150px' }, el('span', { class: 'field-label' }, 'Viaje'),
          el('select', { class: 'input', onChange: (e) => { nuevo.viaje = e.target.value || null; } },
            el('option', { value: '' }, '— ninguno —'),
            ...(store.estado.viajes || []).map((v) => el('option', { value: v.id, selected: v.id === nuevo.viaje }, v.nombre))))),
      el('div', { class: 'fila' },
        el('label', { class: 'chip', style: 'cursor:pointer' },
          el('input', { type: 'checkbox', checked: nuevo.fijo, onChange: (e) => { nuevo.fijo = e.target.checked; } }),
          'se repite todos los meses'),
        button('Apuntar', () => {
          if (!nuevo.que.trim() || !nuevo.importe) { toast('Falta en qué y cuánto'); return; }
          store.agregarEn('gastos', gastoNuevo(nuevo));
          nuevo = gastoNuevo({ fecha: nuevo.fecha, categoria: nuevo.categoria });
          pintar();
        }, { variant: 'primary' }),
        button('Traer los fijos del mes pasado', () => {
          const copias = repetirFijos(gastos(), mes, hoyISO);
          for (const g of copias) store.agregarEn('gastos', g);
          toast(copias.length ? `${copias.length} recibos copiados` : 'No hay fijos que copiar');
          pintar();
        }, { variant: 'ghost chico' })));
  }

  function panelPresupuesto(pres) {
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Presupuesto del mes'),
      el('p', { class: 'muted small' },
        'Pon un tope por categoría; déjalo en blanco para no ponerlo. Lo marcado como de un viaje no cuenta aquí: tiene su propio presupuesto.'),
      ...CATEGORIAS_GASTO.map((c) => {
        const fila = pres.filas.find((f) => f.categoria === c.id);
        const gastado = fila?.gastado || 0;
        return el('div', { class: 'salud-fila' },
          el('span', { style: 'min-width:150px' }, `${c.icono} ${c.nombre}`),
          el('div', { class: 'grow' }, barra(fila?.pct ?? 0, fila?.pasado ? 'var(--danger)' : 'var(--accent-2)')),
          el('span', { class: `muted small ${fila?.pasado ? 'negativo' : ''}`.trim(), style: 'min-width:120px;text-align:right' },
            `${gastado.toLocaleString('es')}${fila?.limite ? ` / ${fila.limite.toLocaleString('es')}` : ''}`),
          el('input', {
            class: 'input', type: 'number', style: 'width:110px', placeholder: 'tope',
            value: store.estado.presupuestos?.[c.id] ?? '',
            onChange: (e) => { store.ponerPresupuesto(c.id, Number(e.target.value) || 0); pintar(); },
          }));
      }));
  }

  function panelReparto(r) {
    if (!r.porCategoria.length) return null;
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'A dónde se fue'),
      ...r.porCategoria.map((c) => el('div', { class: 'salud-fila' },
        el('span', { style: 'min-width:150px' }, `${c.icono} ${c.nombre}`),
        el('div', { class: 'grow' }, barra(c.pct)),
        el('span', { class: 'muted small', style: 'min-width:110px;text-align:right' },
          `${c.importe.toLocaleString('es')} · ${c.pct} %`))));
  }

  function panelLista(r) {
    return el('section', { class: 'card' },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' }, `Apuntes (${r.gastos.length})`),
        button('Descargar CSV', () => {
          const filas = [['Fecha', 'Qué', 'Categoría', 'Importe', 'Viaje']];
          for (const g of r.gastos) filas.push([g.fecha, g.que, nombreCategoria(g.categoria), g.importe, g.viaje || '']);
          download(`gastos-${r.desde.slice(0, 7)}.csv`,
            filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
        }, { variant: 'ghost chico' })),
      !r.gastos.length ? vacio('Ningún gasto este mes.', '🧾')
        : el('div', {}, ...[...r.gastos].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((g) => el('div', { class: 'salud-fila' },
          el('span', { style: 'min-width:30px' }, iconoCategoria(g.categoria)),
          el('span', { class: 'grow' }, g.que,
            g.fijo ? el('span', { class: 'muted small' }, ' · fijo') : null,
            g.viaje ? el('span', { class: 'muted small' }, ` · ${(store.estado.viajes || []).find((v) => v.id === g.viaje)?.nombre || 'viaje'}`) : null),
          el('span', { class: 'muted small', style: 'min-width:110px;text-align:right' }, textoRelativo(g.fecha)),
          el('span', { style: 'min-width:90px;text-align:right' }, g.importe.toLocaleString('es')),
          button('✕', () => { store.borrarEn('gastos', g.id); pintar(); },
            { variant: 'ghost chico danger', title: 'Borrar el apunte' })))));
  }

  pintar();
  render(root, host);
}
