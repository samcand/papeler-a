/**
 * audiolab.js — Reproductor de estudio para sacar canciones de oído:
 * velocidad lenta, bucle A-B y aislamiento aproximado de partes.
 *
 * Sobre "separar instrumentos": separar de verdad voz, batería y bajo (lo que
 * hace Moises) necesita un modelo de IA corriendo en un servidor. Aquí se hace
 * lo que sí es honesto y útil sin servidor:
 *  - Karaoke: cancela lo que está al centro de la mezcla (normalmente la voz
 *    principal) restando los dos canales. Funciona en grabaciones estéreo.
 *  - Centro: deja lo que está al centro (voz + bombo + caja).
 *  - Graves / Agudos: filtros para estudiar la línea de bajo o los platillos.
 */

export const MODOS = [
  { id: 'original', nombre: 'Original', detalle: 'La mezcla tal cual.' },
  { id: 'karaoke', nombre: 'Sin voz (karaoke)', detalle: 'Cancela el centro de la mezcla. Requiere audio estéreo; en grabaciones mono no hay nada que cancelar.' },
  { id: 'centro', nombre: 'Solo el centro', detalle: 'Resalta voz, bombo y caja. Útil para sacar la melodía.' },
  { id: 'graves', nombre: 'Solo graves', detalle: 'Filtro bajo 250 Hz: para sacar la línea del bajo.' },
  { id: 'agudos', nombre: 'Solo agudos', detalle: 'Filtro sobre 1.5 kHz: para oír platillos y detalles de la guitarra.' },
];

export class EstudioAudio {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.original = null;
    this.fuente = null;
    this.gain = null;
    this.modo = 'original';
    this.velocidad = 1;
    this.inicioCtx = 0;
    this.offset = 0;
    this.reproduciendo = false;
    this.bucle = null;     // { a, b } en segundos
    this.onTick = null;
    this.timer = null;
  }

  async cargar(file) {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = this.ctx || new AC();
    const datos = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    this.original = await this.ctx.decodeAudioData(datos);
    this.buffers.clear();
    this.buffers.set('original', this.original);
    return this.original;
  }

  get duracion() { return this.original?.duration || 0; }
  get estereo() { return (this.original?.numberOfChannels || 1) >= 2; }

  /** Construye (y cachea) la versión procesada del audio según el modo. */
  _bufferPara(modo) {
    if (this.buffers.has(modo)) return this.buffers.get(modo);
    const src = this.original;
    const n = src.length;
    const sr = src.sampleRate;
    const L = src.getChannelData(0);
    const R = src.numberOfChannels > 1 ? src.getChannelData(1) : L;
    const salida = this.ctx.createBuffer(1, n, sr);
    const out = salida.getChannelData(0);

    if (modo === 'karaoke') {
      for (let i = 0; i < n; i++) out[i] = (L[i] - R[i]) * 0.9;
    } else if (modo === 'centro') {
      for (let i = 0; i < n; i++) out[i] = (L[i] + R[i]) / 2;
    } else if (modo === 'graves' || modo === 'agudos') {
      // Filtro de un polo: suficiente para estudiar, y no necesita render offline.
      const fc = modo === 'graves' ? 250 : 1500;
      const dt = 1 / sr;
      const rc = 1 / (2 * Math.PI * fc);
      const alpha = modo === 'graves' ? dt / (rc + dt) : rc / (rc + dt);
      let prev = 0, prevIn = 0;
      for (let i = 0; i < n; i++) {
        const x = (L[i] + R[i]) / 2;
        if (modo === 'graves') { prev = prev + alpha * (x - prev); out[i] = prev * 1.6; }
        else { prev = alpha * (prev + x - prevIn); prevIn = x; out[i] = prev; }
      }
    } else {
      this.buffers.set(modo, src);
      return src;
    }
    this.buffers.set(modo, salida);
    return salida;
  }

  setModo(modo) {
    this.modo = modo;
    if (this.reproduciendo) { const t = this.tiempo(); this.parar(); this.reproducir(t); }
  }

  setVelocidad(v) {
    this.velocidad = v;
    if (this.fuente) {
      const t = this.tiempo();
      this.parar();
      this.reproducir(t);
    }
  }

  setBucle(a, b) {
    this.bucle = a != null && b != null && b > a ? { a, b } : null;
  }

  tiempo() {
    if (!this.reproduciendo) return this.offset;
    return this.offset + (this.ctx.currentTime - this.inicioCtx) * this.velocidad;
  }

  reproducir(desde = null) {
    if (!this.original) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.parar(false);
    const buffer = this._bufferPara(this.modo);
    this.fuente = this.ctx.createBufferSource();
    this.fuente.buffer = buffer;
    this.fuente.playbackRate.value = this.velocidad;
    this.gain = this.ctx.createGain();
    this.fuente.connect(this.gain).connect(this.ctx.destination);
    this.offset = desde != null ? desde : this.offset;
    if (this.bucle) {
      this.fuente.loop = true;
      this.fuente.loopStart = this.bucle.a;
      this.fuente.loopEnd = this.bucle.b;
      if (this.offset < this.bucle.a || this.offset > this.bucle.b) this.offset = this.bucle.a;
    }
    this.fuente.start(0, this.offset);
    this.inicioCtx = this.ctx.currentTime;
    this.reproduciendo = true;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      let t = this.tiempo();
      if (this.bucle && t > this.bucle.b) {
        this.offset = this.bucle.a;
        this.inicioCtx = this.ctx.currentTime;
        t = this.bucle.a;
      }
      this.onTick?.(t);
    }, 100);
  }

  parar(guardarPosicion = true) {
    if (this.fuente) {
      if (guardarPosicion) this.offset = this.tiempo();
      try { this.fuente.stop(); } catch { /* ya estaba parada */ }
      this.fuente.disconnect();
      this.fuente = null;
    }
    this.reproduciendo = false;
    clearInterval(this.timer);
  }

  buscar(t) {
    const estaba = this.reproduciendo;
    this.parar(false);
    this.offset = Math.max(0, Math.min(this.duracion, t));
    if (estaba) this.reproducir();
    else this.onTick?.(this.offset);
  }

  destruir() {
    this.parar(false);
    this.buffers.clear();
    this.ctx?.close?.();
    this.ctx = null;
  }
}
