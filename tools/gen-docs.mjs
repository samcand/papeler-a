/** Genera docs/100-ideas-alabanza.md a partir de src/ideas.js (fuente única). */
import { writeFileSync } from 'node:fs';
import { IDEAS, CATEGORIES } from '../src/ideas.js';

const lines = [
  '# 100 ideas útiles para ejecutar bien la alabanza',
  '',
  'Lista de trabajo para equipos de alabanza: preparación, ensayo, instrumentos,',
  'arreglos, voz, sonido y liderazgo. En la app (pestaña **100 ideas**) puedes',
  'marcar las que ya aplicas y llevar el progreso.',
  '',
  '> Sugerencia de uso: no intentes aplicar las 100. Elige **dos por mes** con tu',
  '> equipo y revísalas juntos el último domingo.',
  '',
  '## Índice',
  '',
  ...CATEGORIES.map((c, i) => {
    const nums = IDEAS.filter((x) => x.c === c.id).map((x) => x.n);
    return `${i + 1}. [${c.name}](#${c.name.toLowerCase().replace(/[^a-záéíóúñ0-9]+/g, '-')}) — ideas ${nums[0]} a ${nums[nums.length - 1]}`;
  }),
  '',
];

for (const cat of CATEGORIES) {
  lines.push(`## ${cat.name}`, '');
  for (const idea of IDEAS.filter((i) => i.c === cat.id)) {
    lines.push(`**${idea.n}. ${idea.t}.** ${idea.d}`, '');
  }
}

lines.push('---', '', `Generado desde \`src/ideas.js\` con \`npm run docs\`. Total: ${IDEAS.length} ideas.`, '');
writeFileSync(new URL('../docs/100-ideas-alabanza.md', import.meta.url), lines.join('\n'));
console.log(`docs/100-ideas-alabanza.md actualizado (${IDEAS.length} ideas).`);
