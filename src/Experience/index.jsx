import { Fragment } from 'react';
import { chapters } from '../Data/Content.js';
import Threshold from '../Scene/Transitions/Threshold.jsx';
import Entrada from './Entrada/Entrada.jsx';
import Bridge from './Entrada/Bridge.jsx';
import { REVEAL_START } from '../Scene/Transitions/scrollState.js';
import Explore from './Explore/Explore.jsx';
import AsesoriaLab from './AsesoriaLab/AsesoriaLab.jsx';
import Slot from './Slot/Slot.jsx';
import ProofChen from './ProofChen/ProofChen.jsx';
import Reserva from './Reserva/Reserva.jsx';
import Faq from './Faq/Faq.jsx';

const views = {
  'entrada': Entrada,
  'character-select': Explore, // sección EXPLORE (V22): Character Select + Disciplines. El Bridge NO está aquí: vive en el umbral HOME → EXPLORE
  'asesoria-lab': AsesoriaLab,
  'slot': Slot,
  'proof-chen': ProofChen,
  'reserva': Reserva,
};

// Secuencia: experiencia → umbral → experiencia → umbral ... Cada umbral es un tramo de scroll con sentido narrativo.
export default function Experience() {
  return (
    <main className="experience">
      {chapters.map((c, i) => {
        const View = views[c.id];
        const next = chapters[i + 1];
        return (
          <Fragment key={c.id}>
            <View />
            {/* FAQ: justo después de 04 Entrenamiento y antes del umbral hacia 05 Sobre Chen. No es un capítulo. */}
            {c.id === 'slot' && <Faq />}
            {/* HOME → EXPLORE aloja el BRIDGE (cuerpo → combate → mapa → striking → disciplinas): una escena propia, previa a EXPLORE.
                Dentro del umbral (Threshold.jsx, 180vh) Bridge.jsx lee el progreso y BridgeHall.jsx pone el recinto 3D. HUD y sección siguen
                en HOME hasta que el Bridge sale (activeFrom = REVEAL_START); entonces los luchadores se revelan y empieza EXPLORE. */}
            {next && (
              <Threshold
                from={c.id}
                to={next.id}
                start={c.id === 'slot' ? 'top top' : undefined}
                activeFrom={c.id === 'entrada' ? REVEAL_START : undefined}
              >
                {c.id === 'entrada' && <Bridge />}
              </Threshold>
            )}
          </Fragment>
        );
      })}
    </main>
  );
}
