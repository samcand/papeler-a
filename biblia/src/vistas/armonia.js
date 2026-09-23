/**
 * armonia.js (vista) — Armonía de los evangelios.
 *
 *   #/armonia            índice de perícopas por etapas del ministerio
 *   #/armonia/57?v=gri   un suceso en columnas (Mateo, Marcos, Lucas, Juan)
 *
 * Las palabras que comparten dos o más relatos se resaltan (en griego se
 * compara por lema), y lo propio de cada evangelista queda sin resaltar:
 * a simple vista se ve qué añade, omite o cambia cada autor.
 */

import { el, render, toast } from '../ui.js';
import { almacen } from '../almacen.js';
import { normalizar, aClave, parsear } from '../referencias.js';
import { textoRango, version as datosVersion } from '../texto.js';
import { ARMONIA, PERICOPAS, EVANGELIOS, rangoDe, testigos } from '../armonia.js';
import { editarNota } from './editor-nota.js';

const VERSIONES = [
  { id: 'rv1909', nombre: 'RV1909' },
  { id: 'kjv', nombre: 'KJV' },
  { id: 'gri', nombre: 'Griego' },
];
// Palabras muy frecuentes que no dicen nada al comparar relatos
const VACIAS = new Set('que los las del por con para una uno sus les mas pero como fue este esta esto ella ellos era eran fueron fuese habia habian hecho dijo dijeron dice decia decian todo todos toda todas entonces aqui sobre porque cual quien ese esa aquel mismo tambien and the that his him unto they them with for was which said not have were but from all when there then ο και αυτος εν δε ειμι λεγω εις ου τις ουτος προς γαρ επι'.split(' ').map(normalizar));

export async function vistaArmonia(app, ruta) {
  const n = Number(ruta.partes[0]);
  if (n) return comparar(app, PERICOPAS.find((p) => p.n === n) || PERICOPAS[0], ruta.params.get('v') || almacen.ajustes.principal);
  return indice(app, ruta.params.get('q') || '');
}

function indice(app, q) {
  const lista = el('div', {});
  const filtro = el('input', { class: 'input grow', type: 'search', value: q, placeholder: 'Filtrar: bautismo, parábola, Getsemaní…' });
  const soloVarios = el('input', { type: 'checkbox' });
  const pintar = () => {
    const t = normalizar(filtro.value.trim());
    render(lista, ARMONIA.map((s) => {
      const ps = PERICOPAS.filter((p) => p.seccion === s.titulo
        && (!t || normalizar(p.t).includes(t) || EVANGELIOS.some((e) => normalizar(p[e.k] || '').includes(t)))
        && (!soloVarios.checked || testigos(p) >= 2));
      if (!ps.length) return null;
      return el('section', { class: 'bloque-armonia' },
        el('h2', {}, s.titulo),
        el('table', { class: 'tabla-armonia' },
          el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Suceso'), EVANGELIOS.map((e) => el('th', {}, e.nombre)))),
          el('tbody', {}, ps.map((p) => el('tr', {},
            el('td', { class: 'tenue' }, p.n),
            el('td', {}, el('a', { href: `#/armonia/${p.n}`, class: 'suceso' }, p.t), testigos(p) >= 2 ? el('span', { class: 'tenue small' }, ` ×${testigos(p)}`) : null),
            EVANGELIOS.map((e) => el('td', { class: 'cita-armonia' }, p[e.k] ? el('a', { href: `#/leer/${aClave(parsear(p[e.k]))}`, class: 'ref', dataset: { ref: aClave(parsear(p[e.k])) } }, p[e.k].replace(/^\S+\s/, '')) : '')))))));
    }));
  };
  filtro.addEventListener('input', pintar);
  soloVarios.addEventListener('change', pintar);
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Armonía de los evangelios'),
    el('p', { class: 'tenue' }, `${PERICOPAS.length} perícopas en orden cronológico aproximado (Robertson, Thomas–Gundry). Toca un suceso para comparar los relatos en columnas y ver qué comparten y qué es propio de cada evangelista.`),
    el('div', { class: 'fila-controles' }, filtro, el('label', { class: 'check' }, soloVarios, ' Solo los narrados por dos o más')),
    lista));
  pintar();
}

/** Palabras de un versículo para comparar: en griego el lema, en las traducciones la forma sin tildes. */
function clavesDe(texto) {
  if (Array.isArray(texto)) return texto.map((t) => normalizar(t[3] || t[0]));
  return (String(texto).match(/\p{L}+/gu) || []).map((w) => normalizar(w));
}

async function comparar(app, p, ver) {
  const columnas = EVANGELIOS.filter((e) => p[e.k]);
  const textos = await Promise.all(columnas.map((e) => {
    const r = rangoDe(p[e.k]);
    return textoRango(ver, r.desde, r.hasta);
  }));
  // Frecuencia de cada palabra por relato (para marcar lo común)
  const presencia = new Map();
  textos.forEach((versos, i) => {
    for (const w of new Set(versos.flatMap((x) => clavesDe(x.texto)))) {
      if (w.length < 3 || VACIAS.has(w)) continue;
      presencia.set(w, (presencia.get(w) || 0) | (1 << i));
    }
  });
  const todos = (1 << columnas.length) - 1;
  const clase = (w) => {
    const m = presencia.get(w);
    if (!m || columnas.length < 2 || (m & (m - 1)) === 0) return '';
    return m === todos && columnas.length > 2 ? 'comun todos' : 'comun';
  };
  let resaltar = localStorage.getItem('armonia-resaltar') !== '0';
  const meta = datosVersion(ver);

  const verso = (x) => {
    if (Array.isArray(x.texto)) {
      return el('span', { class: 'vs-armonia' }, el('sup', {}, x.v), ' ',
        x.texto.map((t) => [el('span', { class: clase(normalizar(t[3] || t[0])), title: t[3] || '' }, t[0]), ' ']));
    }
    const piezas = String(x.texto).split(/(\p{L}+)/u);
    return el('span', { class: 'vs-armonia' }, el('sup', {}, x.v), ' ',
      piezas.map((s, i) => (i % 2 ? el('span', { class: clase(normalizar(s)) }, s) : s)), ' ');
  };

  const anterior = PERICOPAS.find((x) => x.n === p.n - 1);
  const siguiente = PERICOPAS.find((x) => x.n === p.n + 1);
  const ir = (x, v = ver) => { location.hash = `#/armonia/${x.n}${v !== almacen.ajustes.principal ? `?v=${v}` : ''}`; };
  const cuerpo = el('div', { class: `columnas-armonia cols-${columnas.length} ${resaltar ? 'resaltar' : ''}`, lang: meta?.idioma || 'es' },
    columnas.map((e, i) => el('article', { class: 'col-armonia' },
      el('header', {},
        el('h3', {}, e.nombre),
        el('a', { class: 'ref', href: `#/leer/${aClave(parsear(p[e.k]))}`, dataset: { ref: aClave(parsear(p[e.k])) } }, p[e.k]),
        el('span', { class: 'tenue small' }, ` · ${textos[i].reduce((s, x) => s + clavesDe(x.texto).length, 0)} palabras`)),
      el('div', { class: 'texto-armonia' }, textos[i].length ? textos[i].map(verso) : el('p', { class: 'tenue' }, 'Texto no disponible en esta versión.')))));

  const teclas = (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'ArrowLeft' && anterior) ir(anterior);
    if (e.key === 'ArrowRight' && siguiente) ir(siguiente);
  };
  document.addEventListener('keydown', teclas);

  render(app, el('div', { class: 'pagina ancha' },
    el('div', { class: 'fila-controles' },
      el('a', { class: 'btn chico', href: '#/armonia' }, '☰ Índice'),
      el('button', { class: 'btn icono', disabled: !anterior, title: anterior ? `← ${anterior.t}` : '', onClick: () => ir(anterior) }, '‹'),
      el('div', { class: 'grow' },
        el('div', { class: 'panel-sub' }, `${p.n}. ${p.seccion}`),
        el('h1', { class: 'titulo-armonia' }, p.t)),
      el('button', { class: 'btn icono', disabled: !siguiente, title: siguiente ? `${siguiente.t} →` : '', onClick: () => ir(siguiente) }, '›')),
    el('div', { class: 'fila-controles' },
      el('div', { class: 'chips' }, VERSIONES.map((v) => el('button', { class: `chip ${v.id === ver ? 'activo' : ''}`, onClick: () => ir(p, v.id) }, v.nombre))),
      columnas.length > 1 ? el('label', { class: 'check small' },
        el('input', { type: 'checkbox', checked: resaltar, onChange: (e) => { resaltar = e.target.checked; localStorage.setItem('armonia-resaltar', resaltar ? '1' : '0'); cuerpo.classList.toggle('resaltar', resaltar); } }),
        ' Resaltar lo que comparten') : null,
      columnas.length > 1 ? el('span', { class: 'leyenda-armonia small' }, el('span', { class: 'comun' }, 'en dos o más'), columnas.length > 2 ? el('span', { class: 'comun todos' }, 'en todos') : null, el('span', {}, 'propio de uno')) : null,
      el('button', { class: 'btn chico', onClick: () => {
        const r = rangoDe(p[columnas[0].k]);
        editarNota({ desde: r.desde, hasta: r.hasta, titulo: `Armonía: ${p.t}`, cuerpo: `Paralelos: ${columnas.map((e) => p[e.k]).join('; ')}\n\n` }).then((n) => n && toast('Nota guardada'));
      } }, '✎ Nota comparativa')),
    columnas.length === 1 ? el('p', { class: 'tenue small' }, `Solo ${columnas[0].nombre} narra este suceso.`) : null,
    cuerpo));
  return () => document.removeEventListener('keydown', teclas);
}

