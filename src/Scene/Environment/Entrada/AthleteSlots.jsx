import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, MathUtils } from 'three';
import { ATHLETE_SLOTS } from './constants.js';
import { anchorZ } from '../../Camera/waypoints.js';
import { CELL } from '../cells.js';
import { linesGeometry, rulerSegs, smoothstep } from './geo.js';
import { getEntranceToSelectProgress, getCharactersReveal } from '../../Transitions/scrollState.js';

// Semilla en la Entrada de las tres vitrinas de Character Select. NO son personajes ni assets nuevos: son
// las mismas escuadras de calibración de siempre, con la MISMA X que sus vitrinas (cellX, vía constants.js)
// y el mismo motivo de línea que Portals.jsx (reglas verticales, geo.js#rulerSegs).
//
// Durante la SEGUNDA MITAD del umbral 'entrada>character-select' (progreso REAL de scroll —
// getEntranceToSelectProgress(), no una animación aparte: determinista y reversible en ambos sentidos)
// la escuadra:
//  · crece de su tamaño de "hueco" (S0/B0) al contorno exacto de WireBox (S1 = CELL.size/2, mismo B a escala),
//  · su Z converge hacia el ancla de la Escena 02 (anchorZ(1)) — la X ya no se mueve, nace alineada,
//  · gana cuatro reglas verticales en las esquinas (mismo rulerSegs que los pilares) que crecen en altura
//    hasta CELL.size[1].
// El estado final YA es WireBox/Pillars (blockouts.jsx, sin tocar): este componente solo hace de puente
// hacia él y se apaga justo cuando WireBox toma el relevo (mismo tramo que su propio reveal).
const CS_Z = anchorZ(1);
const S0 = 0.9;                 // semilado "hueco" en la Entrada (igual que antes)
const B0 = 0.35;                // largo de escuadra "hueco" (igual que antes)
const S1 = CELL.size[0] / 2;    // semilado destino = medio ancho de WireBox
const B1 = B0 * (S1 / S0);      // largo de escuadra destino, misma proporción que en la Entrada

// Escuadras de las 4 esquinas + cruz de centrado, para un semilado S y un largo de escuadra B dados.
// MISMA construcción que la versión original (solo parametrizada) — no es un diseño nuevo.
function bracketPoints(S, B) {
  const y = 0.012;
  const segs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    segs.push([sx * S, y, sz * S, sx * (S - B), y, sz * S]);
    segs.push([sx * S, y, sz * S, sx * S, y, sz * (S - B)]);
  }
  segs.push([-0.15, y, 0, 0.15, y, 0], [0, y, -0.15, 0, y, 0.15]);
  const flat = [];
  for (const s of segs) flat.push(...s);
  return flat;
}

export default function AthleteSlots() {
  // Dos formas fijas (hueco / vitrina): en useFrame se interpola CPU-side entre ambas según el progreso
  // real del umbral. Mismo enfoque que ya usan damp()/scale.y en blockouts.jsx#Pillars para crecer una
  // vitrina — aquí se aplica al propio contorno, no solo a su escala.
  const p0 = useMemo(() => bracketPoints(S0, B0), []);
  const p1 = useMemo(() => bracketPoints(S1, B1), []);
  const mats = useMemo(() => ATHLETE_SLOTS.map(() => new LineBasicMaterial({ color: '#9fb3cc', transparent: true, opacity: 0 })), []);
  const geos = useMemo(
    () => ATHLETE_SLOTS.map(() => {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(Float32Array.from(p0), 3));
      return g;
    }),
    [p0]
  );

  // Reglas verticales de esquina: mismo rulerSegs que Portals.jsx, colocadas en las 4 esquinas del contorno
  // destino (S1) y escaladas en Y por progreso — crecen desde el suelo, mismo truco que scale.y en Pillars.
  const rulerGeo = useMemo(() => linesGeometry(rulerSegs(CELL.size[1])), []);
  const rulerCorners = useMemo(() => [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => [sx * S1, sz * S1]), []);
  const rulerGroups = useRef(ATHLETE_SLOTS.map(() => []));
  const rulerMats = useRef(ATHLETE_SLOTS.map(() => []));

  const groups = useRef([]);

  useFrame(({ camera }) => {
    const t = getEntranceToSelectProgress();
    const reveal = getCharactersReveal();
    // Reparto en dos mitades del MISMO progreso real (mismo punto de corte, 0.5, que el cierre de
    // TransitionFrame.jsx): 0→0.5 la escuadra se queda quieta en su hueco mientras la ventana única está
    // cerrada; 0.5→1 morfea hacia la vitrina — justo cuando la ventana se desvanece.
    const local = smoothstep(t, 0.5, 1);
    ATHLETE_SLOTS.forEach((s, i) => {
      const z = MathUtils.lerp(s.z, CS_Z, local);
      const g = groups.current[i];
      if (g) g.position.set(s.x, 0, z);

      // Contorno: lerp CPU-side entre p0 (hueco) y p1 (vitrina) según el mismo progreso local.
      const arr = geos[i].attributes.position.array;
      for (let k = 0; k < arr.length; k++) arr[k] = p0[k] + (p1[k] - p0[k]) * local;
      geos[i].attributes.position.needsUpdate = true;

      // Opacidad: la misma lógica de proximidad de siempre (aparece al acercarse la cámara) multiplicada
      // por un relevo hacia WireBox EXACTO (1 - reveal, el mismo reveal que hace aparecer WireBox/Pillars):
      // así la escuadra nunca queda visible al mismo tiempo que el volumen ya está presente.
      const dz = camera.position.z - z;
      const d = Math.hypot(dz, camera.position.x - s.x);
      const proximity = 0.35 * (1 - smoothstep(d, 8, 22));
      const hando = 1 - reveal;
      mats[i].opacity = proximity * hando;

      // Reglas verticales: crecen (0→1 en Y) durante la primera mitad del morfing y se funden con WireBox
      // en el mismo relevo exacto que el resto de la escuadra (1 - reveal), nunca solapadas con él.
      const grow = smoothstep(local, 0, 0.7);
      const fade = 1 - reveal;
      const rg = rulerGroups.current[i];
      rg.forEach((corner) => { if (corner) corner.scale.y = grow; });
      const rm = rulerMats.current[i];
      rm.forEach((m) => { if (m) m.opacity = 0.35 * grow * fade; });
    });
  });

  return (
    <group>
      {ATHLETE_SLOTS.map((s, i) => (
        <group key={s.z} ref={(el) => (groups.current[i] = el)}>
          <lineSegments geometry={geos[i]} material={mats[i]} />
          {rulerCorners.map(([cx, cz], ci) => (
            <group
              key={ci}
              position={[cx, 0, cz]}
              ref={(el) => { rulerGroups.current[i][ci] = el; }}
            >
              <lineSegments geometry={rulerGeo}>
                <lineBasicMaterial
                  transparent
                  opacity={0}
                  color="#9fb3cc"
                  ref={(el) => { rulerMats.current[i][ci] = el; }}
                />
              </lineSegments>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
