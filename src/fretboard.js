/**
 * fretboard.js — Instrumentos de trastes en general: guitarra, ukelele, bajo,
 * cuatro y afinaciones alternativas.
 *
 * En vez de un diccionario de acordes escrito a mano, busca digitaciones reales
 * sobre el mástil: prueba combinaciones de trastes y se queda con las que un ser
 * humano puede pisar (máximo 4 dedos, estiramiento de 4 trastes) y que suenan
 * completas (con la fundamental en el bajo siempre que se pueda).
 */

import { parseChord, FORMULAS, pcName } from './music.js';

export const INSTRUMENTOS = {
  guitarra: {
    nombre: 'Guitarra (estándar)', cuerdas: [40, 45, 50, 55, 59, 64],
    etiquetas: ['6ª Mi', '5ª La', '4ª Re', '3ª Sol', '2ª Si', '1ª mi'], trastes: 15,
  },
  'guitarra-dropd': {
    nombre: 'Guitarra (Drop D)', cuerdas: [38, 45, 50, 55, 59, 64],
    etiquetas: ['6ª Re', '5ª La', '4ª Re', '3ª Sol', '2ª Si', '1ª mi'], trastes: 15,
  },
  'guitarra-dadgad': {
    nombre: 'Guitarra (DADGAD)', cuerdas: [38, 45, 50, 55, 57, 62],
    etiquetas: ['Re', 'La', 'Re', 'Sol', 'La', 're'], trastes: 15,
  },
  ukelele: {
    nombre: 'Ukelele soprano (GCEA)', cuerdas: [67, 60, 64, 69],
    etiquetas: ['4ª Sol', '3ª Do', '2ª Mi', '1ª La'], trastes: 12, reentrante: true,
  },
  'ukelele-baritono': {
    nombre: 'Ukelele barítono (DGBE)', cuerdas: [50, 55, 59, 64],
    etiquetas: ['4ª Re', '3ª Sol', '2ª Si', '1ª Mi'], trastes: 12,
  },
  bajo: {
    nombre: 'Bajo 4 cuerdas', cuerdas: [28, 33, 38, 43],
    etiquetas: ['4ª Mi', '3ª La', '2ª Re', '1ª Sol'], trastes: 15, grave: true,
  },
  'bajo-5': {
    nombre: 'Bajo 5 cuerdas', cuerdas: [23, 28, 33, 38, 43],
    etiquetas: ['5ª Si', '4ª Mi', '3ª La', '2ª Re', '1ª Sol'], trastes: 15, grave: true,
  },
  cuatro: {
    nombre: 'Cuatro venezolano (ADF#B)', cuerdas: [57, 62, 66, 71],
    etiquetas: ['4ª La', '3ª Re', '2ª Fa#', '1ª Si'], trastes: 12, reentrante: true,
  },
};

const pc = (midi) => ((midi % 12) + 12) % 12;

/** Notas (clases de altura) que forman el acorde, con su grado. */
function tonosDelAcorde(nombreAcorde) {
  const c = parseChord(nombreAcorde);
  if (!c) return null;
  const formula = FORMULAS[c.suffix] || FORMULAS[''];
  const tonos = new Map();
  formula.forEach((iv, i) => { if (!tonos.has(pc(c.pc + iv))) tonos.set(pc(c.pc + iv), i); });
  return { raiz: pc(c.pc), bajo: c.bassPc != null ? pc(c.bassPc) : pc(c.pc), tonos, esencial: formula.length };
}

/**
 * Busca digitaciones tocables del acorde en el instrumento indicado.
 * @returns {{frets:number[], fingers:number[], barre:object|null, score:number}[]}
 */
export function buscarDigitaciones(nombreAcorde, instrumentoId = 'guitarra', { max = 4, trasteMax = 12 } = {}) {
  const inst = INSTRUMENTOS[instrumentoId] || INSTRUMENTOS.guitarra;
  const info = tonosDelAcorde(nombreAcorde);
  if (!info) return [];
  const n = inst.cuerdas.length;

  // Candidatos por cuerda: -1 = muda, 0..trasteMax si la nota pertenece al acorde.
  const candidatos = inst.cuerdas.map((abierta) => {
    const lista = [-1];
    for (let f = 0; f <= trasteMax; f++) if (info.tonos.has(pc(abierta + f))) lista.push(f);
    return lista;
  });

  const resultados = [];
  const actual = new Array(n).fill(-1);

  const reentrante = !!inst.reentrante;
  const grave = !!inst.grave;
  const minSonando = grave ? 2 : Math.min(3, n);

  const evaluar = () => {
    const pisados = actual.filter((f) => f > 0);
    const sonando = actual.filter((f) => f >= 0);
    if (sonando.length < minSonando) return;
    if (grave && sonando.length > 3) return;   // en el bajo nadie toca acordes de 4 notas

    // Estiramiento máximo de 4 trastes (lo que alcanza una mano).
    if (pisados.length) {
      const min = Math.min(...pisados), max2 = Math.max(...pisados);
      if (max2 - min > 3) return;
    }
    // No dejar cuerdas mudas en medio de cuerdas que suenan (difícil de apagar).
    const primera = actual.findIndex((f) => f >= 0);
    const ultima = actual.length - 1 - [...actual].reverse().findIndex((f) => f >= 0);
    for (let i = primera; i <= ultima; i++) if (actual[i] === -1) return;

    // Cuántas notas del acorde faltan. En el bajo basta fundamental + otra nota.
    const presentes = new Set(actual.map((f, i) => (f >= 0 ? pc(inst.cuerdas[i] + f) : null)).filter((x) => x != null));
    const faltan = [...info.tonos.keys()].filter((t) => !presentes.has(t));
    const faltanPermitidas = grave ? info.tonos.size - 2 : (info.esencial >= 4 && n <= 4 ? 1 : 0);
    if (faltan.length > faltanPermitidas) return;
    if (!presentes.has(info.raiz)) return;     // sin fundamental no es el acorde

    // Dedos necesarios: los del mismo traste más bajo cuentan como cejilla (1 dedo).
    const trasteMin = pisados.length ? Math.min(...pisados) : 0;
    const enCejilla = actual.filter((f) => f === trasteMin && f > 0).length;
    const dedos = pisados.filter((f) => f !== trasteMin).length + (enCejilla ? 1 : 0);
    if (dedos > 4) return;

    const bajoReal = pc(inst.cuerdas[primera] + actual[primera]);
    const posicion = pisados.length ? Math.max(...pisados) : 0;
    let score = 0;
    // La posición solo estorba cuando obliga a subir la mano por el mástil.
    score -= posicion * 0.15 + Math.max(0, posicion - 4) * 0.7;
    score += sonando.length * 0.8;                         // que suene el instrumento entero
    // Apagar una cuerda grave es normal (nadie toca la 6ª en Do); apagar una
    // aguda es perder sonido en medio del acorde.
    score -= actual.reduce((suma, f, i) => {
      if (f !== -1) return suma;
      const grave_i = !reentrante && i <= 1;
      return suma + (grave_i ? 0.5 : 2.5);
    }, 0);
    score -= dedos * 1.4 + (dedos === 4 ? 1.5 : 0);         // cuatro dedos ya es incómodo
    score += actual.filter((f) => f === 0).length * 0.9;    // cuerdas al aire: fáciles y suenan
    if (reentrante) {
      // En un ukelele la cuerda más grave no es la primera: no hay "bajo" que cuidar.
      score += 2;
    } else if (bajoReal === info.bajo) {
      score += 5;
    } else if (bajoReal === info.raiz) {
      score += 3;
    } else {
      score -= 5;                                           // inversión que nadie pidió
    }
    if (grave) score -= sonando.length * 1.2;               // el bajo toca pocas notas
    if (enCejilla > 1) score -= 1.5;
    score += presentes.size * 0.6;

    resultados.push({ frets: actual.slice(), score, dedosNecesarios: dedos, cejillaEn: enCejilla > 1 ? trasteMin : null });
  };

  const dfs = (i) => {
    if (resultados.length > 6000) return;
    if (i === n) { evaluar(); return; }
    for (const f of candidatos[i]) {
      actual[i] = f;
      dfs(i + 1);
    }
    actual[i] = -1;
  };
  dfs(0);

  resultados.sort((a, b) => b.score - a.score);
  const vistos = new Set();
  const unicos = [];
  for (const r of resultados) {
    const clave = r.frets.join(',');
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    unicos.push(asignarDedos(r, inst));
    if (unicos.length >= max) break;
  }
  return unicos;
}

/** Reparte los dedos 1-4 y detecta la cejilla. */
function asignarDedos(forma, inst) {
  const { frets } = forma;
  const pisados = frets.map((f, i) => ({ f, i })).filter((x) => x.f > 0);
  const fingers = new Array(frets.length).fill(0);
  if (!pisados.length) return { ...forma, fingers, barre: null, etiquetas: inst.etiquetas };

  const trasteMin = Math.min(...pisados.map((x) => x.f));
  const enMin = pisados.filter((x) => x.f === trasteMin);
  const hayCejilla = enMin.length > 1;
  let siguiente = 1;
  if (hayCejilla) {
    enMin.forEach((x) => { fingers[x.i] = 1; });
    siguiente = 2;
  }
  const resto = pisados
    .filter((x) => !(hayCejilla && x.f === trasteMin))
    .sort((a, b) => a.f - b.f || a.i - b.i);
  for (const x of resto) {
    fingers[x.i] = Math.min(4, siguiente++);
  }
  const barre = hayCejilla
    ? { fret: trasteMin, from: Math.min(...enMin.map((x) => x.i)), to: Math.max(...enMin.map((x) => x.i)) }
    : null;
  return { ...forma, fingers, barre, etiquetas: inst.etiquetas };
}

/** Diagrama SVG genérico para cualquier número de cuerdas. */
export function diagramaSVG(forma, { nombre = '', instrumentoId = 'guitarra', width = 140, height = 172 } = {}) {
  const inst = INSTRUMENTOS[instrumentoId] || INSTRUMENTOS.guitarra;
  const nCuerdas = inst.cuerdas.length;
  const pisados = forma.frets.filter((f) => f > 0);
  const minF = pisados.length ? Math.min(...pisados) : 1;
  const maxF = pisados.length ? Math.max(...pisados) : 1;
  const inicio = maxF <= 4 ? 1 : Math.max(1, minF);
  const TRASTES = 5;
  const left = 20, top = 34, right = width - 14;
  const gridW = right - left, gridH = height - top - 24;
  const dx = gridW / (nCuerdas - 1), dy = gridH / TRASTES;
  const p = [`<svg viewBox="0 0 ${width} ${height}" class="chord-diagram" role="img" aria-label="Diagrama de ${nombre}">`];
  if (nombre) p.push(`<text x="${width / 2}" y="14" text-anchor="middle" class="cd-name">${nombre}</text>`);
  if (inicio === 1) p.push(`<rect x="${left - 2}" y="${top - 5}" width="${gridW + 4}" height="5" class="cd-nut"/>`);
  else p.push(`<text x="${left - 9}" y="${top + dy * 0.7}" text-anchor="end" class="cd-fretnum">${inicio}</text>`);
  for (let i = 0; i <= TRASTES; i++) p.push(`<line x1="${left}" y1="${top + dy * i}" x2="${right}" y2="${top + dy * i}" class="cd-line"/>`);
  for (let s = 0; s < nCuerdas; s++) p.push(`<line x1="${left + dx * s}" y1="${top}" x2="${left + dx * s}" y2="${top + gridH}" class="cd-line"/>`);

  if (forma.barre && forma.barre.fret >= inicio && forma.barre.fret < inicio + TRASTES) {
    const fila = forma.barre.fret - inicio;
    const x1 = left + dx * forma.barre.from, x2 = left + dx * forma.barre.to;
    p.push(`<rect x="${x1 - 6}" y="${top + dy * fila + dy / 2 - 6}" width="${x2 - x1 + 12}" height="12" rx="6" class="cd-barre"/>`);
  }
  forma.frets.forEach((f, s) => {
    const x = left + dx * s;
    if (f === -1) p.push(`<text x="${x}" y="${top - 8}" text-anchor="middle" class="cd-mark">✕</text>`);
    else if (f === 0) p.push(`<circle cx="${x}" cy="${top - 12}" r="4.5" class="cd-open"/>`);
    else if (f >= inicio && f < inicio + TRASTES) {
      const cy = top + dy * (f - inicio) + dy / 2;
      const enCejilla = forma.barre && forma.barre.fret === f && s >= forma.barre.from && s <= forma.barre.to;
      if (!enCejilla) p.push(`<circle cx="${x}" cy="${cy}" r="7.5" class="cd-dot"/>`);
      if (forma.fingers?.[s]) p.push(`<text x="${x}" y="${cy + 3.5}" text-anchor="middle" class="cd-finger">${forma.fingers[s]}</text>`);
    }
  });
  const flats = /b/.test(nombre);
  forma.frets.forEach((f, s) => {
    if (f < 0) return;
    p.push(`<text x="${left + dx * s}" y="${height - 6}" text-anchor="middle" class="cd-note">${pcName(inst.cuerdas[s] + f, flats)}</text>`);
  });
  p.push('</svg>');
  return p.join('');
}

/** Tablatura ASCII de una progresión (un acorde por compás). */
export function tablatura(acordes = [], instrumentoId = 'guitarra', { porCompas = 4 } = {}) {
  const inst = INSTRUMENTOS[instrumentoId] || INSTRUMENTOS.guitarra;
  const n = inst.cuerdas.length;
  const filas = Array.from({ length: n }, () => '');
  const formas = acordes.map((a) => ({ nombre: a, forma: buscarDigitaciones(a, instrumentoId, { max: 1 })[0] }));
  const cabecera = formas.map(({ nombre }) => nombre.padEnd(porCompas * 2 + 2)).join('');

  for (const { forma } of formas) {
    for (let s = 0; s < n; s++) {
      const f = forma ? forma.frets[s] : -1;
      const celda = f === -1 ? 'x' : String(f);
      filas[s] += '-' + celda.padEnd(1, '-') + '-'.repeat(porCompas * 2 - 1 - (celda.length - 1)) + '|';
    }
  }
  // La cuerda más aguda va arriba en la tablatura.
  const cuerdas = [...inst.etiquetas].map((e) => e.split(' ').pop().padEnd(4));
  const cuerpo = filas.map((linea, i) => `${cuerdas[i]}|${linea}`).reverse().join('\n');
  return `${' '.repeat(5)}${cabecera}\n${cuerpo}`;
}

/** Mapa del mástil con las notas de una escala (diagrama horizontal). */
export function mapaEscala(tonicaPc, grados, instrumentoId = 'guitarra', { trastes = 12 } = {}) {
  const inst = INSTRUMENTOS[instrumentoId] || INSTRUMENTOS.guitarra;
  const notas = new Set(grados.map((g) => pc(tonicaPc + g)));
  return inst.cuerdas.map((abierta, cuerda) => {
    const puntos = [];
    for (let f = 0; f <= trastes; f++) {
      const clase = pc(abierta + f);
      if (notas.has(clase)) {
        puntos.push({ traste: f, nota: pcName(abierta + f), tonica: clase === pc(tonicaPc), grado: grados.indexOf(((clase - tonicaPc) % 12 + 12) % 12) + 1 });
      }
    }
    return { cuerda, etiqueta: inst.etiquetas[cuerda], puntos };
  });
}

/** SVG del mástil completo con la escala marcada. */
export function mastilSVG(mapa, { width = 720, instrumentoId = 'guitarra', trastes = 12 } = {}) {
  const inst = INSTRUMENTOS[instrumentoId] || INSTRUMENTOS.guitarra;
  const n = inst.cuerdas.length;
  const height = 34 + n * 26;
  const left = 46, right = width - 12, top = 26;
  const dx = (right - left) / trastes, dy = (height - top - 12) / (n - 1);
  const p = [`<svg viewBox="0 0 ${width} ${height}" class="neck" role="img" aria-label="Mástil">`];
  for (let f = 0; f <= trastes; f++) {
    p.push(`<line x1="${left + dx * f}" y1="${top}" x2="${left + dx * f}" y2="${top + dy * (n - 1)}" class="${f === 0 ? 'cd-nut-line' : 'cd-line'}"/>`);
    if (f > 0) p.push(`<text x="${left + dx * (f - 0.5)}" y="${height - 2}" text-anchor="middle" class="cd-fretnum">${f}</text>`);
  }
  for (let s = 0; s < n; s++) {
    p.push(`<line x1="${left}" y1="${top + dy * s}" x2="${right}" y2="${top + dy * s}" class="cd-line"/>`);
    p.push(`<text x="${left - 8}" y="${top + dy * s + 4}" text-anchor="end" class="cd-note">${inst.etiquetas[n - 1 - s].split(' ').pop()}</text>`);
  }
  for (const cuerda of mapa) {
    const fila = n - 1 - cuerda.cuerda;
    for (const punto of cuerda.puntos) {
      const x = punto.traste === 0 ? left - 1 : left + dx * (punto.traste - 0.5);
      const y = top + dy * fila;
      p.push(`<circle cx="${x}" cy="${y}" r="9" class="${punto.tonica ? 'cd-dot root' : 'cd-dot'}"/>`);
      p.push(`<text x="${x}" y="${y + 3.5}" text-anchor="middle" class="cd-finger">${punto.grado || ''}</text>`);
    }
  }
  p.push('</svg>');
  return p.join('');
}
