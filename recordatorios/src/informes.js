/**
 * informes.js — Informes a medida sin exportar a una hoja de cálculo.
 *
 * Tres decisiones: **qué** medir, **cómo** agruparlo y **cuándo**. Con eso
 * salen casi todas las preguntas que uno se hace de verdad: cuántas tareas
 * cierro por módulo al mes, cuántas horas por proyecto esta semana, cuántas se
 * me pasan de fecha por curso.
 */

import { aISO, diferenciaDias, hoy, inicioSemana, sumarDias } from './fechas.js';
import { MODULOS } from './modelo.js';

export const METRICAS = [
  { id: 'completadas', nombre: 'Tareas completadas', unidad: 'tareas' },
  { id: 'creadas', nombre: 'Tareas creadas', unidad: 'tareas' },
  { id: 'minutos', nombre: 'Tiempo medido', unidad: 'minutos' },
  { id: 'estimado', nombre: 'Tiempo estimado', unidad: 'minutos' },
  { id: 'vencidas', nombre: 'Tareas que se pasaron de fecha', unidad: 'tareas' },
];

export const AGRUPACIONES = [
  { id: 'modulo', nombre: 'Por módulo' },
  { id: 'proyecto', nombre: 'Por proyecto' },
  { id: 'etiqueta', nombre: 'Por etiqueta' },
  { id: 'prioridad', nombre: 'Por prioridad' },
  { id: 'semana', nombre: 'Por semana' },
  { id: 'mes', nombre: 'Por mes' },
];

export const PERIODOS = [
  { id: 7, nombre: 'Última semana' },
  { id: 30, nombre: 'Último mes' },
  { id: 90, nombre: 'Último trimestre' },
  { id: 365, nombre: 'Último año' },
];

const nombreModulo = (id) => MODULOS.find((m) => m.id === id)?.nombre || 'Sin módulo';

/** Calcula un informe. Devuelve filas listas para pintar y un total. */
export function informe(estado = {}, { metrica = 'completadas', agrupacion = 'modulo', dias = 30, hoyISO = aISO(hoy()) } = {}) {
  const desde = aISO(sumarDias(hoyISO, -dias + 1));
  const tareas = estado.tareas || [];
  const porId = new Map(tareas.map((t) => [t.id, t]));

  // Cada métrica es una lista de { clave, valor, fecha } que después se agrupa.
  let puntos = [];
  if (metrica === 'completadas') {
    puntos = (estado.historial || [])
      .filter((h) => h.fecha >= desde && h.fecha <= hoyISO)
      .map((h) => ({ tarea: porId.get(h.tareaId) || h, valor: 1, fecha: h.fecha }));
  } else if (metrica === 'creadas') {
    puntos = tareas
      .filter((t) => String(t.creadaEn).slice(0, 10) >= desde && String(t.creadaEn).slice(0, 10) <= hoyISO)
      .map((t) => ({ tarea: t, valor: 1, fecha: String(t.creadaEn).slice(0, 10) }));
  } else if (metrica === 'minutos') {
    puntos = (estado.tiempo || [])
      .filter((r) => r.fecha >= desde && r.fecha <= hoyISO)
      .map((r) => ({ tarea: porId.get(r.tareaId) || {}, valor: Number(r.minutos) || 0, fecha: r.fecha }));
  } else if (metrica === 'estimado') {
    puntos = tareas
      .filter((t) => t.fecha && t.fecha >= desde && t.fecha <= hoyISO && t.duracion)
      .map((t) => ({ tarea: t, valor: Number(t.duracion), fecha: t.fecha }));
  } else if (metrica === 'vencidas') {
    puntos = tareas
      .filter((t) => t.completada && t.completadaEn && t.fecha
        && String(t.completadaEn).slice(0, 10) > t.fecha
        && t.fecha >= desde && t.fecha <= hoyISO)
      .map((t) => ({ tarea: t, valor: 1, fecha: t.fecha }));
  }

  const claveDe = (p) => {
    switch (agrupacion) {
      case 'modulo': return nombreModulo(p.tarea?.modulo);
      case 'proyecto': return p.tarea?.proyecto || 'Sin proyecto';
      case 'etiqueta': return (p.tarea?.etiquetas || [])[0] || 'Sin etiqueta';
      case 'prioridad': return `P${p.tarea?.prioridad || 4}`;
      case 'semana': return aISO(inicioSemana(p.fecha));
      case 'mes': return String(p.fecha).slice(0, 7);
      default: return 'Todo';
    }
  };

  const mapa = new Map();
  for (const p of puntos) {
    const clave = claveDe(p);
    mapa.set(clave, (mapa.get(clave) || 0) + p.valor);
  }

  const total = [...mapa.values()].reduce((s, v) => s + v, 0);
  const cronologico = agrupacion === 'semana' || agrupacion === 'mes';
  const filas = [...mapa.entries()]
    .map(([clave, valor]) => ({ clave, valor, pct: total ? Math.round((valor / total) * 100) : 0 }))
    .sort((a, b) => (cronologico ? a.clave.localeCompare(b.clave) : b.valor - a.valor));

  const meta = METRICAS.find((m) => m.id === metrica);
  return {
    metrica, agrupacion, dias, desde, hasta: hoyISO,
    unidad: meta?.unidad || '',
    nombre: `${meta?.nombre || metrica} · ${AGRUPACIONES.find((a) => a.id === agrupacion)?.nombre.toLowerCase() || ''}`,
    filas,
    total,
    vacio: !filas.length,
  };
}

/** El informe en CSV, para quien quiera seguir en una hoja de cálculo. */
export function informeCSV(resultado) {
  const filas = [['Grupo', resultado.unidad, '%']];
  for (const f of resultado.filas) filas.push([f.clave, f.valor, f.pct]);
  return filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

/** Informes que ya vienen pensados, porque la hoja en blanco no ayuda. */
export const INFORMES_GUARDADOS = [
  { nombre: 'Qué cierro cada semana', metrica: 'completadas', agrupacion: 'semana', dias: 90 },
  { nombre: 'A qué módulo le doy mis horas', metrica: 'minutos', agrupacion: 'modulo', dias: 30 },
  { nombre: 'Qué proyecto se come el tiempo', metrica: 'minutos', agrupacion: 'proyecto', dias: 90 },
  { nombre: 'Dónde se me pasan las fechas', metrica: 'vencidas', agrupacion: 'proyecto', dias: 90 },
  { nombre: 'Cuánto entra frente a lo que cierro', metrica: 'creadas', agrupacion: 'mes', dias: 365 },
];
