/**
 * ajustes.js (vista) — Preferencias, proyectos, respaldo e importación.
 */

import { button, download, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import { MODULOS } from '../modelo.js';
import { aCSV, aICS, aTexto, importarCSV, resumenMarkdown } from '../exportar.js';
import { enClase, pedirPermiso, permiso, programarDelDia } from '../notificaciones.js';
import { ACCIONES, CONDICIONES, REGLAS_EJEMPLO, reglaVacia, textoRegla } from '../automatizacion.js';
import { tituloVista } from '../componentes.js';
import { archivadas, candidatasAArchivar, diasRestantes } from '../papelera.js';
import { cifrar, descifrar, esArchivoCifrado, fusionarEstados } from '../compartir.js';
import { espacioUsado, tamañoLegible } from '../adjuntos.js';
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
            el('span', { class: 'field-label' }, 'Tope de tareas en curso'),
            el('input', { class: 'input', type: 'number', min: 1, max: 20, value: a.limiteWIP || 5,
              onChange: (e) => store.ajustar({ limiteWIP: Number(e.target.value) || 5 }) })),
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
          el('label', { class: 'chip', style: 'cursor:pointer' },
            el('input', {
              type: 'checkbox', checked: a.resumenMatutino !== false,
              onChange: (e) => { store.ajustar({ resumenMatutino: e.target.checked }); pintar(); },
            }), 'Resumen del día al entrar'),
          el('label', { class: 'field', style: 'width:150px;margin:0' },
            el('span', { class: 'field-label' }, 'A partir de las'),
            el('input', {
              class: 'input', type: 'time', value: a.horaResumen || '07:00',
              onChange: (e) => store.ajustar({ horaResumen: e.target.value }),
            })),
          a.resumenVistoEn ? button('Volver a verlo hoy', () => {
            store.ajustar({ resumenVistoEn: null });
            toast('Se verá al abrir Hoy');
          }, { variant: 'ghost chico' }) : null),

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
        el('h2', { class: 'card-title' }, 'Franjas de silencio'),
        el('p', { class: 'muted small' }, 'Un aviso ignorado enseña a ignorar los avisos.'),
        el('div', { class: 'fila' },
          el('label', { class: 'chip', style: 'cursor:pointer' },
            el('input', {
              type: 'checkbox', checked: !!a.silencio?.activo,
              onChange: (e) => { store.ajustar({ silencio: { ...(a.silencio || { desde: '22:00', hasta: '07:00' }), activo: e.target.checked } }); pintar(); },
            }), 'No molestar'),
          el('label', { class: 'field', style: 'width:130px;margin:0' },
            el('span', { class: 'field-label' }, 'Desde'),
            el('input', { class: 'input', type: 'time', value: a.silencio?.desde || '22:00',
              onChange: (e) => store.ajustar({ silencio: { ...(a.silencio || {}), desde: e.target.value } }) })),
          el('label', { class: 'field', style: 'width:130px;margin:0' },
            el('span', { class: 'field-label' }, 'Hasta'),
            el('input', { class: 'input', type: 'time', value: a.silencio?.hasta || '07:00',
              onChange: (e) => store.ajustar({ silencio: { ...(a.silencio || {}), hasta: e.target.value } }) }))),
        el('div', { class: 'chip-list', style: 'margin-top:10px' },
          ...['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map((d, i) => el('button', {
            class: `chip ${(a.silencio?.dias || []).includes(i) ? 'activa' : ''}`.trim(),
            title: 'Silenciar el día entero',
            onClick: () => {
              const dias = new Set(a.silencio?.dias || []);
              dias.has(i) ? dias.delete(i) : dias.add(i);
              store.ajustar({ silencio: { ...(a.silencio || {}), dias: [...dias] } });
              pintar();
            },
          }, d))),
        (() => {
          const clase = enClase(store.estado);
          const cursos = store.estado.docencia?.semestre?.cursos || [];
          return el('p', { class: 'muted small', style: 'margin-top:10px' },
            !cursos.length
              ? 'Cuando pongas el horario del semestre en Docencia, los avisos no urgentes esperarán a que salgas de clase.'
              : clase
                ? `Ahora mismo estás en ${clase.curso}${clase.hasta ? ` hasta las ${clase.hasta}` : ''}: solo pasarían los avisos urgentes.`
                : 'Fuera de clase. Durante las horas del horario del semestre solo pasan los avisos urgentes.');
        })()),

      panelReglas(pintar),

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

        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('🔒 Exportar cifrado', async () => {
            const clave = window.prompt('Contraseña para cifrar la copia (apúntala: sin ella no hay forma de abrirla)');
            if (!clave) return;
            try {
              download(`recordatorios-${hoyISO}.json.enc`, await cifrar(store.exportar(), clave), 'application/json');
              toast('Copia cifrada descargada');
            } catch (err) { toast(err.message, 'warn'); }
          }, { title: 'AES-GCM con clave derivada de tu contraseña, todo en tu navegador' })),

        el('p', { class: 'field-label', style: 'margin-top:14px' }, 'Importar'),
        el('div', { class: 'fila' },
          archivo('Restaurar copia (.json o .enc)', '.json,.enc', async (texto) => {
            let contenido = texto;
            if (esArchivoCifrado(texto)) {
              const clave = window.prompt('Contraseña de la copia cifrada');
              if (!clave) return;
              try { contenido = await descifrar(texto, clave); } catch (err) { toast(err.message, 'warn'); return; }
            }
            if (!window.confirm('Esto reemplaza todo lo que hay ahora. ¿Seguir?')) return;
            try {
              store.instantanea('Restaurar copia');
              const n = store.importar(contenido, 'reemplazar');
              toast(`${n} tareas restauradas`);
              pintar();
            } catch (err) { toast('El archivo no se pudo leer', 'warn'); }
          }),
          archivo('Fusionar copia de otro dispositivo', '.json,.enc', async (texto) => {
            let contenido = texto;
            if (esArchivoCifrado(texto)) {
              const clave = window.prompt('Contraseña de la copia cifrada');
              if (!clave) return;
              try { contenido = await descifrar(texto, clave); } catch (err) { toast(err.message, 'warn'); return; }
            }
            try {
              const otro = JSON.parse(contenido);
              const { estado, frase } = fusionarEstados(store.estado, otro);
              if (!window.confirm(`${frase}\n\nGana siempre la versión modificada más tarde. ¿Fusionar?`)) return;
              store.instantanea('Fusionar copia');
              store.estado = store.fusionar(estado);
              store.guardar();
              toast(frase);
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

      panelPapelera(),
      panelArchivo(),

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

  /** La papelera: treinta días para arrepentirse. */
  function panelPapelera() {
    const papelera = store.estado.papelera || [];
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, `Papelera (${papelera.length})`),
      el('p', { class: 'muted small' }, 'Lo borrado espera 30 días aquí antes de irse de verdad.'),
      papelera.length ? el('table', { class: 'tabla' },
        el('tbody', {}, ...[...papelera].reverse().map((x) => el('tr', {},
          el('td', {}, x.nombre),
          el('td', { class: 'muted small' }, x.tipo),
          el('td', { class: 'muted small' }, `le quedan ${diasRestantes(x, hoyISO)} días`),
          el('td', {}, button('Restaurar', () => {
            store.restaurarDePapelera(x.id);
            toast('Restaurado');
            pintar();
          }, { variant: 'ghost chico' })))))) : el('p', { class: 'muted' }, 'Vacía.'),
      papelera.length ? el('div', { class: 'fila', style: 'margin-top:10px' },
        button('Vaciar la papelera', () => {
          if (!window.confirm('Se borra definitivamente lo que hay en la papelera. ¿Seguro?')) return;
          store.vaciarPapelera();
          pintar();
        }, { variant: 'ghost danger chico' })) : null);
  }

  /** El archivo: lo terminado deja de estorbar pero no se pierde. */
  function panelArchivo() {
    const guardadas = archivadas(store.todasLasTareas);
    const candidatas = candidatasAArchivar(store.todasLasTareas, hoyISO);
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, `Archivo (${guardadas.length})`),
      el('p', { class: 'muted small' },
        'Lo archivado no sale en ninguna lista, pero sigue contando en las estadísticas y en el historial.'),
      candidatas.length ? el('div', { class: 'fila' },
        button(`Archivar ${candidatas.length} tareas completadas hace más de 30 días`, () => {
          store.instantanea('Archivar completadas');
          for (const t of candidatas) store.actualizar(t.id, { archivada: true });
          toast(`${candidatas.length} archivadas`);
          pintar();
        }, { variant: 'primary' })) : el('p', { class: 'muted small' }, 'Nada pendiente de archivar.'),
      guardadas.length ? el('details', { style: 'margin-top:10px' },
        el('summary', { class: 'muted small' }, 'Ver lo archivado'),
        el('div', { class: 'chip-list', style: 'margin-top:8px' },
          ...guardadas.slice(0, 40).map((t) => el('button', {
            class: 'chip', title: 'Desarchivar',
            onClick: () => { store.archivar(t.id, false); pintar(); },
          }, `${t.titulo} ✕`)))) : null);
  }

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

/* ------------------------------------------------------------------ *
 * Reglas de automatización
 * ------------------------------------------------------------------ */

/**
 * "Si entra esto, hazle aquello": las mismas tres decisiones repetidas mil
 * veces. Las reglas solo actúan **al crear** la tarea, y la app dice cuál
 * actuó: una automatización silenciosa es una automatización en la que se deja
 * de confiar.
 */
function panelReglas(refrescar) {
  const caja = el('section', { class: 'card' });

  const menu = (valor, lista, alCambiar) => {
    const sel = el('select', { class: 'input', onChange: (e) => alCambiar(e.target.value) });
    for (const x of lista) sel.append(el('option', { value: x.id, selected: x.id === valor }, x.nombre));
    return sel;
  };

  const pintar = () => {
    const reglas = store.estado.reglas || [];
    render(caja,
      el('h2', { class: 'card-title' }, 'Reglas de automatización'),
      el('p', { class: 'muted small' }, 'Se aplican al crear la tarea, en orden. Lo que ya venía escrito no se pisa: una regla nunca cambia una fecha o una duración que tú pusiste.'),

      ...reglas.map((r) => el('div', { class: 'idea' },
        el('div', { class: 'fila' },
          input(r.nombre, (v) => store.actualizarEn('reglas', r.id, { nombre: v })),
          el('label', { class: 'chip', style: 'cursor:pointer' },
            el('input', {
              type: 'checkbox', checked: r.activa !== false,
              onChange: (e) => { store.actualizarEn('reglas', r.id, { activa: e.target.checked }); pintar(); },
            }), r.activa !== false ? 'Activa' : 'Parada'),
          button('✕', () => { store.borrarEn('reglas', r.id); pintar(); }, { variant: 'ghost chico danger', title: 'Borrar la regla' })),
        el('div', { class: 'fila' },
          el('span', { class: 'muted small' }, 'Si'),
          menu(r.condicion?.tipo, CONDICIONES, (v) => { store.actualizarEn('reglas', r.id, { condicion: { ...r.condicion, tipo: v } }); pintar(); }),
          r.condicion?.tipo === 'sinFecha' ? null
            : input(r.condicion?.valor || '', (v) => store.actualizarEn('reglas', r.id, { condicion: { ...r.condicion, valor: v } }))),
        ...(r.acciones || []).map((a, i) => el('div', { class: 'fila' },
          el('span', { class: 'muted small' }, i === 0 ? 'entonces' : 'y'),
          menu(a.tipo, ACCIONES, (v) => {
            const acciones = r.acciones.map((x, j) => (j === i ? { ...x, tipo: v } : x));
            store.actualizarEn('reglas', r.id, { acciones });
            pintar();
          }),
          input(a.valor ?? '', (v) => {
            const acciones = r.acciones.map((x, j) => (j === i ? { ...x, valor: v } : x));
            store.actualizarEn('reglas', r.id, { acciones });
          }),
          button('✕', () => {
            store.actualizarEn('reglas', r.id, { acciones: r.acciones.filter((_, j) => j !== i) });
            pintar();
          }, { variant: 'ghost chico', title: 'Quitar esta acción' }))),
        el('div', { class: 'fila' },
          button('＋ acción', () => {
            store.actualizarEn('reglas', r.id, { acciones: [...(r.acciones || []), { tipo: 'etiqueta', valor: '' }] });
            pintar();
          }, { variant: 'ghost chico' }),
          el('span', { class: 'muted small grow' }, textoRegla(r)),
          el('span', { class: 'muted small' }, `${r.veces || 0} veces`)))),

      !reglas.length ? el('p', { class: 'muted small' }, 'Ninguna regla todavía.') : null,

      el('div', { class: 'fila', style: 'margin-top:10px' },
        button('Regla nueva', () => { store.agregarEn('reglas', reglaVacia()); pintar(); }, { variant: 'primary' }),
        button('Traer las de ejemplo', () => {
          const existentes = new Set((store.estado.reglas || []).map((r) => r.id));
          let n = 0;
          for (const r of REGLAS_EJEMPLO) if (!existentes.has(r.id)) { store.agregarEn('reglas', { ...r }); n++; }
          toast(n ? `${n} reglas añadidas, paradas hasta que las actives` : 'Ya las tenías todas');
          pintar();
        })));
  };

  pintar();
  return caja;
}
