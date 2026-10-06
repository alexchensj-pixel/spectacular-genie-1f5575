// MI SML · CAPA DE DATOS Y SESIÓN DEL CLIENTE — la ÚNICA interfaz que el frontend usa para saber quién es la persona y obtener sus datos.
//
//   CLIENTE (navegador)  →  AUTENTICACIÓN (Auth0)  →  este archivo  →  GET /api/mi-sml/me (PASO 3, netlify/functions/mi-sml-me.mjs)  →  [PASO 4] AIRTABLE
//
// ESTE ARCHIVO SOLO HABLA CON LA API PRIVADA PROPIA (API_BASE). No importa Airtable, no conoce bases ni tablas, no lleva tokens de datos y no puede
// saltarse la API: no hay otra ruta hacia los datos privados desde el navegador. La API valida el token en servidor e identifica a la persona por él.
//
// PROVEEDOR: Auth0 (Universal Login, flujo Authorization Code + PKCE, SDK @auth0/auth0-spa-js).
//  · Las contraseñas y los usuarios viven en Auth0, nunca en este proyecto. El acceso (contraseña, enlace por email, etc.) se configura en el tenant.
//  · La sesión la gestiona el SDK con tokens EN MEMORIA (cacheLocation: 'memory'): nada de localStorage ni sessionStorage con credenciales o tokens.
//    Para restaurar la sesión al recargar, el SDK pregunta a Auth0 en silencio (checkSession) usando la cookie de sesión de Auth0.
//  · Airtable NO interviene en la autenticación. Aquí no hay ninguna llamada a Airtable ni datos de ejemplo.
//
// CONFIGURACIÓN (variables PÚBLICAS; Vite solo expone las que empiezan por VITE_). Ninguna es un secreto: un SPA no lleva «client secret».
//   VITE_AUTH0_DOMAIN     dominio del tenant de Auth0 (p. ej. el de «Settings → Domain», o el dominio propio si se configura uno)
//   VITE_AUTH0_CLIENT_ID  Client ID de la aplicación «Single Page Application» creada en Auth0
//   VITE_AUTH0_AUDIENCE   identificador de la API privada de MI SML registrada en Auth0 (PASO 3). Sin él, Auth0 emite un token opaco que
//                         la API rechaza. El servidor necesita el MISMO valor en AUTH0_AUDIENCE (y AUTH0_DOMAIN): variables de servidor, ver server/miSmlAuth.js.
// Sin DOMAIN y CLIENT_ID, MI SML funciona como «acceso todavía no activo»: ningún visitante se trata como cliente.
//
// CONTRATO de getCurrentClient() cuando la API tenga fuente de datos (PASO 4; la forma, no los datos):
//   { nombre, plan, pago: { estado, importePendiente }, clases: { contratadas, realizadas, restantes }, movementAnalysis }
// La API devolverá EXACTAMENTE esos campos; el frontend no calcula ni completa nada.

const env = import.meta.env || {};
const DOMAIN = (env.VITE_AUTH0_DOMAIN || '').trim();
const CLIENT_ID = (env.VITE_AUTH0_CLIENT_ID || '').trim();
const AUDIENCE = (env.VITE_AUTH0_AUDIENCE || '').trim();

export const API_BASE = '/api/mi-sml'; // la API privada propia (netlify/functions/mi-sml-me.mjs): el único destino de datos de este archivo
const RUTA = '/mi-sml';                // única ruta de MI SML: la identidad sale de la sesión, nunca de la URL

export const isAuthConfigured = () => Boolean(DOMAIN && CLIENT_ID);

// Error tipado: la interfaz distingue qué ha pasado sin interpretar textos ni mostrar detalles técnicos.
//   'auth-not-configured' → faltan VITE_AUTH0_DOMAIN / VITE_AUTH0_CLIENT_ID
//   'auth-failed'         → el proveedor devolvió un error (acceso denegado, red, configuración del tenant…)
//   'unauthenticated'     → no hay sesión válida
//   'forbidden'           → sesión válida, pero la API no autoriza a esta persona (403)
//   'api-not-configured'  → falta VITE_AUTH0_AUDIENCE: no se puede pedir un token para la API
//   'request-failed'      → la API no respondió como se esperaba (red, 404, 5xx…); sin detalles técnicos
//   'not-connected'       → sesión válida reconocida por la API, pero la API todavía no tiene fuente de datos (PASO 4)
export class ClientApiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'ClientApiError';
    this.code = code;
  }
}

// ---- Cliente de Auth0: una sola instancia, creada una sola vez (también bajo React.StrictMode) ------------------------------------
let ready = null; // Promise<Auth0Client>

// ¿Venimos de la redirección de Auth0? (?code=…&state=… o ?error=…&state=…)
const volvemosDeAuth0 = () => {
  const q = new URLSearchParams(window.location.search);
  return q.has('state') && (q.has('code') || q.has('error'));
};
// Limpia los parámetros de la redirección (código de un solo uso) sin crear entrada de historial.
const limpiarUrl = () => { try { window.history.replaceState({}, '', RUTA); } catch { /* sin History API */ } };

function iniciar() {
  if (!isAuthConfigured()) return Promise.reject(new ClientApiError('auth-not-configured'));
  if (!ready) {
    ready = (async () => {
      // El SDK se descarga solo aquí: la web pública y la entrada sin configurar no cargan nada de Auth0.
      const { createAuth0Client } = await import('@auth0/auth0-spa-js');
      const client = await createAuth0Client({
        domain: DOMAIN,
        clientId: CLIENT_ID,
        cacheLocation: 'memory',
        authorizationParams: { redirect_uri: `${window.location.origin}${RUTA}`, ...(AUDIENCE ? { audience: AUDIENCE } : null) },
      });
      if (volvemosDeAuth0()) {
        try { await client.handleRedirectCallback(); } finally { limpiarUrl(); }
      } else {
        try { await client.checkSession(); } catch { /* sin sesión previa: es el caso normal de un visitante nuevo */ }
      }
      return client;
    })().catch((e) => { ready = null; throw (e instanceof ClientApiError ? e : new ClientApiError('auth-failed')); });
  }
  return ready;
}

// Estado de sesión: { authenticated: boolean }. Sin configuración devuelve false (no es un error: el acceso aún no está activo).
// Lanza ClientApiError('auth-failed') si el proveedor falla: la interfaz lo muestra como estado de error.
export async function getSession() {
  if (!isAuthConfigured()) return { authenticated: false };
  const client = await iniciar();
  return { authenticated: await client.isAuthenticated() };
}

// Acceso: redirige a Universal Login de Auth0 (la persona escribe sus credenciales allí, nunca en SML).
export async function signIn() {
  const client = await iniciar();
  try { await client.loginWithRedirect(); } catch { throw new ClientApiError('auth-failed'); }
}

// Salida: cierra la sesión en Auth0 y vuelve a /mi-sml. Sin configuración no hay nada que cerrar.
export async function signOut() {
  if (!isAuthConfigured()) return;
  const client = await iniciar();
  await client.logout({ logoutParams: { returnTo: `${window.location.origin}${RUTA}` } });
}

// Vigilancia de la sesión: avisa (onEnded) cuando la sesión termina — caducada o cerrada desde otra pestaña — al volver a la pestaña y cada 5 min.
// Devuelve la función que la detiene. Las pestañas ocultas no consultan nada.
export function watchSession(onEnded) {
  if (!isAuthConfigured()) return () => {};
  let parado = false;
  const comprobar = async () => {
    if (parado || document.visibilityState !== 'visible') return;
    try {
      const client = await iniciar();
      await client.getTokenSilently(); // usa el token en memoria; si caducó pide uno nuevo a Auth0 (falla con login_required si la sesión terminó)
    } catch (e) {
      if (!parado && ['login_required', 'consent_required', 'missing_refresh_token'].includes(e?.error)) onEnded();
    }
  };
  document.addEventListener('visibilitychange', comprobar);
  const id = window.setInterval(comprobar, 5 * 60 * 1000);
  return () => { parado = true; document.removeEventListener('visibilitychange', comprobar); window.clearInterval(id); };
}

// Token de acceso para la API privada: se envía en la cabecera Authorization y la función lo valida con las claves públicas de Auth0.
// Nunca se persiste (el SDK lo mantiene en memoria) y nunca va en la URL.
export async function getAccessToken() {
  if (!AUDIENCE) throw new ClientApiError('api-not-configured');
  const client = await iniciar();
  try { return await client.getTokenSilently(); } catch { throw new ClientApiError('unauthenticated'); }
}

// Datos de la persona autenticada. UNA sola petición: GET /api/mi-sml/me, sin parámetros. Quién es la persona lo decide el servidor por el token;
// aquí no existe forma de pedir «otro cliente». Sin sesión, falla: nunca devuelve datos de otra persona ni datos de ejemplo.
export async function getCurrentClient() {
  const session = await getSession();
  if (!session.authenticated) throw new ClientApiError('unauthenticated');
  const token = await getAccessToken();

  let res;
  try {
    res = await fetch(`${API_BASE}/me`, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store', credentials: 'omit' });
  } catch { throw new ClientApiError('request-failed'); }

  if (res.status === 401) throw new ClientApiError('unauthenticated'); // sin sesión, inválida o caducada: la interfaz vuelve a la entrada privada
  if (res.status === 403) throw new ClientApiError('forbidden');
  if (!res.ok) throw new ClientApiError('request-failed');

  let body = null;
  try { body = await res.json(); } catch { /* respuesta que no es JSON (p. ej. la web en lugar de la API) */ }
  if (body?.session !== 'valid') throw new ClientApiError('request-failed');
  if (body.data === 'connected' && body.client) return body.client; // PASO 4: los datos de ESTA persona, tal como los entrega la API
  throw new ClientApiError('not-connected'); // la API reconoce la sesión, pero todavía no hay fuente de datos
}
