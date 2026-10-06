// Pintura 2D de los grabados de la máquina (canvas → textura), igual que roomPaint.js: iconos y numeración de cada
// módulo, rótulo del frente, chevron de lectura y sombra de contacto. Solo líneas finas grises, sin color.
const ink = (a = 1) => `rgba(214,220,230,${a})`;
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
const SANS = "'Inter Tight', 'Helvetica Neue', Arial, sans-serif";

function spaced(g, text, cx, y, gap) {
  const chars = [...text];
  const ws = chars.map((c) => g.measureText(c).width);
  let x = cx - (ws.reduce((a, b) => a + b, 0) + gap * (chars.length - 1)) / 2;
  g.textAlign = 'left';
  chars.forEach((c, i) => { g.fillText(c, x, y); x += ws[i] + gap; });
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Iconos sobre una caja de lado 1 centrada en 0 (se escalan con s)
function icon(g, kind, cx, cy, s) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.strokeStyle = ink(0.88); g.fillStyle = ink(0.88);
  g.lineWidth = 0.075; g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'target') {
    g.beginPath(); g.arc(0, 0, 0.3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, 0.055, 0, Math.PI * 2); g.fill();
    for (const [x0, y0, x1, y1] of [[0, -0.5, 0, -0.18], [0, 0.18, 0, 0.5], [-0.5, 0, -0.18, 0], [0.18, 0, 0.5, 0]]) {
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
  } else if (kind === 'pulse') {
    g.beginPath();
    [[-0.5, 0.02], [-0.2, 0.02], [-0.1, -0.32], [0.08, 0.32], [0.18, 0.02], [0.5, 0.02]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  } else if (kind === 'grid') {
    for (const [x, y] of [[-0.44, -0.44], [0.06, -0.44], [-0.44, 0.06], [0.06, 0.06]]) { rr(g, x, y, 0.38, 0.38, 0.06); g.stroke(); }
  } else if (kind === 'person') {
    g.beginPath(); g.arc(0, -0.2, 0.17, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0.5, 0.36, Math.PI, Math.PI * 2); g.stroke();
  } else if (kind === 'pin') {
    g.beginPath(); g.arc(0, -0.14, 0.3, Math.PI * 0.78, Math.PI * 0.22, false); g.lineTo(0, 0.5); g.closePath(); g.stroke();
    g.beginPath(); g.arc(0, -0.14, 0.09, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

// Ventana frontal de cada cabeza: icono arriba, número debajo, marco casi invisible (256 × 256)
export function paintModulePlate(g, w, h, { icon: kind, num }) {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = ink(0.09); g.lineWidth = 2; rr(g, 8, 8, w - 16, h - 16, 10); g.stroke();
  icon(g, kind, w / 2, h * 0.36, w * 0.28);
  g.fillStyle = ink(0.8); g.font = `300 ${Math.round(h * 0.15)}px ${MONO}`; g.textBaseline = 'middle';
  spaced(g, num, w / 2, h * 0.72, 5);
}

// Rótulo de la placa frontal del bastidor (1024 × 128)
export function paintLabel(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = ink(0.7); g.font = `300 ${Math.round(h * 0.24)}px ${SANS}`; g.textBaseline = 'middle';
  spaced(g, 'STRIKING MOTION LAB', w / 2, h * 0.42, h * 0.11);
  g.strokeStyle = ink(0.75); g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2 - 22, h * 0.8); g.lineTo(w / 2 + 22, h * 0.8); g.stroke();
}

// Chevron de lectura bajo el tambor (64 × 64)
export function paintChevron(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = ink(0.85); g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(w * 0.28, h * 0.4); g.lineTo(w * 0.5, h * 0.62); g.lineTo(w * 0.72, h * 0.4); g.stroke();
}

// Sombra de contacto sobre la cubierta de la plataforma (no hay luces ni sombras dinámicas en la escena: va horneada)
export function paintContact(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.save();
  g.translate(w / 2, h / 2); g.scale(1, h / w);
  const l = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  l.addColorStop(0, 'rgba(0,0,0,0.9)'); l.addColorStop(0.62, 'rgba(0,0,0,0.6)'); l.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = l; g.beginPath(); g.arc(0, 0, w / 2, 0, Math.PI * 2); g.fill();
  g.restore();
}
