/**
 * cronometro.js — Medir lo que tarda una tarea, sin salir de la lista.
 *
 * Ya había un pomodoro a pantalla completa, pero pedía irse a otra pantalla y
 * decidir una duración. Esto es lo otro: darle al play en la tarea, seguir
 * trabajando y que la app cuente.
 *
 * Dos decisiones:
 *
 * - **Uno a la vez.** No se puede trabajar en dos cosas a la vez, y dos relojes
 *   corriendo solo sirven para inflar los números. Empezar en otra tarea guarda
 *   lo de la anterior.
 * - **Marcas de reloj, no ticks.** Se guarda el instante de inicio y se resta;
 *   si el móvil suspende la pestaña o se cierra la app, al volver la cuenta
 *   sigue bien. Un contador que suma de uno en uno se queda corto justo cuando
 *   dejas de mirarlo.
 */

import { aISO, hoy } from './fechas.js';

export function cronometroVacio() {
  return { tareaId: null, desde: null, acumulado: 0, corriendo: false };
}

/** Milisegundos medidos hasta ahora, esté corriendo o en pausa. */
export function transcurrido(cron, ahora = Date.now()) {
  if (!cron || !cron.tareaId) return 0;
  const enMarcha = cron.corriendo && cron.desde ? Math.max(0, ahora - cron.desde) : 0;
  return (cron.acumulado || 0) + enMarcha;
}

export function iniciar(cron, tareaId, ahora = Date.now()) {
  // Cambiar de tarea no pierde lo medido: eso lo cierra quien llama, con detener().
  return { tareaId, desde: ahora, acumulado: 0, corriendo: true };
}

export function pausar(cron, ahora = Date.now()) {
  if (!cron?.corriendo) return cron;
  return { ...cron, acumulado: transcurrido(cron, ahora), desde: null, corriendo: false };
}

export function reanudar(cron, ahora = Date.now()) {
  if (!cron?.tareaId || cron.corriendo) return cron;
  return { ...cron, desde: ahora, corriendo: true };
}

export const enCurso = (cron, tareaId) => !!cron?.tareaId && cron.tareaId === tareaId;

/**
 * Para el reloj y devuelve el registro que hay que guardar. Menos de un minuto
 * no se apunta: redondear treinta segundos a un minuto es empezar a mentirse.
 */
export function detener(cron, ahora = Date.now(), hoyISO = aISO(hoy())) {
  const ms = transcurrido(cron, ahora);
  const minutos = Math.round(ms / 60000);
  if (!cron?.tareaId || minutos < 1) {
    return { cron: cronometroVacio(), minutos: 0, registro: null, ms };
  }
  const fin = new Date(ahora);
  return {
    cron: cronometroVacio(),
    minutos,
    ms,
    registro: {
      tipo: 'cronometro',
      tareaId: cron.tareaId,
      minutos,
      fecha: hoyISO,
      fin: `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`,
    },
  };
}

/** `1:04:09` o `07:31`, que es como se lee un reloj. */
export function formatoCrono(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dos = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
}

/** Lo medido en una tarea hasta hoy, sumando lo guardado y lo que corre ahora. */
export function totalDeTarea(tarea, cron, ahora = Date.now()) {
  const guardado = Number(tarea?.tiempoDedicado) || 0;
  const corriendo = enCurso(cron, tarea?.id) ? Math.floor(transcurrido(cron, ahora) / 60000) : 0;
  return { guardado, corriendo, total: guardado + corriendo };
}

/**
 * Lo medido frente a lo estimado, que es la frase que de verdad interesa
 * cuando terminas: "dijiste 30 y fueron 50".
 */
export function contraEstimado(tarea, minutos) {
  const estimado = Number(tarea?.duracion) || 0;
  if (!estimado) return { hayEstimado: false, texto: `${minutos} min medidos.` };
  const factor = Math.round((minutos / estimado) * 100) / 100;
  return {
    hayEstimado: true,
    estimado,
    factor,
    texto: minutos > estimado
      ? `${minutos} min frente a los ${estimado} que estimaste: ×${factor}.`
      : `${minutos} min de los ${estimado} estimados.`,
  };
}
