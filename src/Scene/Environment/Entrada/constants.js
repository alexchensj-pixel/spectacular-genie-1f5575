// Escena 01 — Entrada. Constantes espaciales ÚNICAS (fuente de verdad del corredor).
// Las usan a la vez la geometría (Environment/Entrada), la luz (Lighting) y la cámara (Camera/waypoints.js),
// para que el mundo, el recorrido y el punto magnético no puedan desincronizarse.
// Unidades: metros. Eje -Z = profundidad del corredor (la cámara mira hacia -Z).
import { cellX } from '../cells.js';
import { disciplines } from '../../../Data/Disciplines.js';

export const CORRIDOR = { width: 12, height: 6, zNear: 6, zFar: -50 };

export const EYE_Y = 1.6;             // altura de cámara (ojo)
export const ENTRADA_START_Z = 0;     // pose inicial
export const ENTRADA_END_Z = -20;     // al llegar aquí la cámara entra en la zona de la Escena 02
export const LOOK_AHEAD = 14;         // la mirada va siempre 14 m por delante, casi horizontal (+0.4 m)
export const LOOK_Y = 2.0;

export const PORTAL_Z = [-2, -10];    // Portal 01 · Portal 02

export const LOCK_Z = -6.5;           // punto magnético (la cámara se "asienta" aquí, sin detenerse)
export const FOG_START_Z = -15;       // la niebla volumétrica arranca aquí y crece hacia -50

// Softbox superior 4 m × 1 m · Y 5.5 · Z -8 · 4200 K (≈ #ffd3af, aproximación de Tanner Helland).
export const SOFTBOX = { pos: [0, 5.5, -8], size: [4, 1], kelvin: 4200, color: '#ffd3af' };

// Huecos espaciales de los atletas de la Escena 02. La X se DERIVA del mismo índice que usa Pillars/
// blockouts.jsx para colocar cada vitrina real (disciplines.map((d,i) => cellX(i))) — no es un valor
// duplicado a mano: así el hueco de cada disciplina SIEMPRE cae en las coordenadas reales de SU vitrina,
// sin depender de mantener dos arrays en el mismo orden por convención. Solo la Z de entrada (dónde
// "nace" cada hueco a lo largo del corredor) es una constante propia de la Entrada, sin equivalente en
// Character Select.
const ENTRY_Z_BY_ID = { boxeo: -22, k1: -27, 'muay-thai': -32 };
export const ATHLETE_SLOTS = disciplines.map((d, i) => ({
  id: d.id,
  z: ENTRY_Z_BY_ID[d.id] ?? -22 - i * 5, // fallback determinista si se añade una disciplina sin entrada propia asignada
  x: cellX(i),
}));

// Intensidades de luz (unidades físicas de three r16x). Punto único de ajuste fino.
export const LIGHT = {
  spot: 110,          // softbox → sombras controladas (candelas)
  area: 9,            // softbox → lectura de materiales (RectAreaLight)
  fill: 30,           // relleno frontal frío
  rim: 26,            // contraluz lateral rasante del corredor (EntradaWorld)
  follow: 0.3,        // multiplicador de la luz que sigue a la cámara mientras dura la Escena 01
  ambient: 0.35,
};
