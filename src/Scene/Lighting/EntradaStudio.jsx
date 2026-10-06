import { useMemo } from 'react';
import { Object3D } from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { isCoarsePointer } from '../Transitions/scrollState.js';
import { LIGHT, SOFTBOX } from '../Environment/Entrada/constants.js';

RectAreaLightUniformsLib.init(); // necesario para que RectAreaLight ilumine materiales estándar

// Iluminación de estudio industrial de la Escena 01: un softbox superior (4 m × 1 m · Y 5.5 · Z -8 · 4200 K)
// y un relleno frío frontal. Sobria: sin colores saturados, sin parpadeos, sin neón. Todo estático.
//  - RectAreaLight → lectura de materiales y brillo suave en acero.
//  - SpotLight     → mismo emisor, solo para sombras controladas (desactivadas en táctil por rendimiento).
export default function EntradaStudio() {
  const [x, y, z] = SOFTBOX.pos;
  const [w, h] = SOFTBOX.size;
  const target = useMemo(() => new Object3D(), []);

  return (
    <group>
      <rectAreaLight position={[x, y - 0.08, z]} rotation={[-Math.PI / 2, 0, 0]} width={w} height={h} intensity={LIGHT.area} color={SOFTBOX.color} />

      <spotLight
        position={[x, y - 0.1, z]}
        target={target}
        angle={0.8}
        penumbra={1}
        intensity={LIGHT.spot}
        color={SOFTBOX.color}
        distance={16}
        decay={2}
        castShadow={!isCoarsePointer}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
      />
      <primitive object={target} position={[x, 0, z]} />

      {/* relleno frontal frío: hace legible el frente del título, que el softbox (cenital) roza sin iluminar */}
      <pointLight position={[0, 3.2, -3.5]} intensity={LIGHT.fill} color="#a9bbd4" distance={14} decay={2} />

      {/* el propio softbox: solo el cuerpo de acero. El panel emisivo (franja/pieza naranja, plano con
          meshBasicMaterial sin tonemap) se retiró por dirección de arte: la luz cálida la siguen aportando
          el rectAreaLight y el spotLight de arriba, pero ya no hay una pieza geométrica naranja visible. */}
      <mesh position={[x, y + 0.13, z]}>
        <boxGeometry args={[w + 0.16, 0.34, h + 0.16]} />
        <meshStandardMaterial color="#2a3038" roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  );
}
