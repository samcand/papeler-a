/**
 * copiloto.js (vista) — Preguntas sobre el plan, respondidas con cálculo.
 *
 * No hay modelo de lenguaje detrás ni conexión a ninguna parte: cada respuesta
 * sale de la ruta crítica, la holgura, la capacidad y el historial que ya están
 * en este dispositivo. Por eso puede decir "esto no lo sé calcular" en vez de
 * inventarse una respuesta bonita.
 */

import { button, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoLargo } from '../fechas.js';
import { PREGUNTAS, informeCompleto, preguntar } from '../copiloto.js';
import { tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaCopiloto(root) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  const salida = el('div', {});
  let texto = '';

  const responder = (t) => {
    texto = t;
    const r = preguntar(t, store.estado, { hoyISO });
    if (!r.entendida) {
      render(salida, el('section', { class: 'card' },
        el('p', {}, r.frase),
        el('div', { class: 'chip-list' },
          ...r.opciones.map((o) => el('button', {
            class: 'chip', type: 'button', onClick: () => responder(o.pregunta),
          }, o.pregunta)))));
      return;
    }
    render(salida, tarjetaRespuesta(r));
  };

  const campo = input('', (v) => { texto = v; }, {
    placeholder: '¿Qué se va a retrasar? ¿Quién está sobrecargado? ¿Qué cambió esta semana?',
  });
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); responder(campo.value); } });

  render(host,
    tituloVista('Copiloto', `${textoLargo(hoyISO)} · todo se calcula aquí, nada sale del dispositivo`),

    el('section', { class: 'card' },
      el('div', { class: 'rapida' }, campo, button('Preguntar', () => responder(campo.value), { variant: 'primary' })),
      el('div', { class: 'chip-list', style: 'margin-top:10px' },
        ...PREGUNTAS.map((p) => el('button', {
          class: 'chip', type: 'button',
          onClick: () => { campo.value = p.pregunta; responder(p.pregunta); },
        }, p.pregunta))),
      el('p', { class: 'muted small', style: 'margin-top:10px' },
        'Entiende por palabras clave, no de verdad: si no reconoce la pregunta lo dice y te enseña las que sí sabe responder.')),

    salida,

    el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Todo de una vez'),
      el('p', { class: 'muted small' }, 'Las seis respuestas seguidas, para pegarlas en el acta de una reunión.'),
      el('div', { class: 'fila' },
        button('Ver todas', () => {
          render(salida, ...informeCompleto(store.estado, { hoyISO }).map(tarjetaRespuesta));
        }),
        button('Copiar como texto', async () => {
          const bloques = informeCompleto(store.estado, { hoyISO }).map((r) => {
            const filas = r.filas.map((f) => `- ${f.texto}${f.detalle ? ` (${f.detalle})` : ''}`).join('\n');
            return `${r.pregunta}\n${r.frase}\n${filas}`;
          });
          const txt = `Estado al ${hoyISO}\n\n${bloques.join('\n\n')}`;
          try {
            await navigator.clipboard.writeText(txt);
            toast('Copiado');
          } catch {
            toast('El navegador no dejó copiar; se ve abajo para copiarlo a mano');
            render(salida, el('section', { class: 'card' }, el('pre', { style: 'white-space:pre-wrap' }, txt)));
          }
        }))));

  root.append(host);
  if (texto) responder(texto);
}

function tarjetaRespuesta(r) {
  return el('section', { class: 'card' },
    el('h2', { class: 'card-title' }, r.pregunta),
    el('p', {}, r.frase),
    r.filas.length
      ? el('ul', { class: 'lista-simple' },
        ...r.filas.map((f) => el('li', {},
          el('span', {}, f.texto),
          f.detalle ? el('div', { class: 'muted small' }, f.detalle) : null)))
      : vacio('Nada que contar aquí.', '👌'));
}
