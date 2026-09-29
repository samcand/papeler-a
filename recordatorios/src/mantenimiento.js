/**
 * mantenimiento.js — Lo que toca por uso, no por calendario.
 *
 * Todo el motor de repetición de la app funciona con fechas. El aceite del
 * carro, no: toca a los 5.000 km **o** a los seis meses, lo que llegue antes. Y
 * los kilómetros no avanzan solos, avanzan cuando conduces.
 *
 * Así que aquí hay dos cosas: un **contador** con sus lecturas (la del día que
 * te acordaste de mirar el tablero) y unos **servicios** que vencen por uso, por
 * tiempo o por los dos. Con dos lecturas se puede estimar cuánto usas al día, y
 * con eso, en qué fecha caerá el próximo servicio.
 *
 * La estimación es una recta, no una bola de cristal: si el mes que viene sales
 * de viaje, llegará antes. Por eso siempre se enseña junto a los kilómetros que
 * faltan, que sí son un hecho.
 */

import { aISO, diferenciaDias, hoy, sumarDias } from './fechas.js';

export const UNIDADES = [
  { id: 'km', nombre: 'Kilómetros', corto: 'km' },
  { id: 'millas', nombre: 'Millas', corto: 'mi' },
  { id: 'horas', nombre: 'Horas de uso', corto: 'h' },
];

export function contadorNuevo(campos = {}) {
  return {
    id: 'cnt-' + Math.random().toString(36).slice(2, 8),
    nombre: 'Carro',
    unidad: 'km',
    ficha: null,           // id de la ficha de la colección, si viene de ahí
    lecturas: [],          // { fecha, valor }
    ...campos,
  };
}

/** Las lecturas ordenadas por fecha, que es como hay que leerlas siempre. */
function ordenadas(contador) {
  return [...(contador.lecturas || [])].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

export function lecturaActual(contador) {
  const lista = ordenadas(contador);
  return lista.length ? lista[lista.length - 1] : null;
}

/**
 * Apunta una lectura. Un contador no retrocede: si el número es menor que el
 * último, se rechaza en vez de dejar un histórico imposible.
 */
export function registrarLectura(contador, valor, fechaISO = aISO(hoy())) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: 'Ese no es un número de contador.' };
  const ultima = lecturaActual(contador);
  if (ultima && n < Number(ultima.valor) && fechaISO >= ultima.fecha) {
    return { ok: false, error: `El contador no baja: la última lectura fue ${ultima.valor} el ${ultima.fecha}.` };
  }
  const lecturas = [...(contador.lecturas || []).filter((l) => l.fecha !== fechaISO), { fecha: fechaISO, valor: n }];
  return { ok: true, contador: { ...contador, lecturas } };
}

/**
 * Cuánto se usa al día, sacado del primer y el último apunte con al menos una
 * semana entre medias. Con menos datos devuelve `null`: mejor no estimar que
 * estimar mal.
 */
export function usoDiario(contador) {
  const lista = ordenadas(contador);
  if (lista.length < 2) return null;
  const primera = lista[0];
  const ultima = lista[lista.length - 1];
  const dias = diferenciaDias(primera.fecha, ultima.fecha);
  if (dias < 7) return null;
  const avance = Number(ultima.valor) - Number(primera.valor);
  if (avance <= 0) return null;
  return Math.round((avance / dias) * 10) / 10;
}

export function servicioNuevo(campos = {}) {
  return {
    id: 'srv-' + Math.random().toString(36).slice(2, 8),
    contador: null,
    nombre: 'Cambio de aceite',
    cadaUso: 5000,        // null si solo va por tiempo
    cadaDias: 180,        // null si solo va por uso
    ultimoUso: null,
    ultimaFecha: null,
    notas: '',
    ...campos,
  };
}

/**
 * Cuándo toca este servicio. Si vence por uso y por tiempo, manda el que llegue
 * antes, que es como funcionan los manuales de verdad.
 */
export function estadoServicio(servicio, contador, hoyISO = aISO(hoy())) {
  const actual = lecturaActual(contador);
  const unidad = UNIDADES.find((u) => u.id === (contador?.unidad || 'km'))?.corto || '';
  const porDia = usoDiario(contador);

  let restanUso = null;
  let proximoUso = null;
  if (servicio.cadaUso && actual && servicio.ultimoUso != null) {
    proximoUso = Number(servicio.ultimoUso) + Number(servicio.cadaUso);
    restanUso = proximoUso - Number(actual.valor);
  }

  let restanDias = null;
  let proximaFecha = null;
  if (servicio.cadaDias && servicio.ultimaFecha) {
    proximaFecha = aISO(sumarDias(servicio.ultimaFecha, Number(servicio.cadaDias)));
    restanDias = diferenciaDias(hoyISO, proximaFecha);
  }

  // Con un ritmo medido se puede decir en qué fecha caerían esos kilómetros.
  const fechaPorUso = (restanUso != null && porDia) ? aISO(sumarDias(hoyISO, Math.round(restanUso / porDia))) : null;
  const candidatas = [proximaFecha, fechaPorUso].filter(Boolean).sort();
  const fechaEstimada = candidatas[0] || null;

  const vencido = (restanUso != null && restanUso <= 0) || (restanDias != null && restanDias < 0);
  const cerca = !vencido && ((restanUso != null && servicio.cadaUso && restanUso <= servicio.cadaUso * 0.1)
    || (restanDias != null && restanDias <= 14));
  const sinDatos = restanUso == null && restanDias == null;

  let texto;
  if (sinDatos) texto = 'Sin el último cambio apuntado no se sabe cuándo toca.';
  else if (vencido) {
    texto = restanUso != null && restanUso <= 0
      ? `Vencido por ${-restanUso} ${unidad}.`
      : `Vencido hace ${-restanDias} días.`;
  } else {
    const trozos = [];
    if (restanUso != null) trozos.push(`faltan ${restanUso} ${unidad}`);
    if (restanDias != null) trozos.push(`${restanDias} días`);
    texto = trozos.join(' o ') + (fechaPorUso && porDia ? ` · al ritmo de ${porDia} ${unidad}/día caería el ${fechaPorUso}` : '');
  }

  return {
    servicio, restanUso, restanDias, proximoUso, proximaFecha, fechaPorUso, fechaEstimada,
    vencido, cerca, sinDatos, porDia, unidad, texto,
  };
}

/** Todo lo que vence, lo más urgente arriba. */
export function proximosServicios(servicios = [], contadores = [], hoyISO = aISO(hoy())) {
  const porId = new Map(contadores.map((c) => [c.id, c]));
  return servicios
    .map((s) => estadoServicio(s, porId.get(s.contador), hoyISO))
    .sort((a, b) => (b.vencido - a.vencido)
      || (a.fechaEstimada || '9999').localeCompare(b.fechaEstimada || '9999'));
}

/** Hacerlo: se apunta el uso y la fecha, y el contador vuelve a empezar. */
export function marcarHecho(servicio, contador, hoyISO = aISO(hoy())) {
  const actual = lecturaActual(contador);
  return {
    ...servicio,
    ultimoUso: actual ? Number(actual.valor) : servicio.ultimoUso,
    ultimaFecha: hoyISO,
  };
}

export function tareaDeServicio(estado, contador) {
  const s = estado.servicio;
  return {
    titulo: `${s.nombre} — ${contador?.nombre || 'vehículo'}`,
    fecha: estado.fechaEstimada || aISO(hoy()),
    prioridad: estado.vencido ? 1 : 2,
    modulo: 'personal',
    etiquetas: ['mantenimiento'],
    notas: estado.texto,
  };
}

export function resumenMantenimiento(servicios = [], contadores = [], hoyISO = aISO(hoy())) {
  const estados = proximosServicios(servicios, contadores, hoyISO);
  const vencidos = estados.filter((e) => e.vencido);
  const cerca = estados.filter((e) => e.cerca);
  return {
    total: estados.length,
    vencidos: vencidos.length,
    cerca: cerca.length,
    estados,
    frase: !estados.length ? 'Ningún mantenimiento apuntado.'
      : vencidos.length ? `${vencidos.length} vencido${vencidos.length === 1 ? '' : 's'}: ${vencidos[0].servicio.nombre.toLowerCase()} el primero.`
        : cerca.length ? `${cerca.length} a punto de tocar.`
          : 'Todo al día.',
  };
}

/** El plan del manual, para no empezar de cero. */
export const SERVICIOS_CARRO = [
  { nombre: 'Cambio de aceite y filtro', cadaUso: 5000, cadaDias: 180 },
  { nombre: 'Rotación de llantas', cadaUso: 10000, cadaDias: 365 },
  { nombre: 'Filtro de aire', cadaUso: 15000, cadaDias: 365 },
  { nombre: 'Pastillas de freno (revisar)', cadaUso: 20000, cadaDias: 365 },
  { nombre: 'Revisión general', cadaUso: 20000, cadaDias: 365 },
  { nombre: 'Refrigerante', cadaUso: 40000, cadaDias: 730 },
];
