import { useCallback, useEffect, useState } from 'react';
import MiSMLAuth from './MiSMLAuth.jsx';
import MiSMLDashboard from './MiSMLDashboard.jsx';
import { getSession, watchSession } from './clientApi.js';
import './miSml.css';

// MI SML · zona privada del cliente (/mi-sml). Aplicación independiente de la experiencia pública: sin canvas 3D, sin scroll-scrub.
//
// Estado de autenticación — siempre uno de cuatro, y NADA de cliente se renderiza fuera de 'authenticated':
//   'loading'          → comprobando la sesión (no se muestra nada de cliente ni formulario)
//   'unauthenticated'  → no hay sesión: solo la entrada privada (MiSMLAuth)
//   'authenticated'    → sesión válida: MiSMLDashboard (consulta la API privada; todavía sin datos: la fuente es el PASO 4)
//   'error'            → el proveedor de autenticación falló: MiSMLAuth con reintento (sin detalles técnicos)
// La identidad sale SIEMPRE de la sesión: esta ruta no admite /mi-sml/<cliente> ni ?id=… (cualquier subruta o parámetro se ignora).
export default function MiSML() {
  const [auth, setAuth] = useState({ status: 'loading' });

  const comprobar = useCallback(() => {
    let vivo = true;
    setAuth({ status: 'loading' });
    getSession()
      .then((s) => { if (vivo) setAuth({ status: s.authenticated ? 'authenticated' : 'unauthenticated' }); })
      .catch(() => { if (vivo) setAuth({ status: 'error' }); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => comprobar(), [comprobar]);

  // Con sesión abierta, si termina (caduca o se cierra en otra pestaña) se vuelve a la entrada privada.
  useEffect(() => {
    if (auth.status !== 'authenticated') return undefined;
    return watchSession(() => setAuth({ status: 'unauthenticated' }));
  }, [auth.status]);

  // Zona privada: fuera de buscadores y con título propio. Al salir se restaura lo anterior.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Mi SML | Striking Motion Lab';
    let meta = document.querySelector('meta[name="robots"]');
    const prevRobots = meta ? meta.getAttribute('content') : null;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.setAttribute('content', 'noindex, nofollow');
    window.scrollTo(0, 0);
    return () => {
      document.title = prevTitle;
      if (prevRobots === null) meta.remove(); else meta.setAttribute('content', prevRobots);
    };
  }, []);

  return (
    <main className="msml" data-auth={auth.status}>
      <header className="msml__bar">
        <a className="msml__brand" href="/" aria-label="Striking Motion Lab — web pública">SML</a>
        <span className="msml__where">Mi SML</span>
      </header>

      {auth.status === 'loading' && <p className="msml__status" role="status" aria-live="polite">Comprobando acceso…</p>}
      {(auth.status === 'unauthenticated' || auth.status === 'error') && <MiSMLAuth status={auth.status} onRetry={comprobar} />}
      {auth.status === 'authenticated' && <MiSMLDashboard onSessionEnded={() => setAuth({ status: 'unauthenticated' })} />}
    </main>
  );
}
