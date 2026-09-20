/**
 * sw.js — Service worker: la app queda instalada y funciona sin internet.
 *
 * Estudiar en el bus, en la fila o donde no hay señal es justamente cuando se
 * usa esto. No hay nada que pedirle a la red: el banco de preguntas viaja con
 * la app y el progreso vive en el dispositivo.
 */

const VERSION = 'ingreso-v1';
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest',
  './assets/estilos.css', './assets/icono.svg',
  './src/app.js', './src/ui.js', './src/store.js', './src/motor.js',
  './src/temario.js', './src/figuras.js', './src/componentes.js',
  './src/banco/index.js', './src/banco/matematicas.js', './src/banco/trigonometria.js',
  './src/banco/abstracto.js', './src/banco/geografia.js', './src/banco/ciudadania.js',
  './src/banco/salud.js', './src/banco/fisica.js', './src/banco/quimica.js',
  './src/banco/cotidiana.js', './src/banco/lectura.js',
  './src/banco/ingles.js',
  './src/vistas/inicio.js', './src/vistas/temario.js', './src/vistas/practica.js',
  './src/vistas/simulacro.js', './src/vistas/progreso.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(ARCHIVOS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const guardado = await caches.match(e.request);
    if (guardado) return guardado;
    try {
      const respuesta = await fetch(e.request);
      if (respuesta.ok && new URL(e.request.url).origin === location.origin) {
        const cache = await caches.open(VERSION);
        cache.put(e.request, respuesta.clone());
      }
      return respuesta;
    } catch (error) {
      const inicio = await caches.match('./index.html');
      if (inicio) return inicio;
      throw error;
    }
  })());
});
