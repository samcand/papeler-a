import assert from 'node:assert/strict';
import { calcularIbc, liquidarAportes, provisiones } from '../nomina/src/seguridad.js';
import { retencionProcedimiento1, umbralRetencion } from '../nomina/src/retencion.js';
import { liquidarPeriodo, valorIncapacidadComun } from '../nomina/src/nomina.js';
import { smmlv, uvt } from '../nomina/src/normativa.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };
const cerca = (a, b, tol = 2) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

const FECHA = '2026-09-30';
const MINIMO = smmlv(FECHA);

t('el IBC tiene piso de un mínimo y techo de 25', () => {
  assert.equal(calcularIbc({ devengadoSalarial: 500000, fecha: FECHA }).ibc, MINIMO);
  assert.equal(calcularIbc({ devengadoSalarial: 999999999, fecha: FECHA }).ibc, MINIMO * 25);
  assert.equal(calcularIbc({ devengadoSalarial: 3000000, fecha: FECHA }).ibc, 3000000);
});

t('el piso del IBC baja con los días cotizados', () => {
  const medio = calcularIbc({ devengadoSalarial: 800000, fecha: FECHA, diasCotizados: 15 });
  cerca(medio.ibc, MINIMO / 2, 1);
});

t('el salario integral cotiza sobre el 70 %', () => {
  const r = calcularIbc({ devengadoSalarial: 30000000, fecha: FECHA, salarioIntegral: true });
  assert.equal(r.ibc, Math.round(30000000 * 0.7));
});

t('el trabajador aporta 4 % de salud y 4 % de pensión', () => {
  const a = liquidarAportes({ ibc: 2000000, fecha: FECHA, salarioMensual: 2000000 });
  assert.equal(a.trabajador.salud, 80000);
  assert.equal(a.trabajador.pension, 80000);
  assert.equal(a.trabajador.fsp, 0);
  assert.equal(a.trabajador.total, 160000);
});

t('la exoneración del 114-1 quita salud del empleador, SENA e ICBF', () => {
  const exonerado = liquidarAportes({ ibc: 2000000, fecha: FECHA, salarioMensual: 2000000, exonerado: true });
  assert.equal(exonerado.empleador.salud, 0);
  assert.equal(exonerado.empleador.sena, 0);
  assert.equal(exonerado.empleador.icbf, 0);
  assert.equal(exonerado.empleador.caja, 80000, 'la caja siempre se paga');

  const noExonerado = liquidarAportes({ ibc: 2000000, fecha: FECHA, salarioMensual: 2000000, exonerado: false });
  assert.equal(noExonerado.empleador.salud, 170000);
  assert.equal(noExonerado.empleador.sena, 40000);
  assert.equal(noExonerado.empleador.icbf, 60000);
});

t('quien gana 10 salarios mínimos o más no está exonerado', () => {
  const alto = liquidarAportes({ ibc: MINIMO * 11, fecha: FECHA, salarioMensual: MINIMO * 11, exonerado: true });
  assert.ok(!alto.aplicaExoneracion);
  assert.ok(alto.empleador.salud > 0);
  assert.ok(alto.trabajador.fsp > 0, 'y paga fondo de solidaridad');
});

t('la ARL cambia con la clase de riesgo', () => {
  const oficina = liquidarAportes({ ibc: 2000000, fecha: FECHA, salarioMensual: 2000000, claseArl: 'I' });
  const construccion = liquidarAportes({ ibc: 2000000, fecha: FECHA, salarioMensual: 2000000, claseArl: 'V' });
  assert.equal(oficina.empleador.arl, Math.round(2000000 * 0.00522));
  assert.equal(construccion.empleador.arl, Math.round(2000000 * 0.0696));
});

t('las provisiones suman el 21,83 % del salario', () => {
  const p = provisiones({ baseMes: 2000000, baseSinAuxilio: 1750905 });
  assert.equal(p.prima, 166600);
  assert.equal(p.cesantias, 166600);
  assert.equal(p.intereses, 19992);
  cerca(p.vacaciones, Math.round(1750905 * 0.0417), 1);
});

t('no hay retención por debajo de 95 UVT de base gravable', () => {
  assert.equal(umbralRetencion('2026-01-01'), Math.round(95 * uvt('2026-01-01')));
  const r = retencionProcedimiento1({ ingresoLaboral: 4000000, fecha: FECHA, aportesObligatorios: 320000 });
  assert.equal(r.retencion, 0);
});

t('la retención sigue la tabla del artículo 383', () => {
  const r = retencionProcedimiento1({ ingresoLaboral: 10000000, fecha: FECHA, aportesObligatorios: 800000 });
  // 10.000.000 − 800.000 = 9.200.000; menos 25 % exento = 6.900.000 = 131,74 UVT
  cerca(r.baseUvt, 131.74, 0.05);
  cerca(r.retencion, Math.round((131.74 - 95) * 0.19 * uvt(FECHA)), 60);
});

t('el tope del 40 % limita las deducciones', () => {
  const r = retencionProcedimiento1({
    ingresoLaboral: 12000000, fecha: FECHA, aportesObligatorios: 960000,
    deducciones: { vivienda: 4000000, salud: 800000 }, tieneDependientes: true,
  });
  const ingresoNeto = 12000000 - 960000;
  assert.ok(r.baseGravable >= ingresoNeto * 0.6 - 2, 'nunca se baja de más del 40 %');
});

t('la incapacidad común se paga al 66,67 % y nunca bajo el mínimo', () => {
  const alta = valorIncapacidadComun({ salarioMensual: 6000000, dias: 10, fecha: FECHA });
  cerca(alta.valor, Math.round((6000000 / 30) * (2 / 3) * 10), 10);
  assert.ok(alta.aCargoEmpleador > 0 && alta.aCargoEps > 0, 'los dos primeros días son del empleador');

  const minima = valorIncapacidadComun({ salarioMensual: MINIMO, dias: 30, fecha: FECHA });
  assert.equal(minima.valor, Math.round((MINIMO / 30) * 30), 'se sube al mínimo');
});

t('liquida un mes con salario mínimo, extras y un domingo trabajado', () => {
  const contrato = { id: 'c1', modalidad: 'mensual', salario: MINIMO, diasSemana: 6, claseArl: 'I' };
  const r = liquidarPeriodo({
    contrato,
    empresa: { exonerado: true },
    desde: '2026-09-01',
    hasta: '2026-09-30',
    novedades: {
      '2026-09-05': { tipo: 'trabajo', inicio: '08:00', fin: '18:00' },
      '2026-09-20': { tipo: 'trabajo', inicio: '08:00', fin: '14:00' },
    },
  });
  const buscar = (txt) => r.devengados.find((d) => d.concepto.includes(txt));
  assert.equal(buscar('Salario').valor, MINIMO);
  assert.equal(buscar('Auxilio').valor, 249095, 'el auxilio va completo con 30 días');
  assert.ok(buscar('extra diurna').valor > 0, 'las horas de más del sábado son extra');
  const domingo = buscar('día de descanso');
  cerca(domingo.valor, Math.round((MINIMO / 210) * 6 * 1.9), 5, 'domingo al 90 % más el día');
  assert.equal(r.ibc, r.devengadoSalarial, 'el auxilio no entra al IBC');
  assert.equal(r.totalDeducciones, r.aportes.trabajador.total, 'sin retención con salario mínimo');
  assert.equal(r.neto, r.totalDevengado - r.totalDeducciones);
  assert.ok(r.costoTotal > r.totalDevengado, 'el costo incluye aportes y provisiones');
});

t('descuenta los días no remunerados y baja el IBC', () => {
  const contrato = { id: 'c2', modalidad: 'mensual', salario: 3000000, diasSemana: 6 };
  const novedades = {};
  for (const dia of ['07', '08', '09', '10', '11']) {
    novedades[`2026-09-${dia}`] = { tipo: 'licencia-no-remunerada' };
  }
  const r = liquidarPeriodo({ contrato, desde: '2026-09-01', hasta: '2026-09-30', novedades });
  assert.equal(r.dias.noRemunerados, 5);
  assert.equal(r.diasSalario, 25);
  assert.equal(r.devengados[0].valor, Math.round((3000000 / 30) * 25));
  assert.equal(r.diasCotizados, 25);
});

t('a quien se le paga por día se le pagan los domingos de la semana completa', () => {
  const contrato = { id: 'c3', modalidad: 'jornal', valorDia: 80000, diasSemana: 6 };
  const novedades = {};
  // Del lunes 7 al sábado 12 de septiembre de 2026, semana completa.
  for (const dia of ['07', '08', '09', '10', '11', '12']) {
    novedades[`2026-09-${dia}`] = { tipo: 'trabajo' };
  }
  const r = liquidarPeriodo({ contrato, desde: '2026-09-07', hasta: '2026-09-13', novedades });
  const jornales = r.devengados.find((d) => d.concepto === 'Jornales');
  const descanso = r.devengados.find((d) => d.concepto.includes('Descanso dominical'));
  assert.equal(jornales.valor, 80000 * 6);
  assert.equal(descanso.valor, 80000, 'el domingo se paga aunque no se trabaje');
});

t('si la semana queda incompleta no se paga el descanso', () => {
  const contrato = { id: 'c4', modalidad: 'jornal', valorDia: 80000, diasSemana: 6 };
  const novedades = {
    '2026-09-07': { tipo: 'trabajo' },
    '2026-09-08': { tipo: 'trabajo' },
  };
  const r = liquidarPeriodo({ contrato, desde: '2026-09-07', hasta: '2026-09-13', novedades });
  assert.ok(!r.devengados.some((d) => d.concepto.includes('Descanso dominical')));
  assert.ok(r.avisos.some((a) => a.includes('incompletas')));
});

t('los pagos no salariales que pasan del 40 % entran al IBC', () => {
  const contrato = { id: 'c5', modalidad: 'mensual', salario: 2000000, diasSemana: 6 };
  const r = liquidarPeriodo({
    contrato, desde: '2026-09-01', hasta: '2026-09-30', novedades: {},
    extras: { noSalariales: 3000000 },
  });
  assert.ok(r.ibc > 2000000, 'el exceso se suma al IBC');
  assert.ok(r.avisos.some((a) => a.includes('40 %')));
});

console.log(`\n${passed} pruebas de aportes, retención y nómina ✔`);
