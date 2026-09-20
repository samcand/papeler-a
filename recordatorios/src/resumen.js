/**
 * resumen.js — El resumen del día: lo que la app te diría por la mañana si
 * pudiera darte un toque en el hombro.
 *
 * Es una función pura sobre el estado: la misma pieza sirve para la tarjeta de
 * "buenos días" en la pantalla Hoy, para el texto de la notificación y para el
 * resumen que se copia o se exporta.
 */

import { aISO, deISO, hoy, sumarDias, textoLargo } from './fechas.js';
import { alertasCartera } from './inversiones.js';
import { cargaDelDia, enBandeja, estadisticas, estaVencida, paraHoy } from './modelo.js';
import { formatoMinutos, resumenTiempo } from './tiempo.js';
import { rachaHabito } from './plantillas.js';

/** Saludo según la hora, sin cursiladas. */
export function saludo(fecha = new Date()) {
  const h = fecha.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Arma el resumen del día a partir del estado completo de la app.
 * `opciones.ahora` permite fijar la hora en las pruebas.
 */
export function resumenDelDia(estado = {}, hoyISO = aISO(hoy()), opciones = {}) {
  const ahora = opciones.ahora || new Date();
  const tareas = (estado.tareas || []).filter((t) => !t.padre);
  const pendientes = tareas.filter((t) => !t.completada);
  const vencidas = pendientes.filter((t) => estaVencida(t, hoyISO));
  const deHoy = pendientes.filter((t) => t.fecha === hoyISO);
  const conHora = [...deHoy].filter((t) => t.hora).sort((a, b) => a.hora.localeCompare(b.hora));
  const jornada = estado.ajustes?.jornada || { inicio: '08:00', fin: '18:00' };
  const minutos = minutosDeJornada(jornada);
  const carga = cargaDelDia(paraHoy(tareas, hoyISO), minutos);
  const bandeja = enBandeja(tareas);
  const est = estadisticas(estado.historial || [], hoyISO, estado.ajustes?.metaDiaria || 5);
  const tiempo = resumenTiempo(estado.tiempo || [], hoyISO);
  const inv = estado.inversiones || {};
  const alertas = alertasCartera(inv.posiciones || [], inv.reglas || {}, hoyISO, inv.efectivo || 0);
  const urgentes = [...vencidas, ...deHoy].filter((t) => t.prioridad === 1);

  // Las tres cosas que harían que el día valga la pena: lo urgente primero,
  // después lo que tiene hora, y si no, lo más prioritario del día.
  const candidatas = [...urgentes, ...conHora, ...deHoy.sort((a, b) => a.prioridad - b.prioridad)];
  const foco = [];
  for (const t of candidatas) {
    if (foco.length >= 3) break;
    if (!foco.some((x) => x.id === t.id)) foco.push(t);
  }

  const avisos = [];
  if (vencidas.length) avisos.push(`${vencidas.length} tarea${vencidas.length === 1 ? '' : 's'} de días anteriores: decide si van hoy o se reprograman.`);
  if (carga.excedido) avisos.push(`Tienes ${formatoMinutos(carga.minutos)} comprometidos y el día da para ${formatoMinutos(carga.disponibles)}.`);
  if (bandeja.length >= 5) avisos.push(`La bandeja tiene ${bandeja.length} cosas sin clasificar.`);
  const alertasAltas = alertas.filter((a) => a.nivel === 'alto');
  if (alertasAltas.length) avisos.push(`Cartera: ${alertasAltas[0].texto}`);
  const habitosHoy = (estado.habitos || []).filter((h) => !h.dias?.includes(hoyISO));
  if (habitosHoy.length && habitosHoy.length < (estado.habitos || []).length) {
    avisos.push(`Hábitos sin marcar: ${habitosHoy.map((h) => h.nombre).join(', ')}.`);
  }

  const mañana = aISO(sumarDias(hoyISO, 1));
  const deMañana = pendientes.filter((t) => t.fecha === mañana).length;

  return {
    fecha: hoyISO,
    saludo: saludo(ahora),
    titulo: `${saludo(ahora)} · ${textoLargo(hoyISO)}`,
    total: deHoy.length + vencidas.length,
    hoy: deHoy.length,
    vencidas: vencidas.length,
    urgentes: urgentes.length,
    primera: conHora[0] || null,
    conHora,
    foco,
    carga,
    bandeja: bandeja.length,
    racha: est.racha,
    completadasAyer: (estado.historial || []).filter((h) => h.fecha === aISO(sumarDias(hoyISO, -1))).length,
    enfoqueAyer: (estado.tiempo || []).filter((r) => r.fecha === aISO(sumarDias(hoyISO, -1))).reduce((s, r) => s + r.minutos, 0),
    enfoqueHoy: tiempo.hoy,
    alertasCartera: alertas.length,
    mañana: deMañana,
    avisos,
    habitos: (estado.habitos || []).map((h) => ({ nombre: h.nombre, hecho: !!h.dias?.includes(hoyISO), racha: rachaHabito(h.dias || [], hoyISO).racha })),
  };
}

function minutosDeJornada(jornada) {
  const [hi, mi] = String(jornada.inicio || '08:00').split(':').map(Number);
  const [hf, mf] = String(jornada.fin || '18:00').split(':').map(Number);
  return Math.max(60, (hf * 60 + mf) - (hi * 60 + mi));
}

/** Una línea para el cuerpo de la notificación: tiene que caber en el aviso. */
export function textoNotificacion(resumen) {
  const trozos = [];
  if (resumen.vencidas) trozos.push(`${resumen.vencidas} atrasada${resumen.vencidas === 1 ? '' : 's'}`);
  trozos.push(`${resumen.hoy} para hoy`);
  if (resumen.primera) trozos.push(`primero: ${resumen.primera.hora} ${resumen.primera.titulo}`);
  else if (resumen.foco[0]) trozos.push(`empieza por: ${resumen.foco[0].titulo}`);
  return trozos.join(' · ');
}

/** El resumen completo en texto, para copiarlo o mandárselo a alguien. */
export function textoResumen(resumen) {
  const lineas = [resumen.titulo, ''];
  if (resumen.vencidas) lineas.push(`⚠ ${resumen.vencidas} de días anteriores`);
  lineas.push(`${resumen.hoy} tareas para hoy · ${formatoMinutos(resumen.carga.minutos)} comprometidos`);
  if (resumen.foco.length) {
    lineas.push('', 'Lo que haría que el día valga la pena:');
    resumen.foco.forEach((t, i) => lineas.push(`  ${i + 1}. ${t.hora ? `${t.hora} ` : ''}${t.titulo}`));
  }
  if (resumen.conHora.length) {
    lineas.push('', 'Con hora:');
    for (const t of resumen.conHora) lineas.push(`  ${t.hora} ${t.titulo}`);
  }
  if (resumen.avisos.length) {
    lineas.push('', 'Ojo con:');
    for (const a of resumen.avisos) lineas.push(`  · ${a}`);
  }
  return lineas.join('\n');
}

/**
 * ¿Toca enseñar el resumen? Solo una vez al día y a partir de la hora fijada;
 * un saludo que sale cinco veces deja de leerse a la segunda.
 */
export function tocaResumen(ajustes = {}, hoyISO = aISO(hoy()), ahora = new Date()) {
  if (ajustes.resumenMatutino === false) return false;
  if (ajustes.resumenVistoEn === hoyISO) return false;
  const [h, m] = String(ajustes.horaResumen || '07:00').split(':').map(Number);
  return ahora.getHours() * 60 + ahora.getMinutes() >= h * 60 + m;
}

/* ------------------------------------------------------------------ *
 * Resumen semanal para el equipo
 * ------------------------------------------------------------------ */

/**
 * Qué se cerró, qué se movió y qué está bloqueado: el correo del viernes,
 * escrito solo. Sale de lo que ya está guardado, así que no adorna nada — si la
 * semana fue floja, se nota, y eso es justamente para lo que sirve.
 */
export function resumenSemanal(estado = {}, hastaISO = aISO(hoy()), opciones = {}) {
  const dias = opciones.dias || 7;
  const desde = aISO(sumarDias(hastaISO, -dias + 1));
  const tareas = (estado.tareas || []).filter((t) => !t.padre);

  const cerradas = (estado.historial || []).filter((h) => h.fecha >= desde && h.fecha <= hastaISO);
  const creadas = tareas.filter((t) => String(t.creadaEn).slice(0, 10) >= desde && String(t.creadaEn).slice(0, 10) <= hastaISO);
  const pendientes = tareas.filter((t) => !t.completada);
  const bloqueadas = pendientes.filter((t) => t.espera?.quien);
  const movidas = pendientes.filter((t) => (t.aplazamientos || 0) > 0 && t.fecha && t.fecha >= desde);
  const atrasadas = pendientes.filter((t) => estaVencida(t, hastaISO));

  const proximas = pendientes
    .filter((t) => t.fecha && t.fecha > hastaISO && t.fecha <= aISO(sumarDias(hastaISO, 7)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 8);

  const porProyecto = new Map();
  for (const h of cerradas) {
    const clave = h.proyecto || tareas.find((t) => t.id === h.tareaId)?.proyecto || 'Sin proyecto';
    porProyecto.set(clave, (porProyecto.get(clave) || 0) + 1);
  }

  return {
    desde, hasta: hastaISO, dias,
    cerradas, creadas, bloqueadas, movidas, atrasadas, proximas,
    porProyecto: [...porProyecto.entries()].map(([proyecto, n]) => ({ proyecto, n })).sort((a, b) => b.n - a.n),
    saldo: cerradas.length - creadas.length,
  };
}

/** El resumen semanal en texto plano, listo para pegar en un correo. */
export function textoResumenSemanal(r) {
  const lineas = [`Semana del ${textoLargo(r.desde)} al ${textoLargo(r.hasta)}`, ''];

  lineas.push(`Cerradas: ${r.cerradas.length} · Nuevas: ${r.creadas.length}`
    + ` · Saldo: ${r.saldo >= 0 ? '+' : ''}${r.saldo}`);

  if (r.porProyecto.length) {
    lineas.push('', 'Por proyecto:');
    for (const p of r.porProyecto) lineas.push(`  · ${p.proyecto}: ${p.n}`);
  }
  if (r.bloqueadas.length) {
    lineas.push('', 'Bloqueado, esperando a alguien:');
    for (const t of r.bloqueadas) lineas.push(`  · ${t.titulo} — ${t.espera.quien}`);
  }
  if (r.atrasadas.length) {
    lineas.push('', `Atrasado (${r.atrasadas.length}):`);
    for (const t of r.atrasadas.slice(0, 8)) lineas.push(`  · ${t.titulo} (${t.fecha})`);
  }
  if (r.proximas.length) {
    lineas.push('', 'La semana que viene:');
    for (const t of r.proximas) lineas.push(`  · ${t.fecha} ${t.titulo}`);
  }
  if (!r.cerradas.length && !r.proximas.length) {
    lineas.push('', 'Sin movimiento esta semana. Si no es verdad, es que no se apuntó.');
  }
  return lineas.join('\n');
}
