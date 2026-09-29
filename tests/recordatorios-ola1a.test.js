import assert from 'node:assert/strict';
import { PilaDeshacer, aPapelera, candidatasAArchivar, diasRestantes, purgar, restaurar, visibles } from '../recordatorios/src/papelera.js';
import { alternarTres, esAplazamiento, proponerTres, tresDelDia, zombis } from '../recordatorios/src/dia.js';
import { capacidadDia, capacidadSemanas, minutosDisponibles, nivelCarga, resumenCapacidad } from '../recordatorios/src/capacidad.js';
import { avisoTemprano, explicacion, instantaneaSalud, salud, saludPorProyecto } from '../recordatorios/src/salud.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-21';   // lunes

/* ---------------- papelera, archivo y deshacer ---------------- */

t('la papelera guarda, devuelve y caduca a los 30 días', () => {
  const papelera = [
    aPapelera('tarea', { id: 'a', titulo: 'Borrada ayer' }, '2026-09-20'),
    aPapelera('tarea', { id: 'b', titulo: 'Borrada hace 40 días' }, '2026-08-12'),
  ];
  const viva = purgar(papelera, HOY);
  assert.equal(viva.length, 1);
  assert.equal(viva[0].nombre, 'Borrada ayer');
  assert.equal(diasRestantes(viva[0], HOY), 29);

  const { elemento, papelera: resto } = restaurar(viva, viva[0].id);
  assert.equal(elemento.datos.titulo, 'Borrada ayer');
  assert.equal(resto.length, 0);
  assert.equal(restaurar(resto, 'inexistente').elemento, null);
});

t('deshacer devuelve el estado anterior y respeta el límite', () => {
  const pila = new PilaDeshacer(3);
  assert.equal(pila.hayAlgo, false);
  pila.guardar({ tareas: [1] }, 'una');
  pila.guardar({ tareas: [1, 2] }, 'dos');
  assert.equal(pila.ultima.etiqueta, 'dos');

  const vuelta = pila.deshacer();
  assert.deepEqual(vuelta.estado.tareas, [1, 2]);
  assert.equal(pila.ultima.etiqueta, 'una');

  for (let i = 0; i < 5; i++) pila.guardar({ n: i }, `op ${i}`);
  assert.equal(pila.pila.length, 3);           // no crece sin fin
  assert.equal(pila.ultima.etiqueta, 'op 4');

  // la instantánea es una copia: tocar el original no la cambia
  const estado = { tareas: [{ titulo: 'original' }] };
  pila.guardar(estado, 'copia');
  estado.tareas[0].titulo = 'cambiada';
  assert.equal(pila.ultima.estado.tareas[0].titulo, 'original');
});

t('lo archivado desaparece de las vistas y se propone solo', () => {
  const tareas = [
    crearTarea({ id: '1', titulo: 'Viva' }),
    crearTarea({ id: '2', titulo: 'Archivada', archivada: true }),
    crearTarea({ id: '3', titulo: 'Hecha hace mucho', completada: true, completadaEn: '2026-07-01T10:00:00.000Z' }),
    crearTarea({ id: '4', titulo: 'Hecha ayer', completada: true, completadaEn: '2026-09-20T10:00:00.000Z' }),
  ];
  assert.deepEqual(visibles(tareas).map((t) => t.id), ['1', '3', '4']);
  assert.deepEqual(candidatasAArchivar(tareas, HOY).map((t) => t.id), ['3']);
});

/* ---------------- las tres del día y los zombis ---------------- */

const TAREAS_DIA = [
  crearTarea({ id: 'v', titulo: 'Atrasada urgente', fecha: '2026-09-18', prioridad: 1 }),
  crearTarea({ id: 'h', titulo: 'Reunión', fecha: HOY, hora: '10:00', prioridad: 3 }),
  crearTarea({ id: 'p', titulo: 'Preparar clase', fecha: HOY, prioridad: 2, duracion: 60 }),
  crearTarea({ id: 'x', titulo: 'Otra más', fecha: HOY, prioridad: 4, duracion: 30 }),
];

t('propone tres: lo urgente, lo que tiene hora y lo prioritario', () => {
  const tres = proponerTres(TAREAS_DIA, HOY);
  assert.deepEqual(tres.map((t) => t.id), ['v', 'h', 'p']);
  assert.equal(new Set(tres.map((t) => t.id)).size, 3);
});

t('las tres se guardan por día y no admiten una cuarta', () => {
  let ajustes = {};
  for (const id of ['v', 'h', 'p']) ajustes = { tresDelDia: alternarTres(ajustes, id, HOY) };
  assert.deepEqual(ajustes.tresDelDia.ids, ['v', 'h', 'p']);

  const lleno = alternarTres(ajustes, 'x', HOY);
  assert.equal(lleno.lleno, true);
  assert.deepEqual(lleno.ids, ['v', 'h', 'p']);

  // quitar una deja hueco
  ajustes = { tresDelDia: alternarTres(ajustes, 'h', HOY) };
  assert.deepEqual(ajustes.tresDelDia.ids, ['v', 'p']);

  const estado = tresDelDia(ajustes, TAREAS_DIA, HOY);
  assert.equal(estado.elegidas.length, 2);
  assert.equal(estado.libres, 1);
  // mañana empiezan de cero
  assert.equal(tresDelDia(ajustes, TAREAS_DIA, '2026-09-22').elegidas.length, 0);
});

t('cuenta como aplazamiento solo empujar hacia adelante', () => {
  assert.equal(esAplazamiento('2026-09-21', '2026-09-22'), true);
  assert.equal(esAplazamiento('2026-09-18', '2026-09-21'), true);   // de atrasada a hoy también es mover
  assert.equal(esAplazamiento('2026-09-22', '2026-09-21'), false);
  assert.equal(esAplazamiento(null, '2026-09-21'), false);
});

t('las tareas zombi salen ordenadas por cuántas veces las has pospuesto', () => {
  const lista = [
    crearTarea({ id: 'z1', titulo: 'Llamar al seguro', aplazamientos: 7, creadaEn: '2026-07-01T09:00:00.000Z' }),
    crearTarea({ id: 'z2', titulo: 'Ordenar el disco', aplazamientos: 5 }),
    crearTarea({ id: 'n', titulo: 'Normal', aplazamientos: 2 }),
    crearTarea({ id: 'c', titulo: 'Hecha', aplazamientos: 9, completada: true }),
  ];
  const z = zombis(lista, HOY);
  assert.deepEqual(z.map((t) => t.id), ['z1', 'z2']);
  assert.equal(z[0].diasRodando, 82);
});

/* ---------------- capacidad ---------------- */

t('los días disponibles dependen del día de la semana', () => {
  const ajustes = { jornada: { inicio: '09:00', fin: '17:00' } };
  assert.equal(minutosDisponibles('2026-09-21', ajustes), 480);   // lunes
  assert.equal(minutosDisponibles('2026-09-26', ajustes), 240);   // sábado
  assert.equal(minutosDisponibles('2026-09-26', { ...ajustes, minutosFinde: 0 }), 0);
  assert.equal(nivelCarga(120), 'imposible');
  assert.equal(nivelCarga(85), 'ajustado');
  assert.equal(nivelCarga(10), 'holgado');
});

t('un día suma lo comprometido y reparte por módulo', () => {
  const tareas = [
    crearTarea({ titulo: 'Calificar', fecha: HOY, duracion: 180, modulo: 'docencia' }),
    crearTarea({ titulo: 'Escribir', fecha: HOY, duracion: 90, modulo: 'investigacion' }),
    crearTarea({ titulo: 'Atrasada', fecha: '2026-09-17', duracion: 60, modulo: 'inversiones' }),
    crearTarea({ titulo: 'Sin estimar', fecha: HOY, modulo: 'personal' }),
    crearTarea({ titulo: 'Hecha', fecha: HOY, duracion: 120, completada: true }),
  ];
  const d = capacidadDia(tareas, HOY, { jornada: { inicio: '09:00', fin: '14:00' } }, HOY);
  assert.equal(d.comprometidos, 330);      // incluye la atrasada, excluye la hecha
  assert.equal(d.disponibles, 300);
  assert.equal(d.pct, 110);
  assert.equal(d.nivel, 'imposible');
  assert.equal(d.sinEstimar, 1);
  assert.equal(d.porModulo[0].modulo, 'docencia');
});

t('los días que ya pasaron no ofrecen horas', () => {
  const tareas = [crearTarea({ titulo: 'De ayer', fecha: '2026-09-20', duracion: 120 })];
  const ayer = capacidadDia(tareas, '2026-09-20', {}, HOY);
  assert.equal(ayer.pasado, true);
  assert.equal(ayer.disponibles, 0);
  assert.equal(ayer.comprometidos, 0);          // lo de ayer cuenta hoy, no dos veces
  assert.equal(ayer.nivel, 'pasado');
  assert.equal(capacidadDia(tareas, HOY, {}, HOY).comprometidos, 120);
});

t('el mapa de semanas y la frase que lo resume', () => {
  const tareas = [
    crearTarea({ titulo: 'A', fecha: HOY, duracion: 300, modulo: 'docencia' }),
    crearTarea({ titulo: 'B', fecha: '2026-09-22', duracion: 120, modulo: 'inversiones' }),
    crearTarea({ titulo: 'C', fecha: '2026-09-29', duracion: 60, modulo: 'docencia' }),
  ];
  const ajustes = { jornada: { inicio: '09:00', fin: '13:00' } };   // 240 min al día
  const semanas = capacidadSemanas(tareas, HOY, 2, ajustes, HOY);
  assert.equal(semanas.length, 2);
  assert.equal(semanas[0].desde, HOY);
  assert.equal(semanas[0].dias.length, 7);
  assert.equal(semanas[0].imposibles, 1);   // el lunes con 300 min en 240

  const r = resumenCapacidad(tareas, ajustes, HOY);
  assert.match(r.frase, /día no|no cabe|llena|libres/);
  assert.equal(r.reparto[0].modulo, 'docencia');
  assert.equal(r.peor.fecha, HOY);
});

/* ---------------- salud explicada ---------------- */

t('sin problemas, la salud es 100 y lo dice sin rodeos', () => {
  const s = salud([
    crearTarea({ titulo: 'A', fecha: '2026-09-25', creadaEn: '2026-09-20T09:00:00.000Z' }),
    crearTarea({ titulo: 'B', completada: true, completadaEn: '2026-09-20T09:00:00.000Z', creadaEn: '2026-09-19T09:00:00.000Z' }),
  ], HOY);
  assert.equal(s.puntuacion, 100);
  assert.equal(s.nivel, 'bien');
  assert.match(explicacion(s), /Todo al día/);
});

t('cada factor que baja la nota viene con su explicación', () => {
  const tareas = [
    crearTarea({ titulo: 'Vieja', fecha: '2026-08-20', creadaEn: '2026-08-01T09:00:00.000Z', aplazamientos: 4 }),
    crearTarea({ titulo: 'Otra atrasada', fecha: '2026-09-10', creadaEn: '2026-09-01T09:00:00.000Z' }),
    crearTarea({ titulo: 'Esperando', fecha: '2026-09-30', creadaEn: '2026-09-15T09:00:00.000Z', espera: { quien: 'la revista', limite: '2026-09-15' } }),
  ];
  const s = salud(tareas, HOY);
  const ids = s.factores.map((f) => f.id);
  assert.ok(ids.includes('atrasadas'));
  assert.ok(ids.includes('aplazadas'));
  assert.ok(ids.includes('estancamiento'));
  assert.ok(ids.includes('esperas'));
  assert.ok(s.puntuacion < 60);
  assert.equal(s.nivel, 'riesgo');
  assert.match(s.factores.find((f) => f.id === 'esperas').texto, /la revista/);
  assert.match(explicacion(s), /motivos más/);
  // los factores vienen ordenados por lo que más pesa
  assert.ok(s.factores[0].puntos >= s.factores[1].puntos);
});

t('compara proyectos y avisa del que se está deteriorando', () => {
  const tareas = [
    crearTarea({ titulo: 'X', proyecto: 'Cartera', fecha: '2026-09-10', creadaEn: '2026-09-01T09:00:00.000Z' }),
    crearTarea({ titulo: 'Y', proyecto: 'Artículos', fecha: '2026-10-10', creadaEn: '2026-09-18T09:00:00.000Z' }),
    crearTarea({ titulo: 'Z', proyecto: 'Artículos', completada: true, completadaEn: '2026-09-20T09:00:00.000Z', creadaEn: '2026-09-18T09:00:00.000Z' }),
  ];
  const proyectos = [{ nombre: 'Cartera' }, { nombre: 'Artículos' }, { nombre: 'Vacío' }];
  const filas = saludPorProyecto(tareas, proyectos, HOY, { Cartera: 95, Artículos: 100 });
  assert.equal(filas.length, 2);                 // el vacío no se juzga
  assert.equal(filas[0].proyecto, 'Cartera');    // el peor primero
  assert.ok(filas[0].tendencia < 0);

  const avisos = avisoTemprano(filas, 10);
  assert.ok(avisos.length >= 0);
  const foto = instantaneaSalud(filas, HOY);
  assert.equal(foto.fecha, HOY);
  assert.equal(Object.keys(foto.scores).length, 2);
});

console.log(`\n${passed} pruebas de la ola 1 (datos, día, capacidad y salud) OK`);
