import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BoxGeometry, BufferAttribute, CanvasTexture, Color, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOM, PLATFORM, roomBeams } from './roomSpec.js';
import { getRoomGain } from './roomGain.js';
import { paintBackWall, paintSideWall, paintCeiling, paintFloor, paintPlatformTop, paintPlatformFace } from './roomPaint.js';
import { anchorZ, chapterOrder } from '../../Camera/waypoints.js';
import { scrollState } from '../../Transitions/scrollState.js';

// ESCENA 03 — la arquitectura que YA estaba dibujada, desarrollada con caras, grosor, material y luz.
// Las aristas de WireBox (blockouts.jsx#Room) siguen exactamente donde estaban: aquí solo se les da cuerpo POR DENTRO
// del volumen, así cada línea original queda como la arista luminosa exterior de su viga (polygonOffset: la línea
// gana siempre en el borde, sin z-fighting).
// SOMBREADO HORNEADO (sin luces en tiempo real): la luz indirecta, la oclusión y las sombras de contacto están
// pintadas en las texturas (roomPaint.js) y en el color de vértice de cada cara (por orientación + altura). Así el
// resultado no depende de unidades de luz ni del móvil: cero luces, cero sombras dinámicas, y el brillo es el que se
// diseña. Con getRoomGain() (scroll real) todo aparece desde el negro del fondo; fuera de 03 el grupo no se dibuja.
const ROOM_ORIGIN_Z = anchorZ(chapterOrder.indexOf('asesoria-lab')); // el grupo de la escena vive en este Z de mundo

// Cara → factor de luz (la cámara mira hacia -Z; la luz indirecta viene de arriba y del fondo).
const faceLight = (n) => (n.y > 0.5 ? 1 : n.y < -0.5 ? 0.2 : n.z > 0.5 ? 0.62 : n.z < -0.5 ? 0.34 : 0.5);
const smooth = (x) => { const t = Math.min(Math.max(x, 0), 1); return t * t * (3 - 2 * t); };

// Color de vértice = base × luz de cara × oclusión por altura (más oscuro al pie, más claro bajo la cornisa).
export function bake(geo, baseHex, yBottom, yTop, lift = 1, zFade = 0) {
  const base = new Color(baseHex);
  const p = geo.attributes.position, n = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const f = faceLight({ x: n.getX(i), y: n.getY(i), z: n.getZ(i) });
    const ao = 0.55 + 0.45 * smooth((p.getY(i) - yBottom) / (yTop - yBottom));
    // zFade: las vigas se apagan hacia la cámara igual que sus líneas (roomEdgeTone: 0,85 en el fondo → 0,15 al frente)
    const zk = zFade ? 1 - zFade * ((p.getZ(i) + ROOM.size[2] / 2) / ROOM.size[2]) : 1;
    const k = f * ao * lift * zk;
    col[i * 3] = base.r * k; col[i * 3 + 1] = base.g * k; col[i * 3 + 2] = base.b * k;
  }
  geo.setAttribute('color', new BufferAttribute(col, 3));
  return geo;
}

export default function RoomArchitecture() {
  const root = useRef();
  const gl = useThree((s) => s.gl);
  const [W, H, D] = ROOM.size;
  const hw = W / 2, hh = H / 2, hd = D / 2;
  const [pw, ph, pd] = PLATFORM.size;

  const res = useMemo(() => {
    const tex = (paint, w, h) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      paint(c.getContext('2d'), w, h);
      const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      return t;
    };
    // Resolución por superficie (px por metro). Las juntas se dibujan en metros, así que no cambian de grosor con esto.
    const PPM = { wall: 64, ceil: 48, floor: 64, plat: 128 };
    const centerZ = ROOM_ORIGIN_Z + ROOM.position[2]; // z de MUNDO del centro de la sala
    const tx = {
      back: tex((g, w, h) => paintBackWall(g, w, h, { ppm: PPM.wall }), W * PPM.wall, H * PPM.wall),
      left: tex((g, w, h) => paintSideWall(g, w, h, false, { ppm: PPM.wall, centerZ }), D * PPM.wall, H * PPM.wall),
      right: tex((g, w, h) => paintSideWall(g, w, h, true, { ppm: PPM.wall, centerZ }), D * PPM.wall, H * PPM.wall),
      ceil: tex((g, w, h) => paintCeiling(g, w, h, { ppm: PPM.ceil, centerZ }), W * PPM.ceil, D * PPM.ceil),
      floor: tex((g, w, h) => paintFloor(g, w, h, { ppm: PPM.floor, originZ: centerZ - hd }), W * PPM.floor, D * PPM.floor),
      platTop: tex((g, w, h) => paintPlatformTop(g, w, h, { ppm: PPM.plat }), Math.round(pw * PPM.plat), Math.round(pd * PPM.plat)),
      platFront: tex((g, w, h) => paintPlatformFace(g, w, h, { ppm: PPM.plat, front: true }), Math.round(pw * PPM.plat), Math.round(ph * PPM.plat)),
      platSide: tex((g, w, h) => paintPlatformFace(g, w, h, { ppm: PPM.plat, front: false }), Math.round(pd * PPM.plat), Math.round(ph * PPM.plat)),
    };
    const po = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    const surf = (map, extra) => ({ map, mat: new MeshBasicMaterial({ map, ...po, ...extra }) });
    const m = {
      back: surf(tx.back, { transparent: true, depthWrite: false }), left: surf(tx.left), right: surf(tx.right), ceil: surf(tx.ceil), floor: surf(tx.floor),
      beam: { mat: new MeshBasicMaterial({ vertexColors: true, ...po }) },
      platTop: surf(tx.platTop), platFront: surf(tx.platFront), platSide: surf(tx.platSide),
    };
    const beams = bake(mergeGeometries(roomBeams().map((b) => new BoxGeometry(...b.size).translate(...b.c))), '#404b5f', -hh, hh, 1, 0.45);
    // Plataforma: mismo 4 × 1 × 1,6. Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z. Cada cara lleva su textura
    // (la luz y la oclusión van pintadas en ellas).
    const plat = new BoxGeometry(pw, ph, pd);
    const platMats = [m.platSide.mat, m.platSide.mat, m.platTop.mat, m.platSide.mat, m.platFront.mat, m.platFront.mat];
    return { m, tx, beams, plat, platMats };
  }, [gl, W, H, D, pw, ph, pd, hh, hd]);

  useEffect(() => () => {
    Object.values(res.m).forEach(({ mat }) => mat.dispose());
    Object.values(res.tx).forEach((t) => t.dispose());
    res.beams.dispose(); res.plat.dispose();
  }, [res]);

  useFrame(() => {
    const g = getRoomGain();
    if (!root.current) return;
    root.current.visible = g > 0.01;
    if (!root.current.visible) return;
    Object.values(res.m).forEach(({ mat }) => mat.color.setScalar(g));
    // El panel del fondo se disuelve cuando la cámara sale hacia la 04 (03→04: 10 % → 45 %): el marco del fondo queda como un umbral abierto
    // por el que se ve ya la máquina siguiente, en lugar de atravesar un muro (el resto de la sala se apaga más tarde, ver roomGain.js).
    res.m.back.mat.opacity = 1 - smooth(((scrollState.segments['asesoria-lab>slot'] ?? 0) - 0.1) / 0.35);
  });

  return (
    <group ref={root} visible={false}>
      {/* Caja principal: mismo centro que las líneas de WireBox */}
      <group position={ROOM.position}>
        <mesh geometry={res.beams} material={res.m.beam.mat} />
        <mesh position={[0, 0, -hd]} material={res.m.back.mat}><planeGeometry args={[W, H]} /></mesh>
        <mesh position={[-hw, 0, 0]} rotation-y={Math.PI / 2} material={res.m.left.mat}><planeGeometry args={[D, H]} /></mesh>
        <mesh position={[hw, 0, 0]} rotation-y={-Math.PI / 2} material={res.m.right.mat}><planeGeometry args={[D, H]} /></mesh>
        <mesh position={[0, hh, 0]} rotation-x={Math.PI / 2} material={res.m.ceil.mat}><planeGeometry args={[W, D]} /></mesh>
        {/* Losa de suelo 2 mm POR ENCIMA de la retícula global: sus juntas están pintadas sobre las MISMAS líneas de la
            retícula (cada 2 m del mundo), así que el trazado no cambia; solo pasa de línea GL a junta con material. */}
        <mesh position={[0, -hh + 0.002, 0]} rotation-x={-Math.PI / 2} material={res.m.floor.mat}><planeGeometry args={[W, D]} /></mesh>
      </group>
      {/* Plataforma baja: el MISMO volumen, sólido, apoyado en el suelo */}
      <mesh position={PLATFORM.position} geometry={res.plat} material={res.platMats} />
    </group>
  );
}
