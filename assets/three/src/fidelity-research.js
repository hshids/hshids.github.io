import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRoomKit} from './fidelity-room-kit.js';

/** Complete metre-scale timber library. The old two roof tiers, warm wood,
 * pale plaster and grey tiles remain; no facade photograph supplies its shape.
 */
export async function createFaithfulResearch({data,quality='high'}={}){
  const root=new THREE.Group();root.name='research-complete-two-storey-library';
  const kit=createRoomKit({root,name:'research',quality}),resources=new Set();
  const furnitureColliders=[],interactables=[],parts=[];
  const floorY=.116238,ceilingY=2.486,upperFloorY=2.75,upperCeilingY=5.02;
  const readStand=[-1.16912,floorY,-.069024];
  const content=data??(typeof window!=='undefined'?window.HJ_DATA:null);
  const themes=content?.themes??[],pubs=content?.publications??[],order=themes.map(t=>t.id);
  const sorted=pubs.slice().sort((a,b)=>order.indexOf(a.theme)-order.indexOf(b.theme)||(a.date<b.date?1:-1));
  function mergeGroup(group){
    const batches=new Map();
    for(const m of group.children.slice()){
      if(!m.isMesh||m.isInstancedMesh||m.material.transparent)continue;
      m.updateMatrix();const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);
      if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push({m,g});
    }
    for(const[mat,list]of batches){
      const g=mergeGeometries(list.map(v=>v.g),false);if(!g)throw new Error('Research prop geometry attributes disagree');resources.add(g);
      const m=new THREE.Mesh(g,mat);m.name=group.name+'-solid-'+mat.name;m.castShadow=m.receiveShadow=true;group.add(m);
      for(const v of list){v.m.removeFromParent();v.g.dispose();}
    }
  }
  const library=kit.enclose({id:'research-library',label:'the Research library',
    minX:-3.10,maxX:3.10,minZ:-4.10,maxZ:-.40,floorY,ceilingY,wallThickness:.18,
    openings:[
      {id:'research-library-entrance',side:'front',centre:0,width:1.40,height:2.18,type:'door',open:true},
      {id:'research-library-front-left-window',side:'front',centre:-1.96,width:1.12,height:1.10,sill:.91,type:'window'},
      {id:'research-library-front-right-window',side:'front',centre:1.96,width:1.12,height:1.10,sill:.91,type:'window'},
      {id:'research-library-back-door',side:'back',centre:0,width:1.05,height:2.18,type:'door',open:false},
      {id:'research-library-left-window',side:'left',centre:-2.10,width:1.24,height:1.08,sill:.97,type:'window'},
      {id:'research-library-right-window',side:'right',centre:-2.10,width:1.24,height:1.08,sill:.97,type:'window'}
    ],entry:[0,floorY,.15],inside:[0,floorY,-1.45],exit:[0,0,.78],
    camera:{target:[0,floorY+1.14,-2.30],offset:[.24,.42,1.34]}});
  // The upper archive is an actual sealed storey, not a teleport destination.
  const upper=kit.enclose({id:'research-upper-archive',label:'the upper archive',
    minX:-2.48,maxX:2.48,minZ:-3.76,maxZ:-1.16,floorY:upperFloorY,ceilingY:upperCeilingY,wallThickness:.16,
    openings:[
      {id:'research-upper-front-left-window',side:'front',centre:-1.42,width:.98,height:1.23,sill:.58,type:'window'},
      {id:'research-upper-front-right-window',side:'front',centre:1.42,width:.98,height:1.23,sill:.58,type:'window'},
      {id:'research-upper-back-left-window',side:'back',centre:-1.42,width:.98,height:1.23,sill:.58,type:'window'},
      {id:'research-upper-back-right-window',side:'back',centre:1.42,width:.98,height:1.23,sill:.58,type:'window'},
      {id:'research-upper-left-window',side:'left',centre:-2.45,width:1.06,height:1.23,sill:.58,type:'window'},
      {id:'research-upper-right-window',side:'right',centre:-2.45,width:1.06,height:1.23,sill:.58,type:'window'}
    ]});
  upper.walkable=false;upper.closedDisplayStorey=true;
  // The structural core stays below the room's finished pavers. Only the
  // outside apron reaches their top level, so stone and wood never share
  // a coplanar surface across the interior.
  const foundationTop=floorY-.024,foundationBottom=-.14,apronY=floorY-.012;
  kit.box('research-whole-bearing-stone-foundation',[6.54,foundationTop-foundationBottom,4.70],[0,(foundationTop+foundationBottom)/2,-2.05],'stone');
  kit.box('research-front-stone-apron',[6.54,.024,.65],[0,apronY,-.025],'stone');
  kit.box('research-rear-stone-apron',[6.54,.024,.25],[0,apronY,-4.275],'stone');
  for(const x of[-3.21,3.21])kit.box('research-side-stone-apron-'+x,[.12,.024,3.80],[x,apronY,-2.25],'stone');
  kit.box('research-front-flush-door-threshold',[1.42,.024,.05],[0,apronY,-.375],'wood');
  kit.box('research-back-flush-door-threshold',[1.07,.024,.05],[0,apronY,-4.125],'wood');
  for(const z of[.255,-4.355])kit.brickWall('research-foundation-visible-stone-course-'+z,[6.54,foundationTop,.09],[0,foundationTop/2,z],'stone');
  kit.box('research-front-approach-tread',[1.68,.058,.40],[0,.029,.50],'stone');
  kit.box('research-rear-approach-tread',[1.32,.058,.40],[0,.029,-4.60],'stone');
  kit.box('research-upper-floor-complete-bearing-edge',[5.15,.16,2.80],[0,upperFloorY-.104,-2.46],'darkWood');
  for(const z of[-3.65,-3.02,-2.38,-1.75,-1.22])kit.box('research-upper-floor-supported-joist-'+z,[5.18,.18,.12],[0,2.625,z],'wood');
  function post(name,x,z,y,height){
    kit.round(name+'-closed-stone-foot',.145,.12,[x,y+.06,z],'stone',root,8);
    kit.round(name+'-eight-sided-timber-shaft',.088,height-.12,[x,y+.12+(height-.12)/2,z],'wood',root,8);
    kit.box(name+'-bearing-cap',[.29,.13,.29],[x,y+height-.04,z],'darkWood');
  }
  for(const x of[-3.14,-.83,.83,3.14])post('research-front-column-'+x,x,-.31,floorY,2.38);
  for(const x of[-3.14,3.14])post('research-rear-column-'+x,x,-4.15,floorY,2.38);
  for(const x of[-2.48,2.48])for(const z of[-1.16,-3.76])post('research-upper-column-'+x+'-'+z,x,z,upperFloorY,2.27);
  kit.box('research-front-continuous-lintel',[6.42,.19,.23],[0,2.47,-.31],'darkWood');
  kit.box('research-back-continuous-lintel',[6.42,.19,.23],[0,2.47,-4.15],'darkWood');
  for(const x of[-3.14,3.14])kit.box('research-side-continuous-lintel-'+x,[.23,.19,3.98],[x,2.47,-2.23],'darkWood');
  // A closed four-slope annular roof leaves a real opening for the upper body.
  // A complete solid lower roof would intersect that storey's occupied space.
  function tierSkirt(){
    const outer=[[-3.72,-4.73],[3.72,-4.73],[3.72,.23],[-3.72,.23]],inner=[[-2.56,-3.84],[2.56,-3.84],[2.56,-1.08],[-2.56,-1.08]],
      ts=[0,.18,.48,.76,1],ys=[2.71,2.635,2.72,2.875,3.075];
    const rings=ts.map((t,r)=>outer.map((p,i)=>[THREE.MathUtils.lerp(p[0],inner[i][0],t),ys[r],THREE.MathUtils.lerp(p[1],inner[i][1],t)]));
    const positions=[],uv=[],tri=(a,b,c)=>{positions.push(...a,...b,...c);for(const p of[a,b,c])uv.push(p[0]*.65,p[2]*.65);},
      quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);},below=p=>[p[0],p[1]-.12,p[2]];
    for(let r=0;r<rings.length-1;r++)for(let s=0;s<4;s++){
      const j=(s+1)%4,a=rings[r][s],b=rings[r][j],c=rings[r+1][j],d=rings[r+1][s];
      quad(a,d,c,b);quad(below(a),below(b),below(c),below(d));
    }
    for(let s=0;s<4;s++){
      const j=(s+1)%4,a=rings[0][s],b=rings[0][j],c=rings.at(-1)[s],d=rings.at(-1)[j];
      quad(a,b,below(b),below(a));quad(below(c),below(d),d,c);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();resources.add(g);
    const roof=new THREE.Mesh(g,kit.materials.roof);roof.name='research-lower-complete-four-sided-tile-skirt';roof.castShadow=roof.receiveShadow=true;roof.userData.roomSolid=true;root.add(roof);
    const matrices=[],rows=quality==='low'?4:7;
    function rowPoint(side,t){
      let r=0;while(r<ts.length-2&&t>=ts[r+1])r++;
      return new THREE.Vector3(...rings[r][side]).lerp(new THREE.Vector3(...rings[r+1][side]),(t-ts[r])/(ts[r+1]-ts[r]));
    }
    for(let s=0;s<4;s++)for(let row=0;row<rows;row++){
      const t=(row+.5)/rows,r=Math.min(ts.length-2,ts.findIndex(v=>v>t)-1),mix=(t-ts[r])/(ts[r+1]-ts[r]),
        a=new THREE.Vector3(...rings[r][s]).lerp(new THREE.Vector3(...rings[r+1][s]),mix),b=new THREE.Vector3(...rings[r][(s+1)%4]).lerp(new THREE.Vector3(...rings[r+1][(s+1)%4]),mix),
        x=b.clone().sub(a).normalize(),inward=new THREE.Vector3(...rings[r+1][s]).sub(new THREE.Vector3(...rings[r][s])).normalize(),y=inward.clone().cross(x).normalize();
      if(y.y<0)y.negate();const z=x.clone().cross(y).normalize(),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)),n=Math.ceil(a.distanceTo(b)/.24);
      // Each solid tile stays inside its course. Fixed-depth boxes used to
      // overlap coplanar tops between rows and produce dark flickering marks.
      const centre=a.clone().add(b).multiplyScalar(.5),outer=rowPoint(s,row/rows).add(rowPoint((s+1)%4,row/rows)).multiplyScalar(.5),
        inner=rowPoint(s,(row+1)/rows).add(rowPoint((s+1)%4,(row+1)/rows)).multiplyScalar(.5),
        halfRun=Math.min(Math.abs(centre.clone().sub(outer).dot(z)),Math.abs(inner.clone().sub(centre).dot(z))),
        tileDepth=halfRun*1.80,tileWidth=a.distanceTo(b)/n-.006;
      for(let i=0;i<n;i++)matrices.push(new THREE.Matrix4().compose(a.clone().lerp(b,(i+.5)/n).addScaledVector(y,.024),q,new THREE.Vector3(tileWidth/.225,1,tileDepth/.235)));
    }
    const tileG=new THREE.BoxGeometry(.225,.040,.235);resources.add(tileG);const tiles=new THREE.InstancedMesh(tileG,kit.materials.roof,matrices.length);
    tiles.name='research-lower-real-solid-tile-laps';matrices.forEach((m,i)=>tiles.setMatrixAt(i,m));tiles.castShadow=tiles.receiveShadow=true;root.add(tiles);
    parts.push({name:roof.name,kind:'closed-annular-hipped-roof',thickness:.12,upperStoreyOpening:{min:[-2.56,-3.84],max:[2.56,-1.08]}});
  }
  tierSkirt();
  kit.roof({name:'research-upper-complete-grey-tile-roof',minX:-2.92,maxX:2.92,minZ:-4.20,maxZ:-.72,eaveY:5.14,ridgeY:5.94});
  for(const[x,z]of[[-3.72,-4.73],[3.72,-4.73],[3.72,.23],[-3.72,.23]]){
    kit.box('research-upturned-corner-tile-'+x+'-'+z,[.19,.15,.19],[x,2.76,z],'roof');
    kit.round('research-corner-tile-finial-'+x+'-'+z,.055,.21,[x,2.92,z],'roof',root,6);
  }
  kit.sign('research-engraved-wood-plaque','RESEARCH',[1.57,.34,.11],[0,4.04,-1.055],'darkWood');
  kit.sign('research-back-archive-plaque','ARCHIVE',[1.05,.24,.08],[0,4.05,-3.865],'darkWood').rotation.y=Math.PI;
  const collider=(id,min,max)=>furnitureColliders.push({id,type:'box',min,max});
  function shelf(cx,side){
    const z=-3.76,w=2.14,bottom=floorY+.05,top=floorY+2.14;
    kit.box('research-'+side+'-bookcase-full-back',[w,top-bottom,.065],[cx,(bottom+top)/2,z-.19],'darkWood');
    for(const x of[cx-w/2,cx+w/2])kit.box('research-'+side+'-bookcase-full-side-'+x,[.075,top-bottom,.41],[x,(top+bottom)/2,z],'wood');
    for(const y of[bottom,bottom+.51,bottom+1.02,bottom+1.53,top])kit.box('research-'+side+'-bearing-shelf-'+y,[w,.065,.41],[cx,y,z],'wood');
    for(const x of[cx-.89,cx+.89])kit.box('research-'+side+'-bookcase-solid-foot-'+x,[.10,.08,.32],[x,floorY+.04,z],'darkWood');
    collider('research-'+side+'-physical-bookcase',[cx-w/2-.04,floorY,z-.23],[cx+w/2+.04,top+.04,z+.23]);return{cx,z,w,bottom};
  }
  const cases=[shelf(-1.81,'left'),shelf(1.81,'right')],bookManifest=[];
  // A single opaque number-label atlas sits on real, stitched book spines.
  const atlas=document.createElement('canvas');atlas.width=quality==='low'?512:1024;
  const labelRows=Math.max(1,Math.ceil(sorted.length/8)),cellW=atlas.width/8,cellH=quality==='low'?64:128;atlas.height=2**Math.ceil(Math.log2(labelRows*cellH));
  const c=atlas.getContext('2d');c.fillStyle='#eee3cb';c.fillRect(0,0,atlas.width,atlas.height);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#574635';c.font=`600 ${cellW*.28}px Georgia, serif`;
  sorted.forEach((paper,i)=>c.fillText(String(i+1).padStart(2,'0'),(i%8+.5)*cellW,(Math.floor(i/8)+.5)*cellH));
  const labelTexture=new THREE.CanvasTexture(atlas);labelTexture.colorSpace=THREE.SRGBColorSpace;resources.add(labelTexture);
  const labelMat=new THREE.MeshStandardMaterial({name:'research-physical-paper-spine-labels',map:labelTexture,roughness:.90});resources.add(labelMat);
  const labelPositions=[],labelUV=[],proxyMat=new THREE.MeshBasicMaterial({visible:false});resources.add(proxyMat);
  const perCase=Math.ceil(sorted.length/2),columns=Math.max(1,Math.ceil(perCase/3));
  for(let i=0;i<sorted.length;i++){
    const paper=sorted[i],side=Math.min(1,Math.floor(i/Math.max(1,perCase))),local=i-side*perCase,row=Math.floor(local/columns),col=local%columns,bookcase=cases[side],
      rowCount=Math.min(columns,(side?sorted.length-perCase:perCase)-row*columns),pitch=Math.min(.185,1.83/Math.max(1,columns)),
      x=bookcase.cx+(col-(rowCount-1)/2)*pitch,y=bookcase.bottom+.51+row*.51+.0325,h=.365+(i%3)*.013,w=.088+(i%3)*.012,z=-3.54,role=['blue','green','cloth'][i%3],paperID=paper.id||`research-book-${i}`;
    kit.box('publication-'+paperID+'-actual-page-block',[w-.008,h-.025,.245],[x,y+h/2,z-.133],'ivory');
    for(const sign of[-1,1])kit.box('publication-'+paperID+'-cloth-cover-'+sign,[.008,h,.282],[x+sign*w/2,y+h/2,z-.129],role);
    kit.box('publication-'+paperID+'-stitched-spine',[w+.010,h,.029],[x,y+h/2,z+.002],role);
    for(let s=0;s<4;s++)kit.box('publication-'+paperID+'-binding-thread-'+s,[w+.014,.005,.010],[x,y+h*(.14+s*.23),z+.019],'ivory');
    const uv=[(i%8)*cellW/atlas.width,1-(Math.floor(i/8)+1)*cellH/atlas.height,(i%8+1)*cellW/atlas.width,1-Math.floor(i/8)*cellH/atlas.height],x0=x-w*.34,x1=x+w*.34,y0=y+h*.34,y1=y+h*.71,zz=z+.0173;
    labelPositions.push(x0,y0,zz,x1,y0,zz,x1,y1,zz,x0,y0,zz,x1,y1,zz,x0,y1,zz);labelUV.push(uv[0],uv[1],uv[2],uv[1],uv[2],uv[3],uv[0],uv[1],uv[2],uv[3],uv[0],uv[3]);
    const pg=new THREE.BoxGeometry(w+.06,h+.05,.32);resources.add(pg);const pick=new THREE.Mesh(pg,proxyMat);pick.name='pick-'+paperID;pick.position.set(x,y+h/2,z-.12);pick.userData={interaction:true,id:paperID,type:'book',paper:paperID,title:paper.title};root.add(pick);
    const bookStand=[THREE.MathUtils.clamp(x,-2.65,2.65),floorY,-2.75],item={id:paperID,object:pick,type:'book',point:[x,y+h/2,z+.017],title:paper.title,focus:{paper:paper.id},paper,stand:bookStand,room:library.id,
      approach:[[0,0,.78],library.entry,[0,floorY,-1.45],[0,floorY,-2.35],[bookStand[0],floorY,-2.35],bookStand],insideApproach:[[0,floorY,-2.75],bookStand],facing:0,contactPoint:[x,y+h/2,z+.017],hand:'right'};
    interactables.push(item);bookManifest.push({paper,id:paperID,position:item.point,size:[w,h,.29],stand:bookStand});
  }
  if(labelPositions.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(labelPositions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(labelUV,2));g.computeVertexNormals();resources.add(g);const labels=new THREE.Mesh(g,labelMat);labels.name='research-all-volume-labels-on-real-spines';labels.receiveShadow=true;root.add(labels);}
  // A supported little manuscript desk stays outside the rear reading aisle.
  const deskX=-2.18,deskZ=-1.14,deskY=floorY+.77;
  kit.box('research-bamboo-desk-full-top',[1.18,.075,.55],[deskX,deskY,deskZ],'wood');
  for(const x of[deskX-.46,deskX+.46])for(const z of[deskZ-.18,deskZ+.18])kit.box('research-bamboo-desk-bearing-leg-'+x+'-'+z,[.085,.735,.085],[x,floorY+.3675,z],'darkWood');
  collider('research-bamboo-desk',[deskX-.59,floorY,deskZ-.275],[deskX+.59,deskY+.038,deskZ+.275]);
  const bambooGroup=new THREE.Group();bambooGroup.name='research-closed-bamboo-and-silk-manuscripts';root.add(bambooGroup);
  for(let i=0;i<11;i++){const slat=kit.round('research-closed-bamboo-slat-'+i,.014,.35,[deskX-.23+i*.043,deskY+.052,deskZ],'cloth',bambooGroup,8);slat.rotation.x=Math.PI/2;}
  for(const x of[deskX-.28,deskX+.28]){
    const roll=kit.round('research-real-capped-bamboo-roll-'+x,.050,.37,[x,deskY+.089,deskZ],'wood',bambooGroup,12);roll.rotation.x=Math.PI/2;
    for(const z of[deskZ-.19,deskZ+.19]){const cap=kit.round('research-bamboo-roll-end-'+x+'-'+z,.041,.013,[x,deskY+.089,z],'ivory',bambooGroup,12);cap.rotation.x=Math.PI/2;}
  }
  for(const z of[deskZ-.115,deskZ+.115])kit.box('research-real-manuscript-binding-'+z,[.55,.003,.012],[deskX,deskY+.066,z],'darkWood',bambooGroup);
  for(let i=0;i<3;i++){const roll=kit.round('research-capped-silk-scroll-'+i,.047,.36,[1.18+i*.13,floorY+.13,-3.63],'ivory',root,12);roll.rotation.x=Math.PI/2;}
  const plant=new THREE.Group();plant.name='research-complete-potted-plant';plant.position.set(1.58,floorY+.12,-1.62);root.add(plant);
  kit.round('research-plant-closed-pot-body',.16,.25,[0,.125,0],'green',plant,12);kit.round('research-pot-rim',.177,.034,[0,.255,0],'green',plant,12);kit.round('research-real-dark-soil',.142,.015,[0,.258,0],'darkWood',plant,12);
  const foliage=new THREE.Group();foliage.name='research-solid-leaf-and-stem-bundle';foliage.position.y=.266;plant.add(foliage);
  const leafG=new THREE.IcosahedronGeometry(1,quality==='low'?0:1);resources.add(leafG);let plantMotion=0;
  for(let i=0;i<7;i++){const a=i*2.399,p=new THREE.Mesh(leafG,kit.materials.green);p.name='research-closed-faceted-leaf-'+i;p.scale.set(.055,.155,.035);p.position.set(Math.sin(a)*.088,.114+(i%3)*.055,Math.cos(a)*.075);p.rotation.z=Math.sin(a)*.49;p.rotation.x=Math.cos(a)*.35;p.castShadow=p.receiveShadow=true;foliage.add(p);kit.round('research-leaf-bearing-stem-'+i,.011,.15,[Math.sin(a)*.045,.067,Math.cos(a)*.04],'green',foliage,6);}
  kit.box('research-plant-grounded-foot',[.38,.12,.38],[1.58,floorY+.06,-1.62],'stone');collider('research-plant-with-bearing-pot',[1.39,floorY,-1.81],[1.77,floorY+.72,-1.43]);
  interactables.push({id:'research-bamboo-notes',type:'research-notes',title:'Bamboo notes',object:bambooGroup,point:[deskX,deskY+.1,deskZ],stand:[deskX,floorY,-.68],onInteract(){plantMotion=.65;}});
  interactables.push({id:'research-potted-plant',type:'research-notes',title:'A small pause between papers',object:plant,point:[1.58,floorY+.58,-1.62],stand:[1.58,floorY,-.98],onInteract(){plantMotion=1;}});
  // Local short-range pendants stay within their room; opaque walls do not emit.
  const practical=[];
  for(const[i,x,z,y]of[[0,-1.65,-2.25,2.12],[1,1.65,-2.25,2.12],[2,0,-2.40,4.40]]){
    kit.box('research-lamp-bearing-drop-'+i,[.028,i===2?.60:.40,.028],[x,i===2?4.72:2.285,z],'brass');
    kit.box('research-lamp-bracket-'+i,[.12,.09,.22],[x,y,z],'brass');
    const mat=new THREE.MeshStandardMaterial({name:'research-lamp-ivory-shade-'+i,color:'#efcf8e',roughness:.66,emissive:'#f1b65f',emissiveIntensity:0});resources.add(mat);const g=new THREE.CylinderGeometry(.105,.105,.24,8);resources.add(g);
    const shade=new THREE.Mesh(g,mat);shade.name='research-supported-warm-lamp-'+i;shade.position.set(x,y-.10,z+.08);root.add(shade);const light=kit.lamp([x,y-.11,z+.13],.28,i===2?.65:1.15);practical.push({shade,light});
  }
  const walkAreas=[{id:'research-bearing-platform',minX:-3.27,maxX:3.27,minZ:-4.40,maxZ:.30,y:floorY},{id:'research-front-half-height-step',minX:-.84,maxX:.84,minZ:.30,maxZ:.70,y:.058},{id:'research-rear-half-height-step',minX:-.66,maxX:.66,minZ:-4.80,maxZ:-4.40,y:.058},...library.walkAreas];
  mergeGroup(bambooGroup);mergeGroup(foliage);mergeGroup(plant);kit.flush();root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root);
  const diagnostics={construction:'Complete metre-scale two-storey polygonal timber library with lit PBR surfaces',worldScale:1,storeys:2,lowerHeadroom:ceilingY-floorY,upperHeadroom:upperCeilingY-upperFloorY,primaryLibraryAccessible:true,upperStoreyWalkable:false,upperStoreyReason:'Closed physical archive floor; no staircase or teleport is provided.',rooms:[library.bounds,upper.bounds],roof:'Closed annular four-slope lower tier and full four-sided upper hipped roof',furniture:'Closed shelves, page blocks, stitched covers, capped bamboo and silk rolls, supported full pot',publicationOrderPreserved:pubs.length>0,publicationCount:pubs.length,books:bookManifest,parts,originalPaintedFacadeTextures:0,opaqueArchitectureMaterial:'MeshStandardMaterial on front/back/sides',heldReadingStancePreserved:readStand.slice(),limitations:['Upper archive is a complete display storey, not a walkable room.','Reading supports a selected paper; there is no per-shelf-height grasp IK.']};root.userData.reconstruction=diagnostics;
  function setTheme(dark){kit.setTheme(dark);for(const p of practical){p.shade.material.emissiveIntensity=dark?.50:0;p.light.intensity=dark?.28:0;}}
  function update(time,dt){kit.update(time,dt);if(plantMotion>0){plantMotion=Math.max(0,plantMotion-dt*.60);foliage.rotation.z=Math.sin(time*3.2)*.045*plantMotion;}else foliage.rotation.z=0;}
  setTheme(false);
  return{root,bounds,worldScale:1,setTheme,update,diagnostics,stand:[-1.16912,floorY,.16],actionStand:{read:{point:readStand,facing:0}},rooms:[library],interactables:[...library.interactables,...interactables],get colliders(){return[...library.colliders,...furnitureColliders];},colliderRadius:.12,walkAreas,dispose(){resources.forEach(r=>r.dispose?.());kit.dispose();root.clear();}};
}

export {createFaithfulResearch as createResearch};
