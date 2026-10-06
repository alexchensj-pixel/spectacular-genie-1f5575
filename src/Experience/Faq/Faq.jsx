import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { faq } from '../../Data/Content.js';
import { ScrollTrigger } from '../../Scene/Transitions/gsap.js';
import { registerChapterEl } from '../../Scene/Transitions/navigation.js';

// FAQ = punto de resolución de dudas entre 04 Entrenamiento y 05 Sobre Chen.
// NO es un capítulo: no está en `chapters`, no tiene scroll-scrub, cámara ni umbral propio (DOM normal, opaco).
// Contenido: `faq` de Data/Content.js (las mismas preguntas y respuestas de siempre; antes vivían en el Footer).
// Se registra en navigation.js para que la navegación principal pueda saltar a #faq con scrollToChapter('faq').
const pad = (n) => String(n).padStart(2, '0');

export default function Faq() {
  const ref = useRef(null);
  const timer = useRef(0);
  const [open, setOpen] = useState(null);

  useLayoutEffect(() => { registerChapterEl('faq', ref.current); }, []);

  // Al desplegar/plegar cambia la altura de la página: los ScrollTrigger posteriores (umbral, 05, 06) se recalculan
  // cuando termina la animación, para que nada quede desplazado.
  const toggle = (i) => {
    setOpen((o) => (o === i ? null : i));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => ScrollTrigger.refresh(), 420);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const sel = open != null ? faq[open] : null;

  // Los puntos de consulta se recorren como un sistema: ↑ ↓ (y Inicio / Fin) mueven el foco entre ellos sin abrir nada.
  const onKeys = (e) => {
    const k = e.key;
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(k)) return;
    const btns = Array.from(e.currentTarget.querySelectorAll('.faq__q'));
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = k === 'Home' ? 0 : k === 'End' ? btns.length - 1 : (i + (k === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length;
    btns[next].focus();
  };

  // v29 · DIAGNÓSTICO: las preguntas son puntos de consulta (columna izquierda) y la respuesta se lee en UN solo visor asociado a la pregunta
  // activa (columna derecha, escritorio). En pantallas estrechas no hay visor: la respuesta se abre bajo su propia pregunta (acordeón de siempre).
  // Misma lista, mismas respuestas, mismo estado `open`; el visor solo repite la respuesta elegida (la otra vista queda en display:none).
  return (
    <section ref={ref} id="faq" className="faq" aria-labelledby="faq-h">
      <div className="faq__inner">
        <div className="faq__head">
          <span className="label">Resolución · FAQ</span>
          <span className="label">{pad(faq.length)} puntos de consulta</span>
        </div>
        <h2 id="faq-h" className="h2 faq__title">¿Tienes alguna duda?</h2>
        <div className="faq__diag">
          <ul className="faq__list" onKeyDown={onKeys}>
            {faq.map((f, i) => {
              const on = open === i;
              return (
                <li key={f.q} className="faq__item" data-open={on}>
                  <h3 className="faq__h">
                    <button type="button" id={`faq-q-${i}`} className="faq__q" aria-expanded={on} aria-controls={`faq-a-${i}`} onClick={() => toggle(i)}>
                      <span className="faq__n" aria-hidden="true">{pad(i + 1)}</span>
                      <span className="faq__t">{f.q}</span>
                      <span className="faq__plus" aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`faq-a-${i}`} className="faq__a" role="region" aria-labelledby={`faq-q-${i}`}>
                    <div><p className="faq__p">{f.a}</p></div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside className="faq__out" data-on={sel ? 'true' : 'false'} aria-live="polite" aria-label="Respuesta">
            <p className="faq__outK">{sel ? `${pad(open + 1)} / ${pad(faq.length)}` : 'Punto de consulta'}</p>
            {sel ? (
              <div key={open} className="faq__outBody">
                <h3 className="faq__outQ">{sel.q}</h3>
                <p className="faq__outA">{sel.a}</p>
              </div>
            ) : (
              <p className="faq__outHint">Elige una pregunta.</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

// V27 MAPA · paso 7 — PREGUNTA CONTEXTUAL. Una sola pregunta de `faq` (la misma pregunta y la misma respuesta, sin copy nuevo) montada en la escena donde
// aparece la duda: un botón «+» que abre el texto existente. No duplica el listado: la FAQ completa sigue donde está (después de Entrenamiento).
// Se localiza por el texto de la pregunta; si ese texto cambiara en Content.js, no pinta nada en lugar de inventar una respuesta.
// No recalcula ScrollTrigger: vive dentro de escenas fijas (stage sticky / panel propio), su apertura no cambia la altura de la página.
export function FaqContextual({ q }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const item = faq.find((f) => f.q === q);
  if (!item) return null;
  return (
    <div className="fq1" data-open={open}>
      <button type="button" className="fq1__q" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span className="fq1__t">{item.q}</span>
        <i className="fq1__plus" aria-hidden="true">{open ? '−' : '+'}</i>
      </button>
      {open && <p id={id} className="fq1__a">{item.a}</p>}
    </div>
  );
}
