// Assets reales (vídeo e imagen) importados en un único sitio. Vite los procesa y devuelve la URL final con hash.
// Para cambiar un asset: reemplaza el archivo en src/Assets/... (mismo nombre) o cambia el import aquí.
// Los tres vídeos «-cell» son los luchadores sobre NEGRO puro, sin audio y sin marcas de agua (procesados del original).
import boxeoCell from '../Assets/Video/boxeo-cell.mp4';
import k1Cell from '../Assets/Video/k1-cell.mp4';
import muayThaiCell from '../Assets/Video/muay-thai-cell.mp4';
import rosterCompleto from '../Assets/Video/roster-completo.mp4';
// Los dos huecos reservados en el Bridge (BridgeHall.jsx#PODIUM_X) — mismo tratamiento que el resto: vídeo
// sobre negro puro, sin audio. Nombres semánticos explícitos: cada import identifica literalmente a qué
// personaje pertenece, para eliminar la ambigüedad que antes tenían "personaje1"/"personaje2" (que no
// tenían relación fija con quién era quién y llevaron a un mapping cruzado real).
import tysonBridge from '../Assets/Video/TYSON_Bridge.mp4';
import mcgregorBridge from '../Assets/Video/MCGREGOR_Bridge.mp4';
import stillBoxeo from '../Assets/Images/still-boxeo.jpg';
import stillK1 from '../Assets/Images/still-k1.jpg';
import stillMuayThai from '../Assets/Images/still-muay-thai.jpg';
import stillRoster from '../Assets/Images/roster-completo-poster.jpg';
import heroLab from '../Assets/Images/hero-lab.jpg';
import chenAzotea from '../Assets/Images/chen-azotea.jpg';
import chenRing from '../Assets/Images/chen-ring.jpg';
import bridgeHallRef from '../Assets/Images/bridge-hall-reference.jpg';

// Caso real El Corte Inglés × agencia de viajes a Tailandia (material del evento, seleccionado y recortado: fotos 4:5 / 5:4,
// clips verticales 4:5 sin audio, mismo tratamiento de color). Solo lo usa Data/B2B.js → casos.
import eciEspacio from '../Assets/Images/eci/eci-espacio.jpg';
import eciSet from '../Assets/Images/eci/eci-set.jpg';
import eciParticipacion from '../Assets/Images/eci/eci-participacion.jpg';
import eciPublico from '../Assets/Images/eci/eci-publico.jpg';
import eciDemostracionPoster from '../Assets/Images/eci/eci-demostracion-poster.jpg';
import eciPadsPoster from '../Assets/Images/eci/eci-pads-poster.jpg';
import eciDemostracion from '../Assets/Video/eci/eci-demostracion.mp4';
import eciPads from '../Assets/Video/eci/eci-pads.mp4';

export const eci = {
  espacio: eciEspacio, set: eciSet, participacion: eciParticipacion, publico: eciPublico,
  demostracion: eciDemostracion, demostracionPoster: eciDemostracionPoster, pads: eciPads, padsPoster: eciPadsPoster,
};

// ENTRENAMIENTO · material real (sala / exterior). Se activa SOLO al dejar los archivos en estas carpetas (nombres fijos):
//   src/Assets/Video/entrenamiento/sala.mp4       + src/Assets/Images/entrenamiento/sala-poster.jpg      → «Una sesión real»
//   src/Assets/Video/entrenamiento/exterior.mp4   + src/Assets/Images/entrenamiento/exterior-poster.jpg  → «También al aire libre»
//   src/Assets/Images/entrenamiento/sala.jpg                                                              → foto de la sala (opcional)
// Prepara cada clip (recorte 3–5 s, sin audio, optimizado) con scripts/prepare-media.sh. Sin archivos no se pinta nada.
const byName = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k.split('/').pop().replace(/\.[^.]+$/, ''), v]));
const entVideos = byName(import.meta.glob('../Assets/Video/entrenamiento/*.mp4', { eager: true, query: '?url', import: 'default' }));
const entImages = byName(import.meta.glob('../Assets/Images/entrenamiento/*.{jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }));
export const entrenamientoMedia = {
  sala: entVideos.sala ? { src: entVideos.sala, poster: entImages['sala-poster'], alt: 'Sesión privada en interior: trabajo de manoplas y patadas con un alumno, con marcadores de seguimiento técnico.', pie: 'Una sesión real.' } : null,
  exterior: entVideos.exterior ? { src: entVideos.exterior, poster: entImages['exterior-poster'], alt: 'Sesión privada al aire libre en un parque de Madrid: trabajo de manoplas con un alumno.', pie: 'También al aire libre, adaptado al espacio.' } : null,
  salaFoto: entImages.sala ? { src: entImages.sala, alt: 'La sala de entrenamiento de Muay Thai.' } : null,
};

export const video = {
  boxeo: boxeoCell, k1: k1Cell, muayThai: muayThaiCell, roster: rosterCompleto,
  // Claves semánticas explícitas — usadas en BridgeHall.jsx para el podio de Tyson/McGregor.
  tysonBridge, mcgregorBridge,
};
// Primer fotograma de cada vídeo: se ve mientras carga, en reposo y cuando el móvil bloquea el autoplay.
// "roster" = vídeo REAL de los tres personajes juntos (loop del estado overview de Character Select).
export const poster = { boxeo: stillBoxeo, k1: stillK1, muayThai: stillMuayThai, roster: stillRoster };
// "bridgeHallRef" = foto de referencia real de la nave (pasarela central, columnas, galerías). Se usa
// SOLO como telón de fondo lejano en BridgeHall.jsx (Z_FAR, detrás de toda la geometría 3D existente),
// nunca como textura sobre la estructura: la nave sigue siendo 100% geometría real.
export const image = { heroLab, chenAzotea, chenRing, bridgeHallRef };
