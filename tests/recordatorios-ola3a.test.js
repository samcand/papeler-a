import assert from 'node:assert/strict';
import { parecido, posiblesDuplicados } from '../recordatorios/src/captura.js';
import { ACCIONES, REGLAS_EJEMPLO, aplicarReglas, coincide, reglaVacia, textoRegla } from '../recordatorios/src/automatizacion.js';
import { energiaDe, quePuedoHacer, repartoEnergia } from '../recordatorios/src/energia.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';

/* ---------------- duplicados ---------------- */

t('el parecido entre títulos ignora acentos, mayúsculas y palabras vacías', () => {
  assert.equal(parecido('Llamar al seguro del coche', 'llamar seguro coche'), 1);
  assert.equal(parecido('Revisar la tesis de NVDA', 'REVISAR TESIS NVDA'), 1);
  assert.ok(parecido('Preparar clase de circuitos', 'Preparar clase de electrónica') > 0.3);
  assert.ok(parecido('Comprar pan', 'Escribir el artículo') < 0.1);
});

t('avisa de lo que ya tienes, sin molestar con falsos positivos', () => {
  const tareas = [
    crearTarea({ id: '1', titulo: 'Llamar al seguro del coche' }),
    crearTarea({ id: '2', titulo: 'Preparar la clase de circuitos' }),
    crearTarea({ id: '3', titulo: 'Llamar al seguro', completada: true }),
  ];
  const dup = posiblesDuplicados('llamar seguro coche', tareas);
  assert.equal(dup.length, 1);
  assert.equal(dup[0].tarea.id, '1');
  assert.equal(posiblesDuplicados('escribir la introducción', tareas).length, 0);
  // las completadas solo si se piden
  assert.equal(posiblesDuplicados('llamar al seguro', tareas, { incluirCompletadas: true }).length, 2);
  // y no se avisa a sí misma al editar
  assert.equal(posiblesDuplicados('Llamar al seguro del coche', tareas, { excluir: '1' }).length, 0);
});

/* ---------------- reglas de automatización ---------------- */

t('una regla reconoce su caso y solo el suyo', () => {
  const regla = { ...reglaVacia(), condicion: { tipo: 'titulo', valor: 'llamar' } };
  assert.equal(coincide(regla, crearTarea({ titulo: 'Llamar al banco' })), true);
  assert.equal(coincide(regla, crearTarea({ titulo: 'Escribir' })), false);
  assert.equal(coincide({ condicion: { tipo: 'etiqueta', valor: 'espera' } }, crearTarea({ etiquetas: ['Espera'] })), true);
  assert.equal(coincide({ condicion: { tipo: 'sinFecha' } }, crearTarea({})), true);
  assert.equal(coincide({ condicion: { tipo: 'sinFecha' } }, crearTarea({ fecha: HOY })), false);
});

t('las acciones se aplican y queda constancia de qué regla actuó', () => {
  const reglas = [
    { id: 'a', nombre: 'Llamadas', activa: true, condicion: { tipo: 'titulo', valor: 'llamar' },
      acciones: [{ tipo: 'etiqueta', valor: 'llamar' }, { tipo: 'duracion', valor: 15 }, { tipo: 'energia', valor: 'baja' }] },
    { id: 'b', nombre: 'Apagada', activa: false, condicion: { tipo: 'titulo', valor: 'llamar' },
      acciones: [{ tipo: 'prioridad', valor: 1 }] },
    { id: 'c', nombre: 'Sin fecha', activa: true, condicion: { tipo: 'sinFecha' },
      acciones: [{ tipo: 'fecha', valor: 7 }] },
  ];
  const { tarea, aplicadas } = aplicarReglas(crearTarea({ titulo: 'Llamar al banco' }), reglas, HOY);
  assert.deepEqual(aplicadas, ['Llamadas', 'Sin fecha']);
  assert.deepEqual(tarea.etiquetas, ['llamar']);
  assert.equal(tarea.duracion, 15);
  assert.equal(tarea.energia, 'baja');
  assert.equal(tarea.fecha, '2026-09-30');
  assert.equal(tarea.prioridad, 4, 'la regla apagada no toca nada');
});

t('las reglas no pisan lo que ya habías decidido', () => {
  const reglas = [{ id: 'a', nombre: 'X', activa: true, condicion: { tipo: 'titulo', valor: 'x' },
    acciones: [{ tipo: 'fecha', valor: 3 }, { tipo: 'duracion', valor: 60 }] }];
  const { tarea } = aplicarReglas(crearTarea({ titulo: 'x', fecha: HOY, duracion: 15 }), reglas, HOY);
  assert.equal(tarea.fecha, HOY);
  assert.equal(tarea.duracion, 15);
});

t('la regla se puede leer en una frase', () => {
  const texto = textoRegla(REGLAS_EJEMPLO[0]);
  assert.match(texto, /Si el título contiene “llamar”/);
  assert.match(texto, /añádele la etiqueta llamar/);
  assert.equal(ACCIONES.length, 7);
});

/* ---------------- energía ---------------- */

t('la energía se deduce del título cuando no la pones', () => {
  assert.equal(energiaDe(crearTarea({ titulo: 'Escribir la discusión' })), 'alta');
  assert.equal(energiaDe(crearTarea({ titulo: 'Llamar al banco' })), 'baja');
  assert.equal(energiaDe(crearTarea({ titulo: 'Preparar el material' })), 'media');
  assert.equal(energiaDe(crearTarea({ titulo: 'Escribir', energia: 'baja' })), 'baja', 'lo que tú pones manda');
});

t('qué puedo hacer en 20 minutos y cansado', () => {
  const tareas = [
    crearTarea({ titulo: 'Escribir la discusión', duracion: 90, fecha: HOY, prioridad: 1 }),
    crearTarea({ titulo: 'Llamar al seguro', duracion: 15, fecha: HOY, prioridad: 3 }),
    crearTarea({ titulo: 'Archivar exámenes', duracion: 20, fecha: HOY, prioridad: 4 }),
    crearTarea({ titulo: 'Preparar clase', duracion: 20, fecha: HOY, prioridad: 2 }),
    crearTarea({ titulo: 'Del mes que viene', duracion: 10, fecha: '2026-10-20' }),
  ];
  const cansado = quePuedoHacer(tareas, { minutos: 20, energia: 'baja', hoyISO: HOY });
  assert.deepEqual(cansado.tareas.map((t) => t.titulo), ['Llamar al seguro', 'Archivar exámenes']);
  assert.match(cansado.frase, /caben en 20 minutos/);

  const fresco = quePuedoHacer(tareas, { minutos: 20, energia: 'alta', hoyISO: HOY });
  assert.equal(fresco.tareas.length, 3);                      // también las de media y baja
  assert.equal(fresco.tareas[0].titulo, 'Preparar clase');     // la más prioritaria primero

  const nada = quePuedoHacer(tareas, { minutos: 5, energia: 'baja', hoyISO: HOY });
  assert.equal(nada.total, 0);
  assert.match(nada.frase, /Igual toca descansar/);
});

t('avisa si todo el día pide cabeza fresca', () => {
  const duras = Array.from({ length: 4 }, (_, i) => crearTarea({ titulo: `Escribir parte ${i}`, fecha: HOY, duracion: 60 }));
  const r = repartoEnergia([...duras, crearTarea({ titulo: 'Llamar', fecha: HOY })], HOY);
  assert.equal(r.cuenta.alta, 4);
  assert.equal(r.cuenta.baja, 1);
  assert.match(r.aviso, /Nadie tiene tantas horas buenas/);
  assert.equal(repartoEnergia([crearTarea({ titulo: 'Llamar', fecha: HOY })], HOY).aviso, null);
});

console.log(`\n${passed} pruebas de captura, reglas y energía OK`);
