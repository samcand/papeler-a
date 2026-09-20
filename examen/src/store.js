/**
 * store.js — Todo el progreso vive en este dispositivo (localStorage).
 *
 * No hay cuenta ni servidor: nadie más ve tus respuestas. La contrapartida es
 * que si cambias de teléfono hay que exportar e importar el archivo, y por eso
 * el botón de exportar está a la vista en la pantalla de Progreso.
 */

import { actualizarRepaso } from './motor.js';
import { logrosNuevos } from './logros.js';

const CLAVE = 'ingreso.v1';
const MAX_RESPUESTAS = 5000;   // suficiente para meses de estudio sin llenar el almacenamiento

const INICIAL = {
  version: 1,
  respuestas: [],   // { qid, asignatura, tema, dificultad, correcta, ms, at, modo }
  repaso: {},       // { [qid]: { caja, proxima, aciertos, fallos, ultima } }
  simulacros: [],   // { id, at, modelo, minutos, duracionMs, porcentaje, respuestas }
  propias: [],      // preguntas añadidas o importadas por el usuario
  escritos: [],     // { id, at, consignaId, tema, consigna, texto, palabras, porcentaje, rubrica }
  logros: {},       // { [logroId]: fecha en que se consiguió }
  borradorEscritura: null,   // texto a medio escribir, para no perderlo al recargar
  ajustes: {
    nombre: '',
    meta: 20,          // preguntas al día
    grado: '',         // grado escolar elegido en Practicar ('' = cualquiera)
    modoGrado: 'hasta',
    tema: 'oscuro',
    fechaExamen: '',
  },
};

function id() {
  return 'x' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

class Store {
  constructor() {
    this.state = this.cargar();
    this.oyentes = new Set();
  }

  cargar() {
    // Fuera del navegador (las pruebas corren en node) no hay dónde guardar.
    if (typeof localStorage === 'undefined') return structuredClone(INICIAL);
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return structuredClone(INICIAL);
      const datos = JSON.parse(crudo);
      return {
        ...structuredClone(INICIAL),
        ...datos,
        ajustes: { ...INICIAL.ajustes, ...(datos.ajustes || {}) },
      };
    } catch (error) {
      console.warn('No se pudo leer el progreso guardado; se empieza de cero.', error);
      return structuredClone(INICIAL);
    }
  }

  guardar() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(CLAVE, JSON.stringify(this.state));
    } catch (error) {
      console.warn('No se pudo guardar el progreso.', error);
    }
    for (const fn of this.oyentes) fn(this.state);
  }

  suscribir(fn) {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  // ------------------------------------------------------------ respuestas

  /** Registra una respuesta y mueve la pregunta de caja de repaso. */
  registrar({ pregunta, correcta, ms, modo = 'practica', ahora = Date.now() }) {
    this.state.respuestas.push({
      qid: pregunta.id,
      asignatura: pregunta.asignatura,
      tema: pregunta.tema,
      dificultad: pregunta.dificultad,
      correcta: !!correcta,
      ms: ms || 0,
      at: ahora,
      modo,
    });
    if (this.state.respuestas.length > MAX_RESPUESTAS) {
      this.state.respuestas = this.state.respuestas.slice(-MAX_RESPUESTAS);
    }
    this.state.repaso[pregunta.id] = actualizarRepaso(this.state.repaso[pregunta.id], correcta, ahora);
    this.guardar();
  }

  guardarSimulacro(resultado) {
    this.state.simulacros.unshift({ id: id(), at: Date.now(), ...resultado });
    this.state.simulacros = this.state.simulacros.slice(0, 50);
    this.guardar();
  }

  // ------------------------------------------------------------ escritura

  guardarEscrito(escrito) {
    this.state.escritos.unshift({ id: id(), at: Date.now(), ...escrito });
    this.state.escritos = this.state.escritos.slice(0, 50);
    this.guardar();
  }

  guardarBorradorEscritura(borrador) {
    this.state.borradorEscritura = { ...borrador, at: Date.now() };
    this.guardar();
  }

  borrarBorradorEscritura() {
    this.state.borradorEscritura = null;
    this.guardar();
  }

  ajustar(clave, valor) {
    this.state.ajustes[clave] = valor;
    this.guardar();
  }

  // ------------------------------------------------------------ consultas

  /**
   * Apunta las medallas recién conseguidas y las devuelve, para que la vista
   * las celebre. Se llama después de guardar, no antes: una medalla se gana
   * con lo que ya quedó registrado.
   */
  revisarLogros(ahora = Date.now()) {
    const nuevos = logrosNuevos(this.state, ahora);
    if (!nuevos.length) return [];
    if (!this.state.logros) this.state.logros = {};
    for (const l of nuevos) this.state.logros[l.id] = ahora;
    this.guardar();
    return nuevos;
  }

  respuestasDe(asignatura) {
    return this.state.respuestas.filter((r) => r.asignatura === asignatura);
  }

  hechasHoy(ahora = Date.now()) {
    const inicio = new Date(ahora); inicio.setHours(0, 0, 0, 0);
    return this.state.respuestas.filter((r) => r.at >= inicio.getTime()).length;
  }

  vistas() {
    return new Set(this.state.respuestas.map((r) => r.qid));
  }

  // ------------------------------------------------------------ preguntas propias

  /** Añade preguntas del usuario validando lo mínimo para que no rompan la app. */
  importarPreguntas(lista) {
    const validas = [];
    const errores = [];
    for (const [i, p] of (lista || []).entries()) {
      const fallo = revisarPregunta(p);
      if (fallo) { errores.push(`#${i + 1}: ${fallo}`); continue; }
      validas.push({ ...p, id: p.id || 'propia-' + id(), propia: true });
    }
    const existentes = new Set(this.state.propias.map((p) => p.id));
    this.state.propias.push(...validas.filter((p) => !existentes.has(p.id)));
    this.guardar();
    return { agregadas: validas.length, errores };
  }

  borrarPropias() {
    this.state.propias = [];
    this.guardar();
  }

  // ------------------------------------------------------------ respaldo

  exportar() {
    return JSON.stringify({ ...this.state, exportadoEn: new Date().toISOString() }, null, 2);
  }

  importar(texto) {
    const datos = JSON.parse(texto);
    if (!datos || typeof datos !== 'object') throw new Error('El archivo no tiene el formato esperado.');
    this.state = {
      ...structuredClone(INICIAL),
      ...datos,
      ajustes: { ...INICIAL.ajustes, ...(datos.ajustes || {}) },
    };
    this.guardar();
  }

  borrarTodo() {
    this.state = structuredClone(INICIAL);
    this.guardar();
  }
}

/** Devuelve el motivo por el que una pregunta no sirve, o null si está bien. */
export function revisarPregunta(p) {
  if (!p || typeof p !== 'object') return 'no es un objeto';
  if (!p.enunciado) return 'falta el enunciado';
  if (!Array.isArray(p.opciones) || p.opciones.length < 2) return 'hacen falta al menos dos opciones';
  if (typeof p.correcta !== 'number' || p.correcta < 0 || p.correcta >= p.opciones.length) {
    return 'el índice de la respuesta correcta está fuera de rango';
  }
  if (!p.asignatura) return 'falta la asignatura';
  if (!p.tema) return 'falta el tema';
  return null;
}

export const store = new Store();
