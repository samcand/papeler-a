/**
 * nube.js — Sincronizar entre dispositivos sin entregarle los datos a nadie.
 *
 * Durante mucho tiempo esta app no tuvo servidor, y esa era la gracia. Esto no
 * la traiciona: lo que sube es el estado **ya cifrado** con una contraseña que
 * solo está en tus aparatos. El servidor (ver `nube/worker.js`) guarda un
 * bloque de bytes y no puede leerlo.
 *
 * El baile, cada vez que toca sincronizar:
 *
 *   bajar -> descifrar -> fusionar con lo de aquí -> cifrar -> subir
 *
 * Fusionar es **unir**, nunca reemplazar (ver `fusion.js`), así que ninguna de
 * las dos partes pierde nada por el camino. Si mientras tanto otro dispositivo
 * subió algo, el servidor contesta 409 y se repite el baile con lo nuevo. Por
 * eso el peor caso de un choque es sincronizar dos veces.
 *
 * Lo que NO hace, y conviene tener claro:
 *   - No hay cuentas: el «código de sincronización» es la llave. Quien lo
 *     tenga puede sobrescribir el bloque; sin la contraseña no puede leerlo.
 *   - Sin contraseña no hay recuperación. Ni para ti.
 *   - Sin conexión la app sigue funcionando entera; lo pendiente sube después.
 */

import { cifrar, descifrar } from './compartir.js';
import { SOLO_AQUI, fusionar } from './fusion.js';

export const CLAVE_NUBE = 'recordatorios.nube';

export const CONFIG_INICIAL = {
  url: '',
  codigo: '',
  clave: '',            // la contraseña que cifra; no sale de este dispositivo
  encendida: false,
  version: 0,           // la última versión que este aparato subió o bajó
  ultima: null,         // cuándo se sincronizó por última vez
  ultimoError: null,
};

/* ------------------------------------------------------------------ *
 * Configuración
 * ------------------------------------------------------------------ */

export function leerConfig(almacen = globalThis.localStorage) {
  try {
    return { ...CONFIG_INICIAL, ...JSON.parse(almacen?.getItem(CLAVE_NUBE) || '{}') };
  } catch {
    return { ...CONFIG_INICIAL };
  }
}

export function guardarConfig(config, almacen = globalThis.localStorage) {
  try {
    almacen?.setItem(CLAVE_NUBE, JSON.stringify(config));
  } catch { /* modo privado: se queda en memoria y ya */ }
  return config;
}

/** Una llave de 128 bits en hexadecimal: la que nombra tu bloque en el servidor. */
export function codigoNuevo(aleatorio = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return [...aleatorio(16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** ¿Está lista para trabajar? Sin las tres cosas no se intenta nada. */
export function configurada(config) {
  return !!(config?.url && config?.codigo && config?.clave);
}

/** Lo que se sube: el estado sin lo que es de este aparato y de nadie más. */
export function paraSubir(estado = {}) {
  const copia = { ...estado };
  for (const clave of SOLO_AQUI) delete copia[clave];
  return copia;
}

/* ------------------------------------------------------------------ *
 * El servidor
 * ------------------------------------------------------------------ */

const pedir = async (config, opciones, traer) => {
  const respuesta = await traer(config.url, {
    ...opciones,
    headers: { 'x-codigo': config.codigo, ...(opciones.headers || {}) },
  });
  return respuesta;
};

export async function bajar(config, traer = fetch) {
  const respuesta = await pedir(config, { method: 'GET' }, traer);
  if (!respuesta.ok) throw new Error(await mensajeDeError(respuesta));
  const sobre = await respuesta.json();
  return { version: sobre.version || 0, datos: sobre.datos || null };
}

export async function subir(config, texto, version, traer = fetch) {
  const respuesta = await pedir(config, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain; charset=utf-8', 'x-version': String(version) },
    body: texto,
  }, traer);
  if (respuesta.status === 409) {
    const error = new Error('Otro dispositivo subió algo mientras tanto.');
    error.choque = true;
    throw error;
  }
  if (!respuesta.ok) throw new Error(await mensajeDeError(respuesta));
  const sobre = await respuesta.json();
  return sobre.version || version + 1;
}

async function mensajeDeError(respuesta) {
  if (respuesta.status === 401) return 'El código de sincronización no es válido.';
  if (respuesta.status === 404) return 'Esa dirección no responde: revisa la del Worker.';
  if (respuesta.status === 413) return 'La copia pesa demasiado para subirla.';
  try {
    const cuerpo = await respuesta.json();
    if (cuerpo?.error) return cuerpo.error;
  } catch { /* la respuesta no era JSON */ }
  return `El servidor contestó ${respuesta.status}.`;
}

/* ------------------------------------------------------------------ *
 * El baile completo
 * ------------------------------------------------------------------ */

/**
 * Baja, fusiona y sube. Devuelve el estado resultante y una frase para
 * enseñar; no toca el almacén ni la pantalla, eso lo hace quien la llama.
 *
 *   config   url, codigo y clave
 *   local    el estado de este dispositivo
 *   traer    `fetch` (se inyecta para poder probarlo sin red)
 *   intentos cuántas veces reintentar si otro aparato se adelanta
 */
export async function sincronizar(config, local, { traer = fetch, intentos = 3 } = {}) {
  if (!configurada(config)) throw new Error('Falta configurar la nube.');

  let ultimoChoque = null;

  for (let intento = 0; intento < intentos; intento++) {
    const remotoCrudo = await bajar(config, traer);

    let remoto = null;
    if (remotoCrudo.datos) {
      const claro = await descifrar(remotoCrudo.datos, config.clave);
      remoto = JSON.parse(claro);
    }

    // La primera vez no hay nada arriba: sube lo de aquí y ya está.
    const resultado = remoto ? fusionar(local, remoto) : { estado: local, cuenta: null, frase: 'Primera copia subida.' };
    const sobre = await cifrar(JSON.stringify(paraSubir(resultado.estado)), config.clave);

    try {
      const version = await subir(config, sobre, remotoCrudo.version, traer);
      return {
        estado: resultado.estado,
        version,
        cuenta: resultado.cuenta,
        frase: resultado.frase,
        bajado: !!remoto,
      };
    } catch (error) {
      if (!error.choque) throw error;
      ultimoChoque = error;    // alguien se adelantó: se repite con lo suyo ya dentro
    }
  }

  throw ultimoChoque || new Error('No se pudo sincronizar.');
}

/** Cómo contar por la pantalla lo que acaba de pasar. */
export function frase(config, ahora = new Date()) {
  if (!configurada(config)) return 'Sin configurar.';
  if (!config.encendida) return 'Apagada.';
  if (config.ultimoError) return config.ultimoError;
  if (!config.ultima) return 'Todavía no ha sincronizado.';
  const minutos = Math.round((ahora.getTime() - new Date(config.ultima).getTime()) / 60000);
  if (minutos < 1) return 'Al día.';
  if (minutos < 60) return `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}.`;
  const dias = Math.round(horas / 24);
  return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}.`;
}
