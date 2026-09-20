# Recordatorios

App de tareas y gestión del tiempo al estilo de Todoist o TickTick, pero hecha
alrededor de **tu** trabajo: inversiones, docencia, investigación, el equipo de
alabanza y lo personal.

Sin servidor, sin cuenta y sin internet. Todo se guarda en tu dispositivo.

```bash
npm start                 # http://localhost:8080
# y abre http://localhost:8080/recordatorios/
```

Se instala como app (Chrome/Edge/Android: “Instalar”; iPhone: Compartir →
“Añadir a pantalla de inicio”) y a partir de ahí funciona sin conexión.

## Lo básico, que tiene que estar bien

| Pantalla | Para qué sirve |
| --- | --- |
| **Bandeja** | Donde se suelta lo capturado sin decidir nada, con un modo de procesarlo de una en una. |
| **Tablero** | Kanban cuyas columnas son fechas: arrastrar una tarjeta es cambiarle el día. |
| **Concentración** | Una tarea, su reloj y sus subtareas. El resto de la app también distrae. |
| **Papelera y archivo** | Lo borrado espera 30 días; lo terminado se archiva sin perderse (en Ajustes). |
| **Hoy** | El resumen del día, lo de hoy, lo que se quedó atrás, las horas comprometidas y los hábitos. |
| **Próximos** | Los siguientes 7, 14 o 30 días agrupados por fecha, más lo que no tiene fecha y hay que decidir. |
| **Calendario** | Mes, semana y día. El mes marca con puntos de color a qué módulo pertenece cada día. |
| **Enfoque** | Pomodoro, cronómetro con vueltas y temporizador, con el tiempo registrado por tarea. |
| **Planificar** | El día repartido en bloques reales y la matriz urgente/importante. |
| **Revisión** | La revisión semanal y mensual, hábitos con racha y estadísticas de las dos últimas semanas. |
| **Proyectos (Gantt)** | Planificación tipo MS Project: EDT, dependencias, ruta crítica, recursos, nivelación y seguimiento. |
| **Plantillas** | Listas que se repiten enteras: eliges el día señalado y las fechas se calculan solas. |
| **Listas y filtros** | Listas propias y filtros guardados con un lenguaje corto de consultas. |
| **Lo que queda** | La hoja de ruta: lo hecho, lo pendiente por olas y lo descartado con su motivo. |

### Escribir una tarea como se habla

La caja de entrada entiende español y **enseña lo que entendió antes de
guardar**, que es lo que evita las sorpresas:

```
Revisar tesis de NVDA mañana 9am p1 #Cartera @analisis cada tercer viernes
```

- **Fechas**: `hoy`, `mañana`, `pasado mañana`, `el martes`, `próximo martes`,
  `en 3 días`, `en 2 semanas`, `15 de octubre`, `12 oct`, `12/10`, `2027-01-05`,
  `fin de mes`, `tercer viernes`.
- **Horas**: `9am`, `9:30 pm`, `14:30`, `a las 8`.
- **Repeticiones**: `cada día`, `cada 3 días`, `cada lunes y miércoles`,
  `cada 2 semanas`, `cada día hábil`, `el 15 de cada mes`, `el último día del mes`,
  `cada tercer viernes`, `cada 3 de mayo`, y cualquiera de ellas
  `desde completada` (cuenta desde que la terminas, no desde la fecha prevista).
- **Resto**: `p1`…`p4` o `!!1`, `#proyecto`, `@etiqueta`, `30min`, `1h`.

Una tarea repetida no se “pierde” si te atrasas: al completarla se reprograma
en la siguiente ocurrencia futura, no en una fecha ya pasada.

### Capturar primero, decidir después

La **bandeja de entrada** recoge lo que escribas sin proyecto ni módulo. Cuando
toca vaciarla, el modo **procesar una por una** pone cada cosa delante con las
decisiones a un toque: cuándo (hoy, mañana, esta semana, algún día), de qué es
(módulo), a qué lista, **hacerla ya** si son dos minutos, o convertirla en un
proyecto con su plan. Con atajos: `H` hoy, `M` mañana, `S` esta semana, `Enter`
saltar, `Supr` borrar.

La app solo insiste con la bandeja cuando de verdad toca: cinco cosas
acumuladas o algo esperando más de tres días.

### Plantillas de listas

Un parcial, un congreso, el cierre de semestre o estudiar una inversión son
siempre los mismos pasos con las mismas distancias entre ellos. Una plantilla
guarda esos **desfases relativos a un día ancla**: eliges la fecha del examen (o
del viaje, o de la decisión) y la app calcula el resto, hacia atrás y hacia
adelante, con hora, duración y prioridad de cada paso. Antes de crear nada se ve
la lista exacta de fechas.

Vienen seis puestas — parcial, congreso, cierre de semestre, *due diligence*,
semana del servicio y viaje — y cualquier proyecto que ya tengas se puede
**guardar como plantilla**: la app toma la fecha más tardía como ancla y
convierte el resto en desfases.

### Las tres del día, y lo que llevas posponiendo

En **Hoy**, tres huecos: los eliges con ☆ o deja que los proponga (lo urgente
primero, lo que tiene hora después). Y cuando algo se ha pospuesto cinco veces,
la app lo pone delante con las cuatro salidas honestas: hacerla hoy, quitarle la
fecha, trocearla o borrarla. Cinco aplazamientos son una decisión tomada sin
admitirla.

### Nada se pierde

- **Papelera**: lo borrado espera 30 días y se restaura con un botón.
- **Archivar**: lo terminado deja de salir en las listas pero sigue contando en
  las estadísticas; hay un botón para archivar de golpe lo completado hace más
  de un mes.
- **Deshacer con Ctrl+Z**: las últimas quince operaciones, incluidas las que
  tocan muchas tareas a la vez (mover todas a hoy, nivelar recursos, importar
  del bróker, aplicar un escenario).

### El resumen del día

Al entrar por la mañana, una tarjeta con lo que necesitas saber en diez
segundos: **las tres cosas** que harían que el día valga la pena (lo urgente
primero, después lo que tiene hora), lo que hay con hora, lo atrasado, si el día
no cabe en el día, las alertas de la cartera y cómo fue ayer. Se cierra al pulsar
**Empezar** y no vuelve hasta el día siguiente; la hora se configura en Ajustes y,
con los avisos permitidos, también llega como notificación.

### Prioridades y repetición, con botones

Todo lo que se puede escribir también se puede pulsar, que es lo que hace falta
cuando no recuerdas la sintaxis:

- **Prioridad**: cuatro banderas de color (P1 urgente a P4 normal) en el panel de
  la tarea, o `p1` / `!!1` escribiéndolo. El color se ve en la casilla de cada
  tarea, así que la lista se lee de un vistazo.
- **Repetición**: un constructor visual con el tipo (día, semana, mes, año, días
  hábiles o un día concreto del mes), cada cuántos, qué días de la semana, qué
  día del mes, si se cuenta **desde que la completas** y hasta cuándo repetir.
  Debajo, seis atajos de un toque y el campo de texto libre — y siempre la
  previsualización de las tres próximas fechas antes de guardar.

### Buscar con operadores

La caja de búsqueda detecta si escribes un filtro (`#Cartera & p1`, `hoy`,
`@espera`) y lo aplica como tal; si no, busca texto en títulos y notas. Los
resultados salen agrupados por proyecto.

### Filtros guardados

```
hoy | vencidas
#Cartera & p1
7 días & !@espera
módulo:docencia & sin fecha
buscar: parcial & antes de: 15 de octubre
```

Operadores `&` (y), `|` (o), `!` (no) y paréntesis. Vienen ocho filtros puestos
y puedes crear los tuyos.

## Gestión del tiempo

- **Pomodoro** con duraciones configurables, descanso largo cada N ciclos y
  encadenado automático. El tiempo se mide con marcas de reloj reales: si el
  móvil suspende la pestaña o bloqueas la pantalla, al volver la cuenta está bien.
- **Cronómetro** con vueltas (parcial y total) que se puede guardar como tiempo
  trabajado en una tarea.
- **Temporizador** con atajos: 2 minutos (la regla de los dos minutos), 45 de
  bloque profundo, 90 de sesión larga.
- **Planificador del día**: reparte las tareas en bloques respetando las horas
  fijas, mete descansos cada 90 minutos y **dice qué no cabe**. Un día no rinde
  más por meterle más cosas en la lista.
- **Registro de tiempo** por tarea y por día, con racha y gráfico de 14 días.
- **Informe de 28 días**: a dónde se fue el tiempo por módulo, por proyecto y por
  semana, y cuánto se desvía de lo que habías planificado.
- **Modo concentración**: pantalla completa con una tarea, su reloj y sus
  subtareas; se sale con Esc.
- **Tu capacidad real** (en Planificar): mapa de calor de cuatro semanas con las
  horas disponibles frente a las comprometidas, el reparto entre los cinco
  módulos y la frase que importa — *«has prometido 46 h y tienes 40: no es
  optimismo, no cabe»*.
- **Estimado frente a real**: compara lo que dijiste que ibas a tardar con lo
  medido y saca tu factor de corrección — por **mediana**, para que un día
  desastroso no desplace la cuenta, y por módulo cuando hay datos suficientes
  (calificar y leer un artículo no fallan igual). Al estimar una tarea nueva, la
  app avisa: *«con tu historial esto son más bien 90 min»*.

## Compartir sin servidor

Desde cualquier lista, **📤 Compartir** mete las tareas comprimidas **dentro del
propio enlace** y lo acompaña de un QR. Quien lo abre ve qué trae antes de
aceptar nada. No hay servidor, ni cuentas, ni nada que se suba a ningún lado —
igual que la app de alabanza comparte el set del domingo.

La app también se registra como destino de **Compartir** del sistema: mandarle
un enlace o un texto desde otra app crea una tarea en la bandeja.

## Proyectos (planificación tipo Project)

Cuando una cosa deja de ser una tarea y pasa a ser un proyecto con fases,
dependencias y fechas que se arrastran unas a otras:

- **EDT** con tareas resumen que se calculan solas (fechas, duración y avance
  ponderado por duración) e indentación con un botón.
- **Dependencias de los cuatro tipos** — fin a comienzo, comienzo a comienzo,
  fin a fin y comienzo a fin — con **desfase** positivo o negativo, para
  solapar tareas o dejar tiempo de espera entre ellas.
- **Ruta crítica y holgura** por el método CPM: pasada hacia adelante, pasada
  hacia atrás, holgura total y holgura libre. En rojo, lo que mueve la fecha
  final; con número de días, lo que puede esperar.
- **Diagrama de Gantt** con barras, hitos en rombo, porcentaje de avance,
  flechas de dependencia, línea de hoy y escala de días, semanas o meses.
- **Duraciones en días hábiles**, con los festivos que tú pongas: nada se
  planifica en domingo por accidente.
- **Recursos**: carga por persona y detección de sobreasignación (más del
  100 % un mismo día).
- **Nivelación automática**: retrasa la tarea con más holgura hasta deshacer el
  choque. No toca la ruta crítica salvo que lo pidas, y cuando separar dos
  tareas no cabe en la holgura lo dice con números (*«pide 10 días y solo hay 7:
  el proyecto se retrasaría 3»*) en vez de alargar el plan a tus espaldas. Cada
  movimiento se ve en una tabla y se deshace de una vez.
- **Seguimiento**: línea base, desviación en días hábiles y **valor ganado**
  (BAC, PV, EV, AC, SPI y CPI) para saber si vas tarde o vas caro antes de que
  sea evidente.
- **Fecha probabilística**: tres duraciones por tarea (la pesimista sale de tu
  factor medido si no la escribes), 2.000 simulaciones y los percentiles que
  sirven para prometer — P50 es la fecha que cumples la mitad de las veces, P80
  la que puedes comprometer. Con histograma y la probabilidad de llegar a la
  fecha que elijas.
- **¿Qué pasa si…?**: retrasar o alargar una tarea y ver, sobre una copia del
  plan, qué se mueve en cascada, qué hitos se van, si cambia la ruta crítica y
  cuánto se retrasa el final. Se aplica de verdad solo si quieres.
- **Plantillas** listas: artículo de investigación, montar un curso y estudio de
  una inversión, con sus dependencias ya puestas.
- **Avisos del cronograma**: lo que no cabe antes de la fecha comprometida, las
  chinchetas que ya no mandan, las tareas que flotan sin depender de nada, la
  **ruta casi crítica** (tres días o menos de holgura) y el margen hasta cada hito.
- **Valor ganado en días de trabajo** con ETC, VAC, TCPI y **curva S**. Sin días
  reales apuntados, el CPI se deja en blanco en vez de inventarse un número.
- **Simulación de ausencia**: "me voy dos semanas" empuja solo las tareas de esa
  persona y dice si la holgura lo absorbe o la fecha se mueve.
- **Arrastrar para reprogramar**: mover una barra fija la tarea a esa fecha (queda
  marcada con 📌, y la chincheta la suelta) y estirar su borde derecho cambia la
  duración. Al soltar se recalculan dependencias, holguras y ruta crítica.
- El plan se **lleva a la agenda** con un botón: cada tarea con su fecha de
  comienzo, prioridad 1 si es crítica y la holgura anotada.

Validaciones incluidas: dependencias circulares, dependencias a tareas
borradas, tareas que dependen de sí mismas y duraciones negativas.

## Inversiones

Es el módulo principal. No hay precios en vivo: los escribes tú. A cambio
funciona sin internet, no depende de ninguna API y nada sale del dispositivo.

- **Cartera**: posiciones con coste, precio, stop, objetivo, sector, tesis y
  fecha de última revisión. Valor, resultado abierto, pesos y concentración (HHI).
- **Alertas**: posición por encima de tu tope, sector concentrado, **precio que
  ya cruzó el stop**, objetivo alcanzado, pérdida por debajo del umbral, tesis
  sin escribir y tesis sin revisar desde hace meses.
- **Tamaño de posición**: cuántas acciones comprar para arriesgar solo el % que
  decidiste, con avisos si el stop está tan cerca que te saca el ruido normal
  del mercado o tan lejos que la tesis no lo aguanta.
- **Prueba de estrés**: qué pasa si cae un 10, un 20 o un 35 %, o si se hunde un
  sector entero. Lo que importa no es el número final sino **qué stops saltan**.
- **Plan de aportes**: objetivo del año, cuánto llevas, cuánto deberías llevar y
  a qué ritmo mensual haría falta ir.
- **Informe fiscal** del año: ganancias, pérdidas, comisiones y operación por
  operación, exportable a CSV. Con aviso de recompra poco después de vender en
  pérdidas — es un informe, no un consejo fiscal: la norma la pones tú.
- **Importar del bróker**: lee el CSV de operaciones (reconoce los nombres de
  columna de cada bróker y los dos formatos de número), empareja compras y
  ventas por **FIFO** y reconstruye posiciones y diario, avisando de lo que no
  cuadra.
- **Diario de operaciones** con lo que de verdad mide un sistema: expectativa en
  R, factor de beneficio, racha, mejor y peor operación, duración media — y una
  lección escrita por operación cerrada.
- **Rebalanceo**: pesos objetivo y qué comprar o vender cuando algo se desvía.
- **Calendario del mercado**: vencimientos de opciones (tercer viernes),
  resultados trimestrales y fechas ex-dividendo, que se convierten en tareas con
  un botón.
- **Listas de chequeo** de compra, venta y post-mortem, para cuando hay prisa.

## Docencia

Semestre con cursos, grupos, horario y evaluaciones. Al acabar, **clonar a un
semestre nuevo** corre todas las fechas en semanas enteras, para que los martes
sigan siendo martes. De ahí salen solas las
tareas de preparar clase (repetidas por cada día de horario), preparar y
**calificar** cada parcial, y entregar notas antes de la fecha de la universidad.
Con la barra de avance del semestre y las rutinas de la semana.

## Esperando a otros

El coautor, la revista, el estudiante, el banco: lo que no depende de ti tiene
su propio campo (quién, desde cuándo y hasta cuándo es razonable esperar). La
**Revisión** los lista con los días que llevan, marca en rojo los que se pasaron
de plazo y crea la tarea de perseguir, que es la única parte que sí depende de ti.

## Investigación

Cartera de artículos por estado (idea → datos → borrador → revisión de
coautores → enviado → en revisión → revisión menor/mayor → aceptado → publicado,
o rechazado). Cada estado sabe cuál es el siguiente paso y **cuántos días son
demasiados**: un manuscrito que lleva 90 días “en revisión” genera la tarea de
escribir al editor. Además, convocatorias con su fecha de cierre y las tesis
dirigidas con su frecuencia de asesoría.

## Alabanza

La semana del servicio armada hacia atrás desde el domingo: elegir repertorio,
enviar la lista y las hojas al equipo, ensayo y llegada para la prueba de
sonido. Enlaza con la [app de alabanza](../README.md) de este mismo repositorio.

## Personal y GTD

Bandeja de entrada, revisión semanal de diez puntos, revisión mensual, hábitos
con racha (actual y mejor) y el aviso de las tareas que llevan más de un mes
abiertas: hacer, delegar, agendar o borrar.

## Avisos, calendario y respaldo

Sin servidor **no hay notificaciones push**: la app avisa mientras esté abierta
o instalada en segundo plano. Para lo que no se puede olvidar, exporta un `.ics`
y deja que el teléfono ponga la alarma; las repeticiones se traducen a `RRULE`,
así que “cada tercer viernes” sigue repitiéndose en tu calendario.

- Exportar: copia completa `.json`, tareas `.csv`, calendario `.ics` y el día en
  Markdown.
- Importar: tu copia `.json` y el CSV que exportan **Todoist** y **TickTick**.

- **Respaldo cifrado**: la copia lleva tu cartera entera, así que puede salir
  cifrada con contraseña (AES-GCM con clave derivada por PBKDF2, todo en tu
  navegador). Sin la contraseña no hay forma de abrirla, tampoco para ti.
- **Fusionar copias entre dispositivos**: se unen dos archivos y gana la versión
  modificada más tarde; lo que solo existe en uno se conserva. Sin cuentas y sin
  nube.
- **Franjas de silencio**: no molestar de noche o los días que elijas.

Los datos viven en el almacenamiento de este navegador (y los archivos adjuntos
en IndexedDB). Si borras los datos del sitio, se van: exporta de vez en cuando.

## Lo que queda

La pestaña **Lo que queda** es la hoja de ruta real de la app: **78 hechas, 20
pendientes y 12 descartadas**. Las olas 1 y 2 están terminadas; lo que queda es
la ola 3, el "algún día". Lo pendiente va en tres olas —lo próximo, después
y algún día— y cualquier entrada se convierte en tarea con un botón.

Lo descartado se queda escrito **con su motivo** (notificaciones push, correo a
tarea, asignar responsable, sincronización con Google Calendar…): casi todo cae
por una de dos razones, que necesita un servidor o que necesita un equipo, y la
app no tiene ni lo uno ni lo otro. Dejarlo anotado evita volver a discutirlo
cada tres meses.

Las entradas 101-110 salieron de revisar una lista de 200 funcionalidades de
herramientas profesionales de gestión de proyectos (Jira, Asana, Project, PMI) y
quedarse solo con lo que sirve a una persona que trabaja sola: simulación de
impacto, capacidad real entre módulos, fecha probabilística, salud explicada,
valor ganado en horas y un copiloto local que calcula en vez de inventar.

El mismo contenido está en
[`docs/hoja-de-ruta-recordatorios.md`](../docs/hoja-de-ruta-recordatorios.md),
que se genera con `npm run docs`.

## Atajos de teclado

`a` añadir · `/` buscar · `h` Hoy · `p` Próximos · `c` Calendario · `e` Enfoque ·
`b` Bandeja · `t` Tablero · `i` Inversiones · `g` Proyectos · `r` Revisión ·
`Ctrl+Z` deshacer · `Alt+↑/↓` reordenar en orden manual · `Esc` salir o cerrar.

La app es navegable entera con el teclado: hay enlace para saltar los menús, el
foco se ve siempre, los botones que solo son iconos tienen nombre para los
lectores de pantalla y lo que se puede arrastrar también se puede mover con
Alt y las flechas.

## Pruebas

```bash
npm test                  # 248 pruebas de lógica, sin navegador
npm run test:navegador    # recorre la app en Chromium (necesita Playwright)
```

La lógica que importa está probada aparte de la interfaz: aritmética de fechas,
motor de repeticiones, lenguaje natural, filtros, calendario, pomodoro,
planificación, cálculo de riesgo y estadísticas de cartera, plantillas de los
módulos, cronograma de proyectos (CPM, calendario laboral, recursos, valor
ganado, nivelación de recursos), bandeja de entrada, resumen del día,
calibración de estimaciones, plantillas de listas e importación/exportación.
