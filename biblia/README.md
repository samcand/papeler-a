# Estudio Bíblico

App de estudio de la Biblia, pensada como un Logos sencillo y en español:
**texto bíblico con versiones en paralelo, referencias cruzadas, notas,
resaltados a nivel de palabra, búsqueda, estudio de palabras y planes de
lectura**. No necesita cuenta, servidor ni internet: todo se guarda en tu
dispositivo.

## Cómo abrirla

```bash
npm start            # desde la raíz del repositorio
```

y entra a **http://localhost:8080/biblia/**. Debe abrirse por `http://` (no
con doble clic en el archivo). Se puede instalar como app (Chrome/Edge/Android:
"Instalar"; iPhone: Compartir → "Añadir a pantalla de inicio") y funciona sin
conexión. También se puede publicar tal cual en GitHub Pages: son archivos estáticos.

## Qué incluye

| Pantalla | Para qué sirve |
| --- | --- |
| **Leer** | El texto en Reina-Valera 1909, con KJV, hebreo (AT) o griego (NT) en columnas paralelas. Navegador de libros y capítulos, capítulo anterior/siguiente con ← →, modo párrafo o un versículo por línea. |
| **Guía del pasaje** | Al tocar un versículo: sus referencias cruzadas con el texto a la vista (ordenadas por votos), tus notas, el mismo versículo en las otras versiones y sus palabras para estudiarlas. |
| **Resaltar y subrayar** | Selecciona cualquier fragmento (de una palabra a varios versículos) y elige entre 6 colores, subrayado o negrita. La goma (⌫) borra solo la parte seleccionada. Ctrl+Z deshace. |
| **Notas** | Sobre un versículo, un rango o un capítulo, o apuntes libres (bosquejos, sermones). Markdown sencillo, etiquetas (`#gracia`), y las citas que escribas ("ver Ro 5:8") se vuelven enlaces con vista previa al pasar el cursor. |
| **Buscar** | En toda la Biblia o por testamento, sección o libro: palabras, `"frase exacta"`, `amor|caridad`, `justific*` y `-excluir`. Sin distinguir tildes. Gráfico de resultados por libro. |
| **Palabras** | Estudio de una palabra: apariciones, libros y secciones donde se concentra, primera y última mención, y con qué palabras suele aparecer. |
| **Cuaderno** | Todas tus notas (con buscador y filtro por etiqueta y libro), tus resaltados por color y tus marcadores. Exporta tus notas a Markdown. |
| **Plan** | Planes de lectura (Biblia en un año, NT en 90 días, evangelios, Salmos, cartas de Pablo…), lectura de hoy, racha, y un mapa de los 1189 capítulos con lo que ya leíste. |
| **Ajustes** | Tema oscuro, claro o sepia; tamaño y tipo de letra; versiones; umbral de votos de las referencias; exportar e importar un respaldo. |

La caja de arriba entiende citas en español: `Jn 3:16`, `1 Co 13`,
`Primera de Corintios 13:4`, `sal 23`, `Ro 8:28-9:1`, `Judas 3`. Si no es una
cita, busca las palabras. Atajo: `/`.

## Textos y datos

| Dato | Fuente | Licencia |
| --- | --- | --- |
| Reina-Valera 1909 | scrollmapper/bible_databases | Dominio público |
| King James Version (1769) | scrollmapper/bible_databases | Dominio público |
| Códice de Leningrado (hebreo, AT) | scrollmapper/bible_databases | Dominio público |
| Textus Receptus (griego, NT) | scrollmapper/bible_databases | Dominio público |
| ~200 000 referencias cruzadas | [OpenBible.info](https://www.openbible.info/labs/cross-references/) | CC-BY |

La Reina-Valera 1960 tiene derechos de autor (Sociedades Bíblicas Unidas), por
eso no viene incluida.

Los datos ya generados están en `biblia/datos/`, partidos por libro para que
abrir un capítulo solo descargue ese libro. Para regenerarlos:

```bash
npm run biblia:datos                        # descarga las fuentes de GitHub
node tools/biblia-datos.mjs ./mis-fuentes   # o usa copias locales
```

## Estructura

```
biblia/
  index.html, sw.js, manifest.webmanifest, assets/
  datos/            texto por versión y libro, referencias cruzadas, índice
  src/
    libros.js       los 66 libros, ids de versículo (Juan 3:16 = 43003016)
    referencias.js  leer y escribir citas en español, detectarlas en un texto
    marcas.js       resaltados a nivel de carácter, que cruzan versículos
    notas.js        Markdown seguro, etiquetas, filtros, exportar
    busqueda.js     consultas, concordancia y estudio de palabras
    plan.js         planes de lectura repartidos por versículos
    texto.js        carga de datos y referencias cruzadas
    almacen.js      tus datos en localStorage, deshacer, respaldo
    vistas/         pantallas (lector, buscar, palabra, cuaderno, plan, ajustes)
```

Las pruebas (`npm test`) cubren el analizador de citas, los resaltados, la
búsqueda, las notas, los planes y la integridad de los datos.
