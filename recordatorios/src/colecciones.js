/**
 * colecciones.js — Fichas con los campos que tú quieras.
 *
 * El carro, la biblioteca, los cursos, los regalos, los lugares por visitar y
 * el inventario de casa son **la misma cosa**: una lista de fichas con sus
 * campos, alguna fecha que avisa y una revisión de vez en cuando. En vez de
 * seis módulos parecidos, uno solo que se configura.
 *
 * Lo que sí es específico se queda fuera a propósito: el mantenimiento por
 * kilómetros vive en `mantenimiento.js`, porque ahí el disparador no es una
 * fecha.
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';

export const TIPOS_CAMPO = [
  { id: 'texto', nombre: 'Texto' },
  { id: 'largo', nombre: 'Texto largo' },
  { id: 'numero', nombre: 'Número' },
  { id: 'dinero', nombre: 'Dinero' },
  { id: 'fecha', nombre: 'Fecha' },
  { id: 'siNo', nombre: 'Sí / no' },
  { id: 'eleccion', nombre: 'Elección' },
  { id: 'enlace', nombre: 'Enlace' },
];

export function coleccionNueva(campos = {}) {
  return {
    id: 'col-' + Math.random().toString(36).slice(2, 8),
    nombre: 'Colección nueva',
    icono: '🗃️',
    descripcion: '',
    campos: [{ id: 'nombre', nombre: 'Nombre', tipo: 'texto', principal: true }],
    ...campos,
  };
}

export function fichaNueva(coleccion, valores = {}) {
  const base = {};
  for (const campo of coleccion.campos || []) base[campo.id] = campo.tipo === 'siNo' ? false : '';
  return {
    id: 'fic-' + Math.random().toString(36).slice(2, 8),
    coleccion: coleccion.id,
    valores: { ...base, ...valores },
    creadaEn: new Date().toISOString(),
  };
}

/** El campo que da nombre a la ficha: el marcado como principal, o el primero. */
export function campoPrincipal(coleccion) {
  return (coleccion.campos || []).find((c) => c.principal) || (coleccion.campos || [])[0] || null;
}

export function tituloFicha(coleccion, ficha) {
  const campo = campoPrincipal(coleccion);
  return String(ficha.valores?.[campo?.id] || '').trim() || 'Sin nombre';
}

function texto(valor) {
  return String(valor ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function filtrarFichas(fichas = [], consulta = '') {
  const q = texto(consulta).trim();
  if (!q) return fichas;
  return fichas.filter((f) => Object.values(f.valores || {}).some((v) => texto(v).includes(q)));
}

/** Ordena por un campo respetando su tipo: los números como números. */
export function ordenarFichas(fichas = [], coleccion, campoId, ascendente = true) {
  const campo = (coleccion.campos || []).find((c) => c.id === campoId);
  const signo = ascendente ? 1 : -1;
  const valor = (f) => f.valores?.[campoId];
  return [...fichas].sort((a, b) => {
    const x = valor(a);
    const y = valor(b);
    if (campo && (campo.tipo === 'numero' || campo.tipo === 'dinero')) {
      return signo * ((Number(x) || 0) - (Number(y) || 0));
    }
    if (campo && campo.tipo === 'siNo') return signo * ((x ? 1 : 0) - (y ? 1 : 0));
    return signo * String(x ?? '').localeCompare(String(y ?? ''), 'es');
  });
}

/**
 * Los campos de fecha marcados con `avisar` son los que convierten una ficha en
 * un recordatorio: el SOAT que vence, la garantía que caduca, el curso que
 * cierra. Devuelve lo que vence dentro del plazo y lo ya vencido.
 */
export function vencimientos(coleccion, fichas = [], hoyISO = aISO(hoy()), dias = 45) {
  const campos = (coleccion.campos || []).filter((c) => c.tipo === 'fecha' && c.avisar);
  const salida = [];
  for (const ficha of fichas) {
    for (const campo of campos) {
      const fecha = ficha.valores?.[campo.id];
      if (!fecha) continue;
      const restan = diferenciaDias(hoyISO, fecha);
      if (restan > dias) continue;
      salida.push({
        ficha, campo, fecha, restan,
        vencido: restan < 0,
        titulo: tituloFicha(coleccion, ficha),
        texto: restan < 0
          ? `${tituloFicha(coleccion, ficha)}: ${campo.nombre.toLowerCase()} venció hace ${-restan} días.`
          : `${tituloFicha(coleccion, ficha)}: ${campo.nombre.toLowerCase()} en ${restan} días.`,
      });
    }
  }
  return salida.sort((a, b) => a.restan - b.restan);
}

/** Un vencimiento se convierte en tarea, que es donde se actúa. */
export function tareaDeVencimiento(coleccion, aviso) {
  return {
    titulo: `${aviso.campo.nombre}: ${aviso.titulo}`,
    fecha: aviso.fecha,
    prioridad: aviso.restan <= 7 ? 1 : 2,
    modulo: 'personal',
    etiquetas: [coleccion.nombre.toLowerCase().replace(/\s+/g, '-')],
    notas: `De la colección “${coleccion.nombre}”.`,
  };
}

/** Cuentas de una colección: cuántas fichas y qué dicen sus campos de sí/no y dinero. */
export function resumenColeccion(coleccion, fichas = [], hoyISO = aISO(hoy())) {
  const cuentas = [];
  for (const campo of coleccion.campos || []) {
    if (campo.tipo === 'siNo') {
      const si = fichas.filter((f) => f.valores?.[campo.id]).length;
      cuentas.push({ campo: campo.nombre, texto: `${si} de ${fichas.length}` });
    }
    if (campo.tipo === 'dinero') {
      const total = fichas.reduce((s, f) => s + (Number(f.valores?.[campo.id]) || 0), 0);
      cuentas.push({ campo: campo.nombre, texto: total.toLocaleString('es'), total });
    }
    if (campo.tipo === 'eleccion') {
      const mapa = new Map();
      for (const f of fichas) {
        const v = f.valores?.[campo.id];
        if (v) mapa.set(v, (mapa.get(v) || 0) + 1);
      }
      const top = [...mapa.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) cuentas.push({ campo: campo.nombre, texto: `${top[0]} (${top[1]})` });
    }
  }
  return {
    fichas: fichas.length,
    cuentas,
    avisos: vencimientos(coleccion, fichas, hoyISO).length,
  };
}

/* ------------------------------------------------------------------ *
 * Colecciones que ya vienen pensadas
 * ------------------------------------------------------------------ */

const C = (id, nombre, tipo, extra = {}) => ({ id, nombre, tipo, ...extra });

/** La hoja en blanco no ayuda: estas seis cubren casi todo lo que uno apunta. */
export const PLANTILLAS_COLECCION = [
  {
    id: 'vehiculo', nombre: 'Vehículos', icono: '🚗',
    descripcion: 'Papeles que vencen y datos que nunca recuerdas en el taller.',
    campos: [
      C('nombre', 'Vehículo', 'texto', { principal: true }),
      C('placa', 'Placa', 'texto'),
      C('anio', 'Año', 'numero'),
      C('seguro', 'Vence el seguro', 'fecha', { avisar: true }),
      C('tecnica', 'Revisión técnica', 'fecha', { avisar: true }),
      C('impuesto', 'Impuesto', 'fecha', { avisar: true }),
      C('llantas', 'Medida de llantas', 'texto'),
      C('aceite', 'Aceite que lleva', 'texto'),
      C('notas', 'Notas', 'largo'),
    ],
  },
  {
    id: 'biblioteca', nombre: 'Biblioteca', icono: '📚',
    descripcion: 'Lo que tienes, dónde está y a quién se lo prestaste.',
    campos: [
      C('titulo', 'Título', 'texto', { principal: true }),
      C('autor', 'Autor', 'texto'),
      C('formato', 'Formato', 'eleccion', { opciones: ['papel', 'digital', 'audio'] }),
      C('leido', 'Leído', 'siNo'),
      C('prestadoA', 'Prestado a', 'texto'),
      C('devolver', 'Me lo devuelven el', 'fecha', { avisar: true }),
      C('notas', 'Ideas y frases', 'largo'),
    ],
  },
  {
    id: 'cursos', nombre: 'Cursos', icono: '🎓',
    descripcion: 'Lo que empezaste y lo que de verdad terminaste.',
    campos: [
      C('nombre', 'Curso', 'texto', { principal: true }),
      C('plataforma', 'Plataforma', 'texto'),
      C('estado', 'Estado', 'eleccion', { opciones: ['por empezar', 'en curso', 'terminado', 'abandonado'] }),
      C('avance', 'Avance (%)', 'numero'),
      C('cierra', 'Se cierra el acceso', 'fecha', { avisar: true }),
      C('enlace', 'Enlace', 'enlace'),
    ],
  },
  {
    id: 'regalos', nombre: 'Ideas de regalo', icono: '🎁',
    descripcion: 'La idea se te ocurre en marzo; el cumpleaños es en noviembre.',
    campos: [
      C('que', 'Qué', 'texto', { principal: true }),
      C('paraQuien', 'Para quién', 'texto'),
      C('precio', 'Precio aproximado', 'dinero'),
      C('ocasion', 'Ocasión', 'texto'),
      C('comprado', 'Comprado', 'siNo'),
      C('enlace', 'Dónde se compra', 'enlace'),
    ],
  },
  {
    id: 'lugares', nombre: 'Lugares y restaurantes', icono: '📍',
    descripcion: 'Lo que te recomendaron y no vas a recordar cuando estés allí.',
    campos: [
      C('nombre', 'Nombre', 'texto', { principal: true }),
      C('ciudad', 'Ciudad', 'texto'),
      C('tipo', 'Tipo', 'eleccion', { opciones: ['restaurante', 'lugar', 'hotel', 'museo', 'otro'] }),
      C('quienRecomienda', 'Quién lo recomendó', 'texto'),
      C('visitado', 'Visitado', 'siNo'),
      C('notas', 'Notas', 'largo'),
    ],
  },
  {
    id: 'inventario', nombre: 'Inventario de casa', icono: '📦',
    descripcion: 'Lo que hay, cuándo se compró y hasta cuándo tiene garantía.',
    campos: [
      C('que', 'Qué', 'texto', { principal: true }),
      C('donde', 'Dónde está', 'texto'),
      C('comprado', 'Comprado el', 'fecha'),
      C('precio', 'Precio', 'dinero'),
      C('garantia', 'Garantía hasta', 'fecha', { avisar: true }),
      C('serie', 'Número de serie', 'texto'),
    ],
  },
];

/** Crea una colección a partir de una plantilla, con id propio. */
export function desdePlantilla(plantilla) {
  return coleccionNueva({
    nombre: plantilla.nombre,
    icono: plantilla.icono,
    descripcion: plantilla.descripcion,
    campos: plantilla.campos.map((c) => ({ ...c })),
    plantilla: plantilla.id,
  });
}
