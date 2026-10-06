import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../App/store.js';
import { b2b } from '../../Data/B2B.js';
import { waLink } from '../../Data/Content.js';
import { RUTAS, consentimientoPolitica as cp } from '../../Data/Legal.js';
import LegalLinks from '../../UI/Legal/LegalLinks.jsx';
import { prefersReducedMotion } from '../../Scene/Transitions/scrollState.js';

// EXPERIENCES (V22 · paso 6) — «SML también sale del gimnasio.» Línea de negocio B2B, separada de las clases B2C.
// Una sola pantalla con scroll vertical: Experiences → Categorías → Selected Work → Case Study → Contacto.
// Capa propia sobre el canvas existente (no añade capítulos, no mueve la cámara, no crea escena 3D). Se abre con goToSection('experiences')
// (store: b2bOpen/openB2B/closeB2B, ya existentes). Estado propio y LOCAL: la categoría elegida (`cat`) y si el contacto está en pantalla.
// No lee ni escribe selectedGoal / selectedFormat / selectedFrequency / selectedTrainingMode / planHibrido / bookingState.

function Clip({ m }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    v.muted = true; // iOS/Safari: el autoplay solo se permite en mudo
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return undefined;
    // No se descarga hasta que entra en pantalla; fuera de pantalla se pausa (batería y datos en móvil).
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause(); }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  // Con «reducir movimiento» no se autoreproduce: póster con controles. El póster siempre se ve aunque el móvil bloquee el autoplay.
  return <video ref={ref} className="xp__el" src={m.src} poster={m.poster} muted loop playsInline preload="none" controls={prefersReducedMotion || undefined} aria-label={m.alt} />;
}

const Etiqueta = ({ estado, children }) => <span className="xp__tag" data-estado={estado}>{children}</span>;

function Fig({ m }) {
  return (
    <figure className="xp__fig">
      <div className="xp__figM">
        {m.tipo === 'video' ? <Clip m={m} /> : <img className="xp__el" src={m.src} alt={m.alt} loading="lazy" decoding="async" />}
      </div>
      <figcaption>{m.pie}</figcaption>
    </figure>
  );
}

// CATEGORÍAS: cinco botones grandes (tocar = abrir/cerrar). Cada una muestra su línea sin tocar nada; al elegirla aparece su respaldo real (si lo hay).
function Categorias({ cat, setCat, goTo }) {
  const c = b2b.categorias;
  return (
    <div className="xp__catsW">
      <p className="xp__k">{c.k}</p>
      <ul className="xp__cats">
        {c.items.map((it) => {
          const on = it.id === cat;
          return (
            <li key={it.id} className="xp__cat" data-on={on || undefined}>
              <button type="button" className="xp__catB" aria-expanded={on} aria-controls={`xp-cat-${it.id}`} onClick={() => setCat(on ? null : it.id)}>
                <span className="xp__catN">{it.nombre}</span>
                <span className="xp__catL">{it.linea}</span>
              </button>
              {on && (
                <div className="xp__catD" id={`xp-cat-${it.id}`}>
                  {it.respaldo && <p className="xp__resp"><Etiqueta estado={it.respaldo.estado}>{it.respaldo.etiqueta}</Etiqueta><span>{it.respaldo.texto}</span></p>}
                  <div className="xp__acts">
                    {it.respaldo?.work && <button type="button" className="xp__link" onClick={() => goTo('work')}>{c.verTrabajo} →</button>}
                    <button type="button" className="xp__link" onClick={() => goTo('contacto')}>{c.contar} →</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SelectedWork({ goTo }) {
  const s = b2b.seleccion, p = s.proyecto;
  return (
    <div className="xp__work">
      <p className="xp__k xp__k--red">{s.k}</p>
      <article className="xp__proj">
        <div className="xp__projM"><img className="xp__el" src={p.portada} alt={p.alt} loading="lazy" decoding="async" /></div>
        <div className="xp__projT">
          <p className="xp__tags"><Etiqueta estado={p.estado}>{p.etiqueta}</Etiqueta><Etiqueta>{p.categoria}</Etiqueta></p>
          <h2 className="xp__h2">{p.nombre}</h2>
          <p className="xp__sub">{p.sub}</p>
          <p className="xp__txt">{p.resumen}</p>
          <button type="button" className="xp__link" onClick={() => goTo('case')}>{s.cta} ↓</button>
        </div>
      </article>
    </div>
  );
}

// CASE STUDY: cinco apartados fijos. Solo se pinta lo que existe en los datos (nada se fabrica).
function CaseStudy() {
  const c = b2b.caso;
  return (
    <div className="xp__case">
      <p className="xp__k">{c.k} · {c.nombre}</p>
      {c.bloques.map((b) => (
        <section key={b.id} className="xp__blk" data-id={b.id} aria-label={b.k}>
          <header className="xp__blkH">
            <span className="xp__blkK">{b.k}</span>
            <h3 className="xp__blkQ">{b.pregunta}</h3>
          </header>
          <div className="xp__blkB">
            {b.texto.map(([k, t]) => <p key={t} className="xp__txt">{k && <b>{k}. </b>}{t}</p>)}
            {b.datos && (
              <div>
                <p className="xp__k">{b.planteadoK}</p>
                <dl className="xp__datos">{b.datos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </div>
            )}
            {b.medios && <div className="xp__media">{b.medios.map((id) => <Fig key={id} m={c.medios[id]} />)}</div>}
          </div>
        </section>
      ))}
    </div>
  );
}

// CONTACTO: el mecanismo de siempre (WhatsApp con el mensaje ya escrito, sin backend), reducido a lo necesario para iniciar la conversación.
function Contacto({ cat }) {
  const ct = b2b.contacto;
  const [error, setError] = useState(false);
  const [errorPol, setErrorPol] = useState(false);
  const tipos = [...b2b.categorias.items.map((i) => i.nombre), ct.otro];
  const defecto = b2b.categorias.items.find((i) => i.id === cat)?.nombre ?? '';
  const enviar = (e) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const get = (k) => String(d.get(k) ?? '').trim();
    if (!get('nombre') || !get('contacto')) { setError(true); return; }
    setError(false);
    // Sin aceptar la Política de Privacidad no se compone ni se abre nada.
    if (d.get('privacidad') !== 'on') { setErrorPol(true); return; }
    setErrorPol(false);
    const lines = ['Hola, te cuento un proyecto para Striking Motion Lab.', `Nombre: ${get('nombre')}`, `WhatsApp / email: ${get('contacto')}`];
    [['tipo', 'Tipo de proyecto'], ['empresa', 'Empresa / organización'], ['mensaje', 'Proyecto']].forEach(([k, l]) => { if (get(k)) lines.push(`${l}: ${get(k)}`); });
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
  };
  return (
    <div className="xp__ct">
      <div className="xp__ctT">
        <h2 className="xp__h2">{ct.titular}</h2>
        <p className="xp__lead">{ct.lead}</p>
        <a className="xp__link" href={waLink(ct.mensajeDirecto)} target="_blank" rel="noopener noreferrer">{ct.directo} →</a>
      </div>
      <form className="xp__form" onSubmit={enviar} noValidate>
        <label><span>Nombre *</span><input name="nombre" autoComplete="name" required /></label>
        <label><span>WhatsApp / email *</span><input name="contacto" autoComplete="tel" required /></label>
        <label><span>{ct.tipoLabel}</span>
          <select name="tipo" key={defecto} defaultValue={defecto}>
            <option value="">{ct.tipoVacio}</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label><span>Empresa / organización</span><input name="empresa" autoComplete="organization" /></label>
        <label><span>Tu proyecto (opcional)</span><textarea name="mensaje" rows={3} /></label>
        <label className="xp__consent"><input name="privacidad" type="checkbox" required onChange={(e) => { if (e.target.checked) setErrorPol(false); }} /><span>{cp.pre} <a href={RUTAS.privacidad} target="_blank" rel="noopener noreferrer">{cp.enlace}</a>. *</span></label>
        {errorPol && <p className="xp__err" role="alert">{cp.error}</p>}
        {error && <p className="xp__err" role="alert">{ct.error}</p>}
        <div className="xp__send">
          <button type="submit" className="xp__cta">{ct.enviar}</button>
          <p className="xp__note">{ct.envio}</p>
          <p className="xp__note"><LegalLinks /></p>
        </div>
      </form>
    </div>
  );
}

export default function B2B() {
  const open = useStore((s) => s.b2bOpen);
  const close = useStore((s) => s.closeB2B);
  const stage = useRef(null);
  const from = useRef(null);
  const [cat, setCat] = useState(null);                 // categoría explorada (estado LOCAL de Experiences)
  const [enContacto, setEnContacto] = useState(false);  // el contacto ocupa la pantalla → se oculta el CTA de contacto

  // Acceso directo por enlace (#empresas): quien llega buscando B2B no recorre la experiencia particular.
  useEffect(() => { if (window.location.hash === '#empresas') useStore.getState().openB2B(0); }, []);

  const goTo = useCallback((id) => {
    const el = stage.current?.querySelector(`[data-sec="${id}"]`);
    if (el) stage.current.scrollTo({ top: el.offsetTop, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    from.current = document.activeElement;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';       // la página queda congelada en su sitio; al cerrar, sin saltos
    history.replaceState(null, '', '#empresas');
    stage.current?.focus({ preventScroll: true }); // el foco en el contenedor permite desplazarse con teclado
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = prev;
      history.replaceState(null, '', window.location.pathname + window.location.search);
      from.current?.focus?.();
    };
  }, [open, close]);

  // ¿Está el contacto en pantalla? (oculta el CTA fijo de contacto, que en móvil vive abajo).
  useEffect(() => {
    if (!open || typeof IntersectionObserver === 'undefined') return undefined;
    const root = stage.current;
    const target = root?.querySelector('[data-sec="contacto"]');
    if (!root || !target) return undefined;
    const io = new IntersectionObserver(([en]) => setEnContacto(en.isIntersecting), { root, threshold: 0.25 });
    io.observe(target);
    return () => io.disconnect();
  }, [open]);

  if (!open) return null;
  return (
    <section id="xp" role="region" aria-label="Experiences">
      <header className="xp__top">
        <span className="xp__brand">SML</span>
        <span className="xp__where">{b2b.marca}</span>
        <span className="xp__topBtns">
          {!enContacto && <button type="button" className="xp__cta xp__cta--sm xp__cta--top" onClick={() => goTo('contacto')}>{b2b.contactoCta}</button>}
          <button type="button" className="xp__close" onClick={close}>{b2b.volver} ×</button>
        </span>
      </header>

      <main className="xp__stage" ref={stage} tabIndex={0} aria-label="Experiences: recorrido vertical">
        <div className="xp__sec" data-sec="categorias">
          <p className="xp__kick">{b2b.hero.kicker}</p>
          <h1 className="xp__h1">{b2b.hero.titular.map((l) => <span key={l}>{l}</span>)}</h1>
          <p className="xp__lead">{b2b.hero.lead}</p>
          <Categorias cat={cat} setCat={setCat} goTo={goTo} />
        </div>
        <div className="xp__sec" data-sec="work"><SelectedWork goTo={goTo} /></div>
        <div className="xp__sec" data-sec="case"><CaseStudy /></div>
        <div className="xp__sec" data-sec="contacto"><Contacto cat={cat} /></div>
      </main>

      {!enContacto && (
        <div className="xp__bar">
          <button type="button" className="xp__cta" onClick={() => goTo('contacto')}>{b2b.contactoCta}</button>
        </div>
      )}
    </section>
  );
}
