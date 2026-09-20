/** Genera docs/hoja-de-ruta-recordatorios.md desde recordatorios/src/ideas.js. */
import { writeFileSync } from 'node:fs';
import { CATEGORIAS, DESCARTADAS, HECHAS, IDEAS, OLAS, PENDIENTES, porOla } from '../recordatorios/src/ideas.js';

const nombreCat = (id) => CATEGORIAS.find((c) => c.id === id)?.nombre || id;

const lineas = [
  '# Hoja de ruta de la app de recordatorios',
  '',
  `**${HECHAS.length} hechas · ${PENDIENTES.length} pendientes · ${DESCARTADAS.length} descartadas.**`,
  '',
  'Esta lista empezó como “100 ideas” y hoy es la lista de trabajo real. Lo',
  'pendiente va por olas, que son un orden recomendado y no un compromiso. Lo',
  'descartado se queda escrito con su motivo: una decisión sin motivo se vuelve a',
  'discutir cada tres meses.',
  '',
  'Las entradas 101-110 salieron de revisar una lista de 200 funcionalidades de',
  'herramientas profesionales de gestión de proyectos y quedarse solo con lo que',
  'sirve a una persona que trabaja sola, sin equipo ni PMO.',
  '',
  'En la app, la pestaña **Lo que queda** muestra lo mismo y convierte cualquier',
  'pendiente en tarea con un botón.',
  '',
];

for (const ola of OLAS) {
  const items = porOla(ola.n);
  lineas.push(`## ${ola.nombre} (${items.length})`, '', `_${ola.descripcion}_`, '');
  for (const i of items) {
    lineas.push(`**${i.n}. ${i.t}** · ${nombreCat(i.c)}  `);
    lineas.push(i.d, '');
  }
}

lineas.push('## Ya está hecho', '');
for (const cat of CATEGORIAS) {
  const items = IDEAS.filter((i) => i.c === cat.id && i.estado === 'hecho');
  if (!items.length) continue;
  lineas.push(`**${cat.nombre}**  `);
  lineas.push(items.map((i) => `${i.n}. ${i.t}`).join(' · '), '');
}

lineas.push('## Descartado, y por qué', '');
for (const i of DESCARTADAS) {
  lineas.push(`**${i.n}. ${i.t}**  `);
  lineas.push(i.motivo, '');
}

writeFileSync(new URL('../docs/hoja-de-ruta-recordatorios.md', import.meta.url), lineas.join('\n'));
console.log(`docs/hoja-de-ruta-recordatorios.md generado (${HECHAS.length} hechas, ${PENDIENTES.length} pendientes, ${DESCARTADAS.length} descartadas).`);
