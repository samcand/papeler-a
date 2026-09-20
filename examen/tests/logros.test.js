/**
 * logros.test.js — Puntos, rangos y medallas.
 */

import assert from 'node:assert/strict';
import { ASIGNATURAS } from '../src/temario.js';
import { LOGROS, RANGOS, puntosDe, rangoDe, resumen, estadoLogros, logrosNuevos } from '../src/logros.js';

let pasadas = 0;
const t = (nombre, fn) => { fn(); pasadas++; console.log('  ok  ' + nombre); };

const DIA = 86400000;
const AHORA = Date.UTC(2026, 5, 15, 12);

const resp = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({
  qid: 'q' + i, asignatura: 'matematicas', tema: 'aritmetica',
  dificultad: 1, correcta: true, at: AHORA, ms: 1000, modo: 'practica', ...extra,
}));

t('un acierto vale tantos puntos como su nivel y fallar no resta', () => {
  assert.equal(puntosDe({ correcta: true, dificultad: 1 }), 1);
  assert.equal(puntosDe({ correcta: true, dificultad: 4 }), 4);
  assert.equal(puntosDe({ correcta: false, dificultad: 4 }), 0);
});

t('no compensa quedarse en lo fácil para sumar puntos', () => {
  const faciles = resumen({ respuestas: resp(4, { dificultad: 1 }) }, AHORA);
  const dificil = resumen({ respuestas: resp(1, { dificultad: 4 }) }, AHORA);
  assert.equal(faciles.puntos, dificil.puntos, 'cuatro básicas valen lo mismo que una experta');
});

t('los rangos van en orden y el avance no se sale de 0 a 100', () => {
  for (let i = 1; i < RANGOS.length; i++) {
    assert.ok(RANGOS[i].desde > RANGOS[i - 1].desde, 'los umbrales deben subir');
  }
  for (const puntos of [0, 1, 249, 250, 5000, 999999]) {
    const r = rangoDe(puntos);
    assert.ok(r.avance >= 0 && r.avance <= 100, `avance fuera de rango con ${puntos}`);
    assert.ok(puntos >= r.actual.desde);
    if (r.siguiente) assert.ok(puntos < r.siguiente.desde);
  }
  assert.equal(rangoDe(999999).siguiente, null, 'en el último rango no hay siguiente');
});

t('con el estado vacío no hay ninguna medalla', () => {
  const vacio = { respuestas: [], repaso: {}, simulacros: [], escritos: [] };
  assert.deepEqual(estadoLogros(vacio, AHORA).filter((l) => l.logrado), []);
  assert.equal(rangoDe(resumen(vacio, AHORA).puntos).actual, RANGOS[0]);
});

t('la primera pregunta desbloquea la primera medalla', () => {
  const estado = { respuestas: resp(1), repaso: {}, simulacros: [], escritos: [] };
  const nuevos = logrosNuevos(estado, AHORA);
  assert.ok(nuevos.some((l) => l.id === 'primer-paso'));
});

t('una medalla ya apuntada no se vuelve a anunciar', () => {
  const estado = {
    respuestas: resp(1), repaso: {}, simulacros: [], escritos: [],
    logros: { 'primer-paso': AHORA },
  };
  assert.ok(!logrosNuevos(estado, AHORA).some((l) => l.id === 'primer-paso'));
});

t('la racha de siete días no se consigue estudiando un solo día', () => {
  const enUnDia = { respuestas: resp(500), repaso: {}, simulacros: [], escritos: [] };
  const logrados = estadoLogros(enUnDia, AHORA).filter((l) => l.logrado).map((l) => l.id);
  assert.ok(logrados.includes('preguntas-100'), 'el volumen sí se consigue');
  assert.ok(!logrados.includes('racha-7'), 'la constancia no debería poder comprarse con volumen');
});

t('la racha cuenta días seguidos de verdad', () => {
  const respuestas = [];
  for (let d = 6; d >= 0; d--) respuestas.push(...resp(2, { at: AHORA - d * DIA }));
  const r = resumen({ respuestas, repaso: {}, simulacros: [], escritos: [] }, AHORA);
  assert.equal(r.racha, 7);
  assert.equal(r.diasActivos, 7);
});

t('las preguntas dominadas salen de la caja de repaso, no de los aciertos', () => {
  const repaso = { a: { caja: 5 }, b: { caja: 6 }, c: { caja: 2 }, d: { caja: 4 } };
  const r = resumen({ respuestas: [], repaso, simulacros: [], escritos: [] }, AHORA);
  assert.equal(r.dominadas, 2, 'solo cajas 5 y 6');
});

t('la mejor tanda de aciertos seguidos se corta con un fallo', () => {
  const respuestas = [
    ...resp(3), ...resp(1, { correcta: false }), ...resp(5), ...resp(1, { correcta: false }), ...resp(2),
  ];
  const r = resumen({ respuestas, repaso: {}, simulacros: [], escritos: [] }, AHORA);
  assert.equal(r.mejorSeguidas, 5);
});

t('las sesiones diarias y los ensayos largos se cuentan por separado', () => {
  const simulacros = [
    { modelo: 'Diario' }, { modelo: 'Diario' }, { modelo: 'Completo' }, { modelo: 'Corto' },
  ];
  const r = resumen({ respuestas: [], repaso: {}, simulacros, escritos: [] }, AHORA);
  assert.equal(r.sesionesDiarias, 2);
  assert.equal(r.simulacrosLargos, 2);
});

t('toda medalla tiene id único, meta alcanzable y descripción', () => {
  const ids = LOGROS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
  for (const l of LOGROS) {
    assert.ok(l.nombre && l.descripcion && l.icono, l.id);
    assert.ok(Number.isFinite(l.meta) && l.meta > 0, `${l.id}: meta inválida`);
    assert.equal(typeof l.valor, 'function', `${l.id}: falta cómo medirla`);
  }
});

t('la medalla de cobertura apunta al número real de asignaturas', () => {
  const todas = LOGROS.find((l) => l.id === 'todas-asignaturas');
  assert.equal(todas.meta, ASIGNATURAS.length);
});

console.log(`\n${pasadas} pruebas de logros\n`);
