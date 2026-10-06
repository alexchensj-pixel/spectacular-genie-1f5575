import { useMemo } from 'react';
import { BoxGeometry, EdgesGeometry, MeshStandardMaterial } from 'three';
import { CORRIDOR, PORTAL_Z } from './constants.js';
import { linesGeometry, rulerSegs } from './geo.js';

const DEPTH = 0.7;
const COL_W = 0.55;

// Un portal = pórtico estructural de acero (2 pilares en I + viga cajón + placas de anclaje) de la anchura del
// corredor. Es geometría real en el mundo: la cámara pasa físicamente entre ellos, no hay transición 2D.
function Portal({ z, steel, edgeGeo, rulerGeo }) {
  const { width, height } = CORRIDOR;
  const cx = width / 2 - COL_W / 2 - 0.02;
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * cx, 0, 0]}>
          {/* alma + alas del perfil en I */}
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow material={steel}>
            <boxGeometry args={[0.16, height, DEPTH]} />
          </mesh>
          {[-1, 1].map((f) => (
            <mesh key={f} position={[0, height / 2, f * (DEPTH / 2 - 0.05)]} castShadow receiveShadow material={steel}>
              <boxGeometry args={[COL_W, height, 0.1]} />
            </mesh>
          ))}
          {/* placa de anclaje */}
          <mesh position={[0, 0.06, 0]} receiveShadow material={steel}>
            <boxGeometry args={[COL_W + 0.4, 0.12, DEPTH + 0.4]} />
          </mesh>
          {/* regla vertical (referencia métrica) sobre la cara frontal del pilar */}
          <lineSegments geometry={rulerGeo} position={[-s * (COL_W / 2 + 0.02), 0, DEPTH / 2 + 0.02]} scale={[-s, 1, 1]}>
            <lineBasicMaterial color="#b9c8dc" transparent opacity={0.45} />
          </lineSegments>
        </group>
      ))}
      {/* viga superior */}
      <mesh position={[0, height - 0.25, 0]} castShadow receiveShadow material={steel}>
        <boxGeometry args={[width, 0.5, DEPTH]} />
      </mesh>
      <lineSegments geometry={edgeGeo} position={[0, height - 0.25, 0]}>
        <lineBasicMaterial color="#8fa3bd" transparent opacity={0.28} />
      </lineSegments>
    </group>
  );
}

export default function Portals() {
  const steel = useMemo(() => new MeshStandardMaterial({ color: '#4b535e', roughness: 0.5, metalness: 0.3 }), []);
  const edgeGeo = useMemo(() => new EdgesGeometry(new BoxGeometry(CORRIDOR.width, 0.5, DEPTH)), []);
  const rulerGeo = useMemo(() => linesGeometry(rulerSegs(CORRIDOR.height)), []);

  return (
    <group>
      {PORTAL_Z.map((z) => (
        <Portal key={z} z={z} steel={steel} edgeGeo={edgeGeo} rulerGeo={rulerGeo} />
      ))}
    </group>
  );
}
