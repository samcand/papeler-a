/**
 * ajustes.js — Apariencia, versiones, referencias cruzadas y respaldo.
 */

import { el, render, toast, descargar, leerArchivo } from '../ui.js';
import { almacen } from '../almacen.js';
import { versiones, indiceCargado } from '../texto.js';
import { exportarMarkdown } from '../notas.js';

export function vistaAjustes(app) {
  const a = almacen.ajustes;
  const refrescar = () => vistaAjustes(app);
  const cambiar = (cambios) => { almacen.ajustar(cambios); refrescar(); };
  const opcion = (grupo, valor, texto, actual) => el('label', { class: `opcion ${actual === valor ? 'activa' : ''}` },
    el('input', { type: 'radio', name: grupo, value: valor, checked: actual === valor, onChange: () => cambiar({ [grupo]: valor }) }), texto);
  const e = almacen.estado;
  const meta = indiceCargado();

  render(app, el('div', { class: 'pagina angosta' },
    el('h1', {}, 'Ajustes'),

    el('section', { class: 'tarjeta' },
      el('h2', {}, 'Lectura'),
      campo('Tema', el('div', { class: 'opciones' },
        opcion('tema', 'oscuro', '🌙 Oscuro', a.tema), opcion('tema', 'claro', '☀️ Claro', a.tema), opcion('tema', 'sepia', '📜 Sepia', a.tema))),
      campo(`Tamaño de letra: ${a.letra}px`, el('input', {
        type: 'range', min: 14, max: 30, value: a.letra, class: 'rango',
        onInput: (ev) => { almacen.ajustar({ letra: Number(ev.target.value) }); ev.target.previousSibling.textContent = `Tamaño de letra: ${ev.target.value}px`; },
      })),
      campo('Tipo de letra', el('div', { class: 'opciones' },
        opcion('fuente', 'serif', 'Con serifa (libro)', a.fuente), opcion('fuente', 'sans', 'Sin serifa (pantalla)', a.fuente))),
      campo('Disposición', el('div', { class: 'opciones' },
        opcion('modo', 'versos', 'Un versículo por línea', a.modo), opcion('modo', 'parrafo', 'Párrafo continuo', a.modo))),
      el('p', { class: 'tenue small' }, 'Con versiones en paralelo siempre se muestra un versículo por línea, para que queden alineados.'),
      el('p', { class: 'muestra-lectura' }, el('sup', {}, '16'), 'Porque de tal manera amó Dios al mundo, que ha dado á su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.')),

    el('section', { class: 'tarjeta' },
      el('h2', {}, 'Versiones'),
      campo('Versión principal', el('div', { class: 'opciones' },
        versiones().filter((v) => ['rv1909', 'kjv'].includes(v.id)).map((v) => opcion('principal', v.id, v.nombre, a.principal)))),
      campo('En paralelo', el('div', { class: 'opciones' },
        [...versiones().filter((v) => ['rv1909', 'kjv'].includes(v.id) && v.id !== a.principal).map((v) => ({ id: v.id, nombre: v.nombre })),
          { id: 'original', nombre: 'Idioma original (hebreo en el AT, griego en el NT)' }].map((v) => el('label', { class: `opcion ${a.paralelas.includes(v.id) ? 'activa' : ''}` },
          el('input', { type: 'checkbox', checked: a.paralelas.includes(v.id), onChange: (ev) => cambiar({ paralelas: ev.target.checked ? [...a.paralelas, v.id] : a.paralelas.filter((x) => x !== v.id) }) }),
          v.nombre)))),
      el('ul', { class: 'lista-versiones small' }, versiones().map((v) => el('li', {}, el('strong', {}, v.abrev), ` — ${v.nombre} · ${v.licencia}`)))),

    el('section', { class: 'tarjeta' },
      el('h2', {}, 'Referencias cruzadas'),
      campo(`Mostrar primero las que tengan al menos ${a.votos} votos`, el('input', {
        type: 'range', min: 3, max: 40, value: a.votos, class: 'rango',
        onInput: (ev) => { almacen.ajustar({ votos: Number(ev.target.value) }); ev.target.previousSibling.textContent = `Mostrar primero las que tengan al menos ${ev.target.value} votos`; },
      })),
      el('p', { class: 'tenue small' }, 'Unas 200 000 referencias de OpenBible.info (CC-BY), votadas por lectores. Más votos = conexión más clara. Las de pocos votos siguen disponibles con "Ver más".')),

    el('section', { class: 'tarjeta' },
      el('h2', {}, 'Tus datos'),
      el('p', {}, `${e.notas.length} notas · ${e.marcas.length} resaltados · ${e.marcadores.length} marcadores · ${e.leidos.length} capítulos leídos`),
      el('p', { class: 'tenue small' }, 'Todo se guarda solo en este dispositivo. Exporta un respaldo de vez en cuando y para pasar tus notas a otro equipo.'),
      el('div', { class: 'acciones' },
        el('button', { class: 'btn primario', onClick: () => descargar(`estudio-biblico-${new Date().toISOString().slice(0, 10)}.json`, almacen.exportar()) }, '⬇ Exportar respaldo'),
        el('button', { class: 'btn', onClick: () => importar(false, refrescar) }, '⬆ Importar (sumar)'),
        el('button', { class: 'btn', onClick: () => importar(true, refrescar) }, '⬆ Importar (reemplazar)'),
        el('button', { class: 'btn', onClick: () => descargar('notas-biblicas.md', exportarMarkdown(e.notas), 'text/markdown') }, '⬇ Notas en Markdown'),
        el('button', { class: 'btn peligro', onClick: () => {
          if (!confirm('¿Borrar TODAS tus notas, resaltados, marcadores y progreso? Exporta un respaldo antes.')) return;
          if (!confirm('¿Seguro? Esto no se puede deshacer.')) return;
          almacen.borrarTodo(); toast('Datos borrados'); refrescar();
        } }, 'Borrar todo'))),

    el('section', { class: 'tarjeta' },
      el('h2', {}, 'Atajos de teclado'),
      el('ul', { class: 'atajos small' },
        el('li', {}, el('kbd', {}, '/'), ' ir a un pasaje o buscar'),
        el('li', {}, el('kbd', {}, '←'), ' ', el('kbd', {}, '→'), ' capítulo anterior / siguiente'),
        el('li', {}, el('kbd', {}, '1'), '–', el('kbd', {}, '6'), ' resaltar lo seleccionado con un color'),
        el('li', {}, el('kbd', {}, 'N'), ' nota sobre lo seleccionado'),
        el('li', {}, el('kbd', {}, 'Mayús'), ' + clic: seleccionar varios versículos'),
        el('li', {}, el('kbd', {}, 'Ctrl'), ' + ', el('kbd', {}, 'Z'), ' deshacer el último resaltado o nota'),
        el('li', {}, el('kbd', {}, 'Esc'), ' quitar la selección'))),

    el('section', { class: 'tarjeta' },
      el('h2', {}, 'Acerca de'),
      el('p', { class: 'small' }, 'Textos: Reina-Valera 1909 y King James Version (dominio público); Códice de Leningrado (Westminster Leningrad Codex) y Textus Receptus, vía el proyecto scrollmapper/bible_databases. Interlineal: Open Scriptures Hebrew Bible (lemas y morfología CC-BY 4.0) y SBL Greek New Testament (© Society of Biblical Literature y Logos Bible Software) con el análisis de MorphGNT (CC-BY-SA). Léxicos: Strong (dominio público; edición de Open Scriptures, CC-BY-SA) y Dodson (dominio público). Referencias cruzadas: OpenBible.info, licencia CC-BY.'),
      el('p', { class: 'tenue small' }, meta?.generado ? `Datos generados el ${meta.generado}.` : ''))));
}

function campo(etiqueta, control) {
  return el('div', { class: 'campo' }, el('span', { class: 'campo-etiqueta' }, etiqueta), control);
}

async function importar(reemplazar, refrescar) {
  if (reemplazar && !confirm('Reemplazar borra tus datos actuales y deja solo los del archivo. ¿Continuar?')) return;
  const texto = await leerArchivo('.json,application/json');
  if (!texto) return;
  try {
    const r = almacen.importar(texto, { reemplazar });
    toast(`Importado: ${r.notas} notas, ${r.marcas} resaltados, ${r.marcadores} marcadores`);
    refrescar();
  } catch (e) {
    toast(e.message || 'No se pudo leer el archivo', 'error');
  }
}
