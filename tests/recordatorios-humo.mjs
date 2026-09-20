/**
 * humo.mjs — Prueba de humo de la app de recordatorios en un navegador real.
 *
 * Levanta el servidor, recorre todas las pantallas y comprueba los caminos que
 * de verdad se usan: crear una tarea escribiéndola, completarla, el pomodoro
 * corriendo, la calculadora de riesgo y la exportación al calendario.
 *
 *   node tests/recordatorios-humo.mjs
 *
 * Necesita Playwright (no es dependencia del proyecto). Si no está instalado
 * la prueba se salta sola: el resto de `npm test` no depende de un navegador.
 */

import { execFileSync, spawn } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PUERTO = 8123;
const BASE = `http://localhost:${PUERTO}/recordatorios/index.html`;
const PANTALLAS = ['hoy', 'bandeja', 'proximos', 'calendario', 'enfoque', 'planificar', 'revision',
  'inversiones', 'proyectos', 'docencia', 'investigacion', 'alabanza', 'plantillas', 'tablero',
  'informes', 'copiloto', 'ideas', 'ajustes'];

/** Busca Playwright en el proyecto y, si no, en la instalación global. */
async function cargarPlaywright() {
  const require = createRequire(import.meta.url);
  const candidatos = ['playwright'];
  try {
    const global = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    if (global) candidatos.push(join(global, 'playwright', 'index.mjs'));
  } catch { /* npm puede no estar en el PATH */ }
  for (const c of candidatos) {
    try {
      return await import(c.startsWith('/') ? pathToFileURL(c).href : require.resolve(c));
    } catch { /* se prueba el siguiente */ }
  }
  return null;
}

const playwright = await cargarPlaywright();
if (!playwright) {
  console.log('Playwright no está instalado: se salta la prueba de navegador.');
  process.exit(0);
}
const { chromium } = playwright;

const servidor = spawn(process.execPath, ['tools/servidor.mjs', String(PUERTO)], { stdio: 'ignore' });
const cerrar = () => { try { servidor.kill(); } catch { /* ya estaba muerto */ } };
process.on('exit', cerrar);
await new Promise((r) => setTimeout(r, 700));

const errores = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
pagina.on('pageerror', (e) => errores.push('excepción: ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push('consola: ' + m.text()); });

await pagina.goto(BASE + '#/hoy', { waitUntil: 'networkidle' });

for (const p of PANTALLAS) {
  await pagina.goto(BASE + '#/' + p);
  await pagina.waitForTimeout(300);
  const texto = await pagina.textContent('#app');
  if (texto.includes('Algo falló al dibujar')) errores.push(`${p}: la vista lanzó una excepción`);
  else if (texto.length < 40) errores.push(`${p}: la vista quedó vacía`);
  else console.log(`  ok  ${p}`);
}

await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(250);
await pagina.fill('[data-rapida]', 'Revisar tesis de NVDA mañana 9am p1 #Cartera cada tercer viernes');
const previa = await pagina.textContent('.vista-previa');
if (!/mañana a las 09:00/.test(previa) || !/tercer viernes/.test(previa)) {
  errores.push('la vista previa no interpretó la línea: ' + previa);
} else console.log('  ok  entrada rápida en lenguaje natural');
await pagina.press('[data-rapida]', 'Enter');
await pagina.waitForTimeout(300);

await pagina.goto(BASE + '#/proximos');
await pagina.waitForTimeout(300);
if (!(await pagina.textContent('#app')).includes('Revisar tesis de NVDA')) {
  errores.push('la tarea creada no aparece en Próximos');
} else console.log('  ok  la tarea creada aparece en Próximos');

await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(300);
const antes = await pagina.locator('.tarea').count();
await pagina.locator('.casilla').first().click();
await pagina.waitForTimeout(300);
if (await pagina.locator('.tarea').count() >= antes) errores.push('completar una tarea no la quita de Hoy');
else console.log('  ok  completar una tarea');

await pagina.goto(BASE + '#/enfoque');
await pagina.waitForTimeout(300);
const reloj0 = await pagina.textContent('#reloj-pomo');
await pagina.getByRole('button', { name: 'Comenzar' }).click();
await pagina.waitForTimeout(1600);
if (await pagina.textContent('#reloj-pomo') === reloj0) errores.push('el pomodoro no avanza');
else console.log('  ok  el pomodoro corre');

await pagina.goto(BASE + '#/inversiones?tab=calculadora');
await pagina.waitForTimeout(400);
for (const [etiqueta, valor] of [['Capital', '10000'], ['Riesgo (%)', '1'], ['Entrada', '100'], ['Stop', '95']]) {
  const campo = pagina.locator('label', { hasText: etiqueta }).locator('input').first();
  await campo.fill(valor);
  await campo.press('Tab');
  await pagina.waitForTimeout(120);
}
const calc = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/20\s*acciones/.test(calc)) errores.push('la calculadora de riesgo no dio 20 acciones');
else console.log('  ok  calculadora de riesgo');

await pagina.goto(BASE + '#/calendario');
await pagina.waitForTimeout(300);
const [descarga] = await Promise.all([
  pagina.waitForEvent('download'),
  pagina.getByRole('button', { name: /Exportar .ics/ }).click(),
]);
const ics = readFileSync(await descarga.path(), 'utf8');
if (!/BEGIN:VEVENT/.test(ics)) errores.push('el .ics exportado no tiene eventos');
else console.log('  ok  exportar al calendario');

// Prioridad y repetición con botones, desde el panel de la tarea
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(300);
await pagina.locator('.tarea-cuerpo').first().click();
await pagina.waitForTimeout(250);
await pagina.locator('.chip.prioridad', { hasText: 'P1' }).click();
await pagina.locator('.repeticion select').first().selectOption('semanal');
await pagina.waitForTimeout(150);
await pagina.locator('.repeticion .chip', { hasText: 'mié' }).first().click();
await pagina.waitForTimeout(150);
const previaRegla = await pagina.textContent('.repeticion .field-hint');
if (!/miércoles/.test(previaRegla)) errores.push('el constructor de repetición no refleja el día elegido: ' + previaRegla);
else console.log('  ok  prioridad y repetición con botones');
await pagina.getByRole('button', { name: 'Guardar' }).click();
await pagina.waitForTimeout(300);

// Proyectos: plantilla, ruta crítica y Gantt
await pagina.goto(BASE + '#/proyectos');
await pagina.waitForTimeout(300);
await pagina.locator('select').nth(1).selectOption('articulo');
await pagina.waitForTimeout(500);
const barras = await pagina.locator('.gantt rect').count();
const criticas = await pagina.locator('.fila-critica').count();
const textoPlan = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (barras < 5) errores.push('el Gantt no dibujó las barras');
else if (criticas < 5) errores.push('la ruta crítica no se marcó en la tabla');
else if (!/69 d/.test(textoPlan)) errores.push('la duración del plan no cuadra: ' + textoPlan.slice(0, 160));
else console.log(`  ok  proyectos: Gantt con ${barras} barras y ${criticas} tareas críticas`);

// Bandeja: capturar sin decidir y procesar de una en una
await pagina.goto(BASE + '#/bandeja');
await pagina.waitForTimeout(300);
await pagina.fill('[data-rapida]', 'Mirar lo del seguro del coche');
await pagina.press('[data-rapida]', 'Enter');
await pagina.waitForTimeout(300);
if (!(await pagina.textContent('#app')).includes('Mirar lo del seguro')) {
  errores.push('lo capturado sin proyecto no aparece en la bandeja');
} else {
  await pagina.getByRole('button', { name: /procesar una por una/ }).click();
  await pagina.waitForTimeout(250);
  await pagina.locator('.procesador .chip', { hasText: 'Hoy' }).first().click();
  await pagina.waitForTimeout(300);
  await pagina.goto(BASE + '#/hoy');
  await pagina.waitForTimeout(300);
  const enHoy = (await pagina.textContent('#app')).includes('Mirar lo del seguro');
  const sigueEnBandeja = await pagina.locator('[data-nav="bandeja"] .cuenta').count();
  if (!enHoy) errores.push('procesar a "Hoy" no puso la tarea en el día');
  else console.log('  ok  bandeja: capturar y procesar');
}

// Resumen del día
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  store.ajustar({ resumenVistoEn: null, horaResumen: '00:01' });
});
await pagina.goto(BASE + '#/proximos');
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(400);
const resumen = await pagina.textContent('.resumen-dia').catch(() => '');
if (!/Si solo salen tres cosas|para hoy/.test(resumen)) errores.push('el resumen del día no se muestra: ' + resumen.slice(0, 120));
else {
  await pagina.getByRole('button', { name: 'Empezar' }).click();
  await pagina.waitForTimeout(250);
  if (await pagina.locator('.resumen-dia').count()) errores.push('el resumen no se cierra al empezar el día');
  else console.log('  ok  resumen del día, y se cierra al empezar');
}

// Arrastrar una tarea en el Gantt
await pagina.goto(BASE + '#/proyectos');
await pagina.waitForTimeout(500);
// columnas: EDT, tarea, días, optimista, pesimista, comienzo, fin…
const COL_FIN = 7;
const antesFin = await pagina.locator('.tabla-plan tbody tr').nth(1).locator('td').nth(COL_FIN).textContent();
const barra = pagina.locator('.gantt-barra').nth(1);
const caja = await barra.boundingBox();
await pagina.mouse.move(caja.x + 12, caja.y + caja.height / 2);
await pagina.mouse.down();
await pagina.mouse.move(caja.x + 12 + 9 * 5, caja.y + caja.height / 2, { steps: 8 });  // ~5 días a escala de semanas
await pagina.mouse.up();
await pagina.waitForTimeout(500);
const despuesFin = await pagina.locator('.tabla-plan tbody tr').nth(1).locator('td').nth(COL_FIN).textContent();
const chincheta = await pagina.locator('.tabla-plan tbody tr').nth(1).getByRole('button', { name: '📌' }).count();
if (antesFin === despuesFin) errores.push(`arrastrar en el Gantt no movió la tarea (seguía en ${antesFin})`);
else if (!chincheta) errores.push('la tarea movida no quedó marcada como fijada');
else console.log(`  ok  arrastrar en el Gantt: ${antesFin.trim()} → ${despuesFin.trim()}`);

// Plantillas: previsualizar fechas y crear las tareas
await pagina.goto(BASE + '#/plantillas');
await pagina.waitForTimeout(400);
await pagina.locator('.chip', { hasText: 'Aplicar y calificar un parcial' }).click();
await pagina.waitForTimeout(300);
await pagina.locator('input[type="date"]').first().fill('2026-10-15');
await pagina.waitForTimeout(400);
const previaPlantilla = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/05 oct/.test(previaPlantilla) || !/22 oct/.test(previaPlantilla)) {
  errores.push('la previsualización de la plantilla no calculó las fechas: ' + previaPlantilla.slice(0, 200));
} else {
  await pagina.getByRole('button', { name: 'Crear las tareas' }).click();
  await pagina.waitForTimeout(400);
  await pagina.goto(BASE + '#/buscar/Calificar');
  await pagina.waitForTimeout(400);
  if (!(await pagina.textContent('#app')).includes('Calificar')) errores.push('las tareas de la plantilla no se crearon');
  else console.log('  ok  plantillas: previsualizar y crear');
}

// Estimado frente a real
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const ids = [];
  for (const [titulo, estimado, real] of [['Calificar', 120, 180], ['Preparar', 60, 90], ['Revisar', 60, 120]]) {
    const t = store.agregar({ titulo, duracion: estimado, modulo: 'docencia' });
    ids.push([t.id, real]);
  }
  for (const [id, minutos] of ids) store.registrarTiempo({ tipo: 'pomodoro', tareaId: id, minutos, fecha: '2026-09-19' });
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/enfoque');
await pagina.waitForTimeout(500);
const calibracion = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/×1\.5/.test(calibracion) || !/50 % más/.test(calibracion)) {
  errores.push('la calibración no salió: ' + calibracion.slice(-260));
} else console.log('  ok  estimado frente a real: factor ×1.5');

// Nivelación de recursos
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const { proyectoVacio, tareaProyecto } = await import('./src/proyectos.js');
  const p = proyectoVacio('Nivelación', '2026-09-21');
  const ancla = tareaProyecto({ nombre: 'Ancla', duracion: 10, recurso: 'Ana' });
  const larga = tareaProyecto({ nombre: 'Larga', duracion: 5, recurso: 'Yo' });
  const corta = tareaProyecto({ nombre: 'Corta', duracion: 3, recurso: 'Yo' });
  p.tareas = [ancla, larga, corta,
    tareaProyecto({ nombre: 'Fin', duracion: 1, dependencias: [{ de: ancla.id }, { de: larga.id }, { de: corta.id }] })];
  store.agregarPlan(p);
  store.ajustar({ ultimoPlan: p.id });
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/proyectos');
await pagina.waitForTimeout(400);
await pagina.locator('#app select').first().selectOption({ label: 'Nivelación' });
await pagina.waitForTimeout(300);
await pagina.locator('.pestana', { hasText: 'Recursos' }).click();
await pagina.waitForTimeout(300);
const antesNivelar = (await pagina.textContent('#app')).includes('sobreasignado');
await pagina.getByRole('button', { name: /Nivelar con la holgura/ }).click();
await pagina.waitForTimeout(600);
const despues = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!antesNivelar) errores.push('el proyecto de prueba no marcó la sobreasignación');
else if (!/Ya no hay nadie sobreasignado/.test(despues)) errores.push('la nivelación no resolvió el choque: ' + despues.slice(0, 300));
else console.log('  ok  nivelación automática de recursos');

// Las tres del día
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(300);
await pagina.getByRole('button', { name: 'Elegir por mí' }).click();
await pagina.waitForTimeout(300);
const tres = await pagina.locator('.tres-dia .foco li').count();
if (!tres) errores.push('las tres del día no se eligieron solas');
else console.log(`  ok  las tres del día (${tres} elegidas)`);

// Borrar va a la papelera y se restaura
const antesBorrar = await pagina.locator('.tarea').count();
pagina.once('dialog', (d) => d.accept());
await pagina.locator('.tarea').first().getByTitle('Borrar').click();
await pagina.waitForTimeout(400);
await pagina.goto(BASE + '#/ajustes');
await pagina.waitForTimeout(400);
const textoAjustes = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/Papelera \(1\)/.test(textoAjustes)) errores.push('lo borrado no llegó a la papelera');
else {
  // "Restaurar" a secas también casa con "Restaurar copia (.json)": hay que acotar a la tarjeta.
  await pagina.locator('.card', { hasText: 'Papelera' }).getByRole('button', { name: 'Restaurar', exact: true }).first().click();
  await pagina.waitForTimeout(400);
  await pagina.goto(BASE + '#/hoy');
  await pagina.waitForTimeout(400);
  const despuesRestaurar = await pagina.locator('.tarea').count();
  if (despuesRestaurar !== antesBorrar) errores.push(`restaurar no devolvió la tarea (${antesBorrar} → ${despuesRestaurar})`);
  else console.log('  ok  papelera: borrar y restaurar');
}

// Deshacer global con Ctrl+Z
const antesDeshacer = await pagina.locator('.tarea').count();
pagina.once('dialog', (d) => d.accept());
await pagina.locator('.tarea').first().getByTitle('Borrar').click();
await pagina.waitForTimeout(400);
await pagina.keyboard.press('Control+z');
await pagina.waitForTimeout(500);
if (await pagina.locator('.tarea').count() !== antesDeshacer) errores.push('Ctrl+Z no deshizo el borrado');
else console.log('  ok  deshacer global con Ctrl+Z');

// Autocompletado de proyectos
await pagina.fill('[data-rapida]', 'Revisar algo #car');
await pagina.waitForTimeout(350);
const sugerencia = await pagina.locator('.sugerencias.abierta .sugerencia').first().textContent().catch(() => '');
if (!/Cartera/i.test(sugerencia || '')) errores.push('el autocompletado no sugirió el proyecto: ' + sugerencia);
else {
  await pagina.keyboard.press('Tab');
  await pagina.waitForTimeout(200);
  const valor = await pagina.locator('[data-rapida]').inputValue();
  if (!valor.includes('#Cartera')) errores.push('Tab no completó el proyecto: ' + valor);
  else console.log('  ok  autocompletar # y @');
  await pagina.fill('[data-rapida]', '');
}

// Capacidad real entre módulos
await pagina.goto(BASE + '#/planificar');
await pagina.waitForTimeout(500);
const celdas = await pagina.locator('.celda-carga').count();
if (celdas !== 28) errores.push(`el mapa de capacidad debería tener 28 días, tiene ${celdas}`);
else console.log('  ok  capacidad: mapa de cuatro semanas');

// Salud explicada
await pagina.goto(BASE + '#/revision');
await pagina.waitForTimeout(500);
const salud = await pagina.locator('.salud-fila').count();
if (!salud) errores.push('la salud por proyecto no se dibujó');
else console.log(`  ok  salud explicada (${salud} proyectos)`);

// Fecha probabilística y escenarios
await pagina.goto(BASE + '#/proyectos');
await pagina.waitForTimeout(400);
await pagina.locator('.pestana', { hasText: 'Fecha y escenarios' }).click();
await pagina.waitForTimeout(900);
const riesgo = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
const columnas = await pagina.locator('.columna-hist').count();
if (!/P80/.test(riesgo) || columnas !== 12) errores.push('la fecha probabilística no salió: ' + riesgo.slice(0, 200));
else {
  const caja = pagina.locator('.card', { hasText: '¿Qué pasa si' });
  const selectorTarea = caja.locator('select').first();
  const opciones = await selectorTarea.locator('option').count();
  await selectorTarea.selectOption({ index: 1 });        // la primera tarea del plan
  await pagina.waitForTimeout(600);
  const escenario = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
  if (!/(más tarde|no cambia|antes)/.test(escenario)) errores.push('el escenario no calculó el impacto');
  else console.log(`  ok  fecha probabilística y "¿qué pasa si?" (${opciones - 1} tareas)`);
}

// Tablero: arrastrar una tarjeta de columna cambia su fecha
await pagina.goto(BASE + '#/tablero');
await pagina.waitForTimeout(500);
const enBandeja = await pagina.locator('[data-columna="bandeja"] .tarjeta').count();
if (!(await pagina.locator('.columna-tablero').count())) errores.push('el tablero no dibujó columnas');
else {
  const tarjeta = pagina.locator('[data-columna="hoy"] .tarjeta').first();
  if (await tarjeta.count()) {
    const origen = await tarjeta.boundingBox();
    const destino = await pagina.locator('[data-columna="despues"]').boundingBox();
    await pagina.mouse.move(origen.x + 20, origen.y + 10);
    await pagina.mouse.down();
    await pagina.mouse.move(destino.x + 60, destino.y + 60, { steps: 10 });
    await pagina.mouse.up();
    await pagina.waitForTimeout(500);
    const despues = await pagina.locator('[data-columna="despues"] .tarjeta').count();
    if (!despues) errores.push('arrastrar en el tablero no movió la tarjeta');
    else console.log('  ok  tablero: arrastrar entre columnas');
  }
}

// Modo concentración
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(300);
await pagina.locator('.tarea').first().getByTitle('Trabajar en esto y nada más').click();
await pagina.waitForTimeout(500);
const concentrado = await pagina.locator('.concentracion .aro-progreso').count();
const lateralOculta = !(await pagina.locator('.lateral').isVisible().catch(() => false));
if (!concentrado || !lateralOculta) errores.push('el modo concentración no escondió el resto de la app');
else console.log('  ok  modo concentración');
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(300);

// Informe de tiempo
await pagina.goto(BASE + '#/enfoque');
await pagina.waitForTimeout(300);
await pagina.locator('.pestana', { hasText: 'Informe' }).click();
await pagina.waitForTimeout(500);
const informe = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/A dónde se fue el tiempo/.test(informe)) errores.push('el informe de tiempo no salió');
else console.log('  ok  informe de tiempo');

// Prueba de estrés y plan de aportes
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  store.estado.inversiones.posiciones = [
    { ticker: 'NVDA', cantidad: 40, entrada: 118, precio: 176, stop: 150, sector: 'Tecnología', tesis: 'x', revisadaEn: '2026-09-20' },
    { ticker: 'KO', cantidad: 60, entrada: 58, precio: 62, sector: 'Consumo', tesis: 'y', revisadaEn: '2026-09-20' },
  ];
  store.guardar();
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/inversiones');
await pagina.waitForTimeout(400);
await pagina.locator('.pestana', { hasText: 'Estrés y aportes' }).click();
await pagina.waitForTimeout(500);
const estres = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/stops que saltan/.test(estres)) errores.push('la prueba de estrés no salió: ' + estres.slice(0, 160));
else console.log('  ok  prueba de estrés y plan de aportes');

// Informe fiscal
await pagina.locator('.pestana', { hasText: 'Fiscal' }).click();
await pagina.waitForTimeout(400);
if (!/Plusvalías realizadas/.test(await pagina.textContent('#app'))) errores.push('el informe fiscal no salió');
else console.log('  ok  informe fiscal');

// Compartir una lista por enlace y volver a importarla
await pagina.goto(BASE + '#/proyecto/Cartera');
await pagina.waitForTimeout(400);
await pagina.getByRole('button', { name: /Compartir/ }).first().click();
await pagina.waitForTimeout(700);
const enlace = await pagina.locator('.drawer-body .field-hint').textContent().catch(() => '');
if (!/#\/importar-lista\?d=/.test(enlace || '')) errores.push('compartir no generó el enlace: ' + enlace);
else {
  const qr = await pagina.locator('.qr svg').count();
  await pagina.goto(enlace.trim());
  await pagina.waitForTimeout(800);
  const importar = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
  if (!/Qué trae/.test(importar)) errores.push('el enlace compartido no se pudo leer: ' + importar.slice(0, 160));
  else console.log(`  ok  compartir por enlace${qr ? ' y QR' : ''}, y leerlo de vuelta`);
}

// Respaldo cifrado: exportar e intentar leerlo
const cifrado = await pagina.evaluate(async () => {
  const { cifrar, descifrar, esArchivoCifrado } = await import('./src/compartir.js');
  const sobre = await cifrar('{"secreto":true}', 'clave de prueba');
  const leido = await descifrar(sobre, 'clave de prueba');
  let falla = false;
  try { await descifrar(sobre, 'otra'); } catch { falla = true; }
  return { esCifrado: esArchivoCifrado(sobre), enClaro: sobre.includes('secreto'), leido, falla };
});
if (!cifrado.esCifrado || cifrado.enClaro || cifrado.leido !== '{"secreto":true}' || !cifrado.falla) {
  errores.push('el respaldo cifrado no se comporta: ' + JSON.stringify(cifrado));
} else console.log('  ok  respaldo cifrado (y con otra contraseña, falla)');

// Adjuntos en IndexedDB
const adj = await pagina.evaluate(async () => {
  const m = await import('./src/adjuntos.js');
  const archivo = new File([new Uint8Array([1, 2, 3, 4])], 'prueba.txt', { type: 'text/plain' });
  const ficha = await m.guardar('tarea-de-prueba', archivo);
  const lista = await m.listar('tarea-de-prueba');
  await m.borrar(ficha.id);
  const despues = await m.listar('tarea-de-prueba');
  return { guardado: lista.length, borrado: despues.length, nombre: lista[0]?.nombre };
});
if (adj.guardado !== 1 || adj.borrado !== 0) errores.push('los adjuntos no se guardan o no se borran: ' + JSON.stringify(adj));
else console.log('  ok  adjuntos en IndexedDB');


// Captura: la tecla `n` abre la caja sobre cualquier pantalla
await pagina.goto(BASE + '#/proyectos');
await pagina.waitForTimeout(400);
await pagina.keyboard.press('n');
await pagina.waitForTimeout(300);
if (!(await pagina.locator('.drawer.captura').count())) errores.push('la tecla n no abrió la captura');
else {
  await pagina.fill('.drawer.captura [data-rapida]', 'Cosa capturada desde proyectos');
  await pagina.press('.drawer.captura [data-rapida]', 'Enter');
  await pagina.waitForTimeout(300);
  await pagina.keyboard.press('Escape');
  await pagina.goto(BASE + '#/bandeja');
  await pagina.waitForTimeout(400);
  if (!(await pagina.textContent('#app')).includes('Cosa capturada desde proyectos')) {
    errores.push('lo capturado con la tecla n no llegó a la bandeja');
  } else console.log('  ok  captura con la tecla n desde cualquier pantalla');
}

// Duplicados: avisar de que ya tienes esa tarea
await pagina.fill('[data-rapida]', 'cosa capturada proyectos');
await pagina.waitForTimeout(400);
const aviso = await pagina.locator('.aviso-duplicado').first().textContent().catch(() => '');
if (!/ya la tengas/.test(aviso || '')) errores.push('no avisó del duplicado: ' + aviso);
else console.log('  ok  aviso de tarea duplicada');
await pagina.fill('[data-rapida]', '');

// Reglas de automatización: se aplican al crear y dejan constancia
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  store.agregarEn('reglas', {
    id: 'r-humo', nombre: 'Llamadas', activa: true,
    condicion: { tipo: 'titulo', valor: 'llamar' },
    acciones: [{ tipo: 'etiqueta', valor: 'llamar' }, { tipo: 'prioridad', valor: 2 }],
    veces: 0,
  });
});
const reglaAplicada = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const t = store.agregar({ titulo: 'Llamar al seguro del coche' });
  const regla = store.estado.reglas.find((r) => r.id === 'r-humo');
  return { etiquetas: t.etiquetas, prioridad: t.prioridad, aplicadas: t.reglasAplicadas, veces: regla.veces };
});
if (!reglaAplicada.etiquetas?.includes('llamar') || reglaAplicada.prioridad !== 2 || reglaAplicada.veces !== 1) {
  errores.push('la regla de automatización no actuó: ' + JSON.stringify(reglaAplicada));
} else console.log('  ok  reglas de automatización (y dicen cuál actuó)');

// Informes a medida
await pagina.goto(BASE + '#/informes');
await pagina.waitForTimeout(500);
const selectoresInforme = pagina.locator('.card').first().locator('select');
await selectoresInforme.nth(0).selectOption('minutos');
await pagina.waitForTimeout(300);
await selectoresInforme.nth(1).selectOption('proyecto');
await pagina.waitForTimeout(400);
const textoInformes = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
const filasInforme = await pagina.locator('.salud-fila').count();
if (!/Tiempo medido/.test(textoInformes) || !filasInforme) {
  errores.push('el informe a medida no se recalculó: ' + textoInformes.slice(0, 200));
} else {
  const [csv] = await Promise.all([
    pagina.waitForEvent('download'),
    pagina.getByRole('button', { name: 'Descargar CSV' }).click(),
  ]);
  const contenido = readFileSync(await csv.path(), 'utf8');
  if (!/"Grupo"/.test(contenido)) errores.push("el CSV del informe no tiene cabecera: " + contenido.slice(0, 80));
  else console.log(`  ok  informes a medida (${filasInforme} grupo(s)) y su CSV`);
}

// Copiloto: responde con cálculo y admite lo que no sabe
await pagina.goto(BASE + '#/copiloto');
await pagina.waitForTimeout(400);
await pagina.locator('.chip', { hasText: '¿Quién está sobrecargado?' }).click();
await pagina.waitForTimeout(500);
const respuesta = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/sobrecargado/i.test(respuesta)) errores.push('el copiloto no respondió: ' + respuesta.slice(0, 200));
else {
  await pagina.fill('#app input[type="search"], #app .rapida input', '¿subirá el bitcoin?');
  await pagina.getByRole('button', { name: 'Preguntar' }).click();
  await pagina.waitForTimeout(400);
  const noSabe = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
  if (!/no la sé calcular/.test(noSabe)) errores.push('el copiloto no admitió lo que no sabe: ' + noSabe.slice(0, 200));
  else console.log('  ok  copiloto: responde con cálculo y dice lo que no sabe');
}

// Riesgos ligeros por proyecto
await pagina.goto(BASE + '#/proyectos');
await pagina.waitForTimeout(500);
await pagina.locator('.pestana', { hasText: 'Riesgos' }).click();
await pagina.waitForTimeout(300);
await pagina.getByRole('button', { name: '+ Riesgo' }).click();
await pagina.waitForTimeout(400);
// La tarjeta cambia de clase al cambiar el nivel, así que se vuelve a buscar.
const tarjetaRiesgo = () => pagina.locator('[class*="riesgo-"]').first();
await tarjetaRiesgo().locator('select').nth(0).selectOption('3');
await pagina.waitForTimeout(300);
await tarjetaRiesgo().locator('select').nth(1).selectOption('3');
await pagina.waitForTimeout(400);
if (!(await pagina.locator('.card.riesgo-alto').count())) errores.push('el riesgo no subió a alto al subir probabilidad e impacto');
else console.log('  ok  riesgos ligeros por proyecto');

// Secciones dentro de un proyecto
await pagina.goto(BASE + '#/proyecto/Cartera');
await pagina.waitForTimeout(400);
await pagina.getByPlaceholder('Sección nueva').fill('Revisión trimestral');
await pagina.getByRole('button', { name: 'Añadir sección' }).click();
await pagina.waitForTimeout(400);
const conSeccion = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/Revisión trimestral/.test(conSeccion) || !/Sin sección/.test(conSeccion)) {
  errores.push('las secciones no se dibujaron: ' + conSeccion.slice(0, 200));
} else console.log('  ok  secciones dentro de un proyecto');

// Favoritos: la estrella fija la vista en la barra lateral
await pagina.goto(BASE + '#/calendario');
await pagina.waitForTimeout(400);
await pagina.locator('.cabecera-vista').getByTitle('Fijar en la barra lateral').click();
await pagina.waitForTimeout(400);
if (!(await pagina.locator('.nav-titulo', { hasText: 'Favoritos' }).count())) {
  errores.push('la estrella no fijó la vista en la barra lateral');
} else console.log('  ok  favoritos en la barra lateral');

// Interrupciones desde la pantalla de concentración
await pagina.goto(BASE + '#/concentracion');
await pagina.waitForTimeout(400);
await pagina.locator('.chip', { hasText: 'Alguien vino' }).click();
await pagina.waitForTimeout(400);
const apuntadas = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  return store.estado.interrupciones.length;
});
if (apuntadas !== 1) errores.push('la interrupción no se apuntó: ' + apuntadas);
else console.log('  ok  registro de interrupciones');
await pagina.keyboard.press('Escape');
await pagina.waitForTimeout(300);

// Accesibilidad básica
const a11y = await pagina.evaluate(() => {
  const saltar = document.querySelector('.saltar');
  const iconos = [...document.querySelectorAll('.btn')].filter((b) => !/[\p{L}\p{N}]/u.test(b.textContent || ''));
  return {
    saltar: !!saltar,
    main: !!document.querySelector('main#app'),
    navs: document.querySelectorAll('nav[aria-label]').length,
    iconosSinNombre: iconos.filter((b) => !b.getAttribute('aria-label') && !b.getAttribute('title')).length,
  };
});
if (!a11y.saltar || !a11y.main || a11y.navs < 1 || a11y.iconosSinNombre) {
  errores.push('accesibilidad: ' + JSON.stringify(a11y));
} else console.log(`  ok  accesibilidad (${a11y.navs} zonas de navegación, ningún icono sin nombre)`);

await pagina.setViewportSize({ width: 390, height: 844 });
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(300);
if (!(await pagina.locator('.barra-inferior').isVisible())) errores.push('la barra inferior no aparece en móvil');
else if (await pagina.evaluate(() => document.documentElement.scrollWidth) > 400) errores.push('hay scroll horizontal en móvil');
else console.log('  ok  vista de móvil');

await navegador.close();
cerrar();

if (errores.length) {
  console.error('\nFallos:\n' + errores.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('\nPrueba de humo OK');
