// NÚCLEO DE DEMANDA GRUPAL — lógica única y sin dependencias, compartida por la función de Netlify y por el servidor de desarrollo.
// No hay datos de ejemplo aquí: sin solicitudes guardadas, la demanda es vacía.
// Privacidad: `agregar()` es lo ÚNICO que sale hacia el público. Nunca incluye nombre ni contacto.

export const CAPACIDAD = 4;
export const ZONAS = ['centro','chamberi','salamanca','retiro','moncloa','tetuan','chamartin','prosperidad','ventas','ciudad-lineal','hortaleza','fuencarral','arganzuela','latina','carabanchel','usera','vallecas','moratalaz'];
export const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
export const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`); // 07:00 – 21:00
export const FRECUENCIAS = [1, 2, 3];

// Clave de compatibilidad: barrio + día + franja horaria + frecuencia. Nada más.
export const claveDe = (c) => [c.zona, c.dia, c.hora, c.frecuencia].join('|');

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, '');
export const idPersona = (contacto) => norm(contacto); // solo para evitar duplicados; nunca se expone

export function validar(body) {
  const e = (m) => ({ ok: false, error: m });
  if (!body || typeof body !== 'object') return e('Solicitud no válida.');
  if (body.web) return e('Solicitud no válida.'); // honeypot
  const nombre = String(body.nombre ?? '').trim().slice(0, 80);
  const contacto = String(body.contacto ?? '').trim().slice(0, 120);
  if (nombre.length < 2) return e('Indica tu nombre.');
  const esMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto);
  const esTel = /^\+?[\d\s().-]{9,16}$/.test(contacto);
  if (!esMail && !esTel) return e('Indica un teléfono o un email válido.');
  if (body.consentimiento !== true) return e('Necesitamos tu consentimiento para contactarte.');
  if (!ZONAS.includes(body.zona)) return e('Barrio no válido.');
  const dias = [...new Set(Array.isArray(body.dias) ? body.dias : [body.dia])].filter((d) => DIAS.includes(d));
  if (!dias.length) return e('Elige al menos un día.');
  if (!HORAS.includes(body.hora)) return e('Franja horaria no válida.');
  const frecuencia = Number(body.frecuencia);
  if (!FRECUENCIAS.includes(frecuencia)) return e('Frecuencia no válida.');
  return { ok: true, valor: { nombre, contacto, zona: body.zona, dias, hora: body.hora, frecuencia } };
}

// Una solicitud (envío) puede cubrir varios días: genera un registro por combinación, todos con el mismo `envio`.
// Estado del registro: 'pendiente' (recibida, sin validar por SML).
export function crearRegistros(v, ahora = new Date()) {
  const envio = `${ahora.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return v.dias.map((dia) => ({
    envio, persona: idPersona(v.contacto), nombre: v.nombre, contacto: v.contacto,
    zona: v.zona, dia, hora: v.hora, frecuencia: v.frecuencia,
    fecha: ahora.toISOString(), estado: 'pendiente',
  }));
}

// Devuelve solo los registros que NO duplican a la misma persona en la misma combinación.
export const sinDuplicados = (nuevos, existentes) => {
  const vistos = new Set(existentes.map((r) => `${claveDe(r)}#${r.persona}`));
  return nuevos.filter((r) => !vistos.has(`${claveDe(r)}#${r.persona}`));
};

// AGREGACIÓN PÚBLICA. `confirmados` = claves que SML ha validado (no se deduce del contador: 4/4 ≠ confirmado).
export function agregar(registros, confirmados = []) {
  const conf = new Set(confirmados);
  const mapa = new Map();
  for (const r of registros) {
    if (r.estado === 'descartada') continue;
    const k = claveDe(r);
    const g = mapa.get(k) ?? { zona: r.zona, dia: r.dia, hora: r.hora, frecuencia: r.frecuencia, solicitudes: 0 };
    g.solicitudes += 1;
    mapa.set(k, g);
  }
  const combinaciones = [...mapa.entries()].map(([k, g]) => ({
    ...g,
    capacidad: CAPACIDAD,
    estado: conf.has(k) ? 'confirmado' : g.solicitudes >= CAPACIDAD ? 'completo' : 'abierto', // completo = 4/4 solicitudes, pendiente de SML
  }));
  combinaciones.sort((a, b) => b.solicitudes - a.solicitudes || DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.hora.localeCompare(b.hora));
  return { combinaciones, actualizado: new Date().toISOString() };
}

// Alta completa con cualquier almacén { leer(): registros[], escribir(registros[]) }.
export async function registrar(body, almacen) {
  const val = validar(body);
  if (!val.ok) return { status: 400, cuerpo: { error: val.error } };
  const existentes = await almacen.leer();
  const nuevos = sinDuplicados(crearRegistros(val.valor), existentes);
  if (!nuevos.length) return { status: 409, cuerpo: { error: 'Ya tienes una solicitud para esa combinación.' } };
  await almacen.escribir([...existentes, ...nuevos]);
  return { status: 201, cuerpo: { ok: true, registradas: nuevos.length } };
}
