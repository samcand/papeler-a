/**
 * vistazo.js — Al pasar el cursor (o mantener el dedo) sobre cualquier cita
 * enlazada, aparece el texto del pasaje sin salir de donde estás.
 */

import { el, render } from '../ui.js';
import { deClave, rango, formatear } from '../referencias.js';
import { textoRango } from '../texto.js';
import { almacen } from '../almacen.js';

let globo = null;
let temporizador = null;
let actual = null;

function ocultar() {
  clearTimeout(temporizador);
  actual = null;
  globo?.classList.remove('visible');
}

async function mostrar(enlace) {
  const r = deClave(enlace.dataset.ref);
  if (!r) return;
  actual = enlace;
  globo ||= document.body.appendChild(el('div', { class: 'vistazo', role: 'tooltip' }));
  const { desde, hasta } = rango(r);
  const versos = await textoRango(almacen.ajustes.principal, desde, hasta);
  if (actual !== enlace) return;
  render(globo,
    el('strong', {}, formatear(r)),
    el('div', { class: 'vistazo-texto' },
      versos.slice(0, 12).map((x) => el('span', {}, el('sup', {}, x.v), ' ', x.texto, ' ')),
      versos.length > 12 ? el('span', { class: 'tenue' }, '…') : null));
  const caja = enlace.getBoundingClientRect();
  const ancho = Math.min(380, window.innerWidth - 24);
  globo.style.width = `${ancho}px`;
  globo.style.left = `${Math.max(12, Math.min(window.innerWidth - ancho - 12, caja.left))}px`;
  globo.classList.add('visible');
  const alto = globo.offsetHeight;
  const arriba = caja.top - alto - 8;
  globo.style.top = `${arriba > 8 ? arriba + window.scrollY : caja.bottom + 8 + window.scrollY}px`;
}

export function instalarVistazo() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  document.addEventListener('mouseover', (e) => {
    const enlace = e.target.closest?.('a.ref[data-ref]');
    if (!enlace || enlace === actual) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => mostrar(enlace), 250);
  });
  document.addEventListener('mouseout', (e) => {
    const enlace = e.target.closest?.('a.ref[data-ref]');
    if (enlace && !enlace.contains(e.relatedTarget)) ocultar();
  });
  document.addEventListener('click', ocultar);
  window.addEventListener('hashchange', ocultar);
}
