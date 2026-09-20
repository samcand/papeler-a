/**
 * lista.js (vista) — Una lista cualquiera: un proyecto, un filtro guardado,
 * una etiqueta o una búsqueda. Todas comparten la misma pantalla.
 */

import { button, copyText, el, input, render, toast } from '../../../src/ui.js';
import { qrSVG } from '../../../src/qr.js';
import { enlaceDeLista } from '../compartir.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import { aplicarFiltro } from '../filtros.js';
import { MODULOS, progreso } from '../modelo.js';
import { entradaRapida, listaTareas, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaLista(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const tipo = ctx.params?.tipo || 'proyecto';
  const clave = decodeURIComponent(ctx.params?.clave || '');
  let mostrarHechas = false;
  let orden = store.estado.ajustes.ordenPorDefecto;

  const pintar = () => {
    const proyecto = store.estado.proyectos.find((p) => p.nombre === clave);
    const filtro = store.estado.filtros.find((f) => f.id === clave || f.nombre === clave);
    let tareas = [];
    let titulo = clave;
    let subtitulo = '';

    if (tipo === 'filtro' && filtro) {
      tareas = aplicarFiltro(filtro.expresion, store.tareas, { hoy: hoyISO });
      titulo = `${filtro.icono || '🔎'} ${filtro.nombre}`;
      subtitulo = filtro.expresion;
    } else if (tipo === 'etiqueta') {
      tareas = store.tareas.filter((t) => (t.etiquetas || []).includes(clave));
      titulo = '@' + clave;
    } else if (tipo === 'buscar') {
      // Si la búsqueda trae operadores, se usa tal cual como filtro; si no, es
      // texto libre. Así "#Cartera & p1" funciona desde la misma caja.
      const conOperadores = /[#@&|!]|p[1-4]\b|módulo:|modulo:|antes de:|después de:|despues de:|\bhoy\b|\bvencidas\b|sin fecha/i.test(clave);
      tareas = aplicarFiltro(conOperadores ? clave : `buscar: ${clave}`, store.tareas, { hoy: hoyISO });
      titulo = `Resultados de “${clave}”`;
      subtitulo = conOperadores ? 'interpretado como filtro' : `${tareas.length} coincidencias en título y notas`;
    } else {
      tareas = store.tareas.filter((t) => t.proyecto === clave);
      titulo = clave;
      subtitulo = proyecto?.modulo ? MODULOS.find((m) => m.id === proyecto.modulo)?.nombre : '';
    }

    const visibles = mostrarHechas ? tareas : tareas.filter((t) => !t.completada);
    const raices = visibles.filter((t) => !t.padre);
    const av = progreso(tareas);

    render(host,
      tituloVista(titulo, subtitulo,
        el('span', { class: 'grow' }),
        el('button', { class: `chip ${mostrarHechas ? 'activa' : ''}`.trim(), onClick: () => { mostrarHechas = !mostrarHechas; pintar(); } }, 'ver hechas'),
        button('📤 Compartir', () => compartir(titulo, visibles.filter((t) => !t.completada)), { variant: 'ghost chico', title: 'Enlace con la lista dentro, sin servidor' }),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { orden = e.target.value; pintar(); },
        },
        ...[['fecha', 'por fecha'], ['prioridad', 'por prioridad'], ['manual', 'manual'], ['alfabetico', 'A–Z']]
          .map(([v, t]) => el('option', { value: v, selected: v === orden }, t)))),

      av.total ? el('p', { class: 'small muted' }, `${av.hechas} de ${av.total} completadas (${av.pct} %)`) : null,
      entradaRapida({ proyecto: tipo === 'proyecto' ? clave : null, modulo: proyecto?.modulo || null }, pintar),
      raices.length
        ? (tipo === 'buscar' ? agrupadoPorProyecto(raices, pintar, hoyISO, orden)
          : tipo === 'proyecto' && (proyecto?.secciones || []).length
            ? porSecciones(raices, proyecto, pintar, hoyISO, orden)
            : listaTareas(raices, { alCambiar: pintar, hoy: hoyISO, orden, conSubtareas: true }))
        : vacio(tipo === 'buscar' ? 'Sin coincidencias. Prueba con menos palabras, o con operadores: #Proyecto, @etiqueta, p1, hoy.' : 'Esta lista está vacía. Escribe arriba para empezar.', '🗒️'),

      tipo === 'proyecto' && proyecto ? barraSecciones(proyecto, pintar) : null,

      tipo === 'proyecto' && proyecto ? el('div', { class: 'fila', style: 'margin-top:20px' },
        button('Borrar proyecto', () => {
          if (!window.confirm(`¿Borrar el proyecto “${clave}”? Las tareas se quedan sin proyecto.`)) return;
          store.borrarProyecto(proyecto.id);
          location.hash = '#/hoy';
        }, { variant: 'ghost danger chico' })) : null,

      tipo === 'filtro' && filtro && !filtro.id.startsWith('f-') ? el('div', { class: 'fila', style: 'margin-top:20px' },
        button('Borrar filtro', () => { store.borrarFiltro(filtro.id); location.hash = '#/hoy'; }, { variant: 'ghost danger chico' })) : null);
  };

  pintar();
  render(root, host);
}

/**
 * Comparte la lista metiéndola comprimida dentro del propio enlace: quien lo
 * abre la importa en su dispositivo y no hay servidor por medio.
 */
async function compartir(nombre, tareas) {
  if (!tareas.length) { toast('No hay nada pendiente que compartir', 'warn'); return; }
  const enlace = await enlaceDeLista(tareas, { nombre });
  const panel = el('div', { class: 'drawer' },
    el('div', {},
      el('div', { class: 'drawer-head' }, el('h3', {}, 'Compartir la lista'),
        button('✕', () => panel.remove(), { variant: 'ghost' })),
      el('div', { class: 'drawer-body' },
        el('p', { class: 'muted small' },
          `${tareas.length} tareas viajan comprimidas dentro del enlace. No se sube nada a ningún sitio.`),
        el('div', { class: 'fila' },
          button('Copiar enlace', () => copyText(enlace), { variant: 'primary' }),
          navigator.share ? button('Compartir…', () => navigator.share({ title: nombre, url: enlace }).catch(() => {})) : null),
        el('p', { class: 'field-label', style: 'margin-top:14px' }, 'O que lo escaneen'),
        (() => {
          try {
            const caja = el('div', { class: 'qr' });
            caja.innerHTML = qrSVG(enlace, { tamaño: 240 });
            return caja;
          } catch {
            return el('p', { class: 'muted small' },
              'El enlace es demasiado largo para un QR legible: mándalo por chat.');
          }
        })(),
        el('p', { class: 'field-hint', style: 'word-break:break-all;margin-top:12px' }, enlace))));
  panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
  document.body.append(panel);
}


/**
 * Secciones: fases dentro de un proyecto sin crear subproyectos que luego hay
 * que mantener. Una tarea sin sección no desaparece: cae en "Sin sección".
 */
function porSecciones(tareas, proyecto, alCambiar, hoyISO, orden) {
  const nombres = proyecto.secciones || [];
  const grupos = [...nombres, null];
  return el('div', {}, ...grupos.map((nombre) => {
    const lista = tareas.filter((t) => (nombre ? t.seccion === nombre : !t.seccion || !nombres.includes(t.seccion)));
    if (!lista.length && !nombre) return null;
    const hechas = lista.filter((t) => t.completada).length;
    return el('section', { class: 'grupo-dia' },
      el('h3', {},
        nombre || 'Sin sección', ' ',
        el('span', { class: 'muted' }, `${lista.length - hechas}`),
        el('span', { class: 'grow' }),
        nombre ? button('✕', () => {
          if (!window.confirm(`¿Quitar la sección “${nombre}”? Sus tareas vuelven al cuerpo del proyecto.`)) return;
          store.borrarSeccion(proyecto.nombre, nombre);
          alCambiar();
        }, { variant: 'ghost chico', title: 'Quitar la sección' }) : null),
      lista.length
        ? listaTareas(lista, { alCambiar, hoy: hoyISO, orden, conSubtareas: true })
        : el('p', { class: 'muted small' }, 'Vacía. Asigna tareas a esta sección desde el panel de la tarea.'));
  }).filter(Boolean));
}

/** Crear secciones desde la propia lista, sin ir a ajustes. */
function barraSecciones(proyecto, alCambiar) {
  let nombre = '';
  const campo = input('', (v) => { nombre = v; }, { placeholder: 'Sección nueva: Campo, Análisis, Redacción…' });
  const crear = () => {
    if (!nombre.trim()) return;
    store.agregarSeccion(proyecto.nombre, nombre.trim());
    alCambiar();
  };
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); crear(); } });
  return el('div', { class: 'fila', style: 'margin-top:14px' },
    campo, button('Añadir sección', crear, { variant: 'ghost chico' }));
}

/** Los resultados de una búsqueda se leen mejor agrupados por proyecto. */
function agrupadoPorProyecto(tareas, alCambiar, hoyISO, orden) {
  const grupos = new Map();
  for (const t of tareas) {
    const clave = t.proyecto || 'Sin proyecto';
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(t);
  }
  return el('div', {}, ...[...grupos.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([nombre, lista]) => el('section', { class: 'grupo-dia' },
      el('h3', {}, nombre, ' ', el('span', { class: 'muted' }, `${lista.length}`)),
      listaTareas(lista, { alCambiar, hoy: hoyISO, orden }))));
}

/** Pantalla para crear un filtro nuevo con ayuda del lenguaje de filtros. */
export function vistaFiltroNuevo(root) {
  const host = el('div', {});
  let nombre = '';
  let expresion = 'hoy | vencidas';

  const pintar = () => {
    const resultado = (() => {
      try { return aplicarFiltro(expresion, store.tareas, { hoy: aISO(fechaHoy()) }); }
      catch { return []; }
    })();

    render(host,
      tituloVista('Filtro nuevo', 'Guarda una búsqueda que uses cada semana'),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Nombre'),
        input(nombre, (v) => { nombre = v; })),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Expresión'),
        input(expresion, (v) => { expresion = v; pintar(); })),
      el('div', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Cómo se escribe'),
        el('ul', { class: 'small muted' },
          el('li', {}, '`hoy`, `vencidas`, `7 días`, `sin fecha`, `pendientes`, `completadas`, `repetidas`'),
          el('li', {}, '`p1`…`p4` · `#Proyecto` · `@etiqueta` · `módulo:inversiones`'),
          el('li', {}, '`buscar: texto` · `antes de: 15 de octubre` · `después de: mañana`'),
          el('li', {}, 'Se combinan con `&` (y), `|` (o), `!` (no) y paréntesis.'))),
      el('p', { class: 'muted small' }, `${resultado.length} tareas coinciden ahora mismo:`),
      listaTareas(resultado.slice(0, 15), { alCambiar: pintar }),
      el('div', { class: 'fila', style: 'margin-top:14px' },
        button('Guardar filtro', () => {
          if (!nombre.trim()) { toast('Ponle un nombre', 'warn'); return; }
          const f = store.agregarFiltro(nombre.trim(), expresion);
          location.hash = `#/filtro/${f.id}`;
        }, { variant: 'primary' })));
  };

  pintar();
  render(root, host);
}
