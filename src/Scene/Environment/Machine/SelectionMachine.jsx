import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BoxGeometry, CanvasTexture, Color, DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, PMREMGenerator,
  PlaneGeometry, Scene, SRGBColorSpace,
} from 'three';
import { FINISH } from '../Room/roomSpec.js';
import { getRoomGain } from '../Room/roomGain.js';
import {
  HEAD_FRONT, M, MACHINE_FITS_PLATFORM, MACHINE_POSITION, MODULES, PALETTE, ROLLER_Y, SLOPE_ANGLE, moduleX,
} from './machineSpec.js';
import { buildMachine, disposeMachine } from './machineGeometry.js';
import { paintChevron, paintContact, paintLabel, paintModulePlate } from './machinePaint.js';
import { machineRig } from './machineRig.js';
import { scrollState } from '../../Transitions/scrollState.js';
import { stepOf } from '../../Camera/waypoints.js';

// ESCENA 03 — máquina de selección de cinco módulos, sobre la plataforma existente (Room/roomSpec.js → PLATFORM).
// Es geometría 3D real (machineGeometry.js). Sin luces nuevas: el material se lee con la luz que YA hay (ambiente +
// luz que sigue a la cámara) y con un entorno de reflexión PROPIO de estos materiales (no toca scene.environment),
// que reproduce las luminarias lineales del techo de la sala (x = ±2, ±6) — así el grafito y el acero brillan
// exactamente donde brillan las luminarias. Aparece con getRoomGain() igual que el resto de la sala.
// SIN interacción: los rodillos quedan registrados en machineRig.rollers para conectar Reel.jsx después.

// Entorno de reflexión mínimo: negro, las luminarias del techo de la sala y un relleno tenue detrás de cámara.
export function makeStudioEnv(gl) {
  const s = new Scene();
  s.background = new Color('#040507');
  const hdr = (v) => new MeshBasicMaterial({ color: new Color(v, v, v) });
  FINISH.lights.xs.forEach((x) => {
    const m = new Mesh(new BoxGeometry(0.3, 0.02, 24), hdr(6));
    m.position.set(x, 3.2, 0);
    s.add(m);
  });
  const fill = new Mesh(new PlaneGeometry(8, 3), hdr(0.32)); // relleno suave frente a la máquina (lado cámara)
  fill.position.set(0, 2.2, 8); fill.rotation.y = Math.PI;
  s.add(fill);
  const back = new Mesh(new PlaneGeometry(30, 8), hdr(0.05));
  back.position.set(0, 2, -9);
  s.add(back);
  const pm = new PMREMGenerator(gl);
  const rt = pm.fromScene(s, 0.02);
  pm.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt;
}

export default function SelectionMachine({ gain = getRoomGain, position = MACHINE_POSITION, scale = 1, rig = machineRig }) {
  const root = useRef();
  const last = useRef(-1);
  const gl = useThree((s) => s.gl);

  const res = useMemo(() => {
    if (!MACHINE_FITS_PLATFORM && import.meta.env?.DEV) console.warn('SelectionMachine: la máquina no cabe sobre la plataforma');
    const geo = buildMachine();
    const env = makeStudioEnv(gl);
    const fades = []; // materiales que aparecen con getRoomGain()
    const fade = (mat, { c = true, e = false, o = false } = {}) => {
      fades.push({ mat, base: mat.color.clone(), env: e ? mat.envMapIntensity : undefined, op: o ? mat.opacity : undefined, c });
      return mat;
    };
    const std = (color, metalness, roughness, extra = {}) =>
      fade(new MeshStandardMaterial({ color, metalness, roughness, envMap: env.texture, envMapIntensity: 1, ...extra }), { e: true, o: !!extra.transparent });
    const mats = {
      graphite: std(PALETTE.graphite, 0.65, 0.4),           // grafito satinado
      graphiteDark: std(PALETTE.graphiteDark, 0.5, 0.55),
      plate: std(PALETTE.plate, 0.6, 0.34),
      steel: std(PALETTE.steel, 1, 0.3),                    // acero mecanizado
      aluminum: std(PALETTE.aluminum, 0.9, 0.5),            // aluminio cepillado
      glass: std(PALETTE.glass, 0.1, 0.06, { transparent: true, opacity: 0.38, depthWrite: false, side: DoubleSide }),
      light: fade(new MeshBasicMaterial({ color: new Color(PALETTE.light).multiplyScalar(0.9) })),
    };

    const tex = [];
    const makeTex = (w, h, paint) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      t.userData.repaint = () => { paint(ctx, w, h); t.needsUpdate = true; };
      t.userData.repaint();
      tex.push(t);
      return t;
    };
    const po = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    const decal = (map, k) => {
      const m = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, ...po });
      m.color.setScalar(k);
      return fade(m);
    };
    const plates = MODULES.map((mod) => decal(makeTex(256, 256, (g, w, h) => paintModulePlate(g, w, h, mod)), 0.9));
    const label = decal(makeTex(1024, 128, paintLabel), 0.85);
    const chevron = decal(makeTex(64, 64, paintChevron), 0.85);
    const contactTex = makeTex(512, 128, paintContact);
    const contact = fade(new MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.9 }), { c: false, o: true });
    return { geo, env, mats, tex, plates, label, chevron, contact, fades };
  }, [gl]);

  useEffect(() => {
    // Los grabados usan las fuentes del proyecto (Google Fonts): se repintan cuando terminan de cargar.
    let alive = true;
    document.fonts?.ready?.then(() => alive && res.tex.forEach((t) => t.userData.repaint?.()));
    return () => { alive = false; };
  }, [res]);

  useEffect(() => {
    rig.root = root.current;
    return () => {
      rig.root = null; rig.rollers.length = 0;
      disposeMachine(res.geo);
      Object.values(res.mats).forEach((m) => m.dispose());
      [...res.plates, res.label, res.chevron, res.contact].forEach((m) => m.dispose());
      res.tex.forEach((t) => t.dispose());
      res.env.dispose();
    };
  }, [res, rig]);

  // Ángulo actual de cada tambor (rad). Sigue a la opción elegida en el store por el camino corto.
  const ang = useRef([]);
  useFrame((_, dt) => {
    const g = gain();
    const r = root.current;
    if (!r) return;
    r.visible = g > 0.01;
    if (!r.visible) return;
    // MÉTODO: cada paso es un módulo. El del paso en curso gira media vuelta al leerse y los ya recorridos quedan a vuelta completa
    // (mismo paso que mueve la cámara y el contenido: Camera/waypoints.js#stepOf). Solo gira el mecanismo de cada módulo (rodillo).
    const cur = stepOf(scrollState.segments['asesoria-lab'] ?? 0, MODULES.length);
    rig.rollers.forEach((rl, i) => {
      if (!rl) return;
      const target = i < cur ? Math.PI * 2 : i === cur ? Math.PI : 0;
      ang.current[i] = ang.current[i] === undefined ? target : ang.current[i] + (target - ang.current[i]) * (1 - Math.exp(-dt * 4));
      rl.rotation.y = ang.current[i];
    });
    if (Math.abs(g - last.current) < 1e-3) return;
    last.current = g;
    for (const f of res.fades) {
      if (f.c) f.mat.color.copy(f.base).multiplyScalar(g);
      if (f.env !== undefined) f.mat.envMapIntensity = f.env * g;
      if (f.op !== undefined) f.mat.opacity = f.op * g;
    }
  });

  const { geo, mats } = res;
  const yb = M.plinthTop;
  const headMidY = yb + M.module.collar + M.module.glass + M.module.head / 2;
  const plateZ = 0.3 - M.slope.lean / 2;
  const plateY = (M.slope.y0 + yb) / 2;

  return (
    <group ref={root} position={position} scale={scale} visible={false} name="selection-machine">
      {/* Sombra de contacto horneada sobre la cubierta de la plataforma */}
      <mesh position={[0, 0.006, 0]} rotation-x={-Math.PI / 2} material={res.contact} renderOrder={1}>
        <planeGeometry args={[3.6, 1.1]} />
      </mesh>

      {/* Estructura fusionada por material */}
      <mesh geometry={geo.graphite} material={mats.graphite} />
      <mesh geometry={geo.graphiteDark} material={mats.graphiteDark} />
      <mesh geometry={geo.plate} material={mats.plate} />
      <mesh geometry={geo.steel} material={mats.steel} />
      <mesh geometry={geo.aluminum} material={mats.aluminum} />
      <mesh geometry={geo.light} material={mats.light} />

      {/* Rótulo grabado en la placa central inclinada del bastidor */}
      <group position={[0, plateY, plateZ]} rotation-x={-SLOPE_ANGLE}>
        <mesh position={[0, 0.012, 0.0135]} material={res.label} renderOrder={3}>
          <planeGeometry args={[1.1, 0.1375]} />
        </mesh>
      </group>

      {/* Un rodillo físico por módulo, cada uno con su grupo propio (listo para Reel.jsx) */}
      {MODULES.map((mod, i) => (
        <group key={mod.id} name={`roller-${mod.id}`} position={[moduleX(i), ROLLER_Y, 0]} userData={{ module: mod.id }}
          ref={(el) => { rig.rollers[i] = el; }}>
          <mesh geometry={geo.roller.graphite} material={mats.graphite} />
          <mesh geometry={geo.roller.steel} material={mats.steel} />
          <mesh geometry={geo.roller.aluminum} material={mats.aluminum} />
        </group>
      ))}

      {/* Chevron de lectura (detrás del vidrio), ventana de icono en la cabeza de cada módulo */}
      {MODULES.map((mod, i) => (
        <group key={mod.id}>
          <mesh position={[moduleX(i), yb + 0.275, 0.11]} material={res.chevron} renderOrder={1}>
            <planeGeometry args={[0.05, 0.05]} />
          </mesh>
          <mesh position={[moduleX(i), headMidY, HEAD_FRONT + 0.001]} material={res.plates[i]} renderOrder={3}>
            <planeGeometry args={[0.28, 0.28]} />
          </mesh>
        </group>
      ))}

      {/* Cristal oscuro: SOLO las cinco ventanas de visualización (se dibuja después de lo que hay detrás) */}
      <mesh geometry={geo.glass} material={mats.glass} renderOrder={2} />
    </group>
  );
}
