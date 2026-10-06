// Pintura 2D de la cubierta del escenario de la Escena 02 (canvas → textura). Mismo lenguaje que roomPaint.js
// (Escena 03): grafito frío, juntas en hendidura con labio de luz, retícula de 2 m del suelo global (x = 0, ±2, ±4…),
// grano de material y un borde biselado. Solo cambia la superficie; las cotas salen de blockouts.jsx.
const rgba = (r, g, b, a = 1) => `rgba(${r},${g},${b},${a})`;

export function paintDeck(g, w, h, { ppm, width, depth }) {
  // base: grafito con un degradado suave hacia el fondo (arriba del lienzo = fondo del escenario)
  const l = g.createLinearGradient(0, 0, 0, h);
  l.addColorStop(0, '#171c26'); l.addColorStop(1, '#0d1118');
  g.fillStyle = l; g.fillRect(0, 0, w, h);

  // paneles: tono ligeramente distinto por pieza (determinista), con módulo de 2 m alineado al eje x = 0
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cols = Math.round(width / 2), x0 = w / 2 - (cols * 2 * ppm) / 2;
  for (let c = 0; c < cols; c++) {
    g.fillStyle = rgba(255, 255, 255, 0.012 + rnd() * 0.022);
    g.fillRect(x0 + c * 2 * ppm, 0, 2 * ppm, h);
  }
  // grano
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rgba(190, 205, 230, 0.015 + rnd() * 0.03);
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1);
  }
  // juntas cada 2 m (hendidura + labio de luz)
  for (let c = 0; c <= cols; c++) {
    const x = Math.round(x0 + c * 2 * ppm);
    g.fillStyle = rgba(2, 4, 7, 0.8); g.fillRect(x - 2, 0, 4, h);
    g.fillStyle = rgba(150, 172, 208, 0.09); g.fillRect(x + 2, 0, 1, h);
  }
  // borde: bisel en la arista (luz por el frente, sombra por detrás)
  const b = Math.round(0.05 * ppm);
  g.fillStyle = rgba(150, 172, 208, 0.20); g.fillRect(0, h - b, w, b);
  g.fillStyle = rgba(150, 172, 208, 0.10); g.fillRect(0, 0, b, h); g.fillRect(w - b, 0, b, h);
  g.fillStyle = rgba(2, 4, 7, 0.6); g.fillRect(0, 0, w, b);
  void depth;
}
