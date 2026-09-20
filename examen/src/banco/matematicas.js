/**
 * matematicas.js — Banco de matemáticas.
 *
 * Cada pregunta: tema del temario, dificultad (1 básico, 2 intermedio,
 * 3 avanzado), cuatro opciones, la correcta y por qué. La explicación importa
 * tanto como la respuesta: sin ella, practicar es solo adivinar.
 *
 * Las opciones se barajan al presentar la pregunta (motor.js), así que el orden
 * en que están escritas aquí no da ninguna pista.
 */

export const MATEMATICAS = [
  // ----- Números y operaciones -----
  {
    id: 'mat-001', tema: 'aritmetica', dificultad: 1,
    enunciado: '¿Cuál es el resultado de 2 + 3 × (8 − 5)² ÷ 9?',
    opciones: ['5', '11', '3', '15'],
    correcta: 0,
    explicacion: 'Primero el paréntesis: 8 − 5 = 3. Luego la potencia: 3² = 9. Después multiplicación y división de izquierda a derecha: 3 × 9 = 27 y 27 ÷ 9 = 3. Al final la suma: 2 + 3 = 5.',
    pista: 'Paréntesis, potencias, multiplicación y división, y por último suma y resta.',
  },
  {
    id: 'mat-002', tema: 'aritmetica', dificultad: 2,
    enunciado: '¿Cuál es el mínimo común múltiplo de 12, 18 y 30?',
    opciones: ['90', '180', '360', '60'],
    correcta: 1,
    explicacion: '12 = 2²·3, 18 = 2·3², 30 = 2·3·5. El mcm toma cada primo con su mayor exponente: 2²·3²·5 = 4·9·5 = 180.',
  },
  {
    id: 'mat-003', tema: 'aritmetica', dificultad: 2,
    enunciado: 'Si a = −3 y b = 4, ¿cuánto vale a² − |a − b| + 2b?',
    opciones: ['10', '16', '9', '2'],
    correcta: 0,
    explicacion: 'a² = 9. a − b = −3 − 4 = −7, y |−7| = 7. 2b = 8. Entonces 9 − 7 + 8 = 10.',
  },
  {
    id: 'mat-004', tema: 'aritmetica', dificultad: 2,
    enunciado: '¿Cuál de estos números es divisible entre 3 y entre 4 a la vez?',
    opciones: ['132', '122', '138', '116'],
    correcta: 0,
    explicacion: 'Un número es divisible entre 3 si la suma de sus cifras lo es, y entre 4 si sus dos últimas cifras forman un múltiplo de 4. En 132: 1 + 3 + 2 = 6 (divisible entre 3) y 32 es múltiplo de 4. En 138 falla el 4, en 116 falla el 3 y en 122 fallan los dos.',
    pista: 'Aplica las dos reglas por separado y descarta.',
  },

  // ----- Fracciones, decimales y notación científica -----
  {
    id: 'mat-005', tema: 'fracciones', dificultad: 1,
    enunciado: 'Calcula 3/4 + 2/5 − 1/2.',
    opciones: ['13/20', '4/7', '23/20', '11/20'],
    correcta: 0,
    explicacion: 'Con denominador común 20: 15/20 + 8/20 − 10/20 = 13/20.',
  },
  {
    id: 'mat-006', tema: 'fracciones', dificultad: 2,
    enunciado: 'Un tanque está lleno hasta 3/5 de su capacidad. Si se consumen 2/3 del agua que contiene, ¿qué fracción del tanque queda con agua?',
    opciones: ['1/5', '2/5', '4/15', '1/3'],
    correcta: 0,
    explicacion: 'Queda 1/3 de lo que había: (1/3)·(3/5) = 3/15 = 1/5 del tanque.',
    pista: '"De" significa multiplicar.',
  },
  {
    id: 'mat-007', tema: 'fracciones', dificultad: 2,
    enunciado: '¿Cuál es el resultado de (3,2 × 10⁵)(2 × 10⁻³)?',
    opciones: ['6,4 × 10²', '6,4 × 10⁸', '6,4 × 10⁻¹⁵', '3,2 × 10²'],
    correcta: 0,
    explicacion: 'Se multiplican los números (3,2 × 2 = 6,4) y se suman los exponentes (5 + (−3) = 2): 6,4 × 10².',
  },
  {
    id: 'mat-008', tema: 'fracciones', dificultad: 2,
    enunciado: 'Ordena de menor a mayor: 0,7 ; 2/3 ; 5/8.',
    opciones: ['5/8 ; 2/3 ; 0,7', '2/3 ; 5/8 ; 0,7', '0,7 ; 2/3 ; 5/8', '5/8 ; 0,7 ; 2/3'],
    correcta: 0,
    explicacion: 'En decimales: 5/8 = 0,625; 2/3 ≈ 0,667; y 0,7. Por lo tanto 5/8 < 2/3 < 0,7.',
  },

  // ----- Razones, proporciones y regla de tres -----
  {
    id: 'mat-009', tema: 'razones', dificultad: 1,
    enunciado: 'Dos números están en razón 3 : 5 y su suma es 64. ¿Cuál es el mayor?',
    opciones: ['40', '24', '35', '45'],
    correcta: 0,
    explicacion: 'Si son 3k y 5k, entonces 8k = 64 y k = 8. El mayor es 5k = 40.',
  },
  {
    id: 'mat-010', tema: 'razones', dificultad: 2,
    enunciado: 'Seis obreros terminan una obra en 12 días. Trabajando al mismo ritmo, ¿en cuántos días la terminarían 9 obreros?',
    opciones: ['8', '18', '9', '6'],
    correcta: 0,
    explicacion: 'Es proporción inversa: a más obreros, menos días. El total de trabajo es 6 × 12 = 72 obreros-día; entre 9 obreros son 72 ÷ 9 = 8 días.',
    pista: 'Si una cantidad sube y la otra baja, multiplica en lugar de dividir.',
  },
  {
    id: 'mat-011', tema: 'razones', dificultad: 2,
    enunciado: 'En un mapa a escala 1 : 50 000, dos ciudades están separadas 4 cm. ¿Cuál es la distancia real?',
    opciones: ['2 km', '20 km', '200 m', '5 km'],
    correcta: 0,
    explicacion: '4 cm × 50 000 = 200 000 cm. Como 100 000 cm = 1 km, son 2 km.',
  },
  {
    id: 'mat-012', tema: 'razones', dificultad: 3,
    enunciado: 'Se reparten $4 500 entre tres personas en partes proporcionales a 2, 3 y 4. ¿Cuánto recibe la segunda?',
    opciones: ['$1 500', '$1 000', '$2 000', '$1 200'],
    correcta: 0,
    explicacion: 'Las partes suman 2 + 3 + 4 = 9, así que cada parte vale 4 500 ÷ 9 = 500. La segunda recibe 3 × 500 = $1 500.',
  },

  // ----- Porcentajes -----
  {
    id: 'mat-013', tema: 'porcentajes', dificultad: 1,
    enunciado: '¿Cuánto es el 15 % de 240?',
    opciones: ['36', '24', '360', '16'],
    correcta: 0,
    explicacion: '240 × 0,15 = 36. Atajo: el 10 % es 24 y el 5 % es 12; 24 + 12 = 36.',
  },
  {
    id: 'mat-014', tema: 'porcentajes', dificultad: 2,
    enunciado: 'Un artículo cuesta $80. Primero sube 25 % y después baja 20 %. ¿Cuál es el precio final?',
    opciones: ['$80', '$84', '$76', '$85'],
    correcta: 0,
    explicacion: '80 × 1,25 = 100 y 100 × 0,80 = 80. Los porcentajes sucesivos se multiplican, no se suman: por eso subir 25 % y bajar 20 % deja el precio igual.',
    pista: 'Aplica el segundo porcentaje al precio nuevo, no al original.',
  },
  {
    id: 'mat-015', tema: 'porcentajes', dificultad: 2,
    enunciado: 'Con un descuento del 18 %, una chaqueta cuesta $246. ¿Cuál era su precio sin descuento?',
    opciones: ['$300', '$290', '$320', '$264'],
    correcta: 0,
    explicacion: 'El precio con descuento es el 82 % del original: 0,82·x = 246, entonces x = 246 ÷ 0,82 = 300.',
  },
  {
    id: 'mat-016', tema: 'porcentajes', dificultad: 3,
    enunciado: 'Se depositan $2 000 al 10 % anual de interés compuesto. ¿Cuánto hay al cabo de 2 años?',
    opciones: ['$2 420', '$2 400', '$2 200', '$2 442'],
    correcta: 0,
    explicacion: '2 000 × 1,10² = 2 000 × 1,21 = 2 420. Con interés simple serían 2 400: la diferencia de $20 es el interés que generaron los intereses del primer año.',
  },

  // ----- Potencias y radicales -----
  {
    id: 'mat-017', tema: 'potencias', dificultad: 1,
    enunciado: 'Simplifica (2³)² · 2⁻⁴.',
    opciones: ['4', '16', '2', '64'],
    correcta: 0,
    explicacion: '(2³)² = 2⁶. Luego 2⁶ · 2⁻⁴ = 2⁶⁻⁴ = 2² = 4.',
  },
  {
    id: 'mat-018', tema: 'potencias', dificultad: 2,
    enunciado: '¿Cuál es la forma simplificada de √72, es decir, con el menor radical posible?',
    opciones: ['6√2', '2√18', '8√2', '36√2'],
    correcta: 0,
    explicacion: '72 = 36 × 2, y √36 = 6, así que √72 = 6√2. La opción 2√18 es igual en valor pero no está simplificada.',
  },
  {
    id: 'mat-019', tema: 'potencias', dificultad: 2,
    enunciado: 'Simplifica (a³b⁻²)² · (a⁻¹b³).',
    opciones: ['a⁵/b', 'a⁵b', 'a⁷b⁻⁷', 'a⁵b⁷'],
    correcta: 0,
    explicacion: '(a³b⁻²)² = a⁶b⁻⁴. Al multiplicar por a⁻¹b³ se suman exponentes: a⁶⁻¹ b⁻⁴⁺³ = a⁵b⁻¹ = a⁵/b.',
  },
  {
    id: 'mat-020', tema: 'potencias', dificultad: 2,
    enunciado: 'Racionaliza el denominador de 6/√3.',
    opciones: ['2√3', '6√3', '√3/2', '3√2'],
    correcta: 0,
    explicacion: 'Se multiplica arriba y abajo por √3: (6√3)/3 = 2√3.',
  },
  {
    id: 'mat-021', tema: 'potencias', dificultad: 3,
    enunciado: '¿Cuál es el valor de 8^(2/3) + 16^(−1/2)?',
    opciones: ['4,25', '4,5', '5', '8,25'],
    correcta: 0,
    explicacion: '8^(2/3) = (∛8)² = 2² = 4. 16^(−1/2) = 1/√16 = 1/4 = 0,25. La suma es 4,25.',
  },

  // ----- Logaritmos -----
  {
    id: 'mat-022', tema: 'logaritmos', dificultad: 1,
    enunciado: '¿Cuánto vale log₂ 32?',
    opciones: ['5', '4', '6', '16'],
    correcta: 0,
    explicacion: 'Se busca el exponente al que hay que elevar 2 para obtener 32. Como 2⁵ = 32, el logaritmo vale 5.',
  },
  {
    id: 'mat-023', tema: 'logaritmos', dificultad: 2,
    enunciado: 'Si log x = 2 log 3 + log 4, ¿cuánto vale x?',
    opciones: ['36', '24', '12', '10'],
    correcta: 0,
    explicacion: '2 log 3 = log 9, y log 9 + log 4 = log 36. Como los logaritmos son iguales, x = 36.',
  },
  {
    id: 'mat-024', tema: 'logaritmos', dificultad: 2,
    enunciado: 'Resuelve 3^(2x−1) = 81.',
    opciones: ['x = 2,5', 'x = 2', 'x = 3', 'x = 4,5'],
    correcta: 0,
    explicacion: '81 = 3⁴, así que 2x − 1 = 4, de donde 2x = 5 y x = 2,5.',
    pista: 'Escribe los dos lados con la misma base.',
  },
  {
    id: 'mat-025', tema: 'logaritmos', dificultad: 3,
    enunciado: 'Si log₅ (x − 1) = 2, ¿cuánto vale x?',
    opciones: ['26', '11', '25', '6'],
    correcta: 0,
    explicacion: 'La definición da x − 1 = 5² = 25, así que x = 26.',
  },

  // ----- Álgebra -----
  {
    id: 'mat-026', tema: 'algebra', dificultad: 1,
    enunciado: 'Desarrolla (2x − 3)².',
    opciones: ['4x² − 12x + 9', '4x² + 9', '4x² − 6x + 9', '2x² − 12x + 9'],
    correcta: 0,
    explicacion: 'Cuadrado de una diferencia: (a − b)² = a² − 2ab + b², con a = 2x y b = 3, da 4x² − 12x + 9.',
  },
  {
    id: 'mat-027', tema: 'algebra', dificultad: 2,
    enunciado: 'Factoriza x² − 5x + 6.',
    opciones: ['(x − 2)(x − 3)', '(x + 2)(x + 3)', '(x − 6)(x + 1)', '(x − 1)(x − 6)'],
    correcta: 0,
    explicacion: 'Se buscan dos números que multiplicados den 6 y sumados den −5: son −2 y −3.',
  },
  {
    id: 'mat-028', tema: 'algebra', dificultad: 2,
    enunciado: 'Simplifica (x² − 9)/(x² + x − 12), con x ≠ 3 y x ≠ −4.',
    opciones: ['(x + 3)/(x + 4)', '(x − 3)/(x − 4)', '9/12', '(x + 3)/(x − 4)'],
    correcta: 0,
    explicacion: 'x² − 9 = (x − 3)(x + 3) y x² + x − 12 = (x + 4)(x − 3). Se cancela (x − 3) y queda (x + 3)/(x + 4).',
  },
  {
    id: 'mat-029', tema: 'algebra', dificultad: 3,
    enunciado: 'Si x + 1/x = 5, ¿cuánto vale x² + 1/x²?',
    opciones: ['23', '25', '27', '24'],
    correcta: 0,
    explicacion: 'Al elevar al cuadrado: (x + 1/x)² = x² + 2 + 1/x² = 25. Restando 2 queda x² + 1/x² = 23.',
  },

  // ----- Ecuaciones y sistemas -----
  {
    id: 'mat-030', tema: 'ecuaciones', dificultad: 1,
    enunciado: 'Resuelve 3(x − 2) = 2x + 5.',
    opciones: ['x = 11', 'x = 1', 'x = −11', 'x = 3'],
    correcta: 0,
    explicacion: '3x − 6 = 2x + 5. Restando 2x: x − 6 = 5, y por lo tanto x = 11.',
  },
  {
    id: 'mat-031', tema: 'ecuaciones', dificultad: 2,
    enunciado: 'Resuelve el sistema: 2x + 3y = 12 ; x − y = 1.',
    opciones: ['x = 3, y = 2', 'x = 2, y = 3', 'x = 4, y = 3', 'x = 1, y = 0'],
    correcta: 0,
    explicacion: 'De la segunda, x = y + 1. Sustituyendo: 2(y + 1) + 3y = 12, es decir 5y = 10, y = 2 y x = 3.',
  },
  {
    id: 'mat-032', tema: 'ecuaciones', dificultad: 2,
    enunciado: 'La suma de dos números es 45 y su diferencia es 11. ¿Cuál es el menor?',
    opciones: ['17', '28', '16', '22'],
    correcta: 0,
    explicacion: 'x + y = 45 y x − y = 11. Sumando las ecuaciones: 2x = 56, x = 28; entonces y = 17.',
  },
  {
    id: 'mat-033', tema: 'ecuaciones', dificultad: 3,
    enunciado: 'Resuelve (x + 2)/3 − (x − 1)/4 = 2.',
    opciones: ['x = 13', 'x = 7', 'x = 11', 'x = 5'],
    correcta: 0,
    explicacion: 'Multiplicando todo por 12: 4(x + 2) − 3(x − 1) = 24, o sea 4x + 8 − 3x + 3 = 24, es decir x + 11 = 24 y x = 13.',
  },

  // ----- Cuadráticas -----
  {
    id: 'mat-034', tema: 'cuadraticas', dificultad: 1,
    enunciado: '¿Cuáles son las soluciones de x² − 7x + 10 = 0?',
    opciones: ['2 y 5', '−2 y −5', '1 y 10', '3 y 4'],
    correcta: 0,
    explicacion: 'Factorizando: (x − 2)(x − 5) = 0, así que x = 2 o x = 5.',
  },
  {
    id: 'mat-035', tema: 'cuadraticas', dificultad: 2,
    enunciado: '¿Para qué valores de k la ecuación x² + kx + 9 = 0 tiene una única raíz real (doble)?',
    opciones: ['k = 6 o k = −6', 'k = 9', 'k = 3 o k = −3', 'k = 0'],
    correcta: 0,
    explicacion: 'Hay raíz doble cuando el discriminante es cero: k² − 4·1·9 = 0, entonces k² = 36 y k = ±6.',
  },
  {
    id: 'mat-036', tema: 'cuadraticas', dificultad: 3,
    enunciado: 'Si r y s son las raíces de 2x² − 8x + 6 = 0, ¿cuánto vale r² + s²?',
    opciones: ['10', '16', '13', '22'],
    correcta: 0,
    explicacion: 'r + s = 8/2 = 4 y r·s = 6/2 = 3. Como r² + s² = (r + s)² − 2rs, queda 16 − 6 = 10.',
    pista: 'No hace falta hallar las raíces: usa suma y producto.',
  },
  {
    id: 'mat-037', tema: 'cuadraticas', dificultad: 2,
    enunciado: 'El área de un rectángulo es 96 m² y su largo mide 4 m más que su ancho. ¿Cuánto mide el ancho?',
    opciones: ['8 m', '12 m', '6 m', '10 m'],
    correcta: 0,
    explicacion: 'x(x + 4) = 96, es decir x² + 4x − 96 = 0, que factoriza como (x + 12)(x − 8) = 0. La solución con sentido físico es x = 8 m.',
  },

  // ----- Desigualdades -----
  {
    id: 'mat-038', tema: 'desigualdades', dificultad: 1,
    enunciado: 'Resuelve 3 − 2x ≤ 9.',
    opciones: ['x ≥ −3', 'x ≤ −3', 'x ≥ 3', 'x ≤ 6'],
    correcta: 0,
    explicacion: 'Restando 3: −2x ≤ 6. Al dividir entre −2 se invierte el sentido: x ≥ −3.',
    pista: 'Dividir entre un número negativo voltea la desigualdad.',
  },
  {
    id: 'mat-039', tema: 'desigualdades', dificultad: 2,
    enunciado: '¿Cuál es el conjunto solución de |2x − 5| < 3?',
    opciones: ['(1, 4)', '(−1, 4)', '(−∞, 1) ∪ (4, ∞)', '[1, 4]'],
    correcta: 0,
    explicacion: '|A| < 3 equivale a −3 < 2x − 5 < 3. Sumando 5: 2 < 2x < 8, y dividiendo entre 2: 1 < x < 4.',
  },
  {
    id: 'mat-040', tema: 'desigualdades', dificultad: 3,
    enunciado: '¿Para qué valores de x se cumple (x − 2)(x + 3) > 0?',
    opciones: ['x < −3 o x > 2', '−3 < x < 2', 'x > 2 solamente', 'x < 2'],
    correcta: 0,
    explicacion: 'El producto es positivo cuando los dos factores tienen el mismo signo: ambos negativos si x < −3, ambos positivos si x > 2.',
  },

  // ----- Funciones -----
  {
    id: 'mat-041', tema: 'funciones', dificultad: 1,
    enunciado: 'Si f(x) = 2x² − 3x + 1, ¿cuánto vale f(−2)?',
    opciones: ['15', '3', '−1', '11'],
    correcta: 0,
    explicacion: 'f(−2) = 2(4) − 3(−2) + 1 = 8 + 6 + 1 = 15. El error típico es olvidar que (−2)² es positivo.',
  },
  {
    id: 'mat-042', tema: 'funciones', dificultad: 2,
    enunciado: '¿Cuál es el dominio de f(x) = √(x − 3)/(x − 5)?',
    opciones: ['x ≥ 3 y x ≠ 5', 'x > 3', 'x ≠ 5', 'x ≥ 3'],
    correcta: 0,
    explicacion: 'La raíz exige x − 3 ≥ 0, o sea x ≥ 3; el denominador exige x ≠ 5. Se cumplen las dos condiciones a la vez.',
  },
  {
    id: 'mat-043', tema: 'funciones', dificultad: 2,
    enunciado: 'Si f(x) = 3x − 2 y g(x) = x² + 1, ¿cuánto vale (f ∘ g)(2)?',
    opciones: ['13', '17', '10', '5'],
    correcta: 0,
    explicacion: 'Primero g(2) = 4 + 1 = 5, después f(5) = 15 − 2 = 13. En f ∘ g se aplica primero g.',
  },
  {
    id: 'mat-044', tema: 'funciones', dificultad: 3,
    enunciado: 'La parábola y = x² − 6x + 5 tiene su vértice en:',
    opciones: ['(3, −4)', '(−3, 32)', '(3, 4)', '(6, 5)'],
    correcta: 0,
    explicacion: 'La abscisa del vértice es x = −b/(2a) = 6/2 = 3. Sustituyendo: y = 9 − 18 + 5 = −4.',
  },

  // ----- Sucesiones -----
  {
    id: 'mat-045', tema: 'sucesiones', dificultad: 1,
    enunciado: 'En la progresión aritmética 5, 9, 13, 17, … ¿cuál es el término número 20?',
    opciones: ['81', '85', '77', '80'],
    correcta: 0,
    explicacion: 'aₙ = a₁ + (n − 1)d = 5 + 19 × 4 = 5 + 76 = 81.',
  },
  {
    id: 'mat-046', tema: 'sucesiones', dificultad: 2,
    enunciado: '¿Cuál es la suma de los 8 primeros términos de la progresión geométrica 3, 6, 12, 24, …?',
    opciones: ['765', '384', '768', '381'],
    correcta: 0,
    explicacion: 'Sₙ = a₁(rⁿ − 1)/(r − 1) = 3(2⁸ − 1)/(2 − 1) = 3 × 255 = 765.',
  },
  {
    id: 'mat-047', tema: 'sucesiones', dificultad: 2,
    enunciado: 'La suma de los primeros 50 números naturales (1 + 2 + … + 50) es:',
    opciones: ['1 275', '2 550', '1 250', '1 225'],
    correcta: 0,
    explicacion: 'n(n + 1)/2 = 50 × 51 / 2 = 1 275.',
  },

  // ----- Geometría plana -----
  {
    id: 'mat-048', tema: 'geometria-plana', dificultad: 1,
    enunciado: 'Un triángulo tiene base 12 cm y altura 7 cm. ¿Cuál es su área?',
    opciones: ['42 cm²', '84 cm²', '19 cm²', '21 cm²'],
    correcta: 0,
    explicacion: 'Área = base × altura / 2 = 12 × 7 / 2 = 42 cm².',
  },
  {
    id: 'mat-049', tema: 'geometria-plana', dificultad: 1,
    enunciado: 'En un triángulo rectángulo, un cateto mide 9 cm y la hipotenusa 15 cm. ¿Cuánto mide el otro cateto?',
    opciones: ['12 cm', '6 cm', '√306 cm', '18 cm'],
    correcta: 0,
    explicacion: 'Por Pitágoras: c² = 15² − 9² = 225 − 81 = 144, así que c = 12 cm.',
  },
  {
    id: 'mat-050', tema: 'geometria-plana', dificultad: 2,
    enunciado: 'Los ángulos de un triángulo están en razón 2 : 3 : 4. ¿Cuánto mide el mayor?',
    opciones: ['80°', '90°', '75°', '100°'],
    correcta: 0,
    explicacion: '2k + 3k + 4k = 180°, es decir 9k = 180° y k = 20°. El mayor es 4k = 80°.',
  },
  {
    id: 'mat-051', tema: 'geometria-plana', dificultad: 2,
    enunciado: 'Un círculo tiene radio 6 cm. ¿Cuál es el área de un sector de 60°?',
    opciones: ['6π cm²', '12π cm²', '36π cm²', '3π cm²'],
    correcta: 0,
    explicacion: 'El área total es 36π cm². Un sector de 60° es 60/360 = 1/6 del círculo: 36π/6 = 6π cm².',
  },
  {
    id: 'mat-052', tema: 'geometria-plana', dificultad: 3,
    enunciado: 'Si a cada lado de un cuadrado se le aumenta un 20 %, ¿en qué porcentaje aumenta su área?',
    opciones: ['44 %', '40 %', '20 %', '24 %'],
    correcta: 0,
    explicacion: 'El área se multiplica por 1,2² = 1,44, es decir crece un 44 %. El área no crece en la misma proporción que el lado.',
  },

  // ----- Cuerpos -----
  {
    id: 'mat-053', tema: 'geometria-espacio', dificultad: 1,
    enunciado: 'Un cilindro tiene radio 3 cm y altura 10 cm. ¿Cuál es su volumen?',
    opciones: ['90π cm³', '30π cm³', '60π cm³', '180π cm³'],
    correcta: 0,
    explicacion: 'V = πr²h = π × 9 × 10 = 90π cm³ (unos 282,7 cm³).',
  },
  {
    id: 'mat-054', tema: 'geometria-espacio', dificultad: 2,
    enunciado: '¿Cuál es el volumen de una esfera de radio 3 cm?',
    opciones: ['36π cm³', '27π cm³', '12π cm³', '108π cm³'],
    correcta: 0,
    explicacion: 'V = (4/3)πr³ = (4/3)π × 27 = 36π cm³.',
  },
  {
    id: 'mat-055', tema: 'geometria-espacio', dificultad: 3,
    enunciado: 'Si el radio de una esfera se duplica, su volumen se multiplica por:',
    opciones: ['8', '2', '4', '6'],
    correcta: 0,
    explicacion: 'El volumen depende del cubo del radio, así que al duplicar el radio el volumen se multiplica por 2³ = 8.',
  },

  // ----- Geometría analítica -----
  {
    id: 'mat-056', tema: 'geometria-analitica', dificultad: 1,
    enunciado: '¿Cuál es la pendiente de la recta que pasa por (2, −1) y (6, 7)?',
    opciones: ['2', '1/2', '−2', '4'],
    correcta: 0,
    explicacion: 'm = (y₂ − y₁)/(x₂ − x₁) = (7 − (−1))/(6 − 2) = 8/4 = 2.',
  },
  {
    id: 'mat-057', tema: 'geometria-analitica', dificultad: 2,
    enunciado: '¿Cuál es la distancia entre los puntos (−1, 2) y (3, 5)?',
    opciones: ['5', '7', '√7', '25'],
    correcta: 0,
    explicacion: 'd = √((3 + 1)² + (5 − 2)²) = √(16 + 9) = √25 = 5.',
  },
  {
    id: 'mat-058', tema: 'geometria-analitica', dificultad: 3,
    enunciado: '¿Cuál es la ecuación de la recta perpendicular a y = −(2/3)x + 4 que pasa por el punto (2, 1)?',
    opciones: ['y = (3/2)x − 2', 'y = −(3/2)x + 4', 'y = (2/3)x − 1/3', 'y = (3/2)x + 2'],
    correcta: 0,
    explicacion: 'La pendiente perpendicular es el recíproco con signo cambiado: 3/2. Con el punto (2, 1): 1 = (3/2)(2) + b, de donde b = −2.',
  },
  {
    id: 'mat-059', tema: 'geometria-analitica', dificultad: 2,
    enunciado: 'La circunferencia (x − 3)² + (y + 2)² = 16 tiene centro y radio:',
    opciones: ['Centro (3, −2), radio 4', 'Centro (−3, 2), radio 4', 'Centro (3, −2), radio 16', 'Centro (−3, 2), radio 16'],
    correcta: 0,
    explicacion: 'En (x − h)² + (y − k)² = r², el centro es (h, k) = (3, −2) y el radio es √16 = 4.',
  },

  // ----- Estadística -----
  {
    id: 'mat-060', tema: 'estadistica', dificultad: 1,
    enunciado: 'Para los datos 4, 7, 9, 10, 10, ¿cuáles son la media y la mediana?',
    opciones: ['Media 8, mediana 9', 'Media 9, mediana 8', 'Media 8, mediana 10', 'Media 10, mediana 9'],
    correcta: 0,
    explicacion: 'La media es (4 + 7 + 9 + 10 + 10)/5 = 40/5 = 8. Con cinco datos ordenados, la mediana es el tercero: 9.',
  },
  {
    id: 'mat-061', tema: 'estadistica', dificultad: 2,
    enunciado: 'La media de cinco números es 12. Si se quita uno, la media de los cuatro restantes es 13. ¿Qué número se quitó?',
    opciones: ['8', '10', '12', '7'],
    correcta: 0,
    explicacion: 'La suma inicial es 5 × 12 = 60 y la final 4 × 13 = 52. El número retirado es 60 − 52 = 8.',
  },
  {
    id: 'mat-062', tema: 'estadistica', dificultad: 2,
    enunciado: 'Un estudiante tiene 70 en un examen que vale 40 % y 85 en otro que vale 60 %. ¿Cuál es su nota final?',
    opciones: ['79', '77,5', '80', '78'],
    correcta: 0,
    explicacion: 'Media ponderada: 70 × 0,4 + 85 × 0,6 = 28 + 51 = 79.',
  },

  // ----- Probabilidad -----
  {
    id: 'mat-063', tema: 'probabilidad', dificultad: 1,
    enunciado: 'Se lanzan dos dados. ¿Cuál es la probabilidad de que la suma sea 7?',
    opciones: ['1/6', '1/12', '7/36', '1/9'],
    correcta: 0,
    explicacion: 'Hay 36 resultados posibles y 6 dan suma 7: (1,6), (2,5), (3,4), (4,3), (5,2) y (6,1). Entonces 6/36 = 1/6.',
  },
  {
    id: 'mat-064', tema: 'probabilidad', dificultad: 2,
    enunciado: 'Una urna tiene 4 bolas rojas y 6 azules. Se sacan dos sin reponer. ¿Cuál es la probabilidad de que ambas sean rojas?',
    opciones: ['2/15', '4/25', '1/5', '3/20'],
    correcta: 0,
    explicacion: '(4/10) × (3/9) = 12/90 = 2/15. Al no reponer, la segunda probabilidad cambia.',
  },
  {
    id: 'mat-065', tema: 'probabilidad', dificultad: 2,
    enunciado: '¿De cuántas maneras se puede formar un comité de 3 personas a partir de un grupo de 8?',
    opciones: ['56', '336', '24', '112'],
    correcta: 0,
    explicacion: 'El orden no importa, así que es una combinación: C(8,3) = 8·7·6/(3·2·1) = 56.',
    pista: 'Si el orden importara, serían 336 (permutaciones).',
  },
  {
    id: 'mat-066', tema: 'probabilidad', dificultad: 3,
    enunciado: 'La probabilidad de que un estudiante apruebe matemáticas es 0,8 y la de que apruebe inglés es 0,7, de forma independiente. ¿Cuál es la probabilidad de que apruebe al menos una?',
    opciones: ['0,94', '0,56', '0,75', '0,50'],
    correcta: 0,
    explicacion: 'Es más fácil por el complemento: que falle las dos es 0,2 × 0,3 = 0,06. Entonces al menos una es 1 − 0,06 = 0,94.',
  },

  // ----- Problemas de aplicación -----
  {
    id: 'mat-067', tema: 'problemas', dificultad: 2,
    enunciado: '¿Cuántos litros de solución al 60 % hay que añadir a 20 L de solución al 30 % para obtener una mezcla al 40 %?',
    opciones: ['10 L', '20 L', '15 L', '5 L'],
    correcta: 0,
    explicacion: '(0,30 × 20 + 0,60x)/(20 + x) = 0,40. Entonces 6 + 0,6x = 8 + 0,4x, es decir 0,2x = 2 y x = 10 L.',
  },
  {
    id: 'mat-068', tema: 'problemas', dificultad: 2,
    enunciado: 'Dos autos salen al mismo tiempo de ciudades separadas 300 km y viajan uno hacia el otro a 60 km/h y 90 km/h. ¿En cuánto tiempo se encuentran?',
    opciones: ['2 h', '2,5 h', '3 h', '1,5 h'],
    correcta: 0,
    explicacion: 'Se acercan a 60 + 90 = 150 km/h. El tiempo es 300 ÷ 150 = 2 h.',
  },
  {
    id: 'mat-069', tema: 'problemas', dificultad: 2,
    enunciado: 'Ana pinta una pared en 6 horas y Beto en 3 horas. Trabajando juntos, ¿cuánto tardan?',
    opciones: ['2 h', '4,5 h', '3 h', '1,5 h'],
    correcta: 0,
    explicacion: 'En una hora hacen 1/6 + 1/3 = 1/2 de la pared, así que la terminan en 2 horas.',
    pista: 'Suma trabajos por hora, no tiempos.',
  },
  {
    id: 'mat-070', tema: 'problemas', dificultad: 2,
    enunciado: 'Ana tiene el doble de la edad de Beto. Dentro de 6 años, la suma de sus edades será 42. ¿Cuántos años tiene Ana?',
    opciones: ['20', '18', '24', '22'],
    correcta: 0,
    explicacion: 'Si Beto tiene b, Ana tiene 2b. Dentro de 6 años: (2b + 6) + (b + 6) = 42, es decir 3b = 30 y b = 10. Ana tiene 20.',
  },
];
