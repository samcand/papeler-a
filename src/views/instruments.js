/** instruments.js — Qué hace cada instrumento, sección por sección. */

import { el, button, textarea, chip, section, toast, select } from '../ui.js';
import { store } from '../store.js';
import { sectionProgressions, chordsUsed } from '../chordpro.js';
import { keyInfo, chordNotes, keyPrefersFlats, transposeChord } from '../music.js';
import { chordShapes, chordDiagramSVG, chordTechnique as gTech, STRUM_PATTERNS, strumFor } from '../guitar.js';
import { pianoSVG, voicings, practiceDrills, chordMidi, nearestVoicing } from '../piano.js';
import { GROOVES, grooveById, grooveGridHTML, grooveCountIn, planForSection, FILLS, VOICES } from '../drums.js';
import { openChordDrawer } from './sheet.js';
import { INSTRUMENTOS, buscarDigitaciones, diagramaSVG, tablatura, mapaEscala, mastilSVG } from '../fretboard.js';
import { noteToPc } from '../music.js';

const TABS = [
  { id: 'guitarra', name: '🎸 Guitarra' },
  { id: 'ukelele', name: '🪕 Ukelele' },
  { id: 'piano', name: '🎹 Piano' },
  { id: 'bateria', name: '🥁 Batería' },
  { id: 'bajo', name: '🎵 Bajo' },
  { id: 'voz', name: '🎤 Voz' },
];

export function instrumentsView(root, { navigate, params }) {
  const song = store.song(params.id);
  if (!song) { root.replaceChildren(el('p', {}, 'Canción no encontrada.')); return; }

  let tab = store.state.settings.instrument || 'guitarra';
  let afinacionGuitarra = store.state.settings.afinacionGuitarra || 'guitarra';
  const body = el('div', { class: 'instrument-body' });

  const sections = sectionProgressions(song.body);
  const chords = chordsUsed(song.body);
  const info = keyInfo(song.key);

  const notesBox = (instrument) => section('Mis notas para este instrumento',
    textarea(song.instrumentNotes?.[instrument] || '', (v) => {
      const notes = { ...(song.instrumentNotes || {}) };
      notes[instrument] = v;
      store.updateSong(song.id, { instrumentNotes: notes });
    }, { rows: 3, placeholder: 'Ej: "entro en el segundo verso", "capo 3", "silencio en el puente"' }));

  const intensityBar = (level) => el('div', { class: 'intensity' },
    Array.from({ length: 5 }, (_, i) => el('span', { class: i < level ? 'on' : '' })));

  /** Tablatura de la progresión principal + mapa del mástil con la escala. */
  const bloquesDeTrastes = (instrumentoId) => {
    const escala = keyInfo(song.key);
    const grados = escala.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const mapa = mapaEscala(noteToPc(escala.tonic) || 0, grados, instrumentoId);
    return [
      section('Tablatura de la canción',
        el('p', { class: 'muted small' }, 'Cada bloque es un acorde de la progresión; el número es el traste y la x es cuerda que no suena.'),
        el('pre', { class: 'code tab' }, tablatura(chords.slice(0, 6), instrumentoId))),
      section(`El mástil en ${song.key}`,
        el('p', { class: 'muted small' }, 'Los puntos son las notas de la tonalidad y el número es el grado. Los marcados como 1 son la tónica: ahí resuelve todo.'),
        el('div', { class: 'neck-wrap', html: mastilSVG(mapa, { instrumentoId }) }),
        el('p', { class: 'muted small' }, 'Úsalo para adornos y para saber qué notas puedes tocar sin desentonar mientras la banda sostiene un acorde.')),
    ];
  };

  const ukelele = () => {
    const formas = chords.map((c) => ({ nombre: c, forma: buscarDigitaciones(c, 'ukelele', { max: 1 })[0] }));
    return el('div', {},
      section('Acordes en el ukelele',
        el('p', { class: 'muted' }, `Tonalidad ${song.key}. Afinación soprano/concierto (Sol-Do-Mi-La).`),
        el('div', { class: 'shape-row' },
          formas.map(({ nombre, forma }) => {
            if (!forma) return null;
            const fig = el('figure', { class: 'shape clickable' },
              el('div', { html: diagramaSVG(forma, { nombre, instrumentoId: 'ukelele' }) }),
              el('figcaption', {}, forma.barre ? `Cejilla en ${forma.barre.fret}` : 'Posición fácil'));
            fig.addEventListener('click', () => openChordDrawer(nombre, song.id));
            return fig;
          }))),
      section('Cómo acompañar con ukelele en la congregación',
        el('ul', { class: 'tips' },
          el('li', {}, 'El ukelele no tiene graves: nunca lo dejes solo sosteniendo la canción, salvo en un momento íntimo muy corto.'),
          el('li', {}, 'Rasguea con la yema del índice, no con uña, para un sonido cálido que no compita con la voz.'),
          el('li', {}, 'En los versos toca solo en los tiempos 1 y 3; en el coro, corcheas continuas.'),
          el('li', {}, 'Si la canción está en Bb o Eb, el ukelele agradece un capo o cambiar la tonalidad a C, F o G.'),
          el('li', {}, 'Truco: las formas del ukelele son las de la guitarra subidas una cuarta. Si sabes guitarra, ya sabes ukelele.'))),
      ...bloquesDeTrastes('ukelele'),
      notesBox('ukelele'));
  };

  const guitarra = () => {
    const capo = song.capo || 0;
    const selectorAfinacion = el('label', { class: 'field inline' },
      el('span', { class: 'field-label' }, 'Afinación'),
      select(['guitarra', 'guitarra-dropd', 'guitarra-dadgad'].map((id) => ({ value: id, label: INSTRUMENTOS[id].nombre })),
        afinacionGuitarra, (v) => { afinacionGuitarra = v; renderTab(); }));
    const shapeKey = capo ? transposeChord(info.tonic, -capo, false) + (info.minor ? 'm' : '') : song.key;
    return el('div', {},
      section('Preparación',
        el('div', { class: 'row wrap' }, selectorAfinacion),
        el('p', {}, `Tonalidad: ${song.key}. Acordes de la canción: ${chords.join(' · ')}.`),
        capo
          ? el('p', {}, `Con capo en el traste ${capo} tocas las formas de ${shapeKey} y suena en ${song.key}.`)
          : el('p', { class: 'muted' }, 'Sin capo. Si hay cejillas incómodas, prueba las sugerencias de capo en la vista de la canción.'),
        el('div', { class: 'shape-row' },
          chords.map((c) => {
            if (afinacionGuitarra !== 'guitarra') {
              const forma = buscarDigitaciones(c, afinacionGuitarra, { max: 1 })[0];
              if (!forma) return null;
              const fig = el('figure', { class: 'shape clickable' },
                el('div', { html: diagramaSVG(forma, { nombre: c, instrumentoId: afinacionGuitarra }) }),
                el('figcaption', {}, forma.barre ? `Cejilla en ${forma.barre.fret}` : 'Posición'));
              fig.addEventListener('click', () => openChordDrawer(c, song.id));
              return fig;
            }
            const shape = chordShapes(c)[0];
            if (!shape) return null;
            const fig = el('figure', { class: 'shape clickable' },
              el('div', { html: chordDiagramSVG(shape, { name: c }) }),
              el('figcaption', {}, shape.label));
            fig.addEventListener('click', () => openChordDrawer(c, song.id));
            return fig;
          }))),
      section('Rasgueo por sección',
        sections.map((s) => {
          const strum = strumFor(/coro/i.test(s.name) ? 'rock' : /intro|verso 1|final/i.test(s.name) ? 'suave' : song.feel);
          return el('div', { class: 'section-row' },
            el('div', { class: 'section-head' }, el('h4', {}, s.name), chip(strum.name)),
            el('div', { class: 'strum' }, strum.pattern.map((p, i) => el('span', { class: `beat ${p === '-' ? 'rest' : p === 'x' ? 'mute' : ''}` },
              el('b', {}, p === '-' ? '·' : p), el('small', {}, strum.counts[i])))),
            el('p', { class: 'muted small' }, strum.tip),
            el('p', { class: 'progression' }, s.chords.join('  →  ')));
        })),
      section('Patrones que vale la pena dominar',
        el('div', { class: 'pattern-grid' },
          STRUM_PATTERNS.map((p) => el('div', { class: 'pattern' },
            el('h4', {}, p.name),
            el('div', { class: 'strum' }, p.pattern.map((x, i) => el('span', { class: `beat ${x === '-' ? 'rest' : x === 'x' ? 'mute' : ''}` },
              el('b', {}, x === '-' ? '·' : x), el('small', {}, p.counts[i])))),
            el('p', { class: 'muted small' }, p.tip))))),
      ...bloquesDeTrastes(afinacionGuitarra),
      notesBox('guitarra'));
  };

  const piano = () => {
    let prev = [];
    const voiceLed = chords.map((c) => {
      const notes = nearestVoicing(c, prev);
      prev = notes;
      return { chord: c, notes };
    });
    return el('div', {},
      section('Acordes de la canción con buena conducción de voces',
        el('p', { class: 'muted' }, 'Cada acorde usa la inversión más cercana al anterior: así la mano casi no se mueve y el cambio suena pegado.'),
        el('div', { class: 'voicings' },
          voiceLed.map((v) => el('div', { class: 'voicing' },
            el('div', { class: 'voicing-head' },
              el('strong', {}, v.chord),
              el('span', { class: 'muted' }, chordNotes(v.chord, keyPrefersFlats(song.key)).join(' '))),
            el('div', { html: pianoSVG(v.notes, { width: 340, height: 92 }) }))))),
      section('Rol del piano en cada sección',
        sections.map((s) => el('div', { class: 'section-row' },
          el('div', { class: 'section-head' }, el('h4', {}, s.name)),
          el('p', {}, pianoRole(s.name)),
          el('p', { class: 'progression' }, s.chords.join('  →  '))))),
      section('Voicings del acorde principal',
        el('div', { class: 'voicings' },
          voicings(chords[0] || info.chords[0]).map((v) => el('div', { class: 'voicing' },
            el('div', { class: 'voicing-head' }, el('strong', {}, v.name), el('span', { class: 'muted' }, v.noteNames)),
            el('div', { html: pianoSVG(v.notes, { width: 340, height: 92 }) }),
            el('p', { class: 'muted small' }, v.use))))),
      section('Ejercicios para esta tonalidad',
        el('ol', { class: 'drills' },
          practiceDrills(info.chords).map((d) => el('li', {},
            el('strong', {}, `Nivel ${d.level}: ${d.name}. `), d.detail)))),
      notesBox('piano'));
  };

  const bateria = () => el('div', {},
    section('Plan dinámico de la canción',
      el('p', { class: 'muted' }, `Compás ${song.timeSignature}, ${song.bpm} BPM. La batería es el reloj: la meta número uno es no acelerar.`),
      sections.map((s) => {
        const plan = planForSection(s.name);
        const groove = grooveById(plan.groove);
        return el('div', { class: 'section-row' },
          el('div', { class: 'section-head' },
            el('h4', {}, s.name), chip(groove.name), intensityBar(plan.intensity)),
          el('div', { html: grooveGridHTML(groove) }),
          el('p', {}, plan.cue),
          el('p', { class: 'muted small' }, 'Cántalo antes de tocarlo: ' + grooveCountIn(groove)));
      })),
    section('Grooves de referencia',
      el('div', { class: 'pattern-grid' },
        GROOVES.map((g) => el('div', { class: 'pattern' },
          el('h4', {}, g.name),
          el('div', { html: grooveGridHTML(g) }),
          el('p', { class: 'muted small' }, g.how))))),
    section('Fills: cuándo y cuál',
      el('ul', { class: 'tips' }, FILLS.map((f) => el('li', {}, el('strong', {}, f.name + ': '), f.detail)))),
    notesBox('bateria'));

  const bajo = () => el('div', {},
    section('Fundamentales por sección',
      el('p', { class: 'muted' }, 'El bajo toca la fundamental del acorde salvo que la hoja indique otra nota (por ejemplo D/F# = toca F#).'),
      sections.map((s) => el('div', { class: 'section-row' },
        el('div', { class: 'section-head' }, el('h4', {}, s.name)),
        el('p', { class: 'progression' }, s.chords.map((c) => {
          const m = /\/([A-G][#b]?)/.exec(c);
          return m ? m[1] : c.replace(/(m|maj|sus|add|dim|aug|\d).*$/, '');
        }).join('  →  '))))),
    section('Posiciones en el bajo',
      el('div', { class: 'shape-row' },
        chords.slice(0, 6).map((c) => {
          const forma = buscarDigitaciones(c, 'bajo', { max: 1 })[0];
          if (!forma) return null;
          return el('figure', { class: 'shape' },
            el('div', { html: diagramaSVG(forma, { nombre: c, instrumentoId: 'bajo' }) }),
            el('figcaption', {}, 'Fundamental y quinta'));
        }))),
    ...bloquesDeTrastes('bajo'),
    section('Cómo tocar',
      el('ul', { class: 'tips' },
        el('li', {}, 'Bloquea con el bombo: si el bombo va en 1 y en el "y" de 3, tú también.'),
        el('li', {}, 'En versos, notas largas. En coros, más movimiento, pero nunca más que la batería.'),
        el('li', {}, 'Apaga la nota anterior antes de la siguiente: el silencio entre notas es parte del groove.'),
        el('li', {}, `Para caminar entre acordes usa la escala de ${song.key}: ${keyInfo(song.key).scale.join(' ')}.`),
        el('li', {}, 'Si el piano toca grave, tú sube una octava o deja espacio: no pueden ocupar el mismo lugar.'))),
    notesBox('bajo'));

  const voz = () => {
    const range = info.minor ? `${info.tonic}3 – ${info.tonic}4` : `${info.tonic}3 – ${info.tonic}4`;
    return el('div', {},
      section('Guía vocal',
        el('p', {}, `Tonalidad ${song.key}. Rango aproximado de la melodía: alrededor de ${range}. Si el coro queda por encima de Re4, la congregación deja de cantar: baja la tonalidad.`),
        el('ul', { class: 'tips' },
          el('li', {}, 'Verso 1: melodía sola, sin armonías. Que la gente aprenda la línea.'),
          el('li', {}, 'Coro: armonía a tercera por encima; en el último coro, añade la octava.'),
          el('li', {}, 'Da la entrada media frase antes con un gesto o con la voz.'),
          el('li', {}, 'Baja tu micrófono un par de frases para que se escuche la congregación.'))),
      section('Letra por secciones',
        sections.map((s) => el('div', { class: 'section-row' },
          el('div', { class: 'section-head' }, el('h4', {}, s.name), chip(`${s.chords.length} acordes`)),
          el('p', { class: 'progression' }, s.chords.join('  →  '))))),
      notesBox('voz'));
  };

  const renderers = { guitarra, ukelele, piano, bateria, bajo, voz };

  const renderTab = () => {
    store.setSetting('instrument', tab);
    store.setSetting('afinacionGuitarra', afinacionGuitarra);
    body.replaceChildren(renderers[tab]());
    [...tabsRow.children].forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  };

  const tabsRow = el('div', { class: 'tabs' },
    TABS.map((t) => {
      const b = button(t.name, () => { tab = t.id; renderTab(); });
      b.dataset.tab = t.id;
      return b;
    }));

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, song.title),
        el('p', { class: 'muted' }, 'Guía por instrumento')),
      el('div', { class: 'row wrap' },
        button('🔥 Calentar', () => navigate(`/calentamiento/${tab === 'voz' ? 'canto' : tab}`)),
        button('← Volver a la canción', () => navigate(`/cancion/${song.id}`)),
        button('Sincronizar con YouTube', () => navigate(`/sync/${song.id}`), { variant: 'primary' }))),
    tabsRow, body);

  renderTab();
}

function pianoRole(name = '') {
  if (/intro/i.test(name)) return 'Presenta el tema o sostén el acorde. Si la guitarra ya toca ritmo, tú solo sostén.';
  if (/verso\s*1/i.test(name)) return 'Inversiones cercanas, volumen bajo, sin pedal largo. La letra manda.';
  if (/verso/i.test(name)) return 'Como el verso 1 pero con octavas en la mano izquierda.';
  if (/pre/i.test(name)) return 'Crecer: acordes más completos y movimiento hacia el coro.';
  if (/coro/i.test(name)) return 'Acordes plenos en el registro medio-alto para cortar sobre la banda.';
  if (/puente/i.test(name)) return 'Colchón 1-5-9 sostenido. Aquí menos es más.';
  if (/final|outro/i.test(name)) return 'Bajar volumen gradualmente y resolver al acorde de la tonalidad.';
  return 'Acompaña con inversiones cercanas y escucha al cantante.';
}
