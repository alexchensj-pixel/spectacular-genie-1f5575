import { useEffect, useRef } from 'react';
import { gsap } from '../../Scene/Transitions/gsap.js';
import { scrollState, BRIDGE_END, BRIDGE_OUT_DURATION } from '../../Scene/Transitions/scrollState.js';
import { bridge } from '../../Data/Content.js';

// BRIDGE — umbral educativo/cinematográfico entre Entrada (01) y Character Select (02).
//
// No es un capítulo nuevo (no vive en Data/Content.js#chapters): vive DENTRO del mismo umbral de scroll
// 'entrada>character-select' (ver Threshold.jsx, que ahora acepta children, y Experience/index.jsx, que
// monta este componente SOLO en ese umbral). No tiene sala 3D propia: el volumen que se ve detrás de este
// texto es el mismo tramo final del corredor de Entrada, ya construido en
// Scene/Environment/Entrada/TransitionFrame.jsx (que se cierra/abre con el MISMO reveal que aquí se usa
// para ocultar los luchadores — ver scrollState.js#getCharactersReveal/BRIDGE_END).
//
// Progreso: NO tiene su propio ScrollTrigger (Threshold.jsx ya escribe scrollState.segments['entrada>
// character-select'] en cada frame de scroll). Aquí solo se LEE ese valor y se remapea a un progreso local
// 0..1 dentro de la fracción que le corresponde (0..BRIDGE_END): así el copy siempre termina de aparecer
// bastante antes de que termine el umbral, dejando el resto como transición cinematográfica breve hacia
// Character Select (los luchadores empiezan a revelarse después de la salida completa del Bridge — ver scrollState.js).
// Mismo patrón de suavizado que Entrada.jsx (SCRUB_LERP): un lerp por frame hacia el progreso real, para que
// el copy — más denso que el de Entrada — se pueda leer incluso con un scroll rápido.
const SCRUB_LERP = 0.14;

// FASE 2 (dirección de arte): el Bridge deja de ser texto sobre un rectángulo y pasa a ser una secuencia
// de encuadres — cada momento tiene su PROPIA composición (no solo su propio texto), unidos por el mismo
// lenguaje de cámara: barras de cine fijas, una rejilla de fondo que deriva muy despacio (misma sensación
// de avance que ya tiene el corredor 3D detrás) y una viñeta que respira con el progreso. Nada de esto es
// un asset nuevo: son capas CSS (gradientes, líneas, blur), igual que .photo__shade ya hace en Entrada.
// El progreso GLOBAL suavizado (smoothRef, 0..1 de todo el Bridge) se expone como --bridge-p en el nodo
// raíz para que esas capas compartidas reaccionen sin re-render de React.

// TRES BLOQUES continuos (1 EL CUERPO · 2 EL COMBATE · 3 EL MAPA), nunca dos textos a la vez — mismo patrón
// que .ent__momento en Entrada.jsx. Umbral reducido de 340vh a 180vh: el copy se reparte sin huecos entre
// bloques (cada salida deja solo su fundido antes de la entrada siguiente) y el último paso del mapa se
// sostiene hasta BRIDGE_END, donde el fundido del propio Bridge enlaza directo con Character Select.
//
// Bloque 1 · EL CUERPO — título+apoyo (clases .bridge__b) → Tyson → McGregor (.bridge__c).
//   Tyson y McGregor siguen siendo dos tramos EXCLUYENTES (mismo fix de siempre: nunca dos slots de
//   texto visibles a la vez), con el hueco mínimo entre C_TYSON_GONE y C_MCGREGOR_IN.
// Bloque 2 · EL COMBATE — la idea central (.bridge__a): no existe una única manera de combatir.
//   Los dos ejemplos (vídeos de los podios) quedan presentes a la vez — ver BridgeHall.jsx.
// Bloque 3 · EL MAPA — pila de 5 capas que se revela una a una (.bridge__d).
const FADE = 0.03;
const B_IN = 0.02, B_L2 = 0.07, B_OUT = 0.15;
const C_FADE = 0.02;
const C_IN = 0.185;
const C_TYSON_OUT = 0.255;
const C_TYSON_GONE = C_TYSON_OUT + C_FADE; // 0.275
const C_MCGREGOR_IN = 0.28;
const C_OUT = 0.36;
const COMBATE_IN = 0.395, COMBATE_OUT = 0.515;
const MAPA_IN = 0.55, MAPA_STEP = 0.08; // capas en MAPA_IN + i·MAPA_STEP → la 5.ª en 0.87
const MAPA_END = 1;

// Instante en que empieza cada BLOQUE — el mismo "corte de cámara" (flash + micro-zoom del encuadre) se
// dispara solo en estos tres arranques, así el relevo se lee como un cambio de plano y no como un parpadeo
// en cada línea.
const CUTS = [B_IN, COMBATE_IN, MAPA_IN];

// Todos los momentos comparten el mismo hueco en pantalla (.bridge__momento es position: absolute), así que
// además de que cada uno se apague con su propio .to(autoAlpha:0), se fuerza un reseteo duro de TODOS a
// autoAlpha:0 justo al arrancar cada uno. Cinturón-y-tirantes: ningún estado anterior puede quedar visible.
const ALL_MOMENTOS = '.bridge__b, .bridge__c, .bridge__a, .bridge__d';

const build = (tl) => {
  tl.set(ALL_MOMENTOS, { autoAlpha: 0 }, 0);
  tl.set('.bridge__caption', { scale: 1, transformOrigin: '50% 50%' }, 0);
  tl.set('.bridge__flash', { autoAlpha: 0 }, 0);
  tl.set('.bridge__d-funnel', { scale: 1.16, transformOrigin: '50% 20%' }, 0);

  // 1 · EL CUERPO — título + apoyo
  tl.set(ALL_MOMENTOS, { autoAlpha: 0 }, B_IN)
    .fromTo('.bridge__b', { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE, immediateRender: false }, B_IN)
    .fromTo('.bridge__b-title', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: FADE, immediateRender: false }, B_IN)
    .fromTo('.bridge__b-bracket--l', { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: FADE * 1.4, immediateRender: false }, B_IN)
    .fromTo('.bridge__b-bracket--r', { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: FADE * 1.4, immediateRender: false }, B_IN)
    .fromTo('.bridge__b-apoyo', { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE, immediateRender: false }, B_L2)
    .to('.bridge__b', { autoAlpha: 0, duration: FADE }, B_OUT);

  // 1 · EL CUERPO — ejemplos opuestos (Tyson → McGregor), NUNCA a la vez. El contenedor `.bridge__c` (y el
  // divisor central) se mantienen visibles durante todo el tramo, incluido el hueco entre uno y otro: lo
  // único que se apaga y enciende por separado es cada `.bridge__c-slot`.
  tl.set(ALL_MOMENTOS, { autoAlpha: 0 }, C_IN)
    .fromTo('.bridge__c', { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE, immediateRender: false }, C_IN)
    .fromTo('.bridge__c-divider', { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE, immediateRender: false }, C_IN)
    .fromTo('.bridge__c-slot[data-i="0"]', { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: C_FADE, immediateRender: false }, C_IN)
    .to('.bridge__c-slot[data-i="0"]', { autoAlpha: 0, x: -14, duration: C_FADE, immediateRender: false }, C_TYSON_OUT)
    .fromTo('.bridge__c-slot[data-i="1"]', { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: C_FADE, immediateRender: false }, C_MCGREGOR_IN)
    .to('.bridge__c', { autoAlpha: 0, duration: FADE }, C_OUT);

  // 2 · EL COMBATE — una sola idea, en el título grande (.bridge__a-title).
  tl.set(ALL_MOMENTOS, { autoAlpha: 0 }, COMBATE_IN)
    .fromTo('.bridge__a', { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE, immediateRender: false }, COMBATE_IN)
    .fromTo('.bridge__a-title', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: FADE, immediateRender: false }, COMBATE_IN)
    .to('.bridge__a', { autoAlpha: 0, duration: FADE }, COMBATE_OUT);

  // 3 · EL MAPA — la cámara "se abre": el conjunto entra encajado (scale 1.16) y se retrae a su tamaño real
  // mientras las cinco capas se revelan una a una (se acumulan, ninguna sale). Se sostiene hasta BRIDGE_END.
  tl.set(ALL_MOMENTOS, { autoAlpha: 0 }, MAPA_IN)
    .fromTo('.bridge__d', { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE, immediateRender: false }, MAPA_IN)
    .to('.bridge__d-funnel', { scale: 1, duration: MAPA_END - MAPA_IN, ease: 'none', immediateRender: false }, MAPA_IN);
  bridge.mapa.pasos.forEach((_, i) => {
    tl.fromTo(`.bridge__d-paso[data-i="${i}"]`, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: FADE, immediateRender: false }, MAPA_IN + i * MAPA_STEP);
  });

  // Corte de cámara: flash breve (glow radial) + micro-zoom del bloque de texto, en los tres arranques.
  CUTS.forEach((t) => {
    tl.fromTo('.bridge__flash', { autoAlpha: 0 }, { autoAlpha: 0.4, duration: 0.014, immediateRender: false }, t)
      .to('.bridge__flash', { autoAlpha: 0, duration: 0.06 }, t + 0.014)
      .fromTo('.bridge__caption', { scale: 1.018 }, { scale: 1, duration: 0.11, ease: 'power2.out', immediateRender: false }, t);
  });
};

export default function Bridge() {
  const wrapRef = useRef(null);
  const rootRef = useRef(null);
  const tlRef = useRef(null);
  const rawRef = useRef(0);
  const smoothRef = useRef(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      build(tl);
      if (tl.duration() < 1) tl.set({}, {}, 1); // normaliza a duración 1 (posiciones 0..1 = progreso local del Bridge)
      tlRef.current = tl;
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const tick = () => {
      const threshold = scrollState.segments['entrada>character-select'] ?? 0;
      // Progreso LOCAL del Bridge dentro de su fracción del umbral (0..BRIDGE_END → 0..1). Antes de que
      // empiece el umbral vale 0 (nada visible); al llegar a BRIDGE_END termina la secuencia completa.
      rawRef.current = Math.min(Math.max(threshold / BRIDGE_END, 0), 1);
      const s = smoothRef.current + (rawRef.current - smoothRef.current) * SCRUB_LERP;
      smoothRef.current = Math.abs(s - rawRef.current) < 0.0004 ? rawRef.current : s;
      if (tlRef.current) tlRef.current.progress(smoothRef.current);

      // Progreso compartido para las capas de cámara (viñeta + barras): un único número que todas leen
      // vía CSS var, sin tocar el DOM más que una vez por frame.
      if (rootRef.current) rootRef.current.style.setProperty('--bridge-p', smoothRef.current.toFixed(4));

      // Momento activo (0=A · 1=B · 2=C · 3=D · 4=Cierre): mismos umbrales que build() (CUTS). El fondo
      // escénico ya no es CSS (ver Scene/Environment/Bridge/BridgeHall.jsx, que lee su propio progreso
      // directamente de scrollState — no de este atributo); se sigue publicando por si alguna capa de
      // la propia composición de texto quiere engancharse a un cambio de plano en el futuro.
      let moment = 0;
      for (let i = 0; i < CUTS.length; i++) { if (smoothRef.current >= CUTS[i]) moment = i; }
      if (rootRef.current) rootRef.current.dataset.moment = String(moment);

      // Relevo limpio: primero termina toda la secuencia, después sale el Bridge y solo cuando llega a
      // cero se permite el reveal de Character Select (ver BRIDGE_OUT_END en scrollState.js).
      const t = Math.min(Math.max((threshold - BRIDGE_END) / BRIDGE_OUT_DURATION, 0), 1);
      // El Bridge es una capa FIJA a pantalla (ver .bridge en global.css): su texto tiene que estar a la vista mientras
      // corre su línea de tiempo. Antes iba pegado (sticky) dentro del umbral y no llegaba a la pantalla hasta ~36 % del
      // recorrido: EL CUERPO y los dos ejemplos (Tyson → McGregor) se reproducían fuera de pantalla o pegados al borde
      // inferior. Entra en cuanto empieza el umbral (la Entrada ya ha terminado de desvanecerse: introProgress = 1) y
      // sale con el mismo fundido de siempre (BRIDGE_END → BRIDGE_OUT_END). Mismos tiempos, mismo scrub.
      const inn = Math.min(Math.max(threshold / 0.012, 0), 1);
      const alpha = inn * inn * (3 - 2 * inn) * (1 - t * t * (3 - 2 * t));
      if (wrapRef.current) {
        wrapRef.current.style.opacity = String(alpha);
        wrapRef.current.style.visibility = alpha <= 0 ? 'hidden' : 'visible';
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div ref={wrapRef} className="bridge">
      <div className="bridge__stage" ref={rootRef} aria-hidden="true">
        {/* FASE 3 (dirección de arte): el "recinto industrial" ya NO es una escenografía plana en CSS —
            es geometría 3D real, en el mismo Canvas que Entrada y Character Select (ver
            Scene/Environment/Bridge/BridgeHall.jsx). .bridge__stage se queda transparente a propósito:
            detrás de este texto se ve el mundo 3D que la cámara está atravesando de verdad, no una
            imagen. Lo único que queda aquí es lenguaje de cámara/montaje (viñeta, barras de cine,
            destello de corte) — nunca arquitectura simulada. --bridge-p sigue disponible para esas capas. */}
        <span className="bridge__vignette" />
        <span className="bridge__bar bridge__bar--top" />
        <span className="bridge__bar bridge__bar--bottom" />
        <span className="bridge__flash" />

        <div className="bridge__caption">
          {/* 2 · EL COMBATE (clases .bridge__a por herencia del CSS de tipografía) */}
          <p className="bridge__momento bridge__a">
            <span className="bridge__a-title">{bridge.combate.texto}</span>
          </p>

          <p className="bridge__momento bridge__b">
            <span className="bridge__b-frame">
              <span className="bridge__b-bracket bridge__b-bracket--l" aria-hidden="true" />
              <span className="bridge__b-copy">
                <span className="bridge__b-title">{bridge.cuerpo.titulo[0]}</span>
                <span className="bridge__b-apoyo bridge__sub">{bridge.cuerpo.apoyo}</span>
              </span>
              <span className="bridge__b-bracket bridge__b-bracket--r" aria-hidden="true" />
            </span>
          </p>

          <div className="bridge__momento bridge__c">
            <div className="bridge__c-arena">
              {bridge.ejemplos.casos.map((c, i) => (
                <div key={c.nombre} className="bridge__c-slot" data-i={i}>
                  <span className="bridge__c-figure" aria-hidden="true" />
                  <p className="bridge__c-case" data-i={i}>
                    <span className="bridge__c-nombre">{c.nombre}</span>
                    <span className="bridge__c-texto">{c.texto}</span>
                  </p>
                </div>
              ))}
              <span className="bridge__c-divider" aria-hidden="true" />
            </div>
          </div>

          <div className="bridge__momento bridge__d">
            <div className="bridge__d-funnel">
              {bridge.mapa.pasos.map((paso, i) => (
                <div key={paso} className="bridge__d-layer" data-i={i}>
                  {i > 0 && <span className="bridge__arrow" aria-hidden="true">↓</span>}
                  <span className="bridge__d-paso" data-i={i}>{paso}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
