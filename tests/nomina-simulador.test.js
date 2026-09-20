import assert from 'node:assert/strict';
import { costoContratar, presupuestoAnual, impactoNormativo, ESCENARIOS } from '../src/simulador.js';
import { smmlv, auxilioTransporte, recargoDescanso } from '../src/normativa.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };
const cerca = (a, b, tol = 2) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

const FECHA = '2026-09-30';
const MINIMO = smmlv(FECHA);

t('el costo del salario mínimo sale con auxilio y sin salud del empleador', () => {
  const c = costoContratar({ salario: MINIMO, fecha: FECHA, claseArl: 'I', exonerado: true });
  assert.equal(c.pagaAlTrabajador, MINIMO + auxilioTransporte(FECHA));
  assert.equal(c.aportes.empleador.salud, 0, 'exonerado');
  assert.equal(c.aportes.empleador.sena, 0);
  assert.ok(c.aportes.empleador.caja > 0, 'la caja siempre se paga');
  assert.equal(c.recibeNeto, c.pagaAlTrabajador - c.aportes.trabajador.total);
  assert.ok(c.factor > 1.4 && c.factor < 1.7, `factor razonable, salió ${c.factor}`);
  assert.equal(c.costoAnual, c.costoMensual * 12);
});

t('sin exoneración el costo sube', () => {
  const con = costoContratar({ salario: MINIMO, fecha: FECHA, exonerado: true });
  const sin = costoContratar({ salario: MINIMO, fecha: FECHA, exonerado: false });
  assert.ok(sin.costoMensual > con.costoMensual);
  cerca(sin.costoMensual - con.costoMensual,
    Math.round(MINIMO * 0.085) + Math.round(MINIMO * 0.02) + Math.round(MINIMO * 0.03), 3);
});

t('quien gana más de 2 salarios mínimos no lleva auxilio', () => {
  const c = costoContratar({ salario: MINIMO * 3, fecha: FECHA });
  assert.equal(c.auxilio, 0);
  assert.equal(c.pagaAlTrabajador, MINIMO * 3);
});

t('el salario integral no provisiona prima ni cesantías', () => {
  const c = costoContratar({ salario: MINIMO * 14, fecha: FECHA, salarioIntegral: true });
  assert.equal(c.provisiones.prima, 0);
  assert.equal(c.provisiones.cesantias, 0);
  assert.ok(c.provisiones.vacaciones > 0);
  assert.equal(c.auxilio, 0);
  cerca(c.ibc, Math.round(MINIMO * 14 * 0.7), 2);
});

t('la clase de riesgo cambia el costo', () => {
  const oficina = costoContratar({ salario: 3000000, fecha: FECHA, claseArl: 'I' });
  const altura = costoContratar({ salario: 3000000, fecha: FECHA, claseArl: 'V' });
  assert.ok(altura.costoMensual > oficina.costoMensual);
  assert.equal(altura.aportes.empleador.arl, Math.round(3000000 * 0.0696));
});

t('el presupuesto reparte los desembolsos grandes en su mes', () => {
  const p = presupuestoAnual({
    contratos: [{ id: 'c1', inicio: '2026-01-01', modalidad: 'mensual', salario: MINIMO, claseArl: 'I' }],
    anio: 2026,
    empresa: { exonerado: true },
  });
  assert.equal(p.meses.length, 12);
  assert.ok(p.meses.every((m) => m.activos === 1));
  assert.ok(p.meses[1].desembolsos.some((d) => d.concepto.includes('Cesantías')), 'febrero');
  assert.ok(p.meses[5].desembolsos.some((d) => d.concepto.includes('Prima')), 'junio');
  assert.ok(p.meses[11].desembolsos.some((d) => d.concepto.includes('Prima')), 'diciembre');
  assert.ok(p.meses[5].caja > p.meses[4].caja, 'en junio sale más plata');
  assert.equal(p.totalAnual, p.meses.reduce((s, m) => s + m.total, 0));
});

t('el presupuesto ignora los meses en que el contrato no existe', () => {
  const p = presupuestoAnual({
    contratos: [{ id: 'c1', inicio: '2026-07-01', modalidad: 'mensual', salario: MINIMO }],
    anio: 2026, empresa: {},
  });
  assert.equal(p.meses[0].activos, 0);
  assert.equal(p.meses[6].activos, 1);
  assert.equal(p.meses[0].total, 0);
});

t('el escenario del 100 % dominical calcula lo que sube', () => {
  const r = impactoNormativo({
    trabajadores: [{ nombre: 'María', salarioMes: MINIMO, horasDescansoMes: 24 }],
    escenario: 'dominical-100',
    fecha: FECHA,
  });
  const vh = MINIMO / 210;
  cerca(r.antes, Math.round(vh * 24 * recargoDescanso(FECHA).factor), 3);
  cerca(r.despues, Math.round(vh * 24 * 1.0), 3);
  assert.ok(r.diferenciaMes > 0);
  assert.equal(r.diferenciaAnual, r.diferenciaMes * 12);
  assert.equal(r.escenario.fecha, '2027-07-01');
});

t('el escenario del salario mínimo solo sube a quien está en el mínimo', () => {
  const r = impactoNormativo({
    trabajadores: [
      { nombre: 'En el mínimo', salarioMes: MINIMO },
      { nombre: 'Por encima', salarioMes: 6000000 },
    ],
    escenario: 'smmlv',
    fecha: FECHA,
    parametro: 0.10,
  });
  const enMinimo = r.filas[0];
  const arriba = r.filas[1];
  cerca(enMinimo.despues, Math.round(MINIMO * 1.1 + auxilioTransporte(FECHA) * 1.1), 3);
  assert.equal(arriba.diferencia, 0, 'quien gana 6 millones no se mueve');
});

t('bajar la jornada sube el valor de la hora y de los recargos', () => {
  const r = impactoNormativo({
    trabajadores: [{ nombre: 'María', salarioMes: MINIMO, horasExtraMes: 10, horasNocturnasMes: 20, horasDescansoMes: 8 }],
    escenario: 'jornada-40',
    fecha: FECHA,
  });
  assert.ok(r.diferenciaMes > 0, 'con 40 horas la hora ordinaria vale más');
  assert.ok(r.porcentaje > 0);
  assert.match(r.filas[0].concepto, /hora ordinaria pasa/);
});

t('los escenarios traen su norma y su fecha', () => {
  assert.equal(ESCENARIOS.length, 3);
  const dominical = ESCENARIOS.find((e) => e.id === 'dominical-100');
  assert.match(dominical.norma, /2466/);
  assert.equal(dominical.fecha, '2027-07-01');
});

console.log(`\n${passed} pruebas del simulador ✔`);
