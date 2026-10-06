// API de demanda grupal (Netlify Functions + Netlify Blobs). Ruta pública: /api/grupos (ver netlify.toml).
//   GET                → demanda AGREGADA (sin datos personales).
//   POST               → registra una solicitud.
//   GET  ?vista=admin  → solicitudes con contacto. Requiere cabecera x-sml-admin = SML_ADMIN_TOKEN.
//   PUT  (admin)       → { clave, confirmado: true|false } marca/desmarca «grupo confirmado por SML».
import { getStore } from '@netlify/blobs';
import { agregar, registrar } from '../../server/demand.js';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  const store = getStore('sml-grupos');
  const almacen = {
    leer: async () => (await store.get('solicitudes', { type: 'json' })) ?? [],
    escribir: (r) => store.setJSON('solicitudes', r),
  };
  const leerConf = async () => (await store.get('confirmados', { type: 'json' })) ?? [];
  const token = process.env.SML_ADMIN_TOKEN;
  const esAdmin = !!token && req.headers.get('x-sml-admin') === token;
  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      if (url.searchParams.get('vista') === 'admin') {
        if (!esAdmin) return json(401, { error: 'No autorizado.' });
        return json(200, { solicitudes: await almacen.leer(), confirmados: await leerConf() });
      }
      return json(200, agregar(await almacen.leer(), await leerConf()));
    }
    if (req.method === 'POST') {
      const r = await registrar(await req.json().catch(() => null), almacen);
      return json(r.status, r.cuerpo);
    }
    if (req.method === 'PUT') {
      if (!esAdmin) return json(401, { error: 'No autorizado.' });
      const { clave, confirmado } = await req.json();
      const set = new Set(await leerConf());
      confirmado ? set.add(clave) : set.delete(clave);
      await store.setJSON('confirmados', [...set]);
      return json(200, { ok: true });
    }
    return json(405, { error: 'Método no permitido.' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'No se pudo procesar la solicitud.' });
  }
};
