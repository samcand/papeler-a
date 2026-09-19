/**
 * estudio.js (vista) — Laboratorio de audio: sube una canción y la app saca
 * tempo, tonalidad y acordes con sus tiempos, y te deja estudiarla lento,
 * en bucle y sin voz.
 */

import { el, button, select, chip, section, toast, copyText, download } from '../ui.js';
import { store } from '../store.js';
import { analizarArchivo, acordesABody, pianoRollSVG, transcribirMelodia } from '../transcribe.js';
import { EstudioAudio, MODOS } from '../audiolab.js';
import { formatTime } from '../music.js';
import { openChordDrawer } from './sheet.js';

export function estudioView(root, { navigate }) {
  const lab = new EstudioAudio();
  let analisis = null;
  let archivo = null;
  let marcaA = null;
  let marcaB = null;

  const estado = el('p', { class: 'muted' }, 'Sube un mp3, wav o m4a para empezar.');
  const resumen = el('div', {});
  const transporte = el('div', {});
  const acordesHost = el('div', {});
  const melodiaHost = el('div', {});
  const tiempoLabel = el('strong', {}, '0:00');
  const barra = el('div', { class: 'progress-bar clickable' }, el('div', { class: 'progress-fill', style: 'width:0%' }));

  barra.addEventListener('click', (e) => {
    if (!lab.duracion) return;
    const rect = barra.getBoundingClientRect();
    lab.buscar(((e.clientX - rect.left) / rect.width) * lab.duracion);
  });

  lab.onTick = (t) => {
    tiempoLabel.textContent = `${formatTime(t)} / ${formatTime(lab.duracion)}`;
    barra.firstChild.style.width = `${(t / (lab.duracion || 1)) * 100}%`;
    acordesHost.querySelectorAll('.acorde-seg').forEach((n) => {
      const activo = t >= Number(n.dataset.start) && t < Number(n.dataset.end);
      n.classList.toggle('activo', activo);
    });
  };

  const fileInput = el('input', { type: 'file', accept: 'audio/*', class: 'hidden' });
  fileInput.addEventListener('change', async () => {
    archivo = fileInput.files?.[0];
    if (!archivo) return;
    try {
      estado.textContent = 'Cargando audio…';
      await lab.cargar(archivo);
      pintarTransporte();
      estado.textContent = 'Analizando… (unos segundos según la duración)';
      analisis = await analizarArchivo(archivo, { onProgress: (m) => { estado.textContent = m; } });
      estado.textContent = `Listo: ${formatTime(analisis.duracion)} · ${analisis.bpm} BPM · tonalidad ${analisis.tonalidad} (confianza ${Math.round(analisis.confianza * 100)} %) · ${analisis.acordes.length} acordes`;
      pintarResumen();
      pintarAcordes();
    } catch (err) {
      estado.textContent = 'No se pudo procesar el archivo: ' + err.message;
    }
  });

  const pintarResumen = () => {
    if (!analisis) return;
    resumen.replaceChildren(section('Lo que encontró la app',
      el('div', { class: 'row wrap' },
        chip(`${analisis.bpm} BPM`, { class: 'key' }),
        chip(`Tonalidad ${analisis.tonalidad}`, { class: 'key' }),
        chip(`Confianza ${Math.round(analisis.confianza * 100)} %`),
        chip(analisis.canales >= 2 ? 'Estéreo' : 'Mono'),
        ...(analisis.alternativas || []).slice(0, 2).map((a) => chip(`¿o ${a.tonalidad}?`))),
      el('p', { class: 'muted small' }, 'La tonalidad se deduce de los acordes detectados. Si la canción cambia de tono a mitad, verás la de la mayor parte.'),
      el('div', { class: 'row wrap' },
        button('Crear canción con estos acordes', () => {
          const song = store.newSong({
            title: archivo?.name?.replace(/\.[^.]+$/, '') || 'Canción del audio',
            key: analisis.tonalidad,
            bpm: analisis.bpm,
            durationSec: Math.round(analisis.duracion),
            body: acordesABody(analisis.acordes),
            timeline: agruparSecciones(analisis.acordes).map((s) => ({ t: s.start, name: s.nombre })),
            notes: `Detectado automáticamente del audio "${archivo?.name || ''}". Revisa los acordes dudosos.`,
          });
          toast('Canción creada desde el audio', 'ok');
          navigate(`/cancion/${song.id}`);
        }, { variant: 'primary' }),
        button('Copiar acordes con tiempos', () => copyText(
          analisis.acordes.map((a) => `${formatTime(a.start)}  ${a.acorde}`).join('\n'))),
        button('Transcribir melodía', async (e) => {
          e.target.disabled = true;
          e.target.textContent = 'Transcribiendo…';
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const ctx = new AC();
            const buffer = await ctx.decodeAudioData(await archivo.arrayBuffer());
            const mono = buffer.getChannelData(0);
            const notas = transcribirMelodia(mono, buffer.sampleRate);
            ctx.close?.();
            melodiaHost.replaceChildren(section('Melodía detectada (nota por nota)',
              el('p', { class: 'muted small' }, 'Detección monofónica: funciona con una voz o una línea sola. Si suena toda la banda, tómalo como orientación.'),
              el('div', { html: pianoRollSVG(notas, { duracion: analisis.duracion }) }),
              el('p', { class: 'progression small' }, notas.slice(0, 40).map((n) => `${n.nota}${n.octava}`).join(' ')),
              el('div', { class: 'row wrap' },
                button('Copiar notas', () => copyText(notas.map((n) => `${formatTime(n.start)}  ${n.nota}${n.octava}`).join('\n'))))));
            e.target.textContent = 'Transcribir melodía';
            e.target.disabled = false;
          } catch (err) {
            toast('No se pudo transcribir: ' + err.message, 'warn');
            e.target.disabled = false;
            e.target.textContent = 'Transcribir melodía';
          }
        }))));
  };

  const pintarAcordes = () => {
    if (!analisis?.acordes?.length) return;
    const dur = analisis.duracion || 1;
    acordesHost.replaceChildren(section('Acordes en el tiempo',
      el('div', { class: 'acordes-barra' },
        analisis.acordes.map((a) => {
          const seg = el('div', {
            class: 'acorde-seg', style: `width:${((a.end - a.start) / dur) * 100}%; opacity:${0.45 + a.confianza * 0.55}`,
            title: `${a.acorde} · ${formatTime(a.start)} · confianza ${Math.round(a.confianza * 100)} %`,
            onClick: () => lab.buscar(a.start),
          }, el('span', {}, a.acorde));
          seg.dataset.start = a.start;
          seg.dataset.end = a.end;
          return seg;
        })),
      el('div', { class: 'chip-list' },
        [...new Set(analisis.acordes.map((a) => a.acorde))].map((a) =>
          button(a, () => openChordDrawer(a, null), { variant: 'chip' }))),
      el('p', { class: 'muted small' }, 'Los bloques más pálidos son los que la app reconoció con menos seguridad: revísalos a oído.')));
  };

  const pintarTransporte = () => {
    transporte.replaceChildren(section('Reproductor de estudio',
      el('div', { class: 'row wrap' },
        button('⏯ Reproducir / Pausa', () => (lab.reproduciendo ? lab.parar() : lab.reproducir()), { variant: 'primary' }),
        button('⏪ 5s', () => lab.buscar(lab.tiempo() - 5)),
        button('⏩ 5s', () => lab.buscar(lab.tiempo() + 5)),
        tiempoLabel),
      barra,
      el('div', { class: 'row wrap' },
        el('span', { class: 'ctl-label' }, 'Velocidad'),
        ...[0.5, 0.65, 0.75, 0.9, 1].map((v) => button(`${v}×`, (e) => {
          lab.setVelocidad(v);
          transporte.querySelectorAll('.btn').forEach((b) => b.classList.remove('vel-activa'));
          e.target.classList.add('vel-activa');
        }))),
      el('p', { class: 'muted small' }, 'Ojo: al bajar la velocidad también baja el tono (es audio puro, sin corrección). Para estudiar digitaciones va perfecto; para afinar con la canción, usa velocidad 1×.'),
      el('div', { class: 'row wrap' },
        el('span', { class: 'ctl-label' }, 'Bucle A-B'),
        button('Marcar A', (e) => { marcaA = lab.tiempo(); e.target.textContent = `A: ${formatTime(marcaA)}`; }),
        button('Marcar B', (e) => {
          marcaB = lab.tiempo();
          e.target.textContent = `B: ${formatTime(marcaB)}`;
          lab.setBucle(marcaA, marcaB);
          if (marcaA != null && marcaB > marcaA) toast(`Repitiendo ${formatTime(marcaA)} – ${formatTime(marcaB)}`);
        }),
        button('Quitar bucle', () => { marcaA = marcaB = null; lab.setBucle(null, null); toast('Bucle desactivado'); })),
      el('div', { class: 'row wrap' },
        el('span', { class: 'ctl-label' }, 'Qué escuchar'),
        select(MODOS.map((m) => ({ value: m.id, label: m.nombre })), lab.modo, (v) => {
          lab.setModo(v);
          const modo = MODOS.find((m) => m.id === v);
          toast(modo.detalle);
        })),
      !lab.estereo ? el('p', { class: 'muted small' }, 'Este archivo es mono: el modo karaoke no puede funcionar (no hay dos canales que restar).') : null));
  };

  root.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Estudio de audio'),
        el('p', { class: 'muted' }, 'Saca los acordes de una canción y estúdiala lento, en bucle y sin voz')),
      el('div', { class: 'row wrap' },
        button('Elegir archivo de audio', () => fileInput.click(), { variant: 'primary' }),
        fileInput,
        button('Repertorio', () => navigate('/')))),
    el('div', { class: 'card' }, estado,
      el('p', { class: 'muted small' },
        'Todo el procesamiento pasa dentro de tu navegador: el archivo no se sube a ningún servidor.')),
    resumen, transporte, acordesHost, melodiaHost,
    section('Qué puede y qué no puede hacer esto',
      el('ul', { class: 'tips' },
        el('li', {}, el('strong', {}, 'Sí: '), 'reconocer acordes mayores, menores, con séptima y suspendidos en grabaciones razonablemente limpias, estimar el tempo y la tonalidad, y transcribir una melodía de una sola voz.'),
        el('li', {}, el('strong', {}, 'Más o menos: '), 'el "karaoke" resta los dos canales del estéreo. Quita lo que esté al centro —normalmente la voz—, pero también se lleva parte del bombo y del bajo.'),
        el('li', {}, el('strong', {}, 'No: '), 'separar de verdad voz, batería, bajo y guitarra en pistas independientes. Eso necesita un modelo de IA corriendo en un servidor; ninguna página web puede hacerlo sola. Si lo necesitas, usa una herramienta especializada y trae aquí el resultado.'),
        el('li', {}, el('strong', {}, 'Consejo: '), 'usa el bucle A-B sobre un compás difícil a 0.65× y repítelo 20 veces. Es la forma más rápida de aprender un pasaje.'))));

  return () => lab.destruir();
}

/** Agrupa acordes repetidos en secciones aproximadas para la línea de tiempo. */
function agruparSecciones(acordes = []) {
  const secciones = [];
  let actual = null;
  acordes.forEach((a, i) => {
    if (i % 8 === 0) {
      actual = { start: a.start, nombre: `Sección ${secciones.length + 1}` };
      secciones.push(actual);
    }
  });
  return secciones;
}
