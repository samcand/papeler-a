/**
 * investigacion.js (vista) — El pipeline de artículos, las convocatorias y las
 * tesis dirigidas. La idea es que ningún manuscrito se quede parado sin que
 * nadie se entere.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, diferenciaDias, hoy as fechaHoy, textoRelativo } from '../fechas.js';
import { ESTADOS_ARTICULO, estadoArticulo, RUTINA_INVESTIGACION, tareasAlPublicar, tareasDeInvestigacion } from '../plantillas.js';
import { parseRegla } from '../recurrencia.js';
import { dato, listaTareas, tituloVista, vacio } from '../componentes.js';
import { TIPOS_LECTURA, colaDeLectura, horasPorEstudiante, lecturaNueva, queLeerEn } from '../trabajo.js';
import { formatoMinutos } from '../tiempo.js';
import { store } from '../store.js';

export function vistaInvestigacion(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const datos = () => store.estado.investigacion;
  const guardar = () => { store.guardar(); pintar(); };


  /**
   * Horas de asesoría por estudiante. Sale del tiempo ya medido: una tarea
   * cuenta para un estudiante si lo menciona en el título o lleva su etiqueta.
   * Sirve para la memoria anual y, sobre todo, para ver a quién le has dado
   * tres horas y a quién ninguna.
   */
  function panelAsesorias() {
    const r = horasPorEstudiante(datos().tesis, store.tareas, store.estado.tiempo, hoyISO);
    if (!r.filas.length) return null;
    const maximo = Math.max(1, ...r.filas.map((f) => f.minutos));
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Horas de asesoría'),
      el('p', { class: 'muted small' }, r.frase),
      ...r.filas.map((f) => el('div', { class: 'salud-fila' },
        el('span', { style: 'min-width:150px' }, f.estudiante),
        el('div', { class: 'barra', style: 'flex:1' },
          el('div', { style: `width:${Math.round((f.minutos / maximo) * 100)}%` })),
        el('span', { class: 'muted small', style: 'min-width:110px;text-align:right' },
          `${f.horas} h · ${f.sesiones} sesión(es)`))),
      el('p', { class: 'muted small' },
        'Solo cuenta el tiempo medido con el pomodoro o el cronómetro sobre tareas que mencionan al estudiante.'));
  }

  /**
   * Los artículos por leer son una cola con prioridad, no una carpeta de
   * descargas con 300 PDF. Lo que lleva más de tres meses sube solo: o se lee o
   * se borra, pero deja de fingir que está pendiente.
   */
  function panelLecturas() {
    const lecturas = store.estado.lecturas || [];
    const r = colaDeLectura(lecturas, hoyISO);
    const [hueco] = queLeerEn(lecturas, 30, hoyISO);
    let nueva = '';

    const campo = input('', (v) => { nueva = v; }, { placeholder: 'Título o referencia del artículo…' });
    const agregar = () => {
      if (!nueva.trim()) return;
      store.agregarEn('lecturas', lecturaNueva({ titulo: nueva.trim() }));
      nueva = '';
      pintar();
    };
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } });

    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Cola de lectura'),
      el('p', { class: 'muted small' }, r.frase),
      el('div', { class: 'fila' }, campo, button('Añadir', agregar, { variant: 'primary' })),

      hueco ? el('p', { class: 'small' },
        `Con media hora libre: “${hueco.titulo}” (${formatoMinutos(hueco.minutosEfectivos)}).`) : null,

      !r.cola.length ? vacio('Nada por leer. Cosas peores hay.', '📚') : null,

      ...r.cola.map((l) => el('div', { class: `salud-fila ${l.dias >= 90 ? 'vieja' : ''}`.trim() },
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { store.actualizarEn('lecturas', l.id, { tipo: e.target.value }); pintar(); },
        }, ...TIPOS_LECTURA.map((t) => el('option', { value: t.id, selected: t.id === l.tipo }, `${t.icono} ${t.nombre}`))),
        input(l.titulo, (v) => store.actualizarEn('lecturas', l.id, { titulo: v })),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { store.actualizarEn('lecturas', l.id, { prioridad: Number(e.target.value) }); pintar(); },
        }, ...[1, 2, 3, 4].map((n) => el('option', { value: String(n), selected: n === l.prioridad }, `P${n}`))),
        el('span', { class: 'muted small', style: 'min-width:110px' },
          `${formatoMinutos(l.minutosEfectivos)} · ${l.dias} d`),
        button('Leído', () => { store.actualizarEn('lecturas', l.id, { leidoEn: hoyISO }); pintar(); }, { variant: 'ghost chico' }),
        button('✕', () => { store.borrarEn('lecturas', l.id); pintar(); }, { variant: 'ghost chico danger', title: 'Quitar de la cola' }))),

      r.leidas ? el('p', { class: 'muted small' }, `${r.leidas} leídas y archivadas.`) : null);
  }

  const pintar = () => {
    const arts = datos().articulos;
    const publicados = arts.filter((a) => a.estado === 'publicado').length;
    const enRevision = arts.filter((a) => ['enviado', 'en-revision', 'revision-menor', 'revision-mayor'].includes(a.estado)).length;
    const tareas = store.tareas.filter((t) => t.modulo === 'investigacion' && !t.completada);

    render(host,
      tituloVista('Investigación', 'Artículos, convocatorias y tesis'),

      el('div', { class: 'tarjetas' },
        dato(arts.length, 'artículos en marcha'),
        dato(enRevision, 'en manos de revistas'),
        dato(publicados, 'publicados'),
        dato(datos().tesis.length, 'tesis dirigidas')),

      el('section', { class: 'card', style: 'margin-top:14px' },
        el('h2', { class: 'card-title' }, 'Artículos'),
        ...arts.map((art, i) => {
          const estado = estadoArticulo(art.estado);
          const dias = art.desde ? diferenciaDias(art.desde, hoyISO) : null;
          const alerta = estado.diasAviso && dias != null && dias >= estado.diasAviso;
          return el('div', { style: `border-left:3px solid ${alerta ? 'var(--danger)' : 'var(--line)'};padding-left:10px;margin-bottom:14px` },
            el('div', { class: 'fila' },
              el('input', { class: 'input', style: 'max-width:320px', value: art.titulo || '', onChange: (e) => { art.titulo = e.target.value; guardar(); } }),
              el('select', {
                class: 'input', style: 'width:auto',
                onChange: (e) => {
                  const nuevo = e.target.value;
                  const pasaAPublicado = nuevo === 'publicado' && art.estado !== 'publicado';
                  art.estado = nuevo;
                  art.desde = hoyISO;
                  guardar();
                  // Lo que se olvida siempre: el CV, el repositorio y contarlo.
                  if (pasaAPublicado && window.confirm('¿Creo las tareas de después de publicar (CV, repositorio, perfil y difusión)?')) {
                    const n = store.sembrarTareas(tareasAlPublicar(art, hoyISO), `publicado-${art.titulo}`);
                    toast(n ? `${n} tareas creadas` : 'Ya estaban creadas');
                    pintar();
                  }
                },
              }, ...ESTADOS_ARTICULO.map((x) => el('option', { value: x.id, selected: x.id === art.estado }, x.nombre))),
              el('input', { class: 'input', style: 'width:150px', placeholder: 'Revista', value: art.revista || '', onChange: (e) => { art.revista = e.target.value; guardar(); } }),
              el('input', { class: 'input', style: 'width:150px', type: 'date', value: art.deadline || '', onChange: (e) => { art.deadline = e.target.value; guardar(); } }),
              button('🗑', () => { datos().articulos.splice(i, 1); guardar(); }, { variant: 'ghost chico danger' })),
            el('p', { class: 'small muted', style: 'margin:4px 0 0' },
              `${estado.siguiente}${dias != null ? ` · ${dias} días en este estado` : ''}${art.deadline ? ` · entrega ${textoRelativo(art.deadline)}` : ''}`));
        }),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('+ Añadir artículo', () => {
            datos().articulos.push({ titulo: 'Artículo nuevo', estado: 'idea', desde: hoyISO });
            guardar();
          }),
          button('🔔 Generar tareas', () => {
            const n = store.sembrarTareas(tareasDeInvestigacion(datos(), hoyISO), 'investigacion');
            toast(n ? `${n} tareas creadas` : 'Ya estaban creadas');
            pintar();
          }, { variant: 'primary' }))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Convocatorias y fechas límite'),
        el('table', { class: 'tabla' },
          el('tbody', {}, ...datos().convocatorias.map((c, i) => el('tr', {},
            el('td', {}, el('input', { class: 'input', style: 'padding:4px 6px', value: c.nombre || '', onChange: (e) => { c.nombre = e.target.value; guardar(); } })),
            el('td', {}, el('input', { class: 'input', style: 'width:150px;padding:4px 6px', type: 'date', value: c.cierra || '', onChange: (e) => { c.cierra = e.target.value; guardar(); } })),
            el('td', { class: 'muted small' }, c.cierra ? textoRelativo(c.cierra) : ''),
            el('td', {}, button('🗑', () => { datos().convocatorias.splice(i, 1); guardar(); }, { variant: 'ghost chico danger' })))))),
        button('+ Añadir convocatoria', () => { datos().convocatorias.push({ nombre: '', cierra: hoyISO }); guardar(); }, { variant: 'ghost chico' })),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Tesis dirigidas'),
        el('table', { class: 'tabla' },
          el('tbody', {}, ...datos().tesis.map((t, i) => el('tr', {},
            el('td', {}, el('input', { class: 'input', style: 'padding:4px 6px', placeholder: 'Estudiante', value: t.estudiante || '', onChange: (e) => { t.estudiante = e.target.value; guardar(); } })),
            el('td', {}, el('input', { class: 'input', style: 'padding:4px 6px', placeholder: 'Tema', value: t.titulo || '', onChange: (e) => { t.titulo = e.target.value; guardar(); } })),
            el('td', {}, el('input', { class: 'input', style: 'width:150px;padding:4px 6px', placeholder: 'cada 2 semanas', value: t.frecuencia || '', onChange: (e) => { t.frecuencia = e.target.value; guardar(); } })),
            el('td', {}, button('🗑', () => { datos().tesis.splice(i, 1); guardar(); }, { variant: 'ghost chico danger' })))))),
        button('+ Añadir tesis', () => { datos().tesis.push({ estudiante: '', frecuencia: 'cada 2 semanas' }); guardar(); }, { variant: 'ghost chico' })),

      panelAsesorias(),
      panelLecturas(),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Rutinas de investigación'),
        el('div', { class: 'chip-list' }, ...RUTINA_INVESTIGACION.map((r) => el('span', { class: 'chip' }, `${r.titulo} · ${r.regla}`))),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('Añadir estas rutinas', () => {
            const n = store.sembrarTareas(RUTINA_INVESTIGACION.map((r) => ({
              ...r, modulo: 'investigacion', regla: parseRegla(r.regla), fecha: hoyISO,
            })), 'rutina-investigacion');
            toast(n ? `${n} rutinas añadidas` : 'Ya estaban');
          }))),

      el('section', {},
        el('h2', {}, `Pendiente (${tareas.length})`),
        listaTareas(tareas, { alCambiar: pintar, hoy: hoyISO, vacio: 'Nada pendiente.', icono: '🔬' })));
  };

  pintar();
  render(root, host);
}
