/**
 * academy.js — Academia de música: círculo de quintas y recursos de teoría
 * aplicados a la alabanza (no teoría de conservatorio, sino lo que se usa
 * el domingo).
 */

import { keyInfo, pcName, noteToPc } from './music.js';

/** Las 12 tonalidades ordenadas por quintas, con su armadura y relativo menor. */
export const CIRCLE = [
  { major: 'C',  minor: 'Am',  acc: 0,  sign: '',    note: 'La tonalidad "sin nada". Cómoda para teclado, un poco baja para cantar.' },
  { major: 'G',  minor: 'Em',  acc: 1,  sign: '♯',   note: 'La favorita de la guitarra. Rango cómodo para casi toda congregación.' },
  { major: 'D',  minor: 'Bm',  acc: 2,  sign: '♯',   note: 'Brillante en guitarra por las cuerdas al aire. Muy usada en himnos.' },
  { major: 'A',  minor: 'F#m', acc: 3,  sign: '♯',   note: 'Suena grande y abierta. Ojo: los coros pueden quedar altos.' },
  { major: 'E',  minor: 'C#m', acc: 4,  sign: '♯',   note: 'Potente en guitarra eléctrica; suele ser alta para cantar en grupo.' },
  { major: 'B',  minor: 'G#m', acc: 5,  sign: '♯',   note: 'Poco usada; casi siempre conviene bajar a A o subir a C.' },
  { major: 'F#', minor: 'D#m', acc: 6,  sign: '♯',   note: 'Se escribe igual que Gb. En la práctica, usa capo.' },
  { major: 'Db', minor: 'Bbm', acc: 5,  sign: '♭',   note: 'Tonalidad de teclado. En guitarra: capo 1 con formas de C.' },
  { major: 'Ab', minor: 'Fm',  acc: 4,  sign: '♭',   note: 'Común en canciones con metales o pistas. Capo 1 con formas de G.' },
  { major: 'Eb', minor: 'Cm',  acc: 3,  sign: '♭',   note: 'Muy cómoda para voces graves. Capo 3 con formas de C.' },
  { major: 'Bb', minor: 'Gm',  acc: 2,  sign: '♭',   note: 'Clásica de himnarios y bandas con vientos. Capo 3 con formas de G.' },
  { major: 'F',  minor: 'Dm',  acc: 1,  sign: '♭',   note: 'Buena para congregación. En guitarra requiere Bb o capo 1 (formas de E).' },
];

/** "1 sostenido", "3 bemoles", "ninguna alteración". */
export function accText(entry) {
  if (!entry.acc) return 'ninguna alteración';
  const word = entry.sign === '♯' ? 'sostenido' : 'bemol';
  return `${entry.acc} ${word}${entry.acc === 1 ? '' : entry.sign === '♯' ? 's' : 'es'}`;
}

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function sectorPath(cx, cy, rOuter, rInner, from, to) {
  const [x1, y1] = polar(cx, cy, rOuter, from);
  const [x2, y2] = polar(cx, cy, rOuter, to);
  const [x3, y3] = polar(cx, cy, rInner, to);
  const [x4, y4] = polar(cx, cy, rInner, from);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

/**
 * Círculo de quintas interactivo. Cada sector lleva data-key para que la vista
 * pueda reaccionar al clic.
 */
export function circleOfFifthsSVG(activeKey = 'C', size = 380) {
  const cx = size / 2, cy = size / 2;
  const rOut = size * 0.47, rMid = size * 0.33, rIn = size * 0.19;
  const step = 30;
  const active = String(activeKey).trim();
  const activeInfo = keyInfo(active);
  const activeMajor = activeInfo.minor
    ? CIRCLE.find((c) => c.minor.toLowerCase() === active.toLowerCase())?.major
    : activeInfo.tonic;
  const related = new Set();
  if (activeMajor) {
    const i = CIRCLE.findIndex((c) => c.major === activeMajor);
    if (i >= 0) {
      related.add(CIRCLE[(i + 1) % 12].major);   // dominante (V)
      related.add(CIRCLE[(i + 11) % 12].major);  // subdominante (IV)
    }
  }

  const parts = [`<svg viewBox="0 0 ${size} ${size}" class="circle5" role="img" aria-label="Círculo de quintas">`];
  CIRCLE.forEach((entry, i) => {
    const from = i * step - step / 2;
    const to = from + step;
    const isActive = entry.major === activeMajor;
    const isRelated = related.has(entry.major);
    const cls = `c5-sector${isActive ? ' active' : ''}${isRelated ? ' related' : ''}`;
    parts.push(`<path d="${sectorPath(cx, cy, rOut, rMid, from, to)}" class="${cls}" data-key="${entry.major}" tabindex="0" role="button" aria-label="Tonalidad ${entry.major} mayor"><title>${entry.major} mayor · ${entry.acc}${entry.sign || ''} · relativo ${entry.minor}</title></path>`);
    const isActiveMinor = activeInfo.minor && entry.minor.toLowerCase() === active.toLowerCase();
    parts.push(`<path d="${sectorPath(cx, cy, rMid, rIn, from, to)}" class="c5-sector minor${isActiveMinor ? ' active' : ''}" data-key="${entry.minor}" tabindex="0" role="button" aria-label="Tonalidad ${entry.minor} menor"><title>${entry.minor} menor</title></path>`);
    const [mx, my] = polar(cx, cy, (rOut + rMid) / 2, i * step);
    const [nx, ny] = polar(cx, cy, (rMid + rIn) / 2, i * step);
    parts.push(`<text x="${mx}" y="${my + 5}" class="c5-major" text-anchor="middle">${entry.major}</text>`);
    parts.push(`<text x="${nx}" y="${ny + 4}" class="c5-minor" text-anchor="middle">${entry.minor}</text>`);
    const [sx, sy] = polar(cx, cy, rOut - 12, i * step);
    if (entry.acc) parts.push(`<text x="${sx}" y="${sy + 3}" class="c5-acc" text-anchor="middle">${entry.acc}${entry.sign}</text>`);
  });
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${rIn}" class="c5-center"/>`);
  parts.push(`<text x="${cx}" y="${cy - 4}" class="c5-center-key" text-anchor="middle">${active}</text>`);
  parts.push(`<text x="${cx}" y="${cy + 14}" class="c5-center-sub" text-anchor="middle">tonalidad</text>`);
  parts.push('</svg>');
  return parts.join('');
}

/** Qué significa cada vecino del círculo, explicado para tocar. */
export function circleExplain(key = 'C') {
  const info = keyInfo(key);
  const i = CIRCLE.findIndex((c) => c.major === info.tonic || c.minor.toLowerCase() === String(key).toLowerCase());
  const entry = CIRCLE[i] || CIRCLE[0];
  const next = CIRCLE[(i + 1) % 12];
  const prev = CIRCLE[(i + 11) % 12];
  return {
    entry,
    puntos: [
      `A la derecha está ${next.major} (el V, la dominante): es a donde la música "quiere ir". Terminar en ${next.major} deja la canción abierta; volver a ${entry.major} la cierra.`,
      `A la izquierda está ${prev.major} (el IV, la subdominante): suena a descanso y es el acorde más usado para empezar el coro.`,
      `Dentro está ${entry.minor}: comparte todas las notas con ${entry.major}. Cambiar a ${entry.minor} sin cambiar de tonalidad es la forma más fácil de poner un verso melancólico.`,
      `La armadura de ${entry.major} es ${accText(entry)}.`,
      `Los acordes que puedes usar sin salirte: ${keyInfo(entry.major).chords.join(' · ')}.`,
      entry.note,
    ],
  };
}

export const INTERVALS = [
  { semis: 1,  name: 'Segunda menor',  ref: 'Tensión máxima. Se usa para crear inquietud, casi nunca en melodías congregacionales.' },
  { semis: 2,  name: 'Segunda mayor',  ref: 'El paso normal entre notas vecinas de la escala.' },
  { semis: 3,  name: 'Tercera menor',  ref: 'El color "menor". Segunda voz típica por debajo en versos reflexivos.' },
  { semis: 4,  name: 'Tercera mayor',  ref: 'El color "alegre". La armonía a tercera más usada en coros.' },
  { semis: 5,  name: 'Cuarta justa',   ref: 'Sonido de himno y de fanfarria. Base del acorde sus4.' },
  { semis: 6,  name: 'Tritono',        ref: 'Inestable; aparece dentro del acorde de séptima dominante y empuja a resolver.' },
  { semis: 7,  name: 'Quinta justa',   ref: 'El intervalo más estable después de la octava. Es el "power chord" y la base del bajo.' },
  { semis: 8,  name: 'Sexta menor',    ref: 'Nostálgico. Aparece al ir del I al vi.' },
  { semis: 9,  name: 'Sexta mayor',    ref: 'Dulce y abierto; muy usado en pads.' },
  { semis: 10, name: 'Séptima menor',  ref: 'El sonido de los acordes m7 y 7: moderno y suave.' },
  { semis: 11, name: 'Séptima mayor',  ref: 'Flotante, cinematográfico. Típico de maj7 en intros.' },
  { semis: 12, name: 'Octava',         ref: 'La misma nota más aguda. Doblar la melodía en octava engrandece sin ensuciar.' },
];

export const MODES = [
  { name: 'Jónico (mayor)',  steps: [0,2,4,5,7,9,11], use: 'El modo por defecto de la alabanza: claro y afirmativo.' },
  { name: 'Dórico',          steps: [0,2,3,5,7,9,10], use: 'Menor pero con esperanza. Muy usado en canciones de clamor modernas.' },
  { name: 'Frigio',          steps: [0,1,3,5,7,8,10], use: 'Oscuro y español. Raro en congregación, útil en instrumentales.' },
  { name: 'Lidio',           steps: [0,2,4,6,7,9,11], use: 'Mayor con 4ª aumentada: sonido "de asombro". Ideal para intros de pad.' },
  { name: 'Mixolidio',       steps: [0,2,4,5,7,9,10], use: 'Mayor con 7ª menor: sabor gospel y rock. El acorde bVII lo delata.' },
  { name: 'Eólico (menor natural)', steps: [0,2,3,5,7,8,10], use: 'El menor de toda la vida: lamento, confesión, espera.' },
  { name: 'Locrio',          steps: [0,1,3,5,6,8,10], use: 'Inestable, prácticamente no se usa como tonalidad.' },
];

export function modeNotes(mode, tonic = 'C') {
  const pc = noteToPc(tonic) ?? 0;
  const flats = /b/.test(tonic);
  return mode.steps.map((s) => pcName(pc + s, flats));
}

/** Progresiones reales del repertorio de alabanza, en números. */
export const PROGRESSIONS = [
  { nums: ['1', '5', '6m', '4'],       name: 'La vuelta universal', use: 'Sirve para el 70 % del repertorio moderno. Empieza fuerte y se repite sin cansar.' },
  { nums: ['6m', '4', '1', '5'],       name: 'La misma, empezando en el relativo', use: 'Para versos íntimos que desembocan en un coro brillante.' },
  { nums: ['1', '4', '5', '4'],        name: 'Himno clásico', use: 'Sólida y sin ambigüedad. Ideal para proclamación.' },
  { nums: ['1', '4', '6m', '5'],       name: 'Pre-coro que crece', use: 'El 5 al final deja todo listo para el coro.' },
  { nums: ['4', '1', '5', '6m'],       name: 'Coro que "flota"', use: 'Al no empezar en el 1 suena suspendido, como si ya viniera de antes.' },
  { nums: ['1', '5/7', '6m', '4'],     name: 'Con bajo caminando', use: 'El 5 con bajo en 7 hace que el bajo baje por grados: suena profesional con poco esfuerzo.' },
  { nums: ['6m', '5', '4', '5'],       name: 'Puente tenso', use: 'No resuelve al 1: mantiene la expectativa antes del último coro.' },
  { nums: ['1', '3m', '4', '4'],       name: 'Verso reflexivo', use: 'El 3m suaviza el paso al 4 y da aire de himno moderno.' },
  { nums: ['4', '5', '6m', '1'],       name: 'Final sorpresa', use: 'Resuelve al 1 después de pasar por el relativo menor. Buen cierre de servicio.' },
  { nums: ['1', 'b7', '4', '1'],       name: 'Sabor gospel (mixolidio)', use: 'El b7 prestado del mixolidio da color de góspel sin complicar al equipo.' },
];

const DEGREE_TO_SEMI = { '1': 0, '2': 2, '3': 4, '4': 5, '5': 7, '6': 9, '7': 11, 'b7': 10, 'b3': 3, 'b6': 8 };

/** Convierte una progresión en números a acordes reales de una tonalidad. */
export function progressionInKey(nums, key = 'C') {
  const info = keyInfo(key);
  const tonicPc = noteToPc(info.tonic) ?? 0;
  return nums.map((num) => {
    const m = /^(b?\d)(m|dim|maj7|7|sus4|sus2)?(?:\/(b?\d))?$/.exec(num);
    if (!m) return num;
    const semis = DEGREE_TO_SEMI[m[1]];
    if (semis == null) return num;
    const root = pcName(tonicPc + semis, info.preferFlats);
    const bass = m[3] != null && DEGREE_TO_SEMI[m[3]] != null
      ? '/' + pcName(tonicPc + DEGREE_TO_SEMI[m[3]], info.preferFlats)
      : '';
    return root + (m[2] || '') + bass;
  });
}

export const RHYTHM_VALUES = [
  { name: 'Redonda',        beats: 4,    sign: '𝅝', tip: 'Dura un compás entero en 4/4. Es el "colchón".' },
  { name: 'Blanca',         beats: 2,    sign: '𝅗𝅥', tip: 'Dos tiempos. Base de los himnos lentos.' },
  { name: 'Negra',          beats: 1,    sign: '♩', tip: 'Un tiempo. Es el pulso que marca el pie.' },
  { name: 'Corchea',        beats: 0.5,  sign: '♪', tip: 'Media negra: el "y" entre tiempos. Base del rasgueo.' },
  { name: 'Semicorchea',    beats: 0.25, sign: '♬', tip: 'Cuatro por tiempo: "1-e-y-a". Fills y rasgueos rápidos.' },
  { name: 'Negra con puntillo', beats: 1.5, sign: '♩.', tip: 'Un tiempo y medio. El puntillo suma la mitad del valor.' },
  { name: 'Tresillo',       beats: 1,    sign: '♪♪♪', tip: 'Tres notas en el espacio de una negra. Base del 6/8 y del shuffle.' },
];

export const GLOSSARY = [
  { term: 'Tonalidad', def: 'La nota que manda en la canción y la familia de acordes que suenan bien con ella.' },
  { term: 'Compás', def: 'Cómo se agrupan los pulsos. 4/4 = cuatro negras por compás; 3/4 = vals; 6/8 = vaivén en tresillos.' },
  { term: 'BPM', def: 'Pulsos por minuto. 72 es lento y solemne; 120 es celebración.' },
  { term: 'Inversión', def: 'Tocar el mismo acorde con otra nota abajo. Sirve para que la mano no salte y el bajo camine.' },
  { term: 'Cadencia', def: 'Fórmula de acordes que cierra una frase. La más común: V – I.' },
  { term: 'Nashville', def: 'Escribir los acordes como números (1, 4, 5, 6m) en vez de letras, para cambiar de tonalidad al instante.' },
  { term: 'Capo', def: 'Cejilla móvil de la guitarra: sube el tono sin cambiar las formas de los acordes.' },
  { term: 'Pad', def: 'Sonido sostenido de teclado que llena el ambiente sin ritmo. Sostiene los momentos de oración.' },
  { term: 'Tag', def: 'Repetición corta del final de un coro, usada para extender un momento.' },
  { term: 'Dinámica', def: 'El plan de volumen e intensidad de la canción. Es lo que hace que un mismo tema emocione o aburra.' },
  { term: 'Turnaround', def: 'Uno o dos compases instrumentales que devuelven la canción al inicio de la sección.' },
  { term: 'Clic', def: 'Metrónomo en los audífonos. Mantiene al equipo unido, sobre todo si hay pistas.' },
];

/** Rutas de aprendizaje por instrumento, en niveles alcanzables. */
export const PATHS = {
  guitarra: [
    { level: 1, name: 'Los cuatro acordes', goal: 'G, C, D y Em limpios, cambiando cada 4 tiempos a 60 BPM.', drill: '5 min de cambios G↔C, 5 min de rasgueo abajo en negras.' },
    { level: 2, name: 'Rasgueo con vaivén', goal: 'Patrón D-D-U-U-D-U sin parar la mano.', drill: 'Toca 3 minutos seguidos sin detener el brazo, aunque falles el acorde.' },
    { level: 3, name: 'Menores y sus', goal: 'Am, Em, Dsus2, Gsus4, Cadd9.', drill: 'Vuelta G – D – Em7 – Cadd9 a 80 BPM durante 5 minutos.' },
    { level: 4, name: 'La cejilla', goal: 'F y Bm que suenen sin zumbido.', drill: '2 minutos de F al día: colocar, tocar, soltar. No más, para no lesionarte.' },
    { level: 5, name: 'Capo y tonalidades', goal: 'Tocar cualquier canción con formas de G o C usando capo.', drill: 'Toma una canción en Bb y tócala con capo 3 en formas de G.' },
    { level: 6, name: 'Tocar en equipo', goal: 'Dejar espacio: registros, silencios y dinámica.', drill: 'Toca un coro completo solo en las 4 cuerdas agudas.' },
  ],
  piano: [
    { level: 1, name: 'Tríadas mayores y menores', goal: 'Formar cualquier acorde de 3 notas sin pensar.', drill: 'Di un acorde al azar y tócalo en menos de 2 segundos, 20 veces.' },
    { level: 2, name: 'Inversiones', goal: 'Las tres posiciones de cada tríada.', drill: 'Sube C en inversiones por todo el teclado y baja con Am.' },
    { level: 3, name: 'Manos separadas', goal: 'Izquierda fundamental, derecha acorde.', drill: 'Vuelta 1–5–6m–4 en blancas con metrónomo a 60.' },
    { level: 4, name: 'Voicing 1-5-9', goal: 'Colchón abierto sin tercera.', drill: 'Sostén cada acorde 8 tiempos sin adornar. Aprende a no llenar.' },
    { level: 5, name: 'Séptimas y cadencias', goal: 'ii–V–I en 12 tonalidades.', drill: 'Una tonalidad nueva por semana; anota la fecha.' },
    { level: 6, name: 'Acompañar cantando', goal: 'Tocar y cantar a la vez sin perder el tiempo.', drill: 'Canta la melodía mientras tocas solo acordes en redondas.' },
  ],
  bateria: [
    { level: 1, name: 'El pulso', goal: 'Negras en el hi-hat con el pie marcando, sin acelerar.', drill: '5 minutos con metrónomo a 80, sin parar.' },
    { level: 2, name: 'Groove básico', goal: 'Bombo en 1 y 3, caja en 2 y 4, corcheas en hi-hat.', drill: 'Tócalo a 70, 90 y 110 BPM. Si acelera, baja el tempo.' },
    { level: 3, name: 'Dinámica', goal: 'Tocar el mismo groove muy suave y muy fuerte.', drill: 'Cuatro compases piano, cuatro forte, sin cambiar el tempo.' },
    { level: 4, name: 'Fills que no arruinan', goal: 'Fill de un tiempo y fill de silencio.', drill: '7 compases de groove + 1 de fill, en bucle 10 minutos.' },
    { level: 5, name: 'Half-time y 6/8', goal: 'Cambiar de aire sin cambiar de tempo.', drill: 'Alterna 8 compases normales y 8 en half-time.' },
    { level: 6, name: 'Tocar con clic y con la banda', goal: 'Ser el reloj del equipo.', drill: 'Ensaya una canción completa con clic y grábate para revisar el tempo.' },
  ],
  voz: [
    { level: 1, name: 'Respiración', goal: 'Soplar 15 segundos parejo con el diafragma.', drill: 'Inhala en 4, sostén 4, exhala en 8. Cinco rondas.' },
    { level: 2, name: 'Afinación', goal: 'Repetir una nota exacta del piano.', drill: 'Toca una nota, cántala, comprueba con un afinador.' },
    { level: 3, name: 'Rango cómodo', goal: 'Saber tu nota más grave y más aguda cómodas.', drill: 'Anótalas y elige tonalidades a partir de ahí.' },
    { level: 4, name: 'Dicción', goal: 'Que se entienda cada palabra.', drill: 'Habla la letra en voz alta y exagerada antes de cantarla.' },
    { level: 5, name: 'Armonías', goal: 'Cantar una tercera arriba sin irte a la melodía.', drill: 'Practica con grabación de la melodía sonando.' },
    { level: 6, name: 'Dirigir cantando', goal: 'Dar entradas con la voz y el gesto.', drill: 'Graba un set completo y revisa si tus entradas son claras.' },
  ],
};

/** Ejercicio de oído: reproduce un intervalo con Web Audio. */
export function playInterval(semis, { root = 261.63, mode = 'melodico' } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const freqs = [root, root * Math.pow(2, semis / 12)];
  const now = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const start = mode === 'armonico' ? now : now + i * 0.6;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.6);
  });
  setTimeout(() => ctx.close?.(), 2000);
}

/** Reproduce una escala o progresión (array de frecuencias relativas en semitonos). */
export function playSemitones(semis = [], { root = 261.63, gap = 0.35, hold = 0.4 } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const now = ctx.currentTime;
  semis.forEach((s, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = root * Math.pow(2, s / 12);
    const start = now + i * gap;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + hold);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + hold + 0.05);
  });
  setTimeout(() => ctx.close?.(), (semis.length * gap + 1.2) * 1000);
}

/** Toca un acorde (nombres de nota -> semitonos desde C4). */
export function playChordSemis(semis = [], opts = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const now = ctx.currentTime;
  const root = opts.root || 261.63;
  semis.forEach((s) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = root * Math.pow(2, s / 12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  });
  setTimeout(() => ctx.close?.(), 2200);
}
