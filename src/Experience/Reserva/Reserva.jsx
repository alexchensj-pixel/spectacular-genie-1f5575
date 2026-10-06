import { useEffect, useRef } from 'react';
import Chapter from '../Chapter.jsx';
import Calendly from './Calendly.jsx';
import { useStore } from '../../App/store.js';
import { reserva, site } from '../../Data/Content.js';
import { goToSection } from '../../Scene/Transitions/navigation.js';
import { useStation } from '../useStation.js';
import LegalLinks from '../../UI/Legal/LegalLinks.jsx';
import { FaqContextual } from '../Faq/Faq.jsx';

// 06 · RESERVA = la puerta de la escena es el destino: aproximación → puerta → reserva (Camera/waypoints.js#stageCamera). El contenido
// cuelga del centro del aro (useStation): crece según la cámara se acerca, y con la reserva abierta la cámara ya está dentro del umbral.
// Último paso. Elegir «Ya sé lo que quiero» abre la reserva; volver a tocarlo (mientras no esté confirmada) la cierra y devuelve a la puerta con las dos rutas.
// Dos caminos: reservar (calendario directo de la Sesión Privada) o volver a EXPLORE si todavía no lo tiene claro.
// V27: al entrar por RESERVAR (goToSection('book') = openBooking + salto directo) el calendario es lo primero que se ve; las rutas y el «después de reservar» van debajo.
export default function Reserva() {
  // El calendario se abre desde aquí o desde el hero / CTA fijo / navegación (irAReservar): una sola acción hasta la reserva.
  const status = useStore((s) => s.bookingState);
  const setStatus = useStore((s) => s.setBookingState);
  const openBooking = useStore((s) => s.openBooking);
  const reserving = status !== 'idle';
  const body = useRef(null);
  useStation(body, 'puerta', { d0: 5, min: 0.55, max: 1 });

  // Calendly avisa por postMessage cuando la persona confirma la cita.
  useEffect(() => {
    const onMsg = (e) => { if (e.data?.event === 'calendly.event_scheduled') setStatus('confirmed'); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [setStatus]);

  return (
    <Chapter id="reserva">
      <div ref={body} className="sp rs__body" data-on="true" data-reserving={reserving}>
        {reserving && (
          <div className="rs__panel">
            <p className="label">{reserva.subtitulo}</p>
            <h2 className="h2">{reserva.titulo}</h2>
            <p className="ph-text">{reserva.texto}</p>

            <Calendly url={site.calendly} fallbackHref={site.calendlyBase} />
            <p className="ph-text rs__legal"><LegalLinks /></p>
            {status === 'confirmed' && <p className="rs__ok">Reserva confirmada.</p>}
          </div>
        )}

        <div className="rs__paths">
          <button className="rs__path" data-route="directo" data-chosen={reserving || undefined} aria-expanded={reserving} onClick={status === 'open' ? () => setStatus('idle') : openBooking}>
            <span className="rs__route" aria-hidden="true" />
            <span className="rs__pathT">{reserva.caminos.directo.titulo}</span>
            <span className="rs__pathA">{reserva.caminos.directo.accion}</span>
          </button>
          <button className="rs__path" data-route="dudas" data-dim={reserving || undefined} onClick={() => goToSection('explore')}>
            <span className="rs__route" aria-hidden="true" />
            <span className="rs__pathT">{reserva.caminos.dudas.titulo}</span>
            <span className="rs__pathA">{reserva.caminos.dudas.accion}</span>
          </button>
        </div>

        {/* V27 · paso 7: la objeción de la última pantalla (misma pregunta de faq[]). */}
        <FaqContextual q="¿Cómo funciona la reserva?" />

        <details className="rs__after">
          <summary className="label">{reserva.despuesTitulo}</summary>
          <ol>{reserva.despues.map((t) => <li key={t}>{t}</li>)}</ol>
        </details>
      </div>
    </Chapter>
  );
}
