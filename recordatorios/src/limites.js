/**
 * limites.js — La fecha en que lo haces no es la fecha en que vence.
 *
 * Casi todas las apps de recordatorios mezclan las dos y por eso su lista
 * miente: pones el artículo para el lunes porque es cuando piensas escribirlo,
 * pero el plazo de la revista es el 30. Si el lunes lo aplazas, la lista dice
 * "mañana" tan tranquila y el 30 llega igual.
 *
 * Aquí `fecha` es **cuándo lo vas a hacer** y `limite` es **cuándo vence de
 * verdad**. Con las dos se puede decir lo único que importa: *estás
 * planificando para después del plazo*, que es un problema que se ve semanas
 * antes de que sea un problema.
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';

/**
 * Cómo va una tarea respecto a su plazo. Sin límite no hay nada que decir, y se
 * dice, en vez de inventar urgencia.
 */
export function estadoLimite(tarea, hoyISO = aISO(hoy())) {
  const limite = tarea?.limite || null;
  if (!limite) return { hayLimite: false, nivel: 'sin', dias: null, texto: '' };

  const dias = diferenciaDias(hoyISO, limite);
  const hecha = !!tarea.completada;

  if (hecha) {
    const cumplido = String(tarea.completadaEn || '').slice(0, 10) <= limite;
    return {
      hayLimite: true, dias, hecha: true, cumplido,
      nivel: cumplido ? 'cumplido' : 'incumplido',
      texto: cumplido ? `Entregada a tiempo (vencía el ${limite}).` : `Se entregó tarde: vencía el ${limite}.`,
    };
  }

  if (dias < 0) {
    return { hayLimite: true, dias, nivel: 'vencido', texto: `El plazo venció hace ${-dias} día${dias === -1 ? '' : 's'}.` };
  }

  // Lo interesante: la planificas para después de que venza.
  const planificadaTarde = !!tarea.fecha && tarea.fecha > limite;
  if (planificadaTarde) {
    return {
      hayLimite: true, dias, nivel: 'imposible', planificadaTarde: true,
      texto: `La tienes para el ${tarea.fecha} y vence el ${limite}: así no llega.`,
    };
  }

  if (dias === 0) return { hayLimite: true, dias, nivel: 'hoy', texto: 'El plazo es hoy.' };
  if (dias <= 3) return { hayLimite: true, dias, nivel: 'cerca', texto: `Vence en ${dias} día${dias === 1 ? '' : 's'}.` };

  // Sin fecha de hacer, un plazo lejano es una tarea que no existe en ningún día.
  if (!tarea.fecha) {
    return { hayLimite: true, dias, nivel: 'sinPlan', texto: `Vence en ${dias} días y no está puesta en ningún día.` };
  }
  return { hayLimite: true, dias, nivel: 'ok', texto: `Vence el ${limite}, y la tienes para el ${tarea.fecha}.` };
}

const PESO = { vencido: 0, imposible: 1, hoy: 2, cerca: 3, sinPlan: 4, ok: 5 };

/** Las tareas con plazo que piden algo, de lo más grave a lo menos. */
export function enRiesgo(tareas = [], hoyISO = aISO(hoy())) {
  return tareas
    .filter((t) => !t.completada && t.limite)
    .map((t) => ({ tarea: t, estado: estadoLimite(t, hoyISO) }))
    .filter((x) => ['vencido', 'imposible', 'hoy', 'cerca', 'sinPlan'].includes(x.estado.nivel))
    .sort((a, b) => (PESO[a.estado.nivel] - PESO[b.estado.nivel]) || (a.estado.dias - b.estado.dias));
}

/** Cuántas entregas cumpliste y cuántas se te pasaron: el historial no miente. */
export function cumplimiento(tareas = []) {
  const conPlazo = tareas.filter((t) => t.completada && t.limite && t.completadaEn);
  const aTiempo = conPlazo.filter((t) => String(t.completadaEn).slice(0, 10) <= t.limite).length;
  return {
    total: conPlazo.length,
    aTiempo,
    tarde: conPlazo.length - aTiempo,
    pct: conPlazo.length ? Math.round((aTiempo / conPlazo.length) * 100) : null,
    frase: !conPlazo.length
      ? 'Todavía no has cerrado nada con plazo: no hay historial que mirar.'
      : `${aTiempo} de ${conPlazo.length} entregas a tiempo (${Math.round((aTiempo / conPlazo.length) * 100)} %).`,
  };
}

export function resumenLimites(tareas = [], hoyISO = aISO(hoy())) {
  const lista = enRiesgo(tareas, hoyISO);
  const cuenta = (nivel) => lista.filter((x) => x.estado.nivel === nivel).length;
  const imposibles = cuenta('imposible');
  const vencidos = cuenta('vencido');
  return {
    lista,
    total: lista.length,
    vencidos,
    imposibles,
    hoy: cuenta('hoy'),
    cerca: cuenta('cerca'),
    sinPlan: cuenta('sinPlan'),
    frase: !lista.length ? 'Ningún plazo aprieta.'
      : vencidos ? `${vencidos} plazo${vencidos === 1 ? '' : 's'} vencido${vencidos === 1 ? '' : 's'}.`
        : imposibles ? `${imposibles} tarea${imposibles === 1 ? '' : 's'} planificada${imposibles === 1 ? '' : 's'} para después de su plazo.`
          : `${lista.length} plazo${lista.length === 1 ? '' : 's'} a la vista.`,
  };
}
