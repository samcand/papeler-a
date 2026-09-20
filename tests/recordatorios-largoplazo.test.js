import assert from 'node:assert/strict';
import {
  HORIZONTES, aplanar, arbol, haríaCiclo, hijosDe, objetivoNuevo, parseMeta,
  porHorizonte, progreso, progresoConHijos, sumarAvance,
} from '../recordatorios/src/objetivos.js';
import { aniosConDatos, resumenDelAnio, textoDelAnio } from '../recordatorios/src/anio.js';
import { crearTarea } from '../recordatorios/src/modelo.js';
import { notaNueva } from '../recordatorios/src/notas.js';
import { viajeNuevo } from '../recordatorios/src/viajes.js';
import { gastoNuevo } from '../recordatorios/src/gastos.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';

/* ---------------- metas que contienen metas ---------------- */

function metas() {
  return [
    objetivoNuevo({ id: 'vida', que: 'Publicar un libro', horizonte: 'vida', hasta: null, tipo: 'siNo' }),
    objetivoNuevo({ id: 'a26', que: 'Terminar el borrador', horizonte: 'anio', padre: 'vida', tipo: 'numero', meta: 10, actual: 10, desde: '2026-01-01', hasta: '2026-12-31' }),
    objetivoNuevo({ id: 'a27', que: 'Buscar editorial', horizonte: 'anio', padre: 'vida', tipo: 'siNo', desde: '2027-01-01', hasta: '2027-12-31' }),
    objetivoNuevo({ id: 'suelta', que: 'Correr 500 km', horizonte: 'anio', meta: 500, actual: 250, desde: '2026-01-01', hasta: '2026-12-31' }),
  ];
}

t('una meta de vida contiene las de cada año', () => {
  const lista = metas();
  assert.deepEqual(hijosDe(lista[0], lista).map((o) => o.id), ['a26', 'a27']);
  assert.equal(hijosDe(lista[3], lista).length, 0);
  assert.equal(HORIZONTES.length, 3);
});

t('el avance del padre sale de sus hijas, no de un número a mano', () => {
  const lista = metas();
  const p = progresoConHijos(lista[0], lista, {}, HOY);
  assert.equal(p.desdeHijas, true);
  assert.equal(p.hijas, 2);
  assert.equal(p.logradas, 1);          // el borrador está al 100 %
  assert.equal(p.pct, 50);              // (100 + 0) / 2
  assert.match(p.frase, /1 de 2 metas de dentro/);
  // Y en singular: "1 va tarde", no "1 van tarde".
  const conUnaTarde = progresoConHijos(lista[0], [
    lista[0],
    { ...lista[1], actual: 1 },
    { ...lista[2], desde: '2026-01-01', hasta: '2026-12-31' },
  ], {}, HOY);
  assert.match(conUnaTarde.frase, /2 van tarde|1 va tarde/);
});

t('una hija abandonada deja de arrastrar al padre', () => {
  const lista = metas();
  lista[2].abandonadoEn = '2026-06-01';
  const p = progresoConHijos(lista[0], lista, {}, HOY);
  assert.equal(p.hijas, 1);
  assert.equal(p.pct, 100);
});

t('una meta que todavía no empieza no "va al día": no ha empezado', () => {
  const futura = objetivoNuevo({ que: 'Buscar editorial', desde: '2027-01-01', hasta: '2027-12-31', tipo: 'siNo' });
  const p = progreso(futura, {}, HOY);
  assert.equal(p.alDia, null);
  assert.equal(p.pctTiempo, 0);
  assert.match(p.frase, /Todavía no empieza/);
});

t('una meta de vida sin fecha no "va tarde": va', () => {
  const deVida = objetivoNuevo({ que: 'Aprender a navegar', horizonte: 'vida', hasta: null, meta: 5, actual: 1 });
  const p = progreso(deVida, {}, HOY);
  assert.equal(p.conFecha, false);
  assert.equal(p.alDia, null);
  assert.match(p.frase, /De vida: no va tarde, va/);
  // Una de año sin fecha sigue diciendo lo de siempre.
  assert.match(progreso(objetivoNuevo({ horizonte: 'anio', meta: 5, actual: 1 }), {}, HOY).frase, /avanza cuando avance/);
});

t('el árbol pone las de vida arriba y se aplana con su nivel', () => {
  const lista = metas();
  const ramas = arbol(lista, {}, HOY);
  assert.equal(ramas[0].objetivo.id, 'vida');
  assert.deepEqual(ramas[0].hijas.map((h) => h.objetivo.id), ['a26', 'a27']);
  const plano = aplanar(ramas);
  assert.deepEqual(plano.map((x) => x.objetivo.id), ['vida', 'a26', 'a27', 'suelta']);
  assert.deepEqual(plano.map((x) => x.nivel), [0, 1, 1, 0]);
});

t('una meta no puede colgar de su propia hija', () => {
  const lista = metas();
  assert.equal(haríaCiclo('vida', 'a26', lista), true);
  assert.equal(haríaCiclo('vida', 'vida', lista), true);
  assert.equal(haríaCiclo('suelta', 'vida', lista), false);
  assert.equal(haríaCiclo('suelta', null, lista), false);
});

t('una meta huérfana no desaparece del árbol', () => {
  const lista = [objetivoNuevo({ id: 'x', que: 'Con padre borrado', padre: 'ya-no-existe' })];
  assert.equal(arbol(lista, {}, HOY).length, 1);
});

/* ---------------- escribir una meta en una línea ---------------- */

t('"Leer 24 libros este año" ya lo dice todo', () => {
  const r = parseMeta('Leer 24 libros este año', HOY);
  assert.equal(r.que, 'Leer 24 libros');
  assert.equal(r.tipo, 'numero');
  assert.equal(r.meta, 24);
  assert.equal(r.unidad, 'libros');
  assert.equal(r.horizonte, 'anio');
  assert.equal(r.desde, '2026-01-01');
  assert.equal(r.hasta, '2026-12-31');
});

t('sin número es de sí o no, que también es una meta honesta', () => {
  const r = parseMeta('Sacar el pasaporte', HOY);
  assert.equal(r.tipo, 'siNo');
  assert.equal(r.que, 'Sacar el pasaporte');
  assert.equal(r.hasta, null);
});

t('el plazo se entiende de varias formas y "algún día" no pone fecha', () => {
  assert.equal(parseMeta('Escribir 3 artículos este trimestre', HOY).horizonte, 'trimestre');
  assert.equal(parseMeta('Escribir 3 artículos este trimestre', HOY).hasta, '2026-09-30');
  assert.equal(parseMeta('Aprender a navegar algún día', HOY).horizonte, 'vida');
  assert.equal(parseMeta('Aprender a navegar algún día', HOY).hasta, null);
  assert.equal(parseMeta('Aprender a navegar algún día', HOY).que, 'Aprender a navegar');
  const futuro = parseMeta('Ahorrar 3000 en 2028', HOY);
  assert.equal(futuro.hasta, '2028-12-31');
});

t('sumar y quitar avance es la acción de todos los días', () => {
  const o = objetivoNuevo({ tipo: 'numero', meta: 10, actual: 3 });
  assert.equal(sumarAvance(o, 1).actual, 4);
  assert.equal(sumarAvance(o, -1).actual, 2);
  assert.equal(sumarAvance({ ...o, actual: 0 }, -1).actual, 0);   // no baja de cero
  assert.equal(sumarAvance(objetivoNuevo({ tipo: 'siNo' }), 1).hecho, true);
});

t('las metas se agrupan por horizonte, y un grupo vacío se queda vacío', () => {
  const lista = [
    objetivoNuevo({ id: 'a', que: 'De vida', horizonte: 'vida' }),
    objetivoNuevo({ id: 'b', que: 'De este año', horizonte: 'anio' }),
    objetivoNuevo({ id: 'c', que: 'Cerrada', horizonte: 'anio', logradoEn: '2026-01-01' }),
  ];
  const grupos = porHorizonte(lista, {}, HOY);
  assert.deepEqual(grupos.map((g) => g.id), ['vida', 'anio', 'trimestre']);
  assert.equal(grupos[0].metas.length, 1);
  assert.equal(grupos[1].metas.length, 1);      // la lograda no cuenta como en curso
  assert.equal(grupos[2].metas.length, 0);
});

/* ---------------- el año en una página ---------------- */

const ESTADO_ANIO = {
  tareas: [
    crearTarea({ id: 't1', titulo: 'Clase', modulo: 'docencia', proyecto: 'Circuitos' }),
    crearTarea({ id: 't2', titulo: 'Paper', modulo: 'investigacion', proyecto: 'Paper' }),
    crearTarea({ id: 't3', titulo: 'Entrega', limite: '2026-03-10', completada: true, completadaEn: '2026-03-09T10:00:00Z' }),
    crearTarea({ id: 't4', titulo: 'Entrega tarde', limite: '2026-04-10', completada: true, completadaEn: '2026-04-15T10:00:00Z' }),
  ],
  historial: [
    { tareaId: 't1', fecha: '2026-01-05' }, { tareaId: 't1', fecha: '2026-01-06' },
    { tareaId: 't1', fecha: '2026-01-07' }, { tareaId: 't2', fecha: '2026-03-02' },
    { tareaId: 't2', fecha: '2026-03-03' }, { tareaId: 't1', fecha: '2025-11-11' },
  ],
  tiempo: [{ minutos: 600, fecha: '2026-02-01' }, { minutos: 300, fecha: '2025-02-01' }],
  objetivos: [
    { id: 'o1', que: 'Correr 500 km', logradoEn: '2026-08-01' },
    { id: 'o2', que: 'Aprender alemán', abandonadoEn: '2026-05-01', porque: 'No era el año' },
    { id: 'o3', que: 'De otro año', logradoEn: '2025-02-02' },
  ],
  viajes: [viajeNuevo({ id: 'v1', nombre: 'Madrid', desde: '2026-10-10', hasta: '2026-10-14' })],
  lecturas: [{ id: 'l1', titulo: 'Uno', leidoEn: '2026-02-02' }, { id: 'l2', titulo: 'Dos' }],
  notas: [notaNueva({ tipo: 'diario', fecha: '2026-01-05' }), notaNueva({ tipo: 'diario', fecha: '2025-01-05' })],
  gastos: [gastoNuevo({ que: 'Arriendo', importe: 900, categoria: 'casa', fecha: '2026-01-02' })],
  ajustes: {},
};

t('el año cuenta solo lo de ese año', () => {
  const r = resumenDelAnio(ESTADO_ANIO, 2026, HOY);
  assert.equal(r.cerradas, 5);                       // la de 2025 queda fuera
  assert.equal(r.horas, 10);
  assert.equal(r.logrados.length, 1);
  assert.equal(r.abandonados.length, 1);
  assert.equal(r.lecturas, 1);
  assert.equal(r.diario, 1);
  assert.equal(r.viajes.length, 1);
  assert.equal(r.diasDeViaje, 5);
  assert.equal(r.gastos.total, 900);
  assert.equal(resumenDelAnio(ESTADO_ANIO, 2025, HOY).cerradas, 1);
});

t('la racha más larga del año no cruza los huecos', () => {
  const r = resumenDelAnio(ESTADO_ANIO, 2026, HOY);
  assert.equal(r.mejorRacha, 3);                     // 5, 6 y 7 de enero
  assert.equal(r.mejorMes.nombre, 'enero');
  assert.equal(r.porMes.length, 12);
  assert.equal(r.porMes.reduce((s, m) => s + m.total, 0), 5);
});

t('el reparto por módulo y proyecto sale del historial', () => {
  const r = resumenDelAnio(ESTADO_ANIO, 2026, HOY);
  assert.equal(r.porModulo[0].nombre, 'Docencia');
  assert.equal(r.porModulo[0].total, 3);
  assert.equal(r.porProyecto[0].proyecto, 'Circuitos');
  assert.equal(r.puntualidad.total, 2);
  assert.equal(r.puntualidad.pct, 50);
});

t('el año se copia en texto, con lo bueno y lo que dejaste', () => {
  const txt = textoDelAnio(resumenDelAnio(ESTADO_ANIO, 2026, HOY));
  assert.match(txt, /Cerradas: 5/);
  assert.match(txt, /Correr 500 km/);
  assert.match(txt, /Metas que dejé/);
  assert.match(txt, /No era el año/);              // el motivo también se enseña
  assert.match(txt, /Madrid/);
  assert.match(txt, /todavía en curso/);
});

t('un año sin nada lo dice, y los años disponibles salen del historial', () => {
  const r = resumenDelAnio(ESTADO_ANIO, 2019, HOY);
  assert.equal(r.cerradas, 0);
  assert.match(r.frase, /no hay nada apuntado/);
  const anios = aniosConDatos(ESTADO_ANIO);
  assert.ok(anios.includes(2026) && anios.includes(2025));
  assert.deepEqual(anios, [...anios].sort((a, b) => b - a));
});

console.log(`\n${passed} pruebas de metas de largo plazo y cierre de año OK`);
