/**
 * iconos.mjs — Genera los iconos PNG de la app a partir del mismo dibujo que
 * el SVG.
 *
 * ¿Por qué no basta el SVG? Porque iOS **ignora** un `apple-touch-icon` que no
 * sea PNG: al añadir la app a la pantalla de inicio del iPhone sale un
 * recuadro gris o una miniatura de la página. Android tampoco ofrece
 * «Instalar» de forma fiable sin un PNG de 192 px o más.
 *
 * Y como aquí no hay dependencias, el PNG se dibuja a mano: un rasterizador
 * mínimo (rectángulos redondeados, círculos y una línea con puntas redondas)
 * con 3×3 muestras por píxel para que los bordes no queden dentados, y zlib —
 * que viene con Node— para comprimir.
 *
 *   node tools/iconos.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const LADO = 512;                 // el dibujo está pensado en 512×512
const MUESTRAS = 3;               // 3×3 por píxel

/* ------------------------- distancias ------------------------- */

const dRectRedondo = (px, py, x, y, w, h, r) => {
  const cx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
  const cy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
  const fuera = Math.hypot(Math.max(cx, 0), Math.max(cy, 0));
  return fuera + Math.min(Math.max(cx, cy), 0) - r;
};

const dCirculo = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;

/** Distancia a un segmento: es lo que da las puntas y las uniones redondas. */
const dSegmento = (px, py, ax, ay, bx, by) => {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
};

const dLinea = (px, py, puntos, grosor) => {
  let d = Infinity;
  for (let i = 0; i < puntos.length - 1; i++) {
    const [ax, ay] = puntos[i];
    const [bx, by] = puntos[i + 1];
    d = Math.min(d, dSegmento(px, py, ax, ay, bx, by));
  }
  return d - grosor / 2;
};

/* --------------------------- el dibujo --------------------------- */

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
];

// Las mismas figuras, en el mismo orden, que recordatorios/assets/icono.svg.
// El fondo va aparte porque cada destino lo quiere distinto: iOS pone su
// propia máscara y Android recorta lo que le da la gana.
const FONDO = '#0f1115';
const CAPAS = [
  { color: '#1b2029', d: (x, y) => dRectRedondo(x, y, 96, 104, 320, 312, 40) },
  { color: '#2a313d', d: (x, y) => Math.abs(dRectRedondo(x, y, 96, 104, 320, 312, 40)) - 5 },
  { color: '#4a9eff', d: (x, y) => dRectRedondo(x, y, 96, 104, 320, 72, 36) },
  { color: '#e7ecf3', d: (x, y) => dCirculo(x, y, 168, 92, 20) },
  { color: '#e7ecf3', d: (x, y) => dCirculo(x, y, 344, 92, 20) },
  { color: '#35c48b', d: (x, y) => dLinea(x, y, [[152, 262], [204, 314], [312, 196]], 30) },
  { color: '#2a313d', d: (x, y) => dRectRedondo(x, y, 152, 344, 208, 20, 10) },
];

/**
 * Pinta el icono a un búfer RGBA.
 *
 *   radio  esquinas del fondo (0 = cuadrado entero, sin transparencia).
 *   zoom   encoge el dibujo hacia el centro, para la «zona segura» de Android.
 */
function dibujar(lado, { radio = 112, zoom = 1 } = {}) {
  const escala = LADO / lado;
  const pixeles = Buffer.alloc(lado * lado * 4);
  const centro = LADO / 2;
  const capas = [
    { color: FONDO, d: (x, y) => dRectRedondo(x, y, 0, 0, 512, 512, radio) },
    // Encoger es mirar el dibujo desde más lejos: se alejan las coordenadas.
    ...CAPAS.map((c) => ({
      ...c,
      d: (x, y) => c.d(centro + (x - centro) / zoom, centro + (y - centro) / zoom) / zoom,
    })),
  ].map((c) => ({ ...c, rgb: rgb(c.color) }));

  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      let [r, g, b, a] = [0, 0, 0, 0];

      for (const capa of capas) {
        // Cobertura: cuántas de las 9 muestras caen dentro de la figura.
        let dentro = 0;
        for (let sy = 0; sy < MUESTRAS; sy++) {
          for (let sx = 0; sx < MUESTRAS; sx++) {
            const x = (px + (sx + 0.5) / MUESTRAS) * escala;
            const y = (py + (sy + 0.5) / MUESTRAS) * escala;
            if (capa.d(x, y) <= 0) dentro++;
          }
        }
        if (!dentro) continue;
        const alfa = dentro / (MUESTRAS * MUESTRAS);
        const [cr, cg, cb] = capa.rgb;
        r = cr * alfa + r * (1 - alfa);
        g = cg * alfa + g * (1 - alfa);
        b = cb * alfa + b * (1 - alfa);
        a = alfa + a * (1 - alfa);
      }

      const i = (py * lado + px) * 4;
      pixeles[i] = Math.round(r);
      pixeles[i + 1] = Math.round(g);
      pixeles[i + 2] = Math.round(b);
      pixeles[i + 3] = Math.round(a * 255);
    }
  }
  return pixeles;
}

/* ---------------------------- el PNG ---------------------------- */

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const trozo = (tipo, datos) => {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
};

function aPNG(pixeles, lado) {
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0);
  cabecera.writeUInt32BE(lado, 4);
  cabecera[8] = 8;        // bits por canal
  cabecera[9] = 6;        // RGBA
  // Cada fila lleva delante su byte de filtro; 0 = sin filtro.
  const filas = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y++) {
    filas[y * (lado * 4 + 1)] = 0;
    pixeles.copy(filas, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', deflateSync(filas, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------- salida ----------------------------- */

const SALIDAS = [
  // iOS redondea por su cuenta: si le damos las esquinas transparentes, salen
  // negras. Cuadrado entero.
  ['recordatorios/assets/icono-180.png', 180, { radio: 0 }],
  ['recordatorios/assets/icono-192.png', 192, {}],
  ['recordatorios/assets/icono-512.png', 512, {}],
  // «Maskable»: Android recorta con la forma que use el móvil (círculo, gota,
  // cuadrado), así que el fondo llena todo y el dibujo se queda en el centro.
  ['recordatorios/assets/icono-mascara.png', 512, { radio: 0, zoom: 0.72 }],
];

for (const [ruta, lado, opciones] of SALIDAS) {
  const png = aPNG(dibujar(lado, opciones), lado);
  writeFileSync(resolve(RAIZ, ruta), png);
  console.log(`  ${ruta}  ${lado}×${lado}  ${(png.length / 1024).toFixed(1)} kB`);
}
