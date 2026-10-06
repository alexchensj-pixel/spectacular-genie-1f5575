import { useEffect, useState } from 'react';
import { useStore } from '../../App/store.js';
import { chapters } from '../../Data/Content.js';
import { stepChapter } from '../../Scene/Transitions/navigation.js';

// Controles globales: navegación ESPACIAL discreta (anterior / siguiente escena), no un menú. La web se entiende sin tocarlos:
// el scroll es la navegación principal. En móvil: contador «01 / 06» + flechas pequeñas. El atajo D (panel técnico de scroll)
// solo existe en desarrollo o con ?debug en la URL: el visitante no ve nada técnico.
const DEBUG_ENABLED = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
const MOBILE_Q = '(max-width: 900px)';
const pad = (n) => String(n).padStart(2, '0');

const counterStyle = { position: 'absolute', right: 0, bottom: '100%', marginBottom: '.35rem', fontFamily: 'var(--font-mono)', fontSize: '.6875rem', letterSpacing: '.14em', color: 'var(--dim)', textShadow: '0 1px 2px rgba(0, 0, 0, .9)', pointerEvents: 'none', whiteSpace: 'nowrap' };

export default function Controls() {
  const active = useStore((s) => s.activeChapter);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(MOBILE_Q).matches);

  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE_Q);
    if (!mq) return undefined;
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  useEffect(() => {
    if (!DEBUG_ENABLED) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'd' || e.key === 'D') useStore.getState().toggleDebug();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const i = Math.max(0, chapters.findIndex((c) => c.id === active));
  const arrow = mobile ? { fontSize: '.875rem' } : undefined;

  return (
    <div className="controls">
      {mobile && <span style={counterStyle} aria-hidden="true">{pad(i + 1)} / {pad(chapters.length)}</span>}
      <button style={arrow} onClick={() => stepChapter(-1)} aria-label="Escena anterior">↑</button>
      <button style={arrow} onClick={() => stepChapter(1)} aria-label="Escena siguiente">↓</button>
    </div>
  );
}
