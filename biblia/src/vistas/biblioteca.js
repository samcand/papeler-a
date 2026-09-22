/**
 * biblioteca.js (vista) — Tus libros: importar, ver cuántas citas bíblicas
 * contiene cada uno, leerlos con las citas enlazadas y buscar en todos.
 *
 *   #/biblioteca                    estante
 *   #/biblioteca/<id>?p=120         leer un libro desde el párrafo 120
 *   #/biblioteca?q=justificación    buscar en toda la biblioteca
 */

import { el, render, toast, fecha } from '../ui.js';
import { enLinea } from '../notas.js';
import { normalizar } from '../referencias.js';
import { buscarEnLibros, fragmento } from '../biblioteca.js';
import * as estante from '../estante.js';

const POR_PAGINA = 60;

export async function vistaBiblioteca(app, ruta) {
  const id = ruta.partes[0];
  if (id) return pintarLibro(app, id, Number(ruta.params.get('p')) || 0);
  return pintarEstante(app, ruta.params.get('q') || '');
}

async function pintarEstante(app, q) {
  render(app, el('div', { class: 'pagina' }, el('p', { class: 'tenue' }, 'Abriendo la biblioteca…')));
  const lista = await estante.libros();
  const entrada = el('input', { type: 'file', multiple: true, accept: '.txt,.md,.markdown,.html,.htm,.xhtml,.epub,.docx', class: 'hidden' });
  const estado = el('div', { class: 'estado-importacion' });

  const importar = async (archivos) => {
    let hechos = 0;
    for (const archivo of archivos) {
      render(estado, el('p', { class: 'tenue' }, `Leyendo ${archivo.name}…`));
      try {
        const leido = await estante.leerArchivoLibro(archivo);
        if (!leido.parrafos.length) throw new Error('no se encontró texto');
        const meta = await estante.guardar(leido);
        hechos++;
        toast(`${meta.titulo}: ${meta.nParrafos} párrafos, ${meta.nCitas} ${meta.nCitas === 1 ? 'cita bíblica' : 'citas bíblicas'}`);
      } catch (e) {
        toast(`${archivo.name}: ${e.message}`, 'error');
      }
    }
    render(estado);
    if (hechos) pintarEstante(app, q);
  };
  entrada.addEventListener('change', () => importar([...entrada.files]));

  const zona = el('div', {
    class: 'zona-soltar', tabindex: 0,
    onClick: () => entrada.click(),
    onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') entrada.click(); },
    onDragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('encima'); },
    onDragleave: (e) => e.currentTarget.classList.remove('encima'),
    onDrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('encima'); importar([...e.dataTransfer.files]); },
  },
  el('strong', {}, '📚 Suelta aquí tus libros o toca para elegirlos'),
  el('span', { class: 'tenue small' }, 'EPUB, Word (.docx), HTML, Markdown o texto. Se guardan solo en este dispositivo.'));

  const buscador = el('form', {
    class: 'form-buscar',
    onSubmit: (e) => { e.preventDefault(); location.hash = `#/biblioteca?q=${encodeURIComponent(e.target.q.value.trim())}`; },
  }, el('div', { class: 'fila-controles' },
    el('input', { class: 'input grow', name: 'q', type: 'search', value: q, placeholder: 'Buscar en todos tus libros…' }),
    el('button', { class: 'btn primario', type: 'submit' }, 'Buscar')));

  const totalCitas = lista.reduce((s, l) => s + (l.nCitas || 0), 0);
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Biblioteca'),
    el('p', { class: 'tenue' }, 'Importa comentarios, teologías, sermones o apuntes. La app encuentra cada cita bíblica que contienen, y al estudiar un pasaje la Guía te muestra lo que dicen tus libros sobre él.'),
    zona, entrada, estado,
    lista.length ? [
      el('div', { class: 'cifras' },
        el('div', { class: 'cifra' }, el('strong', {}, lista.length), el('span', {}, 'libros')),
        el('div', { class: 'cifra' }, el('strong', {}, totalCitas.toLocaleString('es')), el('span', {}, 'citas bíblicas indexadas'))),
      buscador,
      q ? el('div', { class: 'resultados-biblioteca' }, el('p', { class: 'tenue' }, 'Buscando…')) : null,
      el('ul', { class: 'estante' }, lista.map((l) => el('li', { class: 'tarjeta libro-tarjeta' },
        el('div', { class: 'lomo', 'aria-hidden': 'true' }, l.titulo.slice(0, 1)),
        el('div', { class: 'grow' },
          el('a', { href: `#/biblioteca/${encodeURIComponent(l.id)}` }, el('strong', {}, l.titulo)),
          el('div', { class: 'tenue small' },
            [l.autor, `${l.nParrafos} párrafos`, `${l.nCitas} ${l.nCitas === 1 ? 'cita' : 'citas'}`, l.formato?.toUpperCase(), l.origen === 'incluido' ? `incluido${l.licencia ? ` · ${l.licencia}` : ''}` : `agregado ${fecha(l.agregado)}`]
              .filter(Boolean).join(' · '))),
        el('div', { class: 'acciones' },
          el('button', { class: 'btn chico', title: 'Cambiar título y autor', onClick: async () => {
            const titulo = prompt('Título', l.titulo); if (titulo == null) return;
            const autor = prompt('Autor', l.autor || ''); if (autor == null) return;
            await estante.cambiar(l.id, { titulo: titulo.trim() || l.titulo, autor: autor.trim() });
            pintarEstante(app, q);
          } }, '✎'),
          l.origen !== 'incluido' ? el('button', { class: 'btn chico peligro', title: 'Quitar de la biblioteca', onClick: async () => {
            if (!confirm(`¿Quitar "${l.titulo}" de la biblioteca?`)) return;
            await estante.borrar(l.id);
            pintarEstante(app, q);
          } }, '✕') : null))))]
      : el('div', { class: 'vacio' },
        el('h2', {}, 'Tu biblioteca está vacía'),
        el('p', {}, 'Empieza con un comentario o un libro de teología en EPUB o Word. Si tienes un PDF, guárdalo antes como texto o Word.'))));

  if (q && lista.length) {
    const resultados = buscarEnLibros(await estante.librosConTexto(), q, normalizar);
    const destino = app.querySelector('.resultados-biblioteca');
    render(destino,
      el('h3', {}, `${resultados.length}${resultados.length >= 200 ? '+' : ''} párrafos con “${q}”`),
      el('ol', { class: 'lista-resultados' }, resultados.map((r) => el('li', { class: 'resultado' },
        el('a', { href: `#/biblioteca/${encodeURIComponent(r.libro.id)}?p=${r.parrafo}` }, el('strong', {}, r.libro.titulo), el('span', { class: 'tenue small' }, ` · párrafo ${r.parrafo + 1}`)),
        el('div', { class: 'resultado-texto', html: enLinea(fragmento(r.texto, { centro: r.centro })) })))));
  }
}

async function pintarLibro(app, id, desde) {
  const meta = await estante.libro(id);
  if (!meta) { render(app, el('div', { class: 'vacio' }, el('h2', {}, 'No encontré ese libro'), el('a', { href: '#/biblioteca' }, 'Volver a la biblioteca'))); return; }
  const ps = await estante.parrafos(id);
  let inicio = Math.max(0, desde - 3);
  let fin = Math.min(ps.length, inicio + POR_PAGINA);
  const cuerpo = el('div', { class: 'libro-texto' });

  const pintar = () => {
    render(cuerpo,
      inicio > 0 ? el('button', { class: 'btn chico', onClick: () => { inicio = Math.max(0, inicio - POR_PAGINA); pintar(); } }, `↑ Párrafos anteriores (${inicio})`) : null,
      ps.slice(inicio, fin).map((p, k) => el('p', {
        id: `p-${inicio + k}`, class: inicio + k === desde && desde ? 'destacado' : '', html: enLinea(p),
      })),
      fin < ps.length ? el('button', { class: 'btn chico', onClick: () => { fin = Math.min(ps.length, fin + POR_PAGINA); pintar(); } }, `↓ Seguir leyendo (${ps.length - fin} más)`) : null);
  };
  pintar();
  render(app, el('div', { class: 'pagina angosta' },
    el('div', { class: 'acciones' }, el('a', { class: 'btn chico', href: '#/biblioteca' }, '← Biblioteca')),
    el('h1', { class: 'titulo-libro' }, meta.titulo),
    el('p', { class: 'tenue' }, [meta.autor, `${meta.nParrafos} párrafos`, `${meta.nCitas} citas bíblicas (pasa el cursor para verlas)`].filter(Boolean).join(' · ')),
    cuerpo));
  if (desde) document.getElementById(`p-${desde}`)?.scrollIntoView({ block: 'center' });
  else window.scrollTo({ top: 0 });
}
