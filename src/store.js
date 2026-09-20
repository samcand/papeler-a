/**
 * store.js — Todo vive en este dispositivo (localStorage).
 *
 * No hay servidor ni cuentas: los datos de nómina son sensibles y no tienen
 * por qué salir del computador de quien liquida. Para respaldar o pasar a otro
 * equipo está Exportar/Importar en Ajustes.
 */

const CLAVE = 'nomina.co.v1';

export const ESTADO_INICIAL = {
  version: 1,
  empresa: {
    nombre: '',
    nit: '',
    ciudad: '',
    claseArl: 'I',
    nivelArl: 'media',
    exonerado: true,
    aportaCaja: true,
    diaDescanso: 0,
  },
  empleados: [],
  contratos: [],
  novedades: {},     // { [contratoId]: { 'YYYY-MM-DD': novedad } }
  nominas: [],       // periodos liquidados y pagados
  liquidaciones: [], // liquidaciones finales
  documentos: [],    // cartas y constancias generadas, con su firma
  bitacora: [],      // novedades normativas registradas a mano
  ajustes: {
    proxy: '',
    fuentesExtra: [],
    ultimaRevision: '',
    tema: 'oscuro',
  },
};

export function uid(prefijo = 'id') {
  return `${prefijo}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

class Store {
  constructor() {
    this.estado = this.cargar();
    this.oyentes = new Set();
  }

  cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return structuredClone(ESTADO_INICIAL);
      const guardado = JSON.parse(crudo);
      return { ...structuredClone(ESTADO_INICIAL), ...guardado };
    } catch (error) {
      console.warn('No se pudo leer lo guardado, se empieza de cero.', error);
      return structuredClone(ESTADO_INICIAL);
    }
  }

  guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.estado));
    } catch (error) {
      console.warn('No se pudo guardar.', error);
    }
    for (const oyente of this.oyentes) oyente(this.estado);
  }

  suscribir(fn) {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  // ——— Empresa ———
  actualizarEmpresa(datos) {
    this.estado.empresa = { ...this.estado.empresa, ...datos };
    this.guardar();
  }

  // ——— Empleados ———
  empleados() {
    return this.estado.empleados;
  }

  empleado(id) {
    return this.estado.empleados.find((e) => e.id === id) || null;
  }

  guardarEmpleado(datos) {
    if (datos.id) {
      const i = this.estado.empleados.findIndex((e) => e.id === datos.id);
      if (i >= 0) this.estado.empleados[i] = { ...this.estado.empleados[i], ...datos };
    } else {
      this.estado.empleados.push({ id: uid('emp'), activo: true, ...datos });
    }
    this.guardar();
    return this.estado.empleados[this.estado.empleados.length - 1];
  }

  borrarEmpleado(id) {
    this.estado.empleados = this.estado.empleados.filter((e) => e.id !== id);
    const contratos = this.estado.contratos.filter((c) => c.empleadoId === id);
    for (const c of contratos) delete this.estado.novedades[c.id];
    this.estado.contratos = this.estado.contratos.filter((c) => c.empleadoId !== id);
    this.guardar();
  }

  // ——— Contratos ———
  contratos(empleadoId = null) {
    return this.estado.contratos.filter((c) => !empleadoId || c.empleadoId === empleadoId);
  }

  contrato(id) {
    return this.estado.contratos.find((c) => c.id === id) || null;
  }

  contratosActivos() {
    return this.estado.contratos.filter((c) => c.estado !== 'terminado');
  }

  guardarContrato(datos) {
    if (datos.id) {
      const i = this.estado.contratos.findIndex((c) => c.id === datos.id);
      if (i >= 0) this.estado.contratos[i] = { ...this.estado.contratos[i], ...datos };
    } else {
      this.estado.contratos.push({ id: uid('con'), estado: 'activo', ...datos });
    }
    this.guardar();
    return this.estado.contratos[this.estado.contratos.length - 1];
  }

  borrarContrato(id) {
    this.estado.contratos = this.estado.contratos.filter((c) => c.id !== id);
    delete this.estado.novedades[id];
    this.guardar();
  }

  // ——— Novedades (el día a día) ———
  novedades(contratoId) {
    return this.estado.novedades[contratoId] || {};
  }

  guardarNovedad(contratoId, fecha, novedad) {
    if (!this.estado.novedades[contratoId]) this.estado.novedades[contratoId] = {};
    if (novedad === null) delete this.estado.novedades[contratoId][fecha];
    else this.estado.novedades[contratoId][fecha] = novedad;
    this.guardar();
  }

  /** Aplica una novedad a un rango de fechas de una sola vez. */
  guardarNovedadesRango(contratoId, desde, hasta, novedad) {
    if (!this.estado.novedades[contratoId]) this.estado.novedades[contratoId] = {};
    let cursor = desde;
    let guarda = 0;
    while (cursor <= hasta && guarda++ < 400) {
      if (novedad === null) delete this.estado.novedades[contratoId][cursor];
      else this.estado.novedades[contratoId][cursor] = { ...novedad };
      const d = new Date(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)) - 1, Number(cursor.slice(8, 10)) + 1, 12);
      const p = (n) => String(n).padStart(2, '0');
      cursor = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
    this.guardar();
  }

  // ——— Nóminas pagadas ———
  nominas(contratoId = null) {
    return this.estado.nominas.filter((n) => !contratoId || n.contratoId === contratoId);
  }

  registrarNomina(registro) {
    const existente = this.estado.nominas.findIndex(
      (n) => n.contratoId === registro.contratoId && n.desde === registro.desde && n.hasta === registro.hasta,
    );
    const fila = { id: registro.id || uid('nom'), ...registro };
    if (existente >= 0) this.estado.nominas[existente] = { ...this.estado.nominas[existente], ...fila };
    else this.estado.nominas.push(fila);
    this.guardar();
    return fila;
  }

  borrarNomina(id) {
    this.estado.nominas = this.estado.nominas.filter((n) => n.id !== id);
    this.guardar();
  }

  // ——— Liquidaciones finales ———
  registrarLiquidacion(registro) {
    const fila = { id: registro.id || uid('liq'), ...registro };
    const i = this.estado.liquidaciones.findIndex((l) => l.id === fila.id);
    if (i >= 0) this.estado.liquidaciones[i] = fila;
    else this.estado.liquidaciones.push(fila);
    this.guardar();
    return fila;
  }

  // ——— Documentos del ciclo del empleado ———
  documentos(contratoId = null) {
    return this.estado.documentos.filter((d) => !contratoId || d.contratoId === contratoId);
  }

  documento(id) {
    return this.estado.documentos.find((d) => d.id === id) || null;
  }

  guardarDocumento(registro) {
    const fila = { id: registro.id || uid('doc'), creado: new Date().toISOString(), ...registro };
    const i = this.estado.documentos.findIndex((d) => d.id === fila.id);
    if (i >= 0) this.estado.documentos[i] = { ...this.estado.documentos[i], ...fila };
    else this.estado.documentos.unshift(fila);
    this.guardar();
    return fila;
  }

  borrarDocumento(id) {
    this.estado.documentos = this.estado.documentos.filter((d) => d.id !== id);
    this.guardar();
  }

  // ——— Bitácora normativa ———
  agregarBitacora(entrada) {
    this.estado.bitacora.unshift({ id: uid('nota'), ...entrada });
    this.guardar();
  }

  actualizarBitacora(id, datos) {
    const i = this.estado.bitacora.findIndex((b) => b.id === id);
    if (i >= 0) {
      this.estado.bitacora[i] = { ...this.estado.bitacora[i], ...datos };
      this.guardar();
    }
  }

  borrarBitacora(id) {
    this.estado.bitacora = this.estado.bitacora.filter((b) => b.id !== id);
    this.guardar();
  }

  // ——— Ajustes y respaldo ———
  actualizarAjustes(datos) {
    this.estado.ajustes = { ...this.estado.ajustes, ...datos };
    this.guardar();
  }

  exportar() {
    return JSON.stringify(this.estado, null, 2);
  }

  importar(texto) {
    const datos = JSON.parse(texto);
    if (!datos || typeof datos !== 'object') throw new Error('El archivo no tiene el formato esperado.');
    this.estado = { ...structuredClone(ESTADO_INICIAL), ...datos };
    this.guardar();
  }

  limpiar() {
    this.estado = structuredClone(ESTADO_INICIAL);
    this.guardar();
  }
}

export const store = new Store();
export default store;
