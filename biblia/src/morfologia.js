/**
 * morfologia.js — Explica en español los códigos morfológicos del hebreo
 * (Open Scriptures Hebrew Bible) y del griego (MorphGNT).
 *
 *   hebreo "HC/Vqw3ms"  → conjunción + verbo qal wayyiqtol 3.ª masculino singular
 *   griego "V-3AAI-S--" → verbo aoristo activo indicativo 3.ª singular
 */

// ------------------------------------------------------------------ Hebreo

const H_GENERO = { m: 'masculino', f: 'femenino', b: 'común (ambos)', c: 'común' };
const H_NUMERO = { s: 'singular', p: 'plural', d: 'dual' };
const H_ESTADO = { a: 'absoluto', c: 'constructo', d: 'determinado' };
const H_PERSONA = { 1: '1.ª', 2: '2.ª', 3: '3.ª' };

const H_RAIZ_HEB = {
  q: 'qal', N: 'nifal', p: 'piel', P: 'pual', h: 'hifil', H: 'hofal', t: 'hitpael', o: 'polel', O: 'polal',
  r: 'hitpolel', m: 'poel', M: 'poal', k: 'palel', K: 'pulal', Q: 'qal pasivo', l: 'pilpel', L: 'polpal',
  f: 'hitpalpel', D: 'nitpael', j: 'pealal', i: 'pilel', u: 'hotpaal', c: 'tifil', v: 'histafel',
  w: 'nitpalel', y: 'nitpoel', z: 'hitpoel',
};
const H_RAIZ_ARAM = {
  q: 'peal', Q: 'peil', u: 'hitpeel', p: 'pael', P: 'hitpaal', M: 'hitpaal', a: 'afel', h: 'hafel',
  s: 'safel', e: 'shafel', H: 'hofal', i: 'itpeel', t: 'hishtafal', v: 'ishtafal', w: 'hitaafal',
  o: 'polel', z: 'itpoel', f: 'poel', b: 'itpaal', c: 'itpeal',
};
const H_TIPO_VERBO = {
  p: 'perfecto (qatal)', q: 'perfecto consecutivo (weqatal)', i: 'imperfecto (yiqtol)',
  w: 'imperfecto consecutivo (wayyiqtol)', h: 'cohortativo', j: 'yusivo', v: 'imperativo',
  r: 'participio activo', s: 'participio pasivo', a: 'infinitivo absoluto', c: 'infinitivo constructo',
};
const H_TIPO_NOMBRE = { c: 'común', g: 'gentilicio', p: 'propio', x: '' };
const H_TIPO_ADJ = { a: '', c: 'cardinal', g: 'gentilicio', o: 'ordinal' };
const H_TIPO_PRON = { d: 'demostrativo', f: 'indefinido', i: 'interrogativo', p: 'personal', r: 'relativo' };
const H_TIPO_SUF = { d: 'direccional (he locativa)', h: 'he paragógica', n: 'nun paragógica', p: 'pronominal' };
const H_TIPO_PART = {
  a: 'de afirmación', d: 'artículo definido', e: 'de exhortación', i: 'interrogativa', j: 'interjección',
  m: 'demostrativa', n: 'negativa', o: 'marca de objeto directo (אֵת)', r: 'relativa',
};

const junta = (...partes) => partes.filter(Boolean).join(' ');

function hebreoParte(p, arameo) {
  const [pos, ...r] = p;
  switch (pos) {
    case 'N': return junta('sustantivo', H_TIPO_NOMBRE[r[0]], H_GENERO[r[1]], H_NUMERO[r[2]], H_ESTADO[r[3]]);
    case 'A': return junta('adjetivo', H_TIPO_ADJ[r[0]], H_GENERO[r[1]], H_NUMERO[r[2]], H_ESTADO[r[3]]);
    case 'V': {
      const raiz = (arameo ? H_RAIZ_ARAM : H_RAIZ_HEB)[r[0]];
      const tipo = H_TIPO_VERBO[r[1]];
      if (r[1] === 'r' || r[1] === 's') return junta('verbo', raiz, tipo, H_GENERO[r[2]], H_NUMERO[r[3]], H_ESTADO[r[4]]);
      if (r[1] === 'a' || r[1] === 'c') return junta('verbo', raiz, tipo);
      return junta('verbo', raiz, tipo, H_PERSONA[r[2]] && `${H_PERSONA[r[2]]} persona`, H_GENERO[r[3]], H_NUMERO[r[4]]);
    }
    case 'P': return junta('pronombre', H_TIPO_PRON[r[0]], H_PERSONA[r[1]] && `${H_PERSONA[r[1]]} persona`, H_GENERO[r[2]], H_NUMERO[r[3]]);
    case 'S': return junta('sufijo', H_TIPO_SUF[r[0]], H_PERSONA[r[1]] && `${H_PERSONA[r[1]]} persona`, H_GENERO[r[2]], H_NUMERO[r[3]]);
    case 'T': return junta('partícula', H_TIPO_PART[r[0]]);
    case 'R': return r[0] === 'd' ? 'preposición con artículo' : 'preposición';
    case 'C': return 'conjunción';
    case 'D': return 'adverbio';
    default: return p;
  }
}

/** "HC/Vqw3ms" → "conjunción + verbo qal imperfecto consecutivo (wayyiqtol) 3.ª persona masculino singular" */
export function explicarHebreo(codigo) {
  const c = String(codigo || '');
  if (!c) return '';
  const arameo = c[0] === 'A';
  const cuerpo = /^[HA]/.test(c) ? c.slice(1) : c;
  const texto = cuerpo.split('/').filter(Boolean).map((p) => hebreoParte(p, arameo)).join(' + ');
  return arameo ? `${texto} (arameo)` : texto;
}

// ------------------------------------------------------------------ Griego

const G_POS = {
  'A-': 'adjetivo', 'C-': 'conjunción', 'D-': 'adverbio', 'I-': 'interjección', 'N-': 'sustantivo',
  'P-': 'preposición', RA: 'artículo', RD: 'pronombre demostrativo', RI: 'pronombre interrogativo/indefinido',
  RP: 'pronombre personal', RR: 'pronombre relativo', 'V-': 'verbo', 'X-': 'partícula',
};
const G_TIEMPO = { P: 'presente', I: 'imperfecto', F: 'futuro', A: 'aoristo', X: 'perfecto', Y: 'pluscuamperfecto' };
const G_VOZ = { A: 'activa', M: 'media', P: 'pasiva' };
const G_MODO = { I: 'indicativo', D: 'imperativo', S: 'subjuntivo', O: 'optativo', N: 'infinitivo', P: 'participio' };
const G_CASO = { N: 'nominativo', G: 'genitivo', D: 'dativo', A: 'acusativo', V: 'vocativo' };
const G_NUMERO = { S: 'singular', P: 'plural' };
const G_GENERO = { M: 'masculino', F: 'femenino', N: 'neutro' };
const G_GRADO = { C: 'comparativo', S: 'superlativo' };

/** "V-3AAI-S--" → "verbo aoristo activa indicativo 3.ª persona singular" */
export function explicarGriego(codigo) {
  const c = String(codigo || '');
  if (c.length < 2) return '';
  const pos = G_POS[c.slice(0, 2)] || c.slice(0, 2);
  const [persona, tiempo, voz, modo, caso, numero, genero, grado] = c.slice(2).padEnd(8, '-');
  return junta(
    pos,
    G_TIEMPO[tiempo], G_VOZ[voz] && `voz ${G_VOZ[voz]}`, G_MODO[modo],
    persona !== '-' && `${persona}.ª persona`,
    G_CASO[caso], G_NUMERO[numero], G_GENERO[genero], G_GRADO[grado],
  );
}

/** Notas didácticas sobre formas que un predicador suele querer explicar. */
export function notaExegetica(codigo, idioma) {
  const c = String(codigo || '');
  if (idioma === 'el' && c.startsWith('V-')) {
    const tiempo = c[3], modo = c[5];
    if (tiempo === 'A' && modo === 'D') return 'Imperativo aoristo: suele presentar el mandato como un todo o con urgencia ("hazlo").';
    if (tiempo === 'P' && modo === 'D') return 'Imperativo presente: suele presentar la acción como continua o habitual ("sigue haciéndolo").';
    if (tiempo === 'X') return 'Perfecto: acción completada cuyos resultados permanecen en el presente.';
    if (tiempo === 'A' && modo === 'I') return 'Aoristo indicativo: presenta la acción como un todo, normalmente en el pasado; no implica por sí mismo "una sola vez".';
    if (tiempo === 'I') return 'Imperfecto: acción en curso o repetida en el pasado.';
    if (modo === 'S') return 'Subjuntivo: acción posible, deseada o prevista (propósito, condición, exhortación).';
    if (modo === 'P') return 'Participio: adjetivo verbal; su relación con el verbo principal (tiempo, causa, medio, condición) la decide el contexto.';
  }
  if (idioma === 'he') {
    const verbo = c.replace(/^[HA]/, '').split('/').find((x) => x[0] === 'V');
    if (!verbo) return '';
    const [, raiz, tipo] = verbo;
    if (tipo === 'w') return 'Wayyiqtol: la forma típica de la narración; hace avanzar el relato ("y… y…").';
    if (tipo === 'q') return 'Weqatal: suele indicar acción futura o habitual que continúa una secuencia.';
    if (tipo === 'v') return 'Imperativo: mandato directo en segunda persona.';
    if (tipo === 'a') return 'Infinitivo absoluto: junto a un verbo de la misma raíz intensifica la acción ("ciertamente morirás").';
    if (raiz === 'p') return 'Piel: raíz intensiva o factitiva; a menudo intensifica o hace causar un estado.';
    if (raiz === 'h') return 'Hifil: raíz causativa ("hacer que…").';
    if (raiz === 'N') return 'Nifal: suele ser pasivo o reflexivo del qal.';
    if (raiz === 't') return 'Hitpael: reflexivo o recíproco ("a sí mismo", "unos a otros").';
  }
  return '';
}
