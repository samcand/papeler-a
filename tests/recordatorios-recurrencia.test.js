import assert from 'node:assert/strict';
import { aISO, deISO, nEsimoDiaDelMes, normalizaHora, semanaISO, sumarMeses, textoRelativo, siguienteHabil } from '../recordatorios/src/fechas.js';
import { avanzarTarea, parseRegla, proximasFechas, siguienteFecha, textoRegla } from '../recordatorios/src/recurrencia.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('fechas: aritmética que no se rompe en meses cortos', () => {
  assert.equal(aISO(sumarMeses('2026-01-31', 1)), '2026-02-28');
  assert.equal(aISO(sumarMeses('2024-01-31', 1)), '2024-02-29');
  assert.equal(aISO(nEsimoDiaDelMes(2026, 8, 5, 3)), '2026-09-18'); // 3er viernes
  assert.equal(aISO(nEsimoDiaDelMes(2026, 8, 5, -1)), '2026-09-25'); // último viernes
  assert.equal(aISO(siguienteHabil('2026-09-18')), '2026-09-21');    // viernes -> lunes
  assert.equal(semanaISO('2026-01-01'), 1);
});

t('fechas: horas escritas de cualquier forma', () => {
  assert.equal(normalizaHora('9am'), '09:00');
  assert.equal(normalizaHora('9:30 pm'), '21:30');
  assert.equal(normalizaHora('14:05'), '14:05');
  assert.equal(normalizaHora('12am'), '00:00');
  assert.equal(normalizaHora('25:00'), null);
});

t('fechas: texto relativo', () => {
  const ref = deISO('2026-09-20');
  assert.equal(textoRelativo('2026-09-20', ref), 'hoy');
  assert.equal(textoRelativo('2026-09-21', ref), 'mañana');
  assert.equal(textoRelativo('2026-09-17', ref), 'hace 3 días');
});

t('lee reglas escritas en español', () => {
  assert.deepEqual(parseRegla('cada día'), { tipo: 'diaria', cada: 1 });
  assert.deepEqual(parseRegla('cada 3 días'), { tipo: 'diaria', cada: 3 });
  assert.deepEqual(parseRegla('cada lunes y miércoles'), { tipo: 'semanal', cada: 1, dias: [1, 3] });
  assert.deepEqual(parseRegla('cada 2 semanas'), { tipo: 'semanal', cada: 2 });
  assert.deepEqual(parseRegla('cada día hábil'), { tipo: 'habiles', cada: 1 });
  assert.deepEqual(parseRegla('el 15 de cada mes'), { tipo: 'mensual', cada: 1, diaMes: 15 });
  assert.deepEqual(parseRegla('el último día del mes'), { tipo: 'mensual', cada: 1, diaMes: 'ultimo' });
  assert.deepEqual(parseRegla('cada tercer viernes'), { tipo: 'nEsimo', cada: 1, nEsimo: { n: 3, dia: 5 } });
  assert.deepEqual(parseRegla('cada 3 de mayo'), { tipo: 'anual', cada: 1, diaMes: 3, mes: 4 });
  assert.equal(parseRegla('comprar pan'), null);
  assert.equal(parseRegla('cada 3 semanas desde completada').desdeCompletada, true);
});

t('escribe la regla de vuelta en palabras', () => {
  assert.equal(textoRegla(parseRegla('cada tercer viernes')), 'cada tercer viernes del mes');
  assert.equal(textoRegla(parseRegla('cada lunes')), 'cada lunes');
  assert.equal(textoRegla(parseRegla('el último día del mes')), 'el último día del mes');
});

t('calcula la siguiente fecha', () => {
  // 2026-09-20 es domingo
  assert.equal(siguienteFecha(parseRegla('cada lunes'), '2026-09-20'), '2026-09-21');
  assert.equal(siguienteFecha(parseRegla('cada lunes'), '2026-09-21'), '2026-09-28');
  assert.equal(siguienteFecha(parseRegla('cada día'), '2026-09-20'), '2026-09-21');
  assert.equal(siguienteFecha(parseRegla('el 15 de cada mes'), '2026-09-20'), '2026-10-15');
  assert.equal(siguienteFecha(parseRegla('el 15 de cada mes'), '2026-09-01'), '2026-09-15');
  assert.equal(siguienteFecha(parseRegla('el último día del mes'), '2026-09-20'), '2026-09-30');
  assert.equal(siguienteFecha(parseRegla('cada día hábil'), '2026-09-18'), '2026-09-21');
  assert.equal(siguienteFecha(parseRegla('cada tercer viernes'), '2026-09-20'), '2026-10-16');
});

t('la semana empieza en lunes: el domingo es el final, no el principio', () => {
  // sábado 19 -> el domingo es el día siguiente, no el de la semana que viene
  assert.equal(siguienteFecha(parseRegla('cada domingo'), '2026-09-19'), '2026-09-20');
  assert.equal(siguienteFecha(parseRegla('cada domingo'), '2026-09-20'), '2026-09-27');
  assert.equal(siguienteFecha(parseRegla('cada sábado'), '2026-09-20'), '2026-09-26');
  // varios días: el siguiente de la misma semana
  assert.equal(siguienteFecha(parseRegla('cada martes y jueves'), '2026-09-21'), '2026-09-22');
  assert.equal(siguienteFecha(parseRegla('cada martes y jueves'), '2026-09-22'), '2026-09-24');
  assert.equal(siguienteFecha(parseRegla('cada martes y jueves'), '2026-09-24'), '2026-09-29');
  // cada dos semanas salta la intermedia
  assert.equal(siguienteFecha(parseRegla('cada 2 semanas'), '2026-09-21'), '2026-10-05');
});

t('previsualiza varias ocurrencias (vencimiento de opciones)', () => {
  const fechas = proximasFechas(parseRegla('cada tercer viernes'), '2026-09-01', 3);
  assert.deepEqual(fechas, ['2026-09-18', '2026-10-16', '2026-11-20']);
});

t('una tarea fija atrasada se pone al día, no se repite en el pasado', () => {
  const tarea = { fecha: '2026-08-03', regla: parseRegla('cada lunes') };
  assert.equal(avanzarTarea(tarea, '2026-09-20'), '2026-09-21');
});

t('una tarea "desde completada" cuenta desde hoy', () => {
  const tarea = { fecha: '2026-08-01', regla: parseRegla('cada 3 semanas desde completada') };
  assert.equal(avanzarTarea(tarea, '2026-09-20'), '2026-10-11');
});

console.log(`\n${passed} pruebas de recurrencia OK`);
