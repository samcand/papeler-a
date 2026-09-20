/**
 * store.js — Todo el estado de la app, guardado en este dispositivo.
 *
 * Igual que la app de alabanza: sin servidor, sin cuentas y sin que nada salga
 * de aquí. Para llevarlo a otro equipo están exportar e importar.
 */

import { aISO, hoy, sumarDias } from './fechas.js';
import { siguienteFecha } from './recurrencia.js';
import { PilaDeshacer, aPapelera, purgar, restaurar } from './papelera.js';
import { esAplazamiento } from './dia.js';
import { CONFIG_POMODORO } from './tiempo.js';
import { completar, crearTarea, uid } from './modelo.js';
import { FILTROS_PREDEFINIDOS } from './filtros.js';
import { aplicarReglas } from './automatizacion.js';
import { marcarHecho, registrarLectura } from './mantenimiento.js';
import { alternarPaso } from './rutinas.js';
import { haríaCiclo } from './dependencias.js';
import { PLANTILLAS_INICIALES } from './plantillasLista.js';
import { TAREAS_EJEMPLO, PROYECTOS_EJEMPLO } from './seed.js';

const CLAVE = 'recordatorios.v1';

const ESTADO_INICIAL = {
  version: 1,
  tareas: [],
  proyectos: [],
  filtros: [],
  historial: [],        // { id, tareaId, titulo, fecha, modulo, prioridad }
  tiempo: [],           // { tipo, tareaId, minutos, fecha, fin }
  habitos: [],          // { id, nombre, icono, dias: [] }
  inversiones: {
    capital: 0,
    efectivo: 0,
    posiciones: [],     // { ticker, cantidad, entrada, precio, stop, objetivo, sector, tesis, revisadaEn, earnings, exDividendo, opciones }
    vigilancia: [],     // { ticker, precioAlerta, tesis }
    operaciones: [],    // diario: { ticker, lado, entrada, salida, stop, cantidad, fechas, motivo, leccion }
    reglas: { maxPesoPosicion: 20, maxPesoSector: 35, diasSinRevisar: 90, perdidaAviso: -15, riesgoPct: 1 },
  },
  docencia: { semestre: { nombre: '', inicio: null, fin: null, cursos: [] } },
  investigacion: { articulos: [], convocatorias: [], tesis: [] },
  alabanza: { servicios: [] },
  // Ojo: `proyectos` son las listas de tareas; `planes` son los proyectos con
  // EDT, dependencias y ruta crítica. Son cosas distintas y no deben mezclarse.
  planes: [],
  plantillas: [],       // listas reutilizables con desfases relativos a una fecha
  reglas: [],           // automatización: { condicion, acciones } al crear tareas
  riesgos: [],          // riesgos ligeros por proyecto
  lecturas: [],         // cola de lectura con prioridad y notas
  decisiones: [],       // diario de decisiones, incluidas las que no se tomaron
  interrupciones: [],   // { motivo, tareaId, fecha, hora }
  asesorias: [],        // horas de asesoría: { estudiante, fecha, minutos, tema }
  informes: [],         // informes a medida guardados
  // La vida fuera del trabajo (ideas 111-120)
  notas: [],            // notas sueltas y diario: { tipo, titulo, texto, etiquetas }
  colecciones: [],      // definiciones: { nombre, icono, campos: [] }
  fichas: [],           // los registros de esas colecciones
  objetivos: [],        // metas con progreso y revisión
  contadores: [],       // { nombre, unidad, lecturas: [] } para el mantenimiento por uso
  mantenimientos: [],   // servicios que vencen por uso o por tiempo
  gastos: [],           // lo que sale, escrito a mano como los precios
  presupuestos: {},     // límite mensual por categoría
  personas: [],         // cumpleaños, fechas y regalos
  rutinas: [],          // rutinas de mañana y noche, con pasos
  rutinasHechas: [],    // { rutina, fecha, pasos: [] }
  viajes: [],           // fechas, presupuesto y destino
  papelera: [],         // lo borrado espera 30 días antes de irse de verdad
  pomodoro: { config: { ...CONFIG_POMODORO }, estado: null },
  ajustes: {
    tema: 'dark',
    vistaInicio: 'hoy',
    metaDiaria: 5,
    jornada: { inicio: '08:00', fin: '18:00' },
    notificaciones: false,
    resumenMatutino: true,
    horaResumen: '07:00',
    resumenVistoEn: null,
    minutosFinde: 240,
    limiteWIP: 5,
    tresDelDia: null,
    saludPrevia: null,
    primerDiaSemana: 1,
    ordenPorDefecto: 'fecha',
    favoritos: [],
    silencio: { activo: false, desde: '22:00', hasta: '07:00', dias: [] },
    ambiente: { sonido: null, volumen: 0.3 },
    enlaceAlabanza: '../index.html',
  },
};

function clonar(x) {
  return typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x));
}

class Store {
  constructor() {
    this.estado = this.cargar();
    this.oyentes = new Set();
    this.pila = new PilaDeshacer(15);
  }

  /**
   * Guarda una instantánea antes de una operación que se pueda lamentar.
   * Se llama justo antes de cambiar nada; `deshacer()` la devuelve entera.
   */
  instantanea(etiqueta) {
    this.pila.guardar(this.estado, etiqueta);
    return etiqueta;
  }

  deshacer() {
    const paso = this.pila.deshacer();
    if (!paso) return null;
    this.estado = paso.estado;
    this.guardar();
    return paso.etiqueta;
  }

  get puedeDeshacer() { return this.pila.hayAlgo; }

  cargar() {
    try {
      const bruto = localStorage.getItem(CLAVE);
      if (!bruto) return this.estadoDeEstreno();
      const guardado = JSON.parse(bruto);
      return this.fusionar(guardado);
    } catch (err) {
      console.warn('No se pudo leer el almacenamiento; se empieza limpio', err);
      return this.estadoDeEstreno();
    }
  }

  /** Mezcla lo guardado con la forma actual del estado (migración barata). */
  fusionar(guardado) {
    const base = clonar(ESTADO_INICIAL);
    return {
      ...base,
      ...guardado,
      inversiones: { ...base.inversiones, ...(guardado.inversiones || {}), reglas: { ...base.inversiones.reglas, ...(guardado.inversiones?.reglas || {}) } },
      docencia: { ...base.docencia, ...(guardado.docencia || {}) },
      investigacion: { ...base.investigacion, ...(guardado.investigacion || {}) },
      alabanza: { ...base.alabanza, ...(guardado.alabanza || {}) },
      planes: guardado.planes || base.planes,
      plantillas: guardado.plantillas || base.plantillas,
      reglas: guardado.reglas || base.reglas,
      riesgos: guardado.riesgos || base.riesgos,
      lecturas: guardado.lecturas || base.lecturas,
      decisiones: guardado.decisiones || base.decisiones,
      interrupciones: guardado.interrupciones || base.interrupciones,
      asesorias: guardado.asesorias || base.asesorias,
      informes: guardado.informes || base.informes,
      notas: guardado.notas || base.notas,
      colecciones: guardado.colecciones || base.colecciones,
      fichas: guardado.fichas || base.fichas,
      objetivos: guardado.objetivos || base.objetivos,
      contadores: guardado.contadores || base.contadores,
      mantenimientos: guardado.mantenimientos || base.mantenimientos,
      gastos: guardado.gastos || base.gastos,
      presupuestos: { ...base.presupuestos, ...(guardado.presupuestos || {}) },
      personas: guardado.personas || base.personas,
      rutinas: guardado.rutinas || base.rutinas,
      rutinasHechas: guardado.rutinasHechas || base.rutinasHechas,
      viajes: guardado.viajes || base.viajes,
      papelera: purgar(guardado.papelera || [], aISO(hoy())),
      pomodoro: { ...base.pomodoro, ...(guardado.pomodoro || {}), config: { ...base.pomodoro.config, ...(guardado.pomodoro?.config || {}) } },
      ajustes: {
        ...base.ajustes,
        ...(guardado.ajustes || {}),
        jornada: { ...base.ajustes.jornada, ...(guardado.ajustes?.jornada || {}) },
        silencio: { ...base.ajustes.silencio, ...(guardado.ajustes?.silencio || {}) },
        ambiente: { ...base.ajustes.ambiente, ...(guardado.ajustes?.ambiente || {}) },
        favoritos: guardado.ajustes?.favoritos || base.ajustes.favoritos,
      },
    };
  }

  estadoDeEstreno() {
    const base = clonar(ESTADO_INICIAL);
    base.proyectos = clonar(PROYECTOS_EJEMPLO);
    const ayer = aISO(sumarDias(hoy(), -1));
    base.tareas = clonar(TAREAS_EJEMPLO).map((t) => crearTarea({
      ...t,
      fecha: t.fecha || (t.regla ? siguienteFecha(t.regla, ayer) : null),
    }));
    base.filtros = clonar(FILTROS_PREDEFINIDOS);
    base.plantillas = clonar(PLANTILLAS_INICIALES);
    return base;
  }

  guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.estado));
    } catch (err) {
      console.warn('No se pudo guardar (¿almacenamiento lleno o modo privado?)', err);
    }
    this.oyentes.forEach((fn) => fn(this.estado));
  }

  suscribir(fn) { this.oyentes.add(fn); return () => this.oyentes.delete(fn); }

  /* ---------------- tareas ---------------- */

  /** Las tareas vivas: lo archivado sigue guardado pero no estorba. */
  get tareas() { return this.estado.tareas.filter((t) => !t.archivada); }

  /** Todas, incluidas las archivadas: para estadísticas y respaldos. */
  get todasLasTareas() { return this.estado.tareas; }

  tarea(id) { return this.estado.tareas.find((t) => t.id === id) || null; }

  archivar(id, archivada = true) {
    this.instantanea(archivada ? 'Archivar tarea' : 'Desarchivar tarea');
    return this.actualizar(id, { archivada: archivada || undefined });
  }

  /**
   * Crea una tarea. Antes de guardarla pasan las reglas de automatización, y
   * lo que hicieron se devuelve para poder decirlo: una regla que actúa en
   * silencio es una regla en la que se deja de confiar.
   */
  agregar(campos) {
    const conReglas = aplicarReglas({ ...campos }, this.estado.reglas || []);
    if (conReglas.aplicadas.length) {
      for (const r of this.estado.reglas) {
        if (conReglas.aplicadas.includes(r.nombre || r.id)) r.veces = (r.veces || 0) + 1;
      }
    }
    const tarea = crearTarea({ ...conReglas.tarea, orden: Date.now() });
    tarea.reglasAplicadas = conReglas.aplicadas.length ? conReglas.aplicadas : undefined;
    // Una tarea que se repite pero no dice cuándo empieza arranca en su
    // primera ocurrencia; si no, no aparecería en ninguna vista con fecha.
    if (tarea.regla && !tarea.fecha) {
      tarea.fecha = siguienteFecha(tarea.regla, aISO(sumarDias(hoy(), -1)));
    }
    this.estado.tareas.push(tarea);
    this.guardar();
    return tarea;
  }

  actualizar(id, cambios) {
    const t = this.tarea(id);
    if (!t) return null;
    Object.assign(t, cambios);
    this.guardar();
    return t;
  }

  borrar(id) {
    this.instantanea('Borrar tarea');
    // Al borrar un padre se van sus subtareas: no dejamos huérfanas sueltas.
    const fuera = new Set([id]);
    let creció = true;
    while (creció) {
      creció = false;
      for (const t of this.estado.tareas) {
        if (t.padre && fuera.has(t.padre) && !fuera.has(t.id)) { fuera.add(t.id); creció = true; }
      }
    }
    const borradas = this.estado.tareas.filter((t) => fuera.has(t.id));
    for (const t of borradas) this.estado.papelera.push(aPapelera('tarea', t));
    this.estado.tareas = this.estado.tareas.filter((t) => !fuera.has(t.id));
    this.guardar();
    return fuera.size;
  }

  /**
   * Guarda que una tarea va después de otra, comprobando antes que no se cierre
   * un círculo: si A espera a B, B no puede esperar a A.
   */
  dependerDe(id, otraId) {
    const t = this.tarea(id);
    if (!t || id === otraId) return { ok: false, error: 'Una tarea no puede esperarse a sí misma.' };
    if (haríaCiclo(id, otraId, this.estado.tareas)) {
      return { ok: false, error: 'Eso cerraría un círculo: la otra tarea ya depende de esta.' };
    }
    if ((t.dependeDe || []).includes(otraId)) return { ok: true, tarea: t };
    t.dependeDe = [...(t.dependeDe || []), otraId];
    this.guardar();
    return { ok: true, tarea: t };
  }

  quitarDependencia(id, otraId) {
    const t = this.tarea(id);
    if (!t) return null;
    t.dependeDe = (t.dependeDe || []).filter((x) => x !== otraId);
    this.guardar();
    return t;
  }

  /* ---------------- papelera ---------------- */

  restaurarDePapelera(id) {
    const { elemento, papelera } = restaurar(this.estado.papelera, id);
    if (!elemento) return null;
    this.instantanea('Restaurar de la papelera');
    this.estado.papelera = papelera;
    if (elemento.tipo === 'tarea') this.estado.tareas.push(elemento.datos);
    else if (elemento.tipo === 'proyecto') this.estado.proyectos.push(elemento.datos);
    else if (elemento.tipo === 'plan') this.estado.planes.push(elemento.datos);
    else if (elemento.tipo === 'plantilla') this.estado.plantillas.push(elemento.datos);
    this.guardar();
    return elemento;
  }

  vaciarPapelera() {
    this.instantanea('Vaciar la papelera');
    this.estado.papelera = [];
    this.guardar();
  }

  /** Completa (o reabre) una tarea; si se repetía, la reprograma. */
  alternarCompletada(id, hoyISO = aISO(hoy())) {
    const t = this.tarea(id);
    if (!t) return null;
    if (t.completada) {
      t.completada = false;
      t.completadaEn = null;
      this.estado.historial = this.estado.historial.filter((h) => h.tareaId !== t.id || h.fecha !== hoyISO);
      this.guardar();
      return { repetida: false, tarea: t };
    }
    const res = completar(t, hoyISO);
    Object.assign(t, res.tarea);
    this.estado.historial.push(res.historial);
    this.guardar();
    return res;
  }

  /** Mueve una tarea a otra posición dentro de una lista (arrastrar y soltar). */
  reordenar(id, destinoId) {
    const lista = [...this.estado.tareas].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const origen = lista.findIndex((t) => t.id === id);
    const destino = lista.findIndex((t) => t.id === destinoId);
    if (origen < 0 || destino < 0) return;
    const [movida] = lista.splice(origen, 1);
    lista.splice(destino, 0, movida);
    lista.forEach((t, i) => { t.orden = i; });
    this.guardar();
  }

  /** Mover una tarea de día; si se empuja hacia adelante, cuenta como aplazada. */
  aplazar(id, nuevaFecha) {
    const t = this.tarea(id);
    if (!t) return null;
    const cambios = { fecha: nuevaFecha };
    if (esAplazamiento(t.fecha, nuevaFecha)) cambios.aplazamientos = (t.aplazamientos || 0) + 1;
    return this.actualizar(id, cambios);
  }

  /* ---------------- proyectos, filtros, hábitos ---------------- */

  agregarProyecto(nombre, extra = {}) {
    const p = { id: uid('p'), nombre, color: extra.color || '#4a9eff', modulo: extra.modulo || null, favorito: false, ...extra };
    this.estado.proyectos.push(p);
    this.guardar();
    return p;
  }

  borrarProyecto(id) {
    const p = this.estado.proyectos.find((x) => x.id === id);
    this.instantanea('Borrar proyecto');
    if (p) this.estado.papelera.push(aPapelera('proyecto', p));
    this.estado.proyectos = this.estado.proyectos.filter((x) => x.id !== id);
    if (p) for (const t of this.estado.tareas) if (t.proyecto === p.nombre) t.proyecto = null;
    this.guardar();
  }

  agregarFiltro(nombre, expresion) {
    const f = { id: uid('f'), nombre, expresion, icono: '🔎' };
    this.estado.filtros.push(f);
    this.guardar();
    return f;
  }

  borrarFiltro(id) {
    this.estado.filtros = this.estado.filtros.filter((f) => f.id !== id);
    this.guardar();
  }

  agregarHabito(nombre, icono = '✅') {
    const h = { id: uid('h'), nombre, icono, dias: [] };
    this.estado.habitos.push(h);
    this.guardar();
    return h;
  }

  marcarHabito(id, diaISO = aISO(hoy())) {
    const h = this.estado.habitos.find((x) => x.id === id);
    if (!h) return;
    h.dias = h.dias.includes(diaISO) ? h.dias.filter((d) => d !== diaISO) : [...h.dias, diaISO];
    this.guardar();
  }

  /* ---------------- tiempo ---------------- */

  registrarTiempo(registro) {
    this.estado.tiempo.push({ id: uid('r'), ...registro });
    // El tiempo también se acumula en la tarea, para verlo sin salir de ella.
    if (registro.tareaId) {
      const t = this.tarea(registro.tareaId);
      if (t) t.tiempoDedicado = (t.tiempoDedicado || 0) + (registro.minutos || 0);
    }
    this.guardar();
  }

  guardarConfigPomodoro(config) {
    this.estado.pomodoro.config = { ...this.estado.pomodoro.config, ...config };
    this.guardar();
  }

  /* ---------------- módulos de trabajo ---------------- */

  actualizarModulo(modulo, datos) {
    this.estado[modulo] = { ...this.estado[modulo], ...datos };
    this.guardar();
  }

  /**
   * Inserta tareas generadas por un módulo sin duplicar: cada una lleva una
   * clave estable (origen + título + fecha) y las que ya existen se saltan.
   */
  sembrarTareas(generadas = [], origen = 'modulo') {
    const existentes = new Set(this.estado.tareas.map((t) => t.clave).filter(Boolean));
    let nuevas = 0;
    for (const g of generadas) {
      const clave = `${origen}:${g.titulo}:${g.fecha || 'sin-fecha'}`;
      if (existentes.has(clave)) continue;
      const fecha = g.fecha || (g.regla ? siguienteFecha(g.regla, aISO(sumarDias(hoy(), -1))) : null);
      this.estado.tareas.push(crearTarea({ ...g, fecha, clave, orden: Date.now() + nuevas }));
      existentes.add(clave);
      nuevas++;
    }
    if (nuevas) this.guardar();
    return nuevas;
  }

  /* ---------------- proyectos ---------------- */

  agregarPlan(plan) {
    this.estado.planes.push(plan);
    this.guardar();
    return plan;
  }

  borrarPlan(id) {
    const plan = this.estado.planes.find((p) => p.id === id);
    this.instantanea('Borrar plan de proyecto');
    if (plan) this.estado.papelera.push(aPapelera('plan', plan));
    this.estado.planes = this.estado.planes.filter((p) => p.id !== id);
    this.guardar();
  }

  /* ---------------- plantillas de listas ---------------- */

  agregarPlantilla(plantilla) {
    this.estado.plantillas.push(plantilla);
    this.guardar();
    return plantilla;
  }

  borrarPlantilla(id) {
    const plantilla = this.estado.plantillas.find((p) => p.id === id);
    this.instantanea('Borrar plantilla');
    if (plantilla) this.estado.papelera.push(aPapelera('plantilla', plantilla));
    this.estado.plantillas = this.estado.plantillas.filter((p) => p.id !== id);
    this.guardar();
  }

  /* ---------------- ola 3: reglas, riesgos, lecturas, decisiones ---------------- */

  /** Alta y baja genéricas para las listas simples del estado. */
  agregarEn(lista, elemento) {
    if (!Array.isArray(this.estado[lista])) this.estado[lista] = [];
    this.estado[lista].push(elemento);
    this.guardar();
    return elemento;
  }

  actualizarEn(lista, id, cambios) {
    const item = (this.estado[lista] || []).find((x) => x.id === id);
    if (!item) return null;
    Object.assign(item, cambios);
    this.guardar();
    return item;
  }

  borrarEn(lista, id) {
    this.instantanea('Borrar elemento');
    this.estado[lista] = (this.estado[lista] || []).filter((x) => x.id !== id);
    this.guardar();
  }

  /** Apunta una interrupción: un botón, cero fricción, o no se usa. */
  anotarInterrupcion(registro) {
    return this.agregarEn('interrupciones', registro);
  }

  /** Vistas fijadas en la barra lateral. */
  alternarFavorito(ruta) {
    const actuales = this.estado.ajustes.favoritos || [];
    const favoritos = actuales.includes(ruta) ? actuales.filter((r) => r !== ruta) : [...actuales, ruta];
    this.ajustar({ favoritos });
    return favoritos;
  }

  /** Secciones de un proyecto: fases sin crear subproyectos. */
  secciones(nombreProyecto) {
    const p = this.estado.proyectos.find((x) => x.nombre === nombreProyecto);
    return p?.secciones || [];
  }

  agregarSeccion(nombreProyecto, nombre) {
    const p = this.estado.proyectos.find((x) => x.nombre === nombreProyecto);
    if (!p) return null;
    p.secciones = [...(p.secciones || []), nombre];
    this.guardar();
    return p.secciones;
  }

  borrarSeccion(nombreProyecto, nombre) {
    const p = this.estado.proyectos.find((x) => x.nombre === nombreProyecto);
    if (!p) return;
    this.instantanea('Borrar sección');
    p.secciones = (p.secciones || []).filter((s) => s !== nombre);
    // Las tareas de la sección no se borran: vuelven al cuerpo del proyecto.
    for (const t of this.estado.tareas) if (t.proyecto === nombreProyecto && t.seccion === nombre) t.seccion = null;
    this.guardar();
  }

  /* ---------------- ola 4: la vida fuera del trabajo ---------------- */

  /** Guarda una nota nueva o los cambios de una que ya existe. */
  guardarNota(nota) {
    const i = this.estado.notas.findIndex((n) => n.id === nota.id);
    const conFecha = { ...nota, actualizadaEn: new Date().toISOString() };
    if (i === -1) this.estado.notas.push(conFecha);
    else this.estado.notas[i] = conFecha;
    this.guardar();
    return conFecha;
  }

  /** Borrar una colección se lleva sus fichas: no dejamos fichas huérfanas. */
  borrarColeccion(id) {
    this.instantanea('Borrar colección');
    this.estado.colecciones = this.estado.colecciones.filter((c) => c.id !== id);
    this.estado.fichas = this.estado.fichas.filter((f) => f.coleccion !== id);
    this.guardar();
  }

  /** Cambia un valor de una ficha sin tocar los demás. */
  actualizarFicha(id, campoId, valor) {
    const ficha = this.estado.fichas.find((f) => f.id === id);
    if (!ficha) return null;
    ficha.valores = { ...ficha.valores, [campoId]: valor };
    this.guardar();
    return ficha;
  }

  /** Apunta una lectura del contador; devuelve el error si el número no cuadra. */
  registrarLectura(contadorId, valor, fechaISO) {
    const i = this.estado.contadores.findIndex((c) => c.id === contadorId);
    if (i === -1) return { ok: false, error: 'Ese contador ya no existe.' };
    const r = registrarLectura(this.estado.contadores[i], valor, fechaISO);
    if (!r.ok) return r;
    this.estado.contadores[i] = r.contador;
    this.guardar();
    return r;
  }

  marcarServicioHecho(servicioId, hoyISO) {
    const i = this.estado.mantenimientos.findIndex((s) => s.id === servicioId);
    if (i === -1) return null;
    const contador = this.estado.contadores.find((c) => c.id === this.estado.mantenimientos[i].contador);
    this.estado.mantenimientos[i] = marcarHecho(this.estado.mantenimientos[i], contador, hoyISO);
    this.guardar();
    return this.estado.mantenimientos[i];
  }

  /** Marca o desmarca un paso de una rutina en un día. */
  alternarPasoRutina(rutinaId, pasoId, diaISO) {
    this.estado.rutinasHechas = alternarPaso(this.estado.rutinasHechas, rutinaId, pasoId, diaISO);
    this.guardar();
  }

  ponerPresupuesto(categoria, importe) {
    const limites = { ...this.estado.presupuestos };
    if (importe) limites[categoria] = Number(importe);
    else delete limites[categoria];
    this.estado.presupuestos = limites;
    this.guardar();
  }

  /* ---------------- ajustes y respaldo ---------------- */

  ajustar(cambios) {
    this.estado.ajustes = { ...this.estado.ajustes, ...cambios };
    this.guardar();
  }

  exportar() {
    return JSON.stringify({ ...this.estado, exportadoEn: new Date().toISOString() }, null, 2);
  }

  importar(texto, modo = 'reemplazar') {
    const datos = JSON.parse(texto);
    if (!datos || typeof datos !== 'object') throw new Error('El archivo no tiene el formato esperado.');
    if (modo === 'fusionar') {
      const ids = new Set(this.estado.tareas.map((t) => t.id));
      const nuevas = (datos.tareas || []).filter((t) => !ids.has(t.id));
      this.estado.tareas.push(...nuevas.map((t) => crearTarea(t)));
      this.estado.historial.push(...(datos.historial || []));
      this.guardar();
      return nuevas.length;
    }
    this.estado = this.fusionar(datos);
    this.guardar();
    return (datos.tareas || []).length;
  }

  vaciar() {
    this.instantanea('Vaciar la app entera');
    this.estado = clonar(ESTADO_INICIAL);
    this.estado.filtros = clonar(FILTROS_PREDEFINIDOS);
    this.estado.plantillas = clonar(PLANTILLAS_INICIALES);
    this.guardar();
  }
}

export const store = new Store();
