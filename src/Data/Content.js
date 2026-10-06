// Estructura de la experiencia + contenido real (procedente de la web anterior, STRIKING_MOTION_LAB_PLANES_v8).
// Lo que la web anterior no tenía no se muestra: nada de texto provisional en pantalla (ver README → Huecos abiertos).
import { video, image, poster } from './Media.js';

// --- Datos de negocio (contacto, enlaces) ---
export const site = {
  nombre: 'Striking Motion Lab',
  claim: '1% Better Everyday',
  ciudad: 'Madrid',
  disciplinas: 'Muay Thai · Boxeo · Kickboxing · K1',
  whatsapp: '34603809155',            // formato internacional, sin +
  whatsappVisible: '603 809 155',
  instagram: { url: 'https://instagram.com/strikingmotionlab', handle: '@strikingmotionlab' },
  maps: 'https://maps.app.goo.gl/ZNfZvn9qgp2F7xiW9?g_st=ic',
  // Calendly (reserva directa de la Sesión Privada). Parámetros de color = los de la web anterior.
  calendlyBase: 'https://calendly.com/alexchensj',
  calendly: 'https://calendly.com/alexchensj?hide_gdpr_banner=1&background_color=0a0a0a&text_color=f2efe8&primary_color=9a1f2d',
  rating: { valor: '5.0', resenas: 18, fuente: 'Google' },
  logro: '3.º — Copa de España 2025 · FEKM / WAKO',
};

// Enlace de WhatsApp con mensaje ya escrito.
export const waLink = (msg) => `https://wa.me/${site.whatsapp}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;

// Frases ya aprobadas que estaban repetidas en Chen y en la FAQ. Se definen una sola vez para poder usarlas
// en el momento en que el cliente necesita entenderlas (Scene 03, Scene 04, FAQ) sin reescribirlas.
export const evaluacionInicialTexto = 'Empiezas con la Evaluación inicial: sesión presencial y privada (30€). Sirve para analizar tu punto de partida y construir tu plan a medida. Si después contratas un plan mensual, ese importe se descuenta del primer mes.';
// Reseñas: solo el dato documentado (nota media y nº de reseñas en Google). Sin adjetivos ni testimonios.
export const ratingTexto = `${site.rating.valor.replace('.', ',')} ★ · ${site.rating.resenas} reseñas ${site.rating.fuente}`;
export const materialTexto = 'El material necesario para las sesiones lo aporta Striking Motion Lab: no necesitas comprar nada para empezar.';

// --- 01 Entrada ---
export const hero = {
  claim: 'No elijas tu entreno. Descúbrelo.',
  // El mismo claim, partido en tres líneas para el último momento de la Entrada (Entrada.jsx).
  claimLineas: ['No elijas', 'tu entreno.', 'Descúbrelo.'],
  // Dos caminos principales, con el mismo peso: quien no sabe qué quiere descubre; quien ya lo sabe reserva sin pasar por Descubrir.
  noSe: { pre: 'No sé qué quiero', accion: 'Descubrir', aux: 'Explora el mundo del combate.' },
  yaSe: { pre: 'Ya sé qué quiero', accion: 'Reservar', aux: 'Sesión privada · 30 €' },
  // Ruta secundaria (no compite con las dos anteriores).
  ctaB2B: 'Empresas · Hoteles · Eventos →',
  // V22 — mensaje principal de HOME (visible desde el primer fotograma; no depende de ninguna animación ni del scroll).
  marca: 'Striking Motion Lab',
  titulo: ['Entrenamiento privado', 'de deportes de combate', 'en Madrid.'],
  disciplinasLinea: 'Boxeo · K1 · Muay Thai',
  ctaReservar: 'Reservar · 30 €',
  ctaExplorar: 'No sé qué necesito → Descubrir',
  contexto: 'Madrid · Sesiones privadas · Grupos reducidos',
  kicker: 'Madrid · Muay Thai · Boxeo · Kickboxing · K1',
  // Sin uso en pantalla. Reescrito: la web no recomienda disciplina automáticamente.
  texto: 'Entrenamiento privado de deportes de contacto en Madrid.',
};

// Secuencia narrativa de la Escena 01 (curiosidad → entrar → descubrir). Nada de info técnica/planes/
// evaluación aquí — eso vive en Escena 03. Se muestra progresivo, nunca junto, scrubeado con el scroll real
// del capítulo (ver Entrada.jsx#build). El último momento es ahora el claim (hero.claimLineas) + los dos CTA;
// `vive` y `apoyo` ya no se muestran (eran explicación del método: pertenecen a escenas posteriores).
export const entradaNarrativa = {
  pregunta: ['¿Alguna vez te has', 'preguntado cómo se sentiría', 'vivir el combate?'],
  entra: 'Entra.',
  entraSub: 'Descubre el mundo del combate.',
  vive: 'Vívelo en primera persona.',
  apoyo: ['Aprende cómo se entrena.', 'Adapta el proceso a ti.', 'Construye tu propia evolución.'],
};

// vh = longitud de scroll del capítulo (incluye la pantalla visible).
// id = nombre técnico interno del módulo (Experience/<Id>). label = lo que ve el usuario.
// p.ej. 'character-select' es el módulo interno; el usuario nunca ve esa palabra, ve "Descubrir".
export const chapters = [
  { id: 'entrada',          n: '01', label: 'Inicio',                vh: 210 },
  { id: 'character-select', n: '02', label: 'Descubrir',             vh: 135 }, // EXPLORE (V22): una sola pantalla de decisión (sin película); 35vh de meseta antes del umbral
  { id: 'asesoria-lab',     n: '03', label: 'Método',                 vh: 250 }, // V22 · paso 4: cinco pasos densos (antes 360vh); en móvil el capítulo fluye (sin pin)
  { id: 'slot',             n: '04', label: 'Entrenamiento',         vh: 280 }, // cuatro pasos (Elección directa · Frecuencia · Combinación · Resultado) sobre las piezas de la máquina 3D: pantalla fija; el primero ya es una elección completa (420 vh era para seis)
  { id: 'proof-chen',       n: '05', label: 'Sobre Chen',            vh: 260 },
  { id: 'reserva',          n: '06', label: 'Reserva',               vh: 140 },
];

export const chapterById = Object.fromEntries(chapters.map((c) => [c.id, c]));

// Umbrales narrativos entre capítulos (tramo de scroll con velo + viaje de cámara).
export const thresholdLabels = {
  'entrada>character-select': 'Entrada al mundo del combate',
  'character-select>asesoria-lab': 'De la selección al protocolo',
  'asesoria-lab>slot': 'Del protocolo a la configuración',
  'slot>proof-chen': 'Resolución · evidencia',
  'proof-chen>reserva': 'Acceso',
};

// Secuencia ordenada de tramos de scroll: capítulo, umbral, capítulo, umbral...
export const segmentKeys = chapters.flatMap((c, i) =>
  i < chapters.length - 1 ? [c.id, `${c.id}>${chapters[i + 1].id}`] : [c.id]
);

// --- Bridge · escena narrativa HOME → EXPLORE (CUERPO → COMBATE → MAPA → STRIKING → DISCIPLINAS) ---
// Vive DENTRO del umbral 'entrada>character-select' (ver Threshold.jsx + Experience/Entrada/Bridge.jsx): no es un capítulo nuevo,
// no tiene sala 3D propia (Scene/Environment/Bridge/BridgeHall.jsx envuelve el tramo final del corredor de Entrada) y los tres
// luchadores permanecen ocultos mientras dura (BRIDGE_END / BRIDGE_OUT_END en Scene/Transitions/scrollState.js).
// Copy cerrado: no se reescribe ni se resume aquí. EXPLORE NO lo repite (no hay mapa plegado en Explore): el mapa se cuenta una sola vez, aquí.
export const bridge = {
  // Bloque 1 · EL CUERPO: el cuerpo condiciona la forma de combatir; Tyson y McGregor, como ejemplos opuestos.
  cuerpo: {
    titulo: ['CADA PERSONA TIENE UNAS CARACTERÍSTICAS FÍSICAS DIFERENTES.'],
    apoyo: 'Altura, alcance, movilidad, coordinación, velocidad, etc.',
  },
  ejemplos: {
    casos: [
      { nombre: 'PIENSA EN MIKE TYSON:', texto: 'DISTANCIA CORTA, EXPLOSIVIDAD, MOVIMIENTOS COMPACTOS.' },
      { nombre: 'O EN CONOR McGREGOR:', texto: 'ALCANCE, DISTANCIA Y TRABAJO DE PIERNAS.' },
    ],
  },
  // Bloque 2 · EL COMBATE: de ambos ejemplos → no existe una única manera de combatir.
  combate: {
    texto: 'PERO NO TODAS LAS PERSONAS COMBATEN DE LA MISMA FORMA.',
  },
  // Bloque 3 · EL MAPA: se revela capa a capa, de arriba abajo (misma pila con profundidad de siempre).
  mapa: {
    pasos: [
      'COMBATE',
      'ARTES MARCIALES / DEPORTES DE COMBATE',
      'STRIKING + GRAPPLING',
      'STRIKING',
      'BOXEO · K1 / KICKBOXING · MUAY THAI',
    ],
  },
};

// --- 02 Descubrir ---
// Escena 02 = "¿Qué posibilidades existen?". Se lee desde la pregunta del cliente ("si entro aquí, ¿cómo puedo
// entrenar?"), no desde la del entrenador. Dos capas SEPARADAS: (1) formas de entrenar, (2) disciplinas.
// Las formas NO son una escalera (ninguna vale más que otra): por eso se presentan una a una, con un índice de
// cinco marcas iguales y una nota explícita. Todo se escribe como si se lo contáramos a alguien que nunca ha
// pisado un gimnasio de combate: si aparece un término técnico, se explica en el mismo sitio.
// Los textos van en minúscula/normal: las versiones en mayúsculas (display) se aplican por CSS.
export const seleccion = {
  // Eje de la escena (título) y cierre. La pregunta final NO responde nada: abre la siguiente fase.
  pregunta: '¿Qué posibilidades existen?',
  lead: 'Antes de elegir una disciplina, descubre cómo puedes entrenar.',
  cierre: '¿Y qué tiene sentido para ti?',

  // Capa 1 — formas de vivir el entrenamiento.
  formasNota: 'No son niveles. Son distintas formas de entrenar.',
  formas: [
    {
      id: 'aprender', titulo: 'Aprender',
      concepto: 'Empiezas desde cero.',
      texto: 'Aprendes a colocarte, moverte, golpear y defenderte. Trabajas con saco (una bolsa pesada que se golpea), manoplas (las almohadillas que sujeta tu entrenador) y ejercicios técnicos. Repites, corriges y vuelves a intentarlo hasta que el movimiento empieza a salir de forma natural.',
      etiquetas: ['No necesitas experiencia', 'No necesitas hacer sparring (practicar contra otra persona)'],
      cierre: 'Puedes aprender este deporte sin tener que pelear.',
    },
    {
      id: 'entrenar', titulo: 'Entrenar',
      concepto: 'Entrena tu cuerpo a través del combate.',
      texto: 'Combinas técnica, movimiento y preparación física. Trabajas fuerza, resistencia, coordinación y movilidad mientras aprendes a golpear, moverte y combinar golpes.',
      etiquetas: ['Sesión física y dinámica', 'Exigente', 'No es una pelea'],
      cierre: 'Una forma diferente de ponerte en forma mientras aprendes un deporte.',
    },
    {
      id: 'peleador', titulo: 'Vivir el entrenamiento de un peleador',
      concepto: 'Descubre cómo se prepara un peleador.',
      texto: 'Técnica, saco, manoplas, desplazamientos, combinaciones, reacción, preparación física y situaciones cada vez más exigentes.',
      etiquetas: ['Aunque nunca vayas a competir'],
      cierre: 'La intensidad y la dificultad se adaptan a tu nivel.',
    },
    {
      id: 'sparring', titulo: 'Sparring',
      concepto: 'Practicar lo aprendido con un compañero.',
      texto: 'Cuando tienes una base técnica suficiente, puedes empezar a trabajar con un compañero. Practicas lo que has aprendido frente a otra persona y empiezas a trabajar la distancia, la reacción, la defensa y la adaptación.',
      destacada: ['No es una pelea.', 'Es una forma de aprender.'],
      etiquetas: ['No es obligatorio', 'No es para el primer día', 'Se introduce poco a poco', 'Se adapta a tu nivel', 'Finalidad técnica'],
    },
    {
      id: 'competir', titulo: 'Competir',
      concepto: 'Si algún día quieres llevarlo más lejos.',
      texto: 'El entrenamiento puede orientarse hacia la competición: preparación específica, estrategia, táctica, acondicionamiento físico y sparring. Es una orientación más, no un nivel superior.',
      destacada: ['Competir es una posibilidad,', 'no un requisito para entrenar.'],
    },
  ],

  // Puente entre capas: forma de entrenar y disciplina son DOS decisiones distintas, y todavía no hay que combinarlas.
  puente: {
    titulo: 'Forma de entrenar ≠ disciplina.',
    forma: { etiqueta: '¿Cómo puedes entrenar?', texto: 'Las formas de entrenamiento que acabas de ver.' },
    disciplina: { etiqueta: '¿Qué disciplina quieres explorar?', texto: 'Boxeo, K1 o Muay Thai.' },
  },

  // Capa 2 — exploración de disciplinas (interacción con los luchadores 3D). disciplinasIntro precede a
  // la pista de exploración: encuadra que, dentro del Striking, hay varias disciplinas antes de nombrarlas.
  disciplinasIntro: [
    'AHORA SÍ. CONOCE LAS DISCIPLINAS.',
    'Comparten el golpeo, pero cambian las reglas, las herramientas y la forma de combatir.',
  ],
  // Etiqueta del bloque de atributos: son énfasis/herramientas, nunca puntuación ni ranking.
  atributosEtiqueta: 'Énfasis · herramientas',
  explorar: 'Toca a cada luchador para conocer su disciplina',
  volver: 'Toca de nuevo al luchador para volver',
  // Aclaración breve del servicio, DESPUÉS de la exploración. Sin precios, planes, método, evaluación ni reserva.
  servicio: {
    titulo: '¿Cómo sería entrenarla contigo?',
    linea1: 'ENTRENAMIENTO PRIVADO DE DEPORTES DE CONTACTO.',
    linea2: 'Adaptado a tu nivel, tu objetivo y tu forma de entrenar.',
    linea3: 'En Madrid, donde tenga sentido para ti.',
  },
  enUnaSesion: 'En una sesión',
  enClaro: 'En claro',
};

// --- EXPLORE (V22 · paso 3) ---
// Experiencia de decisión que sigue al Bridge (Character Select + parte de Disciplines). Dos decisiones, en este orden:
//   1) ¿Cómo quieres entrenar?  → selectedTrainingMode (las cinco FORMAS de `seleccion.formas`; no son niveles)
//   2) ¿Qué disciplina?         → selectedDiscipline  (BOXEO · K1 / KICKBOXING · MUAY THAI, de Data/Disciplines.js)
// Todo lo que explica cada forma (texto, etiquetas, cierre) y cada disciplina (descripción, entrenamiento, atributos, glosario)
// se reutiliza de `seleccion` y de Data/Disciplines.js: aquí solo viven los títulos del bloque y las frases de una línea.
export const explore = {
  titulo: 'No todo el mundo entrena por lo mismo.',
  intro: 'Descubre qué tipo de experiencia encaja contigo.',
  // Una línea por forma (la explicación completa aparece solo al elegirla: seleccion.formas[i]).
  modos: {
    aprender: 'Entender la técnica y construir una base sólida.',
    entrenar: 'Mejorar condición física, coordinación, movilidad y capacidad de combate.',
    peleador: 'Experimentar una preparación más completa y exigente.',
    sparring: 'Aplicar lo aprendido frente a otra persona, con control y criterio.',
    competir: 'Prepararte específicamente para competir cuando ese sea tu objetivo.',
  },
  // Títulos visibles de las cinco opciones (en este orden exacto).
  modosTitulo: {
    aprender: 'Aprender',
    entrenar: 'Entrenar',
    peleador: 'Vivir el entrenamiento de un peleador',
    sparring: 'Sparring',
    competir: 'Competir',
  },
  notaModos: 'No son niveles. Son formas distintas de entrenar.',
  disciplinasTitulo: 'Después elegimos cómo.',
  // Etiquetas de los bloques de la disciplina elegida.
  bloques: { personaje: 'Personaje y vídeo', que: 'Qué es', como: 'Cómo se entrena', desarrolla: 'Qué desarrolla', glosario: 'Glosario' },
  tuEleccion: 'Tu elección',
  verLas3: 'Ver las tres disciplinas',
  seleccionado: 'Seleccionado',
  profundizar: 'Profundizar',
  cerrar: 'Cerrar',
};

// --- 03 Asesoría + Lab → METHOD (V22 · paso 4) ---
// Estructura V22: «No empezamos por el entrenamiento. Empezamos por ti.» + cinco pasos (01 Te conozco · 02 Te observo ·
// 03 Entrenamos · 04 Adaptamos · 05 Seguimos) + cierre. El copy es el de la especificación V22 y se usa literal.
// id/label = lo que lee el HUD. Los ids de paso son el valor de `substage` (App/store.js); 'apertura' se conserva como id de la
// cabecera porque es el valor inicial de `substage`. Un registro con `n` es un PASO (se pinta en la lista y reparte el scroll).
export const advisorySubstages = [
  {
    id: 'apertura', label: 'Entrada',
    titular: ['No empezamos por el entrenamiento.', 'Empezamos por ti.'],
  },
  {
    id: 'conozco', label: 'Te conozco', num: '01', n: 'TE CONOZCO',
    texto: 'Antes de decidir qué entrenar, necesitamos saber desde dónde empiezas.',
    elementos: ['Objetivo', 'Experiencia', 'Disponibilidad', 'Contexto'],
  },
  {
    id: 'observo', label: 'Te observo', num: '02', n: 'TE OBSERVO',
    texto: 'Vemos cómo te mueves antes de decidir qué necesitas.',
    destacada: 'Aquí entra la evaluación inicial.',
    etiqueta: 'Evaluación inicial · 30 €', // marca que acompaña al paso cuando está plegado
  },
  {
    id: 'entrenamos', label: 'Entrenamos', num: '03', n: 'ENTRENAMOS',
    texto: 'Lo que vemos determina lo que trabajamos.',
  },
  {
    id: 'adaptamos', label: 'Adaptamos', num: '04', n: 'ADAPTAMOS',
    texto: 'El plan no está cerrado. Evoluciona contigo.',
  },
  {
    id: 'seguimos', label: 'Seguimos', num: '05', n: 'SEGUIMOS',
    texto: 'Lo que trabajamos cambia contigo.',
  },
];

// Cierre de Method (se ve al final del recorrido; no es un paso).
export const metodoCierre = ['No solo entrenas.', 'Entiendes qué estás desarrollando.'];

// EVALUACIÓN INICIAL — producto concreto dentro del paso 02 · TE OBSERVO (aplicación práctica de «te observo»).
// CTA principal → BOOK existente (goToSection('book')). CTA secundario → información contextual en el propio paso (sin página nueva).
export const evaluacionInicial = {
  kicker: 'Primera sesión',
  kickerMetodo: 'Tu primer paso', // rótulo en Método (V27 MAPA · paso 5); Chen sigue usando `kicker`
  titulo: 'Evaluación inicial',
  precio: '30 €',
  texto: 'Una primera sesión privada para conocerte, observar cómo te mueves y entender qué necesitas.',
  nota: 'Si continúas con un plan mensual, los 30 € se descuentan del primer pago mensual.',
  cta: 'Reservar evaluación',
  ctaMas: 'Quiero saber más',
  // Contexto que se despliega con «Quiero saber más»: los mismos pasos del método aplicados a la primera sesión.
  mas: [
    ['Te conozco', 'Objetivo, experiencia, disponibilidad y contexto.'],
    ['Te observo', 'Cómo te mueves, antes de decidir qué necesitas.'],
    ['Después', 'Lo que vemos determina lo que trabajamos: de ahí sale tu plan a medida.'],
  ],
};


// --- 05 Chen ---
// Cada apartado puede llevar: texto[], datos[[clave, valor]], pasos[], imagen{src,alt}, enlace{href,label}, resenas[].
// Escena 05 muestra: CHEN → trayectoria → reseñas (prueba B2C: alumnos de sesiones privadas individuales).
// Método, formatos, planes, material y evaluación viven en las escenas 03/04 y NO se repiten aquí.
// Las fotos históricas solo apoyan la trayectoria; nada de galería ni de vídeos repetidos de Descubrir.
export const resenasGoogle = [
  'Alex es un coach excelente, que se adapta a tus necesidades y saca lo mejor de ti en cada sesión.',
  'Excelente profesor. Muy enfocado en la técnica.',
  'Un entrenador con muchas ganas y muy pendiente con el alumno, sacar el mejor de cada uno.',
];

export const dossierItems = [
  {
    id: 'chen', label: 'Chen', titulo: 'Peleador. Entrenador.',
    texto: ['Compito en Muay Thai y K1, y entreno dentro de un entorno con deportistas vinculados a la selección española y campeones nacionales FEKM. Cada sesión privada parte de esa misma exigencia.'],
  },
  {
    id: 'trayectoria', label: 'Trayectoria',
    datos: [['Disciplinas', 'Muay Thai y K1'], ['Resultado', site.logro]],
    texto: ['Entreno dentro de un entorno con deportistas vinculados a la selección española y campeones nacionales FEKM.'],
    imagen: { src: image.chenRing, alt: 'Chen, con pantalón corto rojo, de pie en el ring durante una competición federada FEKM de K1/Muay Thai' },
  },
  {
    // Solo lo lee Data/B2B.js (títulos de los 4 pasos). La escena 05 NO lo muestra (ProofChen.jsx lo filtra).
    id: 'metodo', label: 'Método',
    pasos: [
      { titulo: 'Te conozco', texto: 'Objetivo, experiencia, preferencias, necesidades y qué quieres desarrollar.' },
      { titulo: 'Te observo', texto: 'Lo que vemos se convierte en decisiones.' },
      { titulo: 'Entrenamos', texto: 'Cada sesión tiene un propósito.' },
      { titulo: 'Seguimos',   texto: 'El proceso cambia contigo.' },
    ],
  },
  {
    id: 'resenas', label: 'Lo que dicen los alumnos',
    datos: [['Google Maps', ratingTexto]],
    resenas: resenasGoogle,
    enlace: { href: site.maps, label: 'Ver en Google Maps' },
  },
];

// --- 06 Reserva ---
export const reserva = {
  titulo: 'Sesión privada · 30 €',
  subtitulo: 'Reserva directa',
  texto: 'Elige día y hora. Tu nivel y tu objetivo los evaluamos en la propia sesión.',
  // Dos caminos: reservar ya (calendario directo) o descubrir antes de decidir.
  caminos: {
    directo: { titulo: 'YA SÉ LO QUE QUIERO', accion: 'Sesión privada · 30 € → elige día y hora.' },
    dudas: { titulo: 'TODAVÍA NO LO TENGO CLARO', accion: 'Descubre las disciplinas antes de decidir.' },
  },
  // Única aclaración que reduce fricción (FAQ «¿Cómo funciona la reserva?»): el resto del proceso ya se explica en 03/04.
  despuesTitulo: 'Qué pasa después de reservar',
  despues: [
    'La sesión es presencial y privada (30€). El pago se gestiona aparte, no online.',
  ],
};

// --- Extras (fuera de los 6 capítulos): FAQ, empresas (materia prima del recorrido B2B), cierre ---
export const faq = [
  { q: 'No sé qué disciplina elegir', a: 'No necesitas saberlo. Para eso existe Descubrir: explora Boxeo, K1/Kickboxing y Muay Thai antes de decidir, o pide asesoramiento directo si sigues sin tenerlo claro.' },
  { q: '¿Puedo empezar completamente desde cero?', a: 'Sí. No se presupone ninguna experiencia previa — se empieza desde tu nivel real, priorizando técnica y progresión segura.' },
  { q: '¿Tengo que estar en forma para empezar?', a: 'No. La condición física se construye entrenando, no es un requisito de entrada. La intensidad se adapta a ti desde el primer día.' },
  { q: '¿Tengo que hacer sparring?', a: 'No es obligatorio. No es para el primer día: se introduce poco a poco y se adapta a tu nivel. No es una pelea, es una forma de aprender.' },
  { q: '¿Tengo que comprar material?', a: `${materialTexto} El Kit de Inicio (+65€: guantes + vendas + bucal) es opcional.` },
  { q: '¿Tengo que competir?', a: 'No. El entrenamiento puede orientarse a técnica y bienestar sin ninguna intención de competir.' },
  { q: '¿Qué ocurre en mi primera sesión?', a: 'Evaluamos tu nivel y tu objetivo, y empezamos a trabajar fundamentos. Solo necesitas ropa deportiva cómoda y agua — el material técnico lo llevo yo.' },
  { q: '¿Cómo sé qué plan elegir?', a: 'No hace falta decidirlo antes de empezar. Después de tu primera sesión te oriento sobre el plan que mejor encaja contigo, y siempre puedes cambiar de plan más adelante.' },
  { q: '¿Puedo empezar antes de contratar un plan?', a: `Sí. ${evaluacionInicialTexto}` },
  { q: '¿Cómo funciona la reserva?', a: 'Directamente desde la web: eliges día y hora disponible en el calendario y confirmas — sin tener que escribir antes para preguntar disponibilidad. El pago de la sesión se gestiona aparte, no online.' },
  { q: '¿Entrenáis a domicilio en toda Madrid?', a: 'Sí, con todo el material incluido. La disponibilidad concreta se confirma por WhatsApp.' },
];

export const empresas = {
  texto: 'El mismo método y la misma exigencia técnica, adaptados a equipos, huéspedes, comunidades y eventos.',
  items: [
    { nombre: 'Empresas', texto: 'Team building y bienestar físico para equipos — sesiones puntuales o programas recurrentes en tu oficina.' },
    { nombre: 'Hoteles', texto: 'Experiencias de combate para huéspedes, como actividad diferencial dentro de tu oferta de bienestar o actividad física.' },
    { nombre: 'Urbanizaciones / residenciales', texto: 'Entrenamientos privados o en grupo reducido para vecinos, dentro de la propia comunidad.' },
    { nombre: 'Eventos', texto: 'Activaciones y experiencias de deportes de combate para eventos puntuales.' },
  ],
  ayuda: 'Cuéntame el tipo de organización, número aproximado de participantes, ubicación y fecha, y te preparo una propuesta.',
  mensaje: 'Hola, estoy interesado/a en una propuesta de entrenamiento para empresa/hotel/evento.',
};

export const cierre = {
  titulo: 'No necesitas saber qué entrenar.',
  texto: 'Descubre tu disciplina — o reserva directamente si ya lo tienes claro.',
  yaSe: 'Ya sé lo que quiero — Reservar →',
  noSe: 'No sé qué elegir — Solicitar asesoramiento →',
  mensajeAsesoria: 'Hola, sigo sin tener claro qué disciplina encaja conmigo. ¿Podéis orientarme?',
};
