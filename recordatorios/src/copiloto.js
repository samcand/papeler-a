/**
 * copiloto.js — Preguntas del plan respondidas con cálculo, no con lenguaje.
 *
 * No hay modelo, no hay red y no hay nada que salga del dispositivo: cada
 * respuesta sale de los mismos módulos que pintan las vistas (ruta crítica,
 * holgura, capacidad, historial, riesgos). Si un dato no está, la respuesta lo
 * dice en vez de rellenarlo.
 *
 * El emparejado de la pregunta escrita es por palabras clave, no por
 * comprensión: cuando ninguna encaja lo bastante, se ofrece la lista en lugar
 * de adivinar.
 */

import { aISO, diferenciaDias, hoy, sumarDias } from './fechas.js';
import { estancadas } from './modelo.js';
import { zombis } from './dia.js';
import { resumenEsperas } from './esperas.js';
import { capacidadSemanas, resumenCapacidad } from './capacidad.js';
import { alcanceQueCrece, riesgosVivos } from './riesgos.js';
import {
  cargaRecursos, casiCriticas, desviaciones, margenHitos,
  problemasDePlan, programar,
} from './proyectos.js';

/** Los planes del estado, ya programados, con su proyecto al lado. */
function planes(estado) {
  return (estado.planes || []).map((proyecto) => ({ proyecto, plan: programar(proyecto) }));
}

const vacio = (id, pregunta, frase) => ({ id, pregunta, frase, filas: [], vacio: true });

/* ------------------------------------------------------------------ *
 * Las preguntas
 * ------------------------------------------------------------------ */

/**
 * Cada pregunta es una función pura del estado. `claves` es lo que se compara
 * con lo que escribes; `pregunta` es cómo se enuncia en la lista.
 */
export const PREGUNTAS = [
  {
    id: 'retrasos',
    pregunta: '¿Qué se va a retrasar?',
    claves: ['retrasar', 'retraso', 'tarde', 'llega', 'fecha', 'incumplir', 'atrasado'],
    responder(estado, { hoyISO = aISO(hoy()) } = {}) {
      const filas = [];
      for (const { proyecto, plan } of planes(estado)) {
        for (const p of problemasDePlan(plan, proyecto)) {
          if (p.tipo === 'objetivo' || p.tipo === 'imposible') {
            filas.push({ texto: `${proyecto.nombre}: ${p.texto}`, detalle: p.accion });
          }
        }
        for (const t of casiCriticas(plan, 2)) {
          filas.push({
            texto: `${proyecto.nombre}: “${t.nombre}” tiene ${t.holgura} día(s) de holgura.`,
            detalle: 'Un resbalón y entra en la ruta crítica.',
          });
        }
      }
      const vencidas = (estado.tareas || []).filter((t) => !t.completada && t.fecha && t.fecha < hoyISO);
      if (vencidas.length) {
        filas.push({
          texto: `${vencidas.length} tarea(s) de la agenda ya pasaron de fecha.`,
          detalle: vencidas.slice(0, 3).map((t) => t.titulo).join(' · '),
        });
      }
      if (!filas.length) {
        return vacio('retrasos', this.pregunta, 'Nada apunta a retraso con los datos de hoy.');
      }
      return { id: 'retrasos', pregunta: this.pregunta, frase: `${filas.length} señal(es) de retraso.`, filas, vacio: false };
    },
  },
  {
    id: 'mover',
    pregunta: '¿Qué puedo mover sin tocar la entrega?',
    claves: ['mover', 'aplazar', 'holgura', 'margen', 'colchon', 'entrega', 'sin tocar'],
    responder(estado) {
      const filas = [];
      for (const { proyecto, plan } of planes(estado)) {
        const flexibles = plan.tareas
          .filter((t) => !t.resumen && !t.critica && t.holgura > 0)
          .sort((a, b) => b.holgura - a.holgura)
          .slice(0, 5);
        for (const t of flexibles) {
          filas.push({
            texto: `${proyecto.nombre}: “${t.nombre}” aguanta ${t.holgura} día(s).`,
            detalle: `${t.inicio} → ${t.fin}${t.recurso ? ` · ${t.recurso}` : ''}`,
          });
        }
      }
      if (!filas.length) {
        return vacio('mover', this.pregunta, 'No hay holgura: o todo es crítico, o todavía no hay ningún plan.');
      }
      return {
        id: 'mover', pregunta: this.pregunta,
        frase: 'Estas se pueden retrasar sin mover el final del proyecto.',
        filas, vacio: false,
      };
    },
  },
  {
    id: 'sobrecarga',
    pregunta: '¿Quién está sobrecargado?',
    claves: ['sobrecarga', 'sobrecargado', 'recurso', 'quien', 'carga', 'saturado', 'capacidad'],
    responder(estado, { hoyISO = aISO(hoy()) } = {}) {
      const filas = [];
      for (const { proyecto, plan } of planes(estado)) {
        for (const r of cargaRecursos(plan)) {
          if (!r.sobreasignado) continue;
          filas.push({
            texto: `${r.recurso} está en dos sitios a la vez ${r.diasSobreasignados.length} día(s) en “${proyecto.nombre}”.`,
            detalle: `Pico del ${r.picoCarga}% sobre ${r.tareas} tarea(s).`,
          });
        }
      }
      const mia = resumenCapacidad(estado.tareas || [], estado.ajustes || {}, hoyISO);
      if (mia.semana.pct > 100 || mia.semana.imposibles) {
        filas.push({
          texto: `Tú mismo: ${mia.semana.pct}% de la semana comprometido`
            + `${mia.semana.imposibles ? `, con ${mia.semana.imposibles} día(s) que no caben` : ''}.`,
          detalle: mia.frase || '',
        });
      }
      if (!filas.length) {
        return vacio('sobrecarga', this.pregunta, 'Nadie pasa del 100% en los planes, y tus días caben.');
      }
      return { id: 'sobrecarga', pregunta: this.pregunta, frase: 'Donde hay más de lo que cabe:', filas, vacio: false };
    },
  },
  {
    id: 'cambios',
    pregunta: '¿Qué cambió esta semana?',
    claves: ['cambio', 'cambiado', 'semana', 'paso', 'movio', 'nuevo', 'creci'],
    responder(estado, { hoyISO = aISO(hoy()) } = {}) {
      const desde = aISO(sumarDias(hoyISO, -6));
      const cerradas = (estado.historial || []).filter((h) => h.fecha >= desde && h.fecha <= hoyISO);
      const creadas = (estado.tareas || []).filter((t) => String(t.creadaEn).slice(0, 10) >= desde);
      const filas = [
        { texto: `Cerradas: ${cerradas.length}`, detalle: cerradas.slice(0, 3).map((h) => h.titulo).join(' · ') },
        { texto: `Creadas: ${creadas.length}`, detalle: creadas.slice(0, 3).map((t) => t.titulo).join(' · ') },
      ];
      for (const { proyecto, plan } of planes(estado)) {
        if (!proyecto.lineaBase) continue;
        const crecimiento = alcanceQueCrece(plan, proyecto.lineaBase, proyecto.calendario);
        if (crecimiento.hayBase && crecimiento.diasTotales) {
          filas.push({ texto: `${proyecto.nombre}: ${crecimiento.frase}`, detalle: '' });
        }
        const desv = desviaciones(plan, proyecto.lineaBase, proyecto.calendario).filter((d) => !d.nueva && d.desvioFin !== 0);
        if (desv.length) {
          filas.push({
            texto: `${proyecto.nombre}: ${desv.length} tarea(s) se movieron respecto a la línea base.`,
            detalle: desv.slice(0, 3).map((d) => `${d.nombre} ${d.desvioFin > 0 ? '+' : ''}${d.desvioFin}d`).join(' · '),
          });
        }
      }
      return { id: 'cambios', pregunta: this.pregunta, frase: `Del ${desde} al ${hoyISO}:`, filas, vacio: false };
    },
  },
  {
    id: 'explota',
    pregunta: '¿Qué me va a explotar?',
    claves: ['explotar', 'riesgo', 'problema', 'peligro', 'bloqueado', 'esperando', 'atascado'],
    responder(estado, { hoyISO = aISO(hoy()) } = {}) {
      const filas = [];
      const vivos = riesgosVivos(estado.riesgos || [], hoyISO).filter((r) => r.nivel === 'alto' || r.tocaRevisar);
      for (const r of vivos.slice(0, 5)) {
        filas.push({
          texto: `Riesgo ${r.nivel}: ${r.que}${r.proyecto ? ` (${r.proyecto})` : ''}`,
          detalle: r.tocaRevisar ? 'Toca revisarlo.' : (r.disparador || r.plan || ''),
        });
      }
      const esp = resumenEsperas(estado.tareas || [], hoyISO);
      if (esp.vencidas) {
        filas.push({ texto: `${esp.vencidas} espera(s) pasadas de plazo.`, detalle: 'Nadie te va a recordar que te deben algo.' });
      }
      const zs = zombis(estado.tareas || [], hoyISO);
      if (zs.length) {
        filas.push({ texto: `${zs.length} tarea(s) aplazadas cinco veces o más.`, detalle: zs.slice(0, 3).map((t) => t.titulo).join(' · ') });
      }
      const viejas = estancadas(estado.tareas || [], 45, hoyISO).filter((t) => !t.completada);
      if (viejas.length) {
        filas.push({ texto: `${viejas.length} tarea(s) llevan más de 45 días abiertas.`, detalle: '¿Siguen siendo verdad?' });
      }
      if (!filas.length) return vacio('explota', this.pregunta, 'Ningún riesgo vivo ni nada atascado.');
      return { id: 'explota', pregunta: this.pregunta, frase: 'Lo que vigilaría:', filas, vacio: false };
    },
  },
  {
    id: 'semana',
    pregunta: '¿Cómo viene la semana?',
    claves: ['viene', 'proxima', 'carga semana', 'cabe', 'agenda', 'libre'],
    responder(estado, { hoyISO = aISO(hoy()) } = {}) {
      const semanas = capacidadSemanas(estado.tareas || [], hoyISO, 3, estado.ajustes || {}, hoyISO);
      const filas = semanas.map((s) => ({
        texto: `Semana ${s.numero} (${s.desde}): ${s.pct}% de la jornada comprometida.`,
        detalle: s.imposibles ? `${s.imposibles} día(s) no caben.` : `${Math.round(s.libres / 60)} h libres.`,
      }));
      const hitos = [];
      for (const { proyecto, plan } of planes(estado)) {
        for (const h of margenHitos(plan)) {
          if (h.fecha >= hoyISO && diferenciaDias(hoyISO, h.fecha) <= 21) {
            hitos.push({ texto: `${proyecto.nombre} · ${h.texto}`, detalle: `Vence el ${h.fecha}.` });
          }
        }
      }
      return {
        id: 'semana', pregunta: this.pregunta,
        frase: 'Las próximas tres semanas y los hitos a la vista:',
        filas: [...filas, ...hitos], vacio: false,
      };
    },
  },
];

/* ------------------------------------------------------------------ *
 * Emparejar lo escrito con una pregunta
 * ------------------------------------------------------------------ */

function limpia(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca la pregunta que más se parece a lo escrito. Devuelve `null` cuando
 * ninguna llega al mínimo: es preferible decir "esto no lo sé calcular" a
 * responder otra cosa.
 */
export function buscarPregunta(texto) {
  const t = limpia(texto);
  if (!t.trim()) return null;
  let mejor = null;
  for (const p of PREGUNTAS) {
    let puntos = 0;
    for (const clave of p.claves) if (t.includes(limpia(clave))) puntos++;
    if (limpia(p.pregunta).includes(t) && t.length > 4) puntos += 2;
    if (puntos && (!mejor || puntos > mejor.puntos)) mejor = { pregunta: p, puntos };
  }
  return mejor ? mejor.pregunta : null;
}

/** Responde una pregunta por id. */
export function responder(id, estado = {}, opciones = {}) {
  const p = PREGUNTAS.find((x) => x.id === id);
  if (!p) return null;
  return p.responder(estado, opciones);
}

/**
 * Responde a lo escrito. Cuando no se entiende, se devuelve `entendida: false`
 * con la lista de lo que sí se sabe calcular.
 */
export function preguntar(texto, estado = {}, opciones = {}) {
  const p = buscarPregunta(texto);
  if (!p) {
    return {
      entendida: false,
      frase: 'Esa no la sé calcular. Esto es lo que sí sé responder con tus datos:',
      opciones: PREGUNTAS.map((x) => ({ id: x.id, pregunta: x.pregunta })),
    };
  }
  return { entendida: true, ...p.responder(estado, opciones) };
}

/** Todas las respuestas de golpe: el informe que se manda al equipo. */
export function informeCompleto(estado = {}, opciones = {}) {
  return PREGUNTAS.map((p) => p.responder(estado, opciones));
}
