/**
 * simulacro.js — El examen completo: reloj, sin explicaciones y todo junto.
 *
 * La diferencia con practicar no es el contenido, es la presión: aquí no se
 * puede mirar la respuesta, el tiempo corre y al final hay una nota. La
 * revisión, con todas las explicaciones, llega después de entregar.
 */

import { el, pintar, tarjeta, barra, reloj, aviso, dato } from '../ui.js';
import { store } from '../store.js';
import { BANCO } from '../banco/index.js';
import { nombreAsignatura, nombreTema } from '../temario.js';
import { MODELOS_SIMULACRO, armarSimulacro, prepararPregunta, puntaje, agruparPor } from '../motor.js';
import { nodoEnunciado, nodoOpciones, nodoExplicacion, nodoPuntos, etiquetasPregunta } from '../componentes.js';

export function simulacroVista(raiz) {
  const banco = [...BANCO, ...store.state.propias];

  let fase = 'inicio';
  let modeloId = 'corto';
  let preguntas = [];
  let respuestas = [];      // índice elegido o null
  let marcadas = new Set();
  let indice = 0;
  let finEn = 0;
  let empezadoEn = 0;
  let cronometro = null;
  let resultado = null;

  function limpiar() { clearInterval(cronometro); cronometro = null; }

  // ------------------------------------------------------------ inicio

  function pintarInicio() {
    const historial = store.state.simulacros;
    const tarjetas = Object.entries(MODELOS_SIMULACRO).map(([id, m]) => {
      const total = Object.values(m.reparto).reduce((a, b) => a + b, 0);
      return el('button', {
        class: 'asignatura', style: 'text-align:left', type: 'button',
        onClick: () => { modeloId = id; empezar(); },
      },
        el('div', { class: 'icono' }, '⏱'),
        el('h3', {}, m.nombre),
        el('p', {}, `${total} preguntas en ${m.minutos} minutos`),
        el('p', { class: 'pequeno suave' },
          Object.entries(m.reparto).map(([a, n]) => `${nombreAsignatura(a)} ${n}`).join(' · ')));
    });

    const previos = historial.length ? tarjeta('Simulacros anteriores',
      el('table', {},
        el('thead', {}, el('tr', {},
          el('th', {}, 'Fecha'), el('th', {}, 'Modelo'), el('th', { class: 'num' }, 'Nota'), el('th', { class: 'num' }, 'Tiempo'))),
        el('tbody', {}, historial.slice(0, 10).map((s) => el('tr', {},
          el('td', {}, new Date(s.at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })),
          el('td', {}, s.modelo),
          el('td', { class: 'num' }, s.porcentaje + '%'),
          el('td', { class: 'num' }, reloj(s.duracionMs))))))) : null;

    return pintar(raiz,
      el('h1', {}, 'Simulacro'),
      el('p', { class: 'sub' }, 'Como el examen real: cronómetro, todas las asignaturas mezcladas y sin ver las respuestas hasta el final. Puedes marcar preguntas para volver a ellas.'),
      el('div', { class: 'rejilla', style: 'margin-bottom:16px' }, tarjetas),
      previos);
  }

  // ------------------------------------------------------------ examen

  function empezar() {
    const modelo = MODELOS_SIMULACRO[modeloId];
    preguntas = armarSimulacro(banco, modelo).map((p) => prepararPregunta(p));
    if (preguntas.length === 0) { aviso('No hay preguntas suficientes', 'mal'); return; }
    respuestas = preguntas.map(() => null);
    marcadas = new Set();
    indice = 0;
    empezadoEn = Date.now();
    finEn = empezadoEn + modelo.minutos * 60000;
    fase = 'examen';
    limpiar();
    cronometro = setInterval(() => {
      if (fase !== 'examen') { limpiar(); return; }
      if (Date.now() >= finEn) { aviso('Se acabó el tiempo', 'mal'); entregar(); return; }
      const nodo = document.getElementById('reloj-simulacro');
      if (nodo) {
        const resta = finEn - Date.now();
        nodo.textContent = reloj(resta);
        nodo.classList.toggle('urgente', resta < 120000);
      }
    }, 500);
    render();
  }

  function elegir(i) {
    respuestas[indice] = i;
    render();
  }

  function ir(n) {
    indice = Math.max(0, Math.min(preguntas.length - 1, n));
    render();
  }

  function entregar() {
    limpiar();
    const duracionMs = Date.now() - empezadoEn;
    const detalle = preguntas.map((p, i) => ({
      qid: p.id, asignatura: p.asignatura, tema: p.tema, dificultad: p.dificultad,
      elegida: respuestas[i], correcta: respuestas[i] === p.correcta,
    }));
    // Cada respuesta cuenta para el repaso espaciado, igual que en la práctica.
    const msMedio = Math.round(duracionMs / preguntas.length);
    preguntas.forEach((p, i) => {
      if (respuestas[i] == null) return;   // en blanco no enseña nada: no mueve la caja
      store.registrar({ pregunta: p, correcta: respuestas[i] === p.correcta, ms: msMedio, modo: 'simulacro' });
    });
    const p = puntaje(detalle);
    resultado = {
      modelo: MODELOS_SIMULACRO[modeloId].nombre,
      minutos: MODELOS_SIMULACRO[modeloId].minutos,
      duracionMs,
      porcentaje: p.porcentaje,
      aciertos: p.aciertos,
      total: p.total,
      sinResponder: detalle.filter((d) => d.elegida == null).length,
      detalle,
    };
    store.guardarSimulacro({
      modelo: resultado.modelo, minutos: resultado.minutos, duracionMs,
      porcentaje: p.porcentaje, aciertos: p.aciertos, total: p.total,
    });
    fase = 'resultado';
    render();
  }

  function pintarExamen() {
    const pregunta = preguntas[indice];
    const respondidas = respuestas.filter((r) => r != null).length;

    const barraEstado = el('div', { class: 'estado' },
      el('span', {}, `Pregunta ${indice + 1} de ${preguntas.length} · ${nombreAsignatura(pregunta.asignatura)}`),
      el('span', { class: 'reloj', id: 'reloj-simulacro' }, reloj(finEn - Date.now())),
      el('span', {}, `${respondidas} respondidas`));

    const navegador = nodoPuntos(preguntas.length, {
      actual: indice,
      estado: (i) => [respuestas[i] != null ? 'respondida' : '', marcadas.has(i) ? 'marcada' : ''].filter(Boolean).join(' '),
      alIr: ir,
    });

    return pintar(raiz,
      barraEstado,
      tarjeta(null,
        nodoEnunciado(pregunta),
        nodoOpciones(pregunta, { elegida: respuestas[indice], revelar: false, alElegir: elegir }),
        el('div', { class: 'fila entre' },
          el('div', { class: 'fila' },
            el('button', { disabled: indice === 0, onClick: () => ir(indice - 1) }, 'Anterior'),
            el('button', { disabled: indice === preguntas.length - 1, onClick: () => ir(indice + 1) }, 'Siguiente')),
          el('div', { class: 'fila' },
            el('button', {
              'aria-pressed': marcadas.has(indice) ? 'true' : 'false',
              onClick: () => { marcadas.has(indice) ? marcadas.delete(indice) : marcadas.add(indice); render(); },
            }, marcadas.has(indice) ? 'Quitar marca' : 'Marcar para revisar'),
            el('button', { onClick: () => elegir(null) }, 'Borrar respuesta')))),
      tarjeta('Mapa del examen', navegador,
        el('div', { class: 'fila entre', style: 'margin-top:14px' },
          el('span', { class: 'pequeno suave' },
            `${preguntas.length - respondidas} sin responder · ${marcadas.size} marcadas`),
          el('button', {
            class: 'primario',
            onClick: () => {
              const faltan = preguntas.length - respondidas;
              const mensaje = faltan ? `Quedan ${faltan} preguntas sin responder. ¿Entregar de todos modos?` : '¿Entregar el examen?';
              if (window.confirm(mensaje)) entregar();
            },
          }, 'Entregar'))));
  }

  // ------------------------------------------------------------ resultado

  function pintarResultado() {
    const porAsignatura = agruparPor(resultado.detalle, 'asignatura');
    const porTema = agruparPor(resultado.detalle, 'tema');
    const flojos = Object.entries(porTema)
      .filter(([, v]) => v.porcentaje < 60 && v.total >= 2)
      .sort((a, b) => a[1].porcentaje - b[1].porcentaje)
      .slice(0, 6);

    const revision = preguntas.map((p, i) => {
      const elegida = resultado.detalle[i].elegida;
      const acerto = resultado.detalle[i].correcta;
      return el('details', { class: 'tema' },
        el('summary', {},
          el('span', { class: 'crece' }, `${i + 1}. ${p.enunciado.slice(0, 70)}${p.enunciado.length > 70 ? '…' : ''}`),
          el('span', { class: 'etiqueta ' + (acerto ? 'ok' : elegida == null ? '' : 'mal') },
            acerto ? 'bien' : elegida == null ? 'en blanco' : 'mal')),
        etiquetasPregunta(p),
        nodoEnunciado(p),
        nodoOpciones(p, { elegida, revelar: true }),
        nodoExplicacion(p, acerto));
    });

    return pintar(raiz,
      el('h1', {}, 'Resultado del simulacro'),
      tarjeta(null,
        el('div', { class: 'rejilla' },
          dato(resultado.porcentaje + '%', `${resultado.aciertos} de ${resultado.total} correctas`),
          dato(reloj(resultado.duracionMs), `de ${resultado.minutos} minutos`),
          dato(String(resultado.sinResponder), 'sin responder'),
          dato(reloj(resultado.duracionMs / resultado.total), 'por pregunta')),
        barra(resultado.porcentaje, resultado.porcentaje >= 70 ? 'ok' : resultado.porcentaje < 50 ? 'mal' : '')),
      tarjeta('Por asignatura',
        el('table', {},
          el('thead', {}, el('tr', {},
            el('th', {}, 'Asignatura'), el('th', { class: 'num' }, 'Aciertos'), el('th', {}, ''))),
          el('tbody', {}, Object.entries(porAsignatura).map(([a, v]) => el('tr', {},
            el('td', {}, nombreAsignatura(a)),
            el('td', { class: 'num' }, `${v.aciertos}/${v.total} (${v.porcentaje}%)`),
            el('td', { style: 'width:40%' }, barra(v.porcentaje, v.porcentaje >= 70 ? 'ok' : v.porcentaje < 50 ? 'mal' : ''))))))),
      flojos.length ? tarjeta('Lo que conviene repasar',
        el('ul', { class: 'claves' }, flojos.map(([tema, v]) => {
          const asig = resultado.detalle.find((d) => d.tema === tema)?.asignatura;
          return el('li', {}, `${nombreTema(asig, tema)} — ${v.aciertos}/${v.total}`,
            ' ', el('a', { href: `#/practicar/${asig}?tema=${tema}` }, 'practicar'));
        }))) : null,
      tarjeta('Revisión pregunta por pregunta',
        el('p', { class: 'sub' }, 'Abre cada una para ver tu respuesta, la correcta y por qué.'),
        revision),
      el('div', { class: 'fila' },
        el('button', { class: 'primario', onClick: () => { fase = 'inicio'; render(); } }, 'Otro simulacro'),
        el('a', { class: 'boton', href: '#/progreso' }, 'Ver mi progreso')));
  }

  // Igual que en la práctica: elegir una opción no debe mover la pantalla.
  let ultimaVista = null;
  function render() {
    if (fase === 'inicio') pintarInicio();
    else if (fase === 'examen') pintarExamen();
    else pintarResultado();
    const vista = fase + ':' + indice;
    if (vista !== ultimaVista) { window.scrollTo(0, 0); ultimaVista = vista; }
  }

  render();
  return limpiar;
}
