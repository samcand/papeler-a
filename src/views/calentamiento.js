/**
 * calentamiento.js (vista) — Rutina de calentamiento guiada, con cronómetro,
 * metrónomo que se pone solo al tempo del ejercicio y, en canto, los patrones
 * que suenan para que los imites.
 */

import { el, button, select, chip, section, toast } from '../ui.js';
import { store } from '../store.js';
import { INSTRUMENTOS_CALENTAMIENTO, RUTINAS, construirRutina, DURACIONES, PRINCIPIOS } from '../calentamiento.js';
import { Metronome } from '../metronome.js';
import { EJERCICIOS, secuenciaEjercicio, nombreNota } from '../vocal.js';
import { playSemitones } from '../academy.js';
import { keyInfo } from '../music.js';
import { chordsUsed } from '../chordpro.js';

export function calentamientoView(root, { navigate, params }) {
  let instrumento = params.instrumento || store.state.settings.calentamientoInstrumento || 'guitarra';
  let minutos = store.state.settings.calentamientoMinutos || 10;
  let cancionId = store.state.settings.calentamientoCancion || store.songs[0]?.id;
  let rutina = construirRutina(instrumento, minutos);
  let paso = 0;
  let restante = 0;
  let timer = null;
  let corriendo = false;
  let pasoVocal = 0;
  const metro = new Metronome({ bpm: 70 });

  const cancion = () => store.song(cancionId);
  const cantante = () => store.cantante(store.state.settings.cantanteActivo) || store.cantantes[0] || null;

  const guiaHost = el('div', { class: 'cal-guia' });
  const listaHost = el('div', { class: 'cal-lista' });

  const ejercicioActual = () => rutina.ejercicios[paso] || null;

  // --- Cronómetro ---
  const parar = () => {
    clearInterval(timer); timer = null; corriendo = false;
    metro.stop();
    pintarGuia();
  };

  const arrancar = () => {
    const ej = ejercicioActual();
    if (!ej) return;
    if (!restante) restante = ej.minutos * 60;
    corriendo = true;
    if (ej.bpm) { metro.setBpm(ej.bpm); metro.start(); }
    clearInterval(timer);
    timer = setInterval(() => {
      restante--;
      if (restante <= 0) {
        avisoFin();
        siguiente();
        return;
      }
      pintarTiempo();
    }, 1000);
    pintarGuia();
  };

  const avisoFin = () => {
    // Tres pitidos para avisar sin tener que mirar la pantalla.
    playSemitones([0, 0, 12], { root: 880, gap: 0.18, hold: 0.16 });
  };

  const irAPaso = (n) => {
    paso = Math.max(0, Math.min(rutina.ejercicios.length - 1, n));
    restante = (ejercicioActual()?.minutos || 1) * 60;
    pasoVocal = 0;
    metro.stop();
    if (corriendo) arrancar(); else pintarGuia();
  };

  const siguiente = () => {
    if (paso >= rutina.ejercicios.length - 1) {
      parar();
      toast('Calentamiento terminado. A ensayar.', 'ok');
      paso = 0; restante = (rutina.ejercicios[0]?.minutos || 1) * 60;
      pintarGuia();
      return;
    }
    irAPaso(paso + 1);
  };

  const formato = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

  const tiempoLabel = el('div', { class: 'cal-tiempo' }, '0:00');
  const pintarTiempo = () => { tiempoLabel.textContent = formato(restante); };

  // --- Contenido del ejercicio ---
  const contextoDeCancion = (ej) => {
    const song = cancion();
    if (!ej.usaCancion || !song) return null;
    const info = keyInfo(song.key);
    const acordes = chordsUsed(song.body).slice(0, 8);
    return el('div', { class: 'cal-contexto' },
      el('span', { class: 'ctl-label' }, 'Con la canción del domingo'),
      el('div', { class: 'row wrap' },
        chip(song.title),
        chip(`Tonalidad ${song.key}`, { class: 'key' }),
        chip(`${song.bpm || '?'} BPM`),
        chip(`Escala: ${info.scale.join(' ')}`)),
      acordes.length ? el('p', { class: 'progression' }, acordes.join('  →  ')) : null);
  };

  const bloqueVocal = (ej) => {
    const vocal = EJERCICIOS.find((e) => e.id === ej.ejercicioVocal);
    if (!vocal) return null;
    const c = cantante();
    const desde = c?.comoda?.[0] || 55;
    const hasta = c?.comoda?.[1] || 67;
    const pasos = secuenciaEjercicio(vocal, { desde, hasta });
    const actual = pasos[Math.min(pasoVocal, pasos.length - 1)];
    return el('div', { class: 'cal-vocal' },
      el('p', {}, el('strong', {}, 'Objetivo: '), vocal.objetivo),
      el('p', {}, el('strong', {}, 'Cómo: '), vocal.como),
      el('p', { class: 'muted small' }, '⚠ ' + vocal.cuidado),
      el('div', { class: 'row wrap' },
        chip(c ? `Tu rango: ${nombreNota(desde)} – ${nombreNota(hasta)}` : 'Rango medio (mide el tuyo en Canto)'),
        chip(`Paso ${Math.min(pasoVocal, pasos.length - 1) + 1} de ${pasos.length}`),
        chip(actual.notas.map((n) => nombreNota(n)).join(' → '))),
      el('div', { class: 'row wrap' },
        button('🔊 Tocar el patrón', () => {
          playSemitones(vocal.patron, {
            root: 440 * Math.pow(2, (actual.base - 69) / 12),
            gap: vocal.duracion, hold: vocal.duracion * 0.9,
          });
        }, { variant: 'primary' }),
        button('▶ Medio tono arriba', () => {
          pasoVocal = Math.min(pasos.length - 1, pasoVocal + 1);
          pintarGuia();
          const p = pasos[pasoVocal];
          playSemitones(vocal.patron, {
            root: 440 * Math.pow(2, (p.base - 69) / 12),
            gap: vocal.duracion, hold: vocal.duracion * 0.9,
          });
        }),
        button('◀ Medio tono abajo', () => { pasoVocal = Math.max(0, pasoVocal - 1); pintarGuia(); })));
  };

  const pintarGuia = () => {
    const ej = ejercicioActual();
    if (!ej) { guiaHost.replaceChildren(); return; }
    const progreso = rutina.minutos
      ? ((rutina.ejercicios.slice(0, paso).reduce((n, e) => n + e.minutos, 0) * 60 + (ej.minutos * 60 - restante)) / (rutina.minutos * 60)) * 100
      : 0;

    guiaHost.replaceChildren(
      el('div', { class: 'cal-cabecera' },
        el('div', {},
          el('span', { class: 'ctl-label' }, `Paso ${paso + 1} de ${rutina.ejercicios.length}`),
          el('h2', {}, ej.nombre),
          el('div', { class: 'row wrap' },
            chip(`${ej.minutos} min`),
            ej.bpm ? chip(`${ej.bpm} BPM`, { class: 'key' }) : null,
            ej.sinInstrumento ? chip('sin instrumento') : null)),
        tiempoLabel),
      el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: `width:${Math.min(100, progreso)}%` })),
      el('div', { class: 'row wrap' },
        button(corriendo ? '⏸ Pausa' : '▶ Empezar', () => (corriendo ? parar() : arrancar()),
          { variant: corriendo ? 'ok' : 'primary' }),
        button('◀ Anterior', () => irAPaso(paso - 1)),
        button('Siguiente ▶', () => siguiente()),
        button('↻ Reiniciar paso', () => { restante = ej.minutos * 60; pintarTiempo(); }),
        ej.bpm ? button(metro.running ? '⏹ Clic' : '♩ Clic', () => {
          metro.setBpm(ej.bpm);
          metro.toggle();
          pintarGuia();
        }, { variant: metro.running ? 'ok' : '' }) : null),
      ej.ejercicioVocal
        ? bloqueVocal(ej)
        : el('div', {},
            el('p', {}, el('strong', {}, 'Objetivo: '), ej.objetivo),
            el('p', {}, el('strong', {}, 'Cómo: '), ej.como),
            ej.detalle ? el('p', { class: 'progression' }, ej.detalle.join('   ·   ')) : null,
            el('p', { class: 'muted small' }, '⚠ ' + ej.cuidado)),
      contextoDeCancion(ej));
    pintarTiempo();
    pintarLista();
  };

  const pintarLista = () => {
    listaHost.replaceChildren(
      el('ol', { class: 'cal-pasos' },
        rutina.ejercicios.map((ej, i) => {
          const li = el('li', { class: i === paso ? 'activo' : i < paso ? 'hecho' : '' },
            el('span', { class: 'cal-min' }, `${ej.minutos}′`),
            el('span', { class: 'grow' }, ej.nombre),
            ej.bpm ? chip(`${ej.bpm}`) : null);
          li.addEventListener('click', () => irAPaso(i));
          return li;
        })));
  };

  const rehacer = () => {
    rutina = construirRutina(instrumento, minutos);
    paso = 0;
    restante = (rutina.ejercicios[0]?.minutos || 1) * 60;
    pasoVocal = 0;
    store.setSetting('calentamientoInstrumento', instrumento);
    store.setSetting('calentamientoMinutos', minutos);
    store.setSetting('calentamientoCancion', cancionId);
    if (corriendo) parar();
    pintarResumen();
    pintarGuia();
  };

  const resumenLinea = el('p', { class: 'muted small' }, '');
  const pintarResumen = () => {
    const conCancion = rutina.ejercicios.filter((e) => e.usaCancion).length;
    resumenLinea.textContent =
      `Rutina de ${rutina.minutos} minutos en ${rutina.ejercicios.length} pasos` +
      (conCancion ? `. ${conCancion} de ellos usan la canción del domingo, así el cuerpo ya está en contexto cuando empieza el ensayo.` : '.');
  };

  const selectores = el('div', { class: 'row wrap' },
    el('label', { class: 'field inline' },
      el('span', { class: 'field-label' }, 'Instrumento'),
      select(INSTRUMENTOS_CALENTAMIENTO.map((i) => ({ value: i.id, label: i.nombre })), instrumento,
        (v) => { instrumento = v; rehacer(); })),
    el('label', { class: 'field inline' },
      el('span', { class: 'field-label' }, 'Tiempo'),
      select(DURACIONES.map((d) => ({ value: d, label: `${d} minutos` })), minutos,
        (v) => { minutos = Number(v); rehacer(); })),
    el('label', { class: 'field inline' },
      el('span', { class: 'field-label' }, 'Canción del domingo'),
      select(store.songs.map((s) => ({ value: s.id, label: `${s.title} (${s.key})` })), cancionId,
        (v) => { cancionId = v; rehacer(); })));

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Calentamiento'),
        el('p', { class: 'muted' }, 'Una rutina guiada para cada instrumento y para la voz')),
      el('div', { class: 'row wrap' },
        button('Practicar', () => navigate('/practica')),
        button('Canto', () => navigate('/canto')))),
    el('div', { class: 'card' }, selectores, resumenLinea),
    el('div', { class: 'cal-layout' },
      el('div', { class: 'card' }, guiaHost),
      el('div', { class: 'card' },
        el('h2', { class: 'card-title' }, 'La rutina'),
        listaHost)),
    section('Cómo calentar bien',
      el('ul', { class: 'tips' }, PRINCIPIOS.map((p) => el('li', {}, p)))));

  restante = (rutina.ejercicios[0]?.minutos || 1) * 60;
  pintarResumen();
  pintarGuia();

  return () => { clearInterval(timer); metro.stop(); };
}
