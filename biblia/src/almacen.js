/**
 * almacen.js — Lo tuyo: notas, resaltados, marcadores, progreso y ajustes.
 *
 * Todo vive en este dispositivo (localStorage). No hay cuentas ni servidor.
 * Usa "Exportar respaldo" en Ajustes para guardarlo o pasarlo a otro equipo.
 */

import { nuevoId, borrarTramo } from './marcas.js';

const CLAVE = 'estudio-biblico.v1';

const INICIAL = {
  version: 1,
  notas: [],       // ver notas.js
  marcas: [],      // ver marcas.js
  marcadores: [],  // { id, desde, hasta, carpeta, creado }
  leidos: [],      // capítulos leídos: "b.c"
  historial: [],   // últimos pasajes abiertos: claves "b.c.v"
  plan: null,      // { id, inicio, hechos: [dias] }
  posicion: { b: 43, c: 1, v: null },
  ajustes: {
    tema: 'oscuro',          // 'oscuro' | 'claro' | 'sepia'
    letra: 19,
    fuente: 'serif',         // 'serif' | 'sans'
    principal: 'rv1909',
    paralelas: [],           // otras versiones en columnas: ['kjv', 'original']
    modo: 'versos',          // 'versos' (uno por línea) | 'parrafo'
    votos: 5,                // referencias cruzadas con al menos estos votos
    panel: true,             // panel de estudio visible
    color: 'amarillo',
    estilo: 'resaltar',
  },
};

class Almacen {
  constructor() {
    this.estado = this.cargar();
    this.oyentes = new Set();
    this.deshacer = [];
  }

  cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return structuredClone(INICIAL);
      return mezclar(JSON.parse(crudo));
    } catch (e) {
      console.warn('No se pudo leer lo guardado; se empieza en limpio', e);
      return structuredClone(INICIAL);
    }
  }

  guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.estado));
    } catch (e) {
      console.error(e);
      alert('No se pudo guardar: el almacenamiento del navegador está lleno. Exporta un respaldo.');
    }
    for (const f of this.oyentes) f(this.estado);
  }

  alCambiar(f) { this.oyentes.add(f); return () => this.oyentes.delete(f); }

  /** Guarda una copia para poder deshacer el último cambio de marcas o notas. */
  punto() {
    this.deshacer.push(JSON.stringify({ notas: this.estado.notas, marcas: this.estado.marcas, marcadores: this.estado.marcadores }));
    if (this.deshacer.length > 30) this.deshacer.shift();
  }

  hayDeshacer() { return this.deshacer.length > 0; }

  deshacerUltimo() {
    const previo = this.deshacer.pop();
    if (!previo) return false;
    Object.assign(this.estado, JSON.parse(previo));
    this.guardar();
    return true;
  }

  get ajustes() { return this.estado.ajustes; }
  ajustar(cambios) { Object.assign(this.estado.ajustes, cambios); this.guardar(); }

  // ---------- Marcas ----------
  agregarMarca(marca) { this.punto(); this.estado.marcas.push(marca); this.guardar(); }
  quitarMarca(id) { this.punto(); this.estado.marcas = this.estado.marcas.filter((m) => m.id !== id); this.guardar(); }
  borrarTramo(version, desde, hasta) {
    this.punto();
    this.estado.marcas = borrarTramo(this.estado.marcas, version, desde, hasta);
    this.guardar();
  }
  cambiarMarca(id, cambios) {
    const m = this.estado.marcas.find((x) => x.id === id);
    if (m) { this.punto(); Object.assign(m, cambios); this.guardar(); }
  }

  // ---------- Notas ----------
  guardarNota(nota) {
    this.punto();
    const ahora = Date.now();
    const existente = this.estado.notas.find((n) => n.id === nota.id);
    if (existente) Object.assign(existente, nota, { editada: ahora });
    else this.estado.notas.push({ id: nuevoId('n'), etiquetas: [], creada: ahora, ...nota, editada: ahora });
    this.guardar();
    return existente || this.estado.notas[this.estado.notas.length - 1];
  }
  borrarNota(id) { this.punto(); this.estado.notas = this.estado.notas.filter((n) => n.id !== id); this.guardar(); }

  // ---------- Marcadores ----------
  alternarMarcador(desde, hasta = desde) {
    this.punto();
    const i = this.estado.marcadores.findIndex((m) => m.desde === desde && m.hasta === hasta);
    if (i >= 0) this.estado.marcadores.splice(i, 1);
    else this.estado.marcadores.push({ id: nuevoId('b'), desde, hasta, carpeta: '', creado: Date.now() });
    this.guardar();
    return i < 0;
  }
  tieneMarcador(id) { return this.estado.marcadores.some((m) => m.desde <= id && m.hasta >= id); }

  // ---------- Lectura ----------
  irA(b, c, v = null) {
    this.estado.posicion = { b, c, v };
    const clave = `${b}.${c}`;
    this.estado.historial = [clave, ...this.estado.historial.filter((h) => h !== clave)].slice(0, 30);
    this.guardar();
  }
  alternarLeido(b, c) {
    const clave = `${b}.${c}`;
    const leidos = new Set(this.estado.leidos);
    if (leidos.has(clave)) leidos.delete(clave); else leidos.add(clave);
    this.estado.leidos = [...leidos];
    this.guardar();
    return leidos.has(clave);
  }
  leido(b, c) { return this.estado.leidos.includes(`${b}.${c}`); }

  // ---------- Plan ----------
  empezarPlan(id) { this.estado.plan = { id, inicio: new Date().toISOString(), hechos: [] }; this.guardar(); }
  dejarPlan() { this.estado.plan = null; this.guardar(); }
  alternarDia(dia) {
    const p = this.estado.plan;
    if (!p) return;
    p.hechos = p.hechos.includes(dia) ? p.hechos.filter((d) => d !== dia) : [...p.hechos, dia];
    this.guardar();
  }

  // ---------- Respaldo ----------
  exportar() {
    return JSON.stringify({ app: 'estudio-biblico', exportado: new Date().toISOString(), ...this.estado }, null, 1);
  }

  /** Importa un respaldo. `reemplazar` borra lo actual; si no, suma sin duplicar. */
  importar(texto, { reemplazar = false } = {}) {
    const datos = JSON.parse(texto);
    if (datos.app !== 'estudio-biblico') throw new Error('Este archivo no es un respaldo de Estudio Bíblico');
    this.punto();
    if (reemplazar) {
      this.estado = mezclar(datos);
    } else {
      const unir = (actual, nuevos) => {
        const ids = new Set(actual.map((x) => x.id));
        return [...actual, ...(nuevos || []).filter((x) => !ids.has(x.id))];
      };
      this.estado.notas = unir(this.estado.notas, datos.notas);
      this.estado.marcas = unir(this.estado.marcas, datos.marcas);
      this.estado.marcadores = unir(this.estado.marcadores, datos.marcadores);
      this.estado.leidos = [...new Set([...this.estado.leidos, ...(datos.leidos || [])])];
    }
    this.guardar();
    return { notas: datos.notas?.length || 0, marcas: datos.marcas?.length || 0, marcadores: datos.marcadores?.length || 0 };
  }

  borrarTodo() { this.punto(); this.estado = structuredClone(INICIAL); this.guardar(); }
}

function mezclar(datos) {
  const base = structuredClone(INICIAL);
  const salida = { ...base, ...datos, ajustes: { ...base.ajustes, ...(datos.ajustes || {}) } };
  delete salida.app;
  delete salida.exportado;
  return salida;
}

export const almacen = new Almacen();
