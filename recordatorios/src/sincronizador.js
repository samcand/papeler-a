/**
 * sincronizador.js — Cuándo sincronizar, y que no se note.
 *
 * `nube.js` sabe *cómo* sincronizar; esto decide *cuándo*, y se encarga de que
 * la app siga respondiendo mientras tanto:
 *
 *   - al abrir la app (o al volver a ella desde otra pestaña),
 *   - unos segundos después de cambiar algo, cuando paras de escribir,
 *   - al recuperar la conexión,
 *   - y cuando lo pides a mano.
 *
 * Lo que no hace, a propósito: sincronizar en cada tecla. Subir y bajar en
 * cada letra gasta batería, choca consigo mismo y no sirve de nada; lo que se
 * escribe ya está guardado aquí desde el primer momento.
 *
 * Si no hay conexión no pasa nada malo: se apunta el error, la app sigue
 * entera y lo pendiente sube en cuanto vuelva la red.
 */

import { configurada, guardarConfig, leerConfig, sincronizar } from './nube.js';
import { store } from './store.js';

/** Cuánto se espera desde el último cambio antes de subir. */
export const ESPERA_MS = 8000;

class Sincronizador {
  constructor() {
    this.config = leerConfig();
    this.estado = 'apagada';      // apagada | lista | sincronizando | error
    this.oyentes = new Set();
    this.temporizador = null;
    this.aplicando = false;       // para no reaccionar a nuestros propios cambios
    this.iniciado = false;
  }

  suscribir(fn) { this.oyentes.add(fn); return () => this.oyentes.delete(fn); }

  avisar() { this.oyentes.forEach((fn) => fn(this)); }

  get activa() { return !!this.config.encendida && configurada(this.config); }

  guardar(cambios = {}) {
    this.config = guardarConfig({ ...this.config, ...cambios });
    this.estado = this.activa ? (this.config.ultimoError ? 'error' : 'lista') : 'apagada';
    this.avisar();
    return this.config;
  }

  /** Se llama una vez, al arrancar la app. */
  iniciar() {
    if (this.iniciado || typeof window === 'undefined') return;
    this.iniciado = true;

    store.suscribir(() => { if (!this.aplicando) this.pronto(); });
    window.addEventListener('online', () => this.ahora('volvió la conexión'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.ahora('volviste a la app');
    });
    // Al cerrar la pestaña no da tiempo a subir: se queda para la próxima.
    this.ahora('al abrir');
  }

  /** Sincroniza cuando pare la mano, no en cada tecla. */
  pronto() {
    if (!this.activa) return;
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.ahora('cambiaste algo'), ESPERA_MS);
  }

  /**
   * El intento de verdad. Nunca lanza: los problemas de red se cuentan por la
   * pantalla, no rompen lo que estabas haciendo.
   */
  async ahora(motivo = 'a mano') {
    if (!this.activa || this.estado === 'sincronizando') return null;
    clearTimeout(this.temporizador);
    this.estado = 'sincronizando';
    this.avisar();

    try {
      const r = await sincronizar(this.config, store.estado);
      this.aplicando = true;
      // Solo se toca el estado si de verdad bajó algo: repintar por gusto
      // saca el cursor del campo en el que estás escribiendo.
      if (r.bajado && r.cuenta && (r.cuenta.nuevas || r.cuenta.actualizadas || r.cuenta.borradas || r.cuenta.registros)) {
        store.reemplazarEstado(r.estado);
      }
      this.aplicando = false;
      this.guardar({ version: r.version, ultima: new Date().toISOString(), ultimoError: null });
      this.estado = 'lista';
      this.avisar();
      return { ...r, motivo };
    } catch (error) {
      this.aplicando = false;
      this.guardar({ ultimoError: mensaje(error) });
      this.estado = 'error';
      this.avisar();
      return null;
    }
  }

  apagar() {
    clearTimeout(this.temporizador);
    return this.guardar({ encendida: false });
  }
}

/** Los fallos de red del navegador no dicen nada útil: se traducen. */
function mensaje(error) {
  const texto = String(error?.message || error);
  if (/failed to fetch|networkerror|load failed/i.test(texto)) {
    return 'Sin conexión: se guardó aquí y subirá luego.';
  }
  return texto;
}

export const sincronizador = new Sincronizador();
