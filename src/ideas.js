/**
 * ideas.js — 100 ideas prácticas para ejecutar bien la alabanza.
 * Fuente única: la app las muestra como lista de chequeo y el documento
 * docs/100-ideas-alabanza.md se genera desde aquí.
 */

export const CATEGORIES = [
  { id: 'espiritual', name: 'Preparación personal y espiritual' },
  { id: 'individual', name: 'Preparación musical individual' },
  { id: 'ensayo', name: 'Ensayo con el equipo' },
  { id: 'guitarra', name: 'Guitarra' },
  { id: 'piano', name: 'Piano y teclado' },
  { id: 'bateria', name: 'Batería y ritmo' },
  { id: 'arreglos', name: 'Arreglos y dinámicas' },
  { id: 'voz', name: 'Voz y conducción de la congregación' },
  { id: 'sonido', name: 'Sonido y tecnología' },
  { id: 'liderazgo', name: 'Liderazgo, flujo del servicio y crecimiento' },
];

export const IDEAS = [
  // 1-10 Preparación personal y espiritual
  { n: 1, c: 'espiritual', t: 'Ora la letra antes de tocarla', d: 'Lee la letra de cada canción como oración durante la semana. Lo que no te ha tocado a ti difícilmente conducirá a otros.' },
  { n: 2, c: 'espiritual', t: 'Define el propósito del set', d: 'Escribe en una frase a dónde quieres llevar a la congregación (adorar, confesar, celebrar, enviar). Esa frase decide el orden de las canciones.' },
  { n: 3, c: 'espiritual', t: 'Llega descansado', d: 'Dormir bien la noche anterior mejora más tu ejecución que un ensayo extra de madrugada.' },
  { n: 4, c: 'espiritual', t: 'Silencio antes del servicio', d: 'Cinco minutos sin hablar ni revisar el celular antes de subir. Cambia por completo tu presencia en la plataforma.' },
  { n: 5, c: 'espiritual', t: 'Revisa tu motivación', d: 'Pregúntate: ¿quiero que me vean tocar o que la gente cante? La respuesta se nota en el volumen y en los adornos.' },
  { n: 6, c: 'espiritual', t: 'Reconciliación antes del ensayo', d: 'Si hay algo pendiente con alguien del equipo, resuélvelo antes de tocar. La tensión se oye en la música.' },
  { n: 7, c: 'espiritual', t: 'Memoriza las letras', d: 'Cantar sin leer te libera la cara, los ojos y el gesto. La congregación sigue a quien está presente, no a quien lee.' },
  { n: 8, c: 'espiritual', t: 'Conoce la teología de lo que cantas', d: 'Si una línea es ambigua o doctrinalmente floja, cámbiala o no la cantes. Lo que se canta se cree.' },
  { n: 9, c: 'espiritual', t: 'Prepara qué vas a decir', d: 'Anota una o dos frases breves entre canciones, apoyadas en un versículo. Improvisar largo suele apagar el momento.' },
  { n: 10, c: 'espiritual', t: 'Ayuna de pantalla el día del servicio', d: 'Menos ruido mental antes de dirigir; llegas con la cabeza en una sola cosa.' },

  // 11-20 Preparación individual
  { n: 11, c: 'individual', t: 'Escucha la canción cinco veces sin instrumento', d: 'Primero entiende la forma y el aire. Tocar antes de escuchar es la causa número uno de arreglos torcidos.' },
  { n: 12, c: 'individual', t: 'Escribe la forma en una línea', d: 'Ej.: Intro – V1 – Coro – V2 – Coro – Puente x2 – Coro x2 – Final. Todos deben tener la misma línea.' },
  { n: 13, c: 'individual', t: 'Practica con metrónomo siempre', d: 'Diez minutos diarios con clic valen más que una hora sin él. El problema del equipo casi nunca son las notas: es el tiempo.' },
  { n: 14, c: 'individual', t: 'Practica el cambio difícil aislado', d: 'Aísla los dos acordes que se te traban y cámbialos 50 veces lento. Lento y limpio se vuelve rápido; rápido y sucio se queda sucio.' },
  { n: 15, c: 'individual', t: 'Toca la canción a 80 % de velocidad', d: 'Si no sale limpia en lento, en el servicio saldrá peor: los nervios aceleran todo.' },
  { n: 16, c: 'individual', t: 'Grábate con el celular', d: 'Escucharte es incómodo y es el atajo más rápido para mejorar. Fíjate en el tiempo y en el volumen, no en el talento.' },
  { n: 17, c: 'individual', t: 'Aprende la canción en dos tonalidades', d: 'El día que haya que bajarla por el cantante, no improvisarás: ya la sabes.' },
  { n: 18, c: 'individual', t: 'Marca tu parte, no toda la canción', d: 'Subraya en tu hoja solo lo que tú haces: entradas, silencios y cortes.' },
  { n: 19, c: 'individual', t: 'Prepara tu equipo el día anterior', d: 'Cuerdas, baquetas, pilas, cables, adaptadores, fuente. Revisar en el ensayo general es tarde.' },
  { n: 20, c: 'individual', t: 'Calienta 5 minutos antes de tocar', d: 'Escalas lentas, rudimentos o vocalizaciones. Los músculos fríos tocan tarde y afinan mal.' },

  // 21-30 Ensayo
  { n: 21, c: 'ensayo', t: 'Empieza y termina a la hora', d: 'Un ensayo que empieza tarde enseña al equipo que la puntualidad es opcional; en el servicio eso se paga.' },
  { n: 22, c: 'ensayo', t: 'Envía el material con 5 días de anticipación', d: 'Audio, tonalidad, BPM y forma. Nadie puede "preparar" algo que recibió anoche.' },
  { n: 23, c: 'ensayo', t: 'Ensaya las transiciones, no solo las canciones', d: 'El 80 % de los tropiezos ocurre entre canción y canción. Ensaya los últimos 8 compases de una y los primeros 8 de la siguiente.' },
  { n: 24, c: 'ensayo', t: 'Un solo director de ensayo', d: 'Varios dando instrucciones a la vez alarga todo. Los demás anotan y hablan cuando haya turno.' },
  { n: 25, c: 'ensayo', t: 'Cuenta las entradas en voz alta', d: 'Un "¡y uno, dos, tres, cuatro!" claro resuelve la mitad de las entradas descoordinadas.' },
  { n: 26, c: 'ensayo', t: 'Ensaya en silencio un pase mental', d: 'Cada músico repasa la forma sin tocar, mirando su hoja. Revela quién no sabe la estructura.' },
  { n: 27, c: 'ensayo', t: 'Prueba a quitar instrumentos', d: 'Toca un coro sin batería, otro sin guitarra. Descubrirás que la canción suena mejor con menos.' },
  { n: 28, c: 'ensayo', t: 'Graba el ensayo completo', d: 'Escuchen juntos dos minutos de la grabación. Resuelve discusiones de opinión con evidencia.' },
  { n: 29, c: 'ensayo', t: 'Acuerden señales con la mano', d: 'Puño = corte, palma arriba = sostener, dedo arriba = una vez más, mano abajo = bajar volumen. Practíquenlas.' },
  { n: 30, c: 'ensayo', t: 'Cierra el ensayo orando por el servicio', d: 'Convierte el ensayo en equipo, no en banda. Y recuerda a todos para qué se ensayó.' },

  // 31-40 Guitarra
  { n: 31, c: 'guitarra', t: 'Afina antes y a mitad del set', d: 'Un semitono de desafinación arruina el acorde más bonito. Usa afinador de pedal y silencia al afinar.' },
  { n: 32, c: 'guitarra', t: 'Usa el capo para no cambiar de formas', d: 'Si la canción está en Bb, capo 3 y tocas formas de G. Menos cejillas, más limpieza y más energía para cantar.' },
  { n: 33, c: 'guitarra', t: 'No toques las seis cuerdas siempre', d: 'En el verso, rasguea solo las cuatro agudas. Deja el grave al bajo y al piano.' },
  { n: 34, c: 'guitarra', t: 'La mano derecha nunca se detiene', d: 'Mantén el movimiento constante y simplemente no toques las cuerdas en los silencios: así el rasgueo no se desordena.' },
  { n: 35, c: 'guitarra', t: 'Dos guitarras, dos registros', d: 'Una acústica con capo arriba y otra sin capo abajo. Si ambas tocan lo mismo en el mismo lugar, suena a barro.' },
  { n: 36, c: 'guitarra', t: 'Aprende los acordes sus2 y sus4', d: 'Gsus4, Dsus2, Asus4 y Csus2 le dan aire moderno a cualquier himno sin complicar al equipo.' },
  { n: 37, c: 'guitarra', t: 'Domina cuatro cejillas clave', d: 'F, Bm, Bb y C#m cubren casi todo el repertorio. Practícalas 5 minutos al día durante un mes.' },
  { n: 38, c: 'guitarra', t: 'Apaga las cuerdas al cortar', d: 'Cuando el equipo corta, apoya el canto de la mano sobre las cuerdas. El zumbido que queda delata al guitarrista.' },
  { n: 39, c: 'guitarra', t: 'Cambia cuerdas cada 4-6 semanas', d: 'Las cuerdas viejas no afinan y suenan opacas. Anota la fecha del último cambio en el estuche.' },
  { n: 40, c: 'guitarra', t: 'Usa reverb y delay con criterio', d: 'El delay ayuda en la eléctrica de ambiente; en la acústica rítmica solo ensucia. Si la letra se entiende peor, quítalo.' },

  // 41-50 Piano
  { n: 41, c: 'piano', t: 'Mueve lo menos posible entre acordes', d: 'Usa la inversión más cercana. Las manos que saltan suenan a estudiante; las que se quedan suenan a arreglo.' },
  { n: 42, c: 'piano', t: 'Deja el registro grave al bajo', d: 'Si hay bajista, tu mano izquierda toca una sola nota o nada por debajo del Do central.' },
  { n: 43, c: 'piano', t: 'Aprende el voicing 1-5-9', d: 'Fundamental, quinta y novena, sin tercera: suena grande, abierto y nunca choca con las guitarras.' },
  { n: 44, c: 'piano', t: 'Usa el pedal por acorde, no por canción', d: 'Cambia el pedal exactamente cuando cambia el acorde. El pedal sostenido eterno es puro lodo.' },
  { n: 45, c: 'piano', t: 'El teclado sostiene, el piano marca', d: 'Si hay dos teclados: uno hace colchón (pad) y el otro toca rítmico. Nunca los dos igual.' },
  { n: 46, c: 'piano', t: 'Practica cadencias ii–V–I en 12 tonos', d: 'Una tonalidad nueva por semana. En tres meses puedes acompañar cualquier canción en cualquier tono.' },
  { n: 47, c: 'piano', t: 'Sé el colchón durante la oración', d: 'Un solo acorde sostenido, sin melodía. La música ahí no debe llamar la atención.' },
  { n: 48, c: 'piano', t: 'Toca la melodía solo cuando la gente no la sabe', d: 'En canción nueva, duplica la melodía con la mano derecha; cuando ya la canten, quítala.' },
  { n: 49, c: 'piano', t: 'Prepara sonidos de pad y piano por canción', d: 'Guarda los presets por canción del set y numéralos. Buscar sonidos en vivo mata el momento.' },
  { n: 50, c: 'piano', t: 'Aprende a modular al vuelo', d: 'Usa el V del nuevo tono como puente. Sirve para subir medio tono en el último coro o para enlazar dos canciones.' },

  // 51-60 Batería
  { n: 51, c: 'bateria', t: 'El baterista es el reloj', d: 'Si la batería acelera, todo acelera. Tu trabajo antes que nada es constancia, no creatividad.' },
  { n: 52, c: 'bateria', t: 'Practica con clic en los audífonos', d: 'Y si es posible, usa clic en vivo. Ganar 3 BPM en cada coro cansa a la congregación.' },
  { n: 53, c: 'bateria', t: 'Fill sencillo o silencio', d: 'El fill que falla arruina la entrada del coro. Si dudas, deja el compás en blanco: siempre funciona.' },
  { n: 54, c: 'bateria', t: 'Usa cross-stick en los versos', d: 'Golpe de caja de lado: baja el volumen a la mitad sin perder el groove.' },
  { n: 55, c: 'bateria', t: 'Aprende escobillas y hot rods', d: 'En congregaciones pequeñas o salones sin aislamiento son la diferencia entre acompañar y tapar.' },
  { n: 56, c: 'bateria', t: 'Un crash por sección, no por compás', d: 'El crash marca un cambio. Si suena todo el tiempo, deja de significar algo.' },
  { n: 57, c: 'bateria', t: 'Domina el half-time para el puente', d: 'Mover la caja al tiempo 3 hace que la canción parezca más grande sin cambiar el tempo.' },
  { n: 58, c: 'bateria', t: 'Mira al director en las secciones libres', d: 'En los tags y repeticiones el ojo vale más que el oído.' },
  { n: 59, c: 'bateria', t: 'Afina y apaga los parches', d: 'Un aro de gel o una tira de cinta en el tom quita el zumbido que el sonidista no puede arreglar.' },
  { n: 60, c: 'bateria', t: 'Aprende a terminar', d: 'Crash apagado con la mano, o cortar en seco en el 1. Los finales difusos hacen que la gente no sepa si aplaudir o no.' },

  // 61-70 Arreglos
  { n: 61, c: 'arreglos', t: 'Dibuja la curva dinámica de todo el set', d: 'No todas las canciones pueden ser el clímax. Planea dónde sube y dónde baja la intensidad.' },
  { n: 62, c: 'arreglos', t: 'Primer verso casi a capela', d: 'Que la primera vez la gente oiga sobre todo voces. Entrar con todo desde el compás uno quema el efecto.' },
  { n: 63, c: 'arreglos', t: 'Cada sección añade un elemento', d: 'Verso: voz y guitarra. Pre: piano. Coro: batería completa. Es una receta simple que siempre funciona.' },
  { n: 64, c: 'arreglos', t: 'Usa el silencio como arreglo', d: 'Corta todo antes del último coro y deja solo la voz. Es el recurso más barato y más efectivo.' },
  { n: 65, c: 'arreglos', t: 'Menos notas, más espacio', d: 'Si dos instrumentos tocan en el mismo registro, uno sobra. Reparte: grave, medio, agudo.' },
  { n: 66, c: 'arreglos', t: 'Define los compases de cada sección', d: '"Puente de 8 compases", no "el puente hasta que se sienta". Lo segundo termina en caos.' },
  { n: 67, c: 'arreglos', t: 'Acorta las canciones largas', d: 'Quitar un verso repetido casi nunca se nota y mantiene viva la atención.' },
  { n: 68, c: 'arreglos', t: 'Sube medio tono solo una vez por set', d: 'La modulación es un efecto. Usada dos veces en el mismo servicio deja de emocionar.' },
  { n: 69, c: 'arreglos', t: 'Respeta la tonalidad de la congregación', d: 'Rango cómodo: de La2 a Do4 aproximadamente. Si el coro está arriba de Re4, casi nadie canta.' },
  { n: 70, c: 'arreglos', t: 'Ten preparado un final alternativo', d: 'Un "tag" del coro a media voz por si el momento pide alargar, y un corte limpio por si hay que cerrar ya.' },

  // 71-80 Voz y congregación
  { n: 71, c: 'voz', t: 'Canta la melodía, no la armonía', d: 'Quien dirige canta la línea principal. Las armonías confunden a la gente que está aprendiendo la canción.' },
  { n: 72, c: 'voz', t: 'Anuncia la canción nueva', d: '"Esta es nueva, escúchala primero y cántala en el segundo coro." Quita la incomodidad de no saberla.' },
  { n: 73, c: 'voz', t: 'Da la entrada con la voz', d: 'Canta la primera palabra medio compás antes o marca con la mano. Nunca esperes que la gente adivine.' },
  { n: 74, c: 'voz', t: 'Abre los ojos y mira a la gente', d: 'La congregación sigue a alguien que la está viendo. Es dirección, no distracción.' },
  { n: 75, c: 'voz', t: 'Calienta la voz 10 minutos', d: 'Labios vibrando, sirenas suaves, escalas cortas. Evita gritar para "calentar": eso lastima.' },
  { n: 76, c: 'voz', t: 'Hidrátate desde la noche anterior', d: 'Agua a temperatura ambiente. El café y los lácteos justo antes de cantar no ayudan.' },
  { n: 77, c: 'voz', t: 'Reparte las voces por registro', d: 'Que la segunda voz esté por debajo en versos y por encima en el último coro; no todas arriba todo el tiempo.' },
  { n: 78, c: 'voz', t: 'Deja cantar a la congregación sola', d: 'Baja tu micrófono un par de frases en el último coro. Escuchar a la iglesia cantando cambia el ambiente.' },
  { n: 79, c: 'voz', t: 'Cuida la dicción por encima del estilo', d: 'Si no se entiende la letra, no hay adoración congregacional: hay concierto.' },
  { n: 80, c: 'voz', t: 'Ten la letra visible y grande', d: 'En pantalla y en tu atril. Una palabra olvidada corta el hilo de todos.' },

  // 81-90 Sonido y tecnología
  { n: 81, c: 'sonido', t: 'Prueba de sonido con la banda completa', d: 'Primero cada instrumento solo, luego todos juntos, y al final la voz por encima de todo.' },
  { n: 82, c: 'sonido', t: 'La voz principal manda en la mezcla', d: 'Todo lo demás se acomoda debajo. Si hay que subir la voz para que se entienda, en realidad hay que bajar lo demás.' },
  { n: 83, c: 'sonido', t: 'Monitores: menos es más', d: 'Pide en tu monitor solo lo que necesitas para tocar en tiempo: clic, voz y tu instrumento.' },
  { n: 84, c: 'sonido', t: 'Usa in-ears si es posible', d: 'Bajan el volumen del escenario, mejoran la afinación y protegen tu oído a largo plazo.' },
  { n: 85, c: 'sonido', t: 'Guarda la escena de la consola', d: 'Una escena por banda. Empezar de cero cada domingo desperdicia media hora y garantiza sorpresas.' },
  { n: 86, c: 'sonido', t: 'Etiqueta todos los cables y canales', d: 'Cinta y marcador. Cuando falle algo en vivo, sabrás en 5 segundos qué desconectar.' },
  { n: 87, c: 'sonido', t: 'Ten un plan B analógico', d: 'Una guitarra acústica y una voz. Si se cae la energía o la consola, el servicio sigue.' },
  { n: 88, c: 'sonido', t: 'Revisa pilas y cables el sábado', d: 'Pilas nuevas en inalámbricos, un cable de repuesto por instrumento en el escenario.' },
  { n: 89, c: 'sonido', t: 'Mide el volumen de la sala', d: 'Usa una app de decibeles: entre 85 y 92 dB la gente canta; por encima, se calla o se va.' },
  { n: 90, c: 'sonido', t: 'Graba el servicio para revisarlo', d: 'Una grabación desde la sala (no desde la consola) muestra lo que la congregación realmente escuchó.' },

  // 91-100 Liderazgo y crecimiento
  { n: 91, c: 'liderazgo', t: 'Planea el set con anticipación fija', d: 'Mismo día de la semana, misma hora, siempre. La constancia del calendario baja la ansiedad de todos.' },
  { n: 92, c: 'liderazgo', t: 'Dos canciones nuevas al mes, máximo', d: 'La congregación necesita cantar algo 3 o 4 domingos seguidos para hacerlo suyo.' },
  { n: 93, c: 'liderazgo', t: 'Mantén un repertorio vivo de 30 canciones', d: 'Suficiente variedad para no repetir en exceso, suficiente repetición para que todos las sepan.' },
  { n: 94, c: 'liderazgo', t: 'Rota los equipos pero conserva parejas', d: 'Que bajo y batería roten juntos: la base se construye con horas compartidas.' },
  { n: 95, c: 'liderazgo', t: 'Forma a alguien para reemplazarte', d: 'Un líder que no puede faltar no es un líder, es un cuello de botella.' },
  { n: 96, c: 'liderazgo', t: 'Da retroalimentación concreta y a tiempo', d: '"El coro se aceleró 6 BPM" ayuda; "estuviste flojo" no ayuda. Y dilo en privado, no en la plataforma.' },
  { n: 97, c: 'liderazgo', t: 'Cuida los aspectos legales y de licencias', d: 'Registra las canciones que proyectas y reportas (CCLI u otra licencia local). Honra al autor que te sirvió.' },
  { n: 98, c: 'liderazgo', t: 'Cuida el orden del servicio con el pastor', d: 'Pregunta el tema de la predicación y ajusta la última canción para conectarla.' },
  { n: 99, c: 'liderazgo', t: 'Evalúa el servicio el lunes, no el domingo', d: 'En caliente todos están emocionales. Al día siguiente la evaluación es útil y no hiere.' },
  { n: 100, c: 'liderazgo', t: 'Celebra y agradece al equipo', d: 'Nombra algo concreto que cada persona hizo bien. El equipo se sostiene por cuidado, no por talento.' },
];

export function ideasByCategory(categoryId) {
  return IDEAS.filter((i) => i.c === categoryId);
}

export function categoryName(id) {
  return CATEGORIES.find((c) => c.id === id)?.name || id;
}
