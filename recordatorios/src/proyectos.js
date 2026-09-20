/**
 * proyectos.js — Gestión de proyectos al estilo de MS Project.
 *
 * Lo que hace un planificador de verdad y no una lista de tareas:
 *
 *   - duraciones en DÍAS HÁBILES, con festivos propios del proyecto;
 *   - dependencias FC, CC, FF y CF con desfase (lag) positivo o negativo;
 *   - cálculo de la ruta crítica (CPM): pasada hacia adelante, pasada hacia
 *     atrás, holgura total y holgura libre;
 *   - tareas resumen (EDT) que se calculan solas a partir de sus hijas;
 *   - hitos (duración cero), restricciones de "no empezar antes de";
 *   - carga de recursos y detección de sobreasignación;
 *   - línea base y valor ganado (EV, PV, AC, SPI, CPI).
 *
 * Todo el cálculo se hace en un espacio de "índices de día hábil" (0 = primer
 * día hábil del proyecto) y solo al final se traduce a fechas del calendario.
 * Así la aritmética es entera y no hay sorpresas con fines de semana.
 */

import { aISO, deISO, diferenciaDias, esHabil, sumarDias } from './fechas.js';

export const TIPOS_DEPENDENCIA = [
  { id: 'FC', nombre: 'Fin a comienzo', descripcion: 'La siguiente empieza cuando la anterior termina. Es la normal.' },
  { id: 'CC', nombre: 'Comienzo a comienzo', descripcion: 'Empiezan a la vez (o con desfase).' },
  { id: 'FF', nombre: 'Fin a fin', descripcion: 'Terminan a la vez (o con desfase).' },
  { id: 'CF', nombre: 'Comienzo a fin', descripcion: 'Poco habitual: la siguiente no puede terminar hasta que la anterior empiece.' },
];

const CALENDARIO_POR_DEFECTO = { diasHabiles: [1, 2, 3, 4, 5], feriados: [] };

export function proyectoVacio(nombre = 'Proyecto nuevo', inicio = aISO(new Date())) {
  return {
    id: 'proy-' + Math.random().toString(36).slice(2, 8),
    nombre,
    inicio,
    calendario: { ...CALENDARIO_POR_DEFECTO },
    tareas: [],
    lineaBase: null,
    fechaEstado: null,
  };
}

export function tareaProyecto(campos = {}) {
  return {
    id: 't-' + Math.random().toString(36).slice(2, 8),
    nombre: 'Tarea',
    duracion: 1,
    padre: null,
    dependencias: [],   // { de, tipo, desfase }
    avance: 0,
    recurso: '',
    unidades: 100,      // % de dedicación del recurso
    costo: 0,
    costoReal: 0,
    noAntesDe: null,
    ...campos,
  };
}

/* ------------------------------------------------------------------ *
 * Calendario laboral
 * ------------------------------------------------------------------ */

function esLaborable(fecha, cal) {
  const dia = deISO(fecha).getDay();
  return (cal.diasHabiles || CALENDARIO_POR_DEFECTO.diasHabiles).includes(dia)
    && !(cal.feriados || []).includes(aISO(fecha));
}

/** Fecha del día hábil número `indice` contando desde el inicio del proyecto. */
export function fechaDeIndice(inicio, indice, cal = CALENDARIO_POR_DEFECTO) {
  let cursor = deISO(inicio);
  let guarda = 0;
  while (!esLaborable(cursor, cal) && guarda++ < 400) cursor = sumarDias(cursor, 1);
  let quedan = indice;
  while (quedan > 0 && guarda++ < 40000) {
    cursor = sumarDias(cursor, 1);
    if (esLaborable(cursor, cal)) quedan--;
  }
  return aISO(cursor);
}

/** Índice de día hábil de una fecha (el inverso de `fechaDeIndice`). */
export function indiceDeFecha(inicio, fecha, cal = CALENDARIO_POR_DEFECTO) {
  const objetivo = aISO(fecha);
  let cursor = deISO(inicio);
  let guarda = 0;
  while (!esLaborable(cursor, cal) && guarda++ < 400) cursor = sumarDias(cursor, 1);
  if (objetivo <= aISO(cursor)) return 0;
  let i = 0;
  while (aISO(cursor) < objetivo && guarda++ < 40000) {
    cursor = sumarDias(cursor, 1);
    if (esLaborable(cursor, cal)) i++;
  }
  return i;
}

/** Días hábiles de un tramo [desde, hasta] inclusive. */
export function diasHabiles(desde, hasta, cal = CALENDARIO_POR_DEFECTO) {
  let n = 0;
  let cursor = deISO(desde);
  const fin = aISO(hasta);
  let guarda = 0;
  while (aISO(cursor) <= fin && guarda++ < 40000) {
    if (esLaborable(cursor, cal)) n++;
    cursor = sumarDias(cursor, 1);
  }
  return n;
}

/* ------------------------------------------------------------------ *
 * Estructura: EDT y orden topológico
 * ------------------------------------------------------------------ */

/** Numeración EDT (1, 1.1, 1.2, 2…) respetando el orden de la lista. */
export function numerarEDT(tareas) {
  const numeros = new Map();
  const hijasDe = (padre) => tareas.filter((t) => (t.padre || null) === padre);
  const recorrer = (padre, prefijo) => {
    hijasDe(padre).forEach((t, i) => {
      const numero = prefijo ? `${prefijo}.${i + 1}` : String(i + 1);
      numeros.set(t.id, numero);
      recorrer(t.id, numero);
    });
  };
  recorrer(null, '');
  return numeros;
}

export function esResumen(tarea, tareas) {
  return tareas.some((t) => t.padre === tarea.id);
}

/** Orden topológico de las hojas; devuelve null si hay dependencias circulares. */
function ordenTopologico(hojas) {
  const grado = new Map(hojas.map((t) => [t.id, 0]));
  const salientes = new Map(hojas.map((t) => [t.id, []]));
  for (const t of hojas) {
    for (const d of t.dependencias || []) {
      if (!grado.has(d.de)) continue;          // dependencia colgada: se ignora aquí
      grado.set(t.id, grado.get(t.id) + 1);
      salientes.get(d.de).push(t.id);
    }
  }
  const cola = hojas.filter((t) => grado.get(t.id) === 0).map((t) => t.id);
  const orden = [];
  while (cola.length) {
    const id = cola.shift();
    orden.push(id);
    for (const sig of salientes.get(id) || []) {
      grado.set(sig, grado.get(sig) - 1);
      if (grado.get(sig) === 0) cola.push(sig);
    }
  }
  return orden.length === hojas.length ? orden : null;
}

/* ------------------------------------------------------------------ *
 * Programación (CPM)
 * ------------------------------------------------------------------ */

/**
 * Calcula el cronograma completo del proyecto.
 *
 * Devuelve `{ tareas, fin, duracion, critica, errores }` donde cada tarea trae
 * inicio/fin en fechas, holgura total y libre, y si está en la ruta crítica.
 */
export function programar(proyecto) {
  const cal = { ...CALENDARIO_POR_DEFECTO, ...(proyecto.calendario || {}) };
  const todas = proyecto.tareas || [];
  const hojas = todas.filter((t) => !esResumen(t, todas));
  const errores = validar(proyecto);
  const porId = new Map(todas.map((t) => [t.id, t]));

  const orden = ordenTopologico(hojas);
  if (!orden) {
    return { tareas: [], fin: proyecto.inicio, duracion: 0, critica: [], errores, ciclo: true };
  }

  const dur = (t) => Math.max(0, Number(t.duracion) || 0);
  const ES = new Map();
  const EF = new Map();

  // Pasada hacia adelante: lo más pronto que puede empezar y terminar cada tarea.
  for (const id of orden) {
    const t = porId.get(id);
    let inicio = 0;
    if (t.noAntesDe) inicio = Math.max(inicio, indiceDeFecha(proyecto.inicio, t.noAntesDe, cal));
    for (const d of t.dependencias || []) {
      if (!ES.has(d.de)) continue;
      const desfase = Number(d.desfase) || 0;
      const esPred = ES.get(d.de);
      const efPred = EF.get(d.de);
      switch (d.tipo || 'FC') {
        case 'CC': inicio = Math.max(inicio, esPred + desfase); break;
        case 'FF': inicio = Math.max(inicio, efPred + desfase - dur(t)); break;
        case 'CF': inicio = Math.max(inicio, esPred + desfase - dur(t)); break;
        default: inicio = Math.max(inicio, efPred + desfase); break;   // FC
      }
    }
    ES.set(id, Math.max(0, inicio));
    EF.set(id, Math.max(0, inicio) + dur(t));
  }

  const finProyecto = hojas.length ? Math.max(...hojas.map((t) => EF.get(t.id))) : 0;

  // Pasada hacia atrás: lo más tarde que puede empezar y terminar sin retrasar el final.
  const LF = new Map();
  const LS = new Map();
  for (const id of [...orden].reverse()) {
    const t = porId.get(id);
    let fin = finProyecto;
    for (const otra of hojas) {
      for (const d of otra.dependencias || []) {
        if (d.de !== id || !LS.has(otra.id)) continue;
        const desfase = Number(d.desfase) || 0;
        switch (d.tipo || 'FC') {
          case 'CC': fin = Math.min(fin, LS.get(otra.id) - desfase + dur(t)); break;
          case 'FF': fin = Math.min(fin, LF.get(otra.id) - desfase); break;
          case 'CF': fin = Math.min(fin, LF.get(otra.id) - desfase + dur(t)); break;
          default: fin = Math.min(fin, LS.get(otra.id) - desfase); break;  // FC
        }
      }
    }
    LF.set(id, fin);
    LS.set(id, fin - dur(t));
  }

  const filas = hojas.map((t) => {
    const holgura = LS.get(t.id) - ES.get(t.id);
    // Holgura libre: cuánto puede retrasarse sin mover a ninguna sucesora.
    const sucesoras = hojas.filter((o) => (o.dependencias || []).some((d) => d.de === t.id));
    const holguraLibre = sucesoras.length
      ? Math.min(...sucesoras.map((o) => ES.get(o.id) - EF.get(t.id)))
      : finProyecto - EF.get(t.id);
    return {
      ...t,
      esHito: dur(t) === 0,
      indiceInicio: ES.get(t.id),
      indiceFin: EF.get(t.id),
      inicio: fechaDeIndice(proyecto.inicio, ES.get(t.id), cal),
      // El fin es el último día trabajado, no el siguiente: una tarea de 1 día
      // empieza y acaba el mismo día.
      fin: fechaDeIndice(proyecto.inicio, Math.max(ES.get(t.id), EF.get(t.id) - 1), cal),
      holgura,
      holguraLibre: Math.max(0, holguraLibre),
      critica: holgura <= 0,
    };
  });

  // Las tareas resumen se calculan a partir de sus hijas.
  const resumenes = todas.filter((t) => esResumen(t, todas)).map((t) => {
    const descendientes = hojasDe(t.id, todas, filas);
    if (!descendientes.length) return { ...t, resumen: true, inicio: proyecto.inicio, fin: proyecto.inicio, avance: 0 };
    const iniIdx = Math.min(...descendientes.map((d) => d.indiceInicio));
    const finIdx = Math.max(...descendientes.map((d) => d.indiceFin));
    const duracionTotal = descendientes.reduce((s, d) => s + Math.max(d.duracion, 0), 0);
    const avance = duracionTotal
      ? Math.round(descendientes.reduce((s, d) => s + (d.avance || 0) * Math.max(d.duracion, 0), 0) / duracionTotal)
      : 0;
    return {
      ...t,
      resumen: true,
      duracion: finIdx - iniIdx,
      indiceInicio: iniIdx,
      indiceFin: finIdx,
      inicio: fechaDeIndice(proyecto.inicio, iniIdx, cal),
      fin: fechaDeIndice(proyecto.inicio, Math.max(iniIdx, finIdx - 1), cal),
      avance,
      critica: descendientes.some((d) => d.critica),
      holgura: Math.min(...descendientes.map((d) => d.holgura)),
      holguraLibre: 0,
    };
  });

  const edt = numerarEDT(todas);
  const ordenadas = [...filas, ...resumenes]
    .map((t) => ({ ...t, edt: edt.get(t.id) || '' }))
    .sort((a, b) => comparaEDT(a.edt, b.edt));

  return {
    tareas: ordenadas,
    inicio: proyecto.inicio,
    fin: finProyecto ? fechaDeIndice(proyecto.inicio, finProyecto - 1, cal) : proyecto.inicio,
    duracion: finProyecto,
    critica: filas.filter((t) => t.critica).map((t) => t.id),
    errores,
    ciclo: false,
  };
}

function hojasDe(padreId, todas, filas) {
  const hijos = todas.filter((t) => t.padre === padreId);
  return hijos.flatMap((h) => {
    const fila = filas.find((f) => f.id === h.id);
    return fila ? [fila] : hojasDe(h.id, todas, filas);
  });
}

function comparaEDT(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? -1;
    const y = pb[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

/* ------------------------------------------------------------------ *
 * Validación
 * ------------------------------------------------------------------ */

/** Errores que hacen que el plan no se sostenga, en lenguaje llano. */
export function validar(proyecto) {
  const errores = [];
  const tareas = proyecto.tareas || [];
  const ids = new Set(tareas.map((t) => t.id));
  const hojas = tareas.filter((t) => !esResumen(t, tareas));

  for (const t of tareas) {
    if ((Number(t.duracion) || 0) < 0) errores.push({ tarea: t.id, texto: `“${t.nombre}” tiene duración negativa.` });
    if (t.padre && !ids.has(t.padre)) errores.push({ tarea: t.id, texto: `“${t.nombre}” cuelga de una tarea que ya no existe.` });
    for (const d of t.dependencias || []) {
      if (!ids.has(d.de)) errores.push({ tarea: t.id, texto: `“${t.nombre}” depende de una tarea borrada.` });
      if (d.de === t.id) errores.push({ tarea: t.id, texto: `“${t.nombre}” depende de sí misma.` });
    }
    if (esResumen(t, tareas) && (t.dependencias || []).length) {
      errores.push({ tarea: t.id, texto: `“${t.nombre}” es una tarea resumen: mejor pon la dependencia en sus hijas.` });
    }
  }
  if (!ordenTopologico(hojas)) {
    errores.push({ tarea: null, texto: 'Hay dependencias circulares: unas tareas se esperan entre sí y el plan no se puede calcular.' });
  }
  return errores;
}

/* ------------------------------------------------------------------ *
 * Recursos
 * ------------------------------------------------------------------ */

/**
 * Carga por recurso y por día. Sobreasignado = más del 100 % en un mismo día,
 * que es la forma técnica de decir "esta persona no puede estar en dos sitios".
 */
export function cargaRecursos(plan) {
  const porRecurso = new Map();
  for (const t of plan.tareas) {
    if (t.resumen || !t.recurso) continue;
    if (!porRecurso.has(t.recurso)) porRecurso.set(t.recurso, { recurso: t.recurso, dias: new Map(), diasTotales: 0, tareas: 0 });
    const r = porRecurso.get(t.recurso);
    r.tareas++;
    for (let i = t.indiceInicio; i < Math.max(t.indiceFin, t.indiceInicio + 1); i++) {
      r.dias.set(i, (r.dias.get(i) || 0) + (Number(t.unidades) || 100));
      r.diasTotales++;
    }
  }
  return [...porRecurso.values()].map((r) => {
    const sobre = [...r.dias.entries()].filter(([, carga]) => carga > 100).map(([i]) => i).sort((a, b) => a - b);
    return {
      recurso: r.recurso,
      tareas: r.tareas,
      diasOcupados: r.dias.size,
      diasTrabajo: r.diasTotales,
      picoCarga: r.dias.size ? Math.max(...r.dias.values()) : 0,
      sobreasignado: sobre.length > 0,
      diasSobreasignados: sobre,
    };
  }).sort((a, b) => b.picoCarga - a.picoCarga);
}

/* ------------------------------------------------------------------ *
 * Seguimiento: línea base y valor ganado
 * ------------------------------------------------------------------ */

/** Congela el plan actual como línea base, para comparar después. */
export function tomarLineaBase(plan) {
  const base = {};
  for (const t of plan.tareas) base[t.id] = { inicio: t.inicio, fin: t.fin, duracion: t.duracion, costo: t.costo || 0 };
  return { tomadaEn: aISO(new Date()), tareas: base };
}

/**
 * Desviación respecto a la línea base, **en días hábiles**: que un retraso de
 * tres días caiga sobre un fin de semana no lo convierte en cinco.
 */
export function desviaciones(plan, lineaBase, calendario = CALENDARIO_POR_DEFECTO) {
  if (!lineaBase) return [];
  const cal = { ...CALENDARIO_POR_DEFECTO, ...calendario };
  const desvio = (base, actual) => {
    if (base === actual) return 0;
    const signo = actual > base ? 1 : -1;
    const [a, b] = actual > base ? [base, actual] : [actual, base];
    return signo * Math.max(0, diasHabiles(a, b, cal) - 1);
  };
  return plan.tareas
    .map((t) => {
      const b = lineaBase.tareas[t.id];
      if (!b) return { id: t.id, nombre: t.nombre, edt: t.edt, nueva: true, desvioInicio: 0, desvioFin: 0 };
      return {
        id: t.id, nombre: t.nombre, edt: t.edt,
        desvioInicio: desvio(b.inicio, t.inicio),
        desvioFin: desvio(b.fin, t.fin),
        baseInicio: b.inicio, baseFin: b.fin,
      };
    })
    .filter((d) => d.nueva || d.desvioInicio !== 0 || d.desvioFin !== 0);
}

/**
 * Valor ganado a una fecha de corte: qué se planeó gastar, qué vale lo hecho y
 * qué se gastó de verdad. SPI < 1 = vas tarde; CPI < 1 = vas caro.
 */
export function valorGanado(plan, fechaEstado) {
  const corte = fechaEstado || aISO(new Date());
  let pv = 0;
  let ev = 0;
  let ac = 0;
  let bac = 0;

  for (const t of plan.tareas) {
    if (t.resumen) continue;
    const costo = Number(t.costo) || 0;
    bac += costo;
    ac += Number(t.costoReal) || 0;
    ev += costo * ((Number(t.avance) || 0) / 100);

    // Fracción planificada: proporción del tramo de la tarea ya transcurrida.
    const total = Math.max(1, diferenciaDias(t.inicio, t.fin) + 1);
    const transcurrido = diferenciaDias(t.inicio, corte) + 1;
    const fraccion = Math.min(1, Math.max(0, transcurrido / total));
    pv += costo * fraccion;
  }

  const redondea = (n) => Math.round(n * 100) / 100;
  return {
    fecha: corte,
    bac: redondea(bac),
    pv: redondea(pv),
    ev: redondea(ev),
    ac: redondea(ac),
    spi: pv > 0 ? redondea(ev / pv) : null,
    cpi: ac > 0 ? redondea(ev / ac) : null,
    variacionCronograma: redondea(ev - pv),
    variacionCosto: redondea(ev - ac),
    estimacionFinal: ac > 0 && ev > 0 ? redondea(bac / (ev / ac)) : bac,
  };
}

/** Resumen de una línea: lo que se enseña arriba del Gantt. */
export function resumenProyecto(plan) {
  const hojas = plan.tareas.filter((t) => !t.resumen);
  const duracionTotal = hojas.reduce((s, t) => s + Math.max(t.duracion, 0), 0);
  const avance = duracionTotal
    ? Math.round(hojas.reduce((s, t) => s + (t.avance || 0) * Math.max(t.duracion, 0), 0) / duracionTotal)
    : 0;
  return {
    tareas: hojas.length,
    hitos: hojas.filter((t) => t.esHito).length,
    criticas: hojas.filter((t) => t.critica).length,
    duracion: plan.duracion,
    inicio: plan.inicio,
    fin: plan.fin,
    avance,
    costo: hojas.reduce((s, t) => s + (Number(t.costo) || 0), 0),
    sinRecurso: hojas.filter((t) => !t.recurso).length,
  };
}

/** Las tareas del plan, convertidas en recordatorios normales de la app. */
export function aTareasDeAgenda(plan, proyecto, opciones = {}) {
  const { soloCriticas = false, avisarAntes = 0 } = opciones;
  return plan.tareas
    .filter((t) => !t.resumen && (!soloCriticas || t.critica))
    .map((t) => ({
      titulo: t.esHito ? `🏁 ${t.nombre}` : t.nombre,
      fecha: avisarAntes ? aISO(sumarDias(t.inicio, -avisarAntes)) : t.inicio,
      duracion: t.esHito ? null : Math.max(1, t.duracion) * 60,
      prioridad: t.critica ? 1 : 3,
      modulo: 'proyectos',
      proyecto: proyecto.nombre,
      etiquetas: [t.critica ? 'critica' : 'holgura', ...(t.recurso ? [t.recurso] : [])],
      notas: `${t.edt ? `EDT ${t.edt} · ` : ''}${t.inicio} → ${t.fin}` +
        `${t.critica ? ' · ruta crítica' : ` · holgura de ${t.holgura} días`}` +
        `${t.recurso ? ` · ${t.recurso}` : ''}`,
    }));
}

/* ------------------------------------------------------------------ *
 * Plantillas de proyecto
 * ------------------------------------------------------------------ */

/** Proyectos de arranque, con dependencias ya puestas. */
export const PLANTILLAS_PROYECTO = [
  {
    id: 'articulo',
    nombre: 'Artículo de investigación',
    descripcion: 'De la idea al envío, con revisión de coautores.',
    tareas: [
      { nombre: 'Definir pregunta y alcance', duracion: 3 },
      { nombre: 'Revisión de literatura', duracion: 10, dep: 0 },
      { nombre: 'Diseño experimental', duracion: 5, dep: 1 },
      { nombre: 'Experimentos y datos', duracion: 20, dep: 2 },
      { nombre: 'Análisis y figuras', duracion: 8, dep: 3 },
      { nombre: 'Redacción del borrador', duracion: 12, dep: 4 },
      { nombre: 'Revisión de coautores', duracion: 7, dep: 5 },
      { nombre: 'Correcciones finales', duracion: 4, dep: 6 },
      { nombre: 'Envío a la revista', duracion: 0, dep: 7 },
    ],
  },
  {
    id: 'curso',
    nombre: 'Montar un curso nuevo',
    descripcion: 'Programa, materiales, evaluaciones y aula virtual.',
    tareas: [
      { nombre: 'Programa y objetivos', duracion: 4 },
      { nombre: 'Bibliografía y recursos', duracion: 3, dep: 0 },
      { nombre: 'Notas de clase (unidades 1-4)', duracion: 15, dep: 0 },
      { nombre: 'Problemas y talleres', duracion: 10, dep: 2 },
      { nombre: 'Banco de exámenes', duracion: 6, dep: 3 },
      { nombre: 'Montar el aula virtual', duracion: 3, dep: 2 },
      { nombre: 'Primera clase', duracion: 0, dep: 5 },
    ],
  },
  {
    id: 'inversion',
    nombre: 'Estudio de una inversión',
    descripcion: 'Due diligence completa antes de poner dinero.',
    tareas: [
      { nombre: 'Tesis preliminar en una página', duracion: 1 },
      { nombre: 'Leer últimos informes anuales', duracion: 3, dep: 0 },
      { nombre: 'Modelo financiero y valoración', duracion: 5, dep: 1 },
      { nombre: 'Comparables del sector', duracion: 2, dep: 1 },
      { nombre: 'Riesgos y qué invalidaría la tesis', duracion: 2, dep: 2 },
      { nombre: 'Plan de entrada, stop y tamaño', duracion: 1, dep: 4 },
      { nombre: 'Decisión: comprar o descartar', duracion: 0, dep: 5 },
    ],
  },
];

/** Convierte una plantilla en un proyecto real con dependencias FC. */
export function desdePlantilla(plantilla, inicio) {
  const proyecto = proyectoVacio(plantilla.nombre, inicio);
  const ids = [];
  proyecto.tareas = plantilla.tareas.map((t, i) => {
    const tarea = tareaProyecto({ nombre: t.nombre, duracion: t.duracion });
    ids[i] = tarea.id;
    return tarea;
  });
  plantilla.tareas.forEach((t, i) => {
    if (t.dep != null) proyecto.tareas[i].dependencias = [{ de: ids[t.dep], tipo: 'FC', desfase: 0 }];
  });
  return proyecto;
}
