/**
 * objetivos.js (vista) — Metas con número, con fecha y con revisión.
 *
 * Lo que se enseña grande no es el porcentaje: es si vas al ritmo. Llevar el
 * 40 % en marzo de un objetivo de todo el año suena bien y va tarde.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import {
  AMBITOS, TIPOS_OBJETIVO, aRevisar, objetivoNuevo, progreso, resumenObjetivos, tareaDeObjetivo,
} from '../objetivos.js';
import { barra, dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaObjetivos(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let verCerrados = false;

  const datos = () => ({ tareas: store.tareas, historial: store.estado.historial });

  const pintar = () => {
    const objetivos = store.estado.objetivos || [];
    const r = resumenObjetivos(objetivos, datos(), hoyISO);
    const tocan = new Set(aRevisar(objetivos, hoyISO).map((o) => o.id));
    const cerrados = objetivos.filter((o) => o.logradoEn || o.abandonadoEn);

    render(host,
      tituloVista('Objetivos', 'Metas, aprendizaje y lo que quieres hacer alguna vez'),

      el('div', { class: 'tarjetas' },
        dato(r.enCurso, 'en curso'),
        dato(r.atrasados, 'van tarde', { clase: r.atrasados ? 'negativo' : 'positivo' }),
        dato(r.logrados, 'logrados', { clase: 'positivo' }),
        dato(r.aRevisar, 'esperan revisión')),

      el('p', { class: 'muted small' }, r.frase),

      el('div', { class: 'fila' },
        button('+ Objetivo', () => {
          store.agregarEn('objetivos', objetivoNuevo({ que: 'Lo que quiero conseguir' }));
          pintar();
        }, { variant: 'primary' }),
        cerrados.length ? el('button', {
          class: `chip ${verCerrados ? 'activa' : ''}`.trim(),
          onClick: () => { verCerrados = !verCerrados; pintar(); },
        }, `ver cerrados (${cerrados.length})`) : null),

      !r.lista.length ? vacio('Ningún objetivo escrito. Lo que no se escribe se queda en intención.', '🎯') : null,

      ...r.lista.map(({ objetivo, progreso: p }) => tarjeta(objetivo, p, tocan.has(objetivo.id))),

      verCerrados ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Cerrados'),
        ...cerrados.map((o) => el('div', { class: 'salud-fila' },
          el('span', { class: 'grow' }, o.que),
          el('span', { class: o.logradoEn ? 'positivo' : 'muted' },
            o.logradoEn ? `logrado el ${o.logradoEn}` : `abandonado el ${o.abandonadoEn}${o.porque ? `: ${o.porque}` : ''}`),
          button('Reabrir', () => {
            store.actualizarEn('objetivos', o.id, { logradoEn: null, abandonadoEn: null });
            pintar();
          }, { variant: 'ghost chico' })))) : null);
  };

  function tarjeta(o, p, tocaRevisar) {
    const ambito = AMBITOS.find((a) => a.id === o.ambito);
    return el('section', { class: `card objetivo ${p.alDia === false ? 'atrasado' : ''}`.trim() },
      el('div', { class: 'fila' },
        el('span', {}, ambito?.icono || '🎯'),
        input(o.que, (v) => store.actualizarEn('objetivos', o.id, { que: v })),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { store.actualizarEn('objetivos', o.id, { ambito: e.target.value }); pintar(); },
        }, ...AMBITOS.map((a) => el('option', { value: a.id, selected: a.id === o.ambito }, a.nombre))),
        button('✕', () => {
          if (!window.confirm('¿Borrar el objetivo?')) return;
          store.borrarEn('objetivos', o.id);
          pintar();
        }, { variant: 'ghost chico danger', title: 'Borrar' })),

      el('div', { class: 'fila' },
        el('label', { class: 'field', style: 'width:200px' }, el('span', { class: 'field-label' }, 'Cómo se mide'),
          el('select', {
            class: 'input',
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { tipo: e.target.value }); pintar(); },
          }, ...TIPOS_OBJETIVO.map((t) => el('option', { value: t.id, selected: t.id === o.tipo, title: t.ayuda }, t.nombre)))),
        o.tipo === 'siNo' ? el('label', { class: 'chip', style: 'cursor:pointer' },
          el('input', {
            type: 'checkbox', checked: !!o.hecho,
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { hecho: e.target.checked }); pintar(); },
          }), 'hecho') : null,
        o.tipo === 'numero' ? el('label', { class: 'field', style: 'width:110px' }, el('span', { class: 'field-label' }, 'Llevo'),
          el('input', {
            class: 'input', type: 'number', value: o.actual,
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { actual: Number(e.target.value) || 0 }); pintar(); },
          })) : null,
        o.tipo !== 'siNo' ? el('label', { class: 'field', style: 'width:110px' }, el('span', { class: 'field-label' }, 'Meta'),
          el('input', {
            class: 'input', type: 'number', value: o.meta,
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { meta: Number(e.target.value) || 1 }); pintar(); },
          })) : null,
        o.tipo === 'numero' ? el('label', { class: 'field', style: 'width:120px' }, el('span', { class: 'field-label' }, 'Unidad'),
          input(o.unidad || '', (v) => store.actualizarEn('objetivos', o.id, { unidad: v }), { placeholder: 'libros, km…' })) : null,
        o.tipo === 'tareas' ? el('label', { class: 'field grow' }, el('span', { class: 'field-label' }, 'Proyecto'),
          el('select', {
            class: 'input',
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { proyecto: e.target.value || null }); pintar(); },
          }, el('option', { value: '' }, '— elige —'),
          ...store.estado.proyectos.map((pr) => el('option', { value: pr.nombre, selected: pr.nombre === o.proyecto }, pr.nombre)))) : null),

      el('div', { class: 'fila' },
        el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Desde'),
          el('input', {
            class: 'input', type: 'date', value: o.desde || '',
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { desde: e.target.value }); pintar(); },
          })),
        el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Hasta'),
          el('input', {
            class: 'input', type: 'date', value: o.hasta || '',
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { hasta: e.target.value || null }); pintar(); },
          })),
        el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Revisar el'),
          el('input', {
            class: 'input', type: 'date', value: o.revisarEn || '',
            onChange: (e) => { store.actualizarEn('objetivos', o.id, { revisarEn: e.target.value || null }); pintar(); },
          }))),

      el('div', { style: 'margin:10px 0' },
        barra(p.pct, p.alDia === false ? 'var(--danger)' : 'var(--accent-2)'),
        p.conFecha ? el('div', { style: 'margin-top:4px' }, barra(p.pctTiempo, 'var(--muted)')) : null,
        el('p', { class: `small ${p.alDia === false ? 'negativo' : 'muted'}`.trim(), style: 'margin-top:6px' },
          `${p.actual} de ${p.meta}${o.unidad ? ` ${o.unidad}` : ''} · ${p.frase}`),
        el('p', { class: 'muted small' }, `La barra de abajo es el tiempo gastado. Progreso sacado de: ${p.fuente}.`)),

      tocaRevisar ? el('p', { class: 'negativo small' }, `Tocaba revisarlo el ${o.revisarEn}: ¿sigue teniendo sentido?`) : null,

      el('div', { class: 'fila' },
        button('Logrado', () => { store.actualizarEn('objetivos', o.id, { logradoEn: hoyISO }); toast('¡Hecho!'); pintar(); }, { variant: 'ok chico' }),
        button('Abandonar', () => {
          const porque = window.prompt('¿Por qué lo dejas? (se queda escrito, que es lo útil)') || '';
          store.actualizarEn('objetivos', o.id, { abandonadoEn: hoyISO, porque });
          pintar();
        }, { variant: 'ghost chico' }),
        button('Tarea del siguiente paso', () => {
          store.agregar(tareaDeObjetivo(o, hoyISO));
          toast('Tarea creada');
        }, { variant: 'ghost chico' })));
  }

  pintar();
  render(root, host);
}
