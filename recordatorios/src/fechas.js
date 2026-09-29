/**
 * fechas.js — Aritmética de fechas sin librerías.
 *
 * Todo se maneja en horario local y con fechas "a mediodía" internamente para
 * que los cambios de horario de verano no muevan un día entero. La forma
 * canónica de guardar una fecha es la cadena ISO corta `YYYY-MM-DD`.
 */

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Fecha local a las 12:00 (evita que el horario de verano cruce el día). */
export function fecha(anio, mes, dia) {
  return new Date(anio, mes, dia, 12, 0, 0, 0);
}

export function hoy(ref = new Date()) {
  return fecha(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

export function aISO(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function deISO(iso) {
  // Un Date recibido de fuera puede venir a medianoche; se normaliza a mediodía
  // para que restar fechas no se vaya un día por el horario de verano.
  if (iso instanceof Date) return fecha(iso.getFullYear(), iso.getMonth(), iso.getDate());
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return fecha(a, (m || 1) - 1, d || 1);
}

export function sumarDias(d, n) {
  const x = deISO(d);
  return fecha(x.getFullYear(), x.getMonth(), x.getDate() + n);
}

/** Suma meses recortando el día si el mes destino es más corto (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(d, n) {
  const x = deISO(d);
  const destino = fecha(x.getFullYear(), x.getMonth() + n, 1);
  const ultimo = diasDelMes(destino.getFullYear(), destino.getMonth());
  return fecha(destino.getFullYear(), destino.getMonth(), Math.min(x.getDate(), ultimo));
}

export function sumarAnios(d, n) {
  const x = deISO(d);
  return sumarMeses(x, n * 12);
}

export function diasDelMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate();
}

export function finDeMes(d) {
  const x = deISO(d);
  return fecha(x.getFullYear(), x.getMonth(), diasDelMes(x.getFullYear(), x.getMonth()));
}

export function diferenciaDias(a, b) {
  const ms = deISO(b).getTime() - deISO(a).getTime();
  return Math.round(ms / 86400000);
}

export function mismoDia(a, b) {
  return aISO(a) === aISO(b);
}

export function diaSemana(d) {
  return deISO(d).getDay();
}

export function esFinDeSemana(d) {
  const n = diaSemana(d);
  return n === 0 || n === 6;
}

export function esHabil(d, feriados = []) {
  return !esFinDeSemana(d) && !feriados.includes(aISO(d));
}

/** Siguiente día hábil estrictamente posterior a `d`. */
export function siguienteHabil(d, feriados = []) {
  let x = sumarDias(d, 1);
  let guarda = 0;
  while (!esHabil(x, feriados) && guarda++ < 30) x = sumarDias(x, 1);
  return x;
}

/** Lunes de la semana de `d` (la semana empieza en lunes). */
export function inicioSemana(d, primerDia = 1) {
  const x = deISO(d);
  const delta = (x.getDay() - primerDia + 7) % 7;
  return sumarDias(x, -delta);
}

/**
 * N-ésimo día de la semana de un mes: `nEsimoDiaDelMes(2026, 8, 5, 3)` es el
 * tercer viernes de septiembre de 2026 (el día en que vencen las opciones).
 * Con `n = -1` devuelve el último del mes.
 */
export function nEsimoDiaDelMes(anio, mes, dia, n) {
  if (n < 0) {
    const ultimo = fecha(anio, mes, diasDelMes(anio, mes));
    const atras = (ultimo.getDay() - dia + 7) % 7;
    return sumarDias(ultimo, -atras);
  }
  const primero = fecha(anio, mes, 1);
  const adelante = (dia - primero.getDay() + 7) % 7;
  return sumarDias(primero, adelante + (n - 1) * 7);
}

/** "hoy", "mañana", "vie 12 sep", "hace 3 días". */
export function textoRelativo(d, ref = hoy()) {
  const dias = diferenciaDias(ref, d);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  if (dias === 2) return 'pasado mañana';
  if (dias < 0) return `hace ${Math.abs(dias)} días`;
  const x = deISO(d);
  if (dias < 7) return DIAS_CORTO[x.getDay()];
  const mismoAnio = x.getFullYear() === deISO(ref).getFullYear();
  return `${DIAS_CORTO[x.getDay()]} ${x.getDate()} ${MESES_CORTO[x.getMonth()]}${mismoAnio ? '' : ' ' + x.getFullYear()}`;
}

export function textoLargo(d) {
  const x = deISO(d);
  return `${DIAS[x.getDay()]} ${x.getDate()} de ${MESES[x.getMonth()]} de ${x.getFullYear()}`;
}

/** "9", "9am", "9:30", "21:05", "9 pm" -> "09:30" en 24 h; null si no se entiende. */
export function normalizaHora(txt) {
  if (!txt) return null;
  const m = String(txt).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const sufijo = (m[3] || '').replace(/\./g, '');
  if (sufijo.startsWith('p') && h < 12) h += 12;
  if (sufijo.startsWith('a') && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function minutosDeHora(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function horaTexto(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${sufijo}` : `${h12}:${String(m).padStart(2, '0')}${sufijo}`;
}

/** Une fecha ISO + "HH:MM" en un Date real (para notificaciones). */
export function momento(iso, hora) {
  const d = deISO(iso);
  const [h, m] = (hora || '09:00').split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
}

/** Número de semana ISO-8601, para etiquetar la revisión semanal. */
export function semanaISO(d) {
  const x = deISO(d);
  const jueves = sumarDias(x, 3 - ((x.getDay() + 6) % 7));
  const primero = fecha(jueves.getFullYear(), 0, 1);
  return 1 + Math.round(diferenciaDias(primero, jueves) / 7);
}
