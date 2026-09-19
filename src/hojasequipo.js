/**
 * hojasequipo.js — Una hoja distinta para cada músico, con lo que esa persona
 * necesita y nada más: la voz no necesita diagramas y el baterista no necesita
 * acordes.
 */

import { parseSong, sectionProgressions } from './chordpro.js';
import { toHojaJSON, etiquetaSeccion } from './hoja.js';
import { toNashville, keyInfo } from './music.js';
import { chordShapes } from './guitar.js';
import { planForSection, grooveById, grooveCountIn } from './drums.js';
import { strumFor } from './guitar.js';
import { chordNotes } from './music.js';

export const ROLES = [
  { id: 'completa', nombre: 'Hoja completa (acordes y letra)', detalle: 'El formato del equipo, tal cual.' },
  { id: 'voz', nombre: 'Voces (solo letra)', detalle: 'Letra limpia, sin acordes, con las secciones marcadas.' },
  { id: 'guitarra', nombre: 'Guitarra', detalle: 'Acordes, digitación en números de traste y el rasgueo de cada sección.' },
  { id: 'piano', nombre: 'Piano / teclado', detalle: 'Acordes con sus notas y el papel del piano en cada sección.' },
  { id: 'bajo', nombre: 'Bajo', detalle: 'Fundamentales por sección y la escala de la tonalidad.' },
  { id: 'bateria', nombre: 'Batería', detalle: 'Groove, intensidad y aviso de cada sección. Sin acordes.' },
  { id: 'nashville', nombre: 'Números (Nashville)', detalle: 'Toda la hoja en grados: sirve en cualquier tonalidad.' },
];

const bloque = (etiqueta, lineas) => ({ etiqueta, lineas });

/** Construye la hoja (formato {titulo, tonalidad, autor, bloques}) para un rol. */
export function hojaParaRol(song, rol = 'completa', { tonalidad = null } = {}) {
  const key = tonalidad || song.key;
  if (rol === 'completa') return toHojaJSON(song, { tonalidad: key });

  if (rol === 'nashville') {
    const doc = toHojaJSON(song, { tonalidad: key });
    doc.bloques = doc.bloques.map((b) => ({
      ...b,
      lineas: b.lineas?.map((l) => ({
        ...l,
        acordes: l.acordes ? l.acordes.replace(/\S+/g, (t) => toNashville(t, key)) : l.acordes,
      })),
    }));
    doc.titulo = doc.titulo + ' — NÚMEROS';
    return doc;
  }

  if (rol === 'voz') {
    const bloques = parseSong(song.body || '').map((sec) => {
      const lineas = sec.lines
        .filter((l) => l.type === 'lyric' || l.type === 'text')
        .map((l) => ({ letra: (l.segments || []).map((s) => s.text).join('').trimEnd() }))
        .filter((l) => l.letra.trim());
      return lineas.length ? bloque(etiquetaSeccion(sec.name || 'SECCIÓN'), lineas) : null;
    }).filter(Boolean);
    return { titulo: song.title.toUpperCase(), tonalidad: key, autor: song.author || '', bloques };
  }

  const progresiones = sectionProgressions(song.body || '');
  const info = keyInfo(key);

  if (rol === 'guitarra') {
    const bloques = progresiones.map((p) => {
      const strum = strumFor(/coro/i.test(p.name) ? 'rock' : /intro|verso 1|final/i.test(p.name) ? 'suave' : song.feel);
      return bloque(etiquetaSeccion(p.name), [
        { acordes: p.chords.join('   '), letra: '' },
        { letra: `Rasgueo: ${strum.pattern.join(' ')}  (${strum.name})` },
      ]);
    });
    const digitaciones = [...new Set(progresiones.flatMap((p) => p.chords))].map((c) => {
      const forma = chordShapes(c)[0];
      return { letra: `${c}: ${forma ? forma.frets.map((f) => (f === -1 ? 'x' : f)).join('-') : '—'}${forma?.barre ? `  (cejilla en ${forma.barre.fret})` : ''}` };
    });
    return {
      titulo: song.title.toUpperCase() + ' — GUITARRA', tonalidad: key, autor: song.author || '',
      bloques: [
        bloque('DIGITACIONES (6ª a 1ª cuerda)', digitaciones),
        ...bloques,
        bloque('NOTAS', [{ letra: song.instrumentNotes?.guitarra || (song.capo ? `Capo ${song.capo}` : 'Sin notas') }]),
      ],
    };
  }

  if (rol === 'piano') {
    const acordes = [...new Set(progresiones.flatMap((p) => p.chords))]
      .map((c) => ({ letra: `${c}:  ${chordNotes(c, /b/.test(key)).join(' – ')}` }));
    return {
      titulo: song.title.toUpperCase() + ' — PIANO', tonalidad: key, autor: song.author || '',
      bloques: [
        bloque('ACORDES Y SUS NOTAS', acordes),
        ...progresiones.map((p) => bloque(etiquetaSeccion(p.name), [
          { acordes: p.chords.join('   '), letra: '' },
          { letra: papelPiano(p.name) },
        ])),
        bloque('NOTAS', [{ letra: song.instrumentNotes?.piano || 'Sin notas' }]),
      ],
    };
  }

  if (rol === 'bajo') {
    return {
      titulo: song.title.toUpperCase() + ' — BAJO', tonalidad: key, autor: song.author || '',
      bloques: [
        bloque('ESCALA DE LA TONALIDAD', [{ letra: info.scale.join('  ') }]),
        ...progresiones.map((p) => bloque(etiquetaSeccion(p.name), [
          { acordes: p.chords.map(fundamental).join('   '), letra: '' },
        ])),
        bloque('NOTAS', [{ letra: song.instrumentNotes?.bajo || 'Fundamentales; sigue el bombo.' }]),
      ],
    };
  }

  if (rol === 'bateria') {
    return {
      titulo: song.title.toUpperCase() + ' — BATERÍA', tonalidad: key, autor: song.author || '',
      bloques: [
        bloque('TEMPO', [{ letra: `${song.bpm || '?'} BPM · compás ${song.timeSignature || '4/4'} · aire ${song.feel || 'balada'}` }]),
        ...progresiones.map((p) => {
          const plan = planForSection(p.name);
          const groove = grooveById(plan.groove);
          return bloque(etiquetaSeccion(p.name), [
            { letra: `${groove.name}  ·  intensidad ${plan.intensity}/5` },
            { letra: groove.how },
            { letra: `Conteo: ${grooveCountIn(groove)}` },
          ]);
        }),
        bloque('NOTAS', [{ letra: song.instrumentNotes?.bateria || 'Sin notas' }]),
      ],
    };
  }

  return toHojaJSON(song, { tonalidad: key });
}

const fundamental = (acorde) => {
  const barra = /\/([A-G][#b]?)/.exec(acorde);
  if (barra) return barra[1];
  return acorde.replace(/(m|maj|sus|add|dim|aug|\d).*$/, '');
};

function papelPiano(nombre = '') {
  if (/intro/i.test(nombre)) return 'Presenta el tema o sostén el acorde.';
  if (/verso\s*1/i.test(nombre)) return 'Inversiones cercanas, volumen bajo.';
  if (/verso/i.test(nombre)) return 'Octavas en la mano izquierda.';
  if (/pre/i.test(nombre)) return 'Crece hacia el coro.';
  if (/coro/i.test(nombre)) return 'Acordes plenos, registro medio-alto.';
  if (/puente/i.test(nombre)) return 'Colchón 1-5-9 sostenido.';
  if (/final|outro/i.test(nombre)) return 'Baja y resuelve en la tónica.';
  return 'Acompaña e escucha al cantante.';
}

/** Todas las hojas del set para un rol (una canción por página). */
export function hojasDeSet(setlist, songs, rol) {
  return setlist.songs
    .map((item) => {
      const song = songs.find((s) => s.id === item.songId);
      if (!song) return null;
      return hojaParaRol(song, rol, { tonalidad: item.key || song.key });
    })
    .filter(Boolean);
}
