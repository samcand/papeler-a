/**
 * grafico.js — El gráfico en sí: canvas puro, sin librerías.
 *
 * Dibuja igual que las plataformas de trading: las velas ocupan posiciones
 * fijas (los huecos de fin de semana no dejan espacio en blanco), el eje de
 * precio va a la derecha, los indicadores que no caben sobre el precio bajan
 * a su propio panel, y la cruz sigue al cursor mostrando los valores.
 *
 * El estado de la vista son dos números: `fin` (índice de vela en el borde
 * derecho, con decimales) y `barras` (cuántas caben). Todo lo demás se deriva.
 */

import { CATALOGO, heikinAshi } from './indicadores.js';

const COLORES = {
  sube: '#26a69a', baja: '#ef5350',
  subeSuave: 'rgba(38,166,154,.45)', bajaSuave: 'rgba(239,83,80,.45)',
  fondo: '#0f1115', rejilla: '#1e242e', texto: '#94a1b2', textoFuerte: '#e7ecf3',
  eje: '#2a313d', cruz: '#6b7787', linea: '#5ec8f2', dibujo: '#ffb454',
};

const EJE_ANCHO = 66;
const TIEMPO_ALTO = 24;
const MIN_BARRAS = 12;
const MAX_BARRAS = 1500;

/** Decimales razonables según cuánto vale el activo. */
export function decimales(precio) {
  const p = Math.abs(precio);
  if (p >= 1000) return 2;
  if (p >= 10) return 2;
  if (p >= 1) return 3;
  if (p >= 0.01) return 5;
  return 8;
}

export const formatearPrecio = (p, dec) =>
  Number.isFinite(p) ? p.toFixed(dec ?? decimales(p)) : '—';

/** Compacta volúmenes grandes: 1.2M en vez de 1200000. */
export function formatearVolumen(v) {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

/**
 * Paso "redondo" para el eje de precio: 1, 2, 2.5 o 5 por potencia de diez.
 * Sin esto las etiquetas salen con números como 37.418.
 */
export function pasoBonito(span, objetivo = 6) {
  if (!(span > 0)) return 1;
  const crudo = span / objetivo;
  const exp = Math.floor(Math.log10(crudo));
  const base = Math.pow(10, exp);
  const norm = crudo / base;
  const escalon = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return escalon * base;
}

/** Pasos "redondos" de tiempo para el eje horizontal, de un minuto a un año. */
const MIN = 60e3, HORA = 3600e3, DIA = 86400e3;
const PASOS_TIEMPO = [
  MIN, 2 * MIN, 5 * MIN, 15 * MIN, 30 * MIN,
  HORA, 2 * HORA, 3 * HORA, 6 * HORA, 12 * HORA,
  DIA, 7 * DIA, 30 * DIA, 90 * DIA, 365 * DIA,
];

/**
 * ¿Esta vela cruza una frontera de tiempo redonda?
 * Los pasos de un día o más se comparan por fecha local (el mes y el año no
 * duran un número fijo de milisegundos); los cortos, por módulo sobre la hora
 * local, para que las marcas caigan en :00 y no en el horario UTC.
 */
export function esMarca(t, tPrevio, paso) {
  const a = new Date(t), b = new Date(tPrevio);
  if (paso >= 365 * DIA) return a.getFullYear() !== b.getFullYear();
  if (paso >= 90 * DIA) return a.getMonth() !== b.getMonth() && a.getMonth() % 3 === 0;
  if (paso >= 30 * DIA) return a.getMonth() !== b.getMonth();
  if (paso >= 7 * DIA) return a.toDateString() !== b.toDateString() && a.getDay() === 1;
  if (paso >= DIA) return a.toDateString() !== b.toDateString();
  const local = (d) => d.getTime() - d.getTimezoneOffset() * MIN;
  return Math.floor(local(a) / paso) !== Math.floor(local(b) / paso);
}

/** Texto de una marca: fecha en el cambio de día, hora dentro del mismo día. */
export function etiquetaTiempo(t, paso, cambioDia) {
  const f = new Date(t);
  if (paso >= 365 * DIA) return String(f.getFullYear());
  if (paso >= 30 * DIA) return f.toLocaleDateString('es', { month: 'short', year: '2-digit' });
  if (paso >= DIA || cambioDia) return f.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  return f.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export class Grafico {
  constructor(canvas, opciones = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.velas = [];
    this.tipo = 'velas';           // velas | heikin | linea | area | barras
    this.log = false;
    this.indicadores = ['volumen'];
    this.dibujos = [];             // anclados a tiempo + precio, no a índice
    this.herramienta = null;       // null | horizontal | tendencia | fib
    this.pendiente = null;         // primer punto de un dibujo a medias
    this.vista = { fin: 0, barras: 160 };
    this.cursor = null;
    this.paneles = [];
    this.alCambiar = opciones.alCambiar || (() => {});
    this.simbolo = opciones.simbolo || '';
    this.intervalo = opciones.intervalo || '1h';
    this._pintarPedido = false;
    this._punteros = new Map();
    this._conectar();
  }

  // ---------- datos ----------

  setVelas(velas, { conservarVista = false } = {}) {
    const primeraVez = !this.velas.length;
    this.velas = velas;
    if (primeraVez || !conservarVista) this.irAlFinal();
    else this.vista.fin = Math.min(this.vista.fin, velas.length + this.vista.barras * 0.25);
    this.pintar();
  }

  irAlFinal() {
    const barras = Math.min(this.vista.barras, Math.max(MIN_BARRAS, this.velas.length));
    // Se deja un margen a la derecha para que la última vela no toque el eje.
    this.vista = { fin: this.velas.length + Math.max(2, barras * 0.06), barras };
    this.pintar();
  }

  setTipo(tipo) { this.tipo = tipo; this.pintar(); }
  setLog(log) { this.log = log; this.pintar(); }
  setIndicadores(lista) { this.indicadores = lista; this.pintar(); }
  setDibujos(dibujos) { this.dibujos = dibujos; this.pintar(); }

  /** Velas que se dibujan (Heikin-Ashi transforma la serie). */
  get serie() {
    if (this.tipo === 'heikin') {
      if (this._heikinDe !== this.velas) { this._heikinDe = this.velas; this._heikin = heikinAshi(this.velas); }
      return this._heikin;
    }
    return this.velas;
  }

  // ---------- geometría ----------

  get area() {
    const { width, height } = this.canvas.getBoundingClientRect();
    return { x: 0, y: 0, w: Math.max(1, width - EJE_ANCHO), h: Math.max(1, height - TIEMPO_ALTO), W: width, H: height };
  }

  get anchoBarra() { return this.area.w / this.vista.barras; }

  /** Cuánto dura una vela, según los datos cargados. */
  get pasoVela() {
    return this.velas.length > 1 ? Math.max(1, this.velas[1].t - this.velas[0].t) : HORA;
  }

  get inicioVista() { return this.vista.fin - this.vista.barras; }

  /** Centro en píxeles de la vela `i` (acepta decimales). */
  xDe(i) { return (i - this.inicioVista + 0.5) * this.anchoBarra; }

  /** Índice de vela (con decimales) que cae bajo esa `x`. */
  iDe(x) { return this.inicioVista + x / this.anchoBarra - 0.5; }

  /** Índices visibles, recortados a los datos que hay. */
  get rangoVisible() {
    return {
      desde: Math.max(0, Math.floor(this.inicioVista)),
      hasta: Math.min(this.velas.length - 1, Math.ceil(this.vista.fin)),
    };
  }

  // ---------- paneles ----------

  /**
   * Reparte la altura entre el precio y los indicadores que piden panel
   * propio, y calcula el rango vertical de cada uno con lo que se ve.
   */
  calcularPaneles() {
    const area = this.area;
    const abajo = [];
    for (const clave of this.indicadores) {
      const def = CATALOGO[clave];
      if (!def || def.panel === 'precio') continue;
      abajo.push({ clave, def, fraccion: def.altura || 0.18 });
    }
    // El precio nunca baja del 40% de la altura, pase lo que pase.
    let usado = abajo.reduce((a, p) => a + p.fraccion, 0);
    if (usado > 0.6) { const f = 0.6 / usado; abajo.forEach((p) => { p.fraccion *= f; }); usado = 0.6; }

    const paneles = [];
    let y = 0;
    const altoPrecio = area.h * (1 - usado);
    paneles.push({ clave: 'precio', y, h: altoPrecio, series: [], esPrecio: true });
    y += altoPrecio;
    for (const p of abajo) {
      const h = area.h * p.fraccion;
      paneles.push({ clave: p.clave, def: p.def, y, h, series: p.def.calcular(this.velas), titulo: p.def.nombre });
      y += h;
    }

    // Superpuestos sobre el precio (medias, bandas, VWAP…).
    for (const clave of this.indicadores) {
      const def = CATALOGO[clave];
      if (def && def.panel === 'precio') {
        paneles[0].series.push(...def.calcular(this.velas).map((s) => ({ ...s, clave })));
      }
    }

    const { desde, hasta } = this.rangoVisible;
    for (const panel of paneles) this.rangoPanel(panel, desde, hasta);
    this.paneles = paneles;
    return paneles;
  }

  /** Mínimo y máximo visibles del panel, con un respiro arriba y abajo. */
  rangoPanel(panel, desde, hasta) {
    if (panel.def && panel.def.rango) { [panel.min, panel.max] = panel.def.rango; return; }
    let min = Infinity, max = -Infinity;
    const mirar = (v) => { if (Number.isFinite(v)) { if (v < min) min = v; if (v > max) max = v; } };

    if (panel.esPrecio) {
      const serie = this.serie;
      for (let i = desde; i <= hasta; i++) {
        const k = serie[i];
        if (!k) continue;
        if (this.tipo === 'linea' || this.tipo === 'area') mirar(k.c);
        else { mirar(k.h); mirar(k.l); }
      }
      for (const s of panel.series) for (let i = desde; i <= hasta; i++) mirar(s.datos[i]);
      for (const d of this.dibujos) { mirar(d.p1 && d.p1.precio); mirar(d.p2 && d.p2.precio); }
    } else if (panel.clave === 'volumen') {
      min = 0;
      for (let i = desde; i <= hasta; i++) mirar(this.velas[i] ? this.velas[i].v : NaN);
      min = 0;
    } else {
      for (const s of panel.series) for (let i = desde; i <= hasta; i++) mirar(s.datos[i]);
      if (panel.def && panel.def.lineas) panel.def.lineas.forEach(mirar);
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
    if (min === max) { const d = Math.abs(min) * 0.02 || 1; min -= d; max += d; }
    const margen = (max - min) * (panel.esPrecio ? 0.08 : 0.12);
    panel.min = panel.clave === 'volumen' ? 0 : min - margen;
    panel.max = max + margen;
  }

  /** Precio → píxel dentro de un panel (respeta la escala logarítmica). */
  yDe(panel, valor) {
    if (!Number.isFinite(valor)) return NaN;
    const usaLog = this.log && panel.esPrecio && panel.min > 0;
    if (usaLog) {
      const lo = Math.log(panel.min), hi = Math.log(panel.max);
      return panel.y + panel.h - ((Math.log(Math.max(valor, 1e-12)) - lo) / (hi - lo)) * panel.h;
    }
    return panel.y + panel.h - ((valor - panel.min) / (panel.max - panel.min)) * panel.h;
  }

  /** Píxel → precio, la inversa de `yDe`. */
  valorDe(panel, y) {
    const usaLog = this.log && panel.esPrecio && panel.min > 0;
    const f = (panel.y + panel.h - y) / panel.h;
    if (usaLog) {
      const lo = Math.log(panel.min), hi = Math.log(panel.max);
      return Math.exp(lo + f * (hi - lo));
    }
    return panel.min + f * (panel.max - panel.min);
  }

  panelEn(y) {
    for (const p of this.paneles) if (y >= p.y && y <= p.y + p.h) return p;
    return this.paneles[0];
  }

  // ---------- pintado ----------

  pintar() {
    if (this._pintarPedido) return;
    this._pintarPedido = true;
    requestAnimationFrame(() => { this._pintarPedido = false; this._pintar(); });
  }

  _pintar() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(rect.width * dpr) || this.canvas.height !== Math.round(rect.height * dpr)) {
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = COLORES.fondo;
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (!this.velas.length) { this.texto('Sin datos', 16, 28, COLORES.texto); return; }

    const paneles = this.calcularPaneles();
    const area = this.area;

    for (const panel of paneles) {
      this.rejillaPrecio(panel, area);
      if (panel.esPrecio) {
        this.dibujarPrecio(panel);
        this.dibujarSeries(panel);
        this.dibujarDibujos(panel);
        this.lineaUltimo(panel, area);
      } else if (panel.clave === 'volumen') {
        this.dibujarVolumen(panel);
      } else {
        if (panel.def && panel.def.lineas) this.lineasGuia(panel, area);
        this.dibujarSeries(panel);
      }
      if (panel !== paneles[0]) {
        ctx.strokeStyle = COLORES.eje;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Math.round(panel.y) + .5); ctx.lineTo(area.w, Math.round(panel.y) + .5); ctx.stroke();
      }
    }

    this.ejeTiempo(area);
    this.marcoEjes(area);
    this.dibujarCruz(area);
    this.leyendas(area);
  }

  texto(txt, x, y, color = COLORES.texto, { alinear = 'left', peso = 400, tam = 11 } = {}) {
    const ctx = this.ctx;
    ctx.font = `${peso} ${tam}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = alinear;
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  rejillaPrecio(panel, area) {
    const ctx = this.ctx;
    const dec = panel.esPrecio ? decimales(panel.max) : undefined;
    const objetivo = Math.max(2, Math.floor(panel.h / 44));
    const paso = pasoBonito(panel.max - panel.min, objetivo);
    const primero = Math.ceil(panel.min / paso) * paso;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, panel.y, area.W, panel.h); ctx.clip();
    for (let v = primero; v <= panel.max; v += paso) {
      const y = Math.round(this.yDe(panel, v)) + .5;
      ctx.strokeStyle = COLORES.rejilla;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(area.w, y); ctx.stroke();
      // Junto al borde la etiqueta chocaría con la del panel vecino.
      if (y < panel.y + 10 || y > panel.y + panel.h - 10) continue;
      const etiqueta = panel.clave === 'volumen' ? formatearVolumen(v)
        : panel.esPrecio ? formatearPrecio(v, dec) : v.toFixed(Math.abs(paso) < 1 ? 2 : 0);
      this.texto(etiqueta, area.w + 8, y, COLORES.texto);
    }
    ctx.restore();
  }

  lineasGuia(panel, area) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = COLORES.eje;
    for (const v of panel.def.lineas) {
      const y = Math.round(this.yDe(panel, v)) + .5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(area.w, y); ctx.stroke();
    }
    ctx.restore();
  }

  dibujarPrecio(panel) {
    const ctx = this.ctx;
    const serie = this.serie;
    const { desde, hasta } = this.rangoVisible;
    const ancho = this.anchoBarra;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, panel.y, this.area.w, panel.h); ctx.clip();

    if (this.tipo === 'linea' || this.tipo === 'area') {
      const puntos = [];
      for (let i = desde; i <= hasta; i++) puntos.push([this.xDe(i), this.yDe(panel, serie[i].c)]);
      if (this.tipo === 'area' && puntos.length > 1) {
        const grad = ctx.createLinearGradient(0, panel.y, 0, panel.y + panel.h);
        grad.addColorStop(0, 'rgba(94,200,242,.30)');
        grad.addColorStop(1, 'rgba(94,200,242,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(puntos[0][0], panel.y + panel.h);
        for (const [x, y] of puntos) ctx.lineTo(x, y);
        ctx.lineTo(puntos[puntos.length - 1][0], panel.y + panel.h);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = COLORES.linea;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      puntos.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Velas y barras. Con mucho zoom out el cuerpo queda en 1px: se dibuja
    // solo la mecha, que es lo que se distingue a esa escala.
    const cuerpo = Math.max(1, Math.min(ancho * 0.72, 22));
    const finoMecha = cuerpo <= 2 ? 1 : Math.max(1, Math.round(cuerpo * 0.14));
    for (let i = desde; i <= hasta; i++) {
      const k = serie[i];
      const sube = k.c >= k.o;
      const color = sube ? COLORES.sube : COLORES.baja;
      const x = this.xDe(i);
      const yA = this.yDe(panel, k.h), yB = this.yDe(panel, k.l);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x - finoMecha / 2), yA, finoMecha, Math.max(1, yB - yA));
      if (this.tipo === 'barras') {
        const yO = this.yDe(panel, k.o), yC = this.yDe(panel, k.c);
        ctx.fillRect(Math.round(x - cuerpo / 2), Math.round(yO), cuerpo / 2, finoMecha);
        ctx.fillRect(Math.round(x), Math.round(yC), cuerpo / 2, finoMecha);
      } else if (cuerpo > 2) {
        const yO = this.yDe(panel, k.o), yC = this.yDe(panel, k.c);
        const arriba = Math.min(yO, yC);
        ctx.fillRect(Math.round(x - cuerpo / 2), Math.round(arriba), Math.round(cuerpo), Math.max(1, Math.abs(yC - yO)));
      }
    }
    ctx.restore();
  }

  dibujarVolumen(panel) {
    const ctx = this.ctx;
    const { desde, hasta } = this.rangoVisible;
    const ancho = Math.max(1, this.anchoBarra * 0.7);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, panel.y, this.area.w, panel.h); ctx.clip();
    for (let i = desde; i <= hasta; i++) {
      const k = this.velas[i];
      const y = this.yDe(panel, k.v || 0);
      const base = panel.y + panel.h;
      ctx.fillStyle = k.c >= k.o ? COLORES.subeSuave : COLORES.bajaSuave;
      ctx.fillRect(this.xDe(i) - ancho / 2, y, ancho, Math.max(1, base - y));
    }
    ctx.restore();
  }

  dibujarSeries(panel) {
    const ctx = this.ctx;
    const { desde, hasta } = this.rangoVisible;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, panel.y, this.area.w, panel.h); ctx.clip();

    for (const s of panel.series) {
      // Relleno entre dos series del mismo indicador (las bandas de Bollinger).
      if (Number.isFinite(s.relleno) && panel.series[s.relleno]) {
        const otra = panel.series[s.relleno];
        ctx.fillStyle = 'rgba(148,161,178,.08)';
        ctx.beginPath();
        let abierto = false;
        for (let i = desde; i <= hasta; i++) {
          if (!Number.isFinite(otra.datos[i])) continue;
          const p = [this.xDe(i), this.yDe(panel, otra.datos[i])];
          abierto ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), abierto = true);
        }
        for (let i = hasta; i >= desde; i--) {
          if (!Number.isFinite(s.datos[i])) continue;
          ctx.lineTo(this.xDe(i), this.yDe(panel, s.datos[i]));
        }
        ctx.closePath(); ctx.fill();
      }

      if (s.tipo === 'histograma') {
        const ancho = Math.max(1, this.anchoBarra * 0.7);
        const cero = this.yDe(panel, 0);
        for (let i = desde; i <= hasta; i++) {
          const v = s.datos[i];
          if (!Number.isFinite(v)) continue;
          const y = this.yDe(panel, v);
          const creciendo = !Number.isFinite(s.datos[i - 1]) || Math.abs(v) >= Math.abs(s.datos[i - 1]);
          ctx.fillStyle = v >= 0
            ? (creciendo ? COLORES.sube : COLORES.subeSuave)
            : (creciendo ? COLORES.baja : COLORES.bajaSuave);
          ctx.fillRect(this.xDe(i) - ancho / 2, Math.min(y, cero), ancho, Math.max(1, Math.abs(cero - y)));
        }
        continue;
      }

      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.setLineDash(s.guiones || []);
      ctx.beginPath();
      let dibujando = false;
      for (let i = desde; i <= hasta; i++) {
        const v = s.datos[i];
        if (!Number.isFinite(v)) { dibujando = false; continue; }
        const x = this.xDe(i), y = this.yDe(panel, v);
        dibujando ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), dibujando = true);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /** Línea horizontal en el último cierre, con su etiqueta en el eje. */
  lineaUltimo(panel, area) {
    const ctx = this.ctx;
    const ultima = this.serie[this.serie.length - 1];
    if (!ultima) return;
    const y = this.yDe(panel, ultima.c);
    if (y < panel.y || y > panel.y + panel.h) return;
    const color = ultima.c >= ultima.o ? COLORES.sube : COLORES.baja;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(area.w, Math.round(y) + .5); ctx.stroke();
    ctx.restore();
    this.etiquetaEje(area, y, formatearPrecio(ultima.c), color);
  }

  etiquetaEje(area, y, txt, fondo) {
    const ctx = this.ctx;
    const alto = 17;
    ctx.fillStyle = fondo;
    ctx.fillRect(area.w + 1, y - alto / 2, EJE_ANCHO - 1, alto);
    this.texto(txt, area.w + 6, y, '#0f1115', { peso: 600 });
  }

  ejeTiempo(area) {
    const ctx = this.ctx;
    const { desde, hasta } = this.rangoVisible;
    const y = area.h + TIEMPO_ALTO / 2;
    // El paso se elige en tiempo real, no en número de velas: así las marcas
    // caen en horas y días redondos en vez de en múltiplos de vela.
    const porPixel = this.pasoVela / this.anchoBarra;
    const paso = PASOS_TIEMPO.find((p) => p >= porPixel * 78) || PASOS_TIEMPO[PASOS_TIEMPO.length - 1];
    let ultimoX = -Infinity;

    for (let i = Math.max(desde, 1); i <= hasta; i++) {
      const k = this.velas[i];
      if (!k || !esMarca(k.t, this.velas[i - 1].t, paso)) continue;
      const x = this.xDe(i);
      if (x < 20 || x > area.w - 20 || x - ultimoX < 62) continue;
      ultimoX = x;
      ctx.strokeStyle = COLORES.rejilla;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, area.h); ctx.stroke();
      const dia = new Date(k.t).toDateString() !== new Date(this.velas[i - 1].t).toDateString();
      this.texto(etiquetaTiempo(k.t, paso, dia), x, y,
        dia ? COLORES.textoFuerte : COLORES.texto, { alinear: 'center' });
    }
  }

  marcoEjes(area) {
    const ctx = this.ctx;
    ctx.strokeStyle = COLORES.eje;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(area.w) + .5, 0); ctx.lineTo(Math.round(area.w) + .5, area.H);
    ctx.moveTo(0, Math.round(area.h) + .5); ctx.lineTo(area.W, Math.round(area.h) + .5);
    ctx.stroke();
  }

  dibujarCruz(area) {
    if (!this.cursor) return;
    const { x, y } = this.cursor;
    if (x > area.w || y > area.h) return;
    const ctx = this.ctx;
    const i = Math.round(this.iDe(x));
    const k = this.velas[i];
    const xs = k ? this.xDe(i) : x;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = COLORES.cruz;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(xs) + .5, 0); ctx.lineTo(Math.round(xs) + .5, area.h);
    ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(area.w, Math.round(y) + .5);
    ctx.stroke();
    ctx.restore();

    const panel = this.panelEn(y);
    const valor = this.valorDe(panel, y);
    const txt = panel.clave === 'volumen' ? formatearVolumen(valor)
      : panel.esPrecio ? formatearPrecio(valor) : valor.toFixed(2);
    this.etiquetaEje(area, y, txt, COLORES.cruz);

    if (k) {
      const f = new Date(k.t);
      const intradia = ['1m', '5m', '15m', '1h', '4h'].includes(this.intervalo);
      const etiqueta = intradia
        ? f.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : f.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
      // measureText usa la fuente que esté puesta: hay que fijarla antes.
      ctx.font = "600 11px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      const ancho = ctx.measureText(etiqueta).width + 18;
      ctx.fillStyle = COLORES.cruz;
      ctx.fillRect(xs - ancho / 2, area.h + 1, ancho, TIEMPO_ALTO - 1);
      this.texto(etiqueta, xs, area.h + TIEMPO_ALTO / 2, '#0f1115', { alinear: 'center', peso: 600 });
    }
  }

  /** Cabecera de cada panel: OHLC de la vela bajo el cursor y valores de los indicadores. */
  leyendas(area) {
    const i = this.cursor ? Math.round(this.iDe(this.cursor.x)) : this.velas.length - 1;
    const idx = Math.max(0, Math.min(this.velas.length - 1, i));
    const k = this.serie[idx];
    const previa = this.serie[idx - 1];
    if (!k) return;

    const dec = decimales(k.c);
    const cambio = previa ? k.c - previa.c : k.c - k.o;
    const pct = previa && previa.c ? (cambio / previa.c) * 100 : 0;
    const color = cambio >= 0 ? COLORES.sube : COLORES.baja;
    const estrecho = area.w < 520;
    let x = 12;
    const trozo = (txt, col, peso = 400, y = 14) => {
      this.texto(txt, x, y, col, { peso, tam: 11 });
      x += this.ctx.measureText(txt).width + 10;
    };

    trozo(`${this.simbolo} · ${this.intervalo}`, COLORES.textoFuerte, 700);
    // En pantallas angostas el OHLC completo no cabe y se sale por el eje.
    if (!estrecho) {
      trozo(`A ${formatearPrecio(k.o, dec)}`, COLORES.texto);
      trozo(`M ${formatearPrecio(k.h, dec)}`, COLORES.texto);
      trozo(`m ${formatearPrecio(k.l, dec)}`, COLORES.texto);
    }
    trozo(`${formatearPrecio(k.c, dec)}`, color, 700);
    trozo(estrecho ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
      : `${cambio >= 0 ? '+' : ''}${formatearPrecio(cambio, dec)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`, color);

    // Los indicadores superpuestos se agrupan por nombre: Bollinger son tres
    // series, pero se anuncia una sola vez seguida de sus tres valores.
    const precio = this.paneles[0];
    if (precio) {
      let xi = 12, yi = 30;
      const escribir = (txt, col, peso = 400) => {
        if (xi > area.w - 90) { xi = 12; yi += 14; }
        this.texto(txt, xi, yi, col, { tam: 11, peso });
        xi += this.ctx.measureText(txt).width + (peso === 600 ? 6 : 10);
      };
      let anterior = null;
      for (const s of precio.series) {
        const v = s.datos[idx];
        if (!Number.isFinite(v)) continue;
        if (s.clave !== anterior) {
          const def = CATALOGO[s.clave];
          escribir(def ? def.nombre : s.clave, COLORES.texto, 600);
          anterior = s.clave;
        }
        escribir(formatearPrecio(v, dec), s.color);
      }
    }

    for (const panel of this.paneles.slice(1)) {
      let xs = 12;
      const ys = panel.y + 11;
      const titulo = panel.clave === 'volumen'
        ? `Volumen ${formatearVolumen(this.velas[idx].v)}`
        : panel.titulo;
      this.texto(titulo, xs, ys, COLORES.texto, { peso: 600 });
      xs += this.ctx.measureText(titulo).width + 10;
      for (const s of panel.series) {
        const v = s.datos[idx];
        if (!Number.isFinite(v)) continue;
        const txt = v.toFixed(2);
        this.texto(txt, xs, ys, s.color, { peso: 600 });
        xs += this.ctx.measureText(txt).width + 8;
      }
    }
  }

  // ---------- dibujos del usuario ----------

  /** Tiempo de una vela por índice; extrapola si el índice cae fuera. */
  tiempoDe(i) {
    const n = this.velas.length;
    if (!n) return Date.now();
    const j = Math.max(0, Math.min(n - 1, Math.round(i)));
    const paso = n > 1 ? this.velas[1].t - this.velas[0].t : 60e3;
    return this.velas[j].t + (i - j) * paso;
  }

  /** La inversa: índice (con decimales) de un instante. */
  indiceDe(t) {
    const n = this.velas.length;
    if (!n) return 0;
    const paso = n > 1 ? this.velas[1].t - this.velas[0].t : 60e3;
    if (t <= this.velas[0].t) return (t - this.velas[0].t) / paso;
    if (t >= this.velas[n - 1].t) return n - 1 + (t - this.velas[n - 1].t) / paso;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.velas[mid].t <= t) lo = mid; else hi = mid;
    }
    const span = this.velas[hi].t - this.velas[lo].t || paso;
    return lo + (t - this.velas[lo].t) / span;
  }

  dibujarDibujos(panel) {
    const ctx = this.ctx;
    const area = this.area;
    const todos = this.pendiente ? [...this.dibujos, this.pendiente] : this.dibujos;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, panel.y, area.w, panel.h); ctx.clip();
    for (const d of todos) {
      const color = d.color || COLORES.dibujo;
      ctx.strokeStyle = color;
      ctx.lineWidth = d === this.seleccionado ? 2.4 : 1.5;

      if (d.tipo === 'horizontal') {
        const y = this.yDe(panel, d.p1.precio);
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(area.w, y); ctx.stroke();
        this.texto(formatearPrecio(d.p1.precio), area.w - 8, y - 8, color, { alinear: 'right', peso: 600 });
        continue;
      }

      if (!d.p2) continue;
      const x1 = this.xDe(this.indiceDe(d.p1.t)), y1 = this.yDe(panel, d.p1.precio);
      const x2 = this.xDe(this.indiceDe(d.p2.t)), y2 = this.yDe(panel, d.p2.precio);

      if (d.tipo === 'tendencia') {
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        for (const [px, py] of [[x1, y1], [x2, y2]]) {
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        }
      } else if (d.tipo === 'fib') {
        const niveles = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const alto = d.p1.precio, bajo = d.p2.precio;
        for (const n of niveles) {
          const precio = alto + (bajo - alto) * n;
          const y = this.yDe(panel, precio);
          ctx.setLineDash(n === 0 || n === 1 ? [] : [4, 4]);
          ctx.beginPath(); ctx.moveTo(Math.min(x1, x2), y); ctx.lineTo(area.w, y); ctx.stroke();
          this.texto(`${(n * 100).toFixed(1)}%  ${formatearPrecio(precio)}`, Math.min(x1, x2) + 6, y - 7, color);
        }
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // ---------- interacción ----------

  _conectar() {
    const c = this.canvas;
    c.style.touchAction = 'none';

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      if (x > this.area.w) return;
      const iBajoCursor = this.iDe(x);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      const barras = Math.max(MIN_BARRAS, Math.min(MAX_BARRAS, this.vista.barras * factor));
      // Se mantiene fija la vela que está bajo el puntero.
      const fraccion = (iBajoCursor - this.inicioVista) / this.vista.barras;
      this.vista.barras = barras;
      this.vista.fin = iBajoCursor + (1 - fraccion) * barras;
      this.limitarVista();
      this.pintar();
      this.alCambiar();
    }, { passive: false });

    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      const r = c.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top, inicioFin: this.vista.fin };
      this._punteros.set(e.pointerId, p);
      if (this.herramienta && this._punteros.size === 1 && p.x < this.area.w) this.puntoDibujo(p);
    });

    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      this.cursor = { x, y };

      const activo = this._punteros.get(e.pointerId);
      if (activo) {
        if (this._punteros.size === 2) this.pellizcar();
        else if (!this.herramienta) {
          const dx = x - activo.x;
          this.vista.fin = activo.inicioFin - dx / this.anchoBarra;
          this.limitarVista();
        } else if (this.pendiente && this.pendiente.p2) {
          const panel = this.paneles[0];
          this.pendiente.p2 = { t: this.tiempoDe(this.iDe(x)), precio: this.valorDe(panel, y) };
        }
      }
      if (activo) { activo.ultimoX = x; activo.ultimoY = y; }
      this.pintar();
    });

    const soltar = (e) => {
      this._punteros.delete(e.pointerId);
      this._pellizcoBase = null;
      this.alCambiar();
    };
    c.addEventListener('pointerup', soltar);
    c.addEventListener('pointercancel', soltar);
    c.addEventListener('pointerleave', () => { this.cursor = null; this.pintar(); });
    c.addEventListener('dblclick', () => this.irAlFinal());
  }

  pellizcar() {
    const [a, b] = [...this._punteros.values()];
    const dist = Math.abs((a.ultimoX ?? a.x) - (b.ultimoX ?? b.x)) || 1;
    if (!this._pellizcoBase) {
      this._pellizcoBase = { dist, barras: this.vista.barras, fin: this.vista.fin };
      return;
    }
    const factor = this._pellizcoBase.dist / dist;
    this.vista.barras = Math.max(MIN_BARRAS, Math.min(MAX_BARRAS, this._pellizcoBase.barras * factor));
    this.limitarVista();
  }

  /** No deja perder las velas de vista por completo al arrastrar ni al alejar. */
  limitarVista() {
    const n = this.velas.length;
    // Alejarse más allá de los datos solo deja franjas vacías a los lados.
    const tope = Math.min(MAX_BARRAS, Math.max(MIN_BARRAS, n * 1.3));
    this.vista.barras = Math.max(MIN_BARRAS, Math.min(tope, this.vista.barras));
    const minFin = Math.min(n, this.vista.barras * 0.2);
    const maxFin = n + this.vista.barras * 0.85;
    this.vista.fin = Math.max(minFin, Math.min(maxFin, this.vista.fin));
  }

  puntoDibujo(p) {
    const panel = this.paneles[0];
    if (!panel) return;
    const punto = { t: this.tiempoDe(this.iDe(p.x)), precio: this.valorDe(panel, p.y) };
    if (this.herramienta === 'horizontal') {
      this.dibujos.push({ tipo: 'horizontal', p1: punto });
      this.herramienta = null;
      this.alCambiar();
    } else if (!this.pendiente) {
      this.pendiente = { tipo: this.herramienta, p1: punto, p2: { ...punto } };
    } else {
      this.pendiente.p2 = punto;
      this.dibujos.push(this.pendiente);
      this.pendiente = null;
      this.herramienta = null;
      this.alCambiar();
    }
    this.pintar();
  }
}
