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
  'informes', 'copiloto', 'panel', 'notas', 'colecciones', 'objetivos', 'gastos', 'personas',
  'rutinas', 'viajes', 'logros', 'anio', 'ideas', 'ajustes'];

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


// Notas: enlaces [[así]] y quién apunta a quién
await pagina.goto(BASE + '#/notas');
await pagina.waitForTimeout(400);
await pagina.getByRole('button', { name: 'Nota nueva' }).click();
await pagina.waitForTimeout(400);
await pagina.locator('.card.nota.abierta input').first().fill('Cartera');
await pagina.locator('.card.nota.abierta textarea').first().fill('La tesis está en [[Tesis de NVDA]].');
await pagina.getByRole('button', { name: 'Guardar' }).click();
await pagina.waitForTimeout(400);
const rotos = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/Cartera/.test(rotos)) errores.push('la nota no se guardó');
else {
  await pagina.getByRole('button', { name: 'Editar' }).first().click();
  await pagina.waitForTimeout(300);
  await pagina.locator('.chip', { hasText: 'crear “Tesis de NVDA”' }).click();
  await pagina.waitForTimeout(400);
  await pagina.getByRole('button', { name: 'Guardar' }).click();
  await pagina.waitForTimeout(400);
  const conEnlace = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
  if (!/Apuntan aquí/.test(conEnlace)) errores.push('los enlaces entre notas no salieron: ' + conEnlace.slice(0, 200));
  else console.log('  ok  notas: enlaces [[dobles]] y quién apunta a quién');
}

// Diario: se escribe el día y cuenta la racha
await pagina.locator('.pestana', { hasText: 'Diario' }).click();
await pagina.waitForTimeout(400);
await pagina.locator('#app textarea').first().fill('Hoy salió la ola 4.');
await pagina.getByRole('button', { name: 'Guardar el día' }).click();
await pagina.waitForTimeout(400);
const entradas = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const hoyISO = new Date().toISOString().slice(0, 10);
  const del = store.estado.notas.find((n) => n.tipo === 'diario' && n.fecha === hoyISO);
  return { total: store.estado.notas.filter((n) => n.tipo === 'diario').length, texto: del?.texto || '' };
});
if (entradas.total !== 1 || !/ola 4/.test(entradas.texto)) {
  errores.push('el diario no registró el día: ' + JSON.stringify(entradas));
} else console.log('  ok  diario del día');

// Colecciones: plantilla del carro, ficha y aviso de vencimiento
await pagina.goto(BASE + '#/colecciones');
await pagina.waitForTimeout(400);
await pagina.locator('#app select').first().selectOption('vehiculo');
await pagina.waitForTimeout(500);
await pagina.getByRole('button', { name: '+ Ficha' }).click();
await pagina.waitForTimeout(400);
const celdasFicha = pagina.locator('.tabla tbody tr').first().locator('input');
await celdasFicha.nth(0).fill('Mazda 3');
await celdasFicha.nth(0).press('Tab');
await pagina.waitForTimeout(300);
const fechaSeguro = pagina.locator('.tabla tbody tr').first().locator('input[type="date"]').first();
await fechaSeguro.fill('2026-10-05');
await fechaSeguro.press('Tab');
await pagina.waitForTimeout(500);
const conAviso = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/Vence pronto/.test(conAviso) || !/Mazda 3/.test(conAviso)) {
  errores.push('la colección no avisó del vencimiento: ' + conAviso.slice(0, 250));
} else console.log('  ok  colecciones: ficha con campo que avisa');

// Mantenimiento por uso: dos lecturas y el servicio que vence por kilómetros
const manten = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const { contadorNuevo, servicioNuevo, estadoServicio } = await import('./src/mantenimiento.js');
  const c = store.agregarEn('contadores', contadorNuevo({ nombre: 'Mazda 3', unidad: 'km' }));
  store.registrarLectura(c.id, 40000, '2026-06-25');
  store.registrarLectura(c.id, 45000, '2026-09-23');
  const malo = store.registrarLectura(c.id, 100, '2026-09-24');
  const s = store.agregarEn('mantenimientos', servicioNuevo({
    contador: c.id, nombre: 'Aceite', cadaUso: 5000, cadaDias: 180, ultimoUso: 42000, ultimaFecha: '2026-08-01',
  }));
  const e = estadoServicio(s, store.estado.contadores.find((x) => x.id === c.id), '2026-09-23');
  return { rechazado: !malo.ok, restanUso: e.restanUso, estimada: !!e.fechaPorUso };
});
if (!manten.rechazado || manten.restanUso !== 2000 || !manten.estimada) {
  errores.push('el mantenimiento por uso no cuadra: ' + JSON.stringify(manten));
} else console.log('  ok  mantenimiento por kilómetros (y el contador no retrocede)');

await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/colecciones');
await pagina.waitForTimeout(700);
if (!/faltan 2000 km/.test((await pagina.textContent('#app')).replace(/\s+/g, ' '))) {
  errores.push('el servicio por uso no se pintó en la colección del vehículo');
} else console.log('  ok  el vehículo enseña lo que le falta al aceite');

// Metas: el progreso se compara con el tiempo gastado, no solo el porcentaje
await pagina.goto(BASE + '#/objetivos');
await pagina.waitForTimeout(500);
await pagina.locator('#app .rapida input').first().fill('Correr 500 km este año');
await pagina.getByRole('button', { name: 'Añadir meta' }).click();
await pagina.waitForTimeout(500);
const panelMeta = pagina.locator('.drawer').first();
await panelMeta.locator('input[type="number"]').first().fill('120');
await panelMeta.locator('input[type="number"]').first().press('Tab');
await pagina.waitForTimeout(300);
await panelMeta.getByRole('button', { name: 'Listo' }).click();
await pagina.waitForTimeout(500);
const obj = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/atrasado/.test(obj) || !/por semana/.test(obj)) {
  errores.push('la meta no comparó progreso y tiempo: ' + obj.slice(0, 250));
} else console.log('  ok  metas: 120 de 500 km en septiembre es ir tarde');

// Gastos: presupuesto y ritmo del mes
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const { gastoNuevo } = await import('./src/gastos.js');
  for (const g of [
    { que: 'Arriendo', importe: 900, categoria: 'casa', fijo: true },
    { que: 'Mercado', importe: 220, categoria: 'comida' },
    { que: 'Gasolina', importe: 60, categoria: 'transporte' },
  ]) store.agregarEn('gastos', gastoNuevo({ ...g, fecha: new Date().toISOString().slice(0, 10) }));
  store.ponerPresupuesto('casa', 500);
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/gastos');
await pagina.waitForTimeout(600);
const gastos = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/1180|1\.180/.test(gastos) || !/% del mes/.test(gastos)) {
  errores.push('los gastos no sumaron o no compararon con el mes: ' + gastos.slice(0, 250));
} else console.log('  ok  gastos: total del mes y ritmo contra el presupuesto');

// Personas: el cumpleaños entra en la ventana de aviso
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const { personaNueva } = await import('./src/personas.js');
  const dentro = new Date();
  dentro.setDate(dentro.getDate() + 9);
  const mm = String(dentro.getMonth() + 1).padStart(2, '0');
  const dd = String(dentro.getDate()).padStart(2, '0');
  store.agregarEn('personas', personaNueva({
    nombre: 'Ana', cumple: `1990-${mm}-${dd}`,
    regalos: [{ id: 'r1', que: 'Libro de cocina', comprado: false }],
  }));
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/personas');
await pagina.waitForTimeout(600);
const personas = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/Toca preparar/.test(personas) || !/Ana cumple/.test(personas) || !/Libro de cocina/.test(personas)) {
  errores.push('la agenda de personas no avisó: ' + personas.slice(0, 250));
} else console.log('  ok  personas: cumpleaños con tiempo y el regalo pensado');

// Rutinas: los pasos se marcan y la rutina se completa
await pagina.goto(BASE + '#/rutinas');
await pagina.waitForTimeout(400);
await pagina.getByRole('button', { name: 'Traer las de ejemplo' }).click();
await pagina.waitForTimeout(600);
const casillas = pagina.locator('.card.rutina').first().locator('input[type="checkbox"]');
const cuantas = await casillas.count();
for (let i = 0; i < cuantas; i++) {
  await casillas.nth(i).click();
  await pagina.waitForTimeout(150);
}
await pagina.waitForTimeout(400);
if (!(await pagina.locator('.card.rutina.completa').count())) {
  errores.push('marcar todos los pasos no completó la rutina');
} else console.log(`  ok  rutinas: ${cuantas} pasos marcados y rutina completa`);

// Viajes: itinerario desde las tareas y presupuesto desde los gastos
const viaje = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const { viajeNuevo } = await import('./src/viajes.js');
  const desde = new Date(); desde.setDate(desde.getDate() + 17);
  const hasta = new Date(); hasta.setDate(hasta.getDate() + 21);
  const iso = (d) => d.toISOString().slice(0, 10);
  const v = store.agregarEn('viajes', viajeNuevo({ nombre: 'Madrid', destino: 'Madrid', desde: iso(desde), hasta: iso(hasta), presupuesto: 1500, personas: 2 }));
  store.agregar({ titulo: 'Museo del Prado', fecha: iso(new Date(desde.getTime() + 86400000)), hora: '10:00' });
  const { gastoNuevo } = await import('./src/gastos.js');
  store.agregarEn('gastos', gastoNuevo({ que: 'Hotel', importe: 400, categoria: 'viaje', viaje: v.id }));
  return v.id;
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/viajes');
await pagina.waitForTimeout(700);
const textoViaje = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/Museo del Prado/.test(textoViaje) || !/400 de 1500/.test(textoViaje)) {
  errores.push('el viaje no juntó itinerario y dinero: ' + textoViaje.slice(0, 300));
} else console.log('  ok  viajes: itinerario de las tareas y gasto de los gastos');

// Panel de vida: junta todo y ordena los avisos
await pagina.goto(BASE + '#/panel');
await pagina.waitForTimeout(700);
const panel = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
const tarjetasPanel = await pagina.locator('.tarjeta-panel').count();
if (tarjetasPanel !== 8) errores.push(`el panel debería tener 8 tarjetas, tiene ${tarjetasPanel}`);
else if (!/Pide atención/.test(panel)) errores.push('el panel no listó los avisos: ' + panel.slice(0, 250));
else console.log('  ok  panel de vida: 8 tarjetas y los avisos arriba');


// Paleta: buscar en todo y saltar con el teclado
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(400);
await pagina.keyboard.press('Control+k');
await pagina.waitForTimeout(400);
if (!(await pagina.locator('.paleta').count())) errores.push('Ctrl+K no abrió la paleta de búsqueda');
else {
  await pagina.locator('.paleta input').fill('cumpleaños');
  await pagina.waitForTimeout(400);
  const primero = await pagina.locator('.paleta-item').first().textContent();
  await pagina.keyboard.press('Enter');
  await pagina.waitForTimeout(500);
  if (!/personas/i.test(primero || '') || !/#\/personas/.test(pagina.url())) {
    errores.push(`la paleta no llevó a Personas (primero: ${primero}, url: ${pagina.url()})`);
  } else console.log('  ok  paleta: Ctrl+K, buscar una pantalla y entrar con Enter');

  // Y encuentra cosas, no solo pantallas
  await pagina.keyboard.press('/');
  await pagina.waitForTimeout(400);
  await pagina.locator('.paleta input').fill('mazda');
  await pagina.waitForTimeout(400);
  const grupos = (await pagina.textContent('.paleta-lista')).replace(/\s+/g, ' ');
  if (!/Fichas/.test(grupos) || !/Mazda 3/.test(grupos)) {
    errores.push('la paleta no encontró la ficha del carro: ' + grupos.slice(0, 160));
  } else console.log('  ok  paleta: encuentra fichas, no solo pantallas');
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(300);
  if (await pagina.locator('.paleta').count()) errores.push('Escape no cerró la paleta');
}


// Plazo: se escribe hablando y avisa cuando la planificas para después
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(400);
await pagina.fill('[data-rapida]', 'Enviar el paper antes del 30 de octubre');
await pagina.waitForTimeout(400);
const previaPlazo = await pagina.textContent('.vista-previa');
if (!/vence el/.test(previaPlazo)) errores.push('la vista previa no entendió el plazo: ' + previaPlazo);
else {
  await pagina.press('[data-rapida]', 'Enter');
  await pagina.waitForTimeout(400);
  const puesta = await pagina.evaluate(async () => {
    const { store } = await import('./src/store.js');
    const t = store.tareas.find((x) => x.titulo === 'Enviar el paper');
    if (!t) return null;
    // Se planifica para después del plazo: ahí es donde tiene que avisar.
    store.actualizar(t.id, { fecha: '2026-11-05' });
    return { limite: t.limite, id: t.id };
  });
  if (!puesta || puesta.limite !== '2026-10-30') errores.push('el plazo no se guardó: ' + JSON.stringify(puesta));
  else {
    await pagina.goto(BASE + '#/proximos');
    await pagina.goto(BASE + '#/hoy');
    await pagina.waitForTimeout(600);
    const conPlazo = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
    if (!/Plazos/.test(conPlazo) || !/así no llega/.test(conPlazo)) {
      errores.push('Hoy no avisó del plazo imposible: ' + conPlazo.slice(0, 250));
    } else console.log('  ok  plazos: "antes del 30" y el aviso de que así no llega');
  }
}

// Dependencias: una tarea espera a otra y se libera al cerrarla
const deps = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const a = store.agregar({ titulo: 'Pedir los datos al hospital' });
  const b = store.agregar({ titulo: 'Analizar los datos' });
  const ok = store.dependerDe(b.id, a.id);
  const ciclo = store.dependerDe(a.id, b.id);          // cerraría el círculo
  return { ok: ok.ok, cicloRechazado: !ciclo.ok, a: a.id, b: b.id };
});
if (!deps.ok || !deps.cicloRechazado) errores.push('las dependencias no se guardan o el círculo no se rechaza: ' + JSON.stringify(deps));
else {
  await pagina.goto(BASE + '#/proximos');
  await pagina.goto(BASE + '#/hoy');
  await pagina.waitForTimeout(500);
  await pagina.evaluate(async (id) => {
    const { store } = await import('./src/store.js');
    store.alternarCompletada(id, new Date().toISOString().slice(0, 10));
  }, deps.a);
  await pagina.goto(BASE + '#/proximos');
  await pagina.goto(BASE + '#/hoy');
  await pagina.waitForTimeout(600);
  const libre = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
  if (!/Se desbloqueó/.test(libre) || !/Analizar los datos/.test(libre)) {
    errores.push('no avisó de la tarea desbloqueada: ' + libre.slice(0, 250));
  } else console.log('  ok  dependencias: se bloquea, no admite círculos y avisa al liberarse');
}

// Cartera: dos proyectos a la vez y el choque que solo se ve juntándolos
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const { proyectoVacio, tareaProyecto } = await import('./src/proyectos.js');
  for (const [nombre, objetivo] of [['Paper de redes', '2026-09-30'], ['Curso nuevo', '2026-12-01']]) {
    const p = proyectoVacio(nombre, '2026-09-21');
    p.fechaObjetivo = objetivo;
    p.tareas = [tareaProyecto({ nombre: 'Bloque largo', duracion: 10, recurso: 'Yo' })];
    store.agregarPlan(p);
  }
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/proyectos');
await pagina.waitForTimeout(600);
await pagina.locator('.pestana', { hasText: 'Cartera' }).click();
await pagina.waitForTimeout(800);
const cartera = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/Paper de redes/.test(cartera) || !/Curso nuevo/.test(cartera)) {
  errores.push('la cartera no listó los proyectos: ' + cartera.slice(0, 250));
} else if (!/En dos sitios a la vez/.test(cartera) || !/Yo está en/.test(cartera)) {
  errores.push('la cartera no detectó el choque entre planes: ' + cartera.slice(0, 300));
} else console.log('  ok  cartera: todos los proyectos y el choque de recurso entre ellos');


// Logros: las medallas salen de lo medido y se felicitan una sola vez
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const hoyISO = new Date().toISOString().slice(0, 10);
  // 120 tareas cerradas: bronce de "trabajo hecho". Nada de contadores a mano.
  store.estado.historial.push(...Array.from({ length: 120 }, (_, i) => ({ id: 'h' + i, tareaId: 'x', titulo: 'Vieja', fecha: hoyISO })));
  store.estado.tiempo.push({ id: 'r-logro', tipo: 'pomodoro', minutos: 700, fecha: hoyISO });
  store.ajustar({ medallasVistas: {} });
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/logros');
await pagina.waitForTimeout(700);
const logros = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
const medallas = await pagina.locator('.medalla').count();
if (medallas < 10) errores.push(`deberían pintarse todas las medallas, salieron ${medallas}`);
else if (!/Medalla nueva|medallas nuevas/.test(logros)) errores.push('no felicitó por la medalla nueva: ' + logros.slice(0, 200));
else {
  await pagina.getByRole('button', { name: 'Visto' }).click();
  await pagina.waitForTimeout(500);
  if (/Medalla nueva|medallas nuevas/.test((await pagina.textContent('#app')))) {
    errores.push('la felicitación vuelve a salir después de darle a Visto');
  } else console.log(`  ok  logros: ${medallas} medallas, y se felicita una sola vez`);
}

// Las estrellas del día salen en Hoy y cuentan lo que de verdad pasó
const estrellas = await pagina.evaluate(async () => {
  const { estrellasDelDia } = await import('./src/logros.js');
  const { store } = await import('./src/store.js');
  const hoyISO = new Date().toISOString().slice(0, 10);
  const e = estrellasDelDia(store.estado, hoyISO);
  return { de: e.de, estrellas: e.estrellas, ids: e.criterios.map((c) => c.id) };
});
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(500);
const conEstrellas = await pagina.locator('.estrellas-hoy .estrella.ganada').count();
if (!estrellas.de || conEstrellas !== estrellas.estrellas) {
  errores.push(`las estrellas de Hoy no cuadran: ${JSON.stringify(estrellas)} frente a ${conEstrellas} pintadas`);
} else console.log(`  ok  estrellas del día: ${estrellas.estrellas} de ${estrellas.de} en Hoy`);


// Metas: se escriben en una línea, se suman con +1 y se agrupan por horizonte
await pagina.goto(BASE + '#/objetivos');
await pagina.waitForTimeout(500);
await pagina.locator('#app .rapida input').first().fill('Leer 24 libros este año');
await pagina.waitForTimeout(300);
const pistaMeta = await pagina.textContent('#app .vista-previa');
if (!/meta 24 libros/.test(pistaMeta) || !/de este año/.test(pistaMeta)) {
  errores.push('la pista de la meta no interpretó la línea: ' + pistaMeta);
} else {
  await pagina.getByRole('button', { name: 'Añadir meta' }).click();
  await pagina.waitForTimeout(500);
  await pagina.locator('.drawer').first().getByRole('button', { name: 'Listo' }).click();
  await pagina.waitForTimeout(400);
  const creada = await pagina.evaluate(async () => {
    const { store } = await import('./src/store.js');
    const o = store.estado.objetivos.find((x) => x.que === 'Leer 24 libros');
    return o ? { meta: o.meta, unidad: o.unidad, horizonte: o.horizonte, actual: o.actual } : null;
  });
  if (!creada || creada.meta !== 24 || creada.horizonte !== 'anio') {
    errores.push('la meta no se creó bien desde la línea: ' + JSON.stringify(creada));
  } else {
    // El +1 es lo que se usa todos los días. Se busca por su nombre: para
    // entonces ya hay más de una meta en la lista.
    const fila = () => pagina.locator('.meta', { hasText: 'Leer 24 libros' }).first();
    await fila().getByTitle('Sumar uno').click();
    await pagina.waitForTimeout(300);
    await fila().getByTitle('Sumar uno').click();
    await pagina.waitForTimeout(400);
    const cifra = await fila().locator('.meta-cifra').textContent();
    if (!/2\/24/.test(cifra)) errores.push(`el +1 no sumó: "${cifra}"`);
    else console.log('  ok  metas: se escriben en una línea y se suman con +1');
  }
}

// Una meta de vida con sus años dentro, y el avance que sale de ellas
const metas = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const { objetivoNuevo, progresoConHijos } = await import('./src/objetivos.js');
  const vida = store.agregarEn('objetivos', objetivoNuevo({ que: 'Publicar un libro', horizonte: 'vida', hasta: null, tipo: 'siNo' }));
  store.agregarEn('objetivos', objetivoNuevo({ que: 'Terminar el borrador', horizonte: 'anio', padre: vida.id, meta: 10, actual: 10, desde: '2026-01-01', hasta: '2026-12-31' }));
  store.agregarEn('objetivos', objetivoNuevo({ que: 'Buscar editorial', horizonte: 'anio', padre: vida.id, tipo: 'siNo', desde: '2027-01-01', hasta: '2027-12-31' }));
  const p = progresoConHijos(vida, store.estado.objetivos, {}, new Date().toISOString().slice(0, 10));
  return { pct: p.pct, desdeHijas: p.desdeHijas };
});
if (metas.pct !== 50 || !metas.desdeHijas) errores.push('el avance de la meta de vida no sale de sus hijas: ' + JSON.stringify(metas));
else {
  await pagina.goto(BASE + '#/hoy');
  await pagina.goto(BASE + '#/objetivos');
  await pagina.waitForTimeout(700);
  const texto = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
  const grupos = await pagina.locator('#app .card-title').allTextContents();
  if (!/2 metas dentro/.test(texto)) errores.push('no dice que el avance viene de dentro: ' + texto.slice(0, 200));
  else if (!grupos.some((g) => /De vida/.test(g)) || !grupos.some((g) => /De este año/.test(g))) {
    errores.push('las metas no salen agrupadas por horizonte: ' + grupos.join(' | '));
  } else console.log('  ok  metas: la de vida contiene sus años y se ven agrupadas');
}

// El año en una página
await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const anio = new Date().getFullYear();
  for (let i = 0; i < 12; i++) {
    store.estado.historial.push({ id: 'ha' + i, tareaId: 'x', titulo: 'Del año', fecha: `${anio}-0${(i % 9) + 1}-0${(i % 9) + 1}` });
  }
  // Una cumplida y otra dejada: el año tiene que contar las dos cosas.
  const { objetivoNuevo } = await import('./src/objetivos.js');
  store.agregarEn('objetivos', objetivoNuevo({ que: 'Correr 500 km', logradoEn: `${anio}-08-01` }));
  store.agregarEn('objetivos', objetivoNuevo({ que: 'Aprender alemán', abandonadoEn: `${anio}-05-01`, porque: 'No era el año' }));
  store.guardar();
});
await pagina.goto(BASE + '#/hoy');
await pagina.goto(BASE + '#/anio');
await pagina.waitForTimeout(700);
const anioTexto = (await pagina.textContent('#app')).replace(/\s+/g, ' ');
if (!/cosas cerradas/.test(anioTexto) || !/Mes a mes/.test(anioTexto)) {
  errores.push('el resumen del año no salió: ' + anioTexto.slice(0, 250));
} else if (!/Correr 500 km/.test(anioTexto) || !/No era el año/.test(anioTexto)) {
  errores.push('el año no recoge las metas cumplidas y las dejadas: ' + anioTexto.slice(0, 250));
} else {
  const [txt] = await Promise.all([
    pagina.waitForEvent('download'),
    pagina.getByRole('button', { name: 'Descargar .txt' }).click(),
  ]);
  const contenido = readFileSync(await txt.path(), 'utf8');
  if (!/Cerradas: /.test(contenido)) errores.push('el .txt del año no trae el resumen: ' + contenido.slice(0, 120));
  else console.log('  ok  el año en una página, y se lo lleva en .txt');
}


// La caja de añadir con botones: fecha, prioridad y a dónde va
await pagina.goto(BASE + '#/bandeja');
await pagina.waitForTimeout(500);
await pagina.getByRole('button', { name: 'Más opciones' }).first().click();
await pagina.waitForTimeout(400);
const opciones = pagina.locator('.opciones-rapida').first();
if (!(await opciones.count())) errores.push('el botón de más opciones no abrió el panel');
else {
  await opciones.locator('input[type="date"]').first().fill('2026-10-05');
  await opciones.locator('select').first().selectOption({ label: 'Cartera' });
  await opciones.locator('.chip.prioridad', { hasText: 'P2' }).click();
  await pagina.waitForTimeout(300);
  await pagina.fill('[data-rapida]', 'Revisar el informe trimestral');
  await pagina.waitForTimeout(400);
  const previaOpciones = await pagina.textContent('.vista-previa');
  if (!/P2/.test(previaOpciones) || !/Cartera/.test(previaOpciones)) {
    errores.push('la vista previa no refleja lo elegido con botones: ' + previaOpciones);
  } else {
    await pagina.press('[data-rapida]', 'Enter');
    await pagina.waitForTimeout(400);
    const creada = await pagina.evaluate(async () => {
      const { store } = await import('./src/store.js');
      const t = store.tareas.find((x) => x.titulo === 'Revisar el informe trimestral');
      return t ? { fecha: t.fecha, prioridad: t.prioridad, proyecto: t.proyecto } : null;
    });
    if (!creada || creada.fecha !== '2026-10-05' || creada.prioridad !== 2 || creada.proyecto !== 'Cartera') {
      errores.push('la tarea no se creó con lo elegido: ' + JSON.stringify(creada));
    } else console.log('  ok  añadir con botones: fecha, prioridad y a dónde va');
  }
}

// Y lo escrito sigue mandando sobre lo elegido
const manana = await pagina.evaluate(() => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
});
// Ojo: nada de "llamar" en el título, que hay una regla de automatización
// creada más arriba que le pone prioridad 2 a todo lo que lo diga.
await pagina.fill('[data-rapida]', 'Pasar por el banco mañana p1');
await pagina.waitForTimeout(400);
await pagina.press('[data-rapida]', 'Enter');
await pagina.waitForTimeout(400);
const mandaLoEscrito = await pagina.evaluate(async () => {
  const { store } = await import('./src/store.js');
  const t = store.tareas.find((x) => x.titulo === 'Pasar por el banco');
  return t ? { prioridad: t.prioridad, fecha: t.fecha } : null;
});
if (!mandaLoEscrito || mandaLoEscrito.prioridad !== 1 || mandaLoEscrito.fecha !== manana) {
  errores.push('lo escrito no ganó a los controles: ' + JSON.stringify(mandaLoEscrito));
} else console.log('  ok  lo escrito manda sobre lo elegido con botones');

// Cronómetro por tarea: arranca, se ve la barra, para y apunta
await pagina.goto(BASE + '#/hoy');
await pagina.waitForTimeout(500);
await pagina.locator('.tarea').first().getByTitle('Medir el tiempo de esta tarea').click();
await pagina.waitForTimeout(1200);
if (!(await pagina.locator('.barra-crono').isVisible())) errores.push('la barra del cronómetro no apareció');
else {
  const corriendo = await pagina.evaluate(async () => {
    const { store } = await import('./src/store.js');
    const c = store.estado.cronometro;
    return { tareaId: c.tareaId, corriendo: c.corriendo };
  });
  // Se adelanta el reloj: medir de verdad un minuto en una prueba no tiene sentido.
  const guardado = await pagina.evaluate(async (id) => {
    const { store } = await import('./src/store.js');
    store.estado.cronometro.desde -= 32 * 60000;      // como si llevara media hora
    const antes = store.tarea(id)?.tiempoDedicado || 0;
    const r = store.pararCronometro();
    return { minutos: r?.minutos, antes, despues: store.tarea(id)?.tiempoDedicado || 0, registros: store.estado.tiempo.length };
  }, corriendo.tareaId);
  if (!corriendo.corriendo) errores.push('el cronómetro no quedó corriendo');
  else if (guardado.minutos !== 32 || guardado.despues !== guardado.antes + 32) {
    errores.push('el tiempo no se apuntó en la tarea: ' + JSON.stringify(guardado));
  } else console.log('  ok  cronómetro por tarea: cuenta, para y apunta los minutos');
  await pagina.goto(BASE + '#/hoy');
  await pagina.waitForTimeout(400);
  if (await pagina.locator('.barra-crono').isVisible()) errores.push('la barra sigue visible después de parar');
}


// Escribir sin que el campo se escape: guardar en cada tecla rehacía la barra
// lateral y el foco se iba al cuerpo a media palabra.
await pagina.goto(BASE + '#/personas');
await pagina.waitForTimeout(500);
await pagina.getByRole('button', { name: '+ Persona' }).click();
await pagina.waitForTimeout(400);
const campoNombre = pagina.locator('#app input').first();
await campoNombre.click();
for (const c of 'Ana Ruiz') { await pagina.keyboard.type(c); await pagina.waitForTimeout(60); }
await pagina.waitForTimeout(400);
const escrito = await campoNombre.inputValue();
const focoDentro = await pagina.evaluate(() => document.activeElement?.tagName === 'INPUT');
if (escrito !== 'Ana Ruiz' || !focoDentro) {
  errores.push(`escribir un nombre pierde el foco o caracteres: "${escrito}", foco en input: ${focoDentro}`);
} else console.log('  ok  escribir un nombre entero sin que salte el campo');

// Lo mismo en el buscador de fichas de una colección
await pagina.goto(BASE + '#/colecciones');
await pagina.waitForTimeout(600);
const campoFichas = pagina.getByPlaceholder('Buscar en las fichas');
if (await campoFichas.count()) {
  await campoFichas.click();
  for (const c of 'mazda') { await pagina.keyboard.type(c); await pagina.waitForTimeout(60); }
  await pagina.waitForTimeout(300);
  const buscado = await campoFichas.inputValue();
  if (buscado !== 'mazda') errores.push(`el buscador de fichas pierde letras: "${buscado}"`);
  else console.log('  ok  buscar en las fichas sin perder el foco');
}


// Escribir en una meta: ni se cambia de pantalla ni se pierden letras.
// Las teclas sueltas son atajos (p = Próximos, g = Proyectos…), así que
// perder el foco a media palabra hace que la app salte sola.
await pagina.goto(BASE + '#/objetivos');
await pagina.waitForTimeout(500);
await pagina.locator('#app .rapida input').first().click();
let saltó = null;
for (const c of 'programar') {
  await pagina.keyboard.type(c);
  await pagina.waitForTimeout(70);
  const hash = pagina.url().split('#')[1];
  if (hash !== '/objetivos' && !saltó) saltó = `${hash} al escribir "${c}"`;
}
await pagina.waitForTimeout(400);
const meta = await pagina.locator('#app .rapida input').first().inputValue().catch(() => '');
if (saltó) errores.push(`escribir una meta cambió de pantalla: ${saltó}`);
else if (meta !== 'programar') errores.push(`se perdieron letras al escribir una meta: "${meta}"`);
else console.log('  ok  escribir una meta sin que la app salte de pantalla');

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
else {
  // Si algo se sale, decir qué: "hay scroll horizontal" no se arregla solo.
  const ancho = await pagina.evaluate(() => {
    const ancho = document.documentElement.clientWidth;
    const seSale = (n) => n.getBoundingClientRect().right > ancho + 2;
    const culpables = [...document.querySelectorAll('*')]
      .filter(seSale)
      .filter((n) => ![...n.children].some(seSale))     // solo el más hondo de cada rama
      .map((n) => `${n.tagName}.${(n.className || '').toString().split(' ')[0]} (${Math.round(n.getBoundingClientRect().right)}px, "${(n.textContent || '').trim().slice(0, 25)}")`);
    return { scroll: document.documentElement.scrollWidth, culpables: culpables.slice(0, 5) };
  });
  if (ancho.scroll > 400) errores.push(`hay scroll horizontal en móvil (${ancho.scroll}px): ${ancho.culpables.join(', ') || 'sin culpable claro'}`);
  else console.log('  ok  vista de móvil');
}

await navegador.close();
cerrar();

if (errores.length) {
  console.error('\nFallos:\n' + errores.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('\nPrueba de humo OK');
