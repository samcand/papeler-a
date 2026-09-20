/**
 * investigacion.js (vista) — El pipeline de artículos, las convocatorias y las
 * tesis dirigidas. La idea es que ningún manuscrito se quede parado sin que
 * nadie se entere.
 */

import { button, el, render, toast } from '../../../src/ui.js';
import { aISO, diferenciaDias, hoy as fechaHoy, textoRelativo } from '../fechas.js';
import { ESTADOS_ARTICULO, estadoArticulo, RUTINA_INVESTIGACION, tareasAlPublicar, tareasDeInvestigacion } from '../plantillas.js';
import { parseRegla } from '../recurrencia.js';
import { dato, listaTareas, tituloVista } from '../componentes.js';
import { store } from '../store.js';

export function vistaInvestigacion(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const datos = () => store.estado.investigacion;
  const guardar = () => { store.guardar(); pintar(); };

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
