import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { anchorZ } from '../../Camera/waypoints.js';
import { CELL, cellX } from '../cells.js';
import { linesGeometry, rulerSegs, smoothstep } from './geo.js';
import { getCharactersReveal } from '../../Transitions/scrollState.js';

// Ventana/portal ÚNICO que hace de puente 01 → 02, ANTES de que AthleteSlots.jsx reparta sus tres
// escuadras en las vitrinas individuales. Reutiliza el mismo lenguaje de líneas que el resto de la
// Entrada (geo.js#linesGeometry/rulerSegs) — no se inventa geometría nueva.
//
// Cerrada mientras getCharactersReveal() (el MISMO reveal que ya rige WireBox/Pillars, blockouts.jsx) esté
// a 0, y se desvanece en EXACTA proporción inversa a él (closed = 1 - reveal): así nunca hay un tramo en que
// el marco todavía se vea Y el volumen de Scene 02 ya se vea — solo puede haber UNO de los dos visible en
// cada instante, nunca los dos a la vez ("no debe haber dos estructuras que parezcan el volumen de Scene 02").
//
// Viaja en Z pegada al vídeo de conjunto (RosterGroup.jsx, montado en Pillars/character-select): misma
// getCharactersReveal() + mismo APPROACH_Z que ya usa ese componente, así marco y vídeo no se separan
// sin necesidad de tocar RosterGroup.jsx.
const CS_Z = anchorZ(1);
const APPROACH_Z = 14; // idéntico a RosterGroup.jsx

const FRAME_W = (cellX(2) - cellX(0)) + CELL.size[0] * 1.6; // ancho conjunto de las 3 posiciones + margen
const FRAME_H = CELL.size[1];                                // misma altura que la vitrina destino
const FRAME_DEPTH = 0.5;                                      // desplazamiento del segundo marco — sutil

// Contorno rectangular simple (4 segmentos), mismo patrón que linesGeometry ya usa en el resto del sistema.
function frameSegs(w, h, z) {
  const x0 = -w / 2, x1 = w / 2, y0 = 0, y1 = h;
  return [
    [x0, y0, z, x1, y0, z],
    [x1, y0, z, x1, y1, z],
    [x1, y1, z, x0, y1, z],
    [x0, y1, z, x0, y0, z],
  ];
}

export default function TransitionFrame() {
  const group = useRef(null);
  const frontMat = useRef(null);
  const backMat = useRef(null);
  const cornerMat = useRef(null);
  const tickMats = useRef([]);

  // Marco frontal + marco trasero ligeramente más pequeño y desplazado en Z: la misma idea de "profundidad
  // por doble contorno" que ya usa Portals.jsx (columna + regla), aquí aplicada a un rectángulo entero.
  const frontGeo = useMemo(() => linesGeometry(frameSegs(FRAME_W, FRAME_H, 0)), []);
  const backGeo = useMemo(
    () => linesGeometry(frameSegs(FRAME_W * 0.94, FRAME_H * 0.94, 0)),
    []
  );
  // Conexiones cortas entre las 4 esquinas del marco frontal y el trasero — mismo espíritu que las placas
  // de anclaje de Portals.jsx, aquí como simples segmentos.
  const cornerGeo = useMemo(() => {
    const fx = [-FRAME_W / 2, FRAME_W / 2];
    const fy = [0, FRAME_H];
    const bx = [-FRAME_W * 0.47, FRAME_W * 0.47];
    const by = [FRAME_H * 0.03, FRAME_H * 0.97];
    const segs = [];
    fx.forEach((x, i) => fy.forEach((y, j) => {
      segs.push([x, y, 0, bx[i], by[j], -FRAME_DEPTH]);
    }));
    return linesGeometry(segs);
  }, []);

  // Referencia vertical MUY discreta por posición futura: la MISMA regla (rulerSegs) que ya usa Portals.jsx
  // y AthleteSlots.jsx, aquí a un tercio de altura — solo anticipa BOXEO | K1 | MUAY THAI, no construye
  // ninguna vitrina completa todavía.
  const tickGeo = useMemo(() => linesGeometry(rulerSegs(FRAME_H * 0.32)), []);
  const tickX = useMemo(() => [cellX(0), cellX(1), cellX(2)], []);

  useFrame(({ camera }) => {
    const reveal = getCharactersReveal();
    const z = CS_Z + APPROACH_Z * (1 - reveal);
    if (group.current) group.current.position.set(0, 0, z);

    // Presencia: misma lógica de proximidad que el resto de la Entrada (aparece al acercarse la cámara),
    // multiplicada por "cerrado" — que ahora es exactamente 1 - reveal, el mismo reveal que hace aparecer
    // WireBox/Pillars, así el relevo entre ambos es instantáneo y sin solape en ningún punto del recorrido.
    const d = Math.abs(camera.position.z - z);
    const proximity = 1 - smoothstep(d, 6, 24);
    const closed = 1 - reveal;
    const op = proximity * closed;

    if (frontMat.current) frontMat.current.opacity = 0.4 * op;
    if (backMat.current) backMat.current.opacity = 0.22 * op;
    if (cornerMat.current) cornerMat.current.opacity = 0.16 * op;
    tickMats.current.forEach((m) => { if (m) m.opacity = 0.3 * op; });
  });

  return (
    <group ref={group} position={[0, 0, CS_Z]}>
      <lineSegments geometry={frontGeo}>
        <lineBasicMaterial ref={frontMat} color="#9fb3cc" transparent opacity={0} />
      </lineSegments>
      <lineSegments geometry={backGeo} position={[0, FRAME_H * 0.03, -FRAME_DEPTH]}>
        <lineBasicMaterial ref={backMat} color="#8fa3bd" transparent opacity={0} />
      </lineSegments>
      <lineSegments geometry={cornerGeo}>
        <lineBasicMaterial ref={cornerMat} color="#8fa3bd" transparent opacity={0} />
      </lineSegments>
      {tickX.map((x, i) => (
        <lineSegments key={x} geometry={tickGeo} position={[x, 0, 0]}>
          <lineBasicMaterial
            transparent
            opacity={0}
            color="#9fb3cc"
            ref={(el) => { tickMats.current[i] = el; }}
          />
        </lineSegments>
      ))}
    </group>
  );
}
