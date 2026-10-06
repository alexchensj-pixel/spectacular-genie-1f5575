import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { isCoarsePointer } from '../../Transitions/scrollState.js';
import { FOG_START_Z, CORRIDOR } from './constants.js';
import { smoothstep } from './geo.js';

function makeHazeTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// Niebla volumétrica fría: capas de bruma apiladas en profundidad desde Z = -15 hasta el final del corredor.
// La densidad crece con la profundidad (capas más opacas cuanto más lejos) → el mundo se disuelve, no se corta.
// Cada capa se aclara al acercarse la cámara para no "pasar por un cartel". Estática y determinista.
export default function Haze() {
  const N = isCoarsePointer ? 8 : 12;
  const tex = useMemo(makeHazeTexture, []);
  const layers = useMemo(() => {
    const zEnd = CORRIDOR.zFar + 2;
    return Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1);
      return {
        z: FOG_START_Z + (zEnd - FOG_START_Z) * t,
        base: 0.02 + 0.045 * t,
        mat: new MeshBasicMaterial({ map: tex, color: '#7d93b0', transparent: true, opacity: 0, depthWrite: false, fog: false }),
      };
    });
  }, [N, tex]);

  const mats = useRef(layers);
  useFrame(({ camera }) => {
    for (const l of mats.current) {
      const d = camera.position.z - l.z;
      l.mat.opacity = l.base * smoothstep(d, 2, 9);
    }
  });

  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, 3, l.z]} material={l.mat} renderOrder={i}>
          <planeGeometry args={[20, 9]} />
        </mesh>
      ))}
    </group>
  );
}
