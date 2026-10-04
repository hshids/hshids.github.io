import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {worldAssetURL} from './fidelity-assets.js';
import {createClayMaterialTreatment} from './fidelity-clay-materials.js';

// The crystal world has no human avatar. Only the two existing, reviewed cat
// assets are fetched; their shapes, pigmentation and authored clips stay intact.
export async function createMagicCats({quality='high',reduced=false}={}) {
  const tier=quality==='low'?'low':'high',loader=new GLTFLoader();
  const urls=['jinbingbing','xiaohei'].map(id=>worldAssetURL(`assets/three/stylized-models/${id}-${tier}.glb`));
  const models=await Promise.all(urls.map(url=>loader.loadAsync(url)));
  const root=new THREE.Group();root.name='Two cats, no human avatar';
  const clay=createClayMaterialTreatment({quality}),records=new Map();
  for(let i=0;i<models.length;i++) {
    const model=models[i],id=i?'xiaohei':'jinbingbing',group=new THREE.Group();
    group.name=i?'XiaoHei':'JinBingBing';group.scale.setScalar(.50/.82);root.add(group);group.add(model.scene);
    clay.apply(model,{kind:'cat'});model.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
    const mixer=new THREE.AnimationMixer(model.scene),actions=new Map(model.animations.map(c=>[c.name,mixer.clipAction(c)]));
    actions.get('Idle')?.play();records.set(id,{id,group,model,mixer,actions,active:'Idle',until:0,retiring:[]});
  }
  const butterfly=new THREE.Group();butterfly.name='A brief paper butterfly';butterfly.visible=false;root.add(butterfly);
  const wingGeometry=new THREE.SphereGeometry(1,10,6),wingMaterial=new THREE.MeshStandardMaterial({color:'#ddb779',roughness:.72,metalness:.08});
  for(const side of[-1,1]){const wing=new THREE.Mesh(wingGeometry,wingMaterial);wing.scale.set(.105,.065,.012);wing.position.x=side*.08;wing.userData.side=side;butterfly.add(wing);}
  let time=0,butterflyUntil=0,disposed=false;
  function play(id,name) {
    const r=records.get(id),next=r?.actions.get(name);if(!next)return false;
    const old=r.actions.get(r.active);next.stopFading().reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;next.play();
    if(old&&old!==next){old.crossFadeTo(next,reduced?0:.16,false);r.retiring.push({action:old,left:.18});}
    r.active=name;r.until=time+next.getClip().duration;return true;
  }
  function idle(r) {
    if(r.active==='Idle')return;
    const old=r.actions.get(r.active),next=r.actions.get('Idle');next?.reset().setEffectiveWeight(1).setLoop(THREE.LoopRepeat,Infinity).play();
    if(old&&next&&old!==next){old.crossFadeTo(next,reduced?0:.18,false);r.retiring.push({action:old,left:.2});}r.active='Idle';r.until=0;
  }
  function placeAtChapter(station,garden) {
    const r=records.get('jinbingbing'),p=station.stand;
    const offsets=[[-.85,.25],[.85,.25],[-1.2,.6],[1.2,.6]];
    const offset=offsets.find(([x,z])=>garden.passable(p[0]+x,p[2]+z))||[-.85,.25];
    r.group.position.set(p[0]+offset[0],garden.floorAt(p[0]+offset[0],p[2]+offset[1]),p[2]+offset[1]);r.group.rotation.y=.20;idle(r);butterflyUntil=0;butterfly.visible=false;
  }
  function placeXiaoHei(station) {
    const seat=station.root.userData.catSeat;
    const position=seat?.position||[0,.44,-2];records.get('xiaohei').group.position.fromArray(station.worldPoint(position));
  }
  function interact(id='jinbingbing') {
    if(id==='xiaohei')return play(id,'Groom');
    const r=records.get('jinbingbing');if(!play(id,'Pounce'))return false;
    butterflyUntil=time+Math.max(4,r.actions.get('Pounce').getClip().duration);
    butterfly.position.copy(r.group.position).add(new THREE.Vector3(Math.sin(r.group.rotation.y)*.56,.66,Math.cos(r.group.rotation.y)*.56));butterfly.visible=!reduced;return true;
  }
  function update(dt,t) {
    time=t;
    for(const r of records.values()) {
      if(!r.group.visible)continue;
      r.mixer.update(reduced&&r.active==='Idle'?0:dt);
      for(const v of r.retiring)v.left-=dt;
      r.retiring=r.retiring.filter(v=>{if(v.left>0)return true;if(v.action!==r.actions.get(r.active))v.action.stop();return false;});
      if(r.until&&time>=r.until)idle(r);
    }
    butterfly.visible=!reduced&&records.get('jinbingbing').group.visible&&time<butterflyUntil;
    if(butterfly.visible){butterfly.rotation.y=Math.sin(time*1.6)*.20;butterfly.children.forEach(w=>w.rotation.y=w.userData.side*Math.sin(time*10)*.7);}
  }
  return {root,bingbing:records.get('jinbingbing').group,xiaohei:records.get('xiaohei').group,placeAtChapter,placeXiaoHei,interact,update,
    get animationStates(){return Object.fromEntries([...records].map(([id,r])=>[id,r.active]));},
    interactables:[...records.values()].map(r=>({id:r.id,type:'cat',catId:r.id,title:r.id==='xiaohei'?'XiaoHei · our oldest brother':'JinBingBing · a curious little guide',object:r.group})),
    diagnostics:{humanModels:0,assetURLs:urls,catScale:.50/.82,clips:Object.fromEntries([...records].map(([id,r])=>[id,[...r.actions.keys()]]))},
    dispose(){if(disposed)return;disposed=true;const geometries=new Set([wingGeometry]),materials=new Set([wingMaterial]),textures=new Set(clay.resources);
      for(const r of records.values()){r.mixer.stopAllAction();r.mixer.uncacheRoot(r.model.scene);r.model.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);o.skeleton?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}}});}
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}
  };
}
