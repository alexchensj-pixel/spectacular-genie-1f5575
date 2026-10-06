// EXPERIENCES (V22 · paso 6) — «SML también sale del gimnasio.» Línea de negocio B2B, independiente de las clases B2C.
// Arquitectura: Experiences → Categorías → Selected Work → Case Study → Contacto.
// Todo el contenido sale de lo que YA existe en el proyecto (Content.js → empresas, site; Media.js → eci) o de lo que SML indicó
// para el caso El Corte Inglés. No hay precios, asistentes, métricas, fechas, porcentajes, clientes ni testimonios.
// Lo que no esté documentado va a null y NO se muestra (p. ej. «Qué necesitaba el cliente»).
import { empresas } from './Content.js';
import { eci } from './Media.js';

const item = (nombre) => empresas.items.find((i) => i.nombre === nombre);
const urb = item('Urbanizaciones / residenciales');

export const b2b = {
  marca: 'EXPERIENCES',
  volver: 'VOLVER AL LAB',
  contactoCta: 'CONTACTO',

  // 01 · EXPERIENCES + CATEGORÍAS. `respaldo` solo existe donde hay algo real detrás; `estado` distingue proyecto realizado de propuesta.
  hero: {
    kicker: 'EXPERIENCES',
    titular: ['SML también', 'sale del gimnasio.'],
    lead: empresas.texto,
  },
  categorias: {
    k: 'Elige el tipo de experiencia',
    contar: 'CONTAR MI PROYECTO',
    verTrabajo: 'VER EL CASO',
    items: [
      { id: 'empresas', nombre: 'Empresas', linea: item('Empresas').texto },
      { id: 'hoteles', nombre: 'Hoteles', linea: item('Hoteles').texto,
        respaldo: { estado: 'propuesta', etiqueta: 'Propuesta desarrollada', texto: 'Propuestas desarrolladas para Hotel 101 e ILUNION Atrium.' } },
      { id: 'residenciales', nombre: 'Residenciales', linea: urb.texto },
      { id: 'eventos', nombre: 'Eventos', linea: item('Eventos').texto,
        respaldo: { estado: 'realizado', etiqueta: 'Proyecto realizado', texto: 'Evento con El Corte Inglés.', work: true } },
      { id: 'marcas', nombre: 'Marcas', linea: 'Acciones de marca con deportes de combate.' },
    ],
  },

  // 02 · SELECTED WORK — un único proyecto: El Corte Inglés.
  seleccion: {
    k: 'SELECTED WORK',
    cta: 'VER CASE STUDY',
    proyecto: {
      id: 'eci', estado: 'realizado', etiqueta: 'Proyecto realizado', categoria: 'Eventos',
      nombre: 'El Corte Inglés',
      sub: 'Evento vinculado a una agencia de viajes a Tailandia',
      resumen: 'Una experiencia de combate completa dentro de un evento de El Corte Inglés vinculado a una agencia de viajes a Tailandia.',
      portada: eci.espacio,
      alt: 'Vista general del set: decorado de Muay Thai, tatami negro, material a un lado y público observando una demostración.',
    },
  },

  // 03 · CASE STUDY — BRIEF · CONCEPT · EXPERIENCE · EXECUTION · RESULT. Textos = campos documentados del caso (propuesta original + lo indicado por SML).
  // `texto`: [etiqueta | null, frase]. `datos`: pares de la propuesta original (se rotulan como «planteado», no como ejecutado).
  // `medios`: ids de `casoMedios` (material real del evento; los pies describen solo lo que se ve).
  caso: {
    k: 'CASE STUDY',
    nombre: 'El Corte Inglés',
    // «Qué necesitaba el cliente»: no documentado → no se muestra.
    necesitabaCliente: null,
    bloques: [
      { id: 'brief', k: 'BRIEF', pregunta: 'Qué se planteó.',
        texto: [
          ['Contexto', 'Evento de El Corte Inglés en Madrid, vinculado a una agencia de viajes a Tailandia, con un espacio ambientado en Muay Thai.'],
          ['Objetivo', 'Acercar el Muay Thai al público de forma dinámica, segura y entretenida.'],
        ] },
      { id: 'concept', k: 'CONCEPT', pregunta: 'La idea.',
        texto: [
          ['Función dentro del evento', 'Poner una experiencia de combate completa dentro del evento: demostración, participación, talleres y dinamización.'],
          ['Qué hizo SML', 'Diseñó y ejecutó la experiencia de combate del evento: demostraciones, explicación técnica, participación guiada, talleres y dinamización del público.'],
        ],
        medios: ['set'] },
      { id: 'experience', k: 'EXPERIENCE', pregunta: 'Qué vivió el participante.',
        texto: [
          [null, 'Cada intervención se planteó con demostración y explicación técnica.'],
          ['Participación', 'Los asistentes aprendieron y practicaron con el equipo y, más adelante, trabajaron con paos y manoplas.'],
          ['Talleres', 'Entre una intervención y otra, talleres con las personas presentes: fundamentos y golpes básicos.'],
        ],
        medios: ['demostracion', 'pads', 'participacion'] },
      { id: 'execution', k: 'EXECUTION', pregunta: 'Cómo se llevó a cabo.',
        texto: [
          ['Instalación', 'SML llevó e instaló el tatami.'],
          ['Material', 'SML aportó el material necesario para demostraciones y participación, también para el trabajo con paos y manoplas.'],
        ],
        planteadoK: 'Estructura planteada',
        datos: [['Formato', '2 días · 8 intervenciones (4 por día)'], ['Duración', '20 minutos por intervención'], ['Equipo', '1 instructor + 2 peleadores'],
          ['Incluía', 'Tatami, material, demostraciones, explicación técnica, participación guiada, preparación y coordinación']],
        medios: ['publico'] },
      // Solo lo verificable en el material real: lo ejecutado según SML. No hay cifras de asistencia, impacto ni resultados comerciales documentados.
      { id: 'result', k: 'RESULT', pregunta: 'Lo que se ejecutó.',
        texto: [[null, 'Dos días consecutivos con las ocho intervenciones programadas; entre una y otra, el equipo siguió trabajando durante la jornada.']] },
    ],
    // Material real del evento. Los pies describen SOLO lo que se ve en cada plano.
    medios: {
      set: { tipo: 'foto', src: eci.set, alt: 'Decorado «Muay Thai · Viajes El Corte Inglés» con cuerdas de ring, tatami negro y guantes, espinilleras y cascos preparados en el suelo.', pie: 'Decorado, tatami y material de protección preparados.' },
      demostracion: { tipo: 'video', src: eci.demostracion, poster: eci.demostracionPoster, alt: 'Dos practicantes de muay thai trabajando con paos durante el evento.', pie: 'Demostración de muay thai con paos.' },
      pads: { tipo: 'video', src: eci.pads, poster: eci.padsPoster, alt: 'Trabajo con paos junto al tatami, con público alrededor.', pie: 'Trabajo con paos junto al tatami, con público alrededor.' },
      participacion: { tipo: 'foto', src: eci.participacion, alt: 'Un profesional y una asistente en el tatami frente al decorado de Tailandia.', pie: 'Interacción con el público sobre el tatami.' },
      publico: { tipo: 'foto', src: eci.publico, alt: 'Público reunido alrededor del tatami mientras se realiza una demostración con paos.', pie: 'Público alrededor del tatami durante una demostración.' },
    },
  },

  // Propuestas de hotel (Hotel 101, ILUNION Atrium): NO son proyectos ejecutados y no forman parte de Selected Work. Ya no se muestran en la interfaz;
  // solo constan como `respaldo` de la categoría Hoteles. Se conservan aquí por si una fase posterior las necesita.
  propuestasHotel: [
    { id: 'hotel101', nombre: 'Hotel 101', titulo: 'Experiencias deportivas privadas para huéspedes', disciplinas: 'Boxeo · Kickboxing · Muay Thai', formatos: '1 huésped · dúo · grupo privado (3–4)',
      reparto: [['El hotel aporta', 'El espacio deportivo y el acceso a los huéspedes.'], ['SML aporta', 'Entrenador, material, preparación y desarrollo completo de cada sesión.']],
      nota: 'Parte de sesiones privadas que ya se realizan en el hotel.' },
    { id: 'ilunion', nombre: 'ILUNION Atrium', titulo: 'Entrenamiento privado durante la estancia', disciplinas: 'Boxeo · Kickboxing · Muay Thai · Boxing Fitness', formatos: '1 persona · dúo · grupo de 3–4',
      reparto: [['El hotel aporta', 'Sus instalaciones: el gimnasio del hotel como escenario.'], ['SML aporta', 'Entrenador y material: guantes, tibiales, paos, vendas y material auxiliar.']],
      nota: 'Servicio activado bajo reserva. Parte de sesiones ya realizadas en las instalaciones.' },
  ],

  // 04 · CONTACTO — mismo mecanismo que antes (WhatsApp con el mensaje ya escrito, sin backend). Solo lo necesario para iniciar la conversación.
  contacto: {
    titular: 'Cuéntanos tu proyecto.',
    lead: 'No necesitas tener la experiencia completamente definida; podemos diseñarla contigo.',
    tipoLabel: 'Tipo de proyecto',
    tipoVacio: 'Elige una opción',
    otro: 'Otro',
    enviar: 'ENVIAR',
    directo: 'Escribir directamente por WhatsApp',
    mensajeDirecto: empresas.mensaje,
    envio: 'Se abre WhatsApp con tu mensaje ya escrito: solo tienes que confirmar el envío.',
    error: 'Falta tu nombre o tu WhatsApp / email para poder responderte.',
  },
};
