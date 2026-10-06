// Cliente de la API de demanda grupal. Única fuente de datos del buscador: no hay contadores locales ni datos de muestra.
// Producción: Netlify Function (netlify/functions/grupos.mjs). Desarrollo: middleware en memoria de vite.config.js.
const URL = '/api/grupos';

export async function cargarDemanda() {
  const r = await fetch(URL, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) throw new Error('demanda');
  const d = await r.json();
  if (!Array.isArray(d?.combinaciones)) throw new Error('demanda');
  return d.combinaciones;
}

// Devuelve { ok:true } o { ok:false, error } (mensaje ya legible).
export async function enviarSolicitud(datos) {
  try {
    const r = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos) });
    const d = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, error: d.error || 'No se pudo registrar la solicitud.' };
  } catch {
    return { ok: false, error: 'No se pudo conectar. Inténtalo de nuevo.' };
  }
}
