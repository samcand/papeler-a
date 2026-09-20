/**
 * naturales.js — Entrada rápida: una línea escrita como se habla.
 *
 *   "Revisar tesis de NVDA mañana 9am p1 #Inversiones @analisis cada tercer viernes"
 *
 * Devuelve la tarea ya desmenuzada (título, fecha, hora, prioridad, etiquetas,
 * proyecto y regla de repetición). Lo que no reconoce se queda en el título:
 * más vale un título con una palabra de sobra que perder lo que el usuario quiso decir.
 */

import { aISO, deISO, diaSemana, fecha, finDeMes, hoy, nEsimoDiaDelMes, normalizaHora, sumarDias, sumarMeses, MESES } from './fechas.js';
import { parseRegla, siguienteFecha } from './recurrencia.js';

const DIA_NOMBRE = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};
const ORDINALES = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, ultimo: -1 };

function limpia(txt) {
  return String(txt).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Frases que podrían describir una repetición, de la más específica a la más general. */
const FRASES_REGLA = [
  /\bcada\s+(?:\d+\s+)?(?:primer|segundo|tercer|cuarto|[úu]ltimo)\s+(?:domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)(?:\s+del\s+mes)?/i,
  /\bel\s+[úu]ltimo\s+d[íi]a\s+(?:del|de cada)\s+mes/i,
  /\bel\s+\d{1,2}\s+de\s+cada\s+mes/i,
  /\bcada\s+(?:\d+\s+)?d[íi]as?\s+h[áa]biles?/i,
  /\bcada\s+d[íi]a\s+h[áa]bil/i,
  /\bcada\s+(?:\d+\s+)?(?:domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)s?(?:\s+y\s+(?:domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)s?)*/i,
  /\bcada\s+(?:\d+\s+)?(?:d[íi]as?|semanas?|meses?|mes|a[ñn]os?)\b(?:\s+el\s+\d{1,2})?/i,
  /\bcada\s+\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
  /\b(?:diariamente|semanalmente|mensualmente|anualmente)\b/i,
];

const SUFIJO_DESDE_COMPLETADA = /\s*(?:desde|tras|despu[ée]s de)\s+(?:que\s+)?(?:la\s+)?(?:complet\w*|termin\w*|hech\w*)/i;

/** Extrae la primera frase de repetición del texto. */
function sacarRegla(texto) {
  for (const re of FRASES_REGLA) {
    const m = texto.match(re);
    if (!m) continue;
    let frase = m[0];
    let resto = texto.slice(0, m.index) + texto.slice(m.index + frase.length);
    const cola = resto.match(SUFIJO_DESDE_COMPLETADA);
    if (cola) {
      frase += ' ' + cola[0];
      resto = resto.replace(SUFIJO_DESDE_COMPLETADA, '');
    }
    const regla = parseRegla(frase);
    if (regla) return { regla, resto };
  }
  return { regla: null, resto: texto };
}

/** Próxima ocurrencia de un día de la semana (hoy no cuenta salvo `incluirHoy`). */
function proximoDiaSemana(ref, objetivo, saltarSemana = false) {
  const actual = diaSemana(ref);
  let delta = (objetivo - actual + 7) % 7;
  if (delta === 0) delta = 7;
  if (saltarSemana && delta < 7) delta += 7;
  return sumarDias(ref, delta);
}

/**
 * Busca una fecha en el texto. Devuelve { fecha, resto } con la fecha en ISO.
 * Se prueban los patrones de más específico a más genérico para que
 * "15 de octubre" no lo capture antes el patrón de "15".
 */
function sacarFecha(texto, ref) {
  const pruebas = [
    // pasado mañana / mañana / hoy / ayer
    [/\bpasado\s+ma[ñn]ana\b/i, () => sumarDias(ref, 2)],
    [/\bma[ñn]ana\b/i, () => sumarDias(ref, 1)],
    [/\bhoy\b/i, () => ref],
    [/\bayer\b/i, () => sumarDias(ref, -1)],
    [/\bfin\s+de\s+mes\b/i, () => finDeMes(ref)],
    [/\b(?:este|el)\s+fin\s+de\s+semana\b/i, () => proximoDiaSemana(ref, 6)],
    // tercer viernes (vencimiento de opciones), sin "cada"
    [/\b(primer|primero|segundo|tercer|tercero|cuarto|[úu]ltimo)\s+(domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)\b(?:\s+del\s+mes)?/i,
      (m) => {
        const n = ORDINALES[limpia(m[1])];
        const dia = DIA_NOMBRE[limpia(m[2])];
        const candidato = nEsimoDiaDelMes(ref.getFullYear(), ref.getMonth(), dia, n);
        if (candidato >= ref) return candidato;
        const sig = sumarMeses(fecha(ref.getFullYear(), ref.getMonth(), 1), 1);
        return nEsimoDiaDelMes(sig.getFullYear(), sig.getMonth(), dia, n);
      }],
    // "en 3 días" / "en 2 semanas" / "en un mes"
    [/\ben\s+(\d+|un|una|dos|tres)\s+(d[íi]as?|semanas?|meses?|a[ñn]os?)\b/i, (m) => {
      const num = { un: 1, una: 1, dos: 2, tres: 3 }[limpia(m[1])] ?? Number(m[1]);
      const u = limpia(m[2]);
      if (u.startsWith('dia')) return sumarDias(ref, num);
      if (u.startsWith('semana')) return sumarDias(ref, num * 7);
      if (u.startsWith('mes')) return sumarMeses(ref, num);
      return sumarMeses(ref, num * 12);
    }],
    // "próximo lunes" / "el lunes" / "lunes"
    [/\b(?:pr[óo]ximo|siguiente)\s+(domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)\b/i,
      (m) => proximoDiaSemana(ref, DIA_NOMBRE[limpia(m[1])], true)],
    [/\b(?:este\s+|el\s+)?(domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)\b/i,
      (m) => proximoDiaSemana(ref, DIA_NOMBRE[limpia(m[1])])],
    // "15 de octubre [de 2026]"
    [/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?/i,
      (m) => {
        const mes = MESES.findIndex((x) => limpia(x).startsWith(limpia(m[2]).slice(0, 4)));
        const anio = m[3] ? Number(m[3]) : ref.getFullYear();
        const cand = fecha(anio, mes, Number(m[1]));
        return (!m[3] && cand < ref) ? fecha(anio + 1, mes, Number(m[1])) : cand;
      }],
    // "12 oct" / "12 sep 2026"
    [/\b(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\w*\.?(?:\s+(\d{4}))?/i,
      (m) => {
        const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'].indexOf(limpia(m[2]));
        const anio = m[3] ? Number(m[3]) : ref.getFullYear();
        const cand = fecha(anio, mes, Number(m[1]));
        return (!m[3] && cand < ref) ? fecha(anio + 1, mes, Number(m[1])) : cand;
      }],
    // ISO explícito
    [/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => deISO(m[0])],
    // "12/10" o "12/10/2026" (día/mes, como se escribe en español)
    [/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/, (m) => {
      const anio = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : ref.getFullYear();
      const cand = fecha(anio, Number(m[2]) - 1, Number(m[1]));
      return (!m[3] && cand < ref) ? fecha(anio + 1, Number(m[2]) - 1, Number(m[1])) : cand;
    }],
  ];

  for (const [re, calcular] of pruebas) {
    const m = texto.match(re);
    if (!m) continue;
    const d = calcular(m);
    if (!d || Number.isNaN(d.getTime())) continue;
    const resto = texto.slice(0, m.index) + texto.slice(m.index + m[0].length);
    return { fecha: aISO(d), resto };
  }
  return { fecha: null, resto: texto };
}

function sacarHora(texto) {
  const pruebas = [
    /\ba\s+las?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i,
    /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
    /\b(\d{1,2}\s*(?:am|pm))/i,
  ];
  for (const re of pruebas) {
    const m = texto.match(re);
    if (!m) continue;
    const hora = normalizaHora(m[1].replace(/\s+/g, ''));
    if (!hora) continue;
    return { hora, resto: texto.slice(0, m.index) + texto.slice(m.index + m[0].length) };
  }
  return { hora: null, resto: texto };
}

function sacarDuracion(texto) {
  const m = texto.match(/\b(?:por\s+)?(\d+)\s*(h|hr|hrs|horas?|m|min|mins|minutos?)\b/i);
  if (!m) return { duracion: null, resto: texto };
  const n = Number(m[1]);
  const unidad = limpia(m[2]);
  const minutos = unidad.startsWith('h') ? n * 60 : n;
  return { duracion: minutos, resto: texto.slice(0, m.index) + texto.slice(m.index + m[0].length) };
}

function sacarPrioridad(texto) {
  const m = texto.match(/(?:^|\s)(?:p([1-4])|!!([1-4]))(?=\s|$)/i);
  if (!m) return { prioridad: null, resto: texto };
  return {
    prioridad: Number(m[1] || m[2]),
    resto: texto.slice(0, m.index) + ' ' + texto.slice(m.index + m[0].length),
  };
}

function sacarMarcas(texto, simbolo) {
  const out = [];
  const re = new RegExp(`(?:^|\\s)\\${simbolo}([\\wáéíóúñÁÉÍÓÚÑ.-]+|"[^"]+")`, 'g');
  const resto = texto.replace(re, (_, valor) => {
    out.push(valor.replace(/"/g, ''));
    return ' ';
  });
  return { valores: out, resto };
}

/**
 * Convierte la línea escrita en los campos de una tarea.
 * `opciones.hoy` permite fijar el "hoy" en las pruebas.
 */
export function parseEntrada(texto, opciones = {}) {
  const ref = opciones.hoy ? deISO(opciones.hoy) : hoy();
  let resto = String(texto || '');

  // El plazo va lo primero: "antes del 30" no debe leerse como la fecha de hacerla.
  const lim = sacarLimite(resto, ref); resto = lim.resto;
  const proyectos = sacarMarcas(resto, '#'); resto = proyectos.resto;
  const etiquetas = sacarMarcas(resto, '@'); resto = etiquetas.resto;
  const prio = sacarPrioridad(resto); resto = prio.resto;
  const rec = sacarRegla(resto); resto = rec.resto;
  const dur = sacarDuracion(resto); resto = dur.resto;
  const h = sacarHora(resto); resto = h.resto;
  // La fecha va después de la hora: así "9am" no se lee como día 9.
  const f = rec.regla && !/\b(hoy|ma[ñn]ana|el\s+\d|en\s+\d)/i.test(resto)
    ? { fecha: null, resto }
    : sacarFecha(resto, ref);
  resto = f.resto;

  const titulo = resto.replace(/\s+/g, ' ').replace(/^[\s,;-]+|[\s,;-]+$/g, '');

  // Una tarea repetida sin fecha explícita arranca en su primera ocurrencia,
  // contando desde ayer para que "cada lunes" escrito un lunes sea hoy mismo.
  const fechaFinal = f.fecha
    || (rec.regla ? siguienteFecha(rec.regla, aISO(sumarDias(ref, -1))) : null);

  return {
    titulo: titulo || String(texto || '').trim(),
    fecha: fechaFinal,
    limite: lim.limite,
    hora: h.hora,
    prioridad: prio.prioridad,
    etiquetas: etiquetas.valores,
    proyecto: proyectos.valores[0] || null,
    regla: rec.regla,
    duracion: dur.duracion,
  };
}

/**
 * El plazo, escrito como se dice: "antes del 30 de octubre", "límite 15/11",
 * "vence el viernes". Se saca antes que la fecha normal, porque si no "antes
 * del 30" se leería como "el 30" y las dos cosas acabarían siendo la misma.
 */
function sacarLimite(texto, ref) {
  // Ojo con el espacio final: si una alternativa ya se lleva el suyo, exigir
  // otro deja fuera "vence el viernes". Cada alternativa termina en palabra.
  const marca = /\b(?:para\s+antes\s+del?|antes\s+del?|fecha\s+l[íi]mite|l[íi]mite|vence(?:\s+el)?)\b:?\s+/i;
  const m = marca.exec(texto);
  if (!m) return { limite: null, resto: texto };

  const despues = texto.slice(m.index + m[0].length);
  const f = sacarFecha(despues, ref);
  if (!f.fecha) return { limite: null, resto: texto };

  // Se quita la marca y lo que la fecha se llevó, y se deja el resto del título.
  const resto = texto.slice(0, m.index) + f.resto;
  return { limite: aISO(f.fecha), resto };
}

/** Escribe la tarea de vuelta como una línea, para editarla con el mismo lenguaje. */
export function aTextoEntrada(tarea) {
  const partes = [tarea.titulo];
  if (tarea.fecha) partes.push(tarea.fecha);
  if (tarea.limite) partes.push(`antes del ${tarea.limite}`);
  if (tarea.hora) partes.push(tarea.hora);
  if (tarea.prioridad) partes.push('p' + tarea.prioridad);
  if (tarea.proyecto) partes.push('#' + tarea.proyecto);
  for (const e of tarea.etiquetas || []) partes.push('@' + e);
  return partes.join(' ');
}
