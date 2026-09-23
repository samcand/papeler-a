/**
 * memoria.js (vista) — Memorizar versículos: repaso del día con pistas
 * (iniciales, huecos), escribirlo de memoria y autoevaluación.
 *
 *   #/memoria           repaso de hoy y lista de versículos
 */

import { el, render, toast, fecha } from '../ui.js';
import { almacen } from '../almacen.js';
import { parsear, rango, formatearRango, aClave, refDesdeRango, normalizar } from '../referencias.js';
import { textoRango } from '../texto.js';
import { repasar, pendientes, pista, comparar, aprendido, INTERVALOS } from '../memoria.js';

const SUGERIDOS = ['Jn 3:16', 'Sal 23:1', 'Ro 8:28', 'Fil 4:13', 'Pr 3:5-6', 'Is 41:10', 'Jos 1:9', 'Ef 2:8-9', 'Mt 6:33', '2 Ti 3:16-17', 'Ro 12:1-2', 'Gá 2:20'];

async function textoDe(t) {
  const versos = await textoRango(almacen.ajustes.principal, t.desde, t.hasta);
  return versos.map((x) => x.texto).join(' ');
}

export async function vistaMemoria(app) {
  const refrescar = () => vistaMemoria(app);
  const todas = almacen.estado.memoria;
  const hoy = pendientes(todas);
  const entrada = el('input', { class: 'input grow', placeholder: 'Versículo para memorizar: Sal 119:11, Ro 5:8…' });
  const agregar = (cita) => {
    const r = parsear(cita);
    if (!r || r.v == null) { toast('Escribe un versículo o rango, p. ej. Ro 5:8', 'error'); return; }
    const { desde, hasta } = rango(r);
    if (almacen.agregarMemoria(desde, hasta)) { toast(`${formatearRango(desde, hasta)} agregado`); refrescar(); } else toast('Ya está en tu lista');
  };

  const sesion = el('section', {});
  render(app, el('div', { class: 'pagina angosta' },
    el('h1', {}, 'Memorizar la Palabra'),
    el('p', { class: 'tenue' }, 'Repetición espaciada: lo nuevo se repasa a diario y lo aprendido cada vez menos (1, 3, 7, 14, 30 y 90 días). Unos minutos al día bastan.'),
    el('div', { class: 'cifras' },
      el('div', { class: 'cifra' }, el('strong', {}, hoy.length), el('span', {}, 'para repasar hoy')),
      el('div', { class: 'cifra' }, el('strong', {}, todas.length), el('span', {}, 'versículos')),
      el('div', { class: 'cifra' }, el('strong', {}, todas.filter(aprendido).length), el('span', {}, 'ya aprendidos'))),
    sesion,
    el('form', { class: 'fila-controles', onSubmit: (e) => { e.preventDefault(); agregar(entrada.value); entrada.value = ''; } },
      entrada, el('button', { class: 'btn primario', type: 'submit' }, '+ Agregar')),
    el('div', { class: 'chips' }, SUGERIDOS.map((c) => el('button', { class: 'chip', onClick: () => agregar(c) }, `+ ${c}`))),
    el('h2', {}, 'Mis versículos'),
    todas.length ? el('ul', { class: 'lista-memoria' }, [...todas].sort((a, z) => a.desde - z.desde).map((t) => el('li', {},
      el('a', { class: 'ref', href: `#/leer/${aClave(refDesdeRango(t.desde, t.hasta))}`, dataset: { ref: aClave(refDesdeRango(t.desde, t.hasta)) } }, formatearRango(t.desde, t.hasta)),
      el('span', { class: 'cajas', title: `Caja ${t.caja} de ${INTERVALOS.length - 1}` }, INTERVALOS.slice(1).map((_, i) => el('span', { class: `caja ${i < t.caja ? 'llena' : ''}` }))),
      el('span', { class: 'tenue small' }, aprendido(t) ? '✓ aprendido' : t.proxima <= Date.now() ? 'hoy' : `próximo: ${fecha(t.proxima)}`),
      el('button', { class: 'btn icono chico', title: 'Quitar', onClick: () => { almacen.quitarMemoria(t.id); refrescar(); } }, '✕'))))
      : el('p', { class: 'tenue' }, 'Agrega versículos aquí, desde la guía del pasaje (🧠 Memorizar) o desde los devocionales.')));

  if (!hoy.length) {
    render(sesion, el('div', { class: 'tarjeta destacada' }, el('h3', {}, todas.length ? '¡Al día! No hay repasos pendientes.' : 'Empieza agregando un versículo.')));
    return;
  }
  await pintarTarjeta(sesion, hoy, 0, refrescar);
}

async function pintarTarjeta(contenedor, cola, i, refrescar) {
  const t = cola[i];
  if (!t) {
    render(contenedor, el('div', { class: 'tarjeta destacada' }, el('h3', {}, '✓ Repaso de hoy terminado'), el('button', { class: 'btn', onClick: refrescar }, 'Ver resumen')));
    return;
  }
  const texto = await textoDe(t);
  let modo = t.caja >= 3 ? 'nada' : t.caja >= 1 ? 'huecos' : 'iniciales';
  const zona = el('p', { class: 'texto-memoria' });
  const escrito = el('textarea', { class: 'input', rows: 3, placeholder: 'Escríbelo de memoria (opcional) y pulsa Comprobar…' });
  const resultado = el('p', { class: 'small' });
  const pintarZona = () => {
    if (modo === 'texto') render(zona, texto);
    else if (modo === 'nada') render(zona, el('span', { class: 'tenue' }, 'Recítalo en voz alta o escríbelo, y luego muestra el texto.'));
    else render(zona, pista(texto, modo, { caja: t.caja }));
  };
  pintarZona();
  const calificar = (res) => {
    almacen.guardarMemoria(repasar(t, res));
    pintarTarjeta(contenedor, cola, i + 1, refrescar);
  };
  const modoBtn = (m, nombre) => el('button', { class: `chip ${modo === m ? 'activo' : ''}`, onClick: (e) => { modo = m; for (const b of e.currentTarget.parentNode.children) b.classList.remove('activo'); e.currentTarget.classList.add('activo'); pintarZona(); } }, nombre);

  render(contenedor, el('div', { class: 'tarjeta destacada tarjeta-memoria' },
    el('div', { class: 'panel-sub' }, `Repaso ${i + 1} de ${cola.length} · caja ${t.caja}`),
    el('h2', { class: 'ref-memoria' }, formatearRango(t.desde, t.hasta)),
    el('div', { class: 'chips' }, modoBtn('nada', 'Sin ayuda'), modoBtn('iniciales', 'Iniciales'), modoBtn('huecos', 'Con huecos'), modoBtn('texto', 'Ver texto')),
    zona,
    escrito,
    el('div', { class: 'acciones' },
      el('button', { class: 'btn', onClick: () => {
        const p = comparar(escrito.value, texto, normalizar);
        render(resultado, el('strong', { class: p >= 90 ? 'ok' : p >= 60 ? 'aviso' : 'mal' }, `${p}% de las palabras`), p >= 90 ? ' ¡Excelente!' : ' Revisa el texto.');
        modo = 'texto'; pintarZona();
      } }, 'Comprobar'),
      resultado),
    el('div', { class: 'acciones calificar' },
      el('span', { class: 'tenue small' }, '¿Cómo te fue?'),
      el('button', { class: 'btn peligro', onClick: () => calificar('mal') }, 'No lo sabía'),
      el('button', { class: 'btn', onClick: () => calificar('casi') }, 'Casi'),
      el('button', { class: 'btn primario', onClick: () => calificar('bien') }, 'Lo sabía'))));
}
