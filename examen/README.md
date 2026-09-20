# Ingreso — plataforma de preguntas para la prueba de admisión

Banco de preguntas y simulacros para preparar el examen de ingreso a la
universidad, con **el temario de lo que preguntan** y **1 353 preguntas** con
explicación en doce asignaturas, a razón de **10 por tema en todos los temas**:

| Asignatura | Temas | Preguntas | Qué cubre |
| --- | --- | --- | --- |
| **Matemáticas** | 18 | 180 | Aritmética, fracciones, razones, porcentajes, potencias, logaritmos, álgebra, ecuaciones, cuadráticas, desigualdades, funciones, sucesiones, geometría plana, del espacio y analítica, estadística, probabilidad y problemas. |
| **Biología y salud** | 14 | 140 | Célula y genética, sistemas del cuerpo, nutrición, enfermedades, vacunas, salud sexual, primeros auxilios, salud mental, actividad física, ecología, evolución, biodiversidad e indagación científica. |
| **Geografía** | 12 | 121 | Cartografía, la Tierra en el sistema solar, tectónica, relieve, hidrografía, clima, biomas, población, economía, geopolítica, ambiente y América Latina. |
| **Inglés** | 12 | 120 | Tiempos verbales, condicionales, modales, pasiva, reported speech, relativas, preposiciones, cuantificadores, conectores, phrasal verbs, vocabulario y lectura. |
| **Trigonometría** | 10 | 100 | Grados y radianes, triángulo rectángulo, ángulos notables, circunferencia unitaria, identidades, ángulo doble, ecuaciones, gráficas, leyes de senos y cosenos y aplicaciones. |
| **Física** | 10 | 100 | Magnitudes y vectores, cinemática, leyes de Newton, trabajo y energía, fluidos, ondas, calor, electricidad, magnetismo y gravitación. |
| **Química** | 10 | 100 | Materia y cambios, átomo, tabla periódica, enlace, nomenclatura, reacciones, estequiometría, soluciones, ácidos y bases y química orgánica. |
| **Historia de Colombia** | 10 | 100 | De los pueblos originarios al acuerdo de paz: conquista, Colonia, independencia, siglo XIX, Bogotazo y La Violencia, Frente Nacional, conflicto y Constitución de 1991. |
| **Política y ciudadanía** | 10 | 100 | Ramas del poder, Constitución, derechos humanos, democracia, sistemas políticos, elecciones, impuestos, convivencia, organismos internacionales y ética pública. |
| **Vida cotidiana y cultura general** | 10 | 100 | Dinero, precios, documentos, medidas y dosis, seguridad digital, evaluar noticias, seguridad vial, consumo responsable, primer empleo y cultura general. |
| **Razonamiento abstracto** | 9 | 90 | Series de figuras, matrices, el que no pertenece, rotación, plegado y cubos, series numéricas y alfanuméricas, lógica y analogías. |
| **Lectura crítica** | 10 | 102 | Catorce textos originales más gráficas, planos y mapas: idea principal, inferencias, vocabulario, propósito y tono, estructura, argumentación, datos, textos discontinuos y análisis de la imagen. |

No necesita servidor, ni cuenta, ni internet. Todo se guarda en tu dispositivo.

## Cómo abrirla

```bash
npm start           # desde la raíz del repositorio
```

y abre <http://localhost:8080/examen/>. Debe abrirse por `http://`, no con doble
clic: el navegador bloquea los módulos de JavaScript cargados desde `file://`.

Se puede **instalar como app** (Chrome/Edge/Android: "Instalar"; iPhone:
Compartir → "Añadir a pantalla de inicio") y a partir de ahí funciona sin
conexión. También se publica tal cual en GitHub Pages: son archivos estáticos.

## Qué incluye

| Pantalla | Para qué sirve |
| --- | --- |
| **Inicio** | Cuántas preguntas llevas hoy, racha, promedio, cuenta regresiva al examen y qué toca repasar. |
| **Temario** | El mapa del examen: cada tema dice qué hay que saber hacer, cuántas preguntas hay y cómo vas. Desde ahí se practica un tema suelto. |
| **Practicar** | Preguntas de a una con la explicación al instante. Se filtra por asignatura, tema y dificultad; las teclas 1–4 responden y Enter avanza. |
| **Simulacro** | El examen completo con cronómetro (102 preguntas en 130 minutos, o versiones corta y exprés), mapa de preguntas, marcas para volver y nada de ayudas. Al entregar: nota, desglose por asignatura y revisión pregunta por pregunta. |
| **Escribir** | El módulo de comunicación escrita del Saber Pro, que no es de opción múltiple: una consigna, un cronómetro, contador de palabras y párrafos, autoguardado, y al terminar una rúbrica de cuatro criterios y una lista de relectura. Los textos quedan guardados y se pueden descargar. |
| **Progreso** | Actividad de los últimos 14 días, aciertos por asignatura, temas más flojos, historial de simulacros, ajustes y respaldo de tus datos. |

### Repaso espaciado

Cada pregunta vive en una **caja** (1 a 6). Acertar la sube de caja y la aleja:
1, 3, 7, 16 y 35 días. Fallar la devuelve a la caja 1 y vuelve a aparecer
enseguida. El inicio muestra cuántas están vencidas y hay un modo "solo repaso
pendiente" en Practicar. Así se estudia lo que se olvida, no lo que ya se sabe.

### Las opciones se barajan

En el archivo, la respuesta correcta suele estar escrita primero. No importa:
`motor.js` baraja las cuatro opciones cada vez que se muestra la pregunta (y
mueve con ellas las figuras del razonamiento abstracto). La posición nunca es
una pista, y hay una prueba que lo verifica.

### Las figuras se dibujan, no se cargan

Las preguntas de series y matrices describen cada figura con un objeto pequeño
y `figuras.js` la convierte en SVG:

```js
{ forma: 'pentagono', giro: 45, relleno: 'rayado', puntos: 2, interior: 'circulo' }
```

Así el banco sigue siendo texto —se versiona, se revisa y se exporta— y la app
no depende de ninguna imagen.

### Las gráficas también se dibujan

Lo mismo vale para los textos discontinuos de lectura crítica y el análisis de
la imagen: `graficos.js` convierte un objeto en barras, líneas, sectores,
pictogramas, planos o mapas con leyenda.

```js
{ tipo: 'barras', titulo: 'Tasa de desempleo por trimestre (%)',
  datos: [{ etiqueta: 'I', valor: 14.2 }, { etiqueta: 'II', valor: 13.8 }] }
```

Cada gráfico lleva además un texto alternativo con sus datos, de modo que se
puede responder la pregunta con un lector de pantalla.

## Para qué prueba

El temario se armó cruzando lo que piden varias pruebas de la región. Si tu
objetivo es una prueba colombiana en concreto, hay un documento aparte con el
mapa completo —qué evalúa cada examen, cuántas preguntas trae cada área y qué
de eso cubre hoy la plataforma—:

**[Qué evalúan las pruebas colombianas](docs/pruebas-colombia.md)**: Saber 11,
examen de admisión de la Universidad Nacional y Saber Pro. Incluye lo que
todavía falta en el banco y lo que ya quedó cubierto.

Un aviso que conviene tener claro: **Saber Pro no es una prueba de ingreso**,
es el examen de salida de la universidad. Para entrar, la prueba es Saber 11.

## Qué preguntan de geografía en las pruebas de ingreso

El temario de geografía no se inventó: se armó cruzando lo que piden las
pruebas más usadas de la región.

- El **EXANI-II** del Ceneval (México) evalúa la geografía dentro del módulo de
  **Ciencias Sociales**, con un bloque de *México: geografía e historia* que
  abarca geografía física, económica, política y humana.
- El **examen de admisión de la UNAM** incluye, en el temario oficial de
  geografía, la ubicación espacial (coordenadas, husos horarios y cambio de
  fecha), la tectónica global y las zonas de riesgo sísmico y volcánico, la
  distribución de llanuras, mesetas y montañas y su relación con la población y
  las actividades económicas, la distribución de minerales y el ciclo
  hidrológico.
- El **Saber 11 del ICFES** (Colombia) no pregunta geografía como materia
  suelta: la evalúa en *Sociales y ciudadanas*, en el componente **"espacio,
  territorio, ambiente y población"**, y con tres competencias —interpretar
  (leer un mapa, una tabla o un dato), argumentar (explicar por qué ocurre algo)
  y proponer (anticipar consecuencias).

De ahí salen los tres tipos de pregunta del banco, en esa proporción:
**definición y localización** (qué es una cuenca, dónde están los Andes),
**lectura de datos** (calcular una distancia con la escala, una densidad, un
saldo migratorio, leer una pirámide de población) y **causa-consecuencia**
(por qué Quito es fresco estando en el ecuador, por qué dos sismos iguales
matan a distinta gente). La tercera es la que más aparece en examen y la que
menos se practica.

## ¿De qué tamaño debería ser el banco?

La pregunta correcta no es "cuántas preguntas quedan bonitas", sino **cuántas
hacen falta para que estudiar con el banco enseñe la materia en vez de enseñar
el banco**. Hay tres restricciones que fijan el número, y la mayor manda.

**1. Cubrir el temario, no solo tocarlo.** Son 135 temas y tres niveles de
dificultad. Con solo dos preguntas por nivel ya hacen falta unas **810**. Por
debajo de eso hay temas que solo se pueden practicar de una manera.

**2. No memorizar la respuesta.** La investigación sobre práctica de
recuperación (Karpicke y Roediger) muestra que lo que fija el aprendizaje es
**recuperar con éxito el material varias veces, espaciado en el tiempo** —de
ahí las cajas de repaso de esta app—. El efecto tiene un límite: a partir de la
cuarta o quinta vez que ves la *misma* pregunta ya no recuperas el
razonamiento, recuerdas que la respuesta era la C. Eso da una regla operativa:

> banco ≥ (preguntas que vas a responder en total) ÷ 4

Tres meses a 20 preguntas diarias son unas 1 800 respuestas: hacen falta
**~450 preguntas** para que nada se repita más de cuatro veces. Seis meses a 25
diarias son 4 500 respuestas: **~1 125**.

**3. Simulacros sin repetir.** El dato que hay sobre exámenes de práctica sitúa
el óptimo alrededor de **seis a nueve simulacros completos**. A 80 preguntas
cada uno son **480–720 preguntas** que idealmente no deberían haber salido ya
en la práctica. Como referencia técnica, en los bancos de examen adaptativo la
regla de oro mínima es que el banco sea **al menos 3 veces la longitud de la
prueba** —aquí, 240—, pero eso es el suelo para armar formas distintas, no una
meta de estudio.

Juntando las tres:

| Nivel | Tamaño | Por tema | Para qué alcanza |
| --- | --- | --- | --- |
| Suelo usable | ~600 | 6 | Cubrir el temario y un mes de práctica |
| **Meta recomendada** | **~1 000** | **10** | 3 meses de estudio serio y 6 simulacros sin repetir |
| Gran alcance | ~1 700 | 17 | 6 meses, repaso espaciado completo y 9 simulacros |

Por eso la meta del proyecto son **10 preguntas por tema**, y el orden para
llegar es: primero que ningún tema baje de 3 (eso ya lo verifica una prueba),
después subir los temas que más pesan en el examen y solo al final los de
relleno. `npm run test:examen` imprime el estado exacto:

```
Cobertura por asignatura (meta: 10 preguntas por tema)
  Matemáticas              180 preguntas · 18 temas · 10.0 por tema  → meta alcanzada
  Trigonometría            100 preguntas · 10 temas · 10.0 por tema  → meta alcanzada
  Razonamiento abstracto    90 preguntas ·  9 temas · 10.0 por tema  → meta alcanzada
  Geografía                121 preguntas · 12 temas · 10.1 por tema  → meta alcanzada
  Política y ciudadanía    100 preguntas · 10 temas · 10.0 por tema  → meta alcanzada
  Biología y salud         140 preguntas · 14 temas · 10.0 por tema  → meta alcanzada
  Vida cotidiana y cultura general 100 preguntas · 10 temas · 10.0 por tema  → meta alcanzada
  Física                   100 preguntas · 10 temas · 10.0 por tema  → meta alcanzada
  Química                  100 preguntas · 10 temas · 10.0 por tema  → meta alcanzada
  Historia de Colombia     100 preguntas · 10 temas · 10.0 por tema  → meta alcanzada
  Lectura crítica          102 preguntas · 10 temas · 10.2 por tema  → meta alcanzada
  Inglés                   120 preguntas · 12 temas · 10.0 por tema  → meta alcanzada
  TOTAL                   1353 preguntas · faltan 0 para la meta de 10 por tema
```

Con 135 temas, la meta de 10 por tema son 1 350 preguntas: el banco está
completo en ese nivel y dentro del rango de "gran alcance" de la tabla
anterior. Alcanza para tres meses de estudio y varios simulacros sin repetir
preguntas.

Una advertencia que sale de la misma evidencia: el volumen solo ayuda si se
leen las explicaciones. En los estudios sobre bancos de preguntas, lo que mejor
correlaciona con el resultado no es el número bruto de preguntas hechas, sino
el tiempo dedicado a revisarlas. Mil preguntas contestadas a la carrera valen
menos que trescientas entendidas.

## Tus propias preguntas

En **Progreso → Tus propias preguntas** se importa un `.json` con las preguntas
del profesor o de exámenes anteriores. El formato es el mismo del banco:

```json
[
  {
    "asignatura": "matematicas",
    "tema": "porcentajes",
    "dificultad": 2,
    "enunciado": "Escribe aquí la pregunta",
    "opciones": ["correcta", "otra", "otra", "otra"],
    "correcta": 0,
    "explicacion": "Por qué la primera es la correcta."
  }
]
```

`asignatura` y `tema` deben existir en el temario, y `correcta` es la posición
de la respuesta buena empezando en 0. Lo que no valide se descarta y se avisa.

## Tus datos

Todo vive en el `localStorage` de este navegador: nadie más ve tus respuestas,
y si borras los datos del sitio o cambias de dispositivo se pierden. Por eso
**Progreso → Exportar progreso** descarga un `.json` con todo (respuestas,
cajas de repaso, simulacros y ajustes) que se vuelve a cargar con *Importar*.

## Estructura

```
examen/
  index.html            la página; todo lo demás son módulos ES
  assets/estilos.css    una sola hoja de estilos, tema claro y oscuro
  src/
    app.js              router por hash y armazón
    temario.js          las asignaturas y sus temas (el mapa del examen)
    motor.js            barajado, filtros, selección, repaso y estadísticas
    figuras.js          las figuras del razonamiento abstracto, en SVG
    graficos.js         barras, líneas, sectores, pictogramas, planos y mapas
    escritura.js        consignas y rúbrica de comunicación escrita
    store.js            progreso en localStorage, importar y exportar
    componentes.js      cómo se pinta una pregunta (la comparten las vistas)
    ui.js               cuatro ayudas de DOM, sin framework
    banco/              las preguntas, un archivo por asignatura
                        (matematicas, trigonometria, abstracto, geografia,
                         ciudadania, salud, fisica, quimica, historia,
                         cotidiana, lectura, ingles)
    vistas/             inicio, temario, practicar, simulacro, escribir y progreso
  tests/                pruebas del banco y del motor (node, sin navegador)
  docs/                 qué evalúa cada prueba colombiana y qué falta cubrir
```

## Pruebas

```bash
npm test                      # incluye las de esta app
node examen/tests/banco.test.js
node examen/tests/motor.test.js
node examen/tests/escritura.test.js
```

`banco.test.js` no comprueba que las respuestas sean ciertas —eso se revisa al
escribirlas— pero sí que el banco esté sano: identificadores únicos, cuatro
opciones distintas, respuesta dentro de rango, explicación de verdad, temas que
existen en el temario, textos de lectura referenciados, figuras dibujables y
que **ningún tema del temario se quede sin preguntas** ni baje de tres. Es la
prueba que evita el error silencioso: un tema mal escrito no se ve roto en
pantalla, simplemente deja de aparecer en su filtro. Al terminar imprime el
informe de cobertura por asignatura, con lo que falta para la meta de diez
preguntas por tema.
