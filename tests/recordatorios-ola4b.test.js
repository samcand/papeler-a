import assert from 'node:assert/strict';
import {
  CATEGORIAS_GASTO, gastoNuevo, porMes, presupuestoDelMes, rangoDelMes,
  repetirFijos, resumenGastos,
} from '../recordatorios/src/gastos.js';
import {
  agenda, edad, personaNueva, proximaVez, regalosPendientes, resumenPersonas, tareaDeFecha, tocaPreparar,
} from '../recordatorios/src/personas.js';
import {
  RUTINAS_EJEMPLO, alternarPaso, duracionRutina, pasoNuevo, progresoRutina,
  rachaRutina, resumenRutinas, rutinaNueva, rutinasDeHoy, tocaHoy,
} from '../recordatorios/src/rutinas.js';
import {
  cuentaAtras, estadoViaje, itinerario, preparacion, presupuestoViaje, resumenViajes, viajeNuevo,
} from '../recordatorios/src/viajes.js';
import { panelDeVida } from '../recordatorios/src/panel.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';   // miércoles

/* ---------------- gastos ---------------- */

const GASTOS = [
  gastoNuevo({ id: 'g1', que: 'Arriendo', importe: 900, categoria: 'casa', fecha: '2026-09-01', fijo: true }),
  gastoNuevo({ id: 'g2', que: 'Mercado', importe: 220, categoria: 'comida', fecha: '2026-09-08' }),
  gastoNuevo({ id: 'g3', que: 'Gasolina', importe: 60, categoria: 'transporte', fecha: '2026-09-15' }),
  gastoNuevo({ id: 'g4', que: 'Cine', importe: 30, categoria: 'ocio', fecha: '2026-09-20' }),
  gastoNuevo({ id: 'g5', que: 'Hotel', importe: 400, categoria: 'viaje', fecha: '2026-09-18', viaje: 'via-1' }),
  gastoNuevo({ id: 'g6', que: 'Mercado', importe: 200, categoria: 'comida', fecha: '2026-08-10' }),
];

t('el resumen de gastos reparte por categoría y los porcentajes suman cien', () => {
  const { desde, hasta } = rangoDelMes('2026-09');
  const r = resumenGastos(GASTOS, desde, hasta);
  assert.equal(r.total, 1610);
  assert.equal(r.porCategoria[0].categoria, 'casa');
  assert.equal(r.porCategoria.reduce((s, c) => s + c.pct, 0), 100);
  assert.equal(r.fijos, 900);
  assert.equal(r.mayores[0].id, 'g1');
});

t('lo del viaje se puede separar de la vida normal', () => {
  const { desde, hasta } = rangoDelMes('2026-09');
  assert.equal(resumenGastos(GASTOS, desde, hasta, { viaje: null }).total, 1210);
  assert.equal(resumenGastos(GASTOS, desde, hasta, { viaje: 'via-1' }).total, 400);
});

t('el presupuesto compara el dinero con el tiempo del mes, que es el aviso útil', () => {
  const limites = { casa: 900, comida: 400, transporte: 150, ocio: 100 };
  const r = presupuestoDelMes(GASTOS, limites, '2026-09', HOY);
  assert.equal(r.total, 1210);            // sin lo del viaje
  assert.equal(r.totalLimite, 1550);
  assert.equal(r.pctTiempo, 77);          // 23 de 30 días
  assert.equal(r.pctDinero, 78);
  assert.ok(!r.pasadas.length);
  assert.match(r.frase, /77 % del mes y el 78 %/);

  const apretado = presupuestoDelMes(GASTOS, { casa: 500 }, '2026-09', HOY);
  assert.equal(apretado.pasadas.length, 1);
  assert.match(apretado.frase, /no llega|ya se pasó/);
});

t('sin presupuesto se dice, en vez de fingir un porcentaje', () => {
  const r = presupuestoDelMes(GASTOS, {}, '2026-09', HOY);
  assert.equal(r.pctDinero, null);
  assert.match(r.frase, /Sin presupuesto no hay con qué comparar/);
});

t('los meses se ven en fila y los recibos fijos se copian sin duplicarse', () => {
  const meses = porMes(GASTOS, 2, HOY);
  assert.deepEqual(meses.map((m) => m.mes), ['2026-08', '2026-09']);
  assert.equal(meses[0].total, 200);

  const copiados = repetirFijos(GASTOS, '2026-10', HOY);
  assert.equal(copiados.length, 1);
  assert.equal(copiados[0].que, 'Arriendo');
  assert.equal(copiados[0].fecha, '2026-10-01');
  assert.notEqual(copiados[0].id, 'g1');   // id propio: no pisa al del mes pasado
  const conElYaPuesto = [...GASTOS, ...copiados];
  assert.equal(repetirFijos(conElYaPuesto, '2026-10', HOY).length, 0);
  assert.ok(CATEGORIAS_GASTO.length >= 8);
});

/* ---------------- personas ---------------- */

const PERSONAS = [
  personaNueva({
    id: 'p1', nombre: 'Ana', cumple: '1990-10-02',
    regalos: [{ id: 'r1', que: 'Libro de cocina', precio: 40, comprado: false }],
  }),
  personaNueva({
    id: 'p2', nombre: 'Luis', cumple: '1985-03-15',
    fechas: [{ id: 'f1', que: 'Aniversario', fecha: '2020-09-28', anual: true, avisarAntes: 7 }],
  }),
  personaNueva({ id: 'p3', nombre: 'Sin fecha' }),
];

t('la edad y la próxima vez que cae una fecha se calculan bien', () => {
  assert.equal(edad('1990-10-02', HOY), 35);            // aún no cumple este año
  assert.equal(edad('1990-09-01', HOY), 36);
  assert.equal(edad(null, HOY), null);
  assert.equal(proximaVez('1990-10-02', HOY), '2026-10-02');
  assert.equal(proximaVez('1990-03-15', HOY), '2027-03-15');   // ya pasó este año
});

t('la agenda ordena por cercanía y dice cuántos cumple', () => {
  const lista = agenda(PERSONAS, HOY, 90);
  assert.deepEqual(lista.map((x) => x.que), ['Aniversario', 'Cumpleaños']);
  assert.equal(lista[0].fecha, '2026-09-28');
  assert.equal(lista[1].faltan, 9);
  assert.match(lista[1].texto, /Ana cumple 36/);
  assert.equal(agenda(PERSONAS, HOY, 3).length, 0);
});

t('lo que toca preparar es lo que entra en su ventana de aviso', () => {
  const preparar = tocaPreparar(PERSONAS, HOY);
  assert.deepEqual(preparar.map((x) => x.persona.nombre), ['Luis', 'Ana']);   // 5 y 9 días
  const tarea = tareaDeFecha(preparar[1]);
  assert.equal(tarea.fecha, '2026-10-02');
  assert.match(tarea.notas, /Libro de cocina/);
  assert.equal(regalosPendientes(PERSONAS).length, 1);
  const r = resumenPersonas(PERSONAS, HOY);
  assert.equal(r.total, 3);
  assert.equal(r.sinCumple, 1);
  assert.match(r.frase, /Aniversario de Luis/);
});

t('una fecha de una sola vez desaparece cuando pasa', () => {
  const p = [personaNueva({ nombre: 'X', fechas: [{ que: 'Grado', fecha: '2026-09-01', anual: false }] })];
  assert.equal(agenda(p, HOY, 365).length, 0);
  assert.equal(agenda(p, '2026-08-25', 365).length, 1);
});

/* ---------------- rutinas ---------------- */

function rutinaDePrueba() {
  return rutinaNueva({
    id: 'r1', nombre: 'Mañana', dias: [1, 2, 3, 4, 5],
    pasos: [pasoNuevo('Agua', 5), pasoNuevo('Planificar', 10)],
  });
}

t('una rutina sabe cuánto dura y qué días toca', () => {
  const r = rutinaDePrueba();
  assert.equal(duracionRutina(r), 15);
  assert.equal(tocaHoy(r, HOY), true);            // miércoles
  assert.equal(tocaHoy(r, '2026-09-26'), false);  // sábado
  assert.equal(tocaHoy({ ...r, activa: false }, HOY), false);
});

t('marcar pasos va y viene, y el progreso cuenta los minutos que quedan', () => {
  const r = rutinaDePrueba();
  let hechos = alternarPaso([], r.id, r.pasos[0].id, HOY);
  let p = progresoRutina(r, hechos, HOY);
  assert.equal(p.hechos, 1);
  assert.equal(p.pct, 50);
  assert.equal(p.minutosRestantes, 10);
  assert.equal(p.completa, false);

  hechos = alternarPaso(hechos, r.id, r.pasos[1].id, HOY);
  assert.equal(progresoRutina(r, hechos, HOY).completa, true);

  hechos = alternarPaso(hechos, r.id, r.pasos[0].id, HOY);
  assert.equal(progresoRutina(r, hechos, HOY).hechos, 1);
});

t('la racha salta los días en que no tocaba: el sábado no la rompe', () => {
  const r = rutinaDePrueba();
  const completo = (fecha) => ({ rutina: r.id, fecha, pasos: r.pasos.map((p) => p.id) });
  // jueves, viernes y lunes; el fin de semana no cuenta
  const registros = [completo('2026-09-17'), completo('2026-09-18'), completo('2026-09-21'),
    completo('2026-09-22'), completo('2026-09-23')];
  assert.equal(rachaRutina(r, registros, HOY), 5);

  const conHueco = registros.filter((x) => x.fecha !== '2026-09-22');
  assert.equal(rachaRutina(r, conHueco, HOY), 1);
  assert.equal(rachaRutina(r, [], HOY), 0);
});

t('las rutinas de hoy se resumen con lo que falta por hacer', () => {
  const r = rutinaDePrueba();
  const noche = rutinaNueva({ id: 'r2', nombre: 'Noche', momento: 'noche', dias: [0, 1, 2, 3, 4, 5, 6], pasos: [pasoNuevo('Diario', 5)] });
  const hoyLista = rutinasDeHoy([r, noche], [], HOY);
  assert.deepEqual(hoyLista.map((x) => x.rutina.nombre), ['Mañana', 'Noche']);
  const res = resumenRutinas([r, noche], [], HOY);
  assert.equal(res.pendientes, 2);
  assert.match(res.frase, /20 min/);
  assert.match(resumenRutinas([], [], HOY).frase, /Ninguna rutina/);
  assert.equal(RUTINAS_EJEMPLO.length, 2);
});

/* ---------------- viajes ---------------- */

const VIAJE = viajeNuevo({ id: 'via-1', nombre: 'Madrid', destino: 'Madrid', desde: '2026-10-10', hasta: '2026-10-14', presupuesto: 1500, personas: 2 });

t('el viaje sabe si es antes, durante o después, y cuenta atrás', () => {
  assert.equal(estadoViaje(VIAJE, HOY), 'proximo');
  assert.equal(cuentaAtras(VIAJE, HOY).dias, 17);
  assert.equal(estadoViaje(VIAJE, '2026-10-12'), 'encurso');
  assert.match(cuentaAtras(VIAJE, '2026-10-12').texto, /Día 3 de 5/);
  assert.equal(estadoViaje(VIAJE, '2026-11-01'), 'pasado');
});

t('el itinerario sale de las tareas que caen entre las dos fechas', () => {
  const tareas = [
    crearTarea({ titulo: 'Museo del Prado', fecha: '2026-10-11', hora: '10:00' }),
    crearTarea({ titulo: 'Desayuno', fecha: '2026-10-11', hora: '08:00' }),
    crearTarea({ titulo: 'Nada que ver', fecha: '2026-11-20' }),
  ];
  const dias = itinerario(VIAJE, tareas);
  assert.equal(dias.length, 5);
  assert.equal(dias[0].fecha, '2026-10-10');
  assert.deepEqual(dias[1].tareas.map((t) => t.titulo), ['Desayuno', 'Museo del Prado']);
  assert.equal(dias[4].tareas.length, 0);
});

t('la preparación son las tareas del viaje anteriores a salir', () => {
  const tareas = [
    crearTarea({ titulo: 'Hacer la maleta', fecha: '2026-10-09', etiquetas: ['madrid'] }),
    crearTarea({ titulo: 'Reservar hotel', fecha: '2026-09-30', proyecto: 'Madrid', completada: true }),
    crearTarea({ titulo: 'Sacar efectivo', fecha: '2026-10-07', proyecto: 'Madrid' }),
  ];
  assert.deepEqual(preparacion(VIAJE, tareas).map((t) => t.titulo), ['Hacer la maleta', 'Sacar efectivo']);
});

t('el presupuesto del viaje cuenta solo sus gastos y reparte por persona', () => {
  const p = presupuestoViaje(VIAJE, GASTOS, HOY);
  assert.equal(p.gastado, 400);
  assert.equal(p.resto, 1100);
  assert.equal(p.pct, 27);
  assert.equal(p.porPersona, 200);
  assert.equal(p.pasado, false);
  assert.match(p.frase, /400 de 1500/);

  const sinTope = presupuestoViaje({ ...VIAJE, presupuesto: 0 }, GASTOS, HOY);
  assert.match(sinTope.frase, /Sin presupuesto/);
  const pasado = presupuestoViaje({ ...VIAJE, presupuesto: 300 }, GASTOS, HOY);
  assert.equal(pasado.pasado, true);
  assert.match(pasado.frase, /Te pasaste 100/);
});

t('el resumen de viajes dice cuál está en curso o cuál viene', () => {
  const r = resumenViajes([VIAJE], HOY);
  assert.equal(r.proximo.id, 'via-1');
  assert.match(r.frase, /Próximo viaje: Madrid/);
  assert.match(resumenViajes([], HOY).frase, /Ningún viaje/);
  assert.equal(resumenViajes([VIAJE], '2026-10-12').enCurso.id, 'via-1');
});

/* ---------------- panel de vida ---------------- */

const OBJETIVO_PANEL = {
  id: 'o1', que: 'Leer 24 libros', ambito: 'aprender', tipo: 'numero',
  desde: '2026-01-01', hasta: '2026-12-31', meta: 24, actual: 4, unidad: 'libros',
};

t('el panel junta lo que ya hay y ordena los avisos por urgencia', () => {
  const estado = {
    tareas: [
      crearTarea({ id: 'v', titulo: 'Atrasada', fecha: '2026-09-10' }),
      crearTarea({ id: 'h', titulo: 'De hoy', fecha: HOY }),
    ],
    historial: [{ tareaId: 'x', fecha: HOY }],
    gastos: GASTOS,
    presupuestos: { casa: 500 },
    objetivos: [OBJETIVO_PANEL],
    personas: PERSONAS,
    rutinas: [rutinaDePrueba()],
    rutinasHechas: [],
    viajes: [VIAJE],
    notas: [],
    ajustes: {},
  };
  const p = panelDeVida(estado, HOY);
  assert.equal(p.tarjetas.length, 8);
  assert.equal(p.tarjetas.find((t) => t.id === 'dia').nivel, 'mal');
  assert.equal(p.tarjetas.find((t) => t.id === 'notas').nivel, 'vacio');
  assert.ok(p.vacias.includes('Notas y diario'));
  assert.equal(p.avisos[0].nivel, 'alto');
  assert.match(p.avisos[0].texto, /atrasadas/);
  assert.ok(p.avisos.some((a) => /Presupuesto pasado/.test(a.texto)));
  assert.ok(p.avisos.some((a) => /Ana cumple/.test(a.texto)));
  const niveles = p.avisos.map((a) => ({ alto: 0, medio: 1, bajo: 2 })[a.nivel]);
  assert.deepEqual(niveles, [...niveles].sort((a, b) => a - b));
});

t('un panel sin datos lo dice y no enseña ceros que parecen datos', () => {
  const p = panelDeVida({ tareas: [], historial: [], ajustes: {} }, HOY);
  assert.equal(p.avisos.length, 0);
  assert.match(p.frase, /Nada pide atención/);
  assert.ok(p.tarjetas.filter((t) => t.nivel === 'vacio').length >= 6);
  assert.ok(p.tarjetas.filter((t) => t.valor === '—').length >= 6);
});

console.log(`\n${passed} pruebas de gastos, personas, rutinas, viajes y panel OK`);
