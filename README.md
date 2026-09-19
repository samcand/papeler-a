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
| **100 ideas** | Lista de chequeo para mejorar la ejecución del equipo ([documento](docs/100-ideas-alabanza.md)). |

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
src/metronome.js      Metrónomo (Web Audio) y tap tempo
src/analysis.js       Análisis de audio local
src/youtube.js        Reproductor sincronizado y motor de "qué tocar ahora"
src/store.js          Guardado en el navegador, importar/exportar
src/ideas.js          Las 100 ideas (fuente única)
src/views/            Pantallas
tests/                Pruebas de la teoría musical (node --test manual)
tools/gen-docs.mjs    Genera el documento de las 100 ideas
```

## Comandos

```bash
npm start    # servidor local
npm test     # pruebas de teoría musical
npm run docs # regenera docs/100-ideas-alabanza.md desde src/ideas.js
```

## Licencias de las canciones

Las canciones de ejemplo son **himnos de dominio público**. Si agregas canciones
con derechos de autor, anota el número de licencia de tu iglesia (CCLI u otra) en
el campo correspondiente y repórtalas como corresponda: es parte de honrar al
autor que te sirvió.
