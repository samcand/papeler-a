/**
 * inicio.js — El panel: en qué estás, qué toca hoy y por dónde seguir.
 */

import { el, pintar, tarjeta, barra, dato } from '../ui.js';
import { store } from '../store.js';
import { BANCO } from '../banco/index.js';
import { ASIGNATURAS, nombreTema, nombreAsignatura } from '../temario.js';
import { agruparPor, pendientesDeRepaso, racha, temasDebiles, notaGlobal } from '../motor.js';

function diasHasta(fecha) {
  if (!fecha) return null;
  const objetivo = new Date(fecha + 'T00:00:00');
  if (Number.isNaN(objetivo.getTime())) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((objetivo - hoy) / 86400000);
}

export function inicioVista(raiz) {
  const { respuestas, ajustes } = store.state;
  const banco = [...BANCO, ...store.state.propias];
  const pendientes = pendientesDeRepaso(banco, store.state.repaso);
  const hechasHoy = store.hechasHoy();
  const dias = diasHasta(ajustes.fechaExamen);
  const vistas = store.vistas();

  const cabecera = tarjeta(null,
    el('h1', {}, respuestas.length ? 'Sigamos' : 'Prepara tu prueba de ingreso'),
    el('p', { class: 'sub' }, respuestas.length
      ? 'Cinco asignaturas, un temario completo y un banco que se acuerda de lo que fallaste.'
      : 'Elige una asignatura y empieza. No hace falta registrarse: todo se guarda en este dispositivo.'),
    el('div', { class: 'rejilla' },
      dato(hechasHoy + ' / ' + ajustes.meta, 'preguntas hoy'),
      dato(racha(respuestas) + (racha(respuestas) === 1 ? ' día' : ' días'), 'racha de estudio'),
      dato(notaGlobal(respuestas) + '%', 'promedio general'),
      dato(vistas.size + ' / ' + banco.length, 'preguntas vistas'),
      dias != null && dato(dias >= 0 ? dias + '' : 'ya pasó', dias >= 0 ? 'días para el examen' : 'fecha del examen')),
    el('div', { class: 'fila', style: 'margin-top:14px' },
      el('a', { class: 'boton primario', href: '#/practicar' }, 'Practicar'),
      el('a', { class: 'boton', href: '#/simulacro' }, 'Hacer un simulacro'),
      pendientes.length > 0 && el('a', { class: 'boton', href: '#/practicar?repaso=1' },
        `Repasar lo pendiente (${pendientes.length})`)));

  const porAsignatura = agruparPor(respuestas, 'asignatura');
  const tarjetas = ASIGNATURAS.map((a) => {
    const total = banco.filter((p) => p.asignatura === a.id).length;
    const stats = porAsignatura[a.id];
    const cubiertas = banco.filter((p) => p.asignatura === a.id && vistas.has(p.id)).length;
    return el('a', { class: 'asignatura', href: '#/practicar/' + a.id },
      el('div', { class: 'icono' }, a.icono),
      el('h3', {}, a.nombre),
      el('p', {}, a.resumen),
      barra(stats ? stats.porcentaje : 0, stats && stats.porcentaje >= 70 ? 'ok' : stats && stats.porcentaje < 50 ? 'mal' : ''),
      el('p', { class: 'pequeno suave', style: 'margin-top:8px' },
        stats ? `${stats.porcentaje}% de aciertos · ` : 'Sin practicar aún · ',
        `${cubiertas}/${total} preguntas · ${a.temas.length} temas`));
  });

  const debiles = temasDebiles(respuestas);
  const flojos = debiles.length
    ? tarjeta('Por dónde seguir',
      el('p', { class: 'sub' }, 'Los temas donde más fallas, con al menos tres intentos.'),
      el('table', {},
        el('thead', {}, el('tr', {},
          el('th', {}, 'Tema'), el('th', {}, 'Asignatura'), el('th', { class: 'num' }, 'Aciertos'), el('th', {}, ''))),
        el('tbody', {}, debiles.map((t) => el('tr', {},
          el('td', {}, nombreTema(t.asignatura, t.tema)),
          el('td', { class: 'suave' }, nombreAsignatura(t.asignatura)),
          el('td', { class: 'num' }, `${t.aciertos}/${t.total} (${t.porcentaje}%)`),
          el('td', {}, el('a', { class: 'boton', href: `#/practicar/${t.asignatura}?tema=${t.tema}` }, 'Practicar')))))))
    : null;

  const ayuda = respuestas.length ? null : tarjeta('Cómo funciona',
    el('ol', { class: 'claves', style: 'padding-left:20px' },
      el('li', {}, el('b', {}, 'Temario'), ': mira qué te van a preguntar en cada asignatura antes de estudiar.'),
      el('li', {}, el('b', {}, 'Practicar'), ': preguntas de a una, con la explicación al instante. Puedes filtrar por tema y dificultad.'),
      el('li', {}, el('b', {}, 'Simulacro'), ': el examen completo con reloj y sin ayudas, para medirte.'),
      el('li', {}, el('b', {}, 'Repaso'), ': lo que fallas vuelve al día siguiente; lo que dominas, mucho después.')));

  pintar(raiz, cabecera, el('div', { class: 'rejilla', style: 'margin-bottom:16px' }, tarjetas), flojos, ayuda);
}
