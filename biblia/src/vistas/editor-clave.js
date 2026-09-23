/**
 * editor-clave.js — Crear o editar una palabra clave que se marca sola en
 * todo el libro o en toda la Biblia (método inductivo).
 */

import { el, render, $, toast, confirmar } from '../ui.js';
import { almacen } from '../almacen.js';
import { LIBROS } from '../libros.js';
import { COLORES, ESTILOS, SIMBOLOS } from '../marcas.js';
import { crearClave, juegos } from '../claves.js';

/** `bActual` es el libro que se está leyendo (para ofrecer "solo este libro"). */
export function editarClave(clave = {}, bActual = 0) {
  const dialogo = $('#dialogo');
  const existente = Boolean(clave.id);
  let color = clave.color || 'amarillo';
  let simbolo = clave.simbolo || '';

  const palabra = el('input', { class: 'input', value: clave.palabra || '', placeholder: 'pacto, gracia, "hijo del hombre"…', required: true });
  const raiz = el('input', { type: 'checkbox', checked: clave.raiz ?? String(clave.palabra || '').length >= 5 });
  const estilo = el('select', { class: 'input' }, ESTILOS.filter((e) => e.id !== 'simbolo').map((e) =>
    el('option', { value: e.id, selected: e.id === (clave.estilo || 'resaltar') }, e.nombre)));
  const alcance = el('select', { class: 'input' },
    el('option', { value: 0, selected: !clave.alcance }, 'Toda la Biblia'),
    LIBROS.map((l) => el('option', { value: l.n, selected: clave.alcance === l.n }, l.n === bActual ? `${l.nombre} (el que lees)` : l.nombre)));
  const juego = el('input', { class: 'input', value: clave.juego || '', placeholder: 'Opcional: "Romanos", "Pacto", "Sermón 12"…', list: 'lista-juegos' });
  const lista = el('datalist', { id: 'lista-juegos' }, juegos(almacen.estado.claves).map((j) => el('option', { value: j })));

  const colores = el('div', { class: 'colores-dialogo' });
  const pintarColores = () => render(colores, COLORES.map((c) => el('button', {
    type: 'button', class: `muestra grande m-${c.id} ${c.id === color ? 'activa' : ''}`, title: c.nombre,
    onClick: () => { color = c.id; pintarColores(); },
  })));
  const simbolos = el('div', { class: 'simbolos-dialogo' });
  const pintarSimbolos = () => render(simbolos,
    el('button', { type: 'button', class: `simbolo-btn ${!simbolo ? 'activa' : ''}`, title: 'Sin símbolo', onClick: () => { simbolo = ''; pintarSimbolos(); } }, '∅'),
    SIMBOLOS.map((x) => el('button', {
      type: 'button', class: `simbolo-btn ${simbolo === x.s ? 'activa' : ''}`, title: x.nombre, style: { '--s': `var(--u-${x.color})` },
      onClick: () => { simbolo = x.s; if (!existente) color = x.color; pintarColores(); pintarSimbolos(); },
    }, x.s)));
  pintarColores();
  pintarSimbolos();

  // Si el alcance inicial es "el libro que lees", preseleccionarlo es más útil para un estudio de libro
  if (!existente && bActual && clave.alcance == null) alcance.value = String(bActual);

  return new Promise((resolve) => {
    let resultado = null;
    const guardar = () => {
      const p = palabra.value.replace(/^"|"$/g, '').trim();
      if (!p) { toast('Escribe la palabra', 'error'); return; }
      const datos = { palabra: p, raiz: raiz.checked, estilo: estilo.value, color, simbolo, alcance: Number(alcance.value), juego: juego.value, version: clave.version || almacen.ajustes.principal };
      if (existente) {
        almacen.cambiarClave(clave.id, datos);
        resultado = { ...clave, ...datos };
      } else {
        resultado = crearClave(datos);
        almacen.agregarClave(resultado);
      }
      toast(`“${p}” quedará marcada ${datos.alcance ? `en ${LIBROS[datos.alcance - 1].nombre}` : 'en toda la Biblia'}`);
      dialogo.close();
    };
    render(dialogo, el('form', { class: 'editor-nota', onSubmit: (e) => { e.preventDefault(); guardar(); } },
      el('header', { class: 'dialogo-cab' },
        el('h2', {}, existente ? 'Editar palabra clave' : 'Nueva palabra clave'),
        el('button', { type: 'button', class: 'btn icono', onClick: () => dialogo.close() }, '✕')),
      el('p', { class: 'tenue small' }, 'Como en el estudio inductivo: defines la marca una vez y aparece cada vez que la palabra sale en el texto. Tus marcas hechas a mano siempre quedan por encima.'),
      campo('Palabra o frase', palabra),
      el('label', { class: 'check' }, raiz, ' Incluir formas derivadas (pacto → pactos; justific → justificado, justificación)'),
      campo('Cómo marcarla', estilo),
      campo('Color', colores),
      campo('Símbolo (opcional)', simbolos),
      campo('Dónde', alcance),
      campo('Juego de marcado', juego), lista,
      el('footer', { class: 'dialogo-pie' },
        existente ? el('button', { type: 'button', class: 'btn peligro', onClick: async () => {
          if (!(await confirmar('¿Quitar esta palabra clave?', { aceptar: 'Quitar', peligro: true }))) return;
          almacen.quitarClave(clave.id); resultado = { borrada: true }; dialogo.close();
        } }, 'Quitar') : null,
        el('span', { class: 'grow' }),
        el('button', { type: 'button', class: 'btn', onClick: () => dialogo.close() }, 'Cancelar'),
        el('button', { type: 'submit', class: 'btn primario' }, 'Guardar'))));
    dialogo.addEventListener('close', () => resolve(resultado), { once: true });
    dialogo.showModal();
    palabra.focus();
  });
}

function campo(etiqueta, control) {
  return el('div', { class: 'campo' }, el('span', { class: 'campo-etiqueta' }, etiqueta), control);
}
