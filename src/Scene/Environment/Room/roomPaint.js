import { ROOM, PLATFORM, FINISH, MAT, GEAR } from './roomSpec.js';

// Pintura 2D de las superficies de la Escena 03 (canvas → textura). Todo el "diseño de luz y material" vive aquí:
// luz indirecta (cornisa del fondo + lavado de las luminarias del techo), oclusión en esquinas, encuentros con la
// estructura y con la plataforma, despiece en paneles sobre la retícula global de 2 m, grano de material y el
// contacto/brillo de la plataforma. Colores sRGB de grafito frío, dentro de la gama existente (#050608 fondo ·
// #3b4a66 líneas). NADA aquí mueve una cota: las dimensiones salen de roomSpec.js.
//
// Orientación de cada lienzo (ver RoomArchitecture.jsx):
//  · fondo   : x → x del mundo · arriba = techo
//  · laterales: pared izquierda u = (fondo → frente) invertido; derecha u = fondo → frente (ver `flip`)
//  · techo   : arriba del lienzo = FRENTE (cámara) · x → x
//  · suelo   : arriba del lienzo = FONDO · x → x
const [W, H, D] = ROOM.size;
const HW = W / 2, HD = D / 2;
const G = FINISH.grid;
const L = FINISH.lights;

export const rgba = (r, g, b, a = 1) => `rgba(${r},${g},${b},${a})`;
export const vGrad = (g, h, stops) => { const l = g.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => l.addColorStop(o, c)); return l; };
export const hGrad = (g, w, stops) => { const l = g.createLinearGradient(0, 0, w, 0); stops.forEach(([o, c]) => l.addColorStop(o, c)); return l; };

// PRNG determinista: el material es siempre el mismo en cada carga (nada parpadea entre visitas).
export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Grano de material sobre lo ya pintado. Un solo mosaico de ruido (256 px) repetido con mezcla `overlay`: cuesta una
// fracción de recorrer cada píxel en JS (importa en móvil, se pinta al montar la escena). `amount` = intensidad
// (0..~12); `col`/`row` añaden vetas coherentes (cepillado) en una dirección.
export function grain(g, w, h, { amount = 5, col = 0, row = 0, seed = 1 } = {}) {
  const N = 256, r = rng(seed);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const t = c.getContext('2d');
  const img = t.createImageData(N, N), d = img.data;
  const cn = Float32Array.from({ length: N }, () => (r() - 0.5) * col);
  const rn = Float32Array.from({ length: N }, () => (r() - 0.5) * row);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = 128 + ((r() - 0.5) * amount + cn[x] + rn[y]) * 3.5;
    const i = (y * N + x) * 4;
    d[i] = v; d[i + 1] = v; d[i + 2] = Math.min(255, v * 1.03); d[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(c, 'repeat');
  g.fillRect(0, 0, w, h);
  g.restore();
}

// Junta entre paneles: hendidura oscura + labio de luz en el canto iluminado. Ancho en píxeles.
export function groove(g, x0, y0, x1, y1, wpx, { dark = 0.75, lip = 0.1, side = 1 } = {}) {
  const vertical = x0 === x1;
  g.lineCap = 'butt';
  g.strokeStyle = rgba(2, 4, 7, dark); g.lineWidth = wpx;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const lw = Math.max(1, wpx * 0.4);
  const o = (wpx * 0.5 + lw * 0.5) * side;
  g.strokeStyle = rgba(150, 172, 208, lip); g.lineWidth = lw;
  g.beginPath();
  if (vertical) { g.moveTo(x0 + o, y0); g.lineTo(x1 + o, y1); } else { g.moveTo(x0, y0 + o); g.lineTo(x1, y1 + o); }
  g.stroke();
}

// Rectángulo redondeado (sin depender de ctx.roundRect: iOS antiguo).
export function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Franja con perfil gaussiano (luz que se derrama): 9 paradas, centrada en cx (px), sigma en px.
function gaussStops(color, peak) {
  const st = [];
  for (let i = 0; i <= 8; i++) { const t = (i / 8) * 6 - 3; st.push([i / 8, rgba(color[0], color[1], color[2], peak * Math.exp(-0.5 * t * t))]); }
  return st;
}
function gaussBand(g, cx, sigma, y0, y1, color, peak) {
  const l = g.createLinearGradient(cx - 3 * sigma, 0, cx + 3 * sigma, 0);
  gaussStops(color, peak).forEach(([o, c]) => l.addColorStop(o, c));
  g.fillStyle = l; g.fillRect(cx - 3 * sigma, y0, 6 * sigma, y1 - y0);
}

// Capa con máscara (dibuja en un lienzo aparte, lo recorta con `mask` y lo compone).
export function masked(g, x, y, w, h, draw, mask) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = c.getContext('2d');
  draw(t, w, h);
  t.globalCompositeOperation = 'destination-in';
  mask(t, w, h);
  g.drawImage(c, x, y);
}

// Juntas que caen sobre la retícula: posiciones a lo largo de un eje, saltando bordes de marco y el eje central.
const gridLines = (lo, hi, margin) => {
  const out = [];
  for (let v = Math.ceil((lo + margin) / G) * G; v <= hi - margin + 1e-6; v += G) out.push(v);
  return out;
};

// Módulos de 2 m del mundo (z) dentro de [z0, z1] relativos al centro de la sala. `centerZ` = z de MUNDO del centro.
const worldEvenZ = (centerZ, z0, z1) => {
  const out = [];
  for (let z = Math.ceil((centerZ + z0) / G) * G - centerZ; z <= z1 + 1e-6; z += G) out.push(z);
  return out;
};

// ───────────────────────────── FONDO (16 × 5 m) ─────────────────────────────
// Luz de cornisa arriba, cae hacia el suelo; lavado en «festón» bajo cada luminaria; oclusión contra el marco;
// paneles de 2 m con una placa central de 4 m del mismo ancho que la plataforma.
export function paintBackWall(g, w, h, { ppm }) {
  const X = (x) => (x + HW) * ppm;
  const Y = (y) => h - y * ppm;
  const sp = FINISH.seam * ppm;

  g.fillStyle = vGrad(g, h, [[0, rgba(70, 84, 104)], [0.1, rgba(50, 60, 75)], [0.45, rgba(35, 41, 52)], [0.85, rgba(24, 28, 36)], [1, rgba(14, 17, 22)]]);
  g.fillRect(0, 0, w, h);

  // variación de tono por panel (chapa a chapa, no un plano continuo)
  const r = rng(303);
  const xe = [-HW, ...gridLines(-HW, HW, 0.01).filter((x) => x !== 0 && Math.abs(x) < HW), HW];
  const ye = [0, 2, 4, H];
  for (let i = 0; i < xe.length - 1; i++) for (let j = 0; j < ye.length - 1; j++) {
    const v = (r() - 0.5) * 0.06;
    g.fillStyle = v > 0 ? rgba(200, 215, 240, v) : rgba(0, 0, 0, -v);
    g.fillRect(X(xe[i]), Y(ye[j + 1]), X(xe[i + 1]) - X(xe[i]), Y(ye[j]) - Y(ye[j + 1]));
  }

  // lavado de las luminarias: festón luminoso que baja desde el techo bajo cada una
  for (const xs of L.xs) {
    g.save();
    g.translate(X(xs), 0); g.scale(1, 1.9);
    const rad = 1.7 * ppm;
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    gr.addColorStop(0, rgba(150, 178, 220, 0.2)); gr.addColorStop(0.5, rgba(150, 178, 220, 0.07)); gr.addColorStop(1, rgba(150, 178, 220, 0));
    g.fillStyle = gr; g.fillRect(-rad, 0, 2 * rad, rad);
    g.restore();
  }

  // juntas verticales (retícula, sin x = 0) y horizontales (y = 2 y 4)
  for (const x of xe.slice(1, -1)) groove(g, X(x), 0, X(x), h, sp, { dark: 0.7, lip: 0.09 });
  for (const y of [2, 4]) groove(g, 0, Y(y), w, Y(y), sp, { dark: 0.55, lip: 0.07, side: -1 });

  // oclusión contra el marco estructural (montantes 0,30 · dintel 0,30 · umbral 0,18; fondo 0,55 m de profundidad)
  const ao = (x0, y0, x1, y1, horizontal, a) => {
    const l = horizontal ? g.createLinearGradient(x0, 0, x1, 0) : g.createLinearGradient(0, y0, 0, y1);
    l.addColorStop(0, rgba(0, 0, 0, a)); l.addColorStop(1, rgba(0, 0, 0, 0));
    g.fillStyle = l;
    g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || w, Math.abs(y1 - y0) || h);
  };
  const post = 0.3, reach = 0.75 * ppm;
  ao(X(-HW + post), 0, X(-HW + post) + reach, h, true, 0.5);
  ao(X(HW - post), 0, X(HW - post) - reach, h, true, 0.5);
  ao(0, Y(H - post), 0, Y(H - post) + reach, false, 0.42);
  ao(0, Y(0.18), 0, Y(0.18) - 0.55 * ppm, false, 0.4);

  grain(g, w, h, { amount: 4, col: 3, seed: 11 });
}

// ───────────────────────────── LATERALES (22 × 5 m) ─────────────────────────────
// La luz del fondo se derrama por la pared y se apaga hacia la cámara. Módulos de 2 m sobre las mismas z de las
// juntas del suelo. flip = false: el fondo cae en u = 1 (pared izquierda) · flip = true: en u = 0 (derecha).
export function paintSideWall(g, w, h, flip, { ppm, centerZ }) {
  const U = (zr) => (flip ? zr + HD : HD - zr) * ppm; // z relativa al centro → px
  const Y = (y) => h - y * ppm;
  const sp = FINISH.seam * ppm;
  const dark = rgba(12, 14, 18), mid = rgba(24, 28, 36), bright = rgba(46, 55, 70);

  g.fillStyle = flip ? hGrad(g, w, [[0, bright], [0.45, mid], [1, dark]]) : hGrad(g, w, [[0, dark], [0.55, mid], [1, bright]]);
  g.fillRect(0, 0, w, h);

  // tono por panel
  const r = rng(flip ? 707 : 505);
  const ze = [-HD, ...worldEvenZ(centerZ, -HD + 0.6, HD - 0.3), HD];
  const ye = [0, 2, 4, H];
  for (let i = 0; i < ze.length - 1; i++) for (let j = 0; j < ye.length - 1; j++) {
    const v = (r() - 0.5) * 0.07;
    const a = U(ze[i]), b = U(ze[i + 1]);
    g.fillStyle = v > 0 ? rgba(200, 215, 240, v) : rgba(0, 0, 0, -v);
    g.fillRect(Math.min(a, b), Y(ye[j + 1]), Math.abs(b - a), Y(ye[j]) - Y(ye[j + 1]));
  }

  // lavado rasante de las luminarias (x = ±6 a 2 m de este muro): arriba brilla, baja apagándose
  g.fillStyle = vGrad(g, h, [[0, rgba(190, 210, 245, 0.16)], [0.16, rgba(190, 210, 245, 0.06)], [0.5, rgba(190, 210, 245, 0)]]);
  g.fillRect(0, 0, w, h);
  // oclusión: pie del muro y bajo el techo
  g.fillStyle = vGrad(g, h, [[0.78, rgba(0, 0, 0, 0)], [1, rgba(0, 0, 0, 0.55)]]);
  g.fillRect(0, 0, w, h);

  // juntas
  for (const z of ze.slice(1, -1)) groove(g, U(z), 0, U(z), h, sp, { dark: 0.7, lip: 0.08, side: flip ? -1 : 1 });
  for (const y of [2, 4]) groove(g, 0, Y(y), w, Y(y), sp, { dark: 0.5, lip: 0.06, side: -1 });

  // oclusión contra el marco del fondo (profundidad 0,55 m) y del frente
  const back = U(-HD + 0.55), backDir = flip ? -1 : 1; // hacia dentro de la sala
  const l = g.createLinearGradient(back, 0, back + backDir * 0.9 * ppm, 0);
  l.addColorStop(0, rgba(0, 0, 0, 0.5)); l.addColorStop(1, rgba(0, 0, 0, 0));
  g.fillStyle = l; g.fillRect(Math.min(back, back + backDir * 0.9 * ppm), 0, 0.9 * ppm, h);

  grain(g, w, h, { amount: 4, row: 3, seed: flip ? 13 : 12 });
}

// ───────────────────────────── TECHO (16 × 22 m) ─────────────────────────────
// Placas de 2 m sobre la retícula y cuatro luminarias lineales (x = ±2, ±6) partidas en módulos de 2 m de mundo.
// Las de x = ±2 caen sobre los cantos de la plataforma; el eje central queda sin luminaria.
export function paintCeiling(g, w, h, { ppm, centerZ }) {
  const X = (x) => (x + HW) * ppm;
  const Zc = (zr) => (HD - zr) * ppm; // arriba del lienzo = frente
  const sp = FINISH.seam * ppm;

  g.fillStyle = vGrad(g, h, [[0, rgba(11, 13, 17)], [0.6, rgba(18, 21, 27)], [1, rgba(52, 62, 78)]]);
  g.fillRect(0, 0, w, h);

  // tono por placa
  const r = rng(909);
  const xe = [-HW, ...gridLines(-HW, HW, 0.01).filter((x) => x !== 0 && Math.abs(x) < HW), HW];
  const ze = [HD, ...worldEvenZ(centerZ, -HD, HD).filter((z) => Math.abs(z) < HD).reverse(), -HD];
  for (let i = 0; i < xe.length - 1; i++) for (let j = 0; j < ze.length - 1; j++) {
    const v = (r() - 0.5) * 0.08;
    g.fillStyle = v > 0 ? rgba(200, 215, 240, v) : rgba(0, 0, 0, -v);
    g.fillRect(X(xe[i]), Zc(ze[j]), X(xe[i + 1]) - X(xe[i]), Zc(ze[j + 1]) - Zc(ze[j]));
  }

  // halo de las luminarias sobre el techo (penumbra por capas, sin ctx.filter: iOS)
  const y0 = Zc(L.to), y1 = Zc(L.from);
  for (const xs of L.xs) {
    for (let k = 14; k >= 1; k--) {
      const e = (k / 14) * 1.1 * ppm;
      g.fillStyle = rgba(140, 168, 214, 0.012);
      rr(g, X(xs) - L.housing * ppm / 2 - e, y0 - e, L.housing * ppm + 2 * e, y1 - y0 + 2 * e, e); g.fill();
    }
  }

  // juntas de placa: longitudinales (x) y transversales (z de mundo par)
  for (const x of xe.slice(1, -1)) {
    if (L.xs.includes(x)) continue; // bajo la luminaria no hay junta: la propia luminaria es la junta
    groove(g, X(x), 0, X(x), h, sp, { dark: 0.65, lip: 0.07 });
  }
  for (const z of ze.slice(1, -1)) groove(g, 0, Zc(z), w, Zc(z), sp, { dark: 0.65, lip: 0.07 });

  // luminarias: carcasa oscura + núcleo luminoso; un hueco por módulo (sobre las juntas transversales)
  const cuts = worldEvenZ(centerZ, L.from, L.to).filter((z) => z > L.from + 1e-6 && z < L.to - 1e-6);
  for (const xs of L.xs) {
    const cx = X(xs), hw = (L.housing * ppm) / 2, cw = (L.core * ppm) / 2;
    g.fillStyle = rgba(7, 9, 12); g.fillRect(cx - hw, y0 - 0.06 * ppm, 2 * hw, y1 - y0 + 0.12 * ppm);
    g.fillStyle = rgba(150, 172, 208, 0.16); g.fillRect(cx - hw, y0 - 0.06 * ppm, 1, y1 - y0 + 0.12 * ppm); // labio
    const core = g.createLinearGradient(cx - cw, 0, cx + cw, 0);
    core.addColorStop(0, rgba(150, 170, 204)); core.addColorStop(0.5, rgba(206, 222, 248)); core.addColorStop(1, rgba(150, 170, 204));
    g.fillStyle = core; g.fillRect(cx - cw, y0, 2 * cw, y1 - y0);
    for (const z of cuts) { g.fillStyle = rgba(7, 9, 12); g.fillRect(cx - hw, Zc(z) - sp * 0.6, 2 * hw, sp * 1.2); }
  }

  // penumbra de esquinas
  g.fillStyle = hGrad(g, w, [[0, rgba(0, 0, 0, 0.55)], [0.25, rgba(0, 0, 0, 0)], [0.75, rgba(0, 0, 0, 0)], [1, rgba(0, 0, 0, 0.55)]]);
  g.fillRect(0, 0, w, h);
  // oclusión bajo el dintel del fondo (0,55 m de profundidad) — abajo del lienzo
  g.fillStyle = vGrad(g, h, [[0.94, rgba(0, 0, 0, 0)], [1, rgba(0, 0, 0, 0.5)]]);
  g.fillRect(0, 0, w, h);

  grain(g, w, h, { amount: 3, col: 2, seed: 21 });
}


// ───────────────── CENTRO · zona de entrenamiento (tinta sobre el suelo) ─────────────────
// Caucho grafito un punto más oscuro que la losa, módulos de 1 m, línea de guardia, círculo central con sus cuatro marcas de apoyo
// y la identidad SML. Los bordes del tapiz caen sobre la retícula de 2 m, así que las juntas del suelo (que se pintan DESPUÉS) siguen
// siendo las mismas. `Zl` convierte z local de la escena en fila del lienzo (arriba = fondo), igual que la fila de la plataforma.
function paintCenterMat(g, ppm) {
  const X = (x) => (x + HW) * ppm;
  const Zl = (z) => (z - ROOM.position[2] + HD) * ppm;
  const [x0, x1] = MAT.x, [z0, z1] = MAT.z;
  const mx = X(x0), my = Zl(z0), mw = (x1 - x0) * ppm, mh = (z1 - z0) * ppm;

  g.fillStyle = rgba(14, 17, 23); g.fillRect(mx, my, mw, mh);
  const r = rng(211);
  for (let x = x0; x < x1; x += 1) for (let z = z0; z < z1; z += 1) {
    const v = (r() - 0.5) * 0.07;
    g.fillStyle = v > 0 ? rgba(190, 205, 235, v) : rgba(0, 0, 0, -v);
    g.fillRect(X(x), Zl(z), ppm, ppm);
  }
  // juntas de 1 m (las de 2 m son las de la retícula, que se dibujan después)
  for (let x = x0 + 1; x < x1; x += 2) groove(g, X(x), my, X(x), my + mh, 0.018 * ppm, { dark: 0.6, lip: 0.05 });
  for (let z = z0 + 1; z < z1; z += 2) groove(g, mx, Zl(z), mx + mw, Zl(z), 0.018 * ppm, { dark: 0.6, lip: 0.05, side: -1 });

  // línea de guardia
  const gi = 0.4 * ppm;
  g.strokeStyle = rgba(190, 205, 235, 0.34); g.lineWidth = Math.max(2, 0.05 * ppm);
  g.strokeRect(mx + gi, my + gi, mw - 2 * gi, mh - 2 * gi);

  // círculo central + cuatro marcas de apoyo (norte, este, sur, oeste)
  const cx = X(0), cz = Zl((z0 + z1) / 2), R = MAT.ring * ppm;
  g.strokeStyle = rgba(190, 205, 235, 0.3); g.lineWidth = Math.max(1.5, 0.035 * ppm);
  g.beginPath(); g.arc(cx, cz, R, 0, Math.PI * 2); g.stroke();
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a), t = 0.22 * ppm;
    g.beginPath(); g.moveTo(cx + ca * (R - t), cz + sa * (R - t)); g.lineTo(cx + ca * (R + t), cz + sa * (R + t)); g.stroke();
  }
  g.fillStyle = rgba(210, 220, 240, 0.9);
  g.beginPath(); g.arc(cx, cz, 0.04 * ppm, 0, Math.PI * 2); g.fill();

  // identidad: SML en el centro (apenas se ve) y el nombre completo en el canto cercano, espaciado como el resto de rótulos
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = rgba(210, 220, 240, 0.12);
  g.font = `900 ${0.9 * ppm}px "Arial Black", Impact, sans-serif`;
  g.fillText('SML', cx, cz);
  const label = 'STRIKING MOTION LAB', fs = 0.3 * ppm, gap = 0.2 * ppm;
  g.font = `600 ${fs}px "Courier New", monospace`;
  g.fillStyle = rgba(210, 220, 240, 0.42);
  const wchar = g.measureText('M').width + gap;
  const x0t = cx - (wchar * (label.length - 1)) / 2;
  [...label].forEach((ch, i) => g.fillText(ch, x0t + i * wchar, my + mh - 0.85 * ppm));
  g.restore();
}

// Sombra de contacto de los sacos colgados (GEAR): mancha blanda bajo cada uno.
function paintGearShadows(g, ppm) {
  const X = (x) => (x + HW) * ppm;
  const Zl = (z) => (z - ROOM.position[2] + HD) * ppm;
  for (const [bx, bz] of GEAR.bags) {
    const rad = 0.95 * ppm;
    const sh = g.createRadialGradient(X(bx), Zl(bz), 0, X(bx), Zl(bz), rad);
    sh.addColorStop(0, rgba(0, 0, 0, 0.42)); sh.addColorStop(0.5, rgba(0, 0, 0, 0.18)); sh.addColorStop(1, rgba(0, 0, 0, 0));
    g.fillStyle = sh; g.fillRect(X(bx) - rad, Zl(bz) - rad, 2 * rad, 2 * rad);
  }
}

// ───────────────────────────── SUELO (16 × 22 m) ─────────────────────────────
// `originZ` = Z de MUNDO del borde del fondo (para que las juntas caigan sobre las líneas pares de la retícula
// global, que van cada 2 m). Resina pulida grafito: baldosas de 2 × 2 m con leve variación de tono, juntas,
// derrame del muro, luz de las luminarias, oclusión, contacto y brillo de la plataforma.
export function paintFloor(g, w, h, { ppm, originZ }) {
  const X = (x) => (x + HW) * ppm;
  const Zw = (z) => (z - originZ) * ppm; // z de mundo → px
  const Zl2 = (z) => (z - ROOM.position[2] + HD) * ppm; // z local de la escena → px
  const seam = (x0, y0, x1, y1, major) => {
    const wpx = (major ? 0.06 : FINISH.seam) * ppm;
    groove(g, x0, y0, x1, y1, wpx, { dark: major ? 0.95 : 0.8, lip: major ? 0.2 : 0.1 });
  };

  g.fillStyle = rgba(27, 32, 41);
  g.fillRect(0, 0, w, h);

  // variación de tono por baldosa
  const r = rng(101);
  const z0 = Math.floor(originZ / G) * G;
  for (let x = -HW; x < HW; x += G) for (let z = z0; z < originZ + D; z += G) {
    const v = (r() - 0.5) * 0.06;
    g.fillStyle = v > 0 ? rgba(190, 205, 235, v) : rgba(0, 0, 0, -v);
    g.fillRect(X(x), Zw(z), G * ppm, G * ppm);
  }

  // centro del laboratorio: zona de entrenamiento marcada en el suelo (bajo toda la luz y las juntas que se pintan después)
  paintCenterMat(g, ppm);

  // luz indirecta: derrame del muro del fondo + charco bajo la plataforma
  g.fillStyle = vGrad(g, h, [[0, rgba(74, 88, 110, 0.42)], [0.28, rgba(74, 88, 110, 0.10)], [0.5, rgba(74, 88, 110, 0)]]);
  g.fillRect(0, 0, w, h);
  const py = (PLATFORM.position[2] - ROOM.position[2] + HD) * ppm; // fila de la plataforma
  const pool = g.createRadialGradient(w / 2, py, 0, w / 2, py, 8 * ppm);
  pool.addColorStop(0, rgba(96, 112, 138, 0.26)); pool.addColorStop(1, rgba(96, 112, 138, 0));
  g.fillStyle = pool; g.fillRect(0, 0, w, h);
  // charco de luz sobre la zona de entrenamiento: continúa el de la plataforma hacia la cámara (mismo tinte frío)
  const mz = Zl2((MAT.z[0] + MAT.z[1]) / 2);
  const mpool = g.createRadialGradient(w / 2, mz, 0, w / 2, mz, 5.2 * ppm);
  mpool.addColorStop(0, rgba(110, 128, 160, 0.15)); mpool.addColorStop(1, rgba(110, 128, 160, 0));
  g.fillStyle = mpool; g.fillRect(0, 0, w, h);
  // la luz de las cuatro luminarias cae en franjas largas sobre el suelo (más tenue hacia la cámara: lo apaga la oclusión)
  for (const xs of L.xs) gaussBand(g, X(xs), 1.5 * ppm, 0, h, [104, 124, 158], 0.15);

  // oclusión: pie de muros y esquinas
  g.fillStyle = hGrad(g, w, [[0, rgba(0, 0, 0, 0.55)], [0.09, rgba(0, 0, 0, 0)], [0.91, rgba(0, 0, 0, 0)], [1, rgba(0, 0, 0, 0.55)]]);
  g.fillRect(0, 0, w, h);
  g.fillStyle = vGrad(g, h, [[0, rgba(0, 0, 0, 0.5)], [0.05, rgba(0, 0, 0, 0)], [0.85, rgba(0, 0, 0, 0)], [1, rgba(0, 0, 0, 0.6)]]);
  g.fillRect(0, 0, w, h);

  // sacos colgados: sombra de contacto sobre el suelo
  paintGearShadows(g, ppm);

  // juntas: cada 2 m de mundo (las de la retícula); mayor cada 10 m; eje central x = 0 como referencia de medida
  for (let x = -HW; x <= HW + 1e-6; x += G) {
    if (x === 0) continue;
    seam(X(x), 0, X(x), h, x % 10 === 0);
  }
  for (let z = Math.ceil(originZ / G) * G; z <= originZ + D; z += G) seam(0, Zw(z), w, Zw(z), z % 10 === 0);
  g.strokeStyle = rgba(150, 170, 200, 0.4); g.lineWidth = Math.max(2, 0.03 * ppm);
  g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();

  // plataforma: brillo del suelo pulido + sombra de contacto (penumbra por capas, sin ctx.filter: iOS)
  const pw = PLATFORM.size[0] * ppm, pd = PLATFORM.size[2] * ppm, cx = w / 2 - pw / 2, cy = py - pd / 2;
  // reflejo cercano de la cara frontal (hacia la cámara = y creciente): se desvanece en ~0,9 m y a los lados
  const refl = 0.9 * ppm, edge = 0.35 * ppm;
  masked(g, cx - edge, cy + pd, pw + 2 * edge, refl,
    (t, cw, ch) => { t.fillStyle = vGrad(t, ch, [[0, rgba(92, 108, 136, 0.34)], [0.35, rgba(92, 108, 136, 0.12)], [1, rgba(92, 108, 136, 0)]]); t.fillRect(0, 0, cw, ch); },
    (t, cw, ch) => { t.fillStyle = hGrad(t, cw, [[0, 'rgba(0,0,0,0)'], [edge / cw, 'rgba(0,0,0,1)'], [1 - edge / cw, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); t.fillRect(0, 0, cw, ch); });
  const N = 22, pad = 1.0 * ppm;
  g.fillStyle = 'rgba(0,0,0,0.035)';
  for (let k = N; k >= 0; k--) {
    const e = (k / N) * pad, x = cx - e, y = cy - e, ww = pw + 2 * e, hh = pd + 2 * e;
    rr(g, x, y, ww, hh, Math.min(e, ww / 2, hh / 2)); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(cx - 0.04 * ppm, cy - 0.04 * ppm, pw + 0.08 * ppm, pd + 0.08 * ppm); // línea de contacto

  grain(g, w, h, { amount: 5, col: 4, seed: 31 });
}

// ───────────────────────────── PLATAFORMA (4 × 1 × 1,6 m) ─────────────────────────────
// Sólida, apoyada en el suelo. Cubierta mate con panel rehundido; laterales con zócalo rehundido (sombra, no hueco).
export function paintPlatformTop(g, w, h, { ppm }) {
  g.fillStyle = rgba(60, 71, 90); g.fillRect(0, 0, w, h);
  // las luminarias de x = ±2 caen sobre los cantos: la cubierta brilla más hacia ellos
  g.fillStyle = hGrad(g, w, [[0, rgba(190, 210, 245, 0.16)], [0.18, rgba(190, 210, 245, 0)], [0.82, rgba(190, 210, 245, 0)], [1, rgba(190, 210, 245, 0.16)]]);
  g.fillRect(0, 0, w, h);
  // panel rehundido (a 0,14 m del canto)
  const m = 0.14 * ppm, sp = 0.025 * ppm;
  groove(g, m, m, w - m, m, sp, { dark: 0.55, lip: 0.12, side: 1 });
  groove(g, m, h - m, w - m, h - m, sp, { dark: 0.55, lip: 0.12, side: 1 });
  groove(g, m, m, m, h - m, sp, { dark: 0.55, lip: 0.12, side: 1 });
  groove(g, w - m, m, w - m, h - m, sp, { dark: 0.55, lip: 0.12, side: -1 });
  // labio del canto
  g.strokeStyle = rgba(190, 208, 240, 0.28); g.lineWidth = Math.max(1, 0.02 * ppm);
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  grain(g, w, h, { amount: 5, col: 4, seed: 41 });
}

export function paintPlatformFace(g, w, h, { ppm, front }) {
  const base = front ? [38, 46, 60] : [30, 37, 49];
  g.fillStyle = vGrad(g, h, [[0, rgba(...base.map((v) => v * 1.12))], [1, rgba(...base.map((v) => v * 0.78))]]);
  g.fillRect(0, 0, w, h);
  // zócalo rehundido (0,09 m): la sombra es el hueco; el cuerpo baja hasta el suelo
  const zoc = 0.07 * ppm;
  g.fillStyle = rgba(3, 5, 8, 0.5); g.fillRect(0, h - zoc, w, zoc);
  g.fillStyle = rgba(160, 182, 216, 0.12); g.fillRect(0, h - zoc - 1, w, Math.max(1, 0.012 * ppm));
  // labio del canto superior
  g.fillStyle = rgba(190, 208, 240, 0.22); g.fillRect(0, 0, w, Math.max(1, 0.02 * ppm));
  grain(g, w, h, { amount: 4, row: 3, seed: front ? 51 : 52 });
}
