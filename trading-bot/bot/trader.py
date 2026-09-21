"""El bot en marcha: mira el mercado, decide, y ejecuta si le dejan.

Orden de comprobaciones antes de cualquier compra. Cualquiera de ellas manda
sobre la senal, por buena que sea:

1. Freno de emergencia (archivo en disco).
2. Cortacircuitos de riesgo (perdida diaria, racha de perdidas, posiciones abiertas).
3. La puerta del backtest para ese simbolo.
4. Que el tamano calculado quepa en el saldo y supere los minimos del exchange.

Las ventas no pasan por la puerta ni por los cortacircuitos: cerrar una
posicion abierta siempre esta permitido.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .backtest import Backtest
from .config import Config
from .exchange import Exchange, construir_exchange, moneda_base, moneda_cotizada
from .gate import ResultadoPuerta, esta_vigente, evaluar_puerta
from .marketdata import Velas, descargar_velas
from .risk import EstadoRiesgo, GestorDeRiesgo, PlanDeEntrada
from .state import Estado
from .strategies import COMPRAR, ESPERAR, VENDER, Contexto, Senal, construir_estrategia


@dataclass
class Informe:
    """Lo que paso con un simbolo en un ciclo, para imprimir o guardar."""

    simbolo: str
    accion: str = ESPERAR
    ejecutado: bool = False
    precio: float = 0.0
    senal: Optional[Senal] = None
    plan: Optional[PlanDeEntrada] = None
    bloqueos: List[str] = field(default_factory=list)
    mensaje: str = ""

    def texto(self) -> str:
        lineas = [f"== {self.simbolo} =="]
        if self.senal is not None:
            lineas.append(f"Senal: {self.senal.resumen()}  precio {self.precio:.4f}")
            for motivo in self.senal.motivos:
                lineas.append(f"  - {motivo}")
        if self.plan is not None:
            lineas.append(f"Plan: {self.plan.resumen()}")
        for bloqueo in self.bloqueos:
            lineas.append(f"  [bloqueado] {bloqueo}")
        if self.mensaje:
            lineas.append(f"  {self.mensaje}")
        return "\n".join(lineas)


class Trader:
    def __init__(
        self,
        cfg: Config,
        carpeta: str = ".",
        exchange: Optional[Exchange] = None,
        usar_llm: bool = True,
    ) -> None:
        self.cfg = cfg
        self.carpeta = carpeta
        self.estado = Estado(os.path.join(carpeta, str(cfg.get("ejecucion.archivo_estado", "estado.json"))))
        self.registro_csv = os.path.join(
            carpeta, str(cfg.get("ejecucion.archivo_registro", "operaciones.csv"))
        )
        self.exchange = exchange or construir_exchange(
            cfg, cartera=self.estado.datos.setdefault("paper", {})
        )
        self.estrategia = construir_estrategia(cfg, usar_llm=usar_llm)
        self.gestor = GestorDeRiesgo(
            cfg.seccion("riesgo"), EstadoRiesgo.desde_dict(self.estado.datos.get("riesgo"))
        )
        self.simbolos: List[str] = [str(s).upper() for s in cfg.get("mercado.simbolos", [])]
        self.intervalo = str(cfg.get("mercado.intervalo", "1h"))
        self.atr_periodo = int(cfg.get("riesgo.atr_periodo", 14))

    # -- utilidades -------------------------------------------------------
    def _guardar_riesgo(self) -> None:
        self.estado.datos["riesgo"] = self.gestor.estado.como_dict()
        self.estado.guardar()

    def equity(self) -> float:
        """Capital total: saldo en moneda de cotizacion mas posiciones abiertas."""
        if hasattr(self.exchange, "equity"):
            return float(self.exchange.equity(self.simbolos))  # type: ignore[attr-defined]
        cotizada = moneda_cotizada(self.simbolos[0]) if self.simbolos else "USDT"
        total = self.exchange.saldo(cotizada)
        for simbolo in self.simbolos:
            posicion = self.estado.posicion(simbolo)
            if posicion:
                total += float(posicion["cantidad"]) * self.exchange.precio(simbolo)
        return total

    def descargar(self, simbolo: str, cantidad: Optional[int] = None) -> Velas:
        return descargar_velas(
            simbolo,
            intervalo=self.intervalo,
            cantidad=int(cantidad or self.cfg.get("mercado.velas", 500)),
            testnet=False,  # los datos siempre de produccion: el testnet tiene precios irreales
        )

    def analizar(self, velas: Velas) -> Senal:
        contexto = Contexto(velas)
        return self.estrategia.evaluar(contexto, len(velas) - 1)

    # -- puerta del backtest ----------------------------------------------
    def revisar_puerta(self, simbolo: str, forzar: bool = False) -> ResultadoPuerta:
        guardada = self.estado.puerta(simbolo)
        vigencia = float(self.cfg.get("puerta.vigencia_horas", 24))
        if guardada and not forzar:
            previa = ResultadoPuerta.desde_dict(guardada)
            if esta_vigente(previa, vigencia):
                return previa

        velas = self.descargar(simbolo, cantidad=int(self.cfg.get("backtest.velas", 1500)))
        # El backtest corre sin IA: una llamada por vela no es ni barata ni reproducible.
        estrategia = construir_estrategia(self.cfg, usar_llm=False)
        resultado = Backtest(self.cfg, estrategia).ejecutar(velas)
        puerta = evaluar_puerta(self.cfg, resultado)
        self.estado.guardar_puerta(simbolo, puerta.como_dict())
        return puerta

    # -- recomendacion (no ejecuta) ---------------------------------------
    def recomendar(self, simbolo: str) -> Informe:
        velas = self.descargar(simbolo)
        senal = self.analizar(velas)
        contexto = Contexto(velas)
        i = len(velas) - 1
        precio = velas[i].cierre
        informe = Informe(simbolo=simbolo, accion=senal.accion, precio=precio, senal=senal)
        if senal.accion == COMPRAR:
            atr = contexto.valor(f"atr:{self.atr_periodo}", i)
            informe.plan = self.gestor.plan_de_entrada(self.equity(), precio, atr)
            if informe.plan is None:
                informe.mensaje = (
                    "Senal de compra, pero el tamano calculado no llega al minimo operable"
                )
        return informe

    # -- ciclo de ejecucion -----------------------------------------------
    def ciclo(self) -> List[Informe]:
        informes: List[Informe] = []
        for simbolo in self.simbolos:
            try:
                informes.append(self._ciclo_simbolo(simbolo))
            except Exception as error:  # noqa: BLE001 - un simbolo roto no tumba el resto
                informes.append(
                    Informe(simbolo=simbolo, mensaje=f"Error en el ciclo: {error}")
                )
        self._guardar_riesgo()
        return informes

    def _ciclo_simbolo(self, simbolo: str) -> Informe:
        velas = self.descargar(simbolo)
        contexto = Contexto(velas)
        i = len(velas) - 1
        senal = self.estrategia.evaluar(contexto, i)
        precio = self.exchange.precio(simbolo)
        informe = Informe(simbolo=simbolo, accion=senal.accion, precio=precio, senal=senal)

        posicion = self.estado.posicion(simbolo)
        if posicion:
            motivo = self._motivo_de_salida(posicion, precio, senal)
            if motivo:
                self._cerrar(simbolo, posicion, motivo, informe)
                return informe
            informe.mensaje = (
                f"Posicion abierta: {posicion['cantidad']:.8f} desde {posicion['precio']:.4f} "
                f"(stop {posicion['stop']:.4f}, objetivo {posicion['objetivo']:.4f})"
            )
            return informe

        if senal.accion != COMPRAR:
            return informe

        self._intentar_compra(simbolo, contexto, i, precio, informe)
        return informe

    @staticmethod
    def _motivo_de_salida(posicion: Dict[str, Any], precio: float, senal: Senal) -> Optional[str]:
        if precio <= float(posicion["stop"]):
            return "stop"
        if precio >= float(posicion["objetivo"]):
            return "objetivo"
        if senal.accion == VENDER:
            return "senal"
        return None

    def _intentar_compra(
        self, simbolo: str, contexto: Contexto, i: int, precio: float, informe: Informe
    ) -> None:
        equity = self.equity()
        permitido, motivo = self.gestor.puede_abrir(
            equity, self.estado.posiciones_abiertas, None, self.carpeta
        )
        if not permitido:
            informe.bloqueos.append(motivo)
            return

        if bool(self.cfg.get("puerta.habilitada", True)):
            puerta = self.revisar_puerta(simbolo)
            if not puerta.aprobada:
                informe.bloqueos.append(puerta.resumen())
                return

        atr = contexto.valor(f"atr:{self.atr_periodo}", i)
        plan = self.gestor.plan_de_entrada(equity, precio, atr)
        informe.plan = plan
        if plan is None:
            informe.bloqueos.append(
                "El tamano calculado no llega al minimo operable (revisa capital o min_notional)"
            )
            return

        minimo = self.exchange.minimo_notional(simbolo)
        if minimo and plan.notional < minimo:
            informe.bloqueos.append(
                f"La orden de {plan.notional:.2f} no llega al minimo del exchange ({minimo})"
            )
            return

        try:
            orden = self.exchange.comprar(simbolo, plan.notional)
        except Exception as error:  # noqa: BLE001
            informe.bloqueos.append(f"El exchange rechazo la compra: {error}")
            return

        # Los niveles se recalculan sobre el precio realmente ejecutado, no el teorico.
        distancia = plan.precio - plan.stop
        objetivo = orden.precio + (plan.objetivo - plan.precio)
        self.estado.guardar_posicion(
            simbolo,
            {
                "cantidad": orden.cantidad,
                "precio": orden.precio,
                "stop": orden.precio - distancia,
                "objetivo": objetivo,
                "abierta_en": time.time(),
                "comision": orden.comision,
                "simulada": orden.simulada,
            },
        )
        informe.ejecutado = True
        informe.mensaje = f"COMPRA ejecutada: {orden.resumen()}"
        self.estado.anotar(
            {
                "momento": time.strftime("%Y-%m-%d %H:%M:%S"),
                "simbolo": simbolo,
                "lado": "COMPRA",
                "cantidad": orden.cantidad,
                "precio": orden.precio,
                "notional": orden.notional,
                "comision": orden.comision,
                "pnl": 0.0,
                "motivo": "senal",
                "simulada": orden.simulada,
            },
            self.registro_csv,
        )

    def _cerrar(self, simbolo: str, posicion: Dict[str, Any], motivo: str, informe: Informe) -> None:
        cantidad = float(posicion["cantidad"])
        disponible = self.exchange.saldo(moneda_base(simbolo))
        if disponible > 0:
            cantidad = min(cantidad, disponible)
        cantidad = self.exchange.normalizar_cantidad(simbolo, cantidad) or cantidad
        try:
            orden = self.exchange.vender(simbolo, cantidad)
        except Exception as error:  # noqa: BLE001
            informe.bloqueos.append(f"El exchange rechazo la venta: {error}")
            return

        coste = float(posicion["cantidad"]) * float(posicion["precio"])
        pnl = orden.notional - orden.comision - coste - float(posicion.get("comision", 0.0))
        self.gestor.registrar_cierre(pnl)
        self.estado.borrar_posicion(simbolo)
        informe.accion = VENDER
        informe.ejecutado = True
        informe.mensaje = f"VENTA por {motivo}: {orden.resumen()} | resultado {pnl:+.2f}"
        self.estado.anotar(
            {
                "momento": time.strftime("%Y-%m-%d %H:%M:%S"),
                "simbolo": simbolo,
                "lado": "VENTA",
                "cantidad": orden.cantidad,
                "precio": orden.precio,
                "notional": orden.notional,
                "comision": orden.comision,
                "pnl": round(pnl, 4),
                "motivo": motivo,
                "simulada": orden.simulada,
            },
            self.registro_csv,
        )
        self._guardar_riesgo()

    # -- bucle ------------------------------------------------------------
    def bucle(self, ciclos: Optional[int] = None) -> None:
        espera = int(self.cfg.get("ejecucion.intervalo_segundos", 3600))
        hechos = 0
        while ciclos is None or hechos < ciclos:
            marca = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n----- ciclo {marca} ({'REAL' if self.cfg.es_live else 'SIMULADO'}) -----")
            if self.gestor.freno_activo(self.carpeta):
                print(
                    f"Freno de emergencia activo ({self.gestor.archivo_freno}). "
                    "No se abren posiciones; borra el archivo para reanudar."
                )
            for informe in self.ciclo():
                print(informe.texto())
            hechos += 1
            if ciclos is not None and hechos >= ciclos:
                break
            time.sleep(espera)
