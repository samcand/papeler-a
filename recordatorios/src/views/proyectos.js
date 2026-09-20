/**
 * proyectos.js (vista) — Gestión de proyectos con diagrama de Gantt.
 *
 * Tres pestañas, como en un planificador de escritorio: el plan (tabla EDT +
 * Gantt con dependencias y ruta crítica), los recursos (quién está
 * sobrecargado) y el seguimiento (línea base, desviaciones y valor ganado).
 */

import { button, download, el, input, render, toast } from '../../../src/ui.js';
import { aISO, deISO, diferenciaDias, hoy as fechaHoy, sumarDias, textoRelativo, MESES_CORTO } from '../fechas.js';
import {
  PLANTILLAS_PROYECTO, TIPOS_DEPENDENCIA, aTareasDeAgenda, cambiarDuracion, cargaRecursos,
  casiCriticas, curvaS, desdePlantilla, desviaciones, diasHabiles, indiceDeFecha, margenHitos,
  moverTarea, nivelarRecursos, numerarEDT, problemasDePlan, programar, proyectoVacio,
  quitarRestriccion, resumenProyecto, tareaProyecto, tomarLineaBase, valorGanado,
} from '../proyectos.js';
import { dato, tituloVista, vacio } from '../componentes.js';
import { NIVELES as NIVELES_RIESGO, alcanceQueCrece, nivelRiesgo, riesgoNuevo, riesgosVivos, tareaDeRiesgo } from '../riesgos.js';
import { probabilidadDeLlegar, queSiPasa, resumenQueSiPasa, simularAusencia, simularProyecto } from '../simulacion.js';
import { calibracion } from '../calibracion.js';
import { store } from '../store.js';

const ALTO_FILA = 30;
const ESCALAS = { dia: 26, semana: 9, mes: 3 };

export function vistaProyectos(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let pestana = ctx.query?.tab || 'plan';
  let escala = 'semana';
  let seleccionado = ctx.query?.p || store.estado.planes[0]?.id || null;
  let nivelacion = null;   // resultado de la última nivelación, para poder deshacerla
  const escenario = { tareaId: null, modo: 'retraso', valor: 5 };
  const ausencia = { recurso: null, desde: null, hasta: null };

  const proyecto = () => store.estado.planes.find((p) => p.id === seleccionado) || null;
  const guardar = () => { store.guardar(); pintar(); };

  /* ------------------------- tabla del plan ------------------------- */

  function tablaPlan(plan, p) {
    const nivel = (t) => {
      let n = 0;
      let actual = p.tareas.find((x) => x.id === t.id);
      while (actual?.padre) { n++; actual = p.tareas.find((x) => x.id === actual.padre); }
      return n;
    };
    const nombres = new Map(p.tareas.map((t) => [t.id, t.nombre]));
    const edt = numerarEDT(p.tareas);

    return el('div', { class: 'tabla-scroll' },
      el('table', { class: 'tabla tabla-plan' },
        el('thead', {}, el('tr', {},
          ...['EDT', 'Tarea', 'Días', 'Opt.', 'Pes.', 'Reales', 'Comienzo', 'Fin', '%', 'Recurso', 'Coste', 'Depende de', 'Holgura', ''].map((h) => el('th', {}, h)))),
        el('tbody', {},
          ...plan.tareas.map((t) => {
            const original = p.tareas.find((x) => x.id === t.id);
            const editable = (campo, tipo = 'text', ancho = 70, opciones = {}) => el('input', {
              class: 'input', style: `width:${ancho}px;padding:4px 6px`, type: tipo,
              value: original[campo] ?? '', ...opciones,
              onChange: (e) => {
                original[campo] = tipo === 'number' ? Number(e.target.value) || 0 : e.target.value;
                guardar();
              },
            });
            return el('tr', { class: t.critica && !t.resumen ? 'fila-critica' : '' },
              el('td', { class: 'muted small' }, t.edt),
              el('td', {},
                el('div', { style: `padding-left:${nivel(t) * 16}px;display:flex;align-items:center;gap:6px` },
                  el('span', {}, t.resumen ? '▾' : t.esHito ? '◆' : ''),
                  el('input', {
                    class: 'input', style: `width:220px;padding:4px 6px;${t.resumen ? 'font-weight:600' : ''}`,
                    value: original.nombre,
                    onChange: (e) => { original.nombre = e.target.value; guardar(); },
                  }))),
              el('td', {}, t.resumen ? el('span', { class: 'muted' }, String(t.duracion)) : editable('duracion', 'number', 60, { min: 0 })),
              el('td', {}, t.resumen ? '' : editable('optimista', 'number', 55, { min: 0, title: 'Duración si todo sale bien' })),
              el('td', {}, t.resumen ? '' : editable('pesimista', 'number', 55, { min: 0, title: 'Duración si se tuerce' })),
              el('td', {}, t.resumen ? '' : editable('diasReales', 'number', 60, { min: 0, title: 'Días de trabajo que te ha costado de verdad' })),
              el('td', { class: 'small' },
                formatoCorto(t.inicio),
                original.noAntesDe ? el('button', {
                  class: 'btn ghost chico', title: `Fijada al ${original.noAntesDe}. Quitar la fecha fija.`,
                  onClick: () => { quitarRestriccion(p, original.id); guardar(); },
                }, '📌') : null),
              el('td', { class: 'small' }, formatoCorto(t.fin)),
              el('td', {}, t.resumen ? el('span', { class: 'muted' }, `${t.avance} %`) : editable('avance', 'number', 60, { min: 0, max: 100, step: 5 })),
              el('td', {}, t.resumen ? '' : editable('recurso', 'text', 110)),
              el('td', {}, t.resumen ? '' : editable('costo', 'number', 90)),
              el('td', { class: 'dependencias' }, t.resumen ? '' : celdaDependencias(original, p, nombres, edt)),
              el('td', { class: `small ${t.critica ? 'negativo' : 'muted'}` },
                t.resumen ? '' : (t.critica ? 'crítica' : `${t.holgura} d`)),
              el('td', {}, el('div', { class: 'fila', style: 'gap:2px;flex-wrap:nowrap' },
                button('→', () => indentar(original, p), { variant: 'ghost chico', title: 'Convertir en subtarea de la anterior' }),
                button('←', () => desindentar(original, p), { variant: 'ghost chico', title: 'Sacar un nivel' }),
                button('🗑', () => borrarTarea(original, p), { variant: 'ghost chico danger', title: 'Borrar' }))));
          }))));
  }

  function celdaDependencias(tarea, p, nombres, edt) {
    const candidatas = p.tareas.filter((x) => x.id !== tarea.id && !p.tareas.some((h) => h.padre === x.id));
    return el('div', { class: 'fila dep-controles' },
      ...(tarea.dependencias || []).map((d, i) => el('span', { class: 'chip' },
        `${edt.get(d.de) || '?'} ${d.tipo || 'FC'}${d.desfase ? (d.desfase > 0 ? `+${d.desfase}` : d.desfase) : ''}`,
        el('button', {
          class: 'btn ghost chico', title: nombres.get(d.de) || 'tarea borrada',
          onClick: () => { tarea.dependencias.splice(i, 1); guardar(); },
        }, '✕'))),
      el('select', {
        class: 'input', style: 'width:70px;padding:3px 4px',
        onChange: (e) => {
          if (!e.target.value) return;
          tarea.dependencias = [...(tarea.dependencias || []), { de: e.target.value, tipo: 'FC', desfase: 0 }];
          guardar();
        },
      }, el('option', { value: '' }, '+'), ...candidatas.map((c) => el('option', { value: c.id }, `${edt.get(c.id)} ${c.nombre}`.slice(0, 28)))),
      (tarea.dependencias || []).length ? el('select', {
        class: 'input', style: 'width:64px;padding:3px 4px',
        title: 'Tipo de la última dependencia',
        onChange: (e) => {
          tarea.dependencias[tarea.dependencias.length - 1].tipo = e.target.value;
          guardar();
        },
      }, ...TIPOS_DEPENDENCIA.map((t) => el('option', {
        value: t.id, selected: t.id === tarea.dependencias[tarea.dependencias.length - 1].tipo, title: t.descripcion,
      }, t.id))) : null,
      (tarea.dependencias || []).length ? el('input', {
        class: 'input', style: 'width:52px;padding:3px 4px', type: 'number', title: 'Desfase en días (puede ser negativo)',
        value: tarea.dependencias[tarea.dependencias.length - 1].desfase || 0,
        onChange: (e) => { tarea.dependencias[tarea.dependencias.length - 1].desfase = Number(e.target.value) || 0; guardar(); },
      }) : null);
  }

  function indentar(tarea, p) {
    const i = p.tareas.indexOf(tarea);
    if (i <= 0) { toast('La primera tarea no puede ser subtarea', 'warn'); return; }
    const anterior = p.tareas[i - 1];
    tarea.padre = anterior.id;
    // Una tarea resumen no lleva dependencias propias: pasan a la hija.
    if (anterior.dependencias?.length) {
      tarea.dependencias = [...(tarea.dependencias || []), ...anterior.dependencias];
      anterior.dependencias = [];
    }
    guardar();
  }

  function desindentar(tarea, p) {
    if (!tarea.padre) return;
    const padre = p.tareas.find((x) => x.id === tarea.padre);
    tarea.padre = padre?.padre || null;
    guardar();
  }

  function borrarTarea(tarea, p) {
    if (!window.confirm(`¿Borrar “${tarea.nombre}”?`)) return;
    const fuera = new Set([tarea.id]);
    let creció = true;
    while (creció) {
      creció = false;
      for (const t of p.tareas) if (t.padre && fuera.has(t.padre) && !fuera.has(t.id)) { fuera.add(t.id); creció = true; }
    }
    p.tareas = p.tareas.filter((t) => !fuera.has(t.id));
    for (const t of p.tareas) t.dependencias = (t.dependencias || []).filter((d) => !fuera.has(d.de));
    guardar();
  }

  /* ---------------------------- el Gantt ---------------------------- */

  function gantt(plan, p) {
    if (!plan.tareas.length) return null;
    const px = ESCALAS[escala];
    const inicio = plan.inicio;
    const finReal = plan.tareas.reduce((max, t) => (t.fin > max ? t.fin : max), plan.fin);
    const dias = Math.max(7, diferenciaDias(inicio, finReal) + 3);
    // Margen a la derecha para que quepa el nombre escrito junto a la barra.
    const margenEtiquetas = 200;
    const ancho = dias * px + margenEtiquetas;
    const alto = plan.tareas.length * ALTO_FILA + 30;
    const x = (fecha) => diferenciaDias(inicio, fecha) * px;
    const y = (i) => 30 + i * ALTO_FILA;

    const lienzo = svg('svg', { class: 'gantt', width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    const defs = svg('defs');
    const marcador = svg('marker', { id: 'flecha', markerWidth: 7, markerHeight: 7, refX: 6, refY: 3, orient: 'auto' });
    marcador.append(svg('path', { d: 'M0,0 L6,3 L0,6 z', fill: 'var(--muted)' }));
    defs.append(marcador);
    lienzo.append(defs);

    // Rejilla y cabecera de fechas
    for (let d = 0; d <= dias; d++) {
      const fecha = aISO(sumarDias(inicio, d));
      const diaSemana = deISO(fecha).getDay();
      const finde = diaSemana === 0 || diaSemana === 6;
      if (finde && px > 6) {
        lienzo.append(svg('rect', { x: d * px, y: 24, width: px, height: alto - 24, fill: 'var(--bg-soft)', opacity: 0.55 }));
      }
      const marcaMes = deISO(fecha).getDate() === 1;
      if (marcaMes || (escala === 'dia' && diaSemana === 1) || (escala !== 'dia' && d % 7 === 0)) {
        lienzo.append(svg('line', { x1: d * px, y1: 24, x2: d * px, y2: alto, stroke: 'var(--line)', 'stroke-width': marcaMes ? 1.4 : 0.5 }));
        const etiqueta = svg('text', { x: d * px + 3, y: 16, fill: 'var(--muted)', 'font-size': 10 });
        etiqueta.textContent = marcaMes
          ? `${MESES_CORTO[deISO(fecha).getMonth()]}`
          : (escala === 'mes' ? '' : `${deISO(fecha).getDate()}`);
        lienzo.append(etiqueta);
      }
    }

    // Línea de hoy
    if (hoyISO >= inicio && hoyISO <= aISO(sumarDias(inicio, dias))) {
      lienzo.append(svg('line', { x1: x(hoyISO), y1: 20, x2: x(hoyISO), y2: alto, stroke: 'var(--accent-2)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
    }

    // Barras (arrastrables: mover la tarea o estirar su duración)
    const posicion = new Map();
    plan.tareas.forEach((t, i) => {
      const x0 = x(t.inicio);
      const x1 = x(t.fin) + px;
      const centro = y(i) + ALTO_FILA / 2;
      posicion.set(t.id, { x0, x1, centro });
      const grupo = svg('g', { class: 'gantt-barra' });

      if (t.esHito) {
        grupo.append(svg('path', {
          d: `M${x0} ${centro - 7} L${x0 + 7} ${centro} L${x0} ${centro + 7} L${x0 - 7} ${centro} Z`,
          fill: t.critica ? 'var(--p1)' : 'var(--accent)',
        }));
      } else if (t.resumen) {
        grupo.append(svg('rect', { x: x0, y: centro - 4, width: Math.max(2, x1 - x0), height: 8, fill: 'var(--muted)', rx: 2 }));
      } else {
        const color = t.critica ? 'var(--p1)' : 'var(--accent)';
        grupo.append(svg('rect', { x: x0, y: centro - 8, width: Math.max(2, x1 - x0), height: 16, rx: 4, fill: color, opacity: 0.3 }));
        if (t.avance > 0) {
          grupo.append(svg('rect', { x: x0, y: centro - 8, width: Math.max(2, (x1 - x0) * (t.avance / 100)), height: 16, rx: 4, fill: color }));
        }
        grupo.append(svg('rect', { x: x0, y: centro - 8, width: Math.max(2, x1 - x0), height: 16, rx: 4, fill: 'none', stroke: color, 'stroke-width': 1 }));
      }
      if (t.noAntesDe) {
        // Chincheta: esta tarea está fijada a una fecha, no solo colgada de sus dependencias.
        const pin = svg('text', { x: x0 - 13, y: centro + 4, 'font-size': 10 });
        pin.textContent = '📌';
        grupo.append(pin);
      }

      const texto = svg('text', { x: x1 + 6, y: centro + 4, fill: 'var(--text)', 'font-size': 11 });
      const etiqueta = `${t.nombre}${t.avance ? ` · ${t.avance} %` : ''}`;
      texto.textContent = etiqueta.length > 34 ? etiqueta.slice(0, 33) + '…' : etiqueta;
      grupo.append(texto);

      if (!t.resumen) {
        const tirador = svg('rect', {
          class: 'gantt-tirador', x: x1 - 5, y: centro - 8, width: 8, height: 16, rx: 2,
          fill: 'transparent', style: 'cursor:ew-resize',
        });
        if (!t.esHito) grupo.append(tirador);
        grupo.setAttribute('style', 'cursor:grab;touch-action:none');
        // `append` no devuelve el nodo: el título se crea aparte y luego se cuelga.
        const pista = svg('title');
        pista.textContent = `${t.nombre}\n${t.inicio} → ${t.fin}`
          + `${t.critica ? '\nRuta crítica' : `\nHolgura: ${t.holgura} días`}`
          + `${t.noAntesDe ? `\nFijada al ${t.noAntesDe}` : ''}`
          + '\nArrastra para mover; el borde derecho para cambiar la duración.';
        grupo.append(pista);
        hacerArrastrable(grupo, tirador, t, px, plan, p);
      }
      lienzo.append(grupo);
    });

    // Flechas de dependencia
    plan.tareas.forEach((t) => {
      for (const d of (p.tareas.find((x2) => x2.id === t.id)?.dependencias) || []) {
        const desde = posicion.get(d.de);
        const hasta = posicion.get(t.id);
        if (!desde || !hasta) continue;
        const salida = (d.tipo === 'CC' || d.tipo === 'CF') ? desde.x0 : desde.x1;
        const entrada = (d.tipo === 'FF' || d.tipo === 'CF') ? hasta.x1 : hasta.x0;
        const medio = Math.max(salida + 6, entrada - 8);
        lienzo.append(svg('polyline', {
          points: `${salida},${desde.centro} ${medio},${desde.centro} ${medio},${hasta.centro} ${entrada - 3},${hasta.centro}`,
          fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1, 'marker-end': 'url(#flecha)', opacity: 0.8,
        }));
      }
    });

    return el('div', { class: 'gantt-caja' }, lienzo);
  }

  /**
   * Arrastre de una barra del Gantt.
   *
   * Mientras se arrastra solo se mueve el dibujo (no se recalcula nada, que
   * sería lento y mareante); al soltar se traduce la posición a una fecha, se
   * aplica y se vuelve a programar el plan entero.
   */
  function hacerArrastrable(grupo, tirador, tarea, px, plan, p) {
    let inicioX = 0;
    let modo = null;
    let movido = false;
    let anchos = [];          // anchura original de cada barra, para estirarlas en vivo

    const alMover = (e) => {
      if (!modo) return;
      const dx = e.clientX - inicioX;
      movido = movido || Math.abs(dx) > 3;
      if (modo === 'mover') {
        grupo.setAttribute('transform', `translate(${dx},0)`);
        return;
      }
      // Redimensionar: la barra se estira con el ratón para ver hasta dónde llega.
      for (const { nodo, ancho } of anchos) {
        nodo.setAttribute('width', String(Math.max(2, ancho + dx)));
      }
      const etiqueta = grupo.querySelector('text:not([font-size="10"])');
      if (etiqueta) etiqueta.setAttribute('x', String(Number(etiqueta.dataset.x || etiqueta.getAttribute('x')) + dx));
    };

    const alSoltar = (e) => {
      if (!modo) { limpiar(); return; }
      const dx = e.clientX - inicioX;
      const dias = Math.round(dx / px);
      if (movido && dias !== 0) {
        if (modo === 'mover') {
          // De píxeles a días naturales, y de ahí a días hábiles del proyecto.
          const nuevaFecha = aISO(sumarDias(tarea.inicio, dias));
          const cal = p.calendario;
          const delta = indiceDeFecha(p.inicio, nuevaFecha, cal) - tarea.indiceInicio;
          if (delta !== 0) {
            moverTarea(p, tarea.id, delta, plan);
            toast(`${tarea.nombre}: fijada al ${nuevaFecha}`);
          }
        } else {
          const nuevoFin = aISO(sumarDias(tarea.fin, dias));
          if (nuevoFin >= tarea.inicio) {
            cambiarDuracion(p, tarea.id, diasHabiles(tarea.inicio, nuevoFin, p.calendario));
          } else {
            cambiarDuracion(p, tarea.id, 0);
          }
        }
        guardar();
      } else {
        limpiar();
      }
    };

    const limpiar = () => {
      modo = null;
      movido = false;
      anchos = [];
      grupo.removeAttribute('transform');
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alSoltar);
    };

    const empezar = (e, cual) => {
      e.preventDefault();
      e.stopPropagation();
      modo = cual;
      movido = false;
      inicioX = e.clientX;
      anchos = [...grupo.querySelectorAll('rect')]
        .filter((r) => !r.classList.contains('gantt-tirador'))
        .map((nodo) => ({ nodo, ancho: Number(nodo.getAttribute('width')) || 0 }));
      window.addEventListener('pointermove', alMover);
      window.addEventListener('pointerup', alSoltar, { once: true });
    };

    grupo.addEventListener('pointerdown', (e) => empezar(e, 'mover'));
    tirador?.addEventListener('pointerdown', (e) => empezar(e, 'redimensionar'));
  }

  /* ---------------------------- pestañas ---------------------------- */

  function panelPlan(p) {
    const plan = programar(p);
    const resumen = resumenProyecto(plan);

    return el('div', {},
      el('div', { class: 'fila', style: 'margin-bottom:10px' },
        el('label', { class: 'field', style: 'width:220px' },
          el('span', { class: 'field-label' }, 'Nombre'),
          el('input', { class: 'input', value: p.nombre, onChange: (e) => { p.nombre = e.target.value; guardar(); } })),
        el('label', { class: 'field', style: 'width:160px' },
          el('span', { class: 'field-label' }, 'Comienzo'),
          el('input', { class: 'input', type: 'date', value: p.inicio, onChange: (e) => { p.inicio = e.target.value; guardar(); } })),
        el('label', { class: 'field', style: 'width:200px' },
          el('span', { class: 'field-label' }, 'Festivos (aaaa-mm-dd, separados por coma)'),
          el('input', {
            class: 'input', value: (p.calendario?.feriados || []).join(', '),
            onChange: (e) => {
              p.calendario = { ...(p.calendario || {}), feriados: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) };
              guardar();
            },
          })),
        el('label', { class: 'field', style: 'width:150px' },
          el('span', { class: 'field-label' }, 'Escala'),
          el('select', { class: 'input', onChange: (e) => { escala = e.target.value; pintar(); } },
            ...[['dia', 'Días'], ['semana', 'Semanas'], ['mes', 'Meses']].map(([v, txt]) =>
              el('option', { value: v, selected: escala === v }, txt))))),

      el('div', { class: 'tarjetas' },
        dato(`${resumen.duracion} d`, 'duración (hábiles)', { pie: `${formatoCorto(resumen.inicio)} → ${formatoCorto(resumen.fin)}` }),
        dato(`${resumen.avance} %`, 'avance del plan'),
        dato(resumen.criticas, 'tareas críticas', { pie: `de ${resumen.tareas}`, clase: 'negativo' }),
        dato(resumen.hitos, 'hitos'),
        dato(resumen.costo ? resumen.costo.toLocaleString('es') : '—', 'coste previsto')),

      plan.errores.length ? el('section', { class: 'card', style: 'margin-top:12px' },
        el('h2', { class: 'card-title' }, 'Hay que arreglar esto'),
        ...plan.errores.map((e) => el('div', { class: 'alerta alto' }, el('div', {}, e.texto)))) : null,

      panelAvisosPlan(plan, p),

      plan.ciclo ? null : el('section', { class: 'card', style: 'margin-top:12px;padding:10px' },
        el('h2', { class: 'card-title' }, 'Diagrama de Gantt'),
        el('p', { class: 'muted small' }, 'En rojo, la ruta crítica: si una de esas tareas se retrasa un día, el proyecto entero se retrasa un día.'),
        gantt(plan, p)),

      el('section', { class: 'card', style: 'margin-top:12px' },
        el('h2', { class: 'card-title' }, 'Tareas'),
        tablaPlan(plan, p),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('+ Tarea', () => { p.tareas.push(tareaProyecto({ nombre: 'Tarea nueva', duracion: 1 })); guardar(); }),
          button('+ Hito', () => { p.tareas.push(tareaProyecto({ nombre: 'Hito', duracion: 0 })); guardar(); }),
          button('+ Fase (resumen)', () => {
            const fase = tareaProyecto({ nombre: 'Fase nueva' });
            p.tareas.push(fase);
            p.tareas.push(tareaProyecto({ nombre: 'Primera tarea de la fase', duracion: 1, padre: fase.id }));
            guardar();
          }),
          button('🔗 Encadenar todas', () => {
            const hojas = p.tareas.filter((t) => !p.tareas.some((h) => h.padre === t.id));
            hojas.forEach((t, i) => { t.dependencias = i === 0 ? [] : [{ de: hojas[i - 1].id, tipo: 'FC', desfase: 0 }]; });
            guardar();
            toast('Encadenadas una detrás de otra');
          }, { variant: 'ghost' }),
          button('📋 Llevar a la agenda', () => {
            const n = store.sembrarTareas(aTareasDeAgenda(plan, p), `plan-${p.id}`);
            toast(n ? `${n} tareas añadidas a tu agenda` : 'Ya estaban en la agenda');
          }, { variant: 'primary' }),
          button('⬇ CSV', () => {
            const filas = [['EDT', 'Tarea', 'Duracion', 'Comienzo', 'Fin', 'Avance', 'Recurso', 'Holgura', 'Critica']];
            for (const t of plan.tareas) filas.push([t.edt, t.nombre, t.duracion, t.inicio, t.fin, t.avance, t.recurso || '', t.holgura ?? '', t.critica ? 'sí' : 'no']);
            download(`${p.nombre}.csv`, filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
          }, { variant: 'ghost' }))));
  }

  /**
   * Lo que el Gantt no enseña: lo que no cabe antes de la fecha comprometida, lo
   * que flota sin depender de nada y lo que tiene tan poca holgura que da igual
   * que no sea crítico.
   */
  function panelAvisosPlan(plan, p) {
    const problemas = problemasDePlan(plan, p);
    const casi = casiCriticas(plan, 3);
    const hitos = margenHitos(plan);
    if (!problemas.length && !casi.length && !hitos.length) return null;

    return el('section', { class: 'card', style: 'margin-top:12px' },
      el('h2', { class: 'card-title' }, 'Avisos del cronograma'),
      ...problemas.map((x) => el('div', { class: `alerta ${x.gravedad}` },
        el('div', {}, el('div', {}, x.texto), el('div', { class: 'accion' }, x.accion)))),

      casi.length ? el('div', { style: 'margin-top:8px' },
        el('p', { class: 'field-label' }, 'Ruta casi crítica (tres días o menos de holgura)'),
        el('div', { class: 'chip-list' },
          ...casi.map((t) => el('span', { class: 'chip', style: 'border-color:var(--warn)' },
            `${t.nombre} · ${t.holgura} d`))),
        el('p', { class: 'muted small' }, 'Se pintan como no críticas, pero cualquier tropiezo las mete en la ruta crítica.')) : null,

      hitos.length ? el('div', { style: 'margin-top:10px' },
        el('p', { class: 'field-label' }, 'Margen hasta cada hito'),
        ...hitos.map((h) => el('p', { class: `small ${h.critica ? 'negativo' : 'muted'}`, style: 'margin:2px 0' },
          `🏁 ${formatoCorto(h.fecha)} · ${h.texto}`))) : null);
  }

  function panelRecursos(p) {
    const plan = programar(p);
    const carga = cargaRecursos(plan);
    const sinRecurso = plan.tareas.filter((t) => !t.resumen && !t.recurso);

    return el('div', {},
      carga.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Carga por recurso'),
        el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Recurso'), el('th', { class: 'num' }, 'Tareas'),
            el('th', { class: 'num' }, 'Días ocupados'), el('th', { class: 'num' }, 'Pico'), el('th', {}, 'Estado'))),
          el('tbody', {}, ...carga.map((r) => el('tr', {},
            el('td', {}, r.recurso),
            el('td', { class: 'num' }, String(r.tareas)),
            el('td', { class: 'num' }, String(r.diasOcupados)),
            el('td', { class: `num ${r.sobreasignado ? 'negativo' : ''}` }, `${r.picoCarga} %`),
            el('td', { class: r.sobreasignado ? 'negativo' : 'positivo' },
              r.sobreasignado ? `sobreasignado ${r.diasSobreasignados.length} días` : 'bien')))))) : vacio('Pon un recurso en las tareas para ver la carga.', '👥'),

      carga.some((r) => r.sobreasignado) || nivelacion ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Nivelación automática'),
        el('p', { class: 'muted small' },
          'Retrasa las tareas que tienen holgura hasta que nadie esté en dos sitios a la vez. ',
          'No toca la ruta crítica salvo que lo pidas, porque eso retrasaría el proyecto entero.'),
        el('div', { class: 'fila' },
          button('Nivelar con la holgura disponible', () => ejecutarNivelacion(false), { variant: 'primary' }),
          button('Nivelar aunque retrase el proyecto', () => ejecutarNivelacion(true), { variant: 'ghost' }),
          nivelacion?.movimientos.length ? button('Deshacer', () => {
            for (const m of nivelacion.movimientos) quitarRestriccion(p, m.id);
            nivelacion = null;
            guardar();
            toast('Nivelación deshecha');
          }, { variant: 'ghost danger' }) : null),

        nivelacion ? el('div', { style: 'margin-top:12px' },
          nivelacion.movimientos.length ? el('table', { class: 'tabla' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Tarea'), el('th', {}, 'Recurso'),
              el('th', { class: 'num' }, 'Días'), el('th', {}, 'Va después de'))),
            el('tbody', {}, ...nivelacion.movimientos.map((m) => el('tr', {},
              el('td', {}, m.tarea),
              el('td', { class: 'muted' }, m.recurso),
              el('td', { class: 'num' }, `+${m.dias}`),
              el('td', { class: 'muted' }, m.despuesDe)))))
            : el('p', { class: 'muted small' }, 'No hizo falta mover nada.'),
          ...nivelacion.pendientes.map((x) => el('div', { class: 'alerta medio' },
            el('div', {}, el('div', {}, `${x.recurso}: sigue habiendo choque`), el('div', { class: 'accion' }, x.motivo)))),
          nivelacion.resuelto ? el('p', { class: 'positivo small' }, 'Ya no hay nadie sobreasignado.') : null) : null) : null,

      carga.some((r) => r.sobreasignado) ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Si prefieres resolverlo a mano'),
        el('ul', { class: 'small muted' },
          el('li', {}, 'Retrasar la tarea con holgura hasta que el recurso se libere (nivelación manual).'),
          el('li', {}, 'Bajar el porcentaje de dedicación si de verdad puede repartirse entre dos cosas.'),
          el('li', {}, 'Alargar la duración en vez de solapar: ocho horas al día no se estiran.'),
          el('li', {}, 'Aceptar y dejarlo escrito, que también es una decisión.'))) : null,

      sinRecurso.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `Sin recurso asignado (${sinRecurso.length})`),
        el('div', { class: 'chip-list' }, ...sinRecurso.map((t) => el('span', { class: 'chip' }, t.nombre)))) : null);
  }

  /**
   * Fecha probabilística y escenarios. Una fecha exacta es una mentira cómoda:
   * aquí sale la distribución y lo que costaría mover algo.
   */
  function panelRiesgo(p) {
    const cal = calibracion(store.tareas, store.estado.tiempo);
    const factor = cal.suficiente ? Math.max(1.1, cal.factor) : 1.5;
    const sim = simularProyecto(p, { n: 2000, semilla: 7, factor });
    const objetivo = p.fechaObjetivo || null;
    const prob = objetivo && sim.posible ? probabilidadDeLlegar(sim, objetivo, p) : null;

    if (!sim.posible) return el('div', { class: 'alerta alto' }, el('div', {}, sim.motivo));

    const maxBarra = Math.max(...sim.histograma.map((h) => h.n));
    return el('div', {},
      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Cuándo terminas de verdad'),
        el('p', { class: 'muted small' },
          `2.000 simulaciones con tus tres duraciones por tarea. La pesimista, donde no la has escrito, sale de tu factor medido (×${factor}).`),
        el('div', { class: 'tarjetas' },
          dato(formatoCorto(sim.deterministico.fecha), 'el plan dice', { pie: `${sim.deterministico.dias} días` }),
          dato(formatoCorto(sim.fechas.p50), 'P50 · la mitad de las veces', { pie: `${sim.dias.p50} días` }),
          dato(formatoCorto(sim.fechas.p80), 'P80 · la que puedes prometer', { clase: 'positivo', pie: `${sim.dias.p80} días` }),
          dato(`${sim.colchon} d`, 'colchón que falta', { clase: sim.colchon > 0 ? 'negativo' : 'positivo', pie: 'sobre la fecha del plan' })),

        el('div', { class: 'histograma', style: 'margin-top:14px' },
          ...sim.histograma.map((h) => el('div', {
            class: 'columna-hist', title: `${h.n} escenarios terminan hacia el ${h.fecha}`,
          }, el('div', { style: `height:${Math.round((h.n / maxBarra) * 100)}%` }), el('span', { class: 'muted' }, formatoCorto(h.fecha))))),

        el('div', { class: 'fila', style: 'margin-top:14px' },
          el('label', { class: 'field', style: 'width:200px;margin:0' },
            el('span', { class: 'field-label' }, '¿A qué fecha te comprometes?'),
            el('input', {
              class: 'input', type: 'date', value: objetivo || '',
              onChange: (e) => { p.fechaObjetivo = e.target.value || null; guardar(); },
            }))),
        prob ? el('div', { class: `alerta ${prob.probabilidad >= 80 ? 'bajo' : prob.probabilidad >= 50 ? 'medio' : 'alto'}`, style: 'margin-top:10px' },
          el('div', {}, el('div', {}, `${prob.probabilidad} % de probabilidad`), el('div', { class: 'accion' }, prob.frase))) : null),

      panelQueSiPasa(p));
  }

  /** ¿Qué pasa si…? Se calcula sobre una copia: el plan real no se toca. */
  function panelQueSiPasa(p) {
    const plan = programar(p);
    const hojas = plan.tareas.filter((t) => !t.resumen);
    const resultado = escenario.tareaId ? queSiPasa(p, [escenario.modo === 'duracion'
      ? { tareaId: escenario.tareaId, duracion: escenario.valor }
      : { tareaId: escenario.tareaId, dias: escenario.valor }]) : null;

    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, '¿Qué pasa si…?'),
      el('div', { class: 'fila' },
        el('select', {
          class: 'input', style: 'max-width:260px',
          onChange: (e) => { escenario.tareaId = e.target.value || null; pintar(); },
        }, el('option', { value: '' }, '— elige una tarea —'),
        ...hojas.map((t) => el('option', { value: t.id, selected: t.id === escenario.tareaId }, `${t.edt} ${t.nombre}`))),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { escenario.modo = e.target.value; escenario.valor = e.target.value === 'duracion' ? 10 : 5; pintar(); },
        },
        el('option', { value: 'retraso', selected: escenario.modo === 'retraso' }, 'se retrasa'),
        el('option', { value: 'duracion', selected: escenario.modo === 'duracion' }, 'dura en total')),
        el('input', {
          class: 'input', type: 'number', style: 'width:90px', value: escenario.valor, min: 0,
          onChange: (e) => { escenario.valor = Number(e.target.value) || 0; pintar(); },
        }),
        el('span', { class: 'muted' }, 'días')),

      resultado?.posible ? el('div', { style: 'margin-top:12px' },
        el('p', { class: resultado.diasProyecto > 0 ? 'negativo' : 'positivo' }, resumenQueSiPasa(resultado)),
        resultado.movidas.length ? el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Tarea'), el('th', {}, 'Antes'), el('th', {}, 'Después'), el('th', { class: 'num' }, 'Días'))),
          el('tbody', {}, ...resultado.movidas.map((m) => el('tr', {},
            el('td', {}, m.esHito ? `🏁 ${m.nombre}` : m.nombre, m.directa ? el('span', { class: 'chip', style: 'margin-left:6px' }, 'el cambio') : null),
            el('td', { class: 'small muted' }, formatoCorto(m.antesInicio)),
            el('td', { class: 'small' }, formatoCorto(m.ahoraInicio)),
            el('td', { class: `num ${m.dias > 0 ? 'negativo' : 'positivo'}` }, m.dias ? `${m.dias > 0 ? '+' : ''}${m.dias}` : '—')))))
          : null,
        resultado.nuevasCriticas.length ? el('p', { class: 'small muted' },
          `Pasa a ruta crítica: ${resultado.nuevasCriticas.join(', ')}.`) : null,
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('Aplicarlo de verdad', () => {
            store.instantanea('Aplicar escenario');
            const copia = resultado.proyectoSimulado;
            p.tareas = copia.tareas;
            guardar();
            toast('Aplicado. Se puede deshacer con Ctrl+Z.');
          }, { variant: 'primary' }),
          button('Descartar', () => { escenario.tareaId = null; pintar(); }, { variant: 'ghost' }))) : null);
  }

  /** Ejecuta la nivelación sobre el proyecto y guarda el resultado. */
  function ejecutarNivelacion(retrasarProyecto) {
    const p = proyecto();
    nivelacion = nivelarRecursos(p, { retrasarProyecto });
    store.guardar();
    toast(nivelacion.movimientos.length
      ? `${nivelacion.movimientos.length} tarea${nivelacion.movimientos.length === 1 ? '' : 's'} movida${nivelacion.movimientos.length === 1 ? '' : 's'}`
      : 'No se pudo mover nada dentro de la holgura');
    pintar();
  }

  function panelSeguimiento(p) {
    const plan = programar(p);
    const desvios = desviaciones(plan, p.lineaBase, p.calendario);
    const ev = valorGanado(plan, p.fechaEstado || hoyISO);
    const retrasadas = plan.tareas.filter((t) => !t.resumen && t.fin < hoyISO && (t.avance || 0) < 100);

    return el('div', {},
      el('div', { class: 'fila' },
        el('label', { class: 'field', style: 'width:170px' },
          el('span', { class: 'field-label' }, 'Fecha de estado'),
          el('input', {
            class: 'input', type: 'date', value: p.fechaEstado || hoyISO,
            onChange: (e) => { p.fechaEstado = e.target.value; guardar(); },
          })),
        button(p.lineaBase ? 'Volver a tomar línea base' : 'Tomar línea base', () => {
          if (p.lineaBase && !window.confirm('Se pierde la comparación con el plan original. ¿Seguir?')) return;
          p.lineaBase = tomarLineaBase(plan);
          guardar();
          toast('Línea base guardada');
        })),

      p.lineaBase ? el('p', { class: 'muted small' }, `Línea base tomada el ${p.lineaBase.tomadaEn}.`)
        : el('p', { class: 'muted small' }, 'Sin línea base no hay con qué comparar: tómala cuando el plan esté aprobado.'),

      el('div', { class: 'tarjetas' },
        dato(ev.bac.toLocaleString('es'), 'presupuesto (BAC)'),
        dato(ev.ev.toLocaleString('es'), 'valor ganado (EV)'),
        dato(ev.ac.toLocaleString('es'), 'coste real (AC)'),
        dato(ev.spi ?? '—', 'SPI', { clase: (ev.spi ?? 1) < 1 ? 'negativo' : 'positivo', pie: (ev.spi ?? 1) < 1 ? 'vas con retraso' : 'en fecha' }),
        dato(ev.cpi ?? '—', 'CPI', { clase: (ev.cpi ?? 1) < 1 ? 'negativo' : 'positivo', pie: (ev.cpi ?? 1) < 1 ? 'más caro de lo previsto' : 'dentro del coste' })),

      retrasadas.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `Deberían estar terminadas (${retrasadas.length})`),
        ...retrasadas.map((t) => el('div', { class: 'alerta medio' },
          el('div', {},
            el('div', {}, `${t.edt} ${t.nombre}`),
            el('div', { class: 'accion' }, `Fin previsto ${formatoCorto(t.fin)} (${textoRelativo(t.fin)}), avance ${t.avance || 0} %.`))))) : null,

      panelAlcance(p, plan),
      panelEsfuerzo(p, plan),
      panelCurvaS(p, plan),
      panelAusencia(p),

      desvios.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Desviación frente a la línea base'),
        el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Tarea'), el('th', {}, 'Base'), el('th', {}, 'Ahora'), el('th', { class: 'num' }, 'Días'))),
          el('tbody', {}, ...desvios.map((d) => el('tr', {},
            el('td', {}, `${d.edt || ''} ${d.nombre}`),
            el('td', { class: 'small muted' }, d.nueva ? 'nueva' : formatoCorto(d.baseFin)),
            el('td', { class: 'small' }, d.nueva ? '' : formatoCorto(plan.tareas.find((t) => t.id === d.id)?.fin)),
            el('td', { class: `num ${d.desvioFin > 0 ? 'negativo' : 'positivo'}` },
              d.nueva ? '—' : `${d.desvioFin > 0 ? '+' : ''}${d.desvioFin}`)))))) : null);
  }

  /** Valor ganado en días de trabajo: la moneda que de verdad gastas. */
  function panelEsfuerzo(p, plan) {
    const ev = valorGanado(plan, p.fechaEstado || hoyISO, { unidad: 'esfuerzo' });
    if (!ev.bac) return null;
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Valor ganado en días de trabajo'),
      el('div', { class: 'tarjetas' },
        dato(`${ev.bac} d`, 'presupuesto (BAC)'),
        dato(`${ev.ev} d`, 'hecho (EV)', { pie: `planificado a hoy: ${ev.pv} d` }),
        dato(ev.hayReales ? `${ev.ac} d` : '—', 'invertido (AC)', { pie: ev.hayReales ? '' : 'apunta días reales en la tabla' }),
        dato(`${ev.etc} d`, 'falta (ETC)'),
        dato(ev.vac, 'desvío final (VAC)', { clase: ev.vac < 0 ? 'negativo' : 'positivo', pie: ev.vac < 0 ? 'te pasarás' : 'dentro' }),
        dato(ev.tcpi ?? '—', 'TCPI', { clase: (ev.tcpi ?? 1) > 1.1 ? 'negativo' : '', pie: 'ritmo que haría falta' })),
      !ev.hayReales ? el('p', { class: 'muted small', style: 'margin-top:8px' },
        'Sin días reales apuntados no hay CPI: preferimos no dar un número inventado. Añade "Reales" en la tabla del plan.') : null);
  }

  /** La curva S: lo planificado acumulado, con el hoy marcado. */
  function panelCurvaS(p, plan) {
    const c = curvaS(plan, p.fechaEstado || hoyISO, { unidad: 'esfuerzo' });
    if (c.sinDatos || c.puntos.length < 2) return null;
    const ancho = 560;
    const alto = 160;
    const x = (i) => (i / (c.puntos.length - 1)) * (ancho - 40) + 30;
    const y = (pct) => alto - 20 - (pct / 100) * (alto - 40);
    const linea = c.puntos.map((pt, i) => `${x(i)},${y(pt.pct)}`).join(' ');
    const iCorte = Math.max(0, c.puntos.findIndex((pt) => pt.fecha >= (p.fechaEstado || hoyISO)));
    const pctEV = c.hoy.bac ? Math.round((c.hoy.ev / c.hoy.bac) * 100) : 0;

    const lienzo = svg('svg', { class: 'curva-s', viewBox: `0 0 ${ancho} ${alto}`, width: '100%', height: alto });
    lienzo.append(
      svg('line', { x1: 30, y1: y(0), x2: ancho - 10, y2: y(0), stroke: 'var(--line)' }),
      svg('polyline', { points: linea, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }),
      svg('line', { x1: x(iCorte), y1: 10, x2: x(iCorte), y2: y(0), stroke: 'var(--accent-2)', 'stroke-dasharray': '4 3' }),
      svg('circle', { cx: x(iCorte), cy: y(pctEV), r: 5, fill: 'var(--ok)' }));
    const etiqueta = svg('text', { x: x(iCorte) + 8, y: y(pctEV) - 8, fill: 'var(--ok)', 'font-size': 11 });
    etiqueta.textContent = `hecho: ${pctEV} %`;
    lienzo.append(etiqueta);

    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Curva S'),
      el('p', { class: 'muted small' },
        'La línea es lo que el plan dice que deberías llevar hecho; el punto verde, lo que llevas de verdad.'),
      el('div', { class: 'gantt-caja', style: 'padding:6px' }, lienzo),
      el('div', { class: 'fila entre small muted' },
        el('span', {}, formatoCorto(c.puntos[0].fecha)),
        el('span', {}, formatoCorto(c.puntos[c.puntos.length - 1].fecha))));
  }

  /** "Me voy dos semanas": qué se rompe. */
  function panelAusencia(p) {
    const plan = programar(p);
    const recursos = [...new Set(plan.tareas.filter((t) => t.recurso).map((t) => t.recurso))];
    if (!recursos.length) return null;
    const r = ausencia.recurso && ausencia.desde && ausencia.hasta ? simularAusencia(p, ausencia) : null;

    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Simulación de ausencia'),
      el('p', { class: 'muted small' }, 'Vacaciones, un congreso, una baja: qué pasa si alguien no está.'),
      el('div', { class: 'fila' },
        el('select', { class: 'input', style: 'width:auto', onChange: (e) => { ausencia.recurso = e.target.value || null; pintar(); } },
          el('option', { value: '' }, '— quién —'),
          ...recursos.map((x) => el('option', { value: x, selected: x === ausencia.recurso }, x))),
        el('label', { class: 'field', style: 'width:160px;margin:0' },
          el('span', { class: 'field-label' }, 'Desde'),
          el('input', { class: 'input', type: 'date', value: ausencia.desde || '', onChange: (e) => { ausencia.desde = e.target.value; pintar(); } })),
        el('label', { class: 'field', style: 'width:160px;margin:0' },
          el('span', { class: 'field-label' }, 'Hasta'),
          el('input', { class: 'input', type: 'date', value: ausencia.hasta || '', onChange: (e) => { ausencia.hasta = e.target.value; pintar(); } }))),

      r?.posible ? el('div', { style: 'margin-top:10px' },
        el('p', { class: r.diasProyecto > 0 ? 'negativo' : 'positivo' }, r.frase),
        r.movidas.length ? el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Tarea'), el('th', {}, 'Antes'), el('th', {}, 'Después'), el('th', { class: 'num' }, 'Días'))),
          el('tbody', {}, ...r.movidas.slice(0, 8).map((m) => el('tr', {},
            el('td', {}, m.nombre),
            el('td', { class: 'small muted' }, formatoCorto(m.antesInicio)),
            el('td', { class: 'small' }, formatoCorto(m.ahoraInicio)),
            el('td', { class: `num ${m.dias > 0 ? 'negativo' : ''}` }, m.dias ? `+${m.dias}` : '—'))))) : null,
        r.afectadas.length ? el('div', { class: 'fila', style: 'margin-top:8px' },
          button('Aplicar (reprogramar de verdad)', () => {
            store.instantanea('Aplicar ausencia');
            p.tareas = r.proyectoSimulado.tareas;
            guardar();
            toast('Reprogramado. Ctrl+Z lo deshace.');
          }, { variant: 'primary' })) : null) : null);
  }


  /**
   * Cuánto ha engordado el plan desde la línea base. El alcance no crece de
   * golpe: crece a base de "y ya que estamos".
   */
  function panelAlcance(p, plan) {
    const c = alcanceQueCrece(plan, p.lineaBase, p.calendario);
    if (!c.hayBase) return null;
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Alcance que crece'),
      el('p', { class: c.diasTotales ? 'negativo' : 'muted small' }, c.frase),
      c.diasTotales ? el('div', { class: 'tarjetas' },
        dato(`+${c.diasTotales} d`, 'añadidos', { pie: `${c.pct} % sobre la base` }),
        dato(c.nuevas.length, 'tareas nuevas'),
        dato(c.crecidas.length, 'alargadas'),
        dato(c.desaparecidas, 'desaparecidas')) : null,
      c.nuevas.length ? el('div', { style: 'margin-top:10px' },
        el('p', { class: 'field-label' }, 'Nuevas desde la línea base'),
        ...c.nuevas.map((t) => el('div', { class: 'salud-fila' },
          el('span', { class: 'grow' }, t.nombre),
          el('span', { class: 'muted small' }, `${t.dias} d`)))) : null,
      c.crecidas.length ? el('div', { style: 'margin-top:10px' },
        el('p', { class: 'field-label' }, 'Se alargaron'),
        ...c.crecidas.map((t) => el('div', { class: 'salud-fila' },
          el('span', { class: 'grow' }, t.nombre),
          el('span', { class: 'muted small' }, `${t.antes} → ${t.ahora} d`)))) : null);
  }

  /**
   * Cinco líneas por proyecto: qué puede romperlo, cuánto de probable, cuánto
   * dolería, qué lo dispara y cuándo revisarlo. Sin reservas de contingencia ni
   * riesgo residual: eso es para una PMO, no para una persona.
   */
  function panelRiesgosLigeros(p) {
    const todos = store.estado.riesgos || [];
    const vivos = riesgosVivos(todos, hoyISO, p.nombre);
    const cerrados = todos.filter((r) => r.proyecto === p.nombre && r.cerrado);

    const menuNivel = (valor, alCambiar) => {
      const sel = el('select', { class: 'input', style: 'width:auto', onChange: (e) => alCambiar(Number(e.target.value)) });
      for (const n of NIVELES_RIESGO) sel.append(el('option', { value: String(n.valor), selected: n.valor === valor }, n.nombre));
      return sel;
    };

    return el('div', {},
      el('div', { class: 'fila' },
        button('+ Riesgo', () => {
          store.agregarEn('riesgos', riesgoNuevo({ proyecto: p.nombre, que: 'Algo que puede romper este plan' }));
          pintar();
        }, { variant: 'primary' }),
        el('span', { class: 'muted small' }, `${vivos.length} vivos${cerrados.length ? ` · ${cerrados.length} cerrados` : ''}`)),

      !vivos.length ? vacio('Ningún riesgo apuntado. O no los hay, o no los has mirado.', '🎲') : null,

      ...vivos.map((r) => el('section', { class: `card riesgo-${r.nivel}` },
        el('div', { class: 'fila' },
          input(r.que, (v) => store.actualizarEn('riesgos', r.id, { que: v })),
          el('span', { class: `chip ${r.nivel}` }, `${nivelRiesgo(r)} · ${r.exposicion}`),
          button('✕', () => { store.borrarEn('riesgos', r.id); pintar(); }, { variant: 'ghost chico danger', title: 'Borrar el riesgo' })),
        el('div', { class: 'fila' },
          el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Probabilidad'),
            menuNivel(r.probabilidad, (v) => { store.actualizarEn('riesgos', r.id, { probabilidad: v }); pintar(); })),
          el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Impacto'),
            menuNivel(r.impacto, (v) => { store.actualizarEn('riesgos', r.id, { impacto: v }); pintar(); })),
          el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Revisar el'),
            el('input', {
              class: 'input', type: 'date', value: r.revisarEn || '',
              onChange: (e) => { store.actualizarEn('riesgos', r.id, { revisarEn: e.target.value }); pintar(); },
            }))),
        el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Qué lo dispara'),
          input(r.disparador || '', (v) => store.actualizarEn('riesgos', r.id, { disparador: v }))),
        el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Qué haríamos'),
          input(r.plan || '', (v) => store.actualizarEn('riesgos', r.id, { plan: v }))),
        r.tocaRevisar ? el('p', { class: 'negativo small' }, `Tocaba revisarlo el ${r.revisarEn}.`) : null,
        el('div', { class: 'fila' },
          button('Se cumplió', () => {
            store.agregar(tareaDeRiesgo(r, hoyISO));
            store.actualizarEn('riesgos', r.id, { materializado: hoyISO, cerrado: hoyISO });
            toast('Convertido en tarea: ya no es un riesgo, es un problema');
            pintar();
          }, { variant: 'ghost chico' }),
          button('Cerrar (ya no aplica)', () => {
            store.actualizarEn('riesgos', r.id, { cerrado: hoyISO });
            pintar();
          }, { variant: 'ghost chico' })))),

      el('p', { class: 'muted small' },
        'Exposición = probabilidad × impacto. Seis o más es alto, y por ahí conviene empezar.'));
  }

  /**
   * Hoja imprimible para la reunión: la tabla del plan sin la app alrededor.
   * Desde el diálogo de impresión se guarda como PDF, que es lo que se manda.
   */
  function imprimirPlan(p) {
    const plan = programar(p);
    const r = resumenProyecto(plan);
    const hojas = plan.tareas.filter((t) => !t.resumen);
    const hoja = el('div', { class: 'hoja-impresion' },
      el('h1', {}, p.nombre),
      el('p', { class: 'muted small' },
        `${r.inicio} → ${r.fin} · ${r.duracion} días hábiles · ${r.tareas} tareas · ${r.criticas} en ruta crítica`
        + `${p.fechaObjetivo ? ` · comprometido al ${p.fechaObjetivo}` : ''} · avance ${r.avance} %`),
      el('table', { class: 'tabla' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'EDT'), el('th', {}, 'Tarea'), el('th', {}, 'Responsable'),
          el('th', {}, 'Inicio'), el('th', {}, 'Fin'), el('th', { class: 'num' }, 'Días'),
          el('th', { class: 'num' }, 'Holgura'), el('th', { class: 'num' }, 'Avance'))),
        el('tbody', {}, ...hojas.map((t) => el('tr', { class: t.critica ? 'critica' : '' },
          el('td', {}, t.edt || ''),
          el('td', {}, t.esHito ? `🏁 ${t.nombre}` : t.nombre),
          el('td', {}, t.recurso || '—'),
          el('td', {}, t.inicio),
          el('td', {}, t.fin),
          el('td', { class: 'num' }, String(t.duracion)),
          el('td', { class: 'num' }, t.critica ? 'crítica' : `${t.holgura} d`),
          el('td', { class: 'num' }, `${t.avance || 0} %`))))),
      el('p', { class: 'muted small' }, `Generado el ${hoyISO} · las tareas en negrita son la ruta crítica.`));

    document.body.append(hoja);
    const quitar = () => { hoja.remove(); window.removeEventListener('afterprint', quitar); };
    window.addEventListener('afterprint', quitar);
    window.print();
    // Safari no siempre dispara afterprint: red de seguridad.
    setTimeout(quitar, 60000);
  }

  /* -------------------------- selector y raíz -------------------------- */

  function selectorProyecto() {
    return el('div', { class: 'fila', style: 'margin-bottom:12px' },
      el('select', {
        class: 'input', style: 'width:auto',
        onChange: (e) => { seleccionado = e.target.value; pintar(); },
      }, ...store.estado.planes.map((p) => el('option', { value: p.id, selected: p.id === seleccionado }, p.nombre))),
      button('+ Proyecto vacío', () => {
        const p = store.agregarPlan(proyectoVacio('Proyecto nuevo', hoyISO));
        seleccionado = p.id;
        pintar();
      }),
      el('select', {
        class: 'input', style: 'width:auto',
        onChange: (e) => {
          const plantilla = PLANTILLAS_PROYECTO.find((x) => x.id === e.target.value);
          if (!plantilla) return;
          const p = store.agregarPlan(desdePlantilla(plantilla, hoyISO));
          seleccionado = p.id;
          pintar();
        },
      }, el('option', { value: '' }, '+ Desde plantilla…'),
      ...PLANTILLAS_PROYECTO.map((p) => el('option', { value: p.id, title: p.descripcion }, p.nombre))),
      proyecto() ? button('🖨 Hoja para la reunión', () => imprimirPlan(proyecto()),
        { title: 'Abre el diálogo de impresión: desde ahí se guarda como PDF' }) : null,
      proyecto() ? button('🗑 Borrar', () => {
        if (!window.confirm(`¿Borrar el proyecto “${proyecto().nombre}”?`)) return;
        store.borrarPlan(seleccionado);
        seleccionado = store.estado.planes[0]?.id || null;
        pintar();
      }, { variant: 'ghost danger' }) : null);
  }

  const pintar = () => {
    const p = proyecto();
    render(host,
      tituloVista('Proyectos', 'EDT, dependencias, ruta crítica y seguimiento'),
      selectorProyecto(),
      !p ? vacio('Todavía no hay ningún proyecto. Empieza por una plantilla: trae las tareas y las dependencias puestas.', '📐')
        : el('div', {},
          el('div', { class: 'pestanas' },
            ...[['plan', 'Plan y Gantt'], ['recursos', 'Recursos'], ['riesgo', 'Fecha y escenarios'], ['seguimiento', 'Seguimiento'], ['riesgos', 'Riesgos']].map(([id, txt]) =>
              el('button', { class: `pestana ${pestana === id ? 'activa' : ''}`.trim(), onClick: () => { pestana = id; pintar(); } }, txt))),
          pestana === 'plan' ? panelPlan(p)
            : pestana === 'recursos' ? panelRecursos(p)
              : pestana === 'riesgo' ? panelRiesgo(p)
                : pestana === 'riesgos' ? panelRiesgosLigeros(p) : panelSeguimiento(p)));
  };

  pintar();
  render(root, host);
}

function formatoCorto(iso) {
  if (!iso) return '';
  const d = deISO(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTO[d.getMonth()]}`;
}

/** Los nodos SVG necesitan su espacio de nombres; `el()` solo crea HTML. */
function svg(tag, props = {}) {
  const nodo = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(props)) nodo.setAttribute(k, String(v));
  return nodo;
}
