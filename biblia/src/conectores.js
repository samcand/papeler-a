/**
 * conectores.js — Conectores lógicos del texto, para seguir el argumento del
 * autor (análisis del discurso): causa, inferencia, propósito, contraste,
 * condición, comparación y tiempo. Se muestran como marcas automáticas.
 *
 * Están pensados para la RV1909; "pues" y "como" son ambiguos y el lector
 * siempre debe confirmar la función en el contexto.
 */

import { crearClave } from './claves.js';

export const CONECTORES = [
  { tipo: 'causa', nombre: 'Causa', color: 'naranja', simbolo: '∵', palabras: ['porque', 'por cuanto', 'pues que', 'ya que', 'puesto que'] },
  { tipo: 'inferencia', nombre: 'Inferencia / conclusión', color: 'rojo', simbolo: '∴', palabras: ['por tanto', 'así que', 'de manera que', 'de modo que', 'por lo cual', 'por consiguiente', 'por esto', 'por lo tanto', 'luego'] },
  { tipo: 'proposito', nombre: 'Propósito / resultado', color: 'verde', simbolo: '→', palabras: ['para que', 'a fin de que', 'de suerte que'] },
  { tipo: 'contraste', nombre: 'Contraste', color: 'morado', simbolo: '↔', palabras: ['mas', 'pero', 'sino', 'empero', 'aunque', 'no obstante', 'sin embargo', 'antes bien'] },
  { tipo: 'condicion', nombre: 'Condición', color: 'azul', simbolo: '?', palabras: ['si', 'si no', 'con tal que'] },
  { tipo: 'comparacion', nombre: 'Comparación', color: 'gris', simbolo: '≈', palabras: ['así como', 'así también', 'de la manera que', 'como también', 'semejante'] },
  { tipo: 'tiempo', nombre: 'Tiempo / secuencia', color: 'cafe', simbolo: '◷', palabras: ['entonces', 'cuando', 'después', 'hasta que', 'antes que', 'mientras'] },
];

/** Reglas de palabras clave (ver claves.js) para una versión en español. */
export function reglasDeConectores(version, tipos = CONECTORES.map((c) => c.tipo)) {
  const reglas = [];
  for (const c of CONECTORES) {
    if (!tipos.includes(c.tipo)) continue;
    for (const palabra of c.palabras) {
      reglas.push({ ...crearClave({ palabra, raiz: false, estilo: 'recuadro', color: c.color, simbolo: '', version }), id: `con-${c.tipo}-${palabra}`, tipo: c.tipo, tildes: true });
    }
  }
  return reglas;
}
