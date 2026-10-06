import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { agregar, registrar } from './server/demand.js';
import { atender, cabeceras } from './server/miSml.js';
import { configurado, crearVerificador } from './server/miSmlAuth.js';

// Solo `npm run dev`: API de demanda EN MEMORIA con la misma lógica que la función de Netlify (server/demand.js).
// Empieza vacía y se pierde al reiniciar. No carga datos de ejemplo. En producción se usa netlify/functions/grupos.mjs.
const devGrupos = () => {
  let registros = [];
  const almacen = { leer: async () => registros, escribir: async (r) => { registros = r; } };
  const send = (res, status, data) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)); };
  return {
    name: 'sml-dev-grupos',
    configureServer(server) {
      server.middlewares.use('/api/grupos', (req, res) => {
        if (req.method === 'GET') return send(res, 200, agregar(registros));
        if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', async () => {
          let body = null; try { body = JSON.parse(raw); } catch { /* inválido */ }
          const r = await registrar(body, almacen);
          send(res, r.status, r.cuerpo);
        });
      });
    },
  };
};

// Solo `npm run dev`: la API privada de MI SML (GET /api/mi-sml/me) con EXACTAMENTE la misma lógica que la función de Netlify
// (server/miSml.js + server/miSmlAuth.js). Lee AUTH0_DOMAIN / AUTH0_AUDIENCE de .env.local (variables del servidor, sin prefijo VITE_).
// Sin fuente de datos (PASO 4) y sin Airtable. Los errores internos devuelven 500 genérico.
const devMiSml = () => {
  let env = {};
  let verify = null;
  return {
    name: 'sml-dev-mi-sml',
    configResolved(config) { env = loadEnv(config.mode, config.root, ''); },
    configureServer(server) {
      server.middlewares.use('/api/mi-sml', async (req, res) => {
        const send = (r) => { res.statusCode = r.status; Object.entries(cabeceras(r.headers)).forEach(([k, v]) => res.setHeader(k, v)); res.end(JSON.stringify(r.body)); };
        try {
          if (!configurado(env)) { console.error('mi-sml: faltan AUTH0_DOMAIN / AUTH0_AUDIENCE (.env.local)'); return send({ status: 500, body: { error: 'internal' } }); }
          verify ||= crearVerificador(env);
          const pathname = `/api/mi-sml${(req.url || '/').split('?')[0]}`;
          send(await atender({ method: req.method, pathname, authorization: req.headers.authorization }, { verify }));
        } catch (err) {
          console.error('mi-sml: error interno', err?.name || 'desconocido');
          send({ status: 500, body: { error: 'internal' } });
        }
      });
    },
  };
};

// Fuente única del rating: site.rating en src/Data/Content.js. Se inyecta en el JSON-LD de index.html
// (aggregateRating). Se lee el texto del archivo (Content.js importa imágenes y no se puede cargar en Node).
const ratingJsonLd = () => ({
  name: 'sml-rating-jsonld',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      const src = readFileSync(new URL('./src/Data/Content.js', import.meta.url), 'utf8');
      const m = src.match(/rating:\s*\{\s*valor:\s*'([^']+)'\s*,\s*resenas:\s*(\d+)/);
      if (!m) throw new Error('sml-rating-jsonld: no se pudo leer site.rating (valor/resenas) en src/Data/Content.js');
      return html.replace(/__SML_RATING_VALUE__/g, m[1]).replace(/__SML_RATING_COUNT__/g, m[2]);
    },
  },
});

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), devGrupos(), devMiSml(), ratingJsonLd()],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.ktx2'],
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          gsap: ['gsap'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 5173),
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 5173),
    strictPort: true,
    allowedHosts: true,
  },
});
