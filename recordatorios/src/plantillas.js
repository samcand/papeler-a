/**
 * plantillas.js — Los módulos de trabajo que no son inversiones.
 *
 * Cada uno sabe convertir lo que ya tienes (un semestre, un artículo, un
 * servicio del domingo) en las tareas que de verdad hay que hacer, con sus
 * fechas calculadas. Son funciones puras: generan tareas, no las guardan.
 */

import { aISO, deISO, diferenciaDias, hoy, sumarDias, DIAS } from './fechas.js';
import { parseRegla } from './recurrencia.js';

/* ================================================================== *
 * Docencia
 * ================================================================== */

/**
 * Un curso trae su horario y sus evaluaciones; de ahí salen las tareas
 * repetidas de preparar clase y las fechas de calificar y entregar notas.
 */
export function tareasDeCurso(curso, opciones = {}) {
  const { diasParaCalificar = 7, prepararAntes = 1 } = opciones;
  const tareas = [];
  const etiquetaCurso = curso.codigo || curso.nombre;

  for (const sesion of curso.horario || []) {
    const dia = typeof sesion.dia === 'number' ? DIAS[sesion.dia] : sesion.dia;
    tareas.push({
      titulo: `Preparar clase de ${curso.nombre}`,
      modulo: 'docencia',
      proyecto: curso.nombre,
      prioridad: 2,
      hora: sesion.preparar || '18:00',
      duracion: sesion.duracionPreparacion || 60,
      regla: parseRegla(`cada ${dia}`),
      etiquetas: [etiquetaCurso, 'clase'],
      notas: `Clase el ${dia}${sesion.inicio ? ` a las ${sesion.inicio}` : ''}${sesion.aula ? ` en ${sesion.aula}` : ''}.`,
    });
  }

  for (const ev of curso.evaluaciones || []) {
    tareas.push({
      titulo: `Preparar ${ev.nombre} — ${curso.nombre}`,
      modulo: 'docencia',
      proyecto: curso.nombre,
      prioridad: 2,
      fecha: aISO(sumarDias(ev.fecha, -(ev.prepararAntes ?? 7))),
      etiquetas: [etiquetaCurso, 'examen'],
      notas: `Se aplica el ${ev.fecha}${ev.peso ? ` · vale ${ev.peso} %` : ''}.`,
    });
    tareas.push({
      titulo: `Calificar ${ev.nombre} — ${curso.nombre}`,
      modulo: 'docencia',
      proyecto: curso.nombre,
      prioridad: 1,
      fecha: aISO(sumarDias(ev.fecha, diasParaCalificar)),
      duracion: ev.minutosCalificar || 180,
      etiquetas: [etiquetaCurso, 'calificar'],
      notas: `${curso.grupos || 1} grupo(s)${ev.estudiantes ? `, ${ev.estudiantes} estudiantes` : ''}. Publicar notas y atender reclamos.`,
    });
  }

  if (curso.entregaNotas) {
    tareas.push({
      titulo: `Entregar notas finales de ${curso.nombre}`,
      modulo: 'docencia',
      proyecto: curso.nombre,
      prioridad: 1,
      fecha: aISO(sumarDias(curso.entregaNotas, -2)),
      etiquetas: [etiquetaCurso, 'notas'],
      notas: `Fecha límite de la universidad: ${curso.entregaNotas}.`,
    });
  }
  return tareas;
}

export function tareasDeSemestre(semestre = {}) {
  return (semestre.cursos || []).flatMap((c) => tareasDeCurso(c, semestre.opciones || {}));
}

/** Cuánto falta para terminar el semestre y cuántas semanas de clase quedan. */
export function avanceSemestre(semestre, hoyISO = aISO(hoy())) {
  if (!semestre?.inicio || !semestre?.fin) return null;
  const total = diferenciaDias(semestre.inicio, semestre.fin);
  const corridos = Math.min(Math.max(diferenciaDias(semestre.inicio, hoyISO), 0), total);
  return {
    pct: total > 0 ? Math.round((corridos / total) * 100) : 0,
    semanaActual: Math.max(1, Math.ceil((corridos + 1) / 7)),
    semanasRestantes: Math.max(0, Math.ceil((total - corridos) / 7)),
    diasRestantes: Math.max(0, total - corridos),
  };
}

/**
 * Clona un semestre corriendo todas las fechas. El desplazamiento se redondea a
 * **semanas enteras** para que los martes sigan siendo martes: un curso que se
 * da los martes y jueves no puede acabar cayendo en miércoles.
 */
export function clonarSemestre(semestre = {}, opciones = {}) {
  const nuevoInicio = opciones.inicio || aISO(hoy());
  const anterior = semestre.inicio || nuevoInicio;
  const semanas = Math.round(diferenciaDias(anterior, nuevoInicio) / 7);
  const desplaza = (f) => (f ? aISO(sumarDias(f, semanas * 7)) : f);

  return {
    nombre: opciones.nombre || `${semestre.nombre || 'Semestre'} (copia)`,
    inicio: desplaza(semestre.inicio) || nuevoInicio,
    fin: desplaza(semestre.fin),
    semanasDesplazadas: semanas,
    cursos: (semestre.cursos || []).map((c) => ({
      ...c,
      horario: (c.horario || []).map((h) => ({ ...h })),
      entregaNotas: desplaza(c.entregaNotas),
      evaluaciones: (c.evaluaciones || []).map((e) => ({ ...e, fecha: desplaza(e.fecha) })),
    })),
  };
}

export const RUTINA_DOCENCIA = [
  { titulo: 'Responder correos de estudiantes', regla: 'cada día hábil', hora: '17:00', prioridad: 3, duracion: 20 },
  { titulo: 'Subir material de la semana al aula virtual', regla: 'cada lunes', prioridad: 2 },
  { titulo: 'Actualizar el registro de notas', regla: 'cada viernes', prioridad: 3 },
  { titulo: 'Asesorías / horario de atención', regla: 'cada miércoles', hora: '10:00', prioridad: 3, duracion: 120 },
];

/* ================================================================== *
 * Investigación
 * ================================================================== */

export const ESTADOS_ARTICULO = [
  { id: 'idea', nombre: 'Idea', siguiente: 'Escribir el esquema y la pregunta de investigación.', diasAviso: 30 },
  { id: 'datos', nombre: 'Datos / experimentos', siguiente: 'Terminar el análisis y las figuras.', diasAviso: 45 },
  { id: 'borrador', nombre: 'Borrador', siguiente: 'Completar la sección pendiente y pasar a revisión interna.', diasAviso: 30 },
  { id: 'revision-interna', nombre: 'Revisión de coautores', siguiente: 'Perseguir los comentarios que faltan.', diasAviso: 14 },
  { id: 'enviado', nombre: 'Enviado', siguiente: 'Esperar acuse y confirmar que entró a revisión.', diasAviso: 21 },
  { id: 'en-revision', nombre: 'En revisión', siguiente: 'Si pasan meses sin respuesta, escribir al editor.', diasAviso: 90 },
  { id: 'revision-menor', nombre: 'Revisión menor', siguiente: 'Responder punto por punto y reenviar.', diasAviso: 21 },
  { id: 'revision-mayor', nombre: 'Revisión mayor', siguiente: 'Plan de respuesta: qué se acepta, qué se rebate con datos.', diasAviso: 45 },
  { id: 'aceptado', nombre: 'Aceptado', siguiente: 'Revisar pruebas de imprenta y preparar difusión.', diasAviso: 30 },
  { id: 'publicado', nombre: 'Publicado', siguiente: 'Difundir, archivar el preprint y sumar la cita al CV.', diasAviso: null },
  { id: 'rechazado', nombre: 'Rechazado', siguiente: 'Elegir revista nueva y adaptar el formato. No dejarlo enfriar.', diasAviso: 21 },
];

export function estadoArticulo(id) {
  return ESTADOS_ARTICULO.find((e) => e.id === id) || ESTADOS_ARTICULO[0];
}

/**
 * Tareas de la cartera de artículos: el siguiente paso de cada uno, el aviso
 * cuando lleva demasiado tiempo parado y las fechas límite de convocatorias.
 */
export function tareasDeInvestigacion(datos = {}, hoyISO = aISO(hoy())) {
  const tareas = [];

  for (const art of datos.articulos || []) {
    const estado = estadoArticulo(art.estado);
    const dias = art.desde ? diferenciaDias(art.desde, hoyISO) : null;

    if (art.deadline && art.deadline >= hoyISO) {
      tareas.push({
        titulo: `Fecha límite: ${art.titulo}`,
        modulo: 'investigacion', proyecto: art.titulo, prioridad: 1,
        fecha: aISO(sumarDias(art.deadline, -7)),
        etiquetas: ['deadline'],
        notas: `Entrega el ${art.deadline}${art.revista ? ` · ${art.revista}` : ''}.`,
      });
    }
    if (estado.diasAviso && dias != null && dias >= estado.diasAviso) {
      tareas.push({
        titulo: `${art.titulo}: lleva ${dias} días en "${estado.nombre}"`,
        modulo: 'investigacion', proyecto: art.titulo, prioridad: 2,
        fecha: hoyISO,
        etiquetas: ['seguimiento'],
        notas: estado.siguiente,
      });
    } else if (!art.deadline) {
      tareas.push({
        titulo: `${art.titulo}: ${estado.siguiente}`,
        modulo: 'investigacion', proyecto: art.titulo, prioridad: 3,
        fecha: null,
        etiquetas: ['siguiente-paso'],
      });
    }
  }

  for (const conv of datos.convocatorias || []) {
    if (conv.cierra < hoyISO) continue;
    tareas.push({
      titulo: `Convocatoria: ${conv.nombre}`,
      modulo: 'investigacion', prioridad: 1,
      fecha: aISO(sumarDias(conv.cierra, -(conv.avisoDias ?? 21))),
      etiquetas: ['convocatoria'],
      notas: `Cierra el ${conv.cierra}. ${conv.notas || ''}`.trim(),
    });
  }

  for (const tesis of datos.tesis || []) {
    tareas.push({
      titulo: `Asesoría: ${tesis.estudiante}`,
      modulo: 'investigacion', proyecto: 'Tesis dirigidas', prioridad: 2,
      regla: parseRegla(tesis.frecuencia || 'cada 2 semanas'),
      fecha: tesis.proxima || hoyISO,
      etiquetas: ['tesis'],
      notas: `${tesis.titulo || ''}${tesis.etapa ? ` · etapa: ${tesis.etapa}` : ''}`.trim(),
    });
  }
  return tareas;
}

/**
 * Lo que hay que hacer cuando un artículo pasa a publicado y nunca se hace:
 * el CV, el repositorio, el perfil y contarlo.
 */
export const AL_PUBLICAR = [
  { titulo: 'Añadir el artículo al CV', dias: 3, prioridad: 2 },
  { titulo: 'Subir el preprint o la versión aceptada al repositorio institucional', dias: 5, prioridad: 2 },
  { titulo: 'Actualizar el perfil (ORCID, Scholar, web del departamento)', dias: 7, prioridad: 3 },
  { titulo: 'Contarlo: correo al grupo, redes o seminario', dias: 10, prioridad: 4 },
  { titulo: 'Mandar copia a quien ayudó con los datos', dias: 10, prioridad: 4 },
];

/** Genera esas tareas para un artículo concreto. */
export function tareasAlPublicar(articulo = {}, hoyISO = aISO(hoy())) {
  return AL_PUBLICAR.map((x) => ({
    titulo: `${x.titulo}: ${articulo.titulo || 'artículo'}`,
    fecha: aISO(sumarDias(hoyISO, x.dias)),
    prioridad: x.prioridad,
    modulo: 'investigacion',
    proyecto: articulo.titulo || 'Artículos',
    etiquetas: ['publicado'],
    notas: articulo.revista ? `Publicado en ${articulo.revista}.` : '',
  }));
}

export const RUTINA_INVESTIGACION = [
  { titulo: 'Escritura profunda (sin correo, sin móvil)', regla: 'cada día hábil', hora: '07:00', duracion: 90, prioridad: 1 },
  { titulo: 'Leer un artículo del área', regla: 'cada martes y jueves', duracion: 45, prioridad: 3 },
  { titulo: 'Actualizar la bibliografía del gestor de referencias', regla: 'cada viernes', prioridad: 4 },
];

/* ================================================================== *
 * Alabanza
 * ================================================================== */

/**
 * La semana del equipo hacia atrás desde el domingo: repertorio, envío al
 * equipo, ensayo y llegada temprano.
 */
export function tareasDeServicio(servicio = {}, opciones = {}) {
  const domingo = servicio.fecha;
  if (!domingo) return [];
  const { diasRepertorio = 6, diasEnvio = 4, diaEnsayo = 2 } = opciones;
  const base = { modulo: 'alabanza', proyecto: 'Servicio ' + domingo, etiquetas: ['equipo'] };
  const enlace = opciones.enlaceApp !== false ? ' Abre la app de alabanza para armar la lista.' : '';

  return [
    { ...base, titulo: 'Elegir el repertorio del domingo', prioridad: 2, fecha: aISO(sumarDias(domingo, -diasRepertorio)), duracion: 45,
      notas: `Tonalidades según quién canta, y revisar qué se cantó las últimas semanas.${enlace}` },
    { ...base, titulo: 'Enviar la lista y las hojas al equipo', prioridad: 1, fecha: aISO(sumarDias(domingo, -diasEnvio)),
      notas: 'Set por enlace o QR, hojas por músico y pistas de clic si se usan.' },
    { ...base, titulo: 'Ensayo del equipo', prioridad: 1, fecha: aISO(sumarDias(domingo, -diaEnsayo)), hora: servicio.horaEnsayo || '19:00', duracion: 120,
      notas: 'Calentamiento, transiciones y oración.' },
    { ...base, titulo: 'Llegar para prueba de sonido', prioridad: 1, fecha: domingo, hora: servicio.horaLlegada || '07:00',
      notas: `Servicio a las ${servicio.hora || '09:00'}.` },
  ];
}

export const RUTINA_ALABANZA = [
  { titulo: 'Practicar mi instrumento', regla: 'cada día', duracion: 30, prioridad: 3 },
  { titulo: 'Revisar el historial: qué no se canta hace tiempo', regla: 'cada 2 semanas', prioridad: 4 },
  { titulo: 'Escribir a un músico del equipo (no solo por logística)', regla: 'cada semana', prioridad: 3 },
];

/* ================================================================== *
 * Personal y GTD
 * ================================================================== */

export const REVISION_SEMANAL = [
  'Vaciar la bandeja de entrada de la app.',
  'Vaciar el correo hasta cero (o casi).',
  'Repasar las tareas vencidas: hacer, reprogramar o borrar. Sin culpa.',
  'Revisar el calendario de la semana que viene.',
  'Revisar cada proyecto: ¿cuál es la siguiente acción concreta?',
  'Revisar la lista de "esperando respuesta" y perseguir lo que toque.',
  'Revisar la cartera: pesos, stops y tesis viejas.',
  'Revisar el avance del semestre y lo que viene de docencia.',
  'Mirar el pipeline de artículos: ¿alguno lleva demasiado tiempo parado?',
  'Elegir las tres cosas que harían que la semana valga la pena.',
];

export const REVISION_MENSUAL = [
  'Cerrar el mes en el diario de operaciones: resultados y una lección.',
  'Revisar aportes, gastos y objetivo de ahorro del mes.',
  'Repasar hábitos: cuáles se sostuvieron y cuáles no.',
  'Archivar lo terminado y limpiar proyectos muertos.',
  'Revisar metas del trimestre y ajustar lo que ya no aplica.',
];

export const RUTINA_PERSONAL = [
  { titulo: 'Revisión semanal', regla: 'cada domingo', hora: '17:00', duracion: 60, prioridad: 1, notas: 'La hora que hace que el resto de la semana funcione.' },
  { titulo: 'Planificar el día de mañana', regla: 'cada día hábil', hora: '21:00', duracion: 10, prioridad: 3 },
  { titulo: 'Ejercicio', regla: 'cada lunes, miércoles y viernes', hora: '06:00', duracion: 45, prioridad: 2 },
  { titulo: 'Revisión mensual', regla: 'el último día del mes', prioridad: 2 },
];

/** Racha de un hábito a partir de los días marcados. */
export function rachaHabito(fechas = [], hoyISO = aISO(hoy())) {
  const set = new Set(fechas);
  let racha = 0;
  for (let i = 0; i < 400; i++) {
    const dia = aISO(sumarDias(hoyISO, -i));
    if (set.has(dia)) racha++;
    else if (i > 0) break;      // hoy todavía puede marcarse
    else continue;
  }
  let mejor = 0;
  let actual = 0;
  const ordenadas = [...set].sort();
  for (let i = 0; i < ordenadas.length; i++) {
    if (i > 0 && diferenciaDias(ordenadas[i - 1], ordenadas[i]) === 1) actual++;
    else actual = 1;
    mejor = Math.max(mejor, actual);
  }
  return { racha, mejor, total: set.size };
}

/** Todas las rutinas juntas, para el asistente de puesta en marcha. */
export const RUTINAS = {
  docencia: RUTINA_DOCENCIA,
  investigacion: RUTINA_INVESTIGACION,
  alabanza: RUTINA_ALABANZA,
  personal: RUTINA_PERSONAL,
};
