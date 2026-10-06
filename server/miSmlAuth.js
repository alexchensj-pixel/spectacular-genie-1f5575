// MI SML · VALIDACIÓN DE SESIÓN en servidor (Auth0). Verifica el token de acceso con las CLAVES PÚBLICAS del tenant (JWKS): no hay secretos.
// Usa la librería `jose` (estándar, mantenida): no se escribe ninguna criptografía a mano. Solo RS256 (el algoritmo de Auth0).
//
// Variables de entorno del SERVIDOR (Netlify → Environment variables; NO llevan prefijo VITE_, no llegan al navegador):
//   AUTH0_DOMAIN     el MISMO dominio que VITE_AUTH0_DOMAIN (si se usa dominio propio de Auth0, ese; el emisor del token debe coincidir)
//   AUTH0_AUDIENCE   el MISMO identificador de API que VITE_AUTH0_AUDIENCE (la «API» registrada en Auth0 para MI SML)
// No son secretos, pero se leen solo en servidor para que la API no dependa de lo que el navegador diga.

// Normaliza «https://tenant.auth0.com/» → «tenant.auth0.com».
const limpiarDominio = (d) => String(d ?? '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');

// Errores de `jose` → { kind } (sin mensajes internos).
const EXPIRADO = new Set(['ERR_JWT_EXPIRED']);
const INVALIDO = new Set([
  'ERR_JWT_INVALID', 'ERR_JWT_CLAIM_VALIDATION_FAILED', 'ERR_JWS_INVALID', 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JOSE_ALG_NOT_ALLOWED', 'ERR_JWKS_NO_MATCHING_KEY', 'ERR_JWK_INVALID',
]);
export const clasificar = (e) => ({ kind: EXPIRADO.has(e?.code) ? 'expired' : INVALIDO.has(e?.code) ? 'invalid' : 'unavailable', code: e?.code });

export function configurado(env = process.env) {
  return Boolean(limpiarDominio(env.AUTH0_DOMAIN) && String(env.AUTH0_AUDIENCE ?? '').trim());
}

// Devuelve verify(token) → { sub }. El JWKS remoto se cachea dentro de la instancia (jose lo gestiona y rota).
export function crearVerificador(env = process.env) {
  const dominio = limpiarDominio(env.AUTH0_DOMAIN);
  const audience = String(env.AUTH0_AUDIENCE ?? '').trim();
  if (!dominio || !audience) throw new Error('AUTH0_DOMAIN / AUTH0_AUDIENCE no configuradas');
  const issuer = `https://${dominio}/`;
  let jwks = null;
  return async (token) => {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    jwks ||= createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience, algorithms: ['RS256'] });
      return { sub: payload.sub };
    } catch (e) {
      throw clasificar(e);
    }
  };
}
