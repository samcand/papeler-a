/**
 * lectura.js — Banco de comprensión de lectura.
 *
 * Los textos son originales y están escritos a la medida del examen: entre 180
 * y 250 palabras, con una idea principal clara, datos que se pueden verificar
 * dentro del texto y al menos un lugar donde hay que inferir.
 *
 * Cada pregunta apunta a un texto con el campo `lectura`. Las opciones se
 * barajan al presentarlas (motor.js).
 */

export const LECTURAS = [
  {
    id: 'lec-t1',
    titulo: 'El mosquito que se mudó a la ciudad',
    parrafos: [
      'El Aedes aegypti no es un insecto del monte. Es un animal urbano, tan adaptado a nosotros como las palomas o las ratas. No necesita pantanos ni ríos: le basta con el agua limpia y quieta que se acumula en una llanta vieja, en el plato de una maceta o en un tanque destapado. Una tapa de botella con agua de lluvia puede sostener una generación entera.',
      'Esa domesticidad explica por qué las campañas de fumigación, por sí solas, rinden tan poco. El insecticida mata a los mosquitos adultos que están volando en ese momento, pero no toca los huevos, que resisten secos durante meses y eclosionan en cuanto vuelve a llover. Dos semanas después de la fumigación, el barrio vuelve a estar como antes.',
      'Los programas que sí han reducido los casos de dengue trabajan sobre los criaderos, casa por casa, y dependen de algo que ningún camión puede hacer: que los vecinos revisen sus patios cada semana. Es un trabajo lento, poco vistoso y difícil de fotografiar para un noticiero. Un alcalde que fumiga sale en la televisión; un alcalde que organiza a doscientas familias para vaciar floreros, no.',
      'Mientras el problema se siga midiendo en litros de insecticida y no en criaderos eliminados, seguiremos gastando mucho para cambiar poco.',
    ],
  },
  {
    id: 'lec-t2',
    titulo: 'La economía de la atención',
    parrafos: [
      'Durante siglos, el modelo de negocio de los medios fue vender contenidos a un público. Hoy, en buena parte de internet, es el revés exacto: se vende el público a los anunciantes. El contenido es solo el cebo, y el producto que se entrega es nuestro tiempo de pantalla.',
      'El cambio no es un detalle técnico. Cuando el ingreso depende de cuántos minutos permanecemos mirando, los sistemas que deciden qué vemos no están diseñados para informarnos mejor, sino para retenernos más. Y resulta que lo que mejor retiene no es lo más verdadero ni lo más útil, sino lo que provoca indignación, miedo o curiosidad incompleta.',
      'Quienes defienden estas plataformas responden que nadie obliga a nadie a usarlas. El argumento suena razonable, pero ignora una asimetría evidente: del otro lado de la pantalla hay equipos de ingenieros, psicólogos y millones de experimentos diseñados para vencer exactamente la fuerza de voluntad de un usuario promedio. Llamar "libre elección" a ese enfrentamiento es una manera elegante de no discutir el problema.',
      'No propongo prohibir nada. Propongo algo más modesto: que dejemos de hablar de estas herramientas como si fueran neutrales. Un martillo no tiene ningún interés en que lo uses ocho horas al día.',
    ],
  },
  {
    id: 'lec-t3',
    titulo: 'La casa de la calle Aranjuez',
    parrafos: [
      'Mi abuela vendió la casa un martes de noviembre, sin avisarle a nadie. Cuando llegamos el domingo, con el pan y las ganas de almuerzo de siempre, encontramos la puerta abierta y las paredes desnudas. Ella estaba sentada en una silla de plástico en medio de la sala, con el bolso sobre las rodillas, como si esperara un autobús.',
      '—Ya estaba muy grande esta casa para mí —dijo, y se quedó mirando la mancha clara que había dejado el espejo del recibidor.',
      'Mi madre empezó a hacer cuentas en voz alta: el precio, los papeles, lo que costaría el apartamento nuevo. Mi tío preguntó por los muebles. Nadie preguntó lo otro. Yo tenía once años y tampoco supe preguntarlo, pero recuerdo con exactitud que mi abuela no volvió a mirar hacia el patio en toda la tarde, ni siquiera cuando alguien mencionó el limonero.',
      'Años después entendí que la silla de plástico no era descuido: la había dejado a propósito, para no tener que sentarse en el suelo de una casa que ya no era suya. Nos costó una década entera darnos cuenta de que no nos había pedido permiso porque sabía perfectamente lo que le íbamos a decir.',
    ],
  },
  {
    id: 'lec-t4',
    titulo: 'El problema no es generar, es guardar',
    parrafos: [
      'La discusión sobre energías renovables suele quedarse en el precio de generar un kilovatio hora. Y ahí la batalla ya está ganada: en la última década, el costo de la electricidad solar cayó cerca de un 85 %, y hoy una planta fotovoltaica nueva produce más barato que una térmica a carbón en la mayor parte del mundo.',
      'El obstáculo está en otra parte. El sol alumbra al mediodía y el viento sopla cuando quiere, pero el consumo eléctrico de una ciudad tiene su pico entre las seis y las diez de la noche, justo cuando los paneles dejan de producir. Una red que se abastece de renovables sin almacenamiento produce de sobra a las dos de la tarde y se queda corta a las ocho de la noche.',
      'Por eso las baterías, las represas de bombeo y las redes de interconexión importan tanto como los paneles. Un sistema con 40 % de generación renovable y sin capacidad de guardar energía puede ser menos confiable que uno con 25 % bien respaldado.',
      'Quien celebre solo la cifra de capacidad instalada está mirando la mitad del tablero. La pregunta útil no es cuánto se genera, sino cuánto se puede entregar en el momento en que alguien enciende la luz.',
    ],
  },
  {
    id: 'lec-t5',
    titulo: 'Celulares en el aula',
    parrafos: [
      'El colegio decidió prohibir los celulares durante toda la jornada, y la medida dividió a la comunidad.',
      'Los profesores que la impulsaron señalan un hecho concreto: en las clases donde se recogen los teléfonos al entrar, las intervenciones de los estudiantes aumentaron y las tareas incompletas bajaron. Sostienen que la atención es un recurso limitado y que competir contra una pantalla con notificaciones es una pelea perdida.',
      'Varios padres se oponen. Su argumento principal es la seguridad: quieren poder comunicarse con sus hijos ante cualquier emergencia. Un segundo grupo agrega que prohibir no enseña nada, y que la escuela debería formar en el uso responsable en vez de esconder el problema hasta que los estudiantes se gradúen.',
      'Un tercer argumento circuló en el chat de padres y conviene mirarlo de cerca: "en mis tiempos no había celulares y nadie se murió". La frase es cierta, pero no dice nada sobre la decisión que hay que tomar hoy; que algo funcionara antes no demuestra que sea lo mejor ahora, ni al revés.',
      'La rectoría anunció que revisará la medida al final del semestre con los datos de asistencia, notas y reportes de convivencia. Es, hasta ahora, lo más sensato que se ha dicho en todo el debate.',
    ],
  },
  {
    id: 'lec-t6',
    titulo: 'El cacao antes del chocolate',
    parrafos: [
      'Antes de ser un dulce, el cacao fue una moneda y una bebida amarga. Los mexicas lo tomaban molido con agua, chile y flores, batido hasta levantar espuma, y lo reservaban para guerreros, comerciantes y nobles. Con los granos también se pagaba: en el siglo XVI, un conejo costaba unos treinta granos y una carga de leña unos cinco.',
      'Cuando el cacao llegó a Europa, el sabor no convenció a nadie. Las crónicas de la época lo describen como una bebida oscura, espesa y desagradable. Lo que cambió su destino fue el azúcar, que por entonces empezaba a llegar en cantidad desde las plantaciones del Caribe. Endulzado y servido caliente, el chocolate se volvió una costumbre de la corte española y de ahí pasó al resto del continente.',
      'El paso final llegó en el siglo XIX, cuando una prensa holandesa logró separar la manteca del cacao y obtener un polvo fino que se mezclaba fácilmente. Esa máquina, más que ninguna receta, hizo posible la barra de chocolate que hoy se compra en cualquier tienda.',
      'La historia del chocolate no es la de un alimento que se descubre, sino la de uno que se transforma tres veces hasta volverse irreconocible para quienes lo inventaron.',
    ],
  },
  {
    id: 'lec-t7',
    titulo: 'Carta al director',
    parrafos: [
      'Señor director:',
      'Leí con atención el reportaje del domingo sobre los nuevos buses eléctricos y quiero felicitar a su periódico por el detalle de las cifras. También quiero señalar lo que el reportaje no dijo.',
      'La nota celebra que la flota nueva reduce las emisiones en el centro de la ciudad. Es verdad y es una buena noticia. Pero omite que las tres rutas renovadas son justamente las que ya tenían mejor servicio, y que en los barrios del suroriente, donde vivo, la frecuencia sigue siendo de un bus cada cuarenta minutos en hora pico. Llevo seis años tomando ese bus y puedo asegurarle que la contaminación no es lo primero que uno piensa cuando lleva media hora esperando bajo el sol.',
      'No pido que dejen de informar sobre los avances. Pido que, cuando se publique una cifra de la alcaldía, alguien pregunte también a quién le tocó el avance. Un periódico que solo repite el comunicado de prensa nos deja peor informados que uno que no publica nada, porque nos deja convencidos de que ya sabemos.',
      'Atentamente, Luz Mariana Ordóñez, usuaria de la ruta 14.',
    ],
  },
  {
    id: 'lec-t8',
    titulo: 'Dormir para aprender',
    parrafos: [
      'Durante mucho tiempo se pensó que el sueño era una pausa: el cerebro se apagaba y descansaba. Los estudios de las últimas décadas muestran lo contrario. Mientras dormimos, el cerebro repite en cuestión de segundos las secuencias de actividad que ocurrieron durante el día y las traslada a redes de almacenamiento más estables. Aprender es, en buena parte, dormir después de haber estudiado.',
      'Un experimento clásico lo ilustra bien. Dos grupos de estudiantes memorizan la misma lista de palabras. Uno duerme ocho horas antes de la prueba; el otro permanece despierto el mismo tiempo. El grupo que durmió recuerda sistemáticamente más palabras, aunque ambos hayan dedicado el mismo tiempo a estudiar.',
      'Conviene, eso sí, leer bien lo que muestran estos datos. En las encuestas escolares suele aparecer que los estudiantes que duermen más tienen mejores notas, y de ahí se salta rápido a la conclusión de que dormir mejora el rendimiento. Podría ser al revés: quizá quienes van bien en clase tienen menos trabajo atrasado y por eso duermen más. También podría haber un tercer factor, como hogares más organizados, que explique las dos cosas a la vez.',
      'Los experimentos controlados, no las encuestas, son los que permiten afirmar que el sueño consolida la memoria.',
    ],
  },
];

export const LECTURA = [
  // ----- Texto 1: el mosquito -----
  {
    id: 'lec-001', tema: 'idea-principal', dificultad: 2, lectura: 'lec-t1',
    enunciado: '¿Cuál es la idea principal del texto?',
    opciones: [
      'Fumigar sirve de poco porque el problema son los criaderos domésticos, que exigen trabajo constante de los vecinos',
      'El Aedes aegypti se reproduce en agua limpia y quieta',
      'Los alcaldes prefieren las medidas que salen en televisión',
      'El dengue es una enfermedad urbana que va en aumento',
    ],
    correcta: 0,
    explicacion: 'Las otras opciones son ciertas según el texto, pero son piezas del argumento: el primer dato aparece en el primer párrafo y la crítica a los alcaldes es un ejemplo. La idea que recorre todo el texto es que el control efectivo está en los criaderos y no en la fumigación.',
    pista: 'La idea principal debe cubrir el texto completo, no solo un párrafo.',
  },
  {
    id: 'lec-002', tema: 'detalles', dificultad: 1, lectura: 'lec-t1',
    enunciado: 'Según el texto, ¿por qué la fumigación pierde efecto a las pocas semanas?',
    opciones: [
      'Porque no destruye los huevos, que resisten secos y eclosionan con la lluvia',
      'Porque los mosquitos se vuelven resistentes al insecticida',
      'Porque los vecinos no abren las puertas de sus casas',
      'Porque el insecticida se diluye con el agua de lluvia',
    ],
    correcta: 0,
    explicacion: 'El segundo párrafo lo dice explícitamente: el insecticida mata a los adultos que vuelan en ese momento, pero no toca los huevos.',
  },
  {
    id: 'lec-003', tema: 'inferencias', dificultad: 3, lectura: 'lec-t1',
    enunciado: 'Del contraste entre "un alcalde que fumiga sale en la televisión" y "un alcalde que organiza a doscientas familias, no", se puede inferir que:',
    opciones: [
      'Las decisiones de salud pública a veces se toman pensando en su visibilidad política',
      'Los noticieros están aliados con las empresas de insecticidas',
      'Los vecinos no quieren colaborar con las campañas',
      'Organizar a las familias es imposible en una ciudad grande',
    ],
    correcta: 0,
    explicacion: 'El texto sugiere que lo vistoso se prefiere a lo eficaz, sin llegar a afirmar una alianza con los medios ni culpar a los vecinos. Las otras opciones añaden información que el texto no da.',
  },
  {
    id: 'lec-004', tema: 'vocabulario-contexto', dificultad: 2, lectura: 'lec-t1',
    enunciado: 'En "esa domesticidad explica por qué las campañas rinden tan poco", la palabra domesticidad se refiere a:',
    opciones: [
      'La costumbre del mosquito de vivir dentro de las casas humanas',
      'La docilidad del insecto frente al insecticida',
      'El trabajo doméstico de limpiar los patios',
      'La vida familiar de los vecinos del barrio',
    ],
    correcta: 0,
    explicacion: 'El párrafo anterior describe al mosquito como un animal urbano que se cría en macetas y tanques: domesticidad alude a esa vida dentro del hogar humano.',
  },

  // ----- Texto 2: economía de la atención -----
  {
    id: 'lec-005', tema: 'idea-principal', dificultad: 2, lectura: 'lec-t2',
    enunciado: '¿Cuál es la tesis que defiende el autor?',
    opciones: [
      'Las plataformas no son herramientas neutrales, porque su negocio depende de retener nuestra atención',
      'Las redes sociales deberían prohibirse',
      'La publicidad es la causa de la desinformación',
      'Los usuarios carecen por completo de fuerza de voluntad',
    ],
    correcta: 0,
    explicacion: 'El autor dice expresamente que no propone prohibir nada y que su propuesta es "más modesta": dejar de tratarlas como neutrales.',
  },
  {
    id: 'lec-006', tema: 'argumentacion', dificultad: 3, lectura: 'lec-t2',
    enunciado: '¿Cómo responde el autor al argumento de que "nadie obliga a nadie a usarlas"?',
    opciones: [
      'Señala que hay una asimetría entre el usuario y los equipos que diseñan la plataforma',
      'Afirma que es falso porque el uso es obligatorio en el trabajo',
      'Lo acepta y por eso pide regulación',
      'Responde atacando a quienes defienden las plataformas',
    ],
    correcta: 0,
    explicacion: 'El autor concede que el argumento "suena razonable" y luego lo refuta por la asimetría de recursos. No descalifica a las personas que lo sostienen ni lo declara falso.',
  },
  {
    id: 'lec-007', tema: 'proposito-tono', dificultad: 2, lectura: 'lec-t2',
    enunciado: 'El tono del texto se describe mejor como:',
    opciones: ['Crítico y razonado', 'Nostálgico', 'Neutral y descriptivo', 'Humorístico'],
    correcta: 0,
    explicacion: 'El autor toma partido con claridad y argumenta, pero sin insultos ni exageraciones; concede puntos al adversario antes de responder.',
  },
  {
    id: 'lec-008', tema: 'estructura', dificultad: 3, lectura: 'lec-t2',
    enunciado: '¿Qué función cumple la frase final sobre el martillo?',
    opciones: [
      'Cerrar con una comparación que resume la tesis sobre la neutralidad de las herramientas',
      'Introducir un tema nuevo para un texto posterior',
      'Suavizar la crítica con una broma',
      'Citar la opinión de un experto',
    ],
    correcta: 0,
    explicacion: 'El martillo funciona como contraejemplo de herramienta verdaderamente neutral y condensa en una línea el argumento de todo el texto.',
  },

  // ----- Texto 3: narrativo -----
  {
    id: 'lec-009', tema: 'inferencias', dificultad: 3, lectura: 'lec-t3',
    enunciado: '¿Por qué la abuela vendió la casa sin avisar a la familia?',
    opciones: [
      'Porque sabía que se lo iban a impedir o a discutir',
      'Porque necesitaba el dinero con urgencia',
      'Porque estaba enojada con sus hijos',
      'Porque el comprador le exigió discreción',
    ],
    correcta: 0,
    explicacion: 'La última frase lo dice de forma indirecta: "no nos había pedido permiso porque sabía perfectamente lo que le íbamos a decir".',
  },
  {
    id: 'lec-010', tema: 'detalles', dificultad: 2, lectura: 'lec-t3',
    enunciado: '¿Qué detalle muestra que a la abuela sí le dolía dejar la casa?',
    opciones: [
      'Que no volvió a mirar hacia el patio en toda la tarde',
      'Que llevó una silla de plástico',
      'Que dijo que la casa era muy grande para ella',
      'Que esperaba sentada con el bolso sobre las rodillas',
    ],
    correcta: 0,
    explicacion: 'Evitar mirar el patio, incluso cuando mencionan el limonero, delata lo que la abuela no dice en voz alta. Su frase sobre el tamaño de la casa es precisamente la explicación que da para no hablar del asunto.',
  },
  {
    id: 'lec-011', tema: 'proposito-tono', dificultad: 2, lectura: 'lec-t3',
    enunciado: '¿Qué actitud tiene el narrador adulto hacia lo que pasó aquel domingo?',
    opciones: [
      'Comprende tardíamente algo que de niño no supo preguntar',
      'Reprocha a su abuela la decisión que tomó',
      'Se burla de las cuentas que hacía su madre',
      'Recuerda el episodio con indiferencia',
    ],
    correcta: 0,
    explicacion: 'El narrador dice "años después entendí" y "tampoco supe preguntarlo": hay comprensión retrospectiva, no reproche.',
  },
  {
    id: 'lec-012', tema: 'estructura', dificultad: 3, lectura: 'lec-t3',
    enunciado: '¿Qué aporta la frase "nadie preguntó lo otro"?',
    opciones: [
      'Marca el contraste entre las preocupaciones prácticas de la familia y lo que la abuela sentía',
      'Indica que la familia desconocía el precio de la casa',
      'Revela que había un secreto sobre la herencia',
      'Anuncia que el narrador preguntará más adelante',
    ],
    correcta: 0,
    explicacion: 'Está justo después de las cuentas de la madre y la pregunta del tío por los muebles: señala que todos hablaron de dinero y nadie de la pérdida.',
  },

  // ----- Texto 4: renovables -----
  {
    id: 'lec-013', tema: 'idea-principal', dificultad: 2, lectura: 'lec-t4',
    enunciado: '¿Cuál es el planteamiento central del texto?',
    opciones: [
      'El reto actual de las renovables es el almacenamiento, no el costo de generación',
      'La energía solar todavía es más cara que el carbón',
      'Hay que dejar de instalar paneles solares',
      'El consumo eléctrico de las ciudades es imposible de predecir',
    ],
    correcta: 0,
    explicacion: 'El texto afirma que en costo "la batalla ya está ganada" y dedica el resto a explicar el problema de guardar la energía.',
  },
  {
    id: 'lec-014', tema: 'datos-texto', dificultad: 2, lectura: 'lec-t4',
    enunciado: 'Según el texto, ¿qué afirma el dato de la caída del 85 % en el costo de la electricidad solar?',
    opciones: [
      'Que generar electricidad solar hoy cuesta mucho menos que hace diez años',
      'Que el 85 % de la electricidad mundial ya es solar',
      'Que las plantas solares costaron 85 % menos que las de carbón',
      'Que el consumo eléctrico bajó un 85 %',
    ],
    correcta: 0,
    explicacion: 'El dato se refiere a la caída del costo de generación en la última década, no a la participación en la matriz ni al consumo.',
    pista: 'Vuelve al texto y fíjate exactamente de qué es ese porcentaje.',
  },
  {
    id: 'lec-015', tema: 'inferencias', dificultad: 3, lectura: 'lec-t4',
    enunciado: 'Del ejemplo del sistema con 40 % renovable frente al de 25 % se deduce que:',
    opciones: [
      'Un porcentaje alto de renovables no garantiza por sí solo un servicio confiable',
      'Conviene no pasar del 25 % de generación renovable',
      'Las baterías son más importantes que los paneles',
      'Los sistemas con carbón son siempre más confiables',
    ],
    correcta: 0,
    explicacion: 'El ejemplo muestra que la confiabilidad depende del respaldo, no solo del porcentaje instalado. El texto dice que el almacenamiento importa "tanto como" los paneles, no más.',
  },
  {
    id: 'lec-016', tema: 'vocabulario-contexto', dificultad: 2, lectura: 'lec-t4',
    enunciado: 'En "quien celebre solo la cifra de capacidad instalada está mirando la mitad del tablero", la expresión mirando la mitad del tablero significa:',
    opciones: [
      'Tener en cuenta solo una parte del problema',
      'Equivocarse en la mitad de los cálculos',
      'Observar el juego sin participar',
      'Confundir generación con consumo',
    ],
    correcta: 0,
    explicacion: 'La metáfora del tablero sugiere una visión incompleta de la situación: falta el lado del almacenamiento y la entrega.',
  },

  // ----- Texto 5: celulares -----
  {
    id: 'lec-017', tema: 'argumentacion', dificultad: 2, lectura: 'lec-t5',
    enunciado: '¿Cuál es el argumento principal de los profesores que impulsaron la prohibición?',
    opciones: [
      'Un resultado observado: más participación y menos tareas incompletas donde se recogen los teléfonos',
      'Que los celulares son caros y generan envidia entre estudiantes',
      'Que los padres interrumpen las clases con llamadas',
      'Que la tecnología no sirve para aprender',
    ],
    correcta: 0,
    explicacion: 'El texto presenta ese dato como "un hecho concreto" observado en las clases donde ya se aplica la medida.',
  },
  {
    id: 'lec-018', tema: 'argumentacion', dificultad: 3, lectura: 'lec-t5',
    enunciado: 'El argumento "en mis tiempos no había celulares y nadie se murió" falla porque:',
    opciones: [
      'Apela a cómo eran las cosas antes sin dar razones sobre la decisión actual',
      'Es una afirmación falsa sobre el pasado',
      'Ofende a los profesores del colegio',
      'Confunde causa con consecuencia',
    ],
    correcta: 0,
    explicacion: 'El propio texto lo explica: la frase puede ser cierta y aun así no decir nada sobre qué conviene hacer hoy. Es una apelación a la tradición.',
  },
  {
    id: 'lec-019', tema: 'estructura', dificultad: 2, lectura: 'lec-t5',
    enunciado: '¿Cómo está organizado el texto?',
    opciones: [
      'Presenta la medida, expone las posturas a favor y en contra, examina un argumento débil y cierra con la decisión de revisar los datos',
      'Narra en orden cronológico lo que pasó en el colegio durante el semestre',
      'Defiende desde el principio la prohibición y responde a las objeciones',
      'Compara dos colegios con reglas distintas',
    ],
    correcta: 0,
    explicacion: 'Cada párrafo cumple una de esas funciones, en ese orden.',
  },
  {
    id: 'lec-020', tema: 'proposito-tono', dificultad: 3, lectura: 'lec-t5',
    enunciado: '¿Cuál es la postura del autor del texto?',
    opciones: [
      'No toma partido entre prohibir o no, pero valora que la decisión se evalúe con datos',
      'Está a favor de la prohibición sin reservas',
      'Está en contra de la prohibición',
      'Considera que el debate no tiene ninguna importancia',
    ],
    correcta: 0,
    explicacion: 'La única valoración explícita del autor es la última frase: llama "lo más sensato" a revisar la medida con datos.',
  },

  // ----- Texto 6: cacao -----
  {
    id: 'lec-021', tema: 'detalles', dificultad: 1, lectura: 'lec-t6',
    enunciado: 'Según el texto, ¿cómo tomaban el cacao los mexicas?',
    opciones: [
      'Molido con agua, chile y flores, batido hasta hacer espuma',
      'Caliente y endulzado con azúcar',
      'En polvo fino mezclado con leche',
      'En barras sólidas, como dulce',
    ],
    correcta: 0,
    explicacion: 'Está en el primer párrafo. El azúcar y el polvo fino llegaron después, en Europa.',
  },
  {
    id: 'lec-022', tema: 'estructura', dificultad: 2, lectura: 'lec-t6',
    enunciado: 'El texto está organizado principalmente como:',
    opciones: [
      'Una secuencia cronológica de transformaciones',
      'Una comparación entre dos culturas',
      'Una lista de causas de un mismo efecto',
      'Un problema seguido de su solución',
    ],
    correcta: 0,
    explicacion: 'Va del uso mexica al traslado a Europa y de ahí a la prensa del siglo XIX, en orden temporal, como resume la última frase.',
  },
  {
    id: 'lec-023', tema: 'inferencias', dificultad: 2, lectura: 'lec-t6',
    enunciado: 'Del dato de que un conejo costaba unos treinta granos se puede concluir que:',
    opciones: [
      'Los granos de cacao funcionaban como dinero con precios establecidos',
      'Los conejos eran un alimento de lujo',
      'El cacao era muy barato en esa época',
      'Los mexicas preferían el trueque al dinero',
    ],
    correcta: 0,
    explicacion: 'Que existan precios expresados en granos indica un uso monetario, que es justo lo que el párrafo afirma.',
  },
  {
    id: 'lec-024', tema: 'idea-principal', dificultad: 3, lectura: 'lec-t6',
    enunciado: '¿Cuál sería el mejor título alternativo para el texto?',
    opciones: [
      'Tres transformaciones que convirtieron una bebida amarga en chocolate',
      'La bebida sagrada de los mexicas',
      'El azúcar del Caribe y la corte española',
      'Cómo funciona una prensa de cacao',
    ],
    correcta: 0,
    explicacion: 'Las otras opciones nombran partes del texto; solo la primera cubre el recorrido completo que el propio texto resume al final.',
  },

  // ----- Texto 7: carta -----
  {
    id: 'lec-025', tema: 'proposito-tono', dificultad: 2, lectura: 'lec-t7',
    enunciado: '¿Cuál es el propósito principal de la carta?',
    opciones: [
      'Señalar lo que el reportaje omitió y pedir un periodismo que pregunte a quién beneficia una cifra',
      'Protestar por la compra de buses eléctricos',
      'Solicitar que se aumente la frecuencia de la ruta 14',
      'Felicitar al periódico por su reportaje',
    ],
    correcta: 0,
    explicacion: 'La felicitación inicial es una cortesía; el cuerpo y el cierre de la carta piden explícitamente que se pregunte a quién le tocó el avance.',
  },
  {
    id: 'lec-026', tema: 'proposito-tono', dificultad: 2, lectura: 'lec-t7',
    enunciado: 'El tono de la autora es:',
    opciones: ['Respetuoso pero firme', 'Agresivo', 'Irónico y burlón', 'Indiferente'],
    correcta: 0,
    explicacion: 'Reconoce lo bueno del reportaje, aclara que no pide dejar de informar y al mismo tiempo mantiene su crítica sin descalificar a nadie.',
  },
  {
    id: 'lec-027', tema: 'detalles', dificultad: 1, lectura: 'lec-t7',
    enunciado: 'Según la carta, ¿qué ocurre en los barrios del suroriente?',
    opciones: [
      'La frecuencia sigue siendo de un bus cada cuarenta minutos en hora pico',
      'No llegan los buses eléctricos porque las calles están sin pavimentar',
      'Las emisiones aumentaron tras la renovación de la flota',
      'La ruta 14 fue eliminada del sistema',
    ],
    correcta: 0,
    explicacion: 'Es el dato concreto que la autora aporta desde su experiencia como usuaria.',
  },
  {
    id: 'lec-028', tema: 'argumentacion', dificultad: 3, lectura: 'lec-t7',
    enunciado: '¿Qué quiere decir la autora con que un periódico que solo repite el comunicado "nos deja peor informados que uno que no publica nada"?',
    opciones: [
      'Que la información incompleta produce una falsa sensación de estar informado',
      'Que los periódicos deberían dejar de publicar cifras oficiales',
      'Que los comunicados de la alcaldía contienen datos falsos',
      'Que es mejor no leer noticias sobre transporte',
    ],
    correcta: 0,
    explicacion: 'Ella misma lo explica: "nos deja convencidos de que ya sabemos". El problema no es que el dato sea falso, sino que sea parcial.',
  },

  // ----- Texto 8: sueño -----
  {
    id: 'lec-029', tema: 'idea-principal', dificultad: 2, lectura: 'lec-t8',
    enunciado: '¿Cuál es la idea principal del texto?',
    opciones: [
      'El sueño participa activamente en la consolidación de la memoria, y eso se demuestra con experimentos, no con encuestas',
      'Los estudiantes deberían dormir ocho horas antes de un examen',
      'Las encuestas escolares no sirven para nada',
      'El cerebro descansa mientras dormimos',
    ],
    correcta: 0,
    explicacion: 'El texto combina las dos cosas: qué hace el sueño con la memoria y por qué la evidencia buena viene de experimentos controlados. La última frase lo sintetiza.',
  },
  {
    id: 'lec-030', tema: 'datos-texto', dificultad: 3, lectura: 'lec-t8',
    enunciado: 'Según el texto, ¿por qué la relación entre dormir más y sacar mejores notas en las encuestas no demuestra que dormir mejore el rendimiento?',
    opciones: [
      'Porque la relación podría ir en el sentido contrario o deberse a un tercer factor',
      'Porque las encuestas escolares siempre tienen errores de medición',
      'Porque los estudiantes mienten sobre cuánto duermen',
      'Porque el número de estudiantes encuestados es pequeño',
    ],
    correcta: 0,
    explicacion: 'El texto propone las dos alternativas: que las buenas notas permitan dormir más, o que un tercer factor como la organización del hogar explique ambas cosas.',
    pista: 'Que dos cosas vayan juntas no dice cuál causa cuál.',
  },
  {
    id: 'lec-031', tema: 'inferencias', dificultad: 2, lectura: 'lec-t8',
    enunciado: '¿Por qué el experimento de la lista de palabras sí permite concluir algo que la encuesta no?',
    opciones: [
      'Porque los dos grupos estudian lo mismo y solo se diferencian en si durmieron',
      'Porque participan más estudiantes',
      'Porque se repitió muchas veces a lo largo de los años',
      'Porque mide las notas del curso completo',
    ],
    correcta: 0,
    explicacion: 'Al mantener todo igual excepto el sueño, la diferencia en el recuerdo se puede atribuir al sueño. Esa es la ventaja del experimento controlado.',
  },
  {
    id: 'lec-032', tema: 'vocabulario-contexto', dificultad: 2, lectura: 'lec-t8',
    enunciado: 'En el texto, la palabra consolida (en "el sueño consolida la memoria") significa:',
    opciones: [
      'Hace más estable y duradero lo aprendido',
      'Resume la información para ocupar menos espacio',
      'Une recuerdos distintos en uno solo',
      'Borra los recuerdos poco usados',
    ],
    correcta: 0,
    explicacion: 'El primer párrafo describe el proceso: el cerebro traslada lo aprendido "a redes de almacenamiento más estables".',
  },
  {
    id: 'lec-033', tema: 'datos-texto', dificultad: 3, lectura: 'lec-t4',
    enunciado: 'El texto señala que el consumo eléctrico de una ciudad tiene su pico entre las seis y las diez de la noche. ¿Qué implica ese dato para una red que dependa de energía solar?',
    opciones: [
      'Que la demanda máxima ocurre justo cuando los paneles han dejado de producir',
      'Que conviene instalar más paneles para cubrir esas horas',
      'Que el consumo nocturno es menor que el del mediodía',
      'Que las ciudades deberían consumir menos electricidad de noche',
    ],
    correcta: 0,
    explicacion: 'El texto usa ese dato justo para eso: el desfase entre la hora en que se produce y la hora en que se consume. Añadir paneles no resuelve nada a las ocho de la noche, que es la razón por la que el almacenamiento importa.',
  },
  {
    id: 'lec-034', tema: 'datos-texto', dificultad: 2, lectura: 'lec-t6',
    enunciado: 'Según los precios que da el texto, ¿a cuántas cargas de leña equivalía un conejo?',
    opciones: ['Seis', 'Cinco', 'Treinta', 'Tres'],
    correcta: 0,
    explicacion: 'El conejo costaba unos treinta granos y la carga de leña unos cinco: 30 ÷ 5 = 6 cargas de leña por conejo.',
    pista: 'Los dos precios están en la misma unidad, así que se pueden dividir.',
  },
];
