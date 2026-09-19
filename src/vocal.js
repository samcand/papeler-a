/**
 * vocal.js — Núcleo del módulo de canto: rango vocal, clasificación de voces,
 * elección de tonalidad según quién canta, vocalizaciones y armonías.
 *
 * Todo se maneja en notas MIDI (C4 = 60) para poder comparar rangos sin ambigüedad.
 */

import { pcName, keyInfo, noteToPc, preferredKeyName, MAJOR_KEY_NAMES } from './music.js';

export const nombreNota = (midi) => `${pcName(midi)}${Math.floor(midi / 12) - 1}`;

export function nombreANota(texto = '') {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(String(texto).trim());
  if (!m) return null;
  const pc = noteToPc(m[1] + (m[2] || ''));
  if (pc == null) return null;
  return pc + (Number(m[3]) + 1) * 12;
}

/** Tipos de voz con su rango total y su tesitura cómoda (donde se canta sin esfuerzo). */
export const TESITURAS = [
  { id: 'soprano',  nombre: 'Soprano',  rango: [60, 81], comoda: [62, 76], nota: 'Voz femenina aguda. Suele llevar la melodía en tonalidades altas o la voz de arriba en las armonías.' },
  { id: 'mezzo',    nombre: 'Mezzosoprano', rango: [57, 77], comoda: [59, 72], nota: 'La voz femenina más común. Es la que mejor guía a la congregación en la mayoría de las canciones.' },
  { id: 'contralto',nombre: 'Contralto', rango: [53, 74], comoda: [55, 69], nota: 'Voz femenina grave. Excelente para la segunda voz por debajo de la melodía.' },
  { id: 'tenor',    nombre: 'Tenor',    rango: [48, 69], comoda: [50, 64], nota: 'Voz masculina aguda. Si dirige, cuidado: lo que a él le queda cómodo suele quedar alto para la congregación.' },
  { id: 'baritono', nombre: 'Barítono', rango: [45, 65], comoda: [47, 60], nota: 'La voz masculina más común. Muy buena para dirigir: su rango coincide con el de la congregación.' },
  { id: 'bajo',     nombre: 'Bajo',     rango: [40, 60], comoda: [43, 57], nota: 'Voz masculina grave. Ideal para sostener la base de las armonías.' },
];

/**
 * Rango en el que una congregación mixta canta sin esfuerzo.
 * Por encima de Re4 la gente empieza a dejar de cantar o a cantar una octava abajo.
 */
export const RANGO_CONGREGACION = { min: 55, comodoMin: 57, comodoMax: 62, max: 64 };

/** Clasifica una voz a partir del rango medido. */
export function clasificarVoz(min, max) {
  if (min == null || max == null || max <= min) return null;
  const centro = (min + max) / 2;
  const candidatos = TESITURAS.map((t) => {
    const centroTipo = (t.rango[0] + t.rango[1]) / 2;
    const solape = Math.max(0, Math.min(max, t.rango[1]) - Math.max(min, t.rango[0]));
    const cobertura = solape / (t.rango[1] - t.rango[0]);
    return { ...t, score: cobertura * 2 - Math.abs(centro - centroTipo) / 12 };
  });
  candidatos.sort((a, b) => b.score - a.score);
  const elegido = candidatos[0];
  return {
    tipo: elegido.id,
    nombre: elegido.nombre,
    nota: elegido.nota,
    extension: max - min,
    octavas: Number(((max - min) / 12).toFixed(1)),
    // La zona cómoda real: se recortan 2 semitonos arriba y abajo del rango medido.
    comoda: [Math.min(min + 2, max), Math.max(max - 2, min)],
    alternativa: candidatos[1]?.nombre || null,
  };
}

/** Rango de una melodía transcrita (la que sale del Estudio de audio). */
export function rangoDeMelodia(notas = []) {
  const midis = notas.map((n) => n.midi).filter((n) => Number.isFinite(n));
  if (!midis.length) return null;
  const min = Math.min(...midis);
  const max = Math.max(...midis);
  // Tesitura real: dónde pasa la melodía la mayor parte del tiempo (percentiles 10-90).
  const ordenado = [...midis].sort((a, b) => a - b);
  const p = (q) => ordenado[Math.floor(q * (ordenado.length - 1))];
  return { min, max, tesitura: [p(0.1), p(0.9)], fuente: 'melodía transcrita' };
}

/**
 * Estimación del rango de una canción cuando no hay melodía transcrita.
 * En el repertorio de alabanza la melodía suele moverse entre la quinta por
 * debajo de la tónica y la tercera por encima de la octava.
 */
export function rangoEstimado(key = 'C') {
  const info = keyInfo(key);
  const tonica = noteToPc(info.tonic);
  const centroIdeal = (RANGO_CONGREGACION.comodoMin + RANGO_CONGREGACION.comodoMax) / 2;
  // Se elige la octava de la tónica que deja la melodía centrada donde canta
  // una congregación: sin datos reales, lo honesto es partir de algo neutro.
  let base = 12 + tonica;
  while (base + 12 <= 84) {
    const actual = Math.abs(base + 0.5 - centroIdeal);
    const siguiente = Math.abs(base + 12.5 - centroIdeal);
    if (siguiente > actual) break;
    base += 12;
  }
  // Una melodía congregacional típica abarca poco más de una octava.
  return {
    min: base - 4, max: base + 5,
    tesitura: [base - 2, base + 4],
    fuente: 'estimado a partir de la tonalidad',
    estimado: true,
  };
}

export function rangoDeCancion(song = {}) {
  if (song.rangoVocal?.min != null) return { ...song.rangoVocal, fuente: song.rangoVocal.fuente || 'anotado a mano' };
  if (song.melodia?.length) return rangoDeMelodia(song.melodia);
  return rangoEstimado(song.key);
}

/**
 * Recomienda tonalidades para una canción según quién la va a cantar y
 * teniendo en cuenta a la congregación.
 */
export function tonalidadesRecomendadas(song, cantante = null, { considerarCongregacion = true } = {}) {
  const rango = rangoDeCancion(song);
  // Si el rango es solo una estimación a partir de la tonalidad, no tiene
  // sentido advertir sobre la congregación: estaríamos opinando sobre datos
  // que no tenemos. Se avisa y se pide el rango real.
  const pesarCongregacion = considerarCongregacion && !rango.estimado;
  const info = keyInfo(song.key || 'C');
  const tonicaOriginal = noteToPc(info.tonic);
  const opciones = [];

  for (let semis = -6; semis <= 6; semis++) {
    const min = rango.min + semis;
    const max = rango.max + semis;
    const tes = (rango.tesitura || [rango.min, rango.max]).map((n) => n + semis);
    const tonalidad = preferredKeyName(tonicaOriginal + semis, info.minor);
    let score = 0;
    const avisos = [];

    if (cantante?.min != null && cantante?.max != null) {
      const comodaMin = cantante.comoda?.[0] ?? cantante.min + 2;
      const comodaMax = cantante.comoda?.[1] ?? cantante.max - 2;
      if (min < cantante.min) { score -= (cantante.min - min) * 3; avisos.push(`${nombreNota(min)} queda por debajo de su nota más grave`); }
      if (max > cantante.max) { score -= (max - cantante.max) * 4; avisos.push(`${nombreNota(max)} queda por encima de su nota más aguda`); }
      if (tes[0] >= comodaMin && tes[1] <= comodaMax) score += 10;
      else {
        if (tes[1] > comodaMax) { score -= (tes[1] - comodaMax) * 1.5; avisos.push('la canción vive en su zona forzada'); }
        if (tes[0] < comodaMin) score -= (comodaMin - tes[0]) * 1;
      }
      // Que la melodía quede centrada en su zona cómoda suma.
      const centroCantante = (comodaMin + comodaMax) / 2;
      const centroCancion = (tes[0] + tes[1]) / 2;
      score -= Math.abs(centroCantante - centroCancion) * 0.6;
    }

    if (pesarCongregacion) {
      if (max > RANGO_CONGREGACION.max) { score -= (max - RANGO_CONGREGACION.max) * 2.5; avisos.push(`el pico ${nombreNota(max)} está sobre ${nombreNota(RANGO_CONGREGACION.max)}: la congregación dejará de cantar`); }
      else if (max > RANGO_CONGREGACION.comodoMax) score -= (max - RANGO_CONGREGACION.comodoMax) * 0.8;
      // Una congregación tolera mucho mejor lo grave que lo agudo: si la nota
      // se va abajo, la gente canta más flojo; si se va arriba, deja de cantar.
      if (min < RANGO_CONGREGACION.min) {
        score -= (RANGO_CONGREGACION.min - min) * 0.5;
        if (RANGO_CONGREGACION.min - min > 4) avisos.push('las notas más graves quedan por debajo de lo que la gente alcanza');
      }
      if (tes[1] <= RANGO_CONGREGACION.comodoMax && tes[0] >= RANGO_CONGREGACION.min) score += 6;
    }

    // Tonalidades cómodas para la banda (guitarra sobre todo).
    if (['G', 'D', 'A', 'E', 'C'].includes(preferredKeyName(tonicaOriginal + semis, false))) score += 0.4;
    if (semis === 0) score += 1.5;   // no se cambia de tonalidad sin un motivo
    score -= Math.abs(semis) * 0.15; // entre dos opciones parecidas, el cambio más pequeño

    opciones.push({
      semis, tonalidad, min, max, tesitura: tes,
      score: Number(score.toFixed(2)),
      avisos,
      etiqueta: semis === 0 ? 'original' : semis > 0 ? `+${semis} semitonos` : `${semis} semitonos`,
    });
  }
  opciones.sort((a, b) => b.score - a.score);
  return {
    rango, opciones, mejor: opciones[0],
    estimado: !!rango.estimado,
    aviso: rango.estimado
      ? 'El rango de la melodía está estimado a partir de la tonalidad. Anota la nota más grave y la más aguda (o transcribe la melodía en el Estudio) para una recomendación real.'
      : null,
  };
}

/** Reparte las voces del equipo según el rango de cada quien. */
export function repartirVoces(cantantes = [], song = {}) {
  const { rango } = tonalidadesRecomendadas(song, null, { considerarCongregacion: false });
  const melodiaMax = rango.max;
  const ordenados = [...cantantes].filter((c) => c.max != null)
    .sort((a, b) => (b.max + b.min) - (a.max + a.min));
  return ordenados.map((c, i) => {
    const alcanzaMelodia = c.max >= melodiaMax - 1 && c.min <= rango.min + 1;
    let papel;
    if (i === 0 && alcanzaMelodia) papel = 'Melodía (voz principal)';
    else if (i === 0) papel = 'Melodía, pero revisa la tonalidad: la canción se le sale del rango';
    else if (i === 1) papel = 'Tercera por encima en el coro, al unísono en el verso';
    else if (i === 2) papel = 'Tercera o sexta por debajo (rellena sin tapar)';
    else papel = 'Unísono con la melodía, o refuerzo del coro';
    return { ...c, papel, alcanzaMelodia };
  });
}

/** Ejercicios de calentamiento: patrones en semitonos desde la nota inicial. */
export const EJERCICIOS = [
  {
    id: 'labios', nombre: 'Vibración de labios (trino)', patron: [0, 4, 7, 4, 0], duracion: 0.45,
    objetivo: 'Soltar la voz sin forzar y conectar el aire.',
    como: 'Haz vibrar los labios con un soplo constante ("brrr") siguiendo las notas. Si se te cortan, estás empujando demasiado aire de golpe.',
    cuidado: 'Es el primer ejercicio del día. Nunca empieces con notas agudas.',
  },
  {
    id: 'sirena', nombre: 'Sirena', patron: [0, 12, 0], duracion: 1.2,
    objetivo: 'Unir el registro grave con el agudo sin el "salto" de voz.',
    como: 'Con una "u" o una "ng", sube y baja despacio como una sirena, sin cortar el sonido en el medio.',
    cuidado: 'Si sientes un quiebre, pasa por ahí más suave, no más fuerte.',
  },
  {
    id: 'ng', nombre: 'Resonancia "ng"', patron: [0, 2, 4, 2, 0], duracion: 0.5,
    objetivo: 'Llevar el sonido a la máscara (la cara) y quitarle peso a la garganta.',
    como: 'Di "ng" como al final de "sing" y mantén el sonido zumbando en la nariz y los pómulos.',
    cuidado: 'Debes sentir cosquilleo en la cara, nunca presión en la garganta.',
  },
  {
    id: 'cinco', nombre: 'Escala de cinco notas (ma-me-mi-mo-mu)', patron: [0, 2, 4, 5, 7, 5, 4, 2, 0], duracion: 0.35,
    objetivo: 'Afinación y claridad de las vocales.',
    como: 'Una vocal por vuelta. Mantén la mandíbula suelta y el sonido igual de redondo en las cinco notas.',
    cuidado: 'Si la última nota suena apretada, bájale medio tono y sigue desde ahí.',
  },
  {
    id: 'arpegio', nombre: 'Arpegio mayor', patron: [0, 4, 7, 12, 7, 4, 0], duracion: 0.4,
    objetivo: 'Saltos afinados, que es lo que pide cualquier coro moderno.',
    como: 'Canta con "a" bien abierta. Piensa la nota alta antes de cantarla, no la busques a mitad de camino.',
    cuidado: 'La octava se piensa "hacia adelante", no "hacia arriba": no estires el cuello.',
  },
  {
    id: 'staccato', nombre: 'Staccato (ja-ja-ja)', patron: [0, 4, 7, 12, 7, 4, 0], duracion: 0.22,
    objetivo: 'Activar el apoyo del diafragma.',
    como: 'Notas cortas y separadas. Pon la mano en el abdomen: debe rebotar con cada nota.',
    cuidado: 'Poco aire por nota. Si te mareas, descansa.',
  },
  {
    id: 'sostener', nombre: 'Sostener la nota', patron: [0], duracion: 6,
    objetivo: 'Control del aire y afinación estable, que es lo que más se nota en una plataforma.',
    como: 'Una sola nota, seis segundos, con el mismo volumen del principio al final.',
    cuidado: 'Si la nota se va bajando al final, te faltó aire: respira más abajo, no más fuerte.',
  },
  {
    id: 'diccion', nombre: 'Dicción (trabalenguas cantado)', patron: [0, 2, 4, 5, 7], duracion: 0.3,
    objetivo: 'Que la letra se entienda desde la última fila.',
    como: 'Canta "pa-ta-ka-la" en cada nota, exagerando labios y lengua sin apretar la mandíbula.',
    cuidado: 'Consonante clara, vocal larga: así se entiende sin gritar.',
  },
];

/** Genera la secuencia de notas de un ejercicio subiendo por semitonos. */
export function secuenciaEjercicio(ejercicio, { desde = 55, hasta = 67, paso = 1 } = {}) {
  const pasos = [];
  for (let base = desde; base <= hasta; base += paso) {
    pasos.push({ base, notas: ejercicio.patron.map((s) => base + s) });
  }
  return pasos;
}

/** Rutina de calentamiento de 10 minutos, en orden. */
export const RUTINA = [
  { min: 0, titulo: 'Respiración', detalle: 'Inhala en 4 tiempos, sostén 4, exhala en 8. Cinco rondas, hombros quietos.' },
  { min: 2, titulo: 'Vibración de labios', detalle: 'Ejercicio de labios subiendo y bajando. Sin forzar agudos todavía.' },
  { min: 4, titulo: 'Sirena y "ng"', detalle: 'Conecta los registros y lleva el sonido a la cara.' },
  { min: 6, titulo: 'Cinco notas y arpegios', detalle: 'Ya con vocales abiertas: afina y abre el rango.' },
  { min: 8, titulo: 'Staccato y dicción', detalle: 'Activa el apoyo y limpia las consonantes.' },
  { min: 9, titulo: 'Una frase de la canción', detalle: 'Canta la frase más alta del set a medio volumen. Si cuesta, baja la tonalidad antes del servicio, no durante.' },
];

/** Intervalos de armonía según el papel de la voz. */
export const ARMONIAS = [
  { id: 'tercera-arriba', nombre: 'Tercera por encima', semis: 4, uso: 'La armonía clásica del coro. Brilla sin tapar la melodía.', cuidado: 'Ojo: dentro de la tonalidad a veces son 3 semitonos y a veces 4. Canta la nota de la escala, no el intervalo fijo.' },
  { id: 'sexta-abajo', nombre: 'Sexta por debajo', semis: -9, uso: 'Suena llena y cálida; buena para versos.', cuidado: 'Es la misma nota que la tercera arriba, una octava abajo: fácil de encontrar si ya sabes esa.' },
  { id: 'tercera-abajo', nombre: 'Tercera por debajo', semis: -4, uso: 'Apoya la melodía sin llamar la atención. Ideal para la segunda voz de una mujer bajo una voz femenina.', cuidado: 'Si la melodía ya es grave, esta armonía se hunde: pásate a la sexta arriba.' },
  { id: 'quinta-arriba', nombre: 'Quinta por encima', semis: 7, uso: 'Sonido abierto, de himno. Úsala en el último coro.', cuidado: 'Suena a "coro antiguo" si se usa toda la canción.' },
  { id: 'octava', nombre: 'Octava', semis: 12, uso: 'No es armonía, es refuerzo: engrandece sin ensuciar.', cuidado: 'La opción segura cuando alguien no domina armonías todavía.' },
  { id: 'unisono', nombre: 'Unísono', semis: 0, uso: 'En el verso 1 y en canciones nuevas: que la gente aprenda la melodía.', cuidado: 'Es la decisión correcta más veces de lo que se cree.' },
];

/** Nota de armonía dentro de la tonalidad (no un intervalo fijo). */
export function notaArmonia(melodiaMidi, key = 'C', tipo = 'tercera-arriba') {
  const info = keyInfo(key);
  const tonica = noteToPc(info.tonic) ?? 0;
  const escala = info.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const grados = (midi) => {
    const rel = ((midi - tonica) % 12 + 12) % 12;
    const idx = escala.indexOf(rel);
    return idx;
  };
  const idx = grados(melodiaMidi);
  if (idx === -1) {
    // Nota fuera de la escala (paso cromático): se usa el intervalo fijo.
    const arm = ARMONIAS.find((a) => a.id === tipo);
    return melodiaMidi + (arm?.semis || 0);
  }
  const saltos = { 'tercera-arriba': 2, 'tercera-abajo': -2, 'sexta-abajo': -5, 'quinta-arriba': 4, octava: 7, unisono: 0 };
  const salto = saltos[tipo] ?? 2;
  const nuevoIdx = idx + salto;
  const octavas = Math.floor(nuevoIdx / 7);
  const grado = ((nuevoIdx % 7) + 7) % 7;
  const base = melodiaMidi - (((melodiaMidi - tonica) % 12 + 12) % 12);
  return base + escala[grado] + octavas * 12;
}

export const CUIDADO_VOCAL = [
  { titulo: 'Hidrátate desde la noche anterior', detalle: 'El agua tarda horas en llegar a las cuerdas. Beber justo antes de cantar no repara nada.' },
  { titulo: 'Calienta siempre, enfría a veces', detalle: '10 minutos antes; y después del servicio, un minuto de sirenas suaves ayuda a que la voz no quede cargada.' },
  { titulo: 'No cantes por encima del monitor', detalle: 'Si no te escuchas, pide más de ti en el monitor. Subir la voz para oírte es la forma más rápida de lastimarte.' },
  { titulo: 'Cuidado con el carraspeo', detalle: 'Aclararse la garganta golpea las cuerdas. Traga o toma agua en vez de carraspear.' },
  { titulo: 'Evita lácteos y café justo antes', detalle: 'Producen flema y resecan. El agua a temperatura ambiente es lo mejor.' },
  { titulo: 'Duerme', detalle: 'La voz es músculo: cansado, el rango agudo es el primero en desaparecer.' },
  { titulo: 'Si hay dolor, para', detalle: 'Ronquera después de cantar es normal una vez; si se repite cada semana, cambia la tonalidad o la técnica, no aguantes.' },
  { titulo: 'Habla bien entre semana', detalle: 'La mayoría de las lesiones vienen de hablar gritando, no de cantar.' },
];
