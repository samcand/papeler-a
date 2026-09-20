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

export function avisar(titulo, cuerpo, opciones = {}) {
  if (!soportadas() || Notification.permission !== 'granted') return null;
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
