import { useEffect, useRef, useState } from 'react';
import Chapter from '../Chapter.jsx';
import { useStore } from '../../App/store.js';
import { disciplines } from '../../Data/Disciplines.js';
import { seleccion, explore, hero } from '../../Data/Content.js';
import { estudio } from '../../Data/Estudio.js';
import { FaqContextual } from '../Faq/Faq.jsx';
import { goToSection } from '../../Scene/Transitions/navigation.js';
import { prefersReducedMotion } from '../../Scene/Transitions/scrollState.js';

// EXPLORE (V22 · paso 3) — una única experiencia que fusiona el antiguo Bridge + Character Select + parte de Disciplines.
//
//   ¿Cómo quieres entrenar?  →  selectedTrainingMode   (APRENDER · ENTRENAR · VIVIR EL ENTRENAMIENTO DE UN PELEADOR · SPARRING · COMPETIR)
//   Después elegimos cómo.   →  selectedDiscipline     (BOXEO · K1 / KICKBOXING · MUAY THAI)
//   selección                →  personaje / vídeo · qué es · cómo se entrena · qué desarrolla · glosario (solo la elegida)
//
// La SELECCIÓN es la causa; el scroll no decide nada:
//   toque → store (selectedTrainingMode / selectedDiscipline) → UI (esta capa) + 3D (cámara, luz, personaje y vídeo lo leen del
//   mismo estado: Scene/Camera, Scene/Lighting/CharacterSelectLighting, Scene/Environment/Fighter + RosterGroup + blockouts).
// Tocar al luchador en el 3D hace exactamente lo mismo que tocar su tarjeta (blockouts.jsx#CharacterHitArea → selectDiscipline).
//
// Las cinco formas NO son niveles (ni principiante / intermedio / avanzado): son formas distintas de entrenar.
// Cualquiera de las dos decisiones puede cambiarse en cualquier momento y en cualquier orden; no hay animación que esperar.
//
// Composición: el panel (esta capa) y el 3D se reparten la pantalla — panel a la izquierda y 3D a la derecha en apaisado;
// 3D en la franja superior y panel debajo en vertical (Scene/Environment/cells.js#exploreRegion, global.css#.ex__panel).
// Todo el texto sale de Data/Content.js (seleccion, explore) y Data/Disciplines.js: nada de información nueva.

// Vertical = pantalla con aspect < 1,1 (misma frontera que cells.js#EXPLORE_SPLIT_MIN_ASPECT). Solo ahí se muestra el vídeo
// en el panel: en apaisado el personaje ya es el propio 3D, a pantalla grande, a la derecha.
function useStacked() {
  const query = '(min-aspect-ratio: 11/10)';
  const [stacked, setStacked] = useState(() => (typeof window === 'undefined' ? false : !window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setStacked(!mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return stacked;
}

// #rrggbb -> "r, g, b": el color de identidad de cada disciplina como luz translúcida (CSS var), sin color-mix().
function rgbTriplet(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const pad = (n) => String(n).padStart(2, '0');
const firstWord = (t) => t.split(' ')[0]; // etiqueta corta de la estación: sale del propio título (Aprender · Entrenar · Vivir · Sparring · Competir)

// v29 · EXPLORE como SELECCIÓN DE PERSONAJE (no como documento). Misma fuente de estado y mismas acciones que antes; cambia la jerarquía:
//   v30: la SELECCIÓN vive en el 3D (Scene/Environment/ModeStations.jsx: estaciones 01–05 + sockets de disciplina + haz). Los botones de abajo
//   son solo el acceso por teclado / lector de pantalla de esos mismos objetos (.exs__sr); el texto aparece como consecuencia de la selección.
//   Nivel 1 (siempre): disciplina · concepto · acción.  Nivel 2: línea de la disciplina / del concepto.  Nivel 3 (solo si se pide): «Profundizar».
export default function Explore() {
  const mode = useStore((s) => s.selectedTrainingMode);
  const selectMode = useStore((s) => s.selectTrainingMode);
  const discId = useStore((s) => s.selectedDiscipline);
  const selectDiscipline = useStore((s) => s.selectDiscipline);
  const focus = useStore((s) => s.exploreFocus); // 'modos' (puerta DESCUBRIR) | 'disciplinas' (puerta DISCIPLINAS)
  const stacked = useStacked();
  const [deep, setDeep] = useState(false);     // Nivel 3 de la disciplina (qué es · cómo · desarrolla · glosario)
  const [modeDeep, setModeDeep] = useState(false); // Nivel 3 del concepto (texto largo de la forma de entrenar)

  const active = disciplines.find((d) => d.id === discId) || null;
  const forma = seleccion.formas.find((f) => f.id === mode) || null;
  const modeTitle = mode ? explore.modosTitulo[mode] : null;

  // Cambiar de personaje o de concepto cierra el nivel 3 anterior: la información es consecuencia de la selección, no un resto.
  useEffect(() => { setDeep(false); }, [discId]);
  useEffect(() => { setModeDeep(false); }, [mode]);

  const style = active ? { '--ex-accent': active.accent, '--ex-rgb': rgbTriplet(active.accent) } : undefined;

  // El ORDEN de percepción lo decide la puerta (exploreFocus), no el scroll. Mismas dos secciones, mismo estado:
  //   DESCUBRIR   (modos)       → 1 CÓMO QUIERES ENTRENAR (formas) · 2 QUÉ QUIERES ENTRENAR (disciplinas)
  //   DISCIPLINAS (disciplinas) → el 3D manda: primero el roster de luchadores; las formas quedan después.
  // PERSONAJE — selector de disciplina. Tocar al luchador en el 3D hace lo mismo (blockouts.jsx#CharacterHitArea).
  const discSection = (
    <section className="exs__sel" aria-label={explore.disciplinasTitulo}>
      <ul className="exs__discs exs__sr">
        {disciplines.map((d, i) => {
          const on = d.id === discId;
          return (
            <li key={d.id} data-on={on} data-dim={!!active && !on} style={{ '--ex-accent': d.accent, '--ex-rgb': rgbTriplet(d.accent) }}>
              <button type="button" aria-pressed={on} onClick={() => selectDiscipline(on ? null : d.id)}>
                <span className="exs__n">{pad(i + 1)}</span>
                <span className="exs__dn">{d.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {active && <p className="exs__cN" key={active.id} style={{ color: active.accent }}>{active.name}<span>{active.tagline}</span></p>}
      <p className={active ? 'exs__line' : 'exs__line exs__hint'} aria-live="polite">{active ? active.linea : explore.intro}</p>
      {active && (
        <button type="button" className="exs__more" aria-expanded={deep} aria-controls={`ex-detail-${active.id}`} onClick={() => setDeep((v) => !v)}>
          {deep ? explore.cerrar : explore.profundizar} <i aria-hidden="true">{deep ? '−' : '+'}</i>
        </button>
      )}
      {active && deep && (
        <DisciplineDetail key={active.id} discipline={active} stacked={stacked} onReset={() => { setDeep(false); selectDiscipline(null); }} />
      )}
      {active && !deep && stacked && <DisciplineMedia discipline={active} label={explore.bloques.personaje} />}
    </section>
  );

  // PROTOCOLO — las cinco formas de entrenar como regla 01–05 del sistema; solo la activa explica su contenido.
  const modeSection = (
    <section className="exs__proto" aria-label={seleccion.pregunta}>
      <ol className="exs__rail exs__sr">
        {seleccion.formas.map((f, i) => {
          const on = f.id === mode;
          return (
            <li key={f.id} data-on={on}>
              <button type="button" aria-pressed={on} aria-label={`${explore.modosTitulo[f.id]}. ${f.concepto}`} onClick={() => selectMode(on ? null : f.id)}>
                <span className="exs__n">{pad(i + 1)}</span>
                <span className="exs__w">{firstWord(explore.modosTitulo[f.id])}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="exs__concept" aria-live="polite">
        {forma ? (
          <>
            <p className="exs__cT">{modeTitle}</p>
            <p className="exs__cC">{forma.concepto}</p>
            <p className="exs__cL">{explore.modos[forma.id]}</p>
            <button type="button" className="exs__more" aria-expanded={modeDeep} onClick={() => setModeDeep((v) => !v)}>
              {modeDeep ? explore.cerrar : explore.profundizar} <i aria-hidden="true">{modeDeep ? '−' : '+'}</i>
            </button>
            {modeDeep && (
              <div className="exs__cD">
                <p className="ex__text">{forma.texto}</p>
                {forma.destacada && <p className="ex__hl">{forma.destacada.map((line) => <span key={line}>{line}</span>)}</p>}
                {forma.etiquetas && <ul className="ex__tags">{forma.etiquetas.map((t) => <li key={t}>{t}</li>)}</ul>}
                {forma.cierre && <p className="ex__text ex__text--soft">{forma.cierre}</p>}
              </div>
            )}
          </>
        ) : (
          <p className="exs__cL exs__hint">{explore.notaModos}</p>
        )}
      </div>
    </section>
  );

  return (
    <Chapter id="character-select" className="ex">
      <div className="ex__body" data-empty={!active && !forma ? 'true' : undefined} data-picked={active ? active.id : 'none'} data-focus={focus} data-deep={deep || undefined} style={style}>
        <div className="ex__glow" aria-hidden="true" />

        <div className="ex__panel">
          <div className="ex__scroll">
            <header className="exs__head">
              <h2 className="ex__title">{explore.titulo}</h2>
              <button type="button" className="ex__estudio" onClick={() => goToSection('estudio')}>{estudio.marca} →</button>
            </header>

            {focus === 'disciplinas' ? <>{discSection}{modeSection}</> : <>{modeSection}{discSection}</>}
            {/* V27 · paso 7: objeción de quien llega sin saber qué quiere (puerta DESCUBRIR). La puerta DISCIPLINAS es de quien ya sabe: no se le añade. */}
            {focus === 'modos' && <FaqContextual q="¿Puedo empezar completamente desde cero?" />}
            {/* Entre las dos puertas, sin pasar por el menú: quien llega por DISCIPLINAS sin saber qué quiere descubre; quien descubre puede ver las disciplinas. */}
            {focus === 'disciplinas'
              ? <button type="button" className="ex__estudio" onClick={() => goToSection('explore')}>{hero.noSe.pre} → {hero.noSe.accion}</button>
              : <button type="button" className="ex__estudio" onClick={() => goToSection('disciplinas')}>Disciplinas →</button>}
          </div>
        </div>
      </div>
    </Chapter>
  );
}

// NIVEL 3 de la disciplina elegida (solo existe tras «Profundizar»): qué es · cómo se entrena · qué desarrolla · glosario. Cajón interno de la escena.
function DisciplineDetail({ discipline: d, stacked, onReset }) {
  const b = explore.bloques;
  return (
    <div className="exs__drawer" id={`ex-detail-${d.id}`}>
      {stacked && <DisciplineMedia discipline={d} label={b.personaje} />}

      <h4 className="ex__dh">{b.que}</h4>
      {d.descripcion.map((p, i) => <p key={i} className="ex__text">{p}</p>)}

      <h4 className="ex__dh">{b.como}</h4>
      <p className="ex__text">{d.entrenamiento}</p>

      <h4 className="ex__dh">{b.desarrolla}</h4>
      <ul className="ex__attrs">{d.atributos.map((a) => <li key={a}>{a}</li>)}</ul>

      {d.glosario?.length > 0 && (
        <>
          <h4 className="ex__dh">{b.glosario}</h4>
          <dl className="ex__gloss">
            {d.glosario.map((g) => (
              <div key={g.t}><dt>{g.t}</dt><dd>{g.d}</dd></div>
            ))}
          </dl>
        </>
      )}

      <button type="button" className="ex__reset" onClick={onReset}>{explore.verLas3}</button>
    </div>
  );
}

// Vídeo local de la disciplina (el mismo asset «-cell» que usa el 3D), sobre negro: `mix-blend-mode: screen` lo funde con el fondo.
// Un único pase silencioso; el fotograma fijo (poster) se queda si el móvil bloquea el autoplay. Un toque lo repite.
function DisciplineMedia({ discipline: d, label }) {
  const ref = useRef(null);
  const replay = () => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  };
  return (
    <div className="ex__media" role="group" aria-label={label}>
      <video
        ref={ref}
        src={d.video}
        poster={d.poster}
        muted
        playsInline
        preload="metadata"
        autoPlay={!prefersReducedMotion}
        onClick={replay}
        aria-label={`${d.name}: vídeo del personaje (toca para repetir)`}
      />
    </div>
  );
}
