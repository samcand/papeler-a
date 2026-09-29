/**
 * ambiente.js — Ruido para tapar el ruido.
 *
 * Nada de archivos de audio: el sonido se genera en el navegador, así que no
 * pesa, no se descarga y funciona sin internet como el resto de la app.
 *
 * - **blanco**: todas las frecuencias por igual, el más "siseante";
 * - **rosa**: baja 3 dB por octava, parecido a la lluvia lejana;
 * - **marrón**: baja 6 dB, como una cascada o un ventilador;
 * - **lluvia**: ruido rosa filtrado con una ondulación lenta encima.
 */

export const SONIDOS = [
  { id: 'blanco', nombre: 'Ruido blanco', descripcion: 'Siseo parejo. Tapa conversaciones.' },
  { id: 'rosa', nombre: 'Ruido rosa', descripcion: 'Más suave que el blanco; el de la lluvia lejana.' },
  { id: 'marron', nombre: 'Ruido marrón', descripcion: 'Grave, como una cascada o un ventilador.' },
  { id: 'lluvia', nombre: 'Lluvia', descripcion: 'Ruido rosa con ondulación lenta.' },
];

let ctx = null;
let fuente = null;
let ganancia = null;
let oscilador = null;

/** Un búfer de ruido de varios segundos que se reproduce en bucle. */
function generarBuffer(contexto, tipo, segundos = 4) {
  const muestras = contexto.sampleRate * segundos;
  const buffer = contexto.createBuffer(1, muestras, contexto.sampleRate);
  const datos = buffer.getChannelData(0);

  if (tipo === 'blanco') {
    for (let i = 0; i < muestras; i++) datos[i] = Math.random() * 2 - 1;
    return buffer;
  }
  if (tipo === 'marron') {
    let ultimo = 0;
    for (let i = 0; i < muestras; i++) {
      const blanco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * blanco) / 1.02;
      datos[i] = ultimo * 3.5;
    }
    return buffer;
  }
  // Rosa (y base de la lluvia): filtro de Voss-McCartney simplificado.
  let b0 = 0; let b1 = 0; let b2 = 0; let b3 = 0; let b4 = 0; let b5 = 0; let b6 = 0;
  for (let i = 0; i < muestras; i++) {
    const blanco = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + blanco * 0.0555179;
    b1 = 0.99332 * b1 + blanco * 0.0750759;
    b2 = 0.96900 * b2 + blanco * 0.1538520;
    b3 = 0.86650 * b3 + blanco * 0.3104856;
    b4 = 0.55000 * b4 + blanco * 0.5329522;
    b5 = -0.7616 * b5 - blanco * 0.0168980;
    datos[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + blanco * 0.5362) * 0.11;
    b6 = blanco * 0.115926;
  }
  return buffer;
}

export function sonando() {
  return !!fuente;
}

/** Arranca (o cambia) el sonido de fondo. */
export function reproducir(tipo = 'rosa', volumen = 0.35) {
  parar();
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return false;
  ctx = ctx || new Ctx();
  if (ctx.state === 'suspended') ctx.resume();

  fuente = ctx.createBufferSource();
  fuente.buffer = generarBuffer(ctx, tipo === 'lluvia' ? 'rosa' : tipo);
  fuente.loop = true;

  ganancia = ctx.createGain();
  ganancia.gain.value = volumen;

  if (tipo === 'lluvia') {
    // Un paso bajo y una ondulación lenta: deja de sonar a "siseo de radio".
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 1800;
    oscilador = ctx.createOscillator();
    oscilador.frequency.value = 0.08;
    const vaiven = ctx.createGain();
    vaiven.gain.value = 0.12;
    oscilador.connect(vaiven).connect(ganancia.gain);
    oscilador.start();
    fuente.connect(filtro).connect(ganancia).connect(ctx.destination);
  } else {
    fuente.connect(ganancia).connect(ctx.destination);
  }

  fuente.start();
  return true;
}

export function ajustarVolumen(volumen) {
  if (ganancia) ganancia.gain.value = Math.max(0, Math.min(1, volumen));
}

export function parar() {
  try { fuente?.stop(); } catch { /* ya estaba parado */ }
  try { oscilador?.stop(); } catch { /* idem */ }
  fuente = null;
  oscilador = null;
  ganancia = null;
}
