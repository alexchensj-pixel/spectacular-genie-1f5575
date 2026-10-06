import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MathUtils } from 'three';
import { getCharactersReveal } from '../Transitions/scrollState.js';
import { anchorZ } from '../Camera/waypoints.js';
import { CELL, cellX, layoutK, portraitAmount, exploreLayoutAspect } from '../Environment/cells.js';
import { useStore } from '../../App/store.js';
import { disciplines } from '../../Data/Disciplines.js';

// Iluminación EXCLUSIVA de la Escena 02 (Character Select). Se ata a getCharactersReveal(): ganancia 0 fuera
// de esa escena, 1 dentro — la MISMA función que ya rige la visibilidad de los luchadores y las vitrinas
// (Fighter.jsx, blockouts.jsx#Pillars). Así una nueva luz aquí no puede filtrarse a Entrada ni a las escenas
// posteriores (03–06): no depende de posición en Z, depende del mismo reveal que ya las gobierna.
//  · Un rim frío por vitrina (3, uno por cellX), simétrico en reposo (misma intensidad y distancia en las
//    tres — punto 5, equilibrio inicial). Al enfocar una, su rim gana un halo y los otros dos se atenúan más
//    (corrección: antes 0.55/0.75, ahora 0.45/0.68 — más contraste, "separación clara respecto al fondo").
//  · Una luz de entrada ("key") por vitrina, apagada en reposo (intensity 0): al enfocar esa disciplina se
//    enciende sobre SU aro de suelo (blockouts.jsx#CellFloor, meshStandardMaterial — reacciona a luz real),
//    dando la "entrada de luz cinematográfica" / "sensación de foco de entrada" del punto 3 sin crear ninguna
//    caja, panel o HUD nuevos: es luz física integrada en el volumen que ya existe, no un efecto añadido.
//    Color = acento sutil de cada disciplina (Data/Disciplines.js#accent) — identidad de color del punto 5,
//    nunca neón/RGB (el resto de la escena sigue oscura y el acento solo aparece en esta luz + el panel HTML).
//  · V22: «enfocada» = disciplina ELEGIDA en EXPLORE (selectedDiscipline).
//  · Un relleno cenital suave centrado en las tres, para separar el suelo de blockouts.jsx del fondo — baja un
//    poco (no a cero) en cuanto hay una disciplina enfocada, para reforzar el contraste sujeto/fondo.
const Z = anchorZ(1); // 'character-select' es el capítulo índice 1
const TOP_NEUTRAL = '#dfe6f2';

export default function CharacterSelectLighting() {
  const rims = useRef([]);
  const keys = useRef([]);
  const top = useRef();
  // Multiplicador propio por vitrina sobre la base simétrica (14 * reveal): 1 en reposo, más al enfocar
  // (halo sobre esa posición) y menos en las otras dos — nunca a cero, siguen visibles.
  const boost = useRef(disciplines.map(() => 1));
  const keyBoost = useRef(disciplines.map(() => 0));
  const tint = useRef(new Color(TOP_NEUTRAL)).current;
  const accent = useRef(new Color()).current;

  useFrame(({ size }, dt) => {
    const reveal = getCharactersReveal();
    const focused = useStore.getState().selectedDiscipline; // V22: la disciplina elegida en EXPLORE
    // Layout responsive (cells.js): en móvil vertical los tres se acercan entre sí y cada luz los sigue (misma x
    // que su vitrina). La atenuación de los no enfocados es menos marcada en móvil. En escritorio: k = 1.
    const aspect = exploreLayoutAspect(size.width, size.height);
    const k = layoutK(aspect);
    const dimBoost = MathUtils.lerp(0.45, 0.68, portraitAmount(aspect));
    disciplines.forEach((d, i) => {
      const isFocus = focused === d.id;
      const dim = focused && !isFocus;
      boost.current[i] = MathUtils.damp(boost.current[i], isFocus ? 1.85 : dim ? dimBoost : 1, 4, dt);
      keyBoost.current[i] = MathUtils.damp(keyBoost.current[i], isFocus ? 1 : 0, 5, dt);
      const l = rims.current[i];
      if (l) {
        l.intensity = 14 * reveal * boost.current[i];
        l.position.x = cellX(i) * k;
      }
      const key = keys.current[i];
      if (key) {
        key.intensity = 58 * reveal * keyBoost.current[i];
        key.position.x = cellX(i) * k;
      }
    });
    if (top.current) {
      top.current.intensity = reveal * (focused ? 4.2 : 6);
      // Ambientación: con una disciplina elegida, el relleno cenital vira hacia su color de identidad (muy sutil).
      const acc = disciplines.find((d) => d.id === focused)?.accent;
      tint.set(TOP_NEUTRAL);
      if (acc) tint.lerp(accent.set(acc), 0.3);
      top.current.color.lerp(tint, 1 - Math.exp(-dt * 4));
    }
  });

  return (
    <group position={[0, 0, Z]}>
      {[0, 1, 2].map((i) => (
        <pointLight
          key={i}
          ref={(el) => (rims.current[i] = el)}
          position={[cellX(i), CELL.fighterHeight * 0.6, -1.6]}
          color="#8fa8d6"
          distance={6}
          decay={2}
          intensity={0}
        />
      ))}
      {disciplines.map((d, i) => (
        <pointLight
          key={d.id}
          ref={(el) => (keys.current[i] = el)}
          position={[cellX(i), 1.9, 0.6]}
          color={d.accent || '#f2ede0'}
          distance={4.6}
          decay={2}
          intensity={0}
        />
      ))}
      <pointLight ref={top} position={[0, CELL.size[1] + 1.2, 0]} color="#dfe6f2" distance={12} decay={2} intensity={0} />
    </group>
  );
}
