// ESCENA 03 — Asesoría + Lab. Fuente de verdad ÚNICA de la geometría existente (funciones puras, sin three).
// Estos valores son los MISMOS que ya tenía `Room` en blockouts.jsx: el gran marco (volumen 16 × 5 × 22) y la
// plataforma baja (4 × 1 × 1,6). No se cambia ninguna cota: la arquitectura (RoomArchitecture.jsx) y las líneas
// (WireBox) leen de aquí, así no pueden desincronizarse.
// Ejes: la cámara mira hacia -Z; el «fondo» del marco es la cara z = -D/2 (local a la caja).
export const ROOM = { size: [16, 5, 22], position: [0, 2.5, 2] };
export const PLATFORM = { size: [4, 1, 1.6], position: [0, 0.5, -3] };

// Secciones de las vigas (m). Todas quedan DENTRO del volumen, con su arista exterior sobre la línea original:
// la línea sigue siendo la arista luminosa del perfil, no se mueve ni se duplica.
export const SECTION = {
  fine: 0.16,        // líneas de profundidad y marco frontal
  backFrame: 0.3,    // marco del fondo: grosor en el plano
  backSill: 0.18,    // umbral inferior del fondo
  backDepth: 0.55,   // cuánto avanza hacia la cámara el marco del fondo (profundidad tridimensional)
};

// Vigas de la caja principal, en coordenadas locales a su centro. {n, size:[x,y,z], c:[x,y,z]}
export function roomBeams() {
  const [W, H, D] = ROOM.size;
  const hw = W / 2, hh = H / 2, hd = D / 2;
  const { fine: T, backFrame: TB, backSill: TS, backDepth: DB } = SECTION;
  const zb = -hd + DB / 2; // centro en Z de las piezas del marco del fondo
  const zf = hd - T / 2;   // centro en Z de las piezas del marco frontal
  const b = [];
  // Marco del fondo (estructural): montantes, dintel y umbral
  for (const s of [-1, 1]) b.push({ n: 'back-post', size: [TB, H, DB], c: [s * (hw - TB / 2), 0, zb] });
  b.push({ n: 'back-lintel', size: [W - 2 * TB, TB, DB], c: [0, hh - TB / 2, zb] });
  b.push({ n: 'back-sill', size: [W - 2 * TB, TS, DB], c: [0, -hh + TS / 2, zb] });
  // Marco frontal (más fino): montantes, dintel y umbral
  for (const s of [-1, 1]) b.push({ n: 'front-post', size: [T, H, T], c: [s * (hw - T / 2), 0, zf] });
  b.push({ n: 'front-lintel', size: [W - 2 * T, T, T], c: [0, hh - T / 2, zf] });
  b.push({ n: 'front-sill', size: [W - 2 * T, T, T], c: [0, -hh + T / 2, zf] });
  // Aristas de profundidad (fondo → frente): cornisa y zócalo a cada lado
  const len = D - DB - T;
  const zc = (DB - T) / 2;
  for (const s of [-1, 1]) {
    b.push({ n: 'depth-top', size: [T, T, len], c: [s * (hw - T / 2), hh - T / 2, zc] });
    b.push({ n: 'depth-base', size: [T, T, len], c: [s * (hw - T / 2), -hh + T / 2, zc] });
  }
  return b;
}

// --- Tono de las aristas (0..1) según su FUNCIÓN. Multiplica el color de línea original; 1 = como antes. ---
// estructurales (marco del fondo y sus montantes) = 1 · profundidad = 0.85 en el fondo → 0.15 hacia la cámara ·
// marco frontal = 0.4 · aristas de suelo (juntas) × 0.7.
const near = (a, b) => Math.abs(a - b) < 1e-6;
export function roomEdgeTone(p, q, size = ROOM.size) {
  const [, H, D] = size;
  const hd = D / 2, hh = H / 2;
  const onZ = !near(p[2], q[2]);
  const floor = near(p[1], -hh) && near(q[1], -hh);
  const one = (v) => {
    let t;
    if (onZ) {
      const s = (v[2] + hd) / D; // 0 fondo … 1 frente
      t = 0.85 - 0.7 * Math.pow(s, 0.8);
    } else {
      t = near(v[2], -hd) ? 1 : 0.4;
    }
    return floor ? t * 0.7 : t;
  };
  return [one(p), one(q)];
}
// Plataforma: arista superior luminosa sutil, base más apagada (contacto con el suelo).
export function platformEdgeTone(p, q, size = PLATFORM.size) {
  const hh = size[1] / 2;
  const one = (v) => (v[1] > 0 ? 0.95 : 0.5);
  void hh;
  return [one(p), one(q)];
}

// --- ACABADO (solo superficies; NO toca ninguna cota de arriba) ---
// Todo el despiece de las superficies cuelga de la retícula global que YA existe (juntas del suelo cada 2 m de mundo,
// eje x = 0): las paredes, el techo y la plataforma se despiezan con el MISMO módulo, así el suelo, los muros y el
// techo se leen como una sola instalación y no como capas pintadas por separado.
export const FINISH = {
  grid: 2,        // m — módulo de la retícula global (el de las juntas del suelo)
  seam: 0.045,    // m — ancho de junta entre paneles
  // Luminarias lineales del techo. x sobre la retícula; ±2 coinciden con los cantos de la plataforma (4 m) y el eje
  // central x = 0 queda SIN luminaria (centro libre). z relativa al centro de la sala; se parten en módulos de 2 m de mundo.
  lights: { xs: [-6, -2, 2, 6], housing: 0.26, core: 0.12, from: -10, to: 10 },
};

// --- CENTRO DEL LABORATORIO (solo superficie + equipamiento; NO toca ninguna cota de arriba) ---
// El eje central x = 0 sigue libre de luminarias y de obstáculos entre la cámara y la plataforma. El centro se resuelve con lo
// que ya manda en la sala: el suelo (retícula de 2 m) y las luminarias (x = ±2, ±6). Todo en coordenadas locales de la escena.
//  · MAT   — zona de entrenamiento marcada en el propio suelo (8 × 8 m, alineada con la retícula: bordes en x y z pares), entre la
//            cámara y la plataforma. Es tinta sobre la textura del suelo: no hay geometría, no ocupa volumen, no tapa nada.
//  · GEAR  — cuatro sacos colgados bajo las luminarias de x = ±6 (los mismos módulos), a los lados del recorrido de cámara.
export const MAT = { x: [-4, 4], z: [-2, 6], ring: 2.2 };
export const GEAR = {
  bags: [[-6, 0], [-6, 4], [6, 0], [6, 4]], // [x, z] locales; pares: caen sobre la retícula
  length: 1.15, radius: 0.175, bottom: 0.45, // el saco cuelga a 0,45 m del suelo
  ceiling: ROOM.size[1],
};
