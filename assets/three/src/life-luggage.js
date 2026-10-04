import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// The travel case in the Life travel bay: an upright vintage leather suitcase with darker corner caps
// and rivets, two stitched straps with brass buckles, brass latches, an arched leather handle, a name
// tag, and retro stickers from places already in Hanjing's story (no invented trips).

const STICKERS = [
  ['round', 'KOREA', '#20365f', '#f1d48a'],
  ['ticket', 'SWEDEN', '#2b5fa6', '#f4cf3d'],
  ['oval', 'DENMARK', '#b3262e', '#fbf3e4'],
  ['round', 'DALIAN', '#f2e6cc', '#1f4e8c'],
  ['ticket', 'SAN FRANCISCO', '#c4472b', '#fbeedb'],
  ['oval', 'WASHINGTON DC', '#1e2f52', '#f3e6c6'],
  ['round', 'SIX CATS', '#f2c14e', '#3a2414'],
  ['tag', 'HANJING', '#efe3c6', '#4a2a18'],
];

function stickerAtlas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  STICKERS.forEach(([shape, text, bg, fg], i) => {
    const ox = (i % 4) * 256, oy = Math.floor(i / 4) * 256; x.save(); x.translate(ox + 128, oy + 128);
    x.beginPath();
    if (shape === 'round') x.arc(0, 0, 118, 0, Math.PI * 2);
    else if (shape === 'oval') x.ellipse(0, 0, 122, 84, 0, 0, Math.PI * 2);
    else if (shape === 'ticket') { x.moveTo(-122, -76); x.lineTo(122, -76); x.lineTo(122, -20); x.arc(122, 0, 20, -Math.PI / 2, Math.PI / 2, true); x.lineTo(122, 76); x.lineTo(-122, 76); x.lineTo(-122, 20); x.arc(-122, 0, 20, Math.PI / 2, -Math.PI / 2, true); x.closePath(); }
    else x.rect(-90, -120, 180, 240);
    x.fillStyle = bg; x.fill(); x.lineWidth = 8; x.strokeStyle = fg; x.stroke();
    x.save(); x.clip();
    // a little picture for each place
    x.fillStyle = fg; x.strokeStyle = fg; x.lineWidth = 5;
    if (text === 'KOREA') { x.beginPath(); x.moveTo(-80, 40); x.lineTo(-35, -10); x.lineTo(0, 25); x.lineTo(35, -20); x.lineTo(85, 40); x.closePath(); x.globalAlpha = 0.5; x.fill(); x.globalAlpha = 1; x.beginPath(); x.arc(40, -50, 18, 0, Math.PI * 2); x.fill(); }
    if (text === 'SWEDEN') for (const cx of [-50, 0, 50]) { x.beginPath(); x.moveTo(cx - 18, -28); x.lineTo(cx - 18, -48); x.lineTo(cx - 9, -38); x.lineTo(cx, -52); x.lineTo(cx + 9, -38); x.lineTo(cx + 18, -48); x.lineTo(cx + 18, -28); x.closePath(); x.fill(); }
    if (text === 'DENMARK') ['#f2b84b', '#e67e4d', '#5b9bd5', '#7fb069', '#f2b84b'].forEach((col, k) => { const hx = -75 + k * 31; x.fillStyle = col; x.fillRect(hx, 20, 28, 34); x.beginPath(); x.moveTo(hx, 20); x.lineTo(hx + 14, 4); x.lineTo(hx + 28, 20); x.fill(); });
    if (text === 'DALIAN') { x.lineWidth = 6; for (let r = 0; r < 3; r++) { x.beginPath(); for (let k = 0; k <= 40; k++) { const px = -110 + k * 5.5, py = 40 + r * 22 + Math.sin(k * 0.6 + r) * 7; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } }
    if (text === 'SAN FRANCISCO') { x.lineWidth = 6; for (const tx of [-60, 60]) { x.fillRect(tx - 7, -60, 14, 100); } x.beginPath(); x.moveTo(-120, -10); x.quadraticCurveTo(-90, -60, -60, -58); x.quadraticCurveTo(0, 10, 60, -58); x.quadraticCurveTo(90, -60, 120, -10); x.stroke(); x.fillRect(-120, 20, 240, 8); }
    if (text === 'WASHINGTON DC') { x.beginPath(); x.arc(0, -10, 34, Math.PI, 0); x.fill(); x.fillRect(-46, -10, 92, 10); x.fillRect(-5, -66, 10, 22); for (let k = -3; k <= 3; k++) x.fillRect(k * 13 - 3, 2, 6, 26); x.fillRect(-56, 28, 112, 8); }
    if (text === 'SIX CATS') { const paw = (px, py, r) => { x.beginPath(); x.ellipse(px, py + r * 0.5, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); x.fill(); for (const [dx, dy] of [[-0.75, -0.45], [-0.27, -0.85], [0.27, -0.85], [0.75, -0.45]]) { x.beginPath(); x.arc(px + dx * r, py + dy * r, r * 0.25, 0, Math.PI * 2); x.fill(); } }; paw(0, -30, 36); }
    if (text === 'HANJING') { x.beginPath(); x.arc(0, -92, 12, 0, Math.PI * 2); x.fillStyle = '#4a2a18'; x.fill(); x.fillStyle = '#ffffff'; x.fillRect(-70, -50, 140, 110); x.strokeStyle = '#b89a6a'; x.lineWidth = 3; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(-58, 0 + k * 22); x.lineTo(58, 0 + k * 22); x.stroke(); } x.fillStyle = fg; }
    x.restore();
    x.fillStyle = text === 'HANJING' ? '#2a1a10' : fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    const size = text.length > 9 ? 26 : text.length > 6 ? 34 : 42;
    x.font = `700 ${size}px Georgia, serif`;
    const ty = {KOREA: 70, SWEDEN: 18, DENMARK: -30, DALIAN: -10, 'SAN FRANCISCO': 56, 'WASHINGTON DC': 60, 'SIX CATS': 40, HANJING: -22}[text];
    x.fillText(text, 0, ty);
    if (text === 'SIX CATS') { x.font = '600 20px Georgia, serif'; x.fillText('ON BOARD', 0, 74); }
    if (text === 'HANJING') { x.font = 'italic 18px Georgia, serif'; x.fillText('and six cats', 0, 88); }
    x.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

const cellPlane = (i, w, h) => {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 2;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 4, v0 + uv.getY(k) / 2);
  return g;
};

export function createTravelCase({root, resources, floorY, x, z, low = false}) {
  const own = o => (resources?.add(o), o);
  const group = new THREE.Group(); group.name = 'life-vintage-travel-case'; group.position.set(x, floorY, z); root.add(group);
  const M = {
    leather: own(new THREE.MeshStandardMaterial({name: 'case-caramel-leather', color: '#9c6438', roughness: 0.62})),
    dark: own(new THREE.MeshStandardMaterial({name: 'case-dark-leather', color: '#4b2b1a', roughness: 0.55})),
    brass: own(new THREE.MeshStandardMaterial({name: 'case-brass', color: '#c9a24f', roughness: 0.3, metalness: 0.75})),
    thread: own(new THREE.MeshStandardMaterial({name: 'case-stitching', color: '#e8d6ae', roughness: 0.9})),
  };
  const atlas = own(stickerAtlas());
  M.sticker = own(new THREE.MeshStandardMaterial({name: 'case-travel-stickers', map: atlas, roughness: 0.7, alphaTest: 0.5}));
  const bins = new Map();
  const add = (geometry, material, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry; if (g !== geometry) geometry.dispose();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!bins.has(material)) bins.set(material, []); bins.get(material).push(g);
  };
  const W = 0.86, H = 0.66, D = 0.34, y0 = 0.02, top = y0 + H, cy = y0 + H / 2, seg = low ? 2 : 3;
  add(new RoundedBoxGeometry(W, H, D, seg, 0.045), M.leather, [0, cy, 0]);
  // the seam where the lid closes, as a darker welt all the way round
  add(new RoundedBoxGeometry(W + 0.008, H + 0.008, 0.018, seg, 0.045), M.dark, [0, cy, 0.06]);
  // corner caps with rivets
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const px = sx * (W / 2 - 0.05), py = cy + sy * (H / 2 - 0.05), pz = sz * (D / 2 - 0.05);
    add(new RoundedBoxGeometry(0.108, 0.108, 0.108, 2, 0.04), M.dark, [px, py, pz]);
    if (sz > 0) for (const [rx, ry] of [[0.022, 0], [0, 0.022]]) add(new THREE.SphereGeometry(0.0065, 8, 6), M.brass, [px - sx * rx * 1.3 + sx * 0.012, py - sy * ry * 1.3 + sy * 0.012, D / 2 + 0.006]);
  }
  // two straps over the front, top and back, stitched along both edges, with brass buckles
  const sw = 0.062;
  for (const sx of [-0.25, 0.25]) {
    add(new THREE.BoxGeometry(sw, H + 0.012, 0.008), M.dark, [sx, cy, D / 2 + 0.004]);
    add(new THREE.BoxGeometry(sw, 0.008, D + 0.012), M.dark, [sx, top + 0.004, 0]);
    add(new THREE.BoxGeometry(sw, H + 0.012, 0.008), M.dark, [sx, cy, -D / 2 - 0.004]);
    for (let k = 0; k < (low ? 10 : 20); k++) for (const e of [-1, 1]) add(new THREE.BoxGeometry(0.003, 0.014, 0.002), M.thread, [sx + e * (sw / 2 - 0.007), y0 + 0.03 + k * (H - 0.06) / (low ? 9 : 19), D / 2 + 0.0085]);
    // the buckle: a brass frame with a prong, and the strap tip tucked through a keeper
    const by = cy + 0.08;
    const frame = new THREE.Shape(); frame.moveTo(-0.044, -0.034); frame.lineTo(0.044, -0.034); frame.lineTo(0.044, 0.034); frame.lineTo(-0.044, 0.034); frame.closePath();
    const hole = new THREE.Path(); hole.moveTo(-0.034, -0.024); hole.lineTo(-0.034, 0.024); hole.lineTo(0.034, 0.024); hole.lineTo(0.034, -0.024); hole.closePath(); frame.holes.push(hole);
    add(new THREE.ExtrudeGeometry(frame, {depth: 0.006, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1}), M.brass, [sx, by, D / 2 + 0.008]);
    add(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6), M.brass, [sx, by, D / 2 + 0.014]);
    add(new THREE.BoxGeometry(sw + 0.012, 0.022, 0.012), M.dark, [sx, by - 0.075, D / 2 + 0.01]);
  }
  // latches near the top edge, with a small lock plate in the middle
  for (const lx of [-0.12, 0.12]) {
    add(new RoundedBoxGeometry(0.06, 0.07, 0.012, 2, 0.006), M.brass, [lx, top - 0.06, D / 2 + 0.006]);
    add(new THREE.BoxGeometry(0.022, 0.035, 0.01), M.brass, [lx, top - 0.02, D / 2 + 0.012]);
  }
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 16), M.brass, [0, top - 0.06, D / 2 + 0.006], [Math.PI / 2, 0, 0]);
  add(new THREE.BoxGeometry(0.004, 0.012, 0.004), M.dark, [0, top - 0.062, D / 2 + 0.012]);
  // an arched leather handle on brass loops
  const arc = new THREE.CatmullRomCurve3([[-0.12, top + 0.02, 0], [-0.1, top + 0.08, 0], [0, top + 0.1, 0], [0.1, top + 0.08, 0], [0.12, top + 0.02, 0]].map(p => new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(arc, 24, 0.017, 8, false), M.dark);
  for (const hx of [-0.12, 0.12]) { add(new THREE.BoxGeometry(0.06, 0.01, 0.05), M.brass, [hx, top + 0.005, 0]); add(new THREE.TorusGeometry(0.016, 0.005, 6, 14), M.brass, [hx, top + 0.022, 0]); }
  // brass feet
  for (const fx of [-0.33, 0.33]) for (const fz of [-0.11, 0.11]) add(new THREE.CylinderGeometry(0.024, 0.03, 0.022, 12), M.brass, [fx, 0.011, fz]);
  // the stickers, a little crooked, front and side, and the name tag hanging from the handle
  const front = D / 2 + 0.0035;
  const place = [[0, -0.11, cy + 0.12, 0.15, 0.15, 0.18], [1, 0.08, cy - 0.12, 0.17, 0.11, -0.1], [2, 0.1, cy + 0.15, 0.14, 0.1, 0.12], [3, -0.12, cy - 0.17, 0.12, 0.12, -0.2], [6, 0.38, cy - 0.17, 0.08, 0.08, 0.3]];
  for (const [i, px, py, w, h, r] of place) add(cellPlane(i, w, h), M.sticker, [px, py, front + i * 0.0002], [0, 0, r]);
  add(cellPlane(4, 0.2, 0.13), M.sticker, [W / 2 + 0.0035, cy + 0.08, 0.02], [0, Math.PI / 2, 0.08]);
  add(cellPlane(5, 0.18, 0.12), M.sticker, [W / 2 + 0.0035, cy - 0.14, -0.04], [0, Math.PI / 2, -0.1]);
  const tag = cellPlane(7, 0.075, 0.1); add(tag, M.sticker, [0.075, top - 0.04, D / 2 + 0.03], [-0.15, 0, 0.12]);
  add(new THREE.BoxGeometry(0.075, 0.1, 0.004), M.dark, [0.075, top - 0.04, D / 2 + 0.027], [-0.15, 0, 0.12]);
  const strap = new THREE.CatmullRomCurve3([[0.1, top + 0.08, 0.0], [0.1, top + 0.06, 0.12], [0.085, top + 0.02, 0.19], [0.077, top + 0.005, 0.2]].map(p => new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(strap, 12, 0.004, 5, false), M.dark);

  for (const [material, list] of bins) {
    const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); if (!g) continue; own(g);
    const mesh = new THREE.Mesh(g, material); mesh.name = 'life-travel-case-merged-' + material.name; mesh.castShadow = material !== M.sticker; mesh.receiveShadow = true; mesh.userData.roomSolid = true; group.add(mesh);
  }
  return {group, obstacles: [{id: 'life-travel-case-solid', size: [0.91, 0.82, 0.39], position: [x, floorY + 0.41, z]}]};
}
