// ESCENA 04 — cotas de la máquina del Slot (HybridRack.jsx) que otras capas necesitan leer: cámara (Camera/waypoints.js) y placas DOM
// (Experience/Slot). Son EXACTAMENTE las que ya usa HybridRack; funciones puras, sin three. Un solo sitio para no desincronizarlas.
// N = 4 es la CAPACIDAD FÍSICA de la bandeja (huecos de la máquina), no el tamaño del plan: con 2 o 3 sesiones se llenan 2 o 3 huecos y el resto queda vacío.
export const RACK = { N: 4, R: 0.62, LEN: 0.92, DRUM_Y: 1.42, WIN_H: 0.74 };

// Colocación en la escena según el aspect (antes dentro de HybridRack): apaisado → escala 1,25 y desplazada a la derecha para dejar la
// columna de lectura libre; vertical → centrada y algo más pequeña.
export function rackLayout(aspect) {
  const wide = aspect > 1.15;
  return { wide, scale: wide ? 1.25 : Math.max(0.78, Math.min(1.1, 0.7 + aspect * 0.5)), px: wide ? 0.9 : 0 };
}

// Las CUATRO estaciones del Slot (V28: la máquina deja de ser peaje), cada una sobre una pieza real de la máquina (coordenadas locales, m):
//  p    = punto de la pieza al que se ata la placa de lectura · side = lado de la pieza desde el que «cuelga» (left | top)
//  look = hacia dónde mira la cámara en esa estación · dist = distancia de cámara (m, antes de escala)
// FORMATO    → ventana del tambor · ELECCIÓN DIRECTA (1:1 · Parejas · Grupo reducido) + puerta a «Configurar frecuencia»
// FRECUENCIA → aguja de lectura   · frecuencia deseada (1 · 2 · 3 días)
// OPCIÓN     → bandeja de salida  · COMBINACIÓN 1:1 + grupo (los huecos se llenan aquí; id histórico, no se renombra)
// ACCIÓN     → palanca            · resultado + acción
// Los antiguos pasos MODALIDAD (pilotos) y PLAN (cubierta) ya no son estaciones: los pilotos siguen respondiendo (reflectDrum) y los planes
// mensuales quedan como referencia secundaria en el resultado. Las coordenadas de las piezas que se conservan no cambian.
const { LEN, R, DRUM_Y, WIN_H } = RACK;
export const RACK_STATIONS = [
  { id: 'formato',    p: [-(LEN / 2 + 0.06), DRUM_Y, R + 0.1],            side: 'left', look: [0, 1.35, 0.7],  dist: 3.5 },
  { id: 'frecuencia', p: [-(LEN / 2 + 0.01), DRUM_Y, R + 0.12],           side: 'left', look: [-0.1, 1.45, 0.7], dist: 2.8 },
  { id: 'opcion',     p: [-0.95, 0.49, 0.51],                             side: 'left', look: [0, 0.7, 0.55],  dist: 3.0 },
  { id: 'accion',     p: [LEN / 2 + 0.38, 2.45, 0.1],                     side: 'top',  look: [0.3, 1.3, 0.4], dist: 4.6 },
];
