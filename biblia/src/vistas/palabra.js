/**
 * palabra.js — Estudio de una palabra: frecuencia, distribución por libro,
 * primera mención, palabras con que suele aparecer y todos sus versículos.
 * Es la concordancia de toda la vida, pero calculada al instante.
 */

import { el, render, textoConTramos } from '../ui.js';
import { almacen } from '../almacen.js';
import { LIBROS, SECCIONES } from '../libros.js';
import { formatear, aClave } from '../referencias.js';
import { bibliaCompleta, versiones, version as datosVersion } from '../texto.js';
import { estudiarPalabra } from '../busqueda.js';

const SUGERIDAS = ['gracia', 'fe', 'amor', 'esperanza', 'pacto', 'redención', 'santo', 'misericordia', 'justicia', 'gloria', 'paz', 'reino'];

export async function vistaPalabra(app, ruta) {
  const palabra = (ruta.partes[0] || '').trim();
  const ver = ruta.params.get('v') || almacen.ajustes.principal;
  const raiz = ruta.params.get('raiz') === '1';

  const entrada = el('input', { class: 'input grande', type: 'search', value: palabra, placeholder: 'Escribe una palabra: gracia, pacto, redención…', autofocus: !palabra });
  const version = el('select', { class: 'input' }, versiones().map((v) => el('option', { value: v.id, selected: v.id === ver }, v.abrev)));
  const conRaiz = el('input', { type: 'checkbox', checked: raiz });
  const salida = el('div', { class: 'estudio-palabra' });

  const enviar = (e) => {
    e?.preventDefault();
    const w = entrada.value.trim().split(/\s+/)[0] || '';
    const params = new URLSearchParams({ v: version.value });
    if (conRaiz.checked) params.set('raiz', '1');
    location.hash = `#/palabra/${encodeURIComponent(w)}?${params}`;
  };

  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Estudio de palabras'),
    el('form', { class: 'form-buscar', onSubmit: enviar },
      entrada,
      el('div', { class: 'fila-controles' },
        version,
        el('label', { class: 'check', title: 'Incluye las formas derivadas: amor → amoroso, amores…' }, conRaiz, ' Incluir formas derivadas'),
        el('button', { class: 'btn primario', type: 'submit' }, 'Estudiar'))),
    salida));

  if (/^[HGhg]\d{1,4}$/.test(palabra)) { location.hash = `#/original/${palabra.toUpperCase()}`; return; }
  if (!palabra) {
    render(salida,
      el('p', {}, '¿Buscas la palabra en hebreo o griego? ', el('a', { href: '#/original' }, 'Estudia el original por número Strong'), ' (H2617, G26…) o toca una palabra en la columna del original del lector.'),
      el('p', { class: 'tenue' }, 'Descubre dónde y cómo usa la Biblia una palabra: en qué libros se concentra, su primera mención y con qué otras palabras suele aparecer. También puedes seleccionar una palabra mientras lees y pulsar 🔤.'),
      el('div', { class: 'chips' }, SUGERIDAS.map((w) => el('a', { class: 'chip', href: `#/palabra/${encodeURIComponent(w)}` }, w))));
    return;
  }

  render(salida, el('p', { class: 'tenue' }, 'Analizando toda la Biblia…'));
  const libros = await bibliaCompleta(ver);
  const consulta = raiz ? `${palabra}*` : palabra;
  const e = estudiarPalabra(libros, consulta);
  const meta = datosVersion(ver);

  if (!e.versiculos) {
    render(salida, el('p', {}, `“${palabra}” no aparece en ${meta.abrev}.`),
      !raiz ? el('p', {}, el('a', { href: `#/palabra/${encodeURIComponent(palabra)}?v=${ver}&raiz=1` }, 'Probar con formas derivadas')) : null);
    return;
  }

  const maximo = Math.max(...e.porLibro);
  const porSeccion = SECCIONES.map((s) => ({ ...s, n: e.porLibro.slice(s.desde - 1, s.hasta).reduce((a, x) => a + x, 0) }));
  const maxSeccion = Math.max(...porSeccion.map((s) => s.n));
  const principales = e.porLibro.map((n, i) => [n, i]).filter(([n]) => n).sort((a, z) => z[0] - a[0]).slice(0, 8);
  const refDe = (x) => ({ b: x.b, c: x.c, v: x.v, c2: x.c, v2: x.v });
  const versiculo = (x) => el('li', { class: 'resultado' },
    el('a', { class: 'ref', href: `#/leer/${aClave(refDe(x))}`, dataset: { ref: aClave(refDe(x)) } }, formatear(refDe(x))),
    el('div', { class: 'resultado-texto', lang: meta.idioma, dir: meta.dir || 'ltr' }, textoConTramos(x.texto, x.tramos)));

  const lista = el('ol', { class: 'lista-resultados' });
  let cuantos = 60;
  const pintarLista = () => render(lista, e.resultados.slice(0, cuantos).map(versiculo),
    e.resultados.length > cuantos ? el('li', { class: 'mas' }, el('button', { class: 'btn', onClick: () => { cuantos += 100; pintarLista(); } }, `Mostrar más (${e.resultados.length - cuantos})`)) : null);
  pintarLista();

  render(salida,
    el('div', { class: 'cifras' },
      cifra(e.apariciones, 'apariciones'),
      cifra(e.versiculos, 'versículos'),
      cifra(e.porLibro.filter(Boolean).length, 'libros'),
      cifra(e.at, 'en el AT'),
      cifra(e.nt, 'en el NT')),
    el('div', { class: 'rejilla-2' },
      el('section', { class: 'tarjeta' },
        el('h3', {}, 'Primera mención'),
        el('p', { class: 'tenue small' }, 'La “ley de la primera mención”: el primer uso suele marcar el sentido del término.'),
        el('ol', { class: 'lista-resultados' }, versiculo(e.primera)),
        e.ultima && e.ultima !== e.primera ? [el('h3', {}, 'Última mención'), el('ol', { class: 'lista-resultados' }, versiculo(e.ultima))] : null),
      el('section', { class: 'tarjeta' },
        el('h3', {}, 'Por secciones'),
        el('div', { class: 'barras-h' }, porSeccion.map((s) => el('div', { class: 'barra-h' },
          el('span', { class: 'barra-h-nombre' }, s.nombre),
          el('span', { class: 'barra-h-pista' }, el('span', { class: `barra-h-valor ${s.desde >= 40 ? 'nt' : 'at'}`, style: { width: `${maxSeccion ? (s.n / maxSeccion) * 100 : 0}%` } })),
          el('span', { class: 'barra-h-n' }, s.n)))))),
    el('section', { class: 'tarjeta' },
      el('h3', {}, 'Distribución por libro'),
      el('div', { class: 'grafico-libros' }, e.porLibro.map((n, i) => el('a', {
        class: `barra-libro ${i >= 39 ? 'nt' : 'at'} ${n ? '' : 'cero'}`,
        href: n ? `#/buscar?q=${encodeURIComponent(consulta)}&en=l${i + 1}&v=${ver}` : null,
        title: `${LIBROS[i].nombre}: ${n}`,
        style: { '--alto': `${n ? Math.max(4, (n / maximo) * 100) : 0}%` },
      }))),
      el('div', { class: 'eje-libros tenue small' }, el('span', {}, 'Génesis'), el('span', {}, 'Mateo'), el('span', {}, 'Apocalipsis')),
      el('div', { class: 'chips' }, principales.map(([n, i]) => el('a', { class: 'chip', href: `#/buscar?q=${encodeURIComponent(consulta)}&en=l${i + 1}&v=${ver}` }, `${LIBROS[i].nombre} ${n}`)))),
    e.acompanantes.length ? el('section', { class: 'tarjeta' },
      el('h3', {}, 'Suele aparecer junto a'),
      el('p', { class: 'tenue small' }, 'Palabras que comparten versículo con más frecuencia. Tócalas para ver esos pasajes.'),
      el('div', { class: 'chips' }, e.acompanantes.map(([w, n]) => el('a', { class: 'chip', href: `#/buscar?q=${encodeURIComponent(`${consulta} ${w}`)}&v=${ver}` }, `${w} `, el('span', { class: 'tenue' }, n))))) : null,
    el('section', {},
      el('h3', {}, `Todos los versículos (${e.versiculos})`),
      lista));
}

function cifra(n, texto) {
  return el('div', { class: 'cifra' }, el('strong', {}, n.toLocaleString('es')), el('span', {}, texto));
}
