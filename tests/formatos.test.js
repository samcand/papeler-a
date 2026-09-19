import assert from 'node:assert/strict';
import { importarTexto, detectarFormato, leerDirectiva, aChordPro } from '../src/formatos.js';
import { chordsUsed, parseSong } from '../src/chordpro.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

const CHORDPRO = `{title: Cuán Grande Es Él}
{artist: Stuart K. Hine}
{key: A}
{tempo: 68}
{time: 3/4}
{capo: 2}
{x_tags: himno, adoración}
# comentario del archivo

{start_of_verse: Verso 1}
Señor mi [A]Dios, al contem[D]plar los [A]cielos
{end_of_verse}

{soc}
[A]Cuán grande es [E7]Él
{eoc}

{c: ritardando al final}
{sob}
[F#m]Puente
{eob}
`;

const ONSONG = `Santo, Santo, Santo
Reginald Heber
Key: D
Tempo: 72
Time: 4/4
CCLI: Dominio público
Keywords: himno, apertura

Verse 1:
D      A      D
Santo, Santo, Santo
Chorus:
[D]Dios en tres Per[G]sonas
`;

t('reconoce el formato de cada archivo', () => {
  assert.equal(detectarFormato(CHORDPRO, 'x.cho'), 'chordpro');
  assert.equal(detectarFormato(ONSONG, 'x.onsong'), 'onsong');
  assert.equal(detectarFormato('D      A\nSanto, Santo', 'x.txt'), 'acordes-sobre-letra');
});

t('lee directivas con sus abreviaturas oficiales', () => {
  assert.deepEqual(leerDirectiva('{t: Hola}'), { nombre: 'title', valor: 'Hola' });
  assert.deepEqual(leerDirectiva('{soc}'), { nombre: 'start_of_chorus', valor: '' });
  assert.deepEqual(leerDirectiva('{eov}'), { nombre: 'end_of_verse', valor: '' });
  assert.deepEqual(leerDirectiva('{c: nota}'), { nombre: 'comment', valor: 'nota' });
  // Las secciones admiten etiqueta con la sintaxis label="..."
  assert.deepEqual(leerDirectiva('{start_of_verse: label="Verso 2"}'), { nombre: 'start_of_verse', valor: 'Verso 2' });
  assert.equal(leerDirectiva('[C]no es directiva'), null);
});

t('importa un ChordPro completo', () => {
  const { canciones, formato } = importarTexto(CHORDPRO, { nombre: 'himno.cho' });
  assert.equal(formato, 'chordpro');
  assert.equal(canciones.length, 1);
  const c = canciones[0];
  assert.equal(c.title, 'Cuán Grande Es Él');
  assert.equal(c.author, 'Stuart K. Hine');
  assert.equal(c.key, 'A');
  assert.equal(c.bpm, 68);
  assert.equal(c.timeSignature, '3/4');
  assert.equal(c.capo, 2);
  assert.deepEqual(c.tags, ['himno', 'adoración']);
  assert.deepEqual(chordsUsed(c.body), ['A', 'D', 'E7', 'F#m']);
  const secciones = parseSong(c.body).map((s) => s.name).filter(Boolean);
  assert.deepEqual(secciones, ['Verso 1', 'Coro', 'Puente'], 'las secciones se traducen al español');
  assert.ok(c.body.includes('// ritardando al final'), 'los comentarios se conservan');
});

t('importa un archivo de OnSong con su cabecera', () => {
  const { canciones, formato } = importarTexto(ONSONG, { nombre: 'santo.onsong' });
  assert.equal(formato, 'onsong');
  const c = canciones[0];
  assert.equal(c.title, 'Santo, Santo, Santo');
  assert.equal(c.author, 'Reginald Heber');
  assert.equal(c.key, 'D');
  assert.equal(c.bpm, 72);
  assert.equal(c.ccli, 'Dominio público');
  assert.deepEqual(c.tags, ['himno', 'apertura']);
  // Los acordes escritos encima de la letra caen en su sílaba
  // Cada acorde cae en la sílaba que le toca según la columna en la que estaba
  assert.ok(c.body.includes('[D]Santo, [A]Santo, [D]Santo'), c.body);
  assert.deepEqual(parseSong(c.body).map((s) => s.name).filter(Boolean), ['Verso 1', 'Coro']);
});

t('separa varias canciones en un mismo archivo', () => {
  const doble = `{t: Primera}\n{key: C}\n[C]uno\n{ns}\n{t: Segunda}\n{key: G}\n[G]dos\n`;
  const { canciones } = importarTexto(doble, { nombre: 'dos.cho' });
  assert.equal(canciones.length, 2);
  assert.deepEqual(canciones.map((c) => `${c.title} (${c.key})`), ['Primera (C)', 'Segunda (G)']);
});

t('deduce la tonalidad cuando el archivo no la trae', () => {
  const { canciones } = importarTexto('{t: Sin tono}\n\n[Em]Una [C]línea\n', { nombre: 'x.cho' });
  assert.equal(canciones[0].key, 'Em', 'usa el primer acorde');
  const latina = importarTexto('{t: X}\n{key: Sol}\n[G]hola\n', { nombre: 'x.cho' });
  assert.equal(latina.canciones[0].key, 'G', 'entiende la tonalidad escrita en latino');
  const mayor = importarTexto('{t: X}\n{key: Bb major}\n[Bb]hola\n', { nombre: 'x.cho' });
  assert.equal(mayor.canciones[0].key, 'Bb');
});

t('conserva las tablaturas tal cual', () => {
  const conTab = `{t: Con tab}\n{key: E}\n{sot}\ne|---0---2---|\nB|---1---3---|\n{eot}\n`;
  const { canciones } = importarTexto(conTab, { nombre: 'tab.cho' });
  assert.ok(canciones[0].body.includes('e|---0---2---|'), canciones[0].body);
});

t('exporta a ChordPro y vuelve a leerse igual', () => {
  const original = importarTexto(CHORDPRO, { nombre: 'himno.cho' }).canciones[0];
  const texto = aChordPro(original);
  assert.ok(texto.startsWith('{title: Cuán Grande Es Él}'), texto.slice(0, 60));
  assert.ok(texto.includes('{key: A}') && texto.includes('{tempo: 68}') && texto.includes('{capo: 2}'));
  assert.ok(texto.includes('{start_of_chorus: Coro}') && texto.includes('{end_of_chorus}'));

  const vuelta = importarTexto(texto, { nombre: 'ida-y-vuelta.cho' }).canciones[0];
  assert.equal(vuelta.title, original.title);
  assert.equal(vuelta.key, original.key);
  assert.equal(vuelta.bpm, original.bpm);
  assert.equal(vuelta.capo, original.capo);
  assert.deepEqual(chordsUsed(vuelta.body), chordsUsed(original.body));
  assert.deepEqual(
    parseSong(vuelta.body).map((s) => s.name).filter(Boolean),
    parseSong(original.body).map((s) => s.name).filter(Boolean));
});

t('no se cae con archivos raros', () => {
  assert.deepEqual(importarTexto('', { nombre: 'vacio.cho' }).canciones, []);
  assert.deepEqual(importarTexto('   \n\n  ', { nombre: 'blanco.cho' }).canciones, []);
  const soloTexto = importarTexto('Esto es una nota cualquiera', { nombre: 'nota.txt' });
  assert.equal(soloTexto.canciones.length, 1, 'aun así crea la canción con el texto');
});

console.log(`\n${passed} pruebas OK`);
