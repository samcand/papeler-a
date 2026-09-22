/**
 * plan.js — Planes de lectura con la lectura de hoy, racha y calendario,
 * y el mapa de toda la Biblia con los capítulos que ya leíste.
 */

import { el, render, toast } from '../ui.js';
import { almacen } from '../almacen.js';
import { LIBROS } from '../libros.js';
import { indiceCargado } from '../texto.js';
import { PLANES, generarPlan, diaDeHoy, describirDia, racha, avanceBiblia } from '../plan.js';

export function vistaPlan(app) {
  const refrescar = () => vistaPlan(app);
  const estado = almacen.estado.plan;
  const plan = estado && PLANES.find((p) => p.id === estado.id);
  render(app, el('div', { class: 'pagina' },
    el('h1', {}, 'Plan de lectura'),
    plan ? planActivo(plan, estado, refrescar) : elegirPlan(refrescar),
    mapaBiblia(refrescar)));
}

function elegirPlan(refrescar) {
  const versiculos = indiceCargado()?.versiculos;
  return el('section', {},
    el('p', { class: 'tenue' }, 'Elige un plan. Cada día se reparte por número de versículos, así las lecturas duran parecido.'),
    el('div', { class: 'rejilla-planes' }, PLANES.map((p) => {
      const dias = generarPlan(p, versiculos);
      const capitulos = dias.flat().length;
      return el('article', { class: 'tarjeta plan' },
        el('h3', {}, p.nombre),
        el('p', { class: 'tenue small' }, `${capitulos} capítulos · ${dias.length} días · ~${Math.round(capitulos / dias.length * 10) / 10} capítulos al día`),
        el('p', { class: 'small' }, 'Día 1: ', describirDia(dias[0])),
        el('button', { class: 'btn primario', onClick: () => { almacen.empezarPlan(p.id); toast('¡Plan iniciado! Empieza hoy.'); refrescar(); } }, 'Empezar hoy'));
    })));
}

function planActivo(plan, estado, refrescar) {
  const dias = generarPlan(plan, indiceCargado()?.versiculos);
  const hoy = Math.min(dias.length - 1, Math.max(0, diaDeHoy(estado.inicio)));
  const hechos = new Set(estado.hechos);
  const pendienteMasViejo = dias.findIndex((_, i) => i <= hoy && !hechos.has(i));
  const atrasados = dias.filter((_, i) => i < hoy && !hechos.has(i)).length;
  const porcentaje = Math.round((hechos.size / dias.length) * 100);

  const lectura = (i) => el('div', { class: 'lectura-dia' },
    el('div', { class: 'enlaces-caps' }, dias[i].map(([b, c]) => el('a', {
      class: `chip ${almacen.leido(b, c) ? 'activo' : ''}`, href: `#/leer/${b}.${c}`,
    }, LIBROS[b - 1].capitulos === 1 ? LIBROS[b - 1].nombre : `${LIBROS[b - 1].abrev} ${c}`))),
    el('button', {
      class: `btn ${hechos.has(i) ? 'hecho' : 'primario'}`,
      onClick: () => {
        almacen.alternarDia(i);
        // al completar el día, los capítulos cuentan como leídos
        if (!hechos.has(i)) for (const [b, c] of dias[i]) if (!almacen.leido(b, c)) almacen.alternarLeido(b, c);
        refrescar();
      },
    }, hechos.has(i) ? '✓ Hecho' : 'Marcar como hecho'));

  return el('section', { class: 'plan-activo' },
    el('div', { class: 'tarjeta destacada' },
      el('div', { class: 'tarjeta-cab' },
        el('div', {},
          el('div', { class: 'panel-sub' }, plan.nombre),
          el('h2', {}, `Hoy · día ${hoy + 1} de ${dias.length}`),
          el('p', {}, describirDia(dias[hoy]))),
        el('div', { class: 'cifras compactas' },
          el('div', { class: 'cifra' }, el('strong', {}, `${porcentaje}%`), el('span', {}, 'completado')),
          el('div', { class: 'cifra' }, el('strong', {}, racha(estado.hechos, hoy)), el('span', {}, 'días de racha')))),
      lectura(hoy),
      el('div', { class: 'barra-avance' }, el('span', { style: { width: `${porcentaje}%` } })),
      atrasados ? el('p', { class: 'aviso' }, `Tienes ${atrasados} ${atrasados === 1 ? 'día' : 'días'} pendiente${atrasados === 1 ? '' : 's'}. `,
        el('a', { href: '#/plan', onClick: (e) => { e.preventDefault(); document.querySelector('.calendario').open = true; document.getElementById(`dia-${pendienteMasViejo}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 'Ir al más antiguo')) : null),
    el('details', { class: 'calendario' },
      el('summary', {}, 'Todos los días del plan'),
      el('ol', { class: 'dias' }, dias.map((caps, i) => el('li', {
        id: `dia-${i}`, class: `${hechos.has(i) ? 'hecho' : ''} ${i === hoy ? 'hoy' : ''} ${i < hoy && !hechos.has(i) ? 'atrasado' : ''}`,
      },
      el('label', { class: 'check' },
        el('input', { type: 'checkbox', checked: hechos.has(i), onChange: () => { almacen.alternarDia(i); refrescar(); } }),
        el('span', { class: 'dia-n' }, `Día ${i + 1}`)),
      el('a', { href: `#/leer/${caps[0][0]}.${caps[0][1]}` }, describirDia(caps)))))),
    el('button', { class: 'btn peligro chico', onClick: () => { if (confirm('¿Dejar este plan? Se pierde el progreso del plan (no tus capítulos leídos).')) { almacen.dejarPlan(); refrescar(); } } }, 'Dejar el plan'));
}

function mapaBiblia(refrescar) {
  const a = avanceBiblia(almacen.estado.leidos);
  return el('section', { class: 'mapa' },
    el('h2', {}, 'Mapa de lectura'),
    el('p', { class: 'tenue' }, `Has leído ${a.hechos} de ${a.total} capítulos (${a.porcentaje}%). Cada cuadrito es un capítulo; tócalo para leerlo. Márcalos al terminar cada capítulo.`),
    el('div', { class: 'barra-avance' }, el('span', { style: { width: `${a.porcentaje}%` } })),
    el('div', { class: 'mapa-libros' }, LIBROS.map((l, i) => el('div', { class: `mapa-libro ${l.testamento.toLowerCase()}` },
      el('div', { class: 'mapa-nombre' },
        el('span', {}, l.nombre),
        el('span', { class: 'tenue small' }, `${a.porLibro[i]}/${l.capitulos}`)),
      el('div', { class: 'mapa-caps' }, Array.from({ length: l.capitulos }, (_, k) => el('a', {
        class: `mapa-cap ${almacen.leido(l.n, k + 1) ? 'leido' : ''}`,
        href: `#/leer/${l.n}.${k + 1}`,
        title: `${l.nombre} ${k + 1}`,
      })))))),
    a.hechos ? el('button', { class: 'btn chico', onClick: () => {
      if (!confirm('¿Borrar el registro de capítulos leídos?')) return;
      almacen.estado.leidos = [];
      almacen.guardar();
      refrescar();
    } }, 'Reiniciar mapa') : null);
}
