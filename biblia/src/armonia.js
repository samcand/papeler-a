/**
 * armonia.js — Armonía de los evangelios: los relatos paralelos de Mateo,
 * Marcos, Lucas y Juan, perícopa por perícopa, en orden cronológico
 * aproximado (según las armonías clásicas de Robertson y Thomas–Gundry).
 *
 * Sirve para comparar en columnas cómo cuenta cada evangelista el mismo
 * suceso: qué añade, qué omite, qué palabras comparten (problema sinóptico,
 * crítica de la redacción, énfasis teológico de cada autor).
 */

import { parsear, rango, normalizar } from './referencias.js';

const S = (titulo, perícopas) => ({ titulo, pericopas: perícopas.map(([t, mt, mc, lc, jn]) => ({ t, mt, mc, lc, jn })) });

export const ARMONIA = [
  S('Introducción y prólogos', [
    ['Prólogo de Lucas', '', '', 'Lc 1:1-4', ''],
    ['El Verbo hecho carne', '', '', '', 'Jn 1:1-18'],
    ['Genealogías de Jesús', 'Mt 1:1-17', '', 'Lc 3:23-38', ''],
  ]),
  S('Nacimiento e infancia', [
    ['Anuncio del nacimiento de Juan', '', '', 'Lc 1:5-25', ''],
    ['Anuncio del nacimiento de Jesús a María', '', '', 'Lc 1:26-38', ''],
    ['María visita a Elisabet', '', '', 'Lc 1:39-56', ''],
    ['Nacimiento de Juan el Bautista', '', '', 'Lc 1:57-80', ''],
    ['Anuncio a José', 'Mt 1:18-25', '', '', ''],
    ['Nacimiento de Jesús', '', '', 'Lc 2:1-7', ''],
    ['Los pastores', '', '', 'Lc 2:8-20', ''],
    ['Circuncisión y presentación en el templo', '', '', 'Lc 2:21-38', ''],
    ['Los magos', 'Mt 2:1-12', '', '', ''],
    ['Huida a Egipto y regreso', 'Mt 2:13-23', '', 'Lc 2:39', ''],
    ['Infancia en Nazaret', '', '', 'Lc 2:40', ''],
    ['Jesús a los doce años en el templo', '', '', 'Lc 2:41-52', ''],
  ]),
  S('Juan el Bautista y el comienzo del ministerio', [
    ['Ministerio de Juan el Bautista', 'Mt 3:1-12', 'Mc 1:1-8', 'Lc 3:1-18', ''],
    ['Bautismo de Jesús', 'Mt 3:13-17', 'Mc 1:9-11', 'Lc 3:21-22', ''],
    ['La tentación en el desierto', 'Mt 4:1-11', 'Mc 1:12-13', 'Lc 4:1-13', ''],
    ['Testimonio de Juan ante los sacerdotes', '', '', '', 'Jn 1:19-28'],
    ['"He aquí el Cordero de Dios"', '', '', '', 'Jn 1:29-34'],
    ['Los primeros discípulos', '', '', '', 'Jn 1:35-51'],
    ['Las bodas de Caná', '', '', '', 'Jn 2:1-11'],
    ['Estancia en Capernaum', '', '', '', 'Jn 2:12'],
  ]),
  S('Ministerio temprano en Judea', [
    ['Primera purificación del templo', '', '', '', 'Jn 2:13-22'],
    ['Nicodemo y el nuevo nacimiento', '', '', '', 'Jn 2:23-3:21'],
    ['Último testimonio de Juan', '', '', '', 'Jn 3:22-36'],
    ['Encarcelamiento de Juan', 'Mt 14:3-5', 'Mc 6:17-20', 'Lc 3:19-20', ''],
    ['Partida hacia Galilea', 'Mt 4:12', 'Mc 1:14', 'Lc 4:14', 'Jn 4:1-4'],
    ['La mujer samaritana', '', '', '', 'Jn 4:5-42'],
    ['Llegada a Galilea', '', '', '', 'Jn 4:43-45'],
  ]),
  S('Gran ministerio en Galilea', [
    ['Resumen de la predicación en Galilea', 'Mt 4:17', 'Mc 1:14-15', 'Lc 4:14-15', ''],
    ['Sanidad del hijo del oficial del rey', '', '', '', 'Jn 4:46-54'],
    ['Rechazo en Nazaret', '', '', 'Lc 4:16-30', ''],
    ['Se establece en Capernaum', 'Mt 4:13-16', '', 'Lc 4:31', ''],
    ['Llamamiento de los cuatro pescadores', 'Mt 4:18-22', 'Mc 1:16-20', 'Lc 5:1-11', ''],
    ['El endemoniado en la sinagoga de Capernaum', '', 'Mc 1:21-28', 'Lc 4:31-37', ''],
    ['Sanidad de la suegra de Pedro', 'Mt 8:14-17', 'Mc 1:29-34', 'Lc 4:38-41', ''],
    ['Primera gira por Galilea', 'Mt 4:23-25', 'Mc 1:35-39', 'Lc 4:42-44', ''],
    ['Sanidad de un leproso', 'Mt 8:2-4', 'Mc 1:40-45', 'Lc 5:12-16', ''],
    ['El paralítico bajado por el techo', 'Mt 9:2-8', 'Mc 2:1-12', 'Lc 5:17-26', ''],
    ['Llamamiento de Mateo (Leví)', 'Mt 9:9-13', 'Mc 2:13-17', 'Lc 5:27-32', ''],
    ['La pregunta sobre el ayuno', 'Mt 9:14-17', 'Mc 2:18-22', 'Lc 5:33-39', ''],
    ['El paralítico de Betesda', '', '', '', 'Jn 5:1-47'],
    ['Las espigas en el día de reposo', 'Mt 12:1-8', 'Mc 2:23-28', 'Lc 6:1-5', ''],
    ['El hombre de la mano seca', 'Mt 12:9-14', 'Mc 3:1-6', 'Lc 6:6-11', ''],
    ['Multitudes junto al mar', 'Mt 12:15-21', 'Mc 3:7-12', '', ''],
    ['Elección de los doce', '', 'Mc 3:13-19', 'Lc 6:12-16', ''],
    ['El Sermón del Monte: bienaventuranzas', 'Mt 5:1-12', '', 'Lc 6:17-26', ''],
    ['Sal y luz; Jesús y la ley', 'Mt 5:13-48', '', 'Lc 6:27-36', ''],
    ['Limosna, oración y ayuno; el Padre Nuestro', 'Mt 6:1-18', '', 'Lc 11:1-4', ''],
    ['Tesoros, afán y el reino primero', 'Mt 6:19-34', '', 'Lc 12:22-34', ''],
    ['No juzguéis; pedid, buscad, llamad', 'Mt 7:1-12', '', 'Lc 6:37-42', ''],
    ['Los dos caminos, los frutos y los dos cimientos', 'Mt 7:13-29', '', 'Lc 6:43-49', ''],
    ['El siervo del centurión', 'Mt 8:5-13', '', 'Lc 7:1-10', ''],
    ['El hijo de la viuda de Naín', '', '', 'Lc 7:11-17', ''],
    ['Pregunta de Juan desde la cárcel', 'Mt 11:2-19', '', 'Lc 7:18-35', ''],
    ['Ayes sobre las ciudades; "Venid a mí"', 'Mt 11:20-30', '', '', ''],
    ['La mujer pecadora unge a Jesús', '', '', 'Lc 7:36-50', ''],
    ['Las mujeres que servían a Jesús', '', '', 'Lc 8:1-3', ''],
    ['Blasfemia contra el Espíritu Santo', 'Mt 12:22-37', 'Mc 3:20-30', 'Lc 11:14-23', ''],
    ['La señal de Jonás', 'Mt 12:38-45', '', 'Lc 11:24-36', ''],
    ['La madre y los hermanos de Jesús', 'Mt 12:46-50', 'Mc 3:31-35', 'Lc 8:19-21', ''],
    ['Parábola del sembrador', 'Mt 13:1-23', 'Mc 4:1-25', 'Lc 8:4-18', ''],
    ['La semilla que crece sola', '', 'Mc 4:26-29', '', ''],
    ['El trigo y la cizaña', 'Mt 13:24-30', '', '', ''],
    ['El grano de mostaza y la levadura', 'Mt 13:31-35', 'Mc 4:30-34', 'Lc 13:18-21', ''],
    ['Explicación de la cizaña; tesoro, perla y red', 'Mt 13:36-52', '', '', ''],
    ['Jesús calma la tempestad', 'Mt 8:18-27', 'Mc 4:35-41', 'Lc 8:22-25', ''],
    ['El endemoniado gadareno', 'Mt 8:28-34', 'Mc 5:1-20', 'Lc 8:26-39', ''],
    ['La hija de Jairo y la mujer del flujo de sangre', 'Mt 9:18-26', 'Mc 5:21-43', 'Lc 8:40-56', ''],
    ['Dos ciegos y un mudo', 'Mt 9:27-34', '', '', ''],
    ['Último rechazo en Nazaret', 'Mt 13:53-58', 'Mc 6:1-6', '', ''],
    ['"La mies es mucha"', 'Mt 9:35-38', '', '', ''],
    ['Misión de los doce', 'Mt 10:1-42', 'Mc 6:7-13', 'Lc 9:1-6', ''],
    ['Muerte de Juan el Bautista', 'Mt 14:1-12', 'Mc 6:14-29', 'Lc 9:7-9', ''],
  ]),
  S('Retiros de Galilea', [
    ['Alimentación de los cinco mil', 'Mt 14:13-21', 'Mc 6:30-44', 'Lc 9:10-17', 'Jn 6:1-15'],
    ['Jesús camina sobre el mar', 'Mt 14:22-33', 'Mc 6:45-52', '', 'Jn 6:16-21'],
    ['Sanidades en Genesaret', 'Mt 14:34-36', 'Mc 6:53-56', '', ''],
    ['El pan de vida', '', '', '', 'Jn 6:22-71'],
    ['La tradición de los ancianos', 'Mt 15:1-20', 'Mc 7:1-23', '', 'Jn 7:1'],
    ['La mujer sirofenicia', 'Mt 15:21-28', 'Mc 7:24-30', '', ''],
    ['El sordomudo en Decápolis', 'Mt 15:29-31', 'Mc 7:31-37', '', ''],
    ['Alimentación de los cuatro mil', 'Mt 15:32-39', 'Mc 8:1-10', '', ''],
    ['Los fariseos piden señal', 'Mt 16:1-4', 'Mc 8:11-13', '', ''],
    ['La levadura de los fariseos', 'Mt 16:5-12', 'Mc 8:14-21', '', ''],
    ['El ciego de Betsaida', '', 'Mc 8:22-26', '', ''],
    ['Confesión de Pedro en Cesarea de Filipo', 'Mt 16:13-20', 'Mc 8:27-30', 'Lc 9:18-21', ''],
    ['Primer anuncio de la pasión', 'Mt 16:21-28', 'Mc 8:31-9:1', 'Lc 9:22-27', ''],
    ['La transfiguración', 'Mt 17:1-13', 'Mc 9:2-13', 'Lc 9:28-36', ''],
    ['El muchacho endemoniado', 'Mt 17:14-21', 'Mc 9:14-29', 'Lc 9:37-43', ''],
    ['Segundo anuncio de la pasión', 'Mt 17:22-23', 'Mc 9:30-32', 'Lc 9:43-45', ''],
    ['El impuesto del templo', 'Mt 17:24-27', '', '', ''],
    ['¿Quién es el mayor?', 'Mt 18:1-14', 'Mc 9:33-50', 'Lc 9:46-50', ''],
    ['Disciplina y perdón; el siervo sin compasión', 'Mt 18:15-35', '', '', ''],
  ]),
  S('Ministerio posterior en Judea (fiesta de los Tabernáculos)', [
    ['Los hermanos incrédulos de Jesús', '', '', '', 'Jn 7:2-9'],
    ['Viaje por Samaria', '', '', 'Lc 9:51-56', 'Jn 7:10'],
    ['El costo de seguir a Jesús', 'Mt 8:19-22', '', 'Lc 9:57-62', ''],
    ['Jesús en la fiesta de los Tabernáculos', '', '', '', 'Jn 7:11-52'],
    ['La mujer sorprendida en adulterio', '', '', '', 'Jn 7:53-8:11'],
    ['"Yo soy la luz del mundo"', '', '', '', 'Jn 8:12-59'],
    ['Misión de los setenta', '', '', 'Lc 10:1-24', ''],
    ['El buen samaritano', '', '', 'Lc 10:25-37', ''],
    ['Marta y María', '', '', 'Lc 10:38-42', ''],
    ['El amigo a medianoche', '', '', 'Lc 11:5-13', ''],
    ['Ayes contra fariseos e intérpretes de la ley', '', '', 'Lc 11:37-54', ''],
    ['Advertencias; el rico insensato', '', '', 'Lc 12:1-21', ''],
    ['Siervos vigilantes; división y señales', '', '', 'Lc 12:35-59', ''],
    ['Arrepentimiento; la higuera estéril', '', '', 'Lc 13:1-9', ''],
    ['La mujer encorvada', '', '', 'Lc 13:10-17', ''],
    ['El ciego de nacimiento', '', '', '', 'Jn 9:1-41'],
    ['El buen pastor', '', '', '', 'Jn 10:1-21'],
    ['Fiesta de la Dedicación', '', '', '', 'Jn 10:22-39'],
  ]),
  S('Ministerio en Perea', [
    ['Retiro al otro lado del Jordán', '', '', '', 'Jn 10:40-42'],
    ['La puerta estrecha; lamento sobre Jerusalén', '', '', 'Lc 13:22-35', ''],
    ['Sanidad en casa de un fariseo; los primeros asientos', '', '', 'Lc 14:1-14', ''],
    ['La gran cena', '', '', 'Lc 14:15-24', ''],
    ['El costo del discipulado', '', '', 'Lc 14:25-35', ''],
    ['La oveja, la moneda y el hijo perdidos', '', '', 'Lc 15:1-32', ''],
    ['El mayordomo infiel', '', '', 'Lc 16:1-13', ''],
    ['El rico y Lázaro', '', '', 'Lc 16:14-31', ''],
    ['Tropiezos, perdón, fe y deber', '', '', 'Lc 17:1-10', ''],
    ['Resurrección de Lázaro', '', '', '', 'Jn 11:1-44'],
    ['Consejo para matar a Jesús', '', '', '', 'Jn 11:45-54'],
    ['Los diez leprosos', '', '', 'Lc 17:11-19', ''],
    ['La venida del reino', '', '', 'Lc 17:20-37', ''],
    ['La viuda y el juez injusto; el fariseo y el publicano', '', '', 'Lc 18:1-14', ''],
    ['Divorcio y matrimonio', 'Mt 19:1-12', 'Mc 10:1-12', '', ''],
    ['Jesús bendice a los niños', 'Mt 19:13-15', 'Mc 10:13-16', 'Lc 18:15-17', ''],
    ['El joven rico', 'Mt 19:16-30', 'Mc 10:17-31', 'Lc 18:18-30', ''],
    ['Los obreros de la viña', 'Mt 20:1-16', '', '', ''],
    ['Tercer anuncio de la pasión', 'Mt 20:17-19', 'Mc 10:32-34', 'Lc 18:31-34', ''],
    ['La petición de Jacobo y Juan', 'Mt 20:20-28', 'Mc 10:35-45', '', ''],
    ['Los ciegos de Jericó (Bartimeo)', 'Mt 20:29-34', 'Mc 10:46-52', 'Lc 18:35-43', ''],
    ['Zaqueo', '', '', 'Lc 19:1-10', ''],
    ['Parábola de las diez minas', '', '', 'Lc 19:11-28', ''],
    ['María unge a Jesús en Betania', 'Mt 26:6-13', 'Mc 14:3-9', '', 'Jn 11:55-12:11'],
  ]),
  S('Última semana en Jerusalén', [
    ['Entrada triunfal', 'Mt 21:1-11', 'Mc 11:1-11', 'Lc 19:29-44', 'Jn 12:12-19'],
    ['Maldición de la higuera', 'Mt 21:18-19', 'Mc 11:12-14', '', ''],
    ['Purificación del templo', 'Mt 21:12-17', 'Mc 11:15-19', 'Lc 19:45-48', ''],
    ['Los griegos buscan a Jesús; el grano de trigo', '', '', '', 'Jn 12:20-50'],
    ['La higuera seca; lección de fe', 'Mt 21:19-22', 'Mc 11:20-26', '', ''],
    ['¿Con qué autoridad?', 'Mt 21:23-27', 'Mc 11:27-33', 'Lc 20:1-8', ''],
    ['Los dos hijos', 'Mt 21:28-32', '', '', ''],
    ['Los labradores malvados', 'Mt 21:33-46', 'Mc 12:1-12', 'Lc 20:9-19', ''],
    ['La fiesta de bodas', 'Mt 22:1-14', '', '', ''],
    ['El tributo al César', 'Mt 22:15-22', 'Mc 12:13-17', 'Lc 20:20-26', ''],
    ['Los saduceos y la resurrección', 'Mt 22:23-33', 'Mc 12:18-27', 'Lc 20:27-40', ''],
    ['El gran mandamiento', 'Mt 22:34-40', 'Mc 12:28-34', '', ''],
    ['¿De quién es hijo el Cristo?', 'Mt 22:41-46', 'Mc 12:35-37', 'Lc 20:41-44', ''],
    ['Ayes contra escribas y fariseos', 'Mt 23:1-39', 'Mc 12:38-40', 'Lc 20:45-47', ''],
    ['La ofrenda de la viuda', '', 'Mc 12:41-44', 'Lc 21:1-4', ''],
    ['El sermón del monte de los Olivos', 'Mt 24:1-51', 'Mc 13:1-37', 'Lc 21:5-38', ''],
    ['Las diez vírgenes y los talentos', 'Mt 25:1-30', '', '', ''],
    ['El juicio de las naciones', 'Mt 25:31-46', '', '', ''],
    ['Complot contra Jesús; traición de Judas', 'Mt 26:1-5', 'Mc 14:1-2', 'Lc 22:1-2', ''],
    ['Judas pacta la entrega', 'Mt 26:14-16', 'Mc 14:10-11', 'Lc 22:3-6', ''],
  ]),
  S('El aposento alto', [
    ['Preparación de la Pascua', 'Mt 26:17-19', 'Mc 14:12-16', 'Lc 22:7-13', ''],
    ['La última Pascua; disputa sobre el mayor', 'Mt 26:20', 'Mc 14:17', 'Lc 22:14-16', ''],
    ['Jesús lava los pies de los discípulos', '', '', '', 'Jn 13:1-20'],
    ['Anuncio de la traición', 'Mt 26:21-25', 'Mc 14:18-21', 'Lc 22:21-23', 'Jn 13:21-30'],
    ['El mandamiento nuevo', '', '', '', 'Jn 13:31-35'],
    ['Anuncio de la negación de Pedro', 'Mt 26:31-35', 'Mc 14:27-31', 'Lc 22:31-38', 'Jn 13:36-38'],
    ['Institución de la Cena del Señor', 'Mt 26:26-29', 'Mc 14:22-25', 'Lc 22:17-20', ''],
    ['Discurso de despedida: el Consolador', '', '', '', 'Jn 14:1-31'],
    ['La vid verdadera; el odio del mundo', '', '', '', 'Jn 15:1-16:4'],
    ['La obra del Espíritu; tristeza en gozo', '', '', '', 'Jn 16:5-33'],
    ['La oración sacerdotal', '', '', '', 'Jn 17:1-26'],
  ]),
  S('Pasión y muerte', [
    ['Getsemaní', 'Mt 26:30-46', 'Mc 14:26-42', 'Lc 22:39-46', 'Jn 18:1'],
    ['El arresto', 'Mt 26:47-56', 'Mc 14:43-52', 'Lc 22:47-53', 'Jn 18:2-12'],
    ['Ante Anás', '', '', '', 'Jn 18:13-14'],
    ['Ante Caifás y el Sanedrín', 'Mt 26:57-68', 'Mc 14:53-65', 'Lc 22:54', 'Jn 18:19-24'],
    ['Las negaciones de Pedro', 'Mt 26:69-75', 'Mc 14:66-72', 'Lc 22:54-62', 'Jn 18:15-18'],
    ['Burlas de los guardias', '', '', 'Lc 22:63-65', ''],
    ['Condena del Sanedrín al amanecer', 'Mt 27:1', 'Mc 15:1', 'Lc 22:66-71', ''],
    ['Muerte de Judas', 'Mt 27:3-10', '', '', ''],
    ['Primera comparecencia ante Pilato', 'Mt 27:2', 'Mc 15:1-5', 'Lc 23:1-5', 'Jn 18:28-38'],
    ['Ante Herodes', '', '', 'Lc 23:6-12', ''],
    ['Pilato y Barrabás; la sentencia', 'Mt 27:15-26', 'Mc 15:6-15', 'Lc 23:13-25', 'Jn 18:39-19:16'],
    ['Burlas de los soldados', 'Mt 27:27-30', 'Mc 15:16-19', '', ''],
    ['Camino al Gólgota', 'Mt 27:31-34', 'Mc 15:20-23', 'Lc 23:26-33', 'Jn 19:16-17'],
    ['La crucifixión', 'Mt 27:35-44', 'Mc 15:24-32', 'Lc 23:33-43', 'Jn 19:18-27'],
    ['La muerte de Jesús', 'Mt 27:45-56', 'Mc 15:33-41', 'Lc 23:44-49', 'Jn 19:28-37'],
    ['La sepultura', 'Mt 27:57-61', 'Mc 15:42-47', 'Lc 23:50-56', 'Jn 19:38-42'],
    ['La guardia en el sepulcro', 'Mt 27:62-66', '', '', ''],
  ]),
  S('Resurrección y ascensión', [
    ['La tumba vacía', 'Mt 28:1-8', 'Mc 16:1-8', 'Lc 24:1-12', 'Jn 20:1-10'],
    ['Aparición a María Magdalena', '', 'Mc 16:9-11', '', 'Jn 20:11-18'],
    ['Aparición a las mujeres', 'Mt 28:9-10', '', '', ''],
    ['El informe de la guardia', 'Mt 28:11-15', '', '', ''],
    ['Camino a Emaús', '', 'Mc 16:12-13', 'Lc 24:13-35', ''],
    ['Aparición a los discípulos sin Tomás', '', 'Mc 16:14', 'Lc 24:36-43', 'Jn 20:19-25'],
    ['Aparición a los discípulos con Tomás', '', '', '', 'Jn 20:26-31'],
    ['Junto al mar de Tiberias; restauración de Pedro', '', '', '', 'Jn 21:1-25'],
    ['La Gran Comisión', 'Mt 28:16-20', 'Mc 16:15-18', 'Lc 24:44-49', ''],
    ['La ascensión', '', 'Mc 16:19-20', 'Lc 24:50-53', ''],
  ]),
];

export const EVANGELIOS = [
  { k: 'mt', b: 40, nombre: 'Mateo' },
  { k: 'mc', b: 41, nombre: 'Marcos' },
  { k: 'lc', b: 42, nombre: 'Lucas' },
  { k: 'jn', b: 43, nombre: 'Juan' },
];

/** Lista plana numerada: [{ n, seccion, t, mt, mc, lc, jn }] */
export const PERICOPAS = ARMONIA.flatMap((s) => s.pericopas.map((p) => ({ ...p, seccion: s.titulo })))
  .map((p, i) => ({ ...p, n: i + 1 }));

/** Rango numérico de una columna ('' → null) */
export function rangoDe(cita) {
  if (!cita) return null;
  const r = parsear(cita);
  return r ? rango(r) : null;
}

/** Perícopas donde aparece un versículo (para la guía del pasaje) */
export function pericopasDe(id) {
  return PERICOPAS.filter((p) => EVANGELIOS.some((e) => {
    const r = rangoDe(p[e.k]);
    return r && id >= r.desde && id <= r.hasta;
  }));
}

/** Cuántos evangelios narran la perícopa */
export const testigos = (p) => EVANGELIOS.filter((e) => p[e.k]).length;

/**
 * Palabras que comparten dos o más columnas (sin tildes ni mayúsculas).
 * Devuelve un Set con las formas normalizadas que se repiten entre relatos.
 */
export function palabrasComunes(textos, { minimo = 2, vacias = new Set() } = {}) {
  const cuenta = new Map();
  for (const t of textos) {
    const unicas = new Set((String(t).match(/\p{L}+/gu) || []).map((w) => normalizar(w)).filter((w) => w.length > 2 && !vacias.has(w)));
    for (const w of unicas) cuenta.set(w, (cuenta.get(w) || 0) + 1);
  }
  return new Set([...cuenta].filter(([, n]) => n >= minimo).map(([w]) => w));
}
