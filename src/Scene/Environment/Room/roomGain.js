import { scrollState } from '../../Transitions/scrollState.js';

const smooth = (x, a, b) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// 0 = la arquitectura de la Escena 03 no existe todavía / ya no existe; 1 = presente.
// Se enciende desde el 15 % del umbral 02→03 (cuando el HUD ya marca 03) y llega a 1 al 70 %. Se apaga DESPUÉS de que la cámara haya cruzado
// el hueco del fondo (03→04: 40 % → 80 %): antes se apagaba al empezar el umbral, con la cámara aún dentro de la sala. Mismo progreso de
// scroll real que gobierna la cámara (determinista y reversible). No depende de la posición en Z ni añade estado.
export function getRoomGain() {
  const enter = scrollState.segments['character-select>asesoria-lab'] ?? 0;
  const leave = scrollState.segments['asesoria-lab>slot'] ?? 0;
  return smooth(enter, 0.15, 0.7) * (1 - smooth(leave, 0.4, 0.8));
}
