import { useEffect, useState } from 'react';
import { getCurrentClient, signOut } from './clientApi.js';

// MI SML · zona privada tras la autenticación — ESTRUCTURA VACÍA PREPARADA, no el dashboard. Solo se monta con sesión válida (MiSML.jsx).
// Pide los datos a clientApi.getCurrentClient() (única fuente), que consulta la API privada. Hoy la API reconoce la sesión pero responde
// 'not-connected' (la fuente de datos es el PASO 4): es el estado esperado y demuestra que sesión y API se comunican; no se pinta ningún dato. Si más adelante la API devuelve datos, aquí se construirán plan, pago, clases y movement analysis.
export default function MiSMLDashboard({ onSessionEnded }) {
  const [estado, setEstado] = useState({ status: 'loading' });

  useEffect(() => {
    let vivo = true;
    getCurrentClient()
      .then((client) => { if (vivo) setEstado({ status: 'ready', client }); })
      .catch((error) => {
        if (!vivo) return;
        if (error?.code === 'unauthenticated') { onSessionEnded?.(); return; } // la API rechazó la sesión (caducada o no válida)
        setEstado({ status: error?.code === 'not-connected' ? 'pending' : 'error' });
      });
    return () => { vivo = false; };
  }, []);

  const salir = async () => { try { await signOut(); } catch { /* el cierre falló: la sesión sigue abierta y se queda en pantalla */ } }; // con Auth0, signOut redirige fuera

  return (
    <section className="msml__panel" aria-label="Mi SML">
      <h1 className="msml__title">Mi SML</h1>
      {estado.status === 'loading' && <p className="msml__status" role="status" aria-live="polite">Cargando…</p>}
      {estado.status === 'pending' && <p className="msml__note">Tu zona privada está activa. Tus datos todavía no están disponibles.</p>}
      {estado.status === 'error' && <p className="msml__note" role="alert">No hemos podido cargar tus datos.</p>}
      {estado.status === 'ready' && estado.client?.nombre && <p className="msml__lead">{estado.client.nombre}</p>}
      <button type="button" className="msml__btn msml__btn--ghost" onClick={salir}>Salir</button>
    </section>
  );
}
