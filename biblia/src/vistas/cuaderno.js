/**
 * cuaderno.js — Todo lo que has anotado: notas (con etiquetas y búsqueda),
 * resaltados por color y marcadores. Desde aquí se exporta a Markdown.
 */

import { el, render, toast, descargar, fecha } from '../ui.js';
import { almacen } from '../almacen.js';
import { LIBROS, partesId } from '../libros.js';
import { formatearRango, aClave, refDesdeRango } from '../referencias.js';
import { precargar, textoSiCargado, version } from '../texto.js';
import { filtrarNotas, todasLasEtiquetas, notaAHtml, exportarMarkdown } from '../notas.js';
import { COLORES, textoDeMarca, estiloSegmento, segmentoDeMarca } from '../marcas.js';
import { muestraDe } from './lector.js';
import { editarNota } from './editor-nota.js';
import { editarClave } from './editor-clave.js';
import { juegos, contarClave } from '../claves.js';
import { bibliaCompleta } from '../texto.js';

const PESTANAS = [
  { id: 'notas', nombre: 'Notas' },
  { id: 'resaltados', nombre: 'Resaltados' },
  { id: 'marcadores', nombre: 'Marcadores' },
  { id: 'claves', nombre: 'Palabras clave' },
];

export async function vistaCuaderno(app, ruta) {
  const pestana = PESTANAS.some((p) => p.id === ruta.partes[0]) ? ruta.partes[0] : 'notas';
  const e = almacen.estado;
  const contenido = el('div');
  render(app, el('div', { class: 'pagina' },
    el('div', { class: 'titulo-pagina' },
      el('h1', {}, 'Mi cuaderno'),
      el('div', { class: 'acciones' },
        el('button', { class: 'btn primario', onClick: () => editarNota({}).then(() => vistaCuaderno(app, ruta)) }, '+ Nota libre'),
        el('button', { class: 'btn', title: 'Descargar todas las notas en un archivo Markdown', onClick: exportarNotas }, '⬇ Exportar notas'))),
    el('nav', { class: 'subpestanas' }, PESTANAS.map((p) => el('a', {
      href: `#/cuaderno/${p.id}`, class: p.id === pestana ? 'activa' : '',
    }, p.nombre, el('span', { class: 'cuenta' }, { notas: e.notas.length, resaltados: e.marcas.length, marcadores: e.marcadores.length, claves: e.claves.length }[p.id])))),
    contenido));

  if (pestana === 'notas') pintarNotas(contenido, ruta, () => vistaCuaderno(app, ruta));
  if (pestana === 'resaltados') await pintarResaltados(contenido, ruta, () => vistaCuaderno(app, ruta));
  if (pestana === 'marcadores') await pintarMarcadores(contenido, () => vistaCuaderno(app, ruta));
  if (pestana === 'claves') await pintarClaves(contenido, () => vistaCuaderno(app, ruta));
}

function exportarNotas() {
  if (!almacen.estado.notas.length) { toast('Aún no tienes notas'); return; }
  descargar(`notas-biblicas-${new Date().toISOString().slice(0, 10)}.md`, exportarMarkdown(almacen.estado.notas), 'text/markdown');
}

function pintarNotas(contenedor, ruta, refrescar) {
  const p = ruta.params;
  let texto = p.get('q') || '';
  let etiqueta = p.get('etiqueta') || '';
  let libroSel = Number(p.get('libro')) || 0;
  const etiquetas = todasLasEtiquetas(almacen.estado.notas);
  const librosConNotas = [...new Set(almacen.estado.notas.filter((n) => n.desde).map((n) => partesId(n.desde).b))].sort((a, b) => a - b);
  const lista = el('div', { class: 'lista-notas' });

  const pintar = () => {
    const notas = filtrarNotas(almacen.estado.notas, { texto, etiqueta, libro: libroSel });
    if (!almacen.estado.notas.length) {
      render(lista, el('div', { class: 'vacio' },
        el('h2', {}, 'Tu cuaderno está vacío'),
        el('p', {}, 'Mientras lees, toca un versículo o selecciona palabras y pulsa ✎ Nota. También puedes escribir apuntes libres (bosquejos, sermones, estudios temáticos).')));
      return;
    }
    render(lista, notas.length ? notas.map((n) => el('article', { class: 'tarjeta tarjeta-nota' },
      el('div', { class: 'tarjeta-cab' },
        el('div', {},
          n.titulo ? el('h3', {}, n.titulo) : null,
          n.desde
            ? el('a', { class: 'ref', href: `#/leer/${aClave(refDesdeRango(n.desde, n.hasta || n.desde))}`, dataset: { ref: aClave(refDesdeRango(n.desde, n.hasta || n.desde)) } }, formatearRango(n.desde, n.hasta || n.desde))
            : el('span', { class: 'etiqueta-version' }, 'Apunte libre')),
        el('div', { class: 'acciones' },
          el('span', { class: 'tenue small' }, fecha(n.editada || n.creada)),
          el('button', { class: 'btn chico', onClick: () => editarNota(n).then(refrescar) }, 'Editar'))),
      el('div', { class: 'nota-html', html: notaAHtml(n.cuerpo) }),
      n.etiquetas?.length ? el('div', { class: 'chips' }, n.etiquetas.map((e) => el('button', {
        class: `chip ${e === etiqueta ? 'activo' : ''}`, onClick: () => { etiqueta = etiqueta === e ? '' : e; pintarFiltros(); pintar(); },
      }, `#${e}`))) : null))
      : el('p', { class: 'tenue' }, 'Ninguna nota coincide con el filtro.'));
  };

  const filtros = el('div', { class: 'filtros' });
  const pintarFiltros = () => render(filtros,
    el('input', { class: 'input', type: 'search', placeholder: 'Buscar en tus notas…', value: texto, onInput: (e) => { texto = e.target.value; pintar(); } }),
    el('select', { class: 'input', onChange: (e) => { libroSel = Number(e.target.value); pintar(); } },
      el('option', { value: 0 }, 'Todos los libros'),
      librosConNotas.map((b) => el('option', { value: b, selected: b === libroSel }, LIBROS[b - 1].nombre))),
    etiquetas.length ? el('div', { class: 'chips' },
      etiquetas.map(([e, n]) => el('button', {
        class: `chip ${e === etiqueta ? 'activo' : ''}`, onClick: () => { etiqueta = etiqueta === e ? '' : e; pintarFiltros(); pintar(); },
      }, `#${e} `, el('span', { class: 'tenue' }, n)))) : null);

  pintarFiltros();
  pintar();
  render(contenedor, filtros, lista);
}

async function cargarLibros(ids) {
  await Promise.all([...ids].map((clave) => { const [v, b] = clave.split('/'); return precargar(v, Number(b)); }));
}

async function pintarResaltados(contenedor, ruta, refrescar) {
  const marcas = [...almacen.estado.marcas].sort((a, b) => a.desde.id - b.desde.id || (a.desde.o || 0) - (b.desde.o || 0));
  if (!marcas.length) {
    render(contenedor, el('div', { class: 'vacio' },
      el('h2', {}, 'Sin resaltados todavía'),
      el('p', {}, 'Selecciona palabras mientras lees y elige un color. Puedes usar un color para cada tema: promesas, mandamientos, pecado, Cristo…')));
    return;
  }
  render(contenedor, el('p', { class: 'tenue' }, 'Cargando textos…'));
  await cargarLibros(new Set(marcas.map((m) => `${m.version}/${partesId(m.desde.id).b}`)));

  let color = ruta.params.get('color') || '';
  const lista = el('div');
  const pintar = () => {
    const visibles = marcas.filter((m) => !color || m.color === color);
    const porLibro = new Map();
    for (const m of visibles) {
      const b = partesId(m.desde.id).b;
      if (!porLibro.has(b)) porLibro.set(b, []);
      porLibro.get(b).push(m);
    }
    render(lista, [...porLibro.entries()].map(([b, grupo]) => el('section', { class: 'grupo-marcas' },
      el('h3', {}, LIBROS[b - 1].nombre, el('span', { class: 'cuenta' }, grupo.length)),
      el('ul', { class: 'lista-marcas grande' }, grupo.map((m) => el('li', {},
        muestraDe(m),
        el('a', { class: 'ref', href: `#/leer/${aClave(refDesdeRango(m.desde.id, m.hasta.id))}`, dataset: { ref: aClave(refDesdeRango(m.desde.id, m.hasta.id)) } }, formatearRango(m.desde.id, m.hasta.id, { abreviado: true })),
        (() => { const { clase, vars, simbolo } = estiloSegmento(segmentoDeMarca(m)); return el('span', { class: `texto-marca ${clase}`, style: vars, dataset: simbolo ? { sim: simbolo } : {} }, textoDeMarca(m, (id) => textoSiCargado(m.version, id))); })(),
        m.version !== almacen.ajustes.principal ? el('span', { class: 'etiqueta-version' }, version(m.version)?.abrev) : null,
        el('select', {
          class: 'input chico', title: 'Cambiar color',
          onChange: (e) => { almacen.cambiarMarca(m.id, { color: e.target.value }); m.color = e.target.value; pintar(); },
        }, COLORES.map((c) => el('option', { value: c.id, selected: c.id === m.color }, c.nombre))),
        el('button', { class: 'btn icono chico', title: 'Quitar', onClick: () => { almacen.quitarMarca(m.id); refrescar(); } }, '✕')))))));
  };

  const cuenta = (c) => marcas.filter((m) => m.color === c).length;
  const filtros = el('div', { class: 'chips' },
    el('button', { class: `chip ${color ? '' : 'activo'}`, onClick: (e) => { color = ''; activar(e); pintar(); } }, `Todos (${marcas.length})`),
    COLORES.filter((c) => cuenta(c.id)).map((c) => el('button', {
      class: 'chip', onClick: (e) => { color = c.id; activar(e); pintar(); },
    }, el('span', { class: `muestra m-${c.id}` }), ` ${c.nombre} (${cuenta(c.id)})`)));
  const activar = (e) => { for (const b of filtros.children) b.classList.remove('activo'); e.currentTarget.classList.add('activo'); };
  pintar();
  render(contenedor, filtros, lista);
}

async function pintarMarcadores(contenedor, refrescar) {
  const marcadores = [...almacen.estado.marcadores].sort((a, b) => b.creado - a.creado);
  if (!marcadores.length) {
    render(contenedor, el('div', { class: 'vacio' },
      el('h2', {}, 'Sin marcadores'),
      el('p', {}, 'Toca un versículo y pulsa 🔖 para guardarlo aquí: versículos para memorizar, pasajes para predicar…')));
    return;
  }
  const principal = almacen.ajustes.principal;
  await cargarLibros(new Set(marcadores.map((m) => `${principal}/${partesId(m.desde).b}`)));
  render(contenedor, el('ul', { class: 'lista-marcadores' }, marcadores.map((m) => {
    const clave = aClave(refDesdeRango(m.desde, m.hasta));
    const textos = [];
    for (let id = m.desde; id <= m.hasta && textos.length < 6; id++) {
      const t = textoSiCargado(principal, id);
      if (t) textos.push(t);
    }
    return el('li', { class: 'tarjeta' },
      el('div', { class: 'tarjeta-cab' },
        el('a', { class: 'ref', href: `#/leer/${clave}`, dataset: { ref: clave } }, formatearRango(m.desde, m.hasta)),
        el('div', { class: 'acciones' },
          el('span', { class: 'tenue small' }, fecha(m.creado)),
          el('button', { class: 'btn icono chico', title: 'Quitar marcador', onClick: () => { almacen.alternarMarcador(m.desde, m.hasta); refrescar(); } }, '✕'))),
      el('p', { class: 'texto-biblico' }, textos.join(' ')));
  })));
}

/** Todas las palabras clave, agrupadas por juego, con cuántas veces aparecen. */
async function pintarClaves(contenedor, refrescar) {
  const reglas = almacen.estado.claves;
  const nueva = el('button', { class: 'btn primario', onClick: () => editarClave({ version: almacen.ajustes.principal }).then(refrescar) }, '+ Palabra clave');
  if (!reglas.length) {
    render(contenedor, el('div', { class: 'vacio' },
      el('h2', {}, 'Sin palabras clave'),
      el('p', {}, 'Marca una palabra una sola vez y la app la marcará en todo el libro o toda la Biblia: cada “pacto” en rojo con ▣, cada “Espíritu” con ☁, cada “por tanto” con →. Es el marcado del estudio inductivo, sin lápices.'),
      nueva));
    return;
  }
  render(contenedor, el('p', { class: 'tenue' }, 'Contando apariciones…'));
  const porVersion = {};
  for (const v of new Set(reglas.map((r) => r.version))) porVersion[v] = await bibliaCompleta(v);
  const grupos = ['', ...juegos(reglas)];
  const ocultos = almacen.ajustes.juegosOcultos;
  render(contenedor,
    el('div', { class: 'acciones' }, nueva,
      el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: almacen.ajustes.clavesVisibles, onChange: (e) => almacen.ajustar({ clavesVisibles: e.target.checked }) }), ' Mostrar palabras clave al leer')),
    grupos.map((g) => {
      const del = reglas.filter((r) => (r.juego || '') === g);
      if (!del.length) return null;
      return el('section', { class: 'grupo-marcas' },
        el('h3', {}, g || 'Sin juego',
          g ? el('button', { class: `chip ${ocultos.includes(g) ? '' : 'activo'}`, style: { marginLeft: '10px' }, onClick: () => { almacen.alternarJuego(g); refrescar(); } }, ocultos.includes(g) ? 'Apagado' : 'Encendido') : null),
        el('ul', { class: 'lista-marcas grande' }, del.map((r) => el('li', {},
          muestraDe(r),
          el('strong', {}, r.palabra),
          el('span', { class: 'tenue' }, `${r.raiz ? 'y derivadas · ' : ''}${r.alcance ? LIBROS[r.alcance - 1].nombre : 'toda la Biblia'} · ${contarClave(porVersion[r.version], r)} veces`),
          el('span', { class: 'grow' }),
          el('label', { class: 'check small' }, el('input', { type: 'checkbox', checked: r.activa, onChange: (e) => almacen.cambiarClave(r.id, { activa: e.target.checked }) }), ' activa'),
          el('a', { class: 'btn chico', href: `#/buscar?q=${encodeURIComponent(r.raiz ? `${r.palabra}*` : r.palabra)}&en=${r.alcance ? `l${r.alcance}` : 'todo'}&v=${r.version}` }, 'Ver pasajes'),
          el('button', { class: 'btn chico', onClick: () => editarClave(r).then(refrescar) }, 'Editar')))));
    }));
}
