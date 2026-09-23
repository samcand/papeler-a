/**
 * memoria.js — Memorizar versículos con repetición espaciada (sistema Leitner).
 *
 * Cada versículo está en una "caja". Si lo recuerdas, sube de caja y el
 * siguiente repaso se aleja (1, 3, 7, 14, 30, 90 días); si lo olvidas, vuelve
 * a la primera. Así se repasa mucho lo nuevo y poco lo ya aprendido.
 */

export const INTERVALOS = [0, 1, 3, 7, 14, 30, 90]; // días según la caja
const DIA = 86_400_000;

/** Nueva programación tras un repaso. resultado: 'bien' | 'casi' | 'mal' */
export function repasar(tarjeta, resultado, ahora = Date.now()) {
  let caja = tarjeta.caja || 0;
  if (resultado === 'bien') caja = Math.min(INTERVALOS.length - 1, caja + 1);
  else if (resultado === 'mal') caja = 0;
  // 'casi': se queda en su caja, pero se vuelve a ver pronto
  const dias = resultado === 'casi' ? Math.max(1, Math.floor(INTERVALOS[caja] / 2)) : INTERVALOS[caja];
  const inicioDia = new Date(ahora); inicioDia.setHours(4, 0, 0, 0);
  return {
    ...tarjeta, caja,
    proxima: resultado === 'mal' ? ahora : inicioDia.getTime() + dias * DIA,
    repasos: (tarjeta.repasos || 0) + 1,
    ultimo: ahora,
    aciertos: (tarjeta.aciertos || 0) + (resultado === 'bien' ? 1 : 0),
  };
}

export const pendientes = (tarjetas, ahora = Date.now()) =>
  tarjetas.filter((t) => (t.proxima || 0) <= ahora).sort((a, z) => (a.caja || 0) - (z.caja || 0) || (a.proxima || 0) - (z.proxima || 0));

export const aprendido = (t) => (t.caja || 0) >= 5;

/**
 * Ayudas para recordar:
 *   'iniciales' → "P d t m a D a m…" (primera letra de cada palabra)
 *   'huecos'    → oculta una de cada `cada` palabras (más huecos según la caja)
 */
export function pista(texto, modo, { caja = 0 } = {}) {
  const palabras = String(texto).split(/(\s+)/);
  if (modo === 'iniciales') {
    return palabras.map((p) => (/\s/.test(p) ? p : p.replace(/[\p{L}]+/u, (w) => w[0] + '_'.repeat(Math.max(0, Math.min(w.length - 1, 1)))))).join('');
  }
  const cada = Math.max(2, 4 - Math.floor(caja / 2));
  let n = 0;
  return palabras.map((p) => {
    if (/\s/.test(p) || !/\p{L}/u.test(p)) return p;
    n++;
    return n % cada === 0 ? p.replace(/[\p{L}]/gu, '_') : p;
  }).join('');
}

/** Compara lo que el usuario escribió con el texto (sin tildes ni puntuación). Devuelve % de palabras correctas. */
export function comparar(escrito, texto, normalizar) {
  const limpio = (t) => normalizar(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const a = limpio(escrito), b = limpio(texto);
  if (!b.length) return 0;
  let bien = 0, j = 0;
  for (const w of a) {
    const k = b.indexOf(w, j);
    if (k >= 0 && k - j <= 2) { bien++; j = k + 1; }
  }
  return Math.round((bien / b.length) * 100);
}
