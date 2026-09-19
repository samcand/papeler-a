/**
 * academy.js (vista) — Academia de música: círculo de quintas y recursos
 * de teoría aplicada a la alabanza.
 */

import { el, button, select, chip, section, toast, render } from '../ui.js';
import { store } from '../store.js';
import {
  CIRCLE, circleOfFifthsSVG, circleExplain, INTERVALS, MODES, modeNotes,
  PROGRESSIONS, progressionInKey, RHYTHM_VALUES, GLOSSARY, PATHS, accText,
  playInterval, playSemitones, playChordSemis,
} from '../academy.js';
import { keyInfo, noteToPc, chordPitches, SHARP_NAMES, toNashville } from '../music.js';
import { chordShapes, chordDiagramSVG } from '../guitar.js';
import { pianoSVG, chordMidi } from '../piano.js';
import { openChordDrawer } from './sheet.js';

const KEYS = [...CIRCLE.map((c) => c.major), ...CIRCLE.map((c) => c.minor)];

export function academyView(root, { navigate }) {
  let activeKey = store.state.settings.academyKey || 'G';

  const circleHost = el('div', { class: 'circle-host' });
  const explainHost = el('div', { class: 'explain-host' });
  const progHost = el('div', {});

  const setKey = (k) => {
    activeKey = k;
    store.setSetting('academyKey', k);
    paintCircle();
    paintExplain();
    paintProgressions();
  };

  const paintCircle = () => {
    render(circleHost, el('div', { html: circleOfFifthsSVG(activeKey, 400) }));
    circleHost.querySelectorAll('[data-key]').forEach((node) => {
      node.addEventListener('click', () => setKey(node.dataset.key));
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setKey(node.dataset.key); } });
    });
  };

  const paintExplain = () => {
    const info = keyInfo(activeKey);
    const { entry, puntos } = circleExplain(activeKey);
    const root0 = noteToPc(info.tonic) || 0;

    render(explainHost, 
      el('div', { class: 'row wrap' },
        el('h3', {}, `Tonalidad de ${activeKey}`),
        chip(accText(entry)),
        chip(`Relativo: ${info.relative}`),
        button('▶ Escuchar la escala', () => playSemitones(
          [...(info.minor ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12])],
          { root: 261.63 * Math.pow(2, ((root0 - 0) % 12) / 12) }), { variant: 'chip' })),
      el('p', { class: 'muted' }, `Escala: ${info.scale.join(' – ')}`),
      el('div', { class: 'chip-list' },
        info.chords.map((c, i) => {
          const b = button(`${info.roman[i]}  ${c}`, () => { playChordSemis(chordPitches(c)); openChordDrawer(c, null); }, { variant: 'chip' });
          return b;
        })),
      el('ul', { class: 'tips' }, puntos.map((p) => el('li', {}, p))));
  };

  const paintProgressions = () => {
    render(progHost, 
      section(`Progresiones que funcionan en ${activeKey}`,
        el('p', { class: 'muted' }, 'Los números son grados: 1 es la tonalidad, 5 el acorde que crea tensión y 6m el relativo menor. Aprender la progresión en números te deja cambiar de tonalidad sin volver a estudiar la canción.'),
        el('div', { class: 'prog-grid' },
          PROGRESSIONS.map((p) => {
            const chords = progressionInKey(p.nums, activeKey);
            return el('div', { class: 'prog-card' },
              el('h4', {}, p.name),
              el('p', { class: 'nums' }, p.nums.join('  –  ')),
              el('p', { class: 'progression' }, chords.join('  →  ')),
              el('p', { class: 'muted small' }, p.use),
              el('div', { class: 'row wrap' },
                chords.map((c) => button(c, () => openChordDrawer(c, null), { variant: 'chip' }))));
          }))));
  };

  // --- Entrenamiento auditivo ---
  const earHost = el('div', {});
  let current = null;
  let score = { ok: 0, total: 0 };
  const paintEar = (feedback = '') => {
    const scoreLine = el('p', { class: 'muted small' }, score.total ? `Aciertos: ${score.ok} de ${score.total}` : 'Pulsa "Escuchar" y adivina el intervalo.');
    render(earHost, 
      section('Entrenamiento de oído: intervalos',
        el('p', { class: 'muted' }, 'Reconocer intervalos es lo que te permite sacar una canción de oído y cantar segundas voces sin partitura.'),
        el('div', { class: 'row wrap' },
          button('▶ Escuchar un intervalo', () => {
            current = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
            playInterval(current.semis);
            paintEar('Suena… ¿cuál es?');
          }, { variant: 'primary' }),
          current ? button('🔁 Repetir', () => playInterval(current.semis)) : null,
          current ? button('🎹 Juntos (armónico)', () => playInterval(current.semis, { mode: 'armonico' })) : null),
        feedback ? el('p', { class: 'feedback' }, feedback) : null,
        el('div', { class: 'chip-list' },
          INTERVALS.map((iv) => button(iv.name, () => {
            if (!current) return toast('Primero escucha un intervalo', 'warn');
            score.total++;
            if (iv.semis === current.semis) { score.ok++; paintEar(`✅ Correcto: ${current.name}. ${current.ref}`); }
            else paintEar(`❌ Era ${current.name} (${current.semis} semitonos). Vuelve a escucharlo y compara.`);
          }, { variant: 'chip' }))),
        scoreLine,
        el('details', {},
          el('summary', {}, 'Tabla de intervalos y para qué sirve cada uno'),
          el('table', { class: 'tl-table' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Semitonos'), el('th', {}, 'Nombre'), el('th', {}, 'Uso en la alabanza'), el('th', {}, ''))),
            el('tbody', {}, INTERVALS.map((iv) => el('tr', {},
              el('td', {}, String(iv.semis)),
              el('td', {}, iv.name),
              el('td', { class: 'small' }, iv.ref),
              el('td', {}, button('▶', () => playInterval(iv.semis), { variant: 'chip' })))))))));
  };
  paintEar();

  // --- Escalas y modos ---
  const modesHost = el('div', {});
  const paintModes = () => {
    const tonic = keyInfo(activeKey).tonic;
    const rootFreq = 261.63 * Math.pow(2, ((noteToPc(tonic) || 0)) / 12);
    render(modesHost, 
      section('Escalas y modos',
        el('p', { class: 'muted' }, `Todos sobre la tónica ${tonic}. Cambiar de modo es cambiar el "color" sin cambiar de tonalidad.`),
        el('div', { class: 'mode-grid' },
          MODES.map((m) => el('div', { class: 'mode-card' },
            el('h4', {}, m.name),
            el('p', { class: 'progression' }, modeNotes(m, tonic).join(' – ')),
            el('p', { class: 'muted small' }, m.use),
            button('▶ Escuchar', () => playSemitones([...m.steps, 12], { root: rootFreq }), { variant: 'chip' }))))));
  };
  paintModes();

  const rhythmCard = section('Lectura rítmica básica',
    el('p', { class: 'muted' }, 'Con estas figuras entiendes cualquier hoja de ritmo y cualquier patrón de rasgueo o groove.'),
    el('table', { class: 'tl-table' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Figura'), el('th', {}, 'Nombre'), el('th', {}, 'Tiempos en 4/4'), el('th', {}, 'Para qué'))),
      el('tbody', {}, RHYTHM_VALUES.map((r) => el('tr', {},
        el('td', { class: 'rhythm-sign' }, r.sign),
        el('td', {}, r.name),
        el('td', {}, String(r.beats)),
        el('td', { class: 'small' }, r.tip))))),
    el('ul', { class: 'tips' },
      el('li', {}, 'Cuenta siempre en voz alta: "1 y 2 y 3 y 4 y". La mayoría de los errores de ritmo son errores de conteo.'),
      el('li', {}, 'En 6/8 cuenta "1-2-3 4-5-6" y acentúa el 1 y el 4.'),
      el('li', {}, 'El silencio se cuenta igual que la nota: no lo "saltes".')));

  const glossaryCard = section('Glosario del músico de alabanza',
    el('div', { class: 'glossary' },
      GLOSSARY.map((g) => el('div', { class: 'gloss' },
        el('strong', {}, g.term), el('p', { class: 'muted small' }, g.def)))));

  const nashvilleCard = section('Cifrado en números (Nashville)',
    el('p', {}, `En ${activeKey}, estos son los números que usará tu equipo:`),
    el('div', { class: 'chip-list' },
      keyInfo(activeKey).chords.map((c) => chip(`${toNashville(c, activeKey)} = ${c}`))),
    el('ul', { class: 'tips' },
      el('li', {}, 'Ventaja: si el cantante pide medio tono abajo, nadie vuelve a escribir la hoja. Los números no cambian.'),
      el('li', {}, 'Escribe "6m" para el relativo menor y "5/7" cuando el bajo toque la séptima del tono.'),
      el('li', {}, 'En la vista de canción puedes cambiar la notación a Nashville y ver toda la hoja en números.')));

  const pathsCard = section('Rutas de aprendizaje por instrumento',
    el('div', { class: 'path-grid' },
      Object.entries(PATHS).map(([k, levels]) => el('div', { class: 'path-card' },
        el('h4', {}, k[0].toUpperCase() + k.slice(1)),
        el('ol', {}, levels.map((l) => el('li', {}, el('strong', {}, l.name + ': '), l.goal))),
        button('Practicar esto', () => { store.setSetting('instrument', k); navigate('/practica'); }, { variant: 'chip' })))));

  render(root, 
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Academia de música'),
        el('p', { class: 'muted' }, 'Lo que de verdad se usa el domingo, explicado corto y aplicado')),
      el('div', { class: 'row wrap' },
        el('label', { class: 'field inline' },
          el('span', { class: 'field-label' }, 'Tonalidad'),
          select(KEYS, activeKey, (v) => setKey(v))),
        button('Ir a practicar', () => navigate('/practica'), { variant: 'primary' }))),
    el('div', { class: 'academy-top card' },
      el('div', {}, el('h2', { class: 'card-title' }, 'Círculo de quintas'), circleHost,
        el('p', { class: 'muted small' }, 'Toca cualquier tonalidad del anillo exterior (mayores) o interior (relativos menores).')),
      el('div', { class: 'academy-explain' }, explainHost)),
    progHost, earHost, modesHost, rhythmCard, nashvilleCard, glossaryCard, pathsCard);

  paintCircle();
  paintExplain();
  paintProgressions();
}
