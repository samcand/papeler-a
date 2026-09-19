/** practice.js — Modo de práctica: metrónomo, entrenador de acordes y rutas. */

import { el, button, select, toast, chip, section } from '../ui.js';
import { store } from '../store.js';
import { Metronome, TapTempo } from '../metronome.js';
import { chordsUsed } from '../chordpro.js';
import { chordShapes, chordDiagramSVG, chordTechnique, chordDifficulty } from '../guitar.js';
import { pianoSVG, chordMidi, chordTechnique as pianoTips } from '../piano.js';
import { PATHS } from '../academy.js';
import { openChordDrawer } from './sheet.js';

export function practiceView(root, { navigate, params }) {
  const song = params.id ? store.song(params.id) : null;
  const chords = song ? chordsUsed(song.body) : [];
  const metro = new Metronome({ bpm: song?.bpm || 80, beatsPerBar: Number((song?.timeSignature || '4/4').split('/')[0]) || 4 });
  const tap = new TapTempo();
  let instrument = store.state.settings.instrument || 'guitarra';
  let trainerTimer = null;
  let sessionStart = null;

  // --- Metrónomo ---
  const beatsHost = el('div', { class: 'beats' });
  const bpmLabel = el('strong', { class: 'bpm-value' }, String(metro.bpm));

  const paintBeats = (active = -1) => {
    beatsHost.replaceChildren(
      ...Array.from({ length: metro.beatsPerBar }, (_, i) =>
        el('span', { class: `beat-dot${i === active ? ' on' : ''}${i === 0 ? ' first' : ''}` })));
  };
  metro.onBeat = (i) => paintBeats(i);
  paintBeats();

  const setBpm = (v) => { metro.setBpm(v); bpmLabel.textContent = String(metro.bpm); };

  const metronomeCard = section('Metrónomo',
    el('div', { class: 'metro' },
      el('div', { class: 'metro-main' },
        button('−5', () => setBpm(metro.bpm - 5)),
        button('−1', () => setBpm(metro.bpm - 1)),
        el('div', { class: 'bpm-box' }, bpmLabel, el('span', { class: 'muted small' }, 'BPM')),
        button('+1', () => setBpm(metro.bpm + 1)),
        button('+5', () => setBpm(metro.bpm + 5))),
      beatsHost,
      el('div', { class: 'row wrap' },
        button('▶ Iniciar / ⏸ Parar', (e) => {
          metro.toggle();
          e.target.classList.toggle('ok', metro.running);
          if (metro.running && !sessionStart) sessionStart = Date.now();
          if (!metro.running) paintBeats();
        }, { variant: 'primary' }),
        button('Tap tempo', (e) => {
          const bpm = tap.tap();
          if (bpm) { setBpm(bpm); e.target.textContent = `Tap (${bpm})`; }
        }),
        el('label', { class: 'field inline' },
          el('span', { class: 'field-label' }, 'Compás'),
          select(['4/4', '3/4', '6/8', '2/4'], `${metro.beatsPerBar}/4`, (v) => {
            metro.beatsPerBar = v === '6/8' ? 6 : Number(v.split('/')[0]);
            metro.subdivision = v === '6/8' ? 1 : 1;
            paintBeats();
          })),
        el('label', { class: 'field inline' },
          el('span', { class: 'field-label' }, 'Subdivisión'),
          select([{ value: 1, label: 'Negras' }, { value: 2, label: 'Corcheas' }, { value: 4, label: 'Semicorcheas' }],
            metro.subdivision, (v) => { metro.subdivision = Number(v); }))),
      song ? el('p', { class: 'muted small' },
        `Consejo: practica "${song.title}" a ${Math.round((song.bpm || 80) * 0.8)} BPM (80 %) hasta que salga limpia, y sube de 5 en 5.`) : null));

  // --- Entrenador de cambios de acorde ---
  const trainerBox = el('div', { class: 'trainer' });
  let trainerIndex = 0;
  const paintTrainer = () => {
    if (!chords.length) {
      trainerBox.replaceChildren(el('p', { class: 'muted' }, 'Abre una canción para entrenar sus acordes.'));
      return;
    }
    const chord = chords[trainerIndex % chords.length];
    const shape = chordShapes(chord)[0];
    trainerBox.replaceChildren(
      el('div', { class: 'trainer-card' },
        el('h3', {}, chord),
        instrument === 'piano'
          ? el('div', { html: pianoSVG(chordMidi(chord), { width: 340, height: 92 }) })
          : el('div', { html: shape ? chordDiagramSVG(shape, { name: chord, width: 150, height: 186 }) : '' }),
        el('ul', { class: 'tips small' },
          (instrument === 'piano' ? pianoTips(chord) : chordTechnique(chord, shape)).slice(0, 2).map((t) => el('li', {}, t))),
        el('div', { class: 'row' },
          button('Siguiente', () => { trainerIndex++; paintTrainer(); }, { variant: 'primary' }),
          button('Ver detalle', () => openChordDrawer(chord, song?.id)))));
  };
  paintTrainer();

  const trainerCard = section('Entrenador de acordes',
    el('p', { class: 'muted' }, 'Cambia de acorde cada pocos segundos sin parar el metrónomo. El objetivo no es tocar rápido: es llegar a tiempo al primer tiempo del compás.'),
    el('div', { class: 'row wrap' },
      select([{ value: 'guitarra', label: '🎸 Guitarra' }, { value: 'piano', label: '🎹 Piano' }],
        instrument, (v) => { instrument = v; store.setSetting('instrument', v); paintTrainer(); }),
      button('Auto cada 4 compases', (e) => {
        if (trainerTimer) {
          clearInterval(trainerTimer); trainerTimer = null;
          e.target.classList.remove('ok'); e.target.textContent = 'Auto cada 4 compases';
          return;
        }
        const ms = (60 / metro.bpm) * metro.beatsPerBar * 4 * 1000;
        trainerTimer = setInterval(() => { trainerIndex++; paintTrainer(); }, ms);
        e.target.classList.add('ok'); e.target.textContent = 'Auto activo ⏹';
      })),
    trainerBox);

  // --- Progreso de acordes ---
  const progressHost = el('div', {});
  const paintProgress = () => {
    if (!song) { progressHost.replaceChildren(); return; }
    const learned = new Set(store.practiceFor(song.id).chordsLearned);
    const pct = chords.length ? Math.round((chords.filter((c) => learned.has(c)).length / chords.length) * 100) : 0;
    progressHost.replaceChildren(
      section(`Acordes de "${song.title}" — ${pct} % dominados`,
        el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: `width:${pct}%` })),
        el('div', { class: 'chip-list' },
          chords.map((c) => {
            const b = button(`${c} ${learned.has(c) ? '✓' : ''} ${'★'.repeat(chordDifficulty(c))}`,
              () => { store.toggleChordLearned(song.id, c); paintProgress(); },
              { variant: learned.has(c) ? 'ok' : 'chip' });
            return b;
          })),
        el('p', { class: 'muted small' }, 'Marca un acorde cuando puedas cambiarlo a tiempo dos veces seguidas con el metrónomo.')));
  };
  paintProgress();

  // --- Ruta de aprendizaje ---
  const pathHost = el('div', {});
  const paintPath = () => {
    const path = PATHS[instrument] || PATHS.guitarra;
    pathHost.replaceChildren(
      section('Ruta de aprendizaje',
        el('div', { class: 'row wrap' },
          Object.keys(PATHS).map((k) => {
            const b = button(k, () => { instrument = k; store.setSetting('instrument', k); paintPath(); paintTrainer(); },
              { variant: k === instrument ? 'ok' : 'chip' });
            return b;
          })),
        el('ol', { class: 'path' },
          path.map((lvl) => el('li', {},
            el('h4', {}, `Nivel ${lvl.level}: ${lvl.name}`),
            el('p', {}, el('strong', {}, 'Meta: '), lvl.goal),
            el('p', { class: 'muted' }, el('strong', {}, 'Ejercicio: '), lvl.drill))))));
  };
  paintPath();

  // --- Registro de práctica ---
  const logCard = section('Registro de práctica',
    el('div', { class: 'row wrap' },
      [10, 20, 30].map((m) => button(`+${m} min`, () => {
        if (!song) return toast('Abre una canción para registrar práctica', 'warn');
        store.addPracticeMinutes(song.id, m);
        toast(`${m} minutos registrados`);
        paintLog();
      }))),
    el('div', { id: 'practice-log' }));

  const paintLog = () => {
    const host = logCard.querySelector('#practice-log');
    if (!song) { host.replaceChildren(el('p', { class: 'muted' }, 'Sin canción seleccionada.')); return; }
    const p = store.practiceFor(song.id);
    host.replaceChildren(el('p', {},
      `Total acumulado en "${song.title}": `, el('strong', {}, `${p.minutes} minutos`),
      p.lastAt ? ` · última vez: ${new Date(p.lastAt).toLocaleDateString('es')}` : ''));
  };
  paintLog();

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, song ? `Practicar: ${song.title}` : 'Practicar'),
        el('p', { class: 'muted' }, song ? `${song.key} · ${song.bpm} BPM · ${song.timeSignature}` : 'Metrónomo y ejercicios')),
      el('div', { class: 'row wrap' },
        song ? button('← Canción', () => navigate(`/cancion/${song.id}`)) : button('Repertorio', () => navigate('/')),
        button('Academia', () => navigate('/academia')))),
    metronomeCard, trainerCard, progressHost, pathHost, logCard);

  return () => { metro.stop(); clearInterval(trainerTimer); };
}
