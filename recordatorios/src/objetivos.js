/**
 * objetivos.js — Metas con progreso y con revisión.
 *
 * Un objetivo sin número no es un objetivo, es un deseo; y un objetivo sin
 * fecha de revisión se convierte en un reproche silencioso. Aquí van los dos.
 *
 * Lo que de verdad importa no es el porcentaje: es **si vas al ritmo**. Llevar
 * el 40 % en marzo de un objetivo anual suena bien y va tarde. Por eso se
 * compara lo avanzado con lo transcurrido y se dice cuánto hace falta por
 * semana para llegar.
 *
 * Cubre también el plan de aprendizaje, las habilidades por aprender y la lista
 * de cosas para la vida: son objetivos con otra etiqueta.
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';

export const TIPOS_OBJETIVO = [
  { id: 'numero', nombre: 'Llegar a un número', ayuda: 'Leer 24 libros, correr 500 km, ahorrar 3.000.' },
  { id: 'tareas', nombre: 'Cerrar tareas de un proyecto', ayuda: 'Cuenta las tareas completadas de ese proyecto.' },
  { id: 'siNo', nombre: 'Hacerlo o no hacerlo', ayuda: 'Sacar el pasaporte, aprender a nadar.' },
];

/**
 * El horizonte cambia lo que significa "ir bien". Una meta de vida no va tarde
 * porque este mes no la tocaras; una de trimestre, sí.
 */
export const HORIZONTES = [
  { id: 'vida', nombre: 'De vida', icono: '🌄', descripcion: 'Sin fecha o a varios años. Se revisa una vez al año.' },
  { id: 'anio', nombre: 'De este año', icono: '📅', descripcion: 'Lo que quieres que sea verdad en diciembre.' },
  { id: 'trimestre', nombre: 'De este trimestre', icono: '🎯', descripcion: 'Doce semanas: lo que de verdad cabe.' },
];

export const AMBITOS = [
  { id: 'vida', nombre: 'Vida', icono: '🌱' },
  { id: 'aprender', nombre: 'Aprender', icono: '📚' },
  { id: 'salud', nombre: 'Salud', icono: '🏃' },
  { id: 'dinero', nombre: 'Dinero', icono: '💰' },
  { id: 'trabajo', nombre: 'Trabajo', icono: '🛠️' },
];

export function objetivoNuevo(campos = {}) {
  return {
    id: 'obj-' + Math.random().toString(36).slice(2, 8),
    que: '',
    ambito: 'vida',
    horizonte: 'anio',
    padre: null,          // una meta de vida contiene las de cada año
    tipo: 'numero',
    desde: aISO(hoy()),
    hasta: null,          // sin fecha es la lista de "algún día en la vida"
    meta: 10,
    actual: 0,
    unidad: '',
    proyecto: null,       // para el tipo 'tareas'
    hecho: false,         // para el tipo 'siNo'
    revisarEn: null,
    logradoEn: null,
    abandonadoEn: null,
    porque: '',
    ...campos,
  };
}

/** Cuánto llevas: el número, el porcentaje y de dónde sale. */
export function avance(objetivo, datos = {}) {
  if (objetivo.tipo === 'siNo') {
    return { actual: objetivo.hecho ? 1 : 0, meta: 1, pct: objetivo.hecho ? 100 : 0, fuente: 'a mano' };
  }
  if (objetivo.tipo === 'tareas') {
    const historial = datos.historial || [];
    const tareas = datos.tareas || [];
    const porId = new Map(tareas.map((t) => [t.id, t]));
    const hechas = historial.filter((h) => {
      const proyecto = h.proyecto || porId.get(h.tareaId)?.proyecto;
      if (proyecto !== objetivo.proyecto) return false;
      if (objetivo.desde && h.fecha < objetivo.desde) return false;
      if (objetivo.hasta && h.fecha > objetivo.hasta) return false;
      return true;
    }).length;
    const meta = Math.max(1, Number(objetivo.meta) || 1);
    return { actual: hechas, meta, pct: Math.min(100, Math.round((hechas / meta) * 100)), fuente: 'tareas cerradas' };
  }
  const meta = Math.max(1, Number(objetivo.meta) || 1);
  const actual = Number(objetivo.actual) || 0;
  return { actual, meta, pct: Math.min(100, Math.round((actual / meta) * 100)), fuente: 'a mano' };
}

/**
 * Progreso comparado con el tiempo transcurrido. Sin fecha de fin no hay ritmo
 * que valga: se dice y ya está, en vez de inventar una urgencia.
 */
export function progreso(objetivo, datos = {}, hoyISO = aISO(hoy())) {
  const a = avance(objetivo, datos);
  const cerrado = !!(objetivo.logradoEn || objetivo.abandonadoEn);
  const base = { ...a, cerrado, logrado: a.pct >= 100 || !!objetivo.logradoEn };

  if (!objetivo.hasta) {
    const deVida = objetivo.horizonte === 'vida';
    return {
      ...base, conFecha: false, pctTiempo: null, alDia: null, restan: null, porSemana: null,
      frase: base.logrado ? 'Logrado.'
        : `${a.actual} de ${a.meta}${objetivo.unidad ? ` ${objetivo.unidad}` : ''}. `
          + (deVida ? 'De vida: no va tarde, va.' : 'Sin fecha: avanza cuando avance.'),
    };
  }

  if (objetivo.desde && hoyISO < objetivo.desde) {
    return {
      ...base, conFecha: true, pctTiempo: 0, alDia: null,
      restan: diferenciaDias(hoyISO, objetivo.hasta), porSemana: null,
      empieza: objetivo.desde,
      frase: base.logrado ? 'Logrado.' : `Todavía no empieza: es a partir del ${objetivo.desde}.`,
    };
  }

  const total = Math.max(1, diferenciaDias(objetivo.desde, objetivo.hasta));
  const pasados = Math.min(total, Math.max(0, diferenciaDias(objetivo.desde, hoyISO)));
  const pctTiempo = Math.round((pasados / total) * 100);
  const restan = diferenciaDias(hoyISO, objetivo.hasta);
  const falta = Math.max(0, a.meta - a.actual);
  const semanas = Math.max(1, restan / 7);
  const porSemana = restan > 0 ? Math.round((falta / semanas) * 10) / 10 : null;

  let frase;
  if (base.logrado) frase = 'Logrado.';
  else if (restan < 0) frase = `Se pasó la fecha con ${a.pct} % hecho. O se cierra, o se le pone fecha nueva con honestidad.`;
  else if (a.pct >= pctTiempo) frase = `Vas al día: ${a.pct} % hecho con ${pctTiempo} % del tiempo gastado.`;
  else frase = `Vas atrasado: ${a.pct} % hecho y ${pctTiempo} % del tiempo gastado.`
    + (porSemana ? ` Hacen falta ${porSemana}${objetivo.unidad ? ` ${objetivo.unidad}` : ''} por semana.` : '');

  return {
    ...base, conFecha: true, pctTiempo, restan, porSemana,
    alDia: base.logrado || a.pct >= pctTiempo,
    frase,
  };
}


/* ------------------------------------------------------------------ *
 * Metas que contienen metas
 * ------------------------------------------------------------------ */

/** Los hijos directos de una meta. */
export function hijosDe(objetivo, objetivos = []) {
  return objetivos.filter((o) => o.padre === objetivo.id);
}

/** Un padre no puede colgar de su propio hijo. */
export function haríaCiclo(objetivoId, nuevoPadre, objetivos = []) {
  if (!nuevoPadre || objetivoId === nuevoPadre) return objetivoId === nuevoPadre;
  const porId = new Map(objetivos.map((o) => [o.id, o]));
  let actual = porId.get(nuevoPadre);
  for (let i = 0; i < 50 && actual; i++) {
    if (actual.id === objetivoId) return true;
    actual = actual.padre ? porId.get(actual.padre) : null;
  }
  return false;
}

/**
 * El progreso de una meta que tiene hijas **sale de ellas**, no de un número a
 * mano: si la meta de vida es "publicar un libro" y este año toca el borrador,
 * lo honesto es que el avance del libro sea el de sus años.
 *
 * Las hijas abandonadas no cuentan en el reparto; una meta que se deja no debe
 * arrastrar a la de arriba para siempre.
 */
export function progresoConHijos(objetivo, objetivos = [], datos = {}, hoyISO = aISO(hoy())) {
  const hijas = hijosDe(objetivo, objetivos).filter((h) => !h.abandonadoEn);
  if (!hijas.length) return { ...progreso(objetivo, datos, hoyISO), desdeHijas: false, hijas: 0 };

  const partes = hijas.map((h) => progresoConHijos(h, objetivos, datos, hoyISO));
  const pct = Math.round(partes.reduce((s, p) => s + p.pct, 0) / partes.length);
  const logradas = partes.filter((p) => p.logrado).length;
  const atrasadas = partes.filter((p) => p.alDia === false).length;

  return {
    ...progreso(objetivo, datos, hoyISO),
    desdeHijas: true,
    hijas: hijas.length,
    logradas,
    pct,
    logrado: !!objetivo.logradoEn || pct >= 100,
    alDia: atrasadas ? false : null,
    frase: `${logradas} de ${hijas.length} metas de dentro cumplidas`
      + (atrasadas ? `, ${atrasadas} ${atrasadas === 1 ? 'va' : 'van'} tarde.` : '.'),
  };
}

/** El árbol entero: las de vida arriba y sus años colgando. */
export function arbol(objetivos = [], datos = {}, hoyISO = aISO(hoy())) {
  const raices = objetivos.filter((o) => !o.padre || !objetivos.some((x) => x.id === o.padre));
  const rama = (o, nivel = 0) => ({
    objetivo: o,
    nivel,
    progreso: progresoConHijos(o, objetivos, datos, hoyISO),
    hijas: hijosDe(o, objetivos)
      .sort((a, b) => String(a.hasta || '9999').localeCompare(String(b.hasta || '9999')))
      .map((h) => rama(h, nivel + 1)),
  });
  const orden = { vida: 0, anio: 1, trimestre: 2 };
  return raices
    .sort((a, b) => (orden[a.horizonte] ?? 1) - (orden[b.horizonte] ?? 1)
      || String(a.hasta || '9999').localeCompare(String(b.hasta || '9999')))
    .map((o) => rama(o));
}

/** Aplana el árbol para pintarlo como lista con sangría. */
export function aplanar(ramas = []) {
  return ramas.flatMap((r) => [r, ...aplanar(r.hijas)]);
}


/* ------------------------------------------------------------------ *
 * Escribir una meta en una línea
 * ------------------------------------------------------------------ */

const UNIDADES_CONOCIDAS = 'libros|km|kil[óo]metros|horas|d[íi]as|clases|art[íi]culos|papers|kilos|veces|sesiones|capítulos|cap[íi]tulos|euros|d[óo]lares';

/**
 * "Leer 24 libros este año" ya lo dice todo: cuánto, de qué y para cuándo.
 * Obligar a rellenar cuatro menús para eso es la razón por la que las metas se
 * escriben una vez y no se vuelven a tocar.
 *
 * Lo que no se entienda se queda como está: sin número, la meta es de sí o no,
 * que también es una meta honesta ("sacar el pasaporte").
 */
export function parseMeta(texto, hoyISO = aISO(hoy())) {
  let resto = String(texto || '').trim();
  const anio = Number(hoyISO.slice(0, 4));
  let horizonte = null;
  let desde = null;
  let hasta = null;

  const quitar = (re) => {
    const m = re.exec(resto);
    if (m) resto = (resto.slice(0, m.index) + resto.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
    return m;
  };

  if (quitar(/\b(este|en\s+el|para\s+el)\s+a[ñn]o\b/i)) {
    horizonte = 'anio';
    desde = `${anio}-01-01`;
    hasta = `${anio}-12-31`;
  } else if (quitar(/\b(este|en\s+este|para\s+este)\s+trimestre\b/i)) {
    horizonte = 'trimestre';
    const t = Math.floor(Number(hoyISO.slice(5, 7) - 1) / 3);
    desde = `${anio}-${String(t * 3 + 1).padStart(2, '0')}-01`;
    const finMes = t * 3 + 3;
    hasta = `${anio}-${String(finMes).padStart(2, '0')}-${finMes === 3 || finMes === 12 ? '31' : '30'}`;
  } else if (quitar(/\b(en\s+la\s+vida|alg[úu]n\s+d[íi]a|de\s+vida)\b/i)) {
    horizonte = 'vida';
  } else {
    const anioSuelto = quitar(/\b(?:en|para|antes\s+de)\s+(20\d{2})\b/i);
    if (anioSuelto) {
      horizonte = 'anio';
      desde = `${anioSuelto[1]}-01-01`;
      hasta = `${anioSuelto[1]}-12-31`;
    }
  }

  // El número y su unidad: "24 libros", "500 km", "3 veces".
  const num = new RegExp(`\\b(\\d+(?:[.,]\\d+)?)\\s*(${UNIDADES_CONOCIDAS})?\\b`, 'i').exec(resto);
  let meta = null;
  let unidad = '';
  if (num) {
    meta = Number(String(num[1]).replace(',', '.'));
    unidad = (num[2] || '').toLowerCase();
    // El número se queda en el título ("Leer 24 libros" se lee mejor así),
    // pero la unidad suelta sí se limpia si quedó colgando al final.
  }

  return {
    que: resto.replace(/\s+/g, ' ').trim(),
    horizonte: horizonte || 'anio',
    desde: desde || aISO(hoy()),
    hasta,
    tipo: meta ? 'numero' : 'siNo',
    meta: meta || 1,
    unidad,
  };
}

/** Sumar (o restar) avance es lo que se hace todos los días; que cueste un botón. */
export function sumarAvance(objetivo, n = 1) {
  if (objetivo.tipo === 'siNo') return { ...objetivo, hecho: n > 0 };
  const actual = Math.max(0, (Number(objetivo.actual) || 0) + n);
  const tope = Math.max(1, Number(objetivo.meta) || 1);
  return { ...objetivo, actual: Math.min(actual, tope * 10) };   // por si alguien se pasa de clics
}

/** Las metas agrupadas por horizonte, que es como se miran de verdad. */
export function porHorizonte(objetivos = [], datos = {}, hoyISO = aISO(hoy())) {
  const ramas = arbol(objetivos.filter((o) => !o.logradoEn && !o.abandonadoEn), datos, hoyISO);
  return HORIZONTES.map((h) => ({
    ...h,
    metas: aplanar(ramas).filter((r) => (r.objetivo.horizonte || 'anio') === h.id),
  }));
}

/** Los que tocaba mirar y nadie miró. */
export function aRevisar(objetivos = [], hoyISO = aISO(hoy())) {
  return objetivos
    .filter((o) => !o.logradoEn && !o.abandonadoEn && o.revisarEn && o.revisarEn <= hoyISO)
    .sort((a, b) => String(a.revisarEn).localeCompare(String(b.revisarEn)));
}

export function vivos(objetivos = []) {
  return objetivos.filter((o) => !o.logradoEn && !o.abandonadoEn);
}

export function resumenObjetivos(objetivos = [], datos = {}, hoyISO = aISO(hoy())) {
  const enCurso = vivos(objetivos);
  const conProgreso = enCurso.map((o) => ({ objetivo: o, progreso: progreso(o, datos, hoyISO) }));
  const atrasados = conProgreso.filter((x) => x.progreso.alDia === false);
  const logrados = objetivos.filter((o) => o.logradoEn).length;
  const abandonados = objetivos.filter((o) => o.abandonadoEn).length;

  return {
    enCurso: enCurso.length,
    logrados,
    abandonados,
    atrasados: atrasados.length,
    aRevisar: aRevisar(objetivos, hoyISO).length,
    lista: conProgreso,
    frase: !objetivos.length
      ? 'Ningún objetivo escrito. Lo que no se escribe se convierte en intención.'
      : `${enCurso.length} en curso, ${logrados} logrados`
        + `${atrasados.length ? ` y ${atrasados.length} que van tarde` : ''}`
        + `${abandonados ? `. ${abandonados} abandonados, que también cuenta como decidir` : ''}.`,
  };
}

/** Un objetivo también se convierte en tarea: la del próximo paso concreto. */
export function tareaDeObjetivo(objetivo, hoyISO = aISO(hoy())) {
  return {
    titulo: `Avanzar: ${objetivo.que}`,
    fecha: hoyISO,
    prioridad: 2,
    modulo: 'personal',
    etiquetas: ['objetivo'],
    notas: `Meta: ${objetivo.meta}${objetivo.unidad ? ` ${objetivo.unidad}` : ''}`
      + `${objetivo.hasta ? ` antes del ${objetivo.hasta}` : ''}.`,
  };
}
