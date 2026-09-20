/**
 * personas.js — Cumpleaños, fechas que no se olvidan y regalos.
 *
 * El problema real no es acordarse el día: es acordarse **con tiempo**. Un
 * aviso el mismo día sirve para un mensaje, no para un regalo. Por eso cada
 * fecha lleva sus días de antelación y la tarea se crea entonces.
 *
 * Las ideas de regalo viven con la persona porque es cuando se te ocurren: en
 * marzo, hablando de cualquier cosa, para un cumpleaños de noviembre.
 */

import { aISO, deISO, diferenciaDias, hoy, textoLargo } from './fechas.js';

export function personaNueva(campos = {}) {
  return {
    id: 'per-' + Math.random().toString(36).slice(2, 8),
    nombre: '',
    relacion: '',
    cumple: null,          // AAAA-MM-DD; el año puede ser cualquiera
    telefono: '',
    notas: '',
    fechas: [],            // { id, que, fecha, anual, avisarAntes }
    regalos: [],           // { id, que, precio, comprado, enlace }
    ...campos,
  };
}

/** Los años que cumple, si sabemos el año de nacimiento. */
export function edad(cumpleISO, hoyISO = aISO(hoy())) {
  if (!cumpleISO) return null;
  const n = deISO(cumpleISO);
  const h = deISO(hoyISO);
  if (n.getFullYear() < 1900) return null;
  let anios = h.getFullYear() - n.getFullYear();
  const cumplioYa = (h.getMonth() > n.getMonth())
    || (h.getMonth() === n.getMonth() && h.getDate() >= n.getDate());
  if (!cumplioYa) anios--;
  return anios >= 0 && anios < 130 ? anios : null;
}

/** La próxima vez que cae esa fecha, este año o el que viene. */
export function proximaVez(fechaISO, hoyISO = aISO(hoy())) {
  if (!fechaISO) return null;
  const d = deISO(fechaISO);
  const h = deISO(hoyISO);
  let candidata = new Date(h.getFullYear(), d.getMonth(), d.getDate(), 12);
  if (aISO(candidata) < hoyISO) candidata = new Date(h.getFullYear() + 1, d.getMonth(), d.getDate(), 12);
  return aISO(candidata);
}

/**
 * Lo que viene: cumpleaños y fechas propias, ordenado por cercanía. Las fechas
 * marcadas como anuales se repiten; las de una vez, si ya pasaron, desaparecen.
 */
export function agenda(personas = [], hoyISO = aISO(hoy()), dias = 90) {
  const salida = [];
  for (const p of personas) {
    if (p.cumple) {
      const fecha = proximaVez(p.cumple, hoyISO);
      const cuantos = edad(p.cumple, fecha);
      salida.push({
        persona: p, tipo: 'cumple', que: 'Cumpleaños', fecha,
        faltan: diferenciaDias(hoyISO, fecha),
        avisarAntes: p.avisarAntes ?? 14,
        texto: `${p.nombre} cumple${cuantos != null ? ` ${cuantos}` : ''} el ${textoLargo(fecha)}`,
      });
    }
    for (const f of p.fechas || []) {
      if (!f.fecha) continue;
      const fecha = f.anual === false ? f.fecha : proximaVez(f.fecha, hoyISO);
      if (f.anual === false && fecha < hoyISO) continue;
      salida.push({
        persona: p, tipo: 'fecha', que: f.que || 'Fecha', fecha,
        faltan: diferenciaDias(hoyISO, fecha),
        avisarAntes: f.avisarAntes ?? 7,
        texto: `${f.que || 'Fecha'} de ${p.nombre}: ${textoLargo(fecha)}`,
      });
    }
  }
  return salida
    .filter((x) => x.faltan <= dias)
    .sort((a, b) => a.faltan - b.faltan);
}

/** Lo que ya toca preparar: está dentro de su ventana de aviso. */
export function tocaPreparar(personas = [], hoyISO = aISO(hoy())) {
  return agenda(personas, hoyISO, 365).filter((x) => x.faltan <= x.avisarAntes);
}

export function tareaDeFecha(evento) {
  return {
    titulo: `${evento.que}: ${evento.persona.nombre}`,
    fecha: aISO(deISO(evento.fecha)),
    prioridad: 2,
    modulo: 'personal',
    etiquetas: ['personas'],
    notas: evento.texto + (evento.persona.regalos?.some((r) => !r.comprado)
      ? `\nIdeas apuntadas: ${evento.persona.regalos.filter((r) => !r.comprado).map((r) => r.que).join(', ')}`
      : ''),
  };
}

/** Regalos pensados y todavía no comprados, con para quién son. */
export function regalosPendientes(personas = []) {
  const salida = [];
  for (const p of personas) {
    for (const r of p.regalos || []) {
      if (r.comprado) continue;
      salida.push({ persona: p, regalo: r });
    }
  }
  return salida;
}

export function resumenPersonas(personas = [], hoyISO = aISO(hoy())) {
  const proximos = agenda(personas, hoyISO, 30);
  const preparar = tocaPreparar(personas, hoyISO);
  const regalos = regalosPendientes(personas);
  const sinCumple = personas.filter((p) => !p.cumple).length;
  return {
    total: personas.length,
    proximos,
    preparar,
    regalos: regalos.length,
    sinCumple,
    frase: !personas.length ? 'Nadie apuntado todavía.'
      : proximos.length
        ? `${proximos.length} fecha${proximos.length === 1 ? '' : 's'} en el próximo mes. La primera: ${proximos[0].texto}.`
        : 'Nada en el próximo mes.',
  };
}
