// Scene 04 — ENTRENAMIENTO (Training + Plans). Datos VIVOS de la escena: preguntas, sesiones, planes mensuales, Starter Kit,
// recomendación y plan híbrido. Todo sale de Data/Programs.js (nada se calcula ni se inventa aquí).
// La generación anterior de la escena (esquema 1:1 + grupal, fichas por formato, ramas, subgrupos, ruleta) se conserva
// aislada en _legacy/Data/SlotLegacy.js; nada de lo vivo la importa.
import { hybridBase, existingPlans, kitInicio, variables } from './Programs.js';
import { materialTexto } from './Content.js';

// Copy vivo del plan híbrido que consume trainingUi (regla y rótulo de la combinación).
export const slot = {
  combinacion: {
    regla: 'Combina al menos 2 formatos distintos',
    tuCombinacion: 'TU COMBINACIÓN',
  },
};

// Solo modalidades que ya existen. `personas` sale de los textos publicados: 1:1 = una persona, Parejas = dos,
// Grupo reducido = «máximo 4 personas». Se usa solo para dibujar puntos en cada hueco.
const META = {
  '1-1': { nombre: '1:1', singular: '1:1', plural: '1:1', personas: 1 },
  duo: { nombre: 'PAREJAS', singular: 'PAREJA', plural: 'PAREJAS', personas: 2 },
  grupo: { nombre: 'GRUPO REDUCIDO', singular: 'GRUPO REDUCIDO', plural: 'GRUPO REDUCIDO', personas: 4, caption: 'Grupo reducido' }, // sin plural: «2 × GRUPO REDUCIDO»
};
export const MODALIDADES = hybridBase.map((o) => ({ id: o.id, ...META[o.id] }));
export const modalidad = (id) => MODALIDADES.find((m) => m.id === id);

// FRECUENCIA → COMBINACIÓN. El tamaño del plan ya no es una constante: es la frecuencia deseada (1 · 2 · 3 sesiones/semana).
// RACK.N = 4 (rackSpec.js) es la CAPACIDAD FÍSICA de la bandeja de la máquina, no el tamaño del plan: con N = 2 o 3 se llenan N huecos y el resto queda vacío.
export const CAPACIDAD_BANDEJA = 4;
export const MIN_MODALIDADES = 2; // «Híbrido = combinación de modalidades (mínimo 2)»: solo exigible cuando hay 2 sesiones o más
// La máquina combina PRIVADO + GRUPAL. Parejas sigue existiendo (cara del tambor, elección directa), pero no es el eje de la combinación.
export const MODALIDADES_COMBO = MODALIDADES.filter((m) => m.id === '1-1' || m.id === 'grupo');

// Frecuencia deseada → nº de sesiones (id de `variables` → número). «variable» no fija ninguna.
export const FRECUENCIA_NUM = { '1-dia': 1, '2-dias': 2, '3-dias': 3 };
export const sesionesDe = (frequency) => FRECUENCIA_NUM[frequency] ?? 0;

// Propuesta por defecto: regla determinista y transparente (sin scores). 1 → 1 × 1:1 · 2 → 1 × 1:1 + 1 × grupo · 3 → 1 × 1:1 + 2 × grupo.
// Con N = 1 no hay nada que combinar: una sesión privada (no se inventa «1 × grupo» como atajo).
export const propuestaCombinacion = (n) => ({ '1-1': n >= 1 ? 1 : 0, grupo: Math.max(0, n - 1), duo: 0 });

export const conteo = (n, m) => `${n} × ${n === 1 ? m.singular : m.plural}`;

// Resultado del Slot: combinación de modalidades. `tipo` = id de modalidad (Programs.js → formato).
export const armarPlan = (counts) => {
  const modalidades = MODALIDADES.filter((m) => counts[m.id] > 0).map((m) => ({ tipo: m.id, cantidad: counts[m.id] }));
  return { total: modalidades.reduce((s, m) => s + m.cantidad, 0), modalidades };
};

// ---------------------------------------------------------------------------------------------------------------------
// Scene 04 · PLANES Y PRECIOS. Nada se inventa: nombres, precios, frecuencias, lemas, contenidos y objetivos de los planes
// salen de Data/Programs.js (existingPlans, tipo 'mensual'); los precios de los formatos y del kit, también.
// El texto de los formatos y el kit es el contenido definitivo aprobado. Los `enfasis` de Programs.js NO se muestran.
// ---------------------------------------------------------------------------------------------------------------------
export const planes = existingPlans.filter((p) => p.tipo === 'mensual');
export const frecuencia = (n) => `${n} ${n === 1 ? 'sesión' : 'sesiones'}/semana`;
export const precioDe = (id) => existingPlans.find((p) => p.id === id).precio;

// PERFIL B — «no sé qué me conviene»: puede empezar sin configurar nada. Misma idea que la FAQ «¿Cómo sé qué plan elegir?».
// La Evaluación inicial (Sesión privada, 30 €) es la puerta de entrada; el plan se orienta DESPUÉS de la primera sesión.
export const empezar = {
  titulo: 'No necesitas saber qué plan elegir antes de empezar.',
  texto: 'Empieza con la Evaluación inicial, una sesión privada de 30 €: te conozco, te observo y entrenamos. Después de tu primera sesión te oriento sobre el plan que mejor encaja contigo.',
  cta: 'NO SÉ QUÉ ELEGIR · EMPEZAR CON LA EVALUACIÓN',
  ctaCorta: 'NO SÉ QUÉ ELEGIR',
  compacta: '¿Todavía no sabes cuál te conviene?',
};
// «Combinar formatos» ya no es la puerta de un producto: es lo que hace la máquina con tu frecuencia (privado + grupal en la misma semana).
export const hibrido = {
  pregunta: 'CONFIGURAR FRECUENCIA',
  apoyo: 'Privado y grupal en la misma semana.',
  titulo: 'TU COMBINACIÓN',
  texto: 'Dinos cuántas veces a la semana quieres entrenar y la máquina te propone cómo repartirlas entre 1:1 y grupo reducido. Puedes ajustarla.',
  reglas: ['Mínimo 2 formatos diferentes', 'Tantas sesiones como días a la semana', 'Ejemplo: 3 días = 1 × 1:1 + 2 × grupo reducido'],
  cta: 'RESERVAR EVALUACIÓN',
};

// ---------------------------------------------------------------------------------------------------------------------
// PASO 05 · TRAINING + PLANS (V22). Tres preguntas sencillas (objetivo → formato → frecuencia) y, debajo, los precios SIEMPRE
// a la vista. Las respuestas solo ORIENTAN (destacan y ponen primero una opción); no calculan nada y no esconden ningún precio.
// Estado (App/store.js): objetivo → selectedGoal · formato → selectedFormat · frecuencia → selectedFrequency.
// ⚠ selectedTrainingMode pertenece a EXPLORE: Training no lo lee ni lo escribe.
// Los ids salen de `variables` (Programs.js) para que coincidan con el resto del proyecto.
// ---------------------------------------------------------------------------------------------------------------------
export const training = {
  kicker: 'ENTRENAMIENTO',
  titulo: 'De las posibilidades a tu caso',
  intro: 'Elige directamente cómo entrenar o configura tu frecuencia: la máquina combina privado y grupal en tu semana.',
};

// ELECCIÓN DIRECTA (camino principal): tres salidas del mismo peso. V27 paso 6: el precio va en el PROPIO rótulo (no solo en el detalle);
// sale de Programs.js (precioDe / PLANES_DESDE), nada se inventa. `linea` = el dato que distingue a cada salida.
export const PLANES_DESDE = 55; // «Planes mensuales · Desde 55 €/mes» (grupo reducido con frecuencia mensual, ver Programs.js → grupo.desde)
export const salidas = [
  { id: '1-1', formato: '1-1', nombre: '1:1', linea: 'Privado', precio: `${precioDe('1-1')} €/sesión` },
  { id: 'duo', formato: 'duo', nombre: 'PAREJAS', linea: '2 personas', precio: `${precioDe('duo')} €/persona/sesión` },
  { id: 'grupo', formato: 'grupo', nombre: 'GRUPO REDUCIDO', linea: 'Máximo 4', precio: `${precioDe('grupo')} €/sesión · desde ${PLANES_DESDE} €/mes` },
];
// Texto de detalle de cada salida: el existente de Programs.js (existingPlans).
export const desdeGrupo = existingPlans.find((p) => p.id === 'grupo')?.desde ?? '';
export const detalleDe = (formato) => existingPlans.find((p) => p.id === formato)?.texto ?? '';

const LABELS = {
  tecnica: 'TÉCNICA', bienestar: 'BIENESTAR', competir: 'COMPETICIÓN',
  '1-1': '1:1', duo: 'PAREJA', grupo: 'GRUPO REDUCIDO', hibrido: 'HÍBRIDO',
  '1-dia': '1 DÍA', '2-dias': '2 DÍAS', '3-dias': '3 DÍAS', variable: 'VARIABLE',
};
const opcionesDe = (variableId) => variables.find((v) => v.id === variableId).options.map((o) => ({ id: o.id, label: LABELS[o.id] }));
export const preguntas = [
  { id: 'objetivo',   n: '01', q: '¿QUÉ BUSCAS?',             opciones: opcionesDe('objetivo') },
  { id: 'formato',    n: '02', q: '¿CÓMO QUIERES ENTRENAR?',  opciones: opcionesDe('formato') },
  { id: 'frecuencia', n: '01', q: '¿CUÁNTO PUEDES ENTRENAR?', opciones: opcionesDe('frecuencia') },
];

// ---- PRECIOS (todos salen de Programs.js → existingPlans / kitInicio; ninguno se calcula) ----
export const sesionesPrecios = [
  { id: 'sesion-privada', formato: '1-1',   nombre: 'SESIÓN PRIVADA',  precio: precioDe('1-1'),   unidad: '/sesión',          texto: 'Entrenamiento privado y personalizado.' },
  { id: 'parejas',        formato: 'duo',   nombre: 'PAREJAS',         precio: precioDe('duo'),   unidad: '/persona/sesión',  texto: 'Entrenamiento junto a otra persona.' },
  { id: 'grupo',          formato: 'grupo', nombre: 'GRUPO REDUCIDO',  precio: precioDe('grupo'), unidad: '/sesión',          texto: 'Máximo 4 personas.' },
];
export const planesMensuales = {
  titulo: 'PLANES MENSUALES',
  desde: PLANES_DESDE,
  desdeNota: 'En grupo reducido, con frecuencia mensual. Los planes 1:1 van debajo.',
  nota: 'Los 30 € de la evaluación inicial se descuentan del primer pago mensual.',
  items: planes.map((p) => ({
    id: p.id, nombre: p.nombre.toUpperCase(), precio: p.precio, unidad: '/mes', sesionesSemana: p.sesionesSemana,
    frecuencia: frecuencia(p.sesionesSemana), lema: p.lema,
  })),
};
// Accesorio, NO producto de entrenamiento: se muestra aparte y con otro peso visual.
export const starterKit = {
  etiqueta: 'ACCESORIO · OPCIONAL', nombre: 'STARTER KIT', precio: kitInicio.precio, contenido: 'Guantes + vendas + protector bucal', nota: materialTexto,
};
export const sesionesTitulo = 'SESIONES';
// Plan mensual en una línea: primero frecuencia + precio, después el nombre → «1 DÍA / SEMANA · 110 €/mes · Arsenal».
export const planLinea = (p) => `${p.sesionesSemana} ${p.sesionesSemana === 1 ? 'DÍA' : 'DÍAS'} / SEMANA · ${p.precio} €/mes · ${planes.find((x) => x.id === p.id)?.nombre ?? p.nombre}`;

// ---- RECOMENDACIÓN: lógica determinista y transparente (sin puntuaciones ni pesos) ----
//  · formato  → qué SESIÓN se destaca (1:1 → sesión privada · pareja → parejas · grupo → grupo reducido). Híbrido: panel propio.
//  · frecuencia → qué PLAN se destaca (1 día → Arsenal · 2 días → Striker · 3 días → Fight IQ). «Variable»: ninguno.
//  · objetivo → solo decide el plan si no has elegido frecuencia (técnica → Arsenal · competición → Fight IQ). Bienestar: ninguno.
// Cada opción destacada dice POR QUÉ lo está (porque: 'formato' | 'frecuencia' | 'objetivo'). Sin selección no se destaca nada.
const SESION_DE_FORMATO = { '1-1': 'sesion-privada', duo: 'parejas', grupo: 'grupo' };
const PLAN_DE_FRECUENCIA = { '1-dia': 'arsenal', '2-dias': 'striker', '3-dias': 'fight-iq' };
const PLAN_DE_OBJETIVO = { tecnica: 'arsenal', competir: 'fight-iq' };
export function recomendar({ goal = null, format = null, frequency = null } = {}) {
  const sesion = SESION_DE_FORMATO[format] ? { id: SESION_DE_FORMATO[format], porque: 'formato' } : null;
  let plan = null;
  if (PLAN_DE_FRECUENCIA[frequency]) plan = { id: PLAN_DE_FRECUENCIA[frequency], porque: 'frecuencia' };
  else if (PLAN_DE_OBJETIVO[goal]) plan = { id: PLAN_DE_OBJETIVO[goal], porque: 'objetivo' };
  return { sesion, plan };
}
export const porqueTexto = { formato: 'POR TU FORMATO', frecuencia: 'POR TU FRECUENCIA', objetivo: 'POR TU OBJETIVO' };

// ---- Textos de interfaz de Training ----
export const trainingUi = {
  limpiar: 'Borrar selección',
  variableNota: 'Con frecuencia variable no destacamos ningún plan: los planes mensuales fijan una frecuencia semanal.',
  grupoTexto: 'Máximo 4 personas. Los grupos se forman por zona, día, hora y frecuencia.',
  hibridoTexto: hibrido.texto,
  hibridoReglas: hibrido.reglas,
  hibridoRegla: slot.combinacion.regla,
  tuCombinacion: slot.combinacion.tuCombinacion,
  ctaSesion: 'RESERVAR SESIÓN PRIVADA',
  ctaParejas: 'ESCRIBIR PARA ENTRENAR EN PAREJAS',
  ctaPlan: 'EMPEZAR CON LA EVALUACIÓN',
  ctaHibrido: 'RESERVAR EVALUACIÓN',
  directoTitulo: 'ELECCIÓN DIRECTA',
  directoNota: 'Sin pasos previos.',
  configurar: 'CONFIGURAR FRECUENCIA',
  configurarLinea: 'Combina 1:1 y grupo reducido en tu semana.',
  volverDirecto: 'ELEGIR DIRECTAMENTE',
  frecuenciaTitulo: 'TU FRECUENCIA',
  combinacionTitulo: 'TU COMBINACIÓN',
  semanaLinea: 'Privado y grupal en la misma semana.',
  unaSesion: 'Con una sesión a la semana no hay nada que combinar: una sesión privada.',
  sinFrecuencia: 'Elige cuántos días a la semana para ver tu combinación.',
  variableTexto: 'Con frecuencia variable no fijamos una combinación. Elige directamente un formato o empieza con la Evaluación inicial.',
  resultadoTitulo: 'TU RESULTADO',
  referencia1a1: 'Referencia 1:1 puro',
  grupoAnclar: 'ANCLAR MI TRAMO EN GRUPO',
  evalTitulo: empezar.titulo, evalTexto: empezar.texto, evalCta: 'RESERVAR EVALUACIÓN',
};
