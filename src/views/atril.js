/**
 * atril.js — Modo atril: la pantalla que de verdad se usa el domingo.
 * Letra grande, sin menús, la pantalla no se apaga, auto-scroll atado al BPM,
 * avance con pedal o teclado y proyección para la congregación.
 */

import { el, button, toast, chip } from '../ui.js';
import { store } from '../store.js';
import { renderSheet, semitonesFor } from './sheet.js';
import { parseSong } from '../chordpro.js';
import { keyInfo, transposeChord, keyPrefersFlats, preferredKeyName, noteToPc, formatTime } from '../music.js';
import { Metronome } from '../metronome.js';

const CANAL = 'alabanza-proyeccion';

export function atrilView(root, { navigate, params }) {
  const setlist = params.setlistId ? store.setlist(params.setlistId) : null;
  const canciones = setlist
    ? setlist.songs.map((item) => ({ song: store.song(item.songId), key: item.key, notas: item.notes }))
        .filter((x) => x.song)
    : [{ song: store.song(params.id), key: null, notas: '' }].filter((x) => x.song);

  if (!canciones.length) {
    root.replaceChildren(el('p', {}, 'No hay canciones para el atril. '), button('Volver', () => navigate('/')));
    return;
  }

  let indice = 0;
  let displayKey = canciones[0].key || canciones[0].song.key;
  let tamano = store.state.settings.atrilTamano || 22;
  let columnas = store.state.settings.atrilColumnas || 1;
  let velocidad = 0;
  let raf = null;
  let wakeLock = null;
  let seccionActual = 0;
  let canal = null;
  const metro = new Metronome({ bpm: canciones[0].song.bpm || 80 });

  try { canal = new BroadcastChannel(CANAL); } catch { canal = null; }

  const cancion = () => canciones[indice].song;

  // --- Pantalla encendida ---
  const mantenerEncendida = async () => {
    try {
      wakeLock = await navigator.wakeLock?.request('screen');
    } catch { /* el navegador no lo permite; no es crítico */ }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !wakeLock) mantenerEncendida();
  });

  // --- Proyección ---
  /**
   * Secciones de la canción. Se usan tanto para avanzar con el pedal como para
   * resaltar en pantalla y proyectar, así que tiene que ser una sola lista:
   * se conserva el índice real de cada sección dentro de la hoja.
   */
  const seccionesDeCancion = () => parseSong(cancion().body || '')
    .map((sec, indiceEnHoja) => ({ ...sec, indiceEnHoja }))
    .filter((sec) => sec.name || sec.lines.some((l) => l.segments?.length));

  const enviarProyeccion = (negro = null) => {
    if (!canal) return;
    const secciones = seccionesDeCancion();
    const sec = secciones[seccionActual];
    const lineas = sec
      ? sec.lines.filter((l) => l.type === 'lyric' || l.type === 'text')
          .map((l) => (l.segments || []).map((s) => s.text).join('').trim())
          .filter((t, i, arr) => t || arr[i - 1])
      : [];
    canal.postMessage({
      tipo: 'letra',
      titulo: cancion().title,
      seccion: sec?.name || '',
      lineas,
      ...(negro != null ? { negro } : {}),
    });
  };

  if (canal) {
    canal.onmessage = (e) => { if (e.data?.tipo === 'hola') enviarProyeccion(); };
  }

  // --- Auto-scroll ---
  const parar = () => { cancelAnimationFrame(raf); raf = null; };
  const arrancar = () => {
    parar();
    if (!velocidad) return;
    let ultimo = performance.now();
    const paso = (ahora) => {
      const dt = (ahora - ultimo) / 1000; ultimo = ahora;
      hoja.scrollTop += velocidad * 22 * dt;
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  };

  /** Velocidad que hace que la canción entera dure lo que dura de verdad. */
  const velocidadPorBpm = () => {
    const song = cancion();
    const duracion = song.durationSec || (song.bpm ? (parseSong(song.body).length * 8 * 4 * 60) / song.bpm : 0);
    if (!duracion) return 2;
    const alto = hoja.scrollHeight - hoja.clientHeight;
    if (alto <= 0) return 0;
    return Math.max(0.2, Math.min(9, alto / duracion / 22));
  };

  // --- Navegación ---
  const irA = (n) => {
    indice = Math.max(0, Math.min(canciones.length - 1, n));
    displayKey = canciones[indice].key || canciones[indice].song.key;
    seccionActual = 0;
    metro.setBpm(cancion().bpm || 80);
    velocidad = 0; parar();
    pintar();
    hoja.scrollTop = 0;
    enviarProyeccion();
  };

  /** Resalta en la hoja la sección por la que va el equipo. */
  const marcarSeccion = () => {
    const secciones = seccionesDeCancion();
    const indice = secciones[seccionActual]?.indiceEnHoja ?? -1;
    hoja.querySelectorAll('.sheet-section').forEach((n, i) => n.classList.toggle('active', i === indice));
  };

  const siguienteSeccion = (delta) => {
    const secciones = seccionesDeCancion();
    const nuevo = seccionActual + delta;
    if (nuevo < 0) { if (indice > 0) irA(indice - 1); return; }
    if (nuevo >= secciones.length) { if (indice < canciones.length - 1) irA(indice + 1); return; }
    seccionActual = nuevo;
    enviarProyeccion();
    const nodo = hoja.querySelectorAll('.sheet-section')[secciones[seccionActual]?.indiceEnHoja ?? 0];
    nodo?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    marcarSeccion();
    pintarBarra();
  };

  // --- Teclado y pedales (los page-turner mandan teclas) ---
  const teclado = (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'd' || k === ' ') { e.preventDefault(); siguienteSeccion(1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'a') { e.preventDefault(); siguienteSeccion(-1); }
    else if (k === 'ArrowDown') { hoja.scrollTop += 80; }
    else if (k === 'ArrowUp') { hoja.scrollTop -= 80; }
    else if (k === 'n') irA(indice + 1);
    else if (k === 'p') irA(indice - 1);
    else if (k === 's') { velocidad = velocidad ? 0 : velocidadPorBpm(); arrancar(); pintarBarra(); }
    else if (k === 'm') { metro.toggle(); pintarBarra(); }
    else if (k === 'b') { enviarProyeccion(true); toast('Proyección en negro'); }
    else if (k === 'v') { enviarProyeccion(false); }
    else if (k === '+') { tamano = Math.min(46, tamano + 2); store.setSetting('atrilTamano', tamano); pintar(); }
    else if (k === '-') { tamano = Math.max(14, tamano - 2); store.setSetting('atrilTamano', tamano); pintar(); }
    else if (k === 'Escape') salir();
  };

  const salir = () => {
    navigate(setlist ? '/listas' : `/cancion/${cancion().id}`);
  };

  // --- Pintado ---
  const barra = el('div', { class: 'atril-barra' });
  const hoja = el('div', { class: 'atril-hoja' });

  const pintarBarra = () => {
    const song = cancion();
    const semis = semitonesFor(song, displayKey);
    const secciones = seccionesDeCancion();
    barra.replaceChildren(
      el('div', { class: 'atril-info' },
        el('strong', {}, song.title),
        chip(`${displayKey}${semis ? ' (transpuesta)' : ''}`, { class: 'key' }),
        chip(`${song.bpm || '?'} BPM`),
        song.capo ? chip(`Capo ${song.capo}`) : null,
        canciones.length > 1 ? chip(`${indice + 1} de ${canciones.length}`) : null,
        secciones[seccionActual] ? chip(secciones[seccionActual].name || 'Sección') : null),
      el('div', { class: 'atril-controles' },
        button('−', () => { displayKey = transponer(-1); pintar(); }, { title: 'Bajar medio tono' }),
        button('+', () => { displayKey = transponer(1); pintar(); }, { title: 'Subir medio tono' }),
        button('A−', () => { tamano = Math.max(14, tamano - 2); store.setSetting('atrilTamano', tamano); pintar(); }),
        button('A+', () => { tamano = Math.min(46, tamano + 2); store.setSetting('atrilTamano', tamano); pintar(); }),
        button(columnas === 1 ? '▥ 2 columnas' : '▤ 1 columna', () => {
          columnas = columnas === 1 ? 2 : 1;
          store.setSetting('atrilColumnas', columnas);
          pintar();
        }),
        button(velocidad ? '⏸ Scroll' : '▶ Scroll', () => {
          velocidad = velocidad ? 0 : velocidadPorBpm();
          arrancar(); pintarBarra();
        }, { variant: velocidad ? 'ok' : '' }),
        button(metro.running ? '⏹ Clic' : '♩ Clic', () => { metro.toggle(); pintarBarra(); }, { variant: metro.running ? 'ok' : '' }),
        button('📺 Proyectar', () => {
          const win = window.open('proyeccion.html', 'proyeccion-alabanza', 'width=1280,height=720');
          if (!win) return toast('El navegador bloqueó la ventana: permite ventanas emergentes', 'warn');
          setTimeout(() => enviarProyeccion(false), 800);
        }),
        canciones.length > 1 ? button('◀', () => irA(indice - 1), { title: 'Canción anterior' }) : null,
        canciones.length > 1 ? button('▶', () => irA(indice + 1), { title: 'Canción siguiente' }) : null,
        button('✕ Salir', salir, { variant: 'ghost' })));
  };

  const transponer = (n) => {
    const info = keyInfo(displayKey);
    return preferredKeyName((noteToPc(info.tonic) || 0) + n, info.minor);
  };

  const pintar = () => {
    const song = cancion();
    const semis = semitonesFor(song, displayKey);
    hoja.style.fontSize = `${tamano}px`;
    hoja.classList.toggle('dos-columnas', columnas === 2);
    hoja.replaceChildren(
      renderSheet(song, { semitones: semis, notation: store.state.settings.notation, key: displayKey }),
      canciones[indice].notas
        ? el('p', { class: 'atril-nota' }, '✎ ' + canciones[indice].notas)
        : null,
      song.notes ? el('p', { class: 'atril-nota muted' }, song.notes) : null);
    marcarSeccion();
    pintarBarra();
  };

  root.replaceChildren(el('div', { class: 'atril' }, barra, hoja,
    el('p', { class: 'atril-ayuda muted small' },
      'Pedal o teclado: → siguiente sección · ← anterior · N/P canción · S scroll · M clic · B negro en proyección · +/− tamaño · Esc salir')));

  document.body.classList.add('modo-atril');
  document.addEventListener('keydown', teclado);
  mantenerEncendida();
  pintar();
  enviarProyeccion(false);

  return () => {
    document.body.classList.remove('modo-atril');
    document.removeEventListener('keydown', teclado);
    parar();
    metro.stop();
    wakeLock?.release?.().catch(() => {});
    canal?.close?.();
  };
}
