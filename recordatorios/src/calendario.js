/**
 * calendario.js — La rejilla del mes y la agenda de la semana.
 *
 * Solo cálculo: devuelve estructuras que la vista pinta. La semana empieza en
 * lunes, como se usa aquí, pero es configurable.
 */

import { aISO, deISO, diasDelMes, fecha, hoy, inicioSemana, minutosDeHora, semanaISO, sumarDias, sumarMeses, DIAS_CORTO, MESES } from './fechas.js';

/**
 * Semanas del mes, cada una con siete días. Incluye los días de los meses
 * vecinos para que la rejilla salga completa (`delMes: false`).
 */
export function matrizMes(anio, mes, opciones = {}) {
  const primerDia = opciones.primerDia ?? 1;
  const hoyISO = opciones.hoy || aISO(hoy());
  const primero = fecha(anio, mes, 1);
  const arranque = inicioSemana(primero, primerDia);
  const semanas = [];

  let cursor = arranque;
  while (semanas.length < 6) {
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const iso = aISO(cursor);
      dias.push({
        iso,
        dia: cursor.getDate(),
        delMes: cursor.getMonth() === mes && cursor.getFullYear() === anio,
        esHoy: iso === hoyISO,
        finDeSemana: [0, 6].includes(cursor.getDay()),
      });
      cursor = sumarDias(cursor, 1);
    }
    semanas.push({ numero: semanaISO(dias[0].iso), dias });
    // Cortamos cuando ya pasamos el último día del mes.
    const ultimo = dias[6].iso;
    if (ultimo > aISO(fecha(anio, mes, diasDelMes(anio, mes)))) break;
  }
  return {
    anio, mes,
    nombre: `${MESES[mes]} ${anio}`,
    cabecera: Array.from({ length: 7 }, (_, i) => DIAS_CORTO[(primerDia + i) % 7]),
    semanas,
  };
}

export function mesAnterior(anio, mes) {
  const d = sumarMeses(fecha(anio, mes, 1), -1);
  return { anio: d.getFullYear(), mes: d.getMonth() };
}

export function mesSiguiente(anio, mes) {
  const d = sumarMeses(fecha(anio, mes, 1), 1);
  return { anio: d.getFullYear(), mes: d.getMonth() };
}

/** Índice fecha -> tareas de ese día, ya ordenadas por hora. */
export function porDia(tareas = [], opciones = {}) {
  const mapa = new Map();
  for (const t of tareas) {
    if (!t.fecha) continue;
    if (t.completada && !opciones.incluirCompletadas) continue;
    if (!mapa.has(t.fecha)) mapa.set(t.fecha, []);
    mapa.get(t.fecha).push(t);
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99') || a.prioridad - b.prioridad);
  }
  return mapa;
}

/** Los siete días de una semana con sus tareas, para la vista de agenda. */
export function agendaSemana(tareas = [], desdeISO = aISO(hoy()), opciones = {}) {
  const lunes = inicioSemana(desdeISO, opciones.primerDia ?? 1);
  const indice = porDia(tareas, opciones);
  const hoyISO = opciones.hoy || aISO(hoy());
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const iso = aISO(sumarDias(lunes, i));
    const lista = indice.get(iso) || [];
    dias.push({
      iso,
      esHoy: iso === hoyISO,
      tareas: lista,
      minutos: lista.reduce((s, t) => s + (Number(t.duracion) || 0), 0),
    });
  }
  return { desde: aISO(lunes), hasta: aISO(sumarDias(lunes, 6)), numero: semanaISO(lunes), dias };
}

/**
 * Vista de día por horas, como una agenda de papel: las tareas con hora caen en
 * su franja y las que no tienen hora quedan arriba, en "sin hora".
 */
export function agendaDia(tareas = [], diaISO, opciones = {}) {
  const desde = opciones.desde ?? 7;
  const hasta = opciones.hasta ?? 22;
  const delDia = tareas.filter((t) => t.fecha === diaISO && (!t.completada || opciones.incluirCompletadas));
  const franjas = [];
  for (let h = desde; h <= hasta; h++) {
    const etiqueta = `${String(h).padStart(2, '0')}:00`;
    franjas.push({
      hora: etiqueta,
      tareas: delDia.filter((t) => t.hora && Math.floor(minutosDeHora(t.hora) / 60) === h),
    });
  }
  return { fecha: diaISO, sinHora: delDia.filter((t) => !t.hora), franjas };
}

/** Cuántas tareas y de qué tipo hay en cada día del mes (para pintar puntos). */
export function resumenMes(tareas = [], anio, mes) {
  const indice = porDia(tareas);
  const resumen = new Map();
  for (const [iso, lista] of indice) {
    const d = deISO(iso);
    if (d.getFullYear() !== anio || d.getMonth() !== mes) continue;
    resumen.set(iso, {
      total: lista.length,
      urgentes: lista.filter((t) => t.prioridad === 1).length,
      modulos: [...new Set(lista.map((t) => t.modulo).filter(Boolean))],
      minutos: lista.reduce((s, t) => s + (Number(t.duracion) || 0), 0),
    });
  }
  return resumen;
}
