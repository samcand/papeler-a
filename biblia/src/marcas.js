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
];

export const ESTILOS = [
  { id: 'resaltar', nombre: 'Resaltar' },
  { id: 'subrayar', nombre: 'Subrayar' },
  { id: 'negrita', nombre: 'Negrita' },
];

export function nuevoId(prefijo = 'm') {
  return prefijo + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Crea una marca ordenando los extremos (se puede seleccionar de abajo hacia arriba). */
export function crearMarca({ version, desde, hasta, color = 'amarillo', estilo = 'resaltar' }) {
  let a = { ...desde }, z = { ...hasta };
  if (comparar(a, z) > 0) [a, z] = [z, a];
  return { id: nuevoId('m'), version, desde: a, hasta: z, color, estilo, creada: Date.now() };
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
 * Devuelve [{ texto, inicio, color, estilos:Set, marcas:[ids] }]. Si dos
 * resaltados se pisan, gana el más reciente; subrayado y negrita se suman.
 */
export function segmentos(texto, id, marcas) {
  const largo = texto.length;
  const tramos = [];
  for (const m of marcas) {
    const t = tramoEn(m, id, largo);
    if (t) tramos.push({ m, inicio: t[0], fin: t[1] });
  }
  if (!tramos.length) return [{ texto, inicio: 0, color: null, estilos: new Set(), marcas: [] }];

  const cortes = new Set([0, largo]);
  for (const t of tramos) { cortes.add(t.inicio); cortes.add(t.fin); }
  const puntos = [...cortes].sort((a, b) => a - b);
  tramos.sort((a, b) => (a.m.creada || 0) - (b.m.creada || 0));

  const salida = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const [a, z] = [puntos[i], puntos[i + 1]];
    if (z <= a) continue;
    const encima = tramos.filter((t) => t.inicio <= a && t.fin >= z);
    let color = null;
    const estilos = new Set();
    for (const t of encima) {
      estilos.add(t.m.estilo || 'resaltar');
      if ((t.m.estilo || 'resaltar') === 'resaltar' || !color) color = t.m.color;
    }
    const previo = salida[salida.length - 1];
    const mismas = encima.map((t) => t.m.id);
    if (previo && previo.color === color && igual(previo.marcas, mismas)) {
      previo.texto += texto.slice(a, z);
    } else {
      salida.push({ texto: texto.slice(a, z), inicio: a, color, estilos, marcas: mismas });
    }
  }
  return salida;
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
