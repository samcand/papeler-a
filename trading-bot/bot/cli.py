"""Interfaz de linea de comandos.

    python -m bot recomendar          # que haria el bot ahora, sin tocar nada
    python -m bot backtest            # como le habria ido en el historico
    python -m bot puerta              # si la estrategia esta autorizada a operar
    python -m bot ejecutar            # bucle de operativa (simulada por defecto)
    python -m bot estado              # posiciones y saldo
    python -m bot freno on|off        # parada de emergencia
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import List, Optional

from .backtest import Backtest
from .config import Config, ErrorDeConfiguracion
from .gate import evaluar_puerta
from .marketdata import cargar_csv, descargar_velas, guardar_csv
from .state import Estado
from .strategies import construir_estrategia
from .trader import Trader

AVISO_REAL = """
==========================  ATENCION  ==========================
Modo LIVE: las ordenes son reales y el dinero tambien.

Antes de seguir, comprueba que:
  - has corrido el bot en modo paper el tiempo suficiente,
  - la puerta del backtest esta habilitada y aprobada,
  - la clave de API NO tiene permiso de retiro,
  - sabes donde esta el archivo de freno de emergencia.
================================================================
"""


def _formatear_metricas(metricas: dict) -> str:
    if "error" in metricas:
        return f"  {metricas['error']}"
    etiquetas = [
        ("capital_inicial", "Capital inicial"),
        ("capital_final", "Capital final"),
        ("retorno_total_pct", "Retorno total %"),
        ("comprar_y_mantener_pct", "Comprar y mantener %"),
        ("max_drawdown_pct", "Caida maxima %"),
        ("operaciones", "Operaciones"),
        ("ganadoras", "Ganadoras"),
        ("perdedoras", "Perdedoras"),
        ("tasa_acierto_pct", "Acierto %"),
        ("factor_beneficio", "Factor de beneficio"),
        ("ganancia_media", "Ganancia media"),
        ("perdida_media", "Perdida media"),
        ("mejor_operacion", "Mejor operacion"),
        ("peor_operacion", "Peor operacion"),
        ("comisiones_totales", "Comisiones"),
        ("exposicion_pct", "Tiempo en mercado %"),
        ("sharpe", "Sharpe anualizado"),
        ("velas_analizadas", "Velas analizadas"),
    ]
    lineas = []
    for clave, etiqueta in etiquetas:
        if clave in metricas:
            valor = metricas[clave]
            if valor == float("inf"):
                valor = "infinito (ninguna operacion perdedora)"
            lineas.append(f"  {etiqueta:<24} {valor}")
    return "\n".join(lineas)


def _cargar_config(args) -> Config:
    if args.config and os.path.exists(args.config):
        return Config.desde_archivo(args.config)
    if args.config and args.config != "config.yaml":
        raise ErrorDeConfiguracion(f"No existe {args.config}")
    print("[aviso] No hay config.yaml; se usan los valores por defecto (modo paper).")
    return Config()


# -- comandos -------------------------------------------------------------
def cmd_recomendar(args, cfg: Config) -> int:
    trader = Trader(cfg, carpeta=args.carpeta)
    simbolos = [args.simbolo.upper()] if args.simbolo else trader.simbolos
    for simbolo in simbolos:
        informe = trader.recomendar(simbolo)
        print(informe.texto())
        print()
    return 0


def cmd_backtest(args, cfg: Config) -> int:
    estrategia = construir_estrategia(cfg, usar_llm=args.con_ia)
    simbolos = [args.simbolo.upper()] if args.simbolo else [
        str(s).upper() for s in cfg.get("mercado.simbolos", [])
    ]
    for simbolo in simbolos:
        if args.csv:
            velas = cargar_csv(args.csv, simbolo, str(cfg.get("mercado.intervalo", "1h")))
        else:
            velas = descargar_velas(
                simbolo,
                intervalo=str(cfg.get("mercado.intervalo", "1h")),
                cantidad=int(args.velas or cfg.get("backtest.velas", 1500)),
            )
        if args.guardar_csv:
            guardar_csv(velas, args.guardar_csv)
            print(f"Velas guardadas en {args.guardar_csv}")

        resultado = Backtest(cfg, estrategia).ejecutar(velas)
        print(f"\n=== Backtest {simbolo} {velas.intervalo} ({resultado.desde} -> {resultado.hasta}) ===")
        print(_formatear_metricas(resultado.metricas))
        puerta = evaluar_puerta(cfg, resultado)
        print(f"\n  Puerta: {puerta.resumen()}")
        if args.json:
            with open(args.json, "w", encoding="utf-8") as archivo:
                json.dump(resultado.como_dict(), archivo, indent=2, ensure_ascii=False, default=str)
            print(f"  Detalle guardado en {args.json}")
    return 0


def cmd_puerta(args, cfg: Config) -> int:
    trader = Trader(cfg, carpeta=args.carpeta, usar_llm=False)
    for simbolo in trader.simbolos:
        puerta = trader.revisar_puerta(simbolo, forzar=args.forzar)
        print(puerta.resumen())
        print(_formatear_metricas(puerta.metricas))
        print()
    return 0


def cmd_ejecutar(args, cfg: Config) -> int:
    if cfg.es_live:
        print(AVISO_REAL)
        if not args.confirmo_riesgo_real:
            print(
                "La configuracion dice modo: live. Para operar con dinero real hay que "
                "anadir la bandera --confirmo-riesgo-real.\n"
                "Sin esa bandera el bot no manda ninguna orden."
            )
            return 2
        if not bool(cfg.get("puerta.habilitada", True)):
            print(
                "Te has quedado sin red: puerta.habilitada es false en modo live. "
                "Vuelve a activarla antes de operar en real."
            )
            return 2
        if not bool(cfg.get("exchange.testnet", True)):
            print("Operando contra Binance PRODUCCION.\n")
    trader = Trader(cfg, carpeta=args.carpeta)
    trader.bucle(ciclos=args.ciclos)
    return 0


def cmd_estado(args, cfg: Config) -> int:
    estado = Estado(os.path.join(args.carpeta, str(cfg.get("ejecucion.archivo_estado", "estado.json"))))
    posiciones = estado.datos.get("posiciones", {})
    print(f"Modo: {cfg.get('modo')}")
    print(f"Cartera simulada: {estado.datos.get('paper', {})}")
    print(f"Riesgo: {estado.datos.get('riesgo', {})}")
    if not posiciones:
        print("Sin posiciones abiertas.")
    for simbolo, posicion in posiciones.items():
        print(
            f"  {simbolo}: {posicion['cantidad']:.8f} @ {posicion['precio']:.4f} "
            f"stop {posicion['stop']:.4f} objetivo {posicion['objetivo']:.4f}"
        )
    for simbolo, puerta in (estado.datos.get("puertas", {}) or {}).items():
        marca = "APROBADA" if puerta.get("aprobada") else "RECHAZADA"
        print(f"  puerta {simbolo}: {marca} {'; '.join(puerta.get('fallos', []))}")
    historial = estado.datos.get("historial", [])
    if historial:
        print("\nUltimas operaciones:")
        for entrada in historial[-10:]:
            print(
                f"  {entrada['momento']} {entrada['lado']} {entrada['simbolo']} "
                f"{entrada['cantidad']:.8f} @ {entrada['precio']:.4f} pnl {entrada['pnl']:+.2f}"
            )
    return 0


def cmd_freno(args, cfg: Config) -> int:
    ruta = os.path.join(args.carpeta, str(cfg.get("riesgo.archivo_freno", "FRENO_DE_EMERGENCIA")))
    if args.accion == "on":
        with open(ruta, "w", encoding="utf-8") as archivo:
            archivo.write("Freno activado a mano. Borra este archivo para reanudar.\n")
        print(f"Freno ACTIVADO ({ruta}). El bot no abrira nuevas posiciones.")
    else:
        if os.path.exists(ruta):
            os.remove(ruta)
            print("Freno desactivado.")
        else:
            print("El freno no estaba activado.")
    return 0


def construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="bot", description="Bot de trading de cripto: recomienda, valida y opera."
    )
    parser.add_argument("--config", default="config.yaml", help="ruta del YAML de configuracion")
    parser.add_argument("--carpeta", default=".", help="carpeta de trabajo para estado y registros")
    sub = parser.add_subparsers(dest="comando", required=True)

    p = sub.add_parser("recomendar", help="muestra la recomendacion actual sin ejecutar nada")
    p.add_argument("--simbolo")
    p.set_defaults(func=cmd_recomendar)

    p = sub.add_parser("backtest", help="prueba la estrategia sobre datos historicos")
    p.add_argument("--simbolo")
    p.add_argument("--velas", type=int)
    p.add_argument("--csv", help="usa un CSV local en vez de descargar")
    p.add_argument("--guardar-csv", dest="guardar_csv", help="guarda las velas descargadas")
    p.add_argument("--json", help="guarda el detalle del backtest en un JSON")
    p.add_argument(
        "--con-ia",
        dest="con_ia",
        action="store_true",
        help="incluye al asesor IA (una llamada por vela: lento y de pago)",
    )
    p.set_defaults(func=cmd_backtest)

    p = sub.add_parser("puerta", help="comprueba si la estrategia esta autorizada a operar")
    p.add_argument("--forzar", action="store_true", help="reevalua aunque la anterior siga vigente")
    p.set_defaults(func=cmd_puerta)

    p = sub.add_parser("ejecutar", help="arranca el bucle de operativa")
    p.add_argument("--ciclos", type=int, help="numero de ciclos; por defecto, sin fin")
    p.add_argument(
        "--confirmo-riesgo-real",
        dest="confirmo_riesgo_real",
        action="store_true",
        help="obligatorio en modo live: confirma que entiendes que se opera con dinero real",
    )
    p.set_defaults(func=cmd_ejecutar)

    p = sub.add_parser("estado", help="posiciones, saldo y ultimas operaciones")
    p.set_defaults(func=cmd_estado)

    p = sub.add_parser("freno", help="activa o desactiva la parada de emergencia")
    p.add_argument("accion", choices=["on", "off"])
    p.set_defaults(func=cmd_freno)
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = construir_parser()
    args = parser.parse_args(argv)
    try:
        cfg = _cargar_config(args)
        return int(args.func(args, cfg))
    except ErrorDeConfiguracion as error:
        print(f"Configuracion invalida: {error}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\nInterrumpido por el usuario.")
        return 130
    except Exception as error:  # noqa: BLE001
        print(f"Error: {error}", file=sys.stderr)
        return 1
