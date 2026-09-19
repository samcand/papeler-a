/**
 * importador.js — Trae canciones desde archivos ChordPro, OnSong o un .zip con
 * la biblioteca entera. Muestra qué encontró antes de guardar nada.
 */

import { el, button, chip, drawer, toast, render } from '../ui.js';
import { store } from '../store.js';
import { importarTexto, detectarFormato } from '../formatos.js';
import { leerZip, pareceCancion } from '../zipread.js';
import { chordsUsed } from '../chordpro.js';

export const EXTENSIONES_ACEPTADAS =
  '.cho,.chopro,.chordpro,.crd,.pro,.chord,.onsong,.onsongarchive,.txt,.text,.zip,.json';

const esZip = (nombre) => /\.(zip|onsongarchive)$/i.test(nombre);
const esRespaldo = (nombre) => /\.json$/i.test(nombre);

/** Lee los archivos elegidos y devuelve las canciones que trae cada uno. */
export async function leerArchivos(archivos) {
  const encontradas = [];
  const avisos = [];

  for (const archivo of archivos) {
    try {
      if (esZip(archivo.name)) {
        const entradas = await leerZip(await archivo.arrayBuffer());
        const utiles = entradas.filter((e) => pareceCancion(e.nombre) && !e.error);
        if (!utiles.length) avisos.push(`"${archivo.name}" no traía archivos de canciones reconocibles.`);
        for (const entrada of utiles) {
          const nombreCorto = entrada.nombre.split('/').pop();
          const resultado = importarTexto(entrada.texto, { nombre: nombreCorto });
          encontradas.push(...resultado.canciones.map((c) => ({ ...c, origen: `${archivo.name} → ${nombreCorto}`, formato: resultado.formato })));
          avisos.push(...resultado.avisos);
        }
        continue;
      }

      const texto = await archivo.text();

      if (esRespaldo(archivo.name)) {
        const datos = JSON.parse(texto);
        const lista = Array.isArray(datos) ? datos : datos.songs || [datos];
        for (const song of lista) {
          if (song?.title && song?.body) {
            encontradas.push({ ...song, origen: archivo.name, formato: 'respaldo de la app' });
          }
        }
        continue;
      }

      const resultado = importarTexto(texto, { nombre: archivo.name });
      encontradas.push(...resultado.canciones.map((c) => ({ ...c, origen: archivo.name, formato: resultado.formato })));
      avisos.push(...resultado.avisos);
    } catch (err) {
      avisos.push(`"${archivo.name}": ${err.message}`);
    }
  }
  return { encontradas, avisos };
}

const NOMBRE_FORMATO = {
  chordpro: 'ChordPro', onsong: 'OnSong',
  'acordes-sobre-letra': 'acordes sobre la letra', 'respaldo de la app': 'respaldo',
};

/** Vista previa: qué se va a importar, con lo que ya existe marcado. */
export function abrirImportador(archivos, { navigate, onListo = null } = {}) {
  const cuerpo = el('div', { class: 'drawer-content' }, el('p', { class: 'muted' }, 'Leyendo los archivos…'));
  const panel = drawer('Importar canciones', cuerpo);

  leerArchivos(archivos).then(({ encontradas, avisos }) => {
    if (!encontradas.length) {
      render(cuerpo, 
        el('h4', {}, 'No se encontraron canciones'),
        el('p', { class: 'muted' },
          'Se aceptan archivos ChordPro (.cho, .chopro, .pro, .crd), OnSong (.onsong), ' +
          'texto con acordes (.txt), un .zip con varios de ellos y respaldos .json de esta app.'),
        avisos.length ? el('ul', { class: 'tips' }, avisos.map((a) => el('li', {}, a))) : null);
      return;
    }

    const existentes = new Map(store.songs.map((s) => [s.title.toLowerCase().trim(), s]));
    const elegidas = new Set(encontradas.map((_, i) => i));

    const pintar = () => {
      render(cuerpo, 
        el('p', { class: 'muted' },
          `${encontradas.length} canción(es) encontrada(s). Revisa antes de guardar: nada se ha añadido todavía.`),

        el('div', { class: 'row wrap' },
          button('Marcar todas', () => { encontradas.forEach((_, i) => elegidas.add(i)); pintar(); }, { variant: 'chip' }),
          button('Desmarcar todas', () => { elegidas.clear(); pintar(); }, { variant: 'chip' }),
          button('Solo las nuevas', () => {
            elegidas.clear();
            encontradas.forEach((c, i) => { if (!existentes.has(c.title.toLowerCase().trim())) elegidas.add(i); });
            pintar();
          }, { variant: 'chip' })),

        el('div', { class: 'importar-lista' },
          encontradas.map((cancion, i) => {
            const repetida = existentes.has(cancion.title.toLowerCase().trim());
            const acordes = chordsUsed(cancion.body);
            const fila = el('label', { class: `importar-fila${repetida ? ' repetida' : ''}` },
              el('input', {
                type: 'checkbox', checked: elegidas.has(i),
                onChange: (e) => { e.target.checked ? elegidas.add(i) : elegidas.delete(i); },
              }),
              el('div', { class: 'grow' },
                el('strong', {}, cancion.title),
                el('div', { class: 'meta-row' },
                  chip(cancion.key, { class: 'key' }),
                  cancion.bpm ? chip(`${cancion.bpm} BPM`) : null,
                  chip(cancion.timeSignature || '4/4'),
                  cancion.capo ? chip(`Capo ${cancion.capo}`) : null,
                  chip(NOMBRE_FORMATO[cancion.formato] || cancion.formato),
                  repetida ? chip('ya la tienes', { class: 'warn' }) : null),
                cancion.author ? el('p', { class: 'muted small' }, cancion.author) : null,
                el('p', { class: 'progression small' }, acordes.slice(0, 10).join(' · ') || 'sin acordes'),
                el('p', { class: 'muted small' }, cancion.origen)));
            return fila;
          })),

        avisos.length
          ? el('details', {}, el('summary', {}, `${avisos.length} aviso(s)`),
              el('ul', { class: 'tips' }, avisos.map((a) => el('li', {}, a))))
          : null,

        el('div', { class: 'row wrap' },
          button('Importar las marcadas', () => {
            const nuevas = [...elegidas].sort((a, b) => a - b).map((i) => encontradas[i]);
            if (!nuevas.length) return toast('No hay ninguna marcada', 'warn');
            let ultima = null;
            for (const cancion of nuevas) {
              const { origen, formato, ...datos } = cancion;
              ultima = store.newSong(datos);
            }
            panel.remove();
            toast(`${nuevas.length} canción(es) importada(s)`, 'ok');
            onListo?.();
            if (nuevas.length === 1 && ultima) navigate(`/cancion/${ultima.id}`);
          }, { variant: 'primary' }),
          button('Cancelar', () => panel.remove(), { variant: 'ghost' })),

        el('p', { class: 'muted small' },
          'Las secciones en inglés (Verse, Chorus, Bridge) se traducen a Verso, Coro y Puente. ' +
          'Si el archivo no trae tonalidad, se deduce del primer acorde.'));
    };
    pintar();
  }).catch((err) => {
    render(cuerpo, el('p', { class: 'feedback' }, 'No se pudo leer: ' + err.message));
  });

  return panel;
}

/** Permite soltar archivos sobre la página. */
export function activarArrastre(contenedor, { navigate, onListo = null }) {
  const encender = (e) => { e.preventDefault(); contenedor.classList.add('soltando'); };
  const apagar = () => contenedor.classList.remove('soltando');
  const soltar = (e) => {
    e.preventDefault();
    apagar();
    const archivos = [...(e.dataTransfer?.files || [])];
    if (archivos.length) abrirImportador(archivos, { navigate, onListo });
  };
  contenedor.addEventListener('dragover', encender);
  contenedor.addEventListener('dragleave', apagar);
  contenedor.addEventListener('drop', soltar);
  return () => {
    contenedor.removeEventListener('dragover', encender);
    contenedor.removeEventListener('dragleave', apagar);
    contenedor.removeEventListener('drop', soltar);
  };
}

export { detectarFormato };
