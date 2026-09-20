/**
 * captura.js — Que capturar no cueste nada y no ensucie la lista.
 *
 * Dos cosas pequeñas con mucho efecto: detectar que ya tienes esa tarea antes
 * de crearla por tercera vez, y poder dictarla cuando tienes las manos
 * ocupadas.
 */

function limpia(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const VACIAS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a', 'y', 'o',
  'para', 'por', 'con', 'en', 'que', 'mi', 'su', 'lo', 'me', 'se']);

function palabras(txt) {
  return limpia(txt).split(' ').filter((p) => p.length > 2 && !VACIAS.has(p));
}

/**
 * Parecido entre dos títulos, de 0 a 1: proporción de palabras compartidas
 * (índice de Jaccard). Es suficiente para "llamar al seguro del coche" contra
 * "llamar al seguro", y no se inventa una semántica que no tenemos.
 */
export function parecido(a, b) {
  const A = new Set(palabras(a));
  const B = new Set(palabras(b));
  if (!A.size || !B.size) return limpia(a) === limpia(b) ? 1 : 0;
  let comunes = 0;
  for (const p of A) if (B.has(p)) comunes++;
  return comunes / (A.size + B.size - comunes);
}

/**
 * Tareas abiertas que se parecen demasiado a lo que estás escribiendo.
 * El umbral es alto a propósito: molestar con falsos positivos es peor que
 * dejar pasar algún duplicado.
 */
export function posiblesDuplicados(titulo, tareas = [], opciones = {}) {
  const umbral = opciones.umbral ?? 0.6;
  if (!limpia(titulo)) return [];
  return tareas
    .filter((t) => !t.archivada && (opciones.incluirCompletadas || !t.completada))
    .filter((t) => t.id !== opciones.excluir)
    .map((t) => ({ tarea: t, parecido: parecido(titulo, t.titulo) }))
    .filter((x) => x.parecido >= umbral)
    .sort((a, b) => b.parecido - a.parecido)
    .slice(0, 3);
}

/* ------------------------------------------------------------------ *
 * Dictado
 * ------------------------------------------------------------------ */

export function dictadoDisponible() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Dictado por voz que devuelve el texto y lo pasa por el mismo analizador de
 * lenguaje natural que la caja de escribir. Devuelve un objeto con `parar()`.
 */
export function dictar({ alTexto, alTerminar, alFallar, idioma = 'es-ES' } = {}) {
  const Reconocimiento = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!Reconocimiento) {
    alFallar?.(new Error('Este navegador no reconoce la voz. En Chrome o Edge sí funciona.'));
    return { parar() {} };
  }
  const rec = new Reconocimiento();
  rec.lang = idioma;
  rec.interimResults = true;
  rec.continuous = false;

  rec.onresult = (e) => {
    let texto = '';
    for (const resultado of e.results) texto += resultado[0].transcript;
    alTexto?.(texto.trim(), e.results[e.results.length - 1].isFinal);
  };
  rec.onerror = (e) => alFallar?.(new Error(
    e.error === 'not-allowed' ? 'No diste permiso para usar el micrófono.' : `No se pudo escuchar (${e.error}).`));
  rec.onend = () => alTerminar?.();

  try {
    rec.start();
  } catch (err) {
    alFallar?.(err);
  }
  return { parar: () => { try { rec.stop(); } catch { /* ya estaba parado */ } } };
}
