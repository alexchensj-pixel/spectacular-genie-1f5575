import { segmentKeys } from '../../Data/Content.js';

export const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Táctil/coarse (mobile, tablet sin puntero fino). Se usa para simplificar el movimiento orbital
// (parallax de puntero) y priorizar el desplazamiento longitudinal, sin crear una experiencia distinta.
export const isCoarsePointer =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

// Estado CONTINUO del scroll. Mutable a propósito: se lee en useFrame / gsap.ticker sin provocar renders de React.
//  segments[key] = progreso 0..1 de cada tramo (capítulo o umbral "a>b")
//  current       = tramo activo {key, index, progress}
//  global        = progreso total 0..1
export const scrollState = {
  segments: Object.fromEntries(segmentKeys.map((k) => [k, 0])),
  current: { key: segmentKeys[0], index: 0, progress: 0 },
  global: 0,
  // Posición REAL de la cámara (la escribe CameraRig cada frame; la leen HUD/UI sin provocar renders).
  camera: { x: 0, y: 1.6, z: 0 },
  // Proyección a pantalla (px) de los puntos de los objetos 3D que ya existen en 03–06 (waypoints.js#STATIONS): la escribe CameraRig
  // justo después de mover la cámara; la lee el DOM de cada capítulo (Experience/useStation.js) sin renders. { x, y, d, vis }
  station: {},
  // Salto directo entre secciones (navigation.js#jumpTo): `jump` = opacidad 0..1 del velo mientras se cambia de sitio;
  // `snapUntil` = hasta cuándo (performance.now) la cámara se coloca de golpe en lugar de viajar por el mundo.
  jump: 0,
  snapUntil: 0,
};

export function setSegment(key, progress) {
  scrollState.segments[key] = progress;
  let index = 0;
  for (let i = 0; i < segmentKeys.length; i++) if (scrollState.segments[segmentKeys[i]] > 0) index = i;
  const k = segmentKeys[index];
  const p = scrollState.segments[k];
  scrollState.current = { key: k, index, progress: p };
  scrollState.global = (index + p) / segmentKeys.length;
}

const smoothstep = (x, a, b) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// BRIDGE — escena narrativa dentro del umbral 'entrada>character-select' (CUERPO → COMBATE → MAPA → STRIKING → DISCIPLINAS).
// El umbral (180vh, ver global.css) aloja el Bridge (Experience/Entrada/Bridge.jsx + Environment/Bridge/BridgeHall.jsx) y se reparte así:
//   0 … BRIDGE_END                  → corre el copy (cuerpo, Tyson → McGregor, combate, mapa) y los tres luchadores siguen ocultos.
//   BRIDGE_END … BRIDGE_OUT_END     → el Bridge se funde y sale.
//   BRIDGE_OUT_END (= REVEAL_START) … 1 → los luchadores y su vitrina se revelan: ya estamos en EXPLORE.
// EXPLORE no absorbe el Bridge: solo empieza donde el Bridge termina.
export const BRIDGE_END = 0.7;
export const BRIDGE_OUT_DURATION = 0.12;
export const BRIDGE_OUT_END = BRIDGE_END + BRIDGE_OUT_DURATION;

// Inicio del reveal de los luchadores dentro del umbral HOME → EXPLORE (0..1 del progreso del umbral): justo cuando el Bridge
// ha salido del todo (BRIDGE_OUT_END). Llega a 1 al final del umbral (REVEAL_FULL), donde empieza el capítulo EXPLORE.
export const REVEAL_START = BRIDGE_OUT_END;
export const REVEAL_FULL = 1;

// Visibilidad de los 3 luchadores (EXPLORE) y su vitrina: 0 = invisibles, 1 = visibles del todo.
// Regla: mientras la Entrada (01) no haya terminado su propio recorrido (progreso < 1, que es justo cuando su HUD ya se ha
// difuminado del todo), reveal = 0 sin excepción; y tampoco hay reveal mientras dura el Bridge (umbral < REVEAL_START).
// Después se revela con un smoothstep sobre el progreso del umbral
// HOME → EXPLORE (determinista y reversible: al subir el scroll se ocultan otra vez exactamente por el mismo camino).
// Tras un salto directo a EXPLORE (navegación por sección) el umbral queda en 1: reveal = 1.
export function getCharactersReveal() {
  const introProgress = scrollState.segments['entrada'] ?? 0;
  if (introProgress < 1) return 0;
  const thresholdProgress = scrollState.segments['entrada>character-select'] ?? 0;
  return smoothstep(thresholdProgress, REVEAL_START, REVEAL_FULL);
}

// ¿Está la persona en EXPLORE? True dentro del capítulo y también justo en su inicio: un salto directo a la sección
// (navigation.js#jumpTo) deja el scroll EXACTAMENTE en el borde superior del capítulo, donde el progreso del capítulo aún
// es 0 y el tramo activo sigue siendo el umbral HOME → EXPLORE (al 100 %). Ambos casos son EXPLORE.
export function isExploreActive() {
  const { key, progress } = scrollState.current;
  return key === 'character-select' || (key === 'entrada>character-select' && progress >= 0.999);
}

// Progreso CRUDO (0..1, sin curva) del mismo umbral que gobierna getCharactersReveal(): lo necesita
// AthleteSlots.jsx para interpolar posición/tamaño (no solo opacidad) mientras la escuadra se convierte
// en la vitrina — determinista y reversible, viene directo del scroll real (Threshold.jsx → setSegment).
export function getEntranceToSelectProgress() {
  return scrollState.segments['entrada>character-select'] ?? 0;
}

// Opacidad del fondo fotográfico de la Entrada (heroLab / PhotoBackdrop). Pertenece SOLO a la Escena 01:
// se apaga en el MISMO tramo (0.85 → 1 del progreso propio de 'entrada') en que termina de salir su
// última narrativa (ver el build() de Entrada.jsx), así todo lo que es "Entrada" desaparece a la vez,
// como una sola cosa — y llega a 0 exacto, no a un mínimo residual.
// Reversible: si se sube el scroll de vuelta a la Entrada, reaparece por el mismo camino.
export function getIntroBackdropOpacity() {
  const introProgress = scrollState.segments['entrada'] ?? 0;
  // Pico bajado de 0.9 a 0.6 — corrección de legibilidad del título 3D: en `screen` (ver PhotoBackdrop.jsx)
  // la foto aplana más las sombras que las luces, y es justo esa sombra entre trazos la que hace leíbles
  // las letras. A 0.6 la foto sigue integrada (misma mezcla, mismo recorrido) pero deja de camuflarlas.
  return 0.6 * (1 - smoothstep(introProgress, 0.85, 1));
}
