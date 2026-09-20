import assert from 'node:assert/strict';
import { huella, sellar, verificar, codigoCorto, hojaDeVerificacion } from '../src/firma.js';
import { generarDocumento, aTexto, CATALOGO } from '../src/documentos.js';
import { registroSuplementario, aFilasCsv } from '../src/extras.js';
import * as pila from '../src/pila.js';
import * as ugpp from '../src/ugpp.js';
import { liquidarPeriodo } from '../src/nomina.js';

let passed = 0;
const t = (nombre, fn) => { fn(); passed++; console.log('  ok  ' + nombre); };
const ta = async (nombre, fn) => { await fn(); passed++; console.log('  ok  ' + nombre); };

const EMPRESA = {
  nombre: 'Panadería La Espiga S.A.S.', nit: '900.123.456-1', ciudad: 'Medellín',
  representante: 'Ana Gómez', documentoRepresentante: '43.111.222', exonerado: true,
};
const EMPLEADO = {
  nombre: 'María Alejandra Restrepo Gómez', tipoDocumento: 'CC', documento: '1.020.304',
  cargo: 'Auxiliar de producción', eps: 'EPS037', afp: '230301',
};
const CONTRATO = {
  id: 'c1', empleadoId: 'e1', modalidad: 'mensual', salario: 1750905, diasSemana: 6,
  claseArl: 'I', inicio: '2026-01-01', tipo: 'indefinido',
};

// ——— Firma electrónica ———

await ta('la huella cambia con cualquier cambio del texto', async () => {
  const a = await huella('Contrato de trabajo');
  const b = await huella('Contrato de trabajo.');
  assert.equal(a.length, 64);
  assert.notEqual(a, b);
  assert.equal(a, await huella('  Contrato de trabajo  '), 'ignora espacios de los extremos');
});

await ta('el sello detecta si el documento cambió', async () => {
  const texto = 'CARTA DE TERMINACIÓN\nSe da por terminado el contrato.';
  const sello = await sellar({
    texto, documentoId: 'doc1',
    firmantes: [{ rol: 'EL EMPLEADOR', nombre: 'Ana Gómez', documento: 'C.C. 43.111.222' }],
    entorno: 'pruebas',
  });
  assert.equal(sello.algoritmo, 'SHA-256');
  assert.equal(sello.firmantes.length, 1);
  assert.match(sello.codigo, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);

  const bien = await verificar({ texto, sello });
  assert.ok(bien.valido);

  const mal = await verificar({ texto: `${texto} Con una coletilla.`, sello });
  assert.ok(!mal.valido);
  assert.match(mal.motivo, /cambió/);

  const sinSello = await verificar({ texto, sello: null });
  assert.ok(!sinSello.valido);
});

t('la hoja de verificación trae lo necesario para comprobar', () => {
  const sello = {
    codigo: 'ABCD-1234-EF56-7890', huella: 'x'.repeat(64), fecha: '2026-09-20T10:00:00.000Z',
    firmantes: [{ rol: 'EL TRABAJADOR', nombre: 'María', documento: 'CC 1', metodo: 'aceptación en la app' }],
    entorno: 'navegador', norma: 'Ley 527 de 1999 art. 7 y Decreto 2364 de 2012',
  };
  const filas = hojaDeVerificacion(sello).map(([k]) => k);
  assert.ok(filas.some((f) => f.includes('Código')));
  assert.ok(filas.some((f) => f.includes('Huella')));
  assert.ok(filas.some((f) => f.includes('Firmante')));
  assert.equal(codigoCorto('abcdef1234567890ff'), 'ABCD-EF12-3456-7890');
});

// ——— Documentos ———

t('el catálogo cubre el ciclo completo del empleado', () => {
  const ids = CATALOGO.map((d) => d.id);
  for (const esperado of ['otrosi', 'preaviso', 'descargos', 'terminacion-justa', 'terminacion-sin-justa',
    'autorizacion-descuento', 'autorizacion-datos', 'dotacion', 'certificado-laboral', 'certificado-220', 'paz-salvo']) {
    assert.ok(ids.includes(esperado), `falta ${esperado}`);
  }
});

t('el preaviso avisa cuando va tarde', () => {
  const contrato = { ...CONTRATO, tipo: 'fijo', fin: '2026-10-01' };
  const tarde = generarDocumento({ tipo: 'preaviso', empresa: EMPRESA, empleado: EMPLEADO, contrato, datos: { fecha: '2026-09-20' } });
  assert.equal(tarde.avisos.length, 1);
  assert.match(tarde.avisos[0], /30 días/);

  const aTiempo = generarDocumento({
    tipo: 'preaviso', empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...contrato, fin: '2026-12-31' }, datos: { fecha: '2026-09-20' },
  });
  assert.equal(aTiempo.avisos.length, 0);
  assert.match(aTexto(aTiempo), /antelación no inferior a treinta/);
});

t('la terminación con justa causa exige motivos y descargos', () => {
  const flojo = generarDocumento({
    tipo: 'terminacion-justa', empresa: EMPRESA, empleado: EMPLEADO, contrato: CONTRATO,
    datos: { fecha: '2026-09-20' },
  });
  assert.ok(flojo.avisos.some((a) => a.includes('motivos')));
  assert.ok(flojo.avisos.some((a) => a.includes('descargos')));

  const completo = generarDocumento({
    tipo: 'terminacion-justa', empresa: EMPRESA, empleado: EMPLEADO, contrato: CONTRATO,
    datos: { fecha: '2026-09-20', hechos: 'Tres inasistencias sin justificación', causal: 'numeral 4', huboDescargos: true, fechaDescargos: '2026-09-15' },
  });
  assert.equal(completo.avisos.length, 0);
  assert.match(aTexto(completo), /artículo 62/);
});

t('el descuento que deja al trabajador bajo el mínimo se avisa', () => {
  const doc = generarDocumento({
    tipo: 'autorizacion-descuento', empresa: EMPRESA, empleado: EMPLEADO, contrato: CONTRATO,
    datos: { fecha: '2026-09-20', concepto: 'Préstamo', valor: 600000, cuotas: 2 },
  });
  assert.ok(doc.avisos.some((a) => a.includes('mínimo')));

  const chico = generarDocumento({
    tipo: 'autorizacion-descuento', empresa: EMPRESA, empleado: { ...EMPLEADO }, contrato: { ...CONTRATO, salario: 5000000 },
    datos: { fecha: '2026-09-20', concepto: 'Préstamo', valor: 600000, cuotas: 6 },
  });
  assert.equal(chico.avisos.length, 0);
});

t('la dotación revisa el tope de 2 salarios y los 3 meses', () => {
  const caro = generarDocumento({
    tipo: 'dotacion', empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...CONTRATO, salario: 6000000 }, datos: { fecha: '2026-09-20' },
  });
  assert.ok(caro.avisos.some((a) => a.includes('dos salarios mínimos')));

  const nuevo = generarDocumento({
    tipo: 'dotacion', empresa: EMPRESA, empleado: EMPLEADO,
    contrato: { ...CONTRATO, inicio: '2026-08-15' }, datos: { fecha: '2026-09-20' },
  });
  assert.ok(nuevo.avisos.some((a) => a.includes('3 meses')));
});

t('el certificado de ingresos avisa si se expide tarde', () => {
  const tarde = generarDocumento({
    tipo: 'certificado-220', empresa: EMPRESA, empleado: EMPLEADO, contrato: CONTRATO,
    datos: { fecha: '2026-06-01', anio: 2025, valores: { salarios: 20000000, retencion: 0 } },
  });
  assert.ok(tarde.avisos.some((a) => a.includes('marzo')));
  assert.ok(tarde.meta.some(([k]) => k.includes('Retención')));
});

t('el certificado laboral solo muestra el salario si se pide', () => {
  const sin = generarDocumento({ tipo: 'certificado-laboral', empresa: EMPRESA, empleado: EMPLEADO, contrato: CONTRATO, datos: { fecha: '2026-09-20' } });
  assert.ok(!aTexto(sin).includes('1.750.905'));
  const con = generarDocumento({ tipo: 'certificado-laboral', empresa: EMPRESA, empleado: EMPLEADO, contrato: CONTRATO, datos: { fecha: '2026-09-20', incluirSalario: true } });
  assert.ok(aTexto(con).includes('1.750.905'));
});

t('el otrosí avisa cuando el cambio desmejora', () => {
  const doc = generarDocumento({
    tipo: 'otrosi', empresa: EMPRESA, empleado: EMPLEADO, contrato: CONTRATO,
    datos: { fecha: '2026-09-20', desmejora: true, cambios: [{ concepto: 'Salario', antes: '2.000.000', despues: '1.800.000' }] },
  });
  assert.ok(doc.avisos.some((a) => a.includes('desmejorar')));
});

// ——— Registro de trabajo suplementario ———

const NOVEDADES_MES = {
  '2026-09-07': { tipo: 'trabajo', inicio: '08:00', fin: '19:00', nota: 'Producción' },
  '2026-09-08': { tipo: 'trabajo', inicio: '14:00', fin: '23:00' },
  '2026-09-20': { tipo: 'trabajo', inicio: '08:00', fin: '14:00' },
};

t('el registro separa extras diurnas, nocturnas y trabajo en descanso', () => {
  const r = registroSuplementario({
    contrato: CONTRATO, empleado: EMPLEADO, desde: '2026-09-01', hasta: '2026-09-30', novedades: NOVEDADES_MES,
  });
  assert.equal(r.filas.length, 3);
  assert.equal(r.totales.extraDiurna, 4, 'lunes de 8 a 19 con jornada de 7 horas');
  assert.equal(r.totales.extraNocturna, 2, 'martes de 21 a 23');
  assert.equal(r.totales.recargoNocturno, 2, 'martes de 19 a 21');
  assert.equal(r.totales.descansoDiurna, 6, 'domingo de 8 a 14');
  assert.ok(r.totales.valor > 0);
  assert.match(r.norma, /2466/);
});

t('el registro lleva nombre, actividad y horario, como pide la ley', () => {
  const r = registroSuplementario({
    contrato: CONTRATO, empleado: EMPLEADO, desde: '2026-09-01', hasta: '2026-09-30', novedades: NOVEDADES_MES,
  });
  const fila = r.filas[0];
  assert.equal(fila.trabajador, EMPLEADO.nombre);
  assert.equal(fila.actividad, 'Producción');
  assert.equal(fila.horario, '08:00 a 19:00');
  assert.equal(r.filas[1].actividad, EMPLEADO.cargo, 'sin nota usa el cargo');

  const filas = aFilasCsv(r);
  assert.equal(filas[0][0], 'Fecha');
  assert.equal(filas[filas.length - 1][0], 'TOTAL');
});

t('el registro avisa cuando se pasan los topes de extras', () => {
  const r = registroSuplementario({
    contrato: CONTRATO, empleado: EMPLEADO, desde: '2026-09-01', hasta: '2026-09-30', novedades: NOVEDADES_MES,
  });
  assert.ok(r.avisos.some((a) => a.includes('horas extra en un día')));
});

// ——— PILA ———

function lineaDePrueba(novedades = {}, contrato = CONTRATO) {
  const resultado = liquidarPeriodo({
    contrato, empresa: EMPRESA, desde: '2026-09-01', hasta: '2026-09-30', novedades,
  });
  return pila.lineaCotizante({ contrato, empleado: EMPLEADO, resultado, empresa: EMPRESA });
}

t('la línea de la planilla trae días, IBC y valores', () => {
  const l = lineaDePrueba();
  assert.equal(l.tipoCotizante, '01');
  assert.equal(l.diasCotizadosSalud, 30);
  assert.equal(l.documento, '1020304', 'el documento va sin puntos');
  assert.ok(l.ibcSalud >= 1750905);
  assert.ok(l.cotizacionPension > 0 && l.cotizacionSalud > 0);
  assert.equal(l.avisos.length, 0);
});

t('detecta ingreso, retiro y las novedades del calendario con sus fechas', () => {
  const ingreso = lineaDePrueba({}, { ...CONTRATO, inicio: '2026-09-08' });
  const ing = ingreso.novedades.find((n) => n.codigo === 'ING');
  assert.ok(ing && ing.desde === '2026-09-08');
  assert.equal(ingreso.diasCotizadosSalud, 23, 'se cotiza desde que entra');

  const retiro = lineaDePrueba({}, { ...CONTRATO, estado: 'terminado', terminacion: '2026-09-20' });
  assert.ok(retiro.novedades.some((n) => n.codigo === 'RET' && n.desde === '2026-09-20'));

  const conNovedades = lineaDePrueba({
    '2026-09-14': { tipo: 'incapacidad-comun' },
    '2026-09-15': { tipo: 'incapacidad-comun' },
    '2026-09-16': { tipo: 'incapacidad-comun' },
    '2026-09-21': { tipo: 'vacaciones' },
    '2026-09-22': { tipo: 'vacaciones' },
  });
  const ige = conNovedades.novedades.find((n) => n.codigo === 'IGE');
  assert.deepEqual([ige.desde, ige.hasta, ige.dias], ['2026-09-14', '2026-09-16', 3]);
  const vac = conNovedades.novedades.find((n) => n.codigo === 'VAC');
  assert.deepEqual([vac.desde, vac.hasta, vac.dias], ['2026-09-21', '2026-09-22', 2]);
});

t('la licencia no remunerada baja los días y se reporta como SLN', () => {
  const novedades = {};
  for (const dia of ['07', '08', '09', '10', '11']) novedades[`2026-09-${dia}`] = { tipo: 'licencia-no-remunerada' };
  const l = lineaDePrueba(novedades);
  assert.equal(l.diasCotizadosSalud, 25);
  const sln = l.novedades.find((n) => n.codigo === 'SLN');
  assert.deepEqual([sln.desde, sln.hasta, sln.dias], ['2026-09-07', '2026-09-11', 5]);
  assert.equal(l.avisos.length, 0, 'con la novedad, los días menores no son un error');
});

t('avisa si un aprendiz va con tipo de cotizante de dependiente', () => {
  const l = lineaDePrueba({}, { ...CONTRATO, tipo: 'aprendizaje', tipoCotizante: '01' });
  assert.ok(l.avisos.some((a) => a.includes('12')));
});

t('la planilla suma los totales y arma el encabezado', () => {
  const p = pila.armarPlanilla({ empresa: EMPRESA, mes: '2026-09', lineas: [lineaDePrueba(), lineaDePrueba()] });
  assert.equal(p.encabezado.numeroCotizantes, 2);
  assert.equal(p.encabezado.documentoAportante, '900123456');
  assert.equal(p.encabezado.modalidadPlanilla, 'E');
  assert.ok(p.totales.general > 0);
  assert.equal(p.totales.general,
    p.totales.pension + p.totales.fsp + p.totales.salud + p.totales.arl + p.totales.ccf + p.totales.sena + p.totales.icbf);
});

t('el archivo plano respeta las longitudes de la tabla de campos', () => {
  const p = pila.armarPlanilla({ empresa: EMPRESA, mes: '2026-09', lineas: [lineaDePrueba()] });
  const largo = pila.CAMPOS_REGISTRO_2.reduce((s, c) => s + c.largo, 0);
  const linea = pila.aArchivoPlano(p);
  assert.equal(linea.length, largo, 'cada registro mide lo que suman los campos');
  assert.ok(linea.startsWith('02'), 'el registro tipo 2 empieza con 02');
  const filas = pila.aFilasCsv(p);
  assert.equal(filas[0][0], 'Tipo documento');
  assert.equal(filas[filas.length - 1][2], 'TOTALES');
});

t('el nombre se parte en dos nombres y dos apellidos', () => {
  const p = pila.armarPlanilla({ empresa: EMPRESA, mes: '2026-09', lineas: [lineaDePrueba()] });
  const linea = pila.aArchivoPlano(p);
  assert.ok(linea.includes('Restrepo'), 'primer apellido');
  assert.ok(linea.includes('María'), 'primer nombre');
});

// ——— Autoauditoría UGPP ———

t('detecta meses sin aporte de un contrato vigente', () => {
  const r = ugpp.auditar({
    empresa: EMPRESA,
    contratos: [{ ...CONTRATO, inicio: '2026-01-01' }],
    empleado: () => EMPLEADO,
    nominas: [],
    hasta: '2026-09-20',
  });
  const hallazgo = r.hallazgos.find((h) => h.codigo === 'omision');
  assert.ok(hallazgo);
  assert.equal(hallazgo.nivel, 'alto');
});

t('detecta el IBC menor que el devengado salarial y estima la exposición', () => {
  const r = ugpp.auditar({
    empresa: EMPRESA,
    contratos: [CONTRATO],
    empleado: () => EMPLEADO,
    nominas: [{
      contratoId: 'c1', desde: '2026-08-01', hasta: '2026-08-31', ibc: 1750905, neto: 1,
      totalDevengado: 2300000,
      devengados: [
        { concepto: 'Salario', valor: 1750905, salarial: true },
        { concepto: 'Hora extra diurna', valor: 300000, salarial: true },
      ],
      aportes: { aplicaExoneracion: true },
    }],
    hasta: '2026-09-20',
  });
  const hallazgo = r.hallazgos.find((h) => h.codigo === 'ibc-bajo');
  assert.ok(hallazgo);
  assert.ok(r.exposicion > 0);
  assert.ok(r.sancionEstimada.minima < r.sancionEstimada.maxima);
  assert.match(r.sancionEstimada.norma, /1819/);
});

t('detecta pagos no salariales por encima del 40 %', () => {
  const r = ugpp.auditar({
    empresa: EMPRESA, contratos: [CONTRATO], empleado: () => EMPLEADO,
    nominas: [{
      contratoId: 'c1', desde: '2026-08-01', hasta: '2026-08-31', ibc: 2000000, neto: 1,
      totalDevengado: 5000000,
      devengados: [
        { concepto: 'Salario', valor: 2000000, salarial: true },
        { concepto: 'Pagos no salariales', valor: 3000000, salarial: false },
      ],
      aportes: {},
    }],
    hasta: '2026-09-20',
  });
  assert.ok(r.hallazgos.some((h) => h.codigo === 'no-salariales'));
});

t('detecta exoneración mal aplicada, salario integral bajo y falta de afiliación', () => {
  const minimo = 1750905;
  const r = ugpp.auditar({
    empresa: EMPRESA,
    contratos: [
      { ...CONTRATO, id: 'c2', salario: minimo * 12, salarioIntegral: true },
      { ...CONTRATO, id: 'c3' },
    ],
    empleado: (id) => (id === 'e1' ? { nombre: 'Sin afiliación' } : EMPLEADO),
    nominas: [{
      contratoId: 'c2', desde: '2026-08-01', hasta: '2026-08-31', ibc: minimo * 12, neto: 1,
      totalDevengado: minimo * 12, devengados: [], aportes: { aplicaExoneracion: true },
    }],
    hasta: '2026-09-20',
  });
  assert.ok(r.hallazgos.some((h) => h.codigo === 'exoneracion'));
  assert.ok(r.hallazgos.some((h) => h.codigo === 'integral-bajo'));
  assert.ok(r.hallazgos.some((h) => h.codigo === 'afiliacion'));
});

t('una nómina bien liquidada no genera hallazgos de IBC', () => {
  const resultado = liquidarPeriodo({
    contrato: CONTRATO, empresa: EMPRESA, desde: '2026-08-01', hasta: '2026-08-31', novedades: NOVEDADES_MES,
  });
  const r = ugpp.auditar({
    empresa: EMPRESA, contratos: [CONTRATO], empleado: () => EMPLEADO,
    nominas: [{ contratoId: 'c1', ...resultado }],
    hasta: '2026-08-31',
  });
  assert.ok(!r.hallazgos.some((h) => h.codigo === 'ibc-bajo'), 'el IBC calculado por la app siempre cubre lo salarial');
});

console.log(`\n${passed} pruebas de cumplimiento (firma, documentos, extras, PILA y UGPP) ✔`);
