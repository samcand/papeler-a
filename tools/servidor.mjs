/**
 * servidor.mjs — Servidor estático mínimo para abrir la app en local.
 *
 * La app no necesita compilarse, pero sí abrirse por http:// (el navegador
 * bloquea los módulos de JavaScript cargados desde file://). Esto evita
 * depender de Python, que en Windows no siempre está instalado.
 *
 *   npm start            -> http://localhost:8080 (si está ocupado, prueba 8081, 8082…)
 *   npm start -- 3000    -> otro puerto
 *   node tools/servidor.mjs --abrir /biblia/   -> además abre el navegador en esa página
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const argumentos = process.argv.slice(2);
const iAbrir = argumentos.indexOf('--abrir');
const ABRIR = iAbrir >= 0 ? (argumentos[iAbrir + 1] && !argumentos[iAbrir + 1].startsWith('--') ? argumentos[iAbrir + 1] : '/') : null;
const PEDIDO = Number(argumentos.find((a) => /^\d+$/.test(a))) || Number(process.env.PORT) || 8080;
let PUERTO = PEDIDO;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const servidor = createServer(async (peticion, respuesta) => {
  try {
    const url = new URL(peticion.url, `http://localhost:${PUERTO}`);
    let ruta = decodeURIComponent(url.pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';

    // Nadie debe poder salirse de la carpeta del proyecto con "../"
    const destino = join(RAIZ, normalize(ruta).replace(/^(\.\.[/\\])+/, ''));
    if (!destino.startsWith(RAIZ)) {
      respuesta.writeHead(403).end('Fuera del proyecto');
      return;
    }

    const info = await stat(destino).catch(() => null);
    // "/biblia" sin barra final: redirigir a "/biblia/" para que carguen sus archivos
    if (info?.isDirectory() && !ruta.endsWith('/')) {
      respuesta.writeHead(301, { location: url.pathname + '/' + url.search }).end();
      return;
    }
    if (!info || info.isDirectory()) {
      respuesta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        .end(`No existe: ${ruta}`);
      return;
    }

    const contenido = await readFile(destino);
    respuesta.writeHead(200, {
      'content-type': TIPOS[extname(destino).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    }).end(contenido);
  } catch (error) {
    respuesta.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      .end('Error del servidor: ' + error.message);
  }
});

// Si el puerto está ocupado (otra copia abierta, otro programa), prueba el siguiente
servidor.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && PUERTO < PEDIDO + 20) {
    PUERTO++;
    servidor.listen(PUERTO);
    return;
  }
  console.error(`\n  No se pudo iniciar el servidor: ${error.message}\n`);
  process.exit(1);
});

servidor.on('listening', () => {
  if (PUERTO !== PEDIDO) console.log(`\n  (El puerto ${PEDIDO} estaba ocupado; se usa el ${PUERTO})`);
  console.log(`\n  Alabanza corriendo en        http://localhost:${PUERTO}`);
  console.log(`  Estudio Bíblico corriendo en http://localhost:${PUERTO}/biblia/\n`);
  console.log('  Deja esta ventana abierta mientras usas la app. Ctrl+C para detenerlo.\n');
  if (ABRIR) {
    const url = `http://localhost:${PUERTO}${ABRIR.startsWith('/') ? ABRIR : `/${ABRIR}`}`;
    const orden = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(orden, () => {});
  }
});

servidor.listen(PUERTO);
