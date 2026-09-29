/**
 * recordatorios-fusion.test.js — Unir dos dispositivos sin perder nada.
 *
 * Las dos cosas que tienen que ser verdad para poder confiar en la nube:
 * que llegue todo, y que lo borrado se quede borrado.
 */

import assert from 'node:assert/strict';
import {
  LISTAS_POR_ID, fusionar, lapida, lapidas, marcaDe, purgarLapidas, unirFichas,
  unirRegistros,
} from '../recordatorios/src/fusion.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

const ANTES = '2026-09-20T10:00:00.000Z';
const DESPUES = '2026-09-21T10:00:00.000Z';
const HOY = '2026-09-22T10:00:00.000Z';

/* ---------------- lo básico ---------------- */

t('lo que solo existe en un aparato llega al otro', () => {
  const r = fusionar(
    { tareas: [{ id: 'a', titulo: 'Del compu', creadaEn: ANTES }] },
    { tareas: [{ id: 'b', titulo: 'Del móvil', creadaEn: ANTES }] },
  );
  assert.deepEqual(r.estado.tareas.map((x) => x.id).sort(), ['a', 'b']);
  assert.equal(r.cuenta.nuevas, 1);
});

t('de dos versiones de la misma ficha gana la más reciente', () => {
  const r = fusionar(
    { tareas: [{ id: 'a', titulo: 'vieja', actualizadoEn: ANTES }] },
    { tareas: [{ id: 'a', titulo: 'nueva', actualizadoEn: DESPUES }] },
  );
  assert.equal(r.estado.tareas[0].titulo, 'nueva');
  assert.equal(r.cuenta.actualizadas, 1);
});

t('a igualdad de marca manda el aparato que tienes delante', () => {
  const r = fusionar(
    { tareas: [{ id: 'a', titulo: 'aquí', actualizadoEn: ANTES }] },
    { tareas: [{ id: 'a', titulo: 'allá', actualizadoEn: ANTES }] },
  );
  assert.equal(r.estado.tareas[0].titulo, 'aquí');
});

t('una ficha sin marca no pisa a una que sí la tiene', () => {
  const r = fusionar(
    { tareas: [{ id: 'a', titulo: 'con fecha', actualizadoEn: DESPUES }] },
    { tareas: [{ id: 'a', titulo: 'sin fecha' }] },
  );
  assert.equal(r.estado.tareas[0].titulo, 'con fecha');
});

/* ---------------- lo borrado se queda borrado ---------------- */

t('lo que borraste en el móvil no vuelve desde el computador', () => {
  const r = fusionar(
    { tareas: [], borrados: [lapida('tareas', 'a', DESPUES)] },
    { tareas: [{ id: 'a', titulo: 'Zombi', actualizadoEn: ANTES }] },
  );
  assert.deepEqual(r.estado.tareas, []);
  assert.equal(r.cuenta.borradas, 1);
});

t('la lápida viaja: el tercer dispositivo también se entera', () => {
  const r = fusionar({ tareas: [] }, { tareas: [], borrados: [lapida('tareas', 'a', DESPUES)] });
  assert.equal(r.estado.borrados.length, 1);
  assert.equal(r.estado.borrados[0].id, 'a');
});

t('si la editaste después de borrarla, vuelve a propósito', () => {
  const r = fusionar(
    { tareas: [], borrados: [lapida('tareas', 'a', ANTES)] },
    { tareas: [{ id: 'a', titulo: 'Restaurada', actualizadoEn: DESPUES }] },
  );
  assert.equal(r.estado.tareas.length, 1);
  assert.equal(r.estado.tareas[0].titulo, 'Restaurada');
});

t('de dos lápidas del mismo id se guarda la más reciente', () => {
  const mapa = lapidas(
    { borrados: [lapida('tareas', 'a', ANTES)] },
    { borrados: [lapida('tareas', 'a', DESPUES)] },
  );
  assert.equal(mapa.get('tareas/a').en, DESPUES);
});

t('una lápida solo borra en su propia lista', () => {
  const r = fusionar(
    { notas: [], borrados: [lapida('notas', 'a', DESPUES)] },
    { notas: [], gastos: [{ id: 'a', monto: 10, actualizadoEn: ANTES }] },
  );
  assert.equal(r.estado.gastos.length, 1, 'el gasto "a" no se borra por una lápida de notas');
});

t('las lápidas muy viejas se tiran: no son noticia, son arqueología', () => {
  const viejas = [lapida('tareas', 'a', '2025-01-01T00:00:00.000Z'), lapida('tareas', 'b', HOY)];
  const quedan = purgarLapidas(viejas, 180, HOY);
  assert.deepEqual(quedan.map((x) => x.id), ['b']);
});

/* ---------------- todas las colecciones ---------------- */

t('cruzan metas, notas, gastos, personas, rutinas, viajes y fichas', () => {
  const remoto = {};
  for (const lista of ['objetivos', 'notas', 'gastos', 'personas', 'rutinas', 'viajes', 'fichas']) {
    remoto[lista] = [{ id: `${lista}-1`, creadaEn: ANTES }];
  }
  const r = fusionar({}, remoto);
  for (const lista of Object.keys(remoto)) {
    assert.equal(r.estado[lista].length, 1, `${lista} no cruzó`);
  }
});

t('ninguna lista del estado se queda fuera del plan de fusión', () => {
  // Si alguien añade una colección nueva y olvida apuntarla aquí, deja de
  // sincronizarse en silencio. Esta prueba lo convierte en un fallo ruidoso.
  const esperadas = [
    'tareas', 'filtros', 'habitos', 'planes', 'plantillas', 'reglas', 'riesgos',
    'lecturas', 'decisiones', 'informes', 'notas', 'colecciones', 'fichas',
    'objetivos', 'contadores', 'mantenimientos', 'gastos', 'personas',
    'rutinas', 'viajes', 'papelera',
  ];
  assert.deepEqual([...LISTAS_POR_ID].sort(), [...esperadas].sort());
});

t('los proyectos se unen por nombre, que es lo que los identifica', () => {
  const r = fusionar(
    { proyectos: [{ nombre: 'Circuitos', color: 'azul' }] },
    { proyectos: [{ nombre: 'Circuitos', color: 'rojo' }, { nombre: 'Tesis' }] },
  );
  assert.equal(r.estado.proyectos.length, 2);
  assert.equal(r.estado.proyectos.find((p) => p.nombre === 'Circuitos').color, 'azul');
});

t('las posiciones de la cartera se unen por ticker', () => {
  const r = fusionar(
    { inversiones: { posiciones: [{ ticker: 'AAPL', cantidad: 10, actualizadoEn: ANTES }] } },
    { inversiones: { posiciones: [{ ticker: 'AAPL', cantidad: 20, actualizadoEn: DESPUES }, { ticker: 'MSFT' }] } },
  );
  assert.equal(r.estado.inversiones.posiciones.length, 2);
  assert.equal(r.estado.inversiones.posiciones.find((p) => p.ticker === 'AAPL').cantidad, 20);
});

/* ---------------- registros que solo crecen ---------------- */

t('el historial y el tiempo medido se suman, no se pisan', () => {
  const r = fusionar(
    { historial: [{ tareaId: 't1', fecha: '2026-09-20' }] },
    { historial: [{ tareaId: 't2', fecha: '2026-09-21' }] },
  );
  assert.equal(r.estado.historial.length, 2);
  assert.equal(r.cuenta.registros, 1);
});

t('el mismo registro dos veces no se duplica', () => {
  const uno = { tareaId: 't1', fecha: '2026-09-20' };
  const r = unirRegistros([uno], [{ ...uno }]);
  assert.equal(r.lista.length, 1);
  assert.equal(r.nuevos, 0);
});

/* ---------------- lo que es de este aparato ---------------- */

t('el cronómetro del móvil no aparece corriendo en el computador', () => {
  const r = fusionar(
    { cronometro: { corriendo: false, tareaId: null }, pomodoro: { estado: null } },
    { cronometro: { corriendo: true, tareaId: 'x' }, pomodoro: { estado: 'trabajando' } },
  );
  assert.equal(r.estado.cronometro.corriendo, false);
  assert.equal(r.estado.pomodoro.estado, null);
});

/* ---------------- ajustes ---------------- */

t('de los ajustes manda el aparato que se tocó más tarde', () => {
  const r = fusionar(
    { actualizadoEn: ANTES, ajustes: { metaDiaria: 5, tema: 'dark' } },
    { actualizadoEn: DESPUES, ajustes: { metaDiaria: 8 } },
  );
  assert.equal(r.estado.ajustes.metaDiaria, 8);
  assert.equal(r.estado.ajustes.tema, 'dark', 'lo que solo existe en uno se conserva');
});

/* ---------------- no rompe lo que recibe ---------------- */

t('fusionar no modifica ninguno de los dos estados que recibe', () => {
  const local = { tareas: [{ id: 'a', actualizadoEn: ANTES }] };
  const remoto = { tareas: [{ id: 'b', actualizadoEn: ANTES }] };
  const copia = JSON.stringify([local, remoto]);
  fusionar(local, remoto);
  assert.equal(JSON.stringify([local, remoto]), copia);
});

t('fusionar dos veces da lo mismo que fusionar una', () => {
  const local = { tareas: [{ id: 'a', actualizadoEn: ANTES }], borrados: [lapida('tareas', 'z', DESPUES)] };
  const remoto = { tareas: [{ id: 'b', actualizadoEn: DESPUES }, { id: 'z', actualizadoEn: ANTES }] };
  const una = fusionar(local, remoto).estado;
  const dos = fusionar(una, remoto).estado;
  assert.deepEqual(dos.tareas, una.tareas);
});

t('un estado vacío contra otro lleno no borra nada', () => {
  const lleno = { tareas: [{ id: 'a', actualizadoEn: ANTES }], objetivos: [{ id: 'o', creadaEn: ANTES }] };
  assert.equal(fusionar({}, lleno).estado.tareas.length, 1);
  assert.equal(fusionar(lleno, {}).estado.objetivos.length, 1);
});

t('la frase dice lo que pasó, y cuando no pasó nada lo dice también', () => {
  assert.match(fusionar({}, { tareas: [{ id: 'a' }] }).frase, /1 ficha nueva/);
  assert.match(fusionar({}, {}).frase, /todo igual/);
});

t('marcaDe no confunde la fecha de vencimiento con la de edición', () => {
  assert.equal(marcaDe({ fecha: '2030-01-01', actualizadoEn: ANTES }), ANTES);
  assert.equal(marcaDe({ fecha: '2030-01-01' }), '');
});

t('unirFichas devuelve la cuenta de lo que hizo', () => {
  const r = unirFichas(
    [{ id: 'a', actualizadoEn: ANTES }],
    [{ id: 'a', actualizadoEn: DESPUES }, { id: 'b' }],
  );
  assert.equal(r.cuenta.actualizadas, 1);
  assert.equal(r.cuenta.nuevas, 1);
});

console.log(`\n${passed} pruebas de fusión entre dispositivos OK`);
