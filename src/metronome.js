/**
 * metronome.js — Metrónomo con Web Audio (scheduler con lookahead, no setInterval
 * sobre el sonido: así no se desfasa aunque el navegador se ponga lento).
 */

export class Metronome {
  constructor({ bpm = 90, beatsPerBar = 4, subdivision = 1 } = {}) {
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    this.subdivision = subdivision;
    this.ctx = null;
    this.running = false;
    this.beat = 0;
    this.nextNoteTime = 0;
    this.timer = null;
    this.lookahead = 25;        // ms entre revisiones
    this.scheduleAhead = 0.12;  // segundos de margen
    this.onBeat = null;         // callback(beatIndex, beatsPerBar)
    this.volume = 0.6;
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _click(time, accent) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent === 2 ? 1500 : accent === 1 ? 1000 : 700;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(this.volume * (accent === 2 ? 1 : accent === 1 ? 0.7 : 0.35), time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  _scheduler() {
    const spb = 60 / this.bpm / this.subdivision;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAhead) {
      const stepsPerBar = this.beatsPerBar * this.subdivision;
      const inBar = this.beat % stepsPerBar;
      const accent = inBar === 0 ? 2 : inBar % this.subdivision === 0 ? 1 : 0;
      this._click(this.nextNoteTime, accent);
      if (this.onBeat) {
        const beatIndex = Math.floor(inBar / this.subdivision);
        const when = this.nextNoteTime;
        const delay = Math.max(0, (when - this.ctx.currentTime) * 1000);
        setTimeout(() => this.onBeat(beatIndex, this.beatsPerBar, accent), delay);
      }
      this.nextNoteTime += spb;
      this.beat++;
    }
  }

  start() {
    if (this.running) return;
    this._ensureCtx();
    this.running = true;
    this.beat = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this._scheduler(), this.lookahead);
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
  }

  toggle() { this.running ? this.stop() : this.start(); }

  setBpm(bpm) { this.bpm = Math.max(30, Math.min(260, Math.round(bpm))); }
}

/** Detector de tempo por golpecitos: promedia los últimos intervalos. */
export class TapTempo {
  constructor(memory = 6) { this.taps = []; this.memory = memory; }
  tap(now = performance.now()) {
    if (this.taps.length && now - this.taps[this.taps.length - 1] > 2500) this.taps = [];
    this.taps.push(now);
    if (this.taps.length > this.memory) this.taps.shift();
    if (this.taps.length < 2) return null;
    const gaps = [];
    for (let i = 1; i < this.taps.length; i++) gaps.push(this.taps[i] - this.taps[i - 1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return Math.round(60000 / avg);
  }
  reset() { this.taps = []; }
}

/** Cuenta regresiva hablada antes de empezar a tocar. */
export function countInText(beatsPerBar = 4) {
  return Array.from({ length: beatsPerBar }, (_, i) => i + 1).join(' – ');
}
