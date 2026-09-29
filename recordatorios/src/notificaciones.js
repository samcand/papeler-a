/**
 * notificaciones.js — Avisos del navegador.
 *
 * Honestidad por delante: sin servidor no hay notificaciones push. Esto avisa
 * mientras la app esté abierta (o instalada y en segundo plano, según el
 * sistema). Para lo que no puede fallar, exporta el calendario .ics y deja que
 * el móvil haga sonar la alarma.
 */

import { aISO, hoy, momento } from './fechas.js';

let temporizadores = [];

export function soportadas() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permiso() {
  return soportadas() ? Notification.permission : 'denegado';
}

export async function pedirPermiso() {
  if (!soportadas()) return 'denegado';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denegado';
  }
}

/**
 * ¿Estamos en franja de silencio? Un aviso ignorado enseña a ignorar los avisos,
 * así que de noche o en clase mejor no sonar.
 */
export function enSilencio(ajustes = {}, ahora = new Date()) {
  const silencio = ajustes.silencio;
  if (!silencio?.activo) return false;
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const aMin = (t) => {
    const [h, m] = String(t || '00:00').split(':').map(Number);
    return h * 60 + m;
  };
  const desde = aMin(silencio.desde || '22:00');
  const hasta = aMin(silencio.hasta || '07:00');
  // Una franja que cruza la medianoche es dos tramos.
  const dentro = desde <= hasta ? (minutos >= desde && minutos < hasta) : (minutos >= desde || minutos < hasta);
  if (dentro) return true;
  const dia = ahora.getDay();
  return (silencio.dias || []).includes(dia);
}

/**
 * ¿Estás en clase ahora mismo? Sale del horario del semestre, que ya tienes
 * puesto. Un aviso que suena en mitad de una clase es un aviso que molesta a
 * treinta personas más.
 */
export function enClase(estado = {}, ahora = new Date()) {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const semestre = estado.docencia?.semestre;
  if (!semestre?.cursos?.length) return null;
  const hoyISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  if (semestre.inicio && hoyISO < semestre.inicio) return null;
  if (semestre.fin && hoyISO > semestre.fin) return null;

  const dia = DIAS[ahora.getDay()];
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const aMin = (t) => {
    const [h, m] = String(t || '').split(':').map(Number);
    return Number.isFinite(h) ? h * 60 + (m || 0) : null;
  };

  for (const curso of semestre.cursos) {
    for (const sesion of curso.horario || []) {
      const nombreDia = typeof sesion.dia === 'number' ? DIAS[sesion.dia] : String(sesion.dia || '').toLowerCase();
      if (nombreDia !== dia) continue;
      const inicio = aMin(sesion.inicio);
      if (inicio == null) continue;
      const fin = aMin(sesion.fin) ?? inicio + (sesion.duracion || 120);
      if (minutos >= inicio && minutos < fin) return { curso: curso.nombre, hasta: sesion.fin || null };
    }
  }
  return null;
}

export function avisar(titulo, cuerpo, opciones = {}) {
  if (!soportadas() || Notification.permission !== 'granted') return null;
  if (!opciones.saltarSilencio && enSilencio(opciones.ajustes || {})) return null;
  // En clase solo pasa lo urgente; el resto espera a que salgas.
  if (!opciones.urgente && opciones.estado && enClase(opciones.estado)) return null;
  try {
    return new Notification(titulo, {
      body: cuerpo,
      icon: opciones.icono || 'assets/icono.svg',
      tag: opciones.tag,
      silent: opciones.silencioso || false,
    });
  } catch {
    return null;
  }
}

/**
 * Programa los avisos de las tareas de hoy que tengan hora.
 * Se vuelve a llamar cada vez que cambian las tareas: primero limpia.
 */
export function programarDelDia(tareas, opciones = {}) {
  cancelarTodo();
  if (permiso() !== 'granted') return 0;
  const ahora = Date.now();
  const hoyISO = opciones.hoy || aISO(hoy());
  let programadas = 0;

  for (const t of tareas) {
    if (t.completada || t.fecha !== hoyISO || !t.hora) continue;
    const minutosAntes = (t.recordatorios && t.recordatorios.length) ? t.recordatorios : [0];
    for (const antes of minutosAntes) {
      const cuando = momento(t.fecha, t.hora).getTime() - antes * 60000;
      const espera = cuando - ahora;
      // El límite de setTimeout es ~24 días; aquí siempre es el mismo día.
      if (espera <= 0 || espera > 86400000) continue;
      temporizadores.push(setTimeout(() => {
        avisar(t.titulo, antes ? `En ${antes} minutos · ${t.hora}` : `Ahora · ${t.hora}`, { tag: t.id });
      }, espera));
      programadas++;
    }
  }
  return programadas;
}

/**
 * Programa el aviso del resumen del día a la hora fijada. Solo funciona con la
 * app abierta (o instalada y viva en segundo plano): sin servidor no hay push,
 * y por eso el resumen también se enseña dentro de la app al entrar.
 */
export function programarResumen(hora, construirTexto) {
  if (permiso() !== 'granted') return null;
  const [h, m] = String(hora || '07:00').split(':').map(Number);
  const cuando = new Date();
  cuando.setHours(h, m, 0, 0);
  const espera = cuando.getTime() - Date.now();
  if (espera <= 0 || espera > 86400000) return null;
  const id = setTimeout(() => {
    const texto = typeof construirTexto === 'function' ? construirTexto() : String(construirTexto || '');
    avisar('Tu día', texto, { tag: 'resumen-dia' });
  }, espera);
  temporizadores.push(id);
  return id;
}

export function cancelarTodo() {
  temporizadores.forEach(clearTimeout);
  temporizadores = [];
}

/** Aviso de fin de fase del pomodoro, con vibración si el aparato la tiene. */
export function avisarPomodoro(fase, config = {}) {
  const textos = {
    enfoque: ['Enfoque terminado', 'Levanta la vista y descansa.'],
    descansoCorto: ['Descanso terminado', '¿Vamos con otro bloque?'],
    descansoLargo: ['Descanso largo terminado', 'A retomar con la cabeza fresca.'],
  };
  const [titulo, cuerpo] = textos[fase] || textos.enfoque;
  avisar(titulo, cuerpo, { tag: 'pomodoro' });
  if (config.sonido !== false) pitido();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

/** Un pitido corto generado al vuelo: no hace falta ningún archivo de audio. */
export function pitido(frecuencia = 880, duracion = 0.25) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frecuencia;
    gan.gain.setValueAtTime(0.0001, ctx.currentTime);
    gan.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gan.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracion);
    osc.connect(gan).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duracion + 0.05);
    osc.onended = () => ctx.close();
  } catch {
    /* sin audio no pasa nada */
  }
}

/** Mantiene la pantalla encendida mientras corre un pomodoro. */
export async function mantenerPantalla() {
  try {
    if ('wakeLock' in navigator) return await navigator.wakeLock.request('screen');
  } catch {
    /* el navegador puede negarlo; no es crítico */
  }
  return null;
}
