/**
 * riesgos.js — Riesgos ligeros y alcance que crece.
 *
 * Un registro de riesgos de verdad (con reservas de contingencia y riesgo
 * residual) es para una PMO. Para una persona, cinco líneas por proyecto:
 * qué puede romperlo, cuánto de probable es, cuánto dolería, qué lo dispara y
 * cuándo toca mirarlo otra vez.
 */

import { aISO, diferenciaDias, hoy, sumarDias } from './fechas.js';

export const NIVELES = [
  { valor: 1, nombre: 'Bajo' },
  { valor: 2, nombre: 'Medio' },
  { valor: 3, nombre: 'Alto' },
];

export function riesgoNuevo(campos = {}) {
  return {
    id: 'rie-' + Math.random().toString(36).slice(2, 8),
    proyecto: null,
    que: '',
    probabilidad: 2,
    impacto: 2,
    disparador: '',
    plan: '',
    revisarEn: aISO(sumarDias(hoy(), 30)),
    materializado: null,
    cerrado: null,
    ...campos,
  };
}

export function exposicion(riesgo) {
  return (Number(riesgo.probabilidad) || 0) * (Number(riesgo.impacto) || 0);
}

export function nivelRiesgo(riesgo) {
  const e = exposicion(riesgo);
  if (e >= 6) return 'alto';
  if (e >= 3) return 'medio';
  return 'bajo';
}

/** Los riesgos vivos, del más expuesto al menos, con lo que toca revisar arriba. */
export function riesgosVivos(riesgos = [], hoyISO = aISO(hoy()), proyecto = null) {
  return riesgos
    .filter((r) => !r.cerrado && (!proyecto || r.proyecto === proyecto))
    .map((r) => ({
      ...r,
      exposicion: exposicion(r),
      nivel: nivelRiesgo(r),
      tocaRevisar: !!r.revisarEn && r.revisarEn <= hoyISO,
      diasSinRevisar: r.revisarEn ? diferenciaDias(r.revisarEn, hoyISO) : null,
    }))
    .sort((a, b) => (b.tocaRevisar - a.tocaRevisar) || (b.exposicion - a.exposicion));
}

export function resumenRiesgos(riesgos = [], hoyISO = aISO(hoy())) {
  const vivos = riesgosVivos(riesgos, hoyISO);
  const altos = vivos.filter((r) => r.nivel === 'alto');
  const revisar = vivos.filter((r) => r.tocaRevisar);
  return {
    total: vivos.length,
    altos: altos.length,
    aRevisar: revisar.length,
    materializados: riesgos.filter((r) => r.materializado).length,
    frase: !vivos.length ? 'Ningún riesgo apuntado. O no los hay, o no los has mirado.'
      : `${vivos.length} riesgos vivos, ${altos.length} altos`
        + `${revisar.length ? ` y ${revisar.length} esperando revisión` : ''}.`,
  };
}

/** Un riesgo que se cumple deja de ser riesgo: se convierte en tarea. */
export function tareaDeRiesgo(riesgo, hoyISO = aISO(hoy())) {
  return {
    titulo: `Se cumplió: ${riesgo.que}`,
    fecha: hoyISO,
    prioridad: riesgo.impacto >= 3 ? 1 : 2,
    proyecto: riesgo.proyecto || null,
    etiquetas: ['riesgo'],
    notas: `${riesgo.plan ? `Plan previsto: ${riesgo.plan}` : 'No había plan previsto.'}`
      + `${riesgo.disparador ? `\nDisparador: ${riesgo.disparador}` : ''}`,
  };
}

/* ------------------------------------------------------------------ *
 * Alcance que crece
 * ------------------------------------------------------------------ */

/**
 * Cuánto ha engordado un plan desde que fijaste la línea base: tareas nuevas,
 * días añadidos y cuáles fueron. El alcance no crece de golpe, crece a base de
 * "y ya que estamos".
 */
export function alcanceQueCrece(plan, lineaBase, calendario) {
  if (!lineaBase?.tareas) return { hayBase: false };
  const base = lineaBase.tareas;
  const hojas = plan.tareas.filter((t) => !t.resumen);

  const nuevas = hojas.filter((t) => !base[t.id]);
  const crecidas = hojas.filter((t) => base[t.id] && (Number(t.duracion) || 0) > (Number(base[t.id].duracion) || 0))
    .map((t) => ({
      id: t.id, nombre: t.nombre,
      antes: base[t.id].duracion,
      ahora: t.duracion,
      dias: (Number(t.duracion) || 0) - (Number(base[t.id].duracion) || 0),
    }));
  const desaparecidas = Object.keys(base).filter((id) => !hojas.some((t) => t.id === id)).length;

  const diasNuevos = nuevas.reduce((s, t) => s + (Number(t.duracion) || 0), 0);
  const diasCrecidos = crecidas.reduce((s, t) => s + t.dias, 0);
  const diasBase = Object.values(base).reduce((s, t) => s + (Number(t.duracion) || 0), 0);
  const total = diasNuevos + diasCrecidos;

  return {
    hayBase: true,
    desde: lineaBase.tomadaEn,
    nuevas: nuevas.map((t) => ({ id: t.id, nombre: t.nombre, dias: Number(t.duracion) || 0 })),
    crecidas,
    desaparecidas,
    diasNuevos,
    diasCrecidos,
    diasTotales: total,
    pct: diasBase ? Math.round((total / diasBase) * 100) : 0,
    frase: !total
      ? 'El alcance no ha crecido desde la línea base.'
      : `El plan ha engordado ${total} días desde el ${lineaBase.tomadaEn}`
        + `${nuevas.length ? `: ${nuevas.length} tareas nuevas` : ''}`
        + `${crecidas.length ? `${nuevas.length ? ' y ' : ': '}${crecidas.length} que se alargaron` : ''}.`,
  };
}
