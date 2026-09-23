/**
 * diagrama.js (vista) — Editor del diagrama de bloques de un pasaje.
 *
 *   #/diagrama                       lista de diagramas
 *   #/diagrama/nuevo?ref=45.5.1-11   diagramar un pasaje
 *   #/diagrama/<id>                  editar
 *
 * Tocar una palabra con la herramienta ✂ parte la línea antes de ella.
 * Tab / Mayús+Tab sangran la línea con el foco; las flechas mueven el foco.
 */

import { el, render, toast, descargar, confirmar, preguntar } from '../ui.js';
import { almacen } from '../almacen.js';
import { deClave, rango, formatearRango, aClave, refDesdeRango, parsear } from '../referencias.js';
import { textoRango, version } from '../texto.js';
import {
  RELACIONES, relacion, crearDiagrama, sangrar, unirConSiguiente, partirLinea, moverLinea, diagramaATexto, puntosPrincipales,
} from '../diagrama.js';
import { nuevoPunto, crearSermon, pasajesDe } from '../sermones.js';

export async function vistaDiagrama(app, ruta) {
  const id = ruta.partes[0];
  if (id === 'nuevo') {
    const ref = deClave(ruta.params.get('ref'));
    if (!ref) { location.hash = '#/diagrama'; return; }
    const { desde, hasta } = rango(ref);
    const existente = almacen.estado.diagramas.find((d) => d.desde === desde && d.hasta === hasta);
    if (existente) { location.replace(`#/diagrama/${existente.id}`); return; }
    const ver = almacen.ajustes.principal;
    const versos = await textoRango(ver, desde, hasta);
    if (!versos.length) { toast('No encontré el texto de ese pasaje', 'error'); return; }
    const d = crearDiagrama({ desde, hasta: versos.at(-1).id, version: ver, versos });
    almacen.guardarDiagrama(d);
    location.replace(`#/diagrama/${d.id}`);
    return;
  }
  const d = id && almacen.estado.diagramas.find((x) => x.id === id);
  if (d) return pintarEditor(app, structuredClone(d));
  return pintarLista(app);
}

function pintarLista(app) {
  const lista = [...almacen.estado.diagramas].sort((a, z) => a.desde - z.desde);
  const entrada = el('input', { class: 'input grow', placeholder: 'Pasaje a diagramar: Ro 5:1-11, Ef 1:3-14…' });
  const crear = (e) => {
    e.preventDefault();
    const r = parsear(entrada.value);
    if (!r || r.v == null) { toast('Escribe un pasaje con versículos, p. ej. Ef 2:1-10', 'error'); return; }
    location.hash = `#/diagrama/nuevo?ref=${aClave(r)}`;
  };
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Diagramas de bloques'),
    el('p', { class: 'tenue' }, 'El análisis estructural del pasaje: cada cláusula en su línea, la principal a la izquierda y las que dependen de ella sangradas, con la relación lógica que las une (causa, propósito, contraste…). Es la forma más rápida de ver el argumento del autor y de sacar de él el bosquejo del sermón.'),
    el('form', { class: 'fila-controles', onSubmit: crear }, entrada, el('button', { class: 'btn primario', type: 'submit' }, 'Diagramar')),
    lista.length
      ? el('ul', { class: 'lista-sermones' }, lista.map((d) => el('li', { class: 'tarjeta sermon-tarjeta' },
        el('div', { class: 'grow' },
          el('a', { href: `#/diagrama/${d.id}` }, el('strong', {}, formatearRango(d.desde, d.hasta))),
          el('div', { class: 'tenue small' }, `${d.lineas.length} líneas · ${d.lineas.filter((l) => l.relacion).length} relaciones marcadas · ${version(d.version)?.abrev || ''}`)),
        el('a', { class: 'btn chico', href: `#/diagrama/${d.id}` }, 'Abrir'))))
      : el('p', { class: 'tenue' }, 'Aún no has diagramado pasajes. También puedes empezar desde el lector: selecciona versículos y pulsa "▤ Diagrama" en la guía del pasaje.')));
}

function pintarEditor(app, d) {
  let tijera = false;
  let foco = 0;
  const guardar = () => almacen.guardarDiagrama(d);
  const cuerpo = el('div', { class: 'diagrama', lang: version(d.version)?.idioma || 'es' });
  const cambiar = (nuevas, nuevoFoco = foco) => { d.lineas = nuevas; foco = Math.max(0, Math.min(nuevoFoco, d.lineas.length - 1)); guardar(); pintar(); };

  const pintar = () => {
    let versoAnterior = null;
    render(cuerpo, d.lineas.map((l, i) => {
      const r = relacion(l.relacion);
      const nuevoVerso = l.v !== versoAnterior;
      versoAnterior = l.v;
      const palabras = l.texto.split(/\s+/);
      return el('div', {
        class: `linea-diagrama ${i === foco ? 'foco' : ''} ${nuevoVerso ? 'nuevo-verso' : ''}`,
        tabindex: 0, dataset: { i },
        style: { '--sangria': l.sangria },
        onFocus: () => { foco = i; for (const x of cuerpo.children) x.classList.toggle('foco', Number(x.dataset.i) === i); },
      },
      el('span', { class: 'num-diagrama' }, nuevoVerso ? l.v : ''),
      el('div', { class: 'cuerpo-linea' },
        el('span', { class: 'guias', 'aria-hidden': 'true' }, Array.from({ length: l.sangria }, () => el('span', { class: 'guia' }))),
        el('select', {
          class: `relacion-sel ${l.relacion ? `rel-${r.color}` : ''}`, title: 'Relación con la línea de la que depende',
          onChange: (e) => { const nuevas = d.lineas.map((x) => ({ ...x })); nuevas[i].relacion = e.target.value; if (e.target.value && !nuevas[i].sangria && i > 0) nuevas[i].sangria = 1; cambiar(nuevas, i); },
        }, groupedOptions(l.relacion)),
        el('span', { class: 'texto-linea' }, palabras.map((w, k) => el('span', {
          class: `palabra-linea ${tijera && k > 0 ? 'cortable' : ''}`,
          onClick: () => { if (tijera && k > 0) cambiar(partirLinea(d.lineas, i, k), i + 1); },
        }, w, ' '))),
        l.nota ? el('span', { class: 'nota-linea' }, l.nota) : null),
      el('div', { class: 'acciones-linea' },
        boton('⇤', 'Menos sangría (Mayús+Tab)', () => cambiar(sangrar(d.lineas, i, -1), i), l.sangria === 0),
        boton('⇥', 'Más sangría (Tab)', () => cambiar(sangrar(d.lineas, i, 1), i)),
        boton('↑', 'Subir', () => cambiar(moverLinea(d.lineas, i, -1), i - 1), i === 0),
        boton('↓', 'Bajar', () => cambiar(moverLinea(d.lineas, i, 1), i + 1), i === d.lineas.length - 1),
        boton('⤓', 'Unir con la siguiente', () => cambiar(unirConSiguiente(d.lineas, i), i), i === d.lineas.length - 1),
        boton('✎', 'Nota', async () => {
          const nota = await preguntar('Nota para esta línea (observación, término griego o hebreo, pregunta…):', l.nota || '');
          if (nota == null) return;
          const nuevas = d.lineas.map((x) => ({ ...x }));
          nuevas[i].nota = nota.trim();
          cambiar(nuevas, i);
        })));
    }));
    cuerpo.querySelector(`[data-i="${foco}"]`)?.focus({ preventScroll: true });
  };

  cuerpo.addEventListener('keydown', (e) => {
    const i = Number(e.target.closest?.('.linea-diagrama')?.dataset.i);
    if (Number.isNaN(i) || e.target.tagName === 'SELECT') return;
    if (e.key === 'Tab') { e.preventDefault(); cambiar(sangrar(d.lineas, i, e.shiftKey ? -1 : 1), i); }
    if (e.key === 'ArrowDown') { e.preventDefault(); foco = Math.min(d.lineas.length - 1, i + 1); cuerpo.querySelector(`[data-i="${foco}"]`)?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); foco = Math.max(0, i - 1); cuerpo.querySelector(`[data-i="${foco}"]`)?.focus(); }
  });

  const botonTijera = el('button', {
    class: 'btn', title: 'Activa y toca una palabra para partir la línea antes de ella',
    onClick: () => { tijera = !tijera; botonTijera.classList.toggle('activo', tijera); botonTijera.textContent = tijera ? '✂ Partiendo… (toca una palabra)' : '✂ Partir línea'; pintar(); },
  }, '✂ Partir línea');

  const alSermon = async () => {
    const puntos = puntosPrincipales(d.lineas);
    const texto = diagramaATexto(d.lineas);
    // ¿Hay ya un sermón sobre este mismo pasaje?
    const existente = almacen.estado.sermones.find((s) => pasajesDe(s).some((p) => p.desde <= d.hasta && p.hasta >= d.desde));
    const destino = existente && (await confirmar(`¿Agregar el diagrama al sermón "${existente.titulo || existente.pasaje}"? (Cancelar crea uno nuevo)`, { aceptar: 'Agregar' })) ? existente : null;
    const s = destino ? structuredClone(destino) : crearSermon({ pasaje: formatearRango(d.desde, d.hasta) });
    s.estructura = [s.estructura, `Diagrama de bloques:\n${texto}`].filter(Boolean).join('\n\n');
    if (!s.bosquejo.length && puntos.length > 1 && puntos.length <= 6) {
      const base = Math.floor(d.desde / 1000) * 1000;
      s.bosquejo = puntos.map((p) => nuevoPunto({ titulo: p.texto.replace(/[,;:.]$/, ''), pasaje: formatearRango(base + p.v, base + p.v, { abreviado: true }) }));
    }
    almacen.guardarSermon(s);
    toast(destino ? 'Diagrama agregado al sermón' : 'Sermón creado con el diagrama y un bosquejo sugerido');
    location.hash = `#/sermones/${s.id}?paso=exegesis`;
  };

  render(app, el('div', { class: 'pagina ancha' },
    el('a', { class: 'small', href: '#/diagrama' }, '← Diagramas'),
    el('div', { class: 'titulo-pagina' },
      el('h1', {}, formatearRango(d.desde, d.hasta)),
      el('div', { class: 'acciones' },
        botonTijera,
        el('a', { class: 'btn', href: `#/leer/${aClave(refDesdeRango(d.desde, d.hasta))}` }, '📖 Leer'),
        el('button', { class: 'btn primario', onClick: alSermon }, '🎤 Llevar al sermón'),
        el('button', { class: 'btn', onClick: () => descargar(`diagrama-${formatearRango(d.desde, d.hasta).replace(/[^\p{L}\p{N}]+/gu, '-')}.txt`, `${formatearRango(d.desde, d.hasta)}\n\n${diagramaATexto(d.lineas)}\n`, 'text/plain') }, '⬇ Texto'),
        el('button', { class: 'btn', onClick: () => window.print() }, '🖨'),
        el('button', { class: 'btn peligro', onClick: async () => { if (await confirmar('¿Borrar este diagrama?', { aceptar: 'Borrar', peligro: true })) { almacen.borrarDiagrama(d.id); location.hash = '#/diagrama'; } } }, 'Borrar'))),
    el('details', { class: 'ayuda-busqueda' },
      el('summary', {}, 'Cómo diagramar'),
      el('ol', {},
        el('li', {}, 'Lee el pasaje y encuentra las proposiciones principales (verbos principales): déjalas sin sangría.'),
        el('li', {}, 'Sangra debajo de cada una las cláusulas que la explican o dependen de ella (Tab / ⇥).'),
        el('li', {}, 'Elige la relación de cada cláusula con la de arriba: causa, propósito, contraste… Los conectores (porque, para que, mas) ya vienen sugeridos.'),
        el('li', {}, 'Parte o une líneas cuando haga falta (✂ y ⤓). Las líneas sin sangría forman el bosquejo que se lleva al sermón.'))),
    el('div', { class: 'leyenda-relaciones' }, RELACIONES.filter((r) => r.id && d.lineas.some((l) => l.relacion === r.id)).map((r) =>
      el('span', { class: `chip rel-${r.color}` }, r.nombre))),
    cuerpo));
  pintar();
}

function groupedOptions(actual) {
  const grupos = [...new Set(RELACIONES.map((r) => r.grupo))];
  return grupos.map((g) => (g
    ? el('optgroup', { label: g }, RELACIONES.filter((r) => r.grupo === g).map((r) => el('option', { value: r.id, selected: r.id === actual }, r.nombre)))
    : el('option', { value: '', selected: !actual }, '—')));
}

function boton(texto, titulo, alPulsar, deshabilitado) {
  return el('button', { class: 'btn icono chico', type: 'button', title: titulo, disabled: deshabilitado, onClick: alPulsar }, texto);
}
