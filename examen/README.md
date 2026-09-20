# Ingreso — plataforma de preguntas para la prueba de admisión

Banco de preguntas y simulacros para preparar el examen de ingreso a la
universidad, con **el temario de lo que preguntan** y **235 preguntas** con
explicación en cinco asignaturas:

| Asignatura | Temas | Preguntas | Qué cubre |
| --- | --- | --- | --- |
| **Matemáticas** | 18 | 70 | Aritmética, fracciones, razones, porcentajes, potencias, logaritmos, álgebra, ecuaciones, cuadráticas, desigualdades, funciones, sucesiones, geometría plana y del espacio, geometría analítica, estadística, probabilidad y problemas de aplicación. |
| **Trigonometría** | 10 | 38 | Grados y radianes, triángulo rectángulo, ángulos notables, circunferencia unitaria, identidades, ángulo doble, ecuaciones, gráficas, leyes de senos y cosenos, y aplicaciones. |
| **Razonamiento abstracto** | 9 | 47 | Series de figuras, matrices, el que no pertenece, rotación y simetría, plegado y cubos, series numéricas y alfanuméricas, lógica y analogías. |
| **Comprensión de lectura** | 8 | 32 | Ocho textos originales: idea principal, detalles, inferencias, vocabulario en contexto, propósito y tono, estructura, argumentación y datos. |
| **Inglés** | 12 | 48 | Tiempos verbales, condicionales, modales, pasiva, reported speech, relativas, preposiciones, cuantificadores, conectores, phrasal verbs, vocabulario y dos lecturas. |

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
| **Simulacro** | El examen completo con cronómetro, mapa de preguntas, marcas para volver y nada de ayudas. Al entregar: nota, desglose por asignatura y revisión pregunta por pregunta. |
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
    store.js            progreso en localStorage, importar y exportar
    componentes.js      cómo se pinta una pregunta (la comparten las vistas)
    ui.js               cuatro ayudas de DOM, sin framework
    banco/              las preguntas, un archivo por asignatura
    vistas/             inicio, temario, practicar, simulacro y progreso
  tests/                pruebas del banco y del motor (node, sin navegador)
```

## Pruebas

```bash
npm test                      # incluye las de esta app
node examen/tests/banco.test.js
node examen/tests/motor.test.js
```

`banco.test.js` no comprueba que las respuestas sean ciertas —eso se revisa al
escribirlas— pero sí que el banco esté sano: identificadores únicos, cuatro
opciones distintas, respuesta dentro de rango, explicación de verdad, temas que
existen en el temario, textos de lectura referenciados, figuras dibujables y
que **ningún tema del temario se quede sin preguntas**. Es la prueba que evita
el error silencioso: un tema mal escrito no se ve roto en pantalla, simplemente
deja de aparecer en su filtro.
