import * as THREE from 'three';
import {createFaithfulHomeWritingLife} from './fidelity-home-writing-life.js';
import {createFaithfulEducationContact} from './fidelity-education-contact.js';
import {createFaithfulResearch} from './fidelity-research.js';
import {createFaithfulTalks} from './fidelity-talks.js';

// One physical coordinate system, preserving the seven original chapter centres.
const chapters=[['home','Welcome',700],['research','Research',1750],['talks','Talks',2850],['education','Education',4000],['writing','Writing',5050],['life','Life',6000],['contact','Contact',6900]];
const researchScale=(600/85)/15.34;

export async function createFaithfulWorldScene({data,quality='high'}={}) {
  const root=new THREE.Group();root.name='Hanjing — seven original courtyards';
  const [hwl,ec,research,talks]=await Promise.all([
    createFaithfulHomeWritingLife({data,quality}),createFaithfulEducationContact({data,quality}),
    createFaithfulResearch({data,quality}),createFaithfulTalks({data,quality})
  ]);
  const byId=new Map([...hwl.scenes,...ec.scenes].map(s=>[s.id,s]));
  byId.set('research',{...research,id:'research'});byId.set('talks',{...talks,id:'talks'});
  byId.get('contact').setMailProgress=ec.setMailProgress;
  const stations=[],interactables=[];
  for(const [id,label,oldX] of chapters){
    const source=byId.get(id),x=(oldX-700)/85,scale=source.worldScale??(id==='research'?researchScale:1);
    const group=source.root;group.removeFromParent();group.position.x=x;group.scale.setScalar(scale);root.add(group);
    const worldPoint=p=>[x+p[0]*scale,p[1]*scale,p[2]*scale];
    const stand=worldPoint(source.stand|| (Array.isArray(source.actionStand)?source.actionStand:[0,0,1.4]));
    const actions={};
    if(source.actionStand&&!Array.isArray(source.actionStand))for(const [action,p]of Object.entries(source.actionStand)){
      actions[action]={...p,point:worldPoint(p.point),approach:p.approach?.map(worldPoint)};
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
      camera:room.camera&&{target:worldPoint(room.camera.target),offset:room.camera.offset.map(v=>v*scale)},
      doorRoutes:room.doorRoutes&&Object.fromEntries(Object.entries(room.doorRoutes).map(([key,p])=>[key,{entry:worldPoint(p.entry),inside:worldPoint(p.inside),exit:worldPoint(p.exit)}]))}));
    const station={id,label,x,root:group,stand,actionStand:actions,interactables:items,source,scale,worldPoint,rooms};
    stations.push(station);
  }
  root.updateMatrixWorld(true);
  function floorAt(x,z){
    const s=stations.find(s=>Math.abs(s.x-x)<5.5);if(!s)return 0;
    const lx=(x-s.x)/s.scale,lz=z/s.scale;
    if(s.source.floorAt)return s.source.floorAt(lx,lz)*s.scale;
    const area=s.source.walkAreas?.find(a=>lx>=a.minX&&lx<=a.maxX&&lz>=a.minZ&&lz<=a.maxZ);
    if(!area)return 0;
    return area.y*s.scale;
  }
  function passable(x,z){
    if(x< -8||x>82||z>3.16||z< -7)return false;
    const feet=floorAt(x,z),head=feet+1.65;
    for(const s of stations){
      if(Math.abs(s.x-x)>6)continue;
      const lx=(x-s.x)/s.scale,lz=z/s.scale;
      const radius=s.source.colliderRadius??(.12/s.scale);
      for(const c of s.source.colliders||[]){
        if(c.disabled)continue;
        // Campus/contact keepsakes author planar XZ bounds; interiors author
        // full XYZ boxes. Both describe solid obstacles in this same world.
        const min=c.min||c.bounds?.min?.toArray()||(Number.isFinite(c.minX)?[c.minX,0,c.minZ]:null),
          max=c.max||c.bounds?.max?.toArray()||(Number.isFinite(c.maxX)?[c.maxX,Infinity,c.maxZ]:null);
        if(min&&max&&max[1]*s.scale>feet+.035&&min[1]*s.scale<head-.025&&lx>min[0]-radius&&lx<max[0]+radius&&lz>min[2]-radius&&lz<max[2]+radius)return false;
      }
    }
    return true;
  }
  let active='home';
  const rooms=stations.flatMap(s=>s.rooms);
  function roomAt(x,z){return rooms.find(r=>x>r.bounds.min[0]+.07&&x<r.bounds.max[0]-.07&&z>r.bounds.min[2]+.07&&z<r.bounds.max[2]-.07)||null;}
  function setActive(id){active=id;const target=stations.find(s=>s.id===id);if(!target)return;
    // Hide distant interiors and their local lights, retaining the nearest two courtyards.
    for(const s of stations)s.root.visible=Math.abs(s.x-target.x)<19;
  }
  function setTheme(dark){hwl.setTheme(dark);ec.setTheme(dark);research.setTheme(dark);talks.setTheme(dark);}
  function update(time,dt,dark){hwl.update(time,dt,dark);ec.update(time,dt,dark);research.update?.(time,dt);talks.update(time,dt);}
  setActive('home');
  return {root,stations,rooms,roomAt,interactables,floorAt,passable,setActive,setTheme,update,
    diagnostics:{chapters:stations.map(s=>({id:s.id,x:s.x,scale:s.scale,stand:s.stand,interactions:s.interactables.length})),quality},
    dispose(){hwl.dispose();ec.dispose();research.dispose();talks.dispose();root.clear();}};
}
