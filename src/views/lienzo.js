/**
 * lienzo.js — Capa de dibujo sobre la hoja de acordes.
 *
 * Se monta encima de la hoja sin estorbarla: mientras no estés anotando, los
 * acordes siguen siendo clicables. Al activar el lápiz, la capa captura el
 * trazo, lo ancla a la sección sobre la que dibujaste y lo guarda.
 */

import { el } from '../ui.js';
import { store } from '../store.js';
import { crearTrazo, pathDeTrazo, borrarEn, estiloDeTrazo, HERRAMIENTAS, COLORES } from '../anotaciones.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, atributos = {}) => {
  const nodo = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, v);
  return nodo;
};

/**
 * @param {HTMLElement} hoja  contenedor de la hoja
 * @param {{songId:string, perfil:string, onCambio?:Function}} opciones
 */
export function montarLienzo(hoja, { songId, perfil = 'Mis notas', onCambio = null } = {}) {
  let trazos = store.anotacionesDe(songId, perfil);
  let herramienta = 'lapiz';
  let color = 'ambar';
  let activo = false;
  let visible = true;
  let soloLapiz = false;
  let dibujando = null;
  const historial = [];

  hoja.classList.add('con-lienzo');
  const svg = svgEl('svg', { class: 'lienzo' });
  const capaViva = svgEl('path', { class: 'trazo-vivo', fill: 'none' });
  hoja.append(svg);

  // --- Geometría: cada trazo vive dentro de su sección ---
  const secciones = () => [...hoja.querySelectorAll('.sheet-section')];

  const cajaDe = (indice) => {
    if (indice === -1) return { x: 0, y: 0, ancho: hoja.scrollWidth, alto: hoja.scrollHeight };
    const nodo = secciones()[indice];
    if (!nodo) return null;
    const base = hoja.getBoundingClientRect();
    const caja = nodo.getBoundingClientRect();
    return {
      x: caja.left - base.left + hoja.scrollLeft,
      y: caja.top - base.top + hoja.scrollTop,
      ancho: caja.width,
      alto: caja.height,
    };
  };

  /** Punto del puntero -> coordenadas dentro de la hoja (con scroll incluido). */
  const puntoEnHoja = (e) => {
    const base = hoja.getBoundingClientRect();
    return { x: e.clientX - base.left + hoja.scrollLeft, y: e.clientY - base.top + hoja.scrollTop };
  };

  /** Sección que hay debajo de un punto; -1 si el trazo cae fuera de todas. */
  const seccionEn = (punto) => {
    const lista = secciones();
    for (let i = 0; i < lista.length; i++) {
      const caja = cajaDe(i);
      if (!caja) continue;
      if (punto.x >= caja.x && punto.x <= caja.x + caja.ancho
        && punto.y >= caja.y && punto.y <= caja.y + caja.alto) return i;
    }
    return -1;
  };

  const normalizar = (punto, caja) => [
    caja.ancho ? (punto.x - caja.x) / caja.ancho : 0,
    caja.alto ? (punto.y - caja.y) / caja.alto : 0,
  ];

  // --- Pintado ---
  const redibujar = () => {
    svg.replaceChildren();
    svg.setAttribute('width', hoja.scrollWidth);
    svg.setAttribute('height', hoja.scrollHeight);
    svg.setAttribute('viewBox', `0 0 ${hoja.scrollWidth} ${hoja.scrollHeight}`);
    svg.style.display = visible ? '' : 'none';
    if (!visible) return;

    // El resaltador va debajo del lápiz para no tapar lo escrito.
    const orden = [...trazos].sort((a, b) => (b.h === 'marcador' ? 0 : 1) - (a.h === 'marcador' ? 0 : 1));
    for (const trazo of orden) {
      const caja = cajaDe(trazo.s ?? -1);
      if (!caja) continue;
      const estilo = estiloDeTrazo(trazo);
      const grupo = svgEl('g', { transform: `translate(${caja.x} ${caja.y})` });
      grupo.append(svgEl('path', {
        d: pathDeTrazo(trazo, caja),
        fill: 'none',
        stroke: estilo.color,
        'stroke-width': estilo.ancho,
        'stroke-opacity': estilo.opacidad,
        'stroke-linecap': estilo.remate,
        'stroke-linejoin': 'round',
      }));
      svg.append(grupo);
    }
    svg.append(capaViva);
  };

  const guardar = () => {
    store.guardarAnotaciones(songId, perfil, trazos);
    onCambio?.(trazos);
  };

  const recordar = () => {
    historial.push(JSON.stringify(trazos));
    if (historial.length > 30) historial.shift();
  };

  // --- Dibujo ---
  const borrarBajo = (punto, seccion, caja) => {
    const normal = normalizar(punto, caja);
    // Radio en píxeles: el borrador debe perdonar lo mismo en horizontal que en vertical.
    const resultado = borrarEn(trazos, normal, { seccion, radio: 16, caja });
    if (resultado.borrados) {
      trazos = resultado.trazos;
      redibujar();
    }
  };

  const alBajar = (e) => {
    if (!activo) return;
    if (e.pointerType === 'pen' && !soloLapiz) { soloLapiz = true; api.onModo?.(); }
    if (soloLapiz && e.pointerType === 'touch') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { svg.setPointerCapture(e.pointerId); } catch { /* algunos navegadores no lo permiten */ }
    const punto = puntoEnHoja(e);
    const seccion = seccionEn(punto);
    const caja = cajaDe(seccion) || cajaDe(-1);

    if (herramienta === 'borrador') {
      recordar();
      dibujando = { borrando: true };
      borrarBajo(punto, seccion, caja);
      return;
    }
    dibujando = { seccion, caja, puntos: [normalizar(punto, caja)] };
    const estilo = estiloDeTrazo({ h: herramienta, c: color });
    capaViva.setAttribute('stroke', estilo.color);
    capaViva.setAttribute('stroke-width', estilo.ancho);
    capaViva.setAttribute('stroke-opacity', estilo.opacidad);
    capaViva.setAttribute('stroke-linecap', estilo.remate);
    capaViva.setAttribute('stroke-linejoin', 'round');
    capaViva.setAttribute('transform', `translate(${caja.x} ${caja.y})`);
  };

  const alMover = (e) => {
    if (!dibujando) return;
    e.preventDefault();
    const punto = puntoEnHoja(e);
    if (dibujando.borrando) {
      const seccion = seccionEn(punto);
      borrarBajo(punto, seccion, cajaDe(seccion) || cajaDe(-1));
      return;
    }
    dibujando.puntos.push(normalizar(punto, dibujando.caja));
    capaViva.setAttribute('d', pathDeTrazo({ p: dibujando.puntos }, dibujando.caja));
  };

  const alSoltar = (e) => {
    if (!dibujando) return;
    try { svg.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
    if (dibujando.borrando) {
      dibujando = null;
      guardar();
      return;
    }
    if (dibujando.puntos.length) {
      recordar();
      trazos = [...trazos, crearTrazo({
        herramienta, color, seccion: dibujando.seccion, puntos: dibujando.puntos,
      })];
      guardar();
    }
    dibujando = null;
    capaViva.removeAttribute('d');
    redibujar();
  };

  svg.addEventListener('pointerdown', alBajar);
  svg.addEventListener('pointermove', alMover);
  svg.addEventListener('pointerup', alSoltar);
  svg.addEventListener('pointercancel', alSoltar);

  const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => redibujar()) : null;
  observador?.observe(hoja);

  const api = {
    get trazos() { return trazos; },
    get activo() { return activo; },
    get visible() { return visible; },
    get soloLapiz() { return soloLapiz; },
    get perfil() { return perfil; },
    herramienta: () => herramienta,
    color: () => color,
    onModo: null,

    setActivo(v) {
      activo = v;
      hoja.classList.toggle('anotando', v);
      svg.classList.toggle('activo', v);
      if (v) visible = true;
      redibujar();
    },
    setHerramienta(h) {
      if (HERRAMIENTAS.some((x) => x.id === h)) herramienta = h;
      svg.classList.toggle('borrando', herramienta === 'borrador');
    },
    setColor(c) { if (COLORES.some((x) => x.id === c)) color = c; },
    setSoloLapiz(v) { soloLapiz = v; },
    setVisible(v) { visible = v; redibujar(); },
    setPerfil(nuevo) {
      perfil = nuevo;
      trazos = store.anotacionesDe(songId, perfil);
      historial.length = 0;
      redibujar();
    },
    deshacer() {
      const anterior = historial.pop();
      if (anterior == null) return false;
      trazos = JSON.parse(anterior);
      guardar();
      redibujar();
      return true;
    },
    limpiar() {
      if (!trazos.length) return false;
      recordar();
      trazos = [];
      guardar();
      redibujar();
      return true;
    },
    /** La hoja se redibuja al transponer o cambiar el tamaño: hay que volver a colgar la capa. */
    reanclar() {
      if (!hoja.contains(svg)) {
        hoja.classList.add('con-lienzo');
        hoja.classList.toggle('anotando', activo);
        hoja.append(svg);
      }
      redibujar();
    },
    redibujar,
    destruir() {
      observador?.disconnect();
      svg.remove();
      hoja.classList.remove('con-lienzo', 'anotando');
    },
  };

  redibujar();
  return api;
}

/** Barra de herramientas reutilizable (hoja de canción y modo atril). */
export function barraLienzo(lienzo, { compacta = false, onPerfil = null, perfiles = [] } = {}) {
  const barra = el('div', { class: `lienzo-barra${compacta ? ' compacta' : ''}` });

  const pintar = () => {
    barra.replaceChildren(
      el('button', {
        class: `btn ${lienzo.activo ? 'ok' : ''}`, type: 'button',
        title: 'Dibujar sobre la hoja',
        onClick: () => { lienzo.setActivo(!lienzo.activo); pintar(); },
      }, lienzo.activo ? '✎ Anotando' : '✎ Anotar'),

      ...(lienzo.activo ? [
        el('div', { class: 'row' },
          ...HERRAMIENTAS.map((h) => el('button', {
            class: `btn chip ${lienzo.herramienta() === h.id ? 'ok' : ''}`, type: 'button',
            title: h.nombre, dataset: { herramienta: h.id },
            onClick: () => { lienzo.setHerramienta(h.id); pintar(); },
          }, h.id === 'lapiz' ? '✏️' : h.id === 'marcador' ? '🖍' : '🧽'))),
        el('div', { class: 'row colores' },
          ...COLORES.map((c) => el('button', {
            class: `color-punto ${lienzo.color() === c.id ? 'activo' : ''}`, type: 'button',
            title: c.nombre, dataset: { color: c.id },
            style: `--punto:${c.valor}`,
            onClick: () => { lienzo.setColor(c.id); pintar(); },
          }))),
        el('button', { class: 'btn', type: 'button', title: 'Deshacer', onClick: () => lienzo.deshacer() }, '↶'),
        el('button', {
          class: `btn ${lienzo.soloLapiz ? 'ok' : ''}`, type: 'button',
          title: 'Aceptar solo el lápiz e ignorar los dedos (evita marcas con la palma)',
          onClick: () => { lienzo.setSoloLapiz(!lienzo.soloLapiz); pintar(); },
        }, '✋'),
      ] : []),

      el('button', {
        class: 'btn ghost', type: 'button', title: 'Mostrar u ocultar las marcas',
        onClick: () => { lienzo.setVisible(!lienzo.visible); pintar(); },
      }, lienzo.visible ? '👁' : '🚫'),

      ...(compacta ? [] : [
        el('button', {
          class: 'btn ghost danger', type: 'button', title: 'Borrar todas mis marcas de esta canción',
          onClick: () => {
            if (window.confirm('¿Borrar todas tus marcas de esta canción?')) { lienzo.limpiar(); pintar(); }
          },
        }, '🗑'),
        onPerfil
          ? el('select', {
              class: 'input auto', title: 'Cada músico tiene sus propias marcas',
              onChange: (e) => {
                if (e.target.value === '__nuevo__') {
                  const nombre = window.prompt('Nombre del perfil (por ejemplo: "Juan — guitarra")');
                  if (nombre) onPerfil(nombre.trim());
                  pintar();
                  return;
                }
                onPerfil(e.target.value);
                pintar();
              },
            },
            ...perfiles.map((p) => el('option', { value: p, selected: p === lienzo.perfil }, p)),
            el('option', { value: '__nuevo__' }, '+ Nuevo perfil…'))
          : null,
      ]),
    );
  };

  lienzo.onModo = pintar;
  pintar();
  return { nodo: barra, pintar };
}
