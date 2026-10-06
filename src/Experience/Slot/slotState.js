// Estado mutable de la Scene 04 (sin renders de React). Lo escribe Slot.jsx y lo lee la máquina 3D
// (Scene/Environment/Slot/HybridRack.jsx) en su bucle de render.
//   bays[i]  = id de la modalidad asignada al hueco i (bandeja de salida), o null. 4 = capacidad física; la combinación llena N = frecuencia elegida.
//   show     = Slot.jsx lo pone a true durante el capítulo `slot`: la máquina es la escena de Entrenamiento (instrumento de frecuencia/combinación).
//   drum     = tambor de la máquina: ver más abajo.
export const slotState = {
  bays: [null, null, null, null],
  show: false,
  freq: null, // aguja de lectura: 1 | 2 | 3 (sesiones/semana elegidas) o null (sin elegir / variable → aguja en reposo)
  drum: null, // se crea abajo
  onStop: null, // (id) => void — opcional; se llama cuando el tambor se asienta (no lo usa ningún componente hoy)
};

// ---------------------------------------------------------------------------------------------------------------------
// TAMBOR — 6 caras de 60° (1:1 · PAREJAS · GRUPO REDUCIDO, dos veces) en un cilindro de eje horizontal, con un trinquete que
// deja seis posiciones estables: la cara visible en la ventana es siempre una de ellas. Dos modos:
//
//   · REFLEJO (VIVO) — reflectDrum(id). Lo llama la UI del plan híbrido (+ / −) al tocar una modalidad: el tambor gira hasta la
//     cara de esa modalidad con un muelle amortiguado (sin azar, ~1 s), cada borde de cara que cruza es un clic, la palanca
//     baja y vuelve, y al asentarse se enciende el piloto de esa modalidad. Es la respuesta física a la decisión de la persona:
//     la máquina refleja la combinación, no la decide.
//   · LANZAMIENTO ALEATORIO (RETIRADO) — launchDrum() / onStop. Era la ruleta (GIRAR): par aleatorio → inercia → trinquete →
//     rebote → parada. La arquitectura final quitó la ruleta («nada que esperar»), así que NINGÚN componente invoca launchDrum.
//     Se conserva intacto, aislado en este bloque, porque comparte el integrador y el trinquete con el modo reflejo.
// ---------------------------------------------------------------------------------------------------------------------
export const FACE = Math.PI / 3;
export const FACES = ['1-1', 'duo', 'grupo', '1-1', 'duo', 'grupo'];
const DETENT = 12;     // rigidez del trinquete (menor que el par de lanzamiento: no frena el arranque)
const DRAG_BASE = 0.9; // rozamiento a alta velocidad
const DRAG_LOW = 6;    // rozamiento extra a baja velocidad
const LAUNCH_T = 0.4;  // s con la palanca empujando
const LAUNCH_TORQUE = [30, 75];
const MAX_SPIN = 9;    // s: seguro, si algo se atasca se asienta
// Modo reflejo (vivo)
const SEEK_K = 55;         // rigidez del muelle hacia la cara objetivo
const SEEK_C = 2 * Math.sqrt(SEEK_K); // amortiguación crítica: llega sin rebotar
const SEEK_MAX_OMEGA = 7;  // rad/s: tope, el cambio de cara nunca es un latigazo
const KICK_T = 0.32;       // s con la palanca abajo al reflejar

// Cara que queda en la ventana para un ángulo α (las caras están centradas en (k+½)·60°).
export const faceAt = (alpha) => ((Math.round(alpha / FACE - 0.5) % 6) + 6) % 6;

export function newDrum() {
  return {
    alpha: 0.5 * FACE, omega: 0, spinning: false, t: 0, torque: 0,
    face: 0,         // cara actual (0..5)
    result: null,    // id de modalidad de la última parada
    ticks: 0,        // nº de clics (cruces de trinquete) acumulados
    target: null,    // ángulo objetivo del modo reflejo (null = sin objetivo)
    kick: 0,         // s restantes con la palanca abajo (modo reflejo)
    click: 0,        // 0..1: destello mecánico/luminoso del último clic (decae solo)
    lever: 0,        // 0..1: posición de la palanca (1 = abajo)
    settle: 0,       // 0..1: destello de parada
  };
}
slotState.drum = newDrum();

// MODO REFLEJO (vivo): lleva el tambor a la cara de la modalidad `id`, siempre hacia delante (sentido de giro único, como un
// tambor real). Si ya está en esa cara solo hay respuesta mecánica (palanca + clic + piloto).
export function reflectDrum(id) {
  const d = slotState.drum;
  if (!FACES.includes(id) || d.spinning) return false;
  d.kick = KICK_T; d.click = Math.max(d.click, 0.8);
  const cur = Math.round(d.alpha / FACE - 0.5); // índice entero de la cara actual (sin módulo)
  let idx = cur;
  if (FACES[((cur % 6) + 6) % 6] !== id) {
    for (let k = 1; k < 6; k++) { if (FACES[(((cur + k) % 6) + 6) % 6] === id) { idx = cur + k; break; } }
    d.target = (idx + 0.5) * FACE;
    d.result = null;
  } else { d.target = null; d.result = id; d.settle = 1; }
  return true;
}

// REFLEJO MÍNIMO: una decisión que no tiene pieza propia (objetivo, borrar selección) igualmente se oye en la máquina:
// clic del LED + pequeño tirón de la aguja. No mueve el tambor ni inventa estado.
export function pingMachine() {
  const d = slotState.drum;
  d.click = Math.max(d.click, 0.8);
  d.settle = Math.max(d.settle, 0.6);
}

// SALIDA: la palanca baja y, cuando ya ha bajado, se ejecuta `go` (la navegación a Reserva). Sin movimiento (prefers-reduced-motion)
// va directa. Es la respuesta física del RESULTADO: reservar = tirar de la palanca.
export function pullLever(go) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const d = slotState.drum;
  d.kick = KICK_T; d.click = Math.max(d.click, 0.9); d.settle = 1;
  if (reduced) { go(); return; }
  window.setTimeout(go, 380);
}

// [RETIRADO] Lanza el tambor con par aleatorio si está parado (ruleta). Devuelve true si arrancó. No lo invoca ningún componente.
export function launchDrum(rand = Math.random) {
  const d = slotState.drum;
  if (d.spinning) return false;
  d.spinning = true; d.t = 0; d.result = null;
  d.torque = LAUNCH_TORQUE[0] + rand() * (LAUNCH_TORQUE[1] - LAUNCH_TORQUE[0]);
  return true;
}

// Un paso de física (dt en s). Integración semi-implícita con sub-pasos.
export function stepDrum(dtIn) {
  const d = slotState.drum;
  const dt = Math.min(dtIn, 0.05);
  d.click *= Math.exp(-dt * 7);
  d.settle *= Math.exp(-dt * 2.5);
  // La palanca baja al lanzar / reflejar y vuelve despacio (muelle).
  d.kick = Math.max(0, d.kick - dt);
  const leverTarget = (d.spinning && d.t < LAUNCH_T) || d.kick > 0 ? 1 : 0;
  d.lever += (leverTarget - d.lever) * Math.min(1, dt * (leverTarget ? 18 : 4));

  // Modo reflejo: muelle amortiguado hacia la cara objetivo; cada borde de cara que cruza es un clic.
  if (d.target != null && !d.spinning) {
    const n = 4, h = dt / n;
    for (let i = 0; i < n; i++) {
      const before = Math.floor(d.alpha / FACE + 1e-9); // bordes entre caras = múltiplos de 60° (las caras se centran en (k+½)·60°)
      d.omega += (SEEK_K * (d.target - d.alpha) - SEEK_C * d.omega) * h;
      d.omega = Math.max(-SEEK_MAX_OMEGA, Math.min(SEEK_MAX_OMEGA, d.omega));
      d.alpha += d.omega * h;
      const after = Math.floor(d.alpha / FACE + 1e-9);
      if (after !== before) { d.ticks += 1; d.click = Math.min(1, 0.55 + Math.min(Math.abs(d.omega), 12) / 26); }
    }
    d.face = faceAt(d.alpha);
    if (Math.abs(d.target - d.alpha) < 0.003 && Math.abs(d.omega) < 0.04) {
      d.alpha = d.target; d.omega = 0; d.target = null; d.face = faceAt(d.alpha);
      d.result = FACES[d.face]; d.settle = 1;
      if (slotState.onStop) slotState.onStop(d.result);
    }
    return;
  }
  if (!d.spinning) return;

  const n = 4, h = dt / n;
  for (let i = 0; i < n; i++) {
    const psi = 6 * d.alpha - Math.PI;
    const drag = DRAG_BASE + DRAG_LOW / (1 + (d.omega * d.omega) / 4);
    const push = d.t < LAUNCH_T ? d.torque : 0;
    const acc = push - drag * d.omega - DETENT * Math.sin(psi);
    const before = Math.floor((d.alpha - 0.5 * FACE) / FACE + 1e-9);
    d.omega += acc * h;
    d.alpha += d.omega * h;
    d.t += h;
    // Clic: el tambor cruza el borde entre dos caras (el máximo del trinquete).
    const after = Math.floor((d.alpha - 0.5 * FACE) / FACE + 1e-9);
    if (after !== before) { d.ticks += 1; d.click = Math.min(1, 0.55 + Math.min(Math.abs(d.omega), 12) / 26); }
  }
  d.face = faceAt(d.alpha);

  const psi = 6 * d.alpha - Math.PI;
  const calm = d.t > LAUNCH_T && Math.abs(d.omega) < 0.03 && Math.abs(Math.sin(psi)) < 0.03;
  if (calm || d.t > MAX_SPIN) {
    d.alpha = (Math.round(d.alpha / FACE - 0.5) + 0.5) * FACE; // asienta en la cara más cercana
    d.omega = 0; d.spinning = false; d.face = faceAt(d.alpha);
    d.result = FACES[d.face]; d.settle = 1;
    if (slotState.onStop) slotState.onStop(d.result);
  }
}
