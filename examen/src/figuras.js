/**
 * figuras.js — Dibuja las figuras del razonamiento abstracto.
 *
 * Las preguntas de series y matrices no se pueden escribir con palabras sin
 * delatar la respuesta, así que cada figura se describe con un objeto pequeño
 * y aquí se convierte en SVG. Ventaja: el banco sigue siendo texto (se versiona,
 * se exporta y se revisa) y no hay que cargar imágenes.
 *
 *   { forma:'pentagono', giro:45, relleno:'rayado', puntos:2, interior:'circulo' }
 *
 * forma     triangulo | cuadrado | pentagono | hexagono | heptagono | octagono |
 *           circulo | flecha | ele | interrogante | vacio
 * giro      grados en sentido horario
 * relleno   ninguno | solido | rayado | mitad
 * puntos    0..5 puntos repartidos dentro de la figura
 * interior  circulo | cuadrado | triangulo | null
 */

const LADOS = {
  triangulo: 3, cuadrado: 4, pentagono: 5, hexagono: 6, heptagono: 7, octagono: 8,
};

export const NOMBRES_FORMA = {
  triangulo: 'triángulo', cuadrado: 'cuadrado', pentagono: 'pentágono',
  hexagono: 'hexágono', heptagono: 'heptágono', octagono: 'octágono',
  circulo: 'círculo', flecha: 'flecha', ele: 'ele',
};

let contador = 0;

function poligono(n, radio = 36, cx = 50, cy = 50) {
  // Con un vértice arriba, un polígono de lados pares queda "de punta": el
  // cuadrado se vería como un rombo. Los pares se giran medio sector para que
  // se apoyen sobre un lado, que es como los dibuja cualquier examen.
  const inicio = -90 + (n % 2 === 0 ? 180 / n : 0);
  const puntos = [];
  for (let i = 0; i < n; i++) {
    const a = (inicio + (360 * i) / n) * (Math.PI / 180);
    puntos.push(`${(cx + radio * Math.cos(a)).toFixed(2)},${(cy + radio * Math.sin(a)).toFixed(2)}`);
  }
  return puntos.join(' ');
}

function contorno(forma, radio = 36) {
  if (forma === 'circulo') return `<circle cx="50" cy="50" r="${radio}" />`;
  if (forma === 'ele') return `<polygon points="28,20 48,20 48,60 72,60 72,80 28,80" />`;
  if (forma === 'flecha') {
    return `<path d="M50 14 L50 86 M50 14 L34 34 M50 14 L66 34" />`;
  }
  const n = LADOS[forma];
  if (!n) return '';
  return `<polygon points="${poligono(n, radio)}" />`;
}

function puntosInternos(cantidad) {
  if (!cantidad) return '';
  if (cantidad === 1) return `<circle class="punto" cx="50" cy="50" r="5" />`;
  const salida = [];
  for (let i = 0; i < cantidad; i++) {
    const a = (-90 + (360 * i) / cantidad) * (Math.PI / 180);
    const x = 50 + 15 * Math.cos(a);
    const y = 50 + 15 * Math.sin(a);
    salida.push(`<circle class="punto" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" />`);
  }
  return salida.join('');
}

function figuraInterior(tipo) {
  if (!tipo) return '';
  if (tipo === 'circulo') return `<circle class="trazo" cx="50" cy="50" r="13" />`;
  if (tipo === 'cuadrado') return `<rect class="trazo" x="37" y="37" width="26" height="26" />`;
  if (tipo === 'triangulo') return `<polygon class="trazo" points="${poligono(3, 16)}" />`;
  if (tipo === 'punto') return `<circle class="punto" cx="50" cy="50" r="6" />`;
  return '';
}

/** Devuelve el SVG (texto) de una figura. `id` hace únicos los patrones del relleno. */
export function svgFigura(spec = {}, id = ++contador) {
  const forma = spec.forma || 'vacio';
  if (forma === 'vacio') return `<svg viewBox="0 0 100 100" aria-hidden="true"></svg>`;
  if (forma === 'interrogante') {
    return `<svg viewBox="0 0 100 100" role="img" aria-label="figura que falta">` +
      `<text class="interrogante" x="50" y="66">?</text></svg>`;
  }

  const trazo = contorno(forma);
  const relleno = spec.relleno || 'ninguno';
  const clip = `clip-${id}`;
  const rayas = `rayas-${id}`;
  let defs = '';
  let cuerpo = '';

  if (relleno === 'solido') {
    cuerpo = trazo.replace('<polygon ', '<polygon class="lleno" ')
      .replace('<circle ', '<circle class="lleno" ')
      .replace('<path ', '<path class="lleno" ');
  } else {
    cuerpo = trazo.replace('<polygon ', '<polygon class="trazo" ')
      .replace('<circle ', '<circle class="trazo" ')
      .replace('<path ', '<path class="trazo" ');
    if (relleno === 'rayado' || relleno === 'mitad') {
      const marca = relleno === 'rayado'
        ? `<pattern id="${rayas}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
          `<line class="rayado" x1="0" y1="0" x2="0" y2="10" /></pattern>`
        : '';
      defs = `<defs><clipPath id="${clip}">${trazo}</clipPath>${marca}</defs>`;
      const pintado = relleno === 'rayado'
        ? `<rect x="0" y="0" width="100" height="100" fill="url(#${rayas})" clip-path="url(#${clip})" />`
        : `<rect x="0" y="0" width="50" height="100" fill="currentColor" clip-path="url(#${clip})" />`;
      cuerpo = pintado + cuerpo;
    }
  }

  const giro = Number(spec.giro || 0);
  const espejo = spec.espejo ? ' scale(-1,1) translate(-100,0)' : '';
  const grupo = `<g transform="rotate(${giro} 50 50)${espejo}">${cuerpo}${figuraInterior(spec.interior)}</g>`;
  const puntos = puntosInternos(spec.puntos || 0);

  return `<svg viewBox="0 0 100 100" role="img" aria-label="${describir(spec)}">${defs}${grupo}${puntos}</svg>`;
}

/** Texto alternativo: que un lector de pantalla pueda al menos nombrar la figura. */
export function describir(spec = {}) {
  if (!spec.forma || spec.forma === 'vacio') return 'figura vacía';
  if (spec.forma === 'interrogante') return 'figura que falta';
  const partes = [NOMBRES_FORMA[spec.forma] || spec.forma];
  if (spec.relleno && spec.relleno !== 'ninguno') partes.push(spec.relleno);
  if (spec.giro) partes.push(`girado ${spec.giro} grados`);
  if (spec.puntos) partes.push(`con ${spec.puntos} punto${spec.puntos > 1 ? 's' : ''}`);
  if (spec.interior) partes.push(`con un ${spec.interior} dentro`);
  return partes.join(', ');
}

/** Nodo listo para el DOM (lo usa la vista de práctica). */
export function nodoFigura(spec, clase = 'figura') {
  const div = document.createElement('div');
  div.className = clase;
  div.innerHTML = svgFigura(spec);
  return div;
}
