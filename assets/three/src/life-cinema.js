import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The six-cat picture house in the Life travel bay: a little home cinema that belongs to the room.
// A low walnut stage, a black masked screen in a gilt frame, red velvet curtains drawn back with
// gold ropes and tassels, a scalloped pelmet with fringe, a marquee whose bulbs chase at night,
// and a front row of two cat-sized seats (one reserved, one with popcorn). Static parts merge
// into one mesh per material; the bulbs are a single instanced mesh. No extra lights.

const velvetColor = '#741628';

function curtainGeometry(side, {top, bottom, outer, innerTop, tieY, innerTie, innerBottom, z, folds, low}) {
  const segU = low ? 20 : 40, segV = low ? 18 : 34;
  const g = new THREE.PlaneGeometry(1, 1, segU, segV), p = g.attributes.position, colors = new Float32Array(p.count * 3);
  const full = Math.abs(outer - innerTop);
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i) + 0.5, v = p.getY(i) + 0.5, u = side < 0 ? px : 1 - px; // u: 0 at the outer edge, 1 at the inner edge
    const y = bottom + v * (top - bottom);
    let inner;
    if (y >= tieY) { const k = (y - tieY) / (top - tieY); inner = innerTie + (innerTop - innerTie) * Math.pow(Math.sin(k * Math.PI / 2), 0.75); }
    else { const k = (tieY - y) / (tieY - bottom); inner = innerTie + (innerBottom - innerTie) * Math.sin(k * Math.PI / 2); }
    const width = Math.abs(outer - inner), x = side * (outer + (inner - outer) * u);
    // gathered cloth folds deeper; the gather near the rope bulges forward a little
    const amp = Math.min(0.05, 0.022 * Math.sqrt(full / Math.max(width, 0.05))), wave = Math.sin(u * folds * Math.PI * 2 + (side < 0 ? 0 : 1.3));
    const tie = Math.exp(-((y - tieY) ** 2) / 0.02);
    const zz = z + amp * wave + 0.03 * tie * u + 0.012 * (1 - u) * Math.sin(v * 3.1);
    p.setXYZ(i, x, y, zz);
    const shade = 0.62 + 0.38 * (0.5 + 0.5 * wave);
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade * (0.9 + 0.1 * v);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function marqueeTexture(low) {
  const c = document.createElement('canvas'); c.width = low ? 512 : 1024; c.height = low ? 160 : 320;
  const x = c.getContext('2d'), w = c.width, h = c.height, s = w / 1024;
  const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#5a1420'); bg.addColorStop(1, '#2c0910');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  const gold = x.createLinearGradient(0, 0, 0, h); gold.addColorStop(0, '#f6dc94'); gold.addColorStop(0.5, '#c9a24f'); gold.addColorStop(1, '#f0d184');
  x.strokeStyle = gold; x.lineWidth = 10 * s; x.strokeRect(14 * s, 14 * s, w - 28 * s, h - 28 * s);
  x.lineWidth = 3 * s; x.strokeRect(32 * s, 32 * s, w - 64 * s, h - 64 * s);
  // little art deco fans in the corners
  for (const [cx, cy, a] of [[32, 32, 0], [w / s - 32, 32, Math.PI / 2], [w / s - 32, h / s - 32, Math.PI], [32, h / s - 32, -Math.PI / 2]]) {
    x.save(); x.translate(cx * s, cy * s); x.rotate(a); x.beginPath();
    for (let k = 0; k < 4; k++) { x.moveTo(0, 0); x.arc(0, 0, (18 + k * 9) * s, 0, Math.PI / 2); }
    x.stroke(); x.restore();
  }
  x.fillStyle = gold; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `600 ${30 * s}px Georgia, serif`;
  const top = 'N O W   S H O W I N G'; x.fillText(top, w / 2, 82 * s);
  x.font = `700 ${112 * s}px Georgia, serif`; x.shadowColor = '#000a'; x.shadowBlur = 8 * s; x.shadowOffsetY = 4 * s;
  x.fillText('THE SIX CATS', w / 2, 190 * s);
  x.shadowColor = 'transparent';
  // a paw print on either side of the title
  const paw = (px, py, r) => { x.beginPath(); x.ellipse(px, py + r * 0.5, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); x.fill();
    for (const [dx, dy] of [[-0.75, -0.45], [-0.27, -0.85], [0.27, -0.85], [0.75, -0.45]]) { x.beginPath(); x.arc(px + dx * r, py + dy * r, r * 0.25, 0, Math.PI * 2); x.fill(); } };
  paw(92 * s, 190 * s, 26 * s); paw(w - 92 * s, 190 * s, 26 * s);
  x.font = `italic 500 ${28 * s}px Georgia, serif`; x.fillText('a home movie, every night', w / 2, 262 * s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function popcornTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f7f1e3' : '#b8242c'; x.fillRect(i * 16, 0, 16, 128); }
  x.fillStyle = '#f2c14e'; x.fillRect(0, 54, 128, 22); x.fillStyle = '#7a1a20'; x.font = '700 16px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('POPCORN', 64, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function cardTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f5ecd6'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#a8823c'; x.lineWidth = 6; x.strokeRect(8, 8, 240, 112);
  x.fillStyle = '#5a1420'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 40px Georgia, serif'; x.fillText('RESERVED', 128, 54);
  x.font = 'italic 24px Georgia, serif'; x.fillText('for a cat', 128, 92);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * Builds the cinema around a screen centred at (x, floorY + screenY, z) in the station root.
 * Returns {group, obstacles, screenZ, patchScreen(material, size), update(t, dark)}.
 */
export function createCatCinema({root, resources, floorY, x, z, screenY = 1.08, low = false}) {
  const own = o => (resources?.add(o), o);
  const group = new THREE.Group(); group.name = 'life-six-cat-picture-house'; group.position.set(x, floorY, z); root.add(group);
  const M = {
    walnut: own(new THREE.MeshStandardMaterial({name: 'cinema-walnut', color: '#4e3122', roughness: 0.5})),
    walnutLight: own(new THREE.MeshStandardMaterial({name: 'cinema-walnut-panel', color: '#6b4630', roughness: 0.55})),
    gilt: own(new THREE.MeshStandardMaterial({name: 'cinema-gilt', color: '#c9a24f', roughness: 0.32, metalness: 0.72})),
    mask: own(new THREE.MeshStandardMaterial({name: 'cinema-black-masking', color: '#141214', roughness: 0.95})),
    velvet: own(new THREE.MeshPhysicalMaterial({name: 'cinema-velvet', color: velvetColor, roughness: 0.82, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color('#e0697c')})),
    drape: own(new THREE.MeshPhysicalMaterial({name: 'cinema-velvet-curtain', color: velvetColor, roughness: 0.85, sheen: 1, sheenRoughness: 0.42, sheenColor: new THREE.Color('#e86f82'), vertexColors: true, side: THREE.DoubleSide})),
    ivory: own(new THREE.MeshStandardMaterial({name: 'cinema-popcorn', color: '#f6e7b8', roughness: 0.9})),
  };
  const bins = new Map();
  const add = (geometry, material, pos = [0, 0, 0], rot = null, scale = null) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry; if (g !== geometry) geometry.dispose();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(...(scale || [1, 1, 1])));
    g.applyMatrix4(m);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!bins.has(material)) bins.set(material, []); bins.get(material).push(g);
  };
  const box = (size, material, pos, rot) => add(new THREE.BoxGeometry(...size), material, pos, rot);

  // the stage: a low walnut dais with raised panels and a gilt nosing
  const stageH = 0.1, stageD = 0.58, stageW = 2.0, sz0 = 0.03;
  box([stageW, stageH, stageD], M.walnut, [0, stageH / 2, sz0]);
  box([stageW + 0.02, 0.016, 0.03], M.gilt, [0, stageH - 0.006, sz0 + stageD / 2 + 0.006]);
  for (let i = 0; i < 5; i++) box([0.32, 0.05, 0.012], M.walnutLight, [-0.76 + i * 0.38, 0.046, sz0 + stageD / 2 + 0.004]);
  for (const s of [-1, 1]) box([0.012, 0.05, stageD - 0.08], M.walnutLight, [s * (stageW / 2 + 0.004), 0.046, sz0]);

  // the screen: black masking board in a gilt frame on two posts and a header beam
  const sw = 1.28, sh = 1.51, cy = screenY;
  box([sw, sh, 0.1], M.mask, [0, cy, 0]);
  const fw = 0.055;
  for (const s of [-1, 1]) {
    box([sw + fw * 2, fw, 0.12], M.gilt, [0, cy + s * (sh / 2 + fw / 2), 0.005]);
    box([fw, sh + fw * 2, 0.12], M.gilt, [s * (sw / 2 + fw / 2), cy, 0.005]);
    // a fine inner bead
    box([sw - 0.02, 0.008, 0.01], M.gilt, [0, cy + s * (sh / 2 - 0.035), 0.054]);
    box([0.008, sh - 0.07, 0.01], M.gilt, [s * (sw / 2 - 0.03), cy, 0.054]);
    box([0.085, 2.0, 0.1], M.walnut, [s * 0.82, stageH + 1.0, -0.03]);
  }
  box([1.78, 0.09, 0.14], M.walnut, [0, 2.06, -0.01]);

  // the pelmet: a velvet valance with scalloped swags, gilt braid, fringe and tassels
  const pw = 0.96, pTop = 2.16, pz = 0.19, swags = 5;
  const shape = new THREE.Shape(); shape.moveTo(-pw, 0); shape.lineTo(pw, 0); shape.lineTo(pw, -0.2);
  const edge = [];
  for (let i = swags - 1; i >= 0; i--) {
    const x0 = -pw + (i + 1) * (2 * pw / swags), x1 = -pw + i * (2 * pw / swags);
    for (let k = 0; k <= 12; k++) { const t = k / 12, xx = x0 + (x1 - x0) * t, yy = -0.17 - 0.075 * Math.sin(Math.PI * t); if (k || i === swags - 1) { shape.lineTo(xx, yy); edge.push(new THREE.Vector3(xx, yy, 0)); } }
  }
  shape.lineTo(-pw, -0.2); shape.lineTo(-pw, 0);
  const pel = new THREE.ExtrudeGeometry(shape, {depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 4});
  add(pel, M.velvet, [0, pTop, pz - 0.015]);
  for (const s of [-1, 1]) box([0.03, 0.2, 0.26], M.velvet, [s * (pw + 0.01), pTop - 0.1, pz - 0.12]);
  box([2 * pw + 0.05, 0.02, 0.05], M.gilt, [0, pTop + 0.005, pz + 0.004]);
  box([2 * pw, 0.008, 0.008], M.gilt, [0, pTop - 0.035, pz + 0.022]);
  edge.reverse();
  const braid = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge.map(v => new THREE.Vector3(v.x, v.y + pTop, pz + 0.023))), low ? 60 : 120, 0.007, 5, false);
  add(braid, M.gilt);
  // fringe: short gold strands hanging below the swag edge
  const strand = new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 3);
  const fringeCount = low ? 70 : 140, curve = new THREE.CatmullRomCurve3(edge);
  for (let i = 0; i <= fringeCount; i++) { const p = curve.getPoint(i / fringeCount); add(strand.clone(), M.gilt, [p.x, pTop + p.y - 0.018, pz + 0.02]); }
  strand.dispose();
  const tassel = (tx, ty, tz, scale = 1) => {
    add(new THREE.SphereGeometry(0.014 * scale, 10, 8), M.gilt, [tx, ty, tz]);
    add(new THREE.CylinderGeometry(0.006 * scale, 0.006 * scale, 0.02 * scale, 8), M.gilt, [tx, ty - 0.018 * scale, tz]);
    add(new THREE.CylinderGeometry(0.009 * scale, 0.022 * scale, 0.06 * scale, 12, 1, true), M.gilt, [tx, ty - 0.058 * scale, tz]);
    add(new THREE.CylinderGeometry(0.022 * scale, 0.022 * scale, 0.004, 12), M.gilt, [tx, ty - 0.088 * scale, tz]);
  };
  for (let i = 1; i < swags; i++) tassel(-pw + i * (2 * pw / swags), pTop - 0.18, pz + 0.03, 0.8);

  // curtains drawn back to either side, gathered by gold ropes with tassels
  const tieY = 0.82;
  for (const s of [-1, 1]) {
    add(curtainGeometry(s, {top: 2.0, bottom: stageH + 0.005, outer: 0.92, innerTop: 0.6, tieY, innerTie: 0.8, innerBottom: 0.7, z: 0.11, folds: 6.5, low}), M.drape);
    const rope = new THREE.TorusGeometry(0.075, 0.009, 6, 28); rope.scale(1, 1, 0.6);
    add(rope, M.gilt, [s * 0.87, tieY, 0.11], [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 5), M.gilt, [s * 0.8, tieY - 0.05, 0.155]);
    tassel(s * 0.8, tieY - 0.09, 0.155, 1.1);
    // the rope runs back to a gilt rosette on the post
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16), M.gilt, [s * 0.96, tieY, 0.02], [Math.PI / 2, 0, 0]);
  }

  // the marquee on top of the pelmet, with a stepped crest
  const mw = 0.9, mh = 0.28, my = pTop + 0.02 + mh / 2, mz = pz - 0.02;
  box([mw + 0.06, mh + 0.06, 0.05], M.walnut, [0, my, mz - 0.03]);
  box([mw * 0.46, 0.05, 0.05], M.gilt, [0, my + mh / 2 + 0.055, mz - 0.03]);
  box([mw * 0.22, 0.04, 0.05], M.gilt, [0, my + mh / 2 + 0.1, mz - 0.03]);
  add(new THREE.SphereGeometry(0.02, 12, 8), M.gilt, [0, my + mh / 2 + 0.14, mz - 0.03]);
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), M.gilt, [s * 0.36, pTop + 0.03, mz - 0.03]);
  const markTex = own(marqueeTexture(low));
  const markMat = own(new THREE.MeshStandardMaterial({name: 'cinema-marquee-face', map: markTex, emissiveMap: markTex, emissive: '#ffffff', emissiveIntensity: 0.12, roughness: 0.5}));
  const face = new THREE.Mesh(own(new THREE.PlaneGeometry(mw, mh)), markMat); face.name = 'life-cinema-marquee'; face.position.set(0, my, mz + 0.0); group.add(face);
  const bulbPts = [];
  for (let i = 0; i < 13; i++) { const bx = -mw / 2 + 0.03 + i * (mw - 0.06) / 12; bulbPts.push([bx, my + mh / 2 + 0.012], [bx, my - mh / 2 - 0.012]); }
  for (let i = 1; i < 4; i++) for (const s of [-1, 1]) bulbPts.push([s * (mw / 2 + 0.012), my - mh / 2 + i * mh / 4]);
  bulbPts.sort((a, b) => Math.atan2(a[1] - my, a[0]) - Math.atan2(b[1] - my, b[0]));
  const bulbMat = own(new THREE.MeshBasicMaterial({name: 'cinema-marquee-bulbs', color: '#ffffff'}));
  const bulbs = new THREE.InstancedMesh(own(new THREE.SphereGeometry(0.0115, 10, 8)), bulbMat, bulbPts.length);
  bulbs.name = 'life-cinema-marquee-bulbs';
  const tmp = new THREE.Object3D();
  bulbPts.forEach(([bx, by], i) => { tmp.position.set(bx, by, mz + 0.008); tmp.updateMatrix(); bulbs.setMatrixAt(i, tmp.matrix); bulbs.setColorAt(i, new THREE.Color('#ffe8b0')); add(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), M.gilt, [bx, by, mz - 0.002], [Math.PI / 2, 0, 0]); });
  bulbs.castShadow = false; bulbs.raycast = () => {}; group.add(bulbs);

  // the front row: two cat-sized theatre seats on a shared walnut rail, facing the screen
  const rowZ = 0.9, seatW = 0.25;   // far enough back that, seated, the whole screen is in view
  const rounded = (w, h, d, r) => { const sh = new THREE.Shape(); const x0 = -w / 2, y0 = -h / 2; sh.moveTo(x0 + r, y0); sh.lineTo(x0 + w - r, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); sh.lineTo(x0 + w, y0 + h - r); sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); sh.lineTo(x0 + r, y0 + h); sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
    const g = new THREE.ExtrudeGeometry(sh, {depth: d, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 5}); g.translate(0, 0, -d / 2); return g; };
  const rrect = (path, w, h, r) => { const x0 = -w / 2, y0 = -h / 2; path.moveTo(x0 + r, y0); path.lineTo(x0 + w - r, y0); path.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); path.lineTo(x0 + w, y0 + h - r); path.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); path.lineTo(x0 + r, y0 + h); path.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); path.lineTo(x0, y0 + r); path.quadraticCurveTo(x0, y0, x0 + r, y0); return path; };
  const frameLine = (w, h, t, r) => { const sh = rrect(new THREE.Shape(), w, h, r); sh.holes.push(rrect(new THREE.Path(), w - t * 2, h - t * 2, Math.max(0.005, r - t))); const g = new THREE.ExtrudeGeometry(sh, {depth: 0.003, bevelEnabled: false, curveSegments: 5}); g.translate(0, 0, -0.0015); return g; };
  box([0.62, 0.03, 0.06], M.walnut, [0, 0.02, rowZ + 0.04]);
  for (const s of [-1, 0, 1]) {
    const ax = s * (seatW + 0.035);
    // aisle standards with a rounded top, an inset gilt line and an armrest
    add(rounded(0.22, 0.25, 0.026, 0.06), M.walnut, [ax, 0.125, rowZ], [0, Math.PI / 2, 0]);
    if (s) { add(rounded(0.15, 0.16, 0.004, 0.04), M.walnutLight, [ax + s * 0.015, 0.125, rowZ], [0, Math.PI / 2, 0]); add(frameLine(0.16, 0.17, 0.006, 0.045), M.gilt, [ax + s * 0.027, 0.125, rowZ], [0, Math.PI / 2, 0]); }
    add(rounded(0.05, 0.25, 0.02, 0.02), M.walnutLight, [ax, 0.262, rowZ - 0.005], [-Math.PI / 2, 0, 0]);
  }
  for (const s of [-0.5, 0.5]) {
    const sx = s * (seatW + 0.035);
    add(rounded(seatW - 0.035, 0.18, 0.04, 0.035), M.velvet, [sx, 0.165, rowZ - 0.01], [-Math.PI / 2 + 0.06, 0, 0]);
    // a velvet back with three stitched channels, inside a walnut shell
    add(rounded(seatW - 0.035, 0.25, 0.035, 0.05), M.velvet, [sx, 0.34, rowZ + 0.085], [-0.18, 0, 0]);
    for (const k of [-1, 0, 1]) add(rounded(0.055, 0.2, 0.012, 0.02), M.velvet, [sx + k * 0.064, 0.345, rowZ + 0.062], [-0.18, 0, 0]);
    add(rounded(seatW - 0.022, 0.265, 0.016, 0.055), M.walnut, [sx, 0.338, rowZ + 0.112], [-0.18, 0, 0]);
    add(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 14), M.gilt, [sx, 0.41, rowZ + 0.135], [Math.PI / 2 - 0.18, 0, 0], [1, 1, 0.6]);
  }
  // a reserved card on the left seat and a striped popcorn box on the right
  const cardTex = own(cardTexture()), cardMat = own(new THREE.MeshStandardMaterial({name: 'cinema-reserved-card', map: cardTex, roughness: 0.8, side: THREE.DoubleSide}));
  const cardGeo = own(new THREE.PlaneGeometry(0.11, 0.055)); const card = new THREE.Mesh(cardGeo, cardMat);
  card.position.set(-(seatW + 0.035) / 2, 0.215, rowZ + 0.02); card.rotation.set(-0.5, 0, 0); card.name = 'life-cinema-reserved-card'; group.add(card);
  const popTex = own(popcornTexture()), popMat = own(new THREE.MeshStandardMaterial({name: 'cinema-popcorn-box', map: popTex, roughness: 0.7}));
  const popGeo = own(new THREE.CylinderGeometry(0.04, 0.03, 0.09, 8, 1, true)); const pop = new THREE.Mesh(popGeo, popMat);
  pop.position.set((seatW + 0.035) / 2, 0.235, rowZ - 0.01); pop.rotation.y = Math.PI / 8; pop.name = 'life-cinema-popcorn'; group.add(pop);
  for (let i = 0; i < (low ? 8 : 16); i++) {
    const a = i * 2.39996, r = 0.032 * Math.sqrt((i + 0.5) / 16);
    add(new THREE.IcosahedronGeometry(0.011 + 0.004 * ((i * 37) % 5) / 5, 0), M.ivory, [(seatW + 0.035) / 2 + Math.cos(a) * r, 0.284 + 0.012 * Math.sin(i * 1.7) + (i < 4 ? 0.01 : 0), rowZ - 0.01 + Math.sin(a) * r]);
  }

  for (const [material, list] of bins) {
    const g = mergeGeometries(list.map(x => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) x.deleteAttribute(k); if (material.vertexColors && !x.attributes.color) x.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 3).fill(1), 3)); return x; }), false);
    list.forEach(x => x.dispose()); if (!g) continue; own(g);
    const mesh = new THREE.Mesh(g, material); mesh.name = 'life-cinema-merged-' + material.name; mesh.castShadow = material !== M.drape; mesh.receiveShadow = true; mesh.userData.roomSolid = true; group.add(mesh);
  }

  // the screen print: a soft vignette, a film flicker, a quick dip at each cut, and the projector's
  // light at night
  const screen = {time: {value: 0}, cut: {value: 9}, glow: {value: 0.04}};
  function patchScreen(material, [w, h]) {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {uCineTime: screen.time, uCineCut: screen.cut, uCineGlow: screen.glow});
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vCine;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvCine = position.xy / vec2(${w.toFixed(4)}, ${h.toFixed(4)}) + 0.5;`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vCine;\nuniform float uCineTime, uCineCut, uCineGlow;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec2 cq = vCine * (1.0 - vCine);
          float vig = clamp(pow(cq.x * cq.y * 16.0, 0.32), 0.0, 1.0);
          float flick = 0.965 + 0.035 * sin(uCineTime * 47.0) * sin(uCineTime * 13.3);
          float dip = 1.0 - 0.75 * exp(-uCineCut * 9.0);
          float grain = fract(sin(dot(floor(vCine * 260.0) + floor(uCineTime * 18.0), vec2(12.9898, 78.233))) * 43758.5453);
          diffuseColor.rgb *= mix(0.42, 1.0, vig) * flick * dip * (0.97 + 0.06 * grain);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uCineGlow;');
    };
    material.customProgramCacheKey = () => 'life-cinema-screen-v1';
    material.needsUpdate = true;
  }

  const lit = new THREE.Color('#fff3c4'), dim = new THREE.Color('#9a6a34'), day = new THREE.Color('#e9cf94'), c = new THREE.Color();
  let lastStep = -1, lastDark = null;
  function update(t, dark, cutAge = 9) {
    screen.time.value = t; screen.cut.value = cutAge < 0 ? 9 : cutAge; screen.glow.value = dark ? 0.32 : 0.04;
    markMat.emissiveIntensity = dark ? 0.5 : 0.12;
    const step = Math.floor(t * 7);
    if (step === lastStep && dark === lastDark) return; lastStep = step; lastDark = dark;
    for (let i = 0; i < bulbPts.length; i++) {
      if (!dark) c.copy(day).multiplyScalar(0.92 + 0.08 * ((i + step) % 2));
      else c.copy((i + step) % 3 === 0 ? lit : dim);
      bulbs.setColorAt(i, c);
    }
    bulbs.instanceColor.needsUpdate = true;
  }
  update(0, false);
  const obstacles = [
    {id: 'life-cinema-stage-and-screen', size: [stageW + 0.06, 2.5, stageD + 0.08], position: [x, floorY + 1.25, z + sz0]},
    {id: 'life-cinema-front-row', size: [0.66, 0.5, 0.32], position: [x, floorY + 0.25, z + rowZ + 0.03]},
  ];
  return {group, obstacles, screenZ: 0.052, rowZ, seats: [-0.5, 0.5].map(k => k * (seatW + 0.035)), patchScreen, update};
}
