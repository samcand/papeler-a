import assert from 'node:assert/strict';
import { generador, pert, probabilidadDeLlegar, queSiPasa, resumenQueSiPasa, simularProyecto, triangular, trioDuraciones } from '../recordatorios/src/simulacion.js';
import { programar, proyectoVacio, tareaProyecto } from '../recordatorios/src/proyectos.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

function proyecto(tareas, inicio = '2026-09-21') {
  const p = proyectoVacio('Prueba', inicio);
  p.tareas = tareas;
  return p;
}
const T = (id, campos) => tareaProyecto({ id, ...campos });

t('el azar con semilla es reproducible', () => {
  const a = generador(42);
  const b = generador(42);
  const serieA = [a(), a(), a()];
  const serieB = [b(), b(), b()];
  assert.deepEqual(serieA, serieB);
  assert.ok(serieA.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(serieA, [generador(7)(), generador(7)(), generador(7)()]);
});

t('la triangular respeta los extremos y la moda', () => {
  assert.equal(triangular(0, 2, 5, 10), 2);
  assert.equal(triangular(1, 2, 5, 10), 10);
  const medio = triangular(0.5, 2, 5, 10);
  assert.ok(medio > 2 && medio < 10);
  assert.equal(triangular(0.5, 5, 5, 5), 5);     // sin incertidumbre, la moda
});

t('PERT: media ponderada y desviación', () => {
  const { te, sigma, varianza } = pert(4, 6, 14);
  assert.equal(te, 7);                      // (4 + 24 + 14) / 6
  assert.equal(sigma, 1.7);                 // (14 - 4) / 6
  assert.equal(varianza, 2.8);
});

t('las tres duraciones salen de tu factor si no las escribes', () => {
  const auto = trioDuraciones({ duracion: 10 }, 1.6);
  assert.equal(auto.m, 10);
  assert.equal(auto.o, 8.5);
  assert.equal(auto.p, 16);
  const propias = trioDuraciones({ duracion: 10, optimista: 7, pesimista: 30 });
  assert.deepEqual(propias, { o: 7, m: 10, p: 30 });
  // un hito no tiene incertidumbre
  assert.deepEqual(trioDuraciones({ duracion: 0 }, 2), { o: 0, m: 0, p: 0 });
});

t('sin incertidumbre, la simulación coincide con el plan', () => {
  const p = proyecto([
    T('a', { duracion: 5, optimista: 5, pesimista: 5 }),
    T('b', { duracion: 5, optimista: 5, pesimista: 5, dependencias: [{ de: 'a' }] }),
  ]);
  const sim = simularProyecto(p, { n: 200, semilla: 3 });
  assert.equal(sim.posible, true);
  assert.equal(sim.deterministico.dias, 10);
  assert.equal(sim.dias.p50, 10);
  assert.equal(sim.dias.p90, 10);
  assert.equal(sim.fechas.p50, sim.deterministico.fecha);
  assert.equal(sim.colchon, 0);
});

t('con incertidumbre, P80 va por detrás de P50 y del plan', () => {
  const p = proyecto([
    T('a', { duracion: 10 }),
    T('b', { duracion: 10, dependencias: [{ de: 'a' }] }),
    T('c', { duracion: 8, dependencias: [{ de: 'a' }] }),
  ]);
  const sim = simularProyecto(p, { n: 3000, semilla: 11, factor: 1.6 });
  assert.equal(sim.deterministico.dias, 20);
  assert.ok(sim.dias.p50 >= 20, 'la mediana no debería ser mejor que el plan optimista');
  assert.ok(sim.dias.p80 > sim.dias.p50);
  assert.ok(sim.dias.p90 >= sim.dias.p80);
  assert.ok(sim.colchon > 0, 'debería pedir colchón sobre la fecha del plan');
  assert.equal(sim.histograma.length, 12);
  assert.equal(sim.histograma.reduce((s, h) => s + h.n, 0), 3000);
  // misma semilla, mismo resultado
  assert.equal(simularProyecto(p, { n: 3000, semilla: 11, factor: 1.6 }).dias.p80, sim.dias.p80);
});

t('la probabilidad de llegar a una fecha crece con la fecha', () => {
  const p = proyecto([T('a', { duracion: 10 }), T('b', { duracion: 10, dependencias: [{ de: 'a' }] })]);
  const sim = simularProyecto(p, { n: 2000, semilla: 5 });
  const pronto = probabilidadDeLlegar(sim, sim.fechas.p10, p);
  const tarde = probabilidadDeLlegar(sim, sim.fechas.p90, p);
  assert.ok(pronto.probabilidad < tarde.probabilidad);
  assert.ok(tarde.probabilidad >= 80);
  assert.match(tarde.frase, /puedes prometer/);
  assert.match(pronto.frase, /optimista|retraso/);
});

t('avisa de que no puede simular un plan circular', () => {
  const p = proyecto([
    T('a', { duracion: 2, dependencias: [{ de: 'b' }] }),
    T('b', { duracion: 2, dependencias: [{ de: 'a' }] }),
  ]);
  assert.equal(simularProyecto(p).posible, false);
  assert.match(simularProyecto(p).motivo, /circulares/);
});

t('¿qué pasa si retraso una tarea? propaga y lo cuenta', () => {
  const p = proyecto([
    T('a', { nombre: 'Diseño', duracion: 5 }),
    T('b', { nombre: 'Construcción', duracion: 10, dependencias: [{ de: 'a' }] }),
    T('hito', { nombre: 'Entrega', duracion: 0, dependencias: [{ de: 'b' }] }),
  ]);
  const r = queSiPasa(p, [{ tareaId: 'a', dias: 4 }]);
  assert.equal(r.posible, true);
  assert.equal(r.diasProyecto, 4);
  assert.equal(r.movidas.length, 3);
  assert.equal(r.arrastradas, 2);
  assert.equal(r.hitos[0].nombre, 'Entrega');
  assert.match(resumenQueSiPasa(r), /4 días más tarde/);
  // y el plan real no se ha tocado
  assert.equal(programar(p).fin, r.finAntes);
  assert.ok(!p.tareas[0].noAntesDe, 'la simulación no debe fijar nada en el plan real');
});

t('si hay holgura, el cambio se la come y la fecha no se mueve', () => {
  const p = proyecto([
    T('larga', { nombre: 'Larga', duracion: 10 }),
    T('corta', { nombre: 'Corta', duracion: 3 }),
    T('fin', { nombre: 'Fin', duracion: 1, dependencias: [{ de: 'larga' }, { de: 'corta' }] }),
  ]);
  const r = queSiPasa(p, [{ tareaId: 'corta', dias: 4 }]);
  assert.equal(r.diasProyecto, 0);
  assert.match(resumenQueSiPasa(r), /no cambia/);
  assert.ok(r.movidas.some((m) => m.nombre === 'Corta'));
});

t('alargar una tarea puede cambiar la ruta crítica de sitio', () => {
  const p = proyecto([
    T('larga', { nombre: 'Larga', duracion: 10 }),
    T('corta', { nombre: 'Corta', duracion: 3 }),
    T('fin', { nombre: 'Fin', duracion: 1, dependencias: [{ de: 'larga' }, { de: 'corta' }] }),
  ]);
  const r = queSiPasa(p, [{ tareaId: 'corta', duracion: 20 }]);
  assert.equal(r.diasProyecto, 10);
  assert.ok(r.nuevasCriticas.includes('Corta'));
  assert.ok(r.yaNoCriticas.includes('Larga'));
});

console.log(`\n${passed} pruebas de simulación OK`);
