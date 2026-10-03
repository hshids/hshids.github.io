import * as THREE from 'three';
import {mobileArtFiles} from './fidelity-mobile-art.js';

// Keep artwork and models as cacheable files. Vite's library build otherwise
// embeds all matched new-URL assets, including both mobile/desktop wardrobes,
// in the initial JavaScript download. Source and distribution share this depth.
export function worldAssetURL(path){
  const moduleDirectory=import.meta.url.slice(0,import.meta.url.lastIndexOf('/')+1);
  return new URL(path,new URL('../../../',moduleDirectory)).href;
}

// One shared texture per URL and resolution tier across all chapter factories.
// Factories retain ownership through acquire/release; destroying one chapter
// must not dispose a texture still used by another chapter.
const records = new Map();
const owners = new WeakMap();
const maxDimension = quality => quality === 'low' ? 1024 : quality === 'medium' ? 1536 : Infinity;

export function fitPaintCanvas(canvas, quality = 'high') {
  const limit = maxDimension(quality);
  const ratio = Math.min(1, limit / Math.max(canvas.width, canvas.height));
  if (ratio === 1) return canvas;
  const fitted = document.createElement('canvas');
  fitted.width = Math.max(1, Math.round(canvas.width * ratio));
  fitted.height = Math.max(1, Math.round(canvas.height * ratio));
  const context = fitted.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(canvas, 0, 0, fitted.width, fitted.height);
  return fitted;
}

export async function acquirePaintTexture(url, { quality = 'high' } = {}) {
  let absolute = new URL(String(url), document.baseURI).href;
  const pathname=new URL(absolute).pathname;
  if(quality==='low'&&pathname.includes('/assets/art/')&&mobileArtFiles.has(pathname.split('/').pop())){
    absolute=absolute.replace('/assets/art/','/assets/three/art-mobile/');
  }
  const key = `${quality}:${absolute}`;
  let record = records.get(key);
  if (!record) {
    record = { key, refs: 0, texture: null, promise: null };
    record.promise = new THREE.TextureLoader().loadAsync(absolute).then(texture => {
      const image = texture.image;
      const ratio = Math.min(1, maxDimension(quality) / Math.max(image.width, image.height));
      if (ratio < 1) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        texture.image = canvas;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = quality === 'low' ? 2 : 4;
      texture.needsUpdate = true;
      record.texture = texture;
      owners.set(texture, record);
      return texture;
    }).catch(error => {
      if (records.get(key) === record) records.delete(key);
      throw error;
    });
    records.set(key, record);
  }
  record.refs++;
  return record.promise;
}

export function releasePaintTexture(texture) {
  const record = owners.get(texture);
  if (!record) {
    texture.dispose();
    return;
  }
  record.refs--;
  if (record.refs > 0) return;
  records.delete(record.key);
  owners.delete(texture);
  texture.dispose();
}

export function paintTextureDiagnostics() {
  const textures = [...records.values()].filter(record => record.texture);
  return {
    textures: textures.length,
    references: textures.reduce((sum, record) => sum + record.refs, 0),
    estimatedBytes: textures.reduce((sum, record) => {
      const image = record.texture.image;
      return sum + Math.ceil(image.width * image.height * 4 * 4 / 3);
    }, 0),
    sources: textures.map(record => ({
      key: record.key, refs: record.refs,
      width: record.texture.image.width, height: record.texture.image.height
    }))
  };
}
