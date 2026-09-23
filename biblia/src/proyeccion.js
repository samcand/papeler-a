/**
 * proyeccion.js — Proyectar versículos y puntos del sermón en una segunda
 * pantalla (proyector o televisor), como en las pantallas de la iglesia.
 *
 * La app abre proyector.html en otra ventana y le manda diapositivas por un
 * BroadcastChannel; la ventana contesta con su estado para que el control
 * (la barra flotante) muestre "2 / 5". Funciona sin internet y sin servidor.
 *
 *   Diapositiva: { ref?, version?, texto, titulo?, subtitulo? }
 */

import { el, render, toast } from './ui.js';

export const CANAL = 'estudio-biblico-proyeccion';
const MAXIMO = 330; // caracteres por diapositiva antes de partir el pasaje

let canal = null;
let ventana = null;
let actual = null; // { diapositivas, i, negro }
let barra = null;

function abrirCanal() {
  if (canal || typeof BroadcastChannel === 'undefined') return canal;
  canal = new BroadcastChannel(CANAL);
  canal.onmessage = ({ data }) => {
    if (data?.tipo === 'hola' && actual) enviar();          // el proyector recién abierto pide lo actual
    if (data?.tipo === 'estado' && actual) { actual.i = data.i; actual.negro = data.negro; pintarBarra(); }
    if (data?.tipo === 'adios') { actual = null; pintarBarra(); }
  };
  return canal;
}

const enviar = () => abrirCanal()?.postMessage({ tipo: 'mostrar', ...actual });

export const proyectando = () => Boolean(ventana && !ventana.closed);

/** Abre (o trae al frente) la ventana del proyector; en Chrome intenta ponerla en la otra pantalla. */
export async function abrirProyector() {
  abrirCanal();
  if (proyectando()) { ventana.focus(); return ventana; }
  let rasgos = 'popup,width=1100,height=680';
  try {
    if ('getScreenDetails' in window) {
      const d = await window.getScreenDetails();
      const otra = d.screens.find((s) => s !== d.currentScreen);
      if (otra) rasgos = `popup,left=${otra.availLeft},top=${otra.availTop},width=${otra.availWidth},height=${otra.availHeight}`;
    }
  } catch { /* sin permiso para ver las pantallas: se abre donde el navegador diga */ }
  ventana = window.open('proyector.html', 'proyector-estudio-biblico', rasgos);
  if (!ventana) toast('El navegador bloqueó la ventana emergente: permítela para proyectar', 'error');
  else toast('Arrastra la ventana al proyector y pulsa F para pantalla completa');
  return ventana;
}

/** Parte versículos en diapositivas legibles (varios versículos cortos juntos, uno largo solo). */
export function diapositivasDeVersos(versos, { ref = '', version = '' } = {}) {
  const salida = [];
  let grupo = [];
  const cerrar = () => {
    if (!grupo.length) return;
    const a = grupo[0].v, z = grupo[grupo.length - 1].v;
    const cita = ref ? ref.replace(/:\d+(?:[-–]\d+(?::\d+)?)?$/, '') : '';
    salida.push({
      ref: cita ? `${cita}:${a === z ? a : `${a}-${z}`}` : '',
      version,
      texto: grupo.map((x) => (grupo.length > 1 ? `⁽${x.v}⁾ ${x.texto}` : x.texto)).join(' '),
    });
    grupo = [];
  };
  for (const x of versos) {
    const largo = grupo.reduce((s, y) => s + y.texto.length, 0);
    if (grupo.length && largo + x.texto.length > MAXIMO) cerrar();
    grupo.push(x);
  }
  cerrar();
  // un versículo único conserva la cita tal cual
  if (salida.length === 1 && ref) salida[0].ref = ref;
  return salida;
}

/** Proyecta una lista de diapositivas (abre el proyector si hace falta). */
export async function proyectar(diapositivas, { i = 0 } = {}) {
  if (!diapositivas?.length) return;
  actual = { diapositivas, i, negro: false };
  if (!proyectando()) await abrirProyector();
  enviar();
  pintarBarra();
}

export function mover(paso) {
  if (!actual) return;
  actual.i = Math.max(0, Math.min(actual.diapositivas.length - 1, actual.i + paso));
  actual.negro = false;
  enviar();
  pintarBarra();
}

export function negro() {
  if (!actual) return;
  actual.negro = !actual.negro;
  enviar();
  pintarBarra();
}

export function cerrar() {
  abrirCanal()?.postMessage({ tipo: 'cerrar' });
  try { ventana?.close(); } catch { /* ya estaba cerrada */ }
  ventana = null;
  actual = null;
  pintarBarra();
}

/** Barra flotante de control mientras se proyecta. */
function pintarBarra() {
  if (!actual) { barra?.remove(); barra = null; return; }
  barra ||= document.body.appendChild(el('div', { class: 'control-proyeccion', role: 'toolbar', 'aria-label': 'Proyección' }));
  const d = actual.diapositivas[actual.i];
  render(barra,
    el('span', { class: 'cp-icono', title: 'Proyectando' }, '📽'),
    el('span', { class: 'cp-texto', title: d?.texto || '' }, d?.ref || d?.titulo || 'Diapositiva'),
    el('span', { class: 'tenue small' }, `${actual.i + 1}/${actual.diapositivas.length}`),
    el('button', { class: 'btn icono chico', title: 'Anterior', disabled: actual.i === 0, onClick: () => mover(-1) }, '‹'),
    el('button', { class: 'btn icono chico', title: 'Siguiente', disabled: actual.i >= actual.diapositivas.length - 1, onClick: () => mover(1) }, '›'),
    el('button', { class: `btn icono chico ${actual.negro ? 'activo' : ''}`, title: 'Pantalla en negro', onClick: negro }, '◼'),
    el('button', { class: 'btn icono chico', title: 'Mostrar la ventana del proyector', onClick: abrirProyector }, '⧉'),
    el('button', { class: 'btn icono chico', title: 'Terminar la proyección', onClick: cerrar }, '✕'));
}
