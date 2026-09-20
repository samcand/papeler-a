/**
 * componentes.js — Piezas de interfaz que se repiten en todas las vistas.
 * Se apoya en el `ui.js` de la app de alabanza: mismo estilo, cero framework.
 */

import { button, el, input, render, textarea, toast } from '../../src/ui.js';
import { aISO, deISO, finDeMes, hoy, inicioSemana, sumarDias, textoLargo, textoRelativo, DIAS_CORTO } from './fechas.js';
import { MODULOS, PRIORIDADES, descripcionCorta, ordenarTareas } from './modelo.js';
import { parseEntrada } from './naturales.js';
import { parseRegla, proximasFechas, textoRegla } from './recurrencia.js';
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
  const campo = input('', () => actualizarPrevia(), {
    placeholder: 'Ej.: Revisar tesis de NVDA mañana 9am p1 #Cartera cada tercer viernes',
  });
  const previa = el('p', { class: 'vista-previa' });

  function actualizarPrevia() {
    const txt = campo.value.trim();
    if (!txt) { previa.textContent = ''; return; }
    const p = parseEntrada(txt);
    const trozos = [];
    if (p.fecha) trozos.push(`<b>${textoRelativo(p.fecha)}</b>${p.hora ? ` a las <b>${p.hora}</b>` : ''}`);
    if (p.regla) trozos.push(`🔁 <b>${textoRegla(p.regla)}</b>`);
    if (p.prioridad) trozos.push(`<b>P${p.prioridad}</b>`);
    if (p.proyecto) trozos.push(`proyecto <b>${p.proyecto}</b>`);
    if (p.etiquetas.length) trozos.push(p.etiquetas.map((e) => `<b>@${e}</b>`).join(' '));
    if (p.duracion) trozos.push(`<b>${p.duracion} min</b>`);
    previa.innerHTML = trozos.length ? `“${p.titulo}” · ${trozos.join(' · ')}` : `“${p.titulo}” · sin fecha`;
  }

  function agregar() {
    const txt = campo.value.trim();
    if (!txt) return;
    const p = parseEntrada(txt);
    const tarea = store.agregar({
      titulo: p.titulo,
      fecha: p.fecha ?? porDefecto.fecha ?? null,
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
    if (e.key === 'Enter') { e.preventDefault(); agregar(); }
    if (e.key === 'Escape') { campo.value = ''; previa.textContent = ''; campo.blur(); }
  });
  campo.dataset.rapida = '1';

  return el('div', {},
    el('div', { class: 'rapida' }, campo, button('Añadir', agregar, { variant: 'primary' })),
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
  if (tarea.regla) meta.push(el('span', {}, '🔁 ' + textoRegla(tarea.regla)));
  if (tarea.duracion) meta.push(el('span', {}, `⏱ ${tarea.duracion} min`));
  if (tarea.tiempoDedicado) meta.push(el('span', {}, `🍅 ${tarea.tiempoDedicado} min`));
  if (tarea.proyecto) meta.push(el('span', {}, `# ${tarea.proyecto}`));
  for (const et of tarea.etiquetas || []) meta.push(el('span', { class: 'etiqueta' }, '@' + et));
  if (tarea.notas) meta.push(el('span', { title: tarea.notas }, '📝'));
  if (tarea.modulo) meta.unshift(el('span', { class: 'punto-modulo', style: `background:${colorModulo(tarea.modulo)}`, title: tarea.modulo }));

  const acciones = el('div', { class: 'tarea-acciones' },
    !tarea.completada ? button('📅', () => { store.aplazar(tarea.id, hoyISO); refrescar(); }, { variant: 'ghost chico', title: 'Mover a hoy' }) : null,
    !tarea.completada ? button('→', () => { store.aplazar(tarea.id, aISO(sumarDias(tarea.fecha || hoyISO, 1))); refrescar(); }, { variant: 'ghost chico', title: 'Posponer un día' }) : null,
    button('✎', () => panelTarea(tarea, refrescar), { variant: 'ghost chico', title: 'Editar' }),
    button('🗑', () => {
      if (!window.confirm(`¿Borrar “${tarea.titulo}”?`)) return;
      store.borrar(tarea.id);
      refrescar();
    }, { variant: 'ghost chico danger', title: 'Borrar' }));

  return el('div', { class: `tarea${tarea.completada ? ' hecha' : ''}${opciones.sub ? ' sub' : ''}`, dataset: { id: tarea.id } },
    casilla,
    el('div', { class: 'tarea-cuerpo', onClick: () => panelTarea(tarea, refrescar) },
      el('div', { class: 'tarea-titulo' }, tarea.titulo),
      meta.length ? el('div', { class: 'tarea-meta' }, ...meta) : null),
    acciones);
}

export function listaTareas(tareas, opciones = {}) {
  if (!tareas.length) return vacio(opciones.vacio || 'Nada por aquí.', opciones.icono);
  const orden = opciones.orden || store.estado.ajustes.ordenPorDefecto;
  const lista = el('div', { class: 'lista-tareas' });
  for (const t of ordenarTareas(tareas, orden)) {
    lista.append(itemTarea(t, opciones));
    if (opciones.conSubtareas) {
      for (const h of store.tareas.filter((x) => x.padre === t.id)) lista.append(itemTarea(h, { ...opciones, sub: true }));
    }
  }
  return lista;
}

export function vacio(mensaje, icono = '🌤️') {
  return el('div', { class: 'vacio' }, el('span', { class: 'grande' }, icono), el('p', {}, mensaje));
}

/* ------------------------------------------------------------------ *
 * Panel de edición
 * ------------------------------------------------------------------ */

/** Cajón lateral con todos los campos de la tarea. */
export function panelTarea(tarea, alGuardar = () => {}) {
  const borrador = { ...tarea, etiquetas: [...(tarea.etiquetas || [])] };
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

  const previaRegla = el('p', { class: 'field-hint' });
  function pintarPreviaRegla() {
    if (!borrador.regla) { previaRegla.textContent = 'No se repite.'; return; }
    const proximas = proximasFechas(borrador.regla, borrador.fecha || aISO(hoy()), 3);
    previaRegla.textContent = `${textoRegla(borrador.regla)} → ${proximas.map((f) => textoRelativo(f)).join(', ')}`;
  }
  pintarPreviaRegla();

  const selPrioridad = el('select', { class: 'input', onChange: (e) => { borrador.prioridad = Number(e.target.value); } });
  for (const p of PRIORIDADES) {
    selPrioridad.append(el('option', { value: p.valor, selected: p.valor === borrador.prioridad }, `${p.corto} — ${p.nombre}`));
  }

  const selModulo = el('select', { class: 'input', onChange: (e) => { borrador.modulo = e.target.value || null; } });
  selModulo.append(el('option', { value: '' }, '— sin módulo —'));
  for (const m of MODULOS) selModulo.append(el('option', { value: m.id, selected: m.id === borrador.modulo }, `${m.icono} ${m.nombre}`));

  const selProyecto = el('select', { class: 'input', onChange: (e) => { borrador.proyecto = e.target.value || null; } });
  selProyecto.append(el('option', { value: '' }, '— sin proyecto —'));
  for (const p of store.estado.proyectos) {
    selProyecto.append(el('option', { value: p.nombre, selected: p.nombre === borrador.proyecto }, p.nombre));
  }

  const campoRegla = input(borrador.regla ? textoRegla(borrador.regla) : '', (v) => {
    borrador.regla = parseRegla(v);
    pintarPreviaRegla();
  }, { placeholder: 'cada lunes, el 15 de cada mes, cada tercer viernes…' });

  render(cuerpo,
    campo('Título', input(borrador.titulo, (v) => { borrador.titulo = v; })),
    campo('Notas', textarea(borrador.notas, (v) => { borrador.notas = v; }, { rows: 4, placeholder: 'Contexto, enlaces, la tesis en dos líneas…' })),
    el('div', { class: 'fila' },
      el('div', { class: 'grow' }, campo('Fecha', input(borrador.fecha || '', (v) => { borrador.fecha = v || null; pintarPreviaRegla(); }, { type: 'date' }))),
      el('div', { class: 'grow' }, campo('Hora', input(borrador.hora || '', (v) => { borrador.hora = v || null; }, { type: 'time' })))),
    el('div', { class: 'fila' },
      el('div', { class: 'grow' }, campo('Prioridad', selPrioridad)),
      el('div', { class: 'grow' }, campo('Duración (min)', input(borrador.duracion || '', (v) => { borrador.duracion = Number(v) || null; }, { type: 'number', min: 0, step: 5 })))),
    el('div', { class: 'fila' },
      el('div', { class: 'grow' }, campo('Módulo', selModulo)),
      el('div', { class: 'grow' }, campo('Proyecto', selProyecto))),
    campo('Se repite', campoRegla),
    previaRegla,
    campo('Etiquetas', input((borrador.etiquetas || []).join(', '), (v) => {
      borrador.etiquetas = v.split(',').map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
    }, { placeholder: 'mercado, espera, tesis' })),
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
    ...extra);
}
