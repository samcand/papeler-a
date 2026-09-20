/**
 * anio.js — El año en una página.
 *
 * Lo que uno recuerda de un año son cuatro cosas y casi ninguna es la que fue.
 * Aquí está lo que de verdad pasó, sacado de lo que ya estaba guardado: lo que
 * cerraste, las horas medidas, las metas cumplidas —y las que dejaste, con su
 * motivo—, los viajes, lo leído, el dinero y las medallas que salieron.
 *
 * Es para dos cosas: revisar en enero con datos en vez de con memoria, y
 * enseñarlo si te apetece. Nada de esto se calcula distinto para que quede
 * bonito; si el año fue flojo, se nota.
 */

import { aISO, MESES, diferenciaDias, hoy } from './fechas.js';
import { MODULOS } from './modelo.js';
import { resumenGastos } from './gastos.js';
import { evaluarTodas } from './logros.js';
import { diasDeViaje } from './viajes.js';
import { cumplimiento } from './limites.js';

const enAnio = (fecha, anio) => String(fecha || '').slice(0, 4) === String(anio);

/** La racha más larga de días seguidos cerrando algo dentro del año. */
function mejorRacha(historial, anio) {
  const dias = [...new Set(historial.filter((h) => enAnio(h.fecha, anio)).map((h) => h.fecha))].sort();
  let mejor = 0;
  let actual = 0;
  let previo = null;
  for (const d of dias) {
    actual = previo && diferenciaDias(previo, d) === 1 ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
    previo = d;
  }
  return mejor;
}

export function resumenDelAnio(estado = {}, anio = new Date().getFullYear(), hoyISO = aISO(hoy())) {
  const historial = (estado.historial || []).filter((h) => enAnio(h.fecha, anio));
  const tareas = estado.tareas || [];
  const porId = new Map(tareas.map((t) => [t.id, t]));

  const porMes = MESES.map((nombre, i) => ({
    mes: i + 1,
    nombre,
    total: historial.filter((h) => Number(String(h.fecha).slice(5, 7)) === i + 1).length,
  }));

  const porModulo = MODULOS.map((m) => ({
    modulo: m.id,
    nombre: m.nombre,
    icono: m.icono,
    total: historial.filter((h) => (porId.get(h.tareaId)?.modulo || h.modulo) === m.id).length,
  })).filter((x) => x.total).sort((a, b) => b.total - a.total);

  const porProyecto = (() => {
    const mapa = new Map();
    for (const h of historial) {
      const clave = h.proyecto || porId.get(h.tareaId)?.proyecto;
      if (!clave) continue;
      mapa.set(clave, (mapa.get(clave) || 0) + 1);
    }
    return [...mapa.entries()].map(([proyecto, total]) => ({ proyecto, total }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
  })();

  const minutos = (estado.tiempo || []).filter((r) => enAnio(r.fecha, anio))
    .reduce((s, r) => s + (Number(r.minutos) || 0), 0);

  const objetivos = estado.objetivos || [];
  const logrados = objetivos.filter((o) => enAnio(o.logradoEn, anio));
  const abandonados = objetivos.filter((o) => enAnio(o.abandonadoEn, anio));

  const viajes = (estado.viajes || []).filter((v) => enAnio(v.desde, anio));
  const lecturas = (estado.lecturas || []).filter((l) => enAnio(l.leidoEn, anio));
  const diario = (estado.notas || []).filter((n) => n.tipo === 'diario' && enAnio(n.fecha, anio));
  const notas = (estado.notas || []).filter((n) => n.tipo !== 'diario' && enAnio(String(n.creadaEn).slice(0, 10), anio));

  const gastos = resumenGastos(estado.gastos || [], `${anio}-01-01`, `${anio}-12-31`);
  const medallas = evaluarTodas(estado, hoyISO).filter((m) => m.nivel);

  const enCurso = anio === Number(hoyISO.slice(0, 4));
  const diasPasados = enCurso ? diferenciaDias(`${anio}-01-01`, hoyISO) + 1 : 365;

  return {
    anio,
    enCurso,
    cerradas: historial.length,
    porMes,
    mejorMes: [...porMes].sort((a, b) => b.total - a.total)[0],
    porModulo,
    porProyecto,
    mediaDiaria: Math.round((historial.length / Math.max(1, diasPasados)) * 10) / 10,
    mejorRacha: mejorRacha(estado.historial || [], anio),
    minutos,
    horas: Math.round(minutos / 60),
    puntualidad: cumplimiento(tareas.filter((t) => enAnio(String(t.completadaEn).slice(0, 10), anio))),
    logrados,
    abandonados,
    viajes,
    diasDeViaje: viajes.reduce((s, v) => s + diasDeViaje(v), 0),
    lecturas: lecturas.length,
    diario: diario.length,
    notas: notas.length,
    gastos,
    medallas,
    frase: !historial.length
      ? `De ${anio} no hay nada apuntado todavía.`
      : `${historial.length} cosas cerradas en ${anio}`
        + (minutos ? `, ${Math.round(minutos / 60)} horas medidas` : '')
        + (logrados.length ? ` y ${logrados.length} meta${logrados.length === 1 ? '' : 's'} cumplida${logrados.length === 1 ? '' : 's'}` : '')
        + '.',
  };
}

/** El año en texto plano, para copiarlo donde quieras. */
export function textoDelAnio(r) {
  const l = [`${r.anio}${r.enCurso ? ' (todavía en curso)' : ''}`, ''];
  l.push(`Cerradas: ${r.cerradas} · ${r.mediaDiaria} al día · mejor racha: ${r.mejorRacha} días`);
  if (r.horas) l.push(`Tiempo medido: ${r.horas} h`);
  if (r.puntualidad.total) l.push(`Entregas con plazo: ${r.puntualidad.aTiempo} de ${r.puntualidad.total} a tiempo`);

  if (r.porModulo.length) {
    l.push('', 'Por módulo:');
    for (const m of r.porModulo) l.push(`  · ${m.nombre}: ${m.total}`);
  }
  if (r.porProyecto.length) {
    l.push('', 'Los proyectos del año:');
    for (const p of r.porProyecto) l.push(`  · ${p.proyecto}: ${p.total}`);
  }
  if (r.logrados.length) {
    l.push('', 'Metas cumplidas:');
    for (const o of r.logrados) l.push(`  · ${o.que}`);
  }
  if (r.abandonados.length) {
    l.push('', 'Metas que dejé (y por qué):');
    for (const o of r.abandonados) l.push(`  · ${o.que}${o.porque ? ` — ${o.porque}` : ''}`);
  }
  if (r.viajes.length) {
    l.push('', `Viajes: ${r.viajes.length} (${r.diasDeViaje} días)`);
    for (const v of r.viajes) l.push(`  · ${v.nombre}${v.destino && v.destino !== v.nombre ? ` (${v.destino})` : ''}: ${v.desde} → ${v.hasta}`);
  }
  const otros = [];
  if (r.lecturas) otros.push(`${r.lecturas} lecturas`);
  if (r.diario) otros.push(`${r.diario} días de diario`);
  if (r.notas) otros.push(`${r.notas} notas`);
  if (otros.length) l.push('', otros.join(' · '));
  if (r.gastos.total) l.push('', `Gastado: ${r.gastos.total.toLocaleString('es')} · lo que más, ${r.gastos.porCategoria[0].nombre.toLowerCase()}`);
  if (r.medallas.length) {
    l.push('', 'Medallas:');
    for (const m of r.medallas) l.push(`  · ${m.medalla.nombre}: ${m.nivel}`);
  }
  return l.join('\n');
}

/** Los años de los que hay algo que contar. */
export function aniosConDatos(estado = {}) {
  const anios = new Set();
  for (const h of estado.historial || []) if (h.fecha) anios.add(Number(String(h.fecha).slice(0, 4)));
  for (const t of estado.tareas || []) if (t.creadaEn) anios.add(Number(String(t.creadaEn).slice(0, 4)));
  return [...anios].filter(Boolean).sort((a, b) => b - a);
}
