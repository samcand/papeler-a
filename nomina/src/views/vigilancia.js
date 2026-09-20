/**
 * vigilancia.js (vista) — El módulo de noticias: qué cambió o está por
 * cambiar en la ley laboral, y qué hacer con eso.
 */

import {
  h, tarjeta, tabla, campo, entrada, boton, chip, mensaje, aviso, vacio,
  formatoCorto, formatoLargo, hoy, seleccion, modal, confirmar,
} from '../ui.js';
import * as vig from '../vigilancia.js';
import * as ley from '../normativa.js';

const ESTADOS = [
  { value: 'por-revisar', label: 'Por revisar' },
  { value: 'aplicado', label: 'Aplicado en la app' },
  { value: 'no-aplica', label: 'No aplica' },
];

export function vista(store) {
  const contenedor = h('div', { class: 'vista' });
  const ajustes = store.estado.ajustes;

  contenedor.append(h('div', { class: 'barra' },
    h('div', {},
      h('h1', {}, 'Vigilancia normativa'),
      h('p', { class: 'ayuda' },
        'Tres cosas: qué valores de la app están por vencer, qué cambios ya tienen fecha, y qué se está diciendo en las fuentes.')),
    h('div', { class: 'acciones' },
      ajustes.ultimaRevision
        ? chip(`Última revisión: ${formatoCorto(ajustes.ultimaRevision)}`, 'gris')
        : chip('Nunca revisado', 'alerta'),
      boton('Marcar como revisado hoy', () => {
        store.actualizarAjustes({ ultimaRevision: hoy() });
        mensaje('Revisión registrada.');
      }))));

  // ——— 1. Alertas ———
  const alertas = vig.alertas(hoy());
  contenedor.append(tarjeta('Qué necesita tu atención',
    alertas.length
      ? h('div', {}, ...alertas.map((a) => h('div', { class: `alerta alerta-${a.nivel}` },
        h('strong', {}, a.titulo),
        h('p', {}, a.detalle),
        a.accion ? enlaceFuente(a.accion) : null)))
      : h('p', {}, 'Todo al día: los valores cargados corresponden al año en curso y no hay cambios inminentes.')));

  // ——— 2. Cambios con fecha ———
  contenedor.append(tarjeta('Cambios de ley ya aprobados, con fecha',
    tabla([{ titulo: 'Desde' }, { titulo: 'Qué cambia' }, { titulo: 'Norma' }],
      ley.CAMBIOS_PROGRAMADOS.map((c) => ({
        celdas: [formatoCorto(c.fecha), h('div', {}, h('strong', {}, c.titulo), h('p', { class: 'ayuda' }, c.detalle)),
          h('span', { class: 'norma' }, c.norma)],
      }))),
    h('p', { class: 'ayuda' },
      'La app ya liquida con estos escalones: usa el valor que corresponda a la fecha de cada periodo, no el de hoy.')));

  // ——— 3. Consulta de noticias ———
  const resultados = h('div');
  const fuentes = vig.FEEDS_SUGERIDOS.concat(ajustes.fuentesExtra || []);
  const seleccionadas = new Set(fuentes.map((f) => f.id));

  const consultar = async () => {
    resultados.replaceChildren(h('p', {}, 'Consultando…'));
    const { noticias, errores } = await vig.consultarFuentes({
      fuentes: fuentes.filter((f) => seleccionadas.has(f.id)),
      proxy: ajustes.proxy,
      desde: ajustes.ultimaRevision,
    });
    resultados.replaceChildren(pintarResultados(store, noticias, errores));
  };

  contenedor.append(tarjeta('Consultar noticias',
    h('p', { class: 'ayuda' },
      'Las páginas oficiales no dejan que otra página las lea directamente (CORS). Para consultarlas desde aquí hace falta un proxy propio; '
      + 'configúralo en Ajustes o abre las fuentes a mano con los enlaces de abajo.'),
    h('div', { class: 'chips' }, ...fuentes.map((f) => {
      const id = `f-${f.id}`;
      const casilla = h('input', { type: 'checkbox', id, checked: true, onChange: (e) => {
        if (e.target.checked) seleccionadas.add(f.id); else seleccionadas.delete(f.id);
      } });
      return h('label', { class: 'casilla', for: id }, casilla, f.nombre);
    })),
    h('div', { class: 'acciones acciones-envueltas' },
      boton('Consultar ahora', consultar, 'primario'),
      boton('+ Agregar una fuente', () => agregarFuente(store)),
      ajustes.proxy ? chip('Proxy configurado', 'ok') : chip('Sin proxy: puede fallar por CORS', 'alerta')),
    resultados));

  // ——— 4. Fuentes oficiales ———
  contenedor.append(tarjeta('Fuentes oficiales para verificar',
    tabla([{ titulo: 'Fuente' }, { titulo: 'Qué revisar' }, { titulo: '' }],
      ley.FUENTES.map((f) => ({
        celdas: [
          h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.nombre),
          f.revisar,
          boton('Registrar hallazgo', () => nuevaEntrada(store, { titulo: '', fuente: f.nombre, enlace: f.url })),
        ],
      }))),
    h('p', { class: 'ayuda' },
      'Lo que anuncie un medio hay que confirmarlo en el Diario Oficial: la norma rige desde su publicación, no desde el titular.')));

  // ——— 5. Bitácora ———
  const bitacora = store.estado.bitacora;
  contenedor.append(tarjeta(`Bitácora normativa (${bitacora.length})`,
    h('div', { class: 'acciones' }, boton('+ Anotar un cambio', () => nuevaEntrada(store, {}), 'primario')),
    bitacora.length
      ? tabla([{ titulo: 'Fecha' }, { titulo: 'Hallazgo' }, { titulo: 'Fuente' }, { titulo: 'Estado' }, { titulo: '' }],
        bitacora.map((b) => ({
          celdas: [
            formatoCorto(b.fecha),
            h('div', {}, h('strong', {}, b.titulo),
              b.notas ? h('p', { class: 'ayuda' }, b.notas) : null,
              b.enlace ? h('a', { href: b.enlace, target: '_blank', rel: 'noopener' }, 'Abrir fuente') : null),
            b.fuente || '—',
            seleccion(ESTADOS, b.estado || 'por-revisar', {
              onChange: (e) => { store.actualizarBitacora(b.id, { estado: e.target.value }); mensaje('Actualizado.'); },
            }),
            boton('Borrar', () => {
              if (confirmar('¿Borrar la anotación?')) store.borrarBitacora(b.id);
            }, 'peligro'),
          ],
        })))
      : h('p', { class: 'ayuda' }, 'Aquí queda el rastro de cada cambio que detectes: qué decía la norma, desde cuándo rige y si ya lo aplicaste en la app.')));

  // ——— 6. Guía ———
  contenedor.append(tarjeta('Cómo mantener la app al día',
    h('ol', { class: 'lista-guia' },
      h('li', {}, h('strong', {}, 'Cada diciembre: '), 'busca el decreto de salario mínimo y el de auxilio de transporte, y la resolución de la UVT de la DIAN.'),
      h('li', {}, h('strong', {}, '1 de julio de 2027: '), 'el recargo por día de descanso y festivos pasa al 100 %; la app ya lo tiene programado.'),
      h('li', {}, h('strong', {}, 'Cuando cambie algo: '), 'edita la tabla de ', h('code', {}, 'nomina/src/normativa.js'),
        ' agregando una fila nueva con su fecha de vigencia. Nunca borres la anterior: las liquidaciones viejas deben seguir saliendo con los valores de su momento.'),
      h('li', {}, h('strong', {}, 'Deja constancia: '), 'anota en la bitácora la norma, la fecha de publicación y qué cambiaste.'))));

  return contenedor;
}

function enlaceFuente(id) {
  const f = ley.FUENTES.find((x) => x.id === id);
  return f ? h('p', {}, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, `Abrir ${f.nombre}`)) : null;
}

function pintarResultados(store, noticias, errores) {
  const caja = h('div', {});
  if (errores.length) {
    caja.append(...errores.map((e) => aviso(`${e.fuente}: ${e.mensaje}`, 'alerta')));
  }
  if (!noticias.length) {
    caja.append(h('p', {}, 'No se encontró nada nuevo que parezca un cambio normativo.'));
    return caja;
  }
  caja.append(tabla([{ titulo: 'Fecha' }, { titulo: 'Titular' }, { titulo: 'Temas' }, { titulo: '' }],
    noticias.slice(0, 40).map((n) => ({
      celdas: [
        n.fecha ? formatoCorto(n.fecha) : '—',
        h('div', {},
          n.enlace ? h('a', { href: n.enlace, target: '_blank', rel: 'noopener' }, n.titulo) : h('strong', {}, n.titulo),
          n.resumen ? h('p', { class: 'ayuda' }, n.resumen.slice(0, 180)) : null,
          h('small', { class: 'norma' }, n.fuente)),
        h('div', { class: 'chips' },
          ...n.temas.map((t) => chip(t, 'ok')),
          n.pareceNorma ? chip('Menciona una norma', 'alerta') : null),
        boton('A la bitácora', () => {
          store.agregarBitacora(vig.aEntradaBitacora(n));
          mensaje('Anotado en la bitácora.');
        }),
      ],
    }))));
  return caja;
}

function nuevaEntrada(store, base) {
  const datos = { fecha: hoy(), titulo: '', enlace: '', fuente: '', notas: '', estado: 'por-revisar', ...base };
  const cuerpo = h('div', { class: 'formulario' },
    campo('Qué encontraste', entrada({ value: datos.titulo, onInput: (e) => { datos.titulo = e.target.value; } }),
      'Por ejemplo: "Decreto 1469 de 2025 fija el salario mínimo de 2026 en $1.750.905".'),
    h('div', { class: 'rejilla rejilla-2' },
      campo('Fecha', entrada({ type: 'date', value: datos.fecha, onInput: (e) => { datos.fecha = e.target.value; } })),
      campo('Fuente', entrada({ value: datos.fuente, onInput: (e) => { datos.fuente = e.target.value; } }))),
    campo('Enlace', entrada({ type: 'url', value: datos.enlace, onInput: (e) => { datos.enlace = e.target.value; } })),
    campo('Notas', entrada({ value: datos.notas, onInput: (e) => { datos.notas = e.target.value; } }),
      'Desde cuándo rige y qué hay que cambiar en la app.'));

  const dlg = modal('Anotar un cambio normativo', cuerpo, [
    boton('Cancelar', () => dlg.cerrar()),
    boton('Guardar', () => {
      if (!datos.titulo) { mensaje('Escribe al menos el título.', 'error'); return; }
      store.agregarBitacora(datos);
      dlg.cerrar();
      mensaje('Anotado.');
    }, 'primario'),
  ]);
}

function agregarFuente(store) {
  const datos = { id: `fx-${Date.now().toString(36)}`, nombre: '', url: '', feed: '', tipo: 'personalizada' };
  const cuerpo = h('div', { class: 'formulario' },
    campo('Nombre', entrada({ onInput: (e) => { datos.nombre = e.target.value; } })),
    campo('Página', entrada({ type: 'url', onInput: (e) => { datos.url = e.target.value; } })),
    campo('Feed RSS o Atom', entrada({ type: 'url', onInput: (e) => { datos.feed = e.target.value; } }),
      'Si la página tiene RSS, la app puede leerla sola (con proxy).'));

  const dlg = modal('Agregar una fuente', cuerpo, [
    boton('Cancelar', () => dlg.cerrar()),
    boton('Guardar', () => {
      if (!datos.nombre) { mensaje('Falta el nombre.', 'error'); return; }
      store.actualizarAjustes({ fuentesExtra: [...(store.estado.ajustes.fuentesExtra || []), datos] });
      dlg.cerrar();
      mensaje('Fuente agregada.');
    }, 'primario'),
  ]);
}
