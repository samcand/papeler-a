/**
 * marcas.js — Resaltados y subrayados sobre el texto, a nivel de palabra.
 *
 * Una marca va de un punto a otro del texto: { id: versículo, o: carácter }.
 * Puede empezar a mitad de un versículo y terminar varios versículos después,
 * igual que al pasar un marcador sobre una Biblia de papel.
 *   { id, version, desde: {id, o}, hasta: {id, o|null}, color, estilo, creada }
 * hasta.o nulo significa "hasta el final del versículo".
 */

export const COLORES = [
  { id: 'amarillo', nombre: 'Amarillo' },
  { id: 'verde', nombre: 'Verde' },
  { id: 'azul', nombre: 'Azul' },
  { id: 'rosa', nombre: 'Rosa' },
  { id: 'naranja', nombre: 'Naranja' },
  { id: 'morado', nombre: 'Morado' },
  { id: 'rojo', nombre: 'Rojo' },
  { id: 'cafe', nombre: 'Café' },
  { id: 'gris', nombre: 'Gris' },
];

/**
 * Herramientas de marcado. Cada una pinta una "propiedad" distinta del texto,
 * así se combinan: fondo amarillo + letra roja + recuadro azul + símbolo.
 */
export const ESTILOS = [
  { id: 'resaltar', nombre: 'Resaltar', prop: 'fondo', icono: '▮' },
  { id: 'letra', nombre: 'Color de letra', prop: 'letra', icono: 'A' },
  { id: 'subrayar', nombre: 'Subrayar', prop: 'linea', icono: 'S̲' },
  { id: 'doble', nombre: 'Subrayado doble', prop: 'linea', icono: 'S̳' },
  { id: 'ondulado', nombre: 'Subrayado ondulado', prop: 'linea', icono: '〰' },
  { id: 'tachado', nombre: 'Tachado', prop: 'linea', icono: 'S̶' },
  { id: 'recuadro', nombre: 'Encerrar en recuadro', prop: 'caja', icono: '▢' },
  { id: 'circulo', nombre: 'Encerrar en círculo', prop: 'caja', icono: '◯' },
  { id: 'negrita', nombre: 'Negrita', prop: 'negrita', icono: 'N' },
  { id: 'cursiva', nombre: 'Cursiva', prop: 'cursiva', icono: 'I' },
  { id: 'simbolo', nombre: 'Símbolo', prop: 'simbolo', icono: '△' },
];
export const estiloDe = (id) => ESTILOS.find((e) => e.id === id) || ESTILOS[0];

/**
 * Símbolos del método inductivo (Precept) y otros de uso pastoral. El color
 * lo pone la marca; el color sugerido es el tradicional.
 */
export const SIMBOLOS = [
  { s: '△', nombre: 'Dios, el Padre', color: 'amarillo' },
  { s: '✝', nombre: 'Jesucristo', color: 'morado' },
  { s: '☁', nombre: 'Espíritu Santo', color: 'azul' },
  { s: 'Ψ', nombre: 'Satanás, demonios', color: 'rojo' },
  { s: '✖', nombre: 'Pecado', color: 'cafe' },
  { s: '◆', nombre: 'Sangre, sacrificio, expiación', color: 'rojo' },
  { s: '▣', nombre: 'Pacto', color: 'rojo' },
  { s: '♥', nombre: 'Amor', color: 'rosa' },
  { s: '✦', nombre: 'Gracia, misericordia', color: 'azul' },
  { s: '✓', nombre: 'Fe, creer', color: 'verde' },
  { s: '↺', nombre: 'Arrepentimiento', color: 'naranja' },
  { s: '♔', nombre: 'Reino, rey', color: 'morado' },
  { s: '⚖', nombre: 'Justicia, juicio', color: 'cafe' },
  { s: '☆', nombre: 'Promesa', color: 'amarillo' },
  { s: '!', nombre: 'Mandato, advertencia', color: 'rojo' },
  { s: '?', nombre: 'Pregunta, duda por resolver', color: 'gris' },
  { s: '◷', nombre: 'Tiempo, cuándo', color: 'verde' },
  { s: '⌂', nombre: 'Lugar, dónde', color: 'verde' },
  { s: '✋', nombre: 'Oración', color: 'morado' },
  { s: '▤', nombre: 'Palabra, ley, Escritura', color: 'cafe' },
  { s: '☀', nombre: 'Luz, gloria', color: 'amarillo' },
  { s: '∞', nombre: 'Eternidad, vida eterna', color: 'azul' },
  { s: '⚔', nombre: 'Guerra espiritual', color: 'gris' },
  { s: '→', nombre: 'Conclusión, "por tanto"', color: 'gris' },
  { s: '★', nombre: 'Clave, importante', color: 'naranja' },
];

export function nuevoId(prefijo = 'm') {
  return prefijo + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Crea una marca ordenando los extremos (se puede seleccionar de abajo hacia arriba). */
export function crearMarca({ version, desde, hasta, color = 'amarillo', estilo = 'resaltar', simbolo }) {
  let a = { ...desde }, z = { ...hasta };
  if (comparar(a, z) > 0) [a, z] = [z, a];
  const m = { id: nuevoId('m'), version, desde: a, hasta: z, color, estilo, creada: Date.now() };
  if (estilo === 'simbolo') m.simbolo = simbolo || '★';
  return m;
}

/** Orden entre dos puntos del texto. hasta.o nulo cuenta como el final. */
export function comparar(a, z) {
  if (a.id !== z.id) return a.id - z.id;
  return (a.o ?? Infinity) - (z.o ?? Infinity);
}

export function tocaVerso(marca, id) {
  return marca.desde.id <= id && marca.hasta.id >= id;
}

/** Tramo [inicio, fin) que la marca cubre dentro de un versículo de `largo` caracteres. */
export function tramoEn(marca, id, largo) {
  if (!tocaVerso(marca, id)) return null;
  // desde.o nulo aparece al recortar una marca justo al final de un versículo
  const inicio = marca.desde.id === id ? Math.max(0, Math.min(largo, marca.desde.o ?? largo)) : 0;
  const fin = marca.hasta.id === id ? Math.max(0, Math.min(largo, marca.hasta.o ?? largo)) : largo;
  return fin > inicio ? [inicio, fin] : null;
}

/**
 * Parte el texto de un versículo en trozos según las marcas que lo cubren.
 * Devuelve [{ texto, inicio, fondo, letra, linea, caja, estilos:Set, simbolos, marcas:[ids] }].
 * Cada propiedad la decide la marca más reciente que la toca, así se combinan
 * fondo, color de letra, subrayado y recuadro. `color` es el del fondo (o el
 * primero que haya) para quien solo necesita uno.
 */
export function segmentos(texto, id, marcas) {
  const largo = texto.length;
  const tramos = [];
  for (const m of marcas) {
    const t = tramoEn(m, id, largo);
    if (t) tramos.push({ m, inicio: t[0], fin: t[1] });
  }
  if (!tramos.length) return [{ texto, inicio: 0, color: null, estilos: new Set(), simbolos: [], marcas: [] }];

  const cortes = new Set([0, largo]);
  for (const t of tramos) { cortes.add(t.inicio); cortes.add(t.fin); }
  const puntos = [...cortes].sort((a, b) => a - b);
  tramos.sort((a, b) => (a.m.creada || 0) - (b.m.creada || 0));

  const salida = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const [a, z] = [puntos[i], puntos[i + 1]];
    if (z <= a) continue;
    const encima = tramos.filter((t) => t.inicio <= a && t.fin >= z);
    const seg = { texto: texto.slice(a, z), inicio: a, estilos: new Set(), simbolos: [], marcas: encima.map((t) => t.m.id) };
    for (const t of encima) {
      const estilo = estiloDe(t.m.estilo);
      if (estilo.id === 'simbolo') {
        // el símbolo va una sola vez, delante de la primera palabra marcada
        if (t.inicio === a && t.m.desde.id === id) seg.simbolos.push({ s: t.m.simbolo, color: t.m.color });
        continue;
      }
      seg.estilos.add(estilo.id);
      if (estilo.prop === 'linea') seg.linea = t.m.color;
      else if (['fondo', 'letra', 'caja'].includes(estilo.prop)) seg[estilo.prop] = t.m.color;
    }
    seg.color = seg.fondo || seg.letra || seg.linea || seg.caja || null;
    const previo = salida[salida.length - 1];
    if (previo && !seg.simbolos.length && igual(previo.marcas, seg.marcas)) previo.texto += seg.texto;
    else salida.push(seg);
  }
  return salida;
}

/** Clases y variables CSS para pintar un trozo. Sin DOM: la vista decide cómo aplicarlas. */
export function estiloSegmento(seg) {
  const clases = ['m'];
  const vars = {};
  if (seg.fondo) { clases.push('m-f'); vars['--f'] = `var(--m-${seg.fondo})`; }
  if (seg.letra) { clases.push('m-l'); vars['--l'] = `var(--t-${seg.letra})`; }
  if (seg.linea) { clases.push('m-u'); vars['--u'] = `var(--u-${seg.linea})`; }
  if (seg.caja) { clases.push('m-c'); vars['--c'] = `var(--u-${seg.caja})`; }
  for (const e of seg.estilos) if (!['resaltar', 'letra', 'subrayar'].includes(e)) clases.push(`m-${e}`);
  if (seg.simbolos.length) {
    clases.push('m-sim');
    vars['--s'] = `var(--u-${seg.simbolos[0].color})`;
  }
  return { clase: clases.join(' '), vars, simbolo: seg.simbolos.map((x) => x.s).join('') };
}

/** Trozo "de muestra" que pinta una sola marca (o regla de palabra clave) en listas y leyendas. */
export function segmentoDeMarca(m) {
  const e = estiloDe(m.estilo);
  const seg = { estilos: new Set([e.id]), simbolos: [], marcas: [m.id] };
  if (e.id === 'simbolo' || m.simbolo) seg.simbolos.push({ s: m.simbolo || '★', color: m.color });
  if (e.prop === 'linea') seg.linea = m.color;
  else if (['fondo', 'letra', 'caja'].includes(e.prop)) seg[e.prop] = m.color;
  return seg;
}

const igual = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);

/** Marcas de una versión que tocan un capítulo (desde y hasta son ids de versículo). */
export function marcasEnRango(marcas, version, desde, hasta) {
  return marcas.filter((m) => m.version === version && m.desde.id <= hasta && m.hasta.id >= desde);
}

/**
 * Quita un tramo de todas las marcas que lo pisan: la marca se recorta o se
 * parte en dos. Así "borrar" funciona como la goma sobre una parte del resaltado.
 */
export function borrarTramo(marcas, version, desde, hasta) {
  let [a, z] = comparar(desde, hasta) <= 0 ? [desde, hasta] : [hasta, desde];
  const salida = [];
  for (const m of marcas) {
    if (m.version !== version || comparar(m.hasta, a) <= 0 || comparar(m.desde, z) >= 0) {
      salida.push(m);
      continue;
    }
    if (comparar(m.desde, a) < 0) salida.push({ ...m, hasta: { ...a } });
    if (comparar(m.hasta, z) > 0) {
      salida.push({ ...m, id: comparar(m.desde, a) < 0 ? nuevoId('m') : m.id, desde: { ...z } });
    }
  }
  return salida;
}

/** Texto que cubre una marca, para listarla en el cuaderno. `textoDe(id)` da el versículo. */
export function textoDeMarca(marca, textoDe) {
  const partes = [];
  for (let id = marca.desde.id; id <= marca.hasta.id; id++) {
    const t = textoDe(id);
    if (t == null) {
      // salta al siguiente capítulo si este se acabó
      if (id % 1000 > 200) id = (Math.floor(id / 1000) + 1) * 1000;
      continue;
    }
    const tramo = tramoEn(marca, id, t.length);
    if (tramo) partes.push(t.slice(tramo[0], tramo[1]));
    if (partes.join(' ').length > 400) break;
  }
  return partes.join(' ').trim();
}
