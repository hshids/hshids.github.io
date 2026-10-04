import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createCraftMaterials} from './fidelity-surface-materials.js';
import {craftBoxChamfer,createCraftBoxGeometry,createCraftRoofTileGeometry,createCraftRidgeGeometry} from './fidelity-craft-geometry.js';

// A complete, softly coloured construction kit. Every opaque side uses the
// same lit material; doors and windows are holes through real walls.
export function createRoomKit({root=new THREE.Group(),name='room',quality='high'}={}){
  const resources=new Set(),materials=createCraftMaterials({name,quality,resources}),staticMeshes=[],doors=[],rooms=[],lights=[],boxGeometries=new Map();
  let dark=false,disposed=false;const mergedMeshes=[],motions=[];
  function resolve(role){return typeof role==='string'?(materials[role]||materials.wood):role;}
  function mesh(name,geometry,material,position,parent=root){
    const m=new THREE.Mesh(geometry,resolve(material));m.name=name;m.position.fromArray(position);m.castShadow=!m.material.transparent;m.receiveShadow=true;
    m.userData.roomSolid=!m.material.transparent;parent.add(m);resources.add(geometry);
    if(parent===root)staticMeshes.push(m);return m;
  }
  function box(label,size,position,role='wood',parent=root){
    const bevel=craftBoxChamfer(label,size,role),grain=['wood','darkWood','floor','red'].includes(role),key=size.join(',')+':'+bevel+':'+grain;
    let g=boxGeometries.get(key);if(!g){g=createCraftBoxGeometry(size,bevel,{grain});boxGeometries.set(key,g);}
    return mesh(label,g,role,position,parent);
  }
  function round(label,radius,height,position,role='wood',parent=root,segments=8){return mesh(label,new THREE.CylinderGeometry(radius,radius,height,segments),role,position,parent);}
  function brickWall(label,size,position,role='plaster',parent=root){
    // Larger limewash blocks make a deliberate wall rhythm. A nearly flush,
    // pale continuous core closes every joint without the old deep dark grid.
    const across=size[0]>=size[2],length=across?size[0]:size[2],height=size[1],thickness=across?size[2]:size[0];
    const core=size.slice();core[across?2:0]*=.90;box(label+'-continuous-core',core,position,'mortar',parent);
    const rows=Math.max(1,Math.ceil(height/.46)),course=height/rows,origin=-length/2,joint=.0025;
    for(let row=0;row<rows;row++){
      let u=origin,step=.94;
      while(u<length/2-.001){const span=Math.min(length/2-u,u===origin&&row%2?step/2:step),dims=across?[Math.max(.001,span-joint),Math.max(.001,course-joint),thickness]:[thickness,Math.max(.001,course-joint),Math.max(.001,span-joint)],p=position.slice();p[across?0:2]+=u+span/2;p[1]+=-height/2+course*(row+.5);box(label+'-brick-'+row+'-'+u.toFixed(3),dims,p,role,parent);u+=span;}
    }
  }
  function sign(label,text,size,position,role='wood',parent=root){
    const group=new THREE.Group();group.name=label;group.position.fromArray(position);parent.add(group);
    box(label+'-board',size,[0,0,0],role,group);
    const cv=document.createElement('canvas');cv.width=512;cv.height=128;const c=cv.getContext('2d');c.clearRect(0,0,512,128);
    c.textAlign='center';c.textBaseline='middle';c.font='600 54px Georgia, serif';
    const fit=Math.min(1,460/c.measureText(text).width);c.font=`600 ${54*fit}px Georgia, serif`;
    c.fillStyle=role==='ivory'?'#d6c8ab':'#493320';c.fillText(text,258,67);
    c.fillStyle=role==='ivory'?'#5d4635':'#f1dfba';c.fillText(text,256,64);
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;resources.add(t);
    const mat=new THREE.MeshStandardMaterial({name:label+'-inlaid-lettering',map:t,transparent:true,depthWrite:false,roughness:.84,metalness:0});resources.add(mat);
    // Printing on the board is intentionally two-dimensional, with a solid
    // board carrying it; it never supplies the shape of the building.
    const face=mesh(label+'-engraved-face',new THREE.PlaneGeometry(size[0]*.93,size[1]*.90),mat,[0,0,size[2]/2+.002],group);face.castShadow=false;face.userData.roomSolid=false;
    return group;
  }
  function roof({name:label,minX,maxX,minZ,maxZ,eaveY,ridgeY,role='roof'}){
    const depth=maxZ-minZ,width=maxX-minX,inset=Math.min(depth*.48,width*.32),middle=(minZ+maxZ)/2;
    const rings=[0,.16,.42,.72,1].map(t=>[
      [minX+inset*t,eaveY+(ridgeY-eaveY)*t,minZ+(depth/2-.055)*t],
      [maxX-inset*t,eaveY+(ridgeY-eaveY)*t,minZ+(depth/2-.055)*t],
      [maxX-inset*t,eaveY+(ridgeY-eaveY)*t,maxZ-(depth/2-.055)*t],
      [minX+inset*t,eaveY+(ridgeY-eaveY)*t,maxZ-(depth/2-.055)*t]
    ]);
    const positions=[],uv=[],push=(a,b,c)=>{positions.push(...a,...b,...c);for(const p of[a,b,c])uv.push(p[0]*.75,p[2]*.75);};
    const quad=(a,b,c,d)=>{push(a,b,c);push(a,c,d);};
    for(let r=0;r<rings.length-1;r++)for(let s=0;s<4;s++){
      const j=(s+1)%4,a=rings[r][s],b=rings[r][j],c=rings[r+1][j],d=rings[r+1][s];
      // Top outward; lower surface has the opposite winding.
      quad(a,d,c,b);quad(a.map((v,i)=>i===1?v-.12:v),b.map((v,i)=>i===1?v-.12:v),c.map((v,i)=>i===1?v-.12:v),d.map((v,i)=>i===1?v-.12:v));
    }
    const top=rings.at(-1);quad(top[0],top[3],top[2],top[1]);quad(...[top[0],top[1],top[2],top[3]].map(p=>p.map((v,i)=>i===1?v-.12:v)));
    for(let i=0;i<4;i++){const j=(i+1)%4,a=rings[0][i],b=rings[0][j];quad(a,b,b.map((v,k)=>k===1?v-.12:v),a.map((v,k)=>k===1?v-.12:v));}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
    mesh(label+'-continuous-four-sided-roof',g,role,[0,0,0]);
    mesh(label+'-ridge-cap',createCraftRidgeGeometry({length:width-2*inset+.22,width:.20,height:.14,quality}),role,[(minX+maxX)/2,ridgeY+.055,middle]);
    const rows=quality==='low'?4:6,tileG=createCraftRoofTileGeometry({quality}),transforms=[];
    for(let side=0;side<4;side++)for(let row=0;row<rows;row++){
      const t=(row+.45)/rows,outerA=new THREE.Vector3(...rings[0][side]),outerB=new THREE.Vector3(...rings[0][(side+1)%4]);
      const innerA=new THREE.Vector3(...top[side]),innerB=new THREE.Vector3(...top[(side+1)%4]);
      const a=outerA.clone().lerp(innerA,t),b=outerB.clone().lerp(innerB,t),along=b.clone().sub(a),length=along.length(),count=Math.max(1,Math.floor(length/.30));
      const x=along.clone().normalize(),run=innerA.clone().sub(outerA),normal=run.clone().cross(along).normalize();if(normal.y<0)normal.negate();
      const z=x.clone().cross(normal).normalize(),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,normal,z));
      // Courses must not overlap on the same top plane. A fixed tile depth
      // caused z-fighting on short roofs and narrow Research slopes.
      const courseRun=run.addScaledVector(x,-run.dot(x)).length()/rows,tileDepth=Math.min(.26,courseRun*.90);
      const edge=Math.min(.075,length*.08),usable=length-2*edge;
      // The arched tile's flat underside overlaps the structural slope 2mm;
      // its curved crown and rolled lip provide the visible depth, not a gap.
      for(let i=0;i<count;i++){const p=a.clone().lerp(b,(edge+(i+.5)*usable/count)/length).addScaledVector(normal,.019);transforms.push(new THREE.Matrix4().compose(p,q,new THREE.Vector3(Math.max(.01,usable/count-.004)/.24,1,tileDepth/.26)));}
    }
    resources.add(tileG);const tiles=new THREE.InstancedMesh(tileG,resolve(role),transforms.length);tiles.name=label+'-individual-toy-tile-laps';transforms.forEach((m,i)=>tiles.setMatrixAt(i,m));tiles.castShadow=true;tiles.receiveShadow=true;tiles.userData.roomSolid=true;root.add(tiles);return tiles;
  }
  function enclose({id,label,minX,maxX,minZ,maxZ,floorY,ceilingY,wallThickness=.16,openings=[],entry,inside,exit,camera}){
    const room={id,label,bounds:{min:[minX,floorY,minZ],max:[maxX,ceilingY,maxZ]},entry:entry||[(minX+maxX)/2,floorY,maxZ+.5],inside:inside||[(minX+maxX)/2,floorY,(minZ+maxZ)/2],exit:exit||[(minX+maxX)/2,0,maxZ+.9],camera:camera||{target:[(minX+maxX)/2,floorY+1.05,(minZ+maxZ)/2],offset:[0,.55,1.45]},colliders:[],walkAreas:[],interactables:[],doors:[]};
    room.doorRoutes={};
    const centreX=(minX+maxX)/2,centreZ=(minZ+maxZ)/2;
    const floor=box(id+'-complete-bearing-floor',[maxX-minX+.1,.20,maxZ-minZ+.1],[centreX,floorY-.12,centreZ],'floor');floor.userData.walkSurface=true;floor.userData.keepMesh=true;
    for(let x=minX;x<maxX-.001;x+=.66)for(let z=minZ;z<maxZ-.001;z+=.66){const w=Math.min(.66,maxX-x),d=Math.min(.66,maxZ-z);box(id+'-individual-floor-block-'+x+'-'+z,[Math.max(.001,w-.003),.024,Math.max(.001,d-.003)],[x+w/2,floorY-.012,z+d/2],'floor');}
    box(id+'-continuous-ceiling',[maxX-minX,.085,maxZ-minZ],[centreX,ceilingY+.043,centreZ],'darkWood');
    room.walkAreas.push({id:id+'-interior-floor',minX,maxX,minZ,maxZ,y:floorY});
    for(const side of['front','back','left','right']){
      const across=side==='front'||side==='back',u0=across?minX:minZ,u1=across?maxX:maxZ,normal=side==='front'?maxZ:side==='back'?minZ:side==='left'?minX:maxX;
      const holes=openings.filter(h=>h.side===side).map(h=>({...h,l:Math.max(u0,h.centre-h.width/2),r:Math.min(u1,h.centre+h.width/2),b:floorY+(h.sill||0),t:floorY+(h.sill||0)+h.height}));
      const us=[...new Set([u0,u1,...holes.flatMap(h=>[h.l,h.r])])].sort((a,b)=>a-b),ys=[...new Set([floorY,ceilingY,...holes.flatMap(h=>[h.b,h.t]).filter(y=>y>floorY&&y<ceilingY)])].sort((a,b)=>a-b);
      const p=(u,y,d=0)=>across?[u,y,normal+d]:[normal+d,y,u];
      const extent=(du,dy,d)=>across?[du,dy,d]:[d,dy,du];
      const addCollider=(name,position,size)=>room.colliders.push({id:name,min:position.map((v,i)=>v-size[i]/2),max:position.map((v,i)=>v+size[i]/2)});
      for(let u=0;u<us.length-1;u++)for(let y=0;y<ys.length-1;y++){
        const cu=(us[u]+us[u+1])/2,cy=(ys[y]+ys[y+1])/2;
        if(holes.some(h=>cu>h.l-1e-8&&cu<h.r+1e-8&&cy>h.b-1e-8&&cy<h.t+1e-8))continue;
        const size=extent(us[u+1]-us[u],ys[y+1]-ys[y],wallThickness),position=p(cu,cy),name=id+'-'+side+'-solid-wall-'+u+'-'+y;
        brickWall(name,size,position,'plaster');addCollider(name,position,size);
      }
      // Corner posts support the continuous walls instead of floating trim.
      for(const u of[u0,u1])box(id+'-'+side+'-corner-post-'+u,extent(.13,ceilingY-floorY,.20),p(u,(floorY+ceilingY)/2),'wood');
      for(const hole of holes){
        const openingID=hole.id||id+'-'+side+'-'+hole.type,width=hole.r-hole.l,height=hole.t-hole.b;
        for(const u of[hole.l-.0375,hole.r+.0375])box(openingID+'-jamb-'+u,extent(.075,height+.15,.22),p(u,(hole.b+hole.t)/2),'wood');
        for(const y of[hole.b-.0375,hole.t+.0375])box(openingID+'-rail-'+y,extent(width+.15,.075,.22),p((hole.l+hole.r)/2,y-(hole.type==='door'&&y<hole.b?.004:0)),'wood');
        if(hole.type==='window'){
          const paneSize=extent(width-.04,height-.04,.024),panePosition=p((hole.l+hole.r)/2,(hole.b+hole.t)/2);box(openingID+'-real-glass-pane',paneSize,panePosition,'glass');addCollider(openingID+'-physical-glass',panePosition,paneSize);
          const bars=quality==='low'?3:5;for(let i=1;i<bars;i++)box(openingID+'-lattice-vertical-'+i,extent(.026,height-.05,.057),p(hole.l+width*i/bars,(hole.b+hole.t)/2),'wood');
          for(let i=1;i<4;i++)box(openingID+'-lattice-cross-'+i,extent(width-.05,.026,.057),p((hole.l+hole.r)/2,hole.b+height*i/4),'wood');
        }else if(hole.type==='door'){
          const pair=[];
          for(let half=0;half<2;half++){
            const pivot=new THREE.Group();pivot.name=openingID+'-hinge-'+half;pivot.position.fromArray(p(half?hole.r:hole.l,hole.b));if(!across)pivot.rotation.y=-Math.PI/2;root.add(pivot);
            const sign=half?-1:1,leaf=box(openingID+'-closed-leaf-'+half,[width/2-.025,height-.045,.075],[sign*(width/4),height/2,0],'red',pivot);leaf.userData.keepMesh=true;
            // a framed lattice panel (rails at both ends and the middle, stiles at the sides), merged into one mesh per leaf
            const bars=[];const bar=(size,at)=>{const g=new THREE.BoxGeometry(...size);g.translate(...at);bars.push(g);};
            for(const f of[.44,.66,.88])bar([width/2-.08,.05,.105],[sign*width/4,height*f,.012]);
            for(let i=1;i<4;i++)bar([.028,height*.44,.10],[sign*(width*i/8),height*.66,0]);
            for(const x of[.04,width/2-.04])bar([.035,height*.46,.105],[sign*x,height*.66,.012]);
            const lattice=mergeGeometries(bars,false);bars.forEach(g=>g.dispose());mesh(openingID+'-leaf-lattice-panel-'+half,lattice,'wood',[0,0,0],pivot);
            round(openingID+'-bronze-pull-'+half,.035,.035,[sign*(width/2-.10),height*.46,.065],'brass',pivot,8).rotation.x=Math.PI/2;
            const collider={id:openingID+'-moving-leaf-'+half,min:[0,0,0],max:[0,0,0]};room.colliders.push(collider);
            const record={pivot,leaf,collider,base:pivot.rotation.y,sign,progress:hole.open===false?0:1,target:hole.open===false?0:1};doors.push(record);pair.push(record);
          }
          const outward=side==='front'||side==='right'?1:-1;
          const point=p((hole.l+hole.r)/2,hole.b+height*.55,outward*.18),proxyMat=new THREE.MeshBasicMaterial({visible:false}),proxy=mesh(openingID+'-pick',new THREE.BoxGeometry(...extent(width,height,.12)),proxyMat,point);resources.add(proxyMat);proxy.userData.roomSolid=false;proxy.userData.keepMesh=true;proxy.castShadow=false;proxy.receiveShadow=false;
          pair.forEach(d=>d.leaf.userData.interaction=openingID);
          const item={id:openingID,type:'door',title:'Open '+label,point,object:proxy,objects:[proxy,...pair.map(d=>d.leaf)],stand:room.entry,room:id,onInteract(){pair.forEach(d=>d.target=1);}};
          const centre=(hole.l+hole.r)/2;
          room.doorRoutes[openingID]={entry:p(centre,floorY,outward*.65),inside:p(centre,floorY,-outward*.70),exit:p(centre,0,outward*.95)};
          room.interactables.push(item);room.doors.push({id:openingID,side,pair});
        }
      }
    }
    for(let z=minZ+.45;z<maxZ;z+=.8)box(id+'-supported-ceiling-rafter-'+z,[maxX-minX+.10,.08,.10],[centreX,ceilingY+.04,z],'wood');
    room.openEntrance=()=>room.doors.forEach(d=>d.pair.forEach(p=>p.target=1));
    room.closeEntrance=()=>room.doors.forEach(d=>d.pair.forEach(p=>p.target=0));
    rooms.push(room);update(0,0);return room;
  }
  function flush(){
    const groups=new Map();for(const m of staticMeshes){
      if(!m.parent||m.parent!==root||m.userData.keepMesh||m.userData.interaction||m.material.transparent||m.material.visible===false)continue;
      m.updateMatrix();const clone=m.geometry.clone(),g=clone.index?clone.toNonIndexed():clone;if(g!==clone)clone.dispose();g.applyMatrix4(m.matrix);resources.add(g);if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push({m,g});
    }
    for(const [mat,list]of groups){const g=mergeGeometries(list.map(v=>v.g),false);if(!g)continue;resources.add(g);const m=new THREE.Mesh(g,mat);m.name=name+'-complete-static-'+mat.name;m.castShadow=true;m.receiveShadow=true;m.userData.roomSolid=true;
      // remember which vertices came from which named part, so a part can still move after the merge
      let start=0;m.userData.partRanges=list.map(v=>{const count=v.g.attributes.position.count,range={name:v.m.name,start,count};start+=count;return range;});
      root.add(m);mergedMeshes.push(m);list.forEach(v=>{v.m.removeFromParent();v.g.dispose();resources.delete(v.g);});}
    staticMeshes.length=0;
    return{rooms:rooms.map(r=>({id:r.id,bounds:r.bounds,doors:r.doors.map(d=>d.id),floorY:r.bounds.min[1],ceilingY:r.bounds.max[1]}))};
  }
  // Move every merged part whose name starts with prefix: pose(progress) returns a matrix about the
  // parts' own pivot (bottom front centre). Rest positions come back when the motion ends.
  function animateParts(prefix,{duration=1.6,pose}={}){
    if(motions.some(m=>m.prefix===prefix))return false;
    const entries=[],box=new THREE.Box3(),v=new THREE.Vector3();
    for(const mesh of mergedMeshes){const ranges=(mesh.userData.partRanges||[]).filter(r=>r.name.startsWith(prefix));if(!ranges.length)continue;
      const pos=mesh.geometry.attributes.position,nor=mesh.geometry.attributes.normal;
      for(const r of ranges){const rest=new Float32Array(pos.array.slice(r.start*3,(r.start+r.count)*3)),restN=nor?new Float32Array(nor.array.slice(r.start*3,(r.start+r.count)*3)):null;entries.push({mesh,r,rest,restN});
        for(let i=0;i<r.count;i++)box.expandByPoint(v.fromArray(rest,i*3));}}
    if(!entries.length)return false;
    const pivot=new THREE.Vector3((box.min.x+box.max.x)/2,box.min.y,box.max.z);
    motions.push({prefix,entries,pivot,elapsed:0,duration,pose});return true;
  }
  function stepMotions(dt){
    if(!motions.length)return;const m4=new THREE.Matrix4(),toPivot=new THREE.Matrix4(),back=new THREE.Matrix4(),nm=new THREE.Matrix3(),v=new THREE.Vector3();
    for(const mo of motions.slice()){
      mo.elapsed+=dt;const done=mo.elapsed>=mo.duration,p=Math.min(1,mo.elapsed/mo.duration);
      toPivot.makeTranslation(-mo.pivot.x,-mo.pivot.y,-mo.pivot.z);back.makeTranslation(mo.pivot.x,mo.pivot.y,mo.pivot.z);
      m4.copy(back).multiply(done?new THREE.Matrix4():mo.pose(p)).multiply(toPivot);nm.getNormalMatrix(m4);
      const touched=new Set();
      for(const e of mo.entries){const pos=e.mesh.geometry.attributes.position,nor=e.mesh.geometry.attributes.normal;
        for(let i=0;i<e.r.count;i++){v.fromArray(e.rest,i*3).applyMatrix4(m4);pos.setXYZ(e.r.start+i,v.x,v.y,v.z);if(nor&&e.restN){v.fromArray(e.restN,i*3).applyMatrix3(nm).normalize();nor.setXYZ(e.r.start+i,v.x,v.y,v.z);}}
        touched.add(e.mesh);}
      touched.forEach(mesh=>{mesh.geometry.attributes.position.needsUpdate=true;if(mesh.geometry.attributes.normal)mesh.geometry.attributes.normal.needsUpdate=true;});
      if(done)motions.splice(motions.indexOf(mo),1);
    }
  }
  function update(time,dt){
    if(disposed)return;stepMotions(Math.max(0,Math.min(.1,dt||0)));for(const d of doors){d.progress=THREE.MathUtils.damp(d.progress,d.target,9,Math.max(0,dt));d.pivot.rotation.y=d.base-d.sign*d.progress*Math.PI*.48;d.pivot.updateMatrixWorld(true);
      // Collider coordinates remain local to this chapter even after the
      // chapter is positioned in the world; never bake its world transform.
      d.pivot.updateMatrix();d.leaf.updateMatrix();const local=d.pivot.matrix.clone().multiply(d.leaf.matrix),b=new THREE.Box3().setFromBufferAttribute(d.leaf.geometry.attributes.position).applyMatrix4(local);d.collider.min=b.min.toArray();d.collider.max=b.max.toArray();
    }
  }
  function setTheme(value){dark=!!value;materials.glass.emissive.set(dark?'#e6b36f':'#000000');materials.glass.emissiveIntensity=dark?.62:0;materials.glass.opacity=dark?.66:.36;lights.forEach(l=>l.intensity=dark?l.userData.nightIntensity:0);}
  function lamp(position,intensity=.35,distance=1){
    // Small practicals stop before the nearest solid envelope. The world owns
    // one shadowed interior lamp for broad room illumination when entered.
    const room=rooms.find(r=>position[0]>r.bounds.min[0]&&position[0]<r.bounds.max[0]&&position[1]>=r.bounds.min[1]&&position[1]<=r.bounds.max[1]&&position[2]>r.bounds.min[2]&&position[2]<r.bounds.max[2]);
    const safe=room?Math.min(position[0]-room.bounds.min[0],room.bounds.max[0]-position[0],position[2]-room.bounds.min[2],room.bounds.max[2]-position[2],room.bounds.max[1]-position[1]):1;
    const light=new THREE.PointLight('#ffbf74',dark?intensity:0,Math.max(.12,Math.min(distance,safe*.92)),2);light.position.fromArray(position);light.userData.nightIntensity=intensity;root.add(light);lights.push(light);return light;
  }
  function dispose(){if(disposed)return;disposed=true;root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});resources.forEach(r=>r.dispose?.());root.clear();}
  return{root,materials,resources,box,round,brickWall,sign,roof,enclose,flush,setTheme,update,dispose,lamp,rooms,animateParts};
}
