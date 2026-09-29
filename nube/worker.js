/**
 * worker.js — El único servidor que tiene esta app.
 *
 * No sabe nada de tareas, ni de metas, ni de gastos: recibe un bloque de bytes
 * cifrados, lo guarda y lo devuelve. La contraseña que abre ese bloque nunca
 * sale de tus dispositivos, así que ni Cloudflare ni nadie con acceso a este
 * almacén puede leer lo que hay dentro. Si pierdes la contraseña, tampoco tú:
 * eso es el precio de que nadie más pueda.
 *
 * CÓMO PONERLO A FUNCIONAR (unos diez minutos, sin instalar nada):
 *
 *   1. Entra en https://dash.cloudflare.com y crea una cuenta gratis.
 *   2. Storage & Databases -> KV -> "Create instance". Llámala `RECORDATORIOS`.
 *   3. Compute -> Workers -> "Create" -> "Start from Hello World" -> Deploy.
 *   4. En el Worker: Edit code, borra lo que haya, pega ESTE archivo entero,
 *      y Deploy.
 *   5. Settings -> Bindings -> Add -> KV namespace:
 *        Variable name: DATOS      KV namespace: RECORDATORIOS
 *      y Deploy otra vez.
 *   6. Copia la dirección del Worker (algo como
 *      https://recordatorios.TU-CUENTA.workers.dev) y pégala en la app, en
 *      Ajustes -> Nube.
 *
 * SOBRE LA SEGURIDAD: el «código de sincronización» que genera la app es una
 * llave de 128 bits. Quien lo tenga puede leer y sobrescribir el bloque
 * cifrado, pero sin la contraseña solo verá ruido. Va en una cabecera, no en
 * la dirección, para que no acabe escrito en ningún registro de accesos.
 *
 * SOBRE LOS CHOQUES: KV no garantiza que dos escrituras a la vez se ordenen
 * bien. Por eso cada guardado lleva número de versión y el que llega tarde
 * recibe un 409: la app vuelve a bajar, vuelve a fusionar y vuelve a subir.
 * Y como fusionar es unir, el peor caso es sincronizar dos veces, nunca
 * perder algo.
 */

const CODIGO_VALIDO = /^[a-f0-9]{32,64}$/i;
const LIMITE_BYTES = 20 * 1024 * 1024;   // KV admite 25 MB; dejamos margen

const CABECERAS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, x-codigo, x-version',
  'access-control-max-age': '86400',
  'cache-control': 'no-store',
};

const responder = (cuerpo, estado = 200, extra = {}) => new Response(cuerpo, {
  status: estado,
  headers: { ...CABECERAS, 'content-type': 'application/json; charset=utf-8', ...extra },
});

export default {
  async fetch(peticion, entorno) {
    if (peticion.method === 'OPTIONS') return new Response(null, { headers: CABECERAS });

    if (!entorno.DATOS) {
      return responder(JSON.stringify({ error: 'Falta enlazar el KV como DATOS (Settings -> Bindings).' }), 500);
    }

    const codigo = peticion.headers.get('x-codigo') || '';
    if (!CODIGO_VALIDO.test(codigo)) {
      return responder(JSON.stringify({ error: 'Código de sincronización ausente o mal formado.' }), 401);
    }

    if (peticion.method === 'GET') {
      const guardado = await entorno.DATOS.get(codigo);
      if (!guardado) return responder(JSON.stringify({ version: 0, datos: null }));
      return responder(guardado);
    }

    if (peticion.method === 'PUT') {
      const cuerpo = await peticion.text();
      if (cuerpo.length > LIMITE_BYTES) {
        return responder(JSON.stringify({ error: 'La copia es demasiado grande.' }), 413);
      }

      const guardado = await entorno.DATOS.get(codigo);
      const versionActual = guardado ? (JSON.parse(guardado).version || 0) : 0;
      const esperada = Number(peticion.headers.get('x-version') || 0);

      // El que llega con una versión vieja no pisa: vuelve a bajar y fusiona.
      if (esperada !== versionActual) {
        return responder(JSON.stringify({ error: 'Hay una versión más nueva.', version: versionActual }), 409);
      }

      const version = versionActual + 1;
      await entorno.DATOS.put(codigo, JSON.stringify({ version, datos: cuerpo, en: new Date().toISOString() }));
      return responder(JSON.stringify({ version }));
    }

    return responder(JSON.stringify({ error: 'Solo GET y PUT.' }), 405);
  },
};
