import assert from 'node:assert/strict';
import { calibracion, estimacionCorregida, minutosPorTarea, pistaEstimacion } from '../recordatorios/src/calibracion.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

const TAREAS = [
  crearTarea({ id: 'a', titulo: 'Calificar parciales', duracion: 120, modulo: 'docencia', completada: true }),
  crearTarea({ id: 'b', titulo: 'Preparar clase', duracion: 60, modulo: 'docencia', completada: true }),
  crearTarea({ id: 'c', titulo: 'Revisar actas', duracion: 60, modulo: 'docencia', completada: true }),
  crearTarea({ id: 'd', titulo: 'Escribir sección', duracion: 90, modulo: 'investigacion', completada: true }),
  crearTarea({ id: 'e', titulo: 'Sin medir', duracion: 30, modulo: 'personal' }),
  crearTarea({ id: 'f', titulo: 'Sin estimar', modulo: 'personal' }),
];
const REGISTROS = [
  { tareaId: 'a', minutos: 180, fecha: '2026-09-10' },   // ×1,5
  { tareaId: 'b', minutos: 90, fecha: '2026-09-11' },    // ×1,5
  { tareaId: 'c', minutos: 120, fecha: '2026-09-12' },   // ×2
  { tareaId: 'd', minutos: 90, fecha: '2026-09-13' },    // ×1
  { tareaId: 'f', minutos: 45, fecha: '2026-09-14' },    // sin estimación: no cuenta
];

t('suma el tiempo medido por tarea', () => {
  const m = minutosPorTarea([...REGISTROS, { tareaId: 'a', minutos: 20, fecha: '2026-09-15' }]);
  assert.equal(m.get('a'), 200);
  assert.equal(m.get('z'), undefined);
});

t('no saca conclusiones con dos datos', () => {
  const c = calibracion(TAREAS.slice(0, 2), REGISTROS.slice(0, 2));
  assert.equal(c.suficiente, false);
  assert.equal(c.muestras, 2);
  assert.equal(c.faltan, 1);
  assert.match(c.frase, /faltan 1/);
});

t('el factor es la mediana, no la media', () => {
  const c = calibracion(TAREAS, REGISTROS);
  assert.equal(c.suficiente, true);
  assert.equal(c.muestras, 4);              // solo las que tienen estimación y medición
  assert.equal(c.factor, 1.5);              // mediana de 1, 1.5, 1.5, 2
  assert.equal(c.sesgo, 'subestimas');
  assert.equal(c.totalEstimado, 330);
  assert.equal(c.totalReal, 480);
  assert.match(c.frase, /50 % más/);
});

t('una tarea desastrosa no desplaza el factor', () => {
  const conDesastre = calibracion(
    [...TAREAS, crearTarea({ id: 'x', titulo: 'El día perdido', duracion: 30, modulo: 'personal' })],
    [...REGISTROS, { tareaId: 'x', minutos: 600, fecha: '2026-09-16' }]);
  assert.equal(conDesastre.factor, 1.5);    // la mediana aguanta el ×20
  assert.equal(conDesastre.peores[0].titulo, 'El día perdido');
  assert.equal(conDesastre.peores[0].ratio, 20);
});

t('cada módulo tiene su propio factor si hay datos', () => {
  const c = calibracion(TAREAS, REGISTROS);
  const docencia = c.porModulo.find((m) => m.modulo === 'docencia');
  assert.equal(docencia.muestras, 3);
  assert.equal(docencia.factor, 1.5);
  assert.equal(c.porModulo.find((m) => m.modulo === 'investigacion'), undefined); // solo una muestra
});

t('corrige una estimación nueva con el factor del módulo', () => {
  const c = calibracion(TAREAS, REGISTROS);
  const corregida = estimacionCorregida(60, c, 'docencia');
  assert.equal(corregida.minutos, 90);
  assert.equal(corregida.fuente, 'Docencia');
  // sin datos del módulo se usa el factor general
  assert.equal(estimacionCorregida(60, c, 'alabanza').fuente, 'tu media');
  assert.equal(estimacionCorregida(60, { suficiente: false }), null);
});

t('la pista solo aparece cuando cambia algo', () => {
  const c = calibracion(TAREAS, REGISTROS);
  assert.match(pistaEstimacion(60, c, 'docencia'), /más bien 90 min/);
  assert.equal(pistaEstimacion(0, c), '');
  const afinado = calibracion(
    [crearTarea({ id: '1', duracion: 60 }), crearTarea({ id: '2', duracion: 60 }), crearTarea({ id: '3', duracion: 60 })],
    [{ tareaId: '1', minutos: 60 }, { tareaId: '2', minutos: 60 }, { tareaId: '3', minutos: 60 }]);
  assert.equal(afinado.sesgo, 'afinado');
  assert.equal(pistaEstimacion(60, afinado), '');
});

console.log(`\n${passed} pruebas de calibración de estimaciones OK`);
