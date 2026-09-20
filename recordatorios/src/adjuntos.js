/**
 * adjuntos.js — Archivos y fotos pegados a una tarea.
 *
 * La foto del pizarrón o el PDF del examen viven con la tarea, no en una
 * carpeta de descargas que nadie vuelve a abrir. Se guardan en **IndexedDB**,
 * no en `localStorage`: ahí caben megabytes y no compiten con el resto del
 * estado, que es pequeño y se guarda entero en cada cambio.
 */

const BASE = 'recordatorios-adjuntos';
const ALMACEN = 'archivos';
export const LIMITE_BYTES = 5 * 1024 * 1024;

let conexion = null;

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((resolver, rechazar) => {
    if (typeof indexedDB === 'undefined') { rechazar(new Error('Este navegador no guarda archivos.')); return; }
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => {
      const bd = peticion.result;
      if (!bd.objectStoreNames.contains(ALMACEN)) {
        const almacen = bd.createObjectStore(ALMACEN, { keyPath: 'id' });
        almacen.createIndex('tarea', 'tareaId', { unique: false });
      }
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
  return conexion;
}

function transaccion(modo) {
  return abrir().then((bd) => bd.transaction(ALMACEN, modo).objectStore(ALMACEN));
}

const esperar = (peticion) => new Promise((resolver, rechazar) => {
  peticion.onsuccess = () => resolver(peticion.result);
  peticion.onerror = () => rechazar(peticion.error);
});

/** Guarda un archivo pegado a una tarea. Devuelve su ficha. */
export async function guardar(tareaId, archivo) {
  if (archivo.size > LIMITE_BYTES) {
    throw new Error(`“${archivo.name}” ocupa ${Math.round(archivo.size / 1024 / 1024)} MB y el tope son ${LIMITE_BYTES / 1024 / 1024} MB.`);
  }
  const ficha = {
    id: 'adj-' + Math.random().toString(36).slice(2, 10),
    tareaId,
    nombre: archivo.name,
    tipo: archivo.type || 'application/octet-stream',
    bytes: archivo.size,
    guardadoEn: new Date().toISOString(),
    datos: await archivo.arrayBuffer(),
  };
  const almacen = await transaccion('readwrite');
  await esperar(almacen.add(ficha));
  return { ...ficha, datos: undefined };
}

/** Fichas (sin el contenido) de los adjuntos de una tarea. */
export async function listar(tareaId) {
  const almacen = await transaccion('readonly');
  const todos = await esperar(almacen.index('tarea').getAll(tareaId));
  return todos.map(({ datos, ...ficha }) => ficha);
}

export async function obtener(id) {
  const almacen = await transaccion('readonly');
  return esperar(almacen.get(id));
}

export async function borrar(id) {
  const almacen = await transaccion('readwrite');
  return esperar(almacen.delete(id));
}

/** Borra los adjuntos de una tarea que ya no existe. */
export async function borrarDeTarea(tareaId) {
  const almacen = await transaccion('readwrite');
  const fichas = await esperar(almacen.index('tarea').getAll(tareaId));
  for (const f of fichas) almacen.delete(f.id);
  return fichas.length;
}

/** Cuánto ocupan todos los adjuntos, para decirlo en Ajustes. */
export async function espacioUsado() {
  const almacen = await transaccion('readonly');
  const todos = await esperar(almacen.getAll());
  return {
    archivos: todos.length,
    bytes: todos.reduce((s, f) => s + (f.bytes || 0), 0),
  };
}

/** Un objeto URL para ver o descargar el archivo; recuérdalo revocar. */
export function urlDe(ficha) {
  return URL.createObjectURL(new Blob([ficha.datos], { type: ficha.tipo }));
}

export function tamañoLegible(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}
