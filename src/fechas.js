/**
 * fechas.js — Fechas sin sorpresas de zona horaria y el "método comercial"
 * (año de 360 días, mes de 30) que usa la liquidación laboral colombiana.
 *
 * Todo se maneja con cadenas 'YYYY-MM-DD'. Nunca se usa `new Date('2026-01-01')`
 * para operar, porque el navegador la interpreta en UTC y en Colombia (UTC-5)
 * eso corre un día hacia atrás.
 */

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function partes(iso) {
  const m = RE.exec(String(iso || '').slice(0, 10));
  if (!m) throw new Error(`Fecha inválida: ${iso}`);
  return { anio: +m[1], mes: +m[2], dia: +m[3] };
}

export function esFecha(iso) {
  return RE.test(String(iso || '').slice(0, 10));
}

/** Date local (mediodía) para operar sin que el huso mueva el día. */
export function aDate(iso) {
  const { anio, mes, dia } = partes(iso);
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

export function aISO(fecha) {
  const d = fecha instanceof Date ? fecha : aDate(fecha);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function hoy() {
  return aISO(new Date());
}

export function sumarDias(iso, dias) {
  const d = aDate(iso);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

export function sumarMeses(iso, meses) {
  const { anio, mes, dia } = partes(iso);
  const d = new Date(anio, mes - 1 + meses, 1, 12);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return aISO(d);
}

/** Días calendario reales entre dos fechas (fin excluido). */
export function diasCalendario(desde, hasta) {
  return Math.round((aDate(hasta) - aDate(desde)) / 86400000);
}

/**
 * Días por el método comercial 360 (mes de 30 días), que es el que usan las
 * fórmulas de prestaciones sociales. El día de terminación se cuenta, por eso
 * del 1 al 30 de un mes hay 30 días.
 *
 * Reglas usadas (las de la práctica laboral colombiana):
 *  - si el día es 31, se toma como 30;
 *  - si el contrato termina el último día de febrero y el mes se trabajó
 *    completo, febrero se completa a 30 días.
 */
export function dias360(desde, hasta) {
  const a = partes(desde);
  const b = partes(hasta);
  let d1 = a.dia;
  let d2 = b.dia;
  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;
  // Febrero se completa a 30 solo cuando el mes se trabajó entero: del 1 al 28
  // se pagan 30 días, pero del 10 al 28 se pagan los 19 días reales.
  const febreroCompleto = b.mes === 2
    && d2 === ultimoDiaMes(b.anio, 2)
    && !(a.anio === b.anio && a.mes === 2 && a.dia > 1);
  if (febreroCompleto) d2 = 30;
  return (b.anio - a.anio) * 360 + (b.mes - a.mes) * 30 + (d2 - d1) + 1;
}

export function ultimoDiaMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

export function finDeMes(iso) {
  const { anio, mes } = partes(iso);
  return aISO(new Date(anio, mes - 1, ultimoDiaMes(anio, mes), 12));
}

export function inicioDeMes(iso) {
  const { anio, mes } = partes(iso);
  return aISO(new Date(anio, mes - 1, 1, 12));
}

/** 0 = domingo … 6 = sábado */
export function diaSemana(iso) {
  return aDate(iso).getDay();
}

export function esDomingo(iso) {
  return diaSemana(iso) === 0;
}

export function rango(desde, hasta) {
  const salida = [];
  let cursor = desde;
  let guarda = 0;
  while (cursor <= hasta && guarda++ < 4000) {
    salida.push(cursor);
    cursor = sumarDias(cursor, 1);
  }
  return salida;
}

/** Intersección de [a1,a2] con [b1,b2], o null si no se tocan. */
export function interseccion(a1, a2, b1, b2) {
  const desde = a1 > b1 ? a1 : b1;
  const hasta = a2 < b2 ? a2 : b2;
  return desde <= hasta ? { desde, hasta } : null;
}

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function formatoLargo(iso) {
  const { anio, mes, dia } = partes(iso);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

export function formatoCorto(iso) {
  const { anio, mes, dia } = partes(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dia)}/${p(mes)}/${anio}`;
}

/** Minutos desde medianoche a partir de 'HH:MM'. */
export function minutos(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  const h = +m[1];
  const min = +m[2];
  if (h > 24 || min > 59) throw new Error(`Hora inválida: ${hhmm}`);
  return h * 60 + min;
}

export function aHHMM(min) {
  const m = ((min % 1440) + 1440) % 1440;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(m / 60))}:${p(m % 60)}`;
}
