import { anchorZ } from '../Camera/waypoints.js';
import { chapters } from '../../Data/Content.js';
import { Pillars, Room, Reels, Archive, Door } from './blockouts.jsx';
import EntradaWorld from './Entrada/EntradaWorld.jsx';
import BridgeHall from './Bridge/BridgeHall.jsx';
// BridgeHall (Environment/Bridge/) es el recinto 3D del Bridge (Tyson / McGregor, foto de la nave). No es un capítulo: se monta una sola vez,
// en coordenadas de mundo, y solo es visible durante el tramo del umbral HOME → EXPLORE que ocupa el Bridge (ver su useFrame).

const blockouts = {
  'entrada': EntradaWorld, // Escena 01 real (corredor, portales, título 3D…) — ver Environment/Entrada/
  'character-select': Pillars,
  'asesoria-lab': Room,
  'slot': Reels,
  'proof-chen': Archive,
  'reserva': Door,
};

// Suelo/retícula globales de los blockouts 02–06. Empiezan DESPUÉS del corredor de la Escena 01 (Z ≤ -50),
// que trae su propio suelo técnico: así la retícula 2 m × 2 m no se superpone a las líneas métricas del corredor.
export default function Environment() {
  return (
    <>
      <gridHelper args={[300, 150, '#1b2233', '#0e1320']} position={[0, 0, -200]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -200]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#07090d" roughness={1} />
      </mesh>
      <BridgeHall transitionOnly />
      {chapters.map((c, i) => {
        const B = blockouts[c.id];
        return (
          <group key={c.id} position={[0, 0, anchorZ(i)]}>
            <B />
          </group>
        );
      })}
    </>
  );
}
