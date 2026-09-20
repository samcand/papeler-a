/**
 * index.js — Junta los bancos de todas las asignaturas en una sola lista.
 *
 * La asignatura no se repite en cada pregunta: se añade aquí, al agrupar. Así
 * una pregunta nunca puede quedar con la asignatura equivocada.
 */

import { MATEMATICAS } from './matematicas.js';
import { TRIGONOMETRIA } from './trigonometria.js';
import { ABSTRACTO } from './abstracto.js';
import { GEOGRAFIA } from './geografia.js';
import { CIUDADANIA } from './ciudadania.js';
import { SALUD } from './salud.js';
import { FISICA } from './fisica.js';
import { QUIMICA } from './quimica.js';
import { HISTORIA } from './historia.js';
import { COTIDIANA } from './cotidiana.js';
import { LECTURA, LECTURAS } from './lectura.js';
import { INGLES, LECTURAS_EN } from './ingles.js';
import { LENGUA } from './lengua.js';
import { LITERATURA } from './literatura.js';
import { FILOSOFIA } from './filosofia.js';
import { UNIVERSAL } from './universal.js';
import { ECONOMIA } from './economia.js';

const POR_ASIGNATURA = {
  matematicas: MATEMATICAS,
  trigonometria: TRIGONOMETRIA,
  abstracto: ABSTRACTO,
  geografia: GEOGRAFIA,
  ciudadania: CIUDADANIA,
  salud: SALUD,
  fisica: FISICA,
  quimica: QUIMICA,
  historia: HISTORIA,
  cotidiana: COTIDIANA,
  lectura: LECTURA,
  ingles: INGLES,
  lengua: LENGUA,
  literatura: LITERATURA,
  filosofia: FILOSOFIA,
  universal: UNIVERSAL,
  economia: ECONOMIA,
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
