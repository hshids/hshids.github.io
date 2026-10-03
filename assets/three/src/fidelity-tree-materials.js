import * as THREE from 'three';

// The pine illustration supplies pigment and brush grain, never a photograph
// of the entire branch. Actual branch and needle geometry carries the shape.
const SOURCE_SIZE = [760, 695];
const PATCHES = {
  bark: [[319, 500, 352, 534], [328, 593, 373, 628], [312, 467, 348, 500]],
  // Use the original sun-facing grey-green pigment. Sampling the drawing's
  // deep underside shade as albedo would darken it a second time under PBR.
  needles: [[582, 344, 614, 368], [598, 352, 630, 376], [606, 352, 638, 376]]
};

function paintedPatch(image, rect, resolution) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = resolution;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const [l, t, r, b] = rect;
  context.drawImage(image,
    l / SOURCE_SIZE[0] * image.width, t / SOURCE_SIZE[1] * image.height,
    (r - l) / SOURCE_SIZE[0] * image.width, (b - t) / SOURCE_SIZE[1] * image.height,
    0, 0, resolution, resolution);
  return context.getImageData(0, 0, resolution, resolution).data;
}

function isPigment(pixels, offset) {
  const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
  // The source's old contour annotations must never enter physical bark.
  return pixels[offset + 3] > 220 &&
    !(r > 150 && g > 145 && b < 80) &&
    !(r > 145 && r > g * 1.65 && g < 120 && b < 100);
}

function makePaintTile(image, rects, resolution, contrast, keepLocalGrain = false) {
  const patches = rects.map(rect => paintedPatch(image, rect, resolution));
  const means = patches.map(pixels => {
    const sum = [0, 0, 0]; let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (!isPigment(pixels, i)) continue;
      for (let c = 0; c < 3; c++) sum[c] += pixels[i + c];
      count++;
    }
    if (!count) throw new Error('The pine material patch contains no clean pigment.');
    return sum.map(value => value / count);
  });
  const mean = [0, 1, 2].map(c => means.reduce((sum, item) => sum + item[c], 0) / means.length);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = resolution;
  const context = canvas.getContext('2d');
  const imageData = context.createImageData(resolution, resolution);
  const data = imageData.data;
  // Smooth, periodic patch mixing avoids a repeated outlined branch or a
  // rectangular crop boundary. All patches are interior bark/needle pigment.
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const i = (y * resolution + x) * 4;
    const phase = x / resolution * Math.PI * 2 + .65 * Math.sin(y / resolution * Math.PI * 2);
    const weights = patches.map((_, k) => {
      const separation = Math.cos(phase + k / patches.length * Math.PI * 2);
      // Preserve an interior patch's actual fissures instead of averaging
      // three unrelated grain details into a cloudy smooth brown surface.
      return keepLocalGrain ? Math.exp(3.6 * separation) : 1 + .38 * separation;
    });
    const weightSum = weights.reduce((sum, value) => sum + value, 0);
    for (let c = 0; c < 3; c++) {
      let pigment = 0;
      for (let k = 0; k < patches.length; k++) {
        const pixels = patches[k];
        const value = isPigment(pixels, i) ? pixels[i + c] : means[k][c];
        // Match patch averages first: seams cannot masquerade as hard facets.
        pigment += (value - means[k][c] + mean[c]) * weights[k] / weightSum;
      }
      data[i + c] = Math.round(THREE.MathUtils.clamp(mean[c] + contrast * (pigment - mean[c]), 0, 255));
    }
    data[i + 3] = 255;
  }
  // Pair both borders into a shared band. The texture repeats around a round
  // branch with identical boundary pixels and a quiet bump-map boundary.
  const band = Math.max(4, Math.round(resolution * .10));
  const smooth = x => x * x * (3 - 2 * x);
  for (const axis of [0, 1]) for (let row = 0; row < resolution; row++) {
    for (let distance = 0; distance < band; distance++) {
      const first = axis === 0 ? (row * resolution + distance) * 4 : (distance * resolution + row) * 4;
      const last = axis === 0 ? (row * resolution + resolution - 1 - distance) * 4 : ((resolution - 1 - distance) * resolution + row) * 4;
      const influence = 1 - smooth(distance / (band - 1));
      for (let c = 0; c < 3; c++) {
        const a = data[first + c], b = data[last + c], midpoint = (a + b) * .5;
        data[first + c] = Math.round(a + (midpoint - a) * influence);
        data[last + c] = Math.round(b + (midpoint - b) * influence);
      }
    }
  }
  context.putImageData(imageData, 0, 0);
  return {canvas, mean: mean.map(value => Math.round(value)), data};
}

function textureFromCanvas(canvas, name, colorSpace, quality) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name;
  texture.colorSpace = colorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = quality === 'low' ? 2 : 4;
  return texture;
}

function barkRelief(tile) {
  const size = tile.canvas.width, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d'), image = context.createImageData(size, size);
  for (let i = 0; i < tile.data.length; i += 4) {
    const luminance = .2126 * tile.data[i] + .7152 * tile.data[i + 1] + .0722 * tile.data[i + 2];
    // A quiet micro-relief: wood grain must not turn into extruded stone ribs.
    const level = Math.round(THREE.MathUtils.clamp(128 + (luminance - 128) * .65, 0, 255));
    image.data[i] = image.data[i + 1] = image.data[i + 2] = level;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export function createTreeMaterials({sourceTexture, quality = 'high'} = {}) {
  if (!sourceTexture?.image) throw new Error('The tree material kit needs the original pine painting.');
  const resources = new Set(), resolution = quality === 'low' ? 128 : 256;
  const barkTile = makePaintTile(sourceTexture.image, PATCHES.bark, resolution, 1.02, true);
  const needleTile = makePaintTile(sourceTexture.image, PATCHES.needles, resolution / 2, .42);
  const barkMap = textureFromCanvas(barkTile.canvas, 'original-pine-interior-bark-pigment', THREE.SRGBColorSpace, quality);
  const barkBump = textureFromCanvas(barkRelief(barkTile), 'original-pine-subtle-bark-grain', THREE.NoColorSpace, quality);
  const needleMap = textureFromCanvas(needleTile.canvas, 'original-pine-muted-needle-pigment', THREE.SRGBColorSpace, quality);
  const bark = new THREE.MeshStandardMaterial({
    map: barkMap, bumpMap: barkBump, bumpScale: .0025,
    color: '#ffffff', metalness: 0, roughness: .97, envMapIntensity: .18,
    toneMapped: false
  });
  bark.name = 'rounded-pine-branches-with-original-matte-bark';
  const needles = new THREE.MeshStandardMaterial({
    map: needleMap, color: '#ffffff', vertexColors: true,
    metalness: 0, roughness: .94, envMapIntensity: .15,
    toneMapped: false
  });
  needles.name = 'individual-pine-needles-with-original-painted-pigment';
  [barkMap, barkBump, needleMap, bark, needles].forEach(resource => resources.add(resource));
  function setTheme(dark) {
    // Actual scene lights supply volume and night shade. A mild cool adaptation
    // preserves material identity without hiding a broken side under darkness.
    bark.color.set(dark ? '#c5cdd2' : '#ffffff');
    needles.color.set(dark ? '#c0cbd0' : '#ffffff');
  }
  setTheme(false);
  return {
    bark, needles, resources, setTheme,
    diagnostics: {
      source: 'assets/art/pine.webp', sourceRects: PATCHES,
      barkMeanSRGB: barkTile.mean, needleMeanSRGB: needleTile.mean,
      colorMaps: 2, scalarMaps: 1,
      estimatedTextureBytes: Math.ceil((resolution * resolution * 2 + (resolution / 2) ** 2) * 4 * 4 / 3),
      projection: 'Branch-axis wrapped UV and individual needle UV; no whole-tree or front-facing image card.',
      grainScale: 'One bark tile per approximately .18m along/around a branch; ring repeats stay integral for a closed UV seam.',
      lighting: 'Shared matte dielectric Standard materials, no metallic or Basic front/side mismatch.'
    }
  };
}
