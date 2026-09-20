/**
 * app.js — Arranque y navegación. Las rutas son del tipo #/nomina/{contrato}/{mes}.
 */

import store from './store.js';
import { h, mensaje } from './ui.js';
import { vista as panel } from './views/panel.js';
import { vista as empleados } from './views/empleados.js';
import { vista as registro } from './views/registro.js';
import { vista as nomina } from './views/nomina.js';
import { vista as liquidacion } from './views/liquidacion.js';
import { vista as calendario } from './views/calendario.js';
import { vista as normativa } from './views/normativa.js';
import { vista as vigilancia } from './views/vigilancia.js';
import { vista as ajustes } from './views/ajustes.js';

const RUTAS = [
  { id: 'panel', titulo: 'Panel', icono: '🏠', render: panel },
  { id: 'empleados', titulo: 'Empleados', icono: '👥', render: empleados },
  { id: 'registro', titulo: 'Días', icono: '🗓️', render: registro },
  { id: 'nomina', titulo: 'Nómina', icono: '💵', render: nomina },
  { id: 'liquidacion', titulo: 'Liquidación', icono: '📄', render: liquidacion },
  { id: 'calendario', titulo: 'Calendario', icono: '📅', render: calendario },
  { id: 'normativa', titulo: 'Normativa', icono: '⚖️', render: normativa },
  { id: 'vigilancia', titulo: 'Vigilancia', icono: '📰', render: vigilancia },
  { id: 'ajustes', titulo: 'Ajustes', icono: '⚙️', render: ajustes },
];

function rutaActual() {
  const crudo = window.location.hash.replace(/^#\/?/, '');
  const partes = crudo.split('/').filter(Boolean);
  const id = partes[0] || 'panel';
  const ruta = RUTAS.find((r) => r.id === id) || RUTAS[0];
  const params = {};
  if (ruta.id === 'calendario') params.anio = partes[1];
  else {
    params.id = partes[1];
    params.mes = partes[2];
  }
  return { ruta, params };
}

function pintarNavegacion(activa) {
  const nav = document.getElementById('nav');
  nav.replaceChildren(...RUTAS.map((r) => h('a', {
    href: `#/${r.id}`,
    class: `nav-item ${r.id === activa ? 'activa' : ''}`.trim(),
  }, h('span', { class: 'nav-icono' }, r.icono), h('span', {}, r.titulo))));
}

function pintar() {
  const { ruta, params } = rutaActual();
  const app = document.getElementById('app');
  pintarNavegacion(ruta.id);
  try {
    app.replaceChildren(ruta.render(store, params));
  } catch (error) {
    console.error(error);
    app.replaceChildren(h('div', { class: 'vista' },
      h('p', { class: 'aviso aviso-error' }, `Algo falló al dibujar esta pantalla: ${error.message}`)));
  }
  document.title = `${ruta.titulo} · Nómina Colombia`;
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', pintar);
store.suscribir(() => pintar());

if (!window.location.hash) window.location.hash = '#/panel';
pintar();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sin conexión o sin permisos: la app funciona igual */
    });
  });
}

// Atajos: números para cambiar de pantalla.
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  const indice = Number(e.key) - 1;
  if (indice >= 0 && indice < RUTAS.length) {
    window.location.hash = `#/${RUTAS[indice].id}`;
  }
});

export { store, mensaje };
