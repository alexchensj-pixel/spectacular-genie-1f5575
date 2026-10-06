import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Color, MathUtils, SRGBColorSpace } from 'three';
import { useStore } from '../../App/store.js';
import { disciplines } from '../../Data/Disciplines.js';
import { seleccion, explore } from '../../Data/Content.js';
import { getCharactersReveal, isExploreActive } from '../Transitions/scrollState.js';
import { cellX, layoutK, exploreLayoutAspect } from './cells.js';

// EXPLORE (v30) — LA SELECCIÓN VIVE EN EL ESPACIO, no en un panel.
//
//   OBJETO   → los tres luchadores (disciplina) y CINCO ESTACIONES sobre la cubierta, delante de ellos (forma de entrenar).
//   ESTADO   → estación 01…05 = una pila de 1…5 discos (el número ES la geometría). Disciplina = su socket de suelo.
//   INTERACCIÓN → tocar una estación o un luchador (raycast). Los botones HTML de Explore quedan solo como acceso por teclado / lector.
//   CONSECUENCIA → la estación elegida sube una columna de luz con el color de la disciplina, el carril se enciende de 01 hasta ella
//                  y un haz une la estación con el luchador elegido; el socket del luchador se abre. Sin disciplina, los tres sockets
//                  respiran: dicen «aquí se elige». Con una elegida, los otros dos se apagan.
//   INFORMACIÓN → el texto (Explore.jsx) solo aparece como consecuencia, y solo el nivel que se pide.
//
// Todo en unidades de mundo (m), en el mismo sistema que Pillars: el grupo escala en X/Z con layoutK (igual que el volumen y los aros).
const N = seleccion.formas.length; // 5
const DECK_TOP = 0.06;
const Z = 1.5;                      // fila de estaciones (m, desktop): sobre la cubierta, entre los luchadores y la cámara; en móvil se escala con layoutK para no salirse de la cubierta
const GAP = 1.6;                    // separación entre estaciones: NO escala con layoutK (en vertical 1 m ≈ 43 px → 69 px entre estaciones, zona táctil ≥ 44 px)
const R = 0.42;                     // radio del disco base (v30b: 0,26 → 0,42; en vertical ≈ 18 px de radio)
const COL_H = 1.3;                  // altura de la columna de luz
const HIT_R = 0.75;                 // radio táctil: diámetro 1,5 m < GAP, las zonas no se solapan
const stX = (j) => (j - (N - 1) / 2) * GAP;
const OFF = new Color('#3a4459');
const WHITE = new Color('#f2f4f8');
const tmp = new Color();

// Rótulo en el espacio (sprite de canvas): numeral siempre; el nombre de la forma solo en la estación activa. Solo reutiliza el copy existente.
function labelTexture(text, big) {
  const c = document.createElement('canvas');
  c.width = big ? 512 : 128; c.height = big ? 96 : 96;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${big ? 54 : 64}px "Big Shoulders Display", "Barlow Condensed", Impact, sans-serif`;
  g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8;
  g.fillStyle = '#ffffff';
  g.fillText(big ? text.toUpperCase() : text, c.width / 2, c.height / 2 + 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
const firstWord = (t) => t.split(' ')[0];
const target = new Color();

export default function ModeStations() {
  const root = useRef();
  const mats = useRef({ base: [], disc: [], col: [], sock: [], rail: null, lit: null, beam: null });
  const colRefs = useRef([]);
  const discRefs = useRef([]);
  const litRef = useRef();
  const railMesh = useRef();
  const beamRef = useRef();
  const hov = useRef(-1);
  const colorOf = useMemo(() => disciplines.map((d) => new Color(d.accent)), []);
  const sockRefs = useRef([]);
  const stRefs = useRef([]);
  const numRefs = useRef([]);
  const nameRefs = useRef([]);
  const numTex = useMemo(() => seleccion.formas.map((_, j) => labelTexture(String(j + 1).padStart(2, '0'), false)), []);
  const nameTex = useMemo(() => seleccion.formas.map((f) => labelTexture(firstWord(explore.modosTitulo[f.id]), true)), []);
  const lerpState = useRef({ lit: 0, beam: 0, h: new Array(N).fill(0), s: disciplines.map(() => 0) });

  useFrame(({ size, clock }, dt) => {
    const st = useStore.getState();
    const aspect = exploreLayoutAspect(size.width, size.height);
    const k = layoutK(aspect);
    const reveal = getCharactersReveal();
    const g = root.current;
    if (!g) return;
    g.visible = reveal > 0.01;
    // Las estaciones NO se estrechan con k (si no, en móvil vertical quedarían de ~11 px): solo se acerca su fila al centro (z·k) para seguir sobre la cubierta.
    const zs = Z * k;

    const mode = seleccion.formas.findIndex((f) => f.id === st.selectedTrainingMode);
    const di = disciplines.findIndex((d) => d.id === st.selectedDiscipline);
    const L = lerpState.current;
    if (di >= 0) target.copy(colorOf[di]); else target.copy(WHITE);

    // Estaciones
    for (let j = 0; j < N; j++) {
      const on = j === mode;
      L.h[j] = MathUtils.damp(L.h[j], on ? 1 : 0, 6, dt);
      const sg = stRefs.current[j];
      if (sg) sg.position.set(stX(j), DECK_TOP, zs);
      const col = colRefs.current[j];
      if (col) {
        col.scale.y = Math.max(L.h[j], 0.001) * COL_H;
        col.position.y = (Math.max(L.h[j], 0.001) * COL_H) / 2;
        col.material.opacity = 0.75 * L.h[j] * reveal;
        col.material.color.copy(target);
      }
      const grp = discRefs.current[j];
      if (grp) {
        const bright = on ? 1 : hov.current === j ? 0.55 : mode >= 0 ? 0.25 : 0.4;
        grp.children.forEach((m) => {
          tmp.copy(OFF).lerp(on ? target : WHITE, bright);
          m.material.color.copy(tmp);
          m.material.opacity = (on ? 1 : 0.35 + 0.5 * bright) * reveal;
        });
        grp.position.y = 0.005 + L.h[j] * 0.05;
      }
      const nu = numRefs.current[j];
      if (nu) { nu.material.opacity = (on ? 1 : hov.current === j ? 0.9 : 0.55) * reveal; nu.material.color.copy(on ? target : WHITE); }
      const nm = nameRefs.current[j];
      if (nm) { nm.material.opacity = L.h[j] * reveal; nm.position.y = 0.45 + L.h[j] * (COL_H + 0.3); }
    }

    // Carril: de 01 hasta la estación activa
    const rail = mats.current.rail;
    if (rail) rail.opacity = 0.35 * reveal;
    if (railMesh.current) railMesh.current.position.z = zs;
    L.lit = MathUtils.damp(L.lit, mode >= 0 ? mode / (N - 1) : 0, 6, dt);
    if (litRef.current) {
      const len = Math.max(L.lit * (N - 1) * GAP, 0.001);
      litRef.current.scale.x = len;
      litRef.current.position.x = stX(0) + len / 2;
      litRef.current.position.z = zs;
      litRef.current.material.opacity = (mode >= 0 ? 0.95 : 0) * reveal;
      litRef.current.material.color.copy(target);
    }

    // Haz estación → luchador elegido (solo si hay ambos)
    const bm = beamRef.current;
    if (bm) {
      const both = mode >= 0 && di >= 0;
      L.beam = MathUtils.damp(L.beam, both ? 1 : 0, 6, dt);
      bm.visible = L.beam > 0.02;
      if (bm.visible) {
        const sx = stX(mode), sz = zs, ex = cellX(di) * k, ez = 0.0;
        const dx = ex - sx, dz = ez - sz;
        const len = Math.hypot(dx, dz) * L.beam;
        bm.position.set(sx + (dx * L.beam) / 2, DECK_TOP + 0.03, sz + (dz * L.beam) / 2);
        bm.rotation.set(0, Math.atan2(dx, dz), 0);
        bm.scale.set(1, 1, Math.max(len, 0.001));
        bm.material.color.copy(target);
        bm.material.opacity = 0.9 * reveal;
      }
    }

    // Sockets de disciplina (bajo cada luchador)
    const t = clock.elapsedTime;
    disciplines.forEach((d, i) => {
      const s = sockRefs.current[i];
      if (!s) return;
      const sel = i === di;
      const idle = di < 0;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3);
      const goal = sel ? 1 : idle ? 0.3 + 0.25 * pulse : 0.08;
      L.s[i] = MathUtils.damp(L.s[i], goal, 6, dt);
      s.position.x = cellX(i) * k;
      s.material.opacity = L.s[i] * reveal;
      s.material.color.copy(colorOf[i]);
      s.scale.setScalar(sel ? 1.12 : 1 + (idle ? 0.04 * pulse : 0));
    });
  });

  const setCursor = (c) => { if (typeof document !== 'undefined') document.body.style.cursor = c; };
  const pick = (j) => (e) => {
    e.stopPropagation();
    if (!isExploreActive()) return;
    const s = useStore.getState();
    const id = seleccion.formas[j].id;
    s.selectTrainingMode(s.selectedTrainingMode === id ? null : id);
  };

  return (
    <group ref={root} visible={false}>
      {/* carril 01 → 05 */}
      <mesh ref={railMesh} position={[0, DECK_TOP + 0.004, Z]}>
        <boxGeometry args={[(N - 1) * GAP, 0.008, 0.05]} />
        <meshBasicMaterial ref={(m) => (mats.current.rail = m)} color="#5a6a8a" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={litRef} position={[stX(0), DECK_TOP + 0.008, Z]}>
        <boxGeometry args={[1, 0.016, 0.05]} />
        <meshBasicMaterial color="#f2f4f8" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* haz estación → luchador */}
      <mesh ref={beamRef} visible={false}>
        <boxGeometry args={[0.05, 0.02, 1]} />
        <meshBasicMaterial color="#f2f4f8" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* cinco estaciones: la estación j es una pila de j+1 discos */}
      {seleccion.formas.map((f, j) => (
        <group key={f.id} ref={(el) => (stRefs.current[j] = el)} position={[stX(j), DECK_TOP, Z]}>
          <group ref={(el) => (discRefs.current[j] = el)} position={[0, 0.005, 0]}>
            {Array.from({ length: j + 1 }, (_, n) => (
              <mesh key={n} position={[0, n * 0.075, 0]}>
                <cylinderGeometry args={[R - 0.02 - n * 0.025, R - n * 0.025, 0.07, 32]} />
                <meshBasicMaterial color="#3a4459" transparent opacity={0.6} />
              </mesh>
            ))}
          </group>
          <mesh ref={(el) => (colRefs.current[j] = el)} position={[0, 0.001, 0]} scale={[1, 0.001, 1]}>
            <cylinderGeometry args={[0.05, 0.05, 1, 10]} />
            <meshBasicMaterial color="#f2f4f8" transparent opacity={0} depthWrite={false} />
          </mesh>
          <sprite ref={(el) => (numRefs.current[j] = el)} position={[0, 0.62, 0]} scale={[0.55, 0.41, 1]}>
            <spriteMaterial map={numTex[j]} transparent opacity={0} depthWrite={false} />
          </sprite>
          <sprite ref={(el) => (nameRefs.current[j] = el)} position={[0, 0.45, 0]} scale={[2.4, 0.45, 1]}>
            <spriteMaterial map={nameTex[j]} transparent opacity={0} depthWrite={false} />
          </sprite>
          {/* área de toque cómoda en móvil (≥ 0,5 m de radio), invisible */}
          <mesh
            position={[0, 0.5, 0]}
            onClick={pick(j)}
            onPointerOver={(e) => { e.stopPropagation(); hov.current = j; setCursor('pointer'); }}
            onPointerOut={() => { if (hov.current === j) hov.current = -1; setCursor(''); }}
          >
            <cylinderGeometry args={[HIT_R, HIT_R, 1.4, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* sockets de disciplina bajo cada luchador: dicen «aquí se elige» y marcan el elegido */}
      {disciplines.map((d, i) => (
        <mesh key={d.id} ref={(el) => (sockRefs.current[i] = el)} position={[cellX(i), DECK_TOP + 0.03, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.95, 1.1, 64]} />
          <meshBasicMaterial color={d.accent} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
