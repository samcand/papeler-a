/**
 * objetivos.js (vista) — Metas.
 *
 * La primera versión era un formulario volcado en pantalla: cada meta abierta
 * con ocho menús, filtros que dejaban la pantalla en blanco y un nombre que
 * venía escrito con «lo que quiero conseguir». Esta está montada sobre tres
 * ideas que se repiten en todo lo que funciona (OKR, SMART y las apps de
 * seguimiento de hábitos):
 *
 * 1. **Una meta es un número con fecha.** Si no se puede medir, es un deseo; y
 *    si no tiene fecha, es «algún día», que también vale pero se llama así.
 * 2. **Lo que se hace todos los días es sumar avance**, no editar la meta. Por
 *    eso el `+1` está en la lista y el formulario, escondido en un panel.
 * 3. **Enseñar el ritmo, no el porcentaje.** El 25 % en septiembre de una meta
 *    anual suena bien y va tarde; eso es lo que hay que ver de un vistazo.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoRelativo } from '../fechas.js';
import {
  AMBITOS, HORIZONTES, TIPOS_OBJETIVO, aRevisar, aplanar, arbol, haríaCiclo,
  objetivoNuevo, paradas, parseMeta, porHorizonte, progresoConHijos, resumenObjetivos,
  ritmo, serieDeAvance, sumarAvance, tareaDeObjetivo,
} from '../objetivos.js';
import { barra, dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaObjetivos(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let verCerradas = false;
  let editando = null;
  // El panel se abre una vez y se queda: si se volviera a crear en cada
  // repintado, el cursor se saldría del campo a media palabra.
  let panelAbierto = null;

  const metas = () => store.estado.objetivos || [];
  const datos = () => ({ tareas: store.tareas, historial: store.estado.historial });
  const vivas = () => metas().filter((o) => !o.logradoEn && !o.abandonadoEn);
  const cerradas = () => metas().filter((o) => o.logradoEn || o.abandonadoEn);

  /* ---------------------- alta en una línea ---------------------- */

  const campo = input('', () => actualizarPista(), {
    placeholder: 'Leer 24 libros este año · Correr 500 km · Sacar el pasaporte algún día',
  });
  const pista = el('p', { class: 'vista-previa' });

  function actualizarPista() {
    const txt = campo.value.trim();
    if (!txt) { pista.textContent = ''; return; }
    const p = parseMeta(txt, hoyISO);
    const h = HORIZONTES.find((x) => x.id === p.horizonte);
    pista.innerHTML = `“${p.que}” · `
      + (p.tipo === 'numero' ? `meta <b>${p.meta}${p.unidad ? ` ${p.unidad}` : ''}</b>` : '<b>hacerlo o no</b>')
      + ` · ${h.icono} <b>${h.nombre.toLowerCase()}</b>`
      + (p.hasta ? ` · hasta <b>${textoRelativo(p.hasta)}</b>` : '');
  }

  function crear() {
    const txt = campo.value.trim();
    if (!txt) { toast('Escribe qué quieres conseguir'); return; }
    const p = parseMeta(txt, hoyISO);
    const nueva = store.agregarEn('objetivos', objetivoNuevo(p));
    campo.value = '';
    pista.textContent = '';
    editando = nueva.id;     // se abre por si quiere afinarla, pero ya está creada
    pintar();
  }

  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); crear(); } });

  /* ---------------------------- pintar ---------------------------- */

  const pintar = () => {
    const r = resumenObjetivos(metas(), datos(), hoyISO);
    const tocan = new Set(aRevisar(metas(), hoyISO).map((o) => o.id));
    const grupos = porHorizonte(metas(), datos(), hoyISO);

    render(host,
      tituloVista('Metas', 'Qué quieres que sea verdad dentro de un año'),

      el('div', { class: 'tarjetas' },
        dato(r.enCurso, 'en curso'),
        dato(r.atrasados, 'van tarde', { clase: r.atrasados ? 'negativo' : 'positivo' }),
        dato(r.logrados, 'logradas', { clase: r.logrados ? 'positivo' : '' }),
        dato(r.aRevisar, 'para revisar')),

      el('section', { class: 'card' },
        el('div', { class: 'rapida' }, campo, button('Añadir meta', crear, { variant: 'primary' })),
        pista,
        el('p', { class: 'muted small' },
          'Escríbela como se dice. El número es la meta y “este año”, “este trimestre” o “algún día” ponen el plazo.')),

      avisoParadas(),

      !vivas().length
        ? vacio('Ninguna meta escrita. Lo que no se escribe se queda en intención.', '🎯')
        : el('div', {}, ...grupos.map(grupo)),

      cerradas().length ? el('section', { class: 'card' },
        el('div', { class: 'fila entre' },
          el('h2', { class: 'card-title', style: 'margin:0' }, `Cerradas (${cerradas().length})`),
          button(verCerradas ? 'Ocultar' : 'Ver', () => { verCerradas = !verCerradas; pintar(); }, { variant: 'ghost chico' })),
        verCerradas ? el('div', {}, ...cerradas().map(filaCerrada)) : null) : null);

    if (editando && panelAbierto?.id !== editando) {
      panelAbierto?.nodo.remove();
      panelMeta(editando);
    }
    if (!editando && panelAbierto) {
      panelAbierto.nodo.remove();
      panelAbierto = null;
    }
  };

  /* ----------------- las que llevan semanas quietas ----------------- */

  /**
   * Una meta no se incumple de golpe: se deja de tocar. Tres semanas sin sumar
   * nada, teniendo plazo abierto, es la señal que llega a tiempo de servir.
   */
  function avisoParadas() {
    const quietas = paradas(metas(), datos(), hoyISO);
    if (!quietas.length) return null;
    return el('section', { class: 'card aviso-paradas' },
      el('b', {}, `🕸️ ${quietas.length} ${quietas.length === 1 ? 'meta lleva' : 'metas llevan'} semanas sin moverse`),
      el('div', { class: 'small' }, ...quietas.slice(0, 4).map(({ objetivo: o, ritmo: rm }) => el('div', { class: 'fila entre' },
        el('span', { class: 'grow' }, o.que || 'Sin nombre'),
        el('span', { class: 'muted' }, rm.diasSinTocar == null ? 'nunca' : `hace ${rm.diasSinTocar} días`),
        button('Sumar', () => {
          store.actualizarEn('objetivos', o.id, sumarAvance(o, 1, hoyISO));
          pintar();
        }, { variant: 'ok chico' })))),
      quietas.length > 4 ? el('p', { class: 'muted small' }, `y ${quietas.length - 4} más.`) : null);
  }

  /* --------------------------- un grupo --------------------------- */

  function grupo(g) {
    if (!g.metas.length) return null;
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, `${g.icono} ${g.nombre}`,
        el('span', { class: 'muted small' }, ` · ${g.metas.length}`)),
      el('p', { class: 'muted small', style: 'margin-top:-6px' }, g.descripcion),
      ...g.metas.map((rama) => fila(rama)));
  }

  /* ---------------------- una meta en la lista ---------------------- */

  function fila(rama) {
    const o = rama.objetivo;
    const p = rama.progreso;
    const ambito = AMBITOS.find((a) => a.id === o.ambito);
    const tocaRevisar = !!o.revisarEn && o.revisarEn <= hoyISO;

    const suma = (n) => {
      store.actualizarEn('objetivos', o.id, sumarAvance(o, n));
      pintar();
    };

    return el('div', {
      class: `meta ${p.alDia === false ? 'tarde' : ''} ${p.logrado ? 'lograda' : ''}`.trim(),
    },
      el('div', { class: 'fila entre' },
        el('div', { class: 'grow' },
          el('b', {}, `${ambito?.icono || '🎯'} ${o.que || 'Sin nombre'}`),
          p.desdeHijas ? el('span', { class: 'muted small' }, ` · ${p.hijas} metas dentro`) : null,
          // Agrupar por horizonte separa a las hijas de su madre: que al menos
          // digan de dónde cuelgan.
          madreDe(o) ? el('span', { class: 'muted small' }, ` · ↳ ${madreDe(o)}`) : null),
        el('span', { class: 'meta-cifra' },
          p.logrado ? '✓'
            : o.tipo === 'siNo' ? (o.hecho ? '✓' : '—')
              : `${p.actual}/${p.meta}${o.unidad ? ` ${o.unidad}` : ''}`)),

      barra(p.pct, p.logrado ? 'var(--ok, #35c48b)' : (p.alDia === false ? 'var(--danger)' : 'var(--accent-2)')),
      p.conFecha ? el('div', { class: 'barra tiempo' }, el('div', { style: `width:${p.pctTiempo}%` })) : null,

      el('div', { class: 'fila entre' },
        el('span', { class: `small ${p.alDia === false ? 'negativo' : 'muted'}`.trim() }, p.frase),
        el('div', { class: 'fila' },
          !p.logrado && o.tipo === 'siNo'
            ? button('Hecho', () => suma(1), { variant: 'ok chico' })
            : null,
          !p.logrado && o.tipo === 'numero' && !p.desdeHijas
            ? el('span', { class: 'fila' },
              button('−1', () => suma(-1), { variant: 'ghost chico', title: 'Quitar uno' }),
              button('+1', () => suma(1), { variant: 'ok chico', title: 'Sumar uno' }))
            : null,
          button('✎', () => { editando = o.id; pintar(); }, { variant: 'ghost chico', title: 'Editar la meta' }))),

      lineaRitmo(o),

      tocaRevisar ? el('p', { class: 'negativo small' },
        `Tocaba revisarla el ${o.revisarEn}: ¿sigue teniendo sentido?`) : null);
  }

  const madreDe = (o) => (o.padre ? (metas().find((x) => x.id === o.padre)?.que || null) : null);

  /**
   * El porcentaje dice dónde vas; esto dice **si la estás tocando** y dónde vas
   * a acabar si sigues igual. Solo aparece cuando tiene algo que decir: una
   * meta recién escrita no necesita que le adivinen el futuro.
   */
  function lineaRitmo(o) {
    if (o.tipo === 'siNo' || o.logradoEn || o.abandonadoEn) return null;
    const rm = ritmo(o, datos(), hoyISO);
    if (!rm.ultima && !rm.parada) return null;
    const partes = [rm.frase, rm.fraseProyeccion].filter(Boolean).join(' ');
    return el('p', { class: `small meta-ritmo ${rm.parada ? 'quieta' : 'muted'}`.trim() },
      rm.parada ? '🕸️ ' : '', partes);
  }

  function filaCerrada(o) {
    return el('div', { class: 'salud-fila' },
      el('span', { style: 'min-width:26px' }, o.logradoEn ? '🏆' : '🚪'),
      el('span', { class: 'grow' }, o.que,
        o.porque ? el('span', { class: 'muted small' }, ` — ${o.porque}`) : null),
      el('span', { class: 'muted small', style: 'min-width:110px;text-align:right' },
        o.logradoEn ? `lograda el ${o.logradoEn}` : `dejada el ${o.abandonadoEn}`),
      button('Reabrir', () => {
        store.actualizarEn('objetivos', o.id, { logradoEn: null, abandonadoEn: null });
        pintar();
      }, { variant: 'ghost chico' }));
  }

  /* ------------------- el formulario, en un panel ------------------- */

  function panelMeta(id) {
    const o = metas().find((x) => x.id === id);
    if (!o) { editando = null; return; }
    const cuerpo = el('div', { class: 'drawer-body' });
    const panel = el('div', { class: 'drawer' },
      el('div', {},
        el('div', { class: 'drawer-head' },
          el('h3', {}, 'La meta'),
          button('✕', cerrar, { variant: 'ghost' })),
        cuerpo));

    function cerrar() {
      panel.remove();
      panelAbierto = null;
      editando = null;
      pintar();
    }
    const set = (cambios) => { store.actualizarEn('objetivos', o.id, cambios); };
    const campoDe = (etiqueta, control, pista2) => el('label', { class: 'field' },
      el('span', { class: 'field-label' }, etiqueta), control,
      pista2 ? el('span', { class: 'field-hint' }, pista2) : null);

    const menu = (valor, opciones, alCambiar) => {
      const sel = el('select', { class: 'input', onChange: (e) => { alCambiar(e.target.value); } });
      for (const x of opciones) sel.append(el('option', { value: x.valor, selected: x.valor === valor }, x.texto));
      return sel;
    };

    render(cuerpo,
      campoDe('Qué quieres conseguir', input(o.que, (v) => set({ que: v }), { placeholder: 'Leer 24 libros' })),

      bloqueAvance(o),

      el('div', { class: 'fila' },
        el('div', { class: 'grow' }, campoDe('Ámbito',
          menu(o.ambito, AMBITOS.map((a) => ({ valor: a.id, texto: `${a.icono} ${a.nombre}` })), (v) => set({ ambito: v })))),
        el('div', { class: 'grow' }, campoDe('Horizonte',
          menu(o.horizonte || 'anio', HORIZONTES.map((h) => ({ valor: h.id, texto: `${h.icono} ${h.nombre}` })), (v) => { set({ horizonte: v }); pintar(); }),
          HORIZONTES.find((h) => h.id === (o.horizonte || 'anio'))?.descripcion))),

      campoDe('Cómo se mide',
        menu(o.tipo, TIPOS_OBJETIVO.map((t) => ({ valor: t.id, texto: t.nombre })), (v) => { set({ tipo: v }); cerrarYAbrir(); }),
        TIPOS_OBJETIVO.find((t) => t.id === o.tipo)?.ayuda),

      o.tipo === 'numero' ? el('div', { class: 'fila' },
        el('div', { style: 'width:120px' }, campoDe('Llevo',
          el('input', { class: 'input', type: 'number', value: o.actual, onChange: (e) => { set({ actual: Number(e.target.value) || 0 }); pintar(); } }))),
        el('div', { style: 'width:120px' }, campoDe('Meta',
          el('input', { class: 'input', type: 'number', value: o.meta, onChange: (e) => { set({ meta: Number(e.target.value) || 1 }); pintar(); } }))),
        el('div', { class: 'grow' }, campoDe('Unidad',
          input(o.unidad || '', (v) => set({ unidad: v }), { placeholder: 'libros, km, artículos…' })))) : null,

      o.tipo === 'tareas' ? campoDe('Proyecto que cuenta',
        menu(o.proyecto || '', [{ valor: '', texto: '— elige —' },
          ...store.estado.proyectos.map((pr) => ({ valor: pr.nombre, texto: pr.nombre }))], (v) => { set({ proyecto: v || null }); pintar(); }),
        'Cuenta las tareas cerradas de ese proyecto entre las dos fechas.') : null,

      el('div', { class: 'fila' },
        el('div', { class: 'grow' }, campoDe('Desde',
          el('input', { class: 'input', type: 'date', value: o.desde || '', onChange: (e) => { set({ desde: e.target.value }); pintar(); } }))),
        el('div', { class: 'grow' }, campoDe('Hasta',
          el('input', { class: 'input', type: 'date', value: o.hasta || '', onChange: (e) => { set({ hasta: e.target.value || null }); pintar(); } }),
          'Sin fecha, es de las de “algún día”: no va tarde, va.')),
        el('div', { class: 'grow' }, campoDe('Revisar el',
          el('input', { class: 'input', type: 'date', value: o.revisarEn || '', onChange: (e) => { set({ revisarEn: e.target.value || null }); pintar(); } })))),

      campoDe('Dentro de otra meta',
        menu(o.padre || '', [{ valor: '', texto: '— suelta —' },
          ...metas().filter((x) => x.id !== o.id && !x.abandonadoEn && !haríaCiclo(o.id, x.id, metas()))
            .map((x) => ({ valor: x.id, texto: x.que.slice(0, 50) || 'Sin nombre' }))],
        (v) => { set({ padre: v || null }); pintar(); }),
        'Una meta de vida contiene las de cada año; su avance sale de las de dentro.'),

      el('div', { class: 'fila', style: 'margin-top:14px' },
        button('Listo', cerrar, { variant: 'primary' }),
        button('Lograda', () => { set({ logradoEn: hoyISO }); toast('¡Hecho!'); cerrar(); }, { variant: 'ok' }),
        button('Dejarla', () => {
          const porque = window.prompt('¿Por qué la dejas? Se queda escrito, que es lo que enseña al mirarlo en diciembre.') || '';
          set({ abandonadoEn: hoyISO, porque });
          cerrar();
        }),
        button('Tarea del siguiente paso', () => {
          store.agregar(tareaDeObjetivo(o, hoyISO));
          toast('Tarea creada');
        }, { variant: 'ghost chico' }),
        button('Borrar', () => {
          if (!window.confirm('¿Borrar la meta?')) return;
          store.borrarEn('objetivos', o.id);
          cerrar();
        }, { variant: 'ghost danger chico' })));

    /**
     * Los últimos 30 días en una tira de barras. No es una gráfica bonita: es
     * la respuesta a «¿esto lo estoy haciendo o lo estoy pensando?».
     */
    function bloqueAvance(meta) {
      if (meta.tipo === 'siNo') return null;
      const serie = serieDeAvance(meta, datos(), hoyISO, 30);
      const tope = Math.max(1, ...serie.map((d) => d.valor));
      const dias = serie.filter((d) => d.valor > 0).length;
      const rm = ritmo(meta, datos(), hoyISO);
      return el('div', { class: 'field' },
        el('span', { class: 'field-label' }, 'Últimos 30 días'),
        el('div', { class: 'chispa' }, ...serie.map((d) => el('i', {
          class: d.valor > 0 ? 'lleno' : '',
          style: `height:${d.valor > 0 ? Math.max(18, Math.round((d.valor / tope) * 100)) : 6}%`,
          title: `${d.fecha}: ${d.valor}`,
        }))),
        el('span', { class: 'field-hint' },
          `${dias} de 30 días con avance. ${rm.frase}`
          + (rm.porSemana ? ` Vas a ${rm.porSemana}${meta.unidad ? ` ${meta.unidad}` : ''} por semana.` : '')
          + (rm.fraseProyeccion ? ` ${rm.fraseProyeccion}` : '')));
    }

    // Cambiar de tipo cambia los campos: se vuelve a dibujar el panel entero.
    function cerrarYAbrir() { panel.remove(); panelAbierto = null; panelMeta(id); pintar(); }

    panel.addEventListener('click', (e) => { if (e.target === panel) cerrar(); });
    document.body.append(panel);
    panelAbierto = { id, nodo: panel };
  }

  pintar();
  render(root, host);
  return () => {
    panelAbierto?.nodo.remove();
    panelAbierto = null;
  };
}
