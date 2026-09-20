/**
 * banco.test.js — El banco tiene que estar sano antes que bonito.
 *
 * Una pregunta con el tema mal escrito no se ve rota en pantalla: simplemente
 * deja de aparecer en su filtro y nadie se entera. Por eso se revisa aquí.
 */

import assert from 'node:assert/strict';
import { BANCO, TEXTOS } from '../src/banco/index.js';
import { ASIGNATURAS, todosLosTemas, GRADOS, tema } from '../src/temario.js';
import { svgFigura } from '../src/figuras.js';
import { revisarPregunta } from '../src/store.js';

let pasadas = 0;
const t = (nombre, fn) => { fn(); pasadas++; console.log('  ok  ' + nombre); };

const TEMAS = new Set(todosLosTemas().map((x) => x.asignatura + '/' + x.id));
const ASIGS = new Set(ASIGNATURAS.map((a) => a.id));
const FORMAS = new Set(['triangulo', 'cuadrado', 'pentagono', 'hexagono', 'heptagono', 'octagono',
  'circulo', 'flecha', 'ele', 'interrogante', 'vacio']);
const RELLENOS = new Set(['ninguno', 'solido', 'rayado', 'mitad']);

t('el banco no está vacío y hay preguntas de las cinco asignaturas', () => {
  assert.ok(BANCO.length > 150, 'se esperaban más de 150 preguntas, hay ' + BANCO.length);
  for (const a of ASIGNATURAS) {
    const cuantas = BANCO.filter((p) => p.asignatura === a.id).length;
    assert.ok(cuantas >= 30, `${a.nombre} solo tiene ${cuantas} preguntas`);
  }
});

t('los identificadores no se repiten', () => {
  const vistos = new Set();
  for (const p of BANCO) {
    assert.ok(!vistos.has(p.id), 'id repetido: ' + p.id);
    vistos.add(p.id);
  }
});

t('toda pregunta pasa la validación mínima', () => {
  for (const p of BANCO) {
    assert.equal(revisarPregunta(p), null, `${p.id}: ${revisarPregunta(p)}`);
  }
});

t('cada pregunta apunta a una asignatura y un tema del temario', () => {
  for (const p of BANCO) {
    assert.ok(ASIGS.has(p.asignatura), `${p.id}: asignatura desconocida "${p.asignatura}"`);
    assert.ok(TEMAS.has(p.asignatura + '/' + p.tema), `${p.id}: el tema "${p.tema}" no está en el temario`);
  }
});

t('todas tienen cuatro opciones distintas y no vacías', () => {
  for (const p of BANCO) {
    assert.equal(p.opciones.length, 4, `${p.id} tiene ${p.opciones.length} opciones`);
    const limpias = p.opciones.map((o) => String(o).trim());
    assert.ok(limpias.every((o) => o.length > 0), `${p.id} tiene una opción vacía`);
    assert.equal(new Set(limpias).size, 4, `${p.id} tiene opciones repetidas`);
  }
});

t('la respuesta correcta está dentro del rango y hay explicación', () => {
  for (const p of BANCO) {
    assert.ok(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4, `${p.id}: correcta fuera de rango`);
    assert.ok(p.explicacion && p.explicacion.length > 20, `${p.id}: la explicación es muy corta o falta`);
  }
});

t('la dificultad es 1, 2, 3 o 4', () => {
  for (const p of BANCO) {
    assert.ok([1, 2, 3, 4].includes(p.dificultad), `${p.id}: dificultad "${p.dificultad}"`);
  }
});

t('las preguntas de lectura apuntan a un texto que existe', () => {
  for (const p of BANCO) {
    if (!p.lectura) continue;
    assert.ok(TEXTOS[p.lectura], `${p.id}: no existe el texto "${p.lectura}"`);
  }
  for (const [id, texto] of Object.entries(TEXTOS)) {
    assert.ok(texto.titulo && texto.parrafos?.length, `${id}: texto incompleto`);
    const usos = BANCO.filter((p) => p.lectura === id).length;
    assert.ok(usos >= 3, `${id}: solo lo usan ${usos} preguntas`);
  }
});

t('todo tema del temario que se practica tiene al menos una pregunta', () => {
  const sinPreguntas = todosLosTemas()
    .filter((tm) => !BANCO.some((p) => p.asignatura === tm.asignatura && p.tema === tm.id))
    .map((tm) => tm.asignatura + '/' + tm.id);
  assert.deepEqual(sinPreguntas, [], 'temas sin preguntas: ' + sinPreguntas.join(', '));
});

t('las figuras usan formas y rellenos que el dibujante conoce', () => {
  for (const p of BANCO) {
    if (!p.figuras) continue;
    const specs = [...(p.figuras.enunciado || []), ...(p.figuras.opciones || [])];
    for (const spec of specs) {
      assert.ok(FORMAS.has(spec.forma), `${p.id}: forma desconocida "${spec.forma}"`);
      if (spec.relleno) assert.ok(RELLENOS.has(spec.relleno), `${p.id}: relleno desconocido "${spec.relleno}"`);
      const svg = svgFigura(spec, 1);
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${p.id}: la figura no se dibujó`);
    }
    if (p.figuras.opciones) {
      assert.equal(p.figuras.opciones.length, p.opciones.length,
        `${p.id}: hay ${p.figuras.opciones.length} figuras para ${p.opciones.length} opciones`);
    }
    if (p.figuras.disposicion === 'matriz3') {
      assert.equal(p.figuras.enunciado.length, 9, `${p.id}: una matriz 3x3 necesita 9 casillas`);
    }
  }
});

t('todo tema del temario tiene un grado válido', () => {
  for (const a of ASIGNATURAS) {
    for (const tm of a.temas) {
      assert.ok(GRADOS.includes(tm.grado), `${a.id}/${tm.id}: grado "${tm.grado}" fuera de 6.º-11.º`);
    }
  }
});

t('toda pregunta hereda el grado de su tema', () => {
  for (const p of BANCO) {
    assert.ok(GRADOS.includes(p.grado), `${p.id}: sin grado`);
    assert.equal(p.grado, tema(p.asignatura, p.tema).grado, `${p.id}: grado distinto al del tema`);
  }
});

t('cada grado tiene preguntas suficientes para practicar', () => {
  for (const g of GRADOS) {
    const solo = BANCO.filter((p) => p.grado === g).length;
    assert.ok(solo >= 100, `${g}.º solo tiene ${solo} preguntas propias`);
  }
});

t('cada asignatura mezcla los cuatro niveles', () => {
  for (const a of ASIGNATURAS) {
    const suyas = BANCO.filter((p) => p.asignatura === a.id);
    for (const nivel of [1, 2, 3, 4]) {
      assert.ok(suyas.some((p) => p.dificultad === nivel), `${a.nombre} no tiene preguntas de nivel ${nivel}`);
    }
  }
});

/**
 * Densidad del banco. El suelo (MINIMO) sí se exige: por debajo de tres
 * preguntas un tema no da ni para una ronda de práctica. La meta (META) no se
 * exige, se informa: es el objetivo que sostiene un estudio largo sin que el
 * estudiante acabe memorizando las respuestas en vez de aprender el tema.
 */
const MINIMO = 3;
const META = 10;

/**
 * Suelo por nivel. La clasificación en cuatro niveles solo sirve si el
 * estudiante puede practicar cualquiera de ellos en cualquier tema: si un tema
 * tiene diez preguntas pero todas intermedias, el filtro por nivel no devuelve
 * nada y la escala es decorativa.
 */
const POR_NIVEL = 3;

t(`cada tema tiene al menos ${POR_NIVEL} preguntas de cada nivel`, () => {
  const flojos = [];
  for (const tm of todosLosTemas()) {
    const suyas = BANCO.filter((p) => p.asignatura === tm.asignatura && p.tema === tm.id);
    for (const nivel of [1, 2, 3, 4]) {
      const n = suyas.filter((p) => p.dificultad === nivel).length;
      if (n < POR_NIVEL) flojos.push(`${tm.asignatura}/${tm.id} nivel ${nivel} (${n})`);
    }
  }
  assert.deepEqual(flojos, [], 'faltan preguntas por nivel: ' + flojos.join(', '));
});

t(`ningún tema baja de ${MINIMO} preguntas`, () => {
  const pobres = todosLosTemas()
    .map((tm) => ({ ...tm, n: BANCO.filter((p) => p.asignatura === tm.asignatura && p.tema === tm.id).length }))
    .filter((tm) => tm.n < MINIMO)
    .map((tm) => `${tm.asignatura}/${tm.id} (${tm.n})`);
  assert.deepEqual(pobres, [], 'temas por debajo del mínimo: ' + pobres.join(', '));
});

console.log(`\n${pasadas} pruebas del banco (${BANCO.length} preguntas revisadas)\n`);

console.log(`Cobertura por asignatura (meta: ${META} preguntas por tema)`);
let faltan = 0;
for (const a of ASIGNATURAS) {
  const total = BANCO.filter((p) => p.asignatura === a.id).length;
  const deficit = a.temas.reduce((s, tm) => {
    const n = BANCO.filter((p) => p.asignatura === a.id && p.tema === tm.id).length;
    return s + Math.max(0, META - n);
  }, 0);
  faltan += deficit;
  const media = (total / a.temas.length).toFixed(1);
  console.log(
    '  ' + a.nombre.padEnd(24) + String(total).padStart(4) + ' preguntas · ' +
    String(a.temas.length).padStart(2) + ' temas · ' + media.padStart(4) + ' por tema' +
    (deficit ? `  → faltan ${deficit} para la meta` : '  → meta alcanzada'));
}
console.log(`  ${'TOTAL'.padEnd(24)}${String(BANCO.length).padStart(4)} preguntas · faltan ${faltan} para la meta de ${META} por tema\n`);
