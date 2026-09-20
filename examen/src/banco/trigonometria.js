/**
 * trigonometria.js — Banco de trigonometría.
 *
 * Del triángulo rectángulo a las identidades y las leyes de senos y cosenos.
 * Las opciones se barajan al presentarlas (motor.js).
 */

export const TRIGONOMETRIA = [
  // ----- Ángulos, grados y radianes -----
  {
    id: 'tri-001', tema: 'angulos', dificultad: 1,
    enunciado: '¿A cuántos radianes equivalen 135°?',
    opciones: ['3π/4', '2π/3', '5π/6', '4π/3'],
    correcta: 0,
    explicacion: 'Se multiplica por π/180: 135 × π/180 = 135π/180 = 3π/4.',
  },
  {
    id: 'tri-002', tema: 'angulos', dificultad: 1,
    enunciado: '¿A cuántos grados equivalen 5π/6 radianes?',
    opciones: ['150°', '120°', '210°', '135°'],
    correcta: 0,
    explicacion: 'Se multiplica por 180/π: (5π/6)(180/π) = 5 × 30 = 150°.',
  },
  {
    id: 'tri-003', tema: 'angulos', dificultad: 2,
    enunciado: '¿Cuál es el menor ángulo positivo coterminal con −100°?',
    opciones: ['260°', '280°', '100°', '160°'],
    correcta: 0,
    explicacion: 'Se suma una vuelta completa: −100° + 360° = 260°.',
  },
  {
    id: 'tri-004', tema: 'angulos', dificultad: 2,
    enunciado: 'En una circunferencia de radio 6 cm, ¿cuál es la longitud del arco que abarca un ángulo central de π/3 radianes?',
    opciones: ['2π cm', 'π cm', '6π cm', '3π cm'],
    correcta: 0,
    explicacion: 's = rθ con θ en radianes: 6 × π/3 = 2π cm.',
    pista: 'La fórmula s = rθ solo sirve con el ángulo en radianes.',
  },
  {
    id: 'tri-005', tema: 'angulos', dificultad: 3,
    enunciado: '¿Cuál es el ángulo de referencia de 225°?',
    opciones: ['45°', '135°', '225°', '30°'],
    correcta: 0,
    explicacion: '225° está en el tercer cuadrante, así que el ángulo de referencia es 225° − 180° = 45°.',
  },

  // ----- Triángulo rectángulo -----
  {
    id: 'tri-006', tema: 'triangulo-rectangulo', dificultad: 1,
    enunciado: 'En un triángulo rectángulo los catetos miden 3 y 4. ¿Cuál es el seno del ángulo opuesto al cateto de 3?',
    opciones: ['3/5', '4/5', '3/4', '5/3'],
    correcta: 0,
    explicacion: 'La hipotenusa es 5. El seno es cateto opuesto sobre hipotenusa: 3/5.',
  },
  {
    id: 'tri-007', tema: 'triangulo-rectangulo', dificultad: 2,
    enunciado: 'Si tan θ = 5/12 y θ es agudo, ¿cuánto vale sec θ?',
    opciones: ['13/12', '12/13', '13/5', '5/13'],
    correcta: 0,
    explicacion: 'Con cateto opuesto 5 y adyacente 12, la hipotenusa es 13. Como sec θ = hipotenusa/adyacente, vale 13/12.',
  },
  {
    id: 'tri-008', tema: 'triangulo-rectangulo', dificultad: 2,
    enunciado: 'Si cos θ = 8/17 y θ es agudo, ¿cuánto vale sen θ?',
    opciones: ['15/17', '17/15', '8/15', '15/8'],
    correcta: 0,
    explicacion: 'El cateto opuesto es √(17² − 8²) = √(289 − 64) = √225 = 15, así que sen θ = 15/17.',
  },
  {
    id: 'tri-009', tema: 'triangulo-rectangulo', dificultad: 2,
    enunciado: 'En un triángulo rectángulo, la hipotenusa mide 20 cm y un ángulo agudo mide 30°. ¿Cuánto mide el cateto opuesto a ese ángulo?',
    opciones: ['10 cm', '10√3 cm', '20√3 cm', '15 cm'],
    correcta: 0,
    explicacion: 'cateto opuesto = 20 · sen 30° = 20 × 0,5 = 10 cm.',
  },

  // ----- Ángulos notables -----
  {
    id: 'tri-010', tema: 'notables', dificultad: 1,
    enunciado: '¿Cuánto vale sen 30° + cos 60°?',
    opciones: ['1', '1/2', '√3/2', '0'],
    correcta: 0,
    explicacion: 'sen 30° = 1/2 y cos 60° = 1/2, así que la suma es 1.',
  },
  {
    id: 'tri-011', tema: 'notables', dificultad: 2,
    enunciado: '¿Cuánto vale tan 60° · cos 30°?',
    opciones: ['3/2', '√3/2', '1', '3'],
    correcta: 0,
    explicacion: 'tan 60° = √3 y cos 30° = √3/2. El producto es √3 × √3/2 = 3/2.',
  },
  {
    id: 'tri-012', tema: 'notables', dificultad: 2,
    enunciado: '¿Cuál es el valor exacto de sen 45° · cos 45° + sen 30°?',
    opciones: ['1', '1/2', '√2/2', '3/4'],
    correcta: 0,
    explicacion: 'sen 45° · cos 45° = (√2/2)(√2/2) = 2/4 = 1/2. Sumando sen 30° = 1/2 da 1.',
  },
  {
    id: 'tri-013', tema: 'notables', dificultad: 3,
    enunciado: 'Evalúa 2 sen²60° + 3 cos²30° − tan²45°.',
    opciones: ['11/4', '5/4', '2', '15/4'],
    correcta: 0,
    explicacion: 'sen²60° = 3/4 y cos²30° = 3/4, y tan 45° = 1. Entonces 2(3/4) + 3(3/4) − 1 = 3/2 + 9/4 − 1 = 11/4.',
  },

  // ----- Circunferencia unitaria -----
  {
    id: 'tri-014', tema: 'circunferencia', dificultad: 1,
    enunciado: 'Si un ángulo está en el segundo cuadrante, ¿cuál de estas razones es positiva?',
    opciones: ['El seno', 'El coseno', 'La tangente', 'La secante'],
    correcta: 0,
    explicacion: 'En el segundo cuadrante x es negativa y y positiva: solo el seno (y su recíproca, la cosecante) es positivo.',
    pista: 'Todas, Seno, Tangente, Coseno: el orden de los cuadrantes I, II, III y IV.',
  },
  {
    id: 'tri-015', tema: 'circunferencia', dificultad: 2,
    enunciado: '¿Cuánto vale sen 210°?',
    opciones: ['−1/2', '1/2', '−√3/2', '√3/2'],
    correcta: 0,
    explicacion: '210° está en el tercer cuadrante (seno negativo) y su ángulo de referencia es 30°, así que sen 210° = −sen 30° = −1/2.',
  },
  {
    id: 'tri-016', tema: 'circunferencia', dificultad: 2,
    enunciado: '¿Cuánto vale cos 300°?',
    opciones: ['1/2', '−1/2', '√3/2', '−√3/2'],
    correcta: 0,
    explicacion: '300° está en el cuarto cuadrante (coseno positivo) con ángulo de referencia 60°: cos 300° = cos 60° = 1/2.',
  },
  {
    id: 'tri-017', tema: 'circunferencia', dificultad: 3,
    enunciado: 'Si sen θ = −3/5 y θ está en el cuarto cuadrante, ¿cuánto vale tan θ?',
    opciones: ['−3/4', '3/4', '−4/3', '4/3'],
    correcta: 0,
    explicacion: 'En el cuarto cuadrante el coseno es positivo: cos θ = 4/5. Entonces tan θ = (−3/5)/(4/5) = −3/4.',
  },

  // ----- Identidades -----
  {
    id: 'tri-018', tema: 'identidades', dificultad: 1,
    enunciado: 'Simplifica sec²x − tan²x.',
    opciones: ['1', '0', 'sen²x', 'sec x'],
    correcta: 0,
    explicacion: 'Es una identidad pitagórica: 1 + tan²x = sec²x, así que sec²x − tan²x = 1.',
  },
  {
    id: 'tri-019', tema: 'identidades', dificultad: 2,
    enunciado: 'Simplifica (1 − cos²x)/sen x, con sen x ≠ 0.',
    opciones: ['sen x', 'cos x', 'tan x', 'csc x'],
    correcta: 0,
    explicacion: '1 − cos²x = sen²x, y sen²x/sen x = sen x.',
  },
  {
    id: 'tri-020', tema: 'identidades', dificultad: 2,
    enunciado: 'Simplifica sen²x (1 + cot²x).',
    opciones: ['1', 'sen²x', 'cos²x', 'tan²x'],
    correcta: 0,
    explicacion: '1 + cot²x = csc²x, y sen²x · csc²x = sen²x / sen²x = 1.',
  },
  {
    id: 'tri-021', tema: 'identidades', dificultad: 3,
    enunciado: 'Simplifica (1 + tan²x)/csc²x.',
    opciones: ['tan²x', 'sec²x', '1', 'cot²x'],
    correcta: 0,
    explicacion: '1 + tan²x = sec²x, y dividir entre csc²x es multiplicar por sen²x: sec²x · sen²x = sen²x/cos²x = tan²x.',
  },

  // ----- Suma, resta y ángulo doble -----
  {
    id: 'tri-022', tema: 'suma-angulos', dificultad: 1,
    enunciado: '¿A qué es igual cos(A − B)?',
    opciones: ['cos A cos B + sen A sen B', 'cos A cos B − sen A sen B', 'sen A cos B − cos A sen B', 'cos A − cos B'],
    correcta: 0,
    explicacion: 'En la resta de cosenos el signo del desarrollo se invierte respecto al de la suma: cos(A − B) = cos A cos B + sen A sen B.',
  },
  {
    id: 'tri-023', tema: 'suma-angulos', dificultad: 2,
    enunciado: '¿Cuál es el valor exacto de sen 75°?',
    opciones: ['(√6 + √2)/4', '(√6 − √2)/4', '(√3 + 1)/2', '√2/2'],
    correcta: 0,
    explicacion: 'sen 75° = sen(45° + 30°) = sen45·cos30 + cos45·sen30 = (√2/2)(√3/2) + (√2/2)(1/2) = (√6 + √2)/4.',
  },
  {
    id: 'tri-024', tema: 'suma-angulos', dificultad: 2,
    enunciado: 'Si sen x = 3/5 y x es agudo, ¿cuánto vale sen 2x?',
    opciones: ['24/25', '6/5', '7/25', '12/25'],
    correcta: 0,
    explicacion: 'cos x = 4/5. Entonces sen 2x = 2 sen x cos x = 2(3/5)(4/5) = 24/25.',
  },
  {
    id: 'tri-025', tema: 'suma-angulos', dificultad: 3,
    enunciado: 'Si cos x = 1/3, ¿cuánto vale cos 2x?',
    opciones: ['−7/9', '7/9', '2/9', '−1/9'],
    correcta: 0,
    explicacion: 'cos 2x = 2cos²x − 1 = 2(1/9) − 1 = 2/9 − 1 = −7/9.',
  },

  // ----- Ecuaciones trigonométricas -----
  {
    id: 'tri-026', tema: 'ecuaciones-trig', dificultad: 1,
    enunciado: 'Resuelve 2 sen x − 1 = 0 en el intervalo [0°, 360°).',
    opciones: ['30° y 150°', '30° y 330°', '60° y 120°', 'Solo 30°'],
    correcta: 0,
    explicacion: 'sen x = 1/2. El seno es positivo en los cuadrantes I y II: x = 30° y x = 180° − 30° = 150°.',
  },
  {
    id: 'tri-027', tema: 'ecuaciones-trig', dificultad: 2,
    enunciado: 'Resuelve tan x = −1 en el intervalo [0, 2π).',
    opciones: ['3π/4 y 7π/4', 'π/4 y 5π/4', '3π/4 y 5π/4', 'π/4 y 7π/4'],
    correcta: 0,
    explicacion: 'La tangente es negativa en los cuadrantes II y IV, con ángulo de referencia π/4: x = 3π/4 y x = 7π/4.',
  },
  {
    id: 'tri-028', tema: 'ecuaciones-trig', dificultad: 3,
    enunciado: 'Resuelve 2cos²x − cos x − 1 = 0 en [0°, 360°).',
    opciones: ['0°, 120° y 240°', '60° y 300°', '0° y 180°', '120° y 240°'],
    correcta: 0,
    explicacion: 'Factorizando en la variable cos x: (2cos x + 1)(cos x − 1) = 0. De cos x = 1 sale x = 0°; de cos x = −1/2 salen 120° y 240°.',
    pista: 'Trátala como una cuadrática en cos x.',
  },

  // ----- Gráficas -----
  {
    id: 'tri-029', tema: 'graficas-trig', dificultad: 2,
    enunciado: 'En y = 3 sen(2x − π), ¿cuáles son la amplitud y el periodo?',
    opciones: ['Amplitud 3, periodo π', 'Amplitud 3, periodo 2π', 'Amplitud 2, periodo π', 'Amplitud 6, periodo π/2'],
    correcta: 0,
    explicacion: 'La amplitud es |A| = 3 y el periodo es 2π/|B| = 2π/2 = π.',
  },
  {
    id: 'tri-030', tema: 'graficas-trig', dificultad: 2,
    enunciado: '¿Cuál es el periodo de y = tan(3x)?',
    opciones: ['π/3', '2π/3', 'π', '3π'],
    correcta: 0,
    explicacion: 'La tangente tiene periodo π, así que el de tan(Bx) es π/|B| = π/3.',
    pista: 'Ojo: el periodo de la tangente no es 2π.',
  },
  {
    id: 'tri-031', tema: 'graficas-trig', dificultad: 3,
    enunciado: '¿Cuál es el rango de y = −2 cos(x/2) + 1?',
    opciones: ['[−1, 3]', '[−2, 2]', '[−3, 1]', '[0, 2]'],
    correcta: 0,
    explicacion: 'cos varía entre −1 y 1, así que −2cos varía entre −2 y 2; sumando 1 el rango queda [−1, 3]. El factor x/2 cambia el periodo, no el rango.',
  },

  // ----- Leyes de senos y cosenos -----
  {
    id: 'tri-032', tema: 'leyes', dificultad: 2,
    enunciado: 'En un triángulo, a = 10, A = 30° y B = 45°. ¿Cuánto mide el lado b?',
    opciones: ['10√2', '10√3', '5√2', '20'],
    correcta: 0,
    explicacion: 'Por la ley de senos: b = a·sen B/sen A = 10 × (√2/2)/(1/2) = 10√2 ≈ 14,14.',
  },
  {
    id: 'tri-033', tema: 'leyes', dificultad: 2,
    enunciado: 'Dos lados de un triángulo miden 5 y 8, y el ángulo entre ellos es 60°. ¿Cuánto mide el tercer lado?',
    opciones: ['7', '√89', '9', '11'],
    correcta: 0,
    explicacion: 'Ley de cosenos: c² = 25 + 64 − 2(5)(8)cos60° = 89 − 40 = 49, así que c = 7.',
  },
  {
    id: 'tri-034', tema: 'leyes', dificultad: 3,
    enunciado: 'Un triángulo tiene lados 7, 8 y 9. ¿Cuánto vale el coseno del ángulo opuesto al lado 9?',
    opciones: ['2/7', '1/7', '3/7', '11/14'],
    correcta: 0,
    explicacion: 'cos C = (7² + 8² − 9²)/(2·7·8) = (49 + 64 − 81)/112 = 32/112 = 2/7.',
  },
  {
    id: 'tri-035', tema: 'leyes', dificultad: 2,
    enunciado: '¿Cuál es el área de un triángulo con lados 12 y 9 que forman un ángulo de 30°?',
    opciones: ['27', '54', '108', '13,5'],
    correcta: 0,
    explicacion: 'Área = (1/2)ab·sen C = (1/2)(12)(9)(0,5) = 27.',
  },

  // ----- Aplicaciones -----
  {
    id: 'tri-036', tema: 'aplicaciones', dificultad: 2,
    enunciado: 'Desde un punto en el suelo, a 60 m de la base de una torre, el ángulo de elevación de su punta es 30°. ¿Cuál es la altura de la torre?',
    opciones: ['20√3 m', '30 m', '60√3 m', '30√3 m'],
    correcta: 0,
    explicacion: 'h = 60 · tan 30° = 60 × (√3/3) = 20√3 ≈ 34,6 m.',
  },
  {
    id: 'tri-037', tema: 'aplicaciones', dificultad: 2,
    enunciado: 'Una escalera de 10 m se apoya en una pared formando 60° con el suelo. ¿A qué altura llega sobre la pared?',
    opciones: ['5√3 m', '5 m', '10√3 m', '8 m'],
    correcta: 0,
    explicacion: 'La altura es el cateto opuesto al ángulo: 10 · sen 60° = 10(√3/2) = 5√3 ≈ 8,66 m.',
  },
  {
    id: 'tri-038', tema: 'aplicaciones', dificultad: 3,
    enunciado: 'Desde lo alto de un faro de 45 m, el ángulo de depresión de un bote es 45°. ¿A qué distancia horizontal está el bote de la base del faro?',
    opciones: ['45 m', '45√2 m', '22,5 m', '90 m'],
    correcta: 0,
    explicacion: 'El ángulo de depresión desde arriba es igual al de elevación desde el bote. Con 45°, la tangente vale 1, así que la distancia horizontal es igual a la altura: 45 m.',
  },
];
