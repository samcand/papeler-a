/**
 * escritura.js — Comunicación escrita: escribir contra reloj y revisarse.
 *
 * El módulo de comunicación escrita del Saber Pro es de pregunta abierta, así
 * que no cabe en el banco. Lo que sí se puede practicar es el ejercicio
 * completo: una consigna, un tiempo límite y una relectura con rúbrica.
 *
 * El texto se guarda en el dispositivo mientras se escribe, para que recargar
 * la página por accidente no borre media hora de trabajo.
 */

import { el, pintar, tarjeta, barra, reloj, aviso, dato, descargar, fecha } from '../ui.js';
import { store } from '../store.js';
import {
  CONSIGNAS, RUBRICA, REVISION, DURACIONES, PALABRAS_SUGERIDAS,
  contarPalabras, contarParrafos, revisarLongitud, puntuar, siguienteConsigna,
} from '../escritura.js';

export function escrituraVista(raiz) {
  const borrador = store.state.borradorEscritura;
  let fase = 'inicio';
  let consigna = borrador?.consignaId
    ? CONSIGNAS.find((c) => c.id === borrador.consignaId) || CONSIGNAS[0]
    : siguienteConsigna(store.state.escritos.map((e) => e.consignaId));
  let minutos = 30;
  let texto = '';
  let finEn = 0;
  let empezadoEn = 0;
  let cronometro = null;
  let autoguardado = null;
  let selecciones = {};
  let revisados = new Set();

  function limpiar() {
    clearInterval(cronometro); cronometro = null;
    clearInterval(autoguardado); autoguardado = null;
  }

  // ------------------------------------------------------------ inicio

  function pintarInicio() {
    const previos = store.state.escritos;
    const hayBorrador = borrador && borrador.texto && borrador.texto.trim().length > 0;

    return pintar(raiz,
      el('h1', {}, 'Comunicación escrita'),
      el('p', { class: 'sub' },
        'El módulo del Saber Pro que no es de opción múltiple: una consigna, un tiempo límite y un texto argumentativo. '
        + `Se sugieren entre ${PALABRAS_SUGERIDAS.minimo} y ${PALABRAS_SUGERIDAS.maximo} palabras.`),

      hayBorrador && tarjeta('Tienes un texto sin terminar',
        el('p', { class: 'sub' }, `${contarPalabras(borrador.texto)} palabras guardadas el ${fecha(borrador.at)}.`),
        el('div', { class: 'fila' },
          el('button', {
            class: 'primario',
            onClick: () => {
              texto = borrador.texto;
              minutos = borrador.minutos || 30;
              empezar(true);
            },
          }, 'Seguir escribiendo'),
          el('button', {
            onClick: () => { store.borrarBorradorEscritura(); aviso('Borrador descartado'); render(); },
          }, 'Descartar'))),

      tarjeta('Consigna',
        el('p', { class: 'etiqueta' }, consigna.tema),
        el('p', { class: 'pregunta', style: 'margin-top:10px' }, consigna.texto),
        el('div', { class: 'fila' },
          el('button', {
            onClick: () => { consigna = siguienteConsigna([consigna.id]); render(); },
          }, 'Otra consigna')),
        el('h3', {}, 'Tiempo'),
        el('div', { class: 'chips' },
          DURACIONES.map((m) => el('button', {
            class: 'chip', type: 'button', 'aria-pressed': minutos === m ? 'true' : 'false',
            onClick: () => { minutos = m; render(); },
          }, `${m} minutos`))),
        el('div', { class: 'fila', style: 'margin-top:16px' },
          el('button', { class: 'primario', onClick: () => empezar(false) }, 'Empezar a escribir'))),

      previos.length ? tarjeta('Textos anteriores',
        el('table', {},
          el('thead', {}, el('tr', {},
            el('th', {}, 'Fecha'), el('th', {}, 'Tema'),
            el('th', { class: 'num' }, 'Palabras'), el('th', { class: 'num' }, 'Rúbrica'), el('th', {}, ''))),
          el('tbody', {}, previos.slice(0, 10).map((e) => el('tr', {},
            el('td', {}, fecha(e.at)),
            el('td', {}, e.tema),
            el('td', { class: 'num' }, String(e.palabras)),
            el('td', { class: 'num' }, e.porcentaje != null ? e.porcentaje + '%' : '—'),
            el('td', {}, el('button', {
              onClick: () => descargar(`texto-${new Date(e.at).toISOString().slice(0, 10)}.txt`, e.consigna + '\n\n' + e.texto, 'text/plain'),
            }, 'Descargar'))))))) : null,

      tarjeta('Cómo se evalúa',
        el('p', { class: 'sub' }, 'Al terminar podrás revisarte con estos cuatro criterios. Conviene leerlos antes de escribir, no después.'),
        el('ul', { class: 'claves' }, RUBRICA.map((c) => el('li', {}, el('b', {}, c.nombre + ': '), c.pregunta)))));
  }

  // ------------------------------------------------------------ escribir

  function empezar(continuando) {
    fase = 'escribiendo';
    empezadoEn = Date.now();
    finEn = empezadoEn + minutos * 60000;
    if (!continuando) texto = '';
    limpiar();
    cronometro = setInterval(() => {
      if (fase !== 'escribiendo') { limpiar(); return; }
      if (Date.now() >= finEn) { aviso('Se acabó el tiempo', 'mal'); terminar(); return; }
      const nodo = document.getElementById('reloj-escritura');
      if (nodo) {
        const resta = finEn - Date.now();
        nodo.textContent = reloj(resta);
        nodo.classList.toggle('urgente', resta < 300000);
      }
    }, 500);
    autoguardado = setInterval(() => {
      if (fase === 'escribiendo') store.guardarBorradorEscritura({ consignaId: consigna.id, texto, minutos });
    }, 10000);
    render();
  }

  function actualizarContadores() {
    const palabras = contarPalabras(texto);
    const nodo = document.getElementById('contador-escritura');
    if (nodo) nodo.textContent = `${palabras} palabras · ${contarParrafos(texto)} párrafos`;
    const aviso1 = document.getElementById('aviso-longitud');
    if (aviso1) aviso1.textContent = revisarLongitud(palabras).mensaje;
  }

  function pintarEscribiendo() {
    const area = el('textarea', {
      class: 'editor',
      placeholder: 'Escribe aquí tu texto argumentativo…',
      spellcheck: 'true',
      onInput: (e) => { texto = e.target.value; actualizarContadores(); },
    });
    area.value = texto;

    const salida = pintar(raiz,
      el('div', { class: 'estado' },
        el('span', {}, consigna.tema),
        el('span', { class: 'reloj', id: 'reloj-escritura' }, reloj(finEn - Date.now())),
        el('span', { id: 'contador-escritura' }, `${contarPalabras(texto)} palabras · ${contarParrafos(texto)} párrafos`)),
      tarjeta(null,
        el('p', { class: 'sub' }, consigna.texto),
        area,
        el('div', { class: 'fila entre', style: 'margin-top:12px' },
          el('span', { class: 'pequeno suave', id: 'aviso-longitud' }, revisarLongitud(contarPalabras(texto)).mensaje),
          el('button', {
            class: 'primario',
            onClick: () => {
              if (contarPalabras(texto) < 40) { aviso('El texto es demasiado corto para revisarlo', 'mal'); return; }
              terminar();
            },
          }, 'Terminar y revisar'))));
    area.focus();
    return salida;
  }

  function terminar() {
    limpiar();
    fase = 'revision';
    selecciones = {};
    revisados = new Set();
    render();
  }

  // ------------------------------------------------------------ revisión

  function pintarRevision() {
    const palabras = contarPalabras(texto);
    const longitud = revisarLongitud(palabras);
    const puntaje = puntuar(selecciones);
    const duracionMs = Date.now() - empezadoEn;

    const criterios = RUBRICA.map((c) => el('div', { class: 'criterio' },
      el('h3', { style: 'margin-top:0' }, c.nombre),
      el('p', { class: 'pequeno suave' }, c.pregunta),
      el('div', { class: 'opciones' }, c.niveles.map((nivel, i) => el('button', {
        class: 'opcion' + (selecciones[c.id] === i ? ' correcta' : ''),
        type: 'button',
        'aria-pressed': selecciones[c.id] === i ? 'true' : 'false',
        onClick: () => { selecciones[c.id] = i; render(); },
      },
        el('span', { class: 'letra' }, String(i)),
        el('span', { class: 'crece' }, nivel))))));

    const lista = el('div', {}, REVISION.map((item, i) => el('label', { class: 'fila', style: 'gap:10px; align-items:flex-start; margin:8px 0' },
      el('input', {
        type: 'checkbox',
        checked: revisados.has(i) ? true : null,
        onChange: (e) => { e.target.checked ? revisados.add(i) : revisados.delete(i); render(); },
      }),
      el('span', { class: 'pequeno' }, item))));

    return pintar(raiz,
      el('h1', {}, 'Revisa tu texto'),
      tarjeta(null,
        el('div', { class: 'rejilla' },
          dato(String(palabras), 'palabras'),
          dato(String(contarParrafos(texto)), 'párrafos'),
          dato(reloj(duracionMs), 'tiempo empleado'),
          dato(puntaje.completa ? puntaje.porcentaje + '%' : '—', 'rúbrica')),
        el('p', { class: 'pequeno ' + (longitud.estado === 'bien' ? 'suave' : '') }, longitud.mensaje)),

      tarjeta('Tu texto',
        el('p', { class: 'pequeno suave' }, consigna.texto),
        el('div', { class: 'lectura' }, texto.split(/\n+/).filter(Boolean).map((p) => el('p', {}, p)))),

      tarjeta('Rúbrica',
        el('p', { class: 'sub' }, 'Lee cada criterio y escoge con honestidad el nivel que describe tu texto. La utilidad está en el diagnóstico, no en el puntaje.'),
        criterios,
        puntaje.completa && el('div', { class: 'explicacion ' + (puntaje.porcentaje >= 75 ? 'ok' : puntaje.porcentaje < 50 ? 'mal' : '') },
          el('b', {}, `${puntaje.total} de ${puntaje.maximo} puntos (${puntaje.porcentaje} %)`),
          puntaje.flojos.length
            ? 'Lo más urgente de trabajar: ' + puntaje.flojos.join(' y ') + '.'
            : 'Ningún criterio quedó en el nivel más bajo: el siguiente paso es subir de "aceptable" a "sólido".'),
        barra(puntaje.completa ? puntaje.porcentaje : 0, puntaje.porcentaje >= 75 ? 'ok' : puntaje.porcentaje < 50 ? 'mal' : '')),

      tarjeta('Lista de relectura',
        el('p', { class: 'sub' }, 'Los errores que más se repiten. Marca los que tu texto ya cumple.'),
        lista,
        el('p', { class: 'pequeno suave' }, `${revisados.size} de ${REVISION.length} cumplidos.`)),

      el('div', { class: 'fila' },
        el('button', {
          class: 'primario',
          onClick: () => {
            store.guardarEscrito({
              consignaId: consigna.id, tema: consigna.tema, consigna: consigna.texto,
              texto, palabras, minutos, duracionMs,
              porcentaje: puntaje.completa ? puntaje.porcentaje : null,
              rubrica: { ...selecciones },
            });
            store.borrarBorradorEscritura();
            aviso('Texto guardado', 'ok');
            fase = 'inicio';
            consigna = siguienteConsigna(store.state.escritos.map((e) => e.consignaId));
            texto = '';
            render();
          },
        }, 'Guardar y volver'),
        el('button', {
          onClick: () => descargar(`texto-${new Date().toISOString().slice(0, 10)}.txt`, consigna.texto + '\n\n' + texto, 'text/plain'),
        }, 'Descargar el texto'),
        el('button', { onClick: () => { fase = 'escribiendo'; finEn = Date.now() + 5 * 60000; empezar(true); } }, 'Seguir editando')));
  }

  function render() {
    if (fase === 'inicio') pintarInicio();
    else if (fase === 'escribiendo') pintarEscribiendo();
    else pintarRevision();
    if (fase !== 'escribiendo') window.scrollTo(0, 0);
  }

  render();
  return limpiar;
}
