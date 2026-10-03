import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldAssetURL} from './fidelity-assets.js';
import {createRoomKit} from './fidelity-room-kit.js';

/** A complete, enterable lecture hall preserving the original theatre/media. */
export async function createFaithfulTalks({data,quality='high'}={}) {
  const root=new THREE.Group();root.name='talks-complete-timber-lecture-hall';
  const kit=createRoomKit({root,name:'Talks',quality});
  const {box,round,materials,resources}=kit;
  const content=data??globalThis.window?.HJ_DATA??{};
  const videos=content.videos??[],posters=(content.posters??[]).slice(0,2);
  const parts=[],interactables=[];
  const shell={minX:-3.90,maxX:2.00,minZ:-4.25,maxZ:2.00,floorY:.12,ceilingY:3.35};
  const centreX=(shell.minX+shell.maxX)/2;
  const stand=[centreX,0,2.65],frontInside=[centreX,.12,1.45];
  const room=kit.enclose({id:'talks-hall',label:'the lecture hall',...shell,
    entry:stand,inside:frontInside,exit:[centreX,0,2.85],
    camera:{target:[centreX,1.64,-2.20],offset:[.08,.48,2.80]},
    openings:[
      {id:'talks-front-door',side:'front',centre:centreX,width:1.40,height:2.38,type:'door',open:true},
      {id:'talks-rear-door',side:'back',centre:-3.25,width:1.02,height:2.38,type:'door',open:true},
      {id:'talks-front-left-window',side:'front',centre:-2.82,width:1.14,height:1.05,sill:1.04,type:'window'},
      {id:'talks-front-right-window',side:'front',centre:.98,width:1.14,height:1.05,sill:1.04,type:'window'},
      {id:'talks-left-window',side:'left',centre:-2.00,width:1.36,height:1.10,sill:1.10,type:'window'},
      {id:'talks-right-window',side:'right',centre:-1.95,width:1.36,height:1.10,sill:1.10,type:'window'},
      {id:'talks-rear-window',side:'back',centre:1.27,width:.96,height:1.10,sill:1.10,type:'window'}
    ]});
  interactables.push(...room.interactables);
  room.rearExit=[-3.25,0,-4.90];
  // Portal-specific routes let the world use the door actually selected.
  // The default room entry/exit remains the front route for chapter navigation.
  room.doorRoutes={
    'talks-front-door':{entry:stand,inside:frontInside,exit:room.exit},
    'talks-rear-door':{entry:[-3.25,0,-4.90],inside:[-3.25,.12,-3.62],exit:room.rearExit}
  };
  room.interactables.forEach(item=>{item.stand=room.doorRoutes[item.id].entry;});
  const colliders=room.colliders;
  function occupy(id,min,max){const collider={id,type:'box',min,max};colliders.push(collider);return collider;}

  // Bearing masonry and all four roof slopes, including the rear and underside.
  kit.brickWall('talks-ground-bearing-stone-plinth',[6.12,.12,6.46],[centreX,-.015,-1.125],'stone');
  kit.roof({name:'talks-blue-grey-hipped-roof',minX:-4.25,maxX:2.35,minZ:-4.59,maxZ:2.34,eaveY:3.52,ridgeY:4.23});
  for(const z of[-4.43,2.17]){
    box('talks-complete-eave-beam-'+z,[6.39,.17,.20],[centreX,3.42,z],'wood');
    for(const x of[-4.12,2.22]){
      const scroll=round('talks-upturned-eave-'+x+'-'+z,.10,.38,[x,3.61,z],'roof',root,8);
      scroll.rotation.z=x<centreX?-.50:.50;
      box('talks-raised-eave-tip-'+x+'-'+z,[.22,.10,.23],[x+(x<centreX?-.07:.07),3.79,z],'roof');
    }
  }
  for(const x of[shell.minX,shell.maxX])box('talks-side-bearing-beam-'+x,[.18,.16,6.24],[x,3.40,-1.125],'wood');
  kit.sign('talks-inlaid-front-plaque','TALKS',[1.45,.32,.105],[centreX,2.94,2.125],'darkWood');
  const rearPlaque=kit.sign('talks-inlaid-rear-exit','EXIT',[.54,.18,.065],[-3.25,2.80,-4.365],'wood');rearPlaque.rotation.y=Math.PI;
  parts.push({name:'complete-lecture-room-shell',kind:'closed-four-wall-ceiling-hipped-roof',...shell,
    doors:['talks-front-door','talks-rear-door'],minimumHeadroom:shell.ceilingY-.8990008});

  const entrySteps=[
    {id:'talks-front-stone-threshold',minX:centreX-.74,maxX:centreX+.74,minZ:1.91,maxZ:2.35,y:.12},
    {id:'talks-rear-stone-threshold',minX:-3.80,maxX:-2.70,minZ:-4.60,maxZ:-4.16,y:.12}
  ];
  for(const step of entrySteps)box(step.id,[step.maxX-step.minX,.12,step.maxZ-step.minZ],
    [(step.minX+step.maxX)/2,.06,(step.minZ+step.maxZ)/2],'stone');

  // A real raked stage with an entry notch. The low side aisle stays continuous
  // from the foyer to the rear door instead of terminating against the stage.
  const stage={frontY:.5962285,backY:.8990008,frontZ:.05,backZ:-4.10};
  const stageY=z=>THREE.MathUtils.lerp(stage.frontY,stage.backY,
    THREE.MathUtils.clamp((stage.frontZ-z)/(stage.frontZ-stage.backZ),0,1));
  const stageAreas=[
    {id:'talks-main-raked-stage',minX:-1.55,maxX:1.80,minZ:-4.10,maxZ:.05},
    {id:'talks-rear-left-stage-wing',minX:-2.72,maxX:-1.55,minZ:-4.10,maxZ:-1.10}
  ];
  function wedge(area){
    const {minX:l,maxX:r,minZ:b,maxZ:f}=area,base=.12;
    const vertices=[[l,base,b],[r,base,b],[r,base,f],[l,base,f],
      [l,stageY(b),b],[r,stageY(b),b],[r,stageY(f),f],[l,stageY(f),f]];
    const positions=[],uv=[],quad=ids=>{for(const i of[ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]]){
      const p=vertices[i];positions.push(...p);uv.push(p[0]*.9,p[2]*.9+p[1]*.15);}};
    [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]].forEach(quad);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();resources.add(geometry);
    const mesh=new THREE.Mesh(geometry,materials.wood);mesh.name=area.id;mesh.castShadow=mesh.receiveShadow=true;
    mesh.userData.roomSolid=true;mesh.userData.walkSurface=true;root.add(mesh);
    parts.push({name:area.id,kind:'closed-ground-supported-raked-stage',min:[l,base,b],max:[r,stageY(b),f]});
  }
  stageAreas.forEach(wedge);
  for(let z=-4.02;z<.03;z+=.35){const beam=box('talks-stage-plank-joint-'+z,[3.35,.012,.012],[.125,stageY(z)+.004,z],'darkWood');beam.rotation.x=-Math.atan2(stage.backY-stage.frontY,stage.frontZ-stage.backZ);}
  const accessSteps=[],stairTop=stageY(-1.10),rise=(stairTop-shell.floorY)/6;
  for(let i=0;i<6;i++){
    const frontZ=.10-i*.20,backZ=frontZ-.20,top=shell.floorY+(i+1)*rise;
    const step={id:'talks-stage-access-tread-'+(i+1),minX:-2.65,maxX:-1.65,minZ:backZ,maxZ:frontZ,y:top};
    kit.brickWall(step.id,[1.0,top-shell.floorY,.20],[-2.15,(top+shell.floorY)/2,(frontZ+backZ)/2],'stone');
    // Continuous top carries the feet across the fine block joints.
    box(step.id+'-solid-cap',[1.0,.012,.20],[-2.15,top-.006,(frontZ+backZ)/2],'stone');
    accessSteps.push(step);parts.push({name:step.id,kind:'closed-stone-tread',...step,rise});
  }
  const presentZ=-1.537,presentStand=[.617,stageY(presentZ),presentZ];
  const approach=[stand,frontInside,[-3.25,.12,1.45],[-3.25,.12,.22],[-2.15,.12,.22],
    ...accessSteps.map(s=>[-2.15,s.y,(s.minZ+s.maxZ)/2]),[-2.15,stageY(-1.15),-1.15],
    [.617,stageY(-1.15),-1.15],presentStand];

  const podiumX=.25,podiumZ=-2.15,podiumBase=stageY(podiumZ);
  box('talks-solid-lectern-foot',[.64,.075,.56],[podiumX,podiumBase+.0375,podiumZ],'darkWood');
  box('talks-solid-lectern-body',[.53,.86,.44],[podiumX,podiumBase+.49,podiumZ],'wood');
  const lecternTop=box('talks-sloped-reading-top',[.71,.065,.58],[podiumX,podiumBase+.955,podiumZ],'darkWood');lecternTop.rotation.x=.12;
  const motif=round('talks-lectern-round-stone-medallion',.095,.028,[podiumX,podiumBase+.49,podiumZ+.234],'stone',root,12);motif.rotation.x=Math.PI/2;
  for(const x of[podiumX-.21,podiumX+.21])round('talks-lectern-brass-pin-'+x,.023,.025,[x,podiumBase+.83,podiumZ+.239],'brass',root,8).rotation.x=Math.PI/2;
  occupy('talks-solid-lectern-obstacle',[podiumX-.365,podiumBase,podiumZ-.32],[podiumX+.365,podiumBase+1.01,podiumZ+.33]);

  // Quiet anonymous spectators are solid bodies in full supported chairs.
  const spectatorMaterials=['#77786f','#737d80','#988874','#879181'].map((color,i)=>{
    const material=new THREE.MeshStandardMaterial({name:'talks-muted-spectator-'+i,color,roughness:.94});resources.add(material);return material;});
  const audienceMeshes=[];
  const faceMaterial=new THREE.MeshStandardMaterial({name:'talks-soft-anonymous-audience-skin',color:'#b5a68e',roughness:.95});resources.add(faceMaterial);
  const hairMaterial=new THREE.MeshStandardMaterial({name:'talks-soft-audience-hair',color:'#645e54',roughness:.94});resources.add(hairMaterial);
  function ellipsoid(name,position,scale,material){
    const geometry=new THREE.SphereGeometry(1,quality==='low'?8:12,quality==='low'?5:8);resources.add(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.fromArray(position);mesh.scale.fromArray(scale);
    mesh.castShadow=mesh.receiveShadow=true;mesh.userData.roomSolid=true;root.add(mesh);audienceMeshes.push(mesh);return mesh;
  }
  const audienceRows=[{z:.34,count:8,start:-1.45},{z:.87,count:10,start:-2.50}];
  audienceRows.forEach((row,ri)=>{
    for(let i=0;i<row.count;i++){
      const x=row.start+i*.40,z=row.z,label='talks-audience-'+ri+'-'+i;
      box(label+'-bearing-seat',[.33,.065,.32],[x,.56,z],'darkWood');
      box(label+'-complete-chair-back',[.33,.40,.055],[x,.75,z+.16],'wood');
      for(const sx of[-.125,.125])for(const sz of[-.115,.115])box(label+'-chair-leg-'+sx+'-'+sz,[.045,.43,.045],[x+sx,.335,z+sz],'darkWood');
      const body=spectatorMaterials[(i+ri)%spectatorMaterials.length];
      ellipsoid(label+'-closed-torso',[x,.82,z-.018],[.145,.25,.125],body);
      for(const dx of[-.136,.136])ellipsoid(label+'-resting-arm-'+dx,[x+dx,.745,z-.046],[.043,.162,.066],body);
      ellipsoid(label+'-round-head',[x,1.155+(i%3)*.015,z-.04],[.105,.12,.105],faceMaterial);
      ellipsoid(label+'-hair-crown',[x,1.206+(i%3)*.015,z-.035],[.107,.078,.107],hairMaterial);
      for(const dx of[-.083,.083]){
        round(label+'-seated-shin-'+dx,.046,.38,[x+dx,.34,z-.16],body,root,8);
        box(label+'-closed-shoe-'+dx,[.105,.065,.19],[x+dx,.1525,z-.195],'darkWood');
        ellipsoid(label+'-lap-knee-'+dx,[x+dx,.57,z-.145],[.071,.077,.15],body);
      }
      occupy(label+'-chair-and-person',[x-.175,.12,z-.30],[x+.175,1.32,z+.20]);
    }
  });
  // Muted spectators are static. Batch their true volumes rather than drawing
  // every shoulder, knee and head separately on mobile.
  for(const material of[...spectatorMaterials,faceMaterial,hairMaterial]){
    const members=audienceMeshes.filter(mesh=>mesh.material===material),geometries=members.map(mesh=>{
      mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
    if(!geometries.length)continue;
    const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(!geometry)continue;
    resources.add(geometry);const batch=new THREE.Mesh(geometry,material);batch.name=material.name+'-complete-audience-volumes';
    batch.castShadow=batch.receiveShadow=true;batch.userData.roomSolid=true;root.add(batch);
    members.forEach(mesh=>{mesh.removeFromParent();mesh.geometry.dispose();resources.delete(mesh.geometry);});
  }
  parts.push({name:'eighteen-muted-seated-spectators',kind:'supported-full-volume-people-and-chairs',count:18,
    foyerAisleWidth:2.00-.08-(.87+.20),leftServiceAisleWidth:1.10});

  // A screen may carry media; its building does not carry a facade photo.
  const mediaCanvas=document.createElement('canvas');mediaCanvas.width=1024;mediaCanvas.height=768;
  const mg=mediaCanvas.getContext('2d');mg.fillStyle='#e8ddbd';mg.fillRect(0,0,1024,768);
  for(let i=0;i<6;i++){const x=i%2*512,y=Math.floor(i/2)*256;mg.fillStyle='#493e32';mg.textAlign='center';mg.font='28px Georgia, serif';mg.fillText(i<3?'Talks & Posters':'Research posters',x+256,y+128);}
  const mediaTexture=new THREE.CanvasTexture(mediaCanvas);mediaTexture.colorSpace=THREE.SRGBColorSpace;resources.add(mediaTexture);
  const mediaMat=new THREE.MeshBasicMaterial({name:'talks-projected-media-only',map:mediaTexture,toneMapped:false});resources.add(mediaMat);
  const posterMat=new THREE.MeshStandardMaterial({name:'talks-printed-poster-paper',map:mediaTexture,roughness:.90,metalness:0});resources.add(posterMat);
  function setCell(geometry,index){const col=index%2,row=Math.floor(index/2),uv=geometry.attributes.uv;
    for(let i=0;i<4;i++)uv.setXY(i,(col+[0,1,0,1][i])/2,1-(row+[0,0,1,1][i])/3);uv.needsUpdate=true;}
  function mediaPlane(name,index,position,w,h,material=mediaMat){const geometry=new THREE.PlaneGeometry(w,h);setCell(geometry,index);resources.add(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.fromArray(position);mesh.userData.roomSolid=false;mesh.receiveShadow=material===posterMat;root.add(mesh);return mesh;}
  const screenW=2.52,screenH=screenW*98/214,screenY=2.15,screenZ=-4.105;
  box('talks-wall-attached-screen-backing',[screenW+.16,screenH+.16,.060],[centreX,screenY,-4.140],'darkWood');
  const screen=mediaPlane('live-projection-on-back-wall',0,[centreX,screenY,screenZ],screenW,screenH);
  for(const x of[centreX-screenW/2-.13,centreX+screenW/2+.13]){
    for(let j=0;j<3;j++)round('talks-solid-red-curtain-'+x+'-'+j,.064,1.57,[x+(j-1)*.085,2.15,-4.055],'red',root,quality==='low'?8:12);
    box('talks-curtain-tie-'+x,[.28,.045,.17],[x,1.89,-4.055],'brass');
  }
  box('talks-solid-curtain-valance',[3.26,.15,.18],[centreX,2.98,-4.055],'red');
  parts.push({name:'wall-attached-projection',kind:'screen-with-opaque-backed-frame',wallInnerZ:-4.17,backingRearZ:-4.17,
    screenZ,inset:.03,screenSize:[screenW,screenH]});

  // Limited practicals cannot illuminate through the enclosing walls.
  for(const x of[-1.83,.01]){
    round('talks-hanging-lantern-cord-'+x,.012,.35,[x,3.175,-2.02],'darkWood',root,6);
    for(const y of[2.760,2.990])box('talks-hanging-lantern-cap-'+x+'-'+y,[.20,.035,.20],[x,y,-2.02],'wood');
    for(const dx of[-.086,.086])for(const dz of[-.086,.086])box('talks-hanging-lantern-cage-'+x+'-'+dx+'-'+dz,[.023,.23,.023],[x+dx,2.875,-2.02+dz],'wood');
    box('talks-hanging-lantern-pane-'+x,[.151,.20,.151],[x,2.875,-2.02],'glass');
    kit.lamp([x,2.875,-2.02],.30,.38);
  }

  const proxyMat=new THREE.MeshBasicMaterial({visible:false});resources.add(proxyMat);
  function pick(id,type,title,point,size,focus,itemStand=stand){
    const geometry=new THREE.BoxGeometry(...size);resources.add(geometry);const object=new THREE.Mesh(geometry,proxyMat);
    object.position.fromArray(point);object.name='pick-'+id;object.userData={interaction:true,id,type,title,keepMesh:true,roomSolid:false};root.add(object);
    const item={id,type,title,point,object,focus,stand:itemStand,facing:0,onInteract:()=>ensureMedia()};interactables.push(item);return item;
  }
  pick('talks-projection','talk','Talks & Posters',[centreX,screenY,screenZ],[screenW,screenH,.12],{station:'talks'},presentStand).approach=approach;
  pick('talks-lectern','talk','Present a talk',[podiumX,podiumBase+.50,podiumZ],[.72,1.0,.64],{station:'talks'},presentStand).approach=approach;

  posters.forEach((poster,i)=>{
    const w=(i?105:137)/85,h=(i?135:130)/85,x=i?4.49:2.92,z=.48;
    const paperW=w*.78,paperH=h*.76,paperY=h*.59;
    box('talks-poster-'+i+'-opaque-paper-backing',[paperW+.06,paperH+.06,.10],[x,paperY,z],'ivory');
    for(const dx of[-w*.45,w*.45]){
      box('talks-poster-'+i+'-bearing-post-'+dx,[.085,h,.085],[x+dx,h/2,z],'wood');
      box('talks-poster-'+i+'-grounded-foot-'+dx,[.20,.095,.43],[x+dx,.0475,z],'darkWood');
      round('talks-poster-'+i+'-finial-'+dx,.054,.095,[x+dx,h+.0475,z],'brass',root,8);
    }
    for(const y of[paperY-paperH/2-.035,paperY+paperH/2+.035])box('talks-poster-'+i+'-frame-rail-'+y,[w,.065,.095],[x,y,z+.010],'wood');
    for(const dx of[-paperW/2-.035,paperW/2+.035])box('talks-poster-'+i+'-frame-side-'+dx,[.065,paperH+.14,.095],[x+dx,paperY,z+.010],'wood');
    mediaPlane('original-poster-'+(i+1),3+i,[x,paperY,z+.051],paperW,paperH,posterMat);
    occupy('poster-stand-'+i,[x-w/2,0,z-.23],[x+w/2,h+.10,z+.23]);
    const item=pick('poster-'+poster.paper,'poster','Poster · '+poster.venue,[x,paperY,z+.06],[w,h,.18],{posters:true},[x,0,1.32]);
    item.poster=poster;item.posterIndex=i;
  });

  let mediaPromise=null,disposed=false,lastSlide=-1;
  function ensureMedia(){
    if(mediaPromise)return mediaPromise;
    const entries=[...videos.slice(0,3).map((v,i)=>({src:v.thumb,index:i,aspect:screenW/screenH})),
      ...posters.map((p,i)=>({src:p.thumb,index:3+i,aspect:((i?105:137)*.78)/((i?135:130)*.76)}))];
    mediaPromise=Promise.all(entries.map(entry=>new Promise(resolve=>{
      if(!entry.src){resolve({src:entry.src,ok:false});return;}
      const image=new Image();image.decoding='async';image.onload=()=>{
        if(disposed){resolve({src:entry.src,ok:false});return;}
        const cellX=entry.index%2*512,cellY=Math.floor(entry.index/2)*256,aspect=image.width/image.height;
        const w=512*Math.min(1,aspect/entry.aspect),h=256*Math.min(1,entry.aspect/aspect);
        mg.fillStyle='#e8ddbd';mg.fillRect(cellX,cellY,512,256);mg.drawImage(image,cellX+(512-w)/2,cellY+(256-h)/2,w,h);
        mediaTexture.needsUpdate=true;resolve({src:entry.src,ok:true});
      };image.onerror=()=>resolve({src:entry.src,ok:false});image.src=worldAssetURL(entry.src);
    })));return mediaPromise;
  }
  room.onEnter=ensureMedia;
  function update(time,dt=1/60){kit.update(time,dt);
    const index=videos.length?Math.floor(time/4)%Math.min(3,videos.length):0;
    if(index!==lastSlide){setCell(screen.geometry,index);lastSlide=index;}
  }
  function setTheme(dark){kit.setTheme(dark);}
  const walkAreas=[...room.walkAreas,...entrySteps,...accessSteps,...stageAreas.map(area=>({...area,
    y:stage.frontY,ramp:{frontZ:stage.frontZ,backZ:stage.backZ,frontY:stage.frontY,backY:stage.backY}}))];
  function floorAt(x,z){
    const steps=[...accessSteps,...entrySteps].find(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ);
    if(steps)return steps.y;
    if(stageAreas.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ))return stageY(z);
    return x>=shell.minX-.05&&x<=shell.maxX+.05&&z>=shell.minZ-.05&&z<=shell.maxZ+.05?shell.floorY:0;
  }
  kit.flush();root.updateMatrixWorld(true);setTheme(false);update(0,0);
  const bounds=new THREE.Box3().setFromObject(root);
  let triangles=0,drawCalls=0;root.traverse(object=>{if(!object.isMesh||object.material.visible===false)return;
    const count=object.geometry.index?.count??object.geometry.attributes.position?.count??0;
    triangles+=count/3*(object.isInstancedMesh?object.count:1);drawCalls++;});
  const diagnostics={source:'procedural complete Talks room, original colours and media',units:'metres',parts,triangles,drawCalls,mediaLazy:true,
    room:{...shell,mainDoorWidth:1.40,rearDoorWidth:1.02,frontAisleWidth:.85,leftServiceAisleWidth:1.10,
      stageStepRise:rise,stageStepRun:.20,headroomAboveStage:shell.ceilingY-stage.backY,entry:stand,exit:room.exit,rearExit:room.rearExit},
    stage:{...stage,rakeDegrees:THREE.MathUtils.radToDeg(Math.atan2(stage.backY-stage.frontY,stage.frontZ-stage.backZ))},
    limitations:['Spectators are deliberately anonymous, muted solid figures rather than animated actors.',
      'The roof and all walls remain intact during interior viewing.']};
  return{root,bounds,worldScale:1,stand,rooms:[room],actionStand:{talk:{point:presentStand,facing:0,approach}},
    interactables,screen,update,setTheme,ensureMedia,diagnostics,colliders,colliderRadius:.12,floorAt,walkAreas,
    dispose(){if(disposed)return;disposed=true;kit.dispose();}};
}

export {createFaithfulTalks as createTalks};
