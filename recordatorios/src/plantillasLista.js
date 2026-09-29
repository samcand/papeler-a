/**
 * plantillasLista.js — Listas que se repiten enteras.
 *
 * Cerrar un semestre, preparar un congreso o estudiar una inversión son siempre
 * las mismas quince tareas con las mismas distancias entre ellas. Una plantilla
 * guarda esos **desfases relativos a una fecha ancla**: al aplicarla eliges el
 * día (el examen, el viaje, el domingo) y las fechas se calculan solas, hacia
 * atrás o hacia adelante.
 */

import { aISO, deISO, diferenciaDias, hoy, sumarDias } from './fechas.js';
import { parseRegla } from './recurrencia.js';

export function plantillaVacia(nombre = 'Plantilla nueva') {
  return {
    id: 'pl-' + Math.random().toString(36).slice(2, 8),
    nombre,
    descripcion: '',
    modulo: null,
    proyecto: null,
    anclaNombre: 'el día señalado',
    items: [],
  };
}

/**
 * Aplica una plantilla a una fecha ancla y devuelve tareas listas para guardar.
 * `offset` negativo = antes del día señalado; 0 = ese mismo día.
 */
export function aplicarPlantilla(plantilla, anclaISO = aISO(hoy()), opciones = {}) {
  const ancla = aISO(anclaISO);
  return (plantilla.items || []).map((item, i) => {
    const fecha = item.sinFecha ? null : aISO(sumarDias(ancla, Number(item.offset) || 0));
    return {
      titulo: item.titulo,
      notas: [item.notas, opciones.conReferencia === false ? null : `Plantilla “${plantilla.nombre}” · ${plantilla.anclaNombre}: ${ancla}`]
        .filter(Boolean).join('\n'),
      fecha,
      hora: item.hora || null,
      duracion: item.duracion || null,
      prioridad: item.prioridad || 3,
      modulo: item.modulo || plantilla.modulo || null,
      proyecto: opciones.proyecto || plantilla.proyecto || null,
      etiquetas: item.etiquetas || [],
      regla: item.regla ? parseRegla(item.regla) : null,
      orden: Date.now() + i,
    };
  });
}

/** Previsualización: qué días caerían, para verlo antes de crear nada. */
export function previsualizar(plantilla, anclaISO = aISO(hoy())) {
  return aplicarPlantilla(plantilla, anclaISO, { conReferencia: false })
    .map((t) => ({ titulo: t.titulo, fecha: t.fecha, hora: t.hora }))
    .sort((a, b) => String(a.fecha || '9999').localeCompare(String(b.fecha || '9999')));
}

/**
 * Crea una plantilla a partir de tareas que ya existen: la fecha más tardía (o
 * la que elijas) se convierte en el ancla y el resto en desfases.
 */
export function plantillaDesdeTareas(tareas = [], opciones = {}) {
  const conFecha = tareas.filter((t) => t.fecha);
  const ancla = opciones.ancla || (conFecha.length
    ? conFecha.map((t) => t.fecha).sort().at(-1)
    : aISO(hoy()));
  const plantilla = plantillaVacia(opciones.nombre || 'Plantilla desde tareas');
  plantilla.descripcion = opciones.descripcion || '';
  plantilla.modulo = opciones.modulo || tareas.find((t) => t.modulo)?.modulo || null;
  plantilla.anclaNombre = opciones.anclaNombre || 'el día señalado';
  plantilla.items = tareas.map((t) => ({
    titulo: t.titulo,
    notas: t.notas || '',
    offset: t.fecha ? diferenciaDias(ancla, t.fecha) : 0,
    sinFecha: !t.fecha,
    hora: t.hora || null,
    duracion: t.duracion || null,
    prioridad: t.prioridad || 3,
    modulo: t.modulo || null,
    etiquetas: t.etiquetas || [],
  })).sort((a, b) => a.offset - b.offset);
  return plantilla;
}

/** Cuánto abarca la plantilla, para enseñarlo en la lista. */
export function resumenPlantilla(plantilla) {
  const items = plantilla.items || [];
  const conFecha = items.filter((i) => !i.sinFecha);
  const offsets = conFecha.map((i) => Number(i.offset) || 0);
  return {
    total: items.length,
    desde: offsets.length ? Math.min(...offsets) : 0,
    hasta: offsets.length ? Math.max(...offsets) : 0,
    minutos: items.reduce((s, i) => s + (Number(i.duracion) || 0), 0),
  };
}

/* ------------------------------------------------------------------ *
 * Plantillas que vienen puestas
 * ------------------------------------------------------------------ */

export const PLANTILLAS_INICIALES = [
  {
    id: 'pl-parcial',
    nombre: 'Aplicar y calificar un parcial',
    descripcion: 'Desde el diseño del examen hasta la entrega de notas y los reclamos.',
    modulo: 'docencia',
    anclaNombre: 'día del examen',
    items: [
      { titulo: 'Diseñar el examen y la clave de respuestas', offset: -10, duracion: 120, prioridad: 2 },
      { titulo: 'Revisar el examen con un colega', offset: -6, duracion: 30, prioridad: 3 },
      { titulo: 'Imprimir y preparar el material', offset: -2, duracion: 30, prioridad: 2 },
      { titulo: 'Clase de repaso y dudas', offset: -1, duracion: 60, prioridad: 2 },
      { titulo: 'Aplicar el examen', offset: 0, duracion: 120, prioridad: 1 },
      { titulo: 'Calificar', offset: 3, duracion: 180, prioridad: 1 },
      { titulo: 'Publicar notas', offset: 7, duracion: 30, prioridad: 1 },
      { titulo: 'Atender reclamos', offset: 9, duracion: 60, prioridad: 2 },
      { titulo: 'Anotar qué falló para la próxima vez', offset: 10, duracion: 15, prioridad: 4 },
    ],
  },
  {
    id: 'pl-congreso',
    nombre: 'Congreso o ponencia',
    descripcion: 'Resumen, presentación, viaje y lo que hay que hacer al volver.',
    modulo: 'investigacion',
    anclaNombre: 'día de la ponencia',
    items: [
      { titulo: 'Enviar el resumen', offset: -90, prioridad: 1 },
      { titulo: 'Reservar vuelo y alojamiento', offset: -45, prioridad: 2 },
      { titulo: 'Preparar la presentación', offset: -14, duracion: 240, prioridad: 1 },
      { titulo: 'Ensayar la charla con cronómetro', offset: -5, duracion: 60, prioridad: 2 },
      { titulo: 'Preparar respuestas a las preguntas difíciles', offset: -3, duracion: 45, prioridad: 2 },
      { titulo: 'Imprimir/llevar copia de seguridad de la charla', offset: -1, prioridad: 2 },
      { titulo: 'Ponencia', offset: 0, prioridad: 1 },
      { titulo: 'Escribir contactos y notas de lo aprendido', offset: 2, duracion: 45, prioridad: 3 },
      { titulo: 'Pasar los gastos del viaje', offset: 5, duracion: 30, prioridad: 3 },
    ],
  },
  {
    id: 'pl-cierre-semestre',
    nombre: 'Cierre de semestre',
    descripcion: 'Lo que siempre se hace corriendo el último día.',
    modulo: 'docencia',
    anclaNombre: 'fecha límite de notas',
    items: [
      { titulo: 'Cuadrar el registro de notas de todos los grupos', offset: -10, duracion: 120, prioridad: 1 },
      { titulo: 'Calificar lo que quede pendiente', offset: -7, duracion: 240, prioridad: 1 },
      { titulo: 'Revisar casos límite y estudiantes en riesgo', offset: -5, duracion: 60, prioridad: 2 },
      { titulo: 'Publicar notas provisionales', offset: -4, prioridad: 1 },
      { titulo: 'Atender reclamos', offset: -2, duracion: 90, prioridad: 1 },
      { titulo: 'Subir notas definitivas al sistema', offset: 0, duracion: 60, prioridad: 1 },
      { titulo: 'Archivar material y exámenes del semestre', offset: 2, duracion: 45, prioridad: 4 },
      { titulo: 'Anotar mejoras para el próximo semestre', offset: 3, duracion: 30, prioridad: 3 },
    ],
  },
  {
    id: 'pl-due-diligence',
    nombre: 'Estudiar una inversión',
    descripcion: 'Antes de poner dinero: la semana de trabajo que evita los arrepentimientos.',
    modulo: 'inversiones',
    anclaNombre: 'día de la decisión',
    items: [
      { titulo: 'Escribir la tesis preliminar en una página', offset: -7, duracion: 45, prioridad: 2 },
      { titulo: 'Leer los dos últimos informes anuales', offset: -6, duracion: 120, prioridad: 2 },
      { titulo: 'Revisar deuda, caja y márgenes', offset: -4, duracion: 60, prioridad: 2 },
      { titulo: 'Comparar valoración con sus pares y con su historia', offset: -3, duracion: 60, prioridad: 2 },
      { titulo: 'Escribir qué invalidaría la tesis', offset: -2, duracion: 30, prioridad: 1 },
      { titulo: 'Definir entrada, stop, objetivo y tamaño', offset: -1, duracion: 30, prioridad: 1 },
      { titulo: 'Decidir: comprar o descartar por escrito', offset: 0, duracion: 20, prioridad: 1 },
      { titulo: 'Revisar la tesis con el primer trimestre publicado', offset: 90, prioridad: 3 },
    ],
  },
  {
    id: 'pl-domingo',
    nombre: 'Semana del servicio',
    descripcion: 'La semana del equipo de alabanza, de atrás hacia adelante.',
    modulo: 'alabanza',
    anclaNombre: 'domingo',
    items: [
      { titulo: 'Elegir el repertorio', offset: -6, duracion: 45, prioridad: 2 },
      { titulo: 'Enviar la lista y las hojas al equipo', offset: -4, prioridad: 1 },
      { titulo: 'Practicar mi parte', offset: -3, duracion: 45, prioridad: 3 },
      { titulo: 'Ensayo del equipo', offset: -2, hora: '19:00', duracion: 120, prioridad: 1 },
      { titulo: 'Confirmar quién falta y cubrir huecos', offset: -1, prioridad: 2 },
      { titulo: 'Llegar para prueba de sonido', offset: 0, hora: '07:00', prioridad: 1 },
      { titulo: 'Anotar qué salió bien y qué no', offset: 0, hora: '13:00', duracion: 15, prioridad: 4 },
    ],
  },
  {
    id: 'pl-viaje',
    nombre: 'Viaje',
    descripcion: 'Papeles, equipaje y lo de casa.',
    modulo: 'personal',
    anclaNombre: 'día de salida',
    items: [
      { titulo: 'Revisar pasaporte, visados y seguro', offset: -30, prioridad: 2 },
      { titulo: 'Reservar transporte y alojamiento', offset: -21, prioridad: 2 },
      { titulo: 'Avisar en el trabajo y dejar cubierto lo urgente', offset: -7, prioridad: 2 },
      { titulo: 'Sacar efectivo y avisar al banco', offset: -3, prioridad: 3 },
      { titulo: 'Hacer la maleta', offset: -1, duracion: 45, prioridad: 2 },
      { titulo: 'Descargar billetes y documentos al móvil', offset: -1, prioridad: 1 },
      { titulo: 'Salida', offset: 0, prioridad: 1 },
      { titulo: 'Deshacer la maleta y pasar gastos', offset: 1, duracion: 30, prioridad: 4 },
    ],
  },
];
