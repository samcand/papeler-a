/**
 * graficos.js — Dibuja los "textos discontinuos" del examen.
 *
 * La lectura crítica del Saber 11 y el análisis de la imagen de la UNAL no
 * preguntan solo sobre párrafos: preguntan sobre gráficas de barras, líneas,
 * circulares, pictogramas, planos y mapas. Igual que con las figuras del
 * razonamiento abstracto, cada gráfico se describe con un objeto pequeño y
 * aquí se convierte en SVG, de modo que el banco sigue siendo texto revisable.
 *
 *   { tipo: 'barras', titulo: '…', ejeY: '%', datos: [{ etiqueta: '2020', valor: 34 }] }
 *
 * Tipos: barras | lineas | circular | pictograma | plano | mapa
 *
 * Los colores salen de clases CSS, así que el gráfico se adapta solo al tema
 * claro y al oscuro.
 */

const ANCHO = 400;
const ALTO = 260;
const COLORES = 5;   // clases g-c1 … g-c5 definidas en estilos.css

function esc(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function titulo(spec) {
  return spec.titulo ? `<text class="g-titulo" x="${ANCHO / 2}" y="18" text-anchor="middle">${esc(spec.titulo)}</text>` : '';
}

/** Escala "bonita": redondea el máximo hacia arriba para que el eje tenga números limpios. */
function topeEje(valores) {
  const max = Math.max(...valores, 0);
  if (max === 0) return 1;
  const magnitud = Math.pow(10, Math.floor(Math.log10(max)));
  for (const paso of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (max <= paso * magnitud) return paso * magnitud;
  }
  return 10 * magnitud;
}

function ejes(tope, etiquetas, { izq = 48, abajo = 38, arriba = 30, der = 14 } = {}) {
  const x0 = izq;
  const y0 = ALTO - abajo;
  const ancho = ANCHO - izq - der;
  const alto = ALTO - arriba - abajo;
  let svg = `<line class="g-eje" x1="${x0}" y1="${arriba}" x2="${x0}" y2="${y0}" />`
    + `<line class="g-eje" x1="${x0}" y1="${y0}" x2="${x0 + ancho}" y2="${y0}" />`;
  for (let i = 0; i <= 2; i++) {
    const v = (tope / 2) * i;
    const y = y0 - (alto * i) / 2;
    svg += `<line class="g-guia" x1="${x0}" y1="${y}" x2="${x0 + ancho}" y2="${y}" />`
      + `<text class="g-texto" x="${x0 - 6}" y="${y + 4}" text-anchor="end">${formatear(v)}</text>`;
  }
  const paso = ancho / etiquetas.length;
  etiquetas.forEach((e, i) => {
    svg += `<text class="g-texto" x="${x0 + paso * (i + 0.5)}" y="${y0 + 16}" text-anchor="middle">${esc(e)}</text>`;
  });
  return { svg, x0, y0, ancho, alto, paso };
}

function formatear(v) {
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 10) / 10).replace('.', ',');
}

function barras(spec) {
  const valores = spec.datos.map((d) => d.valor);
  const tope = spec.tope || topeEje(valores);
  const base = ejes(tope, spec.datos.map((d) => d.etiqueta));
  let svg = base.svg;
  spec.datos.forEach((d, i) => {
    const h = (d.valor / tope) * base.alto;
    const w = base.paso * 0.56;
    const x = base.x0 + base.paso * (i + 0.5) - w / 2;
    const y = base.y0 - h;
    svg += `<rect class="g-barra g-c${(i % COLORES) + 1}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" />`
      + `<text class="g-valor" x="${(x + w / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${formatear(d.valor)}</text>`;
  });
  if (spec.ejeY) svg += `<text class="g-texto" x="6" y="${ALTO - 46}" >${esc(spec.ejeY)}</text>`;
  return titulo(spec) + svg;
}

function lineas(spec) {
  const todos = spec.series.flatMap((s) => s.valores);
  const tope = spec.tope || topeEje(todos);
  const base = ejes(tope, spec.etiquetas);
  let svg = base.svg;
  spec.series.forEach((serie, k) => {
    const puntos = serie.valores.map((v, i) => {
      const x = base.x0 + base.paso * (i + 0.5);
      const y = base.y0 - (v / tope) * base.alto;
      return [x, y];
    });
    svg += `<polyline class="g-linea g-t${(k % COLORES) + 1}" points="${puntos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" />`;
    svg += puntos.map(([x, y]) => `<circle class="g-punto g-c${(k % COLORES) + 1}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" />`).join('');
  });
  if (spec.series.length > 1) {
    svg += spec.series.map((s, k) =>
      `<rect class="g-barra g-c${(k % COLORES) + 1}" x="${base.x0 + 4 + k * 110}" y="${ALTO - 14}" width="10" height="8" rx="2" />`
      + `<text class="g-texto" x="${base.x0 + 18 + k * 110}" y="${ALTO - 6}">${esc(s.nombre)}</text>`).join('');
  }
  if (spec.ejeY) svg += `<text class="g-texto" x="6" y="${ALTO - 46}">${esc(spec.ejeY)}</text>`;
  return titulo(spec) + svg;
}

function circular(spec) {
  const total = spec.datos.reduce((s, d) => s + d.valor, 0) || 1;
  const cx = 130;
  const cy = 148;
  const r = 82;
  let angulo = -Math.PI / 2;
  let svg = '';
  spec.datos.forEach((d, i) => {
    const barrido = (d.valor / total) * Math.PI * 2;
    const fin = angulo + barrido;
    const x1 = cx + r * Math.cos(angulo);
    const y1 = cy + r * Math.sin(angulo);
    const x2 = cx + r * Math.cos(fin);
    const y2 = cy + r * Math.sin(fin);
    const grande = barrido > Math.PI ? 1 : 0;
    svg += `<path class="g-sector g-c${(i % COLORES) + 1}" d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${grande} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" />`;
    angulo = fin;
  });
  spec.datos.forEach((d, i) => {
    const y = 60 + i * 22;
    const pct = Math.round((d.valor / total) * 100);
    svg += `<rect class="g-barra g-c${(i % COLORES) + 1}" x="250" y="${y - 9}" width="12" height="12" rx="3" />`
      + `<text class="g-texto" x="270" y="${y + 1}">${esc(d.etiqueta)}: ${pct} %</text>`;
  });
  return titulo(spec) + svg;
}

function pictograma(spec) {
  const unidad = spec.unidad || 1;
  let svg = '';
  spec.filas.forEach((fila, i) => {
    const y = 52 + i * 34;
    svg += `<text class="g-texto" x="12" y="${y + 5}">${esc(fila.etiqueta)}</text>`;
    const cuantos = Math.round(fila.valor / unidad);
    for (let k = 0; k < cuantos; k++) {
      svg += `<circle class="g-punto g-c${(i % COLORES) + 1}" cx="${110 + k * 22}" cy="${y}" r="8" />`;
    }
  });
  svg += `<text class="g-texto" x="12" y="${ALTO - 10}">Cada círculo equivale a ${formatear(unidad)} ${esc(spec.nombreUnidad || 'unidades')}.</text>`;
  return titulo(spec) + svg;
}

function plano(spec) {
  // Coordenadas de 0 a 100; se escalan al lienzo.
  const ex = (v) => 30 + (v / 100) * 340;
  const ey = (v) => 36 + (v / 100) * 196;
  let svg = '';
  spec.salas.forEach((s, i) => {
    svg += `<rect class="g-zona g-c${(i % COLORES) + 1}" x="${ex(s.x).toFixed(1)}" y="${ey(s.y).toFixed(1)}" `
      + `width="${((s.w / 100) * 340).toFixed(1)}" height="${((s.h / 100) * 196).toFixed(1)}" />`
      + `<text class="g-texto" x="${ex(s.x + s.w / 2).toFixed(1)}" y="${ey(s.y + s.h / 2).toFixed(1)}" text-anchor="middle">${esc(s.etiqueta)}</text>`;
  });
  (spec.marcas || []).forEach((m) => {
    svg += `<text class="g-valor" x="${ex(m.x).toFixed(1)}" y="${ey(m.y).toFixed(1)}" text-anchor="middle">${esc(m.texto)}</text>`;
  });
  return titulo(spec) + svg;
}

function mapa(spec) {
  const ex = (v) => 24 + (v / 100) * 250;
  const ey = (v) => 36 + (v / 100) * 196;
  let svg = '';
  spec.zonas.forEach((z) => {
    svg += `<rect class="g-zona g-nivel${z.nivel}" x="${ex(z.x).toFixed(1)}" y="${ey(z.y).toFixed(1)}" `
      + `width="${((z.w / 100) * 250).toFixed(1)}" height="${((z.h / 100) * 196).toFixed(1)}" rx="4" />`
      + `<text class="g-texto" x="${ex(z.x + z.w / 2).toFixed(1)}" y="${ey(z.y + z.h / 2).toFixed(1)}" text-anchor="middle">${esc(z.etiqueta)}</text>`;
  });
  (spec.leyenda || []).forEach((l, i) => {
    const y = 64 + i * 24;
    svg += `<rect class="g-zona g-nivel${l.nivel}" x="296" y="${y - 10}" width="14" height="14" rx="3" />`
      + `<text class="g-texto" x="318" y="${y + 1}">${esc(l.texto)}</text>`;
  });
  return titulo(spec) + svg;
}

const DIBUJANTES = { barras, lineas, circular, pictograma, plano, mapa };

export const TIPOS_GRAFICO = Object.keys(DIBUJANTES);

/** Devuelve el SVG (texto) de un gráfico. */
export function svgGrafico(spec = {}) {
  const dibujar = DIBUJANTES[spec.tipo];
  if (!dibujar) return `<svg viewBox="0 0 ${ANCHO} ${ALTO}" aria-hidden="true"></svg>`;
  return `<svg viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="${esc(describirGrafico(spec))}">${dibujar(spec)}</svg>`;
}

/** Texto alternativo con los datos, para que el gráfico sea legible sin verlo. */
export function describirGrafico(spec = {}) {
  const t = spec.titulo ? spec.titulo + '. ' : '';
  if (spec.tipo === 'barras' || spec.tipo === 'circular') {
    return t + spec.datos.map((d) => `${d.etiqueta}: ${formatear(d.valor)}`).join('; ');
  }
  if (spec.tipo === 'lineas') {
    return t + spec.series.map((s) => `${s.nombre}: ${s.valores.map(formatear).join(', ')}`).join('; ');
  }
  if (spec.tipo === 'pictograma') {
    return t + spec.filas.map((f) => `${f.etiqueta}: ${formatear(f.valor)}`).join('; ');
  }
  if (spec.tipo === 'plano') return t + 'plano con ' + spec.salas.map((s) => s.etiqueta).join(', ');
  if (spec.tipo === 'mapa') return t + 'mapa con ' + spec.zonas.map((z) => `${z.etiqueta} (nivel ${z.nivel})`).join(', ');
  return t + 'gráfico';
}

/** Nodo listo para el DOM. */
export function nodoGrafico(spec) {
  const div = document.createElement('div');
  div.className = 'grafico';
  div.innerHTML = svgGrafico(spec);
  return div;
}
