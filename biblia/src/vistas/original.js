/**
 * original.js — Estudio de una palabra hebrea o griega por su número Strong:
 * definición, dónde aparece en todo el AT o NT, sus formas, su morfología y
 * cada versículo con la palabra señalada en el original y en español.
 *
 *   #/original/H2617   חֶסֶד (misericordia)
 *   #/original/G26     ἀγάπη (amor)
 */

import { el, render } from '../ui.js';
import { almacen } from '../almacen.js';
import { LIBROS } from '../libros.js';
import { formatear, aClave } from '../referencias.js';
import { lexico, originalCompleto, bibliaCompleta } from '../texto.js';
import { explicarHebreo, explicarGriego } from '../morfologia.js';
import { estudioOriginal } from '../concordancia.js';
import { traducciones } from '../strongs.js';

const SUGERIDAS = [['H2617', 'jésed'], ['H1285', 'berit'], ['H7965', 'shalom'], ['H3068', 'YHWH'], ['H6663', 'tsadaq'],
  ['G26', 'agápē'], ['G5485', 'járis'], ['G4102', 'pístis'], ['G1344', 'dikaióō'], ['G3341', 'metánoia'], ['G1577', 'ekklēsía']];

export async function vistaOriginal(app, ruta) {
  const codigo = (ruta.partes[0] || '').toUpperCase();
  const m = /^([HG])(\d+)$/.exec(codigo);
  const entrada = el('input', { class: 'input', name: 'c', value: codigo, placeholder: 'H2617, G26…' });
  const cab = el('form', {
    class: 'fila-controles',
    onSubmit: (e) => { e.preventDefault(); location.hash = `#/original/${entrada.value.trim().toUpperCase()}`; },
  }, entrada, el('button', { class: 'btn primario', type: 'submit' }, 'Estudiar'));

  if (!m) {
    render(app, el('div', { class: 'pagina' },
      el('h1', {}, 'Palabras en el original'),
      el('p', { class: 'tenue' }, 'Escribe un número Strong (H para hebreo, G para griego) o toca una palabra hebrea o griega en el lector con la columna del original activa.'),
      cab,
      el('div', { class: 'chips' }, SUGERIDAS.map(([c, t]) => el('a', { class: 'chip', href: `#/original/${c}` }, `${c} · ${t}`)))));
    return;
  }

  const [, letra, numero] = m;
  const n = Number(numero);
  const ver = letra === 'H' ? 'heb' : 'gri';
  const idioma = letra === 'H' ? 'he' : 'el';
  const dir = letra === 'H' ? 'rtl' : 'ltr';
  const salida = el('div', {}, el('p', { class: 'tenue' }, 'Cargando el léxico…'));
  render(app, el('div', { class: 'pagina' }, el('a', { class: 'small', href: '#/original' }, '← Palabras en el original'), cab, salida));

  const lex = await lexico(letra);
  const e = lex[n];
  if (!e) { render(salida, el('p', {}, `No encontré ${codigo} en el léxico.`)); return; }
  const enlazar = (texto) => String(texto || '').split(/([GH]\d+)/).map((t) => (/^[GH]\d+$/.test(t) ? el('a', { href: `#/original/${t}` }, t) : t));
  const derivadas = Object.entries(lex).filter(([, x]) => new RegExp(`\\b${letra}${n}\\b`).test(x[4] || '')).slice(0, 20);

  // Cómo la traduce la RV1909 (según la alineación automática palabra por palabra)
  const usos = (await traducciones().catch(() => ({})))[codigo] || [];
  const total = usos.reduce((s, [, x]) => s + x, 0);
  const enRV1909 = usos.length ? el('div', { class: 'traducciones-rv' },
    el('span', { class: 'tenue' }, `Traducciones en la RV1909 (${total}): `),
    el('div', { class: 'barras-traduccion' }, usos.map(([w, x]) => el('a', {
      class: 'barra-traduccion', href: `#/concordancia/${encodeURIComponent(w)}?v=rv1909`, title: `${x} veces (${Math.round((100 * x) / total)}%)`,
      style: { '--p': `${Math.max(4, (100 * x) / usos[0][1])}%` },
    }, el('span', {}, w), el('span', { class: 'tenue' }, x))))) : null;

  const ficha = el('section', { class: 'tarjeta ficha-grande' },
    el('div', { class: 'ficha-cab' },
      el('span', { class: 'ficha-palabra', lang: idioma, dir }, e[0]),
      el('div', {},
        el('div', {}, el('strong', {}, e[1]), el('span', { class: 'tenue' }, ` · ${codigo}`)),
        el('div', { class: 'gran-idea-mini' }, e[5]))),
    el('p', {}, el('span', { class: 'tenue' }, 'Definición (Strong): '), e[2]),
    enRV1909,
    e[3] ? el('p', {}, el('span', { class: 'tenue' }, 'Traducciones en la KJV: '), e[3]) : null,
    e[4] ? el('p', { class: 'tenue' }, 'Derivación: ', enlazar(e[4])) : null,
    derivadas.length ? el('div', {}, el('span', { class: 'tenue small' }, 'Palabras que derivan de esta: '),
      el('div', { class: 'chips' }, derivadas.map(([k, x]) => el('a', { class: 'chip', href: `#/original/${letra}${k}`, title: x[5] }, el('span', { lang: idioma }, x[0]), ` ${letra}${k}`)))) : null);

  render(salida, ficha, el('p', { class: 'tenue' }, `Buscando en todo el ${letra === 'H' ? 'Antiguo' : 'Nuevo'} Testamento…`));
  const [libros, espanol] = await Promise.all([originalCompleto(ver), bibliaCompleta(almacen.ajustes.principal)]);
  const r = estudioOriginal(libros, n);

  if (!r.apariciones) {
    render(salida, ficha, el('p', {}, 'Esta palabra no aparece en el texto con este número (puede deberse a diferencias entre las ediciones).'));
    return;
  }

  const rango = letra === 'H' ? [1, 39] : [40, 66];
  const porLibro = r.porLibro.slice(rango[0] - 1, rango[1]);
  const maximo = Math.max(...porLibro);
  let filtroLibro = 0;
  let cuantos = 50;
  const lista = el('ol', { class: 'lista-resultados' });
  const explicar = letra === 'H' ? explicarHebreo : explicarGriego;

  const pintarLista = () => {
    const visibles = r.lugares.filter((x) => !filtroLibro || x.b === filtroLibro);
    render(lista, visibles.slice(0, cuantos).map((x) => {
      const ref = { b: x.b, c: x.c, v: x.v, c2: x.c, v2: x.v };
      const tokens = libros[x.b - 1][x.c - 1][x.v - 1];
      return el('li', { class: 'resultado' },
        el('a', { class: 'ref', href: `#/leer/${aClave(ref)}`, dataset: { ref: aClave(ref) } }, formatear(ref)),
        el('div', { class: 'resultado-original', lang: idioma, dir },
          tokens.map((w, k) => [k === x.k ? el('mark', { class: 'hallado', title: explicar(w[2]) }, w[0]) : w[0], ' '])),
        el('div', { class: 'resultado-texto' }, espanol[x.b - 1]?.[x.c - 1]?.[x.v - 1] || ''));
    }),
    visibles.length > cuantos ? el('li', { class: 'mas' }, el('button', { class: 'btn', onClick: () => { cuantos += 100; pintarLista(); } }, `Mostrar más (${visibles.length - cuantos})`)) : null);
  };

  const barras = el('div', { class: 'grafico-libros', style: { gridTemplateColumns: `repeat(${porLibro.length}, 1fr)` } },
    porLibro.map((cuenta, i) => {
      const b = rango[0] + i;
      return el('button', {
        type: 'button', class: `barra-libro ${b >= 40 ? 'nt' : 'at'} ${cuenta ? '' : 'cero'}`, disabled: !cuenta,
        title: `${LIBROS[b - 1].nombre}: ${cuenta}`, style: { '--alto': `${cuenta ? Math.max(4, (cuenta / maximo) * 100) : 0}%` },
        onClick: (ev) => {
          filtroLibro = filtroLibro === b ? 0 : b;
          for (const x of barras.children) x.classList.remove('activa');
          if (filtroLibro) ev.currentTarget.classList.add('activa');
          cuantos = 50;
          pintarLista();
        },
      });
    }));

  pintarLista();
  render(salida,
    ficha,
    el('div', { class: 'cifras' },
      el('div', { class: 'cifra' }, el('strong', {}, r.apariciones.toLocaleString('es')), el('span', {}, 'apariciones')),
      el('div', { class: 'cifra' }, el('strong', {}, r.versiculos.toLocaleString('es')), el('span', {}, 'versículos')),
      el('div', { class: 'cifra' }, el('strong', {}, porLibro.filter(Boolean).length), el('span', {}, 'libros')),
      el('div', { class: 'cifra' }, el('strong', {}, r.formas.length), el('span', {}, 'formas distintas'))),
    el('section', { class: 'tarjeta' },
      el('h3', {}, 'Distribución por libro'),
      barras,
      el('div', { class: 'chips' }, porLibro.map((cuenta, i) => [cuenta, rango[0] + i]).filter(([x]) => x).sort((a, z) => z[0] - a[0]).slice(0, 8)
        .map(([cuenta, b]) => el('span', { class: 'chip' }, `${LIBROS[b - 1].nombre} ${cuenta}`)))),
    el('div', { class: 'rejilla-2' },
      el('section', { class: 'tarjeta' },
        el('h3', {}, 'Formas en el texto'),
        el('div', { class: 'chips' }, r.formas.slice(0, 24).map(([f, cuenta]) => el('span', { class: 'chip', lang: idioma }, f, el('span', { class: 'tenue' }, ` ${cuenta}`))))),
      el('section', { class: 'tarjeta' },
        el('h3', {}, 'Morfología'),
        el('ul', { class: 'lista-morfologia' }, r.morfologias.slice(0, 10).map(([m, cuenta]) => el('li', { class: 'small' },
          el('span', {}, explicar(m) || m), el('span', { class: 'tenue' }, ` · ${cuenta}`)))))),
    el('section', {},
      el('h3', {}, 'Todas las apariciones'),
      el('p', { class: 'tenue small' }, 'La palabra está señalada en el original; debajo, el versículo en español. Toca una barra del gráfico para ver un solo libro.'),
      lista));
}
