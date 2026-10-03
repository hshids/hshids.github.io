import * as THREE from 'three';
import { createLehighCampus } from './fidelity-campus-lehigh.js';
import { acquirePaintTexture, releasePaintTexture, fitPaintCanvas, worldAssetURL } from './fidelity-assets.js';

/** Education and Contact rebuilt from the existing painted keepsakes.
 * Every depicted architectural/prop mass has a closed volume. Front-facing
 * surfaces use the original atlas projected in the original SVG coordinates;
 * side/rear faces use small opaque material samples from the same painting.
 * Unseen rear construction is inferred, never a recovered 360-degree asset.
 */
export async function createFaithfulEducationContact({ data = window.HJ_DATA, quality = 'high' } = {}) {
  const root = new THREE.Group(); root.name = 'faithful-education-contact';
  const resources = new Set(), parts = [], lights = [], themeMaps = [], batches = new Map();
  let lehighCampus;
  const letterGroup=new THREE.Group();letterGroup.name='contact-animated-original-envelope';letterGroup.visible=false;const envelopeCentre=[43/85,(560-439.5)/85,.08];letterGroup.position.set(...envelopeCentre);let envelopeMaterials=[],flagPivot,mailed=false;
  const segments = quality === 'low' ? 16 : 48;
  const sourceSpecs = {
    finishes: ['finishes-painted',2172,724], keepsakes: ['keepsakes-painted',1536,1024],
    branches: ['branch-signs-painted',1774,887], details: ['details-painted',1774,887],
    props: ['belongings-painted',1448,1086], materials: ['materials-painted',1536,1024],
    leaves: ['education-willow-leaves-painted',1536,1024]
  };
  const textures = {}, originalImages = {};
  function originalImage(sheet){
    const [,w,h]=sourceSpecs[sheet],img=textures[sheet].image;if(img.width===w&&img.height===h)return img;
    if(!originalImages[sheet]){const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);originalImages[sheet]=cv;}return originalImages[sheet];
  }
  await Promise.all(Object.entries(sourceSpecs).map(async ([key,[name]]) => {
    const t=await acquirePaintTexture(worldAssetURL(`assets/art/${name}.webp`),{quality});
    t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=quality==='low'?2:4;resources.add(t);textures[key]=t;
  }));
  const S=(sheet,crop,svg,sample,name)=>{
    const [ax,ay,bx,by]=crop,[x,y,w,h]=svg,[,iw,ih]=sourceSpecs[sheet];
    const s={sheet,name,ax,ay,nw:bx-ax,nh:by-ay,iw,ih,x,y,w,h,sample};
    s.X=n=>(x+n*w/s.nw)/85; s.Y=n=>(560-y-n*h/s.nh)/85;
    s.NX=m=>(m*85-x)*s.nw/w; s.NY=m=>(560-m*85-y)*s.nh/h;
    s.uv=(nx,ny)=>[(ax+nx)/iw,1-(ay+ny)/ih];
    s.point=(nx,ny,z=0)=>[s.X(nx),s.Y(ny),z];
    s.front=new THREE.MeshBasicMaterial({map:textures[sheet],alphaTest:.08,toneMapped:false});
    s.front.name=`original-painted-${name}-front`;
    s.side=new THREE.MeshStandardMaterial({map:textures[sheet],color:'#d3c8b5',roughness:.91,metalness:sheet==='finishes'?.13:0});
    s.side.name=`original-${name}-side-sample`;
    if(name==='georgetown'||name==='lehigh'){
      const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d');
      const patch=name==='georgetown'?[389,263,22,31]:[235,136,24,29];
      for(let iy=0;iy<8;iy++)for(let ix=0;ix<8;ix++){ctx.save();ctx.translate(ix*32+(ix%2?32:0),iy*32+(iy%2?32:0));ctx.scale(ix%2?-1:1,iy%2?-1:1);ctx.drawImage(originalImage(sheet),ax+patch[0],ay+patch[1],patch[2],patch[3],0,0,32,32);ctx.restore();}
      const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;resources.add(tex);s.side.map=tex;s.sideSampleUV=()=>[[0,0],[1,0],[1,1],[0,1]];
    }
    resources.add(s.front);resources.add(s.side);themeMaps.push(s);
    return s;
  };
  const letteringFace = new FontFace('Faithful EC Fraunces', `url(${new URL('../fonts/fraunces-400.woff2',import.meta.url).href})`);
  try { await letteringFace.load(); document.fonts.add(letteringFace); } catch { /* Georgia remains a local serif fallback. */ }
  const e = scene('education'), c = scene('contact'); root.add(e.root,c.root);
  function scene(id){const group=new THREE.Group();group.name=`chapter-${id}-faithful`;return {id,root:group,walkAreas:[],colliders:[],interactables:[],actionStand:{},parts:[]};}
  const schoolSources={
    bs:S('finishes',[25,24,688,701],[-277,386,170,174],[250,205,270,230],'uc-davis'),
    ms:S('keepsakes',[39,513,750,991],[-46,400,222,160],[158,312,164,330],'georgetown'),
    phd:S('keepsakes',[773,562,1506,991],[193,404,217,156],[236,135,245,155],'lehigh')
  };
  const eduTree=S('branches',[986,87,1272,846],[-362,284.727,112,276],[51,355,85,455],'education-branch');
  const contactTree=S('details',[16,421,642,857],[-340,225,410,335],[140,232,182,287],'contact-tree');
  const post=S('props',[68,402,290,738],[13,407,74,149],[45,110,100,165],'red-mailbox');
  const signs=S('branches',[1289,88,1762,853],[178,344.565,148,216],[205,550,269,615],'carved-links');
  const stone=S('materials',[38,98,1501,315],[-370,550,790,10],[52,30,250,120],'stone-ground');

  function batch(st,material){const key=`${st.id}|${material.uuid}`;if(!batches.has(key))batches.set(key,{st,material,p:[],n:[],uv:[]});return batches.get(key);}
  function tri(st,mat,a,b,d,uvs){
    const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).cross(new THREE.Vector3(...d).sub(new THREE.Vector3(...a))).normalize();
    const q=batch(st,mat);for(let i=0;i<3;i++){q.p.push(...[a,b,d][i]);q.n.push(v.x,v.y,v.z);q.uv.push(...uvs[i]);}
  }
  const sampleUV=(s)=>{if(s.sideSampleUV)return s.sideSampleUV();const [l,t,r,b]=s.sample;return [[l,t],[r,t],[r,b],[l,b]].map(([x,y])=>s.uv(x,y));};
  function quad(st,mat,p,u){tri(st,mat,p[0],p[1],p[2],[u[0],u[1],u[2]]);tri(st,mat,p[0],p[2],p[3],[u[0],u[2],u[3]]);}
  function mark(st,name,vertices,extra={}){const box=new THREE.Box3().setFromPoints(vertices.map(p=>new THREE.Vector3(...p)));const p={name,scene:st.id,min:box.min.toArray(),max:box.max.toArray(),...extra};parts.push(p);st.parts.push(p);return p;}
  function solid(st,s,name,outline,z=0,depth=.15,extra={}){
    let q=outline.map(([x,y])=>new THREE.Vector2(s.X(x),s.Y(y)));
    if(THREE.ShapeUtils.area(q)<0){q.reverse();outline=[...outline].reverse();}
    const holeOutlines=(extra.holes||[]).map(h=>{let native=[...h],world=h.map(([x,y])=>new THREE.Vector2(s.X(x),s.Y(y)));if(THREE.ShapeUtils.area(world)>0){native.reverse();world.reverse();}return {native,world};});
    const allWorld=[...q,...holeOutlines.flatMap(h=>h.world)],allNative=[...outline,...holeOutlines.flatMap(h=>h.native)];
    const f=allWorld.map(v=>[v.x,v.y,z]),back=allWorld.map(v=>[v.x,v.y,z-depth]),uv=allNative.map(([x,y])=>s.uv(x,y));
    let side=s.side,su=sampleUV(s);
    if(/mailbox.*(wood|leg|ground-foot|support|crossbar)/.test(name)){
      if(!s.woodSide){s.woodSide=s.side.clone();s.woodSide.name='mailbox-original-wood-support-sides';resources.add(s.woodSide);}side=s.woodSide;su=[[24,233],[34,233],[34,254],[24,254]].map(([x,y])=>s.uv(x,y));
    }
    if(/slate|pitched|spire/.test(name)&&s.sheet==='keepsakes'){
      if(!s.roofSide){s.roofSide=new THREE.MeshStandardMaterial({map:textures[s.sheet],color:'#d3d0c8',roughness:.91});s.roofSide.name=`${s.name}-sampled-slate-sides`;resources.add(s.roofSide);}
      side=s.roofSide;su=(s===schoolSources.ms?[[170,243],[191,243],[191,256],[170,256]]:[[137,123],[175,123],[175,144],[137,144]]).map(([x,y])=>s.uv(x,y));
    }
    for(const ids of THREE.ShapeUtils.triangulateShape(q,holeOutlines.map(h=>h.world))){
      tri(st,s.front,...ids.map(i=>f[i]),ids.map(i=>uv[i]));
      tri(st,side,back[ids[2]],back[ids[1]],back[ids[0]],[su[0],su[1],su[2]]);
    }
    for(let i=0;i<q.length;i++){const j=(i+1)%q.length;let edgeMat=side,edgeUV=su;
      if(/gable/.test(name)&&s.sheet==='keepsakes'&&Math.abs(outline[i][0]-outline[j][0])>8&&Math.abs(outline[i][1]-outline[j][1])>8&&Math.min(outline[i][1],outline[j][1])<300){
        if(!s.roofSide){s.roofSide=new THREE.MeshStandardMaterial({map:textures[s.sheet],color:'#d3d0c8',roughness:.91});s.roofSide.name=`${s.name}-sampled-slate-sides`;resources.add(s.roofSide);}
        edgeMat=s.roofSide;edgeUV=(s===schoolSources.ms?[[170,243],[191,243],[191,256],[170,256]]:[[137,123],[175,123],[175,144],[137,144]]).map(([x,y])=>s.uv(x,y));
      }quad(st,edgeMat,[f[i],back[i],back[j],f[j]],edgeUV);
    }
let offset=q.length;for(const h of holeOutlines){for(let i=0;i<h.world.length;i++){const a=offset+i,b=offset+(i+1)%h.world.length;quad(st,side,[f[a],back[a],back[b],f[b]],su);}offset+=h.world.length;}
    return mark(st,name,[...f,...back],{construction:'closed extruded original surface',...extra});
  }
  function rect(st,s,name,l,t,r,b,z=0,depth=.15,extra={}){return solid(st,s,name,[[l,t],[r,t],[r,b],[l,b]],z,depth,extra);}
  function worldBox(st,s,name,min,max){
    const [x,y,z]=min,[X,Y,Z]=max,u=sampleUV(s);
    quad(st,s.side,[[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],u);
    quad(st,s.side,[[X,y,z],[x,y,z],[x,Y,z],[X,Y,z]],u);
    quad(st,s.side,[[x,Y,Z],[X,Y,Z],[X,Y,z],[x,Y,z]],u);
    quad(st,s.side,[[x,y,z],[X,y,z],[X,y,Z],[x,y,Z]],u);
    quad(st,s.side,[[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],u);
    quad(st,s.side,[[X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]],u);
    return mark(st,name,[min,max],{construction:'closed sampled solid'});
  }
  function tube(st,s,name,path,radii,project=true){
    const points=path.map(([x,y,z=0])=>new THREE.Vector3(...s.point(x,y,z))),su=sampleUV(s),verts=[];
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],axis=b.clone().sub(a).normalize(),u=new THREE.Vector3(0,0,1).cross(axis).normalize();
      if(u.length()<.1)u.set(1,0,0);const v=axis.clone().cross(u).normalize();
      const ra=(Array.isArray(radii)?radii[i]:radii)*s.w/s.nw/85,rb=(Array.isArray(radii)?radii[i+1]:radii)*s.w/s.nw/85;
      const rings=[a,b].map((p,ri)=>Array.from({length:12},(_,j)=>p.clone().addScaledVector(u,Math.cos(j/12*Math.PI*2)*(ri?rb:ra)).addScaledVector(v,Math.sin(j/12*Math.PI*2)*(ri?rb:ra)).toArray()));
      const pu=p=>s.uv(s.NX(p[0]),s.NY(p[1]));
      for(let j=0;j<12;j++){const k=(j+1)%12,q=[rings[0][j],rings[0][k],rings[1][k],rings[1][j]];
        const front=project&&new THREE.Vector3(...q[1]).sub(new THREE.Vector3(...q[0])).cross(new THREE.Vector3(...q[2]).sub(new THREE.Vector3(...q[0]))).z>0;
        quad(st,front?s.front:s.side,q,front?q.map(pu):su);
        tri(st,s.side,a.toArray(),rings[0][k],rings[0][j],[su[0],su[1],su[2]]);tri(st,s.side,b.toArray(),rings[1][j],rings[1][k],[su[0],su[1],su[2]]);
      }verts.push(...rings.flat());
    }
    return mark(st,name,verts,{construction:'tapered closed tube',support:path.map(p=>s.point(...p))});
  }
  function lathe(st,s,name,cx,profile,depthRatio=1,z=0){
    const centreZ=z-Math.max(...profile.map(p=>p[1]))*s.w/s.nw/85*depthRatio;
    const rings=profile.map(([y,r])=>Array.from({length:segments},(_,j)=>{const a=j/segments*Math.PI*2;return s.point(cx+r*Math.sin(a),y,centreZ+r*s.w/s.nw/85*depthRatio*Math.cos(a));}));
    const su=sampleUV(s),closedMetal=s.closedMetalFront&&/davis-(unified-dome-tank-bowl|curved-metal-tank|dome|lower-band|conical-bottom)/.test(name),frontMat=closedMetal?s.closedMetalFront:s.front,pu=p=>closedMetal?[s.NX(p[0])/663,1-s.NY(p[1])/318]:s.uv(s.NX(p[0]),s.NY(p[1]));
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){const k=(j+1)%segments,q=[rings[i][j],rings[i+1][j],rings[i+1][k],rings[i][k]];
      const front=Math.cos((j+.5)/segments*Math.PI*2)>0,mat=front?frontMat:s.side;quad(st,mat,q,front?q.map(pu):su);
      const normal=(ring,sector)=>{const lo=Math.max(0,ring-1),hi=Math.min(profile.length-1,ring+1),slope=(profile[hi][1]-profile[lo][1])/(profile[hi][0]-profile[lo][0]||1)*(s.w/s.nw)/(s.h/s.nh),a=sector/segments*Math.PI*2;return new THREE.Vector3(Math.sin(a),slope,Math.cos(a)/depthRatio).normalize().toArray();};
      const ns=[normal(i,j),normal(i+1,j),normal(i+1,k),normal(i,k)],normals=[ns[0],ns[1],ns[2],ns[0],ns[2],ns[3]].flat(),b=batch(st,mat);b.n.splice(b.n.length-18,18,...normals);
    }
    for(const index of [0,rings.length-1]){const ring=rings[index],centre=s.point(cx,profile[index][0],centreZ);for(let j=0;j<segments;j++)tri(st,s.side,centre,...(index===0?[ring[(j+1)%segments],ring[j]]:[ring[j],ring[(j+1)%segments]]),[su[0],su[1],su[2]]);}
    return mark(st,name,rings.flat(),{construction:'closed curved volume'});
  }
  function torus(st,s,name,cx,cy,r,t,z=0){
    const su=sampleUV(s),pu=p=>s.uv(s.NX(p[0]),s.NY(p[1]));const verts=[];
    for(let i=0;i<segments;i++)for(let j=0;j<8;j++){
      const p=(ii,jj)=>{const a=ii/segments*Math.PI*2,b=jj/8*Math.PI*2;return s.point(cx+(r+t*Math.cos(b))*Math.cos(a),cy+(r+t*Math.cos(b))*Math.sin(a),z+t*s.w/s.nw/85*Math.sin(b));};
      const q=[p(i,j),p(i,j+1),p(i+1,j+1),p(i+1,j)],front=Math.sin((j+.5)/8*Math.PI*2)>0;quad(st,front?s.front:s.side,q,front?q.map(pu):su);verts.push(...q);
    }return mark(st,name,verts,{construction:'closed circular solid'});
  }
  const links=data?.person?.links||{};
  function target(st,id,type,point,title,focus,extra={}){const item={id,type,point,title,focus,station:st.id,...extra};st.interactables.push(item);return item;}
  const coll=(st,id,minX,maxX,minZ,maxZ)=>st.colliders.push({id,minX,maxX,minZ,maxZ});
  function plaque(st,name,x,y,z,w,text,font=14){
    // Source blank carved panel plus the exact paint.js lettering baked onto
    // that surface; no world-space floating text or separate UI labels.
    const cv=document.createElement('canvas');cv.width=676;cv.height=202;const ctx=cv.getContext('2d');
    ctx.drawImage(originalImage('finishes'),1465,348,676,202,0,0,676,202);
    ctx.scale(676/w,202/26);ctx.font=`${font}px 'Faithful EC Fraunces',Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillStyle='#301e12';ctx.fillText(text,w/2-.18,17-.35);ctx.fillStyle='#edc991';ctx.fillText(text,w/2+.2,17+.4);ctx.fillStyle='#c7a36e';ctx.fillText(text,w/2,17);
    const tex=new THREE.CanvasTexture(fitPaintCanvas(cv,quality));tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;resources.add(tex);
    const s=S('finishes',[1465,348,2141,550],[x-w/2,560-y*85-13,w,26],[170,88,440,170],name);
    s.front.map=tex;s.uv=(px,py)=>[px/676,1-py/202];s.side.map=textures.finishes;s.sample=[170,88,440,170];
    // The side atlas uses its own UV rather than the newly baked panel UV.
    const originalSide=s.side;const imageUV=(px,py)=>[(1465+px)/2172,1-(348+py)/724];s.sideSampleUV=()=>[[170,88],[440,88],[440,170],[170,170]].map(([px,py])=>imageUV(px,py));
    const previous=s.sample;s.sample=previous;
    solid(st,s,name,[[18,2],[657,2],[674,23],[670,177],[653,200],[15,200],[1,179],[2,22]],z,.06);
    if(y<1.1)coll(st,`${name}-solid-low-board`,(x-w/2)/85,(x+w/2)/85,z-.06,z+.01);
    return s;
  }
  // A thin paved forecourt and separate native stone plinths meet the ground.
  for(const st of [e,c])worldBox(st,stone,`${st.id}-physical-forecourt`,[st===e?-4.47:-4.15,-.085,-1.25],[st===e?4.83:4.0,0,.65]);

  // UC DAVIS: cylindrical sheet metal, cap, bowl, four load-bearing legs,
  // crossed bracing, bolts, banner pole and the full recognizable bicycle.
  {
    const s=schoolSources.bs;
    // A cropped source-metal backing closes only alpha gaps at the curved
    // roof outline. The roof retains native paint; its true volume cannot
    // disappear where the single front-view painting has no side coverage.
    const cv=document.createElement('canvas');cv.width=663;cv.height=318;const ctx=cv.getContext('2d');ctx.fillStyle='#b8b7a9';ctx.fillRect(0,0,663,318);ctx.drawImage(originalImage('finishes'),25,24,663,318,0,0,663,318);
    const roofTex=new THREE.CanvasTexture(cv);roofTex.colorSpace=THREE.SRGBColorSpace;resources.add(roofTex);s.closedMetalFront=s.front.clone();s.closedMetalFront.map=roofTex;s.closedMetalFront.alphaTest=0;s.closedMetalFront.name='original-davis-paint-on-closed-metal';resources.add(s.closedMetalFront);
    rect(e,s,'davis-original-stone-plinth',0,649,663,677,.09,.82);
    const metalCanvas=document.createElement('canvas');metalCanvas.width=metalCanvas.height=256;const metalContext=metalCanvas.getContext('2d');
    for(let iy=0;iy<8;iy++)for(let ix=0;ix<8;ix++){metalContext.save();metalContext.translate(ix*32+(ix%2?32:0),iy*32+(iy%2?32:0));metalContext.scale(ix%2?-1:1,iy%2?-1:1);metalContext.drawImage(originalImage('finishes'),25+270,24+209,53,29,0,0,32,32);metalContext.restore();}
    const metalTex=new THREE.CanvasTexture(metalCanvas);metalTex.colorSpace=THREE.SRGBColorSpace;resources.add(metalTex);s.side.map=metalTex;s.sideSampleUV=()=>[[0,0],[1,0],[1,1],[0,1]];s.side.color.set('#f4f1e9');s.side.emissiveMap=metalTex;s.side.emissive.set('#ffffff');s.side.emissiveIntensity=.09;
    lathe(e,s,'davis-unified-dome-tank-bowl',383,[[33,1],[39,66],[54,109],[76,145],[101,164],[115,168],[123,151],[239,151],[251,159],[270,156],[273,139],[283,109],[303,58],[318,15]],.85,0);
    lathe(e,s,'davis-dome-cupola',383,[[0,3],[12,22],[23,31],[31,22],[39,24]],.85,-.363);
    lathe(e,s,'davis-centre-water-pipe',378,[[310,20],[594,20],[605,25],[612,28]],1,-.325);
    const legs=[[[277,274,-.03],[243,605,.035]],[ [478,274,-.03],[505,606,.035]],[[260,278,-.65],[228,607,-.64]],[[499,278,-.65],[529,607,-.64]]];
    legs.forEach((p,i)=>tube(e,s,`davis-load-bearing-leg-${i}`,p,[16,21],i<2));
    for(const [id,p]of [['front-cross-upper-a',[[280,294,-.04],[493,457,.05]]],['front-cross-upper-b',[[472,294,-.04],[255,457,.05]]],['front-cross-lower-a',[[256,461,.05],[500,600,.05]]],['front-cross-lower-b',[[495,461,.05],[246,600,.05]]],['front-horizontal',[[248,459,.055],[508,459,.055]]],['back-cross-a',[[260,292,-.66],[523,596,-.66]]],['back-cross-b',[[500,292,-.66],[231,596,-.66]]]])tube(e,s,`davis-${id}`,p,4,id.startsWith('front'));
    [243,505].forEach((x,i)=>rect(e,s,`davis-front-foot-${i}`,x-30,590,x+31,620,.085,.24));
    [228,529].forEach((x,i)=>worldBox(e,s,`davis-rear-foot-${i}`,[s.X(x-27),s.Y(622),-.83],[s.X(x+27),s.Y(601),-.52]));
    [243,505].forEach((x,i)=>worldBox(e,stone,`davis-front-foot-ground-foundation-${i}`,[s.X(x-30),s.Y(649),-.155],[s.X(x+31),s.Y(620)+.002,.085]));
    [228,529].forEach((x,i)=>worldBox(e,stone,`davis-rear-foot-ground-foundation-${i}`,[s.X(x-27),s.Y(649),-.83],[s.X(x+27),s.Y(622)+.002,-.52]));
    [ [379,361],[376,535],[254,459],[493,459] ].forEach(([x,y],i)=>lathe(e,s,`davis-brace-pin-${i}`,x,[[y-4,4],[y+4,4]],.4,.071));
    tube(e,s,'davis-banner-pole',[[533,297,-.17],[604,297,-.17]],3,false);
    solid(e,s,'davis-blue-gold-fabric-banner',[[544,304],[600,304],[599,446],[583,427],[566,420],[546,423]],-.18,.008);
    // Two full tires and narrow spoke rods are actual round geometry. Their
    // original projected colour preserves the basket, blue frame and saddle.
    for(const [x,y,r]of [[81,581,61],[260,581,62]]){
      torus(e,s,`davis-bike-tire-${x}`,x,y,r,6,.185);torus(e,s,`davis-bike-rim-${x}`,x,y,r-8,1.6,.188);
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2;tube(e,s,`davis-bike-spoke-${x}-${i}`,[[x,y,.184],[x+(r-9)*Math.cos(a),y+(r-9)*Math.sin(a),.184]],.6,true);}
    }
    for(const [name,p,r]of [['front-fork',[[110,484,.195],[82,581,.195]],3],['front-steering',[[114,457,.19],[106,493,.19]],3],['step-through-upper',[[111,493,.20],[145,529,.20],[197,554,.20],[217,497,.20]],4],['step-through-lower',[[108,509,.20],[146,554,.20],[177,583,.20],[216,515,.20]],3],['rear-triangle',[[216,514,.20],[260,580,.20],[177,583,.20],[216,514,.20]],3],['handlebar',[[110,456,.21],[99,449,.21],[101,441,.21],[120,438,.21]],2],['handlebar-right',[[111,456,.20],[168,469,.20]],2],['seat-post',[[210,526,.20],[215,495,.20]],3],['basket-stay',[[71,500,.23],[86,568,.20]],1.5],['kickstand',[[190,584,.18],[187,631,.24]],2]])tube(e,s,`davis-bike-${name}`,p,r,true);
    solid(e,s,'davis-bike-leather-seat',[[191,491],[217,487],[236,493],[230,501],[205,506],[194,503]],.225,.045);
    solid(e,s,'davis-bike-wicker-basket',[[61,472],[106,478],[102,521],[63,515],[57,485]],.257,.16);
    torus(e,s,'davis-bike-crank',177,582,9,2,.218);tube(e,s,'davis-bike-pedal',[[177,583,.24],[199,578,.24]],2,true);
    const lampX=67.8,lampY=523.8;lathe(e,s,'davis-bike-lamp-housing',lampX,[[lampY-8,6],[lampY+8,6]],1,.244);
    const lensMat=new THREE.MeshStandardMaterial({color:'#adaf99',emissive:'#ffe6ae',emissiveIntensity:0,roughness:.25});resources.add(lensMat);
    const lensGeo=new THREE.SphereGeometry(.015,12,8);resources.add(lensGeo);const lens=new THREE.Mesh(lensGeo,lensMat);lens.name='davis-mounted-bicycle-lamp-lens';lens.position.set(...s.point(lampX,lampY,.277));lens.scale.set(.55,1,1);e.root.add(lens);
    const light=new THREE.PointLight('#ffdf9b',0,.8,2);light.position.copy(lens.position);e.root.add(light);lights.push({light,intensity:.2,lens:lensMat});
    const beam=new THREE.SpotLight('#ffe2a5',0,1.3,.47,.65,2);beam.name='davis-actual-bicycle-lamp-ground-beam';beam.position.copy(lens.position);beam.target.position.set(s.X(14),.002,.57);e.root.add(beam,beam.target);lights.push({light:beam,intensity:.55,lens:lensMat});
    plaque(e,'bs-original-caption',-192,.17,.39,162,'B.S. · UC Davis',18);
    worldBox(e,eduTree,'bs-caption-feet',[-2.42,.01,.31],[-2.12,.08,.38]);
    target(e,'education-bs','school',[s.X(370),s.Y(210),.09],'B.S. · UC Davis','education',{school:'bs'});
    coll(e,'davis-water-tower',s.X(215),s.X(545),-.82,.13);coll(e,'davis-bicycle',s.X(18),s.X(328),.10,.42);
  }

  // Georgetown: each wing, tower, gable, slate roof and stone stair is a
  // separate closed mass; the clock and Gothic tracery stay native painting.
  {
    const s=schoolSources.ms;
    rect(e,s,'georgetown-stone-foundation',0,451,711,478,.03,.95);
    rect(e,s,'georgetown-left-wing',53,298,208,438,0,.58);
    rect(e,s,'georgetown-central-wing',250,299,385,438,0,.62);
    rect(e,s,'georgetown-right-wing',469,301,660,438,0,.62);
    solid(e,s,'georgetown-left-gable',[[54,297],[75,256],[112,219],[153,262],[161,298]],.035,.57);
    solid(e,s,'georgetown-central-entry-gable',[[282,299],[290,266],[333,226],[378,286],[378,436],[282,436]],.04,.62);
    rect(e,s,'georgetown-left-slim-tower',209,209,250,443,.068,.23);
    rect(e,s,'georgetown-main-clock-tower',386,114,468,443,.095,.33);
    rect(e,s,'georgetown-right-tower',594,252,638,443,.075,.23);
    solid(e,s,'georgetown-left-gable-slate-roof',[[69,268],[115,193],[154,269],[147,270],[114,213],[82,265]],.025,.70);
    solid(e,s,'georgetown-left-tower-slate-spire',[[211,209],[232,145],[250,209]],.085,.23);
    solid(e,s,'georgetown-clock-slate-spire',[[394,112],[426,25],[457,111]],.11,.33);
    solid(e,s,'georgetown-right-slate-spire',[[588,252],[617,184],[643,254]],.082,.23);
    // Receding roof sections are actual pitched solids with projecting paint.
    solid(e,s,'georgetown-left-pitched-roof',[[157,237],[209,237],[209,302],[160,302]],-.015,.66);
    solid(e,s,'georgetown-middle-pitched-roof',[[251,237],[310,237],[293,302],[251,302]],-.017,.66);
    solid(e,s,'georgetown-right-pitched-roof',[[469,237],[588,237],[598,302],[469,302]],-.016,.69);
    for(const [x,y]of [[185,262],[269,262],[501,265],[558,264]])solid(e,s,`georgetown-dormer-${x}`,[[x-12,y+38],[x-12,y+16],[x,y],[x+12,y+16],[x+12,y+38]],.031,.13);
    for(const [x,t,b]of [[55,271,432],[148,274,433],[385,120,432],[459,121,436],[653,270,437]])rect(e,s,`georgetown-stone-buttress-${x}`,x-4,t,x+5,b,.105,.22);
    for(const [cx,cy,r]of [[426,157,21]]){const outline=Array.from({length:32},(_,i)=>[cx+r*Math.cos(i/32*Math.PI*2),cy+r*Math.sin(i/32*Math.PI*2)]);solid(e,s,'georgetown-clock-stone-rim',outline,.118,.035);}
    for(let i=0;i<5;i++)rect(e,s,`georgetown-entry-stair-${i}`,300-i*2,428+i*4,365+i*2,432+i*4,.05+i*.018,.13+i*.08);
    for(const [x,y]of [[115,185],[232,133],[426,8],[618,168]])tube(e,s,`georgetown-spire-finial-${x}`,[[x,y+20,-.10],[x,y,-.10]],1.5,false);
    rect(e,s,'georgetown-original-door',307,382,355,428,.057,.045);
    shrub(e,s,'georgetown-ground-shrubs',[[35,423,22],[71,429,21],[166,429,33],[253,434,36],[432,432,25],[509,430,30],[666,426,35]],.021,.09);
    addCampusNight(s,'ms');entryLight(e,s,'georgetown',[[298,402],[370,402]]);
    plaque(e,'ms-original-caption',65,.17,.40,214,'M.S. · Georgetown',18);
    worldBox(e,eduTree,'ms-caption-feet',[.64,.01,.32],[.91,.08,.38]);
    target(e,'education-ms','school',[s.X(426),s.Y(192),.14],'M.S. · Georgetown','education',{school:'ms'});
    coll(e,'georgetown-campus',s.X(51),s.X(666),-.94,.13);
  }

  // Lehigh: the rounded apse is a real cylindrical wall and conical roof,
  // the rose-window gable stands proud of adjoining slate-roof wings.
  {
    const s=schoolSources.phd;
    lehighCampus=createLehighCampus({source:s,quality});e.root.add(lehighCampus.root);
    lehighCampus.resources.forEach(r=>resources.add(r));
    parts.push(...lehighCampus.parts);e.parts.push(...lehighCampus.parts);
    plaque(e,'phd-original-caption',301.5,.17,.43,209,'Ph.D. · Lehigh',18);
    worldBox(e,eduTree,'phd-caption-feet',[3.41,.01,.34],[3.69,.08,.41]);
    target(e,'education-phd','school',[s.X(320),s.Y(198),.15],'Ph.D. · Lehigh','education',{school:'phd'});
    coll(e,'lehigh-campus',s.X(25),s.X(723),-1.02,.25);
  }

  // Education's original carved branch: tapered bark with a rooted flare,
  // one attached arm, small thin leaves and two fine knotted suspension ropes.
  {
    const s=eduTree;
    organicTree(e,s,'education-rounded-original-rooted-branch',[
      [65,755,63,705,23,26],[63,705,70,639,26,20],[70,639,66,526,20,18],[66,526,67,374,18,17],[67,374,63,216,17,16],[63,216,62,100,16,18],[62,100,58,35,18,12],[58,35,73,4,12,1],
      [62,122,94,101,16,13],[94,101,125,91,13,11],[125,91,192,97,11,9],[192,97,246,89,9,6],[246,89,282,63,6,1],
      [64,241,102,209,7,1],[66,460,100,424,8,1],[63,38,41,26,9,1],
      [64,693,35,730,16,9],[35,730,8,746,9,1],[67,706,83,739,14,9],[83,739,101,753,9,1],[71,693,111,733,15,8],[111,733,165,750,8,1]
    ]);
    plaque(e,'education-hanging-carved-plaque',-300,(560-358)/85,.082,151,'EDUCATION',18);
    rope(e,'education-left-rope',[-321/85,(560-321.727)/85,-.025],[-349/85,(560-345)/85,.061]);
    rope(e,'education-right-rope',[-272/85,(560-318.727)/85,-.025],[-251/85,(560-345)/85,.061]);
    smallLeaves(e,[-258/85,(560-301)/85,-.015]);
    coll(e,'education-rooted-branch',-4.13,-3.78,-.28,.18);
  }

  // Contact oak: original sinuous trunk/branch silhouette is a tapered solid,
  // every root and limb touches its parent and the thin leaf clusters follow
  // those attached limbs rather than becoming unattached green blobs.
  {
    const s=contactTree;
    organicTree(c,s,'contact-rounded-original-oak',[
      [161,429,187,385,28,32],[187,385,171,335,32,35],[171,335,166,290,35,34],[166,290,135,242,34,30],[135,242,131,190,30,22],[131,190,171,150,22,20],
      [171,150,230,128,20,15],[230,128,279,157,15,11],[279,157,302,164,11,9],[302,164,341,143,9,8],[341,143,391,150,8,7],[391,150,453,155,7,5],[453,155,527,179,5,2],
      [145,146,134,108,11,9],[134,108,156,78,9,4],[156,78,183,65,4,1],
      [231,128,272,94,13,9],[272,94,312,75,9,5],[312,75,365,87,5,1],[272,94,282,52,6,2],[282,52,307,37,2,1],
      [379,149,411,121,7,5],[411,121,441,91,5,2],[441,91,469,90,2,1],[477,164,512,143,4,2],[512,143,560,128,2,1],[560,128,594,158,1.7,1],
      [159,330,113,359,24,17],[113,359,71,392,17,8],[71,392,4,429,8,1],[166,341,143,381,20,13],[143,381,119,426,13,3],
      [177,344,218,373,21,11],[218,373,263,407,11,4],[263,407,316,429,4,1],
      [196,337,263,364,18,10],[263,364,341,397,10,5],[341,397,451,429,5,1],
      [176,367,169,419,15,3]
    ]);
    plaque(c,'contact-hanging-carved-plaque',-130,(560-344)/85,.042,130,'CONTACT',12.5);
    rope(c,'contact-left-plaque-rope',[-178/85,(560-308)/85,-.06],[-178/85,(560-331)/85,.027]);
    rope(c,'contact-right-plaque-rope',s.point(411,121,-.105),[-82/85,(560-331)/85,.027]);
    coll(c,'contact-oak-trunk',s.X(111),s.X(220),-.57,.19);
  }

  // Original red postbox deliberately stands clear of the oak roots. The
  // arched metal shell, recessed hinged door, brass strap hardware, flag,
  // rooted wood supports and stone footing are individually solid.
  {
    const s=post;
    worldBox(c,stone,'contact-mailbox-stone-footing',[2/85,0,-.26],[98/85,.047,.40]);
    rect(c,s,'mailbox-front-left-leg',21,219,45,285,.12,.24);rect(c,s,'mailbox-front-right-leg',158,222,189,311,.12,.24);
    rect(c,s,'mailbox-left-ground-foot',0,286,73,312,.18,.34);rect(c,s,'mailbox-right-ground-foot',136,308,220,335,.18,.34);
    rect(c,s,'mailbox-wood-top-support',10,206,210,232,.15,.32);rect(c,s,'mailbox-wood-bottom-crossbar',34,254,164,275,.08,.22);
    const wood={...s,side:s.woodSide,sample:[24,233,34,254]};
    worldBox(c,wood,'mailbox-left-wood-foot-ground-extension',[s.X(0),.047,.18-.34],[s.X(73),s.Y(312)+.002,.18]);
    worldBox(c,wood,'mailbox-right-wood-foot-ground-extension',[s.X(136),.047,.18-.34],[s.X(220),s.Y(335)+.001,.18]);
    const arch=[[16,210],[17,79],[25,52],[39,28],[62,11],[85,5],[115,7],[144,23],[170,51],[181,80],[185,207]];
    const doorOutline=[[28,199],[28,80],[35,53],[55,30],[83,19],[107,20],[130,32],[150,51],[162,76],[162,200]];
    solid(c,s,'mailbox-arched-red-shell',arch,.022,.33,{holes:[doorOutline]});
    const rear={...s,front:s.side,uv:(x,y)=>s.uv(45+(x%50),110+(y%50))};solid(c,rear,'mailbox-real-closed-rear-shell',arch,-.306,.025);
    solid(c,s,'mailbox-rounded-visible-side-shell',[[137,7],[158,8],[181,20],[204,42],[214,66],[219,193],[185,209],[181,77],[166,47],[145,23]],.019,.34);
    solid(c,s,'mailbox-recessed-hinged-door',doorOutline,.046,.029,{holes:[[[46,81],[136,81],[136,102],[46,102]]]});
    rect(c,s,'mailbox-letter-slot-dark-interior',45,78,137,105,-.17,.012);rect(c,s,'mailbox-brass-slot-upper-bevel',40,73,143,83,.07,.021);
    rect(c,s,'mailbox-brass-slot-lower-bevel',40,102,142,110,.07,.021);
    [69,132,186].forEach((y,i)=>rect(c,s,`mailbox-right-door-hinge-${i}`,157,y,174,y+16,.075,.055));
    [68,120,182].forEach((y,i)=>rect(c,s,`mailbox-left-brass-strap-${i}`,16,y,30,y+18,.073,.04));
    const latch=Array.from({length:20},(_,i)=>[39+7*Math.cos(i/20*Math.PI*2),153+8*Math.sin(i/20*Math.PI*2)]);solid(c,s,'mailbox-brass-door-latch',latch,.075,.025);
    const flagMat=new THREE.MeshStandardMaterial({color:'#b59355',metalness:.55,roughness:.65});resources.add(flagMat);
    const flagArm=nativeHardware(c,flagMat,'mailbox-attached-flag-arm',[80/85,(560-448)/85,.11],[80/85,(560-422)/85,.11],.008);
    const g=new THREE.BoxGeometry(16/85,10/85,.018);resources.add(g);const flag=new THREE.Mesh(g,flagMat);flag.name='mailbox-raised-brass-flag';flag.position.set(88/85,(560-427)/85,.11);c.root.add(flag);
    flagPivot=new THREE.Group();flagPivot.name='mailbox-brass-flag-real-hinge';flagPivot.position.set(80/85,(560-448)/85,.11);c.root.add(flagPivot);c.root.updateMatrixWorld(true);flagPivot.attach(flagArm);flagPivot.attach(flag);flagPivot.rotation.z=-Math.PI/2;
    const letter=S('props',[1116,512,1424,679],[32,433,22,13],[40,60,200,110],'mailbox-existing-letter');envelopeMaterials=[letter.front,letter.side];c.root.add(letterGroup);solid(c,letter,'mailbox-existing-envelope',[[0,0],[308,0],[308,167],[0,167]],.082,.003);
    const mailPoint=[s.X(91),0,.63];c.mailSlot=s.point(91,92,.075);c.actionStand.mail={point:mailPoint,facing:Math.PI};
    target(c,'contact-mailbox','mail',c.mailSlot,'Email Hanjing','contact',{href:links.email?`mailto:${links.email}`:null,stand:mailPoint,facing:Math.PI});
    coll(c,'contact-mailbox-post',s.X(18),s.X(198),-.34,.37);
  }

  // The source arrows retain their carved lettering. They hang by thin rope
  // from real cross-branches on the same rooted timber post; no floating signs.
  {
    const s=signs;
    rect(c,s,'contact-link-rooted-post',202,61,285,673,-.08,.18);
    solid(c,s,'contact-link-carved-post-cap',[[197,51],[247,0],[294,54],[284,68],[207,68]],-.05,.23);
    solid(c,s,'contact-link-scholarly-arrow',[[0,178],[103,94],[116,105],[398,126],[398,225],[118,231],[106,246]],.031,.059);
    solid(c,s,'contact-link-linkedin-arrow',[[105,281],[354,259],[354,242],[473,323],[353,397],[351,379],[105,375]],.041,.062);
    solid(c,s,'contact-link-github-arrow',[[3,467],[105,390],[120,406],[400,423],[400,523],[120,523],[106,542]],.033,.06);
    // Branch tips are attached behind the upper edges; the rope endpoints
    // land inside each wooden board and are visible above its carved face.
    for(const [i,y,left,right]of [[0,105,115,371],[1,257,125,364],[2,397,120,372]]){
      tube(c,s,`contact-link-attached-cross-branch-${i}`,[[242,y-24,-.12],[left,y-12,-.09]],3,false);
      tube(c,s,`contact-link-attached-cross-branch-right-${i}`,[[242,y-24,-.12],[right,y-10,-.09]],3,false);
      rope(c,`contact-link-left-thin-rope-${i}`,s.point(left,y-12,-.075),s.point(left,y+14,.025));
      rope(c,`contact-link-right-thin-rope-${i}`,s.point(right,y-10,-.075),s.point(right,y+14,.025));
    }
    for(const [name,shape]of [['left-root-rock',[[139,668],[188,644],[227,655],[238,698],[198,724],[154,710]]],['centre-root-rock',[[181,720],[224,670],[275,669],[305,707],[304,750],[245,755]]],['right-root-rock',[[284,666],[321,668],[350,709],[332,739],[304,731]]]])solid(c,s,`contact-sign-${name}`,shape,.11,.28);
    for(const [id,y,label,link]of [['scholar',173,'Scholar',links.scholar],['linkedin',321,'LinkedIn',links.linkedin],['github',469,'GitHub',links.github]])target(c,`contact-${id}`,'link',s.point(244,y,.081),label,'contact',{href:link,key:id});
    coll(c,'contact-carved-link-post',s.X(187),s.X(302),-.31,.17);
  }

  e.actionStand.cap={point:[.12,0,1.78],facing:Math.PI};e.actionStand.graduate=e.actionStand.cap;
  target(e,'education-graduation-ceremony','cap',[.12,.85,1.78],'Graduation cap','education',{stand:e.actionStand.cap.point,facing:Math.PI});
  e.walkAreas.push({minX:-4.4,maxX:4.8,minZ:.65,maxZ:2.9,y:0},{minX:-.38,maxX:.21,minZ:-1.16,maxZ:.65,y:0});
  c.walkAreas.push({minX:.31,maxX:.87,minZ:.615,maxZ:.98,y:0},{minX:-4.1,maxX:3.97,minZ:.65,maxZ:2.9,y:0},{minX:-.22,maxX:.18,minZ:-1.1,maxZ:.65,y:0},{minX:1.24,maxX:2.03,minZ:-1.1,maxZ:.65,y:0});

  function organicTree(st,s,name,skeleton){
    // Rounded depth follows the authored load-bearing trunk/branch skeleton.
    // An interpolated native alpha boundary closes that volume with smooth
    // bark and leaf silhouettes; it is neither a voxel edge nor a flat card.
    const cv=document.createElement('canvas');cv.width=s.nw;cv.height=s.nh;const cx=cv.getContext('2d');cx.drawImage(originalImage(s.sheet),s.ax,s.ay,s.nw,s.nh,0,0,s.nw,s.nh);
    const rgba=cx.getImageData(0,0,s.nw,s.nh).data,step=quality==='low'?5:3,cols=Math.ceil(s.nw/step),rows=Math.ceil(s.nh/step),mask=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows),su=sampleUV(s),vertices=[],threshold=42;
    const alpha=(x,y)=>rgba[(Math.min(s.nh-1,Math.max(0,Math.round(y)))*s.nw+Math.min(s.nw-1,Math.max(0,Math.round(x))))*4+3];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)mask[j*cols+i]=Math.max(alpha(i*step,j*step),alpha((i+1)*step,j*step),alpha(i*step,(j+1)*step),alpha((i+1)*step,(j+1)*step))>threshold?1:0;
    // Isolated one-pixel pigment flecks are absent from the physical tree.
    for(let n=0;n<mask.length;n++)if(mask[n]&&!seen[n]){const group=[n];seen[n]=1;for(let k=0;k<group.length;k++){const q=group[k],x=q%cols,y=Math.floor(q/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=cols||yy>=rows)continue;const v=yy*cols+xx;if(mask[v]&&!seen[v]){seen[v]=1;group.push(v);}}}if(group.length<(quality==='low'?16:5))for(const v of group)mask[v]=0;}
    const volume=(x,y)=>{
      let best=0;
      for(const [ax,ay,bx,by,ra,rb]of skeleton){const dx=bx-ax,dy=by-ay,t=THREE.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1),r=ra+(rb-ra)*t,d=Math.hypot(x-ax-dx*t,y-ay-dy*t),h=Math.sqrt(Math.max(0,r*r-d*d));best=Math.max(best,h);}
      const unit=s.w/s.nw/85,depth=Math.max(.008,best*unit*.75),centre=-.14,f=s.point(x,y,centre+depth),b=s.point(x,y,centre-depth);if(f[1]<.014){f[1]=0;b[1]=0;}return {f,b};
    };
    function clipped(triangle){const out=[];for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3],inside=a[2]>threshold;if(inside)out.push(a);if(inside!==(b[2]>threshold)){const t=(threshold-a[2])/(b[2]-a[2]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,threshold]);}}return out;}
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)if(mask[j*cols+i]){
      const xy=[[i*step,Math.min(s.nh,(j+1)*step)],[Math.min(s.nw,(i+1)*step),Math.min(s.nh,(j+1)*step)],[Math.min(s.nw,(i+1)*step),j*step],[i*step,j*step]].map(([x,y])=>[x,y,alpha(x,y)]);
      for(const ids of [[0,1,2],[0,2,3]]){const poly=clipped(ids.map(k=>xy[k]));if(poly.length<3)continue;const v=poly.map(([x,y])=>volume(x,y)),f=v.map(p=>p.f),b=v.map(p=>p.b),uv=poly.map(([x,y])=>s.uv(x,y));
        for(let k=1;k<poly.length-1;k++){tri(st,s.front,f[0],f[k],f[k+1],[uv[0],uv[k],uv[k+1]]);tri(st,s.side,b[k+1],b[k],b[0],[su[0],su[1],su[2]]);}vertices.push(...f,...b);
        for(let k=0;k<poly.length;k++){const next=(k+1)%poly.length,a=poly[k],d=poly[next],boundary=(a[2]===threshold&&d[2]===threshold)||(a[0]===0&&d[0]===0)||(a[0]===s.nw&&d[0]===s.nw)||(a[1]===0&&d[1]===0)||(a[1]===s.nh&&d[1]===s.nh);if(boundary)quad(st,s.side,[f[k],b[k],b[next],f[next]],su);}
      }
    }
    return mark(st,name,vertices,{construction:'closed rounded original bark/root/foliage with interpolated alpha outline and attached authored skeleton'});
  }
  function shrub(st,s,name,clusters,z,depth){
    for(const [i,[cx,cy,r]]of clusters.entries()){
      const outline=Array.from({length:20},(_,j)=>{const a=j/20*Math.PI*2,k=r*(1+.13*Math.sin(j*2.7+i));return [cx+Math.cos(a)*k,cy+Math.sin(a)*k*.68];});
      solid(st,s,`${name}-${i}`,outline,z,depth);
    }
  }
  function smallLeaves(st,p){
    const s=S('leaves',[70,64,1472,969],[-265.3,293.227,25,17.6],[150,130,400,380],'education-thin-willow-leaves');
    solid(st,s,'education-willow-leaf-left',[[2,2],[120,74],[265,199],[448,395],[688,753],[765,805],[544,630],[299,385],[102,143]],-.011,.0015);
    solid(st,s,'education-willow-leaf-right',[[1399,35],[1263,293],[1012,519],[759,790],[824,691],[1049,353],[1211,145]],-.012,.0015);
    tube(st,s,'education-attached-leaf-stem',[[694,727,-.013],[750,857,-.013]],4,false);
  }
  function nativeHardware(st,mat,name,start,end,r){
    const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),axis=b.clone().sub(a),geo=new THREE.CylinderGeometry(r,r,axis.length(),8);resources.add(geo);
    const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());mesh.castShadow=true;st.root.add(mesh);return mesh;
  }
  function rope(st,name,start,end){
    const material=rope.material||(rope.material=new THREE.MeshStandardMaterial({color:'#b69b73',roughness:1}));resources.add(material);
    nativeHardware(st,material,name,start,end,.0041);
    for(const [i,p]of [start,end].entries()){const geo=new THREE.TorusGeometry(.009,.002,4,10);resources.add(geo);const knot=new THREE.Mesh(geo,material);knot.name=`${name}-attached-knot-${i}`;knot.position.set(...p);st.root.add(knot);}
  }
  function entryLight(st,s,name,positions){
    const mat=new THREE.MeshStandardMaterial({color:'#ad8d55',emissive:'#ffcf81',emissiveIntensity:0,roughness:.5});resources.add(mat);
    for(const [i,[x,y]]of positions.entries()){
      const geo=new THREE.SphereGeometry(.012,8,6);resources.add(geo);const lantern=new THREE.Mesh(geo,mat);lantern.name=`${name}-door-mounted-lantern-${i}`;lantern.position.set(...s.point(x,y,.14));st.root.add(lantern);
    }
    const light=new THREE.PointLight('#ffd89b',0,.9,2);light.name=`${name}-warm-door-light`;light.position.set(...s.point((positions[0][0]+positions[1][0])/2,positions[0][1],.18));st.root.add(light);lights.push({light,intensity:.16,lens:mat});
  }
  function addCampusNight(s,school){
    const paneLocations={ms:[[92,318,12,35],[117,318,12,35],[91,379,12,32],[116,379,12,32],[174,324,11,30],[190,379,11,32],[309,317,12,36],[327,317,12,36],[346,317,12,36],[412,197,12,29],[431,197,12,29],[422,247,13,29],[420,344,17,48],[479,379,11,32],[495,379,11,32],[549,379,11,32],[565,379,11,32]],phd:[[94,210,14,46],[132,210,15,46],[171,210,15,46],[92,293,17,54],[132,293,17,54],[171,293,16,54],[249,295,15,51],[375,295,15,51],[436,220,13,34],[490,207,17,97],[536,205,18,99],[585,202,19,102],[622,211,17,93],[664,220,15,84]]};
    const cv=document.createElement('canvas');cv.width=s.iw;cv.height=s.ih;const ctx=cv.getContext('2d');ctx.drawImage(originalImage(s.sheet),0,0);
    const image=ctx.getImageData(0,0,s.iw,s.ih),pixels=image.data,original=pixels.slice();
    for(let i=0;i<pixels.length;i+=4){pixels[i]*=.49;pixels[i+1]*=.52;pixels[i+2]*=.58;}
    // Continuous native luminance mask from campus-portrait-v9.js: fine lead
    // lines stay dark while the actual painted glass warms, never a fake grid.
    for(const [x,y,w,h]of paneLocations[school])for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
      const nx=xx/w-.5;if(yy<w*.44&&Math.abs(nx)>.45*Math.sqrt(Math.max(0,yy/(w*.44))))continue;
      const index=((s.ay+y+yy)*s.iw+s.ax+x+xx)*4,L=(original[index]*.2126+original[index+1]*.7152+original[index+2]*.0722)/255;
      const mask=THREE.MathUtils.clamp(Math.pow(L,1.15)*2.25-.12,0,.95);const f=yy/h,colour=[227+(255-227)*Math.min(1,f*2),172+(231-172)*f,98+(182-98)*f];
      for(let k=0;k<3;k++)pixels[index+k]=pixels[index+k]*(1-mask)+colour[k]*mask;
    }ctx.putImageData(image,0,0);const tex=new THREE.CanvasTexture(fitPaintCanvas(cv,quality));tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;resources.add(tex);s.night=tex;
  }

  // Material merging preserves the per-part construction manifest while
  // keeping both richly detailed chapters below normal mobile draw budgets.
  for(const q of batches.values()){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(q.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(q.uv,2));g.computeBoundingBox();g.computeBoundingSphere();resources.add(g);
    const mesh=new THREE.Mesh(g,q.material);mesh.name=`merged-${q.st.id}-${q.material.name}`;mesh.castShadow=true;mesh.receiveShadow=q.material.isMeshStandardMaterial;if(envelopeMaterials.includes(q.material)){mesh.position.set(...envelopeCentre.map(v=>-v));letterGroup.add(mesh);}else q.st.root.add(mesh);
  }
  root.updateMatrixWorld(true);for(const st of [e,c])st.bounds=new THREE.Box3().setFromObject(st.root);
  const diagnostics={construction:'Original SVG scale 1/85m; separately closed architecture/props, projected painted fronts, sampled sides and inferred rear volumes.',parts:parts.length,triangles:lehighCampus.diagnostics.triangles+[...batches.values()].reduce((n,b)=>n+b.p.length/9,0),lehigh:lehighCampus.diagnostics,staticDrawCalls:batches.size+lehighCampus.diagnostics.drawCalls,lights:lights.length,sourceTextures:Object.keys(textures).length,partManifest:parts,limitations:['School keepsakes retain original small scale; facade doors are not human-sized entrances.','Unseen side/rear architecture is inferred from source facade.']};
  const setTheme=dark=>{
    lehighCampus.setTheme(dark);
    for(const s of themeMaps){s.front.map=dark&&s.night?s.night:(s.front.map?.isCanvasTexture&&!s.night?s.front.map:textures[s.sheet]);s.front.color.set(dark?(s.night?'#ffffff':'#929cab'):'#ffffff');s.front.needsUpdate=true;s.side.color.set(dark?'#b9bbc5':(s===schoolSources.bs?'#f4f1e9':'#d3c8b5'));if(s===schoolSources.bs)s.side.emissiveIntensity=dark?.035:.09;if(s.roofSide)s.roofSide.color.set(dark?'#b9bec9':'#d3d0c8');if(s.woodSide)s.woodSide.color.set(dark?'#b9bbc5':'#d3c8b5');if(s.closedMetalFront)s.closedMetalFront.color.set(dark?'#929cab':'#ffffff');}
    for(const {light,intensity,lens}of lights){light.intensity=dark?intensity:0;lens.emissiveIntensity=dark?1.25:0;}
  };
  function setMailProgress(progress){
    const p=THREE.MathUtils.clamp(progress,0,1);if(p>=.86)mailed=true;
    const insert=THREE.MathUtils.smoothstep(p,.28,.75);letterGroup.visible=p>.19&&p<.77;letterGroup.position.set(envelopeCentre[0],THREE.MathUtils.lerp(envelopeCentre[1],c.mailSlot[1],insert),THREE.MathUtils.lerp(.275,-.05,insert));letterGroup.rotation.x=-Math.PI/2*THREE.MathUtils.smoothstep(p,.2,.68);
    if(flagPivot)flagPivot.rotation.z=mailed?0:-Math.PI/2*(1-THREE.MathUtils.smoothstep(p,.67,.95));
  }
  setTheme(false);setMailProgress(0);
  return {root,scenes:[e,c],setTheme,setMailProgress,update(time,dt,dark){},dispose(){for(const resource of resources){if(resource.isTexture)releasePaintTexture(resource);else resource.dispose?.();}root.removeFromParent();},diagnostics};
}
