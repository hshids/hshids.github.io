import * as THREE from 'three';

// Daytime gets clear, gently coloured air and botanical accents. These are
// source-map multipliers, not a hue filter over the scene or its architecture.
export const WORLD_SCENE_COLOURS=Object.freeze({
  day:Object.freeze({sky:'#cde5f0',fog:'#d6e7df'}),
  night:Object.freeze({sky:'#192a35',fog:'#192a35'})
});

const rgb=(r,g,b)=>Object.freeze({linear:Object.freeze([r,g,b])});
const hex=value=>Object.freeze({srgb:value});
export const WORLD_ENVIRONMENT_PALETTE=Object.freeze({
  pineFoliage:Object.freeze({day:rgb(1.04,1.38,.94),night:hex('#c0cbd0')}),
  courtyardSoil:Object.freeze({day:hex('#bfcda2'),night:hex('#697280')}),
  pondLeaves:Object.freeze({day:rgb(.98,1.13,1.02),night:hex('#81939a')}),
  reedLeaves:Object.freeze({day:hex('#c0d3a0'),night:hex('#bac594')}),
  aquaticStems:Object.freeze({day:hex('#6f966b'),night:hex('#6c7e50')}),
  riverWater:Object.freeze({day:hex('#c8ece8'),night:hex('#8eabb6')}),
  mountainNear:Object.freeze({day:rgb(.90,1.25,1.04),night:hex('#748390')}),
  mountainMid:Object.freeze({day:rgb(.90,1.18,1.26),night:hex('#647482')}),
  mountainFar:Object.freeze({day:rgb(.90,1.12,1.36),night:hex('#566777')})
});

const NAMED_ROLES=new Map([
  ['individual-pine-needles-with-original-painted-pigment','pineFoliage'],
  ['quiet-painted-courtyard-soil','courtyardSoil'],
  ['original-leaf-veins','pondLeaves'],
  ['original-phragmites-leaf-grain','reedLeaves'],
  ['living-lotus-and-reed-stems','aquaticStems'],
  ['continuous-original-water-with-moving-normals','riverWater'],
  ['original-mountain-wash-relief-0','mountainNear'],
  ['original-mountain-wash-relief-1','mountainMid'],
  ['original-mountain-wash-relief-2','mountainFar']
]);

/** Exact roles only. New environment materials can opt in with the named
 * environment_palette_role tag; actor clay and practical emitters are barred. */
export function classifyWorldMaterial(material){
  if(!material?.color?.isColor)return null;
  const data=material.userData||{};
  if(data.clay_surface||data.clay_finish||data.night_diffuse_lantern_part||data.night_lantern_part)return null;
  const tag=data.environment_palette_role;
  if(tag)return Object.hasOwn(WORLD_ENVIRONMENT_PALETTE,tag)?tag:null;
  return NAMED_ROLES.get(material.name)||null;
}

/** Call after the original riverside/theme setters. Idempotent, colour only:
 * geometry, maps, opacity, roughness, shadows, emissive light and warm windows
 * retain their existing behavior. Scene sky/fog remain the world's own job. */
export function applyWorldPalette(scene,dark=false){
  const seen=new Set(),roles={},theme=dark?'night':'day';let changedMaterials=0;
  scene.traverse(object=>{if(!object.isMesh||object.isSkinnedMesh)return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(!material||seen.has(material))continue;seen.add(material);
      const role=classifyWorldMaterial(material);if(!role)continue;
      const colour=WORLD_ENVIRONMENT_PALETTE[role][theme];
      if(colour.linear)material.color.setRGB(...colour.linear,THREE.LinearSRGBColorSpace);
      else material.color.set(colour.srgb);
      roles[role]=(roles[role]||0)+1;changedMaterials++;
    }
  });
  return{dark:!!dark,changedMaterials,roles,
    scope:'Exact environment surface colours only; actual world lighting and visual harmony require renderer review.'};
}
