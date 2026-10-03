import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {worldAssetURL} from './fidelity-assets.js';
import {findBone,solveHandContact,createWritingBrush} from './fidelity-hand-contact.js';
import {createClayMaterialTreatment} from './fidelity-clay-materials.js';

/** Authored, connected and skinned volumes. No sprite/alpha cut-out body parts. */
async function createLegacyActors({quality='high'}={}){
  const root=new THREE.Group(),hanjing=new THREE.Group(),bingbing=new THREE.Group();
  root.name='Hanjing and JinBingBing';hanjing.name='Hanjing';bingbing.name='JinBingBing';root.add(hanjing,bingbing);
  const loader=new GLTFLoader(),low=quality==='low';
  const [day,cat]=await Promise.all([
    loader.loadAsync(worldAssetURL('assets/three/models/'+(low?'human-day-mobile.glb':'human-day-study.glb'))),
    loader.loadAsync(worldAssetURL('assets/three/cat-models/'+(low?'jinbingbing-seated-mobile.glb':'jinbingbing-seated-study.glb')))
  ]);
  function prepare(model){model.scene.traverse(o=>{if(o.isMesh){
    const materials=Array.isArray(o.material)?o.material:[o.material];
    o.castShadow=!o.userData.diffuse_emitter_exclude_self_shadow&&!materials.some(m=>m.userData.night_diffuse_lantern_part);
    o.receiveShadow=true;o.frustumCulled=false;
  }});}
  prepare(day);prepare(cat);hanjing.add(day.scene);bingbing.add(cat.scene);
  // Uniformly fit the old world: it changes stature without compressing face/body axes.
  hanjing.scale.setScalar(1.65/1.92);bingbing.scale.setScalar(.50/.82);
  const dayMixer=new THREE.AnimationMixer(day.scene),catMixer=new THREE.AnimationMixer(cat.scene);
  const dayActions=new Map(day.animations.map(c=>[c.name,dayMixer.clipAction(c)]));
  let activeMixer=dayMixer,activeActions=dayActions,activeClip='Idle',night=null,nightMixer=null,nightActions=null,nightPromise=null,interactionTime=0,heldAction=false,darkTheme=false,writingTip=null,contactDiagnostics=null;
  const brush=createWritingBrush();brush.root.visible=false;root.add(brush.root);
  function gaitSpeed(model){let speed=0;model.scene.traverse(o=>{
    const m=o.userData,stride=m.walk_stride_source_m??m.gaitStride?.cycleLength;
    const seconds=m.walk_cycle_seconds??m.gaitStride?.cycleSeconds;
    if(stride>0&&seconds>0)speed=stride*hanjing.scale.x/seconds;
  });if(!(speed>0))throw new Error('The walking model has no measured stride.');return speed;}
  const dayGaitSpeed=gaitSpeed(day);let nightGaitSpeed=0;
  dayActions.get('Idle')?.play();if(cat.animations[0])catMixer.clipAction(cat.animations[0]).play();
  const lanternLight=new THREE.PointLight('#ff9b45',0,2,2);root.add(lanternLight);
  async function ensureNight(){
    if(night)return night;if(nightPromise)return nightPromise;
    nightPromise=(async()=>{
      const [model,headModel]=await Promise.all([
        loader.loadAsync(worldAssetURL('assets/three/models/'+(low?'night-wardrobe-mobile.glb':'night-wardrobe-study.glb'))),
        loader.loadAsync(worldAssetURL('assets/three/models/'+(low?'human-night-head-mobile.glb':'human-night-head-study.glb')))
      ]);prepare(model);prepare(headModel);
      const bones=new Map();model.scene.traverse(o=>{if(o.isBone)bones.set(o.name,o);});
      // The night portrait and short updo are independently authored on the
      // same upper-body rest rig. Retain their original inverse bind matrices.
      const headMeshes=[];headModel.scene.traverse(o=>{if(o.isSkinnedMesh)headMeshes.push(o);});
      for(const original of headMeshes){const mesh=original.clone();
        const mapped=original.skeleton.bones.map(b=>bones.get(b.name));
        if(mapped.some(b=>!b))throw new Error('The night portrait and wardrobe rigs disagree.');
        mesh.skeleton=new THREE.Skeleton(mapped,original.skeleton.boneInverses.map(m=>m.clone()));
        mesh.bindMatrix.copy(original.bindMatrix);mesh.bindMatrixInverse.copy(original.bindMatrixInverse);model.scene.add(mesh);
      }
      night=model;hanjing.add(model.scene);nightMixer=new THREE.AnimationMixer(model.scene);
      nightActions=new Map(model.animations.map(c=>[c.name,nightMixer.clipAction(c)]));nightGaitSpeed=gaitSpeed(model);model.scene.visible=false;return model;
    })();return nightPromise;
  }
  function locomotion(moving,worldSpeed=0){
    if(interactionTime>0||heldAction)return;
    const name=moving?'Walk':'Idle';if(name!==activeClip){const old=activeActions.get(activeClip),next=activeActions.get(name);
      if(next){next.reset().setEffectiveWeight(1).play();if(old)old.crossFadeTo(next,.18,false);activeClip=name;}}
    // A planted foot travels backwards by the authored stride. Match that
    // distance to the root's real metres/second, including the uniform scale.
    if(moving)activeActions.get('Walk')?.setEffectiveTimeScale(worldSpeed/(darkTheme?nightGaitSpeed:dayGaitSpeed));
  }
  async function setTheme(dark){
    if(dark){await ensureNight();day.scene.visible=false;night.scene.visible=true;activeMixer=nightMixer;activeActions=nightActions;}
    else{day.scene.visible=true;if(night)night.scene.visible=false;activeMixer=dayMixer;activeActions=dayActions;}
    activeMixer.stopAllAction();activeClip='Idle';interactionTime=0;heldAction=false;darkTheme=!!dark;activeActions.get('Idle')?.reset().play();lanternLight.intensity=dark?.24:0;
  }
  function playAction(name,{hold=false}={}){const action=activeActions.get(name);if(!action)return 0;
    activeActions.get(activeClip)?.fadeOut(.18);action.reset().setEffectiveTimeScale(1).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.fadeIn(.18).play();activeClip=name;heldAction=hold;interactionTime=action.getClip().duration;return interactionTime;
  }
  function stopAction(){interactionTime=0;heldAction=false;locomotion(false,0);}
  function update(dt,time){activeMixer.update(dt);catMixer.update(dt);interactionTime=Math.max(0,interactionTime-dt);
    brush.root.visible=activeClip==='Write'&&!!writingTip;
    if(brush.root.visible){const model=darkTheme?night.scene:day.scene;
      let writingHand='Hand.L';model.traverse(o=>{if(o.userData.writing_hand_bone)writingHand=o.userData.writing_hand_bone;});
      const side=writingHand.split('.').at(-1),upper=findBone(model,'UpperArm.'+side),fore=findBone(model,'Forearm.'+side),hand=findBone(model,writingHand);
      const target=writingTip.clone().add(brush.gripOffset);
      const duration=activeActions.get('Write')?.getClip().duration||1.6,progress=1-interactionTime/duration,weight=THREE.MathUtils.smoothstep(progress,.24,.45);
      contactDiagnostics=solveHandContact(upper,fore,hand,target,weight);
      if(hand){const grip=hand.getWorldPosition(new THREE.Vector3());brush.root.position.copy(grip).sub(brush.gripOffset);}
    }
    if(night?.scene.visible){const socket=night.scene.getObjectByName('NightLanternLightSocket');
      if(socket){socket.getWorldPosition(lanternLight.position);return;}
      const hand=night.scene.getObjectByName('Hand_R')||night.scene.getObjectByName('Hand.R');
      const grip=hand||night.scene.getObjectByName('HandR');
      if(grip){grip.getWorldPosition(lanternLight.position);lanternLight.position.y-=.2;}}
  }
  return{root,hanjing,bingbing,locomotion,setTheme,update,ensureNight,playAction,stopAction,hasAction:name=>activeActions.has(name),setWritingTip:point=>{writingTip=point?.clone()||null;},
    get contactDiagnostics(){return contactDiagnostics;},
    get interacting(){return heldAction||interactionTime>0;},get activeClip(){return activeClip;},
    get gaitNominalSpeed(){return darkTheme?nightGaitSpeed:dayGaitSpeed;},
    diagnostics:{humanScale:1.65/1.92,catScale:.50/.82,catMotion:'Seated attentive idle; walking/pounce not yet authored'},
    dispose(){brush.dispose();for(const model of [day,cat,night])model?.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.clear();}};
}

const HUMAN_SCALE=1.65/1.92,CAT_SCALE=.50/.82,BLEND_SECONDS=.16;

function modelMetadata(model,key){
  let value=model?.scene.userData[key];
  if(value!==undefined)return value;
  model?.scene.traverse(o=>{if(value===undefined&&o.userData[key]!==undefined)value=o.userData[key];});
  return value;
}

function releaseModelResources(models,extraTextures=[]){
  const geometries=new Set(),materials=new Set(),textures=new Set(extraTextures),skeletons=new Set();
  for(const model of models)model.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);
    for(const material of Array.isArray(o.material)?o.material:[o.material]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}}});
  skeletons.forEach(s=>s.dispose());geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}

function motionController(model,scale,{requireStride=false}={}){
  const mixer=new THREE.AnimationMixer(model.scene);
  const actions=new Map(model.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  if(!actions.has('Idle')||!actions.has('Walk'))throw new Error('The approved animated model needs Idle and Walk clips.');
  const oldStride=modelMetadata(model,'gaitStride');
  const stride=Number(modelMetadata(model,'walk_stride_source_m')??oldStride?.cycleLength);
  const seconds=Number(modelMetadata(model,'walk_cycle_seconds')??oldStride?.cycleSeconds);
  const nominalSpeed=stride>0&&seconds>0?stride*scale/seconds:0;
  if(requireStride&&!(nominalSpeed>0))throw new Error('The walking model has no measured stride.');
  let activeClip='',interactionTime=0,heldAction=false;
  const retiring=new Map();
  function change(name,{once=false,hold=false,speed=1}={}){
    const next=actions.get(name);if(!next)return 0;
    const previous=actions.get(activeClip);retiring.delete(next);
    next.stopFading().reset().setEffectiveWeight(1).setEffectiveTimeScale(speed);
    next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.play();
    // Repeating a click must not make an action fade out against itself.
    if(previous&&previous!==next){previous.crossFadeTo(next,BLEND_SECONDS,false);retiring.set(previous,BLEND_SECONDS);}
    activeClip=name;heldAction=once&&hold;interactionTime=once?next.getClip().duration:0;return interactionTime;
  }
  change('Idle');
  function locomotion(moving,speed=0){
    if(heldAction||interactionTime>0)return;
    const name=moving?'Walk':'Idle';if(name!==activeClip)change(name);
    if(moving&&nominalSpeed>0)actions.get('Walk').setEffectiveTimeScale(Math.max(0,speed)/nominalSpeed);
  }
  function update(dt){
    mixer.update(dt);interactionTime=Math.max(0,interactionTime-dt);
    for(const[action,left]of retiring){const remaining=left-dt;
      if(remaining<=0){if(actions.get(activeClip)!==action)action.stop();retiring.delete(action);}else retiring.set(action,remaining);}
  }
  function reset(){mixer.stopAllAction();retiring.clear();interactionTime=0;heldAction=false;activeClip='';change('Idle');}
  return{model,mixer,actions,nominalSpeed,locomotion,update,reset,
    play(name,{hold=false}={}){return change(name,{once:true,hold});},
    stop(){interactionTime=0;heldAction=false;locomotion(false,0);},has:name=>actions.has(name),
    get activeClip(){return activeClip;},get interactionTime(){return interactionTime;},
    get interacting(){return heldAction||interactionTime>0;},
    get clipState(){const state={};for(const[name,action]of actions)state[name]={scheduled:action.isScheduled(),weight:action.isScheduled()?action.getEffectiveWeight():0};return state;},
    dispose(){mixer.stopAllAction();mixer.uncacheRoot(model.scene);retiring.clear();}};
}

function createReadingBook(){
  const root=new THREE.Group();root.name='Hand-supported stitched Chinese book';root.visible=false;
  const geometries=new Set(),materials=[];
  const material=(name,color,roughness)=>{
    const m=new THREE.MeshStandardMaterial({color,roughness,metalness:0,transparent:true});m.name=name;materials.push(m);return m;
  };
  const cloth=material('Indigo cloth book covers','#3d5163',.90),paper=material('Warm physical page block','#ecdfc4',.97),linen=material('Linen binding threads','#c3ae8b',.95);
  function box(name,size,position,mat){const g=new THREE.BoxGeometry(...size);geometries.add(g);const mesh=new THREE.Mesh(g,mat);mesh.name=name;mesh.position.fromArray(position);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
  const coverGeometry=new THREE.BoxGeometry(.288,.0032,.214);geometries.add(coverGeometry);
  const covers=new THREE.InstancedMesh(coverGeometry,cloth,2),matrix=new THREE.Matrix4();
  covers.name='Two closed cloth covers with physical thickness';covers.castShadow=true;covers.receiveShadow=true;
  covers.setMatrixAt(0,matrix.makeTranslation(0,.0106,0));covers.setMatrixAt(1,matrix.makeTranslation(0,-.0106,0));root.add(covers);
  box('Closed warm page block',[.274,.018,.204],[.002,0,0],paper);
  box('Cloth spine',[.010,.026,.214],[-.139,0,0],cloth);
  box('Recessed ivory title slip',[.045,.0012,.114],[.075,.0127,-.012],paper);
  const threadGeometry=new THREE.TorusGeometry(.009,.0012,5,12);geometries.add(threadGeometry);
  const threads=new THREE.InstancedMesh(threadGeometry,linen,5);threads.name='Five real linen binding loops';threads.castShadow=true;
  for(let i=0;i<5;i++){matrix.compose(new THREE.Vector3(-.136,0,-.075+i*.0375),new THREE.Quaternion(),new THREE.Vector3(1.1,1.55,1));threads.setMatrixAt(i,matrix);}root.add(threads);
  return{root,materials,opacity:0,setOpacity(value){this.opacity=value;root.visible=value>.001;materials.forEach(m=>m.opacity=value);root.traverse(o=>{if(o.isMesh)o.castShadow=value>.6;});},
    dispose(){root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();}};
}

/** The world selects the reviewed clay family from its promoted assets.
 * Standalone callers can still request the original complete fallback. */
export async function createFaithfulActors({quality='high',modelSet='legacy',assetsReady=false,modelURLs=null}={}){
  if(modelSet!=='stylized'||!assetsReady){
    const legacy=await createLegacyActors({quality});
    const xiaohei=new THREE.Group();xiaohei.name='XiaoHei';xiaohei.visible=false;legacy.root.add(xiaohei);
    Object.assign(legacy,{xiaohei,setCatFollowTarget(){},playCatAction:()=>0,triggerPounce:()=>0,onCatInteract:()=>0});
    legacy.getCatMotion=()=>legacy.catMotion;
    Object.defineProperty(legacy,'brushContact',{get:()=>legacy.contactDiagnostics});
    Object.defineProperty(legacy,'catMotion',{get:()=>({activeClip:'Idle',actualSpeed:0,nominalSpeed:0,following:false,interacting:false})});
    Object.assign(legacy.diagnostics,{requestedModelSet:modelSet,modelSet:'legacy',assetsReadyGuard:false});return legacy;
  }
  const root=new THREE.Group(),hanjing=new THREE.Group(),bingbing=new THREE.Group(),xiaohei=new THREE.Group();
  root.name='Hanjing, JinBingBing and XiaoHei';hanjing.name='Hanjing';bingbing.name='JinBingBing';xiaohei.name='XiaoHei';
  xiaohei.visible=false;root.add(hanjing,bingbing,xiaohei);
  hanjing.scale.setScalar(HUMAN_SCALE);bingbing.scale.setScalar(CAT_SCALE);xiaohei.scale.setScalar(CAT_SCALE);
  const loader=new GLTFLoader(),tier=quality==='low'?'low':'high';
  const assetURL=(key,stem)=>modelURLs?.[key]?
    new URL(modelURLs[key],typeof document==='undefined'?import.meta.url:document.baseURI).href:
    worldAssetURL(`assets/three/stylized-models/${stem}-${tier}.glb`);
  const urls={day:assetURL('day','hanjing-day'),night:assetURL('night','hanjing-night'),
    bingbing:assetURL('bingbing','jinbingbing'),xiaohei:assetURL('xiaohei','xiaohei')};
  const clay=createClayMaterialTreatment({quality});
  const loadedModels=new Set();let disposed=false;
  function prepare(model,kind='human'){loadedModels.add(model);clay.apply(model,{kind});model.scene.traverse(o=>{if(o.isMesh){
    const materials=Array.isArray(o.material)?o.material:[o.material];
    o.castShadow=!o.userData.diffuse_emitter_exclude_self_shadow&&!materials.some(m=>m.userData.night_diffuse_lantern_part);
    o.receiveShadow=true;o.frustumCulled=false;
  }});return model;}
  const [day,cat,blackCat]=await Promise.all([loader.loadAsync(urls.day).then(model=>prepare(model)),
    loader.loadAsync(urls.bingbing).then(model=>prepare(model,'cat')),loader.loadAsync(urls.xiaohei).then(model=>prepare(model,'cat'))]);
  hanjing.add(day.scene);bingbing.add(cat.scene);xiaohei.add(blackCat.scene);
  const dayController=motionController(day,HUMAN_SCALE,{requireStride:true});
  const catController=motionController(cat,CAT_SCALE,{requireStride:true}),blackController=motionController(blackCat,CAT_SCALE,{requireStride:true});
  const catControllers=new Map([['jinbingbing',catController],['xiaohei',blackController]]),catGroups=new Map([['jinbingbing',bingbing],['xiaohei',xiaohei]]);
  const swayAxisName=modelMetadata(cat,'tail_sway_local_axis')||'Z';
  const swayAxis=new THREE.Vector3(swayAxisName==='X'?1:0,swayAxisName==='Y'?1:0,swayAxisName==='Z'?1:0);
  const tailSway=[['Tail.01',.14,0],['Tail.05',.12,.65]].map(([name,amplitude,phase])=>({
    bone:findBone(cat.scene,name),amplitude,phase,clean:new THREE.Quaternion(),applied:false
  })).filter(record=>record.bone);
  const tailTurn=new THREE.Quaternion();let catElapsed=0;
  let active=dayController,night=null,nightController=null,nightPromise=null,darkTheme=false,themeVersion=0;
  const brush=createWritingBrush();brush.root.visible=false;root.add(brush.root);
  const readingBook=createReadingBook();root.add(readingBook.root);
  let writingTip=null,contactDiagnostics=null,bookContact=null;
  const lanternLight=new THREE.PointLight('#ff9b45',0,2,2);lanternLight.name='Night lantern warm local spill';lanternLight.castShadow=false;root.add(lanternLight);
  let lanternSocket=null,lanternFallbackHand=null,lanternHideClips=new Set(),lanternParts=[];
  async function ensureNight(){
    if(disposed)return null;if(night)return night;if(nightPromise)return nightPromise;
    nightPromise=(async()=>{
      // This model owns its complete face, clothing, skin and armature. Never
      // transplant a day head or another model's inverse bind matrices.
      const model=await loader.loadAsync(urls.night);
      // Navigation can dispose this scene while the lazy download is still
      // pending. Release the late model without attaching it or starting a rig.
      if(disposed){releaseModelResources([model]);return null;}
      prepare(model);
      nightController=motionController(model,HUMAN_SCALE,{requireStride:true});night=model;
      model.scene.visible=false;hanjing.add(model.scene);
      lanternSocket=model.scene.getObjectByName('NightLanternLightSocket');lanternFallbackHand=findBone(model.scene,'Hand.R');
      const hide=modelMetadata(model,'lantern_hide_during_actions');lanternHideClips=new Set(Array.isArray(hide)?hide:[]);
      model.scene.traverse(o=>{if(o.isMesh){const materials=Array.isArray(o.material)?o.material:[o.material];
        if(o.userData.night_lantern_part||o.userData.night_diffuse_lantern_part||materials.some(m=>m.userData.night_diffuse_lantern_part))lanternParts.push(o);}});return model;
    })().catch(error=>{nightPromise=null;throw error;});return nightPromise;
  }
  async function setTheme(dark){
    const version=++themeVersion;if(dark)await ensureNight();if(disposed||version!==themeVersion)return;
    day.scene.visible=!dark;if(night)night.scene.visible=!!dark;active=dark?nightController:dayController;
    active.reset();darkTheme=!!dark;brush.root.visible=false;lanternLight.intensity=dark?.24:0;
  }
  const locomotion=(moving,speed=0)=>active.locomotion(moving,speed);
  const playAction=(name,options)=>active.play(name,options),stopAction=()=>active.stop();

  const follow={enabled:false,point:new THREE.Vector3(),desired:new THREE.Vector3(),velocity:new THREE.Vector2(),
    moving:false,speed:0,heading:0,hasWalked:false,restPoint:null,groundAt:null,passable:null};
  const beforeCatPosition=new THREE.Vector3(),delta=new THREE.Vector2();let catActualSpeed=0,catFollowing=false;
  const catKey=id=>String(id||'jinbingbing').toLowerCase().replace(/[^a-z]/g,'');
  function desiredCatPosition(){
    if(follow.restPoint&&!follow.moving)follow.desired.copy(follow.restPoint);
    else if(follow.moving||follow.hasWalked)follow.desired.set(follow.point.x-Math.sin(follow.heading)*.72-.20,follow.point.y,follow.point.z-Math.cos(follow.heading)*.72+.32);
    else follow.desired.set(follow.point.x-.78,follow.point.y,follow.point.z+.28);
    if(follow.groundAt)follow.desired.y=follow.groundAt(follow.desired.x,follow.desired.z);
  }
  function setCatFollowTarget(point,{moving=false,speed=0,heading=0,restPoint=null,groundAt=null,passable=null,snap=false}={}){
    if(!point){follow.enabled=false;follow.velocity.set(0,0);catFollowing=false;catController.locomotion(false,0);return;}
    if(Array.isArray(point))follow.point.fromArray(point);else follow.point.copy(point);
    follow.enabled=true;follow.moving=!!moving;follow.speed=Math.max(0,speed||0);
    if(restPoint){if(!follow.restPoint)follow.restPoint=new THREE.Vector3();if(Array.isArray(restPoint))follow.restPoint.fromArray(restPoint);else follow.restPoint.copy(restPoint);}else follow.restPoint=null;
    // Stopping after a leftward walk must not send the companion across the
    // person just to reach a fixed left-side idle marker.
    if(moving){follow.heading=Number.isFinite(heading)?heading:follow.heading;follow.hasWalked=true;}
    if(snap){follow.heading=Number.isFinite(heading)?heading:0;follow.hasWalked=!!moving;}
    follow.groundAt=typeof groundAt==='function'?groundAt:null;follow.passable=typeof passable==='function'?passable:null;desiredCatPosition();
    if(snap){bingbing.position.copy(follow.desired);bingbing.rotation.y=follow.heading;follow.velocity.set(0,0);catActualSpeed=0;catController.reset();}
  }
  function updateCatFollow(dt){
    catActualSpeed=0;catFollowing=false;
    if(!follow.enabled||catController.interacting||!(dt>0))return;
    desiredCatPosition();beforeCatPosition.copy(bingbing.position);delta.set(follow.desired.x-bingbing.position.x,follow.desired.z-bingbing.position.z);
    const distance=delta.length(),maxSpeed=Math.max(.85,Math.min(1.6,follow.speed+.40)),wanted=distance>.09?Math.min(maxSpeed,distance*3.4):0;
    if(distance>1e-6)delta.multiplyScalar(wanted/distance);else delta.set(0,0);
    follow.velocity.x=THREE.MathUtils.damp(follow.velocity.x,delta.x,12,dt);follow.velocity.y=THREE.MathUtils.damp(follow.velocity.y,delta.y,12,dt);
    let dx=follow.velocity.x*dt,dz=follow.velocity.y*dt;
    if(Math.hypot(dx,dz)>distance&&distance>.001){dx=follow.desired.x-bingbing.position.x;dz=follow.desired.z-bingbing.position.z;}
    const allowed=follow.passable;
    if(!allowed||allowed(bingbing.position.x+dx,bingbing.position.z+dz)){bingbing.position.x+=dx;bingbing.position.z+=dz;}
    else{
      if(allowed(bingbing.position.x+dx,bingbing.position.z))bingbing.position.x+=dx;else follow.velocity.x=0;
      if(allowed(bingbing.position.x,bingbing.position.z+dz))bingbing.position.z+=dz;else follow.velocity.y=0;
    }
    bingbing.position.y=follow.groundAt?follow.groundAt(bingbing.position.x,bingbing.position.z):follow.point.y;
    const movedX=bingbing.position.x-beforeCatPosition.x,movedZ=bingbing.position.z-beforeCatPosition.z;
    catActualSpeed=Math.hypot(movedX,movedZ)/dt;catFollowing=catActualSpeed>.035;
    if(catFollowing){const facing=Math.atan2(movedX,movedZ),yaw=bingbing.rotation.y;bingbing.rotation.y=yaw+Math.atan2(Math.sin(facing-yaw),Math.cos(facing-yaw))*(1-Math.exp(-dt*14));}
    catController.locomotion(catFollowing,catActualSpeed);
  }
  function playCatAction(id,name,{hold=false,target=null}={}){
    const key=catKey(id),controller=catControllers.get(key),group=catGroups.get(key);if(!controller||!group||!controller.has(name))return 0;
    if(target){const point=Array.isArray(target)?new THREE.Vector3(...target):target,dx=point.x-group.position.x,dz=point.z-group.position.z;
      if(dx*dx+dz*dz>1e-6)group.rotation.y=Math.atan2(dx,dz);}
    if(key==='jinbingbing'){follow.velocity.set(0,0);catActualSpeed=0;catFollowing=false;}
    return controller.play(name,{hold});
  }
  const triggerPounce=target=>playCatAction('jinbingbing','Pounce',{target});
  const onCatInteract=(id='jinbingbing',options={})=>playCatAction(id,catKey(id)==='xiaohei'?'Groom':'Pounce',options);
  const targetHand=new THREE.Vector3(),grip=new THREE.Vector3(),lightWorld=new THREE.Vector3();
  const bookLeft=new THREE.Vector3(),bookRight=new THREE.Vector3(),bookX=new THREE.Vector3(),bookY=new THREE.Vector3(),bookZ=new THREE.Vector3(),bookUp=new THREE.Vector3(),bookForward=new THREE.Vector3(),bookCentre=new THREE.Vector3();
  const bookMatrix=new THREE.Matrix4(),bookQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
  function updateReadingBook(){
    const read=active.actions.get('Read');
    const elapsed=read?.time||0,attachAfter=Number(modelMetadata(active.model,'read_book_attach_after_seconds')??.45);
    const attach=THREE.MathUtils.smoothstep(elapsed,attachAfter,attachAfter+.22);
    const weight=read?.isScheduled()?read.getEffectiveWeight():0;
    // Leave before the hands return fully to another pose. Book and arm fades
    // use the same action weight rather than unrelated fixed timeout clocks.
    const opacity=attach*(active.activeClip==='Read'?weight:Math.max(0,(weight-.5)*2));
    const left=findBone(active.model.scene,'Hand.L'),right=findBone(active.model.scene,'Hand.R');
    if(opacity<=.001||!left||!right){readingBook.setOpacity(0);bookContact=null;return;}
    left.getWorldPosition(bookLeft);right.getWorldPosition(bookRight);
    bookX.copy(bookRight).sub(bookLeft);const span=bookX.length();if(span<1e-5){readingBook.setOpacity(0);bookContact=null;return;}bookX.multiplyScalar(1/span);
    hanjing.getWorldQuaternion(parentQ);bookUp.set(0,1,0).applyQuaternion(parentQ);bookForward.set(0,0,1).applyQuaternion(parentQ);
    bookY.copy(bookUp).addScaledVector(bookX,-bookUp.dot(bookX)).normalize();bookZ.crossVectors(bookX,bookY).normalize();
    if(bookZ.dot(bookForward)<0){bookX.negate();bookZ.negate();}
    // A slight natural reading tilt, with the two wrist supports defining the
    // long edge. Covers and pages remain a closed volume at every orientation.
    bookUp.copy(bookY);bookForward.copy(bookZ);
    bookY.copy(bookUp).multiplyScalar(Math.cos(.50)).addScaledVector(bookForward,Math.sin(.50));
    bookZ.copy(bookForward).multiplyScalar(Math.cos(.50)).addScaledVector(bookUp,-Math.sin(.50));
    bookCentre.copy(bookLeft).add(bookRight).multiplyScalar(.5).addScaledVector(bookY,.016).addScaledVector(bookZ,.010);
    readingBook.root.position.copy(root.worldToLocal(bookCentre));
    bookMatrix.makeBasis(bookX,bookY,bookZ);bookQ.setFromRotationMatrix(bookMatrix);
    root.getWorldQuaternion(parentQ);readingBook.root.quaternion.copy(parentQ.invert().multiply(bookQ));
    const width=THREE.MathUtils.clamp(span+.018,.232,.35);readingBook.root.scale.set(width/.288,1,1);
    readingBook.setOpacity(opacity);
    bookCentre.set(0,-.0122,0);readingBook.root.localToWorld(bookCentre);
    const leftError=Math.abs(grip.copy(bookLeft).sub(bookCentre).dot(bookY)),rightError=Math.abs(grip.copy(bookRight).sub(bookCentre).dot(bookY));
    bookContact={handSpan:span,bookWidth:width,supportPlaneError:Math.max(leftError,rightError),
      projectedWristOverhang:Math.max(0,(span-width)*.5),opacity,
      scope:'Both wrist supports against the real lower cover plane; visible palm contact still needs the actual model view.'};
  }
  function update(dt,time){
    if(disposed)return;const step=Math.max(0,Number.isFinite(dt)?dt:0);
    active.update(step);updateCatFollow(step);
    // Remove last frame's additive tail turn before the mixer writes its
    // authored pose. This cannot accumulate if a clip omits tail channels.
    tailSway.forEach(record=>{if(record.applied){record.bone.quaternion.copy(record.clean);record.applied=false;}});
    catController.update(step);
    if(!catController.interacting&&!catFollowing)catController.locomotion(false,0);
    catElapsed=Number.isFinite(time)?time:catElapsed+step;
    if(catFollowing&&catController.activeClip==='Walk')tailSway.forEach(record=>{
      record.clean.copy(record.bone.quaternion);
      const strength=THREE.MathUtils.clamp(catActualSpeed/.35,0,1);
      tailTurn.setFromAxisAngle(swayAxis,record.amplitude*strength*Math.sin(catElapsed*Math.PI*2*.9+record.phase));
      record.bone.quaternion.multiply(tailTurn);record.applied=true;
    });
    blackController.update(step);if(!blackController.interacting)blackController.locomotion(false,0);
    updateReadingBook();
    brush.root.visible=active.activeClip==='Write'&&!!writingTip;
    if(brush.root.visible){
      const model=active.model.scene,writingHand=String(modelMetadata(active.model,'writing_hand_bone')||'Hand.L'),side=writingHand.slice(-1).toUpperCase();
      const upper=findBone(model,'UpperArm.'+side),fore=findBone(model,'Forearm.'+side),hand=findBone(model,writingHand);
      targetHand.copy(writingTip).add(brush.gripOffset);
      const duration=active.actions.get('Write')?.getClip().duration||1.6,progress=1-active.interactionTime/duration;
      contactDiagnostics=solveHandContact(upper,fore,hand,targetHand,THREE.MathUtils.smoothstep(progress,.24,.45));
      if(hand){hand.getWorldPosition(grip);brush.root.position.copy(root.worldToLocal(grip)).sub(brush.gripOffset);}
    }else contactDiagnostics=null;
    const lanternShown=darkTheme&&!lanternHideClips.has(active.activeClip);lanternParts.forEach(part=>part.visible=lanternShown);lanternLight.intensity=lanternShown?.24:0;
    if(lanternShown){const socket=lanternSocket||lanternFallbackHand;if(socket){socket.getWorldPosition(lightWorld);if(!lanternSocket)lightWorld.y-=.2;lanternLight.position.copy(root.worldToLocal(lightWorld));}}
  }
  function dispose(){
    if(disposed)return;disposed=true;themeVersion++;brush.dispose();readingBook.dispose();dayController.dispose();nightController?.dispose();catController.dispose();blackController.dispose();
    releaseModelResources(loadedModels,clay.resources);loadedModels.clear();root.clear();
  }
  return{root,hanjing,bingbing,xiaohei,locomotion,setTheme,update,ensureNight,playAction,stopAction,
    hasAction:name=>active.has(name),setWritingTip:point=>{if(point){if(!writingTip)writingTip=new THREE.Vector3();writingTip.copy(point);}else writingTip=null;},
    setCatFollowTarget,playCatAction,triggerPounce,onCatInteract,
    getCatMotion:id=>{const key=catKey(id),controller=catControllers.get(key);return controller?{activeClip:controller.activeClip,nominalSpeed:controller.nominalSpeed,interacting:controller.interacting,clipState:controller.clipState}:null;},
    get contactDiagnostics(){return contactDiagnostics;},get brushContact(){return contactDiagnostics;},
    get bookContact(){return bookContact;},
    get animationState(){return{human:active.clipState,jinbingbing:catController.clipState,xiaohei:blackController.clipState};},
    get interacting(){return active.interacting;},get activeClip(){return active.activeClip;},get gaitNominalSpeed(){return active.nominalSpeed;},
    get catMotion(){return{activeClip:catController.activeClip,actualSpeed:catActualSpeed,nominalSpeed:catController.nominalSpeed,following:catFollowing,interacting:catController.interacting};},
    diagnostics:{humanScale:HUMAN_SCALE,catScale:CAT_SCALE,requestedModelSet:modelSet,modelSet:'stylized',assetsReadyGuard:true,assetURLs:urls,
      get clayFinish(){return clay.diagnostics;},
      catMotion:'Measured-stride four-foot follower, seated idle, pounce and grooming clips',nightRig:'Independent complete night model and armature'},dispose};
}
