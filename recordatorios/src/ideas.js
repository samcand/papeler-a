/**
 * ideas.js — Hoja de ruta de la app: lo hecho, lo que queda y lo descartado.
 *
 * Empezó como una lista de 100 ideas y hoy es la lista de trabajo real. Cada
 * entrada lleva su estado:
 *
 *   'hecho'       la app ya lo hace;
 *   'pendiente'   queda por hacer, con su `ola` (1 = lo próximo, 3 = algún día);
 *   'descartado'  no se va a hacer, y el `motivo` explica por qué.
 *
 * Lo descartado se queda escrito a propósito: una decisión sin motivo vuelve a
 * discutirse cada tres meses. Las entradas 101-110 salieron de revisar una lista
 * de 200 funcionalidades de herramientas de gestión de proyectos profesionales y
 * quedarse solo con lo que sirve a una persona que trabaja sola. Las 111-120
 * salieron de una lista de 50 ideas de productividad personal, y son cuatro
 * piezas genéricas en vez de treinta módulos: notas, colecciones de fichas,
 * objetivos y gastos.
 */

export const CATEGORIAS = [
  {
    id: 'vida',
    nombre: 'La vida fuera del trabajo'
  },
  {
    id: 'notas',
    nombre: 'Notas y diario'
  },
  {
    id: 'captura',
    nombre: 'Capturar sin fricción'
  },
  {
    id: 'organizar',
    nombre: 'Organizar y encontrar'
  },
  {
    id: 'priorizar',
    nombre: 'Priorizar y planificar'
  },
  {
    id: 'tiempo',
    nombre: 'Tiempo y concentración'
  },
  {
    id: 'avisos',
    nombre: 'Recordatorios y avisos'
  },
  {
    id: 'equipo',
    nombre: 'Equipo y delegación'
  },
  {
    id: 'inversiones',
    nombre: 'Inversiones'
  },
  {
    id: 'academico',
    nombre: 'Docencia e investigación'
  },
  {
    id: 'proyectos',
    nombre: 'Gestión de proyectos'
  },
  {
    id: 'datos',
    nombre: 'Datos, privacidad y automatización'
  }
];

export const IDEAS = [
  { n: 1, c: 'captura', estado: 'hecho', t: 'Escribir la tarea en una sola línea', d: 'Entrada en lenguaje natural: "revisar tesis de NVDA mañana 9am p1 #Cartera cada tercer viernes" se reparte solo en fecha, hora, prioridad, proyecto y repetición.' },
  { n: 2, c: 'captura', estado: 'hecho', t: 'Enseñar lo que la app entendió antes de guardar', d: 'La vista previa evita el error clásico de descubrir tres días tarde que "el martes" se guardó para el mes que viene.' },
  { n: 3, c: 'captura', estado: 'hecho', t: 'Bandeja de entrada universal', d: 'Un sitio donde soltar cualquier cosa sin decidir proyecto ni fecha, y un modo de procesarla de una en una: clasificar es otro trabajo, y mezclarlo con capturar hace que no se capture.' },
  { n: 4, c: 'captura', estado: 'hecho', t: 'Atajo global de captura', d: 'La tecla `n` abre la caja de captura sobre cualquier pantalla, y el acceso directo “Capturar” del icono la abre al instalar la app. Un atajo del sistema operativo, sobre cualquier ventana, no está al alcance de una app web: lo más cerca es ese acceso directo y compartir desde otra app.' },
  { n: 5, c: 'captura', estado: 'hecho', t: 'Compartir desde otra app', d: 'Registrar la app como destino de "Compartir" (Web Share Target) para convertir un enlace, un correo o un mensaje en tarea con su contexto.' },
  { n: 6, c: 'captura', estado: 'hecho', t: 'Dictar la tarea', d: 'Botón de micrófono en la caja de captura: lo dictado entra por el mismo analizador de lenguaje natural, así que “mañana a las nueve p1” funciona igual hablando. Solo en navegadores que reconocen voz; donde no, el botón no aparece.' },
  { n: 7, c: 'captura', estado: 'descartado', t: 'Correo a tarea', d: 'Reenviar un correo a una dirección propia y que se convierta en tarea con el asunto de título y el cuerpo de nota.', motivo: 'Necesita un servidor de correo. La app no tiene servidor y no lo va a tener.' },
  { n: 8, c: 'captura', estado: 'hecho', t: 'Plantillas de listas reutilizables', d: 'Cerrar un semestre, preparar un congreso o estudiar una inversión son las mismas quince tareas: la plantilla guarda los desfases y al aplicarla eliges el día señalado.' },
  { n: 9, c: 'captura', estado: 'hecho', t: 'Autocompletar proyectos y etiquetas al escribir', d: 'Al teclear # o @ se sugiere lo que ya existe, que es como se evita tener "cartera", "Cartera" y "carteras".' },
  { n: 10, c: 'captura', estado: 'hecho', t: 'Adjuntar archivos y fotos a la tarea', d: 'La foto del pizarrón o el PDF del examen viven con la tarea, no en una carpeta que nadie vuelve a abrir.' },
  { n: 11, c: 'organizar', estado: 'hecho', t: 'Proyectos, subtareas y etiquetas', d: 'Jerarquía para lo que es parte de algo mayor y etiquetas para lo que cruza proyectos, como @espera o @llamar.' },
  { n: 12, c: 'organizar', estado: 'hecho', t: 'Filtros guardados con lenguaje de consulta', d: 'Combinar condiciones con &, | y paréntesis y guardar la consulta: la misma pregunta se repite cada semana.' },
  { n: 13, c: 'organizar', estado: 'hecho', t: 'Secciones dentro de un proyecto', d: 'Fases dentro de un proyecto sin crear subproyectos. Se crean desde la propia lista y las tareas sin sección caen en “Sin sección”; al quitar una sección sus tareas vuelven al cuerpo del proyecto en vez de desaparecer.' },
  { n: 14, c: 'organizar', estado: 'hecho', t: 'Vista de tablero Kanban', d: 'Las mismas tareas en columnas por estado, que para trabajo en curso se lee mejor que una lista.' },
  { n: 15, c: 'organizar', estado: 'hecho', t: 'Reordenar arrastrando', d: 'El orden manual es una forma de prioridad que no cabe en cuatro niveles.' },
  { n: 16, c: 'organizar', estado: 'hecho', t: 'Archivar en vez de borrar', d: 'Los proyectos terminados no se borran: se archivan, y siguen contando en las estadísticas del año.' },
  { n: 17, c: 'organizar', estado: 'hecho', t: 'Papelera con recuperación', d: 'Treinta días para arrepentirse de un borrado, porque el botón de confirmar se pulsa en automático.' },
  { n: 18, c: 'organizar', estado: 'hecho', t: 'Búsqueda con operadores y resultados agrupados', d: 'Buscar por texto, proyecto y rango de fechas a la vez, con los resultados agrupados por proyecto.' },
  { n: 19, c: 'organizar', estado: 'hecho', t: 'Favoritos y accesos rápidos', d: 'La estrella de la cabecera fija cualquier vista (también un proyecto o un filtro) arriba de la barra lateral, y se quita desde la misma barra.' },
  { n: 20, c: 'organizar', estado: 'hecho', t: 'Detección de duplicados', d: 'Al escribir, la caja avisa si ya tienes una tarea casi igual y deja abrirla de un clic. Compara palabras con peso (índice de Jaccard) y el umbral es alto a propósito: molestar con falsos positivos es peor que dejar pasar algún duplicado. Avisa, no impide.' },
  { n: 21, c: 'priorizar', estado: 'hecho', t: 'Cuatro niveles de prioridad con color', d: 'P1 a P4 con bandera de color, asignables con un botón o escribiendo p1 en la línea de entrada.' },
  { n: 22, c: 'priorizar', estado: 'hecho', t: 'Matriz urgente / importante', d: 'Ver cuántas tareas son urgentes solo porque se dejaron para el final es más útil que cualquier discurso sobre productividad.' },
  { n: 23, c: 'priorizar', estado: 'hecho', t: 'Estimar duración y ver la carga del día', d: 'Sumar los minutos comprometidos y compararlos con las horas que de verdad tienes.' },
  { n: 24, c: 'priorizar', estado: 'hecho', t: 'Planificador que dice qué no cabe', d: 'Repartir el día en bloques y marcar explícitamente lo que se sale, en vez de dejarlo en una lista infinita.' },
  { n: 25, c: 'priorizar', estado: 'hecho', t: 'Las tres cosas del día', d: 'Obligar a elegir tres tareas que harían que el día valga la pena, y enseñarlas por encima del resto.' },
  { n: 26, c: 'priorizar', estado: 'hecho', t: 'Aplazar con un toque', d: 'Mañana, la semana que viene, el fin de semana: posponer bien es parte de planificar, no un fracaso.' },
  { n: 27, c: 'priorizar', estado: 'hecho', t: 'Nivel de energía por tarea', d: 'Cada tarea puede decir si pide cabeza fresca, normal o cansado; si no lo dices, se deduce del verbo del título. “¿Qué puedo hacer ahora?” cruza los minutos que tienes con la energía que te queda, y avisa cuando más del 70 % del día pide cabeza fresca.' },
  { n: 28, c: 'priorizar', estado: 'hecho', t: 'Límite de tareas en curso', d: 'Avisar cuando hay demasiado empezado a la vez: el trabajo en curso es deuda, no progreso.' },
  { n: 29, c: 'priorizar', estado: 'hecho', t: 'Revisión semanal guiada', d: 'Una lista de chequeo fija los domingos: vaciar bandeja, mirar vencidas, revisar proyectos y elegir lo de la semana.' },
  { n: 30, c: 'priorizar', estado: 'hecho', t: 'Avisar de lo que lleva demasiado abierto', d: 'Una tarea de hace dos meses no se hace sola: hacerla, delegarla, agendarla o borrarla.' },
  { n: 31, c: 'tiempo', estado: 'hecho', t: 'Pomodoro configurable', d: 'Enfoque, descanso corto y largo con encadenado automático, atado a la tarea en la que trabajas.' },
  { n: 32, c: 'tiempo', estado: 'hecho', t: 'Cronómetro con vueltas', d: 'Para lo que no cabe en bloques fijos: medir de verdad cuánto tarda algo que siempre subestimas.' },
  { n: 33, c: 'tiempo', estado: 'hecho', t: 'Temporizadores rápidos', d: 'Dos minutos para arrancar, cuarenta y cinco para un bloque profundo: la cuenta atrás es un compromiso pequeño.' },
  { n: 34, c: 'tiempo', estado: 'hecho', t: 'Medir el tiempo con marcas de reloj, no contando ticks', d: 'Si el móvil suspende la pestaña o bloqueas la pantalla, al volver la cuenta tiene que seguir siendo correcta.' },
  { n: 35, c: 'tiempo', estado: 'hecho', t: 'Estimado frente a real', d: 'Compara lo estimado con lo medido y saca tu factor de corrección por mediana, general y por módulo, con una pista al estimar la próxima tarea.' },
  { n: 36, c: 'tiempo', estado: 'hecho', t: 'Modo concentración a pantalla completa', d: 'Solo la tarea y el reloj, sin barra lateral ni contadores: el resto de la app también distrae.' },
  { n: 37, c: 'tiempo', estado: 'hecho', t: 'Sonido ambiente', d: 'Ruido blanco, rosa, marrón o lluvia generados en el navegador durante la concentración. Sin archivos y sin descarga: se calculan al vuelo, así que funcionan sin internet como el resto.' },
  { n: 38, c: 'tiempo', estado: 'hecho', t: 'Registro de interrupciones', d: 'Cinco botones en la pantalla de concentración, uno por motivo. En Revisión sale el patrón de catorce días: qué te corta más y a qué hora, que casi siempre es más aburrido (y más arreglable) de lo que uno cree.' },
  { n: 39, c: 'tiempo', estado: 'hecho', t: 'Informe de dónde se fue el tiempo', d: 'Reparto por proyecto y por módulo, comparado con lo que dices que es tu prioridad.' },
  { n: 40, c: 'tiempo', estado: 'hecho', t: 'Calendario del tiempo real trabajado', d: 'Una casilla pinta sobre el calendario las horas medidas, no las planificadas, y el panel del día compara las dos columnas. Lo que no mediste no aparece, y eso también es información.' },
  { n: 41, c: 'avisos', estado: 'hecho', t: 'Aviso con antelación configurable', d: 'Cero, treinta o sesenta minutos antes, y varios avisos para la misma tarea.' },
  { n: 42, c: 'avisos', estado: 'hecho', t: 'Exportar al calendario con las repeticiones intactas', d: 'Traducir las reglas a RRULE en un .ics para que "cada tercer viernes" siga repitiéndose en el móvil.' },
  { n: 43, c: 'avisos', estado: 'hecho', t: 'Repeticiones que se entienden', d: 'Días hábiles, el 15 de cada mes, el último día del mes, el tercer viernes, cada dos semanas y "desde que la completo".' },
  { n: 44, c: 'avisos', estado: 'hecho', t: 'Resumen matutino', d: 'Al entrar (y como aviso, si están permitidos) el plan del día: las tres cosas que importan, lo que tiene hora, lo atrasado y lo que hiciste ayer.' },
  { n: 45, c: 'avisos', estado: 'descartado', t: 'Recordatorios por ubicación', d: 'Avisar al llegar a la universidad o al salir de casa, que para ciertas tareas es más fiable que una hora.', motivo: 'La geolocalización en segundo plano no es fiable en una app web; prometería avisos que no llegarían.' },
  { n: 46, c: 'avisos', estado: 'hecho', t: 'Escalado de las aplazadas', d: 'Si una tarea se pospone cinco veces, preguntar en serio si sigue viva o hay que matarla.' },
  { n: 47, c: 'avisos', estado: 'hecho', t: 'Franjas de silencio', d: 'No molestar de noche ni en clase: un aviso ignorado enseña a ignorar los avisos.' },
  { n: 48, c: 'avisos', estado: 'descartado', t: 'Notificaciones push reales', d: 'Requiere un servidor con Web Push; hoy la app avisa solo si está abierta, y conviene decirlo claramente.', motivo: 'Web Push exige un servidor con claves VAPID. Se sustituye por el resumen al entrar y el .ics para las alarmas del teléfono.' },
  { n: 49, c: 'avisos', estado: 'descartado', t: 'Sincronización de dos vías con el calendario', d: 'Que lo que muevas en el calendario del teléfono vuelva a la app, no solo la exportación de ida.', motivo: 'Exigiría conectar una cuenta de Google y sacar tus datos del dispositivo. La exportación .ics cubre el 90 % sin ese coste.' },
  { n: 50, c: 'avisos', estado: 'hecho', t: 'Avisos por contexto de agenda', d: 'Con el horario del semestre puesto, durante las horas de clase solo pasan los avisos urgentes; el resto espera a que salgas. Se suma a las franjas de silencio.' },
  { n: 51, c: 'equipo', estado: 'hecho', t: 'Compartir una lista por enlace o QR', d: 'Como la app de alabanza comparte el set del domingo: sin cuentas, con los datos dentro del propio enlace.' },
  { n: 52, c: 'equipo', estado: 'descartado', t: 'Asignar responsable', d: 'Una tarea con dueño se hace; una tarea de todos, no.', motivo: 'No hay equipo al que asignar: el responsable siempre eres tú.' },
  { n: 53, c: 'equipo', estado: 'hecho', t: 'Lista de "esperando respuesta"', d: 'Lo delegado no desaparece: queda en una lista que se revisa cada semana.' },
  { n: 54, c: 'equipo', estado: 'hecho', t: 'Dependencias externas: dueño, fecha y seguimiento', d: 'El coautor, la revista, el estudiante o el banco: quién lo tiene, desde cuándo y cuándo perseguirlo, con aviso cuando se pasa de plazo.' },
  { n: 55, c: 'equipo', estado: 'descartado', t: 'Comentarios con historial', d: 'La conversación sobre una tarea vive en la tarea, no en un chat donde se pierde.', motivo: 'Un hilo de comentarios con una sola persona son las notas de la tarea, que ya existen.' },
  { n: 56, c: 'equipo', estado: 'hecho', t: 'Exportar el plan a PDF para reuniones', d: '“Hoja para la reunión” imprime la tabla del plan sola, sin la app alrededor: EDT, responsable, fechas, holgura y avance, con la ruta crítica en negrita. Desde el diálogo de impresión se guarda como PDF.' },
  { n: 57, c: 'equipo', estado: 'descartado', t: 'Registro de cambios', d: 'Quién movió esa fecha y cuándo, que es la primera pregunta cuando algo se descuadra.', motivo: 'El registro de "quién cambió qué" solo tiene sentido con varias manos sobre el mismo plan.' },
  { n: 58, c: 'equipo', estado: 'descartado', t: 'Plantillas compartidas del equipo', d: 'La rutina del servicio, la del semestre o la de cierre de mes, iguales para todos.', motivo: 'Ya tienes plantillas propias; compartirlas es el mismo trabajo que compartir una lista por enlace.' },
  { n: 59, c: 'equipo', estado: 'descartado', t: 'Modo solo lectura para quien solo mira', d: 'Compartir el plan sin arriesgarse a que alguien lo reordene sin querer.', motivo: 'Va incluido en compartir por enlace: quien recibe el enlace no edita tus datos.' },
  { n: 60, c: 'equipo', estado: 'hecho', t: 'Resumen semanal automático para el equipo', d: 'En Revisión: qué se cerró, qué entró, qué está en manos de otros y qué viene la semana próxima, listo para copiar o descargar. Si la semana fue floja se nota, que es justo para lo que sirve.' },
  { n: 61, c: 'inversiones', estado: 'hecho', t: 'Tamaño de posición calculado desde el riesgo', d: 'Cuántas acciones comprar para arriesgar solo el porcentaje que decidiste, no las que te caben.' },
  { n: 62, c: 'inversiones', estado: 'hecho', t: 'Alertas contra tus propias reglas', d: 'Tope por posición y por sector, stop cruzado, objetivo alcanzado y tesis sin revisar desde hace meses.' },
  { n: 63, c: 'inversiones', estado: 'hecho', t: 'Diario con expectativa en R', d: 'El porcentaje de aciertos engaña; la expectativa por unidad de riesgo y el factor de beneficio, no.' },
  { n: 64, c: 'inversiones', estado: 'hecho', t: 'Calendario propio del mercado', d: 'Vencimientos de opciones el tercer viernes, resultados trimestrales y fechas ex-dividendo convertidos en tareas.' },
  { n: 65, c: 'inversiones', estado: 'hecho', t: 'Listas de chequeo antes de comprar y de vender', d: 'La disciplina se escribe antes, cuando no hay dinero en juego ni prisa.' },
  { n: 66, c: 'inversiones', estado: 'hecho', t: 'Importar movimientos del bróker', d: 'Lee el CSV de operaciones con los nombres de columna de cada bróker, empareja compras y ventas por FIFO y reconstruye posiciones y diario, avisando de lo que no cuadra.' },
  { n: 67, c: 'inversiones', estado: 'hecho', t: 'Cálculo fiscal del año', d: 'Plusvalías realizadas por método FIFO y aviso de la ventana de lavado antes de cerrar posiciones en diciembre.' },
  { n: 68, c: 'inversiones', estado: 'hecho', t: 'Escenarios y pruebas de estrés', d: 'Qué le pasa a la cartera si el sector cae un 30 %, calculado antes de que pase.' },
  { n: 69, c: 'inversiones', estado: 'hecho', t: 'Plan de aportes y seguimiento', d: 'Cuánto tocaba aportar este año, cuánto llevas y qué falta, sin abrir una hoja de cálculo.' },
  { n: 70, c: 'inversiones', estado: 'hecho', t: 'Diario de decisiones no tomadas', d: 'Lo que descartaste o aplazaste, por qué y a qué precio, con fecha de revisión. Cuando toca, vuelve a la mesa preguntando si acertaste al no hacerlo. Media cartera se decide en lo que no se hace.' },
  { n: 71, c: 'academico', estado: 'hecho', t: 'El semestre genera sus propias tareas', d: 'Del horario y las evaluaciones salen solas las de preparar clase, calificar y entregar notas.' },
  { n: 72, c: 'academico', estado: 'hecho', t: 'Aviso cuando un artículo lleva demasiado parado', d: 'Noventa días "en revisión" no son normales: toca escribir al editor.' },
  { n: 73, c: 'academico', estado: 'hecho', t: 'Convocatorias con su cuenta atrás', d: 'La fecha de cierre importa tres semanas antes, no el día anterior.' },
  { n: 74, c: 'academico', estado: 'hecho', t: 'Seguimiento de tesis dirigidas', d: 'Asesorías periódicas por estudiante, con su tema y su etapa.' },
  { n: 75, c: 'academico', estado: 'hecho', t: 'Banco de tareas por curso reutilizable', d: 'Clonar el semestre anterior con las fechas corridas, en vez de rehacerlo cada enero.' },
  { n: 76, c: 'academico', estado: 'hecho', t: 'Horas de asesoría por estudiante', d: 'Sale del tiempo ya medido: una sesión cuenta para un estudiante si la tarea lo menciona o lleva su etiqueta. Sirve para la memoria anual y, sobre todo, para ver a quién no le has dado ni una hora.' },
  { n: 77, c: 'academico', estado: 'hecho', t: 'Calendario público para los estudiantes', d: 'Exportar fechas de parciales y entregas en un .ics que ellos puedan suscribir.' },
  { n: 78, c: 'academico', estado: 'hecho', t: 'Recordar actualizar el CV al publicar', d: 'Cuando un artículo pasa a publicado, crear la tarea de añadirlo al CV, al repositorio y al perfil.' },
  { n: 79, c: 'academico', estado: 'descartado', t: 'Checklist de cierre de semestre', d: 'Notas subidas, reclamos atendidos, material archivado y lecciones anotadas para la próxima vez.', motivo: 'Ya está hecho: es una de las plantillas de lista que vienen puestas.' },
  { n: 80, c: 'academico', estado: 'hecho', t: 'Lectura pendiente con cola y notas', d: 'Cola con prioridad, tipo y minutos estimados. Lo que lleva más de sesenta días sube solo, y a los tres meses la app lo dice sin rodeos: o se lee o se borra.' },
  { n: 81, c: 'proyectos', estado: 'hecho', t: 'EDT con tareas resumen', d: 'Fases que se calculan solas a partir de sus hijas: fechas, duración y avance ponderado.' },
  { n: 82, c: 'proyectos', estado: 'hecho', t: 'Dependencias de los cuatro tipos con desfase', d: 'Fin a comienzo, comienzo a comienzo, fin a fin y comienzo a fin, con adelantos y retrasos en días.' },
  { n: 83, c: 'proyectos', estado: 'hecho', t: 'Ruta crítica y holgura', d: 'Saber qué tareas mueven la fecha final y cuáles pueden esperar es la mitad de gestionar un proyecto.' },
  { n: 84, c: 'proyectos', estado: 'hecho', t: 'Gantt con dependencias dibujadas', d: 'Barras, hitos, avance y flechas, con la ruta crítica en rojo y la línea de hoy.' },
  { n: 85, c: 'proyectos', estado: 'hecho', t: 'Línea base y desviación en días hábiles', d: 'Comparar el plan aprobado con la realidad, sin que un fin de semana convierta tres días de retraso en cinco.' },
  { n: 86, c: 'proyectos', estado: 'hecho', t: 'Valor ganado (SPI y CPI)', d: 'Si vas tarde o vas caro, en dos números, antes de que sea evidente por otros medios.' },
  { n: 87, c: 'proyectos', estado: 'hecho', t: 'Mover tareas arrastrando en el Gantt', d: 'Arrastrar la barra fija la tarea a una fecha y estirar su borde derecho cambia la duración; al soltar se recalculan dependencias y ruta crítica.' },
  { n: 88, c: 'proyectos', estado: 'hecho', t: 'Nivelación automática de recursos', d: 'Retrasa la tarea con más holgura hasta deshacer el choque, sin tocar la ruta crítica salvo que lo pidas, y enseña cada movimiento con opción de deshacerlo.' },
  { n: 89, c: 'proyectos', estado: 'hecho', t: 'Fecha final probabilística (PERT + Monte Carlo)', d: 'Duración optimista, probable y pesimista por tarea, simulación del plan y una fecha con probabilidad — alimentada por tu factor de calibración medido, no por un optimismo genérico.' },
  { n: 90, c: 'proyectos', estado: 'descartado', t: 'Importar y exportar MS Project XML', d: 'Para intercambiar el plan con quien use Project o Primavera sin volver a teclearlo.', motivo: 'Solo sirve para intercambiar el plan con alguien que use Project o Primavera. No es tu caso.' },
  { n: 91, c: 'datos', estado: 'hecho', t: 'Todo local, sin cuenta y sin servidor', d: 'Los datos son tuyos y no salen del dispositivo; la app funciona igual sin internet.' },
  { n: 92, c: 'datos', estado: 'hecho', t: 'Exportar e importar de verdad', d: 'JSON completo, CSV, .ics y Markdown, más la importación desde Todoist y TickTick: entrar y salir tiene que ser fácil.' },
  { n: 93, c: 'datos', estado: 'hecho', t: 'Respaldo cifrado con contraseña', d: 'El archivo de copia lleva la cartera entera: merece cifrado antes de acabar en una carpeta de descargas.' },
  { n: 94, c: 'datos', estado: 'hecho', t: 'Sincronizar entre dispositivos sin servidor', d: 'Fusión de dos copias por archivo: gana la versión modificada más tarde y lo que solo existe en una se conserva. Sin cuentas y sin nube. (La sincronización automática por WebRTC sigue sin hacerse.)' },
  { n: 95, c: 'datos', estado: 'hecho', t: 'Deshacer global y papelera', d: 'Ctrl+Z revierte las últimas quince operaciones, incluidas las que tocan muchas tareas de golpe, y lo borrado espera treinta días en la papelera. El historial de versiones persistido sigue pendiente (idea 94).' },
  { n: 96, c: 'datos', estado: 'hecho', t: 'Reglas de automatización', d: '“Si el título contiene X, ponle proyecto, prioridad, etiqueta o energía.” Se aplican al crear la tarea, en orden, y nunca pisan una fecha o una duración que tú escribiste. La app dice qué regla actuó y cuántas veces lleva: una automatización silenciosa es una automatización en la que se deja de confiar.' },
  { n: 97, c: 'datos', estado: 'hecho', t: 'Informes a medida', d: 'Tres menús — qué medir, cómo agruparlo y en qué periodo — y la gráfica sale sola. Cinco informes ya pensados para empezar, los tuyos se guardan y todo se descarga en CSV.' },
  { n: 98, c: 'datos', estado: 'hecho', t: 'Accesibilidad de verdad', d: 'Teclado completo, foco visible, contraste suficiente, tamaño de letra ajustable y lectores de pantalla contemplados.' },
  { n: 99, c: 'datos', estado: 'hecho', t: 'Tema claro y oscuro, y que quepa en el móvil', d: 'La app se usa de pie y con una mano: barra inferior, botones grandes y nada de scroll horizontal.' },
  { n: 100, c: 'datos', estado: 'descartado', t: 'Automatizaciones locales y webhooks', d: 'Una forma de que otras herramientas creen tareas o lean el plan sin abrir la app, sin depender de un servicio de pago.', motivo: 'Un webhook necesita algo que escuche desde fuera, y aquí no hay servidor. Las reglas locales (96) cubren la parte útil.' },
  { n: 101, c: 'proyectos', estado: 'hecho', t: 'Simulación "¿qué pasa si?" y propagación del impacto', d: 'Retrasar una tarea, alargar otra o mover un hito, y ver antes de tocar nada qué fechas se mueven en cascada y si la entrega sigue en pie.' },
  { n: 102, c: 'priorizar', estado: 'hecho', t: 'Tu capacidad real entre los cinco módulos', d: 'Horas disponibles por semana descontando clases, ensayo y servicio, frente a lo que ya has comprometido, con un mapa de calor semanal. El recurso escaso que provoca todos los choques eres tú.' },
  { n: 103, c: 'proyectos', estado: 'hecho', t: 'Salud explicada y aviso temprano', d: 'Un indicador por compromiso con las razones detrás: holgura consumida, dependencias externas vencidas, tu carga y estancamiento. Lo que importa no es el número sino el porqué, antes de que se ponga en rojo.' },
  { n: 104, c: 'proyectos', estado: 'hecho', t: 'Valor ganado en horas: ETC, VAC, TCPI y curva S', d: 'Para un paper o un semestre el presupuesto son horas, no euros: cuánto falta por invertir, cuánto te has pasado y a qué ritmo tendrías que ir para llegar.' },
  { n: 105, c: 'proyectos', estado: 'hecho', t: 'Ruta casi crítica y margen hasta el hito', d: 'Las tareas con uno o tres días de holgura son las que sorprenden; hoy se pintan igual que las que tienen treinta. Y cuántos días de colchón queda hasta cada entrega.' },
  { n: 106, c: 'proyectos', estado: 'hecho', t: 'Fechas imposibles y tareas huérfanas', d: 'Avisar al planificar de lo que no cabe antes de su fecha límite y de lo que no cuelga de nada ni tiene día, en vez de descubrirlo en noviembre.' },
  { n: 107, c: 'proyectos', estado: 'hecho', t: 'Simulación de ausencia', d: '"Me voy dos semanas en enero": qué se rompe, qué se puede adelantar y qué hay que mover antes de irte.' },
  { n: 108, c: 'proyectos', estado: 'hecho', t: 'Riesgos ligeros por proyecto', d: 'Cinco líneas por proyecto: qué puede romperlo, probabilidad por impacto, el disparador y cuándo revisarlo. Un riesgo que se cumple deja de ser riesgo: se convierte en tarea. Sin registro formal ni reservas de contingencia.' },
  { n: 109, c: 'proyectos', estado: 'hecho', t: 'Detector de alcance que crece', d: 'Cuánto ha engordado el plan desde la línea base, en días y en tareas añadidas, con la lista de lo nuevo y de lo que se alargó. El alcance no crece de golpe: crece a base de “y ya que estamos”.' },
  { n: 110, c: 'datos', estado: 'hecho', t: 'Copiloto local, sin mandar nada fuera', d: 'Seis preguntas respondidas con cálculo: qué se va a retrasar, qué puedo mover sin tocar la entrega, quién está sobrecargado, qué cambió esta semana, qué me va a explotar y cómo viene la semana. Empareja por palabras clave, no comprende; cuando no reconoce la pregunta lo dice y enseña las que sí sabe responder. Determinista y offline.' },
  { n: 111, c: 'notas', estado: 'hecho', t: 'Notas sueltas, el segundo cerebro', d: 'Notas que no son tareas, con etiquetas y enlaces [[así]]. Debajo de cada una aparece quién apunta a ella, que es donde salen las relaciones que no recordabas; un enlace a una nota que no existe se convierte en esa nota de un clic.' },
  { n: 112, c: 'vida', estado: 'hecho', t: 'Colecciones: fichas con los campos que tú quieras', d: 'Una colección es una lista de fichas con sus campos (texto, número, dinero, fecha, sí/no, elección, enlace). Seis vienen puestas —vehículos, biblioteca, cursos, regalos, lugares, inventario— y las fechas marcadas con “avisa” se convierten en recordatorios. Seis módulos parecidos en una sola pantalla.' },
  { n: 113, c: 'vida', estado: 'hecho', t: 'Objetivos con progreso y revisión', d: 'Metas por número, por tareas cerradas de un proyecto o por sí/no, con fecha de revisión. Lo que se enseña no es solo el porcentaje: es el progreso comparado con el tiempo gastado y cuánto haría falta por semana. Abandonar uno pide el motivo, que se queda escrito.' },
  { n: 114, c: 'vida', estado: 'hecho', t: 'Mantenimiento por uso, no por fecha', d: 'Un contador de kilómetros (u horas) que no retrocede, el uso diario sacado de dos lecturas separadas al menos una semana, y servicios que vencen por uso, por tiempo o por lo que llegue antes. Con el ritmo medido dice en qué fecha caerían esos kilómetros, y sin datos suficientes lo dice en vez de estimar.' },
  { n: 115, c: 'vida', estado: 'hecho', t: 'Gastos y presupuesto por categoría', d: 'Gasto escrito a mano, como los precios de la cartera. Presupuesto por categoría y el aviso que de verdad sirve: “vas por el 77 % del mes y el 78 % del presupuesto”. Los recibos fijos se copian al mes siguiente sin duplicarse.' },
  { n: 116, c: 'vida', estado: 'hecho', t: 'Agenda de personas: cumpleaños, fechas y regalos', d: 'Cumpleaños con la edad, otras fechas anuales o de una vez, y las ideas de regalo de cada uno. El aviso sale con la antelación que pongas, porque el mismo día sirve para un mensaje pero no para un regalo.' },
  { n: 117, c: 'vida', estado: 'hecho', t: 'Rutinas encadenadas de mañana y noche', d: 'Una rutina es una sola cosa con pasos dentro, cada uno con sus minutos. Se marcan de un toque desde Hoy o desde su pantalla, dice cuánto queda de lo que dura, y la racha salta los días en que no tocaba: el sábado no la rompe.' },
  { n: 118, c: 'vida', estado: 'hecho', t: 'El viaje como ficha: itinerario, papeles y presupuesto', d: 'Cuenta atrás, itinerario día a día sacado de las tareas que caen entre las fechas, la preparación pendiente y lo gastado frente al presupuesto, por día y por persona. No guarda nada por duplicado: un gasto del viaje es un gasto.' },
  { n: 119, c: 'notas', estado: 'hecho', t: 'Diario del día', d: 'Una entrada por día con su ánimo, escrita donde ya viven las notas, con la racha de días seguidos y el “hace un año, un día como hoy” que es media gracia de llevar un diario.' },
  { n: 120, c: 'vida', estado: 'hecho', t: 'Panel de vida', d: 'Ocho tarjetas —día, rutinas, dinero, objetivos, personas, mantenimiento, viajes y notas— y arriba lo que pide atención, ordenado por urgencia. Ningún dato nuevo: los que ya hay, juntos. Lo que todavía está vacío lo dice en vez de enseñar un cero con pinta de dato.' },
  { n: 121, c: 'organizar', estado: 'hecho', t: 'Buscador universal con paleta', d: 'Ctrl+K (o “/”) abre una caja que busca en las diez clases de cosas que la app guarda —tareas, proyectos, notas, fichas, personas, objetivos, gastos, viajes, lecturas y planes— y además abre pantallas escribiendo su nombre. Lo que empieza por lo escrito va antes que lo que solo lo contiene, lo cerrado pesa menos que lo vivo, y hay que escribir todas las palabras: “ana regalo” no trae todo lo que diga “ana”.' },
  { n: 122, c: 'priorizar', estado: 'hecho', t: 'Fecha límite distinta de la fecha en que lo haces', d: 'La mitad de las apps mezclan las dos: pones el paper para el lunes porque es cuando piensas escribirlo, pero la revista cierra el 30. Ahora `fecha` es cuándo lo haces y `límite` cuándo vence, se escribe hablando («antes del 30 de octubre», «límite 15/11», «vence el viernes») y la app avisa de lo que importa: que lo tienes planificado para después de que venza. Con filtros `con plazo`, `en riesgo` y el historial de entregas a tiempo.' },
  { n: 123, c: 'organizar', estado: 'hecho', t: 'Tareas que esperan a otras', d: 'Los planes con Gantt ya tenían dependencias; las tareas del día a día, no. Media lista de pospuestas no es pereza: es que todavía no se puede hacer. Ahora una tarea puede ir después de otra, se marca con 🔒, no se admiten círculos, y al cerrar la de antes la app dice qué acaba de quedar libre.' },
  { n: 124, c: 'proyectos', estado: 'hecho', t: 'Cartera: todos los proyectos a la vez', d: 'De uno en uno todos los planes parecen ir bien. Juntos aparece lo que no se ve desde dentro: que eres el mismo recurso en los tres y las semanas cargadas caen en la misma semana. Tabla con fecha de fin frente a la comprometida, choques de agenda entre planes agrupados por racha, carga total por persona y los próximos hitos de todos.' },
];

export const HECHAS = IDEAS.filter((i) => i.estado === 'hecho').map((i) => i.n);
export const PENDIENTES = IDEAS.filter((i) => i.estado === 'pendiente');
export const DESCARTADAS = IDEAS.filter((i) => i.estado === 'descartado');

/** Lo pendiente agrupado por ola, que es el orden en que conviene hacerlo. */
export const OLAS = [
  { n: 1, nombre: 'Lo próximo', descripcion: 'Quita fricción real o evita un error caro. Vale la pena hacerlo ya.' },
  { n: 2, nombre: 'Después', descripcion: 'Suma de verdad, pero puede esperar a que lo de arriba esté asentado.' },
  { n: 3, nombre: 'Algún día', descripcion: 'Estaría bien tenerlo; ninguna semana se rompe por no tenerlo.' },
];

export function porOla(n) {
  return PENDIENTES.filter((i) => i.ola === n);
}
