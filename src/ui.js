/** ui.js — Utilidades mínimas de DOM. Sin framework: menos peso, cero build. */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') node.value = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/**
 * Reemplaza el contenido de un nodo filtrando nulos.
 *
 * `Node.replaceChildren` convierte cualquier cosa que no sea un nodo en texto,
 * así que un `condicion ? algo : null` acaba pintando la palabra "null" en la
 * pantalla. Esta función se comporta como `el()`: descarta null, undefined y
 * false, y aplana arrays.
 */
export function render(nodo, ...hijos) {
  const limpios = hijos.flat(Infinity).filter((h) => h != null && h !== false);
  nodo.replaceChildren(...limpios);
  return nodo;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(node) { while (node.firstChild) node.firstChild.remove(); return node; }

export function toast(message, kind = 'info') {
  let host = $('#toasts');
  if (!host) {
    host = el('div', { id: 'toasts', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.append(host);
  }
  const node = el('div', { class: `toast ${kind}`, role: 'status' }, message);
  host.append(node);
  setTimeout(() => { node.classList.add('out'); setTimeout(() => node.remove(), 300); }, 2600);
}

export function confirmDialog(message) {
  return window.confirm(message);
}

export function section(title, ...content) {
  return el('section', { class: 'card' }, el('h2', { class: 'card-title' }, title), ...content);
}

export function field(label, control, hint) {
  return el('label', { class: 'field' },
    el('span', { class: 'field-label' }, label),
    control,
    hint ? el('span', { class: 'field-hint' }, hint) : null);
}

export function button(label, onClick, opts = {}) {
  const texto = typeof label === 'string' ? label : '';
  const titulo = opts.title || texto;
  // Un botón que solo es un icono no dice nada a un lector de pantalla, así que
  // su título viaja como aria-label. Si el botón ya tiene palabras, no se toca:
  // un aria-label distinto del texto visible rompe el dictado por voz.
  const soloIcono = !/[\p{L}\p{N}]/u.test(texto);
  return el('button', {
    class: `btn ${opts.variant || ''}`.trim(), type: 'button', onClick,
    title: titulo,
    'aria-label': soloIcono && titulo ? titulo : undefined,
    ...(opts.attrs || {}),
  }, label);
}

export function select(options, value, onChange, opts = {}) {
  const node = el('select', { class: 'input', onChange: (e) => onChange(e.target.value), ...(opts.attrs || {}) });
  for (const opt of options) {
    const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
    node.append(el('option', { value: o.value, selected: String(o.value) === String(value) }, o.label));
  }
  return node;
}

export function input(value, onInput, opts = {}) {
  return el('input', {
    class: 'input', value: value ?? '', type: opts.type || 'text',
    placeholder: opts.placeholder || '', min: opts.min, max: opts.max, step: opts.step,
    onInput: (e) => onInput(e.target.value),
  });
}

export function textarea(value, onInput, opts = {}) {
  return el('textarea', {
    class: 'input textarea', rows: opts.rows || 6, placeholder: opts.placeholder || '',
    onInput: (e) => onInput(e.target.value), spellcheck: 'false',
  }, value ?? '');
}

export function chip(label, opts = {}) {
  return el('span', { class: `chip ${opts.class || ''}`.trim(), ...(opts.attrs || {}) }, label);
}

export function download(filename, content, type = 'application/json') {
  // content puede ser texto o bytes (por ejemplo un .docx generado en el navegador)
  const blob = new Blob([content instanceof Uint8Array ? content : String(content)], { type });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado al portapapeles');
  } catch {
    toast('No se pudo copiar; selecciona el texto a mano', 'warn');
  }
}

/** Panel lateral simple para mostrar detalle de un acorde. */
export function drawer(title, content) {
  const existing = $('#drawer');
  if (existing) existing.remove();
  const panel = el('div', { id: 'drawer', class: 'drawer' },
    el('div', { class: 'drawer-head' },
      el('h3', {}, title),
      button('✕', () => panel.remove(), { variant: 'ghost', title: 'Cerrar' })),
    el('div', { class: 'drawer-body' }, content));
  document.body.append(panel);
  panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { panel.remove(); document.removeEventListener('keydown', esc); }
  });
  return panel;
}
