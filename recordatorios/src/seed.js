/**
 * seed.js — Lo que se ve la primera vez que se abre la app.
 *
 * No son tareas de relleno: son las que de verdad se repiten en la semana de
 * alguien que invierte, da clase, publica y dirige el equipo de alabanza.
 * Se pueden borrar todas desde Ajustes.
 */

import { parseRegla } from './recurrencia.js';

export const PROYECTOS_EJEMPLO = [
  { id: 'p-cartera', nombre: 'Cartera', color: '#35c48b', modulo: 'inversiones', favorito: true },
  { id: 'p-watchlist', nombre: 'Ideas de inversión', color: '#35c48b', modulo: 'inversiones' },
  { id: 'p-circuitos', nombre: 'Circuitos I', color: '#4a9eff', modulo: 'docencia' },
  { id: 'p-papers', nombre: 'Artículos', color: '#a78bfa', modulo: 'investigacion' },
  { id: 'p-domingo', nombre: 'Servicio del domingo', color: '#ff9f43', modulo: 'alabanza' },
  { id: 'p-casa', nombre: 'Personal', color: '#8b93a7', modulo: 'personal' },
];

export const TAREAS_EJEMPLO = [
  {
    titulo: 'Repasar el mercado y mis posiciones',
    modulo: 'inversiones', proyecto: 'Cartera', prioridad: 3, hora: '08:30', duracion: 15,
    regla: parseRegla('cada día hábil'),
    notas: 'Quince minutos. Mirar no es operar.',
    etiquetas: ['rutina'],
  },
  {
    titulo: 'Revisión semanal de la cartera',
    modulo: 'inversiones', proyecto: 'Cartera', prioridad: 2, hora: '18:00', duracion: 45,
    regla: parseRegla('cada domingo'),
    notas: 'Pesos, stops, tesis que envejecen y las alertas que dé la app.',
  },
  {
    titulo: 'Decidir las opciones antes del vencimiento',
    modulo: 'inversiones', proyecto: 'Cartera', prioridad: 1,
    regla: parseRegla('cada tercer viernes'),
    notas: 'Rolar, dejar asignar o cerrar. Decidirlo el miércoles, no el viernes a las 15:55.',
    etiquetas: ['opciones'],
  },
  {
    titulo: 'Aporte mensual y rebalanceo si toca',
    modulo: 'inversiones', proyecto: 'Cartera', prioridad: 2,
    regla: parseRegla('el 1 de cada mes'),
  },
  {
    titulo: 'Preparar clase de Circuitos I',
    modulo: 'docencia', proyecto: 'Circuitos I', prioridad: 2, hora: '18:00', duracion: 60,
    regla: parseRegla('cada lunes'),
    etiquetas: ['clase'],
  },
  {
    titulo: 'Escritura profunda del artículo',
    modulo: 'investigacion', proyecto: 'Artículos', prioridad: 1, hora: '07:00', duracion: 90,
    regla: parseRegla('cada día hábil'),
    notas: 'Sin correo y sin móvil. Noventa minutos seguidos valen más que un día entero picoteando.',
  },
  {
    titulo: 'Elegir el repertorio del domingo',
    modulo: 'alabanza', proyecto: 'Servicio del domingo', prioridad: 2, duracion: 45,
    regla: parseRegla('cada lunes'),
    notas: 'Tonalidades según quién canta. La app de alabanza tiene el historial.',
  },
  {
    titulo: 'Ensayo del equipo',
    modulo: 'alabanza', proyecto: 'Servicio del domingo', prioridad: 1, hora: '19:00', duracion: 120,
    regla: parseRegla('cada viernes'),
  },
  {
    titulo: 'Revisión semanal',
    modulo: 'personal', proyecto: 'Personal', prioridad: 1, hora: '17:00', duracion: 60,
    regla: parseRegla('cada domingo'),
    notas: 'La hora que hace que el resto de la semana funcione.',
  },
];
