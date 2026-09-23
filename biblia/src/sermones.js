/**
 * sermones.js — Preparación de sermones expositivos, del texto al púlpito.
 *
 * El flujo sigue la homilética de Haddon Robinson: primero la idea del autor
 * bíblico (idea exegética = sujeto + complemento), luego las tres preguntas
 * funcionales, el propósito, la idea homilética y el bosquejo, cada punto
 * anclado a sus versículos. Nada aquí toca el DOM.
 */

import { nuevoId } from './marcas.js';
import { parsearLista, rango, formatear } from './referencias.js';
import { LIBROS, SECCIONES } from './libros.js';

export const PASOS = [
  { id: 'texto', nombre: 'Texto', ayuda: 'Elige una unidad de pensamiento completa (una perícopa), no un versículo aislado. Léela varias veces, en voz alta y en otras versiones.' },
  { id: 'exegesis', nombre: 'Exégesis', ayuda: 'Contexto histórico y literario, estructura, palabras clave, conectores. ¿Qué quiso decir el autor a sus primeros lectores?' },
  { id: 'idea', nombre: 'Idea exegética', ayuda: 'Sujeto: ¿de qué habla exactamente el autor? Complemento: ¿qué dice de eso? Una sola idea, en tiempo pasado y con los términos del texto.' },
  { id: 'preguntas', nombre: 'Tres preguntas', ayuda: '¿Qué significa? (explicar) ¿Es verdad? (probar) ¿Qué diferencia hace? (aplicar). Decide cuál necesitará más espacio en este sermón.' },
  { id: 'proposito', nombre: 'Propósito', ayuda: 'Qué debe saber, sentir o hacer la congregación al terminar. Un sermón sin propósito informa pero no transforma.' },
  { id: 'homiletica', nombre: 'Idea homilética', ayuda: 'La idea exegética dicha para hoy: breve, memorable, en segunda persona o en presente. Es la frase que la gente debería poder repetir el lunes.' },
  { id: 'bosquejo', nombre: 'Bosquejo', ayuda: 'Cada punto desarrolla la gran idea y sale del texto. Para cada uno: explicación, ilustración y aplicación.' },
  { id: 'extremos', nombre: 'Introducción y conclusión', ayuda: 'La introducción crea la necesidad y orienta hacia la idea; la conclusión la resume y llama a responder. Escríbelas al final.' },
  { id: 'revision', nombre: 'Revisión', ayuda: 'Fidelidad al texto, claridad de la idea, Cristo en el centro, duración y, después de predicar, evaluación.' },
];

export const ESTADOS = [
  { id: 'idea', nombre: 'Idea' },
  { id: 'preparando', nombre: 'En preparación' },
  { id: 'listo', nombre: 'Listo para predicar' },
  { id: 'predicado', nombre: 'Predicado' },
];

/** Caminos clásicos del texto a Cristo (Greidanus y otros). */
export const RUTAS_A_CRISTO = [
  'Progreso redentor', 'Promesa y cumplimiento', 'Tipología', 'Analogía', 'Tema longitudinal',
  'Referencia del NT', 'Contraste',
];

export function crearSermon({ pasaje = '', titulo = '', serie = '', fecha = '' } = {}) {
  const ahora = Date.now();
  return {
    id: nuevoId('s'), titulo, pasaje, serie, fecha, estado: 'idea',
    contexto: '', estructura: '', observaciones: '', palabras: '',
    sujeto: '', complemento: '',
    significa: '', verdad: '', diferencia: '',
    proposito: '', homiletica: '',
    bosquejo: [], introduccion: '', conclusion: '',
    rutaCristo: '', cristo: '',
    velocidad: 130, meta: 35,
    notasOrador: '',
    evaluacion: { claridad: 0, fidelidad: 0, aplicacion: 0, duracion: 0, notas: '' },
    creado: ahora, editado: ahora,
  };
}

export function nuevoPunto(datos = {}) {
  return { id: nuevoId('pt'), titulo: '', pasaje: '', explicacion: '', ilustracion: '', aplicacion: '', ...datos };
}

/** Mueve un punto del bosquejo (arriba = -1, abajo = +1) sin mutar el original. */
export function moverPunto(bosquejo, id, paso) {
  const lista = [...bosquejo];
  const i = lista.findIndex((p) => p.id === id);
  const j = i + paso;
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return lista;
}

/** La idea exegética en una frase: "Sujeto: complemento". */
export function ideaExegetica(s) {
  const a = (s.sujeto || '').trim().replace(/[?.]+$/, '');
  const b = (s.complemento || '').trim();
  if (!a && !b) return '';
  if (!b) return a;
  if (!a) return b;
  return `${a.charAt(0).toUpperCase()}${a.slice(1)}: ${b.charAt(0).toLowerCase()}${b.slice(1)}`;
}

/** Qué pasos tienen contenido. Devuelve { [paso]: true|false } y el porcentaje. */
export function progreso(s) {
  const lleno = (x) => Boolean(String(x || '').trim());
  const hechos = {
    texto: lleno(s.pasaje) && parsearLista(s.pasaje).length > 0,
    exegesis: lleno(s.contexto) || lleno(s.observaciones) || lleno(s.estructura),
    idea: lleno(s.sujeto) && lleno(s.complemento),
    preguntas: [s.significa, s.verdad, s.diferencia].filter(lleno).length >= 2,
    proposito: lleno(s.proposito),
    homiletica: lleno(s.homiletica),
    bosquejo: (s.bosquejo || []).filter((p) => lleno(p.titulo)).length >= 2,
    extremos: lleno(s.introduccion) && lleno(s.conclusion),
    revision: lleno(s.cristo) || s.estado === 'listo' || s.estado === 'predicado',
  };
  const n = Object.values(hechos).filter(Boolean).length;
  return { hechos, porcentaje: Math.round((n / PASOS.length) * 100) };
}

const contar = (t) => (String(t || '').match(/\S+/g) || []).length;

/** Palabras que se van a decir (no cuentan las notas de estudio). */
export function palabrasPredicadas(s) {
  return contar(s.introduccion) + contar(s.conclusion) + contar(s.homiletica)
    + (s.bosquejo || []).reduce((n, p) => n + contar(p.titulo) + contar(p.explicacion) + contar(p.ilustracion) + contar(p.aplicacion), 0);
}

/** Minutos estimados de predicación a una velocidad dada (palabras por minuto). */
export function duracionEstimada(s, velocidad = s.velocidad || 130) {
  return Math.round(palabrasPredicadas(s) / Math.max(60, velocidad));
}

/** Avisos de revisión: lo que un buen mentor de homilética preguntaría. */
export function avisos(s) {
  const lista = [];
  const { hechos } = progreso(s);
  if (!hechos.idea) lista.push('Falta la idea exegética completa (sujeto y complemento).');
  if (!hechos.homiletica) lista.push('Falta la idea homilética: la frase que la gente recordará.');
  if (!hechos.proposito) lista.push('Define el propósito: qué debe saber, sentir o hacer la congregación.');
  const puntos = (s.bosquejo || []).filter((p) => p.titulo?.trim());
  if (puntos.length && puntos.some((p) => !p.pasaje?.trim())) lista.push('Hay puntos del bosquejo sin versículos: cada punto debería salir del texto.');
  if (puntos.length && puntos.every((p) => !p.aplicacion?.trim())) lista.push('Ningún punto tiene aplicación.');
  if (puntos.length > 5) lista.push(`El bosquejo tiene ${puntos.length} puntos: considera agruparlos (una bala, no perdigones).`);
  if (!s.cristo?.trim()) lista.push('¿Cómo lleva este texto a Cristo? Anota la ruta en la revisión.');
  const min = duracionEstimada(s);
  if (s.meta && min > s.meta * 1.15) lista.push(`El manuscrito dura ~${min} min, más que tu meta de ${s.meta}.`);
  return lista;
}

/** Pasajes del sermón (el principal y los de cada punto) como rangos. */
export function pasajesDe(s) {
  const citas = [s.pasaje, ...(s.bosquejo || []).map((p) => p.pasaje)].filter(Boolean).join('; ');
  return parsearLista(citas).map((r) => ({ ref: r, ...rango(r) }));
}

/** Sermón completo en Markdown (manuscrito + notas de estudio), para imprimir o pasar a Word. */
export function sermonAMarkdown(s, { textoDe } = {}) {
  const l = [];
  l.push(`# ${s.titulo || 'Sermón sin título'}`);
  const meta = [s.pasaje && `**Texto:** ${s.pasaje}`, s.serie && `**Serie:** ${s.serie}`, s.fecha && `**Fecha:** ${s.fecha}`].filter(Boolean);
  if (meta.length) l.push('', meta.join(' · '));
  if (textoDe && s.pasaje) { const t = textoDe(s.pasaje); if (t) l.push('', `> ${t}`); }
  if (s.homiletica) l.push('', `**Gran idea:** ${s.homiletica}`);
  if (s.proposito) l.push('', `**Propósito:** ${s.proposito}`);
  if (s.introduccion) l.push('', '## Introducción', '', s.introduccion.trim());
  (s.bosquejo || []).forEach((p, i) => {
    l.push('', `## ${romano(i + 1)}. ${p.titulo || 'Punto'}${p.pasaje ? ` (${p.pasaje})` : ''}`);
    if (p.explicacion) l.push('', p.explicacion.trim());
    if (p.ilustracion) l.push('', `*Ilustración:* ${p.ilustracion.trim()}`);
    if (p.aplicacion) l.push('', `**Aplicación:** ${p.aplicacion.trim()}`);
  });
  if (s.conclusion) l.push('', '## Conclusión', '', s.conclusion.trim());
  const estudio = [
    ['Idea exegética', ideaExegetica(s)], ['Contexto', s.contexto], ['Estructura', s.estructura],
    ['Observaciones', s.observaciones], ['Palabras clave', s.palabras],
    ['¿Qué significa?', s.significa], ['¿Es verdad?', s.verdad], ['¿Qué diferencia hace?', s.diferencia],
    ['Cristo en el texto', [s.rutaCristo, s.cristo].filter(Boolean).join(' — ')],
  ].filter(([, v]) => v && String(v).trim());
  if (estudio.length) {
    l.push('', '---', '', '## Notas de estudio');
    for (const [k, v] of estudio) l.push('', `**${k}:** ${String(v).trim()}`);
  }
  l.push('', `*Duración estimada: ${duracionEstimada(s)} min (${palabrasPredicadas(s)} palabras)*`, '');
  return l.join('\n');
}

export function romano(n) {
  const tabla = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let r = '';
  for (const [v, s] of tabla) while (n >= v) { r += s; n -= v; }
  return r;
}

/**
 * Cobertura del canon: cuántos sermones por sección de la Biblia, para ver si
 * la "dieta" de la congregación está equilibrada (AT/NT, géneros).
 */
export function cobertura(sermones) {
  const porLibro = new Array(66).fill(0);
  for (const s of sermones) {
    const r = parsearLista(s.pasaje || '')[0];
    if (r) porLibro[r.b - 1]++;
  }
  const porSeccion = SECCIONES.map((sec) => ({ ...sec, n: porLibro.slice(sec.desde - 1, sec.hasta).reduce((a, x) => a + x, 0) }));
  const at = porLibro.slice(0, 39).reduce((a, x) => a + x, 0);
  const nt = porLibro.slice(39).reduce((a, x) => a + x, 0);
  const sinPredicar = LIBROS.filter((l, i) => !porLibro[i]).map((l) => l.nombre);
  return { porLibro, porSeccion, at, nt, sinPredicar };
}

/** Texto corto de la cita principal ("Romanos 5:1-11"), o lo escrito si no se reconoce. */
export function citaPrincipal(s) {
  const r = parsearLista(s.pasaje || '')[0];
  return r ? formatear(r) : (s.pasaje || '');
}

/** Deja en blanco la palabra clave de un título para la hoja de la congregación: "La paz con ________". */
export function conEspacio(titulo) {
  const palabras = String(titulo || '').trim().split(/\s+/);
  if (palabras.length < 2) return titulo || '';
  let i = palabras.length - 1;
  // la última palabra con contenido (no "de", "la"…)
  while (i > 0 && palabras[i].replace(/[^\p{L}]/gu, '').length < 4) i--;
  const puntuacion = palabras[i].match(/[^\p{L}\p{N}]+$/u)?.[0] || '';
  palabras[i] = '_'.repeat(Math.max(8, palabras[i].length + 2)) + puntuacion;
  return palabras.join(' ');
}

/**
 * Preguntas para grupos pequeños a partir del sermón: observación,
 * interpretación y aplicación (el método inductivo que la congregación ya conoce).
 */
export function preguntasDeGrupo(s) {
  const cita = citaPrincipal(s);
  const obs = [
    `Lean ${cita} en voz alta, despacio. ¿Qué palabras o ideas se repiten?`,
    '¿Quién habla, a quién y en qué situación? ¿Qué pasó justo antes de este pasaje?',
  ];
  if (s.sujeto) obs.push(`${s.sujeto.trim().replace(/\?*$/, '?')} ¿Cómo lo responde el mismo texto?`);
  const interp = (s.bosquejo || []).filter((p) => p.titulo?.trim()).map((p) =>
    `${p.pasaje ? `Según ${p.pasaje}, ` : ''}¿qué significa «${p.titulo.trim()}»? ¿Por qué el autor lo dice así?`);
  if (s.homiletica) interp.push(`La idea central fue: «${s.homiletica.trim().replace(/[.!]+$/, '')}». ¿Dónde la ven en el texto?`);
  interp.push('¿Cómo nos muestra este pasaje a Cristo y su obra?');
  const apli = (s.bosquejo || []).filter((p) => p.aplicacion?.trim()).map((p) => `${p.aplicacion.trim()} ¿Qué paso concreto darás esta semana?`);
  if (s.diferencia) apli.push(`${s.diferencia.trim()} ¿Cómo se ve esto en tu casa, trabajo o estudios?`);
  apli.push('¿Por qué necesitas orar a partir de este pasaje? Oren unos por otros.');
  return [
    { titulo: 'Observación', preguntas: obs },
    { titulo: 'Interpretación', preguntas: interp },
    { titulo: 'Aplicación', preguntas: apli },
  ];
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Hoja imprimible (HTML completo): texto, gran idea, bosquejo con espacios y preguntas de grupo. */
export function hojaCongregacion(s, { textoPasaje = '', iglesia = '' } = {}) {
  const puntos = (s.bosquejo || []).filter((p) => p.titulo?.trim());
  const grupos = preguntasDeGrupo(s);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(s.titulo || 'Sermón')}</title>
<style>
  body { font: 11.5pt/1.5 Georgia, 'Times New Roman', serif; color: #111; max-width: 720px; margin: 24px auto; padding: 0 20px; }
  h1 { font-size: 20pt; margin: 0; } h2 { font: 700 10pt system-ui, sans-serif; text-transform: uppercase; letter-spacing: .08em; color: #555; margin: 22px 0 6px; border-bottom: 1px solid #ccc; }
  .meta { color: #555; font: 10pt system-ui, sans-serif; margin: 4px 0 14px; }
  blockquote { margin: 0; padding: 8px 14px; background: #f5f3ee; border-left: 3px solid #b8860b; }
  .idea { font-size: 14pt; font-weight: 700; margin: 14px 0; }
  ol.bosquejo > li { margin: 10px 0 18px; } .notas { border-bottom: 1px dotted #999; height: 1.6em; }
  ol.preguntas li { margin: 6px 0 16px; } .pie { margin-top: 30px; font: 9pt system-ui, sans-serif; color: #777; }
  @page { margin: 16mm; } .corte { break-before: page; }
</style></head><body>
<h1>${esc(s.titulo || 'Sermón')}</h1>
<div class="meta">${esc([citaPrincipal(s), s.serie, s.fecha, iglesia].filter(Boolean).join(' · '))}</div>
${textoPasaje ? `<blockquote>${esc(textoPasaje)}</blockquote>` : ''}
${s.homiletica ? `<p class="idea">${esc(s.homiletica)}</p>` : ''}
${puntos.length ? `<h2>Bosquejo</h2><ol class="bosquejo">${puntos.map((p) => `<li><strong>${esc(conEspacio(p.titulo))}</strong>${p.pasaje ? ` <em>(${esc(p.pasaje)})</em>` : ''}<div class="notas"></div><div class="notas"></div></li>`).join('')}</ol>` : ''}
<h2>Mis notas</h2><div class="notas"></div><div class="notas"></div><div class="notas"></div>
<div class="corte"></div>
<h2>Para el grupo pequeño</h2>
${grupos.map((g) => `<h3>${esc(g.titulo)}</h3><ol class="preguntas">${g.preguntas.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`).join('')}
<p class="pie">Preparado con Estudio Bíblico</p>
</body></html>`;
}
