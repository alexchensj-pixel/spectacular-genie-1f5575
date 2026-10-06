// Las tres vitrinas de la Escena 02 (Character Select). Fuente de verdad única: la usan el volumen (blockouts.jsx),
// el luchador (Fighter.jsx) y la cámara (Camera/index.jsx, que se desplaza hacia la vitrina enfocada).
export const CELL = {
  spacing: 4,              // separación entre vitrinas (m). Con 4 m caben las tres en pantallas anchas
  size: [2.4, 4.4, 2.4],   // ancho × alto × fondo de la vitrina de líneas
  feetY: 0.08,             // altura de los pies sobre el suelo
  fighterHeight: 3.3,      // del pelo a los pies (m): escala "estatua", legible desde 7–12 m
};
export const cellX = (i) => (i - 1) * CELL.spacing;

// --- Layout responsive de la Escena 02 (SOLO móvil vertical) ---------------------------------------------------
// Tres luchadores en fila son un conjunto ~3:1 apaisado: en una pantalla vertical (aspect ≈ 0.46) el ancho manda y,
// con la separación de escritorio (CELL.spacing = 4 m), la cámara debe alejarse tanto que los luchadores quedan en
// ~11 % del alto. Solución de COMPOSICIÓN (no de cámara dinámica): en vertical se estrecha la separación entre los
// tres (y con ella el suelo/aro y el volumen común, que escalan igual) — los luchadores conservan su tamaño real.
//  · portraitAmount(aspect): 0 en escritorio / apaisado (aspect ≥ FULL_ASPECT) → 1 en móvil vertical
//    (aspect ≤ MIN_ASPECT). Continuo (smoothstep) para que redimensionar / rotar no dé saltos.
//  · layoutK(aspect): factor horizontal del layout. Exactamente 1 con portraitAmount = 0, así que en escritorio
//    cellX(i) * layoutK() === cellX(i) (sin cambios).
export const PORTRAIT_LAYOUT = {
  fullAspect: 0.95, // por encima: layout de escritorio, intacto
  minAspect: 0.6,   // por debajo: layout de móvil vertical completo
  k: 0.62,          // separación / aro / volumen a este factor del de escritorio en móvil vertical (4 m → ~2,5 m)
};
export function portraitAmount(aspect) {
  const t = Math.min(Math.max((PORTRAIT_LAYOUT.fullAspect - aspect) / (PORTRAIT_LAYOUT.fullAspect - PORTRAIT_LAYOUT.minAspect), 0), 1);
  return t * t * (3 - 2 * t);
}
export const layoutK = (aspect) => 1 - (1 - PORTRAIT_LAYOUT.k) * portraitAmount(aspect);

// --- Región de pantalla del 3D en EXPLORE (V22 · paso 3) -------------------------------------------------------------
// EXPLORE es una pantalla de decisión: el panel HTML (formas de entrenar, disciplinas, información) y el 3D se reparten
// la pantalla en lugar de pisarse. Un único canvas fijo detrás de todo; esta región dice dónde debe verse la escena:
//  · apaisado / escritorio (aspect ≥ 1,1): panel a la izquierda (40 %), 3D a la derecha (60 % del ancho, alto completo).
//  · vertical (móvil / tablet vertical):   3D arriba (32 % del alto), panel abajo (68 %).
// La cámara (Camera/index.jsx) encuadra la escena para esa región y desplaza la proyección (setViewOffset) hasta ella;
// `exploreLayoutAspect` es el aspect que el LAYOUT (separación de los tres, luz…) debe usar para ser coherente con la cámara.
// Las proporciones se corresponden con global.css (.ex__panel).
export const EXPLORE_SPLIT_MIN_ASPECT = 1.1;
export const EXPLORE_SPLIT_FX = 0.6;   // fracción del ancho que ocupa el 3D en apaisado
export const EXPLORE_STACK_FY = 0.32;  // fracción del alto que ocupa el 3D en vertical
export function exploreRegion(width, height) {
  const aspect = width / Math.max(height, 1);
  if (aspect >= EXPLORE_SPLIT_MIN_ASPECT) return { split: true, fx: EXPLORE_SPLIT_FX, fy: 1, cx: 1 - EXPLORE_SPLIT_FX / 2, cy: 0.5 };
  return { split: false, fx: 1, fy: EXPLORE_STACK_FY, cx: 0.5, cy: EXPLORE_STACK_FY / 2 };
}
// Aspect de layout: en apaisado el 3D solo dispone del 60 % del ancho; en vertical conserva el aspect real de la pantalla
// (el ancho manda, igual que antes: los tres se acercan entre sí — layoutK — para ganar tamaño).
export function exploreLayoutAspect(width, height) {
  const r = exploreRegion(width, height);
  return r.split ? (width * r.fx) / Math.max(height, 1) : width / Math.max(height, 1);
}
