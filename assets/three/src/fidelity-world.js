import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFaithfulWorldScene} from './fidelity-worldscene.js';
import {createFaithfulActors} from './fidelity-actors.js';
import {createFaithfulSky} from './fidelity-sky.js';
import {applyWorldPalette,WORLD_SCENE_COLOURS} from './fidelity-world-palette.js';
import {createDisplayAntialias} from './fidelity-antialias.js';
import {createContent} from './content.js';
import {createAudio} from './audio.js';
import {planWalk} from './fidelity-navigation.js';

const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const canvas=$('#world-canvas'),container=$('#world'),audio=createAudio();
$('#recover-btn').onclick=()=>location.reload();
const low=matchMedia('(max-width:700px)').matches,quality=low?'low':'high';
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const state={x:0,y:0,z:1.5,dark:document.documentElement.dataset.theme==='dark',time:0,near:'home',velocity:new THREE.Vector2(),destination:null,queue:[],overlay:null,yaw:.04,pitch:.10,distance:low?18:17,interiorDistance:2.1,roomId:null,themeBusy:false,pose:null};
const keys=new Set(),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
let renderer,scene,camera,garden,actors,river,sky,content,key,hemi,interiorLight,environmentMap,last=0,raf=0,stopped=false,drag=null,pending=null,actionUntil=0,themeBlend=state.dark?1:0;
let residencyDirty=false,environmentPalette=null,displayAntialias=null;
let navigationRetry=0,navigationFailureSince=null;
const trackedDraws=new WeakSet(),drawnGeometries=new Set(),drawnTextures=new Set();
const target=new THREE.Vector3(0,1,-1),speechPoint=new THREE.Vector3();
const cameraRay=new THREE.Raycaster(),cameraDesired=new THREE.Vector3(),cameraDirection=new THREE.Vector3();
const subtitles={home:'Research, stories, and six cats.',research:'Five threads of work. One library.',talks:'Ideas shared, and conversations continued.',education:'A few places that made me, me.',writing:'Notes, tutorials, and a little ink.',life:'Off the clock. Welcome home.',contact:'A letter is a lovely place to begin.'};
const rituals={home:'Wave',research:'Read',talks:'Talk',education:'Cap',writing:'Write',life:'Pet',contact:'Mail'};
function station(id=state.near){return garden.stations.find(s=>s.id===id);}
function say(text){$('#speech').textContent=text;$('#speech').hidden=false;actionUntil=state.time+5;}
function setOverlay(value){state.overlay=value;keys.clear();state.velocity.set(0,0);}
function selectChapter(id){state.near=id;garden.setActive(id);residencyDirty=true;$('#chapter-title').textContent=station(id).label;$('#chapter-sub').textContent=subtitles[id];$('#prompt-label').textContent='Explore '+station(id).label;$$('[data-go]').forEach(b=>{b.classList.toggle('is-here',b.dataset.go===id);b.setAttribute('aria-current',String(b.dataset.go===id));});updateRoomControl();}
function currentRoom(){return garden?.roomAt(state.x,state.z)||null;}
function updateRoomControl(){const button=$('#room-btn'),room=currentRoom(),available=station()?.rooms?.[0];container.classList.toggle('is-inside-room',!!room);if(!button)return;button.hidden=!room&&!available;button.textContent=room?'Step outside':'Enter '+(available?.label||'the building');button.setAttribute('aria-label',button.textContent);}
function nextWaypoint(){
  const end=state.queue.shift();if(!end){state.destination=null;return;}
  const path=planWalk({start:[state.x,state.y,state.z],end,passable:garden.passable,floorAt:garden.floorAt});
  if(!path){state.queue.unshift(end);state.destination=null;navigationRetry=state.time+.20;navigationFailureSince??=state.time;
    if(state.time-navigationFailureSince>3){stopWalking();say('That spot is blocked. Try the doorway or the clear aisle.');}return;}
  navigationFailureSince=null;state.destination=path.shift();state.queue.unshift(...path);
}
function queueWalk(points){state.queue=points.map(p=>p?.isVector3?p.clone():new THREE.Vector3(...p));nextWaypoint();}
function enterRoom(room=station()?.rooms?.[0],portal=null){
  if(!room)return false;leavePose();stopWalking();content.closePanel();$('#speech').hidden=true;room.openEntrance?.();
  room.onEnter?.();
  // Align in the open forecourt before crossing the doorway. A straight
  // diagonal from a chapter's reading/standing spot can hit an open leaf.
  const route=portal||room,outsideZ=route.exit[2];
  queueWalk([[state.x,0,outsideZ],route.exit,route.entry,route.inside]);state.yaw=.35;state.pitch=.18;state.interiorDistance=2.5;
  updateRoomControl();return true;
}
function leaveRoom(portal=null){const room=currentRoom();if(!room)return false;leavePose();stopWalking();content.closePanel();room.openEntrance?.();const route=portal||room;queueWalk([route.entry,route.exit]);return true;}
function stopWalking(){state.destination=null;state.queue=[];state.velocity.set(0,0);pending=null;keys.clear();navigationRetry=0;navigationFailureSince=null;}
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
  state.roomId=null;
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
  if(pose&&!actors.hasAction(name)&&name!=='Talk'){content.openPanel(id);return;}
  if(pose&&!immediate){leavePose();stopWalking();queueWalk([...(pose.approach||[]),pose.point]);pending={name,id,pose};return;}
  if(state.pose&&state.pose.name!==name)leavePose();
  stopWalking();if(pose){[state.x,state.y,state.z]=pose.point;actors.hanjing.rotation.y=pose.facing||0;}
  // The approved actor has no Talk clip. Still reach the real lectern by
  // its stairs before opening the theater, rather than skipping the room.
  if(name==='Talk'&&!actors.hasAction(name)){content.openTheater(0);return;}
  const duration=actors.playAction(name,{hold:name==='Read'||name==='Write'});
  if(duration){state.pose={name,id,until:state.time+duration,held:name==='Read'||name==='Write',floor:state.y};}
  if(name==='Write'&&duration)s.root.userData.setWritingActive?.(true);
  if(name==='Mail')s.source.setMailProgress?.(0);
  audio.play('wood');
}
function interact(item){
  item.onInteract?.();const id=item.station||state.near;
  if(item.type==='door'){const room=station(id).rooms.find(r=>r.id===item.room);if(room){const portal=room.doorRoutes?.[item.id];if(currentRoom()?.id===room.id)leaveRoom(portal);else enterRoom(room,portal);}return;}
  if(item.type==='river'){river?.stir?.(item.point,state.time);return;}
  if(item.type==='lotus'){river?.stir?.(item.point,state.time);return;}
  if(item.type==='tree'){river?.breeze?.(item.point,state.time);return;}
  if(item.type==='celestial'){setTheme(!state.dark);return;}
  if(item.type==='book'){const approach=currentRoom()?.id===item.room?item.insideApproach:item.approach;perform('Read',id,false,{...station(id).actionStand.read,point:item.stand,approach,contactPoint:item.contactPoint});content.openPanel(id,item.focus);return;}
  if(item.type==='talk'){content.openTheater(0);return;}
  if(item.type==='screen'||item.type==='crane'||item.type==='star')return;
  if(item.type==='write'||item.type==='ink'){perform('Write','writing');return;}
  if(item.type==='cap'){perform('Cap',id);return;}
  if(item.type==='mail'){perform('Mail','contact');content.openPanel('contact');return;}
  if(item.type==='human'){perform('Wave');return;}
  if(item.type==='cat'){audio.play('cat');const acted=actors.onCatInteract(item.catId||'jinbingbing');
    if(!acted)content.openCat(window.HJ_DATA.life.find(l=>l.id==='cats')?.cats?.length-1||5);return;}
  if(item.type==='pet'){audio.play('cat');if(!actors.onCatInteract('xiaohei'))content.openPanel('life',item.focus);return;}
  if(item.url||item.href){window.open(item.url||item.href,'_blank','noopener');return;}
  content.openPanel(id,item.focus);
}
function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?1.15:1.75));renderer.setSize(w,h,false);displayAntialias?.resize();camera.aspect=w/h;camera.updateProjectionMatrix();}
function opaqueObjects(group){const result=[];group.traverseVisible(o=>{if(!o.isMesh||o.userData.roomSolid===false||o.userData.groundContactShadow)return;const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>m.visible!==false&&!m.transparent&&m.opacity>.95))result.push(o);});return result;}
function pick(x,y){const rect=canvas.getBoundingClientRect();ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(ndc,camera);let best=null,distance=Infinity;
  const all=[...garden.interactables,{object:actors.hanjing,type:'human',title:'Say hello'},{object:actors.bingbing,type:'cat',catId:'jinbingbing',title:'JinBingBing'},
    ...(actors.xiaohei.visible?[{object:actors.xiaohei,type:'cat',catId:'xiaohei',title:'XiaoHei'}]:[]),...(river?.interactables||[]),...(sky?.interactables||[])];
  for(const item of all){if(item.station&&!station(item.station).root.visible)continue;const objects=(item.objects||[item.object]).filter(o=>o?.isObject3D);if(!objects.length)continue;const hit=ray.intersectObjects(objects,true)[0];if(hit&&hit.distance<distance){best={...item,point:hit.point};distance=hit.distance;}}
  // Interaction proxies may sit behind masonry. An opaque object in front
  // blocks them, while real glass still lets a visitor see and select inside.
  const solids=opaqueObjects(garden.root),obstruction=ray.intersectObjects(solids,false)[0];
  if(best&&obstruction&&obstruction.distance<distance-.065&&obstruction.object.userData.interaction!==best.id)best=null;
  const floors=[];garden.root.traverseVisible(o=>{if(o.isMesh&&o.userData.walkSurface)floors.push(o);});
  const floor=ray.intersectObjects(floors,false)[0];if(floor&&(!obstruction||floor.distance<=obstruction.distance+.035))point.copy(floor.point);else if(!obstruction)ray.ray.intersectPlane(plane,point);else point.set(state.x,state.y,state.z);
  return best;
}
function walkTo(p){const destination=new THREE.Vector3(THREE.MathUtils.clamp(p.x,-8,82),0,THREE.MathUtils.clamp(p.z,-6.9,3.1));if(!garden.passable(destination.x,destination.z))return;leavePose();stopWalking();queueWalk([destination]);}
function move(dt){let vx=0,vz=0;
  if(!state.destination&&state.queue.length&&state.time>=navigationRetry)nextWaypoint();
  if(!state.overlay){vx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);vz=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);}
  if(vx||vz){leavePose();state.destination=null;state.queue=[];pending=null;}
  else if(state.destination){const dx=state.destination.x-state.x,dz=state.destination.z-state.z,dist=Math.hypot(dx,dz);
    if(dist<.045){state.x=state.destination.x;state.z=state.destination.z;state.y=garden.floorAt(state.x,state.z);nextWaypoint();if(!state.destination&&!state.queue.length&&pending){const p=pending;pending=null;perform(p.name,p.id,true,p.pose);}if(!state.destination&&!state.queue.length)state.velocity.set(0,0);}
    else{vx=dx/dist;vz=dz/dist;}}
  if(state.pose){vx=0;vz=0;state.velocity.set(0,0);if(!state.pose.held&&state.time>=state.pose.until)state.pose=null;}
  const length=Math.hypot(vx,vz)||1,speed=state.dark?.90:1.10;
  state.velocity.x=THREE.MathUtils.damp(state.velocity.x,vx/length*speed,12,dt);state.velocity.y=THREE.MathUtils.damp(state.velocity.y,vz/length*speed,12,dt);
  const nx=state.x+state.velocity.x*dt,nz=state.z+state.velocity.y*dt;
  const stepLimit=.16;
  if(garden.passable(nx,state.z)&&garden.floorAt(nx,state.z)<=garden.floorAt(state.x,state.z)+stepLimit)state.x=nx;else state.velocity.x=0;
  if(garden.passable(state.x,nz)&&garden.floorAt(state.x,nz)<=garden.floorAt(state.x,state.z)+stepLimit)state.z=nz;else state.velocity.y=0;
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
  const room=currentRoom();if((room?.id||null)!==state.roomId){state.roomId=room?.id||null;updateRoomControl();residencyDirty=true;}
}
function lighting(dt){themeBlend=THREE.MathUtils.damp(themeBlend,state.dark?1:0,5,dt);const t=themeBlend;
  scene.background.set(WORLD_SCENE_COLOURS.day.sky).lerp(new THREE.Color(WORLD_SCENE_COLOURS.night.sky),t);
  scene.fog.color.set(WORLD_SCENE_COLOURS.day.fog).lerp(new THREE.Color(WORLD_SCENE_COLOURS.night.fog),t);
  key.intensity=THREE.MathUtils.lerp(1.18,.35,t);key.color.set('#fff1dc').lerp(new THREE.Color('#c0d1e5'),t);
  hemi.intensity=THREE.MathUtils.lerp(1.4,.60,t);hemi.color.set('#edf5f0').lerp(new THREE.Color('#a5bdd2'),t);hemi.groundColor.set('#b6c398').lerp(new THREE.Color('#293a39'),t);
  scene.environmentIntensity=THREE.MathUtils.lerp(.46,.23,t);
  // The visible orb and the directional shadow source share one direction.
  key.position.set(state.x+6.5,6.65,-24);key.target.position.set(state.x,0,0);key.target.updateMatrixWorld();
  const room=currentRoom();interiorLight.visible=!!room&&state.dark;
  if(room){const b=room.bounds;interiorLight.position.set((b.min[0]+b.max[0])/2,b.max[1]-.36,(b.min[2]+b.max[2])/2);interiorLight.distance=Math.hypot(b.max[0]-b.min[0],b.max[2]-b.min[2]);}
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
  const room=currentRoom(),poseName=state.pose?.name||(pending?.name==='Talk'?'Talk':null);
  const fov=room?(low?72:58):35,actorCentre=new THREE.Vector3(state.x,state.y+.90,state.z);
  let desired=room?new THREE.Vector3(...room.camera.target).lerp(actorCentre,.86):new THREE.Vector3(state.x,state.near==='research'?1.75:1.2,state.z-.7);
  let focus=null;const focusPoints=[];
  if(room){
    // Frame real action anchors with the avatar, rather than continuing to
    // look at the room centre after a book or cushion moves the actor aside.
    focus=new THREE.Box3(new THREE.Vector3(state.x-.38,state.y+.035,state.z-.30),new THREE.Vector3(state.x+.38,state.y+1.72,state.z+.30));
    for(const x of[focus.min.x,focus.max.x])for(const y of[focus.min.y,focus.max.y])for(const z of[focus.min.z,focus.max.z])focusPoints.push(new THREE.Vector3(x,y,z));
    const include=(point,half)=>{focus.expandByPoint(point.clone().sub(half));focus.expandByPoint(point.clone().add(half));for(const dx of[-half.x,half.x])for(const dy of[-half.y,half.y])for(const dz of[-half.z,half.z])focusPoints.push(point.clone().add(new THREE.Vector3(dx,dy,dz)));};
    if(poseName==='Read'){
      const books=station(room.station).interactables.filter(item=>item.type==='book');
      const selected=books.reduce((best,item)=>!best||Math.hypot(item.stand[0]-state.x,item.stand[2]-state.z)<Math.hypot(best.stand[0]-state.x,best.stand[2]-state.z)?item:best,null);
      if(selected?.contactPoint&&Math.hypot(selected.stand[0]-state.x,selected.stand[2]-state.z)<.45)include(new THREE.Vector3(...selected.contactPoint),new THREE.Vector3(.15,.24,.10));
      include(new THREE.Vector3(state.x,state.y+.98,state.z+.25),new THREE.Vector3(.22,.16,.14));
    }else if(poseName==='Pet'&&actors.xiaohei){
      include(actors.xiaohei.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.29,0)),new THREE.Vector3(.38,.33,.38));
    }else if(poseName==='Write'){
      const writing=station('writing'),paper=writing.root.userData.paper,tip=writing.root.userData.getWritingTip?.();
      if(paper?.centre)include(new THREE.Vector3(...writing.worldPoint(paper.centre)),new THREE.Vector3(.45,.035,.21));
      if(tip?.position)include(writing.root.localToWorld(new THREE.Vector3(...tip.position)),new THREE.Vector3(.12,.15,.12));
    }else if(poseName==='Talk'&&Math.hypot(state.x-station('talks').actionStand.talk.point[0],state.z-station('talks').actionStand.talk.point[2])<1.8){
      const items=station('talks').interactables,lectern=items.find(item=>item.id==='talks-lectern'),projection=items.find(item=>item.id==='talks-projection');
      if(lectern)include(new THREE.Vector3(...lectern.point),new THREE.Vector3(.40,.55,.35));
      // Keep the screen centre in the stage composition; its full media view
      // belongs to the preserved enlarged theatre, not a cropped portrait room.
      if(projection)include(new THREE.Vector3(...projection.point),new THREE.Vector3(.45,.35,.05));
    }
    if(['Read','Pet','Write','Talk'].includes(poseName)){desired=focus.getCenter(new THREE.Vector3());if(poseName==='Write')desired.y+=.055;}
  }else if(garden.roomAt(desired.x,desired.z))desired.z=state.z;
  target.lerp(desired,1-Math.exp(-dt*(room?12:7)));
  // Outside a wide study, an old smoothed target can still be inside its wall.
  if(!room&&garden.roomAt(target.x,target.z))target.z=state.z;
  const distance=room?state.interiorDistance:state.distance;
  cameraDesired.copy(target).add(new THREE.Vector3(Math.sin(state.yaw)*Math.cos(state.pitch)*distance,Math.sin(state.pitch)*distance,Math.cos(state.yaw)*Math.cos(state.pitch)*distance));
  if(room){
    const b=room.bounds;target.x=THREE.MathUtils.clamp(target.x,b.min[0]+.25,b.max[0]-.25);target.y=THREE.MathUtils.clamp(target.y,b.min[1]+.65,b.max[1]-.30);target.z=THREE.MathUtils.clamp(target.z,b.min[2]+.25,b.max[2]-.25);
    const corners=focusPoints;
    const tanV=Math.tan(THREE.MathUtils.degToRad(fov/2)),tanH=tanV*camera.aspect,padX=.84,padY=low?.68:.82;
    const pitch=Math.max(state.pitch,poseName==='Write'?.34:.20),baseYaw=poseName==='Write'&&Math.abs(state.yaw)<.55?(state.yaw<0?-.70:.70):state.yaw;
    let bestScore=Infinity;
    // Portrait framing may need a side view because the front wall limits the
    // distance. Compare a few room-contained orbits, retaining user yaw when it fits.
    for(const offset of(poseName==='Pet'?[0,.90,-.90,1.70,-1.70]:[0,.55,-.55,1.10,-1.10])){
      const yaw=baseYaw+offset,back=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
      const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=new THREE.Vector3().crossVectors(back,right);
      let fit=distance;for(const corner of corners){const relative=corner.clone().sub(target),depth=relative.dot(back);fit=Math.max(fit,Math.abs(relative.dot(right))/(tanH*padX)+depth,Math.abs(relative.dot(up))/(tanV*padY)+depth);}
      const eye=target.clone().addScaledVector(back,fit+.08);eye.x=THREE.MathUtils.clamp(eye.x,b.min[0]+.16,b.max[0]-.16);eye.y=THREE.MathUtils.clamp(eye.y,b.min[1]+.45,b.max[1]-.18);eye.z=THREE.MathUtils.clamp(eye.z,b.min[2]+.16,b.max[2]-.16);
      back.copy(eye).sub(target);const depth=back.length();back.normalize();right.set(back.z,0,-back.x).normalize();up.crossVectors(back,right);
      let score=0;for(const corner of corners){const relative=corner.clone().sub(target),z=depth-relative.dot(back);score=Math.max(score,z>.06?Math.abs(relative.dot(right))/(z*tanH*padX):100,z>.06?Math.abs(relative.dot(up))/(z*tanV*padY):100);}
      if(Math.hypot(eye.x-state.x,eye.z-state.z)<.75&&Math.abs(eye.y-(state.y+1.05))<.85)score+=10;
      if(poseName==='Pet'&&actors.xiaohei){
        // Both subjects can be inside the frustum while the adult torso hides
        // the cat. Prefer the cat-facing side and separate their screen centres.
        const avatar=actorCentre.clone().sub(target),cat=actors.xiaohei.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.29,0)).sub(target);
        const avatarDepth=Math.max(.06,depth-avatar.dot(back)),catDepth=Math.max(.06,depth-cat.dot(back));
        const separation=Math.abs(avatar.dot(right)/avatarDepth-cat.dot(right)/catDepth)/tanH;
        if(catDepth>avatarDepth+.08)score+=.8+Math.min(.5,(catDepth-avatarDepth)*.5);
        score+=Math.max(0,.70-separation)*.65;
      }
      score+=Math.abs(offset)*.035;if(score<bestScore){bestScore=score;cameraDesired.copy(eye);}
    }
    // One real structural ray keeps the selected view out of opaque furniture
    // and walls; the candidate calculation does not add more mesh raycasts.
    cameraDirection.copy(cameraDesired).sub(target);const length=cameraDirection.length();cameraRay.set(target,cameraDirection.normalize());cameraRay.far=length;const hit=cameraRay.intersectObjects(opaqueObjects(station(room.station).root),false)[0];if(hit&&hit.distance>.28&&hit.distance<length)cameraDesired.copy(target).addScaledVector(cameraDirection,Math.max(.25,hit.distance-.10));
    if(Math.hypot(cameraDesired.x-state.x,cameraDesired.z-state.z)<.65&&Math.abs(cameraDesired.y-(state.y+1.05))<.85){const side=state.x<(b.min[0]+b.max[0])/2?1:-1;cameraDesired.x=THREE.MathUtils.clamp(state.x+side*.76,b.min[0]+.20,b.max[0]-.20);}
  }else{
    // Test every visible shell, including the current chapter: a sideways
    // outdoor orbit can otherwise enter the wide study's own wall.
    const blockers=garden.stations.filter(s=>s.root.visible).flatMap(s=>opaqueObjects(s.root));
    cameraDirection.copy(cameraDesired).sub(target);const length=cameraDirection.length();cameraRay.set(target,cameraDirection.normalize());cameraRay.far=length;
    const hit=cameraRay.intersectObjects(blockers,false)[0];if(hit&&hit.distance>.45&&hit.distance<length)cameraDesired.copy(target).addScaledVector(cameraDirection,Math.max(.45,hit.distance-.18));
  }
  camera.position.copy(cameraDesired);camera.lookAt(target);if(camera.fov!==fov){camera.fov=fov;camera.near=room?.04:.1;camera.updateProjectionMatrix();}
  if(residencyDirty)trackCurrentDraws();
  renderer.info.reset();renderer.render(scene,camera);displayAntialias?.render();
  if(residencyDirty){compactInactiveGPU();residencyDirty=false;}
  if(!$('#speech').hidden){speechPoint.copy(actors.hanjing.position).add(new THREE.Vector3(0,1.85,0)).project(camera);$('#speech').style.left=(speechPoint.x*.5+.5)*canvas.clientWidth+'px';$('#speech').style.top=(-speechPoint.y*.5+.5)*canvas.clientHeight+'px';if(state.time>actionUntil)$('#speech').hidden=true;}
  raf=requestAnimationFrame(frame);
}
function bind(){
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));$('#world-prompt').onclick=()=>{perform(rituals[state.near]);content.openPanel(state.near);};$('#theme-btn').onclick=()=>setTheme(!state.dark);
  $('#room-btn').onclick=()=>currentRoom()?leaveRoom():enterRoom();
  const zoom=factor=>{if(currentRoom())state.interiorDistance=THREE.MathUtils.clamp(state.interiorDistance*factor,.85,3.4);else state.distance=THREE.MathUtils.clamp(state.distance*factor,4,24);};
  $('#view-btn').onclick=()=>{state.yaw=.04;state.pitch=.10;state.distance=low?18:17;};$('#sound-btn').onclick=()=>{const on=audio.toggle();$('#sound-btn').setAttribute('aria-pressed',String(on));};
  $('#zoom-in-btn').onclick=()=>zoom(.84);$('#zoom-out-btn').onclick=()=>zoom(1/.84);
  canvas.addEventListener('wheel',e=>{if(state.overlay)return;e.preventDefault();zoom(Math.exp(THREE.MathUtils.clamp(e.deltaY,-100,100)*.002));},{passive:false});
  $('#help-btn').onclick=()=>say('Arrow keys or WASD to walk. Drag to look around. Scroll or use + / − to move closer. Click an object to explore.');$('#recover-btn').onclick=()=>location.reload();
  $('#places-btn').onclick=()=>{const expanded=$('#places-btn').getAttribute('aria-expanded')==='true';$('#places-btn').setAttribute('aria-expanded',String(!expanded));$('#places').classList.toggle('is-open',!expanded);};
  addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(e.key)){e.preventDefault();keys.add(e.key);canvas.focus();}if(e.key==='e'||e.key==='Enter')$('#world-prompt').click();});addEventListener('keyup',e=>keys.delete(e.key));addEventListener('blur',()=>keys.clear());
  $$('[data-walk]').forEach(b=>{const k={left:'ArrowLeft',right:'ArrowRight',forward:'ArrowUp',back:'ArrowDown'}[b.dataset.walk];b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(k);});
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
  interiorLight=new THREE.PointLight('#ffc47b',3,8,2);interiorLight.name='Entered-room warm shadowed practical';interiorLight.castShadow=true;interiorLight.shadow.mapSize.set(low?128:256,low?128:256);interiorLight.shadow.bias=-.0001;interiorLight.shadow.normalBias=.015;interiorLight.visible=false;scene.add(interiorLight);
  // The single public 3D entry loads the reviewed clay family. The legacy
  // model switch is retained only for explicit development comparisons.
  const stylized=new URLSearchParams(location.search).get('models')!=='legacy';
  [garden,actors]=await Promise.all([createFaithfulWorldScene({data:window.HJ_DATA,quality}),createFaithfulActors({quality,modelSet:stylized?'stylized':'legacy',assetsReady:stylized})]);scene.add(garden.root,actors.root);
  if(stylized){const life=station('life'),seat=life.root.userData.catSeat;actors.xiaohei.position.fromArray(life.worldPoint(seat.position));actors.xiaohei.visible=life.root.visible;}
  const module=await import('./fidelity-riverside.js');river=await module.createFaithfulRiverside({quality});scene.add(river.root);
  sky=await createFaithfulSky({quality});scene.add(sky.root);
  content=createContent({go,action:perform,say,talk(){},setOverlay,theater(){}});content.expandGuide(false);garden.setTheme(state.dark);if(state.dark)await actors.setTheme(true);river.setTheme(state.dark);
  sky.setTheme(state.dark);environmentPalette=applyWorldPalette(scene,state.dark);bind();resize();$('#loading').hidden=true;go(garden.stations.some(s=>s.id===location.hash.slice(1))?location.hash.slice(1):'home');requestAnimationFrame(frame);
  window.__HANJING_3D__={state,go,perform,setTheme,enterRoom,leaveRoom,currentRoom,walkTo,pick,renderer,scene,camera,garden,actors,textureMemory:residentTextureMemory,get antialias(){return displayAntialias?.diagnostics||{mode:'none',msaa:false};},get environmentPalette(){return environmentPalette;},metrics:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,quality}),getInteractionTargets(){scene.updateMatrixWorld(true);return garden.interactables.map(i=>{const p=new THREE.Vector3(...i.point).project(camera);return{id:i.id,type:i.type,station:i.station,x:(p.x*.5+.5)*canvas.clientWidth,y:(-.5*p.y+.5)*canvas.clientHeight+canvas.getBoundingClientRect().top,visible:station(i.station).root.visible&&p.z<1};});}};
}
init().catch(error=>{console.error('The 3D garden could not open:',error);$('#loading').hidden=true;$('#world-error').hidden=false;});
