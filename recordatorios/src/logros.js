/**
 * logros.js — Medallas y estrellas, sin trampas.
 *
 * Una regla, y de ella sale todo lo demás: **las medallas se calculan de lo que
 * ya está medido**. No hay puntos por marcar una casilla ni un contador que se
 * pueda inflar; si quieres una medalla de enfoque, hay que medir enfoque de
 * verdad. Por eso nada de esto se guarda: se recalcula cada vez desde tus
 * datos, así que no se puede editar el marcador.
 *
 * La segunda regla es que **nada castiga**. Perder una racha no quita medallas
 * ni enseña caras tristes: el día malo ya fue bastante. Las estrellas del día
 * son tres como mucho y mañana vuelven a cero sin deber nada.
 *
 * Bronce es "lo has empezado de verdad", plata es "es un hábito" y oro es "esto
 * ya te define".
 */

import { aISO, hoy, inicioSemana, semanaISO, sumarDias } from './fechas.js';
import { estadisticas } from './modelo.js';
import { cumplimiento } from './limites.js';
import { rachaDiario } from './notas.js';
import { rachaRutina, rutinasDeHoy } from './rutinas.js';
import { resumenTiempo } from './tiempo.js';
import { presupuestoDelMes, porMes } from './gastos.js';

export const NIVELES = [
  { id: 'bronce', nombre: 'Bronce', icono: '🥉', orden: 1 },
  { id: 'plata', nombre: 'Plata', icono: '🥈', orden: 2 },
  { id: 'oro', nombre: 'Oro', icono: '🥇', orden: 3 },
];

export const nivel = (id) => NIVELES.find((n) => n.id === id) || null;

/** "1 día seguido" y no "1 días seguidos": el singular se nota. */
export function cantidad(n, medalla) {
  const unidad = Math.abs(n) === 1 ? (medalla.singular || medalla.unidad) : medalla.unidad;
  return `${n} ${unidad}`;
}

/** "falta 1 hora" / "faltan 3 horas". */
export function textoFalta(evaluacion) {
  const n = evaluacion.falta;
  return `${n === 1 ? 'falta' : 'faltan'} ${cantidad(n, evaluacion.medalla)}`;
}

/* ------------------------------------------------------------------ *
 * Las medidas: cada una sale de datos que ya existen
 * ------------------------------------------------------------------ */

/** Días seguidos cerrando al menos una tarea, contando desde hoy o desde ayer. */
function rachaTareas(estado, hoyISO) {
  const dias = new Set((estado.historial || []).map((h) => h.fecha));
  let cursor = dias.has(hoyISO) ? hoyISO : aISO(sumarDias(hoyISO, -1));
  if (!dias.has(cursor)) return 0;
  let racha = 0;
  while (dias.has(cursor)) {
    racha++;
    cursor = aISO(sumarDias(cursor, -1));
  }
  return racha;
}

/** Semanas seguidas con la revisión semanal marcada. */
function semanasDeRevision(estado, hoyISO) {
  let racha = 0;
  let lunes = inicioSemana(hoyISO);
  for (let i = 0; i < 120; i++) {
    const clave = `revision-${semanaISO(lunes)}`;
    if (!(estado.ajustes?.[clave] || []).length) break;
    racha++;
    lunes = sumarDias(lunes, -7);
  }
  return racha;
}

/** Meses cerrados sin pasarse del presupuesto (solo cuentan los ya terminados). */
function mesesEnPresupuesto(estado, hoyISO) {
  const limites = estado.presupuestos || {};
  if (!Object.keys(limites).length) return 0;
  return porMes(estado.gastos || [], 12, hoyISO)
    .filter((m) => m.mes < hoyISO.slice(0, 7))
    .filter((m) => {
      const p = presupuestoDelMes(estado.gastos || [], limites, m.mes, hoyISO);
      return p.total > 0 && p.total <= p.totalLimite;
    }).length;
}

/* ------------------------------------------------------------------ *
 * El catálogo
 * ------------------------------------------------------------------ */

export const MEDALLAS = [
  {
    id: 'constancia', nombre: 'Constancia', icono: '🔥', unidad: 'días seguidos', singular: 'día seguido',
    descripcion: 'Días seguidos cerrando al menos una tarea.',
    umbrales: { bronce: 7, plata: 30, oro: 100 },
    medir: (estado, hoyISO) => rachaTareas(estado, hoyISO),
  },
  {
    id: 'volumen', nombre: 'Trabajo hecho', icono: '✅', unidad: 'tareas', singular: 'tarea',
    descripcion: 'Tareas completadas en total, desde el principio.',
    umbrales: { bronce: 100, plata: 500, oro: 2000 },
    medir: (estado) => (estado.historial || []).length,
  },
  {
    id: 'palabra', nombre: 'Palabra cumplida', icono: '🤝', unidad: '% a tiempo', singular: '% a tiempo',
    descripcion: 'Porcentaje de entregas con plazo cerradas antes de vencer. Hace falta un mínimo de cinco para que cuente.',
    umbrales: { bronce: 70, plata: 85, oro: 95 },
    medir: (estado) => {
      const c = cumplimiento(estado.tareas || []);
      return c.total >= 5 ? c.pct : 0;
    },
    nota: (estado) => {
      const c = cumplimiento(estado.tareas || []);
      return c.total < 5 ? `Llevas ${c.total} de las 5 entregas que hacen falta para empezar a contar.` : c.frase;
    },
  },
  {
    id: 'enfoque', nombre: 'Enfoque', icono: '🍅', unidad: 'horas medidas', singular: 'hora medida',
    descripcion: 'Horas de trabajo medidas con el pomodoro o el cronómetro. Lo que no mediste no cuenta.',
    umbrales: { bronce: 10, plata: 50, oro: 200 },
    medir: (estado) => Math.floor((estado.tiempo || []).reduce((s, r) => s + (Number(r.minutos) || 0), 0) / 60),
  },
  {
    id: 'revision', nombre: 'Domingo de revisión', icono: '🔄', unidad: 'semanas seguidas', singular: 'semana seguida',
    descripcion: 'Semanas seguidas haciendo la revisión semanal.',
    umbrales: { bronce: 4, plata: 12, oro: 52 },
    medir: (estado, hoyISO) => semanasDeRevision(estado, hoyISO),
  },
  {
    id: 'metas', nombre: 'Metas logradas', icono: '🎯', unidad: 'objetivos', singular: 'objetivo',
    descripcion: 'Objetivos marcados como logrados.',
    umbrales: { bronce: 1, plata: 5, oro: 15 },
    medir: (estado) => (estado.objetivos || []).filter((o) => o.logradoEn).length,
  },
  {
    id: 'rutina', nombre: 'Rutina de hierro', icono: '🌅', unidad: 'días seguidos', singular: 'día seguido',
    descripcion: 'La mejor racha viva de una rutina completa.',
    umbrales: { bronce: 7, plata: 30, oro: 100 },
    medir: (estado, hoyISO) => Math.max(0, ...(estado.rutinas || [])
      .map((r) => rachaRutina(r, estado.rutinasHechas || [], hoyISO))),
  },
  {
    id: 'diario', nombre: 'Diario', icono: '📔', unidad: 'días seguidos', singular: 'día seguido',
    descripcion: 'Días seguidos escribiendo el diario.',
    umbrales: { bronce: 7, plata: 30, oro: 100 },
    medir: (estado, hoyISO) => rachaDiario(estado.notas || [], hoyISO),
  },
  {
    id: 'lector', nombre: 'Lector', icono: '📚', unidad: 'lecturas', singular: 'lectura',
    descripcion: 'Artículos y libros marcados como leídos en la cola.',
    umbrales: { bronce: 5, plata: 20, oro: 50 },
    medir: (estado) => (estado.lecturas || []).filter((l) => l.leidoEn).length,
  },
  {
    id: 'cuentas', nombre: 'Cuentas claras', icono: '💳', unidad: 'meses', singular: 'mes',
    descripcion: 'Meses cerrados sin pasarte del presupuesto.',
    umbrales: { bronce: 1, plata: 3, oro: 12 },
    medir: (estado, hoyISO) => mesesEnPresupuesto(estado, hoyISO),
  },
  {
    id: 'entregas', nombre: 'Hitos cumplidos', icono: '🏁', unidad: 'hitos', singular: 'hito',
    descripcion: 'Hitos de proyecto terminados al 100 %.',
    umbrales: { bronce: 3, plata: 10, oro: 30 },
    medir: (estado) => (estado.planes || [])
      .flatMap((p) => (p.tareas || []).filter((t) => t.esHito && (t.avance || 0) >= 100)).length,
  },
];

/** En qué nivel está una medida, y cuánto falta para el siguiente. */
export function evaluarMedalla(medalla, estado, hoyISO = aISO(hoy())) {
  const valor = Number(medalla.medir(estado, hoyISO)) || 0;
  const { bronce, plata, oro } = medalla.umbrales;

  const conseguido = valor >= oro ? 'oro' : valor >= plata ? 'plata' : valor >= bronce ? 'bronce' : null;
  const siguiente = valor >= oro ? null : valor >= plata ? 'oro' : valor >= bronce ? 'plata' : 'bronce';
  const meta = siguiente ? medalla.umbrales[siguiente] : oro;
  const base = siguiente === 'oro' ? plata : siguiente === 'plata' ? bronce : 0;
  const pct = siguiente
    ? Math.max(0, Math.min(100, Math.round(((valor - base) / (meta - base)) * 100)))
    : 100;

  const falta = siguiente ? Math.max(0, meta - valor) : 0;

  return {
    medalla,
    valor,
    nivel: conseguido,
    siguiente,
    meta,
    falta,
    pct,
    nota: medalla.nota ? medalla.nota(estado, hoyISO) : '',
    frase: conseguido && !siguiente
      ? `Oro: ${cantidad(valor, medalla)}. No hay más allá de esto.`
      : `${cantidad(valor, medalla)}${conseguido ? ` · ${nivel(conseguido).nombre}` : ''}`
        + (siguiente
          ? ` · ${falta === 1 ? 'falta' : 'faltan'} ${cantidad(falta, medalla)} para ${nivel(siguiente).nombre.toLowerCase()}`
          : ''),
  };
}

export function evaluarTodas(estado = {}, hoyISO = aISO(hoy())) {
  return MEDALLAS.map((m) => evaluarMedalla(m, estado, hoyISO));
}

/* ------------------------------------------------------------------ *
 * Las estrellas del día
 * ------------------------------------------------------------------ */

/**
 * Tres estrellas como mucho, y solo por cosas que pasaron de verdad hoy.
 * Un criterio que hoy no aplica (no hay rutinas montadas, no hay plazos) no
 * resta: se sustituye por el siguiente que sí aplique, porque castigar por no
 * usar una parte de la app sería absurdo.
 */
export function estrellasDelDia(estado = {}, hoyISO = aISO(hoy())) {
  const tareas = (estado.tareas || []).filter((t) => !t.archivada);
  const est = estadisticas(estado.historial || [], hoyISO, estado.ajustes?.metaDiaria || 5);
  const tiempo = resumenTiempo(estado.tiempo || [], hoyISO);
  const rutinas = rutinasDeHoy(estado.rutinas || [], estado.rutinasHechas || [], hoyISO);
  const tresIds = estado.ajustes?.tresDelDia?.fecha === hoyISO ? (estado.ajustes.tresDelDia.ids || []) : [];
  const vencenHoy = tareas.filter((t) => t.limite === hoyISO);

  const candidatos = [
    {
      id: 'meta', texto: `Cerrar ${est.meta} tareas`, aplica: true,
      cumplido: est.hoy >= est.meta, detalle: `${est.hoy} de ${est.meta}`,
    },
    {
      id: 'tres', texto: 'Hacer las tres del día', aplica: tresIds.length > 0,
      cumplido: tresIds.length > 0 && tresIds.every((id) => tareas.find((t) => t.id === id)?.completada),
      detalle: `${tresIds.filter((id) => tareas.find((t) => t.id === id)?.completada).length} de ${tresIds.length}`,
    },
    {
      id: 'rutinas', texto: 'Terminar las rutinas de hoy', aplica: rutinas.length > 0,
      cumplido: rutinas.length > 0 && rutinas.every((r) => r.progreso.completa),
      detalle: `${rutinas.filter((r) => r.progreso.completa).length} de ${rutinas.length}`,
    },
    {
      id: 'plazos', texto: 'No dejar vencer ningún plazo de hoy', aplica: vencenHoy.length > 0,
      cumplido: vencenHoy.every((t) => t.completada), detalle: `${vencenHoy.filter((t) => t.completada).length} de ${vencenHoy.length}`,
    },
    {
      id: 'enfoque', texto: 'Medir al menos 25 minutos de enfoque', aplica: true,
      cumplido: tiempo.hoy >= 25, detalle: `${tiempo.hoy} min`,
    },
  ];

  const criterios = candidatos.filter((c) => c.aplica).slice(0, 3);
  const estrellas = criterios.filter((c) => c.cumplido).length;

  return {
    fecha: hoyISO,
    estrellas,
    de: criterios.length,
    criterios,
    frase: estrellas === criterios.length && criterios.length
      ? 'Día redondo.'
      : estrellas
        ? `${estrellas} de ${criterios.length}. Mañana vuelve a cero sin deber nada.`
        : 'Todavía ninguna. Hay día por delante.',
  };
}

/** La tira de los últimos días, para ver la forma de la racha sin dramatizar. */
export function tiraDeEstrellas(estado = {}, hoyISO = aISO(hoy()), dias = 14) {
  const salida = [];
  for (let i = dias - 1; i >= 0; i--) {
    const iso = aISO(sumarDias(hoyISO, -i));
    salida.push({ fecha: iso, ...estrellasDelDia(estado, iso) });
  }
  return salida;
}

export function resumenLogros(estado = {}, hoyISO = aISO(hoy())) {
  const todas = evaluarTodas(estado, hoyISO);
  const cuenta = (n) => todas.filter((x) => x.nivel === n).length;
  const hoyEstrellas = estrellasDelDia(estado, hoyISO);
  // Lo más cerca de conseguirse, que es lo único que mueve a hacer algo hoy.
  const cerca = todas
    .filter((x) => x.siguiente)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  return {
    medallas: todas,
    oro: cuenta('oro'),
    plata: cuenta('plata'),
    bronce: cuenta('bronce'),
    conseguidas: todas.filter((x) => x.nivel).length,
    total: todas.length,
    estrellasHoy: hoyEstrellas,
    cerca,
    frase: !todas.filter((x) => x.nivel).length
      ? 'Ninguna medalla todavía. Salen solas de usar la app; no hay nada que marcar a mano.'
      : `${cuenta('oro')} de oro, ${cuenta('plata')} de plata y ${cuenta('bronce')} de bronce`
        + (cerca.length ? `. Lo más cerca: ${cerca[0].medalla.nombre.toLowerCase()}, ${textoFalta(cerca[0])}.` : '.'),
  };
}

/**
 * Lo que se ha conseguido desde la última vez que se miró, para poder
 * felicitar una sola vez y no cada vez que se abre la pantalla.
 */
export function nuevasDesde(estado = {}, vistas = {}, hoyISO = aISO(hoy())) {
  return evaluarTodas(estado, hoyISO)
    .filter((x) => x.nivel && vistas[x.medalla.id] !== x.nivel)
    .map((x) => ({ id: x.medalla.id, nivel: x.nivel, medalla: x.medalla, valor: x.valor }));
}

/** El estado que hay que guardar para no repetir la felicitación. */
export function marcarVistas(estado = {}, hoyISO = aISO(hoy())) {
  const vistas = {};
  for (const x of evaluarTodas(estado, hoyISO)) if (x.nivel) vistas[x.medalla.id] = x.nivel;
  return vistas;
}
