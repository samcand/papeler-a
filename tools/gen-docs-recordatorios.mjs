/** Genera docs/100-ideas-recordatorios.md desde recordatorios/src/ideas.js. */
import { writeFileSync } from 'node:fs';
import { CATEGORIAS, IDEAS } from '../recordatorios/src/ideas.js';

const ancla = (txt) => txt.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
const hechas = IDEAS.filter((i) => i.hecho);

const lineas = [
  '# 100 ideas para una app de recordatorios y productividad',
  '',
  'Lista de trabajo para la app de `recordatorios/`: qué está hecho y qué vendría',
  `bien añadir. Hoy hay **${hechas.length} de ${IDEAS.length}** implementadas.`,
  '',
  'En la app, la pestaña **100 ideas** muestra lo mismo como lista de chequeo, y',
  'cada idea pendiente se puede convertir en tarea con un botón.',
  '',
  '> Sugerencia de uso: no intentes implementarlas todas. Elige **dos por mes** y',
  '> quédate con las que quitan fricción a lo que ya haces.',
  '',
  '## Índice',
  '',
  ...CATEGORIAS.map((c, i) => {
    const nums = IDEAS.filter((x) => x.c === c.id).map((x) => x.n);
    const listas = IDEAS.filter((x) => x.c === c.id && x.hecho).length;
    return `${i + 1}. [${c.nombre}](#${ancla(c.nombre)}) — ideas ${nums[0]} a ${nums[nums.length - 1]} (${listas} hecha${listas === 1 ? '' : 's'})`;
  }),
  '',
  'Leyenda: **✅ ya está** en la app · **⭕ pendiente**.',
  '',
];

for (const cat of CATEGORIAS) {
  lineas.push(`## ${cat.nombre}`, '');
  for (const idea of IDEAS.filter((i) => i.c === cat.id)) {
    lineas.push(`**${idea.n}. ${idea.t}** ${idea.hecho ? '✅' : '⭕'}  `);
    lineas.push(idea.d, '');
  }
}

writeFileSync(new URL('../docs/100-ideas-recordatorios.md', import.meta.url), lineas.join('\n'));
console.log(`docs/100-ideas-recordatorios.md generado (${IDEAS.length} ideas, ${hechas.length} hechas).`);
