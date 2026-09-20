/**
 * temario.js — Qué se pregunta en cada asignatura.
 *
 * Es el mapa del examen: dieciséis asignaturas, y dentro de cada una los temas que
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
    nombre: 'Biología y salud',
    icono: '🧬',
    resumen: 'El componente biológico completo: célula, genética, ecología, evolución e indagación, más el cuidado del cuerpo.',
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
      { id: 'ecologia', nombre: 'Ecología y ecosistemas', claves: [
        'Factores bióticos y abióticos; niveles de organización',
        'Cadenas tróficas y flujo de energía (la regla del 10 %)',
        'Relaciones entre especies: mutualismo, parasitismo, competencia',
        'Capacidad de carga y efectos en cascada',
      ] },
      { id: 'evolucion', nombre: 'Evolución', claves: [
        'Selección natural: la variación existe antes que la necesidad',
        'Darwin frente a Lamarck',
        'Evidencias: fósiles, homologías y ADN',
        'Especiación, deriva génica y resistencia a antibióticos',
      ] },
      { id: 'biodiversidad', nombre: 'Biodiversidad y clasificación', claves: [
        'Niveles de biodiversidad y especies endémicas',
        'Categorías taxonómicas y nombre científico',
        'Procariotas y eucariotas; el caso de los virus',
        'Fotosíntesis y servicios ecosistémicos',
      ] },
      { id: 'indagacion', nombre: 'Indagación y método científico', claves: [
        'Preguntas investigables e hipótesis falsables',
        'Variable independiente, dependiente y grupo control',
        'Cambiar una sola variable a la vez; repetir el experimento',
        'Leer una tabla de resultados sin extrapolar de más',
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
    id: 'fisica',
    nombre: 'Física',
    icono: '⚛',
    resumen: 'Del movimiento y las fuerzas a la energía, las ondas, el calor y la electricidad.',
    temas: [
      { id: 'magnitudes-medida', nombre: 'Magnitudes, unidades y vectores', claves: [
        'Unidades del SI y conversiones (km/h a m/s)',
        'Escalares y vectores; suma de vectores perpendiculares',
        'Notación científica y densidad',
        'Exactitud y precisión de una medida',
      ] },
      { id: 'cinematica', nombre: 'Cinemática', claves: [
        'Movimiento uniforme y uniformemente acelerado',
        'Caída libre',
        'Leer gráficas de posición-tiempo y velocidad-tiempo',
        'Distancia y desplazamiento no son lo mismo',
      ] },
      { id: 'dinamica', nombre: 'Fuerzas y leyes de Newton', claves: [
        'Inercia, F = ma y acción-reacción',
        'Masa y peso',
        'Fuerza neta, normal y rozamiento',
        'Explicar situaciones cotidianas con las tres leyes',
      ] },
      { id: 'trabajo-energia', nombre: 'Trabajo, energía y potencia', claves: [
        'Trabajo y cuándo vale cero',
        'Energía cinética y potencial; conservación',
        'Potencia y rendimiento',
        'La energía cinética depende del cuadrado de la velocidad',
      ] },
      { id: 'fluidos', nombre: 'Fluidos y presión', claves: [
        'Presión, principio de Pascal y prensa hidráulica',
        'Principio de Arquímedes y flotación',
        'Presión hidrostática y atmosférica',
        'Por qué el área cambia la presión',
      ] },
      { id: 'ondas', nombre: 'Ondas, sonido y luz', claves: [
        'v = λf, periodo y frecuencia',
        'Ondas mecánicas y electromagnéticas',
        'Reflexión, refracción y efecto Doppler',
        'Amplitud y frecuencia: volumen y tono',
      ] },
      { id: 'termodinamica', nombre: 'Calor y temperatura', claves: [
        'Calor no es lo mismo que temperatura; escala Kelvin',
        'Conducción, convección y radiación',
        'Dilatación y cambios de estado',
        'Calor específico y equilibrio térmico',
      ] },
      { id: 'electricidad', nombre: 'Electricidad y circuitos', claves: [
        'Carga, corriente, voltaje y resistencia',
        'Ley de Ohm y potencia eléctrica',
        'Circuitos en serie y en paralelo',
        'Consumo en kWh y elementos de protección',
      ] },
      { id: 'magnetismo', nombre: 'Magnetismo y electromagnetismo', claves: [
        'Polos magnéticos y campo terrestre',
        'Oersted: la corriente genera campo magnético',
        'Inducción, generadores y motores',
        'Electroimanes y transformadores',
      ] },
      { id: 'gravitacion', nombre: 'Gravitación', claves: [
        'Ley de gravitación universal e inverso del cuadrado',
        'Masa y peso en otros astros',
        'Satélites, órbitas e ingravidez aparente',
        'Caída libre independiente de la masa',
      ] },
    ],
  },

  {
    id: 'quimica',
    nombre: 'Química',
    icono: '⚗',
    resumen: 'De la estructura del átomo a las reacciones, las soluciones, el pH y la química del carbono.',
    temas: [
      { id: 'materia', nombre: 'La materia y sus cambios', claves: [
        'Sustancias puras y mezclas; homogéneas y heterogéneas',
        'Métodos de separación: filtración, destilación, decantación',
        'Cambios físicos y químicos',
        'Conservación de la masa; propiedades intensivas y extensivas',
      ] },
      { id: 'atomo', nombre: 'Estructura atómica', claves: [
        'Protones, neutrones y electrones',
        'Número atómico y número másico; isótopos',
        'Iones: cationes y aniones',
        'Modelos atómicos y el experimento de Rutherford',
      ] },
      { id: 'tabla-periodica', nombre: 'Tabla periódica', claves: [
        'Grupos y periodos: qué comparte cada uno',
        'Familias: alcalinos, halógenos y gases nobles',
        'Tendencias: electronegatividad y radio atómico',
        'Metales, no metales y metaloides; símbolos frecuentes',
      ] },
      { id: 'enlace', nombre: 'Enlace químico', claves: [
        'Iónico, covalente y metálico',
        'Regla del octeto y electrones de valencia',
        'Polaridad: por qué el agua disuelve lo que disuelve',
        'Puentes de hidrógeno',
      ] },
      { id: 'nomenclatura', nombre: 'Fórmulas y nomenclatura', claves: [
        'Leer una fórmula: subíndices y coeficientes',
        'Óxidos, ácidos, hidróxidos y sales',
        'Compuestos de uso frecuente y sus nombres',
        'Contar átomos en una fórmula',
      ] },
      { id: 'reacciones', nombre: 'Reacciones químicas', claves: [
        'Reactivos y productos; balanceo',
        'Tipos: síntesis, descomposición, sustitución, combustión',
        'Exotérmicas y endotérmicas; catalizadores',
        'Oxidación y reducción; evidencias de reacción',
      ] },
      { id: 'estequiometria', nombre: 'El mol y la estequiometría', claves: [
        'Número de Avogadro y masa molar',
        'Pasar de gramos a moles y al revés',
        'Relaciones molares en una ecuación balanceada',
        'Reactivo límite y rendimiento',
      ] },
      { id: 'soluciones', nombre: 'Soluciones y concentración', claves: [
        'Soluto y solvente; molaridad y porcentaje',
        'Dilución y solución saturada',
        'Solubilidad: sólidos y gases responden al revés',
        'Coloides y efecto Tyndall',
      ] },
      { id: 'acidos-bases', nombre: 'Ácidos, bases y pH', claves: [
        'Escala de pH y su carácter logarítmico',
        'Ácidos y bases según Arrhenius',
        'Neutralización e indicadores',
        'Casos cotidianos: jugo gástrico, bicarbonato, lluvia ácida',
      ] },
      { id: 'organica', nombre: 'Química orgánica', claves: [
        'El carbono y su tetravalencia',
        'Hidrocarburos: alcanos, alquenos y alquinos',
        'Grupos funcionales y alcoholes',
        'Biomoléculas, polímeros e isómeros',
      ] },
    ],
  },
  {
    id: 'historia',
    nombre: 'Historia de Colombia',
    icono: '🏛',
    resumen: 'De los pueblos originarios al acuerdo de paz: causas, consecuencias y continuidades, no listas de fechas.',
    temas: [
      { id: 'prehispanica', nombre: 'Pueblos originarios', claves: [
        'Muiscas, taironas, quimbayas y zenúes: dónde y cómo vivían',
        'Orfebrería, ingeniería hidráulica y estatuaria (San Agustín, Tierradentro)',
        'Cacicazgos y confederaciones, no un Estado unificado',
        'La familia lingüística chibcha y el origen de El Dorado',
      ] },
      { id: 'conquista', nombre: 'Conquista', claves: [
        'Fundaciones: Santa Marta, Cartagena, Santafé y quién las fundó',
        'La caída demográfica indígena y sus causas',
        'Encomienda, Leyes Nuevas y la denuncia de Las Casas',
        'Llegada forzada de africanos esclavizados y resistencia indígena',
      ] },
      { id: 'colonia', nombre: 'La Colonia', claves: [
        'Nuevo Reino de Granada y Virreinato de la Nueva Granada',
        'Sociedad de castas y exclusión política de los criollos',
        'Economía: oro, haciendas y estancos; palenques',
        'Expedición Botánica y reformas borbónicas',
      ] },
      { id: 'independencia', nombre: 'Independencia', claves: [
        'Comuneros (1781) y 20 de julio de 1810',
        'Patria Boba, Reconquista y Campaña Libertadora',
        'Batalla de Boyacá, Angostura y la Gran Colombia',
        'Qué cambió y qué no cambió con la independencia',
      ] },
      { id: 'siglo-xix', nombre: 'La república del siglo XIX', claves: [
        'Los nombres del país y sus constituciones',
        'Federalismo y centralismo; Rionegro 1863 y la Regeneración de 1886',
        'Abolición de la esclavitud (1851) y nacimiento de los partidos',
        'Del tabaco y la quina al café; guerras civiles',
      ] },
      { id: 'siglo-xx-inicio', nombre: 'Inicios del siglo XX (1900-1930)', claves: [
        'Guerra de los Mil Días y separación de Panamá',
        'Hegemonía Conservadora y danza de los millones',
        'Masacre de las bananeras y movimiento obrero',
        'Misión Kemmerer, Banco de la República y crisis de 1929',
      ] },
      { id: 'republica-violencia', nombre: 'República Liberal y La Violencia', claves: [
        'Revolución en Marcha y reforma constitucional de 1936',
        'Voto femenino (1954) y plebiscito de 1957',
        '9 de abril de 1948: Gaitán y el Bogotazo',
        'La Violencia bipartidista, Rojas Pinilla y el éxodo rural',
      ] },
      { id: 'frente-nacional', nombre: 'Frente Nacional', claves: [
        'Alternancia y paridad: qué resolvió y qué cerró',
        'Surgimiento de las guerrillas (FARC, ELN, EPL, M-19)',
        'Reforma agraria del INCORA y paro cívico de 1977',
        'Bonanza marimbera y modernización urbana',
      ] },
      { id: 'conflicto-constitucion', nombre: 'Conflicto, narcotráfico y Constitución de 1991', claves: [
        'Carteles, Palacio de Justicia y magnicidios de 1989-1990',
        'Paramilitarismo y desplazamiento forzado',
        'Séptima Papeleta y Asamblea Constituyente',
        'Novedades de la Constitución de 1991 y descentralización',
      ] },
      { id: 'colombia-reciente', nombre: 'Colombia reciente', claves: [
        'Acuerdo de paz de 2016 y plebiscito',
        'JEP, Comisión de la Verdad y Ley de Víctimas',
        'Desmovilización de las AUC y migración venezolana',
        'Memoria histórica y cómo leer fuentes sobre hechos en disputa',
      ] },
    ],
  },
  {
    id: 'lectura',
    nombre: 'Lectura crítica',
    icono: '📖',
    resumen: 'Leer textos, gráficas e imágenes y responder: idea principal, inferencias, intención, argumentos y datos.',
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
      { id: 'discontinuos', nombre: 'Textos discontinuos: gráficas y tablas', claves: [
        'Leer barras, líneas, circulares y pictogramas',
        'Calcular diferencias, sumas de sectores y proporciones',
        'Qué NO se puede concluir de un gráfico',
        'El eje truncado y otros efectos que engañan a la vista',
      ] },
      { id: 'imagen', nombre: 'Análisis de la imagen', claves: [
        'Denotación y connotación: describir antes de interpretar',
        'Leer planos, mapas con leyenda, escala y orientación',
        'Ángulo, encuadre e intención en fotografía y publicidad',
        'Caricatura: contexto, símbolos y exageración',
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
  {
    id: 'lengua',
    nombre: 'Lengua y escritura',
    icono: 'Ñ',
    resumen: 'Ortografía, gramática, sintaxis y redacción: el idioma como objeto de estudio.',
    temas: [
      { id: 'acentuacion', nombre: 'Acentuación y tilde', claves: [
        'Agudas, graves, esdrújulas y sobresdrújulas',
        'Diptongo, hiato y tilde en la vocal débil',
        'Tilde diacrítica: tú/tu, él/el, sí/si, más/mas, qué/que',
      ] },
      { id: 'ortografia', nombre: 'Ortografía de letras', claves: [
        'Uso de b y v, g y j, h, ll y y',
        'Palabras homófonas: haber/a ver, hay/ahí/ay, echo/hecho',
        'Mayúsculas y escritura de números',
      ] },
      { id: 'puntuacion', nombre: 'Puntuación', claves: [
        'La coma que cambia el sentido y la coma que sobra',
        'Punto y coma, dos puntos y paréntesis',
        'Comillas, raya de diálogo y puntos suspensivos',
      ] },
      { id: 'gramatica', nombre: 'Categorías gramaticales', claves: [
        'Sustantivo, adjetivo, verbo, adverbio y determinante',
        'Pronombres y su función',
        'Preposiciones y conjunciones',
      ] },
      { id: 'verbos', nombre: 'El verbo: tiempo y modo', claves: [
        'Indicativo, subjuntivo e imperativo',
        'Tiempos compuestos y participios irregulares',
        'Perífrasis verbales y gerundio mal usado',
      ] },
      { id: 'sintaxis', nombre: 'Sintaxis de la oración', claves: [
        'Sujeto, predicado y núcleos',
        'Complemento directo, indirecto y circunstancial',
        'Oración simple, compuesta y subordinada',
      ] },
      { id: 'concordancia', nombre: 'Concordancia y régimen', claves: [
        'Concordancia de género y número',
        'Sujetos colectivos y verbos en singular o plural',
        'Régimen preposicional: de qué se acompaña cada verbo',
      ] },
      { id: 'errores', nombre: 'Errores frecuentes del español', claves: [
        'Dequeísmo y queísmo',
        'Laísmo, leísmo y loísmo',
        'Anacoluto, pleonasmo y muletillas',
      ] },
      { id: 'cohesion', nombre: 'Conectores y cohesión', claves: [
        'Conectores de causa, consecuencia, contraste y adición',
        'Referencia: pronombres y sinónimos que evitan repetir',
        'El conector que contradice lo que dice la frase',
      ] },
      { id: 'lexico', nombre: 'Léxico y precisión', claves: [
        'Sinónimos, antónimos y matices',
        'Palabras que se confunden: infligir/infringir, adolecer, álgido',
        'Prefijos, sufijos y familias de palabras',
      ] },
      { id: 'redaccion', nombre: 'Redacción del párrafo', claves: [
        'Idea principal y oraciones de apoyo',
        'Orden de las ideas y transiciones',
        'Frases largas: cuándo partirlas',
      ] },
      { id: 'citacion', nombre: 'Citación y uso de fuentes', claves: [
        'Cita textual, paráfrasis y referencia',
        'Qué es plagio y cómo se evita',
        'Elementos de una referencia bibliográfica',
      ] },
    ],
  },
  {
    id: 'literatura',
    nombre: 'Literatura',
    icono: '📖',
    resumen: 'Géneros, recursos, movimientos y las obras que las pruebas dan por sabidas.',
    temas: [
      { id: 'generos', nombre: 'Géneros literarios', claves: [
        'Narrativo, lírico y dramático',
        'Subgéneros: novela, cuento, fábula, soneto, tragedia',
        'Rasgos que distinguen a cada uno',
      ] },
      { id: 'figuras', nombre: 'Figuras literarias', claves: [
        'Metáfora, símil, personificación e hipérbole',
        'Anáfora, aliteración y paralelismo',
        'Ironía, paradoja, oxímoron y metonimia',
      ] },
      { id: 'verso', nombre: 'Verso, métrica y rima', claves: [
        'Contar sílabas métricas: sinalefa y ley del acento final',
        'Rima consonante y asonante',
        'Estrofas: soneto, romance, copla',
      ] },
      { id: 'narrador', nombre: 'Narrador y punto de vista', claves: [
        'Primera persona, tercera omnisciente y observador',
        'Narrador poco fiable',
        'Tiempo del relato: analepsis y prolepsis',
      ] },
      { id: 'universal', nombre: 'Literatura universal', claves: [
        'Épica antigua y teatro griego',
        'Del Renacimiento al Romanticismo',
        'Realismo, vanguardias y siglo XX',
      ] },
      { id: 'espanola', nombre: 'Literatura española', claves: [
        'Siglo de Oro: Cervantes, Quevedo, Góngora, Lope',
        'Generación del 98 y del 27',
        'El Quijote y su lugar en la novela moderna',
      ] },
      { id: 'latinoamericana', nombre: 'Literatura latinoamericana', claves: [
        'Modernismo y Rubén Darío',
        'El boom: Cortázar, Rulfo, Vargas Llosa, Borges',
        'Poesía: Neruda, Vallejo, Mistral',
      ] },
      { id: 'colombiana', nombre: 'Literatura colombiana', claves: [
        'Del costumbrismo a "María" de Jorge Isaacs',
        'García Márquez y el realismo mágico',
        'Voces contemporáneas y literatura del conflicto',
      ] },
      { id: 'analisis', nombre: 'Análisis del texto literario', claves: [
        'Tema, motivo y símbolo',
        'Personajes: caracterización y conflicto',
        'Relación entre forma y sentido',
      ] },
      { id: 'contexto', nombre: 'Literatura y contexto', claves: [
        'Obra, época y condiciones de producción',
        'Intertextualidad: obras que dialogan con otras',
        'Canon, censura y recepción',
      ] },
    ],
  },
  {
    id: 'filosofia',
    nombre: 'Ética y filosofía',
    icono: '⚖',
    resumen: 'Cómo se argumenta una decisión moral y qué han respondido los filósofos.',
    temas: [
      { id: 'que-es-etica', nombre: 'Ética, moral y valores', claves: [
        'Diferencia entre ética, moral, derecho y costumbre',
        'Valores, normas y principios',
        'Relativismo y universalismo moral',
      ] },
      { id: 'corrientes', nombre: 'Corrientes éticas', claves: [
        'Utilitarismo: las consecuencias',
        'Deontología kantiana: el deber y el imperativo categórico',
        'Ética de la virtud y ética del cuidado',
      ] },
      { id: 'dilemas', nombre: 'Dilemas morales', claves: [
        'Qué hace que un caso sea un dilema y no una duda',
        'Conflictos entre deberes',
        'Cómo se justifica una decisión difícil',
      ] },
      { id: 'bioetica', nombre: 'Bioética', claves: [
        'Autonomía, beneficencia, no maleficencia y justicia',
        'Consentimiento informado y confidencialidad',
        'Debates: final de la vida, reproducción, edición genética',
      ] },
      { id: 'etica-ambiental', nombre: 'Ética ambiental y animal', claves: [
        'Antropocentrismo y biocentrismo',
        'Deberes con las generaciones futuras',
        'Trato a los animales y consumo',
      ] },
      { id: 'etica-digital', nombre: 'Ética digital y tecnológica', claves: [
        'Privacidad, datos y vigilancia',
        'Responsabilidad de los algoritmos y la IA',
        'Plagio, autoría y honestidad académica',
      ] },
      { id: 'antigua', nombre: 'Filosofía antigua', claves: [
        'Presocráticos y el paso del mito al logos',
        'Sócrates, Platón y el mundo de las ideas',
        'Aristóteles: lógica, virtud y felicidad',
      ] },
      { id: 'moderna', nombre: 'Filosofía moderna', claves: [
        'Racionalismo y empirismo: Descartes, Hume',
        'Kant y los límites del conocimiento',
        'Contrato social: Hobbes, Locke, Rousseau',
      ] },
      { id: 'contemporanea', nombre: 'Filosofía contemporánea', claves: [
        'Marx, Nietzsche y Freud: la sospecha',
        'Existencialismo y sentido de la vida',
        'Justicia y desigualdad: Rawls y sus críticos',
      ] },
      { id: 'logica', nombre: 'Lógica y argumentación filosófica', claves: [
        'Validez y verdad no son lo mismo',
        'Falacias formales e informales',
        'Cómo se reconstruye y se evalúa un argumento',
      ] },
    ],
  },
  {
    id: 'universal',
    nombre: 'Historia universal',
    icono: '🌍',
    resumen: 'De las primeras civilizaciones al mundo actual, por causas y no por fechas.',
    temas: [
      { id: 'antiguas', nombre: 'Civilizaciones antiguas', claves: [
        'Revolución neolítica y primeras ciudades',
        'Mesopotamia, Egipto, India y China',
        'Escritura, leyes y organización del Estado',
      ] },
      { id: 'clasica', nombre: 'Grecia y Roma', claves: [
        'Polis, democracia ateniense y ciudadanía',
        'República e Imperio romano',
        'Herencia clásica: derecho, lengua y pensamiento',
      ] },
      { id: 'medieval', nombre: 'Edad Media', claves: [
        'Feudalismo y sociedad estamental',
        'Islam, Bizancio y las cruzadas',
        'Peste negra y crisis del siglo XIV',
      ] },
      { id: 'moderna', nombre: 'Renacimiento y expansión europea', claves: [
        'Humanismo, imprenta y revolución científica',
        'Reforma protestante y guerras de religión',
        'Colonialismo y economía atlántica',
      ] },
      { id: 'revoluciones', nombre: 'Revoluciones burguesas', claves: [
        'Ilustración y sus ideas políticas',
        'Independencia de Estados Unidos y Revolución francesa',
        'Napoleón y el mapa europeo',
      ] },
      { id: 'industrial', nombre: 'Revolución industrial', claves: [
        'Máquina de vapor, fábrica y ciudad',
        'Clase obrera, sindicatos y socialismo',
        'Segunda revolución industrial',
      ] },
      { id: 'imperialismo', nombre: 'Imperialismo y siglo XIX', claves: [
        'Reparto de África y Asia',
        'Nacionalismos y unificaciones',
        'Causas profundas de la Gran Guerra',
      ] },
      { id: 'guerras', nombre: 'Las guerras mundiales', claves: [
        'Primera Guerra Mundial y tratado de Versalles',
        'Crisis de 1929, fascismo y nazismo',
        'Segunda Guerra Mundial y el Holocausto',
      ] },
      { id: 'guerra-fria', nombre: 'Guerra Fría y descolonización', claves: [
        'Bloques, carrera armamentista y espacial',
        'Independencias de África y Asia',
        'Caída del muro y fin de la URSS',
      ] },
      { id: 'actual', nombre: 'Mundo contemporáneo', claves: [
        'Globalización y organismos multilaterales',
        'Migraciones, terrorismo y crisis financieras',
        'Cambio climático como problema histórico',
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
  4: 'Experto',
};

/**
 * Qué significa cada nivel. Está escrito para que la clasificación sea
 * comparable entre asignaturas: lo que sube no es la rareza del dato, es la
 * cantidad de razonamiento que hay que poner.
 */
export const DESCRIPCION_NIVELES = {
  1: 'Aplicar una definición o una fórmula de forma directa, en un solo paso.',
  2: 'Dos pasos, o elegir el procedimiento correcto entre varios posibles.',
  3: 'Combinar dos conceptos, interpretar un caso concreto o evitar una trampa frecuente.',
  4: 'Varios pasos encadenados, un caso límite, o distinguir entre dos ideas que casi todo el mundo confunde.',
};
