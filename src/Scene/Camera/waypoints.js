import { chapters, segmentKeys } from '../../Data/Content.js';
import { ENTRADA_START_Z, ENTRADA_END_Z, EYE_Y, LOOK_AHEAD, LOOK_Y, LOCK_Z } from '../Environment/Entrada/constants.js';
import { M, moduleX, MACHINE_POSITION } from '../Environment/Machine/machineSpec.js';
import { RACK_STATIONS, rackLayout } from '../Environment/Slot/rackSpec.js';
import { ARCHIVE, slabX } from '../Environment/Archive/archiveSpec.js';
import { ROOM, PLATFORM } from '../Environment/Room/roomSpec.js';

// El mundo es un eje Z: cada capítulo vive en una "estancia" separada CHAPTER_SPACING unidades.
// 03–06 (Método → Entrenamiento → Sobre Chen → Reserva) son la excepción: forman UN solo recorrido, así que sus anclas están mucho más
// juntas (CONTINUOUS_SPACING). La 03 conserva su ancla (z = -80); 04, 05 y 06 se acercan a ella. Todos los anclajes de 03–06 siguen en z par
// (las juntas de los suelos pulidos caen sobre la retícula global de 2 m).
export const CHAPTER_SPACING = 40;
export const CONTINUOUS_SPACING = 24;
const CONTINUOUS_FROM = 2; // índice del capítulo 03 (primero del recorrido continuo)
export const anchorZ = (i) =>
  i <= CONTINUOUS_FROM
    ? -i * CHAPTER_SPACING
    : -CONTINUOUS_FROM * CHAPTER_SPACING - (i - CONTINUOUS_FROM) * CONTINUOUS_SPACING;

// --- Sistema óptico ---
// focalLength = la intención de producto ("objetivo de 50mm" / "de 85mm"), lo que se seguirá nombrando fuera.
// fov         = lo único que entiende camera.fov de Three.js (grados de campo de visión vertical), derivado de focalLength.
//
// FRAME_HEIGHT_MM es una constante de calibración: se define para que el objetivo de navegación (50mm)
// siga produciendo EXACTAMENTE el fov que ya se usaba en todo el proyecto (50°). Así esta reestructuración
// no cambia el encuadre de ninguna escena — solo introduce el mecanismo de conversión focal → fov.
// La relación queda correcta: a más focalLength, menor fov (encuadre más cerrado). 85mm > 50mm → fov menor.
const NAV_FOCAL_LENGTH = 50;
const NAV_FOV_DEG = 50; // fov ya usado hasta ahora — se conserva sin cambios
const FRAME_HEIGHT_MM = 2 * NAV_FOCAL_LENGTH * Math.tan((NAV_FOV_DEG * Math.PI) / 360);

// fov vertical (en grados) que produce una focal dada, sobre el "sensor" de referencia anterior.
const focalLengthToFov = (focalLengthMm) =>
  (2 * Math.atan(FRAME_HEIGHT_MM / (2 * focalLengthMm)) * 180) / Math.PI;

// Solo 'nav' se usa hoy (ver P() más abajo, y SceneCanvas.jsx). 'inspect' queda preparado con un fov
// ya calculado (más cerrado que nav, como corresponde a un 85mm) pero SIN asignar a ningún waypoint —
// se afinará cuando implementemos la escena que use la inspección técnica.
export const LENSES = {
  nav: { focalLength: NAV_FOCAL_LENGTH, fov: NAV_FOV_DEG },
  inspect: { focalLength: 85, fov: focalLengthToFov(85) },
};

const P = (x, y, z, lx, ly, lz, fov = LENSES.nav.fov) => ({ pos: [x, y, z], look: [lx, ly, lz], fov });

// --- Estaciones de 03–06 ---------------------------------------------------------------------------------------------------------
// En 03–06 la cámara y el DOM comparten una sola fuente: las piezas que YA existen en el mundo (módulos de la máquina de 03, partes de
// la máquina de 04, pilares del archivo de 05, aro de la puerta de 06). Cada capítulo reparte su progreso entre sus estaciones con
// una meseta (la cámara se asienta en cada pieza y planea hacia la siguiente); el paso activo cambia a mitad del planeo (stepOf).
const smooth01 = (t) => t * t * (3 - 2 * t);
const chapterZ = (id) => anchorZ(chapters.findIndex((c) => c.id === id));
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Paso activo de un capítulo con n estaciones (0..n-1) y progreso p (0..1). Es el mismo que usan la UI y las luces.
export const stepOf = (p, n) => Math.min(n - 1, Math.max(0, Math.floor(p * n)));
// Posición continua entre estaciones: { i, e } = entre i e i+1, e 0..1 (0 = asentada en i).
export function stepBlend(p, n) {
  const u = Math.min(n - 1, Math.max(0, p * n - 0.5));
  const i = Math.min(n - 2, Math.floor(u));
  const f = u - i;
  return { i, e: f <= 0.2 ? 0 : f >= 0.8 ? 1 : smooth01((f - 0.2) / 0.6) };
}
const blendViews = (views, p) => {
  const { i, e } = stepBlend(p, views.length);
  const a = views[i];
  const b = views[i + 1];
  return { pos: lerp3(a.pos, b.pos, e), look: lerp3(a.look, b.look, e), e };
};

// 03 · MÉTODO — cinco pasos = cinco módulos de la máquina de selección (machineSpec.moduleX).
const METODO_Z = chapterZ('asesoria-lab') + MACHINE_POSITION[2];
const METODO_TOP = MACHINE_POSITION[1] + M.plinthTop + M.module.total;
const METODO_N = 5;
const metodoViews = (aspect) => {
  const sh = aspect > 1.15 ? 0.95 : 0; // el módulo queda a la derecha de la pantalla: la columna de la izquierda es del titular
  return Array.from({ length: METODO_N }, (_, i) => {
    const x = moduleX(i) - sh;
    const dist = 5 - 0.25 * i; // avanza hacia la máquina a lo largo del método
    return { pos: [x, 2.5, METODO_Z + dist], look: [x, 2.8, METODO_Z] };
  });
};

// 04 · ENTRENAMIENTO — seis pasos = seis piezas de la máquina del Slot (rackSpec.RACK_STATIONS), colocada con su propio rackLayout.
const SLOT_Z = chapterZ('slot');
const rackWorld = (l, lay) => [lay.px + l[0] * lay.scale, 0.006 + l[1] * lay.scale, SLOT_Z + l[2] * lay.scale];
const slotViews = (aspect) => {
  const lay = rackLayout(aspect);
  const sh = lay.wide ? 0.9 : 0;
  return RACK_STATIONS.map((st) => {
    const look = rackWorld(st.look, lay);
    look[0] -= st.side === 'top' ? sh * 0.4 : sh;
    return { pos: [look[0], look[1] + 0.3, look[2] + st.dist * lay.scale], look };
  });
};

// 05 · SOBRE CHEN — cuatro estaciones = los pilares que el archivo ya ilumina en cada una (Blockouts#ARCHIVE_FOCUS).
export const ARCHIVE_STATION_SLABS = [[1], [3], [5, 6], [7]];
const ARCHIVE_ANCHOR_SLAB = [1, 3, 6, 7]; // pilar al que cuelga el contenido de cada estación
const ARCHIVE_Z = chapterZ('proof-chen');
const archiveViews = (aspect) => {
  const sh = aspect > 1.15 ? 2.3 : 0.9;
  return ARCHIVE_STATION_SLABS.map((slabs, k) => {
    const fx = slabs.reduce((a, i) => a + slabX(i), 0) / slabs.length + sh;
    const dist = [6.4, 6.8, 6.4, 5.8][k];
    return { pos: [fx, 1.75, ARCHIVE_Z + dist], look: [fx, 2.1, ARCHIVE_Z] };
  });
};

// 06 · RESERVA — aproximación → puerta → reserva: una sola trayectoria hacia el aro de la puerta (Door.jsx: centro y = 3).
const DOOR_Z = chapterZ('reserva');
const DOOR_Y = 3;
const doorViews = [
  { pos: [0, 1.6, DOOR_Z + 12], look: [0, DOOR_Y, DOOR_Z] },  // aproximación
  { pos: [0, 1.7, DOOR_Z + 6.5], look: [0, DOOR_Y, DOOR_Z] },  // la puerta
  { pos: [0, 1.9, DOOR_Z + 2.6], look: [0, DOOR_Y, DOOR_Z] },  // reserva: dentro del umbral
];
export const DOOR_PHASES = ['aproximacion', 'puerta', 'reserva'];
export const doorPhase = (p) => (p < 0.4 ? 0 : p < 0.75 ? 1 : 2);
const doorView = (p) => {
  const t = p < 0.4 ? [0, 1, p / 0.4] : [1, 2, Math.min(1, Math.max(0, (p - 0.4) / 0.6))];
  const k = smooth01(t[2]);
  const a = doorViews[t[0]];
  const b = doorViews[t[1]];
  return { pos: lerp3(a.pos, b.pos, k), look: a.look };
};

const MIN_EYE_Y = 0.4; // m — altura mínima de la cámara en 03–06 (por debajo, el suelo de una sola cara deja de verse)
// Cámara de un capítulo con estaciones (null si el capítulo no las tiene). `p` = progreso 0..1 (06: ya con la reserva abierta = 1).
export function stageCamera(id, p, aspect = 1.78) {
  let v;
  if (id === 'asesoria-lab') v = blendViews(metodoViews(aspect), p);
  else if (id === 'slot') v = blendViews(slotViews(aspect), p);
  else if (id === 'proof-chen') v = blendViews(archiveViews(aspect), p);
  else if (id === 'reserva') v = doorView(p);
  else return null;
  // Pantalla estrecha (móvil vertical): el contenido se acopla abajo, así que el objeto sube en el encuadre (traslación pura de la cámara).
  // La cámara no baja del MIN_EYE_Y: en la aproximación a la puerta (12 m) la traslación la dejaba bajo el suelo (y ≈ -0,8) y el suelo, de una sola
  // cara, desaparecía justo al llegar. El punto de mira conserva la elevación completa, así que el encuadre del objeto apenas cambia.
  if (id !== 'asesoria-lab' && aspect < 0.9) {
    const lift = 0.2 * Math.abs(v.pos[2] - v.look[2]);
    v.pos = [v.pos[0], Math.max(MIN_EYE_Y, v.pos[1] - lift), v.pos[2]];
    v.look = [v.look[0], v.look[1] - lift, v.look[2]];
  }
  return { pos: v.pos, look: v.look, fov: LENSES.nav.fov, e: v.e ?? 0 };
}
const stagePose = (id, p) => { const c = stageCamera(id, p); return { pos: c.pos, look: c.look, fov: c.fov }; };

// --- Umbrales 03→06: un solo travelling -------------------------------------------------------------------------------------------------
// Antes cada umbral interpolaba en línea recta entre dos estancias separadas 40 m, con un velo negro encima: la cámara atravesaba la máquina
// que acababa de dejar y reaparecía en otra sala. Ahora el viaje es continuo: sale de la última estación de un capítulo, rodea la pieza que
// deja atrás (plataforma de la 03, bastidor de la 04, hilera de volúmenes de la 05) y llega a la primera estación del siguiente mirando
// siempre hacia delante. Los dos extremos son EXACTAMENTE stageCamera (con el aspect real): ya no hay salto al entrar/salir del umbral.
const CONTINUOUS_THRESHOLDS = new Set(['asesoria-lab>slot', 'slot>proof-chen', 'proof-chen>reserva']);
// Ease de viaje: arranca y termina suave pero sin pararse (la cámara ya viene asentada de la estación; no debe "reiniciarse").
const travelEase = (p) => p + 0.6 * (smooth01(Math.min(1, Math.max(0, p))) - p);

// Punto intermedio a una fracción f del viaje entre A y B: y y cabeceo se reparten linealmente (así vale igual en móvil, donde las estaciones
// llevan la cámara más abajo); x, z y hacia dónde mira se dan a mano, siempre sobre la geometría real del mundo.
const midKey = (A, B, f, x, z, lx, lz) => {
  const y = A.pos[1] + (B.pos[1] - A.pos[1]) * f;
  const pitch = (A.look[1] - A.pos[1]) * (1 - f) + (B.look[1] - B.pos[1]) * f;
  return { pos: [x, y, z], look: [lx, y + pitch, lz] };
};

function routeKeys(key, A, B, aspect) {
  if (key === 'asesoria-lab>slot') {
    // Sale por el lado de la plataforma (4 m de ancho) y atraviesa el hueco del marco del fondo de la sala (ROOM).
    const sx = PLATFORM.size[0] / 2 + 0.9;
    const roomEndZ = chapterZ('asesoria-lab') + ROOM.position[2] - ROOM.size[2] / 2;
    return [
      midKey(A, B, 0.25, sx, METODO_Z + 0.5, sx - 2.2, METODO_Z - 6),
      midKey(A, B, 0.6, sx - 0.7, roomEndZ - 3.5, 0.8, roomEndZ - 11),
    ];
  }
  if (key === 'slot>proof-chen') {
    // Pasa por la izquierda del bastidor (rackLayout) y sigue por el pasillo hasta la primera estación del archivo.
    const lay = rackLayout(aspect);
    const leftX = lay.px - 1.6 * lay.scale - 1.4;
    const midX = (leftX + B.pos[0]) / 2;
    return [
      midKey(A, B, 0.25, leftX, SLOT_Z + 1.6, leftX + 0.4, SLOT_Z - 6),
      midKey(A, B, 0.6, midX, SLOT_Z - 10, midX, SLOT_Z - 18),
    ];
  }
  // 'proof-chen>reserva': rodea por el extremo de la hilera de volúmenes (sin cruzarla) y se alinea con la puerta.
  const edge = slabX(ARCHIVE.n - 1) + ARCHIVE.size[0] / 2;
  return [
    midKey(A, B, 0.25, edge + 2.4, ARCHIVE_Z, edge + 0.4, ARCHIVE_Z - 8),
    midKey(A, B, 0.6, edge + 0.1, ARCHIVE_Z - 6.5, 3, ARCHIVE_Z - 14),
  ];
}

// Catmull-Rom parametrizado por longitud de cuerda: velocidad estable a lo largo del viaje y sin frenar en los puntos intermedios.
function pathAt(keys, t) {
  const n = keys.length;
  const cum = [0];
  for (let i = 1; i < n; i++) {
    const a = keys[i - 1].pos;
    const b = keys[i].pos;
    cum.push(cum[i - 1] + Math.max(1e-3, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])));
  }
  const s = Math.min(1, Math.max(0, t)) * cum[n - 1];
  let i = 0;
  while (i < n - 2 && s > cum[i + 1]) i++;
  const f = (s - cum[i]) / (cum[i + 1] - cum[i]);
  const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  const at = (field) => {
    const k0 = keys[Math.max(0, i - 1)][field];
    const k1 = keys[i][field];
    const k2 = keys[i + 1][field];
    const k3 = keys[Math.min(n - 1, i + 2)][field];
    return [0, 1, 2].map((c) => cr(k0[c], k1[c], k2[c], k3[c]));
  };
  return { pos: at('pos'), look: at('look') };
}

// Cámara de un umbral del recorrido continuo (null si el umbral no lo es: HOME→02, 02→03 conservan su trayectoria).
export const isContinuousThreshold = (key) => CONTINUOUS_THRESHOLDS.has(key);
export function thresholdCamera(key, p, aspect = 1.78) {
  if (!CONTINUOUS_THRESHOLDS.has(key)) return null;
  const [a, b] = key.split('>');
  const A = stageCamera(a, 1, aspect);
  const B = stageCamera(b, 0, aspect);
  const v = pathAt([A, ...routeKeys(key, A, B, aspect), B], travelEase(p));
  return { pos: v.pos, look: v.look, fov: LENSES.nav.fov };
}

// Puntos del mundo (m) a los que se atan las placas DOM; todos son posiciones de objetos que ya existen.
//  metodo-0..4 → cabeza de cada módulo · slot-<id> → pieza del Slot · archivo-0..3 → canto delantero del pilar · puerta → centro del aro
export const STATION_IDS = [
  ...Array.from({ length: METODO_N }, (_, i) => `metodo-${i}`),
  ...RACK_STATIONS.map((s) => `slot-${s.id}`),
  ...ARCHIVE_ANCHOR_SLAB.map((_, k) => `archivo-${k}`),
  'archivo-foto', 'puerta',
];
export function stationWorld(id, aspect = 1.78) {
  if (id.startsWith('metodo-')) return [moduleX(Number(id.slice(7))), METODO_TOP + 0.12, METODO_Z];
  if (id.startsWith('slot-')) {
    const st = RACK_STATIONS.find((s) => `slot-${s.id}` === id);
    return rackWorld(st.p, rackLayout(aspect));
  }
  if (id === 'archivo-foto') return [slabX(ARCHIVE_ANCHOR_SLAB[0]) - ARCHIVE.size[0] / 2, ARCHIVE.y, ARCHIVE_Z + ARCHIVE.size[2] / 2];
  if (id.startsWith('archivo-')) return [slabX(ARCHIVE_ANCHOR_SLAB[Number(id.slice(8))]) + ARCHIVE.size[0] / 2, ARCHIVE.y, ARCHIVE_Z + ARCHIVE.size[2] / 2];
  return [0, DOOR_Y, DOOR_Z]; // puerta
}
// Lado desde el que la placa cuelga de su punto: 'left' (placa a la izquierda) · 'right' · 'top' (encima) · 'center'.
export const stationSide = (id) => {
  if (id.startsWith('metodo-')) return 'top';
  if (id.startsWith('slot-')) return RACK_STATIONS.find((s) => `slot-${s.id}` === id).side;
  if (id === 'archivo-foto') return 'left';
  if (id.startsWith('archivo-')) return 'right';
  return 'center';
};

// enter = pose al empezar el capítulo · leave = pose al terminarlo.
// Los umbrales viajan de leave(capítulo i) a enter(capítulo i+1).
const poses = {
  // 01 — corredor: la cámara mira siempre hacia -Z (casi horizontal, ojo a 1,6 m) y solo avanza en Z.
  //      Objetivo 'nav' (50 mm) por defecto en P(): no se fija ningún fov a mano.
  'entrada':          { enter: P(0, EYE_Y, ENTRADA_START_Z, 0, LOOK_Y, ENTRADA_START_Z - LOOK_AHEAD),
                        leave: P(0, EYE_Y, ENTRADA_END_Z,   0, LOOK_Y, ENTRADA_END_Z - LOOK_AHEAD) },
  // 02 — Character Select: enter === leave a propósito. Mientras no hay disciplina enfocada, la cámara
  // NO se desplaza con el scroll dentro del capítulo (ver Camera/index.jsx: usa una vista general fija,
  // recalculada según el aspect ratio real, y solo se mueve cuando el usuario enfoca una vitrina).
  // Estos valores solo se usan como destino/origen de los DOS umbrales que rodean el capítulo.
  'character-select': { enter: P(0, 1.7, -26, 0, 2.5, -40), leave: P(0, 1.7, -26, 0, 2.5, -40) },
  // 03–06: enter/leave = la cámara de la primera y la última estación (stageCamera), así los umbrales enlazan sin salto.
  'asesoria-lab':     { enter: stagePose('asesoria-lab', 0), leave: stagePose('asesoria-lab', 1) },
  'slot':             { enter: stagePose('slot', 0),         leave: stagePose('slot', 1) },
  'proof-chen':       { enter: stagePose('proof-chen', 0),   leave: stagePose('proof-chen', 1) },
  'reserva':          { enter: stagePose('reserva', 0),      leave: stagePose('reserva', 1) },
};

// Para cada tramo de scroll: [poseInicial, poseFinal]
export const segmentPoses = Object.fromEntries(
  segmentKeys.map((key) => {
    if (key.includes('>')) {
      const [a, b] = key.split('>');
      return [key, [poses[a].leave, poses[b].enter]];
    }
    return [key, [poses[key].enter, poses[key].leave]];
  })
);

export const chapterOrder = chapters.map((c) => c.id);


// --- Carácter del movimiento por tramo ---
// ease : progreso de scroll (0..1) → progreso a lo largo del recorrido (0..1). Siempre función pura y monótona:
//        determinista y reversible. Por defecto (sin entrada aquí) la cámara usa smoothstep, como antes.
// feel : k = rigidez del seguimiento exponencial (menor = más pesada, NO es un resorte: no hay rebote);
//        parallax = fracción del micro-desplazamiento de puntero permitido (0 = cámara rígida).
export const DEFAULT_FEEL = { k: 5, parallax: 1 };

// Punto magnético: reparte el scroll con MÁS densidad alrededor de `lock`, de modo que la cámara se asienta allí
// (avanza ~3× más despacio) sin detenerse jamás: siempre se puede seguir el recorrido, en ambos sentidos.
// Se integra una vez al cargar (tabla) y se invierte por bisección → cero coste por frame.
export function makeMagnetEase({ from, to, lock, width, strength, samples = 512 }) {
  const span = to - from;
  const sl = (lock - from) / span;
  const sigma = Math.abs(width / span);
  const dens = (s) => 1 + strength * Math.exp(-0.5 * ((s - sl) / sigma) ** 2);
  const cum = new Float64Array(samples + 1);
  for (let i = 1; i <= samples; i++) cum[i] = cum[i - 1] + (0.5 * (dens((i - 1) / samples) + dens(i / samples))) / samples;
  const total = cum[samples];
  for (let i = 0; i <= samples; i++) cum[i] /= total;
  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let lo = 0;
    let hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < p) lo = mid; else hi = mid;
    }
    return (lo + (p - cum[lo]) / (cum[hi] - cum[lo])) / samples;
  };
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

export const segmentEase = {
  entrada: makeMagnetEase({ from: ENTRADA_START_Z, to: ENTRADA_END_Z, lock: LOCK_Z, width: 1.2, strength: 3 }),
  // El umbral hacia 02 arranca con la misma velocidad con la que termina 01 (continuidad) y se asienta al llegar.
  'entrada>character-select': easeOutCubic,
};

export const segmentFeel = {
  // HOME (V22): entrada arquitectónica — seguimiento pesado (k bajo) y cámara rígida (sin balanceo de puntero).
  entrada: { k: 1.6, parallax: 0 },
  'entrada>character-select': { k: 4, parallax: 0.25 },
  // 03→06: travelling continuo — seguimiento algo más pesado y casi sin balanceo de puntero (la trayectoria ya es suave).
  'asesoria-lab>slot': { k: 4, parallax: 0.25 },
  'slot>proof-chen': { k: 4, parallax: 0.25 },
  'proof-chen>reserva': { k: 4, parallax: 0.25 },
};
