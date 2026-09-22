/**
 * servidor.mjs — Servidor estático mínimo para abrir la app en local.
 *
 * La app no necesita compilarse, pero sí abrirse por http:// (el navegador
 * bloquea los módulos de JavaScript cargados desde file://). Esto evita
 * depender de Python, que en Windows no siempre está instalado.
 *
 *   npm start            -> http://localhost:8080
 *   npm start -- 3000    -> otro puerto
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUERTO = Number(process.argv[2]) || Number(process.env.PORT) || 8080;

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

servidor.listen(PUERTO, () => {
  console.log(`\n  Alabanza corriendo en        http://localhost:${PUERTO}`);
  console.log(`  Estudio Bíblico corriendo en http://localhost:${PUERTO}/biblia/\n`);
  console.log('  Ctrl+C para detenerlo.\n');
});
