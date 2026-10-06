import { useLayoutEffect } from 'react';
import { gsap } from '../Scene/Transitions/gsap.js';
import { scrollState } from '../Scene/Transitions/scrollState.js';
import { stationSide } from '../Scene/Camera/waypoints.js';

// Ata un elemento del DOM al punto del objeto 3D que CameraRig proyecta cada fotograma (scrollState.station[id]). El elemento cuelga de
// ese punto por el lado que le toca (stationSide) y sigue a la cámara: se desplaza con la pieza, crece al acercarse y se encoge al
// alejarse (profundidad Z → escala), con una inclinación mínima según su posición en pantalla (perspectiva). Sin renders de React.
//  d0   = distancia de cámara (m) a la que la escala es 1 · min / max = límites de escala
//  gap  = separación (px) entre la pieza y la placa cuando cuelga por arriba
// En pantallas estrechas (< 700 px) el 3D queda en la mitad superior y la placa se acopla abajo (data-dock): sin transform.
const MARGIN = 16;
const TOP = 72; // bajo el HUD
const DOCK_Q = 700;
const ORIGIN = { left: '100% 50%', right: '0% 50%', top: '50% 100%', center: '50% 50%' };
const SHIFT = { left: '-100%,-50%', right: '0%,-50%', top: '-50%,-100%', center: '-50%,-50%' };

export function useStation(ref, id, { d0 = 4, min = 0.7, max = 1.15, gap = 14, enabled = true } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;
    const side = stationSide(id);
    el.style.transformOrigin = ORIGIN[side];
    let w = el.offsetWidth;
    let h = el.offsetHeight;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { w = el.offsetWidth; h = el.offsetHeight; }) : null;
    ro?.observe(el);
    let lastMax = -1;

    const tick = () => {
      const st = scrollState.station[id];
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (W < DOCK_Q) { // acoplada abajo
        if (el.dataset.dock !== 'true') { el.dataset.dock = 'true'; el.style.transform = ''; el.style.maxHeight = ''; el.style.display = ''; lastMax = -1; }
        return;
      }
      if (el.dataset.dock === 'true') delete el.dataset.dock;
      if (!st || !st.vis) { el.style.display = 'none'; return; }
      el.style.display = '';
      const s = Math.min(max, Math.max(min, (d0 / st.d) ** 0.9));
      let x = st.x;
      let y = st.y;
      // alto disponible (px sin escalar) y límites en pantalla
      const maxH = side === 'top' ? Math.max(120, (y - gap - TOP) / s) : (H - TOP - MARGIN) / s;
      if (Math.abs(maxH - lastMax) > 4) { el.style.maxHeight = `${Math.floor(maxH)}px`; lastMax = maxH; }
      if (side === 'top') y -= gap;
      const hw = w * s;
      if (side === 'left') x = Math.max(MARGIN + hw, Math.min(W - MARGIN, x));
      else if (side === 'right') x = Math.max(MARGIN, Math.min(W - MARGIN - hw, x));
      else x = Math.max(MARGIN + hw / 2, Math.min(W - MARGIN - hw / 2, x));
      if (side === 'left' || side === 'right' || side === 'center') {
        const hh = Math.min(h, maxH) * s;
        y = Math.max(TOP + hh / 2, Math.min(H - MARGIN - hh / 2, y));
      }
      // inclinación: la placa se orienta levemente hacia el centro de la imagen (perspectiva), nunca más de ±5°
      const tilt = Math.max(-5, Math.min(5, ((W / 2 - st.x) / W) * 12));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(${SHIFT[side]}) perspective(1100px) rotateY(${tilt.toFixed(2)}deg) scale(${s.toFixed(3)})`;
    };
    gsap.ticker.add(tick);
    tick();
    return () => {
      gsap.ticker.remove(tick);
      ro?.disconnect();
      el.style.transform = ''; el.style.maxHeight = ''; el.style.display = ''; el.style.transformOrigin = '';
      delete el.dataset.dock;
    };
  }, [ref, id, d0, min, max, gap, enabled]);
}
