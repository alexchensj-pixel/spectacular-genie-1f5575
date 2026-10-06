import { useEffect, useRef } from 'react';
import { gsap } from '../../Scene/Transitions/gsap.js';
import { scrollState } from '../../Scene/Transitions/scrollState.js';
import { useStore } from '../../App/store.js';
import { chapterById, advisorySubstages, hero, seleccion, explore } from '../../Data/Content.js';
import { disciplines } from '../../Data/Disciplines.js';
import { salidas } from '../../Data/Slot.js';
import { goToSection } from '../../Scene/Transitions/navigation.js';

// HUD = CONTEXTO: dónde estoy (capítulo/sección en español) + progreso global. «SML» es el logo → home (no es un ítem del menú).
// DISCIPLINAS y DESCUBRIR comparten capítulo 3D: el rótulo sigue al foco. Los overlays (Empresas, Estudio) se rotulan como lo que son.
const brandStyle = { pointerEvents: 'auto', cursor: 'pointer', background: 'none', border: 0, padding: 0, margin: 0, font: 'inherit', letterSpacing: 'inherit', color: 'inherit' };

export default function HUD() {
  const active = useStore((s) => s.activeChapter);
  const substage = useStore((s) => s.substage);
  const debug = useStore((s) => s.debug);
  const focus = useStore((s) => s.exploreFocus);
  const discipline = useStore((s) => s.selectedDiscipline);
  const mode = useStore((s) => s.selectedTrainingMode);
  const format = useStore((s) => s.selectedFormat);
  const booking = useStore((s) => s.bookingState);
  const b2bOpen = useStore((s) => s.b2bOpen);
  const estudioOpen = useStore((s) => s.estudioOpen);
  const bar = useRef(null);
  const dbg = useRef(null);

  useEffect(() => {
    const tick = () => {
      bar.current.style.transform = `scaleX(${scrollState.global.toFixed(4)})`;
      if (dbg.current) {
        const c = scrollState.current;
        dbg.current.textContent = `${c.key}  p=${c.progress.toFixed(3)}  global=${scrollState.global.toFixed(3)}`;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  let where = chapterById[active].label;
  if (b2bOpen) where = 'Empresas';
  else if (estudioOpen) where = 'Estudio de combate';
  else if (active === 'character-select' && focus === 'disciplinas') where = 'Disciplinas';
  const overlay = b2bOpen || estudioOpen;
  // CONTEXTO (¿dónde estoy y qué estoy mirando?): el HUD solo REFLEJA el estado existente, no lo cambia. `hint` = descriptor fijo de la puerta (solo ≥ 700 px).
  //   DESCUBRIR → posibilidades de entrenamiento (+ la forma elegida)  ·  DISCIPLINAS → las disciplinas (+ la elegida)  ·  MÉTODO → su paso  ·  ENTRENAMIENTO → el formato  ·  RESERVA confirmada.
  const discName = disciplines.find((d) => d.id === discipline)?.name;
  const modeName = mode ? explore.modosTitulo[mode]?.split(' ')[0] : null;
  let sub = null;
  let hint = null;
  if (!overlay) {
    if (active === 'asesoria-lab') sub = advisorySubstages.find((s) => s.id === substage)?.label;
    else if (active === 'character-select' && focus === 'disciplinas') { sub = discName; hint = hero.disciplinasLinea; }
    else if (active === 'character-select') { sub = [modeName, discName].filter(Boolean).join(' · ') || null; hint = seleccion.pregunta; }
    else if (active === 'slot') sub = salidas.find((o) => o.id === format)?.nombre ?? null;
    else if (active === 'reserva' && booking === 'confirmed') sub = 'Confirmada';
  }
  if (!overlay && active === 'entrada') where = null; // HOME: el hero manda; SML ya es «inicio»

  return (
    <header className="hud">
      <button type="button" className="hud__brand" style={brandStyle} aria-label="Striking Motion Lab — inicio" onClick={() => goToSection('home')}>SML</button>
      {where && (
        <span className="hud__where" data-focus={active === 'character-select' && !overlay ? focus : undefined} aria-live="polite">
          <b>{where}</b>
          {sub ? <span className="hud__sub"> · {sub}</span> : hint ? <span className="hud__sub hud__hint"> · {hint}</span> : null}
        </span>
      )}
      {debug && <span ref={dbg} className="hud__debug" />}
      <span className="hud__bar"><i ref={bar} /></span>
    </header>
  );
}
