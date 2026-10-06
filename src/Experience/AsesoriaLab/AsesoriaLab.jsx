import { useEffect, useRef, useState } from 'react';
import Chapter from '../Chapter.jsx';
import { useStore } from '../../App/store.js';
import { advisorySubstages, metodoCierre, evaluacionInicial } from '../../Data/Content.js';
import { goToSection, irAReservar, scrollToChapterProgress } from '../../Scene/Transitions/navigation.js';
import { estudio } from '../../Data/Estudio.js';
import { useStation } from '../useStation.js';
import { useThresholdFade, smoothstep } from '../useThresholdFade.js';
import { FaqContextual } from '../Faq/Faq.jsx';

// METHOD (V22 · paso 4) — «No empezamos por el entrenamiento. Empezamos por ti.»
// Cinco pasos (01 Te conozco · 02 Te observo · 03 Entrenamos · 04 Adaptamos · 05 Seguimos) + cierre. Copy en Data/Content.js.
//
//  ESCRITORIO: una sola pantalla fija (stage sticky, 250vh). La lista de pasos es siempre visible; el scroll reparte el recorrido
//   entre los cinco y el paso en curso se despliega. `substage` (store) lo fija el progreso del capítulo (onProgress) y es el mismo
//   paso que recorre la máquina 3D: cada paso es un módulo de la máquina de selección (Environment/Machine), la cámara se asienta en
//   él (Camera/waypoints.js#stageCamera) y el contenido del paso cuelga de la cabeza de ese módulo (useStation): se mueve, crece y
//   se encoge con la cámara. El rodillo del módulo y la línea de la plataforma responden al mismo paso.
//  MÓVIL (≤700px, Chapter `flow`): mismo modelo de estaciones que escritorio. Las cinco estaciones son siempre visibles como puntos del
//   protocolo (número + nombre); SOLO la activa monta su cuerpo (texto corto, elementos, destacada). La activa la fija `substage`
//   (mismo onProgress que escritorio y que la máquina 3D). La Evaluación inicial (V27 MAPA · paso 5) es un bloque propio, no un paso: cabecera siempre visible
//   (TU PRIMER PASO · EVALUACIÓN INICIAL · 30 €) y cuerpo plegable; mientras está abierto el CTA fijo se retira (data-al-eval en <html>).
//   El stage queda fijo sobre la máquina 3D (sin panel opaco de documento); el recorrido vertical es el runway de scroll de las estaciones.
//
// Estado: SOLO `substage` (paso en curso, ya existente) y estado local (`mas` en la evaluación, modo flow). No toca selectedTrainingMode,
// selectedFormat, selectedGoal ni selectedFrequency.
const [HEAD, ...STEPS] = advisorySubstages;
const N = STEPS.length;
const CLOSE_AT = 0.86; // el cierre aparece en el último tramo del recorrido (escritorio)

const MOBILE_Q = '(max-width: 700px)';
function useFlow() {
  const [flow, setFlow] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_Q).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_Q);
    const on = () => setFlow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return flow;
}

// Escritorio: el cierre se revela al final del recorrido (la lista no necesita timeline: se gobierna por substage).
const build = (tl) => {
  tl.fromTo('.al__cierre', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1 - CLOSE_AT, ease: 'power1.out' }, CLOSE_AT);
  tl.set({}, {}, 1);
};

// El paso activo coincide con el tramo de scroll en pantalla (HUD y lista leen el mismo valor).
const onProgress = (p) => {
  const id = STEPS[Math.min(N - 1, Math.floor(p * N))].id;
  const st = useStore.getState();
  if (st.substage !== id) st.setSubstage(id);
};

// EVALUACIÓN INICIAL (V27 MAPA · paso 5): producto, no nota al pie. Vive en el capítulo como bloque propio (ya no dentro de «Te observo»), visible
// sea cual sea la estación activa: TU PRIMER PASO · EVALUACIÓN INICIAL · 30 € · texto · RESERVAR EVALUACIÓN · nota del descuento.
// CTA principal → irAReservar() (calendario); CTA secundario → contexto aquí mismo (estado local), sin página nueva.
// Móvil: la cabecera (kicker + título + precio) es siempre visible y es también el interruptor; el cuerpo se abre solo si la persona lo decide.
function EvaluacionInicial({ flow = false }) {
  const [mas, setMas] = useState(false);
  const [abierta, setAbierta] = useState(!flow);
  const ev = evaluacionInicial;
  // Mientras el cuerpo está abierto en móvil, el CTA fijo no compite con sus propios CTAs.
  useEffect(() => {
    if (!flow || !abierta) return undefined;
    const root = document.documentElement;
    root.dataset.alEval = 'true';
    return () => { delete root.dataset.alEval; };
  }, [flow, abierta]);
  const kicker = ev.kickerMetodo || ev.kicker;
  return (
    <aside className="al__eval al__prod" data-flow={flow || undefined} data-open={abierta} aria-label={ev.titulo}>
      {flow ? (
        <button type="button" className="al__prodHead" aria-expanded={abierta} aria-controls="al-eval-body" onClick={() => setAbierta((v) => !v)}>
          <span className="al__evalKicker">{kicker}</span>
          <span className="al__evalHead">
            <span className="al__evalTitle">{ev.titulo}</span>
            <span className="al__evalPrice">{ev.precio}</span>
          </span>
        </button>
      ) : (
        <>
          <p className="al__evalKicker">{kicker}</p>
          <div className="al__evalHead">
            <h3 className="al__evalTitle">{ev.titulo}</h3>
            <p className="al__evalPrice">{ev.precio}</p>
          </div>
        </>
      )}
      {abierta && (
        <div id="al-eval-body" className="al__prodBody">
          <p className="al__evalText">{ev.texto}</p>
          <div className="al__evalCtas">
            <button type="button" className="al__cta al__cta--main" onClick={() => irAReservar()}>{ev.cta}</button>
            <button type="button" className="al__cta al__cta--sub" aria-expanded={mas} aria-controls="al-eval-mas" onClick={() => setMas((v) => !v)}>{ev.ctaMas}</button>
          </div>
          <p className="al__evalNote">{ev.nota}</p>
          {/* V27 · paso 7: la duda que precede a reservar la evaluación (misma pregunta de faq[]). */}
          <FaqContextual q="¿Qué ocurre en mi primera sesión?" />
          {mas && (
            <dl id="al-eval-mas" className="al__evalMore">
              {ev.mas.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
        </div>
      )}
    </aside>
  );
}

function StepBody({ s }) {
  return (
    <div className="al__stepBody">
      <p className="al__stepText">{s.texto}</p>
      {s.elementos && <ul className="al__dots">{s.elementos.map((t) => <li key={t}>{t}</li>)}</ul>}
      {s.destacada && <p className="al__stepHl">{s.destacada}</p>}
    </div>
  );
}


// Placa del paso: el cuerpo del paso colgado de la cabeza de SU módulo. Las cinco placas existen a la vez (cada una en su módulo, siguiendo a la
// cámara); solo la del paso en curso se ve, así el relevo se produce con la cámara en movimiento y no por un salto.
function StepPlate({ s, i, on }) {
  const ref = useRef(null);
  useStation(ref, `metodo-${i}`, { d0: 4.4, min: 0.8, max: 1.1 });
  return (
    <div ref={ref} className="sp al__plate" data-on={on} data-step={s.id} aria-hidden={!on} inert={!on ? '' : undefined}>
      <StepBody s={s} />
    </div>
  );
}

// 03→04: el copy de Método se apaga con la sala (0 % → 35 % del umbral), antes de que Entrenamiento ponga el suyo. Una sola voz.
const methodOpacity = (seg) => 1 - smoothstep(seg['asesoria-lab>slot'] ?? 0, 0, 0.35);

export default function AsesoriaLab() {
  const flow = useFlow();
  useThresholdFade('asesoria-lab', methodOpacity);
  const substage = useStore((s) => s.substage);
  // Antes del primer cálculo de progreso `substage` vale 'apertura' (cabecera): el primer paso es el que se muestra.
  const current = STEPS.some((s) => s.id === substage) ? substage : STEPS[0].id;

  return (
    // key: al cruzar el breakpoint se remonta el capítulo para que ScrollTrigger/timeline se creen (o no) con el modo correcto.
    <Chapter key={flow ? 'flow' : 'stage'} id="asesoria-lab" flow={flow} build={flow ? undefined : build} onProgress={onProgress}>
      <div className="al__wrap">
        <header className="al__head">
          <h2 className="al__titular">{HEAD.titular.map((l) => <span key={l}>{l}</span>)}</h2>
        </header>

        <EvaluacionInicial flow={flow} />

        <ol className="al__steps" aria-label="El método">
          {STEPS.map((s, i) => {
            const cur = STEPS.findIndex((x) => x.id === current);
            const on = i === cur;
            // Móvil: solo la estación activa monta cuerpo; el resto es identidad (número + nombre). Escritorio: igual, el cuerpo cuelga de la plate.
            const open = on;
            const state = i < cur ? 'done' : on ? 'on' : 'next'; // estación ya recorrida · activa · pendiente (conexión con la siguiente)
            return (
              <li key={s.id} className="al__step" data-open={open} data-step={s.id} data-state={state}>
                <button
                  type="button"
                  className="al__stepHead"
                  aria-expanded={open}
                  aria-current={open ? 'step' : undefined}
                  onClick={() => scrollToChapterProgress('asesoria-lab', (i + 0.5) / N)}
                >
                  <span className="al__num">{s.num}</span>
                  <span className="al__name">{s.n}</span>
                  {s.etiqueta && !open && !flow && <span className="al__tag">{s.etiqueta}</span>}
                </button>
                {flow && on && <StepBody s={s} />}
              </li>
            );
          })}
        </ol>

        {/* Profundización (no es un paso del método): abre el overlay de Estudio, igual que desde Descubrir. */}
        <button type="button" className="al__estudio" onClick={() => goToSection('estudio')}>{estudio.marca} →</button>

        {(!flow || current === STEPS[N - 1].id) && (
          <p className="al__cierre">{metodoCierre.map((l) => <span key={l}>{l}</span>)}</p>
        )}
      </div>
      {!flow && STEPS.map((s, i) => <StepPlate key={s.id} s={s} i={i} on={s.id === current} />)}
    </Chapter>
  );
}
