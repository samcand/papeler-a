/**
 * cartera.js — Todos los proyectos a la vez.
 *
 * La pantalla de proyectos enseña un plan cada vez, y mirándolos de uno en uno
 * todos parecen ir bien. Los choques aparecen al ponerlos juntos: eres el mismo
 * recurso en los tres, y las tres semanas cargadas caen en la misma semana.
 *
 * Aquí no se recalcula nada nuevo: se llama a `programar` de cada plan y se
 * cruzan los resultados. Lo que aporta es el cruce, que es justo lo que no se
 * puede ver desde dentro de un proyecto.
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';
import { cargaRecursos, desviaciones, margenHitos, problemasDePlan, programar, resumenProyecto } from './proyectos.js';

/** Una fila por proyecto, con lo que se mira de un vistazo. */
export function filasCartera(planes = [], hoyISO = aISO(hoy())) {
  return planes.map((proyecto) => {
    const plan = programar(proyecto);
    const r = resumenProyecto(plan);
    const problemas = problemasDePlan(plan, proyecto);
    const hitos = margenHitos(plan).filter((h) => h.fecha >= hoyISO);
    const desvio = proyecto.lineaBase
      ? desviaciones(plan, proyecto.lineaBase, proyecto.calendario).filter((d) => !d.nueva && d.desvioFin > 0)
      : [];
    const retrasadas = plan.tareas.filter((t) => !t.resumen && t.fin < hoyISO && (t.avance || 0) < 100);

    const tarde = !!proyecto.fechaObjetivo && plan.fin > proyecto.fechaObjetivo;
    const nivel = tarde || problemas.some((p) => p.gravedad === 'alto') ? 'mal'
      : (retrasadas.length || desvio.length ? 'ojo' : 'bien');

    return {
      proyecto,
      plan,
      resumen: r,
      nivel,
      tarde,
      diasTarde: tarde ? Math.max(0, diferenciaDias(proyecto.fechaObjetivo, plan.fin)) : 0,
      proximoHito: hitos[0] || null,
      retrasadas: retrasadas.length,
      desviadas: desvio.length,
      problemas: problemas.filter((p) => p.gravedad === 'alto').length,
    };
  }).sort((a, b) => ({ mal: 0, ojo: 1, bien: 2 })[a.nivel] - ({ mal: 0, ojo: 1, bien: 2 })[b.nivel]
    || String(a.plan.fin).localeCompare(String(b.plan.fin)));
}

/**
 * El mismo recurso ocupado en dos proyectos el mismo día. Dentro de un plan ya
 * se detectaba; entre planes, no lo veía nadie.
 */
export function conflictosEntrePlanes(planes = [], hoyISO = aISO(hoy())) {
  const ocupacion = new Map();   // recurso -> fecha -> [{ proyecto, tarea }]

  for (const proyecto of planes) {
    const plan = programar(proyecto);
    for (const t of plan.tareas) {
      if (t.resumen || t.esHito || !t.recurso) continue;
      if (!ocupacion.has(t.recurso)) ocupacion.set(t.recurso, new Map());
      const dias = ocupacion.get(t.recurso);
      // Se usan fechas, no índices: cada plan tiene su propio día cero.
      for (let f = t.inicio; f <= t.fin; f = aISO(new Date(new Date(`${f}T12:00:00`).getTime() + 86400000))) {
        if (!dias.has(f)) dias.set(f, []);
        dias.get(f).push({ proyecto: proyecto.nombre, tarea: t.nombre });
      }
    }
  }

  const salida = [];
  for (const [recurso, dias] of ocupacion) {
    for (const [fecha, trabajos] of dias) {
      const proyectos = [...new Set(trabajos.map((x) => x.proyecto))];
      if (proyectos.length < 2) continue;
      salida.push({ recurso, fecha, proyectos, trabajos, pasado: fecha < hoyISO });
    }
  }

  // Se agrupan los días seguidos del mismo choque: una racha, no veinte líneas.
  salida.sort((a, b) => a.recurso.localeCompare(b.recurso) || a.fecha.localeCompare(b.fecha));
  const rachas = [];
  for (const c of salida) {
    const ultima = rachas[rachas.length - 1];
    const seguido = ultima && ultima.recurso === c.recurso
      && ultima.proyectos.join('|') === c.proyectos.join('|')
      && diferenciaDias(ultima.hasta, c.fecha) === 1;
    if (seguido) {
      ultima.hasta = c.fecha;
      ultima.dias++;
    } else {
      rachas.push({ recurso: c.recurso, desde: c.fecha, hasta: c.fecha, dias: 1, proyectos: c.proyectos, trabajos: c.trabajos, pasado: c.pasado });
    }
  }
  return rachas
    .map((r) => ({
      ...r,
      texto: `${r.recurso} está en ${r.proyectos.join(' y ')} a la vez`
        + (r.dias === 1 ? ` el ${r.desde}.` : ` del ${r.desde} al ${r.hasta} (${r.dias} días).`),
    }))
    .sort((a, b) => (a.pasado - b.pasado) || b.dias - a.dias || a.desde.localeCompare(b.desde));
}

/** Cuánto trabajo tiene cada recurso sumando todos los proyectos. */
export function cargaTotal(planes = []) {
  const total = new Map();
  for (const proyecto of planes) {
    for (const r of cargaRecursos(programar(proyecto))) {
      if (!total.has(r.recurso)) total.set(r.recurso, { recurso: r.recurso, dias: 0, tareas: 0, proyectos: [] });
      const x = total.get(r.recurso);
      x.dias += r.diasTrabajo;
      x.tareas += r.tareas;
      x.proyectos.push(proyecto.nombre);
    }
  }
  return [...total.values()].sort((a, b) => b.dias - a.dias);
}

export function resumenCartera(planes = [], hoyISO = aISO(hoy())) {
  const filas = filasCartera(planes, hoyISO);
  const conflictos = conflictosEntrePlanes(planes, hoyISO).filter((c) => !c.pasado);
  const mal = filas.filter((f) => f.nivel === 'mal');
  const hitos = filas.map((f) => f.proximoHito && { ...f.proximoHito, proyecto: f.proyecto.nombre })
    .filter(Boolean)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    filas,
    conflictos,
    cargas: cargaTotal(planes),
    proximosHitos: hitos.slice(0, 5),
    total: planes.length,
    enRiesgo: mal.length,
    frase: !planes.length ? 'Todavía no hay proyectos con plan.'
      : mal.length ? `${mal.length} de ${planes.length} proyectos no llegan a su fecha.`
        : conflictos.length ? `Los ${planes.length} planes llegan, pero hay ${conflictos.length} choque(s) de agenda entre ellos.`
          : `Los ${planes.length} proyectos van en fecha.`,
  };
}
