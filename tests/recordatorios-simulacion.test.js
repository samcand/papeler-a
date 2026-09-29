import assert from 'node:assert/strict';
import { compararPlanes, generador, pert, probabilidadDeLlegar, queSiPasa, resumenQueSiPasa, simularAusencia, simularProyecto, triangular, trioDuraciones } from '../recordatorios/src/simulacion.js';
import { casiCriticas, curvaS, margenHitos, problemasDePlan, programar, proyectoVacio, tareaProyecto, valorGanado } from '../recordatorios/src/proyectos.js';

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

t('simular una ausencia empuja solo las tareas de esa persona', () => {
  const p = proyecto([
    T('a', { nombre: 'Análisis', duracion: 5, recurso: 'Yo' }),
    T('b', { nombre: 'Compras', duracion: 5, recurso: 'Ana' }),
    T('c', { nombre: 'Redacción', duracion: 5, recurso: 'Yo', dependencias: [{ de: 'a' }] }),
  ]);
  // 21 sep a 25 sep es la primera semana: "Análisis" cae dentro
  const r = simularAusencia(p, { recurso: 'Yo', desde: '2026-09-21', hasta: '2026-09-25' });
  assert.equal(r.posible, true);
  assert.equal(r.diasFuera, 5);
  assert.deepEqual(r.afectadas.map((t) => t.nombre), ['Análisis']);
  assert.equal(r.diasProyecto, 5);
  assert.match(r.frase, /se van al otro lado de la ausencia/);
  // Ana no se mueve
  assert.ok(!r.movidas.some((m) => m.nombre === 'Compras'));
  // y el plan real sigue intacto
  assert.equal(programar(p).fin, r.finAntes);
});

t('una ausencia en un hueco con holgura no mueve la fecha final', () => {
  const p = proyecto([
    T('larga', { nombre: 'Larga', duracion: 20, recurso: 'Ana' }),
    T('corta', { nombre: 'Corta', duracion: 2, recurso: 'Yo' }),
    T('fin', { nombre: 'Fin', duracion: 1, dependencias: [{ de: 'larga' }, { de: 'corta' }] }),
  ]);
  const r = simularAusencia(p, { recurso: 'Yo', desde: '2026-09-21', hasta: '2026-09-25' });
  assert.equal(r.diasProyecto, 0);
  assert.match(r.frase, /la holgura absorbe la ausencia/);
});

t('si no hay nada planificado, la ausencia no duele', () => {
  const p = proyecto([T('a', { nombre: 'A', duracion: 5, recurso: 'Ana' })]);
  const r = simularAusencia(p, { recurso: 'Yo', desde: '2026-09-21', hasta: '2026-09-25' });
  assert.equal(r.afectadas.length, 0);
  assert.match(r.frase, /puede irse tranquilo/);
  assert.equal(simularAusencia(p, { recurso: 'Yo' }).posible, false);
});

t('comparar dos planes cuenta lo que se movió', () => {
  const p = proyecto([T('a', { nombre: 'A', duracion: 5 }), T('b', { nombre: 'B', duracion: 5, dependencias: [{ de: 'a' }] })]);
  const antes = programar(p);
  p.tareas[0].duracion = 8;
  const c = compararPlanes(antes, programar(p), p.calendario, ['a']);
  assert.equal(c.diasProyecto, 3);
  assert.equal(c.movidas.length, 2);
  assert.equal(c.arrastradas, 1);
});

t('valor ganado en esfuerzo: días de trabajo en vez de euros', () => {
  const p = proyecto([
    T('a', { duracion: 10, avance: 100, diasReales: 13 }),
    T('b', { duracion: 10, avance: 0, dependencias: [{ de: 'a' }] }),
  ]);
  const ev = valorGanado(programar(p), '2026-10-02', { unidad: 'esfuerzo' });
  assert.equal(ev.unidad, 'días');
  assert.equal(ev.bac, 20);
  assert.equal(ev.ev, 10);
  assert.equal(ev.ac, 13);
  assert.equal(ev.hayReales, true);
  assert.ok(ev.cpi < 1);
  assert.equal(ev.cpi, 0.77);                  // 10 ganados por 13 gastados
  assert.equal(ev.eac, 25.97);                 // 20 / 0,77
  assert.equal(ev.vac, -5.97);                 // te pasarás del presupuesto
  assert.equal(ev.etc, 12.97);                 // lo que falta por invertir
  assert.ok(ev.tcpi > 1);                      // habría que ir más rápido de lo previsto
});

t('sin datos reales, el CPI no se inventa', () => {
  const p = proyecto([T('a', { duracion: 10, avance: 50 })]);
  const ev = valorGanado(programar(p), '2026-09-25', { unidad: 'esfuerzo' });
  assert.equal(ev.hayReales, false);
  assert.equal(ev.cpi, null);
  assert.equal(ev.variacionCosto, null);
  assert.equal(ev.eac, ev.bac);
});

t('la curva S sube hasta el 100 % del presupuesto', () => {
  const p = proyecto([
    T('a', { duracion: 10, costo: 1000 }),
    T('b', { duracion: 10, costo: 1000, dependencias: [{ de: 'a' }] }),
  ]);
  const c = curvaS(programar(p), '2026-10-02');
  assert.ok(c.puntos.length >= 4);
  assert.equal(c.puntos[0].pct >= 0, true);
  assert.equal(c.puntos[c.puntos.length - 1].pct, 100);
  assert.ok(c.puntos.every((x, i) => i === 0 || x.pv >= c.puntos[i - 1].pv), 'la curva no puede bajar');
  assert.equal(c.hoy.bac, 2000);
});

t('ruta casi crítica y margen hasta los hitos', () => {
  const p = proyecto([
    T('larga', { nombre: 'Larga', duracion: 10 }),
    T('casi', { nombre: 'Casi', duracion: 8 }),
    T('sobrada', { nombre: 'Sobrada', duracion: 2 }),
    T('hito', { nombre: 'Entrega', duracion: 0, dependencias: [{ de: 'larga' }, { de: 'casi' }, { de: 'sobrada' }] }),
  ]);
  const plan = programar(p);
  const casi = casiCriticas(plan, 3);
  assert.deepEqual(casi.map((t) => t.nombre), ['Casi']);      // holgura 2
  assert.equal(casi[0].holgura, 2);

  const hitos = margenHitos(plan);
  assert.equal(hitos.length, 1);
  assert.equal(hitos[0].critica, true);
  assert.match(hitos[0].texto, /sin margen/);
});

t('avisa de lo que no cabe antes de la fecha comprometida y de lo que flota', () => {
  const p = proyecto([
    T('a', { nombre: 'Larga', duracion: 30 }),
    T('suelta', { nombre: 'Suelta', duracion: 2 }),
  ]);
  p.fechaObjetivo = '2026-10-01';
  const problemas = problemasDePlan(programar(p), p);
  const tipos = problemas.map((x) => x.tipo);
  assert.ok(tipos.includes('objetivo'));
  assert.ok(tipos.includes('imposible'));
  assert.ok(tipos.includes('huerfana'));
  assert.equal(problemas[0].gravedad, 'alto');
  assert.match(problemas.find((x) => x.tipo === 'objetivo').texto, /sobran \d+ días/);
});

console.log(`\n${passed} pruebas de simulación OK`);
