import { useEffect } from 'react';
import { gsap } from '../Scene/Transitions/gsap.js';
import { scrollState } from '../Scene/Transitions/scrollState.js';

// Atenúa el DOM de un capítulo según el progreso REAL de un umbral (el mismo que gobierna la cámara y la visibilidad 3D), sin renders de React.
// Se usa en 03→04 para que NO haya dos voces a la vez: el copy de Método se apaga con la sala y el de Entrenamiento entra cuando el rack ya
// tiene cuerpo en la nave. No es un velo: no oscurece la escena, solo retira el DOM que no toca. Determinista y reversible (scroll arriba/abajo).
//  chapterId → id del capítulo (su `.stage` es lo que se atenúa) · opacity(seg) → 0..1 a partir de scrollState.segments
export function useThresholdFade(chapterId, opacity) {
  useEffect(() => {
    let el = null;
    let last = -1;
    // Method remonta su <section> al cruzar el breakpoint móvil: si el elemento se desconecta, se vuelve a buscar.
    const find = () => {
      if (el && el.isConnected) return el;
      el = document.getElementById(chapterId)?.querySelector('.stage') || null;
      last = -1;
      return el;
    };
    const tick = () => {
      const node = find();
      if (!node) return;
      const o = Math.min(1, Math.max(0, opacity(scrollState.segments)));
      if (Math.abs(o - last) < 0.004 && (o > 0.004) === (last > 0.004)) return;
      last = o;
      node.style.opacity = o >= 0.999 ? '' : o.toFixed(3);
      node.style.pointerEvents = o < 0.5 ? 'none' : '';
      node.style.visibility = o <= 0.004 ? 'hidden' : '';
    };
    gsap.ticker.add(tick);
    tick();
    return () => {
      gsap.ticker.remove(tick);
      if (el) { el.style.opacity = ''; el.style.pointerEvents = ''; el.style.visibility = ''; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);
}

export const smoothstep = (x, a, b) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
