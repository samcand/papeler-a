/**
 * concentracion.js (vista) — Una sola cosa y un reloj.
 *
 * Sin barra lateral, sin contadores, sin lista. El resto de la app también
 * distrae, y por eso esta pantalla la esconde entera.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import {
  CONFIG_POMODORO, FASES, crearPomodoro, formatoReloj, iniciar, pausar, progresoFase,
  reiniciarFase, restante, siguienteFase, termino,
} from '../tiempo.js';
import { avisarPomodoro, mantenerPantalla } from '../notificaciones.js';
import { store } from '../store.js';

export function vistaConcentracion(root, ctx = {}) {
  const hoyISO = aISO(fechaHoy());
  const tareaId = ctx.params?.id || ctx.query?.tarea || null;
  const tarea = tareaId ? store.tarea(tareaId) : null;
  const config = { ...CONFIG_POMODORO, ...store.estado.pomodoro.config };
  let pomo = crearPomodoro(config, tareaId);
  let bloqueo = null;
  let avisado = false;

  document.body.classList.add('concentrado');

  const tick = setInterval(() => {
    if (pomo.corriendo && termino(pomo) && !avisado) {
      avisado = true;
      const anterior = pomo.fase;
      const paso = siguienteFase(pomo, config, Date.now());
      if (paso.registro) store.registrarTiempo(paso.registro);
      pomo = paso.estado;
      avisarPomodoro(anterior, config);
      avisado = false;
      pintar();
      return;
    }
    const reloj = document.getElementById('reloj-concentracion');
    if (reloj) reloj.textContent = formatoReloj(restante(pomo));
    const aro = document.querySelector('.aro-progreso');
    if (aro) aro.style.setProperty('--avance', `${Math.round(progresoFase(pomo) * 100)}%`);
  }, 1000);

  const pintar = () => {
    const fase = FASES[pomo.fase];
    const subtareas = tarea ? store.tareas.filter((t) => t.padre === tarea.id) : [];

    render(root, el('div', { class: 'concentracion' },
      el('div', { class: 'fila entre' },
        el('span', { class: 'muted small' }, fase.nombre),
        el('a', { class: 'btn ghost', href: tarea ? '#/hoy' : '#/enfoque', onClick: salir }, 'Salir  ·  Esc')),

      el('h1', { class: 'concentracion-titulo' }, tarea ? tarea.titulo : 'Una sola cosa'),
      tarea?.proyecto ? el('p', { class: 'muted' }, `# ${tarea.proyecto}`) : null,

      el('div', { class: 'aro-progreso', style: `--avance:${Math.round(progresoFase(pomo) * 100)}%` },
        el('div', { class: 'reloj-texto', id: 'reloj-concentracion' }, formatoReloj(restante(pomo)))),

      el('p', { class: 'muted' }, fase.mensaje),

      el('div', { class: 'reloj-botones' },
        button(pomo.corriendo ? 'Pausar' : (progresoFase(pomo) > 0 ? 'Seguir' : 'Comenzar'), async () => {
          if (!pomo.corriendo) {
            pomo = iniciar(pomo);
            bloqueo = bloqueo || await mantenerPantalla();
          } else pomo = pausar(pomo);
          pintar();
        }, { variant: 'primary grande' }),
        button('Reiniciar', () => { pomo = reiniciarFase(pomo); pintar(); }, { variant: 'ghost' }),
        tarea && !tarea.completada ? button('✅ Hecha', () => {
          store.alternarCompletada(tarea.id, hoyISO);
          toast('Hecha');
          salir();
        }, { variant: 'ok' }) : null),

      tarea?.notas ? el('p', { class: 'concentracion-notas' }, tarea.notas) : null,

      subtareas.length ? el('div', { class: 'lista-chequeo', style: 'max-width:440px;margin:0 auto' },
        ...subtareas.map((s) => el('label', {},
          el('input', {
            type: 'checkbox', checked: !!s.completada,
            onChange: () => { store.alternarCompletada(s.id, hoyISO); pintar(); },
          }),
          el('span', { class: s.completada ? 'muted' : '' }, s.titulo)))) : null));
  };

  function salir() {
    location.hash = tarea ? '#/hoy' : '#/enfoque';
  }

  const alPulsar = (e) => { if (e.key === 'Escape') salir(); };
  document.addEventListener('keydown', alPulsar);

  pintar();

  return () => {
    clearInterval(tick);
    document.removeEventListener('keydown', alPulsar);
    document.body.classList.remove('concentrado');
    bloqueo?.release?.().catch(() => {});
  };
}
