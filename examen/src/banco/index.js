/**
 * index.js — Junta los cinco bancos en una sola lista.
 *
 * La asignatura no se repite en cada pregunta: se añade aquí, al agrupar. Así
 * una pregunta nunca puede quedar con la asignatura equivocada.
 */

import { MATEMATICAS } from './matematicas.js';
import { TRIGONOMETRIA } from './trigonometria.js';
import { ABSTRACTO } from './abstracto.js';
import { LECTURA, LECTURAS } from './lectura.js';
import { INGLES, LECTURAS_EN } from './ingles.js';

const POR_ASIGNATURA = {
  matematicas: MATEMATICAS,
  trigonometria: TRIGONOMETRIA,
  abstracto: ABSTRACTO,
  lectura: LECTURA,
  ingles: INGLES,
};

export const BANCO = Object.entries(POR_ASIGNATURA)
  .flatMap(([asignatura, preguntas]) => preguntas.map((p) => ({ ...p, asignatura })));

/** Textos de lectura (español e inglés) indexados por id. */
export const TEXTOS = Object.fromEntries([...LECTURAS, ...LECTURAS_EN].map((t) => [t.id, t]));

export function preguntaPorId(id, extras = []) {
  return BANCO.find((p) => p.id === id) || extras.find((p) => p.id === id) || null;
}

export function texto(id) {
  return TEXTOS[id] || null;
}
