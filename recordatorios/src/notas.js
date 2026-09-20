/**
 * notas.js — Notas sueltas y diario: lo que no es una tarea.
 *
 * Una tarea es algo que hay que hacer; una nota es algo que hay que recordar.
 * Meterlo todo en tareas ensucia la lista de pendientes con cosas que nunca se
 * van a “completar”.
 *
 * Dos detalles hacen que esto sea un segundo cerebro y no un cajón: los enlaces
 * `[[entre notas]]` y **la lista de qué apunta a esta nota**, que es donde
 * aparecen las relaciones que no recordabas.
 *
 * El diario del día es una nota con fecha y tipo `diario`: la misma pieza, sin
 * un módulo aparte que mantener.
 */

import { aISO, deISO, diferenciaDias, hoy, sumarDias } from './fechas.js';

export const TIPOS_NOTA = [
  { id: 'nota', nombre: 'Nota', icono: '📝' },
  { id: 'diario', nombre: 'Diario', icono: '📔' },
];

export const ANIMOS = [
  { id: 'bien', nombre: 'Buen día', icono: '🙂' },
  { id: 'normal', nombre: 'Normal', icono: '😐' },
  { id: 'mal', nombre: 'Día duro', icono: '😕' },
];

export function notaNueva(campos = {}) {
  const ahora = new Date().toISOString();
  return {
    id: 'not-' + Math.random().toString(36).slice(2, 8),
    titulo: '',
    texto: '',
    tipo: 'nota',
    etiquetas: [],
    fecha: null,        // el diario la usa; una nota normal no necesita fecha
    animo: null,
    tarea: null,        // id de la tarea de la que salió, si salió de una
    proyecto: null,
    fijada: false,
    creadaEn: ahora,
    actualizadaEn: ahora,
    ...campos,
  };
}

function limpia(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Los títulos enlazados con `[[dobles corchetes]]` dentro del texto. */
export function enlaces(texto) {
  const salida = [];
  for (const m of String(texto || '').matchAll(/\[\[([^\]]+)\]\]/g)) {
    const titulo = m[1].trim();
    if (titulo && !salida.includes(titulo)) salida.push(titulo);
  }
  return salida;
}

/**
 * A dónde apunta esta nota y quién apunta a ella. Un enlace a una nota que aún
 * no existe no es un error: es la nota que todavía no has escrito, y se
 * devuelve aparte para poder crearla de un clic.
 */
export function relaciones(nota, notas = []) {
  const porTitulo = new Map(notas.map((n) => [limpia(n.titulo), n]));
  const salientes = [];
  const rotos = [];
  for (const titulo of enlaces(nota.texto)) {
    const destino = porTitulo.get(limpia(titulo));
    if (destino) salientes.push(destino);
    else rotos.push(titulo);
  }
  const entrantes = notas.filter((n) => n.id !== nota.id
    && enlaces(n.texto).some((t) => limpia(t) === limpia(nota.titulo)));
  return { salientes, entrantes, rotos };
}

/** Busca por texto libre y por `@etiqueta`, sin distinguir acentos. */
export function buscarNotas(notas = [], consulta = '', opciones = {}) {
  const partes = String(consulta).split(/\s+/).filter(Boolean);
  const etiquetas = partes.filter((p) => p.startsWith('@')).map((p) => limpia(p.slice(1)));
  const palabras = partes.filter((p) => !p.startsWith('@')).map(limpia);

  return notas
    .filter((n) => (opciones.tipo ? n.tipo === opciones.tipo : true))
    .filter((n) => etiquetas.every((e) => (n.etiquetas || []).some((x) => limpia(x) === e)))
    .filter((n) => palabras.every((w) => limpia(n.titulo).includes(w) || limpia(n.texto).includes(w)))
    .sort((a, b) => (b.fijada - a.fijada)
      || String(b.fecha || b.actualizadaEn).localeCompare(String(a.fecha || a.actualizadaEn)));
}

/** Todas las etiquetas usadas, de la más usada a la menos. */
export function etiquetasDeNotas(notas = []) {
  const cuenta = new Map();
  for (const n of notas) for (const e of n.etiquetas || []) cuenta.set(e, (cuenta.get(e) || 0) + 1);
  return [...cuenta.entries()].map(([etiqueta, n]) => ({ etiqueta, n })).sort((a, b) => b.n - a.n);
}

/* ------------------------------------------------------------------ *
 * Diario
 * ------------------------------------------------------------------ */

/** La entrada del diario de un día, si existe. */
export function entradaDiario(notas = [], diaISO) {
  return notas.find((n) => n.tipo === 'diario' && n.fecha === diaISO) || null;
}

/** Una entrada nueva para ese día, con el título ya puesto. */
export function entradaNueva(diaISO) {
  return notaNueva({ tipo: 'diario', fecha: diaISO, titulo: diaISO });
}

/**
 * “Hace un año hoy”, que es la mitad de la gracia de llevar un diario. Se
 * admite una ventana de días porque no se escribe todos los días.
 */
export function haceTiempo(notas = [], hoyISO = aISO(hoy()), opciones = {}) {
  const ventana = opciones.ventana ?? 3;
  const salida = [];
  for (const anios of opciones.anios || [1, 2, 3, 5]) {
    const objetivo = aISO(new Date(deISO(hoyISO).getFullYear() - anios,
      deISO(hoyISO).getMonth(), deISO(hoyISO).getDate(), 12));
    const cerca = notas
      .filter((n) => n.tipo === 'diario' && n.fecha)
      .map((n) => ({ nota: n, distancia: Math.abs(diferenciaDias(objetivo, n.fecha)) }))
      .filter((x) => x.distancia <= ventana)
      .sort((a, b) => a.distancia - b.distancia)[0];
    if (cerca) salida.push({ anios, nota: cerca.nota });
  }
  return salida;
}

/** Cuántos días seguidos llevas escribiendo, contando desde hoy o ayer. */
export function rachaDiario(notas = [], hoyISO = aISO(hoy())) {
  const dias = new Set(notas.filter((n) => n.tipo === 'diario' && n.fecha).map((n) => n.fecha));
  if (!dias.size) return 0;
  let cursor = dias.has(hoyISO) ? hoyISO : aISO(sumarDias(hoyISO, -1));
  if (!dias.has(cursor)) return 0;
  let racha = 0;
  while (dias.has(cursor)) {
    racha++;
    cursor = aISO(sumarDias(cursor, -1));
  }
  return racha;
}

export function resumenNotas(notas = [], hoyISO = aISO(hoy())) {
  const sueltas = notas.filter((n) => n.tipo !== 'diario');
  const diario = notas.filter((n) => n.tipo === 'diario');
  const huerfanas = sueltas.filter((n) => !relaciones(n, notas).entrantes.length
    && !enlaces(n.texto).length && !(n.etiquetas || []).length);
  return {
    total: notas.length,
    sueltas: sueltas.length,
    diario: diario.length,
    racha: rachaDiario(notas, hoyISO),
    hoyEscrito: !!entradaDiario(notas, hoyISO),
    huerfanas: huerfanas.length,
    frase: !notas.length
      ? 'Ninguna nota todavía. Esto es para lo que no es una tarea.'
      : `${sueltas.length} nota${sueltas.length === 1 ? '' : 's'} y ${diario.length} día${diario.length === 1 ? '' : 's'} de diario`
        + `${huerfanas.length ? `. ${huerfanas.length} sin etiqueta ni enlace: eso es un cajón, no un segundo cerebro.` : '.'}`,
  };
}
