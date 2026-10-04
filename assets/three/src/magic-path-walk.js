import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
const vec=value=>value?.isVector3?value.clone():Array.isArray(value)?new THREE.Vector3(...value):null;

/** Eye-level exploration follows the very same curves as the stone paving.
 * This owns only a camera pose: no avatar, renderer, DOM, geometry or clock. */
export function createPathWalk({routes=[],eyeHeight=1.55,reduced=false,speed=1.6,
  arrivalDuration=1.3,radius=.15,blockers=[],aerialBlockers=blockers,
  isPassable=null,isRoad=null,groundAt=null,nearbyDistance=1.4}={}){
  const routeMap=new Map(),invalidRoutes=[];
  for(const source of routes){
    const curve=source.curve,length=Number(source.length)||curve?.getLength?.();
    if(!source.id||routeMap.has(source.id)||!curve?.getPointAt||!Number.isFinite(length)||length<.02){invalidRoutes.push(source.id||'unnamed');continue;}
    const r={...source,curve,length,groundY:Number.isFinite(source.groundY)?source.groundY:.002};
    // Three's default 200-segment arc cache can cause visible speed changes
    // on tightly curved paths. Sample its actual curve more finely without
    // changing the shared curve or the already-authored paving geometry.
    const divisions=Math.max(512,Math.ceil(length/.012)),distances=new Float64Array(divisions+1);
    let previous=curve.getPoint?curve.getPoint(0):curve.getPointAt(0);
    for(let i=1;i<=divisions;i++){const p=curve.getPoint?curve.getPoint(i/divisions):curve.getPointAt(i/divisions);distances[i]=distances[i-1]+p.distanceTo(previous);previous=p;}
    r.arcDistances=distances;r.length=distances[divisions];
    // A small, precomputed upper envelope eases the camera over real entrance
    // steps. It never puts the eye below floor + eyeHeight, and uses no bob.
    const count=Math.max(32,Math.ceil(r.length/.035)),raw=[];
    for(let i=0;i<=count;i++){const p=curvePoint(r,i/count,new THREE.Vector3()),floor=groundAt?.(p.x,p.z);raw.push(Number.isFinite(floor)?Math.max(r.groundY,floor):r.groundY);}
    r.heightProfile=raw.map((height,i)=>{let value=height;const extent=Math.ceil(.22/r.length*count);for(let j=Math.max(0,i-extent);j<=Math.min(count,i+extent);j++){const distance=Math.abs(j-i)*r.length/count,weight=smooth(clamp(1-distance/.22,0,1));value=Math.max(value,r.groundY+(raw[j]-r.groundY)*weight);}return value;});
    routeMap.set(source.id,r);
  }
  const position=new THREE.Vector3(),target=new THREE.Vector3(),foot=new THREE.Vector3(),nextFoot=new THREE.Vector3(),heading=new THREE.Vector3(0,0,-1),desiredHeading=new THREE.Vector3(),scratch=new THREE.Vector3();
  const output={position,target,active:false,done:false,routeId:null,progress:0,direction:1,phase:'inactive',paused:false,blocked:false,from:null,to:null};
  let active=false,disposed=false,route=null,direction=1,progress=0,interval=null,
    phase='inactive',paused=false,done=false,blocked=false,elapsed=0,flight=null,
    journey=null,lastReason=null,safeIntervals=[];

  function bounds(source){
    const list=typeof source==='function'?source():source,result=[];
    for(const b of list||[]){
      if(!b||b.disabled)continue;
      const low=b.min||b.bounds?.min||(Number.isFinite(b.minX)?[b.minX,b.minY??0,b.minZ]:null);
      const high=b.max||b.bounds?.max||(Number.isFinite(b.maxX)?[b.maxX,b.maxY??Infinity,b.maxZ]:null);
      const min=low?.isVector3?low.toArray():low,max=high?.isVector3?high.toArray():high;
      if(!min||!max||[...min,...max].some(v=>Number.isNaN(v)))continue;
      result.push({id:b.id||null,min,max});
    }
    return result;
  }
  function curvePoint(r,t,out){const distances=r.arcDistances,at=clamp(t,0,1)*r.length;let low=0,high=distances.length-1;while(low<high){const mid=(low+high)>>1;if(distances[mid]<at)low=mid+1;else high=mid;}const before=Math.max(0,low-1),span=distances[low]-distances[before],fraction=span?(at-distances[before])/span:0,u=(before+fraction)/(distances.length-1);return r.curve.getPoint?r.curve.getPoint(u,out):r.curve.getPointAt(u,out);}
  function pointOn(r,t,out=nextFoot){curvePoint(r,t,out);const floor=groundAt?.(out.x,out.z);out.y=Number.isFinite(floor)?Math.max(r.groundY,floor):r.groundY;return out;}
  function comfortHeight(r,t){const at=clamp(t,0,1)*(r.heightProfile.length-1),a=Math.floor(at),b=Math.min(a+1,r.heightProfile.length-1);return Math.max(pointOn(r,t,scratch).y,THREE.MathUtils.lerp(r.heightProfile[a],r.heightProfile[b],at-a));}
  function insideXZ(p,b,padding=radius){return p.x>b.min[0]-padding&&p.x<b.max[0]+padding&&p.z>b.min[2]-padding&&p.z<b.max[2]+padding;}
  function safePoint(p,list){
    if(isPassable&&!isPassable(p.x,p.z))return false;
    return !list.some(b=>b.max[1]>p.y+.055&&b.min[1]<p.y+eyeHeight+radius&&insideXZ(p,b));
  }
  // Slab intersection catches even a narrow wall between two good samples.
  function crossesBox(a,b,box,padding=radius){
    let first=0,last=1;
    for(const axis of ['x','y','z']){
      const i=axis==='x'?0:axis==='y'?1:2,d=b[axis]-a[axis],min=box.min[i]-padding,max=box.max[i]+padding;
      if(Math.abs(d)<1e-10){if(a[axis]<=min||a[axis]>=max)return false;continue;}
      let enter=(min-a[axis])/d,exit=(max-a[axis])/d;if(enter>exit)[enter,exit]=[exit,enter];
      first=Math.max(first,enter);last=Math.min(last,exit);if(first>last)return false;
    }
    return last>0&&first<1;
  }
  function safeGroundSegment(a,b,list){
    if(!safePoint(a,list)||!safePoint(b,list))return false;
    // A walking body's vertical range is swept, not just the eye's point.
    const bodyBoxes=list.filter(v=>v.max[1]>Math.min(a.y,b.y)+.055&&v.min[1]<Math.max(a.y,b.y)+eyeHeight+radius);
    const aa=new THREE.Vector3(a.x,0,a.z),bb=new THREE.Vector3(b.x,0,b.z);
    if(bodyBoxes.some(v=>crossesBox(aa,bb,{min:[v.min[0],-1,v.min[2]],max:[v.max[0],1,v.max[2]]})))return false;
    const count=Math.max(1,Math.ceil(a.distanceTo(b)/.055));
    for(let i=1;i<count;i++){scratch.lerpVectors(a,b,i/count);if(!safePoint(scratch,list)||(isRoad&&!isRoad(scratch)))return false;}
    return true;
  }
  function intervalsFor(r,list){
    const count=Math.max(32,Math.ceil(r.length/.055)),ranges=[];
    let first=null,previous=null;
    for(let i=0;i<=count;i++){
      const t=i/count,p=pointOn(r,t,new THREE.Vector3()),safe=safePoint(p,list);
      const joined=safe&&previous&&safeGroundSegment(previous,p,list);
      if(safe&&(first===null||!previous||joined)){if(first===null)first=t;}
      else if(first!==null){const end=(i-1)/count;if((end-first)*r.length>.07)ranges.push({min:first,max:end});first=safe?t:null;}
      previous=safe?p:null;
    }
    if(first!==null&&(1-first)*r.length>.07)ranges.push({min:first,max:1});
    // Stop a few centimetres before a collider, while preserving true ends.
    return ranges.map(v=>({min:v.min?Math.min(v.max,v.min+.018/r.length):0,max:v.max<1?Math.max(v.min,v.max-.018/r.length):1})).filter(v=>(v.max-v.min)*r.length>.055);
  }
  function closest(r,p){
    const count=Math.max(64,Math.ceil(r.length/.18));let t=0,d=Infinity;
    for(let i=0;i<=count;i++){const q=pointOn(r,i/count,scratch),dd=(q.x-p.x)**2+(q.z-p.z)**2;if(dd<d){t=i/count;d=dd;}}
    let left=Math.max(0,t-1/count),right=Math.min(1,t+1/count);
    const distance=t=>{const q=pointOn(r,t,scratch);return(q.x-p.x)**2+(q.z-p.z)**2;};
    for(let i=0;i<12;i++){const a=(2*left+right)/3,b=(left+2*right)/3;if(distance(a)<distance(b))right=b;else left=a;}
    const refined=(left+right)/2;if(distance(refined)<d)t=refined;
    return{progress:t,distance:Math.sqrt(distance(t))};
  }
  function nearest(r,t,ranges,air){
    let best=null,bestDistance=Infinity;
    for(const range of ranges){
      const at=clamp(t,range.min,range.max),candidates=[at];
      if(air){const count=Math.ceil((range.max-range.min)*r.length/.07);for(let i=0;i<=count;i++)candidates.push(THREE.MathUtils.lerp(range.min,range.max,i/Math.max(1,count)));}
      for(const value of candidates){const p=pointOn(r,value,scratch);if(air&&air.some(b=>b.max[1]>p.y+eyeHeight-radius&&insideXZ(p,b)))continue;const distance=Math.abs(value-t);if(distance<bestDistance){best={progress:value,range};bestDistance=distance;}}
    }
    return best;
  }
  function look(r,t,dir,out){
    const here=pointOn(r,t,new THREE.Vector3()),ahead=pointOn(r,t+dir*2.25/r.length,new THREE.Vector3());out.subVectors(ahead,here);out.y=0;
    if(out.lengthSq()<1e-6){r.curve.getTangentAt(t,out);out.y=0;out.multiplyScalar(dir);}
    return out.lengthSq()>1e-8?out.normalize():out.set(0,0,-1);
  }
  function makeFlight(start,end,startTarget,air,duration,groundOnly=false){
    const boxes=groundOnly?[]:air,ceiling=groundOnly?0:Math.max(12,start.y,end.y,...boxes.map(b=>Number.isFinite(b.max[1])?b.max[1]+.6:0));
    for(const lift of groundOnly?[0]:[0,2,5,10,20,40]){
      const a=start.clone(),b=start.clone(),c=end.clone(),d=end.clone();
      if(!groundOnly){b.y=ceiling+lift;c.y=ceiling+lift;}
      const curve=new THREE.CubicBezierCurve3(a,b,c,d);let previous=a,valid=true;
      for(let i=1;i<=100;i++){const p=curve.getPoint(i/100);if(boxes.some(box=>crossesBox(previous,p,box))){valid=false;break;}previous=p;}
      if(valid)return{curve,duration,startTarget:startTarget.clone(),endTarget:end.clone().addScaledVector(desiredHeading,3).add(new THREE.Vector3(0,-.06,0)),groundOnly};
    }
    return null;
  }
  function makeJourney(){
    const end=direction>0?interval.max:interval.min,length=Math.abs(end-progress)*route.length;
    const factor=Math.min(1,length/(speed*.5*(.36+.48))),accel=.36*factor,decel=.48*factor;
    return{start:progress,end,length,accel,decel,duration:length/speed+(accel+decel)/2};
  }
  function travelled(j,t){
    if(t>=j.duration)return j.length;
    if(j.accel&&t<j.accel){const q=t/j.accel;return speed*j.accel*(q**3-.5*q**4);}
    const cruiseEnd=j.duration-j.decel,accelDistance=speed*j.accel/2;
    if(t<=cruiseEnd)return accelDistance+speed*(t-j.accel);
    const q=(t-cruiseEnd)/j.decel;return j.length-speed*j.decel/2+speed*j.decel*(q-q**3+.5*q**4);
  }
  function endStation(){return done&&route?(direction>0&&progress>=1-1e-7?route.to:direction<0&&progress<=1e-7?route.from:null):null;}
  function stopReason(){return blocked?lastReason:done?(endStation()?'route-end':'safe-path-end'):null;}
  function sync(){Object.assign(output,{active,done,routeId:route?.id||null,progress,direction,phase,paused,blocked,from:route?.from||null,to:route?.to||null,arrivedAt:endStation(),stopReason:stopReason()});return active?output:null;}
  function fail(reason,message){lastReason=reason;return{ok:false,reason,message};}

  function begin(options={}){
    if(disposed)return fail('disposed','This path is no longer available.');
    const r=routeMap.get(options.routeId);if(!r)return fail('unknown-route','Choose one of the stone paths.');
    const start=vec(options.cameraPosition)||(active?position.clone():null),startTarget=vec(options.cameraTarget)||(active?target.clone():null);
    if(!start||!startTarget||![...start.toArray(),...startTarget.toArray()].every(Number.isFinite))return fail('invalid-camera','The path could not be entered.');
    const clicked=vec(options.point)||pointOn(r,0,new THREE.Vector3());
    const wanted=Number.isFinite(options.progress)?clamp(options.progress,0,1):closest(r,clicked).progress;
    const physical=bounds(blockers),air=[...physical,...bounds(aerialBlockers)],ranges=intervalsFor(r,physical);
    if(!ranges.length)return fail('blocked-route','This path is blocked. Try another stone path.');
    const onGround=active&&phase!=='arriving'&&route&&Math.abs(start.y-comfortHeight(route,progress)-eyeHeight)<.15;
    let chosen,groundJoin=false;
    if(onGround){
      const projected=closest(r,start);
      if(projected.distance>nearbyDistance)return fail('route-too-far','Follow this path to a junction, then choose the next path.');
      chosen=nearest(r,projected.progress,ranges,null);if(!chosen)return fail('blocked-route','This path is blocked. Try another stone path.');
      const oldFoot=start.clone();oldFoot.y=start.y-eyeHeight;const joined=pointOn(r,chosen.progress,new THREE.Vector3());
      if(oldFoot.distanceTo(joined)>nearbyDistance||!safeGroundSegment(oldFoot,joined,physical))return fail('blocked-junction','Walk to the junction before choosing the next path.');
      groundJoin=true;
    }else{
      chosen=nearest(r,wanted,ranges,air);if(!chosen)return fail('covered-path','Choose an open part of the stone path, away from the roof.');
    }
    const chosenProgress=chosen.progress;
    let nextDirection=options.direction===-1?-1:options.direction===1?1:onGround&&Math.abs(wanted-chosenProgress)>.02?Math.sign(wanted-chosenProgress):chosenProgress<.5?1:-1;
    if(nextDirection>0&&chosen.range.max-chosenProgress<.03/r.length)nextDirection=-1;
    else if(nextDirection<0&&chosenProgress-chosen.range.min<.03/r.length)nextDirection=1;
    look(r,chosenProgress,nextDirection,desiredHeading);
    const destination=pointOn(r,chosenProgress,new THREE.Vector3());destination.y=comfortHeight(r,chosenProgress)+eyeHeight;
    const planned=makeFlight(start,destination,startTarget,air,groundJoin?.5:arrivalDuration,groundJoin);
    if(!planned)return fail('blocked-descent','Choose a path with an open view from above.');
    route=r;direction=nextDirection;progress=chosenProgress;interval=chosen.range;safeIntervals=ranges;flight=planned;elapsed=0;journey=null;
    active=true;done=false;blocked=false;lastReason=null;phase='arriving';paused=!!reduced;
    position.copy(start);target.copy(startTarget);pointOn(r,chosenProgress,foot);heading.copy(desiredHeading);
    if(reduced){position.copy(destination);target.copy(planned.endTarget);phase='walking';journey=makeJourney();}
    sync();return{ok:true,...getState()};
  }
  function update(dt=0){
    if(!active||disposed)return null;
    dt=clamp(Number(dt)||0,0,.25);if(paused||done||!dt)return sync();
    const physical=bounds(blockers);
    if(phase==='arriving'){
      const nextElapsed=Math.min(flight.duration,elapsed+dt),t=smooth(nextElapsed/flight.duration),candidate=flight.curve.getPoint(t);
      const valid=flight.groundOnly?safeGroundSegment(new THREE.Vector3(position.x,position.y-eyeHeight,position.z),new THREE.Vector3(candidate.x,candidate.y-eyeHeight,candidate.z),physical):![...physical,...bounds(aerialBlockers)].some(b=>crossesBox(position,candidate,b));
      if(!valid){paused=true;blocked=true;lastReason='descent-obstructed';return sync();}
      elapsed=nextElapsed;position.copy(candidate);target.lerpVectors(flight.startTarget,flight.endTarget,t);
      if(elapsed>=flight.duration){pointOn(route,progress,foot);phase='walking';journey=makeJourney();elapsed=0;}
      return sync();
    }
    if(phase==='walking'){
      const nextElapsed=Math.min(journey.duration,elapsed+dt),distance=travelled(journey,nextElapsed),nextProgress=clamp(journey.start+direction*distance/route.length,interval.min,interval.max);
      pointOn(route,nextProgress,nextFoot);
      if(!safeGroundSegment(foot,nextFoot,physical)){paused=true;blocked=true;lastReason='path-obstructed';return sync();}
      elapsed=nextElapsed;progress=nextProgress;foot.copy(nextFoot);position.copy(foot);position.y=comfortHeight(route,progress)+eyeHeight;
      look(route,progress,direction,desiredHeading);heading.lerp(desiredHeading,1-Math.exp(-dt*6)).normalize();target.copy(position).addScaledVector(heading,3);target.y-=.06;
      if(elapsed>=journey.duration){done=true;phase='idle';}
    }
    return sync();
  }
  function pause(){if(!active)return false;paused=true;sync();return true;}
  function resume(){if(!active||done)return false;if(blocked){const physical=bounds(blockers);if(!safePoint(foot,physical))return false;blocked=false;lastReason=null;}paused=false;sync();return true;}
  function stop(){active=false;phase='inactive';paused=false;flight=null;journey=null;sync();}
  function getState(){return{active,routeId:route?.id||null,from:route?.from||null,to:route?.to||null,progress,direction,phase,paused,done,blocked,reason:lastReason,arrivedAt:endStation(),stopReason:stopReason(),eyeHeight,speed,groundY:foot.y,position:position.toArray(),target:target.toArray(),safetyIntervals:safeIntervals.map(v=>({...v}))};}
  function getSafetyIntervals(routeId){const r=routeMap.get(routeId);return r?intervalsFor(r,bounds(blockers)):[];}
  return{begin,update,stop,pause,resume,getState,getSafetyIntervals,
    diagnostics:{eyeHeight,speed,radius,arrivalDuration,nearbyDistance,routeIds:[...routeMap.keys()],invalidRoutes,headBob:false,units:'metres',positionAuthority:'Actual landscape stone-path curves',reducedMotion:'Immediate ground view, paused until the visitor presses Walk; no automatic camera travel.'},
    dispose(){stop();disposed=true;routeMap.clear();}};
}
