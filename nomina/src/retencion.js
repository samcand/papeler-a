/**
 * retencion.js — Retención en la fuente sobre salarios, procedimiento 1.
 *
 * Es un estimado de buena fe para que el neto no salga mentiroso: la
 * depuración real depende de certificados que el trabajador entrega
 * (dependientes, medicina prepagada, intereses de vivienda, AFC, voluntarios).
 * Se expone todo el paso a paso para poder revisarlo.
 *
 * Base legal: Estatuto Tributario arts. 383, 385, 387 y 388.
 */

import * as ley from './normativa.js';

/** Tabla del artículo 383 del Estatuto Tributario, en UVT. */
export const TABLA_383 = [
  { desde: 0, hasta: 95, tarifa: 0, suma: 0 },
  { desde: 95, hasta: 150, tarifa: 0.19, suma: 0 },
  { desde: 150, hasta: 360, tarifa: 0.28, suma: 10 },
  { desde: 360, hasta: 640, tarifa: 0.33, suma: 69 },
  { desde: 640, hasta: 945, tarifa: 0.35, suma: 162 },
  { desde: 945, hasta: 2300, tarifa: 0.37, suma: 268 },
  { desde: 2300, hasta: Infinity, tarifa: 0.39, suma: 770 },
];

export const LIMITES_UVT = {
  rentaExentaMes: 790 / 12,      // 25 % exento, tope anual de 790 UVT
  deduccionesMes: 1340 / 12,     // tope global de deducciones y exentas
  dependientesMes: 32,           // 10 % del ingreso, hasta 32 UVT
  viviendaMes: 100,              // intereses de crédito de vivienda
  saludPrepagadaMes: 16,
};

/**
 * @param {Object} p
 * @param {number} p.ingresoLaboral   Todo lo que recibe el trabajador en el mes (salario, recargos, extras, comisiones, bonificaciones).
 * @param {number} p.aportesObligatorios Salud + pensión + fondo de solidaridad que descuenta el trabajador.
 * @param {number} p.ingresosNoConstitutivos Auxilio de transporte, viáticos ocasionales, pagos no salariales.
 * @param {Object} p.deducciones      { vivienda, salud, dependientes, afc, pensionVoluntaria, otras }
 */
export function retencionProcedimiento1({
  ingresoLaboral,
  fecha,
  aportesObligatorios = 0,
  ingresosNoConstitutivos = 0,
  deducciones = {},
  tieneDependientes = false,
}) {
  const valorUvt = ley.uvt(fecha);
  const pasos = [];
  const enUvt = (pesos) => pesos / valorUvt;

  const bruto = Math.max(0, ingresoLaboral);
  pasos.push({ paso: 'Ingresos del mes', valor: bruto });

  let base = bruto - ingresosNoConstitutivos - aportesObligatorios;
  pasos.push({ paso: 'Menos ingresos no constitutivos de renta', valor: -ingresosNoConstitutivos });
  pasos.push({ paso: 'Menos aportes obligatorios a salud, pensión y FSP', valor: -aportesObligatorios });
  base = Math.max(0, base);

  const topeVivienda = LIMITES_UVT.viviendaMes * valorUvt;
  const topeSalud = LIMITES_UVT.saludPrepagadaMes * valorUvt;
  const topeDependientes = LIMITES_UVT.dependientesMes * valorUvt;

  const dVivienda = Math.min(deducciones.vivienda || 0, topeVivienda);
  const dSalud = Math.min(deducciones.salud || 0, topeSalud);
  const dDependientes = tieneDependientes ? Math.min(bruto * 0.10, topeDependientes) : 0;
  const dOtras = (deducciones.afc || 0) + (deducciones.pensionVoluntaria || 0) + (deducciones.otras || 0);
  const totalDeducciones = dVivienda + dSalud + dDependientes + dOtras;

  if (dVivienda) pasos.push({ paso: 'Menos intereses de vivienda (tope 100 UVT)', valor: -dVivienda });
  if (dSalud) pasos.push({ paso: 'Menos medicina prepagada (tope 16 UVT)', valor: -dSalud });
  if (dDependientes) pasos.push({ paso: 'Menos dependientes (10 %, tope 32 UVT)', valor: -dDependientes });
  if (dOtras) pasos.push({ paso: 'Menos AFC, pensión voluntaria y otras', valor: -dOtras });

  const subtotal = Math.max(0, base - totalDeducciones);
  const rentaExentaBruta = subtotal * 0.25;
  const rentaExenta = Math.min(rentaExentaBruta, LIMITES_UVT.rentaExentaMes * valorUvt);
  pasos.push({ paso: 'Menos renta exenta del 25 % (tope 790 UVT al año)', valor: -rentaExenta });

  // Tope global: deducciones + exentas no pueden pasar del 40 % del ingreso neto
  // ni de 1.340 UVT al año (art. 336 E.T.).
  const ingresoNeto = Math.max(0, bruto - ingresosNoConstitutivos - aportesObligatorios);
  const topeGlobal = Math.min(ingresoNeto * 0.40, LIMITES_UVT.deduccionesMes * valorUvt);
  const beneficios = Math.min(totalDeducciones + rentaExenta, topeGlobal);
  if (totalDeducciones + rentaExenta > topeGlobal) {
    pasos.push({ paso: 'Ajuste por el tope del 40 % / 1.340 UVT', valor: topeGlobal - (totalDeducciones + rentaExenta) });
  }

  const baseGravable = Math.max(0, ingresoNeto - beneficios);
  const baseUvt = enUvt(baseGravable);
  pasos.push({ paso: 'Base gravable', valor: baseGravable, uvt: Math.round(baseUvt * 100) / 100 });

  const rango = TABLA_383.find((r) => baseUvt > r.desde && baseUvt <= r.hasta)
    || (baseUvt <= 95 ? TABLA_383[0] : TABLA_383[TABLA_383.length - 1]);
  const retencionUvt = baseUvt <= 95 ? 0 : (baseUvt - rango.desde) * rango.tarifa + rango.suma;
  const retencion = Math.round(retencionUvt * valorUvt);

  pasos.push({
    paso: `Tabla art. 383: ${Math.round(rango.tarifa * 100)} % sobre el exceso de ${rango.desde} UVT${rango.suma ? ` más ${rango.suma} UVT` : ''}`,
    valor: retencion,
  });

  return {
    retencion,
    baseGravable: Math.round(baseGravable),
    baseUvt: Math.round(baseUvt * 100) / 100,
    valorUvt,
    rango,
    pasos,
    nota: 'Estimación con el procedimiento 1. Ajusta las deducciones con los certificados que entregue el trabajador.',
  };
}

/** Desde cuánto empieza a haber retención este año (95 UVT de base gravable). */
export function umbralRetencion(fecha) {
  return Math.round(95 * ley.uvt(fecha));
}
