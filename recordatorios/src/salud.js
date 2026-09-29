/**
 * salud.js — Salud explicada de cada compromiso.
 *
 * Un número solo no sirve de nada: lo que importa es **por qué**. Cada factor
 * que baja la nota viene con su frase, y la nota sale de restar puntos a 100,
 * no de una fórmula que nadie puede reconstruir.
 */

import { aISO, diferenciaDias, hoy, sumarDias } from './fechas.js';
import { estaVencida } from './modelo.js';

const FACTORES = {
  atrasadas: 35,
  aplazadas: 15,
  estancamiento: 20,
  crecimiento: 15,
  esperas: 15,
};

export function nivelSalud(puntuacion) {
  if (puntuacion >= 80) return 'bien';
  if (puntuacion >= 60) return 'atención';
  return 'riesgo';
}

/**
 * Salud de un conjunto de tareas (un proyecto, un módulo o todo).
 * Devuelve la puntuación, el nivel y los factores que la explican.
 */
export function salud(tareas = [], hoyISO = aISO(hoy()), opciones = {}) {
  const vivas = tareas.filter((t) => !t.archivada);
  const pendientes = vivas.filter((t) => !t.completada);
  const factores = [];

  if (!vivas.length) {
    return { puntuacion: 100, nivel: 'bien', factores: [], tareas: 0, pendientes: 0, sinDatos: true };
  }

  // 1. Atrasadas: el síntoma más directo.
  const vencidas = pendientes.filter((t) => estaVencida(t, hoyISO));
  if (vencidas.length) {
    const proporcion = vencidas.length / Math.max(1, pendientes.length);
    const puntos = Math.round(Math.min(1, proporcion * 1.5) * FACTORES.atrasadas);
    const masVieja = Math.max(...vencidas.map((t) => diferenciaDias(t.fecha, hoyISO)));
    factores.push({
      id: 'atrasadas', puntos,
      texto: `${vencidas.length} de ${pendientes.length} tareas están atrasadas; la más vieja lleva ${masVieja} días.`,
    });
  }

  // 2. Aplazadas una y otra vez: el síntoma que nadie mira.
  const aplazadas = pendientes.filter((t) => (t.aplazamientos || 0) >= 3);
  if (aplazadas.length) {
    const puntos = Math.round(Math.min(1, aplazadas.length / 3) * FACTORES.aplazadas);
    factores.push({
      id: 'aplazadas', puntos,
      texto: `${aplazadas.length} tarea${aplazadas.length === 1 ? '' : 's'} se ${aplazadas.length === 1 ? 'ha' : 'han'} pospuesto tres veces o más.`,
    });
  }

  // 3. Estancamiento: cuánto hace que no se cierra nada.
  const completadas = vivas.filter((t) => t.completada && t.completadaEn);
  const ultima = completadas.length
    ? completadas.map((t) => String(t.completadaEn).slice(0, 10)).sort().at(-1)
    : null;
  const diasSinCerrar = ultima ? diferenciaDias(ultima, hoyISO) : null;
  if (pendientes.length && (!ultima || diasSinCerrar >= 14)) {
    const puntos = ultima ? Math.round(Math.min(1, diasSinCerrar / 45) * FACTORES.estancamiento) : FACTORES.estancamiento;
    factores.push({
      id: 'estancamiento', puntos,
      texto: ultima
        ? `Llevas ${diasSinCerrar} días sin completar nada de aquí.`
        : 'No se ha completado nunca nada de aquí.',
    });
  }

  // 4. Crecimiento: entra más de lo que sale.
  const hace30 = aISO(sumarDias(hoyISO, -30));
  const abiertas = vivas.filter((t) => String(t.creadaEn).slice(0, 10) >= hace30).length;
  const cerradas = completadas.filter((t) => String(t.completadaEn).slice(0, 10) >= hace30).length;
  if (abiertas > cerradas && abiertas >= 3) {
    const puntos = Math.round(Math.min(1, (abiertas - cerradas) / 8) * FACTORES.crecimiento);
    factores.push({
      id: 'crecimiento', puntos,
      texto: `En 30 días han entrado ${abiertas} tareas y se han cerrado ${cerradas}: la lista crece más rápido de lo que la vacías.`,
    });
  }

  // 5. Esperas externas vencidas: no depende de ti, pero te bloquea igual.
  const esperas = pendientes.filter((t) => t.espera?.limite && t.espera.limite < hoyISO);
  if (esperas.length) {
    const puntos = Math.round(Math.min(1, esperas.length / 2) * FACTORES.esperas);
    const quien = [...new Set(esperas.map((t) => t.espera.quien).filter(Boolean))];
    factores.push({
      id: 'esperas', puntos,
      texto: `${esperas.length} cosa${esperas.length === 1 ? '' : 's'} esperando a ${quien.length ? quien.join(', ') : 'alguien'} fuera de plazo.`,
    });
  }

  const puntuacion = Math.max(0, 100 - factores.reduce((s, f) => s + f.puntos, 0));
  return {
    puntuacion,
    nivel: nivelSalud(puntuacion),
    factores: factores.sort((a, b) => b.puntos - a.puntos),
    tareas: vivas.length,
    pendientes: pendientes.length,
    nombre: opciones.nombre,
    sinDatos: false,
  };
}

/** La frase que explica la nota en una línea. */
export function explicacion(s) {
  if (s.sinDatos) return 'Sin tareas: nada que juzgar.';
  if (!s.factores.length) return 'Todo al día y moviéndose. No hay nada que arreglar.';
  const principal = s.factores[0];
  const resto = s.factores.length - 1;
  return `${principal.texto}${resto ? ` (y ${resto} motivo${resto === 1 ? '' : 's'} más)` : ''}`;
}

/** Salud de cada proyecto, de peor a mejor, con la tendencia si hay con qué comparar. */
export function saludPorProyecto(tareas = [], proyectos = [], hoyISO = aISO(hoy()), previas = null) {
  const filas = proyectos.map((p) => {
    const delProyecto = tareas.filter((t) => t.proyecto === p.nombre);
    const s = salud(delProyecto, hoyISO, { nombre: p.nombre });
    const antes = previas?.[p.nombre];
    return {
      ...s,
      proyecto: p.nombre,
      modulo: p.modulo,
      color: p.color,
      tendencia: Number.isFinite(antes) ? s.puntuacion - antes : null,
      explicacion: explicacion(s),
    };
  }).filter((f) => !f.sinDatos);
  return filas.sort((a, b) => a.puntuacion - b.puntuacion);
}

/**
 * Aviso temprano: lo que todavía no está en rojo pero va hacia allí.
 * Se dispara por caída de la nota, no por el valor absoluto.
 */
export function avisoTemprano(filas = [], caidaMinima = 10) {
  return filas
    .filter((f) => f.tendencia != null && f.tendencia <= -caidaMinima && f.nivel !== 'riesgo')
    .map((f) => ({
      proyecto: f.proyecto,
      caida: Math.abs(f.tendencia),
      texto: `${f.proyecto} ha caído ${Math.abs(f.tendencia)} puntos esta semana. ${f.explicacion}`,
    }));
}

/** Instantánea para poder comparar la semana que viene. */
export function instantaneaSalud(filas = [], hoyISO = aISO(hoy())) {
  const scores = {};
  for (const f of filas) scores[f.proyecto] = f.puntuacion;
  return { fecha: hoyISO, scores };
}
