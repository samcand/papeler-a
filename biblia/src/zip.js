/**
 * zip.js — Lector de ZIP mínimo (copia del de la app de alabanza), para abrir
 * libros .epub y documentos .docx, que por dentro son archivos ZIP.
 *
 * Solo necesita leer: entradas sin comprimir (store) y comprimidas con deflate,
 * que es lo único que usan estos archivos. El inflate lo hace el navegador con
 * DecompressionStream('deflate-raw'), así que no hace falta ninguna librería.
 */

const FIRMA_FIN_CENTRAL = 0x06054b50;
const FIRMA_CENTRAL = 0x02014b50;

/** Busca el final del directorio central (puede traer comentario al final). */
function buscarFinCentral(view) {
  const maximo = Math.min(view.byteLength, 0xffff + 22);
  for (let i = 22; i <= maximo; i++) {
    const pos = view.byteLength - i;
    if (pos < 0) break;
    if (view.getUint32(pos, true) === FIRMA_FIN_CENTRAL) return pos;
  }
  return -1;
}

async function inflar(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador no puede descomprimir el archivo. Guárdalo como .txt o .html y vuelve a intentarlo.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Lee un ZIP y devuelve sus archivos de texto.
 * @param {ArrayBuffer|Uint8Array} datos
 * @returns {Promise<{nombre: string, texto: string}[]>}
 */
export async function leerZip(datos) {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fin = buscarFinCentral(view);
  if (fin === -1) throw new Error('No parece un archivo .zip válido.');

  const totalEntradas = view.getUint16(fin + 10, true);
  let puntero = view.getUint32(fin + 16, true);
  const decodificador = new TextDecoder('utf-8');
  const archivos = [];

  for (let n = 0; n < totalEntradas; n++) {
    if (view.getUint32(puntero, true) !== FIRMA_CENTRAL) break;
    const metodo = view.getUint16(puntero + 10, true);
    const comprimido = view.getUint32(puntero + 20, true);
    const largoNombre = view.getUint16(puntero + 28, true);
    const largoExtra = view.getUint16(puntero + 30, true);
    const largoComentario = view.getUint16(puntero + 32, true);
    const offsetLocal = view.getUint32(puntero + 42, true);
    const nombre = decodificador.decode(bytes.subarray(puntero + 46, puntero + 46 + largoNombre));
    puntero += 46 + largoNombre + largoExtra + largoComentario;

    if (nombre.endsWith('/') || nombre.startsWith('__MACOSX/')) continue;

    // Cabecera local: sus campos extra pueden medir distinto que los del central
    const nombreLocal = view.getUint16(offsetLocal + 26, true);
    const extraLocal = view.getUint16(offsetLocal + 28, true);
    const inicio = offsetLocal + 30 + nombreLocal + extraLocal;
    const crudo = bytes.subarray(inicio, inicio + comprimido);

    let contenido;
    if (metodo === 0) contenido = crudo;
    else if (metodo === 8) contenido = await inflar(crudo);
    else { archivos.push({ nombre, texto: '', error: `compresión no soportada (método ${metodo})` }); continue; }

    archivos.push({ nombre, texto: decodificador.decode(contenido) });
  }
  return archivos;
}

