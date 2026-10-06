import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending, CanvasTexture, CircleGeometry, BoxGeometry, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
  SRGBColorSpace, TorusGeometry,
} from 'three';
import FinishedFloor from '../Floor/FinishedFloor.jsx';
import { getFloorGain } from '../Floor/floorGain.js';
import { scrollState } from '../../Transitions/scrollState.js';
import { useStore } from '../../../App/store.js';

// 06 — UMBRAL FINAL. Mismo aro de siempre (radio 3 m, centro a 3 m de altura, filo luminoso #8fb3ff); lo que cambia es que ya no
// es una línea con material plano: el filo luminoso es ahora el borde interior de un anillo de acero (el mismo acero de los
// portales de la Entrada, Entrada/Portals.jsx), con abrazaderas, un velo de luz en el hueco y su derrame sobre el suelo pulido.
// La cámara (Camera/waypoints.js, 'reserva') sigue mirando a este mismo punto: ninguna posición ni cota cambia.
const R = 3;              // radio del filo luminoso (el original)
const TUBE = 0.06;        // grosor original del filo
const STEEL_R = 0.16;     // sección del anillo de acero: su borde interior toca el filo
const CLAMPS = 12;
const EDGE = '#8fb3ff';
const gain = () => getFloorGain('proof-chen', 'reserva', null);

// Gradientes en canvas (sin assets): velo del hueco y derrame del suelo.
function radialTexture() {
  const s = 256;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(143,179,255,0.10)'); gr.addColorStop(0.7, 'rgba(143,179,255,0.06)'); gr.addColorStop(1, 'rgba(143,179,255,0.16)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
  return t;
}
function spillTexture() {
  const w = 128, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const l = g.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 8; i++) { const t = (i / 8) * 6 - 3; l.addColorStop(i / 8, `rgba(143,179,255,${Math.exp(-0.5 * t * t)})`); }
  g.fillStyle = l; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const v = g.createLinearGradient(0, 0, 0, h); // arriba del lienzo = pegado al aro; se apaga hacia la cámara
  v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.3, 'rgba(0,0,0,0.4)'); v.addColorStop(0.7, 'rgba(0,0,0,0.1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
  return t;
}

export default function Door() {
  const root = useRef();
  const res = useMemo(() => {
    const glowMap = radialTexture();
    const spillMap = spillTexture();
    return {
      glowMap, spillMap,
      edge: new MeshBasicMaterial({ color: EDGE, transparent: true }),
      steel: new MeshStandardMaterial({ color: '#4b535e', roughness: 0.5, metalness: 0.3, transparent: true }),
      steelDark: new MeshStandardMaterial({ color: '#2f353d', roughness: 0.6, metalness: 0.3, transparent: true }),
      veil: new MeshBasicMaterial({ map: glowMap, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }),
      spill: new MeshBasicMaterial({ map: spillMap, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }),
      edgeGeo: new TorusGeometry(R, TUBE, 8, 80),
      ringGeo: new TorusGeometry(R + STEEL_R, STEEL_R, 20, 96),
      outerGeo: new TorusGeometry(R + STEEL_R * 2 + 0.2, 0.03, 8, 96),
      clampGeo: new BoxGeometry(0.3, 0.5, 0.36),
      veilGeo: new CircleGeometry(R, 64),
      spillGeo: new PlaneGeometry(5.4, 7),
    };
  }, []);

  useEffect(() => () => {
    Object.values(res).forEach((o) => o?.dispose?.());
  }, [res]);

  useFrame(() => {
    const g = gain();
    if (!root.current) return;
    root.current.visible = g > 0.01;
    if (!root.current.visible) return;
    // El filo luminoso (el aro original) se enciende con la aproximación — misma trayectoria que la cámara y el contenido — y a tope con la reserva abierta.
    const near = useStore.getState().bookingState !== 'idle' ? 1 : Math.min(1, Math.max(0, scrollState.segments['reserva'] ?? 0) / 0.75);
    res.edge.color.set(EDGE).multiplyScalar(0.55 + 0.45 * near);
    res.edge.opacity = g;
    res.steel.opacity = g;
    res.steelDark.opacity = g;
    res.veil.opacity = g;
    res.spill.opacity = 0.22 * g;
  });

  return (
    <group>
      {/* Suelo pulido (mismo material que el archivo): la 06 ya no flota sobre la retícula desnuda */}
      <FinishedFloor gain={gain} size={[40, 40]} poolZ={3} seed={606} />
      <group ref={root} visible={false}>
        {/* Filo luminoso: el aro original, en su sitio */}
        <mesh position={[0, 3, 0]} geometry={res.edgeGeo} material={res.edge} />
        {/* Cuerpo de acero: su borde interior es el filo; queda un poco detrás para que el filo asome */}
        <mesh position={[0, 3, -0.05]} geometry={res.ringGeo} material={res.steel} />
        <mesh position={[0, 3, -0.16]} geometry={res.outerGeo} material={res.steelDark} />
        {Array.from({ length: CLAMPS }, (_, i) => (
          <group key={i} position={[0, 3, -0.05]} rotation-z={(i / CLAMPS) * Math.PI * 2}>
            <mesh position={[R + STEEL_R, 0, 0]} geometry={res.clampGeo} material={res.steelDark} />
          </group>
        ))}
        {/* Velo de luz en el hueco (aditivo, muy tenue) y derrame del umbral sobre el suelo hacia la cámara */}
        <mesh position={[0, 3, -0.02]} geometry={res.veilGeo} material={res.veil} renderOrder={1} />
        <mesh position={[0, 0.012, 3.6]} rotation-x={-Math.PI / 2} geometry={res.spillGeo} material={res.spill} renderOrder={2} />
      </group>
    </group>
  );
}
