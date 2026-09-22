/**
 * plan.js — Planes de lectura y progreso por capítulos.
 *
 * Un plan reparte capítulos en días de forma pareja (por número de versículos,
 * no de capítulos: Salmos 117 no pesa lo mismo que Salmos 119).
 */

import { LIBROS, todosLosCapitulos } from './libros.js';

export const PLANES = [
  { id: 'anual', nombre: 'Toda la Biblia en un año', dias: 365, desde: 1, hasta: 66 },
  { id: 'nt90', nombre: 'Nuevo Testamento en 90 días', dias: 90, desde: 40, hasta: 66 },
  { id: 'at-anual', nombre: 'Antiguo Testamento en un año', dias: 365, desde: 1, hasta: 39 },
  { id: 'evangelios30', nombre: 'Los cuatro evangelios en 30 días', dias: 30, desde: 40, hasta: 43 },
  { id: 'salmos', nombre: 'Salmos en 30 días', dias: 30, desde: 19, hasta: 19 },
  { id: 'pablo', nombre: 'Cartas de Pablo en 40 días', dias: 40, desde: 45, hasta: 57 },
];

/**
 * Reparte capítulos en días. `versiculos[b-1][c-1]` = número de versículos
 * (si no se da, cada capítulo pesa 1). Devuelve dias[i] = [[b, c], ...].
 */
export function repartir(capitulos, dias, versiculos) {
  const peso = ([b, c]) => (versiculos?.[b - 1]?.[c - 1]) || 1;
  const total = capitulos.reduce((s, x) => s + peso(x), 0);
  const n = Math.max(1, Math.min(dias, capitulos.length));
  const salida = Array.from({ length: n }, () => []);
  let acumulado = 0;
  let dia = 0;
  for (let i = 0; i < capitulos.length; i++) {
    const cap = capitulos[i];
    const restantesCaps = capitulos.length - i;
    const restantesDias = n - dia;
    // Nunca dejar días vacíos al final
    if (salida[dia].length && (acumulado >= (total * (dia + 1)) / n || restantesCaps <= restantesDias - 1)) {
      if (dia < n - 1) dia++;
    }
    salida[dia].push(cap);
    acumulado += peso(cap);
  }
  return salida;
}

export function generarPlan(plan, versiculos) {
  return repartir(todosLosCapitulos(plan.desde, plan.hasta), plan.dias, versiculos);
}

/** Día del plan que toca hoy (0 = primer día). */
export function diaDeHoy(inicio, hoy = new Date()) {
  const a = new Date(inicio); a.setHours(0, 0, 0, 0);
  const b = new Date(hoy); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86_400_000);
}

/** Resume un día como texto: "Génesis 1-3", "Mateo 28; Marcos 1". */
export function describirDia(caps) {
  const grupos = [];
  for (const [b, c] of caps) {
    const g = grupos[grupos.length - 1];
    if (g && g.b === b && g.hasta === c - 1) g.hasta = c;
    else grupos.push({ b, desde: c, hasta: c });
  }
  return grupos.map((g) => {
    const nombre = LIBROS[g.b - 1].nombre;
    if (LIBROS[g.b - 1].capitulos === 1) return nombre;
    return g.desde === g.hasta ? `${nombre} ${g.desde}` : `${nombre} ${g.desde}-${g.hasta}`;
  }).join('; ');
}

/** Racha de días seguidos cumplidos, contando hacia atrás desde hoy (o ayer si hoy falta). */
export function racha(hechos, hoyIndice) {
  const set = new Set(hechos);
  let i = set.has(hoyIndice) ? hoyIndice : hoyIndice - 1;
  let n = 0;
  while (i >= 0 && set.has(i)) { n++; i--; }
  return n;
}

/** Porcentaje de la Biblia leída a partir del registro de capítulos leídos ("b.c"). */
export function avanceBiblia(leidos) {
  const set = new Set(leidos);
  const porLibro = LIBROS.map((l) => {
    let n = 0;
    for (let c = 1; c <= l.capitulos; c++) if (set.has(`${l.n}.${c}`)) n++;
    return n;
  });
  const total = LIBROS.reduce((s, l) => s + l.capitulos, 0);
  const hechos = porLibro.reduce((s, n) => s + n, 0);
  return { porLibro, hechos, total, porcentaje: Math.round((hechos / total) * 1000) / 10 };
}
