import { useEffect, useRef } from 'react';
import { entrenamientoMedia } from '../../Data/Media.js';
import { prefersReducedMotion } from '../../Scene/Transitions/scrollState.js';

// Material real de ENTRENAMIENTO con una función concreta cada pieza (no es una galería):
//   sala     → «¿Entrenan de verdad?»      → cómo es una sesión real
//   exterior → «¿También entrenan fuera?»  → el entrenamiento se adapta al espacio
// Clips de 3–5 s: mudos, en bucle, sin controles; solo se reproducen mientras están en pantalla y no se descargan hasta entonces.
// Si no hay archivos en las carpetas Assets de entrenamiento no se pinta nada.
function Clip({ m }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    v.muted = true; // iOS/Safari: el autoplay solo se permite en mudo
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} className="sx__practicaEl" src={m.src} poster={m.poster} muted loop playsInline preload="none" aria-label={m.alt} />;
}

export default function EnPractica() {
  const { sala, exterior } = entrenamientoMedia;
  const clips = [sala, exterior].filter(Boolean);
  if (!clips.length) return null;
  return (
    <div className="sx__practica" data-n={clips.length}>
      {clips.map((m) => (
        <figure key={m.src}>
          <Clip m={m} />
          <figcaption>{m.pie}</figcaption>
        </figure>
      ))}
    </div>
  );
}
