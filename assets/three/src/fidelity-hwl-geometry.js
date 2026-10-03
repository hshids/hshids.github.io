import * as THREE from 'three';

// Every part is a closed, independently shaped solid. Original SVG x/y is
// used solely for UV projection; z is physical scene depth, in metres.
export const UNIT=1/85;
export const px=x=>x*UNIT;
export const py=y=>(560-y)*UNIT;
export function createPainter(resources, texture, sourceSize, crop, display, name, role={}) {
  const [sw,sh]=sourceSize,[l,t,r,b]=crop,[dx,dy,dw,dh]=display;
  const uv=(x,y)=>[(l+(x/UNIT-dx)/dw*(r-l))/sw,1-(t+((560-y/UNIT)-dy)/dh*(b-t))/sh];
  const original=(sx,sy)=>[px(dx+(sx-l)/(r-l)*dw),py(dy+(sy-t)/(b-t)*dh)];
  const front=new THREE.MeshBasicMaterial({map:texture,alphaTest:.18,toneMapped:false});front.name=name+'-original-painted-front';
  const side=new THREE.MeshStandardMaterial({map:texture,color:role.color||'#c9c3b8',roughness:role.roughness??.83,metalness:role.metalness??0,alphaTest:.18});side.name=name+'-sampled-physical-side';
  resources.add(front);resources.add(side);
  return {texture,front,side,uv,original,sourceSize,crop,display,name};
}
export function createSolidBuilder(root,resources,parts) {
  const batches=new Map();
  const normal=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3();
  function tri(mat,p,q,r,u,v,w,normals=null){
    a.set(q[0]-p[0],q[1]-p[1],q[2]-p[2]);b.set(r[0]-p[0],r[1]-p[1],r[2]-p[2]);normal.crossVectors(a,b);if(normal.lengthSq()<1e-16)return;normal.normalize();
    let batch=batches.get(mat);if(!batch){batch={p:[],n:[],uv:[]};batches.set(mat,batch);}
    batch.p.push(...p,...q,...r);batch.n.push(...(normals?normals.flat():[...normal.toArray(),...normal.toArray(),...normal.toArray()]));batch.uv.push(...u,...v,...w);
  }
  function quad(mat,p,uv,normals=null){tri(mat,p[0],p[1],p[2],uv[0],uv[1],uv[2],normals&&[normals[0],normals[1],normals[2]]);tri(mat,p[0],p[2],p[3],uv[0],uv[2],uv[3],normals&&[normals[0],normals[2],normals[3]]);}
  const patchUV=(paint,patch)=>{const [l,t,r,b]=patch,[sw,sh]=paint.sourceSize;return [[l/sw,1-b/sh],[r/sw,1-b/sh],[r/sw,1-t/sh],[l/sw,1-t/sh]];};
  const discUV=(paint,patch,angle)=>{const[l,t,r,b]=patch||paint.crop,[sw,sh]=paint.sourceSize;return [(l+r+(r-l)*Math.sin(angle))/2/sw,1-(t+b+(b-t)*Math.cos(angle))/2/sh];};
  const discCentreUV=(paint,patch)=>{const[l,t,r,b]=patch||paint.crop,[sw,sh]=paint.sourceSize;return[(l+r)/2/sw,1-(t+b)/2/sh];};
  function face(paint,p,patch,front=false){
    if(front){quad(paint.front,p,p.map(v=>paint.uv(v[0],v[1])));return;}
    // Tessellate physical sides at the source sample's scale rather than
    // stretch a twelve-pixel edge across the whole inferred room depth.
    const sample=patch||paint.crop,uv=patchUV(paint,sample),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
    const scaleX=Math.abs(paint.display[2]/(paint.crop[2]-paint.crop[0]))*UNIT,scaleY=Math.abs(paint.display[3]/(paint.crop[3]-paint.crop[1]))*UNIT;
    const nx=Math.max(1,Math.min(12,Math.ceil(distance(p[0],p[1])/Math.max(.45,(sample[2]-sample[0])*scaleX)))),ny=Math.max(1,Math.min(12,Math.ceil(distance(p[0],p[3])/Math.max(.45,(sample[3]-sample[1])*scaleY))));
    const at=(u,v)=>p[0].map((_,i)=>(1-v)*((1-u)*p[0][i]+u*p[1][i])+v*((1-u)*p[3][i]+u*p[2][i]));
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let tex=uv.map(v=>v.slice());if(i%2)tex=[tex[1],tex[0],tex[3],tex[2]];if(j%2)tex=[tex[3],tex[2],tex[1],tex[0]];quad(paint.side,[at(i/nx,j/ny),at((i+1)/nx,j/ny),at((i+1)/nx,(j+1)/ny),at(i/nx,(j+1)/ny)],tex);}
  }
  function box(name,paint,rect,z,depth,patch) {
    const [l,t,r,b]=rect;const x1=px(l),x2=px(r),y1=py(b),y2=py(t),back=z-depth;
    face(paint,[[x1,y1,z],[x2,y1,z],[x2,y2,z],[x1,y2,z]],patch,true);
    face(paint,[[x2,y1,back],[x1,y1,back],[x1,y2,back],[x2,y2,back]],patch);
    face(paint,[[x1,y1,back],[x1,y1,z],[x1,y2,z],[x1,y2,back]],patch);
    face(paint,[[x2,y1,z],[x2,y1,back],[x2,y2,back],[x2,y2,z]],patch);
    face(paint,[[x1,y2,z],[x2,y2,z],[x2,y2,back],[x1,y2,back]],patch);
    face(paint,[[x1,y1,back],[x2,y1,back],[x2,y1,z],[x1,y1,z]],patch);
    parts.push({name,kind:'closed-solid',rect,z,depth});
  }
  function sourceBox(name,paint,rect,z,depth,patch){const p=paint.original(rect[0],rect[1]),q=paint.original(rect[2],rect[3]);box(name,paint,[Math.min(p[0],q[0])/UNIT,560-Math.max(p[1],q[1])/UNIT,Math.max(p[0],q[0])/UNIT,560-Math.min(p[1],q[1])/UNIT],z,depth,patch);}
  function polygon(name,paint,svgPoints,z,depth,patch) {
    let pts=svgPoints.map(([x,y])=>new THREE.Vector2(px(x),py(y)));if(THREE.ShapeUtils.isClockWise(pts))pts.reverse();
    for(const ix of THREE.ShapeUtils.triangulateShape(pts,[])){
      const front=ix.map(i=>[pts[i].x,pts[i].y,z]);tri(paint.front,...front,...front.map(p=>paint.uv(p[0],p[1])));
      const rear=ix.reverse().map(i=>[pts[i].x,pts[i].y,z-depth]);tri(paint.side,...rear,...patchUV(paint,patch||paint.crop).slice(0,3));
    }
    for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];face(paint,[[p.x,p.y,z],[p.x,p.y,z-depth],[q.x,q.y,z-depth],[q.x,q.y,z]],patch);}
    parts.push({name,kind:'closed-contoured-solid',depth});
  }
  function sourcePolygon(name,paint,pts,z,depth,patch){polygon(name,paint,pts.map(p=>{const v=paint.original(...p);return[v[0]/UNIT,560-v[1]/UNIT];}),z,depth,patch);}
  function round(name,paint,cx,z,profile,patch,segments=36,options={}) {
    const heightScale=options.heightScale??1,heightBase=options.heightBase??py(profile[0][0]);
    const height=y=>heightBase+(py(y)-heightBase)*heightScale;
    const sourceHeight=y=>heightBase+(y-heightBase)/heightScale;
    const ringNormal=(j,angle)=>{const a=profile[Math.max(0,j-1)],b=profile[Math.min(profile.length-1,j+1)],slope=(b[1]-a[1])/(height(b[0])-height(a[0]));return new THREE.Vector3(Math.sin(angle),-slope,Math.cos(angle)).normalize().toArray();};
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
      const aa=i/segments*Math.PI*2,bb=(i+1)/segments*Math.PI*2,[ya,ra]=profile[j],[yb,rb]=profile[j+1];
      const p=[[px(cx)+Math.sin(aa)*ra,height(ya),z+Math.cos(aa)*ra],[px(cx)+Math.sin(bb)*ra,height(ya),z+Math.cos(bb)*ra],[px(cx)+Math.sin(bb)*rb,height(yb),z+Math.cos(bb)*rb],[px(cx)+Math.sin(aa)*rb,height(yb),z+Math.cos(aa)*rb]];
      if(options.continuousProjection){const mat=Math.cos((aa+bb)/2)>0?paint.front:paint.side;quad(mat,p,p.map(v=>paint.uv(v[0],sourceHeight(v[1]))),options.smoothNormals?[ringNormal(j,aa),ringNormal(j,bb),ringNormal(j+1,bb),ringNormal(j+1,aa)]:null);}else face(paint,p,patch,Math.cos((aa+bb)/2)>0);
    }
    for(const [index,dir] of (options.continuousProjection?[[0,-1],[profile.length-1,1]]:[[0,1],[profile.length-1,-1]])){const[y,r]=profile[index];for(let i=0;i<segments;i++){
      const aa=i/segments*Math.PI*2,bb=(i+1)/segments*Math.PI*2,p=[[px(cx),height(y),z],[px(cx)+Math.sin(aa)*r,height(y),z+Math.cos(aa)*r],[px(cx)+Math.sin(bb)*r,height(y),z+Math.cos(bb)*r]],uv=[discCentreUV(paint,patch),discUV(paint,patch,aa),discUV(paint,patch,bb)];if(dir<0){p.reverse();uv.reverse();}tri(paint.side,...p,...uv);
    }}parts.push({name,kind:'closed-profiled-round-solid',z,profile,heightScale,heightBase});
  }
  function sourceRound(name,paint,cx,z,profile,patch,segments=36){const p=paint.original(cx,0);round(name,paint,p[0]/UNIT,z,profile.map(([y,r])=>{const q=paint.original(cx,y);return[560-q[1]/UNIT,r*Math.abs(paint.display[2]/(paint.crop[2]-paint.crop[0]))*UNIT];}),patch,segments);}
  function roof(name,paint,profile,zFront,depth,patch,options={}) {
    // The ridge is shorter than the eave. End bays turn into real curved hip
    // slopes instead of extruding the raised front corners through the room.
    const back=zFront-depth,[hipL,hipR]=options.hip||[profile[0][0],profile.at(-1)[0]],left=profile[0][0],right=profile.at(-1)[0];
    const rearX=v=>v[0]+(v[0]<hipL?1:v[0]>hipR?-1:0)*(options.rearInset||0)*(1-amount(v[0]));
    const amount=x=>Math.min(1,hipL===left?1:Math.max(0,(x-left)/(hipL-left)),hipR===right?1:Math.max(0,(right-x)/(right-hipR)));
    const upper=(v,u)=>{const[x,t,b]=v,f=amount(x),z0=zFront-depth*.48*f,z1=back+depth*.52*f;
      // Continue the source's raised corner around a curved side eave. A
      // straight front-to-back interpolation reads as a rectangular wing.
      const corner=THREE.MathUtils.lerp(py(b)+.10,py(t),.60),rearTop=THREE.MathUtils.lerp(corner,py(t),f),sag=(1-f)*Math.min(.22,Math.max(.12,(py(t)-py(b))*.46));
      return[px(THREE.MathUtils.lerp(x,rearX(v),u)),THREE.MathUtils.lerp(py(t),rearTop,u)-Math.sin(Math.PI*u)*sag,THREE.MathUtils.lerp(z0,z1,u)];};
    for(let i=0;i<profile.length-1;i++){
      const v0=profile[i],v1=profile[i+1],[x0,t0,b0]=v0,[x1,t1,b1]=v1;
      const f=[[px(x0),py(b0),zFront],[px(x1),py(b1),zFront],upper(v1,0),upper(v0,0)];face(paint,f,patch,true);face(paint,f.map(p=>[p[0],p[1]-.085,p[2]]).reverse(),patch);
      const rear=[[px(rearX(v1)),py(b1),back],[px(rearX(v0)),py(b0),back],upper(v0,1),upper(v1,1)];face(paint,rear,patch);face(paint,rear.map(p=>[p[0],p[1]-.085,p[2]]).reverse(),patch);
      if(amount(x0)<1||amount(x1)<1)for(let j=0;j<6;j++){const u=j/6,v=(j+1)/6,q=[upper(v0,u),upper(v1,u),upper(v1,v),upper(v0,v)];face(paint,q,patch);face(paint,q.map(p=>[p[0],p[1]-.085,p[2]]).reverse(),patch);}
      face(paint,[[px(rearX(v1)),py(b1),back],[px(rearX(v1)),py(b1)-.085,back],[px(rearX(v0)),py(b0)-.085,back],[px(rearX(v0)),py(b0),back]],patch);
      face(paint,[[px(x0),py(b0),zFront],[px(x0),py(b0)-.085,zFront],[px(x1),py(b1)-.085,zFront],[px(x1),py(b1),zFront]],patch,true);
    }
    for(const [v,reverse]of [[profile[0],false],[profile.at(-1),true]]){
      const[x,t,b]=v,edge=[[px(x),py(b)-.085,zFront],...Array.from({length:7},(_,j)=>upper(v,j/6)),[px(rearX(v)),py(b)-.085,back]],outline=edge.map(p=>new THREE.Vector2(p[2],p[1]));
      for(const ids of THREE.ShapeUtils.triangulateShape(outline,[])){if(reverse)ids.reverse();const q=ids.map(i=>edge[i]);tri(paint.side,...q,...patchUV(paint,patch||paint.crop).slice(0,3));}
    }
    if(options.hip)for(const [i,v]of [profile[0],profile.at(-1)].entries()){const path=Array.from({length:5},(_,j)=>{const q=upper(v,j/4);return[q[0]/UNIT,560-(q[1]-.018)/UNIT,q[2]];});tube(name+'-rounded-curved-hip-edge-'+i,{...paint,front:paint.side},path,[.018,.018,.018,.018,.018],patch,10);}
    parts.push({name,kind:'closed-curved-hip-roof',depth,hip:[hipL,hipR],rearInset:options.rearInset||0});
  }
  function sourceRoof(name,paint,profile,z,depth,patch,options={}){const hip=options.hip?.map(x=>paint.original(x,0)[0]/UNIT),rearInset=(options.rearInset||0)*Math.abs(paint.display[2]/(paint.crop[2]-paint.crop[0]));roof(name,paint,profile.map(([x,t,b])=>{const p=paint.original(x,t),q=paint.original(x,b);return[p[0]/UNIT,560-p[1]/UNIT,560-q[1]/UNIT];}),z,depth,patch,{...options,rearInset,...(hip?{hip}:{})});}
  function tube(name,paint,path,radii,patch,segments=14){
    // A continuous swept limb/branch, with front UV following its real x/y.
    const points=path.map(p=>new THREE.Vector3(px(p[0]),py(p[1]),p[2]));
    const curve=new THREE.CatmullRomCurve3(points);const steps=Math.max(10,(points.length-1)*10),frames=curve.computeFrenetFrames(steps,false);let previous=null;
    for(let j=0;j<=steps;j++){
      const u=j/steps,pos=curve.getPointAt(u),at=u*(radii.length-1),k=Math.min(radii.length-2,Math.floor(at)),r=THREE.MathUtils.lerp(radii[k],radii[k+1],at-k);const ring=[];
      for(let i=0;i<segments;i++){const aa=i/segments*Math.PI*2;ring.push(pos.clone().addScaledVector(frames.normals[j],Math.cos(aa)*r).addScaledVector(frames.binormals[j],Math.sin(aa)*r).toArray());}
      if(previous)for(let i=0;i<segments;i++){const q=[previous[i],previous[(i+1)%segments],ring[(i+1)%segments],ring[i]];face(paint,q,patch,(q.reduce((n,p)=>n+p[2],0)/4)>pos.z);}
      if(j===0||j===steps)for(let i=0;i<segments;i++){const q=j===0?[pos.toArray(),ring[(i+1)%segments],ring[i]]:[pos.toArray(),ring[i],ring[(i+1)%segments]],uv=[discCentreUV(paint,patch),discUV(paint,patch,(j===0?i+1:i)/segments*Math.PI*2),discUV(paint,patch,(j===0?i:i+1)/segments*Math.PI*2)];tri(paint.side,...q,...uv);}previous=ring;
    }parts.push({name,kind:'solid-swept-curved-form',radii});
  }
  function flush(){for(const[mat,batch]of batches){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(batch.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(batch.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,mat);mesh.name=mat.name+'-closed-surface-batch';mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);resources.add(g);}return{triangles:[...batches.values()].reduce((n,b)=>n+b.p.length/9,0),drawCalls:batches.size};}
  return {box,sourceBox,polygon,sourcePolygon,round,sourceRound,roof,sourceRoof,tube,face,tri,quad,patchUV,flush};
}
