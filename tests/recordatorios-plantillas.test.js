import assert from 'node:assert/strict';
import {
  avanceSemestre, estadoArticulo, rachaHabito, tareasDeCurso, tareasDeInvestigacion,
  tareasDeSemestre, tareasDeServicio,
} from '../recordatorios/src/plantillas.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
const HOY = '2026-09-20';

t('un curso genera preparación repetida, examen y calificación', () => {
  const tareas = tareasDeCurso({
    codigo: 'IE-201', nombre: 'Circuitos I', grupos: 2,
    horario: [{ dia: 'martes', inicio: '07:00', aula: 'B-204' }, { dia: 'jueves', inicio: '07:00' }],
    evaluaciones: [{ nombre: 'Primer parcial', fecha: '2026-10-06', peso: 30, estudiantes: 60 }],
    entregaNotas: '2026-12-10',
  });
  const preparar = tareas.filter((x) => /Preparar clase/.test(x.titulo));
  assert.equal(preparar.length, 2);
  assert.deepEqual(preparar[0].regla, { tipo: 'semanal', cada: 1, dias: [2] });
  assert.match(preparar[0].notas, /B-204/);

  const calificar = tareas.find((x) => /^Calificar/.test(x.titulo));
  assert.equal(calificar.fecha, '2026-10-13'); // una semana después del parcial
  assert.equal(calificar.prioridad, 1);
  assert.match(calificar.notas, /2 grupo\(s\), 60 estudiantes/);

  const prep = tareas.find((x) => /Preparar Primer parcial/.test(x.titulo));
  assert.equal(prep.fecha, '2026-09-29');

  const notas = tareas.find((x) => /Entregar notas/.test(x.titulo));
  assert.equal(notas.fecha, '2026-12-08');
  assert.ok(tareas.every((x) => x.modulo === 'docencia'));
});

t('el semestre suma todos sus cursos y sabe por dónde va', () => {
  const semestre = {
    inicio: '2026-08-10', fin: '2026-12-05',
    cursos: [
      { nombre: 'Circuitos I', horario: [{ dia: 'martes' }] },
      { nombre: 'Electrónica', horario: [{ dia: 'lunes' }], evaluaciones: [{ nombre: 'Quiz', fecha: '2026-09-30' }] },
    ],
  };
  assert.equal(tareasDeSemestre(semestre).length, 4);
  const av = avanceSemestre(semestre, HOY);
  assert.equal(av.semanaActual, 6);
  assert.ok(av.pct > 30 && av.pct < 40);
  assert.equal(av.semanasRestantes, 11);
});

t('investigación: avisa del artículo parado y de la fecha límite', () => {
  const tareas = tareasDeInvestigacion({
    articulos: [
      { titulo: 'Modelo térmico', estado: 'en-revision', desde: '2026-05-01' },
      { titulo: 'Paper de control', estado: 'borrador', desde: '2026-09-15', deadline: '2026-10-30', revista: 'IEEE TIE' },
    ],
    convocatorias: [{ nombre: 'Minciencias 2027', cierra: '2026-11-15' }],
    tesis: [{ estudiante: 'Ana', titulo: 'Convertidores', frecuencia: 'cada 2 semanas', proxima: '2026-09-24' }],
  }, HOY);

  const parado = tareas.find((x) => /Modelo térmico/.test(x.titulo));
  assert.match(parado.titulo, /lleva 142 días en "En revisión"/);
  assert.match(parado.notas, /escribir al editor/);

  const limite = tareas.find((x) => /Fecha límite/.test(x.titulo));
  assert.equal(limite.fecha, '2026-10-23');

  const conv = tareas.find((x) => /Convocatoria/.test(x.titulo));
  assert.equal(conv.fecha, '2026-10-25');

  const tesis = tareas.find((x) => /Asesoría: Ana/.test(x.titulo));
  assert.deepEqual(tesis.regla, { tipo: 'semanal', cada: 2 });
  assert.equal(estadoArticulo('aceptado').nombre, 'Aceptado');
});

t('la semana del servicio se arma hacia atrás desde el domingo', () => {
  const tareas = tareasDeServicio({ fecha: '2026-09-27', hora: '09:00', horaEnsayo: '19:30' });
  assert.deepEqual(tareas.map((t) => t.fecha), ['2026-09-21', '2026-09-23', '2026-09-25', '2026-09-27']);
  assert.equal(tareas[2].hora, '19:30');
  assert.match(tareas[0].notas, /app de alabanza/);
  assert.ok(tareas.every((t) => t.modulo === 'alabanza'));
});

t('racha de un hábito: actual y mejor', () => {
  const r = rachaHabito(['2026-09-20', '2026-09-19', '2026-09-18', '2026-09-10', '2026-09-09'], HOY);
  assert.equal(r.racha, 3);
  assert.equal(r.mejor, 3);
  assert.equal(r.total, 5);
  // sin marcar hoy, la racha de ayer sigue viva
  assert.equal(rachaHabito(['2026-09-19', '2026-09-18'], HOY).racha, 2);
});

console.log(`\n${passed} pruebas de plantillas de trabajo OK`);
