/**
 * historial.js — Qué se cantó, cuándo y cada cuánto.
 * Todo sale de las listas de servicio marcadas como realizadas.
 */

const DIA = 86400000;

const fecha = (s) => {
  const d = new Date(s + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
};

export function diasDesde(iso, hoy = new Date()) {
  const d = fecha(iso);
  if (!d) return null;
  return Math.round((hoy - d) / DIA);
}

/**
 * Historial por canción: cuántas veces, cuándo fue la última y en qué tonalidad.
 * @param {object[]} setlists
 * @param {object[]} songs
 */
export function historialPorCancion(setlists = [], songs = [], hoy = new Date()) {
  const porId = new Map(songs.map((s) => [s.id, s]));
  const datos = new Map();
  const servicios = setlists
    .filter((sl) => sl.date && (sl.realizado ?? fecha(sl.date) <= hoy))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  for (const sl of servicios) {
    for (const item of sl.songs || []) {
      const song = porId.get(item.songId);
      if (!song) continue;
      const entrada = datos.get(item.songId) || {
        song, veces: 0, fechas: [], tonalidades: new Map(), ultima: null,
      };
      entrada.veces++;
      entrada.fechas.push(sl.date);
      const key = item.key || song.key;
      entrada.tonalidades.set(key, (entrada.tonalidades.get(key) || 0) + 1);
      if (!entrada.ultima || sl.date > entrada.ultima) entrada.ultima = sl.date;
      datos.set(item.songId, entrada);
    }
  }

  const lista = [...datos.values()].map((e) => {
    const fechasOrdenadas = [...e.fechas].sort().reverse();
    // Domingos seguidos: fechas separadas entre 5 y 9 días
    let seguidas = 1;
    for (let i = 1; i < fechasOrdenadas.length; i++) {
      const dif = Math.abs((fecha(fechasOrdenadas[i - 1]) - fecha(fechasOrdenadas[i])) / DIA);
      if (dif >= 5 && dif <= 9) seguidas++;
      else break;
    }
    return {
      song: e.song,
      veces: e.veces,
      ultima: e.ultima,
      dias: diasDesde(e.ultima, hoy),
      seguidas,
      tonalidadMasUsada: [...e.tonalidades.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || e.song.key,
      tonalidades: Object.fromEntries(e.tonalidades),
    };
  });

  // Canciones del repertorio que nunca se han cantado
  const nunca = songs.filter((s) => !datos.has(s.id)).map((song) => ({
    song, veces: 0, ultima: null, dias: null, seguidas: 0, tonalidadMasUsada: song.key, tonalidades: {},
  }));

  return { cantadas: lista.sort((a, b) => (a.ultima < b.ultima ? 1 : -1)), nunca, servicios: servicios.length };
}

/** Avisos accionables para el que arma el repertorio. */
export function sugerencias(historial, { descanso = 120, repeticionMaxima = 4, olvido = 90 } = {}) {
  const avisos = [];
  for (const e of historial.cantadas) {
    if (e.seguidas >= repeticionMaxima) {
      avisos.push({
        tipo: 'repetida', cancion: e.song,
        texto: `"${e.song.title}" lleva ${e.seguidas} servicios seguidos. Ya la aprendieron: descánsala un par de semanas.`,
      });
    }
    if (e.dias != null && e.dias >= olvido && e.dias < descanso * 3) {
      avisos.push({
        tipo: 'olvidada', cancion: e.song,
        texto: `Hace ${e.dias} días que no cantan "${e.song.title}". Si les gustaba, vuelve a ponerla.`,
      });
    }
  }
  for (const e of historial.nunca) {
    if (!/plantilla/i.test(e.song.title)) {
      avisos.push({
        tipo: 'sin-estrenar', cancion: e.song,
        texto: `"${e.song.title}" está en el repertorio pero nunca se ha usado en un servicio.`,
      });
    }
  }
  return avisos;
}

/** Resumen general para la pantalla de historial. */
export function resumen(setlists = [], songs = [], hoy = new Date()) {
  const h = historialPorCancion(setlists, songs, hoy);
  const tonalidades = new Map();
  let totalCanciones = 0;
  for (const e of h.cantadas) {
    totalCanciones += e.veces;
    for (const [k, n] of Object.entries(e.tonalidades)) tonalidades.set(k, (tonalidades.get(k) || 0) + n);
  }
  const ultimos90 = h.cantadas.filter((e) => e.dias != null && e.dias <= 90);
  return {
    servicios: h.servicios,
    cancionesDistintas: h.cantadas.length,
    cancionesTotales: totalCanciones,
    promedioPorServicio: h.servicios ? Number((totalCanciones / h.servicios).toFixed(1)) : 0,
    repertorioActivo: ultimos90.length,
    sinUsar: h.nunca.length,
    tonalidades: [...tonalidades.entries()].sort((a, b) => b[1] - a[1]),
    masCantadas: [...h.cantadas].sort((a, b) => b.veces - a.veces).slice(0, 10),
    hacenFalta: [...h.cantadas].filter((e) => e.dias >= 60).sort((a, b) => b.dias - a.dias).slice(0, 10),
  };
}
