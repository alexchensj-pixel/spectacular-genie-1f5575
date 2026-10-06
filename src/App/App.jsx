import SceneCanvas from '../Scene/SceneCanvas.jsx';
import TransitionVeil from '../Scene/Transitions/TransitionVeil.jsx';
import Experience from '../Experience/index.jsx';
import Navigation from '../UI/Navigation/Navigation.jsx';
import HUD from '../UI/HUD/HUD.jsx';
import Controls from '../UI/Controls/Controls.jsx';
import Footer from '../UI/Footer/Footer.jsx';
import StickyCTA from '../UI/StickyCTA/StickyCTA.jsx';
import B2B from '../Experience/B2B/B2B.jsx';
import Estudio from '../Experience/Estudio/Estudio.jsx';

// Capas: canvas 3D fijo (mundo) → DOM de las experiencias (scroll) → velo de transición → HUD/UI.
// La foto integrada (heroLab / PhotoBackdrop) ya NO vive aquí como fondo global: pertenece solo a la
// Escena 01 y se monta desde Experience/Entrada/Entrada.jsx.
export default function App() {
  return (
    <>
      <SceneCanvas />
      <Experience />
      <Footer />
      <TransitionVeil />
      <HUD />
      <Navigation />
      <Controls />
      <StickyCTA />
      <B2B />
      <Estudio />
    </>
  );
}
