/**
 * app.js — La pantalla de mercados: barra de herramientas, lista de
 * seguimiento y el gráfico.
 *
 * Todo vive en el navegador: símbolo, temporalidad, indicadores, dibujos y
 * claves de API se guardan en localStorage y no salen de este dispositivo.
 */

import { el, toast } from '../ui.js';
import { Grafico } from './grafico.js';
import { CATALOGO } from './indicadores.js';
import { PROVEEDORES, INTERVALOS, ETIQUETAS, cargarVelas, fusionarVela } from './datos.js';

const LLAVE_CONFIG = 'mercados.config';
const LLAVE_CLAVES = 'mercados.claves';
const LLAVE_DIBUJOS = 'mercados.dibujos';
const LLAVE_LISTA = 'mercados.lista';

const leer = (llave, porDefecto) => {
  try { return JSON.parse(localStorage.getItem(llave)) ?? porDefecto; } catch { return porDefecto; }
};
const escribir = (llave, valor) => {
  try { localStorage.setItem(llave, JSON.stringify(valor)); } catch { /* modo privado o disco lleno */ }
};

const config = Object.assign({
  proveedor: 'binance',
  simbolo: 'BTCUSDT',
  intervalo: '1h',
  tipo: 'velas',
  log: false,
  enVivo: true,
  indicadores: ['volumen'],
}, leer(LLAVE_CONFIG, {}));

const claves = leer(LLAVE_CLAVES, {});
const lista = leer(LLAVE_LISTA, [
  { proveedor: 'binance', simbolo: 'BTCUSDT' },
  { proveedor: 'binance', simbolo: 'ETHUSDT' },
  { proveedor: 'binance', simbolo: 'SOLUSDT' },
]);

const llaveDibujos = (c) => `${LLAVE_DIBUJOS}.${c.proveedor}.${c.simbolo}.${c.intervalo}`;

let grafico = null;
let cortarVivo = null;
let temporizador = null;
let cargando = false;

const guardarConfig = () => escribir(LLAVE_CONFIG, config);

// ---------- barra superior ----------

function barra(alRecargar) {
  const entradaSimbolo = el('input', {
    class: 'm-simbolo', value: config.simbolo, spellcheck: 'false',
    'aria-label': 'Símbolo', placeholder: 'BTCUSDT',
    onchange: (e) => cambiarSimbolo(e.target.value.trim().toUpperCase()),
  });

  const selProveedor = el('select', {
    class: 'm-select', 'aria-label': 'Proveedor de datos',
    onchange: (e) => {
      config.proveedor = e.target.value;
      const p = PROVEEDORES[config.proveedor];
      config.simbolo = p.ejemplos[0];
      entradaSimbolo.value = config.simbolo;
      guardarConfig();
      alRecargar();
    },
  }, ...Object.entries(PROVEEDORES).map(([k, p]) =>
    el('option', { value: k, selected: k === config.proveedor }, p.nombre)));

  const intervalos = el('div', { class: 'm-grupo' },
    ...Object.keys(INTERVALOS).map((iv) => el('button', {
      class: 'm-btn' + (iv === config.intervalo ? ' activo' : ''),
      dataset: { intervalo: iv },
      onclick: () => { config.intervalo = iv; guardarConfig(); alRecargar(); },
    }, ETIQUETAS[iv])));

  const selTipo = el('select', {
    class: 'm-select', 'aria-label': 'Tipo de gráfico',
    onchange: (e) => { config.tipo = e.target.value; guardarConfig(); grafico.setTipo(config.tipo); },
  }, ...[['velas', 'Velas'], ['heikin', 'Heikin-Ashi'], ['barras', 'Barras'], ['linea', 'Línea'], ['area', 'Área']]
    .map(([v, t]) => el('option', { value: v, selected: v === config.tipo }, t)));

  const btnLog = el('button', {
    class: 'm-btn' + (config.log ? ' activo' : ''), title: 'Escala logarítmica (L)',
    onclick: (e) => {
      config.log = !config.log; guardarConfig();
      e.currentTarget.classList.toggle('activo', config.log);
      grafico.setLog(config.log);
    },
  }, 'log');

  const btnVivo = el('button', {
    class: 'm-btn' + (config.enVivo ? ' activo' : ''), title: 'Actualizar en vivo',
    onclick: (e) => {
      config.enVivo = !config.enVivo; guardarConfig();
      e.currentTarget.classList.toggle('activo', config.enVivo);
      conectarVivo();
    },
  }, '● vivo');

  return el('header', { class: 'm-barra' },
    el('div', { class: 'm-grupo' }, entradaSimbolo, selProveedor),
    intervalos,
    el('div', { class: 'm-grupo' }, selTipo, btnLog, btnVivo),
    menuIndicadores(),
    herramientas(),
    el('div', { class: 'm-grupo m-derecha' },
      el('button', { class: 'm-btn', title: 'Volver al presente (doble clic en el gráfico)', onclick: () => grafico.irAlFinal() }, '⇥'),
      el('button', { class: 'm-btn', onclick: abrirAjustes }, 'Ajustes')),
  );
}

function menuIndicadores() {
  const panel = el('div', { class: 'm-menu-panel' },
    ...Object.entries(CATALOGO).map(([clave, def]) => {
      const marca = el('input', {
        type: 'checkbox', checked: config.indicadores.includes(clave),
        onchange: (e) => {
          config.indicadores = e.target.checked
            ? [...config.indicadores, clave]
            : config.indicadores.filter((c) => c !== clave);
          guardarConfig();
          grafico.setIndicadores(config.indicadores);
        },
      });
      return el('label', { class: 'm-opcion' }, marca, el('span', {}, def.nombre));
    }));
  const menu = el('details', { class: 'm-menu' }, el('summary', { class: 'm-btn' }, 'Indicadores'), panel);
  // Un <details> no se cierra solo: sin esto tapa el gráfico hasta que lo pulses otra vez.
  document.addEventListener('pointerdown', (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.open = false; });
  return menu;
}

function herramientas() {
  const botones = [
    ['horizontal', '—', 'Línea de precio'],
    ['tendencia', '／', 'Línea de tendencia'],
    ['fib', '≡', 'Retroceso de Fibonacci'],
  ].map(([tipo, icono, titulo]) => el('button', {
    class: 'm-btn', title: titulo, dataset: { herramienta: tipo },
    onclick: (e) => {
      const activa = grafico.herramienta === tipo;
      grafico.herramienta = activa ? null : tipo;
      grafico.pendiente = null;
      document.querySelectorAll('[data-herramienta]').forEach((b) => b.classList.remove('activo'));
      e.currentTarget.classList.toggle('activo', !activa);
    },
  }, icono));

  botones.push(el('button', {
    class: 'm-btn', title: 'Borrar los dibujos de este gráfico',
    onclick: () => {
      if (!grafico.dibujos.length) return;
      grafico.setDibujos([]);
      escribir(llaveDibujos(config), []);
      toast('Dibujos borrados');
    },
  }, '🗑'));

  return el('div', { class: 'm-grupo' }, ...botones);
}

// ---------- lista de seguimiento ----------

function pintarLista() {
  const caja = document.querySelector('#lista');
  if (!caja) return;
  caja.replaceChildren(
    el('div', { class: 'm-lista-cabecera' },
      el('strong', {}, 'Seguimiento'),
      el('button', {
        class: 'm-btn pequeno', title: 'Añadir el símbolo actual',
        onclick: () => {
          if (lista.some((x) => x.simbolo === config.simbolo && x.proveedor === config.proveedor)) return;
          lista.push({ proveedor: config.proveedor, simbolo: config.simbolo });
          escribir(LLAVE_LISTA, lista);
          pintarLista();
          actualizarPrecios();
        },
      }, '+')),
    ...lista.map((item, i) => el('div', {
      class: 'm-item' + (item.simbolo === config.simbolo && item.proveedor === config.proveedor ? ' activo' : ''),
      onclick: () => {
        config.proveedor = item.proveedor;
        document.querySelector('.m-barra select').value = item.proveedor;
        cambiarSimbolo(item.simbolo);
      },
    },
      el('span', { class: 'm-item-simbolo' }, item.simbolo),
      el('span', { class: 'm-item-precio', dataset: { simbolo: item.simbolo } }, '·'),
      el('button', {
        class: 'm-quitar', title: 'Quitar de la lista',
        onclick: (e) => {
          e.stopPropagation();
          lista.splice(i, 1);
          escribir(LLAVE_LISTA, lista);
          pintarLista();
        },
      }, '×'))),
    el('p', { class: 'm-nota' }, PROVEEDORES[config.proveedor].nota),
  );
}

/**
 * Precios de la lista. Solo se piden para Binance, que tiene un endpoint
 * barato y sin clave; en los demás proveedores gastaría la cuota gratuita.
 */
async function actualizarPrecios() {
  const cripto = lista.filter((x) => x.proveedor === 'binance');
  if (!cripto.length) return;
  try {
    const u = new URL('https://api.binance.com/api/v3/ticker/24hr');
    u.searchParams.set('symbols', JSON.stringify(cripto.map((x) => x.simbolo)));
    const res = await fetch(u);
    if (!res.ok) return;
    for (const t of await res.json()) {
      const nodo = document.querySelector(`.m-item-precio[data-simbolo="${t.symbol}"]`);
      if (!nodo) continue;
      const pct = Number(t.priceChangePercent);
      nodo.textContent = `${Number(t.lastPrice)} · ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      nodo.className = `m-item-precio ${pct >= 0 ? 'sube' : 'baja'}`;
    }
  } catch { /* sin red: la lista se queda con los puntos */ }
}

// ---------- ajustes ----------

function abrirAjustes() {
  const campos = [];
  for (const [id, p] of Object.entries(PROVEEDORES)) {
    if (!p.clave) continue;
    claves[id] = claves[id] || {};
    campos.push(el('fieldset', { class: 'm-fieldset' },
      el('legend', {}, p.nombre),
      ...p.clave.campos.map((campo) => el('label', { class: 'm-campo' },
        el('span', {}, campo),
        el('input', {
          type: 'password', value: claves[id][campo] || '', spellcheck: 'false',
          oninput: (e) => { claves[id][campo] = e.target.value.trim(); },
        }))),
      el('p', { class: 'm-nota' }, p.nota, ' ',
        el('a', { href: p.clave.alta, target: '_blank', rel: 'noopener' }, 'Conseguir clave')),
    ));
  }

  const dialogo = el('dialog', { class: 'm-dialogo' },
    el('h2', {}, 'Ajustes'),
    el('p', { class: 'm-nota' },
      'Las claves se guardan solo en este navegador y se envían únicamente al proveedor que elijas. ',
      'Cripto con Binance no necesita ninguna.'),
    ...campos,
    el('div', { class: 'm-grupo m-derecha' },
      el('button', { class: 'm-btn', onclick: () => dialogo.close() }, 'Cancelar'),
      el('button', {
        class: 'm-btn activo',
        onclick: () => { escribir(LLAVE_CLAVES, claves); dialogo.close(); toast('Claves guardadas'); recargar(); },
      }, 'Guardar')),
  );
  document.body.append(dialogo);
  dialogo.addEventListener('close', () => dialogo.remove());
  dialogo.showModal();
}

// ---------- carga y vivo ----------

function cambiarSimbolo(simbolo) {
  if (!simbolo) return;
  config.simbolo = simbolo;
  const entrada = document.querySelector('.m-simbolo');
  if (entrada) entrada.value = simbolo;
  guardarConfig();
  recargar();
}

function estado(txt, error = false) {
  const nodo = document.querySelector('#estado');
  if (!nodo) return;
  nodo.textContent = txt || '';
  nodo.className = 'm-estado' + (error ? ' error' : '') + (txt ? '' : ' oculto');
}

async function recargar() {
  if (cargando) return;
  cargando = true;
  estado('Cargando…');
  try {
    const velas = await cargarVelas({
      proveedor: config.proveedor, simbolo: config.simbolo,
      intervalo: config.intervalo, claves: claves[config.proveedor] || {},
    });
    grafico.simbolo = config.simbolo;
    grafico.intervalo = config.intervalo;
    grafico.setDibujos(leer(llaveDibujos(config), []));
    grafico.setVelas(velas);
    estado('');
    pintarLista();
    conectarVivo();
  } catch (e) {
    estado(String(e.message || e), true);
    // Con el proveedor caído o sin clave, al menos se ve algo real de la interfaz.
    if (!grafico.velas.length) {
      const { generarDemo } = await import('./datos.js');
      grafico.simbolo = config.simbolo + ' (demo)';
      grafico.intervalo = config.intervalo;
      grafico.setVelas(generarDemo(config.simbolo, config.intervalo, 400));
    }
  } finally {
    cargando = false;
    // La barra marca lo que de verdad se está viendo: si la carga falló, el
    // gráfico sigue con la temporalidad anterior y el botón debe decirlo.
    document.querySelectorAll('.m-barra [data-intervalo]').forEach((b) =>
      b.classList.toggle('activo', b.dataset.intervalo === grafico.intervalo));
  }
}

/** Datos en vivo: WebSocket donde lo hay, y si no, releer cada minuto. */
function conectarVivo() {
  if (cortarVivo) { cortarVivo(); cortarVivo = null; }
  if (temporizador) { clearInterval(temporizador); temporizador = null; }
  if (!config.enVivo) return;

  const p = PROVEEDORES[config.proveedor];
  if (p.enVivo) {
    try {
      cortarVivo = p.enVivo(config.simbolo, config.intervalo, (vela) => {
        fusionarVela(grafico.velas, vela);
        grafico._heikinDe = null;
        grafico.pintar();
      });
    } catch { estado('No se pudo abrir la conexión en vivo', true); }
    return;
  }
  temporizador = setInterval(async () => {
    if (document.hidden || cargando) return;
    try {
      const velas = await cargarVelas({
        proveedor: config.proveedor, simbolo: config.simbolo,
        intervalo: config.intervalo, limite: 200, claves: claves[config.proveedor] || {},
      });
      for (const v of velas.slice(-3)) fusionarVela(grafico.velas, v);
      grafico._heikinDe = null;
      grafico.pintar();
    } catch { /* un fallo suelto no debe apagar el temporizador */ }
  }, 60e3);
}

// ---------- arranque ----------

export function iniciar(raiz) {
  const canvas = el('canvas', { class: 'm-canvas' });
  const cuerpo = el('div', { class: 'm-cuerpo' },
    el('aside', { id: 'lista', class: 'm-lista' }),
    el('div', { class: 'm-grafico' }, canvas, el('div', { id: 'estado', class: 'm-estado oculto' })),
  );
  raiz.replaceChildren(barra(recargar), cuerpo);

  grafico = new Grafico(canvas, {
    simbolo: config.simbolo,
    intervalo: config.intervalo,
    alCambiar: () => escribir(llaveDibujos(config), grafico.dibujos),
  });
  grafico.setTipo(config.tipo);
  grafico.setLog(config.log);
  grafico.setIndicadores(config.indicadores);

  new ResizeObserver(() => grafico.pintar()).observe(canvas);
  window.addEventListener('keydown', atajos);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) actualizarPrecios(); });

  pintarLista();
  recargar();
  actualizarPrecios();
  setInterval(actualizarPrecios, 30e3);
}

function atajos(e) {
  if (e.target.matches('input, textarea, select')) return;
  const teclas = Object.keys(INTERVALOS);
  if (e.key >= '1' && e.key <= String(teclas.length)) {
    config.intervalo = teclas[Number(e.key) - 1];
    guardarConfig();
    recargar();
  } else if (e.key === 'l' || e.key === 'L') {
    config.log = !config.log;
    guardarConfig();
    grafico.setLog(config.log);
    document.querySelectorAll('.m-btn').forEach((b) => { if (b.textContent === 'log') b.classList.toggle('activo', config.log); });
  } else if (e.key === 'Escape') {
    grafico.herramienta = null;
    grafico.pendiente = null;
    document.querySelectorAll('[data-herramienta]').forEach((b) => b.classList.remove('activo'));
    grafico.pintar();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    grafico.vista.fin += (e.key === 'ArrowRight' ? 1 : -1) * Math.max(1, grafico.vista.barras * 0.08);
    grafico.limitarVista();
    grafico.pintar();
  }
}
