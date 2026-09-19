/**
 * seed.js — Repertorio de ejemplo.
 *
 * Se usan himnos de dominio público (letra y música libres de derechos) para
 * que la app venga con material real y legal. Para canciones modernas, crea la
 * canción y pega tú la letra: recuerda reportarla con tu licencia (CCLI o la
 * que use tu iglesia) — hay un campo para el número en cada canción.
 */

export const SEED_SONGS = [
  {
    id: 'seed-santo',
    title: 'Santo, Santo, Santo',
    author: 'Reginald Heber (1826) · trad. Juan B. Cabrera · Melodía: Nicaea',
    key: 'D',
    originalKey: 'D',
    capo: 0,
    bpm: 72,
    timeSignature: '4/4',
    feel: 'balada',
    tags: ['himno', 'adoración', 'apertura', 'dominio público'],
    youtubeId: '',
    ccli: 'Dominio público',
    durationSec: 200,
    body: `{Intro}
| [D] | [A] | [D] | [A] |

{Verso 1}
[D]Santo, [A]Santo, [D]Santo, Señor omnipo[A]tente,
[D]siempre el labio [G]mío [D]loores te da[A]rá.
[D]Santo, [A]Santo, [D]Santo, te adoro reve[A]rente,
[D]Dios en tres Per[G]sonas, [D]bendita Trini[A]dad[D].

{Verso 2}
[D]Santo, [A]Santo, [D]Santo, en numeroso [A]coro,
[D]santos esco[G]gidos [D]te adoran con fer[A]vor;
[D]de alegría [A]llenos, y [D]sus coronas de [A]oro
[D]rinden ante el [G]trono y [D]el glorioso [A]sol[D].

{Verso 3}
[D]Santo, [A]Santo, [D]Santo, la inmensa muche[A]dumbre
[D]de ángeles que [G]cumplen [D]tu santa volun[A]tad,
[D]ante ti se [A]postra, [D]bañada de tu [A]lumbre,
[D]ante ti que [G]has sido, [D]que eres y se[A]rás[D].

{Final}
// Ritardando en la última frase, solo voces y piano.
| [D] | [G] [A] | [D] |`,
    notes: 'Himno de apertura. Empezar solo con piano y voz; la banda entra en el verso 2. El verso 3 puede ir a capela.',
    instrumentNotes: {
      guitarra: 'Capo 0 en D. Si cuesta, capo 2 y formas de C. Arpegio en el verso 1, rasgueo suave desde el verso 2.',
      piano: 'Voicings cerrados, pedal por acorde. En el verso 3 toca solo blancas largas.',
      bateria: 'Fuera en el verso 1. Cross-stick desde el verso 2. Sin crash hasta el final.',
      bajo: 'Fundamentales en redondas. Nada de adornos.',
      voz: 'Melodía clara, sin armonía en el verso 1.',
    },
    timeline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-sublime',
    title: 'Sublime Gracia',
    author: 'John Newton (1779) · Melodía: New Britain',
    key: 'G',
    originalKey: 'G',
    capo: 0,
    bpm: 82,
    timeSignature: '3/4',
    feel: '3/4',
    tags: ['himno', 'gracia', 'dominio público'],
    youtubeId: '',
    ccli: 'Dominio público',
    durationSec: 230,
    body: `{Intro}
| [G] | [G] | [C] | [G] |

{Verso 1}
[G]Sublime gracia del Se[C]ñor[G]
que a un infe[Em]liz sal[D]vó;
[G]fui ciego mas hoy [C]veo [G]yo,
perdido y [D]él me ha[G]lló.

{Verso 2}
[G]Su gracia me enseñó a ven[C]cer[G],
mis dudas di[Em]sipó[D];
[G]¡Oh cuán precioso fue a mi [C]ser[G]
cuando él me [D]transfor[G]mó!

{Verso 3}
[G]En los peligros o aflic[C]ción[G]
que yo he te[Em]nido a[D]quí,
[G]su gracia siempre me li[C]bró[G]
y me guia[D]rá feliz[G].

{Final}
// Último verso a capela, luego la banda entra en la última frase.
| [G] | [C] [D] | [G] |`,
    notes: 'En 3/4. Cuidado con acelerar: el error clásico es apurar el segundo tiempo de cada compás.',
    instrumentNotes: {
      guitarra: 'Bajo-rasgueo-rasgueo. Capo 0 en G o capo 3 con formas de E si quieres brillo.',
      piano: 'Mano izquierda: fundamental en el 1, acorde en 2 y 3. Es un vals: no lo conviertas en balada.',
      bateria: 'Vals suave o fuera. Si tocas, usa escobillas.',
      bajo: 'Solo el tiempo 1 de cada compás.',
      voz: 'Muy buena para armonías a tercera en el verso 3.',
    },
    timeline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-castillo',
    title: 'Castillo Fuerte es Nuestro Dios',
    author: 'Martín Lutero (1529)',
    key: 'C',
    originalKey: 'C',
    capo: 0,
    bpm: 96,
    timeSignature: '4/4',
    feel: 'rock',
    tags: ['himno', 'proclamación', 'dominio público'],
    youtubeId: '',
    ccli: 'Dominio público',
    durationSec: 210,
    body: `{Intro}
| [C] | [F] | [C] [G] | [C] |

{Verso 1}
[C]Castillo fuerte es nuestro [F]Dios,
de[C]fensa y buen es[G]cudo;
[C]con su poder nos libra[F]rá
en [C]todo tran[G]ce a[C]gudo.

{Verso 2}
[Am]Con furia y con a[Em]fán
a[F]cósanos Sa[C]tán;
por [Dm]armas deja [G]ver
as[C]tucia y gran po[Am]der,
[F]cual él, na[G]die es en la [C]tierra.

{Coro}
[C]Nuestra ayuda es su [F]nombre,
el [C]que hizo cielo y [G]tierra;
[Am]nada temeré, [F]nada temeré,
[C]porque él pe[G]lea por [C]mí.

{Final}
| [C] | [F] [G] | [C] |`,
    notes: 'Himno de proclamación: fuerte desde el inicio. Buen cierre de servicio o apertura en domingo de Reforma.',
    instrumentNotes: {
      guitarra: 'Rasgueo firme en negras, acentuando 2 y 4. Deja sonar las seis cuerdas en el coro.',
      piano: 'Acordes plenos, octavas en la izquierda. Es marcial, no íntimo.',
      bateria: 'Groove de 8 firme, crash al inicio de cada sección.',
      bajo: 'Fundamental y quinta, caminando entre acordes.',
      voz: 'Ideal para cantar al unísono toda la congregación.',
    },
    timeline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-plantilla',
    title: 'Plantilla: canción nueva',
    author: 'Tu equipo',
    key: 'G',
    originalKey: 'G',
    capo: 0,
    bpm: 74,
    timeSignature: '4/4',
    feel: 'balada',
    tags: ['plantilla'],
    youtubeId: '',
    ccli: '',
    durationSec: 0,
    body: `{Intro}
| [G] | [D] | [Em7] | [C] |

{Verso 1}
[G]Pega aquí la letra y pon los acordes entre corchetes
[D]justo en la sílaba donde cambia el acorde[Em7]
[C]Así la app sabe qué se toca en cada momento

{Pre-Coro}
| [Em7] | [C] | [G] | [D] |

{Coro}
[G]El coro suele ser más alto y más [D]lleno
[Em7]Deja que la congregación lo cante [C]sola una vez

{Puente}
| [Em7] | [C] | [G] | [D] |
// 8 compases, medio tiempo, solo voz y colchón

{Final}
| [G] | [C] | [G] |`,
    notes: 'Duplica esta canción para cada tema nuevo. Recuerda anotar el número de licencia si la canción tiene derechos.',
    instrumentNotes: { guitarra: '', piano: '', bateria: '', bajo: '', voz: '' },
    timeline: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
