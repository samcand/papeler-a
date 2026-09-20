import assert from 'node:assert/strict';
import {
  aTareasDeAgenda, cambiarDuracion, cargaRecursos, desdePlantilla, desviaciones, diasHabiles,
  fechaDeIndice, indiceDeFecha, moverTarea, numerarEDT, PLANTILLAS_PROYECTO, programar,
  proyectoVacio, quitarRestriccion, resumenProyecto, tareaProyecto, tomarLineaBase, validar,
  valorGanado,
} from '../recordatorios/src/proyectos.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

/** Proyecto de prueba: 2026-09-21 es lunes. */
function proyecto(tareas, inicio = '2026-09-21') {
  const p = proyectoVacio('Prueba', inicio);
  p.tareas = tareas;
  return p;
}
const T = (id, campos) => tareaProyecto({ id, ...campos });

t('el calendario laboral salta fines de semana y festivos', () => {
  // lunes + 4 días hábiles = viernes; + 5 = lunes siguiente
  assert.equal(fechaDeIndice('2026-09-21', 4), '2026-09-25');
  assert.equal(fechaDeIndice('2026-09-21', 5), '2026-09-28');
  assert.equal(indiceDeFecha('2026-09-21', '2026-09-28'), 5);
  assert.equal(diasHabiles('2026-09-21', '2026-09-27'), 5);
  // un sábado como inicio se corre al lunes
  assert.equal(fechaDeIndice('2026-09-19', 0), '2026-09-21');
  // con festivo el miércoles, el cuarto día hábil se corre un día
  const cal = { diasHabiles: [1, 2, 3, 4, 5], feriados: ['2026-09-23'] };
  assert.equal(fechaDeIndice('2026-09-21', 3), '2026-09-24');
  assert.equal(fechaDeIndice('2026-09-21', 3, cal), '2026-09-25');
});

t('cadena simple: fechas, ruta crítica y duración total', () => {
  const p = proyecto([
    T('a', { nombre: 'Diseño', duracion: 5 }),
    T('b', { nombre: 'Construcción', duracion: 10, dependencias: [{ de: 'a', tipo: 'FC' }] }),
    T('c', { nombre: 'Pruebas', duracion: 3, dependencias: [{ de: 'b', tipo: 'FC' }] }),
  ]);
  const plan = programar(p);
  const [a, b, c] = ['a', 'b', 'c'].map((id) => plan.tareas.find((x) => x.id === id));
  assert.equal(a.inicio, '2026-09-21');
  assert.equal(a.fin, '2026-09-25');       // 5 días hábiles: lun a vie
  assert.equal(b.inicio, '2026-09-28');    // arranca el lunes siguiente
  assert.equal(c.fin, '2026-10-14');
  assert.equal(plan.duracion, 18);
  assert.deepEqual(plan.critica.sort(), ['a', 'b', 'c']);
  assert.equal(plan.fin, '2026-10-14');
});

t('una rama con holgura no es crítica', () => {
  const p = proyecto([
    T('a', { duracion: 5 }),
    T('larga', { duracion: 10, dependencias: [{ de: 'a' }] }),
    T('corta', { duracion: 2, dependencias: [{ de: 'a' }] }),
    T('fin', { duracion: 1, dependencias: [{ de: 'larga' }, { de: 'corta' }] }),
  ]);
  const plan = programar(p);
  const corta = plan.tareas.find((x) => x.id === 'corta');
  const larga = plan.tareas.find((x) => x.id === 'larga');
  assert.equal(larga.critica, true);
  assert.equal(corta.critica, false);
  assert.equal(corta.holgura, 8);          // 10 - 2
  assert.equal(corta.holguraLibre, 8);
  assert.deepEqual(plan.critica.sort(), ['a', 'fin', 'larga']);
});

t('los cuatro tipos de dependencia y el desfase', () => {
  const cc = programar(proyecto([
    T('a', { duracion: 5 }),
    T('b', { duracion: 5, dependencias: [{ de: 'a', tipo: 'CC', desfase: 2 }] }),
  ]));
  assert.equal(cc.tareas.find((x) => x.id === 'b').inicio, '2026-09-23');

  const ff = programar(proyecto([
    T('a', { duracion: 10 }),
    T('b', { duracion: 4, dependencias: [{ de: 'a', tipo: 'FF' }] }),
  ]));
  const b = ff.tareas.find((x) => x.id === 'b');
  assert.equal(b.fin, ff.tareas.find((x) => x.id === 'a').fin);   // terminan juntas

  const adelanto = programar(proyecto([
    T('a', { duracion: 10 }),
    T('b', { duracion: 5, dependencias: [{ de: 'a', tipo: 'FC', desfase: -2 }] }),
  ]));
  // solapa dos días: empieza en el día hábil 8, no en el 10
  assert.equal(adelanto.tareas.find((x) => x.id === 'b').indiceInicio, 8);
});

t('hitos, restricción de no empezar antes de y EDT', () => {
  const p = proyecto([
    T('fase', { nombre: 'Fase 1' }),
    T('a', { nombre: 'Tarea A', duracion: 3, padre: 'fase' }),
    T('b', { nombre: 'Tarea B', duracion: 2, padre: 'fase', dependencias: [{ de: 'a' }], noAntesDe: '2026-10-05' }),
    T('hito', { nombre: 'Entrega', duracion: 0, dependencias: [{ de: 'b' }] }),
  ]);
  const plan = programar(p);
  const b = plan.tareas.find((x) => x.id === 'b');
  const hito = plan.tareas.find((x) => x.id === 'hito');
  const fase = plan.tareas.find((x) => x.id === 'fase');
  assert.equal(b.inicio, '2026-10-05');       // la restricción manda sobre la dependencia
  assert.equal(hito.esHito, true);
  assert.equal(hito.inicio, hito.fin);
  assert.equal(fase.resumen, true);
  assert.equal(fase.inicio, '2026-09-21');    // la resumen abarca a sus hijas
  assert.equal(fase.fin, '2026-10-06');
  const edt = numerarEDT(p.tareas);
  assert.equal(edt.get('fase'), '1');
  assert.equal(edt.get('a'), '1.1');
  assert.equal(edt.get('b'), '1.2');
  assert.equal(edt.get('hito'), '2');
});

t('el avance de una tarea resumen se pondera por duración', () => {
  const p = proyecto([
    T('fase', { nombre: 'Fase' }),
    T('a', { duracion: 8, padre: 'fase', avance: 100 }),
    T('b', { duracion: 2, padre: 'fase', avance: 0, dependencias: [{ de: 'a' }] }),
  ]);
  const fase = programar(p).tareas.find((x) => x.id === 'fase');
  assert.equal(fase.avance, 80);
});

t('detecta dependencias circulares en vez de colgarse', () => {
  const p = proyecto([
    T('a', { duracion: 2, dependencias: [{ de: 'b' }] }),
    T('b', { duracion: 2, dependencias: [{ de: 'a' }] }),
  ]);
  const plan = programar(p);
  assert.equal(plan.ciclo, true);
  assert.match(plan.errores.map((e) => e.texto).join(' '), /circulares/);
});

t('avisa de dependencias rotas y de tareas que se autodependen', () => {
  const errores = validar(proyecto([
    T('a', { nombre: 'A', duracion: 1, dependencias: [{ de: 'fantasma' }] }),
    T('b', { nombre: 'B', duracion: 1, dependencias: [{ de: 'b' }] }),
    T('c', { nombre: 'C', duracion: -3 }),
  ])).map((e) => e.texto).join(' | ');
  assert.match(errores, /depende de una tarea borrada/);
  assert.match(errores, /depende de sí misma/);
  assert.match(errores, /duración negativa/);
});

t('carga de recursos: detecta a quien está en dos sitios a la vez', () => {
  const plan = programar(proyecto([
    T('a', { duracion: 5, recurso: 'Yo' }),
    T('b', { duracion: 5, recurso: 'Yo' }),              // en paralelo con la anterior
    T('c', { duracion: 5, recurso: 'Ayudante', dependencias: [{ de: 'a' }] }),
  ]));
  const carga = cargaRecursos(plan);
  const yo = carga.find((r) => r.recurso === 'Yo');
  const ayudante = carga.find((r) => r.recurso === 'Ayudante');
  assert.equal(yo.picoCarga, 200);
  assert.equal(yo.sobreasignado, true);
  assert.equal(yo.diasSobreasignados.length, 5);
  assert.equal(ayudante.sobreasignado, false);
});

t('línea base y desviaciones', () => {
  const p = proyecto([
    T('a', { nombre: 'A', duracion: 5 }),
    T('b', { nombre: 'B', duracion: 5, dependencias: [{ de: 'a' }] }),
  ]);
  const base = tomarLineaBase(programar(p));
  p.tareas[0].duracion = 8;                  // se alarga la primera
  const desvios = desviaciones(programar(p), base);
  const b = desvios.find((d) => d.id === 'b');
  // tres días hábiles de arrastre, aunque en el calendario sean cinco
  assert.equal(b.desvioInicio, 3);
  assert.equal(b.desvioFin, 3);
  assert.equal(desvios.find((d) => d.id === 'a').desvioFin, 3);
});

t('valor ganado: SPI y CPI', () => {
  const p = proyecto([
    T('a', { duracion: 5, costo: 1000, costoReal: 1200, avance: 100 }),
    T('b', { duracion: 5, costo: 1000, costoReal: 0, avance: 0, dependencias: [{ de: 'a' }] }),
  ]);
  const ev = valorGanado(programar(p), '2026-09-25');   // final de la primera tarea
  assert.equal(ev.bac, 2000);
  assert.equal(ev.ev, 1000);
  assert.equal(ev.ac, 1200);
  assert.equal(ev.pv, 1000);                 // solo la primera debía estar hecha
  assert.equal(ev.spi, 1);                   // en fecha
  assert.ok(ev.cpi < 1);                     // pero más caro de lo previsto
  assert.equal(ev.variacionCosto, -200);
});

t('resumen del proyecto', () => {
  const plan = programar(desdePlantilla(PLANTILLAS_PROYECTO[0], '2026-09-21'));
  const r = resumenProyecto(plan);
  assert.equal(r.tareas, 9);
  assert.equal(r.hitos, 1);
  assert.equal(r.duracion, 69);
  assert.equal(r.criticas, 9);               // es una cadena, todo es crítico
  assert.equal(r.inicio, '2026-09-21');
});

t('el plan se convierte en recordatorios de la agenda', () => {
  const p = desdePlantilla(PLANTILLAS_PROYECTO[2], '2026-09-21');
  const plan = programar(p);
  const tareas = aTareasDeAgenda(plan, p);
  assert.equal(tareas.length, 7);
  assert.equal(tareas[0].fecha, '2026-09-21');
  assert.ok(tareas.every((t) => t.modulo === 'proyectos'));
  assert.ok(tareas[0].notas.includes('ruta crítica'));
  assert.ok(tareas.some((t) => t.titulo.startsWith('🏁')));
  assert.equal(tareas[0].prioridad, 1);
});

t('arrastrar una tarea la fija con "no antes de" y arrastra a las siguientes', () => {
  const p = proyecto([
    T('a', { duracion: 5 }),
    T('b', { duracion: 5, dependencias: [{ de: 'a' }] }),
  ]);
  // "b" empieza el día hábil 5 (28 sep); la arrastramos tres días a la derecha
  const res = moverTarea(p, 'b', 3);
  assert.equal(res.movida, true);
  assert.equal(res.fecha, '2026-10-01');
  const plan = programar(p);
  assert.equal(plan.tareas.find((x) => x.id === 'b').inicio, '2026-10-01');
  assert.equal(plan.duracion, 13);           // el proyecto se alarga tres días
  // "a" ya no es crítica: ahora tiene holgura
  assert.equal(plan.tareas.find((x) => x.id === 'a').holgura, 3);
});

t('arrastrar hacia atrás no rompe las dependencias', () => {
  const p = proyecto([
    T('a', { duracion: 5 }),
    T('b', { duracion: 5, dependencias: [{ de: 'a' }] }),
  ]);
  moverTarea(p, 'b', -4);                    // imposible: "a" no ha terminado
  const b = programar(p).tareas.find((x) => x.id === 'b');
  assert.equal(b.inicio, '2026-09-28');      // se queda donde el plan permite
  // arrastrarla al principio quita la restricción
  moverTarea(p, 'b', -99);
  assert.equal(p.tareas[1].noAntesDe, undefined);
});

t('arrastrar el borde cambia la duración; las resumen no se tocan', () => {
  const p = proyecto([
    T('fase', { nombre: 'Fase' }),
    T('a', { duracion: 5, padre: 'fase' }),
  ]);
  assert.equal(cambiarDuracion(p, 'a', 8).duracion, 8);
  assert.equal(programar(p).tareas.find((x) => x.id === 'a').fin, '2026-09-30');
  assert.equal(cambiarDuracion(p, 'a', -3).duracion, 0);   // un hito, no una duración negativa
  assert.equal(cambiarDuracion(p, 'fase', 4).cambiada, false);
  assert.equal(moverTarea(p, 'fase', 2).movida, false);
});

t('soltar la restricción devuelve la tarea a su sitio', () => {
  const p = proyecto([T('a', { duracion: 5 }), T('b', { duracion: 5, dependencias: [{ de: 'a' }] })]);
  moverTarea(p, 'b', 3);
  assert.equal(quitarRestriccion(p, 'b'), true);
  assert.equal(quitarRestriccion(p, 'b'), false);
  assert.equal(programar(p).tareas.find((x) => x.id === 'b').inicio, '2026-09-28');
});

console.log(`\n${passed} pruebas de gestión de proyectos OK`);
