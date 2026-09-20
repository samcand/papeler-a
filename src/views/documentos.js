/**
 * documentos.js (vista) — Las cartas y constancias, listas para firmar,
 * con su huella de verificación.
 */

import {
  h, tarjeta, tabla, campo, entrada, seleccion, boton, mensaje, aviso, vacio,
  formatoCorto, formatoLargo, hoy, imprimir, descargar, modal, confirmar, chip,
} from '../ui.js';
import { CATALOGO, tipoDocumento, generarDocumento, aTexto } from '../documentos.js';
import { sellar, verificar, hojaDeVerificacion } from '../firma.js';
import * as calc from '../calculo.js';

export function vista(store, params = {}) {
  const contratos = store.contratos();
  if (!contratos.length) {
    return h('div', { class: 'vista' }, tarjeta('Documentos',
      vacio('Primero crea un empleado con contrato.',
        boton('Ir a Empleados', () => { window.location.hash = '#/empleados'; }, 'primario'))));
  }

  const contrato = store.contrato(params.id) || contratos[0];
  const empleado = store.empleado(contrato.empleadoId) || {};
  const empresa = store.estado.empresa;
  const contenedor = h('div', { class: 'vista' });

  const estado = {
    tipo: params.mes || 'preaviso',
    datos: {
      fecha: hoy(),
      ciudad: empresa.ciudad || '',
      representante: empresa.representante || '',
      documentoRepresentante: empresa.documentoRepresentante || '',
      cambios: [{ concepto: '', antes: '', despues: '', desde: '' }],
      elementos: ['Un (1) uniforme de dos piezas', 'Un (1) par de zapatos de trabajo'],
      anio: Number(hoy().slice(0, 4)) - 1,
      valores: {},
    },
  };

  const salida = h('div');
  const formulario = h('div');
  const recalcular = () => {
    pintarFormulario();
    salida.replaceChildren(documentoGenerado(store, { contrato, empleado, empresa, estado }));
  };

  contenedor.append(h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Documentos'),
      h('p', { class: 'ayuda' }, empleado.nombre || '', ' · ', empleado.cargo || '')),
    seleccion(contratos.map((c) => {
      const e = store.empleado(c.empleadoId);
      return { value: c.id, label: e ? e.nombre : c.id };
    }), contrato.id, { onChange: (e) => { window.location.hash = `#/documentos/${e.target.value}`; } })));

  // Catálogo por grupos
  const grupos = [...new Set(CATALOGO.map((d) => d.grupo))];
  contenedor.append(tarjeta('¿Qué necesitas?',
    ...grupos.map((g) => h('div', { class: 'grupo-docs' },
      h('h3', {}, g),
      h('div', { class: 'chips' }, ...CATALOGO.filter((d) => d.grupo === g).map((d) => h('button', {
        type: 'button',
        class: `chip-boton ${d.id === estado.tipo ? 'activo' : ''}`.trim(),
        onClick: () => { estado.tipo = d.id; recalcular(); },
      }, d.nombre, d.norma ? h('small', { class: 'norma' }, ` ${d.norma}`) : null))))),
  ));

  contenedor.append(tarjeta('Datos del documento', formulario));
  contenedor.append(salida);
  contenedor.append(historial(store, contrato, empleado));
  recalcular();

  function pintarFormulario() {
    const d = estado.datos;
    const set = (k, numero = false) => (e) => { d[k] = numero ? Number(e.target.value) || 0 : e.target.value; recalcular(); };
    const comunes = h('div', { class: 'rejilla rejilla-3' },
      campo('Ciudad', entrada({ value: d.ciudad, onInput: set('ciudad') })),
      campo('Fecha', entrada({ type: 'date', value: d.fecha, onInput: set('fecha') })),
      campo('Quien firma por la empresa', entrada({ value: d.representante, onInput: set('representante') })));

    const especificos = [];
    switch (estado.tipo) {
      case 'otrosi':
        especificos.push(
          h('h3', {}, 'Qué cambia'),
          ...d.cambios.map((c, i) => h('div', { class: 'rejilla rejilla-4' },
            campo('Concepto', entrada({ value: c.concepto, placeholder: 'Salario, cargo, horario…', onInput: (e) => { c.concepto = e.target.value; recalcular(); } })),
            campo('Antes', entrada({ value: c.antes, onInput: (e) => { c.antes = e.target.value; recalcular(); } })),
            campo('Después', entrada({ value: c.despues, onInput: (e) => { c.despues = e.target.value; recalcular(); } })),
            campo('Desde', entrada({ type: 'date', value: c.desde, onInput: (e) => { c.desde = e.target.value; recalcular(); } })))),
          h('div', { class: 'acciones' },
            boton('+ Otro cambio', () => { d.cambios.push({ concepto: '', antes: '', despues: '', desde: '' }); recalcular(); })),
          campo('¿El cambio desmejora al trabajador?', seleccion([
            { value: '', label: 'No' }, { value: '1', label: 'Sí' },
          ], d.desmejora ? '1' : '', { onChange: (e) => { d.desmejora = !!e.target.value; recalcular(); } })));
        break;
      case 'preaviso':
        especificos.push(campo('Vencimiento del contrato',
          entrada({ type: 'date', value: contrato.fin || d.vencimiento || '', onInput: set('vencimiento') }),
          'Se toma del contrato si ya está registrado. El aviso va con 30 días de anticipación.'));
        break;
      case 'llamado':
      case 'descargos':
        especificos.push(
          campo('Hechos', entrada({ value: d.hechos || '', onInput: set('hechos') }),
            'Concretos: qué pasó, cuándo y dónde. De esto depende que el documento sirva.'),
          h('div', { class: 'rejilla rejilla-3' },
            campo('Fecha de los hechos', entrada({ type: 'date', value: d.fechaHechos || '', onInput: set('fechaHechos') })),
            estado.tipo === 'descargos' ? campo('Fecha de la diligencia', entrada({ type: 'date', value: d.fechaDiligencia || '', onInput: set('fechaDiligencia') })) : null,
            estado.tipo === 'descargos' ? campo('Hora', entrada({ type: 'time', value: d.hora || '', onInput: set('hora') })) : null),
          estado.tipo === 'descargos' ? campo('Lugar', entrada({ value: d.lugar || '', onInput: set('lugar') })) : null);
        break;
      case 'terminacion-justa':
        especificos.push(
          campo('Hechos', entrada({ value: d.hechos || '', onInput: set('hechos') }),
            'Hay que expresarlos: después no se pueden alegar causales distintas (CST art. 62).'),
          h('div', { class: 'rejilla rejilla-3' },
            campo('Causal del artículo 62', entrada({ value: d.causal || '', placeholder: 'numeral 4, literal a)', onInput: set('causal') })),
            campo('Fecha de terminación', entrada({ type: 'date', value: d.fechaTerminacion || '', onInput: set('fechaTerminacion') })),
            campo('¿Hubo descargos?', seleccion([
              { value: '', label: 'No' }, { value: '1', label: 'Sí' },
            ], d.huboDescargos ? '1' : '', { onChange: (e) => { d.huboDescargos = !!e.target.value; recalcular(); } }))),
          d.huboDescargos ? campo('Fecha de los descargos', entrada({ type: 'date', value: d.fechaDescargos || '', onInput: set('fechaDescargos') })) : null);
        break;
      case 'terminacion-sin-justa':
        especificos.push(h('div', { class: 'rejilla rejilla-2' },
          campo('Fecha de terminación', entrada({ type: 'date', value: d.fechaTerminacion || '', onInput: set('fechaTerminacion') })),
          campo('Valor de la indemnización', entrada({ type: 'number', step: 1000, value: d.valorIndemnizacion || '', onInput: set('valorIndemnizacion', true) }),
            h('span', {}, 'Lo calcula la pantalla de ', h('a', { href: `#/liquidacion/${contrato.id}` }, 'Liquidación'), '.'))));
        break;
      case 'acepta-renuncia':
        especificos.push(h('div', { class: 'rejilla rejilla-2' },
          campo('Fecha de la carta de renuncia', entrada({ type: 'date', value: d.fechaRenuncia || '', onInput: set('fechaRenuncia') })),
          campo('Último día de trabajo', entrada({ type: 'date', value: d.fechaTerminacion || '', onInput: set('fechaTerminacion') }))));
        break;
      case 'autorizacion-descuento':
        especificos.push(
          campo('Concepto', entrada({ value: d.concepto || '', onInput: set('concepto') })),
          h('div', { class: 'rejilla rejilla-3' },
            campo('Valor total', entrada({ type: 'number', step: 1000, value: d.valor || '', onInput: set('valor', true) })),
            campo('Número de cuotas', entrada({ type: 'number', min: 1, value: d.cuotas || 1, onInput: set('cuotas', true) })),
            campo('Desde', entrada({ type: 'date', value: d.desde || '', onInput: set('desde') }))));
        break;
      case 'autorizacion-datos':
        especificos.push(
          campo('Datos sensibles (si los hay)', entrada({ value: d.datosSensibles || '', placeholder: 'huella dactilar, fotografía, datos de salud', onInput: set('datosSensibles') }),
            'Los datos biométricos son sensibles: autorización previa, expresa e informada, y se borran al terminar el contrato.'),
          campo('Canal de contacto', entrada({ value: d.contacto || '', onInput: set('contacto') })));
        break;
      case 'dotacion':
        especificos.push(
          campo('Entrega', seleccion([
            { value: 'abril (30 de abril)', label: 'Primera: 30 de abril' },
            { value: 'agosto (31 de agosto)', label: 'Segunda: 31 de agosto' },
            { value: 'diciembre (20 de diciembre)', label: 'Tercera: 20 de diciembre' },
          ], d.entrega || '', { onChange: set('entrega') })),
          h('h3', {}, 'Elementos entregados'),
          ...d.elementos.map((el, i) => campo(`Elemento ${i + 1}`, entrada({
            value: el, onInput: (e) => { d.elementos[i] = e.target.value; recalcular(); },
          }))),
          h('div', { class: 'acciones' }, boton('+ Otro elemento', () => { d.elementos.push(''); recalcular(); })));
        break;
      case 'certificado-laboral':
        especificos.push(h('div', { class: 'rejilla rejilla-2' },
          campo('¿Incluir el salario?', seleccion([
            { value: '', label: 'No' }, { value: '1', label: 'Sí' },
          ], d.incluirSalario ? '1' : '', { onChange: (e) => { d.incluirSalario = !!e.target.value; recalcular(); } }),
          'Muchas entidades lo piden; inclúyelo solo si el trabajador lo autoriza.'),
          campo('¿Incluir funciones?', seleccion([
            { value: '', label: 'No' }, { value: '1', label: 'Sí' },
          ], d.incluirFunciones ? '1' : '', { onChange: (e) => { d.incluirFunciones = !!e.target.value; recalcular(); } }))));
        break;
      case 'certificado-220': {
        const anio = d.anio;
        especificos.push(
          h('div', { class: 'rejilla rejilla-2' },
            campo('Año gravable', entrada({ type: 'number', value: anio, onInput: set('anio', true) })),
            h('div', { class: 'acciones' }, boton('Tomar los valores de las nóminas registradas', () => {
              d.valores = valoresDelAnio(store, contrato.id, d.anio);
              mensaje('Valores tomados de las nóminas del año.');
              recalcular();
            }, 'primario'))),
          h('div', { class: 'rejilla rejilla-3' },
            ...[['salarios', 'Pagos por salarios'], ['cesantias', 'Cesantías e intereses pagados'],
              ['otros', 'Otros pagos'], ['salud', 'Aportes a salud'], ['pension', 'Aportes a pensión y FSP'],
              ['retencion', 'Retención practicada']].map(([k, etiqueta]) => campo(etiqueta, entrada({
              type: 'number', step: 1000, value: d.valores[k] || 0,
              onInput: (e) => { d.valores = { ...d.valores, [k]: Number(e.target.value) || 0 }; recalcular(); },
            })))));
        break;
      }
      case 'paz-salvo':
        especificos.push(h('div', { class: 'rejilla rejilla-2' },
          campo('Fecha de terminación', entrada({ type: 'date', value: d.fechaTerminacion || '', onInput: set('fechaTerminacion') })),
          campo('Observaciones', entrada({ value: d.observaciones || '', onInput: set('observaciones') }))));
        break;
      default:
        break;
    }

    formulario.replaceChildren(...[comunes, ...especificos].filter(Boolean));
  }

  return contenedor;
}

function documentoGenerado(store, { contrato, empleado, empresa, estado }) {
  const doc = generarDocumento({
    tipo: estado.tipo, empresa, empleado, contrato, datos: estado.datos,
  });
  const texto = aTexto(doc);

  const hoja = h('div', { class: 'carta' },
    ...doc.encabezado.map((l) => h('p', { class: 'carta-encabezado' }, l)),
    h('p', { class: 'carta-asunto' }, `Asunto: ${doc.asunto}`),
    ...doc.cuerpo.map((p) => h('p', {}, p)),
    doc.meta && doc.meta.length
      ? tabla([{ titulo: 'Concepto' }, { titulo: 'Valor', clase: 'num' }], doc.meta.map(([k, v]) => ({ celdas: [k, v] })))
      : null,
    doc.cierre ? h('p', { class: 'carta-cierre' }, doc.cierre) : null,
    h('div', { class: 'firmas' }, ...doc.firmas.map((f) => h('div', { class: 'firma' },
      h('div', { class: 'firma-linea' }),
      h('strong', {}, f.rol),
      h('p', {}, f.nombre || ' '),
      f.documento ? h('p', {}, f.documento) : null,
      f.detalle ? h('p', { class: 'norma' }, f.detalle) : null))),
    doc.norma ? h('p', { class: 'norma' }, `Fundamento: ${doc.norma}`) : null);

  return h('div', {},
    doc.avisos.length ? tarjeta('Revisa antes de imprimir', ...doc.avisos.map((a) => aviso(a, 'alerta'))) : null,
    tarjeta('',
      h('div', { class: 'acciones acciones-envueltas' },
        boton('Imprimir', () => imprimir(doc.titulo, hoja), 'primario'),
        boton('Descargar texto', () => descargar(`${estado.tipo}-${empleado.documento || 'doc'}.txt`, texto, 'text/plain')),
        boton('Firmar y archivar', () => firmar(store, { contrato, empleado, doc, texto, tipo: estado.tipo, datos: estado.datos }), 'primario')),
      hoja));
}

async function firmar(store, { contrato, empleado, doc, texto, tipo, datos }) {
  const firmantes = doc.firmas.map((f) => ({ rol: f.rol, nombre: f.nombre, documento: f.documento, metodo: 'aceptación en la app' }));
  const metodo = { valor: 'aceptacion' };

  const cuerpo = h('div', { class: 'formulario' },
    h('p', {}, 'Se guarda el texto exacto y su huella digital (SHA-256). Después se puede comprobar que el documento no cambió.'),
    campo('Cómo se firma', seleccion([
      { value: 'aceptacion', label: 'Aceptación en la app (firma electrónica)' },
      { value: 'manuscrita', label: 'Impreso y firmado a mano' },
    ], metodo.valor, { onChange: (e) => { metodo.valor = e.target.value; } })),
    h('p', { class: 'ayuda' },
      'La ley no exige una tecnología concreta: pide que la firma sea confiable para el fin y que se pueda verificar '
      + 'quién firmó y que el texto no cambió (Ley 527 de 1999 art. 7 y Decreto 2364 de 2012).'));

  const dlg = modal('Firmar y archivar', cuerpo, [
    boton('Cancelar', () => dlg.cerrar()),
    boton('Firmar', async () => {
      const sello = await sellar({
        texto,
        documentoId: `${tipo}-${contrato.id}`,
        firmantes: firmantes.map((f) => ({
          ...f,
          metodo: metodo.valor === 'manuscrita' ? 'firma manuscrita sobre el documento impreso' : 'aceptación en la app',
        })),
      });
      store.guardarDocumento({
        contratoId: contrato.id, tipo, titulo: doc.titulo, fecha: datos.fecha, texto, sello, datos,
      });
      dlg.cerrar();
      mensaje(`Documento archivado. Código ${sello.codigo}`);
    }, 'primario'),
  ]);
}

function historial(store, contrato, empleado) {
  const docs = store.documentos(contrato.id);
  if (!docs.length) {
    return tarjeta('Expediente', h('p', { class: 'ayuda' },
      'Aquí van quedando los documentos firmados de este trabajador, con su huella de verificación.'));
  }
  return tarjeta(`Expediente de ${empleado.nombre || ''} (${docs.length})`,
    tabla([{ titulo: 'Fecha' }, { titulo: 'Documento' }, { titulo: 'Código' }, { titulo: '' }],
      docs.map((d) => ({
        celdas: [
          formatoCorto(d.fecha || d.creado.slice(0, 10)),
          h('div', {}, h('strong', {}, tipoDocumento(d.tipo).nombre),
            h('p', { class: 'norma' }, d.titulo)),
          d.sello ? chip(d.sello.codigo, 'ok') : chip('Sin firma', 'gris'),
          h('div', { class: 'acciones' },
            boton('Ver', () => verDocumento(d)),
            boton('Verificar', () => verificarDocumento(d)),
            boton('Borrar', () => {
              if (confirmar('¿Borrar este documento del expediente?')) store.borrarDocumento(d.id);
            }, 'peligro')),
        ],
      }))));
}

function verDocumento(d) {
  const hoja = h('div', { class: 'carta' },
    ...d.texto.split('\n').map((l) => h('p', {}, l || ' ')),
    d.sello ? h('div', { class: 'verificacion' },
      h('h3', {}, 'Hoja de verificación'),
      tabla([{ titulo: 'Dato' }, { titulo: 'Contenido' }],
        hojaDeVerificacion(d.sello).map(([k, v]) => ({ celdas: [k, v] })))) : null);
  const dlg = modal(d.titulo, hoja, [
    boton('Imprimir', () => imprimir(d.titulo, hoja), 'primario'),
    boton('Cerrar', () => dlg.cerrar()),
  ]);
}

async function verificarDocumento(d) {
  const r = await verificar({ texto: d.texto, sello: d.sello });
  modal('Verificación del documento', h('div', {},
    aviso(r.motivo, r.valido ? 'info' : 'error'),
    d.sello ? tabla([{ titulo: 'Dato' }, { titulo: 'Contenido' }],
      hojaDeVerificacion(d.sello).map(([k, v]) => ({ celdas: [k, v] }))) : null),
  [boton('Cerrar', () => document.querySelector('.modal-fondo')?.remove(), 'primario')]);
}

function valoresDelAnio(store, contratoId, anio) {
  const nominas = store.nominas(contratoId).filter((n) => n.hasta.startsWith(String(anio)));
  const suma = (fn) => nominas.reduce((s, n) => s + fn(n), 0);
  const porConcepto = (regex) => suma((n) => (n.devengados || [])
    .filter((d) => regex.test(d.concepto)).reduce((x, d) => x + d.valor, 0));
  const deduccion = (regex) => suma((n) => (n.deducciones || [])
    .filter((d) => regex.test(d.concepto)).reduce((x, d) => x + d.valor, 0));
  return {
    salarios: Math.round(porConcepto(/Salario|Jornales|Horas ordinarias|extra|Recargo|descanso|Comisiones|Bonificaciones|Vacaciones/i)),
    cesantias: 0,
    otros: Math.round(porConcepto(/Auxilio|Incapacidad|Licencias|no salariales/i)),
    salud: Math.round(deduccion(/salud/i)),
    pension: Math.round(deduccion(/pensión|solidaridad/i)),
    retencion: Math.round(deduccion(/Retención/i)),
  };
}
