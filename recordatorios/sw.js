/**
 * sw.js — Service worker: la app se instala y funciona sin internet.
 * Un recordatorio que solo aparece con cobertura no sirve de mucho.
 */

const VERSION = 'recordatorios-v7';
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest',
  './assets/estilos.css', './assets/icono.svg',
  './src/app.js', './src/store.js', './src/modelo.js', './src/fechas.js',
  './src/recurrencia.js', './src/naturales.js', './src/filtros.js', './src/calendario.js',
  './src/tiempo.js', './src/inversiones.js', './src/proyectos.js',
  './src/calibracion.js', './src/plantillasLista.js', './src/papelera.js', './src/dia.js',
  './src/capacidad.js', './src/salud.js', './src/simulacion.js', './src/esperas.js', './src/autocompletar.js',
  './src/tablero.js', './src/compartir.js', './src/adjuntos.js', '../src/qr.js', '../src/qr-tables.js', './src/plantillas.js', './src/exportar.js',
  './src/notificaciones.js', './src/componentes.js', './src/resumen.js', './src/seed.js', './src/ideas.js',
  './src/captura.js', './src/automatizacion.js', './src/energia.js', './src/ambiente.js',
  './src/trabajo.js', './src/riesgos.js', './src/informes.js', './src/copiloto.js',
  './src/buscador.js', './src/logros.js', './src/anio.js', './src/cronometro.js', './src/limites.js', './src/dependencias.js', './src/cartera.js', './src/notas.js', './src/colecciones.js', './src/objetivos.js', './src/mantenimiento.js',
  './src/gastos.js', './src/personas.js', './src/rutinas.js', './src/viajes.js', './src/panel.js',
  './src/views/hoy.js', './src/views/bandeja.js', './src/views/proximos.js',
  './src/views/tablero.js', './src/views/concentracion.js', './src/views/importar-lista.js', './src/views/calendario.js',
  './src/views/enfoque.js', './src/views/planificar.js', './src/views/lista.js',
  './src/views/inversiones.js', './src/views/proyectos.js', './src/views/docencia.js', './src/views/investigacion.js',
  './src/views/alabanza.js', './src/views/revision.js', './src/views/plantillas.js', './src/views/ideas.js', './src/views/ajustes.js',
  './src/views/copiloto.js', './src/views/informes.js',
  './src/views/panel.js', './src/views/notas.js', './src/views/colecciones.js', './src/views/objetivos.js',
  './src/views/logros.js', './src/views/anio.js', './src/views/gastos.js', './src/views/personas.js', './src/views/rutinas.js', './src/views/viajes.js',
  '../src/ui.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Uno a uno: si un archivo falla, el resto igual queda guardado.
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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cacheado = await caches.match(e.request, { ignoreSearch: true });
    if (cacheado) {
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
