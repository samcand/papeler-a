/**
 * empleados.js — Empleados y sus contratos.
 */

import {
  h, tarjeta, tabla, campo, entrada, seleccion, boton, pesos, chip, aviso,
  mensaje, confirmar, vacio, formatoCorto, hoy, modal,
} from '../ui.js';
import { dias360 } from '../fechas.js';
import * as calc from '../calculo.js';
import * as ley from '../normativa.js';

const TIPOS_DOC = ['CC', 'CE', 'PEP', 'PPT', 'TI', 'Pasaporte', 'NIT'];

export function vista(store, params = {}) {
  const contenedor = h('div', { class: 'vista' });
  const seleccionado = params.id ? store.empleado(params.id) : null;

  contenedor.append(h('div', { class: 'barra' },
    h('h1', {}, 'Empleados'),
    boton('+ Nuevo empleado', () => abrirFormularioEmpleado(store, null), 'primario')));

  const empleados = store.empleados();
  if (!empleados.length) {
    contenedor.append(tarjeta('', vacio('Aún no hay empleados registrados.',
      boton('Crear el primero', () => abrirFormularioEmpleado(store, null), 'primario'))));
    return contenedor;
  }

  for (const emp of empleados) {
    const contratos = store.contratos(emp.id);
    const activo = contratos.find((c) => c.estado !== 'terminado');
    contenedor.append(tarjeta('',
      h('div', { class: 'barra' },
        h('div', {},
          h('h2', {}, emp.nombre, ' ', activo ? chip('Activo', 'ok') : chip('Sin contrato activo', 'gris')),
          h('p', { class: 'ayuda' },
            `${emp.tipoDocumento || 'CC'} ${emp.documento || '—'} · ${emp.cargo || 'Sin cargo'}`,
            emp.eps ? ` · EPS ${emp.eps}` : '', emp.afp ? ` · AFP ${emp.afp}` : '')),
        h('div', { class: 'acciones' },
          boton('Editar', () => abrirFormularioEmpleado(store, emp)),
          boton('+ Contrato', () => abrirFormularioContrato(store, emp, null)),
          boton('Borrar', () => {
            if (confirmar(`¿Borrar a ${emp.nombre} y todos sus contratos y registros?`)) {
              store.borrarEmpleado(emp.id);
              mensaje('Empleado borrado.');
            }
          }, 'peligro'))),
      contratos.length
        ? tabla([
          { titulo: 'Tipo' }, { titulo: 'Desde' }, { titulo: 'Hasta' }, { titulo: 'Modalidad' },
          { titulo: 'Remuneración', clase: 'num' }, { titulo: 'Estado' }, { titulo: '', clase: 'num' },
        ], contratos.map((c) => ({
          celdas: [
            (ley.CONTRATOS.find((t) => t.id === c.tipo) || {}).nombre || c.tipo,
            formatoCorto(c.inicio),
            c.fin ? formatoCorto(c.fin) : '—',
            (calc.MODALIDADES.find((m) => m.id === c.modalidad) || {}).nombre || c.modalidad,
            remuneracion(c),
            c.estado === 'terminado' ? chip('Terminado', 'gris') : chip('Vigente', 'ok'),
            h('div', { class: 'acciones' },
              boton('Contrato', () => { window.location.hash = `#/contrato/${c.id}`; }),
              boton('Días', () => { window.location.hash = `#/registro/${c.id}`; }),
              boton('Nómina', () => { window.location.hash = `#/nomina/${c.id}`; }),
              boton('Editar', () => abrirFormularioContrato(store, emp, c)),
              boton('Liquidar', () => { window.location.hash = `#/liquidacion/${c.id}`; }, 'primario')),
          ],
        })))
        : h('p', { class: 'ayuda' }, 'Sin contratos. Agrega uno para poder liquidar nómina.'),
      activo ? avisosContrato(activo) : null));
  }

  if (seleccionado) contenedor.scrollIntoView?.();
  return contenedor;
}

function remuneracion(c) {
  if (c.modalidad === 'jornal') return `${pesos(c.valorDia)} / día`;
  if (c.modalidad === 'horas') return `${pesos(c.valorHora)} / hora`;
  return `${pesos(c.salario)} / mes`;
}

function avisosContrato(c) {
  const salida = [];
  const fecha = hoy();
  const salario = calc.salarioMensualEquivalente(c, fecha);
  const minimo = ley.smmlv(fecha);
  if (salario < minimo && !c.tiempoParcial) {
    salida.push(aviso(`El salario mensual (${pesos(salario)}) está por debajo del mínimo legal (${pesos(minimo)}). Solo es válido si el trabajo es de tiempo parcial y proporcional.`, 'alerta'));
  }
  if (c.salarioIntegral && salario < ley.minimoIntegral(fecha)) {
    salida.push(aviso(`El salario integral no puede ser menor a 13 salarios mínimos (${pesos(ley.minimoIntegral(fecha))}).`, 'error'));
  }
  if (c.tipo === 'fijo' && c.fin && dias360(c.inicio, c.fin) / 360 > 4) {
    salida.push(aviso('Un contrato a término fijo no puede pasar de 4 años en total (Ley 2466 de 2025).', 'error'));
  }
  if (c.tipo === 'aprendizaje') {
    salida.push(aviso('Contrato de aprendizaje: con la Ley 2466 de 2025 es un contrato laboral especial. Verifica la reglamentación vigente antes de liquidar los aportes de la etapa lectiva.', 'info'));
  }
  return salida.length ? h('div', {}, ...salida) : null;
}

function abrirFormularioEmpleado(store, empleado) {
  const datos = { ...(empleado || {}) };
  const set = (k) => (e) => { datos[k] = e.target.value; };

  const cuerpo = h('div', { class: 'formulario' },
    campo('Nombre completo', entrada({ value: datos.nombre || '', onInput: set('nombre'), required: true })),
    h('div', { class: 'rejilla rejilla-2' },
      campo('Tipo de documento', seleccion(TIPOS_DOC, datos.tipoDocumento || 'CC', { onChange: set('tipoDocumento') })),
      campo('Número de documento', entrada({ value: datos.documento || '', onInput: set('documento') }))),
    campo('Cargo', entrada({ value: datos.cargo || '', onInput: set('cargo') })),
    h('div', { class: 'rejilla rejilla-2' },
      campo('EPS', entrada({ value: datos.eps || '', onInput: set('eps') })),
      campo('Fondo de pensiones', entrada({ value: datos.afp || '', onInput: set('afp') }))),
    h('div', { class: 'rejilla rejilla-2' },
      campo('Fondo de cesantías', entrada({ value: datos.cesantias || '', onInput: set('cesantias') })),
      campo('Caja de compensación', entrada({ value: datos.ccf || '', onInput: set('ccf') }))),
    h('div', { class: 'rejilla rejilla-2' },
      campo('Teléfono', entrada({ value: datos.telefono || '', onInput: set('telefono') })),
      campo('Correo', entrada({ type: 'email', value: datos.correo || '', onInput: set('correo') }))),
    campo('Cuenta para el pago', entrada({ value: datos.cuenta || '', onInput: set('cuenta') }, ), 'Banco y número, o "efectivo".'),
  );

  const dlg = modal(empleado ? 'Editar empleado' : 'Nuevo empleado', cuerpo, [
    boton('Cancelar', () => dlg.cerrar()),
    boton('Guardar', () => {
      if (!datos.nombre) { mensaje('El nombre es obligatorio.', 'error'); return; }
      store.guardarEmpleado(datos);
      dlg.cerrar();
      mensaje('Empleado guardado.');
    }, 'primario'),
  ]);
}

function abrirFormularioContrato(store, empleado, contrato) {
  const datos = {
    tipo: 'indefinido', modalidad: 'mensual', inicio: hoy(), diasSemana: 6,
    claseArl: store.estado.empresa.claseArl || 'I', nivelArl: 'media',
    empleadoId: empleado.id, auxilioTransporte: true,
    ...(contrato || {}),
  };
  const set = (k, num = false) => (e) => {
    datos[k] = num ? Number(e.target.value) || 0 : e.target.value;
    if (k === 'modalidad' || k === 'tipo') refrescar();
  };

  const cuerpo = h('div', { class: 'formulario' });
  const refrescar = () => {
    const piezas = [
      h('div', { class: 'rejilla rejilla-2' },
        campo('Tipo de contrato', seleccion(ley.CONTRATOS.map((c) => ({ value: c.id, label: c.nombre })), datos.tipo, { onChange: set('tipo') }),
          (ley.CONTRATOS.find((c) => c.id === datos.tipo) || {}).nota),
        campo('Forma de pago', seleccion(calc.MODALIDADES.map((m) => ({ value: m.id, label: m.nombre })), datos.modalidad, { onChange: set('modalidad') }),
          (calc.MODALIDADES.find((m) => m.id === datos.modalidad) || {}).nota)),
      h('div', { class: 'rejilla rejilla-2' },
        campo('Fecha de inicio', entrada({ type: 'date', value: datos.inicio || '', onInput: set('inicio') })),
        campo(datos.tipo === 'fijo' ? 'Fecha de vencimiento' : 'Fecha de terminación prevista',
          entrada({ type: 'date', value: datos.fin || '', onInput: set('fin') }),
          datos.tipo === 'fijo' ? 'Máximo 4 años en total, con preaviso de 30 días para no prorrogar.' : 'Opcional.')),
      datos.modalidad === 'mensual'
        ? campo('Salario mensual', entrada({ type: 'number', min: 0, step: 1000, value: datos.salario || '', onInput: set('salario', true) }),
          `Mínimo legal ${pesos(ley.smmlv(datos.inicio || hoy()))}.`)
        : datos.modalidad === 'jornal'
          ? campo('Valor del día (jornal)', entrada({ type: 'number', min: 0, step: 1000, value: datos.valorDia || '', onInput: set('valorDia', true) }),
            `El día mínimo es ${pesos(ley.smmlv(datos.inicio || hoy()) / 30)}. Además hay que pagar el descanso dominical y los festivos de las semanas completas (CST art. 173).`)
          : campo('Valor de la hora', entrada({ type: 'number', min: 0, step: 100, value: datos.valorHora || '', onInput: set('valorHora', true) }),
            `Hora mínima de referencia: ${pesos(ley.smmlv(datos.inicio || hoy()) / ley.jornada(datos.inicio || hoy()).divisor)}.`),
      h('div', { class: 'rejilla rejilla-3' },
        campo('Días a la semana', entrada({ type: 'number', min: 1, max: 7, value: datos.diasSemana || 6, onInput: set('diasSemana', true) })),
        campo('Horas ordinarias al día', entrada({ type: 'number', min: 1, max: 10, step: 0.5, value: datos.horasDiarias || '', onInput: set('horasDiarias', true) }),
          `Si lo dejas vacío se usa la jornada legal (${ley.jornada(datos.inicio || hoy()).horasSemana} h ÷ ${datos.diasSemana || 6} días).`),
        campo('Día de descanso', seleccion(
          [{ value: 0, label: 'Domingo' }, { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' },
            { value: 3, label: 'Miércoles' }, { value: 4, label: 'Jueves' }, { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' }],
          datos.diaDescanso ?? 0, { onChange: set('diaDescanso', true) }),
        'La Ley 2466 de 2025 permite pactar un día distinto al domingo.')),
      h('div', { class: 'rejilla rejilla-3' },
        campo('Clase de riesgo ARL', seleccion(ley.ARL.map((a) => ({ value: a.clase, label: `Clase ${a.clase}` })), datos.claseArl, { onChange: set('claseArl') }),
          (ley.ARL.find((a) => a.clase === datos.claseArl) || {}).ejemplo),
        campo('Nivel de la tarifa', seleccion([
          { value: 'minima', label: 'Mínima' }, { value: 'media', label: 'Media' }, { value: 'maxima', label: 'Máxima' },
        ], datos.nivelArl, { onChange: set('nivelArl') })),
        campo('Divisor de horas', seleccion([
          { value: 'auto', label: `Automático (${ley.jornada(datos.inicio || hoy()).divisor})` },
          { value: 240, label: '240 (jornada de 48 h)' }, { value: 230, label: '230 (46 h)' },
          { value: 220, label: '220 (44 h)' }, { value: 210, label: '210 (42 h)' },
        ], datos.divisorHoras || 'auto', { onChange: set('divisorHoras') }),
        'Con qué se divide el sueldo para sacar la hora ordinaria.')),
      h('div', { class: 'rejilla rejilla-2' },
        campo('Salario integral', seleccion([{ value: '', label: 'No' }, { value: '1', label: 'Sí' }], datos.salarioIntegral ? '1' : '', {
          onChange: (e) => { datos.salarioIntegral = !!e.target.value; refrescar(); },
        }), `Solo desde 13 salarios mínimos (${pesos(ley.minimoIntegral(datos.inicio || hoy()))}). Cotiza sobre el 70 %.`),
        campo('Auxilio de transporte', seleccion([{ value: '1', label: 'Sí, si tiene derecho' }, { value: '', label: 'No' }], datos.auxilioTransporte ? '1' : '', {
          onChange: (e) => { datos.auxilioTransporte = !!e.target.value; },
        }), `Se paga hasta 2 salarios mínimos (${pesos(2 * ley.smmlv(datos.inicio || hoy()))}).`)),
      h('div', { class: 'rejilla rejilla-2' },
        campo('Vacaciones ya disfrutadas (días)', entrada({ type: 'number', min: 0, step: 0.5, value: datos.diasVacacionesDisfrutados || 0, onInput: set('diasVacacionesDisfrutados', true) })),
        campo('Cesantías consignadas hasta', entrada({ type: 'date', value: datos.cesantiasPagadasHasta || '', onInput: set('cesantiasPagadasHasta') }),
          'Normalmente el 31 de diciembre del año pasado.')),
      contrato ? campo('Estado', seleccion([
        { value: 'activo', label: 'Vigente' }, { value: 'terminado', label: 'Terminado' },
      ], datos.estado || 'activo', { onChange: set('estado') })) : null,
    ];
    // replaceChildren escribe "null" si le pasan un null: hay que filtrarlos.
    cuerpo.replaceChildren(...piezas.filter(Boolean));
  };
  refrescar();

  const dlg = modal(contrato ? 'Editar contrato' : `Nuevo contrato de ${empleado.nombre}`, cuerpo, [
    boton('Cancelar', () => dlg.cerrar()),
    contrato ? boton('Borrar', () => {
      if (confirmar('¿Borrar el contrato y sus registros de días?')) {
        store.borrarContrato(contrato.id); dlg.cerrar(); mensaje('Contrato borrado.');
      }
    }, 'peligro') : null,
    boton('Guardar', () => {
      if (!datos.inicio) { mensaje('Falta la fecha de inicio.', 'error'); return; }
      const remun = datos.modalidad === 'mensual' ? datos.salario : datos.modalidad === 'jornal' ? datos.valorDia : datos.valorHora;
      if (!remun) { mensaje('Falta el valor de la remuneración.', 'error'); return; }
      store.guardarContrato(datos);
      dlg.cerrar();
      mensaje('Contrato guardado.');
    }, 'primario'),
  ]);
}
