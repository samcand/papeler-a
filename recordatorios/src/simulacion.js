/**
 * simulacion.js — Fecha probabilística y "¿qué pasa si?".
 *
 * Dos cosas que un cronograma normal no dice:
 *
 *   1. **Cuándo terminas de verdad.** Una fecha exacta es una mentira cómoda.
 *      Con tres duraciones por tarea (optimista, probable y pesimista) y unos
 *      miles de simulaciones sale una distribución: el P50 es la fecha que
 *      cumples la mitad de las veces, el P80 la que puedes prometer.
 *   2. **Qué se rompe si mueves algo**, calculado sobre una copia del plan
 *      antes de tocar el plan de verdad.
 *
 * La duración pesimista, si no la escribes, sale de tu propio factor de
 * calibración medido: tú ya sabes cuánto te pasas, y la simulación lo usa.
 */

import { aISO, deISO, diferenciaDias, sumarDias } from './fechas.js';
import { cambiarDuracion, diasHabiles, esResumen, fechaDeIndice, moverTarea, programar } from './proyectos.js';

/* ------------------------------------------------------------------ *
 * Azar reproducible
 * ------------------------------------------------------------------ */

/** Generador con semilla: la misma semilla da siempre la misma simulación. */
export function generador(semilla = 1) {
  let a = semilla >>> 0;
  return function siguiente() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Muestra de una distribución triangular entre optimista y pesimista. */
export function triangular(u, o, m, p) {
  if (p <= o) return m;
  const corte = (m - o) / (p - o);
  return u < corte
    ? o + Math.sqrt(u * (p - o) * (m - o))
    : p - Math.sqrt((1 - u) * (p - o) * (p - m));
}

/** Estimación PERT clásica: media ponderada y desviación. */
export function pert(o, m, p) {
  const te = (o + 4 * m + p) / 6;
  const sigma = (p - o) / 6;
  return { te: redondea(te), sigma: redondea(sigma), varianza: redondea(sigma * sigma) };
}

/* ------------------------------------------------------------------ *
 * Las tres duraciones de cada tarea
 * ------------------------------------------------------------------ */

/**
 * Optimista, probable y pesimista de cada tarea. Si no las has escrito:
 * optimista = 85 % de lo previsto y pesimista = lo previsto por tu factor
 * (o 1,5 si todavía no hay datos tuyos).
 */
export function trioDuraciones(tarea, factor = 1.5) {
  const m = Math.max(0, Number(tarea.duracion) || 0);
  const o = Number.isFinite(tarea.optimista) && tarea.optimista > 0 ? Number(tarea.optimista) : Math.max(0, Math.round(m * 0.85 * 10) / 10);
  const p = Number.isFinite(tarea.pesimista) && tarea.pesimista > 0 ? Number(tarea.pesimista) : Math.max(m, Math.round(m * factor * 10) / 10);
  return { o: Math.min(o, m), m, p: Math.max(p, m) };
}

/* ------------------------------------------------------------------ *
 * Red del proyecto, preparada una sola vez
 * ------------------------------------------------------------------ */

function prepararRed(proyecto) {
  const todas = proyecto.tareas || [];
  const hojas = todas.filter((t) => !esResumen(t, todas));
  const indice = new Map(hojas.map((t, i) => [t.id, i]));

  // Orden topológico; si hay ciclo, no se puede simular.
  const grado = hojas.map((t) => (t.dependencias || []).filter((d) => indice.has(d.de)).length);
  const salientes = hojas.map(() => []);
  hojas.forEach((t, i) => {
    for (const d of t.dependencias || []) {
      const j = indice.get(d.de);
      if (j != null) salientes[j].push(i);
    }
  });
  const cola = [];
  grado.forEach((g, i) => { if (g === 0) cola.push(i); });
  const orden = [];
  while (cola.length) {
    const i = cola.shift();
    orden.push(i);
    for (const j of salientes[i]) if (--grado[j] === 0) cola.push(j);
  }
  if (orden.length !== hojas.length) return null;

  return { hojas, indice, orden };
}

/** Pasada hacia adelante con unas duraciones dadas; devuelve el fin del proyecto. */
function finDelProyecto(red, duraciones, restricciones) {
  const ES = new Array(red.hojas.length).fill(0);
  const EF = new Array(red.hojas.length).fill(0);
  let fin = 0;
  for (const i of red.orden) {
    const t = red.hojas[i];
    let inicio = restricciones[i] || 0;
    for (const d of t.dependencias || []) {
      const j = red.indice.get(d.de);
      if (j == null) continue;
      const desfase = Number(d.desfase) || 0;
      switch (d.tipo || 'FC') {
        case 'CC': inicio = Math.max(inicio, ES[j] + desfase); break;
        case 'FF': inicio = Math.max(inicio, EF[j] + desfase - duraciones[i]); break;
        case 'CF': inicio = Math.max(inicio, ES[j] + desfase - duraciones[i]); break;
        default: inicio = Math.max(inicio, EF[j] + desfase); break;
      }
    }
    ES[i] = Math.max(0, inicio);
    EF[i] = ES[i] + duraciones[i];
    if (EF[i] > fin) fin = EF[i];
  }
  return fin;
}

/* ------------------------------------------------------------------ *
 * Simulación
 * ------------------------------------------------------------------ */

/**
 * Simula el proyecto muchas veces y devuelve la distribución de fechas de fin,
 * con los percentiles que sirven para prometer una fecha.
 */
export function simularProyecto(proyecto, opciones = {}) {
  const { n = 2000, semilla = 1, factor = 1.5 } = opciones;
  const red = prepararRed(proyecto);
  if (!red || !red.hojas.length) return { posible: false, motivo: red ? 'El proyecto no tiene tareas.' : 'Hay dependencias circulares.' };

  const cal = proyecto.calendario;
  const trios = red.hojas.map((t) => trioDuraciones(t, factor));
  const restricciones = red.hojas.map((t) => (t.noAntesDe ? Math.max(0, diasHabiles(proyecto.inicio, t.noAntesDe, cal) - 1) : 0));
  const azar = generador(semilla);
  const duraciones = new Array(red.hojas.length);
  const finales = new Array(n);

  for (let r = 0; r < n; r++) {
    for (let i = 0; i < trios.length; i++) {
      const { o, m, p } = trios[i];
      duraciones[i] = m === 0 ? 0 : triangular(azar(), o, m, p);
    }
    finales[r] = finDelProyecto(red, duraciones, restricciones);
  }
  finales.sort((a, b) => a - b);

  const aFecha = (indice) => fechaDeIndice(proyecto.inicio, Math.max(0, Math.ceil(indice) - 1), cal);
  const percentil = (q) => finales[Math.min(finales.length - 1, Math.floor(q * finales.length))];
  const plan = programar(proyecto);

  const p50 = percentil(0.5);
  const p80 = percentil(0.8);
  return {
    posible: true,
    simulaciones: n,
    deterministico: { dias: plan.duracion, fecha: plan.fin },
    dias: {
      p10: redondea(percentil(0.1)), p50: redondea(p50), p80: redondea(p80),
      p90: redondea(percentil(0.9)), media: redondea(finales.reduce((s, x) => s + x, 0) / n),
      min: redondea(finales[0]), max: redondea(finales[n - 1]),
    },
    fechas: {
      p10: aFecha(percentil(0.1)), p50: aFecha(p50), p80: aFecha(p80), p90: aFecha(percentil(0.9)),
    },
    colchon: Math.max(0, Math.ceil(p80 - plan.duracion)),
    histograma: histograma(finales, 12, aFecha),
    finales,
    aFecha,
  };
}

/** Probabilidad de terminar el día indicado o antes. */
export function probabilidadDeLlegar(sim, fechaObjetivo, proyecto) {
  if (!sim?.posible || !fechaObjetivo) return null;
  const limite = diasHabiles(proyecto.inicio, fechaObjetivo, proyecto.calendario);
  const cuantos = sim.finales.filter((x) => Math.ceil(x) <= limite).length;
  const pct = Math.round((cuantos / sim.finales.length) * 100);
  return {
    fecha: fechaObjetivo,
    probabilidad: pct,
    frase: pct >= 80 ? `Llegas al ${fechaObjetivo} en el ${pct} % de los escenarios: es una fecha que puedes prometer.`
      : pct >= 50 ? `Solo llegas en el ${pct} % de los escenarios. Es una fecha optimista, no un compromiso.`
        : `Llegas en el ${pct} % de los escenarios. Prometer esa fecha es prometer un retraso.`,
  };
}

function histograma(valores, cubos, aFecha) {
  const min = Math.floor(valores[0]);
  const max = Math.ceil(valores[valores.length - 1]);
  const ancho = Math.max(1, (max - min) / cubos);
  const out = [];
  for (let i = 0; i < cubos; i++) {
    const desde = min + i * ancho;
    const hasta = desde + ancho;
    const n = valores.filter((v) => v >= desde && (i === cubos - 1 ? v <= hasta : v < hasta)).length;
    out.push({ desde: redondea(desde), hasta: redondea(hasta), fecha: aFecha(hasta), n });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * ¿Qué pasa si…?
 * ------------------------------------------------------------------ */

/**
 * Aplica unos cambios sobre una **copia** del proyecto y cuenta qué se movería:
 * qué tareas, cuántos días, qué hitos, cuánto se retrasa el final y si la ruta
 * crítica cambia de sitio. No toca el plan real.
 */
export function queSiPasa(proyecto, cambios = []) {
  const copia = typeof structuredClone === 'function' ? structuredClone(proyecto) : JSON.parse(JSON.stringify(proyecto));
  const antes = programar(proyecto);
  if (antes.ciclo) return { posible: false, motivo: 'El plan tiene dependencias circulares.' };

  for (const c of cambios) {
    if (Number.isFinite(c.duracion)) cambiarDuracion(copia, c.tareaId, c.duracion);
    if (c.dias) moverTarea(copia, c.tareaId, c.dias, programar(copia));
  }
  const despues = programar(copia);
  return {
    ...compararPlanes(antes, despues, proyecto.calendario, cambios.map((c) => c.tareaId)),
    plan: despues,
    proyectoSimulado: copia,
  };
}

/**
 * Diferencias entre dos versiones del mismo plan: qué se movió, cuántos días,
 * qué hitos y si la ruta crítica cambió de sitio.
 */
export function compararPlanes(antes, despues, calendario, directas = []) {
  const distancia = (a, b) => (a === b ? 0
    : signo(a, b) * Math.max(0, diasHabiles(a < b ? a : b, a < b ? b : a, calendario) - 1));

  const movidas = [];
  for (const t of despues.tareas) {
    const previa = antes.tareas.find((x) => x.id === t.id);
    if (!previa || t.resumen) continue;
    const dias = distancia(previa.inicio, t.inicio);
    if (!dias && previa.fin === t.fin) continue;
    movidas.push({
      id: t.id, nombre: t.nombre, esHito: t.esHito, critica: t.critica,
      antesInicio: previa.inicio, ahoraInicio: t.inicio,
      antesFin: previa.fin, ahoraFin: t.fin,
      dias,
      directa: directas.includes(t.id),
    });
  }

  const criticasAntes = new Set(antes.critica);
  const criticasDespues = new Set(despues.critica);
  return {
    posible: true,
    finAntes: antes.fin,
    finDespues: despues.fin,
    diasProyecto: distancia(antes.fin, despues.fin),
    movidas: movidas.sort((a, b) => Math.abs(b.dias) - Math.abs(a.dias)),
    hitos: movidas.filter((m) => m.esHito),
    arrastradas: movidas.filter((m) => !m.directa).length,
    nuevasCriticas: [...criticasDespues].filter((id) => !criticasAntes.has(id))
      .map((id) => despues.tareas.find((t) => t.id === id)?.nombre).filter(Boolean),
    yaNoCriticas: [...criticasAntes].filter((id) => !criticasDespues.has(id))
      .map((id) => antes.tareas.find((t) => t.id === id)?.nombre).filter(Boolean),
  };
}

/**
 * "Me voy dos semanas": qué pasa si un recurso no está disponible entre dos
 * fechas. Las tareas suyas que caen dentro se empujan hasta después de la
 * vuelta y el resto del plan se recalcula.
 */
export function simularAusencia(proyecto, { recurso, desde, hasta } = {}) {
  if (!recurso || !desde || !hasta) return { posible: false, motivo: 'Falta el recurso o las fechas.' };
  const antes = programar(proyecto);
  if (antes.ciclo) return { posible: false, motivo: 'El plan tiene dependencias circulares.' };

  const copia = typeof structuredClone === 'function' ? structuredClone(proyecto) : JSON.parse(JSON.stringify(proyecto));
  const vuelta = aISO(sumarDias(hasta, 1));
  const afectadas = antes.tareas.filter((t) => !t.resumen && t.recurso === recurso
    && t.fin >= desde && t.inicio <= hasta);

  for (const t of afectadas) {
    const tarea = copia.tareas.find((x) => x.id === t.id);
    if (tarea) tarea.noAntesDe = vuelta;
  }
  const despues = programar(copia);

  const comparacion = compararPlanes(antes, despues, proyecto.calendario, afectadas.map((t) => t.id));
  return {
    ...comparacion,
    recurso,
    desde,
    hasta,
    diasFuera: diferenciaDias(desde, hasta) + 1,
    afectadas: afectadas.map((t) => ({ id: t.id, nombre: t.nombre, inicio: t.inicio, fin: t.fin })),
    plan: despues,
    proyectoSimulado: copia,
    frase: !afectadas.length
      ? `${recurso} no tiene nada planificado entre el ${desde} y el ${hasta}: puede irse tranquilo.`
      : comparacion.diasProyecto > 0
        ? `${afectadas.length} tarea${afectadas.length === 1 ? '' : 's'} de ${recurso} se van al otro lado de la ausencia y el proyecto termina ${comparacion.diasProyecto} días más tarde.`
        : `${afectadas.length} tarea${afectadas.length === 1 ? '' : 's'} se mueven, pero la holgura absorbe la ausencia: la fecha final no cambia.`,
  };
}

/** Frase de cabecera para el resultado de una simulación. */
export function resumenQueSiPasa(r) {
  if (!r?.posible) return r?.motivo || '';
  if (!r.movidas.length) return 'No se mueve nada: el plan absorbe el cambio.';
  const cola = r.arrastradas ? ` y arrastra ${r.arrastradas} tarea${r.arrastradas === 1 ? '' : 's'} más` : '';
  if (r.diasProyecto > 0) return `El proyecto termina ${r.diasProyecto} día${r.diasProyecto === 1 ? '' : 's'} más tarde${cola}.`;
  if (r.diasProyecto < 0) return `El proyecto termina ${Math.abs(r.diasProyecto)} días antes${cola}.`;
  return `La fecha final no cambia${cola}: el cambio se come la holgura.`;
}

function signo(a, b) {
  return b > a ? 1 : b < a ? -1 : 0;
}

function redondea(n, d = 1) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
