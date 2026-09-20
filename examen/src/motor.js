/**
 * motor.js — La lógica del estudio, sin DOM.
 *
 * Aquí viven cuatro decisiones:
 *   1. Barajar las opciones, para que la posición nunca sea una pista.
 *   2. Elegir qué preguntas tocan: primero lo que toca repasar, después lo que
 *      nunca se ha visto y al final lo que peor va.
 *   3. Repaso espaciado con cajas (Leitner): acertar aleja la pregunta, fallar
 *      la devuelve al día siguiente.
 *   4. Calcular estadísticas por asignatura y por tema.
 *
 * Todo son funciones puras para poder probarlas con node, sin navegador.
 */

const DIA = 24 * 60 * 60 * 1000;

/** Generador con semilla: los simulacros se pueden repetir igual si hace falta. */
export function aleatorioConSemilla(semilla) {
  let s = semilla >>> 0 || 1;
  return function siguiente() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function barajar(lista, rnd = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Devuelve la pregunta con las opciones en otro orden y `correcta` ya ajustada.
 * `orden` guarda de dónde vino cada opción, por si hay que rehacer el camino.
 */
export function prepararPregunta(pregunta, rnd = Math.random) {
  const indices = barajar(pregunta.opciones.map((_, i) => i), rnd);
  const opciones = indices.map((i) => pregunta.opciones[i]);
  const figuras = pregunta.figuras?.opciones
    ? { ...pregunta.figuras, opciones: indices.map((i) => pregunta.figuras.opciones[i]) }
    : pregunta.figuras;
  return {
    ...pregunta,
    opciones,
    figuras,
    correcta: indices.indexOf(pregunta.correcta),
    orden: indices,
  };
}

export function filtrar(banco, { asignatura, asignaturas, temas, dificultades } = {}) {
  const lista = asignaturas?.length ? asignaturas : (asignatura ? [asignatura] : null);
  return banco.filter((p) => {
    if (lista && !lista.includes(p.asignatura)) return false;
    if (temas?.length && !temas.includes(p.tema)) return false;
    if (dificultades?.length && !dificultades.includes(p.dificultad)) return false;
    return true;
  });
}

// ---------------------------------------------------------------- repaso

/** Días que espera una pregunta según la caja en la que está (1 a 6). */
export const DIAS_POR_CAJA = [0, 1, 3, 7, 16, 35];

export function actualizarRepaso(previo, acierto, ahora = Date.now()) {
  const cajaPrevia = previo?.caja || 1;
  const caja = acierto ? Math.min(cajaPrevia + 1, DIAS_POR_CAJA.length) : 1;
  return {
    caja,
    proxima: ahora + DIAS_POR_CAJA[caja - 1] * DIA,
    aciertos: (previo?.aciertos || 0) + (acierto ? 1 : 0),
    fallos: (previo?.fallos || 0) + (acierto ? 0 : 1),
    ultima: ahora,
  };
}

export function toca(repaso, id, ahora = Date.now()) {
  const dato = repaso?.[id];
  if (!dato) return false;              // nunca vista: no es repaso, es nueva
  return (dato.proxima ?? 0) <= ahora;
}

export function pendientesDeRepaso(banco, repaso, ahora = Date.now()) {
  return banco.filter((p) => toca(repaso, p.id, ahora));
}

/**
 * Elige las preguntas de una sesión de práctica.
 * Orden de prioridad: repasos vencidos > preguntas nuevas > las que peor van.
 */
export function seleccionarPreguntas({
  banco, repaso = {}, cantidad = 10, ahora = Date.now(), rnd = Math.random, soloRepaso = false,
}) {
  const vencidas = barajar(banco.filter((p) => toca(repaso, p.id, ahora)), rnd);
  if (soloRepaso) return vencidas.slice(0, cantidad);

  const nuevas = barajar(banco.filter((p) => !repaso[p.id]), rnd);
  const resto = banco
    .filter((p) => repaso[p.id] && !toca(repaso, p.id, ahora))
    .sort((a, b) => tasa(repaso[a.id]) - tasa(repaso[b.id]));

  const salida = [];
  for (const lista of [vencidas, nuevas, resto]) {
    for (const p of lista) {
      if (salida.length >= cantidad) return salida;
      salida.push(p);
    }
  }
  return salida;
}

function tasa(dato) {
  const total = (dato?.aciertos || 0) + (dato?.fallos || 0);
  return total ? (dato.aciertos || 0) / total : 0;
}

// ---------------------------------------------------------------- simulacro

/** Cuántas preguntas de cada asignatura y cuánto tiempo, como en el examen real. */
export const MODELOS_SIMULACRO = {
  completo: {
    nombre: 'Completo', minutos: 110,
    reparto: {
      matematicas: 18, trigonometria: 8, abstracto: 12, geografia: 8, ciudadania: 8,
      salud: 8, cotidiana: 8, lectura: 10, ingles: 12,
    },
  },
  corto: {
    nombre: 'Corto', minutos: 45,
    reparto: {
      matematicas: 8, trigonometria: 4, abstracto: 5, geografia: 4, ciudadania: 4,
      salud: 4, cotidiana: 4, lectura: 4, ingles: 5,
    },
  },
  express: {
    nombre: 'Exprés', minutos: 20,
    reparto: {
      matematicas: 4, trigonometria: 2, abstracto: 2, geografia: 2, ciudadania: 2,
      salud: 2, cotidiana: 2, lectura: 2, ingles: 2,
    },
  },
};

/**
 * Arma el simulacro respetando el reparto. Si una asignatura no tiene
 * suficientes preguntas, usa las que haya en vez de fallar.
 */
export function armarSimulacro(banco, modelo = MODELOS_SIMULACRO.completo, rnd = Math.random) {
  const salida = [];
  for (const [asignatura, cuantas] of Object.entries(modelo.reparto)) {
    const disponibles = banco.filter((p) => p.asignatura === asignatura);
    salida.push(...barajar(disponibles, rnd).slice(0, cuantas));
  }
  return barajarPorAsignatura(salida, rnd);
}

/** Agrupa por asignatura (como en el examen real) pero mezcla dentro de cada bloque. */
function barajarPorAsignatura(preguntas, rnd) {
  const orden = ['matematicas', 'trigonometria', 'abstracto', 'geografia', 'ciudadania',
    'salud', 'cotidiana', 'lectura', 'ingles'];
  return orden.flatMap((a) => barajar(preguntas.filter((p) => p.asignatura === a), rnd));
}

// ---------------------------------------------------------------- resultados

/** { aciertos, total, porcentaje } de una lista de respuestas. */
export function puntaje(respuestas) {
  const total = respuestas.length;
  const aciertos = respuestas.filter((r) => r.correcta).length;
  return { aciertos, total, porcentaje: total ? Math.round((aciertos / total) * 100) : 0 };
}

export function agruparPor(respuestas, clave) {
  const mapa = {};
  for (const r of respuestas) {
    const k = r[clave];
    if (!k) continue;
    mapa[k] ||= { aciertos: 0, total: 0, ms: 0 };
    mapa[k].total++;
    mapa[k].ms += r.ms || 0;
    if (r.correcta) mapa[k].aciertos++;
  }
  for (const v of Object.values(mapa)) {
    v.porcentaje = Math.round((v.aciertos / v.total) * 100);
    v.msMedio = Math.round(v.ms / v.total);
  }
  return mapa;
}

/**
 * Los temas más flojos, para decirle al estudiante por dónde empezar.
 * Se piden al menos `minimo` intentos para no señalar un tema por un solo fallo.
 */
export function temasDebiles(respuestas, { minimo = 3, cuantos = 5 } = {}) {
  const porTema = agruparPor(respuestas, 'tema');
  return Object.entries(porTema)
    .filter(([, v]) => v.total >= minimo)
    .map(([tema, v]) => ({ tema, ...v, asignatura: respuestas.find((r) => r.tema === tema)?.asignatura }))
    .sort((a, b) => a.porcentaje - b.porcentaje)
    .slice(0, cuantos);
}

/** Racha de días seguidos con al menos una respuesta, contando hacia atrás desde hoy. */
export function racha(respuestas, ahora = Date.now()) {
  if (!respuestas.length) return 0;
  const dias = new Set(respuestas.map((r) => Math.floor(r.at / DIA)));
  const hoy = Math.floor(ahora / DIA);
  if (!dias.has(hoy) && !dias.has(hoy - 1)) return 0;
  let cuenta = 0;
  let dia = dias.has(hoy) ? hoy : hoy - 1;
  while (dias.has(dia)) { cuenta++; dia--; }
  return cuenta;
}

/** Nota escalada de 0 a 100 con el mismo peso para cada asignatura presente. */
export function notaGlobal(respuestas) {
  const porAsignatura = agruparPor(respuestas, 'asignatura');
  const valores = Object.values(porAsignatura);
  if (!valores.length) return 0;
  return Math.round(valores.reduce((s, v) => s + v.porcentaje, 0) / valores.length);
}
