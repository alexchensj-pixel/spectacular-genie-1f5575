import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, MODULES, moduleX } from './machineSpec.js';

// Geometría 3D real de la máquina, fusionada POR MATERIAL (pocas llamadas de dibujo, importa en móvil).
// Todo son sólidos: extrusiones de perfiles angulares, prismas achaflanados y cilindros. Nada de texturas planas
// haciendo de volumen. Devuelve { graphite, graphiteDark, plate, steel, aluminum, glass, light, roller }.
const KEEP = ['position', 'normal', 'uv'];
function flat(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  Object.keys(g.attributes).forEach((k) => { if (!KEEP.includes(k)) g.deleteAttribute(k); });
  return g;
}
const merge = (list) => mergeGeometries(list.map(flat));

const poly = (pts) => {
  const s = new Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
};
const extrude = (pts, depth, bevel = 0) =>
  new ExtrudeGeometry(poly(pts), {
    depth, curveSegments: 1, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1,
  });
const box = (w, h, d, x, y, z) => new BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (r, h, y, x = 0, z = 0, seg = 48) => new CylinderGeometry(r, r, h, seg).translate(x, y + h / 2, z);

// Prisma de planta cuadrada con esquinas achaflanadas (y de 0 a h, centrado en x/z).
function prism(w, d, c, h) {
  const a = w / 2, b = d / 2;
  return extrude(
    [[-a + c, -b], [a - c, -b], [a, -b + c], [a, b - c], [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c]],
    h
  ).rotateX(-Math.PI / 2);
}

// Bastidor: planta con las esquinas delanteras achaflanadas (facetas angulares). Un tramo vertical y otro con el frente
// inclinado hacia atrás (`lean`): todos los vértices delanteros (z > 0) se desplazan lo mismo, así cada cara sigue plana.
const PLAN = [[-1.6, -0.3], [1.6, -0.3], [1.6, 0.15], [1.45, 0.3], [-1.45, 0.3], [-1.6, 0.15]];
function plinthPart(y0, h, lean) {
  const g = new ExtrudeGeometry(poly(PLAN.map(([x, z]) => [x, -z])), { depth: h, curveSegments: 1, bevelEnabled: false })
    .rotateX(-Math.PI / 2); // y = 0..h, z = z de planta
  if (lean) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0.001) p.setZ(i, p.getZ(i) - lean * (p.getY(i) / h));
  }
  g.translate(0, y0, 0);
  g.computeVertexNormals(); // no indexada → normales planas por cara
  return g;
}

// Lateral (torre): perfil frontal inclinado hacia dentro, con el canto superior cortado. side = +1 derecha · -1 izquierda.
function wing(side) {
  const pts = [[1.36, 0.3], [1.596, 0.3], [1.596, 0.56], [1.52, 0.64], [1.49, 1.34], [1.44, 1.48], [1.36, 1.48]]
    .map(([x, y]) => [x * side, y]);
  const bv = 0.004;
  return extrude(pts, 0.5 - 2 * bv, bv).translate(0, 0, -0.3 + bv);
}

// Aleta separadora entre módulos (perfil z–y, grosor 0,05 a lo largo de x).
function fin(x) {
  return extrude([[-0.2, M.plinthTop], [0.13, M.plinthTop], [0.13, 0.92], [0.03, 1.04], [-0.2, 1.04]], 0.05)
    .rotateY(-Math.PI / 2).translate(x + 0.025, 0, 0);
}

// Rodillo (centrado en 0, eje vertical): eje central, tambor, bridas, aros mecanizados y bujes. Se reutiliza en los 5.
function buildRoller() {
  const H = M.rollerH, R = M.rollerR;
  const graphite = [cyl(R, H, -H / 2, 0, 0, 64)];
  const steel = [
    cyl(0.014, M.module.glass, -M.module.glass / 2, 0, 0, 24),           // eje central
    cyl(R + 0.02, 0.016, H / 2, 0, 0, 64), cyl(R + 0.02, 0.016, -H / 2 - 0.016, 0, 0, 64), // bridas
    cyl(0.06, 0.06, H / 2 + 0.016, 0, 0, 40), cyl(0.06, 0.06, -H / 2 - 0.076, 0, 0, 40),   // bujes
  ];
  const aluminum = [];
  for (let k = -3; k <= 3; k++) aluminum.push(cyl(R + 0.0015, 0.004, k * 0.04 - 0.002, 0, 0, 64)); // aros de detente
  return { graphite: merge(graphite), steel: merge(steel), aluminum: merge(aluminum) };
}

export function buildMachine() {
  const g = { graphite: [], graphiteDark: [], plate: [], steel: [], aluminum: [], glass: [], light: [] };
  const yb = M.plinthTop;
  const { y0, lean } = M.slope;

  // — Bastidor inferior —
  g.graphite.push(plinthPart(M.foot, y0 - M.foot, 0), plinthPart(y0, yb - y0, lean));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.graphiteDark.push(cyl(0.03, M.foot, 0, sx * 1.35, sz * 0.2, 24));
  // Placa central del frente (sigue la inclinación) y filetes de luz en los chaflanes
  const a = Math.atan(lean / (yb - y0));
  const plateH = 0.2, midY = (y0 + yb) / 2, midZ = 0.3 - lean / 2;
  g.plate.push(
    new BoxGeometry(1.9, plateH, 0.012).rotateX(-a).translate(0, midY + 0.006 * Math.sin(a), midZ + 0.006 * Math.cos(a))
  );
  for (const s of [-1, 1]) {
    // chaflán delantero: normal a 45° en planta; el filete es una diagonal fina sobre su cara
    const stripe = new BoxGeometry(0.006, 0.11, 0.004).rotateZ(-s * 0.55).rotateY(s * Math.PI / 4);
    g.light.push(stripe.translate(s * (1.525 + 0.0021), 0.245, 0.18 + 0.0021));
  }

  // — Laterales (torres) con corte oscuro y filete de luz en el hombro —
  for (const s of [-1, 1]) {
    g.graphite.push(wing(s));
    g.graphiteDark.push(box(0.03, 0.62, 0.008, s * 1.435, 0.98, 0.204));
    g.light.push(box(0.007, 0.13, 0.004, s * 1.535, 0.47, 0.207));
  }

  // — Trasera trapezoidal y aletas separadoras —
  g.graphiteDark.push(extrude([[-1.36, yb - 0.02], [1.36, yb - 0.02], [1.3, 1.22], [-1.3, 1.22]], 0.1).translate(0, 0, -0.3));
  for (const x of [-0.84, -0.28, 0.28, 0.84]) g.graphite.push(fin(x));

  // — Cinco módulos —
  const { collar, glass, head, total } = M.module;
  const tube = new CylinderGeometry(M.glassR, M.glassR, glass - 0.02, 64, 1, true);
  MODULES.forEach((_, i) => {
    const x = moduleX(i);
    // collar inferior: brida, cuello mecanizado, aro de asiento y placa de apoyo
    g.graphite.push(cyl(0.205, 0.055, yb, x, 0), cyl(0.19, 0.05, yb + 0.095, x, 0));
    g.steel.push(cyl(0.165, 0.04, yb + 0.055, x, 0));
    g.aluminum.push(cyl(0.175, 0.02, yb + 0.145, x, 0));
    g.graphiteDark.push(cyl(0.18, 0.035, yb + 0.165, x, 0));
    // marco de la ventana: cuatro montantes + tubo de vidrio (única zona acristalada) + filete de luz a la izquierda
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.graphite.push(box(0.03, glass, 0.03, x + sx * 0.16, yb + collar + glass / 2, sz * 0.16));
    g.glass.push(tube.clone().translate(x, yb + collar + glass / 2, 0));
    g.light.push(box(0.006, 0.5, 0.004, x - 0.16, yb + collar + glass / 2, 0.178));
    // cabeza: bloque achaflanado, junta oscura inferior y cuatro tornillos en el frente
    const hy = yb + collar + glass;
    g.graphite.push(prism(M.head.w, M.head.d, M.head.chamfer, head).translate(x, hy, 0));
    g.graphiteDark.push(box(M.head.w + 0.004, 0.008, M.head.d + 0.004, x, hy + 0.004, 0));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      g.steel.push(new CylinderGeometry(0.007, 0.007, 0.006, 6).rotateX(Math.PI / 2).translate(x + sx * 0.135, hy + head / 2 + sy * 0.13, M.head.d / 2 + 0.002));
    }
    // remate: tres anillos escalonados y tapa
    const ty = hy + head;
    g.steel.push(cyl(0.205, 0.03, ty, x, 0));
    g.graphite.push(cyl(0.19, 0.05, ty + 0.03, x, 0));
    g.aluminum.push(cyl(0.175, 0.022, ty + 0.08, x, 0));
    g.graphiteDark.push(cyl(0.06, total - (collar + glass + head + 0.102) , ty + 0.102, x, 0, 32));
  });

  const out = {};
  for (const k of Object.keys(g)) out[k] = merge(g[k]);
  out.roller = buildRoller();
  return out;
}

export function disposeMachine(geo) {
  Object.entries(geo).forEach(([k, v]) => (k === 'roller' ? Object.values(v).forEach((x) => x.dispose()) : v.dispose()));
}
