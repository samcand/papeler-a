/**
 * timestretch.js — Cambiar la velocidad sin cambiar el tono (WSOLA).
 *
 * Idea: en vez de leer el audio más lento (que baja el tono, como un disco
 * girando despacio), se corta en trozos y se vuelven a pegar solapados. Antes
 * de pegar cada trozo se busca, en una ventana pequeña, la posición donde mejor
 * "engancha" con lo anterior; así no aparecen chasquidos ni eco metálico.
 */

/** Ventana de Hann para solapar los trozos sin que se noten las uniones. */
function ventanaHann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

/** Correlación cruzada normalizada entre dos trozos. */
function parecido(a, offsetA, b, offsetB, largo) {
  let num = 0, na = 0, nb = 0;
  for (let i = 0; i < largo; i += 2) {   // de 2 en 2: suficiente y el doble de rápido
    const x = a[offsetA + i] || 0;
    const y = b[offsetB + i] || 0;
    num += x * y; na += x * x; nb += y * y;
  }
  return num / (Math.sqrt(na * nb) || 1);
}

/**
 * @param {Float32Array} entrada
 * @param {number} velocidad  0.5 = la mitad de rápido, 2 = el doble. 1 = sin cambios.
 * @returns {Float32Array} audio con la misma altura tonal y otra duración
 */
export function estirarTiempo(entrada, velocidad, { ventana = 2048, solape = 4, busqueda = 256 } = {}) {
  if (!velocidad || Math.abs(velocidad - 1) < 0.001) return entrada.slice();
  const N = ventana;
  const saltoSintesis = Math.floor(N / solape);
  const saltoAnalisis = Math.max(1, Math.round(saltoSintesis * velocidad));
  const w = ventanaHann(N);
  const largoSalida = Math.ceil(entrada.length / velocidad) + N;
  const salida = new Float32Array(largoSalida);
  const pesos = new Float32Array(largoSalida);

  let posAnalisis = 0;
  let posSalida = 0;
  // El primer trozo se copia tal cual; los siguientes se buscan para que encajen.
  while (posAnalisis + N + busqueda < entrada.length && posSalida + N < largoSalida) {
    let mejorOffset = 0;
    if (posSalida > 0) {
      // Referencia: lo último que ya escribimos en la salida.
      let mejor = -Infinity;
      const desde = Math.max(-busqueda, -posAnalisis);
      for (let off = desde; off <= busqueda; off += 4) {
        const p = parecido(salida, posSalida, entrada, posAnalisis + off, N - saltoSintesis);
        if (p > mejor) { mejor = p; mejorOffset = off; }
      }
    }
    const inicio = Math.max(0, posAnalisis + mejorOffset);
    for (let i = 0; i < N; i++) {
      const muestra = entrada[inicio + i];
      if (muestra === undefined) break;
      salida[posSalida + i] += muestra * w[i];
      pesos[posSalida + i] += w[i];
    }
    posAnalisis += saltoAnalisis;
    posSalida += saltoSintesis;
  }

  // Normalizar por el peso acumulado de las ventanas.
  for (let i = 0; i < largoSalida; i++) {
    if (pesos[i] > 0.0001) salida[i] /= pesos[i];
  }
  return salida.subarray(0, Math.min(largoSalida, Math.ceil(entrada.length / velocidad)));
}

/** Estira un AudioBuffer completo (todos sus canales) y devuelve uno nuevo. */
export function estirarBuffer(ctx, buffer, velocidad) {
  if (Math.abs(velocidad - 1) < 0.001) return buffer;
  const canales = buffer.numberOfChannels;
  const primero = estirarTiempo(buffer.getChannelData(0), velocidad);
  const salida = ctx.createBuffer(canales, primero.length, buffer.sampleRate);
  salida.getChannelData(0).set(primero);
  for (let c = 1; c < canales; c++) {
    const datos = estirarTiempo(buffer.getChannelData(c), velocidad);
    salida.getChannelData(c).set(datos.subarray(0, primero.length));
  }
  return salida;
}
