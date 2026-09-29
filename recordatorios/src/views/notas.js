/**
 * notas.js (vista) — Notas sueltas y diario.
 *
 * Una tarea es algo que hacer; una nota es algo que recordar. Aquí van las
 * segundas, con sus etiquetas, sus enlaces `[[así]]` y, abajo de cada una,
 * quién apunta a ella: es donde aparecen las relaciones que no recordabas.
 */

import { button, el, input, render, textarea, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoLargo, textoRelativo } from '../fechas.js';
import {
  ANIMOS, buscarNotas, entradaDiario, entradaNueva, etiquetasDeNotas,
  haceTiempo, notaNueva, rachaDiario, relaciones, resumenNotas,
} from '../notas.js';
import { dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaNotas(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let pestana = ctx.query?.tab || 'notas';
  let consulta = ctx.query?.q || '';
  let abierta = null;

  const notas = () => store.estado.notas || [];

  const abrir = (nota) => { abierta = nota.id; pintar(); };

  const pintar = () => {
    render(host,
      tituloVista('Notas', 'Lo que no es una tarea'),
      el('div', { class: 'pestanas' },
        ...[['notas', 'Notas'], ['diario', 'Diario']].map(([id, txt]) =>
          el('button', { class: `pestana ${pestana === id ? 'activa' : ''}`.trim(), onClick: () => { pestana = id; abierta = null; pintar(); } }, txt))),
      pestana === 'notas' ? panelNotas() : panelDiario());
  };

  /* ------------------------------ notas ------------------------------ */

  function panelNotas() {
    const todas = notas().filter((n) => n.tipo !== 'diario');
    const encontradas = buscarNotas(todas, consulta);
    const etiquetas = etiquetasDeNotas(todas);
    const r = resumenNotas(notas(), hoyISO);

    const campo = input(consulta, (v) => { consulta = v; pintarLista(); }, {
      placeholder: 'Buscar en las notas…  texto o @etiqueta',
    });

    const lista = el('div', {});
    const pintarLista = () => {
      const resultado = buscarNotas(todas, consulta);
      render(lista, ...(resultado.length
        ? resultado.map(tarjetaNota)
        : [vacio('Ninguna nota coincide.', '🔍')]));
    };

    const salida = el('div', {},
      el('section', { class: 'card' },
        el('div', { class: 'fila' }, campo,
          button('Nota nueva', () => {
            const n = store.guardarNota(notaNueva({ titulo: 'Sin título' }));
            abrir(n);
          }, { variant: 'primary' })),
        etiquetas.length ? el('div', { class: 'chip-list', style: 'margin-top:10px' },
          ...etiquetas.slice(0, 10).map((e) => el('button', {
            class: 'chip', type: 'button',
            onClick: () => { consulta = '@' + e.etiqueta; pintar(); },
          }, `@${e.etiqueta} · ${e.n}`))) : null,
        el('p', { class: 'muted small', style: 'margin-top:10px' }, r.frase)),
      lista);

    render(lista, ...(encontradas.length ? encontradas.map(tarjetaNota) : [vacio('Ninguna nota todavía. Esto es para lo que no es una tarea.', '📝')]));
    return salida;
  }

  function tarjetaNota(nota) {
    if (abierta !== nota.id) {
      const rel = relaciones(nota, notas());
      return el('section', { class: `card nota ${nota.fijada ? 'fijada' : ''}`.trim() },
        el('div', { class: 'fila entre' },
          el('h3', { class: 'card-title', style: 'margin:0;cursor:pointer', onClick: () => abrir(nota) }, nota.titulo || 'Sin título'),
          el('div', { class: 'fila' },
            button(nota.fijada ? '📌' : '📍', () => {
              store.guardarNota({ ...nota, fijada: !nota.fijada });
              pintar();
            }, { variant: 'ghost chico', title: nota.fijada ? 'Soltar' : 'Fijar arriba' }),
            button('✏️', () => abrir(nota), { variant: 'ghost chico', title: 'Editar' }))),
        nota.texto ? el('p', { class: 'small', style: 'white-space:pre-wrap' }, nota.texto.slice(0, 320) + (nota.texto.length > 320 ? '…' : '')) : null,
        el('div', { class: 'chip-list' },
          ...(nota.etiquetas || []).map((e) => el('span', { class: 'chip' }, `@${e}`)),
          ...rel.salientes.map((n) => el('button', {
            class: 'chip', type: 'button', title: 'Ir a la nota', onClick: () => abrir(n),
          }, `→ ${n.titulo}`))),
        rel.entrantes.length ? el('p', { class: 'muted small' },
          'Apuntan aquí: ', ...rel.entrantes.map((n, i) => el('span', {},
            i ? ', ' : '', el('a', { href: '#', onClick: (e) => { e.preventDefault(); abrir(n); } }, n.titulo)))) : null,
        el('p', { class: 'muted small' }, `Editada ${textoRelativo(String(nota.actualizadaEn).slice(0, 10))}`));
    }

    // Abierta: se edita en el sitio, sin cambiar de pantalla.
    const borrador = { ...nota, etiquetas: [...(nota.etiquetas || [])] };
    const rel = relaciones(borrador, notas());
    return el('section', { class: 'card nota abierta' },
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Título'),
        input(borrador.titulo, (v) => { borrador.titulo = v; })),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Texto'),
        textarea(borrador.texto, (v) => { borrador.texto = v; }, { rows: 10, placeholder: 'Escribe. Con [[corchetes dobles]] enlazas otra nota.' })),
      el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Etiquetas'),
        input(borrador.etiquetas.join(', '), (v) => {
          borrador.etiquetas = v.split(',').map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
        }, { placeholder: 'casa, ideas, mercado' })),
      rel.rotos.length ? el('p', { class: 'muted small' },
        'Enlaces a notas que no existen: ',
        ...rel.rotos.map((titulo) => el('button', {
          class: 'chip', type: 'button', title: 'Crearla',
          onClick: () => {
            store.guardarNota(borrador);
            const nueva = store.guardarNota(notaNueva({ titulo }));
            abrir(nueva);
          },
        }, `crear “${titulo}”`))) : null,
      el('div', { class: 'fila' },
        button('Guardar', () => { store.guardarNota(borrador); abierta = null; toast('Guardada'); pintar(); }, { variant: 'primary' }),
        button('Cerrar', () => { abierta = null; pintar(); }),
        button('Hacer tarea de esto', () => {
          store.agregar({ titulo: borrador.titulo, notas: borrador.texto, modulo: 'personal' });
          toast('Tarea creada');
        }, { variant: 'ghost chico' }),
        button('Borrar', () => {
          if (!window.confirm('¿Borrar la nota?')) return;
          store.borrarEn('notas', nota.id);
          abierta = null;
          pintar();
        }, { variant: 'ghost danger chico' })));
  }

  /* ------------------------------ diario ----------------------------- */

  function panelDiario() {
    const deHoy = entradaDiario(notas(), hoyISO) || entradaNueva(hoyISO);
    const borrador = { ...deHoy };
    const antes = haceTiempo(notas(), hoyISO);
    const anteriores = notas().filter((n) => n.tipo === 'diario' && n.fecha !== hoyISO)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

    return el('div', {},
      el('div', { class: 'tarjetas' },
        dato(rachaDiario(notas(), hoyISO), 'días seguidos'),
        dato(notas().filter((n) => n.tipo === 'diario').length, 'entradas'),
        dato(entradaDiario(notas(), hoyISO) ? 'sí' : 'no', 'escrito hoy')),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, textoLargo(hoyISO)),
        el('div', { class: 'chip-list' },
          ...ANIMOS.map((a) => el('button', {
            class: `chip ${borrador.animo === a.id ? 'activa' : ''}`.trim(), type: 'button',
            onClick: (e) => {
              borrador.animo = borrador.animo === a.id ? null : a.id;
              e.target.closest('.chip-list').querySelectorAll('.chip').forEach((c) => c.classList.remove('activa'));
              if (borrador.animo) e.target.closest('.chip').classList.add('activa');
            },
          }, `${a.icono} ${a.nombre}`))),
        textarea(borrador.texto, (v) => { borrador.texto = v; }, { rows: 8, placeholder: '¿Qué pasó hoy?' }),
        el('div', { class: 'fila' },
          button('Guardar el día', () => {
            store.guardarNota(borrador);
            toast('Guardado');
            pintar();
          }, { variant: 'primary' }))),

      antes.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Hace tiempo, un día como hoy'),
        ...antes.map(({ anios, nota }) => el('div', { style: 'margin-bottom:10px' },
          el('div', { class: 'muted small' }, `Hace ${anios} año${anios === 1 ? '' : 's'} · ${textoLargo(nota.fecha)}`),
          el('p', { class: 'small', style: 'white-space:pre-wrap' }, nota.texto || '(en blanco)')))) : null,

      anteriores.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Días anteriores'),
        ...anteriores.slice(0, 20).map((n) => el('div', { class: 'salud-fila' },
          el('span', { style: 'min-width:150px' }, textoLargo(n.fecha)),
          el('span', { class: 'grow small' }, (n.texto || '').slice(0, 90)),
          button('Abrir', () => { pestana = 'notas'; abrir(n); }, { variant: 'ghost chico' })))) : null);
  }

  pintar();
  render(root, host);
}
