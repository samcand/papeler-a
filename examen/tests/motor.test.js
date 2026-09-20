/**
 * motor.test.js — La lógica de estudio: barajado, filtros, repaso y notas.
 */

import assert from 'node:assert/strict';
import { BANCO } from '../src/banco/index.js';
import {
  aleatorioConSemilla, barajar, prepararPregunta, filtrar,
  actualizarRepaso, toca, pendientesDeRepaso, seleccionarPreguntas,
  armarSimulacro, MODELOS_SIMULACRO, puntaje, agruparPor, temasDebiles, racha, notaGlobal,
  DIAS_POR_CAJA,
} from '../src/motor.js';

let pasadas = 0;
const t = (nombre, fn) => { fn(); pasadas++; console.log('  ok  ' + nombre); };

const DIA = 86400000;
const rnd = aleatorioConSemilla(20260920);

t('barajar conserva todos los elementos', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const mezclado = barajar(original, rnd);
  assert.equal(mezclado.length, original.length);
  assert.deepEqual([...mezclado].sort((a, b) => a - b), original);
  assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8], 'no debe modificar el arreglo original');
});

t('al barajar las opciones, la respuesta correcta sigue siendo la misma', () => {
  for (const pregunta of BANCO) {
    const lista = prepararPregunta(pregunta, rnd);
    assert.equal(lista.opciones.length, pregunta.opciones.length);
    assert.equal(lista.opciones[lista.correcta], pregunta.opciones[pregunta.correcta], pregunta.id);
    assert.deepEqual([...lista.opciones].sort(), [...pregunta.opciones].sort(), pregunta.id);
  }
});

t('al barajar, las figuras de las opciones se mueven con su texto', () => {
  const conFiguras = BANCO.filter((p) => p.figuras?.opciones);
  assert.ok(conFiguras.length > 5);
  for (const pregunta of conFiguras) {
    const lista = prepararPregunta(pregunta, rnd);
    lista.orden.forEach((original, nuevo) => {
      assert.deepEqual(lista.figuras.opciones[nuevo], pregunta.figuras.opciones[original], pregunta.id);
      assert.equal(lista.opciones[nuevo], pregunta.opciones[original], pregunta.id);
    });
  }
});

t('el barajado no deja siempre la respuesta en el mismo sitio', () => {
  const posiciones = new Set();
  for (let i = 0; i < 40; i++) posiciones.add(prepararPregunta(BANCO[0], rnd).correcta);
  assert.ok(posiciones.size >= 3, 'las opciones no se están mezclando de verdad');
});

t('filtrar por asignatura, tema y dificultad', () => {
  const soloMate = filtrar(BANCO, { asignatura: 'matematicas' });
  assert.ok(soloMate.length > 0);
  assert.ok(soloMate.every((p) => p.asignatura === 'matematicas'));

  const dosAsignaturas = filtrar(BANCO, { asignaturas: ['ingles', 'lectura'] });
  assert.ok(dosAsignaturas.every((p) => ['ingles', 'lectura'].includes(p.asignatura)));

  const porTema = filtrar(BANCO, { asignatura: 'matematicas', temas: ['porcentajes'] });
  assert.ok(porTema.length >= 3);
  assert.ok(porTema.every((p) => p.tema === 'porcentajes'));

  const faciles = filtrar(BANCO, { dificultades: [1] });
  assert.ok(faciles.every((p) => p.dificultad === 1));

  assert.equal(filtrar(BANCO, {}).length, BANCO.length, 'sin filtros debe devolver todo');
});

t('acertar sube de caja y fallar devuelve a la primera', () => {
  const ahora = Date.now();
  let dato = actualizarRepaso(null, true, ahora);
  assert.equal(dato.caja, 2);
  assert.equal(dato.aciertos, 1);
  assert.equal(dato.proxima, ahora + DIAS_POR_CAJA[1] * DIA);

  dato = actualizarRepaso(dato, true, ahora);
  dato = actualizarRepaso(dato, true, ahora);
  assert.equal(dato.caja, 4);

  dato = actualizarRepaso(dato, false, ahora);
  assert.equal(dato.caja, 1, 'un fallo devuelve la pregunta al principio');
  assert.equal(dato.fallos, 1);
  assert.equal(dato.proxima, ahora, 'una pregunta fallada vuelve a tocar enseguida');
});

t('la caja no se pasa del último escalón', () => {
  let dato = null;
  for (let i = 0; i < 20; i++) dato = actualizarRepaso(dato, true, Date.now());
  assert.equal(dato.caja, DIAS_POR_CAJA.length);
});

t('solo toca repasar lo que ya se vio y venció', () => {
  const ahora = Date.now();
  const repaso = {
    'mat-001': { caja: 2, proxima: ahora - DIA },
    'mat-002': { caja: 3, proxima: ahora + 3 * DIA },
  };
  assert.equal(toca(repaso, 'mat-001', ahora), true);
  assert.equal(toca(repaso, 'mat-002', ahora), false);
  assert.equal(toca(repaso, 'mat-003', ahora), false, 'una pregunta nueva no es un repaso');
  const pendientes = pendientesDeRepaso(BANCO, repaso, ahora);
  assert.deepEqual(pendientes.map((p) => p.id), ['mat-001']);
});

t('la selección pone primero los repasos vencidos', () => {
  const ahora = Date.now();
  const repaso = { 'mat-005': { caja: 1, proxima: ahora - DIA, aciertos: 0, fallos: 2 } };
  const elegidas = seleccionarPreguntas({ banco: filtrar(BANCO, { asignatura: 'matematicas' }), repaso, cantidad: 5, ahora, rnd });
  assert.equal(elegidas[0].id, 'mat-005');
  assert.equal(elegidas.length, 5);
  assert.equal(new Set(elegidas.map((p) => p.id)).size, 5, 'no debe repetir preguntas');
});

t('el modo de solo repaso no trae preguntas nuevas', () => {
  const ahora = Date.now();
  const repaso = { 'tri-001': { caja: 1, proxima: ahora - DIA } };
  const elegidas = seleccionarPreguntas({ banco: BANCO, repaso, cantidad: 10, ahora, rnd, soloRepaso: true });
  assert.deepEqual(elegidas.map((p) => p.id), ['tri-001']);
});

t('la selección no se cae si se piden más preguntas de las que hay', () => {
  const pocas = filtrar(BANCO, { asignatura: 'trigonometria', temas: ['aplicaciones'] });
  const elegidas = seleccionarPreguntas({ banco: pocas, cantidad: 99, rnd });
  assert.equal(elegidas.length, pocas.length);
});

t('el simulacro respeta el reparto por asignatura', () => {
  for (const modelo of Object.values(MODELOS_SIMULACRO)) {
    const examen = armarSimulacro(BANCO, modelo, rnd);
    const total = Object.values(modelo.reparto).reduce((a, b) => a + b, 0);
    assert.equal(examen.length, total, modelo.nombre);
    for (const [asignatura, cuantas] of Object.entries(modelo.reparto)) {
      assert.equal(examen.filter((p) => p.asignatura === asignatura).length, cuantas, `${modelo.nombre}/${asignatura}`);
    }
    assert.equal(new Set(examen.map((p) => p.id)).size, total, 'no debe repetir preguntas');
  }
});

t('el simulacro agrupa por asignatura en el orden del examen', () => {
  const examen = armarSimulacro(BANCO, MODELOS_SIMULACRO.corto, rnd);
  const orden = examen.map((p) => p.asignatura);
  const bloques = orden.filter((a, i) => a !== orden[i - 1]);
  assert.deepEqual(bloques, ['matematicas', 'trigonometria', 'abstracto', 'fisica', 'quimica',
    'salud', 'geografia', 'historia', 'ciudadania', 'cotidiana', 'lectura', 'lengua', 'literatura', 'filosofia', 'ingles']);
});

t('puntaje y agrupaciones', () => {
  const respuestas = [
    { asignatura: 'matematicas', tema: 'porcentajes', correcta: true, ms: 1000, at: Date.now() },
    { asignatura: 'matematicas', tema: 'porcentajes', correcta: false, ms: 3000, at: Date.now() },
    { asignatura: 'ingles', tema: 'modales', correcta: true, ms: 2000, at: Date.now() },
  ];
  assert.deepEqual(puntaje(respuestas), { aciertos: 2, total: 3, porcentaje: 67 });
  const porTema = agruparPor(respuestas, 'tema');
  assert.equal(porTema.porcentajes.total, 2);
  assert.equal(porTema.porcentajes.aciertos, 1);
  assert.equal(porTema.porcentajes.porcentaje, 50);
  assert.equal(porTema.porcentajes.msMedio, 2000);
  assert.equal(porTema.modales.total, 1);
  assert.equal(porTema.modales.porcentaje, 100);
  assert.equal(agruparPor(respuestas, 'asignatura').matematicas.msMedio, 2000);
  assert.equal(puntaje([]).porcentaje, 0);
});

t('la nota global pesa igual todas las asignaturas', () => {
  const respuestas = [
    ...Array.from({ length: 8 }, () => ({ asignatura: 'matematicas', tema: 'aritmetica', correcta: true, ms: 0, at: 0 })),
    ...Array.from({ length: 2 }, () => ({ asignatura: 'matematicas', tema: 'aritmetica', correcta: false, ms: 0, at: 0 })),
    { asignatura: 'ingles', tema: 'modales', correcta: false, ms: 0, at: 0 },
    { asignatura: 'ingles', tema: 'modales', correcta: true, ms: 0, at: 0 },
  ];
  assert.equal(notaGlobal(respuestas), 65, '(80 + 50) / 2');
  assert.equal(notaGlobal([]), 0);
});

t('los temas débiles necesitan varios intentos para aparecer', () => {
  const base = { asignatura: 'matematicas', ms: 0, at: Date.now() };
  const respuestas = [
    { ...base, tema: 'logaritmos', correcta: false },
    { ...base, tema: 'logaritmos', correcta: false },
    { ...base, tema: 'logaritmos', correcta: false },
    { ...base, tema: 'fracciones', correcta: false },
    { ...base, tema: 'algebra', correcta: true },
    { ...base, tema: 'algebra', correcta: true },
    { ...base, tema: 'algebra', correcta: false },
  ];
  const debiles = temasDebiles(respuestas);
  assert.deepEqual(debiles.map((d) => d.tema), ['logaritmos', 'algebra']);
  assert.equal(debiles[0].porcentaje, 0);
  assert.equal(debiles[0].asignatura, 'matematicas');
});

t('la racha cuenta días seguidos y se corta con un hueco', () => {
  const hoy = Date.now();
  const dia = (n) => ({ at: hoy - n * DIA, correcta: true });
  assert.equal(racha([dia(0), dia(1), dia(2)], hoy), 3);
  assert.equal(racha([dia(0), dia(2)], hoy), 1, 'falta el día de ayer');
  assert.equal(racha([dia(1), dia(2)], hoy), 2, 'vale aunque hoy aún no se estudie');
  assert.equal(racha([dia(5)], hoy), 0);
  assert.equal(racha([], hoy), 0);
});

console.log(`\n${pasadas} pruebas del motor\n`);
