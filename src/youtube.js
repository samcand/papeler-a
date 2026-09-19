/**
 * youtube.js — Reproductor de YouTube sincronizado con la estructura de la canción.
 *
 * Cómo funciona el "análisis": el reproductor incrustado no deja leer su audio
 * (política del navegador), así que aquí el mapa de la canción se construye con
 * marcas de tiempo — puestas a mano en un clic, o calculadas desde el BPM y los
 * compases de cada sección — y con eso la app sabe, en cada instante, qué sección
 * suena, qué acorde toca y qué debe hacer cada instrumento.
 */

import { sectionProgressions } from './chordpro.js';
import { planForSection, grooveById } from './drums.js';
import { strumFor } from './guitar.js';

export function extractVideoId(input = '') {
  const url = String(input).trim();
  if (/^[\w-]{11}$/.test(url)) return url;
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = re.exec(url);
    if (m) return m[1];
  }
  return '';
}

let apiPromise = null;
export function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => reject(new Error('No se pudo cargar el reproductor de YouTube (¿hay internet?)'));
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export class YouTubeSync {
  constructor() {
    this.player = null;
    this.tickHandle = null;
    this.listeners = new Set();
    this.ready = false;
  }

  async mount(elementId, videoId) {
    const YT = await loadYouTubeApi();
    if (this.player) {
      this.player.loadVideoById(videoId);
      return this.player;
    }
    return new Promise((resolve) => {
      this.player = new YT.Player(elementId, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => { this.ready = true; this._startTicking(); resolve(this.player); },
          onStateChange: () => this._emit(),
        },
      });
    });
  }

  _startTicking() {
    clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => this._emit(), 120);
  }

  _emit() {
    if (!this.ready) return;
    const t = this.currentTime();
    for (const fn of this.listeners) fn(t, this);
  }

  onTick(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  currentTime() { try { return this.player?.getCurrentTime?.() || 0; } catch { return 0; } }
  duration() { try { return this.player?.getDuration?.() || 0; } catch { return 0; } }
  seek(seconds) { this.player?.seekTo?.(Math.max(0, seconds), true); }
  play() { this.player?.playVideo?.(); }
  pause() { this.player?.pauseVideo?.(); }
  setRate(rate) { try { this.player?.setPlaybackRate?.(rate); } catch { /* no soportado */ } }
  isPlaying() { try { return this.player?.getPlayerState?.() === 1; } catch { return false; } }
  destroy() { clearInterval(this.tickHandle); this.listeners.clear(); this.player?.destroy?.(); this.player = null; }
}

/**
 * Construye la línea de tiempo de la canción.
 * Prioriza las marcas manuales; si no hay, calcula desde BPM + compases.
 */
export function buildTimeline(song) {
  const progressions = sectionProgressions(song.body || '');
  const marks = (song.timeline || []).slice().sort((a, b) => a.t - b.t);
  if (marks.length) {
    return marks.map((mark, i) => {
      const next = marks[i + 1];
      const prog = progressions.find((p) => p.name.toLowerCase() === String(mark.name).toLowerCase());
      return {
        name: mark.name,
        start: mark.t,
        end: next ? next.t : (song.durationSec || mark.t + 30),
        chords: prog?.chords || [],
        note: mark.note || '',
      };
    });
  }
  const bpm = song.bpm || 0;
  if (!bpm || !progressions.length) return [];
  const beatsPerBar = Number(String(song.timeSignature || '4/4').split('/')[0]) || 4;
  let t = song.introOffsetSec || 0;
  return progressions.map((p) => {
    const bars = Math.max(2, Math.round(p.chords.length / 2) * 2 || 4);
    const dur = (bars * beatsPerBar * 60) / bpm;
    const seg = { name: p.name, start: t, end: t + dur, chords: p.chords, note: 'calculado desde BPM' };
    t += dur;
    return seg;
  });
}

/** Qué está sonando ahora y qué debe hacer cada instrumento. */
export function cueAt(song, seconds) {
  const timeline = buildTimeline(song);
  if (!timeline.length) return null;
  const idx = timeline.findIndex((s) => seconds >= s.start && seconds < s.end);
  const i = idx === -1 ? (seconds < timeline[0].start ? -1 : timeline.length - 1) : idx;
  if (i === -1) {
    return {
      section: { name: 'Antes de empezar', start: 0, end: timeline[0].start, chords: [] },
      next: timeline[0], chord: null, nextChord: timeline[0].chords[0] || null,
      progress: 0, countdown: timeline[0].start - seconds,
      guitar: 'Prepárate: posición del primer acorde y respira.',
      piano: 'Manos listas sobre el primer acorde.',
      drums: 'Cuenta la entrada en voz baja: 1 – 2 – 3 – 4.',
    };
  }
  const section = timeline[i];
  const next = timeline[i + 1] || null;
  const span = Math.max(0.001, section.end - section.start);
  const progress = Math.min(1, Math.max(0, (seconds - section.start) / span));
  const chords = section.chords.length ? section.chords : [];
  const chordIdx = chords.length ? Math.min(chords.length - 1, Math.floor(progress * chords.length)) : -1;
  const chord = chordIdx >= 0 ? chords[chordIdx] : null;
  const nextChord = chordIdx >= 0 ? (chords[chordIdx + 1] || next?.chords?.[0] || null) : null;

  const plan = planForSection(section.name);
  const groove = grooveById(plan.groove);
  const strum = strumFor(sectionFeel(section.name, song.feel));

  return {
    section, next, chord, nextChord, progress,
    countdown: section.end - seconds,
    intensity: plan.intensity,
    guitar: `${strum.name}. ${strum.tip}`,
    piano: pianoCue(section.name),
    drums: `${groove.name}. ${groove.how}`,
    grooveId: plan.groove,
    strumId: strum.id,
  };
}

function sectionFeel(name = '', fallback = 'balada') {
  if (/intro|verso\s*1|estrofa\s*1|final|outro/i.test(name)) return 'suave';
  if (/coro|estribillo/i.test(name)) return 'rock';
  if (/puente|bridge/i.test(name)) return 'ambiental';
  return fallback;
}

function pianoCue(name = '') {
  if (/intro/i.test(name)) return 'Presenta el tema o sostén un acorde 1-5-9. No adornes de más antes de que entre la voz.';
  if (/verso\s*1|estrofa\s*1/i.test(name)) return 'Inversiones cercanas, poco pedal, volumen bajo. La letra manda.';
  if (/verso|estrofa/i.test(name)) return 'Igual que el verso 1 pero añade la mano izquierda en octavas.';
  if (/pre/i.test(name)) return 'Empieza a abrir: acordes más completos y un pequeño crescendo.';
  if (/coro|estribillo/i.test(name)) return 'Acordes plenos, mano derecha arriba para que corte sobre la banda.';
  if (/puente|bridge/i.test(name)) return 'Colchón sostenido (1-5-9) y silencio. Aquí el piano acompaña, no dirige.';
  if (/final|outro|cierre/i.test(name)) return 'Baja el volumen gradualmente y resuelve al acorde de la tonalidad.';
  return 'Acompaña con inversiones cercanas y escucha al cantante.';
}

/** Exporta la línea de tiempo a texto, para pegarla en el chat del equipo. */
export function timelineToText(song) {
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return buildTimeline(song)
    .map((s) => `${fmt(s.start)}  ${s.name}${s.chords.length ? '  |  ' + s.chords.join(' ') : ''}`)
    .join('\n');
}
