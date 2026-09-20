import assert from 'node:assert/strict';
import { dias360, diasCalendario, sumarMeses, minutos, aHHMM, formatoLargo } from '../src/fechas.js';
import { pascua, festivos, esFestivo, alLunes, diasHabiles, finDeVacaciones } from '../src/festivos.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };

t('el año comercial tiene 360 días y el semestre 180', () => {
  assert.equal(dias360('2026-01-01', '2026-12-31'), 360);
  assert.equal(dias360('2026-01-01', '2026-06-30'), 180);
  assert.equal(dias360('2026-07-01', '2026-12-31'), 180);
});

t('los meses valen 30 días aunque tengan 31', () => {
  assert.equal(dias360('2026-03-01', '2026-03-31'), 30);
  assert.equal(dias360('2026-04-01', '2026-04-30'), 30);
});

t('febrero se completa a 30 solo si se trabajó entero', () => {
  assert.equal(dias360('2026-02-01', '2026-02-28'), 30);
  assert.equal(dias360('2026-02-10', '2026-02-28'), 19);
  assert.equal(dias360('2024-02-01', '2024-02-29'), 30, 'año bisiesto');
});

t('cuenta los días calendario reales', () => {
  assert.equal(diasCalendario('2026-01-01', '2026-01-31'), 30);
  assert.equal(diasCalendario('2026-03-01', '2026-03-31'), 30);
});

t('suma meses respetando el último día', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2026-12-15', 1), '2027-01-15');
});

t('lee y escribe horas', () => {
  assert.equal(minutos('19:30'), 19 * 60 + 30);
  assert.equal(aHHMM(1170), '19:30');
  assert.equal(formatoLargo('2026-07-15'), '15 de julio de 2026');
});

t('calcula la Pascua', () => {
  assert.equal(pascua(2024), '2024-03-31');
  assert.equal(pascua(2025), '2025-04-20');
  assert.equal(pascua(2026), '2026-04-05');
  assert.equal(pascua(2027), '2027-03-28');
});

t('traslada al lunes los festivos de la Ley Emiliani', () => {
  assert.equal(alLunes('2026-01-06'), '2026-01-12', 'Reyes cae martes en 2026');
  assert.equal(alLunes('2026-06-29'), '2026-06-29', 'San Pedro ya cae lunes');
});

t('los festivos de 2026 son los 18 que manda la ley', () => {
  const lista = festivos(2026).map((f) => f.fecha);
  assert.equal(lista.length, 18);
  for (const fecha of [
    '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01',
    '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07',
    '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
  ]) {
    assert.ok(lista.includes(fecha), `falta el festivo ${fecha}`);
  }
});

t('junta dos festivos que caen el mismo día', () => {
  const junio2025 = festivos(2025).find((f) => f.fecha === '2025-06-30');
  assert.ok(junio2025.nombre.includes('San Pedro'));
  assert.ok(junio2025.nombre.includes('Sagrado Corazón'));
  assert.equal(festivos(2025).length, 17, 'en 2025 coinciden dos festivos');
});

t('reconoce festivos y cuenta días hábiles', () => {
  assert.ok(esFestivo('2026-07-20'));
  assert.ok(!esFestivo('2026-07-21'));
  // Del lunes 6 al viernes 10 de julio de 2026: 5 hábiles.
  assert.equal(diasHabiles('2026-07-06', '2026-07-10'), 5);
  // La semana del 20 de julio tiene el festivo del lunes.
  assert.equal(diasHabiles('2026-07-20', '2026-07-25'), 5);
});

t('15 días hábiles de vacaciones saltan domingos y festivos', () => {
  // Desde el lunes 6 de julio de 2026; el lunes 20 es festivo.
  assert.equal(finDeVacaciones('2026-07-06', 15), '2026-07-23');
});

console.log(`\n${passed} pruebas de fechas y festivos ✔`);
