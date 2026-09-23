/**
 * concordancia.js (vista) — Concordancia de la Biblia, como las impresas.
 *
 *   #/concordancia                    índice alfabético de todas las palabras
 *   #/concordancia?letra=g            palabras que empiezan con G
 *   #/concordancia/amor               cada aparición de "amor" con su contexto
 *   #/concordancia/justific?modo=raiz&orden=derecha&en=nt
 */

import { el, render, descargar, toast } from '../ui.js';
import { almacen } from '../almacen.js';
import { LIBROS } from '../libros.js';
import { formatear, aClave, normalizar } from '../referencias.js';
import { bibliaCompleta, versiones, version as datosVersion } from '../texto.js';
import { indicePalabras, concordancia, ordenarLineas, colocaciones, concordanciaATexto, claveOrden } from '../concordancia.js';
import { ALCANCES } from './buscar.js';

const LETRAS = 'abcdefghijklmnñopqrstuvwxyz'.split('');
const POR_PAGINA = 400;

// El índice de una versión tarda un momento en calcularse: se guarda mientras la app está abierta
const indices = new Map();
async function indiceDe(ver) {
  if (!indices.has(ver)) indices.set(ver, bibliaCompleta(ver).then((libros) => ({ libros, indice: indicePalabras(libros) })));
  return indices.get(ver);
}

export async function vistaConcordancia(app, ruta) {
  const termino = (ruta.partes[0] || '').trim();
  const p = ruta.params;
  const ver = p.get('v') || almacen.ajustes.principal;
  if (termino) return pintarLineas(app, termino, ver, p);
  return pintarIndice(app, ver, p);
}

function selectorVersion(ver, alCambiar) {
  return el('select', { class: 'input', title: 'Versión', onChange: (e) => alCambiar(e.target.value) },
    versiones().map((v) => el('option', { value: v.id, selected: v.id === ver }, v.abrev)));
}

function irA(termino, ver, extra = {}) {
  const params = new URLSearchParams({ v: ver, ...extra });
  location.hash = `#/concordancia/${encodeURIComponent(termino)}?${params}`;
}

// ---------------------------------------------------------------- Índice alfabético

async function pintarIndice(app, ver, p) {
  const letra = p.get('letra') || 'a';
  const orden = p.get('orden') || 'alfa';
  const soloHapax = p.get('hapax') === '1';
  const filtroTexto = p.get('f') || '';
  const cambiar = (cambios) => {
    const params = new URLSearchParams({ v: ver, letra, orden, ...(soloHapax ? { hapax: '1' } : {}), ...(filtroTexto ? { f: filtroTexto } : {}), ...cambios });
    for (const [k, x] of [...params]) if (x === '' || x == null) params.delete(k);
    location.hash = `#/concordancia?${params}`;
  };

  const buscar = el('form', {
    class: 'fila-controles',
    onSubmit: (e) => {
      e.preventDefault();
      const q = e.target.q.value.trim();
      if (q) irA(q, ver, /\s/.test(q) ? { modo: 'frase' } : q.endsWith('*') ? { modo: 'raiz' } : {});
    },
  },
  el('input', { class: 'input grande grow', name: 'q', type: 'search', placeholder: 'Palabra o frase: gracia, justific*, "hijo del hombre"…', autofocus: true }),
  selectorVersion(ver, (v) => cambiar({ v })),
  el('button', { class: 'btn primario', type: 'submit' }, 'Ver concordancia'));

  const cuerpo = el('div', {}, el('p', { class: 'tenue' }, 'Preparando el índice de toda la Biblia…'));
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Concordancia'),
    el('p', { class: 'tenue' }, 'Todas las palabras de la Biblia en orden alfabético con su frecuencia. Toca una para ver cada aparición con su contexto, como en una concordancia impresa. Para el hebreo y el griego, usa la ', el('a', { href: '#/original' }, 'concordancia del original'), ' por número Strong.'),
    buscar,
    cuerpo));

  const { indice } = await indiceDe(ver);
  let lista = indice.palabras;
  if (filtroTexto) lista = lista.filter((x) => x.clave.startsWith(claveOrden(filtroTexto)));
  else if (!soloHapax) lista = lista.filter((x) => x.clave.startsWith(letra));
  if (soloHapax) lista = lista.filter((x) => x.n === 1);
  if (orden === 'frecuencia') lista = [...lista].sort((a, z) => z.n - a.n);
  let cuantos = POR_PAGINA;

  const tabla = el('div', { class: 'indice-palabras' });
  const pintarTabla = () => render(tabla,
    lista.slice(0, cuantos).map((x) => el('a', {
      class: 'entrada-indice', href: `#/concordancia/${encodeURIComponent(x.forma)}?v=${ver}`,
      title: x.formas.length > 1 ? `Formas: ${x.formas.map(([f, n]) => `${f} (${n})`).join(', ')}` : '',
    }, el('span', { class: 'entrada-palabra' }, x.forma), el('span', { class: 'entrada-n' }, x.n.toLocaleString('es')))),
    lista.length > cuantos ? el('button', { class: 'btn', onClick: () => { cuantos += POR_PAGINA * 2; pintarTabla(); } }, `Mostrar más (${lista.length - cuantos})`) : null);
  pintarTabla();

  render(cuerpo,
    el('div', { class: 'cifras' },
      el('div', { class: 'cifra' }, el('strong', {}, indice.total.toLocaleString('es')), el('span', {}, `palabras en ${datosVersion(ver)?.abrev}`)),
      el('div', { class: 'cifra' }, el('strong', {}, indice.distintas.toLocaleString('es')), el('span', {}, 'palabras distintas')),
      el('div', { class: 'cifra' }, el('strong', {}, indice.hapax.toLocaleString('es')), el('span', {}, 'aparecen una sola vez (hápax)'))),
    el('nav', { class: 'letras', 'aria-label': 'Letra inicial' }, LETRAS.map((l) => el('button', {
      class: `letra ${l === letra && !filtroTexto && !soloHapax ? 'activa' : ''}`,
      onClick: () => cambiar({ letra: l, f: '', hapax: '' }),
    }, l.toUpperCase()))),
    el('div', { class: 'fila-controles' },
      el('input', {
        class: 'input', type: 'search', value: filtroTexto, placeholder: 'Filtrar: palabras que empiezan con…',
        onChange: (e) => cambiar({ f: e.target.value.trim() }),
      }),
      el('select', { class: 'input', onChange: (e) => cambiar({ orden: e.target.value }) },
        el('option', { value: 'alfa', selected: orden === 'alfa' }, 'Orden alfabético'),
        el('option', { value: 'frecuencia', selected: orden === 'frecuencia' }, 'Más frecuentes primero')),
      el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: soloHapax, onChange: (e) => cambiar({ hapax: e.target.checked ? '1' : '' }) }), ' Solo hápax legómena')),
    el('p', { class: 'tenue small' }, `${lista.length.toLocaleString('es')} palabras${soloHapax ? ' que aparecen una sola vez' : filtroTexto ? ` que empiezan con “${filtroTexto}”` : ` con ${letra.toUpperCase()}`}`),
    lista.length ? tabla : el('p', { class: 'tenue' }, soloHapax || filtroTexto ? 'Ninguna palabra coincide.' : `Ninguna palabra de ${datosVersion(ver)?.abrev} empieza con ${letra.toUpperCase()}.`));
}

// ---------------------------------------------------------------- Líneas de concordancia

async function pintarLineas(app, termino, ver, p) {
  const modo = p.get('modo') || (/\s/.test(termino) ? 'frase' : termino.endsWith('*') ? 'raiz' : 'exacta');
  const orden = p.get('orden') || 'biblico';
  const en = p.get('en') || 'todo';
  const tildes = p.get('tildes') === '1';
  const cambiar = (cambios) => {
    const { termino: t = termino, v = ver, ...resto } = cambios;
    const extra = { modo, orden, en, ...(tildes ? { tildes: '1' } : {}), ...resto };
    for (const k of Object.keys(extra)) if (!extra[k]) delete extra[k];
    irA(t, v, extra);
  };

  const cuerpo = el('div', {}, el('p', { class: 'tenue' }, 'Buscando cada aparición…'));
  render(app, el('div', { class: 'pagina ancha' },
    el('a', { class: 'small', href: `#/concordancia?v=${ver}&letra=${claveOrden(termino)[0] || 'a'}` }, '← Índice alfabético'),
    el('h1', { class: 'titulo-concordancia' }, termino.replace(/\*$/, '')),
    cuerpo));

  const { libros, indice } = await indiceDe(ver);
  const filtro = (ALCANCES.find((a) => a.id === en) || ALCANCES[0]).f;
  const r = concordancia(libros, termino, { modo, tildes, filtro });
  const meta = datosVersion(ver);

  // Palabras vecinas en el índice alfabético, como al hojear una concordancia impresa
  const clave = claveOrden(termino.replace(/\*$/, ''));
  const pos = indice.palabras.findIndex((x) => x.clave >= clave);
  const anterior = pos > 0 ? indice.palabras[pos - 1] : null;
  const siguiente = indice.palabras[indice.palabras[pos]?.clave === clave ? pos + 1 : pos] || null;
  const parecidas = indice.palabras.filter((x) => x.clave !== clave && x.clave.startsWith(clave.slice(0, Math.max(4, clave.length - 2)))).slice(0, 16);

  const controles = el('div', { class: 'fila-controles controles-concordancia' },
    el('select', { class: 'input', title: 'Qué buscar', onChange: (e) => cambiar({ modo: e.target.value }) },
      el('option', { value: 'exacta', selected: modo === 'exacta' }, 'Solo esta forma'),
      el('option', { value: 'raiz', selected: modo === 'raiz' }, 'Todas las formas que empiezan así'),
      el('option', { value: 'frase', selected: modo === 'frase' }, 'Frase exacta')),
    el('select', { class: 'input', title: 'Ordenar', onChange: (e) => cambiar({ orden: e.target.value }) },
      el('option', { value: 'biblico', selected: orden === 'biblico' }, 'Orden bíblico'),
      el('option', { value: 'derecha', selected: orden === 'derecha' }, 'Por lo que sigue →'),
      el('option', { value: 'izquierda', selected: orden === 'izquierda' }, '← Por lo que precede')),
    el('select', { class: 'input', title: 'Dónde', onChange: (e) => cambiar({ en: e.target.value }) },
      ALCANCES.map((a) => el('option', { value: a.id, selected: a.id === en }, a.nombre))),
    selectorVersion(ver, (v) => cambiar({ v })),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: tildes, onChange: (e) => cambiar({ tildes: e.target.checked ? '1' : '' }) }), ' Distinguir tildes'));

  const vecinos = el('div', { class: 'vecinos' },
    anterior ? el('a', { class: 'btn chico', href: `#/concordancia/${encodeURIComponent(anterior.forma)}?v=${ver}` }, `← ${anterior.forma}`) : el('span'),
    el('span', { class: 'tenue small' }, 'Palabras vecinas en el índice'),
    siguiente ? el('a', { class: 'btn chico', href: `#/concordancia/${encodeURIComponent(siguiente.forma)}?v=${ver}` }, `${siguiente.forma} →`) : el('span'));

  if (!r.apariciones) {
    render(cuerpo, controles, vecinos,
      el('p', {}, `“${termino}” no aparece ${en === 'todo' ? '' : 'en esta parte de la Biblia '}en ${meta?.abrev}.`),
      modo === 'exacta' ? el('p', {}, el('button', { class: 'btn', onClick: () => cambiar({ modo: 'raiz' }) }, 'Probar con todas las formas que empiezan así')) : null,
      parecidas.length ? el('div', {}, el('p', { class: 'tenue small' }, 'Palabras parecidas:'), el('div', { class: 'chips' }, parecidas.map((x) => el('a', { class: 'chip', href: `#/concordancia/${encodeURIComponent(x.forma)}?v=${ver}` }, `${x.forma} `, el('span', { class: 'tenue' }, x.n))))) : null);
    return;
  }

  const lineas = ordenarLineas(r.lineas, orden);
  let filtroLibro = 0;
  let cuantos = POR_PAGINA;
  const lista = el('div', { class: 'kwic', lang: meta?.idioma });
  const refDe = (l) => ({ b: l.b, c: l.c, v: l.v, c2: l.c, v2: l.v });

  const pintarLista = () => {
    const visibles = lineas.filter((l) => !filtroLibro || l.b === filtroLibro);
    const filas = [];
    let libroActual = 0;
    for (const l of visibles.slice(0, cuantos)) {
      // En orden bíblico, cada libro lleva su encabezado con el número de apariciones
      if (orden === 'biblico' && l.b !== libroActual) {
        libroActual = l.b;
        filas.push(el('div', { class: 'kwic-libro' }, LIBROS[l.b - 1].nombre, el('span', { class: 'cuenta' }, r.porLibro[l.b - 1])));
      }
      const ref = refDe(l);
      filas.push(el('div', { class: 'kwic-fila' },
        el('a', { class: 'ref kwic-ref', href: `#/leer/${aClave(ref)}`, dataset: { ref: aClave(ref) } }, formatear(ref, { abreviado: true })),
        el('span', { class: 'kwic-izq' }, el('span', {}, `${l.cortadoIzq ? '…' : ''}${l.izq}`)),
        el('mark', { class: 'kwic-palabra' }, l.palabra),
        el('span', { class: 'kwic-der' }, `${l.der}${l.cortadoDer ? '…' : ''}`)));
    }
    render(lista, filas,
      visibles.length > cuantos ? el('button', { class: 'btn', onClick: () => { cuantos += POR_PAGINA; pintarLista(); } }, `Mostrar más (${visibles.length - cuantos})`) : null);
  };

  const maximo = Math.max(...r.porLibro);
  const barras = el('div', { class: 'grafico-libros' }, r.porLibro.map((n, i) => el('button', {
    type: 'button', class: `barra-libro ${i >= 39 ? 'nt' : 'at'} ${n ? '' : 'cero'}`, disabled: !n,
    title: `${LIBROS[i].nombre}: ${n}`, style: { '--alto': `${n ? Math.max(4, (n / maximo) * 100) : 0}%` },
    onClick: (e) => {
      filtroLibro = filtroLibro === i + 1 ? 0 : i + 1;
      for (const x of barras.children) x.classList.remove('activa');
      if (filtroLibro) e.currentTarget.classList.add('activa');
      cuantos = POR_PAGINA;
      pintarLista();
    },
  })));

  const col = colocaciones(r.lineas);
  const exportar = () => {
    const titulo = `Concordancia de “${termino}” — ${meta?.nombre} (${r.apariciones} apariciones)`;
    descargar(`concordancia-${normalizar(termino).replace(/[^a-z0-9]+/g, '-')}.txt`, concordanciaATexto(lineas, { titulo, formatearRef: (l) => formatear(refDe(l)) }), 'text/plain');
    toast('Concordancia descargada');
  };

  pintarLista();
  render(cuerpo,
    controles,
    vecinos,
    el('div', { class: 'cifras' },
      el('div', { class: 'cifra' }, el('strong', {}, r.apariciones.toLocaleString('es')), el('span', {}, 'apariciones')),
      el('div', { class: 'cifra' }, el('strong', {}, r.versiculos.toLocaleString('es')), el('span', {}, 'versículos')),
      el('div', { class: 'cifra' }, el('strong', {}, r.porLibro.filter(Boolean).length), el('span', {}, 'libros')),
      el('div', { class: 'cifra' }, el('strong', {}, r.porLibro.slice(0, 39).reduce((a, n) => a + n, 0)), el('span', {}, 'en el AT')),
      el('div', { class: 'cifra' }, el('strong', {}, r.porLibro.slice(39).reduce((a, n) => a + n, 0)), el('span', {}, 'en el NT'))),
    el('div', { class: 'rejilla-2' },
      el('section', { class: 'tarjeta' },
        el('h3', {}, 'Distribución por libro'),
        barras,
        el('div', { class: 'eje-libros tenue small' }, el('span', {}, 'Génesis'), el('span', {}, 'Mateo'), el('span', {}, 'Apocalipsis')),
        el('p', { class: 'tenue small' }, 'Toca una barra para ver solo ese libro.')),
      el('section', { class: 'tarjeta' },
        r.formas.length > 1 ? [el('h3', {}, 'Formas encontradas'), el('div', { class: 'chips' }, r.formas.slice(0, 20).map(([f, n]) =>
          el('a', { class: 'chip', href: `#/concordancia/${encodeURIComponent(f)}?v=${ver}&en=${en}` }, `${f} `, el('span', { class: 'tenue' }, n))))] : null,
        el('h3', {}, 'Palabras que la acompañan'),
        el('div', { class: 'colocaciones' },
          el('div', {}, el('span', { class: 'tenue small' }, 'Antes: '), el('div', { class: 'chips' }, col.antes.map(([w, n]) =>
            el('a', { class: 'chip', href: `#/concordancia/${encodeURIComponent(`${w} ${termino.replace(/\*$/, '')}`)}?v=${ver}&modo=frase` }, `${w} `, el('span', { class: 'tenue' }, n))))),
          el('div', {}, el('span', { class: 'tenue small' }, 'Después: '), el('div', { class: 'chips' }, col.despues.map(([w, n]) =>
            el('a', { class: 'chip', href: `#/concordancia/${encodeURIComponent(`${termino.replace(/\*$/, '')} ${w}`)}?v=${ver}&modo=frase` }, `${w} `, el('span', { class: 'tenue' }, n)))))),
        parecidas.length ? [el('h3', {}, 'Palabras de la misma familia'), el('div', { class: 'chips' }, parecidas.map((x) =>
          el('a', { class: 'chip', href: `#/concordancia/${encodeURIComponent(x.forma)}?v=${ver}` }, `${x.forma} `, el('span', { class: 'tenue' }, x.n))))] : null)),
    el('div', { class: 'acciones no-imprimir' },
      el('button', { class: 'btn', onClick: exportar }, '⬇ Descargar (.txt)'),
      el('button', { class: 'btn', onClick: () => window.print() }, '🖨 Imprimir'),
      el('a', { class: 'btn', href: `#/palabra/${encodeURIComponent(termino.replace(/\*$/, ''))}?v=${ver}${modo === 'raiz' ? '&raiz=1' : ''}` }, '🔤 Estudio de la palabra'),
      el('a', { class: 'btn', href: `#/buscar?q=${encodeURIComponent(modo === 'frase' ? `"${termino}"` : modo === 'raiz' ? `${termino.replace(/\*$/, '')}*` : termino)}&v=${ver}` }, '🔎 Abrir en Buscar')),
    r.lineas.length >= 50000 ? el('p', { class: 'aviso' }, 'Se muestran las primeras 50 000 apariciones.') : null,
    lista);
}
