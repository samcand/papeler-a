/**
 * docencia.js (vista) — El semestre: cursos, horario, evaluaciones y la
 * generación automática de las tareas que se derivan de ellos.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoRelativo, DIAS } from '../fechas.js';
import { avanceSemestre, RUTINA_DOCENCIA, tareasDeCurso, tareasDeSemestre } from '../plantillas.js';
import { parseRegla } from '../recurrencia.js';
import { barra, dato, listaTareas, tituloVista } from '../componentes.js';
import { store } from '../store.js';

export function vistaDocencia(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const sem = () => store.estado.docencia.semestre;
  const guardar = () => { store.guardar(); pintar(); };

  const pintar = () => {
    const avance = avanceSemestre(sem(), hoyISO);
    const tareas = store.tareas.filter((t) => t.modulo === 'docencia' && !t.completada);

    render(host,
      tituloVista('Docencia', sem().nombre || 'Configura tu semestre'),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Semestre'),
        el('div', { class: 'fila' },
          campoTexto('Nombre', sem().nombre || '', (v) => { sem().nombre = v; guardar(); }, 200),
          campoTexto('Inicio', sem().inicio || '', (v) => { sem().inicio = v; guardar(); }, 160, 'date'),
          campoTexto('Fin', sem().fin || '', (v) => { sem().fin = v; guardar(); }, 160, 'date')),
        avance ? el('div', {},
          barra(avance.pct),
          el('p', { class: 'small muted', style: 'margin-top:6px' },
            `Semana ${avance.semanaActual} · ${avance.pct} % recorrido · quedan ${avance.semanasRestantes} semanas.`)) : null),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Cursos'),
        ...sem().cursos.map((curso, i) => tarjetaCurso(curso, i)),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('+ Añadir curso', () => {
            sem().cursos.push({ codigo: '', nombre: 'Curso nuevo', grupos: 1, horario: [], evaluaciones: [] });
            guardar();
          }),
          sem().cursos.length ? button('🔔 Generar todas las tareas del semestre', () => {
            const n = store.sembrarTareas(tareasDeSemestre(sem()), 'semestre');
            toast(n ? `${n} tareas creadas` : 'Ya estaban todas creadas');
            pintar();
          }, { variant: 'primary' }) : null)),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Rutinas de docencia'),
        el('p', { class: 'muted small' }, 'Lo que se repite cada semana y nunca está en ningún sitio.'),
        el('div', { class: 'chip-list' },
          ...RUTINA_DOCENCIA.map((r) => el('span', { class: 'chip' }, `${r.titulo} · ${r.regla}`))),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('Añadir estas rutinas', () => {
            const n = store.sembrarTareas(RUTINA_DOCENCIA.map((r) => ({
              ...r, modulo: 'docencia', regla: parseRegla(r.regla), fecha: hoyISO,
            })), 'rutina-docencia');
            toast(n ? `${n} rutinas añadidas` : 'Ya estaban');
          }))),

      el('section', {},
        el('h2', {}, `Pendiente de docencia (${tareas.length})`),
        listaTareas(tareas, { alCambiar: pintar, hoy: hoyISO, vacio: 'Nada pendiente.', icono: '🎓' })));
  };

  function tarjetaCurso(curso, indice) {
    return el('div', { style: 'border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:12px' },
      el('div', { class: 'fila' },
        campoTexto('Código', curso.codigo || '', (v) => { curso.codigo = v; guardar(); }, 110),
        campoTexto('Nombre', curso.nombre || '', (v) => { curso.nombre = v; guardar(); }, 220),
        campoTexto('Grupos', curso.grupos || 1, (v) => { curso.grupos = Number(v) || 1; guardar(); }, 90, 'number'),
        campoTexto('Entrega de notas', curso.entregaNotas || '', (v) => { curso.entregaNotas = v; guardar(); }, 160, 'date'),
        el('span', { class: 'grow' }),
        button('🗑', () => {
          if (!window.confirm(`¿Borrar ${curso.nombre}?`)) return;
          sem().cursos.splice(indice, 1);
          guardar();
        }, { variant: 'ghost chico danger' })),

      el('p', { class: 'field-label' }, 'Horario'),
      el('div', { class: 'chip-list' },
        ...(curso.horario || []).map((s, j) => el('span', { class: 'chip' },
          `${s.dia}${s.inicio ? ` ${s.inicio}` : ''}${s.aula ? ` · ${s.aula}` : ''}`,
          el('button', { class: 'btn ghost chico', onClick: () => { curso.horario.splice(j, 1); guardar(); } }, '✕'))),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => {
            if (!e.target.value) return;
            curso.horario = [...(curso.horario || []), { dia: e.target.value, inicio: '07:00' }];
            guardar();
          },
        }, el('option', { value: '' }, '+ día'), ...DIAS.slice(1, 7).map((d) => el('option', { value: d }, d)))),

      el('p', { class: 'field-label', style: 'margin-top:8px' }, 'Evaluaciones'),
      el('div', { class: 'tabla-scroll' },
        el('table', { class: 'tabla' },
          el('tbody', {}, ...(curso.evaluaciones || []).map((ev, j) => el('tr', {},
            el('td', {}, el('input', { class: 'input', style: 'width:150px;padding:4px 6px', value: ev.nombre || '', onChange: (e) => { ev.nombre = e.target.value; guardar(); } })),
            el('td', {}, el('input', { class: 'input', style: 'width:140px;padding:4px 6px', type: 'date', value: ev.fecha || '', onChange: (e) => { ev.fecha = e.target.value; guardar(); } })),
            el('td', {}, el('input', { class: 'input', style: 'width:70px;padding:4px 6px', type: 'number', value: ev.peso || '', placeholder: '%', onChange: (e) => { ev.peso = Number(e.target.value); guardar(); } })),
            el('td', {}, el('input', { class: 'input', style: 'width:90px;padding:4px 6px', type: 'number', value: ev.estudiantes || '', placeholder: 'estud.', onChange: (e) => { ev.estudiantes = Number(e.target.value); guardar(); } })),
            el('td', {}, button('🗑', () => { curso.evaluaciones.splice(j, 1); guardar(); }, { variant: 'ghost chico danger' }))))))),
      el('div', { class: 'fila', style: 'margin-top:8px' },
        button('+ Evaluación', () => {
          curso.evaluaciones = [...(curso.evaluaciones || []), { nombre: 'Parcial', fecha: hoyISO, peso: 30 }];
          guardar();
        }, { variant: 'ghost chico' }),
        button('🔔 Generar tareas de este curso', () => {
          const n = store.sembrarTareas(tareasDeCurso(curso), `curso-${curso.nombre}`);
          toast(n ? `${n} tareas creadas` : 'Ya estaban creadas');
        }, { variant: 'ghost chico' })));
  }

  pintar();
  render(root, host);
}

function campoTexto(etiqueta, valor, alCambiar, ancho = 160, tipo = 'text') {
  return el('label', { class: 'field', style: `width:${ancho}px` },
    el('span', { class: 'field-label' }, etiqueta),
    el('input', { class: 'input', type: tipo, value: valor, onChange: (e) => alCambiar(e.target.value) }));
}
