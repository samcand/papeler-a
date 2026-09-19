/**
 * qr.js — Generador de códigos QR (modo byte, corrección de errores nivel L).
 *
 * Se usa para compartir el set con el equipo: cada músico escanea y queda con
 * las canciones en su celular, sin servidor y sin cuentas.
 */

import { BLOQUES_RS, ALINEACION } from './qr-tables.js';

// --- Aritmética en GF(256), que es donde vive Reed-Solomon ---
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;      // polinomio primitivo del estándar
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Polinomio generador para n codewords de corrección. */
function generador(n) {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const siguiente = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      // (x + α^i) · poly: el término de mayor grado se desplaza y el otro se multiplica
      siguiente[j] ^= poly[j];
      siguiente[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = siguiente;
  }
  return poly;
}

/** Codewords de corrección de un bloque de datos. */
function correccion(datos, nEC) {
  const gen = generador(nEC);
  const resto = new Array(datos.length + nEC).fill(0);
  datos.forEach((d, i) => { resto[i] = d; });
  for (let i = 0; i < datos.length; i++) {
    const coef = resto[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) resto[i + j] ^= mul(gen[j], coef);
  }
  return resto.slice(datos.length);
}

const capacidadDatos = (version) =>
  BLOQUES_RS[version - 1].reduce((n, [bloques, , datos]) => n + bloques * datos, 0);

/** Versión más pequeña donde caben los bytes. */
function versionPara(bytes) {
  for (let v = 1; v <= 40; v++) {
    const cabecera = 4 + (v < 10 ? 8 : 16);
    if (capacidadDatos(v) * 8 >= cabecera + bytes * 8) return v;
  }
  return null;
}

export function capacidadBytes(version) {
  const cabecera = 4 + (version < 10 ? 8 : 16);
  return Math.floor((capacidadDatos(version) * 8 - cabecera) / 8);
}

/** Codifica el texto en codewords ya intercalados con su corrección. */
function codificar(texto, version) {
  const bytes = new TextEncoder().encode(texto);
  const bits = [];
  const empujar = (valor, largo) => {
    for (let i = largo - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  };
  empujar(0b0100, 4);                                    // modo byte
  empujar(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) empujar(b, 8);

  const totalDatos = capacidadDatos(version);
  const maxBits = totalDatos * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);   // terminador
  while (bits.length % 8 !== 0) bits.push(0);
  const relleno = [0xec, 0x11];
  let k = 0;
  while (bits.length < maxBits) { empujar(relleno[k++ % 2], 8); }

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    codewords.push(v);
  }

  // Repartir en bloques y calcular corrección
  const bloquesDatos = [];
  const bloquesEC = [];
  let pos = 0;
  for (const [nBloques, totalPorBloque, datosPorBloque] of BLOQUES_RS[version - 1]) {
    const nEC = totalPorBloque - datosPorBloque;
    for (let i = 0; i < nBloques; i++) {
      const datos = codewords.slice(pos, pos + datosPorBloque);
      pos += datosPorBloque;
      bloquesDatos.push(datos);
      bloquesEC.push(correccion(datos, nEC));
    }
  }

  // Intercalar: primero los datos, luego la corrección
  const salida = [];
  const maxDatos = Math.max(...bloquesDatos.map((b) => b.length));
  for (let i = 0; i < maxDatos; i++) {
    for (const bloque of bloquesDatos) if (i < bloque.length) salida.push(bloque[i]);
  }
  const maxEC = Math.max(...bloquesEC.map((b) => b.length));
  for (let i = 0; i < maxEC; i++) {
    for (const bloque of bloquesEC) if (i < bloque.length) salida.push(bloque[i]);
  }
  return salida;
}

// --- Construcción de la matriz ---
function nuevaMatriz(tam) {
  return Array.from({ length: tam }, () => new Array(tam).fill(null));
}

function ponerBuscador(m, funcional, fila, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = fila + r, x = col + c;
      if (y < 0 || y >= m.length || x < 0 || x >= m.length) continue;
      const dentro = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const borde = r === 0 || r === 6 || c === 0 || c === 6;
      const centro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      m[y][x] = dentro && (borde || centro) ? 1 : 0;
      funcional[y][x] = true;
    }
  }
}

function ponerAlineacion(m, funcional, version) {
  const pos = ALINEACION[version - 1];
  for (const fila of pos) {
    for (const col of pos) {
      if (m[fila][col] !== null) continue;             // no pisar los buscadores
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          m[fila + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0;
          funcional[fila + r][col + c] = true;
        }
      }
    }
  }
}

const BCH_FORMATO = (datos) => {
  let d = datos << 10;
  for (let i = 4; i >= 0; i--) if (d & (1 << (i + 10))) d ^= 0x537 << i;
  return ((datos << 10) | d) ^ 0x5412;
};

const BCH_VERSION = (version) => {
  let d = version << 12;
  for (let i = 5; i >= 0; i--) if (d & (1 << (i + 12))) d ^= 0x1f25 << i;
  return (version << 12) | d;
};

const MASCARAS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Penalizaciones del estándar: eligen la máscara que hace el código más legible. */
function penalizacion(m) {
  const n = m.length;
  let total = 0;

  // Regla 1: cinco o más módulos iguales seguidos
  for (let i = 0; i < n; i++) {
    for (const leer of [(k) => m[i][k], (k) => m[k][i]]) {
      let anterior = leer(0), racha = 1;
      for (let k = 1; k < n; k++) {
        const v = leer(k);
        if (v === anterior) racha++;
        else { if (racha >= 5) total += 3 + (racha - 5); anterior = v; racha = 1; }
      }
      if (racha >= 5) total += 3 + (racha - 5);
    }
  }
  // Regla 2: bloques de 2x2 del mismo color
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) total += 3;
    }
  }
  // Regla 3: patrones que se parecen al buscador
  const patrones = [[1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const p of patrones) {
        if (c + p.length <= n && p.every((v, i) => m[r][c + i] === v)) total += 40;
        if (r + p.length <= n && p.every((v, i) => m[r + i][c] === v)) total += 40;
      }
    }
  }
  // Regla 4: desequilibrio entre módulos oscuros y claros
  let oscuros = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) oscuros += m[r][c];
  const porcentaje = (oscuros * 100) / (n * n);
  total += Math.floor(Math.abs(porcentaje - 50) / 5) * 10;
  return total;
}

/**
 * Genera la matriz del QR. Devuelve un array de arrays con 0 y 1.
 * @param {string} texto
 */
export function generarQR(texto, { version = null, forzarMascara = null } = {}) {
  const bytes = new TextEncoder().encode(texto).length;
  const v = version || versionPara(bytes);
  if (!v) throw new Error('El texto es demasiado largo para un código QR (máx. ~2950 caracteres).');
  const tam = 17 + v * 4;
  const base = nuevaMatriz(tam);
  // Los patrones fijos (buscadores, sincronía, alineación, formato y versión)
  // no llevan máscara: solo se enmascaran los módulos de datos.
  const funcional = nuevaMatriz(tam).map((fila) => fila.map(() => false));

  ponerBuscador(base, funcional, 0, 0);
  ponerBuscador(base, funcional, 0, tam - 7);
  ponerBuscador(base, funcional, tam - 7, 0);
  ponerAlineacion(base, funcional, v);
  for (let i = 8; i < tam - 8; i++) {
    if (base[6][i] === null) { base[6][i] = i % 2 === 0 ? 1 : 0; funcional[6][i] = true; }
    if (base[i][6] === null) { base[i][6] = i % 2 === 0 ? 1 : 0; funcional[i][6] = true; }
  }
  base[tam - 8][8] = 1;                                   // módulo siempre oscuro
  funcional[tam - 8][8] = true;

  // Reservar zonas de formato y versión
  const reservar = (r, c) => { if (base[r][c] === null) base[r][c] = 0; funcional[r][c] = true; };
  for (let i = 0; i < 9; i++) { reservar(8, i); reservar(i, 8); }
  for (let i = 0; i < 8; i++) { reservar(8, tam - 1 - i); reservar(tam - 1 - i, 8); }
  if (v >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) { reservar(i, tam - 11 + j); reservar(tam - 11 + j, i); }
    }
  }

  // Colocar los datos en zigzag desde abajo a la derecha
  const datos = codificar(texto, v);
  const bits = [];
  for (const cw of datos) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  let bit = 0;
  let subiendo = true;
  for (let col = tam - 1; col > 0; col -= 2) {
    if (col === 6) col--;                                  // la columna de sincronía no cuenta
    for (let i = 0; i < tam; i++) {
      const fila = subiendo ? tam - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (base[fila][c] !== null) continue;
        base[fila][c] = bit < bits.length ? bits[bit] : 0;
        bit++;
      }
    }
    subiendo = !subiendo;
  }

  // Probar las ocho máscaras y quedarse con la mejor
  let mejor = null;
  const mascaras = forzarMascara != null ? [forzarMascara] : [0, 1, 2, 3, 4, 5, 6, 7];
  for (const mascara of mascaras) {
    const m = base.map((fila) => fila.slice());
    for (let r = 0; r < tam; r++) {
      for (let c = 0; c < tam; c++) {
        if (!funcional[r][c] && MASCARAS[mascara](r, c)) m[r][c] ^= 1;
      }
    }
    // Información de formato (nivel L = 01), repetida en dos sitios del código
    const formato = BCH_FORMATO((0b01 << 3) | mascara);
    for (let i = 0; i < 15; i++) {
      const b = (formato >> i) & 1;
      // Copia vertical, junto al buscador superior izquierdo y al inferior
      if (i < 6) m[i][8] = b;
      else if (i < 8) m[i + 1][8] = b;
      else m[tam - 15 + i][8] = b;
      // Copia horizontal
      if (i < 8) m[8][tam - 1 - i] = b;
      else if (i === 8) m[8][7] = b;
      else m[8][14 - i] = b;
    }
    m[tam - 8][8] = 1;
    if (v >= 7) {
      const info = BCH_VERSION(v);
      for (let i = 0; i < 18; i++) {
        const b = (info >> i) & 1;
        m[Math.floor(i / 3)][tam - 11 + (i % 3)] = b;
        m[tam - 11 + (i % 3)][Math.floor(i / 3)] = b;
      }
    }
    const p = penalizacion(m);
    if (!mejor || p < mejor.penalizacion) mejor = { matriz: m, penalizacion: p, mascara };
  }
  return { matriz: mejor.matriz, version: v, mascara: mejor.mascara, tam };
}

/** SVG del código QR, listo para mostrar o imprimir. */
export function qrSVG(texto, { tamaño = 260, margen = 4, claro = '#ffffff', oscuro = '#000000' } = {}) {
  const { matriz, tam } = generarQR(texto);
  const total = tam + margen * 2;
  const partes = [`<svg viewBox="0 0 ${total} ${total}" width="${tamaño}" height="${tamaño}" class="qr" shape-rendering="crispEdges" role="img" aria-label="Código QR">`];
  partes.push(`<rect width="${total}" height="${total}" fill="${claro}"/>`);
  for (let r = 0; r < tam; r++) {
    let c = 0;
    while (c < tam) {
      if (matriz[r][c]) {
        let largo = 1;
        while (c + largo < tam && matriz[r][c + largo]) largo++;
        partes.push(`<rect x="${c + margen}" y="${r + margen}" width="${largo}" height="1" fill="${oscuro}"/>`);
        c += largo;
      } else c++;
    }
  }
  partes.push('</svg>');
  return partes.join('');
}
