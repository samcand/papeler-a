/**
 * diagrama.js — Diagrama de bloques (análisis estructural) de un pasaje.
 *
 * El texto se parte en cláusulas, una por línea. La cláusula principal queda
 * a la izquierda y las que dependen de ella se sangran debajo, con una etiqueta
 * que dice cómo se relacionan (causa, propósito, contraste…). Así se ve el
 * flujo del argumento del autor, que es el esqueleto del sermón expositivo.
 *
 *   { id, desde, hasta, version, lineas: [{ id, v, texto, sangria, relacion, nota }], creado, editado }
 */

import { nuevoId } from './marcas.js';
import { normalizar } from './referencias.js';

/** Relaciones lógicas entre proposiciones (Schreiner, Piper, BibleArc), agrupadas. */
export const RELACIONES = [
  { id: '', nombre: '—', grupo: '' },
  { id: 'serie', nombre: 'Serie (y…)', grupo: 'Coordinación', color: 'gris' },
  { id: 'progresion', nombre: 'Progresión', grupo: 'Coordinación', color: 'gris' },
  { id: 'alternativa', nombre: 'Alternativa (o…)', grupo: 'Coordinación', color: 'gris' },
  { id: 'causa', nombre: 'Causa / fundamento (porque)', grupo: 'Apoyo', color: 'naranja' },
  { id: 'inferencia', nombre: 'Inferencia (por tanto)', grupo: 'Apoyo', color: 'rojo' },
  { id: 'proposito', nombre: 'Propósito (para que)', grupo: 'Apoyo', color: 'verde' },
  { id: 'resultado', nombre: 'Resultado (de modo que)', grupo: 'Apoyo', color: 'verde' },
  { id: 'medio', nombre: 'Medio (por medio de)', grupo: 'Apoyo', color: 'azul' },
  { id: 'condicion', nombre: 'Condición (si…)', grupo: 'Apoyo', color: 'azul' },
  { id: 'tiempo', nombre: 'Tiempo (cuando…)', grupo: 'Apoyo', color: 'cafe' },
  { id: 'lugar', nombre: 'Lugar (donde…)', grupo: 'Apoyo', color: 'cafe' },
  { id: 'manera', nombre: 'Manera (como…)', grupo: 'Apoyo', color: 'cafe' },
  { id: 'comparacion', nombre: 'Comparación (así como)', grupo: 'Apoyo', color: 'gris' },
  { id: 'contraste', nombre: 'Contraste (mas, pero)', grupo: 'Contraste', color: 'morado' },
  { id: 'concesion', nombre: 'Concesión (aunque)', grupo: 'Contraste', color: 'morado' },
  { id: 'explicacion', nombre: 'Explicación / aclaración', grupo: 'Restatement', color: 'amarillo' },
  { id: 'ejemplo', nombre: 'Ejemplo / ilustración', grupo: 'Restatement', color: 'amarillo' },
  { id: 'pregunta', nombre: 'Pregunta → respuesta', grupo: 'Otros', color: 'rosa' },
  { id: 'situacion', nombre: 'Situación → respuesta', grupo: 'Otros', color: 'rosa' },
];
export const relacion = (id) => RELACIONES.find((r) => r.id === id) || RELACIONES[0];

// Conectores que suelen abrir una cláusula dependiente y la relación que sugieren
const PISTAS = [
  ['porque', 'causa'], ['pues', 'causa'], ['por cuanto', 'causa'],
  ['por tanto', 'inferencia'], ['asi que', 'inferencia'], ['por lo cual', 'inferencia'], ['de manera que', 'resultado'], ['de modo que', 'resultado'],
  ['para que', 'proposito'], ['a fin de que', 'proposito'],
  ['mas', 'contraste'], ['pero', 'contraste'], ['sino', 'contraste'], ['empero', 'contraste'],
  ['aunque', 'concesion'], ['si', 'condicion'],
  ['cuando', 'tiempo'], ['entonces', 'tiempo'], ['mientras', 'tiempo'],
  ['como', 'comparacion'], ['asi como', 'comparacion'],
  ['por medio de', 'medio'], ['por el cual', 'medio'],
];

/** Relación sugerida por la primera palabra de la cláusula ("porque…" → causa). */
export function sugerirRelacion(texto) {
  const t = normalizar(texto).replace(/^[^a-zñ]+/, '');
  let mejor = '';
  let largo = 0;
  for (const [pista, rel] of PISTAS) {
    const sigue = t.charAt(pista.length);
    if (t.startsWith(pista) && !/[a-zñ]/.test(sigue) && pista.length > largo) { mejor = rel; largo = pista.length; }
  }
  return mejor;
}

/**
 * Parte versículos en cláusulas: en ; y :, y antes de un conector precedido de
 * coma ("…al mundo, que ha dado…", "…, para que todo aquel…"). La sangría y
 * la relación de cada cláusula dependiente se sugieren; el estudioso decide.
 *   versos: [{ v, texto }]
 */
export function partirEnClausulas(versos) {
  const lineas = [];
  const conectores = PISTAS.map(([p]) => p).sort((a, z) => z.length - a.length);
  for (const { v, texto } of versos) {
    // 1) cortes duros en ; :
    const trozos = String(texto).split(/(?<=[;:])\s+/);
    for (const trozo of trozos) {
      // 2) cortes antes de ", <conector>"
      const partes = [];
      let resto = trozo;
      for (;;) {
        const plano = normalizar(resto);
        let corte = -1;
        for (const c of conectores) {
          const re = new RegExp(`,\\s+(${c.replace(/ /g, '\\s+')})\\b`);
          const m = re.exec(plano);
          if (m && (corte < 0 || m.index < corte)) corte = m.index;
        }
        if (corte < 0 || corte < 8) { partes.push(resto); break; }
        partes.push(resto.slice(0, corte + 1));
        resto = resto.slice(corte + 1).trimStart();
      }
      for (const p of partes) {
        const texto2 = p.trim();
        if (!texto2) continue;
        const rel = sugerirRelacion(texto2);
        lineas.push({ id: nuevoId('l'), v, texto: texto2, sangria: rel && lineas.length ? 1 : 0, relacion: rel, nota: '' });
      }
    }
  }
  return lineas;
}

export function crearDiagrama({ desde, hasta, version, versos }) {
  const ahora = Date.now();
  return { id: nuevoId('dg'), desde, hasta, version, lineas: partirEnClausulas(versos), creado: ahora, editado: ahora };
}

const copiar = (lineas) => lineas.map((l) => ({ ...l }));

export function sangrar(lineas, i, paso) {
  const nuevas = copiar(lineas);
  if (nuevas[i]) nuevas[i].sangria = Math.max(0, Math.min(8, nuevas[i].sangria + paso));
  return nuevas;
}

/** Une la línea i con la siguiente (si son del mismo versículo, el texto se junta). */
export function unirConSiguiente(lineas, i) {
  if (i < 0 || i >= lineas.length - 1) return copiar(lineas);
  const nuevas = copiar(lineas);
  const [a, b] = [nuevas[i], nuevas[i + 1]];
  a.texto = `${a.texto} ${b.texto}`;
  a.nota = [a.nota, b.nota].filter(Boolean).join(' · ');
  nuevas.splice(i + 1, 1);
  return nuevas;
}

/** Parte la línea i antes de la palabra número `palabra` (0 = primera). */
export function partirLinea(lineas, i, palabra) {
  const nuevas = copiar(lineas);
  const l = nuevas[i];
  if (!l) return nuevas;
  const palabras = l.texto.split(/\s+/);
  if (palabra <= 0 || palabra >= palabras.length) return nuevas;
  const resto = palabras.slice(palabra).join(' ');
  l.texto = palabras.slice(0, palabra).join(' ');
  const rel = sugerirRelacion(resto);
  nuevas.splice(i + 1, 0, { id: nuevoId('l'), v: l.v, texto: resto, sangria: l.sangria + (rel ? 1 : 0), relacion: rel, nota: '' });
  return nuevas;
}

export function moverLinea(lineas, i, paso) {
  const nuevas = copiar(lineas);
  const j = i + paso;
  if (j < 0 || j >= nuevas.length) return nuevas;
  [nuevas[i], nuevas[j]] = [nuevas[j], nuevas[i]];
  return nuevas;
}

/**
 * El diagrama como texto sangrado, para el sermón o un documento:
 *   16 Porque de tal manera amó Dios al mundo,
 *        [resultado] que ha dado á su Hijo unigénito,
 */
export function diagramaATexto(lineas) {
  let versoAnterior = null;
  return lineas.map((l) => {
    const num = l.v !== versoAnterior ? String(l.v).padStart(3) : '   ';
    versoAnterior = l.v;
    const etiqueta = l.relacion ? `[${relacion(l.relacion).nombre.split(' (')[0].toLowerCase()}] ` : '';
    const nota = l.nota ? `   // ${l.nota}` : '';
    return `${num} ${'    '.repeat(l.sangria)}${etiqueta}${l.texto}${nota}`;
  }).join('\n');
}

/** Bosquejo sugerido: cada línea sin sangría (proposición principal) es un punto. */
export function puntosPrincipales(lineas) {
  return lineas.filter((l) => l.sangria === 0).map((l) => ({ v: l.v, texto: l.texto }));
}
