import { useLayoutEffect } from 'react';
import { gsap, ScrollTrigger } from '../Scene/Transitions/gsap.js';
import { setSegment } from '../Scene/Transitions/scrollState.js';
import { registerChapterEl } from '../Scene/Transitions/navigation.js';
import { useStore } from '../App/store.js';

// Conecta un capítulo con el scroll.
//  build(tl, el)  → recibe un timeline PAUSADO de duración 1 (posiciones 0..1) que se "scrubea" con el progreso.
//  onProgress(p)  → callback opcional con el progreso 0..1 del capítulo.
export function useChapter(id, ref, build, onProgress) {
  useLayoutEffect(() => {
    const el = ref.current;
    registerChapterEl(id, el);

    const ctx = gsap.context(() => {
      // El timeline se crea aquí y se usa SIEMPRE, devuelva algo o no build() (antes, un build con cuerpo `{ ... }` sin
      // `return` dejaba tl = undefined: los elementos quedaban ocultos en su estado inicial y no se revelaban nunca).
      let tl = null;
      if (build) {
        tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
        build(tl, el);
        if (tl.duration() < 1) tl.set({}, {}, 1); // normaliza a duración 1: posiciones 0..1 = progreso del capítulo
        // Corrección (bug "varios bloques visibles a la vez al cargar" en 02 · Descubrir): antes, el estado
        // inicial (todo oculto salvo lo que corresponde en progreso 0) dependía por completo del
        // comportamiento IMPLÍCITO de `immediateRender` de cada tween individual dentro de build() — cada
        // .set()/.fromTo() decide por su cuenta si se renderiza nada más crearse. Con decenas de tweens
        // repartidos en build(), bastaba que uno solo no aplicara su render implícito (por su posición, por
        // cómo estuviera encadenado, o por una futura edición del propio build()) para que ese bloque
        // concreto se quedara en su estilo CSS por defecto — es decir, VISIBLE — en vez de oculto, mientras
        // el resto sí se ocultaba: el síntoma exacto reportado (varios bloques a la vez, no todos).
        // tl.render(0, true, true) no depende de ningún supuesto por tween: fuerza explícitamente el DOM al
        // estado real de progreso 0 del timeline completo, de una sola vez, antes de que ScrollTrigger o el
        // usuario vean nada. (Ver también global.css: protección de respaldo en CSS por si este efecto
        // tardara en ejecutarse.)
        tl.render(0, true, true);
      }

      const update = (self) => {
        setSegment(id, self.progress);
        if (tl) tl.progress(self.progress);
        if (onProgress) onProgress(self.progress);
      };

      // Progreso: mientras el "stage" sticky permanece en pantalla.
      ScrollTrigger.create({
        trigger: el, start: 'top top', end: 'bottom bottom',
        onUpdate: update, onRefresh: update,
      });

      // Capítulo activo: el que ocupa el centro de la pantalla.
      ScrollTrigger.create({
        trigger: el, start: 'top 50%', end: 'bottom 50%',
        onToggle: (self) => { if (self.isActive) useStore.getState().setActiveChapter(id); },
      });
    }, ref);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}
