import assert from 'node:assert/strict';
import * as pres from '../nomina/src/prestaciones.js';
import { liquidacionFinal, indemnizacion, sancionMoratoria, describirTiempo } from '../nomina/src/liquidacion.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };
const cerca = (a, b, tol = 2) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

const BASE = pres.baseLiquidacion({ salarioMensual: 1750905, auxilioTransporte: 249095 });

t('la base de prestaciones incluye el auxilio, la de vacaciones no', () => {
  assert.equal(BASE.conAuxilio, 2000000);
  assert.equal(BASE.sinAuxilio, 1750905);
});

t('un año completo da 30 días de prima y 30 de cesantías', () => {
  assert.equal(pres.prima({ base: BASE.conAuxilio, dias: 360 }).valor, 2000000);
  assert.equal(pres.cesantias({ base: BASE.conAuxilio, dias: 360 }).valor, 2000000);
  assert.equal(pres.prima({ base: BASE.conAuxilio, dias: 180 }).valor, 1000000, 'medio año, media prima');
});

t('los intereses son el 12 % anual de las cesantías', () => {
  const ces = pres.cesantias({ base: BASE.conAuxilio, dias: 360 });
  assert.equal(pres.interesesCesantias({ valorCesantias: ces.valor, dias: 360 }).valor, 240000);
  assert.equal(pres.interesesCesantias({ valorCesantias: ces.valor, dias: 180 }).valor, 120000);
});

t('las vacaciones son 15 días de salario al año, sin auxilio', () => {
  const v = pres.vacaciones({ base: BASE.sinAuxilio, dias: 360 });
  assert.equal(v.diasCausados, 15);
  cerca(v.valor, 1750905 / 2);
});

t('lleva el saldo de vacaciones', () => {
  const saldo = pres.saldoVacaciones({ ingreso: '2024-01-01', corte: '2026-01-01', diasDisfrutados: 15 });
  assert.equal(saldo.diasTrabajados, 721);
  cerca(saldo.causados, 30.04, 0.05);
  cerca(saldo.pendientes, 15.04, 0.05);
});

t('sabe a qué semestre de prima pertenece una fecha', () => {
  assert.equal(pres.semestreDe('2026-03-10').fin, '2026-06-30');
  assert.equal(pres.semestreDe('2026-09-10').limite, '2026-12-20');
});

t('conoce las fechas límite del año y el derecho a dotación', () => {
  const fechas = pres.obligacionesDelAnio(2026).map((o) => o.fecha);
  assert.ok(fechas.includes('2026-01-31'), 'intereses de cesantías');
  assert.ok(fechas.includes('2026-02-14'), 'consignación de cesantías');
  assert.ok(fechas.includes('2026-06-30'), 'prima del primer semestre');
  const conDerecho = pres.derechoDotacion({ salarioMensual: 1750905, ingreso: '2025-01-01', corte: '2026-09-01' });
  assert.ok(conDerecho.tiene);
  const sinDerecho = pres.derechoDotacion({ salarioMensual: 6000000, ingreso: '2025-01-01', corte: '2026-09-01' });
  assert.ok(!sinDerecho.tiene, 'más de 2 salarios mínimos no da dotación');
  const reciente = pres.derechoDotacion({ salarioMensual: 1750905, ingreso: '2026-08-01', corte: '2026-09-01' });
  assert.ok(!reciente.tiene, 'hay que llevar más de 3 meses');
});

t('la indemnización del artículo 64 depende del salario y la antigüedad', () => {
  const comun = { tipoContrato: 'indefinido', salarioMensual: 2000000, ingreso: '2025-01-01', terminacion: '2025-06-30' };
  assert.equal(indemnizacion(comun).dias, 30, 'menos de un año: 30 días');

  const dosAnios = indemnizacion({ ...comun, terminacion: '2027-01-01' });
  cerca(dosAnios.dias, 50.06, 0.1, '30 + 20 por el segundo año');

  const alto = indemnizacion({
    tipoContrato: 'indefinido', salarioMensual: 20000000, ingreso: '2024-01-01', terminacion: '2026-01-01', fecha: '2026-01-01',
  });
  cerca(alto.dias, 35.03, 0.1, 'con 10 salarios mínimos o más: 20 + 15');

  const fijo = indemnizacion({
    tipoContrato: 'fijo', salarioMensual: 2000000, ingreso: '2026-01-01',
    terminacion: '2026-06-30', finPactado: '2026-12-31',
  });
  assert.equal(fijo.dias, 184, 'los salarios que faltan del plazo');

  const obra = indemnizacion({
    tipoContrato: 'obra', salarioMensual: 2000000, ingreso: '2026-01-01', terminacion: '2026-06-30', finPactado: '',
  });
  assert.equal(obra.dias, 15, 'mínimo 15 días en obra o labor');
});

t('la sanción moratoria es un día de salario por día de mora', () => {
  const s = sancionMoratoria({ salarioMensual: 3000000, terminacion: '2026-01-01', fechaPago: '2026-02-01' });
  assert.equal(s.diasRetardo, 30);
  assert.equal(s.valor, 3000000);
  const tope = sancionMoratoria({ salarioMensual: 3000000, terminacion: '2020-01-01', fechaPago: '2026-01-01' });
  assert.ok(tope.tope, 'pasados 24 meses se topa');
  assert.equal(tope.valor, Math.round((3000000 / 30) * 720));
});

t('liquida un contrato completo de dos años y medio', () => {
  const r = liquidacionFinal({
    ingreso: '2024-03-01',
    terminacion: '2026-09-20',
    tipoContrato: 'indefinido',
    motivo: 'sin-justa-causa',
    salarioMensual: 1750905,
    auxilioTransporte: 249095,
    cesantiasPagadasHasta: '2025-12-31',
    primaPagadaHasta: '2026-06-30',
    diasVacacionesDisfrutados: 15,
    diasSalarioPendientes: 20,
  });
  assert.equal(r.diasTotales, 920);
  assert.equal(r.tiempoServicio, '2 años, 6 meses, 20 días');
  assert.equal(r.detalleCortes.diasCesantias, 260, 'desde el 1 de enero de 2026');
  assert.equal(r.detalleCortes.diasPrima, 80, 'desde el 1 de julio de 2026');

  const concepto = (nombre) => r.conceptos.find((c) => c.concepto.startsWith(nombre)).valor;
  cerca(concepto('Cesantías'), Math.round((2000000 * 260) / 360));
  cerca(concepto('Prima'), Math.round((2000000 * 80) / 360));
  cerca(concepto('Intereses'), Math.round((1444444 * 260 * 0.12) / 360), 5);
  cerca(concepto('Indemnización'), Math.round((1750905 / 30) * (30 + (560 * 20) / 360)), 5);
  assert.equal(r.neto, r.totalDevengado);
});

t('el salario integral no causa prima ni cesantías', () => {
  const r = liquidacionFinal({
    ingreso: '2025-01-01', terminacion: '2026-01-01', tipoContrato: 'indefinido',
    motivo: 'renuncia', salarioMensual: 25000000, salarioIntegral: true,
  });
  assert.ok(!r.conceptos.some((c) => c.concepto === 'Cesantías'));
  assert.ok(r.conceptos.some((c) => c.concepto.startsWith('Vacaciones')), 'las vacaciones sí se pagan');
  assert.ok(r.avisos.some((a) => a.includes('integral')));
});

t('la renuncia no genera indemnización', () => {
  const r = liquidacionFinal({
    ingreso: '2024-01-01', terminacion: '2026-01-01', motivo: 'renuncia', salarioMensual: 2000000,
  });
  assert.equal(r.indemnizacion, null);
  assert.ok(!r.conceptos.some((c) => c.concepto.includes('Indemnización')));
});

t('describe el tiempo de servicio en palabras', () => {
  assert.equal(describirTiempo(360), '1 año');
  assert.equal(describirTiempo(395), '1 año, 1 mes, 5 días');
  assert.equal(describirTiempo(15), '15 días');
});

console.log(`\n${passed} pruebas de prestaciones y liquidación ✔`);
