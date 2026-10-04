import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {worldAssetURL} from './fidelity-assets.js';
import {createClayMaterialTreatment} from './fidelity-clay-materials.js';

// The crystal world has no human avatar. Only the two existing, reviewed cat
// assets are fetched; their shapes and authored clips stay intact. Their coats
// are tuned toward the real cats (XiaoHei is a blue-grey tuxedo, JinBingBing a
// golden shaded British Longhair), and a few small games live here: a teaser
// wand for XiaoHei, a butterfly for JinBingBing, and a head rub when you touch
// her head.
const lin=hex=>new THREE.Color(hex);
function recolourCoat(scene,id){
  scene.traverse(o=>{
    if(!o.isMesh||!/matte fur/i.test(o.material?.name||''))return;
    const col=o.geometry.getAttribute('color'),pos=o.geometry.getAttribute('position');if(!col||!pos)return;
    o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox,c=new THREE.Color();
    const slate=lin('#646b75'),slateDark=lin('#4e545d'),cream=lin('#ebdcc5'),fawn=lin('#d9c2a4'),tip=lin('#c4a27c');
    for(let i=0;i<col.count;i++){
      c.setRGB(col.getX(i),col.getY(i),col.getZ(i));const lum=.2126*c.r+.7152*c.g+.0722*c.b;
      const h=(pos.getY(i)-bb.min.y)/Math.max(1e-6,bb.max.y-bb.min.y);
      if(id==='xiaohei'){if(lum<.3)c.copy(slateDark).lerp(slate,Math.min(1,lum/.12)*.6+h*.25);}
      else{if(lum>.6)c.copy(cream).lerp(fawn,THREE.MathUtils.clamp((h-.45)*1.6,0,1)*.85);else c.copy(fawn).lerp(tip,THREE.MathUtils.clamp((h-.6)*1.5,0,1));}
      col.setXYZ(i,c.r,c.g,c.b);
    }
    col.needsUpdate=true;
    // a soft fuzzy rim, like light caught in the outer fur
    const m=o.material;if(m.userData.furSheen)return;m.userData.furSheen=true;
    const sheen=id==='xiaohei'?'vec3(0.55,0.6,0.68)':'vec3(1.0,0.86,0.62)';
    m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float furRim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.4);
      totalEmissiveRadiance+=${sheen}*furRim*0.16*diffuseColor.rgb;`);};
    m.customProgramCacheKey=()=>'magic-cat-fur-sheen-'+id;m.needsUpdate=true;
  });
}
function spriteTexture(draw,size=64){const cv=document.createElement('canvas');cv.width=cv.height=size;draw(cv.getContext('2d'),size);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;}
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
    recolourCoat(model.scene,id);
    const mixer=new THREE.AnimationMixer(model.scene),actions=new Map(model.animations.map(c=>[c.name,mixer.clipAction(c)]));
    actions.get('Idle')?.play();
    const bone=name=>model.scene.getObjectByName(name);
    records.set(id,{id,group,model,mixer,actions,active:'Idle',until:0,retiring:[],head:bone('Head'),neck:bone('Neck'),tail:bone('Tail.01'),mode:null,modeUntil:0,modeStart:0,faceYaw:null});
  }
  // a monarch-like butterfly: four painted wings that beat on hinges
  const butterfly=new THREE.Group();butterfly.name='A butterfly for JinBingBing';butterfly.visible=false;root.add(butterfly);
  const wingTexture=spriteTexture((c,S)=>{c.clearRect(0,0,S,S);c.fillStyle='#e8892f';c.strokeStyle='#1d1814';c.lineWidth=S*.05;
    c.beginPath();c.moveTo(S*.05,S*.5);c.quadraticCurveTo(S*.25,S*.02,S*.95,S*.08);c.quadraticCurveTo(S*.8,S*.5,S*.05,S*.5);c.fill();c.stroke();
    c.beginPath();c.moveTo(S*.05,S*.52);c.quadraticCurveTo(S*.65,S*.55,S*.7,S*.92);c.quadraticCurveTo(S*.25,S*.98,S*.05,S*.52);c.fill();c.stroke();
    c.lineWidth=S*.02;for(const [x,y]of[[.3,.2],[.55,.15],[.35,.7],[.5,.8]]){c.beginPath();c.moveTo(S*.08,S*.5);c.lineTo(S*x,S*y);c.stroke();}
    c.fillStyle='#fff';for(const [x,y]of[[.86,.12],[.78,.2],[.62,.86],[.5,.9]]){c.beginPath();c.arc(S*x,S*y,S*.025,0,Math.PI*2);c.fill();}},128);
  const wingGeometry=new THREE.PlaneGeometry(.12,.12);wingGeometry.translate(.06,0,0);
  const wingMaterial=new THREE.MeshStandardMaterial({map:wingTexture,transparent:true,alphaTest:.3,side:THREE.DoubleSide,roughness:.7,emissive:'#5a2a08',emissiveIntensity:.25});
  const wings=[];for(const side of[-1,1]){const hinge=new THREE.Group();hinge.scale.x=side;const w=new THREE.Mesh(wingGeometry,wingMaterial);w.rotation.x=-Math.PI/2;hinge.add(w);hinge.userData.side=side;butterfly.add(hinge);wings.push(hinge);}
  const bodyMesh=new THREE.Mesh(new THREE.CylinderGeometry(.006,.004,.07,6),new THREE.MeshStandardMaterial({color:'#1d1814'}));bodyMesh.rotation.x=Math.PI/2;butterfly.add(bodyMesh);
  // XiaoHei's teaser wand: a bamboo stick on a little stand, a string, feathers and a bell
  const wand=new THREE.Group();wand.name='XiaoHei teaser wand';root.add(wand);
  const bamboo=new THREE.MeshStandardMaterial({color:'#c9a865',roughness:.6}),featherMats=['#2fa39a','#e2649a','#f2c230'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.8,side:THREE.DoubleSide})),bellMat=new THREE.MeshStandardMaterial({color:'#e8c46a',roughness:.3,metalness:.6});
  const stand=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,.03,16),new THREE.MeshStandardMaterial({color:'#6b4a2e',roughness:.7}));stand.position.y=.015;wand.add(stand);
  const stickPivot=new THREE.Group();stickPivot.position.y=.03;wand.add(stickPivot);
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.006,.008,.7,8),bamboo);stick.position.y=.35;stickPivot.add(stick);
  for(let k=1;k<4;k++){const node=new THREE.Mesh(new THREE.CylinderGeometry(.0095,.0095,.008,8),bamboo);node.position.y=k*.17;stickPivot.add(node);}
  const lure=new THREE.Group();wand.add(lure);
  featherMats.forEach((m,k)=>{const f=new THREE.Mesh(new THREE.PlaneGeometry(.03,.11),m);f.position.y=-.05;f.rotation.set(0,k*1.05,(k-1)*.35);lure.add(f);});
  const bell=new THREE.Mesh(new THREE.SphereGeometry(.014,10,8),bellMat);bell.position.y=.005;lure.add(bell);
  const stringGeo=new THREE.BufferGeometry().setFromPoints(Array.from({length:12},()=>new THREE.Vector3()));const string=new THREE.Line(stringGeo,new THREE.LineBasicMaterial({color:'#efe6d2'}));string.frustumCulled=false;wand.add(string);
  wand.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  // a generous invisible volume so the slim wand is easy to click
  const wandPick=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.75,8),new THREE.MeshBasicMaterial({visible:false}));wandPick.position.set(.1,.36,0);wandPick.name='xiaohei-teaser-wand-pick';wand.add(wandPick);
  // little hearts for a head rub
  const heartTexture=spriteTexture((c,S)=>{c.fillStyle='#ff7fa0';c.beginPath();c.moveTo(S*.5,S*.85);c.bezierCurveTo(S*.05,S*.55,S*.15,S*.12,S*.5,S*.32);c.bezierCurveTo(S*.85,S*.12,S*.95,S*.55,S*.5,S*.85);c.fill();});
  const hearts=Array.from({length:4},()=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:heartTexture,transparent:true,depthWrite:false}));sp.scale.setScalar(.07);sp.visible=false;root.add(sp);return sp;});
  let time=0,butterflyUntil=0,disposed=false,wandStart=-99,rubStart=-99;
  const tmpV=new THREE.Vector3(),tmpQ=new THREE.Quaternion(),tmpE=new THREE.Euler();
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
    const g=records.get('xiaohei').group.position;wand.position.set(g.x-.78,g.y-.14,g.z+.32);restWand();
  }
  function restWand(){stickPivot.rotation.set(0,0,-.32);stickPivot.updateMatrixWorld(true);const tipP=stick.localToWorld(tmpV.set(0,.35,0)).clone();wand.worldToLocal(tipP);lure.position.set(tipP.x+.02,.06,tipP.z);stringFrom(tipP);}
  function stringFrom(tip){const a=string.geometry.attributes.position;for(let k=0;k<12;k++){const f=k/11;a.setXYZ(k,THREE.MathUtils.lerp(tip.x,lure.position.x,f),THREE.MathUtils.lerp(tip.y,lure.position.y,f)-Math.sin(f*Math.PI)*.04,THREE.MathUtils.lerp(tip.z,lure.position.z,f));}a.needsUpdate=true;}
  function interact(id='jinbingbing',{point,camera,action}={}) {
    const r=records.get(id);if(!r)return null;
    if(id==='xiaohei'){
      if(action==='wand'){wandStart=time;r.mode='wand';r.modeStart=time;r.modeUntil=time+4.2;play(id,'Pounce');return{line:'XiaoHei, our oldest brother, still cannot resist a feather. Watch the paws.'};}
      play(id,'Groom');return{line:'XiaoHei, our oldest brother. A sleepy gentleman who still acts like a baby. Try the teaser wand beside him.'};
    }
    // JinBingBing: a touch on the head is a head rub; anywhere else sends her after a butterfly
    const headP=r.head?r.head.getWorldPosition(new THREE.Vector3()):null;
    if(point&&headP&&headP.distanceTo(new THREE.Vector3(...(point.toArray?point.toArray():point)))<.16){
      rubStart=time;r.mode='rub';r.modeStart=time;r.modeUntil=time+3.2;
      if(camera){const c=camera.toArray?camera:new THREE.Vector3(...camera);r.faceYaw=Math.atan2(c.x-r.group.position.x,c.z-r.group.position.z);}
      hearts.forEach((h,k)=>{h.visible=!reduced;h.userData.delay=k*.45;});
      return{line:'JinBingBing leans into your hand and rubs her cheek against it. You have been chosen.'};
    }
    if(!play(id,'Pounce'))return null;
    r.mode='chase';r.modeStart=time;r.modeUntil=time+6.5;butterflyUntil=r.modeUntil;butterfly.visible=!reduced;
    return{line:'JinBingBing is off after a butterfly. She never catches it, and she never stops trying.'};
  }
  // gentle additive poses on top of the clips, restored every frame so nothing accumulates
  function restore(r){for(const b of[r.head,r.neck,r.tail]){if(b?.userData.base){b.quaternion.copy(b.userData.base);b.scale.copy(b.userData.baseScale);}}}
  function remember(r){for(const b of[r.head,r.neck,r.tail]){if(!b)continue;b.userData.base=(b.userData.base||new THREE.Quaternion()).copy(b.quaternion);b.userData.baseScale=(b.userData.baseScale||new THREE.Vector3()).copy(b.scale);}}
  function turn(b,x,y,z){if(!b)return;tmpQ.setFromEuler(tmpE.set(x,y,z));b.quaternion.multiply(tmpQ);}
  function lookAtLocal(r,target,amount=1){if(!r.head)return;const hp=r.head.getWorldPosition(new THREE.Vector3()),d=target.clone().sub(hp);const yaw=Math.atan2(d.x,d.z)-r.group.rotation.y,pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));
    const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));turn(r.head,THREE.MathUtils.clamp(-pitch,-.6,.5)*.7*amount,THREE.MathUtils.clamp(wrap(yaw),-.9,.9)*.8*amount,0);}
  function update(dt,t) {
    time=t;
    for(const r of records.values()) {
      if(!r.group.visible)continue;
      restore(r);
      r.mixer.update(reduced&&r.active==='Idle'?0:dt);
      remember(r);
      if(r.id==='jinbingbing'){r.head?.scale.multiply(tmpV.set(1.07,1.0,1.05));r.tail?.scale.multiply(tmpV.set(1.3,1.0,1.3));}
      const k=time-r.modeStart,on=r.mode&&time<r.modeUntil;
      if(on&&r.mode==='wand'){lookAtLocal(r,lure.getWorldPosition(new THREE.Vector3()),1);if(k>1.6&&k<1.7&&r.active!=='Pounce')play(r.id,'Pounce');}
      if(on&&r.mode==='chase'){lookAtLocal(r,butterfly.position,1);const want=Math.atan2(butterfly.position.x-r.group.position.x,butterfly.position.z-r.group.position.z);if(!reduced)r.group.rotation.y+=Math.atan2(Math.sin(want-r.group.rotation.y),Math.cos(want-r.group.rotation.y))*Math.min(1,dt*2.2);
        if(Math.floor(k/2.1)!==Math.floor((k-dt)/2.1)&&r.active!=='Pounce')play(r.id,'Pounce');}
      if(on&&r.mode==='rub'){const e=Math.sin(Math.min(1,k/3.2)*Math.PI);if(r.faceYaw!=null&&!reduced)r.group.rotation.y+=Math.atan2(Math.sin(r.faceYaw-r.group.rotation.y),Math.cos(r.faceYaw-r.group.rotation.y))*Math.min(1,dt*3);
        turn(r.neck,-.18*e,0,0);turn(r.head,-.12*e+.06*Math.sin(k*5.5)*e,.18*Math.sin(k*3.1)*e,.38*Math.sin(k*3.1)*e);}
      if(r.mode&&time>=r.modeUntil)r.mode=null;
      for(const v of r.retiring)v.left-=dt;
      r.retiring=r.retiring.filter(v=>{if(v.left>0)return true;if(v.action!==r.actions.get(r.active))v.action.stop();return false;});
      if(r.until&&time>=r.until)idle(r);
    }
    const bing=records.get('jinbingbing');
    butterfly.visible=!reduced&&bing.group.visible&&time<butterflyUntil;
    if(butterfly.visible){
      const k=time-bing.modeStart,a=k*1.25,rad=.55+.12*Math.sin(k*.9),leave=Math.max(0,k-5.2);
      butterfly.position.set(bing.group.position.x+Math.cos(a)*rad,bing.group.position.y+.42+.16*Math.sin(k*2.3)+leave*leave*.9,bing.group.position.z+Math.sin(a)*rad);
      butterfly.rotation.y=-a;wings.forEach(w=>w.rotation.z=w.userData.side*(.25+Math.abs(Math.sin(time*14))*1.0));
    }
    // XiaoHei's wand swings its feathers in a figure eight while he plays
    const hei=records.get('xiaohei'),wk=time-wandStart;wand.visible=hei.group.visible;
    if(wand.visible&&wk<4.2&&!reduced){
      const lift=Math.min(1,wk/.5,(4.2-wk)/.5);stickPivot.rotation.set(-.55*lift,0,-.32*(1-lift)+.2*lift*Math.sin(wk*4));stickPivot.updateMatrixWorld(true);
      const tipW=stick.localToWorld(tmpV.set(0,.35,0)).clone(),tip=wand.worldToLocal(tipW.clone());
      const head=hei.group.position;const fx=head.x+.28*Math.sin(wk*3.6),fy=head.y+.2+.12*Math.sin(wk*7.2),fz=head.z+.32;
      lure.position.copy(wand.worldToLocal(new THREE.Vector3(fx,fy,fz)).lerp(lure.position,1-lift));lure.rotation.z=Math.sin(wk*9)*.5;stringFrom(tip);
    }else if(wk>=4.2&&wk<4.4){restWand();}
    // hearts drift up from JinBingBing's head during a rub
    const rk=time-rubStart;
    hearts.forEach((h,i)=>{const kk=rk-(h.userData.delay||0);h.visible=!reduced&&bing.group.visible&&kk>0&&kk<1.6;if(!h.visible)return;const hp=bing.head?bing.head.getWorldPosition(tmpV):bing.group.position;h.position.set(hp.x+(i-1.5)*.05+Math.sin(kk*3+i)*.02,hp.y+.1+kk*.22,hp.z);h.material.opacity=1-kk/1.6;h.scale.setScalar(.05+kk*.03);});
  }
  return {root,bingbing:records.get('jinbingbing').group,xiaohei:records.get('xiaohei').group,placeAtChapter,placeXiaoHei,interact,update,
    get animationStates(){return Object.fromEntries([...records].map(([id,r])=>[id,r.active]));},
    interactables:[...[...records.values()].map(r=>({id:r.id,type:'cat',catId:r.id,title:r.id==='xiaohei'?'XiaoHei · our oldest brother':'JinBingBing · a curious little guide',object:r.group})),
      {id:'xiaohei-teaser-wand',type:'cat',catId:'xiaohei',action:'wand',title:'A teaser wand',object:wand}],
    wand,
    diagnostics:{humanModels:0,assetURLs:urls,catScale:.50/.82,clips:Object.fromEntries([...records].map(([id,r])=>[id,[...r.actions.keys()]]))},
    dispose(){if(disposed)return;disposed=true;const geometries=new Set([wingGeometry,stringGeo]),materials=new Set([wingMaterial,string.material,...hearts.map(h=>h.material)]),textures=new Set([...clay.resources,wingTexture,heartTexture]);
      [wand,butterfly].forEach(g=>g.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}}));
      for(const r of records.values()){r.mixer.stopAllAction();r.mixer.uncacheRoot(r.model.scene);r.model.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);o.skeleton?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}}});}
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}
  };
}
