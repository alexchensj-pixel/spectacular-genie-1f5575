import { ARCHIVE, FLOOR, WARM, slabX } from './archiveSpec.js';
import { rgba, vGrad, hGrad, rng, grain, groove, masked, rr } from '../Room/roomPaint.js';

// Pintura 2D de las superficies de la Escena 05 (canvas → textura). Mismo lenguaje que roomPaint.js: sombreado HORNEADO
// (luz indirecta, oclusión, derrame de luz y contacto pintados en la textura), grafito frío con una única luz cálida en
// los cantos. NADA aquí mueve una cota: las dimensiones salen de archiveSpec.js.

const [SW, SH, SD] = ARCHIVE.size; // 0,2 · 4 · 3

// ───────────── CARA ANCHA DE UN VOLUMEN (profundidad 3 m × altura 4 m) ─────────────
// Hormigón encofrado: tablas verticales de 25 cm, juntas de encofrado cada 1 m, anclajes, oclusión al pie y bajo la
// coronación, y el derrame de la luz del canto delantero (frontAtLeft: dónde cae ese canto en el lienzo; BoxGeometry
// invierte la U entre la cara +x y la -x).
export function paintSlabSide(g, w, h, { ppm, frontAtLeft, seed = 1 }) {
  const U = (m) => (frontAtLeft ? m : SD - m) * ppm; // metros desde el canto delantero → px
  const Y = (y) => h - y * ppm;

  g.fillStyle = vGrad(g, h, [
    [0, rgba(20, 24, 31)], [0.1, rgba(38, 44, 55)], [0.5, rgba(31, 36, 46)], [0.86, rgba(20, 23, 29)], [1, rgba(9, 11, 14)],
  ]);
  g.fillRect(0, 0, w, h);

  // tablas verticales con variación de tono
  const r = rng(seed);
  const board = 0.25 * ppm;
  for (let x = 0; x < w; x += board) {
    const v = (r() - 0.5) * 0.08;
    g.fillStyle = v > 0 ? rgba(210, 220, 240, v) : rgba(0, 0, 0, -v);
    g.fillRect(x, 0, board, h);
    g.fillStyle = rgba(2, 4, 7, 0.2);
    g.fillRect(x, 0, 1, h);
  }

  // juntas de encofrado horizontales (cada metro)
  for (const y of [1, 2, 3]) groove(g, 0, Y(y), w, Y(y), Math.max(1.5, 0.02 * ppm), { dark: 0.5, lip: 0.07, side: -1 });

  // anclajes del encofrado: hueco oscuro con labio de luz arriba
  for (const y of [0.5, 1.5, 2.5, 3.5]) {
    for (const m of [0.75, 2.25]) {
      const cx = U(m), cy = Y(y), rad = Math.max(1.5, 0.022 * ppm);
      g.fillStyle = rgba(3, 4, 6, 0.7);
      g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
      g.strokeStyle = rgba(160, 176, 205, 0.1); g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, rad + 1, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    }
  }

  // derrame de la luz del canto: cálida, más fuerte a media altura; el canto trasero recibe un resto
  const spill = (m0, m1, peak) => masked(g, 0, 0, w, h,
    (t) => {
      const l = t.createLinearGradient(U(m0), 0, U(m1), 0);
      l.addColorStop(0, rgba(WARM[0], WARM[1], WARM[2], peak));
      l.addColorStop(0.35, rgba(WARM[0], WARM[1], WARM[2], peak * 0.35));
      l.addColorStop(1, rgba(WARM[0], WARM[1], WARM[2], 0));
      t.fillStyle = l; t.fillRect(0, 0, w, h);
    },
    (t) => {
      t.fillStyle = vGrad(t, h, [[0, 'rgba(0,0,0,0.3)'], [0.15, 'rgba(0,0,0,0.85)'], [0.55, 'rgba(0,0,0,1)'], [0.9, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0.12)']]);
      t.fillRect(0, 0, w, h);
    });
  spill(0, 0.9, 0.09);
  spill(SD, SD - 0.7, 0.03);
  // canto delantero: filo de luz
  g.fillStyle = rgba(WARM[0], WARM[1], WARM[2], 0.2);
  g.fillRect(frontAtLeft ? 0 : w - 1, 0, 1, h);

  // oclusión: pie del volumen y coronación
  g.fillStyle = vGrad(g, h, [[0, rgba(0, 0, 0, 0.35)], [0.05, rgba(0, 0, 0, 0)], [1 - (0.4 * ppm) / h, rgba(0, 0, 0, 0)], [1, rgba(0, 0, 0, 0.6)]]);
  g.fillRect(0, 0, w, h);

  grain(g, w, h, { amount: 6, col: 4, seed });
}

// ───────────── CANTO DEL PANEL (0,2 × 4 m) ─────────────
// El canto es el espesor del panel: hormigón oscuro y mate, sin elemento luminoso propio. La luz solo lo REVELA: un bisel
// fino en cada arista vertical (lo que recoge la luz rasante) y la oclusión al pie y en la coronación. No hay columna ni
// rendija: el panel se lee como un panel con espesor.
export function paintSlabEnd(g, w, h) {
  g.fillStyle = vGrad(g, h, [[0, rgba(14, 17, 22)], [0.15, rgba(25, 29, 37)], [0.8, rgba(19, 22, 29)], [1, rgba(8, 10, 13)]]);
  g.fillRect(0, 0, w, h);
  const b = Math.max(2, Math.round(w * 0.1));
  masked(g, 0, 0, w, h,
    (t) => {
      t.fillStyle = rgba(WARM[0], WARM[1], WARM[2], 0.34);
      t.fillRect(0, 0, b, h); t.fillRect(w - b, 0, b, h);
    },
    (t) => {
      t.fillStyle = vGrad(t, h, [[0, 'rgba(0,0,0,0.15)'], [0.2, 'rgba(0,0,0,0.8)'], [0.6, 'rgba(0,0,0,0.8)'], [1, 'rgba(0,0,0,0.1)']]);
      t.fillRect(0, 0, w, h);
    });
}

// ───────────── SUELO PULIDO ─────────────
// Lienzo: arriba = FONDO (−z) · abajo = hacia la cámara (+z) · x → x. Resina pulida grafito: baldosas de 2 × 2 m con
// leve variación, juntas sobre la retícula global, charco de luz alrededor del archivo, sombra de contacto de cada volumen y
// un resto cálido al pie del canto luminoso. Los bordes se funden a transparente.
export function paintArchiveFloor(g, w, h, { ppm }) {
  const [FW, FD] = FLOOR.size;
  const HW = FW / 2, HD = FD / 2;
  const X = (x) => (x + HW) * ppm;
  const Z = (z) => (z + HD) * ppm;
  const sp = Math.max(1.5, 0.045 * ppm);

  g.fillStyle = vGrad(g, h, [
    [0, rgba(8, 9, 12)], [0.41, rgba(15, 18, 23)], [0.56, rgba(17, 20, 26)], [0.75, rgba(13, 15, 20)], [1, rgba(8, 10, 13)],
  ]);
  g.fillRect(0, 0, w, h);

  // charco de luz ancho y bajo, centrado en el archivo
  g.save();
  g.translate(X(0), Z(1.5)); g.scale(1.7, 1);
  const rad = 8 * ppm;
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  pool.addColorStop(0, rgba(120, 128, 146, 0.11)); pool.addColorStop(0.5, rgba(120, 128, 146, 0.04)); pool.addColorStop(1, rgba(120, 128, 146, 0));
  g.fillStyle = pool; g.fillRect(-rad, -rad, 2 * rad, 2 * rad);
  g.restore();

  // tono por baldosa
  const r = rng(505);
  for (let x = -HW; x < HW; x += 2) {
    for (let z = -HD; z < HD; z += 2) {
      const v = (r() - 0.5) * 0.05;
      g.fillStyle = v > 0 ? rgba(200, 215, 240, v) : rgba(0, 0, 0, -v);
      g.fillRect(X(x), Z(z), 2 * ppm, 2 * ppm);
    }
  }

  // juntas: las líneas pares de la retícula global
  for (let x = -HW + 2; x < HW; x += 2) groove(g, X(x), 0, X(x), h, sp, { dark: 0.7, lip: 0.07 });
  for (let z = -HD + 2; z < HD; z += 2) groove(g, 0, Z(z), w, Z(z), sp, { dark: 0.7, lip: 0.07, side: -1 });

  for (let i = 0; i < ARCHIVE.n; i++) {
    const cx = X(slabX(i));
    // sombra de contacto: penumbra por capas alrededor de la huella del volumen
    for (let k = 10; k >= 1; k--) {
      const e = (k / 10) * 0.55 * ppm;
      g.fillStyle = rgba(0, 0, 0, 0.05);
      rr(g, cx - (SW * ppm) / 2 - e, Z(-SD / 2) - e, SW * ppm + 2 * e, SD * ppm + 2 * e, e); g.fill();
    }
    g.fillStyle = rgba(3, 4, 6, 0.85);
    g.fillRect(cx - (SW * ppm) / 2, Z(-SD / 2), SW * ppm, SD * ppm);
    // resto cálido al pie del canto luminoso (el reflejo vivo lo pone el streak de cada volumen)
    const rp = 1.1 * ppm;
    const warm = g.createRadialGradient(cx, Z(SD / 2), 0, cx, Z(SD / 2), rp);
    warm.addColorStop(0, rgba(WARM[0], WARM[1], WARM[2], 0.07)); warm.addColorStop(1, rgba(WARM[0], WARM[1], WARM[2], 0));
    g.fillStyle = warm; g.fillRect(cx - rp, Z(SD / 2) - rp, 2 * rp, 2 * rp);
  }

  grain(g, w, h, { amount: 3, col: 2, seed: 31 });

  // bordes → transparente (la retícula global sigue fuera de la losa)
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = hGrad(g, w, [[0, 'rgba(0,0,0,0)'], [0.2, 'rgba(0,0,0,1)'], [0.8, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, w, h);
  g.fillStyle = vGrad(g, h, [[0, 'rgba(0,0,0,0)'], [0.2, 'rgba(0,0,0,1)'], [0.8, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
}

// ───────────── REFLEJO DEL CANTO EN EL SUELO ─────────────
// Franja estrecha con perfil gaussiano que nace al pie del canto luminoso y se apaga hacia la cámara (arriba del lienzo =
// pegado al volumen). Se pinta con alfa y se compone en aditivo: cuánto brilla lo decide el volumen enfocado.
export function paintStreak(g, w, h) {
  const l = g.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * 6 - 3;
    l.addColorStop(i / 8, rgba(WARM[0], WARM[1], WARM[2], Math.exp(-0.5 * t * t)));
  }
  g.fillStyle = l; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = vGrad(g, h, [[0, 'rgba(0,0,0,1)'], [0.25, 'rgba(0,0,0,0.45)'], [0.6, 'rgba(0,0,0,0.12)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
}
