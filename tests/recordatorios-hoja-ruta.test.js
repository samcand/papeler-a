import assert from 'node:assert/strict';
import { CATEGORIAS, DESCARTADAS, HECHAS, IDEAS, OLAS, PENDIENTES, porOla } from '../recordatorios/src/ideas.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('la hoja de ruta está bien formada', () => {
  assert.ok(IDEAS.length >= 110);
  const numeros = IDEAS.map((i) => i.n);
  assert.equal(new Set(numeros).size, numeros.length, 'hay números repetidos');
  assert.deepEqual(numeros, [...numeros].sort((a, b) => a - b), 'no están ordenadas');
  for (const i of IDEAS) {
    assert.ok(i.t && i.d, `la entrada ${i.n} está incompleta`);
    assert.ok(['hecho', 'pendiente', 'descartado'].includes(i.estado), `estado raro en ${i.n}`);
    assert.ok(CATEGORIAS.some((c) => c.id === i.c), `categoría desconocida en ${i.n}`);
  }
});

t('cada pendiente tiene ola y cada descartada su motivo', () => {
  for (const i of PENDIENTES) assert.ok([1, 2, 3].includes(i.ola), `la pendiente ${i.n} no tiene ola`);
  for (const i of DESCARTADAS) {
    assert.ok(i.motivo && i.motivo.length > 25, `la descartada ${i.n} no explica por qué`);
    assert.equal(i.ola, undefined);
  }
  for (const n of HECHAS) assert.equal(IDEAS.find((i) => i.n === n).ola, undefined);
});

t('las tres olas suman todo lo pendiente', () => {
  const suma = OLAS.reduce((s, o) => s + porOla(o.n).length, 0);
  assert.equal(suma, PENDIENTES.length);
  // Las olas se vacían según se terminan: lo que debe cumplirse es que mientras
  // queden pendientes haya al menos una ola con trabajo.
  if (PENDIENTES.length) {
    assert.ok(OLAS.some((o) => porOla(o.n).length), 'quedan pendientes pero ninguna ola los recoge');
  }
});

t('los estados no se solapan', () => {
  assert.equal(HECHAS.length + PENDIENTES.length + DESCARTADAS.length, IDEAS.length);
});

t('lo que salió de la revisión de herramientas profesionales está dentro', () => {
  const nuevas = IDEAS.filter((i) => i.n >= 101);
  assert.equal(nuevas.length, 10);
  assert.ok(nuevas.every((i) => i.estado === 'pendiente'));
  const titulos = nuevas.map((i) => i.t).join(' | ');
  assert.match(titulos, /¿qué pasa si\?/);
  assert.match(titulos, /capacidad real/i);
  assert.match(titulos, /Salud explicada/);
  assert.match(titulos, /Copiloto local/);
});

console.log(`\n${passed} pruebas de la hoja de ruta OK`);
