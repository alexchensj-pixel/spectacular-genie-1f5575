import { useRef } from 'react';
import { chapterById } from '../Data/Content.js';
import { useChapter } from './useChapter.js';

// Contenedor de cada experiencia: sección alta + "stage" sticky (una pantalla fija mientras el scroll avanza).
// `flow` (opcional, solo lo usa Method en móvil): el capítulo mide lo que mida su contenido y el stage no se fija; el progreso
// de scroll (cámara 3D) se sigue calculando sobre la altura real. El resto de capítulos no lo pasan: sin cambios.
export default function Chapter({ id, build, onProgress, className = '', flow = false, children }) {
  const ref = useRef(null);
  useChapter(id, ref, build, onProgress);
  return (
    <section ref={ref} id={id} data-chapter={id} data-scene={id} className={`chapter ${flow ? 'chapter--flow ' : ''}${className}`} style={flow ? undefined : { height: `${chapterById[id].vh}vh` }}>
      <div className="stage">{children}</div>
    </section>
  );
}
