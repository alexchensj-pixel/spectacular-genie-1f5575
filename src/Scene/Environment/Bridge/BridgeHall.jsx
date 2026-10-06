import { useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending, Color, DoubleSide, LinearFilter, MathUtils, MeshBasicMaterial, MeshStandardMaterial,
  ShaderMaterial, SRGBColorSpace, TextureLoader, Vector3, VideoTexture,
} from 'three';
import { anchorZ, chapterOrder } from '../../Camera/waypoints.js';
import { ENTRADA_END_Z } from '../Entrada/constants.js';
import { scrollState, BRIDGE_END, REVEAL_START, isCoarsePointer } from '../../Transitions/scrollState.js';
import { smoothstep } from '../Entrada/geo.js';
import { image as mediaImage, video as mediaVideo } from '../../../Data/Media.js';

// HUD de depuración en pantalla, SOLO con ?debug=1 en la URL — sin esto, cero coste y cero cambio visual.
// Pensado para verificar en el propio móvil (sin Mac/inspector remoto) qué de las tres causas posibles es:
// vídeo no reproduce (paused/readyState/error), plano fuera de cámara (podiumXNow/distToPodium), o
// desincronía (active/cases). Se retira quitando el parámetro de la URL, no hay que tocar código.
const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debug=1');
function useDebugHud() {
  const elRef = useRef(null);
  if (DEBUG && typeof document !== 'undefined' && !elRef.current) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:99999;background:rgba(0,0,0,.8);'
      + 'color:#0f0;font:11px/1.45 monospace;padding:8px 10px;border-radius:6px;pointer-events:none;'
      + 'white-space:pre;max-width:94vw;';
    document.body.appendChild(el);
    elRef.current = el;
  }
  return elRef;
}

// === BRIDGE HALL =================================================================================
// Arquitectura 3D REAL del tramo Entrada (01) → Character Select (02) — el "Bridge". Sustituye la
// antigua escenografía en CSS (gradientes/box-shadow simulando pilares, cielo y suelo — ver el
// historial de Experience/Entrada/Bridge.jsx): ese texto ahora flota sobre el MUNDO 3D real, con
// geometría, materiales, cámara y niebla existentes, en vez de una imagen pintada detrás.
//
// No es un capítulo (no vive en Data/Content.js#chapters, no tiene anchorZ propio): es la nave que
// ENVUELVE el tramo final del corredor de la Entrada (Environment/Entrada/*, sin tocar) y la sala de
// Character Select (blockouts.jsx#Pillars, sin tocar) — ambas piezas siguen intactas; esto solo añade
// los muros/pilares/cerchas que las rodean, para que el recorrido de cámara (Camera/waypoints.js,
// tramo 'entrada>character-select': Z -20 → -26, mirada -34 → -40) se lea como un único espacio
// físico, no como dos escenas cosidas por una transición.
//
// Referencia de dirección de arte: nave industrial monumental, pilares de acero en perspectiva,
// cerchas a media altura, pasarelas, ventanas técnicas y vetas de luz fría en el suelo. Se interpreta
// como GEOMETRÍA/MATERIALES/LUZ reales — la estructura que se atraviesa (pilares, cerchas, pasarelas,
// podios) sigue siendo 100% geometría real, nunca textura, plano 2D, HUD ni wireframe.
//
// EXCEPCIÓN JUSTIFICADA (pedido explícito, sept 2026): además de la geometría, ahora hay UN único plano
// de fondo lejano (BACKDROP) con la foto de referencia real, colocado en Z_FAR — detrás de TODA la
// estructura 3D, nunca sustituyéndola ni pegada a ella. Actúa como telón atmosférico ("la nave sigue
// más allá de lo modelado"), igual que en la foto se pierde en profundidad. Ver <mesh> BACKDROP más abajo.
// Corrección (sept 2026): la foto, al ser más estrecha que la nave, dejaba vacío a los lados (se veía
// el color de fondo de la escena, un recorte plano casi negro). Se añadió un muro de fondo (BACK_WALL_*)
// del mismo acero oscuro que pilares/cerchas, detrás de la foto y a todo el ancho, que cierra ese hueco.
// Paleta de la geometría: mismo acero oscuro que Portals.jsx/Corridor.jsx y el mismo acento
// azul-grisáceo de Character Select (CharacterSelectLighting.jsx → '#8fa8d6').
//
// Dos huecos físicos (podios + luz cenital, ver PODIUM_X) que ahora llevan cada uno su vídeo (mismo
// tratamiento que los luchadores de Character Select: vídeo sobre negro puro, blending aditivo, sin
// canal alfa → válido en iPhone), ver PodiumFighter más abajo y Data/Media.js#tysonBridge/mcgregorBridge.

const CS_Z = anchorZ(chapterOrder.indexOf('character-select')); // -40: ancla real de Character Select

// El Bridge ocupa solo el corredor espacial entre el final de Entrada y la entrada de Character Select.
// No se adelanta dentro de Escena 01 ni se prolonga hasta la sala de Character Select.
const Z_NEAR = ENTRADA_END_Z;
const CHARACTER_SELECT_ENTRY_Z = -26;
const Z_FAR = CHARACTER_SELECT_ENTRY_Z;
const FRAME_COUNT = 5;
const FRAME_Z = Array.from({ length: FRAME_COUNT }, (_, i) => Z_NEAR + (i / (FRAME_COUNT - 1)) * (Z_FAR - Z_NEAR));
const Z_SPAN = Z_NEAR - Z_FAR;
const Z_MID = (Z_NEAR + Z_FAR) / 2;

// El suelo técnico de la Entrada (Corridor.jsx) mide 12 m de ancho (CORRIDOR.width) y sigue existiendo
// tal cual bajo este tramo. Aquí solo se añaden dos "alas" de suelo NUEVAS, pegadas a sus bordes, que
// ensanchan la nave sin tocar ni un vértice de ese suelo original.
const CORRIDOR_HALF_W = 6;
const WING_OUTER = 9.6;
const WING_MID_X = (CORRIDOR_HALF_W + WING_OUTER) / 2;
const WING_W = WING_OUTER - CORRIDOR_HALF_W;

const PILLAR_X = 8.3; // sobre el ala nueva, cerca de su borde exterior
const PILLAR_H = 15; // muy por encima de los 6 m de la Entrada: aporta la escala monumental pedida
const PILLAR_W = 0.7;
const PILLAR_D = 0.9;
const TOP_Y = PILLAR_H;
const MID_Y = PILLAR_H * 0.52;
const LEDGE_Y = PILLAR_H * 0.34;

// FIX (sept 2026, "Tyson y McGregor aparecen y desaparecen a la vez"): la causa real NO era caché ni
// ?debug=1 — era que los dos <PodiumFighter> (uno por luchador) leían el MISMO ref (`podiumFighterGain`,
// alimentado por una única ventana `cases`), así que su vídeo entraba y salía de presencia exactamente
// a la vez, sin importar que cada uno tuviera su propio podio/posición. Fix real: dos ventanas de
// progreso LOCAL independientes y EXCLUYENTES (nunca ambas > 0 en el mismo frame), una por personaje,
// espejo exacto del timeline de texto de Entrada/Bridge.jsx#build (momento "C" — ver ahí C_IN, C_TYSON_OUT,
// C_MCGREGOR_IN, C_OUT): la figura en vídeo de cada podio gana/pierde presencia en el mismo instante en
// que su propio texto aparece/desaparece, nunca en el instante del otro.
//
// Reestructuración del Bridge en 3 bloques (umbral 340vh → 180vh; ver Bridge.jsx): los dos vídeos aparecen en
// el bloque 1 (EL CUERPO) como ejemplos opuestos, uno detrás de otro, y en el bloque 2 (EL COMBATE) quedan
// presentes A LA VEZ — «a partir de ambos ejemplos». Durante el bloque 1 se mantiene la exclusión de siempre
// (nunca ambos > 0 en el mismo frame: Tyson termina en TYSON_OUT antes de que McGregor empiece en MCGREGOR_IN).
//
// TYSON — bloque 1: lead-in ANTES de su texto (TYSON_IN → TYSON_PLATEAU_IN, la figura ya está sólida cuando
// aparece el copy) y salida que coincide con el fundido de su texto (C_TYSON_OUT / C_TYSON_GONE en Bridge.jsx).
const TYSON_IN = 0.15;
const TYSON_PLATEAU_IN = 0.185;  // = C_IN (Bridge.jsx): sólido justo cuando aparece "PIENSA EN MIKE TYSON:"
const TYSON_PLATEAU_OUT = 0.255; // = C_TYSON_OUT (Bridge.jsx)
const TYSON_OUT = 0.275;         // = C_TYSON_GONE (Bridge.jsx): invisible del todo — Tyson YA se fue

// McGREGOR — arranca su fundido de entrada cuando arranca su texto (nunca antes) y se sostiene a través del
// bloque 2; sale con la misma ventana que Tyson, con margen antes de que empiece EL MAPA (MAPA_IN = 0.55).
const MCGREGOR_IN = 0.28;         // = C_MCGREGOR_IN (Bridge.jsx) — 0.005 después de TYSON_OUT: hueco real
const MCGREGOR_PLATEAU_IN = 0.30;
const MCGREGOR_PLATEAU_OUT = 0.515; // = COMBATE_OUT (Bridge.jsx): se apagan ambos con el cierre del bloque 2
const MCGREGOR_OUT = 0.545;         // invisible del todo justo antes de MAPA_IN (0.55)

// TYSON, bloque 2: vuelve a ganar presencia en cuanto entra EL COMBATE (McGregor ya está) y sale con él.
const TYSON2_IN = 0.39;             // = C_OUT + FADE (Bridge.jsx): justo cuando termina el texto de McGregor
const TYSON2_PLATEAU_IN = 0.42;
const TYSON2_PLATEAU_OUT = MCGREGOR_PLATEAU_OUT;
const TYSON2_OUT = MCGREGOR_OUT;

// Dos huecos reservados para Tyson / McGregor, DENTRO del suelo original (dentro de ±6 m) — dos podios
// enfrentados, mismo eje que el momento "C" del copy del Bridge (dos casos, uno a cada lado).
// PODIUM_X_BASE es la separación "de diseño" (deseada); el valor REAL que se usa cada frame (ver
// `podiumXNow` en el useFrame principal) se recalcula con el fov/aspect/distancia de cámara reales — ver
// el bloque de comentarios de más abajo, "por qué PODIUM_X no puede ser un número fijo".
const PODIUM_X_BASE = 3.5;
// CORRECCIÓN (sept 2026, "los personajes no se ven aunque el vídeo ya reproduce"): PODIUM_Z pasó por dos
// valores rotos antes de este: Z_MID (punto medio geométrico, la cámara ya lo había rebasado cuando
// aparecía el texto) y "el punto exacto donde está la cámara en el pico del pulso" (peor aún: distancia
// ≈0, el podio literalmente encima de la cámara). El siguiente intento, Z_FAR, sí resolvió lo de
// "detrás/encima de cámara" — pero introdujo un problema distinto, confirmado viendo la grabación real
// del móvil: a 1-2,8 m de distancia (lo que da Z_FAR durante la ventana `cases`), un plano de
// PODIUM_FIGHTER_H = 2,7 m de alto llena casi toda la pantalla — no se ve como una figura, se ve como una
// mancha borrosa pegada al objetivo. Fix real: alejar el podio más allá de Z_FAR. El suelo de ESTA nave
// (WING_FLOOR) termina en Z_FAR, pero el suelo BASE del corredor (Corridor.jsx, CORRIDOR.zFar = -50) sigue
// mucho más allá — hay piso de sobra hasta llegar al backdrop (BACKDROP_Z = Z_FAR-3 = -29). PODIUM_Z se
// deja 2 m antes del backdrop (nunca clava en él) para maximizar la distancia cámara↔podio disponible
// dentro de la ventana `cases`: con esto, la distancia real pasa a ser ~3.0-4.8 m en vez de ~1.0-2.8 m —
// suficiente, combinado con la reducción de PODIUM_FIGHTER_H más abajo, para leerse como una figura en vez
// de un borrón. (Z_FAR - 1 equivale a BACKDROP_Z + 2, pero BACKDROP_Z se declara más abajo en este mismo
// archivo — TDZ de `const` en JS — así que se expresa en términos de Z_FAR, ya declarado arriba.)
const PODIUM_Z = Z_FAR - 1;
const PODIUM_R = 1.15;



// BACKDROP — plano único con la foto de referencia, al fondo del todo (más allá de Z_FAR, para que
// quede detrás incluso del último StructuralFrame). Tamaño BASE derivado de la proporción REAL de la
// foto (704×1525, vertical) — se usa solo como referencia de aspecto para el recorte de textura.
//
// CORRECCIÓN (sept 2026, pedido explícito): a tamaño fijo, la foto (más estrecha que el viewport en la
// mayoría de pantallas) se leía como un recorte con bordes — se veía el muro de fondo a los lados en vez
// de foto. Ahora el plano se redimensiona CADA FRAME (ver useFrame en BridgeHall) para cubrir siempre el
// encuadre visible completo a su distancia (mismo criterio que CSS `background-size: cover`): se calcula
// el ancho/alto visibles según el fov y la posición real de la cámara (que avanza en Z durante el Bridge)
// y el aspect ratio real de pantalla, y el plano se escala para cubrirlos con margen. Para no deformar la
// foto al agrandarla, el material recorta la textura (repeat/offset) al aspecto real del plano en vez de
// estirarla — se pierde un poco de foto por los bordes (igual que "cover"), nunca se ve una franja vacía.
const BACKDROP_IMG_ASPECT = 704 / 1525; // ancho / alto
const BACKDROP_H = 17; // ligeramente por encima de PILLAR_H (15): asoma sobre la última cercha
const BACKDROP_W = BACKDROP_H * BACKDROP_IMG_ASPECT;
const BACKDROP_Z = Z_FAR - 3;
const BACKDROP_COVER_MARGIN = 1.03; // margen extra sobre el encuadre exacto, para que no asome el borde del plano por redondeos

// MURO DE FONDO — corrección (sept 2026): al ser la foto más estrecha que la nave (WING_OUTER*2 ≈ 19 m
// vs BACKDROP_W ≈ 7,85 m), a los lados del plano quedaba vacío sin geometría — se veía el color de fondo
// de la escena (#050608, casi negro) como un recorte plano. Este muro, del mismo lenguaje de acero oscuro
// que el resto de la nave, cierra ese hueco detrás de la foto: los laterales pasan a leerse como pared
// real de la nave en vez de vacío.
const BACK_WALL_W = WING_OUTER * 2 + PILLAR_W + 2; // cubre de sobra el ancho visible entre pilares/alas
const BACK_WALL_H = BACKDROP_H + 2;
const BACK_WALL_Z = BACKDROP_Z - 0.6; // justo detrás de la foto, nunca delante

// Colores: acero/hormigón oscuro (idéntico registro tonal a Corridor.jsx/Portals.jsx) + acento
// azul-grisáceo de Character Select. Sin saturación, sin neón.
const STEEL = '#454d57';
const STEEL_DARK = '#262b32';
const WING_FLOOR = '#1c2128';
const EDGE = '#33393f';
const ACCENT_COOL = '#8fa8d6'; // mismo azul que CharacterSelectLighting.jsx
const ACCENT_WARM = '#f4caa0'; // eco muy atenuado del softbox 4200K de la Entrada (SOFTBOX.color)

function StructuralFrame({ z, steelMat, darkMat, glowMat }) {
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * PILLAR_X, 0, 0]}>
          <mesh position={[0, PILLAR_H / 2, 0]} castShadow receiveShadow material={steelMat}>
            <boxGeometry args={[PILLAR_W, PILLAR_H, PILLAR_D]} />
          </mesh>
          {/* placa de anclaje, mismo lenguaje que Portals.jsx */}
          <mesh position={[0, 0.07, 0]} receiveShadow material={darkMat}>
            <boxGeometry args={[PILLAR_W + 0.5, 0.14, PILLAR_D + 0.5]} />
          </mesh>
          {/* pasarela/ledge a media altura, con antepecho bajo — insinúa un nivel superior transitable */}
          <mesh position={[-s * 0.75, LEDGE_Y, 0]} castShadow receiveShadow material={darkMat}>
            <boxGeometry args={[1.5, 0.12, 1.3]} />
          </mesh>
          <mesh position={[-s * 1.45, LEDGE_Y + 0.5, 0]} material={darkMat}>
            <boxGeometry args={[0.06, 0.9, 1.3]} />
          </mesh>
          {/* dos riostras diagonales entre la pasarela y la cercha superior: lectura de celosía real,
              construida con volúmenes (nunca líneas) */}
          {[-1, 1].map((d) => (
            <mesh
              key={d}
              position={[0, (MID_Y + TOP_Y) / 2, d * 0.35]}
              rotation={[Math.atan2(TOP_Y - MID_Y, 0.7), 0, 0]}
              material={darkMat}
            >
              <boxGeometry args={[0.16, Math.hypot(TOP_Y - MID_Y, 0.7) * 1.02, 0.16]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* cercha superior: viga cajón continua de lado a lado */}
      <mesh position={[0, TOP_Y, 0]} castShadow receiveShadow material={steelMat}>
        <boxGeometry args={[PILLAR_X * 2 + PILLAR_W, 0.65, PILLAR_D]} />
      </mesh>
      {/* riostra media, más ligera */}
      <mesh position={[0, MID_Y, 0]} receiveShadow material={darkMat}>
        <boxGeometry args={[PILLAR_X * 2 + PILLAR_W, 0.22, 0.4]} />
      </mesh>
      {/* franja técnica retroiluminada bajo la cercha superior: la única "luz de interfaz" permitida —
          una veta continua, sin texto ni iconografía, mismo acento que Character Select */}
      <mesh position={[0, TOP_Y - 0.42, 0]} material={glowMat}>
        <boxGeometry args={[PILLAR_X * 2 - 1, 0.04, 0.06]} />
      </mesh>
    </group>
  );
}

function Podium({ x, z, ringMat, bodyMat, lightRef }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow material={bodyMat}>
        <cylinderGeometry args={[PODIUM_R, PODIUM_R * 1.08, 0.14, 40]} />
      </mesh>
      <mesh position={[0, 0.142, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[PODIUM_R * 0.82, PODIUM_R * 0.92, 48]} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 3.2, 0]} color={ACCENT_COOL} distance={5.5} decay={2} intensity={0} />
    </group>
  );
}

// PODIUM_FIGHTER_VERT/FRAG: mismo shader mínimo que Fighter.jsx (Environment/Fighter.jsx) — vídeo sobre negro
// puro sumado a la escena (blending aditivo): el negro no aporta nada = "transparente", sin canal alfa, así
// que funciona en iPhone. Aquí no hace falta el cruce still↔vídeo ni el reflejo de Fighter.jsx: cada figura
// del podio hace un loop continuo y discreto (ambiental), no una animación disparada por foco/selección.
const PODIUM_FIGHTER_VERT = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PODIUM_FIGHTER_FRAG = `uniform sampler2D uVideo;
uniform float uGain;
varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(uVideo, vUv).rgb * uGain, 1.0); }`;

// Altura de figura sobre el podio — registro similar a CELL.fighterHeight (Character Select), algo más
// discreta porque aquí es un elemento ambiental del Bridge, no el protagonista de la escena.
// Bajada de 2.7 a 2.0 junto con el alejamiento de PODIUM_Z (ver comentario de más arriba): a la distancia
// real disponible en este tramo (~3-4.8 m), 2.7 m de alto seguía siendo demasiado grande — ocupaba la
// mayor parte del encuadre vertical y se veía como un borrón, no como una figura con proporciones legibles.
const PODIUM_FIGHTER_H = 2.0;

// Sin prop `active` propio a propósito: el <mesh> vive dentro de <group ref={groupRef} visible={active}>
// (ver return de BridgeHall) — cuando esa `visible` es false, three.js ya no renderiza este subárbol, así
// que no hace falta duplicar aquí el cálculo de `active` del Bridge.
//
// CORRECCIÓN (sept 2026, "el vídeo no se ve"): tenía DOS fallos reales, no de import/asset:
//
// 1) `play()` estaba encadenado a `el.readyState >= 2`. Con `preload = 'metadata'` el navegador (sobre
//    todo Safari/iOS) NO baja frames reales hasta que se intenta reproducir — readyState se queda en 0/1
//    indefinidamente. Resultado: nunca se cumplía la condición para llamar a play(), nunca se pedían
//    frames, readyState nunca subía → bucle cerrado sobre sí mismo, el <video> jamás abandonaba el pausa.
//    Fix: se llama a play() igual que en Fighter.jsx/RosterGroup.jsx (los vídeos que sí funcionan) —
//    intento con backoff de 3 s si el navegador lo rechaza (autoplay bloqueado), SIN esperar a readyState.
//    readyState solo se usa (vía VideoTexture, internamente en three) para decidir cuándo hay frame que
//    subir a la textura; ya no decide si se intenta reproducir.
// 2) `uGain` se amortiguaba siempre hacia 1 en cuanto el componente estaba montado — es decir, en cuanto
//    el Bridge estaba activo (todo el tramo, no solo el momento Tyson/McGregor). No había ninguna conexión
//    con el progreso del Bridge. Fix: recibe `gainRef` — cada PodiumFighter el SUYO propio (ver
//    podiumFighterGainA/B en el useFrame principal de BridgeHall: dos ventanas de progreso local
//    independientes y excluyentes, una por personaje, no una única ventana compartida) — el objetivo de
//    la amortiguación pasa a ser `gainRef.current` en vez de la constante `1`, así el vídeo de CADA
//    figura entra y sale de escena exactamente cuando el Bridge presenta SU propio instante, nunca el
//    del otro personaje. Los podios (geometría) siguen intactos; solo la FIGURA en vídeo de cada uno
//    queda atada a su propio tramo, independiente del otro podio.
function PodiumFighter({ x, z, src, aspect, gainRef, statusRef }) {
  const mesh = useRef(null);
  const st = useRef({ pending: false, blockedAt: -1e9 });

  const media = useMemo(() => {
    const el = document.createElement('video');
    el.src = src;
    el.loop = true;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    // 'auto' (antes 'metadata'): es una instrucción real al navegador para que empiece a descargar y
    // decodificar el vídeo completo desde YA, no solo la cabecera — y arranca en cuanto se crea este
    // <video>, que es exactamente cuando se monta <BridgeHall> (Environment/index.jsx la renderiza sin
    // condición alguna, desde el primer frame de toda la experiencia) — es decir, antes de que el usuario
    // haya podido hacer ni un solo scroll. Es la ÚNICA de las dos figuras del Bridge con 'auto': Fighter.jsx
    // sigue en 'metadata' a propósito porque a él SÍ le sobra tiempo real (Character Select llega mucho
    // más tarde en el recorrido) y no conviene gastar datos de más ahí.
    el.preload = 'auto';
    el.load();
    const vtex = new VideoTexture(el);
    vtex.minFilter = LinearFilter;
    vtex.magFilter = LinearFilter;
    vtex.generateMipmaps = false;
    const mat = new ShaderMaterial({
      uniforms: { uVideo: { value: vtex }, uGain: { value: 0 } },
      vertexShader: PODIUM_FIGHTER_VERT,
      fragmentShader: PODIUM_FIGHTER_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    });
    return { el, mat };
  }, [src]);

  useFrame((_, dt) => {
    const { el, mat } = media;
    const s = st.current;
    const now = performance.now();
    // Mismo mecanismo de intento/backoff que Fighter.jsx y RosterGroup.jsx: se llama a play()
    // en cuanto el vídeo está en pausa (sin esperar a readyState), con reintento cada 3 s si el
    // navegador lo rechaza (autoplay bloqueado) — así readyState SÍ puede llegar a subir con datos reales.
    if (el.paused && !s.pending && now - s.blockedAt > 3000) {
      s.pending = true;
      const p = el.play();
      if (p && p.then) {
        p.then(() => { s.pending = false; }).catch(() => { s.pending = false; s.blockedAt = now; });
      } else {
        s.pending = false;
      }
    }
    // Si el móvil bloquea el autoplay, el vídeo se queda en su primer fotograma (sin audio, sin control
    // visible) — mismo comportamiento aceptado ya en Fighter.jsx para el mismo caso.
    const target = gainRef?.current ?? 0;
    // GATE de readiness (protección, no sustituye al preload de arriba): mismo umbral que ya usa y prueba
    // Fighter.jsx (readyState>=2 = HAVE_CURRENT_DATA, el navegador confirma que existe ya un frame real
    // decodificado). Pase lo que pase con el scroll, uGain nunca sube de 0 hasta que esto es cierto — así
    // que aunque la red vaya más lenta de lo normal y el 'auto' de arriba no llegue a tiempo, el resultado
    // determinista es "se queda invisible un poco más y aparece en cuanto esté listo", nunca un frame roto
    // o a medio decodificar. En cuanto readyState pasa a ≥2, el damp normal hace que suba hacia el target
    // real del scroll en el mismo frame siguiente — no hay espera añadida una vez que el vídeo está listo.
    const ready = el.readyState >= 2;
    mat.uniforms.uGain.value = MathUtils.damp(mat.uniforms.uGain.value, ready ? target : 0, 4, dt);
    if (statusRef) {
      statusRef.current = {
        src: el.currentSrc || el.src, paused: el.paused, readyState: el.readyState,
        networkState: el.networkState, error: el.error ? `${el.error.code}:${el.error.message || ''}` : null,
        gain: mat.uniforms.uGain.value, target,
      };
    }
  });

  const w = PODIUM_FIGHTER_H * aspect;
  return (
    <mesh ref={mesh} position={[x, PODIUM_R * 0.14 + PODIUM_FIGHTER_H / 2, z]} material={media.mat}>
      <planeGeometry args={[w, PODIUM_FIGHTER_H]} />
    </mesh>
  );
}

export default function BridgeHall({ transitionOnly = false }) {
  // Materiales compartidos: instancias REALES de three (no props sueltas) para poder reutilizarlas
  // entre muchos meshes sin recrearlas cada frame — mismo patrón que Portals.jsx.
  //
  // CORRECCIÓN: los pilares/cerchas están a 8,3 m del eje central, donde cuelgan las luminarias — a esa
  // distancia, con las intensidades "de interior" que usa el resto del proyecto (decaimiento físico real,
  // decay=2), la luz que les llega es casi nula y el acero (MeshStandardMaterial, SÍ depende de luz)
  // renderiza negro sobre negro: invisible, aunque la geometría esté ahí. Por eso cada material del acero
  // lleva ahora un `emissive` bajo y sin saturar (autoiluminación tenue, como el rebote de luz ambiental
  // en una nave real) que garantiza que la estructura SIEMPRE se lea, esté lo que esté iluminándola cerca;
  // las luces de abajo siguen aportando el matiz y el relieve, ya no la visibilidad básica.
  const steelMat = useMemo(
    () => new MeshStandardMaterial({ color: STEEL, roughness: 0.55, metalness: 0.35, emissive: '#232a33', emissiveIntensity: 0.6 }),
    []
  );
  const darkMat = useMemo(
    () => new MeshStandardMaterial({ color: STEEL_DARK, roughness: 0.65, metalness: 0.25, emissive: '#14181e', emissiveIntensity: 0.5 }),
    []
  );
  const wingFloorMat = useMemo(
    () => new MeshStandardMaterial({ color: WING_FLOOR, roughness: 0.92, metalness: 0.12, emissive: '#0d1015', emissiveIntensity: 0.4 }),
    []
  );
  const edgeMat = useMemo(
    () => new MeshStandardMaterial({ color: EDGE, roughness: 0.6, metalness: 0.3, emissive: '#171b20', emissiveIntensity: 0.5 }),
    []
  );
  const ringMat = useMemo(
    () => new MeshStandardMaterial({ color: ACCENT_COOL, emissive: ACCENT_COOL, emissiveIntensity: 1.1, roughness: 0.4, side: DoubleSide }),
    []
  );
  const podiumBodyMat = useMemo(
    () => new MeshStandardMaterial({ color: '#2f353d', roughness: 0.5, metalness: 0.4, emissive: '#191d23', emissiveIntensity: 0.5 }),
    []
  );
  const seamMat = useMemo(
    () => new MeshStandardMaterial({ color: ACCENT_COOL, emissive: ACCENT_COOL, emissiveIntensity: 0.8, toneMapped: false }),
    []
  );

  // BACKDROP: textura de la foto de referencia real. MeshBasicMaterial a propósito (no depende de las
  // luces de la nave, que se apagan hacia el Cierre — ver useFrame más abajo): es un telón lejano, debe
  // leerse siempre. `fog: true` (default de MeshBasicMaterial) hace que SÍ se funda con la niebla de la
  // escena a esa distancia, igual que el resto de la geometría — por eso no hace falta atenuarlo a mano.
  const backdropTexture = useLoader(TextureLoader, mediaImage.bridgeHallRef);
  backdropTexture.colorSpace = SRGBColorSpace;
  const backdropMat = useMemo(
    () => new MeshBasicMaterial({ map: backdropTexture, toneMapped: true }),
    [backdropTexture]
  );

  // Muro de fondo: mismo tono/emissive que darkMat (acero oscuro con autoiluminación tenue) para que
  // se lea en la penumbra igual que pilares y cerchas, nunca como un plano negro plano.
  const backWallMat = useMemo(
    () => new MeshStandardMaterial({ color: STEEL_DARK, roughness: 0.75, metalness: 0.2, emissive: '#14181e', emissiveIntensity: 0.55 }),
    []
  );

  // Una franja "veta de luz" por marco, con el color virando de cálido (eco del softbox 4200K de la
  // Entrada) a frío (acento azul de Character Select) según se avanza en Z — el mismo tránsito
  // narrativo del copy (referencia → cuerpo → ejemplos → mapa → cierre), contado con luz real.
  const glowMats = useMemo(() => {
    const warm = new Color(ACCENT_WARM);
    const cool = new Color(ACCENT_COOL);
    return FRAME_Z.map((_, i) => {
      const c = warm.clone().lerp(cool, i / (FRAME_COUNT - 1));
      return new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, toneMapped: false });
    });
  }, []);

  const fixtureRefs = useRef([]);
  const podiumRefA = useRef(null);
  const podiumRefB = useRef(null);
  const podiumGroupA = useRef(null);
  const podiumGroupB = useRef(null);
  const convergeRef = useRef(null);
  const backdropRef = useRef(null);
  const groupRef = useRef(null);
  // Dos estados de gain INDEPENDIENTES (antes uno solo, compartido → ese era el bug): cada PodiumFighter
  // lee únicamente el suyo, así el vídeo de cada personaje solo gana presencia mientras el Bridge
  // presenta SU propio instante del momento C — nunca el del otro. Ver ventanas TYSON_*/MCGREGOR_* arriba.
  const podiumFighterGainA = useRef(0); // Tyson (tysonBridge)
  const podiumFighterGainB = useRef(0); // McGregor (mcgregorBridge)
  const podiumStatusA = useRef({});
  const podiumStatusB = useRef({});
  const debugHud = useDebugHud();
  const { camera, size } = useThree();

  // Intensidades reescaladas al mismo registro que el resto del proyecto (EntradaStudio: LIGHT.spot=110,
  // LIGHT.fill=30; Lighting/index.jsx: FOLLOW=90) — los valores anteriores (un solo dígito) eran de un
  // orden de magnitud equivocado para el decaimiento físico real (decay=2) a estas distancias.
  const FIXTURE_I = 70;
  const activeFrames = isCoarsePointer ? FRAME_Z.filter((_, i) => i % 2 === 0) : FRAME_Z;

  useFrame(() => {
    // La nave no es geometría global: permanece fuera del render durante Escena 01, Character Select
    // y todos los capítulos posteriores. También queda fuera durante toda la salida ya completada.
    // El corte usa REVEAL_START (no BRIDGE_OUT_END) a propósito: es EXACTAMENTE el mismo punto en el que
    // getCharactersReveal() empieza a subir de 0 (scrollState.js), así la nave nunca se apaga antes de
    // que arranque la luz/reveal de Character Select — sin ese hueco intermedio quedaría un instante sin
    // ninguna de las dos escenografías activas (ver CharacterSelectLighting.jsx, atada al mismo reveal).
    const introProgress = scrollState.segments['entrada'] ?? 0;
    const p = scrollState.segments['entrada>character-select'] ?? 0;
    const active = transitionOnly && introProgress >= 1 && p > 0 && p < REVEAL_START;
    if (groupRef.current) groupRef.current.visible = active;
    if (DEBUG && debugHud.current) {
      debugHud.current.textContent = `[bridge] active=${active} intro=${introProgress.toFixed(2)} p=${p.toFixed(3)} REVEAL_START=${REVEAL_START.toFixed(2)}`
        + (active ? '' : '\n(inactivo: fuera de este tramo del scroll, o "entrada" aún no llega a 1)');
    }
    if (!active) return;

    // Mismo progreso local (0..1) que Bridge.jsx usa para su timeline de texto (rawRef ahí, aquí solo
    // gobierna intensidades de luz — determinista, reversible, sin estado propio que pueda desincronizarse).
    const local = Math.min(p / BRIDGE_END, 1);

    // Bloque 1: dos ventanas EXCLUYENTES (Tyson termina en TYSON_OUT=0.275 antes de que McGregor suba en
    // MCGREGOR_IN=0.28). Bloque 2: ambas presentes a la vez. Cada una gobierna solo el vídeo de SU podio. Ver comentario de las constantes TYSON_*/MCGREGOR_* más arriba.
    const casesTyson = Math.max(
      smoothstep(local, TYSON_IN, TYSON_PLATEAU_IN) * (1 - smoothstep(local, TYSON_PLATEAU_OUT, TYSON_OUT)),
      smoothstep(local, TYSON2_IN, TYSON2_PLATEAU_IN) * (1 - smoothstep(local, TYSON2_PLATEAU_OUT, TYSON2_OUT)),
    );
    const casesMcgregor = smoothstep(local, MCGREGOR_IN, MCGREGOR_PLATEAU_IN) * (1 - smoothstep(local, MCGREGOR_PLATEAU_OUT, MCGREGOR_OUT));
    podiumFighterGainA.current = casesTyson;
    podiumFighterGainB.current = casesMcgregor;

    // Luz cenital de cada podio: sigue el pulso de SU propio personaje (antes las dos luces compartían
    // una única ventana `cases`) — así el podio de Tyson se enciende/apaga con Tyson y el de McGregor con
    // McGregor, en vez de que ambos pulsen a la vez aunque solo uno de los dos tenga figura visible. Los
    // dos podios (geometría + posiciones) siguen intactos: esto solo cambia CUÁNDO pulsa cada luz.
    if (podiumRefA.current) podiumRefA.current.intensity = 12 + 46 * casesTyson;
    if (podiumRefB.current) podiumRefB.current.intensity = 12 + 46 * casesMcgregor;

    // Por qué PODIUM_X no puede ser un número fijo (pedido explícito: "que se vea"): con el fov vertical
    // fijo del proyecto (LENSES.nav = 50°) y la distancia real cámara↔podio en este tramo (1-3 m, el
    // corredor solo mide 6 m de largo), un desplazamiento lateral de PODIUM_X_BASE = 3,5 m NUNCA cabe en
    // el encuadre — en desktop harían falta ~6 m de distancia, en móvil vertical ~23 m; no hay ningún Z ni
    // sincronía que lo arregle si el X se queda fijo. Aquí se recalcula cada frame, con el fov/aspect/
    // distancia REALES (mismo criterio que ya usa el propio BACKDROP de esta escena para su recorte "cover"
    // un poco más abajo), el desplazamiento lateral máximo que sí entra en cámara con margen, y ese es el
    // que se usa — en pantallas anchas con distancia de sobra esto no cambia nada (se queda en
    // PODIUM_X_BASE); en vertical/de cerca, los dos podios se acercan entre sí lo justo para seguir
    // leyéndose como dos piezas distintas (nunca menos que 2×PODIUM_R, su propio ancho) sin salirse de
    // cámara. Se aplica sobre el GRUPO (podio + su vídeo, ver el return más abajo) para que ambos se muevan
    // siempre juntos, nunca el podio por un lado y su vídeo por otro.
    const distToPodium = Math.max(0.1, Math.abs(camera.position.z - PODIUM_Z));
    const halfVFov = MathUtils.degToRad(camera.fov) / 2;
    const aspect = size.width / size.height;
    const halfHFov = Math.atan(Math.tan(halfVFov) * aspect);
    const safeX = distToPodium * Math.tan(halfHFov) * 0.72; // 0.72: deja aire hasta el borde real del encuadre
    // Antes el suelo era PODIUM_R*1.05 (~1.2 m) para que los dos podios no se solaparan — pero a la
    // distancia real que hay en móvil vertical, ese suelo era MAYOR que lo que cabe en cámara (safeX podía
    // ser ~0.5-0.9 m): el suelo ganaba sobre el límite de encuadre y el resultado quedaba cortado por los
    // lados. Prioridad ya decidida explícitamente: que se vea, antes que evitar un ligero solape visual.
    const podiumXNow = Math.max(0.35, Math.min(PODIUM_X_BASE, safeX));
    if (podiumGroupA.current) podiumGroupA.current.position.x = -podiumXNow;
    if (podiumGroupB.current) podiumGroupB.current.position.x = podiumXNow;

    if (DEBUG && debugHud.current) {
      const sA = podiumStatusA.current, sB = podiumStatusB.current;
      const fmtV = (s) => `paused=${s.paused} readyState=${s.readyState} network=${s.networkState} `
        + `gain=${(s.gain ?? 0).toFixed(2)}/${(s.target ?? 0).toFixed(2)} err=${s.error ?? '-'}\n    src=${s.src ?? '-'}`;
      debugHud.current.textContent =
        `[bridge] active=true local=${local.toFixed(3)} casesTyson=${casesTyson.toFixed(3)} casesMcgregor=${casesMcgregor.toFixed(3)}\n`
        + `[camera] z=${camera.position.z.toFixed(2)} fov=${camera.fov.toFixed(1)} aspect=${aspect.toFixed(3)}\n`
        + `[podium] Z=${PODIUM_Z.toFixed(2)} dist=${distToPodium.toFixed(2)} X=${podiumXNow.toFixed(2)} (base=${PODIUM_X_BASE})\n`
        + `[tyson]    ${fmtV(sA)}\n`
        + `[mcgregor] ${fmtV(sB)}`;
    }

    // Eco del "Cierre": la nave se apaga hacia un único punto de luz sobre Character Select — mismo
    // gesto que antes hacía el spot CSS (.bridge__cierre-spot), ahora con luz física real.
    const closing = smoothstep(local, 0.8, 1);
    fixtureRefs.current.forEach((l) => {
      if (l) l.intensity = MathUtils.lerp(FIXTURE_I, FIXTURE_I * 0.2, closing);
    });
    if (convergeRef.current) convergeRef.current.intensity = 130 * closing;

    // BACKDROP — recalcula cada frame el tamaño visible del plano a su distancia real de la cámara
    // (que avanza en Z durante el Bridge) y lo escala para cubrir TODO el encuadre, con el mismo
    // criterio que CSS `background-size: cover` (nunca letterbox/pillarbox, nunca deformación).
    if (backdropRef.current) {
      const dist = Math.abs(camera.position.z - BACKDROP_Z);
      const visibleH = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * dist;
      const visibleW = visibleH * (size.width / size.height);
      const planeW = visibleW * BACKDROP_COVER_MARGIN;
      const planeH = visibleH * BACKDROP_COVER_MARGIN;
      const scaleX = planeW / BACKDROP_W;
      const scaleY = planeH / BACKDROP_H;
      backdropRef.current.scale.set(scaleX, scaleY, 1);
      // ancla el borde inferior a y=0 (suelo), igual que el resto de la nave — el plano crece hacia arriba.
      backdropRef.current.position.y = (BACKDROP_H * scaleY) / 2;

      // Recorta la textura (nunca la estira) al aspecto real del plano ya escalado: si el plano es
      // relativamente más ancho que la foto se recorta arriba/abajo, si es más alto se recorta a los lados.
      const map = backdropMat.map;
      if (map) {
        const planeAspect = planeW / planeH;
        if (planeAspect > BACKDROP_IMG_ASPECT) {
          map.repeat.set(1, BACKDROP_IMG_ASPECT / planeAspect);
        } else {
          map.repeat.set(planeAspect / BACKDROP_IMG_ASPECT, 1);
        }
        map.offset.set((1 - map.repeat.x) / 2, (1 - map.repeat.y) / 2);
        map.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Suelo: dos alas nuevas junto al suelo original de 12 m (Corridor.jsx, intacto) — mismo plano Y,
          sin solape de vértices con él. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation-x={-Math.PI / 2} position={[s * WING_MID_X, 0, Z_MID]} receiveShadow material={wingFloorMat}>
            <planeGeometry args={[WING_W, Z_SPAN]} />
          </mesh>
          <mesh position={[s * (WING_OUTER + 0.06), 0.05, Z_MID]} receiveShadow material={edgeMat}>
            <boxGeometry args={[0.12, 0.1, Z_SPAN]} />
          </mesh>
          {/* veta de luz fría en la propia junta del suelo (borde del corredor original): continúa en
              el suelo el mismo acento azul que llevan las cerchas — sin texto, sin panel, solo luz. */}
          <mesh position={[s * CORRIDOR_HALF_W, 0.016, Z_MID]} material={seamMat}>
            <boxGeometry args={[0.05, 0.012, Z_SPAN]} />
          </mesh>
        </group>
      ))}

      {FRAME_Z.map((z, i) => (
        <StructuralFrame key={z} z={z} steelMat={steelMat} darkMat={darkMat} glowMat={glowMats[i]} />
      ))}

      {/* MURO DE FONDO — cierra la nave detrás de la foto, a todo el ancho visible, para que no quede
          vacío (color de fondo de la escena) a los lados del plano de la foto. Ver BACK_WALL_* arriba. */}
      <mesh position={[0, BACK_WALL_H / 2, BACK_WALL_Z]} receiveShadow material={backWallMat}>
        <planeGeometry args={[BACK_WALL_W, BACK_WALL_H]} />
      </mesh>

      {/* BACKDROP — foto de referencia real, detrás de TODA la geometría (BACKDROP_Z < Z_FAR). Un único
          plano, sin repetir ni deformar: ver constantes BACKDROP_* arriba. */}
      <mesh ref={backdropRef} position={[0, BACKDROP_H / 2, BACKDROP_Z]} material={backdropMat}>
        <planeGeometry args={[BACKDROP_W, BACKDROP_H]} />
      </mesh>

      {/* Luminarias colgadas de cada cercha: la fuente de luz "propia" de la nave (aparte del seguimiento
          de cámara y el softbox de la Entrada) — blanco frío, sin color saturado. `distance` (radio de
          corte físico) se abre hasta cubrir los 8,3 m hasta los pilares con margen, si no la ventana de
          atenuación de three.js los deja a oscuras aunque la intensidad sea alta. */}
      {activeFrames.map((z, i) => (
        <pointLight
          key={z}
          ref={(el) => { fixtureRefs.current[i] = el; }}
          position={[0, TOP_Y - 0.9, z]}
          color="#cdd8ec"
          distance={24}
          decay={2}
          intensity={FIXTURE_I}
        />
      ))}
      {/* Lavado de luz específico sobre cada pareja de pilares (además de la luminaria central de arriba):
          sin esto, a 8,3 m del eje reciben muy poca luz directa y solo se leen por su autoiluminación
          base — con esto ganan además sombra/relieve real, como el resto de la nave. */}
      {activeFrames.map((z, i) => (
        <group key={`wash-${z}`}>
          {[-1, 1].map((s) => (
            <pointLight
              key={s}
              position={[s * PILLAR_X * 0.75, PILLAR_H * 0.6, z + 1.4]}
              color="#cdd8ec"
              distance={9}
              decay={2}
              intensity={26}
            />
          ))}
        </group>
      ))}

      {/* Dos podios — cada uno con su figura en vídeo (PodiumFighter) además del podio y su luz. */}
      <group ref={podiumGroupA} position={[-PODIUM_X_BASE, 0, 0]}>
        <Podium x={0} z={PODIUM_Z} ringMat={ringMat} bodyMat={podiumBodyMat} lightRef={podiumRefA} />
        <PodiumFighter x={0} z={PODIUM_Z} src={mediaVideo.tysonBridge} aspect={512 / 778} gainRef={podiumFighterGainA} statusRef={podiumStatusA} />
      </group>
      <group ref={podiumGroupB} position={[PODIUM_X_BASE, 0, 0]}>
        <Podium x={0} z={PODIUM_Z} ringMat={ringMat} bodyMat={podiumBodyMat} lightRef={podiumRefB} />
        <PodiumFighter x={0} z={PODIUM_Z} src={mediaVideo.mcgregorBridge} aspect={736 / 400} gainRef={podiumFighterGainB} statusRef={podiumStatusB} />
      </group>

      {/* Punto de convergencia del Cierre, justo delante de Character Select. */}
      <pointLight ref={convergeRef} position={[0, 2.6, CS_Z + 1.5]} color="#e7ecf8" distance={14} decay={2} intensity={0} />
    </group>
  );
}
