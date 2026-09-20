/**
 * calibracion.js — Estimado frente a real.
 *
 * La app ya mide el tiempo que trabajas; esto lo compara con lo que dijiste que
 * ibas a tardar y saca tu factor de corrección. No sirve para culparte: sirve
 * para que la próxima estimación sea mejor, que es lo único que arregla un
 * calendario que siempre va tarde.
 *
 * Se usa la **mediana** de los cocientes y no la media: una sola tarea que se
 * fue de las manos no debe desplazar el factor de todo el semestre.
 */

import { aISO, hoy } from './fechas.js';
import { MODULOS } from './modelo.js';

const MUESTRAS_MINIMAS = 3;

function mediana(lista) {
  if (!lista.length) return null;
  const ordenada = [...lista].sort((a, b) => a - b);
  const medio = Math.floor(ordenada.length / 2);
  return ordenada.length % 2 ? ordenada[medio] : (ordenada[medio - 1] + ordenada[medio]) / 2;
}

const redondea = (n, d = 2) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

/** Minutos realmente trabajados por tarea, sumando el registro de tiempo. */
export function minutosPorTarea(registros = []) {
  const mapa = new Map();
  for (const r of registros) {
    if (!r.tareaId) continue;
    mapa.set(r.tareaId, (mapa.get(r.tareaId) || 0) + (Number(r.minutos) || 0));
  }
  return mapa;
}

/**
 * Compara estimaciones con tiempo medido.
 *
 * Devuelve el factor (1,4 = sueles tardar un 40 % más de lo que dices), el
 * reparto por módulo, las tareas donde más te desviaste y una frase que se
 * puede enseñar tal cual.
 */
export function calibracion(tareas = [], registros = [], opciones = {}) {
  const reales = minutosPorTarea(registros);
  const pares = [];

  for (const t of tareas) {
    const estimado = Number(t.duracion) || 0;
    const real = reales.get(t.id) || Number(t.tiempoDedicado) || 0;
    if (estimado <= 0 || real <= 0) continue;
    if (opciones.soloCompletadas && !t.completada) continue;
    pares.push({
      id: t.id,
      titulo: t.titulo,
      modulo: t.modulo || null,
      proyecto: t.proyecto || null,
      estimado,
      real,
      ratio: redondea(real / estimado),
      diferencia: real - estimado,
    });
  }

  if (pares.length < MUESTRAS_MINIMAS) {
    return {
      suficiente: false,
      muestras: pares.length,
      faltan: MUESTRAS_MINIMAS - pares.length,
      factor: null,
      pares,
      frase: pares.length
        ? `Con ${pares.length} tarea${pares.length === 1 ? '' : 's'} medida${pares.length === 1 ? '' : 's'} todavía no hay para sacar conclusiones: faltan ${MUESTRAS_MINIMAS - pares.length}.`
        : 'Todavía no hay ninguna tarea con estimación y tiempo medido. Pon duración a las tareas y usa el pomodoro sobre ellas.',
    };
  }

  const factor = redondea(mediana(pares.map((p) => p.ratio)));
  const porModulo = [];
  for (const m of MODULOS) {
    const delModulo = pares.filter((p) => p.modulo === m.id);
    if (delModulo.length < MUESTRAS_MINIMAS) continue;
    porModulo.push({
      modulo: m.id,
      nombre: m.nombre,
      icono: m.icono,
      muestras: delModulo.length,
      factor: redondea(mediana(delModulo.map((p) => p.ratio))),
    });
  }

  const sesgo = factor > 1.15 ? 'subestimas' : factor < 0.85 ? 'sobrestimas' : 'afinado';
  const desviacion = Math.abs(Math.round((factor - 1) * 100));
  const frase = sesgo === 'subestimas'
    ? `Sueles tardar un ${desviacion} % más de lo que estimas. Multiplica por ${factor} antes de prometer una fecha.`
    : sesgo === 'sobrestimas'
      ? `Sueles tardar un ${desviacion} % menos de lo que estimas: te estás guardando margen de más.`
      : 'Tus estimaciones están bien calibradas. Eso es raro y vale la pena mantenerlo.';

  return {
    suficiente: true,
    muestras: pares.length,
    factor,
    sesgo,
    desviacion,
    frase,
    porModulo: porModulo.sort((a, b) => b.factor - a.factor),
    totalEstimado: pares.reduce((s, p) => s + p.estimado, 0),
    totalReal: pares.reduce((s, p) => s + p.real, 0),
    peores: [...pares].sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1)).slice(0, 5),
    pares: pares.sort((a, b) => b.real - a.real),
  };
}

/**
 * Estimación corregida con tu propio historial, redondeada a cinco minutos.
 * Si un módulo tiene datos propios, manda el suyo: calificar exámenes y leer un
 * artículo no fallan igual.
 */
export function estimacionCorregida(minutos, cal, modulo = null) {
  const base = Number(minutos) || 0;
  if (!base || !cal?.suficiente) return null;
  const propio = cal.porModulo?.find((m) => m.modulo === modulo);
  const factor = propio ? propio.factor : cal.factor;
  const corregido = Math.round((base * factor) / 5) * 5;
  return { minutos: Math.max(5, corregido), factor, fuente: propio ? propio.nombre : 'tu media' };
}

/** Frase corta para enseñar junto al campo de duración. */
export function pistaEstimacion(minutos, cal, modulo = null) {
  const c = estimacionCorregida(minutos, cal, modulo);
  if (!c || Math.abs(c.minutos - minutos) < 5) return '';
  return `Con tu historial (${c.fuente}, ×${c.factor}) esto son más bien ${c.minutos} min.`;
}
