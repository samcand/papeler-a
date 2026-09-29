/**
 * automatizacion.js — Reglas del tipo "si entra esto, hazle aquello".
 *
 * Las mismas tres decisiones repetidas mil veces: todo lo que lleva la etiqueta
 * del curso va al proyecto del curso, todo lo que menciona un ticker es de
 * inversiones, lo que llega de la bandeja con "llamar" es prioridad 2. Las
 * reglas se aplican **al crear** la tarea y dejan constancia de cuál actuó.
 */

import { aISO, hoy, sumarDias } from './fechas.js';

export const CONDICIONES = [
  { id: 'titulo', nombre: 'el título contiene', ayuda: 'texto suelto, sin distinguir mayúsculas ni acentos' },
  { id: 'etiqueta', nombre: 'tiene la etiqueta', ayuda: 'sin la @' },
  { id: 'proyecto', nombre: 'está en el proyecto', ayuda: 'nombre exacto' },
  { id: 'modulo', nombre: 'es del módulo', ayuda: 'inversiones, docencia…' },
  { id: 'sinFecha', nombre: 'no tiene fecha', ayuda: '' },
];

export const ACCIONES = [
  { id: 'proyecto', nombre: 'ponle el proyecto' },
  { id: 'modulo', nombre: 'ponle el módulo' },
  { id: 'prioridad', nombre: 'ponle la prioridad', numerico: true },
  { id: 'etiqueta', nombre: 'añádele la etiqueta' },
  { id: 'fecha', nombre: 'ponle fecha dentro de (días)', numerico: true },
  { id: 'duracion', nombre: 'ponle duración (min)', numerico: true },
  { id: 'energia', nombre: 'ponle energía' },
];

export function reglaVacia() {
  return {
    id: 'r-' + Math.random().toString(36).slice(2, 8),
    nombre: 'Regla nueva',
    activa: true,
    condicion: { tipo: 'titulo', valor: '' },
    acciones: [{ tipo: 'prioridad', valor: 2 }],
    veces: 0,
  };
}

function limpia(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** ¿Esta regla se aplica a esta tarea? */
export function coincide(regla, tarea) {
  const { tipo, valor } = regla.condicion || {};
  switch (tipo) {
    case 'titulo': return !!valor && limpia(tarea.titulo).includes(limpia(valor));
    case 'etiqueta': return (tarea.etiquetas || []).some((e) => limpia(e) === limpia(valor));
    case 'proyecto': return limpia(tarea.proyecto || '') === limpia(valor);
    case 'modulo': return limpia(tarea.modulo || '') === limpia(valor);
    case 'sinFecha': return !tarea.fecha;
    default: return false;
  }
}

/**
 * Aplica las reglas activas a una tarea recién creada. Devuelve la tarea ya
 * modificada y qué reglas actuaron, porque una automatización silenciosa es una
 * automatización en la que se deja de confiar.
 */
export function aplicarReglas(tarea, reglas = [], hoyISO = aISO(hoy())) {
  const aplicadas = [];
  let salida = { ...tarea };

  for (const regla of reglas) {
    if (!regla.activa || !coincide(regla, salida)) continue;
    for (const accion of regla.acciones || []) {
      switch (accion.tipo) {
        case 'proyecto': salida.proyecto = accion.valor || salida.proyecto; break;
        case 'modulo': salida.modulo = accion.valor || salida.modulo; break;
        case 'prioridad': salida.prioridad = Math.min(4, Math.max(1, Number(accion.valor) || salida.prioridad)); break;
        case 'etiqueta':
          if (accion.valor && !(salida.etiquetas || []).includes(accion.valor)) {
            salida.etiquetas = [...(salida.etiquetas || []), accion.valor];
          }
          break;
        case 'fecha':
          if (!salida.fecha) salida.fecha = aISO(sumarDias(hoyISO, Number(accion.valor) || 0));
          break;
        case 'duracion': if (!salida.duracion) salida.duracion = Number(accion.valor) || null; break;
        case 'energia': salida.energia = accion.valor || salida.energia; break;
        default: break;
      }
    }
    aplicadas.push(regla.nombre || regla.id);
  }

  return { tarea: salida, aplicadas };
}

/** Texto legible de una regla, para leerla de un vistazo. */
export function textoRegla(regla) {
  const cond = CONDICIONES.find((c) => c.id === regla.condicion?.tipo);
  const partes = (regla.acciones || []).map((a) => {
    const acc = ACCIONES.find((x) => x.id === a.tipo);
    return `${acc ? acc.nombre : a.tipo} ${a.valor}`;
  });
  const valor = regla.condicion?.tipo === 'sinFecha' ? '' : ` “${regla.condicion?.valor || ''}”`;
  return `Si ${cond ? cond.nombre : '?'}${valor}, ${partes.join(' y ')}.`;
}

/** Reglas de ejemplo, que además enseñan para qué sirve esto. */
export const REGLAS_EJEMPLO = [
  {
    id: 'r-llamar', nombre: 'Llamadas', activa: false,
    condicion: { tipo: 'titulo', valor: 'llamar' },
    acciones: [{ tipo: 'etiqueta', valor: 'llamar' }, { tipo: 'energia', valor: 'baja' }, { tipo: 'duracion', valor: 15 }],
    veces: 0,
  },
  {
    id: 'r-revisar', nombre: 'Revisar tesis de un valor', activa: false,
    condicion: { tipo: 'titulo', valor: 'tesis' },
    acciones: [{ tipo: 'modulo', valor: 'inversiones' }, { tipo: 'proyecto', valor: 'Cartera' }],
    veces: 0,
  },
  {
    id: 'r-bandeja', nombre: 'Nada se queda sin fecha más de una semana', activa: false,
    condicion: { tipo: 'sinFecha', valor: '' },
    acciones: [{ tipo: 'fecha', valor: 7 }],
    veces: 0,
  },
];
