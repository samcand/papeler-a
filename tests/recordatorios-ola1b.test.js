import assert from 'node:assert/strict';
import { crearEspera, esperas, estadoEspera, resumenEsperas, tareaDePerseguir } from '../recordatorios/src/esperas.js';
import { aplicar, fuentesDe, sugerencias } from '../recordatorios/src/autocompletar.js';
import { importarMovimientosBroker, reconstruirPosiciones } from '../recordatorios/src/exportar.js';
import { clonarSemestre, tareasDeSemestre } from '../recordatorios/src/plantillas.js';
import { crearTarea } from '../recordatorios/src/modelo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-21';

/* ---------------- dependencias externas ---------------- */

t('una espera sabe cuánto lleva y si se pasó de plazo', () => {
  const e = crearEspera({ quien: 'la revista', desde: '2026-06-01', dias: 90 });
  assert.equal(e.limite, '2026-08-30');
  const s = estadoEspera(e, HOY);
  assert.equal(s.esperando, 112);
  assert.equal(s.vencida, true);
  assert.equal(s.margen, -22);

  const dentro = estadoEspera(crearEspera({ quien: 'Ana', desde: HOY, dias: 7 }), HOY);
  assert.equal(dentro.vencida, false);
  assert.equal(dentro.margen, 7);
});

t('las esperas salen ordenadas por urgencia y se resumen', () => {
  const tareas = [
    crearTarea({ titulo: 'Manuscrito en revisión', espera: crearEspera({ quien: 'IEEE TIE', desde: '2026-05-01', dias: 90 }) }),
    crearTarea({ titulo: 'Borrador de tesis', espera: crearEspera({ quien: 'Ana', desde: '2026-09-18', dias: 7 }) }),
    crearTarea({ titulo: 'Transferencia', espera: crearEspera({ quien: 'el banco', desde: '2026-09-10', dias: 5 }) }),
    crearTarea({ titulo: 'Normal', fecha: HOY }),
    crearTarea({ titulo: 'Ya hecha', completada: true, espera: crearEspera({ quien: 'nadie', desde: '2026-01-01' }) }),
  ];
  const lista = esperas(tareas, HOY);
  assert.deepEqual(lista.map((e) => e.quien), ['IEEE TIE', 'el banco', 'Ana']);

  const r = resumenEsperas(tareas, HOY);
  assert.equal(r.total, 3);
  assert.equal(r.vencidas, 2);
  assert.match(r.frase, /2 de 3 esperas están fuera de plazo/);
  assert.equal(r.personas[0].n, 1);
});

t('perseguir es la única parte que depende de ti', () => {
  const tarea = crearTarea({ titulo: 'Manuscrito', modulo: 'investigacion', proyecto: 'Artículos',
    espera: crearEspera({ quien: 'IEEE TIE', desde: '2026-05-01', dias: 90 }) });
  const seguimiento = tareaDePerseguir(tarea, HOY);
  assert.equal(seguimiento.titulo, 'Perseguir a IEEE TIE: Manuscrito');
  assert.equal(seguimiento.prioridad, 1);        // está vencida
  assert.equal(seguimiento.fecha, HOY);
  assert.match(seguimiento.notas, /143 días/);
  assert.equal(seguimiento.proyecto, 'Artículos');
});

/* ---------------- autocompletar ---------------- */

const FUENTES = { proyectos: ['Cartera', 'Circuitos I', 'Artículos'], etiquetas: ['espera', 'mercado', 'examen'] };

t('sugiere proyectos al escribir # y etiquetas al escribir @', () => {
  const s = sugerencias('Revisar tesis #car', 18, FUENTES);
  assert.equal(s.simbolo, '#');
  assert.equal(s.prefijo, 'car');
  assert.deepEqual(s.opciones, ['Cartera']);
  assert.equal(s.nuevo, false);

  const e = sugerencias('Llamar @esp', 11, FUENTES);
  assert.deepEqual(e.opciones, ['espera']);
  assert.equal(sugerencias('Sin nada que sugerir', 20, FUENTES), null);
});

t('ignora acentos y mayúsculas, y avisa de lo que no existe', () => {
  assert.deepEqual(sugerencias('x #ARTIC', 8, FUENTES).opciones, ['Artículos']);
  assert.deepEqual(sugerencias('x #articul', 10, FUENTES).opciones, ['Artículos']);
  const nuevo = sugerencias('x #Ministerio', 13, FUENTES);
  assert.deepEqual(nuevo.opciones, []);
  assert.equal(nuevo.nuevo, true);
  // el símbolo solo ofrece todo
  assert.equal(sugerencias('x #', 3, FUENTES).opciones.length, 3);
});

t('aplicar la sugerencia deja el texto y el cursor donde toca', () => {
  const texto = 'Revisar tesis #car mañana';
  const s = sugerencias(texto, 18, FUENTES);
  const r = aplicar(texto, s, 'Cartera');
  assert.equal(r.texto, 'Revisar tesis #Cartera mañana');   // sin espacio duplicado
  assert.equal(r.cursor, 23);                               // justo detrás del espacio
  // un nombre con espacios va entre comillas para que el parser lo respete
  const s2 = sugerencias('x #circ', 7, FUENTES);
  assert.equal(aplicar('x #circ', s2, 'Circuitos I').texto, 'x #"Circuitos I" ');
});

t('las fuentes salen del estado actual', () => {
  const f = fuentesDe({
    proyectos: [{ nombre: 'Cartera' }, { nombre: 'Personal' }],
    tareas: [crearTarea({ etiquetas: ['mercado', 'espera'] }), crearTarea({ etiquetas: ['espera'] })],
  });
  assert.deepEqual(f.proyectos, ['Cartera', 'Personal']);
  assert.deepEqual(f.etiquetas, ['espera', 'mercado']);
});

/* ---------------- importar del bróker ---------------- */

t('lee el CSV del bróker con nombres de columna distintos', () => {
  const csv = [
    'Fecha,Operacion,Simbolo,Titulos,Precio,Comision',
    '15/01/2026,Compra,nvda,40,118.40,1.5',
    '2026-03-02,COMPRA,NVDA,10,150,1.5',
    '10/05/2026,Venta,NVDA,20,176.20,1.5',
    '01/06/2026,Buy,KO,60,58.20,1',
    '05/06/2026,Compra,,10,10,0',
  ].join('\n');
  const { movimientos, avisos } = importarMovimientosBroker(csv);
  assert.equal(movimientos.length, 4);           // la fila sin ticker se ignora
  assert.equal(movimientos[0].fecha, '2026-01-15');
  assert.equal(movimientos[0].ticker, 'NVDA');
  assert.equal(movimientos[0].tipo, 'compra');
  assert.equal(movimientos[0].precio, 118.4);
  assert.equal(movimientos[2].tipo, 'venta');
  assert.deepEqual(avisos, []);
});

t('entiende los dos formatos de número y la cantidad negativa como venta', () => {
  const csv = 'date,symbol,quantity,price\n2026-02-02,AAPL,"1.234","1.234,56"\n2026-03-03,AAPL,-234,"1,300.00"';
  const { movimientos } = importarMovimientosBroker(csv);
  assert.equal(movimientos[0].cantidad, 1234);
  assert.equal(movimientos[0].precio, 1234.56);
  assert.equal(movimientos[1].tipo, 'venta');    // sin columna de tipo, el signo manda
  assert.equal(movimientos[1].precio, 1300);

  // los decimales de verdad no se pierden por parecer millares
  const cripto = importarMovimientosBroker('date,symbol,quantity,price\n2026-02-02,BTC,0.005,"0.001"');
  assert.equal(cripto.movimientos[0].cantidad, 0.005);
  assert.equal(cripto.movimientos[0].precio, 0.001);
});

t('reconstruye la cartera emparejando por FIFO', () => {
  const { movimientos } = importarMovimientosBroker([
    'Fecha,Operacion,Simbolo,Titulos,Precio,Comision',
    '15/01/2026,Compra,NVDA,40,100,0',
    '02/03/2026,Compra,NVDA,10,150,0',
    '10/05/2026,Venta,NVDA,20,176,0',
    '01/06/2026,Compra,KO,60,58,0',
  ].join('\n'));
  const r = reconstruirPosiciones(movimientos);

  const nvda = r.posiciones.find((p) => p.ticker === 'NVDA');
  assert.equal(nvda.cantidad, 30);               // 50 compradas - 20 vendidas
  assert.equal(nvda.entrada, 116.6667);          // 20×100 + 10×150 entre 30
  assert.equal(r.posiciones.find((p) => p.ticker === 'KO').cantidad, 60);

  assert.equal(r.operaciones.length, 1);
  assert.equal(r.operaciones[0].entrada, 100);   // FIFO: salen las primeras compradas
  assert.equal(r.operaciones[0].salida, 176);
  assert.equal(r.operaciones[0].cantidad, 20);
  assert.equal(r.operaciones[0].fechaEntrada, '2026-01-15');
  assert.deepEqual(r.avisos, []);
});

t('avisa si vendes algo que no aparece comprado', () => {
  const { movimientos } = importarMovimientosBroker('Fecha,Operacion,Simbolo,Titulos,Precio\n01/02/2026,Venta,MSFT,10,300');
  const r = reconstruirPosiciones(movimientos);
  assert.equal(r.posiciones.length, 0);
  assert.match(r.avisos[0], /MSFT: se venden 10 títulos que no aparecen comprados/);
});

/* ---------------- clonar semestre ---------------- */

t('clonar un semestre corre las fechas en semanas enteras', () => {
  const semestre = {
    nombre: '2026-2', inicio: '2026-08-10', fin: '2026-12-05',
    cursos: [{
      codigo: 'IE-201', nombre: 'Circuitos I', horario: [{ dia: 'martes', inicio: '07:00' }],
      evaluaciones: [{ nombre: 'Primer parcial', fecha: '2026-10-06', peso: 30 }],
      entregaNotas: '2026-12-10',
    }],
  };
  const nuevo = clonarSemestre(semestre, { nombre: '2027-1', inicio: '2027-01-18' });
  assert.equal(nuevo.nombre, '2027-1');
  assert.equal(nuevo.semanasDesplazadas, 23);
  assert.equal(nuevo.inicio, '2027-01-18');
  assert.equal(nuevo.fin, '2027-05-15');

  // el parcial era martes y sigue siendo martes
  const parcial = nuevo.cursos[0].evaluaciones[0].fecha;
  assert.equal(parcial, '2027-03-16');
  assert.equal(new Date(parcial + 'T12:00:00').getDay(), new Date('2026-10-06T12:00:00').getDay());
  assert.equal(nuevo.cursos[0].entregaNotas, '2027-05-20');
  assert.equal(nuevo.cursos[0].horario[0].dia, 'martes');

  // y el clon genera sus tareas como cualquier semestre
  assert.ok(tareasDeSemestre(nuevo).length >= 3);
  // el original no se toca
  assert.equal(semestre.cursos[0].evaluaciones[0].fecha, '2026-10-06');
});

console.log(`\n${passed} pruebas de esperas, autocompletado, bróker y semestre OK`);
