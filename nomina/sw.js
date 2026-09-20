/**
 * sw.js — Para que la nómina se pueda liquidar sin internet.
 * Estrategia: red primero y, si no hay, lo que esté guardado.
 */

const CACHE = 'nomina-co-v1';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/estilos.css',
  './src/app.js',
  './src/ui.js',
  './src/store.js',
  './src/fechas.js',
  './src/festivos.js',
  './src/normativa.js',
  './src/calculo.js',
  './src/seguridad.js',
  './src/retencion.js',
  './src/prestaciones.js',
  './src/nomina.js',
  './src/liquidacion.js',
  './src/vigilancia.js',
  './src/views/panel.js',
  './src/views/empleados.js',
  './src/views/registro.js',
  './src/views/nomina.js',
  './src/views/liquidacion.js',
  './src/views/calendario.js',
  './src/views/normativa.js',
  './src/views/vigilancia.js',
  './src/views/ajustes.js',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((llaves) => Promise.all(llaves.filter((l) => l !== CACHE).map((l) => caches.delete(l))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return; // las consultas de noticias van directo a la red

  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((cache) => cache.put(peticion, copia)).catch(() => {});
        return respuesta;
      })
      .catch(() => caches.match(peticion).then((guardada) => guardada || caches.match('./index.html'))),
  );
});
