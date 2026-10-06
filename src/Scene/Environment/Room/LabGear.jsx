import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, Color, CylinderGeometry, LatheGeometry, MeshBasicMaterial, Vector2, Vector3 } from 'three';
import { GEAR } from './roomSpec.js';
import { getRoomGain } from './roomGain.js';

// ESCENA 03 · CENTRO DEL LABORATORIO — los cuatro sacos que cuelgan bajo las luminarias de x = ±6 (ver roomSpec.js#GEAR).
// Misma técnica que el resto de la sala: SIN luces nuevas; la luz (cornisa arriba, lavado de las luminarias, oclusión al pie) está
// horneada en el color de vértice del propio saco. Se apagan y encienden con getRoomGain() (el mismo scroll real que la sala).
// Están a los lados del recorrido de cámara: el eje central entre la cámara y la plataforma queda libre.
const BASE = new Color('#3a414c');
const L = new Vector3(-0.35, 0.55, 0.75).normalize(); // dirección de la luz horneada: arriba, al frente y a la izquierda

function bagGeometry() {
  const { length: H, radius: R } = GEAR;
  // perfil (radio, altura): base redondeada, cuerpo casi cilíndrico, hombro suave
  const pts = [[0, 0], [R * 0.8, 0.012], [R * 0.97, 0.06], [R, 0.18], [R, H - 0.2], [R * 0.95, H - 0.07], [R * 0.7, H - 0.012], [0, H]];
  const geo = new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), 36);
  const p = geo.attributes.position, n = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const lam = Math.max(0, n.getX(i) * L.x + n.getY(i) * L.y + n.getZ(i) * L.z);
    const ao = 0.62 + 0.38 * Math.min(1, p.getY(i) / H);                  // más oscuro al pie, más claro bajo la luminaria
    const spec = Math.max(0, 1 - Math.abs(n.getX(i) + 0.45) * 3.2) * Math.max(0, n.getZ(i)); // veta de brillo (cuero)
    const k = (0.3 + 0.7 * lam) * ao + spec * 0.22;
    // cuero grafito frío, dentro de la gama de la sala (mismo método que las vigas: base en sRGB → lineal, por factor de luz)
    col[i * 3] = BASE.r * k; col[i * 3 + 1] = BASE.g * k; col[i * 3 + 2] = BASE.b * k;
  }
  geo.setAttribute('color', new BufferAttribute(col, 3));
  return geo;
}

export default function LabGear() {
  const root = useRef();
  const res = useMemo(() => {
    const { length: H, radius: R, bottom, ceiling } = GEAR;
    const chainLen = ceiling - (bottom + H);
    return {
      bag: bagGeometry(),
      strap: new CylinderGeometry(R + 0.006, R + 0.006, 0.05, 36, 1, true),
      chain: new CylinderGeometry(0.012, 0.012, chainLen, 8),
      plate: new CylinderGeometry(0.13, 0.13, 0.03, 20),
      chainLen,
      bagMat: new MeshBasicMaterial({ vertexColors: true }),
      strapMat: new MeshBasicMaterial({ color: '#7b838e' }),
      chainMat: new MeshBasicMaterial({ color: '#3b424b' }),
    };
  }, []);

  useEffect(() => () => {
    ['bag', 'strap', 'chain', 'plate', 'bagMat', 'strapMat', 'chainMat'].forEach((k) => res[k].dispose());
  }, [res]);

  useFrame(() => {
    const g = getRoomGain();
    if (!root.current) return;
    root.current.visible = g > 0.01;
    if (!root.current.visible) return;
    res.bagMat.color.setScalar(g);
    res.strapMat.color.set('#7b838e').multiplyScalar(g);
    res.chainMat.color.set('#3b424b').multiplyScalar(g);
  });

  const { length: H, bottom, ceiling } = GEAR;
  return (
    <group ref={root} visible={false}>
      {GEAR.bags.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh geometry={res.bag} material={res.bagMat} position={[0, bottom, 0]} />
          <mesh geometry={res.strap} material={res.strapMat} position={[0, bottom + 0.28, 0]} />
          <mesh geometry={res.strap} material={res.strapMat} position={[0, bottom + H - 0.28, 0]} />
          <mesh geometry={res.chain} material={res.chainMat} position={[0, bottom + H + res.chainLen / 2, 0]} />
          <mesh geometry={res.plate} material={res.strapMat} position={[0, ceiling - 0.016, 0]} />
        </group>
      ))}
    </group>
  );
}
