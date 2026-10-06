import { scrollState } from '../../Transitions/scrollState.js';

const smooth = (x, a, b) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const seg = (k) => scrollState.segments[k] ?? 0;

// 0..1 del suelo terminado de un capítulo sin sala propia (04 · Entrenamiento, 06 · Reserva). Misma curva que getArchiveGain:
// aparece pronto en el umbral de entrada (10 % → 60 %) y se retira tarde en el de salida (40 % → 90 %), de modo que el suelo del capítulo
// que se deja y el del que llega se solapan y la cámara nunca cruza un vacío. Progreso de scroll real: determinista y reversible.
// `next` = null en el último capítulo (no hay umbral de salida).
export function getFloorGain(prev, id, next) {
  const enter = smooth(seg(`${prev}>${id}`), 0.1, 0.6);
  return next ? enter * (1 - smooth(seg(`${id}>${next}`), 0.4, 0.9)) : enter;
}
