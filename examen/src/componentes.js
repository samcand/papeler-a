/**
 * componentes.js — Las piezas que comparten práctica, simulacro y revisión.
 *
 * Una pregunta puede traer un texto de lectura, un bloque de texto monoespaciado
 * (los desarrollos de cubos), figuras en el enunciado y figuras en las opciones.
 * Todo eso se arma aquí una sola vez.
 */

import { el } from './ui.js';
import { nodoFigura } from './figuras.js';
import { nodoGrafico } from './graficos.js';
import { texto } from './banco/index.js';
import { nombreAsignatura, nombreTema, NIVELES } from './temario.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Básico verde, intermedio neutro, avanzado ámbar, experto rojo. */
const CLASE_NIVEL = { 1: 'ok', 2: '', 3: 'media', 4: 'mal' };

export function etiquetasPregunta(pregunta) {
  return el('div', { class: 'fila pequeno suave' },
    el('span', { class: 'etiqueta' }, nombreAsignatura(pregunta.asignatura)),
    el('span', { class: 'etiqueta' }, nombreTema(pregunta.asignatura, pregunta.tema)),
    el('span', { class: 'etiqueta ' + CLASE_NIVEL[pregunta.dificultad] }, NIVELES[pregunta.dificultad] || 'Intermedio'),
    pregunta.propia && el('span', { class: 'etiqueta' }, 'tuya'));
}

/** El texto de lectura, si la pregunta depende de uno. */
export function nodoLectura(pregunta) {
  if (!pregunta.lectura) return null;
  const t = texto(pregunta.lectura);
  if (!t) return null;
  return el('div', { class: 'lectura' },
    el('h4', {}, t.titulo),
    t.parrafos.map((p) => el('p', {}, p)));
}

export function nodoEnunciado(pregunta) {
  const partes = [];
  const lectura = nodoLectura(pregunta);
  if (lectura) partes.push(lectura);
  if (pregunta.grafico) partes.push(nodoGrafico(pregunta.grafico));
  partes.push(el('p', { class: 'pregunta' }, pregunta.enunciado));
  if (pregunta.codigo) partes.push(el('pre', { class: 'bloque' }, pregunta.codigo));
  if (pregunta.figuras?.enunciado?.length) {
    const fila = el('div', { class: 'figuras-fila' },
      pregunta.figuras.enunciado.map((spec) => nodoFigura(spec)));
    if (pregunta.figuras.disposicion === 'matriz3') {
      fila.style.display = 'grid';
      fila.style.gridTemplateColumns = 'repeat(3, 92px)';
      fila.style.justifyContent = 'start';
    }
    partes.push(fila);
  }
  return partes;
}

/**
 * Las opciones. `estado` decide qué se ve:
 *   { elegida, correcta, revelar }  ->  revelar pinta la correcta y la fallada.
 */
export function nodoOpciones(pregunta, { elegida = null, revelar = false, alElegir } = {}) {
  const conFiguras = !!pregunta.figuras?.opciones?.length;
  const lista = el('div', { class: 'opciones' + (conFiguras ? ' figuras' : '') });
  pregunta.opciones.forEach((opcion, i) => {
    const esCorrecta = i === pregunta.correcta;
    const clases = ['opcion'];
    if (revelar && esCorrecta) clases.push('correcta');
    if (revelar && elegida === i && !esCorrecta) clases.push('incorrecta');
    const boton = el('button', {
      class: clases.join(' '),
      type: 'button',
      'aria-pressed': elegida === i ? 'true' : 'false',
      'aria-label': conFiguras ? `Opción ${LETRAS[i]}: ${opcion}` : null,
      disabled: revelar && !alElegir ? true : false,
      onClick: () => alElegir?.(i),
    },
      el('span', { class: 'letra' }, LETRAS[i]),
      conFiguras ? nodoFigura(pregunta.figuras.opciones[i]) : el('span', { class: 'crece' }, opcion));
    lista.append(boton);
  });
  return lista;
}

export function nodoExplicacion(pregunta, acerto) {
  return el('div', { class: 'explicacion ' + (acerto ? 'ok' : 'mal') },
    el('b', {}, acerto ? 'Correcto' : `Respuesta correcta: ${LETRAS[pregunta.correcta]}`),
    pregunta.explicacion);
}

export function nodoPista(pregunta) {
  if (!pregunta.pista) return null;
  const cuerpo = el('div', { class: 'explicacion', hidden: true }, pregunta.pista);
  const boton = el('button', {
    type: 'button',
    onClick: () => { cuerpo.hidden = !cuerpo.hidden; boton.textContent = cuerpo.hidden ? 'Ver pista' : 'Ocultar pista'; },
  }, 'Ver pista');
  return el('div', {}, boton, cuerpo);
}

/** Cuadrícula de números para saltar de pregunta en el simulacro. */
export function nodoPuntos(total, { actual, estado, alIr }) {
  const host = el('div', { class: 'puntos' });
  for (let i = 0; i < total; i++) {
    const clases = ['punto', estado(i)].filter(Boolean);
    if (i === actual) clases.push('actual');
    host.append(el('button', {
      class: clases.join(' '), type: 'button', title: `Pregunta ${i + 1}`,
      onClick: () => alIr(i),
    }, i + 1));
  }
  return host;
}

export { LETRAS };
