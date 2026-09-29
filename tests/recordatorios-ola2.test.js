import assert from 'node:assert/strict';
import { informeTiempo } from '../recordatorios/src/tiempo.js';
import { enSilencio } from '../recordatorios/src/notificaciones.js';
import { ESCENARIOS, informeFiscal, planDeAportes, pruebaDeEstres } from '../recordatorios/src/inversiones.js';
import { crearTarea } from '../recordatorios/src/modelo.js';
import { AL_PUBLICAR, tareasAlPublicar } from '../recordatorios/src/plantillas.js';
import { cifrar, descifrar, enlaceDeLista, esArchivoCifrado, fusionarEstados, listaDeEnlace } from '../recordatorios/src/compartir.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const ta = async (name, fn) => { await fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';

/* ---------------- informe de tiempo ---------------- */

t('el informe dice a dónde se fue el tiempo, y lo compara con lo planificado', () => {
  const tareas = [
    crearTarea({ id: 'a', titulo: 'Calificar', modulo: 'docencia', proyecto: 'Circuitos I', duracion: 120, fecha: '2026-09-21' }),
    crearTarea({ id: 'b', titulo: 'Escribir', modulo: 'investigacion', proyecto: 'Artículos', duracion: 90, fecha: '2026-09-22' }),
  ];
  const registros = [
    { tareaId: 'a', minutos: 180, fecha: '2026-09-21' },
    { tareaId: 'b', minutos: 60, fecha: '2026-09-22' },
    { tareaId: null, minutos: 30, fecha: '2026-09-22' },
    { tareaId: 'a', minutos: 90, fecha: '2026-08-01' },      // fuera del rango
  ];
  const r = informeTiempo(registros, tareas, HOY, { dias: 28 });
  assert.equal(r.total, 270);
  assert.equal(r.sesiones, 3);
  assert.equal(r.sinTarea, 30);
  assert.equal(r.porModulo[0].clave, 'docencia');
  assert.equal(r.porModulo[0].minutos, 180);
  assert.equal(r.porModulo[0].planificado, 120);
  assert.equal(r.porModulo[0].desvio, 60);                   // tardaste una hora más
  assert.equal(r.porProyecto[0].clave, 'Circuitos I');
  assert.ok(r.porSemana.length >= 1);
});

/* ---------------- franjas de silencio ---------------- */

t('la franja de silencio cruza la medianoche sin despeinarse', () => {
  const ajustes = { silencio: { activo: true, desde: '22:00', hasta: '07:00' } };
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 23, 30)), true);
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 3, 0)), true);
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 10, 0)), false);
  assert.equal(enSilencio(ajustes, new Date(2026, 8, 23, 21, 59)), false);
  assert.equal(enSilencio({ silencio: { activo: false, desde: '22:00', hasta: '07:00' } }, new Date(2026, 8, 23, 23, 30)), false);
  assert.equal(enSilencio({}, new Date(2026, 8, 23, 3, 0)), false);
});

t('se puede silenciar un día entero', () => {
  const domingo = { silencio: { activo: true, desde: '22:00', hasta: '07:00', dias: [0] } };
  assert.equal(enSilencio(domingo, new Date(2026, 8, 20, 11, 0)), true);    // domingo
  assert.equal(enSilencio(domingo, new Date(2026, 8, 21, 11, 0)), false);   // lunes
});

/* ---------------- fiscalidad ---------------- */

t('el informe fiscal separa ganancias, pérdidas y comisiones del año', () => {
  const operaciones = [
    { ticker: 'AMD', cantidad: 50, entrada: 142, salida: 168, fechaEntrada: '2026-03-02', fechaSalida: '2026-05-14', comisiones: 3 },
    { ticker: 'PYPL', cantidad: 80, entrada: 71, salida: 66, fechaEntrada: '2026-04-10', fechaSalida: '2026-04-28', comisiones: 2 },
    { ticker: 'KO', cantidad: 10, entrada: 50, salida: 60, fechaEntrada: '2025-01-10', fechaSalida: '2025-06-10' },  // otro año
    { ticker: 'NVDA', cantidad: 10, entrada: 100, stop: 90 },                                                        // abierta
  ];
  const r = informeFiscal(operaciones, 2026);
  assert.equal(r.operaciones.length, 2);
  assert.equal(r.ganancias, 1297);          // 50 × 26 − 3
  assert.equal(r.perdidas, -402);           // −80 × 5 − 2
  assert.equal(r.neto, 895);
  assert.equal(r.comisiones, 5);
  assert.equal(r.porTicker[0].ticker, 'AMD');
  assert.equal(informeFiscal(operaciones, 2025).operaciones.length, 1);
});

t('avisa de la recompra poco después de vender en pérdidas', () => {
  const operaciones = [
    { ticker: 'PYPL', cantidad: 80, entrada: 71, salida: 66, fechaEntrada: '2026-04-10', fechaSalida: '2026-04-28' },
    { ticker: 'PYPL', cantidad: 80, entrada: 64, fechaEntrada: '2026-05-10' },
  ];
  const r = informeFiscal(operaciones, 2026);
  assert.equal(r.avisos.length, 1);
  assert.match(r.avisos[0], /recomprada el 2026-05-10 \(12 días después\)/);
  assert.match(r.avisos[0], /regla de recompra de tu país/);
});

/* ---------------- estrés ---------------- */

const CARTERA = [
  { ticker: 'NVDA', cantidad: 40, entrada: 118, precio: 176, stop: 150, sector: 'Tecnología' },
  { ticker: 'KO', cantidad: 60, entrada: 58, precio: 62, sector: 'Consumo' },
  { ticker: 'ASML', cantidad: 8, entrada: 720, precio: 690, stop: 640, sector: 'Tecnología' },
];

t('una caída del 20 % dice qué stops saltarían', () => {
  const r = pruebaDeEstres(CARTERA, 20, { efectivo: 1000 });
  assert.equal(r.caidaPct, 20);
  assert.ok(r.perdida < 0);
  assert.equal(r.perdidaPct < 0, true);
  // NVDA cae a 140,8 (stop 150) y ASML a 552 (stop 640): saltan los dos
  assert.deepEqual(r.stopsQueSaltan.map((f) => f.ticker).sort(), ['ASML', 'NVDA']);
  assert.match(r.frase, /Saltarían 2 stops/);
  assert.equal(r.filas[0].perdida <= r.filas[1].perdida, true);
});

t('sin stops, la app lo llama por su nombre', () => {
  const r = pruebaDeEstres([{ ticker: 'KO', cantidad: 60, entrada: 58, precio: 62, sector: 'Consumo' }], 20);
  assert.equal(r.stopsQueSaltan.length, 0);
  assert.match(r.frase, /no es aguantar, es no haber decidido/);
});

t('un estallido sectorial solo golpea a su sector', () => {
  const r = pruebaDeEstres(CARTERA, 50, { sector: 'Tecnología' });
  const ko = r.filas.find((f) => f.ticker === 'KO');
  assert.equal(ko.perdida, 0);
  assert.equal(r.filas.find((f) => f.ticker === 'NVDA').precioDespues, 88);
  assert.equal(ESCENARIOS.find((e) => e.soloSector).caida, 50);
});

/* ---------------- plan de aportes ---------------- */

t('el plan de aportes dice si vas al día y a qué ritmo hace falta ir', () => {
  const plan = {
    objetivoAnual: 12000,
    aportes: [
      { fecha: '2026-01-15', importe: 1000 }, { fecha: '2026-02-15', importe: 1000 },
      { fecha: '2026-03-15', importe: 1000 }, { fecha: '2025-12-15', importe: 5000 },
    ],
  };
  const r = planDeAportes(plan, HOY);
  assert.equal(r.anio, 2026);
  assert.equal(r.aportado, 3000);              // el de 2025 no cuenta
  assert.equal(r.falta, 9000);
  assert.equal(r.pct, 25);
  assert.ok(r.deberiaLlevar > 8000 && r.deberiaLlevar < 9000);   // a finales de septiembre
  assert.equal(r.alDia, false);
  assert.equal(r.mesesRestantes, 4);
  assert.equal(r.ritmoNecesario, 2250);
  assert.match(r.frase, /por detrás del ritmo/);
});

t('sin objetivo no se inventa un seguimiento', () => {
  const r = planDeAportes({}, HOY);
  assert.equal(r.objetivo, 0);
  assert.match(r.frase, /Pon un objetivo anual/);
});

/* ---------------- publicar un artículo ---------------- */

t('publicar genera las tareas que siempre se olvidan', () => {
  const tareas = tareasAlPublicar({ titulo: 'Modelo térmico', revista: 'IEEE TIE' }, HOY);
  assert.equal(tareas.length, AL_PUBLICAR.length);
  assert.match(tareas[0].titulo, /Añadir el artículo al CV: Modelo térmico/);
  assert.equal(tareas[0].fecha, '2026-09-26');
  assert.ok(tareas.every((t) => t.modulo === 'investigacion'));
  assert.match(tareas[0].notas, /IEEE TIE/);
});

/* ---------------- fusionar copias ---------------- */

t('fusionar dos copias: gana la versión más reciente y no se pierde nada', () => {
  const local = {
    tareas: [
      crearTarea({ id: '1', titulo: 'Igual en las dos', actualizadoEn: '2026-09-20T10:00:00.000Z' }),
      crearTarea({ id: '2', titulo: 'Vieja aquí', actualizadoEn: '2026-09-18T10:00:00.000Z' }),
      crearTarea({ id: '3', titulo: 'Solo en el portátil', actualizadoEn: '2026-09-21T10:00:00.000Z' }),
    ],
    proyectos: [{ nombre: 'Cartera' }],
    historial: [{ fecha: '2026-09-20', modulo: 'docencia' }],
    tiempo: [{ tipo: 'pomodoro', minutos: 25, fecha: '2026-09-20' }],
    planes: [], plantillas: [],
  };
  const remoto = {
    tareas: [
      crearTarea({ id: '1', titulo: 'Igual en las dos', actualizadoEn: '2026-09-20T10:00:00.000Z' }),
      crearTarea({ id: '2', titulo: 'Nueva versión del móvil', actualizadoEn: '2026-09-22T10:00:00.000Z' }),
      crearTarea({ id: '4', titulo: 'Solo en el móvil', actualizadoEn: '2026-09-22T11:00:00.000Z' }),
    ],
    proyectos: [{ nombre: 'Cartera' }, { nombre: 'Personal' }],
    historial: [{ fecha: '2026-09-20', modulo: 'docencia' }, { fecha: '2026-09-21', modulo: 'personal' }],
    tiempo: [{ tipo: 'pomodoro', minutos: 25, fecha: '2026-09-20' }],
    planes: [], plantillas: [],
  };

  const { estado, resumen, frase } = fusionarEstados(local, remoto);
  assert.equal(estado.tareas.length, 4);
  assert.equal(estado.tareas.find((t) => t.id === '2').titulo, 'Nueva versión del móvil');
  assert.ok(estado.tareas.some((t) => t.id === '3'), 'no se pierde lo que solo estaba aquí');
  assert.ok(estado.tareas.some((t) => t.id === '4'), 'entra lo que solo estaba allí');
  assert.equal(resumen.añadidas, 1);
  assert.equal(resumen.actualizadas, 1);
  assert.equal(resumen.iguales, 1);
  assert.equal(estado.proyectos.length, 2);
  assert.equal(estado.historial.length, 2);
  assert.equal(estado.tiempo.length, 1);          // el registro repetido no se duplica
  assert.match(frase, /1 tareas nuevas/);
});

/* ---------------- compartir y cifrar ---------------- */

await ta('la lista viaja dentro del enlace y vuelve entera', async () => {
  const tareas = [
    crearTarea({ titulo: 'Elegir repertorio', fecha: '2026-09-21', duracion: 45, prioridad: 2, etiquetas: ['equipo'] }),
    crearTarea({ titulo: 'Ensayo', fecha: '2026-09-25', hora: '19:00' }),
  ];
  const enlace = await enlaceDeLista(tareas, { nombre: 'Domingo 27', base: 'https://ejemplo/app/' });
  assert.match(enlace, /#\/importar-lista\?d=/);
  assert.ok(enlace.length < 600, 'el enlace tiene que caber en un chat');

  const datos = enlace.split('d=')[1];
  const leido = await listaDeEnlace(datos);
  assert.equal(leido.nombre, 'Domingo 27');
  assert.equal(leido.tareas.length, 2);
  assert.equal(leido.tareas[0].titulo, 'Elegir repertorio');
  assert.equal(leido.tareas[1].hora, '19:00');
  assert.equal(await listaDeEnlace('basura-no-valida'), null);
  assert.equal(await listaDeEnlace(''), null);
});

await ta('el respaldo cifrado solo se abre con su contraseña', async () => {
  const original = JSON.stringify({ tareas: [{ titulo: 'Privado' }], inversiones: { efectivo: 4200 } });
  const sobre = await cifrar(original, 'una contraseña larga');
  assert.equal(esArchivoCifrado(sobre), true);
  assert.ok(!sobre.includes('Privado'), 'el contenido no puede verse en claro');
  assert.ok(!sobre.includes('4200'));

  assert.equal(await descifrar(sobre, 'una contraseña larga'), original);
  await assert.rejects(() => descifrar(sobre, 'otra cosa'), /contraseña no es correcta/);
  await assert.rejects(() => descifrar('{}', 'x'), /no es una copia cifrada/);
  await assert.rejects(() => descifrar('no es json', 'x'), /no tiene el formato/);
  await assert.rejects(() => cifrar('algo', ''), /Hace falta una contraseña/);

  // dos cifrados del mismo texto no se parecen: sal e IV distintos cada vez
  assert.notEqual(await cifrar(original, 'clave'), await cifrar(original, 'clave'));
});

console.log(`\n${passed} pruebas de informe de tiempo, silencio, fiscalidad, estrés y aportes OK`);
