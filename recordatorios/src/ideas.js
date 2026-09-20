/**
 * ideas.js — 100 cosas que vale la pena implementar en una app de
 * recordatorios y productividad.
 *
 * Fuente única: la app las muestra como lista de chequeo (pestaña "100 ideas")
 * y el documento docs/100-ideas-recordatorios.md se genera desde aquí.
 *
 * `hecho: true` marca lo que esta app ya hace hoy; el resto es hoja de ruta.
 */

export const CATEGORIAS = [
  { id: 'captura', nombre: 'Capturar sin fricción' },
  { id: 'organizar', nombre: 'Organizar y encontrar' },
  { id: 'priorizar', nombre: 'Priorizar y planificar' },
  { id: 'tiempo', nombre: 'Tiempo y concentración' },
  { id: 'avisos', nombre: 'Recordatorios y avisos' },
  { id: 'equipo', nombre: 'Equipo y delegación' },
  { id: 'inversiones', nombre: 'Inversiones' },
  { id: 'academico', nombre: 'Docencia e investigación' },
  { id: 'proyectos', nombre: 'Gestión de proyectos' },
  { id: 'datos', nombre: 'Datos, privacidad y automatización' },
];

export const IDEAS = [
  // --- Capturar sin fricción ---
  { n: 1, c: 'captura', hecho: true, t: 'Escribir la tarea en una sola línea', d: 'Entrada en lenguaje natural: "revisar tesis de NVDA mañana 9am p1 #Cartera cada tercer viernes" se reparte solo en fecha, hora, prioridad, proyecto y repetición.' },
  { n: 2, c: 'captura', hecho: true, t: 'Enseñar lo que la app entendió antes de guardar', d: 'La vista previa evita el error clásico de descubrir tres días tarde que "el martes" se guardó para el mes que viene.' },
  { n: 3, c: 'captura', t: 'Bandeja de entrada universal', d: 'Un sitio donde soltar cualquier cosa sin decidir proyecto ni fecha; clasificar es otro trabajo, y mezclarlo con capturar hace que no se capture.' },
  { n: 4, c: 'captura', t: 'Atajo global de captura', d: 'Una combinación de teclas que abra la caja de tarea sobre cualquier ventana, y un widget en el móvil para lo mismo.' },
  { n: 5, c: 'captura', t: 'Compartir desde otra app', d: 'Registrar la app como destino de "Compartir" (Web Share Target) para convertir un enlace, un correo o un mensaje en tarea con su contexto.' },
  { n: 6, c: 'captura', t: 'Dictar la tarea', d: 'Reconocimiento de voz para cuando tienes las manos ocupadas, pasando el texto por el mismo analizador de lenguaje natural.' },
  { n: 7, c: 'captura', t: 'Correo a tarea', d: 'Reenviar un correo a una dirección propia y que se convierta en tarea con el asunto de título y el cuerpo de nota.' },
  { n: 8, c: 'captura', t: 'Plantillas de listas reutilizables', d: 'Cerrar un semestre, preparar un viaje o publicar un artículo son siempre las mismas quince tareas: que se inserten de golpe con fechas relativas.' },
  { n: 9, c: 'captura', t: 'Autocompletar proyectos y etiquetas al escribir', d: 'Al teclear # o @ se sugiere lo que ya existe, que es como se evita tener "cartera", "Cartera" y "carteras".' },
  { n: 10, c: 'captura', t: 'Adjuntar archivos y fotos a la tarea', d: 'La foto del pizarrón o el PDF del examen viven con la tarea, no en una carpeta que nadie vuelve a abrir.' },

  // --- Organizar y encontrar ---
  { n: 11, c: 'organizar', hecho: true, t: 'Proyectos, subtareas y etiquetas', d: 'Jerarquía para lo que es parte de algo mayor y etiquetas para lo que cruza proyectos, como @espera o @llamar.' },
  { n: 12, c: 'organizar', hecho: true, t: 'Filtros guardados con lenguaje de consulta', d: 'Combinar condiciones con &, | y paréntesis y guardar la consulta: la misma pregunta se repite cada semana.' },
  { n: 13, c: 'organizar', t: 'Secciones dentro de un proyecto', d: 'Columnas o bloques para separar fases sin crear subproyectos que luego hay que mantener.' },
  { n: 14, c: 'organizar', t: 'Vista de tablero Kanban', d: 'Las mismas tareas en columnas por estado, que para trabajo en curso se lee mejor que una lista.' },
  { n: 15, c: 'organizar', t: 'Reordenar arrastrando', d: 'El orden manual es una forma de prioridad que no cabe en cuatro niveles.' },
  { n: 16, c: 'organizar', t: 'Archivar en vez de borrar', d: 'Los proyectos terminados no se borran: se archivan, y siguen contando en las estadísticas del año.' },
  { n: 17, c: 'organizar', t: 'Papelera con recuperación', d: 'Treinta días para arrepentirse de un borrado, porque el botón de confirmar se pulsa en automático.' },
  { n: 18, c: 'organizar', t: 'Búsqueda con operadores y resultados agrupados', d: 'Buscar por texto, proyecto y rango de fechas a la vez, con los resultados agrupados por proyecto.' },
  { n: 19, c: 'organizar', t: 'Favoritos y accesos rápidos', d: 'Cuatro o cinco listas viven en la barra lateral; el resto se busca.' },
  { n: 20, c: 'organizar', t: 'Detección de duplicados', d: 'Avisar cuando se crea una tarea casi idéntica a otra abierta, que es lo que pasa cuando capturas desde tres sitios.' },

  // --- Priorizar y planificar ---
  { n: 21, c: 'priorizar', hecho: true, t: 'Cuatro niveles de prioridad con color', d: 'P1 a P4 con bandera de color, asignables con un botón o escribiendo p1 en la línea de entrada.' },
  { n: 22, c: 'priorizar', hecho: true, t: 'Matriz urgente / importante', d: 'Ver cuántas tareas son urgentes solo porque se dejaron para el final es más útil que cualquier discurso sobre productividad.' },
  { n: 23, c: 'priorizar', hecho: true, t: 'Estimar duración y ver la carga del día', d: 'Sumar los minutos comprometidos y compararlos con las horas que de verdad tienes.' },
  { n: 24, c: 'priorizar', hecho: true, t: 'Planificador que dice qué no cabe', d: 'Repartir el día en bloques y marcar explícitamente lo que se sale, en vez de dejarlo en una lista infinita.' },
  { n: 25, c: 'priorizar', t: 'Las tres cosas del día', d: 'Obligar a elegir tres tareas que harían que el día valga la pena, y enseñarlas por encima del resto.' },
  { n: 26, c: 'priorizar', hecho: true, t: 'Aplazar con un toque', d: 'Mañana, la semana que viene, el fin de semana: posponer bien es parte de planificar, no un fracaso.' },
  { n: 27, c: 'priorizar', t: 'Nivel de energía por tarea', d: 'Etiquetar qué pide cabeza fresca y qué se puede hacer cansado, para elegir según el momento del día y no según el orden de la lista.' },
  { n: 28, c: 'priorizar', t: 'Límite de tareas en curso', d: 'Avisar cuando hay demasiado empezado a la vez: el trabajo en curso es deuda, no progreso.' },
  { n: 29, c: 'priorizar', hecho: true, t: 'Revisión semanal guiada', d: 'Una lista de chequeo fija los domingos: vaciar bandeja, mirar vencidas, revisar proyectos y elegir lo de la semana.' },
  { n: 30, c: 'priorizar', hecho: true, t: 'Avisar de lo que lleva demasiado abierto', d: 'Una tarea de hace dos meses no se hace sola: hacerla, delegarla, agendarla o borrarla.' },

  // --- Tiempo y concentración ---
  { n: 31, c: 'tiempo', hecho: true, t: 'Pomodoro configurable', d: 'Enfoque, descanso corto y largo con encadenado automático, atado a la tarea en la que trabajas.' },
  { n: 32, c: 'tiempo', hecho: true, t: 'Cronómetro con vueltas', d: 'Para lo que no cabe en bloques fijos: medir de verdad cuánto tarda algo que siempre subestimas.' },
  { n: 33, c: 'tiempo', hecho: true, t: 'Temporizadores rápidos', d: 'Dos minutos para arrancar, cuarenta y cinco para un bloque profundo: la cuenta atrás es un compromiso pequeño.' },
  { n: 34, c: 'tiempo', hecho: true, t: 'Medir el tiempo con marcas de reloj, no contando ticks', d: 'Si el móvil suspende la pestaña o bloqueas la pantalla, al volver la cuenta tiene que seguir siendo correcta.' },
  { n: 35, c: 'tiempo', t: 'Estimado frente a real', d: 'Comparar lo que creías que iba a durar con lo que duró es la única forma de aprender a estimar.' },
  { n: 36, c: 'tiempo', t: 'Modo concentración a pantalla completa', d: 'Solo la tarea y el reloj, sin barra lateral ni contadores: el resto de la app también distrae.' },
  { n: 37, c: 'tiempo', t: 'Sonido ambiente', d: 'Ruido blanco, lluvia o café generados en el navegador para tapar el ruido de fuera.' },
  { n: 38, c: 'tiempo', t: 'Registro de interrupciones', d: 'Un botón para anotar cada vez que te cortan: al final de la semana el patrón salta a la vista.' },
  { n: 39, c: 'tiempo', t: 'Informe de dónde se fue el tiempo', d: 'Reparto por proyecto y por módulo, comparado con lo que dices que es tu prioridad.' },
  { n: 40, c: 'tiempo', t: 'Calendario del tiempo real trabajado', d: 'Pintar sobre el calendario las horas medidas, no las planificadas, para ver la diferencia entre el plan y la vida.' },

  // --- Recordatorios y avisos ---
  { n: 41, c: 'avisos', hecho: true, t: 'Aviso con antelación configurable', d: 'Cero, treinta o sesenta minutos antes, y varios avisos para la misma tarea.' },
  { n: 42, c: 'avisos', hecho: true, t: 'Exportar al calendario con las repeticiones intactas', d: 'Traducir las reglas a RRULE en un .ics para que "cada tercer viernes" siga repitiéndose en el móvil.' },
  { n: 43, c: 'avisos', hecho: true, t: 'Repeticiones que se entienden', d: 'Días hábiles, el 15 de cada mes, el último día del mes, el tercer viernes, cada dos semanas y "desde que la completo".' },
  { n: 44, c: 'avisos', t: 'Resumen matutino', d: 'Una notificación a primera hora con el plan del día y lo que quedó de ayer.' },
  { n: 45, c: 'avisos', t: 'Recordatorios por ubicación', d: 'Avisar al llegar a la universidad o al salir de casa, que para ciertas tareas es más fiable que una hora.' },
  { n: 46, c: 'avisos', t: 'Escalado de las aplazadas', d: 'Si una tarea se pospone cinco veces, preguntar en serio si sigue viva o hay que matarla.' },
  { n: 47, c: 'avisos', t: 'Franjas de silencio', d: 'No molestar de noche ni en clase: un aviso ignorado enseña a ignorar los avisos.' },
  { n: 48, c: 'avisos', t: 'Notificaciones push reales', d: 'Requiere un servidor con Web Push; hoy la app avisa solo si está abierta, y conviene decirlo claramente.' },
  { n: 49, c: 'avisos', t: 'Sincronización de dos vías con el calendario', d: 'Que lo que muevas en el calendario del teléfono vuelva a la app, no solo la exportación de ida.' },
  { n: 50, c: 'avisos', t: 'Avisos por contexto de agenda', d: 'Si el calendario dice que estás en clase, retrasar los avisos no urgentes hasta que salgas.' },

  // --- Equipo y delegación ---
  { n: 51, c: 'equipo', t: 'Compartir una lista por enlace o QR', d: 'Como la app de alabanza comparte el set del domingo: sin cuentas, con los datos dentro del propio enlace.' },
  { n: 52, c: 'equipo', t: 'Asignar responsable', d: 'Una tarea con dueño se hace; una tarea de todos, no.' },
  { n: 53, c: 'equipo', hecho: true, t: 'Lista de "esperando respuesta"', d: 'Lo delegado no desaparece: queda en una lista que se revisa cada semana.' },
  { n: 54, c: 'equipo', t: 'Seguimiento automático al delegar', d: 'Al marcar una tarea como delegada, crear sola la tarea de perseguirla dentro de N días.' },
  { n: 55, c: 'equipo', t: 'Comentarios con historial', d: 'La conversación sobre una tarea vive en la tarea, no en un chat donde se pierde.' },
  { n: 56, c: 'equipo', t: 'Exportar el plan a PDF para reuniones', d: 'Una hoja imprimible por proyecto o por persona, como las hojas por músico del domingo.' },
  { n: 57, c: 'equipo', t: 'Registro de cambios', d: 'Quién movió esa fecha y cuándo, que es la primera pregunta cuando algo se descuadra.' },
  { n: 58, c: 'equipo', t: 'Plantillas compartidas del equipo', d: 'La rutina del servicio, la del semestre o la de cierre de mes, iguales para todos.' },
  { n: 59, c: 'equipo', t: 'Modo solo lectura para quien solo mira', d: 'Compartir el plan sin arriesgarse a que alguien lo reordene sin querer.' },
  { n: 60, c: 'equipo', t: 'Resumen semanal automático para el equipo', d: 'Qué se cerró, qué se movió y qué está bloqueado, generado solo y listo para enviar.' },

  // --- Inversiones ---
  { n: 61, c: 'inversiones', hecho: true, t: 'Tamaño de posición calculado desde el riesgo', d: 'Cuántas acciones comprar para arriesgar solo el porcentaje que decidiste, no las que te caben.' },
  { n: 62, c: 'inversiones', hecho: true, t: 'Alertas contra tus propias reglas', d: 'Tope por posición y por sector, stop cruzado, objetivo alcanzado y tesis sin revisar desde hace meses.' },
  { n: 63, c: 'inversiones', hecho: true, t: 'Diario con expectativa en R', d: 'El porcentaje de aciertos engaña; la expectativa por unidad de riesgo y el factor de beneficio, no.' },
  { n: 64, c: 'inversiones', hecho: true, t: 'Calendario propio del mercado', d: 'Vencimientos de opciones el tercer viernes, resultados trimestrales y fechas ex-dividendo convertidos en tareas.' },
  { n: 65, c: 'inversiones', hecho: true, t: 'Listas de chequeo antes de comprar y de vender', d: 'La disciplina se escribe antes, cuando no hay dinero en juego ni prisa.' },
  { n: 66, c: 'inversiones', t: 'Importar movimientos del bróker', d: 'Leer el CSV de operaciones y cuadrar la cartera sola, que copiar a mano es donde entran los errores.' },
  { n: 67, c: 'inversiones', t: 'Cálculo fiscal del año', d: 'Plusvalías realizadas por método FIFO y aviso de la ventana de lavado antes de cerrar posiciones en diciembre.' },
  { n: 68, c: 'inversiones', t: 'Escenarios y pruebas de estrés', d: 'Qué le pasa a la cartera si el sector cae un 30 %, calculado antes de que pase.' },
  { n: 69, c: 'inversiones', t: 'Plan de aportes y seguimiento', d: 'Cuánto tocaba aportar este año, cuánto llevas y qué falta, sin abrir una hoja de cálculo.' },
  { n: 70, c: 'inversiones', t: 'Diario de decisiones no tomadas', d: 'Lo que descartaste y por qué: revisarlo un año después enseña más que la lista de aciertos.' },

  // --- Docencia e investigación ---
  { n: 71, c: 'academico', hecho: true, t: 'El semestre genera sus propias tareas', d: 'Del horario y las evaluaciones salen solas las de preparar clase, calificar y entregar notas.' },
  { n: 72, c: 'academico', hecho: true, t: 'Aviso cuando un artículo lleva demasiado parado', d: 'Noventa días "en revisión" no son normales: toca escribir al editor.' },
  { n: 73, c: 'academico', hecho: true, t: 'Convocatorias con su cuenta atrás', d: 'La fecha de cierre importa tres semanas antes, no el día anterior.' },
  { n: 74, c: 'academico', hecho: true, t: 'Seguimiento de tesis dirigidas', d: 'Asesorías periódicas por estudiante, con su tema y su etapa.' },
  { n: 75, c: 'academico', t: 'Banco de tareas por curso reutilizable', d: 'Clonar el semestre anterior con las fechas corridas, en vez de rehacerlo cada enero.' },
  { n: 76, c: 'academico', t: 'Horas de asesoría por estudiante', d: 'Un registro que sirve tanto para la memoria anual como para repartir mejor el tiempo.' },
  { n: 77, c: 'academico', t: 'Calendario público para los estudiantes', d: 'Exportar fechas de parciales y entregas en un .ics que ellos puedan suscribir.' },
  { n: 78, c: 'academico', t: 'Recordar actualizar el CV al publicar', d: 'Cuando un artículo pasa a publicado, crear la tarea de añadirlo al CV, al repositorio y al perfil.' },
  { n: 79, c: 'academico', t: 'Checklist de cierre de semestre', d: 'Notas subidas, reclamos atendidos, material archivado y lecciones anotadas para la próxima vez.' },
  { n: 80, c: 'academico', t: 'Lectura pendiente con cola y notas', d: 'Los artículos por leer son una cola con prioridad, no una carpeta de descargas de 300 PDF.' },

  // --- Gestión de proyectos ---
  { n: 81, c: 'proyectos', hecho: true, t: 'EDT con tareas resumen', d: 'Fases que se calculan solas a partir de sus hijas: fechas, duración y avance ponderado.' },
  { n: 82, c: 'proyectos', hecho: true, t: 'Dependencias de los cuatro tipos con desfase', d: 'Fin a comienzo, comienzo a comienzo, fin a fin y comienzo a fin, con adelantos y retrasos en días.' },
  { n: 83, c: 'proyectos', hecho: true, t: 'Ruta crítica y holgura', d: 'Saber qué tareas mueven la fecha final y cuáles pueden esperar es la mitad de gestionar un proyecto.' },
  { n: 84, c: 'proyectos', hecho: true, t: 'Gantt con dependencias dibujadas', d: 'Barras, hitos, avance y flechas, con la ruta crítica en rojo y la línea de hoy.' },
  { n: 85, c: 'proyectos', hecho: true, t: 'Línea base y desviación en días hábiles', d: 'Comparar el plan aprobado con la realidad, sin que un fin de semana convierta tres días de retraso en cinco.' },
  { n: 86, c: 'proyectos', hecho: true, t: 'Valor ganado (SPI y CPI)', d: 'Si vas tarde o vas caro, en dos números, antes de que sea evidente por otros medios.' },
  { n: 87, c: 'proyectos', t: 'Mover tareas arrastrando en el Gantt', d: 'Reprogramar con el ratón y que las dependencias se recalculen al soltar.' },
  { n: 88, c: 'proyectos', t: 'Nivelación automática de recursos', d: 'Retrasar sola la tarea con holgura cuando alguien está en dos sitios a la vez, y decir qué se movió.' },
  { n: 89, c: 'proyectos', t: 'Simulación Monte Carlo de la fecha final', d: 'Con duraciones optimista, probable y pesimista, dar la probabilidad de terminar en una fecha en vez de un número que nadie se cree.' },
  { n: 90, c: 'proyectos', t: 'Importar y exportar MS Project XML', d: 'Para intercambiar el plan con quien use Project o Primavera sin volver a teclearlo.' },

  // --- Datos, privacidad y automatización ---
  { n: 91, c: 'datos', hecho: true, t: 'Todo local, sin cuenta y sin servidor', d: 'Los datos son tuyos y no salen del dispositivo; la app funciona igual sin internet.' },
  { n: 92, c: 'datos', hecho: true, t: 'Exportar e importar de verdad', d: 'JSON completo, CSV, .ics y Markdown, más la importación desde Todoist y TickTick: entrar y salir tiene que ser fácil.' },
  { n: 93, c: 'datos', t: 'Respaldo cifrado con contraseña', d: 'El archivo de copia lleva la cartera entera: merece cifrado antes de acabar en una carpeta de descargas.' },
  { n: 94, c: 'datos', t: 'Sincronizar entre dispositivos sin servidor', d: 'Por archivo en tu nube o entre navegadores por WebRTC, manteniendo la promesa de que nada pasa por terceros.' },
  { n: 95, c: 'datos', t: 'Deshacer global e historial de versiones', d: 'Una franja de "deshacer" tras cada borrado y copias automáticas de los últimos días.' },
  { n: 96, c: 'datos', t: 'Reglas de automatización', d: 'Si una tarea entra con la etiqueta X, ponerle proyecto, prioridad y fecha: las mismas tres decisiones repetidas mil veces.' },
  { n: 97, c: 'datos', t: 'Informes a medida', d: 'Elegir qué medir y verlo en una gráfica, sin exportar a una hoja de cálculo para hacerlo a mano.' },
  { n: 98, c: 'datos', t: 'Accesibilidad de verdad', d: 'Teclado completo, foco visible, contraste suficiente, tamaño de letra ajustable y lectores de pantalla contemplados.' },
  { n: 99, c: 'datos', hecho: true, t: 'Tema claro y oscuro, y que quepa en el móvil', d: 'La app se usa de pie y con una mano: barra inferior, botones grandes y nada de scroll horizontal.' },
  { n: 100, c: 'datos', t: 'Automatizaciones locales y webhooks', d: 'Una forma de que otras herramientas creen tareas o lean el plan sin abrir la app, sin depender de un servicio de pago.' },
];

export const HECHAS = IDEAS.filter((i) => i.hecho).map((i) => i.n);
