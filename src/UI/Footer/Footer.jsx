import { useState } from 'react';
import { site, waLink, cierre } from '../../Data/Content.js';
import { goToSection, irAReservar } from '../../Scene/Transitions/navigation.js';
import { useStore } from '../../App/store.js';
import LegalLinks from '../Legal/LegalLinks.jsx';
import { RUTAS, consentimientoPolitica as cp } from '../../Data/Legal.js';

const MODALIDADES = ['1:1', 'Parejas', 'Grupo reducido', 'Plan Arsenal', 'Plan Striker', 'Plan Fight IQ', 'Empresa / Hotel / Evento', 'No lo sé todavía'];

// Contenido que en la web anterior vivía FUERA del recorrido principal: cierre y contacto (el recorrido de empresas vive en Experience/B2B).
// Es DOM normal (sin scroll-scrub) y va después del capítulo 06. La FAQ ya no vive aquí: ver Experience/Faq/Faq.jsx (entre 04 y 05).
export default function Footer() {
  const [error, setError] = useState(false);
  const [errorPol, setErrorPol] = useState(false);

  // Sin backend: construye un mensaje de WhatsApp con los datos y abre wa.me con el texto ya escrito.
  const onSubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const get = (k) => String(d.get(k) ?? '').trim();
    if (!get('name') || !get('telefono')) { setError(true); return; }
    setError(false);
    // Sin aceptar la Política de Privacidad no se compone ni se abre nada.
    if (d.get('privacidad') !== 'on') { setErrorPol(true); return; }
    setErrorPol(false);
    const lines = ['Hola, quiero información sobre Striking Motion Lab.', `Nombre: ${get('name')}`, `WhatsApp/Teléfono: ${get('telefono')}`];
    [['email', 'Email'], ['modalidad', 'Modalidad'], ['zona', 'Zona'], ['disponibilidad', 'Disponibilidad'], ['objetivo', 'Objetivo'], ['message', 'Mensaje']]
      .forEach(([k, label]) => { if (get(k)) lines.push(`${label}: ${get(k)}`); });
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
  };

  return (
    <footer className="foot">
      <section className="foot__cierre" aria-labelledby="cierre-h">
        <h2 id="cierre-h" className="h2">{cierre.titulo}</h2>
        <p className="ph-text">{cierre.texto}</p>
        <div className="foot__rutas">
          <div className="foot__ruta">
            <p className="label">¿Ya sabes qué quieres?</p>
            <button type="button" className="btn foot__rutaBtn" onClick={() => irAReservar()}>Reservar</button>
          </div>
          <div className="foot__ruta">
            <p className="label">¿No?</p>
            <button type="button" className="btn foot__rutaBtn" onClick={() => goToSection('explore')}>Descubrir</button>
          </div>
          <div className="foot__ruta">
            <p className="label">¿Eres empresa, hotel o evento?</p>
            <button type="button" className="btn foot__rutaBtn" onClick={() => goToSection('experiences')}>Hablar con SML</button>
          </div>
        </div>
        <p className="label">{site.ciudad} · {site.disciplinas}</p>
      </section>

      <section className="foot__contacto">
        <div>
          <p className="foot__brand">{site.nombre}</p>
          <p className="label">{site.claim}</p>
        </div>
        <div className="foot__col">
          <p className="label">Contacto</p>
          <a href={waLink('Hola, quiero información sobre los entrenamientos de Striking Motion Lab.')} target="_blank" rel="noopener noreferrer">WhatsApp — {site.whatsappVisible}</a>
          <a href={site.instagram.url} target="_blank" rel="noopener noreferrer">Instagram — {site.instagram.handle}</a>
          <a href={site.maps} target="_blank" rel="noopener noreferrer">Google Maps</a>
          <button type="button" className="foot__link" onClick={() => useStore.getState().openB2B(0)}>Empresas</button>
          <button type="button" className="foot__link" onClick={() => irAReservar()}>Reservar</button>
        </div>

        <details className="foot__formWrap">
        <summary className="label">Escríbeme</summary>
        <form className="foot__form" onSubmit={onSubmit} noValidate>
          <label>Nombre<input name="name" type="text" autoComplete="name" required /></label>
          <label>WhatsApp / Teléfono<input name="telefono" type="tel" autoComplete="tel" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" /></label>
          <label>Modalidad
            <select name="modalidad" defaultValue={MODALIDADES[0]}>
              {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>Zona de Madrid<input name="zona" type="text" autoComplete="address-level2" /></label>
          <label>Disponibilidad<input name="disponibilidad" type="text" placeholder="Ej. tardes entre semana" /></label>
          <label>Objetivo del entrenamiento<input name="objetivo" type="text" /></label>
          <label>Información adicional<textarea name="message" rows={2} /></label>
          <label className="foot__consent"><input name="privacidad" type="checkbox" required onChange={(e) => { if (e.target.checked) setErrorPol(false); }} /><span>{cp.pre} <a href={RUTAS.privacidad} target="_blank" rel="noopener noreferrer">{cp.enlace}</a>. *</span></label>
          <button className="btn" type="submit">Enviar por WhatsApp</button>
          {errorPol && <p className="foot__error" role="alert">{cp.error}</p>}
          {error && <p className="foot__error" role="alert">Falta tu nombre o tu WhatsApp/teléfono para poder escribirte.</p>}
          <p className="ph-text">Al pulsar «Enviar», se abre WhatsApp con estos datos ya escritos — solo tienes que confirmar el envío.</p>
        </form>
        </details>
      </section>

      <p className="foot__bottom label">© 2026 Striking Motion Lab. Madrid, España. · <LegalLinks className="foot__legal" /></p>
    </footer>
  );
}
