/**
 * biblia-strong.mjs — Vincula cada palabra de la RV1909 con su número Strong.
 *
 * No existe una RV1909 etiquetada con Strong de dominio público, así que la
 * alineación se aprende de los propios textos: el hebreo (OSHB) y el griego
 * (SBLGNT) que ya trae la app llevan su número Strong en cada palabra, y un
 * modelo estadístico de traducción (IBM Model 1, EM) descubre, versículo por
 * versículo, qué palabra española corresponde a cada palabra original.
 * Es una alineación automática: acierta en la gran mayoría de las palabras
 * de contenido (Dios, amó, mundo, Hijo…) y deja sin número las palabras
 * gramaticales (de, la, que…) y las dudosas.
 *
 *   node tools/biblia-strong.mjs
 *
 * Salida:
 *   biblia/datos/rvs/NN.json         [capítulo][versículo] = "7225,1254,430,,,8064"
 *        (un número por palabra de la RV1909, en el orden de /\p{L}+/gu; vacío = sin número)
 *   biblia/datos/rvs/traducciones.json   { "H430": [["Dios", 2345], ["dioses", 204], …], … }
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DATOS = join(RAIZ, 'biblia', 'datos');
const DESTINO = join(DATOS, 'rvs');
const ITERACIONES = 8;
const UMBRAL = 0.06; // probabilidad mínima para asignar un número

// Palabras gramaticales: no se les asigna número (serían ruido: "de" ↔ artículo, preposición…)
const VACIAS = new Set(`a á al algo como con contra cual cuales cuando de del desde donde e el él ella ellas ellos en entre era eran es esa esas ese eso esos esta estas este esto estos fue fué ha han has hasta he la las le les lo los más me mi mí mis muy ni no nos oh nuestro nuestra nuestros nuestras vuestro vuestra vuestros vuestras aquel aquella aquellos aquellas o os para pero por porque pues que qué se sea si sí sin sino sobre su sus también te ti tu tú tus un una unas uno unos vos y ya yo`.split(/\s+/));

const sinTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
/** Palabras de un versículo, igual que las cuenta la app */
export const palabras = (texto) => String(texto).match(/\p{L}+/gu) || [];
/** Forma que aprende el modelo: minúsculas, sin tildes, y truncada para juntar "amó/amaba/amar" */
export function raiz(w) {
  const s = sinTildes(w.toLowerCase());
  return s.length > 6 ? s.slice(0, 6) : s;
}

const leerJson = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));

async function cargar(b) {
  const nn = String(b).padStart(2, '0');
  const es = await leerJson(join(DATOS, 'rv1909', `${nn}.json`));
  const orig = await leerJson(join(DATOS, b <= 39 ? 'heb' : 'gri', `${nn}.json`));
  return { es, orig };
}

/** Versículos originales candidatos para el versículo español (c, v): la numeración hebrea a veces difiere. */
function candidatos(orig, es, c, v) {
  const lista = [];
  const agregar = (cc, vv) => { const t = orig[cc - 1]?.[vv - 1]; if (t && t.length) lista.push({ c: cc, v: vv, t }); };
  agregar(c, v);
  for (const d of [1, -1, 2]) agregar(c, v + d);
  if (c > 1) agregar(c - 1, (es[c - 2]?.length || 0) + v); // Mal 4:1 → 3:19
  agregar(c + 1, v - (orig[c - 1]?.length || 0));            // Joel 2:28 → 3:1
  agregar(c + 1, v);
  return lista;
}

async function main() {
  const libros = [];
  for (let b = 1; b <= 66; b++) libros.push({ b, ...(await cargar(b)) });

  // Diccionarios de enteros para que el modelo quepa en memoria
  const idEs = new Map(), idOr = new Map();
  const numEs = (w) => { let k = idEs.get(w); if (k == null) { k = idEs.size; idEs.set(w, k); } return k; };
  const numOr = (s) => { let k = idOr.get(s); if (k == null) { k = idOr.size + 1; idOr.set(s, k); } return k; }; // 0 = NULO

  for (const parte of ['H', 'G']) {
    const lista = libros.filter((l) => (parte === 'H' ? l.b <= 39 : l.b >= 40));
    // 1) Pares de entrenamiento: solo capítulos con el mismo número de versículos
    const pares = [];
    for (const { es, orig } of lista) {
      for (let c = 0; c < es.length; c++) {
        if (!orig[c] || orig[c].length !== es[c].length) continue;
        for (let v = 0; v < es[c].length; v++) {
          const e = palabras(es[c][v]).map((w) => numEs(raiz(w)));
          const o = (orig[c][v] || []).map((t) => numOr(parte + t[1]));
          if (e.length && o.length) pares.push([Int32Array.from(e), Int32Array.from([0, ...new Set(o)])]);
        }
      }
    }
    console.log(`  ${parte}: ${pares.length} versículos de entrenamiento`);

    // 2) IBM Model 1: t(español | original) con EM
    const clave = (e, o) => e * 1_000_000 + o;
    let t = new Map();
    const uniforme = 1 / 1000;
    for (let it = 0; it < ITERACIONES; it++) {
      const cuenta = new Map();
      const total = new Map();
      for (const [e, o] of pares) {
        for (let i = 0; i < e.length; i++) {
          let z = 0;
          for (let j = 0; j < o.length; j++) z += t.get(clave(e[i], o[j])) ?? uniforme;
          for (let j = 0; j < o.length; j++) {
            const k = clave(e[i], o[j]);
            const p = (t.get(k) ?? uniforme) / z;
            cuenta.set(k, (cuenta.get(k) || 0) + p);
            total.set(o[j], (total.get(o[j]) || 0) + p);
          }
        }
      }
      t = new Map();
      for (const [k, n] of cuenta) {
        const p = n / total.get(k % 1_000_000);
        if (p > 1e-4) t.set(k, p);
      }
      process.stdout.write(`    iteración ${it + 1}/${ITERACIONES}\r`);
    }
    console.log(`    modelo: ${t.size} pares palabra–Strong`);

    // 3) Alinear cada versículo con el mejor versículo original candidato
    for (const L of lista) {
      L.salida = L.es.map((cap, c) => cap.map((texto, v) => {
        const ws = palabras(texto);
        let mejor = null;
        for (const cand of candidatos(L.orig, L.es, c + 1, v + 1)) {
          const o = [...new Set(cand.t.map((x) => parte + x[1]))];
          const ids = o.map((s) => idOr.get(s) ?? -1);
          let puntaje = 0;
          const prob = [];
          const asign = ws.map((w, i) => {
            const e = idEs.get(raiz(w));
            let pm = t.get(clave(e, 0)) ?? 0, sm = '';
            for (let j = 0; j < o.length; j++) {
              const p = ids[j] < 0 ? 0 : (t.get(clave(e, ids[j])) ?? 0);
              if (p > pm) { pm = p; sm = o[j]; }
            }
            puntaje += Math.log(pm + 1e-6);
            prob[i] = pm;
            return pm >= UMBRAL && sm && !VACIAS.has(w.toLowerCase()) ? sm : '';
          });
          // Cada palabra original se lleva a lo sumo tantas palabras españolas como veces
          // aparece, más una ("de tal manera"); así un número raro no "absorbe" el versículo.
          const veces = new Map();
          for (const x of cand.t) veces.set(parte + x[1], (veces.get(parte + x[1]) || 0) + 1);
          const porNumero = new Map();
          asign.forEach((sn, i) => { if (sn) (porNumero.get(sn) || porNumero.set(sn, []).get(sn)).push(i); });
          for (const [sn, idx] of porNumero) {
            const cupo = (veces.get(sn) || 1) + 1;
            if (idx.length > cupo) idx.sort((a, z) => prob[z] - prob[a]).slice(cupo).forEach((i) => { asign[i] = ''; });
          }
          puntaje /= ws.length || 1;
          // se prefiere el mismo número de versículo salvo que otro encaje claramente mejor
          const valor = puntaje + (cand.c === c + 1 && cand.v === v + 1 ? 0.35 : 0);
          if (!mejor || valor > mejor.valor) mejor = { valor, asign };
        }
        return mejor ? mejor.asign : ws.map(() => '');
      }));
    }
  }

  // 4) Guardar, y contar cómo traduce la RV1909 cada número
  await rm(DESTINO, { recursive: true, force: true });
  await mkdir(DESTINO, { recursive: true });
  const traducciones = new Map();
  let conNumero = 0, total = 0;
  for (const L of libros) {
    const datos = L.salida.map((cap, c) => cap.map((asign, v) => {
      const ws = palabras(L.es[c][v]);
      asign.forEach((s, i) => {
        total++;
        if (!s) return;
        conNumero++;
        const m = traducciones.get(s) || new Map();
        const w = ws[i].toLowerCase();
        m.set(w, (m.get(w) || 0) + 1);
        traducciones.set(s, m);
      });
      return asign.map((s) => s.slice(1)).join(',').replace(/,+$/, '');
    }));
    await writeFile(join(DESTINO, `${String(L.b).padStart(2, '0')}.json`), JSON.stringify(datos));
  }
  const tr = {};
  for (const [s, m] of traducciones) tr[s] = [...m].sort((a, z) => z[1] - a[1]).slice(0, 12);
  await writeFile(join(DESTINO, 'traducciones.json'), JSON.stringify(tr));
  console.log(`  ${conNumero} de ${total} palabras con número Strong (${Math.round((100 * conNumero) / total)}%)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
