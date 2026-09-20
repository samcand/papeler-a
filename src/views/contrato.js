/**
 * contrato.js (vista) — Arma el contrato, lo muestra como quedará impreso y
 * lo deja listo para firmar.
 */

import {
  h, tarjeta, tabla, campo, entrada, seleccion, boton, pesos, aviso, mensaje,
  vacio, formatoCorto, formatoLargo, hoy, imprimir, descargar,
} from '../ui.js';
import { diasCalendario, sumarDias } from '../fechas.js';
import { DURACIONES, duracion, generarContrato, calcularFin, periodoPruebaMaximo } from '../contrato.js';
import * as calc from '../calculo.js';
import * as ley from '../normativa.js';

export function vista(store, params = {}) {
  const contratos = store.contratos();
  if (!contratos.length) {
    return h('div', { class: 'vista' }, tarjeta('Contrato',
      vacio('Primero crea un empleado con contrato.',
        boton('Ir a Empleados', () => { window.location.hash = '#/empleados'; }, 'primario'))));
  }

  const contrato = store.contrato(params.id) || contratos[0];
  const empleado = store.empleado(contrato.empleadoId) || {};
  const empresa = store.estado.empresa;
  const contenedor = h('div', { class: 'vista' });

  const guardado = contrato.documento || {};
  const inicial = guardado.duracionId || duracionSugerida(contrato);
  const datos = {
    duracionId: inicial,
    cantidadDias: 15,
    cantidadMeses: 6,
    cantidadAnios: 1,
    ciudadContrato: empresa.ciudad || '',
    lugarTrabajo: '',
    funciones: '',
    horario: 'de lunes a viernes de 8:00 a. m. a 5:00 p. m. y sábados de 8:00 a. m. a 12:00 m.',
    periodoPruebaDias: 0,
    fechaFirma: hoy(),
    representante: empresa.representante || '',
    documentoRepresentante: empresa.documentoRepresentante || '',
    descripcionObra: '',
    salarioEspecie: 0,
    pagosNoSalariales: '',
    testigos: false,
    ...guardado,
  };
  const datosEmpleado = {
    fechaNacimiento: empleado.fechaNacimiento || '',
    lugarNacimiento: empleado.lugarNacimiento || '',
    direccion: empleado.direccion || '',
  };

  const salida = h('div');
  const formulario = h('div');

  const fechaFin = () => (
    datos.duracionId === 'indefinido' || datos.duracionId === 'obra'
      ? ''
      : calcularFin({
        duracionId: datos.duracionId,
        inicio: contrato.inicio,
        cantidadDias: datos.cantidadDias,
        cantidadMeses: datos.cantidadMeses,
        cantidadAnios: datos.cantidadAnios,
      })
  );

  const recalcular = () => {
    const fin = fechaFin();
    salida.replaceChildren(documento(store, {
      empresa, empleado: { ...empleado, ...datosEmpleado }, contrato: { ...contrato, fin: fin || contrato.fin }, datos,
    }));
    pintarFormulario();
  };

  const set = (clave, numero = false) => (e) => {
    datos[clave] = numero ? Number(e.target.value) || 0 : e.target.value;
    recalcular();
  };
  const setEmpleado = (clave) => (e) => { datosEmpleado[clave] = e.target.value; recalcular(); };

  function pintarFormulario() {
    const dur = duracion(datos.duracionId);
    const fin = fechaFin();
    const tope = periodoPruebaMaximo({ duracionId: datos.duracionId, inicio: contrato.inicio, fin });

    const piezas = [
      h('div', { class: 'rejilla rejilla-3' },
        campo('Duración del contrato',
          seleccion(DURACIONES.map((d) => ({ value: d.id, label: d.nombre })), datos.duracionId, { onChange: set('duracionId') }),
          dur.ayuda),
        datos.duracionId === 'dias'
          ? campo('¿Cuántos días?', entrada({ type: 'number', min: 1, max: 365, value: datos.cantidadDias, onInput: set('cantidadDias', true) }),
            fin ? `Termina el ${formatoCorto(fin)}.` : '')
          : datos.duracionId === 'meses'
            ? campo('¿Cuántos meses?', entrada({ type: 'number', min: 1, max: 48, value: datos.cantidadMeses, onInput: set('cantidadMeses', true) }),
              fin ? `Termina el ${formatoCorto(fin)}.` : '')
            : datos.duracionId === 'anio'
              ? campo('¿Cuántos años?', entrada({ type: 'number', min: 1, max: 4, value: datos.cantidadAnios, onInput: set('cantidadAnios', true) }),
                fin ? `Termina el ${formatoCorto(fin)}. Máximo 4 años.` : '')
              : campo('Fecha de inicio', entrada({ type: 'date', value: contrato.inicio, disabled: true }), 'Se toma del contrato.'),
        campo('Periodo de prueba (días)',
          entrada({ type: 'number', min: 0, max: 60, value: datos.periodoPruebaDias, onInput: set('periodoPruebaDias', true) }),
          `Máximo legal aquí: ${tope.dias} días. ${tope.regla}`)),

      datos.duracionId === 'obra'
        ? campo('Describe la obra o labor', entrada({ value: datos.descripcionObra, onInput: set('descripcionObra') }),
          'Sin una descripción precisa, el contrato se entiende a término indefinido.')
        : null,

      h('div', { class: 'rejilla rejilla-2' },
        campo('Lugar donde presta el servicio', entrada({ value: datos.lugarTrabajo, onInput: set('lugarTrabajo') }),
          'Dirección o sede. Lo exige el artículo 39 del CST.'),
        campo('Ciudad donde se firma', entrada({ value: datos.ciudadContrato, onInput: set('ciudadContrato') }))),

      campo('Funciones del cargo', entrada({ value: datos.funciones, onInput: set('funciones') }),
        'Si lo dejas vacío, el contrato dice "las propias del oficio contratado".'),
      campo('Horario acordado', entrada({ value: datos.horario, onInput: set('horario') }),
        `La jornada máxima hoy es de ${ley.jornada(contrato.inicio).horasSemana} horas a la semana.`),

      h('div', { class: 'rejilla rejilla-3' },
        campo('Representante legal', entrada({ value: datos.representante, onInput: set('representante') })),
        campo('Documento del representante', entrada({ value: datos.documentoRepresentante, onInput: set('documentoRepresentante') })),
        campo('Fecha de firma', entrada({ type: 'date', value: datos.fechaFirma, onInput: set('fechaFirma') }))),

      h('h3', {}, 'Datos del trabajador que exige la ley'),
      h('div', { class: 'rejilla rejilla-3' },
        campo('Fecha de nacimiento', entrada({ type: 'date', value: datosEmpleado.fechaNacimiento, onInput: setEmpleado('fechaNacimiento') })),
        campo('Lugar de nacimiento', entrada({ value: datosEmpleado.lugarNacimiento, onInput: setEmpleado('lugarNacimiento') })),
        campo('Dirección', entrada({ value: datosEmpleado.direccion, onInput: setEmpleado('direccion') }))),

      h('h3', {}, 'Opcionales'),
      h('div', { class: 'rejilla rejilla-3' },
        campo('Salario en especie (mes)', entrada({ type: 'number', min: 0, step: 1000, value: datos.salarioEspecie, onInput: set('salarioEspecie', true) }),
          'Alimentación, vivienda. Máximo 50 % del salario, o 30 % si gana el mínimo.'),
        campo('Pagos no salariales', entrada({ value: datos.pagosNoSalariales, onInput: set('pagosNoSalariales') }),
          'Se pactan por escrito (CST art. 128). Tope del 40 %.'),
        campo('¿Incluir espacio para testigos?', seleccion([
          { value: '', label: 'No' }, { value: '1', label: 'Sí' },
        ], datos.testigos ? '1' : '', { onChange: (e) => { datos.testigos = !!e.target.value; recalcular(); } }))),

      h('div', { class: 'acciones acciones-envueltas' },
        boton('Guardar estos datos en el contrato', () => {
          store.guardarEmpleado({ id: empleado.id, ...datosEmpleado });
          store.guardarContrato({
            id: contrato.id,
            fin: fechaFin() || contrato.fin,
            tipo: duracion(datos.duracionId).tipoContrato,
            documento: { ...datos },
          });
          mensaje('Datos guardados en el contrato.');
        }, 'primario')),
    ];
    // replaceChildren convierte los null en la palabra "null": hay que filtrarlos.
    formulario.replaceChildren(...piezas.filter(Boolean));
  }

  contenedor.append(h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Contrato de trabajo'),
      h('p', { class: 'ayuda' }, empleado.nombre || '', ' · ', `inicia el ${formatoLargo(contrato.inicio)}`)),
    seleccion(contratos.map((c) => {
      const e = store.empleado(c.empleadoId);
      return { value: c.id, label: e ? e.nombre : c.id };
    }), contrato.id, { onChange: (e) => { window.location.hash = `#/contrato/${e.target.value}`; } })));

  contenedor.append(tarjeta('Condiciones del contrato', formulario));
  contenedor.append(salida);
  recalcular();
  return contenedor;
}

function duracionSugerida(contrato) {
  if (contrato.tipo === 'obra') return 'obra';
  if (contrato.tipo === 'aprendizaje') return 'aprendizaje';
  if (contrato.tipo === 'fijo') {
    if (!contrato.fin) return 'meses';
    const dias = diasCalendario(contrato.inicio, contrato.fin);
    return dias < 31 ? 'dias' : dias >= 365 ? 'anio' : 'meses';
  }
  return 'indefinido';
}

function documento(store, entrada) {
  const doc = generarContrato(entrada);

  const hoja = h('div', { class: 'contrato' },
    h('h2', { class: 'contrato-titulo' }, doc.titulo),
    tabla([{ titulo: 'Dato' }, { titulo: 'Contenido' }],
      doc.encabezado.map(([etiqueta, valor]) => ({ celdas: [h('strong', {}, etiqueta), valor] }))),
    h('p', {}, 'Entre las partes identificadas arriba se ha celebrado el presente contrato individual de trabajo, que se regirá por '
      + 'las siguientes cláusulas y, en lo no previsto, por el Código Sustantivo del Trabajo:'),
    ...doc.clausulas.map((c, i) => h('div', { class: 'clausula' },
      h('h3', {}, `${romano(i + 1)}. ${c.titulo}`),
      ...c.parrafos.map((p) => h('p', {}, p)))),
    h('p', { class: 'constancia' }, doc.firmas.texto),
    h('div', { class: 'firmas' }, bloqueFirma(doc.firmas.empleador), bloqueFirma(doc.firmas.trabajador)),
    doc.firmas.testigos
      ? h('div', { class: 'firmas' },
        bloqueFirma({ titulo: 'TESTIGO', nombre: '', documento: 'C.C.', detalle: '' }),
        bloqueFirma({ titulo: 'TESTIGO', nombre: '', documento: 'C.C.', detalle: '' }))
      : null);

  return h('div', {},
    doc.avisos.length
      ? tarjeta('Revisa esto antes de imprimir', ...doc.avisos.map((a) => aviso(a, 'alerta')))
      : tarjeta('Listo para firmar', aviso('El contrato tiene todos los datos que exige el artículo 39 del Código Sustantivo del Trabajo.', 'info')),
    tarjeta('',
      h('div', { class: 'acciones acciones-envueltas' },
        boton('Imprimir para firmar', () => imprimir(doc.titulo, hoja), 'primario'),
        boton('Descargar como texto', () => {
          descargar(`contrato-${(entrada.empleado.documento || 'trabajador')}.txt`, aTexto(doc), 'text/plain');
        })),
      hoja),
    tarjeta('Lo que la ley exige que diga un contrato escrito',
      h('ul', { class: 'lista-guia' }, ...doc.requisitos.map((r) => h('li', {}, r))),
      h('p', { class: 'ayuda' },
        'CST artículo 39. El contrato a término fijo y el de aprendizaje deben constar por escrito; '
        + 'el indefinido puede ser verbal, pero por escrito evita discusiones.')));
}

function bloqueFirma(f) {
  return h('div', { class: 'firma' },
    h('div', { class: 'firma-linea' }),
    h('strong', {}, f.titulo),
    f.nombre ? h('p', {}, f.nombre) : h('p', {}, ' '),
    f.documento ? h('p', {}, f.documento) : null,
    f.detalle ? h('p', { class: 'norma' }, f.detalle) : null);
}

function romano(n) {
  const tabla = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let resto = n;
  let salida = '';
  for (const [valor, letra] of tabla) {
    while (resto >= valor) { salida += letra; resto -= valor; }
  }
  return salida;
}

function aTexto(doc) {
  const lineas = [doc.titulo, ''];
  for (const [etiqueta, valor] of doc.encabezado) lineas.push(`${etiqueta}: ${valor}`);
  lineas.push('', 'Entre las partes identificadas arriba se ha celebrado el presente contrato individual de trabajo, '
    + 'que se regirá por las siguientes cláusulas y, en lo no previsto, por el Código Sustantivo del Trabajo:', '');
  doc.clausulas.forEach((c, i) => {
    lineas.push(`${romano(i + 1)}. ${c.titulo.toUpperCase()}`);
    for (const p of c.parrafos) lineas.push(p, '');
  });
  lineas.push(doc.firmas.texto, '', '', '______________________________', doc.firmas.empleador.titulo,
    doc.firmas.empleador.nombre, doc.firmas.empleador.documento, '', '',
    '______________________________', doc.firmas.trabajador.titulo,
    doc.firmas.trabajador.nombre, doc.firmas.trabajador.documento);
  return lineas.join('\n');
}
