import assert from 'node:assert/strict';
import {
  MEDALLAS, NIVELES, cantidad, estrellasDelDia, evaluarMedalla, evaluarTodas,
  marcarVistas, nuevasDesde, resumenLogros, textoFalta, tiraDeEstrellas,
} from '../recordatorios/src/logros.js';
import { crearTarea } from '../recordatorios/src/modelo.js';
import { notaNueva } from '../recordatorios/src/notas.js';
import { pasoNuevo, rutinaNueva } from '../recordatorios/src/rutinas.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-23';   // miércoles

const medalla = (id) => MEDALLAS.find((m) => m.id === id);

/* ---------------- el catálogo ---------------- */

t('cada medalla dice de dónde sale y tiene tres escalones crecientes', () => {
  assert.ok(MEDALLAS.length >= 10);
  for (const m of MEDALLAS) {
    assert.ok(m.nombre && m.descripcion && m.unidad, `${m.id} está incompleta`);
    const { bronce, plata, oro } = m.umbrales;
    assert.ok(bronce < plata && plata < oro, `los umbrales de ${m.id} no crecen`);
    assert.equal(typeof m.medir, 'function');
  }
  assert.deepEqual(NIVELES.map((n) => n.id), ['bronce', 'plata', 'oro']);
});

t('el nivel sale del valor, y el porcentaje mide lo que falta para el siguiente', () => {
  const m = { ...medalla('volumen') };   // 100 / 500 / 2000
  const con = (n) => evaluarMedalla(m, { historial: Array.from({ length: n }, () => ({ fecha: HOY })) }, HOY);

  assert.equal(con(50).nivel, null);
  assert.equal(con(50).siguiente, 'bronce');
  assert.equal(con(50).pct, 50);
  assert.equal(con(50).falta, 50);

  assert.equal(con(100).nivel, 'bronce');
  assert.equal(con(300).nivel, 'bronce');
  assert.equal(con(300).siguiente, 'plata');
  assert.equal(con(300).pct, 50);        // 300 de 100→500

  assert.equal(con(500).nivel, 'plata');
  assert.equal(con(2000).nivel, 'oro');
  assert.equal(con(2000).siguiente, null);
  assert.equal(con(2000).pct, 100);
  assert.match(con(2000).frase, /No hay más allá/);
});

/* ---------------- las medidas ---------------- */

t('la constancia cuenta días seguidos y aguanta que hoy aún no esté hecho', () => {
  const dias = ['2026-09-21', '2026-09-22', '2026-09-23'];
  const estado = { historial: dias.map((f) => ({ fecha: f })) };
  assert.equal(medalla('constancia').medir(estado, HOY), 3);
  // Sin cerrar nada hoy, la racha se mide desde ayer y sigue viva.
  assert.equal(medalla('constancia').medir({ historial: [{ fecha: '2026-09-22' }, { fecha: '2026-09-21' }] }, HOY), 2);
  // Dos días sin nada: se rompió, y eso no quita ninguna medalla ya ganada.
  assert.equal(medalla('constancia').medir({ historial: [{ fecha: '2026-09-20' }] }, HOY), 0);
});

t('"palabra cumplida" necesita cinco entregas antes de contar', () => {
  const entrega = (limite, cuando) => crearTarea({ limite, completada: true, completadaEn: `${cuando}T10:00:00Z` });
  const pocas = { tareas: [entrega('2026-09-10', '2026-09-09'), entrega('2026-09-11', '2026-09-10')] };
  assert.equal(medalla('palabra').medir(pocas, HOY), 0);
  assert.match(medalla('palabra').nota(pocas, HOY), /2 de las 5/);

  const cinco = {
    tareas: [
      entrega('2026-09-10', '2026-09-09'), entrega('2026-09-11', '2026-09-10'),
      entrega('2026-09-12', '2026-09-11'), entrega('2026-09-13', '2026-09-12'),
      entrega('2026-09-14', '2026-09-20'),   // esta, tarde
    ],
  };
  assert.equal(medalla('palabra').medir(cinco, HOY), 80);
  assert.equal(evaluarMedalla(medalla('palabra'), cinco, HOY).nivel, 'bronce');
});

t('el enfoque cuenta horas medidas de verdad, no tareas marcadas', () => {
  const estado = { tiempo: [{ minutos: 300, fecha: HOY }, { minutos: 320, fecha: '2026-09-22' }] };
  assert.equal(medalla('enfoque').medir(estado, HOY), 10);   // 620 min = 10 h enteras
  assert.equal(evaluarMedalla(medalla('enfoque'), estado, HOY).nivel, 'bronce');
});

t('las medallas de la vida salen de sus propios datos', () => {
  const rutina = rutinaNueva({ id: 'r1', dias: [1, 2, 3, 4, 5], pasos: [pasoNuevo('Agua', 5)] });
  const hechas = ['2026-09-21', '2026-09-22', '2026-09-23']
    .map((fecha) => ({ rutina: 'r1', fecha, pasos: [rutina.pasos[0].id] }));
  assert.equal(medalla('rutina').medir({ rutinas: [rutina], rutinasHechas: hechas }, HOY), 3);

  const notas = ['2026-09-22', '2026-09-23'].map((f) => notaNueva({ tipo: 'diario', fecha: f }));
  assert.equal(medalla('diario').medir({ notas }, HOY), 2);

  assert.equal(medalla('metas').medir({ objetivos: [{ logradoEn: '2026-01-01' }, { logradoEn: null }] }, HOY), 1);
  assert.equal(medalla('lector').medir({ lecturas: [{ leidoEn: '2026-05-05' }, {}] }, HOY), 1);
  assert.equal(medalla('entregas').medir({ planes: [{ tareas: [{ esHito: true, avance: 100 }, { esHito: true, avance: 40 }] }] }, HOY), 1);
});

t('nada de esto se guarda: se recalcula, así que no se puede inflar', () => {
  const estado = { historial: Array.from({ length: 120 }, () => ({ fecha: HOY })) };
  const antes = evaluarMedalla(medalla('volumen'), estado, HOY).valor;
  // Aunque alguien escriba un contador falso en el estado, no se usa.
  estado.medallas = { volumen: 9999 };
  estado.logros = { oro: 11 };
  assert.equal(evaluarMedalla(medalla('volumen'), estado, HOY).valor, antes);
});

/* ---------------- estrellas del día ---------------- */

t('tres estrellas como mucho, y solo por lo que pasó hoy', () => {
  const estado = {
    ajustes: { metaDiaria: 2 },
    historial: [{ fecha: HOY }, { fecha: HOY }],
    tiempo: [{ minutos: 30, fecha: HOY }],
    tareas: [],
  };
  const e = estrellasDelDia(estado, HOY);
  assert.equal(e.de, 2);              // sin rutinas ni tres del día, solo aplican dos
  assert.equal(e.estrellas, 2);
  assert.match(e.frase, /Día redondo/);
});

t('un criterio que hoy no aplica no resta: deja sitio al siguiente', () => {
  const rutina = rutinaNueva({ id: 'r1', dias: [1, 2, 3, 4, 5], pasos: [pasoNuevo('Agua', 5)] });
  const estado = {
    ajustes: { metaDiaria: 5 },
    historial: [],
    tiempo: [],
    tareas: [],
    rutinas: [rutina],
    rutinasHechas: [],
  };
  const e = estrellasDelDia(estado, HOY);
  assert.equal(e.de, 3);
  assert.deepEqual(e.criterios.map((c) => c.id), ['meta', 'rutinas', 'enfoque']);
  assert.equal(e.estrellas, 0);
  assert.match(e.frase, /Hay día por delante/);
});

t('los plazos de hoy entran como criterio cuando los hay', () => {
  const estado = {
    ajustes: { metaDiaria: 1 },
    historial: [{ fecha: HOY }],
    tareas: [crearTarea({ id: 'x', titulo: 'Entregar', limite: HOY, completada: true, completadaEn: `${HOY}T09:00:00Z` })],
    tiempo: [],
  };
  const e = estrellasDelDia(estado, HOY);
  assert.ok(e.criterios.some((c) => c.id === 'plazos' && c.cumplido));
  assert.equal(e.estrellas, 2);
});

t('la tira de días tiene una entrada por día y no castiga los vacíos', () => {
  const tira = tiraDeEstrellas({ ajustes: {}, historial: [], tareas: [], tiempo: [] }, HOY, 14);
  assert.equal(tira.length, 14);
  assert.equal(tira[13].fecha, HOY);
  assert.ok(tira.every((d) => d.estrellas === 0 && d.de >= 1));
});

/* ---------------- resumen y avisos ---------------- */

t('el resumen cuenta el metal y dice qué tienes más cerca', () => {
  const estado = {
    historial: Array.from({ length: 120 }, () => ({ fecha: HOY })),
    tiempo: [{ minutos: 700, fecha: HOY }],
    objetivos: [{ logradoEn: '2026-01-01' }],
    tareas: [], ajustes: {},
  };
  const r = resumenLogros(estado, HOY);
  assert.equal(r.total, MEDALLAS.length);
  assert.ok(r.conseguidas >= 3);
  assert.ok(r.cerca.length <= 3);
  assert.match(r.frase, /de oro/);
  assert.match(resumenLogros({ tareas: [], ajustes: {} }, HOY).frase, /no hay nada que marcar a mano/);
});

t('una medalla se felicita una vez, no cada vez que se abre la pantalla', () => {
  const estado = { historial: Array.from({ length: 120 }, () => ({ fecha: HOY })), tareas: [], ajustes: {} };
  const nuevas = nuevasDesde(estado, {}, HOY);
  assert.ok(nuevas.some((x) => x.id === 'volumen' && x.nivel === 'bronce'));

  const vistas = marcarVistas(estado, HOY);
  assert.equal(nuevasDesde(estado, vistas, HOY).length, 0);

  // Y al subir de escalón vuelve a avisar, porque eso sí es nuevo.
  estado.historial = Array.from({ length: 600 }, () => ({ fecha: HOY }));
  const subida = nuevasDesde(estado, vistas, HOY);
  assert.ok(subida.some((x) => x.id === 'volumen' && x.nivel === 'plata'));
});

t('el singular se nota: "1 día seguido", no "1 días seguidos"', () => {
  const rutina = rutinaNueva({ id: 'r1', dias: [0, 1, 2, 3, 4, 5, 6], pasos: [pasoNuevo('Agua', 5)] });
  const estado = { rutinas: [rutina], rutinasHechas: [{ rutina: 'r1', fecha: HOY, pasos: [rutina.pasos[0].id] }] };
  const x = evaluarMedalla(medalla('rutina'), estado, HOY);
  assert.equal(cantidad(1, x.medalla), '1 día seguido');
  assert.equal(cantidad(6, x.medalla), '6 días seguidos');
  assert.match(x.frase, /^1 día seguido/);
  assert.equal(textoFalta({ falta: 1, medalla: medalla('metas') }), 'falta 1 objetivo');
  assert.equal(textoFalta({ falta: 4, medalla: medalla('metas') }), 'faltan 4 objetivos');
});

console.log(`\n${passed} pruebas de medallas y estrellas OK`);
