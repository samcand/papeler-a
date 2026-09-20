/** app.js — Router y armazón de la app de recordatorios. */

import { button, el, render as pintar, toast } from '../../src/ui.js';
import { aISO, hoy as fechaHoy } from './fechas.js';
import { aplicarFiltro } from './filtros.js';
import { MODULOS, enBandeja, estaVencida } from './modelo.js';
import { resumenEsperas } from './esperas.js';
import { programarDelDia, programarResumen } from './notificaciones.js';
import { resumenDelDia, textoNotificacion } from './resumen.js';
import { store } from './store.js';
import { entradaRapida } from './componentes.js';
import { panelDeVida } from './panel.js';
import { resumenRutinas } from './rutinas.js';
import { tocaPreparar } from './personas.js';
import { aRevisar } from './objetivos.js';
import { buscarTodo } from './buscador.js';

import { vistaHoy } from './views/hoy.js';
import { vistaBandeja } from './views/bandeja.js';
import { vistaProximos } from './views/proximos.js';
import { vistaTablero } from './views/tablero.js';
import { vistaImportarLista } from './views/importar-lista.js';
import { vistaConcentracion } from './views/concentracion.js';
import { vistaCalendario } from './views/calendario.js';
import { vistaEnfoque } from './views/enfoque.js';
import { vistaPlanificar } from './views/planificar.js';
import { vistaLista, vistaFiltroNuevo } from './views/lista.js';
import { vistaInversiones } from './views/inversiones.js';
import { vistaProyectos } from './views/proyectos.js';
import { vistaDocencia } from './views/docencia.js';
import { vistaInvestigacion } from './views/investigacion.js';
import { vistaAlabanza } from './views/alabanza.js';
import { vistaRevision } from './views/revision.js';
import { vistaPlantillas } from './views/plantillas.js';
import { vistaIdeas } from './views/ideas.js';
import { vistaCopiloto } from './views/copiloto.js';
import { vistaInformes } from './views/informes.js';
import { vistaPanel } from './views/panel.js';
import { vistaNotas } from './views/notas.js';
import { vistaColecciones } from './views/colecciones.js';
import { vistaObjetivos } from './views/objetivos.js';
import { vistaGastos } from './views/gastos.js';
import { vistaPersonas } from './views/personas.js';
import { vistaRutinas } from './views/rutinas.js';
import { vistaViajes } from './views/viajes.js';
import { vistaLogros } from './views/logros.js';
import { vistaAnio } from './views/anio.js';
import { vistaAjustes } from './views/ajustes.js';

const RUTAS = [
  { ruta: /^\/?$/, vista: vistaHoy, nav: 'hoy' },
  { ruta: /^\/hoy$/, vista: vistaHoy, nav: 'hoy' },
  { ruta: /^\/bandeja$/, vista: vistaBandeja, nav: 'bandeja' },
  { ruta: /^\/proximos$/, vista: vistaProximos, nav: 'proximos' },
  { ruta: /^\/tablero$/, vista: vistaTablero, nav: 'tablero' },
  { ruta: /^\/calendario$/, vista: vistaCalendario, nav: 'calendario' },
  { ruta: /^\/concentracion(?:\/([^/]+))?$/, vista: vistaConcentracion, claves: ['id'] },
  { ruta: /^\/enfoque$/, vista: vistaEnfoque, nav: 'enfoque' },
  { ruta: /^\/planificar$/, vista: vistaPlanificar, nav: 'planificar' },
  { ruta: /^\/revision$/, vista: vistaRevision, nav: 'revision' },
  { ruta: /^\/inversiones$/, vista: vistaInversiones, nav: 'inversiones' },
  { ruta: /^\/proyectos$/, vista: vistaProyectos, nav: 'proyectos' },
  { ruta: /^\/docencia$/, vista: vistaDocencia, nav: 'docencia' },
  { ruta: /^\/investigacion$/, vista: vistaInvestigacion, nav: 'investigacion' },
  { ruta: /^\/alabanza$/, vista: vistaAlabanza, nav: 'alabanza' },
  { ruta: /^\/plantillas$/, vista: vistaPlantillas, nav: 'plantillas' },
  { ruta: /^\/importar-lista$/, vista: vistaImportarLista },
  { ruta: /^\/copiloto$/, vista: vistaCopiloto, nav: 'copiloto' },
  { ruta: /^\/informes$/, vista: vistaInformes, nav: 'informes' },
  { ruta: /^\/panel$/, vista: vistaPanel, nav: 'panel' },
  { ruta: /^\/notas$/, vista: vistaNotas, nav: 'notas' },
  { ruta: /^\/colecciones$/, vista: vistaColecciones, nav: 'colecciones' },
  { ruta: /^\/objetivos$/, vista: vistaObjetivos, nav: 'objetivos' },
  { ruta: /^\/gastos$/, vista: vistaGastos, nav: 'gastos' },
  { ruta: /^\/personas$/, vista: vistaPersonas, nav: 'personas' },
  { ruta: /^\/rutinas$/, vista: vistaRutinas, nav: 'rutinas' },
  { ruta: /^\/viajes$/, vista: vistaViajes, nav: 'viajes' },
  { ruta: /^\/logros$/, vista: vistaLogros, nav: 'logros' },
  { ruta: /^\/anio$/, vista: vistaAnio, nav: 'anio' },
  { ruta: /^\/ideas$/, vista: vistaIdeas, nav: 'ideas' },
  { ruta: /^\/ajustes$/, vista: vistaAjustes, nav: 'ajustes' },
  { ruta: /^\/filtro\/nuevo$/, vista: vistaFiltroNuevo },
  { ruta: /^\/(proyecto|filtro|etiqueta|buscar)\/(.+)$/, vista: vistaLista, claves: ['tipo', 'clave'] },
];

let limpiar = null;

function rutaActual() {
  return ((location.hash || '#/').slice(1) || '/').split('?')[0];
}

function consulta() {
  const partes = (location.hash || '').split('?');
  if (partes.length < 2) return {};
  const out = {};
  for (const par of partes.slice(1).join('?').split('&')) {
    const i = par.indexOf('=');
    if (i === -1) out[decodeURIComponent(par)] = '';
    else out[decodeURIComponent(par.slice(0, i))] = decodeURIComponent(par.slice(i + 1));
  }
  return out;
}

function navegar(camino) {
  location.hash = '#' + camino;
}

function dibujar() {
  const raiz = document.getElementById('app');
  const camino = rutaActual();
  limpiar?.();
  limpiar = null;
  // Cambiar de pantalla cierra lo que estuviera abierto encima: como el hash
  // no recarga la página, un panel abierto se quedaba flotando sobre la vista
  // nueva y tapaba lo que hubiera debajo.
  document.querySelectorAll('.drawer').forEach((d) => d.remove());
  pintar(raiz);
  window.scrollTo(0, 0);

  for (const r of RUTAS) {
    const coincide = r.ruta.exec(camino);
    if (!coincide) continue;
    const params = {};
    (r.claves || []).forEach((k, i) => { params[k] = coincide[i + 1]; });
    try {
      limpiar = r.vista(raiz, { navegar, params, query: consulta() }) || null;
    } catch (err) {
      console.error(err);
      pintar(raiz, el('div', { class: 'card' },
        el('h2', {}, 'Algo falló al dibujar esta pantalla'),
        el('pre', { style: 'white-space:pre-wrap;font-size:.8rem' }, String(err?.stack || err))));
    }
    marcarNav(r.nav || camino.split('/')[1]);
    return;
  }
  pintar(raiz, el('div', { class: 'card' },
    el('h2', {}, 'Esta pantalla no existe'),
    el('a', { href: '#/hoy' }, 'Volver a Hoy')));
}

function marcarNav(id) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const activo = a.dataset.nav === id;
    a.classList.toggle('activo', activo);
    // Para un lector de pantalla, "la página en la que estás" es aria-current.
    if (activo) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ------------------------------------------------------------------ *
 * Armazón: barra lateral y barra inferior
 * ------------------------------------------------------------------ */

const PRINCIPAL = [
  { id: 'bandeja', icono: '📥', texto: 'Bandeja', href: '#/bandeja' },
  { id: 'hoy', icono: '📋', texto: 'Hoy', href: '#/hoy' },
  { id: 'proximos', icono: '🗓️', texto: 'Próximos', href: '#/proximos' },
  { id: 'tablero', icono: '🗂️', texto: 'Tablero', href: '#/tablero' },
  { id: 'calendario', icono: '📅', texto: 'Calendario', href: '#/calendario' },
  { id: 'enfoque', icono: '⏱️', texto: 'Enfoque', href: '#/enfoque' },
  { id: 'planificar', icono: '🧭', texto: 'Planificar', href: '#/planificar' },
  { id: 'plantillas', icono: '📋', texto: 'Plantillas', href: '#/plantillas' },
  { id: 'revision', icono: '🔄', texto: 'Revisión', href: '#/revision' },
  { id: 'informes', icono: '📊', texto: 'Informes', href: '#/informes' },
  { id: 'copiloto', icono: '🧮', texto: 'Copiloto', href: '#/copiloto' },
];

const VIDA = [
  { id: 'panel', icono: '🧭', texto: 'Panel de vida', href: '#/panel' },
  { id: 'rutinas', icono: '🌅', texto: 'Rutinas', href: '#/rutinas' },
  { id: 'notas', icono: '📔', texto: 'Notas y diario', href: '#/notas' },
  { id: 'objetivos', icono: '🎯', texto: 'Objetivos', href: '#/objetivos' },
  { id: 'gastos', icono: '💳', texto: 'Gastos', href: '#/gastos' },
  { id: 'personas', icono: '🎂', texto: 'Personas', href: '#/personas' },
  { id: 'colecciones', icono: '🗃️', texto: 'Colecciones', href: '#/colecciones' },
  { id: 'viajes', icono: '✈️', texto: 'Viajes', href: '#/viajes' },
  { id: 'logros', icono: '🏅', texto: 'Logros', href: '#/logros' },
  { id: 'anio', icono: '📅', texto: 'El año', href: '#/anio' },
];

const TRABAJO = [
  { id: 'inversiones', icono: '📈', texto: 'Inversiones', href: '#/inversiones' },
  { id: 'proyectos', icono: '📐', texto: 'Proyectos', href: '#/proyectos' },
  { id: 'docencia', icono: '🎓', texto: 'Docencia', href: '#/docencia' },
  { id: 'investigacion', icono: '🔬', texto: 'Investigación', href: '#/investigacion' },
  { id: 'alabanza', icono: '🎵', texto: 'Alabanza', href: '#/alabanza' },
];

const MOVIL = [
  { id: 'hoy', icono: '📋', texto: 'Hoy', href: '#/hoy' },
  { id: 'tablero', icono: '🗂️', texto: 'Tablero', href: '#/tablero' },
  { id: 'calendario', icono: '📅', texto: 'Calendario', href: '#/calendario' },
  { id: 'enfoque', icono: '⏱️', texto: 'Enfoque', href: '#/enfoque' },
  { id: 'panel', icono: '🧭', texto: 'Vida', href: '#/panel' },
  { id: 'ajustes', icono: '⋯', texto: 'Más', href: '#/ajustes' },
];

function enlace(item, cuenta) {
  return el('a', { class: 'nav-item', href: item.href, dataset: { nav: item.id } },
    el('span', {}, item.icono),
    el('span', { class: 'grow' }, item.texto),
    cuenta ? el('span', { class: `cuenta ${cuenta.urgente ? 'rojo' : ''}`.trim() }, String(cuenta.n)) : null);
}

function montarArmazon() {
  const hoyISO = aISO(fechaHoy());
  const pendientes = store.tareas.filter((t) => !t.completada);
  const cuentaHoy = pendientes.filter((t) => t.fecha && t.fecha <= hoyISO).length;
  const vencidas = pendientes.filter((t) => estaVencida(t, hoyISO)).length;

  const lateral = el('nav', { class: 'lateral', 'aria-label': 'Secciones de la app' },
    el('div', { class: 'marca' }, el('span', {}, '✓'), 'Recordatorios'),
    buscador(),
    ...PRINCIPAL.map((i) => enlace(i, cuentaDeNav(i.id))),
    el('div', { class: 'nav-titulo' }, 'Trabajo'),
    ...TRABAJO.map((i) => enlace(i, cuentaModulo(i.id))),
    el('div', { class: 'nav-titulo' }, 'Vida'),
    ...VIDA.map((i) => enlace(i, cuentaVida(i.id))),
    ...panelFavoritos(),
    el('div', { class: 'nav-titulo' }, 'Filtros'),
    ...store.estado.filtros.map((f) => el('a', {
      class: 'nav-item', href: `#/filtro/${f.id}`, dataset: { nav: f.id },
    }, el('span', {}, f.icono || '🔎'), el('span', { class: 'grow' }, f.nombre),
    el('span', { class: 'cuenta' }, String(aplicarFiltro(f.expresion, store.tareas, { hoy: hoyISO }).length)))),
    el('a', { class: 'nav-item muted', href: '#/filtro/nuevo' }, el('span', {}, '＋'), el('span', {}, 'Filtro nuevo')),
    el('div', { class: 'nav-titulo' }, 'Proyectos'),
    ...store.estado.proyectos.map((p) => el('a', {
      class: 'nav-item', href: `#/proyecto/${encodeURIComponent(p.nombre)}`, dataset: { nav: p.nombre },
    }, el('span', { class: 'punto-modulo', style: `background:${p.color}` }), el('span', { class: 'grow' }, p.nombre),
    el('span', { class: 'cuenta' }, String(pendientes.filter((t) => t.proyecto === p.nombre).length)))),
    el('div', { class: 'nav-titulo' }, ''),
    enlace({ id: 'ideas', icono: '💡', texto: 'Lo que queda', href: '#/ideas' }),
    enlace({ id: 'ajustes', icono: '⚙️', texto: 'Ajustes', href: '#/ajustes' }));

  const inferior = el('nav', { class: 'barra-inferior', 'aria-label': 'Navegación principal' },
    ...MOVIL.map((i) => el('a', { class: 'nav-item', href: i.href, dataset: { nav: i.id } },
      el('span', {}, i.icono), el('span', {}, i.texto))));

  const marco = el('div', { class: 'marco' }, lateral,
    el('main', { class: 'contenido', id: 'app', tabindex: '-1' }));
  document.body.prepend(marco);
  if (!document.querySelector('.saltar')) {
    document.body.prepend(el('a', { class: 'saltar', href: '#app' }, 'Saltar al contenido'));
  }
  document.body.append(inferior);

  function cuentaDeNav(id) {
    if (id === 'hoy') return cuentaHoy ? { n: cuentaHoy, urgente: vencidas > 0 } : null;
    if (id === 'bandeja') {
      const n = enBandeja(store.tareas).length;
      return n ? { n } : null;
    }
    if (id === 'revision') {
      const n = resumenEsperas(store.tareas, hoyISO).vencidas;
      return n ? { n, urgente: true } : null;
    }
    return null;
  }

  /**
   * Las cuentas de la sección Vida: solo lo que pide algo hoy. Un número al
   * lado de cada cosa todo el rato deja de significar nada.
   */
  function cuentaVida(id) {
    if (id === 'panel') {
      const n = avisosDelPanel();
      return n ? { n, urgente: true } : null;
    }
    if (id === 'rutinas') {
      const n = resumenRutinas(store.estado.rutinas, store.estado.rutinasHechas, hoyISO).pendientes;
      return n ? { n } : null;
    }
    if (id === 'personas') {
      const n = tocaPreparar(store.estado.personas, hoyISO).length;
      return n ? { n } : null;
    }
    if (id === 'objetivos') {
      const n = aRevisar(store.estado.objetivos, hoyISO).length;
      return n ? { n } : null;
    }
    return null;
  }

  function avisosDelPanel() {
    try {
      return panelDeVida(store.estado, hoyISO).avisos.filter((a) => a.nivel === 'alto').length;
    } catch {
      return 0;   // el panel nunca debe tumbar la barra lateral
    }
  }

  function cuentaModulo(id) {
    const n = pendientes.filter((t) => t.modulo === id && t.fecha && t.fecha <= hoyISO).length;
    return n ? { n } : null;
  }
}


/**
 * Las vistas fijadas arriba. Cuatro o cinco caben en la cabeza; el resto se
 * busca. Se marcan con la estrella de la cabecera de cada vista.
 */
function panelFavoritos() {
  const rutas = store.estado.ajustes.favoritos || [];
  if (!rutas.length) return [];
  const nombre = (ruta) => {
    const conocido = [...PRINCIPAL, ...TRABAJO].find((i) => i.href === '#' + ruta);
    if (conocido) return { icono: conocido.icono, texto: conocido.texto };
    const trozos = ruta.split('/').filter(Boolean);
    return { icono: '★', texto: decodeURIComponent(trozos[trozos.length - 1] || ruta) };
  };
  return [
    el('div', { class: 'nav-titulo' }, 'Favoritos'),
    ...rutas.map((ruta) => {
      const n = nombre(ruta);
      return el('a', { class: 'nav-item', href: '#' + ruta },
        el('span', {}, n.icono), el('span', { class: 'grow' }, n.texto),
        el('button', {
          class: 'btn ghost chico', title: 'Quitar de favoritos',
          onClick: (e) => { e.preventDefault(); store.alternarFavorito(ruta); refrescarArmazon(); },
        }, '✕'));
    }),
  ];
}

/**
 * Caja de captura sobre cualquier pantalla, con la tecla `n`.
 *
 * Un atajo de verdad global (sobre cualquier ventana del sistema) no está al
 * alcance de una app web: lo más cerca es instalarla y usar el acceso directo
 * "Capturar" del icono, o compartir desde otra app. Dentro de la app, esto sí
 * abre desde donde estés.
 */
function abrirCaptura() {
  if (document.querySelector('.drawer.captura')) return;
  const panel = el('div', { class: 'drawer captura' },
    el('div', {},
      el('div', { class: 'drawer-head' },
        el('h3', {}, 'Capturar'),
        button('✕', () => panel.remove(), { variant: 'ghost' })),
      el('div', { class: 'drawer-body' },
        entradaRapida({}, (t) => {
          toast(`Guardado: ${t.titulo.slice(0, 40)}`);
          dibujar();
        }),
        el('p', { class: 'muted small' },
          'Entra en la bandeja si no le pones fecha. Con Escape se cierra.'))));
  panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { panel.remove(); document.removeEventListener('keydown', esc); }
  });
  document.body.append(panel);
  panel.querySelector('[data-rapida]')?.focus();
}


/* ------------------------------------------------------------------ *
 * Paleta: buscar cualquier cosa y saltar
 * ------------------------------------------------------------------ */

/**
 * Una caja sobre todo lo demás que busca en las diez clases de cosas que la app
 * guarda, y además abre pantallas por su nombre. Se mueve con las flechas y se
 * entra con Enter, porque quien la usa no quiere soltar el teclado.
 */
function abrirPaleta(inicial = '') {
  const abierta = document.querySelector('.paleta');
  if (abierta) { abierta.querySelector('input')?.focus(); return; }

  let elegido = 0;
  let resultados = [];

  const campo = el('input', {
    class: 'input', type: 'search', value: inicial,
    placeholder: 'Buscar en todo… tareas, notas, fichas, personas, gastos, pantallas',
    onInput: () => pintarResultados(),
  });
  const lista = el('div', { class: 'paleta-lista' });
  const pie = el('p', { class: 'muted small' });

  const caja = el('div', { class: 'paleta' },
    el('div', { class: 'paleta-caja' },
      el('div', { class: 'paleta-cabecera' }, campo,
        button('✕', cerrar, { variant: 'ghost chico', title: 'Cerrar' })),
      lista, pie));

  function cerrar() {
    caja.remove();
    document.removeEventListener('keydown', alPulsar, true);
  }

  function ir(r) {
    cerrar();
    // Las tareas no tienen pantalla propia: se abren en la búsqueda de tareas.
    navegar(r.ruta);
  }

  function pintarResultados() {
    const r = buscarTodo(store.estado, campo.value, { limite: 25 });
    resultados = r.resultados;
    elegido = 0;
    pie.textContent = r.frase;
    pintar(lista, ...r.grupos.flatMap((g) => [
      el('div', { class: 'paleta-titulo' }, `${g.icono} ${g.nombre}`),
      ...g.resultados.map((x) => {
        const i = resultados.indexOf(x);
        return el('button', {
          class: `paleta-item ${i === elegido ? 'activo' : ''}`.trim(),
          type: 'button',
          dataset: { i: String(i) },
          onClick: () => ir(x),
        }, el('span', { class: 'grow' }, x.titulo),
        x.detalle ? el('span', { class: 'muted small' }, x.detalle) : null);
      }),
    ]));
  }

  function mover(paso) {
    if (!resultados.length) return;
    elegido = (elegido + paso + resultados.length) % resultados.length;
    lista.querySelectorAll('.paleta-item').forEach((b) => {
      const activo = Number(b.dataset.i) === elegido;
      b.classList.toggle('activo', activo);
      if (activo) b.scrollIntoView({ block: 'nearest' });
    });
  }

  function alPulsar(e) {
    if (!document.body.contains(caja)) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); return; }
    if (e.key === 'Enter' && resultados[elegido]) { e.preventDefault(); ir(resultados[elegido]); }
  }

  caja.addEventListener('click', (e) => { if (e.target === caja) cerrar(); });
  document.addEventListener('keydown', alPulsar, true);
  document.body.append(caja);
  pintarResultados();
  campo.focus();
  campo.select();
}

function buscador() {
  const campo = el('input', {
    class: 'input', type: 'search', placeholder: 'Buscar en todo…  (/)',
    readOnly: true,
    onFocus: () => abrirPaleta(),
    onClick: () => abrirPaleta(),
  });
  campo.id = 'buscador';
  return el('div', { style: 'padding:0 10px 10px' }, campo);
}

/** Vuelve a montar la barra lateral cuando cambian las cuentas. */
function refrescarArmazon() {
  const viejo = document.querySelector('.marco');
  const contenido = document.getElementById('app');
  if (!viejo) return;
  const lateral = viejo.querySelector('.lateral');
  const activo = document.activeElement;
  if (activo && activo.id === 'buscador') return; // no interrumpir la escritura
  lateral?.remove();
  document.querySelector('.barra-inferior')?.remove();
  viejo.remove();
  montarArmazon();
  document.getElementById('app').replaceWith(contenido);
  marcarNav(rutaActual().split('/')[1] || 'hoy');
}

/* ------------------------------------------------------------------ *
 * Atajos de teclado
 * ------------------------------------------------------------------ */

function atajos() {
  document.addEventListener('keydown', (e) => {
    // Buscar y deshacer funcionan siempre, incluso escribiendo en un campo.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      abrirPaleta();
      return;
    }
    // Deshacer funciona siempre, incluso escribiendo en un campo.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (!store.puedeDeshacer) return;
      e.preventDefault();
      const etiqueta = store.deshacer();
      toast(`Deshecho: ${etiqueta}`);
      dibujar();
      return;
    }
    const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (escribiendo) return;
    if (e.key === '/') { e.preventDefault(); abrirPaleta(); return; }
    if (e.key === 'a') { e.preventDefault(); document.querySelector('[data-rapida]')?.focus(); return; }
    if (e.key === 'n') { e.preventDefault(); abrirCaptura(); return; }
    const destinos = { b: '/bandeja', h: '/hoy', p: '/proximos', t: '/tablero', c: '/calendario', e: '/enfoque', i: '/inversiones', g: '/proyectos', r: '/revision', k: '/copiloto', f: '/informes', v: '/panel', d: '/notas' };
    if (e.key === 'z' && store.puedeDeshacer) { e.preventDefault(); const etq = store.deshacer(); toast(`Deshecho: ${etq}`); dibujar(); return; }
    if (destinos[e.key]) { e.preventDefault(); navegar(destinos[e.key]); }
  });
}

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ */

document.documentElement.dataset.theme = store.estado.ajustes.tema || 'dark';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.info('La app funciona igual, pero sin modo offline:', err.message);
    });
  });
}

/**
 * Compartir desde otra app: el navegador nos manda aquí con lo compartido en la
 * URL. Entra en la bandeja, que es donde va lo capturado sin decidir.
 */
function recogerCompartido() {
  const params = new URLSearchParams(location.search);
  const titulo = params.get('title') || params.get('name');
  const texto = params.get('text');
  const url = params.get('url');
  if (!titulo && !texto && !url) return;
  const tarea = store.agregar({
    titulo: (titulo || texto || url || 'Algo compartido').slice(0, 140),
    notas: [texto && texto !== titulo ? texto : null, url].filter(Boolean).join('\n'),
  });
  history.replaceState(null, '', location.pathname);
  location.hash = '#/bandeja';
  toast(`Guardado en la bandeja: ${tarea.titulo.slice(0, 40)}`);
}

window.addEventListener('hashchange', dibujar);
window.addEventListener('DOMContentLoaded', () => {
  montarArmazon();
  atajos();
  recogerCompartido();
  if (new URLSearchParams(location.search).get('capturar') === '1') {
    history.replaceState(null, '', location.pathname);
    setTimeout(abrirCaptura, 50);
  }
  if (!location.hash || location.hash === '#/') location.hash = '#/' + (store.estado.ajustes.vistaInicio || 'hoy');
  dibujar();

  // Las cuentas de la barra lateral se refrescan cuando cambian los datos.
  store.suscribir(() => {
    clearTimeout(window.__refrescoArmazon);
    window.__refrescoArmazon = setTimeout(refrescarArmazon, 120);
  });

  if (store.estado.ajustes.notificaciones) {
    programarDelDia(store.tareas);
    programarResumen(store.estado.ajustes.horaResumen,
      () => textoNotificacion(resumenDelDia(store.estado, aISO(fechaHoy()))));
  }
});
