// ESCENA 03 — Máquina de selección. Fuente de verdad ÚNICA de sus cotas (funciones puras, sin three).
// Unidades: metros. Origen local = centro de la base, y = 0 en el plano de apoyo (cubierta de la plataforma),
// +z hacia la cámara (la cámara de la Escena 03 mira hacia -Z). Todo sale de la ficha de diseño aprobada:
// 3200 mm de ancho · 600 mm de fondo · cinco módulos alineados · bastidor negro con laterales angulares.
// NOTA DE ALTURA: la ficha rotula 1200 mm, pero la silueta dibujada (vista frontal 402 × 209 px para 3200 mm) da
// ≈ 1,6 m. Se ha seguido la SILUETA (proporciones aprobadas). Una sola cota para cambiarlo: la suma
// plinthTop + module.total (abajo). Si se prefiere 1,2 m literales, hay que escalar module.* en conjunto.
import { PLATFORM } from '../Room/roomSpec.js';

export const M = {
  W: 3.2,
  D: 0.6,
  foot: 0.02,        // altura de los pies: el bastidor no toca la plataforma
  plinthTop: 0.36,   // cota superior del bastidor
  pitch: 0.56,       // separación entre ejes de módulos
  // Frente del bastidor: vertical hasta y0 y luego inclinado hacia atrás (`lean` m) hasta plinthTop
  slope: { y0: 0.13, lean: 0.09 },
  // Alturas de un módulo, relativas a plinthTop
  module: { collar: 0.2, glass: 0.61, head: 0.32, caps: 0.115, total: 1.245 },
  head: { w: 0.4, d: 0.4, chamfer: 0.05 },
  glassR: 0.175,
  rollerR: 0.12,
  rollerH: 0.3,
};

// z del frente de la cabeza de cada módulo (la ventana de icono se apoya ahí)
export const HEAD_FRONT = M.head.d / 2;
export const moduleX = (i) => (i - 2) * M.pitch;
// y (local a la máquina) del centro de la ventana de visualización de cada módulo
export const ROLLER_Y = M.plinthTop + M.module.collar + M.module.glass / 2;
// Ángulo del frente inclinado del bastidor (rad, respecto a la vertical)
export const SLOPE_ANGLE = Math.atan(M.slope.lean / (M.plinthTop - M.slope.y0));

// Los cinco módulos, en el orden aprobado. `id` coincide con las variables de Data/Programs.js para conectar Reel.jsx después.
export const MODULES = [
  { id: 'objetivo', label: 'OBJETIVO', icon: 'target', num: '01' },
  { id: 'frecuencia', label: 'FRECUENCIA', icon: 'pulse', num: '02' },
  { id: 'formato', label: 'FORMATO', icon: 'grid', num: '03' },
  { id: 'personas', label: 'PERSONAS', icon: 'person', num: '04' },
  { id: 'ubicacion', label: 'UBICACIÓN', icon: 'pin', num: '05' },
];

// Posición en la escena: centrada sobre la cubierta de la plataforma existente (misma fuente: roomSpec.js).
export const MACHINE_POSITION = [
  PLATFORM.position[0],
  PLATFORM.position[1] + PLATFORM.size[1] / 2,
  PLATFORM.position[2],
];
export const MACHINE_FITS_PLATFORM = M.W <= PLATFORM.size[0] && M.D <= PLATFORM.size[2];

// Acabado (colores sRGB; el brillo lo da el entorno de reflexión de SelectionMachine.jsx, no luces nuevas)
export const PALETTE = {
  graphite: '#191c21',
  graphiteDark: '#0b0c0f',
  plate: '#20242a',
  steel: '#79818b',
  aluminum: '#9aa1a9',
  glass: '#080b10',
  light: '#e6e3dc', // ÚNICA luz propia: filetes finos, blanco casi neutro (sin RGB)
};
