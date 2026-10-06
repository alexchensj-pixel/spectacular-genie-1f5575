import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, BufferAttribute, Color, EdgesGeometry, MathUtils } from 'three';
import { useStore } from '../../App/store.js';
import { disciplines } from '../../Data/Disciplines.js';
import { getCharactersReveal, scrollState, isExploreActive } from '../Transitions/scrollState.js';
import Fighter from './Fighter.jsx';
import RosterGroup from './RosterGroup.jsx';
import ModeStations from './ModeStations.jsx';
import { CELL, cellX, layoutK, portraitAmount, exploreLayoutAspect } from './cells.js';
import { ROOM, PLATFORM, roomEdgeTone, platformEdgeTone } from './Room/roomSpec.js';
import RoomArchitecture from './Room/RoomArchitecture.jsx';
import LabGear from './Room/LabGear.jsx';
import FinishedFloor from './Floor/FinishedFloor.jsx';
import { getFloorGain } from './Floor/floorGain.js';
import Door from './Door/Door.jsx';
import { StageFrame, PlinthDetail } from './Stage/StageArchitecture.jsx';
import SelectionMachine from './Machine/SelectionMachine.jsx';
import HybridRack from './Slot/HybridRack.jsx';
import SlotHall from './Slot/SlotHall.jsx';
import { getArchiveGain } from './Machine/machineGain.js';
import { getRoomGain } from './Room/roomGain.js';
import ArchiveArchitecture from './Archive/ArchiveArchitecture.jsx';
import { ARCHIVE, slabX } from './Archive/archiveSpec.js';
import { stepBlend, stepOf, ARCHIVE_STATION_SLABS } from '../Camera/waypoints.js';

// Aristas luminosas de cada estancia (WireBox). Ya NO son el blockout: cada volumen tiene su cuerpo, material y luz por dentro
// (Room/, Stage/, Archive/, Floor/, Door/) y estas líneas quedan como el filo exterior de su arquitectura, con la misma
// posición y proporción de siempre.
export const WireBox = forwardRef(function WireBox(
  { size = [1, 1, 1], position = [0, 0, 0], color = '#4a5a7a', opacity = 0.8, tone },
  ref
) {
  const geo = useMemo(() => new BoxGeometry(...size), [size.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  // `tone` (opcional): función (p, q) → [tp, tq] con el brillo relativo (0..1) de los dos extremos de cada arista.
  // Las MISMAS 12 aristas, solo con intensidad distinta según su función (estructural / profundidad / suelo). Sin
  // `tone` el comportamiento es exactamente el de siempre (Reels, Archive, etc. no cambian).
  const toned = useMemo(() => {
    if (!tone) return null;
    const e = new EdgesGeometry(geo);
    const pos = e.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 2) {
      const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
      const q = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)];
      const [tp, tq] = tone(p, q, size);
      col.set([tp, tp, tp], i * 3);
      col.set([tq, tq, tq], (i + 1) * 3);
    }
    e.setAttribute('color', new BufferAttribute(col, 3));
    return e;
  }, [geo, tone]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <lineSegments position={position} geometry={toned ?? undefined}>
      {!toned && <edgesGeometry args={[geo]} />}
      <lineBasicMaterial ref={ref} color={color} transparent opacity={opacity} vertexColors={!!toned} />
    </lineSegments>
  );
});

// 01 — Entrada: ya no es un blockout; vive en Environment/Entrada/ (corredor, portales, título 3D).

// 02 — el rectángulo/wireframe original de la escena, ahora como volumen 3D real: el MISMO `WireBox` genérico
// que ya usan 03/04/05 (arriba), solo dimensionado para abarcar a los tres luchadores en vez de sustituirlo por
// una estructura nueva. Un único box (BoxGeometry + edgesGeometry) da de forma automática las 12 aristas de un
// volumen rectangular real: rectángulo posterior, rectángulo frontal y las conexiones laterales entre ambos que
// muestran la profundidad — nada más. Todo en unidades de mundo (metros), igual que el suelo y los luchadores,
// así que no depende del viewport: no hay que "reescalarlo" en móvil, solo lo enmarca la cámara (Camera/index.jsx
// ya abre fov / aleja la vista para que quepan los tres, ver overviewFraming).
// Radio del aro de suelo de cada luchador (CellFloor, más abajo) — se reutiliza para que el fondo/frente del
// volumen contenga a los tres aros en vez de cortarlos, sin cambiar ese suelo ni duplicar su línea.
const FLOOR_R = CELL.size[0] * 0.85;
const STAGE_HALF_W = CELL.spacing + CELL.size[0] / 2; // medio ancho: cubre las tres posiciones (BOXEO · K1 · MUAY
                                                       // THAI), dentro del encuadre general de cámara (overviewFraming)
const STAGE_HALF_D = FLOOR_R;                         // medio fondo: contiene el aro de suelo de cada luchador
const STAGE_H = CELL.size[1];                         // altura del volumen (por encima de la cabeza)
const STAGE_Y0 = 0.015;                               // apoyado en el suelo, sin solaparse con su retícula (z-fighting)
const DECK_TOP = 0.06;                                // cubierta baja bajo las tres vitrinas (Stage/StageArchitecture.jsx)
const DISC_Y = 0.075;                                 // disco de cada luchador, sobre la cubierta y por debajo de los pies (feetY 0,08)

// 02 — tres luchadores (Fighter.jsx) dentro del mismo volumen espacial (WireBox de arriba, dimensionado abajo).
// La enfocada gana protagonismo, las demás pasan a segundo plano; el luchador NO se estira: escala aparte.
// Suelo por luchador: un plano + un aro de base (línea), MISMA geometría en las tres — junto con `base` (idéntico
// punto de partida 0.7 para las tres) es lo que mantiene el equilibrio inicial entre los tres personajes (punto 5).
// La profundidad la aporta este suelo + el volumen compartido; no toca el suelo/retícula global de
// Environment/index.jsx, que sigue siendo el mismo para 03–06.
function CellFloor({ matRef, groupRef }) {
  return (
    <group ref={groupRef} position={[0, DISC_Y, 0]}>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[FLOOR_R, 64]} />
        <meshStandardMaterial color="#0b0e14" roughness={1} />
      </mesh>
      <PlinthDetail radius={FLOOR_R} />
      <lineLoop position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[FLOOR_R - 0.015, FLOOR_R, 48]} />
        <lineBasicMaterial ref={matRef} color="#4a5a7a" transparent opacity={0} />
      </lineLoop>
    </group>
  );
}

// El luchador es el elemento interactivo principal (no el texto/tarjeta HTML). Un plano invisible pero
// raycast-able, alineado con el mismo `stage` (cabeza/pies/centro) que usa Fighter.jsx para el vídeo real, así
// el área de toque queda perfectamente alineada con cada luchador — un poco mayor que su cuerpo (MARGIN) para
// que sea cómodo en móvil, sin desplazarse del centro real (la fórmula de x/cy cancela el factor de escala).
// Un pequeño offset en +Z lo sitúa delante del vídeo (más cerca de cámara) para que el ráycast lo capture
// siempre a él primero, sin depender del orden de renderizado de RosterGroup/Fighter.
//
// INTERACCIÓN (V22 · EXPLORE): un click / toque sobre un luchador ELIGE su disciplina (store.selectDiscipline): exactamente la
// misma acción que tocar su tarjeta en el panel — el 3D es otra forma de hacer la misma selección, no un sistema aparte.
// Idéntico en ratón y táctil, sin hover. Tocar al ya elegido no hace nada (la selección es estable; para volver a ver las
// tres está el botón del panel). Nunca navega ni mueve el scroll.
function CharacterHitArea({ discipline }) {
  const { id, stage } = discipline;
  const selectDiscipline = useStore((s) => s.selectDiscipline);

  const geo = useMemo(() => {
    const MARGIN = 1.18;
    const h = (CELL.fighterHeight / (stage.bot - stage.top)) * MARGIN;
    const w = h * stage.ar;
    return { w, h, x: (0.5 - stage.cx) * w, cy: (stage.bot - 0.5) * h };
  }, [stage]);

  const handleClick = (e) => {
    e.stopPropagation();
    // Solo dentro de EXPLORE: estos planos invisibles existen siempre en el mundo y un toque en otra sección no debe fijar una decisión.
    if (!isExploreActive()) return;
    if (useStore.getState().selectedDiscipline !== id) selectDiscipline(id);
  };

  return (
    <mesh position={[geo.x, CELL.feetY + geo.cy, 0.08]} onClick={handleClick}>
      <planeGeometry args={[geo.w, geo.h]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// Aro de suelo de un luchador atenuado (otro está enfocado): en móvil vertical se queda algo más visible (0.25 → 0.4).
const FLOOR_DIM = 0.25;
const FLOOR_DIM_PORTRAIT = 0.4;

export function Pillars() {
  const stageMat = useRef();
  const stageBox = useRef();
  const cellGroups = useRef([]);
  const floorGroups = useRef([]);
  const floorMats = useRef([]);
  const base = useRef(disciplines.map(() => 0.7)); // opacidad "propia" de cada luchador, ANTES del velo de revelado
  useFrame(({ size }, dt) => {
    const f = useStore.getState().selectedDiscipline; // V22: la disciplina elegida en EXPLORE
    // Layout responsive (cells.js): en móvil vertical la separación entre los tres se estrecha y el aro de suelo
    // y el volumen común (WireBox) escalan igual en X/Z — siguen siendo UN volumen que contiene a los tres aros.
    // Los luchadores conservan su tamaño (solo cambia dónde se plantan). En escritorio k = 1: no cambia nada.
    const aspect = exploreLayoutAspect(size.width, size.height);
    const k = layoutK(aspect);
    const portrait = portraitAmount(aspect);
    if (stageBox.current) stageBox.current.scale.set(k, 1, k);
    disciplines.forEach((d, i) => {
      if (cellGroups.current[i]) cellGroups.current[i].position.x = cellX(i) * k;
      if (floorGroups.current[i]) floorGroups.current[i].scale.set(k, 1, k);
    });
    // Igual que el luchador (Fighter.jsx): el espacio entero queda invisible hasta que la Entrada
    // haya terminado de difuminarse, y solo entonces se revela con el scroll.
    const reveal = getCharactersReveal();
    // El volumen compartido representa el espacio de LOS TRES: su presencia no depende de cuál esté
    // enfocado (sigue siendo "un mismo espacio"), solo del velo de revelado general.
    if (stageMat.current) stageMat.current.opacity = 0.55 * reveal;
    disciplines.forEach((d, i) => {
      const focused = f === d.id;
      const dim = f && !focused;
      base.current[i] = MathUtils.damp(base.current[i], focused ? 1 : dim ? MathUtils.lerp(FLOOR_DIM, FLOOR_DIM_PORTRAIT, portrait) : 0.7, 4, dt);
      const fm = floorMats.current[i];
      if (fm) fm.opacity = base.current[i] * reveal * 0.6;
    });
  });
  return (
    <group>
      {/* Vídeo real de los tres juntos: estado general/overview. Centrado sobre las tres posiciones (cellX). */}
      <RosterGroup />
      {/* El rectángulo/wireframe de la escena, como volumen 3D único y común a BOXEO · K1 / KICKBOXING · MUAY
          THAI — el mismo WireBox genérico que 03/04/05, solo dimensionado para abarcar a los tres. */}
      <group ref={stageBox}>
        <WireBox
          ref={stageMat}
          size={[STAGE_HALF_W * 2, STAGE_H, STAGE_HALF_D * 2]}
          position={[0, STAGE_Y0 + STAGE_H / 2, 0]}
          opacity={0}
        />
        {/* Cuerpo del volumen (montantes + largueros) y cubierta: las líneas de arriba quedan como su filo exterior */}
        <StageFrame
          size={[STAGE_HALF_W * 2, STAGE_H, STAGE_HALF_D * 2]}
          position={[0, STAGE_Y0 + STAGE_H / 2, 0]}
          deckWidth={(CELL.spacing + FLOOR_R) * 2 + 0.2}
          deckDepth={FLOOR_R * 2 + 0.2}
          deckTop={DECK_TOP}
        />
      </group>
      {/* v30 · EXPLORE: las cinco formas de entrenar como estaciones del espacio + sockets de disciplina (ModeStations.jsx) */}
      <ModeStations />
      {disciplines.map((d, i) => (
        <group key={d.id} ref={(el) => (cellGroups.current[i] = el)} position={[cellX(i), 0, 0]}>
          <CellFloor matRef={(el) => (floorMats.current[i] = el)} groupRef={(el) => (floorGroups.current[i] = el)} />
          <Fighter discipline={d} />
          <CharacterHitArea discipline={d} />
        </group>
      ))}
    </group>
  );
}

// 03 — consulta / laboratorio: las MISMAS dos cajas de siempre (marco 16 × 5 × 22 y plataforma 4 × 1 × 1,6; cotas en
// Room/roomSpec.js, idénticas a las anteriores). Sus líneas siguen aquí, con intensidad distinta según su función;
// el volumen, los materiales y la luz los aporta RoomArchitecture por dentro de esas mismas aristas.
export function Room() {
  // Las aristas de la sala se apagan con la MISMA ganancia que su cuerpo (getRoomGain): fuera de la 03 no quedan marcos flotando.
  const mats = useRef([]);
  useFrame(() => {
    const g = getRoomGain();
    // La plataforma de la máquina respira con la cámara: más viva cuando se asienta en un módulo, más tenue mientras planea al siguiente.
    const { e } = stepBlend(scrollState.segments['asesoria-lab'] ?? 0, 5);
    const pulse = 1 - 4 * e * (1 - e);
    mats.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = (i === 1 ? 0.6 + 0.4 * pulse : 1) * 0.9 * g;
    });
  });
  return (
    <group>
      <WireBox ref={(el) => (mats.current[0] = el)} size={ROOM.size} position={ROOM.position} color="#7186a8" opacity={0} tone={roomEdgeTone} />
      <WireBox ref={(el) => (mats.current[1] = el)} size={PLATFORM.size} position={PLATFORM.position} color="#7186a8" opacity={0} tone={platformEdgeTone} />
      <RoomArchitecture />
      {/* Centro del laboratorio: sacos bajo las luminarias de x = ±6 (el tapiz de entrenamiento va pintado en el suelo, Room/roomPaint.js) */}
      <LabGear />
      {/* Máquina de selección (5 módulos) sobre la plataforma: Machine/ */}
      <SelectionMachine />
    </group>
  );
}

// 04 — ENTRENAMIENTO: la máquina de frecuencia (instrumento opcional) en la misma nave que la 03
const SLOT_FLOOR_GAIN = () => getFloorGain('asesoria-lab', 'slot', 'proof-chen');
export function Reels() {
  // SLOT = PLAN HÍBRIDO: el bastidor de huecos (Slot/HybridRack.jsx) sustituye a la máquina de cinco módulos.
  // Esta instancia era exclusiva de la Scene 04; la máquina de la 03 (<SelectionMachine /> en Room) no se toca.
  return (
    <group>
      {/* Suelo pulido (mismo material que el archivo): la 04 ya no flota sobre la retícula desnuda */}
      <FinishedFloor gain={SLOT_FLOOR_GAIN} size={[40, 36]} poolZ={1} seed={404} />
      {/* La misma nave que la 03: techo con lineales + marco del fondo + cornisas, pegados al fondo de la sala (Slot/SlotHall.jsx) */}
      <SlotHall />
      <HybridRack />
    </group>
  );
}

// 05 — Sobre Chen: exposición. Son los MISMOS nueve volúmenes (misma medida, misma posición, mismo color base); lo que cambia
// es su función: la luz selectiva sigue la estación activa (la misma que lee ProofChen.jsx) y tres de ellos ganan una superficie
// oscura para dar profundidad detrás del contenido. El resto queda como arquitectura silenciosa. Sin geometría nueva en el mapa.
const ARCHIVE_N = ARCHIVE.n;
// Estación (0 Chen · 1 Trayectoria · 2 Alumnos · 3 Siguiente paso) → volúmenes que se iluminan.
const ARCHIVE_FOCUS = ARCHIVE_STATION_SLABS; // mismas estaciones que la cámara y el contenido (Camera/waypoints.js)
const ARCHIVE_SURFACE = [1, 3, 6]; // volúmenes con plano oscuro (foto · trayectoria · reseña principal)
const ARCHIVE_BASE = new Color('#5a6a8a');
const ARCHIVE_HI = new Color('#a9bddd');

export function Archive() {
  // Se apaga fuera de su tramo (getArchiveGain): antes se veía desde la 04.
  const mats = useRef([]);
  const surf = useRef([]);
  const w = useRef(new Float32Array(ARCHIVE_N)); // énfasis suavizado de cada volumen (0..1)
  useFrame(() => {
    const g = getArchiveGain();
    const p = scrollState.segments['proof-chen'] ?? 0;
    const focus = ARCHIVE_FOCUS[stepOf(p, ARCHIVE_FOCUS.length)];
    for (let i = 0; i < ARCHIVE_N; i++) {
      w.current[i] += ((focus.includes(i) ? 1 : 0) - w.current[i]) * 0.12;
      const m = mats.current[i];
      if (m) {
        m.opacity = (0.3 + 0.55 * w.current[i]) * g;
        m.color.copy(ARCHIVE_BASE).lerp(ARCHIVE_HI, w.current[i]);
      }
    }
    ARCHIVE_SURFACE.forEach((vi, k) => {
      const m = surf.current[k];
      if (m) m.opacity = (0.5 + 0.2 * w.current[vi]) * g;
    });
  });
  return (
    <group>
      {/* Cuerpo, material, luz y suelo de los MISMOS nueve volúmenes (Archive/): las líneas de abajo son sus aristas exteriores */}
      <ArchiveArchitecture weights={w} />
      {Array.from({ length: ARCHIVE_N }, (_, i) => (
        <WireBox key={i} ref={(el) => (mats.current[i] = el)} size={ARCHIVE.size} position={[slabX(i), ARCHIVE.y, 0]} color="#5a6a8a" opacity={0} />
      ))}
      {ARCHIVE_SURFACE.map((vi, k) => (
        <mesh key={vi} position={[slabX(vi), ARCHIVE.y, 0]} renderOrder={-1}>
          <boxGeometry args={[0.19, 3.98, 2.98]} />
          <meshBasicMaterial ref={(el) => (surf.current[k] = el)} color="#07090d" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// 06 — umbral final: ver Door/Door.jsx (aro de acero con filo luminoso y suelo pulido).
export { Door };
