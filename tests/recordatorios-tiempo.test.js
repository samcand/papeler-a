import assert from 'node:assert/strict';
import {
  CONFIG_POMODORO, crearCronometro, crearPomodoro, cronoIniciar, cronoPausar, cronoTranscurrido, cronoVuelta,
  formatoMinutos, formatoReloj, iniciar, matrizEisenhower, pausar, planificarDia, progresoFase, restante,
  resumenTiempo, siguienteFase, termino,
} from '../recordatorios/src/tiempo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const T0 = 1_700_000_000_000;
const min = (n) => n * 60000;

t('pomodoro: el tiempo se mide con el reloj, no contando ticks', () => {
  let p = crearPomodoro();
  assert.equal(restante(p, T0), min(25));
  p = iniciar(p, T0);
  assert.equal(restante(p, T0 + min(10)), min(15));
  assert.equal(progresoFase(p, T0 + min(10)).toFixed(1), '0.4');
  // aunque el navegador suspenda la pestaña 20 minutos, la cuenta es correcta
  assert.equal(restante(p, T0 + min(30)), 0);
  assert.equal(termino(p, T0 + min(26)), true);
});

t('pomodoro: pausar conserva lo trabajado y reanudar sigue donde iba', () => {
  let p = iniciar(crearPomodoro(), T0);
  p = pausar(p, T0 + min(10));
  assert.equal(restante(p, T0 + min(60)), min(15)); // en pausa no corre el reloj
  p = iniciar(p, T0 + min(60));
  assert.equal(restante(p, T0 + min(65)), min(10));
});

t('pomodoro: encadena descansos y el largo cada 4 enfoques', () => {
  let p = iniciar(crearPomodoro(), T0);
  let paso = siguienteFase(p, CONFIG_POMODORO, T0 + min(25));
  assert.equal(paso.estado.fase, 'descansoCorto');
  assert.equal(paso.estado.completados, 1);
  assert.equal(paso.registro.minutos, 25);
  assert.equal(paso.estado.corriendo, true); // autoDescanso

  // tres enfoques más hasta el descanso largo
  let estado = paso.estado;
  for (let i = 0; i < 3; i++) {
    estado = iniciar({ ...estado, fase: 'enfoque', duracionMs: min(25), acumuladoMs: 0, corriendo: false }, T0);
    estado = siguienteFase(estado, CONFIG_POMODORO, T0 + min(25)).estado;
  }
  assert.equal(estado.fase, 'descansoLargo');
  assert.equal(estado.completados, 4);
});

t('pomodoro: el descanso no genera registro de trabajo', () => {
  const p = iniciar({ ...crearPomodoro(), fase: 'descansoCorto', duracionMs: min(5) }, T0);
  const paso = siguienteFase(p, CONFIG_POMODORO, T0 + min(5));
  assert.equal(paso.registro, null);
  assert.equal(paso.estado.fase, 'enfoque');
  assert.equal(paso.estado.corriendo, false); // volver al trabajo se decide
});

t('cronómetro con vueltas: total y parcial', () => {
  let c = cronoIniciar(crearCronometro(), T0);
  c = cronoVuelta(c, T0 + min(1));
  c = cronoVuelta(c, T0 + min(3));
  assert.equal(c.vueltas[0].parcial, min(1));
  assert.equal(c.vueltas[1].parcial, min(2));
  assert.equal(c.vueltas[1].total, min(3));
  c = cronoPausar(c, T0 + min(5));
  assert.equal(cronoTranscurrido(c, T0 + min(99)), min(5));
});

t('formato de reloj y de minutos', () => {
  assert.equal(formatoReloj(min(5)), '05:00');
  assert.equal(formatoReloj(305000), '05:05');
  assert.equal(formatoReloj(min(65)), '1:05:00');
  assert.equal(formatoMinutos(95), '1 h 35 min');
  assert.equal(formatoMinutos(120), '2 h');
  assert.equal(formatoMinutos(40), '40 min');
});

t('resumen de tiempo: hoy, semana, racha y reparto por tarea', () => {
  const registros = [
    { tipo: 'pomodoro', tareaId: 'a', minutos: 25, fecha: '2026-09-20' },
    { tipo: 'pomodoro', tareaId: 'a', minutos: 25, fecha: '2026-09-20' },
    { tipo: 'pomodoro', tareaId: 'b', minutos: 25, fecha: '2026-09-19' },
    { tipo: 'pomodoro', tareaId: 'b', minutos: 50, fecha: '2026-09-10' },
  ];
  const r = resumenTiempo(registros, '2026-09-20');
  assert.equal(r.hoy, 50);
  assert.equal(r.pomodorosHoy, 2);
  assert.equal(r.racha, 2);
  assert.equal(r.total, 125);
  assert.equal(r.porTarea[0].tareaId, 'b'); // 75 min
  assert.equal(r.ultimos.length, 14);
});

t('planificar el día: respeta horas fijas, mete descansos y avisa de lo que no cabe', () => {
  const plan = planificarDia([
    { titulo: 'Revisar mercado', duracion: 30 },
    { titulo: 'Reunión', hora: '10:00', duracion: 60 },
    { titulo: 'Escribir paper', duracion: 120 },
    { titulo: 'Preparar clase', duracion: 60 },
  ], { inicio: '09:00', fin: '12:00' });

  assert.equal(plan.bloques[0].desde, '09:00');
  assert.equal(plan.bloques[0].tarea.titulo, 'Revisar mercado');
  const reunion = plan.bloques.find((b) => b.tipo === 'fija');
  assert.equal(reunion.desde, '10:00');
  assert.ok(plan.bloques.some((b) => b.tipo === 'descanso'));
  // La reunión desplaza el resto: dos tareas ya no caben antes de las 12
  assert.equal(plan.fuera, 2);
  assert.deepEqual(plan.bloques.filter((b) => b.tipo === 'nocabe').map((b) => b.tarea.titulo),
    ['Escribir paper', 'Preparar clase']);
});

t('matriz de Eisenhower reparte por urgencia e importancia', () => {
  const m = matrizEisenhower([
    { titulo: 'A', fecha: '2026-09-20', prioridad: 1 },
    { titulo: 'B', fecha: '2026-12-01', prioridad: 2 },
    { titulo: 'C', fecha: '2026-09-21', prioridad: 4 },
    { titulo: 'D', prioridad: 4 },
    { titulo: 'E', completada: true, prioridad: 1, fecha: '2026-09-20' },
  ], '2026-09-20');
  assert.deepEqual(m.hacer.tareas.map((t) => t.titulo), ['A']);
  assert.deepEqual(m.planificar.tareas.map((t) => t.titulo), ['B']);
  assert.deepEqual(m.delegar.tareas.map((t) => t.titulo), ['C']);
  assert.deepEqual(m.soltar.tareas.map((t) => t.titulo), ['D']);
});

console.log(`\n${passed} pruebas de gestión del tiempo OK`);
