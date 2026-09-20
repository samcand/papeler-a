import assert from 'node:assert/strict';
import { crearTarea, enBandeja, estadoBandeja } from '../recordatorios/src/modelo.js';
import { resumenDelDia, saludo, textoNotificacion, textoResumen, tocaResumen } from '../recordatorios/src/resumen.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-20';

const ESTADO = {
  tareas: [
    crearTarea({ id: '1', titulo: 'Llamar al broker', fecha: '2026-09-18', prioridad: 1, modulo: 'inversiones', proyecto: 'Cartera' }),
    crearTarea({ id: '2', titulo: 'Calificar parciales', fecha: HOY, prioridad: 1, modulo: 'docencia', proyecto: 'Circuitos I', duracion: 180 }),
    crearTarea({ id: '3', titulo: 'Ensayo', fecha: HOY, hora: '19:00', modulo: 'alabanza', proyecto: 'Servicio', duracion: 120 }),
    crearTarea({ id: '4', titulo: 'Responder revisores', fecha: HOY, hora: '15:00', prioridad: 2, modulo: 'investigacion', proyecto: 'Artículos', duracion: 90 }),
    crearTarea({ id: '5', titulo: 'Mirar lo del seguro', creadaEn: '2026-09-10T09:00:00.000Z' }),
    crearTarea({ id: '6', titulo: 'Idea para el curso', creadaEn: '2026-09-19T09:00:00.000Z' }),
    crearTarea({ id: '7', titulo: 'Contestar a Ana', duracion: 2, creadaEn: '2026-09-20T09:00:00.000Z' }),
    crearTarea({ id: '8', titulo: 'Subtarea suelta', padre: '2' }),
    crearTarea({ id: '9', titulo: 'Ya hecha', completada: true }),
  ],
  historial: [{ fecha: '2026-09-19', modulo: 'docencia' }, { fecha: '2026-09-19', modulo: 'personal' }],
  tiempo: [{ tipo: 'pomodoro', minutos: 50, fecha: '2026-09-19' }, { tipo: 'pomodoro', minutos: 25, fecha: HOY }],
  habitos: [{ id: 'h1', nombre: 'Ejercicio', dias: ['2026-09-19'] }, { id: 'h2', nombre: 'Leer', dias: [HOY] }],
  inversiones: {
    posiciones: [{ ticker: 'NVDA', cantidad: 10, entrada: 100, precio: 90, stop: 95, sector: 'Tec', tesis: 'x', revisadaEn: HOY }],
    reglas: {}, efectivo: 0,
  },
  ajustes: { jornada: { inicio: '09:00', fin: '13:00' }, metaDiaria: 2 },
};

t('la bandeja es lo capturado sin decidir', () => {
  const items = enBandeja(ESTADO.tareas).map((t) => t.id);
  assert.deepEqual(items.sort(), ['5', '6', '7']);   // ni completadas, ni subtareas, ni con proyecto
});

t('el estado de la bandeja dice si conviene pararse a vaciarla', () => {
  const b = estadoBandeja(ESTADO.tareas, HOY);
  assert.equal(b.total, 3);
  assert.equal(b.masViejo, 10);          // "lo del seguro" lleva diez días
  assert.equal(b.rapidas, 1);            // una de dos minutos
  assert.equal(b.conviéneVaciar, true);

  const limpia = estadoBandeja([crearTarea({ titulo: 'nueva', creadaEn: '2026-09-20T08:00:00.000Z' })], HOY);
  assert.equal(limpia.conviéneVaciar, false);
});

t('saludo según la hora', () => {
  assert.equal(saludo(new Date(2026, 8, 20, 7)), 'Buenos días');
  assert.equal(saludo(new Date(2026, 8, 20, 16)), 'Buenas tardes');
  assert.equal(saludo(new Date(2026, 8, 20, 23)), 'Buenas noches');
});

t('el resumen del día cuenta lo que importa', () => {
  const r = resumenDelDia(ESTADO, HOY, { ahora: new Date(2026, 8, 20, 7, 30) });
  assert.equal(r.hoy, 3);
  assert.equal(r.vencidas, 1);
  assert.equal(r.total, 4);
  assert.equal(r.urgentes, 2);           // la atrasada y la de calificar
  assert.equal(r.primera.titulo, 'Responder revisores');  // 15:00 antes que 19:00
  assert.equal(r.bandeja, 3);
  assert.equal(r.completadasAyer, 2);
  assert.equal(r.enfoqueAyer, 50);
  assert.equal(r.mañana, 0);
  assert.match(r.titulo, /^Buenos días · domingo 20 de septiembre/);
});

t('elige tres cosas, sin repetir y con lo urgente delante', () => {
  const r = resumenDelDia(ESTADO, HOY);
  assert.equal(r.foco.length, 3);
  assert.deepEqual(r.foco.map((t) => t.id), ['1', '2', '4']);
  assert.equal(new Set(r.foco.map((t) => t.id)).size, 3);
});

t('los avisos señalan atrasadas, día imposible, bandeja y cartera', () => {
  const r = resumenDelDia(ESTADO, HOY);
  const texto = r.avisos.join(' | ');
  assert.match(texto, /1 tarea de días anteriores/);
  assert.match(texto, /6 h 30 min comprometidos y el día da para 4 h/);
  assert.match(texto, /Cartera: NVDA/);
  assert.match(texto, /Hábitos sin marcar: Ejercicio/);
  assert.equal(r.alertasCartera > 0, true);
});

t('un día tranquilo no inventa avisos', () => {
  const r = resumenDelDia({ tareas: [crearTarea({ titulo: 'Una cosa', fecha: HOY, duracion: 30 })], ajustes: ESTADO.ajustes }, HOY);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.vencidas, 0);
  assert.equal(r.foco.length, 1);
});

t('texto corto para la notificación y largo para copiar', () => {
  const r = resumenDelDia(ESTADO, HOY);
  const corto = textoNotificacion(r);
  assert.match(corto, /1 atrasada · 3 para hoy · primero: 15:00 Responder revisores/);
  const largo = textoResumen(r);
  assert.match(largo, /Lo que haría que el día valga la pena:/);
  assert.match(largo, /1\. Llamar al broker/);
  assert.match(largo, /Ojo con:/);
});

t('el resumen sale una vez al día y a partir de su hora', () => {
  const ajustes = { horaResumen: '07:00' };
  assert.equal(tocaResumen(ajustes, HOY, new Date(2026, 8, 20, 6, 30)), false);
  assert.equal(tocaResumen(ajustes, HOY, new Date(2026, 8, 20, 7, 30)), true);
  assert.equal(tocaResumen({ ...ajustes, resumenVistoEn: HOY }, HOY, new Date(2026, 8, 20, 9)), false);
  assert.equal(tocaResumen({ ...ajustes, resumenMatutino: false }, HOY, new Date(2026, 8, 20, 9)), false);
});

console.log(`\n${passed} pruebas de bandeja y resumen del día OK`);
