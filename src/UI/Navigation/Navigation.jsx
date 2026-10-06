import { useEffect, useState } from 'react';
import { useStore } from '../../App/store.js';
import { goToSection, irAReservar } from '../../Scene/Transitions/navigation.js';

// NAVEGACIÓN = «¿A qué parte de SML quiero ir?». Cada entrada lleva DIRECTAMENTE a su sección.
//   Principal (mismo peso, escritorio y móvil): DISCIPLINAS · MÉTODO · ENTRENAMIENTO · SOBRE CHEN · EMPRESAS
//   Acción (acento, separada del resto):        RESERVAR  → irAReservar()
// DESCUBRIR ya no es ítem del menú, pero sigue existiendo como sección (goToSection('explore'), #descubrir) para el hero, el footer y Estudio.
// FAQ · Contacto · Instagram · Privacidad · Aviso legal no son destinos del menú: viven en el footer / en su sección.
// El logo / home es el SML del HUD (no se duplica aquí). ESTUDIO DE COMBATE no es sección principal: se abre desde Explore (y Método).
// EMPRESAS pasa por goToSection('experiences'), que cierra lo que haya encima, gestiona el historial y llama a openB2B (lógica B2B intacta).
const MAIN = [
  { id: 'disciplinas', label: 'Disciplinas', target: 'disciplinas' },
  { id: 'method', label: 'Método', target: 'method' },
  { id: 'training', label: 'Entrenamiento', target: 'training' },
  { id: 'founder', label: 'Sobre Chen', target: 'founder' },
  { id: 'experiences', label: 'Empresas', target: 'experiences' },
];
const ACTION = { id: 'book', label: 'Reservar' }; // data-id="book": conserva el acento definido en global.css

// La sección resaltada es activeSection (store), no la posición del scroll. La FAQ no es sección: mientras ocupa el centro no se resalta ningún ítem.
export default function Navigation() {
  const section = useStore((s) => s.activeSection);
  const [open, setOpen] = useState(false); // móvil: menú desplegado
  const [faqOn, setFaqOn] = useState(false);

  useEffect(() => {
    const el = document.getElementById('faq');
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setFaqOn(e.isIntersecting), { rootMargin: '-45% 0px -45% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Menú abierto (móvil): lo marca en <html> para que el CSS retire el CTA contextual y las flechas mientras esté desplegado.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.navOpen = open ? 'true' : 'false';
    return () => { delete root.dataset.navOpen; };
  }, [open]);

  const overFaq = faqOn && section !== 'experiences' && section !== 'estudio';
  const isOn = (target) => !overFaq && section === target;

  const go = (target) => { setOpen(false); goToSection(target); };

  return (
    <nav className="nav" aria-label="Navegación principal" data-open={open}>
      <button type="button" className="nav__toggle" aria-expanded={open} aria-controls="nav-list" onClick={() => setOpen((o) => !o)}>
        {open ? 'Cerrar' : 'Menú'}
      </button>
      <ul id="nav-list" className="nav__list">
        {MAIN.map((it) => (
          <li key={it.id} data-on={isOn(it.target)} data-id={it.id}>
            <button type="button" aria-current={isOn(it.target) ? 'true' : undefined} onClick={() => go(it.target)}>
              {it.label}
            </button>
          </li>
        ))}
        <li data-on={isOn('book')} data-id={ACTION.id}>
          <button type="button" aria-current={isOn('book') ? 'true' : undefined} onClick={() => { setOpen(false); irAReservar(); }}>
            {ACTION.label}
          </button>
        </li>
      </ul>
    </nav>
  );
}
