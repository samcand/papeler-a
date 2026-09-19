/**
 * sync.js — Sincronización con YouTube: marca la estructura de la canción sobre
 * el video y sigue en vivo qué debe tocar cada instrumento en cada instante.
 */

import { el, button, input, select, toast, copyText, chip, section, confirmDialog, render } from '../ui.js';
import { store } from '../store.js';
import { YouTubeSync, extractVideoId, buildTimeline, cueAt, timelineToText } from '../youtube.js';
import { formatTime, keyPrefersFlats, transposeChord } from '../music.js';
import { sectionProgressions } from '../chordpro.js';
import { grooveById, grooveGridHTML, planForSection } from '../drums.js';
import { chordShapes, chordDiagramSVG, strumFor } from '../guitar.js';
import { pianoSVG, nearestVoicing } from '../piano.js';
import { analyzeAudioFile, guessSectionNames } from '../analysis.js';
import { openChordDrawer } from './sheet.js';

export function syncView(root, { navigate, params }) {
  const song = store.song(params.id);
  if (!song) { render(root, el('p', {}, 'Canción no encontrada.')); return; }

  const yt = new YouTubeSync();
  let unsubscribe = null;
  let focusInstrument = store.state.settings.instrument || 'guitarra';

  const playerHost = el('div', { class: 'player-host' }, el('div', { id: 'yt-player' }));
  const livePanel = el('div', { class: 'live-panel' });
  const timelineHost = el('div', { class: 'timeline-host' });
  const analysisHost = el('div', { class: 'analysis-host' });

  // --- Línea de tiempo (marcas) ---
  const renderTimeline = () => {
    const timeline = buildTimeline(song);
    const duration = song.durationSec || (timeline.at(-1)?.end ?? 0);
    const marks = song.timeline || [];
    const sectionNames = sectionProgressions(song.body).map((s) => s.name);

    render(timelineHost, 
      section('Estructura marcada sobre el video',
        el('p', { class: 'muted' },
          marks.length
            ? 'Estas son tus marcas. Al reproducir, la app te dice en vivo qué toca cada instrumento.'
            : 'Aún no hay marcas. Reproduce el video y pulsa "Marcar aquí" al inicio de cada sección; o deja que se calculen desde el BPM.'),
        el('div', { class: 'row wrap' },
          select(sectionNames.length ? sectionNames : ['Intro', 'Verso 1', 'Coro'], markName, (v) => { markName = v; }),
          button('⌖ Marcar aquí', () => {
            const t = yt.currentTime();
            const next = [...(song.timeline || []), { t: Number(t.toFixed(2)), name: markName }]
              .sort((a, b) => a.t - b.t);
            store.updateSong(song.id, { timeline: next, durationSec: Math.round(yt.duration()) || song.durationSec });
            toast(`"${markName}" marcado en ${formatTime(t)}`);
            renderTimeline();
          }, { variant: 'primary' }),
          button('Calcular desde BPM', () => {
            const generated = buildTimeline({ ...song, timeline: [] });
            if (!generated.length) return toast('Necesito BPM y secciones con acordes para calcular', 'warn');
            store.updateSong(song.id, { timeline: generated.map((s) => ({ t: Number(s.start.toFixed(2)), name: s.name })) });
            toast('Línea de tiempo calculada. Ajusta las marcas que no cuadren.', 'ok');
            renderTimeline();
          }),
          marks.length ? button('Borrar marcas', () => {
            if (confirmDialog('¿Borrar todas las marcas de esta canción?')) {
              store.updateSong(song.id, { timeline: [] });
              renderTimeline();
            }
          }, { variant: 'ghost danger' }) : null,
          marks.length ? button('Copiar como texto', () => copyText(timelineToText(song))) : null),

        duration ? el('div', { class: 'tl-bar' },
          timeline.map((seg, i) => {
            const width = ((seg.end - seg.start) / duration) * 100;
            const bar = el('div', {
              class: `tl-seg i${i % 6}`, style: `width:${width}%`,
              title: `${seg.name} · ${formatTime(seg.start)}`,
              onClick: () => { yt.seek(seg.start); yt.play(); },
            }, el('span', {}, seg.name));
            return bar;
          })) : null,

        el('table', { class: 'tl-table' },
          el('thead', {}, el('tr', {},
            el('th', {}, 'Inicio'), el('th', {}, 'Sección'), el('th', {}, 'Acordes'), el('th', {}, ''))),
          el('tbody', {},
            timeline.map((seg, i) => el('tr', {},
              el('td', {},
                button(formatTime(seg.start), () => { yt.seek(seg.start); yt.play(); }, { variant: 'chip' })),
              el('td', {}, seg.name),
              el('td', { class: 'progression small' }, seg.chords.join(' · ')),
              el('td', {},
                marks[i] ? button('✕', () => {
                  const next = (song.timeline || []).filter((_, idx) => idx !== i);
                  store.updateSong(song.id, { timeline: next });
                  renderTimeline();
                }, { variant: 'ghost' }) : null)))))));
  };

  let markName = sectionProgressions(song.body)[0]?.name || 'Intro';

  // --- Panel en vivo ---
  const renderLive = (t) => {
    const cue = cueAt(song, t);
    if (!cue) {
      render(livePanel, el('p', { class: 'muted' },
        'Marca las secciones o pon el BPM de la canción para ver la guía en vivo.'));
      return;
    }
    const flats = keyPrefersFlats(song.key);
    const chord = cue.chord;
    const nextChord = cue.nextChord;
    const plan = planForSection(cue.section.name);
    const groove = grooveById(plan.groove);

    const instrumentBlock = () => {
      if (focusInstrument === 'guitarra' && chord) {
        const shape = chordShapes(chord)[0];
        return el('div', { class: 'live-inst' },
          shape ? el('div', { html: chordDiagramSVG(shape, { name: chord, width: 150, height: 180 }) }) : null,
          el('p', {}, cue.guitar));
      }
      if (focusInstrument === 'piano' && chord) {
        return el('div', { class: 'live-inst' },
          el('div', { html: pianoSVG(nearestVoicing(chord, []), { width: 360, height: 96 }) }),
          el('p', {}, cue.piano));
      }
      if (focusInstrument === 'bateria') {
        return el('div', { class: 'live-inst' },
          el('div', { html: grooveGridHTML(groove) }),
          el('p', {}, cue.drums));
      }
      return el('div', { class: 'live-inst' }, el('p', {}, cue.guitar));
    };

    render(livePanel, 
      el('div', { class: 'live-head' },
        el('div', {},
          el('span', { class: 'live-label' }, 'Ahora'),
          el('h2', {}, cue.section.name),
          el('p', { class: 'muted small' }, cue.next ? `Siguiente: ${cue.next.name} en ${formatTime(Math.max(0, cue.countdown))}` : 'Última sección')),
        el('div', { class: 'live-chord' },
          chord ? el('button', { class: 'big-chord', onClick: () => openChordDrawer(chord, song.id) }, chord) : el('span', { class: 'muted' }, '—'),
          nextChord ? el('span', { class: 'next-chord' }, '→ ' + nextChord) : null)),
      el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: `width:${(cue.progress * 100).toFixed(1)}%` })),
      el('div', { class: 'row wrap tabs small' },
        ['guitarra', 'piano', 'bateria'].map((i) => {
          const b = button(i === 'bateria' ? '🥁 Batería' : i === 'piano' ? '🎹 Piano' : '🎸 Guitarra',
            () => { focusInstrument = i; store.setSetting('instrument', i); renderLive(yt.currentTime()); });
          if (i === focusInstrument) b.classList.add('active');
          return b;
        })),
      instrumentBlock(),
      el('div', { class: 'live-grid' },
        el('div', {}, el('h4', {}, '🎸 Guitarra'), el('p', { class: 'small' }, cue.guitar)),
        el('div', {}, el('h4', {}, '🎹 Piano'), el('p', { class: 'small' }, cue.piano)),
        el('div', {}, el('h4', {}, '🥁 Batería'), el('p', { class: 'small' }, cue.drums))));
  };

  // --- Análisis de audio local ---
  const renderAnalysis = () => {
    const fileInput = el('input', { type: 'file', accept: 'audio/*', class: 'hidden' });
    const status = el('p', { class: 'muted small' });
    const result = el('div', {});

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        status.textContent = 'Analizando…';
        const data = await analyzeAudioFile(file, { onProgress: (m) => { status.textContent = m; } });
        const names = guessSectionNames(data.segments);
        status.textContent = `Listo: ${formatTime(data.duration)} · tempo estimado ${data.bpm} BPM · ${data.segments.length} secciones detectadas.`;
        render(result, 
          el('div', { class: 'row wrap' },
            button(`Usar ${data.bpm} BPM en la canción`, () => {
              store.updateSong(song.id, { bpm: data.bpm });
              toast('BPM actualizado', 'ok');
            }, { variant: 'primary' }),
            button('Usar estas secciones como marcas', () => {
              const timeline = data.segments.map((s, i) => ({ t: Number(s.start.toFixed(2)), name: names[i] || `Sección ${i + 1}` }));
              store.updateSong(song.id, { timeline, durationSec: Math.round(data.duration) });
              toast('Marcas creadas desde el audio', 'ok');
              renderTimeline();
            })),
          el('table', { class: 'tl-table' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Desde'), el('th', {}, 'Sugerencia'), el('th', {}, 'Intensidad'), el('th', {}, 'Qué hacer'))),
            el('tbody', {}, data.segments.map((s, i) => el('tr', {},
              el('td', {}, formatTime(s.start)),
              el('td', {}, names[i] || '—'),
              el('td', {}, chip(s.level)),
              el('td', { class: 'small' }, s.cue))))));
      } catch (err) {
        status.textContent = 'No se pudo analizar el archivo: ' + err.message;
      }
    });

    render(analysisHost, 
      section('Análisis automático de audio',
        el('p', { class: 'muted' },
          'El reproductor de YouTube no permite leer su audio desde el navegador (lo bloquea por seguridad). ' +
          'Para un análisis automático real, sube aquí el archivo de audio de la canción (mp3, wav, m4a): ' +
          'la app mide el tempo, la energía instante a instante y dónde cambian las secciones, y con eso crea las marcas.'),
        el('div', { class: 'row wrap' },
          button('Elegir archivo de audio', () => fileInput.click(), { variant: 'primary' }),
          fileInput),
        status, result));
  };

  // --- Montaje ---
  const videoInput = input(song.youtubeId, (v) => { pendingVideo = v; }, { placeholder: 'Pega la URL del video de YouTube' });
  let pendingVideo = song.youtubeId;

  const mountVideo = async (raw) => {
    const id = extractVideoId(raw);
    if (!id) return toast('No reconocí ese enlace de YouTube', 'warn');
    store.updateSong(song.id, { youtubeId: id });
    try {
      await yt.mount('yt-player', id);
      unsubscribe?.();
      unsubscribe = yt.onTick((t) => renderLive(t));
      toast('Video cargado');
    } catch (err) {
      toast(err.message, 'warn');
    }
  };

  render(root, 
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, song.title),
        el('p', { class: 'muted' }, 'Seguimiento en vivo con el video')),
      el('div', { class: 'row wrap' },
        button('← Canción', () => navigate(`/cancion/${song.id}`)),
        button('Instrumentos', () => navigate(`/instrumentos/${song.id}`)))),
    el('div', { class: 'toolbar' },
      videoInput,
      button('Cargar video', () => mountVideo(pendingVideo), { variant: 'primary' }),
      button('0.75×', () => yt.setRate(0.75), { title: 'Cámara lenta para aprender' }),
      button('1×', () => yt.setRate(1)),
      button('⏪ 5s', () => yt.seek(Math.max(0, yt.currentTime() - 5))),
      button('⏯', () => (yt.isPlaying() ? yt.pause() : yt.play()))),
    el('div', { class: 'sync-layout' }, playerHost, livePanel),
    timelineHost, analysisHost);

  renderTimeline();
  renderAnalysis();
  renderLive(0);
  if (song.youtubeId) mountVideo(song.youtubeId);

  return () => { unsubscribe?.(); yt.destroy(); };
}
