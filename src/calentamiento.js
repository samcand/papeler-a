/**
 * calentamiento.js — Rutinas de calentamiento para cada instrumento y para la voz.
 *
 * Criterio: son rutinas cortas y concretas, pensadas para hacerse de pie, con el
 * instrumento puesto y con el reloj corriendo. Cada ejercicio dice qué se busca,
 * cómo se hace y qué no hay que hacer — porque calentar mal lesiona.
 *
 * Cada ejercicio trae `prioridad`: 1 es imprescindible (entra hasta en la rutina
 * de 5 minutos), 3 es lo que se añade si hay tiempo.
 */

export const INSTRUMENTOS_CALENTAMIENTO = [
  { id: 'guitarra', nombre: '🎸 Guitarra', color: 'guitarra' },
  { id: 'ukelele', nombre: '🪕 Ukelele', color: 'ukelele' },
  { id: 'bajo', nombre: '🎵 Bajo', color: 'bajo' },
  { id: 'piano', nombre: '🎹 Piano', color: 'piano' },
  { id: 'bateria', nombre: '🥁 Batería', color: 'bateria' },
  { id: 'canto', nombre: '🎤 Canto', color: 'canto' },
  { id: 'equipo', nombre: '👥 Equipo completo', color: 'equipo' },
];

/** Ejercicios comunes a todos: el cuerpo antes que el instrumento. */
const CUERPO = [
  {
    id: 'postura', nombre: 'Postura y hombros', minutos: 1, prioridad: 1, sinInstrumento: true,
    objetivo: 'Soltar la tensión que se acumula en cuello y hombros, que es de donde vienen casi todas las molestias al tocar.',
    como: 'De pie: sube los hombros hasta las orejas, aguanta 3 segundos y suéltalos de golpe. Cinco veces. Después gira la cabeza despacio a cada lado.',
    cuidado: 'Movimientos lentos. Si algo truena o duele, no lo fuerces.',
  },
  {
    id: 'manos', nombre: 'Manos y muñecas', minutos: 1, prioridad: 1, sinInstrumento: true,
    objetivo: 'Llevar sangre a los dedos antes de exigirles precisión.',
    como: 'Abre y cierra las manos 20 veces. Gira las muñecas en círculos, 10 en cada sentido. Estira suavemente cada dedo hacia atrás 3 segundos.',
    cuidado: 'Estirar, no tirar. El estiramiento se siente, no duele.',
  },
];

export const RUTINAS = {
  guitarra: [
    ...CUERPO,
    {
      id: 'cromatico', nombre: 'Cromático 1-2-3-4', minutos: 3, prioridad: 1, bpm: 60,
      objetivo: 'Despertar los cuatro dedos y sincronizar las dos manos.',
      como: 'Un dedo por traste (trastes 5 a 8), cuerda por cuerda de la 6ª a la 1ª y de vuelta. Una nota por clic, con púa alternada (abajo-arriba).',
      cuidado: 'Lento y limpio. Si suena sucio, baja el metrónomo: la velocidad llega sola, la limpieza no.',
      detalle: ['6ª: 5-6-7-8', '5ª: 5-6-7-8', '…hasta la 1ª y regresa'],
    },
    {
      id: 'cambios', nombre: 'Cambios de acordes por pares', minutos: 3, prioridad: 1, bpm: 70,
      objetivo: 'El problema de casi todo guitarrista no son los acordes: son los cambios.',
      como: 'Elige dos acordes de la canción del domingo y cámbialos cada 4 tiempos, sin parar, un minuto por pareja. Mira el acorde al que vas, no al que dejas.',
      cuidado: 'Si un dedo se queda en la misma cuerda entre los dos acordes, déjalo puesto: es un dedo guía.',
      usaCancion: true,
    },
    {
      id: 'rasgueo', nombre: 'Rasgueo sin parar la mano', minutos: 2, prioridad: 2, bpm: 80,
      objetivo: 'Que la mano derecha se vuelva un péndulo constante.',
      como: 'Mantén el brazo bajando y subiendo en corcheas todo el tiempo y simplemente no toques las cuerdas donde va el silencio. Dos minutos sin detenerte.',
      cuidado: 'El movimiento sale del antebrazo, no de la muñeca rígida ni del codo entero.',
    },
    {
      id: 'cejilla', nombre: 'Cejilla: colocar y soltar', minutos: 2, prioridad: 2,
      objetivo: 'Hacer la cejilla sin agarrotar la mano.',
      como: 'Coloca un F, toca las seis cuerdas, suelta del todo la presión. Repite 10 veces. Después lo mismo con Bm.',
      cuidado: 'Dos minutos como máximo. La cejilla forzada durante mucho rato es la lesión más común del guitarrista.',
    },
    {
      id: 'dinamica-g', nombre: 'La misma vuelta suave y fuerte', minutos: 2, prioridad: 3, bpm: 75,
      objetivo: 'Controlar el volumen con la mano, no con el ampli.',
      como: 'Toca cuatro compases muy suave (solo las cuerdas agudas) y cuatro fuerte (las seis), sin cambiar el tempo.',
      cuidado: 'Al tocar fuerte no aceleres: es el reflejo natural y hay que vencerlo.',
    },
    {
      id: 'cancion-g', nombre: 'La canción del domingo al 80 %', minutos: 3, prioridad: 2,
      objetivo: 'Entrar al ensayo con la canción ya en las manos.',
      como: 'Toca la canción completa al 80 % de su tempo, con el metrónomo. Si hay un cambio que se traba, aíslalo y repítelo 10 veces.',
      cuidado: 'Si no sale limpia en lento, en el servicio saldrá peor: los nervios aceleran todo.',
      usaCancion: true,
    },
  ],

  ukelele: [
    ...CUERPO,
    {
      id: 'cromatico-u', nombre: 'Cromático en cuatro cuerdas', minutos: 2, prioridad: 1, bpm: 65,
      objetivo: 'Despertar los dedos en un mástil corto, donde todo está más junto.',
      como: 'Un dedo por traste (3 a 6), de la 4ª cuerda a la 1ª y de vuelta, una nota por clic.',
      cuidado: 'Pisa con la punta del dedo: en el ukelele las cuerdas vecinas se apagan con nada.',
    },
    {
      id: 'cambios-u', nombre: 'La vuelta de cuatro acordes', minutos: 3, prioridad: 1, bpm: 75,
      objetivo: 'Tener C, G, Am y F automáticos: con esos cuatro se acompaña medio repertorio.',
      como: 'C – G – Am – F, un compás cada uno, sin parar. Después la misma vuelta empezando por Am.',
      cuidado: 'Cambia el acorde en el tiempo 4, no en el 1: así llegas a tiempo.',
    },
    {
      id: 'rasgueo-u', nombre: 'Rasgueo con la yema', minutos: 2, prioridad: 2, bpm: 80,
      objetivo: 'Sonido cálido que no compita con la voz.',
      como: 'Rasguea con la yema del índice hacia abajo y la uña hacia arriba, muy cerca del final del mástil.',
      cuidado: 'Si suena metálico, estás rasgueando demasiado cerca del puente.',
    },
    {
      id: 'cancion-u', nombre: 'La canción del domingo al 80 %', minutos: 3, prioridad: 2,
      objetivo: 'Llegar al ensayo con la canción lista.',
      como: 'Tócala completa al 80 % del tempo con metrónomo.',
      cuidado: 'Marca en la hoja los dos cambios que más se traban y repítelos aparte.',
      usaCancion: true,
    },
  ],

  bajo: [
    ...CUERPO,
    {
      id: 'cromatico-b', nombre: 'Cromático una nota por dedo', minutos: 3, prioridad: 1, bpm: 55,
      objetivo: 'Fuerza y separación de dedos en cuerdas gruesas.',
      como: 'Trastes 5-6-7-8, una nota por clic, alternando índice y medio en la mano derecha sin excepción.',
      cuidado: 'Muy lento. En el bajo, tocar rápido en frío es la forma más fácil de lastimarse la muñeca.',
    },
    {
      id: 'escala-b', nombre: 'Escala de la tonalidad en dos octavas', minutos: 3, prioridad: 1, bpm: 60,
      objetivo: 'Saber dónde están las notas de la canción sin pensar.',
      como: 'Toca la escala de la tonalidad del set subiendo y bajando, dos octavas, una nota por clic. Después solo las fundamentales de los acordes.',
      cuidado: 'Di el nombre de cada nota en voz alta: eso es lo que convierte el ejercicio en memoria.',
      usaCancion: true,
    },
    {
      id: 'bloqueo', nombre: 'Bloqueo con el bombo', minutos: 3, prioridad: 1, bpm: 80,
      objetivo: 'Sonar como una sola cosa con la batería, que es todo el trabajo del bajo.',
      como: 'Con el metrónomo, toca solo en los tiempos 1 y en el "y" del 3, como un bombo típico. Escucha si tu nota y el clic empiezan exactamente juntos.',
      cuidado: 'Llegar tarde es peor que tocar poco. Si dudas, toca menos notas y más a tiempo.',
    },
    {
      id: 'apagado', nombre: 'Apagado de notas', minutos: 2, prioridad: 2, bpm: 70,
      objetivo: 'El silencio entre notas es parte del groove.',
      como: 'Toca negras dejando que cada nota dure solo medio tiempo: apaga con el dedo que no pisa o con la palma derecha.',
      cuidado: 'Si las notas se pegan unas con otras, el bajo suena a barro en la mezcla.',
    },
    {
      id: 'cancion-b', nombre: 'La canción con clic', minutos: 3, prioridad: 2,
      objetivo: 'Entrar al ensayo con las entradas seguras.',
      como: 'Toca la canción completa con metrónomo, marcando bien el primer tiempo de cada sección.',
      cuidado: 'Cuenta los compases de la intro en voz alta: es donde más se falla.',
      usaCancion: true,
    },
  ],

  piano: [
    ...CUERPO,
    {
      id: 'cinco-dedos', nombre: 'Cinco dedos, manos separadas', minutos: 2, prioridad: 1, bpm: 60,
      objetivo: 'Despertar cada dedo con el mismo peso.',
      como: 'Do-Re-Mi-Fa-Sol y de vuelta, una nota por clic, primero mano derecha, luego izquierda. Muñeca suelta, dedos curvos.',
      cuidado: 'Todas las notas deben sonar igual de fuertes. Si el meñique suena flojo, ve más lento, no más fuerte.',
    },
    {
      id: 'escala-p', nombre: 'Escala de la tonalidad del set', minutos: 3, prioridad: 1, bpm: 65,
      objetivo: 'Tener bajo los dedos las notas que vas a usar el domingo.',
      como: 'Dos octavas subiendo y bajando, manos separadas y después juntas. Usa la digitación de siempre (pulgar bajo el tercer dedo).',
      cuidado: 'Sin acelerar al bajar: es donde todo el mundo corre.',
      usaCancion: true,
    },
    {
      id: 'inversiones', nombre: 'Tríadas e inversiones', minutos: 3, prioridad: 1,
      objetivo: 'Cambiar de acorde moviendo lo mínimo, que es lo que separa a un pianista de acompañamiento de un estudiante.',
      como: 'Toma los acordes de la canción y tócalos en la inversión más cercana al anterior. La mano casi no debe viajar.',
      cuidado: 'Si tu mano salta por todo el teclado, estás tocando siempre en posición fundamental: corrígelo aquí, no en el servicio.',
      usaCancion: true,
    },
    {
      id: 'cadencia', nombre: 'Cadencia ii – V – I', minutos: 2, prioridad: 2,
      objetivo: 'Tener a mano la fórmula con la que se cierra cualquier canción.',
      como: 'En la tonalidad del set y en las dos vecinas del círculo de quintas, con la mano izquierda solo en fundamentales.',
      cuidado: 'Escucha la resolución: si no se siente que "llegó", revisa la conducción de voces.',
      usaCancion: true,
    },
    {
      id: 'pad-p', nombre: 'Colchón 1-5-9 sostenido', minutos: 2, prioridad: 2,
      objetivo: 'Aprender a no llenar: el ejercicio más difícil para un teclista.',
      como: 'Sostén un acorde en fundamental, quinta y novena durante 8 compases sin adornar. Respira y quédate quieto.',
      cuidado: 'La tentación de meter una escalita es exactamente lo que hay que vencer.',
    },
    {
      id: 'cancion-p', nombre: 'La canción del domingo al 80 %', minutos: 3, prioridad: 2,
      objetivo: 'Llegar al ensayo con el arreglo claro.',
      como: 'Tócala completa al 80 % del tempo, decidiendo en cada sección si vas a acompañar o a sostener.',
      cuidado: 'Marca en la hoja dónde entra y dónde sale el piano.',
      usaCancion: true,
    },
  ],

  bateria: [
    ...CUERPO,
    {
      id: 'golpe-simple', nombre: 'Golpe simple (single stroke)', minutos: 3, prioridad: 1, bpm: 70,
      objetivo: 'Igualar las dos manos, que nunca están igual de despiertas.',
      como: 'Mano derecha e izquierda alternadas en la caja, corcheas a 70. Cuatro compases fuerte, cuatro suave, sin cambiar el tempo.',
      cuidado: 'Deja rebotar la baqueta; no la claves. Si te duele el antebrazo, estás apretando.',
    },
    {
      id: 'paradiddle', nombre: 'Paradiddle', minutos: 3, prioridad: 2, bpm: 65,
      objetivo: 'Coordinación e independencia para los fills.',
      como: 'D-I-D-D  I-D-I-I, en semicorcheas, acentuando siempre la primera de cada grupo.',
      cuidado: 'Lento hasta que el acento salga solo. La velocidad sin acento no sirve de nada.',
    },
    {
      id: 'independencia', nombre: 'Independencia bombo / hi-hat', minutos: 3, prioridad: 1, bpm: 75,
      objetivo: 'Que los pies no dependan de las manos.',
      como: 'Hi-hat en corcheas constantes. Bombo: primero en negras, después en 1 y "y de 3", después en 1 y 4.',
      cuidado: 'Si el hi-hat se tropieza cuando cambia el bombo, baja el tempo hasta que deje de pasar.',
    },
    {
      id: 'dinamica-d', nombre: 'El mismo groove a tres volúmenes', minutos: 3, prioridad: 1, bpm: 80,
      objetivo: 'Tocar suave es más difícil que tocar fuerte, y es lo que más se necesita en un verso.',
      como: 'Ocho compases muy suaves (cross-stick), ocho medios, ocho fuertes (ride y crash). Sin cambiar el tempo ni un BPM.',
      cuidado: 'Grábate: casi siempre el tramo fuerte sale acelerado.',
    },
    {
      id: 'fills', nombre: 'Fill de un compás y vuelta', minutos: 2, prioridad: 2, bpm: 80,
      objetivo: 'Que el fill no descuadre la entrada del coro.',
      como: 'Siete compases de groove y uno de fill, en bucle. El fill debe caer exacto en el 1 siguiente.',
      cuidado: 'Fill sencillo. El que falla arruina la entrada de todo el equipo.',
    },
    {
      id: 'cancion-d', nombre: 'La canción con clic', minutos: 3, prioridad: 2,
      objetivo: 'Ser el reloj del equipo desde el primer compás.',
      como: 'Toca la canción con el clic de principio a fin, respetando la dinámica de cada sección.',
      cuidado: 'Si al llegar al último coro vas por delante del clic, ese es exactamente el problema a corregir.',
      usaCancion: true,
    },
  ],

  canto: [
    {
      id: 'respiracion', nombre: 'Respiración', minutos: 2, prioridad: 1, sinInstrumento: true,
      objetivo: 'Apoyar con el diafragma en vez de empujar con la garganta.',
      como: 'Inhala en 4 tiempos, sostén 4, exhala en 8 soplando fino. Cinco rondas. Los hombros no se mueven.',
      cuidado: 'Si te mareas, para y respira normal: estás hiperventilando.',
    },
    { id: 'vocal-labios', nombre: 'Vibración de labios', minutos: 2, prioridad: 1, ejercicioVocal: 'labios' },
    { id: 'vocal-sirena', nombre: 'Sirena', minutos: 1, prioridad: 1, ejercicioVocal: 'sirena' },
    { id: 'vocal-ng', nombre: 'Resonancia "ng"', minutos: 1, prioridad: 2, ejercicioVocal: 'ng' },
    { id: 'vocal-cinco', nombre: 'Cinco notas (ma-me-mi-mo-mu)', minutos: 2, prioridad: 1, ejercicioVocal: 'cinco' },
    { id: 'vocal-arpegio', nombre: 'Arpegio mayor', minutos: 2, prioridad: 2, ejercicioVocal: 'arpegio' },
    { id: 'vocal-staccato', nombre: 'Staccato', minutos: 1, prioridad: 3, ejercicioVocal: 'staccato' },
    { id: 'vocal-diccion', nombre: 'Dicción', minutos: 1, prioridad: 3, ejercicioVocal: 'diccion' },
    {
      id: 'frase-alta', nombre: 'La frase más alta del set', minutos: 2, prioridad: 1,
      objetivo: 'Comprobar antes del servicio que la nota más alta sale cómoda.',
      como: 'Canta la frase más aguda de la canción del domingo a medio volumen.',
      cuidado: 'Si cuesta ahora, baja la tonalidad antes del servicio, no durante. En caliente siempre parece que sí se puede.',
      usaCancion: true,
    },
  ],

  equipo: [
    {
      id: 'afinar', nombre: 'Afinar todos a la vez', minutos: 2, prioridad: 1,
      objetivo: 'Empezar el ensayo afinados y con el mismo La.',
      como: 'Todos los instrumentos de cuerda afinan con la misma referencia (La = 440 Hz). El afinador de la app sirve para todos.',
      cuidado: 'Afinar "de oído con el de al lado" es cómo un equipo termina medio tono abajo.',
    },
    {
      id: 'pulso-equipo', nombre: 'Pulso compartido', minutos: 3, prioridad: 1, bpm: 80,
      objetivo: 'Que todos sientan el mismo tiempo antes de tocar una nota.',
      como: 'Con el metrónomo a la vista, todos marcan el pulso con el pie en silencio 8 compases; después entra solo la batería, luego el bajo, luego el resto.',
      cuidado: 'Nadie toca nada hasta que el grupo respire igual. Dos minutos aquí ahorran media hora de ensayo.',
    },
    {
      id: 'dinamica-equipo', nombre: 'Subir y bajar juntos', minutos: 3, prioridad: 1,
      objetivo: 'Practicar la dinámica, que es lo que nunca se ensaya y siempre falla.',
      como: 'Una vuelta de cuatro acordes: cuatro compases al mínimo, cuatro medios, cuatro al máximo y de vuelta al mínimo, mirando al director.',
      cuidado: 'Al subir la intensidad, el tempo no sube. Es el error clásico del equipo entero.',
    },
    {
      id: 'transiciones', nombre: 'Transiciones del set', minutos: 4, prioridad: 2,
      objetivo: 'El 80 % de los tropiezos ocurre entre canción y canción, no dentro de ellas.',
      como: 'Toca los últimos 8 compases de cada canción y los primeros 8 de la siguiente, encadenados.',
      cuidado: 'Acuerden en voz alta quién da la entrada de cada canción.',
      usaCancion: true,
    },
    {
      id: 'oracion', nombre: 'Orar juntos', minutos: 2, prioridad: 1, sinInstrumento: true,
      objetivo: 'Recordar para qué se ensayó todo lo anterior.',
      como: 'Dos minutos, de pie, por el servicio y por la congregación. Cierra el calentamiento el líder.',
      cuidado: 'No lo dejes para "si sobra tiempo": nunca sobra.',
    },
  ],
};

/**
 * Arma una rutina que quepa de verdad en los minutos disponibles.
 *
 * Los ejercicios de prioridad 1 no se eliminan nunca: si no caben, se acortan
 * (con un mínimo de un minuto cada uno), porque es mejor hacer lo esencial
 * corto que saltárselo. Con el tiempo que sobre se añaden los demás.
 */
export function construirRutina(instrumento = 'guitarra', minutos = 10) {
  const todos = RUTINAS[instrumento] || RUTINAS.guitarra;
  const esenciales = todos.filter((e) => e.prioridad === 1);
  const baseTotal = esenciales.reduce((n, e) => n + e.minutos, 0);
  const elegidos = new Map();

  if (baseTotal > minutos) {
    // No cabe lo esencial: se acorta proporcionalmente.
    const factor = minutos / baseTotal;
    let restante = minutos;
    esenciales.forEach((ej, i) => {
      const quedan = esenciales.length - i;
      const propuesto = Math.max(1, Math.round(ej.minutos * factor));
      const asignado = Math.max(1, Math.min(propuesto, restante - (quedan - 1)));
      elegidos.set(ej, asignado);
      restante -= asignado;
    });
  } else {
    for (const ej of esenciales) elegidos.set(ej, ej.minutos);
    let restante = minutos - baseTotal;
    for (const prioridad of [2, 3]) {
      for (const ej of todos.filter((e) => e.prioridad === prioridad)) {
        if (ej.minutos <= restante) {
          elegidos.set(ej, ej.minutos);
          restante -= ej.minutos;
        }
      }
    }
  }

  // Se conserva el orden de la rutina, no el orden por prioridad.
  const ejercicios = todos
    .filter((e) => elegidos.has(e))
    .map((e) => ({ ...e, minutos: elegidos.get(e) }));
  return { ejercicios, minutos: ejercicios.reduce((n, e) => n + e.minutos, 0) };
}

export const DURACIONES = [5, 10, 15, 20];

/** Consejos generales, válidos para cualquier instrumento. */
export const PRINCIPIOS = [
  'Calentar no es ensayar: aquí no se estudia la canción, se prepara el cuerpo.',
  'Lento siempre. La velocidad es consecuencia de la limpieza, nunca al revés.',
  'Si algo duele, para. Cansancio sí, dolor no.',
  'Diez minutos todos los días valen más que una hora el sábado.',
  'Termina el calentamiento con algo de la canción del domingo: así el cuerpo ya está en contexto cuando empieza el ensayo.',
];
