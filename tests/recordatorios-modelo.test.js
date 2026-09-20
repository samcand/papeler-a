import assert from 'node:assert/strict';
import { agruparPorFecha, arbol, cargaDelDia, completar, crearTarea, descripcionCorta, estadisticas, estancadas, estaVencida, ordenarTareas, paraHoy, progreso } from '../recordatorios/src/modelo.js';
import { aplicarFiltro, parseFiltro } from '../recordatorios/src/filtros.js';
import { agendaDia, agendaSemana, matrizMes, mesSiguiente, resumenMes } from '../recordatorios/src/calendario.js';
import { parseRegla } from '../recordatorios/src/recurrencia.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-20';

const TAREAS = [
  crearTarea({ id: '1', titulo: 'Revisar cartera', fecha: '2026-09-20', prioridad: 1, modulo: 'inversiones', proyecto: 'Inversiones', etiquetas: ['mercado'] }),
  crearTarea({ id: '2', titulo: 'Calificar parciales', fecha: '2026-09-18', prioridad: 2, modulo: 'docencia', duracion: 120 }),
  crearTarea({ id: '3', titulo: 'Enviar paper', fecha: '2026-09-25', prioridad: 1, modulo: 'investigacion', etiquetas: ['espera'] }),
  crearTarea({ id: '4', titulo: 'Comprar café', modulo: 'personal' }),
  crearTarea({ id: '5', titulo: 'Ensayo', fecha: '2026-09-20', hora: '19:00', modulo: 'alabanza', duracion: 90 }),
];

t('lo de hoy incluye lo que se quedó atrás', () => {
  const h = paraHoy(TAREAS, HOY).map((t) => t.id);
  assert.deepEqual(h.sort(), ['1', '2', '5']);
  assert.equal(estaVencida(TAREAS[1], HOY), true);
  assert.equal(estaVencida(TAREAS[2], HOY), false);
});

t('orden por fecha, prioridad y manual', () => {
  // dentro del mismo día: primero las que tienen hora, después el resto por prioridad
  assert.deepEqual(ordenarTareas(TAREAS, 'fecha').map((t) => t.id), ['2', '5', '1', '3', '4']);
  assert.equal(ordenarTareas(TAREAS, 'prioridad')[0].prioridad, 1);
});

t('agrupar por fecha para la vista de próximos', () => {
  const g = agruparPorFecha(TAREAS);
  assert.deepEqual([...g.get('2026-09-20')].map((t) => t.id), ['5', '1']);
  assert.equal(g.get('sin-fecha').length, 1);
});

t('completar una tarea normal y una repetida', () => {
  const normal = completar(TAREAS[0], HOY);
  assert.equal(normal.tarea.completada, true);
  assert.equal(normal.repetida, false);
  assert.equal(normal.historial.modulo, 'inversiones');

  const repetida = completar(crearTarea({ titulo: 'Revisión semanal', fecha: '2026-09-20', regla: parseRegla('cada domingo') }), HOY);
  assert.equal(repetida.repetida, true);
  assert.equal(repetida.tarea.completada, false);
  assert.equal(repetida.tarea.fecha, '2026-09-27');
});

t('subtareas en árbol y progreso', () => {
  const lista = [
    crearTarea({ id: 'p', titulo: 'Paper' }),
    crearTarea({ id: 'h1', titulo: 'Métodos', padre: 'p', completada: true }),
    crearTarea({ id: 'h2', titulo: 'Resultados', padre: 'p' }),
  ];
  const a = arbol(lista);
  assert.equal(a.length, 1);
  assert.equal(a[0].hijos.length, 2);
  assert.equal(progreso(lista.filter((t) => t.padre)).pct, 50);
});

t('descripción corta con fecha, repetición y duración', () => {
  const t1 = crearTarea({ titulo: 'x', fecha: '2026-09-21', hora: '09:00', regla: parseRegla('cada lunes'), duracion: 30 });
  assert.equal(descripcionCorta(t1, new Date(2026, 8, 20)), 'mañana 09:00 · 🔁 cada lunes · 30 min');
});

t('estadísticas: racha, semana y reparto por módulo', () => {
  const historial = [
    ...Array.from({ length: 6 }, (_, i) => ({ fecha: '2026-09-20', modulo: 'inversiones' })),
    ...Array.from({ length: 5 }, () => ({ fecha: '2026-09-19', modulo: 'docencia' })),
    { fecha: '2026-09-14', modulo: 'personal' },
  ];
  const s = estadisticas(historial, HOY, 5);
  assert.equal(s.hoy, 6);
  assert.equal(s.racha, 2);
  assert.equal(s.porModulo[0].modulo, 'inversiones');
  assert.equal(s.ultimos.length, 14);
});

t('carga del día y tareas estancadas', () => {
  const c = cargaDelDia(paraHoy(TAREAS, HOY), 180);
  assert.equal(c.minutos, 210);
  assert.equal(c.excedido, true);
  assert.equal(c.sinEstimar, 1);

  const vieja = crearTarea({ titulo: 'vieja', creadaEn: '2026-06-01T10:00:00.000Z' });
  assert.equal(estancadas([vieja], 30, HOY).length, 1);
});

t('filtros: y, o, negación y paréntesis', () => {
  const f = (expr) => aplicarFiltro(expr, TAREAS, { hoy: HOY }).map((t) => t.id).sort();
  assert.deepEqual(f('hoy'), ['1', '2', '5']);
  assert.deepEqual(f('vencidas'), ['2']);
  assert.deepEqual(f('p1 & módulo:inversiones'), ['1']);
  assert.deepEqual(f('#Inversiones'), ['1']);
  assert.deepEqual(f('@espera'), ['3']);
  assert.deepEqual(f('sin fecha'), ['4']);
  assert.deepEqual(f('módulo:docencia | módulo:alabanza'), ['2', '5']);
  assert.deepEqual(f('7 días & !módulo:docencia'), ['1', '3', '5']);
  assert.deepEqual(f('(p1 | p2) & 7 días'), ['1', '2', '3']);
  assert.deepEqual(f('buscar: paper'), ['3']);
  assert.deepEqual(f('antes de: 2026-09-20'), ['2']);
});

t('el filtro oculta completadas salvo que se pidan', () => {
  const lista = [...TAREAS, crearTarea({ id: '9', titulo: 'hecha', fecha: HOY, completada: true })];
  assert.equal(aplicarFiltro('hoy', lista, { hoy: HOY }).length, 3);
  assert.equal(aplicarFiltro('completadas', lista, { hoy: HOY }).length, 1);
});

t('el parser de filtros entiende la expresión', () => {
  const ast = parseFiltro('p1 & (hoy | vencidas)');
  assert.equal(ast.tipo, 'y');
  assert.equal(ast.der.tipo, 'o');
});

t('rejilla del mes completa y con el mes marcado', () => {
  const m = matrizMes(2026, 8, { hoy: HOY });
  assert.equal(m.nombre, 'septiembre 2026');
  assert.equal(m.cabecera[0], 'lun');
  assert.equal(m.semanas[0].dias.length, 7);
  assert.equal(m.semanas[0].dias[0].iso, '2026-08-31'); // el lunes anterior
  const todos = m.semanas.flatMap((s) => s.dias);
  assert.equal(todos.filter((d) => d.delMes).length, 30);
  assert.equal(todos.find((d) => d.esHoy).iso, HOY);
  assert.deepEqual(mesSiguiente(2026, 11), { anio: 2027, mes: 0 });
});

t('agenda de la semana y del día', () => {
  const sem = agendaSemana(TAREAS, HOY);
  assert.equal(sem.desde, '2026-09-14'); // domingo pertenece a la semana que empezó el lunes
  assert.equal(sem.dias.length, 7);
  const domingo = sem.dias.find((d) => d.iso === HOY);
  assert.equal(domingo.tareas.length, 2);
  assert.equal(domingo.minutos, 90);

  const dia = agendaDia(TAREAS, HOY);
  assert.equal(dia.sinHora.length, 1);
  assert.equal(dia.franjas.find((f) => f.hora === '19:00').tareas[0].titulo, 'Ensayo');
});

t('resumen del mes para pintar los puntos del calendario', () => {
  const r = resumenMes(TAREAS, 2026, 8);
  assert.equal(r.get(HOY).total, 2);
  assert.equal(r.get(HOY).urgentes, 1);
  assert.deepEqual(r.get(HOY).modulos.sort(), ['alabanza', 'inversiones']);
});

console.log(`\n${passed} pruebas de modelo, filtros y calendario OK`);
