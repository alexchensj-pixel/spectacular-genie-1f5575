// Pruebas de la API privada de MI SML (sin red, sin jose, sin Airtable). Ejecutar: npm run test:mi-sml   (node --test, sin dependencias)
// El verificador es un doble de prueba: comprueba la LÓGICA de autorización e identidad. La verificación criptográfica real del token la hace `jose`
// en server/miSmlAuth.js y solo se puede comprobar con un tenant de Auth0 real (ver README).
import test from 'node:test';
import assert from 'node:assert/strict';
import { atender, tokenDe, sinFuenteDeDatos, RUTA_ME } from './miSml.js';

const silencio = () => {};
// Tokens de prueba: «A» y «B» son dos personas distintas; «caducado» y «roto» simulan sesiones no válidas; «caido» simula un fallo del proveedor.
const verify = async (t) => {
  if (t === 'tokenA') return { sub: 'auth0|A' };
  if (t === 'tokenB') return { sub: 'auth0|B' };
  if (t === 'caducado') throw { kind: 'expired' };
  if (t === 'roto') throw { kind: 'invalid' };
  throw { kind: 'unavailable', code: 'ERR_JWKS_TIMEOUT' };
};
const pet = (extra = {}) => ({ method: 'GET', pathname: RUTA_ME, authorization: 'Bearer tokenA', ...extra });
const deps = (extra = {}) => ({ verify, log: silencio, ...extra });

test('CASO A · sin cabecera Authorization → 401 y ninguna consulta a la fuente de datos', async () => {
  let consultas = 0;
  const fuente = { async obtener() { consultas++; return { estado: 'connected', client: { secreto: true } }; } };
  for (const authorization of [undefined, '', 'Bearer', 'Basic abc', 'Bearer ', 'tokenA']) {
    const r = await atender(pet({ authorization }), deps({ fuente }));
    assert.equal(r.status, 401); assert.deepEqual(r.body, { error: 'unauthenticated' });
  }
  assert.equal(consultas, 0);
});

test('sesión caducada o no válida → 401 distinguible, sin detalles internos', async () => {
  const exp = await atender(pet({ authorization: 'Bearer caducado' }), deps());
  const inv = await atender(pet({ authorization: 'Bearer roto' }), deps());
  assert.deepEqual([exp.status, exp.body], [401, { error: 'session-expired' }]);
  assert.deepEqual([inv.status, inv.body], [401, { error: 'invalid-session' }]);
  assert.equal(exp.headers['www-authenticate'], 'Bearer');
});

test('CASO B · sesión válida → 200 técnico y mínimo: sin identidad ni datos de cliente', async () => {
  const r = await atender(pet(), deps());
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { session: 'valid', data: 'not-connected' });
  assert.equal(JSON.stringify(r.body).includes('auth0|'), false);
});

test('CASO C · la identidad sale SOLO del token: la URL no la cambia (ni siquiera existe como entrada)', async () => {
  const vistas = [];
  const fuente = { async obtener(identidad) { vistas.push(identidad); return { estado: 'not-connected' }; } };
  // Una petición con ?cliente=B&id=B en la URL: `atender` no recibe la query; solo el método, la ruta y la cabecera Authorization.
  await atender(pet({ query: '?cliente=B&id=auth0|B', search: '?cliente=B', cliente: 'auth0|B', id: 'auth0|B', body: { sub: 'auth0|B' } }), deps({ fuente }));
  await atender(pet({ authorization: 'Bearer tokenB' }), deps({ fuente }));
  assert.deepEqual(vistas, [{ sub: 'auth0|A' }, { sub: 'auth0|B' }]); // cada persona, solo la suya; y la fuente solo recibe { sub }
});

test('el token válido sin «sub» no identifica a nadie → 401', async () => {
  const r = await atender(pet(), deps({ verify: async () => ({}) }));
  assert.equal(r.status, 401);
});

test('403 cuando la fuente (PASO 4) dice que esa persona no tiene acceso', async () => {
  const r = await atender(pet(), deps({ fuente: { async obtener() { return { estado: 'forbidden' }; } } }));
  assert.deepEqual([r.status, r.body], [403, { error: 'forbidden' }]);
});

test('500 controlado: ni el fallo del proveedor ni el de la fuente filtran detalles', async () => {
  const logs = [];
  const log = (...a) => logs.push(a.join(' '));
  const r1 = await atender(pet({ authorization: 'Bearer caido' }), { verify, log });
  const r2 = await atender(pet(), { verify, log, fuente: { async obtener() { throw new Error('secreto-interno token=abc'); } } });
  for (const r of [r1, r2]) { assert.deepEqual([r.status, r.body], [500, { error: 'internal' }]); }
  assert.equal(logs.some((l) => l.includes('secreto-interno') || l.includes('abc')), false); // el log tampoco recibe mensajes ni tokens
});

test('404 para otra ruta de /api/mi-sml/ · 405 para métodos distintos de GET', async () => {
  assert.equal((await atender(pet({ pathname: '/api/mi-sml/clientes' }), deps())).status, 404);
  assert.equal((await atender(pet({ pathname: '/api/mi-sml/me/otro' }), deps())).status, 404);
  const m = await atender(pet({ method: 'POST' }), deps());
  assert.deepEqual([m.status, m.headers.allow], [405, 'GET']);
});

test('tokenDe: solo «Bearer <token>» bien formado', () => {
  assert.equal(tokenDe('Bearer a.b.c'), 'a.b.c');
  assert.equal(tokenDe('bearer a.b.c'), null);
  assert.equal(tokenDe('Bearer a b'), null);
  assert.equal(tokenDe(null), null);
});

test('sin fuente de datos (hoy) → «not-connected», nunca datos inventados', async () => {
  assert.deepEqual(await sinFuenteDeDatos.obtener({ sub: 'x' }), { estado: 'not-connected' });
});
