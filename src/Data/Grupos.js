// GRUPALES · buscador de grupos. Etiquetas y geometría del mapa. NO contiene demanda: la demanda solo viene de la API (gruposApi.js).
// Las claves (zonas, días, horas, frecuencias) coinciden con server/demand.js.
export const grupos = {
  titulo: 'GRUPO REDUCIDO',
  linea: 'Hasta 4 personas · grupos compatibles',
  texto: 'Los grupos se forman por zona, disponibilidad y frecuencia.',
  intro: 'Primero comprobamos si ya existe un grupo compatible contigo. Si no existe, dejas tu disponibilidad y se acumula para formarlo.',
  cta: 'CONSULTAR DISPONIBILIDAD',
  verPlanes: 'Ver precios',
  listaK: 'Grupos que se están formando',
  mapaK: 'Elige tu barrio',
  mapaAyuda: 'Madrid por zonas. Solo se muestran solicitudes agregadas, nunca personas.',
  vacioZona: 'Todavía no hay ningún grupo formándose aquí. Deja tu disponibilidad y se acumulará con otras personas compatibles hasta poder formarlo.',
  noHorarioT: '¿No encuentras tu horario?',
  noHorario: 'Indica tu barrio, disponibilidad y frecuencia. Tu solicitud se acumulará con otras personas compatibles hasta formar un grupo.',
  proponer: 'PROPONER MI DISPONIBILIDAD',
  unirme: 'UNIRME A ESTE GRUPO',
  espera: 'APUNTARME EN LISTA DE ESPERA',
  aviso: 'Registrar tu solicitud no confirma el grupo. SML lo valida y te contacta antes de concretar el plan.',
  privacidad: 'Tus datos son privados: nunca aparecen en el mapa. Solo los usa SML para contactarte.',
  consent: 'Acepto que SML use mis datos para contactarme sobre este grupo. Más información en la',
  consentEnlace: 'Política de Privacidad',
  consentError: 'Necesitamos tu consentimiento para contactarte. Marca la casilla para continuar.',
  errorCarga: 'No se pudo consultar la demanda ahora mismo.',
  reintentar: 'Reintentar',
};

export const ZONAS = [
  { id: 'centro', nombre: 'Centro', x: -0.6, y: 0.2 }, { id: 'chamberi', nombre: 'Chamberí', x: -0.4, y: -1.8 },
  { id: 'salamanca', nombre: 'Salamanca', x: 2.2, y: -0.6 }, { id: 'retiro', nombre: 'Retiro', x: 1.4, y: 1.3 },
  { id: 'moncloa', nombre: 'Moncloa', x: -3.0, y: -1.0 }, { id: 'tetuan', nombre: 'Tetuán', x: -0.9, y: -3.5 },
  { id: 'chamartin', nombre: 'Chamartín', x: 1.2, y: -3.9 }, { id: 'prosperidad', nombre: 'Prosperidad', x: 2.7, y: -2.3 },
  { id: 'ventas', nombre: 'Ventas', x: 4.0, y: -0.7 }, { id: 'ciudad-lineal', nombre: 'Ciudad Lineal', x: 4.6, y: -2.7 },
  { id: 'hortaleza', nombre: 'Hortaleza', x: 3.6, y: -4.8 }, { id: 'fuencarral', nombre: 'Fuencarral', x: -1.6, y: -5.4 },
  { id: 'arganzuela', nombre: 'Arganzuela', x: 0.1, y: 2.5 }, { id: 'latina', nombre: 'Latina', x: -3.6, y: 1.8 },
  { id: 'carabanchel', nombre: 'Carabanchel', x: -3.0, y: 4.0 }, { id: 'usera', nombre: 'Usera', x: -0.7, y: 4.7 },
  { id: 'vallecas', nombre: 'Vallecas', x: 2.7, y: 3.9 }, { id: 'moratalaz', nombre: 'Moratalaz', x: 5.2, y: 1.6 },
];
export const zonaNombre = (id) => ZONAS.find((z) => z.id === id)?.nombre ?? id;

export const DIAS = [
  ['lunes', 'Lunes', 'L'], ['martes', 'Martes', 'M'], ['miercoles', 'Miércoles', 'X'], ['jueves', 'Jueves', 'J'],
  ['viernes', 'Viernes', 'V'], ['sabado', 'Sábado', 'S'], ['domingo', 'Domingo', 'D'],
];
export const diaNombre = (id) => DIAS.find((d) => d[0] === id)?.[1] ?? id;
export const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);
export const FRECUENCIAS = [[1, '1 día/semana'], [2, '2 días/semana'], [3, '3 días/semana']];
export const frecuenciaNombre = (n) => `${n} ${n === 1 ? 'día' : 'días'}/semana`;

// ---- Geometría del mapa: cada barrio = territorio de Voronoi recortado por un contorno tipo M-30. Sin datos de personas. ----
const W = 100, H = 100;
const clip = (poly, [nx, ny, c]) => { // conserva el semiplano nx·x + ny·y <= c
  const out = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if (da <= 0) out.push(a);
    if (da * db < 0) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  });
  return out;
};
const sx = (x) => W / 2 + (x - 0.4) * 7.6, sy = (y) => H / 2 + (y + 0.3) * 7.6;
const OUTLINE = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return [50 + Math.cos(a) * 46 * (1 + 0.06 * Math.sin(a * 3)), 50 + Math.sin(a) * 47]; });
const pts = ZONAS.map((z) => [sx(z.x), sy(z.y)]);
export const MAPA = ZONAS.map((z, i) => {
  let poly = OUTLINE;
  pts.forEach((q, j) => {
    if (j === i || poly.length < 3) return;
    const [px, py] = pts[i];
    const nx = q[0] - px, ny = q[1] - py;
    poly = clip(poly, [nx, ny, (nx * (px + q[0]) + ny * (py + q[1])) / 2]);
  });
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return { id: z.id, nombre: z.nombre, d: `M${poly.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`, cx, cy };
});
export const MAPA_VIEWBOX = `0 0 ${W} ${H}`;
