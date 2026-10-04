import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The enchantment layer: a magical night sky, LEGO-like studs and brick
// courses, floating candles, fireflies, lantern glow, the crystal ball and its
// sea, the hidden whale, the snowy owl, and a chinoiserie dress for the
// buildings (blue-and-white porcelain roofs, gilt bells and finials, Chinese
// Chippendale fretwork and a porcelain pagoda).
// It only adds to the existing world: no routes, rooms or colliders change.

const ISLAND = {cx: 10.5, cz: -14, rx: 35, rz: 24};
const RESEARCH = {x: -12, z: -12.25, roofTop: 6.1};
const HOME = {x: 0, z: -0.5};

// Every station roof turns into blue-and-white faience, after the Trianon de
// Porcelaine at Versailles and the Porcelain Tower of Nanjing that inspired it.
const PORCELAIN_ROOFS = new Set(['research-roof-crafted-surface', 'Talks-roof-crafted-surface', 'HWL-writing-roof-crafted-surface', 'HWL-life-roof-crafted-surface', 'HWL-home-roof-crafted-surface']);

const rng = seed => { let n = seed >>> 0; return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; }; };

const NOISE_GLSL = /* glsl */`
  float enchHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float enchNoise(vec3 x){
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(enchHash(i + vec3(0,0,0)), enchHash(i + vec3(1,0,0)), f.x), mix(enchHash(i + vec3(0,1,0)), enchHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(enchHash(i + vec3(0,0,1)), enchHash(i + vec3(1,0,1)), f.x), mix(enchHash(i + vec3(0,1,1)), enchHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float enchFbm(vec3 p){ float a = 0.5, s = 0.0; for(int i = 0; i < 4; i++){ s += a * enchNoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

/** Soft round glow points with per-point colour, size, phase and optional drift. */
function glowMaterial({twinkle = 0, drift = 0, reduced = false} = {}) {
  return new THREE.ShaderMaterial({
    name: 'enchantment-soft-glow-points',
    uniforms: {uTime: {value: 0}, uScale: {value: 400}, uTwinkle: {value: reduced ? 0 : twinkle}, uDrift: {value: reduced ? 0 : drift}},
    vertexShader: /* glsl */`
      attribute float size; attribute float phase; attribute vec3 color;
      uniform float uTime, uScale, uTwinkle, uDrift;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 p = position;
        p += uDrift * vec3(sin(uTime * 0.41 + phase * 6.1), 0.55 * sin(uTime * 0.67 + phase * 3.7), cos(uTime * 0.37 + phase * 5.3));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (1.3 + phase * 2.1) + phase * 40.0));
        vAlpha = tw; vColor = color;
        gl_PointSize = clamp(size * uScale / max(0.1, -mv.z), 1.0, 96.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float glow = pow(max(0.0, 1.0 - r), 2.2);
        float core = smoothstep(0.32, 0.0, r);
        float a = (glow * 0.65 + core * 0.55) * vAlpha;
        if(a < 0.003) discard;
        gl_FragColor = vec4(vColor, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false
  });
}

function pointsGeometry(entries) {
  const g = new THREE.BufferGeometry(), n = entries.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n);
  entries.forEach((e, i) => {
    pos.set(e.p, i * 3); const c = new THREE.Color(e.c); col.set([c.r, c.g, c.b], i * 3);
    size[i] = e.s; phase[i] = e.ph ?? i * 0.618 % 1;
  });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  return g;
}

/** A gradient night sky with a faint nebula and slow aurora ribbons. */
function createSky(reduced) {
  const material = new THREE.ShaderMaterial({
    name: 'enchantment-aurora-night-sky',
    uniforms: {uTime: {value: 0}},
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir; uniform float uTime;
      ${NOISE_GLSL}
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 zenith = vec3(0.004, 0.006, 0.022), horizon = vec3(0.016, 0.026, 0.066), below = vec3(0.003, 0.004, 0.014);
        vec3 col = mix(horizon, zenith, smoothstep(0.02, 0.85, h));
        col = mix(below, col, smoothstep(-0.65, 0.02, h));
        float n = enchFbm(d * 1.3 + vec3(0.0, uTime * 0.003, 0.0));
        float n2 = enchFbm(d * 2.6 + 7.3);
        col += vec3(0.030, 0.012, 0.048) * smoothstep(0.42, 0.92, n);
        col += vec3(0.006, 0.026, 0.034) * smoothstep(0.48, 0.95, n2);
        float wave = 0.10 + 0.06 * sin(d.x * 3.4 + uTime * 0.06) + 0.04 * sin(d.z * 5.1 - uTime * 0.045);
        float curtain = exp(-pow((h - wave) / 0.075, 2.0)) + 0.55 * exp(-pow((h + 0.22 - 0.04 * sin(d.z * 4.0 + uTime * 0.05)) / 0.06, 2.0));
        float rays = smoothstep(0.30, 0.80, enchFbm(vec3(d.x * 8.0, uTime * 0.03, d.z * 8.0)));
        vec3 aurora = mix(vec3(0.04, 0.34, 0.26), vec3(0.20, 0.10, 0.36), smoothstep(-0.05, 0.22, h + 0.1 * rays));
        col += aurora * curtain * rays * 0.16;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: true, toneMapped: false, fog: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24), material);
  mesh.name = 'enchantment-sky-dome'; mesh.renderOrder = -10; mesh.frustumCulled = false;
  return {mesh, material, update(t) { if (!reduced) material.uniforms.uTime.value = t; }};
}

/** LEGO-like studs on the garden ground, drawn in the shader so they cost no geometry. */
function patchStuds(material) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uStudSpacing = {value: 0.62};
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEnchWorld; varying vec3 vEnchNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEnchWorld = (modelMatrix * vec4(transformed, 1.0)).xyz; vEnchNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEnchWorld; varying vec3 vEnchNormal; uniform float uStudSpacing;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 cell = vEnchWorld.xz / uStudSpacing;
          vec2 f = fract(cell) - 0.5;
          float r = length(f), aa = max(fwidth(r) * 1.4, 0.004);
          float disc = 1.0 - smoothstep(0.29 - aa, 0.29 + aa, r);
          vec2 L = normalize(vec2(-0.66, 0.75));
          float side = clamp(dot(f, L) / 0.29, -1.0, 1.0);
          float rim = smoothstep(0.20, 0.29, r) * disc;
          float castShade = (1.0 - smoothstep(0.27, 0.36, length(f + L * 0.07))) * (1.0 - disc);
          float shade = 1.0 + disc * 0.08 + rim * side * 0.22 - castShade * 0.22;
          float fade = 1.0 - smoothstep(0.12, 0.30, fwidth(cell.x) + fwidth(cell.y));
          float top = smoothstep(0.80, 0.95, vEnchNormal.y);
          diffuseColor.rgb *= mix(1.0, shade, top * fade);
        }`);
  };
  material.customProgramCacheKey = () => 'enchantment-studs-v1';
  material.needsUpdate = true;
}

/** Stacked brick courses with mortar lines and colour variation on the island's base. */
function patchBricks(material, ell = ISLAND) {
  const straight = !!ell.straight;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEnchWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEnchWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vEnchWorld;\nfloat enchGlowBrick;\n${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 q = vec2((vEnchWorld.x - ${ISLAND.cx.toFixed(2)}) / ${(ell.rx || 1).toFixed(1)}, (vEnchWorld.z - (${ISLAND.cz.toFixed(2)})) / ${(ell.rz || 1).toFixed(1)});
          float course = vEnchWorld.y / 0.95;
          float row = floor(course), v = fract(course);
          float along = ${straight ? 'vEnchWorld.x / 1.55' : 'atan(q.y, q.x) * 40.0 / 6.2831853'} + mod(row, 2.0) * 0.5;
          float brick = floor(along), u = fract(along);
          float aa = max(fwidth(course), fwidth(along)) * 1.2 + 0.006;
          float joint = (1.0 - smoothstep(0.045, 0.045 + aa, v)) + (1.0 - smoothstep(0.018, 0.018 + aa, min(u, 1.0 - u)));
          float pick = enchHash(vec3(brick, row, 3.1));
          vec3 tint = pick < 0.38 ? vec3(1.0) : pick < 0.60 ? vec3(0.80, 0.88, 0.94) : pick < 0.82 ? vec3(1.22, 1.14, 0.90) : pick < 0.94 ? vec3(0.70, 0.78, 0.74) : vec3(1.40, 1.30, 1.06);
          float bevel = 1.0 + 0.20 * smoothstep(0.80, 0.97, v) - 0.16 * smoothstep(0.26, 0.05, v) - 0.06 * smoothstep(0.12, 0.0, min(u, 1.0 - u));
          diffuseColor.rgb *= tint * bevel * mix(1.0, 0.36, clamp(joint, 0.0, 1.0));
          enchGlowBrick = step(0.965, enchHash(vec3(brick, row, 9.7))) * (1.0 - clamp(joint, 0.0, 1.0));
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.10, 0.42, 0.55) * enchGlowBrick * 0.55;');
  };
  material.customProgramCacheKey = () => 'enchantment-bricks-v2-' + (straight ? 'straight' : ell.rx);
  material.needsUpdate = true;
}

const PORCELAIN_GLSL = /* glsl */`
  uniform vec3 uPorcWhite, uPorcInk, uPorcDeep;
  float porcAA(float d){ float w = fwidth(d) * 0.75 + 1e-4; return smoothstep(w, -w, d); }
  // A white glazed tile: cobalt frame, quarter flowers where four tiles meet, and one of four centre motifs.
  float porcMotif(vec2 p, float seed){
    vec2 a = abs(p);
    float ink = porcAA(abs(max(a.x, a.y) - 0.80) - 0.045);
    ink = max(ink, porcAA(length(a - 1.0) - 0.30));
    float r = length(p), th = atan(p.y, p.x);
    if (seed < 0.42) {
      float petal = r - 0.52 * (0.42 + 0.58 * abs(cos(2.0 * th)));
      ink = max(ink, porcAA(petal) * (1.0 - porcAA(r - 0.12)));
      ink = max(ink, porcAA(r - 0.055));
    } else if (seed < 0.68) {
      ink = max(ink, porcAA(abs(r - 0.48) - 0.05));
      ink = max(ink, porcAA(r - 0.30) * (1.0 - porcAA(min(a.x, a.y) - 0.045)));
    } else if (seed < 0.88) {
      float dm = a.x + a.y;
      ink = max(ink, porcAA(dm - 0.60) * (1.0 - porcAA(dm - 0.42)));
      ink = max(ink, porcAA(dm - 0.18));
    } else {
      vec2 q = p * vec2(1.0, 1.3);
      ink = max(ink, porcAA(min(abs(length(q - vec2(-0.18, 0.0)) - 0.22), abs(length(q - vec2(0.20, 0.06)) - 0.15)) - 0.05));
    }
    return ink;
  }
`;

/**
 * Blue-and-white faience roofs. Each toy tile lap is painted in its own frame
 * with a cobalt motif chosen by its position; the slab, ridges, eaves and
 * upturned corners under the tiles become deep cobalt glaze with fine white lines.
 */
function patchPorcelainRoof(material) {
  material.color.set('#ffffff');
  material.roughness = 0.36;
  const uniforms = {uPorcWhite: {value: new THREE.Color('#f4f6fb')}, uPorcInk: {value: new THREE.Color('#2a56b4')}, uPorcDeep: {value: new THREE.Color('#1f4596')}};
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPorcL, vPorcLN, vPorcW, vPorcN; varying float vPorcI;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPorcL = transformed; vPorcLN = objectNormal; vPorcI = 0.0;
        vec4 porcW = vec4(transformed, 1.0); vec3 porcN = objectNormal;
        #ifdef USE_INSTANCING
          porcW = instanceMatrix * porcW; porcN = mat3(instanceMatrix) * porcN;
          vPorcI = 1.0 + fract(sin(dot(floor(instanceMatrix[3].xyz * 40.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        #endif
        vPorcW = (modelMatrix * porcW).xyz; vPorcN = normalize(mat3(modelMatrix) * porcN);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPorcL, vPorcLN, vPorcW, vPorcN; varying float vPorcI;\n${PORCELAIN_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 porc;
          if (vPorcI > 0.5) {
            float seed = vPorcI - 1.0;
            float ink = vPorcLN.y > 0.35 ? porcMotif(vPorcL.xz / vec2(0.12, 0.13), seed) : 0.9;
            porc = mix(uPorcWhite * (0.95 + 0.06 * seed), uPorcInk, ink);
          } else {
            vec3 n = normalize(vPorcN);
            float line = porcAA(0.035 - abs(fract(vPorcW.y * 6.0) - 0.5) + 0.43) * (1.0 - step(0.7, abs(n.y)));
            porc = mix(uPorcDeep, uPorcWhite, line * 0.85);
          }
          diffuseColor.rgb *= porc;
        }`);
  };
  material.customProgramCacheKey = () => 'enchantment-porcelain-roof-v1';
  material.needsUpdate = true;
}

/** White glazed porcelain bricks for the pagoda, laid in courses around its axis, with a few painted cobalt bricks. */
function patchPorcelainBricks(material, center) {
  const uniforms = {uPorcWhite: {value: new THREE.Color('#f6f6f2')}, uPorcInk: {value: new THREE.Color('#3a63bd')}, uPorcDeep: {value: new THREE.Color('#9aa6b8')}};
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPorcW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPorcW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPorcW;\n${NOISE_GLSL}\n${PORCELAIN_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec2 d = vPorcW.xz - vec2(${center[0].toFixed(2)}, ${center[1].toFixed(2)});
          float course = vPorcW.y / 0.11, row = floor(course), v = fract(course);
          float along = atan(d.y, d.x) * length(d) / 0.22 + mod(row, 2.0) * 0.5, brick = floor(along), u = fract(along);
          float joint = max(porcAA(0.06 - v), porcAA(0.035 - min(u, 1.0 - u)));
          float pick = enchHash(vec3(brick, row, 5.3));
          vec3 glaze = uPorcWhite * (0.94 + 0.08 * enchHash(vec3(brick, row, 1.7)));
          glaze = pick > 0.93 ? mix(glaze, uPorcInk, 0.75) : glaze;
          diffuseColor.rgb *= mix(glaze, uPorcDeep, joint) * (1.0 + 0.06 * smoothstep(0.7, 0.95, v));
        }`);
  };
  material.customProgramCacheKey = () => 'enchantment-porcelain-bricks-v1';
  material.needsUpdate = true;
}

/**
 * A tileable chinoiserie wallpaper, after the painted salons of Champs-sur-Marne
 * and Haroue: flowering prunus branches, leaves and two little birds in cobalt
 * on an ivory ground. Every element is drawn nine times so the tile wraps.
 */
function wallpaperTexture(low) {
  const S = low ? 256 : 512, k = S / 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'), r = rng(77), ink = '#2c4f9c', soft = '#8ea6d4';
  c.fillStyle = '#f2eee2'; c.fillRect(0, 0, S, S);
  const wrap = fn => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { c.save(); c.translate(dx, dy); c.scale(k, k); fn(); c.restore(); } };
  const bez = (P, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]); };
  const branches = [[[30, 500], [130, 400], [70, 270], [210, 170]], [[290, 520], [270, 410], [390, 350], [480, 240]], [[230, 130], [300, 60], [410, 100], [505, 15]]];
  const blossoms = [], leaves = [], twigs = [];
  for (const P of branches) for (let t = 0.12; t < 1; t += 0.11 + r() * 0.06) {
    const [x, y] = bez(P, t), a = r() * Math.PI * 2, len = 22 + r() * 26;
    twigs.push([x, y, x + Math.cos(a) * len, y + Math.sin(a) * len]);
    blossoms.push([x + Math.cos(a) * len, y + Math.sin(a) * len, 7 + r() * 4, r() * 6]);
    if (r() < 0.7) blossoms.push([x + Math.cos(a + 0.9) * 12, y + Math.sin(a + 0.9) * 12, 5 + r() * 2, r() * 6]);
    leaves.push([x + Math.cos(a - 1.4) * 14, y + Math.sin(a - 1.4) * 14, a - 1.4]);
  }
  const birds = [[150, 236, -0.25, 1], [395, 318, 0.2, -1]];
  wrap(() => {
    c.lineCap = 'round'; c.strokeStyle = ink;
    for (const P of branches) for (const [w, a] of [[9, 0.55], [5, 1]]) {
      c.lineWidth = w; c.globalAlpha = a; c.beginPath(); c.moveTo(...P[0]); c.bezierCurveTo(...P[1], ...P[2], ...P[3]); c.stroke();
    }
    c.globalAlpha = 1; c.lineWidth = 2.2;
    for (const [x0, y0, x1, y1] of twigs) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2 - 6, x1, y1); c.stroke(); }
    c.fillStyle = soft;
    for (const [x, y, a] of leaves) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    for (const [x, y, R, rot] of blossoms) {
      for (let i = 0; i < 5; i++) {
        const a = rot + i * Math.PI * 2 / 5;
        c.beginPath(); c.arc(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62, R * 0.52, 0, Math.PI * 2);
        c.fillStyle = '#fbfaf5'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = ink; c.stroke();
      }
      c.beginPath(); c.arc(x, y, R * 0.22, 0, Math.PI * 2); c.fillStyle = ink; c.fill();
    }
    for (const [x, y, tilt, dir] of birds) {
      c.save(); c.translate(x, y); c.rotate(tilt); c.scale(dir, 1); c.fillStyle = ink;
      c.beginPath(); c.moveTo(-14, 2); c.lineTo(-46, 16); c.lineTo(-44, 8); c.lineTo(-12, -3); c.fill();          // long tail
      c.beginPath(); c.ellipse(0, 0, 17, 9, -0.15, 0, Math.PI * 2); c.fill();                                     // body
      c.beginPath(); c.arc(15, -7, 7, 0, Math.PI * 2); c.fill();                                                   // head
      c.beginPath(); c.moveTo(21, -8); c.lineTo(29, -6); c.lineTo(21, -4); c.fill();                               // beak
      c.fillStyle = '#fbfaf5'; c.beginPath(); c.ellipse(-2, 2, 9, 3.5, -0.2, 0, Math.PI * 2); c.fill();          // white wing bar
      c.beginPath(); c.arc(17, -8, 1.6, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  });
  const tex = new THREE.CanvasTexture(cv); tex.name = 'enchantment-chinoiserie-wallpaper';
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}

/**
 * Paints the inner faces of every room wall with the wallpaper, above a
 * cobalt fretwork dado and a gilt chair rail. Faces count as inner when they
 * sit just inside a room's bounds and face its centre, so outside walls keep
 * their limewash.
 */
function patchWallpaper(material, rooms, tex) {
  const n = Math.min(rooms.length, 12);
  const uniforms = {
    uPaper: {value: tex}, uRoomCount: {value: n},
    uRoomMin: {value: Array.from({length: 12}, (_, i) => rooms[i] ? rooms[i][0] : new THREE.Vector3())},
    uRoomMax: {value: Array.from({length: 12}, (_, i) => rooms[i] ? rooms[i][1] : new THREE.Vector3())},
    uPorcWhite: {value: new THREE.Color('#f4f6fb')}, uPorcInk: {value: new THREE.Color('#2a56b4')}, uPorcDeep: {value: new THREE.Color('#c8d5ee')}
  };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaperW, vPaperN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 paperW = vec4(transformed, 1.0); vec3 paperN = objectNormal;
        #ifdef USE_INSTANCING
          paperW = instanceMatrix * paperW; paperN = mat3(instanceMatrix) * paperN;
        #endif
        vPaperW = (modelMatrix * paperW).xyz; vPaperN = normalize(mat3(modelMatrix) * paperN);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vPaperW, vPaperN; uniform sampler2D uPaper; uniform int uRoomCount; uniform vec3 uRoomMin[12], uRoomMax[12];
        ${PORCELAIN_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 n = normalize(vPaperN);
          for (int i = 0; i < 12; i++) {
            if (i >= uRoomCount || abs(n.y) > 0.3) break;
            vec3 mn = uRoomMin[i], mx = uRoomMax[i], p = vPaperW;
            if (p.x < mn.x || p.x > mx.x || p.z < mn.z || p.z > mx.z || p.y < mn.y - 0.05 || p.y > mx.y + 0.05) continue;
            float edge = min(min(p.x - mn.x, mx.x - p.x), min(p.z - mn.z, mx.z - p.z));
            if (edge > 0.14 || dot(n.xz, (mn.xz + mx.xz) * 0.5 - p.xz) <= 0.0) continue;
            float u = abs(n.z) > abs(n.x) ? p.x : p.z, h = p.y - mn.y;
            vec3 paper = texture2D(uPaper, vec2(u, h) / 1.15).rgb;
            // a cobalt fretwork dado with a gilt chair rail and a deep blue skirting
            float lattice = porcAA(0.03 - abs(fract((u + h) * 3.2) - 0.5) + 0.44) + porcAA(0.03 - abs(fract((u - h) * 3.2) - 0.5) + 0.44);
            vec3 dado = mix(uPorcDeep, uPorcWhite, clamp(lattice, 0.0, 1.0));
            dado = mix(dado, uPorcInk, porcAA(h - 0.09));
            vec3 wall = h < 0.62 ? dado : paper;
            wall = mix(wall, vec3(0.80, 0.56, 0.20), porcAA(abs(h - 0.64) - 0.022));
            diffuseColor.rgb = wall;
            break;
          }
        }`);
  };
  material.customProgramCacheKey = () => 'enchantment-chinoiserie-wallpaper-v1';
  material.needsUpdate = true;
}

function plaque(text, sub, low) {
  const canvas = document.createElement('canvas'); canvas.width = low ? 256 : 512; canvas.height = canvas.width / 4;
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#efe2c4'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#a4844e'; ctx.lineWidth = h * 0.06; ctx.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
  ctx.fillStyle = '#3c2f22'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${h * 0.40}px Georgia, serif`; ctx.fillText(text, w / 2, h * (sub ? 0.40 : 0.52));
  if (sub) { ctx.font = `500 ${h * 0.22}px Georgia, serif`; ctx.fillText(sub, w / 2, h * 0.76); }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

/** A small suspension bridge built along +z. */
function buildBridge({x, z0, z1, towerColor, cableColor, deckColor, name, label, sub, low}) {
  const group = new THREE.Group(); group.name = name;
  const len = z1 - z0, deckY = 0.32, towerH = 2.05, half = 0.27;
  const towerZ = [z0 + len * 0.26, z0 + len * 0.74];
  const parts = {tower: [], cable: [], deck: []};
  const box = (list, w, h, d, px, py, pz) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(px, py, pz); list.push(g); };
  // deck, edge girders and abutments
  box(parts.deck, half * 2 + 0.08, 0.07, len, x, deckY, (z0 + z1) / 2);
  box(parts.tower, 0.05, 0.10, len, x - half - 0.02, deckY - 0.06, (z0 + z1) / 2);
  box(parts.tower, 0.05, 0.10, len, x + half + 0.02, deckY - 0.06, (z0 + z1) / 2);
  for (const zz of [z0 + 0.12, z1 - 0.12]) box(parts.deck, half * 2 + 0.2, deckY + 0.02, 0.26, x, (deckY - 0.02) / 2, zz);
  // towers: two legs with portal struts
  for (const tz of towerZ) {
    for (const s of [-1, 1]) box(parts.tower, 0.11, towerH, 0.13, x + s * half, towerH / 2 - 0.35, tz);
    for (const sy of [0.62, 1.15, 1.62]) box(parts.tower, half * 2 + 0.06, 0.07, 0.10, x, sy, tz);
    box(parts.tower, 0.34, 0.30, 0.36, x, -0.40, tz);
  }
  // main cables: a sag between the towers and side spans to the anchorages
  const topY = towerH - 0.36, sagY = deckY + 0.16;
  const cableY = zz => {
    if (zz < towerZ[0]) return THREE.MathUtils.lerp(deckY + 0.04, topY, (zz - z0) / (towerZ[0] - z0));
    if (zz > towerZ[1]) return THREE.MathUtils.lerp(topY, deckY + 0.04, (zz - towerZ[1]) / (z1 - towerZ[1]));
    const t = (zz - towerZ[0]) / (towerZ[1] - towerZ[0]) * 2 - 1;
    return sagY + (topY - sagY) * t * t;
  };
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const zz = z0 + len * i / 40; pts.push(new THREE.Vector3(x + s * half, cableY(zz), zz)); }
    parts.cable.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, low ? 0.018 : 0.022, 5, false));
    for (let zz = towerZ[0] + 0.18; zz < towerZ[1] - 0.1; zz += 0.18) {
      const top = cableY(zz), hgt = top - deckY;
      if (hgt > 0.05) box(parts.cable, 0.012, hgt, 0.012, x + s * half, deckY + hgt / 2, zz);
    }
  }
  const mats = {
    tower: new THREE.MeshStandardMaterial({name: name + '-towers', color: towerColor, roughness: 0.55, metalness: 0.08}),
    cable: new THREE.MeshStandardMaterial({name: name + '-cables', color: cableColor, roughness: 0.5, metalness: 0.15}),
    deck: new THREE.MeshStandardMaterial({name: name + '-deck', color: deckColor, roughness: 0.82})
  };
  const meshes = [];
  for (const k of Object.keys(parts)) {
    const g = mergeGeometries(parts[k], false); parts[k].forEach(p => p.dispose());
    const m = new THREE.Mesh(g, mats[k]); m.name = name + '-' + k; m.castShadow = true; m.receiveShadow = true; group.add(m); meshes.push(m);
  }
  // a little name plaque on a post at the north end
  const tex = plaque(label, sub, low);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshStandardMaterial({name: name + '-plaque', map: tex, roughness: 0.8}));
  sign.position.set(x + 0.75, 0.62, z0 - 0.02); sign.rotation.y = 0; group.add(sign); meshes.push(sign);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.6, 8), mats.deck); post.position.set(x + 0.75, 0.30, z0 - 0.04); group.add(post);
  return {group, meshes, materials: [...Object.values(mats), sign.material], textures: [tex], topY, towerZ};
}

/** A humpback whale, nose along +x, about 13 units long: dark back, pale belly,
 * throat grooves, head tubercles, long scalloped pectoral fins and notched flukes. */
function buildWhale({low}) {
  const root = new THREE.Group(); root.name = 'enchantment-hidden-whale';
  const disposables = [];
  const swim = {uPhase: {value: 0}, uGlow: {value: 0}};
  const prof = [[0, 0.1], [0.6, 0.32], [2, 0.6], [4, 1.12], [6, 1.55], [7.5, 1.72], [9, 1.66], [10.5, 1.42], [11.8, 1.02], [12.6, 0.55], [13, 0.0]];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r, y)), low ? 28 : 48, 0, Math.PI * 2);
  bodyGeo.rotateZ(-Math.PI / 2); bodyGeo.translate(-6.5, 0, 0); bodyGeo.scale(1, 0.84, 1);
  bodyGeo.computeVertexNormals();
  const pos = bodyGeo.attributes.position, col = new Float32Array(pos.count * 3), dark = new THREE.Color('#2b3b4c'), pale = new THREE.Color('#cdd7de'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(y, z) || 1, a = Math.atan2(z, -y);
    c.copy(pale).lerp(dark, THREE.MathUtils.smoothstep(y / r, -0.35, 0.25));
    if (x > 1.2 && y < -0.35 && Math.sin(a * 38) > 0.55) c.multiplyScalar(0.72);          // throat grooves
    col.set([c.r, c.g, c.b], i * 3);
  }
  bodyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const skin = new THREE.MeshStandardMaterial({name: 'whale-skin', vertexColors: true, roughness: 0.48, metalness: 0.05, emissive: '#2a8fb0', emissiveIntensity: 0});
  skin.onBeforeCompile = sh => {
    sh.uniforms.uPhase = swim.uPhase;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPhase;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat tailW = smoothstep(2.5, -6.5, transformed.x);\ntransformed.y += 0.55 * tailW * sin(uPhase - transformed.x * 0.45);');
  };
  skin.customProgramCacheKey = () => 'enchantment-whale-swim-v1';
  const body = new THREE.Mesh(bodyGeo, skin); body.name = 'whale-body'; root.add(body); disposables.push(bodyGeo, skin);
  const darkMat = new THREE.MeshStandardMaterial({name: 'whale-dark-details', color: '#1c2733', roughness: 0.5});
  const finMat = new THREE.MeshStandardMaterial({name: 'whale-pale-fins', color: '#d9e1e6', roughness: 0.55, emissive: '#2a8fb0', emissiveIntensity: 0});
  disposables.push(darkMat, finMat);
  const details = [];
  for (let i = 0; i < 9; i++) { const t = new THREE.SphereGeometry(0.13, 8, 6); t.translate(4.6 + i * 0.22, 1.05 - i * 0.07, (i % 2 ? 0.25 : -0.25)); details.push(t); }
  for (const s of [-1, 1]) {
    const eye = new THREE.SphereGeometry(0.12, 10, 8); eye.translate(4.4, -0.32, s * 1.22); details.push(eye);
    const mouth = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(6.4, -0.05, s * 0.3), new THREE.Vector3(5.6, -0.3, s * 0.95), new THREE.Vector3(4.6, -0.42, s * 1.2)]), 16, 0.035, 5, false); details.push(mouth);
  }
  const dorsal = new THREE.Shape(); dorsal.moveTo(-0.9, 0); dorsal.quadraticCurveTo(-0.2, 0.15, 0.25, 0.55); dorsal.lineTo(0.6, 0); dorsal.closePath();
  const dg = new THREE.ExtrudeGeometry(dorsal, {depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2}); dg.translate(-2.6, 0.95, -0.07); details.push(dg);
  const detailGeo = mergeGeometries(details.map(g => g.index ? g.toNonIndexed() : g), false); details.forEach(g => g.dispose());
  const detailMesh = new THREE.Mesh(detailGeo, darkMat); detailMesh.name = 'whale-head-eyes-mouth-dorsal'; root.add(detailMesh); disposables.push(detailGeo);
  // long pectoral fins with a scalloped leading edge
  const fin = new THREE.Shape(); fin.moveTo(0, 0);
  for (let i = 1; i <= 8; i++) fin.lineTo(i * 0.5, 0.32 - i * 0.025 + (i % 2 ? 0.07 : 0));
  fin.lineTo(4.25, 0.05); fin.quadraticCurveTo(2.5, -0.35, 0.2, -0.3); fin.closePath();
  const fins = [];
  for (const s of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(fin, {depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 6});
    g.rotateX(Math.PI / 2); g.translate(0, 0, 0);
    const pivot = new THREE.Group(); pivot.position.set(3.4, -0.75, s * 1.35); pivot.rotation.set(0, s * 2.35, s * 0.45); root.add(pivot);
    const m = new THREE.Mesh(g, finMat); m.name = 'whale-pectoral-fin'; pivot.add(m); fins.push(pivot); disposables.push(g);
  }
  // notched flukes on a pivot that follows the tail
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.quadraticCurveTo(-0.5, 1.0, -1.15, 2.0); fl.lineTo(-0.95, 1.6); fl.lineTo(-0.85, 1.25); fl.lineTo(-0.7, 0.85); fl.quadraticCurveTo(-0.45, 0.35, -0.35, 0.1); fl.lineTo(-0.5, 0.0);
  fl.lineTo(-0.35, -0.1); fl.quadraticCurveTo(-0.45, -0.35, -0.7, -0.85); fl.lineTo(-0.85, -1.25); fl.lineTo(-0.95, -1.6); fl.lineTo(-1.15, -2.0); fl.quadraticCurveTo(-0.5, -1.0, 0, 0);
  const flGeo = new THREE.ExtrudeGeometry(fl, {depth: 0.09, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, curveSegments: 8});
  flGeo.rotateX(Math.PI / 2); flGeo.translate(0, 0.045, 0);
  const flukePivot = new THREE.Group(); flukePivot.position.set(-6.45, 0, 0); root.add(flukePivot);
  const flukes = new THREE.Mesh(flGeo, darkMat); flukes.name = 'whale-flukes'; flukePivot.add(flukes); disposables.push(flGeo);
  root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return {
    root, disposables, meshes: [body, detailMesh, flukes, ...fins.map(f => f.children[0])],
    update(t, glow, reduced) {
      const phase = reduced ? 0 : t * 1.25; swim.uPhase.value = phase;
      flukePivot.position.y = 0.55 * Math.sin(phase + 6.45 * 0.45);
      flukePivot.rotation.z = -0.45 * Math.cos(phase + 6.45 * 0.45);
      fins.forEach((f, i) => { f.rotation.x = reduced ? 0 : Math.sin(t * 0.7 + i * Math.PI) * 0.12; });
      skin.emissiveIntensity = glow * 0.28; finMat.emissiveIntensity = glow * 0.25;
    }
  };
}

/** Merge the still meshes under a group by material, leaving excluded subtrees alone. */
function mergeStill(group, exclude = []) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert(), bins = new Map(), originals = [];
  group.traverse(o => {
    if (!o.isMesh || exclude.some(e => { for (let p = o; p; p = p.parent) if (p === e) return true; return false; })) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(inv.clone().multiply(o.matrixWorld));
    if (!bins.has(o.material)) bins.set(o.material, []); bins.get(o.material).push(g); originals.push(o);
  });
  originals.forEach(o => { o.removeFromParent(); o.geometry.dispose(); });
  for (const [m, list] of bins) { const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); const mesh = new THREE.Mesh(g, m); mesh.name = group.name + '-' + m.name; mesh.castShadow = true; group.add(mesh); }
}

/** A snowy owl on the post box: white plumage, sparse dark speckles, golden
 * eyes, layered wing feathers, feathered feet and a sealed letter. */
function buildOwl() {
  const root = new THREE.Group(); root.name = 'enchantment-snowy-owl-post';
  const plume = new THREE.MeshStandardMaterial({name: 'owl-snowy-plumage', color: '#f7f5f0', roughness: 0.92});
  const shade = new THREE.MeshStandardMaterial({name: 'owl-soft-grey-feather-layer', color: '#e4e1da', roughness: 0.95});
  const iris = new THREE.MeshStandardMaterial({name: 'owl-golden-eyes', color: '#f2c21a', emissive: '#a36a00', emissiveIntensity: 0.5, roughness: 0.25});
  const dark = new THREE.MeshStandardMaterial({name: 'owl-pupils-beak-talons', color: '#17130f', roughness: 0.35});
  const speck = new THREE.MeshStandardMaterial({name: 'owl-dark-speckles', color: '#3b352f', roughness: 0.8});
  const paper = new THREE.MeshStandardMaterial({name: 'owl-letter-paper', color: '#efe3c6', roughness: 0.85});
  const seal = new THREE.MeshStandardMaterial({name: 'owl-letter-wax-seal', color: '#9c2a24', roughness: 0.45});
  const mats = [plume, shade, iris, dark, speck, paper, seal];
  const ball = (r, m, sc, p, parent = root, seg = 18) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m); o.scale.set(...sc); o.position.set(...p); o.castShadow = true; parent.add(o); return o; };
  // body and chest
  ball(0.2, plume, [1.0, 1.24, 0.96], [0, 0.27, 0]);
  ball(0.165, plume, [0.92, 1.02, 0.55], [0, 0.25, 0.1]);
  const chestSpecks = [[-0.05, 0.33], [0.04, 0.30], [-0.02, 0.24], [0.06, 0.21], [-0.065, 0.19], [0.0, 0.16]];
  for (const [x, y] of chestSpecks) { const c = ball(0.011, shade, [1.6, 0.45, 0.35], [x, y, 0.185 - Math.abs(x) * 0.5], root, 6); c.rotation.z = x > 0 ? 0.35 : -0.35; }
  // folded wings: layered feathers with dark tips
  for (const s of [-1, 1]) {
    const wing = new THREE.Group(); wing.position.set(s * 0.165, 0.32, -0.02); wing.rotation.z = s * 0.16; root.add(wing);
    for (let k = 0; k < 6; k++) {
      const f = ball(0.075, k < 3 ? plume : shade, [0.42, 1.0, 1.0], [s * 0.01 * k, -0.035 * k, -0.02 * k], wing, 10);
      f.scale.y = 1.0 + k * 0.12;
      if (k >= 3) ball(0.022, speck, [0.5, 1.6, 0.8], [s * (0.03 + 0.01 * k), -0.035 * k - 0.05, 0.03 - 0.02 * k], wing, 6);
    }
    for (let k = 0; k < 4; k++) ball(0.012, speck, [1.0, 0.7, 0.6], [s * 0.035, 0.03 - k * 0.055, 0.045 - k * 0.012], wing, 6);
  }
  // tail fan
  for (const t of [-1, 0, 1]) { const f = ball(0.06, shade, [0.6, 0.22, 1.5], [t * 0.05, 0.08, -0.17]); f.rotation.y = t * 0.25; f.rotation.x = -0.5; }
  // feathered feet with black talons
  for (const s of [-1, 1]) {
    ball(0.045, plume, [1.0, 0.75, 1.25], [s * 0.065, 0.025, 0.08], root, 10);
    for (let c = -1; c <= 1; c++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.035, 5), dark); t.position.set(s * 0.065 + c * 0.018, 0.005, 0.13); t.rotation.x = Math.PI / 2 + 0.6; root.add(t); }
  }
  // head, facial disc, eyes and beak
  const head = new THREE.Group(); head.position.set(0, 0.56, 0.01); root.add(head);
  ball(0.175, plume, [1.06, 0.92, 0.96], [0, 0, 0], head);
  ball(0.15, plume, [1.0, 0.86, 0.45], [0, -0.012, 0.095], head);
  for (const s of [-1, 1]) ball(0.07, plume, [1.0, 1.0, 0.5], [s * 0.058, 0.01, 0.12], head, 12);
  const eyes = new THREE.Group(); head.add(eyes);
  for (const s of [-1, 1]) {
    ball(0.034, iris, [1, 1, 0.55], [s * 0.06, 0.018, 0.153], eyes, 14);
    ball(0.017, dark, [1, 1, 0.5], [s * 0.06, 0.018, 0.168], eyes, 10);
    ball(0.006, plume, [1, 1, 0.5], [s * 0.06 + 0.008, 0.028, 0.176], eyes, 6);
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 6), dark); beak.position.set(0, -0.03, 0.17); beak.rotation.x = Math.PI * 0.62; head.add(beak);
  for (const s of [-1, 1]) { const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 5), plume); bristle.position.set(s * 0.016, -0.012, 0.172); bristle.rotation.set(Math.PI * 0.55, 0, s * 0.5); head.add(bristle); }
  for (let i = 0; i < 5; i++) ball(0.008, speck, [1.4, 0.7, 0.5], [(i - 2) * 0.04, 0.13 - Math.abs(i - 2) * 0.012, 0.05 - Math.abs(i - 2) * 0.03], head, 6);
  // a sealed letter resting at its feet
  const letter = new THREE.Group(); letter.position.set(0.02, 0.006, 0.2); letter.rotation.y = -0.3; root.add(letter);
  const env = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.13), paper); env.castShadow = true; letter.add(env);
  const flap = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.1, 0.004, 3, 1), shade); flap.rotation.y = Math.PI / 2; flap.scale.set(0.65, 1, 1.0); flap.position.set(0, 0.005, -0.02); letter.add(flap);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 12), seal); wax.position.set(0, 0.009, 0.008); letter.add(wax);
  mergeStill(head, [eyes]);
  mergeStill(root, [head]);
  return {root, head, eyes, materials: mats};
}

// The crystal ball that holds Hanjing's inner world: a glass sphere, an open
// moonlit sea that begins at the seaside promenade, and an ornate studded stand.
const GLOBE = {cx: ISLAND.cx, cy: 0, cz: ISLAND.cz, r: 37};
const SEA = {level: -2.0};
const FRONT_Z = 3.2;                       // the promenade: everything in front is open sea
const QUAY_X = [ISLAND.cx - ISLAND.rx * Math.sqrt(1 - ((FRONT_Z - ISLAND.cz) / ISLAND.rz) ** 2), ISLAND.cx + ISLAND.rx * Math.sqrt(1 - ((FRONT_Z - ISLAND.cz) / ISLAND.rz) ** 2)];
const MOON_DIR = new THREE.Vector3(0.30, 0.20, -0.93).normalize();
const seaRadius = Math.sqrt(GLOBE.r ** 2 - (SEA.level - GLOBE.cy) ** 2) - 0.25;

function createGlobeAndSea({reduced, low}) {
  const group = new THREE.Group(); group.name = 'enchantment-crystal-ball';
  const disposables = [];
  // the sea surface: polar grid, denser near the island
  const rings = low ? 46 : 80, segs = low ? 128 : 220, pos = [], idx = [];
  for (let j = 0; j <= rings; j++) {
    const t = 0.40 + 0.60 * Math.pow(j / rings, 0.85);
    for (let i = 0; i < segs; i++) { const a = i / segs * Math.PI * 2; pos.push(GLOBE.cx + Math.cos(a) * seaRadius * t, SEA.level, GLOBE.cz + Math.sin(a) * seaRadius * t); }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) { const a = j * segs + i, b = j * segs + (i + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeBoundingSphere();
  const shoreGLSL = `
    float shoreDist(vec2 xz){
      vec2 q = vec2((xz.x - ${ISLAND.cx.toFixed(2)}) / ${ISLAND.rx.toFixed(1)}, (xz.y - (${ISLAND.cz.toFixed(2)})) / ${ISLAND.rz.toFixed(1)});
      float dEll = (length(q) - 1.0) * ${ISLAND.rz.toFixed(1)};
      return max(dEll, xz.y - ${FRONT_Z.toFixed(2)});
    }`;
  const material = new THREE.ShaderMaterial({
    name: 'enchantment-moonlit-sea',
    uniforms: {uTime: {value: 0}, uReveal: {value: 0}, uMoon: {value: MOON_DIR.clone()}, uCam: {value: new THREE.Vector3()}},
    vertexShader: /* glsl */`
      uniform float uTime; varying vec3 vWorld; varying vec3 vNormal; varying float vCrest; varying float vShore; varying float vEdge;
      ${shoreGLSL}
      const vec4 W0 = vec4(0.10, 1.00, 0.52, 0.17), W1 = vec4(-0.75, 0.66, 0.83, 0.10), W2 = vec4(0.60, 0.80, 1.31, 0.06), W3 = vec4(0.97, -0.24, 2.05, 0.035);
      void wave(vec4 w, float speed, vec2 p, inout float h, inout vec2 g){ vec2 d = normalize(w.xy); float k = w.z, ph = dot(d, p) * k - uTime * speed; h += w.w * sin(ph); g += w.w * k * cos(ph) * d; }
      void main(){
        vec3 p = position; vec2 xz = p.xz;
        float shore = shoreDist(xz);
        float edge = length(xz - vec2(${GLOBE.cx.toFixed(2)}, ${GLOBE.cz.toFixed(2)})) / ${seaRadius.toFixed(2)};
        float calm = smoothstep(1.0, 0.92, edge) * smoothstep(-0.2, 1.6, shore);
        float h = 0.0; vec2 g = vec2(0.0);
        wave(W0, 1.05, xz, h, g); wave(W1, 1.40, xz, h, g); wave(W2, 1.85, xz, h, g); wave(W3, 2.55, xz, h, g);
        h *= calm; g *= calm; p.y += h;
        vCrest = h; vShore = shore; vEdge = edge;
        vNormal = normalize(vec3(-g.x, 1.0, -g.y));
        vec4 wp = modelMatrix * vec4(p, 1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uReveal; uniform vec3 uMoon, uCam;
      varying vec3 vWorld; varying vec3 vNormal; varying float vCrest; varying float vShore; varying float vEdge;
      ${NOISE_GLSL}
      void main(){
        if(vShore < -0.05) discard;
        vec3 n = normalize(vNormal);
        float ripple = enchFbm(vec3(vWorld.xz * 0.9, uTime * 0.35)) - 0.5;
        n = normalize(n + vec3(ripple * 0.20, 0.0, ripple * 0.15));
        vec3 v = normalize(uCam - vWorld);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 deep = vec3(0.004, 0.020, 0.050), shallow = vec3(0.012, 0.085, 0.105);
        vec3 col = mix(deep, shallow, smoothstep(5.0, 0.0, vShore) * 0.85 + 0.30 * smoothstep(0.0, 0.25, vCrest));
        vec3 r = reflect(-v, n);
        vec3 skyRef = mix(vec3(0.022, 0.032, 0.080), vec3(0.03, 0.17, 0.14), smoothstep(0.55, 0.8, enchFbm(r * 3.0 + uTime * 0.02)) * 0.6);
        col = mix(col, skyRef, 0.22 + 0.55 * fres);
        float spec = max(dot(r, uMoon), 0.0);
        float glitter = pow(spec, 380.0) * 6.0 + pow(spec, 36.0) * 0.22 * (0.5 + step(0.72, enchNoise(vec3(vWorld.xz * 6.0, uTime * 2.0))));
        col += vec3(0.85, 0.90, 1.0) * glitter;
        float shoreFoam = smoothstep(0.9, 0.0, vShore) * (0.55 + 0.45 * sin(uTime * 1.7 - vShore * 5.0));
        float crestFoam = smoothstep(0.22, 0.32, vCrest);
        float glassFoam = smoothstep(0.985, 1.0, vEdge) * 0.6;
        float foam = clamp(shoreFoam + crestFoam * 0.6 + glassFoam, 0.0, 1.0) * smoothstep(0.32, 0.62, enchFbm(vec3(vWorld.xz * 2.2, uTime * 0.5)));
        col = mix(col, vec3(0.62, 0.74, 0.82), foam * 0.6);
        float alpha = clamp(mix(0.80, 0.42, uReveal) + fres * 0.5 + foam * 0.4 + glitter, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`,
    transparent: true, toneMapped: false, fog: false
  });
  const sea = new THREE.Mesh(geo, material); sea.name = 'enchantment-moonlit-sea-surface'; sea.frustumCulled = false; sea.renderOrder = 9;
  group.add(sea); disposables.push(geo, material);

  // the water body below the surface, seen through the glass
  const theta0 = Math.acos((SEA.level - GLOBE.cy) / GLOBE.r);
  const bodyGeo = new THREE.SphereGeometry(GLOBE.r - 0.3, low ? 64 : 96, low ? 24 : 40, 0, Math.PI * 2, theta0, Math.PI - theta0);
  bodyGeo.translate(GLOBE.cx, GLOBE.cy, GLOBE.cz);
  const bodyMat = new THREE.ShaderMaterial({
    name: 'enchantment-deep-water-body',
    uniforms: {uTime: {value: 0}, uCam: {value: new THREE.Vector3()}},
    vertexShader: /* glsl */`varying vec3 vWorld; varying vec3 vN; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`uniform float uTime; uniform float uReveal; uniform vec3 uCam; varying vec3 vWorld; varying vec3 vN;
      ${NOISE_GLSL}
      void main(){
        float depth = clamp((${SEA.level.toFixed(2)} - vWorld.y) / ${GLOBE.r.toFixed(1)}, 0.0, 1.0);
        vec3 col = mix(vec3(0.020, 0.115, 0.150), vec3(0.002, 0.012, 0.035), pow(depth, 0.7));
        float caustic = smoothstep(0.55, 0.85, enchFbm(vec3(vWorld.xz * 0.35 + vWorld.y * 0.2, uTime * 0.25)));
        col += vec3(0.02, 0.09, 0.10) * caustic * (1.0 - depth);
        float rays = smoothstep(0.62, 0.9, enchNoise(vec3(vWorld.x * 0.18 + uTime * 0.05, 0.0, vWorld.z * 0.18))) * (1.0 - depth) * 0.6;
        col += vec3(0.03, 0.10, 0.12) * rays;
        vec3 v = normalize(uCam - vWorld);
        col += vec3(0.05, 0.14, 0.18) * pow(1.0 - abs(dot(normalize(vN), v)), 3.0) * 0.6;
        gl_FragColor = vec4(col, mix(0.72, 0.22, uReveal));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, toneMapped: false, fog: false
  });
  bodyMat.uniforms.uReveal = {value: 0};
  const body = new THREE.Mesh(bodyGeo, bodyMat); body.name = 'enchantment-sea-water-body'; body.renderOrder = 10;
  group.add(body); disposables.push(bodyGeo, bodyMat);
  // the far side of the water, seen through the clear front when the whale is revealed
  const backMat = new THREE.MeshBasicMaterial({name: 'enchantment-deep-water-far-side', color: '#03111f', side: THREE.BackSide, toneMapped: false, fog: false});
  const back = new THREE.Mesh(bodyGeo, backMat); back.name = 'enchantment-sea-water-far-side'; group.add(back); disposables.push(backMat);

  // the island's underside: a stepped brick cone, like a build floating on the sea
  const steps = [[1.0, -3.4], [0.96, -4.4], [0.86, -4.4], [0.82, -5.4], [0.70, -5.4], [0.66, -6.4], [0.52, -6.4], [0.47, -7.4], [0.33, -7.4], [0.27, -8.4], [0.14, -8.4], [0.0, -9.6]];
  const coneGeo = new THREE.LatheGeometry(steps.map(([r, y]) => new THREE.Vector2(r * (ISLAND.rx - 1.2), y)), low ? 64 : 112);
  coneGeo.scale(1, 1, (ISLAND.rz - 0.8) / (ISLAND.rx - 1.2)); coneGeo.translate(ISLAND.cx, 0, ISLAND.cz);
  const coneMat = new THREE.MeshStandardMaterial({name: 'enchantment-island-underside-bricks', color: '#4f6f6a', roughness: 0.8, side: THREE.DoubleSide});
  patchBricks(coneMat);
  const cone = new THREE.Mesh(coneGeo, coneMat); cone.name = 'enchantment-island-underside'; group.add(cone); disposables.push(coneGeo, coneMat);

  // the glass sphere: clear in the middle, bright at the rim, with soft studio highlights
  const glassGeo = new THREE.SphereGeometry(GLOBE.r, low ? 64 : 112, low ? 32 : 64); glassGeo.translate(GLOBE.cx, GLOBE.cy, GLOBE.cz);
  const glassMat = new THREE.ShaderMaterial({
    name: 'enchantment-crystal-ball-glass',
    uniforms: {uTime: {value: 0}, uCam: {value: new THREE.Vector3()}},
    vertexShader: /* glsl */`varying vec3 vWorld; varying vec3 vN; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`uniform float uTime; uniform vec3 uCam; varying vec3 vWorld; varying vec3 vN;
      void main(){
        vec3 n = normalize(vN), v = normalize(uCam - vWorld);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 r = reflect(-v, n);
        float streak = smoothstep(0.965, 0.995, dot(r, normalize(vec3(-0.55, 0.62, 0.55)))) * 0.32 + smoothstep(0.985, 0.998, dot(r, normalize(vec3(0.6, 0.35, 0.72)))) * 0.16;
        float window = step(0.0, sin(r.y * 40.0)) * 0.0;
        vec3 tint = mix(vec3(0.55, 0.75, 0.95), vec3(0.75, 0.62, 0.95), 0.5 + 0.5 * n.y);
        float a = clamp(0.02 + fres * 0.50 + streak * 0.7, 0.0, 0.8);
        gl_FragColor = vec4(tint * (0.55 + fres * 0.9) + vec3(streak), a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, toneMapped: false, fog: false, side: THREE.FrontSide
  });
  const glass = new THREE.Mesh(glassGeo, glassMat); glass.name = 'enchantment-crystal-ball-glass'; glass.renderOrder = 20;
  group.add(glass); disposables.push(glassGeo, glassMat);

  // the stand: a gold collar and three studded brick tiers with a small nameplate
  const gold = new THREE.MeshStandardMaterial({name: 'enchantment-stand-gold', color: '#c9a050', metalness: 0.75, roughness: 0.32, emissive: '#3a2608', emissiveIntensity: 0.4});
  const tierMat = new THREE.MeshStandardMaterial({name: 'enchantment-stand-studded-tiers', color: '#253a66', roughness: 0.55});
  patchStuds(tierMat);
  disposables.push(gold, tierMat);
  const yb = GLOBE.cy - GLOBE.r;                            // bottom of the sphere
  const collarY = yb + 3.6, collarR = Math.sqrt(GLOBE.r ** 2 - (collarY - GLOBE.cy) ** 2) + 0.5;
  const add = (g, m, name) => { g.translate(GLOBE.cx, 0, GLOBE.cz); const o = new THREE.Mesh(g, m); o.name = name; o.castShadow = false; o.receiveShadow = true; group.add(o); disposables.push(g); return o; };
  add(new THREE.CylinderGeometry(collarR, collarR - 1.2, 3.8, 96, 1, true).translate(0, collarY - 1.6, 0), gold, 'enchantment-stand-gold-collar');
  add(new THREE.TorusGeometry(collarR + 0.15, 0.32, 12, 120).rotateX(Math.PI / 2).translate(0, collarY + 0.25, 0), gold, 'enchantment-stand-collar-lip');
  const tiers = [[collarR - 0.6, collarR + 0.8, 2.4], [collarR + 1.2, collarR + 2.6, 2.6], [collarR + 3.0, collarR + 4.2, 2.2]];
  let ty = collarY - 3.5;
  tiers.forEach(([rTop, rBottom, h], i) => {
    add(new THREE.CylinderGeometry(rTop, rBottom, h, 96).translate(0, ty - h / 2, 0), tierMat, 'enchantment-stand-tier-' + i);
    add(new THREE.TorusGeometry(rBottom + 0.05, 0.14, 8, 120).rotateX(Math.PI / 2).translate(0, ty - h + 0.1, 0), gold, 'enchantment-stand-gold-band-' + i);
    ty -= h;
  });
  const plateTex = plaque('A world within', 'Hanjing’s inner world', low);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshStandardMaterial({name: 'enchantment-stand-nameplate', map: plateTex, metalness: 0.2, roughness: 0.5}));
  const plateR = collarR + 1.95, plateY = collarY - 3.5 - 2.4 - 1.3;
  plate.position.set(GLOBE.cx, plateY, GLOBE.cz + plateR + 0.02); plate.rotation.x = -0.4; group.add(plate);
  disposables.push(plateTex, plate.geometry, plate.material);
  const bottom = ty;
  return {group, disposables, water: body, setReveal(v) { bodyMat.uniforms.uReveal.value = v; material.uniforms.uReveal.value = v; }, bounds: {min: [GLOBE.cx - GLOBE.r - 2, bottom, GLOBE.cz - GLOBE.r - 2], max: [GLOBE.cx + GLOBE.r + 2, GLOBE.cy + GLOBE.r, GLOBE.cz + GLOBE.r + 2]},
    update(t, camera) {
      for (const m of [material, bodyMat, glassMat]) { m.uniforms.uTime.value = reduced ? 0 : t; m.uniforms.uCam.value.copy(camera.position); }
    }};
}

/** The seaside promenade: a brick quay where the island meets the open sea, with a Chinese Chippendale railing and lamps. */
function createPromenade({low}) {
  const group = new THREE.Group(); group.name = 'enchantment-seaside-promenade';
  const disposables = [];
  const len = QUAY_X[1] - QUAY_X[0], midX = (QUAY_X[0] + QUAY_X[1]) / 2;
  const wallMat = new THREE.MeshStandardMaterial({name: 'enchantment-quay-bricks', color: '#7f8a86', roughness: 0.78});
  patchBricks(wallMat, {straight: true});
  const wallGeo = new THREE.BoxGeometry(len, 3.4, 0.7); wallGeo.translate(midX, -1.7 + 0.02, FRONT_Z - 0.35);
  const wall = new THREE.Mesh(wallGeo, wallMat); wall.name = 'enchantment-quay-wall'; wall.receiveShadow = true; group.add(wall);
  const copeMat = new THREE.MeshStandardMaterial({name: 'enchantment-quay-coping', color: '#d8cdb4', roughness: 0.7});
  const copeGeo = new THREE.BoxGeometry(len, 0.14, 0.95); copeGeo.translate(midX, 0.06, FRONT_Z - 0.42);
  const cope = new THREE.Mesh(copeGeo, copeMat); cope.name = 'enchantment-quay-coping'; cope.receiveShadow = true; cope.castShadow = true; group.add(cope);
  disposables.push(wallMat, wallGeo, copeMat, copeGeo);
  // a Chinese Chippendale railing: white fretwork panels between posts with
  // cobalt bands and gilt ball finials, all in one vertex-coloured mesh
  const railMat = new THREE.MeshStandardMaterial({name: 'enchantment-chippendale-fretwork', color: '#ffffff', vertexColors: true, roughness: 0.5, metalness: 0.08});
  const pieces = [], zr = FRONT_Z - 0.18;
  const paint = (g, color, p, rz = 0) => {
    const geo = g.index ? g.toNonIndexed() : g; if (geo !== g) g.dispose();
    if (rz) geo.rotateZ(rz); geo.translate(...p);
    const c = new THREE.Color(color), n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); pieces.push(geo);
  };
  const white = '#f3f1ea', blue = '#2b55ad', gold = '#d8b25c';
  // a bar from (xa, ya) to (xb, yb) in the railing plane
  const bar = (xa, ya, xb, yb, t = 0.026) => { const dx = xb - xa, dy = yb - ya; paint(new THREE.BoxGeometry(Math.hypot(dx, dy) + t, t, 0.045), white, [(xa + xb) / 2, (ya + yb) / 2, zr], Math.atan2(dy, dx)); };
  paint(new THREE.BoxGeometry(len, 0.07, 0.17), white, [midX, 0.80, zr]);
  paint(new THREE.BoxGeometry(len, 0.02, 0.172), blue, [midX, 0.755, zr]);
  paint(new THREE.BoxGeometry(len, 0.08, 0.2), white, [midX, 0.17, zr]);
  const span = low ? 2.4 : 1.8, ya = 0.25, yb = 0.72;
  const posts = [];
  for (let x = QUAY_X[0] + 0.2; x < QUAY_X[1] - 0.1; x += span) posts.push(x);
  if (QUAY_X[1] - 0.2 - posts[posts.length - 1] > 0.5) posts.push(QUAY_X[1] - 0.2);
  posts.forEach((x, i) => {
    paint(new THREE.BoxGeometry(0.16, 0.74, 0.2), white, [x, 0.53, zr]);
    paint(new THREE.BoxGeometry(0.17, 0.05, 0.21), blue, [x, 0.33, zr]);
    paint(new THREE.BoxGeometry(0.2, 0.04, 0.24), white, [x, 0.92, zr]);
    paint(new THREE.SphereGeometry(0.065, low ? 8 : 12, low ? 6 : 8), gold, [x, 1.0, zr]);
    const next = posts[i + 1]; if (next === undefined) return;
    // one panel: an inner frame, then cells of crossing diagonals around a small open square
    const xa = x + 0.08, xb = next - 0.08, cells = Math.max(1, Math.round((xb - xa) / 0.55)), cw = (xb - xa) / cells;
    bar(xa, ya, xb, ya); bar(xa, yb, xb, yb);
    for (let k = 0; k <= cells; k++) bar(xa + k * cw, ya, xa + k * cw, yb);
    for (let k = 0; k < cells; k++) {
      const c0 = xa + k * cw, c1 = c0 + cw, cm = (c0 + c1) / 2, ym = (ya + yb) / 2, hs = 0.075, hw = Math.min(0.1, cw * 0.2);
      bar(c0, ya, cm - hw, ym - hs); bar(c1, ya, cm + hw, ym - hs); bar(c0, yb, cm - hw, ym + hs); bar(c1, yb, cm + hw, ym + hs);
      bar(cm - hw, ym - hs, cm + hw, ym - hs); bar(cm - hw, ym + hs, cm + hw, ym + hs); bar(cm - hw, ym - hs, cm - hw, ym + hs); bar(cm + hw, ym - hs, cm + hw, ym + hs);
    }
  });
  const railGeo = mergeGeometries(pieces, false);
  pieces.forEach(g => g.dispose());
  const railing = new THREE.Mesh(railGeo, railMat); railing.name = 'enchantment-chippendale-railing'; railing.castShadow = true; railing.receiveShadow = true; group.add(railing);
  disposables.push(railMat, railGeo);
  // seafront lamps with warm glass
  const lampPoints = [];
  const lampMat = new THREE.MeshStandardMaterial({name: 'enchantment-promenade-lamp-iron', color: '#2b2b30', roughness: 0.5, metalness: 0.4});
  const glowGlass = new THREE.MeshStandardMaterial({name: 'enchantment-promenade-lamp-glass', color: '#ffe2a8', emissive: '#ffb75e', emissiveIntensity: 1.2});
  const lampParts = [], glassParts = [];
  for (let x = QUAY_X[0] + 3; x < QUAY_X[1] - 2; x += 7.5) {
    const pole = new THREE.CylinderGeometry(0.05, 0.07, 2.1, 8); pole.translate(x, 1.12, FRONT_Z - 0.55); lampParts.push(pole);
    const arm = new THREE.TorusGeometry(0.18, 0.02, 6, 12, Math.PI); arm.rotateY(Math.PI / 2); arm.translate(x, 2.18, FRONT_Z - 0.55); lampParts.push(arm);
    const cap = new THREE.ConeGeometry(0.16, 0.18, 8); cap.translate(x, 2.45, FRONT_Z - 0.55); lampParts.push(cap);
    const lantern = new THREE.CylinderGeometry(0.11, 0.08, 0.26, 8); lantern.translate(x, 2.24, FRONT_Z - 0.55); glassParts.push(lantern);
    lampPoints.push([x, 2.24, FRONT_Z - 0.55]);
  }
  const lamps = new THREE.Mesh(mergeGeometries(lampParts.map(g => g.index ? g.toNonIndexed() : g), false), lampMat); lamps.name = 'enchantment-promenade-lamps'; lamps.castShadow = true;
  const glows = new THREE.Mesh(mergeGeometries(glassParts.map(g => g.index ? g.toNonIndexed() : g), false), glowGlass); glows.name = 'enchantment-promenade-lamp-glass';
  lampParts.concat(glassParts).forEach(g => g.dispose());
  group.add(lamps, glows); disposables.push(lampMat, glowGlass, lamps.geometry, glows.geometry);
  return {group, disposables, lampPoints};
}

// Chinoiserie details, fitted to each building's measured walls and eaves
// (station-local units, front faces +z): a European cornice and pilasters
// dressed with cobalt and white porcelain brackets, gilt ridge dragons, a gilt
// finial where the ridge is free, porcelain lanterns and little bells under
// every eave corner.
// If a building is rebuilt, update its entry here.
const FUSION = {
  'complete-home': {x: [-3.65, 1.83], z: [-3.60, 0.10], base: 0.30, top: 2.95, roof: 3.92, finial: false, eaves: [{x: [-4.02, 2.20], z: [-3.955, 0.46], y: 3.06}]},
  'research-complete-two-storey-library': {x: [-3.19, 3.19], z: [-4.19, -0.31], base: 0.12, top: 2.48, roof: 6.07, ridgeScale: 0.62,
    eaves: [{x: [-3.69, 3.69], z: [-4.70, 0.20], y: 2.56}, {x: [-2.91, 2.91], z: [-4.19, -0.73], y: 5.16}]},
  'talks-complete-timber-lecture-hall': {x: [-3.98, 2.08], z: [-4.33, 2.08], base: 0.12, top: 3.35, roof: 4.36, eaves: [{x: [-4.21, 2.31], z: [-4.45, 2.20], y: 3.55}]},
  'complete-writing': {x: [-3.73, 5.43], z: [-4.33, 0.68], base: 0.12, top: 2.95, roof: 3.99, finial: false, eaves: [{x: [-4.07, 5.77], z: [-4.655, 1.01], y: 3.06}]},
  'complete-life': {x: [-4.19, 4.19], z: [-4.09, -0.01], base: 0.24, top: 2.95, roof: 3.91, finial: false, eaves: [{x: [-4.55, 4.55], z: [-4.435, 0.34], y: 3.06}]}
};

// A small temple bell (lathe profile, mouth down), shared by the buildings and the pagoda.
const BELL_PROFILE = [[0.0, 0.0], [0.040, 0.0], [0.044, 0.010], [0.036, 0.030], [0.030, 0.062], [0.026, 0.084], [0.014, 0.096], [0.0, 0.098]];
function hangBell(add, gilt, at, {cord = 0.06, s = 1, lowSeg = false} = {}) {
  const [x, y, z] = at;
  add(new THREE.CylinderGeometry(0.004 * s, 0.004 * s, cord * s, 4), gilt, [x, y - cord * s / 2, z]);
  const bell = new THREE.LatheGeometry(BELL_PROFILE.map(([r, h]) => new THREE.Vector2(r * s, h * s)), lowSeg ? 6 : 10);
  add(bell, gilt, [x, y - cord * s - 0.098 * s, z]);
  // the wind plate that makes it ring
  add(new THREE.BoxGeometry(0.036 * s, 0.036 * s, 0.003 * s), gilt, [x, y - cord * s - 0.15 * s, z], [0, 0, Math.PI / 4]);
}

function createFusionDetails({garden, low}) {
  const disposables = [], lanternPoints = [];
  const M = (name, color, o = {}) => { const m = new THREE.MeshStandardMaterial({name: 'chinoiserie-' + name, color, roughness: 0.6, ...o}); disposables.push(m); return m; };
  const stone = M('classical-cream-stone', '#efe6d2', {roughness: 0.7}), groove = M('pilaster-cobalt-flute', '#7f98cc');
  const cobalt = M('cobalt-glaze', '#2b55ad'), porcelain = M('porcelain-white', '#f1f3f8'), sky = M('pale-cobalt', '#6e93d6');
  const gilt = M('gilt', '#e8c46a'), deep = M('deep-cobalt-ridge', '#22468f');
  const silk = M('porcelain-lantern', '#fff1d6', {emissive: '#ffb45c', emissiveIntensity: 0.95, roughness: 0.5});
  const cord = M('lantern-cord', '#3a2418');
  // painted parts share one vertex-coloured material; gilt keeps its own metal so it can catch the light
  const painted = M('painted-stone-and-brackets', '#ffffff', {vertexColors: true, roughness: 0.5, metalness: 0.04});
  // there is no environment map at night, so the gilt stays only half metallic to keep its colour
  const giltMetal = M('gilt-metal', '#ffffff', {vertexColors: true, roughness: 0.36, metalness: 0.42});
  for (const station of garden?.root.children || []) {
    const spec = FUSION[station.name]; if (!spec) continue;
    const parts = new Map(), add = (g, m, p, r) => {
      const geo = g.index ? g.toNonIndexed() : g; if (geo !== g) g.dispose();
      if (r) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r))); geo.translate(...p);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      const key = m === silk ? silk : m === gilt ? giltMetal : painted, c = m.color, n = geo.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      if (!parts.has(key)) parts.set(key, []); parts.get(key).push(geo);
    };
    const [x0, x1] = spec.x, [z0, z1] = spec.z, top = spec.top, base = spec.base, w = x1 - x0, d = z1 - z0;
    // classical cornice: two stepped mouldings around the wall top, the upper one in cobalt glaze
    for (const [y, h, out, m] of [[top - 0.27, 0.07, 0.05, stone], [top - 0.205, 0.045, 0.085, cobalt]]) {
      add(new THREE.BoxGeometry(w + out * 2, h, 0.06), m, [(x0 + x1) / 2, y, z1 + out - 0.03]);
      add(new THREE.BoxGeometry(w + out * 2, h, 0.06), m, [(x0 + x1) / 2, y, z0 - out + 0.03]);
      add(new THREE.BoxGeometry(0.06, h, d + out * 2), m, [x0 - out + 0.03, y, (z0 + z1) / 2]);
      add(new THREE.BoxGeometry(0.06, h, d + out * 2), m, [x1 + out - 0.03, y, (z0 + z1) / 2]);
    }
    // porcelain brackets along the frieze, front and back
    const bracket = (x, z, dir) => {
      add(new THREE.BoxGeometry(0.11, 0.055, 0.11), cobalt, [x, top - 0.15, z + dir * 0.06]);
      add(new THREE.BoxGeometry(0.30, 0.042, 0.07), porcelain, [x, top - 0.105, z + dir * 0.06]);
      add(new THREE.BoxGeometry(0.07, 0.042, 0.2), sky, [x, top - 0.105, z + dir * 0.1]);
      add(new THREE.BoxGeometry(0.12, 0.045, 0.12), cobalt, [x, top - 0.06, z + dir * 0.07]);
      add(new THREE.BoxGeometry(0.06, 0.012, 0.06), gilt, [x, top - 0.032, z + dir * 0.07]);
    };
    const step = low ? 1.3 : 0.9;
    for (let x = x0 + 0.45; x <= x1 - 0.4; x += step) { if (Math.abs(x - (x0 + x1) / 2) > 0.85) bracket(x, z1, 1); bracket(x, z0, -1); }
    // classical pilasters at the four corners, with bases, cobalt flutes and scroll capitals
    const shaftH = top - 0.32 - (base + 0.14);
    for (const [cx, cz] of [[x0 - 0.03, z1 + 0.03], [x1 + 0.03, z1 + 0.03], [x0 - 0.03, z0 - 0.03], [x1 + 0.03, z0 - 0.03]]) {
      add(new THREE.BoxGeometry(0.24, 0.14, 0.24), stone, [cx, base + 0.07, cz]);
      add(new THREE.BoxGeometry(0.16, shaftH, 0.16), stone, [cx, base + 0.14 + shaftH / 2, cz]);
      for (const f of [-0.045, 0, 0.045]) add(new THREE.BoxGeometry(0.014, shaftH - 0.12, 0.004), groove, [cx + f, base + 0.14 + shaftH / 2, cz + (cz > z0 ? 0.081 : -0.081)]);
      add(new THREE.BoxGeometry(0.25, 0.075, 0.25), stone, [cx, top - 0.335, cz]);
      add(new THREE.BoxGeometry(0.26, 0.016, 0.26), gilt, [cx, top - 0.29, cz]);
      for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 12), stone, [cx + sx * 0.1, top - 0.36, cz], [Math.PI / 2, 0, 0]);
    }
    // gilt ridge dragons (chiwei) and a cobalt ridge cap
    const along = w >= d ? 'x' : 'z', L = Math.max(w, d), W = Math.min(w, d), half = Math.max(0.35, (L - W) / 2 * (spec.ridgeScale ?? 0.9));
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const fin = new THREE.Shape(); fin.moveTo(-0.13, 0); fin.lineTo(-0.13, 0.24); fin.quadraticCurveTo(-0.11, 0.44, 0.05, 0.47); fin.quadraticCurveTo(0.13, 0.44, 0.09, 0.35); fin.quadraticCurveTo(0.03, 0.36, 0.04, 0.25); fin.lineTo(0.12, 0); fin.closePath();
    for (const sgn of [-1, 1]) {
      const g = new THREE.ExtrudeGeometry(fin, {depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10}); g.translate(0, 0, -0.035);
      const yaw = along === 'x' ? (sgn < 0 ? 0 : Math.PI) : (sgn < 0 ? -Math.PI / 2 : Math.PI / 2);
      const px = along === 'x' ? cx + sgn * half : cx, pz = along === 'x' ? cz : cz + sgn * half;
      add(g, gilt, [px, spec.roof - 0.06, pz], [0, yaw, 0]);
      add(new THREE.SphereGeometry(0.035, 12, 8), porcelain, [px + (along === 'x' ? -sgn * 0.05 : 0), spec.roof + 0.42, pz + (along === 'z' ? -sgn * 0.05 : 0)]);
    }
    const ridge = new THREE.CylinderGeometry(0.055, 0.055, half * 2, 12);
    add(ridge, deep, [cx, spec.roof - 0.02, cz], along === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]);
    // a gilt finial at the middle of the ridge: lotus cup, porcelain gourd, pearl and spike
    // (skipped where the ridge already carries a story landmark: the letter, the crane, the cat ears)
    const fy = spec.roof + 0.02;
    if (spec.finial !== false) {
    add(new THREE.CylinderGeometry(0.06, 0.075, 0.05, 12), gilt, [cx, fy + 0.025, cz]);
    const cup = new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); cup.rotateX(Math.PI); add(cup, gilt, [cx, fy + 0.13, cz]);
    add(new THREE.SphereGeometry(0.085, 16, 12), porcelain, [cx, fy + 0.2, cz]);
    add(new THREE.TorusGeometry(0.086, 0.012, 6, 20), cobalt, [cx, fy + 0.2, cz], [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(0.022, 0.03, 0.06, 10), gilt, [cx, fy + 0.31, cz]);
    add(new THREE.SphereGeometry(0.048, 14, 10), gilt, [cx, fy + 0.37, cz]);
    add(new THREE.ConeGeometry(0.018, 0.2, 8), gilt, [cx, fy + 0.5, cz]);
    }
    // little bells under every eave corner
    for (const e of spec.eaves || []) for (const ex of e.x) for (const ez of e.z) hangBell(add, gilt, [ex, e.y, ez], {lowSeg: low});
    // a pair of glowing porcelain lanterns under the front eaves
    for (const lx of [x0 + 0.3, x1 - 0.3]) {
      const ly = top - 0.42, lz = z1 + 0.3;
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 5), cord, [lx, top - 0.12, lz]);
      const body = new THREE.SphereGeometry(0.14, 16, 12); body.scale(1, 0.82, 1); add(body, silk, [lx, ly, lz]);
      for (const by of [-0.06, 0.06]) add(new THREE.TorusGeometry(0.128, 0.008, 6, 24), cobalt, [lx, ly + by, lz], [Math.PI / 2, 0, 0]);
      add(new THREE.CylinderGeometry(0.075, 0.09, 0.04, 12), gilt, [lx, ly + 0.12, lz]);
      add(new THREE.CylinderGeometry(0.09, 0.075, 0.04, 12), gilt, [lx, ly - 0.12, lz]);
      add(new THREE.CylinderGeometry(0.012, 0.02, 0.14, 6), cobalt, [lx, ly - 0.21, lz]);
      const world = station.localToWorld(new THREE.Vector3(lx, ly, lz)); lanternPoints.push(world.toArray());
    }
    const group = new THREE.Group(); group.name = 'enchantment-chinoiserie-details';
    for (const [m, list] of parts) { const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); const mesh = new THREE.Mesh(g, m); mesh.name = 'chinoiserie-' + station.name + '-' + m.name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); disposables.push(g); }
    station.add(group);
  }
  return {disposables, lanternPoints};
}

// A porcelain pagoda at the back of the island, a nod to the Porcelain Tower
// of Nanjing (the tower behind the Trianon de Porcelaine) and the Kew pagoda:
// nine octagonal storeys of white glazed brick, cobalt eaves with gilt bells,
// lit arched doors and a gilt spire.
const PAGODA = {x: 25, z: -30, storeys: 9};
function createPorcelainPagoda({low, ground = 0}) {
  const group = new THREE.Group(); group.name = 'enchantment-porcelain-pagoda';
  group.position.set(PAGODA.x, ground, PAGODA.z);
  const disposables = [], glowPoints = [];
  const bodyMat = new THREE.MeshStandardMaterial({name: 'pagoda-porcelain-bricks', color: '#ffffff', roughness: 0.34});
  patchPorcelainBricks(bodyMat, [PAGODA.x, PAGODA.z]);
  const paintMat = new THREE.MeshStandardMaterial({name: 'pagoda-cobalt-and-white-glaze', color: '#ffffff', vertexColors: true, roughness: 0.38, metalness: 0.04});
  const giltMat = new THREE.MeshStandardMaterial({name: 'pagoda-gilt', color: '#ffffff', vertexColors: true, roughness: 0.36, metalness: 0.42});
  const doorMat = new THREE.MeshStandardMaterial({name: 'pagoda-lit-doors', color: '#ffe2a8', emissive: '#ffb75e', emissiveIntensity: 1.25, roughness: 0.6});
  disposables.push(bodyMat, paintMat, giltMat, doorMat);
  const lists = new Map([[bodyMat, []], [paintMat, []], [giltMat, []], [doorMat, []]]);
  const colors = {cobalt: '#2b55ad', deep: '#1f4596', white: '#f4f5f8', marble: '#e9e6de', gold: '#e8c46a', door: '#ffffff'};
  const put = (g, mat, color, p = [0, 0, 0], r) => {
    const geo = g.index ? g.toNonIndexed() : g; if (geo !== g) g.dispose();
    if (r) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r))); geo.translate(...p);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    const c = new THREE.Color(color), n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    lists.get(mat).push(geo);
  };
  const oct = (rt, rb, h, open = false) => { const g = new THREE.CylinderGeometry(rt, rb, h, 8, 1, open); g.rotateY(Math.PI / 8); return g; };
  const giltAdd = (g, m, p, r) => put(g, giltMat, colors.gold, p, r);
  // a two-step marble plinth with a cobalt band
  put(oct(2.0, 2.1, 0.26), paintMat, colors.marble, [0, 0.13, 0]);
  put(oct(2.02, 2.02, 0.05), paintMat, colors.cobalt, [0, 0.235, 0]);
  put(oct(1.68, 1.74, 0.24), paintMat, colors.marble, [0, 0.38, 0]);
  for (let k = 0; k < 4; k++) {   // steps up to the four doors
    const a = k * Math.PI / 2, st = new THREE.BoxGeometry(0.62, 0.12, 0.34);
    put(st, paintMat, colors.marble, [Math.sin(a) * 2.15, 0.06, Math.cos(a) * 2.15], [0, a, 0]);
  }
  // an arched doorway shape: rectangle with a round top
  const arch = (w, h) => { const sh = new THREE.Shape(), r = w / 2; sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, h - r); sh.absarc(0, h - r, r, 0, Math.PI, false); sh.lineTo(-r, 0); return new THREE.ShapeGeometry(sh, low ? 6 : 10); };
  let y = 0.5;
  for (let i = 0; i < PAGODA.storeys; i++) {
    const r = 1.32 - i * 0.085, h = 0.98 - i * 0.035, ap = r * Math.cos(Math.PI / 8);
    put(oct(r * 0.985, r, h, true), bodyMat, '#ffffff', [0, y + h / 2, 0]);
    // corner columns in cobalt, a white frieze and a gilt line under the eaves
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + k * Math.PI / 4;
      put(new THREE.CylinderGeometry(0.035, 0.04, h - 0.1, 6), paintMat, colors.cobalt, [Math.sin(a) * r * 0.99, y + h / 2 - 0.02, Math.cos(a) * r * 0.99]);
    }
    put(oct(r + 0.03, r + 0.03, 0.08, true), paintMat, colors.white, [0, y + h - 0.08, 0]);
    put(oct(r + 0.035, r + 0.035, 0.018, true), giltMat, colors.gold, [0, y + h - 0.125, 0]);
    // lit arched doors on the four main faces, blind cobalt arches on the diagonals
    const dw = 0.3 - i * 0.012, dh = Math.min(0.56, h * 0.58);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, main = k % 2 === 0;
      const surround = arch(dw + 0.08, dh + 0.05); surround.rotateY(a);
      put(surround, paintMat, colors.cobalt, [Math.sin(a) * (ap + 0.006), y + 0.08, Math.cos(a) * (ap + 0.006)]);
      const door = arch(dw, dh); door.rotateY(a);
      put(door, main ? doorMat : paintMat, main ? colors.door : colors.white, [Math.sin(a) * (ap + 0.012), y + 0.1, Math.cos(a) * (ap + 0.012)]);
      if (main && k !== 4) glowPoints.push([PAGODA.x + Math.sin(a) * (ap + 0.05), ground + y + 0.1 + dh * 0.5, PAGODA.z + Math.cos(a) * (ap + 0.05)]);
    }
    // the eave: a cobalt glazed skirt with a white rim, gilt hips, upturned corners and bells
    const er = r + 0.46, et = r * 0.8, eh = 0.27, ey = y + h - 0.02;
    put(oct(et, er, eh), paintMat, colors.cobalt, [0, ey + eh / 2, 0]);
    put(oct(er + 0.012, er + 0.012, 0.055, true), paintMat, colors.white, [0, ey + 0.02, 0]);
    for (let k = 0; k < 8; k++) {
      // corners sit between the faces
      const a = k * Math.PI / 4 + Math.PI / 8, cxk = Math.sin(a), czk = Math.cos(a);
      const slope = Math.hypot(er - et, eh), tilt = Math.atan2(eh, er - et);
      const hip = new THREE.BoxGeometry(0.035, 0.035, slope); hip.rotateX(tilt); hip.translate(0, 0, (er + et) / 2); hip.rotateY(a);
      put(hip, giltMat, colors.gold, [0, ey + eh / 2 + 0.02, 0]);
      const tip = new THREE.ConeGeometry(0.035, 0.2, 6); tip.rotateX(Math.PI / 2 - 0.75); tip.translate(0, 0.04, er + 0.05); tip.rotateY(a);
      put(tip, paintMat, colors.cobalt, [0, ey, 0]);
      hangBell(giltAdd, null, [cxk * (er - 0.02), ey - 0.01, czk * (er - 0.02)], {s: 1.25, cord: 0.05, lowSeg: low});
    }
    y += h + eh * 0.55;
  }
  // the crown: a cobalt cap, gilt rings and pearls, and a tall gilt spire
  const rt = 1.32 - (PAGODA.storeys - 1) * 0.085;
  put(oct(0.14, rt * 0.8, 0.55), paintMat, colors.cobalt, [0, y + 0.06, 0]);
  const spireY = y + 0.32;
  put(new THREE.CylinderGeometry(0.11, 0.14, 0.12, 12), giltMat, colors.gold, [0, spireY + 0.06, 0]);
  put(new THREE.SphereGeometry(0.16, 16, 12), paintMat, colors.white, [0, spireY + 0.27, 0]);
  put(new THREE.TorusGeometry(0.161, 0.018, 6, 24), paintMat, colors.cobalt, [0, spireY + 0.27, 0], [Math.PI / 2, 0, 0]);
  put(new THREE.CylinderGeometry(0.03, 0.05, 1.1, 10), giltMat, colors.gold, [0, spireY + 0.95, 0]);
  for (let k = 0; k < (low ? 5 : 7); k++) put(new THREE.TorusGeometry(0.12 - k * 0.012, 0.016, 6, 20), giltMat, colors.gold, [0, spireY + 0.55 + k * 0.1, 0], [Math.PI / 2, 0, 0]);
  put(new THREE.SphereGeometry(0.1, 16, 12), giltMat, colors.gold, [0, spireY + 1.36, 0]);
  put(new THREE.ConeGeometry(0.03, 0.42, 8), giltMat, colors.gold, [0, spireY + 1.65, 0]);
  const top = ground + spireY + 1.36;
  glowPoints.push([PAGODA.x, top, PAGODA.z]);
  const meshes = [];
  for (const [mat, list] of lists) {
    if (!list.length) continue;
    const g = mergeGeometries(list, false); list.forEach(x => x.dispose());
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'enchantment-porcelain-pagoda-' + mat.name; mesh.castShadow = mat !== doorMat; mesh.receiveShadow = true;
    group.add(mesh); meshes.push(mesh); disposables.push(g);
  }
  return {group, disposables, glowPoints, meshes, top: [PAGODA.x, top, PAGODA.z]};
}

export function createEnchantment({scene, renderer, landscape, garden, quality = 'high', reduced = false, onStory, onOwl, onWhale, onPagoda} = {}) {
  const low = quality === 'low', root = new THREE.Group(); root.name = 'Enchantment layer — sky, candles, fireflies, bricks and keepsakes';
  const disposables = new Set(), interactables = [], glowMaterials = [];
  const rand = rng(2024);
  let time = 0;

  // 1. Sky and stars
  const sky = createSky(reduced); scene.add(sky.mesh); disposables.add(sky.mesh.geometry); disposables.add(sky.material);
  const stars = [];
  for (let i = 0, n = low ? 320 : 900; i < n; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u), R = 380;
    const pick = rand();
    stars.push({p: [Math.cos(a) * r * R, u * R, Math.sin(a) * r * R], c: pick < 0.7 ? '#fff6e8' : pick < 0.86 ? '#cfe2ff' : '#ffd9a0', s: 0.9 + rand() * (rand() < 0.08 ? 2.4 : 1.1), ph: rand()});
  }
  const starMat = glowMaterial({twinkle: 0.55, reduced}); glowMaterials.push(starMat);
  const starPoints = new THREE.Points(pointsGeometry(stars), starMat); starPoints.name = 'enchantment-twinkling-stars'; starPoints.frustumCulled = false; scene.add(starPoints);
  disposables.add(starPoints.geometry); disposables.add(starMat);

  // 2. LEGO studs, island bricks and roof colours
  const patched = new Set();
  landscape?.root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m?.name === 'magic-garden-deep-teal-earth' && !patched.has(m)) { m.color.set('#2f6a4c'); patchStuds(m); patched.add(m); }
    if (o.name.startsWith('complete-solid-curved-lower-jade-globe') && !patched.has(o)) {
      const clone = m.clone(); clone.name = m.name + '-brick-courses'; clone.color.set('#5e8a80'); patchBricks(clone); o.material = clone; disposables.add(clone); patched.add(o);
    }
  });
  const tinted = [];
  garden?.root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (m && PORCELAIN_ROOFS.has(m.name) && !patched.has(m)) { patchPorcelainRoof(m); patched.add(m); tinted.push(m.name); }
    }
  });

  garden?.root.updateMatrixWorld(true);
  const fusion = createFusionDetails({garden, low});
  fusion.disposables.forEach(r => disposables.add(r));

  // 2a. Chinoiserie wallpaper on the inner walls of every room
  const rooms = [];
  for (const st of garden?.stations || []) {
    st.root?.updateWorldMatrix(true, false);
    for (const room of st.source?.rooms || []) {
      const b = room.bounds; if (!b || !st.root) continue;
      const a = new THREE.Vector3(...b.min).applyMatrix4(st.root.matrixWorld), z = new THREE.Vector3(...b.max).applyMatrix4(st.root.matrixWorld);
      rooms.push([a.clone().min(z), a.max(z)]);
    }
  }
  const papered = new Set();
  if (rooms.length) {
    const paper = wallpaperTexture(low); disposables.add(paper);
    garden?.root.traverse(o => {
      if (!o.isMesh) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (m && /-plaster-crafted-surface$/.test(m.name) && !papered.has(m)) { patchWallpaper(m, rooms, paper); papered.add(m); }
      }
    });
  }

  // 2b. The crystal ball and the open sea. The old river, its lotus and koi,
  // and the partial glass shell give way to a seaside promenade.
  const sea = createGlobeAndSea({reduced, low});
  root.add(sea.group); sea.disposables.forEach(r => disposables.add(r));
  const promenade = createPromenade({low});
  root.add(promenade.group); promenade.disposables.forEach(r => disposables.add(r));
  const pagoda = createPorcelainPagoda({low, ground: landscape?.terrainHeight?.(PAGODA.x, PAGODA.z) ?? 0});
  root.add(pagoda.group); pagoda.disposables.forEach(r => disposables.add(r));
  if (renderer) renderer.localClippingEnabled = true;
  const frontClip = new THREE.Plane(new THREE.Vector3(0, 0, -1), FRONT_Z);
  const underClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 3.4);   // keeps y >= -3.4: the deep sea belongs to the whale
  const hideName = /^(finite-island-front-pond-water|whole-closed-pond-bottom|opaque-thick-lily-leaves|live-lotus-stems|pond-reeds|lotus-interaction-|event-surface-ripple-|closed-thin-crystal-lower-half-globe|closed-thin-open-rear-crystal-crescent|closed-inward-stepped-crystal-socket-)/;
  const hideMaterial = /^(open-rear-crystal-shell-low-opacity-fresnel|thin-opening-crystal-arcs-not-a-full-globe-overlay|magic-lotus-|magic-lily-|magic-koi-)/;
  let hidden = 0;
  const clipped = new Set();
  landscape?.root.traverse(o => {
    if (o.name === 'temporary-three-dimensional-kohaku-koi') { o.visible = false; hidden++; }
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (hideName.test(o.name) || mats.some(m => m && hideMaterial.test(m.name))) { o.visible = false; hidden++; return; }
    for (const m of mats) if (m && !clipped.has(m)) { m.clippingPlanes = [...(m.clippingPlanes || []), frontClip, underClip]; clipped.add(m); }
  });

  // 3. Floating candles above the Question Library and the welcome courtyard
  const candleSpots = [];
  for (let i = 0, n = low ? 22 : 40; i < n; i++) {
    const a = i / n * Math.PI * 2 + rand() * 0.3, r = 3.2 + rand() * 3.6;
    candleSpots.push([RESEARCH.x + Math.cos(a) * r, RESEARCH.roofTop + 0.8 + rand() * 2.6, RESEARCH.z + Math.sin(a) * r * 0.85]);
  }
  for (let i = 0, n = low ? 10 : 18; i < n; i++) {
    const a = rand() * Math.PI * 2, r = 2.2 + rand() * 3.2;
    candleSpots.push([HOME.x + Math.cos(a) * r, 5.6 + rand() * 1.8, HOME.z + Math.sin(a) * r * 0.8]);
  }
  const waxGeo = new THREE.CylinderGeometry(0.048, 0.052, 0.29, 8); waxGeo.translate(0, 0.145, 0);
  const flameGeo = new THREE.SphereGeometry(0.04, 8, 6); flameGeo.scale(1, 1.9, 1); flameGeo.translate(0, 0.36, 0);
  const waxMat = new THREE.MeshStandardMaterial({name: 'enchantment-candle-wax', color: '#f3e7cf', emissive: '#c88a3a', emissiveIntensity: 0.35, roughness: 0.7});
  const flameMat = new THREE.MeshBasicMaterial({name: 'enchantment-candle-flame', color: '#ffd889', toneMapped: false});
  const wax = new THREE.InstancedMesh(waxGeo, waxMat, candleSpots.length), flame = new THREE.InstancedMesh(flameGeo, flameMat, candleSpots.length);
  wax.name = 'enchantment-floating-candles'; flame.name = 'enchantment-candle-flames'; wax.frustumCulled = flame.frustumCulled = false;
  root.add(wax, flame); [waxGeo, flameGeo, waxMat, flameMat].forEach(r => disposables.add(r));
  const tmp = new THREE.Object3D();
  function placeCandles(t) {
    candleSpots.forEach((p, i) => {
      tmp.position.set(p[0], p[1] + (reduced ? 0 : Math.sin(t * 0.8 + i * 1.7) * 0.12), p[2]);
      tmp.rotation.set(reduced ? 0 : Math.sin(t * 0.5 + i) * 0.05, 0, reduced ? 0 : Math.cos(t * 0.6 + i) * 0.05);
      tmp.updateMatrix(); wax.setMatrixAt(i, tmp.matrix); flame.setMatrixAt(i, tmp.matrix);
    });
    wax.instanceMatrix.needsUpdate = flame.instanceMatrix.needsUpdate = true;
  }
  placeCandles(0);

  // 4. Glow cards for candles and the existing lanterns, plus fireflies
  const lanternGlows = [];
  scene.updateMatrixWorld(true);
  const box3 = new THREE.Box3(), c3 = new THREE.Vector3();
  scene.traverse(o => {
    if (!o.isMesh) return;
    const n = o.material?.name || '';
    if (n === 'warm-paper-lantern-emitter' || /^magic-theatre-gallery-lantern/.test(n) || n === 'ec-warm-lamp-glass') {
      box3.setFromObject(o); box3.getCenter(c3); lanternGlows.push({p: c3.toArray(), c: '#ffb85c', s: 1.5, ph: lanternGlows.length * 0.37});
    }
  });
  promenade.lampPoints.forEach((p, i) => lanternGlows.push({p, c: '#ffbe6a', s: 1.7, ph: 0.2 + i * 0.31}));
  fusion.lanternPoints.forEach((p, i) => lanternGlows.push({p, c: '#ffb45a', s: 1.2, ph: 0.5 + i * 0.23}));
  pagoda.glowPoints.forEach((p, i, all) => lanternGlows.push({p, c: i === all.length - 1 ? '#ffe3a0' : '#ffb75e', s: i === all.length - 1 ? 1.6 : 0.9, ph: 0.1 + i * 0.29}));
  const halo = candleSpots.map((p, i) => ({p: [p[0], p[1] + 0.36, p[2]], c: '#ffc96e', s: 0.7, ph: i * 0.13})).concat(lanternGlows);
  const haloMat = glowMaterial({twinkle: 0.12, reduced}); glowMaterials.push(haloMat);
  const haloPoints = new THREE.Points(pointsGeometry(halo), haloMat); haloPoints.name = 'enchantment-candle-and-lantern-glow'; haloPoints.frustumCulled = false; root.add(haloPoints);
  disposables.add(haloPoints.geometry); disposables.add(haloMat);
  const haloPos = haloPoints.geometry.attributes.position;
  function syncHalos(t) {
    candleSpots.forEach((p, i) => haloPos.setY(i, p[1] + 0.36 + Math.sin(t * 0.8 + i * 1.7) * 0.12));
    haloPos.needsUpdate = true;
  }
  const flies = [];
  for (let i = 0, n = low ? 70 : 220; i < n; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.9;
    flies.push({p: [ISLAND.cx + Math.cos(a) * r * ISLAND.rx, 0.5 + rand() * 3.2, ISLAND.cz + Math.sin(a) * r * ISLAND.rz], c: rand() < 0.72 ? '#ffd772' : '#8ff0e0', s: 0.22 + rand() * 0.16, ph: rand()});
  }
  const flyMat = glowMaterial({twinkle: 0.85, drift: 0.55, reduced}); glowMaterials.push(flyMat);
  const flyPoints = new THREE.Points(pointsGeometry(flies), flyMat); flyPoints.name = 'enchantment-fireflies'; flyPoints.frustumCulled = false; root.add(flyPoints);
  disposables.add(flyPoints.geometry); disposables.add(flyMat);

  // 5b. The hidden whale: Hanjing sounds a little like 鲸 (jing), whale.
  const whale = buildWhale({low});
  root.add(whale.root); whale.disposables.forEach(r => disposables.add(r));
  const whalePath = {cx: GLOBE.cx, cz: 12.5, y: -7.5, ax: 13, az: 2.5, period: 120};
  let reveal = 0, revealTarget = 0, revealUntil = 0;
  const bubbleEntries = [];
  for (let i = 0; i < (low ? 18 : 40); i++) bubbleEntries.push({p: [0, -100, 0], c: '#cfefff', s: 0.12 + rand() * 0.18, ph: rand()});
  const bubbleMat = glowMaterial({twinkle: 0.2, reduced}); glowMaterials.push(bubbleMat);
  const bubbles = new THREE.Points(pointsGeometry(bubbleEntries), bubbleMat); bubbles.name = 'enchantment-whale-bubbles'; bubbles.frustumCulled = false; root.add(bubbles);
  disposables.add(bubbles.geometry); disposables.add(bubbleMat);
  const bubbleAge = bubbleEntries.map((_, i) => i / bubbleEntries.length * 6), bubbleOrigin = bubbleEntries.map(() => new THREE.Vector3());
  function toggleWhale() {
    revealTarget = revealTarget > 0.5 ? 0 : 1; revealUntil = time + 45;
    if (revealTarget) onWhale?.();
    return revealTarget;
  }
  interactables.push({id: 'enchantment-hidden-whale', type: 'enchant', title: 'Something moves in the deep', objects: [...whale.meshes, sea.water], point: [GLOBE.cx, -12, GLOBE.cz], onInteract: toggleWhale});

  // 5c. The porcelain pagoda rings its bells when visited
  interactables.push({id: 'enchantment-porcelain-pagoda', type: 'enchant', title: 'The porcelain pagoda', objects: pagoda.meshes, point: pagoda.top, onInteract: () => { burst(pagoda.top); onPagoda?.(); }});

  // 6. The owl on the letter tree
  const owl = buildOwl();
  owl.root.position.set(32.6, 1.8, -11.15); owl.root.rotation.y = 0.25; owl.root.scale.setScalar(0.72);
  root.add(owl.root); owl.materials.forEach(m => disposables.add(m)); owl.root.traverse(o => { if (o.geometry) disposables.add(o.geometry); if (o.material && !owl.materials.includes(o.material)) disposables.add(o.material); });
  const owlMeshes = []; owl.root.traverse(o => o.isMesh && owlMeshes.push(o));
  interactables.push({id: 'enchantment-owl-post', type: 'enchant', station: 'contact', title: 'The owl post', objects: owlMeshes, point: owl.root.position.toArray(), onInteract: () => onOwl?.()});

  // 6b. Books flying around the Question Library: each paper takes wing
  const bookColors = ['#3b5c9a', '#9a3b35', '#3f7a52', '#c79a3a', '#6b4f93', '#2f6670', '#a4632e', '#5a6f8e', '#8a3f5e', '#4d7f6a', '#b5813a', '#3d4f7a'];
  const nBooks = low ? 6 : 12;
  const coverGeo = new THREE.BoxGeometry(0.16, 0.012, 0.24); coverGeo.translate(0.08, 0, 0);
  const pageGeo = new THREE.BoxGeometry(0.15, 0.03, 0.22); pageGeo.translate(0.075, -0.012, 0);
  const coverMat = new THREE.MeshStandardMaterial({name: 'enchantment-flying-book-covers', roughness: 0.62});
  const pageMat = new THREE.MeshStandardMaterial({name: 'enchantment-flying-book-pages', color: '#f2e8d2', roughness: 0.9});
  const covers = new THREE.InstancedMesh(coverGeo, coverMat, nBooks * 2), pages = new THREE.InstancedMesh(pageGeo, pageMat, nBooks * 2);
  covers.name = 'enchantment-flying-books'; pages.name = 'enchantment-flying-book-pages'; covers.frustumCulled = pages.frustumCulled = false;
  for (let i = 0; i < nBooks * 2; i++) covers.setColorAt(i, new THREE.Color(bookColors[(i >> 1) % bookColors.length]));
  covers.instanceColor.needsUpdate = true;
  root.add(covers, pages); [coverGeo, pageGeo, coverMat, pageMat].forEach(r => disposables.add(r));
  const bookTmp = new THREE.Object3D(), half = new THREE.Object3D(); bookTmp.add(half);
  function placeBooks(t) {
    for (let b = 0; b < nBooks; b++) {
      const a = t * (0.16 + (b % 3) * 0.03) + b / nBooks * Math.PI * 2, r = 4.4 + (b % 4) * 0.55;
      bookTmp.position.set(RESEARCH.x + Math.cos(a) * r, RESEARCH.roofTop - 1.6 + (b % 5) * 0.55 + Math.sin(t * 1.1 + b) * 0.18, RESEARCH.z + Math.sin(a) * r * 0.8);
      bookTmp.rotation.set(0, -a, 0.12 * Math.sin(t * 0.9 + b));
      const flap = reduced ? 0.6 : 0.55 + 0.42 * Math.sin(t * 5.2 + b * 1.3);
      for (const side of [0, 1]) {
        half.rotation.set(0, side ? Math.PI : 0, side ? -flap : flap);
        half.updateMatrix(); bookTmp.updateMatrix(); half.matrixWorld.multiplyMatrices(bookTmp.matrix, half.matrix);
        covers.setMatrixAt(b * 2 + side, half.matrixWorld); pages.setMatrixAt(b * 2 + side, half.matrixWorld);
      }
    }
    covers.instanceMatrix.needsUpdate = pages.instanceMatrix.needsUpdate = true;
  }
  placeBooks(0);

  // 6c. Warm lit windows, and a cool moonlight rim from behind the island
  const glassNames = /glass-crafted-surface$|^lehigh-(stained|rose-amber)-glass$|^ec-campus-recessed-glass$/;
  const litGlass = new Set();
  garden?.root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (m && glassNames.test(m.name) && m.emissive && !litGlass.has(m)) { m.emissive.set('#ffb35c'); m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.42); litGlass.add(m); }
    }
  });
  const moon = new THREE.DirectionalLight('#8fa9ff', 0.42); moon.name = 'enchantment-moon-rim';
  moon.position.set(ISLAND.cx + 30, 26, ISLAND.cz - 48); moon.target.position.set(ISLAND.cx, 0, ISLAND.cz);
  root.add(moon, moon.target);

  // 7. Discovery bursts: a pooled ring of rising sparkles
  const bursts = [];
  for (let b = 0; b < 3; b++) {
    const n = low ? 28 : 54, entries = [];
    for (let i = 0; i < n; i++) entries.push({p: [0, 0, 0], c: i % 3 ? '#ffd981' : '#bff7ff', s: 0.16 + rand() * 0.14, ph: rand()});
    const g = pointsGeometry(entries);
    const mat = new THREE.ShaderMaterial({
      name: 'enchantment-discovery-burst',
      uniforms: {uAge: {value: 99}, uOrigin: {value: new THREE.Vector3()}, uScale: {value: 400}},
      vertexShader: /* glsl */`attribute float size; attribute float phase; attribute vec3 color; uniform float uAge, uScale; uniform vec3 uOrigin; varying vec3 vColor; varying float vAlpha;
        void main(){ float a = phase * 6.2831853 * 3.0, sp = 0.6 + fract(phase * 7.3) * 1.1;
          vec3 p = uOrigin + vec3(cos(a) * sp * uAge, uAge * (1.2 + fract(phase * 13.1) * 1.4) - 0.35 * uAge * uAge, sin(a) * sp * uAge);
          vAlpha = smoothstep(1.8, 0.2, uAge) * step(uAge, 1.8); vColor = color;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(size * uScale / max(0.1, -mv.z), 1.0, 64.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: glowMaterial().fragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false
    });
    const pts = new THREE.Points(g, mat); pts.name = 'enchantment-discovery-burst-' + b; pts.frustumCulled = false; pts.visible = false; root.add(pts);
    bursts.push({pts, mat}); disposables.add(g); disposables.add(mat);
  }
  let nextBurst = 0;
  function burst(point) {
    if (reduced || !point) return;
    const b = bursts[nextBurst++ % bursts.length];
    b.mat.uniforms.uOrigin.value.copy(point.isVector3 ? point : new THREE.Vector3().fromArray(point));
    b.mat.uniforms.uAge.value = 0; b.pts.visible = true;
  }

  // keepsakes live inside rooms; drawing them from across the island wastes draw calls
  const nearOnly = ['keepsake-two-shores-box', 'keepsake-two-crossings-map'].map(n => scene.getObjectByName(n)).filter(Boolean)
    .map(o => ({o, p: o.getWorldPosition(new THREE.Vector3())}));
  let owlTurn = 0, nextBlink = 2;
  function update(dt, t, camera, renderer) {
    time = t;
    sky.mesh.position.copy(camera.position); sky.update(t);
    starPoints.position.copy(camera.position);
    const h = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    const scale = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const m of glowMaterials) { m.uniforms.uTime.value = t; m.uniforms.uScale.value = scale; }
    sea.update(t, camera);
    for (const k of nearOnly) k.o.visible = camera.position.distanceTo(k.p) < 12;
    if (revealTarget && time > revealUntil) revealTarget = 0;
    reveal = reduced ? revealTarget : THREE.MathUtils.damp(reveal, revealTarget, 1.6, dt || 1 / 60);
    sea.setReveal(reveal);
    const ang = (reduced ? 0.3 : t / whalePath.period) * Math.PI * 2;
    // a slow S along the front half of the ball, so visitors see the whale side-on
    const vx = Math.cos(ang) * whalePath.ax, vz = Math.cos(2 * ang) * 2 * whalePath.az;
    whale.root.position.set(whalePath.cx + Math.sin(ang) * whalePath.ax, whalePath.y + (reduced ? 0 : Math.sin(t * 0.21) * 1.2), whalePath.cz + Math.sin(2 * ang) * whalePath.az);
    whale.root.rotation.set(0, -Math.atan2(vz, vx), reduced ? 0 : Math.sin(t * 0.21 + 1.2) * 0.06);
    whale.update(t, reveal, reduced);
    const bp = bubbles.geometry.attributes.position;
    for (let i = 0; i < bubbleAge.length; i++) {
      bubbleAge[i] += (dt || 0);
      if (bubbleAge[i] > 6) { bubbleAge[i] = 0; bubbleOrigin[i].set(4.8, 1.2, 0).applyMatrix4(whale.root.matrixWorld); }
      const o = bubbleOrigin[i], k = bubbleAge[i];
      if (reveal < 0.05 || o.y < -60) { bp.setXYZ(i, 0, -100, 0); continue; }
      bp.setXYZ(i, o.x + Math.sin(k * 2 + i) * 0.25, Math.min(SEA.level - 0.5, o.y + k * 2.4), o.z + Math.cos(k * 1.7 + i) * 0.25);
    }
    bp.needsUpdate = true;
    if (!reduced) { placeCandles(t); syncHalos(t); placeBooks(t); }
    for (const b of bursts) { if (!b.pts.visible) continue; b.mat.uniforms.uScale.value = scale; b.mat.uniforms.uAge.value += dt; if (b.mat.uniforms.uAge.value > 1.8) b.pts.visible = false; }
    if (!reduced) {
      owlTurn += dt;
      owl.head.rotation.y = Math.sin(owlTurn * 0.35) * 0.65 + Math.sin(owlTurn * 1.3) * 0.05;
      nextBlink -= dt; const blink = nextBlink < 0.12 && nextBlink > 0 ? 0.12 : 1; owl.eyes.scale.y = blink;
      if (nextBlink < 0) nextBlink = 2.5 + Math.random() * 3;
    }
  }

  return {
    root, interactables, burst, update, toggleWhale, overviewBounds: sea.bounds,
    get diagnostics() {
      return {hiddenRiverAndShellParts: hidden, clippedMaterials: clipped.size, litGlass: litGlass.size, books: nBooks, stars: stars.length, candles: candleSpots.length, glows: halo.length, fireflies: flies.length, lanternGlows: lanternGlows.length, porcelainRoofs: tinted, wallpaperRooms: rooms.length, wallpaperMaterials: [...papered].map(m => m.name), drawCalls: 'sky 1, stars 1, candles 2, glow 1, fireflies 1, bridges 8, thread 1, owl ~20 small meshes, bursts 3 (only while active)'};
    },
    dispose() { scene.remove(sky.mesh, starPoints); root.removeFromParent(); for (const r of disposables) r.dispose?.(); disposables.clear(); }
  };
}
