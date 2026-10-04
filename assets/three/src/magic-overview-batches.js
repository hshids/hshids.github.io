import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Overview miniatures keep exactly the same opaque surfaces at the same
// world positions, but bake their current articulated pose into material
// batches. Close inspection restores the original named objects and joints.
export function createOverviewBatches(stations){
  let active=false,built=false;const records=[],groups=[],geometries=[];
  function build(){
    for(const station of stations){
      const group=new THREE.Group();group.name=station.id+'-overview-exact-surface-batches';station.root.add(group);groups.push(group);
      station.root.updateWorldMatrix(true,true);const inverse=station.root.matrixWorld.clone().invert(),bins=new Map(),meshes=[];
      station.root.traverseVisible(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(o.material)||o.material.transparent||o.material.visible===false||o.geometry.morphAttributes.position?.length)return;meshes.push(o);});
      for(const mesh of meshes){const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
        const signature=Object.entries(geometry.attributes).map(([name,a])=>name+':'+a.itemSize+':'+a.normalized).sort().join('|'),key=mesh.material.uuid+'|'+signature+'|'+mesh.castShadow+'|'+mesh.receiveShadow;
        if(!bins.has(key))bins.set(key,{material:mesh.material,geometries:[],originals:[],castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow});const bin=bins.get(key);bin.geometries.push(geometry);bin.originals.push(mesh);}
      for(const bin of bins.values()){
        if(bin.originals.length<2){bin.geometries.forEach(g=>g.dispose());continue;}
        const geometry=mergeGeometries(bin.geometries,false);bin.geometries.forEach(g=>g.dispose());if(!geometry)continue;geometry.computeBoundingSphere();geometries.push(geometry);
        const mesh=new THREE.Mesh(geometry,bin.material);mesh.name=group.name+'-'+bin.material.name;mesh.castShadow=bin.castShadow;mesh.receiveShadow=bin.receiveShadow;group.add(mesh);
        bin.originals.forEach(o=>records.push({object:o,visible:o.visible}));
      }
      group.visible=false;
    }built=true;
  }
  return {set(value){value=!!value;if(value===active)return;if(value&&!built)build();active=value;for(const record of records)record.object.visible=value?false:record.visible;groups.forEach(g=>g.visible=value);},
    get diagnostics(){return{active,originalDrawables:records.length,batchDrawables:groups.reduce((n,g)=>n+g.children.length,0),scope:'Exact opaque surface snapshots only in overview; original articulated objects restored for inspection.'};},
    dispose(){records.forEach(r=>r.object.visible=r.visible);groups.forEach(g=>g.removeFromParent());geometries.forEach(g=>g.dispose());}
  };
}
