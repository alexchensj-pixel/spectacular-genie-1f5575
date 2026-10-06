import { RUTAS } from '../../Data/Legal.js';

// Enlaces a las páginas legales. Se abren en pestaña nueva: así quien está rellenando un formulario (o dentro del recorrido B2B) no pierde lo escrito.
export default function LegalLinks({ className = '', sep = ' · ' }) {
  return (
    <span className={className}>
      <a href={RUTAS.privacidad} target="_blank" rel="noopener noreferrer">Política de Privacidad</a>{sep}
      <a href={RUTAS.aviso} target="_blank" rel="noopener noreferrer">Aviso Legal</a>
    </span>
  );
}
