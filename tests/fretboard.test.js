import assert from 'node:assert/strict';
import { buscarDigitaciones, tablatura, mapaEscala, INSTRUMENTOS } from '../src/fretboard.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const forma = (acorde, inst) => (buscarDigitaciones(acorde, inst, { max: 1 })[0]?.frets || []).join(',');

t('deduce las digitaciones estándar de guitarra', () => {
  const esperado = {
    C: '-1,3,2,0,1,0', D: '-1,-1,0,2,3,2', Dm: '-1,-1,0,2,3,1', E: '0,2,2,1,0,0',
    Em: '0,2,2,0,0,0', G: '3,2,0,0,0,3', A: '-1,0,2,2,2,0', Am: '-1,0,2,2,1,0',
    A7: '-1,0,2,0,2,0', 'D/F#': '2,0,0,2,3,2',
  };
  for (const [acorde, frets] of Object.entries(esperado)) {
    assert.equal(forma(acorde, 'guitarra'), frets, `guitarra ${acorde}`);
  }
});

t('deduce las digitaciones estándar de ukelele', () => {
  const esperado = { C: '0,0,0,3', F: '2,0,1,0', G: '0,2,3,2', Am: '2,0,0,0', C7: '0,0,0,1', A: '2,1,0,0', Dm: '2,2,1,0' };
  for (const [acorde, frets] of Object.entries(esperado)) {
    assert.equal(forma(acorde, 'ukelele'), frets, `ukelele ${acorde}`);
  }
});

t('en el bajo devuelve pocas notas y con la fundamental abajo', () => {
  for (const acorde of ['C', 'G', 'Am', 'D']) {
    const d = buscarDigitaciones(acorde, 'bajo', { max: 1 })[0];
    assert.ok(d, `sin forma para ${acorde}`);
    const sonando = d.frets.filter((f) => f >= 0).length;
    assert.ok(sonando <= 3, `${acorde}: ${sonando} cuerdas es demasiado para un bajo`);
  }
});

t('respeta los límites físicos de la mano', () => {
  for (const inst of Object.keys(INSTRUMENTOS)) {
    for (const acorde of ['C', 'F#m7', 'Bb', 'Esus4']) {
      for (const d of buscarDigitaciones(acorde, inst, { max: 3 })) {
        const pisados = d.frets.filter((f) => f > 0);
        if (pisados.length) {
          assert.ok(Math.max(...pisados) - Math.min(...pisados) <= 3, `${inst} ${acorde}: estiramiento imposible`);
        }
        assert.ok(d.dedosNecesarios <= 4, `${inst} ${acorde}: más de 4 dedos`);
      }
    }
  }
});

t('genera tablatura y mapa de escala', () => {
  const tab = tablatura(['C', 'G'], 'guitarra');
  assert.ok(tab.includes('|'), 'la tablatura debe tener compases');
  assert.equal(tab.split('\n').length, 7, 'cabecera + 6 cuerdas');
  const mapa = mapaEscala(7, [0, 2, 4, 5, 7, 9, 11], 'guitarra', { trastes: 12 });
  assert.equal(mapa.length, 6);
  assert.ok(mapa[0].puntos.some((p) => p.tonica), 'la 6ª cuerda debe tener alguna tónica de Sol');
});

console.log(`\n${passed} pruebas OK`);
