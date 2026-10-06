import { Canvas } from '@react-three/fiber';
import CameraRig from './Camera/index.jsx';
import Lighting from './Lighting/index.jsx';
import Environment from './Environment/index.jsx';
import { LENSES } from './Camera/waypoints.js';

// Un único Canvas persistente: el mundo 3D no se recarga entre experiencias, la cámara viaja por él.
export default function SceneCanvas() {
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: LENSES.nav.fov, near: 0.1, far: 220, position: [0, 1.6, 0] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050608']} />
        <fog attach="fog" args={['#050608', 12, 75]} />
        <CameraRig />
        <Lighting />
        <Environment />
      </Canvas>
    </div>
  );
}
