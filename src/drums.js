/**
 * drums.js — Grooves, dinámica por sección y guía de ejecución para batería.
 * La cuadrícula usa 8 o 16 pasos por compás; cada voz es un arreglo de 0/1/2.
 * 0 = silencio, 1 = golpe normal, 2 = acento.
 */

export const VOICES = [
  { id: 'crash', name: 'Crash', short: 'CR', hand: 'mano derecha' },
  { id: 'ride',  name: 'Ride',  short: 'RD', hand: 'mano derecha' },
  { id: 'hihat', name: 'Hi-hat', short: 'HH', hand: 'mano derecha' },
  { id: 'snare', name: 'Caja',  short: 'CJ', hand: 'mano izquierda' },
  { id: 'tom',   name: 'Tom',   short: 'TM', hand: 'ambas' },
  { id: 'kick',  name: 'Bombo', short: 'BD', hand: 'pie derecho' },
  { id: 'hhfoot',name: 'Hi-hat con pie', short: 'HP', hand: 'pie izquierdo' },
];

const S = (str) => str.split('').map((ch) => (ch === 'X' ? 2 : ch === 'x' || ch === 'o' ? 1 : 0));

export const GROOVES = [
  {
    id: 'balada-8',
    name: 'Balada 4/4 en corcheas',
    feel: 'balada', timeSig: '4/4', steps: 8, intensity: 2,
    grid: { hihat: S('xxxxxxxx'), snare: S('..X...X.'), kick: S('X..x X...'.replace(/ /g, '')) },
    how: 'Hi-hat cerrado en todas las corcheas con la derecha; caja en 2 y 4; bombo en 1 y en el "y de 3". Es el groove más usado en adoración: si dudas, toca esto.',
  },
  {
    id: 'cross-stick',
    name: 'Verso íntimo (cross-stick)',
    feel: 'suave', timeSig: '4/4', steps: 8, intensity: 1,
    grid: { hihat: S('x.x.x.x.'), snare: S('..o...o.'), kick: S('x...x...') },
    how: 'Caja tocada de lado (cross-stick) apoyando la baqueta en el parche. Hi-hat solo en los tiempos. Volumen mínimo: el verso es para escuchar la letra.',
  },
  {
    id: 'coro-ride',
    name: 'Coro abierto (ride + crash)',
    feel: 'rock', timeSig: '4/4', steps: 8, intensity: 4,
    grid: { crash: S('X.......'), ride: S('.xxxxxxx'), snare: S('..X...X.'), kick: S('X..x.xX.') },
    how: 'Crash en el 1 del coro, luego ride marcando corcheas. Caja firme en 2 y 4. Aquí la congregación canta fuerte: sostén el pulso, no adornes.',
  },
  {
    id: 'four-on-floor',
    name: 'Celebración (bombo en negras)',
    feel: 'fiesta', timeSig: '4/4', steps: 8, intensity: 5,
    grid: { hihat: S('xxxxxxxx'), snare: S('..X...X.'), kick: S('x.x.x.x.'), hhfoot: S('..x...x.') },
    how: 'Bombo en los cuatro tiempos. Da energía para palmas y saltos. Cuida no acelerar: cuenta con el metrónomo interno.',
  },
  {
    id: 'seis-octavos',
    name: '6/8 (himno / vaivén)',
    feel: '6/8', timeSig: '6/8', steps: 6, intensity: 2,
    grid: { hihat: S('x.xx.x'), snare: S('...X..'), kick: S('X.....') },
    how: 'Piensa "UNO-dos-tres DOS-dos-tres". Bombo en el 1, caja en el 4. El hi-hat puede ir en negras con puntillo para dejar aire.',
  },
  {
    id: 'vals-3-4',
    name: '3/4 (vals, himnos antiguos)',
    feel: '3/4', timeSig: '3/4', steps: 6, intensity: 2,
    grid: { hihat: S('x.x.x.'), snare: S('..o.o.'), kick: S('x.....') },
    how: 'Bombo en el 1, caja suave en 2 y 3. Nunca aceleres al final de la frase: es el error clásico en himnos.',
  },
  {
    id: 'half-time',
    name: 'Half-time (puente, momento grande)',
    feel: 'puente', timeSig: '4/4', steps: 8, intensity: 3,
    grid: { ride: S('x.x.x.x.'), snare: S('....X...'), kick: S('X...x..x') },
    how: 'La caja se va al tiempo 3 en vez de 2 y 4. El tema parece más lento y más grande sin cambiar el BPM. Ideal para el puente antes del último coro.',
  },
  {
    id: 'shuffle',
    name: 'Shuffle / swing suave',
    feel: 'shuffle', timeSig: '4/4', steps: 12, intensity: 3,
    grid: { hihat: S('x.xx.xx.xx.x'), snare: S('...X.....X..'), kick: S('X.....X.....') },
    how: 'Subdivisión en tresillos: "chi-ca chi-ca". Deja caer el golpe, no lo empujes.',
  },
  {
    id: 'solo-percusion',
    name: 'Sin batería: cajón / palmas',
    feel: 'acustico', timeSig: '4/4', steps: 8, intensity: 1,
    grid: { snare: S('..x...x.'), kick: S('x...x...') },
    how: 'En el cajón, el centro es el bombo y la esquina superior es la caja. Con palmas: solo en 2 y 4, nunca en todos los tiempos.',
  },
];

export function grooveById(id) {
  return GROOVES.find((g) => g.id === id) || GROOVES[0];
}

export function groovesForFeel(feel) {
  const found = GROOVES.filter((g) => g.feel === feel);
  return found.length ? found : [GROOVES[0]];
}

/**
 * Plan dinámico por sección: qué groove y qué intensidad va en cada parte.
 * Reconoce nombres típicos en español.
 */
const SECTION_PLAN = [
  { match: /intro/i,                 groove: 'cross-stick',   intensity: 1, cue: 'Entra con hi-hat o solo ambiente. Cuenta los compases en voz baja para que todos entren juntos.' },
  { match: /verso\s*1|estrofa\s*1/i, groove: 'cross-stick',   intensity: 1, cue: 'Lo más suave de la canción. Cross-stick y hi-hat cerrado; deja espacio a la letra.' },
  { match: /verso|estrofa/i,         groove: 'balada-8',      intensity: 2, cue: 'Abre un poco: caja normal, hi-hat ligeramente abierto en el "y" del 4.' },
  { match: /pre-?coro|pre/i,         groove: 'balada-8',      intensity: 3, cue: 'Crece hacia el coro: añade bombo y termina con un fill de un compás.' },
  { match: /coro|estribillo/i,       groove: 'coro-ride',     intensity: 4, cue: 'Crash en el 1 y ride. Es el punto donde la congregación canta más fuerte: sé sólido y constante.' },
  { match: /puente|bridge/i,         groove: 'half-time',     intensity: 3, cue: 'Half-time o solo toms. Aquí la canción respira antes del último coro.' },
  { match: /instrumental|solo/i,     groove: 'coro-ride',     intensity: 3, cue: 'Mantén el groove simple para que el solista tenga piso.' },
  { match: /final|outro|cierre/i,    groove: 'cross-stick',   intensity: 1, cue: 'Baja de a poco. Termina con un crash apagado con la mano o simplemente deja de tocar en el 1.' },
  { match: /tag|repite|libre/i,      groove: 'half-time',     intensity: 2, cue: 'Sección libre: mira al director. Puede repetirse muchas veces; no te adelantes.' },
];

export function planForSection(sectionName = '') {
  const plan = SECTION_PLAN.find((p) => p.match.test(sectionName));
  if (!plan) return { groove: 'balada-8', intensity: 2, cue: 'Groove base, volumen medio. Sigue al director.' };
  return { groove: plan.groove, intensity: plan.intensity, cue: plan.cue };
}

export const FILLS = [
  { id: 'simple', name: 'Fill de un tiempo (el más seguro)', detail: 'Cuatro semicorcheas en la caja en el tiempo 4. Sirve para entrar al coro sin arriesgar.' },
  { id: 'toms', name: 'Bajada por toms', detail: 'Caja–tom alto–tom medio–tom piso, una semicorchea cada uno. Cae en el 1 con crash.' },
  { id: 'silencio', name: 'Fill de silencio', detail: 'Deja el compás en blanco y vuelve a entrar en el 1. El silencio es el fill más poderoso y el que menos falla.' },
  { id: 'crescendo', name: 'Crescendo en redoble', detail: 'Redoble de caja subiendo volumen durante 2 compases hacia el último coro.' },
  { id: 'bombo-crash', name: 'Bombo + crash a contratiempo', detail: 'Golpe en el "y" del 4 anticipando el 1. Avisa al equipo de un cambio de sección.' },
];

/** HTML de la cuadrícula del groove. */
export function grooveGridHTML(groove) {
  const voices = VOICES.filter((v) => groove.grid[v.id]?.some((x) => x > 0));
  const steps = groove.steps;
  const counts = steps === 6
    ? ['1', '2', '3', '4', '5', '6']
    : steps === 12
      ? ['1', 'y', 'a', '2', 'y', 'a', '3', 'y', 'a', '4', 'y', 'a']
      : ['1', '&', '2', '&', '3', '&', '4', '&'];
  const head = counts.map((c) => `<th>${c}</th>`).join('');
  const rows = voices.map((v) => {
    const cells = groove.grid[v.id].map((hit, i) => {
      const cls = hit === 2 ? 'hit accent' : hit === 1 ? 'hit' : '';
      const strong = i % (steps === 6 ? 3 : 2) === 0 ? ' strong' : '';
      return `<td class="${cls}${strong}"><span></span></td>`;
    }).join('');
    return `<tr><th class="voice" title="${v.hand}">${v.name}</th>${cells}</tr>`;
  }).join('');
  return `<table class="groove-grid"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** Conteo textual, para practicar cantando el groove antes de tocarlo. */
export function grooveCountIn(groove) {
  const steps = groove.steps;
  const syllables = [];
  for (let i = 0; i < steps; i++) {
    const hits = [];
    if (groove.grid.kick?.[i]) hits.push('bum');
    if (groove.grid.snare?.[i]) hits.push('pa');
    if (!hits.length && (groove.grid.hihat?.[i] || groove.grid.ride?.[i])) hits.push('ts');
    syllables.push(hits.join('-') || '·');
  }
  return syllables.join(' ');
}
