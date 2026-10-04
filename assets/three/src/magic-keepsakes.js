import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Finely detailed keepsakes for the hidden stories: the two shores of Dalian
// and San Francisco, the cats' two road trips across America, and the model
// plane from 2013. Each builder works in its support's local space (y = 0 is
// the supporting surface, +z faces the room) and returns clickable parts per
// story page plus an animate(t, dt, page) hook.

const LON0 = -96, LAT0 = 38.4, COS = Math.cos(THREE.MathUtils.degToRad(38));

/** Collects geometry per material and merges it into one mesh each. */
function makeKit(name, resources) {
  const parts = new Map();
  return {
    add(geo, mat, {p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]} = {}) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
      if (!parts.has(mat)) parts.set(mat, []);
      parts.get(mat).push(g);
    },
    build(parent) {
      const meshes = [];
      for (const [mat, list] of parts) {
        const g = mergeGeometries(list, false); list.forEach(x => x.dispose());
        const m = new THREE.Mesh(g, mat); m.name = name + '-' + mat.name; m.castShadow = true; m.receiveShadow = true;
        parent.add(m); meshes.push(m); resources?.add(g);
      }
      parts.clear();
      return meshes;
    }
  };
}

/** One canvas atlas for every small printed label on the keepsakes. */
function makeLabels(resources) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext('2d'), tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; resources?.add(tex);
  const mat = new THREE.MeshStandardMaterial({name: 'keepsake-printed-labels', map: tex, roughness: 0.6, metalness: 0.05}); resources?.add(mat);
  const cols = 4, cw = 256, ch = 128; let cell = 0;
  function cellUV(draw) {
    const i = cell++, x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    ctx.save(); ctx.translate(x, y); draw(ctx, cw, ch); ctx.restore(); tex.needsUpdate = true;
    return [x / 1024, 1 - (y + ch) / 1024, cw / 1024, ch / 1024];
  }
  function plate(text, {bg = '#d9b65e', fg = '#3a2a12', size = 46, sub = null} = {}) {
    return cellUV((c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, bg); g.addColorStop(1, shadeHex(bg, -0.18));
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = shadeHex(bg, -0.4); c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `700 ${size}px Georgia, serif`; c.fillText(text, w / 2, sub ? h * 0.40 : h / 2);
      if (sub) { c.font = `500 ${size * 0.55}px Georgia, serif`; c.fillText(sub, w / 2, h * 0.74); }
    });
  }
  function custom(draw) { return cellUV(draw); }
  function geometry(uv, w, h) {
    const g = new THREE.PlaneGeometry(w, h), a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * uv[2], uv[1] + a.getY(i) * uv[3]);
    return g;
  }
  return {mat, plate, custom, geometry};
}

function shadeHex(hex, amount) {
  const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amount, 0, 1));
  return '#' + c.getHexString();
}

function material(resources, name, color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({name: 'keepsake-' + name, color, roughness: 0.7, ...opts});
  resources?.add(m); return m;
}

/** A small suspension bridge between x0 and x1 at depth z, deck height y. */
function miniBridge(kit, {x0, x1, z, y, towerH, color, cable, deck, scale = 1}) {
  const len = x1 - x0, mid = (x0 + x1) / 2, half = 0.006 * scale;
  kit.add(new THREE.BoxGeometry(len, 0.0025 * scale, half * 2.6), deck, {p: [mid, y, z]});
  const towers = [x0 + len * 0.27, x0 + len * 0.73];
  for (const tx of towers) {
    for (const s of [-1, 1]) kit.add(new THREE.BoxGeometry(0.0028 * scale, towerH, 0.0028 * scale), color, {p: [tx, y - 0.01 * scale + towerH / 2, z + s * half]});
    for (const h of [0.35, 0.68, 0.95]) kit.add(new THREE.BoxGeometry(0.0022 * scale, 0.0018 * scale, half * 2.2), color, {p: [tx, y - 0.01 * scale + towerH * h, z]});
  }
  const top = y - 0.01 * scale + towerH * 0.97, sag = y + 0.006 * scale;
  const cy = x => x < towers[0] ? THREE.MathUtils.lerp(y, top, (x - x0) / (towers[0] - x0)) : x > towers[1] ? THREE.MathUtils.lerp(top, y, (x - towers[1]) / (x1 - towers[1])) : sag + (top - sag) * ((x - towers[0]) / (towers[1] - towers[0]) * 2 - 1) ** 2;
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 24; i++) { const x = x0 + len * i / 24; pts.push(new THREE.Vector3(x, cy(x), z + s * half)); }
    kit.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0007 * scale, 4, false), cable);
    for (let x = towers[0] + 0.006 * scale; x < towers[1]; x += 0.006 * scale) { const h = cy(x) - y; if (h > 0.001) kit.add(new THREE.BoxGeometry(0.0004, h, 0.0004), cable, {p: [x, y + h / 2, z + s * half]}); }
  }
}

/** Flat extruded land from an outline given as [x, z] points. */
function land(kit, points, {y, h, mat, inset = 0}) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, {depth: h, bevelEnabled: true, bevelThickness: Math.min(0.002, h * 0.3), bevelSize: 0.0015 + inset, bevelSegments: 2, curveSegments: 12});
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  kit.add(g, mat);
}

/** A detailed model airliner, nose along +x, about 0.55 long before scaling. */
function makeAirliner(resources, L) {
  const white = material(resources, 'plane-white', '#f4f3f0', {roughness: 0.35, metalness: 0.1});
  const grey = material(resources, 'plane-wing-grey', '#c9ccd1', {roughness: 0.45, metalness: 0.2});
  const dark = material(resources, 'plane-windows', '#202833', {roughness: 0.15, metalness: 0.4});
  const red = material(resources, 'plane-seal-red', '#b8352c', {roughness: 0.4});
  const navy = material(resources, 'plane-navy-stripe', '#22365e', {roughness: 0.4});
  const engine = material(resources, 'plane-engine', '#9aa0a8', {metalness: 0.6, roughness: 0.3});
  const intake = material(resources, 'plane-intake', '#15171a', {roughness: 0.6});
  // the plane: fuselage, swept wings with winglets, engines, tail with the HS seal
  const plane = new THREE.Group(); plane.name = 'keepsake-model-airliner';
  const pk = makeKit('keepsake-model-airliner', resources);
  const prof = [[0, 0], [0.012, 0.004], [0.024, 0.014], [0.031, 0.03], [0.034, 0.06], [0.034, 0.36], [0.031, 0.42], [0.022, 0.48], [0.012, 0.52], [0.004, 0.54], [0, 0.545]];
  const fus = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32); fus.rotateZ(Math.PI / 2); fus.translate(0.27, 0, 0);
  pk.add(fus, white);
  for (const s of [-1, 1]) {
    pk.add(new THREE.BoxGeometry(0.36, 0.005, 0.0012), navy, {p: [-0.015, -0.006, s * 0.0338]});
    pk.add(new THREE.BoxGeometry(0.36, 0.0022, 0.0012), red, {p: [-0.015, -0.0105, s * 0.0335]});
  }
  for (let i = 0; i < 22; i++) for (const s of [-1, 1]) pk.add(new THREE.BoxGeometry(0.0055, 0.0045, 0.001), dark, {p: [-0.17 + i * 0.0145, 0.009, s * 0.0335]});
  for (const s of [-1, 1]) pk.add(new THREE.BoxGeometry(0.012, 0.006, 0.001), dark, {p: [0.245, 0.012, s * 0.02], r: [0, s * 0.5, 0]});
  pk.add(new THREE.BoxGeometry(0.008, 0.005, 0.03), dark, {p: [0.251, 0.014, 0], r: [0, 0, 0.5]});
  const wingShape = new THREE.Shape(); wingShape.moveTo(0.05, 0); wingShape.lineTo(-0.04, 0); wingShape.lineTo(-0.11, 0.25); wingShape.lineTo(-0.085, 0.25); wingShape.closePath();
  for (const s of [-1, 1]) {
    const wg = new THREE.ExtrudeGeometry(wingShape, {depth: 0.007, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1});
    wg.rotateX(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    pk.add(wg, grey, {p: [0.02, -0.012, 0], r: [s * 0.05, 0, 0]});
    const tip = new THREE.BoxGeometry(0.022, 0.03, 0.003); pk.add(tip, white, {p: [-0.1, 0.0, s * 0.25], r: [0, 0, -0.35]});
    pk.add(new THREE.CylinderGeometry(0.016, 0.014, 0.06, 20), engine, {p: [0.01, -0.035, s * 0.085], r: [0, 0, Math.PI / 2]});
    pk.add(new THREE.CircleGeometry(0.014, 20), intake, {p: [0.0405, -0.035, s * 0.085], r: [0, Math.PI / 2, 0]});
    pk.add(new THREE.BoxGeometry(0.03, 0.02, 0.004), grey, {p: [0.012, -0.022, s * 0.085]});
    const stab = new THREE.Shape(); stab.moveTo(0.02, 0); stab.lineTo(-0.02, 0); stab.lineTo(-0.05, 0.09); stab.lineTo(-0.035, 0.09); stab.closePath();
    const sg = new THREE.ExtrudeGeometry(stab, {depth: 0.004, bevelEnabled: false}); sg.rotateX(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    pk.add(sg, grey, {p: [-0.23, 0.008, 0]});
  }
  const fin = new THREE.Shape(); fin.moveTo(0.03, 0); fin.lineTo(-0.035, 0); fin.lineTo(-0.075, 0.105); fin.lineTo(-0.045, 0.105); fin.closePath();
  const fg = new THREE.ExtrudeGeometry(fin, {depth: 0.005, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1}); fg.translate(0, 0, -0.0025);
  pk.add(fg, red, {p: [-0.2, 0.02, 0]});
  for (const s of [-1, 1]) pk.add(L.geometry(L.plate('HS', {bg: '#b8352c', fg: '#f3e1b6', size: 70}), 0.034, 0.02), L.mat, {p: [-0.235, 0.075, s * 0.0055], r: [0, s < 0 ? Math.PI : 0, 0]});
  pk.add(new THREE.SphereGeometry(0.0035, 8, 6), material(resources, 'nav-light-red', '#ff4d4d', {emissive: '#ff2a2a', emissiveIntensity: 1}), {p: [-0.1, 0.0, -0.25]});
  pk.add(new THREE.SphereGeometry(0.0035, 8, 6), material(resources, 'nav-light-green', '#4dff7a', {emissive: '#18d052', emissiveIntensity: 1}), {p: [-0.1, 0.0, 0.25]});
  const planeMeshes = pk.build(plane);
  return {plane, meshes: planeMeshes};
}

function drawBoardingPass(c, w, h) {
    c.fillStyle = '#f6f1e4'; c.fillRect(0, 0, w, h); c.fillStyle = '#22365e'; c.fillRect(0, 0, w, 26);
    c.fillStyle = '#f6f1e4'; c.font = '700 18px Georgia, serif'; c.textAlign = 'left'; c.fillText('BOARDING PASS', 12, 19);
    c.fillStyle = '#2a2a2a'; c.font = '700 30px Georgia, serif'; c.fillText('CHINA', 14, 64); c.fillText('USA', 150, 64);
    c.font = '600 22px Georgia, serif'; c.fillText('→', 118, 62); c.font = '500 16px Georgia, serif'; c.fillText('2013 · one way to high school', 14, 92);
    for (let i = 0; i < 26; i++) { c.fillRect(150 + i * 4, 98, i % 3 ? 2 : 1, 22); }
    c.setLineDash([3, 3]); c.strokeStyle = '#999'; c.beginPath(); c.moveTo(140, 28); c.lineTo(140, 92); c.stroke();
}

function drawFlags(c, w, h) {
    const fw = w / 2 - 6;
    c.fillStyle = '#de2910'; c.fillRect(0, 0, fw, h);
    const starAt = (x, y, r, rot = 0) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.4 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); };
    c.fillStyle = '#ffde00'; starAt(fw * 0.17, h * 0.27, h * 0.15);
    [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]].forEach(([x, y]) => starAt(fw * x, h * y, h * 0.05, 0.4));
    const ox = w / 2 + 6, sh = h / 13;
    for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#b22234'; c.fillRect(ox, i * sh, fw, sh + 0.5); }
    c.fillStyle = '#3c3b6e'; c.fillRect(ox, 0, fw * 0.4, sh * 7);
    c.fillStyle = '#ffffff'; for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) { c.beginPath(); c.arc(ox + 8 + q * (fw * 0.4 - 12) / 4, 6 + r * (sh * 7 - 10) / 3, 1.6, 0, 7); c.fill(); }
}

/* ------------------------------------------------------------------ */
/* 1. Two shores: Dalian and San Francisco in an open keepsake box      */
/* ------------------------------------------------------------------ */
export function buildTwoShores(parent, {resources, reduced = false, low = false} = {}) {
  const root = new THREE.Group(); root.name = 'keepsake-two-shores-box'; parent.add(root);
  const L = makeLabels(resources);
  const walnut = material(resources, 'walnut-box', '#5a3822', {roughness: 0.55});
  const brass = material(resources, 'brass', '#c9a24f', {metalness: 0.7, roughness: 0.32});
  const sand = material(resources, 'beach-sand', '#d9c597', {roughness: 0.9});
  const green = material(resources, 'hill-green', '#5f8a4e', {roughness: 0.85});
  const rock = material(resources, 'shore-rocks', '#7d7f80', {roughness: 0.9, flatShading: true});
  const white = material(resources, 'white-stone', '#f2efe8', {roughness: 0.6});
  const orange = material(resources, 'international-orange', '#c4482c', {roughness: 0.5});
  const cableMat = material(resources, 'cable', '#e9e4da', {roughness: 0.5});
  const deckMat = material(resources, 'deck-grey', '#7d7b78', {roughness: 0.8});
  const hull = material(resources, 'liner-hull', '#1e1f24', {roughness: 0.5});
  const red = material(resources, 'liner-red', '#b3302a', {roughness: 0.5});
  const windowMat = material(resources, 'lit-window', '#ffd99a', {emissive: '#ffb35c', emissiveIntensity: 0.7});
  const pastel = ['#e8b4b8', '#b8d8c8', '#f3d9a4', '#a8c4e0', '#e0c4e8'].map((c, i) => material(resources, 'painted-lady-' + i, c, {roughness: 0.7}));

  // the box, its open lid and brass corners
  const box = makeKit('keepsake-two-shores-box', resources);
  box.add(new THREE.BoxGeometry(0.42, 0.012, 0.26), walnut, {p: [0, 0.006, 0]});
  box.add(new THREE.BoxGeometry(0.42, 0.046, 0.012), walnut, {p: [0, 0.029, 0.124]});
  box.add(new THREE.BoxGeometry(0.42, 0.046, 0.012), walnut, {p: [0, 0.029, -0.124]});
  for (const s of [-1, 1]) box.add(new THREE.BoxGeometry(0.012, 0.046, 0.236), walnut, {p: [s * 0.204, 0.029, 0]});
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box.add(new THREE.BoxGeometry(0.018, 0.05, 0.018), brass, {p: [sx * 0.205, 0.027, sz * 0.125]});
  for (const sz of [-1, 1]) box.add(new THREE.BoxGeometry(0.43, 0.004, 0.016), brass, {p: [0, 0.0535, sz * 0.127]});
  for (const sx of [-1, 1]) box.add(new THREE.BoxGeometry(0.016, 0.004, 0.27), brass, {p: [sx * 0.207, 0.0535, 0]});
  for (const s of [-1, 1]) box.add(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 10), brass, {p: [s * 0.13, 0.054, -0.132], r: [0, 0, Math.PI / 2]});
  box.build(root);
  // the lid stands open behind, with a hand-drawn chart of the Pacific inside
  const lid = new THREE.Group(); lid.position.set(0, 0.054, -0.132); lid.rotation.x = -0.22; root.add(lid);
  const lidKit = makeKit('keepsake-two-shores-lid', resources);
  lidKit.add(new THREE.BoxGeometry(0.42, 0.26, 0.012), walnut, {p: [0, 0.13, -0.006]});
  for (const sx of [-1, 1]) for (const sy of [0.004, 0.256]) lidKit.add(new THREE.BoxGeometry(0.02, 0.008, 0.014), brass, {p: [sx * 0.2, sy, -0.006]});
  const chartUV = L.custom((c, w, h) => drawPacificChart(c, w, h));
  lidKit.add(L.geometry(chartUV, 0.39, 0.23), L.mat, {p: [0, 0.13, 0.0004]});
  lidKit.build(lid);

  // the sea, gently moving
  const seaUniforms = {uTime: {value: 0}};
  const seaMat = new THREE.MeshStandardMaterial({name: 'keepsake-two-shores-sea', color: '#1e6176', roughness: 0.22, metalness: 0.15});
  seaMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = seaUniforms.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += 0.0016 * sin(position.x * 90.0 + uTime * 2.2) + 0.001 * sin(position.y * 140.0 - uTime * 1.7);');
  };
  seaMat.customProgramCacheKey = () => 'keepsake-sea-waves-v1'; resources?.add(seaMat);
  const seaGeo = new THREE.PlaneGeometry(0.392, 0.232, low ? 24 : 48, low ? 14 : 28); seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, seaMat); sea.position.y = 0.031; sea.name = 'keepsake-two-shores-sea'; sea.receiveShadow = true; root.add(sea); resources?.add(seaGeo);

  // Dalian: a seaside city, a white bay bridge, rocks and a scallop shell
  const dalian = makeKit('keepsake-dalian-shore', resources);
  land(dalian, [[-0.196, -0.114], [-0.09, -0.114], [-0.072, -0.07], [-0.088, -0.02], [-0.07, 0.02], [-0.096, 0.07], [-0.12, 0.112], [-0.196, 0.114]], {y: 0.026, h: 0.012, mat: sand});
  land(dalian, [[-0.196, -0.112], [-0.1, -0.112], [-0.086, -0.07], [-0.1, -0.02], [-0.085, 0.015], [-0.108, 0.06], [-0.13, 0.1], [-0.196, 0.1]], {y: 0.038, h: 0.006, mat: green});
  const dl = [[-0.18, -0.09, 0.034], [-0.165, -0.07, 0.022], [-0.15, -0.095, 0.046], [-0.135, -0.075, 0.03], [-0.172, -0.045, 0.026], [-0.152, -0.05, 0.038], [-0.128, -0.045, 0.02], [-0.118, -0.085, 0.028]];
  dl.forEach(([x, z, h], i) => {
    dalian.add(new THREE.BoxGeometry(0.012, h, 0.012), i % 3 ? white : material(resources, 'dalian-cream', '#e7dcc4'), {p: [x, 0.046 + h / 2, z]});
    for (let k = 0; k < Math.floor(h / 0.008); k++) dalian.add(new THREE.BoxGeometry(0.0125, 0.0018, 0.004), windowMat, {p: [x, 0.05 + k * 0.008, z + 0.0045]});
  });
  for (let i = 0; i < 7; i++) dalian.add(new THREE.DodecahedronGeometry(0.004 + (i % 3) * 0.002, 0), rock, {p: [-0.085 - (i % 4) * 0.006, 0.034, 0.03 + i * 0.012], r: [i, i * 2, 0]});
  const shell = new THREE.CircleGeometry(0.008, 10, 0, Math.PI); shell.rotateX(-Math.PI / 2 + 0.25);
  dalian.add(shell, material(resources, 'scallop-shell', '#f0c3a2', {side: THREE.DoubleSide}), {p: [-0.15, 0.0462, 0.09]});
  miniBridge(dalian, {x0: -0.128, x1: -0.03, z: 0.085, y: 0.038, towerH: 0.034, color: white, cable: cableMat, deck: deckMat});
  dalian.add(new THREE.DodecahedronGeometry(0.008, 0), rock, {p: [-0.03, 0.032, 0.085]});
  const dalianMeshes = dalian.build(root);

  // San Francisco: hills, painted ladies, a cable car and the orange bridge
  const sf = makeKit('keepsake-san-francisco-shore', resources);
  land(sf, [[0.196, -0.114], [0.095, -0.114], [0.08, -0.06], [0.094, -0.01], [0.078, 0.03], [0.1, 0.075], [0.13, 0.112], [0.196, 0.114]], {y: 0.026, h: 0.012, mat: sand});
  land(sf, [[0.196, -0.112], [0.104, -0.112], [0.092, -0.06], [0.104, -0.01], [0.09, 0.028], [0.11, 0.07], [0.135, 0.1], [0.196, 0.1]], {y: 0.038, h: 0.006, mat: green});
  for (const [x, z, r, h] of [[0.16, -0.07, 0.035, 0.022], [0.125, -0.04, 0.025, 0.014], [0.175, 0.01, 0.03, 0.018]]) {
    const hill = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); hill.scale(1, h / r, 0.8);
    sf.add(hill, green, {p: [x, 0.044, z]});
  }
  pastel.forEach((m, i) => {
    const x = 0.118 + i * 0.013, y = 0.044 + 0.006 + i * 0.0025, z = 0.05;
    sf.add(new THREE.BoxGeometry(0.011, 0.014, 0.012), m, {p: [x, y, z]});
    const roof = new THREE.CylinderGeometry(0.0001, 0.0085, 0.008, 3); roof.rotateZ(Math.PI / 2); roof.rotateY(Math.PI / 2);
    sf.add(roof, material(resources, 'lady-roof', '#6a4e44'), {p: [x, y + 0.011, z]});
    sf.add(new THREE.BoxGeometry(0.004, 0.005, 0.001), windowMat, {p: [x, y + 0.001, z + 0.0062]});
  });
  sf.add(new THREE.BoxGeometry(0.06, 0.0008, 0.0015), deckMat, {p: [0.14, 0.053, 0.072], r: [0, 0, 0.24]});
  const carRed = material(resources, 'cable-car-red', '#a8322b');
  sf.add(new THREE.BoxGeometry(0.014, 0.008, 0.007), carRed, {p: [0.15, 0.06, 0.072], r: [0, 0, 0.24]});
  sf.add(new THREE.BoxGeometry(0.013, 0.0035, 0.0072), material(resources, 'cable-car-cream', '#efe0b8'), {p: [0.1505, 0.063, 0.072], r: [0, 0, 0.24]});
  miniBridge(sf, {x0: 0.03, x1: 0.125, z: 0.088, y: 0.038, towerH: 0.042, color: orange, cable: orange, deck: deckMat});
  sf.add(new THREE.DodecahedronGeometry(0.009, 0), rock, {p: [0.03, 0.032, 0.088]});
  const sfMeshes = sf.build(root);

  // a flight route across the Pacific: a brass wire with white dashes, and the 2013 plane riding it
  const routeCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.12, 0.072, -0.03), new THREE.Vector3(-0.06, 0.135, -0.055), new THREE.Vector3(0.0, 0.152, -0.06), new THREE.Vector3(0.06, 0.135, -0.055), new THREE.Vector3(0.125, 0.074, -0.03)]);
  const rk = makeKit('keepsake-flight-route', resources);
  rk.add(new THREE.TubeGeometry(routeCurve, 64, 0.0009, 5, false), brass);
  for (let i = 1; i < 30; i += 2) {
    const a = routeCurve.getPointAt(i / 30), b = routeCurve.getPointAt((i + 0.8) / 30), d = b.clone().sub(a), dash = new THREE.CylinderGeometry(0.0016, 0.0016, d.length(), 6);
    dash.translate(0, d.length() / 2, 0); dash.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    rk.add(dash, white, {p: a.toArray()});
  }
  for (const end of [0, 1]) { const e = routeCurve.getPointAt(end); rk.add(new THREE.CylinderGeometry(0.0009, 0.0011, e.y - 0.044, 6), brass, {p: [e.x, (e.y + 0.044) / 2, e.z]}); rk.add(new THREE.SphereGeometry(0.003, 10, 8), brass, {p: e.toArray()}); }
  const routeMeshes = rk.build(root);
  const airliner = makeAirliner(resources, L);
  const jet = airliner.plane; jet.scale.setScalar(0.12); root.add(jet);
  // two little flags on the two shores, and the 2013 boarding pass
  const flagsUV = L.custom(drawFlags);
  const fk = makeKit('keepsake-shore-flags', resources);
  for (const [s, x, z] of [[-1, -0.178, 0.02], [1, 0.182, -0.03]]) {
    fk.add(new THREE.CylinderGeometry(0.0007, 0.0007, 0.05, 6), brass, {p: [x, 0.069, z]});
    const half = L.geometry([flagsUV[0] + (s < 0 ? 0 : flagsUV[2] / 2), flagsUV[1], flagsUV[2] / 2, flagsUV[3]], 0.026, 0.017);
    fk.add(half, L.mat, {p: [x + 0.0135, 0.0855, z]});
  }
  fk.build(root);
  const pass = new THREE.Mesh(L.geometry(L.custom(drawBoardingPass), 0.06, 0.03), L.mat); pass.name = 'keepsake-boarding-pass-2013';
  pass.position.set(-0.165, 0.047, 0.058); pass.rotation.set(-Math.PI / 2 + 0.18, 0, 0.35); root.add(pass); resources?.add(pass.geometry);
  const passCard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.0008), material(resources, 'pass-card', '#e8e1cf')); passCard.position.copy(pass.position); passCard.rotation.copy(pass.rotation); passCard.translateZ(-0.0006); root.add(passCard); resources?.add(passCard.geometry);
  const ship = new THREE.Group(); ship.name = 'keepsake-1920s-ocean-liner'; root.add(ship);
  const sk = makeKit('keepsake-ocean-liner', resources);
  const hullShape = new THREE.Shape(); hullShape.moveTo(-0.026, 0.0); hullShape.lineTo(0.022, 0.0); hullShape.lineTo(0.03, 0.009); hullShape.lineTo(-0.028, 0.009); hullShape.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {depth: 0.01, bevelEnabled: false}); hullGeo.translate(0, 0, -0.005);
  sk.add(hullGeo, hull);
  sk.add(new THREE.BoxGeometry(0.05, 0.0025, 0.0102), red, {p: [0, 0.001, 0]});
  sk.add(new THREE.BoxGeometry(0.03, 0.006, 0.008), white, {p: [-0.002, 0.012, 0]});
  sk.add(new THREE.BoxGeometry(0.018, 0.004, 0.006), white, {p: [-0.004, 0.017, 0]});
  for (const x of [-0.01, 0.004]) { sk.add(new THREE.CylinderGeometry(0.0022, 0.0024, 0.011, 10), red, {p: [x, 0.023, 0]}); sk.add(new THREE.CylinderGeometry(0.0023, 0.0023, 0.003, 10), hull, {p: [x, 0.0295, 0]}); }
  for (let i = 0; i < 6; i++) sk.add(new THREE.BoxGeometry(0.0022, 0.0015, 0.0003), windowMat, {p: [-0.014 + i * 0.0045, 0.012, 0.0041]});
  sk.add(new THREE.CylinderGeometry(0.0004, 0.0004, 0.022, 4), deckMat, {p: [0.018, 0.02, 0]});
  sk.add(new THREE.CylinderGeometry(0.0004, 0.0004, 0.02, 4), deckMat, {p: [-0.022, 0.019, 0]});
  const shipMeshes = sk.build(ship);
  const smokeMat = material(resources, 'liner-smoke', '#cfd3d8', {transparent: true, opacity: 0.6, roughness: 1});
  const smoke = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.003 + i * 0.0012, 8, 6), smokeMat); ship.add(m); resources?.add(m.geometry); return m; });
  const seaPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.07, 0.034, -0.02), new THREE.Vector3(-0.02, 0.034, -0.045), new THREE.Vector3(0.03, 0.034, -0.04), new THREE.Vector3(0.075, 0.034, -0.015)]);

  // brass name plates on the front of the box
  const plates = makeKit('keepsake-two-shores-plates', resources);
  plates.add(L.geometry(L.plate('DALIAN', {sub: '大连 · my hometown'}), 0.12, 0.03), L.mat, {p: [-0.11, 0.029, 0.1306]});
  plates.add(L.geometry(L.plate('SAN FRANCISCO', {size: 27, sub: 'a familiar feeling'}), 0.12, 0.03), L.mat, {p: [0.11, 0.029, 0.1306]});
  plates.build(root);

  let travel = 0, flight = 0;
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  function animate(t, dt, page) {
    seaUniforms.uTime.value = reduced ? 0 : t;
    const sailing = page === 'thread';
    travel = sailing ? Math.min(1, travel + (dt || 0) / 4.5) : 0;
    const u = sailing ? (reduced ? 1 : travel) : 0.18;
    seaPath.getPointAt(u, tmp); seaPath.getTangentAt(u, tan);
    ship.position.copy(tmp); ship.position.y += reduced ? 0 : Math.sin(t * 2.4) * 0.0008;
    ship.rotation.set(reduced ? 0 : Math.sin(t * 1.9) * 0.05, -Math.atan2(tan.z, tan.x), 0);
    smoke.forEach((m, i) => { const k = ((t * 0.5 + i / 3) % 1); m.position.set(-0.003 - k * 0.02, 0.031 + k * 0.016, 0); m.scale.setScalar(0.6 + k * 1.2); });
    const flying = page === 'flight' || page === 'boarding';
    flight = flying ? Math.min(1, flight + (dt || 0) / 5.5) : 0;
    const v = flying ? (reduced ? 1 : flight) : 0.5;
    routeCurve.getPointAt(v, tmp); routeCurve.getTangentAt(v, tan);
    jet.position.copy(tmp); jet.position.y += 0.0045;
    jet.rotation.set(reduced ? 0 : Math.sin(t * 1.4) * 0.08, -Math.atan2(tan.z, tan.x), Math.atan2(tan.y, Math.hypot(tan.x, tan.z)));
  }
  animate(0, 0, null);
  return {root, objects: {shores: [...dalianMeshes, ...sfMeshes], flight: [...airliner.meshes, ...routeMeshes], boarding: [pass, passCard], thread: [...shipMeshes]}, animate};
}

function drawPacificChart(c, w, h) {
  c.fillStyle = '#e8dcbc'; c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); g.addColorStop(0, 'rgba(120,160,170,0.25)'); g.addColorStop(1, 'rgba(90,70,40,0.25)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(80,60,40,0.25)'; c.lineWidth = 1;
  for (let x = 16; x < w; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 12; y < h; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.fillStyle = '#b9a67a'; c.strokeStyle = '#6d5636'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 18); c.quadraticCurveTo(38, 30, 30, 60); c.quadraticCurveTo(46, 74, 34, 96); c.lineTo(20, 128); c.lineTo(0, 128); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(w, 12); c.quadraticCurveTo(w - 30, 34, w - 36, 64); c.quadraticCurveTo(w - 30, 92, w - 44, 128); c.lineTo(w, 128); c.closePath(); c.fill(); c.stroke();
  c.setLineDash([5, 5]); c.strokeStyle = '#8a3324'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(36, 78); c.bezierCurveTo(90, 24, 166, 24, w - 38, 70); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#8a3324'; c.beginPath(); c.arc(36, 78, 4, 0, 7); c.fill(); c.beginPath(); c.arc(w - 38, 70, 4, 0, 7); c.fill();
  c.fillStyle = '#4a3a26'; c.font = 'italic 600 15px Georgia, serif'; c.textAlign = 'center';
  c.fillText('Pacific', w / 2, h * 0.62);
  c.font = '600 11px Georgia, serif'; c.fillText('Dalian', 36, 96); c.fillText('San Francisco', w - 44, 88);
  c.strokeStyle = '#6d5636'; c.lineWidth = 1.5; const cx = w * 0.5, cy = h * 0.84;
  c.beginPath(); c.arc(cx, cy, 10, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(cx, cy - 14); c.lineTo(cx + 3, cy); c.lineTo(cx, cy + 14); c.lineTo(cx - 3, cy); c.closePath(); c.stroke();
}

/* ------------------------------------------------------------------ */
/* 2. Two crossings with cats: a relief map of America                  */
/* ------------------------------------------------------------------ */
const US_OUTLINE = [
  [-124.7, 48.4], [-124.0, 46.3], [-124.1, 43.5], [-124.4, 42.0], [-124.2, 40.4], [-123.8, 39.0], [-122.5, 37.8], [-121.9, 36.6], [-120.6, 34.6], [-118.4, 34.0], [-117.1, 32.5],
  [-114.7, 32.7], [-111.0, 31.3], [-108.2, 31.3], [-106.5, 31.8], [-104.5, 29.6], [-103.2, 29.0], [-101.4, 29.8], [-99.5, 27.5], [-97.4, 25.9],
  [-97.4, 27.8], [-94.8, 29.3], [-93.8, 29.7], [-91.0, 29.2], [-89.4, 29.0], [-89.6, 30.2], [-88.0, 30.4], [-85.0, 29.7], [-83.0, 29.0], [-82.7, 27.6], [-81.8, 26.1], [-80.9, 25.1], [-80.1, 26.6], [-80.6, 28.5], [-81.4, 30.7],
  [-80.9, 32.0], [-79.0, 33.6], [-77.9, 34.2], [-75.5, 35.3], [-76.0, 36.9], [-75.5, 38.4], [-74.0, 39.9], [-74.0, 40.6], [-71.9, 41.3], [-70.0, 41.6], [-70.7, 42.6], [-70.2, 43.6], [-67.0, 44.8],
  [-67.8, 47.1], [-69.2, 47.4], [-71.5, 45.0], [-74.9, 45.0], [-76.4, 44.2], [-79.1, 43.3], [-79.0, 42.8], [-82.5, 41.7], [-83.1, 42.3], [-82.5, 43.0], [-82.4, 45.0], [-84.5, 46.5], [-88.3, 48.3], [-89.6, 48.0], [-95.2, 49.0], [-123.0, 49.0], [-123.3, 48.3]
];
const LAKES = [[-87.5, 47.6, 3.4, 0.75, -0.15], [-87.0, 43.9, 0.6, 1.9, 0.1], [-82.3, 44.9, 0.9, 1.1, 0.3], [-81.3, 42.2, 1.8, 0.45, 0.35], [-77.8, 43.6, 1.3, 0.35, 0]];
const PLACES = {sf: [-122.4, 37.8], chicago: [-87.6, 41.9], dc: [-77.0, 38.9], texas: [-98.8, 31.4]};
const ROUTES = {
  north: [[-122.4, 37.8], [-121.3, 38.7], [-119.8, 39.6], [-115.5, 40.7], [-111.9, 40.8], [-106.5, 41.2], [-100.5, 41.0], [-95.9, 41.3], [-91.0, 41.6], [-87.6, 41.9], [-84.0, 41.5], [-80.0, 40.4], [-77.0, 38.9]],
  south: [[-77.0, 38.9], [-80.5, 37.0], [-85.0, 35.6], [-90.2, 34.6], [-94.8, 32.9], [-98.8, 31.4], [-103.5, 32.4], [-108.0, 33.6], [-112.5, 34.8], [-116.6, 35.4], [-119.6, 36.6], [-122.4, 37.8]]
};
const CAT_COLORS = {dahuang: '#e39a4a', xiaohei: '#6e6e72', xiaoheihei: '#1d1d22', tuanzi: '#efe4cf', guozi: '#b8bcc4', jinbingbing: '#d9b26a'};
const TRIP_CATS = {north: ['dahuang', 'xiaohei', 'xiaoheihei', 'tuanzi'], south: ['dahuang', 'xiaohei', 'xiaoheihei', 'tuanzi', 'guozi', 'jinbingbing']};

export function buildRoadTrips(parent, {resources, reduced = false, low = false} = {}) {
  const root = new THREE.Group(); root.name = 'keepsake-two-crossings-map'; parent.add(root);
  const L = makeLabels(resources);
  const k = 0.40 / (58 * COS), mapY = 0.027, top = 0.0293;
  const P = ([lon, lat], y = mapY) => new THREE.Vector3((lon - LON0) * COS * k, y, -(lat - LAT0) * k);
  const wood = material(resources, 'map-board-walnut', '#5a3822', {roughness: 0.55});
  const brass = material(resources, 'map-brass', '#c9a24f', {metalness: 0.7, roughness: 0.32});
  const ocean = material(resources, 'map-ocean', '#2f5f78', {roughness: 0.75});
  const parchment = material(resources, 'map-parchment-land', '#e6d6ad', {roughness: 0.85});
  const lake = material(resources, 'map-lakes', '#4f86a0', {roughness: 0.5});
  const blue = material(resources, 'route-2021-blue', '#3c6fb4', {emissive: '#1d3b66', emissiveIntensity: 0.3});
  const green = material(resources, 'route-2025-green', '#3f9a62', {emissive: '#1b4a2e', emissiveIntensity: 0.3});
  const pinRed = material(resources, 'map-pin-red', '#b3302a', {roughness: 0.4});

  const board = makeKit('keepsake-map-board', resources);
  board.add(new THREE.BoxGeometry(0.5, 0.02, 0.3), wood, {p: [0, 0.01, 0]});
  board.add(new THREE.BoxGeometry(0.47, 0.004, 0.27), ocean, {p: [0, 0.021, 0]});
  for (const s of [-1, 1]) { board.add(new THREE.BoxGeometry(0.5, 0.008, 0.012), brass, {p: [0, 0.024, s * 0.144]}); board.add(new THREE.BoxGeometry(0.012, 0.008, 0.3), brass, {p: [s * 0.244, 0.024, 0]}); }
  // the country in relief, with its lakes
  const shape = new THREE.Shape(US_OUTLINE.map(ll => { const v = P(ll); return new THREE.Vector2(v.x, -v.z); }));
  const us = new THREE.ExtrudeGeometry(shape, {depth: 0.006, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2});
  us.rotateX(-Math.PI / 2); us.translate(0, 0.0215, 0); board.add(us, parchment);
  for (const [lon, lat, rx, rz, rot] of LAKES) { const c = new THREE.CircleGeometry(1, 20); c.rotateX(-Math.PI / 2); const v = P([lon, lat], top + 0.0004); board.add(c, lake, {p: v.toArray(), r: [0, rot, 0], s: [rx * COS * k, 1, rz * k]}); }
  // pins and a Texas star
  for (const id of ['sf', 'chicago', 'dc']) { const v = P(PLACES[id]); board.add(new THREE.CylinderGeometry(0.0008, 0.0008, 0.016, 6), brass, {p: [v.x, v.y + 0.008, v.z]}); board.add(new THREE.SphereGeometry(0.0042, 12, 8), pinRed, {p: [v.x, v.y + 0.017, v.z]}); }
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.0035 : 0.008; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const starGeo = new THREE.ExtrudeGeometry(star, {depth: 0.002, bevelEnabled: false}); starGeo.rotateX(-Math.PI / 2);
  const tx = P(PLACES.texas); board.add(starGeo, brass, {p: [tx.x, top + 0.0002, tx.z]});
  // printed place names and the two year plates
  const names = [['SF', 'sf', [-0.018, 0.012]], ['CHICAGO', 'chicago', [0.0, -0.014]], ['DC', 'dc', [0.016, 0.01]], ['TEXAS', 'texas', [0.0, 0.016]]];
  for (const [text, id, [dx, dz]] of names) { const v = P(PLACES[id], top + 0.0006); const g = L.geometry(L.plate(text, {bg: '#efe4c8', fg: '#3a2a12', size: 54}), 0.034, 0.012); g.rotateX(-Math.PI / 2); board.add(g, L.mat, {p: [v.x + dx, v.y, v.z + dz]}); }
  board.add(L.geometry(L.plate('2021', {sub: 'SF to DC · north'}), 0.09, 0.026), L.mat, {p: [-0.1, 0.012, 0.1505]});
  board.add(L.geometry(L.plate('2025', {sub: 'DC to SF · south'}), 0.09, 0.026), L.mat, {p: [0.1, 0.012, 0.1505]});
  board.add(new THREE.BoxGeometry(0.018, 0.004, 0.003), blue, {p: [-0.16, 0.012, 0.1515]});
  board.add(new THREE.BoxGeometry(0.018, 0.004, 0.003), green, {p: [0.16, 0.012, 0.1515]});
  board.build(root);

  // the two routes, raised, with paw prints that appear as the car drives
  const routes = {}, pawGeo = (() => {
    const g = [], pad = new THREE.CircleGeometry(0.0022, 10); pad.scale(1, 0.85, 1); g.push(pad);
    for (let i = 0; i < 4; i++) { const t = new THREE.CircleGeometry(0.0009, 8); t.translate((i - 1.5) * 0.0016, 0.0024 + (i === 0 || i === 3 ? -0.0004 : 0), 0); g.push(t); }
    const m = mergeGeometries(g.map(x => x.toNonIndexed()), false); g.forEach(x => x.dispose()); m.rotateX(-Math.PI / 2); return m;
  })();
  resources?.add(pawGeo);
  for (const [key, pts] of Object.entries(ROUTES)) {
    const curve = new THREE.CatmullRomCurve3(pts.map(ll => P(ll, top + 0.0016 + (key === 'south' ? 0.0004 : 0))), false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, low ? 60 : 120, 0.0014, 6, false), key === 'north' ? blue : green);
    tube.name = 'keepsake-route-' + key; tube.castShadow = true; root.add(tube); resources?.add(tube.geometry);
    const n = low ? 14 : 24, paws = new THREE.InstancedMesh(pawGeo, key === 'north' ? blue : green, n); paws.name = 'keepsake-paw-prints-' + key;
    const o = new THREE.Object3D(), p = new THREE.Vector3(), tt = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n; curve.getPointAt(u, p); curve.getTangentAt(u, tt);
      const side = i % 2 ? 1 : -1, nx = -tt.z * side * 0.006, nz = tt.x * side * 0.006;
      o.position.set(p.x + nx, top + 0.0007, p.z + nz); o.rotation.set(0, -Math.atan2(tt.z, tt.x) - Math.PI / 2, 0); o.scale.setScalar(0.0001); o.updateMatrix(); paws.setMatrixAt(i, o.matrix);
    }
    root.add(paws);
    routes[key] = {curve, tube, paws, n, base: Array.from({length: n}, (_, i) => { const m = new THREE.Matrix4(); paws.getMatrixAt(i, m); return m; })};
  }

  // the little car with the cats looking out of its windows
  const car = new THREE.Group(); car.name = 'keepsake-road-trip-car'; root.add(car);
  const ck = makeKit('keepsake-road-trip-car', resources);
  const body = material(resources, 'car-body', '#c94f3d', {roughness: 0.35, metalness: 0.25});
  const glass = material(resources, 'car-glass', '#9cc3d5', {roughness: 0.1, metalness: 0.3});
  const tyre = material(resources, 'car-tyres', '#1b1b1d', {roughness: 0.8});
  ck.add(new THREE.BoxGeometry(0.03, 0.007, 0.014), body, {p: [0, 0.0055, 0]});
  ck.add(new THREE.BoxGeometry(0.019, 0.007, 0.0125), glass, {p: [-0.003, 0.0125, 0]});
  ck.add(new THREE.BoxGeometry(0.02, 0.0012, 0.013), body, {p: [-0.003, 0.0162, 0]});
  ck.add(new THREE.BoxGeometry(0.016, 0.002, 0.01), material(resources, 'roof-rack', '#3b3b3f'), {p: [-0.003, 0.0178, 0]});
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.CylinderGeometry(0.0034, 0.0034, 0.0025, 12); w.rotateX(Math.PI / 2); ck.add(w, tyre, {p: [sx * 0.0095, 0.0034, sz * 0.0072]}); }
  ck.add(new THREE.BoxGeometry(0.001, 0.0022, 0.009), material(resources, 'headlights', '#fff2c4', {emissive: '#ffd27a', emissiveIntensity: 0.8}), {p: [0.0152, 0.0065, 0]});
  ck.build(car);
  const catHeads = {};
  for (const [id, color] of Object.entries(CAT_COLORS)) {
    const head = new THREE.Group(); head.name = 'keepsake-cat-' + id;
    const fur = material(resources, 'cat-' + id, color, {roughness: 0.9});
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 10, 8), fur); head.add(h);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.0011, 0.0022, 4), fur); ear.position.set(0, 0.0024, s * 0.0014); head.add(ear); }
    head.traverse(o => o.geometry && resources?.add(o.geometry));
    car.add(head); catHeads[id] = head;
  }
  function seatCats(trip) {
    const list = TRIP_CATS[trip] || TRIP_CATS.south;
    Object.values(catHeads).forEach(hd => { hd.visible = false; });
    list.forEach((id, i) => { const hd = catHeads[id]; hd.visible = true; const row = i % 2, col = Math.floor(i / 2); hd.position.set(0.004 - col * 0.0055, 0.0135, (row ? 1 : -1) * 0.0035); });
  }
  seatCats('south');

  let elapsed = 0, lastPage = null;
  const p = new THREE.Vector3(), tan = new THREE.Vector3(), scaleM = new THREE.Matrix4(), tmpM = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  function animate(t, dt, page) {
    const key = page === 'north' || page === 'south' ? page : null;
    if (key !== lastPage) { elapsed = 0; lastPage = key; seatCats(key || 'south'); }
    elapsed += dt || 0;
    const u = key ? (reduced ? 1 : Math.min(1, elapsed / 6)) : 0;
    const curve = routes[key || 'south'].curve;
    curve.getPointAt(key ? u : 1, p); curve.getTangentAt(key ? u : 0.999, tan);
    car.position.set(p.x, top + 0.0004, p.z);
    car.rotation.set(0, -Math.atan2(tan.z, tan.x), reduced ? 0 : Math.sin(t * 9) * 0.03 * (key && u < 1 ? 1 : 0));
    for (const [rk, r] of Object.entries(routes)) {
      const shown = rk === key ? Math.floor(u * r.n) : 0;
      for (let i = 0; i < r.n; i++) {
        r.base[i].decompose(pos, quat, scl);
        scl.setScalar(i < shown ? 1 : 0.0001);
        tmpM.compose(pos, quat, scl); r.paws.setMatrixAt(i, tmpM);
      }
      r.paws.instanceMatrix.needsUpdate = true;
      r.tube.material.emissiveIntensity = rk === key ? 0.9 : 0.3;
    }
  }
  animate(0, 0, null);
  return {root, objects: {north: [routes.north.tube], south: [routes.south.tube]}, animate};
}

