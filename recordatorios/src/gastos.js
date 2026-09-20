/**
 * gastos.js — Lo que sale, que es el eje que faltaba.
 *
 * La app sabe de cartera (lo que tienes invertido) pero no sabía de gasto. Son
 * dos cosas distintas: una se revisa cada trimestre y la otra cada semana.
 *
 * Igual que los precios, **los gastos se escriben a mano**. No hay conexión con
 * el banco: eso exigiría un servidor, credenciales y sacar tus movimientos del
 * dispositivo. A cambio, esto funciona sin internet y no le cuenta a nadie en
 * qué gastas.
 *
 * El aviso útil no es "llevas 800 gastados", es **"vas por el 40 % del mes y el
 * 75 % del presupuesto"**: comparar el dinero con el tiempo que queda.
 */

import { aISO, deISO, diferenciaDias, finDeMes, hoy, MESES } from './fechas.js';
import { porcentajes } from './modelo.js';

export const CATEGORIAS_GASTO = [
  { id: 'casa', nombre: 'Casa', icono: '🏠' },
  { id: 'comida', nombre: 'Comida', icono: '🍽️' },
  { id: 'transporte', nombre: 'Transporte', icono: '🚗' },
  { id: 'salud', nombre: 'Salud', icono: '💊' },
  { id: 'educacion', nombre: 'Educación', icono: '🎓' },
  { id: 'ocio', nombre: 'Ocio', icono: '🎬' },
  { id: 'viaje', nombre: 'Viajes', icono: '✈️' },
  { id: 'regalos', nombre: 'Regalos', icono: '🎁' },
  { id: 'otros', nombre: 'Otros', icono: '•' },
];

export const nombreCategoria = (id) => CATEGORIAS_GASTO.find((c) => c.id === id)?.nombre || 'Otros';
export const iconoCategoria = (id) => CATEGORIAS_GASTO.find((c) => c.id === id)?.icono || '•';

export function gastoNuevo(campos = {}) {
  return {
    id: 'gas-' + Math.random().toString(36).slice(2, 8),
    que: '',
    importe: 0,
    categoria: 'otros',
    fecha: aISO(hoy()),
    viaje: null,        // para separar lo del viaje de lo de la vida normal
    fijo: false,        // recibos que se repiten todos los meses
    notas: '',
    ...campos,
  };
}

const enRango = (g, desde, hasta) => g.fecha >= desde && g.fecha <= hasta;

/** Total, reparto por categoría y los más caros del periodo. */
export function resumenGastos(gastos = [], desde, hasta, opciones = {}) {
  const lista = gastos
    .filter((g) => enRango(g, desde, hasta))
    .filter((g) => (opciones.viaje === undefined ? true : (g.viaje || null) === opciones.viaje));
  const total = lista.reduce((s, g) => s + (Number(g.importe) || 0), 0);

  const mapa = new Map();
  for (const g of lista) mapa.set(g.categoria, (mapa.get(g.categoria) || 0) + (Number(g.importe) || 0));
  const ordenadas = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  const pcts = porcentajes(ordenadas.map(([, importe]) => importe));
  const porCategoria = ordenadas.map(([categoria, importe], i) => ({
    categoria,
    nombre: nombreCategoria(categoria),
    icono: iconoCategoria(categoria),
    importe,
    pct: pcts[i],
  }));

  const dias = Math.max(1, diferenciaDias(desde, hasta) + 1);
  return {
    desde, hasta, dias,
    gastos: lista,
    total,
    media: Math.round((total / dias) * 100) / 100,
    porCategoria,
    mayores: [...lista].sort((a, b) => (Number(b.importe) || 0) - (Number(a.importe) || 0)).slice(0, 5),
    fijos: lista.filter((g) => g.fijo).reduce((s, g) => s + (Number(g.importe) || 0), 0),
  };
}

/** El primer y el último día de un mes `AAAA-MM`. */
export function rangoDelMes(mes) {
  const desde = `${mes}-01`;
  return { desde, hasta: aISO(finDeMes(deISO(desde))) };
}

export function nombreDelMes(mes) {
  const [anio, m] = String(mes).split('-');
  return `${MESES[Number(m) - 1]} de ${anio}`;
}

/**
 * Presupuesto del mes por categoría. Lo interesante es `ritmo`: cuánto del mes
 * ha pasado frente a cuánto del dinero se ha ido.
 */
export function presupuestoDelMes(gastos = [], limites = {}, mes = aISO(hoy()).slice(0, 7), hoyISO = aISO(hoy())) {
  const { desde, hasta } = rangoDelMes(mes);
  const r = resumenGastos(gastos, desde, hasta, { viaje: null });
  const totalLimite = Object.values(limites).reduce((s, v) => s + (Number(v) || 0), 0);

  const filas = CATEGORIAS_GASTO
    .map((c) => {
      const limite = Number(limites[c.id]) || 0;
      const gastado = r.porCategoria.find((x) => x.categoria === c.id)?.importe || 0;
      return {
        categoria: c.id, nombre: c.nombre, icono: c.icono, limite, gastado,
        resto: limite ? limite - gastado : null,
        pct: limite ? Math.round((gastado / limite) * 100) : null,
        pasado: limite ? gastado > limite : false,
      };
    })
    .filter((f) => f.limite || f.gastado)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const diasMes = diferenciaDias(desde, hasta) + 1;
  const diasPasados = hoyISO >= desde && hoyISO <= hasta
    ? diferenciaDias(desde, hoyISO) + 1
    : (hoyISO > hasta ? diasMes : 0);
  const pctTiempo = Math.round((diasPasados / diasMes) * 100);
  const pctDinero = totalLimite ? Math.round((r.total / totalLimite) * 100) : null;

  let frase;
  if (!totalLimite) frase = `${r.total.toLocaleString('es')} gastados en ${nombreDelMes(mes)}. Sin presupuesto no hay con qué comparar.`;
  else if (pctDinero > pctTiempo + 10) frase = `Vas por el ${pctTiempo} % del mes y el ${pctDinero} % del presupuesto. A este ritmo no llega.`;
  else if (pctDinero > 100) frase = `El presupuesto del mes ya se pasó en un ${pctDinero - 100} %.`;
  else frase = `Vas por el ${pctTiempo} % del mes y el ${pctDinero} % del presupuesto.`;

  return {
    mes, nombre: nombreDelMes(mes), desde, hasta,
    total: r.total, totalLimite, filas, pctTiempo, pctDinero,
    diasRestantes: Math.max(0, diasMes - diasPasados),
    porDiaRestante: totalLimite && diasMes > diasPasados
      ? Math.round(((totalLimite - r.total) / (diasMes - diasPasados)) * 100) / 100
      : null,
    pasadas: filas.filter((f) => f.pasado),
    frase,
  };
}

/** Los últimos meses, para ver si esto sube o baja. */
export function porMes(gastos = [], meses = 6, hastaISO = aISO(hoy())) {
  const salida = [];
  const base = deISO(hastaISO);
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1, 12);
    const mes = aISO(d).slice(0, 7);
    const { desde, hasta } = rangoDelMes(mes);
    const total = gastos.filter((g) => enRango(g, desde, hasta)).reduce((s, g) => s + (Number(g.importe) || 0), 0);
    salida.push({ mes, nombre: nombreDelMes(mes), total });
  }
  return salida;
}

/** Los recibos que se repiten: se copian al mes siguiente sin volver a escribirlos. */
export function repetirFijos(gastos = [], mesDestino, hoyISO = aISO(hoy())) {
  const anterior = (() => {
    const [a, m] = mesDestino.split('-').map(Number);
    const d = new Date(a, m - 2, 1, 12);
    return aISO(d).slice(0, 7);
  })();
  const { desde, hasta } = rangoDelMes(anterior);
  const yaPuestos = new Set(gastos
    .filter((g) => g.fecha.startsWith(mesDestino))
    .map((g) => `${g.que}|${g.categoria}`));

  return gastos
    .filter((g) => g.fijo && enRango(g, desde, hasta))
    .filter((g) => !yaPuestos.has(`${g.que}|${g.categoria}`))
    .map((g) => {
      // Ojo: el id no se copia, o el gasto nuevo pisaría al del mes pasado.
      const { id, ...resto } = g;
      return gastoNuevo({
        ...resto,
        fecha: `${mesDestino}-${String(deISO(g.fecha).getDate()).padStart(2, '0')}`,
        copiadoEn: hoyISO,
      });
    });
}
