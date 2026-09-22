/**
 * lector.js — La pantalla principal: el texto bíblico con versiones en
 * paralelo, resaltados a nivel de palabra, notas y el panel "Guía del pasaje"
 * (referencias cruzadas, tus notas, otras versiones y palabras para estudiar).
 *
 * Cómo se usa:
 *   · Toca un versículo para seleccionarlo (Mayús + clic extiende la selección).
 *   · Selecciona palabras con el ratón o el dedo para resaltarlas o subrayarlas.
 *   · ← y → cambian de capítulo; Esc quita la selección; Ctrl+Z deshace.
 */

import { el, render, toast, $$ } from '../ui.js';
import { almacen } from '../almacen.js';
import { libro, idVerso, partesId, capituloVecino } from '../libros.js';
import { deClave, formatearRango, aClave, refDesdeRango, normalizar } from '../referencias.js';
import {
  capitulo, precargar, referenciasDe, textoRango, version, versiones, tieneLibro, versiculosEn, textoSiCargado,
} from '../texto.js';
import {
  COLORES, ESTILOS, SIMBOLOS, crearMarca, segmentos, estiloSegmento, segmentoDeMarca, estiloDe, marcasEnRango, textoDeMarca,
} from '../marcas.js';
import { compilarClaves, marcasDeClaves, juegos } from '../claves.js';
import { editarClave } from './editor-clave.js';
import { citasEn, fragmento } from '../biblioteca.js';
import { enLinea } from '../notas.js';
import * as estante from '../estante.js';
import { nuevoSermon } from './sermones.js';
import { notasEn, notaAHtml } from '../notas.js';
import { editarNota } from './editor-nota.js';
import { elegirPasaje, listaLibros, cuadriculaCapitulos } from './selector.js';

const ORIGINAL = 'original';
let est = null;

export async function vistaLector(app, ruta) {
  let ref = deClave(ruta.partes[0]);
  if (!ref) {
    const p = almacen.estado.posicion;
    ref = { b: p.b, c: p.c, v: p.v, c2: p.c, v2: p.v };
  }
  const reutilizar = est && app.contains(est.raiz);
  if (!reutilizar) montar(app);
  const cambio = !reutilizar || est.b !== ref.b || est.c !== ref.c;
  est.b = ref.b;
  est.c = ref.c;
  almacen.irA(ref.b, ref.c, ref.v);

  if (cambio) {
    est.sel = null;
    est.textoSel = null;
    ocultarBarra();
    pintarCabecera();
    pintarNavegador();
    await pintarCapitulo();
    if (!ref.v) window.scrollTo({ top: 0 });
  }
  if (ref.v) {
    const hasta = ref.c2 === ref.c && ref.v2 ? ref.v2 : ref.v;
    est.sel = { version: almacen.ajustes.principal, desde: idVerso(ref.b, ref.c, ref.v), hasta: idVerso(ref.b, ref.c, hasta) };
    marcarSeleccion();
    desplazarA(est.sel.desde, true);
  }
  pintarPanel();
  return limpiar;
}

// ---------------------------------------------------------------- Estructura

function montar(app) {
  const cab = el('div', { class: 'lector-cab' });
  const texto = el('div', { class: 'texto', lang: 'es' });
  const pie = el('div', { class: 'lector-pie' });
  const nav = el('aside', { class: 'navegador', 'aria-label': 'Libros y capítulos' });
  const panel = el('aside', { class: 'panel', 'aria-label': 'Guía del pasaje' });
  const raiz = el('div', { class: `lector ${almacen.ajustes.panel ? '' : 'sin-panel'}` },
    nav,
    el('section', { class: 'lectura' }, cab, texto, pie),
    panel);
  const barra = el('div', { class: 'barra-marcas', role: 'toolbar', 'aria-label': 'Resaltar y anotar' });
  document.body.append(barra);
  render(app, raiz);

  est = { raiz, cab, texto, pie, nav, panel, barra, b: 0, c: 0, sel: null, textoSel: null, navLibro: null, modo: null };
  construirBarra();

  texto.addEventListener('click', alHacerClic);
  texto.addEventListener('mouseup', () => setTimeout(revisarSeleccion, 10));
  document.addEventListener('selectionchange', alCambiarSeleccion);
  document.addEventListener('keydown', alTeclear);
  window.addEventListener('resize', ocultarBarraSiTexto);
}

function limpiar() {
  if (!est) return;
  document.removeEventListener('selectionchange', alCambiarSeleccion);
  document.removeEventListener('keydown', alTeclear);
  window.removeEventListener('resize', ocultarBarraSiTexto);
  est.barra.remove();
  est = null;
}

/** Versiones que se muestran en columnas para el libro actual. */
function columnas(b) {
  const a = almacen.ajustes;
  const ids = [a.principal, ...a.paralelas]
    .map((id) => (id === ORIGINAL ? (b <= 39 ? 'wlc' : 'tr') : id))
    .filter((id, i, lista) => lista.indexOf(id) === i && version(id) && tieneLibro(id, b));
  return ids.length ? ids : ['rv1909'];
}

// ---------------------------------------------------------------- Cabecera y navegación

function pintarCabecera() {
  const { b, c } = est;
  const a = almacen.ajustes;
  const anterior = capituloVecino(b, c, -1);
  const siguiente = capituloVecino(b, c, 1);
  const alternar = (id) => {
    const paralelas = a.paralelas.includes(id) ? a.paralelas.filter((x) => x !== id) : [...a.paralelas, id];
    almacen.ajustar({ paralelas });
    pintarCabecera();
    pintarCapitulo();
  };
  const opcionesParalelas = [
    ...versiones().filter((v) => ['rv1909', 'kjv'].includes(v.id) && v.id !== a.principal).map((v) => ({ id: v.id, nombre: v.abrev })),
    { id: ORIGINAL, nombre: b <= 39 ? 'Hebreo' : 'Griego' },
  ];
  render(est.cab,
    el('div', { class: 'cab-nav' },
      el('button', { class: 'btn icono', title: 'Capítulo anterior (←)', disabled: !anterior, onClick: () => anterior && (location.hash = `#/leer/${anterior.b}.${anterior.c}`) }, '‹'),
      el('button', { class: 'btn titulo-cap', title: 'Elegir libro y capítulo', onClick: () => elegirPasaje(b, c) }, `${libro(b).nombre} ${c}`, el('span', { class: 'tenue' }, ' ▾')),
      el('button', { class: 'btn icono', title: 'Capítulo siguiente (→)', disabled: !siguiente, onClick: () => siguiente && (location.hash = `#/leer/${siguiente.b}.${siguiente.c}`) }, '›')),
    el('div', { class: 'cab-versiones' },
      el('select', { class: 'input chico', title: 'Versión principal', onChange: (e) => { almacen.ajustar({ principal: e.target.value, paralelas: a.paralelas.filter((x) => x !== e.target.value) }); pintarCabecera(); pintarCapitulo(); pintarPanel(); } },
        versiones().filter((v) => ['rv1909', 'kjv'].includes(v.id)).map((v) => el('option', { value: v.id, selected: v.id === a.principal }, v.abrev))),
      opcionesParalelas.map((o) => el('button', {
        class: `chip ${a.paralelas.includes(o.id) ? 'activo' : ''}`, title: `Mostrar ${o.nombre} en paralelo`,
        'aria-pressed': a.paralelas.includes(o.id), onClick: () => alternar(o.id),
      }, `+ ${o.nombre}`))),
    el('div', { class: 'cab-acciones' },
      el('button', {
        class: `btn chico ${almacen.leido(b, c) ? 'hecho' : ''}`, title: 'Marcar el capítulo como leído',
        onClick: () => { const leido = almacen.alternarLeido(b, c); toast(leido ? 'Capítulo marcado como leído' : 'Capítulo sin marcar'); pintarCabecera(); pintarPie(); },
      }, almacen.leido(b, c) ? '✓ Leído' : '○ Leído'),
      el('button', {
        class: `btn chico ${a.panel ? 'activo' : ''}`, title: 'Mostrar u ocultar la guía del pasaje',
        onClick: () => { almacen.ajustar({ panel: !almacen.ajustes.panel }); est.raiz.classList.toggle('sin-panel', !almacen.ajustes.panel); pintarCabecera(); },
      }, '☰ Guía')));
}

function pintarNavegador() {
  const b = est.navLibro || est.b;
  render(est.nav,
    el('div', { class: 'nav-cap' },
      el('h3', {}, libro(b).nombre),
      cuadriculaCapitulos(b, (c) => { est.navLibro = null; location.hash = `#/leer/${b}.${c}`; }, b === est.b ? est.c : 0)),
    listaLibros((n) => { est.navLibro = n; pintarNavegador(); est.nav.scrollTop = 0; }, b));
}

function pintarPie() {
  const { b, c } = est;
  const anterior = capituloVecino(b, c, -1);
  const siguiente = capituloVecino(b, c, 1);
  render(est.pie,
    anterior ? el('a', { class: 'btn', href: `#/leer/${anterior.b}.${anterior.c}` }, `‹ ${libro(anterior.b).nombre} ${anterior.c}`) : el('span'),
    el('button', {
      class: `btn ${almacen.leido(b, c) ? 'hecho' : 'primario'}`,
      onClick: () => {
        const leido = almacen.alternarLeido(b, c);
        pintarCabecera(); pintarPie();
        if (leido && siguiente) toast(`¡Bien! Sigue con ${libro(siguiente.b).nombre} ${siguiente.c}`);
      },
    }, almacen.leido(b, c) ? '✓ Capítulo leído' : 'Marcar como leído'),
    siguiente ? el('a', { class: 'btn', href: `#/leer/${siguiente.b}.${siguiente.c}` }, `${libro(siguiente.b).nombre} ${siguiente.c} ›`) : el('span'));
}

// ---------------------------------------------------------------- Texto

async function pintarCapitulo() {
  const { b, c } = est;
  const a = almacen.ajustes;
  const cols = columnas(b);
  const datos = await Promise.all(cols.map((v) => capitulo(v, b, c)));
  await precargar(a.principal, b);
  if (!est || est.b !== b || est.c !== c) return; // el usuario ya se fue a otro capítulo

  const desde = idVerso(b, c, 1), hasta = idVerso(b, c, 999);
  const notas = notasEn(almacen.estado.notas, desde, hasta);
  const marcas = cols.map((v) => marcasEnRango(almacen.estado.marcas, v, desde, hasta));
  const claves = cols.map((v) => (a.clavesVisibles
    ? compilarClaves(almacen.estado.claves, { version: v, b, juegosOcultos: a.juegosOcultos })
    : []));
  const total = Math.max(...datos.map((d) => d.length));
  const meta = cols.map((v) => version(v));
  const atributos = (m) => ({ lang: m.idioma, dir: m.dir || 'ltr' });

  const verso = (i, v) => {
    const texto = datos[i][v - 1];
    if (!texto) return null;
    const id = idVerso(b, c, v);
    const segs = segmentos(texto, id, claves[i].length ? [...marcasDeClaves(texto, id, claves[i]), ...marcas[i]] : marcas[i]);
    const principal = i === 0;
    const notasV = principal ? notas.filter((n) => n.desde <= id && (n.hasta || n.desde) >= id) : [];
    return el('span', {
      class: `vs ${principal && almacen.tieneMarcador(id) ? 'marcado' : ''}`,
      dataset: { id },
    },
    el('sup', { class: 'num', 'aria-hidden': 'true' }, v),
    el('span', { class: 't' }, segs.map(trozo)),
    notasV.length ? el('button', {
      class: 'ind-nota', type: 'button', dataset: { nota: notasV[0].id },
      title: notasV.map((n) => n.titulo || n.cuerpo.slice(0, 60)).join('\n'),
    }, notasV.length > 1 ? `✎${notasV.length}` : '✎') : null,
    ' ');
  };

  let cuerpo;
  if (cols.length === 1 && a.modo === 'parrafo') {
    cuerpo = el('div', { class: 'parrafo celda', dataset: { version: cols[0] }, ...atributos(meta[0]) },
      Array.from({ length: total }, (_, k) => verso(0, k + 1)));
  } else {
    cuerpo = el('div', { class: `filas cols-${cols.length}` },
      cols.length > 1 ? el('div', { class: 'fila cabeza' }, meta.map((m) => el('div', { class: 'celda-cab', title: m.nombre }, m.abrev))) : null,
      Array.from({ length: total }, (_, k) => el('div', { class: 'fila' },
        cols.map((v, i) => el('div', { class: 'celda', dataset: { version: v }, ...atributos(meta[i]) }, verso(i, k + 1))))));
  }

  render(est.texto,
    el('h1', { class: 'cap-titulo' }, libro(b).capitulos === 1 ? libro(b).nombre : `${libro(b).nombre} ${c}`),
    cuerpo,
    cols.includes('wlc') || cols.includes('tr')
      ? el('p', { class: 'tenue small nota-versificacion' }, 'El texto original puede numerar algunos versículos distinto (p. ej. Joel y Malaquías en hebreo).')
      : null);
  pintarPie();
  marcarSeleccion();
}

/** Un trozo de versículo con sus marcas. El símbolo va en ::before para no alterar el texto seleccionable. */
function trozo(s) {
  if (!s.marcas.length) return s.texto;
  const { clase, vars, simbolo } = estiloSegmento(s);
  const dataset = { marcas: s.marcas.join(' ') };
  if (simbolo) dataset.sim = simbolo;
  return el('span', { class: clase, style: vars, dataset }, s.texto);
}

function desplazarA(id, destello) {
  const nodo = est.texto.querySelector(`.vs[data-id="${id}"]`);
  if (!nodo) return;
  nodo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if (destello) {
    nodo.classList.add('destello');
    setTimeout(() => nodo.classList.remove('destello'), 1600);
  }
}

// ---------------------------------------------------------------- Selección

function alHacerClic(e) {
  const indicador = e.target.closest('.ind-nota');
  if (indicador) {
    const nota = almacen.estado.notas.find((n) => n.id === indicador.dataset.nota);
    if (nota) editarNota(nota).then(repintar);
    return;
  }
  const seleccion = getSelection();
  if (seleccion && !seleccion.isCollapsed && est.texto.contains(seleccion.anchorNode)) return;
  const vs = e.target.closest('.vs');
  if (!vs) return;
  const id = Number(vs.dataset.id);
  const ver = vs.closest('[data-version]')?.dataset.version || almacen.ajustes.principal;
  if (e.shiftKey && est.sel) {
    est.sel = { version: est.sel.version, desde: Math.min(est.sel.desde, id), hasta: Math.max(est.sel.hasta, id) };
  } else if (est.sel && est.sel.desde === id && est.sel.hasta === id) {
    limpiarSeleccion();
    return;
  } else {
    est.sel = { version: ver, desde: id, hasta: id };
  }
  est.textoSel = null;
  est.fijo = false;
  marcarSeleccion();
  mostrarBarra('versos', vs.getBoundingClientRect());
  pintarPanel();
  history.replaceState(null, '', `#/leer/${aClave(refDesdeRango(est.sel.desde, est.sel.hasta))}`);
}

function marcarSeleccion() {
  for (const n of $$('.vs.sel', est.texto)) n.classList.remove('sel');
  if (!est.sel) return;
  for (const n of $$('.vs', est.texto)) {
    const id = Number(n.dataset.id);
    if (id >= est.sel.desde && id <= est.sel.hasta) n.classList.add('sel');
  }
}

function limpiarSeleccion() {
  est.sel = null;
  est.textoSel = null;
  est.fijo = false;
  getSelection()?.removeAllRanges();
  marcarSeleccion();
  ocultarBarra();
  pintarPanel();
  history.replaceState(null, '', `#/leer/${est.b}.${est.c}`);
}

let esperaSeleccion = null;
function alCambiarSeleccion() {
  clearTimeout(esperaSeleccion);
  esperaSeleccion = setTimeout(revisarSeleccion, 350);
}

function revisarSeleccion() {
  if (!est) return;
  const s = getSelection();
  if (!s || !s.rangeCount || s.isCollapsed) {
    if (est.modo === 'texto' && !est.fijo) ocultarBarra();
    return;
  }
  const r = s.getRangeAt(0);
  if (!est.texto.contains(r.commonAncestorContainer)) return;
  const a = punto(r.startContainer, r.startOffset, 'inicio');
  const z = punto(r.endContainer, r.endOffset, 'fin');
  if (!a || !z || (a.id === z.id && a.o === z.o)) return;
  est.textoSel = {
    version: a.version,
    desde: { id: a.id, o: a.o },
    hasta: { id: z.id, o: z.version === a.version ? z.o : null },
    texto: s.toString().replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim(),
  };
  est.fijo = false;
  mostrarBarra('texto', r.getBoundingClientRect());
}

/** Convierte un punto del DOM en { versión, id de versículo, carácter dentro del versículo }. */
function punto(nodo, desplazamiento, lado) {
  const elemento = nodo.nodeType === 1 ? nodo : nodo.parentElement;
  let vs = elemento?.closest('.vs');
  const p = document.createRange();
  p.setStart(nodo, desplazamiento);
  if (!vs) {
    // El punto cayó entre versículos (en una fila o en el título): usa el vecino
    const lista = $$('.vs', est.texto);
    if (lado === 'inicio') {
      vs = lista.find((n) => p.comparePoint(n, 0) >= 0);
      if (!vs) return null;
      return { version: versionDe(vs), id: Number(vs.dataset.id), o: 0 };
    }
    vs = [...lista].reverse().find((n) => p.comparePoint(n, 0) < 0);
    if (!vs) return null;
    return { version: versionDe(vs), id: Number(vs.dataset.id), o: null };
  }
  const t = vs.querySelector('.t');
  const caja = document.createRange();
  caja.selectNodeContents(t);
  let o;
  const pos = caja.comparePoint(nodo, desplazamiento);
  if (pos < 0) o = 0;
  else if (pos > 0) o = t.textContent.length;
  else {
    const hasta = document.createRange();
    hasta.setStart(t, 0);
    hasta.setEnd(nodo, desplazamiento);
    o = hasta.toString().length;
  }
  return { version: versionDe(vs), id: Number(vs.dataset.id), o };
}

const versionDe = (vs) => vs.closest('[data-version]')?.dataset.version || almacen.ajustes.principal;

function alTeclear(e) {
  if (!est) return;
  const escribiendo = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable || $$('dialog[open]').length;
  if (escribiendo) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (almacen.deshacerUltimo()) { toast('Cambio deshecho'); repintar(); }
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape') { limpiarSeleccion(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const vecino = capituloVecino(est.b, est.c, e.key === 'ArrowLeft' ? -1 : 1);
    if (vecino) location.hash = `#/leer/${vecino.b}.${vecino.c}`;
  }
  // Atajos de color: 1-6 resaltan lo seleccionado
  const n = Number(e.key);
  if (est.modo && n >= 1 && n <= COLORES.length) aplicarMarca(COLORES[n - 1].id, almacen.ajustes.estilo);
  if (est.modo && e.key.toLowerCase() === 'n') { e.preventDefault(); nuevaNota(); }
}

// ---------------------------------------------------------------- Barra de marcas

function construirBarra() {
  const sinFoco = (e) => e.preventDefault(); // no perder la selección al pulsar
  const accion = (texto, titulo, alPulsar, clase = '') =>
    el('button', { type: 'button', class: `btn chico ${clase}`, title: titulo, onMousedown: sinFoco, onClick: alPulsar }, texto);
  const a = almacen.ajustes;
  const herramienta = (e) => el('button', {
    type: 'button', class: `herr ${a.estilo === e.id ? 'activa' : ''} herr-${e.id}`, title: e.nombre, 'aria-pressed': a.estilo === e.id,
    onMousedown: sinFoco,
    onClick: () => {
      // negrita y cursiva no llevan color: se aplican de una vez
      if (e.id === 'negrita' || e.id === 'cursiva') { aplicarMarca(a.color, e.id); return; }
      almacen.ajustar({ estilo: e.id });
      construirBarra();
    },
  }, e.icono);

  render(est.barra,
    el('div', { class: 'fila-barra herramientas' }, ESTILOS.map(herramienta),
      el('span', { class: 'separador' }),
      accion('⌫', 'Borrar las marcas de lo seleccionado', borrarMarcas)),
    el('div', { class: 'fila-barra colores' }, COLORES.map((c, i) => el('button', {
      type: 'button', class: `muestra m-${c.id} ${a.color === c.id ? 'activa' : ''}`,
      title: `${estiloDe(a.estilo).nombre} en ${c.nombre.toLowerCase()}${i < 9 ? ` (${i + 1})` : ''}`,
      'aria-label': `${estiloDe(a.estilo).nombre} en ${c.nombre.toLowerCase()}`,
      onMousedown: sinFoco, onClick: () => aplicarMarca(c.id, a.estilo),
    }))),
    a.estilo === 'simbolo' ? el('div', { class: 'fila-barra simbolos' }, SIMBOLOS.map((x) => el('button', {
      type: 'button', class: `simbolo-btn ${a.simbolo === x.s ? 'activa' : ''}`, title: `${x.nombre} (color sugerido: ${x.color})`,
      style: { '--s': `var(--u-${x.color})` }, onMousedown: sinFoco,
      onClick: () => { almacen.ajustar({ simbolo: x.s }); aplicarMarca(x.color, 'simbolo'); },
    }, x.s))) : null,
    el('div', { class: 'fila-barra acciones-barra' },
      accion('✎ Nota', 'Escribir una nota sobre el pasaje (N)', nuevaNota),
      accion('★ Clave', 'Marcar esta palabra en todo el libro o toda la Biblia', nuevaClave, 'solo-texto'),
      accion('🔖', 'Marcador', alternarMarcador, 'solo-versos'),
      accion('⧉', 'Copiar con la cita', copiar),
      accion('🔤', 'Estudiar esta palabra', estudiarPalabra, 'solo-palabra'),
      accion('🔎', 'Buscar lo seleccionado en toda la Biblia', buscarSeleccion, 'solo-texto'),
      accion('✕', 'Cerrar (Esc)', limpiarSeleccion, 'icono')));
}

function nuevaClave() {
  const t = est.textoSel;
  if (!t?.texto) return;
  editarClave({ palabra: t.texto.toLowerCase(), version: t.version, alcance: 0, color: almacen.ajustes.color, estilo: almacen.ajustes.estilo === 'simbolo' ? 'resaltar' : almacen.ajustes.estilo }, est.b)
    .then((guardada) => { if (guardada) { est.fijo = false; ocultarBarra(); repintar(); } });
}

function mostrarBarra(modo, caja) {
  est.modo = modo;
  const b = est.barra;
  const palabra = modo === 'texto' && /^[\p{L}]+$/u.test(est.textoSel?.texto || '');
  b.classList.toggle('modo-texto', modo === 'texto');
  b.classList.toggle('con-palabra', palabra);
  b.classList.add('visible');
  const estrecho = window.innerWidth < 760;
  b.classList.toggle('abajo', estrecho);
  if (estrecho) { b.style.left = ''; b.style.top = ''; return; }
  const ancho = b.offsetWidth;
  const alto = b.offsetHeight;
  const izquierda = Math.max(10, Math.min(window.innerWidth - ancho - 10, caja.left + caja.width / 2 - ancho / 2));
  const arriba = caja.top - alto - 10 > 64 ? caja.top - alto - 10 : caja.bottom + 10;
  b.style.left = `${izquierda}px`;
  b.style.top = `${arriba + window.scrollY}px`;
}

function ocultarBarra() {
  if (!est) return;
  est.modo = null;
  est.barra.classList.remove('visible');
}

function ocultarBarraSiTexto() { if (est?.modo === 'texto') ocultarBarra(); }

/** Qué cubre la acción: la selección de texto, o los versículos seleccionados completos. */
function objetivo() {
  if (est.modo === 'texto' && est.textoSel) return est.textoSel;
  if (est.sel) return { version: est.sel.version, desde: { id: est.sel.desde, o: 0 }, hasta: { id: est.sel.hasta, o: null } };
  return null;
}

function aplicarMarca(color, estilo) {
  const o = objetivo();
  if (!o) return;
  almacen.agregarMarca(crearMarca({ ...o, color, estilo, simbolo: almacen.ajustes.simbolo }));
  if (color !== almacen.ajustes.color && estilo !== 'simbolo') almacen.ajustar({ color });
  terminarAccion();
}

function borrarMarcas() {
  const o = objetivo();
  if (!o) return;
  almacen.borrarTramo(o.version, o.desde, o.hasta);
  terminarAccion();
}

/**
 * Tras marcar, la barra queda abierta sobre el mismo tramo: así se puede
 * combinar fondo, color de letra, recuadro y símbolo sin volver a seleccionar.
 */
function terminarAccion() {
  est.fijo = true;
  getSelection()?.removeAllRanges();
  construirBarra();
  repintar();
}

async function repintar() {
  if (!est) return;
  const y = window.scrollY;
  await pintarCapitulo();
  window.scrollTo({ top: y });
  pintarPanel();
}

function nuevaNota() {
  const o = objetivo();
  const desde = o ? o.desde.id : idVerso(est.b, est.c, 1);
  const hasta = o ? o.hasta.id : idVerso(est.b, est.c, 999);
  const cita = est.modo === 'texto' && est.textoSel?.texto ? `> ${est.textoSel.texto}\n\n` : '';
  ocultarBarra();
  editarNota({ desde, hasta, cuerpo: cita }).then(repintar);
}

function alternarMarcador() {
  if (!est.sel) return;
  const puesto = almacen.alternarMarcador(est.sel.desde, est.sel.hasta);
  toast(puesto ? `Marcador en ${formatearRango(est.sel.desde, est.sel.hasta)}` : 'Marcador quitado');
  repintar();
}

async function copiar() {
  const o = objetivo();
  if (!o) return;
  let texto;
  if (est.modo === 'texto' && est.textoSel && o.desde.id === o.hasta.id) {
    texto = est.textoSel.texto;
  } else {
    const versos = await textoRango(o.version, o.desde.id, o.hasta.id);
    texto = versos.length > 1 ? versos.map((x) => `${x.v} ${x.texto}`).join(' ') : versos[0]?.texto || '';
  }
  const cita = `“${texto}” — ${formatearRango(o.desde.id, o.hasta.id)} (${version(o.version)?.abrev || ''})`;
  try {
    await navigator.clipboard.writeText(cita);
    toast('Copiado con la cita');
  } catch {
    prompt('Copia el texto:', cita);
  }
}

function estudiarPalabra() {
  const palabra = est.textoSel?.texto;
  if (palabra) location.hash = `#/palabra/${encodeURIComponent(palabra.toLowerCase())}`;
}

function buscarSeleccion() {
  const t = est.textoSel?.texto;
  if (t) location.hash = `#/buscar?q=${encodeURIComponent(t.includes(' ') ? `"${t}"` : t)}`;
}

// ---------------------------------------------------------------- Panel: guía del pasaje

const VACIAS = new Set('para porque sobre entre desde hasta como cuando donde pero sino este esta estos estas aquel ellos ellas sera eran fueron habia tambien todo toda todos todas mismo cual cuales nosotros vosotros vuestro vuestra nuestro nuestra dijo dice'.split(' '));

async function pintarPanel() {
  if (!est) return;
  const panel = est.panel;
  const estrecho = window.innerWidth < 1000;
  panel.classList.toggle('abierto', Boolean(est.sel) && estrecho);
  if (!est.sel) return pintarPanelCapitulo();

  const { desde, hasta, version: ver } = est.sel;
  const titulo = formatearRango(desde, hasta);
  const refs = el('ol', { class: 'xrefs' }, el('li', { class: 'tenue' }, 'Cargando…'));
  const otras = el('div', { class: 'otras-versiones' });
  const palabras = el('div', { class: 'chips' });
  const notas = notasEn(almacen.estado.notas, desde, hasta);
  const enBiblioteca = el('div', { class: 'en-biblioteca' }, el('p', { class: 'tenue small' }, 'Buscando en tus libros…'));
  pintarBiblioteca(enBiblioteca, desde, hasta);

  render(panel,
    el('div', { class: 'panel-cab' },
      el('div', {},
        el('div', { class: 'panel-sub' }, 'Guía del pasaje'),
        el('h2', {}, titulo)),
      el('button', { class: 'btn icono', title: 'Cerrar (Esc)', onClick: limpiarSeleccion }, '✕')),
    el('div', { class: 'panel-acciones' },
      el('button', { class: 'btn chico primario', onClick: nuevaNota }, '✎ Nota'),
      el('button', { class: `btn chico ${almacen.tieneMarcador(desde) ? 'activo' : ''}`, onClick: alternarMarcador }, almacen.tieneMarcador(desde) ? '🔖 Quitar' : '🔖 Marcador'),
      el('button', { class: 'btn chico', onClick: () => { est.modo = 'versos'; copiar(); } }, '⧉ Copiar'),
      el('button', { class: 'btn chico', title: 'Preparar un sermón sobre este pasaje', onClick: () => nuevoSermon({ pasaje: titulo }) }, '🎤 Sermón')),
    bloque('Referencias cruzadas', refs, 'OpenBible.info · ordenadas por votos'),
    bloque(`Mis notas${notas.length ? ` (${notas.length})` : ''}`, notas.length
      ? notas.map(tarjetaNota)
      : el('p', { class: 'tenue small' }, 'Aún no hay notas aquí. Pulsa ✎ Nota o selecciona palabras.')),
    bloque('En otras versiones', otras),
    bloque('En tu biblioteca', enBiblioteca, 'Párrafos de tus libros que citan este pasaje'),
    bloque('Estudiar palabras', palabras, 'Toca una palabra para ver dónde más aparece'));

  // Referencias cruzadas (unión de las de cada versículo seleccionado)
  const ids = [];
  for (let id = desde; id <= hasta && ids.length < 12; id++) ids.push(id);
  const listas = await Promise.all(ids.map(referenciasDe));
  if (!est || est.sel?.desde !== desde) return;
  const vistas = new Map();
  for (const x of listas.flat()) {
    if (x.desde >= desde && x.hasta <= hasta) continue;
    const k = `${x.desde}-${x.hasta}`;
    if (!vistas.has(k) || vistas.get(k).votos < x.votos) vistas.set(k, x);
  }
  const todas = [...vistas.values()].sort((a, z) => z.votos - a.votos);
  pintarReferencias(refs, todas);

  // Otras versiones
  const ajenas = ['rv1909', 'kjv', 'wlc', 'tr'].filter((v) => v !== ver && tieneLibro(v, partesId(desde).b));
  const textos = await Promise.all(ajenas.map((v) => textoRango(v, desde, Math.min(hasta, desde + 5))));
  if (!est || est.sel?.desde !== desde) return;
  render(otras, ajenas.map((v, i) => textos[i].length ? el('div', { class: 'otra', lang: version(v).idioma, dir: version(v).dir || 'ltr' },
    el('span', { class: 'etiqueta-version' }, version(v).abrev),
    textos[i].map((x) => el('span', {}, textos[i].length > 1 ? el('sup', {}, x.v) : null, ' ', x.texto, ' '))) : null));

  // Palabras del pasaje, para el estudio de palabras
  const principal = await textoRango(ver, desde, hasta);
  const unicas = [...new Set(principal.map((x) => x.texto).join(' ').split(/[^\p{L}]+/u)
    .filter((p) => p.length > 3 && !VACIAS.has(normalizar(p))).map((p) => p.toLowerCase()))].slice(0, 24);
  if (!est || est.sel?.desde !== desde) return;
  render(palabras, unicas.map((p) => el('a', { class: 'chip', href: `#/palabra/${encodeURIComponent(p)}` }, p)));
}

/** Lo que dicen los libros de la biblioteca sobre el pasaje seleccionado. */
async function pintarBiblioteca(contenedor, desde, hasta) {
  let libros = [];
  try { libros = await estante.libros(); } catch { /* sin IndexedDB (modo privado) */ }
  if (!libros.length) {
    render(contenedor, el('p', { class: 'tenue small' }, 'Importa comentarios o libros en ', el('a', { href: '#/biblioteca' }, 'Biblioteca'), ' y aquí verás lo que dicen sobre este pasaje.'));
    return;
  }
  const hallazgos = citasEn(libros, desde, hasta, { limite: 15 });
  if (!hallazgos.length) { render(contenedor, el('p', { class: 'tenue small' }, `Ninguno de tus ${libros.length} libros cita este pasaje.`)); return; }
  const items = await Promise.all(hallazgos.map(async (h) => {
    const ps = await estante.parrafos(h.libro.id);
    const texto = ps[h.parrafo] || '';
    return el('li', {},
      el('a', { class: 'libro-cita', href: `#/biblioteca/${encodeURIComponent(h.libro.id)}?p=${h.parrafo}` },
        el('strong', {}, h.libro.titulo), h.libro.autor ? el('span', { class: 'tenue' }, ` · ${h.libro.autor}`) : null),
      el('div', { class: 'xref-texto', html: enLinea(fragmento(texto, { largo: 280 })) }));
  }));
  render(contenedor, el('ol', { class: 'xrefs' }, items));
}

function bloque(titulo, contenido, ayuda) {
  return el('section', { class: 'bloque' },
    el('h3', {}, titulo, ayuda ? el('span', { class: 'ayuda', title: ayuda }, ' ⓘ') : null),
    contenido);
}

function pintarReferencias(lista, todas) {
  const minimo = almacen.ajustes.votos;
  let visibles = todas.filter((x) => x.votos >= minimo);
  if (visibles.length < 5) visibles = todas.slice(0, 5);
  let mostradas = 0;
  const maxVotos = todas[0]?.votos || 1;
  render(lista);
  if (!todas.length) { render(lista, el('li', { class: 'tenue' }, 'Sin referencias para este pasaje.')); return; }

  const agregar = (cuantas) => {
    const lote = visibles.slice(mostradas, mostradas + cuantas);
    mostradas += lote.length;
    lista.querySelector('.mas')?.remove();
    for (const x of lote) {
      const r = refDesdeRango(x.desde, x.hasta);
      const texto = el('div', { class: 'xref-texto tenue' }, '…');
      lista.append(el('li', {},
        el('div', { class: 'xref-cab' },
          el('a', { class: 'ref', href: `#/leer/${aClave(r)}`, dataset: { ref: aClave(r) } }, formatearRango(x.desde, x.hasta, { abreviado: true })),
          el('span', { class: 'votos', title: `${x.votos} votos`, style: { '--v': `${Math.max(8, (x.votos / maxVotos) * 100)}%` } })),
        texto));
      textoRango(almacen.ajustes.principal, x.desde, Math.min(x.hasta, x.desde + 3)).then((versos) => {
        texto.classList.remove('tenue');
        render(texto, versos.map((v) => `${v.texto} `), x.hasta > x.desde + 3 ? '…' : '');
      }).catch(() => render(texto, ''));
    }
    const restantes = visibles.length - mostradas;
    const ocultas = todas.length - visibles.length;
    if (restantes > 0) {
      lista.append(el('li', { class: 'mas' }, el('button', { class: 'btn chico', onClick: () => agregar(20) }, `Mostrar ${Math.min(20, restantes)} más (${restantes})`)));
    } else if (ocultas > 0) {
      lista.append(el('li', { class: 'mas' }, el('button', {
        class: 'btn chico', onClick: () => { visibles = todas; agregar(20); },
      }, `Ver ${ocultas} con menos votos`)));
    }
  };
  agregar(12);
}

function tarjetaNota(n) {
  return el('article', { class: 'tarjeta-nota' },
    el('div', { class: 'tarjeta-cab' },
      el('strong', {}, n.titulo || (n.desde ? formatearRango(n.desde, n.hasta || n.desde) : 'Apunte')),
      el('button', { class: 'btn chico', onClick: () => editarNota(n).then(repintar) }, 'Editar')),
    el('div', { class: 'nota-html', html: notaAHtml(n.cuerpo) }),
    n.etiquetas?.length ? el('div', { class: 'chips' }, n.etiquetas.map((e) => el('a', { class: 'chip', href: `#/cuaderno/notas?etiqueta=${encodeURIComponent(e)}` }, `#${e}`))) : null);
}

function pintarPanelCapitulo() {
  const { b, c } = est;
  const desde = idVerso(b, c, 1), hasta = idVerso(b, c, 999);
  const notas = notasEn(almacen.estado.notas, desde, hasta);
  const principal = almacen.ajustes.principal;
  const marcas = almacen.estado.marcas.filter((m) => m.desde.id <= hasta && m.hasta.id >= desde)
    .sort((x, y) => x.desde.id - y.desde.id || (x.desde.o || 0) - (y.desde.o || 0));
  const L = libro(b);
  let leidos = 0;
  for (let k = 1; k <= L.capitulos; k++) if (almacen.leido(b, k)) leidos++;

  render(est.panel,
    el('div', { class: 'panel-cab' },
      el('div', {},
        el('div', { class: 'panel-sub' }, 'Guía del capítulo'),
        el('h2', {}, `${L.nombre} ${c}`))),
    el('p', { class: 'tenue small' }, 'Toca un versículo para ver sus referencias cruzadas y otras versiones. Selecciona palabras para resaltarlas, subrayarlas o anotarlas.'),
    el('div', { class: 'panel-acciones' },
      el('button', { class: 'btn chico primario', onClick: () => editarNota({ desde, hasta }).then(repintar) }, '✎ Nota del capítulo')),
    bloque(`Notas del capítulo${notas.length ? ` (${notas.length})` : ''}`, notas.length ? notas.map(tarjetaNota) : el('p', { class: 'tenue small' }, 'Sin notas todavía.')),
    bloque(`Resaltados${marcas.length ? ` (${marcas.length})` : ''}`, marcas.length
      ? el('ul', { class: 'lista-marcas' }, marcas.map((m) => el('li', {},
        muestraDe(m),
        el('a', { href: `#/leer/${aClave(refDesdeRango(m.desde.id, m.hasta.id))}` }, formatearRango(m.desde.id, m.hasta.id, { abreviado: true })),
        ' ',
        el('span', { class: 'tenue' }, recortar(textoDeMarca(m, (id) => textoSiCargado(m.version, id)) || '', 90)),
        m.version !== principal ? el('span', { class: 'etiqueta-version' }, version(m.version)?.abrev) : null,
        el('button', { class: 'btn icono chico', title: 'Quitar', onClick: () => { almacen.quitarMarca(m.id); repintar(); } }, '✕'))))
      : el('p', { class: 'tenue small' }, 'Selecciona texto para resaltarlo.')),
    bloquePalabrasClave(b),
    bloque('Este libro', el('div', { class: 'datos-libro' },
      el('div', {}, el('strong', {}, L.capitulos), ' capítulos'),
      el('div', {}, el('strong', {}, versiculosEn(b, c)), ' versículos en este capítulo'),
      el('div', {}, el('strong', {}, `${leidos}/${L.capitulos}`), ' capítulos leídos'),
      el('div', { class: 'barra-avance' }, el('span', { style: { width: `${(leidos / L.capitulos) * 100}%` } })))));
}

/** Palabras clave que aplican a este libro, con interruptores por juego. */
function bloquePalabrasClave(b) {
  const a = almacen.ajustes;
  const reglas = almacen.estado.claves.filter((k) => !k.alcance || k.alcance === b);
  const lista = juegos(reglas);
  const refrescar = () => { pintarCapitulo(); pintarPanel(); };
  return bloque(`Palabras clave${reglas.length ? ` (${reglas.length})` : ''}`,
    el('div', {},
      reglas.length ? el('label', { class: 'check small' },
        el('input', { type: 'checkbox', checked: a.clavesVisibles, onChange: (e) => { almacen.ajustar({ clavesVisibles: e.target.checked }); refrescar(); } }),
        ' Mostrar palabras clave en el texto') : null,
      lista.length ? el('div', { class: 'chips' }, lista.map((j) => el('button', {
        class: `chip ${a.juegosOcultos.includes(j) ? '' : 'activo'}`, title: 'Encender o apagar este juego de marcado',
        onClick: () => { almacen.alternarJuego(j); refrescar(); },
      }, j))) : null,
      reglas.length ? el('ul', { class: 'lista-claves' }, reglas.map((k) => {
        const { clase, vars, simbolo } = estiloSegmento(segmentoDeMarca(k));
        return el('li', { class: a.juegosOcultos.includes(k.juego) || !k.activa ? 'apagada' : '' },
          el('span', { class: clase, style: vars, dataset: simbolo ? { sim: simbolo } : {} }, k.palabra),
          el('span', { class: 'tenue small' }, k.alcance ? ` · ${libro(k.alcance).abrev}` : ' · toda la Biblia', k.juego ? ` · ${k.juego}` : ''),
          el('button', { class: 'btn icono chico', title: 'Editar', onClick: () => editarClave(k, b).then(refrescar) }, '✎'));
      })) : el('p', { class: 'tenue small' }, 'Selecciona una palabra y pulsa ★ Clave para marcarla en todo el texto (p. ej. cada “pacto” en rojo con ▣).'),
      el('button', { class: 'btn chico', onClick: () => editarClave({ version: a.principal }, b).then(refrescar) }, '+ Palabra clave')));
}

/** Pequeña muestra de cómo se ve una marca ("Ab" con su estilo). */
export function muestraDe(m) {
  const { clase, vars, simbolo } = estiloSegmento(segmentoDeMarca(m));
  return el('span', { class: `${clase} muestra-marca`, style: vars, dataset: simbolo ? { sim: simbolo } : {}, title: estiloDe(m.estilo).nombre }, 'Ab');
}

const recortar = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
