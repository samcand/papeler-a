import assert from 'node:assert/strict';
import { COLUMNAS, alSoltar, columnaDe, finDeLaSemana, tablero, trabajoEnCurso } from '../recordatorios/src/tablero.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';   // miércoles

const TAREAS = [
  crearTarea({ id: 'b', titulo: 'Idea suelta' }),
  crearTarea({ id: 'd', titulo: 'Sin fecha pero con proyecto', proyecto: 'Cartera' }),
  crearTarea({ id: 'h', titulo: 'De hoy', fecha: HOY }),
  crearTarea({ id: 'v', titulo: 'Atrasada', fecha: '2026-09-20' }),
  crearTarea({ id: 's', titulo: 'El viernes', fecha: '2026-09-25' }),
  crearTarea({ id: 'p', titulo: 'El mes que viene', fecha: '2026-10-20' }),
  crearTarea({ id: 'c', titulo: 'Hecha ayer', completada: true, completadaEn: '2026-09-22T10:00:00.000Z' }),
  crearTarea({ id: 'x', titulo: 'Hecha hace un mes', completada: true, completadaEn: '2026-08-10T10:00:00.000Z' }),
  crearTarea({ id: 'sub', titulo: 'Subtarea', padre: 'h', fecha: HOY }),
];

t('cada tarea cae en su columna por la fecha, sin campos nuevos', () => {
  assert.equal(columnaDe(TAREAS[0], HOY), 'bandeja');
  assert.equal(columnaDe(TAREAS[1], HOY), 'despues');   // sin fecha pero ya clasificada
  assert.equal(columnaDe(TAREAS[2], HOY), 'hoy');
  assert.equal(columnaDe(TAREAS[3], HOY), 'hoy');       // lo atrasado es de hoy
  assert.equal(columnaDe(TAREAS[4], HOY), 'semana');
  assert.equal(columnaDe(TAREAS[5], HOY), 'despues');
  assert.equal(columnaDe(TAREAS[6], HOY), 'hechas');
  assert.equal(columnaDe(TAREAS[7], HOY), null);        // hecha hace mucho: fuera del tablero
});

t('en domingo, "esta semana" mira a la semana que viene', () => {
  const DOMINGO = '2026-09-20';
  assert.equal(finDeLaSemana(DOMINGO), '2026-09-27');       // no al domingo de hoy
  assert.equal(finDeLaSemana('2026-09-23'), '2026-09-27');  // un miércoles, el domingo normal
  assert.equal(columnaDe(crearTarea({ fecha: '2026-09-23' }), DOMINGO), 'semana');
  assert.equal(columnaDe(crearTarea({ fecha: '2026-09-28' }), DOMINGO), 'despues');
  assert.equal(alSoltar(crearTarea({ fecha: null }), 'semana', DOMINGO).fecha, '2026-09-25');
});

t('el tablero reparte y suma los minutos de cada columna', () => {
  const t1 = tablero([...TAREAS, crearTarea({ titulo: 'Larga', fecha: HOY, duracion: 120 })], HOY);
  assert.equal(t1.length, COLUMNAS.length);
  const hoy = t1.find((c) => c.id === 'hoy');
  assert.equal(hoy.tareas.length, 3);                   // de hoy, atrasada y larga (la subtarea no)
  assert.equal(hoy.minutos, 120);
  assert.equal(t1.find((c) => c.id === 'bandeja').tareas.length, 1);
  assert.equal(t1.find((c) => c.id === 'hechas').tareas.length, 1);
});

t('el tablero se puede acotar a un módulo o proyecto', () => {
  const soloCartera = tablero(TAREAS, HOY, { proyecto: 'Cartera' });
  assert.equal(soloCartera.reduce((s, c) => s + c.tareas.length, 0), 1);
});

t('soltar una tarjeta en otra columna cambia la fecha', () => {
  assert.deepEqual(alSoltar(TAREAS[0], 'hoy', HOY), { fecha: HOY });
  assert.equal(alSoltar(TAREAS[2], 'semana', HOY).fecha, '2026-09-25');   // viernes de esta semana
  assert.equal(alSoltar(TAREAS[2], 'despues', HOY).fecha, '2026-09-28');  // el lunes que viene
  assert.deepEqual(alSoltar(TAREAS[2], 'bandeja', HOY), { fecha: null, proyecto: null, modulo: null });
  assert.deepEqual(alSoltar(TAREAS[2], 'hechas', HOY), { completar: true });
  assert.equal(alSoltar(TAREAS[6], 'hechas', HOY), null);                 // ya estaba hecha
  assert.equal(alSoltar(TAREAS[6], 'hoy', HOY).reabrir, true);
});

t('el trabajo en curso avisa cuando hay demasiado abierto', () => {
  const pocas = trabajoEnCurso(TAREAS, HOY, 5);
  assert.equal(pocas.total, 2);
  assert.equal(pocas.excedido, false);
  assert.match(pocas.frase, /2 de 5 en curso/);

  const muchas = trabajoEnCurso([...TAREAS, ...Array.from({ length: 5 }, (_, i) =>
    crearTarea({ titulo: `Abierta ${i}`, fecha: HOY }))], HOY, 5);
  assert.equal(muchas.total, 7);
  assert.equal(muchas.exceso, 2);
  assert.match(muchas.frase, /Termina 2 antes de empezar otra/);
});

console.log(`\n${passed} pruebas del tablero y el trabajo en curso OK`);
