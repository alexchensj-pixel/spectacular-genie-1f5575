import { useState } from 'react';
import { isAuthConfigured, signIn } from './clientApi.js';

// MI SML · entrada privada. Es lo ÚNICO que ve quien no está autenticado: ningún dato de cliente y ningún formulario de contraseña propio.
// El acceso lo presenta el proveedor (Auth0 Universal Login): las credenciales se escriben allí, nunca en SML. Este botón solo existe cuando
// el proveedor está configurado (VITE_AUTH0_DOMAIN y VITE_AUTH0_CLIENT_ID). Los fallos se muestran sin detalles técnicos.
export default function MiSMLAuth({ status, onRetry }) {
  const [entrando, setEntrando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const listo = isAuthConfigured();

  const entrar = async () => {
    setEntrando(true); setFallo(false);
    try { await signIn(); } catch { setFallo(true); setEntrando(false); } // si va bien, el navegador sale hacia el acceso del proveedor
  };

  return (
    <section className="msml__gate" aria-labelledby="msml-gate-h">
      <p className="msml__kicker">Striking Motion Lab</p>
      <h1 className="msml__title" id="msml-gate-h">Mi SML</h1>
      <p className="msml__lead">Zona privada de clientes.</p>

      {status === 'error' && (
        <div className="msml__note" role="alert">
          <p>No hemos podido comprobar tu acceso.</p>
          <button type="button" className="msml__btn msml__btn--ghost" onClick={onRetry}>Reintentar</button>
        </div>
      )}

      {status !== 'error' && listo && (
        <div className="msml__actions">
          <button type="button" className="msml__btn" onClick={entrar} disabled={entrando}>{entrando ? 'Accediendo…' : 'Acceder'}</button>
          {fallo && <p className="msml__note" role="alert">No se ha podido iniciar el acceso. Inténtalo de nuevo.</p>}
        </div>
      )}

      {status !== 'error' && !listo && <p className="msml__note">El acceso de clientes todavía no está activo.</p>}

      <a className="msml__back" href="/">← Volver a Striking Motion Lab</a>
    </section>
  );
}
