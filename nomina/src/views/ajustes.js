/**
 * ajustes.js — Datos del empleador, respaldo y configuración de la consulta
 * de noticias.
 */

import {
  h, tarjeta, campo, entrada, seleccion, boton, mensaje, confirmar, descargar,
  aviso, pesos, tabla, formatoCorto,
} from '../ui.js';
import * as ley from '../normativa.js';

export function vista(store) {
  const contenedor = h('div', { class: 'vista' });
  const empresa = { ...store.estado.empresa };
  const ajustes = { ...store.estado.ajustes };
  const set = (obj, k) => (e) => { obj[k] = e.target.value; };

  contenedor.append(h('h1', {}, 'Ajustes'));

  contenedor.append(tarjeta('El empleador',
    h('div', { class: 'rejilla rejilla-3' },
      campo('Nombre o razón social', entrada({ value: empresa.nombre || '', onInput: set(empresa, 'nombre') })),
      campo('NIT', entrada({ value: empresa.nit || '', onInput: set(empresa, 'nit') })),
      campo('Ciudad', entrada({ value: empresa.ciudad || '', onInput: set(empresa, 'ciudad') }))),
    h('div', { class: 'rejilla rejilla-3' },
      campo('Clase de riesgo ARL por defecto', seleccion(ley.ARL.map((a) => ({ value: a.clase, label: `Clase ${a.clase} — ${a.ejemplo}` })), empresa.claseArl, { onChange: set(empresa, 'claseArl') })),
      campo('¿Exonerado de parafiscales?', seleccion([
        { value: '1', label: 'Sí (art. 114-1 del E.T.)' }, { value: '', label: 'No' },
      ], empresa.exonerado ? '1' : '', { onChange: (e) => { empresa.exonerado = !!e.target.value; } }),
      'Aplica a sociedades y a personas naturales con dos o más empleados, por trabajadores que ganen menos de 10 salarios mínimos.'),
      campo('¿Aporta a caja de compensación?', seleccion([
        { value: '1', label: 'Sí' }, { value: '', label: 'No' },
      ], empresa.aportaCaja ? '1' : '', { onChange: (e) => { empresa.aportaCaja = !!e.target.value; } }))),
    h('div', { class: 'acciones' },
      boton('Guardar', () => { store.actualizarEmpresa(empresa); mensaje('Datos guardados.'); }, 'primario'))));

  contenedor.append(tarjeta('Consulta de noticias',
    campo('Proxy con CORS (opcional)', entrada({
      value: ajustes.proxy || '', placeholder: 'https://mi-proxy.ejemplo/?{url}', onInput: set(ajustes, 'proxy'),
    }), 'Usa {url} donde va la dirección del feed, codificada. Sin proxy, los sitios oficiales bloquean la lectura desde el navegador.'),
    (ajustes.fuentesExtra || []).length
      ? tabla([{ titulo: 'Fuente agregada' }, { titulo: 'Feed' }, { titulo: '' }],
        ajustes.fuentesExtra.map((f) => ({
          celdas: [f.nombre, h('small', {}, f.feed || '—'), boton('Quitar', () => {
            store.actualizarAjustes({ fuentesExtra: store.estado.ajustes.fuentesExtra.filter((x) => x.id !== f.id) });
            mensaje('Fuente eliminada.');
          }, 'peligro')],
        })))
      : null,
    h('div', { class: 'acciones' },
      boton('Guardar', () => { store.actualizarAjustes(ajustes); mensaje('Ajustes guardados.'); }, 'primario'))));

  contenedor.append(tarjeta('Respaldo',
    h('p', {}, 'Todo se guarda en este navegador. Si borras los datos del sitio o cambias de equipo, se pierde: exporta cada tanto.'),
    h('div', { class: 'acciones acciones-envueltas' },
      boton('Exportar todo (JSON)', () => {
        descargar(`nomina-respaldo-${new Date().toISOString().slice(0, 10)}.json`, store.exportar());
        mensaje('Respaldo descargado.');
      }, 'primario'),
      h('label', { class: 'boton' }, 'Importar respaldo',
        h('input', {
          type: 'file', accept: 'application/json', style: 'display:none',
          onChange: async (e) => {
            const archivo = e.target.files?.[0];
            if (!archivo) return;
            try {
              store.importar(await archivo.text());
              mensaje('Respaldo importado.');
            } catch (error) {
              mensaje(`No se pudo importar: ${error.message}`, 'error');
            }
          },
        })),
      boton('Borrar todo', () => {
        if (confirmar('Esto borra empleados, contratos, registros y nóminas de este dispositivo. ¿Seguro?')) {
          store.limpiar();
          mensaje('Todo borrado.');
        }
      }, 'peligro'))));

  contenedor.append(tarjeta('Sobre los cálculos',
    h('ul', { class: 'lista-guia' },
      h('li', {}, 'Las prestaciones se liquidan con el año comercial de 360 días y meses de 30, como es la práctica laboral colombiana.'),
      h('li', {}, 'La hora ordinaria sale de dividir el sueldo entre el divisor de la jornada vigente en la fecha del periodo (hoy, 210 horas).'),
      h('li', {}, 'El trabajo en día de descanso se paga solo con recargo si se dio descanso compensatorio; si no, se paga el día y el recargo.'),
      h('li', {}, 'La retención en la fuente es un estimado del procedimiento 1: ajústala con los certificados del trabajador.'),
      h('li', {}, `Parámetros verificados el ${formatoCorto(ley.VERIFICADO_EL)}. Revisa el módulo de Vigilancia normativa antes de cada cierre.`)),
    aviso('Esta herramienta ayuda a calcular y a llevar el registro, pero no reemplaza el concepto de un contador o un abogado laboral.', 'info')));

  return contenedor;
}
