# Bot de trading de criptomonedas

Analiza el mercado con indicadores tecnicos, **explica** cada recomendacion,
se valida a si mismo con un backtest antes de que se le permita operar, y solo
entonces puede mandar ordenes reales a Binance.

Python puro. Dependencias: `requests` y `PyYAML`. El asesor de IA es opcional.

---

## Aviso, y va en serio

Esto opera con dinero real si tu se lo permites. Antes de nada:

- **Ningun backtest predice el futuro.** Un resultado bonito en el historico
  significa que la estrategia habria funcionado *en ese periodo*. Nada mas.
- **Empieza y quedate en `modo: paper`** hasta tener varias semanas de registro
  que puedas leer con calma.
- **Cuando pases a real, hazlo primero en el testnet de Binance**
  (`exchange.testnet: true`), que usa dinero de mentira con la mecanica de verdad.
- **La clave de API debe estar creada sin permiso de retiro.** El bot solo
  necesita "Enable Spot Trading". Si la clave puede sacar fondos, una fuga deja
  de ser un susto.
- Solo spot, sin margen ni futuros: **sin apalancamiento, lo peor que puede
  pasar es perder lo que hay en la cuenta**, no mas.
- Pon en el bot dinero que puedas perder entero.

---

## Arranque rapido

```bash
cd trading-bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp config.example.yaml config.yaml     # edita simbolos, riesgo, estrategia

python -m bot recomendar               # que haria ahora mismo, sin tocar nada
python -m bot backtest                 # como le habria ido en el historico
python -m bot puerta                   # si esta autorizado a operar
python -m bot ejecutar                 # bucle de operativa (simulado por defecto)
```

Los datos de mercado salen del endpoint publico de Binance: **para recomendar y
para el backtest no hace falta ninguna cuenta ni clave de API.**

---

## Comandos

| Comando | Que hace |
|---|---|
| `python -m bot recomendar [--simbolo BTCUSDT]` | Imprime la senal actual con sus motivos y el tamano de posicion que usaria. No ejecuta nada. |
| `python -m bot backtest [--velas 2000] [--json salida.json]` | Prueba la estrategia sobre historico y muestra las metricas. `--csv` usa datos locales; `--guardar-csv` los descarga para repetir el experimento. |
| `python -m bot puerta [--forzar]` | Corre el backtest y dice si la estrategia esta autorizada a operar cada simbolo. |
| `python -m bot ejecutar [--ciclos N]` | Bucle: analizar, decidir, ejecutar, esperar. En `modo: live` exige ademas `--confirmo-riesgo-real`. |
| `python -m bot estado` | Posiciones abiertas, saldo simulado, cortacircuitos y ultimas operaciones. |
| `python -m bot freno on\|off` | Parada de emergencia: deja de abrir posiciones sin matar el proceso. |

---

## Como decide

Cada vela cerrada se convierte en un **puntaje de -1 a +1**. Por encima de
`umbral_compra` se compra; por debajo de `umbral_venta` se vende. En medio, se
espera, que tambien es una decision.

El puntaje sale de tres fuentes combinables (`estrategia.tipo`):

**1. `clasica` — indicadores tecnicos.** Cinco votos ponderados:

| Voto | Que mira | Peso por defecto |
|---|---|---|
| Tendencia | Distancia del precio a la EMA200 | 0.30 |
| Cruce | EMA20 contra EMA50 (el cruce reciente pesa mas que el estado) | 0.20 |
| RSI | Sobrecompra / sobreventa, mapeado linealmente | 0.20 |
| MACD | Signo del histograma, reforzado si se expande | 0.20 |
| Bollinger | Posicion dentro de la banda (reversion a la media) | 0.10 |

El **volumen no vota**: confirma. Si el movimiento va con volumen por debajo de
su media, el puntaje se recorta (`factor_volumen`), porque un movimiento sin
volumen suele deshacerse.

**2. `reglas` — tus propias condiciones.** Se declaran en el YAML y se
interpretan; no se usa `eval`, asi que un archivo de configuracion no puede
ejecutar codigo:

```yaml
estrategia:
  tipo: reglas          # o dejalo en ensemble para que sumen con las demas
  reglas:
    modo: todas         # "todas" = y logico | "alguna" = puntua la fraccion
    compra:
      - "cierre > ema:200"
      - "rsi:14 < 40"
      - {izquierda: "macd_hist:12:26:9", op: "cruza_arriba", derecha: 0}
    venta:
      - "rsi:14 > 75"
```

Series disponibles: `cierre`, `apertura`, `maximo`, `minimo`, `volumen`,
`sma:N`, `ema:N`, `rsi:N`, `atr:N`, `vol_sma:N`, `macd:R:L:S`,
`macd_senal:R:L:S`, `macd_hist:R:L:S`, `bb_sup:N:M`, `bb_med:N`, `bb_inf:N:M`,
`bb_pct:N:M`. Operadores: `<  <=  >  >=  ==  !=  cruza_arriba  cruza_abajo`.

**3. `llm` — un asesor de Claude.** Recibe una foto numerica del mercado (los
indicadores ya calculados y las ultimas velas, nunca texto de noticias) y
responde en JSON con esquema fijo: accion, confianza, razonamiento y riesgos.
Tiene dos papeles:

- `papel: filtro` (por defecto): **no suma, pero veta**. Si los indicadores
  quieren comprar y la IA no lo acompana, la senal baja a ESPERAR.
- `papel: voto`: su opinion se suma como una mas.

Las **ventas nunca se vetan**: cerrar una posicion no le pide permiso a nadie.
Si la API falla o no hay clave, el asesor devuelve ESPERAR y lo dice; el bot no
sigue operando como si tuviera un asesor que en realidad esta caido.

Requiere `pip install anthropic` y `ANTHROPIC_API_KEY`. **En el backtest la IA
va apagada por defecto**: una llamada por vela no seria ni barata ni
reproducible. Para incluirla: `backtest --con-ia`.

**`ensemble` (por defecto)** combina lo que este activo segun `estrategia.pesos`.

---

## La puerta: backtest antes de operar

Ningun simbolo abre posiciones sin un backtest **reciente** que cumpla los
minimos de `puerta`:

```yaml
puerta:
  habilitada: true
  min_operaciones: 20          # menos que esto no es una muestra, es una anecdota
  min_factor_beneficio: 1.2    # ganancias brutas / perdidas brutas
  max_drawdown_pct: 25.0       # la peor caida desde un maximo
  min_tasa_acierto_pct: 40.0
  vigencia_horas: 24           # caducidad: el mercado de la semana pasada ya no es este
```

Si no pasa, el bot lo dice y no compra ese simbolo. **Las ventas siguen
permitidas siempre.** En `modo: live` el bot se niega a arrancar con la puerta
desactivada.

El backtest usa **exactamente el mismo modulo de riesgo** que la operativa real
(mismo dimensionamiento, mismos stops, mismos cortacircuitos), cobra comisiones
y deslizamiento en cada entrada y salida, y cuando una vela toca stop y objetivo
a la vez asume que toco el stop primero. Es la lectura pesimista, y la unica
honesta sin datos de tick.

---

## Riesgo

El tamano de la posicion **no sale del capital disponible, sale del riesgo**:
se arriesga un porcentaje fijo por operacion y la distancia al stop (medida en
ATR) decide cuantas unidades son. Una moneda volatil entra con menos tamano que
una tranquila, para el mismo riesgo en euros.

```yaml
riesgo:
  riesgo_por_operacion_pct: 1.0   # lo que se pierde si salta el stop
  max_posicion_pct: 20.0          # techo por posicion
  max_posiciones: 3
  stop_atr: 2.0                   # stop a 2 ATR por debajo de la entrada
  objetivo_atr: 3.0               # objetivo a 3 ATR (relacion 1.5 a 1)
  perdida_diaria_max_pct: 5.0     # al tocarlo, no se abre nada mas hoy
  max_perdidas_consecutivas: 3    # tres seguidas y para, a esperar revision humana
```

Tres frenos independientes, ademas del stop de cada posicion:

1. **Perdida diaria maxima** — corta el dia.
2. **Racha de perdidas** — corta hasta que una persona lo revise.
3. **Freno de emergencia** — `python -m bot freno on` crea un archivo que
   impide abrir posiciones. Funciona aunque el proceso este a mitad de ciclo, y
   **no bloquea las ventas**.

---

## Pasar a dinero real

Por orden, sin saltarse pasos:

1. Semanas en `modo: paper`. Lee `operaciones.csv` y compara con el backtest.
   Si no se parecen, la estrategia no esta lista.
2. Testnet de Binance: crea claves en <https://testnet.binance.vision>, ponlas
   en el entorno y deja `exchange.testnet: true`.
   ```bash
   export BINANCE_API_KEY="..."
   export BINANCE_API_SECRET="..."
   ```
3. Cambia `modo: live` y arranca con `--confirmo-riesgo-real`. Sin esa bandera
   el bot no manda ni una orden.
   ```bash
   python -m bot ejecutar --confirmo-riesgo-real
   ```
4. Solo despues, produccion (`exchange.testnet: false`), con claves **sin
   permiso de retiro**, capital pequeno y `riesgo_por_operacion_pct` bajo.

Las claves se leen **solo** de variables de entorno. Nunca las pongas en el
YAML: `config.yaml` esta en `.gitignore` justamente para que nada de esto acabe
en un commit.

---

## Limites conocidos

Cosas que este bot **no** hace, dichas antes de que te las encuentres:

- **Los stops son "blandos".** Se comprueban en cada ciclo contra el precio de
  mercado, no hay una orden stop puesta en el exchange. Si el precio se va de
  golpe entre dos ciclos (un hueco a la baja), la salida sera peor que el stop
  teorico. Con `intervalo_segundos: 3600` la ventana es de una hora: reducela, o
  anade ordenes OCO en el exchange si esto te importa.
- **Solo largos, solo spot.** No vende en corto ni usa apalancamiento. En un
  mercado bajista lo mejor que hara es quedarse fuera.
- **Una posicion por simbolo.** No promedia a la baja ni escala entradas.
- **Riesgo de sobreajuste.** Si tocas los parametros hasta que el backtest sale
  bonito, lo que has construido es una descripcion del pasado. Valida en un
  periodo que no hayas usado para ajustar.
- **La IA no ve noticias.** Solo recibe numeros. No sabe que hubo un hackeo ni
  que la Fed hablo hace diez minutos.
- **Sin reintentos de ordenes.** Si el exchange rechaza una orden, se anota y se
  reintenta en el siguiente ciclo.

---

## Estructura

```
trading-bot/
  bot/
    cli.py             # comandos
    config.py          # carga y validacion del YAML
    marketdata.py      # velas de Binance, CSV para repetir experimentos
    indicators.py      # SMA, EMA, RSI, MACD, Bollinger, ATR (Python puro)
    strategies/
      base.py          # senal y contexto (indicadores bajo demanda, cacheados)
      clasica.py       # votos de indicadores tecnicos
      reglas.py        # tus reglas del YAML, interpretadas (sin eval)
      llm.py           # asesor de Claude, salida JSON con esquema
      ensemble.py      # combinacion y veto
    risk.py            # tamano de posicion, stops, cortacircuitos
    backtest.py        # motor y metricas
    gate.py            # la puerta: backtest -> permiso para operar
    exchange/
      paper.py         # simulado (precios reales, dinero ficticio)
      binance.py       # spot real, ordenes de mercado firmadas
    trader.py          # el ciclo completo
    state.py           # estado en JSON + registro CSV
  tests/               # 123 pruebas, todas sin red
  config.example.yaml
```

## Pruebas

```bash
python -m unittest discover -s tests -t . -v
```

Ninguna prueba sale a internet: los escenarios de mercado se construyen a mano
y tanto el exchange como el cliente de IA tienen dobles. Por eso corren en
decimas de segundo y se pueden ejecutar en cada cambio.

## Moverlo a su propio repositorio

Esta carpeta es autocontenida. Para sacarla:

```bash
cp -r trading-bot /ruta/nuevo-repo && cd /ruta/nuevo-repo
git init && git add . && git commit -m "Bot de trading"
```
