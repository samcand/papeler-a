/**
 * tiempo.js — Gestión del tiempo: pomodoro, cronómetro, temporizador,
 * registro de horas y planificación del día por bloques.
 *
 * Todo el estado es un objeto plano y el reloj entra como parámetro (`ahora`),
 * así que se puede probar sin esperar 25 minutos y sobrevive a que el móvil
 * suspenda la pestaña: el tiempo restante se recalcula desde marcas de tiempo
 * reales, nunca contando ticks.
 */

import { aISO, deISO, hoy, inicioSemana, minutosDeHora, sumarDias } from './fechas.js';

export const CONFIG_POMODORO = {
  enfoque: 25,
  descansoCorto: 5,
  descansoLargo: 15,
  cicloLargo: 4,          // cada cuántos enfoques toca descanso largo
  autoDescanso: true,     // encadenar el descanso solo
  autoEnfoque: false,     // volver al trabajo hay que decidirlo
  sonido: true,
};

export const FASES = {
  enfoque: { nombre: 'Enfoque', color: '#4a9eff', mensaje: 'A trabajar en una sola cosa.' },
  descansoCorto: { nombre: 'Descanso', color: '#35c48b', mensaje: 'Levántate y mira lejos.' },
  descansoLargo: { nombre: 'Descanso largo', color: '#a78bfa', mensaje: 'Camina, bebe agua, no revises el móvil.' },
};

/* ------------------------------------------------------------------ *
 * Pomodoro
 * ------------------------------------------------------------------ */

export function crearPomodoro(config = CONFIG_POMODORO, tareaId = null) {
  return {
    fase: 'enfoque',
    ciclo: 1,
    tareaId,
    corriendo: false,
    inicioMs: null,        // cuándo arrancó el tramo actual
    acumuladoMs: 0,        // lo ya consumido antes de la última pausa
    duracionMs: config.enfoque * 60000,
    completados: 0,
  };
}

export function duracionFase(fase, config = CONFIG_POMODORO) {
  const minutos = fase === 'enfoque' ? config.enfoque
    : fase === 'descansoLargo' ? config.descansoLargo
    : config.descansoCorto;
  return minutos * 60000;
}

/** Milisegundos ya transcurridos de la fase actual. */
export function transcurrido(estado, ahora = Date.now()) {
  const enCurso = estado.corriendo && estado.inicioMs ? ahora - estado.inicioMs : 0;
  return Math.max(0, estado.acumuladoMs + enCurso);
}

export function restante(estado, ahora = Date.now()) {
  return Math.max(0, estado.duracionMs - transcurrido(estado, ahora));
}

export function progresoFase(estado, ahora = Date.now()) {
  if (!estado.duracionMs) return 0;
  return Math.min(1, transcurrido(estado, ahora) / estado.duracionMs);
}

export function iniciar(estado, ahora = Date.now()) {
  if (estado.corriendo) return estado;
  return { ...estado, corriendo: true, inicioMs: ahora };
}

export function pausar(estado, ahora = Date.now()) {
  if (!estado.corriendo) return estado;
  return { ...estado, corriendo: false, acumuladoMs: transcurrido(estado, ahora), inicioMs: null };
}

export function reiniciarFase(estado) {
  return { ...estado, corriendo: false, inicioMs: null, acumuladoMs: 0 };
}

/**
 * Pasa a la fase siguiente. Devuelve el estado nuevo y, si acaba de terminar
 * un enfoque, el registro que hay que guardar en el historial de tiempo.
 */
export function siguienteFase(estado, config = CONFIG_POMODORO, ahora = Date.now()) {
  const eraEnfoque = estado.fase === 'enfoque';
  const minutosHechos = Math.round(transcurrido(estado, ahora) / 60000);
  const completados = estado.completados + (eraEnfoque ? 1 : 0);

  let fase;
  let ciclo = estado.ciclo;
  if (eraEnfoque) {
    fase = completados % config.cicloLargo === 0 ? 'descansoLargo' : 'descansoCorto';
  } else {
    fase = 'enfoque';
    ciclo = estado.ciclo + 1;
  }

  const nuevo = {
    ...estado,
    fase,
    ciclo,
    completados,
    duracionMs: duracionFase(fase, config),
    acumuladoMs: 0,
    inicioMs: null,
    corriendo: fase === 'enfoque' ? !!config.autoEnfoque : !!config.autoDescanso,
  };
  if (nuevo.corriendo) nuevo.inicioMs = ahora;

  const registro = eraEnfoque && minutosHechos > 0
    ? { tipo: 'pomodoro', tareaId: estado.tareaId || null, minutos: minutosHechos, fecha: aISO(new Date(ahora)), fin: new Date(ahora).toISOString() }
    : null;

  return { estado: nuevo, registro };
}

/** ¿Terminó la fase? Lo usa el bucle de la interfaz para avisar una sola vez. */
export function termino(estado, ahora = Date.now()) {
  return estado.corriendo && restante(estado, ahora) <= 0;
}

/* ------------------------------------------------------------------ *
 * Cronómetro (cuenta hacia arriba, con vueltas)
 * ------------------------------------------------------------------ */

export function crearCronometro() {
  return { corriendo: false, inicioMs: null, acumuladoMs: 0, vueltas: [] };
}

export function cronoTranscurrido(c, ahora = Date.now()) {
  return c.acumuladoMs + (c.corriendo && c.inicioMs ? ahora - c.inicioMs : 0);
}

export function cronoIniciar(c, ahora = Date.now()) {
  return c.corriendo ? c : { ...c, corriendo: true, inicioMs: ahora };
}

export function cronoPausar(c, ahora = Date.now()) {
  return c.corriendo ? { ...c, corriendo: false, acumuladoMs: cronoTranscurrido(c, ahora), inicioMs: null } : c;
}

export function cronoReiniciar() {
  return crearCronometro();
}

/** Marca una vuelta guardando total y parcial respecto a la anterior. */
export function cronoVuelta(c, ahora = Date.now()) {
  const total = cronoTranscurrido(c, ahora);
  const anterior = c.vueltas.length ? c.vueltas[c.vueltas.length - 1].total : 0;
  return { ...c, vueltas: [...c.vueltas, { n: c.vueltas.length + 1, total, parcial: total - anterior }] };
}

/* ------------------------------------------------------------------ *
 * Temporizador libre (cuenta atrás de N minutos)
 * ------------------------------------------------------------------ */

export function crearTemporizador(minutos = 10, etiqueta = '') {
  return { duracionMs: Math.max(1, minutos) * 60000, corriendo: false, inicioMs: null, acumuladoMs: 0, etiqueta };
}

export const TEMPORIZADORES_RAPIDOS = [
  { minutos: 2, etiqueta: 'Regla de los 2 minutos' },
  { minutos: 5, etiqueta: 'Arrancar sin pensarlo' },
  { minutos: 10, etiqueta: 'Revisar el mercado' },
  { minutos: 15, etiqueta: 'Vaciar la bandeja' },
  { minutos: 45, etiqueta: 'Bloque profundo' },
  { minutos: 90, etiqueta: 'Sesión larga' },
];

/* ------------------------------------------------------------------ *
 * Formato
 * ------------------------------------------------------------------ */

/** 305000 -> "05:05"; más de una hora -> "1:05:05". */
export function formatoReloj(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dd = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dd(m)}:${dd(s)}` : `${dd(m)}:${dd(s)}`;
}

/** 95 -> "1 h 35 min". */
export function formatoMinutos(min) {
  const n = Math.max(0, Math.round(min || 0));
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/* ------------------------------------------------------------------ *
 * Registro de tiempo y estadísticas de enfoque
 * ------------------------------------------------------------------ */

/**
 * Resumen del tiempo trabajado: hoy, esta semana, por tarea y por día,
 * más la racha de días seguidos con al menos un pomodoro.
 */
export function resumenTiempo(registros = [], hoyISO = aISO(hoy())) {
  const porDia = new Map();
  const porTarea = new Map();
  for (const r of registros) {
    porDia.set(r.fecha, (porDia.get(r.fecha) || 0) + r.minutos);
    const clave = r.tareaId || 'sin-tarea';
    porTarea.set(clave, (porTarea.get(clave) || 0) + r.minutos);
  }
  const desdeSemana = aISO(inicioSemana(hoyISO));
  const minutosSemana = registros.filter((r) => r.fecha >= desdeSemana && r.fecha <= hoyISO)
    .reduce((s, r) => s + r.minutos, 0);

  let racha = 0;
  for (let i = 0; i < 400; i++) {
    const dia = aISO(sumarDias(hoyISO, -i));
    if ((porDia.get(dia) || 0) > 0) racha++;
    else if (i > 0) break;
    else break;
  }

  const ultimos = [];
  for (let i = 13; i >= 0; i--) {
    const dia = aISO(sumarDias(hoyISO, -i));
    ultimos.push({ fecha: dia, minutos: porDia.get(dia) || 0 });
  }

  return {
    hoy: porDia.get(hoyISO) || 0,
    semana: minutosSemana,
    total: registros.reduce((s, r) => s + r.minutos, 0),
    pomodorosHoy: registros.filter((r) => r.fecha === hoyISO && r.tipo === 'pomodoro').length,
    racha,
    ultimos,
    porTarea: [...porTarea.entries()].map(([tareaId, minutos]) => ({ tareaId, minutos })).sort((a, b) => b.minutos - a.minutos),
  };
}

/**
 * Informe de dónde se fue el tiempo: por módulo, por proyecto y por semana,
 * comparado con lo que dices que es tu prioridad.
 */
export function informeTiempo(registros = [], tareas = [], hoyISO = aISO(hoy()), opciones = {}) {
  const dias = opciones.dias || 28;
  const desde = aISO(sumarDias(hoyISO, -dias + 1));
  const enRango = registros.filter((r) => r.fecha >= desde && r.fecha <= hoyISO);
  const porTarea = new Map(tareas.map((t) => [t.id, t]));

  const acumula = (clave) => {
    const mapa = new Map();
    for (const r of enRango) {
      const t = porTarea.get(r.tareaId);
      const k = (t && t[clave]) || (clave === 'modulo' ? 'sin-modulo' : 'Sin proyecto');
      mapa.set(k, (mapa.get(k) || 0) + r.minutos);
    }
    return mapa;
  };

  const total = enRango.reduce((s, r) => s + r.minutos, 0);
  const aLista = (mapa) => [...mapa.entries()]
    .map(([clave, minutos]) => ({ clave, minutos, pct: total ? Math.round((minutos / total) * 100) : 0 }))
    .sort((a, b) => b.minutos - a.minutos);

  const semanas = new Map();
  for (const r of enRango) {
    const lunes = aISO(inicioSemana(r.fecha));
    semanas.set(lunes, (semanas.get(lunes) || 0) + r.minutos);
  }

  // Lo que dices que importa: lo que tiene prioridad 1 o 2 y fecha en el rango.
  const comprometido = new Map();
  for (const t of tareas) {
    if (!t.duracion || !t.fecha || t.fecha < desde || t.fecha > hoyISO) continue;
    const k = t.modulo || 'sin-modulo';
    comprometido.set(k, (comprometido.get(k) || 0) + Number(t.duracion));
  }

  const porModulo = aLista(acumula('modulo')).map((x) => ({
    ...x,
    planificado: comprometido.get(x.clave) || 0,
    desvio: x.minutos - (comprometido.get(x.clave) || 0),
  }));

  return {
    desde,
    hasta: hoyISO,
    dias,
    total,
    sesiones: enRango.length,
    mediaDiaria: Math.round(total / dias),
    porModulo,
    porProyecto: aLista(acumula('proyecto')),
    porSemana: [...semanas.entries()].map(([desde, minutos]) => ({ desde, minutos })).sort((a, b) => a.desde.localeCompare(b.desde)),
    sinTarea: enRango.filter((r) => !r.tareaId).reduce((s, r) => s + r.minutos, 0),
  };
}

/* ------------------------------------------------------------------ *
 * Planificar el día por bloques
 * ------------------------------------------------------------------ */

/**
 * Reparte las tareas del día en bloques de agenda a partir de su duración.
 * Respeta la hora fija de las que la tienen y mete descansos cada cierto rato.
 * No es magia: es ver en qué momento el día ya no cabe en el día.
 */
export function planificarDia(tareas = [], opciones = {}) {
  const { inicio = '08:00', fin = '18:00', descansoCada = 90, descanso = 10, duracionPorDefecto = 30 } = opciones;
  let cursor = minutosDeHora(inicio);
  const limite = minutosDeHora(fin);
  const bloques = [];
  let desdeUltimoDescanso = 0;

  const fijas = tareas.filter((t) => t.hora).sort((a, b) => a.hora.localeCompare(b.hora));
  const sueltas = tareas.filter((t) => !t.hora);
  const pendientesFijas = [...fijas];

  const aHora = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  const meter = (tarea, duracion, tipo = 'tarea') => {
    bloques.push({ desde: aHora(cursor), hasta: aHora(cursor + duracion), minutos: duracion, tarea, tipo });
    cursor += duracion;
    // Una reunión también cansa: los bloques fijos cuentan para el descanso.
    if (tipo !== 'descanso') desdeUltimoDescanso += duracion;
  };

  const volcarFijasHasta = (momento) => {
    while (pendientesFijas.length && minutosDeHora(pendientesFijas[0].hora) <= momento) {
      const t = pendientesFijas.shift();
      cursor = Math.max(cursor, minutosDeHora(t.hora));
      meter(t, Number(t.duracion) || duracionPorDefecto, 'fija');
    }
  };

  for (const t of sueltas) {
    const duracion = Number(t.duracion) || duracionPorDefecto;
    volcarFijasHasta(cursor + duracion);
    if (desdeUltimoDescanso >= descansoCada) {
      meter({ titulo: 'Descanso' }, descanso, 'descanso');
      desdeUltimoDescanso = 0;
    }
    if (cursor + duracion > limite) {
      bloques.push({ desde: aHora(cursor), hasta: null, minutos: duracion, tarea: t, tipo: 'nocabe' });
      continue;
    }
    meter(t, duracion);
  }
  volcarFijasHasta(24 * 60);

  const usados = bloques.filter((b) => b.tipo !== 'nocabe').reduce((s, b) => s + b.minutos, 0);
  return {
    bloques,
    minutosPlanificados: usados,
    minutosLibres: Math.max(0, limite - minutosDeHora(inicio) - usados),
    fuera: bloques.filter((b) => b.tipo === 'nocabe').length,
  };
}

/**
 * Matriz de Eisenhower: urgente/importante a partir de la fecha y la prioridad.
 * Sirve para ver de un vistazo cuántas tareas son "urgentes" solo porque se
 * dejaron para el final.
 */
export function matrizEisenhower(tareas = [], hoyISO = aISO(hoy())) {
  const limiteUrgente = aISO(sumarDias(hoyISO, 2));
  const cuadrantes = {
    hacer: { titulo: 'Hacer ya', descripcion: 'Urgente e importante', tareas: [] },
    planificar: { titulo: 'Planificar', descripcion: 'Importante, no urgente', tareas: [] },
    delegar: { titulo: 'Delegar o despachar', descripcion: 'Urgente, poco importante', tareas: [] },
    soltar: { titulo: 'Soltar', descripcion: 'Ni urgente ni importante', tareas: [] },
  };
  for (const t of tareas.filter((x) => !x.completada)) {
    const urgente = !!t.fecha && t.fecha <= limiteUrgente;
    const importante = (t.prioridad || 4) <= 2;
    const clave = urgente && importante ? 'hacer' : !urgente && importante ? 'planificar' : urgente ? 'delegar' : 'soltar';
    cuadrantes[clave].tareas.push(t);
  }
  return cuadrantes;
}
