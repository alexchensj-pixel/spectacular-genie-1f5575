import { useRef, useState } from 'react';
import Chapter from '../Chapter.jsx';
import { dossierItems, evaluacionInicial, chapterById } from '../../Data/Content.js';
import { goToSection, scrollToChapterProgress } from '../../Scene/Transitions/navigation.js';
import { stepOf } from '../../Scene/Camera/waypoints.js';
import { useStation } from '../useStation.js';

// Escena 05 · SOBRE CHEN = exposición editorial en cuatro estaciones sobre la arquitectura 3D que ya existe
// (Environment/blockouts.jsx#Archive: nueve volúmenes verticales, con jerarquía de luz según la estación).
//   01 la persona → 02 la trayectoria → 03 la experiencia de los alumnos (Google) → 04 el siguiente paso (evaluación inicial).
// Cada estación es un pilar del archivo (Camera/waypoints.js#ARCHIVE_STATION_SLABS: los mismos que ilumina el 3D): la cámara se asienta
// en él, sus aristas se encienden y el contenido cuelga de su canto delantero (useStation): se mueve, crece y se encoge con la cámara.
// La foto cuelga del pilar de la primera estación: al avanzar la cámara queda atrás en el espacio, no se «retira» con CSS.
// El texto de cada estación es suyo (se ve solo en su estación). Todo el copy sale de Data/Content.js: nada inventado.
// El método (lo lee B2B) no se muestra aquí: vive en la escena 03.

// Reseña protagonista: la primera de resenasGoogle (la más completa). Cambiar el índice cambia cuál ocupa el plano principal.
const MAIN_REVIEW = 0;

// La foto de Chen es la aprobada para la trayectoria en los datos; aquí es la placa de toda la escena.
const foto = dossierItems.find((d) => d.imagen)?.imagen;
const FOTO_PIE = 'Competición federada FEKM · K1 y Muay Thai'; // deriva del alt aprobado de la foto

const ev = evaluacionInicial;
const base = dossierItems
  .filter((d) => d.id !== 'metodo')
  .map((d) => ({ ...d, imagen: undefined, texto: d.id === 'trayectoria' ? undefined : d.texto })); // la frase FEKM ya la dice «Chen»
const items = [...base, { id: 'siguiente', label: ev.titulo }];
const N = items.length;

// Etiqueta corta del índice (en móvil solo se despliega la de la estación activa).
const CORTA = { chen: 'Chen', trayectoria: 'Trayectoria', resenas: 'Alumnos', siguiente: 'Evaluación' };
const pad = (n) => String(n).padStart(2, '0');
// v29 · papel de cada pieza en la exposición: EVIDENCIA (la persona y su foto) → ARCHIVO (trayectoria) → PRUEBA SOCIAL (alumnos) → RESULTADO (siguiente paso).
const ROL = { chen: 'EVIDENCIA', trayectoria: 'ARCHIVO', resenas: 'PRUEBA SOCIAL', siguiente: 'RESULTADO' };

function Estacion({ item }) {
  const [mas, setMas] = useState(false); // reseñas secundarias: nivel 3, solo si se piden
  const rol = <p className="pf__role">{ROL[item.id]}</p>;
  if (item.id === 'chen') {
    return (
      <>
        {rol}
        <h2 className="pf__name">{item.label}</h2>
        {item.titulo && <p className="pf__lede">{item.titulo}</p>}
        {item.texto?.map((t) => <p key={t} className="pf__texto">{t}</p>)}
      </>
    );
  }
  if (item.id === 'trayectoria') {
    return (
      <>
        {rol}
        <h2 className="pf__h">{item.label}</h2>
        <dl className="pf__datos">
          {item.datos.map(([k, v]) => <div key={k} className="pf__dato"><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </>
    );
  }
  if (item.id === 'resenas') {
    const [fuente, valor] = item.datos[0];
    const principal = item.resenas[MAIN_REVIEW];
    const resto = item.resenas.filter((_, i) => i !== MAIN_REVIEW);
    return (
      <>
        {rol}
        <h2 className="pf__h">{item.label}</h2>
        <p className="pf__rating"><span>{fuente}</span>{valor}</p>
        <blockquote className="pf__main"><p>{principal}</p></blockquote>
        {resto.length > 0 && (
          <button type="button" className="pf__more" aria-expanded={mas} onClick={() => setMas((v) => !v)}>
            {mas ? 'Cerrar' : `+${resto.length}`} <i aria-hidden="true">{mas ? '−' : '+'}</i>
          </button>
        )}
        {mas && (
          <ul className="pf__resenas">
            {resto.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
        {item.enlace && <a className="link pf__link" href={item.enlace.href} target="_blank" rel="noopener noreferrer">{item.enlace.label}</a>}
      </>
    );
  }
  // Siguiente paso: evaluación inicial (mismo copy y mismo destino que la escena 03 → BOOK).
  return (
    <>
      {rol}
      <p className="pf__eval-k">{ev.kicker}</p>
      <h2 className="pf__h">{ev.titulo} <span className="pf__precio">{ev.precio}</span></h2>
      <p className="pf__texto">{ev.texto}</p>
      <p className="pf__nota">{ev.nota}</p>
      <button type="button" className="pf__cta" onClick={() => goToSection('book')}>{ev.cta}</button>
      <button type="button" className="pf__more" onClick={() => goToSection('training')}>Elegir mi entrenamiento</button>
    </>
  );
}

// Placa colgada del pilar de su estación (ver useStation.js). `on` = es la estación en curso (las demás quedan en su pilar, invisibles).
function Placa({ id, on, className, children }) {
  const ref = useRef(null);
  useStation(ref, id, { d0: 6.4, min: 0.6, max: 1.15 });
  return (
    <div ref={ref} className={`sp ${className}`} data-on={on} aria-hidden={on ? undefined : true} inert={on ? undefined : ''}>
      {children}
    </div>
  );
}

export default function ProofChen() {
  const [active, setActive] = useState(0);
  const onProgress = (p) => setActive(stepOf(p, N));

  return (
    <Chapter id="proof-chen" onProgress={onProgress}>
      <div className="pf" data-stage={active}>
        <ol className="pf__rule" aria-label={chapterById['proof-chen'].label}>
          {items.map((d, i) => (
            <li key={d.id} data-on={i === active}>
              <button type="button" aria-current={i === active ? 'step' : undefined} onClick={() => scrollToChapterProgress('proof-chen', (i + 0.5) / N)}>
                <span className="pf__rn">{pad(i + 1)}</span>
                <span className="pf__rl">{CORTA[d.id]}</span>
              </button>
            </li>
          ))}
        </ol>

        {foto && (
          <Placa id="archivo-foto" on className="pf__plate">
            <img className="pf__img" src={foto.src} alt={foto.alt} decoding="async" />
            <p className="pf__cap"><span className="pf__role">{ROL.chen}</span> {FOTO_PIE}</p>
          </Placa>
        )}

        {items.map((it, i) => (
          <Placa key={it.id} id={`archivo-${i}`} on={i === active} className="pf__est">
            <Estacion item={it} />
          </Placa>
        ))}
      </div>
    </Chapter>
  );
}
