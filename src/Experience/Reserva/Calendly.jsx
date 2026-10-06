import { useEffect, useRef, useState } from 'react';

const SRC = 'https://assets.calendly.com/assets/external/widget.js';

// Carga el script oficial de Calendly una sola vez y resuelve con window.Calendly.
function loadCalendly() {
  if (window.Calendly) return Promise.resolve(window.Calendly);
  return new Promise((resolve, reject) => {
    let s = document.querySelector(`script[src="${SRC}"]`);
    if (!s) {
      s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener('load', () => resolve(window.Calendly));
    s.addEventListener('error', reject);
  });
}

// Calendario inline (reserva directa). Si el script no carga, queda el enlace para abrirlo en otra pestaña.
export default function Calendly({ url, fallbackHref }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCalendly()
      .then((C) => {
        if (cancelled || !ref.current || !C?.initInlineWidget) return;
        ref.current.innerHTML = '';
        C.initInlineWidget({ url, parentElement: ref.current });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="rs__calendly">
      <div ref={ref} className="rs__calendly-frame" />
      {failed && <p className="ph-text">No se ha podido cargar el calendario. <a className="link" href={fallbackHref} target="_blank" rel="noopener noreferrer">Abrirlo en otra pestaña</a></p>}
    </div>
  );
}
