/**
 * progreso.js — Cómo vas, qué falta y el respaldo de tus datos.
 *
 * También es la pantalla de ajustes: la fecha del examen, la meta diaria, el
 * tema claro u oscuro y el banco de preguntas propias.
 */

import { el, pintar, tarjeta, barra, dato, campo, aviso, reloj, fecha, descargar } from '../ui.js';
import { store } from '../store.js';
import { BANCO } from '../banco/index.js';
import { ASIGNATURAS, nombreAsignatura, nombreTema } from '../temario.js';
import { agruparPor, temasDebiles, racha, notaGlobal, pendientesDeRepaso } from '../motor.js';

const DIA = 86400000;

/** Barras de los últimos 14 días: sirve para ver la constancia, no la nota. */
function actividad(respuestas) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = [];
  for (let i = 13; i >= 0; i--) {
    const inicio = hoy.getTime() - i * DIA;
    const delDia = respuestas.filter((r) => r.at >= inicio && r.at < inicio + DIA);
    dias.push({ inicio, total: delDia.length, aciertos: delDia.filter((r) => r.correcta).length });
  }
  const tope = Math.max(1, ...dias.map((d) => d.total));
  return el('div', { class: 'fila', style: 'align-items:flex-end; gap:6px; height:110px' },
    dias.map((d) => el('div', {
      style: 'flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:4px; height:100%',
      title: `${new Date(d.inicio).toLocaleDateString('es', { day: '2-digit', month: 'short' })}: ${d.total} preguntas, ${d.aciertos} correctas`,
    },
      el('div', {
        style: `width:100%; border-radius:6px 6px 0 0; background:${d.total ? 'linear-gradient(180deg,var(--acento),var(--acento-2))' : 'var(--borde)'};`
          + `height:${d.total ? Math.max(6, (d.total / tope) * 80) : 3}px`,
      }),
      el('span', { class: 'pequeno suave' }, new Date(d.inicio).getDate()))));
}

export function progresoVista(raiz) {
  const render = () => {
    const { respuestas, ajustes, simulacros } = store.state;
    const banco = [...BANCO, ...store.state.propias];
    const porAsignatura = agruparPor(respuestas, 'asignatura');
    const vistas = store.vistas();
    const pendientes = pendientesDeRepaso(banco, store.state.repaso).length;

    const resumen = tarjeta(null,
      el('div', { class: 'rejilla' },
        dato(notaGlobal(respuestas) + '%', 'promedio general'),
        dato(String(respuestas.length), 'preguntas respondidas'),
        dato(racha(respuestas) + '', 'días seguidos'),
        dato(vistas.size + '/' + banco.length, 'del banco visto'),
        dato(String(pendientes), 'esperando repaso')),
      el('h3', {}, 'Últimos 14 días'),
      actividad(respuestas));

    const tabla = tarjeta('Por asignatura',
      el('table', {},
        el('thead', {}, el('tr', {},
          el('th', {}, 'Asignatura'), el('th', { class: 'num' }, 'Respondidas'),
          el('th', { class: 'num' }, 'Aciertos'), el('th', { class: 'num' }, 'Tiempo medio'), el('th', {}, ''))),
        el('tbody', {}, ASIGNATURAS.map((a) => {
          const v = porAsignatura[a.id];
          return el('tr', {},
            el('td', {}, a.nombre),
            el('td', { class: 'num' }, v ? v.total : '—'),
            el('td', { class: 'num' }, v ? v.porcentaje + '%' : '—'),
            el('td', { class: 'num' }, v ? reloj(v.msMedio) : '—'),
            el('td', { style: 'width:30%' }, barra(v ? v.porcentaje : 0, v && v.porcentaje >= 70 ? 'ok' : v && v.porcentaje < 50 ? 'mal' : '')));
        }))));

    const debiles = temasDebiles(respuestas, { minimo: 3, cuantos: 8 });
    const flojos = debiles.length ? tarjeta('Temas más flojos',
      el('ul', { class: 'claves' }, debiles.map((t) => el('li', {},
        `${nombreTema(t.asignatura, t.tema)} (${nombreAsignatura(t.asignatura)}) — ${t.aciertos}/${t.total}`,
        ' ', el('a', { href: `#/practicar/${t.asignatura}?tema=${t.tema}` }, 'practicar'))))) : null;

    const historial = simulacros.length ? tarjeta('Simulacros',
      el('table', {},
        el('thead', {}, el('tr', {},
          el('th', {}, 'Fecha'), el('th', {}, 'Modelo'), el('th', { class: 'num' }, 'Nota'), el('th', { class: 'num' }, 'Duración'))),
        el('tbody', {}, simulacros.map((s) => el('tr', {},
          el('td', {}, fecha(s.at)),
          el('td', {}, s.modelo),
          el('td', { class: 'num' }, `${s.aciertos}/${s.total} (${s.porcentaje}%)`),
          el('td', { class: 'num' }, reloj(s.duracionMs))))))) : null;

    // ---------------------------------------------------------- ajustes

    const ajustesTarjeta = tarjeta('Ajustes',
      campo('Fecha del examen',
        el('input', {
          type: 'date', value: ajustes.fechaExamen || '',
          onChange: (e) => { store.ajustar('fechaExamen', e.target.value); render(); },
        }),
        'Aparece la cuenta regresiva en el inicio.'),
      campo('Meta diaria de preguntas',
        el('input', {
          type: 'number', min: '5', max: '200', step: '5', value: String(ajustes.meta),
          onChange: (e) => { store.ajustar('meta', Number(e.target.value) || 20); render(); },
        })),
      el('div', { class: 'fila' },
        el('span', { class: 'pequeno suave' }, 'Tema'),
        el('button', {
          onClick: () => {
            const nuevo = ajustes.tema === 'oscuro' ? 'claro' : 'oscuro';
            store.ajustar('tema', nuevo);
            document.documentElement.dataset.tema = nuevo;
            render();
          },
        }, ajustes.tema === 'oscuro' ? 'Cambiar a claro' : 'Cambiar a oscuro')));

    // ---------------------------------------------------------- datos

    const entradaArchivo = el('input', {
      type: 'file', accept: 'application/json', style: 'display:none',
      onChange: async (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        try {
          store.importar(await archivo.text());
          aviso('Progreso restaurado', 'ok');
          render();
        } catch (error) {
          aviso('No se pudo leer el archivo: ' + error.message, 'mal');
        }
        e.target.value = '';
      },
    });

    const entradaPreguntas = el('input', {
      type: 'file', accept: 'application/json', style: 'display:none',
      onChange: async (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        try {
          const datos = JSON.parse(await archivo.text());
          const lista = Array.isArray(datos) ? datos : datos.preguntas;
          const { agregadas, errores } = store.importarPreguntas(lista);
          aviso(`${agregadas} preguntas añadidas${errores.length ? `, ${errores.length} con errores` : ''}`, errores.length ? 'mal' : 'ok');
          if (errores.length) console.warn('Preguntas descartadas:\n' + errores.join('\n'));
          render();
        } catch (error) {
          aviso('El archivo no es JSON válido: ' + error.message, 'mal');
        }
        e.target.value = '';
      },
    });

    const ejemplo = JSON.stringify([{
      asignatura: 'matematicas', tema: 'porcentajes', dificultad: 2,
      enunciado: 'Escribe aquí la pregunta',
      opciones: ['correcta', 'otra', 'otra', 'otra'],
      correcta: 0,
      explicacion: 'Por qué la primera es la correcta.',
    }], null, 2);

    const datosTarjeta = tarjeta('Tus datos',
      el('p', { class: 'sub' }, 'Todo está en este navegador. Si cambias de dispositivo o borras los datos del sitio, se pierde: exporta de vez en cuando.'),
      el('div', { class: 'fila' },
        el('button', {
          class: 'primario',
          onClick: () => descargar(`ingreso-progreso-${new Date().toISOString().slice(0, 10)}.json`, store.exportar()),
        }, 'Exportar progreso'),
        el('button', { onClick: () => entradaArchivo.click() }, 'Importar progreso'),
        el('button', {
          class: 'peligro',
          onClick: () => {
            if (window.confirm('Esto borra respuestas, repasos y simulacros de este dispositivo. ¿Seguro?')) {
              store.borrarTodo(); aviso('Todo borrado'); render();
            }
          },
        }, 'Borrar todo')),
      entradaArchivo,
      el('h3', {}, 'Tus propias preguntas'),
      el('p', { class: 'pequeno suave' },
        `Puedes añadir las preguntas de tu profesor o de exámenes anteriores. Ahora hay ${store.state.propias.length} en tu banco.`),
      el('div', { class: 'fila' },
        el('button', { onClick: () => entradaPreguntas.click() }, 'Importar preguntas (JSON)'),
        el('button', { onClick: () => descargar('ejemplo-preguntas.json', ejemplo) }, 'Descargar ejemplo'),
        store.state.propias.length > 0 && el('button', {
          class: 'peligro',
          onClick: () => { if (window.confirm('¿Borrar tus preguntas importadas?')) { store.borrarPropias(); render(); } },
        }, 'Borrar las mías')),
      entradaPreguntas,
      el('details', { class: 'tema', style: 'margin-top:12px' },
        el('summary', {}, 'Formato del archivo'),
        el('pre', { class: 'bloque' }, ejemplo),
        el('p', { class: 'pequeno suave' },
          'Los valores de asignatura y tema deben existir en el temario. La dificultad es 1, 2 o 3 y "correcta" es la posición de la respuesta buena empezando en 0.')));

    return pintar(raiz,
      el('h1', {}, 'Progreso'),
      resumen, tabla, flojos, historial, ajustesTarjeta, datosTarjeta);
  };

  render();
  return () => {};
}
