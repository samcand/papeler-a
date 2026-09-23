/**
 * proyector.js — La ventana que se ve en el proyector. Recibe diapositivas
 * de la app por BroadcastChannel y ajusta el tamaño de la letra para que el
 * texto llene la pantalla sin desbordarse.
 */

// El mismo nombre que usa proyeccion.js (no se importa para no cargar la interfaz de la app aquí)
const CANAL = 'estudio-biblico-proyeccion';

const TEMAS = ['noche', 'azul', 'claro', 'verde'];
const $ = (id) => document.getElementById(id);
const canal = new BroadcastChannel(CANAL);
let estado = null; // { diapositivas, i, negro }

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
document.documentElement.dataset.tema = leer('proyector-tema') || 'noche';

function poner(id, texto) {
  const n = $(id);
  n.hidden = !texto;
  n.textContent = texto || '';
}

/** Busca el mayor tamaño de letra con el que todo cabe (búsqueda binaria). */
function ajustar() {
  const lienzo = $('lienzo');
  const alto = lienzo.clientHeight, ancho = lienzo.clientWidth;
  let min = 14, max = 160;
  while (max - min > 1) {
    const medio = Math.floor((min + max) / 2);
    lienzo.style.fontSize = `${medio}px`;
    if (lienzo.scrollHeight <= alto && lienzo.scrollWidth <= ancho) min = medio; else max = medio;
  }
  lienzo.style.fontSize = `${min}px`;
}

function pintar() {
  document.body.classList.toggle('negro', Boolean(estado?.negro));
  if (!estado) { $('espera').hidden = false; $('lienzo').hidden = true; return; }
  const d = estado.diapositivas[estado.i] || {};
  $('espera').hidden = true;
  $('lienzo').hidden = false;
  poner('titulo', d.titulo);
  poner('subtitulo', d.subtitulo);
  poner('texto', d.texto);
  const ref = $('ref');
  ref.hidden = !d.ref;
  ref.replaceChildren(d.ref || '', ...(d.version ? [Object.assign(document.createElement('small'), { textContent: d.version })] : []));
  ajustar();
}

function avisar() {
  if (estado) canal.postMessage({ tipo: 'estado', i: estado.i, negro: estado.negro });
}

canal.onmessage = ({ data }) => {
  if (data?.tipo === 'mostrar') { estado = { diapositivas: data.diapositivas, i: data.i || 0, negro: Boolean(data.negro) }; pintar(); }
  if (data?.tipo === 'cerrar') window.close();
};

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
  } else if (k === 't') {
    const t = TEMAS[(TEMAS.indexOf(document.documentElement.dataset.tema) + 1) % TEMAS.length];
    document.documentElement.dataset.tema = t;
    guardar('proyector-tema', t);
  } else if (!estado) {
    return;
  } else if (['arrowright', 'pagedown', ' '].includes(k)) {
    estado.i = Math.min(estado.diapositivas.length - 1, estado.i + 1); estado.negro = false; pintar(); avisar();
  } else if (['arrowleft', 'pageup'].includes(k)) {
    estado.i = Math.max(0, estado.i - 1); estado.negro = false; pintar(); avisar();
  } else if (k === 'b' || k === '.') {
    estado.negro = !estado.negro; pintar(); avisar();
  }
});
document.addEventListener('dblclick', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()));
window.addEventListener('resize', () => estado && ajustar());
window.addEventListener('beforeunload', () => canal.postMessage({ tipo: 'adios' }));

canal.postMessage({ tipo: 'hola' });
pintar();
