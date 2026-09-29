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

/* ------------------------- movimientos del bróker ------------------------- */

const COMPRA = /^(compra|buy|bought|c|b|adquisici[oó]n)$/i;
const VENTA = /^(venta|sell|sold|v|s|enajenaci[oó]n)$/i;

/**
 * Lee el CSV de operaciones que exporta un bróker. Los nombres de columna
 * cambian de uno a otro, así que se reconocen por sinónimos en español e
 * inglés y se avisa de las filas que no se entienden en vez de inventarlas.
 */
export function importarMovimientosBroker(texto) {
  const filas = leerCSV(texto);
  if (filas.length < 2) return { movimientos: [], avisos: ['El archivo no tiene filas de datos.'] };
  const cabecera = filas[0].map((c) => c.trim().toLowerCase());
  const col = (...nombres) => {
    for (const n of nombres) {
      const i = cabecera.findIndex((c) => c === n);
      if (i >= 0) return i;
    }
    for (const n of nombres) {
      const i = cabecera.findIndex((c) => c.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iFecha = col('fecha', 'date', 'trade date');
  const iTipo = col('tipo', 'operacion', 'operación', 'side', 'type', 'action');
  const iTicker = col('ticker', 'simbolo', 'símbolo', 'symbol', 'instrumento', 'activo');
  const iCantidad = col('cantidad', 'titulos', 'títulos', 'quantity', 'shares', 'qty');
  const iPrecio = col('precio', 'price');
  const iComision = col('comision', 'comisión', 'fee', 'commission', 'gastos');

  const avisos = [];
  if (iTicker < 0) avisos.push('No se encontró la columna del ticker: revisa el archivo.');
  if (iCantidad < 0) avisos.push('No se encontró la columna de cantidad.');
  if (iTicker < 0 || iCantidad < 0) return { movimientos: [], avisos };

  const numero = (v) => {
    // Un bróker escribe 1.234,56 y otro 1,234.56. Con los dos separadores
    // presentes, el último manda. Con uno solo hay que adivinar: separador
    // seguido de exactamente tres cifras es de millares (1.234 son mil
    // doscientos treinta y cuatro), salvo que lo de delante sea un cero, que
    // entonces es decimal de verdad (0.001).
    const s = String(v || '').replace(/[^0-9,.-]/g, '');
    if (!s) return 0;
    const tieneComa = s.includes(',');
    const tienePunto = s.includes('.');
    let normalizado = s;
    if (tieneComa && tienePunto) {
      normalizado = s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
    } else if (tieneComa || tienePunto) {
      const separador = tieneComa ? ',' : '.';
      const [entera, decimal = ''] = s.split(separador);
      const esMillares = decimal.length === 3 && s.split(separador).length === 2
        && entera.replace('-', '') !== '0' && entera !== '';
      normalizado = esMillares ? entera + decimal : s.replace(separador, '.');
    }
    return Math.abs(Number(normalizado) || 0);
  };

  const movimientos = [];
  filas.slice(1).forEach((f, i) => {
    const ticker = (f[iTicker] || '').trim().toUpperCase();
    if (!ticker) return;
    const bruto = (f[iTipo] || '').trim();
    const cantidadCruda = f[iCantidad];
    const tipo = COMPRA.test(bruto) ? 'compra'
      : VENTA.test(bruto) ? 'venta'
        : String(cantidadCruda).trim().startsWith('-') ? 'venta' : 'compra';
    const cantidad = numero(cantidadCruda);
    if (!cantidad) { avisos.push(`Fila ${i + 2} (${ticker}): sin cantidad, se salta.`); return; }
    movimientos.push({
      fecha: (f[iFecha] || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || fechaSuelta(f[iFecha]),
      tipo,
      ticker,
      cantidad,
      precio: iPrecio >= 0 ? numero(f[iPrecio]) : 0,
      comision: iComision >= 0 ? numero(f[iComision]) : 0,
    });
  });

  if (!movimientos.length) avisos.push('No se reconoció ninguna operación.');
  return { movimientos: movimientos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))), avisos };
}

/** dd/mm/aaaa o dd-mm-aaaa, que es como lo escriben casi todos. */
function fechaSuelta(txt) {
  const m = String(txt || '').match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return null;
  const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${anio}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

/**
 * Reconstruye la cartera a partir de los movimientos, emparejando ventas con
 * compras por **FIFO** (primera que entra, primera que sale), que es el método
 * que se usa para calcular la plusvalía.
 *
 * Devuelve las posiciones abiertas con su coste medio, las operaciones cerradas
 * con su resultado, y los avisos de lo que no cuadra.
 */
export function reconstruirPosiciones(movimientos = []) {
  const lotes = new Map();       // ticker -> [{ cantidad, precio, fecha }]
  const operaciones = [];
  const avisos = [];

  for (const m of movimientos) {
    if (!lotes.has(m.ticker)) lotes.set(m.ticker, []);
    const cola = lotes.get(m.ticker);

    if (m.tipo === 'compra') {
      cola.push({ cantidad: m.cantidad, precio: m.precio, fecha: m.fecha, comision: m.comision });
      continue;
    }

    let porVender = m.cantidad;
    while (porVender > 0 && cola.length) {
      const lote = cola[0];
      const usado = Math.min(lote.cantidad, porVender);
      operaciones.push({
        ticker: m.ticker,
        lado: 'largo',
        cantidad: usado,
        entrada: lote.precio,
        salida: m.precio,
        fechaEntrada: lote.fecha,
        fechaSalida: m.fecha,
        comisiones: redondea((m.comision * usado) / m.cantidad + (lote.comision || 0) * (usado / (lote.cantidad || 1))),
      });
      lote.cantidad -= usado;
      porVender -= usado;
      if (lote.cantidad <= 0.0000001) cola.shift();
    }
    if (porVender > 0) {
      avisos.push(`${m.ticker}: se venden ${redondea(porVender)} títulos que no aparecen comprados antes. ¿Falta histórico?`);
    }
  }

  const posiciones = [];
  for (const [ticker, cola] of lotes) {
    const cantidad = cola.reduce((s, l) => s + l.cantidad, 0);
    if (cantidad <= 0.0000001) continue;
    const coste = cola.reduce((s, l) => s + l.cantidad * l.precio, 0);
    posiciones.push({
      ticker,
      cantidad: redondea(cantidad, 4),
      entrada: redondea(coste / cantidad, 4),
      precio: redondea(coste / cantidad, 4),
      sector: '',
      tesis: '',
      revisadaEn: null,
    });
  }

  return {
    posiciones: posiciones.sort((a, b) => a.ticker.localeCompare(b.ticker)),
    operaciones,
    avisos,
    resumen: `${posiciones.length} posiciones abiertas y ${operaciones.length} operaciones cerradas.`,
  };
}

function redondea(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.round((Number(n) || 0) * f) / f;
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
