/**
 * normativa.js (vista) — Qué dice la ley y con qué números liquida la app.
 * Cada cifra con su norma y su enlace oficial, para poder verificarla.
 */

import { h, tarjeta, tabla, chip, pesos, porcentaje, numero, formatoCorto, formatoLargo, hoy, seleccion, campo } from '../ui.js';
import * as ley from '../normativa.js';

export function vista(store) {
  const contenedor = h('div', { class: 'vista' });
  const fecha = hoy();

  contenedor.append(h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Normativa vigente'),
      h('p', { class: 'ayuda' }, `Datos verificados el ${formatoLargo(ley.VERIFICADO_EL)}. Si la ley cambió después, actualiza la tabla en `,
        h('code', {}, 'nomina/src/normativa.js'), ' y deja constancia en la bitácora.'))));

  contenedor.append(tarjeta('Valores del año',
    tabla([
      { titulo: 'Año' }, { titulo: 'Salario mínimo', clase: 'num' }, { titulo: 'Día', clase: 'num' },
      { titulo: 'Hora', clase: 'num' }, { titulo: 'Auxilio de transporte', clase: 'num' },
      { titulo: 'UVT', clase: 'num' }, { titulo: 'Normas' },
    ], ley.ANUALES.slice().reverse().map((a) => ({
      clase: a.anio === Number(fecha.slice(0, 4)) ? 'destacado' : '',
      celdas: [
        String(a.anio),
        pesos(a.smmlv),
        pesos(a.smmlv / 30),
        pesos(a.smmlv / ley.jornada(`${a.anio}-12-31`).divisor),
        pesos(a.auxilioTransporte),
        pesos(a.uvt),
        h('span', { class: 'norma' }, `${a.normaSalario} · ${a.normaAuxilio} · ${a.normaUvt}`),
      ],
    }))),
    h('p', { class: 'ayuda' }, 'El auxilio de transporte se paga a quien gane hasta 2 salarios mínimos y tenga que desplazarse. No es salario, pero sí entra a la base de prima y cesantías.')));

  contenedor.append(tarjeta('Jornada de trabajo',
    tabla([{ titulo: 'Desde' }, { titulo: 'Máximo semanal', clase: 'num' }, { titulo: 'Divisor mensual', clase: 'num' }, { titulo: 'Norma' }],
      ley.JORNADA.map((j) => ({
        clase: j.desde <= fecha && esUltimaVigente(ley.JORNADA, j, fecha) ? 'destacado' : '',
        celdas: [j.desde === '1900-01-01' ? 'Antes de 2023' : formatoCorto(j.desde), `${j.horasSemana} h`, String(j.divisor), h('span', { class: 'norma' }, j.norma)],
      }))),
    h('p', { class: 'ayuda' },
      'La Ley 2101 de 2021 bajó la jornada de 48 a 42 horas sin bajar el salario. El divisor es (horas de la semana ÷ 6) × 30: con 42 horas, la hora ordinaria vale más.'),
    tabla([{ titulo: 'Franja diurna' }, { titulo: 'Desde' }, { titulo: 'Norma' }],
      ley.NOCTURNIDAD.map((n) => ({
        clase: n.desde <= fecha && esUltimaVigente(ley.NOCTURNIDAD, n, fecha) ? 'destacado' : '',
        celdas: [`${n.inicioDiurna}:00 a ${n.finDiurna}:00 (nocturna de ${n.finDiurna}:00 a ${n.inicioDiurna}:00)`,
          n.desde === '1900-01-01' ? 'Antes de 2025' : formatoCorto(n.desde),
          h('span', { class: 'norma' }, n.norma)],
      })))));

  contenedor.append(tarjeta('Recargos y horas extra',
    tabla([{ titulo: 'Concepto' }, { titulo: 'Recargo', clase: 'num' }, { titulo: 'Factor de la hora', clase: 'num' }, { titulo: 'Norma' }], [
      { celdas: ['Recargo nocturno', porcentaje(ley.RECARGOS.nocturno, 0), '1,35', h('span', { class: 'norma' }, ley.RECARGOS.norma)] },
      { celdas: ['Hora extra diurna', porcentaje(ley.RECARGOS.extraDiurna, 0), '1,25', h('span', { class: 'norma' }, ley.RECARGOS.norma)] },
      { celdas: ['Hora extra nocturna', porcentaje(ley.RECARGOS.extraNocturna, 0), '1,75', h('span', { class: 'norma' }, ley.RECARGOS.norma)] },
      { celdas: ['Trabajo en día de descanso o festivo', porcentaje(ley.recargoDescanso(fecha).factor, 0),
        numero(1 + ley.recargoDescanso(fecha).factor, 2), h('span', { class: 'norma' }, ley.recargoDescanso(fecha).norma)] },
      { celdas: ['Hora extra diurna en día de descanso', '—',
        numero(1 + ley.recargoDescanso(fecha).factor + ley.RECARGOS.extraDiurna, 2), h('span', { class: 'norma' }, 'CST art. 168 y 179')] },
    ]),
    h('h3', {}, 'Gradualidad del recargo dominical y festivo'),
    tabla([{ titulo: 'Desde' }, { titulo: 'Recargo', clase: 'num' }, { titulo: 'Norma' }],
      ley.RECARGO_DESCANSO.map((r) => ({
        clase: r.desde <= fecha && esUltimaVigente(ley.RECARGO_DESCANSO, r, fecha) ? 'destacado' : '',
        celdas: [r.desde === '1900-01-01' ? 'Antes de julio de 2025' : formatoCorto(r.desde), porcentaje(r.factor, 0), h('span', { class: 'norma' }, r.norma)],
      }))),
    h('p', { class: 'ayuda' },
      `Máximo ${ley.TOPES_EXTRAS.diarias} horas extra al día y ${ley.TOPES_EXTRAS.semanales} a la semana (CST art. 167). `
      + 'Trabajar hasta 2 días de descanso al mes es ocasional; 3 o más, habitual.')));

  contenedor.append(tarjeta('Seguridad social y parafiscales',
    tabla([{ titulo: 'Aporte' }, { titulo: 'Trabajador', clase: 'num' }, { titulo: 'Empleador', clase: 'num' }, { titulo: 'Norma' }], [
      { celdas: ['Salud', porcentaje(ley.APORTES.salud.trabajador, 0), porcentaje(ley.APORTES.salud.empleador, 1), h('span', { class: 'norma' }, ley.APORTES.salud.norma)] },
      { celdas: ['Pensión', porcentaje(ley.APORTES.pension.trabajador, 0), porcentaje(ley.APORTES.pension.empleador, 0), h('span', { class: 'norma' }, ley.APORTES.pension.norma)] },
      { celdas: ['Caja de compensación', '—', porcentaje(ley.APORTES.parafiscales.caja, 0), h('span', { class: 'norma' }, 'Ley 21 de 1982')] },
      { celdas: ['ICBF', '—', porcentaje(ley.APORTES.parafiscales.icbf, 0), h('span', { class: 'norma' }, 'Ley 89 de 1988')] },
      { celdas: ['SENA', '—', porcentaje(ley.APORTES.parafiscales.sena, 0), h('span', { class: 'norma' }, 'Ley 119 de 1994')] },
    ]),
    h('p', { class: 'ayuda' },
      `Exoneración del artículo 114-1 del Estatuto Tributario: por los trabajadores que ganen menos de 10 salarios mínimos (${pesos(10 * ley.smmlv(fecha))}), `
      + 'el empleador no paga su 8,5 % de salud, ni SENA, ni ICBF. La caja de compensación siempre se paga.'),
    h('h3', {}, 'Fondo de solidaridad pensional (lo paga el trabajador)'),
    tabla([{ titulo: 'IBC en salarios mínimos' }, { titulo: 'Tarifa', clase: 'num' }],
      ley.FSP.map((f) => ({
        celdas: [f.hastaSmmlv === Infinity ? `Más de ${f.desdeSmmlv}` : `De ${f.desdeSmmlv} a ${f.hastaSmmlv}`, porcentaje(f.tarifa, 1)],
      }))),
    h('h3', {}, 'ARL por clase de riesgo'),
    tabla([{ titulo: 'Clase' }, { titulo: 'Mínima', clase: 'num' }, { titulo: 'Media', clase: 'num' }, { titulo: 'Máxima', clase: 'num' }, { titulo: 'Ejemplos' }],
      ley.ARL.map((a) => ({
        celdas: [a.clase, porcentaje(a.minima, 3), porcentaje(a.media, 3), porcentaje(a.maxima, 3), a.ejemplo],
      }))),
    h('p', { class: 'ayuda' }, `El IBC va de 1 salario mínimo (${pesos(ley.smmlv(fecha))}) a 25 (${pesos(25 * ley.smmlv(fecha))}). El salario integral cotiza sobre el 70 %.`)));

  contenedor.append(tarjeta('Prestaciones sociales',
    tabla([{ titulo: 'Prestación' }, { titulo: 'Cuánto' }, { titulo: 'Cuándo' }, { titulo: 'Norma' }], [
      { celdas: ['Prima de servicios', '30 días de salario al año', '15 días el 30 de junio y 15 días antes del 20 de diciembre', h('span', { class: 'norma' }, ley.PRESTACIONES.prima.norma)] },
      { celdas: ['Cesantías', '30 días de salario al año', 'Al fondo, antes del 15 de febrero del año siguiente', h('span', { class: 'norma' }, ley.PRESTACIONES.cesantias.norma)] },
      { celdas: ['Intereses sobre cesantías', '12 % anual', 'Al trabajador, antes del 31 de enero', h('span', { class: 'norma' }, ley.PRESTACIONES.intereses.norma)] },
      { celdas: ['Vacaciones', '15 días hábiles al año', 'Dentro del año siguiente a causarlas', h('span', { class: 'norma' }, ley.PRESTACIONES.vacaciones.norma)] },
      { celdas: ['Dotación', 'Un vestido y un par de zapatos, 3 veces al año', '30 de abril, 31 de agosto y 20 de diciembre', h('span', { class: 'norma' }, ley.PRESTACIONES.dotacion.norma)] },
    ]),
    h('p', { class: 'ayuda' },
      `La dotación es para quien gane hasta 2 salarios mínimos (${pesos(2 * ley.smmlv(fecha))}) y lleve más de 3 meses. `
      + 'La base de prima y cesantías incluye el auxilio de transporte; la de vacaciones, no.')));

  contenedor.append(tarjeta('Terminación del contrato',
    tabla([{ titulo: 'Caso' }, { titulo: 'Indemnización' }], [
      { celdas: [`Indefinido con salario menor a 10 salarios mínimos (${pesos(10 * ley.smmlv(fecha))})`, ley.INDEMNIZACION.indefinido[0].descripcion] },
      { celdas: ['Indefinido con salario de 10 salarios mínimos o más', ley.INDEMNIZACION.indefinido[1].descripcion] },
      { celdas: ['Término fijo', ley.INDEMNIZACION.fijo] },
      { celdas: ['Obra o labor', ley.INDEMNIZACION.obra] },
    ]),
    h('p', { class: 'ayuda' }, 'Si el pago de la liquidación se demora, el artículo 65 del CST impone un día de salario por cada día de mora, hasta 24 meses.'),
    h('h3', {}, 'Tipos de contrato'),
    tabla([{ titulo: 'Tipo' }, { titulo: 'Qué hay que saber' }],
      ley.CONTRATOS.map((c) => ({ celdas: [c.nombre, c.nota] })))));

  contenedor.append(tarjeta('Incapacidades y licencias',
    tabla([{ titulo: 'Situación' }, { titulo: 'Cuánto se paga' }, { titulo: 'Quién paga' }, { titulo: 'Norma' }], [
      { celdas: ['Enfermedad general, días 1 y 2', '66,67 % (nunca menos del mínimo)', 'Empleador', h('span', { class: 'norma' }, ley.AUSENCIAS.incapacidadComun.norma)] },
      { celdas: ['Enfermedad general, días 3 a 90', '66,67 %', 'EPS', h('span', { class: 'norma' }, ley.AUSENCIAS.incapacidadComun.norma)] },
      { celdas: ['Enfermedad general, días 91 a 180', '50 %', 'EPS', h('span', { class: 'norma' }, ley.AUSENCIAS.incapacidadComun.norma)] },
      { celdas: ['Accidente o enfermedad laboral', '100 %', 'ARL', h('span', { class: 'norma' }, ley.AUSENCIAS.incapacidadLaboral.norma)] },
      { celdas: ['Licencia de maternidad', `${ley.AUSENCIAS.licenciaMaternidad.semanas} semanas al 100 %`, 'EPS', h('span', { class: 'norma' }, ley.AUSENCIAS.licenciaMaternidad.norma)] },
      { celdas: ['Licencia de paternidad', `${ley.AUSENCIAS.licenciaPaternidad.semanas} semanas al 100 %`, 'EPS', h('span', { class: 'norma' }, ley.AUSENCIAS.licenciaPaternidad.norma)] },
      { celdas: ['Licencia por luto', `${ley.AUSENCIAS.licenciaLuto.dias} días hábiles al 100 %`, 'Empleador', h('span', { class: 'norma' }, ley.AUSENCIAS.licenciaLuto.norma)] },
    ])));

  contenedor.append(tarjeta('Dónde verificarlo',
    tabla([{ titulo: 'Fuente' }, { titulo: 'Para qué sirve' }],
      ley.FUENTES.map((f) => ({
        celdas: [h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.nombre), f.revisar],
      }))),
    h('p', { class: 'ayuda' }, 'Esta app no reemplaza a un contador ni a un abogado laboral: es una herramienta de cálculo y de control.')));

  return contenedor;
}

function esUltimaVigente(tabla, fila, fecha) {
  const vigentes = tabla.filter((f) => f.desde <= fecha);
  return vigentes[vigentes.length - 1] === fila;
}
