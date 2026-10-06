import { useEffect, useState } from 'react';
import { useStore } from '../../App/store.js';
import { goToSection, irAReservar, scrollToChapterProgress } from '../../Scene/Transitions/navigation.js';
import { existingPlans } from '../../Data/Programs.js';

// CTA fijo CONTEXTUAL (V27 MAPA · paso 7). Una sola acción por pantalla, la que no duplica ninguna local:
//   home · reserva · footer            → oculto (HOME ya trae RESERVAR; Reserva ES la reserva; el footer trae sus tres caminos)
//   disciplinas                        → DESCUBRIR MI ENTRENAMIENTO → goToSection('explore') (la puerta DESCUBRIR). descubrir → VER EL MÉTODO → goToSection('method'). Nunca se bloquea por no haber elegido disciplina o modo.
//   método                             → RESERVAR EVALUACIÓN · 30 € → irAReservar() · entrenamiento → ELEGIR MI ENTRENAMIENTO (lleva al paso de elección de la máquina)
//   sobre Chen · FAQ                   → RESERVAR · 30 € → irAReservar() (en la última estación de Chen, que trae su CTA propio, lo retira global.css)
// El capítulo en pantalla lo marca el scroll; la FAQ no es un capítulo (cuelga después de Entrenamiento), así que se detecta por visibilidad.
const sesion = existingPlans.find((p) => p.id === '1-1');
const LOCAL_CTA = ['reserva']; // Reserva ES la reserva: sin CTA fijo redundante

export default function StickyCTA() {
  const chapter = useStore((s) => s.activeChapter);
  const enHome = useStore((s) => s.activeSection === 'home');
  const focus = useStore((s) => s.exploreFocus); // 'modos' (DESCUBRIR) | 'disciplinas' (DISCIPLINAS)
  // ENTRENAMIENTO: «Elegir mi entrenamiento» solo mientras no hay nada elegido; con un formato o una frecuencia ya aparecen los CTA propios de la placa (no se duplican).
  const eligiendo = useStore((s) => !s.selectedFormat && !s.selectedFrequency);
  const [enFaq, setEnFaq] = useState(false);

  // Al llegar al footer (que ya trae sus propias acciones) el CTA fijo y los controles ↑/↓ se retiran para no tapar enlaces ni formulario.
  useEffect(() => {
    const foot = document.querySelector('.foot');
    if (!foot || !('IntersectionObserver' in window)) return undefined;
    const root = document.documentElement;
    const io = new IntersectionObserver(([e]) => { root.dataset.overFoot = e.isIntersecting ? 'true' : 'false'; }, { rootMargin: '0px 0px -30% 0px' });
    io.observe(foot);
    return () => { io.disconnect(); delete root.dataset.overFoot; };
  }, []);

  // FAQ en pantalla (banda central del viewport): ahí manda RESERVAR aunque el capítulo activo siga siendo Entrenamiento.
  useEffect(() => {
    const faq = document.getElementById('faq');
    if (!faq || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setEnFaq(e.isIntersecting), { rootMargin: '-35% 0px -35% 0px' });
    io.observe(faq);
    return () => io.disconnect();
  }, []);

  if (enHome) return null;
  let accion = null;
  if (enFaq) accion = 'reservar';
  else if (LOCAL_CTA.includes(chapter)) accion = null;
  else if (chapter === 'character-select') accion = 'descubrir';
  else if (chapter === 'asesoria-lab') accion = 'evaluacion';
  else if (chapter === 'slot') accion = eligiendo ? 'entrenamiento' : null;
  else if (chapter === 'proof-chen') accion = 'reservar';
  if (!accion) return null;

  return (
    <div className="scta" data-chapter={chapter} data-cta={accion}>
      {/* El texto y el destino coinciden: desde DISCIPLINAS, «Descubrir mi entrenamiento» lleva a DESCUBRIR; ya dentro de DESCUBRIR, el paso siguiente es el MÉTODO. */}
      {accion === 'descubrir' && focus === 'disciplinas' && (
        <button type="button" className="scta__btn" onClick={() => goToSection('explore')}>Descubrir mi entrenamiento</button>
      )}
      {accion === 'descubrir' && focus !== 'disciplinas' && (
        <button type="button" className="scta__btn" onClick={() => goToSection('method')}>Ver el método</button>
      )}
      {accion === 'evaluacion' && (
        <button type="button" className="scta__btn" onClick={() => irAReservar()}>Reservar evaluación · {sesion.precio} €</button>
      )}
      {accion === 'entrenamiento' && (
        <button type="button" className="scta__btn" onClick={() => scrollToChapterProgress('slot', 0.5 / 4)}>Elegir mi entrenamiento</button>
      )}
      {accion === 'reservar' && (
        <button type="button" className="scta__btn" onClick={() => irAReservar()}>Reservar · {sesion.precio} €</button>
      )}
    </div>
  );
}
