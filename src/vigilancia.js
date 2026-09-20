/**
 * vigilancia.js — "¿Cambió la ley?"
 *
 * Tres cosas distintas, porque son tres riesgos distintos:
 *
 *  1. Vigencias: los valores de la app tienen fecha de caducidad (el salario
 *     mínimo se decreta cada diciembre, la UVT cada año). La app sabe cuándo
 *     los suyos van a quedar viejos y lo dice antes de que pase.
 *  2. Cambios ya programados: la reforma laboral dejó escalones con fecha
 *     (el recargo del día de descanso llega al 100 % el 1 de julio de 2027).
 *  3. Noticias: consulta los sitios oficiales y filtra lo que huele a cambio
 *     normativo. Como las páginas del Estado no permiten que un navegador
 *     ajeno las lea (CORS), se puede configurar un proxy propio; sin él, la
 *     app deja los enlaces listos para abrirlos y registrar el hallazgo.
 */

import { hoy, diasCalendario, sumarDias, formatoLargo } from './fechas.js';
import * as ley from './normativa.js';

const { anioDe } = ley;
export { anioDe };

/** Palabras que hacen que una noticia importe para la nómina. */
export const TEMAS = [
  { id: 'salario-minimo', etiqueta: 'Salario mínimo', palabras: ['salario mínimo', 'salario minimo', 'smmlv', 'mínimo legal'], afecta: ['smmlv'] },
  { id: 'auxilio', etiqueta: 'Auxilio de transporte', palabras: ['auxilio de transporte', 'subsidio de transporte'], afecta: ['auxilioTransporte'] },
  { id: 'uvt', etiqueta: 'UVT y retención', palabras: ['uvt', 'unidad de valor tributario', 'retención en la fuente'], afecta: ['uvt'] },
  { id: 'jornada', etiqueta: 'Jornada laboral', palabras: ['jornada laboral', '42 horas', 'reducción de la jornada', 'jornada nocturna', 'horario nocturno'], afecta: ['jornada', 'nocturnidad'] },
  { id: 'recargos', etiqueta: 'Recargos y horas extra', palabras: ['recargo', 'dominical', 'festivo', 'hora extra', 'horas extras'], afecta: ['recargoDescanso', 'recargos'] },
  { id: 'reforma', etiqueta: 'Reforma laboral', palabras: ['reforma laboral', 'ley 2466', 'código sustantivo del trabajo', 'contrato de aprendizaje'], afecta: ['contratos'] },
  { id: 'prestaciones', etiqueta: 'Prestaciones sociales', palabras: ['cesantías', 'cesantias', 'prima de servicios', 'vacaciones', 'dotación'], afecta: ['prestaciones'] },
  { id: 'seguridad-social', etiqueta: 'Seguridad social', palabras: ['seguridad social', 'pila', 'cotización', 'aportes', 'ugpp', 'arl', 'reforma pensional', 'ley 2381'], afecta: ['aportes'] },
  { id: 'licencias', etiqueta: 'Licencias e incapacidades', palabras: ['incapacidad', 'licencia de maternidad', 'licencia de paternidad', 'licencia'], afecta: ['ausencias'] },
];

/** Clasifica un texto y devuelve los temas que toca. */
export function clasificar(texto) {
  const t = String(texto || '').toLowerCase();
  return TEMAS.filter((tema) => tema.palabras.some((p) => t.includes(p)));
}

/**
 * ¿Suena a norma nueva? Reconoce "Ley 2466 de 2025", "Decreto 1469",
 * "Resolución 000238" y las sentencias tipo "C-123 de 2026" o "SU-449".
 */
export function pareceNorma(texto) {
  const t = String(texto || '');
  return /\b(ley|decreto|resoluci[óo]n|circular|concepto|acuerdo)\s*(n[úu]mero\s*)?\d{2,5}\b/i.test(t)
    || /\bsentencia\s*(n[úu]mero\s*)?(su|[cta])[-\s]?\d{1,4}/i.test(t)
    || /\b(su|[cta])-\d{1,4}\s+de\s+\d{4}\b/i.test(t);
}

/**
 * Alertas sobre los propios datos de la app: qué está por vencer y qué cambio
 * ya tiene fecha puesta.
 */
export function alertas(fecha = hoy()) {
  const salida = [];
  const anio = anioDe(fecha);
  const valores = ley.valoresAnuales(fecha);

  if (valores.estimado) {
    salida.push({
      nivel: 'alto',
      titulo: `No hay valores cargados para ${anio}`,
      detalle: `La app está usando los de ${valores.anio}. Busca el decreto de salario mínimo y auxilio de transporte de ${anio} y actualiza la tabla de normativa.`,
      accion: 'mintrabajo-normatividad',
    });
  }

  const finDeAnio = `${anio}-12-01`;
  if (fecha >= finDeAnio && !ley.ANUALES.some((a) => a.anio === anio + 1)) {
    salida.push({
      nivel: 'medio',
      titulo: `Se acerca el decreto de salario mínimo de ${anio + 1}`,
      detalle: 'El Gobierno lo expide a finales de diciembre. Revísalo y cárgalo antes de liquidar la nómina de enero.',
      accion: 'mintrabajo-comunicados',
    });
  }

  for (const cambio of ley.CAMBIOS_PROGRAMADOS) {
    const dias = diasCalendario(fecha, cambio.fecha);
    if (dias < 0) continue;
    if (dias <= 120) {
      salida.push({
        nivel: dias <= 30 ? 'alto' : 'medio',
        titulo: cambio.titulo,
        detalle: `${cambio.detalle} Entra a regir el ${formatoLargo(cambio.fecha)} (faltan ${dias} días). Fuente: ${cambio.norma}.`,
        fecha: cambio.fecha,
      });
    }
  }

  // Escalones que acaban de entrar a regir (últimos 60 días).
  for (const tabla of [
    { nombre: 'Recargo por día de descanso y festivos', filas: ley.RECARGO_DESCANSO, formato: (f) => `${Math.round(f.factor * 100)} %` },
    { nombre: 'Jornada máxima semanal', filas: ley.JORNADA, formato: (f) => `${f.horasSemana} horas` },
    { nombre: 'Inicio de la jornada nocturna', filas: ley.NOCTURNIDAD, formato: (f) => `${f.finDiurna}:00` },
  ]) {
    for (const fila of tabla.filas) {
      const dias = diasCalendario(fila.desde, fecha);
      if (dias >= 0 && dias <= 60) {
        salida.push({
          nivel: 'info',
          titulo: `${tabla.nombre}: ${tabla.formato(fila)}`,
          detalle: `Cambió el ${formatoLargo(fila.desde)} (${fila.norma}). Las liquidaciones anteriores a esa fecha usan el valor viejo.`,
          fecha: fila.desde,
        });
      }
    }
  }

  const diasSinRevisar = diasCalendario(ley.VERIFICADO_EL, fecha);
  if (diasSinRevisar > 90) {
    salida.push({
      nivel: 'medio',
      titulo: 'Los parámetros no se revisan hace más de tres meses',
      detalle: `La última verificación fue el ${formatoLargo(ley.VERIFICADO_EL)} (${diasSinRevisar} días). Revisa las fuentes oficiales y deja constancia en la bitácora.`,
    });
  }

  const orden = { alto: 0, medio: 1, info: 2 };
  return salida.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

// ——— Lectura de fuentes ————————————————————————————————————————

/** Saca las entradas de un RSS o Atom sin depender del DOM. */
export function parsearFeed(xml, fuente = '') {
  const texto = String(xml || '');
  const items = [];
  const bloques = texto.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const bloque of bloques) {
    const titulo = limpiar(etiqueta(bloque, 'title'));
    const enlace = limpiar(etiqueta(bloque, 'link')) || atributoLink(bloque);
    const fecha = normalizarFecha(
      etiqueta(bloque, 'pubDate') || etiqueta(bloque, 'updated') || etiqueta(bloque, 'published') || etiqueta(bloque, 'dc:date'),
    );
    const resumen = limpiar(etiqueta(bloque, 'description') || etiqueta(bloque, 'summary') || etiqueta(bloque, 'content'));
    if (!titulo) continue;
    items.push({ titulo, enlace, fecha, resumen, fuente });
  }
  return items;
}

function etiqueta(bloque, nombre) {
  const re = new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, 'i');
  const m = re.exec(bloque);
  return m ? m[1] : '';
}

function atributoLink(bloque) {
  const m = /<link\b[^>]*href=["']([^"']+)["']/i.exec(bloque);
  return m ? m[1] : '';
}

function limpiar(valor) {
  return String(valor || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarFecha(valor) {
  const t = limpiar(valor);
  if (!t) return '';
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return iso[0];
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return '';
}

/**
 * Marca cada noticia con los temas que toca y qué tan relevante es.
 * `desde` permite quedarse solo con lo posterior a la última revisión.
 */
export function analizar(items, { desde = '' } = {}) {
  return items
    .filter((i) => !desde || !i.fecha || i.fecha >= desde)
    .map((i) => {
      const temas = clasificar(`${i.titulo} ${i.resumen}`);
      const norma = pareceNorma(`${i.titulo} ${i.resumen}`);
      const relevancia = (temas.length ? 2 : 0) + (norma ? 2 : 0)
        + (/salario mínimo|reforma laboral|jornada|recargo/i.test(i.titulo) ? 1 : 0);
      return { ...i, temas: temas.map((t) => t.etiqueta), temasId: temas.map((t) => t.id), pareceNorma: norma, relevancia };
    })
    .filter((i) => i.relevancia > 0)
    .sort((a, b) => (b.relevancia - a.relevancia) || String(b.fecha).localeCompare(String(a.fecha)));
}

/**
 * Consulta las fuentes que tengan feed. Necesita un proxy con CORS porque los
 * sitios oficiales no permiten lecturas desde otro dominio.
 *
 * @param {Object} opciones
 * @param {string} opciones.proxy   Plantilla con {url}, por ejemplo 'https://mi-proxy/?{url}'.
 * @param {Function} opciones.fetchImpl  Para pruebas.
 */
export async function consultarFuentes({ fuentes = [], proxy = '', fetchImpl, desde = '' } = {}) {
  const traer = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const resultados = [];
  const errores = [];
  if (!traer) return { noticias: [], errores: [{ fuente: '', mensaje: 'Este navegador no puede hacer consultas de red.' }] };

  for (const fuente of fuentes) {
    if (!fuente.feed) continue;
    const url = proxy ? proxy.replace('{url}', encodeURIComponent(fuente.feed)) : fuente.feed;
    try {
      const respuesta = await traer(url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' } });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const texto = await respuesta.text();
      resultados.push(...parsearFeed(texto, fuente.nombre));
    } catch (error) {
      errores.push({
        fuente: fuente.nombre,
        mensaje: `${error.message}. Si es un bloqueo de CORS, configura un proxy o abre la fuente a mano.`,
        url: fuente.url || fuente.feed,
      });
    }
  }

  return { noticias: analizar(resultados, { desde }), errores };
}

/**
 * Un buscador de noticias en formato RSS. No es fuente oficial: sirve para
 * enterarse rápido y saltar al decreto o a la sentencia, que es lo que vale.
 */
export function feedAgregador(consulta) {
  const q = encodeURIComponent(`${consulta} Colombia`);
  return `https://news.google.com/rss/search?q=${q}&hl=es-419&gl=CO&ceid=CO:es-419`;
}

/** Búsquedas listas para el módulo de noticias. */
export const FEEDS_SUGERIDOS = [
  { id: 'agr-salario', nombre: 'Buscador: salario mínimo y auxilio de transporte', feed: feedAgregador('"salario mínimo" decreto auxilio de transporte'), tipo: 'agregador' },
  { id: 'agr-reforma', nombre: 'Buscador: reforma laboral y Ley 2466', feed: feedAgregador('"reforma laboral" "Ley 2466" jornada recargo'), tipo: 'agregador' },
  { id: 'agr-mintrabajo', nombre: 'Buscador: Ministerio del Trabajo', feed: feedAgregador('Ministerio del Trabajo decreto resolución circular'), tipo: 'agregador' },
  { id: 'agr-prestaciones', nombre: 'Buscador: prestaciones y seguridad social', feed: feedAgregador('cesantías prima seguridad social UGPP cotización'), tipo: 'agregador' },
];

/** Fuentes de fábrica más las que agregue el usuario. */
export function fuentesDisponibles(personalizadas = []) {
  return [...ley.FUENTES, ...personalizadas];
}

/** Una entrada de bitácora a partir de una noticia. */
export function aEntradaBitacora(noticia, fecha = hoy()) {
  return {
    id: `nota-${Date.now().toString(36)}`,
    fecha,
    titulo: noticia.titulo,
    enlace: noticia.enlace || '',
    fuente: noticia.fuente || '',
    temas: noticia.temas || [],
    estado: 'por-revisar',
    notas: '',
  };
}

export { hoy, sumarDias };
