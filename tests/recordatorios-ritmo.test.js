/**
 * recordatorios-ritmo.test.js — El ritmo de las metas.
 *
 * El porcentaje dice dónde vas. Lo que decide si una meta se cumple es otra
 * cosa: cuándo la tocaste por última vez y dónde acabas si sigues igual.
 */

import assert from 'node:assert/strict';
import {
  avancesDe, objetivoNuevo, paradas, ritmo, serieDeAvance, sumarAvance,
} from '../recordatorios/src/objetivos.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

const HOY = '2026-05-01';
const libros = (campos = {}) => objetivoNuevo({
  id: 'libros', que: 'Leer 24 libros', tipo: 'numero', meta: 24, unidad: 'libros',
  desde: '2026-01-01', hasta: '2026-12-31', ...campos,
});

/* ---------------- el apunte con fecha ---------------- */

t('cada suma queda apuntada con su fecha', () => {
  let o = sumarAvance(libros(), 2, '2026-03-01');
  assert.equal(o.actual, 2);
  assert.deepEqual(o.avances, [{ fecha: '2026-03-01', delta: 2 }]);
});

t('varias sumas el mismo día son una sola línea', () => {
  let o = sumarAvance(libros(), 1, '2026-03-01');
  o = sumarAvance(o, 1, '2026-03-01');
  o = sumarAvance(o, 3, '2026-04-10');
  assert.equal(o.actual, 5);
  assert.deepEqual(o.avances, [{ fecha: '2026-03-01', delta: 2 }, { fecha: '2026-04-10', delta: 3 }]);
});

t('restar hasta cero deja el apunte del día en cero y se borra', () => {
  let o = sumarAvance(libros(), 2, '2026-03-01');
  o = sumarAvance(o, -2, '2026-03-01');
  assert.equal(o.actual, 0);
  assert.deepEqual(o.avances, []);
});

t('no se puede bajar de cero ni inventar avance', () => {
  const o = sumarAvance(libros(), -5, '2026-03-01');
  assert.equal(o.actual, 0);
});

t('las metas de sí o no también apuntan cuándo se hicieron', () => {
  const o = sumarAvance(objetivoNuevo({ que: 'Sacar el pasaporte', tipo: 'siNo' }), 1, '2026-03-01');
  assert.equal(o.hecho, true);
  assert.equal(o.avances.at(-1).fecha, '2026-03-01');
});

/* ---------------- el ritmo ---------------- */

t('dice cuándo fue la última vez, en días', () => {
  let o = sumarAvance(libros(), 4, '2026-03-01');
  o = sumarAvance(o, 2, '2026-04-27');
  const r = ritmo(o, {}, HOY);
  assert.equal(r.ultima, '2026-04-27');
  assert.equal(r.diasSinTocar, 4);
  assert.match(r.frase, /hace 4 días/);
});

t('hoy y ayer se dicen con palabras, no con números', () => {
  assert.match(ritmo(sumarAvance(libros(), 1, HOY), {}, HOY).frase, /hoy/);
  assert.match(ritmo(sumarAvance(libros(), 1, '2026-04-30'), {}, HOY).frase, /ayer/);
});

t('una meta recién escrita no finge tener ritmo', () => {
  const r = ritmo(libros(), {}, HOY);
  assert.equal(r.ultima, null);
  assert.equal(r.diasSinTocar, null);
  assert.match(r.frase, /Sin avances/);
});

t('proyecta dónde acabas si sigues al mismo ritmo', () => {
  let o = sumarAvance(libros(), 6, '2026-04-10');        // 6 en 4 meses
  const r = ritmo(o, {}, HOY);
  assert.ok(r.proyeccion < 24, 'a ese ritmo no llega');
  assert.match(r.fraseProyeccion, /te quedas en \d+ de 24/);
  assert.ok(r.porSemana > 0);
});

t('si el ritmo alcanza, lo dice sin prometer de más', () => {
  let o = sumarAvance(libros(), 12, '2026-04-10');       // 12 en 4 meses: llega
  const r = ritmo(o, {}, HOY);
  assert.equal(r.proyeccion, 24);                        // nunca por encima de la meta
  assert.match(r.fraseProyeccion, /llegas a 24 libros/);
});

t('una meta cumplida deja de dar consejos de ritmo', () => {
  let o = sumarAvance(libros(), 24, '2026-04-10');
  const r = ritmo(o, {}, HOY);
  assert.equal(r.fraseProyeccion, '');
  assert.equal(r.parada, false);
  assert.match(r.frase, /Cumplida/);
});

t('sin fecha de fin no se proyecta nada', () => {
  const o = sumarAvance(libros({ hasta: null }), 3, '2026-04-10');
  const r = ritmo(o, {}, HOY);
  assert.equal(r.proyeccion, null);
  assert.equal(r.fechaLlegada, null);
  assert.equal(r.parada, false);
});

t('la fecha de llegada sale de lo que falta y lo que rindes', () => {
  let o = sumarAvance(libros({ meta: 10 }), 5, '2026-04-10');   // 5 en 120 días
  const r = ritmo(o, {}, HOY);
  assert.ok(r.fechaLlegada > HOY);
});

/* ---------------- las paradas ---------------- */

t('tres semanas sin tocarla y con plazo abierto es una meta parada', () => {
  const quieta = sumarAvance(libros(), 3, '2026-04-01');        // 30 días
  const viva = sumarAvance(libros({ id: 'viva' }), 3, '2026-04-28');
  const quietas = paradas([quieta, viva], {}, HOY);
  assert.equal(quietas.length, 1);
  assert.equal(quietas[0].objetivo.id, 'libros');
  assert.equal(quietas[0].ritmo.parada, true);
});

t('una meta con el plazo ya vencido no se cuenta como parada: se cierra o se replantea', () => {
  const vieja = sumarAvance(libros({ hasta: '2026-03-31' }), 3, '2026-02-01');
  assert.deepEqual(paradas([vieja], {}, HOY), []);
});

t('la cumplida y la abandonada no aparecen entre las paradas', () => {
  const hecha = sumarAvance(libros({ meta: 3 }), 3, '2026-01-05');
  const dejada = sumarAvance(libros({ id: 'x', abandonadoEn: '2026-02-01' }), 1, '2026-01-05');
  assert.deepEqual(paradas([hecha, dejada], {}, HOY), []);
});

/* ---------------- metas que cuentan tareas ---------------- */

const DATOS = {
  tareas: [],
  historial: [
    { tareaId: 't1', proyecto: 'Circuitos', fecha: '2026-04-20' },
    { tareaId: 't2', proyecto: 'Circuitos', fecha: '2026-04-28' },
    { tareaId: 't3', proyecto: 'Otro', fecha: '2026-04-29' },
  ],
};

t('una meta de tareas saca sus avances del historial, no de un apunte a mano', () => {
  const o = objetivoNuevo({
    que: 'Cerrar Circuitos', tipo: 'tareas', proyecto: 'Circuitos', meta: 10,
    desde: '2026-01-01', hasta: '2026-12-31',
  });
  assert.equal(avancesDe(o, DATOS).length, 2);
  const r = ritmo(o, DATOS, HOY);
  assert.equal(r.ultima, '2026-04-28');
  assert.equal(r.diasSinTocar, 3);
});

/* ---------------- la tira de los 30 días ---------------- */

t('la serie tiene un día por casilla y suma lo del día', () => {
  let o = sumarAvance(libros(), 2, '2026-04-29');
  o = sumarAvance(o, 1, '2026-04-29');
  const s = serieDeAvance(o, {}, HOY, 5);
  assert.equal(s.length, 5);
  assert.equal(s.at(-1).fecha, HOY);
  assert.equal(s.find((d) => d.fecha === '2026-04-29').valor, 3);
  assert.equal(s.at(-1).valor, 0);
});

t('lo de antes de la ventana no se cuela en la tira', () => {
  const o = sumarAvance(libros(), 9, '2026-01-01');
  assert.equal(serieDeAvance(o, {}, HOY, 5).reduce((a, d) => a + d.valor, 0), 0);
});

console.log(`\n${passed} pruebas de ritmo de metas OK`);
