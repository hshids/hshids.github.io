import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {acquirePaintTexture,releasePaintTexture,worldAssetURL} from './fidelity-assets.js';
import {createRoomKit} from './fidelity-room-kit.js';
import {px,createHWLProps,createWritingInk} from './fidelity-hwl-geometry.js';
import {createCatCinema} from './life-cinema.js';
import {createTravelCase} from './life-luggage.js';
import {createSeafoodPlatter} from './life-seafood.js';

/** Complete gatehall, study and three-bay home. Original chapter/content IDs
 * survive; only supported art and family photos are two-dimensional prints. */
export async function createFaithfulHomeWritingLife({data=window.HJ_DATA,quality='high'}={}) {
  const root=new THREE.Group();root.name='complete-gatehall-study-three-bay-home';
  const scenes=[],kits=[],animated=[],sharedTextures=new Set();let dark=false;
  const writingArt=await acquirePaintTexture(worldAssetURL('assets/art/writing-screen-complete-painted.webp'),{quality});sharedTextures.add(writingArt);
  const artSheet=document.createElement('canvas');artSheet.width=1536;artSheet.height=1024;artSheet.getContext('2d').drawImage(writingArt.image,0,0,1536,1024);
  function scene(id) {
    const sr=new THREE.Group();sr.name='complete-'+id;root.add(sr);
    const kit=createRoomKit({root:sr,name:'HWL-'+id,quality}),props=createHWLProps({root:sr,resources:kit.resources,materialForRole:role=>kit.materials[role]});kits.push(kit);
    const s={id,root:sr,kit,props,worldScale:1,stand:[0,0,1.5],actionStand:[0,0,1.5],rooms:[],walkAreas:[],colliders:[],interactables:[],parts:[],diagnostics:{}};scenes.push(s);return s;
  }
  function room(s,options) {
    const r=s.kit.enclose(options);s.rooms.push(r);s.walkAreas.push(...r.walkAreas);s.colliders.push(...r.colliders);s.interactables.push(...r.interactables);return r;
  }
  function area(s,id,minX,maxX,minZ,maxZ,y=0) {s.walkAreas.push({id,minX,maxX,minZ,maxZ,y});}
  function obstacle(s,id,size,position) {s.colliders.push({id,min:position.map((v,i)=>v-size[i]/2),max:position.map((v,i)=>v+size[i]/2)});}
  function solid(s,name,size,position,role='wood',parent=s.root) {
    const mesh=s.kit.box(name,size,position,role,parent);s.parts.push({name,size,position,role,kind:'complete-solid-box'});return mesh;
  }
  function pick(s,id,type,point,size,title,focus,stand=s.stand) {
    const geometry=new THREE.BoxGeometry(...size),material=new THREE.MeshBasicMaterial({visible:false}),object=new THREE.Mesh(geometry,material);object.position.fromArray(point);object.name='interaction-'+id;object.userData.interaction=id;s.root.add(object);s.kit.resources.add(geometry);s.kit.resources.add(material);
    const item={id,type,object,point,stand,title,focus,chapter:s.id};s.interactables.push(item);return item;
  }
  function steps(s,id,x,z,width,floorY,side='front') {
    const count=Math.max(1,Math.ceil(floorY/.11)),depth=.28,sign=side==='front'?1:-1;
    for(let i=0;i<count;i++){
      const h=floorY*(1-i/count),centreZ=z+sign*(i+.5)*depth,mesh=solid(s,id+'-bearing-tread-'+i,[width,h,depth],[x,h/2,centreZ],'stone');mesh.userData.walkSurface=true;mesh.userData.keepMesh=true;
      area(s,id+'-tread-'+i,x-width/2,x+width/2,centreZ-depth/2,centreZ+depth/2,h);
    }
  }
  function roof(s,name,bounds,eaveY,ridgeY) {
    s.kit.roof({name,minX:bounds[0],maxX:bounds[1],minZ:bounds[2],maxZ:bounds[3],eaveY,ridgeY});
    // Solid upturned corner ornaments retain the Chinese gate/house silhouette.
    for(const x of[bounds[0],bounds[1]])for(const z of[bounds[2],bounds[3]]){
      const dx=x===bounds[0]?-.14:.14,dz=z===bounds[2]?-.11:.11;
      s.props.tube(name+'-upturned-corner-base-'+x+'-'+z,[x,eaveY+.025,z],[x+dx,eaveY+.15,z+dz],.055,'roof');
      s.props.tube(name+'-upturned-corner-tip-'+x+'-'+z,[x+dx,eaveY+.15,z+dz],[x+dx*1.22,eaveY+.30,z+dz*1.12],.035,'roof',s.root,8,.02);
    }
  }
  function lantern(s,id,position,distance=1.8) {
    const g=new THREE.Group();g.name=id;g.position.fromArray(position);s.root.add(g);
    solid(s,id+'-top',[.23,.055,.23],[0,.19,0],'darkWood',g);solid(s,id+'-bottom',[.23,.055,.23],[0,-.19,0],'darkWood',g);
    const pane=s.props.material('ivory',{emissive:'#edb66d',emissiveIntensity:0,roughness:.65});s.props.mesh(id+'-opaque-warm-paper',new THREE.BoxGeometry(.19,.32,.19),pane,[0,0,0],g);
    for(const x of[-.108,.108])for(const z of[-.108,.108])solid(s,id+'-corner-'+x+'-'+z,[.025,.36,.025],[x,0,z],'wood',g);
    const bearingY=s.rooms[0]?.bounds.max[1]??position[1]+.40;
    s.props.tube(id+'-hanger',[position[0],position[1]+.20,position[2]],[position[0],bearingY,position[2]],.012,'brass');
    s.kit.lamp(position,.48,distance);animated.push(()=>{pane.emissiveIntensity=dark?.30:0;});return g;
  }
  function finish(s) {
    const construction=s.kit.flush();s.root.updateMatrixWorld(true);s.bounds=new THREE.Box3().setFromObject(s.root);
    let triangles=0,drawCalls=0,opaqueUnlit=0;s.root.traverse(o=>{if(!o.isMesh||o.material?.visible===false)return;drawCalls++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m.isMeshBasicMaterial&&!m.transparent)opaqueUnlit++;});
    Object.assign(s.diagnostics,{...construction,triangles,drawCalls,opaqueUnlit,parts:s.parts,construction:'Complete metre-authored PBR shell and full solid furniture; photographs and four screen paintings only on actual supported print surfaces.'});
  }

  const home=scene('home');buildWelcome(home);
  const writing=scene('writing');buildWriting(writing);
  const life=scene('life');await buildLife(life);
  artSheet.width=artSheet.height=1;

  function buildWelcome(s) {
    const floorY=.30;s.stand=[-.91,0,1.35];s.actionStand=s.stand.slice();
    room(s,{id:'welcome-gatehall',label:'Welcome gatehall',minX:-3.55,maxX:1.73,minZ:-3.50,maxZ:0,floorY,ceilingY:2.95,wallThickness:.20,
      openings:[{id:'welcome-front-gates',side:'front',centre:-.91,width:1.65,height:2.4,type:'door',open:true},{id:'welcome-rear-gates',side:'back',centre:-.91,width:1.65,height:2.4,type:'door',open:true},...['front','back'].flatMap(side=>[-2.72,.89].map((centre,i)=>({id:'welcome-'+side+'-window-'+i,side,centre,width:.58,height:.88,sill:1.02,type:'window'}))),{id:'welcome-side-left-window',side:'left',centre:-1.75,width:1.1,height:.88,sill:1.02,type:'window'},{id:'welcome-side-right-window',side:'right',centre:-1.75,width:1.1,height:.88,sill:1.02,type:'window'}],
      entry:[-.91,0,1.05],inside:[-.91,floorY,-1.60],exit:[-.91,0,1.15],camera:{target:[-.91,1.35,-1.75],offset:[0,.48,1.38]}});
    // The full footprint bears on ground, not only the front/rear stairs.
    const foundationTop=floorY-.024;
    solid(s,'welcome-continuous-ground-bearing-foundation',[5.50,foundationTop,3.72],[-.91,foundationTop/2,-1.75],'stone');
    s.diagnostics.foundation={minY:0,maxY:foundationTop,minX:-3.66,maxX:1.84,minZ:-3.61,maxZ:.11};
    roof(s,'welcome-curved-tile-gate-roof',[-3.95,2.13,-3.9,.4],3.08,3.80);
    for(const x of[-3.55,1.73])for(const z of[0,-3.5])s.kit.round('welcome-bearing-column-'+x+'-'+z,.105,2.65,[x,floorY+1.325,z],'wood',s.root,10);
    s.kit.sign('welcome-inlaid-plaque','WELCOME',[1.56,.27,.13],[-.91,2.82,.145],'darkWood');
    steps(s,'welcome-front-stairs',-.91,0,2.10,floorY);steps(s,'welcome-rear-stairs',-.91,-3.50,2.10,floorY,'back');
    area(s,'welcome-forecourt',-4.3,3.8,.84,2.2,0);area(s,'welcome-rear-ground',-2.4,.6,-4.5,-4.34,0);
    // Gate wings are empty, genuinely floor-bearing spaces; no large box fills
    // the passage or pretends to be an interior.
    solid(s,'welcome-left-interior-bench-seat',[.85,.10,.42],[-2.66,floorY+.36,-2.78],'wood');
    for(const x of[-2.99,-2.33])solid(s,'welcome-left-interior-bench-foot-'+x,[.11,.31,.32],[x,floorY+.155,-2.78],'darkWood');
    obstacle(s,'welcome-bench',[.88,.46,.46],[-2.66,floorY+.23,-2.78]);
    lantern(s,'welcome-entrance-lantern',[-2.0,2.43,.16],1.65);lantern(s,'welcome-rear-lantern',[.10,2.43,-3.30],1.45);
    // News keeps its own complete freestanding board and three paper notices.
    const nx=2.83,nz=.08;
    for(const x of[nx-.59,nx+.59]){solid(s,'news-grounded-post-'+x,[.095,1.7,.12],[x,.85,nz],'wood');solid(s,'news-grounded-post-foot-'+x,[.21,.09,.27],[x,.045,nz],'stone');}
    solid(s,'news-notice-board-complete-back',[1.28,.91,.14],[nx,1.16,nz-.05],'darkWood');
    for(let i=0;i<3;i++)solid(s,'news-supported-paper-notice-'+i,[.27,.60,.018],[nx+(i-1)*.35,1.15,nz+.03],'ivory');
    s.kit.sign('news-engraved-name','NEWS',[.75,.19,.075],[nx,1.72,nz+.04],'wood');
    s.kit.roof({name:'news-full-small-tile-roof',minX:nx-.79,maxX:nx+.79,minZ:nz-.37,maxZ:nz+.35,eaveY:1.89,ridgeY:2.12});
    obstacle(s,'news-board-legs',[1.37,1.8,.24],[nx,.9,nz]);
    pick(s,'home-gate','panel',[-.91,2.82,.24],[1.56,.28,.16],'Welcome',{section:'about'},s.stand);
    pick(s,'home-news','news',[nx,1.2,nz+.09],[1.22,.91,.16],'News',{news:true},[nx,0,.85]);finish(s);
  }

  function buildWriting(s) {
    const floorY=.12,deskTop=.58,deskZ=-1.30,cz=deskZ+.35;s.stand=[-1.08,0,1.35];s.actionStand=[-1.08,floorY,-.35];
    room(s,{id:'writing-study',label:'Writing study',minX:-3.65,maxX:5.35,minZ:-4.25,maxZ:.60,floorY,ceilingY:2.95,wallThickness:.16,
      openings:[{id:'writing-study-doors',side:'front',centre:.10,width:3.5,height:2.46,type:'door',open:true},{id:'writing-front-left-window',side:'front',centre:-2.78,width:.70,height:1.05,sill:1.06,type:'window'},{id:'writing-front-right-window',side:'front',centre:4.28,width:1.1,height:1.05,sill:1.06,type:'window'},...[-2.75,.05,3.60].map((centre,i)=>({id:'writing-rear-window-'+i,side:'back',centre,width:1.05,height:1.07,sill:1.06,type:'window'})),{id:'writing-left-window',side:'left',centre:-1.3,width:1.15,height:1.07,sill:1.06,type:'window'},{id:'writing-right-window',side:'right',centre:-1.3,width:1.15,height:1.07,sill:1.06,type:'window'}],
      entry:[.10,0,1.20],inside:[-2.85,floorY,-1.25],exit:[.10,0,1.20],camera:{target:[.25,1.20,-2.35],offset:[0,.65,1.72]}});
    roof(s,'writing-study-full-tile-roof',[-4.0,5.70,-4.60,.95],3.08,3.87);
    steps(s,'writing-study-front-steps',.1,.60,3.55,floorY);area(s,'writing-front-ground',-4.05,5.45,1.16,2.2,0);
    s.kit.sign('writing-beam-inlaid-plaque','WRITING',[1.55,.27,.12],[.1,2.78,.705],'darkWood');
    // Low desk: top, complete apron, four legs and floor-grounded stretches.
    solid(s,'writing-complete-low-desk-top',[4.18,.095,.84],[.16,deskTop-.0475,deskZ-.20],'wood');
    solid(s,'writing-desk-front-apron',[3.72,.13,.075],[.16,deskTop-.14,deskZ+.155],'darkWood');
    for(const x of[-1.70,2.02])for(const z of[deskZ+.11,deskZ-.52])solid(s,'writing-desk-grounded-leg-'+x+'-'+z,[.12,deskTop-floorY-.095,.12],[x,floorY+(deskTop-floorY-.095)/2,z],'wood');
    solid(s,'writing-paper-bearing-sheet',[2.38,.014,.40],[px(3),deskTop+.007,deskZ-.03],'ivory');
    const ink=createWritingInk({root:s.root,resources:s.kit.resources,deskTop,deskZ,onTip:tip=>{s.root.userData.writingTip=tip;}});
    s.root.userData.setWritingActive=active=>ink.setActive(active);s.root.userData.getWritingTip=ink.getTip;s.root.userData.paper=ink.paper;s.root.userData.brushTarget=[px(53),deskTop+.026,deskZ-.11];animated.push((t,dt)=>ink.update(dt));
    s.root.userData.inkDiaryPaper=ink.mesh;
    for(const x of[-1.12,1.22])s.props.tube('writing-actual-rolled-scroll-end-'+x,[x,deskTop+.042,deskZ-.23],[x,deskTop+.042,deskZ+.18],.03,'ivory');
    s.props.lathe('writing-real-recessed-inkstone',[[0,0],[.14,0],[.16,.04],[.13,.062],[.105,.062],[.105,.035],[0,.035]],[1.61,deskTop,-1.65],'ink');
    s.props.cylinder('writing-jade-brush-pot',.085,.25,[-1.6,deskTop+.125,-1.71],'green');
    for(let i=0;i<4;i++){
      const x=-1.64+i*.026;s.props.tube('writing-brush-pot-bamboo-shaft-'+i,[x,deskTop+.15,-1.71],[x+(i-1.5)*.025,deskTop+.51+(i%2)*.035,-1.71],.009,'wood');s.props.tube('writing-brush-pot-soft-hairs-'+i,[x+(i-1.5)*.025,deskTop+.51+(i%2)*.035,-1.71],[x+(i-1.5)*.025,deskTop+.58+(i%2)*.035,-1.71],.017,'ivory',s.root,8,.003);
    }
    s.props.cylinder('writing-brass-candle-base',.11,.035,[1.96,deskTop+.0175,-1.72],'brass');s.props.cylinder('writing-wax-candle',.04,.23,[1.96,deskTop+.15,-1.72],'ivory');
    const flame=s.props.sphere('writing-tiny-candle-flame',[.018,.04,.018],[1.96,deskTop+.305,-1.72],'ivory');flame.material=s.props.material('ivory',{emissive:'#ffbf73',emissiveIntensity:.22});animated.push(()=>{flame.material.emissiveIntensity=dark?.65:.22;});s.kit.lamp([1.96,deskTop+.34,-1.72],.45,1.6);
    const pad=s.props.sphere('writing-complete-soft-embroidered-kneeling-pad',[.80,.047,.53],[px(14.2),floorY+.047,cz],'cloth');
    const rim=s.props.torus('writing-pad-gold-breathing-thread',.72,.008,[px(14.2),floorY+.070,cz],'brass');rim.scale.y=.64;rim.material=s.props.material('brass',{emissive:'#cbaa64',emissiveIntensity:.09});animated.push(t=>{rim.material.emissiveIntensity=(dark?.19:.06)+.035*(.5+.5*Math.sin(t*1.35));});
    s.root.userData.cushion={centre:[px(14.2),floorY+.094,cz],seat:[px(41),floorY+.094,cz],radius:.80,base:floorY,height:.094};
    // Four real carved frames: each has an ivory backing and one inset painting.
    const names=['plum','orchid','bamboo','chrysanthemum'],regions=[[103,105,238,330],[262,105,398,330],[426,105,562,330],[592,105,724,330]];
    for(let i=0;i<4;i++){
      const x=-1.83+i*1.22,z=-3.08,w=1.12,h=1.92;
      solid(s,'writing-screen-complete-'+names[i]+'-back',[w,h,.13],[x,floorY+1.17,z],'darkWood');solid(s,'writing-screen-'+names[i]+'-ivory-inlay',[w-.16,h-.37,.04],[x,floorY+1.25,z+.075],'ivory');
      for(const dx of[-w/2+.035,w/2-.035])solid(s,'writing-screen-'+names[i]+'-grounded-post-'+dx,[.09,2.25,.16],[x+dx,floorY+1.125,z],'wood');
      for(const dy of[.33,2.07])solid(s,'writing-screen-'+names[i]+'-cross-rail-'+dy,[w+.05,.085,.17],[x,floorY+dy,z],'wood');
      solid(s,'writing-screen-'+names[i]+'-soft-carved-crest',[w*.56,.12,.16],[x,floorY+2.28,z],'wood');
      for(const dx of[-.48,.48])solid(s,'writing-screen-'+names[i]+'-bearing-foot-'+dx,[.22,.09,.32],[x+dx,floorY+.045,z],'darkWood');
      const cv=document.createElement('canvas');cv.width=256;cv.height=384;const c=cv.getContext('2d');c.fillStyle='#eee3cb';c.fillRect(0,0,256,384);const[l,t,r,b]=regions[i];c.drawImage(artSheet,l,t,r-l,b-t,0,0,256,384);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;s.kit.resources.add(texture);
      const print=s.props.print('writing-screen-'+names[i]+'-actual-inset-painting',texture,w-.21,h-.42,[x,floorY+1.25,z+.098]);let stirUntil=0;
      const item=pick(s,'writing-screen-'+names[i],'screen',[x,floorY+1.25,z+.13],[w-.2,h-.4,.16],['Plum · resilience','Orchid · grace','Bamboo · integrity','Chrysanthemum · composure'][i],{screenPlant:names[i]},[x,floorY,-2.40]);item.onInteract=()=>{stirUntil=performance.now()/1000+1.5;};animated.push(t=>{print.material.color.setScalar(performance.now()/1000<stirUntil?1+.035*Math.sin(t*7):1);});
    }
    obstacle(s,'writing-screen-bearing-frames',[4.85,2.36,.32],[0,floorY+1.18,-3.08]);
    // Tutorials remain rolled documents in a complete antique archive rack.
    const ax=3.63,az=-2.90,aw=1.15;
    for(const dx of[-aw/2,aw/2])solid(s,'writing-archive-full-height-post-'+dx,[.085,2.25,.64],[ax+dx,floorY+1.125,az],'wood');
    solid(s,'writing-archive-complete-wooden-back',[aw,2.13,.08],[ax,floorY+1.15,az-.31],'darkWood');
    s.kit.sign('writing-archive-carved-crown','TUTORIALS',[aw+.16,.24,.16],[ax,floorY+2.28,az+.015],'wood');
    const tutorials=data?.tutorials||[];
    for(let i=0;i<Math.max(4,tutorials.length);i++){
      const cy=floorY+.32+i*.47;solid(s,'writing-archive-real-bearing-shelf-'+i,[aw,.065,.63],[ax,cy-.075,az],'wood');
      const scroll=s.props.cylinder('writing-archive-rolled-document-'+i,.09,.89,[ax,cy+.035,az+.10],'ivory');scroll.rotation.z=Math.PI/2;
      for(const dx of[-.455,.455]){const end=s.props.cylinder('writing-archive-solid-scroll-handle-'+i+'-'+dx,.11,.035,[ax+dx,cy+.035,az+.10],'darkWood');end.rotation.z=Math.PI/2;}
      const tutorial=tutorials[i];if(tutorial){s.kit.sign('writing-archive-inlaid-document-label-'+i,tutorial.label,[.58,.115,.026],[ax,cy+.035,az+.205],'ivory');pick(s,'writing-tutorial-'+tutorial.id,'tutorial',[ax,cy+.035,az+.245],[.99,.26,.2],tutorial.title,{tutorial:tutorial.id},[ax,floorY,-1.76]);}
    }
    obstacle(s,'writing-archive-solid',[1.30,2.43,.67],[ax,floorY+1.215,az]);
    // Suspended papers share real ropes and a supported, carved cross-beam.
    const beamY=2.48,beamZ=-2.84;solid(s,'writing-supported-ornament-cross-beam',[5.15,.11,.13],[.12,beamY,beamZ],'wood');
    for(const x of[-2.48,2.72]){solid(s,'writing-ornament-support-post-'+x,[.11,beamY-floorY,.12],[x,(beamY+floorY)/2,beamZ],'darkWood');obstacle(s,'writing-ornament-post-'+x,[.12,beamY-floorY,.13],[x,(beamY+floorY)/2,beamZ]);}
    for(let i=0;i<6;i++){
      const x=-1.95+i*.77,y=2.13-(i%2)*.09,z=beamZ+.07,star=i%2,g=new THREE.Group();g.name='writing-connected-rope-ornament-'+i;g.position.set(x,beamY,z);s.root.add(g);
      s.props.tube('writing-thin-hemp-rope-'+i,[0,0,0],[0,y-beamY+.06,0],.004,'cloth',g,6);
      if(star){const points=[];for(let j=0;j<10;j++){const a=j*Math.PI/5+Math.PI/2,r=j%2?.057:.13;points.push([Math.cos(a)*r,Math.sin(a)*r]);}s.props.prism('writing-full-paper-star-'+i,points,.045,[0,y-beamY,0],'brass',g);}
      else{
        s.props.mesh('writing-solid-paper-crane-body-'+i,new THREE.OctahedronGeometry(.085),s.props.material('ivory'),[0,y-beamY,0],g);
        for(const sign of[-1,1]){const wing=s.props.prism('writing-crane-folded-wing-'+i+'-'+sign,[[0,-.02],[sign*.17,.095],[sign*.04,.05]],.028,[0,y-beamY,.02],'ivory',g);wing.rotation.y=sign*.32;}
        s.props.tube('writing-crane-full-neck-'+i,[-.05,y-beamY+.02,0],[-.08,y-beamY+.13,.02],.013,'ivory',g,6,.011);
        s.props.prism('writing-crane-pointed-beak-'+i,[[-.01,0],[-.075,-.016],[-.01,.022]],.027,[-.08,y-beamY+.13,.02],'red',g);
      }
      let flutterUntil=0;const item=pick(s,'writing-ornament-'+i,star?'star':'crane',[x,y,z+.07],[.32,.28,.18],star?'A little paper star':'A folded paper crane',{ornament:i},[x,floorY,-2.40]);item.onInteract=()=>{flutterUntil=performance.now()/1000+2.4;};animated.push(t=>{const active=performance.now()/1000<flutterUntil;g.rotation.z=Math.sin(t*(active?4:.65)+i)*(active?.075:.025);g.rotation.y=Math.sin(t*(active?3:.5)+i)*(active?.12:.018);});
    }
    lantern(s,'writing-side-window-lantern',[-2.94,2.34,-2.87],1.45);
    obstacle(s,'writing-desk-solid',[4.18,deskTop-floorY+.06,.84],[.16,floorY+(deskTop-floorY+.06)/2,deskZ-.20]);
    pick(s,'writing-seat','write',[px(14.2),floorY+.094,cz],[1.58,.14,1.08],'Sit and write',{action:'write'},[px(14.2),floorY,-.20]);
    pick(s,'writing-inkstone','ink',[1.61,deskTop+.08,-1.65],[.36,.20,.38],'Try the inkstone',{easter:'ink'},[1.61,floorY,-.73]);
    // The general Blogs entry uses the vacant right-hand wooden apron, not
    // the paper area occupied by the independently clickable article picks.
    pick(s,'writing-blogs','blogs',[1.28,deskTop-.14,deskZ+.2125],[.50,.125,.065],'Blogs',{section:'writing-blogs'},[-.89,floorY,-.32]);
    (data?.writing||[]).forEach((post,i)=>pick(s,'writing-blog-'+post.id,'blog',[px(-66+i*71),deskTop+.05,deskZ-.30],[.68,.16,.28],post.title,{post:post.id},[px(-66+i*71),floorY,-.32]));
    s.diagnostics.aisles={leftOfScreen:1.10,rightOfArchive:1.0,rearOfScreen:.93,betweenDeskAndScreen:.96,frontOfPad:.94};s.diagnostics.paperSupport={deskTop,paperY:deskTop+.016,deskZ};finish(s);
  }

  async function buildLife(s) {
    const floorY=.24;s.stand=[0,0,1.30];s.actionStand={pet:{point:[.09,floorY,-1.36],facing:Math.PI,approach:[[.09,floorY,-.64]]}};
    room(s,{id:'life-three-bay-home',label:'Life home',minX:-4.10,maxX:4.10,minZ:-4.00,maxZ:-.10,floorY,ceilingY:2.95,wallThickness:.18,
      openings:[{id:'life-kitchen-front-door',side:'front',centre:-2.60,width:1.85,height:2.40,type:'door',open:true},{id:'life-centre-front-door',side:'front',centre:0,width:2.10,height:2.40,type:'door',open:true},{id:'life-travel-front-door',side:'front',centre:2.60,width:1.85,height:2.40,type:'door',open:true},...[-2.65,0,2.65].map((centre,i)=>({id:'life-rear-window-'+i,side:'back',centre,width:1.12,height:1.0,sill:1.08,type:'window'})),{id:'life-kitchen-side-window',side:'left',centre:-2.0,width:1.08,height:1.0,sill:1.08,type:'window'},{id:'life-travel-side-window',side:'right',centre:-2.0,width:1.08,height:1.0,sill:1.08,type:'window'}],
      entry:[0,0,1.1],inside:[0,floorY,-.88],exit:[0,0,1.1],camera:{target:[0,1.2,-2.35],offset:[0,.60,1.75]}});
    const foundationTop=floorY-.024;
    solid(s,'life-continuous-ground-bearing-foundation',[8.42,foundationTop,4.12],[0,foundationTop/2,-2.05],'stone');
    s.diagnostics.foundation={minY:0,maxY:foundationTop,minX:-4.21,maxX:4.21,minZ:-4.11,maxZ:.01};
    roof(s,'life-full-three-bay-tile-house',[-4.48,4.48,-4.38,.28],3.08,3.79);
    steps(s,'life-front-veranda-steps',0,-.1,7.60,floorY);area(s,'life-front-ground',-4.4,4.4,.74,2.1,0);
    s.kit.sign('life-inlaid-house-plaque','LIFE',[1.15,.27,.13],[0,2.79,.045],'darkWood');
    for(const x of[-1.32,1.32]){
      solid(s,'life-bay-rear-divider-'+x,[.12,2.40,1.06],[x,floorY+1.20,-3.46],'wood');obstacle(s,'life-bay-rear-divider-'+x,[.12,2.40,1.06],[x,floorY+1.20,-3.46]);
      s.kit.round('life-bay-grounded-column-'+x,.095,2.71,[x,floorY+1.355,-.10],'wood',s.root,10);
    }
    // Three connected bays share the uninterrupted front aisle; dividers stop
    // behind it. Furniture volumes and pick points all use this floor.
    s.diagnostics.bays=[{id:'kitchen',minX:-4,maxX:-1.32},{id:'cats',minX:-1.32,maxX:1.32},{id:'travel',minX:1.32,maxX:4}];
    // Kitchen carcasses, shelves, doors and worktop have full sides/back.
    solid(s,'life-kitchen-complete-counter-body',[1.64,.77,.60],[-2.65,floorY+.385,-3.48],'wood');solid(s,'life-kitchen-complete-worktop',[1.78,.10,.72],[-2.65,floorY+.82,-3.46],'darkWood');
    for(let i=0;i<3;i++)solid(s,'life-kitchen-counter-panel-door-'+i,[.49,.64,.055],[-3.18+i*.53,floorY+.39,-3.147],'wood');
    for(let i=0;i<3;i++)s.props.cylinder('life-kitchen-counter-door-knob-'+i,.023,.03,[-3.02+i*.53,floorY+.41,-3.105],'brass').rotation.x=Math.PI/2;
    solid(s,'life-kitchen-upper-complete-cabinet',[.65,.42,.39],[-3.65,floorY+1.78,-3.68],'wood');
    for(let i=0;i<3;i++)solid(s,'life-kitchen-upper-cabinet-panel-'+i,[.18,.34,.04],[-3.86+i*.21,floorY+1.78,-3.463],'wood');
    obstacle(s,'life-kitchen-cupboard',[1.82,.93,.79],[-2.65,floorY+.465,-3.55]);obstacle(s,'life-kitchen-upper-cabinet',[.65,.42,.39],[-3.65,floorY+1.78,-3.68]);s.kit.lamp([-3.65,floorY+1.5,-3.28],.42,1.1);
    const sx=-2.58,sz=-1.74;
    s.props.lathe('life-solid-clay-stove',[[0,0],[.32,0],[.36,.05],[.39,.41],[.35,.52],[0,.52]],[sx,floorY,sz],'red');
    solid(s,'life-stove-real-front-coal-mouth-frame',[.30,.20,.075],[sx,floorY+.22,sz+.36],'darkWood');solid(s,'life-stove-recessed-coal-bed',[.23,.125,.085],[sx,floorY+.22,sz+.367],'ink');
    const coals=s.props.material('red',{emissive:'#d46b2c',emissiveIntensity:.10});s.props.mesh('life-stove-warm-real-coals',new THREE.BoxGeometry(.18,.055,.032),coals,[sx,floorY+.18,sz+.418]);s.kit.lamp([sx,floorY+.20,sz+.46],.28,.90);
    s.props.lathe('life-real-hollow-cooking-pot',[[0,0],[.23,0],[.31,.13],[.34,.28],[.32,.315],[.285,.285],[.255,.125],[.18,.07],[0,.07]],[sx,floorY+.53,sz],'ink');
    for(const sign of[-1,1]){
      const handle=s.props.torus('life-pot-real-handle-'+sign,.075,.016,[sx+sign*.34,floorY+.77,sz],'ink');handle.rotation.set(0,Math.PI/2,0);
    }
    const lid=new THREE.Group();lid.name='life-real-opening-pot-lid';lid.position.set(sx,floorY+.845,sz);s.root.add(lid);s.props.lathe('life-complete-domed-pot-lid',[[0,0],[.343,0],[.28,.06],[.10,.105],[0,.11]],[0,0,0],'ink',lid);s.props.sphere('life-pot-lid-handle',[.05,.04,.05],[0,.125,0],'darkWood',lid);
    const steam=[];for(let i=0;i<2;i++){
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(sx+(i-.5)*.09,floorY+.97,sz),new THREE.Vector3(sx-.035+(i-.5)*.09,floorY+1.12,sz),new THREE.Vector3(sx+.02+(i-.5)*.09,floorY+1.29,sz)]),m=new THREE.MeshStandardMaterial({color:'#eee9de',roughness:1,transparent:true,opacity:.08,depthWrite:false}),object=s.props.mesh('life-subtle-actual-pot-steam-'+i,new THREE.TubeGeometry(curve,14,.008,5,false),m);object.castShadow=false;object.userData.roomSolid=false;s.kit.resources.add(m);steam.push(object);
    }
    // Lifting the lid serves a steamed platter from home: the lid floats up and tips back, a bamboo steamer
    // rises out of the pot with mantis shrimp, a swimming crab, clams, sea snails and shrimp.
    const platter=createSeafoodPlatter({root:s.root,resources:s.kit.resources,position:[sx,floorY+.65,sz],low:quality==='low'});
    let cookingUntil=0,served=0,lift=0;
    s.root.userData.setCooking=()=>{const now=performance.now()/1000,fresh=now>=cookingUntil;cookingUntil=now+14;return fresh?'served':'again';};
    animated.push((t,dt)=>{const active=performance.now()/1000<cookingUntil,k=Math.min(.1,dt||0);
      lift=dt?THREE.MathUtils.damp(lift,active?1:0,3.2,k):(active?1:0);served=dt?THREE.MathUtils.damp(served,active&&lift>.55?1:0,2.6,k):(active?1:0);
      const e=lift*lift*(3-2*lift);
      lid.position.set(sx-.04*e,floorY+.845+.44*e+(active?.008*Math.sin(t*2.2):0),sz-.30*e);lid.rotation.set(-.95*e,0,active?.02*Math.sin(t*1.7):0);
      platter.group.position.y=floorY+.65+.27*served;platter.update(t,served);
      coals.emissiveIntensity=dark?.35+(active?.15:0):.10+(active?.12:0);steam.forEach((v,i)=>{v.material.opacity=active?.17:dark?.09:.045;v.position.y=.025*Math.sin(t*.8+i);});});
    obstacle(s,'life-stove-bearing-volume',[.88,1.06,.90],[sx,floorY+.53,sz]);
    // XiaoHei's pad is inside the middle bay, on the same bearing floor.
    const cx=0,cz=-2.00,padY=floorY+.10;
    // A broad flat bearing top supports every paw at catSeat Y; the rounded
    // shoulder preserves the soft pouf silhouette without an ellipsoid peak.
    const pad=s.props.lathe('life-complete-soft-woven-cat-pouf',[[0,0],[.76,0],[.90,.02],[.98,.06],[1,.10],[.98,.14],[.94,.178],[.88,.196],[.84,.20],[0,.20]],[cx,floorY,cz],'cloth',s.root,24);
    pad.scale.set(.65,1,.50);pad.userData.bearingTop={y:floorY+.20,radiusX:.546,radiusZ:.420};
    // Faint local ambient occlusion at the unchanged Idle sole footprints.
    // This modulates this pouf's ambient light, without an overlay/ring or a
    // change to its real bearing surface, direct shadows or shared cloth.
    const contacts=[[-.0686,.1615],[.0687,.1623],[-.0900,-.0933],[.0909,-.0943]],aoSize=quality==='low'?128:256,aoPixels=new Uint8Array(aoSize*aoSize*4);
    for(let y=0;y<aoSize;y++)for(let x=0;x<aoSize;x++){
      const dx=((x+.5)/aoSize-.5)*1.30,dz=((y+.5)/aoSize-.5),occlusion=contacts.reduce((sum,[px,pz])=>sum+.14*Math.exp(-.5*((dx-px)**2/.038**2+(dz-pz)**2/.050**2)),0),value=Math.round(255*(1-Math.min(.17,occlusion))),i=(y*aoSize+x)*4;
      aoPixels[i]=aoPixels[i+1]=aoPixels[i+2]=value;aoPixels[i+3]=255;
    }
    const contactAO=new THREE.DataTexture(aoPixels,aoSize,aoSize);contactAO.channel=1;contactAO.magFilter=THREE.LinearFilter;contactAO.minFilter=THREE.LinearMipmapLinearFilter;contactAO.generateMipmaps=true;contactAO.needsUpdate=true;s.kit.resources.add(contactAO);
    const p=pad.geometry.attributes.position,uv1=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv1[i*2]=.5+p.getX(i)/2;uv1[i*2+1]=.5+p.getZ(i)/2;}pad.geometry.setAttribute('uv1',new THREE.BufferAttribute(uv1,2));
    pad.material=pad.material.clone();pad.material.name='life-pouf-faint-local-paw-contact-AO';pad.material.aoMap=contactAO;pad.material.aoMapIntensity=.65;s.kit.resources.add(pad.material);
    pad.userData.pawContactAO={localContacts:contacts,maxAmbientOcclusion:.17*.65,method:'Faint Gaussian ambient occlusion on the true flat bearing surface; no ring or projected mesh.'};
    const piping=s.props.torus('life-cat-pouf-sewn-piping',.57,.010,[cx,padY+.025,cz],'red');piping.scale.y=.75;
    s.root.userData.catSeat={position:[cx,floorY+.20,cz],front:[cx,floorY,cz+.68],radius:.65,name:'XiaoHei',pose:'sleep'};
    s.kit.sign('life-family-photo-small-caption','SIX CATS',[1.17,.18,.08],[0,floorY+2.14,-3.865],'wood');
    lantern(s,'life-cat-room-warm-lantern',[.87,2.43,-3.45],1.45);
    // Travel case: an upright vintage leather suitcase with straps, latches, a handle, stickers and a name tag.
    const tx=2.56,tz=-1.35;
    const travelCase=createTravelCase({root:s.root,resources:s.kit.resources,floorY,x:tx,z:tz,low:quality==='low'});
    travelCase.obstacles.forEach(o=>obstacle(s,o.id,o.size,o.position));
    // The six-cat picture house: stage, masked screen, velvet curtains, pelmet, marquee and a front row.
    const gx=2.90,gz=-3.10,gy=floorY+1.08;
    const cinema=createCatCinema({root:s.root,resources:s.kit.resources,floorY,x:gx,z:gz,screenY:1.08,low:quality==='low'});
    cinema.obstacles.forEach(o=>obstacle(s,o.id,o.size,o.position));
    // the two velvet seats can be sat in: the eye drops into the seat, facing the screen
    cinema.seats.forEach((dx,i)=>{const sx=gx+dx,sz=gz+cinema.rowZ;
      pick(s,'life-cinema-seat-'+i,'seat',[sx,floorY+.24,sz+.04],[.24,.36,.30],'Take a seat',{life:'cats'},[sx,floorY,sz+.55]).seat={
        eye:[sx,floorY+.98,sz+.26],look:[gx,floorY+1.08,gz+.052],stand:[gx+dx*.6,floorY+1.55,sz+.80],
        line:i?'Front row, with popcorn. Now showing: six cats.':'This one says Reserved. XiaoHei won’t mind if I keep it warm. Now showing: six cats.'};});
    const photos=(data?.cats||[]).map(cat=>({src:quality==='low'?cat.photos?.[0]?.replace('images/cats/','images/cats/thumbs/'):cat.photos?.[0],name:cat.name,id:cat.id})),cv=document.createElement('canvas');cv.width=768;cv.height=676;const pc=cv.getContext('2d');pc.fillStyle='#e8deca';pc.fillRect(0,0,768,676);const photoFailures=[];
    await Promise.all(photos.map((cat,i)=>new Promise(resolve=>{const image=new Image();image.onload=()=>{const x=i%3*256,y=Math.floor(i/3)*338,w=256,h=338,scale=Math.max(w/image.width,h/image.height);pc.save();pc.beginPath();pc.rect(x,y,w,h);pc.clip();pc.drawImage(image,x+(w-image.width*scale)/2,y+(h-image.height*scale)/2,image.width*scale,image.height*scale);pc.restore();resolve();};image.onerror=()=>{photoFailures.push(cat.src);resolve();};image.src=worldAssetURL(cat.src);})));const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;s.kit.resources.add(texture);
    const photo=s.props.print('life-supported-actual-cat-photograph',texture,1.15,1.43,[gx,gy,gz+.052]),pg=photo.geometry;cinema.patchScreen(photo.material,[1.15,1.43]);let photoIndex=-1,cutAt=0;animated.push(t=>{const index=Math.floor(t/2.5)%Math.max(1,photos.length);if(index!==photoIndex)cutAt=t;cinema.update(t,dark,t-cutAt);if(index===photoIndex)return;photoIndex=index;const uv=pg.attributes.uv,base=[[0,1],[1,1],[0,0],[1,0]];for(let i=0;i<uv.count;i++)uv.setXY(i,(index%3+base[i][0])/3,1-(Math.floor(index/3)+1-base[i][1])/2);uv.needsUpdate=true;});
    // A vintage 16 mm film projector: an enamel body with chrome trim, a vented lamp house, two spoked
    // reels on arms with film threaded down into the gate, a ringed lens, a crank, and a soft beam of
    // light that reaches the six-cat gallery. The reels turn, the beam flickers, dust drifts in it.
    const pj=new THREE.Group();pj.name='life-complete-vintage-projector';pj.position.set(1.72,floorY,-2.03);const target=new THREE.Vector3(gx,gy,gz).sub(pj.position);pj.rotation.y=Math.atan2(target.x,target.z);s.root.add(pj);
    const P=s.props,enamel=P.material('#30493f',{roughness:.42,metalness:.3}),chrome=P.material('#cfd3d6',{roughness:.22,metalness:.85}),black=P.material('#191b1c',{roughness:.5,metalness:.2}),film=P.material('#3b2416',{roughness:.6}),plate=P.material('#c9a24f',{roughness:.32,metalness:.7});
    solid(s,'life-projector-complete-camera-body',[.34,.22,.24],[0,1.0,0],enamel,pj);
    for(const y of[.89,1.11])solid(s,'life-projector-chrome-band-'+y,[.352,.016,.252],[0,y,0],chrome,pj);
    for(let i=0;i<5;i++)solid(s,'life-projector-side-vent-'+i,[.004,.012,.14],[.172,.95+i*.022,-.01],black,pj);
    // the lamp house with cooling rings and a cap
    P.cylinder('life-projector-lamp-house',.065,.16,[0,1.19,-.05],enamel,pj,20);
    for(let i=0;i<5;i++)P.torus('life-projector-lamp-vent-ring-'+i,.067,.006,[0,1.13+i*.026,-.05],chrome,pj);
    P.cylinder('life-projector-lamp-cap',.05,.03,[0,1.285,-.05],black,pj,20,.03);
    // two reels on arms, axes along x, with flanges, hubs, spokes and a roll of film
    const reels=[];
    for(const [i,z,y,r]of[[0,.13,1.42,.135],[1,-.17,1.38,.125]]){
      P.tube('life-projector-reel-arm-'+i,[0,1.1,z*.45],[0,y,z],.012,chrome,pj);
      const reel=new THREE.Group();reel.position.set(0,y,z);pj.add(reel);reels.push(reel);
      for(const x of[-.024,.024]){const ring=P.torus('life-projector-reel-flange-'+i+'-'+x,r,.007,[x,0,0],chrome,reel);ring.rotation.set(0,Math.PI/2,0);
        for(let j=0;j<5;j++){const a=j*Math.PI*2/5,spoke=P.tube('life-projector-reel-spoke-'+i+'-'+x+'-'+j,[x,0,0],[x,Math.sin(a)*r,Math.cos(a)*r],.006,chrome,reel,6);}}
      const hub=P.cylinder('life-projector-reel-hub-'+i,.022,.07,[0,0,0],plate,reel,16);hub.rotation.z=Math.PI/2;
      const roll=P.cylinder('life-projector-film-roll-'+i,r*(i?.55:.78),.04,[0,0,0],film,reel,32);roll.rotation.z=Math.PI/2;
      animated.push(t=>{reel.rotation.x=t*(i?-.9:.7);});
    }
    // film threaded from the front reel down into the gate, and from the body back up to the take-up reel
    const filmPath=(name,pts)=>{const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const geo=new THREE.TubeGeometry(curve,24,.004,4,false);P.mesh(name,geo,film,[0,0,0],pj);};
    filmPath('life-projector-film-feed',[[0,1.42-.105,.13],[0,1.22,.14],[0,1.12,.125],[0,1.06,.122]]);
    filmPath('life-projector-film-takeup',[[0,1.0,-.122],[0,1.12,-.15],[0,1.38-.07,-.17]]);
    // the lens: a barrel with chrome rings, a knurled focus ring and glowing glass
    P.cylinder('life-projector-full-optical-lens',.055,.16,[0,1.0,.19],black,pj,24).rotation.x=Math.PI/2;
    for(const z of[.13,.2,.26]){const ring=P.cylinder('life-projector-lens-ring-'+z,.06,.012,[0,1.0,z],chrome,pj,24);ring.rotation.x=Math.PI/2;}
    for(let j=0;j<12;j++){const a=j*Math.PI/6;P.mesh('life-projector-focus-knurl-'+j,new THREE.BoxGeometry(.006,.008,.03),black,[Math.cos(a)*.061,1.0+Math.sin(a)*.061,.17],pj).rotation.z=a;}
    const lensFace=P.material('ivory',{emissive:'#f3cd82',emissiveIntensity:.07,roughness:.25});const glass=P.cylinder('life-projector-emitting-lens-face',.047,.008,[0,1,.272],lensFace,pj,24);glass.rotation.x=Math.PI/2;
    // a crank on the side, and a brass maker's plate
    P.cylinder('life-projector-crank-disc',.03,.012,[.176,1.0,.04],chrome,pj,16).rotation.z=Math.PI/2;
    P.tube('life-projector-crank-arm',[.184,1.0,.04],[.184,.95,.08],.006,chrome,pj);
    P.cylinder('life-projector-crank-knob',.009,.03,[.2,.95,.08],black,pj,10).rotation.z=Math.PI/2;
    solid(s,'life-projector-makers-plate',[.002,.05,.11],[-.172,1.0,.02],plate,pj);
    // the beam of light, faint by day and soft at night, with drifting dust
    const beamLength=Math.hypot(target.x,target.z)-.3,beamGeo=new THREE.CylinderGeometry(.62,.045,beamLength,24,1,true);beamGeo.translate(0,beamLength/2,0);beamGeo.rotateX(Math.PI/2);s.kit.resources.add(beamGeo);
    const beamMat=new THREE.MeshBasicMaterial({color:'#ffe2a8',transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});beamMat.name='life-projector-light-beam';s.kit.resources.add(beamMat);
    const beam=new THREE.Mesh(beamGeo,beamMat);beam.name='life-projector-light-beam';beam.position.set(0,1.0,.28);beam.rotation.x=-Math.atan2(target.y-1.0+.0,beamLength)*.0;beam.userData.roomSolid=false;beam.castShadow=false;beam.receiveShadow=false;beam.raycast=()=>{};pj.add(beam);
    const dustGeo=new THREE.BufferGeometry(),dust=[];for(let i=0;i<40;i++){const f=Math.random();dust.push((Math.random()-.5)*.9*f,(Math.random()-.5)*.9*f,.28+f*beamLength);}dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dust,3));s.kit.resources.add(dustGeo);
    const dustMat=new THREE.PointsMaterial({color:'#fff0c8',size:.012,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});s.kit.resources.add(dustMat);
    const motes=new THREE.Points(dustGeo,dustMat);motes.position.y=1.0;motes.raycast=()=>{};pj.add(motes);
    animated.push(t=>{lensFace.emissiveIntensity=dark?.6:.07;const flick=.85+.15*Math.sin(t*23)*Math.sin(t*7.3);beamMat.opacity=dark?.09*flick:.02;dustMat.opacity=dark?.55:.15;motes.rotation.z=t*.05;});
    // merge the projector into a few meshes: one per material for the still body, and the same for each turning reel
    const mergeByMaterial=(group,skip=[])=>{group.updateMatrixWorld(true);const inv=group.matrixWorld.clone().invert(),bins=new Map(),done=[];
      group.traverse(o=>{if(!o.isMesh||o===group||skip.some(k=>{for(let q=o;q;q=q.parent)if(q===k)return true;return false;}))return;
        const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(inv.clone().multiply(o.matrixWorld));if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
        if(!bins.has(o.material))bins.set(o.material,[]);bins.get(o.material).push(g);done.push(o);});
      done.forEach(o=>o.removeFromParent());
      for(const [m,list]of bins){const g=mergeGeometries(list.map(x=>{for(const k of Object.keys(x.attributes))if(!['position','normal','uv'].includes(k))x.deleteAttribute(k);return x;}),false);list.forEach(x=>x.dispose());if(!g)continue;s.kit.resources.add(g);const mesh=new THREE.Mesh(g,m);mesh.name=group.name+'-merged-'+m.name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.roomSolid=true;group.add(mesh);}
    };
    reels.forEach(r=>mergeByMaterial(r));

    // the tripod: three legs on a brass collar, a centre column, rubber feet
    P.cylinder('life-projector-tripod-collar',.05,.04,[0,.88,0],plate,pj,16);P.cylinder('life-projector-tripod-column',.018,.5,[0,.62,0],chrome,pj,10);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;P.tube('life-projector-complete-bearing-tripod-'+i,[0,.86,0],[Math.cos(a)*.30,.025,Math.sin(a)*.30],.018,'wood',pj);P.tube('life-projector-tripod-brace-'+i,[0,.45,0],[Math.cos(a)*.16,.47,Math.sin(a)*.16],.007,chrome,pj);P.sphere('life-projector-grounded-tripod-foot-'+i,[.034,.02,.034],[Math.cos(a)*.30,.02,Math.sin(a)*.30],black,pj);}
    mergeByMaterial(pj,[...reels,beam,motes,glass]);
    s.kit.lamp([1.72,floorY+1.03,-2.03],.28,1.25);obstacle(s,'life-projector-tripod',[.66,1.43,.66],[1.72,floorY+.715,-2.03]);
    pick(s,'life-kitchen-stove','food',[sx,floorY+.69,sz+.40],[.82,1.08,.30],'Lift the lid',{life:'food'},[sx,floorY,-.76]);
    pick(s,'life-kitchen-pot-lid','food',[sx,floorY+.88,sz],[.74,.2,.74],'Lift the lid',{life:'food'},[sx,floorY,-.76]);
    pick(s,'life-xiaohei-cushion','pet',[cx,floorY+.37,cz],[1.13,.62,1.0],'Pet XiaoHei',{life:'cats'},s.actionStand.pet.point);
    pick(s,'life-travel-suitcase','travel',[tx,floorY+.35,tz+.19],[.89,.72,.20],'Road trips',{life:'travel'},[tx,floorY,-.67]);
    pick(s,'life-six-cat-gallery','gallery',[gx,gy,gz+.11],[1.14,1.44,.15],'Six cats',{life:'cats'},[gx,floorY,-2.18]);
    pick(s,'life-vintage-projector','projector',[1.72,floorY+1.03,-2.03],[.57,.70,.57],'Play cat memories',{life:'cats'},[1.52,floorY,-1.42]);
    s.diagnostics.photoFailures=photoFailures;s.diagnostics.objectFloors={stove:floorY,catPad:floorY,suitcase:floorY,gallery:floorY,projector:floorY};finish(s);
  }

  function setTheme(value){dark=!!value;kits.forEach(k=>k.setTheme(dark));animated.forEach(a=>a(0,0));}
  function update(time,dt,nextDark=dark){if(!!nextDark!==dark)setTheme(nextDark);kits.forEach(k=>k.update(time,dt));animated.forEach(a=>a(time,dt));}
  setTheme(false);
  return {root,scenes,rooms:scenes.flatMap(s=>s.rooms),setTheme,update,diagnostics:{construction:'Full-direction polygonal PBR gatehall, study and three-bay home',scenes:scenes.map(s=>({id:s.id,...s.diagnostics}))},dispose(){kits.forEach(k=>k.dispose());sharedTextures.forEach(releasePaintTexture);root.clear();}};
}
