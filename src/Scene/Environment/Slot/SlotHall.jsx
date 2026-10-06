import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BoxGeometry, CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOM, roomBeams } from '../Room/roomSpec.js';
import { paintCeiling, paintBackWall } from '../Room/roomPaint.js';
import { bake } from '../Room/RoomArchitecture.jsx';
import { getHallGain } from '../Machine/machineGain.js';
import { anchorZ, chapterOrder } from '../../Camera/waypoints.js';

// ESCENA 04 — la NAVE alrededor de la máquina. 03 → 04 es el mismo laboratorio: al sentarse Entrenamiento se ve techo con luminarias lineales,
// el marco del fondo y las cornisas de la 03, y el suelo pulido (FinishedFloor) llega hasta el rack. NO es una sala nueva: no hay paredes
// laterales, ni suelo propio, ni frente; son tres piezas YA existentes de la sala 03, colocadas pegadas a su fondo:
//   · techo  → Room/roomPaint.js#paintCeiling (placas de 2 m + luminarias de FINISH.lights, x = ±2, ±6),
//   · marco  → Room/roomSpec.js#roomBeams (montantes, dintel y umbral del fondo) + el panel del fondo (paintBackWall),
//   · cornisas → las aristas de profundidad (cornisa y zócalo) de esos mismos beams.
// La caja es la de ROOM (16 × 5 × 22) desplazada para que su borde delantero toque el fondo de la sala 03 (z mundo = fondo de 03): el techo de la
// 03 termina donde empieza este. Misma luz (blanco frío), misma paleta, sin luces nuevas ni sombras dinámicas (sombreado horneado, como 03/05).
const SLOT_Z = anchorZ(chapterOrder.indexOf('slot'));
const ROOM_Z = anchorZ(chapterOrder.indexOf('asesoria-lab'));
const ROOM_BACK_Z = ROOM_Z + ROOM.position[2] - ROOM.size[2] / 2; // z de mundo del fondo de la sala 03
const CENTER_Z = ROOM_BACK_Z - ROOM.size[2] / 2;                    // centro de la nave: justo detrás de ese fondo
const LOCAL_Z = CENTER_Z - SLOT_Z;                                  // el grupo vive en el ancla del capítulo 04
const smooth = (x) => { const t = Math.min(Math.max(x, 0), 1); return t * t * (3 - 2 * t); };

export default function SlotHall() {
  const root = useRef();
  const gl = useThree((s) => s.gl);
  const [W, H, D] = ROOM.size;
  const hd = D / 2, hh = H / 2;

  const res = useMemo(() => {
    const tex = (paint, w, h) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      paint(c.getContext('2d'), w, h);
      const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      return t;
    };
    const PPM = { wall: 48, ceil: 40 };
    const tx = {
      ceil: tex((g, w, h) => paintCeiling(g, w, h, { ppm: PPM.ceil, centerZ: CENTER_Z }), W * PPM.ceil, D * PPM.ceil),
      back: tex((g, w, h) => paintBackWall(g, w, h, { ppm: PPM.wall }), W * PPM.wall, H * PPM.wall),
    };
    const po = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    const mats = {
      ceil: new MeshBasicMaterial({ map: tx.ceil, ...po }),
      back: new MeshBasicMaterial({ map: tx.back, ...po }),
      beam: new MeshBasicMaterial({ vertexColors: true, ...po }),
    };
    // Solo el marco del fondo y las cornisas: el marco frontal no existe aquí (la nave sigue hacia la cámara).
    const parts = roomBeams().filter((b) => !b.n.startsWith('front-'));
    const beams = bake(mergeGeometries(parts.map((b) => new BoxGeometry(...b.size).translate(...b.c))), '#404b5f', -hh, hh, 1, 0);
    return { tx, mats, beams, plane: new PlaneGeometry(W, D), wall: new PlaneGeometry(W, H) };
  }, [gl, W, H, D, hh]);

  useEffect(() => () => {
    Object.values(res.tx).forEach((t) => t.dispose());
    Object.values(res.mats).forEach((m) => m.dispose());
    res.beams.dispose(); res.plane.dispose(); res.wall.dispose();
  }, [res]);

  useFrame(() => {
    const g = getHallGain();
    if (!root.current) return;
    root.current.visible = g > 0.01;
    if (!root.current.visible) return;
    const k = smooth(g);
    Object.values(res.mats).forEach((m) => m.color.setScalar(k));
  });

  return (
    <group ref={root} visible={false} position={[0, ROOM.position[1], LOCAL_Z]}>
      <mesh geometry={res.beams} material={res.mats.beam} />
      <mesh position={[0, 0, -hd]} geometry={res.wall} material={res.mats.back} />
      <mesh position={[0, hh, 0]} rotation-x={Math.PI / 2} geometry={res.plane} material={res.mats.ceil} />
    </group>
  );
}
