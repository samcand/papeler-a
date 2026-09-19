/** afinador.js (vista) — Afinador por micrófono para guitarra, ukelele y bajo. */

import { el, button, select, chip, section, toast, render } from '../ui.js';
import { store } from '../store.js';
import { Afinador, AFINACIONES, cuerdaMasCercana, tocarNota, estadoAfinacion } from '../afinador.js';
import { INSTRUMENTOS } from '../fretboard.js';
import { pcName } from '../music.js';

export function afinadorView(root, { navigate }) {
  let instrumentoId = store.state.settings.afinadorInstrumento || 'guitarra';
  let referencia = store.state.settings.afinadorReferencia || 440;
  let afinador = null;
  let ultimaCuerda = null;

  const notaGrande = el('div', { class: 'tuner-note' }, '—');
  const detalle = el('div', { class: 'tuner-detail muted' }, 'Pulsa "Activar micrófono" y toca una cuerda.');
  const aguja = el('div', { class: 'needle' });
  const escala = el('div', { class: 'tuner-scale' },
    el('div', { class: 'tuner-track' }, aguja),
    el('div', { class: 'tuner-marks' },
      ['-50', '-25', '0', '+25', '+50'].map((m) => el('span', {}, m))));
  const cuerdasHost = el('div', { class: 'strings-row' });

  const pintarCuerdas = (indiceActivo = null, cents = null) => {
    const inst = INSTRUMENTOS[instrumentoId];
    render(cuerdasHost, 
      ...inst.cuerdas.map((midi, i) => {
        const b = button(
          `${inst.etiquetas[i].split(' ').pop()}\n${pcName(midi)}${Math.floor(midi / 12) - 1}`,
          () => tocarNota(midi, { referencia }),
          { variant: i === indiceActivo ? 'ok' : 'chip', title: 'Tocar esta nota de referencia' });
        b.classList.add('string-btn');
        if (i === indiceActivo && cents != null && Math.abs(cents) <= 5) b.classList.add('afinada');
        return b;
      }));
  };

  const onLectura = (lectura) => {
    if (!lectura) {
      notaGrande.textContent = '—';
      notaGrande.className = 'tuner-note';
      detalle.textContent = 'Escuchando… toca una cuerda sola, sin acordes.';
      aguja.style.left = '50%';
      aguja.className = 'needle';
      return;
    }
    const inst = INSTRUMENTOS[instrumentoId];
    const idx = cuerdaMasCercana(lectura.midi, inst.cuerdas);
    const estado = estadoAfinacion(lectura.cents);
    notaGrande.textContent = `${lectura.nota}${lectura.octava}`;
    notaGrande.className = `tuner-note ${estado.clase}`;
    detalle.textContent = `${estado.texto} · ${lectura.freq.toFixed(1)} Hz (objetivo ${lectura.objetivo.toFixed(1)} Hz)`;
    const pos = Math.max(-50, Math.min(50, lectura.cents));
    aguja.style.left = `${50 + pos}%`;
    aguja.className = `needle ${estado.clase}`;
    if (idx !== ultimaCuerda || true) { pintarCuerdas(idx, lectura.cents); ultimaCuerda = idx; }
  };

  const micBtn = button('🎤 Activar micrófono', async (e) => {
    if (afinador) {
      afinador.detener();
      afinador = null;
      e.target.textContent = '🎤 Activar micrófono';
      e.target.classList.remove('ok');
      onLectura(null);
      return;
    }
    try {
      afinador = new Afinador({ referencia, onLectura });
      await afinador.iniciar();
      e.target.textContent = '⏹ Detener';
      e.target.classList.add('ok');
      toast('Micrófono activo. Toca una cuerda a la vez.');
    } catch (err) {
      afinador = null;
      toast('No se pudo usar el micrófono: ' + (err.name === 'NotAllowedError' ? 'permiso denegado' : err.message), 'warn');
    }
  }, { variant: 'primary' });

  const cambiarInstrumento = (v) => {
    instrumentoId = v;
    store.setSetting('afinadorInstrumento', v);
    pintarCuerdas();
  };

  pintarCuerdas();

  render(root, 
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Afinador'),
        el('p', { class: 'muted' }, 'Guitarra, ukelele, bajo, cuatro y afinaciones alternativas')),
      el('div', { class: 'row wrap' },
        el('label', { class: 'field inline' },
          el('span', { class: 'field-label' }, 'Instrumento'),
          select(AFINACIONES.map((a) => ({ value: a.id, label: a.nombre })), instrumentoId, cambiarInstrumento)),
        el('label', { class: 'field inline' },
          el('span', { class: 'field-label' }, 'Referencia'),
          select([435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445].map((v) => ({ value: v, label: `${v} Hz` })),
            referencia, (v) => {
              referencia = Number(v);
              store.setSetting('afinadorReferencia', referencia);
              if (afinador) afinador.referencia = referencia;
            })))),

    section('',
      el('div', { class: 'tuner' },
        notaGrande, escala, detalle,
        el('div', { class: 'row wrap center' }, micBtn))),

    section('Cuerdas al aire (pulsa para escuchar la nota)',
      cuerdasHost,
      el('p', { class: 'muted small' }, 'Si no quieres usar el micrófono, afina de oído: toca la nota de referencia y ajusta hasta que las dos suenen como una sola, sin ondulación.')),

    section('Cómo afinar bien',
      el('ul', { class: 'tips' },
        el('li', {}, 'Afina siempre subiendo hacia la nota: si te pasaste, afloja de más y vuelve a subir. Así la cuerda queda estable.'),
        el('li', {}, 'Toca la cuerda con fuerza media: un golpe muy fuerte sube el tono los primeros instantes y engaña al afinador.'),
        el('li', {}, 'Afina en orden de la 6ª a la 1ª y repite la vuelta: al tensar unas cuerdas se destensan las otras.'),
        el('li', {}, 'Cuerdas nuevas se desafinan por horas: estíralas suavemente y vuelve a afinar varias veces.'),
        el('li', {}, 'Si tocas con capo, afina primero sin capo y revisa después de ponerlo: el capo puede subir el tono.'),
        el('li', {}, 'En el bajo, deja sonar la nota un segundo antes de leer: los graves necesitan más tiempo para estabilizarse.'))),

    el('div', { class: 'row wrap' },
      button('Ir a practicar', () => navigate('/practica')),
      button('Academia', () => navigate('/academia'))));

  return () => afinador?.detener();
}
