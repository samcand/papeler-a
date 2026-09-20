/**
 * buscador.js — Encontrar cualquier cosa, escriba lo que escriba.
 *
 * La app guarda ya diez tipos de cosas: tareas, proyectos, notas, fichas de
 * colecciones, personas, objetivos, gastos, viajes, lecturas y planes. Buscar
 * solo entre las tareas era quedarse corto, y acordarse de en qué pantalla vive
 * cada cosa es justo lo que una app no debería pedir.
 *
 * Reglas del orden, que es lo que hace que un buscador se sienta listo:
 *   - lo que **empieza** por lo escrito va antes que lo que solo lo contiene;
 *   - el título pesa más que el cuerpo;
 *   - a igualdad, lo más reciente o lo que tiene fecha más cerca de hoy;
 *   - y las pantallas se pueden abrir escribiendo su nombre, que es lo que uno
 *     intenta antes de buscar el menú.
 */

import { aISO, diferenciaDias, hoy } from './fechas.js';
import { tituloFicha } from './colecciones.js';
import { nombreCategoria } from './gastos.js';

export const TIPOS = [
  { id: 'vista', nombre: 'Ir a', icono: '→' },
  { id: 'tarea', nombre: 'Tareas', icono: '✓' },
  { id: 'proyecto', nombre: 'Proyectos', icono: '#' },
  { id: 'nota', nombre: 'Notas', icono: '📝' },
  { id: 'ficha', nombre: 'Fichas', icono: '🗃️' },
  { id: 'persona', nombre: 'Personas', icono: '🎂' },
  { id: 'objetivo', nombre: 'Objetivos', icono: '🎯' },
  { id: 'gasto', nombre: 'Gastos', icono: '💳' },
  { id: 'viaje', nombre: 'Viajes', icono: '✈️' },
  { id: 'lectura', nombre: 'Lecturas', icono: '📚' },
  { id: 'plan', nombre: 'Planes de proyecto', icono: '📐' },
];

/** Las pantallas, con los nombres por los que uno las busca de verdad. */
export const VISTAS = [
  { ruta: '/hoy', nombre: 'Hoy', alias: 'dia hoy pendientes' },
  { ruta: '/bandeja', nombre: 'Bandeja', alias: 'entrada inbox capturar' },
  { ruta: '/proximos', nombre: 'Próximos', alias: 'siguientes semana' },
  { ruta: '/tablero', nombre: 'Tablero', alias: 'kanban columnas' },
  { ruta: '/calendario', nombre: 'Calendario', alias: 'mes semana agenda' },
  { ruta: '/enfoque', nombre: 'Enfoque', alias: 'pomodoro cronometro temporizador' },
  { ruta: '/planificar', nombre: 'Planificar', alias: 'bloques dia matriz' },
  { ruta: '/revision', nombre: 'Revisión', alias: 'semanal habitos estadisticas equipo' },
  { ruta: '/informes', nombre: 'Informes', alias: 'graficas medir csv' },
  { ruta: '/copiloto', nombre: 'Copiloto', alias: 'preguntas retraso sobrecarga' },
  { ruta: '/inversiones', nombre: 'Inversiones', alias: 'cartera bolsa acciones dividendos' },
  { ruta: '/proyectos', nombre: 'Proyectos (Gantt)', alias: 'gantt ruta critica edt riesgos' },
  { ruta: '/docencia', nombre: 'Docencia', alias: 'clases semestre cursos' },
  { ruta: '/investigacion', nombre: 'Investigación', alias: 'articulos tesis lecturas asesorias' },
  { ruta: '/alabanza', nombre: 'Alabanza', alias: 'servicio domingo musica' },
  { ruta: '/plantillas', nombre: 'Plantillas', alias: 'listas repetidas' },
  { ruta: '/panel', nombre: 'Panel de vida', alias: 'vida resumen todo' },
  { ruta: '/rutinas', nombre: 'Rutinas', alias: 'mañana noche habitos pasos' },
  { ruta: '/notas', nombre: 'Notas y diario', alias: 'segundo cerebro diario escribir' },
  { ruta: '/objetivos', nombre: 'Objetivos', alias: 'metas aprender bucket list' },
  { ruta: '/gastos', nombre: 'Gastos', alias: 'dinero presupuesto recibos' },
  { ruta: '/personas', nombre: 'Personas', alias: 'cumpleaños regalos fechas' },
  { ruta: '/colecciones', nombre: 'Colecciones', alias: 'fichas carro libros cursos mantenimiento' },
  { ruta: '/viajes', nombre: 'Viajes', alias: 'viaje itinerario maleta' },
  { ruta: '/logros', nombre: 'Logros', alias: 'medallas estrellas oro plata bronce rachas' },
  { ruta: '/anio', nombre: 'El año', alias: 'resumen anual cierre de año balance' },
  { ruta: '/ideas', nombre: 'Lo que queda', alias: 'hoja de ruta ideas' },
  { ruta: '/ajustes', nombre: 'Ajustes', alias: 'preferencias respaldo reglas silencio' },
];

function limpia(txt) {
  return String(txt ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Puntuación de una coincidencia. Devuelve 0 cuando no coincide, y cuanto más
 * alto, más arriba sale.
 */
function puntos(consulta, titulo, cuerpo = '') {
  const q = limpia(consulta);
  if (!q) return 0;
  const t = limpia(titulo);
  const c = limpia(cuerpo);
  const palabras = q.split(/\s+/).filter(Boolean);

  // Todas las palabras tienen que estar en algún sitio: buscar "ana regalo" no
  // debe traer todo lo que tenga "ana".
  if (!palabras.every((p) => t.includes(p) || c.includes(p))) return 0;

  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  if (palabras.every((p) => t.includes(p))) return 45;
  if (c.startsWith(q) || c.includes(q)) return 25;
  return 15;
}

/**
 * Busca en todo el estado. Devuelve una lista plana ya ordenada y, aparte,
 * agrupada por tipo para pintarla con sus encabezados.
 */
export function buscarTodo(estado = {}, consulta = '', opciones = {}) {
  const q = String(consulta || '').trim();
  const hoyISO = opciones.hoy || aISO(hoy());
  const limite = opciones.limite ?? 40;
  const salida = [];

  const mete = (tipo, titulo, cuerpo, ruta, extra = {}) => {
    const p = puntos(q, titulo, cuerpo);
    if (!p) return;
    salida.push({ tipo, titulo, ruta, detalle: extra.detalle || '', puntos: p + (extra.bono || 0), fecha: extra.fecha || null });
  };

  for (const v of VISTAS) mete('vista', v.nombre, v.alias, v.ruta, { bono: 10, detalle: 'pantalla' });

  for (const t of (estado.tareas || []).filter((x) => !x.archivada)) {
    mete('tarea', t.titulo, `${t.notas || ''} ${(t.etiquetas || []).join(' ')} ${t.proyecto || ''}`,
      `/buscar/${encodeURIComponent(q)}`, {
        fecha: t.fecha,
        // Lo pendiente y lo que vence pronto interesa más que lo ya cerrado.
        bono: (t.completada ? -20 : 0) + (t.fecha && Math.abs(diferenciaDias(hoyISO, t.fecha)) <= 7 ? 6 : 0),
        detalle: [t.proyecto ? `# ${t.proyecto}` : null, t.fecha, t.completada ? 'hecha' : null].filter(Boolean).join(' · '),
      });
  }

  for (const p of estado.proyectos || []) {
    mete('proyecto', p.nombre, p.modulo || '', `/proyecto/${encodeURIComponent(p.nombre)}`, { detalle: 'lista de tareas' });
  }

  for (const n of estado.notas || []) {
    mete('nota', n.titulo || '(sin título)', `${n.texto || ''} ${(n.etiquetas || []).join(' ')}`, '/notas', {
      fecha: n.fecha,
      detalle: n.tipo === 'diario' ? `diario · ${n.fecha}` : (n.etiquetas || []).map((e) => `@${e}`).join(' '),
    });
  }

  for (const c of estado.colecciones || []) {
    for (const f of (estado.fichas || []).filter((x) => x.coleccion === c.id)) {
      mete('ficha', tituloFicha(c, f), Object.values(f.valores || {}).join(' '), '/colecciones', {
        detalle: `${c.icono || '🗃️'} ${c.nombre}`,
      });
    }
  }

  for (const p of estado.personas || []) {
    mete('persona', p.nombre, `${p.relacion || ''} ${p.notas || ''} ${(p.regalos || []).map((r) => r.que).join(' ')}`,
      '/personas', { detalle: p.relacion || 'persona' });
  }

  for (const o of estado.objetivos || []) {
    mete('objetivo', o.que, o.ambito || '', '/objetivos', {
      bono: (o.logradoEn || o.abandonadoEn) ? -15 : 0,
      detalle: o.logradoEn ? 'logrado' : (o.abandonadoEn ? 'abandonado' : `${o.actual} de ${o.meta}`),
    });
  }

  for (const g of estado.gastos || []) {
    mete('gasto', g.que, nombreCategoria(g.categoria), '/gastos', {
      fecha: g.fecha,
      detalle: `${g.fecha} · ${Number(g.importe).toLocaleString('es')}`,
    });
  }

  for (const v of estado.viajes || []) {
    mete('viaje', v.nombre, `${v.destino || ''} ${v.notas || ''}`, '/viajes', { fecha: v.desde, detalle: `${v.desde} → ${v.hasta}` });
  }

  for (const l of estado.lecturas || []) {
    mete('lectura', l.titulo, `${l.autor || ''} ${l.notas || ''}`, '/investigacion', {
      detalle: l.leidoEn ? `leído el ${l.leidoEn}` : 'por leer',
      bono: l.leidoEn ? -10 : 0,
    });
  }

  for (const p of estado.planes || []) {
    mete('plan', p.nombre, (p.tareas || []).map((t) => t.nombre).join(' '), '/proyectos', { detalle: 'plan con Gantt' });
  }

  salida.sort((a, b) => b.puntos - a.puntos
    || String(a.fecha || '9999').localeCompare(String(b.fecha || '9999'))
    || a.titulo.localeCompare(b.titulo, 'es'));

  const recortada = salida.slice(0, limite);

  // Los grupos van por su mejor resultado, no por un orden fijo de tipos: si lo
  // que mejor encaja es una nota, el grupo de notas va arriba. Así lo que se ve
  // primero es también lo que se elige al pulsar Enter, que si no desconcierta.
  const grupos = TIPOS
    .map((t) => ({ ...t, resultados: recortada.filter((r) => r.tipo === t.id) }))
    .filter((g) => g.resultados.length)
    .sort((a, b) => b.resultados[0].puntos - a.resultados[0].puntos);

  // El orden plano es el orden en que se pintan: flechas y ojo van de la mano.
  const ordenados = grupos.flatMap((g) => g.resultados);

  return {
    consulta: q,
    total: salida.length,
    resultados: ordenados,
    grupos,
    vacio: !recortada.length,
    frase: !q ? 'Escribe para buscar en todo: tareas, notas, fichas, personas, gastos, viajes…'
      : recortada.length
        ? `${salida.length} resultado${salida.length === 1 ? '' : 's'}${salida.length > recortada.length ? `, se enseñan ${recortada.length}` : ''}.`
        : `Nada que se parezca a “${q}”.`,
  };
}
