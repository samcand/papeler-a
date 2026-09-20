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
| **Hoy** | Lo de hoy y lo que se quedó atrás, cuántas horas has comprometido y los hábitos del día. |
| **Próximos** | Los siguientes 7, 14 o 30 días agrupados por fecha, más lo que no tiene fecha y hay que decidir. |
| **Calendario** | Mes, semana y día. El mes marca con puntos de color a qué módulo pertenece cada día. |
| **Enfoque** | Pomodoro, cronómetro con vueltas y temporizador, con el tiempo registrado por tarea. |
| **Planificar** | El día repartido en bloques reales y la matriz urgente/importante. |
| **Revisión** | La revisión semanal y mensual, hábitos con racha y estadísticas de las dos últimas semanas. |
| **Proyectos y filtros** | Listas propias y filtros guardados con un lenguaje corto de consultas. |

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
- **Diario de operaciones** con lo que de verdad mide un sistema: expectativa en
  R, factor de beneficio, racha, mejor y peor operación, duración media — y una
  lección escrita por operación cerrada.
- **Rebalanceo**: pesos objetivo y qué comprar o vender cuando algo se desvía.
- **Calendario del mercado**: vencimientos de opciones (tercer viernes),
  resultados trimestrales y fechas ex-dividendo, que se convierten en tareas con
  un botón.
- **Listas de chequeo** de compra, venta y post-mortem, para cuando hay prisa.

## Docencia

Semestre con cursos, grupos, horario y evaluaciones. De ahí salen solas las
tareas de preparar clase (repetidas por cada día de horario), preparar y
**calificar** cada parcial, y entregar notas antes de la fecha de la universidad.
Con la barra de avance del semestre y las rutinas de la semana.

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

Los datos viven en el almacenamiento de este navegador. Si borras los datos del
sitio, se van: exporta de vez en cuando.

## Atajos de teclado

`a` añadir · `/` buscar · `h` Hoy · `p` Próximos · `c` Calendario · `e` Enfoque ·
`i` Inversiones · `r` Revisión · `Esc` cerrar.

## Pruebas

```bash
npm test                  # 131 pruebas de lógica, sin navegador
npm run test:navegador    # recorre la app en Chromium (necesita Playwright)
```

La lógica que importa está probada aparte de la interfaz: aritmética de fechas,
motor de repeticiones, lenguaje natural, filtros, calendario, pomodoro,
planificación, cálculo de riesgo y estadísticas de cartera, plantillas de los
módulos e importación/exportación.
