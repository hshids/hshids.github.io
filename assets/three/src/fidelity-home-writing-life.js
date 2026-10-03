import * as THREE from 'three';
import { acquirePaintTexture, releasePaintTexture, fitPaintCanvas, worldAssetURL } from './fidelity-assets.js';
import { UNIT,px,py,createPainter,createSolidBuilder } from './fidelity-hwl-geometry.js';

/** Original painted home, writing studio, and three-room home made into
 * separate volumetric objects. Front colours deliberately preserve the
 * source's baked light; the unseen depth is a sympathetic continuation. */
export async function createFaithfulHomeWritingLife({data=window.HJ_DATA,quality='high'}={}) {
  const root=new THREE.Group();root.name='original-painted-home-writing-life';
  const resources=new Set(),frontMaterials=[],sideMaterials=[],lights=[],animated=[],scenes=[];
  const textures={},sharedTextures=new Set();
  const sheets={buildings:[1536,1024],details:[1774,887],branches:[1774,887],writing:[1536,1024],keepsakes:[1536,1024],archive:[1086,1448],props:[1448,1086],gallery:[1024,1536],finishes:[2172,724],materials:[1536,1024]};
  const files={buildings:'buildings-painted.webp',details:'details-painted.webp',branches:'branch-signs-painted.webp',writing:'writing-screen-complete-painted.webp',keepsakes:'keepsakes-painted.webp',archive:'tutorial-archive-painted.webp',props:'belongings-painted.webp',gallery:'gallery-screen-painted.webp',finishes:'finishes-painted.webp',materials:'materials-painted.webp'};
  await Promise.all(Object.entries(files).map(async([key,file])=>{const t=await acquirePaintTexture(worldAssetURL('assets/art/'+file),{quality});sharedTextures.add(t);textures[key]=t;}));
  const paint=(key,crop,display,name,role={})=>{const p=createPainter(resources,textures[key],sheets[key],crop,display,name,role);frontMaterials.push(p.front);sideMaterials.push(p.side);return p;};
  function logicalSource(key){const c=document.createElement('canvas');c.width=sheets[key][0];c.height=sheets[key][1];c.getContext('2d').drawImage(textures[key].image,0,0,c.width,c.height);return c;}
  function opaqueWovenPaint(key,crop,display,name){
    // The original cushion is a shallow painted ellipse with transparent
    // corners. A real curved volume needs opaque cloth beyond that contour.
    // Continue the nearest original weave while retaining every opaque pixel.
    const source=logicalSource(key),[l,t,r,b]=crop,w=r-l,h=b-t,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,l,t,w,h,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h),input=new Uint8ClampedArray(pixels.data),owner=new Int32Array(w*h).fill(-1),queue=new Int32Array(w*h);let first=0,last=0;
    for(let i=0;i<owner.length;i++)if(input[i*4+3]>=220){owner[i]=i;queue[last++]=i;}
    while(first<last){const i=queue[first++],x=i%w,y=Math.floor(i/w);for(const next of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(next>=0&&owner[next]<0){owner[next]=owner[i];queue[last++]=next;}}
    for(let i=0;i<owner.length;i++){const from=Math.max(0,owner[i])*4;for(let k=0;k<3;k++)pixels.data[i*4+k]=input[from+k];pixels.data[i*4+3]=255;}ctx.putImageData(pixels,0,0);source.width=source.height=1;const texture=new THREE.CanvasTexture(fitPaintCanvas(canvas,quality));texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);const p=createPainter(resources,texture,[w,h],[0,0,w,h],display,name,{roughness:.96});resources.delete(p.front);p.front.dispose();p.front=p.side;p.side.alphaTest=0;p.side.name=name+'-continuous-original-woven-cloth';sideMaterials.push(p.side);return p;
  }
  // Continue the source plaster's fine grain, while removing its large baked
  // window/beam gradient from inferred walls that receive real 3D lighting.
  function plasterMicroTile(){
    const source=logicalSource('buildings'),canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,1320,753,95,71,0,0,128,96);const pixels=ctx.getImageData(0,0,128,96),input=new Uint8ClampedArray(pixels.data),stride=129,integral=Array.from({length:3},()=>new Float32Array(129*97)),mean=[0,0,0];
    for(let y=0;y<96;y++)for(let x=0;x<128;x++)for(let k=0;k<3;k++){const a=(y*128+x)*4+k,v=input[a];mean[k]+=v/(128*96);integral[k][(y+1)*stride+x+1]=v+integral[k][y*stride+x+1]+integral[k][(y+1)*stride+x]-integral[k][y*stride+x];}
    for(let y=0;y<96;y++)for(let x=0;x<128;x++){const l=Math.max(0,x-15),r=Math.min(128,x+16),t=Math.max(0,y-15),b=Math.min(96,y+16);for(let k=0;k<3;k++){const a=(y*128+x)*4+k,I=integral[k],local=(I[b*stride+r]-I[t*stride+r]-I[b*stride+l]+I[t*stride+l])/((r-l)*(b-t));pixels.data[a]=THREE.MathUtils.clamp(mean[k]+(input[a]-local)*.78,0,255);}pixels.data[(y*128+x)*4+3]=255;}ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);source.width=source.height=1;return texture;
  }
  function paintedVariant(p,c,name){const texture=new THREE.CanvasTexture(fitPaintCanvas(c,quality));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=quality==='low'?2:4;resources.add(texture);const front=p.front.clone();front.map=texture;front.name=name;resources.add(front);frontMaterials.push(front);return {...p,front};}
  function nightWindowPaint(p,rect,name){const canvas=logicalSource('buildings'),ctx=canvas.getContext('2d',{willReadFrequently:true}),[l,t,r,b]=rect,pixels=ctx.getImageData(l,t,r-l,b-t);for(let i=0;i<pixels.data.length;i+=4){const R=pixels.data[i],G=pixels.data[i+1],B=pixels.data[i+2],lum=.2126*R+.7152*G+.0722*B,weight=THREE.MathUtils.smoothstep(lum,105,165)*.72;pixels.data[i]=R*(1-weight)+236*weight;pixels.data[i+1]=G*(1-weight)+187*weight;pixels.data[i+2]=B*(1-weight)+113*weight;}ctx.putImageData(pixels,l,t);const window=paintedVariant(p,canvas,name);window.front.userData.windowPane=true;window.front.userData.dayMap=p.texture;window.front.userData.nightMap=window.front.map;return window;}
  function role(p,name,options={}){const side=p.side.clone();side.name=p.name+'-'+name+'-physical-sides';Object.assign(side,options);resources.add(side);sideMaterials.push(side);return {...p,side};}
  const proxyGeometry=new THREE.BoxGeometry(1,1,1),proxyMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false,visible:false});resources.add(proxyGeometry);resources.add(proxyMaterial);
  function scene(id){const sr=new THREE.Group();sr.name='faithful-'+id;root.add(sr);const s={id,root:sr,bounds:null,walkAreas:[],colliders:[],interactables:[],actionStand:[0,0,1.4],parts:[],diagnostics:{}};scenes.push(s);return s;}
  function collider(s,id,min,max){s.colliders.push({id,type:'box',min,max,bounds:new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max))});}
  function pick(s,id,type,point,size,title,focus,stand){const object=new THREE.Mesh(proxyGeometry,proxyMaterial);object.name='interaction-'+id;object.position.set(...point);object.scale.set(...size);object.userData.interaction=id;s.root.add(object);const i={id,type,object,point,stand:stand||s.actionStand.slice(),title,focus,chapter:s.id};s.interactables.push(i);return i;}
  function area(s,id,minX,maxX,minZ,maxZ,y=0,type='floor'){s.walkAreas.push({id,type,minX,maxX,minZ,maxZ,y,min:[minX,y,minZ],max:[maxX,y,maxZ]});}
  function light(s,name,p,intensity=0,distance=5){const l=new THREE.PointLight('#ffc06c',intensity,distance,2);l.name=name;l.position.set(...p);l.userData.nightIntensity=.48;l.userData.chapterRoot=s.root;s.root.add(l);lights.push(l);return l;}
  const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=1024;const lc=lettering.getContext('2d');
  const labels=['WELCOME','NEWS','WRITING','LIFE','6 CATS','R','Python','Stats','Web','Blogs'];
  labels.forEach((text,i)=>{const x=(i%2)*512,y=Math.floor(i/2)*192;lc.font=`${i===1||i===3?90:i===4?80:i>4?58:56}px Georgia,serif`;lc.textAlign='center';lc.textBaseline='middle';lc.fillStyle='#452c19';lc.fillText(text,x+257,y+98);lc.fillStyle=i>4?'#49331f':'#f2e6c9';lc.fillText(text,x+256,y+96);});
  const labelTexture=new THREE.CanvasTexture(fitPaintCanvas(lettering,quality));labelTexture.colorSpace=THREE.SRGBColorSpace;resources.add(labelTexture);const labelMat=new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,depthWrite:false,toneMapped:false});resources.add(labelMat);frontMaterials.push(labelMat);
  function label(s,text,cx,cy,z,width,height){const index=labels.indexOf(text),g=new THREE.PlaneGeometry(px(width),px(height));const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(index%2+uv.getX(i))/2,1-(Math.floor(index/2)*192+192*(1-uv.getY(i)))/1024);const m=new THREE.Mesh(g,labelMat);m.name='original-english-lettering-'+text;m.position.set(px(cx),py(cy),z);s.root.add(m);resources.add(g);return m;}
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=96;const cg=contactCanvas.getContext('2d'),gradient=cg.createRadialGradient(48,48,0,48,48,48);gradient.addColorStop(0,'rgba(57,44,29,.9)');gradient.addColorStop(.45,'rgba(57,44,29,.55)');gradient.addColorStop(1,'rgba(57,44,29,0)');cg.fillStyle=gradient;cg.fillRect(0,0,96,96);const contactTexture=new THREE.CanvasTexture(contactCanvas);contactTexture.colorSpace=THREE.SRGBColorSpace;resources.add(contactTexture);
  function contact(s,x,z,rx,rz,opacity=.14){const g=new THREE.PlaneGeometry(2,2),m=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity,depthWrite:false});const mesh=new THREE.Mesh(g,m);mesh.name='ground-contact-shadow';mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.008,z);mesh.scale.set(rx,rz,1);s.root.add(mesh);resources.add(g);resources.add(m);}
  function finish(s,b){s.diagnostics=b.flush();let allTriangles=0,allDrawCalls=0,materials=new Set(),geometries=new Set();s.root.traverse(o=>{if(o.isMesh&&o.material.visible!==false){allDrawCalls++;materials.add(o.material);geometries.add(o.geometry);allTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});Object.assign(s.diagnostics,{triangles:allTriangles,drawCalls:allDrawCalls,materials:materials.size,geometries:geometries.size});s.bounds=new THREE.Box3().setFromObject(s.root);s.diagnostics.parts=s.parts;s.diagnostics.sourceContinuity='Front colour projects from the exact paint.js crop/display; only hidden depth is inferred.';}

  // Original transparent roof-edge pixels mark the painted silhouette, not
  // holes in a solid roof. Keep every opaque painted pixel and continue only
  // the missing inferred surface with original slate samples.
  const roofCanvas=logicalSource('buildings'),roofContext=roofCanvas.getContext('2d');roofContext.globalCompositeOperation='destination-over';
  for(const[l,t,r,b,sl,st,sw,sh]of [[38,71,763,209,193,125,100,40],[792,583,1521,717,932,628,100,46]])for(let y=t;y<b;y+=sh)for(let x=l;x<r;x+=sw)roofContext.drawImage(roofCanvas,sl,st,sw,sh,x,y,sw,sh);
  roofContext.globalCompositeOperation='source-over';const roofTexture=new THREE.CanvasTexture(fitPaintCanvas(roofCanvas,quality));roofTexture.colorSpace=THREE.SRGBColorSpace;roofTexture.anisotropy=quality==='low'?2:4;resources.add(roofTexture);
  function solidRoofPaint(p){const front=p.front.clone();front.map=roofTexture;front.name=p.name+'-solid-original-slate-continuation';resources.add(front);frontMaterials.push(front);return{...p,front};}

  // WELCOME: passage, open doors, tiled roof, masonry and News board.
  const home=scene('home');home.actionStand=[px(-75),0,1.5];
  const gate=paint('buildings',[38,71,763,478],[-333,288.668,510,272],'welcome-gate');
  const gateStone=role(gate,'weathered-stone',{roughness:.97}),gatePlaster=role(gate,'plaster',{roughness:.94}),gateRoof=role(gate,'slate-tile',{roughness:.78});
  const gb=createSolidBuilder(home.root,resources,home.parts),wood=[289,194,468,225],stone=[86,439,240,462],plaster=[104,269,127,371],roof=[193,125,626,165];
  gb.sourceRoof('original-curved-gate-roof',solidRoofPaint(gateRoof),[[41,107,154],[55,132,165],[80,143,175],[106,148,181],[128,143,178],[146,129,173],[164,102,175],[189,100,177],[302,108,181],[398,109,182],[502,109,181],[611,100,178],[642,103,175],[660,127,175],[685,142,178],[713,148,180],[739,138,174],[751,125,165],[760,107,154]],.02,3.5,roof,{hip:[164,642],rearInset:40});
  gb.sourcePolygon('gate-left-roof-finial',gate,[[161,72],[177,81],[191,81],[190,101],[169,101],[163,91]],-1.55,.14,roof);gb.sourcePolygon('gate-right-roof-finial',gate,[[647,72],[643,91],[637,101],[616,101],[617,81],[631,81]],-1.55,.14,roof);
  gb.sourceBox('gate-wood-eave-beam',gate,[80,183,719,209],-.13,3.25,wood);
  gb.sourceBox('gate-lintel',gate,[151,219,650,243],-.20,2.72,wood);
  gb.sourceBox('gate-left-lateral-wall',gatePlaster,[100,244,130,432],-.30,3.05,plaster);
  gb.sourceBox('gate-right-lateral-wall',gatePlaster,[675,244,701,432],-.30,3.05,plaster);
  [[[154,246,180,432],[224,246,232,432],[180,246,224,274],[180,367,224,432]],[[566,246,574,432],[619,246,647,432],[574,246,619,274],[574,367,619,432]]].forEach((strips,i)=>strips.forEach((r,j)=>gb.sourceBox('gate-window-opening-plaster-'+i+'-'+j,gatePlaster,r,-.65,2.6,plaster)));
  for(const [i,cx]of [141,251,550,660].entries()){gb.sourceRound('gate-grounded-stone-column-base-'+i,gateStone,cx,-.11,[[434,18],[426,20],[417,19],[408,13]],stone,40);gb.sourceRound('gate-tapered-timber-column-'+i,gate,cx,-.11,[[408,13],[250,11],[208,12]],wood,40);}
  for(const[i,r]of [[180,274,224,367],[574,274,619,367]].entries()){
    gb.sourceBox('gate-recessed-lattice-'+i,i?nightWindowPaint(gate,[579,280,614,360],'original-welcome-lit-lattice-pane'):gate,r,-.75,.09,wood);const[l,t,rgt,b]=r;
    [[l-4,t-5,l,b+4],[rgt,t-5,rgt+4,b+4],[l,t-5,rgt,t],[l,b,rgt,b+4]].forEach((r,j)=>gb.sourceBox('gate-window-moulding-'+i+'-'+j,gate,r,-.64,.14,wood));
  }
  // Door panels follow each source contour, leaving the central opening clear.
  gb.sourcePolygon('left-open-red-gate-door',gate,[[279,250],[327,264],[327,416],[280,421]],-.03,.18,[287,285,311,409]);
  gb.sourcePolygon('right-open-red-gate-door',gate,[[470,263],[517,249],[517,420],[470,416]],-.03,.18,[481,283,505,409]);
  for(const [i,r]of [[152,224,192,258],[205,224,236,257],[266,223,298,254],[508,223,536,257],[562,224,592,259],[619,224,650,258]].entries())gb.sourcePolygon('gate-carved-corner-'+i,gate,[[r[0],r[1]],[r[2],r[1]],[r[2],r[1]+7],[r[0]+7,r[3]],[r[0],r[3]]],-.22,.17,wood);
  gb.sourceBox('gate-stone-plinth',gateStone,[78,432,718,454],.15,3.65,stone);
  gb.sourceBox('gate-left-grounded-side',gateStone,[78,453,239,466],.2,3.67,stone);gb.sourceBox('gate-right-grounded-side',gateStone,[558,453,719,466],.2,3.67,stone);
  gb.sourceBox('gate-upper-stair',gateStone,[266,443,531,455],.24,.86,stone);gb.sourceBox('gate-middle-stair',gateStone,[253,455,543,467],.45,1.06,stone);gb.sourceBox('gate-lower-stair',gateStone,[238,467,559,478],.70,1.28,stone);
  const plaque=paint('finishes',[1465,348,2141,550],[-139,392,122,26],'welcome-original-plaque');gb.box('welcome-wood-sign',plaque,[-139,392,-17,418],-.12,.1,[1598,410,1991,492]);label(home,'WELCOME',-78,405,-.062,109,45);
  const board=paint('details',[646,449,1008,852],[153,420.347,112,140],'welcome-news');
  gb.sourceRoof('news-hipped-tile-roof',board,[[646,467,519],[664,451,520],[710,454,523],[810,454,523],[939,454,523],[983,451,520],[1008,467,520]],.15,.7,[709,474,948,512]);
  gb.sourceBox('news-board-back',board,[693,552,960,706],-.05,.16,[711,556,946,570]);
  gb.sourceBox('news-notice-one',board,[722,582,778,670],.016,.012,[722,582,778,670]);gb.sourceBox('news-notice-two',board,[788,574,856,681],.016,.012,[788,574,856,681]);gb.sourceBox('news-notice-three',board,[872,586,927,670],.016,.012,[872,586,927,670]);
  for(const [i,r]of [[680,540,707,808],[946,540,975,808],[684,691,969,711],[658,799,731,852],[924,799,993,852]].entries())gb.sourceBox('news-independent-frame-'+i,board,r,.025,.34,i>2?[660,814,730,849]:[684,735,704,793]);
  label(home,'NEWS',209.2,460.7,.037,66,24);
  pick(home,'home-gate','panel',[px(-78),py(350),-.2],[2.2,1.8,2.3],'Welcome',{section:'about'},[px(-78),0,.95]);
  pick(home,'home-news','news',[px(209),py(482),.15],[px(110),px(135),.65],'News',{news:true},[px(209),0,.95]);
  collider(home,'left-gate-wing',[px(-287),0,-3.25],[px(-130),2.9,-.3]);collider(home,'right-gate-wing',[px(-29),0,-3.25],[px(146),2.9,-.3]);
  area(home,'gate-passage',px(-130),px(-29),-3.50,.15,.354);area(home,'gate-upper-step',px(-173),px(14),.15,.24,.267,'stair');area(home,'gate-forecourt',px(-330),px(268),.72,2,0);area(home,'gate-lower-step',px(-192),px(33),.45,.70,.079,'stair');area(home,'gate-middle-step',px(-182),px(23),.24,.45,.173,'stair');
  light(home,'original-welcome-right-lattice-window',[px(51),py(454.668),-.85]);contact(home,px(-78),-1.0,3.5,2.1,.10);contact(home,px(209),-.04,.75,.47,.14);
  finish(home,gb);

  // Writing and Life are built by the same exact projection helpers below.
  const writing=scene('writing');
  const life=scene('life');
  // Factories are extended below without altering the original content file.
  buildWriting(writing);await buildLife(life);

  function buildWriting(s) {
    s.actionStand=[px(-92),.094,.88];
    const b=createSolidBuilder(s.root,resources,s.parts);
    const branch=paint('branches',[57,34,967,854],[-280,184.459,495,376],'writing-original-branch');
    const barkCanvas=logicalSource('branches'),barkContext=barkCanvas.getContext('2d');barkContext.globalCompositeOperation='destination-over';for(let y=34;y<854;y+=110)for(let x=57;x<967;x+=95)barkContext.drawImage(barkCanvas,299,127,95,32,x,y,95,110);barkContext.globalCompositeOperation='source-over';const solidBranch=paintedVariant(branch,barkCanvas,'original-bark-solid-front-continuation');
    const branchPath=points=>points.map(([x,y,z=-1.4])=>{const p=branch.original(x,y);return[p[0]/UNIT,560-p[1]/UNIT,z];});
    b.tube('living-writing-tree-trunk',solidBranch,branchPath([[147,839],[161,737],[143,601],[137,468],[139,340],[130,207],[173,131],[207,61]]),[.31,.27,.22,.20,.18,.16,.105,.025],[112,366,171,519],22);
    b.tube('arched-writing-bough',solidBranch,branchPath([[132,206],[225,154],[372,139],[475,151],[548,177],[675,166],[801,177],[879,165],[954,185]]),[.20,.16,.13,.12,.102,.09,.075,.045,.014],[299,127,394,158],20);
    b.tube('writing-branch-left-twig',solidBranch,branchPath([[251,149],[288,113],[311,94]]),[.085,.045,.010],[265,128,288,150]);
    b.tube('writing-branch-right-twig',solidBranch,branchPath([[854,173],[892,135],[921,93]]),[.057,.035,.006],[844,156,873,182]);
    b.tube('writing-tree-left-root',solidBranch,branchPath([[143,790],[99,833],[61,851]]),[.23,.13,.008],[111,739,165,815]);
    b.tube('writing-tree-right-root',solidBranch,branchPath([[162,791],[210,843],[269,848]]),[.23,.10,.006],[111,739,165,815]);
    const p=paint('writing',[81,57,860,533],[-204,325,518,223*476/454],'writing-complete-four-panels');
    // In the source picture, the low table/tools occlude the carved screen.
    // Recover those hidden carvings from adjacent original wood, so tools are
    // present exactly once as solids rather than printed again on the screen.
    const screenCanvas=logicalSource('writing'),sc=screenCanvas.getContext('2d');sc.drawImage(screenCanvas,118,342,52,61,182,342,52,61);sc.drawImage(screenCanvas,655,345,29,58,609,345,29,58);
    [[103,238],[262,398],[426,562],[592,724]].forEach(([l,r])=>{sc.drawImage(screenCanvas,l,349,r-l,48,l,397,r-l,46);sc.drawImage(screenCanvas,89,123,14,202,l-11,397,11,46);sc.drawImage(screenCanvas,89,123,14,202,r,397,11,46);});
    const screenPaint=paintedVariant(p,screenCanvas,'source-screen-with-inferred-occluded-carvings'),deskCanvas=logicalSource('writing'),dc=deskCanvas.getContext('2d');
    dc.drawImage(deskCanvas,157,410,20,31,180,403,56,40);dc.drawImage(deskCanvas,157,410,20,31,553,403,56,40);dc.drawImage(deskCanvas,157,410,20,31,609,403,39,40);
    const deskPaint=paintedVariant(p,deskCanvas,'source-table-with-separate-tools'),timber=[89,123,103,325],silk=role(screenPaint,'silk',{roughness:.56}),wood=role(screenPaint,'carved-timber',{roughness:.78});
    const panels=[[103,238],[262,398],[426,562],[592,724]];
    panels.forEach(([l,r],i)=>{
      const z=-1.28+(i%2)*.055,panelPaint={...silk,front:silk.front.clone()};panelPaint.front.name='source-silk-'+['plum','orchid','bamboo','chrysanthemum'][i];resources.add(panelPaint.front);frontMaterials.push(panelPaint.front);let stirUntil=0;animated.push(t=>{panelPaint.front.color.set(dark?'#8d98ae':'#ffffff');if(performance.now()/1000<stirUntil)panelPaint.front.color.multiplyScalar(1.12+.045*Math.sin(t*8));});
      b.sourceBox('silk-'+['plum','orchid','bamboo','chrysanthemum'][i],panelPaint,[l+8,105,r-8,330],z,.034,[l+18,113,r-18,314]);
      b.sourceBox('screen-carved-lower-panel-'+i,wood,[l,342,r,433],z+.016,.19,timber);
      for(const[j,rect]of [[l-11,78,l,433],[r,78,r+11,433],[l,89,r,105],[l,329,r,347]].entries())b.sourceBox('screen-independent-moulding-'+i+'-'+j,wood,rect,z+.04,.22,timber);
      const mid=(l+r)/2;
      b.sourcePolygon('screen-sculpted-crest-'+i,wood,[[l-4,87],[l+14,77],[mid-16,65],[mid,56],[mid+17,66],[r-12,78],[r+3,87],[r+3,95],[l-4,95]],z+.055,.2,timber);
      b.sourceBox('screen-left-grounded-foot-'+i,wood,[l-16,433,l+3,470],z+.02,.3,timber);b.sourceBox('screen-right-grounded-foot-'+i,wood,[r-3,433,r+15,470],z+.02,.3,timber);
      const sp=[[-187,346,93,119],[-85,346,101,119],[23,346,99,119],[130,346,104,119]][i];
      const screenPick=pick(s,'writing-screen-'+['plum','orchid','bamboo','chrysanthemum'][i],'screen',[px(sp[0]+sp[2]/2),py(sp[1]+sp[3]/2),z+.08],[px(sp[2]),px(sp[3]),.18],['Plum · resilience','Orchid · grace','Bamboo · integrity','Chrysanthemum · composure'][i],{screenPlant:['plum','orchid','bamboo','chrysanthemum'][i]},[px(sp[0]+sp[2]/2),.094,.55]);screenPick.onInteract=()=>{stirUntil=performance.now()/1000+1.5;};
    });
    const deskTop=py(515.29),deskFront=.26,deskBack=-.65;
    const sourceTop=[[138,451],[680,451],[645,407],[173,407]];
    const topPts=sourceTop.map(([x,y],i)=>{const a=p.original(x,y);return[a[0],deskTop,i<2?deskFront:deskBack];});
    b.quad(deskPaint.front,topPts,sourceTop.map(v=>{const a=p.original(...v);return p.uv(...a);}));
    b.sourceBox('low-desk-true-front-edge',p,[138,447,680,461],deskFront,.17,timber);
    b.sourceBox('low-desk-left-tapered-leg',p,[145,459,168,518],deskFront-.07,.31,timber);b.sourceBox('low-desk-right-tapered-leg',p,[647,459,674,518],deskFront-.07,.31,timber);
    for(const[i,[l,r]]of [[170,190],[619,641]].entries()){const a=p.original(l,448),c=p.original(r,518),rect=[a[0]/UNIT,560-a[1]/UNIT,c[0]/UNIT,552],legPaint=paint('writing',[89,123,103,325],[rect[0],rect[1],rect[2]-rect[0],rect[3]-rect[1]],'writing-inferred-rear-timber-leg-'+i);b.box('low-desk-grounded-rear-leg-'+i,legPaint,rect,deskBack+.06,.27,timber);}
    b.sourcePolygon('low-desk-original-carved-apron',p,[[163,460],[651,460],[651,480],[625,491],[596,474],[222,475],[189,492],[163,484]],deskFront-.05,.16,timber);
    // Separate scroll paper lies horizontally on the real desk. Its corners
    // are the original Hello World clip, with front/rear mapped into z.
    const paperCorners=[[-97.61,515.29],[103.88,515.29],[91.91,500.55],[-93.62,500.55]],paperSurface=paperCorners.map(([x],i)=>[px(x),deskTop+.014,i<2?.16:-.22]);
    b.quad(p.front,paperSurface,paperCorners.map(v=>p.uv(px(v[0]),py(v[1]))));
    const helloCanvas=document.createElement('canvas');helloCanvas.width=768;helloCanvas.height=96;const hc=helloCanvas.getContext('2d'),helloTexture=new THREE.CanvasTexture(helloCanvas);helloTexture.colorSpace=THREE.SRGBColorSpace;resources.add(helloTexture);const helloMat=new THREE.MeshBasicMaterial({map:helloTexture,transparent:true,depthWrite:false,toneMapped:false});resources.add(helloMat);frontMaterials.push(helloMat);
    const helloGeo=new THREE.BufferGeometry();helloGeo.setAttribute('position',new THREE.Float32BufferAttribute([...paperSurface[0],...paperSurface[1],...paperSurface[2],...paperSurface[0],...paperSurface[2],...paperSurface[3]].map((v,i)=>i%3===1?v+.008:v),3));helloGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1],2));helloGeo.computeVertexNormals();const helloMesh=new THREE.Mesh(helloGeo,helloMat);helloMesh.name='true-desk-paper-handwritten-Hello-World';s.root.add(helloMesh);resources.add(helloGeo);
    const glyphPaths=['M1 10L1 1M1 5.4L6.6 5.1M7 1L6.7 10','M10 6.6Q14.8 6.9 14 4.9Q12.1 3.5 10.1 5.7Q8.6 9.9 14.4 9.3','M17.5 1L16.8 9.6Q17.3 10 18.4 9.5','M21.1 1L20.4 9.6Q20.9 10 22 9.5','M26.4 4.7C22.7 4.2 22.9 10.4 26.7 9.8C29.8 9.3 29.4 4.1 26.4 4.7','M35.4 1.1L36.7 10L40.7 3.1L41.8 10L46.2 1.2','M51.1 4.7C47.4 4.2 47.6 10.4 51.4 9.8C54.5 9.3 54.1 4.1 51.1 4.7','M56.7 9.8L57.1 4.8M57 6.7Q60 3.7 61 5.6','M63.9 1L63.2 9.6Q63.7 10 64.8 9.5','M69.2 4.9C65.6 4.2 65.3 10.4 69 9.8Q71.2 9.5 71.5 6.6M72.2 1L71.1 9.7','M76 1.1L75.2 7.3M75 9.7L75.02 9.9'];
    const glyphs=glyphPaths.map((d,i)=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);return{path,length:path.getTotalLength(),index:i};});
    let writingActive=false,writingElapsed=0,lastInkStep=-1;
    function paintHello(progress){
      const index=Math.min(10,Math.floor(progress)),fraction=THREE.MathUtils.clamp(progress-index,0,1),glyph=glyphs[index],point=glyph.path.getPointAtLength(glyph.length*fraction),gx=point.x-(index>=5?34.4:0),sx=.50*gx+.06*point.y+(index<5?49:47),sy=.008*gx+.46*point.y+(index<5?501.5:506.4),u=THREE.MathUtils.clamp((sx+97.61)/201.49,0,1),v=THREE.MathUtils.clamp(1-(sy-500.55)/14.74,0,1),a=paperSurface[0],b=paperSurface[1],c=paperSurface[2],d=paperSurface[3],tip=a.map((_,j)=>u>=v?a[j]*(1-u)+b[j]*(u-v)+c[j]*v:a[j]*(1-v)+c[j]*u+d[j]*(v-u));tip[1]+=.010;
      s.root.userData.writingTip={position:tip,normal:[0,1,0],glyph:index,fraction,active:writingActive&&progress<glyphs.length};
      const step=Math.floor(progress*60);if(step===lastInkStep)return;lastInkStep=step;hc.clearRect(0,0,768,96);hc.save();hc.scale(768/201.49,96/14.74);hc.translate(97.61,-500.55);hc.strokeStyle='#382c24';hc.lineWidth=1.02;hc.lineCap='round';hc.lineJoin='round';
      glyphs.forEach(({path,length,index})=>{const fraction=THREE.MathUtils.clamp(progress-index,0,1);if(!fraction)return;hc.save();hc.transform(.50,.008,.06,.46,index<5?49:47,index<5?501.5:506.4);if(index>=5)hc.translate(-34.4,0);hc.beginPath();const p0=path.getPointAtLength(0);hc.moveTo(p0.x,p0.y);for(let j=1;j<=Math.max(2,Math.ceil(length*7*fraction));j++){const p=path.getPointAtLength(Math.min(length*fraction,j/(Math.ceil(length*7*fraction))*length*fraction));const previous=path.getPointAtLength(Math.max(0,(j-1)/(Math.ceil(length*7*fraction))*length*fraction));if(Math.hypot(p.x-previous.x,p.y-previous.y)>.5)hc.moveTo(p.x,p.y);else hc.lineTo(p.x,p.y);}hc.stroke();hc.restore();});hc.restore();helloTexture.needsUpdate=true;
    }
    s.root.userData.setWritingActive=active=>{const next=!!active;if(next&&!writingActive){writingElapsed=0;lastInkStep=-1;}writingActive=next;paintHello(Math.min(glyphs.length,writingElapsed/.64));};s.root.userData.getWritingTip=()=>s.root.userData.writingTip;paintHello(0);
    animated.push((t,dt)=>{if(writingActive){writingElapsed=Math.min(glyphs.length*.64,writingElapsed+dt);paintHello(writingElapsed/.64);}});

    const rollPaint=paint('writing',[252,418,300,434],[-100,509,202,9],'writing-original-paper-rolled-ends',{roughness:.94});
    for(const [i,x]of [-96,100].entries())b.tube('real-unrolled-paper-scroll-end-'+i,rollPaint,[[x,514,.18],[x,514,-.24]],[.042,.042],[252,418,300,434],24);
    b.sourceRound('writing-original-round-inkstone',p,579,-.60,[[438,23],[433,28],[419,27],[412,25],[406,20]], [561,418,591,435],40);
    const inkLiquid=new THREE.Mesh(new THREE.CircleGeometry(.13,32),new THREE.MeshPhysicalMaterial({color:'#171b18',roughness:.21,metalness:.03,clearcoat:.5}));inkLiquid.rotation.x=-Math.PI/2;inkLiquid.position.set(px(-204+(579-81)*518/779),py(325+(412-57)*223/454)+.006,-.60);s.root.add(inkLiquid);resources.add(inkLiquid.geometry);resources.add(inkLiquid.material);
    b.sourceRound('writing-jade-brush-pot',p,211,-.72,[[437,18],[433,20],[395,20],[391,17]], [195,397,225,433],32);
    for(const[i,[x,h]]of [[192,361],[201,349],[209,365],[216,353],[224,363]].entries()){
      b.tube('brush-pot-bamboo-shaft-'+i,p,[[x,399,-.72+(i%2)*.025],[x+(i-2)*2,h,-.72]].map(([sx,sy,z])=>{const q=p.original(sx,sy);return[q[0]/UNIT,560-q[1]/UNIT,z];}),[.012,.011],[204,365,211,385],10);
      b.tube('brush-pot-tapered-hairs-'+i,p,[[x+(i-2)*2,h,-.72],[x+(i-2)*2-1,h-15,-.72]].map(([sx,sy,z])=>{const q=p.original(sx,sy);return[q[0]/UNIT,560-q[1]/UNIT,z];}),[.025,.001],[185,342,192,365],12);
    }
    b.sourceRound('writing-candle-brass-holder',p,623,-.71,[[440,20],[435,13],[417,5],[399,13],[396,10]], [610,395,634,435],32);
    b.sourceRound('writing-real-wax-candle',p,623,-.71,[[398,7],[367,7],[364,5]], [617,371,628,397],24);
    const candle=new THREE.Mesh(new THREE.SphereGeometry(.023,12,8),new THREE.MeshBasicMaterial({color:'#ffcd76',toneMapped:false}));candle.scale.set(.6,1.6,.6);const cp=p.original(623,357);candle.position.set(cp[0],cp[1],-.71);s.root.add(candle);resources.add(candle.geometry);resources.add(candle.material);light(s,'source-writing-candle',[cp[0],cp[1]+.05,-.64],0,2.7);
    const cushion=opaqueWovenPaint('keepsakes',[298,443,523,511],[-204+(298-81)*518/779,325+(443-57)*223/454,225*518/779,68*223/454],'writing-original-embroidered-cushion');
    const cushionCX=14.2,cz=.35,cushionBase=py(552),cushionHeightScale=.20;
    const cushionY=y=>cushionBase+(py(y)-cushionBase)*cushionHeightScale;
    // A shallow kneeling pad supports the knees; its original embroidery UV
    // remains intact while the physical loft is lowered from 42cm to 8.5cm.
    b.round('soft-embroidered-writing-cushion',cushion,cushionCX,cz,[[552,px(60)],[543,px(68)],[534,px(71)],[526,px(66)],[520,px(48)],[516,0]], [48,32,196,64],52,{continuousProjection:true,smoothNormals:true,heightScale:cushionHeightScale,heightBase:cushionBase});
    // A stitched, restrained interaction rim sits on the cushion itself.
    const seatRim=new THREE.Mesh(new THREE.TorusGeometry(px(68),.009,6,64),new THREE.MeshStandardMaterial({color:'#a48650',emissive:'#d5ac68',emissiveIntensity:.10,roughness:.78}));seatRim.rotation.x=-Math.PI/2;seatRim.position.set(px(cushionCX),cushionY(531.1),cz);seatRim.scale.y=.60;seatRim.name='discreet-writing-seat-thread';s.root.add(seatRim);resources.add(seatRim.geometry);resources.add(seatRim.material);
    animated.push(t=>{seatRim.material.emissiveIntensity=(dark?.20:.065)+Math.sin(t*1.4)*.025;});
    const cabinet=paint('archive',[145,17,988,1409],[245,325,135,223],'original-writing-tutorial-archive',{roughness:.78});
    const cw=[181,370,210,1250],cpaper=[424,420,641,480];
    b.sourceBox('archive-left-tall-carved-post',cabinet,[154,168,213,1327],-.94,.61,cw);b.sourceBox('archive-right-tall-carved-post',cabinet,[859,168,923,1334],-.94,.61,cw);
    b.sourcePolygon('archive-carved-crown-and-tutorials-title',cabinet,[[209,168],[268,123],[340,78],[426,55],[519,19],[572,46],[650,61],[736,104],[805,154],[861,168],[861,243],[209,243]],-.91,.52,[314,161,771,221]);
    [510,777,1040,1294].forEach((y,i)=>b.sourceBox('archive-real-shelf-'+i,cabinet,[212,y,858,y+34],-.90,.66,[238,y+2,837,y+27]));
    [[266,385,855,503],[266,650,855,763],[266,912,855,1028],[266,1165,855,1277]].forEach((r,i)=>{
      b.sourceBox('archive-recessed-wood-back-'+i,cabinet,[214,r[1]-102,856,r[3]+7],-1.43,.08,[390,r[1]-97,732,r[1]-24]);
      const centre=(r[1]+r[3])/2,a=cabinet.original(543,centre);const cy=560-a[1]/UNIT,rad=px((r[3]-r[1])*223/1392/2);
      b.tube('archive-curved-silk-tutorial-'+i,cabinet,[[275*135/843+245-145*135/843,cy,-1.04],[804*135/843+245-145*135/843,cy,-1.04]],[rad,rad],cpaper,32);
      for(const [j,x]of [286,805].entries())b.sourceRound('archive-round-scroll-end-'+i+'-'+j,cabinet,x,-1.04,[[centre+(r[3]-r[1])/2,25],[centre+(r[3]-r[1])/2-7,28],[centre-(r[3]-r[1])/2+7,28],[centre-(r[3]-r[1])/2,25]], [278,r[1],313,r[3]],24);
      const tutorial=data?.tutorials?.[i];if(tutorial){label(s,tutorial.label,a[0]/UNIT,cy,-.795,68,25);pick(s,'writing-tutorial-'+tutorial.id,'tutorial',[a[0],a[1],-.80],[px(104),px(30),.28],tutorial.title,{tutorial:tutorial.id},[px(306),.094,.6]);}
    });
    // The original crop ends at SVG548 while this shared stone floor is552.
    // Extend the actual two feet with opaque original post wood. Projecting
    // the archive below its crop would sample transparent atlas pixels.
    const footWood=paint('archive',[165,1275,205,1310],[245,546.7,135,5.3],'archive-opaque-original-wood-contact',{roughness:.78});
    b.box('archive-left-grounded-foot-extension',footWood,[245,546.7,256.4,552],-.91,.64,[165,1275,205,1310]);
    b.box('archive-right-grounded-foot-extension',footWood,[356.9,548,370.6,552],-.91,.64,[165,1275,205,1310]);
    b.sourceBox('archive-bottom-foot-left',cabinet,[146,1320,216,1401],-.91,.64,cw);b.sourceBox('archive-bottom-foot-right',cabinet,[844,1320,929,1409],-.91,.64,cw);
    const sign=paint('finishes',[1465,348,2141,550],[-140,242,150,26],'original-writing-plaque');b.box('writing-wood-label',sign,[-140,242,10,268],-1.24,.075,[1598,410,1991,492]);label(s,'WRITING',-65,255,-1.193,147,45);
    const ropePaint=paint('branches',[57,34,967,854],[-280,184.459,495,376],'writing-fine-hemp',{roughness:.97});
    for(const[i,[x,y]]of [[-116,235.129],[-15,237.419]].entries())b.tube('writing-label-hemp-'+i,ropePaint,[[x,y,-1.3],[x,242,-1.3]],[.004,.004],[129,438,141,460],8);
    const ornamentSpots=[[-90,296],[-34,278],[24,303],[82,282],[142,305],[200,272]],anchors=[231.6883,235.5858,245.2151,243.381,243.1517,246.1273];
    ornamentSpots.forEach(([x,y],i)=>{
      const star=i%2,ornament=paint('details',star?[1398,54,1734,394]:[963,54,1397,394],[x-(star?15:19),y-15,star?30:38,30],'original-'+(star?'paper-star':'paper-crane')+'-'+i,{roughness:.9});
      const group=new THREE.Group();group.name='attached-rope-ornament-'+i;s.root.add(group);const ob=createSolidBuilder(group,resources,s.parts),z=-1.31;
      ob.tube('actual-ornament-hemp-'+i,ropePaint,[[x,anchors[i],z],[x,y-(star?14:0),z]],[.0035,.0035],[129,438,141,460],8);
      if(star){const outline=[];for(let j=0;j<10;j++){const angle=j*Math.PI/5-Math.PI/2,r=j%2?6.2:15;outline.push([x+Math.cos(angle)*r,y+Math.sin(angle)*r]);}ob.polygon('five-point-hanging-paper-star-'+i,ornament,outline,z+.017,.07,[1476,116,1575,311]);}
      else{
        ob.polygon('crane-body-'+i,ornament,[[x-8,y+3],[x,y-4],[x+5,y+2],[x+3,y+12],[x-7,y+14]],z+.022,.1,[1095,226,1210,350]);
        ob.polygon('crane-left-folded-wing-'+i,ornament,[[x-15,y-13],[x-2,y-1],[x-7,y+13]],z+.055,.035,[984,97,1093,258]);
        ob.polygon('crane-right-folded-wing-'+i,ornament,[[x-7,y+9],[x+19,y+12],[x+3,y+3]],z+.038,.035,[1155,251,1379,352]);
        ob.polygon('crane-long-neck-and-head-'+i,ornament,[[x-8,y+9],[x-12,y-2],[x-11,y-7],[x-5,y-8],[x-7,y-3],[x-3,y+3]],z+.044,.043,[1010,125,1122,259]);
        ob.polygon('crane-pointed-tail-'+i,ornament,[[x+1,y+2],[x+12,y-15],[x+7,y+9]],z+.048,.033,[1195,113,1313,285]);
      }
      ob.flush();let flutterUntil=0;const pivot=new THREE.Vector3(px(x),py(anchors[i]),z);group.position.copy(pivot);group.children.forEach(c=>c.position.sub(pivot));animated.push(t=>{const active=performance.now()/1000<flutterUntil;group.rotation.z=Math.sin(t*(active?4:.65)+i)*(active?.075:.025);group.rotation.y=star&&active?Math.sin(t*2.2+i)*.5:Math.sin(t*(active?5:.47)+i*.7)*(active?.15:.026);});
      const ornamentPick=pick(s,'writing-ornament-'+i,star?'star':'crane',[px(x),py(y),z+.06],[px(38),px(35),.20],star?'A little paper star':'A folded paper crane',{ornament:i},[px(x),.094,.62]);ornamentPick.onInteract=()=>{flutterUntil=performance.now()/1000+2.4;};
    });
    const plinth=paint('materials',[38,98,1501,315],[-222,528,616,32],'writing-shared-stone-footing',{roughness:.97});
    b.box('writing-low-solid-stone-platform',plinth,[-222,552,394,560],1.24,4.30,[38,98,1501,315]);
    b.box('writing-rear-screen-footing',plinth,[-213,528,238,552],-1.0,1.9,[38,98,1501,315]);
    b.box('writing-left-back-access-step',plinth,[-257,552,-213,560],-1.0,2.10,[38,98,1501,315]);
    pick(s,'writing-seat','write',[px(14.2),cushionY(529.6),cz],[px(145),px(29)*cushionHeightScale,1.12],'Sit and write',{action:'write'},[px(14.2),.094,1.10]);
    pick(s,'writing-inkstone','ink',[px(139),deskTop+.10,.07],[px(36),.28,.38],'Try the inkstone',{easter:'ink'},[px(139),.094,.74]);
    pick(s,'writing-blogs','blogs',[px(-5),deskTop+.08,-.13],[px(164),.20,.9],'Blogs',{section:'writing-blogs'},[px(-76),.094,.86]);
    (data?.writing||[]).forEach((post,i)=>pick(s,'writing-blog-'+post.id,'blog',[px(-66+i*71),deskTop+.05,-.30],[px(64),.17,.40],post.title,{writing:post.id},[px(-66+i*71),.094,.89]));
    s.root.userData.paper={corners:paperSurface,normal:[0,1,0],centre:[px(3),deskTop+.014,-.03],helloStart:[px(49),deskTop+.018,-.195],helloRows:[{start:[px(49),deskTop+.018,-.195],scale:[.50,.008,.06,.46]},{start:[px(47),deskTop+.018,-.069],scale:[.50,.008,.06,.46]}]};
    s.root.userData.cushion={centre:[px(14.2),cushionY(529.6),cz],seat:[px(41),cushionY(516),cz],radius:px(68),base:cushionBase,height:cushionY(516)-cushionBase};s.root.userData.brushTarget=[px(53),deskTop+.018,-.11];
    collider(s,'writing-tree-trunk',[-3.04,0,-1.72],[-2.43,4.1,-1.10]);
    collider(s,'writing-screen-solid',[px(-204),.38,-1.47],[px(238),2.6,-1.17]);collider(s,'writing-archive-solid',[px(245),.094,-1.56],[px(380),2.77,-.77]);collider(s,'writing-desk-solid',[px(-172),.094,-.92],[px(195),deskTop+.06,.26]);
    area(s,'writing-front-studio',px(-219),px(393),.30,1.24,.094);area(s,'writing-rear-studio',px(-213),px(238),-2.90,-1.0,.376);area(s,'writing-side-passage',px(204),px(244),-2.78,1.24,.094);area(s,'writing-left-low-access-step',px(-257),px(-213),-3.10,-1.0,.094);area(s,'writing-left-exterior-passage',px(-295),px(-257),-3.1,1.25,0);area(s,'writing-ground-arrival',px(-295),px(415),1.25,2.1,0);
    contact(s,px(-241),-1.36,.47,.46,.18);contact(s,px(14.2),cz,.90,.58,.13);finish(s,b);
  }

  async function buildLife(s) {
    s.actionStand=[px(-95),0,1.52];
    const b=createSolidBuilder(s.root,resources,s.parts),house=paint('buildings',[792,583,1521,925],[-371,243,742,317],'original-three-room-life-house');
    const wood=[929,739,1003,783],plaster=[0,0,128,96],stone=[881,908,1040,923],roof=[932,628,1409,674];
    const hStone=role(house,'stone',{roughness:.97}),hRoof=role(house,'weathered-slate',{roughness:.78}),plasterTexture=plasterMicroTile(),plasterSide=role(house,'source-grain-plaster',{roughness:.95}).side;plasterSide.map=plasterTexture;const hPlaster={...house,side:plasterSide,sourceSize:[128,96]};
    b.sourceRoof('life-real-curved-slate-roof',solidRoofPaint(hRoof),[[795,624,661],[812,650,684],[838,650,688],[861,612,687],[877,612,689],[990,616,691],[1130,617,692],[1277,617,691],[1402,613,688],[1439,612,686],[1463,650,686],[1490,651,682],[1518,628,663]],.015,4.55,roof,{hip:[861,1439],rearInset:12});
    b.sourcePolygon('life-left-roof-carved-finial',house,[[860,586],[878,593],[894,596],[891,613],[868,611]],-2.12,.18,roof);b.sourcePolygon('life-right-roof-carved-finial',house,[[1451,586],[1447,609],[1427,613],[1425,597],[1439,593]],-2.12,.18,roof);
    b.sourceBox('life-main-eave-beam',house,[826,690,1485,717],-.10,4.30,wood);
    b.sourceBox('life-room-lintel',house,[858,715,1460,739],-.22,3.87,wood);
    b.sourceBox('life-grounded-stone-platform',hStone,[811,903,1502,925],.15,4.6,stone);
    // Deep room floors have original timber grain, actual open front access,
    // and a separate rear wall, rather than solid boxes occupying the rooms.
    b.sourceBox('life-three-room-wood-floor',house,[842,887,1470,903],-.11,4.28,[1089,883,1224,899]);
    b.sourceBox('life-left-stone-side-wall',hPlaster,[821,717,839,903],-.31,4.00,plaster);b.sourceBox('life-right-stone-side-wall',hPlaster,[1480,717,1499,903],-.31,4.00,plaster);
    [[839,738,1046,888],[1046,738,1267,888],[1267,738,1480,888]].forEach((rect,i)=>{const a=house.original(rect[0],rect[1]),c=house.original(rect[2],rect[3]),svg=[a[0]/UNIT,560-a[1]/UNIT,c[0]/UNIT,560-c[1]/UNIT],wall=createPainter(resources,plasterTexture,[128,96],plaster,[svg[0],svg[1],svg[2]-svg[0],svg[3]-svg[1]],'life-inferred-unoccluded-plaster-room-'+i,{roughness:.95});sideMaterials.push(wall.side);wall.front=wall.side;b.box('life-clean-rear-room-wall-'+i,wall,svg,-3.50,.18,plaster);});
    for(const [i,cx]of [847,1046,1267,1467].entries()){b.sourceRound('life-solid-stone-column-base-'+i,hStone,cx,-.21,[[903,18],[898,19],[888,16],[881,11]],stone,40);b.sourceRound('life-rounded-timber-column-'+i,house,cx,-.21,[[881,11],[740,10],[716,11]],wood,40);}
    for(const[i,[l,r]]of [[867,1030],[1065,1249],[1285,1453]].entries()){
      b.sourceBox('life-room-rear-upper-beam-'+i,house,[l,730,r,747],-3.39,.27,wood);
      b.sourcePolygon('life-left-bracket-'+i,house,[[l,728],[l+33,728],[l+25,743],[l,757]],-.31,.20,wood);b.sourcePolygon('life-right-bracket-'+i,house,[[r-33,728],[r,728],[r,757],[r-25,743]],-.31,.20,wood);
    }
    // Kitchen cupboards are distinct doors, carcasses, worktop and knobs.
    b.sourceBox('life-kitchen-upper-cabinet-body',house,[879,738,1022,795],-2.98,.54,wood);
    [[884,745,928,789],[934,745,977,789],[983,745,1018,789]].forEach((r,i)=>b.sourceBox('life-kitchen-upper-panel-door-'+i,house,r,-2.92,.08,wood));
    b.sourceBox('life-kitchen-lower-cabinet-carcass',house,[881,842,1023,889],-2.63,.94,wood);
    [[887,853,932,880],[937,853,980,880],[986,853,1019,880]].forEach((r,i)=>b.sourceBox('life-kitchen-lower-panel-door-'+i,house,r,-2.56,.07,wood));
    b.sourceBox('life-kitchen-real-worktop',house,[874,829,1024,843],-2.49,1.11,[881,830,1017,836]);
    for(const[i,x]of [924,973,997].entries())b.sourceRound('life-small-brass-cupboard-knob-'+i,house,x,-2.54,[[859,2],[855,2]], [891,850,902,858],14);
    // The central glowing lattice stays at its original visible x/y size.
    b.sourceBox('life-centre-window-recess',nightWindowPaint(house,[1085,750,1235,822],'original-life-warm-lattice-pane'),[1081,746,1239,824],-3.42,.08,[1085,751,1234,819]);
    [[1075,743,1083,829],[1239,743,1247,829],[1081,739,1239,746],[1081,824,1239,832]].forEach((r,i)=>b.sourceBox('life-window-wood-moulding-'+i,house,r,-3.27,.21,wood));
    const latticeCanvas=document.createElement('canvas');latticeCanvas.width=1536;latticeCanvas.height=1024;const latticeContext=latticeCanvas.getContext('2d',{willReadFrequently:true});latticeContext.drawImage(textures.buildings.image,0,0,1536,1024);const latticeData=latticeContext.getImageData(1085,750,150,72).data,latticeStep=quality==='low'?4:3;
    for(let y=0;y<72;y+=latticeStep)for(let x=0;x<150;x+=latticeStep){const index=(Math.min(71,y+1)*150+Math.min(149,x+1))*4,lum=latticeData[index]*.2126+latticeData[index+1]*.7152+latticeData[index+2]*.0722;if(lum<150)b.sourceBox('life-source-derived-carved-lattice-'+x+'-'+y,house,[1085+x,750+y,1085+Math.min(150,x+latticeStep),750+Math.min(72,y+latticeStep)],-3.32,.033,wood);}latticeCanvas.width=latticeCanvas.height=1;
    b.sourceBox('life-right-room-carved-bench-top',house,[1299,838,1437,851],-2.70,.81,wood);b.sourceBox('life-right-room-bench-front-apron',house,[1305,851,1430,863],-2.69,.12,wood);
    for(const[i,x]of [1307,1416].entries())b.sourceBox('life-bench-legged-support-'+i,house,[x,861,x+10,887],-2.72,.51,wood);
    const lifeSign=paint('finishes',[1465,348,2141,550],[-47.5,344,95,26],'original-life-sign');b.box('life-wood-sign',lifeSign,[-47.5,344,47.5,370],-.16,.10,[1598,410,1991,492]);label(s,'LIFE',0,357,-.097,95,42);
    light(s,'life-central-lattice-window',[0,py(427),-3.18],0,5.5).userData.nightIntensity=.78;
    // Attach the light to the actual cabinet underside, using its original
    // source row rather than an approximate display-space height.
    const cabinetUnderside=house.original(950,795)[1];
    light(s,'life-kitchen-under-cabinet-light',[px(-240),cabinetUnderside-.028,-3.04],0,3.0).userData.nightIntensity=.34;const cabinetLamp=new THREE.Mesh(new THREE.BoxGeometry(.56,.018,.16),new THREE.MeshStandardMaterial({color:'#bcac80',emissive:'#ffd293',emissiveIntensity:0,roughness:.72}));cabinetLamp.name='life-hidden-under-cabinet-practical';cabinetLamp.position.set(px(-240),cabinetUnderside-.009,-3.12);s.root.add(cabinetLamp);resources.add(cabinetLamp.geometry);resources.add(cabinetLamp.material);animated.push(()=>{cabinetLamp.material.emissiveIntensity=dark?.38:0;});

    const stove=paint('props',[442,94,700,389],[-278,468,80,92],'original-life-kitchen-stove',{roughness:.57,metalness:.07}),coal=role(stove,'clay-stove',{roughness:.96}),metal=role(stove,'blackened-pot',{roughness:.49,metalness:.16});
    b.sourceRound('life-rounded-clay-stove',coal,570,.09,[[385,77],[371,91],[340,98],[265,108],[246,112]], [466,264,669,299],44);
    b.sourceRound('life-cooking-pot-metal-body',metal,569,.09,[[231,73],[219,91],[194,106],[167,111],[154,104]], [487,164,650,212],44);
    const lidGroup=new THREE.Group();lidGroup.name='life-removable-pot-lid';s.root.add(lidGroup);const lb=createSolidBuilder(lidGroup,resources,s.parts);
    lb.sourceRound('life-real-domed-pot-lid',metal,570,.09,[[159,114],[148,100],[136,73],[124,28],[117,17]], [484,140,653,156],44);lb.sourceRound('life-pot-lid-round-handle',metal,570,.09,[[126,17],[110,12],[102,14],[96,11]], [554,97,581,122],24);lb.flush();
    for(const[i,points]of [[[469,164],[447,151],[445,163],[462,184]],[[672,161],[695,155],[696,171],[678,185]]].entries()){
      const path=points.map(([x,y])=>{const p=stove.original(x,y);return[p[0]/UNIT,560-p[1]/UNIT,.10];});b.tube('life-pot-handle-'+i,metal,path,[.020,.021,.021,.013],[449,153,466,178],14);
    }
    b.sourceBox('life-stove-recessed-coal-opening',coal,[523,300,610,345],.384,.07,[529,303,605,341]);
    for(const[i,x]of [486,650].entries())b.sourcePolygon('life-stove-stable-foot-'+i,metal,[[x,351],[x+19,350],[x+14,384],[x-7,386]],.13,.14,[491,359,506,381]);
    const coalGlow=new THREE.Mesh(new THREE.SphereGeometry(.12,16,10),new THREE.MeshStandardMaterial({color:'#3c2720',emissive:'#ca6027',emissiveIntensity:.14,roughness:1}));coalGlow.scale.set(1,.45,.4);const glowP=stove.original(568,327);coalGlow.position.set(glowP[0],glowP[1],.418);coalGlow.name='original-stove-coals';s.root.add(coalGlow);resources.add(coalGlow.geometry);resources.add(coalGlow.material);light(s,'life-stove-visible-coals',[glowP[0],glowP[1],.48],0,1.8).userData.nightIntensity=.30;
    let cookingUntil=0;const steam=[];
    for(let i=0;i<2;i++){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(px(-245+i*14),py(467),.08),new THREE.Vector3(px(-252+i*14),py(453),.07),new THREE.Vector3(px(-241+i*14),py(440),.10),new THREE.Vector3(px(-245+i*14),py(428),.06)]),g=new THREE.TubeGeometry(curve,18,.009,6,false),m=new THREE.MeshBasicMaterial({color:'#ece6d7',transparent:true,opacity:.11,depthWrite:false}),v=new THREE.Mesh(g,m);v.name='subtle-stove-steam-'+i;s.root.add(v);resources.add(g);resources.add(m);steam.push(v);}
    s.root.userData.setCooking=()=>{cookingUntil=performance.now()/1000+3.5;};animated.push(t=>{const active=performance.now()/1000<cookingUntil;lidGroup.position.y=active?.025+Math.sin(t*4)*.009:0;lidGroup.rotation.z=active?Math.sin(t*4)*.016:0;steam.forEach((v,i)=>{v.position.y=(Math.sin(t*.9+i)+1)*.045;v.material.opacity=(dark?.17:.10)+(active?.04:0);});coalGlow.material.emissiveIntensity=dark?.38:.14;});

    const cushion=opaqueWovenPaint('props',[1083,185,1427,379],[-24,536,94,21],'life-soft-woven-pouf');
    b.round('life-real-soft-woven-cat-cushion',cushion,23,.75,[[560,px(37)],[554,px(46)],[548,px(47)],[541,px(41)],[537,px(27)],[536,0]], [107,88,269,153],52,{continuousProjection:true,smoothNormals:true});
    const cushionPiping=new THREE.Mesh(new THREE.TorusGeometry(px(44),.009,6,64),new THREE.MeshStandardMaterial({color:'#a57265',roughness:.93}));cushionPiping.rotation.x=-Math.PI/2;cushionPiping.position.set(px(23),py(543),.75);cushionPiping.scale.y=.78;cushionPiping.name='original-cat-pouf-sewn-piping';s.root.add(cushionPiping);resources.add(cushionPiping.geometry);resources.add(cushionPiping.material);
    s.root.userData.catSeat={position:[px(23),py(537),.75],front:[px(23),py(537),1.20],radius:px(45),name:'XiaoHei',pose:'sleep'};

    const suitcase=paint('props',[31,89,373,368],[151,493,77,67],'life-original-leather-suitcase',{roughness:.79}),brass=role(suitcase,'aged-brass',{roughness:.41,metalness:.52});
    b.sourcePolygon('life-closed-bevelled-leather-suitcase',suitcase,[[43,135],[340,133],[355,145],[355,348],[342,363],[44,356],[34,345],[34,150]],.42,.39,[348,175,368,318]);
    for(const[i,r]of [[87,136,109,352],[244,136,264,356]].entries())b.sourceBox('life-separate-leather-strap-'+i,suitcase,r,.447,.027,[91,240,106,325]);
    for(const[i,r]of [[86,189,109,227],[244,196,268,233]].entries())b.sourceBox('life-real-brass-buckle-'+i,brass,r,.471,.019,[92,197,106,218]);
    for(const[i,points]of [[[40,151],[52,139],[86,140],[75,162],[44,177]],[[309,140],[338,137],[348,151],[334,175],[318,165]],[[38,325],[63,330],[82,351],[49,355],[36,344]],[[309,337],[340,325],[350,343],[338,361],[313,356]]].entries())b.sourcePolygon('life-aged-brass-suitcase-corner-'+i,brass,points,.453,.03,[313,147,336,166]);
    const handlePoints=[[149,132],[149,107],[179,94],[217,95],[246,108],[249,132]].map(([x,y])=>{const p=suitcase.original(x,y);return[p[0]/UNIT,560-p[1]/UNIT,.20];});b.tube('life-leather-suitcase-carry-handle',suitcase,handlePoints,[.028,.037,.041,.041,.037,.028],[163,104,211,124],20);
    b.sourceBox('life-suitcase-bottom-rest',suitcase,[43,357,342,368],.43,.39,[111,342,230,355]);

    const gallery=paint('gallery',[18,49,1006,1480],[215,384,121,176],'original-life-gallery-screen',{roughness:.77});
    const gw=[72,395,122,994],screen=role(gallery,'linen-projection-screen',{roughness:.96});
    b.sourceBox('gallery-linen-screen',screen,[169,229,847,1144],-.71,.034,[206,296,811,1062]);
    for(const[i,cx]of [102,924].entries())b.sourceRound('gallery-real-carved-round-post-'+i,gallery,cx,-.77,[[1474,72],[1457,72],[1380,45],[1211,37],[266,34],[170,33],[149,49],[119,23],[101,35],[75,26],[52,0]],gw,36);
    for(const[i,y]of [197,1174].entries()){
      const p=gallery.original(169,y),q=gallery.original(847,y);b.tube('gallery-round-horizontal-beam-'+i,gallery,[[p[0]/UNIT,560-p[1]/UNIT,-.77],[q[0]/UNIT,560-q[1]/UNIT,-.77]],[.046,.046], [203,y-19,800,y+19],22);
    }
    b.sourceBox('gallery-left-grounded-carved-foot',gallery,[21,1380,241,1480],-.61,.45,[62,1404,206,1463]);b.sourceBox('gallery-right-grounded-carved-foot',gallery,[777,1380,1006,1480],-.61,.45,[800,1404,954,1463]);
    label(s,'6 CATS',277,536,-.661,57,21);
    // A contact-sheet atlas retains every existing cat's actual photograph.
    const photos=(data?.cats||[]).map(cat=>({src:quality==='low'?cat.photos?.[0]?.replace('images/cats/','images/cats/thumbs/'):cat.photos?.[0],name:cat.name,id:cat.id}));const photoCanvas=document.createElement('canvas');photoCanvas.width=768;photoCanvas.height=676;const pc=photoCanvas.getContext('2d');pc.fillStyle='#dfd7c3';pc.fillRect(0,0,768,676);
    const photoFailures=[];await Promise.all(photos.map((cat,i)=>new Promise(resolve=>{const image=new Image();image.onload=()=>{const x=i%3*256,y=Math.floor(i/3)*338,w=256,h=338,scale=Math.max(w/image.width,h/image.height);pc.save();pc.beginPath();pc.rect(x,y,w,h);pc.clip();pc.drawImage(image,x+(w-image.width*scale)/2,y+(h-image.height*scale)/2,image.width*scale,image.height*scale);pc.restore();resolve();};image.onerror=()=>{photoFailures.push(cat.src);resolve();};image.src=worldAssetURL(cat.src);})));
    const photoTexture=new THREE.CanvasTexture(fitPaintCanvas(photoCanvas,quality));photoTexture.colorSpace=THREE.SRGBColorSpace;resources.add(photoTexture);const photoMaterial=new THREE.MeshBasicMaterial({map:photoTexture,toneMapped:false});photoMaterial.userData.projectedPhoto=true;resources.add(photoMaterial);frontMaterials.push(photoMaterial);const pg=new THREE.PlaneGeometry(px(81),px(107)),photoMesh=new THREE.Mesh(pg,photoMaterial);photoMesh.position.set(px(275.5),py(462.5),-.658);photoMesh.name='original-six-cat-photograph-projection';s.root.add(photoMesh);resources.add(pg);let photoIndex=-1;
    animated.push(t=>{const index=Math.floor(t/2.5)%Math.max(1,photos.length);if(index!==photoIndex){photoIndex=index;const uv=pg.attributes.uv,base=[[0,1],[1,1],[0,0],[1,0]];for(let i=0;i<uv.count;i++)uv.setXY(i,(index%3+base[i][0])/3,1-(Math.floor(index/3)+1-base[i][1])/2);uv.needsUpdate=true;}});
    // The source projector faces the gallery (its paint.js sprite is mirrored).
    const projector=paint('props',[780,12,1031,438],[158,455,-60,105],'life-mirrored-vintage-projector',{roughness:.43,metalness:.24});
    b.sourceBox('life-projector-real-metal-camera-body',projector,[811,151,994,255],.30,.27,[891,166,987,239]);
    const reelCentre=[[861,78,53],[979,145,47]];
    for(const[i,[x,y,r]]of reelCentre.entries()){
      // Closed shallow reel discs and raised perforation/spoke rings.
      const q=projector.original(x,y),radius=Math.abs(r*projector.display[2]/(projector.crop[2]-projector.crop[0]))*UNIT,g=new THREE.CylinderGeometry(radius,radius,.044,40),m=new THREE.Mesh(g,projector.front);m.rotation.x=Math.PI/2;const reelPivot=new THREE.Group();reelPivot.position.set(q[0],q[1],.36);s.root.add(reelPivot);reelPivot.add(m);const uv=g.attributes.uv,pos=g.attributes.position;for(let j=0;j<uv.count;j++){const vx=q[0]+pos.getX(j),vy=q[1]-pos.getZ(j);uv.setXY(j,...projector.uv(vx,vy));}m.name='life-real-projector-film-reel-'+i;resources.add(g);animated.push(t=>{reelPivot.rotation.z=t*(i?-.35:.25);});
    }
    const legs=[[[882,246],[815,433]],[[890,254],[918,434]],[[916,246],[1010,433]]];legs.forEach((pts,i)=>{const path=pts.map(([x,y])=>{const q=projector.original(x,y);return[q[0]/UNIT,560-q[1]/UNIT,i===1?-.02:.24];});b.tube('life-real-projector-tripod-leg-'+i,projector,path,[.024,.031],[837,319,869,383],14);});
    b.sourceBox('life-real-projector-lens-housing',projector,[782,149,839,186],.33,.24,[790,151,812,180]);
    const lensPosition=projector.original(786,167),lens=new THREE.Mesh(new THREE.SphereGeometry(.06,16,8),new THREE.MeshPhysicalMaterial({color:'#efe2ba',roughness:.19,metalness:.05,emissive:'#ffd58b',emissiveIntensity:.12,clearcoat:.7}));lens.scale.set(.35,1,1);lens.position.set(lensPosition[0],lensPosition[1],.30);lens.name='visible-projector-lens';s.root.add(lens);resources.add(lens.geometry);resources.add(lens.material);light(s,'life-visible-projector-lens',[lensPosition[0],lensPosition[1],.30],0,2.4).userData.nightIntensity=.24;
    const beamGeo=new THREE.BufferGeometry();beamGeo.setAttribute('position',new THREE.Float32BufferAttribute([lensPosition[0],lensPosition[1],.31,px(235),py(409),-.652,px(235),py(516),-.652],3));beamGeo.computeVertexNormals();const beamMat=new THREE.MeshBasicMaterial({color:'#efd9a4',transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false}),beam=new THREE.Mesh(beamGeo,beamMat);beam.name='subtle-original-projector-light-beam';s.root.add(beam);resources.add(beamGeo);resources.add(beamMat);animated.push(()=>{beamMat.opacity=dark?.075:.025;lens.material.emissiveIntensity=dark?.30:.08;});
    const cookingPick=pick(s,'life-kitchen-stove','food',[px(-238),py(512),.34],[px(86),px(95),.85],'Cooking',{life:'food'},[px(-238),0,1.27]);cookingPick.onInteract=s.root.userData.setCooking;
    pick(s,'life-xiaohei-cushion','pet',[px(23),py(528),.82],[px(103),px(49),.85],'Pet XiaoHei',{life:'cats'},[px(-65),0,1.55]);
    pick(s,'life-travel-suitcase','travel',[px(190),py(526),.43],[px(80),px(69),.51],'Road trips',{life:'travel'},[px(185),0,1.45]);
    pick(s,'life-six-cat-gallery','gallery',[px(275.5),py(462.5),-.54],[px(83),px(108),.40],'Six cats',{life:'cats'},[px(282),0,1.03]);
    pick(s,'life-vintage-projector','projector',[px(126),py(506),.32],[px(62),px(108),.70],'Play cat memories',{life:'cats'},[px(130),0,1.38]);
    collider(s,'life-rear-wall',[px(-324),.24,-3.68],[px(350),2.7,-3.50]);collider(s,'life-left-wall',[px(-342),.24,-4.14],[px(-323),2.35,-.28]);collider(s,'life-right-wall',[px(329),.24,-4.14],[px(349),2.35,-.28]);
    [847,1046,1267,1467].forEach((x,i)=>{const p=house.original(x,903);collider(s,'life-column-'+i,[p[0]-.17,.24,-.38],[p[0]+.17,2.7,-.04]);});
    collider(s,'life-kitchen-cupboard',[px(-282),.34,-3.60],[px(-125),2.1,-2.47]);collider(s,'life-right-bench',[px(145),.36,-3.49],[px(286),1.02,-2.69]);
    area(s,'life-open-three-room-floor',px(-315),px(314),-3.40,-.11,(560-(243+(887-583)*317/342))/85);area(s,'life-stone-front-threshold',px(-340),px(350),-.11,.15,(560-(243+(903-583)*317/342))/85);area(s,'life-forecourt',px(-372),px(374),.15,2.0,0);
    s.diagnostics.photoFailures=photoFailures;contact(s,px(-238),.09,.6,.45,.17);contact(s,px(23),.75,.63,.50,.18);contact(s,px(190),.20,.54,.45,.16);contact(s,px(126),.14,.42,.43,.17);finish(s,b);s.diagnostics.photoFailures=photoFailures;
  }

  // Preserve the artwork's baked shading and add only low, positioned night
  // spill. The same real PointLights illuminate physical sides and interiors;
  // this modest front response prevents baked-colour surfaces ignoring them.
  const nightUniform={value:0},lampPositions={value:Array.from({length:6},()=>new THREE.Vector3())},lampPower={value:new Float32Array(6)};
  frontMaterials.forEach(material=>{
    if(!material.isMeshBasicMaterial)return;
    material.onBeforeCompile=shader=>{
      shader.uniforms.paintNight=nightUniform;shader.uniforms.paintLampPositions=lampPositions;shader.uniforms.paintLampPower=lampPower;
      shader.vertexShader='varying vec3 vPaintWorld; varying vec3 vPaintNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvPaintWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vPaintNormal=normalize(mat3(modelMatrix)*normal);');
      shader.fragmentShader='uniform float paintNight; uniform vec3 paintLampPositions[6]; uniform float paintLampPower[6]; varying vec3 vPaintWorld; varying vec3 vPaintNormal;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`vec3 paintSpill=vec3(0.0); for(int i=0;i<6;i++){vec3 delta=paintLampPositions[i]-vPaintWorld;float d=length(delta);float facing=max(.23,dot(normalize(vPaintNormal),normalize(delta)));paintSpill+=vec3(1.0,.68,.32)*paintLampPower[i]*facing/(1.0+5.0*d*d);} gl_FragColor.rgb*=vec3(1.0)+paintSpill*paintNight*.72;\n#include <tonemapping_fragment>`);
    };
    material.customProgramCacheKey=()=> 'original-painted-front-positioned-night-spill-v1';material.needsUpdate=true;
  });
  let dark=false;
  function setTheme(value){dark=!!value;frontMaterials.forEach(m=>{m.color.set(dark?(m.userData.projectedPhoto?'#d3cbb1':m.userData.windowPane?'#e8dac3':'#8d98ae'):'#ffffff');if(m.userData.windowPane){m.map=dark?m.userData.nightMap:m.userData.dayMap;m.needsUpdate=true;}});sideMaterials.forEach(m=>m.color.set(dark?'#9299a6':'#c9c3b8'));lights.forEach(l=>{l.intensity=dark?l.userData.nightIntensity:0;});nightUniform.value=dark?1:0;root.updateMatrixWorld(true);lights.slice(0,6).forEach((l,i)=>{l.getWorldPosition(lampPositions.value[i]);lampPower.value[i]=l.userData.chapterRoot.visible?l.intensity:0;});}
  function update(time,dt,nextDark=dark){if(!!nextDark!==dark)setTheme(nextDark);animated.forEach(a=>a(time,dt,dark));root.updateMatrixWorld(true);lights.slice(0,6).forEach((l,i)=>{l.getWorldPosition(lampPositions.value[i]);lampPower.value[i]=l.userData.chapterRoot.visible?l.intensity:0;});}
  setTheme(false);
  const diagnostics={construction:'Original-art projected colour on separate closed 3D architecture and objects.',scaleMetresPerSvgPixel:UNIT,scenes:scenes.map(s=>({id:s.id,...s.diagnostics})),limitations:['The front art contains baked light, deliberately preserved. Rear and interior depths continue the original material palette from source samples.']};
  return {root,scenes,setTheme,update,diagnostics,dispose(){for(const resource of resources)resource.dispose();for(const texture of sharedTextures)releasePaintTexture(texture);root.clear();}};
}
