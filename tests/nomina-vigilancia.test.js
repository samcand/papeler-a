import assert from 'node:assert/strict';
import * as vig from '../src/vigilancia.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };
const ta = async (nombre, fn) => { await fn(); passed++; console.log('  ok  ' + nombre); };

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Ministerio del Trabajo</title>
  <item>
    <title><![CDATA[Decreto 1469 de 2025 fija el salario mínimo para 2026]]></title>
    <link>https://ejemplo.gov.co/decreto-1469</link>
    <pubDate>Mon, 29 Dec 2025 09:00:00 -0500</pubDate>
    <description><![CDATA[El <b>salario mínimo</b> queda en $1.750.905 y el auxilio de transporte en $249.095.]]></description>
  </item>
  <item>
    <title>Feria de empleo en Barranquilla</title>
    <link>https://ejemplo.gov.co/feria</link>
    <pubDate>Tue, 30 Dec 2025 09:00:00 -0500</pubDate>
    <description>Más de 500 vacantes.</description>
  </item>
  <item>
    <title>Así aplica el recargo dominical del 90 % desde julio</title>
    <link>https://ejemplo.gov.co/recargo</link>
    <pubDate>Wed, 01 Jul 2026 08:00:00 -0500</pubDate>
    <description>La jornada laboral queda en 42 horas.</description>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Sentencia C-123 de 2026 sobre la reforma laboral</title>
    <link href="https://corte.gov.co/c-123"/>
    <updated>2026-05-04T10:00:00-05:00</updated>
    <summary>Revisión de constitucionalidad de la Ley 2466 de 2025.</summary>
  </entry>
</feed>`;

t('lee un RSS', () => {
  const items = vig.parsearFeed(RSS, 'Mintrabajo');
  assert.equal(items.length, 3);
  assert.equal(items[0].titulo, 'Decreto 1469 de 2025 fija el salario mínimo para 2026');
  assert.equal(items[0].enlace, 'https://ejemplo.gov.co/decreto-1469');
  assert.equal(items[0].fecha, '2025-12-29');
  assert.ok(items[0].resumen.includes('1.750.905'));
  assert.ok(!items[0].resumen.includes('<b>'), 'quita el HTML');
});

t('lee un Atom con enlace en atributo', () => {
  const items = vig.parsearFeed(ATOM, 'Corte');
  assert.equal(items.length, 1);
  assert.equal(items[0].enlace, 'https://corte.gov.co/c-123');
  assert.equal(items[0].fecha, '2026-05-04');
});

t('clasifica por tema y descarta lo que no es normativo', () => {
  const analizadas = vig.analizar(vig.parsearFeed(RSS, 'Mintrabajo'));
  const titulos = analizadas.map((a) => a.titulo);
  assert.ok(!titulos.some((x) => x.includes('Feria de empleo')), 'la feria de empleo no es un cambio de ley');
  const salario = analizadas.find((a) => a.titulo.includes('Decreto 1469'));
  assert.deepEqual(salario.temasId.sort(), ['auxilio', 'salario-minimo']);
  assert.ok(salario.pareceNorma);
  const recargo = analizadas.find((a) => a.titulo.includes('recargo dominical'));
  assert.ok(recargo.temasId.includes('recargos'));
  assert.ok(recargo.temasId.includes('jornada'));
});

t('filtra por la fecha de la última revisión', () => {
  const todas = vig.analizar(vig.parsearFeed(RSS), {});
  const nuevas = vig.analizar(vig.parsearFeed(RSS), { desde: '2026-01-01' });
  assert.ok(todas.length > nuevas.length);
  assert.ok(nuevas.every((n) => n.fecha >= '2026-01-01'));
});

t('detecta menciones a normas', () => {
  assert.ok(vig.pareceNorma('Decreto 1469 de 2025'));
  assert.ok(vig.pareceNorma('Sentencia C-123 de 2026'));
  assert.ok(vig.pareceNorma('Ley 2466 de 2025'));
  assert.ok(!vig.pareceNorma('El ministro anunció cambios'));
});

t('avisa cuando no hay valores cargados para el año', () => {
  const alertas = vig.alertas('2030-03-01');
  assert.ok(alertas.some((a) => a.nivel === 'alto' && a.titulo.includes('2030')));
});

t('anuncia los cambios programados con anticipación', () => {
  const alertas = vig.alertas('2027-05-15');
  assert.ok(alertas.some((a) => a.titulo.includes('100 %')), 'el recargo del 100 % del 1 de julio de 2027');
});

t('marca los escalones que acaban de entrar a regir', () => {
  const alertas = vig.alertas('2026-07-20');
  assert.ok(alertas.some((a) => a.titulo.includes('42 horas')), 'la jornada de 42 horas del 15 de julio de 2026');
  assert.ok(alertas.some((a) => a.titulo.includes('90 %')), 'el recargo del 90 % del 1 de julio de 2026');
});

t('arma la entrada de bitácora desde una noticia', () => {
  const [noticia] = vig.analizar(vig.parsearFeed(RSS, 'Mintrabajo'));
  const entrada = vig.aEntradaBitacora(noticia, '2026-01-02');
  assert.equal(entrada.estado, 'por-revisar');
  assert.equal(entrada.fecha, '2026-01-02');
  assert.ok(entrada.titulo && entrada.enlace);
});

t('las búsquedas sugeridas apuntan a un feed válido', () => {
  assert.ok(vig.FEEDS_SUGERIDOS.length >= 4);
  for (const f of vig.FEEDS_SUGERIDOS) {
    assert.ok(f.feed.startsWith('https://'), f.nombre);
    assert.ok(f.feed.includes('Colombia'.replace(/ /g, '')) || f.feed.includes('Colombia'));
  }
});

await ta('consulta fuentes con un fetch de mentiras', async () => {
  const llamadas = [];
  const fetchFalso = async (url) => {
    llamadas.push(url);
    return { ok: true, text: async () => RSS };
  };
  const { noticias, errores } = await vig.consultarFuentes({
    fuentes: [{ nombre: 'Prueba', feed: 'https://ejemplo.gov.co/rss' }],
    fetchImpl: fetchFalso,
  });
  assert.equal(errores.length, 0);
  assert.ok(noticias.length >= 2);
  assert.equal(llamadas[0], 'https://ejemplo.gov.co/rss');
});

await ta('usa el proxy configurado y reporta los errores de red', async () => {
  const llamadas = [];
  const fetchFalso = async (url) => {
    llamadas.push(url);
    throw new Error('Failed to fetch');
  };
  const { noticias, errores } = await vig.consultarFuentes({
    fuentes: [{ nombre: 'Prueba', feed: 'https://ejemplo.gov.co/rss', url: 'https://ejemplo.gov.co' }],
    proxy: 'https://proxy.ejemplo/?{url}',
    fetchImpl: fetchFalso,
  });
  assert.equal(noticias.length, 0);
  assert.equal(errores.length, 1);
  assert.ok(errores[0].mensaje.includes('CORS'));
  assert.equal(llamadas[0], `https://proxy.ejemplo/?${encodeURIComponent('https://ejemplo.gov.co/rss')}`);
});

console.log(`\n${passed} pruebas de vigilancia normativa ✔`);
