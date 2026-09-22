/**
 * sw.js — Service worker: la app queda instalada y funciona sin internet.
 * Los salones de iglesia tienen wifi malo; esto hace que eso deje de importar.
 * Lo único que necesita red es el video de YouTube.
 */

const VERSION = 'alabanza-v4';
const ARCHIVOS = [
  './', './index.html', './proyeccion.html', './manifest.webmanifest',
  './assets/styles.css', './assets/icono.svg',
  './src/app.js', './src/ui.js', './src/store.js', './src/seed.js', './src/ideas.js',
  './src/music.js', './src/chordpro.js', './src/guitar.js', './src/piano.js', './src/drums.js',
  './src/academy.js', './src/metronome.js', './src/analysis.js', './src/youtube.js',
  './src/fretboard.js', './src/dsp.js', './src/afinador.js', './src/transcribe.js',
  './src/audiolab.js', './src/hoja.js', './src/docx.js', './src/zip.js',
  './src/vocal.js', './src/timestretch.js', './src/clicktrack.js', './src/share.js',
  './src/qr.js', './src/qr-tables.js', './src/historial.js', './src/escucha.js',
  './src/hojasequipo.js', './src/proyeccion.js', './src/anotaciones.js',
  './src/calentamiento.js', './src/formatos.js', './src/zipread.js',
  './src/views/library.js', './src/views/song.js', './src/views/sheet.js',
  './src/views/instruments.js', './src/views/sync.js', './src/views/practice.js',
  './src/views/academy.js', './src/views/setlists.js', './src/views/ideas.js',
  './src/views/afinador.js', './src/views/estudio.js', './src/views/atril.js',
  './src/views/canto.js', './src/views/importar.js', './src/views/historial.js',
  './src/views/calentamiento.js', './src/views/lienzo.js', './src/views/importador.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // addAll falla entero si un archivo falla; se guardan uno a uno para ser tolerantes.
    await Promise.all(ARCHIVOS.map((url) => cache.add(url).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // YouTube y cualquier cosa de fuera: directo a la red, sin cachear.
  if (url.origin !== location.origin) return;
  // La app de estudio bíblico (biblia/) tiene su propio service worker.
  if (url.pathname.includes('/biblia/')) return;

  e.respondWith((async () => {
    const cacheado = await caches.match(e.request, { ignoreSearch: true });
    if (cacheado) {
      // Se actualiza por detrás para la próxima vez.
      fetch(e.request).then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
      }).catch(() => {});
      return cacheado;
    }
    try {
      const res = await fetch(e.request);
      if (res.ok) {
        const cache = await caches.open(VERSION);
        cache.put(e.request, res.clone());
      }
      return res;
    } catch {
      const index = await caches.match('./index.html');
      return index || new Response('Sin conexión y sin copia guardada.', { status: 503 });
    }
  })());
});
