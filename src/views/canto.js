/**
 * canto.js (vista) — Módulo de canto: rango vocal, tonalidad según quién canta,
 * afinación en vivo, vocalizaciones guiadas, armonías, reparto de voces del
 * equipo y cuidado de la voz.
 */

import { el, button, select, input, textarea, chip, section, toast, confirmDialog, render } from '../ui.js';
import { store } from '../store.js';
import {
  TESITURAS, RANGO_CONGREGACION, clasificarVoz, nombreNota, nombreANota,
  rangoDeCancion, tonalidadesRecomendadas, repartirVoces, EJERCICIOS, secuenciaEjercicio,
  RUTINA, ARMONIAS, notaArmonia, CUIDADO_VOCAL,
} from '../vocal.js';
import { Afinador, tocarNota, estadoAfinacion } from '../afinador.js';
import { playSemitones } from '../academy.js';
import { chordsUsed, transposeSource } from '../chordpro.js';
import { keyInfo, keyPrefersFlats, intervalBetweenKeys } from '../music.js';

const PESTAÑAS = [
  { id: 'rango', nombre: '🎯 Mi rango' },
  { id: 'tonalidad', nombre: '🎚 Tonalidad ideal' },
  { id: 'afinacion', nombre: '🎤 Afinación en vivo' },
  { id: 'vocalizar', nombre: '🔊 Vocalizaciones' },
  { id: 'armonias', nombre: '🎶 Armonías' },
  { id: 'equipo', nombre: '👥 Equipo' },
  { id: 'cuidado', nombre: '💧 Cuidado vocal' },
];

export function cantoView(root, { navigate, params }) {
  let pestaña = store.state.settings.cantoPestana || 'rango';
  let afinador = null;
  const cuerpo = el('div', { class: 'canto-cuerpo' });

  const detener = () => { afinador?.detener(); afinador = null; };

  const cantanteActivo = () => store.cantante(store.state.settings.cantanteActivo) || store.cantantes[0] || null;

  // ---------------------------------------------------------------- RANGO
  const vistaRango = () => {
    let midiendo = false;
    let medidoMin = null, medidoMax = null;
    const lectura = el('div', { class: 'tuner-note' }, '—');
    const detalle = el('p', { class: 'muted' }, 'Pulsa "Medir mi rango" y canta desde tu nota más grave cómoda hasta la más aguda cómoda.');
    const resultado = el('div', {});

    const pintarResultado = () => {
      if (medidoMin == null) { render(resultado); return; }
      const clas = clasificarVoz(medidoMin, medidoMax);
      render(resultado, 
        el('div', { class: 'row wrap' },
          chip(`Grave: ${nombreNota(medidoMin)}`, { class: 'key' }),
          chip(`Aguda: ${nombreNota(medidoMax)}`, { class: 'key' }),
          chip(`${clas.octavas} octavas`),
          chip(clas.nombre)),
        el('p', {}, clas.nota),
        el('p', { class: 'muted small' }, `Tu zona cómoda para cantar un servicio entero: ${nombreNota(clas.comoda[0])} – ${nombreNota(clas.comoda[1])}. Fuera de ahí puedes llegar, pero te cansarás.`),
        el('div', { class: 'row wrap' },
          input('', (v) => { nombreNuevo = v; }, { placeholder: 'Tu nombre' }),
          button('Guardar este rango', () => {
            const c = store.guardarCantante({
              id: cantanteActivo()?.id && !nombreNuevo ? cantanteActivo().id : undefined,
              nombre: nombreNuevo || cantanteActivo()?.nombre || 'Yo',
              min: medidoMin, max: medidoMax, comoda: clas.comoda, tipo: clas.tipo,
            });
            store.setSetting('cantanteActivo', c.id);
            toast(`Rango guardado para ${c.nombre}`, 'ok');
            pintar();
          }, { variant: 'primary' })));
    };
    let nombreNuevo = '';

    const btnMedir = button('🎤 Medir mi rango', async (e) => {
      if (midiendo) {
        detener(); midiendo = false;
        e.target.textContent = '🎤 Medir mi rango';
        e.target.classList.remove('ok');
        return;
      }
      try {
        medidoMin = medidoMax = null;
        afinador = new Afinador({
          onLectura: (l) => {
            if (!l) { lectura.textContent = '—'; return; }
            lectura.textContent = `${l.nota}${l.octava}`;
            if (Math.abs(l.cents) > 45) return;         // nota poco clara
            if (medidoMin == null || l.midi < medidoMin) medidoMin = l.midi;
            if (medidoMax == null || l.midi > medidoMax) medidoMax = l.midi;
            detalle.textContent = `Grave ${nombreNota(medidoMin)} · Aguda ${nombreNota(medidoMax)} — sigue cantando; para cuando ya no sea cómodo.`;
            pintarResultado();
          },
        });
        await afinador.iniciar();
        midiendo = true;
        e.target.textContent = '⏹ Terminar medición';
        e.target.classList.add('ok');
        toast('Canta "ah" bajando despacio, luego subiendo. Para donde deje de ser cómodo.');
      } catch (err) {
        toast('No se pudo usar el micrófono: ' + (err.name === 'NotAllowedError' ? 'permiso denegado' : err.message), 'warn');
      }
    }, { variant: 'primary' });

    const manual = el('div', { class: 'row wrap' },
      el('label', { class: 'field inline' },
        el('span', { class: 'field-label' }, 'Nota grave'),
        input('', (v) => { const m = nombreANota(v); if (m) { medidoMin = m; pintarResultado(); } }, { placeholder: 'G2' })),
      el('label', { class: 'field inline' },
        el('span', { class: 'field-label' }, 'Nota aguda'),
        input('', (v) => { const m = nombreANota(v); if (m) { medidoMax = m; pintarResultado(); } }, { placeholder: 'E4' })));

    const lista = el('div', { class: 'cantantes' },
      store.cantantes.map((c) => {
        const activo = cantanteActivo()?.id === c.id;
        return el('div', { class: `cantante${activo ? ' activo' : ''}` },
          el('div', { class: 'grow' },
            el('strong', {}, c.nombre),
            el('div', { class: 'meta-row' },
              c.min ? chip(`${nombreNota(c.min)} – ${nombreNota(c.max)}`) : chip('sin rango'),
              c.tipo ? chip(TESITURAS.find((t) => t.id === c.tipo)?.nombre || c.tipo) : null)),
          el('div', { class: 'row' },
            button(activo ? 'Activo' : 'Usar', () => { store.setSetting('cantanteActivo', c.id); pintar(); },
              { variant: activo ? 'ok' : 'chip' }),
            button('✕', () => {
              if (confirmDialog(`¿Borrar a ${c.nombre}?`)) { store.borrarCantante(c.id); pintar(); }
            }, { variant: 'ghost danger' })));
      }));

    return el('div', {},
      section('Mi rango vocal',
        el('p', { class: 'muted' },
          'Saber tu rango sirve para elegir la tonalidad de cada canción con un dato, no con una opinión. ' +
          'Las notas se muestran como se escriben: los hombres cantan esas mismas notas una octava más abajo.'),
        el('div', { class: 'tuner' }, lectura, detalle, el('div', { class: 'row wrap center' }, btnMedir)),
        resultado,
        el('details', {}, el('summary', {}, 'Anotarlo a mano (si no quieres usar el micrófono)'), manual)),
      section('Cantantes del equipo', lista.children.length ? lista : el('p', { class: 'muted' }, 'Todavía no hay cantantes guardados.')),
      section('Rangos de referencia',
        el('div', { class: 'tesituras' },
          TESITURAS.map((t) => el('div', { class: 'tesitura' },
            el('strong', {}, t.nombre),
            el('span', { class: 'muted small' }, `${nombreNota(t.rango[0])} – ${nombreNota(t.rango[1])} (cómodo ${nombreNota(t.comoda[0])} – ${nombreNota(t.comoda[1])})`),
            el('p', { class: 'small' }, t.nota)))),
        el('p', { class: 'muted small' },
          `La congregación canta cómoda entre ${nombreNota(RANGO_CONGREGACION.comodoMin)} y ${nombreNota(RANGO_CONGREGACION.comodoMax)}. Por encima de ${nombreNota(RANGO_CONGREGACION.max)} la gente deja de cantar o se va una octava abajo.`)));
  };

  // ------------------------------------------------------------ TONALIDAD
  const vistaTonalidad = () => {
    const songs = store.songs;
    let songId = params.id || store.state.settings.cantoCancion || songs[0]?.id;
    const salida = el('div', {});

    const pintarRecomendacion = () => {
      const song = store.song(songId);
      if (!song) { render(salida, el('p', { class: 'muted' }, 'Elige una canción.')); return; }
      store.setSetting('cantoCancion', songId);
      const cantante = cantanteActivo();
      const r = tonalidadesRecomendadas(song, cantante);
      const rango = r.rango;

      render(salida, 
        el('div', { class: 'row wrap' },
          chip(`Melodía: ${nombreNota(rango.min)} – ${nombreNota(rango.max)}`, { class: 'key' }),
          chip(rango.fuente),
          cantante ? chip(`Para ${cantante.nombre}`) : chip('Sin cantante elegido')),
        r.aviso ? el('p', { class: 'feedback' }, '⚠ ' + r.aviso) : null,
        el('div', { class: 'row wrap' },
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Nota más grave'),
            input(rango.estimado ? '' : nombreNota(rango.min), (v) => guardarRango(song, v, null), { placeholder: 'ej. D3' })),
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Nota más aguda'),
            input(rango.estimado ? '' : nombreNota(rango.max), (v) => guardarRango(song, null, v), { placeholder: 'ej. E4' })),
          button('Tomarla del Estudio', () => navigate('/estudio'), { variant: 'chip' })),
        el('table', { class: 'tl-table' },
          el('thead', {}, el('tr', {},
            el('th', {}, 'Tonalidad'), el('th', {}, 'Cambio'), el('th', {}, 'Melodía'), el('th', {}, 'Qué pasa'), el('th', {}, ''))),
          el('tbody', {},
            r.opciones.slice(0, 7).map((o, i) => el('tr', { class: i === 0 ? 'mejor' : '' },
              el('td', {}, el('strong', {}, o.tonalidad)),
              el('td', {}, o.etiqueta),
              el('td', { class: 'small' }, `${nombreNota(o.min)} – ${nombreNota(o.max)}`),
              el('td', { class: 'small' }, o.avisos.length ? o.avisos.join('. ') : (i === 0 ? 'La mejor opción con los datos que hay.' : 'Cabe bien.')),
              el('td', {},
                o.semis === 0
                  ? chip('actual')
                  : button('Usar', () => {
                      const semis = intervalBetweenKeys(song.key, o.tonalidad);
                      store.updateSong(song.id, {
                        body: transposeSource(song.body, semis, keyPrefersFlats(o.tonalidad)),
                        key: o.tonalidad,
                      });
                      toast(`"${song.title}" guardada en ${o.tonalidad}`, 'ok');
                      pintarRecomendacion();
                    }, { variant: 'chip' }))))))); 
    };

    const guardarRango = (song, grave, aguda) => {
      const actual = song.rangoVocal || {};
      const min = grave ? nombreANota(grave) : actual.min;
      const max = aguda ? nombreANota(aguda) : actual.max;
      if (min && max && max > min) {
        store.updateSong(song.id, { rangoVocal: { min, max, tesitura: [min + 2, max - 2], fuente: 'anotado a mano' } });
        pintarRecomendacion();
      }
    };

    pintarRecomendacion();

    return el('div', {},
      section('¿En qué tonalidad conviene cantarla?',
        el('div', { class: 'row wrap' },
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Canción'),
            select(songs.map((s) => ({ value: s.id, label: `${s.title} (${s.key})` })), songId, (v) => { songId = v; pintarRecomendacion(); })),
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Quién canta'),
            select([{ value: '', label: 'Solo la congregación' }, ...store.cantantes.map((c) => ({ value: c.id, label: c.nombre }))],
              cantanteActivo()?.id || '', (v) => { store.setSetting('cantanteActivo', v); pintarRecomendacion(); }))),
        salida));
  };

  // ------------------------------------------------------------ AFINACIÓN
  const vistaAfinacion = () => {
    let objetivo = 60;
    let aciertos = 0, intentos = 0, sostenido = 0, ultimoOk = 0;
    const nota = el('div', { class: 'tuner-note' }, '—');
    const aguja = el('div', { class: 'needle' });
    const escala = el('div', { class: 'tuner-scale' },
      el('div', { class: 'tuner-track' }, aguja),
      el('div', { class: 'tuner-marks' }, ['-50', '-25', '0', '+25', '+50'].map((m) => el('span', {}, m))));
    const marcador = el('p', { class: 'muted' }, 'Elige una nota, escúchala y cántala.');
    const barraSostener = el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: 'width:0%' }));

    const objetivoLabel = el('strong', { class: 'objetivo' }, nombreNota(objetivo));

    const onLectura = (l) => {
      if (!l) { nota.textContent = '—'; nota.className = 'tuner-note'; return; }
      const diferencia = (l.midi - objetivo) * 100 + l.cents;
      const estado = estadoAfinacion(Math.abs(diferencia) > 200 ? null : Math.round(diferencia));
      nota.textContent = `${l.nota}${l.octava}`;
      nota.className = `tuner-note ${estado.clase}`;
      aguja.style.left = `${50 + Math.max(-50, Math.min(50, diferencia / 2))}%`;
      aguja.className = `needle ${estado.clase}`;
      const ahora = performance.now();
      if (Math.abs(diferencia) <= 25) {
        sostenido += ultimoOk ? Math.min(300, ahora - ultimoOk) : 0;
        ultimoOk = ahora;
        marcador.textContent = `¡Afinado! Sosteniendo ${(sostenido / 1000).toFixed(1)} s`;
      } else {
        if (sostenido > 0) { intentos++; if (sostenido > 2500) aciertos++; }
        sostenido = 0; ultimoOk = 0;
        marcador.textContent = diferencia > 0
          ? `Estás ${Math.round(diferencia)} cents alto: relaja y baja un poco.`
          : `Estás ${Math.abs(Math.round(diferencia))} cents bajo: apoya más el aire.`;
      }
      barraSostener.firstChild.style.width = `${Math.min(100, (sostenido / 6000) * 100)}%`;
    };

    return el('div', {},
      section('Afinación en vivo',
        el('p', { class: 'muted' }, 'La app toca una nota, tú la cantas y ves en tiempo real si estás por encima o por debajo. Sostenerla 6 segundos afinada es el ejercicio que más rápido mejora una voz.'),
        el('div', { class: 'row wrap center' },
          button('◀', () => { objetivo--; objetivoLabel.textContent = nombreNota(objetivo); }),
          objetivoLabel,
          button('▶', () => { objetivo++; objetivoLabel.textContent = nombreNota(objetivo); }),
          button('🔊 Escuchar la nota', () => tocarNota(objetivo), { variant: 'chip' }),
          button('🎤 Empezar', async (e) => {
            if (afinador) {
              detener();
              e.target.textContent = '🎤 Empezar'; e.target.classList.remove('ok');
              return;
            }
            try {
              afinador = new Afinador({ onLectura });
              await afinador.iniciar();
              e.target.textContent = '⏹ Parar'; e.target.classList.add('ok');
            } catch (err) { toast('Micrófono no disponible: ' + err.message, 'warn'); }
          }, { variant: 'primary' })),
        el('div', { class: 'tuner' }, nota, escala, marcador, barraSostener)),
      section('Qué practicar aquí',
        el('ul', { class: 'tips' },
          el('li', {}, 'Empieza en una nota cómoda del medio de tu rango y sostenla 6 segundos sin que la aguja se mueva.'),
          el('li', {}, 'Sube medio tono y repite. Cuando la aguja empiece a irse hacia arriba, llegaste a tu límite cómodo.'),
          el('li', {}, 'Si tiendes a quedar bajo al final de la nota, te falta aire: respira más abajo, no cantes más fuerte.'),
          el('li', {}, 'Practica la nota más alta de la canción del domingo. Si no la sostienes aquí, tampoco la sostendrás en la plataforma.'))));
  };

  // --------------------------------------------------------- VOCALIZACIONES
  const vistaVocalizar = () => {
    const cantante = cantanteActivo();
    const desde = cantante?.comoda?.[0] || 55;
    const hasta = cantante?.comoda?.[1] || 67;
    let ejercicio = EJERCICIOS[0];
    let paso = 0;
    let reproduciendo = null;
    const detalle = el('div', {});

    const pintarEjercicio = () => {
      const pasos = secuenciaEjercicio(ejercicio, { desde, hasta });
      paso = Math.min(paso, pasos.length - 1);
      const actual = pasos[paso];
      render(detalle, 
        el('h4', {}, ejercicio.nombre),
        el('p', {}, el('strong', {}, 'Objetivo: '), ejercicio.objetivo),
        el('p', {}, el('strong', {}, 'Cómo: '), ejercicio.como),
        el('p', { class: 'muted small' }, '⚠ ' + ejercicio.cuidado),
        el('div', { class: 'row wrap' },
          chip(`Paso ${paso + 1} de ${pasos.length}`),
          chip(`Desde ${nombreNota(actual.base)}`),
          chip(actual.notas.map((n) => nombreNota(n)).join(' → '))),
        el('div', { class: 'row wrap' },
          button('🔊 Tocar el patrón', () => {
            playSemitones(ejercicio.patron, {
              root: 440 * Math.pow(2, (actual.base - 69) / 12),
              gap: ejercicio.duracion, hold: ejercicio.duracion * 0.9,
            });
          }, { variant: 'primary' }),
          button('◀ Bajar', () => { paso = Math.max(0, paso - 1); pintarEjercicio(); }),
          button('Subir ▶', () => { paso = Math.min(pasos.length - 1, paso + 1); pintarEjercicio(); }),
          button(reproduciendo ? '⏹ Detener serie' : '▶ Serie completa', (e) => {
            if (reproduciendo) {
              clearInterval(reproduciendo); reproduciendo = null;
              e.target.textContent = '▶ Serie completa';
              return;
            }
            const duracionPaso = (ejercicio.patron.length + 1) * ejercicio.duracion * 1000 + 600;
            const tocar = () => {
              const p = secuenciaEjercicio(ejercicio, { desde, hasta })[paso];
              if (!p) { clearInterval(reproduciendo); reproduciendo = null; e.target.textContent = '▶ Serie completa'; return; }
              playSemitones(ejercicio.patron, {
                root: 440 * Math.pow(2, (p.base - 69) / 12),
                gap: ejercicio.duracion, hold: ejercicio.duracion * 0.9,
              });
              pintarEjercicio();
              paso++;
            };
            tocar();
            reproduciendo = setInterval(tocar, duracionPaso);
            e.target.textContent = '⏹ Detener serie';
          })));
    };

    pintarEjercicio();

    return el('div', {},
      section('Vocalizaciones guiadas',
        el('p', { class: 'muted' },
          cantante
            ? `Ajustadas a tu rango cómodo (${nombreNota(desde)} – ${nombreNota(hasta)}). Mide tu rango en la primera pestaña si cambió.`
            : 'Mide tu rango en "Mi rango" para que los ejercicios se ajusten a tu voz. Mientras tanto se usa un rango medio.'),
        el('div', { class: 'row wrap' },
          EJERCICIOS.map((ej) => button(ej.nombre.split(' (')[0], () => { ejercicio = ej; paso = 0; pintarEjercicio(); },
            { variant: ej.id === ejercicio.id ? 'ok' : 'chip' }))),
        detalle),
      section('Rutina de 10 minutos antes del servicio',
        el('ol', { class: 'path' },
          RUTINA.map((r) => el('li', {},
            el('h4', {}, `Minuto ${r.min}: ${r.titulo}`),
            el('p', { class: 'muted' }, r.detalle)))),
        el('div', { class: 'row' },
          button('Hacerla con cronómetro', () => navigate('/calentamiento/canto'), { variant: 'primary' }))));
  };

  // -------------------------------------------------------------- ARMONÍAS
  const vistaArmonias = () => {
    const songs = store.songs;
    let songId = store.state.settings.cantoCancion || songs[0]?.id;
    let tipo = 'tercera-arriba';
    let melodia = 64;
    const salida = el('div', {});

    const pintar2 = () => {
      const song = store.song(songId);
      const key = song?.key || 'C';
      const armonia = notaArmonia(melodia, key, tipo);
      const info = ARMONIAS.find((a) => a.id === tipo);
      render(salida, 
        el('div', { class: 'row wrap' },
          chip(`Tonalidad ${key}`, { class: 'key' }),
          chip(`Melodía: ${nombreNota(melodia)}`),
          chip(`Tu nota: ${nombreNota(armonia)}`, { class: 'key' })),
        el('p', {}, el('strong', {}, info.uso)),
        el('p', { class: 'muted small' }, '⚠ ' + info.cuidado),
        el('div', { class: 'row wrap' },
          button('◀ Melodía', () => { melodia--; pintar2(); }),
          button('Melodía ▶', () => { melodia++; pintar2(); }),
          button('🔊 Melodía', () => tocarNota(melodia), { variant: 'chip' }),
          button('🔊 Tu armonía', () => tocarNota(armonia), { variant: 'chip' }),
          button('🔊 Las dos juntas', () => {
            tocarNota(melodia); tocarNota(armonia);
          }, { variant: 'primary' })),
        el('p', { class: 'muted small' }, 'Las notas se calculan dentro de la tonalidad: por eso a veces la tercera es mayor y a veces menor. Cantar el intervalo fijo es el error más común de las segundas voces.'));
    };
    pintar2();

    return el('div', {},
      section('Entrenador de armonías',
        el('div', { class: 'row wrap' },
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Canción'),
            select(songs.map((s) => ({ value: s.id, label: `${s.title} (${s.key})` })), songId, (v) => { songId = v; pintar2(); })),
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Tu papel'),
            select(ARMONIAS.map((a) => ({ value: a.id, label: a.nombre })), tipo, (v) => { tipo = v; pintar2(); }))),
        salida),
      section('Cómo se arma un coro que suena',
        el('ul', { class: 'tips' },
          el('li', {}, 'Verso 1: todos al unísono. La gente está aprendiendo la melodía.'),
          el('li', {}, 'Coro: una tercera arriba. En el último coro añade la octava para que crezca.'),
          el('li', {}, 'Puente: quítate. El silencio de una voz es un arreglo.'),
          el('li', {}, 'Nunca dos personas improvisando armonías a la vez: se chocan y desafinan.'),
          el('li', {}, 'Si no la tienes segura, canta la melodía: una melodía firme vale más que una armonía dudosa.'))));
  };

  // ---------------------------------------------------------------- EQUIPO
  const vistaEquipo = () => {
    const songs = store.songs;
    let songId = store.state.settings.cantoCancion || songs[0]?.id;
    const salida = el('div', {});
    const pintar3 = () => {
      const song = store.song(songId);
      const reparto = repartirVoces(store.cantantes, song || {});
      render(salida, 
        reparto.length
          ? el('div', { class: 'cantantes' },
              reparto.map((c) => el('div', { class: 'cantante' },
                el('div', { class: 'grow' },
                  el('strong', {}, c.nombre),
                  el('div', { class: 'meta-row' },
                    chip(`${nombreNota(c.min)} – ${nombreNota(c.max)}`),
                    c.alcanzaMelodia ? chip('alcanza la melodía', { class: 'key' }) : chip('no alcanza toda la melodía', { class: 'warn' })),
                  el('p', { class: 'small' }, c.papel)))))
          : el('p', { class: 'muted' }, 'Guarda al menos dos cantantes con su rango para repartir las voces.'));
    };
    pintar3();
    return el('div', {},
      section('Reparto de voces',
        el('div', { class: 'row wrap' },
          el('label', { class: 'field inline' },
            el('span', { class: 'field-label' }, 'Canción'),
            select(songs.map((s) => ({ value: s.id, label: `${s.title} (${s.key})` })), songId, (v) => { songId = v; pintar3(); }))),
        salida),
      section('Reglas simples para repartir',
        el('ul', { class: 'tips' },
          el('li', {}, 'Quien tenga el rango más cercano a la melodía la canta: no siempre es el líder.'),
          el('li', {}, 'La segunda voz debe estar cómoda toda la canción, no solo en el coro.'),
          el('li', {}, 'Si alguien no alcanza la nota más alta, la solución es bajar la tonalidad, no que "se esfuerce".'),
          el('li', {}, 'Tres voces bien repartidas suenan mejor que seis personas cantando lo mismo.'))));
  };

  const vistaCuidado = () => el('div', {},
    section('Cuidado de la voz',
      el('div', { class: 'glossary' },
        CUIDADO_VOCAL.map((c) => el('div', { class: 'gloss' },
          el('strong', {}, c.titulo),
          el('p', { class: 'muted small' }, c.detalle))))),
    section('Señales de alarma',
      el('ul', { class: 'tips' },
        el('li', {}, 'Ronquera que dura más de dos semanas: ve a un otorrino, no lo dejes pasar.'),
        el('li', {}, 'Perder las notas agudas que antes alcanzabas con facilidad.'),
        el('li', {}, 'Dolor o ardor al cantar (cansancio sí es normal; dolor no).'),
        el('li', {}, 'Voz que se "corta" o se va en medio de una frase.'),
        el('li', {}, 'Tener que carraspear todo el tiempo para hablar claro.'))));

  const vistas = {
    rango: vistaRango, tonalidad: vistaTonalidad, afinacion: vistaAfinacion,
    vocalizar: vistaVocalizar, armonias: vistaArmonias, equipo: vistaEquipo, cuidado: vistaCuidado,
  };

  const tabs = el('div', { class: 'tabs' },
    PESTAÑAS.map((p) => {
      const b = button(p.nombre, () => { pestaña = p.id; pintar(); });
      b.dataset.tab = p.id;
      return b;
    }));

  const pintar = () => {
    detener();
    store.setSetting('cantoPestana', pestaña);
    render(cuerpo, vistas[pestaña]());
    [...tabs.children].forEach((b) => b.classList.toggle('active', b.dataset.tab === pestaña));
  };

  render(root, 
    el('div', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Canto'),
        el('p', { class: 'muted' }, 'Rango, tonalidad, afinación, vocalizaciones, armonías y cuidado de la voz')),
      el('div', { class: 'row wrap' },
        button('🔥 Calentar la voz', () => navigate('/calentamiento/canto'), { variant: 'primary' }),
        button('Academia', () => navigate('/academia')),
        button('Practicar', () => navigate('/practica')))),
    tabs, cuerpo);

  pintar();
  return () => detener();
}
