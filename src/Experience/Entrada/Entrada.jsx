import { useEffect, useRef } from 'react';
import Chapter from '../Chapter.jsx';
import PhotoBackdrop from '../../Scene/PhotoBackdrop.jsx';
import { gsap } from '../../Scene/Transitions/gsap.js';
import { hero, entradaNarrativa } from '../../Data/Content.js';
import { goToSection } from '../../Scene/Transitions/navigation.js';

// 01 — Entrada. El mundo (corredor, portales) es 3D y vive en Scene/Environment/Entrada.
// Esta capa DOM tiene dos funciones:
//  · Aviso de scroll (DESLIZA) — el único elemento con apariencia de interfaz que se conserva, porque
//    comunica una interacción real. No hay coordenadas, esquinas de encuadre ni otro HUD decorativo:
//    si no aporta navegación/información real, no vive aquí.
//  · Narrativa progresiva en tres momentos (curiosidad → entra → vívelo). El espacio 3D es el
//    protagonista: el texto es estrecho, discreto y vive en el tercio inferior, lejos del personaje.
//
// Timeline propia (no la de Chapter/useChapter): Chapter aplicaría tl.progress(scrollFraction) tal cual,
// 1:1 y sin inercia — con un scroll muy rápido, dos o tres momentos podrían "quemarse" en uno o dos
// frames renderizados y el ojo no llegaría a leer ninguno. Aquí se suaviza esa lectura con un lerp por
// frame hacia el progreso real (gsap.ticker), así que sigue siendo una función determinista y reversible
// del scroll — solo con la inercia justa para que la jerarquía (uno, luego el otro, nunca a la vez) se
// perciba también cuando se desliza rápido.
const SCRUB_LERP = 0.14;

// HOME (V27): el mensaje principal (.ent__hero) y las salidas (.ent__actions) están visibles desde el primer fotograma — el scroll
// NO los descubre. El scroll solo mete la cámara en el laboratorio y revela, por encima, la frase cinematográfica secundaria.
//   0 → .46   título + CTA a la vista (cue DESLIZA al inicio)
//   .16 → .5  claim secundario «No elijas tu entreno. Descúbrelo.» (zona inferior, sobre los CTA)
//   .5 → .64  el título se retira para dejar ver el laboratorio (los CTA siguen disponibles)
//   .66 → .92 «Entra.» · los CTA se retiran al final de la Entrada
const build = (tl) => {
  tl.fromTo('.ent__cue', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.06 }, 0.05)

    .fromTo('.ent__claim', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.16)
    .to('.ent__claim', { autoAlpha: 0, y: -8, duration: 0.1 }, 0.42)

    .to('.ent__hero', { autoAlpha: 0, y: -14, duration: 0.14 }, 0.5)

    .fromTo('.ent__entra', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.66)
    .fromTo('.ent__entraSub', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.72)
    .to('.ent__entra, .ent__entraSub', { autoAlpha: 0, y: -8, duration: 0.08 }, 0.86)

    .to('.ent__actions', { autoAlpha: 0, duration: 0.08 }, 0.92);
};

export default function Entrada() {
  const rootRef = useRef(null);
  const tlRef = useRef(null);
  const rawRef = useRef(0);
  const smoothRef = useRef(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      build(tl);
      if (tl.duration() < 1) tl.set({}, {}, 1); // normaliza a duración 1 (posiciones 0..1 = progreso del capítulo)
      tlRef.current = tl;
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const tick = () => {
      const s = smoothRef.current + (rawRef.current - smoothRef.current) * SCRUB_LERP;
      smoothRef.current = Math.abs(s - rawRef.current) < 0.0004 ? rawRef.current : s;
      if (tlRef.current) tlRef.current.progress(smoothRef.current);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <>
      <PhotoBackdrop />
      <Chapter id="entrada" onProgress={(p) => { rawRef.current = p; }} className="ent">
        <div ref={rootRef}>
          {/* MENSAJE PRINCIPAL — visible al entrar. h1 real: qué es SML, qué ofrece, dónde está. */}
          <div className="ent__hero">
            <p className="ent__marca">{hero.marca}</p>
            <h1 className="ent__titulo">
              {hero.titulo.map((line) => <span key={line}>{line}</span>)}
            </h1>
            <p className="ent__disc">{hero.disciplinasLinea}</p>
          </div>

          <div className="ent__cue" aria-hidden="true">
            <span className="ent__cue-line" />
            <span className="ent__cue-label label">DESLIZA</span>
          </div>

          {/* Momentos cinematográficos secundarios (nunca por encima del título). Tercio inferior, sobre los CTA. */}
          <div className="ent__caption" aria-hidden="true">
            <p className="ent__momento ent__claim">
              {hero.claimLineas.map((line) => <span key={line}>{line}</span>)}
            </p>
            <div className="ent__momento">
              <p className="ent__entra">{entradaNarrativa.entra}</p>
              <p className="ent__entraSub label">{entradaNarrativa.entraSub}</p>
            </div>
          </div>

          {/* Salidas — jerarquía V27: 1 RESERVAR (→ BOOK, CTA primario) · 2 No sé qué necesito → DESCUBRIR (→ EXPLORE, secundario) · 3 Empresas · Hoteles · Eventos (→ B2B, tercer nivel).
              Todas por goToSection: DESCUBRIR desde aquí recorre el Bridge (animado); RESERVAR y B2B saltan directo, sin atravesar capítulos. */}
          <div className="ent__actions">
            <button type="button" className="ent__reservar" onClick={() => goToSection('book')}>{hero.ctaReservar}</button>
            <button type="button" className="ent__explorar" onClick={() => goToSection('explore')}>{hero.ctaExplorar}</button>
            <button type="button" className="ent__b2bLink" onClick={() => goToSection('experiences')}>{hero.ctaB2B}</button>
          </div>
        </div>
      </Chapter>
    </>
  );
}
