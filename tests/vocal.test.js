import assert from 'node:assert/strict';
import {
  clasificarVoz, nombreNota, nombreANota, rangoEstimado, rangoDeMelodia,
  tonalidadesRecomendadas, repartirVoces, secuenciaEjercicio, EJERCICIOS, notaArmonia,
  RANGO_CONGREGACION,
} from '../src/vocal.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('convierte nombres de nota', () => {
  assert.equal(nombreNota(60), 'C4');
  assert.equal(nombreANota('C4'), 60);
  assert.equal(nombreANota('A2'), 45);
  assert.equal(nombreANota('no es nota'), null);
});

t('clasifica la voz por su rango', () => {
  assert.equal(clasificarVoz(45, 64).nombre, 'Barítono');   // A2 – E4
  assert.equal(clasificarVoz(60, 81).nombre, 'Soprano');    // C4 – A5
  assert.equal(clasificarVoz(40, 60).nombre, 'Bajo');
  assert.equal(clasificarVoz(null, 60), null);
});

t('no opina de la congregación cuando el rango es una estimación', () => {
  const r = tonalidadesRecomendadas({ key: 'A' });
  assert.equal(r.estimado, true);
  assert.ok(r.aviso, 'debe avisar que el rango está estimado');
  assert.equal(r.mejor.semis, 0, 'sin datos reales no se recomienda transponer');
  assert.deepEqual(r.opciones.find((o) => o.semis === 0).avisos, []);
});

t('con la melodía medida sí recomienda y explica', () => {
  // Melodía que llega a F#4: por encima de donde canta una congregación
  const song = { key: 'A', rangoVocal: { min: 52, max: 66, tesitura: [55, 64] } };
  const r = tonalidadesRecomendadas(song);
  assert.equal(r.estimado, false);
  const original = r.opciones.find((o) => o.semis === 0);
  assert.ok(original.avisos.some((a) => /congregación/.test(a)), 'debe avisar del pico alto');
  assert.ok(r.mejor.max <= RANGO_CONGREGACION.max + 1, 'la mejor opción no debe pasarse de rango');
});

t('elige tonalidades distintas según quién canta', () => {
  const song = { key: 'A', rangoVocal: { min: 52, max: 66, tesitura: [55, 64] } };
  const baritono = { min: 45, max: 64, comoda: [47, 62] };
  const soprano = { min: 60, max: 79, comoda: [62, 77] };
  const paraBaritono = tonalidadesRecomendadas(song, baritono).mejor;
  const paraSoprano = tonalidadesRecomendadas(song, soprano).mejor;
  assert.ok(paraBaritono.semis < 0, 'para un barítono debe bajar');
  assert.ok(paraSoprano.semis > 0, 'para una soprano debe subir');
});

t('mide el rango de una melodía transcrita', () => {
  const notas = [{ midi: 60 }, { midi: 64 }, { midi: 67 }, { midi: 62 }, { midi: 72 }];
  const r = rangoDeMelodia(notas);
  assert.equal(r.min, 60);
  assert.equal(r.max, 72);
  assert.equal(rangoDeMelodia([]), null);
});

t('reparte las voces del equipo', () => {
  const equipo = [
    { nombre: 'Ana', min: 57, max: 77 },
    { nombre: 'Luis', min: 45, max: 64 },
    { nombre: 'Sofía', min: 53, max: 72 },
  ];
  const reparto = repartirVoces(equipo, { key: 'G' });
  assert.equal(reparto.length, 3);
  assert.match(reparto[0].papel, /Melodía/);
  assert.ok(reparto.every((r) => r.papel));
});

t('las armonías se mueven dentro de la tonalidad', () => {
  // En Do: sobre Mi la tercera es Sol (menor); sobre Fa es La (mayor)
  assert.equal(nombreNota(notaArmonia(64, 'C', 'tercera-arriba')), 'G4');
  assert.equal(nombreNota(notaArmonia(65, 'C', 'tercera-arriba')), 'A4');
  assert.equal(nombreNota(notaArmonia(60, 'C', 'octava')), 'C5');
  assert.equal(nombreNota(notaArmonia(60, 'C', 'unisono')), 'C4');
});

t('genera la serie de un ejercicio dentro del rango', () => {
  const pasos = secuenciaEjercicio(EJERCICIOS[0], { desde: 55, hasta: 60 });
  assert.equal(pasos.length, 6);
  assert.equal(pasos[0].notas[0], 55);
  assert.deepEqual(pasos[0].notas, EJERCICIOS[0].patron.map((s) => 55 + s));
});

console.log(`\n${passed} pruebas OK`);
