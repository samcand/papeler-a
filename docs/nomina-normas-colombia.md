# Cómo se paga en Colombia, según la ley

Resumen de las reglas que aplica la plataforma de nómina (en este repositorio), con la
norma de cada una. Está al día al **20 de septiembre de 2026**. Los valores
vivos están en `src/normativa.js`: si la ley cambia, se edita esa tabla
agregando una fila nueva con su fecha de vigencia (nunca se borra la anterior,
porque las liquidaciones viejas tienen que seguir saliendo con los valores de
su momento).

> Aviso: esto es una guía de trabajo, no un concepto jurídico. Antes de un
> cierre grande o de una liquidación en disputa, confirma con tu contador o
> con un abogado laboral.

## 1. Los números del año

| Concepto | 2026 | Norma |
| --- | --- | --- |
| Salario mínimo mensual | $1.750.905 | Decreto 1469 de 2025 |
| Salario mínimo diario | $58.364 | (mínimo ÷ 30) |
| Auxilio de transporte | $249.095 | Decreto 1470 de 2025 |
| UVT | $52.374 | Resolución DIAN 000238 de 2025 |
| Tope para el auxilio de transporte | 2 salarios mínimos ($3.501.810) | Ley 15 de 1959 |
| Salario mínimo integral | 13 salarios mínimos ($22.761.765) | CST art. 132 |

El auxilio de transporte **no es salario** (no cotiza a seguridad social),
pero **sí entra a la base** de la prima y de las cesantías. No entra a las
vacaciones.

## 2. Jornada

La Ley 2101 de 2021 bajó la jornada de 48 a 42 horas semanales por etapas, sin
bajar el salario. La última etapa entró el **15 de julio de 2026**.

| Desde | Máximo semanal | Divisor mensual |
| --- | --- | --- |
| Antes de julio de 2023 | 48 h | 240 |
| 15/07/2023 | 47 h | 235 |
| 15/07/2024 | 46 h | 230 |
| 15/07/2025 | 44 h | 220 |
| **15/07/2026** | **42 h** | **210** |

El divisor es `(horas de la semana ÷ 6) × 30`: las horas que "contiene" el mes.
Como el sueldo no baja pero las horas sí, **la hora ordinaria vale más**: con
42 horas subió cerca de un 4,76 % frente a la de 44. Con salario mínimo 2026 la
hora ordinaria es $1.750.905 ÷ 210 = **$8.338**.

La jornada se puede repartir en 5 o 6 días, respetando el día de descanso.

### Jornada diurna y nocturna

| Desde | Diurna | Nocturna | Norma |
| --- | --- | --- | --- |
| Hasta el 24/12/2025 | 6:00 a 21:00 | 21:00 a 6:00 | CST art. 160 (Ley 789 de 2002) |
| **Desde el 25/12/2025** | **6:00 a 19:00** | **19:00 a 6:00** | CST art. 160 (Ley 2466 de 2025) |

La reforma laboral se sancionó el 25 de junio de 2025 y este cambio quedó con
efecto a los seis meses.

## 3. Recargos y horas extra (CST art. 168 y 179)

| Concepto | Recargo | Factor de la hora |
| --- | --- | --- |
| Recargo nocturno | 35 % | 1,35 |
| Hora extra diurna | 25 % | 1,25 |
| Hora extra nocturna | 75 % | 1,75 |
| Trabajo en día de descanso o festivo (desde el 1/07/2026) | 90 % | 1,90 |

Los recargos se suman: una hora extra nocturna en domingo, en 2026, vale
`1 + 0,90 + 0,75 = 2,65` veces la hora ordinaria.

### La gradualidad del recargo dominical (Ley 2466 de 2025)

| Desde | Recargo |
| --- | --- |
| Hasta el 30/06/2025 | 75 % |
| 01/07/2025 | 80 % |
| **01/07/2026** | **90 %** |
| 01/07/2027 | 100 % |

Otros dos cambios de la reforma que la app aplica:

- El **día de descanso obligatorio ya no tiene que ser el domingo**: se puede
  pactar otro día de la semana. En la app se configura por contrato.
- Trabajar hasta **2 días de descanso en el mes es ocasional**; **3 o más es
  habitual** (CST art. 179 y 180). En el trabajo ocasional el trabajador elige
  entre el recargo en dinero o un día compensatorio de descanso; si se da el
  compensatorio, se paga solo el recargo, y si no, se paga el día **y** el
  recargo. La app pregunta esto día por día.

Topes: **2 horas extra al día y 12 a la semana** (CST art. 167). La app avisa
cuando se pasan.

## 4. Pago por mes, por día o por hora

- **Mensual**: el sueldo remunera 30 días, incluidos los domingos y festivos de
  descanso. El día vale `sueldo ÷ 30` y la hora `sueldo ÷ divisor`.
- **Por día (jornal)**: se paga cada día trabajado, y además hay que pagar el
  **descanso dominical y los festivos** de las semanas en que el trabajador
  laboró todos los días laborables (CST art. 173, 176 y 177). La app lo calcula
  semana por semana y avisa cuando una queda incompleta.
- **Por horas**: se paga la hora efectivamente trabajada, con el mismo esquema
  de recargos. El IBC nunca baja de un salario mínimo proporcional a los días.

En cualquier caso, quien trabaja la jornada completa no puede ganar menos del
mínimo; por debajo solo es válido si el trabajo es de tiempo parcial y la
remuneración es proporcional.

## 5. Seguridad social y parafiscales

| Aporte | Trabajador | Empleador | Norma |
| --- | --- | --- | --- |
| Salud | 4 % | 8,5 % | Ley 100 de 1993, art. 204 |
| Pensión | 4 % | 12 % | Ley 100 de 1993, art. 20 |
| ARL | — | 0,522 % a 6,96 % según la clase de riesgo | Decreto 1072 de 2015 |
| Caja de compensación | — | 4 % | Ley 21 de 1982 |
| ICBF | — | 3 % | Ley 89 de 1988 |
| SENA | — | 2 % | Ley 119 de 1994 |

- **Exoneración (E.T. art. 114-1)**: las sociedades y las personas naturales con
  dos o más empleados no pagan la salud del empleador, ni SENA, ni ICBF por los
  trabajadores que ganen **menos de 10 salarios mínimos**. La caja de
  compensación se paga siempre.
- **Fondo de Solidaridad Pensional**: lo paga el trabajador desde 4 salarios
  mínimos de IBC (1 %, y hasta 2 % por encima de 20 salarios mínimos).
- **IBC**: piso de 1 salario mínimo (proporcional a los días cotizados) y techo
  de 25. El salario integral cotiza sobre el **70 %**.
- **Pagos no salariales**: si pasan del **40 %** del total de la remuneración, el
  exceso entra al IBC (Ley 1393 de 2010, art. 30).

## 6. Prestaciones sociales

| Prestación | Cuánto | Cuándo | Base |
| --- | --- | --- | --- |
| Prima de servicios | 30 días de salario al año | 15 días el 30 de junio y 15 antes del 20 de diciembre | Salario + auxilio de transporte |
| Cesantías | 30 días de salario al año | Al fondo, antes del 15 de febrero | Salario + auxilio de transporte |
| Intereses sobre cesantías | 12 % anual de las cesantías | Al trabajador, antes del 31 de enero | — |
| Vacaciones | 15 días hábiles al año | Dentro del año siguiente | Salario **sin** auxilio de transporte |
| Dotación | Un vestido y un par de zapatos, 3 veces al año | 30 de abril, 31 de agosto y 20 de diciembre | Hasta 2 salarios mínimos y más de 3 meses de servicio |

Todas se liquidan con el **año comercial de 360 días** (mes de 30):

```
prima      = base × días ÷ 360
cesantías  = base × días ÷ 360
intereses  = cesantías × días × 12 % ÷ 360
vacaciones = base sin auxilio × días ÷ 720
```

Sanciones por no pagarlas a tiempo: las cesantías no consignadas antes del 15
de febrero cuestan **un día de salario por cada día de retardo** (Ley 50 de
1990, art. 99); los intereses no pagados se sancionan con otro tanto igual
(Ley 52 de 1975).

## 7. Incapacidades y licencias

| Situación | Cuánto | Quién paga |
| --- | --- | --- |
| Enfermedad general, días 1 y 2 | 66,67 % | Empleador |
| Enfermedad general, días 3 a 90 | 66,67 % | EPS |
| Enfermedad general, días 91 a 180 | 50 % | EPS |
| Accidente o enfermedad laboral | 100 % | ARL |
| Licencia de maternidad | 18 semanas al 100 % | EPS |
| Licencia de paternidad | 2 semanas al 100 % | EPS |
| Licencia por luto | 5 días hábiles al 100 % | Empleador |

Ninguna incapacidad se paga por debajo del salario mínimo diario.

## 8. Terminación del contrato

### Indemnización por despido sin justa causa (CST art. 64)

| Caso | Indemnización |
| --- | --- |
| Indefinido, salario menor a 10 salarios mínimos | 30 días por el primer año + 20 días por cada año siguiente (proporcional por fracción) |
| Indefinido, salario de 10 salarios mínimos o más | 20 días por el primer año + 15 días por cada año siguiente |
| Término fijo | Los salarios que falten hasta el vencimiento del plazo |
| Obra o labor | Los salarios que falten para terminar la obra, mínimo 15 días |

Con menos de un año de servicio se pagan los 30 días (o los 20) completos.

### Otros límites

- El contrato a **término fijo** no puede pasar de **4 años** en total. Si se
  pacta por menos de un año se puede prorrogar, pero **después de la cuarta
  prórroga** la renovación no puede ser por menos de un año (CST art. 46,
  modificado por la Ley 2466 de 2025). Para no prorrogarlo hay que avisar por
  escrito con **30 días** de anticipación.
- El **contrato de aprendizaje** pasó a ser un contrato laboral especial a
  término fijo (Ley 2466 de 2025). Verifica la reglamentación vigente antes de
  liquidar los aportes de la etapa lectiva.
- **Mora en el pago de la liquidación**: un día de salario por cada día de
  retardo, hasta 24 meses; después corren intereses moratorios (CST art. 65).

## 8.1 El contrato escrito

El artículo 39 del CST exige que el contrato escrito diga: identificación y
domicilio de las partes; lugar y fecha de nacimiento del trabajador; clase de
trabajo y lugar donde se presta; cuantía de la remuneración, forma y periodos
de pago; valor del salario en especie si lo hay; y duración, desahucio y
terminación.

Deben constar **por escrito** el contrato a término fijo, el de aprendizaje,
el periodo de prueba, el salario integral y los pagos que se pacten como no
salariales. El indefinido puede ser verbal, pero por escrito evita
discusiones.

**Periodo de prueba** (CST art. 76 a 80):

| Contrato | Máximo |
| --- | --- |
| Indefinido | 2 meses |
| Término fijo de un año o más | 2 meses |
| Término fijo menor a un año | La quinta parte del plazo, sin pasar de 2 meses |

Si no se pacta por escrito, no existe: el trabajador no está en prueba.

## 9. Retención en la fuente sobre salarios

La app estima el **procedimiento 1** (E.T. arts. 383, 385, 387 y 388):

1. Ingresos del mes − pagos no constitutivos de renta (auxilio de transporte,
   pagos no salariales) − aportes obligatorios a salud, pensión y FSP.
2. Menos deducciones: intereses de vivienda (tope 100 UVT), medicina prepagada
   (16 UVT), dependientes (10 % del ingreso, tope 32 UVT).
3. Menos la renta exenta del 25 % (tope de 790 UVT al año).
4. Tope global: deducciones y exentas no pueden pasar del 40 % del ingreso neto
   ni de 1.340 UVT al año.
5. Tabla del artículo 383, en UVT: 0 % hasta 95; 19 % de 95 a 150; 28 % de 150 a
   360; 33 % de 360 a 640; 35 % de 640 a 945; 37 % de 945 a 2.300; 39 % de ahí
   en adelante.

Con la UVT de 2026, **no hay retención por debajo de $4.975.530** de base
gravable mensual. Es un estimado: la depuración real depende de los
certificados que entregue el trabajador.

## 10. Festivos

Son tres grupos (Ley 51 de 1983, "Ley Emiliani"):

- **Fijos**: 1 de enero, 1 de mayo, 20 de julio, 7 de agosto, 8 y 25 de diciembre.
- **Trasladables al lunes siguiente**: Reyes (6 de enero), San José (19 de marzo),
  San Pedro y San Pablo (29 de junio), Asunción (15 de agosto), Día de la Raza
  (12 de octubre), Todos los Santos (1 de noviembre) e Independencia de
  Cartagena (11 de noviembre).
- **Según la Pascua**: Jueves y Viernes Santos se quedan donde caen; Ascensión
  (+43 días), Corpus Christi (+64) y Sagrado Corazón (+71) ya vienen corridos al
  lunes.

La app los calcula, no los tiene escritos: por eso sabe que en 2026 hay 18
festivos y que en 2025 hubo 17, porque San Pedro y el Sagrado Corazón cayeron
el mismo 30 de junio.

## 11. Dónde verificarlo

- [Ministerio del Trabajo — Normatividad](https://www.mintrabajo.gov.co/normatividad)
- [Ministerio del Trabajo — Comunicados](https://www.mintrabajo.gov.co/prensa/comunicados)
- [Ministerio del Trabajo — Conceptos jurídicos](https://www.mintrabajo.gov.co/atencion-al-ciudadano/conceptos-juridicos)
- [Función Pública — Ley 2466 de 2025](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=260676)
- [Código Sustantivo del Trabajo](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=33104)
- [Diario Oficial — Imprenta Nacional](https://www.imprenta.gov.co/diariooficial/)
- [DIAN — Resoluciones (UVT y retención)](https://www.dian.gov.co/normatividad/Paginas/Resoluciones.aspx)
- [UGPP](https://www.ugpp.gov.co/)
- [Corte Constitucional — Relatoría](https://www.corteconstitucional.gov.co/relatoria/)

Una norma rige desde su **publicación en el Diario Oficial**, no desde el
titular del periódico: lo que anuncie un medio hay que confirmarlo ahí.

## 12. Lo que viene

| Fecha | Qué cambia |
| --- | --- |
| 1 de enero de 2027 | Nuevo salario mínimo, auxilio de transporte y UVT (se decretan a finales de diciembre) |
| 1 de julio de 2027 | El recargo por día de descanso y festivos llega al **100 %** |

El módulo de **Vigilancia normativa** de la app avisa de estas fechas con
anticipación, marca los valores que quedaron viejos y permite consultar y
anotar lo que vaya saliendo en las fuentes oficiales.
