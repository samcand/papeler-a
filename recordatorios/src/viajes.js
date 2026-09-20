/**
 * viajes.js — El viaje como una sola ficha.
 *
 * Un viaje son tareas (la plantilla de la maleta), fechas, papeles y dinero
 * repartidos por cuatro sitios. Aquí no se guarda nada de eso por duplicado: se
 * junta. El itinerario sale de **las tareas que caen entre las dos fechas**, el
 * presupuesto de **los gastos marcados con este viaje** y los papeles de los
 * adjuntos de esas tareas.
 *
 * Así, apuntar un gasto en el viaje es apuntar un gasto, y no hay dos verdades
 * distintas sobre lo mismo.
 */

import { aISO, deISO, diferenciaDias, hoy, textoLargo } from './fechas.js';
import { resumenGastos } from './gastos.js';

export function viajeNuevo(campos = {}) {
  return {
    id: 'via-' + Math.random().toString(36).slice(2, 8),
    nombre: 'Viaje',
    destino: '',
    desde: aISO(hoy()),
    hasta: aISO(hoy()),
    presupuesto: 0,
    personas: 1,
    notas: '',
    ...campos,
  };
}

export function diasDeViaje(viaje) {
  return Math.max(1, diferenciaDias(viaje.desde, viaje.hasta) + 1);
}

/** Antes, durante o después: casi toda la pantalla depende de esto. */
export function estadoViaje(viaje, hoyISO = aISO(hoy())) {
  if (hoyISO < viaje.desde) return 'proximo';
  if (hoyISO > viaje.hasta) return 'pasado';
  return 'encurso';
}

export function cuentaAtras(viaje, hoyISO = aISO(hoy())) {
  const estado = estadoViaje(viaje, hoyISO);
  if (estado === 'proximo') {
    const faltan = diferenciaDias(hoyISO, viaje.desde);
    return { estado, dias: faltan, texto: faltan === 0 ? 'Sales hoy.' : `Faltan ${faltan} días.` };
  }
  if (estado === 'encurso') {
    const dia = diferenciaDias(viaje.desde, hoyISO) + 1;
    return { estado, dias: dia, texto: `Día ${dia} de ${diasDeViaje(viaje)}.` };
  }
  return { estado, dias: diferenciaDias(viaje.hasta, hoyISO), texto: `Volviste hace ${diferenciaDias(viaje.hasta, hoyISO)} días.` };
}

/**
 * El itinerario día a día. Antes de salir enseña la preparación (lo que hay que
 * tener listo) y durante el viaje, el plan de cada día.
 */
export function itinerario(viaje, tareas = []) {
  const dentro = tareas.filter((t) => t.fecha && t.fecha >= viaje.desde && t.fecha <= viaje.hasta);
  const dias = [];
  for (let i = 0; i < diasDeViaje(viaje); i++) {
    const iso = aISO(new Date(deISO(viaje.desde).getTime() + i * 86400000));
    const delDia = dentro.filter((t) => t.fecha === iso)
      .sort((a, b) => String(a.hora || '99:99').localeCompare(String(b.hora || '99:99')));
    dias.push({ fecha: iso, numero: i + 1, texto: textoLargo(iso), tareas: delDia });
  }
  return dias;
}

/** Lo que queda por preparar: tareas del viaje con fecha anterior a la salida. */
export function preparacion(viaje, tareas = []) {
  const etiqueta = String(viaje.nombre || '').toLowerCase();
  return tareas.filter((t) => !t.completada && t.fecha && t.fecha < viaje.desde
    && (t.proyecto === viaje.nombre
      || (t.etiquetas || []).some((e) => e.toLowerCase() === etiqueta)
      || String(t.titulo).toLowerCase().includes(etiqueta)));
}

/** Gastado frente a presupuestado, con lo que queda por día de viaje. */
export function presupuestoViaje(viaje, gastos = [], hoyISO = aISO(hoy())) {
  const r = resumenGastos(gastos, '0000-01-01', '9999-12-31', { viaje: viaje.id });
  const presupuesto = Number(viaje.presupuesto) || 0;
  const estado = estadoViaje(viaje, hoyISO);
  const diasRestantes = estado === 'encurso'
    ? Math.max(0, diferenciaDias(hoyISO, viaje.hasta))
    : (estado === 'proximo' ? diasDeViaje(viaje) : 0);

  return {
    gastado: r.total,
    presupuesto,
    resto: presupuesto ? presupuesto - r.total : null,
    pct: presupuesto ? Math.round((r.total / presupuesto) * 100) : null,
    porCategoria: r.porCategoria,
    porDia: Math.round((r.total / diasDeViaje(viaje)) * 100) / 100,
    porPersona: viaje.personas > 1 ? Math.round((r.total / viaje.personas) * 100) / 100 : null,
    quedaPorDia: presupuesto && diasRestantes
      ? Math.round(((presupuesto - r.total) / diasRestantes) * 100) / 100
      : null,
    pasado: presupuesto ? r.total > presupuesto : false,
    frase: !presupuesto
      ? `${r.total.toLocaleString('es')} gastados. Sin presupuesto no hay con qué comparar.`
      : r.total > presupuesto
        ? `Te pasaste ${(r.total - presupuesto).toLocaleString('es')} del presupuesto.`
        : `${r.total.toLocaleString('es')} de ${presupuesto.toLocaleString('es')}`
          + (diasRestantes ? `, quedan ${Math.round(((presupuesto - r.total) / diasRestantes) * 100) / 100} por día.` : '.'),
  };
}

export function resumenViajes(viajes = [], hoyISO = aISO(hoy())) {
  const conEstado = viajes.map((v) => ({ viaje: v, estado: estadoViaje(v, hoyISO) }));
  const enCurso = conEstado.find((x) => x.estado === 'encurso')?.viaje || null;
  const proximo = conEstado.filter((x) => x.estado === 'proximo')
    .sort((a, b) => a.viaje.desde.localeCompare(b.viaje.desde))[0]?.viaje || null;
  return {
    total: viajes.length,
    enCurso,
    proximo,
    pasados: conEstado.filter((x) => x.estado === 'pasado').length,
    frase: enCurso ? `Estás en ${enCurso.nombre}: ${cuentaAtras(enCurso, hoyISO).texto.toLowerCase()}`
      : proximo ? `Próximo viaje: ${proximo.nombre}, ${cuentaAtras(proximo, hoyISO).texto.toLowerCase()}`
        : 'Ningún viaje a la vista.',
  };
}
