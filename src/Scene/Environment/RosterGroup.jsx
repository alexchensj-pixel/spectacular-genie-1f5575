import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, LinearFilter, MathUtils, ShaderMaterial, TextureLoader, Vector2, VideoTexture } from 'three';
import { useStore } from '../../App/store.js';
import { getCharactersReveal, prefersReducedMotion } from '../Transitions/scrollState.js';
import { video, poster } from '../../Data/Media.js';
import { disciplines } from '../../Data/Disciplines.js';
import { CELL, cellX, layoutK, portraitAmount, exploreLayoutAspect } from './cells.js';

// Ganancia de reposo (nadie enfocado) y ganancia "atenuada" (otro luchador está enfocado): los otros dos
// SIGUEN visibles en su propio recorte de este vídeo de conjunto mientras dura el foco — solo el recorte
// del luchador enfocado cede casi del todo el protagonismo a su vídeo individual (Fighter.jsx), evitando
// que ambos (grupo + individual) se sumen en el mismo sitio (blending aditivo).
const GAIN_IDLE = 0.9;
const GAIN_DIM = 0.42;
const GAIN_HANDOFF = 0.05;

// --- Composición MÓVIL VERTICAL (solo cuando portraitAmount(aspect) > 0; en escritorio todo esto vale 0 y no hay cambio) ---
// El foco cambia la jerarquía, no el sujeto: los tres luchadores deben seguir leyéndose como las tres opciones.
//  · GAIN_DIM_PORTRAIT: los otros dos se atenúan MENOS que en escritorio (0.42 → 0.64) — en una pantalla pequeña y
//    con los laterales del vídeo ya oscuros de origen, 0.42 los dejaba casi apagados. Siguen por debajo del enfocado.
//  · LATERAL_GAIN_PORTRAIT: los laterales (Muay Thai / Boxeo) salen ~15 % más oscuros que el central en el vídeo
//    (luminancia media 79–91 vs 92): un empujón pequeño en reposo para que Muay Thai (rojo oscuro sobre negro) no
//    se pierda con brillo de móvil bajo.
//  · LATERAL_SCALE_PORTRAIT: en el fotograma de conjunto el central (K1) es ~17 % más alto que los laterales
//    (955 px vs 812–817 px de 1080) — perspectiva del propio vídeo — y por eso «se lo comía todo». En vertical se
//    igualan las tres alturas (los individuales de Fighter.jsx ya miden los tres CELL.fighterHeight, así que además
//    el cambio recorte → vídeo individual al enfocar deja de dar un salto de tamaño). Se escala desde la línea de
//    pies. `feet` (en CHAR_CROPS) = fila (px, sobre 1080) donde apoya cada uno en el fotograma; STAGE.bot es la
//    línea común de escala. Se ajusta cada recorte esa diferencia para que los tres apoyen en el mismo suelo.
const GAIN_DIM_PORTRAIT = 0.64;
const LATERAL_GAIN_PORTRAIT = 1.1;
const LATERAL_SCALE_PORTRAIT = 1.17;

// Vídeo REAL de los tres personajes juntos (roster-completo.mp4): es el loop del estado general/overview de
// Character Select. Se usa en la transición Entrada → construcción de vitrinas → Character Select (mismo
// `getCharactersReveal` que ya regía la revelación), y es la pose de reposo mientras no hay ninguna disciplina
// enfocada. En cuanto se enfoca una disciplina, cede el protagonismo a su vídeo individual (Fighter.jsx); al
// volver al estado general (selectedDiscipline === null) reaparece por el mismo camino. Mismo tratamiento visual
// que los luchadores individuales: vídeo sobre NEGRO puro, blending aditivo (sin canal alfa, válido en iPhone).
//
// ALINEACIÓN CON LAS VITRINAS: en el fotograma (1890×1080) los tres luchadores NO están repartidos a lo ancho
// de todo el vídeo — están agrupados hacia el centro (medido sobre roster-completo-poster.jpg: centros en
// x≈424, 911, 1432 px de 1890). Si se renderiza el vídeo como UN plano único a todo lo ancho, esa agrupación
// se traslada tal cual al mundo 3D y los luchadores quedan muy juntos frente a unas vitrinas mucho más
// separadas (cellX: -4, 0, 4) → desalineados (más los extremos que el centro).
// Arreglo: en vez de un plano, TRES recortes horizontales del mismo vídeo (CHAR_CROPS), cada uno reposicionado
// para que el CENTRO REAL del personaje (no el centro del recorte) caiga exactamente en la x de su vitrina.
// Sin estirar nada: la escala px→mundo es uniforme (misma que antes), solo cambia dónde se planta cada recorte.
// El vídeo trae, de izquierda a derecha: Muay Thai · K1 · Boxeo. Las vitrinas van Boxeo · K1 · Muay Thai
// (Disciplines.js + cellX) — por eso Muay Thai (recorte más a la izquierda del vídeo) se planta en la vitrina
// más a la derecha (cellX(2)) y viceversa. Ya no hace falta invertir el vídeo (antes se espejaba entero con
// vUv.x): al posicionar cada recorte de forma independiente, el reordenamiento se resuelve con la posición,
// no con un flip — y de paso las poses dejan de aparecer espejadas respecto al vídeo individual de cada
// disciplina (Fighter.jsx), que nunca se espeja.
//
// SEPARACIÓN LATERAL vs. ACERCAMIENTO EN Z: con los tres luchadores ya en su x final (±3.65 aprox.), acercar
// todo el grupo a cámara en Z (ver APPROACH_Z más abajo) los dispara en pantalla — cuanto más cerca de la
// cámara, mayor la proyección en x de cualquier objeto que NO esté centrado (perspectiva). Con reveal≈0 (justo
// al entrar en el umbral, grupo muy cerca) los laterales quedaban fuera de encuadre y solo se veía el del
// centro; no reaparecían hasta reveal≈1 (grupo ya en su Z de reposo, al terminar el scroll de la escena 2).
// Arreglo: la separación lateral de cada luchador se interpola con el MISMO `reveal` que ya rige la opacidad
// y el acercamiento en Z — nace pegada a x=0 (los tres superpuestos/juntos, igual que en el vídeo original) y
// se abre hasta su x final justo cuando el grupo también ha llegado a su Z de reposo. Mismo progreso, cero
// variables nuevas, reversible igual que el resto.
//
// ES el "rectángulo" de la transición Entrada → Character Select: no hay ningún velo/pantalla 2D en ese
// umbral (deshabilitado a propósito en TransitionVeil.jsx), así que estos planos — ya con el vídeo real, ya
// sin foco en ninguna disciplina — son el único contenido de esa transición. Para que se sienta "de camino" y
// no solo aparecer de golpe en su sitio final, todo el grupo nace con un offset en Z (más cerca de la cámara,
// aprox. donde termina el umbral) y se asienta a 0 según la MISMA curva `reveal` que ya gobierna su opacidad
// — sin variable nueva: mismo progreso, reversible igual que el resto de la escena.
const APPROACH_Z = 14; // nace ~14 m más cerca de la cámara que su posición de reposo (anchorZ(1) + 14 ≈ -26)

const VIDEO_W = 1890;
const VIDEO_H = 1080;

// x0/x1: límites en px del recorte horizontal de cada luchador (cubren todo el ancho del vídeo entre ellos,
// el negro sobrante no pinta nada por el blending aditivo). cx: centro REAL del cuerpo dentro de ese recorte
// (medido sobre el poster). cell: índice de vitrina (cellX) donde debe caer ese cx.
// feet: fila de pies del luchador en el fotograma (medida sobre el poster); lateral: recorte que se iguala en
// altura al central en móvil vertical (ver LATERAL_SCALE_PORTRAIT).
const CHAR_CROPS = [
  { x0: 0, x1: 655, cx: 424, cell: 2, feet: 940, lateral: true }, // Muay Thai → vitrina derecha
  { x0: 655, x1: 1178, cx: 911.5, cell: 1, feet: 1032, lateral: false }, // K1 → vitrina central
  { x0: 1178, x1: 1890, cx: 1432, cell: 0, feet: 952, lateral: true }, // Boxeo → vitrina izquierda
];

const VERT = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = `uniform sampler2D uStill;
uniform sampler2D uVideo;
uniform float uMix;
uniform float uGain;
uniform float uReflect;
uniform vec2 uRange; // recorte horizontal en uv normalizado: x = u0, y = u1
varying vec2 vUv;
void main() {
  vec2 uv = vec2(mix(uRange.x, uRange.y, vUv.x), vUv.y);
  vec3 c = mix(texture2D(uStill, uv).rgb, texture2D(uVideo, uv).rgb, uMix);
  float f = 1.0;
  if (uReflect > 0.5) f = (1.0 - smoothstep(0.0, 0.42, vUv.y)) * 0.35;
  gl_FragColor = vec4(c * uGain * f, 1.0);
}`;

function makeMaterial(still, vid, reflect, u0, u1) {
  return new ShaderMaterial({
    uniforms: {
      uStill: { value: still }, uVideo: { value: vid },
      uMix: { value: 0 }, uGain: { value: 0 }, uReflect: { value: reflect ? 1 : 0 },
      uRange: { value: new Vector2(u0, u1) },
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

// Encuadre vertical real del fotograma (roster-completo.mp4): cabeza más alta (K1, centro) y pies más bajos
// dentro del vídeo. Igual que el `stage` de cada disciplina (Disciplines.js), fija la altura "estatua" a la
// misma CELL.fighterHeight que usan los luchadores individuales, para que la escala no salte al hacer focus.
const STAGE = { top: 0.06, bot: 0.93 };

export default function RosterGroup() {
  // `gain` es ahora un valor por recorte/luchador (no uno solo compartido): así el enfocado puede ceder el
  // paso a su vídeo individual mientras los otros dos SIGUEN visibles aquí, solo atenuados (punto 3 del
  // encargo: "los otros dos pierden intensidad, pero permanecen visibles").
  const st = useRef({ mix: 0, gain: CHAR_CROPS.map(() => 0), blockedAt: -1e9, pending: false });
  const approach = useRef(null);

  const media = useMemo(() => {
    const still = new TextureLoader().load(poster.roster);
    const el = document.createElement('video');
    el.src = video.roster;
    el.loop = true;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.preload = 'auto'; // es el primer vídeo visible de la escena: hace falta desde el arranque de la transición
    const vtex = new VideoTexture(el);
    vtex.minFilter = LinearFilter;
    vtex.magFilter = LinearFilter;
    vtex.generateMipmaps = false;
    const mats = CHAR_CROPS.map((c) => ({
      main: makeMaterial(still, vtex, false, c.x0 / VIDEO_W, c.x1 / VIDEO_W),
      refl: makeMaterial(still, vtex, true, c.x0 / VIDEO_W, c.x1 / VIDEO_W),
    }));
    return { el, mats };
  }, []);

  // Una entrada de geometría por luchador: mismo alto para los tres (fighterHeight), ancho = solo el recorte
  // que le corresponde, y xTarget calculada para que su centro REAL (c.cx) caiga en cellX(c.cell), no el
  // centro del recorte. xTarget es el destino final — la x que se aplica cada frame se interpola hacia ahí
  // con `reveal` (ver useFrame), no se usa directamente en el JSX.
  const geo = useMemo(() => {
    const h = CELL.fighterHeight / (STAGE.bot - STAGE.top);
    const cy = (STAGE.bot - 0.5) * h;
    const pxToWorld = h / VIDEO_H; // escala uniforme (misma en horizontal y vertical, sin distorsión)
    return CHAR_CROPS.map((c) => {
      const w = (c.x1 - c.x0) * pxToWorld;
      const cropMid = (c.x0 + c.x1) / 2;
      const offset = (c.cx - cropMid) * pxToWorld; // cuánto se desvía el cuerpo del centro de SU recorte
      const xTarget = cellX(c.cell) - offset;
      // Diferencia (m) entre la línea de escala común (STAGE.bot) y donde de verdad apoyan sus pies en el fotograma.
      const feetGap = (STAGE.bot * VIDEO_H - c.feet) * pxToWorld;
      return { w, h, cy, xTarget, offset, feetGap };
    });
  }, []);

  const mainGroups = useRef([]);
  const reflGroups = useRef([]);
  const mainMeshes = useRef([]);
  const reflMeshes = useRef([]);

  useFrame(({ size }, dt) => {
    const focused = useStore.getState().selectedDiscipline; // V22: la disciplina elegida en EXPLORE
    const focusedIdx = focused ? disciplines.findIndex((d) => d.id === focused) : -1;
    const s = st.current;
    const { el } = media;
    const reveal = getCharactersReveal();
    // Igual que Fighter.jsx: el loop arranca en cuanto empieza a revelarse la transición Entrada → Character
    // Select, sin esperar a nada más — así la transición llega ya con los tres luchadores en movimiento.
    const wantPlay = reveal > 0.02 && !prefersReducedMotion;
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

    const playing = wantPlay && !el.paused && el.readyState >= 2 && el.currentTime > 0.05;
    s.mix = MathUtils.damp(s.mix, playing ? 1 : 0, 6, dt);
    if (!wantPlay && el.paused && s.mix < 0.02 && el.currentTime > 0) el.currentTime = 0;

    // Estado general (sin foco): los tres a ganancia de reposo. Al enfocar uno, SOLO su propio recorte cede
    // casi del todo el protagonismo a su vídeo individual (Fighter.jsx) — los otros dos se atenúan pero
    // siguen sumando luz (visibles), y todos vuelven a la ganancia de reposo en cuanto se libera el foco.
    // Composición móvil vertical (0 en escritorio → todo lo de abajo se queda exactamente como estaba).
    const aspect = exploreLayoutAspect(size.width, size.height); // V22: aspect de la región del 3D en EXPLORE
    const portrait = portraitAmount(aspect);
    const k = layoutK(aspect);
    const gainDim = MathUtils.lerp(GAIN_DIM, GAIN_DIM_PORTRAIT, portrait);

    CHAR_CROPS.forEach((c, i) => {
      const isFocusedCrop = focusedIdx === c.cell;
      const idle = c.lateral ? GAIN_IDLE * MathUtils.lerp(1, LATERAL_GAIN_PORTRAIT, portrait) : GAIN_IDLE;
      const target = focusedIdx < 0 ? idle : isFocusedCrop ? GAIN_HANDOFF : gainDim;
      s.gain[i] = MathUtils.damp(s.gain[i], target, 4, dt);
      const { main, refl } = media.mats[i];
      main.uniforms.uMix.value = s.mix;
      main.uniforms.uGain.value = s.gain[i] * reveal;
      refl.uniforms.uMix.value = s.mix;
      refl.uniforms.uGain.value = s.gain[i] * reveal;
    });

    // Acercamiento durante la transición: mismo `reveal` que la opacidad, cero variables nuevas.
    // reveal=0 (arranque del umbral) → offset máximo (cerca de cámara); reveal=1 → 0 (posición de reposo).
    if (approach.current) approach.current.position.z = APPROACH_Z * (1 - reveal);

    // Separación lateral: mismo `reveal`. reveal=0 → los tres pegados a x=0 (nacen juntos, cerca de cámara,
    // sin salirse de encuadre); reveal=1 → cada uno en su xTarget (alineado con su vitrina), ya en la Z de
    // reposo. Así nunca coincide "muy cerca de cámara" con "muy separados en x", que es lo que sacaba a los
    // laterales fuera del encuadre.
    //
    // Móvil vertical: cada recorte se coloca en la x de su vitrina ESTRECHADA (cellX·k) y los laterales se escalan
    // (sc) desde la línea de pies del grupo. xTarget se recalcula con la escala para que el CENTRO REAL del luchador
    // siga cayendo en su vitrina (el plano escala respecto a su propio centro, no respecto al cuerpo). Con k = 1 y
    // sc = 1 (escritorio) esto reproduce exactamente el xTarget de siempre.
    geo.forEach((g, i) => {
      const c = CHAR_CROPS[i];
      const sc = c.lateral ? MathUtils.lerp(1, LATERAL_SCALE_PORTRAIT, portrait) : 1;
      const xTarget = cellX(c.cell) * k - g.offset * sc;
      const x = xTarget * reveal;
      const mg = mainGroups.current[i];
      const rg = reflGroups.current[i];
      if (mg) { mg.position.x = x; mg.scale.set(sc, sc, 1); }
      if (rg) { rg.position.x = x; rg.scale.set(sc, sc, 1); }
      const dy = -g.feetGap * portrait; // pies al mismo suelo en móvil vertical (0 en escritorio)
      if (mainMeshes.current[i]) mainMeshes.current[i].position.y = g.cy + dy;
      if (reflMeshes.current[i]) reflMeshes.current[i].position.y = CELL.feetY + g.cy + dy;
    });
  });

  return (
    <group ref={approach}>
      <group position={[0, CELL.feetY, 0]}>
        {geo.map((g, i) => (
          <group key={i} ref={(el) => (mainGroups.current[i] = el)}>
            <mesh ref={(el) => (mainMeshes.current[i] = el)} position={[0, g.cy, 0]} material={media.mats[i].main}>
              <planeGeometry args={[g.w, g.h]} />
            </mesh>
          </group>
        ))}
      </group>
      <group scale={[1, -1, 1]}>
        {geo.map((g, i) => (
          <group key={i} ref={(el) => (reflGroups.current[i] = el)}>
            <mesh ref={(el) => (reflMeshes.current[i] = el)} position={[0, CELL.feetY + g.cy, 0]} material={media.mats[i].refl}>
              <planeGeometry args={[g.w, g.h]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
