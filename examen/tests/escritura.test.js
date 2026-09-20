/**
 * escritura.test.js — Consignas, rúbrica y gráficos.
 *
 * Son las dos piezas que no son preguntas de opción múltiple: el módulo de
 * comunicación escrita y el dibujante de textos discontinuos.
 */

import assert from 'node:assert/strict';
import {
  CONSIGNAS, RUBRICA, REVISION, DURACIONES, PALABRAS_SUGERIDAS,
  contarPalabras, contarParrafos, revisarLongitud, puntuar, siguienteConsigna,
} from '../src/escritura.js';
import { svgGrafico, describirGrafico, TIPOS_GRAFICO } from '../src/graficos.js';
import { BANCO } from '../src/banco/index.js';

let pasadas = 0;
const t = (nombre, fn) => { fn(); pasadas++; console.log('  ok  ' + nombre); };

t('hay consignas suficientes y todas están completas', () => {
  assert.ok(CONSIGNAS.length >= 10, 'se esperaban al menos 10 consignas');
  assert.equal(new Set(CONSIGNAS.map((c) => c.id)).size, CONSIGNAS.length, 'ids repetidos');
  for (const c of CONSIGNAS) {
    assert.ok(c.tema && c.texto, `${c.id}: falta tema o texto`);
    assert.ok(c.texto.length > 80, `${c.id}: la consigna es demasiado escueta`);
  }
});

t('la rúbrica tiene tres niveles por criterio', () => {
  assert.ok(RUBRICA.length >= 4);
  for (const c of RUBRICA) {
    assert.equal(c.niveles.length, 3, `${c.id}: se esperaban tres niveles`);
    assert.ok(c.pregunta.endsWith('?'), `${c.id}: el criterio debe plantearse como pregunta`);
  }
  assert.ok(REVISION.length >= 5);
  assert.deepEqual(DURACIONES, [20, 30, 40]);
});

t('contar palabras y párrafos', () => {
  assert.equal(contarPalabras(''), 0);
  assert.equal(contarPalabras('   '), 0);
  assert.equal(contarPalabras('  Hola   mundo cruel '), 3);
  assert.equal(contarParrafos('uno\n\ndos\n\n\ntres'), 3);
  assert.equal(contarParrafos(''), 0);
  assert.equal(contarParrafos('una sola línea'), 1);
});

t('el aviso de extensión distingue corto, bien y largo', () => {
  const { minimo, maximo } = PALABRAS_SUGERIDAS;
  assert.equal(revisarLongitud(0).estado, 'vacio');
  assert.equal(revisarLongitud(minimo - 50).estado, 'corto');
  assert.equal(revisarLongitud(minimo).estado, 'bien');
  assert.equal(revisarLongitud(maximo).estado, 'bien');
  assert.equal(revisarLongitud(maximo + 1).estado, 'largo');
  assert.match(revisarLongitud(minimo - 50).mensaje, /50/);
});

t('la rúbrica puntúa y señala los criterios más flojos', () => {
  const vacia = puntuar({});
  assert.equal(vacia.completa, false);
  assert.equal(vacia.total, 0);

  const completa = puntuar({ postura: 2, organizacion: 1, argumentos: 0, lenguaje: 2 });
  assert.equal(completa.completa, true);
  assert.equal(completa.total, 5);
  assert.equal(completa.maximo, 8);
  assert.equal(completa.porcentaje, 63);
  assert.deepEqual(completa.flojos, ['Argumentos y evidencia']);

  const perfecta = puntuar({ postura: 2, organizacion: 2, argumentos: 2, lenguaje: 2 });
  assert.equal(perfecta.porcentaje, 100);
  assert.deepEqual(perfecta.flojos, []);
});

t('la siguiente consigna evita las ya usadas', () => {
  const hechas = CONSIGNAS.slice(0, CONSIGNAS.length - 1).map((c) => c.id);
  assert.equal(siguienteConsigna(hechas).id, CONSIGNAS[CONSIGNAS.length - 1].id);
  // Si ya se usaron todas, vuelve a repartir en lugar de quedarse sin nada.
  assert.ok(siguienteConsigna(CONSIGNAS.map((c) => c.id)).id);
});

t('el dibujante produce SVG para todos los tipos de gráfico', () => {
  const ejemplos = {
    barras: { tipo: 'barras', titulo: 'T', datos: [{ etiqueta: 'A', valor: 10 }, { etiqueta: 'B', valor: 4 }] },
    lineas: { tipo: 'lineas', titulo: 'T', etiquetas: ['a', 'b'], series: [{ nombre: 's', valores: [1, 3] }] },
    circular: { tipo: 'circular', titulo: 'T', datos: [{ etiqueta: 'A', valor: 60 }, { etiqueta: 'B', valor: 40 }] },
    pictograma: { tipo: 'pictograma', titulo: 'T', unidad: 10, filas: [{ etiqueta: 'x', valor: 30 }] },
    plano: { tipo: 'plano', titulo: 'T', salas: [{ x: 0, y: 0, w: 50, h: 50, etiqueta: 'sala' }] },
    mapa: { tipo: 'mapa', titulo: 'T', zonas: [{ x: 0, y: 0, w: 40, h: 40, etiqueta: 'z', nivel: 2 }], leyenda: [{ nivel: 2, texto: 'media' }] },
  };
  for (const tipo of TIPOS_GRAFICO) {
    const svg = svgGrafico(ejemplos[tipo]);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${tipo}: no produjo SVG`);
    assert.ok(svg.includes('role="img"'), `${tipo}: falta el rol de imagen`);
    assert.ok(describirGrafico(ejemplos[tipo]).length > 5, `${tipo}: falta texto alternativo`);
  }
  assert.ok(svgGrafico({ tipo: 'inventado' }).startsWith('<svg'), 'un tipo desconocido no debe romper la vista');
});

t('los gráficos del banco usan tipos conocidos y se pueden dibujar', () => {
  const conGrafico = BANCO.filter((p) => p.grafico);
  assert.ok(conGrafico.length >= 10, 'se esperaban al menos diez preguntas con gráfico');
  for (const p of conGrafico) {
    assert.ok(TIPOS_GRAFICO.includes(p.grafico.tipo), `${p.id}: tipo "${p.grafico.tipo}" desconocido`);
    const svg = svgGrafico(p.grafico);
    assert.ok(svg.startsWith('<svg') && svg.length > 120, `${p.id}: el gráfico salió vacío`);
    assert.ok(!svg.includes('NaN'), `${p.id}: el gráfico produjo coordenadas inválidas`);
    assert.ok(describirGrafico(p.grafico).length > 10, `${p.id}: sin texto alternativo utilizable`);
  }
});

t('el texto alternativo de un gráfico incluye sus datos', () => {
  const alt = describirGrafico({ tipo: 'barras', titulo: 'Ventas', datos: [{ etiqueta: 'A', valor: 12 }, { etiqueta: 'B', valor: 7 }] });
  assert.match(alt, /Ventas/);
  assert.match(alt, /A: 12/);
  assert.match(alt, /B: 7/);
});

console.log(`\n${pasadas} pruebas de escritura y gráficos\n`);
