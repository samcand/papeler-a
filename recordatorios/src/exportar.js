/**
 * exportar.js — Salidas y entradas: calendario .ics, CSV, texto para pegar en
 * un chat e importación desde Todoist o TickTick.
 *
 * El .ics es la pieza importante: lo que no puede fallar (un examen, un
 * vencimiento) debe estar también en el calendario del teléfono.
 */

import { aISO, deISO, horaTexto, momento, textoLargo, textoRelativo } from './fechas.js';
import { textoRegla } from './recurrencia.js';
import { PRIORIDADES } from './modelo.js';

/* ---------------------------- calendario ---------------------------- */

function marcaICS(d) {
  return `${String(d.getUTCFullYear())}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}00Z`;
}
const p2 = (n) => String(n).padStart(2, '0');

function escapaICS(txt) {
  return String(txt || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Regla de repetición traducida a RRULE, para que el calendario la entienda. */
function aRRULE(regla) {
  if (!regla) return null;
  const DIAS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  switch (regla.tipo) {
    case 'diaria': return `FREQ=DAILY;INTERVAL=${regla.cada || 1}`;
    case 'habiles': return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'semanal':
      return `FREQ=WEEKLY;INTERVAL=${regla.cada || 1}` + (regla.dias?.length ? `;BYDAY=${regla.dias.map((d) => DIAS_ICS[d]).join(',')}` : '');
    case 'mensual':
      if (regla.diaMes === 'ultimo') return `FREQ=MONTHLY;INTERVAL=${regla.cada || 1};BYMONTHDAY=-1`;
      return `FREQ=MONTHLY;INTERVAL=${regla.cada || 1}` + (regla.diaMes ? `;BYMONTHDAY=${regla.diaMes}` : '');
    case 'anual': return `FREQ=YEARLY;INTERVAL=${regla.cada || 1}`;
    case 'nEsimo': return `FREQ=MONTHLY;INTERVAL=${regla.cada || 1};BYDAY=${regla.nEsimo.n}${DIAS_ICS[regla.nEsimo.dia]}`;
    default: return null;
  }
}

export function aICS(tareas = [], opciones = {}) {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Recordatorios//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapaICS(opciones.nombre || 'Mis recordatorios')}`,
  ];

  for (const t of tareas) {
    if (!t.fecha) continue;
    const inicio = momento(t.fecha, t.hora || '09:00');
    const fin = new Date(inicio.getTime() + (Number(t.duracion) || 30) * 60000);
    const rrule = aRRULE(t.regla);
    lineas.push('BEGIN:VEVENT');
    lineas.push(`UID:${t.id || Math.random().toString(36).slice(2)}@recordatorios`);
    lineas.push(`DTSTAMP:${marcaICS(new Date())}`);
    if (t.hora) {
      lineas.push(`DTSTART:${marcaICS(inicio)}`);
      lineas.push(`DTEND:${marcaICS(fin)}`);
    } else {
      const soloDia = t.fecha.replace(/-/g, '');
      lineas.push(`DTSTART;VALUE=DATE:${soloDia}`);
    }
    if (rrule) lineas.push(`RRULE:${rrule}`);
    lineas.push(`SUMMARY:${escapaICS(t.titulo)}`);
    const descripcion = [t.notas, t.proyecto ? `Proyecto: ${t.proyecto}` : '', t.regla ? `Repite: ${textoRegla(t.regla)}` : '']
      .filter(Boolean).join('\n');
    if (descripcion) lineas.push(`DESCRIPTION:${escapaICS(descripcion)}`);
    if (t.etiquetas?.length) lineas.push(`CATEGORIES:${t.etiquetas.map(escapaICS).join(',')}`);
    if (t.prioridad) lineas.push(`PRIORITY:${t.prioridad <= 2 ? 1 : 5}`);
    // Aviso 30 minutos antes para lo que tiene hora
    if (t.hora) {
      lineas.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${escapaICS(t.titulo)}`, 'END:VALARM');
    }
    lineas.push('END:VEVENT');
  }
  lineas.push('END:VCALENDAR');
  return lineas.join('\r\n');
}

/* ------------------------------- CSV -------------------------------- */

function campoCSV(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function aCSV(tareas = []) {
  const cabecera = ['titulo', 'notas', 'proyecto', 'modulo', 'prioridad', 'fecha', 'hora', 'duracion', 'etiquetas', 'repeticion', 'completada'];
  const filas = tareas.map((t) => [
    t.titulo, t.notas, t.proyecto, t.modulo, t.prioridad, t.fecha, t.hora, t.duracion,
    (t.etiquetas || []).join(' '), t.regla ? textoRegla(t.regla) : '', t.completada ? 'sí' : 'no',
  ]);
  return [cabecera, ...filas].map((f) => f.map(campoCSV).join(',')).join('\n');
}

/** Lector de CSV que respeta comillas y saltos de línea dentro de un campo. */
export function leerCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;
  const t = String(texto).replace(/\r\n/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (entreComillas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') entreComillas = false;
      else campo += ch;
    } else if (ch === '"') entreComillas = true;
    else if (ch === ',') { fila.push(campo); campo = ''; }
    else if (ch === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += ch;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((c) => c !== ''));
}

/**
 * Importa el CSV que exportan Todoist y TickTick.
 * Se reconocen las columnas por nombre, sin importar el orden ni el idioma.
 */
export function importarCSV(texto) {
  const filas = leerCSV(texto);
  if (!filas.length) return [];
  const cabecera = filas[0].map((c) => c.trim().toLowerCase());
  const col = (...nombres) => {
    for (const n of nombres) {
      const i = cabecera.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  // TickTick trae "Title" + "Content" (notas) y Todoist llama "Content" al título:
  // por eso "title" manda cuando existe.
  const iTitulo = col('title', 'content', 'task name', 'titulo', 'título', 'nombre');
  const iNotas = col('description', 'content', 'notas', 'note');
  const iProyecto = col('project name', 'list name', 'proyecto', 'lista', 'folder name');
  const iFecha = col('date', 'due date', 'fecha', 'due date (utc)');
  const iPrioridad = col('priority', 'prioridad');
  const iEtiquetas = col('tags', 'labels', 'etiquetas');
  const iEstado = col('status', 'completed', 'estado');
  if (iTitulo < 0) return [];

  const tareas = [];
  for (const fila of filas.slice(1)) {
    const titulo = (fila[iTitulo] || '').trim();
    if (!titulo || /^\s*\*?\s*$/.test(titulo)) continue;
    const fechaCruda = iFecha >= 0 ? (fila[iFecha] || '').trim() : '';
    const iso = fechaCruda.match(/\d{4}-\d{2}-\d{2}/)?.[0] || null;
    // La hora se busca pegada a la fecha ("2026-09-25T19:00"), no suelta: en
    // ISO no hay separación de palabra entre la "T" y el "19".
    const horaCruda = fechaCruda.match(/\d{4}-\d{2}-\d{2}[T ](\d{2}:\d{2})/)?.[1] || null;
    const hora = horaCruda === '00:00' ? null : horaCruda;
    const prioridadCruda = iPrioridad >= 0 ? Number(fila[iPrioridad]) : NaN;
    tareas.push({
      titulo,
      notas: iNotas >= 0 && iNotas !== iTitulo ? (fila[iNotas] || '').trim() : '',
      proyecto: iProyecto >= 0 ? (fila[iProyecto] || '').trim() || null : null,
      fecha: iso,
      hora,
      // TickTick y Todoist numeran al revés: en ambos casos 1 es lo más urgente aquí.
      prioridad: Number.isFinite(prioridadCruda) && prioridadCruda > 0
        ? Math.min(4, Math.max(1, 5 - Math.min(4, prioridadCruda)))
        : 4,
      etiquetas: iEtiquetas >= 0 ? (fila[iEtiquetas] || '').split(/[;,|]/).map((s) => s.trim()).filter(Boolean) : [],
      completada: iEstado >= 0 ? /^(2|completed|sí|si|true|yes)$/i.test((fila[iEstado] || '').trim()) : false,
    });
  }
  return tareas;
}

/* ---------------------------- texto plano ---------------------------- */

/** El día en texto, listo para pegarlo en un chat o imprimirlo. */
export function aTexto(tareas = [], titulo = 'Mi día') {
  const lineas = [titulo, '='.repeat(titulo.length), ''];
  for (const t of tareas) {
    const marca = t.completada ? '[x]' : '[ ]';
    const prio = t.prioridad <= 2 ? ` (${PRIORIDADES.find((p) => p.valor === t.prioridad).corto})` : '';
    const cuando = t.hora ? ` ${t.hora}` : '';
    lineas.push(`${marca}${cuando} ${t.titulo}${prio}${t.proyecto ? ` · ${t.proyecto}` : ''}`);
    if (t.notas) lineas.push(`      ${t.notas.replace(/\n/g, ' ')}`);
  }
  return lineas.join('\n');
}

/** Resumen del día en Markdown, con lo que toca y lo que se quedó atrás. */
export function resumenMarkdown(tareas = [], hoyISO) {
  const pendientes = tareas.filter((t) => !t.completada);
  const vencidas = pendientes.filter((t) => t.fecha && t.fecha < hoyISO);
  const deHoy = pendientes.filter((t) => t.fecha === hoyISO);
  const linea = (t) => `- ${t.hora ? `**${t.hora}** ` : ''}${t.titulo}${t.proyecto ? ` _(${t.proyecto})_` : ''}`;
  const bloques = [`# ${textoLargo(hoyISO)}`];
  if (vencidas.length) bloques.push(`## Atrasadas (${vencidas.length})`, vencidas.map(linea).join('\n'));
  bloques.push(`## Hoy (${deHoy.length})`, deHoy.length ? deHoy.map(linea).join('\n') : '_Nada pendiente._');
  return bloques.join('\n\n');
}
