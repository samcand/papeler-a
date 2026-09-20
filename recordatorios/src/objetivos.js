/**
 * objetivos.js — Metas con progreso y con revisión.
 *
 * Un objetivo sin número no es un objetivo, es un deseo; y un objetivo sin
 * fecha de revisión se convierte en un reproche silencioso. Aquí van los dos.
 *
 * Lo que de verdad importa no es el porcentaje: es **si vas al ritmo**. Llevar
 * el 40 % en marzo de un objetivo anual suena bien y va tarde. Por eso se
 * compara lo avanzado con lo transcurrido y se dice cuánto hace falta por
 * semana para llegar.
 *
 * Cubre también el plan de aprendizaje, las habilidades por aprender y la lista
 * de cosas para la vida: son objetivos con otra etiqueta.
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';

export const TIPOS_OBJETIVO = [
  { id: 'numero', nombre: 'Llegar a un número', ayuda: 'Leer 24 libros, correr 500 km, ahorrar 3.000.' },
  { id: 'tareas', nombre: 'Cerrar tareas de un proyecto', ayuda: 'Cuenta las tareas completadas de ese proyecto.' },
  { id: 'siNo', nombre: 'Hacerlo o no hacerlo', ayuda: 'Sacar el pasaporte, aprender a nadar.' },
];

export const AMBITOS = [
  { id: 'vida', nombre: 'Vida', icono: '🌱' },
  { id: 'aprender', nombre: 'Aprender', icono: '📚' },
  { id: 'salud', nombre: 'Salud', icono: '🏃' },
  { id: 'dinero', nombre: 'Dinero', icono: '💰' },
  { id: 'trabajo', nombre: 'Trabajo', icono: '🛠️' },
];

export function objetivoNuevo(campos = {}) {
  return {
    id: 'obj-' + Math.random().toString(36).slice(2, 8),
    que: '',
    ambito: 'vida',
    tipo: 'numero',
    desde: aISO(hoy()),
    hasta: null,          // sin fecha es la lista de "algún día en la vida"
    meta: 10,
    actual: 0,
    unidad: '',
    proyecto: null,       // para el tipo 'tareas'
    hecho: false,         // para el tipo 'siNo'
    revisarEn: null,
    logradoEn: null,
    abandonadoEn: null,
    porque: '',
    ...campos,
  };
}

/** Cuánto llevas: el número, el porcentaje y de dónde sale. */
export function avance(objetivo, datos = {}) {
  if (objetivo.tipo === 'siNo') {
    return { actual: objetivo.hecho ? 1 : 0, meta: 1, pct: objetivo.hecho ? 100 : 0, fuente: 'a mano' };
  }
  if (objetivo.tipo === 'tareas') {
    const historial = datos.historial || [];
    const tareas = datos.tareas || [];
    const porId = new Map(tareas.map((t) => [t.id, t]));
    const hechas = historial.filter((h) => {
      const proyecto = h.proyecto || porId.get(h.tareaId)?.proyecto;
      if (proyecto !== objetivo.proyecto) return false;
      if (objetivo.desde && h.fecha < objetivo.desde) return false;
      if (objetivo.hasta && h.fecha > objetivo.hasta) return false;
      return true;
    }).length;
    const meta = Math.max(1, Number(objetivo.meta) || 1);
    return { actual: hechas, meta, pct: Math.min(100, Math.round((hechas / meta) * 100)), fuente: 'tareas cerradas' };
  }
  const meta = Math.max(1, Number(objetivo.meta) || 1);
  const actual = Number(objetivo.actual) || 0;
  return { actual, meta, pct: Math.min(100, Math.round((actual / meta) * 100)), fuente: 'a mano' };
}

/**
 * Progreso comparado con el tiempo transcurrido. Sin fecha de fin no hay ritmo
 * que valga: se dice y ya está, en vez de inventar una urgencia.
 */
export function progreso(objetivo, datos = {}, hoyISO = aISO(hoy())) {
  const a = avance(objetivo, datos);
  const cerrado = !!(objetivo.logradoEn || objetivo.abandonadoEn);
  const base = { ...a, cerrado, logrado: a.pct >= 100 || !!objetivo.logradoEn };

  if (!objetivo.hasta) {
    return {
      ...base, conFecha: false, pctTiempo: null, alDia: null, restan: null, porSemana: null,
      frase: base.logrado ? 'Logrado.' : `${a.actual} de ${a.meta}${objetivo.unidad ? ` ${objetivo.unidad}` : ''}. Sin fecha: avanza cuando avance.`,
    };
  }

  const total = Math.max(1, diferenciaDias(objetivo.desde, objetivo.hasta));
  const pasados = Math.min(total, Math.max(0, diferenciaDias(objetivo.desde, hoyISO)));
  const pctTiempo = Math.round((pasados / total) * 100);
  const restan = diferenciaDias(hoyISO, objetivo.hasta);
  const falta = Math.max(0, a.meta - a.actual);
  const semanas = Math.max(1, restan / 7);
  const porSemana = restan > 0 ? Math.round((falta / semanas) * 10) / 10 : null;

  let frase;
  if (base.logrado) frase = 'Logrado.';
  else if (restan < 0) frase = `Se pasó la fecha con ${a.pct} % hecho. O se cierra, o se le pone fecha nueva con honestidad.`;
  else if (a.pct >= pctTiempo) frase = `Vas al día: ${a.pct} % hecho con ${pctTiempo} % del tiempo gastado.`;
  else frase = `Vas atrasado: ${a.pct} % hecho y ${pctTiempo} % del tiempo gastado.`
    + (porSemana ? ` Hacen falta ${porSemana}${objetivo.unidad ? ` ${objetivo.unidad}` : ''} por semana.` : '');

  return {
    ...base, conFecha: true, pctTiempo, restan, porSemana,
    alDia: base.logrado || a.pct >= pctTiempo,
    frase,
  };
}

/** Los que tocaba mirar y nadie miró. */
export function aRevisar(objetivos = [], hoyISO = aISO(hoy())) {
  return objetivos
    .filter((o) => !o.logradoEn && !o.abandonadoEn && o.revisarEn && o.revisarEn <= hoyISO)
    .sort((a, b) => String(a.revisarEn).localeCompare(String(b.revisarEn)));
}

export function vivos(objetivos = []) {
  return objetivos.filter((o) => !o.logradoEn && !o.abandonadoEn);
}

export function resumenObjetivos(objetivos = [], datos = {}, hoyISO = aISO(hoy())) {
  const enCurso = vivos(objetivos);
  const conProgreso = enCurso.map((o) => ({ objetivo: o, progreso: progreso(o, datos, hoyISO) }));
  const atrasados = conProgreso.filter((x) => x.progreso.alDia === false);
  const logrados = objetivos.filter((o) => o.logradoEn).length;
  const abandonados = objetivos.filter((o) => o.abandonadoEn).length;

  return {
    enCurso: enCurso.length,
    logrados,
    abandonados,
    atrasados: atrasados.length,
    aRevisar: aRevisar(objetivos, hoyISO).length,
    lista: conProgreso,
    frase: !objetivos.length
      ? 'Ningún objetivo escrito. Lo que no se escribe se convierte en intención.'
      : `${enCurso.length} en curso, ${logrados} logrados`
        + `${atrasados.length ? ` y ${atrasados.length} que van tarde` : ''}`
        + `${abandonados ? `. ${abandonados} abandonados, que también cuenta como decidir` : ''}.`,
  };
}

/** Un objetivo también se convierte en tarea: la del próximo paso concreto. */
export function tareaDeObjetivo(objetivo, hoyISO = aISO(hoy())) {
  return {
    titulo: `Avanzar: ${objetivo.que}`,
    fecha: hoyISO,
    prioridad: 2,
    modulo: 'personal',
    etiquetas: ['objetivo'],
    notas: `Meta: ${objetivo.meta}${objetivo.unidad ? ` ${objetivo.unidad}` : ''}`
      + `${objetivo.hasta ? ` antes del ${objetivo.hasta}` : ''}.`,
  };
}
