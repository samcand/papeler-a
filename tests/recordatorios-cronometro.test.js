import assert from 'node:assert/strict';
import {
  contraEstimado, cronometroVacio, detener, enCurso, formatoCrono, iniciar,
  pausar, reanudar, totalDeTarea, transcurrido,
} from '../recordatorios/src/cronometro.js';
import { combinarEntrada, parseEntrada } from '../recordatorios/src/naturales.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';
const T0 = new Date('2026-09-23T10:00:00Z').getTime();
const min = (n) => n * 60000;

/* ---------------- cronómetro por tarea ---------------- */

t('mide con marcas de reloj: suspender la pestaña no le quita tiempo', () => {
  const cron = iniciar(cronometroVacio(), 'tarea-1', T0);
  assert.equal(enCurso(cron, 'tarea-1'), true);
  assert.equal(enCurso(cron, 'otra'), false);
  // Nadie llamó a nada durante media hora y aun así la cuenta está bien.
  assert.equal(transcurrido(cron, T0 + min(30)), min(30));
});

t('pausa y reanuda sin perder lo medido ni contar lo parado', () => {
  let cron = iniciar(cronometroVacio(), 'tarea-1', T0);
  cron = pausar(cron, T0 + min(10));
  assert.equal(cron.corriendo, false);
  assert.equal(transcurrido(cron, T0 + min(40)), min(10));   // parado no suma

  cron = reanudar(cron, T0 + min(40));
  assert.equal(transcurrido(cron, T0 + min(45)), min(15));
  // Reanudar dos veces no reinicia el reloj.
  assert.equal(transcurrido(reanudar(cron, T0 + min(50)), T0 + min(45)), min(15));
});

t('al parar sale el registro que se guarda, con su fecha y su hora', () => {
  const cron = iniciar(cronometroVacio(), 'tarea-1', T0);
  const r = detener(cron, T0 + min(52), HOY);
  assert.equal(r.minutos, 52);
  assert.equal(r.registro.tipo, 'cronometro');
  assert.equal(r.registro.tareaId, 'tarea-1');
  assert.equal(r.registro.fecha, HOY);
  assert.match(r.registro.fin, /^\d{2}:\d{2}$/);
  assert.equal(r.cron.tareaId, null);
});

t('menos de un minuto no se apunta: redondear medio minuto es mentirse', () => {
  const cron = iniciar(cronometroVacio(), 'tarea-1', T0);
  const r = detener(cron, T0 + 29000, HOY);
  assert.equal(r.minutos, 0);
  assert.equal(r.registro, null);
  // Treinta segundos ya redondean a uno, y eso sí se apunta.
  assert.equal(detener(cron, T0 + 31000, HOY).minutos, 1);
});

t('el reloj se lee como un reloj', () => {
  assert.equal(formatoCrono(0), '00:00');
  assert.equal(formatoCrono(min(7) + 9000), '07:09');
  assert.equal(formatoCrono(min(64) + 9000), '1:04:09');
  assert.equal(formatoCrono(-500), '00:00');
});

t('el total de una tarea suma lo guardado y lo que corre ahora', () => {
  const tarea = crearTarea({ id: 'tarea-1', titulo: 'Escribir', tiempoDedicado: 45, duracion: 30 });
  const cron = iniciar(cronometroVacio(), 'tarea-1', T0);
  const total = totalDeTarea(tarea, cron, T0 + min(10));
  assert.deepEqual([total.guardado, total.corriendo, total.total], [45, 10, 55]);
  // Si el reloj corre en otra tarea, esta no se apunta nada.
  assert.equal(totalDeTarea(tarea, iniciar(cronometroVacio(), 'otra', T0), T0 + min(10)).total, 45);
});

t('al terminar se compara con lo que habías estimado', () => {
  const tarea = crearTarea({ titulo: 'Escribir', duracion: 30 });
  assert.match(contraEstimado(tarea, 50).texto, /50 min frente a los 30 que estimaste: ×1.67/);
  assert.match(contraEstimado(tarea, 20).texto, /20 min de los 30 estimados/);
  const sinEstimar = contraEstimado(crearTarea({ titulo: 'Sin estimar' }), 20);
  assert.equal(sinEstimar.hayEstimado, false);
  assert.match(sinEstimar.texto, /20 min medidos/);
});

/* ---------------- lo escrito frente a los controles ---------------- */

t('lo escrito manda sobre los controles, y los controles sobre la pantalla', () => {
  const p = parseEntrada('Llamar al banco mañana p1 #Cartera', { hoy: HOY });
  const r = combinarEntrada(p, { fecha: '2026-12-01', prioridad: 3, proyecto: 'Casa', modulo: 'personal' }, { fecha: HOY, proyecto: 'Otro' });
  assert.equal(r.fecha, '2026-09-24');      // lo escrito
  assert.equal(r.prioridad, 1);
  assert.equal(r.proyecto, 'Cartera');
  assert.equal(r.modulo, 'personal');       // eso solo estaba en el control
});

t('lo que no se escribió lo ponen los controles', () => {
  const p = parseEntrada('Hacer la cena', { hoy: HOY });
  const r = combinarEntrada(p, { fecha: '2026-09-25', hora: '19:00', prioridad: 2, duracion: 45, energia: 'baja', limite: '2026-09-26' }, {});
  assert.deepEqual(
    [r.fecha, r.hora, r.prioridad, r.duracion, r.energia, r.limite],
    ['2026-09-25', '19:00', 2, 45, 'baja', '2026-09-26'],
  );
  assert.equal(r.titulo, 'Hacer la cena');
});

t('la pantalla pone lo suyo cuando no hay nada más, y las etiquetas se juntan', () => {
  const p = parseEntrada('Comprar pan @casa', { hoy: HOY });
  const r = combinarEntrada(p, { etiquetas: ['mercado'] }, { fecha: HOY, proyecto: 'Personal', modulo: 'personal', padre: 'madre-1' });
  assert.equal(r.fecha, HOY);
  assert.equal(r.proyecto, 'Personal');
  assert.equal(r.padre, 'madre-1');
  assert.deepEqual(r.etiquetas.sort(), ['casa', 'mercado']);
  assert.equal(r.prioridad, 4);            // el valor de siempre cuando nadie dice nada
});

t('una repetición escrita gana a la elegida con botones', () => {
  const p = parseEntrada('Revisar la cartera cada lunes', { hoy: HOY });
  const r = combinarEntrada(p, { regla: { tipo: 'mensual', cada: 1 } }, {});
  assert.equal(r.regla.tipo, 'semanal');
  // Y si no escribes ninguna, vale la de los botones.
  assert.equal(combinarEntrada(parseEntrada('Pagar el gas', { hoy: HOY }), { regla: { tipo: 'mensual', cada: 1 } }, {}).regla.tipo, 'mensual');
});

console.log(`\n${passed} pruebas del cronómetro por tarea y la caja de añadir OK`);
