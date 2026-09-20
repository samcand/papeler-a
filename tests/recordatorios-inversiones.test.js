import assert from 'node:assert/strict';
import {
  alertasCartera, diversificacion, proximosVencimientos, rMultiplo, rebalanceo,
  resultadoOperacion, resumenOperaciones, tamanoPosicion, tareasDeCartera,
  valoraCartera, vencimientoOpciones,
} from '../recordatorios/src/inversiones.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('tamaño de posición: el riesgo manda, no las ganas', () => {
  // 10.000 de capital, 1 % de riesgo = 100; stop a 5 de distancia -> 20 acciones
  const r = tamanoPosicion({ capital: 10000, riesgoPct: 1, entrada: 100, stop: 95 });
  assert.equal(r.acciones, 20);
  assert.equal(r.riesgoMonto, 100);
  assert.equal(r.costo, 2000);
  assert.equal(r.exposicionPct, 20);
  assert.equal(r.distanciaPct, 5);
});

t('avisa cuando la posición se come la cartera', () => {
  const r = tamanoPosicion({ capital: 10000, riesgoPct: 2, entrada: 100, stop: 99.5, maxExposicionPct: 20 });
  assert.equal(r.acciones, 400);            // 200 de riesgo / 0,5 de distancia
  assert.ok(r.exposicionPct > 100);
  assert.ok(r.avisos.some((a) => /cartera/.test(a)));
  assert.ok(r.avisos.some((a) => /ruido normal/.test(a)));
});

t('rechaza un stop incoherente y la falta de stop', () => {
  assert.match(tamanoPosicion({ capital: 1000, entrada: 10, stop: 12 }).error, /por debajo/);
  assert.match(tamanoPosicion({ capital: 1000, entrada: 10, stop: 8, lado: 'corto' }).error, /por encima/);
  assert.match(tamanoPosicion({ capital: 1000, entrada: 10 }).error, /Sin stop/);
});

t('R múltiplo en largo y en corto', () => {
  assert.equal(rMultiplo({ entrada: 100, salida: 115, stop: 95 }), 3);
  assert.equal(rMultiplo({ entrada: 100, salida: 95, stop: 95 }), -1);
  assert.equal(rMultiplo({ entrada: 100, salida: 90, stop: 105, lado: 'corto' }), 2);
});

t('resultado de una operación cerrada, con comisiones', () => {
  const r = resultadoOperacion({ ticker: 'X', entrada: 100, salida: 110, cantidad: 10, stop: 95, comisiones: 5, fechaEntrada: '2026-01-05', fechaSalida: '2026-02-05' });
  assert.equal(r.pnl, 95);
  assert.equal(r.pnlPct, 9.5);
  assert.equal(r.r, 2);
  assert.equal(r.dias, 31);
});

t('estadísticas del diario: expectativa, factor de beneficio y racha', () => {
  const ops = [
    { ticker: 'A', entrada: 100, stop: 95, salida: 110, cantidad: 10, fechaSalida: '2026-01-10' }, // +100, 2R
    { ticker: 'B', entrada: 50, stop: 45, salida: 45, cantidad: 10, fechaSalida: '2026-02-10' },   // -50, -1R
    { ticker: 'C', entrada: 20, stop: 18, salida: 26, cantidad: 10, fechaSalida: '2026-03-10' },   // +60, 3R
    { ticker: 'D', entrada: 10, stop: 9, salida: 12, cantidad: 10, fechaSalida: '2026-04-10' },    // +20, 2R
    { ticker: 'E', entrada: 10, stop: 9, cantidad: 10 },                                           // abierta
  ];
  const s = resumenOperaciones(ops);
  assert.equal(s.total, 4);
  assert.equal(s.ganadas, 3);
  assert.equal(s.winRate, 75);
  assert.equal(s.pnl, 130);
  assert.equal(s.rTotal, 6);
  assert.equal(s.expectativaR, 1.5);
  assert.equal(s.factorBeneficio, 3.6); // 180 ganado / 50 perdido
  assert.equal(s.racha, 2);             // C y D seguidas
  assert.equal(s.mejor.ticker, 'C');
  assert.equal(s.peor.ticker, 'B');
});

t('valoración de cartera y pesos con efectivo', () => {
  const v = valoraCartera([
    { ticker: 'A', cantidad: 10, entrada: 100, precio: 120 },
    { ticker: 'B', cantidad: 10, entrada: 50, precio: 40 },
  ], 400);
  assert.equal(v.invertido, 1600);
  assert.equal(v.total, 2000);
  assert.equal(v.pnl, 100);
  assert.equal(v.pesoEfectivo, 20);
  assert.equal(v.filas[0].ticker, 'A');
  assert.equal(v.filas[0].peso, 60);
});

t('alertas: concentración, stop tocado, objetivo y tesis vieja', () => {
  const posiciones = [
    { ticker: 'NVDA', cantidad: 10, entrada: 100, precio: 200, sector: 'Tecnología', stop: 150, tesis: 'x', revisadaEn: '2026-09-01' },
    { ticker: 'KO', cantidad: 10, entrada: 60, precio: 55, sector: 'Consumo', tesis: 'y', revisadaEn: '2026-01-01' },
  ];
  const a = alertasCartera(posiciones, {}, '2026-09-20');
  const textos = a.map((x) => x.texto).join(' | ');
  assert.match(textos, /NVDA pesa/);
  assert.match(textos, /KO no tiene stop/);
  assert.match(textos, /KO lleva \d+ días sin revisar/);
  assert.equal(a[0].nivel, 'alto');
});

t('alerta fuerte cuando el precio ya cruzó el stop', () => {
  const a = alertasCartera([{ ticker: 'X', cantidad: 1, entrada: 100, precio: 90, stop: 95, tesis: 'z', sector: 'S' }], {}, '2026-09-20');
  assert.ok(a.some((x) => x.nivel === 'alto' && /está en su stop/.test(x.texto)));
});

t('diversificación y concentración por sector', () => {
  const d = diversificacion([
    { ticker: 'A', cantidad: 10, entrada: 10, precio: 10, sector: 'Tecnología' },
    { ticker: 'B', cantidad: 10, entrada: 10, precio: 10, sector: 'Tecnología' },
    { ticker: 'C', cantidad: 10, entrada: 10, precio: 10, sector: 'Salud' },
  ]);
  assert.equal(d.sectores[0].sector, 'Tecnología');
  assert.equal(d.sectores[0].peso, 66.67);
  assert.ok(d.hhi > 2500 === d.concentrado);
});

t('rebalanceo dice qué comprar y qué vender', () => {
  const movs = rebalanceo(
    [{ ticker: 'A', cantidad: 10, entrada: 100, precio: 100 }, { ticker: 'B', cantidad: 10, entrada: 100, precio: 100 }],
    { A: 25, B: 75 }, 0, 5);
  const a = movs.find((m) => m.ticker === 'A');
  const b = movs.find((m) => m.ticker === 'B');
  assert.equal(a.accion, 'vender');
  assert.equal(a.monto, 500);
  assert.equal(b.accion, 'comprar');
  assert.equal(b.acciones, 5);
});

t('vencimientos de opciones: tercer viernes', () => {
  assert.equal(vencimientoOpciones(2026, 8), '2026-09-18');
  assert.deepEqual(proximosVencimientos('2026-09-20', 3), ['2026-10-16', '2026-11-20', '2026-12-18']);
});

t('la cartera genera sus propios recordatorios', () => {
  const tareas = tareasDeCartera({
    posiciones: [
      { ticker: 'AAPL', cantidad: 10, entrada: 100, earnings: '2026-10-29', revisadaEn: '2026-01-01' },
      { ticker: 'KO', cantidad: 10, entrada: 60, exDividendo: '2026-10-01' },
    ],
    vigilancia: [{ ticker: 'MSFT', precioAlerta: 300 }],
  }, '2026-09-20');
  const titulos = tareas.map((t) => t.titulo);
  assert.ok(titulos.includes('Resultados de AAPL'));
  assert.equal(tareas.find((t) => t.titulo === 'Resultados de AAPL').fecha, '2026-10-26');
  assert.ok(titulos.includes('Ex-dividendo de KO'));
  assert.ok(titulos.some((x) => /Revisar la tesis de AAPL/.test(x)));
  assert.ok(titulos.some((x) => /Vigilar MSFT/.test(x)));
  assert.ok(tareas.every((t) => t.modulo === 'inversiones'));
});

console.log(`\n${passed} pruebas de inversiones OK`);
