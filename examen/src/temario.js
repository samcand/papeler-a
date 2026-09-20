/**
 * temario.js — Qué se pregunta en cada asignatura.
 *
 * Es el mapa del examen: cinco asignaturas, y dentro de cada una los temas que
 * aparecen una y otra vez en las pruebas de ingreso, con lo que hay que saber
 * hacer en cada uno. Todas las preguntas del banco apuntan a un `tema` de aquí
 * (hay una prueba que lo verifica), así que el temario y el banco no se separan.
 */

export const ASIGNATURAS = [
  {
    id: 'matematicas',
    nombre: 'Matemáticas',
    icono: '∑',
    resumen: 'Aritmética, álgebra, geometría, estadística y problemas de aplicación.',
    temas: [
      { id: 'aritmetica', nombre: 'Números y operaciones', claves: [
        'Jerarquía de operaciones y signos de agrupación',
        'Divisibilidad, mcd y mcm',
        'Números enteros, orden y valor absoluto',
      ] },
      { id: 'fracciones', nombre: 'Fracciones, decimales y notación científica', claves: [
        'Sumar, restar, multiplicar y dividir fracciones',
        'Fracción de una fracción y partes que quedan',
        'Mover la coma: potencias de 10 y notación científica',
      ] },
      { id: 'razones', nombre: 'Razones, proporciones y regla de tres', claves: [
        'Repartir una cantidad en una razón dada',
        'Proporción directa e inversa (obreros, velocidad, escalas)',
        'Escalas de mapas y planos',
      ] },
      { id: 'porcentajes', nombre: 'Porcentajes, descuentos e interés', claves: [
        'Porcentaje de una cantidad y cantidad a partir del porcentaje',
        'Aumentos y descuentos sucesivos (no se suman)',
        'Interés simple y compuesto',
      ] },
      { id: 'potencias', nombre: 'Potencias, raíces y radicales', claves: [
        'Leyes de los exponentes, incluidos negativos y fraccionarios',
        'Simplificar y racionalizar radicales',
        'Operar con expresiones con letras',
      ] },
      { id: 'logaritmos', nombre: 'Logaritmos y exponenciales', claves: [
        'Definición: log_b x = y equivale a b^y = x',
        'Propiedades del producto, cociente y potencia',
        'Ecuaciones exponenciales con bases iguales',
      ] },
      { id: 'algebra', nombre: 'Expresiones algebraicas y factorización', claves: [
        'Productos notables',
        'Factorizar trinomios y diferencia de cuadrados',
        'Simplificar fracciones algebraicas',
      ] },
      { id: 'ecuaciones', nombre: 'Ecuaciones lineales y sistemas', claves: [
        'Despejar con paréntesis y denominadores',
        'Sistemas 2x2 por sustitución, igualación o reducción',
        'Plantear la ecuación a partir del enunciado',
      ] },
      { id: 'cuadraticas', nombre: 'Ecuación cuadrática', claves: [
        'Factorización y fórmula general',
        'Discriminante: cuántas raíces reales hay',
        'Suma y producto de raíces',
      ] },
      { id: 'desigualdades', nombre: 'Desigualdades, valor absoluto e intervalos', claves: [
        'Al multiplicar por un negativo se voltea el signo',
        'Desigualdades con valor absoluto',
        'Escribir la solución como intervalo',
      ] },
      { id: 'funciones', nombre: 'Funciones y gráficas', claves: [
        'Evaluar, dominio y rango',
        'Composición de funciones y función inversa',
        'Leer una gráfica: cortes, crecimiento y vértice',
      ] },
      { id: 'sucesiones', nombre: 'Sucesiones y progresiones', claves: [
        'Progresión aritmética: término general y suma',
        'Progresión geométrica: término general y suma',
        'Descubrir el patrón de una sucesión',
      ] },
      { id: 'geometria-plana', nombre: 'Geometría plana', claves: [
        'Ángulos entre paralelas y en polígonos',
        'Perímetro y área de triángulos, cuadriláteros y círculos',
        'Teorema de Pitágoras y semejanza',
      ] },
      { id: 'geometria-espacio', nombre: 'Cuerpos: área y volumen', claves: [
        'Prisma, cilindro, cono, pirámide y esfera',
        'Qué pasa con el volumen si cambian las medidas',
        'Área total y área lateral',
      ] },
      { id: 'geometria-analitica', nombre: 'Geometría analítica', claves: [
        'Distancia, punto medio y pendiente',
        'Ecuación de la recta; paralelas y perpendiculares',
        'Circunferencia: centro y radio',
      ] },
      { id: 'estadistica', nombre: 'Estadística descriptiva', claves: [
        'Media, mediana, moda y rango',
        'Media ponderada y efecto de agregar o quitar datos',
        'Leer tablas y gráficos de barras o circulares',
      ] },
      { id: 'probabilidad', nombre: 'Conteo y probabilidad', claves: [
        'Principio multiplicativo, permutaciones y combinaciones',
        'Probabilidad simple, con y sin reemplazo',
        'Eventos independientes y complementarios',
      ] },
      { id: 'problemas', nombre: 'Problemas de aplicación', claves: [
        'Mezclas y aleaciones',
        'Móviles: encuentro y alcance',
        'Trabajo conjunto y problemas de edades',
      ] },
    ],
  },

  {
    id: 'trigonometria',
    nombre: 'Trigonometría',
    icono: '△',
    resumen: 'Del triángulo rectángulo a las identidades, ecuaciones y leyes de senos y cosenos.',
    temas: [
      { id: 'angulos', nombre: 'Ángulos, grados y radianes', claves: [
        'Convertir grados a radianes y al revés',
        'Ángulos coterminales y de referencia',
        'Longitud de arco y área de sector',
      ] },
      { id: 'triangulo-rectangulo', nombre: 'Razones en el triángulo rectángulo', claves: [
        'seno, coseno, tangente y sus recíprocas',
        'Dada una razón, hallar las demás con Pitágoras',
        'Resolver el triángulo rectángulo completo',
      ] },
      { id: 'notables', nombre: 'Ángulos notables', claves: [
        'Valores exactos de 30°, 45°, 60°, 90°',
        'Operar sin calculadora con esos valores',
        'Los dos triángulos que hay que recordar',
      ] },
      { id: 'circunferencia', nombre: 'Circunferencia unitaria y cuadrantes', claves: [
        'Signo de cada razón por cuadrante',
        'Reducir un ángulo al primer cuadrante',
        'Razones de ángulos mayores de 90° o negativos',
      ] },
      { id: 'identidades', nombre: 'Identidades fundamentales', claves: [
        'sen²x + cos²x = 1 y sus derivadas',
        'Pasar todo a senos y cosenos para simplificar',
        'Demostrar o verificar una identidad',
      ] },
      { id: 'suma-angulos', nombre: 'Suma, resta y ángulo doble', claves: [
        'sen(A±B), cos(A±B), tan(A±B)',
        'Ángulo doble y ángulo mitad',
        'Valores exactos de 15°, 75°, 105°',
      ] },
      { id: 'ecuaciones-trig', nombre: 'Ecuaciones trigonométricas', claves: [
        'Todas las soluciones en un intervalo dado',
        'Ecuaciones que se vuelven cuadráticas',
        'Cuidado con las soluciones que se pierden al dividir',
      ] },
      { id: 'graficas-trig', nombre: 'Gráficas: amplitud, periodo y desfase', claves: [
        'y = A sen(Bx + C) + D pieza por pieza',
        'Periodo de seno, coseno y tangente',
        'Rango y desplazamiento vertical',
      ] },
      { id: 'leyes', nombre: 'Ley de senos y ley de cosenos', claves: [
        'Cuándo usar cada una según los datos',
        'Área del triángulo con dos lados y el ángulo entre ellos',
        'Caso ambiguo del lado-lado-ángulo',
      ] },
      { id: 'aplicaciones', nombre: 'Aplicaciones', claves: [
        'Ángulos de elevación y depresión',
        'Alturas, distancias y escaleras',
        'Rumbos y navegación',
      ] },
    ],
  },

  {
    id: 'abstracto',
    nombre: 'Razonamiento abstracto',
    icono: '◪',
    resumen: 'Encontrar la regla: series de figuras, matrices, series numéricas, analogías y lógica.',
    temas: [
      { id: 'series-figuras', nombre: 'Series de figuras', claves: [
        'Qué cambia y qué se mantiene de una figura a la siguiente',
        'Cambios combinados: lados, relleno, giro y puntos',
        'Descartar opciones por un solo atributo a la vez',
      ] },
      { id: 'matrices', nombre: 'Matrices y analogías figurales', claves: [
        'Leer la matriz por filas y por columnas',
        'Analogía "A es a B como C es a ?"',
        'Sumar, restar o superponer elementos',
      ] },
      { id: 'diferente', nombre: 'El que no pertenece', claves: [
        'Buscar el criterio que comparten tres de cuatro',
        'Contar lados, ejes de simetría y elementos',
        'No quedarse con el primer criterio que aparece',
      ] },
      { id: 'rotacion', nombre: 'Rotación y simetría', claves: [
        'Distinguir giro de reflexión',
        'Giros de 45°, 90° y 180°',
        'Figuras que quedan igual al girarlas',
      ] },
      { id: 'plegado', nombre: 'Plegado, cubos y vistas', claves: [
        'Caras opuestas en el desarrollo de un cubo',
        'Perforaciones sobre papel doblado',
        'Vistas desde arriba, de frente y de lado',
      ] },
      { id: 'series-numericas', nombre: 'Series numéricas', claves: [
        'Diferencias sucesivas y segundas diferencias',
        'Factores, cuadrados, cubos y factoriales',
        'Series alternadas o con dos series entrelazadas',
      ] },
      { id: 'series-alfanumericas', nombre: 'Series de letras y alfanuméricas', claves: [
        'Posición de cada letra en el alfabeto',
        'Saltos crecientes y recorridos hacia atrás',
        'Combinaciones de letra con número',
      ] },
      { id: 'logica', nombre: 'Lógica, silogismos y ordenamientos', claves: [
        'Qué se concluye de verdad y qué no',
        'Negar correctamente "todos", "algunos" y "ninguno"',
        'Ordenar personas u objetos con pistas',
        'Conjuntos: diagramas de Venn con tres grupos',
      ] },
      { id: 'analogias', nombre: 'Analogías y relaciones', claves: [
        'Nombrar la relación antes de mirar las opciones',
        'Parte-todo, causa-efecto, instrumento-función',
        'Mantener el mismo orden de la relación',
      ] },
    ],
  },

  {
    id: 'geografia',
    nombre: 'Geografía',
    icono: '🌎',
    resumen: 'La Tierra y su representación, el medio físico, la población, la economía, la política y el ambiente.',
    temas: [
      { id: 'cartografia', nombre: 'La Tierra y su representación', claves: [
        'Coordenadas: latitud, longitud y hemisferios',
        'Escala: calcular distancias reales y saber qué mapa da más detalle',
        'Proyecciones y sus deformaciones',
        'Curvas de nivel, simbología y sistemas de información geográfica',
      ] },
      { id: 'tierra-universo', nombre: 'La Tierra en el sistema solar', claves: [
        'Rotación y traslación: qué produce cada una',
        'Inclinación del eje, solsticios, equinoccios y zonas térmicas',
        'Husos horarios y cambio de fecha',
      ] },
      { id: 'geodinamica-interna', nombre: 'Tectónica, sismos y volcanes', claves: [
        'Capas de la Tierra y movimiento de placas',
        'Bordes convergentes, divergentes y de desplazamiento',
        'Magnitud e intensidad; epicentro e hipocentro',
        'Cinturón de Fuego y formación de los Andes',
      ] },
      { id: 'relieve', nombre: 'Relieve y modelado externo', claves: [
        'Meteorización, erosión, transporte y sedimentación',
        'Formas del relieve y el agente que las crea',
        'Tipos de rocas y horizontes del suelo',
        'Relación entre relieve, población y actividades económicas',
      ] },
      { id: 'hidrografia', nombre: 'Aguas continentales y oceánicas', claves: [
        'Ciclo del agua y distribución del agua dulce',
        'Cuenca hidrográfica, afluentes y desembocaduras',
        'Corrientes marinas y su efecto en el clima',
        'El Niño y La Niña; acuíferos y escasez de agua',
      ] },
      { id: 'clima', nombre: 'Tiempo, clima y atmósfera', claves: [
        'Diferencia entre tiempo y clima',
        'Elementos y factores del clima',
        'Capas de la atmósfera, ozono y efecto invernadero',
        'Tipos de clima, huracanes y sombra de lluvia',
      ] },
      { id: 'biogeografia', nombre: 'Regiones naturales y biodiversidad', claves: [
        'Biomas del mundo y su relación con el clima',
        'Selva, sabana, desierto, bosque templado, taiga y tundra',
        'Pisos térmicos y páramos andinos',
        'Países megadiversos',
      ] },
      { id: 'poblacion', nombre: 'Geografía de la población', claves: [
        'Densidad, natalidad, mortalidad y crecimiento natural',
        'Transición demográfica y lectura de pirámides de población',
        'Migraciones: causas, saldo migratorio y éxodo rural',
        'Urbanización y esperanza de vida',
      ] },
      { id: 'economica', nombre: 'Geografía económica', claves: [
        'Sectores económicos y recursos renovables y no renovables',
        'PIB per cápita, IDH y qué mide cada uno',
        'Dependencia de materias primas y balanza comercial',
        'Globalización y deslocalización industrial',
      ] },
      { id: 'politica', nombre: 'Geografía política y geopolítica', claves: [
        'Elementos del Estado, fronteras y soberanía',
        'Mar territorial y zona económica exclusiva',
        'Organismos y bloques: ONU, Mercosur, CAN, UE',
        'Pasos estratégicos y países sin litoral',
      ] },
      { id: 'ambiente', nombre: 'Medio ambiente, riesgos y sostenibilidad', claves: [
        'Cambio climático: causas y consecuencias',
        'Deforestación, lluvia ácida y huella ecológica',
        'Riesgo = amenaza × vulnerabilidad',
        'Desarrollo sostenible y acuerdos internacionales',
      ] },
      { id: 'america-latina', nombre: 'Geografía de América Latina', claves: [
        'Grandes unidades de relieve: Andes, Amazonia, altiplanos, Patagonia',
        'Principales cuencas: Amazonas, Plata, Orinoco',
        'Distribución de la población y grandes ciudades',
        'Rasgos físicos que explican climas extremos de la región',
      ] },
    ],
  },
  {
    id: 'ciudadania',
    nombre: 'Política y ciudadanía',
    icono: '⚖️',
    resumen: 'Cómo está organizado el Estado, qué dice la Constitución, qué derechos hay y cómo se ejercen.',
    temas: [
      { id: 'estado-poderes', nombre: 'El Estado y las ramas del poder', claves: [
        'Funciones del ejecutivo, el legislativo y el judicial',
        'Frenos y contrapesos: quién controla a quién',
        'Estado y gobierno no son lo mismo',
        'Centralización y descentralización',
      ] },
      { id: 'constitucion', nombre: 'Constitución y jerarquía de las normas', claves: [
        'Supremacía constitucional y control de constitucionalidad',
        'Constitución, ley, decreto y reglamento',
        'Parte dogmática y parte orgánica',
        'Garantías penales: presunción de inocencia, irretroactividad, cosa juzgada',
      ] },
      { id: 'derechos', nombre: 'Derechos humanos y su protección', claves: [
        'Características: universales, inalienables e indivisibles',
        'Generaciones de derechos',
        'Mecanismos: tutela o amparo, habeas corpus, habeas data',
        'Límites de los derechos y deberes correlativos',
      ] },
      { id: 'democracia', nombre: 'Democracia y participación', claves: [
        'Democracia directa y representativa',
        'Sufragio universal, libre y secreto',
        'Referendo, plebiscito, revocatoria e iniciativa popular',
        'Mayorías, minorías y abstención',
      ] },
      { id: 'sistemas-politicos', nombre: 'Formas de gobierno y sistemas políticos', claves: [
        'República y monarquía; presidencialismo y parlamentarismo',
        'Estado laico, Estado de bienestar',
        'Rasgos del autoritarismo frente a la democracia',
        'Alternancia y tiranía de la mayoría',
      ] },
      { id: 'partidos-elecciones', nombre: 'Partidos, elecciones y opinión pública', claves: [
        'Sistemas mayoritarios y proporcionales; umbral electoral',
        'Financiamiento de campañas y su regulación',
        'Leer encuestas: muestra y margen de error',
        'Voto en blanco, voto nulo y observación electoral',
      ] },
      { id: 'economia-politica', nombre: 'Estado, economía y políticas públicas', claves: [
        'Para qué sirven los impuestos; progresivo y regresivo',
        'Presupuesto público y déficit fiscal',
        'Inflación y poder adquisitivo; cifras nominales y reales',
        'Bienes públicos, subsidios y banco central',
      ] },
      { id: 'convivencia', nombre: 'Convivencia y resolución de conflictos', claves: [
        'Conflicto no es lo mismo que violencia',
        'Mediación, conciliación y arbitraje',
        'Discriminación, estereotipo y prejuicio',
        'Acoso escolar y papel de los espectadores',
      ] },
      { id: 'organismos', nombre: 'Organismos internacionales', claves: [
        'ONU: Asamblea General, Consejo de Seguridad y veto',
        'OMS, UNESCO, OEA y sistema interamericano',
        'Corte Penal Internacional y derecho internacional humanitario',
        'Tratados, ratificación y estatuto de refugiado',
      ] },
      { id: 'etica-publica', nombre: 'Ética pública y transparencia', claves: [
        'Corrupción y conflicto de interés',
        'Acceso a la información y rendición de cuentas',
        'Contratación pública y veedurías ciudadanas',
        'Clientelismo y protección al denunciante',
      ] },
    ],
  },

  {
    id: 'salud',
    nombre: 'Salud y biología humana',
    icono: '🩺',
    resumen: 'El cuerpo por dentro, la genética básica y lo que hay que saber para cuidarse y para una emergencia.',
    temas: [
      { id: 'cuerpo-sistemas', nombre: 'Sistemas del cuerpo humano', claves: [
        'Circulatorio, respiratorio y digestivo: qué hace cada uno',
        'Riñones, hígado y páncreas',
        'Sistema nervioso central y periférico',
        'Componentes de la sangre y sus funciones',
      ] },
      { id: 'celula-genetica', nombre: 'Célula, herencia y genética', claves: [
        'Organelos y sus funciones',
        'Mitosis y meiosis; número de cromosomas',
        'Genotipo, fenotipo y cuadro de Punnett',
        'Mutaciones y variabilidad',
      ] },
      { id: 'nutricion', nombre: 'Nutrición y alimentación', claves: [
        'Macronutrientes, micronutrientes y fibra',
        'Índice de masa corporal y sus límites',
        'Leer una etiqueta nutricional y sus trampas',
        'Azúcares añadidos, anemia y doble carga de malnutrición',
      ] },
      { id: 'enfermedades-transmisibles', nombre: 'Enfermedades transmisibles', claves: [
        'Virus y bacterias; por qué los antibióticos no sirven para todo',
        'Resistencia antimicrobiana',
        'Vías de transmisión: aérea, vectorial, fecal-oral, sexual',
        'Periodo de incubación y portadores asintomáticos',
      ] },
      { id: 'enfermedades-cronicas', nombre: 'Enfermedades crónicas y factores de riesgo', claves: [
        'Diabetes, hipertensión, cáncer y riesgo cardiovascular',
        'Factores de riesgo modificables y no modificables',
        'Interpretar una cifra de presión arterial',
        'Tamizaje y adherencia al tratamiento',
      ] },
      { id: 'vacunas-salud-publica', nombre: 'Vacunas, prevención y salud pública', claves: [
        'Cómo funciona una vacuna e inmunidad de rebaño',
        'Endemia, epidemia y pandemia',
        'Letalidad y mortalidad: no son lo mismo',
        'Agua potable, saneamiento y vigilancia epidemiológica',
      ] },
      { id: 'salud-sexual', nombre: 'Salud sexual y reproductiva', claves: [
        'Aparato reproductor, ciclo menstrual y fecundación',
        'Infecciones de transmisión sexual; VIH y sida',
        'Métodos anticonceptivos y doble protección',
        'Consentimiento y embarazo adolescente',
      ] },
      { id: 'primeros-auxilios', nombre: 'Primeros auxilios y emergencias', claves: [
        'Proteger, avisar, socorrer',
        'Reanimación cardiopulmonar y atragantamiento',
        'Hemorragias, quemaduras y fracturas',
        'Qué NO hacer: mover, provocar el vómito, aplicar remedios caseros',
      ] },
      { id: 'salud-mental', nombre: 'Salud mental y adicciones', claves: [
        'Estrés agudo y crónico; ansiedad y depresión',
        'Sueño y rendimiento',
        'Alcohol y otras sustancias: tolerancia y dependencia',
        'Estigma, señales de alerta y a quién acudir',
      ] },
      { id: 'actividad-fisica', nombre: 'Actividad física y hábitos', claves: [
        'Recomendaciones de actividad y riesgos del sedentarismo',
        'Frecuencia cardiaca, calentamiento e hidratación',
        'Efectos cardiovasculares y sobre el ánimo',
        'Ergonomía frente a la pantalla y mitos frecuentes',
      ] },
    ],
  },

  {
    id: 'cotidiana',
    nombre: 'Vida cotidiana y cultura general',
    icono: '🧭',
    resumen: 'Usar lo que se sabe en situaciones reales: dinero, precios, trámites, dosis, estafas, noticias y seguridad.',
    temas: [
      { id: 'dinero', nombre: 'Dinero, presupuesto y deudas', claves: [
        'Presupuesto: ingresos, gastos fijos y ahorro',
        'Cuotas: cuánto suma el total frente al contado',
        'Interés simple y compuesto; pago mínimo de la tarjeta',
        'Riesgo y rentabilidad; cómo se reconoce una pirámide',
      ] },
      { id: 'compras-precios', nombre: 'Compras, precios y consumo', claves: [
        'Comparar precio por unidad',
        'Descuentos sucesivos y promociones tipo 3x2',
        'Garantía legal, factura y derecho de retracto',
        'Fecha de vencimiento y consumo preferente',
      ] },
      { id: 'documentos', nombre: 'Documentos, trámites y servicios', claves: [
        'Leer un contrato, un recibo y un comprobante de nómina',
        'Salario bruto y neto',
        'Reclamos por escrito y plazos en días hábiles',
        'Nunca firmar documentos en blanco',
      ] },
      { id: 'medidas', nombre: 'Medidas, dosis y conversiones', claves: [
        'Unidades de masa, volumen y tiempo',
        'Dosis por peso y duración de un tratamiento',
        'Regla de tres en recetas, viajes y materiales',
        'Proyectar un consumo con los datos que ya se tienen',
      ] },
      { id: 'tecnologia', nombre: 'Tecnología y seguridad digital', claves: [
        'Contraseñas y verificación en dos pasos',
        'Phishing, estafas por premio y códigos de un solo uso',
        'Redes públicas, permisos de aplicaciones y respaldos',
        'Huella digital y actualizaciones de seguridad',
      ] },
      { id: 'informacion', nombre: 'Evaluar información y noticias', claves: [
        'Buscar la fuente original; titular frente a contenido',
        'Correlación y causa; muestras no representativas',
        'Gráficos con eje truncado y porcentajes sobre bases pequeñas',
        'Sesgo de confirmación y fuentes primarias',
      ] },
      { id: 'seguridad', nombre: 'Seguridad vial y prevención', claves: [
        'Cinturón, casco y distancia de frenado',
        'Alcohol, celular y distracción al conducir',
        'Señales de tránsito y conducta del peatón',
        'Accidentes en casa, sismos y rutas de evacuación',
      ] },
      { id: 'ambiente-hogar', nombre: 'Consumo responsable en casa', claves: [
        'Separar residuos y jerarquía de las tres erres',
        'Residuos peligrosos: pilas y electrónicos',
        'Calcular el consumo eléctrico en kWh',
        'Agua, aceite usado y eficiencia energética',
      ] },
      { id: 'trabajo', nombre: 'Primer empleo y derechos laborales', claves: [
        'Qué debe decir un contrato; periodo de prueba',
        'Jornada, horas extra, vacaciones y aportes',
        'Hoja de vida y entrevista',
        'Informalidad, acoso laboral y ofertas fraudulentas',
      ] },
      { id: 'cultura-general', nombre: 'Cultura general', claves: [
        'Hitos de la historia moderna y contemporánea',
        'Ciencia y tecnología que cambiaron la sociedad',
        'Literatura y arte de referencia',
        'Independencias de América Latina',
      ] },
    ],
  },
  {
    id: 'lectura',
    nombre: 'Comprensión de lectura',
    icono: '📖',
    resumen: 'Leer un texto y responder: idea principal, inferencias, vocabulario, intención y argumentos.',
    temas: [
      { id: 'idea-principal', nombre: 'Idea principal y tema', claves: [
        'Distinguir el tema (de qué habla) de la idea principal (qué dice)',
        'Descartar opciones demasiado amplias o demasiado estrechas',
        'Un título que cubra todo el texto, no solo un párrafo',
      ] },
      { id: 'detalles', nombre: 'Detalles explícitos', claves: [
        'Volver al texto y señalar la línea exacta',
        'Cuidado con las opciones que cambian una palabra',
        'Datos, fechas y cifras',
      ] },
      { id: 'inferencias', nombre: 'Inferencias y conclusiones', claves: [
        'Lo que se deduce sin estar escrito',
        'No traer información de fuera del texto',
        'Distinguir inferencia de suposición',
      ] },
      { id: 'vocabulario-contexto', nombre: 'Vocabulario en contexto', claves: [
        'Sustituir la palabra y verificar que el sentido no cambie',
        'Palabras con varios significados',
        'Pistas de la oración anterior y la siguiente',
      ] },
      { id: 'proposito-tono', nombre: 'Propósito, intención y tono', claves: [
        'Informar, persuadir, narrar o criticar',
        'Tono: irónico, crítico, admirativo, neutral',
        'A quién le habla el autor',
      ] },
      { id: 'estructura', nombre: 'Estructura y organización', claves: [
        'Función de un párrafo dentro del texto',
        'Conectores y relaciones entre ideas',
        'Ejemplo, contraste, causa y consecuencia',
      ] },
      { id: 'argumentacion', nombre: 'Argumentación', claves: [
        'Separar tesis, argumento y ejemplo',
        'Qué dato debilita o refuerza una postura',
        'Falacias frecuentes y generalizaciones',
      ] },
      { id: 'datos-texto', nombre: 'Datos dentro del texto', claves: [
        'Interpretar cifras, porcentajes y comparaciones',
        'Qué se puede afirmar con los datos dados',
        'Diferencia entre correlación y causa',
      ] },
    ],
  },

  {
    id: 'ingles',
    nombre: 'Inglés',
    icono: 'EN',
    resumen: 'Gramática, vocabulario y lectura al nivel A2–B2 que piden las pruebas de admisión.',
    temas: [
      { id: 'tiempos-verbales', nombre: 'Verb tenses', claves: [
        'Present simple vs. present continuous',
        'Past simple vs. present perfect (for, since, ago, yet)',
        'Future: will, going to, present continuous',
      ] },
      { id: 'condicionales', nombre: 'Conditionals', claves: [
        'Zero, first, second and third conditional',
        'If / unless / as long as',
        'Wish y would rather',
      ] },
      { id: 'modales', nombre: 'Modal verbs', claves: [
        'Obligación, prohibición y ausencia de obligación',
        "Deducción: must be / can't be / might be",
        'Modales en pasado: should have, could have',
      ] },
      { id: 'voz-pasiva', nombre: 'Passive voice', claves: [
        'Pasar de activa a pasiva en cada tiempo',
        'Pasiva con by y sin agente',
        'Verbos con dos objetos',
      ] },
      { id: 'reported-speech', nombre: 'Reported speech', claves: [
        'Un paso atrás en el tiempo verbal',
        'Cambios de pronombres, tiempo y lugar',
        'Preguntas y órdenes reportadas',
      ] },
      { id: 'relativas', nombre: 'Relative clauses', claves: [
        'who, which, that, whose, where',
        'Defining vs. non-defining',
        'Cuándo se puede omitir el relativo',
      ] },
      { id: 'preposiciones', nombre: 'Prepositions', claves: [
        'in / on / at de tiempo y de lugar',
        'Verbos con preposición fija',
        'Adjetivos con preposición (interested in, afraid of)',
      ] },
      { id: 'cuantificadores', nombre: 'Articles and quantifiers', claves: [
        'a / an / the / sin artículo',
        'much, many, a few, a little, plenty of',
        'Contables e incontables',
      ] },
      { id: 'conectores', nombre: 'Linking words', claves: [
        'although, however, despite, in spite of',
        'so, such, therefore, because of',
        'Orden de la oración con cada conector',
      ] },
      { id: 'phrasal-verbs', nombre: 'Phrasal verbs', claves: [
        'Los más frecuentes en examen',
        'Significado que cambia con la partícula',
        'Separables y no separables',
      ] },
      { id: 'vocabulario', nombre: 'Vocabulary and word formation', claves: [
        'Prefijos y sufijos para formar palabras',
        'Collocations frecuentes',
        'Falsos amigos con el español',
      ] },
      { id: 'reading', nombre: 'Reading comprehension', claves: [
        'Idea general y detalle específico',
        'Inferir el significado de una palabra por contexto',
        'Verdadero, falso o no se dice',
      ] },
    ],
  },
];

export const MAPA_ASIGNATURAS = Object.fromEntries(ASIGNATURAS.map((a) => [a.id, a]));

export function asignatura(id) {
  return MAPA_ASIGNATURAS[id] || null;
}

export function tema(asignaturaId, temaId) {
  return asignatura(asignaturaId)?.temas.find((t) => t.id === temaId) || null;
}

export function nombreTema(asignaturaId, temaId) {
  return tema(asignaturaId, temaId)?.nombre || temaId;
}

export function nombreAsignatura(id) {
  return asignatura(id)?.nombre || id;
}

/** Todos los temas en una sola lista, útil para validar el banco. */
export function todosLosTemas() {
  return ASIGNATURAS.flatMap((a) => a.temas.map((t) => ({ asignatura: a.id, ...t })));
}

export const NIVELES = {
  1: 'Básico',
  2: 'Intermedio',
  3: 'Avanzado',
};
