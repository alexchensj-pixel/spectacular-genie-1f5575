// Variables del Slot. El precio NO es una variable: se resuelve después, como consecuencia.

export const variables = [
  {
    // Opciones tomadas de la FAQ «¿Tengo que competir?»: «técnica y bienestar sin ninguna intención de competir».
    id: 'objetivo', label: 'Objetivo',
    options: [
      { id: 'tecnica', label: 'Técnica' },
      { id: 'bienestar', label: 'Bienestar' },
      { id: 'competir', label: 'Competir' },
    ],
  },
  {
    id: 'frecuencia', label: 'Frecuencia', question: '¿Cuánto entrenamiento puedes mantener de verdad?',
    options: [
      { id: '1-dia', label: '1 día' },
      { id: '2-dias', label: '2 días' },
      { id: '3-dias', label: '3 días' },
      { id: 'variable', label: 'Variable' },
    ],
  },
  {
    id: 'formato', label: 'Formato',
    options: [
      { id: '1-1', label: '1:1' },
      { id: 'duo', label: 'Parejas' },
      { id: 'grupo', label: 'Grupo reducido' },
      { id: 'hibrido', label: 'Híbrido' },
    ],
  },
  // «Personas» se elimina: sin fuente real y ya lo implica el formato (1:1, Parejas, Grupo reducido).
  {
    id: 'ubicacion', label: 'Ubicación',
    options: [{ id: 'domicilio', label: 'A domicilio en Madrid' }], // FAQ: «¿Entrenáis a domicilio en toda Madrid? Sí, con todo el material incluido».
  },
];

// "Híbrido" no es un plan: es una combinación de estas modalidades.
export const hybridBase = variables.find((v) => v.id === 'formato').options.filter((o) => o.id !== 'hibrido');

// Planes y precios EXISTENTES (web anterior, sección «Entrenamiento»). No se inventa nada.
//  tipo 'formato' → sesión suelta por modalidad (el id coincide con la opción de la variable «formato»).
//  tipo 'mensual' → plan mensual por frecuencia semanal (sesionesSemana).
export const existingPlans = [
  {
    id: '1-1', tipo: 'formato', nombre: '1:1', precio: 30, unidad: '€ / sesión suelta',
    texto: 'Máxima personalización. Adaptación completa a tu nivel y objetivo, con seguimiento individual desde la primera sesión. Se descuenta del primer mes si después contratas un plan mensual.',
  },
  {
    id: 'duo', tipo: 'formato', nombre: 'Parejas', precio: 20, unidad: '€ / persona / sesión',
    texto: 'Mismo formato personalizado, entrenando junto a otra persona — pareja, amigo o familiar.',
  },
  {
    id: 'grupo', tipo: 'formato', nombre: 'Grupo reducido', precio: 15, unidad: '€ / sesión', desde: 'desde 55€/mes',
    texto: 'Entrenamiento en grupos pequeños, máximo 4 personas, con más interacción sin perder la corrección individual. Si hay demanda en tu zona, podemos crear un grupo ahí.',
  },
  {
    id: 'arsenal', tipo: 'mensual', nombre: 'Arsenal', sesionesSemana: 1, precio: 110, unidad: '€ / mes',
    lema: 'Construye tus herramientas de combate.',
    enfasis: [['Técnica', 70], ['Personalización', 35], ['Estrategia', 20]],
    incluye: ['Evaluación técnica inicial', 'Análisis técnico en vídeo', 'Entrenamientos enfocados en técnica y condición física', 'Comba de entrenamiento de boxeo'],
    objetivo: 'Mejorar tu técnica y dar un paso firme.',
  },
  {
    id: 'striker', tipo: 'mensual', nombre: 'Striker', sesionesSemana: 2, precio: 185, unidad: '€ / mes',
    lema: 'Desarrolla tu capacidad como peleador.',
    enfasis: [['Técnica', 80], ['Personalización', 75], ['Estrategia', 50]],
    incluye: ['Base Arsenal', 'Plan de entrenamiento personalizado', 'Biblioteca de ejercicios personalizada', 'Trabajo específico según objetivos', 'Comba de entrenamiento de boxeo'],
    objetivo: 'Más estructura, foco y resultados para el siguiente paso.',
  },
  {
    id: 'fight-iq', tipo: 'mensual', nombre: 'Fight IQ', sesionesSemana: 3, precio: 270, unidad: '€ / mes',
    lema: 'Aprende a leer y dominar el combate.',
    enfasis: [['Técnica', 90], ['Personalización', 90], ['Estrategia', 95]],
    incluye: ['Base Striker', 'Preparación específica para combate', 'Trabajo de estrategia y táctica', 'Desarrollo de estilo de pelea', 'Sparring supervisado con peleador', 'Comba de entrenamiento de boxeo'],
    objetivo: 'Para quien quiere ir más allá de mejorar: entender el combate y prepararse con criterio. Compromiso, disciplina y resultados.',
  },
];

// Kit opcional (no se suma automáticamente; se decide al reservar).
export const kitInicio = { nombre: 'Kit de Inicio', precio: 65, contenido: 'Guantes + vendas + bucal' };

// Utilidad de lectura de `variables`; hoy no la llama ningún componente (Data/Slot.js construye sus etiquetas con LABELS).
export function labelFor(variableId, optionId) {
  const v = variables.find((x) => x.id === variableId);
  return v?.options.find((o) => o.id === optionId)?.label ?? null;
}
