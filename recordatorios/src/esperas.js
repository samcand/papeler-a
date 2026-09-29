/**
 * esperas.js — Lo que no depende de ti.
 *
 * El coautor que no contesta, la revista con el manuscrito, el estudiante que
 * no manda el borrador, el banco con la transferencia. Son dependencias
 * externas: no las puedes hacer tú, pero sí puedes saber desde cuándo esperas,
 * hasta cuándo es razonable esperar y cuándo toca perseguirlas.
 */

import { aISO, diferenciaDias, hoy, sumarDias } from './fechas.js';

export function crearEspera({ quien = '', desde = aISO(hoy()), dias = 14, limite = null, notas = '' } = {}) {
  return {
    quien: quien.trim(),
    desde: aISO(desde),
    limite: limite || aISO(sumarDias(desde, dias)),
    notas,
    perseguida: null,          // última vez que lo reclamaste
  };
}

/** Días esperando, días de margen y si ya se pasó de plazo. */
export function estadoEspera(espera, hoyISO = aISO(hoy())) {
  if (!espera) return null;
  const esperando = diferenciaDias(espera.desde, hoyISO);
  const margen = espera.limite ? diferenciaDias(hoyISO, espera.limite) : null;
  return {
    esperando,
    margen,
    vencida: margen != null && margen < 0,
    hoyToca: margen === 0,
    desdeUltimoAviso: espera.perseguida ? diferenciaDias(espera.perseguida, hoyISO) : null,
  };
}

/** Todo lo que está esperando a alguien, lo vencido primero. */
export function esperas(tareas = [], hoyISO = aISO(hoy())) {
  return tareas
    .filter((t) => !t.completada && !t.archivada && t.espera?.quien)
    .map((t) => ({ tarea: t, ...estadoEspera(t.espera, hoyISO), quien: t.espera.quien, limite: t.espera.limite }))
    .sort((a, b) => (a.margen ?? 999) - (b.margen ?? 999));
}

export function resumenEsperas(tareas = [], hoyISO = aISO(hoy())) {
  const lista = esperas(tareas, hoyISO);
  const vencidas = lista.filter((e) => e.vencida);
  const porPersona = new Map();
  for (const e of lista) porPersona.set(e.quien, (porPersona.get(e.quien) || 0) + 1);
  return {
    total: lista.length,
    vencidas: vencidas.length,
    lista,
    personas: [...porPersona.entries()].map(([quien, n]) => ({ quien, n })).sort((a, b) => b.n - a.n),
    frase: !lista.length ? 'No estás esperando nada de nadie.'
      : vencidas.length
        ? `${vencidas.length} de ${lista.length} esperas están fuera de plazo. La más vieja lleva ${Math.max(...vencidas.map((e) => e.esperando))} días.`
        : `${lista.length} cosa${lista.length === 1 ? '' : 's'} en manos de otros, todas dentro de plazo.`,
  };
}

/** La tarea de perseguir, que es lo único que sí depende de ti. */
export function tareaDePerseguir(tarea, hoyISO = aISO(hoy())) {
  const e = tarea.espera || {};
  const estado = estadoEspera(e, hoyISO);
  return {
    titulo: `Perseguir a ${e.quien}: ${tarea.titulo}`,
    fecha: hoyISO,
    prioridad: estado?.vencida ? 1 : 2,
    modulo: tarea.modulo,
    proyecto: tarea.proyecto,
    etiquetas: ['espera', 'seguimiento'],
    notas: `Esperando desde el ${e.desde} (${estado?.esperando} días)${e.limite ? `, plazo el ${e.limite}` : ''}.`
      + `${e.notas ? `\n${e.notas}` : ''}`,
  };
}
