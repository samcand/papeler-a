/**
 * concordancia.js — Concordancia del texto original por número Strong.
 * Recorre libros[b-1][c-1][v-1] = [[palabra, strong, morfología], …].
 */

/** Quita acentos, cantilación y puntuación para agrupar formas iguales. */
export function formaBase(palabra) {
  return String(palabra)
    .normalize('NFD')
    .replace(/[\u0591-\u05AF\u05BD\u05C0\u05C3]/g, '')   // acentos hebreos (se conservan las vocales)
    .replace(/[\u0300-\u0345]/g, '')                       // acentos griegos
    .replace(/[\u05C3\u05BE.,;·:!?“”"()[\]]/g, '')
    .normalize('NFC')
    .toLowerCase();
}

/**
 * Del código hebreo "HC/Vqw3ms" solo interesa la palabra misma ("HVqw3ms"),
 * no la conjunción, la preposición, el artículo ni el sufijo pegados a ella.
 */
export function morfologiaPrincipal(codigo) {
  const c = String(codigo || '');
  if (!/^[HA]/.test(c) || !c.includes('/')) return c;
  const partes = c.slice(1).split('/');
  const principal = partes.find((p) => 'NAVP'.includes(p[0])) || partes[partes.length - 1];
  return c[0] + principal;
}

export function estudioOriginal(libros, strong) {
  const lugares = [];
  const porLibro = new Array(66).fill(0);
  const formas = new Map();
  const morfologias = new Map();
  let versiculos = 0;
  for (let b = 1; b <= 66; b++) {
    const libro = libros[b - 1];
    if (!libro) continue;
    for (let c = 0; c < libro.length; c++) {
      for (let v = 0; v < (libro[c] || []).length; v++) {
        const tokens = libro[c][v] || [];
        let enVerso = false;
        tokens.forEach((w, k) => {
          if (w[1] !== strong) return;
          lugares.push({ b, c: c + 1, v: v + 1, k });
          porLibro[b - 1]++;
          const f = formaBase(w[0]);
          formas.set(f, (formas.get(f) || 0) + 1);
          const m = morfologiaPrincipal(w[2]);
          morfologias.set(m, (morfologias.get(m) || 0) + 1);
          enVerso = true;
        });
        if (enVerso) versiculos++;
      }
    }
  }
  const orden = (mapa) => [...mapa.entries()].sort((a, z) => z[1] - a[1]);
  return { lugares, porLibro, apariciones: lugares.length, versiculos, formas: orden(formas), morfologias: orden(morfologias) };
}
