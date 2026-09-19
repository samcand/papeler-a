# Alabanza

App para manejar las canciones de alabanza de tu equipo: **letras con acordes**,
**guías de ejecución para guitarra, piano y batería**, **sincronización con un
video de YouTube** para saber qué tocar en cada instante, **academia de música**
(círculo de quintas y recursos) y **100 ideas** para ejecutar bien el servicio.

No necesita servidor, ni cuenta, ni internet (salvo para el video de YouTube).
Todo se guarda en tu dispositivo.

## Cómo abrirla

```bash
npm start          # sirve la carpeta en http://localhost:8080
```

O cualquier servidor estático (`npx serve`, extensión Live Server, etc.).
Debe abrirse por `http://`, no con doble clic en el archivo: el navegador
bloquea los módulos de JavaScript cargados desde `file://`.

También se puede publicar tal cual en GitHub Pages: son archivos estáticos.

## Qué incluye

| Pantalla | Para qué sirve |
| --- | --- |
| **Repertorio** | Todas tus canciones, con búsqueda, etiquetas, importar y exportar. |
| **Canción** | Letra con acordes, transposición al vuelo, capo sugerido, notación americana / latina (Do Re Mi) / Nashville (1 4 5), auto-scroll e impresión para el atril. |
| **Instrumentos** | Qué hace cada instrumento sección por sección: rasgueos y diagramas (guitarra), voicings e inversiones (piano), grooves y dinámica (batería), fundamentales (bajo) y guía vocal. |
| **YouTube** | Marca la estructura sobre el video y sigue en vivo qué sección, qué acorde y qué debe hacer cada instrumento en ese instante. Incluye análisis automático de un archivo de audio (tempo, energía y secciones). |
| **Practicar** | Metrónomo con acentos, tap tempo, entrenador de cambios de acorde, progreso por acorde y rutas de aprendizaje por instrumento. |
| **Academia** | Círculo de quintas interactivo, progresiones que funcionan, entrenamiento de oído, escalas y modos, lectura rítmica, cifrado Nashville y glosario. |
| **Listas** | Orden del servicio, tonalidad por canción y avisos de transición entre canciones. |
| **Afinador** | Afinador cromático por micrófono para guitarra, ukelele, bajo (4 y 5 cuerdas), cuatro y afinaciones alternativas (Drop D, DADGAD). Aguja en cents, notas de referencia y guía de cómo afinar. |
| **Estudio de audio** | Sube una canción y la app saca el tempo, la tonalidad y **los acordes con sus tiempos**; se estudia lento, en bucle A-B y con el modo karaoke. También transcribe una melodía nota por nota. |
| **100 ideas** | Lista de chequeo para mejorar la ejecución del equipo ([documento](docs/100-ideas-alabanza.md)). |

## El formato de hoja del equipo (acordes sobre la letra)

Además del formato interno, la app habla el formato de hojas que ya usa el equipo:
título con la tonalidad, autor debajo, acordes en negrita sobre la sílaba,
secciones en mayúsculas y repeticiones abreviadas con `(Igual)`.

```
10.000 RAZONES (G)
Matt Redman

CORO
C           G           D/F#         Em
Alma mía bendice, bendice al señor

CORO (Igual)
```

- **Importar**: Repertorio → *Pegar hoja de acordes*. Pega la hoja tal cual y la app
  coloca cada acorde en su sílaba (si un acorde cae uno o dos caracteres dentro de
  una palabra, lo ajusta al inicio de esa palabra; una separación silábica
  intencional como `cán-ta--le` se respeta).
- **Exportar**: en la canción → *Hoja en el formato del equipo*: texto para pegar en
  el chat, **.docx generado en el navegador** (título en negrita a 16pt, tabla sin
  bordes de 1 o 2 columnas) o el JSON que consume `generar_docx.py` de la skill
  `alabanzas-acordes`. Se exporta en la tonalidad que estés viendo, así que
  transponer y entregar la hoja es un solo paso.

## Instrumentos de cuerda

Las digitaciones de ukelele, bajo, cuatro y afinaciones alternativas no vienen de un
diccionario: se **calculan buscando sobre el mástil** las posiciones que un ser humano
puede pisar (máximo 4 dedos, estiramiento de 4 trastes, fundamental en el bajo cuando
se puede). Las pruebas verifican que el buscador reproduce 17 digitaciones estándar
de guitarra y ukelele. Cada instrumento trae además tablatura de la progresión y un
mapa del mástil con la escala de la tonalidad.

## Cómo se escribe una canción

El cuerpo de cada canción usa un formato de texto simple:

```
{Verso 1}
[G]Escribe la letra con el acorde [D]entre corchetes
justo antes de la sílaba donde cam[Em7]bia

{Coro}
| [C] | [G] | [D] |     ← compases instrumentales
// esto es una nota solo para el músico
```

Con eso la app deduce la progresión de cada sección, transpone, calcula la
línea de tiempo del video y genera las guías por instrumento.

## Qué puede y qué no puede hacer el análisis de audio

Es la parte donde conviene ser exacto, porque hay apps que prometen de más:

| | |
| --- | --- |
| **Sí** | Reconocer acordes (mayores, menores, 7, maj7, sus) de un archivo de audio con sus tiempos y su nivel de confianza; estimar tempo y tonalidad; transcribir una melodía de **una sola voz**; afinar cualquier instrumento de cuerda por micrófono. |
| **A medias** | El modo "karaoke" resta los dos canales del estéreo: quita lo que esté al centro (normalmente la voz), pero se lleva parte del bombo y del bajo. En audio mono no hace nada. |
| **No** | Separar de verdad voz, batería, bajo y guitarra en pistas independientes (lo que hace Moises). Eso necesita un modelo de IA en un servidor; ninguna página web lo hace sola. Tampoco transcribe un piano tocando acordes: la detección de melodía es monofónica. |

Todo el procesamiento ocurre dentro del navegador: **ningún archivo se sube a
ningún servidor**.

## Sobre el "análisis" de YouTube

El reproductor incrustado de YouTube **no permite leer su audio** desde el
navegador (lo bloquea por seguridad), así que no existe forma honesta de
analizar la onda del video dentro de una página web. La app resuelve eso de dos
maneras, y ambas funcionan:

1. **Marcas sobre el video**: reproduces y pulsas "Marcar aquí" al inicio de cada
   sección (o dejas que se calculen desde el BPM). A partir de ahí la app sabe en
   cada segundo qué suena y qué debe tocar cada instrumento.
2. **Análisis real de audio**: si subes el archivo de la canción (mp3, wav, m4a),
   se analiza con Web Audio y se estiman tempo, curva de energía y los puntos
   donde cambian las secciones; con un clic se convierten en marcas.

## Estructura del proyecto

```
index.html            Punto de entrada
assets/styles.css     Estilos (tema oscuro y claro, responsive, impresión)
src/music.js          Teoría: acordes, transposición, tonalidades, Nashville
src/chordpro.js       Formato de letra con acordes
src/guitar.js         Diagramas, digitaciones, rasgueos
src/piano.js          Teclado, voicings, conducción de voces
src/drums.js          Grooves, dinámica por sección, fills
src/academy.js        Círculo de quintas, intervalos, modos, progresiones
src/fretboard.js      Ukelele, bajo, cuatro y afinaciones: busca digitaciones reales
src/dsp.js            FFT, cromagrama, reconocimiento de acordes y detección de tono
src/afinador.js       Afinador por micrófono
src/transcribe.js     Audio -> acordes, tonalidad y melodía
src/audiolab.js       Reproductor de estudio: velocidad, bucle A-B, karaoke
src/hoja.js           Formato de hoja del equipo (importar y exportar)
src/docx.js + zip.js  Generación del .docx en el navegador
src/metronome.js      Metrónomo (Web Audio) y tap tempo
src/analysis.js       Análisis de audio local
src/youtube.js        Reproductor sincronizado y motor de "qué tocar ahora"
src/store.js          Guardado en el navegador, importar/exportar
src/ideas.js          Las 100 ideas (fuente única)
src/views/            Pantallas
tests/                Pruebas: teoría musical, señal (acordes y afinación),
                      digitaciones y formato de hoja
tools/gen-docs.mjs    Genera el documento de las 100 ideas
```

## Comandos

```bash
npm start    # servidor local
npm test     # 24 pruebas: teoría, señal, digitaciones y formato de hoja
npm run docs # regenera docs/100-ideas-alabanza.md desde src/ideas.js
```

## Licencias de las canciones

Las canciones de ejemplo son **himnos de dominio público**. Si agregas canciones
con derechos de autor, anota el número de licencia de tu iglesia (CCLI u otra) en
el campo correspondiente y repórtalas como corresponda: es parte de honrar al
autor que te sirvió.
