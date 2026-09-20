/**
 * recurrencia.js — Tareas que se repiten.
 *
 * Una regla es un objeto plano:
 *   { tipo, cada, dias, diaMes, mes, nEsimo, desdeCompletada, hasta, cuenta }
 *
 *   tipo: 'diaria' | 'semanal' | 'mensual' | 'anual' | 'habiles' | 'nEsimo'
 *   cada: cada cuántos días/semanas/meses/años (por defecto 1)
 *   dias: [0..6] para la regla semanal (0 = domingo)
 *   diaMes: número o 'ultimo' para la regla mensual
 *   nEsimo: { n, dia } -> "tercer viernes" es { n: 3, dia: 5 }; n = -1 es el último
 *   desdeCompletada: la siguiente fecha se cuenta desde que la terminas, no
 *     desde la fecha prevista. Es la diferencia entre "revisar la cartera cada
 *     lunes" (fijo) y "cortarme el pelo cada 3 semanas" (desde completada).
 */

import { aISO, deISO, diaSemana, diasDelMes, esHabil, fecha, nEsimoDiaDelMes, siguienteHabil, sumarAnios, sumarDias, sumarMeses, DIAS, MESES } from './fechas.js';

const NOMBRE_DIA = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, 'miércoles': 3, jueves: 4, viernes: 5, sabado: 6, 'sábado': 6 };
const ORDINAL = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, ultimo: -1, 'último': -1 };

export function reglaVacia() {
  return { tipo: 'diaria', cada: 1 };
}

/** Quita acentos y baja a minúsculas, para comparar texto escrito de cualquier forma. */
function limpia(txt) {
  return String(txt).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/**
 * Interpreta una regla escrita a mano: "cada lunes", "cada 2 semanas",
 * "cada día hábil", "el 15 de cada mes", "el último día del mes",
 * "cada tercer viernes", "cada año el 3 de mayo", "cada 3 días desde completada".
 * Devuelve null si el texto no describe una repetición.
 */
export function parseRegla(texto) {
  if (!texto) return null;
  const t = limpia(texto);
  if (!/^(cada|todos|todas|el |los |repetir)/.test(t) && !/\bcada\b/.test(t)) return null;

  const desdeCompletada = /(desde|tras|despues de) (que )?(la )?(complet|termin|hech)/.test(t);
  // El número solo cuenta si va pegado a su unidad: en "cada 3 de mayo" el 3 es
  // el día del mes, no el intervalo.
  const cadaDe = (unidad) => Number((t.match(new RegExp(`cada\\s+(\\d+)\\s+${unidad}`)) || [])[1] || 1);

  // "cada tercer viernes" / "cada último viernes del mes"
  const mNEsimo = t.match(/(primer|primero|segundo|tercer|tercero|cuarto|ultimo)\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado)/);
  if (mNEsimo) {
    return limpiarRegla({ tipo: 'nEsimo', cada: cadaDe('mes'), nEsimo: { n: ORDINAL[mNEsimo[1]], dia: NOMBRE_DIA[mNEsimo[2]] }, desdeCompletada });
  }

  // "el último día del mes" / "fin de mes"
  if (/(ultimo dia del mes|fin de mes|ultimo dia de cada mes)/.test(t)) {
    return limpiarRegla({ tipo: 'mensual', cada: cadaDe('mes'), diaMes: 'ultimo', desdeCompletada });
  }

  // "cada día hábil" / "entre semana"
  if (/(dia habil|dias habiles|entre semana|lunes a viernes)/.test(t)) {
    return limpiarRegla({ tipo: 'habiles', cada: 1, desdeCompletada });
  }

  // "cada año el 3 de mayo" / "cada 3 de mayo"
  const mAnual = t.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/);
  if (mAnual && /(a[nñ]o|anual|\d{1,2}\s+de\s+\w+)/.test(t) && !/mes\b/.test(t)) {
    const mesIdx = MESES.findIndex((m) => limpia(m).startsWith(limpia(mAnual[2]).slice(0, 4)));
    return limpiarRegla({ tipo: 'anual', cada: cadaDe('a[nñ]o'), diaMes: Number(mAnual[1]), mes: mesIdx, desdeCompletada });
  }

  // "el 15 de cada mes" / "cada mes el 15" / "cada 2 meses"
  if (/\bmes(es)?\b/.test(t)) {
    const mDia = t.match(/\b(?:el\s+)?(\d{1,2})\b(?=[^\d]*mes|\s*$)/) || t.match(/mes\w*\s+el\s+(\d{1,2})/);
      const cadaMeses = cadaDe('mes');
    return limpiarRegla({ tipo: 'mensual', cada: cadaMeses, diaMes: mDia ? Number(mDia[1]) : null, desdeCompletada });
  }

  // "cada lunes y miércoles" / "cada 2 semanas" / "todas las semanas"
  const dias = [];
  for (const [nombre, idx] of Object.entries(NOMBRE_DIA)) {
    if (new RegExp(`\\b${nombre}s?\\b`).test(t) && !dias.includes(idx)) dias.push(idx);
  }
  if (dias.length) {
    const cadaSemanas = Number((t.match(/cada\s+(\d+)\s+semana/) || [])[1] || 1);
    return limpiarRegla({ tipo: 'semanal', cada: cadaSemanas, dias: dias.sort((a, b) => a - b), desdeCompletada });
  }
  if (/\bsemana(s)?\b/.test(t)) {
    return limpiarRegla({ tipo: 'semanal', cada: Number((t.match(/cada\s+(\d+)\s+semana/) || [])[1] || 1), desdeCompletada });
  }

  if (/\ba[nñ]o(s)?\b|anual/.test(t)) return limpiarRegla({ tipo: 'anual', cada: cadaDe('a[nñ]o'), desdeCompletada });
  if (/\bdia(s)?\b|diario|diaria/.test(t) || /^cada\s+\d+$/.test(t)) {
    return limpiarRegla({ tipo: 'diaria', cada: cadaDe('dia'), desdeCompletada });
  }
  return null;
}

function limpiarRegla(r) {
  const out = { tipo: r.tipo, cada: Math.max(1, Number(r.cada) || 1) };
  if (r.dias && r.dias.length) out.dias = r.dias;
  if (r.diaMes != null) out.diaMes = r.diaMes;
  if (r.mes != null && r.mes >= 0) out.mes = r.mes;
  if (r.nEsimo) out.nEsimo = r.nEsimo;
  if (r.desdeCompletada) out.desdeCompletada = true;
  if (r.hasta) out.hasta = r.hasta;
  if (r.cuenta) out.cuenta = r.cuenta;
  return out;
}

/** La regla en palabras, para mostrarla en la tarjeta de la tarea. */
export function textoRegla(regla) {
  if (!regla) return '';
  const n = regla.cada || 1;
  const veces = n === 1 ? '' : ` ${n}`;
  let base;
  switch (regla.tipo) {
    case 'habiles': base = 'cada día hábil'; break;
    case 'diaria': base = n === 1 ? 'cada día' : `cada ${n} días`; break;
    case 'semanal':
      base = regla.dias?.length
        ? `cada${veces} ${regla.dias.map((d) => DIAS[d]).join(', ')}`
        : (n === 1 ? 'cada semana' : `cada ${n} semanas`);
      break;
    case 'mensual':
      if (regla.diaMes === 'ultimo') base = n === 1 ? 'el último día del mes' : `el último día cada ${n} meses`;
      else if (regla.diaMes) base = `el ${regla.diaMes} de cada${veces} mes${n === 1 ? '' : 'es'}`;
      else base = n === 1 ? 'cada mes' : `cada ${n} meses`;
      break;
    case 'anual':
      base = regla.diaMes && regla.mes != null
        ? `cada año el ${regla.diaMes} de ${MESES[regla.mes]}`
        : (n === 1 ? 'cada año' : `cada ${n} años`);
      break;
    case 'nEsimo': {
      const ord = regla.nEsimo.n === -1 ? 'último' : ['', 'primer', 'segundo', 'tercer', 'cuarto'][regla.nEsimo.n];
      base = `cada ${ord} ${DIAS[regla.nEsimo.dia]} del mes`;
      break;
    }
    default: base = 'cada día';
  }
  return regla.desdeCompletada ? `${base} (desde que la completas)` : base;
}

/**
 * Siguiente fecha de la regla, estrictamente posterior a `desde`.
 * Devuelve ISO, o null si la regla ya terminó (`hasta`).
 */
export function siguienteFecha(regla, desde, opciones = {}) {
  if (!regla) return null;
  const feriados = opciones.feriados || [];
  const base = deISO(desde);
  let sig;

  switch (regla.tipo) {
    case 'habiles':
      sig = siguienteHabil(base, feriados);
      break;
    case 'diaria':
      sig = sumarDias(base, regla.cada || 1);
      break;
    case 'semanal': {
      // La semana empieza en lunes, así que se compara con ese orden: si se
      // usara el 0 = domingo de JavaScript, "cada domingo" escrito un sábado
      // se iría a la semana siguiente.
      const enSemana = (d) => (d + 6) % 7;
      const dias = regla.dias?.length ? regla.dias : [diaSemana(base)];
      const objetivos = [...new Set(dias.map(enSemana))].sort((a, b) => a - b);
      const actual = enSemana(diaSemana(base));
      const siguienteEnSemana = objetivos.find((d) => d > actual);
      if (siguienteEnSemana != null) {
        sig = sumarDias(base, siguienteEnSemana - actual);
      } else {
        const lunes = sumarDias(base, -actual);
        sig = sumarDias(lunes, (regla.cada || 1) * 7 + objetivos[0]);
      }
      break;
    }
    case 'mensual': {
      if (regla.diaMes === 'ultimo') {
        const mesSig = sumarMeses(fecha(base.getFullYear(), base.getMonth(), 1), regla.cada || 1);
        const ultimoEste = fecha(base.getFullYear(), base.getMonth(), diasDelMes(base.getFullYear(), base.getMonth()));
        sig = ultimoEste > base
          ? ultimoEste
          : fecha(mesSig.getFullYear(), mesSig.getMonth(), diasDelMes(mesSig.getFullYear(), mesSig.getMonth()));
      } else if (regla.diaMes) {
        const esteMes = fecha(base.getFullYear(), base.getMonth(), Math.min(regla.diaMes, diasDelMes(base.getFullYear(), base.getMonth())));
        if (esteMes > base) sig = esteMes;
        else {
          const m = sumarMeses(fecha(base.getFullYear(), base.getMonth(), 1), regla.cada || 1);
          sig = fecha(m.getFullYear(), m.getMonth(), Math.min(regla.diaMes, diasDelMes(m.getFullYear(), m.getMonth())));
        }
      } else {
        sig = sumarMeses(base, regla.cada || 1);
      }
      break;
    }
    case 'anual': {
      if (regla.mes != null && regla.diaMes) {
        const esteAnio = fecha(base.getFullYear(), regla.mes, regla.diaMes);
        sig = esteAnio > base ? esteAnio : fecha(base.getFullYear() + (regla.cada || 1), regla.mes, regla.diaMes);
      } else {
        sig = sumarAnios(base, regla.cada || 1);
      }
      break;
    }
    case 'nEsimo': {
      const { n, dia } = regla.nEsimo;
      const esteMes = nEsimoDiaDelMes(base.getFullYear(), base.getMonth(), dia, n);
      if (esteMes > base) sig = esteMes;
      else {
        const m = sumarMeses(fecha(base.getFullYear(), base.getMonth(), 1), regla.cada || 1);
        sig = nEsimoDiaDelMes(m.getFullYear(), m.getMonth(), dia, n);
      }
      break;
    }
    default:
      sig = sumarDias(base, 1);
  }

  if (opciones.soloHabiles && regla.tipo !== 'habiles') {
    let guarda = 0;
    while (!esHabil(sig, feriados) && guarda++ < 10) sig = sumarDias(sig, 1);
  }
  const iso = aISO(sig);
  if (regla.hasta && iso > regla.hasta) return null;
  return iso;
}

/** Las próximas `n` fechas, para previsualizar la regla antes de guardarla. */
export function proximasFechas(regla, desde, n = 5, opciones = {}) {
  const out = [];
  let cursor = aISO(desde);
  for (let i = 0; i < n; i++) {
    const sig = siguienteFecha(regla, cursor, opciones);
    if (!sig) break;
    out.push(sig);
    cursor = sig;
  }
  return out;
}

/**
 * Completar una tarea repetida: devuelve la fecha de la siguiente ocurrencia.
 * Si la regla es "desde completada" se cuenta desde hoy; si no, desde la fecha
 * que tenía prevista, para que una tarea atrasada no arrastre el calendario.
 */
export function avanzarTarea(tarea, hoyISO, opciones = {}) {
  if (!tarea.regla) return null;
  const desde = tarea.regla.desdeCompletada ? hoyISO : (tarea.fecha || hoyISO);
  let sig = siguienteFecha(tarea.regla, desde, opciones);
  // Una tarea fija muy atrasada se pone al día en vez de repetirse en el pasado.
  let guarda = 0;
  while (sig && sig < hoyISO && guarda++ < 400) {
    const otra = siguienteFecha(tarea.regla, sig, opciones);
    if (!otra) break;
    sig = otra;
  }
  return sig;
}
