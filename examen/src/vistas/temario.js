/**
 * temario.js — Qué entra en el examen, asignatura por asignatura.
 *
 * Es la pantalla que se consulta antes de estudiar: cada tema dice qué hay que
 * saber hacer, cuántas preguntas hay en el banco y cómo vas en él.
 */

import { el, pintar, tarjeta, barra } from '../ui.js';
import { store } from '../store.js';
import { BANCO } from '../banco/index.js';
import { ASIGNATURAS, asignatura as buscarAsignatura, NIVELES } from '../temario.js';
import { agruparPor } from '../motor.js';

export function temarioVista(raiz, params = {}) {
  const elegida = params.asignatura && buscarAsignatura(params.asignatura) ? params.asignatura : null;
  const lista = elegida ? [buscarAsignatura(elegida)] : ASIGNATURAS;
  const banco = [...BANCO, ...store.state.propias];
  const porTema = agruparPor(store.state.respuestas, 'tema');

  const filtros = el('div', { class: 'chips', style: 'margin-bottom:16px' },
    el('a', { class: 'chip', href: '#/temario', 'aria-pressed': elegida ? 'false' : 'true' }, 'Todas'),
    ASIGNATURAS.map((a) => el('a', {
      class: 'chip', href: '#/temario/' + a.id, 'aria-pressed': elegida === a.id ? 'true' : 'false',
    }, a.nombre)));

  const bloques = lista.map((a) => tarjeta(a.nombre,
    el('p', { class: 'sub' }, a.resumen),
    a.temas.map((t) => {
      const preguntas = banco.filter((p) => p.asignatura === a.id && p.tema === t.id);
      const stats = porTema[t.id];
      return el('details', { class: 'tema' },
        el('summary', {},
          el('span', { class: 'crece' }, t.nombre),
          el('span', { class: 'niveles' }, [1, 2, 3, 4].map((d) => {
            const n = preguntas.filter((p) => p.dificultad === d).length;
            return el('span', {
              class: 'nivel n' + d + (n ? '' : ' vacio'),
              title: `${NIVELES[d]}: ${n} pregunta${n === 1 ? '' : 's'}`,
            }, String(n));
          })),
          el('span', { class: 'pequeno suave' }, stats ? `${stats.porcentaje}%` : '')),
        el('ul', { class: 'claves' }, t.claves.map((c) => el('li', {}, c))),
        stats && el('div', { style: 'margin:10px 0' },
          barra(stats.porcentaje, stats.porcentaje >= 70 ? 'ok' : stats.porcentaje < 50 ? 'mal' : '')),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          preguntas.length > 0
            ? el('a', { class: 'boton', href: `#/practicar/${a.id}?tema=${t.id}` }, 'Practicar este tema')
            : el('span', { class: 'pequeno suave' }, 'Todavía sin preguntas en el banco')));
    })));

  pintar(raiz,
    el('h1', {}, 'Temario'),
    el('p', { class: 'sub' }, 'Lo que preguntan las pruebas de ingreso en cada asignatura. Despliega un tema para ver qué hay que saber hacer.'),
    filtros, bloques);
}
