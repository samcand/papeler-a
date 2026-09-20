import assert from 'node:assert/strict';
import {
  generarContrato, periodoPruebaMaximo, calcularFin, duracion, DURACIONES, enLetras,
} from '../src/contrato.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };

const EMPRESA = {
  nombre: 'Panadería La Espiga S.A.S.', nit: '900.123.456-1', ciudad: 'Medellín',
  representante: 'Ana Gómez', documentoRepresentante: '43.111.222',
};
const EMPLEADO = {
  nombre: 'María Restrepo', tipoDocumento: 'C.C.', documento: '1.020.304', cargo: 'Auxiliar de producción',
  fechaNacimiento: '1995-04-12', lugarNacimiento: 'Bello, Antioquia', direccion: 'Calle 10 # 5-20',
};
const BASE = { modalidad: 'mensual', salario: 1750905, inicio: '2026-10-01', diasSemana: 6, claseArl: 'I' };
const DATOS = {
  lugarTrabajo: 'Carrera 50 # 20-30, Medellín', ciudadContrato: 'Medellín',
  funciones: 'preparar y hornear el producto, y mantener limpia el área de trabajo',
  periodoPruebaDias: 30, fechaFirma: '2026-09-30',
};

const texto = (doc) => doc.clausulas.map((c) => `${c.titulo} ${c.parrafos.join(' ')}`).join('\n');
const clausula = (doc, titulo) => doc.clausulas.find((c) => c.titulo === titulo);

t('ofrece las duraciones que pide la ley', () => {
  const ids = DURACIONES.map((d) => d.id);
  assert.deepEqual(ids, ['dias', 'meses', 'anio', 'indefinido', 'obra', 'aprendizaje']);
  assert.equal(duracion('anio').tipoContrato, 'fijo');
  assert.equal(duracion('indefinido').tipoContrato, 'indefinido');
});

t('calcula la fecha de terminación de cada duración', () => {
  assert.equal(calcularFin({ duracionId: 'dias', inicio: '2026-10-01', cantidadDias: 15 }), '2026-10-15');
  assert.equal(calcularFin({ duracionId: 'meses', inicio: '2026-10-01', cantidadMeses: 6 }), '2027-03-31');
  assert.equal(calcularFin({ duracionId: 'anio', inicio: '2026-10-01', cantidadAnios: 1 }), '2027-09-30');
  assert.equal(calcularFin({ duracionId: 'indefinido', inicio: '2026-10-01' }), '');
  assert.equal(calcularFin({ duracionId: 'obra', inicio: '2026-10-01' }), '');
});

t('el periodo de prueba máximo respeta los artículos 76 a 78', () => {
  assert.equal(periodoPruebaMaximo({ duracionId: 'indefinido' }).dias, 60);
  // Contrato de 6 meses: la quinta parte de 182 días son 36.
  assert.equal(periodoPruebaMaximo({ duracionId: 'meses', inicio: '2026-10-01', fin: '2027-03-31' }).dias, 36);
  // Contrato de 15 días: la quinta parte son 3.
  assert.equal(periodoPruebaMaximo({ duracionId: 'dias', inicio: '2026-10-01', fin: '2026-10-15' }).dias, 3);
  // Contrato de un año o más: el tope vuelve a ser de 2 meses.
  assert.equal(periodoPruebaMaximo({ duracionId: 'anio', inicio: '2026-10-01', fin: '2027-09-30' }).dias, 60);
});

t('escribe las cifras en letras', () => {
  assert.equal(enLetras(1750905), 'un millón setecientos cincuenta mil novecientos cinco pesos');
  assert.equal(enLetras(2000000), 'dos millones de pesos');
  assert.equal(enLetras(85000), 'ochenta y cinco mil pesos');
  assert.equal(enLetras(21), 'veintiun pesos');
  assert.equal(enLetras(100), 'cien pesos');
  assert.equal(enLetras(115), 'ciento quince pesos');
});

t('el contrato indefinido dice lo suyo y no pone plazo', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'indefinido' },
    datos: { ...DATOS, duracionId: 'indefinido' },
  });
  assert.match(doc.titulo, /TÉRMINO INDEFINIDO/);
  const dur = clausula(doc, 'Duración del contrato');
  assert.match(dur.parrafos.join(' '), /término indefinido/);
  assert.match(dur.parrafos.join(' '), /artículo 47/);
  assert.equal(doc.avisos.length, 0, `sin avisos: ${doc.avisos.join(' | ')}`);
});

t('el contrato a término fijo lleva prórroga, preaviso y tope de 4 años', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'fijo', fin: '2027-03-31' },
    datos: { ...DATOS, duracionId: 'meses' },
  });
  const t = texto(doc);
  assert.match(doc.titulo, /TÉRMINO FIJO/);
  assert.match(t, /treinta \(30\) días/, 'preaviso');
  assert.match(t, /cuatro \(4\) años/, 'tope de la Ley 2466');
  assert.match(t, /cuarta prórroga/, 'regla de las prórrogas en contratos menores a un año');
});

t('avisa si el término fijo pasa de cuatro años o no tiene fecha de fin', () => {
  const largo = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'fijo', fin: '2031-10-01' },
    datos: { ...DATOS, duracionId: 'anio' },
  });
  assert.ok(largo.avisos.some((a) => a.includes('4 años')));

  const sinFin = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'fijo', fin: '' },
    datos: { ...DATOS, duracionId: 'meses' },
  });
  assert.ok(sinFin.avisos.some((a) => a.includes('indefinido')));
});

t('el contrato por días paga jornal y reconoce el descanso dominical', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { modalidad: 'jornal', valorDia: 85000, inicio: '2026-10-01', fin: '2026-10-15', tipo: 'fijo', diasSemana: 6 },
    datos: { ...DATOS, duracionId: 'dias', periodoPruebaDias: 3 },
  });
  const salario = clausula(doc, 'Salario').parrafos.join(' ');
  assert.match(salario, /85\.000/);
  assert.match(salario, /ochenta y cinco mil pesos/);
  assert.match(salario, /por cada día efectivamente trabajado/);
  assert.match(salario, /173, 176 y 177/, 'descanso dominical y festivos');
});

t('el contrato de obra exige describir la obra', () => {
  const sinObra = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'obra' },
    datos: { ...DATOS, duracionId: 'obra' },
  });
  assert.ok(sinObra.avisos.some((a) => a.includes('obra')));

  const conObra = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'obra' },
    datos: { ...DATOS, duracionId: 'obra', descripcionObra: 'remodelación del local de la carrera 50' },
  });
  const t = texto(conObra);
  assert.match(t, /remodelación del local/);
  assert.match(t, /quince \(15\) días/, 'mínimo de indemnización en obra o labor');
  assert.equal(conObra.avisos.length, 0);
});

t('avisa cuando el periodo de prueba pactado excede el máximo', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'fijo', fin: '2026-10-15' },
    datos: { ...DATOS, duracionId: 'dias', periodoPruebaDias: 30 },
  });
  assert.ok(doc.avisos.some((a) => a.includes('periodo de prueba')));
});

t('incluye los datos del artículo 39 y avisa de los que falten', () => {
  const completo = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO, contrato: { ...BASE, tipo: 'indefinido' },
    datos: { ...DATOS, duracionId: 'indefinido' },
  });
  const etiquetas = completo.encabezado.map(([e]) => e);
  for (const esperada of ['Empleador', 'Trabajador', 'Lugar y fecha de nacimiento', 'Cargo',
    'Lugar donde se presta el servicio', 'Remuneración', 'Periodo de pago', 'Duración']) {
    assert.ok(etiquetas.includes(esperada), `falta ${esperada}`);
  }
  assert.equal(completo.requisitos.length, 6);

  const incompleto = generarContrato({
    empresa: EMPRESA, empleado: { nombre: 'Sin datos' }, contrato: { ...BASE, tipo: 'indefinido' },
    datos: { duracionId: 'indefinido', periodoPruebaDias: 30 },
  });
  assert.ok(incompleto.avisos.length >= 3, 'avisa de cada dato que falta');
});

t('las cláusulas obligatorias están todas', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO, contrato: { ...BASE, tipo: 'indefinido' },
    datos: { ...DATOS, duracionId: 'indefinido' },
  });
  for (const titulo of ['Objeto', 'Lugar de trabajo', 'Duración del contrato', 'Periodo de prueba',
    'Jornada de trabajo', 'Salario', 'Recargos y trabajo suplementario', 'Prestaciones sociales',
    'Seguridad social y aportes', 'Obligaciones del trabajador', 'Terminación del contrato',
    'Confidencialidad y propiedad intelectual', 'Tratamiento de datos personales']) {
    assert.ok(clausula(doc, titulo), `falta la cláusula "${titulo}"`);
  }
});

t('el contrato trae los valores vigentes en la fecha de inicio', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO, contrato: { ...BASE, tipo: 'indefinido' },
    datos: { ...DATOS, duracionId: 'indefinido' },
  });
  const t = texto(doc);
  assert.match(t, /42 horas a la semana/, 'jornada vigente en octubre de 2026');
  assert.match(t, /las 19:00/, 'jornada nocturna desde las 7 p. m.');
  assert.match(t, /90 %/, 'recargo dominical vigente');
  assert.match(t, /249\.095/, 'auxilio de transporte de 2026');
});

t('el salario integral cambia las cláusulas', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'indefinido', salario: 25000000, salarioIntegral: true },
    datos: { ...DATOS, duracionId: 'indefinido' },
  });
  assert.ok(clausula(doc, 'Salario integral'), 'lleva la cláusula de salario integral');
  assert.ok(!clausula(doc, 'Prestaciones sociales'), 'no lleva la de prestaciones');
  assert.ok(!clausula(doc, 'Auxilio de transporte'), 'no lleva auxilio de transporte');
  assert.match(texto(doc), /70 %/, 'cotiza sobre el 70 %');
});

t('avisa si el salario queda por debajo del mínimo', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...BASE, tipo: 'indefinido', salario: 900000 },
    datos: { ...DATOS, duracionId: 'indefinido' },
  });
  assert.ok(doc.avisos.some((a) => a.includes('inferior al mínimo legal')));
});

t('las firmas quedan con nombre y documento', () => {
  const doc = generarContrato({
    empresa: EMPRESA, empleado: EMPLEADO, contrato: { ...BASE, tipo: 'indefinido' },
    datos: { ...DATOS, duracionId: 'indefinido' },
  });
  assert.equal(doc.firmas.empleador.nombre, 'Ana Gómez');
  assert.match(doc.firmas.empleador.documento, /43\.111\.222/);
  assert.equal(doc.firmas.trabajador.nombre, 'María Restrepo');
  assert.match(doc.firmas.texto, /dos ejemplares/);
  assert.match(doc.firmas.texto, /30 de septiembre de 2026/);
});

console.log(`\n${passed} pruebas del contrato ✔`);
