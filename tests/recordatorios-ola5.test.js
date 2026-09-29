import assert from 'node:assert/strict';
import { cumplimiento, enRiesgo, estadoLimite, resumenLimites } from '../recordatorios/src/limites.js';
import {
  bloqueaA, bloqueadas, bloqueantes, cadena, desbloqueadasHoy, disponibles,
  estaBloqueada, haríaCiclo, primerPaso, resumenDependencias,
} from '../recordatorios/src/dependencias.js';
import { conflictosEntrePlanes, filasCartera, cargaTotal, resumenCartera } from '../recordatorios/src/cartera.js';
import { parseEntrada, aTextoEntrada } from '../recordatorios/src/naturales.js';
import { aplicarFiltro } from '../recordatorios/src/filtros.js';
import { crearTarea } from '../recordatorios/src/modelo.js';
import { proyectoVacio, tareaProyecto } from '../recordatorios/src/proyectos.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';

/* ---------------- fecha límite ---------------- */

t('sin plazo no se inventa urgencia', () => {
  const e = estadoLimite(crearTarea({ titulo: 'Sin plazo', fecha: HOY }), HOY);
  assert.equal(e.hayLimite, false);
  assert.equal(e.texto, '');
});

t('planificarla para después de que venza es el aviso que importa', () => {
  const e = estadoLimite(crearTarea({ titulo: 'Paper', fecha: '2026-11-05', limite: '2026-10-30' }), HOY);
  assert.equal(e.nivel, 'imposible');
  assert.equal(e.planificadaTarde, true);
  assert.match(e.texto, /así no llega/);
});

t('el plazo vencido, el de hoy y el de pasado mañana se distinguen', () => {
  assert.equal(estadoLimite(crearTarea({ limite: '2026-09-20' }), HOY).nivel, 'vencido');
  assert.equal(estadoLimite(crearTarea({ limite: HOY }), HOY).nivel, 'hoy');
  assert.equal(estadoLimite(crearTarea({ limite: '2026-09-25', fecha: '2026-09-24' }), HOY).nivel, 'cerca');
  assert.equal(estadoLimite(crearTarea({ limite: '2026-10-30', fecha: '2026-10-20' }), HOY).nivel, 'ok');
});

t('un plazo lejano sin día asignado es una tarea que no existe en ningún sitio', () => {
  const e = estadoLimite(crearTarea({ titulo: 'Renovar el pasaporte', limite: '2026-12-01' }), HOY);
  assert.equal(e.nivel, 'sinPlan');
  assert.match(e.texto, /no está puesta en ningún día/);
});

t('una vez hecha, lo que cuenta es si llegó a tiempo', () => {
  const aTiempo = crearTarea({ limite: '2026-09-30', completada: true, completadaEn: '2026-09-28T10:00:00Z' });
  const tarde = crearTarea({ limite: '2026-09-20', completada: true, completadaEn: '2026-09-22T10:00:00Z' });
  assert.equal(estadoLimite(aTiempo, HOY).nivel, 'cumplido');
  assert.equal(estadoLimite(tarde, HOY).nivel, 'incumplido');
  const c = cumplimiento([aTiempo, tarde, crearTarea({ titulo: 'sin plazo', completada: true })]);
  assert.equal(c.total, 2);
  assert.equal(c.pct, 50);
  assert.match(cumplimiento([]).frase, /no hay historial/);
});

t('lo que aprieta sale ordenado: primero lo vencido, después lo imposible', () => {
  const tareas = [
    crearTarea({ id: 'ok', titulo: 'Tranquila', limite: '2026-12-01', fecha: '2026-11-20' }),
    crearTarea({ id: 'imp', titulo: 'Imposible', limite: '2026-10-30', fecha: '2026-11-05' }),
    crearTarea({ id: 'ven', titulo: 'Vencida', limite: '2026-09-01' }),
    crearTarea({ id: 'cerca', titulo: 'Cerca', limite: '2026-09-25', fecha: '2026-09-24' }),
  ];
  const lista = enRiesgo(tareas, HOY);
  assert.deepEqual(lista.map((x) => x.tarea.id), ['ven', 'imp', 'cerca']);
  const r = resumenLimites(tareas, HOY);
  assert.equal(r.vencidos, 1);
  assert.equal(r.imposibles, 1);
  assert.match(r.frase, /vencido/);
  assert.match(resumenLimites([], HOY).frase, /Ningún plazo aprieta/);
});

t('el plazo se escribe hablando y se vuelve a escribir igual', () => {
  const p = parseEntrada('Enviar el paper mañana antes del 30 de octubre', { hoy: HOY });
  assert.equal(p.titulo, 'Enviar el paper');
  assert.equal(p.fecha, '2026-09-24');
  assert.equal(p.limite, '2026-10-30');
  assert.equal(parseEntrada('Pagar el recibo límite 15/11', { hoy: HOY }).limite, '2026-11-15');
  assert.equal(parseEntrada('Llamar al banco vence el viernes', { hoy: HOY }).limite, '2026-09-25');
  // "antes de dormir" no es un plazo: sin fecha detrás, no se toca el título.
  assert.equal(parseEntrada('Revisar antes de dormir', { hoy: HOY }).limite, null);
  assert.equal(parseEntrada('Revisar antes de dormir', { hoy: HOY }).titulo, 'Revisar antes de dormir');
  assert.match(aTextoEntrada({ titulo: 'Paper', limite: '2026-10-30' }), /antes del 2026-10-30/);
});

t('los filtros entienden los plazos y los bloqueos', () => {
  const tareas = [
    crearTarea({ id: 'a', titulo: 'Con plazo', limite: '2026-10-30', fecha: '2026-11-05' }),
    crearTarea({ id: 'b', titulo: 'Sin plazo' }),
    crearTarea({ id: 'c', titulo: 'Esperando', dependeDe: ['b'] }),
  ];
  const f = (q) => aplicarFiltro(q, tareas, { hoy: HOY }).map((x) => x.id);
  assert.deepEqual(f('con plazo'), ['a']);
  assert.deepEqual(f('sin plazo'), ['b', 'c']);
  assert.deepEqual(f('en riesgo'), ['a']);
  assert.deepEqual(f('bloqueadas'), ['c']);
  assert.deepEqual(f('libres'), ['a', 'b']);
});

/* ---------------- dependencias entre tareas ---------------- */

function tareasEncadenadas() {
  return [
    crearTarea({ id: '1', titulo: 'Pedir los datos' }),
    crearTarea({ id: '2', titulo: 'Analizar', dependeDe: ['1'] }),
    crearTarea({ id: '3', titulo: 'Escribir', dependeDe: ['2'] }),
    crearTarea({ id: '4', titulo: 'Suelta' }),
  ];
}

t('una tarea sabe a quién espera y a quién hace esperar', () => {
  const tareas = tareasEncadenadas();
  assert.deepEqual(bloqueantes(tareas[1], tareas).map((t2) => t2.id), ['1']);
  assert.deepEqual(bloqueaA(tareas[0], tareas).map((t2) => t2.id), ['2']);
  assert.equal(estaBloqueada(tareas[2], tareas), true);
  assert.equal(estaBloqueada(tareas[3], tareas), false);
});

t('lo que se puede hacer ya excluye lo que espera a otra cosa', () => {
  const tareas = tareasEncadenadas();
  assert.deepEqual(disponibles(tareas, HOY).map((t2) => t2.id), ['1', '4']);
  assert.deepEqual(bloqueadas(tareas).map((t2) => t2.id), ['2', '3']);
});

t('al completar la primera, la siguiente queda libre y se avisa', () => {
  const tareas = tareasEncadenadas();
  tareas[0].completada = true;
  tareas[0].completadaEn = `${HOY}T09:00:00Z`;
  assert.deepEqual(desbloqueadasHoy(tareas, HOY).map((t2) => t2.id), ['2']);
  // La tercera sigue esperando a la segunda: no se desbloquea en cadena.
  assert.equal(estaBloqueada(tareas[2], tareas), true);
  // Y si se completó otro día, no se anuncia hoy.
  tareas[0].completadaEn = '2026-09-10T09:00:00Z';
  assert.equal(desbloqueadasHoy(tareas, HOY).length, 0);
});

t('no se puede cerrar un círculo', () => {
  const tareas = tareasEncadenadas();
  assert.equal(haríaCiclo('1', '3', tareas), true);    // 3 ya depende de 1 por la cadena
  assert.equal(haríaCiclo('1', '1', tareas), true);
  assert.equal(haríaCiclo('4', '3', tareas), false);
});

t('la cadena dice por dónde empezar a desatascar', () => {
  const tareas = tareasEncadenadas();
  const c = cadena(tareas[2], tareas);
  assert.deepEqual(c.map((x) => x.tarea.id), ['2', '1']);
  assert.deepEqual(c.map((x) => x.nivel), [1, 2]);
  assert.equal(primerPaso(tareas[2], tareas).id, '1');
  assert.equal(primerPaso(tareas[3], tareas), null);

  const r = resumenDependencias(tareas, HOY);
  assert.equal(r.bloqueadas, 2);
  assert.equal(r.enCascada, 1);
  assert.match(r.frase, /esperando a otras/);
  assert.match(resumenDependencias([crearTarea({ titulo: 'sola' })], HOY).frase, /Nada está esperando/);
});

/* ---------------- cartera de proyectos ---------------- */

function planDe(nombre, inicio, tareas, extra = {}) {
  const p = proyectoVacio(nombre, inicio);
  p.tareas = tareas;
  return { ...p, ...extra };
}

const PLANES = [
  planDe('Paper', '2026-09-21', [
    tareaProyecto({ id: 'a1', nombre: 'Campo', duracion: 10, recurso: 'Yo' }),
    tareaProyecto({ id: 'a2', nombre: 'Envío', duracion: 0, esHito: true, dependencias: [{ de: 'a1' }] }),
  ], { fechaObjetivo: '2026-09-30' }),
  planDe('Curso', '2026-09-21', [
    tareaProyecto({ id: 'b1', nombre: 'Preparar material', duracion: 8, recurso: 'Yo' }),
  ], { fechaObjetivo: '2026-12-01' }),
];

t('la cartera pone delante los proyectos que no llegan', () => {
  const filas = filasCartera(PLANES, HOY);
  assert.equal(filas[0].proyecto.nombre, 'Paper');
  assert.equal(filas[0].nivel, 'mal');
  assert.ok(filas[0].diasTarde >= 1);
  assert.equal(filas[1].nivel, 'bien');
  assert.equal(filas[0].proximoHito.nombre, 'Envío');
});

t('el mismo recurso en dos proyectos a la vez solo se ve juntándolos', () => {
  const ch = conflictosEntrePlanes(PLANES, HOY);
  assert.equal(ch.length, 1);
  assert.equal(ch[0].recurso, 'Yo');
  assert.deepEqual(ch[0].proyectos.sort(), ['Curso', 'Paper']);
  assert.ok(ch[0].dias > 1, 'los días seguidos se agrupan en una racha');
  assert.match(ch[0].texto, /a la vez del /);
  // Un solo proyecto nunca choca consigo mismo.
  assert.equal(conflictosEntrePlanes([PLANES[0]], HOY).length, 0);
});

t('la carga total suma los días de todos los proyectos', () => {
  const carga = cargaTotal(PLANES);
  assert.equal(carga.length, 1);
  assert.equal(carga[0].recurso, 'Yo');
  assert.equal(carga[0].dias, 18);
  assert.deepEqual(carga[0].proyectos.sort(), ['Curso', 'Paper']);
});

t('el resumen dice lo que hay que oír, y sin planes lo admite', () => {
  const r = resumenCartera(PLANES, HOY);
  assert.equal(r.total, 2);
  assert.equal(r.enRiesgo, 1);
  assert.match(r.frase, /no llegan a su fecha/);
  assert.ok(r.proximosHitos.length >= 1);
  assert.match(resumenCartera([], HOY).frase, /Todavía no hay proyectos/);
});

console.log(`\n${passed} pruebas de plazos, dependencias y cartera OK`);
