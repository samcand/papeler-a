/** setlists.js — Listas de servicio: orden, tonalidades y flujo. */

import { el, button, input, select, textarea, toast, copyText, chip, section, confirmDialog, drawer, download } from '../ui.js';
import { store } from '../store.js';
import { crearCodigo, crearEnlace, evaluarEnlace } from '../share.js';
import { qrSVG } from '../qr.js';
import { ROLES, hojasDeSet } from '../hojasequipo.js';
import { buildDocx } from '../docx.js';
import { generarClick, generarPad, codificarWav, seccionesDesdeCancion } from '../clicktrack.js';
import { buildTimeline } from '../youtube.js';
import { keyInfo, intervalBetweenKeys, MAJOR_KEY_NAMES, MINOR_KEY_NAMES, formatTime } from '../music.js';

const KEY_OPTIONS = [...MAJOR_KEY_NAMES, ...MINOR_KEY_NAMES];

/** Compartir el set: enlace comprimido + QR, con o sin letras. */
async function abrirCompartir(setlist) {
  const songs = setlist.songs.map((i) => store.song(i.songId)).filter(Boolean);
  if (!songs.length) return toast('La lista está vacía', 'warn');
  const contenido = el('div', { class: 'drawer-content' }, el('p', { class: 'muted' }, 'Generando el enlace…'));
  const panel = drawer('Compartir con el equipo', contenido);

  const pintar = async (conLetra) => {
    const codigo = await crearCodigo(setlist, songs, { conLetra });
    const enlace = crearEnlace(codigo);
    const evaluacion = evaluarEnlace(enlace);

    // Un QR con todas las letras de varias canciones sale enorme y no se
    // escanea bien. Si pasa eso, el QR lleva la versión corta (títulos,
    // tonalidades y notas) y el enlace completo se manda por chat.
    let enlaceQR = enlace;
    let qrEsCorto = false;
    if (!evaluacion.comodoEnQR && conLetra) {
      const corto = await crearCodigo(setlist, songs, { conLetra: false });
      const enlaceCorto = crearEnlace(corto);
      if (evaluarEnlace(enlaceCorto).cabeEnQR) { enlaceQR = enlaceCorto; qrEsCorto = true; }
    }
    const evaluacionQR = evaluarEnlace(enlaceQR);

    contenido.replaceChildren(
      el('p', { class: 'muted' },
        'Quien abra este enlace (o escanee el QR) recibe las canciones en su dispositivo. ' +
        'Todo viaja dentro del propio enlace: no se sube nada a ningún servidor.'),
      el('div', { class: 'row wrap' },
        button('Con letras y acordes', () => pintar(true), { variant: conLetra ? 'ok' : 'chip' }),
        button('Solo la lista (enlace corto)', () => pintar(false), { variant: conLetra ? 'chip' : 'ok' })),
      evaluacionQR.cabeEnQR
        ? el('div', { class: 'qr-wrap', html: qrSVG(enlaceQR, { tamaño: 300 }) })
        : el('p', { class: 'feedback' }, '⚠ ' + evaluacionQR.consejo),
      qrEsCorto
        ? el('p', { class: 'feedback' },
            'El QR comparte solo la lista (títulos, tonalidades y notas), porque con las letras completas ' +
            'saldría demasiado denso para escanear. Para que les lleguen también las letras, manda el enlace de abajo.')
        : null,
      el('p', { class: 'muted small' }, `Enlace completo: ${evaluacion.largo} caracteres · ${evaluacion.consejo}`),
      el('textarea', { class: 'input textarea', rows: 3, readonly: true }, enlace),
      el('div', { class: 'row wrap' },
        button('Copiar enlace', () => copyText(enlace), { variant: 'primary' }),
        navigator.share
          ? button('Compartir…', () => navigator.share({ title: setlist.name, text: `Set: ${setlist.name}`, url: enlace }).catch(() => {}))
          : null,
        button('Descargar archivo', () => download(`${setlist.name}.json`,
          JSON.stringify({ setlist, songs }, null, 2)))));
  };
  pintar(true);
  return panel;
}

/** Una hoja distinta para cada músico, con el set completo. */
function abrirHojas(setlist) {
  const songs = store.songs;
  const contenido = el('div', { class: 'drawer-content' },
    el('p', { class: 'muted' },
      'Cada archivo trae el set completo, una canción por página, en la tonalidad de la lista. ' +
      'Así el baterista no recibe acordes y las voces no reciben diagramas.'),
    el('div', { class: 'roles' },
      ROLES.map((rol) => el('div', { class: 'rol' },
        el('div', { class: 'grow' },
          el('strong', {}, rol.nombre),
          el('p', { class: 'muted small' }, rol.detalle)),
        button('Descargar .docx', () => {
          const hojas = hojasDeSet(setlist, songs, rol.id);
          if (!hojas.length) return toast('La lista está vacía', 'warn');
          const bytes = buildDocx(hojas, { mono: store.state.settings.docxMono || false });
          download(`${setlist.name} — ${rol.nombre}.docx`, bytes,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          toast('Descargado', 'ok');
        }, { variant: 'chip' })))),
    el('div', { class: 'row wrap' },
      button('Descargar todas de una vez', () => {
        for (const rol of ROLES) {
          const hojas = hojasDeSet(setlist, songs, rol.id);
          if (!hojas.length) continue;
          download(`${setlist.name} — ${rol.nombre}.docx`, buildDocx(hojas),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        }
        toast('Se descargaron todas las hojas', 'ok');
      }, { variant: 'primary' })));
  return drawer('Hojas por músico', contenido);
}

/** Pistas de clic y colchones para los in-ears. */
function abrirPistas(setlist) {
  const filas = setlist.songs.map((item) => {
    const song = store.song(item.songId);
    if (!song) return null;
    const timeline = buildTimeline(song);
    const secciones = seccionesDesdeCancion(song, timeline);
    const estado = el('span', { class: 'muted small' },
      secciones ? `${secciones.length} secciones marcadas` : 'sin estructura: se generan 32 compases');
    return el('div', { class: 'rol' },
      el('div', { class: 'grow' },
        el('strong', {}, song.title),
        el('div', { class: 'meta-row' },
          chip(`${song.bpm || 80} BPM`), chip(song.timeSignature || '4/4'), chip(item.key || song.key)),
        estado),
      el('div', { class: 'row wrap' },
        button('Clic .wav', () => {
          const click = generarClick({
            bpm: song.bpm || 80, compas: song.timeSignature || '4/4',
            secciones, compases: 32, cuentaEntrada: 1,
          });
          download(`${song.title} — clic ${song.bpm || 80}bpm.wav`,
            codificarWav([click.audio], click.sampleRate), 'audio/wav');
          toast(`Clic de ${Math.round(click.duracion)} s con ${click.marcas.length} avisos de sección`, 'ok');
        }, { variant: 'chip' }),
        button('Pad .wav', () => {
          const pad = generarPad({ key: item.key || song.key, duracion: 60 });
          download(`${song.title} — pad ${item.key || song.key}.wav`,
            codificarWav([pad.audio], pad.sampleRate), 'audio/wav');
        }, { variant: 'chip' })));
  }).filter(Boolean);

  return drawer('Pistas para in-ears',
    el('div', { class: 'drawer-content' },
      el('p', { class: 'muted' },
        'El clic lleva un compás de cuenta de entrada y un golpe agudo al empezar cada sección, ' +
        'para que el baterista sepa dónde va sin mirar la hoja. El pad es un colchón sostenido en la ' +
        'tonalidad, útil para los momentos de oración.'),
      el('div', { class: 'roles' }, filas),
      el('p', { class: 'muted small' },
        'Consejo: si la canción no tiene marcas de sección, ponlas en la pantalla de YouTube y el clic saldrá con los avisos en el sitio exacto.')));
}

export function setlistsView(root, { navigate }) {
  let currentId = store.state.setlists[0]?.id || null;
  const host = el('div', {});

  const transitionNote = (fromKey, toKey, fromBpm, toBpm) => {
    const semis = intervalBetweenKeys(fromKey, toKey);
    const notes = [];
    if (semis === 0) notes.push('Misma tonalidad: puedes encadenar sin pausa.');
    else if (semis === 7 || semis === 5) notes.push(`De ${fromKey} a ${toKey} hay una quinta: enlaza natural, casi no se nota el cambio.`);
    else if (semis === 2 || semis === 10) notes.push(`De ${fromKey} a ${toKey}: sube o baja un tono. Usa el V de ${toKey} como puente.`);
    else if (semis === 1 || semis === 11) notes.push(`Medio tono: efectivo para subir energía, pero hazlo con un compás de transición.`);
    else notes.push(`Cambio grande (${semis} semitonos): mejor hablar, orar o leer un versículo entre ambas.`);
    const diff = Math.abs((toBpm || 0) - (fromBpm || 0));
    if (diff > 25) notes.push(`Además cambia mucho el tempo (${fromBpm} → ${toBpm} BPM): no lo encadenes en seco.`);
    return notes.join(' ');
  };

  const render = () => {
    const setlists = store.state.setlists;
    const current = currentId ? store.setlist(currentId) : null;

    const listPanel = el('aside', { class: 'setlist-side' },
      el('div', { class: 'row wrap' },
        button('+ Nueva lista', () => { const sl = store.newSetlist(); currentId = sl.id; render(); }, { variant: 'primary' })),
      el('ul', { class: 'setlist-list' },
        setlists.map((sl) => {
          const li = el('li', { class: sl.id === currentId ? 'active' : '' },
            el('strong', {}, sl.name),
            el('span', { class: 'muted small' }, `${sl.songs.length} canciones · ${sl.date || ''}`));
          li.addEventListener('click', () => { currentId = sl.id; render(); });
          return li;
        })));

    if (!current) {
      host.replaceChildren(el('div', { class: 'setlist-layout' }, listPanel,
        el('div', {}, el('p', { class: 'muted' }, 'Crea una lista para planear el servicio.'))));
      return;
    }

    const rows = current.songs.map((item, i) => {
      const song = store.song(item.songId);
      if (!song) return null;
      const prev = i > 0 ? store.song(current.songs[i - 1].songId) : null;
      const prevKey = prev ? (current.songs[i - 1].key || prev.key) : null;
      const key = item.key || song.key;
      return el('div', { class: 'setlist-row' },
        el('div', { class: 'order' }, String(i + 1)),
        el('div', { class: 'grow' },
          el('h4', { onClick: () => navigate(`/cancion/${song.id}`) }, song.title),
          el('div', { class: 'meta-row' },
            el('label', { class: 'field inline' },
              el('span', { class: 'field-label' }, 'Tono'),
              select(KEY_OPTIONS, key, (v) => {
                current.songs[i].key = v;
                store.updateSetlist(current.id, { songs: current.songs });
                render();
              })),
            chip(`${song.bpm || '?'} BPM`),
            chip(song.timeSignature || '4/4'),
            key !== song.key ? chip(`original ${song.key}`, { class: 'warn' }) : null),
          prev ? el('p', { class: 'muted small transition' }, '↳ ' + transitionNote(prevKey, key, prev.bpm, song.bpm)) : null,
          input(item.notes || '', (v) => {
            current.songs[i].notes = v;
            store.updateSetlist(current.id, { songs: current.songs });
          }, { placeholder: 'Nota para el equipo: quién inicia, repeticiones, oración…' })),
        el('div', { class: 'row' },
          button('↑', () => { if (i > 0) { [current.songs[i - 1], current.songs[i]] = [current.songs[i], current.songs[i - 1]]; store.updateSetlist(current.id, { songs: current.songs }); render(); } }, { variant: 'ghost' }),
          button('↓', () => { if (i < current.songs.length - 1) { [current.songs[i + 1], current.songs[i]] = [current.songs[i], current.songs[i + 1]]; store.updateSetlist(current.id, { songs: current.songs }); render(); } }, { variant: 'ghost' }),
          button('✕', () => { current.songs.splice(i, 1); store.updateSetlist(current.id, { songs: current.songs }); render(); }, { variant: 'ghost danger' })));
    }).filter(Boolean);

    const addSelect = select(
      [{ value: '', label: 'Añadir canción…' }, ...store.songs.map((s) => ({ value: s.id, label: `${s.title} (${s.key})` }))],
      '', (v) => {
        if (!v) return;
        current.songs.push({ songId: v, key: store.song(v).key, notes: '' });
        store.updateSetlist(current.id, { songs: current.songs });
        render();
      });

    const asText = () => [
      current.name, current.date, '',
      ...current.songs.map((it, i) => {
        const s = store.song(it.songId);
        return `${i + 1}. ${s?.title || '?'} — ${it.key || s?.key} — ${s?.bpm || '?'} BPM${it.notes ? ' · ' + it.notes : ''}`;
      }),
      current.notes ? '\n' + current.notes : '',
    ].join('\n');

    host.replaceChildren(el('div', { class: 'setlist-layout' }, listPanel,
      el('div', {},
        section('',
          el('div', { class: 'row wrap' },
            input(current.name, (v) => store.updateSetlist(current.id, { name: v })),
            input(current.date, (v) => store.updateSetlist(current.id, { date: v }), { type: 'date' }),
            addSelect,
            button('Copiar lista', () => copyText(asText())),
            el('label', { class: 'field inline' },
              el('span', { class: 'field-label' }, 'Ya se hizo'),
              el('input', {
                type: 'checkbox', checked: current.realizado || false,
                onChange: (e) => store.updateSetlist(current.id, { realizado: e.target.checked }),
              })),
            button('Eliminar lista', () => {
              if (confirmDialog('¿Eliminar esta lista?')) { store.deleteSetlist(current.id); currentId = null; render(); }
            }, { variant: 'ghost danger' })),
          el('div', { class: 'row wrap acciones-set' },
            button('▶ Modo atril', () => navigate(`/atril/set/${current.id}`), { variant: 'primary' }),
            button('📤 Compartir con el equipo', () => abrirCompartir(current)),
            button('📄 Hojas por músico', () => abrirHojas(current)),
            button('🥁 Pistas de clic y pads', () => abrirPistas(current)),
            button('📊 Historial', () => navigate('/historial'))),
          rows.length ? el('div', { class: 'setlist-rows' }, rows) : el('p', { class: 'muted' }, 'Lista vacía: añade canciones arriba.'),
          el('label', { class: 'field' },
            el('span', { class: 'field-label' }, 'Notas del servicio'),
            textarea(current.notes, (v) => store.updateSetlist(current.id, { notes: v }), { rows: 3, placeholder: 'Tema de la predicación, momentos de oración, avisos…' }))),
        section('Cómo ordenar un set que funcione',
          el('ul', { class: 'tips' },
            el('li', {}, 'Empieza con algo conocido y de tempo medio: la gente necesita "engancharse" antes de una canción lenta.'),
            el('li', {}, 'Sube la energía hacia la mitad y baja hacia el final si sigue la predicación.'),
            el('li', {}, 'Máximo una canción nueva por servicio, y repítela 3 o 4 domingos seguidos.'),
            el('li', {}, 'Agrupa las canciones por tonalidades vecinas para encadenar sin cortes.'),
            el('li', {}, 'Ten preparada una canción extra por si el momento se alarga.'))))));
  };

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {}, el('h1', {}, 'Listas de servicio'), el('p', { class: 'muted' }, 'Planea el orden, las tonalidades y las transiciones')),
      el('div', {}, button('Repertorio', () => navigate('/')))),
    host);
  render();
}
