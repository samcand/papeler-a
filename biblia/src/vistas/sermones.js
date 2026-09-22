/**
 * sermones.js (vista) — Taller de sermones: archivo, editor por pasos,
 * banco de ilustraciones y modo púlpito.
 *
 *   #/sermones                     archivo de sermones y cobertura del canon
 *   #/sermones/ilustraciones       banco de ilustraciones
 *   #/sermones/<id>?paso=idea      editor
 *   #/sermones/<id>/pulpito        modo púlpito
 */

import { el, render, toast, descargar, fecha as formatoFecha } from '../ui.js';
import { almacen } from '../almacen.js';
import { formatear, aClave } from '../referencias.js';
import { textoRango } from '../texto.js';
import { notasEn, leerEtiquetas } from '../notas.js';
import {
  PASOS, ESTADOS, RUTAS_A_CRISTO, crearSermon, nuevoPunto, moverPunto, ideaExegetica, progreso,
  duracionEstimada, palabrasPredicadas, avisos, pasajesDe, sermonAMarkdown, romano, cobertura, citaPrincipal,
} from '../sermones.js';

export async function vistaSermones(app, ruta) {
  const [id, sub] = ruta.partes;
  if (id === 'ilustraciones') return pintarIlustraciones(app);
  const sermon = id && almacen.estado.sermones.find((s) => s.id === id);
  if (sermon && sub === 'pulpito') return modoPulpito(app, structuredClone(sermon));
  if (sermon) return pintarEditor(app, structuredClone(sermon), ruta.params.get('paso') || 'texto');
  return pintarArchivo(app, ruta.params.get('q') || '');
}

function subpestanas(actual) {
  return el('nav', { class: 'subpestanas' },
    el('a', { href: '#/sermones', class: actual === 'archivo' ? 'activa' : '' }, 'Sermones', el('span', { class: 'cuenta' }, almacen.estado.sermones.length)),
    el('a', { href: '#/sermones/ilustraciones', class: actual === 'ilustraciones' ? 'activa' : '' }, 'Ilustraciones', el('span', { class: 'cuenta' }, almacen.estado.ilustraciones.length)));
}

// ---------------------------------------------------------------- Archivo

function nuevo(datos = {}) {
  const pasaje = datos.pasaje ?? prompt('Texto del sermón (p. ej. Romanos 5:1-11):', '');
  if (pasaje == null) return;
  const s = crearSermon({ pasaje: pasaje.trim(), ...datos });
  almacen.guardarSermon(s);
  location.hash = `#/sermones/${s.id}`;
}

function pintarArchivo(app, q) {
  const todos = [...almacen.estado.sermones].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.editado - a.editado);
  const filtro = q.trim().toLowerCase();
  const visibles = todos.filter((s) => !filtro || `${s.titulo} ${s.pasaje} ${s.serie} ${s.homiletica}`.toLowerCase().includes(filtro));
  const c = cobertura(todos);
  const maxSec = Math.max(1, ...c.porSeccion.map((x) => x.n));

  render(app, el('div', { class: 'pagina' },
    el('div', { class: 'titulo-pagina' },
      el('h1', {}, 'Taller de sermones'),
      el('button', { class: 'btn primario', onClick: () => nuevo() }, '+ Nuevo sermón')),
    el('p', { class: 'tenue' }, 'Del texto al púlpito en nueve pasos: exégesis, idea exegética, las tres preguntas funcionales, propósito, idea homilética, bosquejo anclado al texto, introducción y conclusión, revisión y modo púlpito.'),
    subpestanas('archivo'),
    todos.length ? el('input', {
      class: 'input', type: 'search', placeholder: 'Buscar por título, texto, serie o idea…', value: q,
      onChange: (e) => { location.hash = `#/sermones?q=${encodeURIComponent(e.target.value)}`; },
    }) : null,
    todos.length
      ? ESTADOS.map((est) => {
        const grupo = visibles.filter((s) => s.estado === est.id);
        if (!grupo.length) return null;
        return el('section', { class: 'grupo-marcas' },
          el('h3', {}, est.nombre, el('span', { class: 'cuenta' }, grupo.length)),
          el('ul', { class: 'lista-sermones' }, grupo.map((s) => {
            const p = progreso(s).porcentaje;
            return el('li', { class: 'tarjeta sermon-tarjeta' },
              el('div', { class: 'grow' },
                el('a', { href: `#/sermones/${s.id}` }, el('strong', {}, s.titulo || 'Sin título')),
                el('div', { class: 'tenue small' }, [citaPrincipal(s), s.serie, s.fecha && formatoFecha(new Date(`${s.fecha}T12:00:00`).getTime()), `~${duracionEstimada(s)} min`].filter(Boolean).join(' · ')),
                s.homiletica ? el('div', { class: 'gran-idea-mini' }, `“${s.homiletica}”`) : null,
                el('div', { class: 'barra-avance' }, el('span', { style: { width: `${p}%` } }))),
              el('div', { class: 'acciones' },
                el('a', { class: 'btn chico', href: `#/sermones/${s.id}/pulpito`, title: 'Modo púlpito' }, '🎤'),
                el('a', { class: 'btn chico', href: `#/sermones/${s.id}` }, 'Abrir')));
          })));
      })
      : el('div', { class: 'vacio' },
        el('h2', {}, 'Aún no hay sermones'),
        el('p', {}, 'Empieza con el pasaje que vas a predicar. También puedes crear un sermón desde el lector con el botón "🎤 Sermón" de la guía del pasaje.'),
        el('button', { class: 'btn primario', onClick: () => nuevo() }, '+ Nuevo sermón')),
    todos.length ? el('section', { class: 'tarjeta' },
      el('h3', {}, 'Cobertura del canon'),
      el('p', { class: 'tenue small' }, `${c.at} sermones del AT y ${c.nt} del NT. Una dieta equilibrada recorre todos los géneros: ley, narrativa, poesía, profecía, evangelios y cartas.`),
      el('div', { class: 'barras-h' }, c.porSeccion.map((sec) => el('div', { class: 'barra-h' },
        el('span', { class: 'barra-h-nombre' }, sec.nombre),
        el('span', { class: 'barra-h-pista' }, el('span', { class: `barra-h-valor ${sec.desde >= 40 ? 'nt' : 'at'}`, style: { width: `${(sec.n / maxSec) * 100}%` } })),
        el('span', { class: 'barra-h-n' }, sec.n)))),
      el('details', {}, el('summary', { class: 'small' }, `${c.sinPredicar.length} libros sin predicar`), el('p', { class: 'small tenue' }, c.sinPredicar.join(', ')))) : null));
}

// ---------------------------------------------------------------- Editor

function pintarEditor(app, s, pasoActual) {
  let espera = null;
  const guardar = (inmediato) => {
    clearTimeout(espera);
    const hacer = () => { almacen.guardarSermon(s); pintarLateral(); };
    if (inmediato) hacer(); else espera = setTimeout(hacer, 400);
  };
  const lateral = el('aside', { class: 'sermon-lateral' });
  const contenido = el('div', { class: 'sermon-paso' });

  const campo = (clave, etiqueta, { filas = 3, ayuda, placeholder, obj = s } = {}) => el('label', { class: 'campo' },
    el('span', { class: 'campo-etiqueta' }, etiqueta),
    filas === 1
      ? el('input', { class: 'input', value: obj[clave] || '', placeholder, onInput: (e) => { obj[clave] = e.target.value; guardar(); } })
      : el('textarea', { class: 'input', rows: filas, placeholder, onInput: (e) => { obj[clave] = e.target.value; guardar(); } }, obj[clave] || ''),
    ayuda ? el('span', { class: 'tenue small' }, ayuda) : null);

  async function pintarLateral() {
    const { hechos, porcentaje } = progreso(s);
    const lista = avisos(s);
    const pasaje = pasajesDe(s)[0];
    const versos = pasaje ? await textoRango(almacen.ajustes.principal, pasaje.desde, pasaje.hasta) : [];
    render(lateral,
      el('div', { class: 'tarjeta' },
        el('div', { class: 'panel-sub' }, 'Avance'),
        el('div', { class: 'barra-avance' }, el('span', { style: { width: `${porcentaje}%` } })),
        el('ol', { class: 'pasos-mini' }, PASOS.map((p) => el('li', { class: `${hechos[p.id] ? 'hecho' : ''} ${p.id === pasoActual ? 'actual' : ''}` },
          el('a', { href: `#/sermones/${s.id}?paso=${p.id}` }, p.nombre)))),
        el('p', { class: 'small' }, `≈ ${duracionEstimada(s)} min · ${palabrasPredicadas(s)} palabras · meta ${s.meta} min`)),
      s.homiletica ? el('div', { class: 'devo-idea' }, el('span', { class: 'panel-sub' }, 'Gran idea'), el('p', {}, s.homiletica)) : null,
      lista.length ? el('div', { class: 'tarjeta avisos-sermon' }, el('div', { class: 'panel-sub' }, 'Para revisar'), el('ul', {}, lista.map((a) => el('li', { class: 'small' }, a)))) : null,
      pasaje ? el('div', { class: 'tarjeta texto-sermon' },
        el('a', { class: 'ref', href: `#/leer/${aClave(pasaje.ref)}`, dataset: { ref: aClave(pasaje.ref) } }, formatear(pasaje.ref)),
        el('p', { class: 'texto-biblico' }, versos.map((x) => el('span', {}, el('sup', {}, x.v), ' ', x.texto, ' ')))) : null);
  }

  const pasos = {
    texto: () => [
      campo('pasaje', 'Texto', { filas: 1, placeholder: 'Romanos 5:1-11', ayuda: 'Una unidad completa de pensamiento. Puedes añadir más citas separadas por ";".' }),
      campo('titulo', 'Título', { filas: 1, placeholder: 'Paz con Dios' }),
      el('div', { class: 'rejilla-2' },
        campo('serie', 'Serie', { filas: 1, placeholder: 'Romanos: el evangelio de Dios' }),
        el('label', { class: 'campo' }, el('span', { class: 'campo-etiqueta' }, 'Fecha de predicación'),
          el('input', { class: 'input', type: 'date', value: s.fecha || '', onInput: (e) => { s.fecha = e.target.value; guardar(); } }))),
      el('p', {}, pasajesDe(s)[0] ? el('a', { class: 'btn', href: `#/leer/${aClave(pasajesDe(s)[0].ref)}` }, '📖 Abrir en el lector (referencias, marcas y biblioteca)') : null),
    ],
    exegesis: () => [
      el('div', { class: 'acciones' },
        el('button', { class: 'btn chico', onClick: traerNotas }, '⤓ Traer mis notas de este pasaje')),
      campo('contexto', 'Contexto histórico y literario', { filas: 4, placeholder: 'Autor, destinatarios, ocasión; qué viene antes y después; género literario…' }),
      campo('estructura', 'Estructura y flujo del argumento', { filas: 5, placeholder: 'Divisiones del pasaje, conectores (porque, pues, por tanto), quiasmos, paralelismos…' }),
      campo('observaciones', 'Observaciones', { filas: 6, placeholder: '¿Quién? ¿Qué? ¿Cuándo? ¿Dónde? ¿Por qué? ¿Cómo? Repeticiones, contrastes, comparaciones…' }),
      campo('palabras', 'Palabras clave y estudio de términos', { filas: 4, placeholder: 'δικαιόω (justificar): declarar justo… Usa la pestaña Palabras para la concordancia.' }),
    ],
    idea: () => [
      campo('sujeto', 'Sujeto: ¿de qué está hablando el autor?', { filas: 2, placeholder: '¿Cuáles son los resultados de haber sido justificados por la fe?', ayuda: 'Formúlalo como pregunta. Ni muy amplio ("la fe") ni muy estrecho.' }),
      campo('complemento', 'Complemento: ¿qué está diciendo de eso?', { filas: 2, placeholder: 'Paz con Dios, acceso a la gracia y una esperanza que no avergüenza.' }),
      ideaExegetica(s) ? el('div', { class: 'devo-idea' }, el('span', { class: 'panel-sub' }, 'Idea exegética'), el('p', {}, ideaExegetica(s))) : null,
    ],
    preguntas: () => [
      campo('significa', '¿Qué significa? (explicación)', { filas: 4, placeholder: '¿Qué necesitará explicar para que la idea se entienda? Términos, trasfondo, lógica del pasaje.' }),
      campo('verdad', '¿Es verdad? (validación)', { filas: 4, placeholder: '¿Qué objeciones o dudas tendrá la congregación? ¿Cómo lo muestra el texto y la experiencia?' }),
      campo('diferencia', '¿Qué diferencia hace? (aplicación)', { filas: 4, placeholder: '¿Cómo se ve en la vida concreta de esta congregación, esta semana?' }),
    ],
    proposito: () => [
      campo('proposito', 'Propósito', { filas: 4, placeholder: 'Que el oyente descanse en la paz que ya tiene con Dios y persevere con esperanza en la tribulación.', ayuda: 'Una frase: qué debe saber, sentir o hacer la congregación. Pon un verbo de acción.' }),
      campo('notasOrador', 'Notas sobre la audiencia', { filas: 3, placeholder: 'Situación de la iglesia, personas en duelo, nuevos creyentes, fechas especiales…' }),
    ],
    homiletica: () => [
      ideaExegetica(s) ? el('div', { class: 'devo-idea' }, el('span', { class: 'panel-sub' }, 'Idea exegética'), el('p', {}, ideaExegetica(s))) : null,
      campo('homiletica', 'Idea homilética (la gran idea)', { filas: 2, placeholder: 'Justificado por fe, tienes paz hoy y esperanza para siempre.', ayuda: 'Breve, memorable, para hoy. Debería caber en un tuit y poder repetirse el lunes.' }),
    ],
    bosquejo: pintarBosquejo,
    extremos: () => [
      campo('introduccion', 'Introducción', { filas: 8, placeholder: 'Crea la necesidad, conecta con la vida y orienta hacia la idea. Evita empezar con "hoy vamos a ver…".' }),
      campo('conclusion', 'Conclusión', { filas: 8, placeholder: 'Resume la gran idea, llama a responder y termina con fuerza. Sin material nuevo.' }),
    ],
    revision: () => [
      el('div', { class: 'rejilla-2' },
        el('label', { class: 'campo' }, el('span', { class: 'campo-etiqueta' }, 'Estado'),
          el('select', { class: 'input', onChange: (e) => { s.estado = e.target.value; guardar(true); pintarPaso(); } },
            ESTADOS.map((x) => el('option', { value: x.id, selected: x.id === s.estado }, x.nombre)))),
        el('label', { class: 'campo' }, el('span', { class: 'campo-etiqueta' }, `Meta de duración: ${s.meta} min · velocidad ${s.velocidad} palabras/min`),
          el('div', { class: 'fila-controles' },
            el('input', { class: 'input', type: 'number', min: 5, max: 120, value: s.meta, style: { width: '90px' }, onInput: (e) => { s.meta = Number(e.target.value) || 30; guardar(); } }),
            el('input', { class: 'input', type: 'number', min: 80, max: 220, value: s.velocidad, style: { width: '90px' }, onInput: (e) => { s.velocidad = Number(e.target.value) || 130; guardar(); } })))),
      el('label', { class: 'campo' }, el('span', { class: 'campo-etiqueta' }, 'Ruta a Cristo'),
        el('select', { class: 'input', onChange: (e) => { s.rutaCristo = e.target.value; guardar(); } },
          el('option', { value: '' }, '— Elige cómo lleva el texto a Cristo —'),
          RUTAS_A_CRISTO.map((r) => el('option', { value: r, selected: r === s.rutaCristo }, r)))),
      campo('cristo', '¿Cómo predica este texto a Cristo sin forzarlo?', { filas: 3 }),
      el('h3', {}, 'Evaluación después de predicar'),
      el('div', { class: 'evaluacion' }, [['claridad', 'Claridad de la idea'], ['fidelidad', 'Fidelidad al texto'], ['aplicacion', 'Aplicación'], ['duracion', 'Manejo del tiempo']].map(([k, t]) =>
        el('div', { class: 'fila-evaluacion' }, el('span', {}, t),
          el('span', { class: 'estrellas' }, [1, 2, 3, 4, 5].map((n) => el('button', {
            class: `estrella ${s.evaluacion[k] >= n ? 'llena' : ''}`, title: `${n}/5`,
            onClick: () => { s.evaluacion[k] = n; guardar(true); pintarPaso(); },
          }, '★')))))),
      campo('notas', 'Notas de la evaluación (qué mejorar, respuestas de la congregación)', { filas: 3, obj: s.evaluacion }),
    ],
  };

  function pintarBosquejo() {
    const banco = almacen.estado.ilustraciones;
    const actualizar = () => { guardar(true); pintarPaso(); };
    return [
      s.homiletica ? el('div', { class: 'devo-idea' }, el('span', { class: 'panel-sub' }, 'Gran idea'), el('p', {}, s.homiletica)) : null,
      s.bosquejo.map((p, i) => el('article', { class: 'tarjeta punto' },
        el('div', { class: 'tarjeta-cab' },
          el('strong', { class: 'num-punto' }, romano(i + 1)),
          el('input', { class: 'input grow', value: p.titulo, placeholder: 'Título del punto', onInput: (e) => { p.titulo = e.target.value; guardar(); } }),
          el('input', { class: 'input', style: { width: '140px' }, value: p.pasaje, placeholder: 'vv. (Ro 5:1-2)', onInput: (e) => { p.pasaje = e.target.value; guardar(); } }),
          el('button', { class: 'btn icono chico', title: 'Subir', disabled: i === 0, onClick: () => { s.bosquejo = moverPunto(s.bosquejo, p.id, -1); actualizar(); } }, '↑'),
          el('button', { class: 'btn icono chico', title: 'Bajar', disabled: i === s.bosquejo.length - 1, onClick: () => { s.bosquejo = moverPunto(s.bosquejo, p.id, 1); actualizar(); } }, '↓'),
          el('button', { class: 'btn icono chico peligro', title: 'Quitar', onClick: () => { if (confirm('¿Quitar este punto?')) { s.bosquejo = s.bosquejo.filter((x) => x.id !== p.id); actualizar(); } } }, '✕')),
        campo('explicacion', 'Explicación', { filas: 4, obj: p }),
        el('div', { class: 'campo' },
          campo('ilustracion', 'Ilustración', { filas: 2, obj: p }),
          banco.length ? el('select', {
            class: 'input chico',
            onChange: (e) => {
              const il = banco.find((x) => x.id === e.target.value);
              if (!il) return;
              p.ilustracion = [p.ilustracion, `${il.titulo}: ${il.texto}`].filter(Boolean).join('\n');
              almacen.guardarIlustracion({ ...il, usada: [...(il.usada || []), { sermon: s.id, fecha: s.fecha || new Date().toISOString().slice(0, 10) }] });
              actualizar();
            },
          }, el('option', { value: '' }, '＋ Insertar del banco de ilustraciones…'),
          banco.map((il) => el('option', { value: il.id }, `${il.titulo}${il.usada?.length ? ` (usada ${il.usada.length})` : ''}`))) : null),
        campo('aplicacion', 'Aplicación', { filas: 2, obj: p }))),
      el('button', { class: 'btn primario', onClick: () => { s.bosquejo.push(nuevoPunto()); actualizar(); } }, '+ Punto'),
    ];
  }

  async function traerNotas() {
    const partes = [];
    for (const p of pasajesDe(s)) {
      for (const n of notasEn(almacen.estado.notas, p.desde, p.hasta)) {
        partes.push(`— ${n.titulo || formatear(p.ref)}: ${n.cuerpo.trim()}`);
      }
    }
    if (!partes.length) { toast('No tienes notas sobre este pasaje todavía'); return; }
    s.observaciones = [s.observaciones, ...partes].filter(Boolean).join('\n\n');
    guardar(true);
    pintarPaso();
    toast(`${partes.length} ${partes.length === 1 ? 'nota agregada' : 'notas agregadas'} a las observaciones`);
  }

  function pintarPaso() {
    const paso = PASOS.find((p) => p.id === pasoActual) || PASOS[0];
    const i = PASOS.indexOf(paso);
    render(contenido,
      el('h2', {}, `${i + 1}. ${paso.nombre}`),
      el('p', { class: 'tenue small ayuda-paso' }, paso.ayuda),
      pasos[paso.id](),
      el('div', { class: 'lector-pie' },
        PASOS[i - 1] ? el('a', { class: 'btn', href: `#/sermones/${s.id}?paso=${PASOS[i - 1].id}` }, `‹ ${PASOS[i - 1].nombre}`) : el('span'),
        PASOS[i + 1] ? el('a', { class: 'btn primario', href: `#/sermones/${s.id}?paso=${PASOS[i + 1].id}` }, `${PASOS[i + 1].nombre} ›`) : el('a', { class: 'btn primario', href: `#/sermones/${s.id}/pulpito` }, '🎤 Modo púlpito')));
  }

  const exportar = async () => {
    const pasaje = pasajesDe(s)[0];
    const versos = pasaje ? await textoRango(almacen.ajustes.principal, pasaje.desde, pasaje.hasta) : [];
    const md = sermonAMarkdown(s, { textoDe: () => versos.map((x) => `${x.v} ${x.texto}`).join(' ') });
    descargar(`${(s.titulo || 'sermon').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.md`, md, 'text/markdown');
  };

  render(app, el('div', { class: 'pagina ancha' },
    el('div', { class: 'titulo-pagina' },
      el('div', {},
        el('a', { class: 'small', href: '#/sermones' }, '← Sermones'),
        el('h1', {}, s.titulo || 'Sermón sin título'),
        el('div', { class: 'tenue' }, [citaPrincipal(s), s.serie].filter(Boolean).join(' · '))),
      el('div', { class: 'acciones' },
        el('a', { class: 'btn primario', href: `#/sermones/${s.id}/pulpito` }, '🎤 Púlpito'),
        el('button', { class: 'btn', onClick: exportar, title: 'Manuscrito y notas en Markdown (se abre en Word o Google Docs)' }, '⬇ Exportar'),
        el('button', { class: 'btn peligro', onClick: () => { if (confirm('¿Borrar este sermón?')) { almacen.borrarSermon(s.id); location.hash = '#/sermones'; } } }, 'Borrar'))),
    el('nav', { class: 'pasos-sermon' }, PASOS.map((p, i) => el('a', {
      href: `#/sermones/${s.id}?paso=${p.id}`, class: `${p.id === pasoActual ? 'activa' : ''} ${progreso(s).hechos[p.id] ? 'hecho' : ''}`,
    }, el('span', { class: 'num-paso' }, i + 1), p.nombre))),
    el('div', { class: 'sermon-cuerpo' }, contenido, lateral)));
  pintarPaso();
  pintarLateral();
  return () => { clearTimeout(espera); almacen.guardarSermon(s); };
}

// ---------------------------------------------------------------- Ilustraciones

function pintarIlustraciones(app, q = '') {
  const refrescar = () => pintarIlustraciones(app, q);
  const lista = almacen.estado.ilustraciones.filter((il) => !q || `${il.titulo} ${il.texto} ${(il.etiquetas || []).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const titulo = el('input', { class: 'input', placeholder: 'Título (p. ej. "El puente de Brooklyn")' });
  const texto = el('textarea', { class: 'input', rows: 4, placeholder: 'La historia, cita o analogía, con su fuente.' });
  const etiquetas = el('input', { class: 'input', placeholder: '#gracia #perseverancia' });
  const pasajes = el('input', { class: 'input', placeholder: 'Pasajes donde encaja (Ro 5:8; Lc 15)' });
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Banco de ilustraciones'),
    el('p', { class: 'tenue' }, 'Guarda historias, citas y analogías con su tema y sus pasajes. Al usarlas en un sermón quedan registradas, para no repetirlas con la misma congregación.'),
    subpestanas('ilustraciones'),
    el('form', { class: 'tarjeta form-buscar', onSubmit: (e) => {
      e.preventDefault();
      if (!titulo.value.trim() || !texto.value.trim()) { toast('Pon título y texto', 'error'); return; }
      almacen.guardarIlustracion({ titulo: titulo.value.trim(), texto: texto.value.trim(), etiquetas: leerEtiquetas(etiquetas.value), pasajes: pasajes.value.trim() });
      toast('Ilustración guardada');
      refrescar();
    } }, titulo, texto, el('div', { class: 'rejilla-2' }, etiquetas, pasajes), el('button', { class: 'btn primario', type: 'submit' }, 'Guardar ilustración')),
    el('input', { class: 'input', type: 'search', placeholder: 'Buscar por tema, texto o etiqueta…', value: q, onChange: (e) => pintarIlustraciones(app, e.target.value) }),
    lista.length ? lista.map((il) => el('article', { class: 'tarjeta tarjeta-nota' },
      el('div', { class: 'tarjeta-cab' },
        el('strong', {}, il.titulo),
        el('button', { class: 'btn icono chico peligro', title: 'Borrar', onClick: () => { if (confirm('¿Borrar esta ilustración?')) { almacen.borrarIlustracion(il.id); refrescar(); } } }, '✕')),
      el('p', {}, il.texto),
      el('div', { class: 'tenue small' }, [il.pasajes, (il.etiquetas || []).map((e) => `#${e}`).join(' '),
        il.usada?.length ? `usada ${il.usada.length} ${il.usada.length === 1 ? 'vez' : 'veces'} (última: ${il.usada.at(-1).fecha})` : 'sin usar'].filter(Boolean).join(' · '))))
      : el('p', { class: 'tenue' }, q ? 'Nada coincide.' : 'Aún no hay ilustraciones.')));
}

// ---------------------------------------------------------------- Modo púlpito

async function modoPulpito(app, s) {
  const pasaje = pasajesDe(s)[0];
  const versos = pasaje ? await textoRango(almacen.ajustes.principal, pasaje.desde, pasaje.hasta) : [];
  const secciones = [
    { titulo: pasaje ? formatear(pasaje.ref) : 'Texto', cuerpo: [el('p', { class: 'texto-biblico' }, versos.map((x) => el('span', {}, el('sup', {}, x.v), ' ', x.texto, ' ')))] },
    s.introduccion && { titulo: 'Introducción', cuerpo: parrafos(s.introduccion) },
    ...s.bosquejo.map((p, i) => ({
      titulo: `${romano(i + 1)}. ${p.titulo || 'Punto'}`, pasaje: p.pasaje,
      cuerpo: [...parrafos(p.explicacion),
        p.ilustracion ? el('div', { class: 'pulpito-bloque ilustracion' }, el('span', {}, 'Ilustración'), parrafos(p.ilustracion)) : null,
        p.aplicacion ? el('div', { class: 'pulpito-bloque aplicacion' }, el('span', {}, 'Aplicación'), parrafos(p.aplicacion)) : null],
    })),
    s.conclusion && { titulo: 'Conclusión', cuerpo: parrafos(s.conclusion) },
  ].filter(Boolean);

  let actual = 0;
  let inicio = null;
  let acumulado = 0;
  let letra = Number(localStorage.getItem('pulpito-letra')) || 30;
  const reloj = el('div', { class: 'pulpito-reloj' });
  const escenario = el('div', { class: 'pulpito-escenario' });
  const indice = el('nav', { class: 'pulpito-indice' });

  const transcurrido = () => acumulado + (inicio ? Date.now() - inicio : 0);
  const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  const tic = () => {
    const ms = transcurrido();
    const min = ms / 60000;
    reloj.className = `pulpito-reloj ${min > s.meta ? 'pasado' : min > s.meta * 0.85 ? 'cerca' : ''} ${inicio ? 'corriendo' : ''}`;
    render(reloj, el('strong', {}, mmss(ms)), el('span', {}, ` / ${s.meta}:00`),
      el('span', { class: 'hora' }, new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })));
  };
  const alternarReloj = () => { if (inicio) { acumulado += Date.now() - inicio; inicio = null; } else inicio = Date.now(); tic(); };
  const intervalo = setInterval(tic, 1000);

  const pintar = () => {
    const sec = secciones[actual];
    escenario.style.fontSize = `${letra}px`;
    render(escenario,
      s.homiletica ? el('div', { class: 'pulpito-idea' }, s.homiletica) : null,
      el('h1', {}, sec.titulo, sec.pasaje ? el('span', { class: 'pulpito-pasaje' }, ` ${sec.pasaje}`) : null),
      sec.cuerpo);
    render(indice, secciones.map((x, i) => el('button', { class: i === actual ? 'activa' : '', onClick: () => { actual = i; pintar(); } }, x.titulo)));
    escenario.scrollTop = 0;
  };
  const mover = (paso) => { actual = Math.max(0, Math.min(secciones.length - 1, actual + paso)); pintar(); };
  const teclas = (e) => {
    if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); mover(1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); mover(-1); }
    if (e.key === ' ') { e.preventDefault(); alternarReloj(); }
    if (e.key === '+' || e.key === '=') { letra = Math.min(60, letra + 2); localStorage.setItem('pulpito-letra', letra); pintar(); }
    if (e.key === '-') { letra = Math.max(16, letra - 2); localStorage.setItem('pulpito-letra', letra); pintar(); }
    if (e.key === 'Escape') location.hash = `#/sermones/${s.id}`;
  };
  document.addEventListener('keydown', teclas);
  document.body.classList.add('modo-pulpito');
  let despertador = null;
  try { despertador = await navigator.wakeLock?.request('screen'); } catch { /* sin bloqueo de pantalla */ }

  render(app, el('div', { class: 'pulpito' },
    el('header', { class: 'pulpito-barra' },
      el('a', { class: 'btn chico', href: `#/sermones/${s.id}` }, '✕ Salir'),
      el('strong', { class: 'grow' }, s.titulo || 'Sermón'),
      el('button', { class: 'btn chico', onClick: () => { letra = Math.max(16, letra - 2); pintar(); } }, 'A−'),
      el('button', { class: 'btn chico', onClick: () => { letra = Math.min(60, letra + 2); pintar(); } }, 'A+'),
      el('button', { class: 'btn chico', onClick: alternarReloj, title: 'Iniciar o pausar (barra espaciadora)' }, '⏯'),
      el('button', { class: 'btn chico', onClick: () => { acumulado = 0; inicio = null; tic(); }, title: 'Reiniciar cronómetro' }, '↺'),
      reloj),
    indice,
    el('div', { class: 'pulpito-zonas' },
      el('button', { class: 'zona-atras', 'aria-label': 'Sección anterior', onClick: () => mover(-1) }),
      escenario,
      el('button', { class: 'zona-adelante', 'aria-label': 'Sección siguiente', onClick: () => mover(1) }))));
  pintar();
  tic();
  return () => {
    clearInterval(intervalo);
    document.removeEventListener('keydown', teclas);
    document.body.classList.remove('modo-pulpito');
    despertador?.release?.();
  };
}

function parrafos(t) {
  return String(t || '').split(/\n\s*\n/).filter((p) => p.trim()).map((p) => el('p', {}, p.trim()));
}

export { nuevo as nuevoSermon };
