import { useEffect, useRef } from 'react';
import { gsap } from './gsap.js';
import { scrollState } from './scrollState.js';
import { thresholdLabels } from '../../Data/Content.js';

// Umbrales que conservan continuidad espacial: la cámara viaja por el mundo SIN velo (ni pantalla negra ni crossfade).
// 03→04→05→06 también: es un único recorrido (Camera/waypoints.js#thresholdCamera); la sala se apaga y la siguiente se enciende en el propio 3D.
const NO_VEIL = new Set(['entrada>character-select', 'asesoria-lab>slot', 'slot>proof-chen', 'proof-chen>reserva']);

// Capa DOM que cubre el cruce entre mundos. Se actualiza en el ticker de GSAP (sin renders de React).
export default function TransitionVeil() {
  const root = useRef(null);
  const label = useRef(null);
  const bar = useRef(null);

  useEffect(() => {
    const tick = () => {
      const { key, progress } = scrollState.current;
      const isThreshold = key.includes('>') && !NO_VEIL.has(key);
      const tv = isThreshold ? Math.sin(Math.PI * progress) : 0;
      // Salto directo entre secciones: el velo cubre el cambio de sitio (sin rótulo de umbral).
      const jump = scrollState.jump;
      const v = Math.max(tv, jump);
      root.current.style.opacity = v.toFixed(3);
      bar.current.style.transform = `scaleX(${isThreshold ? progress : 0})`;
      const labelKey = isThreshold && tv >= jump ? key : '';
      if (label.current.dataset.key !== labelKey) {
        label.current.dataset.key = labelKey;
        label.current.textContent = thresholdLabels[labelKey] ?? '';
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div ref={root} className="veil" aria-hidden="true">
      <p ref={label} className="veil__label" />
      <span ref={bar} className="veil__bar" />
    </div>
  );
}
