# Nómina Colombia

Plataforma para llevar **contratos, días de pago y liquidaciones** de acuerdo
con la ley laboral colombiana. Sirve para quien paga **por mes, por quincena,
por día (jornal) o por hora**, y hace la **liquidación final** con prima,
cesantías, intereses, vacaciones e indemnización cuando corresponde.

No necesita servidor, ni cuenta, ni internet. Todo se guarda en el dispositivo.

## Cómo abrirla

```bash
git clone https://github.com/samcand/papeler-a.git
cd papeler-a
git checkout claude/payroll-platform-colombia-1kmopq
npm start          # http://localhost:8080
```

No hay que instalar nada (`npm install` no hace falta: el proyecto no tiene
dependencias). Solo se necesita **Node 18 o superior**.

También se puede publicar tal cual en GitHub Pages: son archivos estáticos. Se
instala como app (Chrome/Edge/Android: "Instalar"; iPhone: Compartir → "Añadir a
pantalla de inicio") y funciona sin conexión.

## Qué hace

| Pantalla | Para qué sirve |
| --- | --- |
| **Panel** | Los valores vigentes del año, el personal activo con su antigüedad y vacaciones pendientes, las próximas fechas de ley y las alertas de cambios normativos. |
| **Empleados** | Empleados y contratos: indefinido, fijo, obra o labor y aprendizaje; pago mensual, por día o por hora; ARL, auxilio de transporte, salario integral, día de descanso pactado. Avisa si el salario queda bajo el mínimo, si el fijo pasa de 4 años o si se acerca el preaviso. |
| **Contrato** | Genera el contrato de trabajo escrito y listo para firmar: por días, por meses, por un año, continuo (indefinido), por obra o labor o de aprendizaje. Incluye las cláusulas de ley, calcula el periodo de prueba máximo, avisa de los datos que exige el artículo 39 del CST y se imprime o se descarga. |
| **Días** | El calendario del mes: se marca qué pasó cada día (trabajo con horario, descanso, vacaciones, incapacidad, licencia, ausencia). Al poner la entrada y la salida, muestra en el momento cuántas horas son ordinarias, nocturnas y extra, y cuánto vale el recargo. |
| **Nómina** | Liquida el periodo (mes, quincena o fechas libres) y arma el comprobante de pago: devengados, deducciones, neto, aportes a seguridad social, retención en la fuente y el costo real del empleado. Se imprime o se exporta a CSV, y queda registrado el pago. |
| **Aportes** | La planilla PILA del mes con sus novedades (ingreso, retiro, incapacidades, licencias, vacaciones, suspensiones), exportable a CSV y a archivo plano, y la **revisión previa al pago**: los errores por los que la UGPP sanciona, con la exposición estimada. |
| **Documentos** | Catorce cartas y constancias del ciclo del empleado —otrosí, preaviso, descargos, terminación, dotación, autorizaciones, certificado laboral, formulario 220, paz y salvo— con **firma electrónica y huella de verificación**, y el expediente de cada trabajador. |
| **Simulador** | Cuánto cuesta contratar a alguien (con factor prestacional real), el presupuesto del año mes a mes con los desembolsos grandes en su fecha, y cuánto sube la nómina cuando cambie la ley. |
| **Liquidación** | La cuenta final del contrato: cesantías, intereses, prima, vacaciones e indemnización del artículo 64, cada renglón con su fórmula y su norma. Muestra también cuánto costaría pagar tarde. |
| **Calendario** | Festivos del año calculados (no copiados), fechas límite de prima, cesantías, intereses y dotación, y el historial de pagos. |
| **Normativa** | Todos los parámetros con los que liquida la app, su vigencia y la norma que los fija, con enlaces oficiales. |
| **Vigilancia** | El módulo de noticias: qué valores están por vencer, qué cambios ya tienen fecha, consulta de fuentes y una bitácora para dejar constancia de cada cambio. |
| **Ajustes** | Datos del empleador, exoneración de parafiscales, proxy para la consulta de noticias y respaldo en JSON. |

## Lo que aplica de la ley

Está resumido, con normas y enlaces, en
[`docs/nomina-normas-colombia.md`](docs/nomina-normas-colombia.md). Lo
esencial, al 20 de septiembre de 2026:

- Salario mínimo **$1.750.905** y auxilio de transporte **$249.095**
  (Decretos 1469 y 1470 de 2025).
- Jornada máxima de **42 horas** desde el 15 de julio de 2026 (Ley 2101 de
  2021): la hora ordinaria sale de dividir el sueldo entre **210**.
- Jornada nocturna desde las **7:00 p. m.** (Ley 2466 de 2025, desde el 25 de
  diciembre de 2025).
- Recargo por día de descanso y festivos del **90 %** desde el 1 de julio de
  2026, y del 100 % desde el 1 de julio de 2027.
- Recargo nocturno 35 %, hora extra diurna 25 %, hora extra nocturna 75 %.
- Prestaciones con el año comercial de 360 días; cesantías al fondo antes del
  15 de febrero e intereses antes del 31 de enero.
- Indemnización del artículo 64 del CST y sanción moratoria del artículo 65.
- Contrato escrito con los datos del artículo 39, periodo de prueba de los
  artículos 76 a 80 y tope de 4 años del término fijo (Ley 2466 de 2025).
- Registro de trabajo suplementario obligatorio (Ley 2466 de 2025) y planilla
  PILA con novedades (Resolución 2388 de 2016).
- Firma electrónica con huella verificable (Ley 527 de 1999 y Decreto 2364 de
  2012).

## Cómo se mantiene al día

Los valores no están regados por el código: viven en
[`src/normativa.js`](src/normativa.js), cada uno con su fecha de vigencia y su
norma. Cuando la ley cambie:

1. Agrega **una fila nueva** con su `desde`. No borres la anterior: las
   liquidaciones de periodos pasados deben seguir saliendo con los valores de
   su momento (la app ya liquida agosto de 2026 con el 90 % y mayo con el 80 %).
2. Actualiza `VERIFICADO_EL`.
3. Deja la anotación en la bitácora de **Vigilancia normativa**.

El módulo de Vigilancia avisa solo cuando:

- no hay valores cargados para el año en curso;
- se acerca diciembre y todavía no está el decreto del año siguiente;
- falta menos de 120 días para un cambio ya programado;
- acaba de entrar a regir un escalón de la reforma;
- pasaron más de tres meses desde la última verificación.

Para leer las fuentes desde la propia app hace falta un **proxy con CORS**
(las páginas del Estado no permiten que otro sitio las lea). Se configura en
Ajustes con una plantilla tipo `https://mi-proxy/?{url}`. Sin proxy, la app
deja los enlaces listos para abrirlos y anotar el hallazgo.

## Decisiones de cálculo que conviene conocer

- **El sueldo mensual ya paga las horas ordinarias.** Por eso una hora
  ordinaria diurna de un día común aparece en el comprobante con valor cero:
  solo se cobran los recargos y las extras.
- **Día de descanso trabajado**: si se dio descanso compensatorio se paga solo
  el recargo; si no, se paga el día **y** el recargo (CST art. 180). La app lo
  pregunta día por día.
- **Divisor de la hora**: por omisión usa el de la jornada legal vigente en la
  fecha del periodo (hoy, 210). Se puede fijar en 240 por contrato si así se
  pactó.
- **Auxilio de transporte**: proporcional a los días que causan salario; no se
  paga sobre vacaciones ni incapacidades, y no entra al IBC.
- **Retención en la fuente**: estimación del procedimiento 1. Ajusta las
  deducciones con los certificados del trabajador.
- **Días**: método comercial de 360 (meses de 30), que es el de la práctica
  laboral colombiana.

## Pruebas

```bash
npm test    # 119 pruebas del motor de cálculo
```

Cubren festivos (incluida la Pascua y los traslados al lunes), clasificación de
turnos que cruzan la medianoche, los factores de cada recargo por fecha, IBC,
exoneraciones, retención, prestaciones, indemnizaciones y el módulo de
vigilancia, la generación del contrato con sus cláusulas y avisos, la firma
electrónica, las cartas del ciclo del empleado, el registro de horas extra, la
planilla PILA, la autoauditoría y los simuladores.

---

Esta herramienta ayuda a calcular y a llevar el registro, pero **no reemplaza el
concepto de un contador o un abogado laboral**.
