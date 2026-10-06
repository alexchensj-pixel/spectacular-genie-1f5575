import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { CORRIDOR } from './constants.js';
import { linesGeometry } from './geo.js';

// Microtextura del suelo: grano fino DETERMINISTA (PRNG con semilla fija) generado en canvas. Sin assets.
function makeFloorTexture(anisotropy) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  let a = 0x9e3779b9;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < size * size; i++) {
    const v = 178 + Math.floor(rnd() * 50);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(CORRIDOR.width / 1.5, (CORRIDOR.zNear - CORRIDOR.zFar) / 1.5);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

const Y = 0.01; // las líneas flotan 1 cm sobre el suelo (evita z-fighting)

// Suelo técnico: acero/concreto oscuro, baja reflectividad, líneas métricas de 1 px cada 1 m siguiendo el eje Z.
export default function Corridor() {
  const gl = useThree((s) => s.gl);
  const { width, zNear, zFar } = CORRIDOR;
  const length = zNear - zFar;
  const zMid = (zNear + zFar) / 2;
  const half = width / 2;

  const floorTex = useMemo(() => makeFloorTexture(Math.min(8, gl.capabilities.getMaxAnisotropy())), [gl]);

  const { metric, center, seams, ticks } = useMemo(() => {
    const metric = [];
    for (let x = -half; x <= half; x += 1) if (x !== 0) metric.push([x, Y, zNear, x, Y, zFar]);
    const center = [[0, Y, zNear, 0, Y, zFar]];
    const seams = [];
    for (let z = zNear - 1; z >= zFar; z -= 5) seams.push([-half, Y, z, half, Y, z]);
    const ticks = [];
    for (let z = Math.floor(zNear); z >= zFar; z -= 1) {
      const major = z % 5 === 0;
      const h = major ? 0.3 : 0.09;
      ticks.push([-h, Y, z, h, Y, z]);
    }
    return {
      metric: linesGeometry(metric),
      center: linesGeometry(center),
      seams: linesGeometry(seams),
      ticks: linesGeometry(ticks),
    };
  }, [half, zNear, zFar]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, zMid]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color="#2b3037"
          map={floorTex}
          bumpMap={floorTex}
          bumpScale={0.6}
          roughness={0.86}
          metalness={0.12}
        />
      </mesh>

      <lineSegments geometry={metric}>
        <lineBasicMaterial color="#8fa3bd" transparent opacity={0.2} />
      </lineSegments>
      <lineSegments geometry={center}>
        <lineBasicMaterial color="#b9c8dc" transparent opacity={0.4} />
      </lineSegments>
      <lineSegments geometry={seams}>
        <lineBasicMaterial color="#8fa3bd" transparent opacity={0.1} />
      </lineSegments>
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color="#b9c8dc" transparent opacity={0.35} />
      </lineSegments>

      {/* bordes de plataforma: dos perfiles de acero a ras que definen la anchura sin cerrar el espacio */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (half + 0.06), 0.05, zMid]} receiveShadow>
          <boxGeometry args={[0.12, 0.1, length]} />
          <meshStandardMaterial color="#3a414a" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
