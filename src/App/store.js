import { create } from 'zustand';
import { SECTIONS, CHAPTER_SECTION, sectionForChapter } from './sections.js';

// Estado DISCRETO (cambia a saltos). El progreso continuo del scroll vive en Scene/Transitions/scrollState.js
// Aquí solo viven decisiones que algún componente lee o escribe hoy. Los campos retirados (intake, chenReviewed, b2bStep,
// umbralOpen) están documentados en _legacy/storeRetirado.js.
export const useStore = create((set) => ({
  // SECCIÓN activa (V22): lo que la persona está viendo / ha elegido ver. La fija la navegación directa (goToSection) y, mientras
  // se desplaza, la sigue el capítulo en pantalla — el scroll ya no es el único mecanismo que la decide.
  activeSection: 'home',
  setActiveSection: (id) => set((s) => (SECTIONS.includes(id) ? { activeSection: id } : s)),

  // Capítulo 3D en pantalla (lo marca el scroll). Mientras el B2B está abierto, la sección es EXPERIENCES y el scroll no la cambia.
  activeChapter: 'entrada',
  // character-select lo comparten DISCIPLINAS y DESCUBRIR: si la persona venía de 'disciplinas' se conserva; en cualquier otro caso
  // (home por scroll/Bridge, otra sección) pasa a 'explore' y el foco vuelve a 'modos'.
  setActiveChapter: (id) => set((s) => {
    if (s.b2bOpen || s.estudioOpen) return { activeChapter: id };
    if (id === 'character-select') {
      const section = s.activeSection === 'disciplinas' ? 'disciplinas' : 'explore';
      return { activeChapter: id, activeSection: section, exploreFocus: section === 'disciplinas' ? 'disciplinas' : 'modos' };
    }
    return { activeChapter: id, activeSection: CHAPTER_SECTION[id] ?? s.activeSection };
  }),

  // Foco de character-select (PASO 1): 'disciplinas' (puerta DISCIPLINAS) | 'modos' (puerta DESCUBRIR). Solo lo fija la navegación;
  // la UI de Explore lo leerá en un paso posterior. No toca selectedTrainingMode ni selectedDiscipline.
  exploreFocus: 'modos',
  setExploreFocus: (f) => set((s) => (f === 'disciplinas' || f === 'modos' ? (s.exploreFocus === f ? s : { exploreFocus: f }) : s)),

  // Decisiones de la persona que viajan entre secciones (se rellenan según cada sección las implemente).
  // EXPLORE (V22 · paso 3) — dos decisiones, una detrás de otra, y las dos son la CAUSA de lo que ocurre en pantalla y en el 3D:
  //   selectedTrainingMode = «¿cómo quieres entrenar?» → 'aprender' | 'entrenar' | 'peleador' | 'sparring' | 'competir' | null.
  //                          Son FORMAS de entrenar, no niveles (no hay principiante / intermedio / avanzado).
  //                          (El campo existía desde el paso 1 con el comentario «formato 1-1 | duo | grupo»; el formato de sesión
  //                          vive en selectedFormat, más abajo, así que no se pierde ningún concepto.)
  //   selectedDiscipline   → 'boxeo' | 'k1' | 'muay-thai' | null. Es el ÚNICO estado de disciplina: la UI, el personaje, el vídeo,
  //                          la luz y la cámara 3D lo leen directamente (ya no existe un «focusedDiscipline» paralelo).
  selectedTrainingMode: null,
  selectTrainingMode: (id) => set({ selectedTrainingMode: id }),
  // TRAINING (V22 · paso 5) — tres preguntas, en este orden. Ninguna toca selectedTrainingMode (que es de EXPLORE):
  //   selectedGoal      = «¿Qué buscas?»              → 'tecnica' | 'bienestar' | 'competir' | null
  //   selectedFormat    = «¿Cómo quieres entrenar?»   → '1-1' | 'duo' | 'grupo' | 'hibrido' | null
  //   selectedFrequency = «¿Cuánto puedes entrenar?»  → '1-dia' | '2-dias' | '3-dias' | 'variable' | null
  selectedGoal: null,
  selectGoal: (id) => set({ selectedGoal: id }),
  selectedFormat: null,
  selectFormat: (id) => set({ selectedFormat: id }),
  selectedFrequency: null,
  selectFrequency: (v) => set({ selectedFrequency: v }),

  // 02 EXPLORE — disciplina elegida: la decisión que el usuario se lleva consigo al resto del recorrido (02 → 06) y la que
  // gobierna el 3D de EXPLORE (personaje, vídeo, luz, cámara). null = vista general de las tres.
  selectedDiscipline: null,
  selectDiscipline: (id) => set({ selectedDiscipline: id }),

  // 03 Método (Asesoría + Lab): subestado de la pantalla; lo escribe AsesoriaLab y lo lee el HUD.
  substage: 'apertura',
  setSubstage: (id) => set({ substage: id }),

  // 04 Slot
  // Plan híbrido fijado en la Scene 04: { total, modalidades: [{ tipo, cantidad }] } | null. Lo lee Reserva.
  planHibrido: null,
  setPlanHibrido: (plan) => set({ planHibrido: plan }),

  // 06 Reserva — bookingState sustituye a los antiguos reservaOpen + reservationStatus (misma función, un solo estado):
  //   'idle'      → calendario cerrado
  //   'open'      → calendario abierto (lo activan BOOK, el hero, el CTA fijo y la navegación)
  //   'pending'   → reserva en curso (reservado para la integración real)
  //   'confirmed' → Calendly ha confirmado la cita
  bookingState: 'idle',
  setBookingState: (v) => set({ bookingState: v }),
  // Abre el calendario sin degradar una reserva ya pendiente o confirmada.
  openBooking: () => set((s) => (s.bookingState === 'idle' ? { bookingState: 'open' } : s)),

  // B2B — «Quiero contratar una experiencia». Recorrido propio (Experience/B2B) que se abre como otra puerta del mismo universo:
  // no toca capítulos, cámara ni scroll; al cerrar, la persona vuelve exactamente donde estaba.
  b2bOpen: false,
  openB2B: () => set({ b2bOpen: true, estudioOpen: false, activeSection: 'experiences' }),
  closeB2B: () => set((s) => ({ b2bOpen: false, activeSection: sectionForChapter(s.activeChapter, s.exploreFocus) ?? 'home' })),

  // ESTUDIO DE COMBATE — capa de profundización del método (Nivel 2). Otra puerta del mismo universo, igual que Experiences:
  // overlay propio, no toca capítulos, cámara ni scroll; al cerrar, la persona vuelve exactamente donde estaba. Excluyente con B2B.
  estudioOpen: false,
  openEstudio: () => set({ estudioOpen: true, b2bOpen: false, activeSection: 'estudio' }),
  closeEstudio: () => set((s) => ({ estudioOpen: false, activeSection: sectionForChapter(s.activeChapter, s.exploreFocus) ?? 'home' })),

  debug: false,
  toggleDebug: () => set((s) => ({ debug: !s.debug })),
}));
