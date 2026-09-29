/**
 * compartir.js — Sacar cosas de la app sin servidor.
 *
 *   - **Compartir una lista por enlace**: las tareas van comprimidas dentro del
 *     propio enlace, igual que la app de alabanza comparte el set del domingo.
 *     Nadie sube nada a ningún sitio.
 *   - **Respaldo cifrado**: el archivo de copia lleva tu cartera entera, así que
 *     puede ir cifrado con una contraseña (AES-GCM con clave derivada por
 *     PBKDF2, todo con la criptografía del propio navegador).
 *   - **Fusionar dos copias**: para llevar los datos de un dispositivo a otro
 *     por archivo, sin cuentas y sin nube.
 */

import { aISO, hoy } from './fechas.js';

/* ------------------------------------------------------------------ *
 * Enlace con la lista dentro
 * ------------------------------------------------------------------ */

const bytesABase64url = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const base64urlABytes = (txt) => {
  const normal = txt.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = normal + '='.repeat((4 - (normal.length % 4)) % 4);
  return Uint8Array.from(atob(relleno), (c) => c.charCodeAt(0));
};

async function comprimir(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream === 'undefined') return bytes;
  const flujo = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function descomprimir(bytes) {
  if (typeof DecompressionStream === 'undefined') return new TextDecoder().decode(bytes);
  try {
    const flujo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(flujo).text();
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

/** Empaqueta una lista de tareas en un enlace que se puede mandar por chat. */
export async function enlaceDeLista(tareas = [], opciones = {}) {
  const paquete = {
    v: 1,
    n: opciones.nombre || 'Lista compartida',
    de: opciones.autor || null,
    f: aISO(hoy()),
    t: tareas.map((t) => ({
      titulo: t.titulo, notas: t.notas || undefined, fecha: t.fecha || undefined,
      hora: t.hora || undefined, duracion: t.duracion || undefined,
      prioridad: t.prioridad, etiquetas: t.etiquetas?.length ? t.etiquetas : undefined,
    })),
  };
  const comprimido = await comprimir(JSON.stringify(paquete));
  const base = opciones.base || (typeof location !== 'undefined' ? location.href.split('#')[0] : '');
  return `${base}#/importar-lista?d=${bytesABase64url(comprimido)}`;
}

/** Lee el paquete de un enlace compartido. */
export async function listaDeEnlace(datos) {
  if (!datos) return null;
  try {
    const texto = await descomprimir(base64urlABytes(datos));
    const paquete = JSON.parse(texto);
    if (!paquete || !Array.isArray(paquete.t)) return null;
    return { nombre: paquete.n, fecha: paquete.f, autor: paquete.de, tareas: paquete.t };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Respaldo cifrado
 * ------------------------------------------------------------------ */

const SAL_BYTES = 16;
const IV_BYTES = 12;
const ITERACIONES = 250000;

async function claveDesdeContrasena(contrasena, sal) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Cifra un texto con una contraseña. El resultado es texto, listo para un archivo. */
export async function cifrar(texto, contrasena) {
  if (!contrasena) throw new Error('Hace falta una contraseña.');
  const sal = crypto.getRandomValues(new Uint8Array(SAL_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const clave = await claveDesdeContrasena(contrasena, sal);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, new TextEncoder().encode(texto)));
  return JSON.stringify({
    formato: 'recordatorios-cifrado-v1',
    algoritmo: 'AES-GCM',
    derivacion: `PBKDF2-SHA256-${ITERACIONES}`,
    sal: bytesABase64url(sal),
    iv: bytesABase64url(iv),
    datos: bytesABase64url(cifrado),
  }, null, 2);
}

/** Descifra lo anterior. Con la contraseña mal, lo dice claramente. */
export async function descifrar(textoCifrado, contrasena) {
  let sobre;
  try {
    sobre = JSON.parse(textoCifrado);
  } catch {
    throw new Error('El archivo no tiene el formato de una copia cifrada.');
  }
  if (sobre?.formato !== 'recordatorios-cifrado-v1') throw new Error('El archivo no es una copia cifrada de esta app.');
  const clave = await claveDesdeContrasena(contrasena, base64urlABytes(sobre.sal));
  try {
    const claro = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64urlABytes(sobre.iv) }, clave, base64urlABytes(sobre.datos));
    return new TextDecoder().decode(claro);
  } catch {
    throw new Error('La contraseña no es correcta (o el archivo está dañado).');
  }
}

export function esArchivoCifrado(texto) {
  try {
    return JSON.parse(texto)?.formato === 'recordatorios-cifrado-v1';
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Fusionar dos copias
 * ------------------------------------------------------------------ */

const marca = (x) => String(x?.actualizadoEn || x?.completadaEn || x?.creadaEn || '');

/**
 * Une dos estados sin servidor: gana la versión modificada más tarde y lo que
 * solo existe en uno se conserva. Devuelve también un recuento de lo que hizo,
 * porque una fusión silenciosa es una fusión en la que no se confía.
 */
export function fusionarEstados(local = {}, remoto = {}) {
  const resumen = { añadidas: 0, actualizadas: 0, iguales: 0, proyectos: 0, planes: 0, plantillas: 0, historial: 0, tiempo: 0 };

  const porId = new Map((local.tareas || []).map((t) => [t.id, t]));
  for (const remota of remoto.tareas || []) {
    const mia = porId.get(remota.id);
    if (!mia) { porId.set(remota.id, remota); resumen.añadidas++; continue; }
    if (marca(remota) > marca(mia)) { porId.set(remota.id, remota); resumen.actualizadas++; }
    else resumen.iguales++;
  }

  const unirPor = (clave, campo, contador) => {
    const vistos = new Map((local[clave] || []).map((x) => [x[campo], x]));
    for (const x of remoto[clave] || []) {
      if (!vistos.has(x[campo])) { vistos.set(x[campo], x); resumen[contador]++; }
    }
    return [...vistos.values()];
  };

  const unirRegistros = (clave, contador) => {
    const vistos = new Set((local[clave] || []).map((x) => JSON.stringify(x)));
    const salida = [...(local[clave] || [])];
    for (const x of remoto[clave] || []) {
      const firma = JSON.stringify(x);
      if (!vistos.has(firma)) { vistos.add(firma); salida.push(x); resumen[contador]++; }
    }
    return salida;
  };

  return {
    estado: {
      ...local,
      tareas: [...porId.values()],
      proyectos: unirPor('proyectos', 'nombre', 'proyectos'),
      planes: unirPor('planes', 'id', 'planes'),
      plantillas: unirPor('plantillas', 'id', 'plantillas'),
      historial: unirRegistros('historial', 'historial'),
      tiempo: unirRegistros('tiempo', 'tiempo'),
    },
    resumen,
    frase: `${resumen.añadidas} tareas nuevas, ${resumen.actualizadas} actualizadas y ${resumen.iguales} sin cambios.`,
  };
}
