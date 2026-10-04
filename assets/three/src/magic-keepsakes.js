import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Finely detailed keepsakes for the hidden stories: the two shores of Dalian
// and San Francisco, the cats' two road trips across America, the model
// plane from 2013, and the fork before the PhD (the UN or a wider view). Each builder works in its support's local space (y = 0 is
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

/* ------------------------------------------------------------------ */
/* 3. A fork before the PhD: the UN, the open book, and the way back   */
/* ------------------------------------------------------------------ */
export function buildUNCrossroads(parent, {resources, reduced = false, low = false} = {}) {
  const root = new THREE.Group(); root.name = 'keepsake-un-crossroads'; parent.add(root);
  const L = makeLabels(resources);
  const walnut = material(resources, 'fork-walnut', '#5a3822', {roughness: 0.55});
  const brass = material(resources, 'fork-brass', '#c9a24f', {metalness: 0.7, roughness: 0.32});
  const plaza = material(resources, 'fork-plaza', '#d8d2c4', {roughness: 0.85});
  const lawn = material(resources, 'fork-lawn', '#6f9a5e', {roughness: 0.9});
  const marble = material(resources, 'fork-marble', '#f1eee6', {roughness: 0.5});
  const roofGrey = material(resources, 'fork-roof', '#9aa3a8', {roughness: 0.6});
  const pole = material(resources, 'fork-flagpole', '#d7d9dc', {metalness: 0.6, roughness: 0.3});
  const pageMat = material(resources, 'fork-pages', '#f6efdc', {roughness: 0.9});
  const cover = material(resources, 'fork-book-cover', '#2f4f7a', {roughness: 0.6});
  const cap = material(resources, 'fork-cap', '#1f2329', {roughness: 0.7});
  const leftPath = material(resources, 'fork-path-un', '#e3c477', {emissive: '#8a6a1c', emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.4});
  const rightPath = material(resources, 'fork-path-phd', '#e3c477', {emissive: '#8a6a1c', emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.4});
  const kit = makeKit('keepsake-un-crossroads', resources), unKit = makeKit('keepsake-un-crossroads-un', resources), bookKit = makeKit('keepsake-un-crossroads-book', resources);
  const top = 0.024;
  // the base: walnut with a brass rim, a stone plaza and two little lawns
  kit.add(new THREE.BoxGeometry(0.32, 0.022, 0.22), walnut, {p: [0, 0.011, 0]});
  for (const sz of [-1, 1]) kit.add(new THREE.BoxGeometry(0.322, 0.006, 0.006), brass, {p: [0, 0.023, sz * 0.108]});
  for (const sx of [-1, 1]) kit.add(new THREE.BoxGeometry(0.006, 0.006, 0.222), brass, {p: [sx * 0.158, 0.023, 0]});
  kit.add(new THREE.BoxGeometry(0.306, 0.003, 0.206), plaza, {p: [0, 0.0225, 0]});
  kit.add(new THREE.BoxGeometry(0.11, 0.003, 0.07), lawn, {p: [-0.09, 0.0235, 0.055]});
  kit.add(new THREE.BoxGeometry(0.11, 0.003, 0.07), lawn, {p: [0.09, 0.0235, 0.055]});
  kit.add(L.geometry(L.plate('A FORK', {size: 44, sub: 'before the PhD'}), 0.1, 0.026), L.mat, {p: [0, 0.012, 0.1105]});
  // the forking path: brass cobbles from the front, splitting left to the UN and right to the book
  const cobble = (kit2, mat, a, b, c, n) => { const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b), new THREE.Vector3(...c)); for (let i = 0; i < n; i++) { const p = curve.getPoint((i + 0.5) / n), tg = curve.getTangent((i + 0.5) / n); kit2.add(new THREE.BoxGeometry(0.009, 0.0016, 0.007), mat, {p: [p.x + (i % 2 ? 0.002 : -0.002), top + 0.0008, p.z], r: [0, -Math.atan2(tg.z, tg.x), 0]}); } };
  cobble(kit, plaza, [0, 0, 0.1], [0, 0, 0.075], [0, 0, 0.05], 4);
  const pathKit = makeKit('keepsake-un-crossroads-paths', resources);
  cobble(pathKit, leftPath, [0, 0, 0.05], [-0.04, 0, 0.04], [-0.075, 0, 0.0], low ? 7 : 11);
  cobble(pathKit, rightPath, [0, 0, 0.05], [0.04, 0, 0.04], [0.075, 0, 0.0], low ? 7 : 11);
  // a signpost at the fork
  kit.add(new THREE.CylinderGeometry(0.0022, 0.0026, 0.085, 8), walnut, {p: [0, top + 0.0425, 0.05]});
  kit.add(new THREE.SphereGeometry(0.004, 10, 8), brass, {p: [0, top + 0.087, 0.05]});
  const arrow = (text, dir, y) => {
    const uv = L.custom((c, w, h) => { c.fillStyle = '#efe1bd'; c.beginPath(); if (dir < 0) { c.moveTo(0, h / 2); c.lineTo(40, 6); c.lineTo(w - 6, 6); c.lineTo(w - 6, h - 6); c.lineTo(40, h - 6); } else { c.moveTo(w, h / 2); c.lineTo(w - 40, 6); c.lineTo(6, 6); c.lineTo(6, h - 6); c.lineTo(w - 40, h - 6); } c.closePath(); c.fill(); c.strokeStyle = '#7a5a2e'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#3a2a12'; c.font = '700 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2 + (dir < 0 ? 14 : -14), h / 2 + 2); });
    kit.add(new THREE.BoxGeometry(0.058, 0.019, 0.003), walnut, {p: [dir * 0.03, y, 0.05], r: [0, 0, 0]});
    kit.add(L.geometry(uv, 0.058, 0.019), L.mat, {p: [dir * 0.03, y, 0.0517]});
  };
  arrow('THE UN', -1, top + 0.07); arrow('A PhD', 1, top + 0.05);
  // the left side: a slim glass tower, a low hall with a curved roof, and a row of flags
  const facadeCanvas = document.createElement('canvas'); facadeCanvas.width = 64; facadeCanvas.height = 160;
  { const c = facadeCanvas.getContext('2d'); const g = c.createLinearGradient(0, 0, 64, 160); g.addColorStop(0, '#5f8fa0'); g.addColorStop(1, '#2f5566'); c.fillStyle = g; c.fillRect(0, 0, 64, 160);
    c.strokeStyle = 'rgba(220,235,240,0.55)'; c.lineWidth = 1; for (let x = 0; x <= 64; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 160); c.stroke(); } for (let y = 0; y <= 160; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(64, y); c.stroke(); }
    for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(255,214,140,0.85)'; c.fillRect(Math.floor(Math.random() * 16) * 4 + 1, Math.floor(Math.random() * 40) * 4 + 1, 3, 3); }
    c.fillStyle = 'rgba(200,210,214,0.9)'; for (const y of [52, 108]) c.fillRect(0, y, 64, 4); }
  const facadeTex = new THREE.CanvasTexture(facadeCanvas); facadeTex.colorSpace = THREE.SRGBColorSpace; resources?.add(facadeTex);
  const glass = material(resources, 'fork-curtain-wall', '#ffffff', {map: facadeTex, emissive: '#ffffff', emissiveMap: facadeTex, emissiveIntensity: 0.25, roughness: 0.2, metalness: 0.3});
  const tw = {x: -0.095, z: -0.055, w: 0.052, h: 0.135, d: 0.016};
  unKit.add(new THREE.BoxGeometry(tw.w, tw.h, tw.d), marble, {p: [tw.x, top + tw.h / 2, tw.z]});
  for (const sz of [1, -1]) { const f = new THREE.PlaneGeometry(tw.w * 0.94, tw.h * 0.97); if (sz < 0) f.rotateY(Math.PI); unKit.add(f, glass, {p: [tw.x, top + tw.h / 2, tw.z + sz * (tw.d / 2 + 0.0004)]}); }
  unKit.add(new THREE.BoxGeometry(tw.w + 0.002, 0.004, tw.d + 0.002), roofGrey, {p: [tw.x, top + tw.h + 0.002, tw.z]});
  unKit.add(new THREE.BoxGeometry(0.06, 0.016, 0.03), marble, {p: [-0.115, top + 0.008, -0.01]});
  const vault = new THREE.CylinderGeometry(0.015, 0.015, 0.06, 20, 1, false, 0, Math.PI); vault.rotateZ(Math.PI / 2); vault.rotateX(Math.PI / 2); vault.scale(1, 0.5, 1);
  unKit.add(vault, roofGrey, {p: [-0.115, top + 0.016, -0.01]});
  unKit.add(new THREE.SphereGeometry(0.006, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), roofGrey, {p: [-0.115, top + 0.023, -0.01]});
  const flags = [], flagColors = ['#5b92e5', '#d9534f', '#f0ad4e', '#5cb85c', '#ffffff', '#8e6bbf', '#2c7a7b'];
  for (let i = 0; i < 7; i++) {
    const x = -0.135 + i * 0.012, z = 0.018;
    unKit.add(new THREE.CylinderGeometry(0.0006, 0.0006, 0.05, 5), pole, {p: [x, top + 0.025, z]});
    const fm = material(resources, 'fork-flag-' + i, flagColors[i], {roughness: 0.8, side: THREE.DoubleSide});
    const fg = new THREE.PlaneGeometry(0.008, 0.005, 4, 1); fg.translate(0.004, 0, 0); resources?.add(fg);
    const fl = new THREE.Mesh(fg, fm); fl.position.set(x, top + 0.046, z); root.add(fl); flags.push(fl);
  }
  // the right side: an open book with an armillary sphere for a wider view, and a stack with a mortarboard
  const bx = 0.09, bz = -0.035;
  for (const sd of [-1, 1]) {
    bookKit.add(new THREE.BoxGeometry(0.04, 0.003, 0.05), cover, {p: [bx + sd * 0.0205, top + 0.0015, bz], r: [0, 0, sd * 0.08]});
    bookKit.add(new THREE.BoxGeometry(0.038, 0.007, 0.046), pageMat, {p: [bx + sd * 0.02, top + 0.0055, bz], r: [0, 0, sd * 0.1]});
    for (let k = 0; k < 4; k++) bookKit.add(new THREE.BoxGeometry(0.026 - k * 0.003, 0.0004, 0.0012), cap, {p: [bx + sd * 0.02, top + 0.0095 + sd * 0.0005, bz - 0.014 + k * 0.009]});
  }
  bookKit.add(new THREE.CylinderGeometry(0.0012, 0.0016, 0.03, 8), brass, {p: [bx, top + 0.022, bz]});
  const sphere = new THREE.Group(); sphere.position.set(bx, top + 0.055, bz); root.add(sphere);
  const ringGeo = new THREE.TorusGeometry(0.02, 0.0011, 6, 40); resources?.add(ringGeo);
  const rings = [[0, 0, 0], [Math.PI / 2, 0, 0], [0.4, 0, Math.PI / 2], [Math.PI / 2, 0.5, 0.3]].map(r => { const m = new THREE.Mesh(ringGeo, brass); m.rotation.set(...r); sphere.add(m); return m; });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 16, 12), material(resources, 'fork-tiny-earth', '#3f7fb0', {roughness: 0.5})); sphere.add(earth); resources?.add(earth.geometry);
  for (const [k, c] of [['#8a3f3a', 0], ['#3f6a4a', 1], ['#2f4f7a', 2]].entries()) bookKit.add(new THREE.BoxGeometry(0.03 - k * 0.003, 0.007, 0.022), material(resources, 'fork-stack-' + k, c[0]), {p: [0.12, top + 0.0035 + k * 0.007, 0.03], r: [0, k * 0.15, 0]});
  bookKit.add(new THREE.BoxGeometry(0.02, 0.0012, 0.02), cap, {p: [0.12, top + 0.025, 0.03], r: [0, 0.6, 0]});
  bookKit.add(new THREE.CylinderGeometry(0.006, 0.0065, 0.004, 12), cap, {p: [0.12, top + 0.0225, 0.03]});
  bookKit.add(new THREE.CylinderGeometry(0.0004, 0.0004, 0.01, 4), brass, {p: [0.128, top + 0.021, 0.034]});
  // the way back, told with objects: the tower's door stands half open with warm light inside, and two
  // lanyard badges from the PhD years (2024, 2025) stand on the PhD side of the fork
  const doorGlow = material(resources, 'fork-door-light', '#ffe2a8', {emissive: '#ffb75e', emissiveIntensity: 0.4, roughness: 0.6});
  const doorWood = material(resources, 'fork-door-leaf', '#6b4a2e', {roughness: 0.55});
  const doorKit = makeKit('keepsake-un-crossroads-door', resources), dz = tw.z + tw.d / 2 + 0.0006;
  doorKit.add(new THREE.PlaneGeometry(0.016, 0.026), doorGlow, {p: [tw.x, top + 0.013, dz]});
  for (const sx of [-1, 1]) doorKit.add(new THREE.BoxGeometry(0.002, 0.029, 0.003), brass, {p: [tw.x + sx * 0.009, top + 0.0145, dz + 0.001]});
  doorKit.add(new THREE.BoxGeometry(0.02, 0.002, 0.003), brass, {p: [tw.x, top + 0.0285, dz + 0.001]});
  const leaf = new THREE.Group(); leaf.position.set(tw.x - 0.008, top, dz + 0.001); root.add(leaf); leaf.rotation.y = -1.0;
  const leafMesh = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.026, 0.0016), doorWood); leafMesh.position.set(0.008, 0.013, 0); leaf.add(leafMesh); resources?.add(leafMesh.geometry);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 8, 6), brass); knob.position.set(0.0135, 0.012, 0.0012); leaf.add(knob); resources?.add(knob.geometry);
  doorKit.add(new THREE.BoxGeometry(0.03, 0.0015, 0.012), marble, {p: [tw.x, top + 0.00075, dz + 0.006]});
  const badgeKit = makeKit('keepsake-un-crossroads-badges', resources);
  const lanyard = material(resources, 'fork-lanyard', '#3a78c2', {roughness: 0.7});
  const badgeBack = material(resources, 'fork-badge-back', '#e9ecef', {roughness: 0.4});
  // each badge stands on its edge, leaning back a little, with its lanyard lying in a loop behind it
  const badge = (year, org, x, z, yaw) => {
    const uv = L.custom((c, w, h) => {
      c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a78c2'; c.fillRect(0, 0, w, h * 0.36);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${org.length > 8 ? 26 : 36}px Georgia, serif`; c.fillText(org, w / 2, h * 0.19);
      c.fillStyle = '#c9ccd2'; c.fillRect(20, h * 0.46, 44, 56); c.fillStyle = '#2a2a2a'; c.font = '700 58px Georgia, serif'; c.fillText(year, w * 0.6, h * 0.7);
      c.strokeStyle = '#3a78c2'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    });
    const w = 0.038, h = 0.019, lean = 0.28, cy = h / 2 * Math.cos(lean) + 0.0004;
    const card = L.geometry(uv, w, h); card.rotateX(-lean); card.rotateY(yaw);
    badgeKit.add(card, L.mat, {p: [x, top + cy, z]});
    const back = new THREE.BoxGeometry(w + 0.0012, h + 0.0012, 0.0012); back.translate(0, 0, -0.0007); back.rotateX(-lean); back.rotateY(yaw);
    badgeKit.add(back, badgeBack, {p: [x, top + cy, z]});
    const ty = cy + h / 2 * Math.cos(lean), tz = -h / 2 * Math.sin(lean);
    const pts = [[-0.002, ty + 0.0006, tz], [-0.006, ty + 0.003, tz - 0.004], [-0.009, 0.005, tz - 0.013], [-0.008, 0.0008, tz - 0.022], [0, 0.0008, tz - 0.027],
      [0.008, 0.0008, tz - 0.022], [0.009, 0.005, tz - 0.013], [0.006, ty + 0.003, tz - 0.004], [0.002, ty + 0.0006, tz]].map(q => new THREE.Vector3(...q));
    const strap = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0008, 4, false); strap.scale(1, 0.7, 1); strap.rotateY(yaw);
    badgeKit.add(strap, lanyard, {p: [x, top, z]});
    const clip = new THREE.BoxGeometry(0.004, 0.0025, 0.0016); clip.translate(0, ty, tz); clip.rotateY(yaw);
    badgeKit.add(clip, brass, {p: [x, top, z]});
  };
  badge('2024', 'UNODC', 0.072, 0.066, 0.18);
  badge('2025', 'UN PEACEKEEPING', 0.118, 0.078, -0.14);
  kit.build(root); const unMeshes = unKit.build(root), bookMeshes = bookKit.build(root), pathMeshes = pathKit.build(root), doorMeshes = doorKit.build(root), badgeMeshes = badgeKit.build(root);
  function animate(t, dt, page) {
    if (!reduced) { sphere.rotation.y = t * 0.4; rings[3].rotation.z = t * 0.6; flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.4 + i) * 0.5; f.scale.x = 1 - 0.1 * Math.abs(Math.sin(t * 3.1 + i)); }); }
    const pulse = reduced ? 1 : 0.6 + 0.4 * Math.sin(t * 3);
    leftPath.emissiveIntensity = page === 'opportunity' ? 0.55 * pulse : 0.1;
    rightPath.emissiveIntensity = page === 'choice' ? 0.55 * pulse : 0.1;
    doorGlow.emissiveIntensity = page === 'back' ? 1.4 * pulse : 0.4;
    lanyard.emissive?.set(page === 'back' ? '#1c4f8f' : '#000000');
    leaf.rotation.y = THREE.MathUtils.damp(leaf.rotation.y, page === 'back' ? -1.6 : -1.0, 4, dt || 0.016);
  }
  animate(0, 0, null);
  return {root, objects: {opportunity: [...unMeshes, ...flags], choice: [...bookMeshes, ...rings, earth], back: [...doorMeshes, leafMesh, ...badgeMeshes]}, animate};
}

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
  // mountains in relief: the Rockies and the Sierra in the west, the Appalachians in the east
  const peaks = material(resources, 'map-mountains', '#b9a27a', {roughness: 0.9, flatShading: true}), snow = material(resources, 'map-snowcaps', '#f6f2e8', {roughness: 0.8, flatShading: true});
  const rng = (() => { let n = 7; return () => { n = (n * 16807) % 2147483647; return n / 2147483647; }; })();
  const chain = (pts, count, size, capped) => { for (let i = 0; i < count; i++) { const f = i / (count - 1), seg = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1))), u = f * (pts.length - 1) - seg;
    const lon = THREE.MathUtils.lerp(pts[seg][0], pts[seg + 1][0], u) + (rng() - 0.5) * 2.2, lat = THREE.MathUtils.lerp(pts[seg][1], pts[seg + 1][1], u) + (rng() - 0.5) * 2.2;
    const v = P([lon, lat], top - 0.0004), h = size * (0.6 + rng() * 0.6), r = h * 0.85;
    board.add(new THREE.ConeGeometry(r, h, 5), peaks, {p: [v.x, v.y + h / 2, v.z], r: [0, rng() * 3, 0]});
    if (capped && h > size * 0.85) board.add(new THREE.ConeGeometry(r * 0.38, h * 0.38, 5), snow, {p: [v.x, v.y + h * 0.82, v.z], r: [0, rng() * 3, 0]}); } };
  chain([[-114, 48], [-110, 44], [-106.5, 40], [-106, 36]], low ? 10 : 18, 0.009, true);
  chain([[-121.5, 40.5], [-119.5, 37.5], [-118.3, 36]], low ? 4 : 6, 0.007, true);
  chain([[-84.5, 34.5], [-81.5, 37.5], [-78.5, 40], [-75.5, 42]], low ? 6 : 10, 0.005, false);
  // tiny landmarks: a Golden Gate at SF, a Chicago skyline, the Capitol and the Monument in DC, a cactus in Texas
  const gg = P(PLACES.sf), orange = material(resources, 'map-golden-gate', '#c4482c', {roughness: 0.5}), cable = material(resources, 'map-cable', '#e9e4da');
  miniBridge(board, {x0: gg.x - 0.012, x1: gg.x + 0.008, z: gg.z - 0.012, y: top + 0.002, towerH: 0.012, color: orange, cable, deck: orange, scale: 0.55});
  const ch = P(PLACES.chicago), steel = material(resources, 'map-skyline', '#5b6670', {roughness: 0.4, metalness: 0.3});
  for (const [dx, dz, h] of [[-0.007, -0.006, 0.014], [-0.002, -0.008, 0.02], [0.003, -0.006, 0.011], [0.007, -0.009, 0.016]]) board.add(new THREE.BoxGeometry(0.004, h, 0.004), steel, {p: [ch.x + dx, top + h / 2, ch.z + dz]});
  for (const dx of [-0.0012, 0.0012]) board.add(new THREE.CylinderGeometry(0.0003, 0.0003, 0.005, 4), steel, {p: [ch.x - 0.002 + dx, top + 0.0225, ch.z - 0.008]});
  const dc = P(PLACES.dc), marble = material(resources, 'map-marble', '#f2efe8', {roughness: 0.5});
  board.add(new THREE.BoxGeometry(0.012, 0.004, 0.006), marble, {p: [dc.x - 0.006, top + 0.002, dc.z - 0.008]});
  board.add(new THREE.CylinderGeometry(0.0022, 0.0026, 0.003, 12), marble, {p: [dc.x - 0.006, top + 0.0055, dc.z - 0.008]});
  board.add(new THREE.SphereGeometry(0.0024, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), marble, {p: [dc.x - 0.006, top + 0.007, dc.z - 0.008]});
  board.add(new THREE.CylinderGeometry(0.0009, 0.0013, 0.016, 4), marble, {p: [dc.x + 0.009, top + 0.008, dc.z - 0.004], r: [0, Math.PI / 4, 0]});
  board.add(new THREE.ConeGeometry(0.0009, 0.0016, 4), marble, {p: [dc.x + 0.009, top + 0.0168, dc.z - 0.004], r: [0, Math.PI / 4, 0]});
  const tx2 = P(PLACES.texas), cactus = material(resources, 'map-cactus', '#4f8a4e', {roughness: 0.8});
  board.add(new THREE.CylinderGeometry(0.0012, 0.0014, 0.012, 8), cactus, {p: [tx2.x - 0.016, top + 0.006, tx2.z - 0.006]});
  for (const sd of [-1, 1]) { board.add(new THREE.CylinderGeometry(0.0008, 0.0008, 0.004, 6), cactus, {p: [tx2.x - 0.016 + sd * 0.0022, top + 0.0055, tx2.z - 0.006], r: [0, 0, sd * Math.PI / 2]}); board.add(new THREE.CylinderGeometry(0.0008, 0.0008, 0.005, 6), cactus, {p: [tx2.x - 0.016 + sd * 0.0038, top + 0.0085, tx2.z - 0.006]}); }
  // a compass rose on the sea
  const rose = new THREE.Shape(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 4 === 0 ? 0.016 : i % 2 ? 0.004 : 0.009; i ? rose.lineTo(Math.cos(a) * r, Math.sin(a) * r) : rose.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const roseGeo = new THREE.ExtrudeGeometry(rose, {depth: 0.0012, bevelEnabled: false}); roseGeo.rotateX(-Math.PI / 2); board.add(roseGeo, brass, {p: [0.19, 0.0232, 0.095]});
  board.add(new THREE.TorusGeometry(0.012, 0.0007, 4, 32), brass, {p: [0.19, 0.0236, 0.095], r: [Math.PI / 2, 0, 0]});
  const nGeo = L.geometry(L.plate('N', {bg: '#2f5f78', fg: '#e9d8a6', size: 90}), 0.008, 0.006); nGeo.rotateX(-Math.PI / 2); board.add(nGeo, L.mat, {p: [0.19, 0.0236, 0.075]});
  // printed place names and the two year plates
  const names = [['SF', 'sf', [-0.024, 0.016]], ['CHICAGO', 'chicago', [0.006, 0.02]], ['DC', 'dc', [0.02, 0.014]], ['TEXAS', 'texas', [0.004, 0.022]]];
  for (const [text, id, [dx, dz]] of names) { const v = P(PLACES[id], top + 0.0006); const g = L.geometry(L.plate(text, {bg: '#efe4c8', fg: '#3a2a12', size: 54}), 0.05, 0.017); g.rotateX(-Math.PI / 2); board.add(g, L.mat, {p: [v.x + dx, v.y, v.z + dz]}); }
  const titleGeo = L.geometry(L.plate('TWO CROSSINGS', {bg: '#d9b65e', size: 40, sub: '46 of 50 states, and six cats'}), 0.15, 0.03); board.add(titleGeo, L.mat, {p: [0, 0.03, -0.1505], r: [-0.25, Math.PI, 0]});
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


// planar UVs so a tiling texture keeps its scale on every face of a box or slope
function planarUV(g, k) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay > ax && ay > az ? [p.getX(i), p.getZ(i)] : ax > az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
function tileTexture(resources, draw, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; resources?.add(t); return t;
}

/**
 * Hoosac School, upstate New York: a miniature of Tibbits Hall, the Gothic Revival stone house at the
 * heart of the campus (ashlar sandstone, steep fishscale slate gables, two towers, a bay window, a
 * porch and tall chimneys), with autumn maples, a red and purple pennant, a stone owl for the school
 * mascot, two students on the drive, and a painted backdrop where the city sits far down the road.
 */
export function buildHoosacNY(parent, {resources, reduced = false, low = false} = {}) {
  const root = new THREE.Group(); root.name = 'keepsake-hoosac-tibbits'; parent.add(root);
  const L = makeLabels(resources);
  const walnut = material(resources, 'ny-walnut', '#5a3822', {roughness: 0.55});
  const brass = material(resources, 'ny-brass', '#c9a24f', {metalness: 0.7, roughness: 0.32});
  const lawn = material(resources, 'ny-autumn-lawn', '#7d8c4c', {roughness: 0.95});
  const gravel = material(resources, 'ny-drive', '#cdbf9f', {roughness: 0.95});
  const ashlarTex = tileTexture(resources, (x, s) => {
    x.fillStyle = '#8f8068'; x.fillRect(0, 0, s, s);
    const rows = 8, h = s / rows;
    for (let r = 0; r < rows; r++) { let u = (r % 2) * -h * 0.8; while (u < s) { const w = h * (1.3 + ((r * 7 + Math.floor(u)) % 5) * 0.18); const l = 0.62 + (((r * 13 + Math.floor(u * 3)) % 9) / 9) * 0.16; x.fillStyle = `rgb(${Math.round(176 * l + 40)},${Math.round(160 * l + 34)},${Math.round(132 * l + 26)})`; x.fillRect(u + 2, r * h + 2, w - 4, h - 4); u += w; } }
  });
  const slateTex = tileTexture(resources, (x, s) => {
    x.fillStyle = '#2f323a'; x.fillRect(0, 0, s, s);
    const rows = 10, h = s / rows, w = s / 8;
    for (let r = 0; r < rows; r++) for (let k = -1; k <= 8; k++) {
      const cx = k * w + (r % 2) * w / 2, y0 = r * h, shade = 70 + ((r * 5 + k * 3) % 7) * 6, purple = r % 4 === 1 ? 12 : 0;
      x.fillStyle = `rgb(${shade + purple},${shade + 2},${shade + 12 + purple})`;
      x.beginPath(); if (r % 4 === 1 || r % 4 === 2) { x.moveTo(cx - w / 2 + 1, y0); x.lineTo(cx + w / 2 - 1, y0); x.lineTo(cx + w / 2 - 1, y0 + h * 0.6); x.arc(cx, y0 + h * 0.6, w / 2 - 1, 0, Math.PI); } else x.rect(cx - w / 2 + 1, y0, w - 2, h - 1.5);
      x.fill();
    }
  });
  const stone = material(resources, 'ny-ashlar-sandstone', '#ffffff', {map: ashlarTex, roughness: 0.85});
  const slate = material(resources, 'ny-fishscale-slate', '#ffffff', {map: slateTex, roughness: 0.6});
  const trim = material(resources, 'ny-stone-trim', '#c9bca2', {roughness: 0.8});
  const glass = material(resources, 'ny-lit-windows', '#ffdf9e', {emissive: '#ffb554', emissiveIntensity: 0.35, roughness: 0.3});
  const door = material(resources, 'ny-oak-door', '#4a2f1d', {roughness: 0.6});
  const hall = makeKit('keepsake-hoosac-tibbits-hall', resources), kit = makeKit('keepsake-hoosac-tibbits-grounds', resources);
  const friendsKit = makeKit('keepsake-hoosac-tibbits-friends', resources), cityKit = makeKit('keepsake-hoosac-tibbits-city', resources);
  const top = 0.026;
  // the base, the lawn and the drive up to the porch
  kit.add(new THREE.BoxGeometry(0.46, top, 0.3), walnut, {p: [0, top / 2, 0]});
  for (const sz of [-1, 1]) kit.add(new THREE.BoxGeometry(0.462, 0.006, 0.006), brass, {p: [0, top + 0.001, sz * 0.148]});
  for (const sx of [-1, 1]) kit.add(new THREE.BoxGeometry(0.006, 0.006, 0.302), brass, {p: [sx * 0.228, top + 0.001, 0]});
  kit.add(new THREE.BoxGeometry(0.448, 0.004, 0.288), lawn, {p: [0, top + 0.002, 0]});
  const drive = new THREE.Shape(); drive.moveTo(-0.045, -0.145); drive.bezierCurveTo(-0.02, -0.09, -0.06, -0.07, -0.04, -0.03); drive.lineTo(-0.018, -0.03); drive.bezierCurveTo(-0.035, -0.07, 0.0, -0.09, -0.015, -0.145); drive.closePath();
  const dg = new THREE.ShapeGeometry(drive, 8); dg.rotateX(-Math.PI / 2); kit.add(dg, gravel, {p: [0, top + 0.0045, 0], s: [1, 1, 1]});
  kit.add(L.geometry(L.plate('TIBBITS HALL', {size: 30, sub: 'Hoosac School · New York'}), 0.14, 0.028), L.mat, {p: [0, 0.013, 0.1505]});
  const ground = top + 0.004, H = -0.025, HZ = -0.035;
  const wall = (w, h, d, x, y, z) => hall.add(planarUV(new THREE.BoxGeometry(w, h, d), 40), stone, {p: [x, y + h / 2, z]});
  // a steep gable roof with fishscale slate on both slopes, stone gable ends and a ridge
  const gable = (len, span, rise, x, y, z, alongZ = false) => {
    const sh = new THREE.Shape(); sh.moveTo(-span / 2 - 0.004, 0); sh.lineTo(span / 2 + 0.004, 0); sh.lineTo(0, rise); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {depth: len, bevelEnabled: false}); g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2); if (alongZ) g.rotateY(Math.PI / 2);
    g.computeVertexNormals(); planarUV(g, 35);
    const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) if (Math.abs(n.getY(i)) > 0.2) uv.setXY(i, (alongZ ? p.getZ(i) : p.getX(i)) * 35, (p.getY(i) * 1.3 + (alongZ ? Math.abs(p.getX(i)) : Math.abs(p.getZ(i)))) * 35);
    hall.add(g, slate, {p: [x, y, z]});
    if (!alongZ) hall.add(new THREE.BoxGeometry(len + 0.004, 0.004, 0.004), trim, {p: [x, y + rise, z]});
  };
  const win = (x, y, z, w = 0.011, h = 0.018, face = 1, pointed = false, side = false) => {
    let g;
    if (pointed) { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h * 0.6); sh.quadraticCurveTo(w / 2, h * 0.9, 0, h); sh.quadraticCurveTo(-w / 2, h * 0.9, -w / 2, h * 0.6); sh.closePath(); g = new THREE.ShapeGeometry(sh, 4); }
    else { g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); }
    if (side) g.rotateY(face * Math.PI / 2); else if (face < 0) g.rotateY(Math.PI);
    hall.add(g, glass, {p: [x, y, z]});
    const lintel = new THREE.BoxGeometry(side ? 0.004 : w + 0.005, 0.0035, side ? w + 0.005 : 0.004);
    if (!pointed) hall.add(lintel, trim, {p: [x, y + h + 0.002, z]});
    hall.add(new THREE.BoxGeometry(side ? 0.004 : w + 0.004, 0.003, side ? w + 0.004 : 0.005), trim, {p: [x, y - 0.0015, z]});
  };
  const cx = -0.01;
  // the main block: one and a half storeys of ashlar under a steep roof
  wall(0.2, 0.062, 0.088, cx, ground, HZ); gable(0.214, 0.096, 0.072, cx, ground + 0.062, HZ);
  hall.add(new THREE.BoxGeometry(0.206, 0.006, 0.094), trim, {p: [cx, ground + 0.003, HZ]});
  for (const x of [-0.075, 0.07]) { win(cx + x, ground + 0.012, HZ + 0.0445); win(cx + x, ground + 0.04, HZ + 0.0445, 0.01, 0.014); }
  // the front gable wing with a tall pointed window
  wall(0.072, 0.062, 0.034, cx + 0.045, ground, HZ + 0.06); gable(0.04, 0.076, 0.064, cx + 0.045, ground + 0.062, HZ + 0.065, true);
  win(cx + 0.045, ground + 0.012, HZ + 0.0775, 0.024, 0.022); win(cx + 0.045, ground + 0.067, HZ + 0.0775, 0.014, 0.03, 1, true);
  // a polygonal bay window on the main front
  const bay = new THREE.CylinderGeometry(0.02, 0.02, 0.032, 6, 1, false, -Math.PI / 2, Math.PI); planarUV(bay, 40); hall.add(bay, stone, {p: [cx - 0.035, ground + 0.016, HZ + 0.044]});
  hall.add(new THREE.ConeGeometry(0.023, 0.014, 6, 1, false, -Math.PI / 2, Math.PI), slate, {p: [cx - 0.035, ground + 0.039, HZ + 0.044]});
  for (const a of [-0.9, 0, 0.9]) { const g = new THREE.PlaneGeometry(0.009, 0.018); g.translate(0, 0.009, 0); g.rotateY(a); hall.add(g, glass, {p: [cx - 0.035 + Math.sin(a) * 0.0185, ground + 0.007, HZ + 0.044 + Math.cos(a) * 0.0185]}); }
  // the arched porch over the front door, with steps
  wall(0.036, 0.04, 0.026, cx + 0.0, ground, HZ + 0.057); gable(0.03, 0.04, 0.03, cx, ground + 0.04, HZ + 0.06, true);
  const arch = new THREE.Shape(); arch.moveTo(-0.009, 0); arch.lineTo(0.009, 0); arch.lineTo(0.009, 0.018); arch.quadraticCurveTo(0.009, 0.027, 0, 0.031); arch.quadraticCurveTo(-0.009, 0.027, -0.009, 0.018); arch.closePath();
  hall.add(new THREE.ShapeGeometry(arch, 4), door, {p: [cx, ground, HZ + 0.0705]});
  hall.add(new THREE.CircleGeometry(0.004, 10, 0, Math.PI), glass, {p: [cx, ground + 0.022, HZ + 0.0708]});
  for (let k = 0; k < 2; k++) hall.add(new THREE.BoxGeometry(0.03 - k * 0.006, 0.004, 0.012 - k * 0.004), trim, {p: [cx, ground + 0.002 + k * 0.004, HZ + 0.077 - k * 0.002]});
  // the square tower with a steep pyramid roof, and the round tower with a cone
  wall(0.04, 0.118, 0.04, cx - 0.098, ground, HZ + 0.03);
  hall.add(new THREE.ConeGeometry(0.034, 0.07, 4, 1), slate, {p: [cx - 0.098, ground + 0.153, HZ + 0.03], r: [0, Math.PI / 4, 0]});
  for (const y of [0.014, 0.05, 0.088]) win(cx - 0.098, ground + y, HZ + 0.0505, 0.01, y > 0.08 ? 0.018 : 0.016, 1, y > 0.08);
  hall.add(new THREE.BoxGeometry(0.044, 0.004, 0.044), trim, {p: [cx - 0.098, ground + 0.118, HZ + 0.03]});
  const round = new THREE.CylinderGeometry(0.022, 0.022, 0.104, 14); planarUV(round, 40); hall.add(round, stone, {p: [cx + 0.098, ground + 0.052, HZ - 0.03]});
  hall.add(new THREE.ConeGeometry(0.027, 0.06, 14), slate, {p: [cx + 0.098, ground + 0.134, HZ - 0.03]});
  hall.add(new THREE.CylinderGeometry(0.0012, 0.0012, 0.018, 5), brass, {p: [cx + 0.098, ground + 0.172, HZ - 0.03]});
  for (const a of [0.3, 1.2]) { const g = new THREE.PlaneGeometry(0.009, 0.015); g.translate(0, 0.0075, 0); g.rotateY(a); hall.add(g, glass, {p: [cx + 0.098 + Math.sin(a) * 0.0222, ground + 0.06, HZ - 0.03 + Math.cos(a) * 0.0222]}); }
  // a dormer and tall stone chimneys with caps
  wall(0.02, 0.018, 0.02, cx - 0.06, ground + 0.07, HZ + 0.022); gable(0.026, 0.024, 0.016, cx - 0.06, ground + 0.088, HZ + 0.026, true);
  win(cx - 0.06, ground + 0.073, HZ + 0.0325, 0.009, 0.011);
  for (const [x, z, h] of [[-0.04, HZ - 0.01, 0.065], [0.075, HZ, 0.06], [0.045, HZ + 0.06, 0.052]]) { wall(0.012, h, 0.014, cx + x, ground + 0.07, z); hall.add(new THREE.BoxGeometry(0.016, 0.004, 0.018), trim, {p: [cx + x, ground + 0.072 + h, z]}); }
  // autumn maples and fallen leaves
  const leafMats = [['#c4462a', 'ny-maple-red'], ['#e08a2e', 'ny-maple-orange'], ['#e8b83a', 'ny-maple-gold']].map(([c, n]) => material(resources, n, c, {roughness: 0.85}));
  const bark = material(resources, 'ny-bark', '#4a3526', {roughness: 0.9});
  for (const [x, z, s, m] of [[-0.175, -0.07, 1.1, 0], [0.18, 0.04, 1.0, 1], [-0.16, 0.085, 0.8, 2], [0.165, -0.095, 0.9, 0]]) {
    kit.add(new THREE.CylinderGeometry(0.0035 * s, 0.005 * s, 0.06 * s, 6), bark, {p: [x, ground + 0.03 * s, z]});
    for (let k = 0; k < 6; k++) { const a = k * 1.1 + x * 10; kit.add(new THREE.IcosahedronGeometry(0.022 * s * (0.8 + (k % 3) * 0.15), 1), leafMats[(m + (k % 2)) % 3], {p: [x + Math.cos(a) * 0.017 * s, ground + (0.07 + (k % 3) * 0.016) * s, z + Math.sin(a) * 0.017 * s]}); }
  }
  for (let k = 0; k < (low ? 20 : 40); k++) { const a = k * 2.39996, r = 0.06 + (k % 9) * 0.017; const px = Math.cos(a) * r * 1.5, pz = Math.sin(a) * r; if (Math.abs(px) < 0.12 && pz < 0.03 && pz > -0.1) continue; kit.add(new THREE.CircleGeometry(0.0035, 5), leafMats[k % 3], {p: [px, ground + 0.0008, pz], r: [-Math.PI / 2, 0, a]}); }
  // the pennant, red and purple, on a brass pole
  kit.add(new THREE.CylinderGeometry(0.0011, 0.0011, 0.05, 6), brass, {p: [cx - 0.098, ground + 0.205, HZ + 0.03]});
  const penUV = L.custom((c, w, h) => { c.fillStyle = '#9b1f2e'; c.fillRect(0, 0, w, h / 2); c.fillStyle = '#5b2a86'; c.fillRect(0, h / 2, w, h / 2); c.fillStyle = '#fbeedb'; c.font = '700 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HOOSAC', w * 0.42, h / 2); });
  const penGeo = L.geometry(penUV, 0.06, 0.026); { const p = penGeo.attributes.position; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 0.03) / 0.06; p.setY(i, p.getY(i) * (1 - u * 0.92)); } } penGeo.translate(0.03, 0, 0);
  resources?.add(penGeo);
  const pennant = new THREE.Mesh(penGeo, L.mat); pennant.position.set(cx - 0.098, ground + 0.218, HZ + 0.03); pennant.scale.setScalar(0.7); pennant.castShadow = true; root.add(pennant);
  // a stone owl on a little plinth by the drive, for the school mascot
  const owlStone = material(resources, 'ny-owl-stone', '#9a958c', {roughness: 0.8});
  friendsKit.add(planarUV(new THREE.BoxGeometry(0.022, 0.024, 0.022), 40), stone, {p: [-0.072, ground + 0.012, 0.1]});
  const owlLight = material(resources, 'ny-owl-face', '#c8c2b6', {roughness: 0.8}), owlEye = material(resources, 'ny-owl-eye', '#e7c46a', {emissive: '#7a5a10', emissiveIntensity: 0.4}), owlDark = material(resources, 'ny-owl-pupil', '#2a2622', {roughness: 0.5});
  const ox = -0.072, oz = 0.1, oy = ground + 0.024;
  friendsKit.add(new THREE.SphereGeometry(0.0105, 14, 10), owlStone, {p: [ox, oy + 0.014, oz], s: [1, 1.35, 0.9]});
  friendsKit.add(new THREE.SphereGeometry(0.0092, 14, 10), owlStone, {p: [ox, oy + 0.031, oz], s: [1.08, 0.9, 0.95]});
  for (const e of [-1, 1]) {
    friendsKit.add(new THREE.SphereGeometry(0.0085, 10, 8), owlStone, {p: [ox + e * 0.0085, oy + 0.014, oz - 0.001], s: [0.45, 1.25, 0.9], r: [0, 0, e * 0.15]});
    friendsKit.add(new THREE.CircleGeometry(0.0046, 14), owlLight, {p: [ox + e * 0.0043, oy + 0.032, oz + 0.0086]});
    friendsKit.add(new THREE.CircleGeometry(0.0026, 12), owlEye, {p: [ox + e * 0.0043, oy + 0.032, oz + 0.0089]});
    friendsKit.add(new THREE.CircleGeometry(0.0012, 8), owlDark, {p: [ox + e * 0.0043, oy + 0.032, oz + 0.0091]});
    friendsKit.add(new THREE.ConeGeometry(0.0016, 0.0045, 4), owlStone, {p: [ox + e * 0.0062, oy + 0.0395, oz + 0.002], r: [0, 0, -e * 0.5]});
    friendsKit.add(new THREE.ConeGeometry(0.0012, 0.004, 4), owlStone, {p: [ox + e * 0.003, oy + 0.0015, oz + 0.008], r: [Math.PI / 2, 0, 0]});
  }
  friendsKit.add(new THREE.ConeGeometry(0.0014, 0.0045, 5), owlDark, {p: [ox, oy + 0.0285, oz + 0.009], r: [Math.PI * 0.62, 0, 0]});
  // two students walking up the drive, one with books
  const skin = material(resources, 'ny-skin', '#efd2b6', {roughness: 0.7}), hair = material(resources, 'ny-hair', '#2a1d16', {roughness: 0.7});
  const figures = [];
  for (const [x, z, coat, books] of [[-0.03, 0.105, '#7a2433', false], [-0.012, 0.118, '#4f3478', true]]) {
    const f = makeKit('keepsake-hoosac-student', resources), g = new THREE.Group(); g.position.set(x, ground, z); root.add(g);
    const c = material(resources, 'ny-blazer-' + coat, coat, {roughness: 0.7});
    f.add(new THREE.CylinderGeometry(0.0022, 0.0022, 0.012, 6), material(resources, 'ny-trousers', '#2c2f3a'), {p: [-0.0022, 0.006, 0]}); f.add(new THREE.CylinderGeometry(0.0022, 0.0022, 0.012, 6), material(resources, 'ny-trousers', '#2c2f3a'), {p: [0.0022, 0.006, 0]});
    f.add(new THREE.CapsuleGeometry(0.0052, 0.011, 3, 8), c, {p: [0, 0.019, 0]});
    f.add(new THREE.SphereGeometry(0.0048, 10, 8), skin, {p: [0, 0.033, 0]}); f.add(new THREE.SphereGeometry(0.005, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, {p: [0, 0.0338, -0.0006]});
    if (books) f.add(new THREE.BoxGeometry(0.008, 0.002, 0.006), material(resources, 'ny-books', '#c9a24f'), {p: [0.006, 0.02, 0.003]});
    figures.push(g, ...f.build(g));
  }
  // the far city: a painted backdrop of the hills and the road, the skyline small on the horizon, and a road sign
  const backUV = L.custom((c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#2c3a64'); sky.addColorStop(0.55, '#c98d8a'); sky.addColorStop(1, '#f1c38e'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffe9b0'; for (let k = 0; k < 14; k++) c.fillRect((k * 37) % w, (k * 11) % (h * 0.35), 1.5, 1.5);
    c.fillStyle = '#1c2340'; const sx = w * 0.78, base = h * 0.66;
    [[0, 16, 30], [12, 10, 44], [20, 12, 60], [31, 9, 38], [38, 11, 50], [48, 8, 34], [-10, 9, 26]].forEach(([dx, bw, bh]) => c.fillRect(sx + dx, base - bh * 0.5, bw * 0.6, bh * 0.5));
    c.fillRect(sx + 24, base - 40, 4, 10); c.fillRect(sx + 25.2, base - 47, 1.6, 8);
    c.fillStyle = '#ffd98a'; for (let k = 0; k < 22; k++) c.fillRect(sx - 6 + (k * 7) % 58, base - 4 - (k * 5) % 22, 1.2, 1.2);
    c.fillStyle = '#56603e'; c.beginPath(); c.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += 8) c.lineTo(x, h * 0.66 - Math.sin(x / 40) * 10 - Math.sin(x / 17) * 4); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#3f4a2c'; c.beginPath(); c.moveTo(0, h * 0.78); for (let x = 0; x <= w; x += 8) c.lineTo(x, h * 0.8 - Math.sin(x / 55 + 1) * 8); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#8a7f6a'; c.beginPath(); c.moveTo(w * 0.42, h); c.quadraticCurveTo(w * 0.55, h * 0.78, sx + 6, base + 2); c.lineTo(sx + 9, base + 2); c.quadraticCurveTo(w * 0.6, h * 0.8, w * 0.52, h); c.fill();
  });
  cityKit.add(L.geometry(backUV, 0.44, 0.12), L.mat, {p: [0, ground + 0.06, -0.146]});
  cityKit.add(new THREE.BoxGeometry(0.448, 0.008, 0.008), walnut, {p: [0, ground + 0.124, -0.148]});
  for (const sx of [-1, 1]) cityKit.add(new THREE.BoxGeometry(0.008, 0.124, 0.008), walnut, {p: [sx * 0.222, ground + 0.062, -0.148]});
  const signUV = L.custom((c, w, h) => { c.fillStyle = '#1f6b3d'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 30px Arial, sans-serif'; c.fillText('NEW YORK CITY', w / 2, h * 0.36); c.font = '700 40px Arial, sans-serif'; c.fillText('3½ h  →', w / 2, h * 0.72); });
  cityKit.add(new THREE.CylinderGeometry(0.0016, 0.0016, 0.06, 6), material(resources, 'ny-sign-post', '#b9bec4', {metalness: 0.6, roughness: 0.35}), {p: [0.15, ground + 0.03, 0.11]});
  cityKit.add(L.geometry(signUV, 0.05, 0.025), L.mat, {p: [0.15, ground + 0.06, 0.1112], r: [0, -0.25, 0]});
  cityKit.add(new THREE.BoxGeometry(0.052, 0.027, 0.002), material(resources, 'ny-sign-back', '#1a5732'), {p: [0.15, ground + 0.06, 0.1098], r: [0, -0.25, 0]});
  kit.build(root); const hallMeshes = hall.build(root), friendMeshes = friendsKit.build(root), cityMeshes = cityKit.build(root);
  function animate(t, dt, page) {
    const pulse = reduced ? 1 : 0.7 + 0.3 * Math.sin(t * 2.4);
    glass.emissiveIntensity = page === 'tibbits' ? 1.1 * pulse : 0.35;
    if (!reduced) { const p = penGeo.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 0.06; p.setZ(i, Math.sin(t * 5 - u * 5) * 0.004 * u); } p.needsUpdate = true; }
    figures.forEach((f, i) => { if (f.isGroup && !reduced) f.position.y = ground + Math.abs(Math.sin(t * 4 + i)) * (page === 'friends' ? 0.0025 : 0.0008); });
  }
  animate(0, 0, null);
  return {root, objects: {tibbits: hallMeshes, friends: [...friendMeshes, pennant, ...figures.filter(f => f.isMesh)], city: cityMeshes}, animate};
}
