import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { scrollState } from '../Transitions/scrollState.js';
import { LIGHT } from '../Environment/Entrada/constants.js';
import EntradaStudio from './EntradaStudio.jsx';
import CharacterSelectLighting from './CharacterSelectLighting.jsx';

// Tinte por capítulo de la luz que acompaña a la cámara: UNA sola familia, neutro frío grafito (la de las salas, la máquina y los
// portales), con el único cálido de la escena en el archivo (05, el mismo tono que los cantos luminosos de Archive/archiveSpec.js#WARM)
// y el filo azul del umbral en la 06 (Door/Door.jsx). 01 usa un neutro frío (la luz de estudio la aporta EntradaStudio).
const palette = ['#b4c2d8', '#a9b8d0', '#9fb1cc', '#b4c2d8', '#d9d2c2', '#c6d4ee'].map((c) => new Color(c));

const FOLLOW = 90;
const AMBIENT = 0.15;

export default function Lighting() {
  const light = useRef();
  const ambient = useRef();
  const tint = useMemo(() => new Color(), []);

  useFrame(({ camera }, dt) => {
    const { index, progress } = scrollState.current;
    const i = index >> 1;
    tint.copy(palette[i]);
    if (index & 1) tint.lerp(palette[Math.min(i + 1, palette.length - 1)], progress);
    light.current.color.lerp(tint, 1 - Math.exp(-dt * 3));
    light.current.position.set(camera.position.x, camera.position.y + 1.5, camera.position.z - 3);

    // Durante la Escena 01 manda la luz de estudio: la luz que sigue a la cámara se atenúa y recupera su valor
    // original a lo largo del umbral hacia la 02 (1 = comportamiento anterior, intacto para 02–06).
    const away = index === 0 ? 0 : index === 1 ? progress : 1;
    const m = LIGHT.follow + (1 - LIGHT.follow) * away;
    light.current.intensity = FOLLOW * m;
    ambient.current.intensity = LIGHT.ambient + (AMBIENT - LIGHT.ambient) * away;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={LIGHT.ambient} />
      <pointLight ref={light} intensity={FOLLOW * LIGHT.follow} distance={45} decay={2} />
      <EntradaStudio />
      <CharacterSelectLighting />
    </>
  );
}
