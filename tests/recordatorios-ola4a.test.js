import assert from 'node:assert/strict';
import {
  buscarNotas, enlaces, entradaDiario, etiquetasDeNotas, haceTiempo, notaNueva,
  rachaDiario, relaciones, resumenNotas,
} from '../recordatorios/src/notas.js';
import {
  PLANTILLAS_COLECCION, coleccionNueva, desdePlantilla, fichaNueva, filtrarFichas,
  ordenarFichas, resumenColeccion, tareaDeVencimiento, tituloFicha, vencimientos,
} from '../recordatorios/src/colecciones.js';
import { aRevisar, avance, objetivoNuevo, progreso, resumenObjetivos } from '../recordatorios/src/objetivos.js';
import {
  SERVICIOS_CARRO, contadorNuevo, estadoServicio, lecturaActual, marcarHecho,
  proximosServicios, registrarLectura, resumenMantenimiento, servicioNuevo, usoDiario,
} from '../recordatorios/src/mantenimiento.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';

/* ---------------- notas ---------------- */

t('los enlaces [[así]] se sacan del texto sin repetirse', () => {
  assert.deepEqual(enlaces('Ver [[Tesis de Ana]] y otra vez [[Tesis de Ana]] y [[Cartera]].'),
    ['Tesis de Ana', 'Cartera']);
  assert.deepEqual(enlaces('Sin enlaces'), []);
  assert.deepEqual(enlaces(null), []);
});

t('una nota sabe a quién apunta, quién la apunta y qué enlace está roto', () => {
  const a = notaNueva({ id: 'a', titulo: 'Cartera', texto: 'Ver [[Tesis de NVDA]] y [[No escrita]].' });
  const b = notaNueva({ id: 'b', titulo: 'Tesis de NVDA', texto: 'Sale de [[Cartera]].' });
  const r = relaciones(a, [a, b]);
  assert.deepEqual(r.salientes.map((n) => n.id), ['b']);
  assert.deepEqual(r.entrantes.map((n) => n.id), ['b']);
  assert.deepEqual(r.rotos, ['No escrita']);
});

t('buscar notas cruza texto y @etiqueta, y no distingue acentos', () => {
  const notas = [
    notaNueva({ id: '1', titulo: 'Reunión de área', texto: 'Acordamos el calendario', etiquetas: ['trabajo'] }),
    notaNueva({ id: '2', titulo: 'Idea para el paper', texto: 'Medir la latencia', etiquetas: ['investigacion'] }),
  ];
  assert.deepEqual(buscarNotas(notas, 'reunion').map((n) => n.id), ['1']);
  assert.deepEqual(buscarNotas(notas, '@investigacion').map((n) => n.id), ['2']);
  assert.deepEqual(buscarNotas(notas, 'latencia @investigacion').map((n) => n.id), ['2']);
  assert.deepEqual(buscarNotas(notas, 'latencia @trabajo').map((n) => n.id), []);
  assert.equal(buscarNotas(notas, '').length, 2);
  assert.deepEqual(etiquetasDeNotas(notas).map((e) => e.etiqueta).sort(), ['investigacion', 'trabajo']);
});

t('el diario es una nota con fecha: racha, entrada del día y "hace un año"', () => {
  const dias = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-19'];
  const notas = dias.map((f) => notaNueva({ id: f, tipo: 'diario', fecha: f, titulo: f, texto: 'lo de hoy' }));
  notas.push(notaNueva({ id: 'viejo', tipo: 'diario', fecha: '2025-09-24', texto: 'hace un año' }));

  assert.equal(entradaDiario(notas, '2026-09-22').id, '2026-09-22');
  assert.equal(entradaDiario(notas, '2026-09-20'), null);
  assert.equal(rachaDiario(notas, HOY), 3);      // 21, 22 y 23; el 20 corta

  const antes = haceTiempo(notas, HOY, { anios: [1] });
  assert.equal(antes.length, 1);
  assert.equal(antes[0].nota.id, 'viejo');
  assert.equal(haceTiempo(notas, HOY, { anios: [4] }).length, 0);
});

t('la racha del diario aguanta que hoy todavía no esté escrito', () => {
  const notas = ['2026-09-21', '2026-09-22'].map((f) => notaNueva({ tipo: 'diario', fecha: f }));
  assert.equal(rachaDiario(notas, HOY), 2);
  assert.equal(rachaDiario(notas, '2026-09-25'), 0);   // dos días sin escribir: se rompió
});

t('el resumen señala las notas que son un cajón y no un segundo cerebro', () => {
  const notas = [
    notaNueva({ id: '1', titulo: 'Suelta', texto: 'sin nada' }),
    notaNueva({ id: '2', titulo: 'Con enlace', texto: 'a [[Suelta]]' }),
  ];
  const r = resumenNotas(notas, HOY);
  assert.equal(r.sueltas, 2);
  assert.equal(r.huerfanas, 0);        // "Suelta" recibe un enlace, así que no está huérfana
  assert.match(resumenNotas([notaNueva({ titulo: 'Sola', texto: '' })], HOY).frase, /cajón/);
  assert.match(resumenNotas([], HOY).frase, /Ninguna nota/);
});

/* ---------------- colecciones ---------------- */

const CARRO = desdePlantilla(PLANTILLAS_COLECCION.find((p) => p.id === 'vehiculo'));

t('una plantilla de colección trae sus campos y su campo principal', () => {
  assert.equal(CARRO.nombre, 'Vehículos');
  assert.ok(CARRO.campos.length > 5);
  const ficha = fichaNueva(CARRO, { nombre: 'Mazda 3', seguro: '2026-10-01' });
  assert.equal(tituloFicha(CARRO, ficha), 'Mazda 3');
  assert.equal(tituloFicha(CARRO, fichaNueva(CARRO)), 'Sin nombre');
  assert.equal(ficha.coleccion, CARRO.id);
});

t('las fichas se filtran por cualquier campo y se ordenan por el tipo correcto', () => {
  const col = coleccionNueva({
    campos: [
      { id: 'nombre', nombre: 'Nombre', tipo: 'texto', principal: true },
      { id: 'precio', nombre: 'Precio', tipo: 'numero' },
    ],
  });
  const fichas = [
    fichaNueva(col, { nombre: 'Taladro', precio: 90 }),
    fichaNueva(col, { nombre: 'Escalera', precio: 120 }),
    fichaNueva(col, { nombre: 'Sierra', precio: 9 }),
  ];
  assert.deepEqual(filtrarFichas(fichas, 'esca').map((f) => f.valores.nombre), ['Escalera']);
  assert.equal(filtrarFichas(fichas, '').length, 3);
  // por número, no alfabéticamente: 9 va antes que 90 y 120
  assert.deepEqual(ordenarFichas(fichas, col, 'precio').map((f) => f.valores.precio), [9, 90, 120]);
  assert.deepEqual(ordenarFichas(fichas, col, 'nombre').map((f) => f.valores.nombre), ['Escalera', 'Sierra', 'Taladro']);
});

t('los campos de fecha marcados avisan, y lo vencido va primero', () => {
  const fichas = [
    fichaNueva(CARRO, { nombre: 'Mazda 3', seguro: '2026-09-10', tecnica: '2026-10-05' }),
    fichaNueva(CARRO, { nombre: 'Moto', seguro: '2027-05-01' }),
  ];
  const avisos = vencimientos(CARRO, fichas, HOY, 45);
  assert.equal(avisos.length, 2);                       // el seguro vencido y la técnica cercana
  assert.equal(avisos[0].vencido, true);
  assert.match(avisos[0].texto, /venció hace 13 días/);
  assert.match(avisos[1].texto, /en 12 días/);
  const tarea = tareaDeVencimiento(CARRO, avisos[0]);
  assert.equal(tarea.prioridad, 1);
  assert.equal(tarea.modulo, 'personal');
});

t('el resumen de una colección cuenta sus sí/no, su dinero y su elección más común', () => {
  const libros = desdePlantilla(PLANTILLAS_COLECCION.find((p) => p.id === 'biblioteca'));
  const fichas = [
    fichaNueva(libros, { titulo: 'Uno', leido: true, formato: 'papel' }),
    fichaNueva(libros, { titulo: 'Dos', leido: false, formato: 'papel' }),
    fichaNueva(libros, { titulo: 'Tres', leido: true, formato: 'digital' }),
  ];
  const r = resumenColeccion(libros, fichas, HOY);
  assert.equal(r.fichas, 3);
  assert.ok(r.cuentas.some((c) => c.texto === '2 de 3'));
  assert.ok(r.cuentas.some((c) => c.texto === 'papel (2)'));
});

/* ---------------- objetivos ---------------- */

t('el avance sale del número, de las tareas cerradas o del sí/no', () => {
  assert.equal(avance(objetivoNuevo({ tipo: 'numero', meta: 24, actual: 6 })).pct, 25);
  assert.equal(avance(objetivoNuevo({ tipo: 'siNo', hecho: true })).pct, 100);

  const o = objetivoNuevo({ tipo: 'tareas', proyecto: 'Cartera', meta: 4, desde: '2026-09-01', hasta: '2026-12-31' });
  const datos = {
    tareas: [{ id: 't1', proyecto: 'Cartera' }],
    historial: [
      { tareaId: 't1', fecha: '2026-09-10' },
      { tareaId: 't1', fecha: '2026-09-12' },
      { tareaId: 't1', fecha: '2026-08-01' },           // antes de empezar: no cuenta
      { tareaId: 'otra', proyecto: 'Otro', fecha: '2026-09-11' },
    ],
  };
  assert.equal(avance(o, datos).actual, 2);
  assert.equal(avance(o, datos).pct, 50);
});

t('el progreso compara lo hecho con el tiempo gastado, no solo el porcentaje', () => {
  const o = objetivoNuevo({ que: 'Leer 24 libros', meta: 24, actual: 6, desde: '2026-01-01', hasta: '2026-12-31', unidad: 'libros' });
  const p = progreso(o, {}, HOY);
  assert.equal(p.pct, 25);
  assert.ok(p.pctTiempo > 70);
  assert.equal(p.alDia, false);
  assert.match(p.frase, /atrasado/);
  assert.ok(p.porSemana > 0);

  const alDia = progreso(objetivoNuevo({ meta: 10, actual: 9, desde: '2026-01-01', hasta: '2026-12-31' }), {}, HOY);
  assert.equal(alDia.alDia, true);
  assert.match(alDia.frase, /al día/);
});

t('sin fecha no se inventa un ritmo, y pasada la fecha se dice sin adornos', () => {
  const sinFecha = progreso(objetivoNuevo({ meta: 5, actual: 1 }), {}, HOY);
  assert.equal(sinFecha.conFecha, false);
  assert.equal(sinFecha.porSemana, null);
  assert.match(sinFecha.frase, /Sin fecha/);

  const pasado = progreso(objetivoNuevo({ meta: 5, actual: 1, desde: '2025-01-01', hasta: '2025-12-31' }), {}, HOY);
  assert.match(pasado.frase, /Se pasó la fecha/);
});

t('los objetivos se resumen con los que van tarde y los que tocaba revisar', () => {
  const objetivos = [
    objetivoNuevo({ id: 'o1', que: 'Leer', meta: 24, actual: 4, desde: '2026-01-01', hasta: '2026-12-31', revisarEn: '2026-09-01' }),
    objetivoNuevo({ id: 'o2', que: 'Correr', meta: 100, actual: 100, logradoEn: '2026-06-01' }),
    objetivoNuevo({ id: 'o3', que: 'Otra cosa', meta: 10, actual: 1, abandonadoEn: '2026-05-01', porque: 'Ya no me interesa' }),
  ];
  const r = resumenObjetivos(objetivos, {}, HOY);
  assert.equal(r.enCurso, 1);
  assert.equal(r.logrados, 1);
  assert.equal(r.abandonados, 1);
  assert.equal(r.atrasados, 1);
  assert.deepEqual(aRevisar(objetivos, HOY).map((o) => o.id), ['o1']);
  assert.match(resumenObjetivos([], {}, HOY).frase, /intención/);
});

/* ---------------- mantenimiento por uso ---------------- */

function contadorDePrueba() {
  let c = contadorNuevo({ id: 'c1', nombre: 'Mazda 3', unidad: 'km' });
  c = registrarLectura(c, 40000, '2026-06-25').contador;
  c = registrarLectura(c, 45000, '2026-09-23').contador;
  return c;
}

t('el contador no baja, y una lectura del mismo día se reemplaza', () => {
  let c = contadorNuevo({ id: 'c1' });
  c = registrarLectura(c, 1000, '2026-09-01').contador;
  const malo = registrarLectura(c, 900, '2026-09-20');
  assert.equal(malo.ok, false);
  assert.match(malo.error, /no baja/);
  assert.equal(registrarLectura(c, 'ocho mil', '2026-09-20').ok, false);
  c = registrarLectura(c, 1200, '2026-09-01').contador;
  assert.equal(c.lecturas.length, 1);
  assert.equal(lecturaActual(c).valor, 1200);
});

t('el uso diario necesita dos lecturas separadas al menos una semana', () => {
  const c = contadorDePrueba();
  assert.equal(usoDiario(c), 55.6);                     // 5.000 km en 90 días
  assert.equal(usoDiario(contadorNuevo()), null);
  const juntas = registrarLectura(registrarLectura(contadorNuevo(), 10, '2026-09-20').contador, 100, '2026-09-23').contador;
  assert.equal(usoDiario(juntas), null);
});

t('un servicio vence por kilómetros o por meses, lo que llegue antes', () => {
  const c = contadorDePrueba();
  const aceite = servicioNuevo({ contador: 'c1', nombre: 'Aceite', cadaUso: 5000, cadaDias: 180, ultimoUso: 42000, ultimaFecha: '2026-08-01' });
  const e = estadoServicio(aceite, c, HOY);
  assert.equal(e.restanUso, 2000);                      // 42.000 + 5.000 - 45.000
  assert.equal(e.restanDias, 127);   // 1 de agosto + 180 días = 28 de enero
  assert.equal(e.vencido, false);
  // al ritmo medido, los 2.000 km caen antes que los 132 días
  assert.ok(e.fechaPorUso < e.proximaFecha);
  assert.equal(e.fechaEstimada, e.fechaPorUso);
  assert.match(e.texto, /faltan 2000 km o 127 días/);
});

t('lo vencido se dice en la unidad que venció', () => {
  const c = contadorDePrueba();
  const porKm = servicioNuevo({ contador: 'c1', cadaUso: 5000, cadaDias: null, ultimoUso: 39000, ultimaFecha: '2026-01-01' });
  assert.match(estadoServicio(porKm, c, HOY).texto, /Vencido por 1000 km/);
  const porTiempo = servicioNuevo({ contador: 'c1', cadaUso: null, cadaDias: 180, ultimoUso: null, ultimaFecha: '2026-01-01' });
  const e = estadoServicio(porTiempo, c, HOY);
  assert.equal(e.vencido, true);
  assert.match(e.texto, /Vencido hace \d+ días/);
});

t('sin el último cambio apuntado, lo dice en vez de estimar', () => {
  const c = contadorDePrueba();
  const e = estadoServicio(servicioNuevo({ contador: 'c1' }), c, HOY);
  assert.equal(e.sinDatos, true);
  assert.equal(e.vencido, false);
  assert.match(e.texto, /no se sabe cuándo toca/);
});

t('marcar hecho reinicia el servicio con el kilometraje de hoy', () => {
  const c = contadorDePrueba();
  const s = marcarHecho(servicioNuevo({ contador: 'c1', cadaUso: 5000 }), c, HOY);
  assert.equal(s.ultimoUso, 45000);
  assert.equal(s.ultimaFecha, HOY);
  assert.equal(estadoServicio(s, c, HOY).restanUso, 5000);
});

t('el resumen pone lo vencido primero y el plan del carro trae seis servicios', () => {
  const c = contadorDePrueba();
  const servicios = [
    servicioNuevo({ id: 's1', contador: 'c1', nombre: 'Aceite', cadaUso: 5000, ultimoUso: 44000, ultimaFecha: '2026-09-01' }),
    servicioNuevo({ id: 's2', contador: 'c1', nombre: 'Llantas', cadaUso: 10000, ultimoUso: 30000, ultimaFecha: '2025-09-01' }),
  ];
  const r = resumenMantenimiento(servicios, [c], HOY);
  assert.equal(r.vencidos, 1);
  assert.equal(proximosServicios(servicios, [c], HOY)[0].servicio.id, 's2');
  assert.match(r.frase, /llantas/i);
  assert.equal(SERVICIOS_CARRO.length, 6);
  assert.ok(SERVICIOS_CARRO.every((s) => s.cadaUso && s.cadaDias));
});

console.log(`\n${passed} pruebas de notas, colecciones, objetivos y mantenimiento OK`);
