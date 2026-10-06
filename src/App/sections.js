// SECCIONES V22 — el modelo de navegación del producto, independiente del scroll.
//
// Antes:   SCROLL → CHAPTER → CAMERA → TRANSITION → CONTENT
// Ahora:   CONTENT → USER DECISION → UI STATE (store) → 3D RESPONSE (cámara / escena)
//
// Una SECCIÓN es lo que la persona quiere ver; un CAPÍTULO (Data/Content.js) es el tramo de película 3D que la ilustra.
// La sección manda: la navegación llama a goToSection(id) (Scene/Transitions/navigation.js), el store guarda activeSection y
// el scroll / la cámara se colocan como consecuencia. Este módulo no importa nada (lo leen el store y la navegación).
// PASO 1 (mapa explorable): 'disciplinas' es una PUERTA más, no un capítulo 3D nuevo. Comparte capítulo con 'explore' (DESCUBRIR);
// lo que las distingue es el foco (store.exploreFocus: 'disciplinas' | 'modos').
export const SECTIONS = ['home', 'disciplinas', 'explore', 'method', 'estudio', 'training', 'experiences', 'founder', 'book'];

// Capítulo 3D que ilustra cada sección. null = no es un tramo de la película (EXPERIENCES abre el recorrido B2B existente).
export const SECTION_CHAPTER = {
  home: 'entrada',
  disciplinas: 'character-select', // DISCIPLINAS: mismo capítulo que explore, foco 'disciplinas'
  explore: 'character-select',     // DESCUBRIR: foco 'modos'
  method: 'asesoria-lab',
  estudio: null, // overlay propio (Experience/Estudio): como Experiences, no toca capítulos, cámara ni scroll
  training: 'slot',
  experiences: null,
  founder: 'proof-chen',
  book: 'reserva',
};

// Inversa: capítulo → sección. Permite que el scroll siga ACTUALIZANDO activeSection, pero ya no es lo único que la decide.
// character-select lo comparten 'disciplinas' y 'explore': por scroll manda 'explore' (se fija explícito para no depender del orden).
export const CHAPTER_SECTION = {
  ...Object.fromEntries(Object.entries(SECTION_CHAPTER).filter(([, c]) => c).map(([s, c]) => [c, s])),
  'character-select': 'explore',
};

// Sección que corresponde a un capítulo, respetando el foco de character-select (DISCIPLINAS vs DESCUBRIR).
export const sectionForChapter = (chapter, exploreFocus) =>
  chapter === 'character-select' && exploreFocus === 'disciplinas' ? 'disciplinas' : (CHAPTER_SECTION[chapter] ?? null);

// HASH ↔ sección. 'home' = sin hash. #empresas (B2B) y #estudio los escriben sus propios overlays (replaceState).
export const SECTION_HASH = {
  home: '', disciplinas: 'disciplinas', explore: 'descubrir', method: 'metodo', training: 'entrenamiento',
  founder: 'chen', book: 'reservar', experiences: 'empresas', estudio: 'estudio',
};
export const HASH_SECTION = Object.fromEntries(Object.entries(SECTION_HASH).map(([s, h]) => [h, s]));

// Estructura funcional de la navegación (espejo de UI/Navigation, que es quien la pinta).
//  DESCUBRIR NO es ítem del menú principal: es una de las dos acciones de la portada (RESERVAR / DESCUBRIR) y sigue accesible por
//  goToSection('explore') desde el hero, el footer y Estudio. No se elimina ni se esconde: solo no compite con el menú.
//  kind 'section' → goToSection(target) · kind 'action' → irAReservar().
export const NAV_ITEMS = [
  { id: 'disciplinas', label: 'Disciplinas', kind: 'section', target: 'disciplinas' },
  { id: 'method',      label: 'Método',      kind: 'section', target: 'method' },
  { id: 'training',    label: 'Entrenamiento', kind: 'section', target: 'training' },
  { id: 'founder',     label: 'Sobre Chen',  kind: 'section', target: 'founder' },
  { id: 'experiences', label: 'Empresas',    kind: 'section', target: 'experiences' },
  { id: 'book',        label: 'Reservar',    kind: 'action' },
];
