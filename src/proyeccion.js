/**
 * proyeccion.js — Pantalla para la congregación (segunda ventana o proyector).
 * Solo letra, sin acordes, controlada desde el modo atril por BroadcastChannel.
 */

const canal = new BroadcastChannel('alabanza-proyeccion');
const app = document.getElementById('proyeccion');

let estado = { titulo: '', seccion: '', lineas: [], negro: false, tamano: 1 };

function pintar() {
  app.className = estado.negro ? 'negro' : '';
  if (estado.negro) { app.replaceChildren(); return; }
  const cont = document.createElement('div');
  cont.className = 'letra';
  cont.style.fontSize = `${estado.tamano * 4.2}vw`;
  for (const linea of estado.lineas) {
    const p = document.createElement('p');
    p.textContent = linea;
    if (!linea.trim()) p.className = 'espacio';
    cont.append(p);
  }
  const pie = document.createElement('div');
  pie.className = 'pie';
  pie.textContent = estado.titulo + (estado.seccion ? ` · ${estado.seccion}` : '');
  app.replaceChildren(cont, pie);
}

canal.onmessage = (e) => {
  estado = { ...estado, ...e.data };
  pintar();
};

// Al abrirse, pide el estado actual al atril.
canal.postMessage({ tipo: 'hola' });
document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.();
  if (e.key === 'Escape') document.exitFullscreen?.();
});
pintar();
