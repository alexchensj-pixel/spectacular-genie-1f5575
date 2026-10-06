// ESCENA 05 · SOBRE CHEN — fuente única de la geometría del archivo (funciones puras, sin three).
// Son EXACTAMENTE las cotas que ya tenía `Archive` en blockouts.jsx: nueve volúmenes de 0,2 × 4 × 3 m, cada 1,8 m en x,
// apoyados en el suelo (centro y = 2). No se cambia ninguna: las líneas (WireBox), la superficie oscura y el acabado
// (ArchiveArchitecture.jsx) leen de aquí, así no pueden desincronizarse.
export const ARCHIVE = { n: 9, size: [0.2, 4, 3], spacing: 1.8, y: 2 };
export const slabX = (i) => (i - 4) * ARCHIVE.spacing;

// Losa de suelo pulido (solo superficie): centrada en el grupo, 4 mm sobre la retícula global. Sus juntas se pintan sobre
// las MISMAS líneas de esa retícula (cada 2 m; el grupo está en un z par, así que las z locales pares coinciden).
// Los bordes se funden a transparente: fuera de la losa sigue la retícula de siempre.
export const FLOOR = { size: [40, 32], y: 0.004 };

// Luz cálida de los cantos (la única luz cálida de la escena; el resto es grafito frío).
export const WARM = [238, 226, 204];
