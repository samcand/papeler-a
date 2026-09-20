/**
 * ingles.js — Banco de inglés (nivel A2–B2, el que piden las pruebas de ingreso).
 *
 * Gramática, vocabulario y dos lecturas. Los enunciados de gramática van en
 * inglés, como en el examen; la explicación va en español, que es donde el
 * estudiante necesita entender la regla.
 *
 * Las opciones se barajan al presentarlas (motor.js).
 */

export const LECTURAS_EN = [
  {
    id: 'en-t1',
    titulo: 'The library that lends drills',
    parrafos: [
      "Most people who buy an electric drill use it for about thirteen minutes in its entire life. The rest of the time it sits in a cupboard. In 1979, a small town in Ohio decided that this was a strange way to organise a neighbourhood, and opened the first tool library: a place where residents borrow a drill, a ladder or a sewing machine for a week, exactly as they would borrow a book.",
      "The idea spread slowly at first, and then much faster after 2008, when the financial crisis made people think twice before buying equipment they rarely needed. Today there are more than five hundred tool libraries around the world. Some are run by city councils; most are run by volunteers.",
      "The savings are obvious, but the librarians say the real benefit is different. Borrowers usually arrive without knowing how to use what they are taking home, so somebody has to show them. Tool libraries have become, almost by accident, places where people teach each other to repair things instead of replacing them.",
    ],
  },
  {
    id: 'en-t2',
    titulo: 'The city that pays you to cycle',
    parrafos: [
      "For three years, the French city of Strasbourg has been running an unusual experiment: employees who cycle to work receive a small payment for every kilometre they ride. The amount is modest, around twenty-five cents, and it is paid by the employer, who can then deduct it from taxes.",
      "The scheme was not designed to make anyone rich. Its aim was to change a habit. Transport researchers have known for years that people rarely abandon their cars because of information campaigns; they abandon them when an alternative becomes slightly more convenient, or slightly cheaper, than driving.",
      "The results have been encouraging but limited. Cycling to work rose by eleven per cent among the companies that joined, though the study could not determine how many of those cyclists had previously travelled by bus rather than by car. Critics argue that the money would achieve more if it were spent on protected bike lanes, which benefit everyone rather than only those who already work for a participating company.",
    ],
  },
];

export const INGLES = [
  // ----- Verb tenses -----
  {
    id: 'ing-001', tema: 'tiempos-verbales', dificultad: 1,
    enunciado: 'She ______ in London since 2019.',
    opciones: ['has lived', 'lives', 'lived', 'is living'],
    correcta: 0,
    explicacion: '"Since" marca el inicio de una acción que continúa hasta hoy: se usa present perfect (has/have + participio).',
    pista: 'since / for / already / yet piden present perfect.',
  },
  {
    id: 'ing-002', tema: 'tiempos-verbales', dificultad: 1,
    enunciado: 'Look! It ______ again.',
    opciones: ['is raining', 'rains', 'rained', 'has rained'],
    correcta: 0,
    explicacion: '"Look!" señala algo que ocurre en este momento: present continuous.',
  },
  {
    id: 'ing-003', tema: 'tiempos-verbales', dificultad: 2,
    enunciado: 'By the time we arrived, the film ______.',
    opciones: ['had already started', 'already started', 'has already started', 'was already starting'],
    correcta: 0,
    explicacion: 'Past perfect: una acción anterior a otra acción del pasado. Primero empezó la película, después llegamos.',
  },
  {
    id: 'ing-004', tema: 'tiempos-verbales', dificultad: 2,
    enunciado: 'He ______ television when the phone rang.',
    opciones: ['was watching', 'watched', 'has watched', 'is watching'],
    correcta: 0,
    explicacion: 'La acción larga que estaba en curso va en past continuous; la acción breve que la interrumpe, en past simple.',
  },
  {
    id: 'ing-005', tema: 'tiempos-verbales', dificultad: 2,
    enunciado: 'I ______ to Canada last summer, and I loved it.',
    opciones: ['went', 'have gone', 'had gone', 'was going'],
    correcta: 0,
    explicacion: '"Last summer" es un momento pasado terminado y concreto, así que corresponde past simple, no present perfect.',
  },
  {
    id: 'ing-006', tema: 'tiempos-verbales', dificultad: 3,
    enunciado: "Don\u0027t call at eight. We ______ dinner then.",
    opciones: ['will be having', 'will have', 'have', 'are having had'],
    correcta: 0,
    explicacion: 'Future continuous: una acción que estará en curso en un momento concreto del futuro.',
  },

  // ----- Conditionals -----
  {
    id: 'ing-007', tema: 'condicionales', dificultad: 1,
    enunciado: 'If I ______ you, I would apologise.',
    opciones: ['were', 'am', 'will be', 'had been'],
    correcta: 0,
    explicacion: 'Second conditional (situación hipotética): if + past simple + would. Con el verbo to be se usa "were" para todas las personas.',
  },
  {
    id: 'ing-008', tema: 'condicionales', dificultad: 2,
    enunciado: 'If she had studied harder, she ______ the exam.',
    opciones: ['would have passed', 'would pass', 'will pass', 'had passed'],
    correcta: 0,
    explicacion: 'Third conditional: habla de un pasado que ya no se puede cambiar. if + past perfect + would have + participio.',
  },
  {
    id: 'ing-009', tema: 'condicionales', dificultad: 1,
    enunciado: 'If you heat water to 100 °C, it ______.',
    opciones: ['boils', 'will boil', 'would boil', 'boiled'],
    correcta: 0,
    explicacion: 'Zero conditional: para hechos que siempre ocurren se usa present simple en las dos partes.',
  },
  {
    id: 'ing-010', tema: 'condicionales', dificultad: 3,
    enunciado: 'I wish I ______ play the piano.',
    opciones: ['could', 'can', 'will can', 'would can'],
    correcta: 0,
    explicacion: 'Después de "I wish", el verbo va un paso atrás en el tiempo; "can" se convierte en "could".',
  },

  // ----- Modal verbs -----
  {
    id: 'ing-011', tema: 'modales', dificultad: 1,
    enunciado: "You ______ smoke here. It's a hospital.",
    opciones: ["mustn't", "don't have to", "shouldn't have", "couldn't"],
    correcta: 0,
    explicacion: '"Mustn’t" expresa prohibición. Cuidado: "don’t have to" significa que no es necesario, no que esté prohibido.',
    pista: 'Prohibición y ausencia de obligación son cosas distintas.',
  },
  {
    id: 'ing-012', tema: 'modales', dificultad: 2,
    enunciado: "It's Sunday, so you ______ get up early.",
    opciones: ["don't have to", "mustn't", "couldn't", "shouldn't have"],
    correcta: 0,
    explicacion: 'No hay obligación de madrugar, pero tampoco está prohibido: "don’t have to".',
  },
  {
    id: 'ing-013', tema: 'modales', dificultad: 2,
    enunciado: 'He ______ be at home: his car is in the garage and the lights are on.',
    opciones: ['must', "can't", 'should', 'might not'],
    correcta: 0,
    explicacion: 'Deducción lógica con evidencia fuerte a favor: "must be". Si la evidencia fuera en contra se usaría "can’t be".',
  },
  {
    id: 'ing-014', tema: 'modales', dificultad: 3,
    enunciado: 'I ______ her the truth, but I was afraid of her reaction.',
    opciones: ['should have told', 'should tell', 'must have told', 'should have said'],
    correcta: 0,
    explicacion: '"Should have + participio" expresa arrepentimiento por algo que no se hizo. Además, se dice "tell somebody" y "say something": con el objeto "her" corresponde "tell".',
  },

  // ----- Passive voice -----
  {
    id: 'ing-015', tema: 'voz-pasiva', dificultad: 1,
    enunciado: 'The bridge ______ in 1890.',
    opciones: ['was built', 'was build', 'has built', 'built'],
    correcta: 0,
    explicacion: 'Pasiva en past simple: was/were + participio pasado. El participio de "build" es "built".',
  },
  {
    id: 'ing-016', tema: 'voz-pasiva', dificultad: 2,
    enunciado: 'Choose the passive form of: "Someone has stolen my bike."',
    opciones: ['My bike has been stolen.', 'My bike was stolen by someone.', 'My bike has stolen.', 'My bike is being stolen.'],
    correcta: 0,
    explicacion: 'El present perfect activo (has stolen) pasa a "has been + participio". El agente "someone" se omite por ser irrelevante.',
  },
  {
    id: 'ing-017', tema: 'voz-pasiva', dificultad: 2,
    enunciado: 'This room ______ every morning.',
    opciones: ['is cleaned', 'cleans', 'is cleaning', 'has cleaned'],
    correcta: 0,
    explicacion: 'La habitación recibe la acción, así que va en pasiva de present simple: is + participio.',
  },

  // ----- Reported speech -----
  {
    id: 'ing-018', tema: 'reported-speech', dificultad: 2,
    enunciado: 'He said: "I am very tired." → He said that he ______ very tired.',
    opciones: ['was', 'is', 'had been', 'would be'],
    correcta: 0,
    explicacion: 'En estilo indirecto el verbo retrocede un tiempo: present simple pasa a past simple.',
  },
  {
    id: 'ing-019', tema: 'reported-speech', dificultad: 3,
    enunciado: 'She asked: "Where do you live?" → She asked me where ______.',
    opciones: ['I lived', 'did I live', 'do I live', 'I did live'],
    correcta: 0,
    explicacion: 'En las preguntas reportadas se recupera el orden de una afirmación (sujeto + verbo) y desaparece el auxiliar "do".',
    pista: 'En reported questions no hay inversión ni signo de interrogación.',
  },
  {
    id: 'ing-020', tema: 'reported-speech', dificultad: 2,
    enunciado: 'He told me: "Close the door." → He told me ______ the door.',
    opciones: ['to close', 'close', 'closing', 'that close'],
    correcta: 0,
    explicacion: 'Las órdenes reportadas usan el infinitivo con "to": told me to close.',
  },

  // ----- Relative clauses -----
  {
    id: 'ing-021', tema: 'relativas', dificultad: 1,
    enunciado: 'The woman ______ lives next door is a doctor.',
    opciones: ['who', 'which', 'whose', 'where'],
    correcta: 0,
    explicacion: '"Who" se usa para personas y funciona como sujeto de la oración de relativo.',
  },
  {
    id: 'ing-022', tema: 'relativas', dificultad: 2,
    enunciado: "That's the village ______ my grandparents were born.",
    opciones: ['where', 'which', 'that', 'when'],
    correcta: 0,
    explicacion: '"Where" se usa para lugares cuando la relativa indica el sitio en el que ocurre algo.',
  },
  {
    id: 'ing-023', tema: 'relativas', dificultad: 2,
    enunciado: "This is the student ______ project won the prize.",
    opciones: ['whose', "who's", 'which', 'that'],
    correcta: 0,
    explicacion: '"Whose" indica posesión: el proyecto pertenece al estudiante. "Who’s" es la contracción de "who is".',
  },

  // ----- Prepositions -----
  {
    id: 'ing-024', tema: 'preposiciones', dificultad: 1,
    enunciado: "I'm very interested ______ learning Japanese.",
    opciones: ['in', 'on', 'for', 'about'],
    correcta: 0,
    explicacion: 'El adjetivo "interested" va siempre con "in", y después de preposición el verbo va en gerundio: interested in learning.',
  },
  {
    id: 'ing-025', tema: 'preposiciones', dificultad: 2,
    enunciado: "The meeting is ______ Monday ______ nine o\u0027clock.",
    opciones: ['on / at', 'in / on', 'at / in', 'on / in'],
    correcta: 0,
    explicacion: '"On" para días, "at" para horas exactas e "in" para meses, años y partes del día.',
  },
  {
    id: 'ing-026', tema: 'preposiciones', dificultad: 2,
    enunciado: "She's really good ______ solving problems under pressure.",
    opciones: ['at', 'in', 'on', 'with'],
    correcta: 0,
    explicacion: '"Good at" es la combinación fija para hablar de habilidad.',
  },

  // ----- Articles and quantifiers -----
  {
    id: 'ing-027', tema: 'cuantificadores', dificultad: 1,
    enunciado: "There isn't ______ milk left in the fridge.",
    opciones: ['much', 'many', 'a few', 'several'],
    correcta: 0,
    explicacion: '"Milk" es incontable, así que lleva "much". "Many" y "a few" acompañan a contables.',
  },
  {
    id: 'ing-028', tema: 'cuantificadores', dificultad: 2,
    enunciado: "I have ______ friends in Chile, so I'm going to visit them.",
    opciones: ['a few', 'a little', 'much', 'few'],
    correcta: 0,
    explicacion: '"A few" (algunos, contable) tiene sentido positivo. "Few" sin artículo significa "casi ninguno" y contradice la segunda parte de la frase.',
  },
  {
    id: 'ing-029', tema: 'cuantificadores', dificultad: 3,
    enunciado: '______ Mount Everest is in ______ Himalayas.',
    opciones: ['— / the', 'The / the', '— / —', 'The / —'],
    correcta: 0,
    explicacion: 'Las montañas aisladas van sin artículo, pero las cordilleras lo llevan: Mount Everest, the Himalayas, the Andes.',
  },

  // ----- Linking words -----
  {
    id: 'ing-030', tema: 'conectores', dificultad: 2,
    enunciado: '______ the heavy rain, we decided to go out.',
    opciones: ['Despite', 'Although', 'However', 'Because of'],
    correcta: 0,
    explicacion: '"Despite" y "in spite of" van seguidos de sustantivo; "although" necesita sujeto y verbo después.',
    pista: 'Fíjate en si lo que sigue es un sustantivo o una oración completa.',
  },
  {
    id: 'ing-031', tema: 'conectores', dificultad: 2,
    enunciado: 'He was exhausted; ______, he finished the race.',
    opciones: ['however', 'despite', 'although', 'because'],
    correcta: 0,
    explicacion: '"However" enlaza dos oraciones independientes y va entre comas o después de punto y coma.',
  },
  {
    id: 'ing-032', tema: 'conectores', dificultad: 3,
    enunciado: 'It was ______ a difficult exam that half the class failed.',
    opciones: ['such', 'so', 'too', 'very'],
    correcta: 0,
    explicacion: 'La estructura es "such + (a/an) + adjetivo + sustantivo + that". Con solo un adjetivo se usaría "so difficult that".',
  },

  // ----- Phrasal verbs -----
  {
    id: 'ing-033', tema: 'phrasal-verbs', dificultad: 1,
    enunciado: "I don't know this word. I'll ______ it ______ in the dictionary.",
    opciones: ['look / up', 'look / after', 'look / for', 'look / into'],
    correcta: 0,
    explicacion: '"Look up" es buscar información en un diccionario o lista. "Look for" es buscar un objeto y "look after" es cuidar.',
  },
  {
    id: 'ing-034', tema: 'phrasal-verbs', dificultad: 2,
    enunciado: 'The plane will ______ in ten minutes.',
    opciones: ['take off', 'take up', 'take over', 'take out'],
    correcta: 0,
    explicacion: '"Take off" es despegar (y también quitarse una prenda).',
  },
  {
    id: 'ing-035', tema: 'phrasal-verbs', dificultad: 2,
    enunciado: 'She ______ smoking two years ago and she feels much better now.',
    opciones: ['gave up', 'gave in', 'gave away', 'gave back'],
    correcta: 0,
    explicacion: '"Give up" es abandonar un hábito. "Give in" es rendirse ante alguien y "give back" es devolver.',
  },

  // ----- Vocabulary and word formation -----
  {
    id: 'ing-036', tema: 'vocabulario', dificultad: 2,
    enunciado: 'Complete with the correct form of DECIDE: "His ______ surprised everyone."',
    opciones: ['decision', 'decisive', 'deciding', 'decided'],
    correcta: 0,
    explicacion: 'Después del posesivo "his" hace falta un sustantivo, y el sustantivo de "decide" es "decision".',
  },
  {
    id: 'ing-037', tema: 'vocabulario', dificultad: 2,
    enunciado: 'What does the word ACTUALLY mean in "Actually, I prefer tea"?',
    opciones: ['In fact', 'Currently', 'Nowadays', 'Immediately'],
    correcta: 0,
    explicacion: 'Falso amigo clásico: "actually" significa "en realidad, de hecho". Para "actualmente" se usa "currently" o "nowadays".',
  },
  {
    id: 'ing-038', tema: 'vocabulario', dificultad: 1,
    enunciado: 'Choose the correct collocation: "We need to ______ a decision before Friday."',
    opciones: ['make', 'do', 'take', 'have'],
    correcta: 0,
    explicacion: 'En inglés se dice "make a decision". "Do" acompaña tareas (do homework) y "take" otras expresiones (take a photo).',
  },
  {
    id: 'ing-039', tema: 'vocabulario', dificultad: 3,
    enunciado: 'Which word is the opposite of SCARCE?',
    opciones: ['abundant', 'expensive', 'useful', 'hidden'],
    correcta: 0,
    explicacion: '"Scarce" significa escaso, así que su contrario es "abundant" (abundante).',
  },
  {
    id: 'ing-040', tema: 'vocabulario', dificultad: 2,
    enunciado: 'Choose the word that completes the sentence: "The instructions were so ______ that nobody understood them."',
    opciones: ['confusing', 'confused', 'confusion', 'confuse'],
    correcta: 0,
    explicacion: 'Los adjetivos en -ing describen la cosa que provoca el efecto (instrucciones confusas); los de -ed describen a quien lo siente (the students were confused).',
  },

  // ----- Reading 1 -----
  {
    id: 'ing-041', tema: 'reading', dificultad: 2, lectura: 'en-t1',
    enunciado: 'What is the main idea of the text?',
    opciones: [
      'Tool libraries let people share equipment and, unexpectedly, teach each other to repair things',
      'Electric drills are a waste of money for most families',
      'The financial crisis of 2008 destroyed many small businesses',
      'City councils should run more libraries',
    ],
    correcta: 0,
    explicacion: 'El texto empieza con el dato del taladro como ejemplo y termina diciendo cuál es, según los bibliotecarios, el beneficio real: enseñar a reparar. Las demás opciones recogen detalles sueltos.',
  },
  {
    id: 'ing-042', tema: 'reading', dificultad: 1, lectura: 'en-t1',
    enunciado: 'According to the text, how long does an average electric drill work during its whole life?',
    opciones: ['About thirteen minutes', 'About thirteen hours', 'About a week', 'The text does not say'],
    correcta: 0,
    explicacion: 'Primera frase: "about thirteen minutes in its entire life".',
  },
  {
    id: 'ing-043', tema: 'reading', dificultad: 3, lectura: 'en-t1',
    enunciado: 'In the text, "almost by accident" suggests that tool libraries:',
    opciones: [
      'Did not plan to become places for teaching repair skills',
      'Were created after an accident in a workshop',
      'Are dangerous for inexperienced borrowers',
      'Opened without permission from the council',
    ],
    correcta: 0,
    explicacion: 'La expresión indica que ese resultado no era el objetivo inicial: surgió porque quien pide prestada una herramienta suele necesitar que le enseñen a usarla.',
  },
  {
    id: 'ing-044', tema: 'reading', dificultad: 2, lectura: 'en-t1',
    enunciado: 'Which statement is TRUE according to the text?',
    opciones: [
      'Most tool libraries are run by volunteers',
      'All tool libraries belong to city councils',
      'The first tool library opened in 2008',
      'There are fewer than one hundred tool libraries today',
    ],
    correcta: 0,
    explicacion: 'El segundo párrafo dice "Some are run by city councils; most are run by volunteers", que la primera abrió en 1979 y que hoy hay más de quinientas.',
  },

  // ----- Reading 2 -----
  {
    id: 'ing-045', tema: 'reading', dificultad: 2, lectura: 'en-t2',
    enunciado: 'What was the main purpose of the Strasbourg scheme?',
    opciones: [
      'To change a daily habit by making cycling slightly more attractive than driving',
      'To increase the income of low-paid employees',
      'To reduce the number of buses in the city',
      'To finance the construction of new bike lanes',
    ],
    correcta: 0,
    explicacion: 'El texto lo dice expresamente: "The scheme was not designed to make anyone rich. Its aim was to change a habit."',
  },
  {
    id: 'ing-046', tema: 'reading', dificultad: 3, lectura: 'en-t2',
    enunciado: 'Why does the text say the results were "limited"?',
    opciones: [
      'Because the study could not show how many new cyclists had previously driven a car',
      'Because cycling actually decreased in some companies',
      'Because only three companies joined the scheme',
      'Because the payment was stopped after one year',
    ],
    correcta: 0,
    explicacion: 'Si esos ciclistas antes iban en autobús, el beneficio en tráfico y emisiones es mucho menor. Esa es la limitación que menciona el texto.',
  },
  {
    id: 'ing-047', tema: 'reading', dificultad: 2, lectura: 'en-t2',
    enunciado: 'What do the critics of the scheme argue?',
    opciones: [
      'That protected bike lanes would benefit more people than individual payments',
      'That cycling to work is dangerous in Strasbourg',
      'That employers should not receive tax deductions',
      'That twenty-five cents per kilometre is too much money',
    ],
    correcta: 0,
    explicacion: 'Último párrafo: los críticos sostienen que el dinero rendiría más en carriles protegidos, que sirven a todos y no solo a quienes trabajan en una empresa participante.',
  },
  {
    id: 'ing-048', tema: 'reading', dificultad: 3, lectura: 'en-t2',
    enunciado: 'In the text, the word "modest" (paragraph 1) is closest in meaning to:',
    opciones: ['small', 'humble in character', 'secret', 'generous'],
    correcta: 0,
    explicacion: 'Aplicado a una cantidad de dinero, "modest" significa pequeña. El sentido de persona humilde no encaja aquí.',
  },
];
