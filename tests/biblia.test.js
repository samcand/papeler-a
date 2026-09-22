import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { LIBROS, idVerso, partesId, capituloVecino, TOTAL_CAPITULOS, libroPorOsis } from '../biblia/src/libros.js';
import {
  parsear, parsearLista, buscarLibro, formatear, formatearRango, rango, aClave, deClave, detectar,
} from '../biblia/src/referencias.js';
import { crearMarca, segmentos, borrarTramo, tramoEn, textoDeMarca } from '../biblia/src/marcas.js';
import { analizarConsulta, coincide, buscar, estudiarPalabra } from '../biblia/src/busqueda.js';
import { notaAHtml, enLinea, leerEtiquetas, filtrarNotas, notasEn, exportarMarkdown, todasLasEtiquetas } from '../biblia/src/notas.js';
import { repartir, generarPlan, PLANES, describirDia, racha, avanceBiblia, diaDeHoy } from '../biblia/src/plan.js';
import { limpiarTexto, leerOsis } from '../tools/biblia-datos.mjs';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

// ---------- Libros ----------
t('66 libros y 1189 capítulos', () => {
  assert.equal(LIBROS.length, 66);
  assert.equal(TOTAL_CAPITULOS, 1189);
  assert.equal(LIBROS[42].nombre, 'Juan');
  assert.equal(libroPorOsis('1Cor'), 46);
});

t('identificador de versículo ida y vuelta', () => {
  assert.equal(idVerso(43, 3, 16), 43003016);
  assert.deepEqual(partesId(43003016), { b: 43, c: 3, v: 16 });
});

t('capítulo vecino cruza libros', () => {
  assert.deepEqual(capituloVecino(1, 50, 1), { b: 2, c: 1 });
  assert.deepEqual(capituloVecino(2, 1, -1), { b: 1, c: 50 });
  assert.equal(capituloVecino(66, 22, 1), null);
  assert.equal(capituloVecino(1, 1, -1), null);
});

// ---------- Referencias ----------
t('reconoce nombres y abreviaturas en español', () => {
  const casos = {
    'Juan': 43, 'jn': 43, 'Jn.': 43, 'Génesis': 1, 'genesis': 1, 'Gn': 1, 'Éx': 2, 'ex': 2,
    '1 Co': 46, '1co': 46, 'Primera de Corintios': 46, '1 Corintios': 46, 'I Corintios': 46,
    'ii samuel': 10, '2 S': 10, 'Sal': 19, 'salmo': 19, 'Salmos': 19, 'Ap': 66, 'apocalipsis': 66,
    'Jon': 32, 'Jue': 7, 'Jud': 65, 'Stg': 59, 'Santiago': 59, 'Fil': 50, 'Flm': 57, 'Hch': 44,
    '1 Jn': 62, '3 Juan': 64, 'Cantares': 22, 'Cantar de los cantares': 22, 'Is': 23, 'Isaías': 23,
    'Tercera de Juan': 64, 'Ro': 45, 'Rom': 45, 'Mr': 41, 'Mc': 41, 'He': 58, 'Hebreos': 58,
    'deuter': 5, 'lamen': 25,
  };
  for (const [texto, n] of Object.entries(casos)) assert.equal(buscarLibro(texto), n, texto);
  assert.equal(buscarLibro('Jo'), 0, 'ambiguo: Josué, Job, Joel, Jonás…');
  assert.equal(buscarLibro('xyz'), 0);
});

t('lee citas completas', () => {
  assert.deepEqual(parsear('Juan 3:16'), { b: 43, c: 3, v: 16, c2: 3, v2: 16 });
  assert.deepEqual(parsear('jn 3.16-18'), { b: 43, c: 3, v: 16, c2: 3, v2: 18 });
  assert.deepEqual(parsear('Ro 8:28–9:1'), { b: 45, c: 8, v: 28, c2: 9, v2: 1 });
  assert.deepEqual(parsear('Sal 23'), { b: 19, c: 23, v: null, c2: 23, v2: null });
  assert.deepEqual(parsear('Gn 1-3'), { b: 1, c: 1, v: null, c2: 3, v2: null });
  assert.deepEqual(parsear('Primera de Corintios 13:4'), { b: 46, c: 13, v: 4, c2: 13, v2: 4 });
  assert.deepEqual(parsear('1 Co 13'), { b: 46, c: 13, v: null, c2: 13, v2: null });
  assert.equal(parsear('Juan 22'), null, 'Juan tiene 21 capítulos');
  assert.equal(parsear('hola'), null);
});

t('libros de un solo capítulo: el número es el versículo', () => {
  assert.deepEqual(parsear('Judas 3'), { b: 65, c: 1, v: 3, c2: 1, v2: 3 });
  assert.deepEqual(parsear('Flm 4-6'), { b: 57, c: 1, v: 4, c2: 1, v2: 6 });
  assert.deepEqual(parsear('Abdías 1'), { b: 31, c: 1, v: null, c2: 1, v2: null });
  assert.deepEqual(parsear('3 Jn 1:4'), { b: 64, c: 1, v: 4, c2: 1, v2: 4 });
});

t('listas de citas', () => {
  const l = parsearLista('Jn 3:16, 18; Ro 5:8');
  assert.equal(l.length, 3);
  assert.deepEqual(l[1], { b: 43, c: 3, v: 18, c2: 3, v2: 18 });
  assert.equal(formatear(l[2]), 'Romanos 5:8');
});

t('escribe citas', () => {
  assert.equal(formatear(parsear('jn 3:16-18')), 'Juan 3:16-18');
  assert.equal(formatear(parsear('Ro 8:28-9:1'), { abreviado: true }), 'Ro 8:28–9:1');
  assert.equal(formatear(parsear('1co 13')), '1 Corintios 13');
  assert.equal(formatearRango(43003016, 43003018), 'Juan 3:16-18');
  assert.equal(formatearRango(43003001, 43003999), 'Juan 3');
});

t('rango y clave de URL ida y vuelta', () => {
  for (const cita of ['Juan 3:16', 'Juan 3:16-18', 'Ro 8:28-9:1', 'Sal 23', 'Gn 1-3']) {
    const r = parsear(cita);
    assert.deepEqual(deClave(aClave(r)), r, cita);
  }
  assert.deepEqual(rango(parsear('Sal 23')), { desde: 19023001, hasta: 19023999 });
  assert.equal(deClave('99.1'), null);
});

t('detecta citas dentro de una nota', () => {
  const h = detectar('Compara con Ro 5:8 y también 1 Jn 4:10. Ver Salmos 23 y he 2:3; pero "he 2 hijos" no.');
  assert.deepEqual(h.map((x) => x.texto), ['Ro 5:8', '1 Jn 4:10', 'Salmos 23', 'he 2:3']);
});

// ---------- Resaltados ----------
const TEXTO = 'Porque de tal manera amó Dios al mundo';

t('una marca en medio del versículo parte el texto en tres', () => {
  const m = crearMarca({ version: 'rv', desde: { id: 1, o: 20 }, hasta: { id: 1, o: 29 }, color: 'verde' });
  const s = segmentos(TEXTO, 1, [m]);
  assert.deepEqual(s.map((x) => x.texto), ['Porque de tal manera', ' amó Dios', ' al mundo']);
  assert.equal(s[1].color, 'verde');
  assert.equal(s[0].color, null);
  assert.equal(s.map((x) => x.texto).join(''), TEXTO);
});

t('una marca de varios versículos cubre los del medio enteros', () => {
  const m = crearMarca({ version: 'rv', desde: { id: 5, o: 10 }, hasta: { id: 3, o: 4 } }); // al revés
  assert.equal(m.desde.id, 3);
  assert.deepEqual(tramoEn(m, 3, 20), [4, 20]);
  assert.deepEqual(tramoEn(m, 4, 20), [0, 20]);
  assert.deepEqual(tramoEn(m, 5, 20), [0, 10]);
  assert.equal(tramoEn(m, 6, 20), null);
});

t('resaltados encimados: gana el más reciente; el subrayado se suma', () => {
  const a = { ...crearMarca({ version: 'rv', desde: { id: 1, o: 0 }, hasta: { id: 1, o: null }, color: 'amarillo' }), creada: 1 };
  const b = { ...crearMarca({ version: 'rv', desde: { id: 1, o: 7 }, hasta: { id: 1, o: 13 }, color: 'rosa' }), creada: 2 };
  const c = { ...crearMarca({ version: 'rv', desde: { id: 1, o: 10 }, hasta: { id: 1, o: 20 }, color: 'azul', estilo: 'subrayar' }), creada: 3 };
  const s = segmentos(TEXTO, 1, [c, a, b]);
  assert.equal(s.map((x) => x.texto).join(''), TEXTO);
  const trozo = s.find((x) => x.texto.startsWith('tal'));
  assert.equal(trozo.color, 'rosa');
  assert.ok(trozo.estilos.has('subrayar'));
});

t('borrar un tramo recorta o parte las marcas', () => {
  const m = crearMarca({ version: 'rv', desde: { id: 1, o: 0 }, hasta: { id: 3, o: null } });
  const partido = borrarTramo([m], 'rv', { id: 2, o: 0 }, { id: 2, o: null });
  assert.equal(partido.length, 2);
  assert.deepEqual(partido[0].hasta, { id: 2, o: 0 });
  assert.deepEqual(partido[1].desde, { id: 2, o: null });
  assert.equal(tramoEn(partido[0], 2, 10), null);
  assert.equal(tramoEn(partido[1], 2, 10), null);
  assert.deepEqual(tramoEn(partido[1], 3, 10), [0, 10]);
  // otra versión no se toca
  assert.equal(borrarTramo([m], 'kjv', { id: 1, o: 0 }, { id: 9, o: 0 }).length, 1);
  // borrar todo lo cubierto la elimina
  assert.equal(borrarTramo([m], 'rv', { id: 1, o: 0 }, { id: 3, o: null }).length, 0);
});

t('el texto de una marca para el cuaderno', () => {
  const textos = { 43003016: 'Porque de tal manera amó Dios al mundo', 43003017: 'Porque no envió Dios' };
  const m = crearMarca({ version: 'rv', desde: { id: 43003016, o: 21 }, hasta: { id: 43003017, o: 6 } });
  assert.equal(textoDeMarca(m, (id) => textos[id]), 'amó Dios al mundo Porque');
});

// ---------- Búsqueda ----------
const MINI = [];
MINI[0] = [['En el principio crió Dios los cielos y la tierra.', 'Y la tierra estaba desordenada y vacía.']];
MINI[42] = [['En el principio era el Verbo, y el Verbo era con Dios.', 'Este era en el principio con Dios.'],
  [], ['Porque de tal manera amó Dios al mundo, que ha dado á su Hijo unigénito.']];

t('consulta: palabras, frase, alternativas, prefijo y exclusión', () => {
  const q = analizarConsulta('"el verbo" dios -tierra amor|caridad justic*');
  assert.equal(q.grupos.length, 4);
  assert.equal(q.excluir.length, 1);
  assert.equal(q.grupos[2].length, 2);
  assert.ok(q.grupos[3][0].prefijo);
});

t('no distingue tildes ni mayúsculas y respeta palabras completas', () => {
  assert.ok(coincide('Porque de tal manera amó Dios', analizarConsulta('amo')));
  assert.equal(coincide('Dios amoroso', analizarConsulta('amo')), null);
  assert.ok(coincide('Dios amoroso', analizarConsulta('amo*')));
  const tramos = coincide('JEHOVÁ es mi pastor', analizarConsulta('jehova'));
  assert.deepEqual(tramos, [[0, 6]]);
});

t('busca en toda la Biblia y cuenta por libro', () => {
  const r = buscar(MINI, 'principio dios');
  assert.equal(r.total, 3);
  assert.equal(r.porLibro[0], 1);
  assert.equal(r.porLibro[42], 2);
  assert.deepEqual([r.resultados[0].b, r.resultados[0].c, r.resultados[0].v], [1, 1, 1]);
  assert.equal(buscar(MINI, '"el verbo"').total, 1);
  assert.equal(buscar(MINI, 'dios -verbo').total, 3);
  assert.equal(buscar(MINI, 'principio', { filtro: (b) => b >= 40 }).total, 2);
  assert.equal(buscar(MINI, '').total, 0);
});

t('estudio de palabra: apariciones, testamentos, primera mención y acompañantes', () => {
  const e = estudiarPalabra(MINI, 'dios');
  assert.equal(e.versiculos, 4);
  assert.equal(e.apariciones, 4);
  assert.equal(e.at, 1);
  assert.equal(e.nt, 3);
  assert.equal(e.primera.b, 1);
  assert.equal(e.acompanantes[0][0], 'principio');
});

// ---------- Notas ----------
t('Markdown sencillo, seguro y con citas enlazadas', () => {
  const html = notaAHtml('# Tema\n**Gracia** y *fe*: ver Ef 2:8-9\n\n- uno\n- dos\n\n> cita\n<script>alert(1)</script>');
  assert.ok(html.includes('<h3>Tema</h3>'));
  assert.ok(html.includes('<strong>Gracia</strong>'));
  assert.ok(html.includes('<em>fe</em>'));
  assert.ok(html.includes('href="#/leer/49.2.8-9"'));
  assert.ok(html.includes('<ul><li>uno</li><li>dos</li></ul>'));
  assert.ok(html.includes('<blockquote>cita</blockquote>'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!enLinea('2 * 3 * 4').includes('<em> 3 </em>'));
});

t('etiquetas y filtros del cuaderno', () => {
  assert.deepEqual(leerEtiquetas('#Gracia, fe  #gracia'), ['gracia', 'fe']);
  const notas = [
    { id: 1, desde: 43003016, hasta: 43003016, titulo: 'Amor', cuerpo: 'Dios amó', etiquetas: ['amor'], editada: 1 },
    { id: 2, desde: 45005008, hasta: 45005008, titulo: '', cuerpo: 'Prueba del amor', etiquetas: ['amor', 'cruz'], editada: 2 },
    { id: 3, desde: null, titulo: 'Sermón', cuerpo: 'Bosquejo', etiquetas: [], editada: 3 },
  ];
  assert.deepEqual(filtrarNotas(notas, { etiqueta: 'amor' }).map((n) => n.id), [2, 1]);
  assert.deepEqual(filtrarNotas(notas, { libro: 43 }).map((n) => n.id), [1]);
  assert.deepEqual(filtrarNotas(notas, { texto: 'romanos' }).map((n) => n.id), [2]);
  assert.deepEqual(notasEn(notas, 43003001, 43003999).map((n) => n.id), [1]);
  assert.deepEqual(todasLasEtiquetas(notas)[0], ['amor', 2]);
  const md = exportarMarkdown(notas);
  assert.ok(md.indexOf('Juan 3:16') < md.indexOf('Romanos 5:8'));
  assert.ok(md.includes('Apunte libre'));
});

// ---------- Planes ----------
t('reparte capítulos sin dejar días vacíos', () => {
  const caps = Array.from({ length: 10 }, (_, i) => [1, i + 1]);
  const d = repartir(caps, 4);
  assert.equal(d.length, 4);
  assert.ok(d.every((x) => x.length > 0));
  assert.equal(d.flat().length, 10);
  assert.equal(repartir(caps.slice(0, 3), 10).length, 3);
});

t('plan anual: 365 días con toda la Biblia en orden', () => {
  const plan = generarPlan(PLANES.find((p) => p.id === 'anual'));
  assert.equal(plan.length, 365);
  assert.equal(plan.flat().length, 1189);
  assert.deepEqual(plan[0][0], [1, 1]);
  assert.deepEqual(plan[364].at(-1), [66, 22]);
});

t('describe el día, cuenta la racha y el avance', () => {
  assert.equal(describirDia([[1, 1], [1, 2], [1, 3]]), 'Génesis 1-3');
  assert.equal(describirDia([[40, 28], [41, 1]]), 'Mateo 28; Marcos 1');
  assert.equal(describirDia([[65, 1]]), 'Judas');
  assert.equal(racha([0, 1, 2, 4, 5], 5), 2);
  assert.equal(racha([0, 1, 2], 3), 3, 'si hoy aún no se lee, cuenta hasta ayer');
  const a = avanceBiblia(['1.1', '1.2', '43.3']);
  assert.equal(a.hechos, 3);
  assert.equal(a.porLibro[0], 2);
  assert.equal(diaDeHoy('2026-01-01T12:00:00', new Date('2026-01-03T08:00:00')), 2);
});

// ---------- Generador de datos ----------
t('limpia versalitas y lee referencias OSIS', () => {
  assert.equal(limpiarTexto('EN el  principio', true), 'En el principio');
  assert.equal(limpiarTexto('ASÍ que, hermanos', true), 'Así que, hermanos');
  assert.equal(limpiarTexto('Y dijo Dios', true), 'Y dijo Dios');
  assert.equal(limpiarTexto('¿POR qué se amotinan', true), '¿Por qué se amotinan');
  assert.equal(limpiarTexto('JEHOVÁ es mi pastor', false), 'JEHOVÁ es mi pastor');
  assert.deepEqual(leerOsis('Gen.1.1'), [1001001, 0]);
  assert.deepEqual(leerOsis('Prov.8.22-Prov.8.30'), [20008022, 20008030]);
});

t('los datos generados están completos', () => {
  const raiz = new URL('../biblia/datos/', import.meta.url);
  if (!existsSync(new URL('indice.json', raiz))) { console.log('    (sin datos generados, se omite)'); return; }
  const indice = JSON.parse(readFileSync(new URL('indice.json', raiz)));
  assert.equal(indice.versiculos.length, 66);
  assert.equal(indice.versiculos.flat().length, 1189);
  const juan = JSON.parse(readFileSync(new URL('rv1909/43.json', raiz)));
  assert.ok(juan[2][15].startsWith('Porque de tal manera amó Dios al mundo'));
  const xref = JSON.parse(readFileSync(new URL('xref/43.json', raiz)));
  assert.ok(xref['3:16'].length > 5);
  assert.ok(xref['3:16'].every((r, i, l) => i === 0 || l[i - 1][2] >= r[2]), 'ordenadas por votos');
});

console.log(`\n${passed} pruebas de estudio bíblico pasaron`);
