/**
 * buscar.js — Búsqueda en toda la Biblia, con resultados por libro y
 * coincidencias resaltadas. También busca en tus notas.
 */

import { el, render, textoConTramos } from '../ui.js';
import { almacen } from '../almacen.js';
import { LIBROS, SECCIONES } from '../libros.js';
import { formatear, aClave } from '../referencias.js';
import { bibliaCompleta, versiones } from '../texto.js';
import { buscar } from '../busqueda.js';
import { filtrarNotas } from '../notas.js';

export const ALCANCES = [
  { id: 'todo', nombre: 'Toda la Biblia', f: () => true },
  { id: 'at', nombre: 'Antiguo Testamento', f: (b) => b <= 39 },
  { id: 'nt', nombre: 'Nuevo Testamento', f: (b) => b >= 40 },
  ...SECCIONES.filter((s) => s.desde !== s.hasta).map((s) => ({ id: `s${s.desde}`, nombre: s.nombre, f: (b) => b >= s.desde && b <= s.hasta })),
  ...LIBROS.map((l) => ({ id: `l${l.n}`, nombre: l.nombre, f: (b) => b === l.n })),
];

const POR_PAGINA = 100;

export async function vistaBuscar(app, ruta) {
  const p = ruta.params;
  const q = p.get('q') || '';
  const en = p.get('en') || 'todo';
  const ver = p.get('v') || almacen.ajustes.principal;
  const tildes = p.get('tildes') === '1';

  const entrada = el('input', { class: 'input grande', type: 'search', value: q, placeholder: 'gracia fe · "el verbo" · amor|caridad · justific* · -ley', autofocus: !q });
  const alcance = el('select', { class: 'input' }, ALCANCES.map((a) => el('option', { value: a.id, selected: a.id === en }, a.nombre)));
  const version = el('select', { class: 'input' }, versiones().map((v) => el('option', { value: v.id, selected: v.id === ver }, v.abrev)));
  const conTildes = el('input', { type: 'checkbox', checked: tildes });
  const resultados = el('div', { class: 'resultados' });

  const enviar = (e) => {
    e?.preventDefault();
    const params = new URLSearchParams({ q: entrada.value.trim(), en: alcance.value, v: version.value });
    if (conTildes.checked) params.set('tildes', '1');
    location.hash = `#/buscar?${params}`;
  };

  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Buscar en la Biblia'),
    el('form', { class: 'form-buscar', onSubmit: enviar },
      entrada,
      el('div', { class: 'fila-controles' },
        alcance, version,
        el('label', { class: 'check' }, conTildes, ' Distinguir tildes'),
        el('button', { class: 'btn primario', type: 'submit' }, 'Buscar'))),
    el('details', { class: 'ayuda-busqueda' },
      el('summary', {}, 'Cómo buscar'),
      el('ul', {},
        el('li', {}, el('code', {}, 'gracia fe'), ' — versículos con ambas palabras'),
        el('li', {}, el('code', {}, '"el verbo"'), ' — la frase exacta'),
        el('li', {}, el('code', {}, 'amor|caridad'), ' — cualquiera de las dos'),
        el('li', {}, el('code', {}, 'justific*'), ' — palabras que empiezan así'),
        el('li', {}, el('code', {}, 'pastor -ovejas'), ' — excluye versículos con "ovejas"'),
        el('li', {}, 'Escribe una cita (', el('code', {}, 'Ro 8:28'), ') en la caja de arriba para ir directo al pasaje.'))),
    resultados));

  if (!q) return;
  render(resultados, el('p', { class: 'tenue' }, 'Cargando la Biblia completa (solo la primera vez)…'));
  const libros = await bibliaCompleta(ver, (x) => {
    resultados.firstChild && (resultados.firstChild.textContent = `Cargando la Biblia completa… ${Math.round(x * 100)}%`);
  });
  const filtro = (ALCANCES.find((a) => a.id === en) || ALCANCES[0]).f;
  const inicio = performance.now();
  const r = buscar(libros, q, { filtro, tildes });
  const ms = Math.round(performance.now() - inicio);
  const notas = filtrarNotas(almacen.estado.notas, { texto: q.replace(/["*|]/g, ' ').trim() });

  if (!r.total) {
    render(resultados,
      el('p', {}, `No se encontró “${q}”.`),
      el('p', { class: 'tenue' }, 'Prueba sin tildes, con menos palabras o con * al final (p. ej. ', el('code', {}, 'bienaventura*'), ').'),
      notas.length ? enlaceNotas(notas, q) : null);
    return;
  }

  const lista = el('ol', { class: 'lista-resultados' });
  let filtroLibro = 0;
  let pagina = 0;
  const pintarLista = () => {
    const visibles = r.resultados.filter((x) => !filtroLibro || x.b === filtroLibro);
    const lote = visibles.slice(0, (pagina + 1) * POR_PAGINA);
    render(lista, lote.map((x) => {
      const ref = { b: x.b, c: x.c, v: x.v, c2: x.c, v2: x.v };
      return el('li', { class: 'resultado' },
        el('a', { class: 'ref', href: `#/leer/${aClave(ref)}`, dataset: { ref: aClave(ref) } }, formatear(ref)),
        el('div', { class: 'resultado-texto' }, textoConTramos(x.texto, x.tramos)));
    }),
    visibles.length > lote.length
      ? el('li', { class: 'mas' }, el('button', { class: 'btn', onClick: () => { pagina++; pintarLista(); } }, `Mostrar más (${visibles.length - lote.length} restantes)`))
      : null);
  };

  const maximo = Math.max(...r.porLibro);
  const barras = el('div', { class: 'grafico-libros', role: 'img', 'aria-label': 'Resultados por libro' },
    r.porLibro.map((n, i) => el('button', {
      type: 'button', class: `barra-libro ${i >= 39 ? 'nt' : 'at'} ${n ? '' : 'cero'}`,
      title: `${LIBROS[i].nombre}: ${n}`,
      style: { '--alto': `${n ? Math.max(4, (n / maximo) * 100) : 0}%` },
      disabled: !n,
      onClick: (e) => {
        filtroLibro = filtroLibro === i + 1 ? 0 : i + 1;
        pagina = 0;
        for (const b of barras.children) b.classList.remove('activa');
        if (filtroLibro) e.currentTarget.classList.add('activa');
        render(filtroTxt, filtroLibro ? [`Solo ${LIBROS[i].nombre} (${n}) · `, el('button', { class: 'enlace', onClick: () => { filtroLibro = 0; render(filtroTxt); for (const b of barras.children) b.classList.remove('activa'); pintarLista(); } }, 'ver todos')] : null);
        pintarLista();
      },
    })));
  const filtroTxt = el('span', { class: 'tenue' });

  const principales = r.porLibro.map((n, i) => [n, i]).filter(([n]) => n).sort((a, z) => z[0] - a[0]).slice(0, 6);
  render(resultados,
    el('div', { class: 'resumen-busqueda' },
      el('strong', {}, `${r.total.toLocaleString('es')} versículos`),
      ` · ${r.porLibro.filter(Boolean).length} libros · ${ms} ms`,
      r.total > r.resultados.length ? el('span', { class: 'tenue' }, ` (se muestran los primeros ${r.resultados.length})`) : null),
    el('div', { class: 'tarjeta' },
      barras,
      el('div', { class: 'eje-libros tenue small' }, el('span', {}, 'Génesis'), el('span', {}, 'Mateo'), el('span', {}, 'Apocalipsis')),
      el('div', { class: 'chips' }, principales.map(([n, i]) => el('span', { class: 'chip' }, `${LIBROS[i].nombre} ${n}`)))),
    notas.length ? enlaceNotas(notas, q) : null,
    filtroTxt,
    lista);
  pintarLista();
}

function enlaceNotas(notas, q) {
  return el('p', { class: 'aviso-notas' }, `También aparece en ${notas.length} ${notas.length === 1 ? 'nota tuya' : 'notas tuyas'}: `,
    el('a', { href: `#/cuaderno/notas?q=${encodeURIComponent(q)}` }, 'ver en el cuaderno'));
}
