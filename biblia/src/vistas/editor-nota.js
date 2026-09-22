/**
 * editor-nota.js — Ventana para escribir o editar una nota.
 *
 * El pasaje se puede cambiar escribiéndolo ("Ro 5:1-11"); dejarlo vacío
 * convierte la nota en un apunte libre (un bosquejo, un sermón).
 */

import { el, render, $, toast } from '../ui.js';
import { almacen } from '../almacen.js';
import { notaAHtml, leerEtiquetas, todasLasEtiquetas } from '../notas.js';
import { formatearRango, parsear, rango } from '../referencias.js';
import { textoRango } from '../texto.js';

/** Abre el editor. Devuelve una promesa que se cumple al cerrar (con la nota guardada o null). */
export function editarNota(nota = {}) {
  const dialogo = $('#dialogo');
  const pasajeInicial = nota.desde ? formatearRango(nota.desde, nota.hasta || nota.desde) : '';

  const titulo = el('input', { class: 'input', placeholder: 'Título (opcional)', value: nota.titulo || '' });
  const pasaje = el('input', { class: 'input', placeholder: 'Pasaje, p. ej. Ro 5:1-11 (vacío = apunte libre)', value: pasajeInicial });
  const cuerpo = el('textarea', { class: 'input nota-cuerpo', rows: 12, placeholder: 'Escribe tu nota… Las citas como "Ef 2:8" se vuelven enlaces.\n\n# Título   **negrita**   *cursiva*   ==resaltado==\n- lista   > cita' }, nota.cuerpo || '');
  const etiquetas = el('input', { class: 'input', placeholder: '#gracia #fe #sermón', value: (nota.etiquetas || []).map((e) => `#${e}`).join(' ') });
  const vista = el('div', { class: 'nota-html vista-previa hidden' });
  const textoPasaje = el('div', { class: 'nota-pasaje' });
  const sugeridas = todasLasEtiquetas(almacen.estado.notas).slice(0, 12);

  const envolver = (antes, despues = antes) => {
    const { selectionStart: a, selectionEnd: z, value } = cuerpo;
    cuerpo.value = value.slice(0, a) + antes + value.slice(a, z) + despues + value.slice(z);
    cuerpo.focus();
    cuerpo.setSelectionRange(a + antes.length, z + antes.length);
  };
  const alInicio = (prefijo) => {
    const { selectionStart: a, value } = cuerpo;
    const inicio = value.lastIndexOf('\n', a - 1) + 1;
    cuerpo.value = value.slice(0, inicio) + prefijo + value.slice(inicio);
    cuerpo.focus();
    cuerpo.setSelectionRange(a + prefijo.length, a + prefijo.length);
  };

  async function mostrarPasaje() {
    const r = parsear(pasaje.value);
    if (!r) { render(textoPasaje, pasaje.value.trim() ? el('span', { class: 'aviso' }, 'No reconozco ese pasaje') : null); return; }
    const { desde, hasta } = rango(r);
    const versos = await textoRango(almacen.ajustes.principal, desde, hasta);
    render(textoPasaje, versos.slice(0, 6).map((x) => el('span', {}, el('sup', {}, x.v), ' ', x.texto, ' ')),
      versos.length > 6 ? el('span', { class: 'tenue' }, ` … (${versos.length} versículos)`) : null);
  }
  pasaje.addEventListener('change', mostrarPasaje);
  mostrarPasaje();

  return new Promise((resolve) => {
    let guardada = null;
    const cerrar = () => dialogo.close();

    function guardar() {
      const texto = pasaje.value.trim();
      let desde = null, hasta = null;
      if (texto) {
        const r = parsear(texto);
        if (!r) { toast('No reconozco el pasaje; corrígelo o déjalo vacío', 'error'); pasaje.focus(); return; }
        ({ desde, hasta } = rango(r)); // capítulo completo: termina en el versículo "999"
      }
      if (!cuerpo.value.trim() && !titulo.value.trim()) { toast('La nota está vacía', 'error'); return; }
      guardada = almacen.guardarNota({
        ...(nota.id ? { id: nota.id } : {}),
        titulo: titulo.value.trim(), cuerpo: cuerpo.value, desde, hasta,
        etiquetas: leerEtiquetas(etiquetas.value),
      });
      toast('Nota guardada');
      cerrar();
    }

    function borrar() {
      if (!confirm('¿Borrar esta nota?')) return;
      almacen.borrarNota(nota.id);
      toast('Nota borrada');
      guardada = null;
      cerrar();
    }

    const alternarVista = (e) => {
      const ver = vista.classList.toggle('hidden');
      cuerpo.classList.toggle('hidden', !ver);
      if (!ver) vista.innerHTML = notaAHtml(cuerpo.value) || '<p class="tenue">Nada que mostrar todavía</p>';
      e.target.textContent = ver ? 'Vista previa' : 'Editar';
    };

    render(dialogo,
      el('form', { class: 'editor-nota', method: 'dialog', onSubmit: (e) => { e.preventDefault(); guardar(); } },
        el('header', { class: 'dialogo-cab' },
          el('h2', {}, nota.id ? 'Editar nota' : 'Nueva nota'),
          el('button', { type: 'button', class: 'btn icono', title: 'Cerrar', onClick: cerrar }, '✕')),
        titulo,
        pasaje,
        textoPasaje,
        el('div', { class: 'herramientas-texto' },
          el('button', { type: 'button', class: 'btn chico', title: 'Negrita', onClick: () => envolver('**') }, el('b', {}, 'B')),
          el('button', { type: 'button', class: 'btn chico', title: 'Cursiva', onClick: () => envolver('*') }, el('i', {}, 'I')),
          el('button', { type: 'button', class: 'btn chico', title: 'Resaltar', onClick: () => envolver('==') }, el('mark', {}, 'R')),
          el('button', { type: 'button', class: 'btn chico', title: 'Encabezado', onClick: () => alInicio('## ') }, 'H'),
          el('button', { type: 'button', class: 'btn chico', title: 'Lista', onClick: () => alInicio('- ') }, '•'),
          el('button', { type: 'button', class: 'btn chico', title: 'Cita', onClick: () => alInicio('> ') }, '❝'),
          el('span', { class: 'grow' }),
          el('button', { type: 'button', class: 'btn chico', onClick: alternarVista }, 'Vista previa')),
        cuerpo,
        vista,
        etiquetas,
        sugeridas.length ? el('div', { class: 'chips' }, sugeridas.map(([e]) =>
          el('button', { type: 'button', class: 'chip', onClick: () => {
            const actuales = leerEtiquetas(etiquetas.value);
            if (!actuales.includes(e)) etiquetas.value = [...actuales, e].map((x) => `#${x}`).join(' ');
          } }, `#${e}`))) : null,
        el('footer', { class: 'dialogo-pie' },
          nota.id ? el('button', { type: 'button', class: 'btn peligro', onClick: borrar }, 'Borrar') : null,
          el('span', { class: 'grow' }),
          el('button', { type: 'button', class: 'btn', onClick: cerrar }, 'Cancelar'),
          el('button', { type: 'submit', class: 'btn primario' }, 'Guardar'))));

    dialogo.addEventListener('close', () => resolve(guardada), { once: true });
    dialogo.showModal();
    (nota.id || !pasajeInicial ? titulo : cuerpo).focus();
    cuerpo.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') guardar();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); envolver('**'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); envolver('*'); }
    });
  });
}
