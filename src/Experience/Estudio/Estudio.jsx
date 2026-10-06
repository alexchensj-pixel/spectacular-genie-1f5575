import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../../App/store.js';
import { estudio } from '../../Data/Estudio.js';
import { prefersReducedMotion } from '../../Scene/Transitions/scrollState.js';
import { goToSection } from '../../Scene/Transitions/navigation.js';

// ESTUDIO DE COMBATE — Nivel 2 (profundización) del MÉTODO SML. Sala opcional: overlay propio sobre el canvas 3D (igual que Experiences),
// sin tocar capítulos, cámara ni scroll de fondo. Ocho capítulos en vertical; índice lateral (escritorio) / barra de capítulo (móvil).
// El texto sale ÍNTEGRO de Data/Estudio.js; aquí solo se compone. Estado propio y LOCAL: capítulo en pantalla.

const Lineas = ({ items, cls }) => items.map((t) => <span key={t} className={cls}>{t}</span>);

function Bloque({ b }) {
  const [tipo, v] = b;
  if (tipo === 'h') return <h2 className="es__h">{v.map((t) => <span key={t}>{t}</span>)}</h2>;
  if (tipo === 'q') return <p className="es__q">{v.map((t) => <span key={t}>{t}</span>)}</p>;
  if (tipo === 'l') return <ul className="es__l">{v.map((t) => <li key={t}>{t}</li>)}</ul>;
  if (tipo === 'sist') return <ul className="es__sist">{v.map((t) => <li key={t}>{t}</li>)}</ul>;
  if (tipo === 'firma') return <p className="es__firma"><Lineas items={v} /></p>;
  if (tipo === 'marca') return <p className="es__marca">{v}</p>;
  return <p className="es__p">{v}</p>;
}

export default function Estudio() {
  const open = useStore((s) => s.estudioOpen);
  const close = useStore((s) => s.closeEstudio);
  const stage = useRef(null);
  const from = useRef(null);
  const [cap, setCap] = useState(estudio.capitulos[0].id);

  useEffect(() => { if (window.location.hash === '#estudio') useStore.getState().openEstudio(); }, []);

  const goTo = useCallback((id) => {
    const el = stage.current?.querySelector(`[data-cap="${id}"]`);
    if (el) stage.current.scrollTo({ top: el.offsetTop, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    from.current = document.activeElement;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden'; // la página queda congelada; al cerrar, la persona vuelve exactamente donde estaba
    history.replaceState(null, '', '#estudio');
    stage.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = prev;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      from.current?.focus?.();
    };
  }, [open, close]);

  // Capítulo en pantalla (índice) + aparición sutil de cada capítulo al entrar (sin movimiento con «reducir movimiento»).
  useEffect(() => {
    if (!open || typeof IntersectionObserver === 'undefined') return undefined;
    const root = stage.current;
    if (!root) return undefined;
    const secs = [...root.querySelectorAll('[data-cap]')];
    if (prefersReducedMotion) secs.forEach((el) => el.setAttribute('data-in', ''));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { en.target.setAttribute('data-in', ''); setCap(en.target.dataset.cap); }
      });
    }, { root, rootMargin: '-35% 0px -45% 0px' });
    secs.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [open]);

  if (!open) return null;
  const caps = estudio.capitulos;
  const actual = caps.find((c) => c.id === cap) ?? caps[0];
  return (
    <section id="es" role="region" aria-label={estudio.marca}>
      <header className="es__top">
        <span className="es__brand">SML</span>
        <span className="es__where">{estudio.marca}</span>
        <button type="button" className="es__close" onClick={close}>{estudio.volver} ×</button>
      </header>

      <div className="es__body">
        <nav className="es__idx" aria-label={estudio.indice}>
          <ol>
            {caps.map((c) => (
              <li key={c.id} data-on={c.id === cap || undefined}>
                <button type="button" aria-current={c.id === cap ? 'true' : undefined} onClick={() => goTo(c.id)}>
                  <span className="es__idxN">{c.n}</span><span className="es__idxK">{c.k}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="es__stage" ref={stage} tabIndex={0} aria-label={`${estudio.marca}: recorrido vertical`}>
          {caps.map((c, i) => (
            <article key={c.id} className="es__cap" data-cap={c.id} aria-label={c.k}>
              <p className="es__capK"><b>{c.n}</b> — {c.k}</p>
              <div className="es__capB">{c.bloques.map((b, j) => <Bloque key={j} b={b} />)}</div>
              {i === caps.length - 1 && (
                <div className="es__acts">
                  <button type="button" className="es__cta" onClick={() => goToSection('explore')}>{estudio.cierre.explorar}</button>
                  <button type="button" className="es__cta es__cta--red" onClick={() => goToSection('book')}>{estudio.cierre.reservar}</button>
                </div>
              )}
            </article>
          ))}
        </main>
      </div>

      <div className="es__bar" aria-hidden="true"><span>{actual.n} / {caps[caps.length - 1].n}</span><span>{actual.k}</span></div>
    </section>
  );
}
