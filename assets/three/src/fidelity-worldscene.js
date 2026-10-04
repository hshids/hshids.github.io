import * as THREE from 'three';
import {createFaithfulHomeWritingLife} from './fidelity-home-writing-life.js';
import {createFaithfulEducationContact} from './fidelity-education-contact.js';
import {createFaithfulResearch} from './fidelity-research.js';
import {createFaithfulTalks} from './fidelity-talks.js';

// The chapter identities stay stable while their landmarks form a branching
// garden in XZ. All points authored by a chapter remain in its local metres.
export const WORLD_LAYOUT=Object.freeze({
  home:Object.freeze([0,0]),research:Object.freeze([-12,-10]),talks:Object.freeze([0,-22]),
  education:Object.freeze([13,-23]),writing:Object.freeze([13,-9]),life:Object.freeze([22,0]),contact:Object.freeze([32,-11])
});
export const WORLD_BOUNDS=Object.freeze({minX:-20,maxX:41,minZ:-32,maxZ:3.16});
const chapters=[['home','Welcome'],['research','Research'],['talks','Talks'],['education','Education'],['writing','Writing'],['life','Life'],['contact','Contact']];
const links=[['home','research'],['research','talks'],['talks','education'],['education','writing'],['writing','life'],['life','contact'],['home','writing'],['home','life'],['writing','contact']];
const researchScale=(600/85)/15.34,visibilityRadius=22;
const coordinates=p=>Array.isArray(p)?p:p.toArray();
function visibleBounds(group){
  group.updateMatrixWorld(true);const bounds=new THREE.Box3();
  group.traverseVisible(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.every(m=>m.visible===false))return;bounds.union(new THREE.Box3().setFromObject(o));});
  return bounds;
}
function colliderBounds(c){
  const min=c.min?coordinates(c.min):c.bounds?.min?coordinates(c.bounds.min):Number.isFinite(c.minX)?[c.minX,c.minY??0,c.minZ]:null;
  const max=c.max?coordinates(c.max):c.bounds?.max?coordinates(c.bounds.max):Number.isFinite(c.maxX)?[c.maxX,c.maxY??Infinity,c.maxZ]:null;
  return min&&max?{min,max}:null;
}
const containsXZ=(bounds,x,z,margin=0)=>x>=bounds.min[0]-margin&&x<=bounds.max[0]+margin&&z>=bounds.min[2]-margin&&z<=bounds.max[2]+margin;

export async function createFaithfulWorldScene({data,quality='high'}={}) {
  const root=new THREE.Group();root.name='Hanjing — seven branching garden landmarks';
  const [hwl,ec,research,talks]=await Promise.all([
    createFaithfulHomeWritingLife({data,quality}),createFaithfulEducationContact({data,quality}),
    createFaithfulResearch({data,quality}),createFaithfulTalks({data,quality})
  ]);
  const byId=new Map([...hwl.scenes,...ec.scenes].map(s=>[s.id,s]));
  byId.set('research',{...research,id:'research'});byId.set('talks',{...talks,id:'talks'});
  byId.get('contact').setMailProgress=ec.setMailProgress;
  const stations=[],interactables=[];
  for(const [id,label]of chapters){
    const source=byId.get(id),[x,z]=WORLD_LAYOUT[id],scale=source.worldScale??(id==='research'?researchScale:1);
    // Capture only real visible geometry while it is still in local space;
    // hidden picking boxes do not enlarge a landmark's physical footprint.
    const b=visibleBounds(source.root),localBounds={min:b.min.toArray(),max:b.max.toArray()};
    const collisionBounds={min:localBounds.min.slice(),max:localBounds.max.slice()};
    for(const c of source.colliders||[]){const q=colliderBounds(c);if(!q)continue;for(const axis of[0,2]){collisionBounds.min[axis]=Math.min(collisionBounds.min[axis],q.min[axis]);collisionBounds.max[axis]=Math.max(collisionBounds.max[axis],q.max[axis]);}}
    const group=source.root;group.removeFromParent();group.position.set(x,0,z);group.scale.setScalar(scale);root.add(group);
    const worldPoint=p=>{const q=coordinates(p);return[x+q[0]*scale,q[1]*scale,z+q[2]*scale];};
    const localPoint=p=>{const q=coordinates(p);return[(q[0]-x)/scale,q[1]/scale,(q[2]-z)/scale];};
    const stand=worldPoint(source.stand||(Array.isArray(source.actionStand)?source.actionStand:[0,0,1.4]));
    const actions={};
    if(source.actionStand&&!Array.isArray(source.actionStand))for(const [action,p]of Object.entries(source.actionStand)){
      actions[action]={...p,point:worldPoint(p.point),approach:p.approach?.map(worldPoint),contactPoint:p.contactPoint&&worldPoint(p.contactPoint)};
    }
    if(id==='writing'){
      const cushion=group.userData.cushion;
      if(cushion?.seat)actions.write={point:worldPoint([cushion.seat[0],source.actionStand[1],cushion.seat[2]]),facing:Math.PI,approach:[worldPoint(source.actionStand)]};
    }
    const items=(source.interactables||[]).map(item=>({...item,station:id,chapter:id,
      point:worldPoint(item.point),stand:worldPoint(item.stand||source.stand||[0,0,1.4]),
      contactPoint:item.contactPoint&&worldPoint(item.contactPoint),approach:item.approach?.map(worldPoint),insideApproach:item.insideApproach?.map(worldPoint)}));
    interactables.push(...items);
    const rooms=(source.rooms||[]).map(room=>({...room,station:id,source:room,
      bounds:{min:worldPoint(room.bounds.min),max:worldPoint(room.bounds.max)},
      entry:worldPoint(room.entry),inside:worldPoint(room.inside),exit:worldPoint(room.exit),
      rearExit:room.rearExit&&worldPoint(room.rearExit),
      camera:room.camera&&{...room.camera,target:worldPoint(room.camera.target),offset:room.camera.offset.map(v=>v*scale)},
      doorRoutes:room.doorRoutes&&Object.fromEntries(Object.entries(room.doorRoutes).map(([key,p])=>[key,{...p,entry:worldPoint(p.entry),inside:worldPoint(p.inside),exit:worldPoint(p.exit)}]))}));
    const firstRoom=source.rooms?.[0],targetBounds=firstRoom?.bounds||localBounds;
    const localExploreTarget=coordinates(targetBounds.min).map((v,i)=>(v+coordinates(targetBounds.max)[i])/2),exploreTarget=worldPoint(localExploreTarget);
    stations.push({id,label,x,z,position:[x,0,z],root:group,stand,actionStand:actions,interactables:items,source,scale,worldPoint,localPoint,rooms,
      localBounds,collisionBounds,bounds:{min:worldPoint(localBounds.min),max:worldPoint(localBounds.max)},localExploreTarget,exploreTarget});
  }
  root.updateMatrixWorld(true);
  function floorAt(x,z){
    let height=0;
    for(const s of stations){
      const lx=(x-s.x)/s.scale,lz=(z-s.z)/s.scale;
      // Exact support areas choose the floor; neither an X-only nor a nearest
      // chapter lookup can confuse stacked Z positions such as Home/Talks.
      const area=s.source.walkAreas?.find(a=>lx>=a.minX&&lx<=a.maxX&&lz>=a.minZ&&lz<=a.maxZ);
      if(!area)continue;
      let localHeight;
      if(s.source.floorAt)localHeight=s.source.floorAt(lx,lz);
      else if(area.ramp){const r=area.ramp,t=THREE.MathUtils.clamp((lz-r.frontZ)/(r.backZ-r.frontZ),0,1);localHeight=THREE.MathUtils.lerp(r.frontY,r.backY,t);}
      else localHeight=area.y;
      if(Number.isFinite(localHeight))height=Math.max(height,localHeight*s.scale);
    }
    return height;
  }
  function passable(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z)||x<WORLD_BOUNDS.minX||x>WORLD_BOUNDS.maxX||z<WORLD_BOUNDS.minZ||z>WORLD_BOUNDS.maxZ)return false;
    const feet=floorAt(x,z),head=feet+1.65;
    for(const s of stations){
      const lx=(x-s.x)/s.scale,lz=(z-s.z)/s.scale,radius=s.source.colliderRadius??(.12/s.scale);
      if(!containsXZ(s.collisionBounds,lx,lz,radius))continue;
      for(const c of s.source.colliders||[]){
        if(c.disabled)continue;const b=colliderBounds(c);if(!b)continue;
        if(b.max[1]*s.scale>feet+.035&&b.min[1]*s.scale<head-.025&&lx>b.min[0]-radius&&lx<b.max[0]+radius&&lz>b.min[2]-radius&&lz<b.max[2]+radius)return false;
      }
    }
    return true;
  }
  const rooms=stations.flatMap(s=>s.rooms);
  function roomAt(x,z){return rooms.find(r=>x>r.bounds.min[0]+.07&&x<r.bounds.max[0]-.07&&z>r.bounds.min[2]+.07&&z<r.bounds.max[2]-.07)||null;}
  let active='overview';
  function setActive(id){
    if(id===null||id==='overview'){active='overview';for(const s of stations)s.root.visible=true;return;}
    const target=stations.find(s=>s.id===id);if(!target)return;active=id;
    for(const s of stations)s.root.visible=Math.hypot(s.x-target.x,s.z-target.z)<=visibilityRadius;
  }
  const zones=stations.map(s=>({id:s.id,label:s.label,position:s.position.slice(),min:s.bounds.min.slice(),max:s.bounds.max.slice(),exploreTarget:s.exploreTarget.slice()}));
  const overlaps=[];
  for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++){
    const a=zones[i],b=zones[j],dx=Math.min(a.max[0],b.max[0])-Math.max(a.min[0],b.min[0]),dz=Math.min(a.max[2],b.max[2])-Math.max(a.min[2],b.min[2]);
    if(dx>0&&dz>0)overlaps.push({a:a.id,b:b.id,overlapX:dx,overlapZ:dz});
  }
  // Topology only: these edges describe chapter relationships, not collision-
  // certified straight walking segments or an instruction to cross a building.
  const routeGraph={nodes:stations.map(s=>({id:s.id,point:s.stand.slice()})),edges:links.map(([from,to])=>({from,to}))};
  function setTheme(dark){hwl.setTheme(dark);ec.setTheme(dark);research.setTheme(dark);talks.setTheme(dark);}
  function update(time,dt,dark){hwl.update(time,dt,dark);ec.update(time,dt,dark);research.update?.(time,dt);talks.update(time,dt);}
  setActive('overview');
  return {root,stations,rooms,roomAt,interactables,floorAt,passable,setActive,setTheme,update,bounds:WORLD_BOUNDS,layout:WORLD_LAYOUT,zones,routeGraph,
    get active(){return active;},
    diagnostics:{chapters:stations.map(s=>({id:s.id,x:s.x,z:s.z,position:s.position.slice(),scale:s.scale,stand:s.stand,exploreTarget:s.exploreTarget,bounds:s.bounds,interactions:s.interactables.length,rooms:s.rooms.map(r=>({id:r.id,entry:r.entry,inside:r.inside,exit:r.exit}))})),overlaps,bounds:WORLD_BOUNDS,visibilityRadius,overviewShowsAll:true,quality},
    dispose(){hwl.dispose();ec.dispose();research.dispose();talks.dispose();root.clear();}};
}
