/**
 * abstracto.js — Banco de razonamiento abstracto.
 *
 * Las preguntas con figuras traen un campo `figuras`:
 *   { enunciado: [spec, ...], opciones: [spec, ...], disposicion: 'fila' | 'matriz3' }
 * cada spec lo dibuja figuras.js. Cuando hay `figuras.opciones`, el texto de
 * `opciones` no se muestra: sirve de etiqueta para lectores de pantalla.
 *
 * Las opciones se barajan al presentarlas (motor.js).
 */

const sinRelleno = (forma, extra = {}) => ({ forma, relleno: 'ninguno', ...extra });

export const ABSTRACTO = [
  // ----- Series de figuras -----
  {
    id: 'abs-001', tema: 'series-figuras', dificultad: 1,
    enunciado: '¿Qué figura continúa la serie?',
    figuras: {
      enunciado: [sinRelleno('triangulo'), sinRelleno('cuadrado'), sinRelleno('pentagono'), { forma: 'interrogante' }],
      opciones: [sinRelleno('hexagono'), sinRelleno('heptagono'), sinRelleno('pentagono'), sinRelleno('triangulo')],
    },
    opciones: ['hexágono', 'heptágono', 'pentágono', 'triángulo'],
    correcta: 0,
    explicacion: 'Cada figura tiene un lado más que la anterior: 3, 4, 5 y por lo tanto 6 lados.',
  },
  {
    id: 'abs-002', tema: 'series-figuras', dificultad: 1,
    enunciado: '¿Qué figura continúa la serie?',
    figuras: {
      enunciado: [{ forma: 'flecha', giro: 0 }, { forma: 'flecha', giro: 45 }, { forma: 'flecha', giro: 90 }, { forma: 'interrogante' }],
      opciones: [{ forma: 'flecha', giro: 135 }, { forma: 'flecha', giro: 180 }, { forma: 'flecha', giro: 90 }, { forma: 'flecha', giro: 225 }],
    },
    opciones: ['flecha girada 135°', 'flecha girada 180°', 'flecha girada 90°', 'flecha girada 225°'],
    correcta: 0,
    explicacion: 'La flecha gira 45° en sentido horario en cada paso: 0°, 45°, 90° y 135°.',
  },
  {
    id: 'abs-003', tema: 'series-figuras', dificultad: 1,
    enunciado: '¿Qué figura continúa la serie?',
    figuras: {
      enunciado: [sinRelleno('cuadrado', { puntos: 1 }), sinRelleno('cuadrado', { puntos: 2 }), sinRelleno('cuadrado', { puntos: 3 }), { forma: 'interrogante' }],
      opciones: [sinRelleno('cuadrado', { puntos: 4 }), sinRelleno('cuadrado', { puntos: 5 }), sinRelleno('triangulo', { puntos: 4 }), sinRelleno('cuadrado', { puntos: 3 })],
    },
    opciones: ['cuadrado con 4 puntos', 'cuadrado con 5 puntos', 'triángulo con 4 puntos', 'cuadrado con 3 puntos'],
    correcta: 0,
    explicacion: 'La figura no cambia; lo que aumenta es el número de puntos, de uno en uno.',
  },
  {
    id: 'abs-004', tema: 'series-figuras', dificultad: 2,
    enunciado: '¿Qué figura continúa la serie?',
    figuras: {
      enunciado: [
        { forma: 'triangulo', relleno: 'ninguno' },
        { forma: 'cuadrado', relleno: 'solido' },
        { forma: 'pentagono', relleno: 'ninguno' },
        { forma: 'interrogante' },
      ],
      opciones: [
        { forma: 'hexagono', relleno: 'solido' },
        { forma: 'hexagono', relleno: 'ninguno' },
        { forma: 'heptagono', relleno: 'solido' },
        { forma: 'pentagono', relleno: 'solido' },
      ],
    },
    opciones: ['hexágono sólido', 'hexágono sin relleno', 'heptágono sólido', 'pentágono sólido'],
    correcta: 0,
    explicacion: 'Hay dos reglas a la vez: el número de lados crece de uno en uno (3, 4, 5, 6) y el relleno alterna vacío-lleno. Toca un hexágono sólido.',
    pista: 'Fíjate en un atributo a la vez: primero los lados, después el relleno.',
  },
  {
    id: 'abs-005', tema: 'series-figuras', dificultad: 2,
    enunciado: '¿Qué figura continúa la serie?',
    figuras: {
      enunciado: [{ forma: 'ele', giro: 0 }, { forma: 'ele', giro: 90 }, { forma: 'ele', giro: 180 }, { forma: 'interrogante' }],
      opciones: [{ forma: 'ele', giro: 270 }, { forma: 'ele', giro: 0 }, { forma: 'ele', giro: 180, espejo: true }, { forma: 'ele', giro: 90 }],
    },
    opciones: ['ele girada 270°', 'ele en la posición inicial', 'ele reflejada', 'ele girada 90°'],
    correcta: 0,
    explicacion: 'La figura gira 90° en cada paso, siempre en el mismo sentido: 0°, 90°, 180° y 270°. La opción reflejada no es un giro.',
  },
  {
    id: 'abs-006', tema: 'series-figuras', dificultad: 3,
    enunciado: '¿Qué figura continúa la serie?',
    figuras: {
      enunciado: [
        { forma: 'hexagono', relleno: 'rayado', puntos: 1 },
        { forma: 'hexagono', relleno: 'ninguno', puntos: 2 },
        { forma: 'hexagono', relleno: 'rayado', puntos: 3 },
        { forma: 'interrogante' },
      ],
      opciones: [
        { forma: 'hexagono', relleno: 'ninguno', puntos: 4 },
        { forma: 'hexagono', relleno: 'rayado', puntos: 4 },
        { forma: 'hexagono', relleno: 'ninguno', puntos: 3 },
        { forma: 'heptagono', relleno: 'ninguno', puntos: 4 },
      ],
    },
    opciones: ['hexágono sin relleno con 4 puntos', 'hexágono rayado con 4 puntos', 'hexágono sin relleno con 3 puntos', 'heptágono sin relleno con 4 puntos'],
    correcta: 0,
    explicacion: 'El relleno alterna rayado y vacío, y los puntos aumentan de uno en uno. Al cuarto lugar le toca vacío con 4 puntos.',
  },
  {
    id: 'abs-007', tema: 'series-figuras', dificultad: 2,
    enunciado: '¿Qué figura continúa la serie?',
    figuras: {
      enunciado: [
        { forma: 'cuadrado', interior: 'circulo' },
        { forma: 'cuadrado', interior: 'cuadrado' },
        { forma: 'cuadrado', interior: 'triangulo' },
        { forma: 'interrogante' },
      ],
      opciones: [
        { forma: 'cuadrado', interior: 'circulo' },
        { forma: 'cuadrado', interior: 'cuadrado' },
        { forma: 'circulo', interior: 'triangulo' },
        { forma: 'cuadrado' },
      ],
    },
    opciones: ['cuadrado con círculo dentro', 'cuadrado con cuadrado dentro', 'círculo con triángulo dentro', 'cuadrado vacío'],
    correcta: 0,
    explicacion: 'La figura interior sigue un ciclo de tres: círculo, cuadrado, triángulo y vuelta a empezar con el círculo.',
  },

  // ----- Matrices y analogías figurales -----
  {
    id: 'abs-008', tema: 'matrices', dificultad: 2,
    enunciado: 'Completa la matriz: ¿qué figura va en el lugar vacío?',
    figuras: {
      disposicion: 'matriz3',
      enunciado: [
        { forma: 'triangulo', relleno: 'ninguno' }, { forma: 'triangulo', relleno: 'rayado' }, { forma: 'triangulo', relleno: 'solido' },
        { forma: 'cuadrado', relleno: 'ninguno' }, { forma: 'cuadrado', relleno: 'rayado' }, { forma: 'cuadrado', relleno: 'solido' },
        { forma: 'pentagono', relleno: 'ninguno' }, { forma: 'pentagono', relleno: 'rayado' }, { forma: 'interrogante' },
      ],
      opciones: [
        { forma: 'pentagono', relleno: 'solido' },
        { forma: 'pentagono', relleno: 'ninguno' },
        { forma: 'hexagono', relleno: 'solido' },
        { forma: 'cuadrado', relleno: 'solido' },
      ],
    },
    opciones: ['pentágono sólido', 'pentágono sin relleno', 'hexágono sólido', 'cuadrado sólido'],
    correcta: 0,
    explicacion: 'Cada fila mantiene la figura (triángulo, cuadrado, pentágono) y cada columna mantiene el relleno (vacío, rayado, sólido). La casilla que falta es un pentágono sólido.',
    pista: 'Lee la matriz por filas y luego por columnas: cada dirección controla un atributo.',
  },
  {
    id: 'abs-009', tema: 'matrices', dificultad: 3,
    enunciado: 'Completa la matriz: ¿qué figura va en el lugar vacío?',
    figuras: {
      disposicion: 'matriz3',
      enunciado: [
        { forma: 'triangulo', puntos: 1 }, { forma: 'cuadrado', puntos: 1 }, { forma: 'pentagono', puntos: 1 },
        { forma: 'triangulo', puntos: 2 }, { forma: 'cuadrado', puntos: 2 }, { forma: 'pentagono', puntos: 2 },
        { forma: 'triangulo', puntos: 3 }, { forma: 'cuadrado', puntos: 3 }, { forma: 'interrogante' },
      ],
      opciones: [
        { forma: 'pentagono', puntos: 3 },
        { forma: 'pentagono', puntos: 2 },
        { forma: 'hexagono', puntos: 3 },
        { forma: 'cuadrado', puntos: 3 },
      ],
    },
    opciones: ['pentágono con 3 puntos', 'pentágono con 2 puntos', 'hexágono con 3 puntos', 'cuadrado con 3 puntos'],
    correcta: 0,
    explicacion: 'La columna fija la figura (triángulo, cuadrado, pentágono) y la fila fija la cantidad de puntos (1, 2, 3). Falta el pentágono con 3 puntos.',
  },
  {
    id: 'abs-010', tema: 'matrices', dificultad: 2,
    enunciado: 'La primera figura es a la segunda como la tercera es a… ¿cuál?',
    figuras: {
      enunciado: [
        { forma: 'cuadrado', relleno: 'ninguno' },
        { forma: 'cuadrado', relleno: 'solido' },
        { forma: 'hexagono', relleno: 'ninguno' },
        { forma: 'interrogante' },
      ],
      opciones: [
        { forma: 'hexagono', relleno: 'solido' },
        { forma: 'cuadrado', relleno: 'solido' },
        { forma: 'hexagono', relleno: 'rayado' },
        { forma: 'octagono', relleno: 'solido' },
      ],
    },
    opciones: ['hexágono sólido', 'cuadrado sólido', 'hexágono rayado', 'octágono sólido'],
    correcta: 0,
    explicacion: 'La transformación es "rellenar la figura sin cambiar su forma". Aplicada al hexágono da un hexágono sólido.',
  },

  // ----- El que no pertenece -----
  {
    id: 'abs-011', tema: 'diferente', dificultad: 1,
    enunciado: '¿Cuál de estas figuras no pertenece al grupo?',
    figuras: {
      opciones: [sinRelleno('pentagono'), sinRelleno('cuadrado'), sinRelleno('hexagono'), sinRelleno('octagono')],
    },
    opciones: ['pentágono', 'cuadrado', 'hexágono', 'octágono'],
    correcta: 0,
    explicacion: 'Las demás tienen un número par de lados (4, 6 y 8). El pentágono tiene 5.',
  },
  {
    id: 'abs-012', tema: 'diferente', dificultad: 2,
    enunciado: '¿Cuál de estas figuras no pertenece al grupo?',
    figuras: {
      opciones: [
        sinRelleno('triangulo', { puntos: 2 }),
        sinRelleno('cuadrado', { puntos: 3 }),
        sinRelleno('pentagono', { puntos: 1 }),
        sinRelleno('hexagono', { puntos: 5 }),
      ],
    },
    opciones: ['triángulo con 2 puntos', 'cuadrado con 3 puntos', 'pentágono con 1 punto', 'hexágono con 5 puntos'],
    correcta: 0,
    explicacion: 'Las figuras son todas distintas, así que la forma no es el criterio: hay que mirar los puntos. Tres tienen un número impar (3, 1 y 5) y solo el triángulo tiene un número par.',
    pista: 'Si un atributo no distingue nada, cambia de atributo.',
  },
  {
    id: 'abs-013', tema: 'diferente', dificultad: 2,
    enunciado: '¿Cuál de estas figuras no pertenece al grupo?',
    figuras: {
      opciones: [
        { forma: 'ele', giro: 0 },
        { forma: 'cuadrado', giro: 0 },
        { forma: 'circulo', giro: 0 },
        { forma: 'hexagono', giro: 0 },
      ],
    },
    opciones: ['ele', 'cuadrado', 'círculo', 'hexágono'],
    correcta: 0,
    explicacion: 'Las otras tres son convexas: cualquier línea entre dos de sus puntos se queda dentro. La ele es la única con un ángulo entrante, es decir, cóncava.',
  },

  // ----- Rotación y simetría -----
  {
    id: 'abs-014', tema: 'rotacion', dificultad: 2,
    enunciado: 'La primera figura es el modelo. ¿Cuál de las opciones es un giro del modelo, y no una imagen reflejada?',
    figuras: {
      enunciado: [{ forma: 'ele', giro: 0 }],
      opciones: [
        { forma: 'ele', giro: 90 },
        { forma: 'ele', giro: 0, espejo: true },
        { forma: 'ele', giro: 90, espejo: true },
        { forma: 'ele', giro: 180, espejo: true },
      ],
    },
    opciones: ['ele girada 90°', 'ele reflejada', 'ele reflejada y girada 90°', 'ele reflejada y girada 180°'],
    correcta: 0,
    explicacion: 'Un giro conserva el sentido de la figura; una reflexión lo invierte, como en un espejo. Solo la primera opción se puede obtener girando el modelo sin levantarlo del papel.',
  },
  {
    id: 'abs-015', tema: 'rotacion', dificultad: 1,
    enunciado: '¿Cuál de estas figuras se ve exactamente igual después de girarla 90°?',
    figuras: {
      opciones: [sinRelleno('cuadrado'), sinRelleno('triangulo'), sinRelleno('pentagono'), { forma: 'ele' }],
    },
    opciones: ['cuadrado', 'triángulo', 'pentágono', 'ele'],
    correcta: 0,
    explicacion: 'El cuadrado tiene simetría de rotación de 90°. El triángulo necesita 120°, el pentágono 72° y la ele una vuelta completa.',
  },
  {
    id: 'abs-016', tema: 'rotacion', dificultad: 2,
    enunciado: 'Un triángulo equilátero con un vértice hacia arriba se gira 180°. ¿Cómo queda?',
    opciones: [
      'Con el vértice hacia abajo',
      'Igual que al principio',
      'Con el vértice hacia la derecha',
      'Reflejado, pero con el vértice arriba',
    ],
    correcta: 0,
    explicacion: 'Media vuelta lleva el vértice superior a la posición opuesta. El triángulo equilátero solo vuelve a verse igual con giros de 120°.',
  },

  // ----- Plegado, cubos y vistas -----
  {
    id: 'abs-017', tema: 'plegado', dificultad: 2,
    enunciado: 'Con este desarrollo se arma un cubo. ¿Qué cara queda opuesta a la C?',
    codigo: [
      '    +---+',
      '    | A |',
      '+---+---+---+---+',
      '| B | C | D | E |',
      '+---+---+---+---+',
      '    | F |',
      '    +---+',
    ].join('\n'),
    opciones: ['E', 'A', 'F', 'D'],
    correcta: 0,
    explicacion: 'En una tira de cuatro caras, las opuestas son la primera con la tercera y la segunda con la cuarta: B con D y C con E. A y F quedan opuestas entre sí.',
    pista: 'En una fila de cuatro, cada cara es opuesta a la que está dos lugares más allá.',
  },
  {
    id: 'abs-018', tema: 'plegado', dificultad: 2,
    enunciado: 'Con el mismo desarrollo, ¿qué cara queda opuesta a la A?',
    codigo: [
      '    +---+',
      '    | A |',
      '+---+---+---+---+',
      '| B | C | D | E |',
      '+---+---+---+---+',
      '    | F |',
      '    +---+',
    ].join('\n'),
    opciones: ['F', 'C', 'B', 'E'],
    correcta: 0,
    explicacion: 'A y F cuelgan de la misma cara C, una arriba y otra abajo: al plegar quedan una frente a la otra.',
  },
  {
    id: 'abs-019', tema: 'plegado', dificultad: 2,
    enunciado: 'Una hoja cuadrada se dobla por la mitad, se vuelve a doblar por la mitad y se hace una sola perforación que atraviesa todo el grosor. Al desdoblarla, ¿cuántos agujeros hay?',
    opciones: ['4', '2', '3', '8'],
    correcta: 0,
    explicacion: 'Cada doblez duplica el número de capas: 1 doblez da 2 capas y 2 dobleces dan 4. La perforación atraviesa las 4 capas y deja 4 agujeros.',
  },
  {
    id: 'abs-020', tema: 'plegado', dificultad: 3,
    enunciado: 'Un cubo de 3 × 3 × 3 se pinta por fuera y luego se corta en 27 cubitos iguales. ¿Cuántos cubitos tienen exactamente dos caras pintadas?',
    opciones: ['12', '8', '6', '9'],
    correcta: 0,
    explicacion: 'Los de dos caras pintadas son los de las aristas sin contar los vértices: un cubo tiene 12 aristas y en cada una queda 1 cubito central, o sea 12. Los de tres caras son los 8 vértices, los de una cara son los 6 centros y el del medio no tiene pintura.',
  },

  // ----- Series numéricas -----
  {
    id: 'abs-021', tema: 'series-numericas', dificultad: 1,
    enunciado: '¿Qué número sigue? 1, 4, 9, 16, 25, …',
    opciones: ['36', '30', '35', '49'],
    correcta: 0,
    explicacion: 'Son los cuadrados perfectos: 1², 2², 3², 4², 5² y por lo tanto 6² = 36.',
  },
  {
    id: 'abs-022', tema: 'series-numericas', dificultad: 2,
    enunciado: '¿Qué número sigue? 2, 6, 12, 20, 30, …',
    opciones: ['42', '40', '36', '44'],
    correcta: 0,
    explicacion: 'Las diferencias son 4, 6, 8 y 10, así que la siguiente es 12: 30 + 12 = 42. También es n(n+1): 6 × 7 = 42.',
    pista: 'Escribe las diferencias entre términos consecutivos.',
  },
  {
    id: 'abs-023', tema: 'series-numericas', dificultad: 2,
    enunciado: '¿Qué número sigue? 3, 7, 15, 31, …',
    opciones: ['63', '47', '62', '64'],
    correcta: 0,
    explicacion: 'Cada término es el doble del anterior más 1: 31 × 2 + 1 = 63.',
  },
  {
    id: 'abs-024', tema: 'series-numericas', dificultad: 2,
    enunciado: '¿Qué número sigue? 2, 3, 5, 8, 13, 21, …',
    opciones: ['34', '29', '32', '26'],
    correcta: 0,
    explicacion: 'Cada término es la suma de los dos anteriores: 13 + 21 = 34.',
  },
  {
    id: 'abs-025', tema: 'series-numericas', dificultad: 1,
    enunciado: '¿Qué número sigue? 81, 27, 9, 3, …',
    opciones: ['1', '0', '2', '1/3'],
    correcta: 0,
    explicacion: 'Cada término es el anterior dividido entre 3: 3 ÷ 3 = 1.',
  },
  {
    id: 'abs-026', tema: 'series-numericas', dificultad: 2,
    enunciado: '¿Qué número sigue? 4, 9, 19, 39, …',
    opciones: ['79', '78', '59', '80'],
    correcta: 0,
    explicacion: 'Cada término es el doble del anterior más 1: 39 × 2 + 1 = 79.',
  },
  {
    id: 'abs-027', tema: 'series-numericas', dificultad: 3,
    enunciado: '¿Qué número sigue? 7, 10, 8, 11, 9, 12, …',
    opciones: ['10', '13', '14', '11'],
    correcta: 0,
    explicacion: 'Son dos series entrelazadas: 7, 8, 9 en las posiciones impares y 10, 11, 12 en las pares. Toca la serie impar: 10.',
    pista: 'Cuando una serie sube y baja, separa los términos de posición par y de posición impar.',
  },
  {
    id: 'abs-028', tema: 'series-numericas', dificultad: 2,
    enunciado: '¿Qué número sigue? 2, 5, 10, 17, 26, …',
    opciones: ['37', '35', '36', '38'],
    correcta: 0,
    explicacion: 'Son los cuadrados más uno: 1²+1, 2²+1, 3²+1, 4²+1, 5²+1 y entonces 6²+1 = 37. Las diferencias son 3, 5, 7, 9 y 11.',
  },
  {
    id: 'abs-029', tema: 'series-numericas', dificultad: 3,
    enunciado: '¿Qué número sigue? 1, 2, 6, 24, 120, …',
    opciones: ['720', '600', '240', '360'],
    correcta: 0,
    explicacion: 'Se multiplica por 2, por 3, por 4 y por 5; ahora toca por 6: 120 × 6 = 720. Son los factoriales.',
  },
  {
    id: 'abs-030', tema: 'series-numericas', dificultad: 3,
    enunciado: '¿Qué número sigue? 100, 96, 88, 72, …',
    opciones: ['40', '56', '64', '48'],
    correcta: 0,
    explicacion: 'Se resta 4, luego 8, luego 16: cada resta se duplica. Ahora toca restar 32: 72 − 32 = 40.',
  },

  // ----- Series de letras -----
  {
    id: 'abs-031', tema: 'series-alfanumericas', dificultad: 2,
    enunciado: '¿Qué letra sigue? A, C, F, J, O, … (alfabeto de 26 letras, sin Ñ)',
    opciones: ['U', 'T', 'S', 'V'],
    correcta: 0,
    explicacion: 'Las posiciones son 1, 3, 6, 10, 15: los saltos crecen 2, 3, 4, 5. El siguiente salto es 6, o sea la posición 21, que es la U.',
    pista: 'Escribe el número de cada letra antes de buscar el patrón.',
  },
  {
    id: 'abs-032', tema: 'series-alfanumericas', dificultad: 2,
    enunciado: '¿Qué letra sigue? B, D, G, K, … (alfabeto de 26 letras, sin Ñ)',
    opciones: ['P', 'O', 'N', 'Q'],
    correcta: 0,
    explicacion: 'Posiciones 2, 4, 7, 11 con saltos de 2, 3 y 4. El siguiente salto es 5: posición 16, la letra P.',
  },
  {
    id: 'abs-033', tema: 'series-alfanumericas', dificultad: 1,
    enunciado: '¿Qué letra sigue? Z, X, V, T, … (alfabeto de 26 letras, sin Ñ)',
    opciones: ['R', 'S', 'Q', 'P'],
    correcta: 0,
    explicacion: 'La serie va hacia atrás saltando una letra: 26, 24, 22, 20 y ahora 18, que es la R.',
  },
  {
    id: 'abs-034', tema: 'series-alfanumericas', dificultad: 3,
    enunciado: '¿Qué sigue? A1, C4, E9, G16, …',
    opciones: ['I25', 'I20', 'H25', 'I36'],
    correcta: 0,
    explicacion: 'Las letras avanzan de dos en dos (A, C, E, G, I) y los números son cuadrados perfectos (1, 4, 9, 16, 25).',
  },
  {
    id: 'abs-035', tema: 'series-alfanumericas', dificultad: 2,
    enunciado: '¿Qué sigue? AZ, BY, CX, …',
    opciones: ['DW', 'DX', 'EW', 'CW'],
    correcta: 0,
    explicacion: 'La primera letra avanza (A, B, C, D) y la segunda retrocede desde el final (Z, Y, X, W).',
  },

  // ----- Lógica -----
  {
    id: 'abs-036', tema: 'logica', dificultad: 2,
    enunciado: 'Todos los músicos leen partituras. Algunos estudiantes son músicos. ¿Qué se concluye con certeza?',
    opciones: [
      'Algunos estudiantes leen partituras',
      'Todos los estudiantes leen partituras',
      'Ningún estudiante lee partituras',
      'Todos los que leen partituras son músicos',
    ],
    correcta: 0,
    explicacion: 'Los estudiantes que sí son músicos leen partituras, así que "algunos estudiantes leen partituras" es seguro. De los demás estudiantes no se sabe nada, y la premisa no dice que solo los músicos lean partituras.',
  },
  {
    id: 'abs-037', tema: 'logica', dificultad: 2,
    enunciado: '¿Cuál es la negación correcta de "todos los alumnos aprobaron"?',
    opciones: [
      'Al menos un alumno no aprobó',
      'Ningún alumno aprobó',
      'Todos los alumnos reprobaron',
      'Casi ningún alumno aprobó',
    ],
    correcta: 0,
    explicacion: 'Para que "todos" sea falso basta un solo contraejemplo. Negar "todos" no es afirmar "ninguno".',
  },
  {
    id: 'abs-038', tema: 'logica', dificultad: 2,
    enunciado: 'En un curso de 30 estudiantes, 18 estudian inglés, 15 estudian francés y 7 estudian los dos idiomas. ¿Cuántos no estudian ninguno de los dos?',
    opciones: ['4', '5', '3', '7'],
    correcta: 0,
    explicacion: 'Estudian al menos un idioma 18 + 15 − 7 = 26. Entonces 30 − 26 = 4 no estudian ninguno.',
    pista: 'Los que estudian los dos se estarían contando dos veces.',
  },
  {
    id: 'abs-039', tema: 'logica', dificultad: 2,
    enunciado: 'Ana es más alta que Beto. Carla es más baja que Beto. Diego es más alto que Ana. ¿Quién es el segundo más alto?',
    opciones: ['Ana', 'Beto', 'Diego', 'Carla'],
    correcta: 0,
    explicacion: 'El orden de mayor a menor es Diego, Ana, Beto y Carla. El segundo es Ana.',
  },
  {
    id: 'abs-040', tema: 'logica', dificultad: 3,
    enunciado: 'Si llueve, el partido se suspende. El partido no se suspendió. ¿Qué se concluye?',
    opciones: [
      'No llovió',
      'Llovió',
      'Puede que haya llovido',
      'El partido se jugará otro día',
    ],
    correcta: 0,
    explicacion: 'Si la lluvia obligara a suspender y no se suspendió, entonces no llovió. Negar la consecuencia obliga a negar la causa.',
  },
  {
    id: 'abs-041', tema: 'logica', dificultad: 3,
    enunciado: 'En un cajón hay 8 calcetines negros y 6 azules, todos revueltos y sin luz. ¿Cuántos hay que sacar como mínimo para tener con seguridad un par del mismo color?',
    opciones: ['3', '2', '7', '9'],
    correcta: 0,
    explicacion: 'Con 2 podrían salir uno de cada color. Con 3, como solo hay dos colores, forzosamente hay dos del mismo.',
  },
  {
    id: 'abs-042', tema: 'logica', dificultad: 3,
    enunciado: 'El hermano de la madre de Juan es el único hijo varón de Marta. ¿Qué es Marta de Juan?',
    opciones: ['Su abuela', 'Su tía', 'Su madre', 'Su prima'],
    correcta: 0,
    explicacion: 'El hermano de la madre de Juan es su tío, y es hijo de Marta. Si Marta es la madre del tío, también es la madre de la madre de Juan: su abuela.',
  },

  // ----- Analogías -----
  {
    id: 'abs-043', tema: 'analogias', dificultad: 1,
    enunciado: 'MÉDICO es a HOSPITAL como MAESTRO es a…',
    opciones: ['ESCUELA', 'ALUMNO', 'LIBRO', 'ENSEÑAR'],
    correcta: 0,
    explicacion: 'La relación es "profesional : lugar donde trabaja". El maestro trabaja en la escuela.',
    pista: 'Di la relación en voz alta antes de mirar las opciones.',
  },
  {
    id: 'abs-044', tema: 'analogias', dificultad: 2,
    enunciado: 'HAMBRE es a COMER como SED es a…',
    opciones: ['BEBER', 'AGUA', 'SEQUÍA', 'GARGANTA'],
    correcta: 0,
    explicacion: 'La relación es "necesidad : acción que la satisface". El agua es la sustancia, no la acción.',
  },
  {
    id: 'abs-045', tema: 'analogias', dificultad: 2,
    enunciado: 'TERMÓMETRO es a TEMPERATURA como BALANZA es a…',
    opciones: ['MASA', 'CENTÍMETRO', 'COCINA', 'PESADO'],
    correcta: 0,
    explicacion: 'La relación es "instrumento : magnitud que mide". La balanza mide masa; el centímetro es una unidad, no una magnitud.',
  },
  {
    id: 'abs-046', tema: 'analogias', dificultad: 2,
    enunciado: 'PINTOR es a PINCEL como ESCRITOR es a…',
    opciones: ['PLUMA', 'NOVELA', 'EDITORIAL', 'LECTOR'],
    correcta: 0,
    explicacion: 'La relación es "quien hace : instrumento con el que trabaja". La novela sería el producto, no el instrumento.',
  },
  {
    id: 'abs-047', tema: 'analogias', dificultad: 3,
    enunciado: 'SEQUÍA es a HAMBRUNA como CHISPA es a…',
    opciones: ['INCENDIO', 'FUEGO', 'MADERA', 'CENIZA'],
    correcta: 0,
    explicacion: 'La relación es "causa : consecuencia de gran escala". La sequía provoca hambruna igual que la chispa provoca un incendio; la ceniza viene después del incendio, no de la chispa.',
  },
];
