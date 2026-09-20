/**
 * practica.js — Preguntas de a una, con la explicación al instante.
 *
 * Tres fases: configurar la sesión, responder y ver el resumen. El estado vive
 * en esta función; al salir de la vista se limpia el teclado y se acabó.
 */

import { el, pintar, tarjeta, aviso, reloj, barra, celebrar } from '../ui.js';
import { store } from '../store.js';
import { BANCO } from '../banco/index.js';
import { ASIGNATURAS, asignatura as buscarAsignatura, nombreTema, NIVELES, GRADOS, NOMBRE_GRADO } from '../temario.js';
import { filtrar, seleccionarPreguntas, prepararPregunta, puntaje, agruparPor, pendientesDeRepaso } from '../motor.js';
import { nodoEnunciado, nodoOpciones, nodoExplicacion, nodoPista, etiquetasPregunta } from '../componentes.js';

const CANTIDADES = [5, 10, 20, 30];

export function practicaVista(raiz, params = {}) {
  const banco = [...BANCO, ...store.state.propias];

  const config = {
    asignatura: buscarAsignatura(params.asignatura) ? params.asignatura : 'todas',
    temas: params.tema ? [params.tema] : [],
    dificultades: [1, 2, 3, 4],
    grado: Number(store.state.ajustes.grado) || null,
    modoGrado: store.state.ajustes.modoGrado || 'hasta',
    cantidad: 10,
    soloRepaso: params.repaso === '1',
  };

  let fase = 'config';
  let preguntas = [];
  let indice = 0;
  let elegida = null;
  let revelado = false;
  let inicioPregunta = 0;
  let resultados = [];

  function onTecla(e) {
    if (fase !== 'sesion') return;
    if (['1', '2', '3', '4'].includes(e.key)) {
      const i = Number(e.key) - 1;
      if (!revelado && i < preguntas[indice].opciones.length) responder(i);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (revelado) { e.preventDefault(); siguiente(); }
    }
  }
  document.addEventListener('keydown', onTecla);

  // ------------------------------------------------------------ configurar

  function temasDisponibles() {
    if (config.asignatura === 'todas') return [];
    return buscarAsignatura(config.asignatura)?.temas || [];
  }

  function cuantasHay() {
    const filtrado = filtrar(banco, {
      asignatura: config.asignatura === 'todas' ? null : config.asignatura,
      temas: config.temas,
      dificultades: config.dificultades,
      grado: config.grado,
      modoGrado: config.modoGrado,
    });
    return config.soloRepaso ? pendientesDeRepaso(filtrado, store.state.repaso).length : filtrado.length;
  }

  function chip(texto, activo, alPulsar) {
    return el('button', { class: 'chip', type: 'button', 'aria-pressed': activo ? 'true' : 'false', onClick: alPulsar }, texto);
  }

  function pintarConfig() {
    const disponibles = cuantasHay();
    const pendientes = pendientesDeRepaso(banco, store.state.repaso).length;

    const asignaturas = el('div', { class: 'chips' },
      chip('Todas', config.asignatura === 'todas', () => { config.asignatura = 'todas'; config.temas = []; render(); }),
      ASIGNATURAS.map((a) => chip(a.nombre, config.asignatura === a.id, () => {
        config.asignatura = a.id; config.temas = []; render();
      })));

    const temas = temasDisponibles();
    const chipsTemas = temas.length ? el('div', {},
      el('h3', {}, 'Temas'),
      el('div', { class: 'chips' },
        chip('Todos', config.temas.length === 0, () => { config.temas = []; render(); }),
        temas.map((t) => chip(t.nombre, config.temas.includes(t.id), () => {
          config.temas = config.temas.includes(t.id)
            ? config.temas.filter((x) => x !== t.id)
            : [...config.temas, t.id];
          render();
        })))) : null;

    const dificultad = el('div', {},
      el('h3', {}, 'Dificultad'),
      el('div', { class: 'chips' },
        [1, 2, 3, 4].map((d) => chip(NIVELES[d], config.dificultades.includes(d), () => {
          const nuevas = config.dificultades.includes(d)
            ? config.dificultades.filter((x) => x !== d)
            : [...config.dificultades, d];
          config.dificultades = nuevas.length ? nuevas : [1, 2, 3, 4];
          render();
        }))));

    const elegirGrado = (g) => {
      config.grado = g;
      store.ajustar('grado', g || '');
      render();
    };
    const grado = el('div', {},
      el('h3', {}, 'Grado'),
      el('div', { class: 'chips' },
        chip('Cualquiera', !config.grado, () => elegirGrado(null)),
        GRADOS.map((g) => chip(NOMBRE_GRADO[g], config.grado === g, () => elegirGrado(g)))),
      config.grado ? el('div', { class: 'chips', style: 'margin-top:6px' },
        chip(`Hasta ${NOMBRE_GRADO[config.grado]}`, config.modoGrado === 'hasta', () => {
          config.modoGrado = 'hasta'; store.ajustar('modoGrado', 'hasta'); render();
        }),
        chip(`Solo ${NOMBRE_GRADO[config.grado]}`, config.modoGrado === 'solo', () => {
          config.modoGrado = 'solo'; store.ajustar('modoGrado', 'solo'); render();
        })) : null,
      config.grado ? el('p', { class: 'pequeno suave' },
        config.modoGrado === 'hasta'
          ? 'Todo lo que ya se debería dominar a esa altura del colegio, arrastrando los grados anteriores.'
          : 'Solo los temas que se ven ese año.') : null);

    const cantidad = el('div', {},
      el('h3', {}, 'Cuántas preguntas'),
      el('div', { class: 'chips' },
        CANTIDADES.map((n) => chip(String(n), config.cantidad === n, () => { config.cantidad = n; render(); }))));

    const repaso = el('div', {},
      el('h3', {}, 'Modo'),
      el('div', { class: 'chips' },
        chip('Mezcla inteligente', !config.soloRepaso, () => { config.soloRepaso = false; render(); }),
        chip(`Solo repaso pendiente (${pendientes})`, config.soloRepaso, () => { config.soloRepaso = true; render(); })));

    return pintar(raiz,
      el('h1', {}, 'Practicar'),
      el('p', { class: 'sub' }, 'Responde y lee la explicación en el momento. Lo que falles vuelve a aparecer en los próximos días.'),
      tarjeta(null,
        el('h3', { style: 'margin-top:0' }, 'Asignatura'), asignaturas,
        chipsTemas, grado, dificultad, cantidad, repaso,
        el('div', { class: 'fila entre', style: 'margin-top:18px' },
          el('span', { class: 'pequeno suave' },
            disponibles === 0
              ? 'No hay preguntas con esos filtros.'
              : `${disponibles} preguntas disponibles · se usarán ${Math.min(disponibles, config.cantidad)}`),
          el('button', { class: 'primario', disabled: disponibles === 0, onClick: empezar }, 'Empezar'))),
      el('p', { class: 'pequeno suave' }, 'Atajos: las teclas 1 a 4 responden y Enter pasa a la siguiente.'));
  }

  // ------------------------------------------------------------ sesión

  function empezar() {
    const filtrado = filtrar(banco, {
      asignatura: config.asignatura === 'todas' ? null : config.asignatura,
      temas: config.temas,
      dificultades: config.dificultades,
      grado: config.grado,
      modoGrado: config.modoGrado,
    });
    const elegidas = seleccionarPreguntas({
      banco: filtrado,
      repaso: store.state.repaso,
      cantidad: config.cantidad,
      soloRepaso: config.soloRepaso,
    });
    if (!elegidas.length) { aviso('No hay preguntas con esos filtros', 'mal'); return; }
    preguntas = elegidas.map((p) => prepararPregunta(p));
    indice = 0; elegida = null; revelado = false; resultados = [];
    fase = 'sesion';
    inicioPregunta = Date.now();
    render();
  }

  function responder(i) {
    if (revelado) return;
    elegida = i;
    revelado = true;
    const pregunta = preguntas[indice];
    const acerto = i === pregunta.correcta;
    const ms = Date.now() - inicioPregunta;
    store.registrar({ pregunta, correcta: acerto, ms, modo: 'practica' });
    celebrar(store.revisarLogros());
    resultados.push({
      qid: pregunta.id, asignatura: pregunta.asignatura, tema: pregunta.tema,
      correcta: acerto, ms, elegida: i,
    });
    render();
  }

  function siguiente() {
    if (indice >= preguntas.length - 1) { fase = 'resumen'; render(); return; }
    indice++; elegida = null; revelado = false; inicioPregunta = Date.now();
    render();
  }

  function pintarSesion() {
    const pregunta = preguntas[indice];
    const acerto = elegida === pregunta.correcta;

    const estado = el('div', { class: 'estado' },
      el('span', {}, `Pregunta ${indice + 1} de ${preguntas.length}`),
      el('span', {}, `${resultados.filter((r) => r.correcta).length} aciertos`));

    return pintar(raiz,
      estado,
      barra(((indice + (revelado ? 1 : 0)) / preguntas.length) * 100),
      tarjeta(null,
        etiquetasPregunta(pregunta),
        nodoEnunciado(pregunta),
        nodoOpciones(pregunta, { elegida, revelar: revelado, alElegir: revelado ? null : responder }),
        !revelado && nodoPista(pregunta),
        revelado && nodoExplicacion(pregunta, acerto),
        revelado && el('div', { class: 'fila entre' },
          el('span', { class: 'pequeno suave' }, 'Enter para continuar'),
          el('button', { class: 'primario', onClick: siguiente },
            indice >= preguntas.length - 1 ? 'Ver resultados' : 'Siguiente'))),
      el('button', { onClick: () => { fase = 'config'; render(); } }, 'Terminar la sesión'));
  }

  // ------------------------------------------------------------ resumen

  function pintarResumen() {
    const p = puntaje(resultados);
    const porTema = agruparPor(resultados, 'tema');
    const tiempo = resultados.reduce((s, r) => s + r.ms, 0);
    const fallos = resultados.filter((r) => !r.correcta);

    const tabla = el('table', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'Tema'), el('th', { class: 'num' }, 'Aciertos'), el('th', { class: 'num' }, 'Tiempo medio'))),
      el('tbody', {}, Object.entries(porTema).map(([tema, v]) => {
        const asig = resultados.find((r) => r.tema === tema)?.asignatura;
        return el('tr', {},
          el('td', {}, nombreTema(asig, tema)),
          el('td', { class: 'num' }, `${v.aciertos}/${v.total}`),
          el('td', { class: 'num' }, reloj(v.msMedio)));
      })));

    return pintar(raiz,
      el('h1', {}, 'Resumen de la sesión'),
      tarjeta(null,
        el('div', { class: 'rejilla' },
          el('div', { class: 'dato' }, el('b', {}, `${p.porcentaje}%`), el('span', {}, `${p.aciertos} de ${p.total} correctas`)),
          el('div', { class: 'dato' }, el('b', {}, reloj(tiempo)), el('span', {}, 'tiempo total')),
          el('div', { class: 'dato' }, el('b', {}, reloj(tiempo / Math.max(1, p.total))), el('span', {}, 'por pregunta'))),
        barra(p.porcentaje, p.porcentaje >= 70 ? 'ok' : p.porcentaje < 50 ? 'mal' : ''),
        el('p', { class: 'pequeno suave', style: 'margin-top:12px' },
          fallos.length
            ? `Las ${fallos.length} que fallaste volverán a aparecer mañana.`
            : 'Sin fallos: estas preguntas tardarán más en volver.')),
      tarjeta('Por tema', tabla),
      el('div', { class: 'fila' },
        el('button', { class: 'primario', onClick: empezar }, 'Otra ronda'),
        fallos.length > 0 && el('button', {
          onClick: () => {
            preguntas = fallos
              .map((r) => banco.find((q) => q.id === r.qid))
              .filter(Boolean)
              .map((q) => prepararPregunta(q));
            indice = 0; elegida = null; revelado = false; resultados = [];
            fase = 'sesion'; inicioPregunta = Date.now(); render();
          },
        }, `Repetir los ${fallos.length} fallos`),
        el('button', { onClick: () => { fase = 'config'; render(); } }, 'Cambiar filtros'),
        el('a', { class: 'boton', href: '#/' }, 'Volver al inicio')));
  }

  // Subir al principio al cambiar de pregunta, pero no al responder: si no,
  // la explicación de una lectura larga se lee desde arriba cada vez.
  let ultimaVista = null;
  function render() {
    if (fase === 'config') pintarConfig();
    else if (fase === 'sesion') pintarSesion();
    else pintarResumen();
    const vista = fase + ':' + indice;
    if (vista !== ultimaVista) { window.scrollTo(0, 0); ultimaVista = vista; }
  }

  render();
  return () => document.removeEventListener('keydown', onTecla);
}
