import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Carved detail for the building exteriors, in each building's own idiom: a stepped stone base
// with carved panels, a carved frieze under the eaves (meander relief on the porcelain and
// amber buildings, painted caihua on the timber hall, carved brick on the Huizhou study), door pins
// and sparrow braces at the doors, framed windows with crowns and corbels, a carved brick
// door canopy on the study. Petals drift down by the gate and the cats' home. Everything static merges into a few
// meshes per building; the petals are one instanced mesh each.

const PALETTES = {
  porcelain: {stone: '#ece4d2', deep: '#c9bfa8', paint: '#2b55ad', accent: '#f1f3f8', frieze: 'meander', crown: 'pediment'},
  tower: {stone: '#f1e6cf', deep: '#cdbb98', paint: '#a8661f', accent: '#f6efe0', frieze: 'meander', crown: 'pediment'},
  timber: {stone: '#d9d2c2', deep: '#b3a991', paint: '#9a3a2a', accent: '#2f7a68', frieze: 'caihua', crown: 'cloud'},
  ink: {stone: '#b9b5ab', deep: '#8f8a80', paint: '#3a3d44', accent: '#e9e5dc', frieze: 'brick', crown: 'cloud'},
};
// Station-local openings (centre, width, height, sill) from the room plans, frieze heights clear of
// every opening.
const CARVE = {
  'complete-home': {palette: 'porcelain', doors: [[-0.91, 1.65, 2.4]], windows: [[-2.72, 0.58, 0.88, 1.02], [0.89, 0.58, 0.88, 1.02]], frieze: [2.3, 2.54], petals: true},
  'research-complete-two-storey-library': {palette: 'porcelain', doors: [[0, 1.4, 2.18]], windows: [[-1.96, 1.12, 1.1, 0.91], [1.96, 1.12, 1.1, 0.91]], frieze: null},
  'talks-complete-timber-lecture-hall': {palette: 'timber', doors: [[-0.95, 1.4, 2.38]], windows: [[-2.82, 1.14, 1.05, 1.04], [0.98, 1.14, 1.05, 1.04]], frieze: [2.62, 2.92]},
  'complete-writing': {palette: 'ink', doors: [[0.10, 3.5, 2.46]], windows: [[-2.78, 0.7, 1.05, 1.06], [4.28, 1.1, 1.05, 1.06]], frieze: null, menzhao: true},
  'complete-life': {palette: 'tower', doors: [[-2.6, 1.85, 2.4], [0, 2.1, 2.4], [2.6, 1.85, 2.4]], windows: [], frieze: null, petals: true},
};

function friezeTexture(kind, pal) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const x = c.getContext('2d');
  if (kind === 'caihua') {
    // painted beam: blue and green bands, gold-edged medallions and lotus heads
    x.fillStyle = '#2a5f8a'; x.fillRect(0, 0, 512, 64); x.fillStyle = '#2f7a68'; x.fillRect(0, 0, 512, 12); x.fillRect(0, 52, 512, 12);
    x.strokeStyle = '#e8c46a'; x.lineWidth = 2; x.strokeRect(1, 12, 510, 40);
    for (let i = 0; i < 4; i++) {
      const cx = 64 + i * 128;
      x.fillStyle = '#9a3a2a'; x.beginPath(); x.ellipse(cx, 32, 40, 15, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#f0e6cf'; x.beginPath(); x.ellipse(cx, 32, 24, 8, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#e8c46a'; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(cx + Math.cos(k * Math.PI / 3) * 12, 32 + Math.sin(k * Math.PI / 3) * 4, 5, 2.4, k * Math.PI / 3, 0, Math.PI * 2); x.fill(); }
      x.strokeStyle = '#f0e6cf'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(cx + 46, 20); x.quadraticCurveTo(cx + 64, 32, cx + 46, 44); x.moveTo(cx - 46, 20); x.quadraticCurveTo(cx - 64, 32, cx - 46, 44); x.stroke(); x.strokeStyle = '#e8c46a'; x.lineWidth = 2;
    }
  } else {
    // a carved band: the motif is drawn three times, shadow, light and face, so it reads as relief
    const base = kind === 'brick' ? '#a7a39a' : pal.stone, face = kind === 'brick' ? '#b9b5ab' : '#f7f1e3';
    x.fillStyle = base; x.fillRect(0, 0, 512, 64);
    const draw = (dx, dy, col, w) => {
      x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'miter';
      if (kind === 'brick') {
        for (let i = 0; i < 8; i++) { const cx = 32 + i * 64 + dx, cy = 32 + dy; x.beginPath(); x.moveTo(cx - 26, cy + 10); x.bezierCurveTo(cx - 20, cy - 18, cx - 2, cy - 18, cx, cy); x.bezierCurveTo(cx + 2, cy + 18, cx + 20, cy + 18, cx + 26, cy - 10); x.stroke(); x.beginPath(); x.arc(cx, cy, 5, 0, Math.PI * 2); x.stroke(); }
      } else {
        // the classic squared meander
        for (let i = 0; i < 16; i++) { const ox = i * 32 + dx, oy = 14 + dy; x.beginPath(); x.moveTo(ox, oy + 36); x.lineTo(ox, oy); x.lineTo(ox + 26, oy); x.lineTo(ox + 26, oy + 28); x.lineTo(ox + 8, oy + 28); x.lineTo(ox + 8, oy + 8); x.lineTo(ox + 18, oy + 8); x.lineTo(ox + 18, oy + 20); x.stroke(); }
      }
    };
    draw(1.5, 1.5, 'rgba(60, 46, 30, .45)', 4); draw(-1, -1, 'rgba(255, 255, 255, .7)', 3); draw(0, 0, face, 3);
    x.fillStyle = 'rgba(60, 46, 30, .35)'; x.fillRect(0, 0, 512, 3); x.fillRect(0, 61, 512, 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

export function createCarvings({garden, fusion, low = false, reduced = false}) {
  const disposables = [], updates = [], groups = [];
  const own = o => (disposables.push(o), o);
  const paintMat = own(new THREE.MeshStandardMaterial({name: 'carving-painted-stone-and-wood', color: '#ffffff', vertexColors: true, roughness: 0.6, metalness: 0.02}));
  const giltMat = own(new THREE.MeshStandardMaterial({name: 'carving-gilt', color: '#e8c46a', roughness: 0.34, metalness: 0.5}));
  for (const station of garden?.root.children || []) {
    const spec = CARVE[station.name], f = fusion?.[station.name]; if (!spec || !f) continue;
    const pal = PALETTES[spec.palette], group = new THREE.Group(); group.name = station.name + '-carved-details'; station.add(group); groups.push(group);
    const [x0, x1] = f.x, [z0, z1] = f.z, base = f.base, zf = z1;
    const bins = new Map(), tmp = new THREE.Color();
    const put = (mat, g, color, p = [0, 0, 0], r = null) => {
      const geo = g.index ? g.toNonIndexed() : g; if (geo !== g) g.dispose();
      if (r) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r)));
      geo.translate(...p);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (mat === paintMat) { tmp.set(color); const n = geo.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) col.set([tmp.r, tmp.g, tmp.b], i * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) geo.deleteAttribute(k);
      if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(geo);
    };
    const box = (w, h, d, color, p, mat = paintMat) => put(mat, new THREE.BoxGeometry(w, h, d), color, p);
    const doorSpans = spec.doors.map(([c, w]) => [c - w / 2 - 0.04, c + w / 2 + 0.04]);
    const clear = (a, b) => { // the parts of [a, b] along the front that are not doorways
      let segs = [[a, b]];
      for (const [d0, d1] of doorSpans) segs = segs.flatMap(([s0, s1]) => d1 <= s0 || d0 >= s1 ? [[s0, s1]] : [[s0, d0], [d1, s1]].filter(([u, v]) => v - u > 0.08));
      return segs;
    };

    // the stepped stone base along the front and both sides: plinth, carved dado, cap
    const friezeTex = own(friezeTexture(pal.frieze === 'caihua' ? 'meander' : pal.frieze, pal));
    const friezeMat = own(new THREE.MeshStandardMaterial({name: 'carving-relief-band-' + station.name, map: friezeTex, roughness: 0.7}));
    const strip = (xa, xb, y0, y1, z, side = 0) => {
      const w = xb - xa, h = y1 - y0, g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, rep = w / (h * 8);
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * rep);
      if (side) g.rotateY(side * Math.PI / 2);
      put(friezeMat, g, null, side ? [z, (y0 + y1) / 2, (xa + xb) / 2] : [(xa + xb) / 2, (y0 + y1) / 2, z]);
    };
    const plinthH = 0.09, dadoH = 0.17, capH = 0.05, by = base - 0.02;
    for (const [s0, s1] of clear(x0 - 0.06, x1 + 0.06)) {
      box(s1 - s0, plinthH, 0.12, pal.deep, [(s0 + s1) / 2, by + plinthH / 2, zf + 0.03]);
      box(s1 - s0 - 0.04, dadoH, 0.06, pal.stone, [(s0 + s1) / 2, by + plinthH + dadoH / 2, zf + 0.012]);
      strip(s0 + 0.04, s1 - 0.04, by + plinthH + 0.025, by + plinthH + dadoH - 0.025, zf + 0.0435);
      box(s1 - s0, capH, 0.1, pal.deep, [(s0 + s1) / 2, by + plinthH + dadoH + capH / 2, zf + 0.025]);
    }
    for (const sx of [x0 - 0.03, x1 + 0.03]) {
      const side = sx < (x0 + x1) / 2 ? -1 : 1;
      box(0.12, plinthH, z1 - z0 + 0.1, pal.deep, [sx + side * 0.03, by + plinthH / 2, (z0 + z1) / 2]);
      box(0.06, dadoH, z1 - z0, pal.stone, [sx + side * 0.012, by + plinthH + dadoH / 2, (z0 + z1) / 2]);
      strip(z0 + 0.06, z1 - 0.06, by + plinthH + 0.025, by + plinthH + dadoH - 0.025, sx + side * 0.0435, side);
      box(0.1, capH, z1 - z0 + 0.08, pal.deep, [sx + side * 0.025, by + plinthH + dadoH + capH / 2, (z0 + z1) / 2]);
    }

    // the carved frieze under the eaves, front and sides, broken at the doors
    if (spec.frieze) {
      const [fy0, fy1] = spec.frieze;
      const bandTex = pal.frieze === 'caihua' ? own(friezeTexture('caihua', pal)) : friezeTex;
      const bandMat = bandTex === friezeTex ? friezeMat : own(new THREE.MeshStandardMaterial({name: 'carving-caihua-beam', map: bandTex, roughness: 0.55}));
      const band = (xa, xb, z, side = 0) => {
        const w = xb - xa, h = fy1 - fy0, g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, rep = w / (h * 8);
        for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * rep);
        if (side) g.rotateY(side * Math.PI / 2);
        put(bandMat, g, null, side ? [z, (fy0 + fy1) / 2, (xa + xb) / 2] : [(xa + xb) / 2, (fy0 + fy1) / 2, z]);
      };
      for (const [s0, s1] of clear(x0, x1)) { band(s0, s1, zf + 0.022); box(s1 - s0, 0.03, 0.05, pal.paint, [(s0 + s1) / 2, fy0 - 0.015, zf + 0.02]); box(s1 - s0, 0.03, 0.05, pal.paint, [(s0 + s1) / 2, fy1 + 0.015, zf + 0.02]); }
      for (const sx of [x0, x1]) { const side = sx === x0 ? -1 : 1; band(z0 + 0.04, z1 - 0.04, sx + side * 0.022, side); }
    }

    // doors: a carved lintel, door pins with gilt flowers, and sparrow braces in the top corners
    const braceShape = (w, h) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.bezierCurveTo(w * .7, -h * .15, w * .55, -h * .5, w * .3, -h * .55); s.bezierCurveTo(w * .18, -h * .6, w * .22, -h * .85, w * .08, -h); s.lineTo(0, -h); s.closePath();
      const hole = new THREE.Path(); hole.absellipse(w * .36, -h * .3, w * .12, h * .14, 0, Math.PI * 2, false, 0); s.holes.push(hole); return s; };
    for (const [c, w, h] of spec.doors) {
      const top = base + h;
      box(w + 0.18, 0.1, 0.07, pal.paint, [c, top + 0.05, zf + 0.03]);
      strip(c - w / 2 - 0.05, c + w / 2 + 0.05, top + 0.017, top + 0.083, zf + 0.0655);
      const pins = w > 2.4 ? [-0.36, -0.12, 0.12, 0.36] : [-0.22, 0.22];
      for (const px of pins) {
        put(paintMat, new THREE.CylinderGeometry(0.045, 0.045, 0.1, 10), pal.paint, [c + px * Math.min(1.6, w / 1.4), top + 0.15, zf + 0.05], [Math.PI / 2, 0, 0]);
        put(giltMat, new THREE.CylinderGeometry(0.036, 0.04, 0.012, 10), null, [c + px * Math.min(1.6, w / 1.4), top + 0.15, zf + 0.104], [Math.PI / 2, 0, 0]);
      }
      const bw = Math.min(0.42, w * 0.22), bh = 0.24;
      for (const s of [-1, 1]) {
        const g = new THREE.ExtrudeGeometry(braceShape(bw, bh), {depth: 0.035, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1, curveSegments: 6});
        if (s > 0) { g.scale(-1, 1, 1); g.computeVertexNormals(); }
        put(paintMat, g, pal.paint, [c - s * (w / 2 - 0.005), top, zf + 0.012]);
        // a gilt edge along the brace's curve
        put(giltMat, new THREE.BoxGeometry(bw, 0.012, 0.042), null, [c - s * (w / 2 - bw / 2), top - 0.006, zf + 0.03]);
      }
    }
    // the Huizhou study gets a carved brick canopy over its door
    if (spec.menzhao) {
      const [c, w, h] = spec.doors[0], top = base + h + 0.12;
      box(w + 0.6, 0.22, 0.16, pal.stone, [c, top + 0.11, zf + 0.08]);
      strip(c - w / 2 - 0.26, c + w / 2 + 0.26, top + 0.03, top + 0.19, zf + 0.161);
      box(w + 0.8, 0.05, 0.36, pal.deep, [c, top + 0.245, zf + 0.18]);
      const roof = new THREE.CylinderGeometry(0.001, 0.2, w + 0.9, 3, 1); roof.rotateZ(Math.PI / 2); roof.rotateX(-Math.PI / 6);
      put(paintMat, roof, '#2d3035', [c, top + 0.33, zf + 0.2]);
      for (const s of [-1, 1]) box(0.08, 0.12, 0.08, pal.deep, [c + s * (w / 2 + 0.2), top - 0.04, zf + 0.06]);
    }

    // windows: a framed surround, a sill on two corbels, and a crown
    const crown = (cx, y, w) => {
      if (pal.crown === 'pediment') {
        const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.08, 0); s.lineTo(w / 2 + 0.08, 0); s.lineTo(0, 0.16); s.closePath();
        put(paintMat, new THREE.ExtrudeGeometry(s, {depth: 0.06, bevelEnabled: false}), pal.stone, [cx, y, zf]);
        const i = new THREE.Shape(); i.moveTo(-w / 2 + 0.02, 0.025); i.lineTo(w / 2 - 0.02, 0.025); i.lineTo(0, 0.12); i.closePath();
        put(paintMat, new THREE.ExtrudeGeometry(i, {depth: 0.012, bevelEnabled: false}), pal.paint, [cx, y, zf + 0.055]);
        put(giltMat, new THREE.SphereGeometry(0.025, 10, 8), null, [cx, y + 0.06, zf + 0.075]);
      } else {
        const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.08, 0); s.lineTo(w / 2 + 0.08, 0); s.bezierCurveTo(w / 2 + 0.02, 0.08, w / 4, 0.02, 0.06, 0.1); s.bezierCurveTo(0.02, 0.15, -0.02, 0.15, -0.06, 0.1); s.bezierCurveTo(-w / 4, 0.02, -w / 2 - 0.02, 0.08, -w / 2 - 0.08, 0); s.closePath();
        put(paintMat, new THREE.ExtrudeGeometry(s, {depth: 0.05, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 8}), pal.paint, [cx, y, zf]);
        put(giltMat, new THREE.SphereGeometry(0.022, 10, 8), null, [cx, y + 0.09, zf + 0.06]);
      }
    };
    for (const [cw, ww, wh, sill] of spec.windows) {
      const yb = base + sill, yt = yb + wh, fw = 0.065;
      box(ww + fw * 2, fw, 0.05, pal.stone, [cw, yt + fw / 2, zf + 0.02]);
      for (const s of [-1, 1]) box(fw, wh, 0.05, pal.stone, [cw + s * (ww / 2 + fw / 2), (yb + yt) / 2, zf + 0.02]);
      box(ww + 0.22, 0.05, 0.12, pal.deep, [cw, yb - 0.025, zf + 0.05]);
      for (const s of [-1, 1]) box(0.06, 0.1, 0.08, pal.deep, [cw + s * (ww / 2 - 0.02), yb - 0.1, zf + 0.04]);
      crown(cw, yt + fw, ww);
    }

    for (const [mat, list] of bins) {
      const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); if (!g) continue; own(g);
      const m = new THREE.Mesh(g, mat); m.name = group.name + '-' + mat.name; m.castShadow = mat !== friezeMat; m.receiveShadow = true; group.add(m);
    }

    // petals drifting down in front of the gate and the cats' home
    if (spec.petals && !low) {
      const count = 46, petalGeo = own(new THREE.PlaneGeometry(0.045, 0.03)), petalMat = own(new THREE.MeshStandardMaterial({name: 'carving-drifting-petals', color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide}));
      const petals = new THREE.InstancedMesh(petalGeo, petalMat, count); petals.name = station.name + '-drifting-petals'; petals.castShadow = false; petals.raycast = () => {};
      const cols = ['#f6c9d2', '#fbe3e8', '#f3b4c2', '#fff5f2', '#efa9b8'].map(c => new THREE.Color(c));
      const seeds = Array.from({length: count}, (_, i) => ({x: x0 + Math.random() * (x1 - x0), z: zf + 0.3 + Math.random() * 2.4, phase: Math.random(), speed: 0.18 + Math.random() * 0.14, sway: 0.2 + Math.random() * 0.3, spin: Math.random() * 6}));
      seeds.forEach((s, i) => petals.setColorAt(i, cols[i % cols.length]));
      group.add(petals); const o = new THREE.Object3D(), span = f.top + 0.9 - base;
      updates.push(t => {
        seeds.forEach((s, i) => {
          const k = ((t * s.speed / span) + s.phase) % 1, y = f.top + 0.9 - k * span;
          o.position.set(s.x + Math.sin(t * 0.8 + s.spin) * s.sway, y, s.z + Math.cos(t * 0.6 + s.spin) * 0.2);
          o.rotation.set(t * 1.3 + s.spin, t * 0.9 + s.spin * 2, t * 0.5); o.scale.setScalar(k > 0.96 ? (1 - k) * 25 : 1);
          o.updateMatrix(); petals.setMatrixAt(i, o.matrix);
        });
        petals.instanceMatrix.needsUpdate = true;
      });
      if (reduced) updates.length = 0;
    }
  }
  return {groups, disposables, update(t) { updates.forEach(u => u(t)); }};
}
