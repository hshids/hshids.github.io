import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A platter of steamed seafood the way it is eaten at home in Dalian: two mantis shrimp, a swimming
// crab (a "flying crab" in Dalian), clams, sea snails and shrimp, with a little dish of ginger and
// vinegar, on a porcelain plate in a bamboo steamer that rises out of the kitchen pot. All seafood
// shares one vertex-coloured glossy material, so the whole platter costs a handful of draw calls.

const C = {
  shrimp: '#f07f4f', shrimpBelly: '#f8c7a4', mantis: '#d99a86', mantisEdge: '#9a5a62', mantisSpot: '#6a3f7a',
  crab: '#d9502c', crabSpot: '#f08a52', crabBelly: '#f3e4cf', claw: '#c9452a', tip: '#3a2420',
  clam: '#c9b08a', clamBand: '#7a5a3e', meat: '#f1d6a8', snail: '#d8bb92', snailBand: '#8a5a38', aperture: '#f3d7c0',
  eye: '#16110e', ginger: '#f0d58a', vinegar: '#3a1a10', scallion: '#6fae4f',
};

function tint(g, fn) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const solid = color => (v, c) => c.set(color);
const xf = (g, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale)));

// a smooth body swept along a path: radius(t) gives [half width, half height]; colour(t, p, centre, c)
function sweep(points, radius, colour, {segs = 28, radial = 12, up = [0, 1, 0]} = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), U = new THREE.Vector3(...up);
  const pos = [], col = [], idx = [], c = new THREE.Color(), p = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3(), V = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, ctr = curve.getPointAt(t); curve.getTangentAt(t, T);
    S.crossVectors(T, U); if (S.lengthSq() < 1e-6) S.set(1, 0, 0); S.normalize(); V.crossVectors(S, T).normalize();
    const [rw, rh] = radius(t);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2;
      p.copy(ctr).addScaledVector(S, Math.cos(a) * rw).addScaledVector(V, Math.sin(a) * rh);
      pos.push(p.x, p.y, p.z); colour(t, p, ctr, c, Math.sin(a)); col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function createSeafoodPlatter({root, resources, position, low = false}) {
  const own = o => (resources?.add(o), o);
  const group = new THREE.Group(); group.name = 'life-steamed-seafood-platter'; group.position.set(...position); root.add(group);
  const seg = low ? 8 : 12;
  const sea = [], porcelain = [], bamboo = [], cobalt = [];
  const put = (list, g) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k); list.push(n); return n; };
  const local = (parts, pos, rot, s = 1) => parts.forEach(g => { xf(g, pos, rot, [s, s, s]); put(sea, g); });

  // bamboo steamer, porcelain plate with a cobalt rim
  const R = 0.26;
  put(bamboo, new THREE.CylinderGeometry(R, R, 0.07, 32, 1, true));
  put(bamboo, xf(new THREE.TorusGeometry(R, 0.008, 6, 40), [0, 0.035, 0], [Math.PI / 2, 0, 0]));
  put(bamboo, xf(new THREE.TorusGeometry(R, 0.008, 6, 40), [0, -0.035, 0], [Math.PI / 2, 0, 0]));
  for (let i = -6; i <= 6; i++) { const w = Math.sqrt(R * R - (i * 0.038) ** 2) * 2; put(bamboo, xf(new THREE.BoxGeometry(0.026, 0.006, w), [i * 0.038, -0.03, 0])); }
  const plate = new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.2, 0.008], [0.235, 0.022], [0.24, 0.026], [0.236, 0.03], [0.2, 0.016], [0.0, 0.012]].map(p => new THREE.Vector2(...p)), 40);
  put(porcelain, xf(plate, [0, -0.026, 0]));
  put(cobalt, xf(new THREE.TorusGeometry(0.222, 0.0035, 5, 48), [0, 0.0005, 0], [Math.PI / 2, 0, 0]));
  const baseY = -0.012;

  // shrimp: one smooth curled body, segmented by soft ridges, a head with a rostrum, eyes, feelers, legs and a tail fan
  const shrimp = () => {
    const parts = [], arc = [];
    for (let k = 0; k <= 8; k++) { const a = -0.9 + k * 0.5; arc.push([Math.cos(a) * 0.036, 0.016 - k * 0.0009, Math.sin(a) * 0.036]); }
    const orange = new THREE.Color(C.shrimp), belly = new THREE.Color(C.shrimpBelly), dark = new THREE.Color('#c4532e');
    parts.push(sweep(arc, t => { const head = t < 0.28, base = head ? 0.017 + 0.004 * Math.sin(t / 0.28 * Math.PI) : 0.019 * (1 - (t - 0.28) * 1.15), ridge = head ? 1 : 1 + 0.07 * Math.cos((t - 0.28) * 6 / 0.72 * Math.PI * 2); const r = Math.max(0.003, base) * ridge; return [r * 0.95, r * 1.05]; },
      (t, p, ctr, c, side) => { c.copy(side > 0.1 ? orange : belly); if (t > 0.28 && Math.cos((t - 0.28) * 6 / 0.72 * Math.PI * 2) < -0.85 && side > 0) c.copy(dark); if (t < 0.03) c.copy(orange); }, {segs: low ? 24 : 40, radial: low ? 8 : 12}));
    const head = arc[0], tip = arc[8];
    parts.push(tint(xf(new THREE.ConeGeometry(0.004, 0.034, 5), [head[0] + 0.012, head[1] + 0.008, head[2] - 0.018], [-Math.PI / 2 + 0.2, 0, -0.5]), solid(C.shrimp)));
    for (const e of [-1, 1]) {
      parts.push(tint(xf(new THREE.SphereGeometry(0.004, 6, 4), [head[0] + e * 0.008, head[1] + 0.012, head[2] - 0.008]), solid(C.eye)));
      const feel = new THREE.CatmullRomCurve3([[head[0], head[1] + 0.008, head[2] - 0.01], [head[0] + 0.03 + e * 0.012, 0.024, head[2] - 0.06], [head[0] + 0.08 + e * 0.02, 0.012, head[2] - 0.09]].map(q => new THREE.Vector3(...q)));
      parts.push(tint(new THREE.TubeGeometry(feel, 10, 0.0011, 3, false), solid(C.shrimp)));
    }
    for (let k = 0; k < 5; k++) { const q = arc[1 + k]; parts.push(tint(xf(new THREE.CylinderGeometry(0.0013, 0.0013, 0.016, 3), [q[0] * 0.75, 0.003, q[2] * 0.75], [Math.PI / 2, 0, k * 0.4]), solid(C.shrimpBelly))); }
    for (const e of [-0.45, 0, 0.45]) parts.push(tint(xf(new THREE.ConeGeometry(0.009, 0.026, 4), [tip[0] * 0.8, 0.007, tip[2] * 0.8 - 0.004], [Math.PI / 2 - 0.1, 0, Math.PI * 0.55 + e], [1, 1, 0.28]), solid(C.shrimp)));
    return parts;
  };
  // mantis shrimp: a long flat body with segment grooves and spiky edges, a smooth shield, folded
  // raptorial claws, stalked eyes, and a tail fan with two dark spots
  const mantis = () => {
    const parts = [], body = [[0, 0.008, 0.085], [0, 0.011, 0.03], [0, 0.011, -0.03], [0, 0.008, -0.075]];
    const base = new THREE.Color(C.mantis), edge = new THREE.Color(C.mantisEdge), belly = new THREE.Color('#ead2c4');
    const segOf = t => (t - 0.24) / 0.76 * 7;
    parts.push(sweep(body, t => { const w = t < 0.02 ? 0.01 : t > 0.97 ? 0.012 : 0.017 + 0.002 * Math.sin(t * Math.PI), groove = t > 0.24 ? 1 - 0.1 * Math.max(0, Math.cos(segOf(t) * Math.PI * 2)) ** 8 : 1; return [w * groove, 0.0065 * groove]; },
      (t, p, ctr, c, side) => { c.copy(side < -0.2 ? belly : base); if (t > 0.24 && Math.cos(segOf(t) * Math.PI * 2) > 0.8 && side > -0.2) c.copy(edge); if (t < 0.24 && side > 0) c.lerp(new THREE.Color('#f0b8a0'), 0.35); if (Math.abs(p.x - ctr.x) < 0.003 && side > 0.6) c.lerp(edge, 0.5); }, {segs: low ? 30 : 56, radial: low ? 8 : 12}));
    for (let k = 0; k < 7; k++) { const z = 0.085 - (0.24 + (k + 0.5) / 7 * 0.76) * 0.16; for (const e of [-1, 1]) parts.push(tint(xf(new THREE.ConeGeometry(0.0028, 0.011, 4), [e * 0.021, 0.008, z], [0, 0, e * -Math.PI / 2]), solid(C.mantisEdge))); }
    const tz = -0.078;
    parts.push(tint(xf(new THREE.SphereGeometry(1, seg, 6), [0, 0.008, tz - 0.004], [0, 0, 0], [0.015, 0.004, 0.014]), solid(C.mantis)));
    for (const e of [-1, 1]) {
      parts.push(tint(xf(new THREE.SphereGeometry(1, 8, 5), [e * 0.016, 0.007, tz - 0.002], [0, e * 0.5, 0], [0.011, 0.0035, 0.017]), solid(C.mantis)));
      parts.push(tint(xf(new THREE.SphereGeometry(0.0042, 6, 4), [e * 0.007, 0.0115, tz - 0.003]), solid(C.mantisSpot)));
      parts.push(tint(xf(new THREE.CapsuleGeometry(0.0042, 0.034, 3, 6), [e * 0.022, 0.006, 0.07], [Math.PI / 2, e * 0.15, 0]), solid(C.mantis)));
      parts.push(tint(xf(new THREE.CapsuleGeometry(0.003, 0.03, 3, 6), [e * 0.025, 0.007, 0.058], [Math.PI / 2, e * 0.35, 0]), solid(C.mantisEdge)));
      parts.push(tint(xf(new THREE.CylinderGeometry(0.0016, 0.0016, 0.012, 4), [e * 0.006, 0.014, 0.093], [0.6, 0, e * 0.4]), solid(C.mantis)));
      parts.push(tint(xf(new THREE.SphereGeometry(0.0038, 6, 4), [e * 0.009, 0.018, 0.098]), solid(C.eye)));
      for (const f of [0, 1]) { const feel = new THREE.CatmullRomCurve3([[e * 0.004, 0.01, 0.09], [e * (0.015 + f * 0.01), 0.012, 0.125], [e * (0.03 + f * 0.02), 0.006, 0.15]].map(q => new THREE.Vector3(...q))); parts.push(tint(new THREE.TubeGeometry(feel, 6, 0.0009, 3, false), solid(C.mantis))); }
    }
    return parts;
  };
  // swimming crab: a domed shuttle-shaped shell with a long spine either side, claws and paddle legs
  const crab = () => {
    const parts = [];
    const sh = new THREE.Shape(); const pts = [[0, 0.05], [0.02, 0.05], [0.04, 0.042], [0.06, 0.03], [0.085, 0.012], [0.125, 0.004], [0.088, -0.006], [0.062, -0.026], [0.035, -0.045], [0, -0.05]];
    sh.moveTo(...pts[0]); pts.slice(1).forEach(p => sh.lineTo(...p)); pts.slice(0, -1).reverse().forEach(p => sh.lineTo(-p[0], p[1])); sh.closePath();
    const shell = new THREE.ExtrudeGeometry(sh, {depth: 0.01, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.01, bevelSegments: 3, curveSegments: 4});
    shell.rotateX(-Math.PI / 2); const sp = shell.attributes.position;
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), z = sp.getZ(i), y = sp.getY(i); if (y > 0.004) sp.setY(i, y + 0.024 * Math.max(0, 1 - (x * x) / 0.006 - (z * z) / 0.0028)); }
    shell.computeVertexNormals();
    parts.push(tint(shell, (v, c) => { c.set(v.y < 0.002 ? C.crabBelly : C.crab); const spot = Math.sin(v.x * 160) * Math.sin(v.z * 170); if (v.y > 0.012 && spot > 0.7) c.set(C.crabSpot); }));
    for (const e of [-1, 1]) {
      // cheliped: arm, palm with ridges and two dark-tipped fingers
      parts.push(tint(xf(new THREE.CapsuleGeometry(0.007, 0.05, 3, 8), [e * 0.06, 0.006, -0.06], [Math.PI / 2, e * -0.7, 0]), solid(C.claw)));
      parts.push(tint(xf(new THREE.CapsuleGeometry(0.009, 0.04, 3, 8), [e * 0.04, 0.008, -0.105], [Math.PI / 2, e * 0.35, 0]), (v, c) => c.set(C.claw)));
      parts.push(tint(xf(new THREE.ConeGeometry(0.005, 0.035, 6), [e * 0.022, 0.009, -0.137], [-Math.PI / 2, 0, e * -0.4]), (v, c) => c.set(v.z < -0.145 ? C.tip : C.claw)));
      parts.push(tint(xf(new THREE.ConeGeometry(0.004, 0.03, 6), [e * 0.03, 0.006, -0.135], [-Math.PI / 2, 0, e * -0.15]), (v, c) => c.set(v.z < -0.142 ? C.tip : C.claw)));
      // three walking legs and a swimming paddle
      for (let k = 0; k < 3; k++) {
        const z0 = -0.012 + k * 0.016;
        const leg = new THREE.CatmullRomCurve3([[e * 0.06, 0.006, z0], [e * 0.1, 0.012, z0 + 0.008], [e * 0.13, 0.002, z0 + 0.03]].map(p => new THREE.Vector3(...p)));
        parts.push(tint(new THREE.TubeGeometry(leg, 6, 0.0035, 4, false), solid(C.claw)));
      }
      parts.push(tint(xf(new THREE.CapsuleGeometry(0.0035, 0.04, 3, 5), [e * 0.075, 0.005, 0.045], [Math.PI / 2, e * 0.9, 0]), solid(C.claw)));
      parts.push(tint(xf(new THREE.SphereGeometry(1, 8, 5), [e * 0.1, 0.005, 0.065], [0, e * 0.6, 0], [0.014, 0.003, 0.009]), solid(C.claw)));
      parts.push(tint(xf(new THREE.SphereGeometry(0.004, 6, 4), [e * 0.014, 0.022, -0.05]), solid(C.eye)));
    }
    return parts;
  };
  // an open clam: a banded lower shell holding the meat, the upper shell hinged open behind it
  const clam = () => {
    const parts = [], cream = new THREE.Color(C.clam), band = new THREE.Color(C.clamBand), inner = new THREE.Color('#efe2d2');
    const shell = up => tint(xf(new THREE.SphereGeometry(1, seg, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0, 0], [up ? 0 : Math.PI, 0, 0], [0.024, 0.008, 0.019]), (v, c) => {
      const d = Math.hypot(v.x / 0.024, (v.z + 0.019) / 0.019); c.copy(Math.sin(d * 14) > 0.4 ? band : cream); if (Math.sin(Math.atan2(v.x, v.z + 0.019) * 9) > 0.8) c.lerp(band, 0.4); });
    const lower = shell(false); lower.translate(0, 0.008, 0); parts.push(lower);
    const upper = shell(true); upper.translate(0, 0, 0.019); upper.rotateX(-1.95); upper.translate(0, 0.008, -0.019); parts.push(upper);
    parts.push(tint(xf(new THREE.SphereGeometry(1, 8, 5), [0, 0.007, 0.001], [0, 0, 0], [0.017, 0.005, 0.013]), (v, c) => c.set(v.x > 0.008 ? '#e3b07a' : C.meat)));
    return parts;
  };
  // a sea snail: a shell swept along a growing spiral, with brown spiral bands and a pale open mouth
  const snail = () => {
    const parts = [], turns = 3.4, pts = [];
    for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * turns * Math.PI * 2, r = 0.003 + 0.016 * t; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0.065 * (1 - t)]); }
    const cream = new THREE.Color(C.snail), band = new THREE.Color(C.snailBand);
    parts.push(sweep(pts, t => { const r = 0.002 + 0.016 * Math.pow(t, 1.1); return [r, r]; }, (t, p, ctr, c, side) => { c.copy(Math.sin(t * 90) > 0.5 ? band : cream); if (side > 0.7) c.lerp(new THREE.Color('#f2e2c8'), 0.4); }, {segs: low ? 48 : 90, radial: low ? 8 : 10, up: [0, 0, 1]}));
    const end = pts[40];
    parts.push(tint(xf(new THREE.SphereGeometry(1, 10, 6), [end[0], end[1], end[2] + 0.002], [0, 0, 0], [0.014, 0.014, 0.006]), solid(C.aperture)));
    parts.forEach(g => { g.rotateX(-Math.PI / 2 + 0.25); g.translate(0, 0.016, 0); });
    return parts;
  };

  local(crab(), [-0.02, baseY + 0.006, -0.05], [0, 0.25, 0], 1.0);
  local(mantis(), [0.11, baseY + 0.005, 0.0], [0, -0.35, 0], 1.25);
  local(mantis(), [0.15, baseY + 0.007, 0.07], [0, -0.55, 0], 1.2);
  for (const [x, z, r] of [[-0.14, 0.06, 0.3], [-0.1, 0.12, 1.6], [-0.03, 0.15, 2.4], [-0.17, -0.02, -0.6]]) local(shrimp(), [x, baseY + 0.004, z], [0, r, 0], 1.15);
  for (const [x, z, r] of [[0.05, 0.1, 0.4], [0.02, 0.06, 2.2], [0.09, 0.15, -1], [-0.06, 0.03, 1.2], [0.12, -0.08, 0.2], [0.07, -0.13, 2.8], [-0.12, -0.11, -0.4]]) local(clam(), [x, baseY + 0.006, z], [0, r, 0], 1.3);
  for (const [x, z, r] of [[-0.1, -0.15, 0.8], [0.0, -0.17, -0.4], [0.16, -0.12, 2.1]]) local(snail(), [x, baseY + 0.002, z], [0.15, r, 0], 1.05);
  // a little dish of vinegar with ginger, and scallion
  put(porcelain, xf(new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.042, 0.016], [0.04, 0.018], [0.028, 0.004], [0, 0.004]].map(p => new THREE.Vector2(...p)), 20), [-0.06, baseY + 0.004, 0.18]));
  put(sea, tint(xf(new THREE.CylinderGeometry(0.034, 0.034, 0.002, 18), [-0.06, baseY + 0.016, 0.18]), solid(C.vinegar)));
  for (let k = 0; k < 7; k++) put(sea, tint(xf(new THREE.BoxGeometry(0.03, 0.002, 0.003), [-0.06 + Math.sin(k * 2.1) * 0.012, baseY + 0.0185, 0.18 + Math.cos(k * 1.7) * 0.012], [0, k * 0.9, 0]), solid(C.ginger)));
  for (let k = 0; k < 10; k++) put(sea, tint(xf(new THREE.CylinderGeometry(0.004, 0.004, 0.008, 6), [Math.sin(k * 2.4) * 0.15, baseY + 0.03, Math.cos(k * 2.4) * 0.12], [Math.PI / 2, k, 0]), solid(C.scallion)));

  const M = {
    sea: own(new THREE.MeshStandardMaterial({name: 'seafood-steamed-glossy', vertexColors: true, roughness: 0.36, metalness: 0.0, side: THREE.DoubleSide})),
    porcelain: own(new THREE.MeshStandardMaterial({name: 'seafood-porcelain-plate', color: '#f5f2ea', roughness: 0.18})),
    bamboo: own(new THREE.MeshStandardMaterial({name: 'seafood-bamboo-steamer', color: '#c9a66b', roughness: 0.7, side: THREE.DoubleSide})),
    cobalt: own(new THREE.MeshStandardMaterial({name: 'seafood-plate-cobalt-rim', color: '#2a4f8f', roughness: 0.2})),
  };
  for (const [list, mat] of [[sea, M.sea], [porcelain, M.porcelain], [bamboo, M.bamboo], [cobalt, M.cobalt]]) {
    if (mat !== M.sea) list.forEach(g => g.deleteAttribute('color'));
    const g = own(mergeGeometries(list, false)); list.forEach(x => x.dispose());
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'life-seafood-' + mat.name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }

  // steam puffs that rise and fade while the platter is out
  const puffCanvas = document.createElement('canvas'); puffCanvas.width = puffCanvas.height = 64; const pc = puffCanvas.getContext('2d'), grad = pc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); pc.fillStyle = grad; pc.fillRect(0, 0, 64, 64);
  const puffTex = own(new THREE.CanvasTexture(puffCanvas));
  const puffMat = own(new THREE.PointsMaterial({name: 'seafood-steam-puffs', map: puffTex, size: 0.2, transparent: true, opacity: 0.2, depthWrite: false, sizeAttenuation: true}));
  const puffCount = low ? 10 : 18, puffPos = new Float32Array(puffCount * 3), puffGeo = own(new THREE.BufferGeometry()); puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3));
  const puffs = new THREE.Points(puffGeo, puffMat);
  puffs.name = 'life-seafood-steam'; puffs.raycast = () => {}; puffs.castShadow = false; group.add(puffs);
  const seeds = Array.from({length: puffCount}, (_, i) => ({x: Math.sin(i * 2.3) * 0.12, z: Math.cos(i * 1.9) * 0.1, phase: i / puffCount}));
  let amount = 0;
  group.visible = false;
  /** open: 0 hidden in the pot, 1 served above the rim. */
  function update(t, open) {
    amount = open; group.visible = open > 0.01;
    if (!group.visible) return;
    seeds.forEach((s, i) => { const k = (t * 0.3 + s.phase) % 1; puffPos[i * 3] = s.x * (1 + k) + Math.sin(t * 0.8 + i) * 0.03; puffPos[i * 3 + 1] = 0.04 + k * 0.5; puffPos[i * 3 + 2] = s.z * (1 + k); });
    puffGeo.attributes.position.needsUpdate = true; puffMat.opacity = 0.22 * open; puffMat.size = 0.14 + 0.08 * open;
  }
  return {group, update, get amount() { return amount; }};
}
