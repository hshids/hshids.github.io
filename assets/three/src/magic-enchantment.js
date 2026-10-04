import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// The enchantment layer: a magical night sky, LEGO-like studs and brick
// courses, floating candles, fireflies, lantern glow, the crystal ball and its
// sea, the hidden whale, the snowy owl, and a chinoiserie dress for the
// buildings (blue-and-white porcelain roofs, gilt bells and finials, Chinese
// Chippendale fretwork and a porcelain pagoda).
// It only adds to the existing world: no routes, rooms or colliders change.

const ISLAND = {cx: 10.5, cz: -14, rx: 35, rz: 24};
const RESEARCH = {x: -12, z: -12.25, roofTop: 6.1};
const HOME = {x: 0, z: -0.5};

// Each station roof gets its own glaze: blue-and-white faience after the
// Trianon de Porcelaine for Home and Research, jade green for the timber Talks
// hall, ink-black tiles for the Huizhou-style Writing studio, and amber for
// Life's tower house.
const ROOF_STYLES = {
  porcelain: {white: '#f4f6fb', ink: '#2a56b4', deep: '#1f4596', line: '#f4f6fb', motif: true, roughness: 0.36},
  jade: {white: '#5aa585', ink: '#2c6b56', deep: '#21503f', line: '#e8c86a', motif: false, roughness: 0.32},
  ink: {white: '#4a4f57', ink: '#23262b', deep: '#2a2d33', line: '#f1eee6', motif: false, roughness: 0.58},
  amber: {white: '#e8ae48', ink: '#a8661f', deep: '#7c4a1a', line: '#f7dd90', motif: false, roughness: 0.32}
};
const ROOF_BY_MATERIAL = {
  'HWL-home-roof-crafted-surface': 'porcelain', 'research-roof-crafted-surface': 'porcelain',
  'Talks-roof-crafted-surface': 'jade', 'HWL-writing-roof-crafted-surface': 'ink', 'HWL-life-roof-crafted-surface': 'amber'
};

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
 * Glazed roofs. Each toy tile lap is shaded in its own frame: porcelain tiles
 * get a cobalt motif chosen by their position, the other glazes a soft crown
 * and darker edges. The slab, ridges, eaves and upturned corners under the
 * tiles take the deep glaze with fine lines.
 */
function patchGlazedRoof(material, styleName) {
  const style = ROOF_STYLES[styleName];
  material.color.set('#ffffff');
  material.roughness = style.roughness;
  const uniforms = {uPorcWhite: {value: new THREE.Color(style.white)}, uPorcInk: {value: new THREE.Color(style.ink)}, uPorcDeep: {value: new THREE.Color(style.deep)}, uRoofLine: {value: new THREE.Color(style.line)}};
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
      .replace('#include <common>', `#include <common>\n${style.motif ? '#define PORC_MOTIF' : ''}\nuniform vec3 uRoofLine;\nvarying vec3 vPorcL, vPorcLN, vPorcW, vPorcN; varying float vPorcI;\n${PORCELAIN_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 porc;
          if (vPorcI > 0.5) {
            float seed = vPorcI - 1.0;
            vec2 p = vPorcL.xz / vec2(0.12, 0.13);
            #ifdef PORC_MOTIF
              float ink = vPorcLN.y > 0.35 ? porcMotif(p, seed) : 0.9;
              porc = mix(uPorcWhite * (0.95 + 0.06 * seed), uPorcInk, ink);
            #else
              float edge = smoothstep(0.70, 0.98, abs(p.x)) + 0.55 * smoothstep(0.72, 0.98, abs(p.y));
              float crown = 1.0 + 0.10 * (1.0 - smoothstep(0.0, 0.55, abs(p.x)));
              porc = vPorcLN.y > 0.35 ? mix(uPorcWhite * (0.86 + 0.2 * seed) * crown, uPorcInk, clamp(edge, 0.0, 1.0) * 0.75) : uPorcInk;
            #endif
          } else {
            vec3 n = normalize(vPorcN);
            float line = porcAA(0.035 - abs(fract(vPorcW.y * 6.0) - 0.5) + 0.43) * (1.0 - step(0.7, abs(n.y)));
            porc = mix(uPorcDeep, uRoofLine, line * 0.85);
          }
          diffuseColor.rgb *= porc;
        }`);
  };
  material.customProgramCacheKey = () => 'enchantment-glazed-roof-' + styleName + '-v2';
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

// Each building's rooms get their own hand-painted wallpaper over a wooden
// wainscot, chosen to suit the room:
//   Home      midnight-blue silk with gilt stars, little envelopes on dotted
//             flight paths and owl feathers (letters are always welcome), walnut
//   Research  a deep library-green damask with gilt medallions, dark walnut
//   Talks     crimson silk with gold cloud medallions, dark lacquer panels
//   Writing   ink bamboo on rice paper, pale elm panels
//   Life      a garden of blossoms, birds, butterflies and little cats on a
//             honey silk ground, honey oak panels
const RAIL_GILT = '#caa255';
const INTERIORS = {
  'HWL-home-plaster-crafted-surface': {paper: 'letters', wood: '#5b3b28', rail: RAIL_GILT, scale: 1.1},
  'research-plaster-crafted-surface': {paper: 'library', wood: '#3e2a1e', rail: RAIL_GILT, scale: 0.9},
  'magic-research-plaster-crafted-surface': {paper: 'library', wood: '#3e2a1e', rail: RAIL_GILT, scale: 0.9},
  'Talks-plaster-crafted-surface': {paper: 'crimson', wood: '#3a1e17', rail: RAIL_GILT, scale: 0.9},
  'HWL-writing-plaster-crafted-surface': {paper: 'bamboo', wood: '#a98458', rail: '#6d4f33', scale: 1.4},
  'HWL-life-plaster-crafted-surface': {paper: 'garden', wood: '#8a5a34', rail: RAIL_GILT, scale: 1.25}
};

/** Paints one tileable wallpaper on a canvas. Every element is drawn nine times so the tile wraps. */
function wallpaperTexture(kind, low) {
  const S = low ? 256 : 512, k = S / 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'), r = rng(kind.length * 977 + 77);
  const wrap = fn => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { c.save(); c.translate(dx, dy); c.scale(k, k); fn(); c.restore(); } };
  const bez = (P, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]); };
  const grain = (base, amount) => { c.fillStyle = base; c.fillRect(0, 0, S, S); for (let i = 0; i < 1400 * k * k; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,40,20'},${amount * r()})`; c.fillRect(r() * S, r() * S, 1 + r() * 2 * k, 1); } };
  const bird = (x, y, tilt, dir, body, wing, s = 1) => {
    c.save(); c.translate(x, y); c.rotate(tilt); c.scale(dir * s, s); c.fillStyle = body;
    c.beginPath(); c.moveTo(-14, 2); c.lineTo(-46, 16); c.lineTo(-44, 8); c.lineTo(-12, -3); c.fill();
    c.beginPath(); c.ellipse(0, 0, 17, 9, -0.15, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(15, -7, 7, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(21, -8); c.lineTo(29, -6); c.lineTo(21, -4); c.fill();
    c.fillStyle = wing; c.beginPath(); c.ellipse(-2, 2, 9, 3.5, -0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(17, -8, 1.6, 0, Math.PI * 2); c.fill();
    c.restore();
  };
  const flower = (x, y, R, rot, petal, line, heart) => {
    for (let i = 0; i < 5; i++) { const a = rot + i * Math.PI * 2 / 5; c.beginPath(); c.arc(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62, R * 0.52, 0, Math.PI * 2); c.fillStyle = petal; c.fill(); if (line) { c.lineWidth = 1.4; c.strokeStyle = line; c.stroke(); } }
    c.beginPath(); c.arc(x, y, R * 0.24, 0, Math.PI * 2); c.fillStyle = heart; c.fill();
  };
  const branchesWith = (branches, twigColour, petalColours, leafColours, line, heart) => {
    const blossoms = [], leaves = [], twigs = [];
    for (const P of branches) for (let t = 0.12; t < 1; t += 0.11 + r() * 0.06) {
      const [x, y] = bez(P, t), a = r() * Math.PI * 2, len = 22 + r() * 26;
      twigs.push([x, y, x + Math.cos(a) * len, y + Math.sin(a) * len]);
      blossoms.push([x + Math.cos(a) * len, y + Math.sin(a) * len, 7 + r() * 4, r() * 6, petalColours[Math.floor(r() * petalColours.length)]]);
      if (r() < 0.7) blossoms.push([x + Math.cos(a + 0.9) * 12, y + Math.sin(a + 0.9) * 12, 5 + r() * 2, r() * 6, petalColours[Math.floor(r() * petalColours.length)]]);
      for (let j = 0; j < 2; j++) leaves.push([x + Math.cos(a - 1.4 - j) * 14, y + Math.sin(a - 1.4 - j) * 14, a - 1.4 - j, leafColours[(j + Math.floor(r() * 2)) % leafColours.length]]);
    }
    return () => {
      c.lineCap = 'round'; c.strokeStyle = twigColour;
      for (const P of branches) for (const [wd, al] of [[9, 0.55], [5, 1]]) { c.lineWidth = wd; c.globalAlpha = al; c.beginPath(); c.moveTo(...P[0]); c.bezierCurveTo(...P[1], ...P[2], ...P[3]); c.stroke(); }
      c.globalAlpha = 1; c.lineWidth = 2.2;
      for (const [a0, b0, a1, b1] of twigs) { c.beginPath(); c.moveTo(a0, b0); c.quadraticCurveTo((a0 + a1) / 2 + 6, (b0 + b1) / 2 - 6, a1, b1); c.stroke(); }
      for (const [x, y, a, col] of leaves) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      for (const [x, y, R, rot, col] of blossoms) flower(x, y, R, rot, col, line, heart);
    };
  };
  const branches = [[[30, 500], [130, 400], [70, 270], [210, 170]], [[290, 520], [270, 410], [390, 350], [480, 240]], [[230, 130], [300, 60], [410, 100], [505, 15]]];

  if (kind === 'letters') {
    // midnight silk, gilt stars, little envelopes flying along dotted paths, a few owl feathers
    grain('#1e2c49', 0.05);
    const stars = Array.from({length: 26}, () => [r() * 512, r() * 512, 1 + r() * 2.6, r()]);
    const letters = [[90, 120, -0.35], [330, 70, 0.25], [420, 300, -0.15], [170, 380, 0.4], [260, 230, -0.05]];
    const paths = [[[40, 200], [120, 40], [330, 70]], [[330, 70], [470, 160], [420, 300]], [[420, 300], [330, 470], [170, 380]], [[170, 380], [40, 300], [90, 120]]];
    const sparkle = (x, y, R) => { c.beginPath(); c.moveTo(x, y - R * 2.4); c.quadraticCurveTo(x, y, x + R * 2.4, y); c.quadraticCurveTo(x, y, x, y + R * 2.4); c.quadraticCurveTo(x, y, x - R * 2.4, y); c.quadraticCurveTo(x, y, x, y - R * 2.4); c.fill(); };
    const envelope = (x, y, a) => {
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = '#f3e6c8'; c.fillRect(-15, -10, 30, 20);
      c.strokeStyle = '#c9a55a'; c.lineWidth = 1.2; c.strokeRect(-15, -10, 30, 20);
      c.beginPath(); c.moveTo(-15, -10); c.lineTo(0, 2); c.lineTo(15, -10); c.stroke();
      c.fillStyle = '#9c3a30'; c.beginPath(); c.arc(0, 2, 3.2, 0, Math.PI * 2); c.fill();
      c.restore();
    };
    const feather = (x, y, a) => {
      c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#e9eef2'; c.globalAlpha = 0.85;
      c.beginPath(); c.moveTo(0, -24); c.quadraticCurveTo(9, -6, 3, 20); c.lineTo(0, 26); c.lineTo(-3, 20); c.quadraticCurveTo(-9, -6, 0, -24); c.fill();
      c.strokeStyle = '#c9a55a'; c.lineWidth = 1; c.globalAlpha = 1; c.beginPath(); c.moveTo(0, -22); c.lineTo(0, 27); c.stroke(); c.restore();
    };
    wrap(() => {
      c.strokeStyle = '#c9a55a'; c.globalAlpha = 0.5; c.lineWidth = 1.4; c.setLineDash([2, 7]);
      for (const [a, q, b] of paths) { c.beginPath(); c.moveTo(...a); c.quadraticCurveTo(...q, ...b); c.stroke(); }
      c.setLineDash([]); c.globalAlpha = 1;
      for (const [x, y, R, k] of stars) { c.fillStyle = k > 0.7 ? '#f2d58c' : '#c9a55a'; if (R > 2.6) sparkle(x, y, R); else { c.beginPath(); c.arc(x, y, R * 0.7, 0, Math.PI * 2); c.fill(); } }
      for (const [x, y, a] of letters) envelope(x, y, a);
      feather(250, 120, 0.6); feather(470, 440, -0.5);
    });
  } else if (kind === 'birds') {
    grain('#efece0', 0.035);
    const draw = branchesWith(branches, '#2c4f9c', ['#fbfaf5'], ['#8ea6d4'], '#2c4f9c', '#2c4f9c');
    wrap(() => { draw(); bird(150, 236, -0.25, 1, '#2c4f9c', '#fbfaf5'); bird(395, 318, 0.2, -1, '#2c4f9c', '#fbfaf5'); });
  } else if (kind === 'library' || kind === 'crimson') {
    // damask: an ogee trellis with a gilt-hearted medallion in every cell, tone on tone
    const [ground, tone, gold] = kind === 'library' ? ['#20392f', '#2c4c40', '#b8954f'] : ['#6a1f24', '#83302f', '#d2a752'];
    grain(ground, 0.05);
    const medallion = (x, y) => {
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = tone; c.beginPath(); c.ellipse(0, -38, 13, 30, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = tone; c.beginPath(); c.ellipse(0, -24, 7, 15, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.strokeStyle = gold; c.lineWidth = 3; c.stroke();
      if (kind === 'crimson') { // a round longevity-style knot in gold
        c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y - 9); c.lineTo(x + 9, y + 9); c.lineTo(x - 9, y + 9); c.closePath(); c.moveTo(x, y - 14); c.lineTo(x, y + 14); c.moveTo(x - 14, y); c.lineTo(x + 14, y); c.stroke();
      } else { c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fillStyle = gold; c.fill(); }
    };
    wrap(() => {
      c.strokeStyle = tone; c.lineWidth = 7;
      for (const [ax, ay, bx, by, qx, qy] of [[256, 0, 512, 256, 470, 40], [512, 256, 256, 512, 470, 470], [256, 512, 0, 256, 40, 470], [0, 256, 256, 0, 40, 40]]) { c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(qx, qy, bx, by); c.stroke(); }
      for (const [x, y] of [[256, 0], [512, 256], [256, 512], [0, 256]]) { c.fillStyle = gold; for (const [dx, dy] of [[0, -9], [-8, 5], [8, 5]]) { c.beginPath(); c.arc(x + dx, y + dy, 4, 0, Math.PI * 2); c.fill(); } }
      medallion(256, 256); medallion(0, 0);
      c.strokeStyle = gold; c.lineWidth = 1.4; c.globalAlpha = 0.6;
      for (const [x, y] of [[128, 128], [384, 384], [384, 128], [128, 384]]) { c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
    });
  } else if (kind === 'bamboo') {
    // ink bamboo on rice paper: wet strokes for the stalks, tapered leaves in two ink tones
    grain('#f3eee2', 0.05);
    const stalks = [[70, 16, 0.9], [300, 12, 0.55], [420, 18, 0.85]];
    wrap(() => {
      for (const [x, wd, ink] of stalks) {
        for (let y = 0; y < 512; y += 128) {
          const g = c.createLinearGradient(x - wd / 2, 0, x + wd / 2, 0); g.addColorStop(0, `rgba(30,32,34,${ink})`); g.addColorStop(0.5, `rgba(30,32,34,${ink * 0.55})`); g.addColorStop(1, `rgba(30,32,34,${ink})`);
          c.fillStyle = g; c.fillRect(x - wd / 2, y + 4, wd, 120);
          c.strokeStyle = `rgba(20,20,22,${ink})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x - wd / 2 - 3, y + 2); c.quadraticCurveTo(x, y + 7, x + wd / 2 + 3, y + 2); c.stroke();
        }
      }
      const leaf = (x, y, a, len, ink) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = `rgba(28,30,32,${ink})`; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.4, -len * 0.16, len, 0); c.quadraticCurveTo(len * 0.4, len * 0.1, 0, 0); c.fill(); c.restore(); };
      for (const [x, , ink] of stalks) for (let i = 0; i < 4; i++) {
        const y = 40 + i * 120 + (x % 50), side = i % 2 ? 1 : -1;
        for (let j = 0; j < 4; j++) leaf(x, y + j * 4, side * (0.35 + j * 0.28) + (side < 0 ? Math.PI : 0), 46 + j * 8, ink * (0.9 - j * 0.12));
      }
      bird(220, 200, -0.1, 1, 'rgba(30,32,34,0.85)', 'rgba(243,238,226,1)', 0.8);
    });
  } else {
    // Life: a honey silk garden with blossoms, birds, butterflies and two little cats on the branches
    grain('#ecd9b9', 0.045);
    const draw = branchesWith(branches, '#6b5a48', ['#e09a85', '#f6efe2', '#f0b79a'], ['#7f9a74', '#a7b98f'], null, '#b5524a');
    const cat = (x, y, fur, s, look) => {
      c.save(); c.translate(x, y); c.scale(s * look, s); c.fillStyle = fur;
      c.beginPath(); c.ellipse(0, -12, 11, 14, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(4, -30, 8.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(-2, -35); c.lineTo(0, -45); c.lineTo(4, -37); c.fill(); c.beginPath(); c.moveTo(6, -37); c.lineTo(11, -45); c.lineTo(12, -33); c.fill();
      c.lineWidth = 4; c.strokeStyle = fur; c.lineCap = 'round'; c.beginPath(); c.moveTo(-9, -3); c.quadraticCurveTo(-24, 2, -20, 14); c.stroke();
      c.restore();
    };
    const butterfly = (x, y, col) => { c.fillStyle = col; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(x + sg * 6, y - 3, 6, 4.5, sg * 0.5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x + sg * 5, y + 4, 4, 3, -sg * 0.4, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#4a3a2c'; c.fillRect(x - 0.8, y - 6, 1.6, 12); };
    wrap(() => {
      draw();
      bird(150, 236, -0.25, 1, '#3f7f84', '#f6efe2'); bird(395, 318, 0.2, -1, '#c2604f', '#f6efe2', 0.9);
      cat(110, 262, '#c98a4b', 0.8, 1); cat(338, 120, '#2e2a28', 0.75, -1);
      butterfly(250, 330, '#d98f6f'); butterfly(460, 420, '#6f9ab0');
    });
  }
  const tex = new THREE.CanvasTexture(cv); tex.name = 'enchantment-wallpaper-' + kind;
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}

/**
 * Paints the inner faces of every room wall with the room's wallpaper above a
 * wooden wainscot of raised panels, a chair rail and a skirting board. Faces
 * count as inner when they sit just inside a room's bounds and face its
 * centre, so outside walls keep their limewash.
 */
function patchWallpaper(material, rooms, tex, interior) {
  const n = Math.min(rooms.length, 12);
  const uniforms = {
    uPaper: {value: tex}, uRoomCount: {value: n}, uPaperScale: {value: interior.scale},
    uRoomMin: {value: Array.from({length: 12}, (_, i) => rooms[i] ? rooms[i][0] : new THREE.Vector3())},
    uRoomMax: {value: Array.from({length: 12}, (_, i) => rooms[i] ? rooms[i][1] : new THREE.Vector3())},
    uWood: {value: new THREE.Color(interior.wood)}, uRail: {value: new THREE.Color(interior.rail)}
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
        uniform vec3 uWood, uRail; uniform float uPaperScale;
        ${NOISE_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 n = normalize(vPaperN);
          for (int i = 0; i < 12; i++) {
            // the bevels and the top and bottom faces of the wall blocks are papered too, so their joints never show
            if (i >= uRoomCount) break;
            vec3 mn = uRoomMin[i], mx = uRoomMax[i], p = vPaperW;
            if (p.x < mn.x || p.x > mx.x || p.z < mn.z || p.z > mx.z || p.y < mn.y - 0.05 || p.y > mx.y + 0.05) continue;
            float ex = min(p.x - mn.x, mx.x - p.x), ez = min(p.z - mn.z, mx.z - p.z), edge = min(ex, ez);
            if (edge > 0.14 || dot(n.xz, (mn.xz + mx.xz) * 0.5 - p.xz) < -0.2) continue;
            float u = ez < ex ? p.x : p.z, h = p.y - mn.y;
            vec3 wall = texture2D(uPaper, vec2(u, h) / uPaperScale).rgb;
            // a thin gilt picture rail under the ceiling
            float top = mx.y - mn.y;
            wall = mix(wall, uRail, (1.0 - smoothstep(0.012, 0.02, abs(h - (top - 0.16)))));
            if (h < 0.82) {
              // the wainscot: raised panels framed by stiles and rails, with a little grain
              float grain = 0.9 + 0.1 * enchNoise(vec3(u * 3.0, h * 40.0, 1.7)) + 0.05 * sin(u * 90.0 + enchNoise(vec3(u * 8.0, h * 6.0, 3.1)) * 6.0);
              vec3 wood = uWood * grain;
              float pu = fract(u / 0.62), du = min(pu, 1.0 - pu) * 0.62 - 0.07;
              float dh = min(h - 0.16, 0.66 - h), inner = min(du, dh);
              float bevel = smoothstep(0.0, 0.04, inner), groove = smoothstep(-0.02, -0.01, inner) * (1.0 - smoothstep(-0.006, 0.0, inner));
              vec3 panel = inner > 0.0 ? wood * mix(0.82, 1.06, bevel) : wood * 0.93;
              panel *= 1.0 - 0.45 * groove;
              if (h > 0.71) panel = wood * (0.84 + 0.18 * smoothstep(0.71, 0.79, h));
              if (h > 0.795) panel = uRail;
              if (h < 0.1) panel = wood * 0.66;
              wall = panel;
            }
            diffuseColor.rgb = wall;
            break;
          }
        }`);
  };
  material.customProgramCacheKey = () => 'enchantment-wallpaper-v4-' + interior.paper;
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
  const swim = {uPhase: {value: 0}, uGlow: {value: 0}, uTime: {value: 0}};
  // a humpback profile: a long flat rostrum, a deep chest and a slim tail stock
  const prof = [[0, 0.08], [0.4, 0.26], [1.2, 0.46], [2.2, 0.68], [3.4, 0.98], [4.6, 1.3], [5.8, 1.56], [7.0, 1.72], [8.2, 1.74], [9.2, 1.62], [10.2, 1.4], [11.0, 1.12], [11.7, 0.82], [12.3, 0.5], [12.75, 0.24], [13, 0.0]];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r, y)), low ? 32 : 72, 0, Math.PI * 2);
  bodyGeo.rotateZ(-Math.PI / 2); bodyGeo.translate(-6.5, 0, 0); bodyGeo.scale(1, 0.84, 1);
  const pos = bodyGeo.attributes.position;
  // throat pleats cut into the belly from the chin to the navel
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(y, z) || 1, a = Math.atan2(z, -y);
    const belly = THREE.MathUtils.smoothstep(-y / r, 0.15, 0.55) * THREE.MathUtils.smoothstep(x, -1.8, 0.6) * (1 - THREE.MathUtils.smoothstep(x, 5.6, 6.4));
    const pleat = belly * 0.05 * Math.pow(Math.abs(Math.sin(a * 22)), 6);
    pos.setXYZ(i, x, y - (y / r) * pleat, z - (z / r) * pleat);
  }
  bodyGeo.computeVertexNormals();
  const col = new Float32Array(pos.count * 3), dark = new THREE.Color('#25333f'), slate = new THREE.Color('#3b4d5c'), pale = new THREE.Color('#d6dee3'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(y, z) || 1;
    c.copy(pale).lerp(dark, THREE.MathUtils.smoothstep(y / r, -0.42, 0.22));
    if (y / r > 0.2) c.lerp(slate, 0.35 * (0.5 + 0.5 * Math.sin(x * 2.1 + z * 3.3)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  bodyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const skin = new THREE.MeshStandardMaterial({name: 'whale-skin', vertexColors: true, roughness: 0.42, metalness: 0.05, emissive: '#2a8fb0', emissiveIntensity: 0});
  skin.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {uPhase: swim.uPhase, uGlow: swim.uGlow, uTime: swim.uTime});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPhase;\nvarying vec3 vWhaleL;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWhaleL = transformed;\nfloat tailW = smoothstep(2.5, -6.5, transformed.x);\ntransformed.y += 0.55 * tailW * sin(uPhase - transformed.x * 0.45) + 0.06 * smoothstep(3.0, 6.5, transformed.x) * sin(uPhase + 1.2);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uGlow, uTime;\nvarying vec3 vWhaleL;\n${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // mottled skin, pale scars and barnacle freckles on the back and the chin
          float mott = enchFbm(vWhaleL * vec3(1.6, 2.4, 2.4));
          diffuseColor.rgb *= 0.86 + 0.24 * mott;
          float barn = step(0.965, enchNoise(vWhaleL * 9.0)) * smoothstep(4.2, 6.2, vWhaleL.x);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.74, 0.79, 0.82), barn * 0.6);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // sunlight caustics rippling over the back, and a soft rim when the whale is revealed
          float up = clamp(normal.y, 0.0, 1.0);
          float ca = enchNoise(vec3(vWhaleL.xz * 1.6, uTime * 0.6)) * enchNoise(vec3(vWhaleL.xz * 2.7 + 4.0, uTime * 0.45));
          float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);
          totalEmissiveRadiance += vec3(0.35, 0.75, 0.9) * (smoothstep(0.18, 0.45, ca) * up * 0.5 + rim * 0.55) * uGlow;
        }`);
  };
  skin.customProgramCacheKey = () => 'enchantment-whale-swim-v4';
  const body = new THREE.Mesh(bodyGeo, skin); body.name = 'whale-body'; root.add(body); disposables.push(bodyGeo, skin);
  const darkMat = new THREE.MeshStandardMaterial({name: 'whale-dark-details', color: '#1c2733', roughness: 0.5});
  const finMat = new THREE.MeshStandardMaterial({name: 'whale-pale-fins', color: '#ffffff', vertexColors: true, roughness: 0.5, emissive: '#2a8fb0', emissiveIntensity: 0});
  disposables.push(darkMat, finMat);
  const details = [];
  // knobbly tubercles in rows along the rostrum and the lower jaw
  for (const [row, yy, zz] of [[0, 0.62, 0], [1, 0.5, 0.32], [1, 0.5, -0.32], [2, -0.2, 0.62], [2, -0.2, -0.62]]) {
    for (let i = 0; i < (row === 2 ? 6 : 8); i++) {
      const x = 6.25 - i * 0.32, t = new THREE.SphereGeometry(0.075 + (i % 3) * 0.012, 8, 6);
      t.scale(1, 0.7, 1); t.translate(x, (yy - i * 0.045) * (row === 2 ? 1 : 1), zz * (1 + i * 0.07)); details.push(t);
    }
  }
  // chin knob, blowholes, eyes with a ridge above
  const chin = new THREE.SphereGeometry(0.18, 10, 8); chin.scale(1.3, 0.8, 1); chin.translate(6.05, -0.42, 0); details.push(chin);
  for (const s of [-1, 1]) {
    const hole = new THREE.SphereGeometry(0.09, 10, 6); hole.scale(1.8, 0.35, 0.7); hole.translate(3.95, 1.06, s * 0.1); details.push(hole);
    const eye = new THREE.SphereGeometry(0.12, 12, 10); eye.translate(4.4, -0.32, s * 1.22); details.push(eye);
    const brow = new THREE.TorusGeometry(0.17, 0.035, 6, 14, Math.PI); brow.rotateY(s > 0 ? 0 : Math.PI); brow.translate(4.4, -0.3, s * 1.2); details.push(brow);
    const mouth = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(6.45, -0.05, s * 0.3), new THREE.Vector3(5.6, -0.3, s * 0.95), new THREE.Vector3(4.6, -0.42, s * 1.2), new THREE.Vector3(4.2, -0.55, s * 1.22)]), 20, 0.035, 5, false); details.push(mouth);
  }
  // a small dorsal fin on a hump, as humpbacks have
  const hump = new THREE.SphereGeometry(0.38, 12, 8); hump.scale(1.8, 0.5, 0.8); hump.translate(-2.2, 0.98, 0); details.push(hump);
  const dorsal = new THREE.Shape(); dorsal.moveTo(-0.9, 0); dorsal.quadraticCurveTo(-0.2, 0.15, 0.25, 0.55); dorsal.lineTo(0.6, 0); dorsal.closePath();
  const dg = new THREE.ExtrudeGeometry(dorsal, {depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2}); dg.translate(-2.6, 1.05, -0.07); details.push(dg);
  const detailGeo = mergeGeometries(details.map(g => g.index ? g.toNonIndexed() : g), false); details.forEach(g => g.dispose());
  const detailMesh = new THREE.Mesh(detailGeo, darkMat); detailMesh.name = 'whale-head-tubercles-eyes-mouth-dorsal'; root.add(detailMesh); disposables.push(detailGeo);
  // long white pectoral fins with knobs on the leading edge and dark tips on top
  const fin = new THREE.Shape(); fin.moveTo(0, 0);
  for (let i = 1; i <= 10; i++) fin.lineTo(i * 0.42, 0.34 - i * 0.022 + (i % 2 ? 0.07 : 0));
  fin.lineTo(4.45, 0.04); fin.quadraticCurveTo(2.6, -0.36, 0.2, -0.3); fin.closePath();
  const fins = [];
  for (const sd of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(fin, {depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 6});
    g.rotateX(Math.PI / 2);
    const p = g.attributes.position, fc = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) { cc.set('#e2e9ed').lerp(new THREE.Color('#2b3a47'), THREE.MathUtils.smoothstep(p.getX(i), 2.6, 4.4) * (p.getY(i) > 0 ? 0.85 : 0.3)); fc.set([cc.r, cc.g, cc.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(fc, 3));
    const pivot = new THREE.Group(); pivot.position.set(3.4, -0.75, sd * 1.35); pivot.rotation.set(0, sd * 2.35, sd * 0.45); root.add(pivot);
    const m = new THREE.Mesh(g, finMat); m.name = 'whale-pectoral-fin'; pivot.add(m); fins.push(pivot); disposables.push(g);
  }
  // notched flukes with a serrated trailing edge, dark above and pale below
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.quadraticCurveTo(-0.5, 1.0, -1.15, 2.05);
  for (let i = 0; i < 7; i++) fl.lineTo(-1.0 + i * 0.05 + (i % 2 ? -0.08 : 0), 1.85 - i * 0.27);
  fl.quadraticCurveTo(-0.45, 0.3, -0.35, 0.1); fl.lineTo(-0.52, 0.0); fl.lineTo(-0.35, -0.1);
  for (let i = 6; i >= 0; i--) fl.lineTo(-1.0 + i * 0.05 + (i % 2 ? -0.08 : 0), -(1.85 - i * 0.27));
  fl.lineTo(-1.15, -2.05); fl.quadraticCurveTo(-0.5, -1.0, 0, 0);
  const flGeo = new THREE.ExtrudeGeometry(fl, {depth: 0.09, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, curveSegments: 8});
  flGeo.rotateX(Math.PI / 2); flGeo.translate(0, 0.045, 0);
  { const p = flGeo.attributes.position, fc = new Float32Array(p.count * 3), cc = new THREE.Color(); for (let i = 0; i < p.count; i++) { cc.set(p.getY(i) > 0.045 ? '#26333f' : '#d9e1e6'); if (p.getY(i) <= 0.045 && Math.sin(p.getZ(i) * 7) > 0.6) cc.set('#3a4855'); fc.set([cc.r, cc.g, cc.b], i * 3); } flGeo.setAttribute('color', new THREE.BufferAttribute(fc, 3)); }
  const flukePivot = new THREE.Group(); flukePivot.position.set(-6.45, 0, 0); root.add(flukePivot);
  const flukes = new THREE.Mesh(flGeo, finMat); flukes.name = 'whale-flukes'; flukes.scale.set(1.25, 1, 1.3); flukePivot.add(flukes); disposables.push(flGeo);
  root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return {
    root, disposables, meshes: [body, detailMesh, flukes, ...fins.map(f => f.children[0])],
    update(t, glow, reduced) {
      const phase = reduced ? 0 : t * 1.25; swim.uPhase.value = phase; swim.uTime.value = reduced ? 0 : t; swim.uGlow.value = glow;
      flukePivot.position.y = 0.55 * Math.sin(phase + 6.45 * 0.45);
      flukePivot.rotation.z = -0.45 * Math.cos(phase + 6.45 * 0.45);
      fins.forEach((f, i) => { f.rotation.x = reduced ? 0 : Math.sin(t * 0.7 + i * Math.PI) * 0.12; });
      skin.emissiveIntensity = glow * 0.22; finMat.emissiveIntensity = glow * 0.25;
    }
  };
}

// An iceberg in the open sea: a small bright tip above the water, and a far
// larger mass below it that shows only faintly until it is clicked. Even after
// a PhD, Hanjing has seen only the tip of what there is to explore.
const ICEBERG = {x: -6, z: 9};
function craggy(radius, detail, scale, amount, seed) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(radius, detail));
  const p = g.attributes.position, v = new THREE.Vector3(), r = rng(seed);
  const bumps = Array.from({length: 7}, () => [new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), 0.12 + r() * 0.2]);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    let k = 1 + amount * (Math.sin(n.x * 7.3 + seed) * Math.sin(n.y * 5.1) * Math.sin(n.z * 6.7 + seed * 0.3));
    for (const [d, a] of bumps) k += a * Math.pow(Math.max(0, n.dot(d)), 6);
    v.multiplyScalar(k).multiply(scale); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
function buildIceberg({low}) {
  const root = new THREE.Group(); root.name = 'enchantment-iceberg'; root.position.set(ICEBERG.x, SEA.level, ICEBERG.z);
  const disposables = [], glow = {value: 0};
  // hidden ice stays dim until the deep is revealed; the tip is always bright
  const rimPatch = (m, key, hidden = false) => {
    m.onBeforeCompile = sh => {
      sh.uniforms.uIceGlow = glow;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uIceGlow;')
        .replace('#include <color_fragment>', hidden ? '#include <color_fragment>\n diffuseColor.rgb *= mix(0.3, 1.0, uIceGlow);' : '#include <color_fragment>')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float iceRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
          totalEmissiveRadiance += vec3(0.45, 0.85, 1.0) * iceRim * (${hidden ? '0.06' : '0.18'} + uIceGlow * 0.9);`);
    };
    m.customProgramCacheKey = () => key;
  };
  // the tip: two crags above the waterline, snow on the top faces
  const tipParts = [craggy(1.9, low ? 1 : 2, new THREE.Vector3(1.25, 1.5, 1.0), 0.16, 3), craggy(1.0, 1, new THREE.Vector3(0.9, 2.0, 0.9), 0.2, 7)];
  tipParts[1].translate(0.9, 0.9, -0.3);
  for (const g of tipParts) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.08 - 0.05); g.computeVertexNormals(); }
  const tipGeo = mergeGeometries(tipParts.map(g => g.toNonIndexed()), false); tipParts.forEach(g => g.dispose()); tipGeo.computeVertexNormals();
  { const p = tipGeo.attributes.position, nrm = tipGeo.attributes.normal, c = new Float32Array(p.count * 3), col = new THREE.Color();
    for (let i = 0; i < p.count; i++) { col.set('#a9d6ea').lerp(new THREE.Color('#f6fbfe'), THREE.MathUtils.smoothstep(nrm.getY(i), 0.1, 0.7)); col.lerp(new THREE.Color('#7fb8d4'), 1 - THREE.MathUtils.smoothstep(p.getY(i), 0.0, 0.5)); c.set([col.r, col.g, col.b], i * 3); }
    tipGeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const tipMat = new THREE.MeshStandardMaterial({name: 'iceberg-tip', color: '#ffffff', vertexColors: true, roughness: 0.3, metalness: 0.0, flatShading: true, emissive: '#000000'});
  rimPatch(tipMat, 'enchantment-iceberg-tip-v1');
  const tip = new THREE.Mesh(tipGeo, tipMat); tip.name = 'iceberg-tip-above-water'; tip.castShadow = true; root.add(tip); disposables.push(tipGeo, tipMat);
  // the hidden mass: many times larger, reaching deep into the ball
  const massGeo = craggy(5.2, low ? 2 : 3, new THREE.Vector3(1.1, 1.35, 0.95), 0.14, 11);
  { const p = massGeo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) p.setY(i, -0.08 - y * 0.02); }
    massGeo.translate(0.6, -5.6, 0.2);
    for (let i = 0; i < p.count; i++) { col.set('#9fd3e8').lerp(new THREE.Color('#2f6f93'), THREE.MathUtils.smoothstep(-p.getY(i), 1, 14)); c.set([col.r, col.g, col.b], i * 3); }
    massGeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); massGeo.computeVertexNormals(); }
  const massMat = new THREE.MeshStandardMaterial({name: 'iceberg-hidden-mass', color: '#ffffff', vertexColors: true, roughness: 0.45, flatShading: true});
  rimPatch(massMat, 'enchantment-iceberg-mass-v2', true);
  const mass = new THREE.Mesh(massGeo, massMat); mass.name = 'iceberg-hidden-mass-below-water'; root.add(mass); disposables.push(massGeo, massMat);
  // a ring of foam where the ice meets the waves
  const foamMat = new THREE.MeshBasicMaterial({name: 'iceberg-foam', color: '#e8f6fb', transparent: true, opacity: 0.32, depthWrite: false});
  const foamGeo = new THREE.RingGeometry(2.3, 3.0, 40, 1); foamGeo.rotateX(-Math.PI / 2); foamGeo.scale(1.25, 1, 1);
  { const p = foamGeo.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const k = 1 + 0.12 * Math.sin(a * 5) + 0.06 * Math.sin(a * 13); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } }
  const foam = new THREE.Mesh(foamGeo, foamMat); foam.name = 'iceberg-foam-ring'; foam.position.y = 0.06; foam.renderOrder = 12; root.add(foam); disposables.push(foamGeo, foamMat);
  return {root, disposables, meshes: [tip, mass], point: [ICEBERG.x, SEA.level + 2, ICEBERG.z],
    update(t, reveal, reduced) { glow.value = reveal; if (!reduced) { foam.scale.setScalar(1 + 0.04 * Math.sin(t * 1.3)); foam.rotation.y = t * 0.02; tip.rotation.z = Math.sin(t * 0.4) * 0.008; mass.rotation.z = tip.rotation.z; root.position.y = SEA.level + Math.sin(t * 0.5) * 0.06; } }};
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
  const shade = new THREE.MeshStandardMaterial({name: 'owl-soft-grey-feather-layer', color: '#e6e3dc', roughness: 0.95});
  const iris = new THREE.MeshStandardMaterial({name: 'owl-golden-eyes', color: '#f4c418', emissive: '#a36a00', emissiveIntensity: 0.55, roughness: 0.2});
  const dark = new THREE.MeshStandardMaterial({name: 'owl-pupils-beak-talons', color: '#17130f', roughness: 0.3});
  const speck = new THREE.MeshStandardMaterial({name: 'owl-dark-speckles', color: '#4a433b', roughness: 0.8});
  const paper = new THREE.MeshStandardMaterial({name: 'owl-letter-paper', color: '#efe3c6', roughness: 0.85});
  const seal = new THREE.MeshStandardMaterial({name: 'owl-letter-wax-seal', color: '#9c2a24', roughness: 0.45});
  const ribbon = new THREE.MeshStandardMaterial({name: 'owl-letter-ribbon', color: '#7b1f2a', roughness: 0.55});
  const mats = [plume, shade, iris, dark, speck, paper, seal, ribbon];
  const ball = (r, m, sc, p, parent = root, seg = 18) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m); o.scale.set(...sc); o.position.set(...p); o.castShadow = true; parent.add(o); return o; };
  // a solid feather scale: a flattened half-ellipsoid, so layers overlap with soft shading and no cut edges
  const scale = (w, h, d = 0.012) => { const g = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.rotateX(Math.PI / 2); g.scale(w / 2, h / 2, d); g.translate(0, -h / 2.4, 0); return g; };
  const lay = (geo, mat, at, rot, parent = root) => { const f = new THREE.Mesh(geo, mat); f.position.set(...at); f.rotation.set(...rot); f.castShadow = true; parent.add(f); return f; };
  // body and chest, with rows of overlapping breast scales and a few dark bars
  ball(0.2, plume, [1.0, 1.24, 0.96], [0, 0.27, 0]);
  ball(0.165, plume, [0.92, 1.02, 0.55], [0, 0.25, 0.1]);
  const breast = scale(0.055, 0.06);
  for (let row = 0; row < 5; row++) for (let k = -2; k <= 2; k++) {
    const x = k * 0.04 + (row % 2) * 0.02, y = 0.43 - row * 0.055;
    if (Math.abs(x) > 0.1) continue;
    const z = 0.2 - x * x * 3.2 - Math.abs(row - 2) * 0.012;
    lay(breast, row < 2 ? plume : shade, [x, y, z], [-0.2, x * 2.4, 0]);
    if ((row + k) % 3 === 0 && row > 0) ball(0.007, speck, [1.8, 0.5, 0.3], [x, y - 0.04, z + 0.008], root, 6);
  }
  // folded wings lying along the flanks: coverts, secondaries and long primaries, with dark bars
  const covert = scale(0.08, 0.08, 0.016), secondary = scale(0.07, 0.15, 0.014), primary = scale(0.06, 0.2, 0.012);
  const wings = [];
  for (const s of [-1, 1]) {
    const wing = new THREE.Group(); wing.position.set(s * 0.175, 0.44, -0.02); root.add(wing); wings.push(wing);
    const along = [0, s * Math.PI / 2, 0];
    for (let k = 0; k < 4; k++) lay(covert, plume, [s * 0.01, -0.02 - k * 0.032, 0.06 - k * 0.035], [0.1, along[1], 0], wing);
    for (let k = 0; k < 5; k++) lay(secondary, k % 2 ? shade : plume, [s * 0.016, -0.09 - k * 0.012, 0.04 - k * 0.04], [0.22, along[1], 0], wing);
    for (let k = 0; k < 5; k++) lay(primary, shade, [s * 0.02, -0.12 - k * 0.008, -0.06 - k * 0.03], [0.4, along[1], 0], wing);
    for (let k = 0; k < 7; k++) ball(0.009, speck, [0.4, 0.7, 1.6], [s * 0.035, -0.09 - k * 0.036, 0.03 - k * 0.026], wing, 6);
  }
  // tail fan
  const tailF = scale(0.05, 0.12, 0.012);
  for (const t of [-2, -1, 0, 1, 2]) lay(tailF, t % 2 ? shade : plume, [t * 0.024, 0.17, -0.18], [-2.35, t * 0.16, 0]);
  // feathered feet with black hooked talons
  for (const s of [-1, 1]) {
    ball(0.045, plume, [1.0, 0.75, 1.25], [s * 0.065, 0.025, 0.08], root, 10);
    for (let c = -1; c <= 1; c++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0045, 5, 8, Math.PI * 0.8), dark); t.position.set(s * 0.065 + c * 0.018, 0.012, 0.125); t.rotation.set(0, Math.PI / 2, -0.6); root.add(t); }
  }
  // head: round, with a soft facial disc ring, golden eyes under white brows, and a black beak in white bristles
  const head = new THREE.Group(); head.position.set(0, 0.56, 0.01); root.add(head);
  ball(0.175, plume, [1.06, 0.92, 0.96], [0, 0, 0], head);
  ball(0.15, plume, [1.0, 0.86, 0.45], [0, -0.012, 0.095], head);
  const discScale = scale(0.04, 0.05, 0.01);
  for (const s of [-1, 1]) for (let k = 0; k < 8; k++) { const a = -1.0 + k * 0.32; lay(discScale, k % 2 ? shade : plume, [s * (0.06 + Math.cos(a) * 0.062), 0.018 + Math.sin(a) * 0.062, 0.14], [0, 0, s * (Math.PI / 2 + a)], head); }
  for (const s of [-1, 1]) ball(0.068, plume, [1.0, 1.0, 0.5], [s * 0.058, 0.01, 0.125], head, 14);
  const eyes = new THREE.Group(); head.add(eyes);
  for (const s of [-1, 1]) {
    ball(0.036, dark, [1.08, 1.08, 0.5], [s * 0.06, 0.018, 0.15], eyes, 14);
    ball(0.033, iris, [1, 1, 0.55], [s * 0.06, 0.018, 0.155], eyes, 16);
    ball(0.016, dark, [1, 1, 0.5], [s * 0.06, 0.018, 0.17], eyes, 10);
    ball(0.006, plume, [1, 1, 0.5], [s * 0.06 + 0.009, 0.029, 0.177], eyes, 6);
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 6, 14, Math.PI * 0.7), plume); brow.position.set(s * 0.06, 0.022, 0.158); brow.rotation.set(0.2, 0, Math.PI * 0.15); head.add(brow);
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 8), dark); beak.position.set(0, -0.03, 0.17); beak.rotation.x = Math.PI * 0.62; head.add(beak);
  for (const s of [-1, 0, 1]) lay(scale(0.022, 0.045, 0.008), plume, [s * 0.017, 0.012, 0.172], [-0.5, 0, s * 0.35], head);
  for (let i = 0; i < 6; i++) ball(0.007, speck, [1.4, 0.7, 0.5], [(i - 2.5) * 0.035, 0.13 - Math.abs(i - 2.5) * 0.012, 0.05 - Math.abs(i - 2.5) * 0.028], head, 6);
  // a sealed letter tied with a ribbon, held under one talon
  const letter = new THREE.Group(); letter.position.set(0.02, 0.006, 0.2); letter.rotation.y = -0.3; root.add(letter);
  const env = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.13), paper); env.castShadow = true; letter.add(env);
  const flap = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.1, 0.004, 3, 1), shade); flap.rotation.y = Math.PI / 2; flap.scale.set(0.65, 1, 1.0); flap.position.set(0, 0.005, -0.02); letter.add(flap);
  for (const [w, d, x, z] of [[0.205, 0.012, 0, 0.03], [0.012, 0.135, 0.05, 0]]) { const band = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, d), ribbon); band.position.set(x, 0.002, z); letter.add(band); }
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 14), seal); wax.position.set(0.05, 0.009, 0.03); letter.add(wax);
  mergeStill(head, [eyes]);
  for (const w of wings) mergeStill(w);
  mergeStill(root, [head, ...wings]);
  return {root, head, eyes, wings, materials: mats};
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

// Each building wears its own branch of chinoiserie, fitted to its measured
// walls and eaves (station-local units, front faces +z):
//   Home      porcelain  the Trianon de Porcelaine: a European cornice and
//                        pilasters with cobalt and white brackets and bells
//   Research  glass      the same porcelain dress, crowned by a lit glass dome
//   Talks     timber     a Chinese timber hall: lacquer columns, a painted
//                        beam band with brackets above it, jade ridge dragons
//   Writing   ink        a Huizhou studio: white walls, ink-black tiles and
//                        stepped horse-head gable walls
//   Life      tower      amber glaze and a little two-tier tower with a cat
//                        weathervane for the cats' house
// If a building is rebuilt, update its entry here.
const FUSION = {
  'complete-home': {style: 'porcelain', x: [-3.65, 1.83], z: [-3.60, 0.10], base: 0.30, top: 2.95, roof: 3.92, finial: false, eaves: [{x: [-4.02, 2.20], z: [-3.955, 0.46], y: 3.06}]},
  'research-complete-two-storey-library': {style: 'glass', x: [-3.19, 3.19], z: [-4.19, -0.31], base: 0.12, top: 2.48, roof: 6.07, ridgeScale: 0.62,
    eaves: [{x: [-3.69, 3.69], z: [-4.70, 0.20], y: 2.56}, {x: [-2.91, 2.91], z: [-4.19, -0.73], y: 5.16}]},
  'talks-complete-timber-lecture-hall': {style: 'timber', x: [-3.98, 2.08], z: [-4.33, 2.08], base: 0.12, top: 3.35, roof: 4.36, eaves: [{x: [-4.21, 2.31], z: [-4.45, 2.20], y: 3.55}]},
  'complete-writing': {style: 'ink', x: [-3.73, 5.43], z: [-4.33, 0.68], base: 0.12, top: 2.95, roof: 3.99, finial: false, eaves: [{x: [-4.07, 5.77], z: [-4.655, 1.01], y: 3.06}]},
  'complete-life': {style: 'tower', x: [-4.19, 4.19], z: [-4.09, -0.01], base: 0.24, top: 2.95, roof: 3.91, finial: false, eaves: [{x: [-4.55, 4.55], z: [-4.435, 0.34], y: 3.06}], tower: [-2.95, -2.9]}
};
const GILT = '#e8c46a';
const FUSION_STYLES = {
  porcelain: {classical: true, stone: '#efe6d2', cornice: '#2b55ad', flute: '#7f98cc', bracket: ['#2b55ad', '#f1f3f8', '#6e93d6', '#2b55ad'], ridge: '#22468f', chiwei: GILT, pearl: '#f1f3f8', lantern: 'porcelain', band: '#2b55ad', bells: true},
  glass: {classical: true, stone: '#efe6d2', cornice: '#2b55ad', flute: '#7f98cc', bracket: ['#2b55ad', '#f1f3f8', '#6e93d6', '#2b55ad'], ridge: null, chiwei: null, lantern: 'porcelain', band: '#2b55ad', bells: true, dome: true},
  timber: {timber: true, bracket: ['#2f7a68', '#f0e6cf', '#3b6aa0', '#9a3a2a'], ridge: '#2c6b56', chiwei: '#3c8a6c', pearl: GILT, lantern: 'red', band: '#9a3a2a', bells: true},
  ink: {ink: true, ridge: '#2a2d33', chiwei: '#2a2d33', pearl: '#f1eee6', lantern: 'paper', band: '#2a2d33', bells: false},
  tower: {classical: true, stone: '#f3e8d2', cornice: '#a8661f', flute: '#d4a85e', bracket: ['#a8661f', '#f6efe0', '#e8ae48', '#7c4a1a'], ridge: '#7c4a1a', chiwei: GILT, pearl: '#f6efe0', lantern: 'amber', band: '#a8661f', bells: true, tower: true}
};
const GLOWS = {porcelain: ['#fff1d6', '#ffb45c', '#ffb45a'], red: ['#d8402e', '#c8301c', '#ff6a3c'], paper: ['#fbf3e2', '#ffc77a', '#ffd38a'], amber: ['#ffd79a', '#ff9a3a', '#ffae55'], window: ['#ffe2a8', '#ffb75e', '#ffc46e']};

// A small temple bell (lathe profile, mouth down), shared by the buildings and the pagoda.
const BELL_PROFILE = [[0.0, 0.0], [0.040, 0.0], [0.044, 0.010], [0.036, 0.030], [0.030, 0.062], [0.026, 0.084], [0.014, 0.096], [0.0, 0.098]];
function hangBell(put, at, {cord = 0.06, s = 1, lowSeg = false} = {}) {
  const [x, y, z] = at;
  put(new THREE.CylinderGeometry(0.004 * s, 0.004 * s, cord * s, 4), [x, y - cord * s / 2, z]);
  const bell = new THREE.LatheGeometry(BELL_PROFILE.map(([r, h]) => new THREE.Vector2(r * s, h * s)), lowSeg ? 6 : 10);
  put(bell, [x, y - cord * s - 0.098 * s, z]);
  // the wind plate that makes it ring
  put(new THREE.BoxGeometry(0.036 * s, 0.036 * s, 0.003 * s), [x, y - cord * s - 0.15 * s, z], [0, 0, Math.PI / 4]);
}
const octagon = (rt, rb, h, open = false) => { const g = new THREE.CylinderGeometry(rt, rb, h, 8, 1, open); g.rotateY(Math.PI / 8); return g; };
const archShape = (w, h) => { const sh = new THREE.Shape(), r = w / 2; sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, h - r); sh.absarc(0, h - r, r, 0, Math.PI, false); sh.lineTo(-r, 0); return sh; };

function createFusionDetails({garden, low}) {
  const disposables = [], lanternPoints = [], cache = new Map();
  const material = (key, make) => { if (!cache.has(key)) { const m = make(); disposables.push(m); cache.set(key, m); } return cache.get(key); };
  const materialFor = kind => {
    if (kind === 'gilt') return material(kind, () => new THREE.MeshStandardMaterial({name: 'chinoiserie-gilt-metal', color: '#ffffff', vertexColors: true, roughness: 0.36, metalness: 0.42}));
    if (kind === 'glass') return material(kind, () => new THREE.MeshStandardMaterial({name: 'chinoiserie-lit-glass-dome', color: '#a9c9dc', emissive: '#ffc574', emissiveIntensity: 0.6, roughness: 0.12, metalness: 0.25}));
    if (kind.startsWith('glow-')) { const g = GLOWS[kind.slice(5)]; return material(kind, () => new THREE.MeshStandardMaterial({name: 'chinoiserie-' + kind, color: g[0], emissive: g[1], emissiveIntensity: kind === 'glow-red' ? 0.85 : 1.0, roughness: 0.5})); }
    // painted parts share one vertex-coloured material (no environment map at night, so the gilt stays half metallic)
    return material('paint', () => new THREE.MeshStandardMaterial({name: 'chinoiserie-painted-stone-and-brackets', color: '#ffffff', vertexColors: true, roughness: 0.5, metalness: 0.04}));
  };
  for (const station of garden?.root.children || []) {
    const spec = FUSION[station.name]; if (!spec) continue;
    const style = FUSION_STYLES[spec.style];
    const parts = new Map(), tmp = new THREE.Color();
    const add = (g, kind, color, p, r) => {
      const geo = g.index ? g.toNonIndexed() : g; if (geo !== g) g.dispose();
      if (r) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r))); geo.translate(...p);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      tmp.set(color); const n = geo.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([tmp.r, tmp.g, tmp.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = materialFor(kind); if (!parts.has(m)) parts.set(m, []); parts.get(m).push(geo);
    };
    const paint = (g, color, p, r) => add(g, 'paint', color, p, r), gild = (g, p, r) => add(g, 'gilt', GILT, p, r);
    const glowAt = (localPoint, kind, size = 1.2) => lanternPoints.push({p: station.localToWorld(new THREE.Vector3(...localPoint)).toArray(), c: GLOWS[kind][2], s: size});
    const [x0, x1] = spec.x, [z0, z1] = spec.z, top = spec.top, base = spec.base, w = x1 - x0, d = z1 - z0;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const around = (y, h, out, color, t = 0.06, kind = 'paint') => {
      add(new THREE.BoxGeometry(w + out * 2, h, t), kind, color, [cx, y, z1 + out - t / 2]);
      add(new THREE.BoxGeometry(w + out * 2, h, t), kind, color, [cx, y, z0 - out + t / 2]);
      add(new THREE.BoxGeometry(t, h, d + out * 2), kind, color, [x0 - out + t / 2, y, cz]);
      add(new THREE.BoxGeometry(t, h, d + out * 2), kind, color, [x1 + out - t / 2, y, cz]);
    };
    const bracketRow = lift => {
      const [c0, c1, c2, c3] = style.bracket;
      const bracket = (x, z, dir) => {
        paint(new THREE.BoxGeometry(0.11, 0.055, 0.11), c0, [x, top - 0.15 + lift, z + dir * 0.06]);
        paint(new THREE.BoxGeometry(0.30, 0.042, 0.07), c1, [x, top - 0.105 + lift, z + dir * 0.06]);
        paint(new THREE.BoxGeometry(0.07, 0.042, 0.2), c2, [x, top - 0.105 + lift, z + dir * 0.1]);
        paint(new THREE.BoxGeometry(0.12, 0.045, 0.12), c3, [x, top - 0.06 + lift, z + dir * 0.07]);
        gild(new THREE.BoxGeometry(0.06, 0.012, 0.06), [x, top - 0.032 + lift, z + dir * 0.07]);
      };
      const step = low ? 1.3 : 0.9;
      for (let x = x0 + 0.45; x <= x1 - 0.4; x += step) { if (Math.abs(x - cx) > 0.85) bracket(x, z1, 1); bracket(x, z0, -1); }
    };

    if (style.classical) {
      // a classical cornice in two steps, the upper one glazed, porcelain brackets and fluted corner pilasters
      around(top - 0.27, 0.07, 0.05, style.stone);
      around(top - 0.205, 0.045, 0.085, style.cornice);
      bracketRow(0);
      const shaftH = top - 0.32 - (base + 0.14);
      for (const [px, pz] of [[x0 - 0.03, z1 + 0.03], [x1 + 0.03, z1 + 0.03], [x0 - 0.03, z0 - 0.03], [x1 + 0.03, z0 - 0.03]]) {
        paint(new THREE.BoxGeometry(0.24, 0.14, 0.24), style.stone, [px, base + 0.07, pz]);
        paint(new THREE.BoxGeometry(0.16, shaftH, 0.16), style.stone, [px, base + 0.14 + shaftH / 2, pz]);
        for (const f of [-0.045, 0, 0.045]) paint(new THREE.BoxGeometry(0.014, shaftH - 0.12, 0.004), style.flute, [px + f, base + 0.14 + shaftH / 2, pz + (pz > z0 ? 0.081 : -0.081)]);
        paint(new THREE.BoxGeometry(0.25, 0.075, 0.25), style.stone, [px, top - 0.335, pz]);
        gild(new THREE.BoxGeometry(0.26, 0.016, 0.26), [px, top - 0.29, pz]);
        for (const sx of [-1, 1]) paint(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 12), style.stone, [px + sx * 0.1, top - 0.36, pz], [Math.PI / 2, 0, 0]);
      }
    }
    if (style.timber) {
      // a painted beam band (green and blue panels split by gold) with the brackets standing on it
      const band = (len, axis, at) => {
        const n = Math.max(2, Math.round(len / 0.46)), seg = len / n;
        for (let i = 0; i < n; i++) {
          const o = -len / 2 + (i + 0.5) * seg, colour = i % 2 ? '#3b6aa0' : '#2f7a68';
          const size = axis === 'x' ? [seg - 0.03, 0.12, 0.05] : [0.05, 0.12, seg - 0.03];
          paint(new THREE.BoxGeometry(...size), colour, axis === 'x' ? [cx + o, top - 0.11, at] : [at, top - 0.11, cz + o]);
          const disc = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12); disc.rotateX(Math.PI / 2); if (axis === 'z') disc.rotateY(Math.PI / 2);
          gild(disc, axis === 'x' ? [cx + o, top - 0.11, at + Math.sign(at - cz) * 0.03] : [at + Math.sign(at - cx) * 0.03, top - 0.11, cz + o]);
        }
      };
      band(w + 0.1, 'x', z1 + 0.05); band(w + 0.1, 'x', z0 - 0.05); band(d + 0.1, 'z', x0 - 0.05); band(d + 0.1, 'z', x1 + 0.05);
      around(top - 0.045, 0.02, 0.08, GILT, 0.035, 'gilt');
      around(top - 0.175, 0.02, 0.08, GILT, 0.035, 'gilt');
      around(top - 0.22, 0.05, 0.075, '#9a3a2a', 0.04);
      bracketRow(0.2);
      // lacquer columns at the corners, on stone drums, with gilt collars
      const colH = top - 0.24 - (base + 0.1);
      for (const [px, pz] of [[x0 - 0.06, z1 + 0.06], [x1 + 0.06, z1 + 0.06], [x0 - 0.06, z0 - 0.06], [x1 + 0.06, z0 - 0.06]]) {
        paint(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 16), '#c9c2b2', [px, base + 0.06, pz]);
        paint(new THREE.CylinderGeometry(0.1, 0.11, colH, 16), '#94392a', [px, base + 0.1 + colH / 2, pz]);
        gild(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 16), [px, top - 0.27, pz]);
      }
    }
    if (style.ink) {
      // a white eave frieze with an ink line, then stepped horse-head gable walls at both ends
      around(top - 0.2, 0.16, 0.04, '#f6f4ee');
      around(top - 0.09, 0.035, 0.05, '#3a3e45');
      around(top - 0.3, 0.025, 0.05, '#3a3e45');
      const endsOnX = w >= d, span = (endsOnX ? d : w) + 0.7, mid = endsOnX ? cz : cx;
      const tiers = [[span / 2, spec.roof - 0.5], [span * 0.34, spec.roof + 0.0], [span * 0.17, spec.roof + 0.48]];
      for (const end of endsOnX ? [x0 - 0.08, x1 + 0.08] : [z0 - 0.08, z1 + 0.08]) {
        for (const [halfLen, y] of tiers) {
          const y0 = top - 0.35, h = y - y0;
          const body = endsOnX ? [0.2, h, halfLen * 2] : [halfLen * 2, h, 0.2], at = endsOnX ? [end, y0 + h / 2, mid] : [mid, y0 + h / 2, end];
          paint(new THREE.BoxGeometry(...body), '#f4f2ec', at);
          const cap = endsOnX ? [0.36, 0.07, halfLen * 2 + 0.12] : [halfLen * 2 + 0.12, 0.07, 0.36];
          paint(new THREE.BoxGeometry(...cap), '#2a2d33', endsOnX ? [end, y + 0.035, mid] : [mid, y + 0.035, end]);
          const roll = new THREE.CylinderGeometry(0.04, 0.04, halfLen * 2 + 0.1, 8); if (endsOnX) roll.rotateX(Math.PI / 2); else roll.rotateZ(Math.PI / 2);
          paint(roll, '#3a3e45', endsOnX ? [end, y + 0.09, mid] : [mid, y + 0.09, end]);
          // the upturned "horse heads" at both ends of every step
          for (const sg of [-1, 1]) {
            const head = new THREE.BoxGeometry(endsOnX ? 0.34 : 0.22, 0.07, endsOnX ? 0.22 : 0.34);
            const off = halfLen + 0.1;
            paint(head, '#2a2d33', endsOnX ? [end, y + 0.08, mid + sg * off] : [mid + sg * off, y + 0.08, end], endsOnX ? [-sg * 0.45, 0, 0] : [0, 0, sg * 0.45]);
          }
          paint(new THREE.BoxGeometry(endsOnX ? 0.205 : halfLen * 2, 0.03, endsOnX ? halfLen * 2 : 0.205), '#9aa0a8', endsOnX ? [end, y - 0.04, mid] : [mid, y - 0.04, end]);
        }
      }
    }

    // ridge dragons (chiwei) and the ridge cap
    const along = w >= d ? 'x' : 'z', L = Math.max(w, d), W = Math.min(w, d), half = Math.max(0.35, (L - W) / 2 * (spec.ridgeScale ?? 0.9));
    if (style.chiwei) {
      const fin = new THREE.Shape(); fin.moveTo(-0.13, 0); fin.lineTo(-0.13, 0.24); fin.quadraticCurveTo(-0.11, 0.44, 0.05, 0.47); fin.quadraticCurveTo(0.13, 0.44, 0.09, 0.35); fin.quadraticCurveTo(0.03, 0.36, 0.04, 0.25); fin.lineTo(0.12, 0); fin.closePath();
      for (const sgn of [-1, 1]) {
        const g = new THREE.ExtrudeGeometry(fin, {depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10}); g.translate(0, 0, -0.035);
        const yaw = along === 'x' ? (sgn < 0 ? 0 : Math.PI) : (sgn < 0 ? -Math.PI / 2 : Math.PI / 2);
        const px = along === 'x' ? cx + sgn * half : cx, pz = along === 'x' ? cz : cz + sgn * half;
        add(g, style.chiwei === GILT ? 'gilt' : 'paint', style.chiwei, [px, spec.roof - 0.06, pz], [0, yaw, 0]);
        paint(new THREE.SphereGeometry(0.035, 12, 8), style.pearl, [px + (along === 'x' ? -sgn * 0.05 : 0), spec.roof + 0.42, pz + (along === 'z' ? -sgn * 0.05 : 0)]);
      }
    }
    if (style.ridge) {
      const ridge = new THREE.CylinderGeometry(0.055, 0.055, half * 2, 12);
      paint(ridge, style.ridge, [cx, spec.roof - 0.02, cz], along === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]);
    }
    // a gilt finial at the middle of the ridge (skipped where a story landmark already sits there)
    if (spec.finial !== false && !style.dome) {
      const fy = spec.roof + 0.02;
      gild(new THREE.CylinderGeometry(0.06, 0.075, 0.05, 12), [cx, fy + 0.025, cz]);
      const cup = new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); cup.rotateX(Math.PI); gild(cup, [cx, fy + 0.13, cz]);
      paint(new THREE.SphereGeometry(0.085, 16, 12), style.pearl === GILT ? '#f1f3f8' : style.pearl, [cx, fy + 0.2, cz]);
      paint(new THREE.TorusGeometry(0.086, 0.012, 6, 20), style.band, [cx, fy + 0.2, cz], [Math.PI / 2, 0, 0]);
      gild(new THREE.CylinderGeometry(0.022, 0.03, 0.06, 10), [cx, fy + 0.31, cz]);
      gild(new THREE.SphereGeometry(0.048, 14, 10), [cx, fy + 0.37, cz]);
      gild(new THREE.ConeGeometry(0.018, 0.2, 8), [cx, fy + 0.5, cz]);
    }
    if (style.bells) for (const e of spec.eaves || []) for (const ex of e.x) for (const ez of e.z) hangBell(gild, [ex, e.y, ez], {lowSeg: low});

    // a pair of glowing lanterns under the front eaves, in the building's own manner
    for (const lx of [x0 + 0.3, x1 - 0.3]) {
      const ly = top - 0.42, lz = z1 + 0.3, glow = 'glow-' + style.lantern;
      paint(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 5), '#3a2418', [lx, top - 0.12, lz]);
      if (style.lantern === 'paper') {
        add(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16), glow, '#ffffff', [lx, ly, lz]);
        for (const by of [-0.16, 0.16]) paint(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16), '#2a2d33', [lx, ly + by, lz]);
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; paint(new THREE.BoxGeometry(0.012, 0.3, 0.012), '#2a2d33', [lx + Math.cos(a) * 0.1, ly, lz + Math.sin(a) * 0.1]); }
      } else {
        const body = new THREE.SphereGeometry(0.14, 16, 12); body.scale(1, 0.82, 1); add(body, glow, '#ffffff', [lx, ly, lz]);
        if (style.lantern === 'porcelain') for (const by of [-0.06, 0.06]) paint(new THREE.TorusGeometry(0.128, 0.008, 6, 24), '#2b55ad', [lx, ly + by, lz], [Math.PI / 2, 0, 0]);
        gild(new THREE.CylinderGeometry(0.075, 0.09, 0.04, 12), [lx, ly + 0.12, lz]);
        gild(new THREE.CylinderGeometry(0.09, 0.075, 0.04, 12), [lx, ly - 0.12, lz]);
        paint(new THREE.CylinderGeometry(0.012, 0.02, 0.14, 6), style.lantern === 'red' ? '#c8301c' : style.band, [lx, ly - 0.21, lz]);
      }
      glowAt([lx, ly, lz], style.lantern);
    }

    if (style.dome) {
      // a lit glass dome on an octagonal drum, the library's reading room under the stars
      const e = spec.eaves[spec.eaves.length - 1], dx = 0, dz = (e.z[0] + e.z[1]) / 2, R = 0.95, y0 = 5.5, y1 = 6.5;
      paint(octagon(R, R, y1 - y0, true), style.stone, [dx, (y0 + y1) / 2, dz]);
      const ap = R * Math.cos(Math.PI / 8);
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, ca = a + Math.PI / 8;
        const win = new THREE.ShapeGeometry(archShape(0.34, 0.6), low ? 6 : 10); win.rotateY(a);
        add(win, 'glow-window', '#ffffff', [dx + Math.sin(a) * (ap + 0.01), 5.78, dz + Math.cos(a) * (ap + 0.01)]);
        const frame = new THREE.ShapeGeometry(archShape(0.42, 0.66), low ? 6 : 10); frame.rotateY(a);
        paint(frame, style.cornice, [dx + Math.sin(a) * (ap + 0.004), 5.75, dz + Math.cos(a) * (ap + 0.004)]);
        paint(new THREE.BoxGeometry(0.06, y1 - y0, 0.06), '#f1f3f8', [dx + Math.sin(ca) * R, (y0 + y1) / 2, dz + Math.cos(ca) * R]);
        if (k % 2 === 0) glowAt([dx + Math.sin(a) * (ap + 0.1), 6.05, dz + Math.cos(a) * (ap + 0.1)], 'window', 0.8);
      }
      paint(octagon(R + 0.08, R + 0.08, 0.09), style.cornice, [dx, y1 + 0.045, dz]);
      gild(octagon(R + 0.09, R + 0.09, 0.02, true), [dx, y1 + 0.1, dz]);
      const domeR = R + 0.02, domeY = y1 + 0.1;
      const dome = new THREE.SphereGeometry(domeR, low ? 16 : 28, low ? 8 : 14, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.95, 1);
      add(dome, 'glass', '#ffffff', [dx, domeY, dz]);
      for (let k = 0; k < 12; k++) {
        const rib = new THREE.TorusGeometry(domeR + 0.008, 0.016, 4, low ? 8 : 14, Math.PI / 2); rib.scale(1, 0.95, 1); rib.rotateY(k * Math.PI / 6);
        gild(rib, [dx, domeY, dz]);
      }
      for (const [f, t] of [[0.42, 0.012], [0.78, 0.012]]) {
        const ring = new THREE.TorusGeometry(domeR * Math.cos(Math.asin(f)) + 0.01, t, 4, 32); ring.rotateX(Math.PI / 2);
        gild(ring, [dx, domeY + domeR * 0.95 * f, dz]);
      }
      const ty = domeY + domeR * 0.95;
      gild(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 16), [dx, ty + 0.01, dz]);
      add(new THREE.CylinderGeometry(0.15, 0.15, 0.26, 12), 'glow-window', '#ffffff', [dx, ty + 0.16, dz]);
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; gild(new THREE.BoxGeometry(0.025, 0.26, 0.025), [dx + Math.cos(a) * 0.155, ty + 0.16, dz + Math.sin(a) * 0.155]); }
      gild(new THREE.ConeGeometry(0.2, 0.2, 16), [dx, ty + 0.39, dz]);
      gild(new THREE.SphereGeometry(0.06, 14, 10), [dx, ty + 0.54, dz]);
      gild(new THREE.ConeGeometry(0.02, 0.28, 8), [dx, ty + 0.72, dz]);
      glowAt([dx, ty + 0.16, dz], 'window', 1.4);
      glowAt([dx, domeY + 0.45, dz + 0.6], 'window', 1.6);
    }

    if (style.tower) {
      // the cats' tower: two octagonal storeys with moon windows, amber eaves, bells and a cat weathervane
      const [tx, tz] = spec.tower, amber = '#d8952f', cream = style.stone;
      const put = (g, colour, y, r) => paint(g, colour, [tx, y, tz], r);
      put(octagon(0.6, 0.62, 1.75), cream, 3.725);
      for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; paint(new THREE.BoxGeometry(0.05, 1.7, 0.05), amber, [tx + Math.sin(a) * 0.61, 3.72, tz + Math.cos(a) * 0.61]); }
      put(octagon(0.64, 0.64, 0.06, true), '#7c4a1a', 4.48);
      const ap1 = 0.6 * Math.cos(Math.PI / 8);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        const disc = new THREE.CircleGeometry(0.14, 20); disc.rotateY(a);
        add(disc, 'glow-window', '#ffffff', [tx + Math.sin(a) * (ap1 + 0.012), 4.12, tz + Math.cos(a) * (ap1 + 0.012)]);
        const rim = new THREE.TorusGeometry(0.15, 0.022, 6, 24); rim.rotateY(a);
        paint(rim, amber, [tx + Math.sin(a) * (ap1 + 0.015), 4.12, tz + Math.cos(a) * (ap1 + 0.015)]);
        glowAt([tx + Math.sin(a) * (ap1 + 0.06), 4.12, tz + Math.cos(a) * (ap1 + 0.06)], 'window', 0.6);
      }
      const eave = (rt, rb, h, y, bellR) => {
        put(octagon(rt, rb, h), amber, y + h / 2);
        put(octagon(rb + 0.01, rb + 0.01, 0.05, true), '#f6efe0', y + 0.02);
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4 + Math.PI / 8;
          const tip = new THREE.ConeGeometry(0.03, 0.16, 6); tip.rotateX(Math.PI / 2 - 0.75); tip.translate(0, 0.03, rb + 0.04); tip.rotateY(a);
          paint(tip, '#7c4a1a', [tx, y, tz]);
          if (k % 2 === 0 && bellR) hangBell(gild, [tx + Math.sin(a) * (rb - 0.02), y - 0.01, tz + Math.cos(a) * (rb - 0.02)], {s: 0.9, cord: 0.04, lowSeg: low});
        }
      };
      eave(0.4, 0.92, 0.26, 4.5, true);
      put(octagon(0.42, 0.44, 0.78), cream, 5.12);
      const ap2 = 0.43 * Math.cos(Math.PI / 8);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        const win = new THREE.ShapeGeometry(archShape(0.17, 0.34), 8); win.rotateY(a);
        add(win, 'glow-window', '#ffffff', [tx + Math.sin(a) * (ap2 + 0.012), 4.95, tz + Math.cos(a) * (ap2 + 0.012)]);
      }
      eave(0.0, 0.74, 0.78, 5.5, false);
      gild(new THREE.SphereGeometry(0.06, 14, 10), [tx, 6.32, tz]);
      gild(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), [tx, 6.55, tz]);
      // a sitting cat in gilt, tail curled round, turning with the wind
      const cat = new THREE.Shape();
      cat.moveTo(-0.11, 0); cat.lineTo(0.09, 0); cat.quadraticCurveTo(0.12, 0.1, 0.07, 0.17); cat.quadraticCurveTo(0.1, 0.22, 0.085, 0.27);
      cat.lineTo(0.1, 0.33); cat.lineTo(0.06, 0.3); cat.quadraticCurveTo(0.03, 0.31, 0.005, 0.3); cat.lineTo(-0.03, 0.34); cat.lineTo(-0.03, 0.27);
      cat.quadraticCurveTo(-0.06, 0.2, -0.04, 0.15); cat.quadraticCurveTo(-0.12, 0.1, -0.11, 0.0);
      const tail = new THREE.Shape(); tail.moveTo(-0.1, 0.01); tail.quadraticCurveTo(-0.22, 0.02, -0.2, 0.12); tail.quadraticCurveTo(-0.19, 0.16, -0.16, 0.15); tail.quadraticCurveTo(-0.18, 0.06, -0.1, 0.045);
      for (const sh of [cat, tail]) { const g = new THREE.ExtrudeGeometry(sh, {depth: 0.025, bevelEnabled: false, curveSegments: 8}); g.translate(0.02, 0, -0.0125); gild(g, [tx, 6.76, tz], [0, 0.6, 0]); }
      gild(new THREE.BoxGeometry(0.34, 0.012, 0.012), [tx, 6.72, tz], [0, 0.6, 0]);
    }

    const group = new THREE.Group(); group.name = 'enchantment-chinoiserie-details-' + spec.style;
    for (const [m, list] of parts) { const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); const mesh = new THREE.Mesh(g, m); mesh.name = 'chinoiserie-' + station.name + '-' + m.name; mesh.castShadow = !m.name.includes('-glow-'); mesh.receiveShadow = true; group.add(mesh); disposables.push(g); }
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
      hangBell((g, p, r) => put(g, giltMat, colors.gold, p, r), [cxk * (er - 0.02), ey - 0.01, czk * (er - 0.02)], {s: 1.25, cord: 0.05, lowSeg: low});
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

export function createEnchantment({scene, renderer, landscape, garden, quality = 'high', reduced = false, onStory, onOwl, onWhale, onPagoda, onIceberg, onLetters} = {}) {
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
      if (m && ROOF_BY_MATERIAL[m.name] && !patched.has(m)) { patchGlazedRoof(m, ROOF_BY_MATERIAL[m.name]); patched.add(m); tinted.push(m.name + ':' + ROOF_BY_MATERIAL[m.name]); }
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
  const papered = new Set(), papers = new Map();
  if (rooms.length) {
    garden?.root.traverse(o => {
      if (!o.isMesh) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        const interior = m && INTERIORS[m.name.replace('-mortar-crafted-surface', '-plaster-crafted-surface')];
        if (!interior || papered.has(m)) continue;
        if (!papers.has(interior.paper)) { const t = wallpaperTexture(interior.paper, low); papers.set(interior.paper, t); disposables.add(t); }
        patchWallpaper(m, rooms, papers.get(interior.paper), interior); papered.add(m);
      }
    });
  }
  // Huizhou walls are limewashed white
  garden?.root.traverse(o => { if (o.isMesh && o.material?.name === 'HWL-writing-plaster-crafted-surface') o.material.color.set('#f6f4ee'); });

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
  fusion.lanternPoints.forEach((g, i) => lanternGlows.push({p: g.p, c: g.c, s: g.s, ph: 0.5 + i * 0.23}));
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
  const whalePath = {cx: GLOBE.cx + 4.5, cz: 12.5, y: -7.5, ax: 11, az: 2.5, period: 120};
  let reveal = 0, revealTarget = 0, revealUntil = 0;
  const bubbleEntries = [];
  for (let i = 0; i < (low ? 18 : 40); i++) bubbleEntries.push({p: [0, -100, 0], c: '#cfefff', s: 0.12 + rand() * 0.18, ph: rand()});
  const bubbleMat = glowMaterial({twinkle: 0.2, reduced}); glowMaterials.push(bubbleMat);
  const bubbles = new THREE.Points(pointsGeometry(bubbleEntries), bubbleMat); bubbles.name = 'enchantment-whale-bubbles'; bubbles.frustumCulled = false; root.add(bubbles);
  disposables.add(bubbles.geometry); disposables.add(bubbleMat);
  const bubbleAge = bubbleEntries.map((_, i) => i / bubbleEntries.length * 6), bubbleOrigin = bubbleEntries.map(() => new THREE.Vector3());
  let revealedBy = null;
  function revealDeep(source) {
    const hide = revealTarget > 0.5 && revealedBy === source;
    revealTarget = hide ? 0 : 1; revealUntil = time + 45; revealedBy = hide ? null : source;
    if (!hide) (source === 'iceberg' ? onIceberg : onWhale)?.();
    return revealTarget;
  }
  const toggleWhale = () => revealDeep('whale');
  interactables.push({id: 'enchantment-hidden-whale', type: 'enchant', title: 'Something moves in the deep', objects: [...whale.meshes, sea.water], point: [GLOBE.cx, -12, GLOBE.cz], onInteract: toggleWhale});

  // 5a. The iceberg: the tip of everything there is still to learn
  const iceberg = buildIceberg({low});
  root.add(iceberg.root); iceberg.disposables.forEach(r => disposables.add(r));
  interactables.push({id: 'enchantment-iceberg', type: 'enchant', title: 'An iceberg', objects: iceberg.meshes, point: iceberg.point, onInteract: () => revealDeep('iceberg')});

  // 5c. The porcelain pagoda rings its bells when visited
  interactables.push({id: 'enchantment-porcelain-pagoda', type: 'enchant', title: 'The porcelain pagoda', objects: pagoda.meshes, point: pagoda.top, onInteract: () => { burst(pagoda.top); onPagoda?.(); }});

  // 6. The owl on the letter tree
  const owl = buildOwl();
  owl.root.position.set(32.6, 1.8, -11.15); owl.root.rotation.y = 0.25; owl.root.scale.setScalar(0.72);
  root.add(owl.root); owl.materials.forEach(m => disposables.add(m)); owl.root.traverse(o => { if (o.geometry) disposables.add(o.geometry); if (o.material && !owl.materials.includes(o.material)) disposables.add(o.material); });
  owl.materials.forEach(m => disposables.add(m));
  const owlMeshes = []; owl.root.traverse(o => o.isMesh && owlMeshes.push(o));
  interactables.push({id: 'enchantment-owl-post', type: 'enchant', station: 'contact', title: 'The owl post', objects: owlMeshes, point: owl.root.position.toArray(), onInteract: () => { owlFlutter = time; onOwl?.(); }});

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

  // 6b2. Letters spiral up through the Welcome hall: Hanjing is waiting for yours
  const letterCanvas = document.createElement('canvas'); letterCanvas.width = 128; letterCanvas.height = 88;
  { const c = letterCanvas.getContext('2d'); c.fillStyle = '#f4e8cc'; c.fillRect(0, 0, 128, 88); c.strokeStyle = '#b8954f'; c.lineWidth = 3; c.strokeRect(2, 2, 124, 84);
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(3, 3); c.lineTo(64, 50); c.lineTo(125, 3); c.stroke();
    c.fillStyle = '#9c3a30'; c.beginPath(); c.arc(64, 50, 10, 0, Math.PI * 2); c.fill(); c.fillStyle = '#c9675a'; c.beginPath(); c.arc(61, 47, 3.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8a7a62'; c.lineWidth = 2; for (const y of [66, 74]) { c.beginPath(); c.moveTo(70, y); c.lineTo(112, y); c.stroke(); } }
  const letterTex = new THREE.CanvasTexture(letterCanvas); letterTex.colorSpace = THREE.SRGBColorSpace; letterTex.anisotropy = 4;
  const letterMat = new THREE.MeshStandardMaterial({name: 'enchantment-flying-letters', map: letterTex, emissive: '#ffdca0', emissiveMap: letterTex, emissiveIntensity: 0.28, roughness: 0.8, side: THREE.DoubleSide});
  const letterGeo = new THREE.PlaneGeometry(0.17, 0.117);
  const nLetters = low ? 14 : 28, hall = {x: -0.91, y: 0.3, z: -1.75};
  const letters = new THREE.InstancedMesh(letterGeo, letterMat, nLetters); letters.name = 'enchantment-welcome-letter-spiral'; letters.frustumCulled = false;
  root.add(letters); [letterTex, letterMat, letterGeo].forEach(r => disposables.add(r));
  const letterTmp = new THREE.Object3D();
  function placeLetters(t) {
    for (let i = 0; i < nLetters; i++) {
      const k = i / nLetters, f = (k + t * 0.045) % 1, a = k * Math.PI * 6 + t * 0.85, rad = 0.35 + 0.55 * f;
      letterTmp.position.set(hall.x + Math.cos(a) * rad, hall.y + 0.75 + f * 1.85 + Math.sin(t * 2 + i) * 0.04, hall.z + Math.sin(a) * rad * 0.85);
      letterTmp.rotation.set(-0.35 + 0.3 * Math.sin(t * 4.1 + i * 1.3), -a + Math.PI / 2, 0.45 * Math.sin(t * 5.3 + i));
      letterTmp.scale.setScalar(THREE.MathUtils.smoothstep(f, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(f, 0.86, 1)));
      letterTmp.updateMatrix(); letters.setMatrixAt(i, letterTmp.matrix);
    }
    letters.instanceMatrix.needsUpdate = true;
  }
  placeLetters(1.5);
  interactables.push({id: 'enchantment-welcome-letters', type: 'enchant', station: 'home', title: 'Letters in the air', objects: [letters], point: [hall.x, 1.8, hall.z], onInteract: () => onLetters?.()});

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
  const nearOnly = ['keepsake-two-shores-box', 'keepsake-two-crossings-map', 'keepsake-un-crossroads'].map(n => scene.getObjectByName(n)).filter(Boolean)
    .map(o => ({o, p: o.getWorldPosition(new THREE.Vector3())}));
  let owlTurn = 0, nextBlink = 2, owlFlutter = 12;
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
    iceberg.update(t, reveal, reduced);
    const bp = bubbles.geometry.attributes.position;
    for (let i = 0; i < bubbleAge.length; i++) {
      bubbleAge[i] += (dt || 0);
      if (bubbleAge[i] > 6) { bubbleAge[i] = 0; bubbleOrigin[i].set(4.8, 1.2, 0).applyMatrix4(whale.root.matrixWorld); }
      const o = bubbleOrigin[i], k = bubbleAge[i];
      if (reveal < 0.05 || o.y < -60) { bp.setXYZ(i, 0, -100, 0); continue; }
      bp.setXYZ(i, o.x + Math.sin(k * 2 + i) * 0.25, Math.min(SEA.level - 0.5, o.y + k * 2.4), o.z + Math.cos(k * 1.7 + i) * 0.25);
    }
    bp.needsUpdate = true;
    if (!reduced) { placeCandles(t); syncHalos(t); placeBooks(t); placeLetters(t); }
    for (const b of bursts) { if (!b.pts.visible) continue; b.mat.uniforms.uScale.value = scale; b.mat.uniforms.uAge.value += dt; if (b.mat.uniforms.uAge.value > 1.8) b.pts.visible = false; }
    if (!reduced) {
      owlTurn += dt;
      owl.head.rotation.y = Math.sin(owlTurn * 0.35) * 0.65 + Math.sin(owlTurn * 1.3) * 0.05;
      nextBlink -= dt; const blink = nextBlink < 0.12 && nextBlink > 0 ? 0.12 : 1; owl.eyes.scale.y = blink;
      const fk = time - owlFlutter, flap = fk >= 0 && fk < 1.4 ? Math.sin(fk / 1.4 * Math.PI) * (0.6 + 0.4 * Math.sin(fk * 22)) : 0;
      owl.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * flap * 1.2; w.rotation.y = (i ? 1 : -1) * flap * 0.25; });
      if (fk > 14 + (owlTurn % 6)) owlFlutter = time;
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
