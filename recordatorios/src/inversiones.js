/**
 * inversiones.js — La parte que convierte la app en una herramienta de trabajo.
 *
 * Todo el cálculo es local y explícito: no hay precios en vivo ni API de
 * mercado (la app funciona sin internet), así que los precios los pones tú y
 * la app se encarga de lo que de verdad se olvida: el tamaño correcto de la
 * posición, la disciplina del stop, los vencimientos, y la revisión periódica.
 */

import { aISO, deISO, diferenciaDias, fecha, nEsimoDiaDelMes, sumarDias, sumarMeses } from './fechas.js';

/* ------------------------------------------------------------------ *
 * Riesgo y tamaño de posición
 * ------------------------------------------------------------------ */

/**
 * Cuántas acciones comprar para arriesgar solo un % del capital.
 *
 * La cuenta que casi nadie hace antes de comprar: el tamaño sale del riesgo
 * (distancia al stop), no de las ganas. Devuelve también los avisos cuando la
 * posición se come una parte desproporcionada de la cartera.
 */
export function tamanoPosicion({ capital, riesgoPct = 1, entrada, stop, lado = 'largo', comision = 0, maxExposicionPct = 20 }) {
  const cap = Number(capital) || 0;
  const pe = Number(entrada) || 0;
  const ps = Number(stop) || 0;
  if (cap <= 0 || pe <= 0) return { error: 'Falta el capital o el precio de entrada.' };
  if (ps <= 0) return { error: 'Sin stop no hay tamaño: define dónde te bajas.' };

  const distancia = lado === 'corto' ? ps - pe : pe - ps;
  if (distancia <= 0) {
    return { error: lado === 'corto' ? 'En corto, el stop va por encima de la entrada.' : 'En largo, el stop va por debajo de la entrada.' };
  }

  const riesgoMonto = cap * (Number(riesgoPct) || 0) / 100;
  const acciones = Math.floor((riesgoMonto - comision * 2) / distancia);
  const costo = acciones * pe;
  const exposicionPct = cap > 0 ? (costo / cap) * 100 : 0;
  const avisos = [];

  if (acciones <= 0) avisos.push('Con ese riesgo y ese stop no alcanza ni para una acción: acerca el stop o sube el riesgo.');
  if (exposicionPct > maxExposicionPct) {
    avisos.push(`La posición sería el ${exposicionPct.toFixed(1)} % de la cartera (tu tope es ${maxExposicionPct} %).`);
  }
  const distanciaPct = (distancia / pe) * 100;
  if (distanciaPct < 1) avisos.push('El stop está a menos del 1 %: el ruido normal del mercado te sacará.');
  if (distanciaPct > 25) avisos.push('El stop está a más del 25 %: revisa si la tesis aguanta esa caída.');

  return {
    acciones,
    riesgoMonto: redondea(riesgoMonto),
    riesgoReal: redondea(acciones * distancia + comision * 2),
    costo: redondea(costo),
    exposicionPct: redondea(exposicionPct),
    distancia: redondea(distancia),
    distanciaPct: redondea(distanciaPct),
    avisos,
  };
}

/** R múltiplo: cuántas veces el riesgo inicial ganaste o perdiste. */
export function rMultiplo({ entrada, salida, stop, lado = 'largo' }) {
  const riesgo = lado === 'corto' ? stop - entrada : entrada - stop;
  if (!riesgo || riesgo <= 0) return null;
  const movimiento = lado === 'corto' ? entrada - salida : salida - entrada;
  return redondea(movimiento / riesgo, 2);
}

/** Resultado cerrado de una operación: dinero, porcentaje y R. */
export function resultadoOperacion(op) {
  const lado = op.lado || 'largo';
  const cantidad = Number(op.cantidad) || 0;
  const entrada = Number(op.entrada) || 0;
  const salida = Number(op.salida);
  if (!Number.isFinite(salida) || !cantidad || !entrada) return null;
  const bruto = (lado === 'corto' ? entrada - salida : salida - entrada) * cantidad;
  const comisiones = Number(op.comisiones) || 0;
  const neto = bruto - comisiones;
  return {
    pnl: redondea(neto),
    pnlPct: redondea((neto / (entrada * cantidad)) * 100),
    r: op.stop ? rMultiplo({ entrada, salida, stop: Number(op.stop), lado }) : null,
    dias: op.fechaEntrada && op.fechaSalida ? diferenciaDias(op.fechaEntrada, op.fechaSalida) : null,
  };
}

/**
 * Las estadísticas del diario de operaciones. Lo que dice si el sistema sirve:
 * no el porcentaje de aciertos, sino la expectativa en R.
 */
export function resumenOperaciones(operaciones = []) {
  const cerradas = operaciones.filter((o) => o.salida != null && o.salida !== '');
  const res = cerradas.map((o) => ({ op: o, r: resultadoOperacion(o) })).filter((x) => x.r);
  if (!res.length) {
    return { total: 0, ganadas: 0, perdidas: 0, winRate: 0, pnl: 0, expectativaR: null, factorBeneficio: null, rTotal: 0, racha: 0, mejor: null, peor: null };
  }
  const ganadas = res.filter((x) => x.r.pnl > 0);
  const perdidas = res.filter((x) => x.r.pnl < 0);
  const sumaGanancias = ganadas.reduce((s, x) => s + x.r.pnl, 0);
  const sumaPerdidas = Math.abs(perdidas.reduce((s, x) => s + x.r.pnl, 0));
  const conR = res.filter((x) => x.r.r != null);
  const rTotal = conR.reduce((s, x) => s + x.r.r, 0);

  // Racha actual en orden cronológico de salida (positiva = ganadoras seguidas).
  const enOrden = [...res].sort((a, b) => String(a.op.fechaSalida || '').localeCompare(String(b.op.fechaSalida || '')));
  let racha = 0;
  for (let i = enOrden.length - 1; i >= 0; i--) {
    const gana = enOrden[i].r.pnl > 0;
    if (racha === 0) racha = gana ? 1 : -1;
    else if (gana && racha > 0) racha++;
    else if (!gana && racha < 0) racha--;
    else break;
  }

  const porR = conR.slice().sort((a, b) => b.r.r - a.r.r);
  return {
    total: res.length,
    ganadas: ganadas.length,
    perdidas: perdidas.length,
    winRate: redondea((ganadas.length / res.length) * 100),
    pnl: redondea(res.reduce((s, x) => s + x.r.pnl, 0)),
    promedioGanancia: ganadas.length ? redondea(sumaGanancias / ganadas.length) : 0,
    promedioPerdida: perdidas.length ? redondea(sumaPerdidas / perdidas.length) : 0,
    factorBeneficio: sumaPerdidas > 0 ? redondea(sumaGanancias / sumaPerdidas, 2) : null,
    expectativaR: conR.length ? redondea(rTotal / conR.length, 2) : null,
    rTotal: redondea(rTotal, 2),
    racha,
    mejor: porR[0] ? { ticker: porR[0].op.ticker, r: porR[0].r.r } : null,
    peor: porR.length ? { ticker: porR[porR.length - 1].op.ticker, r: porR[porR.length - 1].r.r } : null,
    duracionMedia: promedio(res.map((x) => x.r.dias).filter((d) => d != null)),
  };
}

/* ------------------------------------------------------------------ *
 * Cartera
 * ------------------------------------------------------------------ */

/** Valor, peso y resultado abierto de cada posición. */
export function valoraCartera(posiciones = [], efectivo = 0) {
  const filas = posiciones.map((p) => {
    const cantidad = Number(p.cantidad) || 0;
    const precio = Number(p.precio ?? p.entrada) || 0;
    const costeUnidad = Number(p.entrada) || 0;
    const valor = cantidad * precio;
    const coste = cantidad * costeUnidad;
    return {
      ...p,
      valor: redondea(valor),
      coste: redondea(coste),
      pnl: redondea(valor - coste),
      pnlPct: coste ? redondea(((valor - coste) / coste) * 100) : 0,
    };
  });
  const invertido = filas.reduce((s, f) => s + f.valor, 0);
  const total = invertido + (Number(efectivo) || 0);
  for (const f of filas) f.peso = total ? redondea((f.valor / total) * 100) : 0;
  return {
    filas: filas.sort((a, b) => b.valor - a.valor),
    invertido: redondea(invertido),
    efectivo: redondea(Number(efectivo) || 0),
    total: redondea(total),
    pnl: redondea(filas.reduce((s, f) => s + f.pnl, 0)),
    pesoEfectivo: total ? redondea(((Number(efectivo) || 0) / total) * 100) : 0,
  };
}

/** Concentración por sector y el índice HHI (10.000 = todo en una sola cosa). */
export function diversificacion(posiciones = [], efectivo = 0) {
  const { filas, total } = valoraCartera(posiciones, efectivo);
  const porSector = new Map();
  for (const f of filas) {
    const sector = f.sector || 'Sin sector';
    porSector.set(sector, (porSector.get(sector) || 0) + f.valor);
  }
  const sectores = [...porSector.entries()]
    .map(([sector, valor]) => ({ sector, valor: redondea(valor), peso: total ? redondea((valor / total) * 100) : 0 }))
    .sort((a, b) => b.valor - a.valor);
  const hhi = Math.round(filas.reduce((s, f) => s + Math.pow(f.peso, 2), 0));
  return { sectores, hhi, concentrado: hhi > 2500 };
}

/**
 * Revisión automática de la cartera contra tus propias reglas.
 * Es la lista de "lo que debería estar mirando y no estoy mirando".
 */
export function alertasCartera(posiciones = [], reglas = {}, hoyISO = aISO(new Date()), efectivo = 0) {
  const r = {
    maxPesoPosicion: 20,
    maxPesoSector: 35,
    diasSinRevisar: 90,
    perdidaAviso: -15,
    ...reglas,
  };
  const { filas } = valoraCartera(posiciones, efectivo);
  const alertas = [];

  for (const f of filas) {
    if (f.peso > r.maxPesoPosicion) {
      alertas.push({ nivel: 'alto', ticker: f.ticker, texto: `${f.ticker} pesa ${f.peso} % de la cartera (tope ${r.maxPesoPosicion} %).`, accion: 'Recortar la posición o subir el tope a conciencia.' });
    }
    if (!f.stop) {
      alertas.push({ nivel: 'medio', ticker: f.ticker, texto: `${f.ticker} no tiene stop definido.`, accion: 'Escribe a qué precio te bajas antes de que el mercado lo decida por ti.' });
    } else if (f.precio && ((f.lado === 'corto' && Number(f.precio) >= Number(f.stop)) || (f.lado !== 'corto' && Number(f.precio) <= Number(f.stop)))) {
      alertas.push({ nivel: 'alto', ticker: f.ticker, texto: `${f.ticker} está en su stop (${f.stop}) o lo ha pasado.`, accion: 'Ejecuta el plan: cerrar o reescribir la tesis por escrito.' });
    }
    if (f.objetivo && f.precio && Number(f.precio) >= Number(f.objetivo)) {
      alertas.push({ nivel: 'medio', ticker: f.ticker, texto: `${f.ticker} alcanzó tu precio objetivo (${f.objetivo}).`, accion: 'Vender, subir el objetivo con argumentos, o poner un stop dinámico.' });
    }
    if (f.pnlPct <= r.perdidaAviso) {
      alertas.push({ nivel: 'medio', ticker: f.ticker, texto: `${f.ticker} acumula ${f.pnlPct} %.`, accion: '¿Sigue viva la tesis o solo la esperanza?' });
    }
    if (f.revisadaEn && diferenciaDias(f.revisadaEn, hoyISO) > r.diasSinRevisar) {
      alertas.push({ nivel: 'bajo', ticker: f.ticker, texto: `${f.ticker} lleva ${diferenciaDias(f.revisadaEn, hoyISO)} días sin revisar.`, accion: 'Revisa la tesis y anota la fecha.' });
    }
    if (!f.tesis) {
      alertas.push({ nivel: 'bajo', ticker: f.ticker, texto: `${f.ticker} no tiene tesis escrita.`, accion: 'Si no puedes escribir por qué la tienes en dos líneas, no sabes por qué la tienes.' });
    }
  }

  const { sectores } = diversificacion(posiciones, efectivo);
  for (const s of sectores) {
    if (s.peso > r.maxPesoSector) {
      alertas.push({ nivel: 'medio', texto: `El sector ${s.sector} pesa ${s.peso} % (tope ${r.maxPesoSector} %).`, accion: 'Diversifica o acepta el riesgo por escrito.' });
    }
  }

  const orden = { alto: 0, medio: 1, bajo: 2 };
  return alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

/** Qué comprar y qué vender para volver a los pesos objetivo. */
export function rebalanceo(posiciones = [], objetivos = {}, efectivo = 0, umbralPct = 5) {
  const { filas, total } = valoraCartera(posiciones, efectivo);
  const movimientos = [];
  const tickers = new Set([...filas.map((f) => f.ticker), ...Object.keys(objetivos)]);

  for (const ticker of tickers) {
    const fila = filas.find((f) => f.ticker === ticker);
    const objetivo = Number(objetivos[ticker]) || 0;
    const pesoActual = fila ? fila.peso : 0;
    const desvio = pesoActual - objetivo;
    if (Math.abs(desvio) < umbralPct) continue;
    const montoObjetivo = total * objetivo / 100;
    const diferencia = montoObjetivo - (fila ? fila.valor : 0);
    const precio = fila ? Number(fila.precio ?? fila.entrada) : null;
    movimientos.push({
      ticker,
      accion: diferencia > 0 ? 'comprar' : 'vender',
      pesoActual: redondea(pesoActual),
      pesoObjetivo: objetivo,
      monto: redondea(Math.abs(diferencia)),
      acciones: precio ? Math.floor(Math.abs(diferencia) / precio) : null,
    });
  }
  return movimientos.sort((a, b) => b.monto - a.monto);
}

/* ------------------------------------------------------------------ *
 * Calendario del mercado
 * ------------------------------------------------------------------ */

/** Vencimiento mensual de opciones: el tercer viernes. */
export function vencimientoOpciones(anio, mes) {
  return aISO(nEsimoDiaDelMes(anio, mes, 5, 3));
}

export function proximosVencimientos(desdeISO, n = 6) {
  const d = deISO(desdeISO);
  const out = [];
  let cursor = fecha(d.getFullYear(), d.getMonth(), 1);
  while (out.length < n) {
    const v = vencimientoOpciones(cursor.getFullYear(), cursor.getMonth());
    if (v >= aISO(d)) out.push(v);
    cursor = sumarMeses(cursor, 1);
  }
  return out;
}

/** Fin de trimestre natural, que es cuando toca revisión y reporte. */
export function finesDeTrimestre(anio) {
  return [2, 5, 8, 11].map((mes) => aISO(fecha(anio, mes, new Date(anio, mes + 1, 0).getDate())));
}

/**
 * Recordatorios que la cartera genera sola: resultados trimestrales, fechas
 * ex-dividendo, vencimientos y revisiones de tesis que se han quedado viejas.
 */
export function tareasDeCartera(cartera = {}, hoyISO = aISO(new Date()), reglas = {}) {
  const r = { diasSinRevisar: 90, avisoEarningsDias: 3, avisoDividendoDias: 2, ...reglas };
  const tareas = [];
  const push = (t) => tareas.push({ modulo: 'inversiones', origen: 'cartera', ...t });

  for (const p of cartera.posiciones || []) {
    if (p.earnings && p.earnings >= hoyISO) {
      push({
        titulo: `Resultados de ${p.ticker}`,
        fecha: aISO(sumarDias(p.earnings, -r.avisoEarningsDias)),
        prioridad: 2,
        notas: `Antes: decide qué harías si sorprende para bien y para mal. Presentación el ${p.earnings}.`,
        etiquetas: ['earnings', p.ticker],
      });
    }
    if (p.exDividendo && p.exDividendo >= hoyISO) {
      push({
        titulo: `Ex-dividendo de ${p.ticker}`,
        fecha: aISO(sumarDias(p.exDividendo, -r.avisoDividendoDias)),
        prioridad: 3,
        notas: 'Para cobrar hay que tenerla comprada antes de la fecha ex-dividendo.',
        etiquetas: ['dividendo', p.ticker],
      });
    }
    if (p.revisadaEn && diferenciaDias(p.revisadaEn, hoyISO) > r.diasSinRevisar) {
      push({
        titulo: `Revisar la tesis de ${p.ticker}`,
        fecha: hoyISO,
        prioridad: 2,
        notas: `Última revisión: ${p.revisadaEn}. ¿La compraría hoy al precio de hoy?`,
        etiquetas: ['tesis', p.ticker],
      });
    }
    if (p.opciones) {
      const venc = proximosVencimientos(hoyISO, 1)[0];
      push({
        titulo: `Vencimiento de opciones sobre ${p.ticker}`,
        fecha: aISO(sumarDias(venc, -2)),
        prioridad: 1,
        notas: `Vencen el ${venc}: decidir si rolar, dejar asignar o cerrar.`,
        etiquetas: ['opciones', p.ticker],
      });
    }
  }

  for (const v of cartera.vigilancia || []) {
    if (v.precioAlerta) {
      push({
        titulo: `Vigilar ${v.ticker} en ${v.precioAlerta}`,
        fecha: hoyISO,
        prioridad: 3,
        notas: v.tesis || 'Precio de entrada que estabas esperando.',
        etiquetas: ['vigilancia', v.ticker],
      });
    }
  }
  return tareas;
}

/* ------------------------------------------------------------------ *
 * Fiscalidad del año
 * ------------------------------------------------------------------ */

/**
 * Plusvalías realizadas por año a partir del diario.
 *
 * Es un **informe, no un consejo fiscal**: cada país tiene sus reglas de
 * compensación, de plazos y de recompra. Lo que hace la app es darte el número
 * y los datos ordenados para que tú (o quien te lleve los impuestos) hagáis el
 * resto sin copiar nada a mano.
 */
export function informeFiscal(operaciones = [], anio = new Date().getFullYear()) {
  const cerradas = operaciones
    .filter((o) => o.salida != null && o.salida !== '' && o.fechaSalida)
    .filter((o) => String(o.fechaSalida).slice(0, 4) === String(anio));

  const filas = cerradas.map((o) => {
    const r = resultadoOperacion(o);
    return {
      ticker: o.ticker,
      cantidad: Number(o.cantidad) || 0,
      fechaEntrada: o.fechaEntrada,
      fechaSalida: o.fechaSalida,
      entrada: Number(o.entrada) || 0,
      salida: Number(o.salida) || 0,
      comisiones: Number(o.comisiones) || 0,
      resultado: r ? r.pnl : 0,
      dias: r ? r.dias : null,
    };
  }).sort((a, b) => String(a.fechaSalida).localeCompare(String(b.fechaSalida)));

  const ganancias = filas.filter((f) => f.resultado > 0).reduce((s, f) => s + f.resultado, 0);
  const perdidas = filas.filter((f) => f.resultado < 0).reduce((s, f) => s + f.resultado, 0);

  // Recompra del mismo valor poco después de venderlo en pérdidas: en varios
  // países eso impide compensar la pérdida. La app avisa; la norma la pones tú.
  const avisos = [];
  for (const f of filas.filter((x) => x.resultado < 0)) {
    const recompra = operaciones.find((o) => o.ticker === f.ticker && o.fechaEntrada
      && o.fechaEntrada > f.fechaSalida && diferenciaDias(f.fechaSalida, o.fechaEntrada) <= 60);
    if (recompra) {
      avisos.push(`${f.ticker}: vendida en pérdidas el ${f.fechaSalida} y recomprada el ${recompra.fechaEntrada} `
        + `(${diferenciaDias(f.fechaSalida, recompra.fechaEntrada)} días después). Revisa la regla de recompra de tu país antes de compensar.`);
    }
  }

  const porTicker = new Map();
  for (const f of filas) porTicker.set(f.ticker, (porTicker.get(f.ticker) || 0) + f.resultado);

  return {
    anio,
    operaciones: filas,
    ganancias: redondea(ganancias),
    perdidas: redondea(perdidas),
    neto: redondea(ganancias + perdidas),
    comisiones: redondea(filas.reduce((s, f) => s + f.comisiones, 0)),
    porTicker: [...porTicker.entries()].map(([ticker, resultado]) => ({ ticker, resultado: redondea(resultado) }))
      .sort((a, b) => b.resultado - a.resultado),
    avisos,
  };
}

/* ------------------------------------------------------------------ *
 * Escenarios y pruebas de estrés
 * ------------------------------------------------------------------ */

export const ESCENARIOS = [
  { id: 'correccion', nombre: 'Corrección del 10 %', caida: 10 },
  { id: 'mercadoBajista', nombre: 'Mercado bajista (−20 %)', caida: 20 },
  { id: 'crisis', nombre: 'Crisis (−35 %)', caida: 35 },
  { id: 'burbuja', nombre: 'Estallido sectorial (−50 % en un sector)', caida: 50, soloSector: true },
];

/**
 * Qué le pasa a la cartera si cae lo que sea. Lo interesante no es el número
 * final sino **qué stops saltan**: ahí se ve si el plan aguanta escrito o solo
 * en la cabeza.
 */
export function pruebaDeEstres(posiciones = [], caidaPct = 20, opciones = {}) {
  const sector = opciones.sector || null;
  const efectivo = Number(opciones.efectivo) || 0;
  const antes = valoraCartera(posiciones, efectivo);

  const filas = antes.filas.map((f) => {
    const afectada = !sector || f.sector === sector;
    const caida = afectada ? caidaPct : 0;
    const precio = (Number(f.precio ?? f.entrada) || 0) * (1 - caida / 100);
    const valor = precio * (Number(f.cantidad) || 0);
    const stopSaltado = !!f.stop && precio <= Number(f.stop);
    return {
      ticker: f.ticker,
      sector: f.sector || 'Sin sector',
      precioAntes: f.precio ?? f.entrada,
      precioDespues: redondea(precio),
      valorAntes: f.valor,
      valorDespues: redondea(valor),
      perdida: redondea(valor - f.valor),
      stop: f.stop || null,
      stopSaltado,
      sinStop: !f.stop,
      pnlPct: f.coste ? redondea(((valor - f.coste) / f.coste) * 100) : 0,
    };
  });

  const valorDespues = filas.reduce((s, f) => s + f.valorDespues, 0) + efectivo;
  const saltan = filas.filter((f) => f.stopSaltado);
  const sinStop = filas.filter((f) => f.sinStop && f.perdida < 0);

  return {
    caidaPct,
    sector,
    totalAntes: antes.total,
    totalDespues: redondea(valorDespues),
    perdida: redondea(valorDespues - antes.total),
    perdidaPct: antes.total ? redondea(((valorDespues - antes.total) / antes.total) * 100) : 0,
    filas: filas.sort((a, b) => a.perdida - b.perdida),
    stopsQueSaltan: saltan,
    sinStop,
    frase: saltan.length
      ? `Saltarían ${saltan.length} stop${saltan.length === 1 ? '' : 's'} (${saltan.map((f) => f.ticker).join(', ')}). ¿Los vas a respetar o los vas a mover?`
      : sinStop.length
        ? `Ningún stop salta porque ${sinStop.length} posicion${sinStop.length === 1 ? '' : 'es'} no tienen stop. Eso no es aguantar, es no haber decidido.`
        : 'Ningún stop salta: la caída cabe dentro de tu plan.',
  };
}

/* ------------------------------------------------------------------ *
 * Plan de aportes
 * ------------------------------------------------------------------ */

/**
 * Cuánto tocaba aportar, cuánto llevas y a qué ritmo tendrías que ir para
 * llegar. Sin hoja de cálculo aparte.
 */
export function planDeAportes(plan = {}, hoyISO = aISO(new Date())) {
  const objetivo = Number(plan.objetivoAnual) || 0;
  const anio = Number(String(hoyISO).slice(0, 4));
  const aportes = (plan.aportes || []).filter((a) => String(a.fecha).slice(0, 4) === String(anio));
  const aportado = aportes.reduce((s, a) => s + (Number(a.importe) || 0), 0);

  const inicio = `${anio}-01-01`;
  const fin = `${anio}-12-31`;
  const diasTotales = diferenciaDias(inicio, fin) + 1;
  const diasPasados = Math.min(diasTotales, Math.max(0, diferenciaDias(inicio, hoyISO) + 1));
  const mesesRestantes = Math.max(0, 12 - (Number(String(hoyISO).slice(5, 7))) + 1);

  const deberia = objetivo * (diasPasados / diasTotales);
  const falta = Math.max(0, objetivo - aportado);

  return {
    anio,
    objetivo: redondea(objetivo),
    aportado: redondea(aportado),
    falta: redondea(falta),
    pct: objetivo ? Math.round((aportado / objetivo) * 100) : 0,
    deberiaLlevar: redondea(deberia),
    desvio: redondea(aportado - deberia),
    alDia: aportado >= deberia,
    mesesRestantes,
    ritmoNecesario: mesesRestantes ? redondea(falta / mesesRestantes) : falta,
    aportes: [...aportes].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    frase: !objetivo ? 'Pon un objetivo anual para poder seguirlo.'
      : aportado >= objetivo ? `Objetivo cumplido: llevas ${redondea(aportado)} de ${redondea(objetivo)}.`
        : aportado >= deberia
          ? `Vas al día: ${redondea(aportado)} de ${redondea(objetivo)}. Quedan ${redondea(falta)} en ${mesesRestantes} meses.`
          : `Vas ${redondea(deberia - aportado)} por detrás del ritmo. Harían falta ${mesesRestantes ? redondea(falta / mesesRestantes) : falta} al mes para llegar.`,
  };
}

export const CHECKLIST_COMPRA = [
  'Puedo explicar en dos frases qué hace la empresa y cómo gana dinero.',
  'Escribí la tesis: qué tiene que pasar para que esto funcione.',
  'Escribí qué la invalidaría (y no es "que baje el precio").',
  'Miré el último informe trimestral, no solo el titular.',
  'Deuda, caja y márgenes revisados.',
  'Sé cuándo presenta los próximos resultados.',
  'Valoración comparada con su propia historia y con sus pares.',
  'Definí precio de entrada, stop y objetivo antes de comprar.',
  'El tamaño sale de la calculadora de riesgo, no de la corazonada.',
  'La posición no rompe mis topes por posición ni por sector.',
  'No estoy comprando por FOMO, por un tuit ni por recuperar una pérdida.',
  'Si baja un 20 % mañana, sé exactamente qué voy a hacer.',
];

export const CHECKLIST_VENTA = [
  'La razón de venta está escrita: tesis rota, objetivo alcanzado, mejor alternativa o necesidad de caja.',
  'No estoy vendiendo solo por el ruido de esta semana.',
  'Revisé el impacto fiscal del año en curso.',
  'Si es venta parcial, definí qué hago con el resto y con qué stop.',
  'Anoté la operación en el diario mientras la recuerdo bien.',
];

export const CHECKLIST_POSTMORTEM = [
  '¿Se cumplió la tesis o gané/perdí por otra razón?',
  '¿Respeté el plan de entrada, stop y salida?',
  '¿El tamaño fue el correcto para el riesgo que asumí?',
  '¿Qué haría igual y qué haría distinto?',
  'Una sola lección, escrita en una frase.',
];

export const RUTINA_INVERSIONES = [
  { titulo: 'Repasar el mercado y mis posiciones', regla: 'cada día hábil', hora: '08:30', prioridad: 3, notas: 'Quince minutos: nada de operar en caliente.' },
  { titulo: 'Revisión semanal de la cartera', regla: 'cada domingo', hora: '18:00', prioridad: 2, notas: 'Pesos, stops, tesis que envejecen y alertas de la app.' },
  { titulo: 'Aporte periódico y rebalanceo si toca', regla: 'el 1 de cada mes', prioridad: 2, notas: 'Automatizar el aporte; rebalancear solo si algo se desvía más del umbral.' },
  { titulo: 'Cierre de mes: apuntar resultados en el diario', regla: 'el último día del mes', prioridad: 2 },
  { titulo: 'Decidir opciones antes del vencimiento', regla: 'cada tercer viernes', prioridad: 1, notas: 'Rolar, dejar asignar o cerrar. Decidir el miércoles, no el viernes a las 15:55.' },
  { titulo: 'Revisión trimestral: tesis una por una', regla: 'cada 3 meses', prioridad: 1 },
];

function redondea(n, decimales = 2) {
  const f = Math.pow(10, decimales);
  return Math.round((Number(n) || 0) * f) / f;
}

function promedio(lista) {
  if (!lista.length) return null;
  return redondea(lista.reduce((s, x) => s + x, 0) / lista.length, 1);
}
