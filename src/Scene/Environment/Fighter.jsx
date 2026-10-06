import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, LinearFilter, MathUtils, ShaderMaterial, TextureLoader, VideoTexture } from 'three';
import { useStore } from '../../App/store.js';
import { getCharactersReveal, prefersReducedMotion } from '../Transitions/scrollState.js';
import { CELL } from './cells.js';

// Luchador dentro de su vitrina. Los vídeos están sobre NEGRO puro: el material los SUMA a la escena (blending aditivo),
// así el negro no aporta nada = "transparente", igual que la foto de fondo. Sin canal alfa → funciona en iPhone.
//  · V22 · EXPLORE: «enfocado» = disciplina ELEGIDA (store.selectedDiscipline). La elección del usuario es la causa; este componente solo responde.
//  · Estado general/overview (ninguna disciplina elegida): este vídeo individual NO se reproduce — el loop real
//    de los tres personajes juntos (roster-completo.mp4) es quien cubre ese estado, ver Environment/RosterGroup.jsx.
//  · Enfocado: se reserva y arranca SU propio vídeo (BOXEO / K1 / MUAY THAI), con ganancia y escala propias.
//    Hace UN pase (loop=false) y se congela en su último frame — no repite el loop detrás del texto del panel.
//    Las otras dos disciplinas quedan invisibles (ganancia 0) mientras tanto — su vídeo sigue reservado.
//  · Al volver al estado general se apaga, vuelve a su frame inicial y el vídeo de los tres juntos (RosterGroup)
//    recupera el protagonismo — la próxima vez que se enfoque, vuelve a hacer su pase completo desde el principio.
//  · Si el móvil bloquea el autoplay (p. ej. modo de bajo consumo de iPhone) se queda el fotograma fijo.
//  · Debajo, un reflejo en el suelo (el mismo plano invertido con degradado).
const VERT = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = `uniform sampler2D uStill;
uniform sampler2D uVideo;
uniform float uMix;
uniform float uGain;
uniform float uReflect;
varying vec2 vUv;
void main() {
  vec3 c = mix(texture2D(uStill, vUv).rgb, texture2D(uVideo, vUv).rgb, uMix);
  float f = 1.0;
  if (uReflect > 0.5) f = (1.0 - smoothstep(0.0, 0.42, vUv.y)) * 0.35;
  gl_FragColor = vec4(c * uGain * f, 1.0);
}`;

function makeMaterial(still, video, reflect) {
  return new ShaderMaterial({
    uniforms: {
      uStill: { value: still }, uVideo: { value: video },
      uMix: { value: 0 }, uGain: { value: 0 }, uReflect: { value: reflect ? 1 : 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
}

export default function Fighter({ discipline }) {
  const { id, video: src, poster, stage } = discipline;
  const group = useRef(null);
  const mirror = useRef(null);
  const st = useRef({ mix: 0, gain: 0.9, scale: 1, blockedAt: -1e9, pending: false, settled: false, wasFocus: false });
  const phase = useMemo(() => [...id].reduce((a, c) => a + c.charCodeAt(0), 0), [id]);

  const media = useMemo(() => {
    const still = new TextureLoader().load(poster);
    const el = document.createElement('video');
    el.src = src;
    // loop=false a propósito (corrección Scene 02, punto 1): al enfocar, el vídeo hace UN pase y se queda
    // congelado en su último frame (el propio comportamiento nativo de <video> al llegar al final sin loop),
    // en vez de repetirse detrás del texto. `st.settled` (más abajo) evita que se reinicie solo mientras
    // sigue enfocado.
    el.loop = false;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    // 'metadata' en vez de 'none': sigue sin descargar el vídeo completo por adelantado, pero deja lista la
    // cabecera/duración para que el primer enfoque no tenga que arrancar la conexión desde cero (punto 6,
    // sensación de retraso al seleccionar por primera vez).
    el.preload = 'metadata';
    const vtex = new VideoTexture(el);
    vtex.minFilter = LinearFilter;
    vtex.magFilter = LinearFilter;
    vtex.generateMipmaps = false;
    return { el, main: makeMaterial(still, vtex, false), refl: makeMaterial(still, vtex, true) };
  }, [poster, src]);

  // Geometría a partir de dónde están la cabeza y los pies dentro del vídeo (stage): todos miden lo mismo en la escena.
  const geo = useMemo(() => {
    const h = CELL.fighterHeight / (stage.bot - stage.top);
    const w = h * stage.ar;
    return { w, h, x: (0.5 - stage.cx) * w, cy: (stage.bot - 0.5) * h };
  }, [stage]);

  useFrame(({ clock }, dt) => {
    const store = useStore.getState();
    const focused = store.selectedDiscipline;
    const isFocus = focused === id;
    const s = st.current;
    const { el } = media;
    // Reservado: el loop individual solo arranca cuando SU disciplina está enfocada. Mientras tanto
    // (overview, o enfocando otra disciplina) el vídeo de los tres juntos (RosterGroup) es quien está activo.
    // Nueva sesión de enfoque (neutro → enfocado): resetea `settled` para que el pase-y-congelado se repita
    // cada vez que se vuelve a seleccionar, no solo la primera.
    if (isFocus && !s.wasFocus) s.settled = false;
    s.wasFocus = isFocus;

    const wantPlay = getCharactersReveal() > 0.02 && !prefersReducedMotion && isFocus && !s.settled;
    const now = performance.now();

    if (wantPlay) {
      if (el.paused && !s.pending && now - s.blockedAt > 3000) {
        s.pending = true;
        const p = el.play();
        if (p && p.then) p.then(() => { s.pending = false; }).catch(() => { s.pending = false; s.blockedAt = now; });
        else s.pending = false;
      }
    } else if (!el.paused) {
      el.pause();
    }
    // Fin natural del pase único (loop=false): se queda quieta en su último frame, sin volver a arrancar
    // mientras siga siendo la enfocada (punto 1: "debe quedar congelado en un frame visualmente limpio").
    if (isFocus && el.ended) s.settled = true;

    const playing = (wantPlay || (isFocus && s.settled)) && el.readyState >= 2 && el.currentTime > 0.05;
    s.mix = MathUtils.damp(s.mix, playing ? 1 : 0, 6, dt);
    // Al apagarse (deja de estar enfocada), vuelve al inicio: la próxima vez empieza en la misma pose que el
    // fotograma fijo, en vez de reanudar desde el último frame congelado de la sesión anterior.
    if (!isFocus && el.paused && s.mix < 0.02 && el.currentTime > 0) el.currentTime = 0;

    // Invisible salvo cuando es la disciplina enfocada: fuera de foco, el vídeo de los tres juntos cubre el hueco.
    s.gain = MathUtils.damp(s.gain, isFocus ? 1.1 : 0, 4, dt);
    s.scale = MathUtils.damp(s.scale, focused ? (isFocus ? 1.12 : 0.95) : 1, 4, dt);
    const breathe = prefersReducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.6 + phase) * 0.006 * (1 - s.mix);
    if (group.current) group.current.scale.set(s.scale, s.scale * (1 + breathe), 1);
    if (mirror.current) mirror.current.scale.set(s.scale, -s.scale * (1 + breathe), 1);
    // Invisible hasta que la Entrada (01) haya terminado de difuminarse; luego se revela con el scroll.
    // Blending aditivo: ganancia 0 = no suma nada a la escena = invisible de verdad (no un simple "detrás").
    const reveal = getCharactersReveal();
    for (const m of [media.main, media.refl]) {
      m.uniforms.uMix.value = s.mix;
      m.uniforms.uGain.value = s.gain * reveal;
    }
  });

  return (
    <group>
      <group ref={group} position={[0, CELL.feetY, 0]}>
        <mesh position={[geo.x, geo.cy, 0]} material={media.main}>
          <planeGeometry args={[geo.w, geo.h]} />
        </mesh>
      </group>
      <group ref={mirror} position={[0, 0, 0]} scale={[1, -1, 1]}>
        <mesh position={[geo.x, CELL.feetY + geo.cy, 0]} material={media.refl}>
          <planeGeometry args={[geo.w, geo.h]} />
        </mesh>
      </group>
    </group>
  );
}
