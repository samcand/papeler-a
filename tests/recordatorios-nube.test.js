/**
 * recordatorios-nube.test.js — Sincronizar sin perder nada.
 *
 * El servidor de verdad se prueba solo; aquí se prueba el baile: bajar,
 * descifrar, fusionar, cifrar y subir, con un servidor de mentira que se
 * porta como el real (incluidos los choques de versión).
 */

import assert from 'node:assert/strict';
import { descifrar } from '../recordatorios/src/compartir.js';
import {
  CONFIG_INICIAL, bajar, codigoNuevo, configurada, frase, leerConfig,
  paraSubir, sincronizar, subir,
} from '../recordatorios/src/nube.js';

let passed = 0;
const pruebas = [];
const t = (name, fn) => pruebas.push([name, fn]);

const CONFIG = { ...CONFIG_INICIAL, url: 'https://ejemplo.workers.dev', codigo: 'a'.repeat(32), clave: 'secreta', encendida: true };
const ANTES = '2026-09-20T10:00:00.000Z';
const DESPUES = '2026-09-21T10:00:00.000Z';

/** Un servidor de mentira con la misma regla de versiones que el Worker. */
function servidor({ version = 0, datos = null } = {}) {
  const caja = { version, datos, puestas: 0, bajadas: 0 };
  const traer = async (url, opciones = {}) => {
    if (opciones.method === 'GET') {
      caja.bajadas++;
      return { ok: true, status: 200, json: async () => ({ version: caja.version, datos: caja.datos }) };
    }
    const esperada = Number(opciones.headers['x-version']);
    if (esperada !== caja.version) {
      return { ok: false, status: 409, json: async () => ({ error: 'Hay una versión más nueva.', version: caja.version }) };
    }
    caja.puestas++;
    caja.version++;
    caja.datos = opciones.body;
    return { ok: true, status: 200, json: async () => ({ version: caja.version }) };
  };
  return { caja, traer };
}

/* ---------------- configuración ---------------- */

t('el código es una llave de 128 bits en hexadecimal', () => {
  const codigo = codigoNuevo();
  assert.match(codigo, /^[a-f0-9]{32}$/);
  assert.notEqual(codigo, codigoNuevo(), 'dos códigos seguidos no pueden ser iguales');
});

t('sin dirección, código o contraseña no se intenta nada', () => {
  assert.equal(configurada(CONFIG), true);
  assert.equal(configurada({ ...CONFIG, clave: '' }), false);
  assert.equal(configurada({ ...CONFIG, url: '' }), false);
  assert.equal(configurada(null), false);
});

t('una configuración rota no tumba la app: se vuelve a la de fábrica', () => {
  const almacen = { getItem: () => '{ esto no es json', setItem() {} };
  assert.deepEqual(leerConfig(almacen), CONFIG_INICIAL);
});

t('lo que es de este aparato no se sube', () => {
  const subido = paraSubir({ tareas: [], cronometro: { corriendo: true }, pomodoro: { estado: 'x' } });
  assert.equal(subido.cronometro, undefined);
  assert.equal(subido.pomodoro, undefined);
  assert.ok('tareas' in subido);
});

/* ---------------- el baile ---------------- */

t('la primera vez sube lo de aquí y no pregunta nada', async () => {
  const { caja, traer } = servidor();
  const r = await sincronizar(CONFIG, { tareas: [{ id: 'a', titulo: 'Primera' }] }, { traer });
  assert.equal(r.bajado, false);
  assert.equal(caja.version, 1);
  assert.match(r.frase, /Primera copia/);
});

t('lo que sube va cifrado: el servidor no puede leerlo', async () => {
  const { caja, traer } = servidor();
  await sincronizar(CONFIG, { tareas: [{ id: 'a', titulo: 'Confidencial' }] }, { traer });
  assert.ok(!caja.datos.includes('Confidencial'), 'el título viaja en claro');
  assert.match(caja.datos, /recordatorios-cifrado-v1/);
  const claro = JSON.parse(await descifrar(caja.datos, CONFIG.clave));
  assert.equal(claro.tareas[0].titulo, 'Confidencial');
});

t('lo de arriba y lo de aquí se juntan, no se pisan', async () => {
  const { caja, traer } = servidor();
  await sincronizar(CONFIG, { tareas: [{ id: 'movil', actualizadoEn: ANTES }] }, { traer });
  const r = await sincronizar(CONFIG, { tareas: [{ id: 'compu', actualizadoEn: ANTES }] }, { traer });
  assert.deepEqual(r.estado.tareas.map((t2) => t2.id).sort(), ['compu', 'movil']);
  assert.equal(r.bajado, true);
});

t('lo borrado en un aparato no vuelve desde la nube', async () => {
  const { traer } = servidor();
  await sincronizar(CONFIG, { tareas: [{ id: 'a', titulo: 'Vieja', actualizadoEn: ANTES }] }, { traer });
  const r = await sincronizar(CONFIG, {
    tareas: [],
    borrados: [{ lista: 'tareas', id: 'a', en: DESPUES }],
  }, { traer });
  assert.deepEqual(r.estado.tareas, []);
});

t('si otro dispositivo se adelanta, se vuelve a fusionar en vez de pisarlo', async () => {
  const { traer } = servidor();
  await sincronizar(CONFIG, { tareas: [{ id: 'uno', actualizadoEn: ANTES }] }, { traer });

  // A mitad del baile, otro aparato sube lo suyo: la primera subida choca.
  let colado = false;
  const traerConIntruso = async (url, opciones = {}) => {
    const r = await traer(url, opciones);
    if (opciones.method === 'GET' && !colado) {
      colado = true;
      // El otro dispositivo, contra el mismo servidor y antes de que este suba.
      await sincronizar(CONFIG, { tareas: [{ id: 'dos', actualizadoEn: ANTES }] }, { traer });
    }
    return r;
  };

  const r = await sincronizar(CONFIG, { tareas: [{ id: 'tres', actualizadoEn: ANTES }] }, { traer: traerConIntruso });
  assert.deepEqual(r.estado.tareas.map((x) => x.id).sort(), ['dos', 'tres', 'uno']);
});

t('si choca una y otra vez, avisa en vez de quedarse dando vueltas', async () => {
  const traer = async (url, opciones = {}) => (opciones.method === 'GET'
    ? { ok: true, status: 200, json: async () => ({ version: 0, datos: null }) }
    : { ok: false, status: 409, json: async () => ({ error: 'choque' }) });
  await assert.rejects(() => sincronizar(CONFIG, {}, { traer, intentos: 2 }), /mientras tanto/);
});

t('una contraseña distinta no abre lo de arriba, y se dice claro', async () => {
  const { traer } = servidor();
  await sincronizar(CONFIG, { tareas: [{ id: 'a' }] }, { traer });
  await assert.rejects(
    () => sincronizar({ ...CONFIG, clave: 'otra' }, {}, { traer }),
    /contraseña no es correcta/,
  );
});

/* ---------------- errores del servidor ---------------- */

t('cada error del servidor se traduce a algo que se pueda leer', async () => {
  const con = (status) => async () => ({ ok: false, status, json: async () => ({}) });
  await assert.rejects(() => bajar(CONFIG, con(401)), /código de sincronización no es válido/i);
  await assert.rejects(() => bajar(CONFIG, con(404)), /dirección no responde/);
  await assert.rejects(() => subir(CONFIG, 'x', 0, con(413)), /pesa demasiado/);
  await assert.rejects(() => bajar(CONFIG, con(500)), /contestó 500/);
});

t('el código viaja en una cabecera, nunca en la dirección', async () => {
  let vista = null;
  await bajar(CONFIG, async (url, opciones) => {
    vista = { url, cabeceras: opciones.headers };
    return { ok: true, status: 200, json: async () => ({ version: 0, datos: null }) };
  });
  assert.equal(vista.url, CONFIG.url, 'el código no puede acabar en un registro de accesos');
  assert.equal(vista.cabeceras['x-codigo'], CONFIG.codigo);
});

t('sin conexión, el error sube tal cual para que la app lo cuente', async () => {
  const traer = async () => { throw new Error('Failed to fetch'); };
  await assert.rejects(() => sincronizar(CONFIG, {}, { traer }), /Failed to fetch/);
});

/* ---------------- lo que se le enseña al usuario ---------------- */

t('el estado se cuenta en español y sin inventarse nada', () => {
  const ahora = new Date('2026-09-21T12:00:00.000Z');
  assert.match(frase({ ...CONFIG_INICIAL }, ahora), /Sin configurar/);
  assert.match(frase({ ...CONFIG, encendida: false }, ahora), /Apagada/);
  assert.match(frase({ ...CONFIG, ultima: null }, ahora), /Todavía no/);
  assert.match(frase({ ...CONFIG, ultima: '2026-09-21T11:58:00.000Z' }, ahora), /Hace 2 minutos/);
  assert.match(frase({ ...CONFIG, ultima: '2026-09-21T09:00:00.000Z' }, ahora), /Hace 3 horas/);
  assert.match(frase({ ...CONFIG, ultima: '2026-09-19T12:00:00.000Z' }, ahora), /Hace 2 días/);
  assert.match(frase({ ...CONFIG, ultimoError: 'No hay internet' }, ahora), /No hay internet/);
});

/* ---------------- ejecutar ---------------- */

for (const [name, fn] of pruebas) {
  await fn();
  passed++;
  console.log('  ok  ' + name);
}
console.log(`\n${passed} pruebas de sincronización en la nube OK`);
