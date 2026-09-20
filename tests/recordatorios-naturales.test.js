import assert from 'node:assert/strict';
import { aTextoEntrada, parseEntrada } from '../recordatorios/src/naturales.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-20'; // domingo
const p = (txt) => parseEntrada(txt, { hoy: HOY });

t('una línea completa se reparte en campos', () => {
  const r = p('Revisar tesis de NVDA mañana 9am p1 #Inversiones @analisis');
  assert.equal(r.titulo, 'Revisar tesis de NVDA');
  assert.equal(r.fecha, '2026-09-21');
  assert.equal(r.hora, '09:00');
  assert.equal(r.prioridad, 1);
  assert.equal(r.proyecto, 'Inversiones');
  assert.deepEqual(r.etiquetas, ['analisis']);
});

t('fechas relativas', () => {
  assert.equal(p('algo hoy').fecha, '2026-09-20');
  assert.equal(p('algo mañana').fecha, '2026-09-21');
  assert.equal(p('algo pasado mañana').fecha, '2026-09-22');
  assert.equal(p('algo en 3 días').fecha, '2026-09-23');
  assert.equal(p('algo en 2 semanas').fecha, '2026-10-04');
  assert.equal(p('algo fin de mes').fecha, '2026-09-30');
});

t('días de la semana: el más cercano, y "próximo" salta una semana', () => {
  assert.equal(p('llamar el martes').fecha, '2026-09-22');
  assert.equal(p('llamar próximo martes').fecha, '2026-09-29');
  assert.equal(p('llamar el domingo').fecha, '2026-09-27'); // hoy es domingo: el que viene
});

t('fechas con día y mes', () => {
  assert.equal(p('pagar el 15 de octubre').fecha, '2026-10-15');
  assert.equal(p('pagar 12 oct').fecha, '2026-10-12');
  assert.equal(p('pagar 12/10').fecha, '2026-10-12');
  assert.equal(p('pagar 2027-01-05').fecha, '2027-01-05');
  // una fecha ya pasada se entiende como del año que viene
  assert.equal(p('cumpleaños 3 de mayo').fecha, '2027-05-03');
});

t('el vencimiento de opciones se escribe como se dice', () => {
  const r = p('cerrar covered calls tercer viernes');
  assert.equal(r.fecha, '2026-10-16');
  assert.equal(r.titulo, 'cerrar covered calls');
});

t('repeticiones: la regla sale del texto y no ensucia el título', () => {
  const r = p('Revisar cartera cada lunes 8am #Inversiones');
  assert.equal(r.titulo, 'Revisar cartera');
  assert.deepEqual(r.regla, { tipo: 'semanal', cada: 1, dias: [1] });
  assert.equal(r.fecha, '2026-09-21');
  assert.equal(r.hora, '08:00');
});

t('repetición mensual y por día hábil', () => {
  assert.deepEqual(p('aportar al fondo el 15 de cada mes').regla, { tipo: 'mensual', cada: 1, diaMes: 15 });
  assert.deepEqual(p('leer el mercado cada día hábil').regla, { tipo: 'habiles', cada: 1 });
  assert.equal(p('cerrar mes el último día del mes').regla.diaMes, 'ultimo');
  assert.deepEqual(p('rolar opciones cada tercer viernes').regla, { tipo: 'nEsimo', cada: 1, nEsimo: { n: 3, dia: 5 } });
});

t('duración, horas en 24h y prioridad con !!', () => {
  const r = p('Preparar clase 30min a las 14:30 !!2');
  assert.equal(r.duracion, 30);
  assert.equal(r.hora, '14:30');
  assert.equal(r.prioridad, 2);
  assert.equal(r.titulo, 'Preparar clase');
});

t('sin nada reconocible, todo es el título', () => {
  const r = p('Comprar café');
  assert.equal(r.titulo, 'Comprar café');
  assert.equal(r.fecha, null);
  assert.equal(r.regla, null);
});

t('vuelve a texto editable', () => {
  assert.equal(aTextoEntrada({ titulo: 'X', fecha: '2026-09-21', prioridad: 1, etiquetas: ['a'] }), 'X 2026-09-21 p1 @a');
});

console.log(`\n${passed} pruebas de entrada natural OK`);
