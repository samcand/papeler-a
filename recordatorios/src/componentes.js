/**
 * componentes.js — Piezas de interfaz que se repiten en todas las vistas.
 * Se apoya en el `ui.js` de la app de alabanza: mismo estilo, cero framework.
 */

import { button, el, input, render, textarea, toast } from '../../src/ui.js';
import { aISO, deISO, finDeMes, hoy, inicioSemana, sumarDias, textoLargo, textoRelativo, DIAS, DIAS_CORTO, MESES } from './fechas.js';
import { MODULOS, PRIORIDADES, descripcionCorta, ordenarTareas } from './modelo.js';
import { parseEntrada } from './naturales.js';
import { parseRegla, proximasFechas, textoRegla } from './recurrencia.js';
import { calibracion, pistaEstimacion } from './calibracion.js';
import { aplicar, fuentesDe, sugerencias } from './autocompletar.js';
import { alternarTres, tresDelDia } from './dia.js';
import { dictadoDisponible, dictar, posiblesDuplicados } from './captura.js';
import { estadoLimite } from './limites.js';
import { bloqueantes, estaBloqueada, primerPaso } from './dependencias.js';
import { NIVELES as NIVELES_ENERGIA, energiaDe } from './energia.js';
import { crearEspera, estadoEspera, tareaDePerseguir } from './esperas.js';
import * as adjuntos from './adjuntos.js';
import { store } from './store.js';

export const colorModulo = (id) => MODULOS.find((m) => m.id === id)?.color || 'var(--muted)';
export const iconoModulo = (id) => MODULOS.find((m) => m.id === id)?.icono || '•';

/* ------------------------------------------------------------------ *
 * Entrada rápida
 * ------------------------------------------------------------------ */

/**
 * Caja de una sola línea que entiende lo que escribes y lo enseña antes de
 * guardar: si la app interpretó mal la fecha, se ve al momento.
 */
export function entradaRapida(porDefecto = {}, alAgregar = () => {}) {
  const campo = input('', () => { actualizarPrevia(); actualizarSugerencias(); }, {
    placeholder: 'Ej.: Revisar tesis de NVDA mañana 9am p1 #Cartera cada tercer viernes',
  });
  const previa = el('p', { class: 'vista-previa' });
  const aviso = el('div', { class: 'aviso-duplicado', hidden: true });
  const listaSugerencias = el('div', { class: 'sugerencias' });
  let dictando = null;
  let sugerenciaActual = null;
  let elegida = 0;

  /** Sugerir proyectos y etiquetas que ya existen, para no duplicarlos. */
  function actualizarSugerencias() {
    sugerenciaActual = sugerencias(campo.value, campo.selectionStart ?? campo.value.length, fuentesDe(store.estado));
    elegida = 0;
    pintarSugerencias();
  }

  function pintarSugerencias() {
    if (!sugerenciaActual || (!sugerenciaActual.opciones.length && !sugerenciaActual.nuevo)) {
      render(listaSugerencias);
      listaSugerencias.classList.remove('abierta');
      return;
    }
    listaSugerencias.classList.add('abierta');
    render(listaSugerencias,
      ...sugerenciaActual.opciones.map((opcion, i) => el('button', {
        class: `sugerencia ${i === elegida ? 'activa' : ''}`.trim(),
        type: 'button',
        onMousedown: (e) => { e.preventDefault(); usarSugerencia(opcion); },
      }, `${sugerenciaActual.simbolo}${opcion}`)),
      sugerenciaActual.nuevo
        ? el('span', { class: 'sugerencia nueva' }, `se creará ${sugerenciaActual.simbolo}${sugerenciaActual.prefijo}`)
        : null);
  }

  function usarSugerencia(valor) {
    const r = aplicar(campo.value, sugerenciaActual, valor);
    campo.value = r.texto;
    campo.setSelectionRange(r.cursor, r.cursor);
    campo.focus();
    sugerenciaActual = null;
    pintarSugerencias();
    actualizarPrevia();
  }

  /**
   * Avisar de que quizá ya tienes esa tarea. Avisa, no impide: a veces sí
   * quieres dos tareas parecidas, y la app no es quién para decidirlo.
   */
  function actualizarDuplicados(titulo) {
    const parecidas = titulo ? posiblesDuplicados(titulo, store.tareas) : [];
    if (!parecidas.length) { aviso.hidden = true; render(aviso); return; }
    aviso.hidden = false;
    render(aviso,
      el('span', {}, '⚠️ Puede que ya la tengas: '),
      ...parecidas.map(({ tarea, parecido }) => el('button', {
        class: 'chip', type: 'button', title: `Se parece un ${Math.round(parecido * 100)} %`,
        onMousedown: (e) => {
          e.preventDefault();
          campo.value = '';
          previa.textContent = '';
          actualizarDuplicados('');
          panelTarea(tarea, () => alAgregar(tarea));
        },
      }, tarea.titulo.slice(0, 40))));
  }

  function actualizarPrevia() {
    const txt = campo.value.trim();
    if (!txt) { previa.textContent = ''; actualizarDuplicados(''); return; }
    const p = parseEntrada(txt);
    const trozos = [];
    if (p.fecha) trozos.push(`<b>${textoRelativo(p.fecha)}</b>${p.hora ? ` a las <b>${p.hora}</b>` : ''}`);
    if (p.limite) trozos.push(`⏳ vence el <b>${textoRelativo(p.limite)}</b>`);
    if (p.regla) trozos.push(`🔁 <b>${textoRegla(p.regla)}</b>`);
    if (p.prioridad) trozos.push(`<b>P${p.prioridad}</b>`);
    if (p.proyecto) trozos.push(`proyecto <b>${p.proyecto}</b>`);
    if (p.etiquetas.length) trozos.push(p.etiquetas.map((e) => `<b>@${e}</b>`).join(' '));
    if (p.duracion) trozos.push(`<b>${p.duracion} min</b>`);
    previa.innerHTML = trozos.length ? `“${p.titulo}” · ${trozos.join(' · ')}` : `“${p.titulo}” · sin fecha`;
    actualizarDuplicados(p.titulo);
  }

  /** Dictar la tarea: el texto entra en la misma caja y lo analiza igual. */
  const botonMicro = button('🎤', () => {
    if (dictando) { dictando.parar(); return; }
    botonMicro.classList.add('grabando');
    botonMicro.textContent = '⏹';
    dictando = dictar({
      alTexto: (texto) => { campo.value = texto; actualizarPrevia(); },
      alTerminar: () => {
        dictando = null;
        botonMicro.classList.remove('grabando');
        botonMicro.textContent = '🎤';
        campo.focus();
      },
      alFallar: (err) => { toast(err.message); },
    });
  }, { title: 'Dictar la tarea' });

  function agregar() {
    const txt = campo.value.trim();
    if (!txt) return;
    const p = parseEntrada(txt);
    const tarea = store.agregar({
      titulo: p.titulo,
      fecha: p.fecha ?? porDefecto.fecha ?? null,
      limite: p.limite ?? null,
      hora: p.hora,
      prioridad: p.prioridad ?? porDefecto.prioridad ?? 4,
      etiquetas: p.etiquetas,
      proyecto: p.proyecto ?? porDefecto.proyecto ?? null,
      regla: p.regla,
      duracion: p.duracion,
      modulo: porDefecto.modulo ?? moduloDeProyecto(p.proyecto) ?? null,
      padre: porDefecto.padre ?? null,
    });
    campo.value = '';
    previa.textContent = '';
    campo.focus();
    alAgregar(tarea);
  }

  campo.addEventListener('keydown', (e) => {
    const abierta = sugerenciaActual && sugerenciaActual.opciones.length;
    if (abierta && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const n = sugerenciaActual.opciones.length;
      elegida = (elegida + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      pintarSugerencias();
      return;
    }
    if (abierta && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault();
      usarSugerencia(sugerenciaActual.opciones[elegida]);
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); agregar(); }
    if (e.key === 'Escape') {
      if (sugerenciaActual) { sugerenciaActual = null; pintarSugerencias(); return; }
      campo.value = ''; previa.textContent = ''; campo.blur();
    }
  });
  campo.addEventListener('blur', () => { sugerenciaActual = null; pintarSugerencias(); });
  campo.addEventListener('click', actualizarSugerencias);
  campo.dataset.rapida = '1';

  return el('div', { class: 'caja-rapida' },
    el('div', { class: 'rapida' }, campo,
      dictadoDisponible() ? botonMicro : null,
      button('Añadir', agregar, { variant: 'primary' })),
    listaSugerencias,
    aviso,
    previa);
}

function moduloDeProyecto(nombre) {
  if (!nombre) return null;
  return store.estado.proyectos.find((p) => p.nombre.toLowerCase() === String(nombre).toLowerCase())?.modulo || null;
}

/* ------------------------------------------------------------------ *
 * Tarea
 * ------------------------------------------------------------------ */

export function itemTarea(tarea, opciones = {}) {
  const refrescar = opciones.alCambiar || (() => {});
  const hoyISO = opciones.hoy || aISO(hoy());
  const vencida = !tarea.completada && tarea.fecha && tarea.fecha < hoyISO;

  const casilla = el('button', {
    class: `casilla p${tarea.prioridad}${tarea.completada ? ' marcada' : ''}`,
    title: tarea.completada ? 'Reabrir' : 'Completar',
    'aria-label': `${tarea.completada ? 'Reabrir' : 'Completar'}: ${tarea.titulo}`,
    'aria-pressed': tarea.completada ? 'true' : 'false',
    onClick: (e) => {
      e.stopPropagation();
      const res = store.alternarCompletada(tarea.id, hoyISO);
      if (res?.repetida) toast(`Hecho. La próxima: ${textoRelativo(res.tarea.fecha, deISO(hoyISO))}`);
      refrescar();
    },
  });

  const meta = [];
  if (tarea.fecha) {
    meta.push(el('span', { class: vencida ? 'vencida' : '' },
      `${vencida ? '⚠ ' : ''}${textoRelativo(tarea.fecha, deISO(hoyISO))}${tarea.hora ? ` ${tarea.hora}` : ''}`));
  }
  const plazo = estadoLimite(tarea, hoyISO);
  if (plazo.hayLimite && !tarea.completada) {
    const grave = ['vencido', 'imposible', 'hoy'].includes(plazo.nivel);
    meta.push(el('span', { class: grave ? 'vencida' : '', title: plazo.texto },
      `⏳ vence ${textoRelativo(tarea.limite, deISO(hoyISO))}`));
  }
  const paradaPor = tarea.completada ? [] : bloqueantes(tarea, store.tareas);
  if (paradaPor.length) {
    meta.push(el('span', {
      class: 'bloqueada',
      title: `Espera a: ${paradaPor.map((b) => b.titulo).join(', ')}`,
    }, `🔒 espera a ${paradaPor[0].titulo}${paradaPor.length > 1 ? ` +${paradaPor.length - 1}` : ''}`));
  }
  if (tarea.regla) meta.push(el('span', {}, '🔁 ' + textoRegla(tarea.regla)));
  if (tarea.duracion) meta.push(el('span', {}, `⏱ ${tarea.duracion} min`));
  if (tarea.tiempoDedicado) meta.push(el('span', {}, `🍅 ${tarea.tiempoDedicado} min`));
  if (tarea.proyecto) meta.push(el('span', {}, `# ${tarea.proyecto}`));
  for (const et of tarea.etiquetas || []) meta.push(el('span', { class: 'etiqueta' }, '@' + et));
  if (tarea.notas) meta.push(el('span', { title: tarea.notas }, '📝'));
  if (tarea.espera?.quien) {
    const e = estadoEspera(tarea.espera, hoyISO);
    meta.push(el('span', { class: e.vencida ? 'vencida' : '', title: `Esperando desde ${tarea.espera.desde}` },
      `⏳ ${tarea.espera.quien}${e.vencida ? ` · ${Math.abs(e.margen)} días de más` : ''}`));
  }
  if ((tarea.aplazamientos || 0) >= 3) {
    meta.push(el('span', { title: 'Veces que la has pospuesto' }, `↩ ${tarea.aplazamientos}`));
  }
  if (tarea.modulo) meta.unshift(el('span', { class: 'punto-modulo', style: `background:${colorModulo(tarea.modulo)}`, title: tarea.modulo }));

  const enLasTres = (tresDelDia(store.estado.ajustes, store.tareas, hoyISO).ids || []).includes(tarea.id);
  const acciones = el('div', { class: 'tarea-acciones' },
    !tarea.completada ? button(enLasTres ? '★' : '☆', () => {
      const r = alternarTres(store.estado.ajustes, tarea.id, hoyISO);
      if (r.lleno) { toast('Ya hay tres. Quita una antes de poner otra.', 'warn'); return; }
      store.ajustar({ tresDelDia: r });
      refrescar();
    }, { variant: `ghost chico${enLasTres ? ' estrella' : ''}`, title: 'Una de las tres de hoy' }) : null,
    tarea.completada ? button('📦', () => { store.archivar(tarea.id); toast('Archivada'); refrescar(); },
      { variant: 'ghost chico', title: 'Archivar' }) : null,
    !tarea.completada ? el('a', {
      class: 'btn ghost chico', href: `#/concentracion/${tarea.id}`, title: 'Trabajar en esto y nada más',
      onClick: (e) => e.stopPropagation(),
    }, '🎯') : null,
    !tarea.completada ? button('📅', () => { store.aplazar(tarea.id, hoyISO); refrescar(); }, { variant: 'ghost chico', title: 'Mover a hoy' }) : null,
    !tarea.completada ? button('→', () => { store.aplazar(tarea.id, aISO(sumarDias(tarea.fecha || hoyISO, 1))); refrescar(); }, { variant: 'ghost chico', title: 'Posponer un día' }) : null,
    button('✎', () => panelTarea(tarea, refrescar), { variant: 'ghost chico', title: 'Editar' }),
    button('🗑', () => {
      if (!window.confirm(`¿Borrar “${tarea.titulo}”?`)) return;
      store.borrar(tarea.id);
      refrescar();
    }, { variant: 'ghost chico danger', title: 'Borrar' }));

  return el('div', {
    class: `tarea${tarea.completada ? ' hecha' : ''}${opciones.sub ? ' sub' : ''}`,
    dataset: { id: tarea.id }, role: 'listitem',
  },
    casilla,
    el('div', {
      class: 'tarea-cuerpo', role: 'button', tabindex: '0',
      'aria-label': `Abrir ${tarea.titulo}`,
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panelTarea(tarea, refrescar); } },
      onClick: () => panelTarea(tarea, refrescar),
    },
      el('div', { class: 'tarea-titulo' }, tarea.titulo),
      meta.length ? el('div', { class: 'tarea-meta' }, ...meta) : null),
    acciones);
}

export function listaTareas(tareas, opciones = {}) {
  if (!tareas.length) return vacio(opciones.vacio || 'Nada por aquí.', opciones.icono);
  const orden = opciones.orden || store.estado.ajustes.ordenPorDefecto;
  const lista = el('div', { class: `lista-tareas${orden === 'manual' ? ' ordenable' : ''}`, role: 'list' });
  for (const t of ordenarTareas(tareas, orden)) {
    const fila = itemTarea(t, opciones);
    if (orden === 'manual') hacerOrdenable(fila, t, opciones.alCambiar || (() => {}));
    lista.append(fila);
    if (opciones.conSubtareas) {
      for (const h of store.tareas.filter((x) => x.padre === t.id)) lista.append(itemTarea(h, { ...opciones, sub: true }));
    }
  }
  return lista;
}

/**
 * Arrastrar para reordenar, solo con el orden manual: en una lista ordenada por
 * fecha, mover a mano no significaría nada.
 *
 * Arrastrar no se puede hacer con el teclado, así que la misma fila responde a
 * Alt+↑ y Alt+↓: una función que solo existe con ratón es una función que no
 * existe para todo el mundo.
 */
function hacerOrdenable(fila, tarea, alCambiar) {
  fila.draggable = true;
  fila.tabIndex = 0;
  fila.setAttribute('aria-label', `${tarea.titulo}. Alt y flechas para moverla.`);
  fila.addEventListener('keydown', (e) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const filas = [...fila.parentElement.querySelectorAll('.tarea')];
    const i = filas.indexOf(fila);
    const destino = filas[e.key === 'ArrowUp' ? i - 1 : i + 1];
    if (!destino) return;
    store.instantanea('Reordenar');
    store.reordenar(tarea.id, destino.dataset.id);
    alCambiar();
  });
  fila.classList.add('arrastrable');
  fila.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tarea.id);
    fila.classList.add('arrastrando');
  });
  fila.addEventListener('dragend', () => fila.classList.remove('arrastrando'));
  fila.addEventListener('dragover', (e) => { e.preventDefault(); fila.classList.add('destino'); });
  fila.addEventListener('dragleave', () => fila.classList.remove('destino'));
  fila.addEventListener('drop', (e) => {
    e.preventDefault();
    fila.classList.remove('destino');
    const id = e.dataTransfer.getData('text/plain');
    if (!id || id === tarea.id) return;
    store.instantanea('Reordenar');
    store.reordenar(id, tarea.id);
    alCambiar();
  });
}

export function vacio(mensaje, icono = '🌤️') {
  return el('div', { class: 'vacio' }, el('span', { class: 'grande' }, icono), el('p', {}, mensaje));
}

/* ------------------------------------------------------------------ *
 * Panel de edición
 * ------------------------------------------------------------------ */

/** Cajón lateral con todos los campos de la tarea. */
export function panelTarea(tarea, alGuardar = () => {}) {
  const borrador = { ...tarea, etiquetas: [...(tarea.etiquetas || [])], dependeDe: [...(tarea.dependeDe || [])] };
  const hoyDelPanel = aISO(hoy());
  let pistaPlazo = () => {};
  const cuerpo = el('div', { class: 'drawer-body' });
  const panel = el('div', { class: 'drawer' },
    el('div', {},
      el('div', { class: 'drawer-head' },
        el('h3', {}, 'Tarea'),
        button('✕', cerrar, { variant: 'ghost' })),
      cuerpo));

  function cerrar() { panel.remove(); }

  function campo(etiqueta, control, pista) {
    return el('label', { class: 'field' },
      el('span', { class: 'field-label' }, etiqueta), control,
      pista ? el('span', { class: 'field-hint' }, pista) : null);
  }

  const selModulo = el('select', { class: 'input', onChange: (e) => { borrador.modulo = e.target.value || null; } });
  selModulo.append(el('option', { value: '' }, '— sin módulo —'));
  for (const m of MODULOS) selModulo.append(el('option', { value: m.id, selected: m.id === borrador.modulo }, `${m.icono} ${m.nombre}`));

  const selEnergia = el('select', { class: 'input', onChange: (e) => { borrador.energia = e.target.value || null; } });
  selEnergia.append(el('option', { value: '' }, `— deducida: ${NIVELES_ENERGIA.find((n) => n.id === energiaDe(borrador))?.nombre} —`));
  for (const n of NIVELES_ENERGIA) {
    selEnergia.append(el('option', { value: n.id, selected: n.id === borrador.energia }, `${n.icono} ${n.nombre}`));
  }

  const selSeccion = el('select', { class: 'input', onChange: (e) => { borrador.seccion = e.target.value || null; } });
  const pintarSecciones = () => {
    render(selSeccion, el('option', { value: '' }, '— sin sección —'),
      ...store.secciones(borrador.proyecto).map((s) => el('option', { value: s, selected: s === borrador.seccion }, s)));
    selSeccion.disabled = !store.secciones(borrador.proyecto).length;
  };

  const selProyecto = el('select', { class: 'input', onChange: (e) => { borrador.proyecto = e.target.value || null; borrador.seccion = null; pintarSecciones(); } });
  selProyecto.append(el('option', { value: '' }, '— sin proyecto —'));
  for (const p of store.estado.proyectos) {
    selProyecto.append(el('option', { value: p.nombre, selected: p.nombre === borrador.proyecto }, p.nombre));
  }
  pintarSecciones();

  render(cuerpo,
    campo('Título', input(borrador.titulo, (v) => { borrador.titulo = v; })),
    campo('Notas', textarea(borrador.notas, (v) => { borrador.notas = v; }, { rows: 4, placeholder: 'Contexto, enlaces, la tesis en dos líneas…' })),
    el('div', { class: 'fila' },
      el('div', { class: 'grow' }, campo('Fecha', input(borrador.fecha || '', (v) => { borrador.fecha = v || null; pistaPlazo(); }, { type: 'date' }), 'Cuándo piensas hacerla.')),
      el('div', { class: 'grow' }, campo('Hora', input(borrador.hora || '', (v) => { borrador.hora = v || null; }, { type: 'time' })))),
    (() => {
      const aviso = el('span', { class: 'field-hint' });
      const control = input(borrador.limite || '', (v) => { borrador.limite = v || null; pintarAviso(); }, { type: 'date' });
      function pintarAviso() {
        const e = estadoLimite(borrador, hoyDelPanel);
        aviso.textContent = e.hayLimite ? e.texto : 'Cuándo vence de verdad. No es lo mismo que cuándo la haces.';
        aviso.classList.toggle('negativo', ['vencido', 'imposible'].includes(e.nivel));
      }
      pistaPlazo = pintarAviso;
      pintarAviso();
      return el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Fecha límite'), control, aviso);
    })(),
    campoDependencias(borrador, alGuardar, cerrar),
    campo('Prioridad', selectorPrioridad(borrador.prioridad, (v) => { borrador.prioridad = v; })),
    (() => {
      // La pista sale del historial real: si sueles tardar más, que se vea al estimar.
      const cal = calibracion(store.tareas, store.estado.tiempo);
      const pista = el('span', { class: 'field-hint' }, pistaEstimacion(borrador.duracion, cal, borrador.modulo));
      const control = input(borrador.duracion || '', (v) => {
        borrador.duracion = Number(v) || null;
        pista.textContent = pistaEstimacion(borrador.duracion, cal, borrador.modulo);
      }, { type: 'number', min: 0, step: 5 });
      return el('label', { class: 'field' },
        el('span', { class: 'field-label' }, 'Duración (min)'), control, pista);
    })(),
    el('div', { class: 'fila' },
      el('div', { class: 'grow' }, campo('Módulo', selModulo)),
      el('div', { class: 'grow' }, campo('Proyecto', selProyecto))),
    el('div', { class: 'fila' },
      el('div', { class: 'grow' }, campo('Energía que pide', selEnergia, 'Para elegir según el momento del día, no según el orden de la lista.')),
      el('div', { class: 'grow' }, campo('Sección', selSeccion, 'Las secciones se crean dentro del proyecto.'))),
    campo('Se repite', constructorRepeticion(borrador.regla, (r) => { borrador.regla = r; })),
    campo('Etiquetas', input((borrador.etiquetas || []).join(', '), (v) => {
      borrador.etiquetas = v.split(',').map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
    }, { placeholder: 'mercado, espera, tesis' })),
    campoEspera(borrador, alGuardar, cerrar),
    campoAdjuntos(borrador),
    campo('Avisar antes (min)', input((borrador.recordatorios || []).join(', '), (v) => {
      borrador.recordatorios = v.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    }, { placeholder: '0, 30, 60' }), 'Solo funciona con la app abierta o instalada. Para lo importante, exporta al calendario.'),
    el('div', { class: 'fila', style: 'margin-top:14px' },
      button('Guardar', () => {
        store.actualizar(tarea.id, borrador);
        cerrar();
        alGuardar();
        toast('Guardado');
      }, { variant: 'primary' }),
      button('Añadir subtarea', () => {
        store.agregar({ titulo: 'Nueva subtarea', padre: tarea.id, proyecto: borrador.proyecto, modulo: borrador.modulo });
        cerrar();
        alGuardar();
      }),
      button('Duplicar', () => {
        store.agregar({ ...borrador, id: undefined, titulo: borrador.titulo + ' (copia)', completada: false, clave: null });
        cerrar();
        alGuardar();
      }),
      button('Borrar', () => {
        if (!window.confirm('¿Borrar la tarea y sus subtareas?')) return;
        store.borrar(tarea.id);
        cerrar();
        alGuardar();
      }, { variant: 'danger' })));

  panel.addEventListener('click', (e) => { if (e.target === panel) cerrar(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
  });
  document.body.append(panel);
  return panel;
}


/* ------------------------------------------------------------------ *
 * Prioridad y repetición, con botones en vez de con memoria
 * ------------------------------------------------------------------ */

/**
 * "Esto va después de aquello": se guarda en la tarea que espera, que es donde
 * uno lo piensa. La app no deja cerrar un círculo.
 */
function campoDependencias(borrador, alGuardar, cerrar) {
  const caja = el('div', { class: 'field' });
  const pintar = () => {
    const todas = store.tareas.filter((t) => t.id !== borrador.id && !t.completada);
    const espera = (borrador.dependeDe || [])
      .map((id) => store.tarea(id))
      .filter(Boolean);
    const bloquea = store.tareas.filter((t) => (t.dependeDe || []).includes(borrador.id));

    const selector = el('select', {
      class: 'input',
      onChange: (e) => {
        const otra = e.target.value;
        if (!otra) return;
        const r = store.dependerDe(borrador.id, otra);
        if (!r.ok) { toast(r.error, 'warn'); e.target.value = ''; return; }
        borrador.dependeDe = [...(borrador.dependeDe || []), otra];
        pintar();
      },
    }, el('option', { value: '' }, '— va después de… —'),
    ...todas.filter((t) => !(borrador.dependeDe || []).includes(t.id))
      .map((t) => el('option', { value: t.id }, t.titulo.slice(0, 60))));

    render(caja,
      el('span', { class: 'field-label' }, 'Va después de'),
      selector,
      espera.length ? el('div', { class: 'chip-list' }, ...espera.map((t) => el('span', { class: 'chip' },
        t.titulo.slice(0, 40),
        button('✕', () => {
          store.quitarDependencia(borrador.id, t.id);
          borrador.dependeDe = (borrador.dependeDe || []).filter((x) => x !== t.id);
          pintar();
        }, { variant: 'ghost chico', title: 'Quitar la dependencia' })))) : null,
      (() => {
        const primera = primerPaso(borrador, store.tareas);
        return primera && primera.id !== (borrador.dependeDe || [])[0]
          ? el('span', { class: 'field-hint' }, `Para desatascarla hay que empezar por “${primera.titulo}”.`)
          : null;
      })(),
      bloquea.length ? el('span', { class: 'field-hint' },
        `${bloquea.length} tarea(s) esperan a esta: ${bloquea.map((t) => t.titulo).join(', ')}`) : null);
  };
  pintar();
  return caja;
}

/** Cuatro banderas de prioridad, como en Todoist: se ve el color, no el número. */
export function selectorPrioridad(valor, alCambiar) {
  const caja = el('div', { class: 'chip-list' });
  const pintar = (actual) => {
    render(caja, ...PRIORIDADES.map((p) => el('button', {
      class: `chip prioridad ${actual === p.valor ? 'activa' : ''}`.trim(),
      style: `--color-prioridad:${p.color}${actual === p.valor ? `;background:${p.color};border-color:${p.color};color:#12161d` : `;color:${p.color}`}`,
      title: `${p.corto} — ${p.nombre}`,
      onClick: () => { pintar(p.valor); alCambiar(p.valor); },
    }, `⚑ ${p.corto}`, el('span', { class: 'small' }, p.nombre))));
  };
  pintar(valor || 4);
  return caja;
}

const ORDINALES_REGLA = [
  { valor: 1, texto: 'primer' }, { valor: 2, texto: 'segundo' }, { valor: 3, texto: 'tercer' },
  { valor: 4, texto: 'cuarto' }, { valor: -1, texto: 'último' },
];

/**
 * Constructor visual de la repetición: menús y botones para lo que antes solo
 * se podía escribir. El campo de texto sigue estando, porque escribir
 * "cada tercer viernes" es más rápido que tocar cuatro menús — pero ya no es
 * la única forma.
 */
export function constructorRepeticion(reglaInicial, alCambiar) {
  let regla = reglaInicial ? { ...reglaInicial } : null;
  const caja = el('div', { class: 'repeticion' });

  const emitir = () => { alCambiar(regla); pintar(); };

  function pintar() {
    const tipo = regla ? (regla.tipo === 'nEsimo' ? 'nEsimo' : regla.tipo) : 'ninguna';
    const numero = (etiqueta, valor, min, alPoner, ancho = 70) => el('label', { class: 'field', style: `width:${ancho}px` },
      el('span', { class: 'field-label' }, etiqueta),
      el('input', { class: 'input', type: 'number', min, value: valor, onChange: (e) => alPoner(Number(e.target.value)) }));

    const selTipo = el('select', { class: 'input', style: 'width:auto', onChange: (e) => { regla = reglaDeTipo(e.target.value, regla); emitir(); } },
      ...[['ninguna', 'No se repite'], ['diaria', 'Cada día'], ['semanal', 'Cada semana'],
        ['mensual', 'Cada mes'], ['anual', 'Cada año'], ['habiles', 'Días hábiles'], ['nEsimo', 'Un día concreto del mes']]
        .map(([v, txt]) => el('option', { value: v, selected: tipo === v }, txt)));

    const detalle = [];
    if (regla && ['diaria', 'semanal', 'mensual', 'anual'].includes(regla.tipo)) {
      const unidad = { diaria: 'días', semanal: 'semanas', mensual: 'meses', anual: 'años' }[regla.tipo];
      detalle.push(numero(`Cada cuántos ${unidad}`, regla.cada || 1, 1, (v) => { regla.cada = Math.max(1, v || 1); emitir(); }, 150));
    }
    if (regla?.tipo === 'semanal') {
      detalle.push(el('div', { class: 'field' },
        el('span', { class: 'field-label' }, 'Qué días'),
        el('div', { class: 'chip-list' },
          ...[1, 2, 3, 4, 5, 6, 0].map((d) => el('button', {
            class: `chip ${(regla.dias || []).includes(d) ? 'activa' : ''}`.trim(),
            onClick: () => {
              const dias = new Set(regla.dias || []);
              dias.has(d) ? dias.delete(d) : dias.add(d);
              regla.dias = [...dias].sort((a, b) => a - b);
              if (!regla.dias.length) delete regla.dias;
              emitir();
            },
          }, DIAS_CORTO[d])))));
    }
    if (regla?.tipo === 'mensual') {
      detalle.push(el('label', { class: 'field', style: 'width:170px' },
        el('span', { class: 'field-label' }, 'Qué día del mes'),
        el('select', { class: 'input', onChange: (e) => { regla.diaMes = e.target.value === 'ultimo' ? 'ultimo' : (Number(e.target.value) || null); emitir(); } },
          el('option', { value: '', selected: !regla.diaMes }, 'el mismo día'),
          ...Array.from({ length: 28 }, (_, i) => el('option', { value: i + 1, selected: regla.diaMes === i + 1 }, `día ${i + 1}`)),
          el('option', { value: 'ultimo', selected: regla.diaMes === 'ultimo' }, 'el último día'))));
    }
    if (regla?.tipo === 'anual') {
      detalle.push(el('label', { class: 'field', style: 'width:150px' },
        el('span', { class: 'field-label' }, 'Mes'),
        el('select', { class: 'input', onChange: (e) => { regla.mes = e.target.value === '' ? null : Number(e.target.value); emitir(); } },
          el('option', { value: '', selected: regla.mes == null }, '—'),
          ...MESES.map((m, i) => el('option', { value: i, selected: regla.mes === i }, m)))));
      detalle.push(numero('Día', regla.diaMes || 1, 1, (v) => { regla.diaMes = Math.min(31, Math.max(1, v || 1)); emitir(); }));
    }
    if (regla?.tipo === 'nEsimo') {
      detalle.push(el('label', { class: 'field', style: 'width:130px' },
        el('span', { class: 'field-label' }, 'Cuál'),
        el('select', { class: 'input', onChange: (e) => { regla.nEsimo = { ...regla.nEsimo, n: Number(e.target.value) }; emitir(); } },
          ...ORDINALES_REGLA.map((o) => el('option', { value: o.valor, selected: regla.nEsimo?.n === o.valor }, o.texto)))));
      detalle.push(el('label', { class: 'field', style: 'width:150px' },
        el('span', { class: 'field-label' }, 'Día'),
        el('select', { class: 'input', onChange: (e) => { regla.nEsimo = { ...regla.nEsimo, dia: Number(e.target.value) }; emitir(); } },
          ...[1, 2, 3, 4, 5, 6, 0].map((d) => el('option', { value: d, selected: regla.nEsimo?.dia === d }, DIAS[d])))));
    }

    const opciones = regla ? el('div', { class: 'fila', style: 'margin-top:4px' },
      el('label', { class: 'chip', style: 'cursor:pointer' },
        el('input', {
          type: 'checkbox', checked: !!regla.desdeCompletada,
          onChange: (e) => { regla.desdeCompletada = e.target.checked || undefined; emitir(); },
        }), 'contar desde que la completo'),
      el('label', { class: 'field', style: 'width:170px;margin:0' },
        el('span', { class: 'field-label' }, 'Dejar de repetir el'),
        el('input', {
          class: 'input', type: 'date', value: regla.hasta || '',
          onChange: (e) => { regla.hasta = e.target.value || undefined; emitir(); },
        }))) : null;

    const atajos = el('div', { class: 'chip-list', style: 'margin-top:6px' },
      ...['cada día hábil', 'cada lunes', 'cada 2 semanas', 'el 15 de cada mes',
        'el último día del mes', 'cada tercer viernes'].map((txt) => el('button', {
        class: 'chip', title: 'Atajo',
        onClick: () => { regla = parseRegla(txt); emitir(); },
      }, txt)));

    const libre = input(regla ? textoRegla(regla) : '', (v) => {
      const nueva = parseRegla(v);
      if (nueva) { regla = nueva; alCambiar(regla); }
      else if (!v.trim()) { regla = null; alCambiar(null); }
    }, { placeholder: 'o escríbelo: cada tercer viernes…' });

    const previa = el('p', { class: 'field-hint' }, regla
      ? `${textoRegla(regla)} → ${proximasFechas(regla, aISO(hoy()), 3).map((f) => textoRelativo(f)).join(', ')}`
      : 'No se repite.');

    render(caja,
      el('div', { class: 'fila' }, selTipo, ...detalle),
      opciones,
      atajos,
      el('div', { style: 'margin-top:6px' }, libre),
      previa);
  }

  pintar();
  return caja;
}

/** Crea una regla del tipo elegido conservando lo que tenga sentido conservar. */
function reglaDeTipo(tipo, anterior) {
  if (tipo === 'ninguna') return null;
  const base = { tipo, cada: anterior?.cada || 1 };
  if (anterior?.desdeCompletada) base.desdeCompletada = true;
  if (anterior?.hasta) base.hasta = anterior.hasta;
  if (tipo === 'semanal') base.dias = anterior?.dias || [diaSemanaDeHoy()];
  if (tipo === 'mensual') base.diaMes = typeof anterior?.diaMes === 'number' || anterior?.diaMes === 'ultimo' ? anterior.diaMes : null;
  if (tipo === 'anual') { base.mes = anterior?.mes ?? hoy().getMonth(); base.diaMes = typeof anterior?.diaMes === 'number' ? anterior.diaMes : hoy().getDate(); }
  if (tipo === 'nEsimo') base.nEsimo = anterior?.nEsimo || { n: 3, dia: 5 };
  if (tipo === 'habiles') base.cada = 1;
  return base;
}

function diaSemanaDeHoy() {
  return hoy().getDay();
}

/** Archivos pegados a la tarea: la foto del pizarrón vive con la tarea. */
function campoAdjuntos(tarea) {
  const lista = el('div', { class: 'chip-list' });
  const entrada = el('input', {
    type: 'file', multiple: true, style: 'display:none',
    onChange: async (e) => {
      for (const archivo of e.target.files || []) {
        try {
          await adjuntos.guardar(tarea.id, archivo);
        } catch (err) {
          toast(err.message || 'No se pudo guardar el archivo', 'warn');
        }
      }
      entrada.value = '';
      pintar();
    },
  });

  async function pintar() {
    let fichas = [];
    try {
      fichas = await adjuntos.listar(tarea.id);
    } catch {
      render(lista, el('span', { class: 'muted small' }, 'Este navegador no guarda archivos.'));
      return;
    }
    render(lista, ...fichas.map((f) => el('span', { class: 'chip' },
      el('button', {
        class: 'btn ghost chico', title: 'Abrir',
        onClick: async (e) => {
          e.preventDefault();
          const completo = await adjuntos.obtener(f.id);
          const url = adjuntos.urlDe(completo);
          window.open(url, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        },
      }, `📎 ${f.nombre}`),
      el('span', { class: 'muted small' }, adjuntos.tamañoLegible(f.bytes)),
      el('button', {
        class: 'btn ghost chico danger', title: 'Quitar',
        onClick: async (e) => { e.preventDefault(); await adjuntos.borrar(f.id); pintar(); },
      }, '✕'))));
  }
  pintar();

  return el('div', { class: 'field' },
    el('span', { class: 'field-label' }, 'Archivos'),
    lista,
    el('div', {}, button('📎 Adjuntar', () => entrada.click(), { variant: 'ghost chico' }), entrada));
}

/** Campos de "esto no depende de mí": quién, desde cuándo y hasta cuándo. */
function campoEspera(borrador, alGuardar, cerrar) {
  const caja = el('div', { class: 'field' });
  const pintar = () => {
    const e = borrador.espera;
    render(caja,
      el('span', { class: 'field-label' }, 'Esperando a alguien'),
      el('div', { class: 'fila' },
        input(e?.quien || '', (v) => {
          borrador.espera = { ...(borrador.espera || crearEspera()), quien: v };
        }, { placeholder: 'Coautor, revista, estudiante, banco…' }),
        e?.quien ? button('✕', () => { borrador.espera = null; pintar(); }, { variant: 'ghost chico' }) : null),
      e?.quien ? el('div', { class: 'fila' },
        el('label', { class: 'field', style: 'width:160px' },
          el('span', { class: 'field-label' }, 'Desde'),
          input(e.desde, (v) => { borrador.espera = { ...borrador.espera, desde: v }; }, { type: 'date' })),
        el('label', { class: 'field', style: 'width:160px' },
          el('span', { class: 'field-label' }, 'Plazo razonable'),
          input(e.limite, (v) => { borrador.espera = { ...borrador.espera, limite: v }; }, { type: 'date' })),
        button('Perseguir ahora', () => {
          store.agregar(tareaDePerseguir({ ...borrador }, aISO(hoy())));
          store.actualizar(borrador.id, { espera: { ...borrador.espera, perseguida: aISO(hoy()) } });
          toast('Tarea de seguimiento creada');
          cerrar();
          alGuardar();
        }, { variant: 'ghost chico' })) : null);
  };
  pintar();
  return caja;
}

/* ------------------------------------------------------------------ *
 * Piezas sueltas
 * ------------------------------------------------------------------ */

export function dato(valor, etiqueta, opciones = {}) {
  return el('div', { class: 'dato' },
    el('div', { class: `valor ${opciones.clase || ''}`.trim() }, String(valor)),
    el('div', { class: 'etiqueta' }, etiqueta),
    opciones.pie ? el('div', { class: 'etiqueta' }, opciones.pie) : null);
}

export function barra(pct, color) {
  return el('div', { class: 'barra' }, el('div', { style: `width:${Math.min(100, Math.max(0, pct))}%${color ? `;background:${color}` : ''}` }));
}

/** Gráfico de barras minúsculo para las series de 14 días. */
export function grafico(series, opciones = {}) {
  const max = Math.max(1, ...series.map((s) => s.valor));
  return el('div', { class: 'grafico' },
    ...series.map((s) => el('div', {
      class: s.destacado ? 'hoy' : '',
      style: `height:${Math.round((s.valor / max) * 100)}%`,
      title: `${s.etiqueta}: ${s.valor}`,
    })));
}

export function seccionChequeo(titulo, items, hechos, alMarcar) {
  return el('section', { class: 'card' },
    el('h2', { class: 'card-title' }, titulo),
    el('div', { class: 'lista-chequeo' },
      ...items.map((texto, i) => el('label', {},
        el('input', { type: 'checkbox', checked: hechos.includes(i), onChange: () => alMarcar(i) }),
        el('span', {}, texto)))));
}

export function tituloVista(titulo, subtitulo, ...extra) {
  return el('div', { class: 'cabecera-vista' },
    el('h1', {}, titulo),
    subtitulo ? el('span', { class: 'muted small' }, subtitulo) : null,
    estrellaFavorito(),
    ...extra);
}

/**
 * La estrella que fija esta vista en la barra lateral. Cuatro o cinco caben en
 * la cabeza; lo demás se busca, así que no hay lista de favoritos infinita:
 * simplemente se van quitando.
 */
export function estrellaFavorito(ruta = null) {
  const destino = ruta || ((location.hash || '#/hoy').slice(1).split('?')[0] || '/hoy');
  const boton = el('button', { class: 'btn ghost chico', title: 'Fijar en la barra lateral' });
  const pintar = () => {
    const fijada = (store.estado.ajustes.favoritos || []).includes(destino);
    boton.textContent = fijada ? '★' : '☆';
    boton.title = fijada ? 'Quitar de favoritos' : 'Fijar en la barra lateral';
  };
  boton.addEventListener('click', () => { store.alternarFavorito(destino); pintar(); });
  pintar();
  return boton;
}
