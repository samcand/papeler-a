/**
 * ugpp.js — Revisión antes de pagar.
 *
 * La UGPP cruza la PILA con la información de la DIAN y de las
 * administradoras. Cuando encuentra diferencias, la sanción va del 35 % al
 * 200 % de los aportes en discusión (Ley 1819 de 2016, art. 314), más
 * intereses. Casi siempre son los mismos cinco o seis errores, y todos se
 * pueden ver antes de pagar.
 */

import { dias360, diasCalendario, hoy, formatoCorto, inicioDeMes, finDeMes, sumarMeses } from './fechas.js';
import * as calc from './calculo.js';
import * as ley from './normativa.js';

export const NIVELES = { alto: 'alto', medio: 'medio', bajo: 'bajo' };

const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

/**
 * @param {Object} p
 * @param {Object} p.empresa
 * @param {Array}  p.contratos
 * @param {Function} p.empleado  (id) => empleado
 * @param {Array}  p.nominas     Nóminas registradas.
 * @param {string} p.hasta       Fecha de corte.
 */
export function auditar({ empresa = {}, contratos = [], empleado = () => ({}), nominas = [], hasta = hoy() }) {
  const hallazgos = [];
  const agregar = (h) => hallazgos.push({ nivel: 'medio', ...h });
  const minimo = ley.smmlv(hasta);

  // ——— 1. Meses sin aporte de un contrato vigente ———
  for (const c of contratos) {
    const nombre = empleado(c.empleadoId)?.nombre || 'Sin nombre';
    const fin = c.terminacion || (c.estado === 'terminado' ? c.fin : '') || hasta;
    let cursor = inicioDeMes(c.inicio);
    let guarda = 0;
    const faltantes = [];
    while (cursor <= finDeMes(fin < hasta ? fin : hasta) && guarda++ < 120) {
      const mes = cursor.slice(0, 7);
      const tiene = nominas.some((n) => n.contratoId === c.id && n.hasta.slice(0, 7) === mes);
      const mesCompletoPasado = finDeMes(cursor) < hasta;
      if (!tiene && mesCompletoPasado) faltantes.push(mes);
      cursor = sumarMeses(cursor, 1);
    }
    if (faltantes.length) {
      agregar({
        nivel: 'alto',
        codigo: 'omision',
        titulo: `${nombre}: ${faltantes.length} mes(es) sin nómina liquidada`,
        detalle: `No hay registro para ${faltantes.slice(0, 6).join(', ')}${faltantes.length > 6 ? '…' : ''}. `
          + 'Un trabajador vigente sin aporte en un mes es el hallazgo más fácil de detectar para la UGPP.',
        norma: 'Ley 100 de 1993 y Ley 1819 de 2016 art. 314',
        sugerencia: 'Liquida esos meses o marca el contrato como terminado en su fecha real.',
        empleado: nombre,
      });
    }
  }

  // ——— 2. Revisión de cada nómina liquidada ———
  for (const n of nominas) {
    const c = contratos.find((x) => x.id === n.contratoId);
    if (!c) continue;
    const nombre = empleado(c.empleadoId)?.nombre || 'Sin nombre';
    const mes = n.hasta.slice(0, 7);
    const salarioMes = calc.salarioMensualEquivalente(c, n.hasta);
    const devengados = n.devengados || [];
    const salarial = devengados.filter((d) => d.salarial).reduce((s, d) => s + d.valor, 0);
    const noSalariales = devengados.filter((d) => /no salariales/i.test(d.concepto)).reduce((s, d) => s + d.valor, 0);
    const totalDevengado = n.totalDevengado || devengados.reduce((s, d) => s + d.valor, 0);

    // 2.1 IBC menor que lo que es salario
    if (n.ibc && salarial && n.ibc < salarial - 1 && n.ibc > 0) {
      const diferencia = salarial - n.ibc;
      agregar({
        nivel: 'alto',
        codigo: 'ibc-bajo',
        titulo: `${nombre} (${mes}): el IBC es menor que lo devengado como salario`,
        detalle: `Se cotizó sobre ${pesos(n.ibc)} y el devengado salarial fue ${pesos(salarial)}: faltan ${pesos(diferencia)}. `
          + 'Los recargos, las horas extra y las comisiones son salario y entran al IBC.',
        norma: 'Ley 100 de 1993 art. 18 y Ley 1393 de 2010 art. 30',
        exposicion: diferencia * (ley.APORTES.salud.total + ley.APORTES.pension.total),
        empleado: nombre,
        mes,
      });
    }

    // 2.2 Pagos no salariales por encima del 40 %
    if (noSalariales > 0 && totalDevengado > 0 && noSalariales / totalDevengado > 0.40) {
      agregar({
        nivel: 'alto',
        codigo: 'no-salariales',
        titulo: `${nombre} (${mes}): los pagos no salariales pasan del 40 %`,
        detalle: `${pesos(noSalariales)} de ${pesos(totalDevengado)} (${Math.round((noSalariales / totalDevengado) * 100)} %). `
          + 'El exceso se suma al IBC.',
        norma: 'Ley 1393 de 2010 art. 30',
        empleado: nombre,
        mes,
      });
    }

    // 2.3 IBC por debajo del mínimo
    const minimoMes = ley.smmlv(n.hasta);
    if (n.ibc && n.ibc < minimoMes && !/tiempo parcial/i.test(c.notas || '')) {
      agregar({
        nivel: 'medio',
        codigo: 'ibc-minimo',
        titulo: `${nombre} (${mes}): IBC por debajo del salario mínimo`,
        detalle: `Se cotizó sobre ${pesos(n.ibc)}, menos de ${pesos(minimoMes)}. Solo se admite con novedad de ingreso, retiro, `
          + 'suspensión o licencia no remunerada, o en el régimen de tiempo parcial del Decreto 2616 de 2013.',
        norma: 'Decreto 780 de 2016',
        empleado: nombre,
        mes,
      });
    }

    // 2.4 Exoneración mal aplicada
    const aportes = n.aportes || {};
    if (aportes.aplicaExoneracion && salarioMes >= 10 * minimoMes) {
      agregar({
        nivel: 'alto',
        codigo: 'exoneracion',
        titulo: `${nombre} (${mes}): exoneración aplicada a quien gana 10 salarios mínimos o más`,
        detalle: 'La exoneración de salud del empleador, SENA e ICBF solo cubre a quienes devengan menos de 10 salarios mínimos.',
        norma: 'Estatuto Tributario art. 114-1',
        empleado: nombre,
        mes,
      });
    }

    // 2.5 Diferencia entre lo liquidado y lo pagado
    if (n.pagado && n.netoPagado && Math.abs(n.netoPagado - n.neto) > 1000) {
      agregar({
        nivel: 'medio',
        codigo: 'diferencia-pago',
        titulo: `${nombre} (${mes}): lo pagado no coincide con lo liquidado`,
        detalle: `Liquidado ${pesos(n.neto)}, pagado ${pesos(n.netoPagado)}.`,
        norma: '',
        empleado: nombre,
        mes,
      });
    }
  }

  // ——— 3. Revisión de los contratos ———
  for (const c of contratos) {
    const emp = empleado(c.empleadoId) || {};
    const nombre = emp.nombre || 'Sin nombre';
    const salarioMes = calc.salarioMensualEquivalente(c, hasta);
    const activo = c.estado !== 'terminado';

    if (c.tipo === 'aprendizaje' && !['12', '19'].includes(String(c.tipoCotizante || ''))) {
      agregar({
        nivel: 'alto',
        codigo: 'cotizante-aprendiz',
        titulo: `${nombre}: aprendiz sin tipo de cotizante de aprendiz`,
        detalle: 'Reportar como aprendiz a quien no lo es, o al revés, es uno de los cruces más fáciles para la UGPP. '
          + 'Los códigos son 12 (etapa lectiva) y 19 (etapa productiva).',
        norma: 'Resolución 2388 de 2016',
        empleado: nombre,
      });
    }

    if (c.salarioIntegral && salarioMes < ley.minimoIntegral(hasta)) {
      agregar({
        nivel: 'alto',
        codigo: 'integral-bajo',
        titulo: `${nombre}: salario integral por debajo del mínimo legal`,
        detalle: `El salario integral no puede ser inferior a 13 salarios mínimos (${pesos(ley.minimoIntegral(hasta))}).`,
        norma: 'CST art. 132',
        empleado: nombre,
      });
    }

    if (activo && salarioMes < minimo && !c.tiempoParcial) {
      agregar({
        nivel: 'alto',
        codigo: 'salario-minimo',
        titulo: `${nombre}: salario por debajo del mínimo`,
        detalle: `${pesos(salarioMes)} frente a ${pesos(minimo)}. Solo es válido en jornada parcial con remuneración proporcional.`,
        norma: 'CST art. 145 y decreto anual de salario mínimo',
        empleado: nombre,
      });
    }

    if (activo && (!emp.eps || !emp.afp)) {
      agregar({
        nivel: 'alto',
        codigo: 'afiliacion',
        titulo: `${nombre}: falta la afiliación a ${!emp.eps ? 'EPS' : ''}${!emp.eps && !emp.afp ? ' y ' : ''}${!emp.afp ? 'fondo de pensiones' : ''}`,
        detalle: 'Sin afiliación no se puede reportar la PILA, y el empleador responde por las prestaciones que deje de cubrir el sistema.',
        norma: 'Ley 100 de 1993',
        empleado: nombre,
      });
    }

    if (c.tipo === 'fijo' && c.fin && activo) {
      const faltan = diasCalendario(hasta, c.fin);
      if (faltan < 0) {
        agregar({
          nivel: 'medio',
          codigo: 'fijo-vencido',
          titulo: `${nombre}: el contrato a término fijo venció el ${formatoCorto(c.fin)}`,
          detalle: 'Si el trabajador sigue laborando, el contrato se entiende prorrogado por un periodo igual al pactado. '
            + 'Conviene dejarlo por escrito.',
          norma: 'CST art. 46',
          empleado: nombre,
        });
      }
      if (dias360(c.inicio, c.fin) / 360 > 4) {
        agregar({
          nivel: 'alto',
          codigo: 'fijo-4-anios',
          titulo: `${nombre}: el término fijo supera los 4 años`,
          detalle: 'El máximo legal del contrato a término fijo es de cuatro años.',
          norma: 'CST art. 46 (Ley 2466 de 2025)',
          empleado: nombre,
        });
      }
    }
  }

  const exposicion = hallazgos.reduce((s, h) => s + (h.exposicion || 0), 0);
  const orden = { alto: 0, medio: 1, bajo: 2 };
  hallazgos.sort((a, b) => orden[a.nivel] - orden[b.nivel]);

  return {
    fecha: hasta,
    hallazgos,
    resumen: {
      alto: hallazgos.filter((h) => h.nivel === 'alto').length,
      medio: hallazgos.filter((h) => h.nivel === 'medio').length,
      bajo: hallazgos.filter((h) => h.nivel === 'bajo').length,
    },
    exposicion,
    sancionEstimada: exposicion
      ? { minima: Math.round(exposicion * 0.35), maxima: Math.round(exposicion * 2), norma: 'Ley 1819 de 2016 art. 314' }
      : null,
    revisiones: LISTA_DE_CHEQUEO,
  };
}

/** Lo que revisa (y lo que no) esta auditoría. */
export const LISTA_DE_CHEQUEO = [
  { id: 'omision', titulo: 'Trabajadores vigentes sin aporte en algún mes' },
  { id: 'ibc-bajo', titulo: 'IBC menor que el devengado salarial (extras, recargos, comisiones)' },
  { id: 'no-salariales', titulo: 'Pagos no salariales por encima del 40 %' },
  { id: 'ibc-minimo', titulo: 'IBC por debajo del salario mínimo sin novedad' },
  { id: 'exoneracion', titulo: 'Exoneración del artículo 114-1 mal aplicada' },
  { id: 'cotizante-aprendiz', titulo: 'Tipo de cotizante equivocado' },
  { id: 'integral-bajo', titulo: 'Salario integral por debajo de 13 salarios mínimos' },
  { id: 'salario-minimo', titulo: 'Salarios por debajo del mínimo' },
  { id: 'afiliacion', titulo: 'Trabajadores sin EPS o sin fondo de pensiones' },
  { id: 'fijo-vencido', titulo: 'Contratos a término fijo vencidos o pasados de 4 años' },
];
