import { video, poster } from './Media.js';

// Copy de la Escena 02 (Descubrir), capa 2: las disciplinas. Escrito para alguien que NUNCA ha entrenado combate:
// con qué se golpea, cómo se mueve uno, si hay contacto y qué se aprende. Todo término técnico se explica aquí
// mismo (campo `glosario`).
//   name / tagline / atributos → definitivos del encargo.
//   descripcion   → qué es la disciplina (2 párrafos cortos: la idea, y cómo se ve un intercambio).
//   entrenamiento → qué haces tú en una sesión (incluye cuándo aparece el contacto con otra persona).
//   glosario      → términos técnicos en claro ({ t: término, d: definición }).
// video / poster / stage / accent son datos técnicos del 3D (posición y escala del luchador en la vitrina,
// color de identidad): no son copy y no se tocan aquí.
export const disciplines = [
  {
    id: 'boxeo', name: 'BOXEO', video: video.boxeo, poster: poster.boxeo,
    // accent: identidad de color SUTIL — solo se usa en la luz de la vitrina al enfocar y en el nombre del panel.
    accent: '#e2543c',
    tagline: 'Dominar la distancia',
    // Línea de una frase de la tarjeta de EXPLORE (antes de elegir: no se muestra nada más de la disciplina).
    linea: 'Manos. Distancia. Ángulos. Timing. Precisión.',
    atributos: ['Distancia', 'Ángulos', 'Timing', 'Precisión'],
    // Dónde están la cabeza (top), los pies (bot) y el centro (cx) dentro del vídeo, y su proporción: colocan y escalan al luchador en la vitrina.
    stage: { top: 0.087, bot: 0.997, cx: 0.584, ar: 720 / 1474 },
    descripcion: [
      'El Boxeo se centra en el uso de las manos. Al trabajar únicamente con los puños como herramientas de golpeo, la distancia y el movimiento adquieren una importancia fundamental.',
      'Entrar para atacar, defender la respuesta y volver a salir requiere controlar dónde estás, cuándo actúas y cómo te desplazas. Por eso el Boxeo desarrolla especialmente la precisión, los ángulos y el timing.',
    ],
    entrenamiento: 'Aprendes a moverte, lanzar puñetazos, defenderte y decidir cuándo entrar y cuándo salir. Al empezar trabajas contra saco y manoplas, no contra una persona.',
    glosario: [
      { t: 'Ángulos', d: 'colocarte de lado para golpear sin quedar de frente.' },
      { t: 'Timing', d: 'elegir el momento justo para golpear.' },
    ],
  },
  {
    id: 'k1', name: 'K1 / KICKBOXING', video: video.k1, poster: poster.k1,
    accent: '#4fb8c9',
    tagline: 'Intercambio en movimiento',
    linea: 'Puños. Piernas. Combinaciones. Ritmo. Movilidad.',
    atributos: ['Ritmo', 'Combinaciones', 'Movilidad', 'Timing'],
    stage: { top: 0.063, bot: 0.896, cx: 0.549, ar: 672 / 1360 },
    descripcion: [
      'El Kickboxing combina técnicas de puño y pierna. K1 es un reglamento concreto dentro de este universo, y sus reglas condicionan cómo se desarrolla el combate.',
      'A diferencia del Muay Thai, el trabajo prolongado de clinch está fuertemente restringido. Por eso los intercambios tienden a mantenerse más activos: combinar golpes, entrar, defender, responder y volver a colocarse para la siguiente acción.',
    ],
    entrenamiento: 'Aprendes a combinar puños y patadas, moverte sin parar, defender y responder. Empiezas con saco y manoplas; el contacto con un compañero llega después, y solo si tú quieres.',
    glosario: [
      { t: 'Combinaciones', d: 'varios golpes seguidos, encadenados.' },
      { t: 'Movilidad', d: 'moverte rápido para cambiar de posición y de ángulo.' },
    ],
  },
  {
    id: 'muay-thai', name: 'MUAY THAI', video: video.muayThai, poster: poster.muayThai,
    accent: '#d9a441',
    tagline: 'Trabajar diferentes distancias',
    linea: 'Puños. Piernas. Rodillas. Codos. Clinch.',
    atributos: ['Variedad', 'Clinch', 'Control', 'Equilibrio'],
    stage: { top: 0.1, bot: 0.997, cx: 0.498, ar: 688 / 1296 },
    descripcion: [
      'El Muay Thai utiliza un amplio repertorio de golpeo: puños, piernas, rodillas y codos. También incorpora el clinch, donde los luchadores pueden agarrar, controlar y desequilibrar al rival.',
      'Esto hace que el combate pueda cambiar constantemente de distancia: desde el intercambio de golpes hasta la corta distancia del clinch. Aprender a reconocer y resolver cada una de esas situaciones forma parte de la disciplina.',
    ],
    entrenamiento: 'Aprendes a golpear con distintas partes del cuerpo, moverte entre distancias y mantener el equilibrio. El clinch con un compañero se introduce poco a poco.',
    glosario: [
      { t: 'Clinch', d: 'agarre a corta distancia para controlar al rival y golpear desde ahí.' },
      { t: 'Equilibrio', d: 'mantenerte estable mientras empujas, agarras o esquivas.' },
    ],
  },
];
