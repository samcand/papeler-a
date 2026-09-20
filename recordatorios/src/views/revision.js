/**
 * revision.js (vista) — La revisión semanal, los hábitos y las estadísticas.
 * Es la media hora del domingo que sostiene el resto de la semana.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, semanaISO, sumarDias, textoLargo } from '../fechas.js';
import { estadisticas, estancadas, MODULOS } from '../modelo.js';
import { alertasCartera } from '../inversiones.js';
import { avanceSemestre, rachaHabito, REVISION_MENSUAL, REVISION_SEMANAL } from '../plantillas.js';
import { barra, dato, grafico, listaTareas, tituloVista } from '../componentes.js';
import { formatoMinutos, resumenTiempo } from '../tiempo.js';
import { store } from '../store.js';
import { avisoTemprano, instantaneaSalud, saludPorProyecto } from '../salud.js';
import { resumenEsperas, tareaDePerseguir } from '../esperas.js';

export function vistaRevision(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const claveSemana = `revision-${semanaISO(hoyISO)}`;

  const pintar = () => {
    const est = estadisticas(store.estado.historial, hoyISO, store.estado.ajustes.metaDiaria);
    const tiempo = resumenTiempo(store.estado.tiempo, hoyISO);
    const marcados = store.estado.ajustes[claveSemana] || [];
    const vencidas = store.tareas.filter((t) => !t.completada && t.fecha && t.fecha < hoyISO);
    const paradas = estancadas(store.tareas, 30, hoyISO);
    const alertas = alertasCartera(store.estado.inversiones.posiciones, store.estado.inversiones.reglas, hoyISO, store.estado.inversiones.efectivo);
    const semestre = avanceSemestre(store.estado.docencia.semestre, hoyISO);
    const variacion = est.semanaPasada ? Math.round(((est.semana - est.semanaPasada) / est.semanaPasada) * 100) : null;

    render(host,
      tituloVista('Revisión', `Semana ${semanaISO(hoyISO)} · ${textoLargo(hoyISO)}`),

      el('div', { class: 'tarjetas' },
        dato(est.semana, 'completadas esta semana',
          { pie: variacion == null ? '' : `${variacion >= 0 ? '+' : ''}${variacion} % frente a la anterior`, clase: variacion >= 0 ? 'positivo' : 'negativo' }),
        dato(est.racha, 'días de racha', { pie: `meta diaria: ${est.meta}` }),
        dato(formatoMinutos(tiempo.semana), 'enfoque esta semana'),
        dato(vencidas.length, 'atrasadas', { clase: vencidas.length ? 'negativo' : 'positivo' })),

      el('section', { class: 'card', style: 'margin-top:14px' },
        el('h2', { class: 'card-title' }, 'Últimos 14 días'),
        grafico(est.ultimos.map((u) => ({ valor: u.total, etiqueta: u.fecha, destacado: u.fecha === hoyISO }))),
        el('div', { class: 'chip-list', style: 'margin-top:12px' },
          ...est.porModulo.map((m) => {
            const info = MODULOS.find((x) => x.id === m.modulo);
            return el('span', { class: 'chip' }, `${info?.icono || '•'} ${info?.nombre || m.modulo}: ${m.total}`);
          }))),

      panelSalud(hoyISO, pintar),
      panelEsperas(hoyISO, pintar),

      chequeo('Revisión semanal', REVISION_SEMANAL, marcados, (i) => {
        const nuevos = marcados.includes(i) ? marcados.filter((x) => x !== i) : [...marcados, i];
        store.ajustar({ [claveSemana]: nuevos });
        pintar();
      }),

      alertas.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `La cartera pide atención (${alertas.length})`),
        ...alertas.slice(0, 5).map((a) => el('div', { class: `alerta ${a.nivel}` },
          el('div', {}, el('div', {}, a.texto), el('div', { class: 'accion' }, a.accion)))),
        el('a', { href: '#/inversiones' }, 'Ver la cartera →')) : null,

      semestre ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Semestre'),
        barra(semestre.pct),
        el('p', { class: 'small muted', style: 'margin-top:6px' },
          `Semana ${semestre.semanaActual} · quedan ${semestre.semanasRestantes} semanas (${semestre.diasRestantes} días).`)) : null,

      paradas.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `Llevan más de un mes abiertas (${paradas.length})`),
        el('p', { class: 'muted small' }, 'Hacer, delegar, agendar o borrar. Arrastrarlas otra semana no es una opción.'),
        listaTareas(paradas.slice(0, 10), { alCambiar: pintar, hoy: hoyISO })) : null,

      panelHabitos(hoyISO, pintar),

      chequeo('Revisión mensual', REVISION_MENSUAL, store.estado.ajustes['revision-mes'] || [], (i) => {
        const actuales = store.estado.ajustes['revision-mes'] || [];
        store.ajustar({ 'revision-mes': actuales.includes(i) ? actuales.filter((x) => x !== i) : [...actuales, i] });
        pintar();
      }));
  };

  pintar();
  render(root, host);
}

/**
 * Salud de cada proyecto con el porqué delante. El número sin explicación no
 * sirve para decidir nada.
 */
function panelSalud(hoyISO, alCambiar) {
  const previas = store.estado.ajustes.saludPrevia?.scores || null;
  const filas = saludPorProyecto(store.tareas, store.estado.proyectos, hoyISO, previas);
  if (!filas.length) return null;
  const avisos = avisoTemprano(filas);

  return el('section', { class: 'card' },
    el('div', { class: 'fila entre' },
      el('h2', { class: 'card-title', style: 'margin:0' }, 'Salud de cada proyecto'),
      button('Guardar foto de hoy', () => {
        store.ajustar({ saludPrevia: instantaneaSalud(filas, hoyISO) });
        toast('Guardada: la semana que viene se compara con esta');
        alCambiar();
      }, { variant: 'ghost chico', title: 'Para poder comparar la semana que viene' })),

    ...avisos.map((a) => el('div', { class: 'alerta medio' },
      el('div', {}, el('div', {}, '⚠ Se está deteriorando'), el('div', { class: 'accion' }, a.texto)))),

    ...filas.map((f) => el('div', { class: `salud-fila ${f.nivel}` },
      el('div', { class: 'fila entre' },
        el('div', {},
          el('b', {}, f.proyecto),
          f.tendencia != null && f.tendencia !== 0
            ? el('span', { class: `small ${f.tendencia > 0 ? 'positivo' : 'negativo'}` }, ` ${f.tendencia > 0 ? '+' : ''}${f.tendencia}`)
            : null),
        el('span', { class: `valor-salud ${f.nivel}` }, String(f.puntuacion))),
      el('div', { class: 'barra' },
        el('div', { style: `width:${f.puntuacion}%;background:${f.nivel === 'bien' ? 'var(--ok)' : f.nivel === 'atención' ? 'var(--warn)' : 'var(--danger)'}` })),
      f.factores.length
        ? el('ul', { class: 'small muted', style: 'margin:6px 0 0' }, ...f.factores.map((x) => el('li', {}, `${x.texto} (−${x.puntos})`)))
        : el('p', { class: 'small muted', style: 'margin:6px 0 0' }, 'Todo al día y moviéndose.'))));
}

/** Lo que está en manos de otros, que no se hace solo por esperar más. */
function panelEsperas(hoyISO, alCambiar) {
  const r = resumenEsperas(store.tareas, hoyISO);
  if (!r.total) return null;
  return el('section', { class: 'card' },
    el('h2', { class: 'card-title' }, `Esperando a otros (${r.total})`),
    el('p', { class: r.vencidas ? 'negativo small' : 'muted small' }, r.frase),
    el('table', { class: 'tabla' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Qué'), el('th', {}, 'Quién'), el('th', { class: 'num' }, 'Esperando'), el('th', {}, ''))),
      el('tbody', {}, ...r.lista.map((e) => el('tr', {},
        el('td', {}, e.tarea.titulo),
        el('td', { class: 'muted' }, e.quien),
        el('td', { class: `num ${e.vencida ? 'negativo' : ''}` },
          `${e.esperando} d${e.vencida ? ` (+${Math.abs(e.margen)})` : ''}`),
        el('td', {}, button('Perseguir', () => {
          store.agregar(tareaDePerseguir(e.tarea, hoyISO));
          store.actualizar(e.tarea.id, { espera: { ...e.tarea.espera, perseguida: hoyISO } });
          toast('Tarea de seguimiento creada');
          alCambiar();
        }, { variant: 'ghost chico' })))))));
}

function chequeo(titulo, items, marcados, alMarcar) {
  return el('section', { class: 'card' },
    el('h2', { class: 'card-title' }, `${titulo} — ${marcados.length}/${items.length}`),
    barra(Math.round((marcados.length / items.length) * 100)),
    el('div', { class: 'lista-chequeo', style: 'margin-top:8px' },
      ...items.map((texto, i) => el('label', {},
        el('input', { type: 'checkbox', checked: marcados.includes(i), onChange: () => alMarcar(i) }),
        el('span', { class: marcados.includes(i) ? 'muted' : '' }, texto)))));
}

function panelHabitos(hoyISO, alCambiar) {
  let nuevo = '';
  const habitos = store.estado.habitos;
  const campo = input('', (v) => { nuevo = v; }, { placeholder: 'Nuevo hábito (ej.: leer 20 min)' });

  return el('section', { class: 'card' },
    el('h2', { class: 'card-title' }, 'Hábitos'),
    habitos.length ? el('table', { class: 'tabla' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'Hábito'), el('th', { class: 'num' }, 'Racha'), el('th', { class: 'num' }, 'Mejor'),
        el('th', { class: 'num' }, 'Total'), el('th', {}, 'Últimos 7 días'), el('th', {}, ''))),
      el('tbody', {}, ...habitos.map((h) => {
        const r = rachaHabito(h.dias, hoyISO);
        const ultimos = Array.from({ length: 7 }, (_, i) => aISO(sumarDias(hoyISO, -(6 - i))));
        return el('tr', {},
          el('td', {}, `${h.icono} ${h.nombre}`),
          el('td', { class: 'num' }, String(r.racha)),
          el('td', { class: 'num' }, String(r.mejor)),
          el('td', { class: 'num' }, String(r.total)),
          el('td', {}, ...ultimos.map((d) => el('span', {
            title: d,
            style: `display:inline-block;width:14px;height:14px;margin-right:3px;border-radius:3px;background:${h.dias.includes(d) ? 'var(--accent-2)' : 'var(--line)'};cursor:pointer`,
            onClick: () => { store.marcarHabito(h.id, d); alCambiar(); },
          }))),
          el('td', {}, button('🗑', () => {
            store.estado.habitos = store.estado.habitos.filter((x) => x.id !== h.id);
            store.guardar();
            alCambiar();
          }, { variant: 'ghost chico danger' })));
      }))) : el('p', { class: 'muted' }, 'Sin hábitos todavía.'),
    el('div', { class: 'fila', style: 'margin-top:10px' },
      campo,
      button('Añadir', () => {
        if (!nuevo.trim()) return;
        store.agregarHabito(nuevo.trim());
        alCambiar();
      })));
}
