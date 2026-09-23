import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { LIBROS, idVerso, partesId, capituloVecino, TOTAL_CAPITULOS, libroPorOsis } from '../biblia/src/libros.js';
import {
  parsear, parsearLista, buscarLibro, formatear, formatearRango, rango, aClave, deClave, detectar,
} from '../biblia/src/referencias.js';
import { crearMarca, segmentos, borrarTramo, tramoEn, textoDeMarca, estiloSegmento, segmentoDeMarca } from '../biblia/src/marcas.js';
import { crearClave, compilarClaves, marcasDeClaves, contarClave, juegos } from '../biblia/src/claves.js';
import { analizarConsulta, coincide, buscar, estudiarPalabra } from '../biblia/src/busqueda.js';
import { notaAHtml, enLinea, leerEtiquetas, filtrarNotas, notasEn, exportarMarkdown, todasLasEtiquetas } from '../biblia/src/notas.js';
import { repartir, generarPlan, PLANES, describirDia, racha, avanceBiblia, diaDeHoy } from '../biblia/src/plan.js';
import { limpiarTexto, leerOsis } from '../tools/biblia-datos.mjs';
import { partirTexto, parrafosDeHtml, parrafosDeDocx, rutasEpub, indexar, citasEn, fragmento, tituloDeArchivo, buscarEnLibros } from '../biblia/src/biblioteca.js';
import { normalizar } from '../biblia/src/referencias.js';
import { conEspacio, preguntasDeGrupo, hojaCongregacion, crearSermon, nuevoPunto, moverPunto, ideaExegetica, progreso, duracionEstimada, palabrasPredicadas, avisos, pasajesDe, sermonAMarkdown, romano, cobertura } from '../biblia/src/sermones.js';
import { explicarHebreo, explicarGriego, notaExegetica } from '../biblia/src/morfologia.js';
import { strongDeLema, leerOshb, leerMorphgnt, glosaKjv } from '../tools/biblia-originales.mjs';
import { estudioOriginal, formaBase, morfologiaPrincipal, indicePalabras, claveOrden, concordancia, ordenarLineas, colocaciones, concordanciaATexto } from '../biblia/src/concordancia.js';
import { reglasDeConectores } from '../biblia/src/conectores.js';
import { partirEnClausulas, sugerirRelacion, sangrar, unirConSiguiente, partirLinea, moverLinea, diagramaATexto, puntosPrincipales } from '../biblia/src/diagrama.js';
import { INTRODUCCIONES } from '../biblia/src/introducciones.js';
import { repasar, pendientes, pista, comparar as compararMemoria, INTERVALOS } from '../biblia/src/memoria.js';
import { DEVOCIONALES, DESTINATARIOS, devocionalesPara, delDia, rachaDevocional } from '../biblia/src/devocionales.js';

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
  const m = parsearLista('Pr 14:1; 24:3-4');
  assert.deepEqual(m.map((r) => formatear(r)), ['Proverbios 14:1', 'Proverbios 24:3-4']);
  assert.deepEqual(parsearLista('Gn 3:14-15, 21').map((r) => formatear(r)), ['Génesis 3:14-15', 'Génesis 3:21']);
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
  assert.deepEqual(detectar('está en Romanos 5:8: Cristo murió. Y Juan 3:16.').map((x) => x.texto), ['Romanos 5:8', 'Juan 3:16']);
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

t('fondo, color de letra, recuadro y subrayado se combinan', () => {
  const marca = (desde, hasta, color, estilo, creada) => ({ ...crearMarca({ version: 'rv', desde: { id: 1, o: desde }, hasta: { id: 1, o: hasta }, color, estilo }), creada });
  const s = segmentos(TEXTO, 1, [
    marca(0, 38, 'amarillo', 'resaltar', 1),
    marca(21, 29, 'rojo', 'letra', 2),
    marca(21, 24, 'azul', 'recuadro', 3),
    marca(25, 29, 'verde', 'ondulado', 4),
  ]);
  const amo = s.find((x) => x.texto === 'amó');
  assert.equal(amo.fondo, 'amarillo');
  assert.equal(amo.letra, 'rojo');
  assert.equal(amo.caja, 'azul');
  const dios = s.find((x) => x.texto === 'Dios');
  assert.equal(dios.linea, 'verde');
  const e = estiloSegmento(dios);
  assert.ok(e.clase.includes('m-f') && e.clase.includes('m-l') && e.clase.includes('m-u') && e.clase.includes('m-ondulado'));
  assert.equal(e.vars['--l'], 'var(--t-rojo)');
});

t('el símbolo va una vez, delante de la palabra, y no altera el texto', () => {
  const m = crearMarca({ version: 'rv', desde: { id: 1, o: 25 }, hasta: { id: 1, o: 29 }, color: 'amarillo', estilo: 'simbolo', simbolo: '△' });
  const s = segmentos(TEXTO, 1, [m]);
  assert.equal(s.map((x) => x.texto).join(''), TEXTO);
  const dios = s.find((x) => x.texto === 'Dios');
  assert.deepEqual(dios.simbolos, [{ s: '△', color: 'amarillo' }]);
  assert.equal(estiloSegmento(dios).simbolo, '△');
  assert.equal(segmentoDeMarca(m).simbolos[0].s, '△');
});

t('palabras clave: se marcan solas donde aparece la palabra', () => {
  const k = crearClave({ palabra: 'dios', color: 'amarillo', estilo: 'recuadro', simbolo: '△', version: 'rv' });
  const comp = compilarClaves([k], { version: 'rv', b: 43 });
  const marcas = marcasDeClaves('Y dijo Dios: sea la luz. Y vió Dios', 43001001, comp);
  assert.equal(marcas.filter((m) => m.estilo === 'recuadro').length, 2);
  assert.equal(marcas.filter((m) => m.estilo === 'simbolo').length, 2);
  assert.equal(marcas[0].desde.o, 7);
  // no se aplica a otra versión, a otro libro ni si su juego está apagado
  assert.equal(compilarClaves([k], { version: 'kjv', b: 43 }).length, 0);
  const soloJuan = { ...k, alcance: 43, juego: 'Juan' };
  assert.equal(compilarClaves([soloJuan], { version: 'rv', b: 1 }).length, 0);
  assert.equal(compilarClaves([soloJuan], { version: 'rv', b: 43, juegosOcultos: ['Juan'] }).length, 0);
  assert.deepEqual(juegos([soloJuan, k]), ['Juan']);
  // derivadas y frases
  const pacto = compilarClaves([crearClave({ palabra: 'pacto', raiz: true, version: 'rv' })], { version: 'rv', b: 1 });
  assert.equal(marcasDeClaves('mi pacto y mis pactos', 1, pacto).length, 2);
  const frase = compilarClaves([crearClave({ palabra: 'hijo del hombre', version: 'rv' })], { version: 'rv', b: 40 });
  assert.equal(marcasDeClaves('el Hijo del hombre vino', 1, frase).length, 1);
  const libros = []; libros[0] = [['Dios crió. Y dijo Dios', 'la tierra']]; libros[42] = [['con Dios']];
  assert.equal(contarClave(libros, { ...k, alcance: 0 }), 3);
  assert.equal(contarClave(libros, { ...k, alcance: 43 }), 1);
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

t('todos los devocionales tienen pasajes válidos y campos completos', () => {
  for (const d of DEVOCIONALES) {
    assert.ok(parsearLista(d.texto).length, `${d.id}: texto ${d.texto}`);
    assert.ok(parsearLista(d.memoria).length, `${d.id}: memoria ${d.memoria}`);
    for (const campo of ['titulo', 'contexto', 'idea', 'reflexion', 'aplicacion', 'oracion']) assert.ok(d[campo], `${d.id}: ${campo}`);
    assert.equal(d.preguntas.length, 3, d.id);
    if (d.para === 'hijos') assert.ok(d.pequenos && d.adolescentes, d.id);
  }
  assert.equal(new Set(DEVOCIONALES.map((d) => d.id)).size, DEVOCIONALES.length, 'ids únicos');
  for (const p of DESTINATARIOS) assert.ok(devocionalesPara(p.id).length >= 8, p.id);
  assert.equal(delDia('esposa', new Date(2026, 0, 1)).para, 'esposa');
  const diario = [{ para: 'hijos', fecha: '2026-03-01', hecho: true }, { para: 'hijos', fecha: '2026-03-02', hecho: true }];
  assert.equal(rachaDevocional(diario, 'hijos', new Date(2026, 2, 2)), 2);
  assert.equal(rachaDevocional(diario, 'hijos', new Date(2026, 2, 3)), 2);
  assert.equal(rachaDevocional(diario, 'hijos', new Date(2026, 2, 5)), 0);
});

// ---------- Biblioteca ----------
t('parte textos, HTML y Word en párrafos', () => {
  assert.deepEqual(partirTexto('Primer párrafo\ncortado a mano.\n\nSegundo, con justifi-\ncación.'), ['Primer párrafo cortado a mano.', 'Segundo, con justificación.']);
  assert.deepEqual(parrafosDeHtml('<html><head><title>x</title><style>p{}</style></head><body><h1>Cap&iacute;tulo 1</h1><p>Ver <b>Ro</b> 5:8 &amp; m&#225;s.</p><script>no</script></body></html>'),
    ['Capítulo 1', 'Ver Ro 5:8 & más.']);
  const xml = '<w:body><w:p><w:r><w:t>Gracia en </w:t></w:r><w:r><w:t xml:space="preserve">Ef 2:8</w:t></w:r></w:p><w:p></w:p><w:p><w:r><w:t>Otro</w:t></w:r></w:p></w:body>';
  assert.deepEqual(parrafosDeDocx(xml), ['Gracia en Ef 2:8', 'Otro']);
  assert.equal(tituloDeArchivo('calvino_institucion-tomo1.epub'), 'Calvino institucion tomo1');
});

t('ordena los capítulos de un EPUB según el spine', () => {
  const container = '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>';
  const opf = '<package><metadata><dc:title>Comentario a Romanos</dc:title><dc:creator>Matthew Henry</dc:creator></metadata><manifest>'
    + '<item id="c2" href="cap2.xhtml"/><item id="c1" href="texto/cap%201.xhtml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>';
  const r = rutasEpub(container, (ruta) => (ruta === 'OEBPS/content.opf' ? opf : ''));
  assert.deepEqual(r.rutas, ['OEBPS/texto/cap 1.xhtml', 'OEBPS/cap2.xhtml']);
  assert.equal(r.titulo, 'Comentario a Romanos');
  assert.equal(r.autor, 'Matthew Henry');
});

t('indexa las citas y encuentra qué dicen los libros de un pasaje', () => {
  const ps = ['Introducción sin citas.', 'La gracia de Romanos 5:8 muestra el amor.', 'Todo Romanos 5 trata de la paz.', 'Ver también Juan 3:16.'];
  const indice = indexar(ps);
  assert.equal(indice.length, 3);
  const libros = [{ id: 'a', titulo: 'Comentario', indice }];
  const r = citasEn(libros, 45005008, 45005008);
  assert.deepEqual(r.map((x) => x.parrafo), [1, 2], 'la cita exacta primero, el capítulo después');
  assert.equal(citasEn(libros, 43003016, 43003017).length, 1);
  assert.equal(citasEn(libros, 1001001, 1001001).length, 0);
  const largo = 'x'.repeat(400) + ' Romanos 5:8 ' + 'y'.repeat(400);
  const f = fragmento(largo, { largo: 100 });
  assert.ok(f.includes('Romanos 5:8') && f.startsWith('…') && f.endsWith('…'));
  const hallados = buscarEnLibros([{ id: 'a', titulo: 'C', parrafos: ps }], 'gracia amor', normalizar);
  assert.deepEqual(hallados.map((h) => h.parrafo), [1]);
});

// ---------- Sermones ----------
t('sermón: idea exegética, progreso, duración y avisos', () => {
  const s = crearSermon({ pasaje: 'Ro 5:1-11', titulo: 'Paz con Dios' });
  assert.equal(progreso(s).porcentaje, 11, 'solo el texto');
  s.sujeto = '¿Qué resultado tiene la justificación por la fe?';
  s.complemento = 'Paz con Dios, acceso a la gracia y esperanza firme.';
  assert.equal(ideaExegetica(s), '¿Qué resultado tiene la justificación por la fe: paz con Dios, acceso a la gracia y esperanza firme.');
  s.bosquejo = [nuevoPunto({ titulo: 'Paz', pasaje: 'Ro 5:1', explicacion: 'uno dos tres cuatro' }), nuevoPunto({ titulo: 'Esperanza', explicacion: 'cinco' })];
  assert.ok(progreso(s).hechos.bosquejo && progreso(s).hechos.idea);
  assert.equal(palabrasPredicadas(s), 7);
  s.introduccion = Array(1300).fill('palabra').join(' ');
  assert.equal(duracionEstimada(s, 130), 10);
  const a = avisos(s);
  assert.ok(a.some((x) => x.includes('sin versículos')));
  assert.ok(a.some((x) => x.includes('idea homilética')));
  assert.deepEqual(pasajesDe(s).map((x) => x.desde), [45005001, 45005001]);
  const movido = moverPunto(s.bosquejo, s.bosquejo[1].id, -1);
  assert.equal(movido[0].titulo, 'Esperanza');
  assert.equal(s.bosquejo[0].titulo, 'Paz', 'no muta el original');
  const md = sermonAMarkdown(s);
  assert.ok(md.includes('# Paz con Dios') && md.includes('## I. Paz (Ro 5:1)') && md.includes('## II. Esperanza'));
  assert.equal(romano(4), 'IV');
  assert.equal(romano(9), 'IX');
});

t('cobertura del canon predicado', () => {
  const c = cobertura([{ pasaje: 'Ro 5:1-11' }, { pasaje: 'Ro 8' }, { pasaje: 'Sal 23' }, { pasaje: '' }]);
  assert.equal(c.porLibro[44], 2);
  assert.equal(c.at, 1);
  assert.equal(c.nt, 2);
  assert.equal(c.porSeccion.find((x) => x.nombre === 'Cartas de Pablo').n, 2);
  assert.ok(c.sinPredicar.includes('Génesis') && !c.sinPredicar.includes('Romanos'));
});

// ---------- Idiomas originales ----------
t('explica la morfología hebrea y griega en español', () => {
  assert.equal(explicarHebreo('HVqp3ms'), 'verbo qal perfecto (qatal) 3.ª persona masculino singular');
  assert.equal(explicarHebreo('HC/Vqw3mp'), 'conjunción + verbo qal imperfecto consecutivo (wayyiqtol) 3.ª persona masculino plural');
  assert.equal(explicarHebreo('HR/Ncfsa'), 'preposición + sustantivo común femenino singular absoluto');
  assert.equal(explicarHebreo('HTd/Ncmpa'), 'partícula artículo definido + sustantivo común masculino plural absoluto');
  assert.ok(explicarHebreo('ANcmsd/Td').endsWith('(arameo)'));
  assert.equal(explicarGriego('V-3AAI-S--'), 'verbo aoristo voz activa indicativo 3.ª persona singular');
  assert.equal(explicarGriego('N-----ASM-'), 'sustantivo acusativo singular masculino');
  assert.equal(explicarGriego('V--PAPNSM-'), 'verbo presente voz activa participio nominativo singular masculino');
  assert.ok(notaExegetica('V-2AAD-S--', 'el').startsWith('Imperativo aoristo'));
  assert.ok(notaExegetica('HC/Vqw3ms', 'he').startsWith('Wayyiqtol'));
});

t('lee el hebreo de OSHB y el griego de MorphGNT', () => {
  assert.equal(strongDeLema('b/7225'), 7225);
  assert.equal(strongDeLema('1254 a'), 1254);
  assert.equal(strongDeLema('c/d/776'), 776);
  const xml = '<chapter><verse osisID="Gen.1.1"><w lemma="b/7225" morph="HR/Ncfsa">בְּ/רֵאשִׁ֖ית</w><w lemma="1254 a" morph="HVqp3ms">בָּרָ֣א</w><seg type="x-maqqef">־</seg><note type="variant"><rdg><w lemma="1">x</w></rdg></note><w lemma="d/776" morph="HTd/Ncbsa">הָ/אָֽרֶץ</w><seg type="x-sof-pasuq">׃</seg></verse></chapter>';
  const h = leerOshb(xml);
  assert.deepEqual(h[0][0].map((w) => w[0]), ['בְּרֵאשִׁ֖ית', 'בָּרָ֣א־', 'הָאָֽרֶץ׃']);
  assert.deepEqual(h[0][0].map((w) => w[1]), [7225, 1254, 776]);
  const g = leerMorphgnt('040316 C- -------- γὰρ γαρ γάρ γάρ\n040316 V- 3AAI-S-- ⸀ἠγάπησεν ἠγάπησεν ἠγάπησεν ἀγαπάω', (l) => ({ 'γάρ': 1063, 'ἀγαπάω': 25 })[l] || 0);
  assert.deepEqual(g[2][15].map((w) => [w[0], w[1], w[2]]), [['γὰρ', 1063, 'C---------'], ['ἠγάπησεν', 25, 'V-3AAI-S--']]);
  assert.equal(glosaKjv('(feast of) charity(-ably), dear, love'), 'charity');
});

t('concordancia del original por número Strong', () => {
  const libros = [];
  libros[42] = [[], [], [[['Οὕτως', 3779, 'D---------'], ['ἠγάπησεν', 25, 'V-3AAI-S--'], ['ὁ', 3588, 'RA----NSM-']], [['ἀγαπᾷ', 25, 'V-3PAI-S--']]]];
  libros[61] = [[[['ἀγαπῶμεν,', 25, 'V-1PAS-P--'], ['ἀγαπῶμεν', 25, 'V-1PAS-P--']]]];
  const r = estudioOriginal(libros, 25);
  assert.equal(r.apariciones, 4);
  assert.equal(r.versiculos, 3);
  assert.equal(r.porLibro[42], 2);
  assert.deepEqual(r.lugares[0], { b: 43, c: 3, v: 1, k: 1 });
  assert.deepEqual(r.formas[0], ['αγαπωμεν', 2], 'agrupa sin acentos ni puntuación');
  assert.equal(formaBase('הָאָֽרֶץ׃'), 'הָאָרֶץ');
  assert.equal(morfologiaPrincipal('HC/Vqw3ms'), 'HVqw3ms');
  assert.equal(morfologiaPrincipal('HR/Ncfsa'), 'HNcfsa');
  assert.equal(morfologiaPrincipal('V-3AAI-S--'), 'V-3AAI-S--');
});

t('conectores lógicos marcados en el texto', () => {
  const comp = compilarClaves(reglasDeConectores('rv'), { version: 'rv', b: 45 });
  const texto = 'Justificados pues por la fe, tenemos paz para con Dios: porque Cristo murió, para que vivamos; mas Dios encarece su caridad. Mucho más ahora. Sí, si creéis.';
  const marcas = marcasDeClaves(texto, 1, comp);
  const hallados = marcas.map((m) => texto.slice(m.desde.o, m.hasta.o).toLowerCase());
  for (const w of ['porque', 'para que', 'mas']) assert.ok(hallados.includes(w), w);
  assert.ok(!hallados.includes('más'), '"mas" (contraste) no es "más" (cantidad)');
  assert.equal(hallados.filter((w) => w === 'si').length, 1, '"sí" no es condicional');
});

t('concordancia: índice alfabético con frecuencias y hápax', () => {
  const libros = [];
  libros[0] = [['En el principio crió Dios los cielos.', 'Y dijo Dios: Sea la luz.']];
  libros[42] = [['En el principio era el Verbo, y el Verbo era con Dios.']];
  const i = indicePalabras(libros);
  const dios = i.palabras.find((p) => p.clave === 'dios');
  assert.equal(dios.n, 3);
  assert.equal(dios.forma, 'Dios', 'los nombres propios conservan la mayúscula');
  assert.equal(i.palabras.find((p) => p.clave === 'en').forma, 'en', 'la mayúscula del inicio del versículo no cuenta');
  assert.equal(dios.libros, 2);
  assert.equal(i.palabras.find((p) => p.clave === 'crio').forma, 'crió', 'la clave va sin tilde, la forma con tilde');
  assert.ok(i.palabras.findIndex((p) => p.clave === 'cielos') < i.palabras.findIndex((p) => p.clave === 'dios'), 'orden alfabético');
  assert.ok(i.hapax >= 5);
  assert.equal(indicePalabras(libros, { filtro: (b) => b >= 40 }).palabras.find((p) => p.clave === 'dios').n, 1);
  const n = indicePalabras([[['nada, niño y ñame; nube']]]).palabras.map((p) => p.clave);
  assert.deepEqual(n, ['nada', 'niño', 'nube', 'ñame', 'y'], 'la ñ es letra propia y va después de la n');
});

t('concordancia: cada aparición con su contexto, ordenable', () => {
  const libros = [];
  libros[42] = [['Y el Verbo era con Dios, y el Verbo era Dios.'], [], [
    'Porque de tal manera amó Dios al mundo.', 'Porque no envió Dios á su Hijo al mundo para que condene al mundo.']];
  const r = concordancia(libros, 'mundo');
  assert.equal(r.apariciones, 3);
  assert.equal(r.versiculos, 2);
  assert.deepEqual([r.lineas[0].izq, r.lineas[0].palabra, r.lineas[0].der], ['Porque de tal manera amó Dios al ', 'mundo', '.']);
  assert.equal(concordancia(libros, 'dios').apariciones, 4);
  assert.equal(concordancia(libros, 'verb', { modo: 'raiz' }).apariciones, 2);
  assert.equal(concordancia(libros, 'el verbo', { modo: 'frase' }).apariciones, 2);
  assert.equal(concordancia(libros, 'dios', { filtro: (b) => b !== 43 }).apariciones, 0);
  // contexto recortado a palabras completas
  const corto = concordancia(libros, 'condene', { ancho: 20 }).lineas[0];
  assert.ok(corto.cortadoIzq);
  assert.equal(corto.izq, 'al mundo para que ', 'empieza en palabra completa');
  // orden por contexto derecho: "al mundo." antes que "al mundo para"
  const der = ordenarLineas(r.lineas, 'derecha').map((l) => l.der.trim().slice(0, 4));
  assert.deepEqual(der, ['.', '.', 'para']);
  const izq = ordenarLineas(concordancia(libros, 'dios').lineas, 'izquierda').map((l) => l.izq.trim().split(' ').at(-1));
  assert.deepEqual(izq, ['amó', 'con', 'envió', 'era']);
  const col = colocaciones(r.lineas);
  assert.deepEqual(col.antes[0], ['al', 3]);
  const txt = concordanciaATexto(r.lineas, { titulo: 'MUNDO' });
  assert.ok(txt.startsWith('MUNDO\n=====') && txt.includes('MUNDO.'));
});

t('diagrama de bloques: cláusulas, sangría y relaciones', () => {
  assert.equal(sugerirRelacion('porque de tal manera'), 'causa');
  assert.equal(sugerirRelacion('Para que todo aquel'), 'proposito');
  assert.equal(sugerirRelacion('así que, hermanos'), 'inferencia');
  assert.equal(sugerirRelacion('Y dijo'), '');
  const l = partirEnClausulas([
    { v: 1, texto: 'Justificados pues por la fe, tenemos paz para con Dios por medio de nuestro Señor Jesucristo:' },
    { v: 2, texto: 'Por el cual también tenemos entrada por la fe á esta gracia, mas nos gloriamos en la esperanza.' },
  ]);
  assert.deepEqual(l.map((x) => x.texto), [
    'Justificados pues por la fe, tenemos paz para con Dios por medio de nuestro Señor Jesucristo:',
    'Por el cual también tenemos entrada por la fe á esta gracia,',
    'mas nos gloriamos en la esperanza.',
  ]);
  assert.equal(l[2].relacion, 'contraste');
  assert.equal(l[2].sangria, 1);
  const s1 = sangrar(l, 0, 1);
  assert.equal(s1[0].sangria, 1);
  assert.equal(l[0].sangria, 0, 'no muta');
  assert.equal(sangrar(l, 0, -1)[0].sangria, 0, 'no baja de cero');
  const partida = partirLinea(l, 0, 5);
  assert.equal(partida.length, 4);
  assert.equal(partida[1].texto, 'tenemos paz para con Dios por medio de nuestro Señor Jesucristo:');
  assert.equal(unirConSiguiente(partida, 0)[0].texto, l[0].texto);
  assert.equal(moverLinea(l, 2, -1)[1].texto, 'mas nos gloriamos en la esperanza.');
  const txt = diagramaATexto(l);
  assert.ok(txt.includes('  1 Justificados') && txt.includes('      [contraste] mas nos'));
  assert.equal(l[1].relacion, 'medio', '"por el cual" sugiere medio');
  assert.deepEqual(puntosPrincipales(l).map((p) => p.v), [1]);
});

t('las 66 introducciones están completas y sus citas son válidas', () => {
  for (let b = 1; b <= 66; b++) {
    const i = INTRODUCCIONES[b];
    assert.ok(i, `falta el libro ${b}`);
    for (const campo of ['autor', 'fecha', 'destinatarios', 'genero', 'proposito', 'tema', 'clave', 'cristo']) assert.ok(i[campo], `${b}: ${campo}`);
    const clave = parsear(i.clave);
    assert.ok(clave && clave.b === b, `${b}: versículo clave ${i.clave}`);
    assert.ok(i.estructura.length >= 2, `${b}: estructura`);
    for (const [titulo, cita] of i.estructura) {
      const r = parsear(cita);
      assert.ok(r && r.b === b, `${b}: ${titulo} → ${cita}`);
    }
  }
});

t('memorización con repetición espaciada', () => {
  const ahora = new Date(2026, 0, 10, 20, 0).getTime();
  let t0 = { id: 'x', caja: 0, proxima: ahora };
  const t1 = repasar(t0, 'bien', ahora);
  assert.equal(t1.caja, 1);
  assert.equal(new Date(t1.proxima).getDate(), 11, 'mañana');
  const t2 = repasar({ ...t1, caja: 4 }, 'bien', ahora);
  assert.equal(t2.caja, 5);
  assert.equal(Math.round((t2.proxima - new Date(2026, 0, 10, 4).getTime()) / 86400000), INTERVALOS[5]);
  assert.equal(repasar(t2, 'mal', ahora).caja, 0);
  assert.equal(repasar(t2, 'casi', ahora).caja, 5);
  assert.equal(pendientes([t1, t0], ahora).length, 1);
  assert.equal(pista('Jehová es mi pastor', 'iniciales'), 'J_ e_ m_ p_');
  assert.equal(pista('uno dos tres cuatro cinco seis', 'huecos', { caja: 0 }), 'uno dos tres ______ cinco seis');
  assert.equal(compararMemoria('Jehova es mi pastor nada me faltara', 'JEHOVÁ es mi pastor; nada me faltará.', normalizar), 100);
  assert.ok(compararMemoria('Jehova es pastor', 'JEHOVÁ es mi pastor; nada me faltará.', normalizar) < 60);
});

t('hoja para la congregación y preguntas de grupo', () => {
  assert.equal(conEspacio('La paz con Dios'), 'La paz con ________');
  assert.equal(conEspacio('Cristo murió por mí.'), 'Cristo ________ por mí.', 'salta las palabras cortas del final');
  assert.equal(conEspacio('Esperanza en la prueba'), 'Esperanza en la ________');
  const s = crearSermon({ pasaje: 'Ro 5:1-11', titulo: 'Paz <con> Dios' });
  s.sujeto = '¿Qué resultados trae la justificación';
  s.homiletica = 'Justificado por fe, tienes paz.';
  s.bosquejo = [nuevoPunto({ titulo: 'Paz con Dios', pasaje: 'Ro 5:1', aplicacion: 'Descansa en su paz.' })];
  const g = preguntasDeGrupo(s);
  assert.deepEqual(g.map((x) => x.titulo), ['Observación', 'Interpretación', 'Aplicación']);
  assert.ok(g[0].preguntas.some((q) => q.startsWith('¿Qué resultados trae la justificación?')));
  assert.ok(g[1].preguntas.some((q) => q.includes('«Paz con Dios»')));
  assert.ok(g[2].preguntas[0].startsWith('Descansa en su paz.'));
  const html = hojaCongregacion(s, { textoPasaje: '1 Justificados pues por la fe' });
  assert.ok(html.includes('Paz &lt;con&gt; Dios'), 'escapa el HTML');
  assert.ok(html.includes('Para el grupo pequeño') && html.includes('________'));
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
