import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BoxGeometry, CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { getArchiveGain } from '../Machine/machineGain.js';
import { rng } from '../Room/roomPaint.js';
import { ARCHIVE, FLOOR, slabX } from './archiveSpec.js';
import { paintSlabSide, paintSlabEnd, paintArchiveFloor, paintStreak } from './archivePaint.js';

// ESCENA 05 · SOBRE CHEN — los nueve volúmenes que YA estaban dibujados, desarrollados con material, relieve, luz y suelo.
// Las aristas de WireBox (blockouts.jsx#Archive) siguen exactamente donde estaban: aquí solo se les da cuerpo POR DENTRO
// de cada volumen (2 mm de holgura + polygonOffset), así cada línea original queda como la arista exterior. Misma
// técnica que la sala 03 (Room/RoomArchitecture.jsx): SOMBREADO HORNEADO en texturas, cero luces nuevas, cero sombras
// dinámicas. Lo único vivo es la intensidad: la estación activa (los mismos pesos `weights` que mueven las líneas) sube el
// brillo de sus volúmenes, de su canto luminoso y del reflejo en el suelo. Aparece y se apaga con getArchiveGain().
const INSET = 0.002;
const STREAK = { w: 0.5, len: 3.5 }; // reflejo del canto en el suelo (m)

export default function ArchiveArchitecture({ weights }) {
  const root = useRef();
  const gl = useThree((s) => s.gl);
  const [SW, SH, SD] = ARCHIVE.size;

  const res = useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const tex = (w, h, paint, repeatAniso = true) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      paint(c.getContext('2d'), w, h);
      const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
      if (repeatAniso) t.anisotropy = aniso;
      return t;
    };
    const PPM = { slab: 96, floor: 20 };
    const tx = {
      // BoxGeometry invierte la U entre +x y −x: el canto delantero (+z) cae a la izquierda en +x y a la derecha en −x
      sideP: tex(SD * PPM.slab, SH * PPM.slab, (g, w, h) => paintSlabSide(g, w, h, { ppm: PPM.slab, frontAtLeft: true, seed: 3 })),
      sideN: tex(SD * PPM.slab, SH * PPM.slab, (g, w, h) => paintSlabSide(g, w, h, { ppm: PPM.slab, frontAtLeft: false, seed: 7 })),
      end: tex(48, 256, paintSlabEnd, false),
      floor: tex(FLOOR.size[0] * PPM.floor, FLOOR.size[1] * PPM.floor, (g, w, h) => paintArchiveFloor(g, w, h, { ppm: PPM.floor })),
      streak: tex(64, 256, paintStreak, false),
    };
    const po = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    const dark = new MeshBasicMaterial({ color: '#0d1016', ...po });
    const floor = new MeshBasicMaterial({ map: tx.floor, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

    // Variación de tono entre volúmenes (determinista): no son nueve copias idénticas.
    const r = rng(41);
    const slabs = Array.from({ length: ARCHIVE.n }, () => {
      const tint = 0.9 + r() * 0.18;
      return {
        tint,
        px: new MeshBasicMaterial({ map: tx.sideP, ...po }),
        nx: new MeshBasicMaterial({ map: tx.sideN, ...po }),
        end: new MeshBasicMaterial({ map: tx.end, ...po }),
        streak: new MeshBasicMaterial({ map: tx.streak, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }),
      };
    });
    // Orden de caras de BoxGeometry: +x, −x, +y, −y, +z, −z
    const mats = slabs.map((s) => [s.px, s.nx, dark, dark, s.end, dark]);
    const body = new BoxGeometry(SW - 2 * INSET, SH - 2 * INSET, SD - 2 * INSET);
    const floorGeo = new PlaneGeometry(FLOOR.size[0], FLOOR.size[1]);
    const streakGeo = new PlaneGeometry(STREAK.w, STREAK.len);
    return { tx, dark, floor, slabs, mats, body, floorGeo, streakGeo };
  }, [gl, SW, SH, SD]);

  useEffect(() => () => {
    res.dark.dispose(); res.floor.dispose();
    res.slabs.forEach((s) => { s.px.dispose(); s.nx.dispose(); s.end.dispose(); s.streak.dispose(); });
    Object.values(res.tx).forEach((t) => t.dispose());
    res.body.dispose(); res.floorGeo.dispose(); res.streakGeo.dispose();
  }, [res]);

  useFrame(() => {
    const g = getArchiveGain();
    if (!root.current) return;
    root.current.visible = g > 0.01;
    if (!root.current.visible) return;
    const w = weights.current;
    res.dark.color.setScalar(g);
    res.floor.opacity = g;
    res.slabs.forEach((s, i) => {
      const k = g * (0.6 + 0.55 * w[i]) * s.tint; // cuerpo: en reposo apagado, enfocado más claro
      s.px.color.setScalar(k);
      s.nx.color.setScalar(k);
      s.end.color.setScalar(g * (0.8 + 0.4 * w[i]));  // rendija del canto: tenue siempre, más viva al enfocar (la cara es hormigón oscuro)
      s.streak.opacity = g * (0.15 + 0.85 * w[i]) * 0.2; // reflejo en el suelo
    });
  });

  return (
    <group ref={root} visible={false}>
      {/* Suelo pulido sobre la retícula global; renderOrder bajo para ir antes que la superficie oscura (−1) y los reflejos */}
      <mesh position={[0, FLOOR.y, 0]} rotation-x={-Math.PI / 2} geometry={res.floorGeo} material={res.floor} renderOrder={-2} />
      {res.slabs.map((s, i) => (
        <group key={i} position={[slabX(i), 0, 0]}>
          <mesh position={[0, ARCHIVE.y, 0]} geometry={res.body} material={res.mats[i]} />
          {/* Reflejo del canto luminoso: nace en el frente del volumen (z = +1,5) y se alarga hacia la cámara */}
          <mesh position={[0, FLOOR.y + 0.004, SD / 2 + STREAK.len / 2]} rotation-x={-Math.PI / 2} geometry={res.streakGeo} material={s.streak} renderOrder={2} />
        </group>
      ))}
    </group>
  );
}
