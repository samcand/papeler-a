/**
 * concentracion.js (vista) — Una sola cosa y un reloj.
 *
 * Sin barra lateral, sin contadores, sin lista. El resto de la app también
 * distrae, y por eso esta pantalla la esconde entera.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import {
  CONFIG_POMODORO, FASES, MOTIVOS_INTERRUPCION, crearPomodoro, formatoReloj, iniciar, pausar,
  progresoFase, registroInterrupcion, reiniciarFase, restante, siguienteFase, termino,
} from '../tiempo.js';
import { avisarPomodoro, mantenerPantalla } from '../notificaciones.js';
import * as ambiente from '../ambiente.js';
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

      panelInterrupciones(tarea),
      panelAmbiente(),

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

  /**
   * Un botón por motivo: apuntar que te cortaron tiene que costar un toque, o
   * no se apunta. Al final de la semana el patrón sale solo en Revisión.
   */
  function panelInterrupciones(tareaActual) {
    const hoyCuenta = (store.estado.interrupciones || []).filter((i) => i.fecha === hoyISO).length;
    return el('div', { style: 'max-width:440px;margin:18px auto 0' },
      el('p', { class: 'muted small' }, `¿Te cortaron? ${hoyCuenta ? `Van ${hoyCuenta} hoy.` : 'Apúntalo.'}`),
      el('div', { class: 'chip-list', style: 'justify-content:center' },
        ...MOTIVOS_INTERRUPCION.map((m) => el('button', {
          class: 'chip', type: 'button', title: m.nombre,
          onClick: () => {
            store.anotarInterrupcion(registroInterrupcion(m.id, tareaActual?.id || null));
            toast(`Apuntado: ${m.nombre.toLowerCase()}`);
            pintar();
          },
        }, `${m.icono} ${m.nombre}`))));
  }

  /** Ruido generado aquí mismo: ni archivos, ni descarga, ni internet. */
  function panelAmbiente() {
    const elegido = ambiente.sonando();
    return el('div', { style: 'max-width:440px;margin:14px auto 0' },
      el('div', { class: 'chip-list', style: 'justify-content:center' },
        ...ambiente.SONIDOS.map((sonido) => el('button', {
          class: `chip ${elegido === sonido.id ? 'activa' : ''}`.trim(),
          type: 'button', title: sonido.descripcion,
          onClick: () => {
            if (ambiente.sonando() === sonido.id) {
              ambiente.parar();
              store.ajustar({ ambiente: { ...(store.estado.ajustes.ambiente || {}), sonido: null } });
            } else {
              const volumen = store.estado.ajustes.ambiente?.volumen ?? 0.3;
              ambiente.reproducir(sonido.id, volumen);
              store.ajustar({ ambiente: { ...(store.estado.ajustes.ambiente || {}), sonido: sonido.id } });
            }
            pintar();
          },
        }, sonido.nombre)),
        elegido ? el('input', {
          type: 'range', min: 0, max: 100, value: String(Math.round((store.estado.ajustes.ambiente?.volumen ?? 0.3) * 100)),
          'aria-label': 'Volumen del sonido ambiente',
          onInput: (e) => {
            const volumen = Number(e.target.value) / 100;
            ambiente.ajustarVolumen(volumen);
            store.ajustar({ ambiente: { ...(store.estado.ajustes.ambiente || {}), volumen } });
          },
        }) : null));
  }

  const alPulsar = (e) => { if (e.key === 'Escape') salir(); };
  document.addEventListener('keydown', alPulsar);

  pintar();

  return () => {
    clearInterval(tick);
    document.removeEventListener('keydown', alPulsar);
    document.body.classList.remove('concentrado');
    ambiente.parar();
    bloqueo?.release?.().catch(() => {});
  };
}
