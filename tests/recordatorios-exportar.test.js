import assert from 'node:assert/strict';
import { aCSV, aICS, aTexto, importarCSV, leerCSV, resumenMarkdown } from '../recordatorios/src/exportar.js';
import { crearTarea } from '../recordatorios/src/modelo.js';
import { parseRegla } from '../recordatorios/src/recurrencia.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('el .ics lleva la repetición traducida a RRULE', () => {
  const ics = aICS([
    crearTarea({ id: 'a', titulo: 'Vencimiento de opciones', fecha: '2026-09-18', regla: parseRegla('cada tercer viernes') }),
    crearTarea({ id: 'b', titulo: 'Clase de Circuitos', fecha: '2026-09-22', hora: '07:00', duracion: 120, regla: parseRegla('cada martes y jueves') }),
    crearTarea({ id: 'c', titulo: 'Cierre de mes', fecha: '2026-09-30', regla: parseRegla('el último día del mes') }),
  ]);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=3FR/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH/);
  assert.match(ics, /RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=-1/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260918/);
  assert.match(ics, /BEGIN:VALARM/);          // solo para las que tienen hora
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
});

t('escapa comas y saltos de línea del texto', () => {
  const ics = aICS([crearTarea({ titulo: 'Comprar, vender; decidir', notas: 'línea 1\nlínea 2', fecha: '2026-09-20' })]);
  assert.match(ics, /SUMMARY:Comprar\\, vender\; decidir/);
  assert.match(ics, /DESCRIPTION:línea 1\\nlínea 2/);
});

t('CSV de ida y vuelta', () => {
  const csv = aCSV([crearTarea({ titulo: 'Con "comillas", y coma', fecha: '2026-09-20', etiquetas: ['a', 'b'] })]);
  const filas = leerCSV(csv);
  assert.equal(filas[1][0], 'Con "comillas", y coma');
  assert.equal(filas[1][8], 'a b');
});

t('importa el CSV de Todoist', () => {
  const csv = 'TYPE,CONTENT,DESCRIPTION,PRIORITY,DATE,PROJECT NAME\ntask,Revisar cartera,Pesos y stops,4,2026-09-20,Inversiones\ntask,"Llamar al broker, urgente",,3,,Inversiones\n';
  const tareas = importarCSV(csv);
  assert.equal(tareas.length, 2);
  assert.equal(tareas[0].titulo, 'Revisar cartera');
  assert.equal(tareas[0].fecha, '2026-09-20');
  assert.equal(tareas[0].proyecto, 'Inversiones');
  assert.equal(tareas[0].prioridad, 1); // en Todoist 4 es la más alta
  assert.equal(tareas[1].titulo, 'Llamar al broker, urgente');
  assert.equal(tareas[1].fecha, null);
});

t('importa el CSV de TickTick con hora y estado', () => {
  const csv = 'Title,Content,List Name,Due Date,Priority,Status,Tags\nEnsayo,,Alabanza,2026-09-25T19:00:00+0000,3,0,equipo\nHecha,,Personal,2026-09-01T00:00:00+0000,0,2,\n';
  const tareas = importarCSV(csv);
  assert.equal(tareas[0].titulo, 'Ensayo');
  assert.equal(tareas[0].hora, '19:00');
  assert.deepEqual(tareas[0].etiquetas, ['equipo']);
  assert.equal(tareas[1].completada, true);
  assert.equal(tareas[1].hora, null); // medianoche = "sin hora", no las 00:00
});

t('texto plano y resumen en Markdown', () => {
  const tareas = [
    crearTarea({ titulo: 'Atrasada', fecha: '2026-09-18' }),
    crearTarea({ titulo: 'Ensayo', fecha: '2026-09-20', hora: '19:00', proyecto: 'Alabanza', prioridad: 1 }),
  ];
  const txt = aTexto(tareas, 'Mi día');
  assert.match(txt, /\[ \] 19:00 Ensayo \(P1\) · Alabanza/);
  const md = resumenMarkdown(tareas, '2026-09-20');
  assert.match(md, /## Atrasadas \(1\)/);
  assert.match(md, /\*\*19:00\*\* Ensayo/);
});

console.log(`\n${passed} pruebas de exportación e importación OK`);
