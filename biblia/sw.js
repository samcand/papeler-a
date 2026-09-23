/**
 * sw.js — Service worker: la app queda instalada y funciona sin internet.
 * La interfaz se guarda al instalar; el texto bíblico se guarda la primera
 * vez que se abre cada libro (o todo de una vez al hacer una búsqueda).
 */

const VERSION = 'estudio-biblico-v6';
const DATOS = 'estudio-biblico-datos-v1';
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './assets/estilos.css', './assets/icono.svg',
  './datos/indice.json',
  './src/app.js', './src/ui.js', './src/almacen.js', './src/libros.js', './src/referencias.js',
  './src/texto.js', './src/marcas.js', './src/notas.js', './src/busqueda.js', './src/plan.js',
  './src/claves.js', './src/devocionales.js', './src/biblioteca.js', './src/estante.js', './src/zip.js', './src/sermones.js', './src/morfologia.js', './src/concordancia.js', './src/conectores.js',
  './biblioteca/indice.json',
  './src/vistas/lector.js', './src/vistas/buscar.js', './src/vistas/palabra.js', './src/vistas/cuaderno.js',
  './src/vistas/plan.js', './src/vistas/ajustes.js', './src/vistas/editor-nota.js',
  './src/vistas/selector.js', './src/vistas/vistazo.js', './src/vistas/editor-clave.js', './src/vistas/familia.js', './src/vistas/biblioteca.js', './src/vistas/sermones.js', './src/vistas/original.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(ARCHIVOS.map((url) => cache.add(url).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n !== VERSION && n !== DATOS).map((n) => caches.delete(n)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // El texto bíblico no cambia: primero la caché
  if (url.pathname.includes('/datos/') && !url.pathname.endsWith('indice.json')) {
    e.respondWith((async () => {
      const cache = await caches.open(DATOS);
      const guardada = await cache.match(e.request);
      if (guardada) return guardada;
      const r = await fetch(e.request);
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    })());
    return;
  }

  // La app: primero la red (para recibir mejoras), la caché si no hay conexión
  e.respondWith((async () => {
    try {
      const r = await fetch(e.request);
      if (r.ok) (await caches.open(VERSION)).put(e.request, r.clone());
      return r;
    } catch {
      return (await caches.match(e.request)) || (await caches.match('./index.html'));
    }
  })());
});
