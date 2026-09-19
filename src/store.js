/**
 * store.js — Estado de la app guardado en el navegador (localStorage).
 * No hay servidor: tus canciones son tuyas y viven en tu dispositivo.
 * Usa exportar/importar para respaldarlas o compartirlas con el equipo.
 */

import { SEED_SONGS } from './seed.js';

const KEY = 'alabanza.v1';

const DEFAULT_STATE = {
  version: 1,
  songs: [],
  setlists: [],
  practice: {},   // { [songId]: { chordsLearned: [], minutes: 0, lastAt: null } }
  cantantes: [],  // { id, nombre, min, max, comoda:[min,max], tipo, notas }
  anotaciones: {},// { [songId]: { [perfil]: trazos[] } }  marcas a mano sobre la hoja
  ideasDone: [],  // números de ideas marcadas
  settings: {
    instrument: 'guitarra',
    notation: 'americana',  // 'americana' | 'latina' | 'nashville'
    fontSize: 16,
    theme: 'dark',
  },
};

function uid() {
  return 'id-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

class Store {
  constructor() {
    this.state = this.load();
    this.listeners = new Set();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...structuredClone(DEFAULT_STATE), songs: structuredClone(SEED_SONGS) };
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) } };
    } catch (err) {
      console.warn('No se pudo leer el almacenamiento, empezando limpio', err);
      return { ...structuredClone(DEFAULT_STATE), songs: structuredClone(SEED_SONGS) };
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch (err) {
      console.warn('No se pudo guardar (¿almacenamiento lleno o modo privado?)', err);
    }
    this.listeners.forEach((fn) => fn(this.state));
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  // --- Canciones ---
  get songs() { return this.state.songs; }

  song(id) { return this.state.songs.find((s) => s.id === id) || null; }

  newSong(partial = {}) {
    const song = {
      id: uid(),
      title: 'Canción nueva',
      author: '',
      key: 'G',
      originalKey: '',
      capo: 0,
      bpm: 80,
      timeSignature: '4/4',
      feel: 'balada',
      tags: [],
      youtubeId: '',
      ccli: '',
      durationSec: 0,
      body: '{Intro}\n| [G] | [D] | [Em7] | [C] |\n\n{Verso 1}\n[G]Escribe aquí tu letra con los [D]acordes entre corchetes\n\n{Coro}\n[Em7]El acorde suena justo en esa [C]sílaba\n',
      notes: '',
      instrumentNotes: { guitarra: '', piano: '', bateria: '', bajo: '', voz: '' },
      timeline: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...partial,
    };
    this.state.songs.unshift(song);
    this.save();
    return song;
  }

  updateSong(id, patch) {
    const song = this.song(id);
    if (!song) return null;
    Object.assign(song, patch, { updatedAt: Date.now() });
    this.save();
    return song;
  }

  deleteSong(id) {
    this.state.songs = this.state.songs.filter((s) => s.id !== id);
    this.state.setlists.forEach((sl) => { sl.songs = sl.songs.filter((x) => x.songId !== id); });
    this.save();
  }

  duplicateSong(id, patch = {}) {
    const song = this.song(id);
    if (!song) return null;
    const copy = structuredClone(song);
    copy.id = uid();
    copy.title = song.title + ' (copia)';
    copy.createdAt = copy.updatedAt = Date.now();
    Object.assign(copy, patch);
    this.state.songs.unshift(copy);
    this.save();
    return copy;
  }

  // --- Listas de servicio ---
  newSetlist(partial = {}) {
    const setlist = {
      id: uid(),
      name: 'Servicio ' + new Date().toLocaleDateString('es'),
      date: new Date().toISOString().slice(0, 10),
      notes: '',
      songs: [],   // [{ songId, key, notes }]
      createdAt: Date.now(),
      ...partial,
    };
    this.state.setlists.unshift(setlist);
    this.save();
    return setlist;
  }

  setlist(id) { return this.state.setlists.find((s) => s.id === id) || null; }

  updateSetlist(id, patch) {
    const sl = this.setlist(id);
    if (!sl) return null;
    Object.assign(sl, patch);
    this.save();
    return sl;
  }

  deleteSetlist(id) {
    this.state.setlists = this.state.setlists.filter((s) => s.id !== id);
    this.save();
  }

  // --- Práctica y progreso ---
  practiceFor(songId) {
    return this.state.practice[songId] || { chordsLearned: [], minutes: 0, lastAt: null };
  }

  toggleChordLearned(songId, chord) {
    const p = this.practiceFor(songId);
    const set = new Set(p.chordsLearned);
    set.has(chord) ? set.delete(chord) : set.add(chord);
    this.state.practice[songId] = { ...p, chordsLearned: [...set], lastAt: Date.now() };
    this.save();
  }

  addPracticeMinutes(songId, minutes) {
    const p = this.practiceFor(songId);
    this.state.practice[songId] = { ...p, minutes: p.minutes + minutes, lastAt: Date.now() };
    this.save();
  }

  // --- Anotaciones a mano sobre la hoja ---
  anotacionesDe(songId, perfil = 'Mis notas') {
    return this.state.anotaciones?.[songId]?.[perfil] || [];
  }

  guardarAnotaciones(songId, perfil, trazos) {
    if (!this.state.anotaciones) this.state.anotaciones = {};
    if (!this.state.anotaciones[songId]) this.state.anotaciones[songId] = {};
    if (trazos.length) this.state.anotaciones[songId][perfil] = trazos;
    else delete this.state.anotaciones[songId][perfil];
    if (!Object.keys(this.state.anotaciones[songId]).length) delete this.state.anotaciones[songId];
    this.save();
  }

  /** Perfiles con marcas: cada músico tiene las suyas sobre la misma canción. */
  perfilesDeAnotaciones(songId = null) {
    const nombres = new Set(['Mis notas']);
    const fuentes = songId
      ? [this.state.anotaciones?.[songId] || {}]
      : Object.values(this.state.anotaciones || {});
    for (const porPerfil of fuentes) for (const nombre of Object.keys(porPerfil)) nombres.add(nombre);
    return [...nombres];
  }

  borrarAnotaciones(songId, perfil) {
    if (!this.state.anotaciones?.[songId]) return;
    delete this.state.anotaciones[songId][perfil];
    if (!Object.keys(this.state.anotaciones[songId]).length) delete this.state.anotaciones[songId];
    this.save();
  }

  // --- Cantantes (módulo de canto) ---
  get cantantes() { return this.state.cantantes; }

  cantante(id) { return this.state.cantantes.find((c) => c.id === id) || null; }

  guardarCantante(datos) {
    const existente = datos.id ? this.cantante(datos.id) : null;
    if (existente) {
      Object.assign(existente, datos);
      this.save();
      return existente;
    }
    const nuevo = { id: uid(), nombre: 'Sin nombre', min: null, max: null, comoda: null, tipo: null, notas: '', ...datos };
    this.state.cantantes.push(nuevo);
    this.save();
    return nuevo;
  }

  borrarCantante(id) {
    this.state.cantantes = this.state.cantantes.filter((c) => c.id !== id);
    this.save();
  }

  toggleIdea(n) {
    const set = new Set(this.state.ideasDone);
    set.has(n) ? set.delete(n) : set.add(n);
    this.state.ideasDone = [...set];
    this.save();
  }

  setSetting(key, value) {
    this.state.settings[key] = value;
    this.save();
  }

  // --- Respaldo ---
  exportJSON() {
    return JSON.stringify({ ...this.state, exportedAt: new Date().toISOString() }, null, 2);
  }

  importJSON(text, { merge = true } = {}) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.songs)) throw new Error('El archivo no tiene canciones válidas.');
    if (merge) {
      const byId = new Map(this.state.songs.map((s) => [s.id, s]));
      for (const song of data.songs) byId.set(song.id || uid(), song);
      this.state.songs = [...byId.values()];
      this.state.setlists = [...(data.setlists || []), ...this.state.setlists];
    } else {
      this.state = { ...structuredClone(DEFAULT_STATE), ...data };
    }
    this.save();
    return this.state.songs.length;
  }

  resetToSeed() {
    this.state = { ...structuredClone(DEFAULT_STATE), songs: structuredClone(SEED_SONGS) };
    this.save();
  }
}

export const store = new Store();
export { uid };
