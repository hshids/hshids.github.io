import * as THREE from 'three';

/**
 * Quiet, shared surfaces for the miniature's real three-dimensional buildings.
 * The maps contain neutral pigment variation, not a building, edge or baked shadow.
 * No pixel-wise white noise: each field is smooth and periodic before sampling.
 * Materials belong to their chapter; textures belong to a reference-counted tier pool.
 */
export const CRAFT_COLOURS = Object.freeze({
  wood: '#926344', darkWood: '#5d4031', plaster: '#eadbc0', mortar: '#ded2b9',
  stone: '#a6a8a1', floor: '#baaa88', roof: '#52616b', red: '#a64c40',
  brass: '#c5a66b', ivory: '#eee3cb', blue: '#6e919c', green: '#8ca77a',
  cloth: '#a88970', glass: '#c7d8d4', paper: '#f3e8cd',
});

const texturePools = new Map();
const TAU = Math.PI * 2;
const clampByte = value => Math.max(0, Math.min(255, Math.round(value)));
const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;
const wrap = (value, period) => (value % period + period) % period;

function lattice(x, y, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return (n - Math.floor(n)) * 2 - 1;
}

// Integer lattice periods make u/v=0 and u/v=1 identical, with smooth derivatives.
function noise(u, v, columns, rows, seed) {
  const x = u * columns, y = v * rows, ix = Math.floor(x), iy = Math.floor(y);
  const sx = smooth(x - ix), sy = smooth(y - iy);
  const at = (dx, dy) => lattice(wrap(ix + dx, columns), wrap(iy + dy, rows), seed);
  return mix(mix(at(0, 0), at(1, 0), sx), mix(at(0, 1), at(1, 1), sx), sy);
}

function woodField(u, v) {
  // Long, irregular fibres: five broad bands with two softer secondary scales.
  // The very small phase shift bends the grain without conspicuous sine-wave rings.
  const bend = .020 * Math.sin(v * TAU) + .009 * Math.sin(v * TAU * 2);
  return .66 * noise(u + bend, v, 5, 1, 13)
    + .25 * noise(u + bend, v, 10, 2, 17) + .09 * noise(u, v, 2, 3, 21);
}

function mineralField(u, v) {
  return .72 * noise(u, v, 2, 2, 31) + .28 * noise(u, v, 5, 4, 37);
}

function paperField(u, v) {
  return .62 * noise(u, v, 3, 4, 41) + .26 * noise(u, v, 6, 3, 43)
    + .12 * noise(u, v, 12, 2, 47);
}

function ceramicField(u, v) {
  return .80 * noise(u, v, 3, 3, 53) + .20 * noise(u, v, 8, 6, 59);
}

function texture(size, label, field, centre, amplitude, colour, quality) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const value = clampByte(centre + amplitude * field(x / (size - 1), y / (size - 1)));
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.name = `shared-${quality}-${label}-crafted-surface`;
  t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = quality === 'high' ? 4 : 2;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  t.userData = { crafted_surface: true, authored_periodic: true, byteLength: data.byteLength };
  return t;
}

function acquireTextures(quality) {
  let pool = texturePools.get(quality);
  if (!pool) {
    const low = quality === 'low', colourSize = low ? 128 : 256;
    const surfaceSize = low ? 64 : 128, detailSize = low ? 32 : 64;
    const maps = {
      wood: texture(colourSize, 'broad-directional-wood-pigment', woodField, 249, 5, true, quality),
      woodRelief: texture(surfaceSize, 'shallow-directional-wood-relief', woodField, 128, 14, false, quality),
      mineral: texture(surfaceSize, 'soft-lime-and-stone-pigment', mineralField, 250, 3.5, true, quality),
      mineralRelief: texture(surfaceSize, 'quiet-mineral-relief', (u, v) =>
        .70 * mineralField(u, v) + .30 * noise(u, v, 9, 7, 61), 128, 7, false, quality),
      paper: texture(surfaceSize, 'subtle-paper-pigment', paperField, 250, 3, true, quality),
      paperRelief: texture(detailSize, 'subtle-paper-fibres', paperField, 128, 5, false, quality),
      ceramic: texture(surfaceSize, 'soft-tile-pigment', ceramicField, 249, 4, true, quality),
      ceramicRelief: texture(detailSize, 'subtle-tile-relief', ceramicField, 128, 5, false, quality),
    };
    const cpuBytes = Object.values(maps).reduce((sum, map) => sum + map.image.data.byteLength, 0);
    // RGBA8 + full square mip chains; no renderer or DOM is needed to author the maps.
    const gpuBytes = Object.values(maps).reduce((sum, map) => {
      let size = map.image.width;
      while (size >= 1) { sum += size * size * 4; size /= 2; }
      return sum;
    }, 0);
    pool = { maps, references: 0, cpuBytes, gpuBytes };
    texturePools.set(quality, pool);
  }
  pool.references++;
  return pool;
}

function releaseTextures(quality, pool) {
  pool.references--;
  if (pool.references !== 0) return;
  Object.values(pool.maps).forEach(map => map.dispose());
  if (texturePools.get(quality) === pool) texturePools.delete(quality);
}

/**
 * Return the room kit's 14 established roles plus `paper`.
 * `resources` owns all returned materials; do NOT add their shared maps separately.
 * Disposing all fifteen materials releases this kit's one shared-texture lease.
 * Glass stays compatible with setTheme: color/emissive/opacity/depthWrite are mutable.
 */
export function createCraftMaterials({ name = 'room', quality = 'high', resources = new Set() } = {}) {
  if (typeof resources?.add !== 'function') throw new TypeError('Craft resources must be a Set-like owner.');
  quality = quality === 'low' ? 'low' : 'high';
  const pool = acquireTextures(quality), t = pool.maps;
  const specifications = {
    wood: { roughness: .68, map: t.wood, bumpMap: t.woodRelief, bumpScale: .0012 },
    darkWood: { roughness: .72, map: t.wood, bumpMap: t.woodRelief, bumpScale: .0009 },
    plaster: { roughness: .95, map: t.mineral, bumpMap: t.mineralRelief, bumpScale: .0013 },
    mortar: { roughness: .99, map: t.mineral, bumpMap: t.mineralRelief, bumpScale: .0007 },
    stone: { roughness: .88, map: t.mineral, bumpMap: t.mineralRelief, bumpScale: .0018 },
    floor: { roughness: .78, map: t.wood, bumpMap: t.woodRelief, bumpScale: .0007 },
    roof: { roughness: .77, map: t.ceramic, bumpMap: t.ceramicRelief, bumpScale: .0009 },
    red: { roughness: .47, map: t.wood, bumpMap: t.woodRelief, bumpScale: .00035,
      clearcoat: .18, clearcoatRoughness: .60 },
    brass: { roughness: .31, metalness: .72, envMapIntensity: .62 },
    ivory: { roughness: .84, map: t.paper, bumpMap: t.paperRelief, bumpScale: .00025 },
    blue: { roughness: .69, map: t.ceramic, bumpMap: t.ceramicRelief, bumpScale: .0004 },
    green: { roughness: .70, map: t.ceramic, bumpMap: t.ceramicRelief, bumpScale: .0004 },
    cloth: { roughness: .94, map: t.paper, bumpMap: t.paperRelief, bumpScale: .00035 },
    glass: { roughness: .24, transparent: true, opacity: .36, depthWrite: false },
    paper: { roughness: .98, map: t.paper, bumpMap: t.paperRelief, bumpScale: .0002 },
  };
  const materials = {};
  let remaining = Object.keys(specifications).length;
  for (const [role, settings] of Object.entries(specifications)) {
    const Material = role === 'red' ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const material = new Material({
      name: `${name}-${role}-crafted-surface`, color: CRAFT_COLOURS[role],
      metalness: 0, envMapIntensity: .45, ...settings,
    });
    material.userData = {
      crafted_surface: true, craft_role: role, texture_quality: quality,
      texture_pool_count: 8, texture_pool_cpu_bytes: pool.cpuBytes, texture_pool_gpu_bytes: pool.gpuBytes,
    };
    const disposed = () => {
      material.removeEventListener('dispose', disposed);
      remaining--;
      if (remaining === 0) releaseTextures(quality, pool);
    };
    material.addEventListener('dispose', disposed);
    materials[role] = material;
    resources.add(material);
  }
  return materials;
}

/**
 * Borrow a template's neutral surface while keeping an existing school's pigment.
 * Keep the complete template set alive in the same factory's resources until teardown.
 * This never changes target color, emissive, opacity, transparency or depthWrite.
 */
export function applyCraftSurface(target, template, { preserveMetalness = true, preserveRoughness = false } = {}) {
  if (!target?.isMaterial || !template?.isMaterial) throw new TypeError('Craft application needs two materials.');
  for (const property of ['map', 'bumpMap', 'bumpScale', 'roughnessMap']) target[property] = template[property];
  if (!preserveRoughness) target.roughness = template.roughness;
  if (!preserveMetalness) target.metalness = template.metalness;
  target.userData.crafted_surface = true;
  target.userData.craft_role = template.userData.craft_role;
  target.userData.texture_quality = template.userData.texture_quality;
  target.needsUpdate = true;
  return target;
}

/** Read-only diagnostics; shared texture memory is counted once per active tier. */
export function getCraftTextureBudget() {
  const tiers = [...texturePools].map(([quality, pool]) => ({
    quality, leases: pool.references, textures: 8, cpuBytes: pool.cpuBytes, gpuBytes: pool.gpuBytes,
  }));
  return { tiers, cpuBytes: tiers.reduce((n, p) => n + p.cpuBytes, 0),
    gpuBytes: tiers.reduce((n, p) => n + p.gpuBytes, 0) };
}
