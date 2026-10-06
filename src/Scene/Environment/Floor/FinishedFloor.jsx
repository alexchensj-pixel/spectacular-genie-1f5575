import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { groove, grain, rgba, vGrad, rng } from '../Room/roomPaint.js';

// Suelo pulido de las estancias que no tienen sala propia (04 · Entrenamiento y 06 · Reserva). Es el MISMO material que ya cubre
// el archivo de la 05 (Archive/archivePaint.js#paintArchiveFloor): resina grafito con baldosas de 2 × 2 m, juntas sobre las líneas
// pares de la retícula global (el grupo vive en un z par, así que coinciden), charco de luz y bordes que se funden a transparente.
// Sin luces nuevas ni sombras dinámicas (sombreado horneado, como 03 y 05). Solo superficie: no mueve ni añade geometría de escena.
const Y = 0.004; // 4 mm sobre la retícula global (la misma cota que el suelo del archivo)

function paintFloor(g, w, h, { ppm, size, poolZ, seed }) {
  const [FW, FD] = size;
  const HW = FW / 2, HD = FD / 2;
  const X = (x) => (x + HW) * ppm;
  const Z = (z) => (z + HD) * ppm;
  const sp = Math.max(1.5, 0.045 * ppm);

  g.fillStyle = vGrad(g, h, [[0, rgba(8, 9, 12)], [0.4, rgba(15, 18, 23)], [0.58, rgba(17, 20, 26)], [0.78, rgba(13, 15, 20)], [1, rgba(8, 10, 13)]]);
  g.fillRect(0, 0, w, h);

  // charco de luz ancho y bajo, centrado en el elemento de la escena
  g.save();
  g.translate(X(0), Z(poolZ)); g.scale(1.6, 1);
  const rad = 8 * ppm;
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  pool.addColorStop(0, rgba(112, 128, 156, 0.14)); pool.addColorStop(0.5, rgba(112, 128, 156, 0.05)); pool.addColorStop(1, rgba(112, 128, 156, 0));
  g.fillStyle = pool; g.fillRect(-rad, -rad, 2 * rad, 2 * rad);
  g.restore();

  // tono por baldosa (determinista)
  const r = rng(seed);
  for (let x = -HW; x < HW; x += 2) for (let z = -HD; z < HD; z += 2) {
    const v = (r() - 0.5) * 0.05;
    g.fillStyle = v > 0 ? rgba(200, 215, 240, v) : rgba(0, 0, 0, -v);
    g.fillRect(X(x), Z(z), 2 * ppm, 2 * ppm);
  }

  // juntas: las líneas pares de la retícula global
  for (let x = -HW + 2; x < HW; x += 2) groove(g, X(x), 0, X(x), h, sp, { dark: 0.7, lip: 0.07 });
  for (let z = -HD + 2; z < HD; z += 2) groove(g, 0, Z(z), w, Z(z), sp, { dark: 0.7, lip: 0.07, side: -1 });
  // eje central: la misma referencia de medida que el corredor y la sala 03
  g.strokeStyle = rgba(150, 170, 200, 0.22); g.lineWidth = Math.max(1.5, 0.025 * ppm);
  g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), h); g.stroke();

  grain(g, w, h, { amount: 3, col: 2, seed: seed + 11 });

  // bordes → transparente (la retícula global sigue fuera de la losa)
  g.globalCompositeOperation = 'destination-in';
  const fade = (grad) => { g.fillStyle = grad; g.fillRect(0, 0, w, h); };
  const hg = g.createLinearGradient(0, 0, w, 0);
  [[0, 0], [0.2, 1], [0.8, 1], [1, 0]].forEach(([o, a]) => hg.addColorStop(o, `rgba(0,0,0,${a})`));
  fade(hg);
  fade(vGrad(g, h, [[0, 'rgba(0,0,0,0)'], [0.2, 'rgba(0,0,0,1)'], [0.8, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]));
  g.globalCompositeOperation = 'source-over';
}

export default function FinishedFloor({ gain, size = [40, 36], poolZ = 1, seed = 505 }) {
  const gl = useThree((s) => s.gl);
  const root = useRef();

  const res = useMemo(() => {
    const ppm = 20;
    const c = document.createElement('canvas');
    c.width = size[0] * ppm; c.height = size[1] * ppm;
    paintFloor(c.getContext('2d'), c.width, c.height, { ppm, size, poolZ, seed });
    const map = new CanvasTexture(c);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const mat = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    return { map, mat, geo: new PlaneGeometry(size[0], size[1]) };
  }, [gl, size[0], size[1], poolZ, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { res.map.dispose(); res.mat.dispose(); res.geo.dispose(); }, [res]);

  useFrame(() => {
    const g = gain();
    if (!root.current) return;
    root.current.visible = g > 0.01;
    if (root.current.visible) res.mat.opacity = g;
  });

  return (
    <mesh ref={root} visible={false} position={[0, Y, 0]} rotation-x={-Math.PI / 2} geometry={res.geo} material={res.mat} renderOrder={-2} />
  );
}
