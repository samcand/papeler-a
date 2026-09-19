import assert from 'node:assert/strict';
import {
  simplificar, crearTrazo, pathDeTrazo, tocaTrazo, borrarEn,
  estiloDeTrazo, porSeccion, resumenAnotaciones, pesoAproximado, HERRAMIENTAS, COLORES,
} from '../src/anotaciones.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

t('simplifica un trazo sin deformarlo', () => {
  // Una recta con 100 puntos intermedios debe quedar en dos
  const recta = Array.from({ length: 100 }, (_, i) => [i / 99, 0.5]);
  assert.equal(simplificar(recta).length, 2);

  // Una curva conserva su forma
  const curva = Array.from({ length: 60 }, (_, i) => {
    const x = i / 59;
    return [x, 0.5 + Math.sin(x * Math.PI) * 0.3];
  });
  const simple = simplificar(curva, 0.002);
  assert.ok(simple.length > 4 && simple.length < curva.length, `quedaron ${simple.length} puntos`);
  assert.deepEqual(simple[0], curva[0]);
  assert.deepEqual(simple[simple.length - 1], curva[curva.length - 1]);
});

t('un trazo guardado ocupa poco', () => {
  const puntos = Array.from({ length: 400 }, (_, i) => [i / 399, 0.4 + Math.sin(i / 8) * 0.01]);
  const trazo = crearTrazo({ puntos, herramienta: 'lapiz', color: 'rojo', seccion: 2 });
  assert.ok(trazo.p.length < 60, `se guardaron ${trazo.p.length} puntos de 400`);
  assert.ok(pesoAproximado([trazo]) < 1400, 'un trazo no debe pasar de ~1 KB');
  assert.equal(trazo.s, 2);
  assert.ok(trazo.id);
  // Coordenadas redondeadas a cuatro decimales
  const decimales = (n) => String(n).split('.')[1]?.length ?? 0;
  assert.ok(trazo.p.every(([x, y]) => decimales(x) <= 4 && decimales(y) <= 4));
});

t('dibuja el path escalado a la caja de la sección', () => {
  // Una curva (no una recta, que la simplificación reduciría a dos puntos)
  const trazo = crearTrazo({ puntos: [[0, 0], [0.5, 0.9], [1, 1]] });
  const d = pathDeTrazo(trazo, { ancho: 200, alto: 100 });
  assert.ok(d.startsWith('M 0 0'), d);
  assert.ok(d.includes('Q'), 'debe suavizar con curvas');
  assert.ok(d.trim().endsWith('200 100'), d);
  // Una recta se guarda con dos puntos y se dibuja recta
  const recta = crearTrazo({ puntos: [[0, 0], [0.5, 0.5], [1, 1]] });
  assert.equal(recta.p.length, 2);
  // Un punto suelto también se dibuja
  assert.ok(pathDeTrazo(crearTrazo({ puntos: [[0.5, 0.5]] }), { ancho: 100, alto: 100 }).includes('M 50 50'));
  assert.equal(pathDeTrazo({ p: [] }, { ancho: 10, alto: 10 }), '');
});

t('el borrador acierta solo en lo que toca', () => {
  const trazo = crearTrazo({ puntos: [[0.1, 0.5], [0.9, 0.5]], seccion: 0 });
  assert.equal(tocaTrazo(trazo, [0.5, 0.505], 0.02), true, 'justo encima');
  assert.equal(tocaTrazo(trazo, [0.5, 0.6], 0.02), false, 'lejos');
  assert.equal(tocaTrazo(trazo, [0.05, 0.5], 0.02), false, 'antes de donde empieza');

  const otro = crearTrazo({ puntos: [[0.1, 0.1], [0.2, 0.2]], seccion: 1 });
  const { trazos, borrados } = borrarEn([trazo, otro], [0.5, 0.5], { seccion: 0, radio: 0.02 });
  assert.equal(borrados, 1);
  assert.equal(trazos.length, 1);
  assert.equal(trazos[0].id, otro.id, 'no debe borrar trazos de otra sección');
});

t('el borrador mide en píxeles, no en proporción de la sección', () => {
  // Una sección real es mucho más ancha que alta: en coordenadas relativas, un
  // mismo radio perdonaría muchos píxeles a lo ancho y casi ninguno a lo alto.
  const caja = { ancho: 1000, alto: 150 };
  const trazo = crearTrazo({ puntos: [[0.1, 0.5], [0.9, 0.5]], seccion: 0 });
  // 12 px por encima de la línea: el borrador de 16 px debe alcanzarlo
  const doceArriba = [0.5, 0.5 - 12 / caja.alto];
  assert.equal(tocaTrazo(trazo, doceArriba, 16, caja), true, 'a 12 px debe borrar');
  // 40 px por encima: no
  const cuarentaArriba = [0.5, 0.5 - 40 / caja.alto];
  assert.equal(tocaTrazo(trazo, cuarentaArriba, 16, caja), false, 'a 40 px no debe borrar');
  const resultado = borrarEn([trazo], doceArriba, { seccion: 0, radio: 16, caja });
  assert.equal(resultado.borrados, 1);
});

t('cada herramienta tiene su estilo', () => {
  const lapiz = estiloDeTrazo({ h: 'lapiz', c: 'rojo' });
  const marcador = estiloDeTrazo({ h: 'marcador', c: 'verde' });
  assert.equal(lapiz.color, COLORES.find((c) => c.id === 'rojo').valor);
  assert.ok(marcador.ancho > lapiz.ancho, 'el resaltador es más ancho');
  assert.ok(marcador.opacidad < 1, 'el resaltador es translúcido');
  assert.equal(marcador.remate, 'butt');
  assert.equal(HERRAMIENTAS.length, 3);
});

t('agrupa y resume las marcas por sección', () => {
  const trazos = [
    crearTrazo({ puntos: [[0, 0], [1, 1]], seccion: 0 }),
    crearTrazo({ puntos: [[0, 0], [1, 1]], seccion: 0 }),
    crearTrazo({ puntos: [[0, 0], [1, 1]], seccion: 2 }),
    crearTrazo({ puntos: [[0, 0], [1, 1]], seccion: -1 }),
  ];
  const mapa = porSeccion(trazos);
  assert.equal(mapa.get(0).length, 2);
  assert.equal(mapa.get(2).length, 1);
  const resumen = resumenAnotaciones(trazos, ['Intro', 'Verso 1', 'Coro']);
  assert.deepEqual(resumen.map((r) => `${r.nombre}:${r.marcas}`),
    ['Toda la hoja:1', 'Intro:2', 'Coro:1']);
});

console.log(`\n${passed} pruebas OK`);
