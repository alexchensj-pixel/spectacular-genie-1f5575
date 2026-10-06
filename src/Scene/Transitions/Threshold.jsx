import { useLayoutEffect, useRef } from 'react';
import { ScrollTrigger } from './gsap.js';
import { setSegment } from './scrollState.js';
import { useStore } from '../../App/store.js';

// Tramo de scroll ENTRE dos capítulos. Su progreso mueve la cámara (leave → enter) y el velo.
//
// activeChapter (el número que resalta el HUD y el índice de navegación) se marcaba SOLO desde
// useChapter.jsx, cuando el elemento del capítulo DESTINO cruza el 50% del viewport — un punto muy
// posterior al final de este umbral. Resultado: la Escena 02 (vitrinas + luchadores, ver RosterGroup.jsx)
// podía llegar a verse completamente montada mientras el HUD seguía marcando "01 · Entrada" — desalineados.
// Se actualiza aquí también, atado al MISMO progreso real de este umbral (progress > 0 = ya se ha empezado
// a salir de `from`, mismo instante en que getCharactersReveal() empieza a subir desde 0): en cuanto arranca
// la transición, el HUD ya apunta al capítulo de llegada. Reversible: al subir el scroll de vuelta al inicio
// del umbral (progress === 0), vuelve a marcar `from`.
//  activeFrom: progreso (0..1) del umbral a partir del cual el HUD/sección pasan a `to`. Por defecto 0 (en cuanto empieza). El umbral
//  HOME → EXPLORE lo retrasa hasta REVEAL_START: mientras dura el Bridge seguimos en HOME (el Bridge es su epílogo, no EXPLORE).
//  start: cuándo arranca el progreso del umbral (por defecto, en cuanto asoma por abajo). El umbral 04→05 lo retrasa
//  hasta 'top top' porque la FAQ (opaca) va justo antes: así el velo y el viaje de cámara no ocurren detrás ni encima de ella.
export default function Threshold({ from, to, start = 'top bottom', activeFrom = 0, children }) {
  const ref = useRef(null);
  const key = `${from}>${to}`;

  useLayoutEffect(() => {
    const update = (self) => {
      setSegment(key, self.progress);
      useStore.getState().setActiveChapter(self.progress > activeFrom ? to : from);
    };
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start,
      end: 'bottom top',
      onUpdate: update,
      onRefresh: update,
    });
    return () => st.kill();
  }, [key, from, to, start, activeFrom]);

  return (
    <div ref={ref} className="threshold" data-threshold={key} aria-hidden="true">
      {children}
    </div>
  );
}
