/**
 * libros.js — Los 66 libros: nombre en español, abreviatura, identificador
 * OSIS (el que usan las referencias cruzadas) y número de capítulos.
 *
 * Un versículo se identifica con un número: libro·1 000 000 + capítulo·1000 + versículo.
 * Juan 3:16 → 43 003 016. Así se ordena, se compara y se guarda sin ambigüedad.
 */

// [nombre, abreviatura, OSIS, capítulos, alias extra sin espacios internos]
const DATOS = [
  ['Génesis', 'Gn', 'Gen', 50, 'gen ge'],
  ['Éxodo', 'Éx', 'Exod', 40, 'ex exo exod'],
  ['Levítico', 'Lv', 'Lev', 27, 'lev le'],
  ['Números', 'Nm', 'Num', 36, 'num nu'],
  ['Deuteronomio', 'Dt', 'Deut', 34, 'deut deu'],
  ['Josué', 'Jos', 'Josh', 24, 'josh'],
  ['Jueces', 'Jue', 'Judg', 21, 'jc judg'],
  ['Rut', 'Rt', 'Ruth', 4, 'ruth'],
  ['1 Samuel', '1 S', '1Sam', 31, '1sam 1sa'],
  ['2 Samuel', '2 S', '2Sam', 24, '2sam 2sa'],
  ['1 Reyes', '1 R', '1Kgs', 22, '1re 1rey 1kgs'],
  ['2 Reyes', '2 R', '2Kgs', 25, '2re 2rey 2kgs'],
  ['1 Crónicas', '1 Cr', '1Chr', 29, '1cro 1cron 1chr'],
  ['2 Crónicas', '2 Cr', '2Chr', 36, '2cro 2cron 2chr'],
  ['Esdras', 'Esd', 'Ezra', 10, 'ezra'],
  ['Nehemías', 'Neh', 'Neh', 13, 'ne'],
  ['Ester', 'Est', 'Esth', 10, 'esth'],
  ['Job', 'Job', 'Job', 42, ''],
  ['Salmos', 'Sal', 'Ps', 150, 'salmo sl ps'],
  ['Proverbios', 'Pr', 'Prov', 31, 'prov pro'],
  ['Eclesiastés', 'Ec', 'Eccl', 12, 'ecl ecc eccl qo'],
  ['Cantares', 'Cnt', 'Song', 8, 'cant cantar ct song cantardeloscantares'],
  ['Isaías', 'Is', 'Isa', 66, 'isa'],
  ['Jeremías', 'Jer', 'Jer', 52, 'jr'],
  ['Lamentaciones', 'Lm', 'Lam', 5, 'lam'],
  ['Ezequiel', 'Ez', 'Ezek', 48, 'eze ezeq ezek'],
  ['Daniel', 'Dn', 'Dan', 12, 'dan'],
  ['Oseas', 'Os', 'Hos', 14, 'hos'],
  ['Joel', 'Jl', 'Joel', 3, ''],
  ['Amós', 'Am', 'Amos', 9, ''],
  ['Abdías', 'Abd', 'Obad', 1, 'ab obad'],
  ['Jonás', 'Jon', 'Jonah', 4, 'jonah'],
  ['Miqueas', 'Mi', 'Mic', 7, 'miq mic'],
  ['Nahúm', 'Nah', 'Nah', 3, 'na'],
  ['Habacuc', 'Hab', 'Hab', 3, ''],
  ['Sofonías', 'Sof', 'Zeph', 3, 'so zeph'],
  ['Hageo', 'Hag', 'Hag', 2, ''],
  ['Zacarías', 'Zac', 'Zech', 14, 'za zech'],
  ['Malaquías', 'Mal', 'Mal', 4, ''],
  ['Mateo', 'Mt', 'Matt', 28, 'mat matt'],
  ['Marcos', 'Mr', 'Mark', 16, 'mc mar marc mark'],
  ['Lucas', 'Lc', 'Luke', 24, 'luc lu luke'],
  ['Juan', 'Jn', 'John', 21, 'jua john'],
  ['Hechos', 'Hch', 'Acts', 28, 'hech hec hch acts'],
  ['Romanos', 'Ro', 'Rom', 16, 'rom rm'],
  ['1 Corintios', '1 Co', '1Cor', 16, '1cor'],
  ['2 Corintios', '2 Co', '2Cor', 13, '2cor'],
  ['Gálatas', 'Gá', 'Gal', 6, 'gal ga'],
  ['Efesios', 'Ef', 'Eph', 6, 'efe eph'],
  ['Filipenses', 'Fil', 'Phil', 4, 'flp fili phil'],
  ['Colosenses', 'Col', 'Col', 4, ''],
  ['1 Tesalonicenses', '1 Ts', '1Thess', 5, '1tes 1thess'],
  ['2 Tesalonicenses', '2 Ts', '2Thess', 3, '2tes 2thess'],
  ['1 Timoteo', '1 Ti', '1Tim', 6, '1tim'],
  ['2 Timoteo', '2 Ti', '2Tim', 4, '2tim'],
  ['Tito', 'Tit', 'Titus', 3, 'titus'],
  ['Filemón', 'Flm', 'Phlm', 1, 'filem phlm'],
  ['Hebreos', 'He', 'Heb', 13, 'heb hb'],
  ['Santiago', 'Stg', 'Jas', 5, 'sant sg jas'],
  ['1 Pedro', '1 P', '1Pet', 5, '1pe 1ped 1pet'],
  ['2 Pedro', '2 P', '2Pet', 3, '2pe 2ped 2pet'],
  ['1 Juan', '1 Jn', '1John', 5, '1jua 1john'],
  ['2 Juan', '2 Jn', '2John', 1, '2jua 2john'],
  ['3 Juan', '3 Jn', '3John', 1, '3jua 3john'],
  ['Judas', 'Jud', 'Jude', 1, 'jds jude'],
  ['Apocalipsis', 'Ap', 'Rev', 22, 'apoc apo rev'],
];

export const LIBROS = DATOS.map(([nombre, abrev, osis, capitulos, alias], i) => ({
  n: i + 1, nombre, abrev, osis, capitulos,
  testamento: i < 39 ? 'AT' : 'NT',
  alias: alias ? alias.split(' ').filter(Boolean) : [],
}));

/** Agrupaciones clásicas, útiles para filtrar búsquedas y para la estadística por secciones. */
export const SECCIONES = [
  { nombre: 'Pentateuco', desde: 1, hasta: 5 },
  { nombre: 'Históricos', desde: 6, hasta: 17 },
  { nombre: 'Poéticos', desde: 18, hasta: 22 },
  { nombre: 'Profetas mayores', desde: 23, hasta: 27 },
  { nombre: 'Profetas menores', desde: 28, hasta: 39 },
  { nombre: 'Evangelios', desde: 40, hasta: 43 },
  { nombre: 'Hechos', desde: 44, hasta: 44 },
  { nombre: 'Cartas de Pablo', desde: 45, hasta: 57 },
  { nombre: 'Cartas generales', desde: 58, hasta: 65 },
  { nombre: 'Profecía', desde: 66, hasta: 66 },
];

export const libro = (n) => LIBROS[n - 1];
export const seccionDe = (n) => SECCIONES.find((s) => n >= s.desde && n <= s.hasta);

export const TOTAL_CAPITULOS = LIBROS.reduce((s, l) => s + l.capitulos, 0);

export const idVerso = (b, c, v) => b * 1_000_000 + c * 1000 + v;
export const partesId = (id) => ({ b: Math.floor(id / 1_000_000), c: Math.floor(id / 1000) % 1000, v: id % 1000 });

const OSIS = new Map(LIBROS.map((l) => [l.osis.toLowerCase(), l.n]));
export const libroPorOsis = (osis) => OSIS.get(String(osis).toLowerCase()) || 0;

/** Todos los capítulos de la Biblia en orden, como pares [libro, capítulo]. */
export function todosLosCapitulos(desde = 1, hasta = 66) {
  const lista = [];
  for (const l of LIBROS) {
    if (l.n < desde || l.n > hasta) continue;
    for (let c = 1; c <= l.capitulos; c++) lista.push([l.n, c]);
  }
  return lista;
}

/** Capítulo anterior / siguiente, cruzando de un libro a otro. */
export function capituloVecino(b, c, paso) {
  let lb = b, lc = c + paso;
  if (lc < 1) { lb = b - 1; if (lb < 1) return null; lc = libro(lb).capitulos; }
  else if (lc > libro(b).capitulos) { lb = b + 1; if (lb > 66) return null; lc = 1; }
  return { b: lb, c: lc };
}
