import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BoxGeometry, BufferAttribute, CanvasTexture, Color, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getCharactersReveal } from '../../Transitions/scrollState.js';
import { paintDeck } from './stagePaint.js';

// ESCENA 02 — el volumen y el suelo de la vitrina, que eran líneas de boceto, ahora con cuerpo (mismo lenguaje que la
// sala de la Escena 03: grafito frío, sombreado horneado en color de vértice, sin luces nuevas). Las 12 aristas de
// WireBox (blockouts.jsx) NO se mueven: quedan como el filo luminoso exterior del bastidor. Todo aparece con
// getCharactersReveal(), la misma ganancia que ya rige a los luchadores, así que no se filtra a otras escenas.
const smooth = (x) => { const t = Math.min(Math.max(x, 0), 1); return t * t * (3 - 2 * t); };
const faceLight = (n) => (n.y > 0.5 ? 1 : n.y < -0.5 ? 0.2 : n.z > 0.5 ? 0.62 : n.z < -0.5 ? 0.34 : 0.5);

function bake(geo, baseHex, yMin, yMax) {
  const base = new Color(baseHex), p = geo.attributes.position, n = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const ao = 0.55 + 0.45 * smooth((p.getY(i) - yMin) / (yMax - yMin));
    const k = faceLight({ x: n.getX(i), y: n.getY(i), z: n.getZ(i) }) * ao;
    col[i * 3] = base.r * k; col[i * 3 + 1] = base.g * k; col[i * 3 + 2] = base.b * k;
  }
  geo.setAttribute('color', new BufferAttribute(col, 3));
  return geo;
}

// Bastidor: 4 montantes + cuatro largueros de coronación, todos DENTRO del volumen (su arista exterior sobre la línea).
export function StageFrame({ size, position, deckWidth, deckDepth, deckTop = 0.06 }) {
  const [W, H, D] = size;
  const root = useRef();
  const res = useMemo(() => {
    const post = 0.14, rail = 0.09, hw = W / 2, hd = D / 2, hh = H / 2;
    const b = [];
    const add = (sx, sy, sz, x, y, z) => b.push(new BoxGeometry(sx, sy, sz).translate(x, y, z));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(post, H, post, sx * (hw - post / 2), 0, sz * (hd - post / 2));
    for (const sz of [-1, 1]) add(W - 2 * post, rail, rail, 0, hh - rail / 2, sz * (hd - rail / 2));
    for (const sx of [-1, 1]) add(rail, rail, D - 2 * post, sx * (hw - rail / 2), hh - rail / 2, 0);
    const geo = bake(mergeGeometries(b), '#3a4459', -hh, hh);
    const mat = new MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    return { geo, mat };
  }, [W, H, D]);
  useEffect(() => () => { res.geo.dispose(); res.mat.dispose(); }, [res]);
  useFrame(() => {
    const r = getCharactersReveal();
    if (root.current) root.current.visible = r > 0.01;
    res.mat.color.setScalar(r);
  });
  return (
    <group ref={root} visible={false}>
      <mesh position={position} geometry={res.geo} material={res.mat} />
      <StageDeck width={deckWidth} depth={deckDepth} top={deckTop} />
    </group>
  );
}

// Cubierta baja bajo las tres vitrinas (6 cm), con juntas cada 2 m sobre la retícula global.
function StageDeck({ width, depth, top }) {
  const gl = useThree((s) => s.gl);
  const res = useMemo(() => {
    const ppm = 96, w = Math.round(width * ppm), h = Math.round(depth * ppm);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paintDeck(c.getContext('2d'), w, h, { ppm, width, depth });
    const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const topMat = new MeshBasicMaterial({ map: tex });
    const side = new MeshBasicMaterial({ color: '#0c1017' });
    const geo = new BoxGeometry(width, top, depth).translate(0, top / 2, 0);
    // orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z
    return { tex, topMat, side, geo, mats: [side, side, topMat, side, side, side] };
  }, [gl, width, depth, top]);
  useEffect(() => () => { res.tex.dispose(); res.topMat.dispose(); res.side.dispose(); res.geo.dispose(); }, [res]);
  useFrame(() => {
    const r = getCharactersReveal();
    res.topMat.color.setScalar(r); res.side.color.setScalar(r);
  });
  return <mesh geometry={res.geo} material={res.mats} />;
}

// Detalle mecanizado de cada disco de suelo: aro de acero, ranura interior y marcas de graduación (se dibuja sobre el
// disco oscuro de blockouts.jsx#CellFloor, dentro de su mismo grupo, así escala igual en móvil).
export function PlinthDetail({ radius }) {
  const root = useRef();
  const res = useMemo(() => {
    const rim = new MeshBasicMaterial({ color: '#68717f', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const groove = new MeshBasicMaterial({ color: '#04060a', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const ticks = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2, len = i % 4 === 0 ? 0.09 : 0.045;
      ticks.push(new BoxGeometry(0.012, 0.004, len).rotateY(-a).translate(Math.sin(a) * (radius - 0.14 - len / 2), 0.002, Math.cos(a) * (radius - 0.14 - len / 2)));
    }
    return { rim, groove, ticks: mergeGeometries(ticks) };
  }, [radius]);
  useEffect(() => () => { res.rim.dispose(); res.groove.dispose(); res.ticks.dispose(); }, [res]);
  useFrame(() => {
    const r = getCharactersReveal();
    if (root.current) root.current.visible = r > 0.01;
    res.rim.color.set('#68717f').multiplyScalar(r);
    res.groove.color.set('#04060a').multiplyScalar(r);
  });
  return (
    <group ref={root} visible={false} position={[0, 0.004, 0]}>
      <mesh rotation-x={-Math.PI / 2} material={res.rim}><ringGeometry args={[radius - 0.07, radius, 96]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} material={res.groove}><ringGeometry args={[radius - 0.17, radius - 0.155, 96]} /></mesh>
      <mesh geometry={res.ticks} material={res.rim} />
    </group>
  );
}
