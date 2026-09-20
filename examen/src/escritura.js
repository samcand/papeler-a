/**
 * escritura.js — Comunicación escrita: consignas y rúbrica.
 *
 * Es el único módulo del Saber Pro que no es de opción múltiple: se entrega un
 * tema y hay que escribir un texto argumentativo. No se puede practicar con un
 * banco de preguntas, así que aquí van las dos piezas que sí se pueden dar:
 * consignas realistas y una rúbrica para revisarse con criterio.
 *
 * La rúbrica no pretende reemplazar a un evaluador. Sirve para releerse con
 * preguntas concretas, que es justo lo que no se hace cuando uno se relee sin
 * guía.
 */

export const CONSIGNAS = [
  {
    id: 'esc-01',
    tema: 'Educación',
    texto: 'Algunas instituciones han propuesto eliminar las tareas para la casa y dejar todo el trabajo académico dentro de la jornada escolar. ¿Está de acuerdo con esa medida? Escriba un texto argumentativo en el que defienda su posición.',
  },
  {
    id: 'esc-02',
    tema: 'Tecnología',
    texto: 'Se discute si las plataformas digitales deberían ser responsables por el contenido falso que circula en ellas. Escriba un texto argumentativo en el que fije y sustente su posición.',
  },
  {
    id: 'esc-03',
    tema: 'Ciudad',
    texto: 'Varias ciudades han restringido la circulación de vehículos particulares en zonas céntricas. ¿Es una medida justificada? Defienda su punto de vista con argumentos.',
  },
  {
    id: 'esc-04',
    tema: 'Trabajo',
    texto: 'El trabajo remoto se consolidó en muchos sectores. ¿Debería ser un derecho del trabajador o una decisión exclusiva del empleador? Argumente su posición.',
  },
  {
    id: 'esc-05',
    tema: 'Ambiente',
    texto: 'Algunos sostienen que la responsabilidad frente al cambio climático es sobre todo individual, y otros que es de los Estados y las grandes empresas. ¿Dónde recae principalmente? Defienda su postura.',
  },
  {
    id: 'esc-06',
    tema: 'Salud',
    texto: 'Se ha propuesto aumentar los impuestos a las bebidas azucaradas y los alimentos ultraprocesados para reducir la obesidad. ¿Es una política legítima y efectiva? Argumente.',
  },
  {
    id: 'esc-07',
    tema: 'Cultura',
    texto: 'Algunos consideran que el Estado debe financiar el arte y la cultura, y otros que esos recursos deberían destinarse a necesidades más urgentes. Escriba un texto argumentativo con su posición.',
  },
  {
    id: 'esc-08',
    tema: 'Educación superior',
    texto: 'Se discute si la educación universitaria pública debería ser gratuita para todos o gratuita solo para quienes no pueden pagarla. Defienda una de las dos posiciones.',
  },
  {
    id: 'esc-09',
    tema: 'Convivencia',
    texto: 'Varias instituciones han instalado cámaras de vigilancia en sus instalaciones para mejorar la seguridad. ¿Hasta dónde es aceptable esa vigilancia? Argumente su posición.',
  },
  {
    id: 'esc-10',
    tema: 'Ciencia y sociedad',
    texto: 'Se debate si la inteligencia artificial debería usarse para evaluar hojas de vida en procesos de selección laboral. Escriba un texto argumentativo defendiendo su punto de vista.',
  },
  {
    id: 'esc-11',
    tema: 'Participación',
    texto: 'Algunos países han establecido el voto obligatorio. ¿Debería serlo? Sustente su posición con argumentos.',
  },
  {
    id: 'esc-12',
    tema: 'Medios',
    texto: 'Se discute si los medios de comunicación deben publicar los nombres de personas acusadas antes de que exista una condena. Defienda y argumente su posición.',
  },
];

/** Tres niveles por criterio. El puntaje va de 0 a 2 y el total, de 0 a 8. */
export const RUBRICA = [
  {
    id: 'postura',
    nombre: 'Postura y planteamiento',
    pregunta: '¿Se entiende cuál es tu posición desde el primer párrafo y la mantienes hasta el final?',
    niveles: [
      'No se identifica una posición, o cambia a lo largo del texto',
      'Hay una posición, pero aparece tarde o se diluye en partes del texto',
      'La posición es explícita desde el inicio y todo el texto la sostiene',
    ],
  },
  {
    id: 'organizacion',
    nombre: 'Organización',
    pregunta: '¿Hay introducción, desarrollo y cierre, con párrafos que tratan una idea cada uno y conectores entre ellos?',
    niveles: [
      'El texto es un bloque sin estructura reconocible',
      'Se distinguen partes, pero hay párrafos con varias ideas mezcladas o saltos sin conector',
      'Estructura clara, un párrafo por idea y transiciones que guían la lectura',
    ],
  },
  {
    id: 'argumentos',
    nombre: 'Argumentos y evidencia',
    pregunta: '¿Cada afirmación va acompañada de una razón, un ejemplo o un dato, y consideras al menos una objeción?',
    niveles: [
      'Se afirma sin sustentar; el texto es una opinión repetida de varias formas',
      'Hay razones, pero son generales o no se atiende ninguna objeción',
      'Argumentos sustentados con ejemplos o datos y respuesta a una objeción razonable',
    ],
  },
  {
    id: 'lenguaje',
    nombre: 'Lenguaje',
    pregunta: '¿El vocabulario es preciso y la ortografía y la puntuación no entorpecen la lectura?',
    niveles: [
      'Errores frecuentes que dificultan entender lo que se quiso decir',
      'Se entiende, con errores puntuales o repeticiones y frases muy largas',
      'Léxico preciso, puntuación correcta y frases de longitud manejable',
    ],
  },
];

/** Errores que más aparecen y que se pueden revisar uno mismo. */
export const REVISION = [
  'La primera frase ya dice de qué trata el texto, sin rodeos ni "desde el principio de los tiempos".',
  'Cada párrafo se puede resumir en una sola oración.',
  'No hay párrafos de más de ocho o diez líneas.',
  'Los conectores corresponden a la relación real entre las ideas (no "sin embargo" para añadir).',
  'No se repite la misma palabra clave cuatro veces en un párrafo.',
  'El cierre no es un resumen literal de la introducción: aporta la consecuencia de lo argumentado.',
  'No quedan frases sin verbo ni oraciones de cuatro líneas sin un punto.',
];

export const DURACIONES = [20, 30, 40];
export const PALABRAS_SUGERIDAS = { minimo: 300, maximo: 500 };

export function contarPalabras(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio) return 0;
  return limpio.split(/\s+/).length;
}

export function contarParrafos(texto) {
  return String(texto || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
}

/** Aviso sobre la extensión, del mismo tipo que da un evaluador. */
export function revisarLongitud(palabras, { minimo, maximo } = PALABRAS_SUGERIDAS) {
  if (palabras === 0) return { estado: 'vacio', mensaje: 'Aún no has escrito nada.' };
  if (palabras < minimo) {
    return { estado: 'corto', mensaje: `Te faltan unas ${minimo - palabras} palabras para la extensión sugerida.` };
  }
  if (palabras > maximo) {
    return { estado: 'largo', mensaje: `Vas ${palabras - maximo} palabras por encima: revisa si sobra alguna idea repetida.` };
  }
  return { estado: 'bien', mensaje: 'Estás dentro de la extensión sugerida.' };
}

/** Convierte las selecciones de la rúbrica en un puntaje de 0 a 100. */
export function puntuar(selecciones) {
  const valores = RUBRICA.map((c) => Number(selecciones?.[c.id] ?? -1));
  const respondidos = valores.filter((v) => v >= 0);
  const total = respondidos.reduce((s, v) => s + v, 0);
  const maximo = RUBRICA.length * 2;
  return {
    total,
    maximo,
    completa: respondidos.length === RUBRICA.length,
    porcentaje: Math.round((total / maximo) * 100),
    flojos: RUBRICA.filter((c) => Number(selecciones?.[c.id] ?? -1) === 0).map((c) => c.nombre),
  };
}

/** Elige una consigna distinta de las últimas que ya salieron. */
export function siguienteConsigna(hechas = [], rnd = Math.random) {
  const frescas = CONSIGNAS.filter((c) => !hechas.includes(c.id));
  const pozo = frescas.length ? frescas : CONSIGNAS;
  return pozo[Math.floor(rnd() * pozo.length)];
}
