/**
 * trabajo.js — Tres cosas pequeñas del trabajo real que no cabían en otro sitio.
 *
 *   - **Cola de lectura**: los artículos por leer son una cola con prioridad,
 *     no una carpeta de descargas con 300 PDF.
 *   - **Decisiones no tomadas**: lo que descartaste y por qué. Revisarlo un año
 *     después enseña más que la lista de aciertos.
 *   - **Horas de asesoría por estudiante**: para la memoria anual y para ver a
 *     quién le estás dedicando el tiempo de verdad.
 */

import { aISO, diferenciaDias, hoy, sumarDias } from './fechas.js';

/* ------------------------------------------------------------------ *
 * Cola de lectura
 * ------------------------------------------------------------------ */

export const TIPOS_LECTURA = [
  { id: 'articulo', nombre: 'Artículo', icono: '📄', minutos: 45 },
  { id: 'libro', nombre: 'Libro / capítulo', icono: '📕', minutos: 90 },
  { id: 'informe', nombre: 'Informe anual', icono: '📊', minutos: 60 },
  { id: 'web', nombre: 'Web o entrada', icono: '🔗', minutos: 15 },
];

export function lecturaNueva(campos = {}) {
  return {
    id: 'lec-' + Math.random().toString(36).slice(2, 8),
    titulo: '',
    autor: '',
    tipo: 'articulo',
    fuente: '',
    prioridad: 3,
    minutos: null,
    añadidoEn: aISO(hoy()),
    leidoEn: null,
    notas: '',
    ...campos,
  };
}

/** Minutos que se le suponen si no los pones. */
export function minutosDe(lectura) {
  return Number(lectura.minutos) || TIPOS_LECTURA.find((t) => t.id === lectura.tipo)?.minutos || 30;
}

/**
 * La cola ordenada: primero prioridad, después antigüedad. Lo que lleva medio
 * año esperando sube solo, porque si no nunca se lee.
 */
export function colaDeLectura(lecturas = [], hoyISO = aISO(hoy())) {
  const pendientes = lecturas.filter((l) => !l.leidoEn);
  const conEdad = pendientes.map((l) => ({
    ...l,
    dias: diferenciaDias(l.añadidoEn, hoyISO),
    minutosEfectivos: minutosDe(l),
  }));
  conEdad.sort((a, b) => {
    const pesoA = a.prioridad - Math.floor(a.dias / 60);
    const pesoB = b.prioridad - Math.floor(b.dias / 60);
    return pesoA - pesoB || b.dias - a.dias;
  });
  const leidas = lecturas.filter((l) => l.leidoEn);
  return {
    cola: conEdad,
    leidas: leidas.length,
    minutos: conEdad.reduce((s, l) => s + l.minutosEfectivos, 0),
    viejas: conEdad.filter((l) => l.dias >= 90).length,
    frase: !conEdad.length ? 'La cola está vacía.'
      : `${conEdad.length} por leer, unas ${Math.round(conEdad.reduce((s, l) => s + l.minutosEfectivos, 0) / 60)} horas`
        + `${conEdad.filter((l) => l.dias >= 90).length ? `. ${conEdad.filter((l) => l.dias >= 90).length} llevan más de tres meses: o se leen o se borran.` : '.'}`,
  };
}

/** Qué leer en el hueco que tienes. */
export function queLeerEn(lecturas = [], minutos = 30, hoyISO = aISO(hoy())) {
  return colaDeLectura(lecturas, hoyISO).cola.filter((l) => l.minutosEfectivos <= minutos).slice(0, 5);
}

/* ------------------------------------------------------------------ *
 * Decisiones no tomadas
 * ------------------------------------------------------------------ */

export function decisionNueva(campos = {}) {
  return {
    id: 'dec-' + Math.random().toString(36).slice(2, 8),
    que: '',
    tipo: 'descartada',      // 'descartada' | 'aplazada'
    porque: '',
    precio: null,
    fecha: aISO(hoy()),
    revisarEn: aISO(sumarDias(hoy(), 365)),
    revisada: null,
    resultado: '',
    ...campos,
  };
}

/**
 * Las decisiones que tocan revisar: un año después, con el resultado delante,
 * es cuando se aprende si el motivo era bueno o era miedo.
 */
export function decisionesARevisar(decisiones = [], hoyISO = aISO(hoy())) {
  return decisiones
    .filter((d) => !d.revisada && d.revisarEn && d.revisarEn <= hoyISO)
    .sort((a, b) => String(a.revisarEn).localeCompare(String(b.revisarEn)));
}

export function resumenDecisiones(decisiones = [], hoyISO = aISO(hoy())) {
  const revisadas = decisiones.filter((d) => d.revisada);
  return {
    total: decisiones.length,
    pendientes: decisiones.length - revisadas.length,
    aRevisar: decisionesARevisar(decisiones, hoyISO).length,
    revisadas: revisadas.length,
    frase: !decisiones.length
      ? 'Todavía no has apuntado ninguna decisión descartada. Son las que más enseñan.'
      : `${decisiones.length} decisiones apuntadas, ${decisionesARevisar(decisiones, hoyISO).length} esperando revisión.`,
  };
}

/* ------------------------------------------------------------------ *
 * Horas de asesoría por estudiante
 * ------------------------------------------------------------------ */

/**
 * Reparto del tiempo dedicado a cada estudiante, a partir del registro de
 * tiempo y de las tareas etiquetadas con su nombre.
 */
export function horasPorEstudiante(tesis = [], tareas = [], registros = [], hoyISO = aISO(hoy())) {
  const porTarea = new Map(tareas.map((t) => [t.id, t]));
  const minutos = new Map();
  const sesiones = new Map();

  for (const r of registros) {
    const tarea = porTarea.get(r.tareaId);
    if (!tarea) continue;
    for (const t of tesis) {
      const nombre = (t.estudiante || '').trim();
      if (!nombre) continue;
      const mencionado = (tarea.titulo || '').includes(nombre)
        || (tarea.etiquetas || []).some((e) => e.toLowerCase() === nombre.toLowerCase());
      if (!mencionado) continue;
      minutos.set(nombre, (minutos.get(nombre) || 0) + (Number(r.minutos) || 0));
      sesiones.set(nombre, (sesiones.get(nombre) || 0) + 1);
    }
  }

  const filas = tesis.filter((t) => t.estudiante).map((t) => ({
    estudiante: t.estudiante,
    tema: t.titulo || '',
    etapa: t.etapa || '',
    minutos: minutos.get(t.estudiante) || 0,
    sesiones: sesiones.get(t.estudiante) || 0,
    horas: Math.round(((minutos.get(t.estudiante) || 0) / 60) * 10) / 10,
  })).sort((a, b) => b.minutos - a.minutos);

  const total = filas.reduce((s, f) => s + f.minutos, 0);
  const sinTiempo = filas.filter((f) => !f.minutos);
  return {
    filas,
    total,
    horas: Math.round((total / 60) * 10) / 10,
    frase: !filas.length ? 'No hay tesis dirigidas apuntadas.'
      : sinTiempo.length
        ? `${Math.round(total / 60)} h repartidas. ${sinTiempo.map((f) => f.estudiante).join(', ')} no ${sinTiempo.length === 1 ? 'tiene' : 'tienen'} tiempo medido: o no lo apuntas, o hace tiempo que no le dedicas nada.`
        : `${Math.round(total / 60)} h repartidas entre ${filas.length} estudiantes.`,
  };
}
