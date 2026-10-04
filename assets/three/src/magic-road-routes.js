import * as THREE from 'three';

// The roads connect chapter forecourts, not interior action poses. Buildings
// and furniture remain authoritative; only the landscape follows these paths.
const LINKS=Object.freeze([
  ['home','research'],['research','talks'],['talks','education'],
  ['education','writing'],['writing','home'],['writing','life'],
  ['life','contact'],['contact','education']
]);
const DEFAULT_BOUNDS={minX:-20,maxX:41,minZ:-32,maxZ:3.16};
const WIDTH=1.85,CLEARANCE=.98,PLAN_CLEARANCE=1.05,GRID=.25,ARC_STEP=.025;
const coordinates=p=>Array.isArray(p)?p:p?.toArray?.();
// Deterministic hints are derived from the real seven-room collision pass.
// They avoid running A* on every phone load, but are never trusted blindly:
// every rounded curve is rechecked against this instance's actual blockers.
const HINTS={
  'road-home-research':[[1.23,1.98],[4.73,1.23],[4.73,-1.27],[2.98,-4.77],[-.77,-5.52],[-12.27,-6.27]],
  'road-research-talks':[[-12.27,-6.27],[-7.77,-6.27],[-4.52,-9.52]],
  'road-talks-education':[[3.48,-16.52],[6.48,-16.77]],
  'road-education-writing':[[7.98,-14.02],[8.23,-7.02],[8.48,-5.52],[12.73,-5.52]],
  'road-writing-home':[[12.48,-5.27],[4.48,1.48],[-.02,1.98]],
  'road-writing-life':[[13.73,-5.27],[27.48,-5.27],[29.48,-2.52],[29.48,-.02],[26.48,1.98]],
  'road-life-contact':[[26.73,1.98],[29.48,-.02],[32.73,-8.27]],
  'road-contact-education':[[32.73,-7.52],[29.23,-7.52],[19.48,-18.52],[14.48,-19.27]]
};

function colliderBox(c,station=null){
  const min=coordinates(c.min||c.bounds?.min)||(Number.isFinite(c.minX)?[c.minX,c.minY??0,c.minZ]:null);
  const max=coordinates(c.max||c.bounds?.max)||(Number.isFinite(c.maxX)?[c.maxX,c.maxY??Infinity,c.maxZ]:null);
  if(!min||!max||!min.every(Number.isFinite)||!max.every(Number.isFinite))return null;
  const transform=station?.worldPoint;
  return{id:c.id||'solid',min:transform?transform(min):min.slice(),max:transform?transform(max):max.slice(),get disabled(){return !!c.disabled;}};
}

function createFloorAt(stations){
  return(x,z)=>{
    let y=0;
    for(const s of stations){
      const local=s.localPoint?s.localPoint([x,0,z]):[(x-s.x)/(s.scale||1),0,(z-s.z)/(s.scale||1)];
      const a=s.source?.walkAreas?.find(a=>local[0]>=a.minX&&local[0]<=a.maxX&&local[2]>=a.minZ&&local[2]<=a.maxZ);
      if(!a)continue;
      let value=s.source.floorAt?.(local[0],local[2]);
      if(!Number.isFinite(value))value=a.ramp?THREE.MathUtils.lerp(a.ramp.frontY,a.ramp.backY,THREE.MathUtils.clamp((local[2]-a.ramp.frontZ)/(a.ramp.backZ-a.ramp.frontZ),0,1)):a.y;
      if(Number.isFinite(value))y=Math.max(y,value*(s.scale||1));
    }
    return y;
  };
}

class MinHeap{
  constructor(){this.items=[];}
  push(value){const a=this.items;let i=a.length;a.push(value);while(i){const p=(i-1)>>1;if(a[p].score<=value.score)break;a[i]=a[p];i=p;}a[i]=value;}
  pop(){const a=this.items;if(!a.length)return null;const result=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(a[c].score>=last.score)break;a[i]=a[c];i=c;}a[i]=last;}return result;}
}

/**
 * Return the eight complete, metre-space road curves. Extra blockers use WORLD
 * min/max by default. A native chapter blocker must explicitly provide
 * `space:'station-local'` plus `station` so it can be transformed safely.
 * Source colliders are collected here; callers need only add landscape trees,
 * rocks, magical fixtures and stories. No mesh, material or collider is edited.
 */
export function createWalkRoadRoutes({stations=[],extraBlockers=[],floorAt,
  isPassable,bounds=DEFAULT_BOUNDS}={}){
  const byId=new Map(stations.map(s=>[s.id,s]));
  if(LINKS.some(pair=>pair.some(id=>!byId.has(id))))throw new Error('Walk roads require all seven chapter stations');
  const support=floorAt||createFloorAt(stations),all=[];
  for(const s of stations)for(const c of s.source?.colliders||[]){const b=colliderBox(c,s);if(b){b.id=s.id+'-'+b.id;all.push(b);}}
  for(const c of extraBlockers){const local=c.space==='station-local';const s=local?byId.get(c.station):null;if(local&&!s)throw new Error('Unknown local road blocker station: '+c.station);const b=colliderBox(c,s);if(b)all.push(b);}
  // Floors and roof beams do not obstruct a road-level visitor. Foundation
  // steps do: no route is allowed to silently change its paving elevation.
  const blockers=all.filter(b=>!b.disabled&&b.max[1]>.04&&b.min[1]<1.70);
  const inset={minX:bounds.minX+CLEARANCE,maxX:bounds.maxX-CLEARANCE,minZ:bounds.minZ+CLEARANCE,maxZ:bounds.maxZ-CLEARANCE};
  const diagonal=CLEARANCE/Math.sqrt(2),flatOffsets=[[0,0],[-CLEARANCE,0],[CLEARANCE,0],[0,-CLEARANCE],[0,CLEARANCE],[-diagonal,-diagonal],[-diagonal,diagonal],[diagonal,-diagonal],[diagonal,diagonal]];
  function clear(x,z,padding=PLAN_CLEARANCE){
    if(x<bounds.minX+padding||x>bounds.maxX-padding||z<bounds.minZ+padding||z>bounds.maxZ-padding)return false;
    if(blockers.some(b=>x>=b.min[0]-padding-1e-8&&x<=b.max[0]+padding+1e-8&&z>=b.min[2]-padding-1e-8&&z<=b.max[2]+padding+1e-8))return false;
    if(flatOffsets.some(([dx,dz])=>support(x+dx,z+dz)>.04))return false;
    return !isPassable||isPassable(x,z);
  }
  function intersects(a,b,box,padding=PLAN_CLEARANCE){
    let lower=0,upper=1;
    for(const axis of[0,2]){const d=b.getComponent(axis)-a.getComponent(axis),min=box.min[axis]-padding,max=box.max[axis]+padding;
      if(Math.abs(d)<1e-12){if(a.getComponent(axis)<=min||a.getComponent(axis)>=max)return false;continue;}
      let l=(min-a.getComponent(axis))/d,h=(max-a.getComponent(axis))/d;if(l>h)[l,h]=[h,l];lower=Math.max(lower,l);upper=Math.min(upper,h);if(lower>=upper)return false;
    }
    return lower<1&&upper>0;
  }
  function segmentClear(a,b,spacing=ARC_STEP,padding=PLAN_CLEARANCE){
    if(blockers.some(box=>intersects(a,b,box,padding)))return false;
    const n=Math.max(1,Math.ceil(a.distanceTo(b)/spacing));
    for(let i=0;i<=n;i++){const t=i/n;if(!clear(THREE.MathUtils.lerp(a.x,b.x,t),THREE.MathUtils.lerp(a.z,b.z,t),padding))return false;}
    return true;
  }
  const minX=inset.minX,minZ=inset.minZ,nx=Math.floor((inset.maxX-minX)/GRID)+1,nz=Math.floor((inset.maxZ-minZ)/GRID)+1,count=nx*nz;
  const grid=new Int8Array(count),point=i=>new THREE.Vector3(minX+(i%nx)*GRID,0,minZ+Math.floor(i/nx)*GRID);
  function cellClear(i){if(i<0||i>=count)return false;if(!grid[i]){const p=point(i);grid[i]=clear(p.x,p.z)?1:-1;}return grid[i]>0;}
  function nearestCell(p){const cx=Math.round((p.x-minX)/GRID),cz=Math.round((p.z-minZ)/GRID);let best=-1,distance=Infinity;
    for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const x=cx+dx,z=cz+dz;if(x<0||x>=nx||z<0||z>=nz)continue;const i=z*nx+x;if(!cellClear(i))continue;const q=point(i),d=p.distanceToSquared(q);if(d<distance&&segmentClear(p,q)){best=i;distance=d;}}
    if(best<0)throw new Error('Forecourt has no connected clear road grid');return best;
  }
  function forecourt(s){
    const room=s.rooms?.[0],entry=coordinates(room?.entry||s.stand),exit=coordinates(room?.exit||s.stand);
    if(!entry)throw new Error('Chapter has no entrance: '+s.id);
    const forward=new THREE.Vector3(exit?.[0]-entry[0]||0,0,exit?.[2]-entry[2]||1).normalize();
    if(forward.z<.25)forward.set(0,0,1);
    const lateral=new THREE.Vector3(forward.z,0,-forward.x),origin=new THREE.Vector3(entry[0],0,entry[2]),candidates=[];
    // Prefer close, directly facing forecourts. A lateral option is used only
    // when the chapter's grounded fixture occupies that front approach.
    for(let distance=0;distance<=4.5;distance+=.15)for(const offset of[0,-.35,.35,-.70,.70,-1.05,1.05,-1.4,1.4,-1.75,1.75,-2.1,2.1]){
      const p=origin.clone().addScaledVector(forward,distance).addScaledVector(lateral,offset);
      if(clear(p.x,p.z))candidates.push({p,score:distance+Math.abs(offset)*1.75});
    }
    candidates.sort((a,b)=>a.score-b.score);
    for(const {p}of candidates){try{nearestCell(p);return{point:p,entrance:entry.slice(),doorDistance:p.distanceTo(origin),floor:support(p.x,p.z)};}catch{}}
    throw new Error('No full-width exterior road forecourt for '+s.id);
  }
  const endpoints=Object.fromEntries(stations.map(s=>[s.id,forecourt(s)]));
  const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  function plan(from,to){
    const start=nearestCell(from),goal=nearestCell(to),g=new Float64Array(count).fill(Infinity),previous=new Int32Array(count).fill(-1),closed=new Uint8Array(count),heap=new MinHeap();
    g[start]=0;const gp=point(goal);heap.push({id:start,score:point(start).distanceTo(gp)});
    while(heap.items.length){const {id}=heap.pop();if(closed[id])continue;if(id===goal)break;closed[id]=1;const x=id%nx,z=Math.floor(id/nx),p=point(id);
      for(const[dx,dz]of neighbors){const xx=x+dx,zz=z+dz;if(xx<0||xx>=nx||zz<0||zz>=nz)continue;const next=zz*nx+xx;if(closed[next]||!cellClear(next))continue;if(dx&&dz&&(!cellClear(z*nx+xx)||!cellClear(zz*nx+x)))continue;const q=point(next);if(!segmentClear(p,q))continue;const distance=g[id]+GRID*Math.hypot(dx,dz);if(distance>=g[next])continue;g[next]=distance;previous[next]=id;heap.push({id:next,score:distance+q.distanceTo(gp)});}
    }
    if(!Number.isFinite(g[goal]))throw new Error('No collision-free full-width road connection');
    const route=[];for(let i=goal;i!==-1;i=previous[i])route.push(point(i));route.reverse();route.unshift(from.clone());route.push(to.clone());
    const unique=route.filter((p,i)=>!i||p.distanceToSquared(route[i-1])>1e-10),simple=[unique[0]];let i=0;
    while(i<unique.length-1){let j=unique.length-1;while(j>i+1&&!segmentClear(unique[i],unique[j]))j--;simple.push(unique[j]);i=j;}
    return simple;
  }
  function rounded(points,amount){
    const path=new THREE.CurvePath();let last=points[0].clone();
    for(let i=1;i<points.length-1;i++){const p=points[i],prev=points[i-1],next=points[i+1],radius=Math.min(amount,p.distanceTo(prev)*.28,p.distanceTo(next)*.28),a=p.clone().lerp(prev,radius/p.distanceTo(prev)),b=p.clone().lerp(next,radius/p.distanceTo(next));
      if(last.distanceToSquared(a)>1e-12)path.add(new THREE.LineCurve3(last,a));if(radius>1e-6)path.add(new THREE.QuadraticBezierCurve3(a,p.clone(),b));last=b;
    }
    if(last.distanceToSquared(points.at(-1))>1e-12)path.add(new THREE.LineCurve3(last,points.at(-1).clone()));
    return path;
  }
  let validationFailure=null;
  function validate(curve){
    const length=curve.getLength(),n=Math.max(2,Math.ceil(length/ARC_STEP));let previous=curve.getPointAt(0);
    if(!clear(previous.x,previous.z,CLEARANCE)){validationFailure={reason:'first point',point:previous.toArray()};return false;}
    for(let i=1;i<=n;i++){const p=curve.getPointAt(i/n);if(!segmentClear(previous,p,ARC_STEP,CLEARANCE)){validationFailure={progress:i/n,previous:previous.toArray(),point:p.toArray(),blockers:blockers.filter(b=>intersects(previous,p,b,CLEARANCE)).map(b=>b.id),clearPoint:clear(p.x,p.z,CLEARANCE)};return false;}previous=p;}
    return true;
  }
  return LINKS.map(([from,to])=>{
    const id='road-'+from+'-'+to;let points=[endpoints[from].point.clone(),...HINTS[id].map(([x,z])=>new THREE.Vector3(x,0,z)),endpoints[to].point.clone()],curve=null,cornerRadius=0,usedHint=true;
    const findCurve=()=>{for(const radius of[.75,.45,.28,.14,.06,0]){const candidate=rounded(points,radius);if(validate(candidate)){curve=candidate;cornerRadius=radius;break;}}};
    findCurve();
    if(!curve){usedHint=false;points=plan(endpoints[from].point,endpoints[to].point);findCurve();}
    if(!curve)throw new Error('Rounded road failed full-width collision validation: '+from+' → '+to+' '+JSON.stringify(validationFailure));
    const length=curve.getLength(),startPoint=curve.getPointAt(0).setY(.002).toArray(),endPoint=curve.getPointAt(1).setY(.002).toArray();
    return{id,from,to,curve,width:WIDTH,groundY:.002,length,startPoint,endPoint,
      samples:curve.getSpacedPoints(Math.max(32,Math.ceil(length/.16))),
      diagnostics:{fullCorridorClear:true,corridorHalfWidth:CLEARANCE,arcValidationMetres:ARC_STEP,cornerRadius,usedValidatedHint:usedHint,controlPoints:points.map(p=>p.toArray()),blockerCount:blockers.length,
        forecourts:{from:{point:startPoint,entrance:endpoints[from].entrance,distance:endpoints[from].doorDistance,floor:endpoints[from].floor},to:{point:endPoint,entrance:endpoints[to].entrance,distance:endpoints[to].doorDistance,floor:endpoints[to].floor}},
        dynamicDoors:'Current geometry is planned conservatively; walking controller still checks real colliders on every frame.'}};
  });
}
