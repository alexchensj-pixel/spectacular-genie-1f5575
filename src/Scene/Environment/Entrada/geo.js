import { BufferGeometry, Float32BufferAttribute } from 'three';

// Construye un BufferGeometry de segmentos a partir de [[x0,y0,z0,x1,y1,z1], ...]
export function linesGeometry(segs) {
  const p = [];
  for (const s of segs) p.push(s[0], s[1], s[2], s[3], s[4], s[5]);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  return g;
}

// Circunferencia en el plano XZ (suelo) como segmentos.
export function ringSegs(out, cx, y, cz, r, n = 96) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    out.push([cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r, cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r]);
  }
}

export const smoothstep = (x, a, b) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// Regla vertical con marcas cada 0.5 m (mayor cada 1 m), a partir de y=0.5 hasta height-0.5. Mismo patrón
// que ya usaba Portals.jsx para las reglas de sus pilares — extraído aquí para reutilizarlo tal cual
// en la transición Entrada → Character Select (AthleteSlots.jsx), sin diseñar nada nuevo.
export function rulerSegs(height, majorLen = 0.32, minorLen = 0.16) {
  const segs = [];
  for (let y = 0.5; y < height - 0.5; y += 0.5) {
    const major = Math.abs(y % 1) < 1e-6;
    segs.push([0, y, 0, major ? majorLen : minorLen, y, 0]);
  }
  return segs;
}
