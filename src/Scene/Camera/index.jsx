import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils } from 'three';
import { scrollState, prefersReducedMotion, isCoarsePointer, isExploreActive } from '../Transitions/scrollState.js';
import { segmentPoses, segmentEase, segmentFeel, DEFAULT_FEEL, LENSES, anchorZ, chapterOrder, stageCamera, thresholdCamera, stationWorld, STATION_IDS } from './waypoints.js';
import { segmentKeys } from '../../Data/Content.js';
import { disciplines } from '../../Data/Disciplines.js';
import { useStore } from '../../App/store.js';
import { cellX, CELL, layoutK, portraitAmount, PORTRAIT_LAYOUT, exploreRegion, exploreLayoutAspect } from '../Environment/cells.js';

const smooth = (t) => t * t * (3 - 2 * t);
const ENTRY_PULL = 4;

// Escena 02 (Character Select) vive en Z = CS_Z. Vista general: las tres vitrinas (BOXEO · K1 · MUAY THAI,
// en X = -spacing, 0, +spacing) deben caber juntas en pantalla SIEMPRE que no haya ninguna enfocada — en
// cualquier proporción de pantalla, móvil vertical incluido.
const CS_Z = anchorZ(chapterOrder.indexOf('character-select'));
const OVERVIEW_BASE_DIST = 14;     // distancia "cómoda" de referencia (antes 12: se aleja un poco a propósito)
const OVERVIEW_MARGIN = 1.22;      // margen extra sobre el ancho estricto de las 3 vitrinas, para que no queden pegadas al borde
const OVERVIEW_MAX_FOV = 75;       // techo de fov vertical: por encima, mejor alejar la cámara que deformar la imagen
const STRICT_HALF_WIDTH = CELL.spacing + CELL.size[0] / 2; // ancho estricto de las 3 vitrinas, sin margen
// El foco NUNCA debe sacar a los laterales del encuadre ("el foco cambia la jerarquía, no cambia el sujeto"):
// el desplazamiento lateral de la cámara al enfocar (FOCUS_X_FRACTION) se resta por adelantado del margen de
// la vista general, así el hueco que ese desplazamiento consume ya está presupuestado desde el principio —
// nunca hay que "recuperarlo" después. FOCUS_X_FRACTION baja (antes 0.85) es a propósito: la cámara solo
// insinúa el giro hacia el luchador enfocado, no encuadra un plano individual.
const FOCUS_X_FRACTION = 0.3;
const OVERVIEW_HALF_WIDTH = STRICT_HALF_WIDTH * OVERVIEW_MARGIN + FOCUS_X_FRACTION * CELL.spacing;
const BOX_MIN_MARGIN = 0.05;      // margen mínimo (fracción del ancho de pantalla, por lado) de la cara frontal del WireBox
const ZOOM_IN_DIST = 3.2;           // cuánto se acerca la cámara (en Z) al elegir una disciplina en apaisado: la elección es la protagonista (los vecinos quedan atenuados a los lados)
const STACK_FOCUS_X = 0.25;         // vertical (3D = franja superior, el vídeo va en el panel): la cámara solo insinúa el giro hacia la elegida…
const STACK_DOLLY = 0.1;            // …y se acerca esta fracción de la distancia de la vista general; el resto lo hace el atenuado + luz + vídeo

// Dado el aspect ratio real de la pantalla, calcula distancia + fov vertical que garantizan que las tres
// vitrinas quepan en el encuadre horizontal. Primero abre el fov (hasta el techo); si aun así no basta
// (pantallas muy estrechas, móvil vertical), aleja la cámara en su lugar — nunca deja a las vitrinas fuera.
//
// MÓVIL VERTICAL (solo composición responsive, sin zoom/FOV dinámico): el layout de la escena se estrecha
// (cells.js#layoutK: separación, aro y volumen común a ~0,62×) y el ancho a encuadrar se reduce con él (mismo
// margen, misma reserva para el desplazamiento de foco — todo escala con k). Además el techo de fov baja de 75°
// al fov de navegación (50°) según portraitAmount: en vertical la cámara ya no "abre angular" — se aleja lo
// justo con la misma óptica del resto de la experiencia, y los luchadores ganan tamaño en pantalla. Con
// portraitAmount = 0 (escritorio / apaisado) k = 1 y el techo sigue en 75°: resultado idéntico al de antes.
function overviewFraming(aspect) {
  const k = layoutK(aspect);
  const halfWidth = OVERVIEW_HALF_WIDTH * k;
  const maxFov = MathUtils.lerp(OVERVIEW_MAX_FOV, LENSES.nav.fov, portraitAmount(aspect));

  const neededHalfAngle = Math.atan(halfWidth / OVERVIEW_BASE_DIST);
  const neededVerticalFovDeg = MathUtils.radToDeg(2 * Math.atan(Math.tan(neededHalfAngle) / aspect));
  const fov = MathUtils.clamp(neededVerticalFovDeg, LENSES.nav.fov, maxFov);

  const cappedHalfAngle = Math.atan(Math.tan(MathUtils.degToRad(maxFov) / 2) * aspect);
  let dist = neededHalfAngle > cappedHalfAngle ? halfWidth / Math.tan(cappedHalfAngle) : OVERVIEW_BASE_DIST;

  // FRANJA INTERMEDIA (aspect < PORTRAIT_LAYOUT.fullAspect: tablet vertical, ventanas estrechas): el ancho de arriba
  // se mide sobre el plano de los luchadores, pero la cara FRONTAL del WireBox está más cerca de la cámara y se
  // proyecta más ancha — con base 14 m y el layout ya solo parcialmente estrechado, sus aristas se salían del
  // viewport. Garantía: la cara frontal del volumen común (mitad de ancho 5,2·k, adelantada FLOOR_R·k) cabe con
  // BOX_MIN_MARGIN de margen POR LADO en el peor estado, incluido enfocado (desplazamiento lateral + acercamiento de
  // cámara, que aquí aún existen en la proporción `landscape`). Solo AUMENTA la distancia si hace falta: en móvil
  // vertical estrecho (donde el volumen ya cabe con ~11 %) no actúa, y con aspect ≥ fullAspect (escritorio) no
  // se evalúa — resultado idéntico al de antes. El fov no se toca.
  if (aspect < PORTRAIT_LAYOUT.fullAspect) {
    const landscape = 1 - portraitAmount(aspect);
    const boxHalfW = STRICT_HALF_WIDTH * k;
    const boxFrontDepth = CELL.size[0] * 0.85 * k;
    const focusShift = CELL.spacing * FOCUS_X_FRACTION * landscape;
    const focusDolly = ZOOM_IN_DIST * landscape;
    const tanHalfW = Math.tan(MathUtils.degToRad(fov) / 2) * aspect;
    const fitDist = focusDolly + boxFrontDepth + (boxHalfW + focusShift) / (tanHalfW * (1 - 2 * BOX_MIN_MARGIN));
    dist = Math.max(dist, fitDist);
  }
  return { dist, fov };
}

const EYE_Y = 1.7;                            // altura de la cámara en EXPLORE
const LOOK_Y = 2.5;                           // punto de mira en reposo

// La cámara recorre el mundo según el progreso del scroll (avanzar dentro de un espacio).
// Determinista: la posición/mirada/focal son siempre función de (progreso, waypoints) — sin muelles ni rebote.
// La única suavidad es un amortiguado exponencial de "seguimiento" (k), no una física de resorte.
// EXCEPCIÓN deliberada (V22 · EXPLORE): dentro de 'character-select' la cámara NO depende del progreso de scroll. Muestra la
// vista general de las 3 vitrinas y se desplaza hacia una de ellas SOLO cuando el usuario elige una disciplina
// (selectedDiscipline): la selección es la causa, el scroll nunca decide qué personaje se ve. Además la escena se encuadra
// en la región de pantalla que deja libre el panel de EXPLORE (cells.js#exploreRegion) desplazando la proyección
// (camera.setViewOffset): derecha en apaisado, franja superior en vertical.
export default function CameraRig() {
  const first = segmentPoses[segmentKeys[0]][0];
  // HOME: la cámara arranca ENTRY_PULL metros por detrás de la pose inicial y entra despacio al laboratorio (un solo gesto, sin giros).
  const pos = useRef(new Vector3(first.pos[0], first.pos[1], first.pos[2] + ENTRY_PULL));
  const look = useRef(new Vector3(...first.look));
  const fov = useRef(first.fov);
  const focus = useRef({ x: 0, zoom: 0 });
  // Desplazamiento de la proyección (fracción del ancho / alto de pantalla) hacia la región del 3D en EXPLORE.
  const viewOff = useRef({ x: 0, y: 0 });
  const v = useMemo(() => ({ a: new Vector3(), b: new Vector3(), tp: new Vector3(), tl: new Vector3() }), []);

  useFrame(({ camera, pointer, size }, dt) => {
    const { key, progress } = scrollState.current;
    const feel = segmentFeel[key] ?? DEFAULT_FEEL;
    const idx = disciplines.findIndex((d) => d.id === useStore.getState().selectedDiscipline);
    const inExplore = isExploreActive();
    const onSelect = inExplore && idx >= 0;
    // Tras un salto directo entre secciones (navigation.js#jumpTo) la cámara se coloca en su destino sin viajar por el mundo.
    const snap = prefersReducedMotion || performance.now() < scrollState.snapUntil;

    let targetFov;
    let offX = 0;
    let offY = 0;

    if (inExplore) {
      // Región de pantalla del 3D (el resto es el panel de decisión) y aspect de layout coherente con ella.
      const region = exploreRegion(size.width, size.height);
      const aspect = exploreLayoutAspect(size.width, size.height);
      const { dist, fov: overviewFov } = overviewFraming(aspect);
      const lk = layoutK(aspect);
      // `landscape` = 1 - portraitAmount: 1 con layout de escritorio / apaisado, 0 con layout de móvil vertical.
      const landscape = 1 - portraitAmount(aspect);

      // Al ELEGIR una disciplina la cámara responde:
      //  · apaisado (3D a la derecha): se desplaza en X hacia su vitrina y se acerca un poco (dolly, no fov); los otros dos
      //    siguen en encuadre (OVERVIEW_HALF_WIDTH ya presupuesta ese desplazamiento).
      //  · vertical (3D en la franja superior, vídeo del personaje en el panel): solo insinúa el giro y el acercamiento (STACK_*);
      //    la jerarquía la dan la escala/brillo de la elegida, el atenuado de las otras dos, su luz y su vídeo.
      const shift = region.split ? FOCUS_X_FRACTION * landscape : STACK_FOCUS_X;
      const dolly = region.split ? ZOOM_IN_DIST * landscape : dist * STACK_DOLLY;
      const fx = onSelect ? cellX(idx) * lk * shift : 0;
      const fz = onSelect ? dolly : 0;
      focus.current.x = snap ? fx : MathUtils.damp(focus.current.x, fx, 3.5, dt);
      focus.current.zoom = snap ? fz : MathUtils.damp(focus.current.zoom, fz, 3.5, dt);

      v.tp.set(0, EYE_Y, CS_Z + dist - focus.current.zoom);
      v.tp.x += focus.current.x;
      v.tl.set(0, LOOK_Y, CS_Z);
      v.tl.x += focus.current.x;
      // El fov de la vista general se mantiene SIEMPRE, también con una disciplina elegida.
      targetFov = overviewFov;

      // Hacia dónde se desplaza la proyección: el punto de mira cae en el centro de la región del 3D.
      offX = region.split ? -(region.cx - 0.5) : 0;
      offY = region.split ? 0 : 0.5 - region.cy;
    } else {
      // Resto del recorrido. En 03–06 (key = capítulo) la cámara va de estación en estación sobre las piezas del propio mundo
      // (waypoints.js#stageCamera); en 06, con la reserva abierta, ya está dentro de la puerta. Umbrales y 01: como antes.
      const stage = stageCamera(key, key === 'reserva' && useStore.getState().bookingState !== 'idle' ? 1 : progress, size.width / Math.max(1, size.height));
      if (stage) {
        v.tp.set(...stage.pos);
        v.tl.set(...stage.look);
        targetFov = stage.fov;
      } else {
        const aspectNow = size.width / Math.max(1, size.height);
        // 03→04→05→06: un solo travelling (waypoints.js#thresholdCamera), con las estaciones calculadas al aspect REAL en ambos extremos.
        const route = thresholdCamera(key, progress, aspectNow);
        if (route) {
          v.tp.set(...route.pos);
          v.tl.set(...route.look);
          targetFov = route.fov;
        } else {
          const [from, to0] = segmentPoses[key];
          // Un umbral que desemboca en un capítulo con estaciones (02→03) termina en la estación real de ESTE aspect (segmentPoses se calcula a 16:9:
          // en móvil la cámara daba un tirón al entrar en el capítulo). El resto de umbrales no cambia.
          const to = (key.includes('>') && stageCamera(key.split('>')[1], 0, aspectNow)) || to0;
          const t = (segmentEase[key] ?? smooth)(progress);
          v.tp.set(...from.pos).lerp(v.b.set(...to.pos), t);
          v.tl.set(...from.look).lerp(v.b.set(...to.look), t);
          targetFov = MathUtils.lerp(from.fov, to.fov, t);
        }
      }
      focus.current.x = MathUtils.damp(focus.current.x, 0, 3, dt);
      focus.current.zoom = MathUtils.damp(focus.current.zoom, 0, 3, dt);
    }

    viewOff.current.x = snap ? offX : MathUtils.damp(viewOff.current.x, offX, 4, dt);
    viewOff.current.y = snap ? offY : MathUtils.damp(viewOff.current.y, offY, 4, dt);

    // Micro-desplazamiento orbital (parallax de puntero): solo con puntero fino, no en táctil.
    if (!prefersReducedMotion && !isCoarsePointer && feel.parallax > 0) {
      v.tp.x += pointer.x * 0.35 * feel.parallax;
      v.tp.y += pointer.y * 0.15 * feel.parallax;
    }

    const k = snap ? 1 : 1 - Math.exp(-dt * feel.k);
    pos.current.lerp(v.tp, k);
    look.current.lerp(v.tl, k);
    fov.current = performance.now() < scrollState.snapUntil ? targetFov : MathUtils.damp(fov.current, targetFov, 5, dt);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
    scrollState.camera.x = pos.current.x;
    scrollState.camera.y = pos.current.y;
    scrollState.camera.z = pos.current.z;
    if (camera.isPerspectiveCamera && Math.abs(camera.fov - fov.current) > 0.01) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
    // Proyección a pantalla de los puntos de 03–06 con la cámara ya colocada: el DOM de cada capítulo se ata a ellos (useStation.js).
    if (camera.isPerspectiveCamera) {
      camera.updateMatrixWorld();
      const aspect = size.width / Math.max(1, size.height);
      for (const id of STATION_IDS) {
        const w = stationWorld(id, aspect);
        v.a.set(w[0], w[1], w[2]);
        const d = v.a.distanceTo(camera.position);
        v.a.project(camera);
        const st = scrollState.station[id] || (scrollState.station[id] = { x: 0, y: 0, d: 1, vis: false });
        st.x = (v.a.x * 0.5 + 0.5) * size.width;
        st.y = (-v.a.y * 0.5 + 0.5) * size.height;
        st.d = d;
        st.vis = v.a.z < 1;
      }
    }
    // Desplazamiento de proyección hacia la región del 3D en EXPLORE (0 en el resto del recorrido: se desactiva del todo).
    // Se reaplica cada frame mientras está activo para seguir el tamaño real del canvas (rotar el móvil, redimensionar).
    if (camera.isPerspectiveCamera) {
      const ox = viewOff.current.x;
      const oy = viewOff.current.y;
      if (Math.abs(ox) > 0.0005 || Math.abs(oy) > 0.0005) {
        camera.setViewOffset(size.width, size.height, ox * size.width, oy * size.height, size.width, size.height);
      } else if (camera.view && camera.view.enabled) {
        camera.clearViewOffset();
      }
    }
  });

  return null;
}
