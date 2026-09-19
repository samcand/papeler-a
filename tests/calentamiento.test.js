import assert from 'node:assert/strict';
import { RUTINAS, construirRutina, DURACIONES, INSTRUMENTOS_CALENTAMIENTO, PRINCIPIOS } from '../src/calentamiento.js';
import { EJERCICIOS } from '../src/vocal.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('hay rutina para cada instrumento del selector', () => {
  for (const inst of INSTRUMENTOS_CALENTAMIENTO) {
    assert.ok(RUTINAS[inst.id]?.length, `falta la rutina de ${inst.id}`);
  }
  assert.ok(PRINCIPIOS.length >= 3);
});

t('la rutina nunca se pasa del tiempo pedido', () => {
  for (const inst of Object.keys(RUTINAS)) {
    for (const minutos of DURACIONES) {
      const r = construirRutina(inst, minutos);
      assert.ok(r.minutos <= minutos, `${inst} en ${minutos} min devolvió ${r.minutos}`);
      assert.ok(r.ejercicios.length > 0, `${inst} en ${minutos} min quedó vacía`);
      assert.ok(r.ejercicios.every((e) => e.minutos >= 1), 'ningún paso baja de un minuto');
    }
  }
});

t('lo esencial entra siempre, aunque haya poco tiempo', () => {
  for (const inst of Object.keys(RUTINAS)) {
    const esenciales = RUTINAS[inst].filter((e) => e.prioridad === 1).map((e) => e.id);
    const corta = construirRutina(inst, 5).ejercicios.map((e) => e.id);
    for (const id of esenciales) {
      assert.ok(corta.includes(id), `${inst}: falta el ejercicio esencial ${id} en la rutina de 5 minutos`);
    }
  }
});

t('con más tiempo se añaden ejercicios, no se repiten', () => {
  const corta = construirRutina('guitarra', 5).ejercicios;
  const larga = construirRutina('guitarra', 20).ejercicios;
  assert.ok(larga.length > corta.length);
  const ids = larga.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'no debe haber repetidos');
});

t('mantiene el orden de la rutina, no el de prioridad', () => {
  const orden = RUTINAS.piano.map((e) => e.id);
  const rutina = construirRutina('piano', 20).ejercicios.map((e) => e.id);
  const esperado = orden.filter((id) => rutina.includes(id));
  assert.deepEqual(rutina, esperado);
});

t('cada ejercicio explica qué, cómo y qué cuidar', () => {
  for (const [inst, lista] of Object.entries(RUTINAS)) {
    for (const ej of lista) {
      assert.ok(ej.nombre && ej.minutos >= 1, `${inst}/${ej.id}: falta nombre o duración`);
      if (ej.ejercicioVocal) {
        assert.ok(EJERCICIOS.some((v) => v.id === ej.ejercicioVocal),
          `${inst}/${ej.id}: apunta a un ejercicio vocal que no existe`);
      } else {
        assert.ok(ej.objetivo && ej.como && ej.cuidado, `${inst}/${ej.id}: le falta objetivo, cómo o cuidado`);
      }
    }
  }
});

console.log(`\n${passed} pruebas OK`);
