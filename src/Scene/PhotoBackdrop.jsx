import { useEffect, useRef } from 'react';
import { gsap } from './Transitions/gsap.js';
import { scrollState, getIntroBackdropOpacity, prefersReducedMotion } from './Transitions/scrollState.js';
import { image } from '../Data/Media.js';

// Foto del laboratorio (heroLab): pertenece ÚNICAMENTE a la Escena 01 — Entrada (por eso se monta desde
// Entrada.jsx, no desde App.jsx). Va entre el canvas 3D y el DOM, mezclada con `screen` (ver .photo en
// global.css): mientras la Entrada existe en pantalla, las líneas del esqueleto siguen visibles por encima.
// Se apaga en el MISMO tramo de scroll con el que ya termina de salir la narrativa de la Entrada (ver
// Entrada.jsx, build(): 0.85 a 1) — así todo lo que es "Entrada" desaparece a la vez, como una sola cosa,
// hasta 0 exacto (no un mínimo residual). A 0 se le añade además `visibility:hidden`, igual que el
// autoAlpha que ya usa la narrativa: deja de pintarse del todo, no queda como capa fantasma detrás de
// Character Select ni de ninguna escena posterior. Reversible: si se sube el scroll, reaparece igual.
export default function PhotoBackdrop() {
  const rootRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    let lastGlobal = -1;
    const tick = () => {
      const root = rootRef.current;
      if (!root) return;
      const opacity = getIntroBackdropOpacity();
      root.style.opacity = opacity.toFixed(3);
      root.style.visibility = opacity > 0.002 ? 'visible' : 'hidden';

      if (prefersReducedMotion || !imgRef.current) return;
      const g = scrollState.global;
      if (Math.abs(g - lastGlobal) < 0.0005) return;
      lastGlobal = g;
      imgRef.current.style.transform = `scale(${(1.03 + g * 0.45).toFixed(4)})`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div ref={rootRef} className="photo" aria-hidden="true">
      <img ref={imgRef} className="photo__img" src={image.heroLab} alt="" decoding="async" />
      <div className="photo__shade" />
    </div>
  );
}
