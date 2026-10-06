// API privada de MI SML — Netlify Functions. Ruta pública: GET /api/mi-sml/me (ver netlify.toml). Lógica en server/miSml.js.
// Valida la sesión de Auth0 y identifica a la persona por su token. Todavía SIN fuente de datos (PASO 4): no hay Airtable aquí.
import { atender, cabeceras } from '../../server/miSml.js';
import { configurado, crearVerificador } from '../../server/miSmlAuth.js';

let verify = null; // una sola instancia por contenedor (conserva el JWKS en caché)

const responder = (r) => new Response(JSON.stringify(r.body), { status: r.status, headers: cabeceras(r.headers) });

export default async (req) => {
  try {
    if (!configurado()) {
      console.error('mi-sml: faltan AUTH0_DOMAIN / AUTH0_AUDIENCE en las variables de entorno del servidor');
      return responder({ status: 500, body: { error: 'internal' } });
    }
    verify ||= crearVerificador();
    return responder(await atender(
      { method: req.method, pathname: new URL(req.url).pathname, authorization: req.headers.get('authorization') },
      { verify },
    ));
  } catch (err) {
    console.error('mi-sml: error interno', err?.name || 'desconocido');
    return responder({ status: 500, body: { error: 'internal' } });
  }
};
