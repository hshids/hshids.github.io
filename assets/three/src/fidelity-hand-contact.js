import * as THREE from 'three';

export function findBone(model,name){let found=null;const key=name.replace(/[^a-z0-9]/gi,'');
  model.traverse(o=>{if(o.isBone&&o.name.replace(/[^a-z0-9]/gi,'')===key)found=o;});return found;}

/** Solve real shoulder/elbow/wrist joints, retaining their measured lengths. */
export function solveHandContact(upper,fore,hand,target,weight=1){
  if(!upper||!fore||!hand)return null;
  upper.updateWorldMatrix(true,true);
  const shoulder=upper.getWorldPosition(new THREE.Vector3()),previousElbow=fore.getWorldPosition(new THREE.Vector3()),previousWrist=hand.getWorldPosition(new THREE.Vector3());
  const a=shoulder.distanceTo(previousElbow),b=previousElbow.distanceTo(previousWrist),delta=target.clone().sub(shoulder),requested=delta.length();
  if(a<1e-7||b<1e-7||requested<1e-7)return null;
  const distance=THREE.MathUtils.clamp(requested,Math.abs(a-b)+1e-5,a+b-1e-5),axis=delta.normalize(),wrist=shoulder.clone().addScaledVector(axis,distance);
  const bend=previousElbow.clone().sub(shoulder);bend.addScaledVector(axis,-bend.dot(axis));
  if(bend.lengthSq()<1e-10){bend.set(0,0,1).applyQuaternion(upper.parent.getWorldQuaternion(new THREE.Quaternion()));bend.addScaledVector(axis,-bend.dot(axis));}
  if(bend.lengthSq()<1e-10){bend.set(1,0,0);bend.addScaledVector(axis,-bend.dot(axis));}
  bend.normalize();const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
  const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(bend,height);
  function aim(bone,end,goal){
    const start=bone.getWorldPosition(new THREE.Vector3()),from=end.getWorldPosition(new THREE.Vector3()).sub(start).normalize(),to=goal.clone().sub(start).normalize();
    const turn=new THREE.Quaternion().setFromUnitVectors(from,to),world=turn.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    const local=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world);
    bone.quaternion.slerp(local,weight);bone.updateWorldMatrix(false,true);
  }
  aim(upper,fore,elbow);aim(fore,hand,wrist);
  const result=hand.getWorldPosition(new THREE.Vector3());
  return{error:result.distanceTo(target),clamped:Math.abs(distance-requested)>1e-6,upperLength:a,foreLength:b};
}

export function createWritingBrush(){
  const root=new THREE.Group();root.name='Fine bamboo calligraphy brush';
  const bamboo=new THREE.MeshStandardMaterial({color:'#8b6943',roughness:.65}),ferrule=new THREE.MeshStandardMaterial({color:'#413a32',metalness:.30,roughness:.52}),hair=new THREE.MeshStandardMaterial({color:'#2e241d',roughness:.93});
  // The local origin is the ink tip, so contact with paper has one exact point.
  const specs=[[.004,.0034,.245,.1475,bamboo],[.0052,.0052,.016,.033,ferrule],[.0075,.00045,.026,.013,hair]],geometries=[];
  for(const[top,bottom,length,y,material]of specs){const g=new THREE.CylinderGeometry(top,bottom,length,14),mesh=new THREE.Mesh(g,material);mesh.position.y=y;mesh.castShadow=true;root.add(mesh);geometries.push(g);}
  const gripOffset=new THREE.Vector3(0,Math.cos(Math.PI/6)*.23,Math.sin(Math.PI/6)*.23);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),gripOffset.clone().normalize());
  return{root,gripOffset,dispose(){geometries.forEach(g=>g.dispose());[bamboo,ferrule,hair].forEach(m=>m.dispose());root.clear();}};
}
