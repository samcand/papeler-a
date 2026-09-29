/**
 * dependencias.js — Tareas que esperan a otras.
 *
 * Los planes con Gantt ya tenían dependencias; las tareas del día a día, no. Y
 * la mitad de lo que uno pospone no es pereza: es que todavía no se puede
 * hacer, porque falta lo de antes. Una lista que enseña esas tareas como si
 * fueran posibles es una lista en la que se deja de confiar.
 *
 * `tarea.dependeDe` es una lista de ids. Se guarda en la tarea que espera, que
 * es donde uno lo piensa ("esto va después de aquello"), y de ahí se deduce lo
 * demás.
 */

import { aISO, hoy } from './fechas.js';

/** Las tareas de las que esta depende y que siguen sin hacerse. */
export function bloqueantes(tarea, tareas = []) {
  const porId = new Map(tareas.map((t) => [t.id, t]));
  return (tarea.dependeDe || [])
    .map((id) => porId.get(id))
    .filter((t) => t && !t.completada);
}

export function estaBloqueada(tarea, tareas = []) {
  return bloqueantes(tarea, tareas).length > 0;
}

/** Lo que espera por esta tarea. */
export function bloqueaA(tarea, tareas = []) {
  return tareas.filter((t) => (t.dependeDe || []).includes(tarea.id));
}

/**
 * Una dependencia nueva no puede cerrar un círculo: si A espera a B, B no puede
 * esperar a A. Se comprueba antes de guardarla, no después.
 */
export function haríaCiclo(tareaId, nuevaDependencia, tareas = []) {
  if (tareaId === nuevaDependencia) return true;
  const porId = new Map(tareas.map((t) => [t.id, t]));
  const vistos = new Set();
  const pila = [nuevaDependencia];
  while (pila.length) {
    const actual = pila.pop();
    if (actual === tareaId) return true;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    for (const id of porId.get(actual)?.dependeDe || []) pila.push(id);
  }
  return false;
}

/**
 * Lo que se puede hacer ya: ni completado, ni esperando a nadie. Es la lista
 * que de verdad se mira por la mañana.
 */
export function disponibles(tareas = [], hoyISO = aISO(hoy())) {
  return tareas.filter((t) => !t.completada && !t.archivada && !estaBloqueada(t, tareas));
}

export function bloqueadas(tareas = []) {
  return tareas.filter((t) => !t.completada && !t.archivada && estaBloqueada(t, tareas));
}

/**
 * Lo que se desbloqueó hoy al cerrar algo: el momento exacto en que una tarea
 * pasa de imposible a posible, y nadie te lo dice si no lo dice la app.
 */
export function desbloqueadasHoy(tareas = [], hoyISO = aISO(hoy())) {
  const cerradasHoy = new Set(tareas
    .filter((t) => t.completada && String(t.completadaEn || '').slice(0, 10) === hoyISO)
    .map((t) => t.id));
  if (!cerradasHoy.size) return [];

  return tareas.filter((t) => {
    if (t.completada || t.archivada) return false;
    const deps = t.dependeDe || [];
    if (!deps.length) return false;
    if (estaBloqueada(t, tareas)) return false;
    return deps.some((id) => cerradasHoy.has(id));
  });
}

/**
 * La cadena de una tarea hacia atrás: por qué no se puede hacer todavía y qué
 * habría que hacer primero, en orden.
 */
export function cadena(tarea, tareas = [], profundidad = 6) {
  const porId = new Map(tareas.map((t) => [t.id, t]));
  const salida = [];
  const vistos = new Set([tarea.id]);
  let nivel = (tarea.dependeDe || []).map((id) => porId.get(id)).filter(Boolean);

  for (let i = 0; i < profundidad && nivel.length; i++) {
    for (const t of nivel) {
      if (vistos.has(t.id)) continue;
      vistos.add(t.id);
      salida.push({ tarea: t, nivel: i + 1, pendiente: !t.completada });
    }
    nivel = nivel.flatMap((t) => (t.dependeDe || []).map((id) => porId.get(id)).filter(Boolean));
  }
  return salida;
}

/** Lo primero que hay que hacer para desatascar una tarea. */
export function primerPaso(tarea, tareas = []) {
  const pendientes = cadena(tarea, tareas).filter((x) => x.pendiente);
  if (!pendientes.length) return null;
  return pendientes.sort((a, b) => b.nivel - a.nivel)[0].tarea;
}

export function resumenDependencias(tareas = [], hoyISO = aISO(hoy())) {
  const paradas = bloqueadas(tareas);
  const libres = desbloqueadasHoy(tareas, hoyISO);
  // Esperar a algo que a su vez espera a otra cosa es el atasco de verdad.
  const enCascada = paradas.filter((t) => bloqueantes(t, tareas).some((b) => estaBloqueada(b, tareas)));
  return {
    bloqueadas: paradas.length,
    desbloqueadasHoy: libres,
    enCascada: enCascada.length,
    frase: !paradas.length ? 'Nada está esperando a otra cosa.'
      : `${paradas.length} tarea${paradas.length === 1 ? '' : 's'} esperando a otras`
        + `${enCascada.length ? `, ${enCascada.length} con más de un paso por delante` : ''}.`,
  };
}
