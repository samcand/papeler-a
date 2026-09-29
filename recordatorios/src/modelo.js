/**
 * modelo.js — La tarea y sus operaciones. Sin dependencias ni clases mágicas:
 * objetos planos que se pueden serializar, exportar y leer a ojo.
 */

import { aISO, deISO, diferenciaDias, hoy, inicioSemana, sumarDias, textoRelativo } from './fechas.js';
import { avanzarTarea, textoRegla } from './recurrencia.js';

export const PRIORIDADES = [
  { valor: 1, nombre: 'Urgente', color: '#ff5a5f', corto: 'P1' },
  { valor: 2, nombre: 'Alta', color: '#ff9f43', corto: 'P2' },
  { valor: 3, nombre: 'Media', color: '#4a9eff', corto: 'P3' },
  { valor: 4, nombre: 'Normal', color: '#8b93a7', corto: 'P4' },
];

export const MODULOS = [
  { id: 'inversiones', nombre: 'Inversiones', icono: '📈', color: '#35c48b' },
  { id: 'docencia', nombre: 'Docencia', icono: '🎓', color: '#4a9eff' },
  { id: 'investigacion', nombre: 'Investigación', icono: '🔬', color: '#a78bfa' },
  { id: 'alabanza', nombre: 'Alabanza', icono: '🎵', color: '#ff9f43' },
  { id: 'proyectos', nombre: 'Proyectos', icono: '📐', color: '#f472b6' },
  { id: 'personal', nombre: 'Personal', icono: '🏠', color: '#8b93a7' },
];

export function uid(prefijo = 't') {
  return `${prefijo}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function crearTarea(campos = {}) {
  return {
    id: uid(),
    titulo: '',
    notas: '',
    proyecto: null,
    seccion: null,
    padre: null,
    modulo: null,
    prioridad: 4,
    etiquetas: [],
    fecha: null,          // cuándo piensas hacerla
    limite: null,         // cuándo vence de verdad; no es lo mismo
    hora: null,
    dependeDe: [],        // ids de tareas que tienen que estar hechas antes
    duracion: null,
    regla: null,
    recordatorios: [],   // minutos antes de la hora
    subtareasTexto: [],  // lista de chequeo interna { texto, hecho }
    completada: false,
    completadaEn: null,
    creadaEn: new Date().toISOString(),
    orden: Date.now(),
    ...campos,
  };
}

/** Texto de apoyo bajo el título: fecha, repetición, duración. */
export function descripcionCorta(tarea, ref = hoy()) {
  const partes = [];
  if (tarea.fecha) partes.push(textoRelativo(tarea.fecha, ref) + (tarea.hora ? ` ${tarea.hora}` : ''));
  if (tarea.regla) partes.push('🔁 ' + textoRegla(tarea.regla));
  if (tarea.duracion) partes.push(`${tarea.duracion} min`);
  return partes.join(' · ');
}

export function estaVencida(tarea, hoyISO = aISO(hoy())) {
  return !tarea.completada && !!tarea.fecha && tarea.fecha < hoyISO;
}

export function esDeHoy(tarea, hoyISO = aISO(hoy())) {
  return !tarea.completada && tarea.fecha === hoyISO;
}

/** Lo que de verdad hay que hacer hoy: lo de hoy más lo que se quedó atrás. */
export function paraHoy(tareas, hoyISO = aISO(hoy())) {
  return tareas.filter((t) => !t.completada && t.fecha && t.fecha <= hoyISO);
}

const ORDENES = {
  fecha: (a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || (a.hora || '99').localeCompare(b.hora || '99') || a.prioridad - b.prioridad,
  prioridad: (a, b) => a.prioridad - b.prioridad || (a.fecha || '9999').localeCompare(b.fecha || '9999'),
  manual: (a, b) => (a.orden || 0) - (b.orden || 0),
  alfabetico: (a, b) => a.titulo.localeCompare(b.titulo),
  creacion: (a, b) => String(b.creadaEn).localeCompare(String(a.creadaEn)),
};

export function ordenarTareas(tareas, criterio = 'fecha') {
  return [...tareas].sort(ORDENES[criterio] || ORDENES.fecha);
}

/** Agrupa por día para la vista "Próximos". */
export function agruparPorFecha(tareas) {
  const mapa = new Map();
  for (const t of ordenarTareas(tareas, 'fecha')) {
    const clave = t.fecha || 'sin-fecha';
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(t);
  }
  return mapa;
}

/** Devuelve la tarea ya completada y, si se repetía, la siguiente ocurrencia. */
export function completar(tarea, hoyISO = aISO(hoy())) {
  if (tarea.regla && !tarea.completada) {
    const siguiente = avanzarTarea(tarea, hoyISO);
    if (siguiente) {
      return {
        tarea: { ...tarea, fecha: siguiente, completada: false, completadaEn: null },
        historial: { id: uid('h'), tareaId: tarea.id, titulo: tarea.titulo, fecha: hoyISO, modulo: tarea.modulo, prioridad: tarea.prioridad },
        repetida: true,
      };
    }
  }
  return {
    tarea: { ...tarea, completada: true, completadaEn: new Date().toISOString() },
    historial: { id: uid('h'), tareaId: tarea.id, titulo: tarea.titulo, fecha: hoyISO, modulo: tarea.modulo, prioridad: tarea.prioridad },
    repetida: false,
  };
}

/** Árbol padre → subtareas, conservando el orden de cada nivel. */
export function arbol(tareas) {
  const porPadre = new Map();
  for (const t of tareas) {
    const clave = t.padre || null;
    if (!porPadre.has(clave)) porPadre.set(clave, []);
    porPadre.get(clave).push(t);
  }
  const construir = (padre) => (porPadre.get(padre) || []).map((t) => ({ ...t, hijos: construir(t.id) }));
  return construir(null);
}

export function progreso(tareas) {
  const total = tareas.length;
  const hechas = tareas.filter((t) => t.completada).length;
  return { total, hechas, pct: total ? Math.round((hechas / total) * 100) : 0 };
}

/**
 * Productividad a partir del historial: cuántas por día, racha y comparación
 * con la semana pasada. Es el "karma" pero sin puntos inventados.
 */
export function estadisticas(historial = [], hoyISO = aISO(hoy()), meta = 5) {
  const porDia = new Map();
  for (const h of historial) porDia.set(h.fecha, (porDia.get(h.fecha) || 0) + 1);

  let racha = 0;
  for (let i = 0; i < 400; i++) {
    const dia = aISO(sumarDias(hoyISO, -i));
    const n = porDia.get(dia) || 0;
    if (n >= meta) racha++;
    else if (i > 0 || n === 0) break;
  }

  const desdeSemana = aISO(inicioSemana(hoyISO));
  const semanaPasadaIni = aISO(sumarDias(desdeSemana, -7));
  const enRango = (desde, hasta) => historial.filter((h) => h.fecha >= desde && h.fecha < hasta).length;

  const ultimos = [];
  for (let i = 13; i >= 0; i--) {
    const dia = aISO(sumarDias(hoyISO, -i));
    ultimos.push({ fecha: dia, total: porDia.get(dia) || 0 });
  }

  const porModulo = new Map();
  for (const h of historial.filter((h) => h.fecha >= desdeSemana)) {
    porModulo.set(h.modulo || 'personal', (porModulo.get(h.modulo || 'personal') || 0) + 1);
  }

  return {
    hoy: porDia.get(hoyISO) || 0,
    semana: enRango(desdeSemana, aISO(sumarDias(hoyISO, 1))),
    semanaPasada: enRango(semanaPasadaIni, desdeSemana),
    total: historial.length,
    racha,
    meta,
    ultimos,
    porModulo: [...porModulo.entries()].map(([modulo, total]) => ({ modulo, total })).sort((a, b) => b.total - a.total),
    mejorDia: [...porDia.entries()].sort((a, b) => b[1] - a[1])[0] || null,
  };
}

/**
 * La bandeja de entrada: lo capturado que todavía no se ha decidido.
 *
 * Una tarea sale de la bandeja en cuanto tiene proyecto o módulo, que es la
 * decisión que de verdad cuesta. Poner fecha no basta: "llamar al banco algún
 * martes" sigue sin tener dueño.
 */
export function enBandeja(tareas = []) {
  return tareas.filter((t) => !t.completada && !t.padre && !t.proyecto && !t.modulo);
}

/**
 * Estado de la bandeja: cuánto hay, cuánto lleva ahí lo más viejo y si conviene
 * pararse a vaciarla.
 */
export function estadoBandeja(tareas = [], hoyISO = aISO(hoy())) {
  const items = enBandeja(tareas);
  const antiguedades = items.map((t) => diferenciaDias(String(t.creadaEn).slice(0, 10), hoyISO));
  const masViejo = antiguedades.length ? Math.max(...antiguedades) : 0;
  return {
    total: items.length,
    items,
    masViejo,
    rapidas: items.filter((t) => (t.duracion || 0) > 0 && t.duracion <= 2).length,
    // Dos señales que sí significan algo: mucho acumulado o algo criando polvo.
    conviéneVaciar: items.length >= 5 || masViejo >= 3,
  };
}

/** Carga del día: minutos comprometidos frente a los que tienes. */
export function cargaDelDia(tareas, minutosDisponibles = 480) {
  const conDuracion = tareas.filter((t) => !t.completada && t.duracion);
  const minutos = conDuracion.reduce((s, t) => s + Number(t.duracion || 0), 0);
  return {
    minutos,
    horas: Math.round((minutos / 60) * 10) / 10,
    disponibles: minutosDisponibles,
    pct: Math.round((minutos / minutosDisponibles) * 100),
    excedido: minutos > minutosDisponibles,
    sinEstimar: tareas.filter((t) => !t.completada && !t.duracion).length,
  };
}

/** Tareas que llevan demasiado tiempo abiertas: las que hay que decidir, no arrastrar. */
export function estancadas(tareas, dias = 30, hoyISO = aISO(hoy())) {
  return tareas.filter((t) => !t.completada && diferenciaDias(String(t.creadaEn).slice(0, 10), hoyISO) >= dias);
}

/**
 * Reparte 100 % entre unos valores **sin que la suma dé 101**.
 *
 * Redondear cada parte por su cuenta deja restos sueltos: 55,9 + 24,8 + 13,7…
 * se convierte en 56 + 25 + 14 y ya sobra uno. Se reparte por el método del
 * resto mayor, que es el que usan los repartos de escaños: primero la parte
 * entera y luego los puntos que faltan van a quien tenía el decimal más alto.
 */
export function porcentajes(valores = []) {
  const numeros = valores.map((v) => Math.max(0, Number(v) || 0));
  const total = numeros.reduce((s, v) => s + v, 0);
  if (!total) return numeros.map(() => 0);

  const exactos = numeros.map((v) => (v / total) * 100);
  const enteros = exactos.map((x) => Math.floor(x));
  let faltan = 100 - enteros.reduce((s, v) => s + v, 0);

  const orden = exactos
    .map((x, i) => ({ i, resto: x - Math.floor(x) }))
    .sort((a, b) => b.resto - a.resto);
  for (let k = 0; k < orden.length && faltan > 0; k++, faltan--) enteros[orden[k].i]++;
  return enteros;
}
