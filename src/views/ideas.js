/** ideas.js (vista) — Las 100 ideas como lista de chequeo por categoría. */

import { el, button, chip, section, copyText, download, render as pintarEn } from '../ui.js';
import { store } from '../store.js';
import { IDEAS, CATEGORIES } from '../ideas.js';

export function ideasView(root) {
  let filter = '';
  const host = el('div', {});

  const render = () => {
    const done = new Set(store.state.ideasDone);
    const cats = CATEGORIES.filter((c) => !filter || c.id === filter);
    pintarEn(host, 
      el('div', { class: 'row wrap tags' },
        (() => { const c = chip('Todas'); c.classList.toggle('active', !filter); c.addEventListener('click', () => { filter = ''; render(); }); return c; })(),
        CATEGORIES.map((cat) => {
          const c = chip(cat.name);
          c.classList.toggle('active', filter === cat.id);
          c.addEventListener('click', () => { filter = filter === cat.id ? '' : cat.id; render(); });
          return c;
        })),
      el('p', { class: 'muted' }, `${done.size} de ${IDEAS.length} ideas marcadas como aplicadas.`),
      el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: `width:${(done.size / IDEAS.length) * 100}%` })),
      ...cats.map((cat) => section(cat.name,
        el('ul', { class: 'idea-list' },
          IDEAS.filter((i) => i.c === cat.id).map((idea) => {
            const li = el('li', { class: done.has(idea.n) ? 'done' : '' },
              el('label', {},
                el('input', {
                  type: 'checkbox', checked: done.has(idea.n),
                  onChange: () => { store.toggleIdea(idea.n); render(); },
                }),
                el('span', { class: 'idea-n' }, String(idea.n)),
                el('span', {}, el('strong', {}, idea.t), el('span', { class: 'muted' }, ' — ' + idea.d))));
            return li;
          })))));
  };

  const asText = () => CATEGORIES.map((cat) =>
    `## ${cat.name}\n` + IDEAS.filter((i) => i.c === cat.id).map((i) => `${i.n}. ${i.t}: ${i.d}`).join('\n')
  ).join('\n\n');

  pintarEn(root, 
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, '100 ideas para ejecutar bien la alabanza'),
        el('p', { class: 'muted' }, 'Marca las que ya aplicas y elige dos para trabajar este mes')),
      el('div', { class: 'row wrap' },
        button('Copiar todas', () => copyText(asText())),
        button('Descargar', () => download('100-ideas-alabanza.md', '# 100 ideas para ejecutar bien la alabanza\n\n' + asText(), 'text/markdown')))),
    host);
  render();
}
