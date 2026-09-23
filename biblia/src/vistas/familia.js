/**
 * familia.js — Devocionales para hijos, esposa, esposo y la pareja, con
 * diario (respuestas y peticiones), constancia, lectura en voz alta e impresión.
 *
 *   #/familia                 elegir destinatario (y el devocional de hoy)
 *   #/familia/hijos           lista de devocionales de los hijos
 *   #/familia/hijos/h03       un devocional
 *   #/familia/diario          todo lo escrito en el diario
 */

import { el, render, toast, fecha } from '../ui.js';
import { almacen } from '../almacen.js';
import { parsearLista, rango, formatear, aClave } from '../referencias.js';
import { textoRango } from '../texto.js';
import {
  DESTINATARIOS, devocionalesPara, devocional, delDia, fechaClave, rachaDevocional,
} from '../devocionales.js';

export async function vistaFamilia(app, ruta) {
  const [para, id] = ruta.partes;
  if (para === 'diario') return pintarDiario(app);
  const destinatario = DESTINATARIOS.find((d) => d.id === para);
  if (destinatario && id && devocional(id)) return pintarDevocional(app, devocional(id));
  return pintarInicio(app, destinatario);
}

function pestanas(actual) {
  return el('nav', { class: 'subpestanas' },
    el('a', { href: '#/familia', class: !actual ? 'activa' : '' }, 'Hoy'),
    DESTINATARIOS.map((d) => el('a', { href: `#/familia/${d.id}`, class: actual === d.id ? 'activa' : '' }, `${d.icono} ${d.nombre}`)),
    el('a', { href: '#/familia/diario', class: actual === 'diario' ? 'activa' : '' }, '📓 Diario'));
}

const hechoHoy = (d) => almacen.estado.diario.some((x) => x.devocional === d.id && x.fecha === fechaClave() && x.hecho);
const vecesHecho = (d) => almacen.estado.diario.filter((x) => x.devocional === d.id && x.hecho).length;

function pintarInicio(app, destinatario) {
  if (!destinatario) {
    render(app, el('div', { class: 'pagina' },
      el('h1', {}, 'Devocional familiar'),
      el('p', { class: 'tenue' }, 'Devocionales con base exegética para cada miembro de la familia. Cada uno trae el pasaje, contexto, idea central, reflexión, preguntas, una aplicación concreta, oración y un versículo para memorizar.'),
      pestanas(null),
      el('div', { class: 'rejilla-planes' }, DESTINATARIOS.map((d) => {
        const hoy = delDia(d.id);
        const racha = rachaDevocional(almacen.estado.diario, d.id);
        return el('article', { class: `tarjeta devo-hoy ${hechoHoy(hoy) ? 'hecho' : ''}` },
          el('div', { class: 'panel-sub' }, `${d.icono} Para ${d.nombre.toLowerCase()} · hoy`),
          el('h3', {}, hoy.titulo),
          el('p', { class: 'small' }, el('a', { class: 'ref', href: `#/leer/${aClave(parsearLista(hoy.texto)[0])}` }, hoy.texto), ' · ', el('span', { class: 'tenue' }, hoy.serie)),
          el('p', { class: 'tenue small' }, hoy.idea),
          el('div', { class: 'acciones' },
            el('a', { class: `btn ${hechoHoy(hoy) ? 'hecho' : 'primario'}`, href: `#/familia/${d.id}/${hoy.id}` }, hechoHoy(hoy) ? '✓ Hecho hoy' : 'Empezar'),
            racha ? el('span', { class: 'tenue small' }, `🔥 ${racha} ${racha === 1 ? 'día' : 'días'} seguidos`) : null));
      }))));
    return;
  }
  const lista = devocionalesPara(destinatario.id);
  const series = [...new Set(lista.map((d) => d.serie))];
  const hoy = delDia(destinatario.id);
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, `${destinatario.icono} Devocionales para ${destinatario.nombre.toLowerCase()}`),
    el('p', { class: 'tenue' }, destinatario.descripcion),
    pestanas(destinatario.id),
    series.map((s) => el('section', { class: 'grupo-marcas' },
      el('h3', {}, s),
      el('ul', { class: 'lista-devos' }, lista.filter((d) => d.serie === s).map((d) => el('li', {},
        el('a', { href: `#/familia/${destinatario.id}/${d.id}` },
          el('strong', {}, d.titulo),
          el('span', { class: 'tenue small' }, ` · ${d.texto}`)),
        d.id === hoy.id ? el('span', { class: 'chip activo' }, 'Hoy') : null,
        vecesHecho(d) ? el('span', { class: 'hecho-marca', title: `Hecho ${vecesHecho(d)} ${vecesHecho(d) === 1 ? 'vez' : 'veces'}` }, '✓') : null))))),
    el('p', { class: 'tenue small' }, 'El devocional "de hoy" rota cada día. Puedes hacerlos en el orden que quieras.')));
}

async function textoDe(cita) {
  const refs = parsearLista(cita);
  const bloques = [];
  for (const r of refs) {
    const { desde, hasta } = rango(r);
    bloques.push({ ref: r, versos: await textoRango(almacen.ajustes.principal, desde, hasta) });
  }
  return bloques;
}

async function pintarDevocional(app, d) {
  const destinatario = DESTINATARIOS.find((x) => x.id === d.para);
  const hoy = fechaClave();
  const entrada = almacen.estado.diario.find((x) => x.devocional === d.id && x.fecha === hoy)
    || { devocional: d.id, para: d.para, fecha: hoy, respuestas: ['', '', ''], peticion: '', hecho: false };
  const anteriores = almacen.estado.diario.filter((x) => x.devocional === d.id && x.fecha !== hoy && (x.respuestas?.some(Boolean) || x.peticion))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const [pasaje, memoria] = await Promise.all([textoDe(d.texto), textoDe(d.memoria)]);
  const guardar = () => almacen.guardarDiario({ ...entrada });
  const parrafos = (t) => t.split('\n\n').map((p) => el('p', {}, p));

  const cuerpo = el('article', { class: 'devocional' },
    el('div', { class: 'panel-sub' }, `${destinatario.icono} Para ${destinatario.nombre.toLowerCase()} · ${d.serie}`),
    el('h1', {}, d.titulo),
    el('section', { class: 'devo-pasaje' },
      pasaje.map((b) => el('div', {},
        el('a', { class: 'ref', href: `#/leer/${aClave(b.ref)}`, dataset: { ref: aClave(b.ref) } }, formatear(b.ref)),
        el('p', { class: 'texto-biblico' }, b.versos.map((x) => el('span', {}, el('sup', {}, x.v), ' ', x.texto, ' ')))))),
    seccion('Contexto', el('p', {}, d.contexto), 'contexto'),
    el('div', { class: 'devo-idea' }, el('span', { class: 'panel-sub' }, 'Idea central'), el('p', {}, d.idea)),
    seccion('Reflexión', parrafos(d.reflexion)),
    d.pequenos ? seccion('Para los más pequeños (4-7 años)', el('p', {}, d.pequenos), 'pequenos') : null,
    d.adolescentes ? seccion('Para adolescentes', el('p', {}, d.adolescentes), 'adolescentes') : null,
    seccion('Preguntas', el('ol', { class: 'devo-preguntas' }, d.preguntas.map((q, i) => el('li', {},
      el('p', {}, q),
      el('textarea', {
        class: 'input no-imprimir', rows: 2, placeholder: 'Respuesta (se guarda en tu diario)…',
        onInput: (e) => { entrada.respuestas[i] = e.target.value; guardar(); },
      }, entrada.respuestas?.[i] || ''))))),
    seccion('Aplicación', el('p', {}, d.aplicacion), 'aplicacion'),
    seccion('Oración', el('p', { class: 'devo-oracion' }, d.oracion)),
    seccion('Para memorizar', memoria.map((b) => el('blockquote', { class: 'devo-memoria' },
      b.versos.map((x) => `${x.texto} `), el('cite', {}, `— ${formatear(b.ref)}`),
      el('button', { class: 'btn chico no-imprimir', onClick: () => { const { desde, hasta } = rango(b.ref); toast(almacen.agregarMemoria(desde, hasta) ? 'Agregado a tus versículos para memorizar' : 'Ya lo estás memorizando'); } }, '🧠 Memorizar'))), 'memoria'),
    seccion('Peticiones de oración', el('textarea', {
      class: 'input', rows: 3, placeholder: 'Peticiones de la familia, motivos de gratitud…',
      onInput: (e) => { entrada.peticion = e.target.value; guardar(); },
    }, entrada.peticion || '')),
    anteriores.length ? seccion('Veces anteriores', anteriores.map((x) => el('div', { class: 'tarjeta-nota' },
      el('strong', {}, fecha(new Date(`${x.fecha}T12:00:00`).getTime())),
      x.respuestas?.map((r, i) => (r ? el('p', { class: 'small' }, el('span', { class: 'tenue' }, `${i + 1}. `), r) : null)),
      x.peticion ? el('p', { class: 'small' }, el('span', { class: 'tenue' }, 'Oración: '), x.peticion) : null))) : null);

  const botonHecho = el('button', {
    class: `btn ${entrada.hecho ? 'hecho' : 'primario'}`,
    onClick: () => {
      entrada.hecho = !entrada.hecho;
      guardar();
      botonHecho.className = `btn ${entrada.hecho ? 'hecho' : 'primario'}`;
      botonHecho.textContent = entrada.hecho ? '✓ Hecho hoy' : 'Marcar como hecho';
      if (entrada.hecho) { const n = rachaDevocional(almacen.estado.diario, d.para); toast(`¡Bien! ${n} ${n === 1 ? 'día' : 'días'} seguidos`); }
    },
  }, entrada.hecho ? '✓ Hecho hoy' : 'Marcar como hecho');

  const lista = devocionalesPara(d.para);
  const i = lista.indexOf(d);
  render(app, el('div', { class: 'pagina angosta' },
    el('div', { class: 'acciones no-imprimir devo-barra' },
      el('a', { class: 'btn chico', href: `#/familia/${d.para}` }, `← ${destinatario.nombre}`),
      el('span', { class: 'grow' }),
      'speechSynthesis' in window ? el('button', { class: 'btn chico', onClick: (e) => leerEnVoz(e.currentTarget, d, pasaje) }, '🔊 Leer en voz alta') : null,
      el('button', { class: 'btn chico', onClick: () => window.print() }, '🖨 Imprimir')),
    cuerpo,
    el('div', { class: 'lector-pie no-imprimir' },
      lista[i - 1] ? el('a', { class: 'btn', href: `#/familia/${d.para}/${lista[i - 1].id}` }, '‹ Anterior') : el('span'),
      botonHecho,
      lista[i + 1] ? el('a', { class: 'btn', href: `#/familia/${d.para}/${lista[i + 1].id}` }, 'Siguiente ›') : el('span'))));
  window.scrollTo({ top: 0 });
  return () => speechSynthesis?.cancel();
}

function seccion(titulo, contenido, clase = '') {
  return el('section', { class: `devo-seccion ${clase}` }, el('h2', {}, titulo), contenido);
}

/** Lee el devocional con la voz del sistema (ideal para los niños o mientras se maneja). */
function leerEnVoz(boton, d, pasaje) {
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); boton.textContent = '🔊 Leer en voz alta'; return; }
  const partes = [
    d.titulo,
    ...pasaje.map((b) => `${formatear(b.ref)}. ${b.versos.map((x) => x.texto).join(' ')}`),
    d.para === 'hijos' ? d.pequenos : d.contexto,
    `Idea central: ${d.idea}`,
    d.reflexion,
    'Preguntas.', ...d.preguntas,
    `Aplicación: ${d.aplicacion}`,
    `Oremos. ${d.oracion}`,
  ];
  const voz = speechSynthesis.getVoices().find((v) => v.lang?.startsWith('es'));
  partes.forEach((texto, i) => {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-ES';
    if (voz) u.voice = voz;
    u.rate = 0.95;
    if (i === partes.length - 1) u.onend = () => { boton.textContent = '🔊 Leer en voz alta'; };
    speechSynthesis.speak(u);
  });
  boton.textContent = '⏹ Detener';
}

function pintarDiario(app) {
  const entradas = [...almacen.estado.diario].filter((x) => x.hecho || x.peticion || x.respuestas?.some(Boolean))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Diario devocional'),
    pestanas('diario'),
    el('div', { class: 'cifras' }, DESTINATARIOS.map((d) => el('div', { class: 'cifra' },
      el('strong', {}, almacen.estado.diario.filter((x) => x.para === d.id && x.hecho).length),
      el('span', {}, `${d.icono} ${d.nombre} · racha ${rachaDevocional(almacen.estado.diario, d.id)}`)))),
    entradas.length ? entradas.map((x) => {
      const d = devocional(x.devocional);
      if (!d) return null;
      return el('article', { class: 'tarjeta tarjeta-nota' },
        el('div', { class: 'tarjeta-cab' },
          el('div', {},
            el('a', { href: `#/familia/${d.para}/${d.id}` }, el('strong', {}, d.titulo)),
            el('div', { class: 'tenue small' }, `${fecha(new Date(`${x.fecha}T12:00:00`).getTime())} · ${DESTINATARIOS.find((p) => p.id === d.para).nombre} · ${d.texto}`)),
          x.hecho ? el('span', { class: 'hecho-marca' }, '✓') : null),
        x.respuestas?.map((r, i) => (r ? el('p', { class: 'small' }, el('span', { class: 'tenue' }, `${d.preguntas[i]} `), r) : null)),
        x.peticion ? el('p', { class: 'small' }, el('strong', {}, 'Oración: '), x.peticion) : null);
    }) : el('div', { class: 'vacio' }, el('h2', {}, 'Aún no hay entradas'), el('p', {}, 'Lo que respondas en cada devocional y las peticiones de oración quedarán aquí, por fecha.'))));
}
