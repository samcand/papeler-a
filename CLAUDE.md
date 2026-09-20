# Cómo se trabaja en este repositorio

Dos aplicaciones web en el mismo sitio, sin compilación y sin dependencias:

- **Alabanza** (raíz): `index.html`, `src/`, para el equipo de música.
- **Recordatorios** (`recordatorios/`): tareas, tiempo, proyectos y la vida
  alrededor. Es donde está casi todo el trabajo reciente.

```bash
npm start                 # http://localhost:8080/  y  /recordatorios/
npm test                  # todas las pruebas de lógica, sin navegador
npm run test:navegador    # recorre recordatorios en Chromium (necesita Playwright)
npm run docs              # regenera docs/ desde los módulos de ideas
```

Node 20 o más. No hay `node_modules`, ni bundler, ni framework: si algo
necesita instalarse para funcionar, probablemente no va aquí.

## Las reglas que de verdad importan

1. **Sin servidor y sin cuentas.** Todo vive en el navegador de quien la usa
   (`localStorage`, y los adjuntos en IndexedDB). Nada sale del dispositivo.
   Cualquier idea que exija un servidor se descarta **y se anota por qué** en
   `recordatorios/src/ideas.js`; una decisión sin motivo se vuelve a discutir
   cada tres meses.
2. **Sin dependencias.** Ni en tiempo de ejecución ni para construir. El QR, el
   cifrado, el audio y los gráficos están hechos con lo que trae el navegador.
3. **Español** en nombres, comentarios y textos de interfaz: `crearTarea`,
   `estadoLimite`, `haríaCiclo`. Los tildes y la ñ en identificadores están
   bien.
4. **Honestidad antes que apariencia.** Si un dato no está, la app lo dice en
   vez de enseñar un cero con pinta de dato; si algo se estima, se dice que es
   una estimación y de qué sale. No hay precios en vivo, no hay notificaciones
   push, y donde el navegador no llega se explica y se ofrece la alternativa
   (exportar `.ics`, por ejemplo).
5. **Nada que se pueda inflar.** Las medallas y las estadísticas se recalculan
   de los datos; no se guardan contadores que alguien pueda editar.

## Cómo está partido el código

```
recordatorios/src/*.js        lógica pura, un archivo por tema, sin tocar el DOM
recordatorios/src/views/*.js  una por pantalla: vista(root, ctx)
recordatorios/src/store.js    todo el estado, guardado en localStorage
recordatorios/src/ideas.js    la hoja de ruta (hecho / pendiente / descartado)
src/ui.js                     el(), render(), button()… compartido por las dos apps
tests/*.test.js               pruebas normales de Node, sin framework
tools/servidor.mjs            servidor estático mínimo para desarrollo
```

La regla que sostiene todo esto: **la lógica no toca el DOM**. Por eso se puede
probar con `node` a secas, y por eso las vistas quedan cortas.

## Escribir una vista

```js
export function vistaLoQueSea(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());

  const pintar = () => {
    render(host, tituloVista('Título', 'subtítulo'), /* … */);
  };

  pintar();
  render(root, host);
  return () => { /* limpieza: temporizadores, audio, suscripciones */ };
}
```

- Se registra en `RUTAS` y en el menú, dentro de `recordatorios/src/app.js`.
- Si abre un panel flotante, temporizador o sonido, **devuelve la función de
  limpieza**: cambiar de pantalla no recarga la página.
- Los botones que solo son un icono llevan `title`; `ui.js` lo convierte en
  `aria-label`. Los que tienen texto, **no** llevan `aria-label` (rompe
  «Label in Name» y los selectores por nombre accesible).

## Pruebas

Node a secas, con `node:assert/strict`, sin framework ni runner:

```js
import assert from 'node:assert/strict';
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('describe lo que hace, no la función que llama', () => {
  assert.equal(/* … */);
});

console.log(`\n${passed} pruebas de lo que sea OK`);
```

- Un archivo nuevo se encadena en el script `test:recordatorios` del
  `package.json`.
- Fecha fija en las pruebas (`const HOY = '2026-09-23'`), nunca `new Date()`.
- Cada corrección de un fallo trae su prueba, con un nombre que explique el
  caso («la racha salta los días en que no tocaba: el sábado no la rompe»).
- `tests/recordatorios-humo.mjs` recorre la app de verdad en Chromium. Ha
  encontrado fallos que la lectura del código no encontró; vale la pena
  añadirle unas líneas cuando se hace una pantalla nueva.

## Al terminar algo

1. `npm test` y, si se tocó interfaz, `npm run test:navegador`.
2. Marcar la idea como `'hecho'` en `recordatorios/src/ideas.js`, con una
   descripción de **lo que la app acabó haciendo** (no de lo que se pensaba
   hacer), y `npm run docs`.
3. Actualizar `recordatorios/README.md` si cambia algo que se usa.
4. Subir la caché del service worker (`VERSION` en `recordatorios/sw.js`) y
   añadir ahí los archivos nuevos, o quien tenga la app instalada se queda con
   los viejos.

## Mensajes de commit

En español, explicando **por qué**, no solo qué. El título en una línea, y
debajo el problema que había. Los fallos encontrados por el camino se cuentan,
no se esconden.
