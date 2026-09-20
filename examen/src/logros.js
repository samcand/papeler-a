/**
 * logros.js — Puntos, rangos y medallas.
 *
 * Estudiar dos años seguidos no lo sostiene la fuerza de voluntad: lo sostiene
 * ver que algo avanza. Aquí está esa capa, con tres reglas que evitan que se
 * vuelva un juego tonto:
 *
 *   1. Los puntos se ganan por dificultad, no por cantidad. Acertar una
 *      pregunta de nivel experto vale cuatro veces una básica, así que no
 *      compensa quedarse en lo fácil para inflar el marcador.
 *   2. Fallar no resta. Castigar el intento empuja a responder solo lo que ya
 *      se sabe, que es justo lo contrario de estudiar.
 *   3. Casi todas las medallas premian constancia y cobertura, no volumen. Se
 *      puede responder mil preguntas en un fin de semana; no se puede tener
 *      una racha de treinta días en un fin de semana.
 */

import { racha } from './motor.js';
import { ASIGNATURAS } from './temario.js';

/** Un acierto vale tantos puntos como su nivel: de 1 (básico) a 4 (experto). */
export function puntosDe(respuesta) {
  return respuesta.correcta ? (respuesta.dificultad || 1) : 0;
}

export const RANGOS = [
  { desde: 0, nombre: 'Principiante', icono: '🌱' },
  { desde: 250, nombre: 'Aprendiz', icono: '📗' },
  { desde: 1000, nombre: 'Constante', icono: '📘' },
  { desde: 2500, nombre: 'Avanzado', icono: '🎯' },
  { desde: 6000, nombre: 'Veterano', icono: '🏅' },
  { desde: 12000, nombre: 'Experto', icono: '🧠' },
  { desde: 25000, nombre: 'Maestro', icono: '👑' },
];

export function rangoDe(puntos) {
  let actual = RANGOS[0];
  for (const r of RANGOS) if (puntos >= r.desde) actual = r;
  const siguiente = RANGOS[RANGOS.indexOf(actual) + 1] || null;
  const falta = siguiente ? siguiente.desde - puntos : 0;
  const avance = siguiente
    ? Math.round(((puntos - actual.desde) / (siguiente.desde - actual.desde)) * 100)
    : 100;
  return { actual, siguiente, falta, avance };
}

/** Una pregunta se considera dominada cuando llegó a la penúltima caja de repaso. */
const CAJA_DOMINIO = 5;

/**
 * Resume el estado una sola vez para que las medallas no recorran el historial
 * diecisiete veces. Todo lo que necesitan sale de aquí.
 */
export function resumen(state, ahora = Date.now()) {
  const respuestas = state.respuestas || [];
  const repaso = state.repaso || {};

  const puntos = respuestas.reduce((s, r) => s + puntosDe(r), 0);
  const aciertos = respuestas.filter((r) => r.correcta).length;

  const asignaturasTocadas = new Set(respuestas.map((r) => r.asignatura));
  const temasTocados = new Set(respuestas.map((r) => `${r.asignatura}/${r.tema}`));
  const dificultadesTocadas = new Set(respuestas.filter((r) => r.correcta).map((r) => r.dificultad));

  const dominadas = Object.values(repaso).filter((d) => (d?.caja || 0) >= CAJA_DOMINIO).length;

  // Mejor tanda de aciertos seguidos, en el orden en que se respondieron.
  let seguidas = 0;
  let mejorSeguidas = 0;
  for (const r of respuestas) {
    seguidas = r.correcta ? seguidas + 1 : 0;
    if (seguidas > mejorSeguidas) mejorSeguidas = seguidas;
  }

  const dias = new Set(respuestas.map((r) => Math.floor(r.at / 86400000)));
  const diarios = (state.simulacros || []).filter((s) => s.modelo === 'Diario');

  return {
    puntos,
    respondidas: respuestas.length,
    aciertos,
    racha: racha(respuestas, ahora),
    diasActivos: dias.size,
    asignaturas: asignaturasTocadas.size,
    temas: temasTocados.size,
    nivelesAcertados: dificultadesTocadas.size,
    dominadas,
    mejorSeguidas,
    sesionesDiarias: diarios.length,
    simulacrosLargos: (state.simulacros || []).length - diarios.length,
    escritos: (state.escritos || []).length,
  };
}

/**
 * Cada medalla dice qué mide (`valor`) y cuánto hace falta (`meta`), para poder
 * mostrar "vas en 4 de 7" en vez de un candado mudo. Es lo que sostiene la
 * motivación entre una medalla y la siguiente.
 */
export const LOGROS = [
  { id: 'primer-paso', icono: '👣', nombre: 'Primer paso', descripcion: 'Responde tu primera pregunta.', meta: 1, valor: (r) => r.respondidas },
  { id: 'primera-sesion', icono: '☀️', nombre: 'Rutina empezada', descripcion: 'Completa tu primera sesión diaria.', meta: 1, valor: (r) => r.sesionesDiarias },

  { id: 'racha-3', icono: '🔥', nombre: 'Tres días', descripcion: 'Estudia tres días seguidos.', meta: 3, valor: (r) => r.racha },
  { id: 'racha-7', icono: '🔥', nombre: 'Una semana entera', descripcion: 'Estudia siete días seguidos.', meta: 7, valor: (r) => r.racha },
  { id: 'racha-30', icono: '🔥', nombre: 'Un mes sin fallar', descripcion: 'Estudia treinta días seguidos.', meta: 30, valor: (r) => r.racha },
  { id: 'racha-100', icono: '💎', nombre: 'Cien días', descripcion: 'Estudia cien días seguidos.', meta: 100, valor: (r) => r.racha },
  { id: 'racha-365', icono: '🏆', nombre: 'Un año completo', descripcion: 'Estudia trescientos sesenta y cinco días seguidos.', meta: 365, valor: (r) => r.racha },

  { id: 'ciclo-semanal', icono: '🔄', nombre: 'Vuelta completa', descripcion: 'Haz siete sesiones diarias: un ciclo entero del temario.', meta: 7, valor: (r) => r.sesionesDiarias },
  { id: 'ciclo-mensual', icono: '📅', nombre: 'Cuatro vueltas', descripcion: 'Haz veintiocho sesiones diarias.', meta: 28, valor: (r) => r.sesionesDiarias },

  { id: 'preguntas-100', icono: '💯', nombre: 'Cien preguntas', descripcion: 'Responde cien preguntas.', meta: 100, valor: (r) => r.respondidas },
  { id: 'preguntas-500', icono: '📚', nombre: 'Quinientas', descripcion: 'Responde quinientas preguntas.', meta: 500, valor: (r) => r.respondidas },
  { id: 'preguntas-2000', icono: '🗂️', nombre: 'Dos mil', descripcion: 'Responde dos mil preguntas.', meta: 2000, valor: (r) => r.respondidas },

  { id: 'todas-asignaturas', icono: '🧭', nombre: 'Todo el mapa', descripcion: 'Practica al menos una pregunta de las diecisiete asignaturas.', meta: ASIGNATURAS.length, valor: (r) => r.asignaturas },
  { id: 'temas-50', icono: '🗺️', nombre: 'Medio temario', descripcion: 'Toca cincuenta temas distintos.', meta: 50, valor: (r) => r.temas },
  { id: 'temas-185', icono: '🌍', nombre: 'Temario completo', descripcion: 'Toca los ciento ochenta y cinco temas.', meta: 185, valor: (r) => r.temas },

  { id: 'cuatro-niveles', icono: '🪜', nombre: 'De básico a experto', descripcion: 'Acierta al menos una pregunta de cada uno de los cuatro niveles.', meta: 4, valor: (r) => r.nivelesAcertados },
  { id: 'seguidas-10', icono: '🎯', nombre: 'Diez seguidas', descripcion: 'Acierta diez preguntas seguidas.', meta: 10, valor: (r) => r.mejorSeguidas },
  { id: 'seguidas-25', icono: '🏹', nombre: 'Veinticinco seguidas', descripcion: 'Acierta veinticinco preguntas seguidas.', meta: 25, valor: (r) => r.mejorSeguidas },

  { id: 'dominadas-25', icono: '🔒', nombre: 'Veinticinco en la caja alta', descripcion: 'Lleva veinticinco preguntas hasta la quinta caja de repaso.', meta: 25, valor: (r) => r.dominadas },
  { id: 'dominadas-200', icono: '🧱', nombre: 'Doscientas asentadas', descripcion: 'Lleva doscientas preguntas hasta la quinta caja de repaso.', meta: 200, valor: (r) => r.dominadas },

  { id: 'ensayo-largo', icono: '⏱️', nombre: 'Ensayo general', descripcion: 'Termina un simulacro largo.', meta: 1, valor: (r) => r.simulacrosLargos },
  { id: 'escrito-1', icono: '✍️', nombre: 'Primer texto', descripcion: 'Escribe y revisa un texto argumentativo.', meta: 1, valor: (r) => r.escritos },
  { id: 'escrito-10', icono: '📝', nombre: 'Diez textos', descripcion: 'Escribe y revisa diez textos.', meta: 10, valor: (r) => r.escritos },
];

/** Estado de cada medalla, con lo que falta para la siguiente. */
export function estadoLogros(state, ahora = Date.now()) {
  const r = resumen(state, ahora);
  const ganados = state.logros || {};
  return LOGROS.map((l) => {
    const valor = Math.max(0, l.valor(r));
    return {
      ...l,
      valor: Math.min(valor, l.meta),
      logrado: valor >= l.meta,
      at: ganados[l.id] || null,
      avance: Math.min(100, Math.round((valor / l.meta) * 100)),
    };
  });
}

/** Los que se acaban de conseguir y todavía no estaban registrados. */
export function logrosNuevos(state, ahora = Date.now()) {
  const ganados = state.logros || {};
  return estadoLogros(state, ahora).filter((l) => l.logrado && !ganados[l.id]);
}
