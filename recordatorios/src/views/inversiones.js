/**
 * inversiones.js (vista) — La mesa de trabajo: cartera, riesgo, diario y
 * disciplina.
 *
 * Los precios se escriben a mano (la app no se conecta a ningún mercado). A
 * cambio funciona sin internet, no depende de ninguna API que caduque y nada
 * de lo que escribes sale de este dispositivo.
 */

import { button, download, el, input, render, toast } from '../../../src/ui.js';
import { aISO, hoy as fechaHoy, textoRelativo } from '../fechas.js';
import {
  CHECKLIST_COMPRA, CHECKLIST_POSTMORTEM, CHECKLIST_VENTA, ESCENARIOS, alertasCartera, diversificacion,
  informeFiscal, planDeAportes, proximosVencimientos, pruebaDeEstres, rMultiplo, rebalanceo,
  resultadoOperacion, resumenOperaciones, tamanoPosicion, tareasDeCartera, valoraCartera,
} from '../inversiones.js';
import { dato, tituloVista, vacio } from '../componentes.js';
import { decisionNueva, decisionesARevisar, resumenDecisiones } from '../trabajo.js';
import { importarMovimientosBroker, reconstruirPosiciones } from '../exportar.js';
import { store } from '../store.js';

const CAMPOS_POSICION = [
  { id: 'ticker', etiqueta: 'Ticker', ancho: 90 },
  { id: 'cantidad', etiqueta: 'Cant.', tipo: 'number', ancho: 80 },
  { id: 'entrada', etiqueta: 'Coste', tipo: 'number', ancho: 90 },
  { id: 'precio', etiqueta: 'Precio', tipo: 'number', ancho: 90 },
  { id: 'stop', etiqueta: 'Stop', tipo: 'number', ancho: 90 },
  { id: 'objetivo', etiqueta: 'Objetivo', tipo: 'number', ancho: 90 },
  { id: 'sector', etiqueta: 'Sector', ancho: 120 },
  { id: 'earnings', etiqueta: 'Resultados', tipo: 'date', ancho: 140 },
  { id: 'revisadaEn', etiqueta: 'Revisada', tipo: 'date', ancho: 140 },
];

export function vistaInversiones(root, ctx = {}) {
  const host = el('div', {});
  const hoyISO = aISO(fechaHoy());
  let pestana = ctx.query?.tab || 'cartera';

  const inv = () => store.estado.inversiones;
  const guardar = () => { store.guardar(); pintar(); };

  /* ----------------------------- cartera ----------------------------- */

  function panelCartera() {
    const valor = valoraCartera(inv().posiciones, inv().efectivo);
    const div = diversificacion(inv().posiciones, inv().efectivo);
    const alertas = alertasCartera(inv().posiciones, inv().reglas, hoyISO, inv().efectivo);

    return el('div', {},
      el('div', { class: 'tarjetas' },
        dato(moneda(valor.total), 'cartera total', { pie: `${moneda(valor.efectivo)} en efectivo (${valor.pesoEfectivo} %)` }),
        dato(moneda(valor.pnl), 'resultado abierto', { clase: valor.pnl >= 0 ? 'positivo' : 'negativo' }),
        dato(valor.filas.length, 'posiciones'),
        dato(div.hhi, 'concentración (HHI)', { clase: div.concentrado ? 'negativo' : '', pie: div.concentrado ? 'muy concentrada' : 'razonable' })),

      el('div', { class: 'fila', style: 'margin:12px 0' },
        el('label', { class: 'field', style: 'width:180px' },
          el('span', { class: 'field-label' }, 'Efectivo disponible'),
          el('input', { class: 'input', type: 'number', value: inv().efectivo,
            onChange: (e) => { inv().efectivo = Number(e.target.value) || 0; guardar(); } })),
        el('label', { class: 'field', style: 'width:180px' },
          el('span', { class: 'field-label' }, 'Riesgo por operación (%)'),
          el('input', { class: 'input', type: 'number', step: '0.1', value: inv().reglas.riesgoPct,
            onChange: (e) => { inv().reglas.riesgoPct = Number(e.target.value) || 1; guardar(); } })),
        el('label', { class: 'field', style: 'width:180px' },
          el('span', { class: 'field-label' }, 'Tope por posición (%)'),
          el('input', { class: 'input', type: 'number', value: inv().reglas.maxPesoPosicion,
            onChange: (e) => { inv().reglas.maxPesoPosicion = Number(e.target.value) || 20; guardar(); } }))),

      alertas.length ? el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `Alertas (${alertas.length})`),
        ...alertas.map((a) => el('div', { class: `alerta ${a.nivel}` },
          el('div', {}, el('div', {}, a.texto), el('div', { class: 'accion' }, a.accion))))) : null,

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Posiciones'),
        el('div', { class: 'tabla-scroll' },
          el('table', { class: 'tabla' },
            el('thead', {}, el('tr', {},
              ...CAMPOS_POSICION.map((c) => el('th', {}, c.etiqueta)),
              el('th', { class: 'num' }, 'Valor'), el('th', { class: 'num' }, 'P/L'), el('th', { class: 'num' }, 'Peso'), el('th', {}, ''))),
            el('tbody', {},
              ...valor.filas.map((f) => {
                const pos = inv().posiciones.find((p) => p.ticker === f.ticker) || f;
                return el('tr', {},
                  ...CAMPOS_POSICION.map((c) => el('td', {},
                    el('input', {
                      class: 'input', style: `width:${c.ancho}px;padding:5px 7px`,
                      type: c.tipo || 'text', value: pos[c.id] ?? '',
                      onChange: (e) => {
                        pos[c.id] = c.tipo === 'number' ? Number(e.target.value) || 0 : e.target.value;
                        guardar();
                      },
                    }))),
                  el('td', { class: 'num' }, moneda(f.valor)),
                  el('td', { class: `num ${f.pnl >= 0 ? 'positivo' : 'negativo'}` }, `${moneda(f.pnl)} (${f.pnlPct} %)`),
                  el('td', { class: 'num' }, `${f.peso} %`),
                  el('td', {}, button('🗑', () => {
                    if (!window.confirm(`¿Quitar ${f.ticker} de la cartera?`)) return;
                    inv().posiciones = inv().posiciones.filter((p) => p !== pos);
                    guardar();
                  }, { variant: 'ghost chico danger' })));
              }),
              ...(valor.filas.length ? [] : [el('tr', {}, el('td', { colspan: CAMPOS_POSICION.length + 4, class: 'muted' }, 'Sin posiciones todavía.'))])))),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('+ Añadir posición', () => {
            inv().posiciones.push({ ticker: 'NUEVA', cantidad: 0, entrada: 0, precio: 0, sector: '', revisadaEn: hoyISO });
            guardar();
          }),
          button('🔔 Generar recordatorios', () => {
            const nuevas = store.sembrarTareas(tareasDeCartera(inv(), hoyISO, inv().reglas), 'cartera');
            toast(nuevas ? `${nuevas} recordatorios creados` : 'Ya estaban todos creados');
          }, { title: 'Resultados, dividendos, vencimientos y tesis sin revisar' }),
          button('Marcar todas como revisadas hoy', () => {
            inv().posiciones.forEach((p) => { p.revisadaEn = hoyISO; });
            guardar();
          }, { variant: 'ghost' }))),

      panelSectores(div),
      panelTesis(),
      panelVencimientos(),
      panelRebalanceo(valor));
  }

  function panelSectores(div) {
    if (!div.sectores.length) return null;
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Por sector'),
      ...div.sectores.map((s) => el('div', { style: 'margin-bottom:8px' },
        el('div', { class: 'fila entre small' }, el('span', {}, s.sector), el('span', { class: 'muted' }, `${s.peso} % · ${moneda(s.valor)}`)),
        el('div', { class: 'barra' }, el('div', { style: `width:${s.peso}%;background:${s.peso > inv().reglas.maxPesoSector ? 'var(--danger)' : 'var(--accent-2)'}` })))));
  }

  function panelTesis() {
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Tesis de cada posición'),
      el('p', { class: 'muted small' }, 'Dos líneas: por qué la tengo y qué la invalidaría. Si no se puede escribir, no se entiende.'),
      ...inv().posiciones.map((p) => el('label', { class: 'field' },
        el('span', { class: 'field-label' }, `${p.ticker}${p.revisadaEn ? ` · revisada ${textoRelativo(p.revisadaEn)}` : ''}`),
        el('textarea', {
          class: 'input textarea', rows: 2, value: p.tesis || '',
          placeholder: 'Tesis y qué la rompería…',
          onChange: (e) => { p.tesis = e.target.value; p.revisadaEn = hoyISO; guardar(); },
        }, p.tesis || ''))));
  }

  function panelVencimientos() {
    const proximos = proximosVencimientos(hoyISO, 4);
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Vencimientos de opciones (tercer viernes)'),
      el('div', { class: 'chip-list' },
        ...proximos.map((v) => el('span', { class: 'chip' }, `${v} · ${textoRelativo(v)}`))),
      el('div', { class: 'fila', style: 'margin-top:10px' },
        button('Crear recordatorios de vencimiento', () => {
          const tareas = proximos.map((v) => ({
            titulo: `Decidir opciones antes del vencimiento (${v})`,
            fecha: aISO(new Date(new Date(v).getTime() - 2 * 86400000)),
            modulo: 'inversiones', proyecto: 'Cartera', prioridad: 1,
            notas: 'Rolar, dejar asignar o cerrar.',
          }));
          const n = store.sembrarTareas(tareas, 'vencimientos');
          toast(n ? `${n} recordatorios creados` : 'Ya estaban creados');
        })));
  }

  function panelRebalanceo(valor) {
    const objetivos = inv().objetivos || {};
    const movimientos = rebalanceo(inv().posiciones, objetivos, inv().efectivo, 5);
    return el('section', { class: 'card' },
      el('h2', { class: 'card-title' }, 'Rebalanceo'),
      el('p', { class: 'muted small' }, 'Escribe el peso objetivo de cada posición; la app dice qué mover cuando se desvía más de 5 puntos.'),
      el('div', { class: 'tabla-scroll' },
        el('table', { class: 'tabla' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Ticker'), el('th', { class: 'num' }, 'Actual'), el('th', { class: 'num' }, 'Objetivo'), el('th', {}, 'Acción'))),
          el('tbody', {}, ...valor.filas.map((f) => {
            const mov = movimientos.find((m) => m.ticker === f.ticker);
            return el('tr', {},
              el('td', {}, f.ticker),
              el('td', { class: 'num' }, `${f.peso} %`),
              el('td', { class: 'num' }, el('input', {
                class: 'input', type: 'number', style: 'width:80px;padding:4px 6px', value: objetivos[f.ticker] ?? '',
                onChange: (e) => {
                  inv().objetivos = { ...objetivos, [f.ticker]: Number(e.target.value) || 0 };
                  guardar();
                },
              })),
              el('td', { class: mov ? (mov.accion === 'comprar' ? 'positivo' : 'negativo') : 'muted' },
                mov ? `${mov.accion} ${moneda(mov.monto)}${mov.acciones ? ` (~${mov.acciones} acciones)` : ''}` : 'en rango'));
          })))));
  }

  /* --------------------------- calculadora --------------------------- */

  function panelCalculadora() {
    const datos = store.estado.inversiones.calculadora || { capital: 0, riesgoPct: 1, entrada: 0, stop: 0, lado: 'largo' };
    const total = valoraCartera(inv().posiciones, inv().efectivo).total;
    const capital = Number(datos.capital) || total || 0;
    const r = tamanoPosicion({ ...datos, capital, maxExposicionPct: inv().reglas.maxPesoPosicion });

    const campo = (id, etiqueta, tipo = 'number', paso = 'any') => el('label', { class: 'field', style: 'width:160px' },
      el('span', { class: 'field-label' }, etiqueta),
      el('input', {
        class: 'input', type: tipo, step: paso, value: id === 'capital' ? capital : (datos[id] ?? ''),
        onChange: (e) => {
          store.estado.inversiones.calculadora = { ...datos, [id]: tipo === 'number' ? Number(e.target.value) : e.target.value };
          guardar();
        },
      }));

    return el('div', {},
      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Tamaño de la posición'),
        el('p', { class: 'muted small' }, 'El tamaño sale del riesgo, no de las ganas: primero dónde te bajas, después cuánto compras.'),
        el('div', { class: 'fila' },
          campo('capital', 'Capital'),
          campo('riesgoPct', 'Riesgo (%)'),
          campo('entrada', 'Entrada'),
          campo('stop', 'Stop'),
          el('label', { class: 'field', style: 'width:140px' },
            el('span', { class: 'field-label' }, 'Lado'),
            el('select', { class: 'input', onChange: (e) => { store.estado.inversiones.calculadora = { ...datos, lado: e.target.value }; guardar(); } },
              el('option', { value: 'largo', selected: datos.lado !== 'corto' }, 'Largo'),
              el('option', { value: 'corto', selected: datos.lado === 'corto' }, 'Corto')))),

        r.error ? el('p', { class: 'negativo' }, r.error) : el('div', {},
          el('div', { class: 'tarjetas' },
            dato(r.acciones, 'acciones'),
            dato(moneda(r.costo), 'coste total', { pie: `${r.exposicionPct} % de la cartera` }),
            dato(moneda(r.riesgoReal), 'riesgo real', { pie: `stop a ${r.distanciaPct} %` }),
            dato(moneda(r.riesgoMonto), 'riesgo objetivo')),
          ...r.avisos.map((a) => el('div', { class: 'alerta medio', style: 'margin-top:10px' }, el('div', {}, a))),
          el('div', { class: 'fila', style: 'margin-top:12px' },
            button('Crear tarea de compra', () => {
              store.agregar({
                titulo: `Comprar ${r.acciones} acciones (entrada ${datos.entrada}, stop ${datos.stop})`,
                modulo: 'inversiones', proyecto: 'Cartera', prioridad: 2, fecha: hoyISO,
                notas: `Riesgo ${moneda(r.riesgoReal)} · ${r.exposicionPct} % de la cartera.\nAntes de dar la orden, pasa la lista de chequeo de compra.`,
              });
              toast('Tarea creada');
            }, { variant: 'primary' })))),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Simulador de resultado'),
        el('p', { class: 'muted small' },
          datos.entrada && datos.stop
            ? `Si sale bien a ${(datos.entrada * 1.2).toFixed(2)} ganas ${rMultiplo({ entrada: datos.entrada, salida: datos.entrada * 1.2, stop: datos.stop, lado: datos.lado })} R; si toca el stop pierdes 1 R (${moneda(r.riesgoReal || 0)}).`
            : 'Rellena entrada y stop para ver cuánto es 1 R.')));
  }

  /* ------------------------------ diario ------------------------------ */

  function panelDiario() {
    const ops = inv().operaciones;
    const s = resumenOperaciones(ops);

    return el('div', {},
      el('div', { class: 'tarjetas' },
        dato(s.total, 'operaciones cerradas'),
        dato(`${s.winRate} %`, 'aciertos', { pie: `${s.ganadas}G / ${s.perdidas}P` }),
        dato(s.expectativaR ?? '—', 'expectativa (R)', { clase: (s.expectativaR || 0) >= 0 ? 'positivo' : 'negativo', pie: 'lo que ganas por unidad de riesgo' }),
        dato(s.factorBeneficio ?? '—', 'factor de beneficio'),
        dato(moneda(s.pnl), 'resultado', { clase: s.pnl >= 0 ? 'positivo' : 'negativo' }),
        dato(s.racha, 'racha', { pie: s.racha > 0 ? 'ganadoras seguidas' : 'perdedoras seguidas' })),

      s.total ? el('p', { class: 'muted small', style: 'margin-top:10px' },
        `Mejor: ${s.mejor?.ticker} (${s.mejor?.r} R) · Peor: ${s.peor?.ticker} (${s.peor?.r} R)${s.duracionMedia ? ` · duración media ${s.duracionMedia} días` : ''}`) : null,

      panelDecisiones(),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Diario de operaciones'),
        el('div', { class: 'tabla-scroll' },
          el('table', { class: 'tabla' },
            el('thead', {}, el('tr', {},
              ...['Ticker', 'Lado', 'Cant.', 'Entrada', 'Stop', 'Salida', 'Entró', 'Salió'].map((t) => el('th', {}, t)),
              el('th', { class: 'num' }, 'P/L'), el('th', { class: 'num' }, 'R'), el('th', {}, ''))),
            el('tbody', {}, ...ops.map((op, i) => {
              const res = resultadoOperacion(op);
              return el('tr', {},
                ...[['ticker', 'text'], ['lado', 'text'], ['cantidad', 'number'], ['entrada', 'number'], ['stop', 'number'], ['salida', 'number'], ['fechaEntrada', 'date'], ['fechaSalida', 'date']]
                  .map(([campo, tipo]) => el('td', {}, el('input', {
                    class: 'input', style: `width:${tipo === 'date' ? 135 : 80}px;padding:4px 6px`, type: tipo, value: op[campo] ?? '',
                    onChange: (e) => { op[campo] = tipo === 'number' ? Number(e.target.value) : e.target.value; guardar(); },
                  }))),
                el('td', { class: `num ${res && res.pnl >= 0 ? 'positivo' : 'negativo'}` }, res ? moneda(res.pnl) : '—'),
                el('td', { class: 'num' }, res?.r ?? '—'),
                el('td', {}, button('🗑', () => { inv().operaciones = ops.filter((x) => x !== op); guardar(); }, { variant: 'ghost chico danger' })));
            })))),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          button('+ Nueva operación', () => {
            inv().operaciones.push({ ticker: '', lado: 'largo', cantidad: 0, entrada: 0, stop: 0, salida: null, fechaEntrada: hoyISO });
            guardar();
          }),
          importadorBroker())),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Lecciones'),
        el('p', { class: 'muted small' }, 'Una frase por operación cerrada. Releerlas cada trimestre vale más que cualquier indicador.'),
        ...ops.filter((o) => o.salida != null).map((op) => el('label', { class: 'field' },
          el('span', { class: 'field-label' }, `${op.ticker} · ${op.fechaSalida || 'sin fecha'}`),
          el('input', {
            class: 'input', value: op.leccion || '', placeholder: 'Qué aprendí…',
            onChange: (e) => { op.leccion = e.target.value; guardar(); },
          })))));
  }

  /**
   * Importar el CSV del bróker: copiar operaciones a mano es donde entran los
   * errores. Se empareja por FIFO y se enseña qué va a pasar antes de tocar nada.
   */
  function importadorBroker() {
    const entrada = el('input', {
      type: 'file', accept: '.csv,.txt', style: 'display:none',
      onChange: async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const { movimientos, avisos } = importarMovimientosBroker(await f.text());
        entrada.value = '';
        if (!movimientos.length) { toast(avisos[0] || 'No se reconoció ninguna operación', 'warn'); return; }
        const r = reconstruirPosiciones(movimientos);
        const detalle = [
          `${movimientos.length} movimientos leídos.`,
          r.resumen,
          ...r.avisos,
          '',
          'Esto reemplaza las posiciones y añade las operaciones cerradas al diario. ¿Seguir?',
        ].join('\n');
        if (!window.confirm(detalle)) return;
        store.instantanea('Importar del bróker');
        inv().posiciones = r.posiciones;
        inv().operaciones = [...inv().operaciones, ...r.operaciones];
        guardar();
        toast(`${r.posiciones.length} posiciones y ${r.operaciones.length} operaciones importadas`);
      },
    });
    return el('span', {}, button('📥 Importar CSV del bróker', () => entrada.click(),
      { title: 'Empareja compras y ventas por FIFO y reconstruye la cartera' }), entrada);
  }


  /**
   * Lo que descartaste y por qué. Revisarlo un año después enseña más que la
   * lista de aciertos: el diario de operaciones solo guarda lo que hiciste, y
   * media cartera se decide en lo que no se hace.
   */
  function panelDecisiones() {
    const decisiones = store.estado.decisiones || [];
    const r = resumenDecisiones(decisiones, hoyISO);
    const tocan = new Set(decisionesARevisar(decisiones, hoyISO).map((d) => d.id));

    return el('section', { class: 'card' },
      el('div', { class: 'fila entre' },
        el('h2', { class: 'card-title', style: 'margin:0' }, 'Decisiones que no tomaste'),
        button('+ Apuntar una', () => {
          store.agregarEn('decisiones', decisionNueva({ que: 'Lo que estuve a punto de hacer' }));
          pintar();
        }, { variant: 'ghost chico' })),
      el('p', { class: 'muted small' }, r.frase),

      !decisiones.length ? vacio('Nada apuntado todavía.', '🤔') : null,

      ...decisiones.map((d) => el('div', { class: `idea ${tocan.has(d.id) ? 'toca' : ''}`.trim() },
        el('div', { class: 'fila' },
          input(d.que, (v) => store.actualizarEn('decisiones', d.id, { que: v })),
          el('select', {
            class: 'input', style: 'width:auto',
            onChange: (e) => { store.actualizarEn('decisiones', d.id, { tipo: e.target.value }); pintar(); },
          },
          el('option', { value: 'descartada', selected: d.tipo === 'descartada' }, 'Descartada'),
          el('option', { value: 'aplazada', selected: d.tipo === 'aplazada' }, 'Aplazada')),
          button('✕', () => { store.borrarEn('decisiones', d.id); pintar(); },
            { variant: 'ghost chico danger', title: 'Borrar la decisión' })),
        el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Por qué'),
          input(d.porque || '', (v) => store.actualizarEn('decisiones', d.id, { porque: v }))),
        el('div', { class: 'fila' },
          el('label', { class: 'field', style: 'width:150px' }, el('span', { class: 'field-label' }, 'Precio entonces'),
            el('input', {
              class: 'input', type: 'number', step: '0.01', value: d.precio ?? '',
              onChange: (e) => store.actualizarEn('decisiones', d.id, { precio: Number(e.target.value) || null }),
            })),
          el('label', { class: 'field', style: 'width:170px' }, el('span', { class: 'field-label' }, 'Revisar el'),
            el('input', {
              class: 'input', type: 'date', value: d.revisarEn || '',
              onChange: (e) => { store.actualizarEn('decisiones', d.id, { revisarEn: e.target.value }); pintar(); },
            })),
          el('span', { class: 'muted small' }, `Apuntada el ${d.fecha}`)),
        tocan.has(d.id) ? el('div', {},
          el('p', { class: 'negativo small' }, 'Toca mirarla: ¿acertaste al no hacerlo?'),
          el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Qué pasó'),
            input(d.resultado || '', (v) => store.actualizarEn('decisiones', d.id, { resultado: v }))),
          button('Marcar revisada', () => {
            store.actualizarEn('decisiones', d.id, { revisada: hoyISO });
            pintar();
          }, { variant: 'ghost chico' })) : null,
        d.revisada ? el('p', { class: 'muted small' }, `Revisada el ${d.revisada}. ${d.resultado || ''}`) : null)));
  }

  /* -------------------- estrés y plan de aportes -------------------- */

  function panelEstres() {
    const guardado = inv().estres || { caida: 20, sector: '' };
    const sectores = [...new Set(inv().posiciones.map((p) => p.sector).filter(Boolean))];
    const r = pruebaDeEstres(inv().posiciones, Number(guardado.caida) || 20,
      { efectivo: inv().efectivo, sector: guardado.sector || null });
    const plan = planDeAportes(inv().aportes || {}, hoyISO);

    return el('div', {},
      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Prueba de estrés'),
        el('p', { class: 'muted small' },
          'Lo interesante no es el número final: es qué stops saltan. Ahí se ve si el plan aguanta escrito o solo en la cabeza.'),
        el('div', { class: 'chip-list' },
          ...ESCENARIOS.map((e) => el('button', {
            class: `chip ${Number(guardado.caida) === e.caida ? 'activa' : ''}`.trim(),
            onClick: () => {
              inv().estres = { caida: e.caida, sector: e.soloSector ? (sectores[0] || '') : '' };
              guardar();
            },
          }, e.nombre))),
        el('div', { class: 'fila', style: 'margin-top:10px' },
          el('label', { class: 'field', style: 'width:150px;margin:0' },
            el('span', { class: 'field-label' }, 'Caída (%)'),
            el('input', {
              class: 'input', type: 'number', min: 1, max: 90, value: guardado.caida,
              onChange: (e) => { inv().estres = { ...guardado, caida: Number(e.target.value) || 20 }; guardar(); },
            })),
          sectores.length ? el('label', { class: 'field', style: 'width:180px;margin:0' },
            el('span', { class: 'field-label' }, 'Solo este sector'),
            el('select', { class: 'input', onChange: (e) => { inv().estres = { ...guardado, sector: e.target.value }; guardar(); } },
              el('option', { value: '' }, 'Toda la cartera'),
              ...sectores.map((x) => el('option', { value: x, selected: x === guardado.sector }, x)))) : null),

        el('div', { class: 'tarjetas', style: 'margin-top:12px' },
          dato(moneda(r.totalAntes), 'cartera ahora'),
          dato(moneda(r.totalDespues), 'después del golpe', { clase: 'negativo' }),
          dato(`${r.perdidaPct} %`, 'caída de la cartera', { clase: 'negativo', pie: moneda(r.perdida) }),
          dato(r.stopsQueSaltan.length, 'stops que saltan', { clase: r.stopsQueSaltan.length ? 'negativo' : 'positivo' })),

        el('p', { style: 'margin-top:10px' }, r.frase),

        el('div', { class: 'tabla-scroll' },
          el('table', { class: 'tabla' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Ticker'), el('th', { class: 'num' }, 'Precio'),
              el('th', { class: 'num' }, 'Después'), el('th', { class: 'num' }, 'Pierdes'), el('th', {}, 'Stop'))),
            el('tbody', {}, ...r.filas.map((f) => el('tr', {},
              el('td', {}, f.ticker),
              el('td', { class: 'num muted' }, String(f.precioAntes)),
              el('td', { class: 'num' }, String(f.precioDespues)),
              el('td', { class: 'num negativo' }, moneda(f.perdida)),
              el('td', { class: f.stopSaltado ? 'negativo' : 'muted' },
                f.sinStop ? 'sin stop' : f.stopSaltado ? `salta (${f.stop})` : `aguanta (${f.stop})`)))))),

        r.stopsQueSaltan.length ? el('div', { class: 'fila', style: 'margin-top:10px' },
          button('Crear la tarea de decidir ahora', () => {
            store.agregar({
              titulo: `Decidir por escrito qué haré si cae un ${r.caidaPct} %`,
              modulo: 'inversiones', proyecto: 'Cartera', prioridad: 2, fecha: hoyISO,
              notas: `${r.frase}\nAfectadas: ${r.stopsQueSaltan.map((f) => f.ticker).join(', ')}.`,
            });
            toast('Tarea creada');
          })) : null),

      el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, 'Plan de aportes'),
        el('div', { class: 'fila' },
          el('label', { class: 'field', style: 'width:180px' },
            el('span', { class: 'field-label' }, 'Objetivo del año'),
            el('input', {
              class: 'input', type: 'number', value: (inv().aportes || {}).objetivoAnual || '',
              onChange: (e) => {
                inv().aportes = { ...(inv().aportes || {}), objetivoAnual: Number(e.target.value) || 0 };
                guardar();
              },
            })),
          button('+ Apuntar aporte', () => {
            const importe = Number(window.prompt('¿Cuánto has aportado?', '0'));
            if (!importe) return;
            const aportes = inv().aportes || {};
            inv().aportes = { ...aportes, aportes: [...(aportes.aportes || []), { fecha: hoyISO, importe }] };
            guardar();
          })),

        plan.objetivo ? el('div', {},
          el('div', { class: 'barra', style: 'margin:10px 0 6px' },
            el('div', { style: `width:${Math.min(100, plan.pct)}%;background:${plan.alDia ? 'var(--ok)' : 'var(--warn)'}` })),
          el('p', { class: plan.alDia ? 'positivo' : 'negativo' }, plan.frase),
          el('div', { class: 'tarjetas' },
            dato(moneda(plan.aportado), 'aportado', { pie: `${plan.pct} % del objetivo` }),
            dato(moneda(plan.deberiaLlevar), 'deberías llevar'),
            dato(moneda(plan.ritmoNecesario), 'al mes para llegar', { pie: `${plan.mesesRestantes} meses` })),
          plan.aportes.length ? el('details', { style: 'margin-top:10px' },
            el('summary', { class: 'muted small' }, `Aportes del año (${plan.aportes.length})`),
            el('table', { class: 'tabla' },
              el('tbody', {}, ...plan.aportes.map((x, i) => el('tr', {},
                el('td', { class: 'muted small' }, x.fecha),
                el('td', { class: 'num' }, moneda(x.importe)),
                el('td', {}, button('🗑', () => {
                  const aportes = inv().aportes;
                  inv().aportes = { ...aportes, aportes: aportes.aportes.filter((y) => y !== x) };
                  guardar();
                }, { variant: 'ghost chico danger' }))))))) : null)
          : el('p', { class: 'muted' }, plan.frase)));
  }

  /* ----------------------------- fiscal ----------------------------- */

  function panelFiscal() {
    const anio = inv().anioFiscal || Number(hoyISO.slice(0, 4));
    const r = informeFiscal(inv().operaciones, anio);

    return el('div', {},
      el('section', { class: 'card' },
        el('div', { class: 'fila entre' },
          el('h2', { class: 'card-title', style: 'margin:0' }, `Plusvalías realizadas en ${anio}`),
          el('select', { class: 'input', style: 'width:auto', onChange: (e) => { inv().anioFiscal = Number(e.target.value); guardar(); } },
            ...[0, 1, 2, 3].map((d) => {
              const y = Number(hoyISO.slice(0, 4)) - d;
              return el('option', { value: y, selected: y === anio }, String(y));
            }))),
        el('p', { class: 'muted small' },
          'Es un informe, no un consejo fiscal: cada país tiene sus reglas de compensación y de plazos. ',
          'La app te da el número y los datos ordenados; la norma la aplicas tú o quien te lleve los impuestos.'),

        el('div', { class: 'tarjetas' },
          dato(moneda(r.ganancias), 'ganancias', { clase: 'positivo' }),
          dato(moneda(r.perdidas), 'pérdidas', { clase: 'negativo' }),
          dato(moneda(r.neto), 'neto', { clase: r.neto >= 0 ? 'positivo' : 'negativo' }),
          dato(moneda(r.comisiones), 'comisiones'),
          dato(r.operaciones.length, 'operaciones cerradas')),

        ...r.avisos.map((a) => el('div', { class: 'alerta medio', style: 'margin-top:10px' }, el('div', {}, a))),

        r.operaciones.length ? el('div', { class: 'tabla-scroll', style: 'margin-top:12px' },
          el('table', { class: 'tabla' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Ticker'), el('th', {}, 'Compra'), el('th', {}, 'Venta'),
              el('th', { class: 'num' }, 'Cant.'), el('th', { class: 'num' }, 'Entrada'), el('th', { class: 'num' }, 'Salida'),
              el('th', { class: 'num' }, 'Resultado'))),
            el('tbody', {}, ...r.operaciones.map((f) => el('tr', {},
              el('td', {}, f.ticker),
              el('td', { class: 'small muted' }, f.fechaEntrada || '—'),
              el('td', { class: 'small' }, f.fechaSalida),
              el('td', { class: 'num' }, String(f.cantidad)),
              el('td', { class: 'num muted' }, String(f.entrada)),
              el('td', { class: 'num' }, String(f.salida)),
              el('td', { class: `num ${f.resultado >= 0 ? 'positivo' : 'negativo'}` }, moneda(f.resultado)))))))
          : el('p', { class: 'muted' }, 'No hay operaciones cerradas en ese año.'),

        r.operaciones.length ? el('div', { class: 'fila', style: 'margin-top:10px' },
          button('⬇ Exportar CSV para el gestor', () => {
            const filas = [['Ticker', 'Compra', 'Venta', 'Cantidad', 'Entrada', 'Salida', 'Comisiones', 'Resultado']];
            for (const f of r.operaciones) filas.push([f.ticker, f.fechaEntrada, f.fechaSalida, f.cantidad, f.entrada, f.salida, f.comisiones, f.resultado]);
            download(`plusvalias-${anio}.csv`, filas.map((x) => x.join(',')).join('\n'), 'text/csv');
          })) : null));
  }

  /* ----------------------------- chequeos ----------------------------- */

  function panelChequeos() {
    const lista = (titulo, items, clave, descripcion) => {
      const marcados = store.estado.ajustes[clave] || [];
      return el('section', { class: 'card' },
        el('h2', { class: 'card-title' }, `${titulo} — ${marcados.length}/${items.length}`),
        descripcion ? el('p', { class: 'muted small' }, descripcion) : null,
        el('div', { class: 'lista-chequeo' },
          ...items.map((texto, i) => el('label', {},
            el('input', {
              type: 'checkbox', checked: marcados.includes(i),
              onChange: () => {
                const nuevos = marcados.includes(i) ? marcados.filter((x) => x !== i) : [...marcados, i];
                store.ajustar({ [clave]: nuevos });
                pintar();
              },
            }),
            el('span', { class: marcados.includes(i) ? 'muted' : '' }, texto)))),
        el('div', { class: 'fila', style: 'margin-top:8px' },
          button('Empezar de cero', () => { store.ajustar({ [clave]: [] }); pintar(); }, { variant: 'ghost chico' }),
          button('Convertir en tareas', () => {
            const n = store.sembrarTareas(items.map((texto) => ({
              titulo: texto, modulo: 'inversiones', proyecto: 'Cartera', prioridad: 3, fecha: hoyISO,
            })), clave);
            toast(n ? `${n} tareas creadas` : 'Ya existían');
          }, { variant: 'ghost chico' })));
    };

    return el('div', {},
      el('p', { class: 'muted' }, 'Las listas se marcan para una decisión concreta y se vuelven a poner a cero para la siguiente.'),
      lista('Antes de comprar', CHECKLIST_COMPRA, 'chk-compra', 'Si falla una sola casilla, la orden espera.'),
      lista('Antes de vender', CHECKLIST_VENTA, 'chk-venta'),
      lista('Después de cerrar', CHECKLIST_POSTMORTEM, 'chk-postmortem', 'Se hace con la operación fresca, no al final del mes.'));
  }

  const pintar = () => {
    render(host,
      tituloVista('Inversiones', 'Precios a mano, cálculo y disciplina de la app'),
      el('div', { class: 'pestanas' },
        ...[['cartera', 'Cartera'], ['calculadora', 'Riesgo'], ['estres', 'Estrés y aportes'],
          ['diario', 'Diario'], ['fiscal', 'Fiscal'], ['chequeos', 'Chequeos']].map(([id, txt]) =>
          el('button', { class: `pestana ${pestana === id ? 'activa' : ''}`.trim(), onClick: () => { pestana = id; pintar(); } }, txt))),
      pestana === 'cartera' ? panelCartera()
        : pestana === 'calculadora' ? panelCalculadora()
          : pestana === 'estres' ? panelEstres()
            : pestana === 'diario' ? panelDiario()
              : pestana === 'fiscal' ? panelFiscal() : panelChequeos());
  };

  pintar();
  render(root, host);
}

function moneda(n) {
  const v = Number(n) || 0;
  return `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('es', { maximumFractionDigits: 2 })}`;
}
