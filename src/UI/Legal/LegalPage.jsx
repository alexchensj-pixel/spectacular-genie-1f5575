import { useEffect } from 'react';
import { legal, PENDIENTE, RUTAS } from '../../Data/Legal.js';

// Página legal independiente (sin canvas 3D ni scroll-scrub). Se monta desde main.jsx según la ruta.
const Pend = ({ children }) => (String(children).includes(PENDIENTE)
  ? String(children).split(PENDIENTE).flatMap((t, i, a) => (i < a.length - 1 ? [t, <mark key={i} className="legal__pend">{PENDIENTE}</mark>] : [t]))
  : children);

export default function LegalPage({ tipo }) {
  const p = legal[tipo];
  useEffect(() => { document.title = `${p.titulo} | Striking Motion Lab`; window.scrollTo(0, 0); }, [p]);

  return (
    <main className="legal">
      <a className="legal__back" href="/">← Volver a Striking Motion Lab</a>
      <h1 className="legal__h1">{p.titulo}</h1>
      <p className="legal__aviso" role="note">Borrador pendiente de completar por SML. Los campos marcados como <mark className="legal__pend">{PENDIENTE}</mark> aún no tienen datos confirmados y no se han rellenado.</p>

      {p.secciones.map((s) => (
        <section key={s.h} className="legal__sec">
          <h2 className="legal__h2">{s.h}</h2>
          {s.tabla && <dl className="legal__dl">{s.tabla.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><Pend>{v}</Pend></dd></div>)}</dl>}
          {s.items && <ul className="legal__ul">{s.items.map(([k, v]) => <li key={k}><b>{k}.</b> <Pend>{v}</Pend></li>)}</ul>}
          {s.texto && s.texto.map((t) => <p key={t}><Pend>{t}</Pend></p>)}
        </section>
      ))}

      <nav className="legal__nav" aria-label="Información legal">
        <a href={RUTAS.privacidad}>Política de Privacidad</a>
        <a href={RUTAS.aviso}>Aviso Legal</a>
      </nav>
    </main>
  );
}
