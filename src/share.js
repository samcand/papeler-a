/**
 * share.js — Compartir el set con el equipo sin servidor ni cuentas.
 *
 * Empaqueta las canciones en un enlace comprimido; quien lo abre (o escanea el
 * QR) las importa en su dispositivo. Todo viaja dentro del propio enlace: no
 * hay nada guardado en ningún servidor.
 */

const b64url = {
  codificar(bytes) {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decodificar(texto) {
    const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  },
};

async function comprimir(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream === 'undefined') return { bytes, comprimido: false };
  const cs = new CompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(cs);
  const comprimidos = new Uint8Array(await new Response(stream).arrayBuffer());
  return { bytes: comprimidos, comprimido: true };
}

async function descomprimir(bytes, comprimido) {
  if (!comprimido) return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

/** Quita de la canción lo que no hace falta para tocarla (ahorra espacio). */
function aligerar(song, { conLetra = true } = {}) {
  const base = {
    t: song.title, a: song.author, k: song.key, b: song.bpm,
    c: song.timeSignature, f: song.feel, p: song.capo || 0,
  };
  if (conLetra) base.l = song.body;
  if (song.youtubeId) base.y = song.youtubeId;
  if (song.tags?.length) base.g = song.tags;
  if (song.notes) base.n = song.notes;
  if (song.timeline?.length) base.m = song.timeline.map((x) => [Number(x.t.toFixed(1)), x.name]);
  if (song.instrumentNotes && Object.values(song.instrumentNotes).some(Boolean)) base.i = song.instrumentNotes;
  return base;
}

function restaurar(ligera) {
  return {
    title: ligera.t || 'Sin título',
    author: ligera.a || '',
    key: ligera.k || 'C',
    bpm: ligera.b || 80,
    timeSignature: ligera.c || '4/4',
    feel: ligera.f || 'balada',
    capo: ligera.p || 0,
    body: ligera.l || '',
    youtubeId: ligera.y || '',
    tags: ligera.g || [],
    notes: ligera.n || '',
    timeline: (ligera.m || []).map(([t, name]) => ({ t, name })),
    instrumentNotes: ligera.i || { guitarra: '', piano: '', bateria: '', bajo: '', voz: '' },
  };
}

/**
 * Crea el código para compartir.
 * @param {object} setlist  lista de servicio (o null para compartir canciones sueltas)
 * @param {object[]} songs  canciones completas
 */
export async function crearCodigo(setlist, songs, { conLetra = true } = {}) {
  const paquete = {
    v: 1,
    s: setlist ? { n: setlist.name, d: setlist.date, o: setlist.notes || '' } : null,
    c: songs.map((song) => aligerar(song, { conLetra })),
    k: setlist ? setlist.songs.map((x) => x.key || null) : null,
  };
  const { bytes, comprimido } = await comprimir(JSON.stringify(paquete));
  return (comprimido ? 'z' : 'p') + b64url.codificar(bytes);
}

export async function leerCodigo(codigo) {
  const marca = codigo[0];
  const bytes = b64url.decodificar(codigo.slice(1));
  const texto = await descomprimir(bytes, marca === 'z');
  const paquete = JSON.parse(texto);
  if (!paquete || !Array.isArray(paquete.c)) throw new Error('El código no contiene canciones.');
  return {
    setlist: paquete.s ? { name: paquete.s.n, date: paquete.s.d, notes: paquete.s.o } : null,
    songs: paquete.c.map(restaurar),
    tonalidades: paquete.k || [],
  };
}

/** Enlace completo listo para mandar por WhatsApp. */
export function crearEnlace(codigo, base = null) {
  const raiz = base || (typeof location !== 'undefined'
    ? location.origin + location.pathname
    : 'https://tu-servidor/alabanza/');
  return `${raiz}#/importar?d=${codigo}`;
}

/** Tamaño del enlace y si conviene mostrar QR (escanear algo enorme no funciona). */
export function evaluarEnlace(enlace) {
  const largo = enlace.length;
  return {
    largo,
    cabeEnQR: largo <= 1800,
    comodoEnQR: largo <= 900,
    consejo: largo <= 900
      ? 'El QR se escanea sin problema desde cualquier celular.'
      : largo <= 1800
        ? 'El QR queda denso: muéstralo en pantalla grande o manda el enlace por chat.'
        : 'Demasiado largo para un QR cómodo: comparte el enlace, o comparte la lista sin letras.',
  };
}
