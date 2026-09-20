/**
 * enfoque.js (vista) — Pomodoro, cronómetro y temporizador.
 *
 * El reloj se dibuja con un arco SVG y se refresca cada segundo, pero el
 * tiempo real sale siempre de marcas de reloj: si el móvil suspende la
 * pestaña o bloqueas la pantalla, al volver la cuenta está bien.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import {
  CONFIG_POMODORO, FASES, crearCronometro, crearPomodoro, crearTemporizador, cronoIniciar, cronoPausar,
  cronoReiniciar, cronoTranscurrido, cronoVuelta, duracionFase, formatoMinutos, formatoReloj, informeTiempo,
  iniciar, pausar, progresoFase, reiniciarFase, restante, resumenTiempo, siguienteFase, termino,
  TEMPORIZADORES_RAPIDOS,
} from '../tiempo.js';
import { avisarPomodoro, mantenerPantalla, pedirPermiso } from '../notificaciones.js';
import { dato, grafico, tituloVista } from '../componentes.js';
import { MODULOS } from '../modelo.js';
import { calibracion } from '../calibracion.js';
import { store } from '../store.js';

export function vistaEnfoque(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let pestana = ctx.query?.tab || 'pomo';
  let config = { ...CONFIG_POMODORO, ...store.estado.pomodoro.config };
  let pomo = crearPomodoro(config, ctx.query?.tarea || null);
  let crono = crearCronometro();
  let tempo = crearTemporizador(10);
  let avisado = false;
  let bloqueoPantalla = null;

  const tick = setInterval(() => {
    if (pomo.corriendo && termino(pomo) && !avisado) {
      avisado = true;
      cerrarFase(true);
      return;
    }
    refrescarRelojes();
  }, 1000);

  /* ---------------- pomodoro ---------------- */

  function cerrarFase(automatico = false) {
    const faseAnterior = pomo.fase;
    const paso = siguienteFase(pomo, config, Date.now());
    if (paso.registro) store.registrarTiempo(paso.registro);
    pomo = paso.estado;
    avisado = false;
    if (automatico) avisarPomodoro(faseAnterior, config);
    pintar();
  }

  async function arrancarPomo() {
    if (!pomo.corriendo) {
      pomo = iniciar(pomo);
      if (store.estado.ajustes.notificaciones) pedirPermiso();
      bloqueoPantalla = bloqueoPantalla || await mantenerPantalla();
    } else {
      pomo = pausar(pomo);
      bloqueoPantalla?.release?.().catch(() => {});
      bloqueoPantalla = null;
    }
    pintar();
  }

  function relojSVG(progreso, color) {
    const radio = 88;
    const circunferencia = 2 * Math.PI * radio;
    const lienzo = svg('svg', { class: 'reloj-svg', viewBox: '0 0 200 200' });
    lienzo.append(
      svg('circle', { class: 'reloj-fondo', cx: 100, cy: 100, r: radio }),
      svg('circle', {
        class: 'reloj-arco', cx: 100, cy: 100, r: radio,
        style: `stroke:${color}`,
        'stroke-dasharray': circunferencia,
        'stroke-dashoffset': circunferencia * (1 - progreso),
        transform: 'rotate(-90 100 100)',
      }));
    return lienzo;
  }

  function panelPomo() {
    const fase = FASES[pomo.fase];
    const tareas = store.tareas.filter((t) => !t.completada);
    const selector = el('select', { class: 'input', style: 'max-width:320px', onChange: (e) => { pomo = { ...pomo, tareaId: e.target.value || null }; } },
      el('option', { value: '' }, '— sin tarea concreta —'),
      ...tareas.map((t) => el('option', { value: t.id, selected: t.id === pomo.tareaId }, t.titulo)));

    return el('div', {},
      el('div', { class: 'reloj-caja' },
        el('div', { class: 'reloj-fase' }, fase.nombre, ' · ', el('span', { class: 'muted' }, fase.mensaje)),
        el('div', { style: 'position:relative;display:grid;place-items:center' },
          relojSVG(progresoFase(pomo), fase.color),
          el('div', { style: 'position:absolute;text-align:center' },
            el('div', { class: 'reloj-texto', id: 'reloj-pomo' }, formatoReloj(restante(pomo))),
            el('div', { class: 'muted small' }, `Ciclo ${pomo.ciclo} · ${pomo.completados} completados`))),
        selector,
        el('div', { class: 'reloj-botones' },
          button(pomo.corriendo ? 'Pausar' : (progresoFase(pomo) > 0 ? 'Seguir' : 'Comenzar'), arrancarPomo, { variant: 'primary grande' }),
          button('Reiniciar', () => { pomo = reiniciarFase(pomo); pintar(); }, { variant: 'ghost' }),
          button('Saltar fase', () => cerrarFase(false), { variant: 'ghost' }))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Duraciones'),
        el('div', { class: 'fila' },
          ...[['enfoque', 'Enfoque'], ['descansoCorto', 'Descanso'], ['descansoLargo', 'Largo'], ['cicloLargo', 'Ciclo largo cada']].map(([campo, etiqueta]) =>
            el('label', { class: 'field', style: 'width:130px' },
              el('span', { class: 'field-label' }, etiqueta),
              el('input', {
                class: 'input', type: 'number', min: 1, max: 180, value: config[campo],
                onChange: (e) => {
                  config = { ...config, [campo]: Number(e.target.value) || config[campo] };
                  store.guardarConfigPomodoro(config);
                  if (!pomo.corriendo) pomo = { ...crearPomodoro(config, pomo.tareaId), completados: pomo.completados, ciclo: pomo.ciclo, fase: pomo.fase, duracionMs: duracionFase(pomo.fase, config) };
                  pintar();
                },
              })))),
        el('div', { class: 'fila' },
          ...[['autoDescanso', 'Encadenar el descanso'], ['autoEnfoque', 'Encadenar el enfoque'], ['sonido', 'Sonido al terminar']].map(([campo, etiqueta]) =>
            el('label', { class: 'chip', style: 'cursor:pointer' },
              el('input', {
                type: 'checkbox', checked: !!config[campo],
                onChange: (e) => { config = { ...config, [campo]: e.target.checked }; store.guardarConfigPomodoro(config); },
              }), etiqueta)))));
  }

  /* ---------------- cronómetro ---------------- */

  function panelCrono() {
    return el('div', {},
      el('div', { class: 'reloj-caja' },
        el('div', { class: 'reloj-texto', id: 'reloj-crono', style: 'font-size:3.2rem' }, formatoReloj(cronoTranscurrido(crono))),
        el('div', { class: 'reloj-botones' },
          button(crono.corriendo ? 'Pausar' : (crono.acumuladoMs ? 'Seguir' : 'Comenzar'),
            () => { crono = crono.corriendo ? cronoPausar(crono) : cronoIniciar(crono); pintar(); }, { variant: 'primary grande' }),
          button('Vuelta', () => { crono = cronoVuelta(crono); pintar(); }, { variant: 'ghost' }),
          button('Poner a cero', () => { crono = cronoReiniciar(); pintar(); }, { variant: 'ghost' }))),
      crono.vueltas.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Vueltas'),
        el('div', { class: 'vueltas' },
          ...[...crono.vueltas].reverse().map((v) => el('div', { class: 'vuelta' },
            el('span', {}, `Vuelta ${v.n}`),
            el('span', {}, formatoReloj(v.parcial)),
            el('span', { class: 'muted' }, formatoReloj(v.total)))))) : null,
      crono.acumuladoMs || crono.corriendo ? el('div', { class: 'fila' },
        button('Guardar como tiempo trabajado', () => {
          const minutos = Math.round(cronoTranscurrido(crono) / 60000);
          if (!minutos) { toast('Todavía no hay minutos que guardar', 'warn'); return; }
          store.registrarTiempo({ tipo: 'cronometro', tareaId: pomo.tareaId, minutos, fecha: hoyISO, fin: new Date().toISOString() });
          crono = cronoReiniciar();
          toast(`${formatoMinutos(minutos)} registrados`);
          pintar();
        })) : null);
  }

  /* ---------------- temporizador ---------------- */

  function panelTempo() {
    const acabado = tempo.corriendo && restante(tempo) <= 0;
    if (acabado) {
      tempo = { ...tempo, corriendo: false, acumuladoMs: tempo.duracionMs };
      avisarPomodoro('enfoque', config);
    }
    return el('div', {},
      el('div', { class: 'reloj-caja' },
        el('div', { class: 'reloj-fase' }, tempo.etiqueta || 'Cuenta atrás'),
        el('div', { class: 'reloj-texto', id: 'reloj-tempo' }, formatoReloj(restante(tempo))),
        el('div', { class: 'reloj-botones' },
          button(tempo.corriendo ? 'Pausar' : 'Comenzar',
            () => { tempo = tempo.corriendo ? pausar(tempo) : iniciar(tempo); pintar(); }, { variant: 'primary grande' }),
          button('Reiniciar', () => { tempo = reiniciarFase(tempo); pintar(); }, { variant: 'ghost' }))),
      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Rápidos'),
        el('div', { class: 'chip-list' },
          ...TEMPORIZADORES_RAPIDOS.map((t) => el('button', {
            class: 'chip', onClick: () => { tempo = crearTemporizador(t.minutos, t.etiqueta); pintar(); },
          }, `${t.minutos} min · ${t.etiqueta}`))),
        el('label', { class: 'field', style: 'max-width:200px;margin-top:10px' },
          el('span', { class: 'field-label' }, 'Otro (minutos)'),
          el('input', { class: 'input', type: 'number', min: 1, value: Math.round(tempo.duracionMs / 60000),
            onChange: (e) => { tempo = crearTemporizador(Number(e.target.value) || 10, ''); pintar(); } }))));
  }

  /* ---------------- estadísticas ---------------- */

  function panelEstadisticas() {
    const r = resumenTiempo(store.estado.tiempo, hoyISO);
    const porTarea = r.porTarea.slice(0, 5).map((x) => ({
      nombre: x.tareaId === 'sin-tarea' ? 'Sin tarea concreta' : (store.tarea(x.tareaId)?.titulo || 'Tarea borrada'),
      minutos: x.minutos,
    }));
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Tu enfoque'),
      el('div', { class: 'tarjetas' },
        dato(formatoMinutos(r.hoy), 'hoy', { pie: `${r.pomodorosHoy} pomodoros` }),
        dato(formatoMinutos(r.semana), 'esta semana'),
        dato(`${r.racha} d`, 'racha con enfoque'),
        dato(formatoMinutos(r.total), 'acumulado')),
      el('div', { style: 'margin-top:14px' },
        grafico(r.ultimos.map((u) => ({ valor: u.minutos, etiqueta: u.fecha, destacado: u.fecha === hoyISO }))),
        el('p', { class: 'small muted' }, 'Últimos 14 días')),
      porTarea.length ? el('table', { class: 'tabla', style: 'margin-top:12px' },
        el('tbody', {}, ...porTarea.map((x) => el('tr', {},
          el('td', {}, x.nombre),
          el('td', { class: 'num' }, formatoMinutos(x.minutos)))))) : null);
  }

  /** A dónde se fue el tiempo, comparado con lo que dijiste que era prioritario. */
  function panelInforme() {
    const r = informeTiempo(store.estado.tiempo, store.todasLasTareas, hoyISO, { dias: 28 });
    if (!r.total) {
      return el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'A dónde se fue el tiempo'),
        el('p', { class: 'muted' }, 'Todavía no hay tiempo medido en los últimos 28 días. Usa el pomodoro sobre tus tareas y vuelve.'));
    }
    const maxSemana = Math.max(...r.porSemana.map((x) => x.minutos), 1);
    const nombreModulo = (id) => MODULOS.find((m) => m.id === id)?.nombre || 'Sin módulo';
    const iconoModulo = (id) => MODULOS.find((m) => m.id === id)?.icono || '•';

    return el('div', {},
      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `A dónde se fue el tiempo (${r.dias} días)`),
        el('div', { class: 'tarjetas' },
          dato(formatoMinutos(r.total), 'medido en total'),
          dato(formatoMinutos(r.mediaDiaria), 'media al día'),
          dato(r.sesiones, 'sesiones'),
          dato(formatoMinutos(r.sinTarea), 'sin tarea concreta', { clase: r.sinTarea > r.total / 3 ? 'negativo' : '' })),

        el('p', { class: 'field-label', style: 'margin-top:14px' }, 'Por módulo, frente a lo que habías planificado'),
        el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Módulo'), el('th', { class: 'num' }, 'Real'),
            el('th', { class: 'num' }, 'Planificado'), el('th', { class: 'num' }, 'Desvío'), el('th', { class: 'num' }, '%'))),
          el('tbody', {}, ...r.porModulo.map((m) => el('tr', {},
            el('td', {}, `${iconoModulo(m.clave)} ${nombreModulo(m.clave)}`),
            el('td', { class: 'num' }, formatoMinutos(m.minutos)),
            el('td', { class: 'num muted' }, m.planificado ? formatoMinutos(m.planificado) : '—'),
            el('td', { class: `num ${m.desvio > 0 ? 'negativo' : 'positivo'}` },
              m.planificado ? `${m.desvio > 0 ? '+' : ''}${formatoMinutos(Math.abs(m.desvio))}` : '—'),
            el('td', { class: 'num muted' }, `${m.pct} %`))))),

        el('p', { class: 'field-label', style: 'margin-top:14px' }, 'Por semana'),
        el('div', { class: 'grafico' },
          ...r.porSemana.map((s2) => el('div', {
            style: `height:${Math.round((s2.minutos / maxSemana) * 100)}%`,
            title: `Semana del ${s2.desde}: ${formatoMinutos(s2.minutos)}`,
          })))),

      r.porProyecto.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Por proyecto'),
        ...r.porProyecto.slice(0, 8).map((x) => el('div', { style: 'margin-bottom:6px' },
          el('div', { class: 'fila entre small' },
            el('span', {}, x.clave),
            el('span', { class: 'muted' }, `${formatoMinutos(x.minutos)} · ${x.pct} %`)),
          el('div', { class: 'barra' }, el('div', { style: `width:${x.pct}%` }))))) : null);
  }

  /** Estimado frente a real: el único modo de aprender a estimar. */
  function panelCalibracion() {
    const cal = calibracion(store.tareas, store.estado.tiempo);
    if (!cal.suficiente) {
      return el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Estimado frente a real'),
        el('p', { class: 'muted small' }, cal.frase),
        el('p', { class: 'muted small' }, 'Se necesitan tres tareas con duración estimada y tiempo medido con el pomodoro o el cronómetro.'));
    }
    const color = cal.sesgo === 'subestimas' ? 'negativo' : cal.sesgo === 'sobrestimas' ? 'muted' : 'positivo';
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Estimado frente a real'),
      el('div', { class: 'tarjetas' },
        dato(`×${cal.factor}`, 'tu factor', { clase: color, pie: `${cal.muestras} tareas medidas` }),
        dato(formatoMinutos(cal.totalEstimado), 'estimaste en total'),
        dato(formatoMinutos(cal.totalReal), 'tardaste de verdad', { clase: color })),
      el('p', { class: 'small', style: 'margin-top:10px' }, cal.frase),

      cal.porModulo.length ? el('div', {},
        el('p', { class: 'field-label' }, 'Por módulo'),
        el('div', { class: 'chip-list' },
          ...cal.porModulo.map((m) => el('span', { class: 'chip', title: `${m.muestras} tareas` },
            `${m.icono} ${m.nombre} ×${m.factor}`)))) : null,

      el('p', { class: 'field-label', style: 'margin-top:12px' }, 'Donde más te desviaste'),
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Tarea'), el('th', { class: 'num' }, 'Estimado'),
          el('th', { class: 'num' }, 'Real'), el('th', { class: 'num' }, 'Factor'))),
        el('tbody', {}, ...cal.peores.map((x) => el('tr', {},
          el('td', {}, x.titulo),
          el('td', { class: 'num muted' }, formatoMinutos(x.estimado)),
          el('td', { class: 'num' }, formatoMinutos(x.real)),
          el('td', { class: `num ${x.ratio > 1 ? 'negativo' : 'positivo'}` }, `×${x.ratio}`))))));
  }

  function refrescarRelojes() {
    const p = document.getElementById('reloj-pomo');
    if (p) p.textContent = formatoReloj(restante(pomo));
    const c = document.getElementById('reloj-crono');
    if (c) c.textContent = formatoReloj(cronoTranscurrido(crono));
    const t = document.getElementById('reloj-tempo');
    if (t) t.textContent = formatoReloj(restante(tempo));
    const arco = document.querySelector('.reloj-arco');
    if (arco && pestana === 'pomo') {
      const circunferencia = 2 * Math.PI * 88;
      arco.setAttribute('stroke-dashoffset', String(circunferencia * (1 - progresoFase(pomo))));
    }
  }

  const pintar = () => {
    render(host,
      tituloVista('Enfoque', 'Trabaja por bloques y deja constancia del tiempo'),
      el('div', { class: 'pestanas' },
        ...[['pomo', 'Pomo'], ['crono', 'Cronómetro'], ['tempo', 'Temporizador'], ['informe', 'Informe']].map(([id, txt]) =>
          el('button', { class: `pestana ${pestana === id ? 'activa' : ''}`.trim(), onClick: () => { pestana = id; pintar(); } }, txt))),
      pestana === 'pomo' ? panelPomo() : pestana === 'crono' ? panelCrono() : pestana === 'tempo' ? panelTempo() : null,
      pestana === 'informe' ? panelInforme() : el('div', {}, panelEstadisticas(), panelCalibracion()));
  };

  pintar();
  render(root, host);

  // Limpieza al cambiar de pantalla: nada de temporizadores fantasma.
  return () => {
    clearInterval(tick);
    bloqueoPantalla?.release?.().catch(() => {});
  };
}

/** `el()` crea nodos HTML; para el SVG hace falta el espacio de nombres. */
function svg(tag, props = {}) {
  const nodo = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(props)) nodo.setAttribute(k, String(v));
  return nodo;
}
