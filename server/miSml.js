// MI SML · NÚCLEO DE LA API PRIVADA — lógica única y sin dependencias, compartida por la función de Netlify (netlify/functions/mi-sml-me.mjs)
// y por el servidor de desarrollo (vite.config.js). Mismo patrón que server/demand.js.
//
//   NAVEGADOR → clientApi.js → GET /api/mi-sml/me  (Authorization: Bearer <token de acceso de Auth0>)
//                                   ↓ 1. validar la sesión (firma, caducidad, emisor, audiencia)  → server/miSmlAuth.js
//                                   ↓ 2. IDENTIDAD = el `sub` del token validado (nunca algo que envíe el navegador)
//                                   ↓ 3. fuente de datos privada (PASO 4: Airtable, solo en servidor) consultada SOLO con esa identidad
//
// AISLAMIENTO: la identidad sale únicamente del token. Este módulo NO lee la query string, ni el cuerpo, ni ninguna cabecera salvo Authorization:
// no existe parámetro con el que el navegador pueda pedir «otro cliente». La fuente de datos recibe únicamente { sub } y debe devolver como
// máximo los registros de esa persona.
// FUENTE DE DATOS: todavía no existe (PASO 4). Sin ella, la respuesta es técnica y mínima: sesión válida + «datos no conectados». Sin datos de cliente.
//
// Respuestas (siempre JSON, sin caché, sin detalles internos):
//   200 { session: 'valid', data: 'not-connected' }              sesión válida; aún no hay fuente de datos
//   200 { session: 'valid', data: 'connected', client: {…} }     (PASO 4) los datos de ESA persona
//   401 { error: 'unauthenticated' | 'invalid-session' | 'session-expired' }   sin sesión / sesión no válida / sesión caducada
//   403 { error: 'forbidden' }                                   sesión válida pero la persona no tiene acceso (lo decide la fuente en el PASO 4)
//   404 { error: 'not-found' }                                   otra ruta bajo /api/mi-sml/
//   405 { error: 'method-not-allowed' }                          solo GET
//   500 { error: 'internal' }                                    cualquier fallo interno (el detalle va solo al log del servidor)

export const RUTA_ME = '/api/mi-sml/me';

// Hasta el PASO 4 no hay fuente de datos: `obtener` declara que no está conectada. NO devuelve datos.
export const sinFuenteDeDatos = { async obtener() { return { estado: 'not-connected' }; } };

// Cabecera «Authorization: Bearer <token>» → token, o null si falta o está mal formada.
export function tokenDe(authorization) {
  const m = /^Bearer\s+([A-Za-z0-9._~+/-]+=*)$/.exec(String(authorization ?? '').trim());
  return m ? m[1] : null;
}

const cuerpo = (status, body, extra = {}) => ({ status, body, headers: extra });
const NO_AUTH = { 'www-authenticate': 'Bearer' };

// Solo recibe lo estrictamente necesario: método, ruta (para el 404) y la cabecera Authorization. Nada más del navegador entra aquí.
// `verify(token)` → { sub } o lanza { kind: 'expired' | 'invalid' | 'unavailable' }.   `fuente.obtener({ sub })` → { estado, client? }.
export async function atender({ method, pathname, authorization }, { verify, fuente = sinFuenteDeDatos, log = console.error }) {
  if (pathname && pathname.startsWith('/api/mi-sml/') && pathname !== RUTA_ME) return cuerpo(404, { error: 'not-found' });
  if (method !== 'GET') return cuerpo(405, { error: 'method-not-allowed' }, { allow: 'GET' });

  const token = tokenDe(authorization);
  if (!token) return cuerpo(401, { error: 'unauthenticated' }, NO_AUTH);

  let identidad;
  try {
    const v = await verify(token);
    if (!v || typeof v.sub !== 'string' || !v.sub) return cuerpo(401, { error: 'invalid-session' }, NO_AUTH);
    identidad = { sub: v.sub }; // ← LA identidad. Todo lo que se consulte a partir de aquí se hace con ella y solo con ella.
  } catch (e) {
    if (e?.kind === 'expired') return cuerpo(401, { error: 'session-expired' }, NO_AUTH);
    if (e?.kind === 'invalid') return cuerpo(401, { error: 'invalid-session' }, NO_AUTH);
    log('mi-sml: no se pudo validar la sesión', e?.kind || e?.code || e?.name || 'desconocido'); // nunca el token ni el mensaje completo
    return cuerpo(500, { error: 'internal' });
  }

  try {
    const r = await fuente.obtener(identidad);
    if (r?.estado === 'forbidden') return cuerpo(403, { error: 'forbidden' });
    if (r?.estado === 'connected' && r.client) return cuerpo(200, { session: 'valid', data: 'connected', client: r.client });
    return cuerpo(200, { session: 'valid', data: 'not-connected' });
  } catch (e) {
    log('mi-sml: fallo en la fuente de datos', e?.code || e?.name || 'desconocido');
    return cuerpo(500, { error: 'internal' });
  }
}

export const cabeceras = (extra = {}) => ({
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  vary: 'Authorization',
  ...extra,
});
