import * as THREE from 'three';
import {acquirePaintTexture,releasePaintTexture,worldAssetURL} from './fidelity-assets.js';

/** The original rough sun and moon, on closed celestial volumes. */
export async function createFaithfulSky({quality='high'}={}){
  const root=new THREE.Group();root.name='Painted sun, moon, stars and distant birds';
  const source=await acquirePaintTexture(worldAssetURL('assets/art/details-painted.webp'),{quality});
  const original=document.createElement('canvas');original.width=1774;original.height=887;
  original.getContext('2d').drawImage(source.image,0,0,1774,887);
  const resources=[],textures=[];
  function disc(rect,fill){const canvas=document.createElement('canvas');canvas.width=canvas.height=quality==='low'?256:512;
    const ctx=canvas.getContext('2d'),[l,t,r,b]=rect;ctx.drawImage(original,l,t,r-l,b-t,0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation='destination-over';ctx.fillStyle=fill;ctx.fillRect(0,0,canvas.width,canvas.height);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);return texture;}
  const sunMap=disc([78,35,453,410],'#dfaf57'),moonMap=disc([540,40,909,408],'#c0bcae');
  const sphere=new THREE.SphereGeometry(.78,quality==='low'?28:48,quality==='low'?18:32),positions=sphere.attributes.position,uv=sphere.attributes.uv;
  // Project the calibrated painting onto each point of the curved sphere;
  // retain the source disc's features without alpha-cutting its silhouette.
  for(let i=0;i<positions.count;i++)uv.setXY(i,.5+positions.getX(i)/1.56,.5+positions.getY(i)/1.56);
  const celestialMaterial=new THREE.MeshBasicMaterial({map:sunMap,fog:false,toneMapped:false}),celestial=new THREE.Mesh(sphere,celestialMaterial);
  celestial.name='Original rough celestial orb';root.add(celestial);resources.push(sphere,celestialMaterial);
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    0,.065,0,-.012,.012,0,.012,.012,0,0,-.065,0,.012,-.012,0,-.012,-.012,0,
    -.045,0,0,-.012,-.012,0,-.012,.012,0,.045,0,0,.012,.012,0,.012,-.012,0
  ],3));starGeometry.computeVertexNormals();
  const starMaterial=new THREE.MeshBasicMaterial({color:'#d3dcdf',transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false,side:THREE.DoubleSide});
  const stars=new THREE.InstancedMesh(starGeometry,starMaterial,90),dummy=new THREE.Object3D();stars.name='Fine unequal star rays';
  let seed=7341;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<90;i++){dummy.position.set((random()-.5)*47,4.9+random()*7.3,-29-random()*7);dummy.scale.setScalar(.36+random()*.63);dummy.rotation.z=(random()-.5)*.35;dummy.updateMatrix();stars.setMatrixAt(i,dummy.matrix);stars.setColorAt(i,new THREE.Color().setHSL(.10+random()*.08,.10,.48+random()*.40));}
  root.add(stars);resources.push(starGeometry,starMaterial);
  const birds=[],birdMaterial=new THREE.MeshBasicMaterial({color:'#7b7b70',fog:false,toneMapped:false});resources.push(birdMaterial);
  for(let i=0;i<5;i++){const bird=new THREE.Group();bird.name='Distant bird silhouette '+i;const wings=[];
    for(const sign of [-1,1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(sign*.055,.035,0),new THREE.Vector3(sign*.11,.007,0)]),g=new THREE.TubeGeometry(curve,7,.005,3,false),mesh=new THREE.Mesh(g,birdMaterial);bird.add(mesh);resources.push(g);wings.push(mesh);}
    root.add(bird);birds.push({object:bird,wings,phase:i*1.71,baseX:-14+i*6,baseY:5.1+(i%3)*.69,z:-23-i*.7});}
  let dark=false,actorX=0;
  function setTheme(value){dark=!!value;celestialMaterial.map=dark?moonMap:sunMap;celestialMaterial.needsUpdate=true;stars.visible=dark;birdMaterial.color.set(dark?'#8b96a0':'#7b7b70');}
  function update(dt,time,x=actorX){actorX=x;celestial.position.set(actorX+6.5,6.65,-24);stars.position.x=actorX;
    starMaterial.opacity=dark?.60+.08*Math.sin(time*.34):0;
    for(const b of birds){const t=time*.13+b.phase;b.object.position.set(actorX+b.baseX+Math.sin(t)*2.8,b.baseY+Math.sin(t*.71)*.32,b.z+Math.cos(t*.53)*.8);b.object.rotation.z=Math.sin(t*.9)*.055;for(let j=0;j<2;j++)b.wings[j].rotation.z=Math.sin(time*1.9+b.phase)*(j===0?-1:1)*.16;}
  }
  setTheme(false);update(0,0,0);
  return{root,setTheme,update,interactables:[{id:'celestial',object:celestial,type:'celestial',title:'Change the time of day'}],
    dispose(){releasePaintTexture(source);resources.forEach(r=>r.dispose());textures.forEach(t=>t.dispose());root.clear();}};
}
