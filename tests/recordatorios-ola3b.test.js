import assert from 'node:assert/strict';
import { MOTIVOS_INTERRUPCION, registroInterrupcion, resumenInterrupciones, tiempoRealDelDia } from '../recordatorios/src/tiempo.js';
import { enClase, enSilencio } from '../recordatorios/src/notificaciones.js';
import {
  colaDeLectura, decisionNueva, decisionesARevisar, horasPorEstudiante, lecturaNueva,
  minutosDe, queLeerEn, resumenDecisiones,
} from '../recordatorios/src/trabajo.js';
import { alcanceQueCrece, exposicion, nivelRiesgo, riesgoNuevo, riesgosVivos, tareaDeRiesgo } from '../recordatorios/src/riesgos.js';
import { informe, informeCSV } from '../recordatorios/src/informes.js';
import { PREGUNTAS, buscarPregunta, informeCompleto, preguntar, responder } from '../recordatorios/src/copiloto.js';
import { resumenSemanal, textoResumenSemanal } from '../recordatorios/src/resumen.js';
import { SONIDOS } from '../recordatorios/src/ambiente.js';
import { crearTarea } from '../recordatorios/src/modelo.js';
import { programar, proyectoVacio, tareaProyecto, tomarLineaBase } from '../recordatorios/src/proyectos.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';   // miércoles

/* ---------------- interrupciones ---------------- */

t('una interrupción se apunta con motivo, día y franja', () => {
  const r = registroInterrupcion('persona', 'tarea-1', new Date(2026, 8, 23, 10, 5));
  assert.equal(r.motivo, 'persona');
  assert.equal(r.fecha, '2026-09-23');
  assert.equal(r.hora, '10:05');
  assert.ok(MOTIVOS_INTERRUPCION.some((m) => m.id === r.motivo));
});

t('el resumen de interrupciones saca el motivo y la hora que más se repiten', () => {
  const ints = [
    { motivo: 'persona', fecha: '2026-09-22', hora: '10:15' },
    { motivo: 'persona', fecha: '2026-09-23', hora: '10:40' },
    { motivo: 'correo', fecha: '2026-09-23', hora: '16:00' },
    { motivo: 'persona', fecha: '2026-09-23', hora: '11:00' },
    { motivo: 'yo', fecha: '2025-01-01', hora: '09:00' },   // fuera del rango
  ];
  const r = resumenInterrupciones(ints, HOY, 14);
  assert.equal(r.total, 4);
  assert.equal(r.porMotivo[0].clave, 'persona');
  assert.equal(r.porFranja[0].clave, '10:00');
  assert.equal(r.peorDia.clave, '2026-09-23');
  assert.match(r.frase, /alguien vino/i);
});

t('sin nada apuntado el resumen lo dice en vez de inventarse un patrón', () => {
  const r = resumenInterrupciones([], HOY);
  assert.equal(r.total, 0);
  assert.equal(r.porMotivo.length, 0);
  assert.match(r.frase, /Ninguna interrupción/);
});

/* ---------------- tiempo real trabajado ---------------- */

t('el tiempo medido de un día se agrupa por tarea y se compara con lo planificado', () => {
  const tareas = [
    crearTarea({ id: 'a', titulo: 'Escribir', fecha: HOY, duracion: 120, modulo: 'investigacion' }),
    crearTarea({ id: 'b', titulo: 'Corregir', fecha: HOY, duracion: 60 }),
  ];
  const registros = [
    { tareaId: 'a', minutos: 25, fecha: HOY, fin: '09:25' },
    { tareaId: 'a', minutos: 25, fecha: HOY, fin: '10:10' },
    { tareaId: null, minutos: 40, fecha: HOY },
    { tareaId: 'b', minutos: 30, fecha: '2026-09-22' },   // otro día
  ];
  const r = tiempoRealDelDia(registros, HOY, tareas);
  assert.equal(r.real, 90);
  assert.equal(r.planificado, 180);
  assert.equal(r.desvio, -90);
  assert.equal(r.bloques[0].titulo, 'Escribir');
  assert.equal(r.bloques[0].minutos, 50);
  assert.equal(r.bloques[0].sesiones, 2);
  assert.equal(r.bloques[0].ultima, '10:10');
  assert.equal(r.bloques[1].titulo, 'Sin tarea concreta');
});

/* ---------------- silencio y clase ---------------- */

t('la franja de silencio cruza la medianoche sin partirse', () => {
  const ajustes = { silencio: { activo: true, desde: '22:00', hasta: '07:00', dias: [] } };
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 23, 30)), true);
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 6, 30)), true);
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 12, 0)), false);
  // desactivada no silencia nada
  assert.equal(enSilencio({ silencio: { ...ajustes.silencio, activo: false } }, new Date(2026, 8, 23, 23, 30)), false);
});

t('un día entero se puede silenciar aunque la franja no toque', () => {
  const ajustes = { silencio: { activo: true, desde: '22:00', hasta: '07:00', dias: [0] } };
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 27, 12, 0)), true);   // domingo
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 12, 0)), false);  // miércoles
});

t('estar en clase se deduce del horario del semestre', () => {
  const estado = {
    docencia: {
      semestre: {
        inicio: '2026-08-01', fin: '2026-12-15',
        cursos: [{ nombre: 'Circuitos', horario: [{ dia: 'miércoles', inicio: '10:00', fin: '12:00' }] }],
      },
    },
  };
  assert.equal(enClase(estado, new Date(2026, 8, 23, 11, 0)).curso, 'Circuitos');
  assert.equal(enClase(estado, new Date(2026, 8, 23, 12, 30)), null);
  assert.equal(enClase(estado, new Date(2026, 8, 24, 11, 0)), null);      // jueves
  // fuera del semestre no hay clase que valga
  assert.equal(enClase(estado, new Date(2027, 0, 6, 11, 0)), null);
  assert.equal(enClase({}, new Date(2026, 8, 23, 11, 0)), null);
});

/* ---------------- cola de lectura ---------------- */

t('la cola de lectura envejece: lo viejo sube aunque tenga menos prioridad', () => {
  const lecturas = [
    lecturaNueva({ id: 'l1', titulo: 'Nuevo y urgente', prioridad: 1, añadidoEn: '2026-09-20' }),
    lecturaNueva({ id: 'l2', titulo: 'Viejo y menor', prioridad: 3, añadidoEn: '2025-09-01' }),
    lecturaNueva({ id: 'l3', titulo: 'Leído', prioridad: 1, añadidoEn: '2026-01-01', leidoEn: '2026-02-01' }),
  ];
  const r = colaDeLectura(lecturas, HOY);
  assert.equal(r.cola.length, 2);
  assert.equal(r.leidas, 1);
  // 'l2' lleva más de un año: su peso baja por debajo del de 'l1'
  assert.equal(r.cola[0].id, 'l2');
  assert.equal(r.viejas, 1);
  assert.match(r.frase, /más de tres meses/);
});

t('lo que cabe en media hora se elige por el tipo cuando no hay minutos', () => {
  assert.equal(minutosDe(lecturaNueva({ tipo: 'web' })), 15);
  assert.equal(minutosDe(lecturaNueva({ tipo: 'libro' })), 90);
  assert.equal(minutosDe(lecturaNueva({ tipo: 'libro', minutos: 20 })), 20);
  const lecturas = [
    lecturaNueva({ id: 'a', titulo: 'Un libro', tipo: 'libro' }),
    lecturaNueva({ id: 'b', titulo: 'Una entrada', tipo: 'web' }),
  ];
  const elegidas = queLeerEn(lecturas, 30, HOY);
  assert.deepEqual(elegidas.map((l) => l.id), ['b']);
});

/* ---------------- decisiones no tomadas ---------------- */

t('una decisión descartada vuelve a la mesa cuando toca revisarla', () => {
  const decisiones = [
    decisionNueva({ id: 'd1', que: 'No compré X', revisarEn: '2026-01-01' }),
    decisionNueva({ id: 'd2', que: 'Aplacé Y', revisarEn: '2027-01-01' }),
    decisionNueva({ id: 'd3', que: 'Ya la miré', revisarEn: '2026-01-01', revisada: '2026-02-01' }),
  ];
  assert.deepEqual(decisionesARevisar(decisiones, HOY).map((d) => d.id), ['d1']);
  const r = resumenDecisiones(decisiones, HOY);
  assert.equal(r.total, 3);
  assert.equal(r.revisadas, 1);
  assert.equal(r.aRevisar, 1);
  assert.match(resumenDecisiones([], HOY).frase, /Son las que más enseñan/);
});

/* ---------------- horas de asesoría ---------------- */

t('las horas por estudiante salen del tiempo medido, y dice a quién no le diste ninguna', () => {
  const tesis = [{ estudiante: 'Ana', titulo: 'Redes' }, { estudiante: 'Luis', titulo: 'Control' }];
  const tareas = [
    crearTarea({ id: 't1', titulo: 'Reunión con Ana' }),
    crearTarea({ id: 't2', titulo: 'Revisar capítulo', etiquetas: ['Ana'] }),
    crearTarea({ id: 't3', titulo: 'Clase de circuitos' }),
  ];
  const registros = [
    { tareaId: 't1', minutos: 60, fecha: HOY },
    { tareaId: 't2', minutos: 60, fecha: HOY },
    { tareaId: 't3', minutos: 120, fecha: HOY },
  ];
  const r = horasPorEstudiante(tesis, tareas, registros, HOY);
  assert.equal(r.filas[0].estudiante, 'Ana');
  assert.equal(r.filas[0].horas, 2);
  assert.equal(r.filas[1].minutos, 0);
  assert.match(r.frase, /Luis no tiene tiempo medido/);
  assert.equal(horasPorEstudiante([], tareas, registros, HOY).filas.length, 0);
});

/* ---------------- riesgos ---------------- */

t('la exposición es probabilidad por impacto, y de seis para arriba es alto', () => {
  assert.equal(exposicion({ probabilidad: 3, impacto: 2 }), 6);
  assert.equal(nivelRiesgo({ probabilidad: 3, impacto: 2 }), 'alto');
  assert.equal(nivelRiesgo({ probabilidad: 2, impacto: 2 }), 'medio');
  assert.equal(nivelRiesgo({ probabilidad: 1, impacto: 2 }), 'bajo');
});

t('los riesgos vivos ponen arriba los que tocaba revisar', () => {
  const riesgos = [
    riesgoNuevo({ id: 'r1', proyecto: 'Paper', que: 'Coautor lento', probabilidad: 3, impacto: 3, revisarEn: '2027-01-01' }),
    riesgoNuevo({ id: 'r2', proyecto: 'Paper', que: 'Datos incompletos', probabilidad: 2, impacto: 2, revisarEn: '2026-01-01' }),
    riesgoNuevo({ id: 'r3', proyecto: 'Otro', que: 'De otro proyecto', probabilidad: 3, impacto: 3 }),
    riesgoNuevo({ id: 'r4', proyecto: 'Paper', que: 'Cerrado', cerrado: '2026-05-01' }),
  ];
  const vivos = riesgosVivos(riesgos, HOY, 'Paper');
  assert.deepEqual(vivos.map((r) => r.id), ['r2', 'r1']);
  assert.equal(vivos[0].tocaRevisar, true);
  assert.equal(riesgosVivos(riesgos, HOY).length, 3);
});

t('un riesgo que se cumple deja de ser riesgo y se convierte en tarea', () => {
  const r = riesgoNuevo({ que: 'La revista tarda seis meses', impacto: 3, plan: 'Mandar a otra', disparador: 'Sin respuesta en 90 días' });
  const tarea = tareaDeRiesgo(r, HOY);
  assert.match(tarea.titulo, /Se cumplió/);
  assert.equal(tarea.fecha, HOY);
  assert.equal(tarea.prioridad, 1);
  assert.match(tarea.notas, /Mandar a otra/);
  assert.match(tarea.notas, /Sin respuesta en 90 días/);
});

/* ---------------- alcance que crece ---------------- */

function planDePrueba(tareas, inicio = '2026-09-21') {
  const p = proyectoVacio('Prueba', inicio);
  p.tareas = tareas;
  return p;
}

t('el alcance que crece cuenta tareas nuevas y días añadidos desde la línea base', () => {
  const p = planDePrueba([
    tareaProyecto({ id: 'a', nombre: 'Campo', duracion: 5 }),
    tareaProyecto({ id: 'b', nombre: 'Análisis', duracion: 5, dependencias: [{ de: 'a' }] }),
  ]);
  const base = tomarLineaBase(programar(p));

  p.tareas[1].duracion = 8;
  p.tareas.push(tareaProyecto({ id: 'c', nombre: 'Revisión extra', duracion: 4, dependencias: [{ de: 'b' }] }));
  const c = alcanceQueCrece(programar(p), base, p.calendario);

  assert.equal(c.hayBase, true);
  assert.equal(c.nuevas.length, 1);
  assert.equal(c.crecidas.length, 1);
  assert.equal(c.crecidas[0].dias, 3);
  assert.equal(c.diasTotales, 7);
  assert.equal(c.pct, 70);
  assert.match(c.frase, /engordado 7 días/);
});

t('sin línea base no se inventa un crecimiento', () => {
  const p = planDePrueba([tareaProyecto({ id: 'a', nombre: 'Campo', duracion: 5 })]);
  assert.equal(alcanceQueCrece(programar(p), null).hayBase, false);
  const base = tomarLineaBase(programar(p));
  assert.match(alcanceQueCrece(programar(p), base, p.calendario).frase, /no ha crecido/);
});

/* ---------------- informes ---------------- */

const ESTADO_INFORMES = {
  tareas: [
    crearTarea({ id: 't1', titulo: 'Clase', modulo: 'docencia', proyecto: 'Circuitos', fecha: '2026-09-21', duracion: 120, creadaEn: '2026-09-20T08:00:00Z' }),
    crearTarea({ id: 't2', titulo: 'Paper', modulo: 'investigacion', proyecto: 'Paper', fecha: '2026-09-22', duracion: 60, creadaEn: '2026-09-21T08:00:00Z', completada: true, completadaEn: '2026-09-25T10:00:00Z' }),
    crearTarea({ id: 't3', titulo: 'Cartera', modulo: 'inversiones', fecha: '2026-09-23', creadaEn: '2024-01-01T08:00:00Z' }),
  ],
  historial: [
    { tareaId: 't1', titulo: 'Clase', fecha: '2026-09-21' },
    { tareaId: 't2', titulo: 'Paper', fecha: '2026-09-22' },
    { tareaId: 't1', titulo: 'Clase', fecha: '2026-09-22' },
  ],
  tiempo: [
    { tareaId: 't1', minutos: 50, fecha: '2026-09-21' },
    { tareaId: 't2', minutos: 25, fecha: '2026-09-22' },
  ],
};

t('un informe agrupa lo que se le pide y saca porcentajes que suman cien', () => {
  const r = informe(ESTADO_INFORMES, { metrica: 'completadas', agrupacion: 'modulo', dias: 30, hoyISO: HOY });
  assert.equal(r.total, 3);
  assert.equal(r.filas[0].clave, 'Docencia');
  assert.equal(r.filas[0].valor, 2);
  assert.equal(r.filas.reduce((s, f) => s + f.pct, 0), 100);
  assert.equal(r.unidad, 'tareas');
});

t('el informe de minutos usa el tiempo medido, y el de creadas respeta el periodo', () => {
  const m = informe(ESTADO_INFORMES, { metrica: 'minutos', agrupacion: 'proyecto', dias: 30, hoyISO: HOY });
  assert.equal(m.total, 75);
  assert.equal(m.filas[0].clave, 'Circuitos');
  const c = informe(ESTADO_INFORMES, { metrica: 'creadas', agrupacion: 'modulo', dias: 30, hoyISO: HOY });
  assert.equal(c.total, 2);   // la de 2024 queda fuera
});

t('un periodo sin datos se declara vacío en vez de enseñar ceros', () => {
  const r = informe(ESTADO_INFORMES, { metrica: 'completadas', agrupacion: 'modulo', dias: 1, hoyISO: '2027-06-01' });
  assert.equal(r.vacio, true);
  assert.equal(r.total, 0);
  assert.equal(informeCSV(r).split('\n').length, 1);
});

t('el CSV escapa las comillas del nombre de un grupo', () => {
  const csv = informeCSV({ unidad: 'tareas', filas: [{ clave: 'Proyecto "raro"', valor: 2, pct: 100 }] });
  assert.match(csv, /"Proyecto ""raro"""/);
});

/* ---------------- resumen semanal para el equipo ---------------- */

t('el resumen semanal cuenta lo cerrado, lo nuevo y lo que está en manos de otros', () => {
  const estado = {
    tareas: [
      crearTarea({ id: 'a', titulo: 'Enviado al coautor', espera: { quien: 'Marta', desde: '2026-09-15' } }),
      crearTarea({ id: 'b', titulo: 'Atrasada', fecha: '2026-09-10' }),
      crearTarea({ id: 'c', titulo: 'La semana que viene', fecha: '2026-09-28' }),
      crearTarea({ id: 'd', titulo: 'Nueva', creadaEn: '2026-09-22T09:00:00Z' }),
    ],
    historial: [
      { tareaId: 'x', titulo: 'Cerrada', fecha: '2026-09-21', proyecto: 'Paper' },
      { tareaId: 'y', titulo: 'Otra', fecha: '2026-09-22', proyecto: 'Paper' },
      { tareaId: 'z', titulo: 'Vieja', fecha: '2026-01-01', proyecto: 'Paper' },
    ],
  };
  const r = resumenSemanal(estado, HOY);
  assert.equal(r.cerradas.length, 2);
  assert.equal(r.bloqueadas.length, 1);
  assert.equal(r.atrasadas.length, 1);
  assert.equal(r.proximas.length, 1);
  assert.equal(r.porProyecto[0].proyecto, 'Paper');

  const txt = textoResumenSemanal(r);
  assert.match(txt, /Cerradas: 2/);
  assert.match(txt, /Marta/);
  assert.match(txt, /La semana que viene/);
});

t('una semana sin movimiento lo dice, en vez de rellenar el correo', () => {
  const txt = textoResumenSemanal(resumenSemanal({ tareas: [], historial: [] }, HOY));
  assert.match(txt, /Sin movimiento esta semana/);
});

/* ---------------- copiloto ---------------- */

const ESTADO_COPILOTO = (() => {
  const p = proyectoVacio('Paper', '2026-09-21');
  p.fechaObjetivo = '2026-10-02';
  p.tareas = [
    tareaProyecto({ id: 'a', nombre: 'Campo', duracion: 5, recurso: 'Yo' }),
    tareaProyecto({ id: 'b', nombre: 'Análisis', duracion: 10, dependencias: [{ de: 'a' }], recurso: 'Yo' }),
    tareaProyecto({ id: 'c', nombre: 'Formato', duracion: 1, recurso: 'Yo' }),
  ];
  return {
    planes: [p],
    tareas: [crearTarea({ id: 'v', titulo: 'Se me pasó', fecha: '2026-09-10' })],
    historial: [{ tareaId: 'v', titulo: 'Algo', fecha: '2026-09-22' }],
    ajustes: {},
  };
})();

t('el copiloto encuentra la pregunta por palabras clave y no se inventa una', () => {
  assert.equal(buscarPregunta('¿qué se va a retrasar?').id, 'retrasos');
  assert.equal(buscarPregunta('quién está sobrecargado').id, 'sobrecarga');
  assert.equal(buscarPregunta('qué puedo mover').id, 'mover');
  assert.equal(buscarPregunta('¿me quieres?'), null);
  assert.equal(buscarPregunta(''), null);
});

t('cuando no entiende, lo dice y ofrece lo que sí sabe calcular', () => {
  const r = preguntar('¿subirá el bitcoin?', ESTADO_COPILOTO, { hoyISO: HOY });
  assert.equal(r.entendida, false);
  assert.equal(r.opciones.length, PREGUNTAS.length);
  assert.match(r.frase, /no la sé calcular/);
});

t('“qué se va a retrasar” sale del plan y de las tareas vencidas', () => {
  const r = responder('retrasos', ESTADO_COPILOTO, { hoyISO: HOY });
  assert.equal(r.vacio, false);
  assert.ok(r.filas.some((f) => /comprometiste|después de la fecha/.test(f.texto)));
  assert.ok(r.filas.some((f) => /pasaron de fecha/.test(f.texto)));
});

t('“qué puedo mover” solo propone tareas con holgura', () => {
  const r = responder('mover', ESTADO_COPILOTO, { hoyISO: HOY });
  assert.ok(r.filas.length >= 1);
  assert.ok(r.filas.every((f) => /aguanta \d+ día/.test(f.texto)));
  assert.ok(r.filas.some((f) => f.texto.includes('Formato')));
  assert.ok(!r.filas.some((f) => f.texto.includes('Campo')));   // es crítica
});

t('“quién está sobrecargado” detecta al recurso que está en dos sitios a la vez', () => {
  const r = responder('sobrecarga', ESTADO_COPILOTO, { hoyISO: HOY });
  assert.ok(r.filas.some((f) => /Yo está en dos sitios/.test(f.texto)));
});

t('sin datos, cada respuesta lo admite en vez de rellenar', () => {
  const vacio = { planes: [], tareas: [], historial: [], ajustes: {} };
  assert.equal(responder('retrasos', vacio, { hoyISO: HOY }).vacio, true);
  assert.equal(responder('mover', vacio, { hoyISO: HOY }).vacio, true);
  assert.equal(responder('explota', vacio, { hoyISO: HOY }).vacio, true);
  assert.equal(responder('sobrecarga', vacio, { hoyISO: HOY }).vacio, true);
  assert.equal(responder('noExiste', vacio), null);
});

t('el informe completo responde todas las preguntas y es determinista', () => {
  const a = informeCompleto(ESTADO_COPILOTO, { hoyISO: HOY });
  const b = informeCompleto(ESTADO_COPILOTO, { hoyISO: HOY });
  assert.equal(a.length, PREGUNTAS.length);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

/* ---------------- sonido ambiente ---------------- */

t('los sonidos de ambiente están descritos y son los cuatro esperados', () => {
  assert.deepEqual(SONIDOS.map((s) => s.id), ['blanco', 'rosa', 'marron', 'lluvia']);
  assert.ok(SONIDOS.every((s) => s.nombre && s.descripcion));
});

console.log(`\n${passed} pruebas de interrupciones, avisos, trabajo, riesgos, informes y copiloto OK`);
