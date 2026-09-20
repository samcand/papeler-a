/**
 * colecciones.js (vista) — Fichas con los campos que tú quieras, y el
 * mantenimiento que vence por uso.
 *
 * El carro, la biblioteca, los cursos, los regalos y los lugares son la misma
 * pantalla con otros campos. Lo único aparte es el contador de kilómetros: ahí
 * el aviso no lo dispara una fecha, lo dispara el uso.
 */

import { button, el, input, render, textarea, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy } from '../fechas.js';
import {
  PLANTILLAS_COLECCION, TIPOS_CAMPO, coleccionNueva, desdePlantilla, fichaNueva,
  filtrarFichas, ordenarFichas, resumenColeccion, tareaDeVencimiento, tituloFicha, vencimientos,
} from '../colecciones.js';
import {
  SERVICIOS_CARRO, UNIDADES, contadorNuevo, lecturaActual, proximosServicios,
  resumenMantenimiento, servicioNuevo, tareaDeServicio, usoDiario,
} from '../mantenimiento.js';
import { dato, tituloVista, vacio } from '../componentes.js';
import { store } from '../store.js';

export function vistaColecciones(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let elegida = ctx.query?.c || store.estado.colecciones[0]?.id || null;
  let consulta = '';
  let orden = null;
  let editandoCampos = false;
  let fichaAbierta = null;
  const cajaFilas = el('div', {});
  const campoBusqueda = input('', (v) => { consulta = v; pintarFilas(); }, { placeholder: 'Buscar en las fichas…' });

  const coleccion = () => store.estado.colecciones.find((c) => c.id === elegida) || null;
  const fichasDe = (c) => store.estado.fichas.filter((f) => f.coleccion === c.id);

  const pintar = () => {
    const c = coleccion();
    render(host,
      tituloVista('Colecciones', 'Listas de fichas: el carro, los libros, los cursos, los regalos…'),
      selector(),
      !c ? vacio('Ninguna colección todavía. Empieza por una de las de arriba: traen los campos puestos.', '🗃️')
        : el('div', {},
          cabecera(c),
          editandoCampos ? editorCampos(c) : null,
          avisos(c),
          tabla(c),
          c.plantilla === 'vehiculo' ? panelMantenimiento(c) : null));
  };

  function selector() {
    return el('div', { class: 'fila', style: 'margin-bottom:12px' },
      store.estado.colecciones.length ? el('select', {
        class: 'input', style: 'width:auto',
        onChange: (e) => { elegida = e.target.value; consulta = ''; orden = null; editandoCampos = false; pintar(); },
      }, ...store.estado.colecciones.map((c) => el('option', { value: c.id, selected: c.id === elegida }, `${c.icono} ${c.nombre}`))) : null,
      el('select', {
        class: 'input', style: 'width:auto',
        onChange: (e) => {
          const plantilla = PLANTILLAS_COLECCION.find((p) => p.id === e.target.value);
          if (!plantilla) return;
          const nueva = store.agregarEn('colecciones', desdePlantilla(plantilla));
          elegida = nueva.id;
          pintar();
        },
      }, el('option', { value: '' }, '+ Desde plantilla…'),
      ...PLANTILLAS_COLECCION.map((p) => el('option', { value: p.id, title: p.descripcion }, `${p.icono} ${p.nombre}`))),
      button('+ Vacía', () => {
        const nueva = store.agregarEn('colecciones', coleccionNueva());
        elegida = nueva.id;
        editandoCampos = true;
        pintar();
      }));
  }

  function cabecera(c) {
    const fichas = fichasDe(c);
    const r = resumenColeccion(c, fichas, hoyISO);
    return el('section', { class: 'card' },
      el('div', { class: 'fila entre' },
        el('div', { class: 'fila' },
          input(c.nombre, (v) => { c.nombre = v; store.guardar(); }),
          input(c.icono, (v) => { c.icono = v; store.guardar(); }, { placeholder: '🗃️' })),
        el('div', { class: 'fila' },
          button('Campos', () => { editandoCampos = !editandoCampos; pintar(); }, { variant: 'ghost chico' }),
          button('🗑', () => {
            if (!window.confirm(`¿Borrar “${c.nombre}” y sus ${fichas.length} fichas?`)) return;
            store.borrarColeccion(c.id);
            elegida = store.estado.colecciones[0]?.id || null;
            pintar();
          }, { variant: 'ghost danger chico', title: 'Borrar la colección' }))),
      c.descripcion ? el('p', { class: 'muted small' }, c.descripcion) : null,
      el('div', { class: 'tarjetas' },
        dato(fichas.length, 'fichas'),
        ...r.cuentas.slice(0, 3).map((x) => dato(x.texto, x.campo.toLowerCase()))));
  }

  function editorCampos(c) {
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Campos de esta colección'),
      el('p', { class: 'muted small' }, 'Marca “avisa” en las fechas que tienen que recordarte algo: el seguro, la garantía, la devolución.'),
      ...c.campos.map((campo, i) => el('div', { class: 'fila' },
        input(campo.nombre, (v) => { campo.nombre = v; store.guardar(); }),
        el('select', {
          class: 'input', style: 'width:auto',
          onChange: (e) => { campo.tipo = e.target.value; store.guardar(); pintar(); },
        }, ...TIPOS_CAMPO.map((t) => el('option', { value: t.id, selected: t.id === campo.tipo }, t.nombre))),
        campo.tipo === 'eleccion' ? input((campo.opciones || []).join(', '), (v) => {
          campo.opciones = v.split(',').map((x) => x.trim()).filter(Boolean);
          store.guardar();
        }, { placeholder: 'opción, opción, opción' }) : null,
        campo.tipo === 'fecha' ? el('label', { class: 'chip', style: 'cursor:pointer' },
          el('input', {
            type: 'checkbox', checked: !!campo.avisar,
            onChange: (e) => { campo.avisar = e.target.checked; store.guardar(); pintar(); },
          }), 'avisa') : null,
        el('label', { class: 'chip', style: 'cursor:pointer' },
          el('input', {
            type: 'radio', name: 'principal', checked: !!campo.principal,
            onChange: () => { c.campos.forEach((x) => { x.principal = false; }); campo.principal = true; store.guardar(); pintar(); },
          }), 'nombre'),
        button('✕', () => {
          if (c.campos.length <= 1) { toast('Una colección necesita al menos un campo'); return; }
          c.campos.splice(i, 1);
          store.guardar();
          pintar();
        }, { variant: 'ghost chico', title: 'Quitar el campo' }))),
      el('div', { class: 'fila' },
        button('+ Campo', () => {
          c.campos.push({ id: 'c' + Math.random().toString(36).slice(2, 6), nombre: 'Campo nuevo', tipo: 'texto' });
          store.guardar();
          pintar();
        }),
        button('Listo', () => { editandoCampos = false; pintar(); }, { variant: 'primary' })));
  }

  function avisos(c) {
    const lista = vencimientos(c, fichasDe(c), hoyISO, 45);
    if (!lista.length) return null;
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, `Vence pronto (${lista.length})`),
      ...lista.map((v) => el('div', { class: `alerta ${v.vencido ? 'alto' : 'medio'}` },
        el('div', {},
          el('div', {}, v.texto),
          el('div', { class: 'accion' },
            button('Hacer tarea', () => {
              store.agregar(tareaDeVencimiento(c, v));
              toast('Tarea creada');
            }, { variant: 'ghost chico' }))))));
  }

  function tabla(c) {
    pintarFilas();
    return el('section', { class: 'card' },
      el('div', { class: 'fila' }, campoBusqueda,
        button('+ Ficha', () => { store.agregarEn('fichas', fichaNueva(c)); pintar(); }, { variant: 'primary' })),

      fichaAbierta ? el('div', { class: 'field' },
        el('span', { class: 'field-label' }, fichaAbierta.campo.nombre),
        textarea(fichaAbierta.ficha.valores?.[fichaAbierta.campo.id] || '', (v) => {
          store.actualizarFicha(fichaAbierta.ficha.id, fichaAbierta.campo.id, v);
        }, { rows: 5 }),
        button('Cerrar', () => { fichaAbierta = null; pintar(); }, { variant: 'ghost chico' })) : null,

      cajaFilas);
  }

  /** Solo las filas: así el campo de buscar no se va mientras escribes. */
  function pintarFilas() {
    const c = coleccion();
    if (!c) return;
    const fichas = ordenarFichas(filtrarFichas(fichasDe(c), consulta), c, orden || c.campos[0].id, true);
    const campoValor = (ficha, campo) => {
      const valor = ficha.valores?.[campo.id];
      const guardar = (v) => { store.actualizarFicha(ficha.id, campo.id, v); };
      if (campo.tipo === 'siNo') {
        return el('input', { type: 'checkbox', checked: !!valor, onChange: (e) => { guardar(e.target.checked); pintarFilas(); } });
      }
      if (campo.tipo === 'eleccion') {
        return el('select', { class: 'input', style: 'padding:4px 6px', onChange: (e) => { guardar(e.target.value); pintarFilas(); } },
          el('option', { value: '' }, '—'),
          ...(campo.opciones || []).map((o) => el('option', { value: o, selected: o === valor }, o)));
      }
      if (campo.tipo === 'largo') {
        return button(valor ? '📝' : '＋', () => { fichaAbierta = { ficha, campo }; pintar(); },
          { variant: 'ghost chico', title: valor || 'Escribir' });
      }
      const tipo = campo.tipo === 'fecha' ? 'date'
        : (campo.tipo === 'numero' || campo.tipo === 'dinero') ? 'number'
          : (campo.tipo === 'enlace' ? 'url' : 'text');
      return el('input', {
        class: 'input', style: 'padding:4px 6px', type: tipo, value: valor ?? '',
        // Al salir del campo, no en cada tecla: así no se repinta debajo del cursor.
        onChange: (e) => { guardar(tipo === 'number' ? Number(e.target.value) || 0 : e.target.value); pintar(); },
      });
    };

    render(cajaFilas,
      !fichas.length ? vacio('Ninguna ficha todavía.', '📇')
        : el('div', { class: 'tabla-scroll' },
          el('table', { class: 'tabla' },
            el('thead', {}, el('tr', {},
              ...c.campos.map((campo) => el('th', {
                style: 'cursor:pointer', title: 'Ordenar por este campo',
                onClick: () => { orden = campo.id; pintar(); },
              }, campo.nombre)),
              el('th', {}, ''))),
            el('tbody', {}, ...fichas.map((ficha) => el('tr', {},
              ...c.campos.map((campo) => el('td', {}, campoValor(ficha, campo))),
              el('td', {}, button('✕', () => {
                if (!window.confirm(`¿Borrar “${tituloFicha(c, ficha)}”?`)) return;
                store.borrarEn('fichas', ficha.id);
                pintar();
              }, { variant: 'ghost chico danger', title: 'Borrar la ficha' }))))))));
  }

  /* ---------------- mantenimiento por uso ---------------- */

  function panelMantenimiento(c) {
    const contadores = store.estado.contadores;
    const servicios = store.estado.mantenimientos;
    const r = resumenMantenimiento(servicios, contadores, hoyISO);

    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Mantenimiento por uso'),
      el('p', { class: 'muted small' },
        'Aquí el aviso no lo dispara una fecha, lo disparan los kilómetros. Apunta la lectura del tablero de vez en cuando y la app estima cuándo toca.'),

      ...contadores.map((cont) => {
        const actual = lecturaActual(cont);
        const porDia = usoDiario(cont);
        let lectura = '';
        return el('div', { class: 'idea' },
          el('div', { class: 'fila' },
            input(cont.nombre, (v) => { cont.nombre = v; store.guardar(); }),
            el('select', {
              class: 'input', style: 'width:auto',
              onChange: (e) => { cont.unidad = e.target.value; store.guardar(); pintar(); },
            }, ...UNIDADES.map((u) => el('option', { value: u.id, selected: u.id === cont.unidad }, u.nombre))),
            button('✕', () => { store.borrarEn('contadores', cont.id); pintar(); },
              { variant: 'ghost chico danger', title: 'Borrar el contador' })),
          el('p', { class: 'muted small' },
            actual ? `Última lectura: ${actual.valor} el ${actual.fecha}.` : 'Sin lecturas todavía.',
            porDia ? ` Vas a unos ${porDia} al día.` : ' Con dos lecturas separadas una semana se puede estimar el ritmo.'),
          el('div', { class: 'fila' },
            input('', (v) => { lectura = v; }, { type: 'number', placeholder: 'Lectura de hoy' }),
            button('Apuntar', () => {
              const res = store.registrarLectura(cont.id, lectura, hoyISO);
              if (!res.ok) { toast(res.error); return; }
              toast('Apuntado');
              pintar();
            })));
      }),

      el('div', { class: 'fila' },
        button('+ Contador', () => {
          store.agregarEn('contadores', contadorNuevo());
          pintar();
        }),
        contadores.length ? button('Traer el plan del carro', () => {
          const contador = contadores[0];
          let n = 0;
          const existentes = new Set(servicios.map((s) => s.nombre));
          for (const s of SERVICIOS_CARRO) {
            if (existentes.has(s.nombre)) continue;
            store.agregarEn('mantenimientos', servicioNuevo({ ...s, contador: contador.id }));
            n++;
          }
          toast(n ? `${n} servicios añadidos` : 'Ya los tenías');
          pintar();
        }) : null),

      servicios.length ? el('div', { style: 'margin-top:12px' },
        el('p', { class: 'muted small' }, r.frase),
        ...proximosServicios(servicios, contadores, hoyISO).map((e) => el('div', {
          class: `alerta ${e.vencido ? 'alto' : e.cerca ? 'medio' : 'bajo'}`,
        },
        el('div', { class: 'grow' },
          el('div', { class: 'fila' },
            input(e.servicio.nombre, (v) => { e.servicio.nombre = v; store.guardar(); }),
            el('label', { class: 'field', style: 'width:110px;margin:0' },
              el('span', { class: 'field-label' }, `Cada (${e.unidad})`),
              el('input', {
                class: 'input', type: 'number', value: e.servicio.cadaUso ?? '',
                onChange: (ev) => { e.servicio.cadaUso = Number(ev.target.value) || null; store.guardar(); pintar(); },
              })),
            el('label', { class: 'field', style: 'width:110px;margin:0' },
              el('span', { class: 'field-label' }, 'Cada (días)'),
              el('input', {
                class: 'input', type: 'number', value: e.servicio.cadaDias ?? '',
                onChange: (ev) => { e.servicio.cadaDias = Number(ev.target.value) || null; store.guardar(); pintar(); },
              }))),
          el('div', { class: 'accion' }, e.texto),
          el('div', { class: 'fila' },
            button('Hecho hoy', () => {
              store.marcarServicioHecho(e.servicio.id, hoyISO);
              toast('Apuntado: se reinicia el contador de este servicio');
              pintar();
            }, { variant: 'ghost chico' }),
            button('Hacer tarea', () => {
              store.agregar(tareaDeServicio(e, contadores.find((x) => x.id === e.servicio.contador)));
              toast('Tarea creada');
            }, { variant: 'ghost chico' }),
            button('✕', () => { store.borrarEn('mantenimientos', e.servicio.id); pintar(); },
              { variant: 'ghost chico danger', title: 'Borrar el servicio' })))))) : null);
  }

  pintar();
  render(root, host);
}
