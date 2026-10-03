import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {acquirePaintTexture,releasePaintTexture,fitPaintCanvas,worldAssetURL} from './fidelity-assets.js';
import {createTreeMaterials} from './fidelity-tree-materials.js';

// Continuous physical scenery, coloured with the same paintings as the 2D
// world. Hidden sides and botanical thickness are authored interpretations.
export async function createFaithfulRiverside({quality='high'}={}) {
  const root=new THREE.Group();root.name='original-painted-riverside-volumes';
  const resources=new Set(),acquired=new Set(),batches=new Map(),interactables=[];
  const low=quality==='low',xMin=-10,xMax=83,waterY=-1.5;
  let dark=false,time=0,triangles=0,visitorX=0;
  const sectorWidth=12,sectors=new Map(),segmentMaterials=new Set();
  const sectorIndex=x=>Math.floor((x-xMin)/sectorWidth);
  function sector(index){if(!sectors.has(index)){const group=new THREE.Group();group.name=`riverside-near-detail-segment-${index}`;root.add(group);sectors.set(index,{group,centre:xMin+(index+.5)*sectorWidth});}return sectors.get(index).group;}
  const random=seed=>{let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};};
  const rng=random(186);
  const [paint,waterPaint,garden,mountains,pine,phragmites]=await Promise.all([
    'materials-painted','water-continuous-painted','garden-painted','mountain-wash','pine','pond-phragmites-painted'
  ].map(name=>acquirePaintTexture(worldAssetURL(`assets/art/${name}.webp`),{quality})));
  [paint,waterPaint,garden,mountains,pine,phragmites].forEach(t=>acquired.add(t));
  const size={paint:[1536,1024],garden:[1774,887],pine:[760,695],reeds:[1024,1536],mountains:[2172,724]};
  function material(Material,options,name){const m=new Material(options);m.name=name;resources.add(m);return m;}
  const stone=material(THREE.MeshStandardMaterial,{map:paint,color:'#c1bdb4',roughness:.94,toneMapped:false},'original-painted-stone-and-paving');
  const bank=material(THREE.MeshStandardMaterial,{map:paint,color:'#c2beb4',roughness:.98,toneMapped:false},'original-painted-continuous-bank');
  const mortar=material(THREE.MeshStandardMaterial,{color:'#756f63',roughness:1,toneMapped:false},'recessed-lime-mortar');
  const flora=material(THREE.MeshStandardMaterial,{map:garden,roughness:.82,side:THREE.DoubleSide,alphaTest:.35,toneMapped:false},'original-leaf-veins');
  // Only one petal's interior veins. A wider crop includes neighbouring
  // overlapping petals and prints their sharp colour wedges on every surface.
  const petalTexture=cropTexture(garden,[200,306,229,352],size.garden,'#c5848a');
  const petals=material(THREE.MeshPhysicalMaterial,{map:petalTexture,color:'#fff0ed',roughness:.6,side:THREE.DoubleSide,clearcoat:.08,toneMapped:false},'original-pink-lotus-petal-grain');
  const botanical=material(THREE.MeshStandardMaterial,{color:'#6c7e50',roughness:.9,toneMapped:false},'living-lotus-and-reed-stems');
  const plume=material(THREE.MeshStandardMaterial,{map:cropTexture(phragmites,[322,92,477,306],size.reeds,'#a7977c'),color:'#bba98d',roughness:.96,toneMapped:false},'phragmites-fine-feathery-panicle');
  const reedLeaf=material(THREE.MeshStandardMaterial,{map:cropTexture(phragmites,[504,942,559,1152],size.reeds,'#647d4c'),color:'#bac594',roughness:.86,side:THREE.DoubleSide,toneMapped:false},'original-phragmites-leaf-grain');
  const pollen=material(THREE.MeshStandardMaterial,{color:'#d6af58',roughness:.83,toneMapped:false},'warm-lotus-pollen');
  const distantFront=material(THREE.MeshBasicMaterial,{map:garden,alphaTest:.22,transparent:true,opacity:.67,toneMapped:false},'original-wash-pavilion-front');
  const distantSide=material(THREE.MeshStandardMaterial,{map:garden,color:'#a39d8c',roughness:.88,transparent:true,opacity:.67,toneMapped:false},'original-wash-pavilion-depth');
  const distantWindow=material(THREE.MeshBasicMaterial,{color:'#ffc990',transparent:true,opacity:.04,toneMapped:false},'distant-warm-window-sources');
  const koiMaterial=material(THREE.MeshBasicMaterial,{map:garden,alphaTest:.20,transparent:true,opacity:.66,toneMapped:false,side:THREE.DoubleSide},'original-kohaku-pigment-under-water');
  [stone,bank,mortar,botanical,plume,reedLeaf].forEach(m=>segmentMaterials.add(m));
  const stoneRect=[38,98,1501,315],bankRect=[38,726,1498,863],rockRect=[46,590,451,805];
  const uvRect=(rect,dims=size.paint)=>{const[l,t,r,b]=rect;return[[l/dims[0],1-b/dims[1]],[r/dims[0],1-b/dims[1]],[r/dims[0],1-t/dims[1]],[l/dims[0],1-t/dims[1]]];};
  function tri(mat,a,b,c,ua,ub,uc,normals){
    triangles++;const index=segmentMaterials.has(mat)?sectorIndex((a[0]+b[0]+c[0])/3):null,key=`${mat.uuid}:${index===null?'background':index}`;
    if(!batches.has(key))batches.set(key,{mat,sector:index,p:[],n:[],uv:[]});const batch=batches.get(key);
    const n=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a))).normalize();
    for(const [i,[p,uv]]of[[a,ua],[b,ub],[c,uc]].entries()){batch.p.push(...p);batch.n.push(...(normals?.[i]||[n.x,n.y,n.z]));batch.uv.push(...uv);}
  }
  const quad=(mat,p,uv,n)=>{tri(mat,p[0],p[1],p[2],uv[0],uv[1],uv[2],n&&[n[0],n[1],n[2]]);tri(mat,p[0],p[2],p[3],uv[0],uv[2],uv[3],n&&[n[0],n[2],n[3]]);};
  function cropTexture(texture,rect,dims,background='#aaa78b'){
    const [l,t,r,b]=rect,canvas=document.createElement('canvas');canvas.width=Math.max(1,r-l);canvas.height=Math.max(1,b-t);
    const cx=canvas.getContext('2d');cx.fillStyle=background;cx.fillRect(0,0,canvas.width,canvas.height);
    cx.drawImage(texture.image,l/dims[0]*texture.image.width,t/dims[1]*texture.image.height,(r-l)/dims[0]*texture.image.width,(b-t)/dims[1]*texture.image.height,0,0,canvas.width,canvas.height);
    const result=new THREE.CanvasTexture(fitPaintCanvas(canvas,quality));result.colorSpace=THREE.SRGBColorSpace;resources.add(result);return result;
  }
  const frontZ=x=>3.2+.055*Math.sin(x*.17)+.027*Math.sin(x*.49);
  const shoreZ=x=>4.3+.11*Math.sin(x*.15+.3)+.045*Math.sin(x*.39);
  function box(mat,l,b,back,r,t,front,rect,dims=size.paint){const a=[l,b,front],bb=[r,b,front],c=[r,t,front],d=[l,t,front],ae=[l,b,back],be=[r,b,back],ce=[r,t,back],de=[l,t,back],uv=uvRect(rect,dims);
    [[a,bb,c,d],[bb,be,ce,c],[ae,a,d,de],[d,c,ce,de],[ae,be,bb,a],[be,ae,de,ce]].forEach(p=>quad(mat,p,uv));}
  function bevelBrick(l,b,r,t,z0,z1,rect){
    const bevel=.009,front=z1;
    const a=[l+bevel,b+bevel,front],bb=[r-bevel,b+bevel,front],c=[r-bevel,t-bevel,front],d=[l+bevel,t-bevel,front];
    const p=[[l,b,front-bevel],[r,b,front-bevel],[r,t,front-bevel],[l,t,front-bevel]],uv=uvRect(rect);
    quad(stone,[a,bb,c,d],uv);for(let i=0;i<4;i++)quad(stone,[[a,bb,c,d][i],[p[i][0],p[i][1],p[i][2]],p[(i+1)%4],[a,bb,c,d][(i+1)%4]],uv);
    const back=p.map(v=>[v[0],v[1],z0]);for(let i=0;i<4;i++)quad(stone,[p[i],back[i],back[(i+1)%4],p[(i+1)%4]],uv);
    quad(stone,[back[1],back[0],back[3],back[2]],uv);
  }
  // Each course is real staggered masonry. Independent original stone crops
  // vary the wear; no single facade or bank photograph stands in for a wall.
  const rows=[{t:0,b:-.16,y:[99,142],j:[38,121,334,549,762,976,1216,1501]},
    {t:-.16,b:-.40,y:[143,210],j:[38,212,427,643,857,1068,1283,1501]},
    {t:-.40,b:-.61,y:[211,270],j:[38,145,356,567,780,995,1208,1426,1501]},
    {t:-.61,b:-.79,y:[271,315],j:[38,225,435,652,865,1078,1298,1501]}];
  let bricks=0,slabs=0;
  rows.forEach((row,ri)=>{for(let x=xMin-(ri%2)*.39;x<xMax;){const w=.71+rng()*.15,riCrop=Math.floor(rng()*(row.j.length-1)),l=Math.max(x,xMin)+.006,r=Math.min(x+w,xMax)-.006;
    if(r-l>.026){bevelBrick(l,row.b+.004,r,row.t-.004,frontZ(x)-.30,frontZ(x)+.024,[row.j[riCrop]+2,row.y[0]+1,row.j[riCrop+1]-2,row.y[1]-1]);bricks++;}x+=w;}});
  // Recessed backing is continuous; the solid bank meets its lower edge.
  for(let x=xMin;x<xMax;x+=1.2){const r=Math.min(x+1.2,xMax);box(mortar,x,-.82,frontZ(x)-.34,r,-.002,frontZ(x)-.02,[0,0,1,1],[1,1]);}
  box(mortar,xMin,-.13,0,xMax,-.012,3.2,[0,0,1,1],[1,1]);
  for(let row=0;row<5;row++){const back=row*3.2/5,front=(row+1)*3.2/5;
    for(let x=xMin-(row%2)*.47;x<xMax;){const w=.85+rng()*.24,l=Math.max(x,xMin)+.006,r=Math.min(x+w,xMax)-.006;
      if(r>l){const idx=Math.floor(rng()*6),rect=[121+idx*213,101,121+idx*213+206,140];box(stone,l,-.095,back+.006,r,0,front-.006,rect);slabs++;}x+=w;}}

  // Bank: a single gently curving, closed rocky shelf. Its upper edge touches
  // masonry; its wet lower edge is submerged, so the layers cannot detach.
  const bankGrid=Math.ceil((xMax-xMin)/(low?.7:.4)),bankNz=8,bankXCoordinates=[];
  for(let i=0;i<=bankGrid;i++)bankXCoordinates.push(xMin+(xMax-xMin)*i/bankGrid);
  // Every mirrored-texture turning point must be an actual mesh edge: a
  // coarse cell straddling a fold otherwise stretches a tiny source strip.
  for(let x=xMin+5.7;x<xMax;x+=5.7)bankXCoordinates.push(x);
  bankXCoordinates.sort((a,b)=>a-b);const bankXs=bankXCoordinates.filter((x,i,a)=>i===0||Math.abs(x-a[i-1])>.00001),bankNx=bankXs.length-1;
  const bankPoint=(i,j)=>{const x=bankXs[i],t=j/bankNz;
    return[x,-.79-.82*t+Math.sin(Math.PI*t)*(.025*Math.sin(x*4.2)+.02*Math.sin(x*7.9)),THREE.MathUtils.lerp(frontZ(x)+.005,shoreZ(x)+.10,t)];};
  const bankUV=p=>{let u=(p[0]-xMin)/5.7;u=1-Math.abs((u%2)-1);const t=THREE.MathUtils.clamp((p[2]-frontZ(p[0]))/(shoreZ(p[0])+.1-frontZ(p[0])),0,1);
    return[(bankRect[0]+u*(bankRect[2]-bankRect[0]))/1536,1-(bankRect[1]+t*(bankRect[3]-bankRect[1]))/1024];};
  for(let i=0;i<bankNx;i++)for(let j=0;j<bankNz;j++){const p=[bankPoint(i,j),bankPoint(i,j+1),bankPoint(i+1,j+1),bankPoint(i+1,j)];quad(bank,p,p.map(bankUV));}
  const bankWallUV=p=>{const u=bankUV(p)[0],t=THREE.MathUtils.clamp((-p[1]-.79)/1.41,0,1);return[u,1-(726+t*137)/1024];};
  for(let i=0;i<bankNx;i++){const a=bankPoint(i,bankNz),b=bankPoint(i+1,bankNz),p=[a,[a[0],-2.2,a[2]],[b[0],-2.2,b[2]],b];quad(bank,p,p.map(bankWallUV));}
  for(let i=0;i<bankNx;i++){const a=bankPoint(i,0),b=bankPoint(i+1,0),c=bankPoint(i+1,bankNz),d=bankPoint(i,bankNz),rear=[[a[0],-2.2,a[2]],a,b,[b[0],-2.2,b[2]]],bottom=[[a[0],-2.2,a[2]],[b[0],-2.2,b[2]],[c[0],-2.2,c[2]],[d[0],-2.2,d[2]]];
    quad(bank,rear,rear.map(bankWallUV));quad(bank,bottom,bottom.map(bankWallUV));}
  for(const i of[0,bankNx])for(let j=0;j<bankNz;j++){const a=bankPoint(i,j),b=bankPoint(i,j+1),p=[a,b,[b[0],-2.2,b[2]],[a[0],-2.2,a[2]]];if(i===0)p.reverse();quad(bank,p,p.map(bankWallUV));}
  // A subdued, continuous soil surface under the original atmospheric wash.
  // River-bank rocks belong on the bank, not repeated across the entire garden.
  const soilCanvas=document.createElement('canvas');soilCanvas.width=512;soilCanvas.height=128;
  const soilContext=soilCanvas.getContext('2d');soilContext.fillStyle='#ded9ca';soilContext.fillRect(0,0,512,128);soilContext.globalAlpha=.022;
  soilContext.drawImage(paint.image,38/1536*paint.image.width,726/1024*paint.image.height,1460/1536*paint.image.width,92/1024*paint.image.height,0,0,512,128);
  const soilMap=new THREE.CanvasTexture(soilCanvas);soilMap.colorSpace=THREE.SRGBColorSpace;soilMap.wrapS=soilMap.wrapT=THREE.RepeatWrapping;resources.add(soilMap);
  const soil=material(THREE.MeshStandardMaterial,{map:soilMap,color:'#b8b4a5',roughness:1,toneMapped:false},'quiet-painted-courtyard-soil');
  // The visible ground extends beyond the walkable chapter bounds, so the
  // wide/orbiting camera never sees a diagonal edge with sky beneath it.
  const soilMin=xMin-32,soilMax=xMax+32;
  for(let x=soilMin;x<soilMax;x+=3){const r=Math.min(x+3,soilMax);quad(soil,[[x,0,-65],[x,0,0],[r,0,0],[r,0,-65]],[[x/6,65/6],[x/6,0],[r/6,0],[r/6,65/6]]);}


  // One connected water surface, with continuous analytical wave normals.
  // Mirrored source sampling plus flowing UV offsets avoids hard tile seams.
  const flowingWater=waterPaint.clone();flowingWater.wrapS=flowingWater.wrapT=THREE.MirroredRepeatWrapping;flowingWater.repeat.set((xMax-xMin)/14,1.03);flowingWater.needsUpdate=true;resources.add(flowingWater);
  const water=material(THREE.MeshPhysicalMaterial,{map:flowingWater,color:'#dde7db',roughness:.32,metalness:.025,clearcoat:.32,clearcoatRoughness:.32,transparent:true,opacity:.92,depthWrite:false,toneMapped:false,
    emissiveMap:flowingWater,emissive:'#738b99',emissiveIntensity:0},'continuous-original-water-with-moving-normals');
  const waveAt=(x,z,t)=>.019*Math.sin(x*1.6+z*.7-t*.65)+.011*Math.sin(x*.8-z*2.1+t*.48);
  const waveUniform={value:0};
  water.onBeforeCompile=shader=>{shader.uniforms.uRiversideTime=waveUniform;
    shader.vertexShader='uniform float uRiversideTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      float tt=uRiversideTime;
      float ddx=.019*1.6*cos(position.x*1.6+position.z*.7-tt*.65)+.011*.8*cos(position.x*.8-position.z*2.1+tt*.48);
      float ddz=.019*.7*cos(position.x*1.6+position.z*.7-tt*.65)-.011*2.1*cos(position.x*.8-position.z*2.1+tt*.48);
      objectNormal=normalize(vec3(-ddx,1.,-ddz));`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float wave=.019*sin(position.x*1.6+position.z*.7-uRiversideTime*.65)+.011*sin(position.x*.8-position.z*2.1+uRiversideTime*.48);
      transformed.y+=wave*smoothstep(0.,.055,uv.y);`);
    shader.fragmentShader='uniform float uRiversideTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec2 flowing=vMapUv+vec2(.018*sin(vMapUv.y*9.+uRiversideTime*.10),.014*sin(vMapUv.x*4.-uRiversideTime*.08));
      diffuseColor*=texture2D(map,flowing);
    #endif`);};
  water.customProgramCacheKey=()=> 'faithful-river-analytical-waves-v1';
  const waterNx=Math.ceil((xMax-xMin)/(low?1:.5)),waterNz=low?16:30,wp=[],wn=[],wu=[],wi=[];
  for(let j=0;j<=waterNz;j++)for(let i=0;i<=waterNx;i++){const x=xMin+(xMax-xMin)*i/waterNx,t=j/waterNz;wp.push(x,waterY,THREE.MathUtils.lerp(shoreZ(x),18,t));wn.push(0,1,0);wu.push(i/waterNx,t);}
  for(let j=0;j<waterNz;j++)for(let i=0;i<waterNx;i++){const a=j*(waterNx+1)+i,b=a+1,c=a+waterNx+2,d=a+waterNx+1;wi.push(a,d,b,b,d,c);}
  const waterGeometry=new THREE.BufferGeometry();waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));waterGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(wn,3));waterGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(wu,2));waterGeometry.setIndex(wi);waterGeometry.computeBoundingSphere();resources.add(waterGeometry);
  const waterMesh=new THREE.Mesh(waterGeometry,water);waterMesh.name='one-connected-moving-river';waterMesh.receiveShadow=true;root.add(waterMesh);

  // Source-derived terrain relief: the wash is draped over real rolling
  // foothills and peaks, not a full-height upright landscape rectangle.
  const mountainCanvas=document.createElement('canvas');mountainCanvas.width=2172;mountainCanvas.height=724;const mc=mountainCanvas.getContext('2d');mc.drawImage(mountains.image,0,0,2172,724);
  let mountainPixels=mc.getImageData(0,0,2172,724).data;
  const skyline=[];for(let x=0;x<2172;x+=6){let top=690;for(let y=170;y<690;y++)if(mountainPixels[(y*2172+x)*4+3]>110){top=y;break;}skyline.push(top);}mountainPixels=null;mountainCanvas.width=mountainCanvas.height=1;
  const mirror=u=>1-Math.abs(((u%2)+2)%2-1);
  const columnTop=u=>{const v=mirror(u)*(skyline.length-1),i=Math.floor(v);return THREE.MathUtils.lerp(skyline[i],skyline[Math.min(i+1,skyline.length-1)],v-i);};
  const ridgeLayers=[{front:-12,crest:-21,back:-31,span:27,phase:.18,height:5.8,opacity:.56},
    {front:-22,crest:-34,back:-45,span:34,phase:.76,height:8.6,opacity:.50},
    {front:-35,crest:-47,back:-58,span:43,phase:1.26,height:11.5,opacity:.40}];
  const ridgeHeight=(x,z,layer)=>{const q=z>layer.crest?(layer.front-z)/(layer.front-layer.crest):(z-layer.back)/(layer.crest-layer.back);if(q<=0)return 0;
    const sourceTop=columnTop((x+18)/layer.span+layer.phase),peak=layer.height*(690-sourceTop)/450;
    return Math.sin(Math.min(q,1)*Math.PI/2)*peak+.065*Math.sin(x*.31)*Math.sin(Math.min(q,1)*Math.PI);};
  const terrainHeight=(x,z)=>Math.max(0,...ridgeLayers.map(l=>ridgeHeight(x,z,l)));
  const ridgeMaterials=[];
  ridgeLayers.forEach((layer,index)=>{const m=material(THREE.MeshBasicMaterial,{map:mountains,transparent:true,opacity:layer.opacity,alphaTest:.02,side:THREE.DoubleSide,toneMapped:false},`original-mountain-wash-relief-${index}`);ridgeMaterials.push(m);
    const nx=low?112:196,nz=low?12:20,p=[],uv=[],ids=[],min=-23,max=98;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=THREE.MathUtils.lerp(min,max,i/nx),z=THREE.MathUtils.lerp(layer.front,layer.back,j/nz),h=ridgeHeight(x,z,layer);
      const u=mirror((x+18)/layer.span+layer.phase),sourceTop=columnTop((x+18)/layer.span+layer.phase),peak=layer.height*(690-sourceTop)/450;
      p.push(x,h,z);uv.push(u,1-(690-THREE.MathUtils.clamp(h/(peak||1),0,1)*(690-sourceTop))/724);}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,d=a+nx+1,c=d+1;ids.push(a,d,b,b,d,c);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();g.computeBoundingSphere();resources.add(g);const mesh=new THREE.Mesh(g,m);mesh.name=`source-painted-physical-ridge-${index}`;root.add(mesh);
  });

  function appendGeometry(geometry,mat,matrix,uvMap){const pos=geometry.attributes.position,uv=geometry.attributes.uv,index=geometry.index;
    const at=i=>new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(matrix);
    const count=index?index.count:pos.count;for(let i=0;i<count;i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k),p=ids.map(id=>at(id).toArray()),tex=ids.map((id,k)=>uvMap?uvMap(p[k],uv?new THREE.Vector2().fromBufferAttribute(uv,id):null):[uv.getX(id),uv.getY(id)]);tri(mat,...p,...tex);}}
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  function tube(name,points,radius,mat,uvMap){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const detail=name==='fine-panicle-branch'?[1,3]:name==='reed-stem'?[6,5]:[low?6:10,low?5:7];
    const g=new THREE.TubeGeometry(curve,detail[0],radius,detail[1],false);appendGeometry(g,mat,new THREE.Matrix4(),uvMap);g.dispose();}

  // An old garden pine has branches in space, not a thickened silhouette.
  // The source painting guides the bent trunk and the unequal, horizontal
  // crown tiers. Its local pigment is sampled by the independent materials;
  // every visible needle, bough and root below is a real closed 3D surface.
  const treeMaterials=createTreeMaterials({sourceTexture:pine,quality});
  const {bark:pineBark,needles:pineNeedles}=treeMaterials;
  treeMaterials.resources.forEach(r=>resources.add(r));
  const pineCanvas=document.createElement('canvas');pineCanvas.width=760;pineCanvas.height=695;
  const pc=pineCanvas.getContext('2d');pc.drawImage(pine.image,0,0,760,695);
  let pinePixels=pc.getImageData(0,0,760,695).data;
  const sourceNeedles=(x,y)=>{const i=(Math.min(694,Math.max(0,Math.floor(y)))*760+Math.min(759,Math.max(0,Math.floor(x))))*4;
    const r=pinePixels[i],g=pinePixels[i+1],b=pinePixels[i+2];
    const annotation=(r>150&&g>145&&b<80)||(r>145&&r>g*1.65&&g<120&&b<100);
    return pinePixels[i+3]>115&&!annotation&&g>=r*.96&&g>=b*.94&&r+g+b>105&&r+g+b<580;};
  const breezeX={value:0},breezeAge={value:0},breezeStrength={value:0};let breezeStart=-100;
  function breeze(point,elapsed=time){const x=Array.isArray(point)?point[0]:point?.x;if(!Number.isFinite(x))return false;
    breezeX.value=x;breezeStart=Number.isFinite(elapsed)?elapsed:time;return true;}
  const needleDepth=material(THREE.MeshDepthMaterial,{depthPacking:THREE.RGBADepthPacking},'spatial-pine-needle-breeze-shadow-depth');
  [pineNeedles,needleDepth].forEach(m=>{m.onBeforeCompile=shader=>{
    shader.uniforms.uPineBreezeX=breezeX;shader.uniforms.uPineBreezeAge=breezeAge;shader.uniforms.uPineBreezeStrength=breezeStrength;
    shader.vertexShader='uniform float uPineBreezeX;\nuniform float uPineBreezeAge;\nuniform float uPineBreezeStrength;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float treeMask=exp(-pow((position.x-uPineBreezeX)/2.0,2.0));
      float needleAnchor=smoothstep(.48,1.45,position.y);
      transformed.x+=.019*sin(uPineBreezeAge*3.6+position.y*1.6)*needleAnchor*treeMask*uPineBreezeStrength;
      transformed.z+=.009*sin(uPineBreezeAge*3.0+position.x*.7)*needleAnchor*treeMask*uPineBreezeStrength;`);
  };m.customProgramCacheKey=()=> 'spatial-pine-fixed-roots-canopy-breeze-v2';});
  const treeSpecs=[[-7.25,-.78,2.75],[17.4,-.95,3.05],[45.15,-1.15,2.3],[79.15,-.95,2.82]],treeRoots=[];
  // Ground-local soft ambient occlusion anchors the fixed roots even outside
  // the visitor's moving sun-shadow frustum. It fades into the soil, has no
  // hard ring edge, and never replaces the directional sun/moon shadows.
  const rootContact=material(THREE.ShaderMaterial,{transparent:true,depthWrite:false,
    uniforms:{uStrength:{value:.30}},
    vertexShader:'varying vec2 vRootUV; void main(){vRootUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform float uStrength; varying vec2 vRootUV; void main(){vec2 p=(vRootUV-.5)*2.;float d=length(p);float fade=1.-smoothstep(.30,1.,d);float grain=.93+.07*sin(p.x*22.+sin(p.y*15.));gl_FragColor=vec4(.13,.12,.095,uStrength*fade*fade*grain);}'},'pine-soft-ground-contact');
  treeSpecs.forEach(([tx,tz,height],i)=>{const g=new THREE.PlaneGeometry(height*.84,height*.68);g.rotateX(-Math.PI/2);resources.add(g);
    const contact=new THREE.Mesh(g,rootContact);contact.name=`pine-root-ground-contact-${i}`;contact.position.set(tx,.003,tz);contact.renderOrder=1;sector(sectorIndex(tx)).add(contact);});
  const pineBatches=new Map();let pineTriangles=0,pineBranchCount=0,pineTuftCount=0,pineNeedleCount=0,pineAttributeBytesBefore=0,pineAttributeBytesAfter=0;
  function pineTriangle(mat,points,normals,uvs,colors){
    const index=sectorIndex((points[0].x+points[1].x+points[2].x)/3),key=`${mat.uuid}:${index}`;
    if(!pineBatches.has(key))pineBatches.set(key,{mat,index,p:[],n:[],uv:[],color:[]});const batch=pineBatches.get(key);
    for(let i=0;i<3;i++){batch.p.push(...points[i].toArray());batch.n.push(...normals[i].toArray());batch.uv.push(...uvs[i]);batch.color.push(...(colors?.[i]||[1,1,1]));}
    pineTriangles++;
  }
  // Parallel transported circular sections follow each curve continuously.
  // Taper, slight radial fluting and smooth normals keep the old bark rounded
  // at side/rear angles; no part of the trunk is an upright wall or alpha card.
  function pineBranch(points,radii,detail,mat=pineBark){
    const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),length=curve.getLength(),frames=curve.computeFrenetFrames(detail.segments,false),rings=[],barkRepeat=Math.max(1,Math.round(Math.max(...radii)*Math.PI*2/.18));
    const radiusAt=t=>{const p=t*(radii.length-1),i=Math.min(radii.length-2,Math.floor(p));return THREE.MathUtils.lerp(radii[i],radii[i+1],p-i);};
    for(let j=0;j<=detail.segments;j++){const t=j/detail.segments,centre=curve.getPointAt(t),radius=radiusAt(t),ring=[];
      for(let k=0;k<=detail.radial;k++){const a=k/detail.radial*Math.PI*2,n=frames.normals[j].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[j],Math.sin(a)).normalize();
        const rib=1+.035*Math.sin(a*5+t*2.7)+.018*Math.sin(a*9-t*3.1);ring.push({p:centre.clone().addScaledVector(n,radius*rib),n,uv:[k/detail.radial*barkRepeat,t*length/.18]});}rings.push(ring);}
    for(let j=0;j<detail.segments;j++)for(let k=0;k<detail.radial;k++){const a=rings[j][k],b=rings[j][k+1],c=rings[j+1][k+1],d=rings[j+1][k];
      pineTriangle(mat,[a.p,b.p,d.p],[a.n,b.n,d.n],[a.uv,b.uv,d.uv]);pineTriangle(mat,[b.p,c.p,d.p],[b.n,c.n,d.n],[b.uv,c.uv,d.uv]);}
    for(const end of[0,detail.segments]){const centre=curve.getPointAt(end/detail.segments),n=frames.tangents[end].clone().multiplyScalar(end===0?-1:1),ring=rings[end];
      for(let k=0;k<detail.radial;k++){const order=end===0?[ring[k+1],ring[k]]:[ring[k],ring[k+1]];pineTriangle(mat,[centre,...order.map(v=>v.p)],[n,n,n],[[.5,.5],...order.map(v=>v.uv)]);}}
    pineBranchCount++;return curve;
  }
  function needle(origin,axis,length,width,rand){
    const up=Math.abs(axis.y)<.93?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),u=axis.clone().cross(up).normalize(),v=axis.clone().cross(u).normalize();
    const bend=u.clone().multiplyScalar((rand()-.5)*length*.16).addScaledVector(v,length*.05),tip=origin.clone().addScaledVector(axis,length).add(bend),ring=[];
    const value=.88+rand()*.17,green=.98+rand()*.035,col=[value,Math.min(1.05,value*green),value*.96],radial=3;
    for(let k=0;k<radial;k++){const a=k/radial*Math.PI*2,n=u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v,Math.sin(a)).normalize();ring.push({p:origin.clone().addScaledVector(n,width),n});}
    for(let k=0;k<radial;k++){const a=ring[k],b=ring[(k+1)%radial];
      pineTriangle(pineNeedles,[a.p,b.p,tip],[a.n,b.n,axis],[[k/radial,0],[(k+1)/radial,0],[.5,1]],[col.map(c=>c*.92),col.map(c=>c*.92),col.map(c=>c*1.02)]);
    }
    const bottomNormal=axis.clone().negate();pineTriangle(pineNeedles,[ring[2].p,ring[1].p,ring[0].p],[bottomNormal,bottomNormal,bottomNormal],[[1,0],[.5,0],[0,0]],[col,col,col]);pineNeedleCount++;
  }
  // A dense shoot interior is an asymmetric, branch-swept needle bundle,
  // not a sphere or a thickened copy of the painted tree. Short real needles
  // emerge from its lobed surface. Keeping these small bundle interiors at
  // both quality tiers preserves cloud-shaped crown mass on a small screen.
  function needleBundle(origin,axis,length,radius,rand){
    const up=Math.abs(axis.y)<.93?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),u=axis.clone().cross(up).normalize(),v=axis.clone().cross(u).normalize(),segments=low?3:4,radial=low?5:8;
    const phase=rand()*6.283,lean=(rand()-.5)*radius*.55,ring=[],color=[.97,.99,.965].map(c=>c*(.94+rand()*.08));
    function sample(t,a){const envelope=Math.pow(Math.max(.00001,Math.sin(Math.PI*t)),.72),r=Math.max(radius*.012,radius*envelope*(1+.11*Math.sin(a*3+phase+t*2.3)+.055*Math.sin(a*7-phase+t*3.7)));
      return origin.clone().addScaledVector(axis,t*length).addScaledVector(u,lean*Math.sin(Math.PI*t)+Math.cos(a)*r).addScaledVector(v,radius*.12*Math.sin(t*Math.PI*2)+Math.sin(a)*r);}
    for(let j=0;j<=segments;j++){const t=j/segments,row=[];for(let k=0;k<=radial;k++){const a=k/radial*Math.PI*2,p=sample(t,a),du=sample(t,a+.003).sub(sample(t,a-.003)),dt=sample(Math.min(1,t+.003),a).sub(sample(Math.max(0,t-.003),a)),n=du.cross(dt).normalize();row.push({p,n,uv:[k/radial,t]});}ring.push(row);}
    for(let j=0;j<segments;j++)for(let k=0;k<radial;k++){const a=ring[j][k],b=ring[j][k+1],c=ring[j+1][k+1],d=ring[j+1][k];pineTriangle(pineNeedles,[a.p,b.p,d.p],[a.n,b.n,d.n],[a.uv,b.uv,d.uv],[color,color,color]);pineTriangle(pineNeedles,[b.p,c.p,d.p],[b.n,c.n,d.n],[b.uv,c.uv,d.uv],[color,color,color]);}
    for(const j of[0,segments]){const t=j/segments,centre=origin.clone().addScaledVector(axis,t*length),n=axis.clone().multiplyScalar(j===0?-1:1);for(let k=0;k<radial;k++){const endpoints=j===0?[ring[j][k+1],ring[j][k]]:[ring[j][k],ring[j][k+1]];pineTriangle(pineNeedles,[centre,...endpoints.map(p=>p.p)],[n,n,n],[[.5,t],...endpoints.map(p=>p.uv)],[color,color,color]);}}
    return{sample,u,v};
  }
  const crownRegions=[
    {rect:[36,12,305,166],count:36,path:[[326,130,.012],[281,111,-.025],[211,103,-.070],[99,131,-.12]],radius:[.037,.029,.018,.007],depth:.145},
    {rect:[278,5,532,170],count:34,path:[[327,139,.012],[352,83,.055],[417,91,.10],[472,110,.15]],radius:[.032,.024,.016,.006],depth:.155},
    {rect:[0,163,318,334],count:41,path:[[287,281,-.018],[232,244,.02],[165,231,.075],[63,249,.125]],radius:[.049,.038,.024,.008],depth:.205},
    {rect:[316,163,712,323],count:48,path:[[294,287,-.010],[373,248,-.075],[455,240,-.12],[567,265,-.14],[653,280,-.19]],radius:[.050,.039,.029,.015,.006],depth:.215},
    {rect:[0,332,305,506],count:42,path:[[249,421,.02],[204,400,-.050],[146,412,-.10],[59,446,-.145]],radius:[.053,.040,.022,.007],depth:.185},
    {rect:[304,320,759,512],count:55,path:[[255,421,.015],[343,389,.080],[450,368,.14],[547,384,.19],[666,426,.215]],radius:[.063,.050,.032,.019,.007],depth:.245}
  ];
  // Cover the painted crown's needle-bearing area evenly. Random isolated
  // end shoots can leave large holes inside a layer, even with the same
  // triangle budget. A deterministic farthest-point layout keeps the source
  // crown's unequal cloud silhouette and lets neighbouring short fans overlap.
  const crownLayouts=crownRegions.map(region=>{
    const [l,t,r,b]=region.rect,cx=(l+r)/2,cy=(t+b)/2,rx=(r-l)/2,ry=(b-t)/2,candidates=[];
    for(let y=t+3;y<b;y+=6)for(let x=l+3;x<r;x+=6)if(sourceNeedles(x,y)&&((x-cx)/rx)**2+((y-cy)/ry)**2<1.16)candidates.push([x,y]);
    const target=region.count*2,selected=[],distances=new Float64Array(candidates.length).fill(Infinity);let next=0,centreDistance=Infinity;
    candidates.forEach((p,i)=>{const d=(p[0]-cx)**2+(p[1]-cy)**2;if(d<centreDistance){centreDistance=d;next=i;}});
    for(let j=0;j<target;j++){const chosen=candidates[next]||[cx,cy];selected.push(chosen);let farthest=-1;
      for(let k=0;k<candidates.length;k++){const p=candidates[k],d=(p[0]-chosen[0])**2+(p[1]-chosen[1])**2;distances[k]=Math.min(distances[k],d);if(distances[k]>farthest){farthest=distances[k];next=k;}}
    }return selected;
  });
  function branchDepthAt(region,x){let best=Infinity,depth=region.path[0][2];for(let i=1;i<region.path.length;i++){const a=region.path[i-1],b=region.path[i],t=THREE.MathUtils.clamp((x-a[0])/(b[0]-a[0]||1),0,1),d=Math.abs(x-THREE.MathUtils.lerp(a[0],b[0],t));if(d<best){best=d;depth=THREE.MathUtils.lerp(a[2],b[2],t);}}return depth;}
  treeSpecs.forEach(([tx,tz,height],ti)=>{
    const s=height/695,yaw=[-.13,.08,.20,-.09][ti],cos=Math.cos(yaw),sin=Math.sin(yaw),depthScale=[1.02,.92,1.10,.98][ti];
    const P=(px,py,z)=>{const x=(px-400)*s,depth=z*height*depthScale;return new THREE.Vector3(tx+x*cos-depth*sin,(695-py)*s,tz+x*sin+depth*cos);};
    const trunkSource=[[401,695,0],[416,645,.01],[434,590,.015],[423,548,-.012],[365,503,-.032],[283,457,-.018],[242,407,.01],[254,351,.025],[280,301,-.012],[307,257,-.025],[283,204,.008],[302,151,.022],[330,104,.013],[352,55,.018],[350,29,.008]];
    const trunkRadii=[.077,.065,.056,.052,.050,.047,.043,.037,.032,.028,.021,.016,.012,.007,.002].map(r=>r*height);
    pineBranch(trunkSource.map(p=>P(...p)),trunkRadii,{segments:low?40:64,radial:low?10:14});
    // Buttress roots fan out along the paving/soil plane; their lower surfaces
    // intentionally enter that plane instead of leaving a floating gap.
    const roots=[[[401,683,0],[356,681,.035],[293,690,.090],[245,695,.135]],[[409,684,0],[451,681,-.02],[490,691,-.11],[540,695,-.18]],[[402,682,-.005],[391,688,-.10],[362,695,-.235]],[[407,683,.015],[427,691,.125],[450,695,.255]],[[399,685,0],[369,690,.04],[341,695,.14]]];
    roots.forEach((path,i)=>pineBranch(path.map(p=>P(...p)),[.045,.034,.020,.004].map(r=>r*height),{segments:low?10:16,radial:low?7:10}));
    let tuftCount=0,needleCountBefore=pineNeedleCount;
    crownRegions.forEach((region,ri)=>{
      const bough=pineBranch(region.path.map(p=>P(...p)),region.radius.map(r=>r*height*.42),{segments:low?18:26,radial:low?8:10});
      const [l,t,r,b]=region.rect,cx=(l+r)/2,cy=(t+b)/2,rx=(r-l)/2,ry=(b-t)/2,target=region.count*2;
      for(let i=0;i<target;i++){
        const tuftRand=random(7631+ti*7717+ri*1831+i*191);
        let [px,py]=crownLayouts[ri][i];const jx=px+(tuftRand()-.5)*4,jy=py+(tuftRand()-.5)*4;if(sourceNeedles(jx,jy)){px=jx;py=jy;}
        const ellipse=Math.sqrt(Math.max(.10,1-Math.min(.9,((px-cx)/rx)**2*.65+((py-cy)/ry)**2*.28))),sourceDepth=branchDepthAt(region,px),depthOffset=region.depth*.55*ellipse*Math.sin(px*.027+py*.035+ri*.41)+(tuftRand()-.5)*.035;
        const p=P(px,py,sourceDepth+depthOffset),probeCount=24;let closest=bough.getPointAt(0),nearest=Infinity,at=0;
        for(let k=0;k<=probeCount;k++){const candidate=bough.getPointAt(k/probeCount),d=p.distanceToSquared(candidate);if(d<nearest){nearest=d;closest=candidate;at=k/probeCount;}}
        const twigDirection=p.clone().sub(closest).normalize(),tangent=bough.getTangentAt(at),mid=closest.clone().lerp(p,.57).addScaledVector(tangent,height*.014).add(new THREE.Vector3(0,height*.010,0));
        const twigRadius=height*(.0015+tuftRand()*.0011),shoot=p.clone().addScaledVector(twigDirection,height*.018).add(new THREE.Vector3(0,height*.013,0));
        pineBranch([closest,mid,shoot],[twigRadius,twigRadius*.6,height*.00055],{segments:low?3:5,radial:low?4:5});
        const axis=twigDirection.clone().multiplyScalar(.52).addScaledVector(tangent,.48).add(new THREE.Vector3(0,.22,0)).normalize(),bundle=needleBundle(shoot.clone().addScaledVector(axis,-height*.020),axis,height*.037,height*(.0085+tuftRand()*.0014),tuftRand),count=low?20:40;
        for(let k=0;k<count;k++){const along=.09+(k+.3)/count*.82,angle=k*2.399963+tuftRand()*.24,radial=bundle.u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(bundle.v,Math.sin(angle)),direction=axis.clone().multiplyScalar(.88+along*.22).addScaledVector(radial,.70+tuftRand()*.18).normalize();
          const origin=bundle.sample(along,angle),length=height*(.020+tuftRand()*.012)*(1-.11*along),width=height*(low?.00116:.00102);
          needle(origin,direction,length,width,tuftRand);}
        tuftCount++;pineTuftCount++;
      }
    });
    treeRoots.push({x:tx,z:tz,y:0,height,style:'branch-supported-spatial-pine',rooted:true,tufts:tuftCount,needles:pineNeedleCount-needleCountBefore,yaw});
    const pickGeometry=new THREE.BoxGeometry(height*1.12,height,height*.76);resources.add(pickGeometry);const invisible=material(THREE.MeshBasicMaterial,{transparent:true,opacity:0,depthWrite:false},`tree-pick-${ti}`);invisible.visible=false;
    const pick=new THREE.Mesh(pickGeometry,invisible);pick.position.set(tx,height/2,tz);pick.name=`grounded-tree-${ti}`;root.add(pick);
    interactables.push({id:`pine-${ti}`,type:'tree',object:pick,point:[tx,height*.62,tz],stand:[tx,0,1.15],title:'A moment under the pine'});
  });
  for(const batch of pineBatches.values()){
    const expanded=new THREE.BufferGeometry();expanded.setAttribute('position',new THREE.Float32BufferAttribute(batch.p,3));expanded.setAttribute('normal',new THREE.Float32BufferAttribute(batch.n,3));expanded.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));expanded.setAttribute('color',new THREE.Float32BufferAttribute(batch.color,3));
    pineAttributeBytesBefore+=Object.values(expanded.attributes).reduce((sum,a)=>sum+a.array.byteLength,0);
    // Weld shared attribute-identical vertices, retaining all normal, colour
    // and UV seams. This indexes the same surfaces without reducing detail.
    const g=mergeVertices(expanded,1e-6);expanded.dispose();g.computeBoundingSphere();resources.add(g);
    pineAttributeBytesAfter+=Object.values(g.attributes).reduce((sum,a)=>sum+a.array.byteLength,0)+(g.index?.array.byteLength||0);
    const mesh=new THREE.Mesh(g,batch.mat);mesh.name=`spatial-pine-${batch.mat===pineBark?'bark-and-supporting-branches':'individual-needle-bundles'}-segment-${batch.index}`;mesh.castShadow=true;mesh.receiveShadow=true;if(batch.mat===pineNeedles)mesh.customDepthMaterial=needleDepth;sector(batch.index).add(mesh);
    batch.p.length=batch.n.length=batch.uv.length=batch.color.length=0;
  }
  pinePixels=null;pineCanvas.width=pineCanvas.height=1;
  // These two source sheets only author independent crop/canvas textures.
  // Retaining their full decoded images serves no live material afterwards.
  for(const sourceSheet of[pine,phragmites]){acquired.delete(sourceSheet);releasePaintTexture(sourceSheet);}

  // True petal surfaces, raised lotus stems and notched floating leaf discs.
  // Day opening and night folding rotate petals about their own bases.
  function petalGeometry(){const g=new THREE.BufferGeometry(),p=[],uv=[],ids=[],nx=low?6:8,ny=low?14:18;
    // Gentle transverse cupping lifts the rims once open, instead of making
    // each petal a broad flat triangle. The closed bud keeps the same outline.
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const t=j/ny,s=i/nx*2-1,w=.12*Math.pow(Math.sin(Math.PI*t),.68);p.push(s*w,.37*t,.062*Math.sin(t*Math.PI)+.025*t-.045*s*s*Math.sin(Math.PI*t));uv.push(i/nx,t);}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,d=a+nx+1,c=d+1;ids.push(a,b,d,b,c,d);}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();const n=g.attributes.normal;
    for(const row of[0,ny]){const average=new THREE.Vector3();for(let i=0;i<=nx;i++)average.add(new THREE.Vector3().fromBufferAttribute(n,row*(nx+1)+i));average.normalize();for(let i=0;i<=nx;i++)n.setXYZ(row*(nx+1)+i,average.x,average.y,average.z);}
    resources.add(g);return g;}
  const petalGeo=petalGeometry(),flowerSpecs=[];
  for(let x=-6;x<xMax;x+=7.9){const raised=flowerSpecs.length%2===0;flowerSpecs.push({x:x+rng()*1.2,z:shoreZ(x)+.72+rng()*.7,raised,y:raised?waterY+.70:waterY+.07,scale:.76+rng()*.26,phase:rng()*6.28});}
  function partitionInstances(geometry,mat,xs,name){const partitions=new Map(),references=new Array(xs.length);
    xs.forEach((x,i)=>{const index=sectorIndex(x);if(!partitions.has(index))partitions.set(index,[]);partitions.get(index).push(i);});
    const meshes=[];for(const[index,ids]of partitions){const mesh=new THREE.InstancedMesh(geometry,mat,ids.length);mesh.name=`${name}-segment-${index}`;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;sector(index).add(mesh);resources.add(mesh);meshes.push(mesh);ids.forEach((sourceIndex,j)=>references[sourceIndex]={mesh,index:j});}
    return{setMatrixAt(index,matrix){const ref=references[index];ref.mesh.setMatrixAt(ref.index,matrix);},commit(){meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);},bounds(){meshes.forEach(m=>{m.computeBoundingSphere();m.boundingSphere.radius+=.09;});},segments:meshes.length};
  }
  const petalCount=flowerSpecs.length*26,petalMesh=partitionInstances(petalGeo,petals,flowerSpecs.flatMap(f=>Array(26).fill(f.x)),'individual-opening-lotus-petals');
  const padGeo=new THREE.BufferGeometry(),padP=[],padUV=[],padI=[],padSegments=54;
  padP.push(0,.004,0);padUV.push((1027)/1774,1-(222)/887);
  for(let i=0;i<=padSegments;i++){const a=.11+(Math.PI*2-.22)*i/padSegments,r=.40*(1+.023*Math.sin(a*7));const x=Math.sin(a)*r,z=Math.cos(a)*r;
    padP.push(x,.016*Math.sin(a*3)+.010,z);padUV.push((1027+x/.40*151)/1774,1-(222+z/.40*112)/887);if(i>0)padI.push(0,i,i+1);}
  padGeo.setAttribute('position',new THREE.Float32BufferAttribute(padP,3));padGeo.setAttribute('uv',new THREE.Float32BufferAttribute(padUV,2));padGeo.setIndex(padI);padGeo.computeVertexNormals();resources.add(padGeo);
  const padSpecs=[];flowerSpecs.forEach(f=>{for(let i=0;i<3;i++)padSpecs.push({x:f.x+(i-1)*.49,z:f.z+.33+(i%2)*.30,scale:.52+rng()*.35,phase:f.phase+i*1.3});});
  const pads=new THREE.InstancedMesh(padGeo,flora,padSpecs.length);pads.name='real-notched-floating-leaf-discs';pads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);pads.frustumCulled=false;root.add(pads);resources.add(pads);
  const stemGeo=new THREE.CylinderGeometry(.014,.021,1,8);resources.add(stemGeo);
  const stems=new THREE.InstancedMesh(stemGeo,botanical,flowerSpecs.length);stems.name='lotus-stems-rooted-below-water';stems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(stems);resources.add(stems);
  const pollenGeo=new THREE.SphereGeometry(.056,12,8);resources.add(pollenGeo);const hearts=new THREE.InstancedMesh(pollenGeo,pollen,flowerSpecs.length);hearts.name='volumetric-lotus-hearts';root.add(hearts);resources.add(hearts);
  const flowerPickGeo=new THREE.SphereGeometry(.4,10,6);resources.add(flowerPickGeo);const pickMat=material(THREE.MeshBasicMaterial,{transparent:true,opacity:0,depthWrite:false},'aquatic-pick-volumes');pickMat.visible=false;
  flowerSpecs.forEach((f,i)=>{matrix.compose(new THREE.Vector3(f.x,(f.y+waterY-.16)/2,f.z),new THREE.Quaternion(),new THREE.Vector3(1,f.y-waterY+.16,1));stems.setMatrixAt(i,matrix);
    const pick=new THREE.Mesh(flowerPickGeo,pickMat);pick.position.set(f.x,f.y+.12,f.z);root.add(pick);interactables.push({id:`lotus-${i}`,type:'lotus',title:f.raised?'A pink lotus':'A water lily',object:pick,point:[f.x,f.y,f.z],stand:[f.x,0,2.2]});});

  // Phragmites has branching airy panicles and long ribbon leaves. It is not
  // represented by wheat ears or by the complete flat source photograph.
  const reedSpecs=[];
  for(let x=-8.5;x<xMax;x+=6.8)reedSpecs.push({x:x+rng()*.55,z:shoreZ(x)+.24+rng()*.35,phase:rng()*6.28});
  let reedBlades=0,reedPanicleBranches=0;
  reedSpecs.forEach((clump,ci)=>{for(let s=0;s<5;s++){const bx=clump.x+(rng()-.5)*.35,bz=clump.z+(rng()-.5)*.21,h=.92+rng()*.64,lean=(rng()-.5)*.24;
    tube('reed-stem',[[bx,waterY-.14,bz],[bx+lean*.2,waterY+h*.45,bz+.01],[bx+lean,waterY+h,bz+.03]],.008,botanical,()=>[.5,.5]);
    for(let k=0;k<5;k++){const leafY=waterY+.11+k*h*.16,length=.35+rng()*.29,side=(k+s)%2?1:-1,angle=(s*1.27+k*.61);const dx=Math.cos(angle)*side,dz=Math.sin(angle)*side,p=[],uv=[],ids=[];
      for(let j=0;j<=12;j++){const t=j/12,width=.038*Math.sin(t*Math.PI),centre=new THREE.Vector3(bx+dx*length*t,leafY+.20*Math.sin(t*Math.PI)-.22*t*t,bz+dz*length*t);
        const cross=new THREE.Vector3(-dz,0,dx).multiplyScalar(width);p.push(...centre.clone().sub(cross).toArray(),...centre.clone().add(cross).toArray());uv.push(0,t,1,t);if(j<12){const a=j*2;ids.push(a,a+1,a+2,a+1,a+3,a+2);}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);appendGeometry(g,reedLeaf,new THREE.Matrix4());g.dispose();reedBlades++;}
    // Sparse individual feathery spikelets form a loose open plume.
    for(let k=0;k<13;k++){const t=k/13,cy=waterY+h-.11+t*.31,reach=.115*(1-t)+.025;for(const side of[-1,1]){
      const a=[bx+lean,cy,bz+.03],b=[bx+lean+side*reach,cy+.032,bz+.03+Math.sin(k*1.7+s)*reach*.56];tube('fine-panicle-branch',[a,b],.0035,plume,()=>[.5,THREE.MathUtils.clamp(t,.05,.95)]);reedPanicleBranches++;}}
  }});
  const windUniform={value:0};
  [botanical,reedLeaf,plume].forEach(m=>{m.onBeforeCompile=shader=>{shader.uniforms.uRiversideWind=windUniform;shader.vertexShader='uniform float uRiversideWind;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifndef USE_INSTANCING
      float anchor=clamp((position.y+1.5)/1.7,0.,1.);
      transformed.x+=.025*sin(uRiversideWind*.72+position.x*.34)*anchor*anchor;
      transformed.z+=.014*sin(uRiversideWind*.58+position.x*.29)*anchor*anchor;
      #endif`);};m.customProgramCacheKey=()=> 'rooted-reed-wind-v1';});

  // Four distant buildings stand on the real hillside. Separate carved
  // roofs, wall rooms and platforms carry the original tiny pavilion art.
  const distantLights=[],distantSites=[];
  function distantBuilding(x,z,tower,h){const rect=tower?[1356,478,1545,828]:[1546,587,1762,829],w=h*(rect[2]-rect[0])/(rect[3]-rect[1]);
    const corners=[[x-w*.52,z+.025],[x+w*.52,z+.025],[x+w*.52,z-.92],[x-w*.52,z-.92]],base=Math.max(terrainHeight(x,z),terrainHeight(x,z-.46),...corners.map(([xx,zz])=>terrainHeight(xx,zz)))+.008;
    // The platform rests on a matching rounded terrain mound rather than a
    // square chunk of river-bank rock apparently suspended in the mountain.
    const supportMat=ridgeMaterials[0],rings=4,segments=24;
    const supportPoint=(ring,k)=>{const a=k/segments*Math.PI*2,radius=THREE.MathUtils.lerp(w*.42,w*1.16,ring/rings);
      const xx=x+Math.sin(a)*radius,zz=z-.43+Math.cos(a)*radius*.73;
      return[xx,THREE.MathUtils.lerp(base+.012,terrainHeight(xx,zz)-.012,ring/rings),zz];};
    const supportUV=([xx,h,zz])=>{const layer=ridgeLayers.reduce((best,l)=>ridgeHeight(xx,zz,l)>ridgeHeight(xx,zz,best)?l:best,ridgeLayers[0]),u=mirror((xx+18)/layer.span+layer.phase),sourceTop=columnTop((xx+18)/layer.span+layer.phase),peak=layer.height*(690-sourceTop)/450;
      return[u,1-(690-THREE.MathUtils.clamp(h/(peak||1),0,1)*(690-sourceTop))/724];};
    for(let ring=0;ring<rings;ring++)for(let k=0;k<segments;k++){const p=[supportPoint(ring,k),supportPoint(ring+1,k),supportPoint(ring+1,k+1),supportPoint(ring,k+1)];quad(supportMat,p,p.map(supportUV));}
    const centre=[x,base+.012,z-.43];for(let k=0;k<segments;k++){const a=supportPoint(0,k),b=supportPoint(0,k+1);tri(supportMat,centre,a,b,supportUV(centre),supportUV(a),supportUV(b));}
    const X=px=>x+(px-(rect[0]+rect[2])/2)/(rect[2]-rect[0])*w,Y=py=>base+(rect[3]-py)/(rect[3]-rect[1])*h;
    const uv=p=>[(rect[0]+(p[0]-x+w/2)/w*(rect[2]-rect[0]))/1774,1-(rect[3]-(p[1]-base)/h*(rect[3]-rect[1]))/887];
    function part(r,front,depth,mat=distantFront){const[l,t,rr,b]=r,p=[[X(l),Y(b),front],[X(rr),Y(b),front],[X(rr),Y(t),front],[X(l),Y(t),front]],back=p.map(p=>[p[0],p[1],p[2]-depth]);quad(mat,p,p.map(uv));
      quad(distantSide,[back[1],back[0],back[3],back[2]],uvRect([1597,721,1678,771],size.garden));for(let i=0;i<4;i++)quad(distantSide,[p[i],back[i],back[(i+1)%4],p[(i+1)%4]],uvRect([1597,721,1678,771],size.garden));}
    function roof(r){const[l,t,rr,b]=r,centre=(l+rr)/2,outline=[[l,b-13],[l+5,b],[rr-5,b],[rr,b-13],[rr-16,b-5],[centre,t],[l+16,b-5]],depth=w*.56;
      const front=outline.map(([px,py])=>[X(px),Y(py),z-(b-py)/(b-t)*depth]);const shape=front.map(p=>new THREE.Vector2(p[0],p[1]));if(THREE.ShapeUtils.isClockWise(shape)){shape.reverse();front.reverse();}
      for(const ids of THREE.ShapeUtils.triangulateShape(shape,[])){const p=ids.map(i=>front[i]);tri(distantFront,...p,...p.map(uv));tri(distantSide,[p[2][0],p[2][1],p[2][2]-.07],[p[1][0],p[1][1],p[1][2]-.07],[p[0][0],p[0][1],p[0][2]-.07],...p.map(uv).reverse());}
      front.forEach((a,i)=>{const b=front[(i+1)%front.length];quad(distantSide,[a,[a[0],a[1],a[2]-.07],[b[0],b[1],b[2]-.07],b],[uv(a),uv(a),uv(b),uv(b)]);});}
    if(tower){[[1358,478,1544,570],[1358,580,1544,645],[1358,670,1544,710]].forEach(roof);[[1392,565,1511,601],[1392,633,1511,677],[1393,706,1510,793]].forEach(r=>part(r,z-.17,.57));part([1365,792,1540,828],z+.02,.86);}
    else{roof([1547,588,1761,705]);part([1583,702,1735,808],z-.16,.70);part([1563,808,1751,829],z+.02,.90);}
    const windowLevels=tower?[.30,.55,.77]:[.43];windowLevels.forEach(level=>{const geo=new THREE.BoxGeometry(w*.11,h*.07,.055);resources.add(geo);const mesh=new THREE.Mesh(geo,distantWindow);mesh.position.set(x-w*.15,base+h*level,z-.11);root.add(mesh);const light=new THREE.PointLight('#ffcc89',0,2.9,2);light.position.copy(mesh.position);light.position.z+=.13;root.add(light);distantLights.push(light);});
    distantSites.push({x,z,baseY:base,height:h,tower,terrainY:terrainHeight(x,z)});
  }
  distantBuilding(7.5,-24,true,2.15);distantBuilding(28,-32,false,1.65);distantBuilding(51,-19,false,1.8);distantBuilding(73,-38,true,2.3);

  // A brief pond easter egg: a complete small fish volume, separate fins and
  // articulated tail swim away after the ripple, then disappear beneath water.
  const koi=new THREE.Group();koi.name='temporary-swimming-kohaku';koi.visible=false;root.add(koi);
  const fishGeometry=new THREE.SphereGeometry(1,low?16:24,10),fishPos=fishGeometry.attributes.position,fishUV=fishGeometry.attributes.uv;
  for(let i=0;i<fishPos.count;i++){const v=new THREE.Vector3().fromBufferAttribute(fishPos,i);v.set(v.x*.35,v.y*.072,v.z*.11);fishPos.setXYZ(i,v.x,v.y,v.z);fishUV.setXY(i,(1185+v.x/.35*141)/1774,1-(700-v.z/.11*64)/887);}
  fishGeometry.computeVertexNormals();resources.add(fishGeometry);const body=new THREE.Mesh(fishGeometry,koiMaterial);body.renderOrder=5;koi.add(body);
  const fishTail=new THREE.Group();fishTail.position.x=-.33;koi.add(fishTail);
  function fin(parent,name,vertices,uvs){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs.flat().map((v,i)=>i%2?1-v/887:v/1774),2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();resources.add(g);const mesh=new THREE.Mesh(g,koiMaterial);mesh.name=name;mesh.renderOrder=5;parent.add(mesh);return mesh;}
  fin(fishTail,'separate-koi-tail',[[0,0,-.035],[-.23,.004,-.155],[-.19,.004,.165],[0,0,.035]],[[1075,665],[886,575],[953,808],[1075,731]]);
  fin(koi,'left-translucent-pectoral-fin',[[.17,.004,.075],[.03,-.006,.235],[-.10,-.008,.20],[-.02,.004,.075]],[[1227,719],[1179,792],[1116,781],[1182,729]]);
  fin(koi,'right-translucent-pectoral-fin',[[.17,.004,-.075],[-.02,.004,-.075],[-.10,-.008,-.20],[.03,-.006,-.235]],[[1227,682],[1182,674],[1116,588],[1179,596]]);
  const rippleGeometry=new THREE.RingGeometry(.975,1,64);rippleGeometry.rotateX(-Math.PI/2);resources.add(rippleGeometry);
  const ripples=[];for(let i=0;i<3;i++){const m=material(THREE.MeshBasicMaterial,{color:'#c6b78c',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false},`koi-surface-ripple-${i}`),mesh=new THREE.Mesh(rippleGeometry,m);mesh.renderOrder=6;mesh.visible=false;root.add(mesh);ripples.push(mesh);}
  let koiStart=-100,koiPoint=[0,waterY,6];
  function showKoi(point){const p=Array.isArray(point)?point:[point.x,point.y,point.z];const x=THREE.MathUtils.clamp(p[0],xMin+1,xMax-1),z=THREE.MathUtils.clamp(p[2],shoreZ(x)+.45,16.8);koiPoint=[x,waterY,z];koiStart=time;koi.visible=true;return koiPoint;}

  for(const batch of batches.values()){const mat=batch.mat;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(batch.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(batch.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));g.computeBoundingSphere();resources.add(g);const mesh=new THREE.Mesh(g,mat);mesh.name=`merged-${mat.name}`;mesh.castShadow=mat!==distantFront&&mat!==distantSide;mesh.receiveShadow=true;(batch.sector===null?root:sector(batch.sector)).add(mesh);batch.p.length=batch.n.length=batch.uv.length=0;}
  let bloom=1;
  const yAxis=new THREE.Vector3(0,1,0),xAxis=new THREE.Vector3(1,0,0),flowerQ=new THREE.Quaternion(),tiltQ=new THREE.Quaternion();
  function update(dt,elapsed,_dark,visitor){const vx=typeof visitor==='number'?visitor:visitor?.x;if(Number.isFinite(vx))visitorX=vx;
    for(const {group,centre}of sectors.values())group.visible=Math.abs(centre-visitorX)<(low?24:28);
    distantLights.forEach(l=>l.visible=dark&&Math.abs(l.position.x-visitorX)<(low?25:35));
    time=Number.isFinite(elapsed)?elapsed:time+Math.min(dt||0,.08);waveUniform.value=time;windUniform.value=time;bloom=THREE.MathUtils.damp(bloom,dark?0:1,2,dt||.016);
    breezeAge.value=Math.max(0,time-breezeStart);breezeStrength.value=breezeAge.value<3.2?Math.sin(Math.PI*breezeAge.value/3.2)**2:0;
    let index=0;flowerSpecs.forEach((f,fi)=>{const sway=.019*Math.sin(time*.66+f.phase),open=THREE.MathUtils.lerp(.16,1.18,bloom),flowerX=f.x+Math.sin(time*.66+f.phase)*.012,flowerY=f.y+(f.raised?0:waveAt(f.x,f.z,time));
      for(let tier=0;tier<3;tier++){const count=[12,9,5][tier],scale=f.scale*[1,.81,.63][tier];for(let k=0;k<count;k++){const angle=k/count*Math.PI*2+tier*.26;flowerQ.setFromAxisAngle(yAxis,angle);tiltQ.setFromAxisAngle(xAxis,open*(1-tier*.17)+sway);flowerQ.multiply(tiltQ);
        matrix.compose(new THREE.Vector3(flowerX,flowerY,f.z),flowerQ,new THREE.Vector3(scale,scale,scale));petalMesh.setMatrixAt(index++,matrix);}}
      matrix.compose(new THREE.Vector3(flowerX,flowerY+.035,f.z),new THREE.Quaternion(),new THREE.Vector3(f.scale,f.scale*.62,f.scale));hearts.setMatrixAt(fi,matrix);
      const base=new THREE.Vector3(f.x,waterY-.16,f.z),end=new THREE.Vector3(flowerX,flowerY,f.z),delta=end.clone().sub(base);q.setFromUnitVectors(yAxis,delta.clone().normalize());
      matrix.compose(base.clone().add(end).multiplyScalar(.5),q,new THREE.Vector3(1,delta.length(),1));stems.setMatrixAt(fi,matrix);});
    petalMesh.commit();hearts.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;
    padSpecs.forEach((p,i)=>{q.setFromAxisAngle(xAxis,.012*Math.sin(time*.52+p.phase));matrix.compose(new THREE.Vector3(p.x,waterY+.025+waveAt(p.x,p.z,time)+.002*Math.sin(time*.70+p.phase),p.z),q,new THREE.Vector3(p.scale,1,p.scale));pads.setMatrixAt(i,matrix);});pads.instanceMatrix.needsUpdate=true;
    const fishAge=time-koiStart;koi.visible=fishAge>=0&&fishAge<7.5;
    if(koi.visible){koi.position.set(koiPoint[0]+Math.sin(fishAge*.44)*.85,waterY-.055-Math.max(0,fishAge-5.8)*.09,koiPoint[2]+Math.cos(fishAge*.44)*.22);
      koi.rotation.y=-Math.atan2(-Math.sin(fishAge*.44)*.22,Math.cos(fishAge*.44)*.85);fishTail.rotation.y=.36*Math.sin(fishAge*7.1);koiMaterial.opacity=.66*Math.min(1,fishAge*2.5,Math.max(0,(7.5-fishAge)/1.3));}
    ripples.forEach((r,i)=>{const age=fishAge-i*.37;r.visible=age>=0&&age<2.3;if(r.visible){r.position.set(koiPoint[0],waterY+.035,koiPoint[2]);r.scale.setScalar(.14+age*.42);r.material.opacity=.19*(1-age/2.3);}});
  }
  function setTheme(value){dark=!!value;stone.color.set(dark?'#8a91a0':'#c1bdb4');bank.color.set(dark?'#7b8391':'#c2beb4');mortar.color.set(dark?'#414650':'#756f63');soil.color.set(dark?'#697280':'#b8b4a5');water.color.set(dark?'#8eabb6':'#dde7db');water.emissiveIntensity=dark?.035:0;
    treeMaterials.setTheme(dark);rootContact.uniforms.uStrength.value=dark?.19:.30;petals.color.set(dark?'#a8abbc':'#fff0ed');flora.color.set(dark?'#81939a':'#ffffff');
    distantFront.color.set(dark?'#79838c':'#ffffff');distantSide.color.set(dark?'#707b84':'#a39d8c');distantWindow.opacity=dark?.43:.04;distantLights.forEach(l=>{l.intensity=dark?.18:0;l.visible=dark&&Math.abs(l.position.x-visitorX)<(low?25:35);});ridgeMaterials.forEach((m,i)=>m.color.set(dark?['#748390','#647482','#566777'][i]:'#ffffff'));koiMaterial.color.set(dark?'#a4b6c0':'#ffffff');}
  setTheme(false);update(.016,0);petalMesh.bounds();
  interactables.push({id:'river-water',type:'river',title:'A quiet ripple',object:waterMesh,point:[0,waterY,6],stand:[0,0,2.2]});
  const diagnostics={units:'metres',bounds:[xMin,xMax],bricks,slabs,water:{connected:true,y:waterY,segments:[waterNx,waterNz],animatedNormals:true},
    flora:{flowers:flowerSpecs.length,pads:padSpecs.length,reedClumps:reedSpecs.length,reedBlades,reedPanicleBranches,nightPetalsFold:true},trees:treeRoots,distantSites,
    staticDrawCalls:batches.size+pineBatches.size,staticTriangles:triangles+pineTriangles,treeGeometry:{batches:pineBatches.size,triangles:pineTriangles,branches:pineBranchCount,tufts:pineTuftCount,needles:pineNeedleCount,attributeBytesBefore:pineAttributeBytesBefore,attributeBytesAfter:pineAttributeBytesAfter,indexedWithoutSimplification:true,materials:treeMaterials.diagnostics},segments:{width:sectorWidth,count:sectors.size,petalGroups:petalMesh.segments},get activeDetailSegments(){return [...sectors.values()].filter(s=>s.group.visible).length;},get activeNightLights(){return distantLights.filter(l=>l.visible&&l.intensity>0).length;},authoredNightLights:distantLights.length,sourceTextures:acquired.size,sourceInputs:6,koi:{temporary:true,volume:true,tailArticulated:true},
    limitations:['The original paintings contain baked light; hidden sides, physical thickness and 3D botanical structure are authored interpretations, not a recovered 360-degree model.',
      'The river uses animated geometry and normals with the original water paint; it does not include expensive screen-space reflections.',
      'Distant mountain paint is mapped onto rolling heightfields. Source pigment is preserved while depth and unseen slopes are inferred.',
      'Pine trunks, roots, boughs and individual needle bundles are closed three-dimensional geometry. The painted front guides unequal crown tiers; hidden branches and botanical thickness are authored interpretations.']};
  return{root,update,setTheme,showKoi,stir:showKoi,breeze,diagnostics,interactables,terrainHeight,shoreZ,walkAreas:[{minX:xMin,maxX:xMax,minZ:0,maxZ:3.18,y:0}],
    dispose(){resources.forEach(r=>r.dispose());acquired.forEach(releasePaintTexture);root.clear();}};
}
