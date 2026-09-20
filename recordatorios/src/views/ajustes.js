/**
 * ajustes.js (vista) — Preferencias, proyectos, respaldo e importación.
 */

import { button, download, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import { MODULOS } from '../modelo.js';
import { aCSV, aICS, aTexto, importarCSV, resumenMarkdown } from '../exportar.js';
import { pedirPermiso, permiso, programarDelDia } from '../notificaciones.js';
import { tituloVista } from '../componentes.js';
import { store } from '../store.js';

export function vistaAjustes(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let nuevoProyecto = '';
  let moduloNuevo = '';

  const pintar = () => {
    const a = store.estado.ajustes;

    render(host,
      tituloVista('Ajustes', 'Todo se guarda solo en este dispositivo'),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Preferencias'),
        el('div', { class: 'fila' },
          el('label', { class: 'field', style: 'width:170px' },
            el('span', { class: 'field-label' }, 'Tema'),
            el('select', { class: 'input', onChange: (e) => { aplicarTema(e.target.value); store.ajustar({ tema: e.target.value }); } },
              el('option', { value: 'dark', selected: a.tema === 'dark' }, 'Oscuro'),
              el('option', { value: 'light', selected: a.tema === 'light' }, 'Claro'))),
          el('label', { class: 'field', style: 'width:170px' },
            el('span', { class: 'field-label' }, 'Pantalla de inicio'),
            el('select', { class: 'input', onChange: (e) => store.ajustar({ vistaInicio: e.target.value }) },
              ...[['hoy', 'Hoy'], ['proximos', 'Próximos'], ['calendario', 'Calendario'], ['enfoque', 'Enfoque']]
                .map(([v, t]) => el('option', { value: v, selected: a.vistaInicio === v }, t)))),
          el('label', { class: 'field', style: 'width:170px' },
            el('span', { class: 'field-label' }, 'Meta diaria de tareas'),
            el('input', { class: 'input', type: 'number', min: 1, value: a.metaDiaria, onChange: (e) => store.ajustar({ metaDiaria: Number(e.target.value) || 5 }) })),
          el('label', { class: 'field', style: 'width:170px' },
            el('span', { class: 'field-label' }, 'Orden por defecto'),
            el('select', { class: 'input', onChange: (e) => store.ajustar({ ordenPorDefecto: e.target.value }) },
              ...[['fecha', 'Por fecha'], ['prioridad', 'Por prioridad'], ['manual', 'Manual'], ['alfabetico', 'A–Z']]
                .map(([v, t]) => el('option', { value: v, selected: a.ordenPorDefecto === v }, t)))))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Avisos'),
        el('p', { class: 'muted small' },
          'Sin servidor no hay notificaciones push: la app avisa mientras esté abierta o instalada en segundo plano. ',
          'Para lo que no se puede olvidar, exporta el calendario .ics y deja que el teléfono ponga la alarma.'),
        el('div', { class: 'fila' },
          button(permiso() === 'granted' ? '✓ Avisos permitidos' : 'Permitir avisos del navegador', async () => {
            const res = await pedirPermiso();
            store.ajustar({ notificaciones: res === 'granted' });
            if (res === 'granted') {
              const n = programarDelDia(store.tareas, { hoy: hoyISO });
              toast(`Listo. ${n} avisos programados para hoy.`);
            } else toast('El navegador no dio permiso', 'warn');
            pintar();
          }, { variant: permiso() === 'granted' ? 'ok' : 'primary' }),
          button('Probar un aviso', () => {
            import('../notificaciones.js').then((m) => { m.avisar('Prueba', 'Así se verán tus recordatorios.'); m.pitido(); });
          }))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Proyectos'),
        el('div', { class: 'chip-list' },
          ...store.estado.proyectos.map((p) => el('span', { class: 'chip' },
            el('span', { class: 'punto-modulo', style: `background:${p.color}` }), p.nombre,
            el('button', { class: 'btn ghost chico', onClick: () => { store.borrarProyecto(p.id); pintar(); } }, '✕')))),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          input(nuevoProyecto, (v) => { nuevoProyecto = v; }, { placeholder: 'Nombre del proyecto' }),
          el('select', { class: 'input', style: 'width:auto', onChange: (e) => { moduloNuevo = e.target.value; } },
            el('option', { value: '' }, '— módulo —'),
            ...MODULOS.map((m) => el('option', { value: m.id }, `${m.icono} ${m.nombre}`))),
          button('Añadir', () => {
            if (!nuevoProyecto.trim()) return;
            store.agregarProyecto(nuevoProyecto.trim(), { modulo: moduloNuevo || null, color: MODULOS.find((m) => m.id === moduloNuevo)?.color });
            nuevoProyecto = '';
            pintar();
          }))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Respaldo'),
        el('p', { class: 'muted small' }, 'Los datos viven en este navegador. Si borras los datos del sitio, se van. Exporta de vez en cuando.'),
        el('div', { class: 'fila' },
          button('⬇ Exportar todo (.json)', () => {
            download(`recordatorios-${hoyISO}.json`, store.exportar());
            toast('Copia descargada');
          }, { variant: 'primary' }),
          button('⬇ Tareas (.csv)', () => download(`tareas-${hoyISO}.csv`, aCSV(store.tareas), 'text/csv')),
          button('⬇ Calendario (.ics)', () => download(`recordatorios-${hoyISO}.ics`, aICS(store.tareas.filter((t) => t.fecha && !t.completada)), 'text/calendar')),
          button('⬇ El día en texto', () => download(`hoy-${hoyISO}.md`, resumenMarkdown(store.tareas, hoyISO), 'text/markdown'))),

        el('p', { class: 'field-label', style: 'margin-top:14px' }, 'Importar'),
        el('div', { class: 'fila' },
          archivo('Restaurar copia (.json)', '.json', async (texto) => {
            if (!window.confirm('Esto reemplaza todo lo que hay ahora. ¿Seguir?')) return;
            try {
              const n = store.importar(texto, 'reemplazar');
              toast(`${n} tareas restauradas`);
              pintar();
            } catch (err) { toast('El archivo no se pudo leer', 'warn'); }
          }),
          archivo('Importar de Todoist o TickTick (.csv)', '.csv', (texto) => {
            const tareas = importarCSV(texto);
            if (!tareas.length) { toast('No se reconocieron tareas en ese CSV', 'warn'); return; }
            tareas.forEach((t) => store.agregar(t));
            toast(`${tareas.length} tareas importadas`);
            pintar();
          }))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Zona peligrosa'),
        el('div', { class: 'fila' },
          button('Borrar las tareas de ejemplo', () => {
            const ejemplo = store.tareas.filter((t) => !t.clave && !t.completada && t.creadaEn === store.tareas[0]?.creadaEn);
            store.estado.tareas = store.tareas.filter((t) => !ejemplo.includes(t));
            store.guardar();
            toast('Ejemplos borrados');
            pintar();
          }, { variant: 'ghost' }),
          button('Vaciar la app entera', () => {
            if (!window.confirm('Se borra todo: tareas, cartera, semestre, tiempo e historial. ¿Seguro?')) return;
            store.vaciar();
            toast('Todo limpio');
            pintar();
          }, { variant: 'danger' }))));
  };

  pintar();
  render(root, host);
}

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
}

/** Botón que abre el selector de archivos y devuelve el texto leído. */
function archivo(etiqueta, acepta, alLeer) {
  const entrada = el('input', {
    type: 'file', accept: acepta, style: 'display:none',
    onChange: async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      alLeer(await f.text());
      entrada.value = '';
    },
  });
  return el('span', {}, button(etiqueta, () => entrada.click()), entrada);
}
