import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFaithfulWorldScene} from './fidelity-worldscene.js';
import {createFaithfulActors} from './fidelity-actors.js';
import {createFaithfulSky} from './fidelity-sky.js';
import {applyWorldPalette,WORLD_SCENE_COLOURS} from './fidelity-world-palette.js';
import {createDisplayAntialias} from './fidelity-antialias.js';
import {createContent} from './content.js';
import {createAudio} from './audio.js';

const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const canvas=$('#world-canvas'),container=$('#world'),audio=createAudio();
$('#recover-btn').onclick=()=>location.reload();
const low=matchMedia('(max-width:700px)').matches,quality=low?'low':'high';
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const state={x:0,y:0,z:1.5,dark:document.documentElement.dataset.theme==='dark',time:0,near:'home',velocity:new THREE.Vector2(),destination:null,queue:[],overlay:null,yaw:.04,pitch:.10,distance:low?18:17,themeBusy:false,pose:null};
const keys=new Set(),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
let renderer,scene,camera,garden,actors,river,sky,content,key,hemi,environmentMap,last=0,raf=0,stopped=false,drag=null,pending=null,actionUntil=0,themeBlend=state.dark?1:0;
let residencyDirty=false,environmentPalette=null,displayAntialias=null;
const trackedDraws=new WeakSet(),drawnGeometries=new Set(),drawnTextures=new Set();
const target=new THREE.Vector3(0,1,-1),speechPoint=new THREE.Vector3();
const subtitles={home:'Research, stories, and six cats.',research:'Five threads of work. One library.',talks:'Ideas shared, and conversations continued.',education:'A few places that made me, me.',writing:'Notes, tutorials, and a little ink.',life:'Off the clock. Welcome home.',contact:'A letter is a lovely place to begin.'};
const rituals={home:'Wave',research:'Read',talks:'Talk',education:'Cap',writing:'Write',life:'Pet',contact:'Mail'};
function station(id=state.near){return garden.stations.find(s=>s.id===id);}
function say(text){$('#speech').textContent=text;$('#speech').hidden=false;actionUntil=state.time+5;}
function setOverlay(value){state.overlay=value;keys.clear();state.velocity.set(0,0);}
function selectChapter(id){state.near=id;garden.setActive(id);residencyDirty=true;$('#chapter-title').textContent=station(id).label;$('#chapter-sub').textContent=subtitles[id];$('#prompt-label').textContent='Explore '+station(id).label;$$('[data-go]').forEach(b=>{b.classList.toggle('is-here',b.dataset.go===id);b.setAttribute('aria-current',String(b.dataset.go===id));});}
function stopWalking(){state.destination=null;state.queue=[];state.velocity.set(0,0);pending=null;keys.clear();}
function leavePose(){if(state.pose?.name==='Write')station('writing').root.userData.setWritingActive?.(false);state.pose=null;actors.stopAction();}
async function setTheme(dark){
  if(state.themeBusy)return;state.themeBusy=true;$('#theme-btn').disabled=true;
  const previous=state.pose?{...state.pose,point:[state.x,state.y,state.z],facing:actors.hanjing.rotation.y}:null;
  try{leavePose();stopWalking();if(previous){const s=station(previous.id);[state.x,state.y,state.z]=s.stand;actors.hanjing.position.set(state.x,state.y,state.z);actors.hanjing.rotation.y=0;}await actors.setTheme(!!dark);state.dark=!!dark;themeBlend=state.dark?1:0;garden.setTheme(state.dark);river?.setTheme(state.dark);sky?.setTheme(state.dark);environmentPalette=applyWorldPalette(scene,state.dark);lighting(0);document.documentElement.dataset.theme=state.dark?'dark':'light';try{localStorage.setItem('hj-theme',state.dark?'dark':'light');}catch{}
    if(previous?.held&&actors.hasAction(previous.name))perform(previous.name,previous.id,true,{point:previous.point,facing:previous.facing});
    else if(previous){const s=station(previous.id);[state.x,state.y,state.z]=s.stand;actors.hanjing.position.set(state.x,state.y,state.z);actors.hanjing.rotation.y=0;}
    residencyDirty=true;$('#theme-btn').setAttribute('aria-pressed',String(state.dark));$('#theme-btn').setAttribute('aria-label',state.dark?'Switch to daytime':'Switch to night');audio.play('bell');
  }catch(error){say('The night wardrobe could not load. Please try again.');console.error(error);}
  finally{state.themeBusy=false;$('#theme-btn').disabled=false;}
}
function go(id,opts={}){
  const s=station(id);if(!s)return;leavePose();stopWalking();content.closePanel();if(!opts.fromChat)content.expandGuide(false);
  $('#speech').hidden=true;
  // Bookmarks bring visitors to a courtyard. Walking inside it remains continuous.
  [state.x,state.y,state.z]=s.stand;actors.hanjing.position.set(state.x,state.y,state.z);actors.hanjing.rotation.y=0;
  actors.bingbing.position.set(state.x-.83,garden.floorAt(state.x-.83,state.z+.2),state.z+.2);selectChapter(id);target.set(state.x,id==='research'?1.35:1,-1);
  actors.setCatFollowTarget(actors.hanjing.position,{snap:true,groundAt:garden.floorAt,passable:garden.passable});
  residencyDirty=true;
  history.replaceState(null,'',location.pathname+'#'+id);content.greet(id);if(opts.open||opts.focus)content.openPanel(id,opts.focus,opts.fromChat);
}
function perform(name,id=state.near,immediate=false,poseOverride=null){
  name=({ink:'Write',write:'Write',wave:'Wave',bow:'Bow',read:'Read',mail:'Mail',cap:'Cap',pet:'Pet',jump:'Cap',simmer:'Food',projector:'Travel'})[name]||name;
  const s=station(id);if(name==='night'||name==='day')return setTheme(name==='night');
  if(name==='Food'){station('life').root.userData.setCooking?.(true);audio.play('wood');return;}
  const pose=poseOverride||s.actionStand[name.toLowerCase()];
  if(pose&&!actors.hasAction(name)){content.openPanel(id);return;}
  if(pose&&!immediate){leavePose();stopWalking();state.queue=[...(pose.approach||[]),pose.point].map(p=>new THREE.Vector3(...p));state.destination=state.queue.shift();pending={name,id,pose};return;}
  if(state.pose&&state.pose.name!==name)leavePose();
  stopWalking();if(pose){[state.x,state.y,state.z]=pose.point;actors.hanjing.rotation.y=pose.facing||0;}
  const duration=actors.playAction(name,{hold:name==='Read'||name==='Write'});
  if(duration){state.pose={name,id,until:state.time+duration,held:name==='Read'||name==='Write',floor:state.y};}
  if(name==='Write'&&duration)s.root.userData.setWritingActive?.(true);
  if(name==='Mail')s.source.setMailProgress?.(0);
  audio.play('wood');
}
function interact(item){
  item.onInteract?.();const id=item.station||state.near;
  if(item.type==='river'){river?.stir?.(item.point,state.time);return;}
  if(item.type==='lotus'){river?.stir?.(item.point,state.time);return;}
  if(item.type==='tree'){river?.breeze?.(item.point,state.time);return;}
  if(item.type==='celestial'){setTheme(!state.dark);return;}
  if(item.type==='book'){perform('Read',id,false,{...station(id).actionStand.read,point:item.stand,approach:item.approach,contactPoint:item.contactPoint});content.openPanel(id,item.focus);return;}
  if(item.type==='talk'){content.openTheater(0);return;}
  if(item.type==='screen'||item.type==='crane'||item.type==='star')return;
  if(item.type==='write'||item.type==='ink'){perform('Write','writing');return;}
  if(item.type==='mail'){perform('Mail','contact');content.openPanel('contact');return;}
  if(item.type==='human'){perform('Wave');return;}
  if(item.type==='cat'){audio.play('cat');const acted=actors.onCatInteract(item.catId||'jinbingbing');
    if(!acted)content.openCat(window.HJ_DATA.life.find(l=>l.id==='cats')?.cats?.length-1||5);return;}
  if(item.type==='pet'){audio.play('cat');if(!actors.onCatInteract('xiaohei'))content.openPanel('life',item.focus);return;}
  if(item.url||item.href){window.open(item.url||item.href,'_blank','noopener');return;}
  content.openPanel(id,item.focus);
}
function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?1.15:1.75));renderer.setSize(w,h,false);displayAntialias?.resize();camera.aspect=w/h;camera.updateProjectionMatrix();}
function pick(x,y){const rect=canvas.getBoundingClientRect();ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(ndc,camera);let best=null,distance=Infinity;
  const all=[...garden.interactables,{object:actors.hanjing,type:'human',title:'Say hello'},{object:actors.bingbing,type:'cat',catId:'jinbingbing',title:'JinBingBing'},
    ...(actors.xiaohei.visible?[{object:actors.xiaohei,type:'cat',catId:'xiaohei',title:'XiaoHei'}]:[]),...(river?.interactables||[]),...(sky?.interactables||[])];
  for(const item of all){if(item.station&&!station(item.station).root.visible)continue;const hit=ray.intersectObject(item.object,true)[0];if(hit&&hit.distance<distance){best={...item,point:hit.point};distance=hit.distance;}}
  ray.ray.intersectPlane(plane,point);return best;
}
function walkTo(p){leavePose();stopWalking();state.destination=new THREE.Vector3(THREE.MathUtils.clamp(p.x,-8,82),0,THREE.MathUtils.clamp(p.z,-4.2,3.1));}
function move(dt){let vx=0,vz=0;
  if(!state.overlay){vx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);vz=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);}
  if(vx||vz){leavePose();state.destination=null;state.queue=[];pending=null;}
  else if(state.destination){const dx=state.destination.x-state.x,dz=state.destination.z-state.z,dist=Math.hypot(dx,dz);
    if(dist<.08){state.x=state.destination.x;state.z=state.destination.z;state.y=garden.floorAt(state.x,state.z);state.destination=state.queue.shift()||null;if(!state.destination&&pending){const p=pending;pending=null;perform(p.name,p.id,true,p.pose);}}
    else{vx=dx/dist;vz=dz/dist;}}
  if(state.pose){vx=0;vz=0;state.velocity.set(0,0);if(!state.pose.held&&state.time>=state.pose.until)state.pose=null;}
  const length=Math.hypot(vx,vz)||1,speed=state.dark?.90:1.10;
  state.velocity.x=THREE.MathUtils.damp(state.velocity.x,vx/length*speed,12,dt);state.velocity.y=THREE.MathUtils.damp(state.velocity.y,vz/length*speed,12,dt);
  const nx=state.x+state.velocity.x*dt,nz=state.z+state.velocity.y*dt;
  if(garden.passable(nx,state.z))state.x=nx;else state.velocity.x=0;
  if(garden.passable(state.x,nz))state.z=nz;else state.velocity.y=0;
  const moving=state.velocity.length()>.06;
  state.y=state.pose?state.pose.floor:THREE.MathUtils.damp(state.y,garden.floorAt(state.x,state.z),22,dt);actors.hanjing.position.set(state.x,state.y,state.z);
  const facing=moving?Math.atan2(state.velocity.x,state.velocity.y):0,yaw=actors.hanjing.rotation.y;
  if(moving)actors.hanjing.rotation.y=yaw+Math.atan2(Math.sin(facing-yaw),Math.cos(facing-yaw))*(1-Math.exp(-dt*12));
  actors.locomotion(moving,state.velocity.length());
  garden.update(state.time,dt,state.dark);
  const writing=station('writing'),tip=state.pose?.name==='Write'?writing.root.userData.getWritingTip?.():null;
  const brushTip=tip?writing.root.localToWorld(new THREE.Vector3(...tip.position)):null;
  if(brushTip&&!tip.active)brushTip.y+=.025;
  actors.setWritingTip(brushTip);
  const writingStation=state.pose?.name==='Write'?station('writing'):null,cushion=writingStation?.root.userData.cushion;
  // Wait on the stone beside the writing pad. Its soft surface is not a
  // walkable floor for a follower without individual paw contact solving.
  const catRest=cushion?writingStation.worldPoint([cushion.centre[0]-cushion.radius-.38,0,cushion.centre[2]+.42]):null;
  actors.setCatFollowTarget(actors.hanjing.position,{moving,speed:state.velocity.length(),heading:actors.hanjing.rotation.y,restPoint:catRest,groundAt:garden.floorAt,passable:garden.passable});
  if(actors.diagnostics.modelSet==='stylized')actors.xiaohei.visible=station('life').root.visible;
  actors.update(dt,state.time);river?.update(dt,state.time,state.dark,state.x);sky?.update(dt,state.time,state.x);
  const near=garden.stations.reduce((a,b)=>Math.abs(a.x-state.x)<Math.abs(b.x-state.x)?a:b);if(near.id!==state.near)selectChapter(near.id);
}
function lighting(dt){themeBlend=THREE.MathUtils.damp(themeBlend,state.dark?1:0,5,dt);const t=themeBlend;
  scene.background.set(WORLD_SCENE_COLOURS.day.sky).lerp(new THREE.Color(WORLD_SCENE_COLOURS.night.sky),t);
  scene.fog.color.set(WORLD_SCENE_COLOURS.day.fog).lerp(new THREE.Color(WORLD_SCENE_COLOURS.night.fog),t);
  key.intensity=THREE.MathUtils.lerp(1.18,.35,t);key.color.set('#fff1dc').lerp(new THREE.Color('#c0d1e5'),t);
  hemi.intensity=THREE.MathUtils.lerp(1.4,.60,t);hemi.color.set('#edf5f0').lerp(new THREE.Color('#a5bdd2'),t);hemi.groundColor.set('#b6c398').lerp(new THREE.Color('#293a39'),t);
  scene.environmentIntensity=THREE.MathUtils.lerp(.46,.23,t);
  // The visible orb and the directional shadow source share one direction.
  key.position.set(state.x+6.5,6.65,-24);key.target.position.set(state.x,0,0);key.target.updateMatrixWorld();
}
function residentTextureMemory(){
  const textures=new Map(),remember=t=>{if(t?.isTexture)textures.set(t.uuid,t);};remember(environmentMap);remember(displayAntialias?.texture);
  scene.traverse(o=>{remember(o.skeleton?.boneTexture);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const value of Object.values(m))remember(value);for(const value of Object.values(m.userData||{})){remember(value);if(Array.isArray(value))value.forEach(remember);}for(const u of Object.values(m.uniforms||{})){remember(u.value);if(Array.isArray(u.value))u.value.forEach(remember);}}});
  remember(key.shadow.map?.texture);let bytes=0;const detail=[],resident=new Set();
  for(const t of textures.values()){const gpu=renderer.properties.get(t).__webglTexture;if(!gpu||resident.has(gpu))continue;resident.add(gpu);
    const image=Array.isArray(t.image)?t.image[0]:t.image,w=image?.width||0,h=image?.height||0,component=t.type===THREE.FloatType?4:t.type===THREE.HalfFloatType?2:1;
    const mipFactor=t.generateMipmaps?4/3:1,b=w*h*4*component*mipFactor*(t.isCubeTexture?6:1);bytes+=b;detail.push({name:t.name,width:w,height:h,estimatedBytes:Math.ceil(b)});
  }
  return{count:resident.size,estimatedRGBAAndMipsMiB:Math.round(bytes/1048576*10)/10,detail,scope:'Resident scene/material/bone/environment textures; excludes driver overhead and unused render targets.'};
}
function rememberTexture(value,set){if(value?.isTexture)set.add(value);}
function materialMaps(material,set,includeRetained=false){
  for(const value of Object.values(material))rememberTexture(value,set);
  for(const u of Object.values(material.uniforms||{})){rememberTexture(u.value,set);if(Array.isArray(u.value))u.value.forEach(v=>rememberTexture(v,set));}
  if(includeRetained)for(const value of Object.values(material.userData||{})){rememberTexture(value,set);if(Array.isArray(value))value.forEach(v=>rememberTexture(v,set));}
}
function trackCurrentDraws(){
  drawnGeometries.clear();drawnTextures.clear();
  scene.traverse(object=>{
    if(!object.geometry||!object.material)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    // Raycaster still reads these explicit pick volumes; they need no GPU buffers.
    if(materials.every(m=>m.visible===false)){object.visible=false;return;}
    if(trackedDraws.has(object))return;
    trackedDraws.add(object);
    const before=object.onBeforeRender,beforeShadow=object.onBeforeShadow;
    const record=material=>{if(!residencyDirty)return;drawnGeometries.add(object.geometry);for(const m of material?(Array.isArray(material)?material:[material]):[])materialMaps(m,drawnTextures);rememberTexture(object.skeleton?.boneTexture,drawnTextures);};
    object.onBeforeRender=function(...args){before?.apply(this,args);record(args[4]||this.material);};
    object.onBeforeShadow=function(...args){beforeShadow?.apply(this,args);record(this.material);record(this.customDepthMaterial);record(this.customDistanceMaterial);};
  });
}
function compactInactiveGPU(){
  // Retain authored CPU data for a return visit; release only GPU copies
  // unused by the current colour/shadow draws. Shared drawn maps stay live.
  const allTextures=new Set(),liveTextures=new Set(drawnTextures),allGeometry=new Set();
  function visit(object,parentVisible){
    const visible=parentVisible&&object.visible;
    const materials=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];
    if(object.geometry)allGeometry.add(object.geometry);
    for(const m of materials)materialMaps(m,allTextures,true);
    for(const m of [object.customDepthMaterial,object.customDistanceMaterial])if(m)materialMaps(m,allTextures,true);
    rememberTexture(object.skeleton?.boneTexture,allTextures);if(visible)rememberTexture(object.skeleton?.boneTexture,liveTextures);
    for(const child of object.children)visit(child,visible);
  }
  visit(scene,true);rememberTexture(environmentMap,liveTextures);rememberTexture(key.shadow.map?.texture,liveTextures);
  for(const texture of allTextures)if(!liveTextures.has(texture)&&renderer.properties.get(texture).__webglTexture)texture.dispose();
  for(const geometry of allGeometry)if(!drawnGeometries.has(geometry))geometry.dispose();
}
function frame(now){if(stopped||document.hidden)return;const dt=Math.min(.1,last?(now-last)/1000:1/60);last=now;state.time+=dt;move(dt);lighting(dt);
  const desired=new THREE.Vector3(state.x,state.near==='research'?1.35:1,-.7);target.lerp(desired,1-Math.exp(-dt*7));
  const distance=state.distance;camera.position.copy(target).add(new THREE.Vector3(Math.sin(state.yaw)*Math.cos(state.pitch)*distance,Math.sin(state.pitch)*distance,Math.cos(state.yaw)*Math.cos(state.pitch)*distance));camera.lookAt(target);
  if(residencyDirty)trackCurrentDraws();
  renderer.info.reset();renderer.render(scene,camera);displayAntialias?.render();
  if(residencyDirty){compactInactiveGPU();residencyDirty=false;}
  if(!$('#speech').hidden){speechPoint.copy(actors.hanjing.position).add(new THREE.Vector3(0,1.85,0)).project(camera);$('#speech').style.left=(speechPoint.x*.5+.5)*canvas.clientWidth+'px';$('#speech').style.top=(-speechPoint.y*.5+.5)*canvas.clientHeight+'px';if(state.time>actionUntil)$('#speech').hidden=true;}
  raf=requestAnimationFrame(frame);
}
function bind(){
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));$('#world-prompt').onclick=()=>{perform(rituals[state.near]);content.openPanel(state.near);};$('#theme-btn').onclick=()=>setTheme(!state.dark);
  const zoom=factor=>{state.distance=THREE.MathUtils.clamp(state.distance*factor,4,24);};
  $('#view-btn').onclick=()=>{state.yaw=.04;state.pitch=.10;state.distance=low?18:17;};$('#sound-btn').onclick=()=>{const on=audio.toggle();$('#sound-btn').setAttribute('aria-pressed',String(on));};
  $('#zoom-in-btn').onclick=()=>zoom(.84);$('#zoom-out-btn').onclick=()=>zoom(1/.84);
  canvas.addEventListener('wheel',e=>{if(state.overlay)return;e.preventDefault();zoom(Math.exp(THREE.MathUtils.clamp(e.deltaY,-100,100)*.002));},{passive:false});
  $('#help-btn').onclick=()=>say('Arrow keys or WASD to walk. Drag to look around. Scroll or use + / − to move closer. Click an object to explore.');$('#recover-btn').onclick=()=>location.reload();
  $('#places-btn').onclick=()=>{const expanded=$('#places-btn').getAttribute('aria-expanded')==='true';$('#places-btn').setAttribute('aria-expanded',String(!expanded));$('#places').classList.toggle('is-open',!expanded);};
  addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(e.key)){e.preventDefault();keys.add(e.key);canvas.focus();}if(e.key==='e'||e.key==='Enter')$('#world-prompt').click();});addEventListener('keyup',e=>keys.delete(e.key));addEventListener('blur',()=>keys.clear());
  $$('[data-walk]').forEach(b=>{const k=+b.dataset.walk<0?'ArrowLeft':'ArrowRight';b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k);};b.onpointerup=b.onpointercancel=()=>keys.delete(k);});
  canvas.onpointerdown=e=>{if(state.overlay)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};};
  canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved||=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7;if(drag.moved){const yaw=state.yaw-dx*.0025;state.yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));state.pitch=THREE.MathUtils.clamp(state.pitch+dy*.002,.06,.65);}drag.x=e.clientX;drag.y=e.clientY;};
  canvas.onpointerup=e=>{if(!drag)return;const click=!drag.moved;drag=null;if(click){const item=pick(e.clientX,e.clientY);if(item)interact(item);else walkTo(point);}};canvas.onpointercancel=()=>drag=null;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stopped=true;cancelAnimationFrame(raf);$('#world-error').hidden=false;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);last=0;keys.clear();}else if(!stopped){last=0;raf=requestAnimationFrame(frame);}});addEventListener('resize',resize);
  addEventListener('pagehide',e=>{if(!e.persisted)displayAntialias?.dispose();});
}
async function init(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'default'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  renderer.info.autoReset=false;if(!low)displayAntialias=createDisplayAntialias(renderer);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene=new THREE.Scene();scene.background=new THREE.Color(WORLD_SCENE_COLOURS.day.sky);scene.fog=new THREE.Fog(WORLD_SCENE_COLOURS.day.fog,35,100);camera=new THREE.PerspectiveCamera(35,1,.1,160);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environmentMap=pmrem.fromScene(room,.04,.1,100,{size:low?64:128}).texture;scene.environment=environmentMap;pmrem.dispose();room.dispose();
  key=new THREE.DirectionalLight('#fff1dc',1.1);key.castShadow=true;key.shadow.mapSize.set(low?512:1024,low?512:1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:8,bottom:-5,near:.1,far:50});key.shadow.normalBias=.012;key.shadow.bias=-.00005;hemi=new THREE.HemisphereLight('#e8eee4','#b1a387',1.3);scene.add(key,key.target,hemi);
  // The single public 3D entry loads the reviewed clay family. The legacy
  // model switch is retained only for explicit development comparisons.
  const stylized=new URLSearchParams(location.search).get('models')!=='legacy';
  [garden,actors]=await Promise.all([createFaithfulWorldScene({data:window.HJ_DATA,quality}),createFaithfulActors({quality,modelSet:stylized?'stylized':'legacy',assetsReady:stylized})]);scene.add(garden.root,actors.root);
  if(stylized){const life=station('life'),seat=life.root.userData.catSeat;actors.xiaohei.position.fromArray(life.worldPoint(seat.position));actors.xiaohei.visible=life.root.visible;}
  const module=await import('./fidelity-riverside.js');river=await module.createFaithfulRiverside({quality});scene.add(river.root);
  sky=await createFaithfulSky({quality});scene.add(sky.root);
  content=createContent({go,action:perform,say,talk(){},setOverlay,theater(){}});content.expandGuide(false);garden.setTheme(state.dark);if(state.dark)await actors.setTheme(true);river.setTheme(state.dark);
  sky.setTheme(state.dark);environmentPalette=applyWorldPalette(scene,state.dark);bind();resize();$('#loading').hidden=true;go(garden.stations.some(s=>s.id===location.hash.slice(1))?location.hash.slice(1):'home');requestAnimationFrame(frame);
  window.__HANJING_3D__={state,go,perform,setTheme,renderer,scene,camera,garden,actors,textureMemory:residentTextureMemory,get antialias(){return displayAntialias?.diagnostics||{mode:'none',msaa:false};},get environmentPalette(){return environmentPalette;},metrics:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,quality}),getInteractionTargets(){scene.updateMatrixWorld(true);return garden.interactables.map(i=>{const p=new THREE.Vector3(...i.point).project(camera);return{id:i.id,type:i.type,station:i.station,x:(p.x*.5+.5)*canvas.clientWidth,y:(-.5*p.y+.5)*canvas.clientHeight+canvas.getBoundingClientRect().top,visible:station(i.station).root.visible&&p.z<1};});}};
}
init().catch(error=>{console.error('The 3D garden could not open:',error);$('#loading').hidden=true;$('#world-error').hidden=false;});
