import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, CatmullRomCurve3, Line, LineBasicMaterial, LineSegments, Vector3 } from 'three';
import { LOCK_Z } from './constants.js';
import { linesGeometry, ringSegs, smoothstep } from './geo.js';

// Lenguaje visual de ANÁLISIS (ejes, goniómetro, trazados, marcas de fotograma). Son referencias geométricas
// del entorno, NO datos capturados: no hay fuerza, velocidad, potencia, porcentajes ni cifras de ningún tipo.

const Y = 0.012;
const INK = '#9fb3cc';
// Jerarquía: el lenguaje de laboratorio (goniómetro, ejes, trazados) se mantiene pero en un segundo
// plano tonal, para que el personaje central gane protagonismo sin tocar su asset ni el de fondo.
const OP_STATION = 0.22;   // antes 0.4
const OP_AXES = 0.34;      // antes 0.6
const OP_TRACE_LINE = 0.3; // antes 0.55
const OP_TRACE_TICK = 0.22; // antes 0.45

// Estación de observación en el punto magnético: cruz de centrado + goniómetro graduado cada 10° (mayor cada 30°).
function ObservationStation() {
  const geo = useMemo(() => {
    const segs = [[-0.4, Y, LOCK_Z, 0.4, Y, LOCK_Z], [0, Y, LOCK_Z - 0.4, 0, Y, LOCK_Z + 0.4]];
    ringSegs(segs, 0, Y, LOCK_Z, 0.9);
    ringSegs(segs, 0, Y, LOCK_Z, 1.5);
    for (let a = 0; a < 360; a += 10) {
      const r1 = a % 30 === 0 ? 1.78 : 1.62;
      const c = Math.cos((a * Math.PI) / 180);
      const s = Math.sin((a * Math.PI) / 180);
      segs.push([c * 1.5, Y, LOCK_Z + s * 1.5, c * r1, Y, LOCK_Z + s * r1]);
    }
    return linesGeometry(segs);
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={INK} transparent opacity={OP_STATION} />
    </lineSegments>
  );
}

// Triedro de ejes X / Y / Z (convención de laboratorio de movimiento), sin etiquetas numéricas.
function AxesGizmo({ position = [0, 0, 0], len = 1 }) {
  const parts = useMemo(() => {
    const head = 0.09;
    const mk = (segs, color) => ({ geo: linesGeometry(segs), color });
    return [
      mk([[0, Y, 0, len, Y, 0], [len, Y, 0, len - head, Y, head], [len, Y, 0, len - head, Y, -head]], '#c99790'),
      mk([[0, Y, 0, 0, len, 0], [0, len, 0, head, len - head, 0], [0, len, 0, -head, len - head, 0]], '#94c9a2'),
      mk([[0, Y, 0, 0, Y, -len], [0, Y, -len, head, Y, -len + head], [0, Y, -len, -head, Y, -len + head]], '#93aecb'),
    ];
  }, [len]);
  return (
    <group position={position}>
      {parts.map((p, i) => (
        <lineSegments key={i} geometry={p.geo}>
          <lineBasicMaterial color={p.color} transparent opacity={OP_AXES} />
        </lineSegments>
      ))}
    </group>
  );
}

// Trazado vectorial: curva con marcas de fotograma equiespaciadas y terminales. Se "dibuja" según la posición Z
// real de la cámara (función determinista y reversible del recorrido; no es una animación independiente).
function Trace({ points, revealFrom, revealSpan }) {
  const N = 72;
  const M = 16;
  const o = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'centripetal');
    const lineGeo = new BufferGeometry().setFromPoints(curve.getPoints(N));
    const segs = [];
    for (let i = 0; i <= M; i++) {
      const u = i / M;
      const p = curve.getPoint(u);
      const t = curve.getTangent(u);
      const n = new Vector3(-t.z, 0, t.x);
      if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
      n.normalize();
      const h = i % 4 === 0 ? 0.16 : 0.08;
      segs.push([p.x - n.x * h, p.y, p.z - n.z * h, p.x + n.x * h, p.y, p.z + n.z * h]);
    }
    const tickGeo = linesGeometry(segs);
    const mat = new LineBasicMaterial({ color: INK, transparent: true, opacity: OP_TRACE_LINE });
    const tickMat = new LineBasicMaterial({ color: INK, transparent: true, opacity: OP_TRACE_TICK });
    return { line: new Line(lineGeo, mat), ticks: new LineSegments(tickGeo, tickMat) };
  }, [points]);

  const ref = useRef(o);
  useFrame(({ camera }) => {
    const r = smoothstep(revealFrom - camera.position.z, 0, revealSpan);
    ref.current.line.geometry.setDrawRange(0, Math.floor(r * (N + 1)));
    ref.current.ticks.geometry.setDrawRange(0, Math.floor(r * (M + 1)) * 2);
  });

  return (
    <group>
      <primitive object={o.line} />
      <primitive object={o.ticks} />
    </group>
  );
}

// Dos trazados a los lados del corredor (zona de niebla, fuera del eje de avance). Puntos = geometría de referencia.
const TRACE_A = [[-4.4, 0.9, -13.0], [-3.7, 1.15, -14.4], [-2.6, 1.4, -15.6], [-1.4, 1.5, -16.5], [-0.6, 1.42, -17.2]];
const TRACE_B = [[4.3, 0.2, -12.2], [3.9, 0.7, -14.0], [3.1, 1.3, -15.8], [2.2, 1.75, -17.4], [1.5, 1.85, -18.6]];

export default function TechMarks() {
  return (
    <group>
      <ObservationStation />
      <AxesGizmo position={[-2.6, 0, -5]} len={1} />
      <Trace points={TRACE_A} revealFrom={-3} revealSpan={9} />
      <Trace points={TRACE_B} revealFrom={-5} revealSpan={9} />
    </group>
  );
}
