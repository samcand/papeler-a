import assert from 'node:assert/strict';
import * as ley from '../nomina/src/normativa.js';
import * as calc from '../nomina/src/calculo.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };
const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

const MENSUAL = { modalidad: 'mensual', salario: 1750905, diasSemana: 6 };

t('los valores anuales salen de su decreto', () => {
  assert.equal(ley.smmlv('2026-05-10'), 1750905);
  assert.equal(ley.auxilioTransporte('2026-05-10'), 249095);
  assert.equal(ley.smmlv('2025-05-10'), 1423500);
  assert.equal(ley.uvt('2026-01-01'), 52374);
  assert.ok(ley.valoresAnuales('2030-01-01').estimado, 'un año futuro se marca como estimado');
});

t('la jornada máxima baja según la Ley 2101 de 2021', () => {
  assert.equal(ley.jornada('2023-01-01').horasSemana, 48);
  assert.equal(ley.jornada('2024-01-01').horasSemana, 47);
  assert.equal(ley.jornada('2025-01-01').horasSemana, 46);
  assert.equal(ley.jornada('2026-01-01').horasSemana, 44);
  assert.equal(ley.jornada('2026-07-15').horasSemana, 42);
  assert.equal(ley.jornada('2026-07-15').divisor, 210);
});

t('la jornada nocturna vuelve a las 7 p. m. el 25 de diciembre de 2025', () => {
  assert.equal(ley.franjaDiurna('2025-12-24').finDiurna, 21);
  assert.equal(ley.franjaDiurna('2025-12-25').finDiurna, 19);
});

t('el recargo del día de descanso sube por escalones', () => {
  assert.equal(ley.recargoDescanso('2025-06-30').factor, 0.75);
  assert.equal(ley.recargoDescanso('2025-07-01').factor, 0.80);
  assert.equal(ley.recargoDescanso('2026-06-30').factor, 0.80);
  assert.equal(ley.recargoDescanso('2026-07-01').factor, 0.90);
  assert.equal(ley.recargoDescanso('2027-07-01').factor, 1.00);
});

t('la hora ordinaria depende del divisor de la fecha', () => {
  cerca(calc.valorHora(MENSUAL, '2026-07-20'), 1750905 / 210);
  cerca(calc.valorHora(MENSUAL, '2026-05-20'), 1750905 / 220);
  cerca(calc.valorHora({ ...MENSUAL, divisorHoras: 240 }, '2026-07-20'), 1750905 / 240);
});

t('el día y el mes equivalente salen del jornal', () => {
  const jornal = { modalidad: 'jornal', valorDia: 80000, diasSemana: 6 };
  assert.equal(calc.valorDia(jornal, '2026-08-01'), 80000);
  assert.equal(calc.salarioMensualEquivalente(jornal, '2026-08-01'), 2400000);
  cerca(calc.valorHora(jornal, '2026-08-01'), 80000 / 7, 0.01);
});

t('parte el turno en diurnas, nocturnas y extras', () => {
  // Lunes 21 de septiembre de 2026, de 2 p. m. a 11 p. m.: 9 horas.
  // Jornada ordinaria de 7 horas (42 ÷ 6): 2 horas son extra.
  const { totales, horasTotales } = calc.clasificarTurno({
    fecha: '2026-09-21', inicio: '14:00', fin: '23:00', limiteOrdinarioDiario: 7,
  });
  assert.equal(horasTotales, 9);
  assert.equal(totales.ordinariaDiurna, 5, '2 p. m. a 7 p. m.');
  assert.equal(totales.ordinariaNocturna, 2, '7 p. m. a 9 p. m.');
  assert.equal(totales.extraNocturna, 2, '9 p. m. a 11 p. m.');
});

t('un turno que cruza la medianoche cuenta en los dos días', () => {
  const { segmentos } = calc.clasificarTurno({
    fecha: '2026-09-19', inicio: '20:00', fin: '04:00', limiteOrdinarioDiario: 8,
  });
  const fechas = [...new Set(segmentos.map((s) => s.fecha))];
  assert.deepEqual(fechas, ['2026-09-19', '2026-09-20']);
  const domingo = segmentos.filter((s) => s.fecha === '2026-09-20');
  assert.ok(domingo.every((s) => s.descanso), 'las horas del domingo llevan recargo dominical');
});

t('los factores de cada hora son los del Código', () => {
  const f = (opciones) => calc.factoresHora({ fecha: '2026-09-21', modalidad: 'mensual', ...opciones }).factor;
  cerca(f({ nocturna: true }), 0.35, 0.001);
  cerca(f({ extra: true }), 1.25, 0.001);
  cerca(f({ extra: true, nocturna: true }), 1.75, 0.001);
  // Domingo de septiembre de 2026: recargo del 90 %.
  cerca(calc.factoresHora({ fecha: '2026-09-20', descanso: true, compensatorio: true, modalidad: 'mensual' }).factor, 0.90, 0.001);
  cerca(calc.factoresHora({ fecha: '2026-09-20', descanso: true, modalidad: 'mensual' }).factor, 1.90, 0.001);
  cerca(calc.factoresHora({ fecha: '2026-09-20', descanso: true, extra: true, modalidad: 'mensual' }).factor, 2.15, 0.001);
  cerca(calc.factoresHora({ fecha: '2026-09-20', descanso: true, extra: true, nocturna: true, modalidad: 'mensual' }).factor, 2.65, 0.001);
  // En junio de 2026 el recargo todavía era del 80 %.
  cerca(calc.factoresHora({ fecha: '2026-06-21', descanso: true, compensatorio: true, modalidad: 'mensual' }).factor, 0.80, 0.001);
});

t('valoriza el turno completo', () => {
  const r = calc.valorizarTurno({ contrato: MENSUAL, fecha: '2026-09-21', inicio: '14:00', fin: '23:00' });
  const vh = 1750905 / 210;
  const esperado = Math.round(vh * 2 * 0.35) + Math.round(vh * 2 * 1.75);
  cerca(r.total, esperado, 2);
  assert.ok(r.conceptos.some((c) => c.incluidaEnSueldo), 'las ordinarias diurnas van dentro del sueldo');
});

t('avisa cuando se pasan los topes de horas extra', () => {
  assert.equal(calc.avisosExtras({ extrasDia: 2, extrasSemana: 12 }).length, 0);
  assert.equal(calc.avisosExtras({ extrasDia: 3, extrasSemana: 14 }).length, 2);
});

t('el fondo de solidaridad solo aplica desde 4 salarios mínimos', () => {
  const minimo = ley.smmlv('2026-01-01');
  assert.equal(ley.tarifaFsp(minimo * 3, '2026-01-01'), 0);
  assert.equal(ley.tarifaFsp(minimo * 4, '2026-01-01'), 0.01);
  assert.equal(ley.tarifaFsp(minimo * 17.5, '2026-01-01'), 0.014);
  assert.equal(ley.tarifaFsp(minimo * 24, '2026-01-01'), 0.02);
});

console.log(`\n${passed} pruebas de cálculo de horas y recargos ✔`);
