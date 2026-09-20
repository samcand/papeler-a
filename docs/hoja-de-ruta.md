# Hoja de ruta: de calculadora a plataforma

Qué le falta a la app para ser la herramienta completa de nómina y contratos
bajo la ley colombiana. Sale de mirar qué obliga la ley, qué ofrecen las
plataformas del mercado (Aleluya/Nominapp, Siigo, Buk, Heinsohn, Novasoft) y
qué es lo que realmente mete en problemas a un empleador.

Cada punto trae **por qué importa**, **la norma** y **qué tan caro es hacerlo**.
Investigado el 20 de septiembre de 2026.

Estado hoy: contratos, registro de días, nómina del periodo, seguridad social,
retención, liquidación final, contrato escrito, calendario, normativa y
vigilancia normativa. 119 pruebas.

**Ya construido de esta hoja de ruta** (ola 1 y parte de la 2 y la 4):
el registro de trabajo suplementario (1.3), la planilla PILA con novedades
(1.2), la autoauditoría UGPP (1.6), el certificado de ingresos y retenciones y
los certificados laborales (1.4 y 1.5), la biblioteca de documentos con firma
electrónica y expediente (2.1 y 2.2), y los simuladores de costo, presupuesto
e impacto normativo (4.3). Queda pendiente el XML de la nómina electrónica
(1.1), que necesita servidor para transmitirse.

---

## Ola 1 — Lo que la ley exige y hoy no está

Esto no es "sería bueno tenerlo": es lo que puede costar plata en una visita
del Ministerio, de la DIAN o de la UGPP.

### 1.1 Documento soporte de pago de nómina electrónica (DIAN) ⭐

Todo empleador que deduzca la nómina en renta **tiene que** generar y
transmitir el documento soporte, mensualmente, dentro de los 10 primeros días
del mes siguiente. Sin él, el gasto de nómina no es deducible ni da derecho a
IVA descontable.

- **Norma**: Resolución DIAN 000013 de 2021 y su anexo técnico, hoy compilada
  en la Resolución 000227 de 2025.
- **Qué haría la app**: generar el XML con sus campos (identificación del
  empleador y del trabajador, numeración consecutiva autorizada, devengados,
  deducidos, total, medio de pago, fecha y hora), más las notas de ajuste.
- **Ojo**: transmitir exige firma digital con certificado y conexión con los
  servicios de la DIAN. Eso **no se puede hacer solo desde el navegador**: hay
  que o bien exportar el XML para subirlo por el proveedor tecnológico que ya
  use la empresa, o montar un pequeño servidor.
- **Costo**: generar el XML, medio. Transmitirlo, alto (necesita backend).
- **Propuesta**: empezar por generar el XML y el reporte de control de lo
  transmitido; la transmisión, después y como opción.

### 1.2 Archivo de la planilla PILA ⭐

Hoy la app calcula los aportes, pero toca volver a digitarlos en el operador.
Generar el archivo plano cierra el círculo y elimina la principal fuente de
errores (y de sanciones de la UGPP).

- **Norma**: Resolución 2388 de 2016 del Ministerio de Salud y sus
  modificaciones; tablas de validación de tipos de cotizante, tipos de planilla
  y novedades.
- **Qué haría la app**: planilla tipo E (empleados), con las novedades que ya
  registra el calendario de días:
  | Novedad | Cuándo la pone la app |
  | --- | --- |
  | ING / RET | Primer y último mes del contrato |
  | VSP | Cuando cambia el salario |
  | VST | Variación transitoria de salario |
  | SLN | Licencia no remunerada o suspensión |
  | IGE | Incapacidad de origen común |
  | IRL | Incapacidad de origen laboral |
  | LMA | Licencia de maternidad o paternidad |
  | VAC / LR | Vacaciones y licencias remuneradas |
- **Costo**: medio. Es formato de texto posicional, se hace local y se prueba.
- **Ganancia**: enorme. Es lo que más tiempo quita al mes.

### 1.3 Registro de trabajo suplementario ⭐

La reforma dejó obligación expresa: llevar un registro de horas extra por
trabajador con **nombre, actividad, número de horas y si son diurnas o
nocturnas**, entregárselo al trabajador que lo pida junto con el soporte del
pago, y mostrarlo a las autoridades. No hacerlo puede costar la suspensión de
la facultad de autorizar trabajo suplementario por seis meses.

- **Norma**: Ley 2466 de 2025 (CST art. 162 par. y concordantes).
- **Qué haría la app**: ya tiene el dato exacto, turno por turno. Falta el
  documento imprimible y el anexo al comprobante de pago.
- **Costo**: bajo. **Hacerlo ya.**

### 1.4 Certificado de ingresos y retenciones (formulario 220)

Se expide a cada trabajador **todos los años**, haya o no retención, lo pida o
no, antes del último día hábil de marzo. No expedirlo se sanciona.

- **Norma**: Estatuto Tributario art. 378 y 379.
- **Costo**: bajo, la app ya tiene los datos del año.

### 1.5 Certificados laborales y desprendibles

Certificado laboral (con o sin salario), constancia de tiempo de servicio,
desprendible de pago por periodo, paz y salvo. Es lo que más piden los
trabajadores y lo que más interrumpe al que liquida.

- **Costo**: bajo.

### 1.6 Autoauditoría UGPP ⭐

Un panel que revise, antes de pagar, los errores por los que la UGPP sanciona
(del 35 % al 200 % de los aportes, Ley 1819 de 2016 art. 314):

- IBC menor al salario real (el clásico: cotizar sobre el mínimo a quien gana más).
- Horas extra, recargos y comisiones que no entraron al IBC.
- Pagos no salariales por encima del 40 % (Ley 1393 de 2010 art. 30).
- Tipo y subtipo de cotizante mal puesto (reportar como aprendiz a quien no lo es).
- Trabajadores sin afiliación o sin aporte en un mes.
- Diferencias entre lo liquidado y lo efectivamente pagado en PILA.

- **Costo**: medio. **Alto valor**: es prevención pura.

---

## Ola 2 — Documentos del ciclo del empleado

La app ya hace el contrato. Falta el resto de papeles que en la práctica se
hacen en Word y terminan mal.

### 2.1 Biblioteca de documentos

| Documento | Cuándo | Norma |
| --- | --- | --- |
| Otrosí (prórroga, cambio de salario, de cargo, de lugar) | Cambios al contrato | CST art. 23 y 43 |
| Preaviso de no prórroga | 30 días antes de vencer un fijo | CST art. 46 |
| Citación a descargos y acta | Antes de despedir con justa causa | Debido proceso, jurisprudencia constante |
| Carta de terminación (con y sin justa causa) | Al terminar | CST art. 62, 63 y 66 (hay que expresar los motivos) |
| Llamado de atención y sanción disciplinaria | Según el reglamento | CST art. 111 a 115 |
| Autorización de descuento de nómina | Préstamos, anticipos | CST art. 149 |
| Autorización de tratamiento de datos | Al ingreso | Ley 1581 de 2012 |
| Entrega de dotación con firma | 3 veces al año | CST art. 230 |
| Constancia de entrega del reglamento y del contrato | Al ingreso | CST art. 120 |
| Paz y salvo y acta de liquidación | Al salir | CST art. 65 |

**Costo**: bajo por documento, alto en conjunto. Se reutiliza el motor que ya
genera el contrato.

### 2.2 Firma electrónica con trazabilidad

Los contratos laborales se pueden firmar electrónicamente: la ley es neutral
en tecnología y solo exige que la firma sea **confiable y apropiada** para el
fin, y que se pueda verificar la integridad del documento.

- **Norma**: Ley 527 de 1999 art. 7 y Decreto 2364 de 2012.
- **Qué haría la app**: firma dibujada o con código de un solo uso, más un
  sello con la huella digital del documento (SHA-256), fecha, hora y datos del
  dispositivo, y una hoja de verificación anexa. Que se pueda comprobar después
  que el documento no cambió.
- **Costo**: medio. Es una de las funciones que más venden las plataformas
  comerciales.

### 2.3 Expediente digital con alertas de vencimiento

Una carpeta por trabajador, con checklist de lo obligatorio y avisos:

- Contrato firmado, hoja de vida, documento de identidad.
- Afiliaciones a EPS, AFP, ARL y caja (y la constancia).
- Exámenes médicos de ingreso, periódicos y de retiro (Resolución 2346 de 2007).
- Entregas de dotación.
- Vencimiento del contrato fijo, fin del periodo de prueba, incapacidades que
  se acercan a 180 días, licencias.

**Costo**: medio. **Alto valor**: es lo primero que pide un inspector.

---

## Ola 3 — El día a día

### 3.1 Portal del trabajador

Que cada empleado vea lo suyo sin llamar a nadie: desprendibles, certificados,
saldo de vacaciones, horas extra del mes, sus documentos firmados.

- **Sin servidor** se puede hacer con un enlace o QR de solo lectura por
  empleado (como el que ya usa la app de alabanza para compartir un set).
- **Con servidor** se vuelve autogestión de verdad, con solicitudes.
- **Costo**: bajo la versión de solo lectura; alto la completa.

### 3.2 Solicitudes con aprobación

Vacaciones, permisos, incapacidades, anticipos: el trabajador pide, el jefe
aprueba, y la novedad cae sola en el calendario de días. En las plataformas
comerciales esto va por WhatsApp; aquí puede ir por enlace.

### 3.3 Registro de jornada más rápido

- Marcación de entrada y salida con un botón (y desde el celular).
- Plantillas de turnos y copiar la semana anterior.
- Importar marcaciones desde un reloj biométrico o un CSV.
- **Geolocalización o biometría**: se puede, pero los datos biométricos son
  **datos sensibles**: exigen autorización previa, expresa e informada, con
  finalidad clara, y borrar el patrón cuando la persona se va. La SIC multa
  hasta 2.000 salarios mínimos (Ley 1581 de 2012 y Decreto 1377 de 2013). Si se
  implementa, la app debe traer la autorización y la política escritas.

### 3.4 Planeación de turnos que valide la ley antes de publicar

Que al armar el cuadro de turnos avise: se pasa de 42 horas, no hay día de
descanso en la semana, hay más de 2 extras al día o 12 a la semana, el turno
cruza a domingo, o no se respetó el descanso entre jornadas.

**Costo**: medio. **Muy alto valor**: evita el problema antes de que ocurra.

---

## Ola 4 — Plata y contabilidad

### 4.1 Dispersión bancaria

Generar el archivo plano de pagos masivos del banco (Bancolombia, Davivienda,
Bogotá, Occidente, Agrario; hay un formato de referencia de Asobancaria) para
pagar toda la nómina de una sola carga.

**Costo**: bajo por banco. Alto impacto en tiempo.

### 4.2 Contabilización

Asientos contables de nómina, aportes y provisiones, con las cuentas del PUC,
y exportación a los formatos que leen Siigo, World Office y Alegra.

### 4.3 Presupuesto y simuladores ⭐

- Costo total por empleado, por área y por centro de costos.
- "¿Cuánto me cuesta contratar a alguien en $X?" incluyendo prestaciones,
  aportes y provisiones (el famoso factor de 1,5 aproximado).
- Proyección del año: cuánto va a costar la prima de junio, cuánto la de
  diciembre, cuánto las cesantías de febrero.
- **Simulador del cambio de ley**: cuánto sube la nómina cuando el recargo
  dominical llegue al 100 % en julio de 2027, o si el salario mínimo sube un
  X %. Esto lo conecta con el módulo de vigilancia y no lo tiene casi nadie.

---

## Ola 5 — Cumplimiento y riesgo

### 5.1 Documentos obligatorios de la empresa

| Documento | Quién debe tenerlo | Norma |
| --- | --- | --- |
| Reglamento interno de trabajo | Empresas comerciales con más de 5 trabajadores, industriales con más de 10, agrícolas con más de 20 | CST art. 105 |
| Política de desconexión laboral | Todo empleador | Ley 2191 de 2022 |
| Política de prevención del acoso laboral y comité de convivencia | Todo empleador | Ley 1010 de 2006, Res. 652 de 2012 |
| Política de tratamiento de datos personales | Todo empleador | Ley 1581 de 2012 |
| Reglamento de higiene y seguridad industrial | Todo empleador | CST art. 349 |

La app puede generarlos como plantillas editables, igual que el contrato.

### 5.2 SG-SST mínimo

Sin pretender ser un software de SST, sí lo esencial de la Resolución 0312 de
2019: la matriz de estándares mínimos que le aplican a la empresa según su
tamaño y riesgo, responsable asignado, COPASST o vigía (con actas y elección),
comité de convivencia, plan de capacitación, exámenes ocupacionales y reporte
de accidentes (FURAT, dentro de los 2 días hábiles).

### 5.3 Panel de riesgos

Un semáforo por empresa: qué obligación está vencida, cuál se vence este mes,
qué trabajador no tiene contrato firmado, quién no tiene examen de ingreso,
qué contrato fijo está por llegar a 4 años.

---

## Ola 6 — Inteligencia

- **Indicadores**: rotación, ausentismo, horas extra por área (una señal de
  que falta gente), costo por empleado, antigüedad promedio.
- **Equidad salarial**: la Ley 1496 de 2011 obliga a llevar un registro de
  perfil y asignación de cargos por sexo, y a justificar las diferencias. Un
  informe de brecha salarial es cumplimiento y es buen dato.
- **Multiempresa y roles** (quien liquida, quien aprueba, quien solo consulta),
  con bitácora de quién cambió qué.
- **Importar desde Excel** la nómina que ya se lleva, para migrar sin digitar.
- **Respaldo cifrado** y respaldo automático: hoy todo vive en un navegador.

---

## Ola 7 — Vigilancia normativa 2.0

El módulo ya avisa de vigencias y cambios programados. Lo que falta:

- **Radar de lo que está en veremos**: la reforma pensional (Ley 2381 de 2024)
  entró a regir el 1 de julio de 2025 pero fue suspendida por la Corte
  Constitucional por vicios de trámite, y se habla de una entrada en vigencia
  hacia 2027. Cuando eso se resuelva, cambia el destino de los aportes (todo lo
  que gane hasta 2,3 salarios mínimos iría a Colpensiones). La app debería
  seguir ese estado, no solo las normas ya vigentes.
- **Comparador de versiones**: qué cambió entre la tabla de parámetros de ayer
  y la de hoy, y qué liquidaciones habría que rehacer.
- **Simulación anticipada**: aplicar un cambio futuro a la nómina actual y ver
  el impacto en pesos antes de que entre a regir.

---

## Lo que yo haría primero

Si hubiera que escoger cinco, por impacto sobre esfuerzo:

1. **Registro de trabajo suplementario** — obligación expresa nueva, datos ya
   están, es un día de trabajo.
2. **Archivo PILA** — elimina el retecleo mensual y la principal fuente de
   sanciones.
3. **Autoauditoría UGPP** — revisa antes de pagar; previene multas del 35 % al
   200 %.
4. **Biblioteca de documentos + firma con trazabilidad** — reutiliza el motor
   del contrato y cubre todo el ciclo del empleado.
5. **Simuladores y presupuesto** — incluido el impacto del 100 % dominical de
   julio de 2027, que conecta con la vigilancia normativa.

## Dónde toca decidir arquitectura

La app hoy es 100 % local: sin servidor, sin cuentas, y los datos no salen del
dispositivo. Eso es una virtud (privacidad y costo cero) y un techo:

| Función | ¿Se puede sin servidor? |
| --- | --- |
| PILA, contabilidad, dispersión bancaria, documentos, simuladores | Sí, todo local |
| Nómina electrónica: generar el XML | Sí |
| Nómina electrónica: transmitir a la DIAN | No: necesita firma digital y servidor |
| Portal del trabajador de solo lectura | Sí, por enlace o QR |
| Solicitudes con aprobación y varios usuarios | No |
| Respaldo automático y multiequipo | No |

Se puede llegar lejos sin servidor. El día que haga falta, lo más pequeño que
sirve es un backend solo para transmitir a la DIAN y sincronizar, dejando todo
el cálculo donde está.
