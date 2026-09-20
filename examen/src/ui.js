/** ui.js — Utilidades mínimas de DOM. Sin framework: cero build, cero dependencias. */

export function el(tag, props = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') nodo.className = v;
    else if (k === 'html') nodo.innerHTML = v;
    else if (k === 'dataset') Object.assign(nodo.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') nodo.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') nodo.value = v;
    else nodo.setAttribute(k, v === true ? '' : String(v));
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

/** Reemplaza el contenido de un nodo descartando null/false (que si no salen como texto). */
export function pintar(nodo, ...hijos) {
  nodo.replaceChildren(...hijos.flat(Infinity).filter((h) => h != null && h !== false));
  return nodo;
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function tarjeta(titulo, ...contenido) {
  return el('section', { class: 'tarjeta' }, titulo && el('h2', {}, titulo), ...contenido);
}

export function campo(etiqueta, control, ayuda) {
  return el('label', { class: 'campo' }, el('span', {}, etiqueta), control,
    ayuda && el('span', { class: 'pequeno suave' }, ayuda));
}

export function barra(porcentaje, clase = '') {
  const p = Math.max(0, Math.min(100, Math.round(porcentaje || 0)));
  return el('div', { class: 'barra ' + clase, role: 'img', 'aria-label': p + '%' }, el('i', { style: `width:${p}%` }));
}

export function dato(valor, etiqueta) {
  return el('div', { class: 'dato' }, el('b', {}, valor), el('span', {}, etiqueta));
}

export function aviso(mensaje, tipo = 'info') {
  let host = $('#avisos');
  if (!host) { host = el('div', { id: 'avisos' }); document.body.append(host); }
  const nodo = el('div', { class: `aviso ${tipo}` }, mensaje);
  host.append(nodo);
  setTimeout(() => { nodo.classList.add('fuera'); setTimeout(() => nodo.remove(), 320); }, 2600);
}

/** 754000 -> "12:34". Para relojes y tiempos por pregunta. */
export function reloj(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dd = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dd(m)}:${dd(s)}` : `${m}:${dd(s)}`;
}

export function fecha(ts) {
  return new Date(ts).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Descarga un texto como archivo, para exportar progreso o preguntas. */
export function descargar(nombre, texto, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
