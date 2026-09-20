/**
 * ui.js — Piezas sueltas para armar las pantallas sin framework.
 */

import { formatoCorto, formatoLargo, DIAS, MESES, hoy, inicioDeMes, finDeMes } from './fechas.js';

/** Hyperscript: h('div', { class:'x' }, 'hola') */
export function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [clave, valor] of Object.entries(props || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') el.className = valor;
    else if (clave === 'html') el.innerHTML = valor;
    else if (clave === 'dataset') Object.assign(el.dataset, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (clave === 'value') el.value = valor;
    else if (valor === true) el.setAttribute(clave, '');
    else el.setAttribute(clave, valor);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const hijo of hijos.flat(4)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
});

export function pesos(valor) {
  return formatoPesos.format(Math.round(Number(valor) || 0));
}

export function numero(valor, decimales = 2) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: decimales }).format(Number(valor) || 0);
}

export function porcentaje(valor, decimales = 2) {
  return `${numero((Number(valor) || 0) * 100, decimales)} %`;
}

export function tarjeta(titulo, ...contenido) {
  return h('section', { class: 'tarjeta' },
    titulo ? h('h2', {}, titulo) : null,
    ...contenido);
}

export function fila(...contenido) {
  return h('div', { class: 'fila' }, ...contenido);
}

export function campo(etiqueta, control, ayuda = '') {
  return h('label', { class: 'campo' },
    h('span', { class: 'campo-titulo' }, etiqueta),
    control,
    ayuda ? h('small', { class: 'ayuda' }, ayuda) : null);
}

export function entrada(props = {}) {
  return h('input', { type: 'text', ...props });
}

export function seleccion(opciones, valor, props = {}) {
  const sel = h('select', props);
  for (const o of opciones) {
    const op = h('option', { value: o.value ?? o.id ?? o }, o.label ?? o.nombre ?? o);
    if (String(op.value) === String(valor)) op.selected = true;
    sel.append(op);
  }
  return sel;
}

export function boton(texto, onClick, clase = '') {
  return h('button', { class: `boton ${clase}`.trim(), type: 'button', onClick }, texto);
}

export function tabla(columnas, filas, opciones = {}) {
  const thead = h('thead', {}, h('tr', {}, ...columnas.map((c) => h('th', { class: c.clase || '' }, c.titulo ?? c))));
  const tbody = h('tbody', {});
  for (const f of filas) {
    const tr = h('tr', { class: f.clase || '' });
    const celdas = f.celdas || f;
    for (const [i, celda] of celdas.entries()) {
      const col = columnas[i] || {};
      tr.append(h('td', { class: col.clase || '' }, celda));
    }
    if (f.onClick) tr.addEventListener('click', f.onClick);
    tbody.append(tr);
  }
  return h('table', { class: `tabla ${opciones.clase || ''}`.trim() }, thead, tbody,
    opciones.pie ? h('tfoot', {}, opciones.pie) : null);
}

export function aviso(texto, nivel = 'info') {
  return h('p', { class: `aviso aviso-${nivel}` }, texto);
}

export function vacio(texto, accion = null) {
  return h('div', { class: 'vacio' }, h('p', {}, texto), accion);
}

export function etiquetaNorma(norma) {
  return norma ? h('span', { class: 'norma' }, norma) : null;
}

export function chip(texto, clase = '') {
  return h('span', { class: `chip ${clase}`.trim() }, texto);
}

/** Diálogo modal sencillo. */
export function modal(titulo, contenido, acciones = []) {
  const fondo = h('div', { class: 'modal-fondo' });
  const caja = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
    h('header', {}, h('h3', {}, titulo), boton('✕', () => cerrar(), 'icono')),
    h('div', { class: 'modal-cuerpo' }, contenido),
    h('footer', {}, ...acciones));
  fondo.append(caja);
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
  });
  document.body.append(fondo);
  return { cerrar, caja };
}

let contenedorMensajes = null;
export function mensaje(texto, tipo = 'ok') {
  if (!contenedorMensajes) {
    contenedorMensajes = h('div', { class: 'mensajes' });
    document.body.append(contenedorMensajes);
  }
  const el = h('div', { class: `mensaje mensaje-${tipo}` }, texto);
  contenedorMensajes.append(el);
  setTimeout(() => el.remove(), 4200);
}

export function confirmar(texto) {
  return window.confirm(texto);
}

/** Imprime un bloque (comprobante o liquidación) en una ventana aparte. */
export function imprimir(titulo, nodo) {
  const ventana = window.open('', '_blank', 'width=900,height=700');
  if (!ventana) {
    mensaje('El navegador bloqueó la ventana de impresión.', 'error');
    return;
  }
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color:#111; margin:32px; }
      h1,h2,h3 { margin:0 0 8px; }
      table { border-collapse: collapse; width:100%; margin:12px 0 20px; font-size:13px; }
      th,td { border-bottom:1px solid #ddd; padding:6px 8px; text-align:left; }
      th { background:#f3f4f6; }
      td.num, th.num { text-align:right; font-variant-numeric: tabular-nums; }
      .norma { color:#666; font-size:11px; }
      .aviso { background:#fff8e1; border-left:3px solid #f0b429; padding:8px 10px; font-size:12px; }
      .total { font-weight:700; }
      footer { margin-top:24px; font-size:11px; color:#666; }
    </style></head><body>${nodo.outerHTML}
    <footer>Generado con la plataforma de nómina · ${formatoLargo(hoy())}</footer>
    </body></html>`);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 300);
}

export function descargar(nombre, contenido, tipo = 'application/json') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csv(filas) {
  return filas.map((f) => f.map((c) => {
    const t = String(c ?? '');
    return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  }).join(';')).join('\n');
}

export { formatoCorto, formatoLargo, DIAS, MESES, hoy, inicioDeMes, finDeMes };
