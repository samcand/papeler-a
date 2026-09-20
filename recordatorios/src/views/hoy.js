/** hoy.js (vista) — Lo de hoy, lo que se quedó atrás y cómo va el día. */

import { button, el, render } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, sumarDias, textoLargo } from '../fechas.js';
import { cargaDelDia, estadisticas, paraHoy } from '../modelo.js';
import { copyText } from '../../../src/ui.js';
import { rachaHabito } from '../plantillas.js';
import { barra, dato, entradaRapida, listaTareas, tituloVista, vacio } from '../componentes.js';
import { resumenDelDia, textoResumen, tocaResumen } from '../resumen.js';
import { SALIDAS_ZOMBI, alternarTres, proponerTres, tresDelDia, zombis } from '../dia.js';
import { trabajoEnCurso } from '../tablero.js';
import { estadoBandeja } from '../modelo.js';
import { formatoMinutos, resumenTiempo } from '../tiempo.js';
import { NIVELES as NIVELES_ENERGIA, quePuedoHacer, repartoEnergia } from '../energia.js';
import { store } from '../store.js';

export function vistaHoy(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());

  let mostrarResumen = tocaResumen(store.estado.ajustes, hoyISO);
  let hueco = { minutos: 30, energia: 'media', abierto: false };

  /**
   * Tarjeta de "buenos días": el resumen que la notificación no siempre puede
   * dar. Se enseña una vez al día y se cierra al empezar.
   */
  function tarjetaResumen() {
    const r = resumenDelDia(store.estado, hoyISO);
    return el('section', { class: 'card resumen-dia' },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' }, r.titulo),
        el('div', { class: 'fila' },
          button('Copiar', () => copyText(textoResumen(r)), { variant: 'ghost chico' }),
          button('Empezar', () => {
            store.ajustar({ resumenVistoEn: hoyISO });
            mostrarResumen = false;
            pintar();
          }, { variant: 'primary chico' }))),

      el('p', { class: 'small' },
        r.vencidas ? el('b', { class: 'negativo' }, `${r.vencidas} de días anteriores · `) : null,
        `${r.hoy} para hoy`,
        r.carga.minutos ? ` · ${formatoMinutos(r.carga.minutos)} comprometidos` : '',
        r.primera ? ` · lo primero con hora: ${r.primera.hora} ${r.primera.titulo}` : ''),

      r.foco.length ? el('div', {},
        el('p', { class: 'field-label' }, 'Si solo salen tres cosas, que sean estas'),
        el('ol', { class: 'foco' }, ...r.foco.map((t) => el('li', {},
          t.hora ? el('b', {}, `${t.hora} `) : null, t.titulo,
          t.proyecto ? el('span', { class: 'muted small' }, ` · ${t.proyecto}`) : null)))) : null,

      r.avisos.length ? el('div', {},
        el('p', { class: 'field-label' }, 'Ojo con'),
        el('ul', { class: 'small muted' }, ...r.avisos.map((a) => el('li', {}, a)))) : null,

      el('p', { class: 'field-hint' },
        `Ayer: ${r.completadasAyer} completadas y ${formatoMinutos(r.enfoqueAyer)} de enfoque.`,
        r.racha ? ` Racha de ${r.racha} días.` : '',
        r.mañana ? ` Mañana hay ${r.mañana} tareas.` : ''));
  }


  /**
   * "Tengo veinte minutos y la cabeza a medias": cruzar el hueco que tienes con
   * la energía que te queda acierta más que bajar por la lista ordenada.
   */
  function panelEnergia() {
    if (!hueco.abierto) {
      const reparto = repartoEnergia(store.tareas, hoyISO);
      return el('div', { class: 'fila', style: 'margin:10px 0' },
        button('¿Qué puedo hacer ahora?', () => { hueco = { ...hueco, abierto: true }; pintar(); }, { variant: 'ghost chico' }),
        reparto.aviso ? el('span', { class: 'muted small' }, `⚠️ ${reparto.aviso}`) : null);
    }
    const r = quePuedoHacer(store.tareas, { minutos: hueco.minutos, energia: hueco.energia, hoyISO });
    return el('section', { class: 'card' },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' }, '¿Qué puedo hacer ahora?'),
        button('✕', () => { hueco = { ...hueco, abierto: false }; pintar(); }, { variant: 'ghost chico', title: 'Cerrar' })),
      el('div', { class: 'chip-list' },
        ...[10, 20, 30, 60, 120].map((m) => el('button', {
          class: `chip ${hueco.minutos === m ? 'activa' : ''}`.trim(), type: 'button',
          onClick: () => { hueco = { ...hueco, minutos: m }; pintar(); },
        }, `${m} min`))),
      el('div', { class: 'chip-list' },
        ...NIVELES_ENERGIA.map((n) => el('button', {
          class: `chip ${hueco.energia === n.id ? 'activa' : ''}`.trim(), type: 'button', title: n.descripcion,
          onClick: () => { hueco = { ...hueco, energia: n.id }; pintar(); },
        }, `${n.icono} ${n.nombre}`))),
      el('p', { class: 'muted small' }, r.frase),
      r.tareas.length ? listaTareas(r.tareas.map((t) => store.tarea(t.id) || t), { alCambiar: pintar, hoy: hoyISO }) : null);
  }

  const pintar = () => {
    const todas = store.tareas.filter((t) => !t.padre);
    const pendientes = todas.filter((t) => !t.completada);
    const vencidas = pendientes.filter((t) => t.fecha && t.fecha < hoyISO);
    const deHoy = pendientes.filter((t) => t.fecha === hoyISO);
    const hechasHoy = store.tareas.filter((t) => t.completada && String(t.completadaEn || '').slice(0, 10) === hoyISO);
    const carga = cargaDelDia(paraHoy(todas, hoyISO), minutosJornada());
    const est = estadisticas(store.estado.historial, hoyISO, store.estado.ajustes.metaDiaria);
    const tiempo = resumenTiempo(store.estado.tiempo, hoyISO);

    render(host,
      tituloVista('Hoy', textoLargo(hoyISO),
        el('span', { class: 'grow' }),
        !mostrarResumen ? el('button', { class: 'chip', onClick: () => { mostrarResumen = true; pintar(); } }, '☀️ resumen del día') : null),
      mostrarResumen ? tarjetaResumen() : null,
      entradaRapida({ fecha: hoyISO }, pintar),

      el('div', { class: 'tarjetas' },
        dato(deHoy.length + vencidas.length, 'por hacer', { pie: vencidas.length ? `${vencidas.length} atrasadas` : 'al día' }),
        dato(est.hoy, 'completadas hoy', { pie: `meta: ${est.meta}` }),
        dato(formatoMinutos(tiempo.hoy), 'enfoque hoy', { pie: `${tiempo.pomodorosHoy} pomodoros` }),
        dato(carga.excedido ? `${carga.horas} h` : `${carga.horas} h`, 'comprometidas',
          { clase: carga.excedido ? 'negativo' : '', pie: carga.excedido ? 'el día no da para tanto' : `de ${Math.round(carga.disponibles / 60)} h` })),

      panelEnergia(),

      carga.minutos ? el('div', { style: 'margin:12px 0 18px' },
        barra(carga.pct, carga.excedido ? 'var(--danger)' : 'var(--accent-2)'),
        el('p', { class: 'small muted', style: 'margin-top:6px' },
          `${formatoMinutos(carga.minutos)} planificados${carga.sinEstimar ? ` · ${carga.sinEstimar} tarea${carga.sinEstimar === 1 ? '' : 's'} sin estimar` : ''}`,
          ' · ', el('a', { href: '#/planificar' }, 'planificar el día'))) : null,

      vencidas.length ? el('section', { class: 'grupo-dia' },
        el('h3', {},
          el('span', { style: 'color:var(--p1)' }, `Atrasadas (${vencidas.length})`),
          el('span', { class: 'grow' }),
          button('Mover todas a hoy', () => {
            vencidas.forEach((t) => store.aplazar(t.id, hoyISO));
            pintar();
          }, { variant: 'ghost chico' })),
        listaTareas(vencidas, { alCambiar: pintar, hoy: hoyISO, conSubtareas: true })) : null,

      el('section', { class: 'grupo-dia' },
        el('h3', {}, `Hoy (${deHoy.length})`),
        deHoy.length
          ? listaTareas(deHoy, { alCambiar: pintar, hoy: hoyISO, conSubtareas: true })
          : vacio(vencidas.length ? 'Nada más para hoy: primero lo atrasado.' : 'Día limpio. Disfrútalo o adelanta lo de mañana.', '✅')),

      panelWIP(hoyISO),
      panelTres(hoyISO, pintar),
      panelZombis(hoyISO, pintar),
      avisoBandeja(hoyISO),

      habitosDelDia(hoyISO, pintar),

      hechasHoy.length ? el('details', { style: 'margin-top:18px' },
        el('summary', { class: 'muted small' }, `Completadas hoy (${hechasHoy.length})`),
        listaTareas(hechasHoy, { alCambiar: pintar, hoy: hoyISO })) : null);
  };

  function minutosJornada() {
    const { inicio, fin } = store.estado.ajustes.jornada;
    const [hi, mi] = inicio.split(':').map(Number);
    const [hf, mf] = fin.split(':').map(Number);
    return Math.max(60, (hf * 60 + mf) - (hi * 60 + mi));
  }

  pintar();
  render(root, host);
}

/** El trabajo en curso es deuda, no progreso. */
function panelWIP(hoyISO) {
  const limite = store.estado.ajustes.limiteWIP || 5;
  const wip = trabajoEnCurso(store.tareas, hoyISO, limite);
  if (!wip.excedido) return null;
  return el('div', { class: 'alerta medio', style: 'margin-top:12px' },
    el('div', {},
      el('div', {}, `Demasiado abierto a la vez: ${wip.total} contra un límite de ${limite}`),
      el('div', { class: 'accion' }, wip.frase, ' ',
        el('a', { href: '#/tablero' }, 'Verlo en el tablero'), '.')));
}

/**
 * Las tres cosas del día. Elegir tres es el trabajo; la lista completa es solo
 * el inventario.
 */
function panelTres(hoyISO, alCambiar) {
  const estado = tresDelDia(store.estado.ajustes, store.tareas, hoyISO);
  const sugeridas = proponerTres(store.tareas, hoyISO);
  if (!estado.elegidas.length && !sugeridas.length) return null;

  return el('section', { class: `card tres-dia${estado.completo ? ' completo' : ''}` },
    el('div', { class: 'fila entre' },
      el('h2', { class: 'card-title', style: 'margin:0' },
        estado.completo ? '✅ Las tres de hoy, hechas' : `Las tres de hoy · ${estado.hechas}/${estado.elegidas.length || 3}`),
      !estado.elegidas.length && sugeridas.length
        ? button('Elegir por mí', () => {
          store.ajustar({ tresDelDia: { fecha: hoyISO, ids: sugeridas.slice(0, 3).map((t) => t.id) } });
          alCambiar();
        }, { variant: 'ghost chico' })
        : button('Vaciar', () => { store.ajustar({ tresDelDia: { fecha: hoyISO, ids: [] } }); alCambiar(); }, { variant: 'ghost chico' })),

    estado.elegidas.length
      ? el('ol', { class: 'foco' }, ...estado.elegidas.map((t) => el('li', { class: t.completada ? 'muted' : '' },
        el('button', {
          class: 'casilla chica' + (t.completada ? ' marcada' : ''),
          title: t.completada ? 'Reabrir' : 'Completar',
          onClick: () => { store.alternarCompletada(t.id, hoyISO); alCambiar(); },
        }),
        el('span', {}, t.hora ? el('b', {}, `${t.hora} `) : null, t.titulo),
        el('button', {
          class: 'btn ghost chico', title: 'Quitar de las tres',
          onClick: () => { store.ajustar({ tresDelDia: alternarTres(store.estado.ajustes, t.id, hoyISO) }); alCambiar(); },
        }, '✕'))))
      : el('p', { class: 'muted small' },
        'Marca con ☆ tres tareas de la lista, o deja que las elija por ti: lo urgente primero y lo que tiene hora después.'));
}

/** Lo que llevas posponiendo tanto que ya es una decisión tomada. */
function panelZombis(hoyISO, alCambiar) {
  const lista = zombis(store.tareas, hoyISO);
  if (!lista.length) return null;
  const t = lista[0];

  return el('section', { class: 'card', style: 'border-left:3px solid var(--warn)' },
    el('h2', { class: 'card-title' }, 'Llevas posponiendo esto'),
    el('p', {}, el('b', {}, t.titulo), ' ',
      el('span', { class: 'muted small' },
        `· ${t.aplazamientos} aplazamientos${t.diasRodando ? ` · ${t.diasRodando} días dando vueltas` : ''}`)),
    el('p', { class: 'muted small' }, 'Cinco aplazamientos son una decisión tomada sin admitirla. Cuatro salidas honestas:'),
    el('div', { class: 'fila' },
      ...SALIDAS_ZOMBI.map((s) => button(s.texto, () => resolverZombi(s.id, t, hoyISO, alCambiar), { title: s.descripcion, variant: s.id === 'borrar' ? 'ghost danger' : '' }))),
    lista.length > 1 ? el('p', { class: 'muted small', style: 'margin-top:8px' }, `Y ${lista.length - 1} más en la misma situación.`) : null);
}

function resolverZombi(salida, tarea, hoyISO, alCambiar) {
  if (salida === 'hoy') store.actualizar(tarea.id, { fecha: hoyISO, prioridad: 2, aplazamientos: 0 });
  if (salida === 'algunDia') store.actualizar(tarea.id, { fecha: null, aplazamientos: 0 });
  if (salida === 'trocear') {
    store.agregar({ titulo: `Primer paso de: ${tarea.titulo}`, padre: tarea.id, fecha: hoyISO, duracion: 15, proyecto: tarea.proyecto, modulo: tarea.modulo });
    store.actualizar(tarea.id, { aplazamientos: 0 });
    toast('Troceada: empieza por el primer paso');
  }
  if (salida === 'borrar') {
    store.borrar(tarea.id);
    toast('Borrada. Se queda 30 días en la papelera.');
  }
  alCambiar();
}

/** Recordar la bandeja solo cuando de verdad pide atención. */
function avisoBandeja(hoyISO) {
  const b = estadoBandeja(store.tareas, hoyISO);
  if (!b.conviéneVaciar) return null;
  return el('p', { class: 'small muted', style: 'margin-top:14px' },
    `📥 La bandeja tiene ${b.total} cosas sin clasificar`,
    b.masViejo >= 3 ? ` (la más antigua, de hace ${b.masViejo} días)` : '',
    '. ', el('a', { href: '#/bandeja' }, 'Vaciarla'), '.');
}

/** Los hábitos se marcan aquí mismo: un toque, sin abrir nada. */
function habitosDelDia(hoyISO, alCambiar) {
  const habitos = store.estado.habitos;
  if (!habitos.length) return null;
  return el('section', { class: 'card', style: 'margin-top:18px' },
    el('h2', { class: 'card-title' }, 'Hábitos'),
    el('div', { class: 'chip-list' },
      ...habitos.map((h) => {
        const hecho = h.dias.includes(hoyISO);
        const { racha } = rachaHabito(h.dias, hoyISO);
        return el('button', {
          class: `chip ${hecho ? 'activa' : ''}`.trim(),
          onClick: () => { store.marcarHabito(h.id, hoyISO); alCambiar(); },
          title: racha ? `Racha: ${racha} días` : 'Sin racha todavía',
        }, `${h.icono} ${h.nombre}${racha ? ` · ${racha}` : ''}`);
      })));
}
