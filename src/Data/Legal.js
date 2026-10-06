// PÁGINAS LEGALES — Política de Privacidad y Aviso Legal.
// REGLA: aquí NO se inventa ningún dato legal. Todo lo que SML aún no ha facilitado se queda como PENDIENTE y se
// muestra resaltado en pantalla. Buscar «COMPLETAR POR SML» en este archivo para ver todo lo que falta.
// Los tratamientos descritos salen del código real de la web (formulario de grupos, formulario del footer, formulario B2B, reserva).
export const PENDIENTE = '[COMPLETAR POR SML]';

export const RUTAS = { privacidad: '/privacidad', aviso: '/aviso-legal' };

// Datos del responsable: TODOS pendientes. No hay ninguno confirmado en el proyecto.
export const responsable = [
  ['Razón social / titular', PENDIENTE],
  ['NIF / CIF', PENDIENTE],
  ['Domicilio legal', PENDIENTE],
  ['Email de contacto (privacidad / jurídico)', PENDIENTE],
  ['Teléfono de contacto', PENDIENTE],
  ['Datos de inscripción registral (si procede)', PENDIENTE],
];

export const legal = {
  privacidad: {
    titulo: 'Política de Privacidad',
    ruta: RUTAS.privacidad,
    secciones: [
      { h: 'Responsable del tratamiento', tabla: responsable },
      {
        h: 'Qué datos recogemos y para qué',
        items: [
          ['Formulario de grupo reducido', 'Nombre, WhatsApp o email, barrio, días, franja horaria y frecuencia. Finalidad: contactarte sobre el grupo y valorar si puede formarse. La demanda se muestra en el mapa solo de forma agregada; tu nombre y tu contacto nunca aparecen en la parte pública.'],
          ['Formulario «Escríbeme» (pie de página)', 'Nombre, WhatsApp/teléfono y, si los indicas, email, modalidad, zona, disponibilidad, objetivo y mensaje. Finalidad: responder a tu consulta.'],
          ['Formulario de empresas (B2B)', 'Nombre, WhatsApp o email y, si los indicas, empresa, tipo de proyecto, ubicación, fecha, participantes, necesidades y descripción. Finalidad: responder a tu propuesta de proyecto.'],
          ['Reserva de Sesión Privada', 'La reserva se gestiona en el calendario de Calendly, un servicio de terceros. Los datos que introduces ahí se rigen también por la política de privacidad de Calendly.'],
        ],
      },
      {
        h: 'Cómo se envían los datos',
        texto: [
          'Formulario de grupo reducido: los datos se envían a SML y se almacenan en un servicio de almacenamiento en la nube (Netlify Blobs) para gestionar la formación de grupos.',
          'Formularios del pie de página y de empresas: al aceptar esta política y pulsar el botón, se abre WhatsApp con el mensaje ya escrito. Los datos no se envían a SML hasta que tú confirmas el envío en WhatsApp, y el tratamiento posterior en esa aplicación depende de sus propias condiciones.',
        ],
      },
      {
        h: 'Base jurídica',
        texto: [`Tu consentimiento, que otorgas marcando la casilla correspondiente antes de enviar cada formulario. Base jurídica adicional (si procede): ${PENDIENTE}`],
      },
      { h: 'Plazo de conservación', texto: [`${PENDIENTE}`] },
      { h: 'Destinatarios y encargados del tratamiento', texto: [`Proveedores tecnológicos que intervienen según lo descrito arriba (alojamiento y almacenamiento: Netlify; reservas: Calendly; mensajería: WhatsApp). Listado definitivo de encargados y, si procede, transferencias internacionales: ${PENDIENTE}`] },
      {
        h: 'Tus derechos',
        texto: [`Puedes solicitar el acceso, la rectificación, la supresión, la oposición, la limitación y la portabilidad de tus datos, y retirar tu consentimiento en cualquier momento, escribiendo a: ${PENDIENTE}`, `Autoridad de control y vía de reclamación: ${PENDIENTE}`],
      },
    ],
  },

  aviso: {
    titulo: 'Aviso Legal',
    ruta: RUTAS.aviso,
    secciones: [
      { h: 'Titular del sitio web', tabla: responsable },
      { h: 'Objeto', texto: ['Este sitio web presenta los servicios de entrenamiento de Striking Motion Lab y permite contactar y reservar.'] },
      { h: 'Condiciones de uso', texto: [`${PENDIENTE}`] },
      { h: 'Propiedad intelectual e industrial', texto: [`${PENDIENTE}`] },
      { h: 'Responsabilidad', texto: [`${PENDIENTE}`] },
      { h: 'Legislación aplicable y jurisdicción', texto: [`${PENDIENTE}`] },
    ],
  },
};

// Texto de aceptación de los formularios del pie de página y de empresas (los enlaces los pinta cada formulario).
export const consentimientoPolitica = {
  pre: 'He leído y acepto la',
  enlace: 'Política de Privacidad',
  error: 'Para continuar, acepta la Política de Privacidad.',
};
