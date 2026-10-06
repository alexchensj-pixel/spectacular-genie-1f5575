import { scrollState } from '../../Transitions/scrollState.js';

const smooth = (x, a, b) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const seg = (k) => scrollState.segments[k] ?? 0;

// 0..1 de la máquina de la Escena 04: se asoma al fondo cuando el marco de la sala 03 se abre (03→04: 5 % → 50 %, adelantado respecto a antes:
// con la sala aún encendida, que se apaga en 40 % → 80 %, ver roomGain.js) y sigue ahí hasta que la cámara la ha rodeado (04→05: 45 % → 85 %).
// Mismo progreso de scroll real que gobierna la cámara: determinista y reversible.
export function getSlotGain() {
  return smooth(seg('asesoria-lab>slot'), 0.05, 0.5) * (1 - smooth(seg('slot>proof-chen'), 0.45, 0.85));
}

// 0..1 de la nave que rodea a la máquina de 04 (Slot/SlotHall.jsx: techo con lineales, marco del fondo y cornisas). Entra un poco ANTES que el
// rack (03→04: 0 % → 40 %) para que, al apagarse la sala 03, la 04 ya tenga techo y marco: 03 → 04 es la misma nave, sin tramo de hangar.
export function getHallGain() {
  return smooth(seg('asesoria-lab>slot'), 0, 0.4) * (1 - smooth(seg('slot>proof-chen'), 0.45, 0.85));
}

// 0..1 del archivo de la Escena 05 (sus 9 volúmenes): se ve a lo lejos desde el principio del umbral 04→05 (10 % → 60 %) y se mantiene hasta
// que la cámara ha pasado el extremo de la hilera (05→06: 45 % → 85 %).
export function getArchiveGain() {
  return smooth(seg('slot>proof-chen'), 0.1, 0.6) * (1 - smooth(seg('proof-chen>reserva'), 0.45, 0.85));
}
