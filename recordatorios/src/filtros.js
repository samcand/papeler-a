/**
 * filtros.js — Filtros guardados con un lenguaje corto, al estilo de Todoist.
 *
 *   hoy | vencidas
 *   #Inversiones & p1
 *   próximos 7 días & !@espera
 *   módulo:docencia & sin fecha
 *
 * Operadores: `&` (y), `|` (o), `!` (no) y paréntesis.
 */

import { aISO, deISO, hoy, sumarDias } from './fechas.js';
import { parseEntrada } from './naturales.js';

function limpia(txt) {
  return String(txt).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Trocea la expresión en paréntesis, operadores y términos. */
function tokeniza(texto) {
  const tokens = [];
  let buffer = '';
  const soltar = () => { if (buffer.trim()) tokens.push({ tipo: 'termino', valor: buffer.trim() }); buffer = ''; };
  for (const ch of String(texto)) {
    if (ch === '&' || ch === '|' || ch === '(' || ch === ')' || ch === '!') {
      soltar();
      tokens.push({ tipo: ch === '(' || ch === ')' ? ch : 'op', valor: ch });
    } else buffer += ch;
  }
  soltar();
  return tokens;
}

/** Análisis descendente: o -> y -> unario -> término. */
export function parseFiltro(texto) {
  const tokens = tokeniza(texto);
  let i = 0;
  const mirar = () => tokens[i];
  const comer = () => tokens[i++];

  function expresionO() {
    let izq = expresionY();
    while (mirar() && mirar().tipo === 'op' && mirar().valor === '|') {
      comer();
      izq = { tipo: 'o', izq, der: expresionY() };
    }
    return izq;
  }
  function expresionY() {
    let izq = unario();
    while (mirar() && ((mirar().tipo === 'op' && mirar().valor === '&') || mirar().tipo === 'termino' || mirar().tipo === '(')) {
      if (mirar().tipo === 'op') comer();
      const der = unario();
      if (!der) break;
      izq = { tipo: 'y', izq, der };
    }
    return izq;
  }
  function unario() {
    const t = mirar();
    if (!t) return null;
    if (t.tipo === 'op' && t.valor === '!') { comer(); return { tipo: 'no', hijo: unario() }; }
    if (t.tipo === '(') {
      comer();
      const dentro = expresionO();
      if (mirar() && mirar().tipo === ')') comer();
      return dentro;
    }
    if (t.tipo === 'termino') { comer(); return { tipo: 'termino', valor: t.valor }; }
    comer();
    return null;
  }
  return expresionO();
}

/** Evalúa un término suelto contra una tarea. */
function evaluaTermino(valor, tarea, ctx) {
  const v = limpia(valor);
  const hoyISO = ctx.hoy;

  if (v === 'hoy') return !tarea.completada && !!tarea.fecha && tarea.fecha <= hoyISO;
  if (v === 'manana' || v === 'mañana') return tarea.fecha === aISO(sumarDias(hoyISO, 1));
  if (v === 'vencidas' || v === 'atrasadas') return !tarea.completada && !!tarea.fecha && tarea.fecha < hoyISO;
  if (v === 'sin fecha') return !tarea.fecha;
  if (v === 'con fecha') return !!tarea.fecha;
  if (v === 'sin proyecto') return !tarea.proyecto;
  if (v === 'sin etiqueta' || v === 'sin etiquetas') return !(tarea.etiquetas || []).length;
  if (v === 'completadas' || v === 'hechas') return !!tarea.completada;
  if (v === 'pendientes') return !tarea.completada;
  if (v === 'repetidas' || v === 'recurrentes') return !!tarea.regla;
  if (v === 'subtareas') return !!tarea.padre;
  if (v === 'con nota' || v === 'con notas') return !!(tarea.notas || '').trim();

  const mProximos = v.match(/^(?:proximos?\s+)?(\d+)\s+dias?$/);
  if (mProximos) {
    const limite = aISO(sumarDias(hoyISO, Number(mProximos[1])));
    return !tarea.completada && !!tarea.fecha && tarea.fecha <= limite;
  }
  const mPrioridad = v.match(/^p([1-4])$/);
  if (mPrioridad) return tarea.prioridad === Number(mPrioridad[1]);

  if (v.startsWith('#')) return limpia(tarea.proyecto || '') === v.slice(1);
  if (v.startsWith('@')) return (tarea.etiquetas || []).some((e) => limpia(e) === v.slice(1));

  const mModulo = v.match(/^(?:modulo|mod):\s*(.+)$/);
  if (mModulo) return limpia(tarea.modulo || '') === limpia(mModulo[1]);

  const mBuscar = v.match(/^(?:buscar|texto):\s*(.+)$/);
  if (mBuscar) {
    const q = limpia(mBuscar[1]);
    return limpia(tarea.titulo).includes(q) || limpia(tarea.notas || '').includes(q);
  }

  const mAntes = v.match(/^(?:vence\s+)?antes de:?\s*(.+)$/);
  if (mAntes) {
    const f = parseEntrada(mAntes[1], { hoy: hoyISO }).fecha;
    return f ? !!tarea.fecha && tarea.fecha < f : false;
  }
  const mDespues = v.match(/^(?:vence\s+)?despues de:?\s*(.+)$/);
  if (mDespues) {
    const f = parseEntrada(mDespues[1], { hoy: hoyISO }).fecha;
    return f ? !!tarea.fecha && tarea.fecha > f : false;
  }

  // Cualquier otra cosa se busca como texto libre.
  return limpia(tarea.titulo).includes(v) || limpia(tarea.notas || '').includes(v);
}

export function evalua(nodo, tarea, ctx) {
  if (!nodo) return true;
  switch (nodo.tipo) {
    case 'y': return evalua(nodo.izq, tarea, ctx) && evalua(nodo.der, tarea, ctx);
    case 'o': return evalua(nodo.izq, tarea, ctx) || evalua(nodo.der, tarea, ctx);
    case 'no': return !evalua(nodo.hijo, tarea, ctx);
    case 'termino': return evaluaTermino(nodo.valor, tarea, ctx);
    default: return true;
  }
}

/**
 * Aplica un filtro escrito a una lista de tareas. Por defecto oculta las
 * completadas, salvo que el propio filtro las pida.
 */
export function aplicarFiltro(texto, tareas, opciones = {}) {
  const ctx = { hoy: opciones.hoy || aISO(hoy()) };
  const ast = parseFiltro(texto || '');
  const pideCompletadas = /\b(completadas|hechas)\b/i.test(texto || '');
  return tareas.filter((t) => (pideCompletadas || !t.completada) && evalua(ast, t, ctx));
}

/** Filtros que vienen puestos: los que se usan de verdad cada semana. */
export const FILTROS_PREDEFINIDOS = [
  { id: 'f-hoy', nombre: 'Hoy y atrasadas', expresion: 'hoy | vencidas', icono: '📅' },
  { id: 'f-urgente', nombre: 'Solo lo urgente', expresion: 'p1 & 7 días', icono: '🔥' },
  { id: 'f-mercado', nombre: 'Mercado esta semana', expresion: 'módulo:inversiones & 7 días', icono: '📈' },
  { id: 'f-clases', nombre: 'Docencia pendiente', expresion: 'módulo:docencia & pendientes', icono: '🎓' },
  { id: 'f-papers', nombre: 'Investigación', expresion: 'módulo:investigacion', icono: '🔬' },
  { id: 'f-domingo', nombre: 'Para el domingo', expresion: 'módulo:alabanza & 7 días', icono: '🎵' },
  { id: 'f-espera', nombre: 'Esperando respuesta', expresion: '@espera', icono: '⏳' },
  { id: 'f-sinfecha', nombre: 'Sin fecha (decidir)', expresion: 'sin fecha & pendientes', icono: '🗂️' },
];
