import Corridor from './Corridor.jsx';
import Portals from './Portals.jsx';
import TechMarks from './TechMarks.jsx';
import Haze from './Haze.jsx';
import AthleteSlots from './AthleteSlots.jsx';
import TransitionFrame from './TransitionFrame.jsx';
import { LIGHT } from './constants.js';

// Escena 01 — Entrada. Todo en coordenadas de mundo (el grupo padre del capítulo está en Z = 0).
// Corredor industrial → portales → lenguaje técnico → niebla → huecos de la Escena 02.
// La luz (softbox) vive en Scene/Lighting/EntradaStudio.jsx.
// TransitionFrame (ventana única BOXEO|K1|MUAY THAI) va ANTES que AthleteSlots (huecos que luego se
// reparten en vitrinas): mismo orden que su aparición en el umbral 01→02.
export default function EntradaWorld() {
  return (
    <group>
      <Corridor />
      <Portals />
      {/* Contraluz lateral rasante (corto alcance). Antes colgaba del título 3D; se conserva con su posición
          de mundo exacta ([6, 3.3, -5]) para que la iluminación del corredor no cambie. */}
      <pointLight position={[6, 3.3, -5]} intensity={LIGHT.rim} color="#eef3ff" distance={9} decay={2} />
      <TechMarks />
      <Haze />
      <TransitionFrame />
      <AthleteSlots />
    </group>
  );
}
