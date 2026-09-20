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
  'inversiones', 'proyectos', 'docencia', 'investigacion', 'alabanza', 'plantillas', 'ideas', 'ajustes'];

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
