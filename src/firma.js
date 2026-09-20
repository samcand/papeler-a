/**
 * firma.js — Firma electrónica con trazabilidad.
 *
 * La ley colombiana no exige una tecnología concreta: pide que la firma sea
 * "tan confiable como apropiada" para el fin del documento y que se pueda
 * verificar quién firmó y que el texto no cambió después (Ley 527 de 1999
 * art. 7 y Decreto 2364 de 2012, art. 3: identificación del firmante, control
 * exclusivo del método y posibilidad de detectar cualquier cambio).
 *
 * Lo que hacemos aquí: guardar la huella digital (SHA-256) del texto firmado,
 * con quién firmó, cuándo y desde dónde, y poder comprobarlo después. La hoja
 * de verificación va impresa junto al documento.
 */

const textoPlano = (valor) => String(valor ?? '').replace(/\r\n/g, '\n').trim();

/** Huella SHA-256 en hexadecimal. */
export async function huella(texto) {
  const datos = new TextEncoder().encode(textoPlano(texto));
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Código corto y legible para leer en voz alta o comparar a ojo. */
export function codigoCorto(hex) {
  return String(hex).slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * Sella un documento: calcula su huella y guarda quién lo firma.
 *
 * @param {Object} p
 * @param {string} p.texto      Texto exacto que se firma.
 * @param {string} p.documentoId Identificador del documento en la app.
 * @param {Array}  p.firmantes  [{ rol, nombre, documento, metodo }]
 * @param {string} p.entorno    Navegador o dispositivo desde donde se firma.
 */
export async function sellar({ texto, documentoId = '', firmantes = [], entorno = '' }) {
  const hex = await huella(texto);
  const ahora = new Date();
  return {
    id: `firma-${ahora.getTime().toString(36)}`,
    documentoId,
    algoritmo: 'SHA-256',
    huella: hex,
    codigo: codigoCorto(hex),
    fecha: ahora.toISOString(),
    entorno: entorno || (typeof navigator !== 'undefined' ? navigator.userAgent : 'sin navegador'),
    firmantes: firmantes.map((f) => ({
      rol: f.rol || '',
      nombre: f.nombre || '',
      documento: f.documento || '',
      metodo: f.metodo || 'firma manuscrita sobre el documento impreso',
      aceptaFecha: f.aceptaFecha || ahora.toISOString(),
    })),
    norma: 'Ley 527 de 1999 art. 7 y Decreto 2364 de 2012',
  };
}

/** ¿El texto sigue siendo el que se firmó? */
export async function verificar({ texto, sello }) {
  if (!sello || !sello.huella) return { valido: false, motivo: 'El documento no tiene sello de firma.' };
  const actual = await huella(texto);
  if (actual !== sello.huella) {
    return {
      valido: false,
      motivo: 'El documento cambió después de firmarse: la huella no coincide.',
      huellaActual: actual,
      huellaFirmada: sello.huella,
    };
  }
  return { valido: true, motivo: 'El documento es idéntico al que se firmó.', huellaActual: actual };
}

/** Renglones de la hoja de verificación que se imprime con el documento. */
export function hojaDeVerificacion(sello) {
  if (!sello) return [];
  const fecha = new Date(sello.fecha);
  return [
    ['Código de verificación', sello.codigo],
    ['Huella del documento (SHA-256)', sello.huella],
    ['Fecha y hora de la firma', fecha.toLocaleString('es-CO')],
    ...sello.firmantes.map((f) => [
      `Firmante — ${f.rol}`,
      `${f.nombre}${f.documento ? `, ${f.documento}` : ''} · ${f.metodo}`,
    ]),
    ['Dispositivo', String(sello.entorno).slice(0, 120)],
    ['Fundamento', sello.norma],
  ];
}
