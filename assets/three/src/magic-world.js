import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFaithfulWorldScene} from './fidelity-worldscene.js';
import {createMagicLandscape} from './magic-landscape.js';
import {createMagicChapters} from './magic-chapters.js';
import {createMagicCats} from './magic-cats.js';
import {createInvitation} from './magic-invitation.js';
import {createMagicNotebook} from './magic-notebook.js';
import {createCaseClues,createCasebook} from './magic-casebook.js';
import {knockToEnter} from './magic-knock.js';
import {createInkDiary} from './magic-diary.js';
import {createTalkNotes} from './magic-guestbook.js';
import {createHiddenStories} from './magic-stories.js';
import {createMagicArchitecture} from './magic-architecture.js';
import {createPathWalk} from './magic-path-walk.js';
import {createOverviewBatches} from './magic-overview-batches.js';
import {createWritingBrush} from './fidelity-hand-contact.js';
import {createDisplayAntialias} from './fidelity-antialias.js';
import {createContent} from './content.js';
import {createAudio} from './audio.js';
import {createEnchantment} from './magic-enchantment.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('#world-canvas'),container=$('#world'),low=matchMedia('(max-width:700px)').matches,quality=low?'low':'high';
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,audio=createAudio();
const state={mode:'overview',near:'home',dark:true,time:0,overlay:null,yaw:-.12,pitch:.92,distance:90,roomId:null,ready:false};
let caseClues,casebook,enchant,renderer,scene,camera,garden,landscape,magic,cats,content,notebook,diary,stories,architecture,talkNotes,pathWalk,environment,aa,brush,interiorLight,key,overviewBatches,captionObserver;
let last=0,raf=0,stopped=false,paused=false,drag=null,carry=null,lastTap=null,writingUntil=0,speechTimer=0,disposed=false,invitationRendered=false,qaRenderOnce=false;
const pointers=new Map(),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),centre=new THREE.Vector3(10.5,-.65,-12),target=centre.clone(),desired=centre.clone();
const roomEye=new THREE.Vector3(),cameraEye=new THREE.Vector3(),rootSize=new THREE.Vector3();
let wantedDistance=90;
let walkLookYaw=0,walkLookPitch=0,walkFov=62,walkStatus='',walkFocus=null;
const walkDirection=new THREE.Vector3(),walkLookTarget=new THREE.Vector3();
const keepsakeSteps=new Map();
let hoverPoint=null,hoverDirty=false,hoverTime=0;
const invitation=createInvitation({onOpen(){setOverlay('invitation');},onRead(){if(magic&&notebook)record(magic.discover('home',{notify:false}));},
  onClose(){setOverlay(content?.overlay||null);},onEnter(){overview();knockToEnter({reduced});}});

function setOverlay(value){
  if(value&&value!=='diary')diary?.close('another-page');
  if(value&&value!=='story')stories?.close();
  if(value&&value!=='talkNote')talkNotes?.close();
  if(value&&value!=='casebook')casebook?.close();
  state.overlay=value;if(value&&state.mode==='walk')pathWalk?.pause();if(state.mode==='walk'&&pathWalk?.getState().active)refreshPrompt();drag=null;pointers.clear();hideTip();invitationRendered=false;last=0;
}
function closeNewPages(){diary?.close('navigation');stories?.close();talkNotes?.close();hideTip();}
function interactionItems(){return [...(enchant?.interactables||[]),...(caseClues?.interactables||[]),...(magic?.interactables||[]),...(stories?.interactables||[]),...(diary?.interactables||[]),...(talkNotes?.interactables||[]),...(garden?.interactables||[]),...(cats?.interactables||[]),...(landscape?.interactables||[])];}
function refreshKeepsakeButton(){const button=$('#keepsake-btn');if(!button)return;button.hidden=state.mode==='overview'||state.mode==='walk'||!stories?.metadata.entries.some(e=>e.station===state.near);$('#walk-start-btn').hidden=state.mode!=='overview';}
function findKeepsake(){const entries=stories?.metadata.entries.filter(e=>e.station===state.near)||[];if(!entries.length)return;const index=keepsakeSteps.get(state.near)||0;keepsakeSteps.set(state.near,index+1);const entry=entries[index%entries.length];returnToDiscovery(entry.station,entry.id,{viewOnly:true});$('#chapter-sub').textContent=entry.title+'. '+(low?'Tap':'Click')+' the keepsake to explore.';}
function refreshPrompt(){if(state.mode==='walk'){const s=pathWalk.getState();$('#prompt-label').textContent=s.done?'Choose the next path':s.paused?'Walk this path':'Pause and look around';$('#world-prompt').disabled=s.done;return;}$('#world-prompt').disabled=false;const label=state.mode==='interior'&&state.near==='writing'?'Write to the diary':state.mode==='interior'&&state.near==='talks'?'Leave a thought':state.near==='home'?'Read Hanjing’s letter':'Read '+(station()?.label||'this place');$('#prompt-label').textContent=label;}
function stopWalking(){pathWalk?.stop();walkStatus='';walkFocus=null;container.classList.remove('is-walking');$('#walk-reverse-btn').hidden=true;$('#walk-next').hidden=true;$('#walk-next').replaceChildren();$('#world-prompt').disabled=false;}
function walkingBlockers(){return landscape.getRoadBlockers();}
function extraWorldBlockers(){return [...magic.colliders,...stories.colliders].map(c=>{const s=station(c.station),record={...c,min:s.worldPoint(c.min),max:s.worldPoint(c.max),world:true};Object.defineProperty(record,'disabled',{enumerable:true,get:()=>!!c.disabled});return record;});}
function beginWalk(road){if(!road||!state.ready)return false;if(state.mode==='interior'){say('Return to the miniature, then choose a stone path outside.');return false;}const result=pathWalk.begin({...road,cameraPosition:camera.position,cameraTarget:target});if(!result.ok){say(result.message);return false;}closeNewPages();content.closePanel();content.expandGuide(false);notebook?.close();state.mode='walk';state.roomId=null;walkLookYaw=walkLookPitch=0;walkFov=low?68:62;walkStatus='';walkFocus=null;container.classList.remove('is-inside-room');container.classList.add('is-walking');garden.setActive('overview');cats.bingbing.visible=false;cats.xiaohei.visible=true;$('#walk-reverse-btn').hidden=false;$('#walk-next').hidden=true;$('#chapter-eyebrow').textContent='ON THE PATH · DRAG TO LOOK AROUND';syncWalkUI(pathWalk.getState());canvas.focus({preventScroll:true});history.replaceState(null,'',location.pathname+location.search);return true;}
function toggleWalk(){const s=pathWalk.getState();if(s.done)return;if(s.paused)pathWalk.resume();else pathWalk.pause();refreshPrompt();}
function reverseWalk(){const s=pathWalk.getState();if(!s.active)return;beginWalk({routeId:s.routeId,progress:s.progress,direction:-s.direction,point:[s.position[0],s.groundY,s.position[2]]});}
function syncWalkUI(pose){const eye=pose.position?.isVector3?pose.position:new THREE.Vector3(...pose.position);const ranked=garden.stations.map(s=>({s,d:Math.hypot(eye.x-(s.rooms[0]?.entry||s.stand)[0],eye.z-(s.rooms[0]?.entry||s.stand)[2])})).sort((a,b)=>a.d-b.d);const nearest=ranked[0];if(walkFocus!==nearest.s.id){walkFocus=nearest.s.id;state.near=nearest.s.id;overviewBatches.set(true,walkFocus);setCaption(state.near);}
  const room=nearest.s.rooms[0];$('#room-btn').hidden=!room||nearest.d>4.5;$('#room-btn').textContent='Look inside '+nearest.s.label;
  const status=[walkFocus,pose.phase,pose.paused,pose.done,pose.blocked,pose.arrivedAt,pose.routeId].join('|');if(status===walkStatus)return;walkStatus=status;
  const destination=station(pose.direction>0?pose.to:pose.from)?.label||'the next place';$('#chapter-sub').textContent=pose.blocked?'The path is obstructed. Turn back or return to the whole world.':pose.done?(pose.arrivedAt?'At '+destination+'. Look inside, or choose the next path.':'A quiet stopping place. Turn back or choose a nearby path.'):(pose.phase==='arriving'?'Descending to the stone path…':(pose.paused?'Take your time. ':'Walking toward '+destination+'. ')+ 'Drag to look around.');refreshPrompt();
  const next=$('#walk-next');next.replaceChildren();next.hidden=!pose.done;if(pose.done){for(const route of landscape.walkRoutes){const a=new THREE.Vector3(...route.startPoint),b=new THREE.Vector3(...route.endPoint),da=Math.hypot(eye.x-a.x,eye.z-a.z),db=Math.hypot(eye.x-b.x,eye.z-b.z);if(Math.min(da,db)>1.4)continue;const forward=da<=db,button=document.createElement('button');button.type='button';button.textContent='To '+station(forward?route.to:route.from).label;button.onclick=()=>beginWalk({routeId:route.id,point:(forward?a:b).toArray(),progress:forward?0:1,direction:forward?1:-1});next.append(button);}next.hidden=!next.children.length;}}
function openDiary(){if(state.near!=='writing'||state.mode==='overview')go('writing');enterRoom('writing');content.closePanel();content.expandGuide(false);notebook?.close();stories?.close();talkNotes?.close();writingUntil=0;station('writing').root.userData.setWritingActive?.(false);brush.root.visible=false;if(low){const p=diary.interactables[0].point;focusStory({worldAnchor:[p[0]-.70,p[1]-.54,p[2]]});liftPaperView();}diary.open({trigger:canvas});audio.play('bell');}
function openTalkNotes(){if(!talkNotes)return;if(state.near!=='talks'||state.mode==='overview')go('talks');enterRoom('talks');content.closePanel();content.expandGuide(false);notebook?.close();diary?.close();stories?.close();const p=talkNotes.interactables[0].point;focusStory({worldAnchor:[p[0],p[1]-.54,p[2]]});if(low)liftPaperView();talkNotes.open({trigger:canvas});audio.play('wood');}
function liftPaperView(){desired.y-=.52;target.copy(desired);const dir=roomEye.clone().sub(desired);wantedDistance=state.distance=dir.length();dir.normalize();state.yaw=Math.atan2(dir.x,dir.z);state.pitch=Math.asin(dir.y);}
function focusStory(entry){const anchor=entry.getWorldAnchor?.()||entry.worldAnchor;if(!anchor)return;desired.fromArray(anchor).add(new THREE.Vector3(0,.54,0));const room=currentRoom();if(room){const b=room.bounds;roomEye.copy(desired).add(new THREE.Vector3(0,1.14,1.65));roomEye.x=THREE.MathUtils.clamp(roomEye.x,b.min[0]+.18,b.max[0]-.18);roomEye.y=THREE.MathUtils.clamp(roomEye.y,b.min[1]+.40,b.max[1]-.18);roomEye.z=THREE.MathUtils.clamp(roomEye.z,b.min[2]+.18,b.max[2]-.18);target.copy(desired);wantedDistance=state.distance=roomEye.distanceTo(desired);const dir=roomEye.clone().sub(desired).normalize();state.yaw=Math.atan2(dir.x,dir.z);state.pitch=Math.asin(dir.y);}else{state.yaw=.22;state.pitch=.64;wantedDistance=4.5;}}
function returnToDiscovery(id,discoveryId,opts={}){go(id);if(discoveryId===diary?.metadata.entry.id){openDiary();return;}const entry=stories?.metadata.entries.find(e=>(e.discoveryId||e.id)===discoveryId);if(entry){if(entry.indoor)enterRoom(entry.station);focusStory(entry);if(!opts.viewOnly)stories.open(discoveryId);}}
function hideTip(){hoverPoint=null;hoverDirty=false;const tip=$('#object-tip');if(tip)tip.hidden=true;if(canvas)canvas.style.cursor='';}
function showHover(now){if(!hoverDirty||!hoverPoint||state.overlay||drag||now-hoverTime<100)return;hoverDirty=false;hoverTime=now;const hit=pick(hoverPoint.x,hoverPoint.y),tip=$('#object-tip');canvas.style.cursor=hit?'pointer':'';if(!hit){tip.hidden=true;return;}tip.textContent=hit.title||hit.label||'Look closer';tip.hidden=false;const bounds=container.getBoundingClientRect();tip.style.left=Math.min(Math.max(12,hoverPoint.x-bounds.left+12),bounds.width-tip.offsetWidth-12)+'px';tip.style.top=Math.min(Math.max(12,hoverPoint.y-bounds.top+14),bounds.height-tip.offsetHeight-12)+'px';}
function say(text){clearTimeout(speechTimer);const el=$('#speech');el.textContent=text;el.hidden=true;void el.offsetWidth;el.hidden=false;speechTimer=setTimeout(()=>el.hidden=true,Math.max(6500,String(text).length*60));}
function station(id=state.near){return garden?.stations.find(s=>s.id===id);}
function descriptor(id){return magic?.metadata.chapters.find(c=>c.station===id);}
function discoveryAnchor(event){const entry=stories?.metadata.entries.find(e=>(e.discoveryId||e.id)===(event.discoveryId||event.id));const p=entry?.getWorldAnchor?.();if(p)return new THREE.Vector3(...p).add(new THREE.Vector3(0,.35,0));const s=station(event.station||event.id);return s?s.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,2.2,0)):null;}
function record(event){if(!event||event.complete===false)return;if(event.fresh!==false&&!event.silent&&state.ready)enchant?.burst(discoveryAnchor(event));notebook?.discover({...event,silent:!!state.overlay});landscape?.discover?.(event.station||event.id);}
function setCaption(id){const d=descriptor(id);$('#chapter-title').textContent=d?.title||station(id)?.label||'A world within';$('#chapter-sub').textContent=d?.subtitle||'A little ink. A little starlight. Pieces of places I’ve called home.';
  $$('[data-go]').forEach(b=>{const here=state.mode!=='overview'&&b.dataset.go===id;b.classList.toggle('is-here',here);if(here)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});refreshKeepsakeButton();}
// The crystal ball sits a little closer than a plain fit, but never wider than a narrow phone screen.
function overviewDistance(box){if(!enchant?.overviewBounds)return fitDistance(box);box.getSize(rootSize);const half=Math.atan(Math.tan(THREE.MathUtils.degToRad(44/2))*camera.aspect);return Math.max(fitDistance(box)*.78,rootSize.x/2/Math.sin(half)*1.03);}
function fitDistance(box,aspect=camera.aspect){box.getSize(rootSize);const t=Math.tan(THREE.MathUtils.degToRad(44/2));return Math.max(rootSize.x/(2*t*aspect),Math.hypot(rootSize.z,rootSize.y)/(2*t))*(low?1.16:1.32);}
function overview(){if(!state.ready)return;const wasWalking=state.mode==='walk';stopWalking();closeNewPages();content.closePanel();content.expandGuide(false);notebook?.close();state.mode='overview';state.roomId=null;state.near='home';state.yaw=-.12;state.pitch=.50;garden.setActive('overview');overviewBatches?.set(true);container.classList.remove('is-inside-room');
  key.shadow.needsUpdate=true;
  const bounds=enchant?.overviewBounds||landscape.diagnostics?.overviewBounds;const box=bounds?new THREE.Box3(new THREE.Vector3(...bounds.min),new THREE.Vector3(...bounds.max)):new THREE.Box3(new THREE.Vector3(-24,-8,-36),new THREE.Vector3(46,7,12));
  box.getCenter(desired);desired.y+=4;wantedDistance=THREE.MathUtils.clamp(overviewDistance(box),72,260);if(reduced||wasWalking){target.copy(desired);state.distance=wantedDistance;}
  $('#chapter-title').textContent='A world within';$('#chapter-sub').textContent='Ink, starlight, and places I’ve called home. '+(low?'Tap':'Click')+' a miniature to look closer, or a stone path to walk.';$('#chapter-eyebrow').textContent='HANJING’S OPENED CRYSTAL WORLD';
  refreshKeepsakeButton();$('#room-btn').hidden=true;$('#prompt-label').textContent='Read the invitation';$$('[data-go]').forEach(b=>{b.classList.remove('is-here');b.removeAttribute('aria-current');});
  cats.bingbing.visible=false;cats.xiaohei.visible=false;history.replaceState(null,'',location.pathname+location.search);}
function go(id,opts={}){if(!state.ready)return;const s=station(id);if(!s)return;const wasWalking=state.mode==='walk';stopWalking();closeNewPages();content.closePanel();notebook?.close();if(!opts.fromChat)content.expandGuide(false);
  state.mode='chapter';state.near=id;state.roomId=null;state.yaw=.28;state.pitch=.36;overviewBatches?.set(false);garden.setActive(id);container.classList.remove('is-inside-room');
  const box=new THREE.Box3().setFromObject(s.root);desired.copy(box.getCenter(new THREE.Vector3()));desired.y=Math.max(.8,desired.y-.10);
  wantedDistance=THREE.MathUtils.clamp(fitDistance(box),low?13:10,42);if(reduced||wasWalking){target.copy(desired);state.distance=wantedDistance;}
  cats.placeAtChapter(s,garden);cats.bingbing.visible=true;cats.xiaohei.visible=station('life').root.visible;
  $('#chapter-eyebrow').textContent='A PLACE TO LOOK CLOSER';setCaption(id);$('#room-btn').hidden=!s.rooms?.length;$('#room-btn').textContent='Look inside';$('#prompt-label').textContent=id==='home'?'Read Hanjing’s letter':'Read '+s.label;
  history.replaceState(null,'',location.pathname+location.search+'#'+id);if(opts.open||opts.focus)content.openPanel(id,opts.focus,opts.fromChat);
}
function enterRoom(id=state.near){const s=station(id),room=s?.rooms?.[0];if(!room)return false;stopWalking();closeNewPages();content.closePanel();overviewBatches?.set(false);state.mode='interior';state.near=id;state.roomId=room.id;garden.setActive(id);room.openEntrance?.();room.onEnter?.();container.classList.add('is-inside-room');
  desired.fromArray(room.camera?.target||[(room.bounds.min[0]+room.bounds.max[0])/2,room.bounds.min[1]+1.1,(room.bounds.min[2]+room.bounds.max[2])/2]);
  roomEye.copy(desired).add(new THREE.Vector3(...(room.camera?.offset||[0,.35,1.5])));const b=room.bounds;
  if(id==='writing'){desired.fromArray(s.worldPoint([.25,.70,-1.55]));roomEye.fromArray(s.worldPoint([.25,2.35,.40]));}
  if(id==='life'){desired.fromArray(s.worldPoint([0,.90,-2.10]));roomEye.fromArray(s.worldPoint([0,1.70,-.28]));}
  roomEye.x=THREE.MathUtils.clamp(roomEye.x,b.min[0]+.18,b.max[0]-.18);roomEye.y=THREE.MathUtils.clamp(roomEye.y,b.min[1]+.40,b.max[1]-.18);roomEye.z=THREE.MathUtils.clamp(roomEye.z,b.min[2]+.18,b.max[2]-.18);
  target.copy(desired);state.distance=roomEye.distanceTo(desired);wantedDistance=state.distance;const dir=roomEye.clone().sub(desired).normalize();state.yaw=Math.atan2(dir.x,dir.z);state.pitch=Math.asin(dir.y);
  $('#chapter-eyebrow').textContent='INSIDE THE WORLD';$('#room-btn').textContent='Return to the miniature';setCaption(id);refreshPrompt();return true;}
function leaveRoom(){if(state.mode!=='interior')return false;go(state.near);return true;}
function currentRoom(){return state.mode==='interior'?garden?.rooms.find(r=>r.id===state.roomId):null;}
function action(name){const normalized=String(name||'').toLowerCase();
  if(['night','day','wave','bow'].includes(normalized)){audio.play('bell');return;}
  if(['write','ink'].includes(normalized)){go('writing');enterRoom('writing');station('writing').root.userData.setWritingActive?.(true);writingUntil=state.time+14;audio.play('wood');return;}
  if(['pet','purr','pounce'].includes(normalized)){cats.interact(normalized==='pet'?'xiaohei':'jinbingbing');audio.play('cat');return;}
  if(['simmer','food'].includes(normalized)){station('life').root.userData.setCooking?.(true);audio.play('wood');return;}
  if(['talk','projector'].includes(normalized)){content.openTheater(0);return;}
  if(['cap','mail','read'].includes(normalized)){content.openPanel(normalized==='cap'?'education':normalized==='mail'?'contact':'research');audio.play('wood');}}
function interact(item){if(!item)return;
  if(item.type==='enchant'){item.onInteract?.();audio.play('bell');return;}
  if(item.type==='road'){beginWalk(landscape.pickRoad(item.point));return;}
  if(item.type==='chapter'){go(item.station);return;}
  if(item.type==='diary'){openDiary();return;}
  if(item.type==='talkNote'){openTalkNotes();return;}
  if(item.story){const entry=stories.metadata.entries.find(e=>(e.discoveryId||e.id)===item.story);if(state.mode==='overview'||state.near!==item.station)go(item.station);if(entry?.indoor&&state.mode!=='interior')enterRoom(item.station);if(entry)focusStory(entry);stories.open(item.story);}
  if(item.type==='magic'){const result=item.onInteract?.();if(item.story){if(result?.complete!==false)record(result);audio.play('bell');return;}if(result?.complete===false)say(result.note);else if(result){clearTimeout(speechTimer);$('#speech').hidden=true;record(result);}if(item.station==='home'){invitation.open({replay:true,trigger:$('#letter-btn')});}audio.play('bell');return;}
  if(item.type==='cat'){const result=cats.interact(item.catId,{point:item.point,camera:camera.position,action:item.action});audio.play('cat');say(result?.line||(item.catId==='xiaohei'?'XiaoHei, our oldest brother. Still acting like a baby.':'JinBingBing, the youngest. Of course she runs the place.'));return;}
  if(item.type==='food'){const served=station('life').root.userData.setCooking?.();audio.play('wood');if(served==='again'){content.openPanel(item.station||state.near,item.focus);return;}
    say('Steamed seafood, the taste of home in Dalian. Mantis shrimp, a swimming crab (we call it a flying crab), clams, sea snails and shrimp. Still my favourite food.');return;}
  item.onInteract?.();const id=item.station||state.near;
  if(item.type==='door'){if(state.mode==='interior')leaveRoom();else{if(state.mode==='overview')go(id);enterRoom(id);}return;}
  if(['river','lotus'].includes(item.type)){landscape.stir?.(item.point,state.time);audio.play('water');return;}
  if(item.type==='tree'){landscape.breeze?.(item.point,state.time);return;}
  if(item.type==='book'){item.object?.userData?.wiggle?.();audio.play('wood');content.openPanel('research',item.focus);return;}
  if(['talk','projection'].includes(item.type)){content.openTheater(0);return;}
  if(['write','ink'].includes(item.type)){action('write');return;}
  if(['screen','crane','star'].includes(item.type)){audio.play('bell');return;}
  if(item.type==='pet'){cats.interact('xiaohei');audio.play('cat');return;}
  if(item.url||item.href){window.open(item.url||item.href,'_blank','noopener');return;}
  content.openPanel(id,item.focus);}
function isVisible(object){for(let o=object;o;o=o.parent)if(o.visible===false)return false;return true;}
function isPickable(object){const proxy=object?.userData.roomSolid===false&&object?.userData.interaction;return isVisible(proxy?object.parent:object);}
function rayAt(x,y){const rect=canvas.getBoundingClientRect();ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(ndc,camera);return ray.ray.clone();}
function pickCarryable(x,y){const r=rayAt(x,y);ray.set(r.origin,r.direction);let best=null,distance=Infinity;for(const item of interactionItems()){if(!item.drag)continue;const objects=(item.objects||[item.object]).filter(o=>o?.isObject3D&&isPickable(o));const hit=ray.intersectObjects(objects,true)[0];if(hit&&hit.distance<distance){best=item;distance=hit.distance;}}return best;}
function dropped(result){if(!result){audio.play('wood');return;}audio.play(result.complete?'bell':'wood');if(result.complete){record(result);say(result.note);}else if(result.note)say(result.note);}
function pick(x,y){const rect=canvas.getBoundingClientRect();ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(ndc,camera);
  if(state.mode==='overview'){
    let best=null,distance=Infinity;for(const s of garden.stations){const hit=ray.intersectObject(s.root,true).find(h=>h.object.material?.visible!==false);if(hit&&hit.distance<distance){best={id:s.id,type:'chapter',station:s.id,title:descriptor(s.id)?.title||s.label,point:hit.point};distance=hit.distance;}}
    for(const item of [...(enchant?.interactables||[]),...(caseClues?.interactables||[])]){const objects=(item.objects||[item.object]).filter(o=>o?.isObject3D&&isPickable(o));const hit=ray.intersectObjects(objects,true)[0];if(hit&&hit.distance<distance){best={...item,point:hit.point};distance=hit.distance;}}
    for(const item of landscape.interactables){const objects=(item.objects||[item.object]).filter(o=>o?.isObject3D&&isPickable(o));const hit=ray.intersectObjects(objects,true)[0];if(hit&&hit.distance<distance){best={...item,point:hit.point};distance=hit.distance;}}
    return best;
  }
  let best=null,distance=Infinity,paperHit=null;const all=interactionItems();
  for(const item of all){if(item.station&&!station(item.station)?.root.visible)continue;const objects=(item.objects||[item.object]).filter(o=>o?.isObject3D&&isPickable(o));if(!objects.length)continue;
    const hit=ray.intersectObjects(objects,true)[0];if(hit&&item.type==='talkNote')paperHit={item,hit};if(hit&&hit.distance<distance){best={...item,point:hit.point};distance=hit.distance;}}
  // The older lectern target is a generous invisible volume. Its new paper
  // is an actual small surface on that same lectern, so select the precise
  // paper when the ray hits it; real opaque surfaces still block it below.
  if(best?.id==='talks-lectern'&&paperHit){best={...paperHit.item,point:paperHit.hit.point};distance=paperHit.hit.distance;}
  if(best){const opaque=[];garden.root.traverseVisible(o=>{if(!o.isMesh||o.userData.roomSolid===false)return;const ms=Array.isArray(o.material)?o.material:[o.material];if(ms.some(m=>m.visible!==false&&!m.transparent&&m.opacity>.95))opaque.push(o);});const blocked=ray.intersectObjects(opaque,false)[0];
    const belongs=blocked&&(best.objects||[best.object]).some(o=>{for(let n=blocked.object;n;n=n.parent)if(n===o)return true;return false;});if(blocked&&blocked.distance<distance-.07&&!belongs&&blocked.object.userData.interaction!==best.id)return null;}
  return best;}
function zoom(factor){if(state.mode==='walk'){walkFov=THREE.MathUtils.clamp(walkFov*factor,46,76);return;}if(state.mode==='interior'){wantedDistance=THREE.MathUtils.clamp(wantedDistance*factor,.75,3);}else wantedDistance=THREE.MathUtils.clamp(wantedDistance*factor,state.mode==='overview'?42:4,250);}
function resize(){invitationRendered=false;renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?1.10:1.65));renderer.setSize(container.clientWidth,container.clientHeight,false);aa?.resize();camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();if(state.ready&&state.mode==='overview'){overview();}}
function textureMemory(){const ts=new Map();const remember=t=>{if(t?.isTexture&&renderer.properties.get(t).__webglTexture)ts.set(t.uuid,t);};remember(environment);remember(aa?.texture);remember(key.shadow.map?.texture);scene.traverse(o=>{remember(o.skeleton?.boneTexture);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){Object.values(m).forEach(remember);Object.values(m.userData||{}).forEach(remember);Object.values(m.uniforms||{}).forEach(u=>remember(u.value));}});
  let bytes=0;for(const t of ts.values()){const im=Array.isArray(t.image)?t.image[0]:t.image;bytes+=(im?.width||0)*(im?.height||0)*4*(t.type===THREE.HalfFloatType?2:t.type===THREE.FloatType?4:1)*(t.generateMipmaps?4/3:1)*(t.isCubeTexture?6:1);}return{count:ts.size,estimatedRGBAAndMipsMiB:Math.round(bytes/1048576*10)/10,scope:'Resident texture estimate; excludes driver overhead.'};}
function frame(now){if(stopped||document.hidden)return;if(paused&&!qaRenderOnce){last=0;raf=requestAnimationFrame(frame);return;}qaRenderOnce=false;if(invitation.isOpen&&invitationRendered){last=0;raf=requestAnimationFrame(frame);return;}const dt=paused?0:Math.min(.08,last?(now-last)/1000:1/60);last=now;state.time+=dt;
  garden.update(state.time,dt,true);magic.update(state.time,dt);architecture?.update(state.time,dt);stories?.update(state.time,dt);diary?.update(dt);talkNotes?.update(dt);landscape.setInspection?.(state.mode!=='overview');landscape.update(dt,state.time,true,target.x,target.z);cats.update(dt,state.time);
  const writing=station('writing');if(writingUntil&&state.time>writingUntil){writing.root.userData.setWritingActive?.(false);writingUntil=0;}
  brush.root.visible=writingUntil>state.time&&writing.root.visible;const ink=brush.root.visible?writing.root.userData.getWritingTip?.():null;if(ink){brush.root.position.copy(writing.root.localToWorld(new THREE.Vector3(...ink.position)));if(!ink.active)brush.root.position.y+=.025;}
  if(state.mode==='walk'){
    const pose=pathWalk.update(state.overlay?0:dt);if(pose){cameraEye.copy(pose.position);walkDirection.subVectors(pose.target,pose.position).normalize();const yaw=Math.atan2(walkDirection.x,walkDirection.z)+walkLookYaw,pitch=THREE.MathUtils.clamp(Math.asin(walkDirection.y)+walkLookPitch,-.85,.85);walkDirection.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));walkLookTarget.copy(pose.position).addScaledVector(walkDirection,3);target.copy(walkLookTarget);desired.copy(target);syncWalkUI(pose);}
  }else{
    target.lerp(desired,reduced?1:1-Math.exp(-dt*5));state.distance=THREE.MathUtils.damp(state.distance,wantedDistance,reduced?1000:5,dt||1/60);
    cameraEye.copy(target).add(new THREE.Vector3(Math.sin(state.yaw)*Math.cos(state.pitch)*state.distance,Math.sin(state.pitch)*state.distance,Math.cos(state.yaw)*Math.cos(state.pitch)*state.distance));
  }
  const fov=state.mode==='walk'?walkFov:state.mode==='interior'?(low?72:62):44;const nextFov=state.mode==='walk'&&!reduced?THREE.MathUtils.damp(camera.fov,fov,5,dt||1/60):fov;if(Math.abs(camera.fov-nextFov)>.001){camera.fov=nextFov;camera.updateProjectionMatrix();}
  const room=currentRoom();if(room){const b=room.bounds;cameraEye.x=THREE.MathUtils.clamp(cameraEye.x,b.min[0]+.16,b.max[0]-.16);cameraEye.y=THREE.MathUtils.clamp(cameraEye.y,b.min[1]+.35,b.max[1]-.18);cameraEye.z=THREE.MathUtils.clamp(cameraEye.z,b.min[2]+.16,b.max[2]-.16);}
  camera.position.copy(cameraEye);camera.lookAt(target);interiorLight.visible=!!room;if(room){const b=room.bounds;interiorLight.position.set((b.min[0]+b.max[0])/2,b.max[1]-.30,(b.min[2]+b.max[2])/2);interiorLight.distance=Math.hypot(b.max[0]-b.min[0],b.max[2]-b.min[2]);}
  const anchor=state.mode==='walk'?cameraEye:state.mode==='overview'?centre:station()?.exploreTarget||centre,keyTarget=anchor.isVector3?anchor:new THREE.Vector3(...anchor),span=state.mode==='overview'?43:9;
  key.target.position.copy(keyTarget);key.position.copy(keyTarget).add(new THREE.Vector3(-28,38,32));key.target.updateMatrixWorld();
  key.shadow.autoUpdate=state.mode!=='overview';
  if(key.shadow.camera.right!==span||key.shadow.camera.top!==span){Object.assign(key.shadow.camera,{left:-span,right:span,top:span,bottom:-span});key.shadow.camera.updateProjectionMatrix();key.shadow.needsUpdate=true;}
  enchant?.update(dt,state.time,camera,renderer);caseClues?.update(state.time);
  showHover(now);renderer.info.reset();renderer.render(scene,camera);aa?.render();invitationRendered=invitation.isOpen;raf=requestAnimationFrame(frame);}
function bind(){
  const caption=$('.chapter-caption');captionObserver=new ResizeObserver(()=>{$('#room-btn').style.top=(caption.offsetTop+caption.offsetHeight+12)+'px';});captionObserver.observe(caption,{box:'border-box'});
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>{go(b.dataset.go);$('#places').classList.remove('is-open');$('#places-btn').setAttribute('aria-expanded','false');}));
  $('#world-prompt').onclick=()=>{if(state.mode==='walk')toggleWalk();else if(state.mode==='overview'||state.near==='home')invitation.open({replay:true,trigger:$('#world-prompt')});else if(state.mode==='interior'&&state.near==='writing')openDiary();else if(state.mode==='interior'&&state.near==='talks')openTalkNotes();else content.openPanel(state.near);};
  $('#letter-btn').onclick=()=>{notebook.close();invitation.open({replay:true,trigger:$('#letter-btn')});};$('#room-btn').onclick=()=>state.mode==='interior'?leaveRoom():enterRoom();
  $('#walk-start-btn').onclick=()=>{const road=landscape.walkRoutes.find(r=>r.from==='home')||landscape.walkRoutes[0];beginWalk({routeId:road.id,point:road.startPoint,progress:0,direction:1});};$('#walk-reverse-btn').onclick=reverseWalk;$('#keepsake-btn').onclick=findKeepsake;$('#view-btn').onclick=overview;$('#overview-btn').onclick=overview;$('#zoom-in-btn').onclick=()=>zoom(.83);$('#zoom-out-btn').onclick=()=>zoom(1/.83);
  $('#sound-btn').onclick=()=>$('#sound-btn').setAttribute('aria-pressed',String(audio.toggle()));$('#help-btn').onclick=()=>say('Click a stone path to walk through the world. Drag to look around, and press E to pause or carry on. Click a miniature to look closer, then Look inside. The crystal icon brings you back to the whole world. Many things answer when you click them, so be curious.');$('#recover-btn').onclick=()=>location.reload();
  $('#places-btn').onclick=()=>{const expanded=$('#places-btn').getAttribute('aria-expanded')==='true';$('#places-btn').setAttribute('aria-expanded',String(!expanded));$('#places').classList.toggle('is-open',!expanded);};
  canvas.addEventListener('wheel',e=>{if(state.overlay)return;e.preventDefault();zoom(Math.exp(THREE.MathUtils.clamp(e.deltaY,-100,100)*.002));},{passive:false});
  canvas.addEventListener('pointerdown',e=>{if(state.overlay)return;hideTip();canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
    // things that can be picked up (the LEGO bricks) are carried instead of turning the camera
    const hit=state.mode==='interior'?pickCarryable(e.clientX,e.clientY):null;carry=hit?{item:hit,started:false}:null;}else{if(drag)drag.moved=true;carry=null;}});
  canvas.addEventListener('pointerleave',hideTip);
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)&&e.pointerType==='mouse'&&!state.overlay){hoverPoint={x:e.clientX,y:e.clientY};hoverDirty=true;}if(state.overlay||!pointers.has(e.pointerId))return;const before=[...pointers.values()];pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const after=[...pointers.values()],old=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),next=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);if(old>0&&next>0)zoom(old/next);if(drag)drag.moved=true;return;}
    if(carry&&drag&&pointers.size===1){if(!carry.started&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6){if(carry.item.drag.begin?.()===false)carry=null;else{carry.started=true;audio.play('wood');}}
      if(carry?.started){drag.moved=true;canvas.style.cursor='grabbing';carry.item.drag.move(rayAt(e.clientX,e.clientY));return;}}
    if(!drag)return;drag.moved||=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6;if(drag.moved){if(state.mode==='walk'){walkLookYaw-=(e.clientX-drag.x)*.004;walkLookPitch=THREE.MathUtils.clamp(walkLookPitch+(e.clientY-drag.y)*.003,-.6,.6);}else{state.yaw-=(e.clientX-drag.x)*.004;state.pitch=THREE.MathUtils.clamp(state.pitch+(e.clientY-drag.y)*.003,state.mode==='interior'?-.12:.15,1.38);}}drag.x=e.clientX;drag.y=e.clientY;});
  const release=e=>{if(carry){const c=carry;carry=null;canvas.style.cursor='';if(c.started){const result=c.item.drag.end(e.type==='pointerup'?rayAt(e.clientX,e.clientY):null);dropped(result);}}
    const click=e.type==='pointerup'&&drag&&!drag.moved&&pointers.size===1;const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(!pointers.size)drag=null;if(click&&p){const hit=pick(e.clientX,e.clientY);lastTap=hit?.id;interact(hit);}};['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,release));
  addEventListener('keydown',e=>{if(state.overlay||invitation.isOpen||(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable))return;if(document.activeElement!==canvas)return;
    if(e.key==='Escape'){overview();e.preventDefault();}else if(e.key==='+'||e.key==='='){zoom(.83);e.preventDefault();}else if(e.key==='-'){zoom(1/.83);e.preventDefault();}else if(e.key==='Enter'||e.key==='e'){$('#world-prompt').click();e.preventDefault();}
    else if(e.key===' '&&state.mode==='walk'){toggleWalk();e.preventDefault();}else if(e.key.startsWith('Arrow')){if(state.mode==='walk'){if(e.key==='ArrowLeft')walkLookYaw+=.1;if(e.key==='ArrowRight')walkLookYaw-=.1;if(e.key==='ArrowUp')walkLookPitch=Math.min(.6,walkLookPitch+.08);if(e.key==='ArrowDown')walkLookPitch=Math.max(-.6,walkLookPitch-.08);}else{if(e.key==='ArrowLeft')state.yaw+=.10;if(e.key==='ArrowRight')state.yaw-=.10;if(e.key==='ArrowUp')state.pitch=Math.min(1.38,state.pitch+.08);if(e.key==='ArrowDown')state.pitch=Math.max(.15,state.pitch-.08);}e.preventDefault();}});
  addEventListener('blur',()=>{if(carry?.started)carry.item.drag.end(null);carry=null;drag=null;pointers.clear();});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stopped=true;cancelAnimationFrame(raf);$('#world-error').hidden=false;});
  document.addEventListener('visibilitychange',()=>{audio.pause(document.hidden);if(document.hidden){cancelAnimationFrame(raf);last=0;drag=null;pointers.clear();}else if(!stopped){last=0;raf=requestAnimationFrame(frame);}});addEventListener('resize',resize);addEventListener('pagehide',e=>{if(!e.persisted)dispose();});}
function dispose(){if(disposed)return;disposed=true;stopped=true;cancelAnimationFrame(raf);clearTimeout(speechTimer);captionObserver?.disconnect();pathWalk?.dispose();invitation.destroy();notebook?.destroy();content?.dispose();overviewBatches?.dispose();diary?.dispose();talkNotes?.dispose();stories?.dispose();architecture?.dispose();cats?.dispose();magic?.dispose();landscape?.dispose();garden?.dispose();brush?.dispose();aa?.dispose();environment?.dispose();audio.dispose();renderer?.dispose();}
async function init(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'default'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;aa=createDisplayAntialias(renderer);
  scene=new THREE.Scene();scene.background=new THREE.Color('#0a172a');scene.fog=new THREE.Fog('#0a172a',180,400);camera=new THREE.PerspectiveCamera(44,1,.07,900);
  const pmrem=new THREE.PMREMGenerator(renderer),environmentRoom=new RoomEnvironment();environment=pmrem.fromScene(environmentRoom,.04,.1,100,{size:low?64:128}).texture;scene.environment=environment;scene.environmentIntensity=.30;pmrem.dispose();environmentRoom.dispose();
  key=new THREE.DirectionalLight('#c5d6eb',.88);key.position.set(-18,38,19);key.target.position.set(10,0,-13);key.castShadow=true;key.shadow.mapSize.set(low?512:1024,low?512:1024);Object.assign(key.shadow.camera,{left:-43,right:43,top:40,bottom:-32,near:.1,far:130});key.shadow.bias=-.00006;key.shadow.normalBias=.009;
  const hemi=new THREE.HemisphereLight('#a3bccd','#574b3e',.36),fill=new THREE.DirectionalLight('#e5c7a2',.12);fill.position.set(35,12,8);fill.target.position.set(10,0,-13);scene.environmentIntensity=.23;scene.add(key,key.target,hemi,fill,fill.target);
  interiorLight=new THREE.PointLight('#ffd298',4.2,8,2);interiorLight.castShadow=true;interiorLight.shadow.mapSize.set(low?128:256,low?128:256);interiorLight.shadow.normalBias=.012;interiorLight.visible=false;scene.add(interiorLight);
  [garden,cats]=await Promise.all([createFaithfulWorldScene({data:window.HJ_DATA,quality}),createMagicCats({quality,reduced})]);scene.add(garden.root,cats.root);garden.setTheme(true);
  magic=createMagicChapters({stations:garden.stations,data:window.HJ_DATA,quality,reduced,onDiscover:record});magic.setTheme(true);scene.add(magic.root);
  architecture=createMagicArchitecture({stations:garden.stations,quality,reduced});
  stories=createHiddenStories({stations:garden.stations,quality,reduced,onDiscover:record,onOverlay:setOverlay,onGo:returnToDiscovery});
  diary=createInkDiary({station:station('writing'),quality,reduced,onOverlay:setOverlay,onDiscover:record});
  talkNotes=createTalkNotes({station:station('talks'),data:window.HJ_DATA,quality,reduced,onOverlay:setOverlay});
  landscape=await createMagicLandscape({quality,reduced,stations:garden.stations,extraBlockers:extraWorldBlockers(),floorAt:garden.floorAt,isPassable:garden.passable});landscape.setTheme(true);scene.add(landscape.root);
  enchant=createEnchantment({scene,renderer,landscape,garden,quality,reduced,onStory:(id,storyId)=>returnToDiscovery(id,storyId),onOwl(){go('contact');say('Hoo hoo! The owl post runs day and night. Leave Hanjing a letter anytime.');},onWhiteboard(){say('A little nod to The Big Bang Theory. It was my first glimpse of research life, and I have watched it more times than I can count. Somewhere between the whiteboards and the takeout, research started to look like a wonderful way to live. These days my own board mixes the physics with attention, gradients and a few questions that keep me up at night.');},onLetters(){say('Letters, letters everywhere. I am always waiting for yours. The owl post by the Letter Tree delivers day and night, and the Lantern Theatre sends notes straight to me.');},onIceberg(){say('An iceberg. Even after a PhD, I have seen only the tip of it. Most of what there is to know is still under the water, and that is exactly what I want to keep exploring.');},onPagoda(){say('A porcelain pagoda, after the Porcelain Tower of Nanjing. Stories of that tower reached France and inspired the Trianon de Porcelaine at Versailles, with its blue and white roof. I love that kind of dream, East and West imagining each other, so it became the style of this whole little world.');},onWhale(){say('A whale in the deep. My name, Hanjing, sounds a little like the Chinese word for whale. Whales carry an ancient kind of wisdom and keep diving toward the unknown. And there is only one whale here, because the search for answers can be a little lonely. I keep swimming anyway.');}});scene.add(enchant.root);
  caseClues=createCaseClues({low,reduced,onFound(clue,point){const result=casebook?.find(clue);if(result?.fresh)enchant?.burst(point);say(result?.line||clue.say);}});scene.add(caseClues.root);
  pathWalk=createPathWalk({routes:landscape.walkRoutes,reduced,eyeHeight:1.55,speed:1.6,arrivalDuration:1.3,blockers:walkingBlockers,aerialBlockers:garden.stations.map(s=>{s.root.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(s.root);return{id:s.id+'-roof',min:b.min.toArray(),max:b.max.toArray()};}),groundAt:(x,z)=>Math.max(.002,garden.floorAt(x,z)),isPassable:garden.passable});
  cats.placeXiaoHei(station('life'));cats.placeAtChapter(station('home'),garden);brush=createWritingBrush();brush.root.visible=false;scene.add(brush.root);
  content=createContent({go,action,say,talk(){},setOverlay,theater(){}});content.expandGuide(false);
  notebook=createMagicNotebook({metadata:{chapters:[...magic.metadata.chapters,...stories.metadata.entries,diary.metadata.entry]},onRead:id=>content.openPanel(id),onGo:returnToDiscovery,onOverlay:setOverlay});
  casebook=createCasebook({data:window.HJ_DATA,onOverlay:setOverlay,onGo:id=>go(id)});
  for(const id of notebook.ids){const event=magic.discover(id,{notify:false})||stories.discover(id,{notify:false})||(id===diary.metadata.entry.id?diary.metadata.entry:null);if(event)landscape.discover?.(event.station);}
  if(invitation.isOpen&&invitation.element.classList.contains('magic-invitation-has-read'))record(magic.discover('home',{notify:false}));
  overviewBatches=createOverviewBatches(garden.stations);const initialChapter=location.hash.slice(1);
  bind();state.ready=true;resize();$('#loading').hidden=true;overview();if(invitation.isOpen)setOverlay('invitation');invitation.setReady(true);if(station(initialChapter))go(initialChapter);raf=requestAnimationFrame(frame);
  window.__HANJING_3D__={state,go,overview,enterRoom,leaveRoom,currentRoom,focusStory,perform:action,pick,interact,renderer,scene,camera,garden,cats,actors:cats,magic,landscape,invitation,notebook,diary,stories,architecture,pathWalk,get talkNotes(){return talkNotes;},textureMemory,overviewBatches,
    metrics:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,quality,humanModels:0}),
    get lastTap(){return lastTap;},getInteractionTargets(){scene.updateMatrixWorld(true);return interactionItems().map(i=>{const objects=(i.objects||[i.object]).filter(o=>o?.isObject3D);const p=objects.length?new THREE.Box3().setFromObject(objects[0]).getCenter(new THREE.Vector3()):new THREE.Vector3(...i.point);p.project(camera);return{id:i.id,type:i.type,station:i.station,x:(p.x*.5+.5)*canvas.clientWidth,y:(-.5*p.y+.5)*canvas.clientHeight+canvas.getBoundingClientRect().top,visible:objects.some(isPickable)&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};});}};
  if(new URLSearchParams(location.search).has('qa'))window.__CRYSTAL_QA__={pause:value=>{paused=!!value;qaRenderOnce=true;},renderOnce(){qaRenderOnce=true;},advanceWalk(dt){const pose=pathWalk.update(state.overlay?0:dt);qaRenderOnce=true;return pose?pathWalk.getState():null;},finishCamera(){if(state.mode!=='walk'){target.copy(desired);state.distance=wantedDistance;}else{camera.fov=walkFov;camera.updateProjectionMatrix();}qaRenderOnce=true;},get content(){return content;},get scene(){return scene;},get enchant(){return enchant;},get renderer(){return renderer;},get camera(){return camera;},get diary(){return diary;},get casebook(){return casebook;},get caseClues(){return caseClues;},get talkNotes(){return talkNotes;}};
}
init().catch(error=>{console.error('The crystal world could not open:',error);$('#loading').hidden=true;$('#world-error').hidden=false;invitation.setReady(false);invitation.element.querySelector('.magic-enter-label').textContent='3D is unavailable here';invitation.element.querySelector('.magic-invitation-status').textContent='You can still read the invitation, or use Interactive 2D and Basic above.';});
