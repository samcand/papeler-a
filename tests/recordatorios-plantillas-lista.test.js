import assert from 'node:assert/strict';
import {
  PLANTILLAS_INICIALES, aplicarPlantilla, plantillaDesdeTareas, plantillaVacia,
  previsualizar, resumenPlantilla,
} from '../recordatorios/src/plantillasLista.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('aplicar una plantilla calcula las fechas hacia atrás y hacia adelante', () => {
  const parcial = PLANTILLAS_INICIALES.find((p) => p.id === 'pl-parcial');
  const tareas = aplicarPlantilla(parcial, '2026-10-15');
  assert.equal(tareas.length, 9);
  assert.equal(tareas[0].titulo, 'Diseñar el examen y la clave de respuestas');
  assert.equal(tareas[0].fecha, '2026-10-05');        // diez días antes
  assert.equal(tareas.find((x) => x.titulo === 'Aplicar el examen').fecha, '2026-10-15');
  assert.equal(tareas.find((x) => x.titulo === 'Calificar').fecha, '2026-10-18');
  assert.equal(tareas.find((x) => x.titulo === 'Publicar notas').fecha, '2026-10-22');
  assert.ok(tareas.every((x) => x.modulo === 'docencia'));
  assert.match(tareas[0].notas, /día del examen: 2026-10-15/);
});

t('respeta hora, duración y prioridad de cada paso', () => {
  const domingo = PLANTILLAS_INICIALES.find((p) => p.id === 'pl-domingo');
  const tareas = aplicarPlantilla(domingo, '2026-09-27');
  const ensayo = tareas.find((x) => x.titulo === 'Ensayo del equipo');
  assert.equal(ensayo.fecha, '2026-09-25');
  assert.equal(ensayo.hora, '19:00');
  assert.equal(ensayo.duracion, 120);
  assert.equal(ensayo.prioridad, 1);
});

t('la previsualización ordena por fecha', () => {
  const previa = previsualizar(PLANTILLAS_INICIALES.find((p) => p.id === 'pl-congreso'), '2026-11-10');
  assert.equal(previa[0].fecha, '2026-08-12');        // el resumen, 90 días antes
  assert.equal(previa.at(-1).fecha, '2026-11-15');
  assert.ok(previa.every((p, i) => i === 0 || previa[i - 1].fecha <= p.fecha));
});

t('un paso sin fecha se queda sin fecha', () => {
  const p = plantillaVacia('Prueba');
  p.items = [{ titulo: 'Algún día', sinFecha: true }, { titulo: 'Ese día', offset: 0 }];
  const tareas = aplicarPlantilla(p, '2026-09-20');
  assert.equal(tareas[0].fecha, null);
  assert.equal(tareas[1].fecha, '2026-09-20');
});

t('crear una plantilla desde tareas existentes', () => {
  const tareas = [
    crearTarea({ titulo: 'Preparar', fecha: '2026-09-10', duracion: 60, modulo: 'docencia' }),
    crearTarea({ titulo: 'Hacer', fecha: '2026-09-15', prioridad: 1, modulo: 'docencia' }),
    crearTarea({ titulo: 'Revisar después', fecha: '2026-09-20', modulo: 'docencia' }),
    crearTarea({ titulo: 'Sin fecha', modulo: 'docencia' }),
  ];
  const p = plantillaDesdeTareas(tareas, { nombre: 'Mi rutina', anclaNombre: 'el día clave' });
  assert.equal(p.nombre, 'Mi rutina');
  assert.equal(p.modulo, 'docencia');
  // el ancla es la fecha más tardía: los desfases salen negativos
  assert.deepEqual(p.items.map((i) => i.offset), [-10, -5, 0, 0]);
  assert.equal(p.items.find((i) => i.titulo === 'Sin fecha').sinFecha, true);

  // y al volver a aplicarla, las distancias se conservan
  const vueltas = aplicarPlantilla(p, '2026-12-01');
  assert.equal(vueltas.find((x) => x.titulo === 'Preparar').fecha, '2026-11-21');
  assert.equal(vueltas.find((x) => x.titulo === 'Revisar después').fecha, '2026-12-01');
  assert.equal(vueltas.find((x) => x.titulo === 'Sin fecha').fecha, null);
});

t('el resumen dice cuánto abarca', () => {
  const r = resumenPlantilla(PLANTILLAS_INICIALES.find((p) => p.id === 'pl-viaje'));
  assert.equal(r.total, 8);
  assert.equal(r.desde, -30);
  assert.equal(r.hasta, 1);
  assert.equal(r.minutos, 75);
});

t('las plantillas que vienen puestas están bien formadas', () => {
  assert.equal(PLANTILLAS_INICIALES.length, 6);
  for (const p of PLANTILLAS_INICIALES) {
    assert.ok(p.id && p.nombre && p.anclaNombre, `${p.nombre} incompleta`);
    assert.ok(p.items.length >= 5, `${p.nombre} tiene pocos pasos`);
    assert.ok(p.items.every((i) => i.titulo), `${p.nombre} tiene un paso sin título`);
    assert.ok(p.items.some((i) => (i.offset || 0) === 0), `${p.nombre} no tiene nada el día señalado`);
  }
});

console.log(`\n${passed} pruebas de plantillas de listas OK`);
