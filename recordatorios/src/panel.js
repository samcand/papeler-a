/**
 * panel.js — El panel de vida: todo junto, en una pantalla.
 *
 * No calcula nada nuevo. Llama a los módulos que ya existen y los pone en el
 * mismo sitio, que es justo lo que no se puede hacer cuando cada cosa vive en
 * una app distinta.
 *
 * Dos reglas para que esto no se vuelva un salpicadero de adorno: una tarjeta
 * que no tiene datos **dice que no los tiene** en vez de enseñar un cero, y los
 * avisos van arriba y ordenados por urgencia, porque un panel donde todo pesa
 * igual no se mira dos veces.
 */

import { aISO, hoy } from './fechas.js';
import { estaVencida, paraHoy } from './modelo.js';
import { resumenCapacidad } from './capacidad.js';
import { presupuestoDelMes } from './gastos.js';
import { resumenObjetivos } from './objetivos.js';
import { resumenPersonas } from './personas.js';
import { resumenMantenimiento } from './mantenimiento.js';
import { resumenRutinas } from './rutinas.js';
import { resumenNotas } from './notas.js';
import { resumenViajes, cuentaAtras } from './viajes.js';
import { vencimientos } from './colecciones.js';
import { resumenEsperas } from './esperas.js';

/**
 * Una tarjeta por ámbito de la vida. `nivel` ordena el color: 'mal' pide algo
 * hoy, 'ojo' pide algo esta semana, 'bien' no pide nada y 'vacio' es que
 * todavía no hay datos.
 */
export function panelDeVida(estado = {}, hoyISO = aISO(hoy())) {
  const tareas = (estado.tareas || []).filter((t) => !t.archivada);
  const pendientes = tareas.filter((t) => !t.completada);
  const vencidas = pendientes.filter((t) => estaVencida(t, hoyISO));
  const deHoy = paraHoy(tareas, hoyISO);
  const cerradasHoy = (estado.historial || []).filter((h) => h.fecha === hoyISO).length;

  const capacidad = resumenCapacidad(tareas, estado.ajustes || {}, hoyISO);
  const dinero = presupuestoDelMes(estado.gastos || [], estado.presupuestos || {}, hoyISO.slice(0, 7), hoyISO);
  const objetivos = resumenObjetivos(estado.objetivos || [], { tareas, historial: estado.historial || [] }, hoyISO);
  const personas = resumenPersonas(estado.personas || [], hoyISO);
  const manten = resumenMantenimiento(estado.mantenimientos || [], estado.contadores || [], hoyISO);
  const rutinas = resumenRutinas(estado.rutinas || [], estado.rutinasHechas || [], hoyISO);
  const notas = resumenNotas(estado.notas || [], hoyISO);
  const viajes = resumenViajes(estado.viajes || [], hoyISO);
  const esperas = resumenEsperas(tareas, hoyISO);

  const avisosColecciones = (estado.colecciones || [])
    .flatMap((c) => vencimientos(c, (estado.fichas || []).filter((f) => f.coleccion === c.id), hoyISO, 30)
      .map((v) => ({ ...v, coleccion: c })));

  const tarjetas = [
    {
      id: 'dia', titulo: 'El día', icono: '📋', ruta: '/hoy',
      valor: `${deHoy.length + vencidas.length}`,
      pie: vencidas.length ? `${vencidas.length} atrasadas · ${cerradasHoy} cerradas` : `${cerradasHoy} cerradas hoy`,
      nivel: vencidas.length ? 'mal' : (deHoy.length ? 'ojo' : 'bien'),
      frase: capacidad.frase,
    },
    {
      id: 'rutinas', titulo: 'Rutinas', icono: '🌅', ruta: '/rutinas',
      valor: (estado.rutinas || []).length ? `${rutinas.hoy.filter((x) => x.progreso.completa).length}/${rutinas.hoy.length}` : '—',
      pie: (estado.rutinas || []).length ? 'hechas hoy' : 'sin montar',
      nivel: !(estado.rutinas || []).length ? 'vacio' : (rutinas.pendientes ? 'ojo' : 'bien'),
      frase: rutinas.frase,
    },
    {
      id: 'dinero', titulo: 'Dinero del mes', icono: '💳', ruta: '/gastos',
      valor: (estado.gastos || []).length ? dinero.total.toLocaleString('es') : '—',
      pie: dinero.totalLimite ? `de ${dinero.totalLimite.toLocaleString('es')}` : 'sin presupuesto',
      nivel: !(estado.gastos || []).length ? 'vacio'
        : (dinero.pctDinero != null && dinero.pctDinero > dinero.pctTiempo + 10 ? 'mal' : 'bien'),
      frase: dinero.frase,
    },
    {
      id: 'objetivos', titulo: 'Objetivos', icono: '🎯', ruta: '/objetivos',
      valor: (estado.objetivos || []).length ? `${objetivos.enCurso}` : '—',
      pie: objetivos.atrasados ? `${objetivos.atrasados} van tarde` : 'en curso',
      nivel: !(estado.objetivos || []).length ? 'vacio' : (objetivos.atrasados ? 'ojo' : 'bien'),
      frase: objetivos.frase,
    },
    {
      id: 'personas', titulo: 'Personas', icono: '🎂', ruta: '/personas',
      valor: (estado.personas || []).length ? `${personas.proximos.length}` : '—',
      pie: 'fechas este mes',
      nivel: !(estado.personas || []).length ? 'vacio' : (personas.preparar.length ? 'ojo' : 'bien'),
      frase: personas.frase,
    },
    {
      id: 'mantenimiento', titulo: 'Mantenimiento', icono: '🔧', ruta: '/colecciones',
      valor: (estado.mantenimientos || []).length ? `${manten.vencidos + manten.cerca}` : '—',
      pie: manten.vencidos ? `${manten.vencidos} vencidos` : 'por tocar',
      nivel: !(estado.mantenimientos || []).length ? 'vacio' : (manten.vencidos ? 'mal' : (manten.cerca ? 'ojo' : 'bien')),
      frase: manten.frase,
    },
    {
      id: 'viaje', titulo: 'Viajes', icono: '✈️', ruta: '/viajes',
      valor: viajes.enCurso || viajes.proximo
        ? cuentaAtras(viajes.enCurso || viajes.proximo, hoyISO).dias
        : '—',
      pie: viajes.enCurso ? 'día de viaje' : (viajes.proximo ? 'días para salir' : 'sin viajes'),
      nivel: !viajes.total ? 'vacio' : 'bien',
      frase: viajes.frase,
    },
    {
      id: 'notas', titulo: 'Notas y diario', icono: '📔', ruta: '/notas',
      valor: (estado.notas || []).length ? `${notas.racha}` : '—',
      pie: 'días de diario seguidos',
      nivel: !(estado.notas || []).length ? 'vacio' : (notas.hoyEscrito ? 'bien' : 'ojo'),
      frase: notas.frase,
    },
  ];

  // Los avisos: lo que pide algo hoy, ordenado por lo que duele antes.
  const avisos = [];
  if (vencidas.length) avisos.push({ nivel: 'alto', texto: `${vencidas.length} tarea(s) atrasadas.`, ruta: '/hoy' });
  for (const e of manten.estados.filter((x) => x.vencido)) {
    avisos.push({ nivel: 'alto', texto: `${e.servicio.nombre}: ${e.texto.toLowerCase()}`, ruta: '/colecciones' });
  }
  for (const v of avisosColecciones.filter((x) => x.vencido)) {
    avisos.push({ nivel: 'alto', texto: v.texto, ruta: '/colecciones' });
  }
  if (dinero.pasadas.length) {
    avisos.push({ nivel: 'medio', texto: `Presupuesto pasado en ${dinero.pasadas.map((f) => f.nombre.toLowerCase()).join(', ')}.`, ruta: '/gastos' });
  }
  for (const p of personas.preparar) {
    avisos.push({ nivel: 'medio', texto: `${p.texto} (en ${p.faltan} días).`, ruta: '/personas' });
  }
  for (const v of avisosColecciones.filter((x) => !x.vencido)) {
    avisos.push({ nivel: 'medio', texto: v.texto, ruta: '/colecciones' });
  }
  if (esperas.vencidas) avisos.push({ nivel: 'medio', texto: `${esperas.vencidas} espera(s) fuera de plazo.`, ruta: '/revision' });
  for (const o of objetivos.lista.filter((x) => x.progreso.alDia === false)) {
    avisos.push({ nivel: 'bajo', texto: `${o.objetivo.que}: ${o.progreso.frase.toLowerCase()}`, ruta: '/objetivos' });
  }

  const orden = { alto: 0, medio: 1, bajo: 2 };
  avisos.sort((a, b) => orden[a.nivel] - orden[b.nivel]);

  const vacias = tarjetas.filter((t) => t.nivel === 'vacio');
  return {
    fecha: hoyISO,
    tarjetas,
    avisos,
    vacias: vacias.map((t) => t.titulo),
    frase: avisos.length
      ? `${avisos.filter((a) => a.nivel === 'alto').length} cosa(s) para hoy y ${avisos.length} en total.`
      : 'Nada pide atención ahora mismo.',
  };
}
