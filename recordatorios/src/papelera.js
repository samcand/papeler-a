/**
 * papelera.js — Archivar, papelera y deshacer.
 *
 * Tres formas de que un error no cueste nada:
 *
 *   - **archivar**: lo terminado deja de estorbar pero sigue contando en las
 *     estadísticas y en el historial;
 *   - **papelera**: lo borrado espera treinta días antes de irse de verdad;
 *   - **deshacer**: la última operación se revierte entera, incluidas las que
 *     tocan muchas tareas a la vez (mover todas a hoy, nivelar, vaciar).
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';

export const DIAS_EN_PAPELERA = 30;

/** Elemento listo para guardar en la papelera. */
export function aPapelera(tipo, datos, hoyISO = aISO(hoy())) {
  return {
    id: 'pap-' + Math.random().toString(36).slice(2, 9),
    tipo,                       // 'tarea' | 'proyecto' | 'plan' | 'plantilla' | 'filtro'
    nombre: datos.titulo || datos.nombre || '(sin nombre)',
    datos,
    borradoEn: hoyISO,
  };
}

/** Quita lo que ya cumplió su plazo. Se llama al abrir la app. */
export function purgar(papelera = [], hoyISO = aISO(hoy()), dias = DIAS_EN_PAPELERA) {
  return papelera.filter((x) => diferenciaDias(x.borradoEn, hoyISO) < dias);
}

/** Días que le quedan a un elemento antes de desaparecer. */
export function diasRestantes(elemento, hoyISO = aISO(hoy()), dias = DIAS_EN_PAPELERA) {
  return Math.max(0, dias - diferenciaDias(elemento.borradoEn, hoyISO));
}

/** Saca un elemento de la papelera; devuelve el elemento y la papelera sin él. */
export function restaurar(papelera = [], id) {
  const elemento = papelera.find((x) => x.id === id) || null;
  return { elemento, papelera: papelera.filter((x) => x.id !== id) };
}

/**
 * Pila de deshacer: guarda instantáneas del estado con una etiqueta legible.
 *
 * Vive solo en memoria y a propósito: llenar el almacenamiento del navegador
 * con copias del estado es la forma más tonta de perderlo todo.
 */
export class PilaDeshacer {
  constructor(limite = 15) {
    this.limite = limite;
    this.pila = [];
  }

  guardar(estado, etiqueta) {
    const copia = typeof structuredClone === 'function' ? structuredClone(estado) : JSON.parse(JSON.stringify(estado));
    this.pila.push({ estado: copia, etiqueta, cuando: Date.now() });
    if (this.pila.length > this.limite) this.pila.shift();
    return this.pila.length;
  }

  /** Devuelve la última instantánea y la saca de la pila. */
  deshacer() {
    return this.pila.pop() || null;
  }

  get ultima() {
    return this.pila.length ? this.pila[this.pila.length - 1] : null;
  }

  get hayAlgo() {
    return this.pila.length > 0;
  }

  vaciar() {
    this.pila = [];
  }
}

/* ------------------------------------------------------------------ *
 * Archivado
 * ------------------------------------------------------------------ */

/** Lo archivado desaparece de las vistas, pero no de las estadísticas. */
export function visibles(tareas = []) {
  return tareas.filter((t) => !t.archivada);
}

export function archivadas(tareas = []) {
  return tareas.filter((t) => t.archivada);
}

/**
 * Tareas completadas hace tiempo que conviene archivar: dejan de ensuciar las
 * búsquedas y los filtros de "completadas".
 */
export function candidatasAArchivar(tareas = [], hoyISO = aISO(hoy()), dias = 30) {
  return tareas.filter((t) => t.completada && !t.archivada
    && t.completadaEn && diferenciaDias(String(t.completadaEn).slice(0, 10), hoyISO) >= dias);
}
