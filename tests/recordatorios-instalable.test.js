/**
 * recordatorios-instalable.test.js — Que la app se pueda instalar de verdad.
 *
 * Esto no prueba lógica: prueba que los archivos que el móvil necesita para
 * poner el icono en la pantalla de inicio existen y están enlazados. Se
 * comprueba aquí porque el fallo no se ve nunca en el escritorio —solo cuando
 * ya tienes un cuadrado gris en el iPhone— y porque basta con renombrar un
 * archivo para romperlo.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)), 'recordatorios');
const leer = (r) => readFileSync(resolve(RAIZ, r), 'utf8');

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

const manifiesto = JSON.parse(leer('manifest.webmanifest'));
const html = leer('index.html');
const sw = leer('sw.js');

t('el manifiesto tiene lo que exige una app instalable', () => {
  assert.ok(manifiesto.name && manifiesto.short_name);
  assert.equal(manifiesto.display, 'standalone');
  assert.ok(manifiesto.start_url.startsWith('./'), 'ruta relativa: la app vive en un subdirectorio');
  assert.ok(manifiesto.scope.startsWith('./'));
  assert.ok(/^#[0-9a-f]{6}$/i.test(manifiesto.theme_color));
});

t('hay un PNG de 192 y otro de 512: sin eso Android no ofrece instalar', () => {
  for (const tamano of ['192x192', '512x512']) {
    const icono = manifiesto.icons.find((i) => i.sizes === tamano && i.type === 'image/png');
    assert.ok(icono, `falta el icono PNG de ${tamano}`);
    assert.ok(existsSync(resolve(RAIZ, icono.src)), `no existe ${icono.src}`);
  }
});

t('hay un icono "maskable": Android recorta con la forma del móvil', () => {
  const mascara = manifiesto.icons.find((i) => i.purpose === 'maskable');
  assert.ok(mascara && existsSync(resolve(RAIZ, mascara.src)));
});

t('el apple-touch-icon es PNG: iOS no entiende el SVG', () => {
  const m = html.match(/rel="apple-touch-icon"[^>]*href="([^"]+)"/);
  assert.ok(m, 'no hay apple-touch-icon');
  assert.match(m[1], /\.png$/);
  assert.ok(existsSync(resolve(RAIZ, m[1])));
});

t('todos los iconos del manifiesto están en la caché del service worker', () => {
  for (const icono of manifiesto.icons) {
    assert.ok(sw.includes(`'./${icono.src}'`), `${icono.src} no está en ARCHIVOS de sw.js`);
  }
});

t('los PNG son PNG de verdad, no un SVG con otro nombre', () => {
  for (const icono of manifiesto.icons.filter((i) => i.type === 'image/png')) {
    const bytes = readFileSync(resolve(RAIZ, icono.src));
    assert.deepEqual([...bytes.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
    // Ancho y alto van en el IHDR, a partir del byte 16.
    assert.equal(bytes.readUInt32BE(16), Number(icono.sizes.split('x')[0]));
    assert.equal(bytes.readUInt32BE(20), Number(icono.sizes.split('x')[1]));
  }
});

t('la versión de la caché se subió al tocar los archivos', () => {
  assert.match(sw, /const VERSION = 'recordatorios-v(\d+)'/);
  assert.ok(Number(sw.match(/recordatorios-v(\d+)/)[1]) >= 12);
});

console.log(`\n${passed} pruebas de instalación en el móvil OK`);
