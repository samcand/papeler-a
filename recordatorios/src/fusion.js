/**
 * fusion.js — Unir el estado de dos dispositivos sin perder nada.
 *
 * La versión anterior (en `compartir.js`) servía para pasar una copia de vez en
 * cuando, pero para sincronizar de verdad tenía dos agujeros:
 *
 * 1. **Solo miraba tareas y proyectos.** Metas, notas, gastos, personas,
 *    rutinas, viajes y las fichas de las colecciones no cruzaban.
 * 2. **Resucitaba lo borrado.** Borrabas una tarea en el móvil, el portátil
 *    todavía la tenía, y al fusionar volvía. Una app que te devuelve lo que
 *    tiraste deja de merecer confianza muy rápido.
 *
 * Aquí se arreglan los dos. Las reglas, en una frase cada una:
 *
 *   - Cada ficha lleva `actualizadoEn`. Gana la más reciente. A igualdad, la
 *     de este aparato: es la que el usuario está mirando.
 *   - Al borrar algo se apunta una **lápida** `{ lista, id, en }`. Una lápida
 *     más nueva que la ficha la mantiene borrada; una ficha más nueva que la
 *     lápida la resucita a propósito (eso es restaurar de la papelera).
 *   - Los registros que solo crecen (historial, tiempo medido, interrupciones)
 *     se unen por contenido: no se edita ninguno, así que no hay conflicto.
 *   - Lo que es de este aparato y de nadie más —el pomodoro en marcha, el
 *     cronómetro— no se sincroniza. Un reloj corriendo en el móvil no tiene
 *     por qué aparecer corriendo en el computador.
 *
 * Nada de esto toca el DOM ni la red: es una función de dos estados a uno.
 */

/* ------------------------------------------------------------------ *
 * Qué se une y cómo
 * ------------------------------------------------------------------ */

/** Listas de fichas con `id`: gana la más reciente, respetando las lápidas. */
export const LISTAS_POR_ID = [
  'tareas', 'filtros', 'habitos', 'planes', 'plantillas', 'reglas', 'riesgos',
  'lecturas', 'decisiones', 'informes', 'notas', 'colecciones', 'fichas',
  'objetivos', 'contadores', 'mantenimientos', 'gastos', 'personas', 'rutinas',
  'viajes', 'papelera',
];

/** Listas sin `id`, identificadas por otro campo. */
export const LISTAS_POR_CLAVE = {
  proyectos: 'nombre',
};

/** Registros que solo crecen: se unen por contenido, sin resolver conflictos. */
export const REGISTROS = [
  'historial', 'tiempo', 'interrupciones', 'asesorias', 'rutinasHechas',
];

/** Listas que viven dentro de otro objeto del estado. */
export const ANIDADOS = {
  'inversiones.posiciones': 'ticker',
  'inversiones.vigilancia': 'ticker',
  'investigacion.articulos': 'id',
  'investigacion.convocatorias': 'id',
  'investigacion.tesis': 'id',
  'alabanza.servicios': 'id',
};

/** Registros dentro de otro objeto. */
export const REGISTROS_ANIDADOS = ['inversiones.operaciones'];

/**
 * Lo que es de este aparato. El cronómetro y el pomodoro describen lo que
 * estás haciendo **aquí, ahora**; copiarlos sería mentir sobre el otro
 * dispositivo. El tema y la vista de inicio son gusto de cada pantalla.
 */
export const SOLO_AQUI = ['pomodoro', 'cronometro'];

/* ------------------------------------------------------------------ *
 * Piezas
 * ------------------------------------------------------------------ */

/** Cuándo se tocó por última vez. Ojo: `fecha` es cuándo toca, no cuándo se editó. */
export function marcaDe(x) {
  return String(x?.actualizadoEn || x?.completadaEn || x?.creadaEn || x?.creadoEn || '');
}

const leer = (objeto, ruta) => ruta.split('.').reduce((o, k) => (o ? o[k] : undefined), objeto);

const escribir = (objeto, ruta, valor) => {
  const partes = ruta.split('.');
  const ultimo = partes.pop();
  let destino = objeto;
  for (const parte of partes) {
    destino[parte] = { ...(destino[parte] || {}) };
    destino = destino[parte];
  }
  destino[ultimo] = valor;
};

/** Las lápidas de las dos partes, con la más reciente de cada id. */
export function lapidas(...estados) {
  const mapa = new Map();
  for (const estado of estados) {
    for (const t of estado?.borrados || []) {
      const clave = `${t.lista}/${t.id}`;
      const previa = mapa.get(clave);
      if (!previa || String(t.en) > String(previa.en)) mapa.set(clave, t);
    }
  }
  return mapa;
}

/**
 * Une dos listas de fichas. `clave` dice qué campo identifica cada una, y
 * `tumbas` cuándo se borró cada id (si se borró).
 */
export function unirFichas(mias = [], suyas = [], clave = 'id', tumbas = new Map(), lista = '') {
  const salida = new Map(mias.map((x) => [x[clave], x]));
  const cuenta = { nuevas: 0, actualizadas: 0, borradas: 0 };

  for (const suya of suyas) {
    const id = suya[clave];
    const mia = salida.get(id);
    // A igualdad de marca gana la de aquí: es la que el usuario tiene delante.
    if (!mia) { salida.set(id, suya); cuenta.nuevas++; }
    else if (marcaDe(suya) > marcaDe(mia)) { salida.set(id, suya); cuenta.actualizadas++; }
  }

  for (const [id, ficha] of [...salida]) {
    const tumba = tumbas.get(`${lista}/${id}`);
    if (tumba && String(tumba.en) > marcaDe(ficha)) {
      salida.delete(id);
      cuenta.borradas++;
    }
  }

  return { lista: [...salida.values()], cuenta };
}

/** Une dos registros por contenido: lo que ya está no se repite. */
export function unirRegistros(mios = [], suyos = []) {
  const vistos = new Set(mios.map((x) => JSON.stringify(x)));
  const salida = [...mios];
  let nuevos = 0;
  for (const x of suyos) {
    const firma = JSON.stringify(x);
    if (vistos.has(firma)) continue;
    vistos.add(firma);
    salida.push(x);
    nuevos++;
  }
  return { lista: salida, nuevos };
}

/** Une dos mapas sencillos (presupuestos): gana el valor del más reciente. */
function unirMapa(mio = {}, suyo = {}, suyoEsMasNuevo) {
  return suyoEsMasNuevo ? { ...mio, ...suyo } : { ...suyo, ...mio };
}

/* ------------------------------------------------------------------ *
 * La fusión
 * ------------------------------------------------------------------ */

/**
 * Une `remoto` dentro de `local` y devuelve el estado resultante, un recuento
 * y una frase en español para enseñar al usuario. No modifica ninguno de los
 * dos: los devuelve nuevos.
 */
export function fusionar(local = {}, remoto = {}) {
  const estado = { ...local };
  const tumbas = lapidas(local, remoto);
  const cuenta = { nuevas: 0, actualizadas: 0, borradas: 0, registros: 0 };

  for (const lista of LISTAS_POR_ID) {
    const r = unirFichas(local[lista] || [], remoto[lista] || [], 'id', tumbas, lista);
    estado[lista] = r.lista;
    cuenta.nuevas += r.cuenta.nuevas;
    cuenta.actualizadas += r.cuenta.actualizadas;
    cuenta.borradas += r.cuenta.borradas;
  }

  for (const [lista, clave] of Object.entries(LISTAS_POR_CLAVE)) {
    const r = unirFichas(local[lista] || [], remoto[lista] || [], clave, tumbas, lista);
    estado[lista] = r.lista;
    cuenta.nuevas += r.cuenta.nuevas;
    cuenta.actualizadas += r.cuenta.actualizadas;
    cuenta.borradas += r.cuenta.borradas;
  }

  for (const lista of REGISTROS) {
    const r = unirRegistros(local[lista] || [], remoto[lista] || []);
    estado[lista] = r.lista;
    cuenta.registros += r.nuevos;
  }

  for (const [ruta, clave] of Object.entries(ANIDADOS)) {
    const r = unirFichas(leer(local, ruta) || [], leer(remoto, ruta) || [], clave, tumbas, ruta);
    escribir(estado, ruta, r.lista);
    cuenta.nuevas += r.cuenta.nuevas;
    cuenta.actualizadas += r.cuenta.actualizadas;
    cuenta.borradas += r.cuenta.borradas;
  }

  for (const ruta of REGISTROS_ANIDADOS) {
    const r = unirRegistros(leer(local, ruta) || [], leer(remoto, ruta) || []);
    escribir(estado, ruta, r.lista);
    cuenta.registros += r.nuevos;
  }

  // Las lápidas se conservan enteras: el tercer dispositivo también necesita
  // enterarse de que eso se borró.
  estado.borrados = [...lapidas(local, remoto).values()];

  // Los ajustes y los presupuestos no tienen fichas que comparar: se queda el
  // del aparato que se tocó más tarde, y lo que solo existe en uno se conserva.
  const suyoEsMasNuevo = String(remoto.actualizadoEn || '') > String(local.actualizadoEn || '');
  estado.presupuestos = unirMapa(local.presupuestos, remoto.presupuestos, suyoEsMasNuevo);
  estado.ajustes = suyoEsMasNuevo
    ? { ...local.ajustes, ...remoto.ajustes }
    : { ...remoto.ajustes, ...local.ajustes };

  for (const clave of SOLO_AQUI) estado[clave] = local[clave];

  const partes = [];
  if (cuenta.nuevas) partes.push(`${cuenta.nuevas} ${cuenta.nuevas === 1 ? 'ficha nueva' : 'fichas nuevas'}`);
  if (cuenta.actualizadas) partes.push(`${cuenta.actualizadas} ${cuenta.actualizadas === 1 ? 'actualizada' : 'actualizadas'}`);
  if (cuenta.borradas) partes.push(`${cuenta.borradas} ${cuenta.borradas === 1 ? 'borrada' : 'borradas'}`);
  if (cuenta.registros) partes.push(`${cuenta.registros} ${cuenta.registros === 1 ? 'registro' : 'registros'}`);

  return {
    estado,
    cuenta,
    frase: partes.length ? partes.join(', ') + '.' : 'Ya estaba todo igual.',
  };
}

/** La lápida que deja algo al borrarse. */
export function lapida(lista, id, cuando = new Date().toISOString()) {
  return { lista, id, en: cuando };
}

/**
 * Las lápidas viejas se tiran: si un dispositivo lleva medio año sin
 * encenderse, lo que traiga ya no es «lo que borré ayer», es arqueología.
 */
export function purgarLapidas(borrados = [], dias = 180, ahora = new Date().toISOString()) {
  const limite = new Date(new Date(ahora).getTime() - dias * 86400000).toISOString();
  return borrados.filter((t) => String(t.en) >= limite);
}
