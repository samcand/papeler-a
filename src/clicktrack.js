/**
 * clicktrack.js — Genera pistas de clic y colchones (pads) para los in-ears.
 *
 * Produce muestras de audio directamente (sin depender del navegador), así que
 * se puede exportar a .wav para pasárselo al baterista o al que maneja la consola.
 */

import { keyInfo, noteToPc } from './music.js';

const TAU = Math.PI * 2;

/** Un golpe de clic: seno corto con caída exponencial. */
function golpe(salida, inicio, sr, { freq = 1000, volumen = 0.7, duracion = 0.045 }) {
  const n = Math.floor(sr * duracion);
  for (let i = 0; i < n; i++) {
    const pos = inicio + i;
    if (pos >= salida.length) break;
    const env = Math.exp(-i / (sr * 0.012));
    salida[pos] += Math.sin((TAU * freq * i) / sr) * env * volumen;
  }
}

/**
 * Pista de clic completa a partir de la estructura de la canción.
 * @param {object} opciones
 * @param {number} opciones.bpm
 * @param {string} opciones.compas  '4/4', '3/4', '6/8'
 * @param {number} opciones.compases  compases totales (si no hay secciones)
 * @param {{nombre:string, compases:number}[]} opciones.secciones
 * @param {number} opciones.cuentaEntrada  compases de cuenta antes de empezar
 */
export function generarClick({
  bpm = 80, compas = '4/4', compases = 32, secciones = null,
  cuentaEntrada = 1, sampleRate = 44100, avisoDeSeccion = true, subdivision = 1,
} = {}) {
  const pulsosPorCompas = Number(String(compas).split('/')[0]) || 4;
  const segundosPorPulso = 60 / bpm;
  const lista = secciones?.length ? secciones : [{ nombre: 'Canción', compases }];
  const totalCompases = cuentaEntrada + lista.reduce((n, s) => n + (s.compases || 4), 0);
  const duracion = totalCompases * pulsosPorCompas * segundosPorPulso + 1;
  const salida = new Float32Array(Math.ceil(duracion * sampleRate));

  let compasActual = 0;
  const marcas = [];

  const escribirCompas = (esPrimeroDeSeccion, esCuenta) => {
    for (let pulso = 0; pulso < pulsosPorCompas; pulso++) {
      const t = (compasActual * pulsosPorCompas + pulso) * segundosPorPulso;
      const muestra = Math.floor(t * sampleRate);
      const acentuado = pulso === 0;
      golpe(salida, muestra, sampleRate, {
        freq: esCuenta ? 1800 : acentuado ? 1500 : 1000,
        volumen: acentuado ? 0.75 : 0.4,
      });
      // Subdivisión opcional (corcheas) para tempos lentos.
      for (let sub = 1; sub < subdivision; sub++) {
        const ts = t + (segundosPorPulso * sub) / subdivision;
        golpe(salida, Math.floor(ts * sampleRate), sampleRate, { freq: 800, volumen: 0.18, duracion: 0.025 });
      }
      // Aviso de cambio de sección: dos golpes agudos en el último pulso del compás previo.
      if (avisoDeSeccion && esPrimeroDeSeccion && pulso === 0) {
        golpe(salida, muestra, sampleRate, { freq: 2400, volumen: 0.5, duracion: 0.06 });
      }
    }
    compasActual++;
  };

  for (let i = 0; i < cuentaEntrada; i++) escribirCompas(false, true);
  for (const seccion of lista) {
    marcas.push({
      nombre: seccion.nombre,
      compas: compasActual - cuentaEntrada + 1,
      t: Number((compasActual * pulsosPorCompas * segundosPorPulso).toFixed(2)),
    });
    const n = seccion.compases || 4;
    for (let i = 0; i < n; i++) escribirCompas(i === 0, false);
  }

  return { audio: salida, sampleRate, duracion: salida.length / sampleRate, marcas, totalCompases };
}

/** Colchón sostenido (pad) en la tonalidad: fundamental, quinta y novena. */
export function generarPad({ key = 'C', duracion = 30, sampleRate = 44100, volumen = 0.28 } = {}) {
  const info = keyInfo(key);
  const tonica = noteToPc(info.tonic) ?? 0;
  const midiBase = 36 + tonica;                       // grave, sin estorbar a la voz
  const notas = [midiBase, midiBase + 7, midiBase + 12, midiBase + 19, midiBase + 26];
  const n = Math.ceil(duracion * sampleRate);
  const salida = new Float32Array(n);
  const ataque = sampleRate * 2.5;
  const caida = sampleRate * 3;

  for (const midi of notas) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    // Dos osciladores ligeramente desafinados: es lo que le da cuerpo a un pad.
    for (const detune of [-0.15, 0.15]) {
      const freq = f * Math.pow(2, detune / 12);
      let fase = Math.random() * TAU;
      for (let i = 0; i < n; i++) {
        fase += (TAU * freq) / sampleRate;
        const env = Math.min(1, i / ataque) * Math.min(1, (n - i) / caida);
        // Onda suave (seno + un poco de tercer armónico) para que no suene a pito.
        salida[i] += (Math.sin(fase) + 0.18 * Math.sin(fase * 3)) * env;
      }
    }
  }
  const pico = salida.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  for (let i = 0; i < n; i++) salida[i] = (salida[i] / pico) * volumen;
  return { audio: salida, sampleRate, duracion, key: info.key };
}

/** Empaqueta muestras en un archivo .wav (PCM 16 bits). */
export function codificarWav(canales, sampleRate = 44100) {
  const lista = Array.isArray(canales) ? canales : [canales];
  const nCanales = lista.length;
  const nMuestras = lista[0].length;
  const bytesDatos = nMuestras * nCanales * 2;
  const buffer = new ArrayBuffer(44 + bytesDatos);
  const view = new DataView(buffer);
  const texto = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };

  texto(0, 'RIFF');
  view.setUint32(4, 36 + bytesDatos, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);                    // PCM
  view.setUint16(22, nCanales, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * nCanales * 2, true);
  view.setUint16(32, nCanales * 2, true);
  view.setUint16(34, 16, true);
  texto(36, 'data');
  view.setUint32(40, bytesDatos, true);

  let offset = 44;
  for (let i = 0; i < nMuestras; i++) {
    for (let c = 0; c < nCanales; c++) {
      const v = Math.max(-1, Math.min(1, lista[c][i] || 0));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}

/** Calcula los compases de cada sección a partir de la línea de tiempo de la canción. */
export function seccionesDesdeCancion(song, timeline = []) {
  const bpm = song.bpm || 80;
  const pulsos = Number(String(song.timeSignature || '4/4').split('/')[0]) || 4;
  const segundosPorCompas = (pulsos * 60) / bpm;
  if (!timeline.length) return null;
  return timeline.map((seg) => ({
    nombre: seg.name,
    compases: Math.max(1, Math.round((seg.end - seg.start) / segundosPorCompas)),
  }));
}
