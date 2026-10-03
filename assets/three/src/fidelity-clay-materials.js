import * as THREE from 'three';

// Surface finish only: the model's closed sculpted shape supplies its volume,
// fur silhouette and likeness. This never projects a photo or changes a rig.
const PROFILES={
  skin:{roughness:.94,bumpScale:.00018},
  cloth:{roughness:.97,bumpScale:.00050},
  silk:{roughness:.88,bumpScale:.00022},
  hair:{roughness:.94,bumpScale:.00030},
  fur:{roughness:.98,bumpScale:.00042}
};
const TILE_METRES=.040;

function hash(x,y){
  let n=Math.imul(x+79,374761393)^Math.imul(y+173,668265263);
  n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295*2-1;
}
function noise(u,v,cells){
  const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y);
  const sx=x-ix,sy=y-iy,a=sx*sx*(3-2*sx),b=sy*sy*(3-2*sy);
  const n=(dx,dy)=>hash((ix+dx)%cells,(iy+dy)%cells);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(n(0,0),n(1,0),a),THREE.MathUtils.lerp(n(0,1),n(1,1),a),b);
}
function grainTexture(quality){
  const size=quality==='low'?128:256,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    const grain=.50*noise(u,v,8)+.32*noise(u,v,24)+.18*noise(u,v,64),i=(y*size+x)*4;
    // Red is quiet relief; green is very small roughness variation. Neither
    // channel enters base colour, so charcoal, cream and golden fur stay put.
    pixels[i]=Math.round(128+8*grain);pixels[i+1]=Math.round(238+7*grain);pixels[i+2]=128;pixels[i+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.name='Shared local clay micrograin / bump-red roughness-green';
  texture.colorSpace=THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  texture.needsUpdate=true;return texture;
}

function surfaceRole(material,mesh,kind){
  const name=material.name.toLowerCase(),tag=material.userData.clay_surface||mesh.userData.clay_surface;
  if(material.userData.night_diffuse_lantern_part||mesh.userData.diffuse_emitter_exclude_self_shadow||/lantern/.test(name))return'protected';
  if(tag)return PROFILES[tag]?tag:'protected';
  if(/eye|iris|pupil|glint|highlight|whisker/.test(name))return'protected';
  if(material.metalness>.2||/brass|bronze|buckle|embroidery|button|sole|loafer|shoe|flat/.test(name))return'protected';
  if(/skin|ear colou?r|inner ear|nose|smile|lip/.test(name))return'skin';
  if(/hair|brow|warm wave/.test(name))return'hair';
  if(kind==='cat')return'fur';
  if(/silk|qipao/.test(name)&&!/lining/.test(name))return'silk';
  return'cloth';
}

function ensureLocalGrainUV(geometry){
  if(geometry.hasAttribute('uv'))return false;
  const position=geometry.getAttribute('position');if(!position)return false;
  if(!geometry.boundingBox)geometry.computeBoundingBox();
  const extent=geometry.boundingBox.getSize(new THREE.Vector3());
  const axes=[0,1,2].sort((a,b)=>extent.getComponent(b)-extent.getComponent(a));
  const uv=new Float32Array(position.count*2);
  for(let i=0;i<position.count;i++){
    uv[i*2]=position.getComponent(i,axes[0])/TILE_METRES;
    uv[i*2+1]=position.getComponent(i,axes[1])/TILE_METRES;
  }
  // Quiet object-space grain follows the skinned surface. It has no image,
  // colour, face alignment or macro mark that could drift when limbs move.
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return true;
}

export function createClayMaterialTreatment({quality='high'}={}){
  const grain=grainTexture(quality),treated=new WeakMap();
  const stats={roles:{skin:0,cloth:0,silk:0,hair:0,fur:0,protected:0},proceduralUVGeometries:0};
  function apply(model,{kind='human'}={}){
    const scene=model.scene||model;
    scene.traverse(mesh=>{if(!mesh.isMesh)return;
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];let needsUV=false;
      for(const material of materials){
        if(!material?.isMeshStandardMaterial)continue;
        let role=treated.get(material);
        if(!role){
          role=surfaceRole(material,mesh,kind);treated.set(material,role);stats.roles[role]++;
          if(role!=='protected'){
            const profile=PROFILES[role];material.metalness=0;material.roughness=profile.roughness;
            material.roughnessMap=grain;
            if(!material.bumpMap){material.bumpMap=grain;material.bumpScale=profile.bumpScale;}
            // At most a two-percent linear lift; do not replace a dark coat or
            // tuxedo vertex palette with grey/white to compensate for lighting.
            if(!material.vertexColors){material.color.multiplyScalar(1.02);material.color.r=Math.min(1,material.color.r);material.color.g=Math.min(1,material.color.g);material.color.b=Math.min(1,material.color.b);}
            if(role==='skin'){material.emissive.set(0);material.emissiveIntensity=0;material.emissiveMap=null;}
            material.userData.clay_finish={surface:role,grain:'shared procedural',tileMetres:TILE_METRES};
            material.needsUpdate=true;
          }
        }
        if(role!=='protected')needsUV=true;
      }
      if(needsUV&&ensureLocalGrainUV(mesh.geometry))stats.proceduralUVGeometries++;
    });return model;
  }
  return{apply,resources:[grain],get diagnostics(){return{textureSize:grain.image.width,sharedTextureCount:1,
    estimatedTextureMiB:grain.image.data.byteLength*4/3/1048576,roles:{...stats.roles},proceduralUVGeometries:stats.proceduralUVGeometries,
    colourChange:'At most 2% linear lift on non-vertex palettes; no albedo texture, no saturation increase',skinEmission:0,
    scope:'Micro surface finish only; sculpted silhouette, likeness and actual renderer lighting require independent visual review.'};}};
}
