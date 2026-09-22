/** ui.js — Utilidades mínimas de DOM. Sin framework: menos peso, cero build. */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) node.style.setProperty(p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), x);
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

/** Reemplaza el contenido de un nodo descartando null, undefined y false. */
export function render(nodo, ...hijos) {
  nodo.replaceChildren(...hijos.flat(Infinity).filter((h) => h != null && h !== false));
  return nodo;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(mensaje, tipo = 'info') {
  let host = $('#toasts');
  if (!host) { host = el('div', { id: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(host); }
  const nodo = el('div', { class: `toast ${tipo}` }, mensaje);
  host.append(nodo);
  setTimeout(() => { nodo.classList.add('fuera'); setTimeout(() => nodo.remove(), 300); }, 2600);
}

export function boton(texto, alPulsar, { clase = '', titulo, attrs = {} } = {}) {
  return el('button', { class: `btn ${clase}`.trim(), type: 'button', onClick: alPulsar, title: titulo || null, ...attrs }, texto);
}

export function selector(opciones, valor, alCambiar, attrs = {}) {
  const nodo = el('select', { class: 'input', onChange: (e) => alCambiar(e.target.value), ...attrs });
  for (const o of opciones) {
    const op = typeof o === 'string' ? { value: o, label: o } : o;
    nodo.append(el('option', { value: op.value, selected: String(op.value) === String(valor) }, op.label));
  }
  return nodo;
}

export function descargar(nombre, contenido, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function leerArchivo(aceptar = '.json') {
  return new Promise((resolve) => {
    const entrada = el('input', { type: 'file', accept: aceptar });
    entrada.addEventListener('change', async () => {
      const archivo = entrada.files?.[0];
      resolve(archivo ? await archivo.text() : null);
    });
    entrada.click();
  });
}

/** Resalta tramos [inicio, fin) de un texto con <mark>. */
export function textoConTramos(texto, tramos, clase = 'hallado') {
  const salida = [];
  let pos = 0;
  for (const [a, z] of tramos) {
    if (a > pos) salida.push(texto.slice(pos, a));
    salida.push(el('mark', { class: clase }, texto.slice(a, z)));
    pos = z;
  }
  if (pos < texto.length) salida.push(texto.slice(pos));
  return salida;
}

export function fecha(ms) {
  return new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
