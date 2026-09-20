import assert from 'node:assert/strict';
import { TIPOS, VISTAS, buscarTodo } from '../recordatorios/src/buscador.js';
import { crearTarea } from '../recordatorios/src/modelo.js';
import { notaNueva } from '../recordatorios/src/notas.js';
import { PLANTILLAS_COLECCION, desdePlantilla, fichaNueva } from '../recordatorios/src/colecciones.js';
import { personaNueva } from '../recordatorios/src/personas.js';
import { objetivoNuevo } from '../recordatorios/src/objetivos.js';
import { gastoNuevo } from '../recordatorios/src/gastos.js';
import { viajeNuevo } from '../recordatorios/src/viajes.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';

const CARRO = desdePlantilla(PLANTILLAS_COLECCION.find((p) => p.id === 'vehiculo'));

const ESTADO = {
  tareas: [
    crearTarea({ id: 't1', titulo: 'Revisar la tesis de NVDA', proyecto: 'Cartera', fecha: '2026-09-24' }),
    crearTarea({ id: 't2', titulo: 'Llamar al seguro del carro', notas: 'Antes de que venza' }),
    crearTarea({ id: 't3', titulo: 'Tesis vieja ya cerrada', completada: true }),
  ],
  proyectos: [{ id: 'p1', nombre: 'Cartera', modulo: 'inversiones' }],
  notas: [
    notaNueva({ id: 'n1', titulo: 'Tesis de NVDA', texto: 'Márgenes y competencia', etiquetas: ['inversiones'] }),
    notaNueva({ id: 'n2', tipo: 'diario', fecha: '2026-09-22', titulo: '2026-09-22', texto: 'Día de mercado raro' }),
  ],
  colecciones: [CARRO],
  fichas: [fichaNueva(CARRO, { nombre: 'Mazda 3', placa: 'ABC123', seguro: '2026-10-05' })],
  personas: [personaNueva({ id: 'per1', nombre: 'Ana Ruiz', relacion: 'hermana', regalos: [{ id: 'g', que: 'Libro de cocina' }] })],
  objetivos: [
    objetivoNuevo({ id: 'o1', que: 'Leer 24 libros', meta: 24, actual: 6 }),
    objetivoNuevo({ id: 'o2', que: 'Leer a Tolstói', meta: 1, logradoEn: '2026-05-01' }),
  ],
  gastos: [gastoNuevo({ id: 'g1', que: 'Seguro del carro', importe: 320, categoria: 'transporte', fecha: '2026-09-02' })],
  viajes: [viajeNuevo({ id: 'v1', nombre: 'Madrid', destino: 'Madrid', desde: '2026-10-10', hasta: '2026-10-14' })],
  lecturas: [{ id: 'l1', titulo: 'Paper sobre latencia', autor: 'Kim', añadidoEn: '2026-09-01' }],
  planes: [{ id: 'pl1', nombre: 'Paper de redes', tareas: [{ nombre: 'Campo' }] }],
};

t('busca en todos los tipos de cosas, no solo en tareas', () => {
  const tipos = (q) => new Set(buscarTodo(ESTADO, q, { hoy: HOY }).resultados.map((r) => r.tipo));
  assert.ok(tipos('tesis').has('tarea'));
  assert.ok(tipos('tesis').has('nota'));
  assert.ok(tipos('mazda').has('ficha'));
  assert.ok(tipos('ana').has('persona'));
  assert.ok(tipos('libros').has('objetivo'));
  assert.ok(tipos('seguro').has('gasto'));
  assert.ok(tipos('madrid').has('viaje'));
  assert.ok(tipos('latencia').has('lectura'));
  assert.ok(tipos('paper de redes').has('plan'));
  assert.ok(tipos('cartera').has('proyecto'));
});

t('las pantallas se abren escribiendo su nombre o algo parecido', () => {
  const r = buscarTodo(ESTADO, 'pomodoro', { hoy: HOY });
  assert.equal(r.resultados[0].tipo, 'vista');
  assert.equal(r.resultados[0].ruta, '/enfoque');
  assert.equal(buscarTodo(ESTADO, 'kanban', { hoy: HOY }).resultados[0].ruta, '/tablero');
  assert.equal(buscarTodo(ESTADO, 'cumpleaños', { hoy: HOY }).resultados[0].ruta, '/personas');
  // Todas las rutas del catálogo son únicas y empiezan por barra.
  assert.equal(new Set(VISTAS.map((v) => v.ruta)).size, VISTAS.length);
  assert.ok(VISTAS.every((v) => v.ruta.startsWith('/')));
});

t('lo que empieza por lo escrito va antes que lo que solo lo contiene', () => {
  const r = buscarTodo(ESTADO, 'tesis', { hoy: HOY });
  assert.equal(r.resultados[0].titulo, 'Tesis de NVDA');      // empieza por "tesis"
  const titulos = r.resultados.map((x) => x.titulo);
  assert.ok(titulos.indexOf('Tesis de NVDA') < titulos.indexOf('Revisar la tesis de NVDA'));
});

t('lo cerrado pesa menos que lo que sigue vivo', () => {
  const r = buscarTodo(ESTADO, 'leer', { hoy: HOY });
  const vivos = r.resultados.findIndex((x) => x.titulo === 'Leer 24 libros');
  const logrado = r.resultados.findIndex((x) => x.titulo === 'Leer a Tolstói');
  assert.ok(vivos < logrado, 'el objetivo logrado debería ir después');
});

t('todas las palabras tienen que aparecer: no basta con una', () => {
  assert.equal(buscarTodo(ESTADO, 'ana regalo', { hoy: HOY }).resultados.some((r) => r.tipo === 'persona'), false);
  assert.equal(buscarTodo(ESTADO, 'ana cocina', { hoy: HOY }).resultados[0].titulo, 'Ana Ruiz');
  assert.equal(buscarTodo(ESTADO, 'tesis madrid', { hoy: HOY }).resultados.length, 0);
});

t('no distingue acentos ni mayúsculas', () => {
  assert.ok(buscarTodo(ESTADO, 'MARGENES', { hoy: HOY }).resultados.some((r) => r.titulo === 'Tesis de NVDA'));
  assert.ok(buscarTodo(ESTADO, 'tolstoi', { hoy: HOY }).resultados.length);
});

t('los resultados vienen agrupados por tipo y con su detalle', () => {
  const r = buscarTodo(ESTADO, 'seguro', { hoy: HOY });
  assert.ok(r.grupos.length >= 2);
  assert.ok(r.grupos.every((g) => TIPOS.some((t2) => t2.id === g.id)));
  const gasto = r.resultados.find((x) => x.tipo === 'gasto');
  assert.match(gasto.detalle, /2026-09-02/);
  const ficha = buscarTodo(ESTADO, 'ABC123', { hoy: HOY }).resultados.find((x) => x.tipo === 'ficha');
  assert.equal(ficha.titulo, 'Mazda 3');
  assert.match(ficha.detalle, /Vehículos/);
});

t('sin consulta no inventa resultados, y sin coincidencias lo dice', () => {
  const vacia = buscarTodo(ESTADO, '', { hoy: HOY });
  assert.equal(vacia.resultados.length, 0);
  assert.match(vacia.frase, /Escribe para buscar/);
  const nada = buscarTodo(ESTADO, 'xilófono', { hoy: HOY });
  assert.equal(nada.vacio, true);
  assert.match(nada.frase, /Nada que se parezca/);
});

t('el límite recorta pero el total sigue siendo el de verdad', () => {
  const r = buscarTodo(ESTADO, 'a', { hoy: HOY, limite: 3 });
  assert.equal(r.resultados.length, 3);
  assert.ok(r.total > 3);
  assert.match(r.frase, /se enseñan 3/);
});

console.log(`\n${passed} pruebas del buscador universal OK`);
