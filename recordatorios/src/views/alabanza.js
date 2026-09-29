/**
 * alabanza.js (vista) — La semana del equipo, enlazada con la otra app del
 * repositorio (repertorio, hojas por músico y listas de servicio).
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, sumarDias, textoRelativo, textoLargo } from '../fechas.js';
import { RUTINA_ALABANZA, tareasDeServicio } from '../plantillas.js';
import { parseRegla } from '../recurrencia.js';
import { listaTareas, tituloVista } from '../componentes.js';
import { store } from '../store.js';

export function vistaAlabanza(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const datos = () => store.estado.alabanza;
  const guardar = () => { store.guardar(); pintar(); };

  const proximoDomingo = (() => {
    let d = hoyISO;
    for (let i = 0; i < 8; i++) {
      const candidato = aISO(sumarDias(hoyISO, i));
      if (new Date(candidato + 'T12:00:00').getDay() === 0) return candidato;
    }
    return d;
  })();

  const pintar = () => {
    const tareas = store.tareas.filter((t) => t.modulo === 'alabanza' && !t.completada);

    render(host,
      tituloVista('Alabanza', 'La semana del equipo, de atrás hacia adelante'),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Próximo servicio'),
        el('div', { class: 'fila' },
          campo('Domingo', datos().proximo || proximoDomingo, (v) => { datos().proximo = v; guardar(); }, 160, 'date'),
          campo('Hora del servicio', datos().hora || '09:00', (v) => { datos().hora = v; guardar(); }, 140, 'time'),
          campo('Ensayo', datos().horaEnsayo || '19:00', (v) => { datos().horaEnsayo = v; guardar(); }, 140, 'time'),
          campo('Llegada', datos().horaLlegada || '07:00', (v) => { datos().horaLlegada = v; guardar(); }, 140, 'time')),
        el('p', { class: 'muted small' },
          `El domingo es ${textoLargo(datos().proximo || proximoDomingo)} (${textoRelativo(datos().proximo || proximoDomingo)}).`),
        el('div', { class: 'fila' },
          button('🔔 Armar la semana del servicio', () => {
            const n = store.sembrarTareas(tareasDeServicio({
              fecha: datos().proximo || proximoDomingo,
              hora: datos().hora, horaEnsayo: datos().horaEnsayo, horaLlegada: datos().horaLlegada,
            }), 'servicio-' + (datos().proximo || proximoDomingo));
            toast(n ? `${n} tareas creadas` : 'Ya estaban creadas');
            pintar();
          }, { variant: 'primary' }),
          el('a', { class: 'btn', href: store.estado.ajustes.enlaceAlabanza, target: '_blank', rel: 'noopener' }, '🎵 Abrir la app de alabanza'))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Rutinas del equipo'),
        el('div', { class: 'chip-list' }, ...RUTINA_ALABANZA.map((r) => el('span', { class: 'chip' }, `${r.titulo} · ${r.regla}`))),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('Añadir estas rutinas', () => {
            const n = store.sembrarTareas(RUTINA_ALABANZA.map((r) => ({
              ...r, modulo: 'alabanza', regla: parseRegla(r.regla), fecha: hoyISO,
            })), 'rutina-alabanza');
            toast(n ? `${n} rutinas añadidas` : 'Ya estaban');
          }))),

      el('section', {},
        el('h2', {}, `Pendiente del equipo (${tareas.length})`),
        listaTareas(tareas, { alCambiar: pintar, hoy: hoyISO, vacio: 'Nada pendiente.', icono: '🎵' })));
  };

  pintar();
  render(root, host);
}

function campo(etiqueta, valor, alCambiar, ancho = 160, tipo = 'text') {
  return el('label', { class: 'field', style: `width:${ancho}px` },
    el('span', { class: 'field-label' }, etiqueta),
    el('input', { class: 'input', type: tipo, value: valor, onChange: (e) => alCambiar(e.target.value) }));
}
