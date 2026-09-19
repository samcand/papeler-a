import assert from 'node:assert/strict';
import { esLineaDeAcordes, esEtiquetaSeccion, fusionarAcordes, parseHoja, toHojaJSON, toHojaTexto, etiquetaSeccion } from '../src/hoja.js';
import { buildDocx, docxFileName } from '../src/docx.js';
import { chordsUsed } from '../src/chordpro.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

const HOJA = `10.000 RAZONES (G)
Matt Redman

CORO
C           G           D/F#         Em
Alma mía bendice, bendice al señor
C                     G      D
Su nombre santo es

VERSO I
C                 Em7      C    D   Em
Como nunca alma mía     cán-ta--le

CORO (Igual)`;

t('distingue etiquetas, letra y líneas de acordes', () => {
  assert.equal(esLineaDeAcordes('C           G           D/F#         Em'), true);
  assert.equal(esLineaDeAcordes('| C | G |'), true);
  assert.equal(esLineaDeAcordes('Alma mía bendice'), false);
  // "CORO" empieza por C: no puede confundirse con un acorde
  assert.equal(esLineaDeAcordes('CORO'), false);
  assert.equal(esEtiquetaSeccion('CORO'), true);
  assert.equal(esEtiquetaSeccion('VERSO III'), true);
  assert.equal(esEtiquetaSeccion('Alma mía bendice'), false);
});

t('coloca cada acorde en su sílaba', () => {
  // El acorde cae dentro de "mía" por un carácter: se pega al inicio de la palabra
  assert.equal(fusionarAcordes('C     G', 'Alma mía bendice'), '[C]Alma [G]mía bendice');
  // Pero una separación silábica intencional se respeta tal cual
  assert.equal(fusionarAcordes('C       D', 'cán-ta--le mi alma'), '[C]cán-ta--[D]le mi alma');
});

t('lee una hoja completa del equipo', () => {
  const d = parseHoja(HOJA);
  assert.equal(d.titulo, '10.000 RAZONES');
  assert.equal(d.tonalidad, 'G');
  assert.equal(d.autor, 'Matt Redman');
  assert.ok(d.body.includes('{CORO}'));
  assert.ok(d.body.includes('[D/F#]'));
  assert.deepEqual(chordsUsed(d.body).slice(0, 4), ['C', 'G', 'D/F#', 'Em']);
});

t('vuelve al formato del equipo sin perder nada', () => {
  const d = parseHoja(HOJA);
  const song = { title: d.titulo, author: d.autor, key: d.tonalidad, body: d.body };
  const texto = toHojaTexto(song);
  assert.ok(texto.startsWith('10.000 RAZONES (G)\nMatt Redman'));
  const vuelta = parseHoja(texto);
  assert.equal(chordsUsed(vuelta.body).join(' '), chordsUsed(d.body).join(' '));
});

t('abrevia las repeticiones con (Igual) y deja el cierre completo', () => {
  const song = {
    title: 'Prueba', author: 'Equipo', key: 'G',
    body: `{Coro}\n[G]Una [D]línea\n\n{Verso 1}\n[Em]Otra [C]línea\n\n{Coro}\n[G]Una [D]línea\n\n{Final}\n[G]Una [D]línea\n`,
  };
  const doc = toHojaJSON(song);
  assert.equal(doc.bloques[0].etiqueta, 'CORO');
  assert.equal(doc.bloques[2].etiqueta, 'CORO (Igual)');
  assert.equal(doc.bloques[2].lineas, undefined, 'un bloque repetido no lleva líneas');
  // El último bloque (el cierre) siempre se escribe completo, aunque repita
  assert.ok(doc.bloques[3].lineas?.length, 'el final debe ir escrito completo');
});

t('numera las secciones en romano', () => {
  assert.equal(etiquetaSeccion('Verso 2'), 'VERSO II');
  assert.equal(etiquetaSeccion('Coro'), 'CORO');
});

t('genera un .docx válido', () => {
  const doc = toHojaJSON({ title: 'Prueba', author: 'Equipo', key: 'G', body: '{Coro}\n[G]Hola [D]mundo\n' });
  const bytes = buildDocx(doc);
  assert.equal(bytes[0], 0x50); // "PK": firma ZIP
  assert.equal(bytes[1], 0x4b);
  const texto = Buffer.from(bytes).toString('latin1');
  for (const parte of ['[Content_Types].xml', 'word/document.xml', '_rels/.rels']) {
    assert.ok(texto.includes(parte), `falta ${parte} en el paquete`);
  }
  assert.ok(texto.includes('PRUEBA (G)'), 'el título va con la tonalidad');
  assert.equal(docxFileName({ titulo: '10.000 RAZONES', tonalidad: 'G', autor: 'Matt Redman' }), '10.000 RAZONES (Matt Redman) (G).docx');
});

console.log(`\n${passed} pruebas OK`);
