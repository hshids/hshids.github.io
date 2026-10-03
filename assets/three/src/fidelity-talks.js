import * as THREE from 'three';
import {acquirePaintTexture,releasePaintTexture,fitPaintCanvas,worldAssetURL} from './fidelity-assets.js';

/** The original painted open lecture hall, reconstructed as separate solids. */
export async function createFaithfulTalks({data,quality='high'}={}) {
  const root=new THREE.Group();root.name='talks-original-painted-open-hall';
  const resources=new Set(),acquired=new Set(),batches=new Map(),parts=[],lights=[],interactables=[];
  let triangleCount=0;
  const content=data??window.HJ_DATA??{};
  const videos=content.videos??[],posters=(content.posters??[]).slice(0,2);
  const atlas={width:1586,height:992},crop=[16,84,1574,920];
  const sx=570/(1558*85),sy=331/(836*85);
  const X=px=>(-365+(px-16)*570/1558)/85,Y=py=>(920-py)*sy;
  const projected=(x,y)=>[(16+(x*85+365)*1558/570)/atlas.width,1-(920-y/sy)/atlas.height];
  const [painting,finishes]=await Promise.all([
    acquirePaintTexture(worldAssetURL('assets/art/talks-painted.webp'),{quality}),
    acquirePaintTexture(worldAssetURL('assets/art/finishes-painted.webp'),{quality})
  ]);acquired.add(painting);acquired.add(finishes);
  const front=new THREE.MeshBasicMaterial({map:painting,alphaTest:.12,toneMapped:false});front.name='original-talks-painted-fronts';
  const woodSide=new THREE.MeshStandardMaterial({map:painting,color:'#857a6e',roughness:.8,alphaTest:.12,emissiveMap:painting,emissive:'#ffffff',emissiveIntensity:0});woodSide.name='original-talks-timber-sides';
  const fabricSide=woodSide.clone();fabricSide.roughness=.96;fabricSide.name='original-theatre-curtain-sides';
  const stoneSide=woodSide.clone();stoneSide.roughness=.97;stoneSide.name='original-stage-stone-sides';
  const warmFront=new THREE.MeshBasicMaterial({map:painting,alphaTest:.12,toneMapped:false});warmFront.name='original-theatre-warm-lanterns';
  const finishFront=new THREE.MeshBasicMaterial({map:finishes,alphaTest:.12,toneMapped:false});finishFront.name='original-carved-poster-stands';
  const finishSide=new THREE.MeshStandardMaterial({map:finishes,color:'#887869',roughness:.76});finishSide.name='original-carved-poster-stand-sides';
  [front,woodSide,fabricSide,stoneSide,warmFront,finishFront,finishSide].forEach(m=>resources.add(m));
  const woodPatch=[549,381,1009,415],stonePatch=[58,837,249,880],redPatch=[394,485,424,690];
  const uvCrop=(rect,size=atlas)=>{
    const[l,t,r,b]=rect;return[[l/size.width,1-b/size.height],[r/size.width,1-b/size.height],[r/size.width,1-t/size.height],[l/size.width,1-t/size.height]];
  };
  function tri(mat,a,b,c,ua,ub,uc){
    triangleCount++;
    if(!batches.has(mat))batches.set(mat,{p:[],n:[],uv:[]});const batch=batches.get(mat);
    const n=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a))).normalize();
    for(const[p,uv]of[[a,ua],[b,ub],[c,uc]]){batch.p.push(...p);batch.n.push(n.x,n.y,n.z);batch.uv.push(...uv);}
  }
  const quad=(mat,p,uv)=>{tri(mat,p[0],p[1],p[2],uv[0],uv[1],uv[2]);tri(mat,p[0],p[2],p[3],uv[0],uv[2],uv[3]);};
  function boxWorld(name,l,b,r,t,z,depth,patch,faceMat=front,sideMat=woodSide,frontUV=projected,size=atlas){
    const backBase=name==='podium-foot'||name==='carved-podium-body'?Math.max(b,stageY(z-depth)):b;
    const a=[l,b,z],bb=[r,b,z],c=[r,t,z],d=[l,t,z],ae=[l,backBase,z-depth],be=[r,backBase,z-depth],ce=[r,t,z-depth],de=[l,t,z-depth];
    quad(faceMat,[a,bb,c,d],[a,bb,c,d].map(p=>frontUV(p[0],p[1])));const uv=uvCrop(patch,size);
    [[bb,be,ce,c],[ae,a,d,de],[d,c,ce,de],[ae,be,bb,a],[be,ae,de,ce]].forEach(p=>quad(sideMat,p,uv));
    parts.push({name,kind:backBase!==b?'closed-rake-fitted-solid':'closed-box',bounds:[l,b,z-depth,r,t,z],depth,rearBaseY:backBase});
  }
  const box=(name,rect,z,depth,patch=woodPatch,faceMat=front,sideMat=woodSide)=>boxWorld(name,X(rect[0]),Y(rect[3]),X(rect[2]),Y(rect[1]),z,depth,patch,faceMat,sideMat);
  const cv=document.createElement('canvas');cv.width=atlas.width;cv.height=atlas.height;
  const cx=cv.getContext('2d');cx.drawImage(painting.image,0,0,atlas.width,atlas.height);let pixels=cx.getImageData(0,0,atlas.width,atlas.height).data;
  function alphaOutline(points){
    const left=Math.ceil(Math.max(crop[0],Math.min(...points.map(p=>p[0])))),right=Math.floor(Math.min(crop[2],Math.max(...points.map(p=>p[0]))));
    const top=[],bottom=[];
    for(let x=left;x<=right;x+=4){const crosses=[];
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))crosses.push(a[1]+(x-a[0])/(b[0]-a[0])*(b[1]-a[1]));}
      if(crosses.length<2)continue;let first=-1,last=-1;
      for(let y=Math.max(crop[1],Math.floor(Math.min(...crosses)));y<=Math.min(crop[3],Math.ceil(Math.max(...crosses)));y++)if(pixels[(y*atlas.width+x)*4+3]>28){if(first<0)first=y;last=y;}
      if(first>=0){top.push([x,first]);bottom.push([x,last]);}
    }
    function simplify(p){if(p.length<3)return p;const a=p[0],b=p.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;let far=0,index=0;
      for(let i=1;i<p.length-1;i++){const q=p[i],t=den?THREE.MathUtils.clamp(((q[0]-a[0])*dx+(q[1]-a[1])*dy)/den,0,1):0,d=(q[0]-a[0]-t*dx)**2+(q[1]-a[1]-t*dy)**2;if(d>far){far=d;index=i;}}
      if(far<2**2)return[a,b];return[...simplify(p.slice(0,index+1)).slice(0,-1),...simplify(p.slice(index))];}
    return top.length>2?[...simplify(top),...simplify(bottom).reverse()]:points;
  }
  function polygonSolid(name,points,z,depth,patch=woodPatch,sideMat=woodSide){
    const outline=alphaOutline(points).map(([x,y])=>new THREE.Vector2(X(x),Y(y)));if(THREE.ShapeUtils.isClockWise(outline))outline.reverse();
    for(const ids of THREE.ShapeUtils.triangulateShape(outline,[])){const p=ids.map(i=>[outline[i].x,outline[i].y,z]);tri(front,...p,...p.map(v=>projected(v[0],v[1])));
      tri(sideMat,[p[2][0],p[2][1],z-depth],[p[1][0],p[1][1],z-depth],[p[0][0],p[0][1],z-depth],...uvCrop(patch).slice(0,3));}
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];quad(sideMat,[[a.x,a.y,z],[a.x,a.y,z-depth],[b.x,b.y,z-depth],[b.x,b.y,z]],uvCrop(patch));}
    parts.push({name,kind:'closed-contoured-timber',depth});
  }

  // A true sloped, curved tile roof with thickness and preserved original
  // carved ridge outline. The front keeps the original roof's UV and palette.
  const roofOutline=alphaOutline([[16,173],[24,167],[35,188],[63,209],[113,226],[172,233],[225,226],[265,207],[293,181],[298,161],
    [288,137],[267,120],[263,103],[266,91],[278,89],[290,104],[304,109],[323,112],[326,135],[338,148],[1260,148],
    [1267,130],[1265,111],[1293,105],[1305,91],[1318,87],[1326,96],[1326,129],[1322,146],[1346,179],[1382,207],
    [1429,227],[1475,233],[1522,217],[1546,192],[1555,171],[1567,167],[1574,189],[1569,229],[1556,260],[1533,293],
    [1489,315],[1400,328],[1200,336],[385,336],[221,320],[123,301],[65,274],[26,235]]).map(([px,py])=>new THREE.Vector2(X(px),Y(py)));
  if(THREE.ShapeUtils.isClockWise(roofOutline))roofOutline.reverse();
  const roofZ=(x,y)=>{const px=16+(x*85+365)*1558/570,py=920-y/sy,t=THREE.MathUtils.clamp((py-148)/158,0,1);return-2.85*(1-t)-.018*Math.sin(t*Math.PI)*Math.sin((px-50)*Math.PI/39)**2;};
  function roofTri(a,b,c,level=0){
    if(level<7&&Math.max(a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a))>(quality==='low'?.24:.145)**2){const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);roofTri(a,ab,ca,level+1);roofTri(ab,b,bc,level+1);roofTri(ca,bc,c,level+1);roofTri(ab,bc,ca,level+1);return;}
    const p=[a,b,c].map(v=>[v.x,v.y,roofZ(v.x,v.y)]);tri(front,...p,...p.map(v=>projected(v[0],v[1])));
    tri(woodSide,[p[2][0],p[2][1],p[2][2]-.12],[p[1][0],p[1][1],p[1][2]-.12],[p[0][0],p[0][1],p[0][2]-.12],...[p[2],p[1],p[0]].map(v=>projected(v[0],v[1])));
  }
  THREE.ShapeUtils.triangulateShape(roofOutline,[]).forEach(ids=>roofTri(...ids.map(i=>roofOutline[i])));
  roofOutline.forEach((a,i)=>{const b=roofOutline[(i+1)%roofOutline.length],p=[[a.x,a.y,roofZ(a.x,a.y)],[a.x,a.y,roofZ(a.x,a.y)-.12],[b.x,b.y,roofZ(b.x,b.y)-.12],[b.x,b.y,roofZ(b.x,b.y)]];quad(woodSide,p,p.map(v=>projected(v[0],v[1])));});
  parts.push({name:'original-upturned-tile-roof',kind:'closed-curved-pitched-roof',depth:2.85,thickness:.12});
  polygonSolid('ornate-under-eave-timber',[[37,316],[1541,316],[1526,346],[1491,381],[1436,407],[1388,369],[191,369],[165,406],[127,399],[90,377],[58,344]],-.09,2.72);
  box('main-architrave',[187,372,1400,422],-.22,3.3);
  box('recessed-projection-wall',[510,454,1086,700],-3.78,.16,[622,471,983,689]);
  box('projection-wall-upper-frame',[389,418,1194,456],-3.60,.34);
  box('projection-wall-bottom-rail',[508,694,1105,739],-3.57,.38);
  // Behind the gathered fabric is continuous plaster. Sample clean plaster,
  // so an inferred wall never receives a second painted curtain or podium.
  const plainWallUV=(x,y)=>[(622+(x-X(389))/(X(1194)-X(389))*(983-622))/atlas.width,
    1-(689-(y-Y(739))/(Y(454)-Y(739))*(689-471))/atlas.height];
  boxWorld('left-continuous-plain-back-wall',X(389),Y(739),X(511),Y(454),-3.78,.16,[622,471,983,689],front,woodSide,plainWallUV);
  boxWorld('right-continuous-plain-back-wall',X(1085),Y(739),X(1194),Y(454),-3.78,.16,[622,471,983,689],front,woodSide,plainWallUV);
  polygonSolid('left-outside-plaster',[[113,422],[231,422],[231,786],[113,786]],-.66,3.40,[187,472,224,664],stoneSide);
  polygonSolid('right-outside-plaster',[[1354,422],[1473,422],[1473,786],[1354,786]],-.66,3.40,[1362,478,1388,672],stoneSide);

  // Folded open wood doors have real depth, not a repeated lattice decal.
  function door(name,rect,zLeft,zRight){const[l,t,r,b]=rect,depth=.10;
    const p=[[X(l),Y(b),zLeft],[X(r),Y(b),zRight],[X(r),Y(t),zRight],[X(l),Y(t),zLeft]];
    quad(front,p,p.map(v=>projected(v[0],v[1])));
    const back=p.map(v=>[v[0],v[1],v[2]-depth]);quad(woodSide,[back[1],back[0],back[3],back[2]],uvCrop(woodPatch));
    for(let i=0;i<4;i++)quad(woodSide,[p[i],back[i],back[(i+1)%4],p[(i+1)%4]],uvCrop(woodPatch));parts.push({name,kind:'closed-open-door',depth,angle:Math.atan2(zRight-zLeft,(r-l)*sx)});
  }
  door('left-outer-open-lattice-door',[233,434,323,748],-1.70,-2.53);door('left-inner-open-lattice-door',[323,447,390,738],-2.53,-3.06);
  door('right-inner-open-lattice-door',[1184,447,1269,738],-3.06,-2.48);door('right-outer-open-lattice-door',[1269,434,1366,748],-2.48,-1.70);
  box('left-real-door-lintel',[229,418,390,448],-1.68,.21);
  box('right-real-door-lintel',[1184,418,1366,448],-1.68,.21);

  // Four separate gathered curtain lobes retain silk folds and cord in the
  // source image. Their curved physical surfaces sit behind the timber posts.
  function curtain(name,rect){const[l,t,r,b]=rect,nx=12,ny=22,z=-2.65;
    const point=(i,j)=>{const px=l+(r-l)*i/nx,py=t+(b-t)*j/ny;return[X(px),Y(py),z+Math.sin(i/nx*Math.PI*8)*.032*Math.sin(j/ny*Math.PI*.8)];};
    const curtainUV=v=>{if(l===1072){const px=16+(v[0]*85+365)*1558/570,sourceX=485+(1106-px);return[sourceX/atlas.width,projected(v[0],v[1])[1]];}return projected(v[0],v[1]);};
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const p=[point(i,j+1),point(i+1,j+1),point(i+1,j),point(i,j)];quad(front,p,p.map(curtainUV));const back=p.map(v=>[v[0],v[1],v[2]-.025]);quad(fabricSide,[back[3],back[2],back[1],back[0]],uvCrop(redPatch));}
    parts.push({name,kind:'curved-silk-curtain',depth:.08});
  }
  [[382,422,439,733],[485,443,519,714],[1072,443,1106,714],[1151,422,1195,741]].forEach((rect,i)=>curtain(`gathered-red-curtain-${i+1}`,rect));

  function round(name,cx,profile,z,sidePatch=woodPatch,frontUV=projected){const count=36;
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<count;i++){const a=i/count*Math.PI*2,b=(i+1)/count*Math.PI*2,[ya,ra]=profile[j],[yb,rb]=profile[j+1];
      const p=[[cx+Math.sin(a)*ra,ya,z+Math.cos(a)*ra],[cx+Math.sin(b)*ra,ya,z+Math.cos(b)*ra],[cx+Math.sin(b)*rb,yb,z+Math.cos(b)*rb],[cx+Math.sin(a)*rb,yb,z+Math.cos(a)*rb]];
      const face=Math.cos((a+b)/2)>=0;quad(face?front:woodSide,p,face?p.map(v=>frontUV(v[0],v[1])):uvCrop(sidePatch));}
    // End discs close the actual column/figure volume.
    for(const [index,reverse]of[[0,true],[profile.length-1,false]]){const[y,r]=profile[index];for(let i=0;i<count;i++){const a=i/count*Math.PI*2,b=(i+1)/count*Math.PI*2,p=[[cx,y,z],[cx+Math.sin(a)*r,y,z+Math.cos(a)*r],[cx+Math.sin(b)*r,y,z+Math.cos(b)*r]];if(reverse)p.reverse();tri(woodSide,...p,...uvCrop(sidePatch).slice(0,3));}}
    parts.push({name,kind:'closed-round-volume',depth:Math.max(...profile.map(p=>p[1]))*2});
  }
  // The original painting looks down over a stage. A gently raked physical
  // stage retains its projected floor while giving every prop one consistent
  // height at its own depth, rather than treating the image rows as one plane.
  const stageFrontZ=.05,stageBackZ=-4.10,stageFrontY=Y(792),stageBackY=Y(727);
  const stageY=z=>THREE.MathUtils.lerp(stageFrontY,stageBackY,THREE.MathUtils.clamp((stageFrontZ-z)/(stageFrontZ-stageBackZ),0,1));
  const stageZ=py=>stageFrontZ-(stageFrontZ-stageBackZ)*(792-py)/(792-727);
  const podiumZ=stageZ(759);
  [[163,817],[456,759],[1126,759],[1418,817]].forEach(([px,base],i)=>round(`grounded-round-pillar-${i+1}`,X(px),[[Y(base),.18],[Y(base-11),.18],[Y(base-24),.147],[Y(base-49),.13],[Y(base-56),.113],[Y(389),.11]],i===1||i===2?podiumZ:-.23));
  const stageTop=[[-4.01,stageFrontY,stageFrontZ],[X(1454),stageFrontY,stageFrontZ],[X(1454),stageBackY,stageBackZ],[-4.01,stageBackY,stageBackZ]];
  // Audience pixels must not be baked onto this floor: under parallax they
  // become stretched dark "head shadows". Reuse only its clean wood grain.
  quad(woodSide,stageTop,uvCrop([525,718,1001,732]));
  const stageUnder=stageTop.map(v=>[v[0],v[1]-.10,v[2]]);
  quad(woodSide,[stageUnder[3],stageUnder[2],stageUnder[1],stageUnder[0]],uvCrop(woodPatch));
  for(let i=0;i<4;i++)quad(woodSide,[stageTop[i],stageUnder[i],stageUnder[(i+1)%4],stageTop[(i+1)%4]],uvCrop(woodPatch));
  parts.push({name:'solid-gently-raked-wooden-stage',kind:'closed-raked-floor',frontY:stageFrontY,backY:stageBackY,frontZ:stageFrontZ,backZ:stageBackZ});
  polygonSolid('continuous-carved-stone-platform',[[44,820],[113,792],[1474,792],[1546,820],[1546,884],[40,884]],-.06,4.3,stonePatch,stoneSide);

  // Entry is beside the audience, not through the benches or poster feet.
  // These five short stone treads meet the stage at the same physical height.
  const accessSteps=[];
  for(let i=0;i<5;i++){
    const backZ=stageFrontZ+(4-i)*.2,frontZ=backZ+.2,top=(i+1)*stageFrontY/5;
    const l=-4.01,r=-3.08,b=0;
    const p=[[l,b,frontZ],[r,b,frontZ],[r,top,frontZ],[l,top,frontZ]],back=p.map(v=>[v[0],v[1],backZ]);
    quad(stoneSide,p,uvCrop(stonePatch));quad(stoneSide,[back[1],back[0],back[3],back[2]],uvCrop(stonePatch));
    for(let j=0;j<4;j++)quad(stoneSide,[p[j],back[j],back[(j+1)%4],p[(j+1)%4]],uvCrop(stonePatch));
    accessSteps.push({minX:l,maxX:r,minZ:backZ,maxZ:frontZ,y:top});
    parts.push({name:`left-aisle-access-tread-${i+1}`,kind:'closed-stone-step',bounds:[l,b,backZ,r,top,frontZ]});
  }

  // Podium is a closed carved wood body with a genuinely projecting top and
  // circular stone motif from the original painting; no flag is introduced.
  box('carved-podium-body',[1020,645,1122,752],podiumZ-.06,.46,[1030,652,1108,739]);
  box('podium-projecting-lectern-top',[1009,629,1135,647],podiumZ+.05,.54,[1009,629,1135,647]);
  box('podium-foot',[1017,745,1127,759],podiumZ,.54,[1017,745,1127,759]);

  // Audience stays softly painted and subdued. Each seated body and head has
  // round volume and separate row depth; it is not a single crowd rectangle.
  const audienceRows=[{z:.25,bottom:836,heads:[[348,752],[451,752],[525,752],[615,752],[708,752],[805,752],[894,752],[992,752],[1090,760],[1246,765]]},
    {z:.63,bottom:875,heads:[[334,782],[443,782],[583,805],[701,790],[820,786],[932,785],[1058,785],[1160,782]]}];
  audienceRows.forEach((row,ri)=>row.heads.forEach(([px,py],i)=>{
    const radius=(ri?19:16)*sx,cy=Y(py),base=Y(row.bottom),maxRadius=ri?.18:.15,top=cy-.035;
    // Use a measured patch of this person's coat for the torso. Projecting the
    // entire source crowd onto a round torso would print a foreground head on
    // the rear figure's shoulder and produce a second, ghost-like head.
    const cloth=[px-21,row.bottom-48,px+21,row.bottom-10];
    const coatUV=(x,y)=>[(cloth[0]+((x-X(px))/(2*maxRadius)+.5)*(cloth[2]-cloth[0]))/atlas.width,
      1-(cloth[3]-(y-base)/(top-base)*(cloth[3]-cloth[1]))/atlas.height];
    round(`painted-seated-spectator-${ri}-${i}`,X(px),[[base,maxRadius*.9],[base+.14,maxRadius],[cy-.075,maxRadius*.52],[top,.042]],row.z,cloth,coatUV);
    const headProfile=[];for(let j=0;j<=10;j++){const angle=j/10*Math.PI;headProfile.push([cy-radius*Math.cos(angle),Math.max(.001,Math.sin(angle)*radius)]);}
    round(`soft-painted-spectator-head-${ri}-${i}`,X(px),headProfile,row.z+.018,[px-12,py-12,px+12,py+12]);
  }));
  // The original painted bench ends project into the only entry aisle. Trim
  // their unused extensions in real depth so a visitor can pass the column.
  box('back-audience-bench',[315,828,1318,848],.48,.37,[315,835,1240,848]);
  box('front-audience-bench',[315,875,1358,920],.91,.40,[315,885,1312,909]);

  // Exact original English plaque, with lettering painted directly onto the
  // detailed solid wooden sign instead of floating in front of the stage.
  const signCanvas=document.createElement('canvas');signCanvas.width=676;signCanvas.height=202;
  const sg=signCanvas.getContext('2d'),finishSize={width:2172,height:724};
  sg.drawImage(finishes.image,1465/2172*finishes.image.width,348/724*finishes.image.height,676/2172*finishes.image.width,202/724*finishes.image.height,0,0,676,202);
  sg.font='75px Georgia,serif';sg.textAlign='center';sg.textBaseline='middle';sg.fillStyle='#4a2918';sg.fillText('TALKS',340,114);sg.fillStyle='#ead8b3';sg.fillText('TALKS',338,111);
  const signTexture=new THREE.CanvasTexture(fitPaintCanvas(signCanvas,quality));signTexture.colorSpace=THREE.SRGBColorSpace;resources.add(signTexture);
  const signMat=new THREE.MeshBasicMaterial({map:signTexture,alphaTest:.12,toneMapped:false});resources.add(signMat);signMat.name='painted-inlaid-talks-plaque';
  const signX=-81/85,signY=(560-349.376)/85;
  const signUV=(x,y)=>[(x-(signX-50/85))/(100/85),(y-(signY-13/85))/(26/85)];
  boxWorld('solid-lettered-talks-plaque',signX-50/85,signY-13/85,signX+50/85,signY+13/85,-.01,.11,[1547,398,2044,483],signMat,finishSide,signUV,finishSize);

  // Stage lanterns are real glass boxes with warm sources inside their cages.
  [[341,420,376,469],[1212,420,1247,469]].forEach((rect,i)=>{
    box(`glazed-stage-lantern-${i+1}`,rect,-2.68,.11,[345,426,371,462],warmFront);
    const light=new THREE.PointLight('#ffcb81',.05,3,2);light.position.set(X((rect[0]+rect[2])/2),Y((rect[1]+rect[3])/2),-2.57);root.add(light);lights.push(light);
  });

  // Three slide cells and two original poster cells share one small atlas.
  // Personal media remains lazy until this hall is entered or a poster opened.
  const mediaCanvas=document.createElement('canvas');mediaCanvas.width=1024;mediaCanvas.height=768;
  const mg=mediaCanvas.getContext('2d');mg.fillStyle='#e8ddbd';mg.fillRect(0,0,1024,768);
  const mediaTexture=new THREE.CanvasTexture(mediaCanvas);mediaTexture.colorSpace=THREE.SRGBColorSpace;resources.add(mediaTexture);
  const mediaMat=new THREE.MeshBasicMaterial({map:mediaTexture,toneMapped:false});resources.add(mediaMat);mediaMat.name='original-live-talk-slides-and-posters';
  const posterMat=mediaMat.clone();posterMat.name='original-reflective-poster-paper';resources.add(posterMat);
  const setCell=(geometry,index)=>{const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(index%2+([0,1,0,1][i]))/2,1-(Math.floor(index/2)+1-([1,1,0,0][i]))/3);uv.needsUpdate=true;};
  function mediaPlane(name,index,x,y,z,w,h){const geometry=new THREE.PlaneGeometry(w,h);setCell(geometry,index);resources.add(geometry);const mesh=new THREE.Mesh(geometry,mediaMat);mesh.position.set(x,y,z);mesh.name=name;root.add(mesh);return mesh;}
  const screen=mediaPlane('live-projection-on-back-wall',0,(-189+107)/85,(560-383.376-49)/85,-3.54,214/85,98/85);
  const projectionLight=new THREE.PointLight('#e1e8ee',.03,3.5,2);projectionLight.position.set(screen.position.x,screen.position.y,-3.24);root.add(projectionLight);
  const proxyMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});proxyMat.visible=false;resources.add(proxyMat);
  const stand=[30/85,0,1.4],presentZ=podiumZ+.52,presentStand=[X(1157),stageY(presentZ),presentZ];
  const approach=[[-3.25,0,1.24],[-3.25,stageY(-.25),-.25],[-2.55,stageY(-.25),-.25],[-2.55,stageY(-.90),-.90],
    [presentStand[0],stageY(-.90),-.90],presentStand];
  const colliders=[],colliderRadius=.12;
  const occupy=(id,min,max)=>colliders.push({id,type:'box',min,max});
  occupy('projection-back-wall',[X(389),Y(739),-3.94],[X(1194),Y(454),-3.60]);
  [[163,817,-.23],[456,759,podiumZ],[1126,759,podiumZ],[1418,817,-.23]].forEach(([px,base,z],i)=>
    occupy(`grounded-hall-column-${i}`,[X(px)-.18,Y(base),z-.18],[X(px)+.18,Y(389),z+.18]));
  [[233,323,-2.63,-1.70],[323,390,-3.16,-2.53],[1184,1269,-3.16,-2.48],[1269,1366,-2.58,-1.70]]
    .forEach(([l,r,back,front],i)=>occupy(`folded-open-door-${i}`,[X(l),Y(748),back],[X(r),Y(434),front]));
  occupy('solid-lectern',[X(1009),stageY(podiumZ),podiumZ-.54],[X(1135),Y(629),podiumZ+.05]);
  [[315,1318,.11,.48,848,828],[315,1358,.51,.91,920,875]].forEach(([l,r,back,front,b,t],i)=>
    occupy(`audience-bench-${i}`,[X(l),Y(b),back],[X(r),Y(t),front]));
  audienceRows.forEach((row,ri)=>row.heads.forEach(([px,py],i)=>{const r=ri?.18:.15;
    occupy(`seated-spectator-${ri}-${i}`,[X(px)-r,Y(row.bottom),row.z-r],[X(px)+r,Y(py)+.10,row.z+r]);}));
  function pick(id,type,title,point,size,focus,itemStand=stand){const geometry=new THREE.BoxGeometry(...size);resources.add(geometry);const object=new THREE.Mesh(geometry,proxyMat);object.position.fromArray(point);object.name=`pick-${id}`;object.userData={interaction:true,id,type,title};root.add(object);const item={id,type,title,point,object,focus,stand:itemStand,facing:0};interactables.push(item);return item;}
  pick('talks-projection','talk','Talks & Posters',[screen.position.x,screen.position.y,screen.position.z],[214/85,98/85,.12],{station:'talks'},presentStand).approach=approach;
  pick('talks-lectern','talk','Present a talk',[X(1072),Y(691),podiumZ],[.58,.7,.55],{station:'talks'},presentStand).approach=approach;
  const frameCrop=[737,88,1428,675];
  posters.forEach((poster,i)=>{
    const w=(i?105:137)/85,h=(i?135:130)/85,cx=(i?325:205)/85,base=0,z=.37;
    const frameUV=(x,y)=>[(frameCrop[0]+(x-cx+w/2)/w*(frameCrop[2]-frameCrop[0]))/finishSize.width,
      1-(frameCrop[3]-(y-base)/h*(frameCrop[3]-frameCrop[1]))/finishSize.height];
    const frameBox=(name,l,b,r,t)=>boxWorld(name,l,b,r,t,z,.105,[748,129,778,491],finishFront,finishSide,frameUV,finishSize);
    const insetL=cx-w*.34,insetR=cx+w*.34,insetB=h*(1-.105-.605),insetT=h*(1-.105);
    frameBox(`poster-${i+1}-left-carved-post`,cx-w/2,base,insetL,h);frameBox(`poster-${i+1}-right-carved-post`,insetR,base,cx+w/2,h);
    frameBox(`poster-${i+1}-top-roller`,insetL,insetT,insetR,h);frameBox(`poster-${i+1}-lower-roller`,insetL,base,insetR,insetB);
    // The foot blocks have genuine fore-and-aft depth and sit on y=0.
    frameBox(`poster-${i+1}-left-foot`,cx-w/2,0,cx-w*.34,.15);frameBox(`poster-${i+1}-right-foot`,cx+w*.34,0,cx+w/2,.15);
    occupy(`poster-stand-${i}`,[cx-w/2,0,z-.105],[cx+w/2,h,z]);
    const posterMesh=mediaPlane(`original-poster-${i+1}`,3+i,cx,(insetB+insetT)/2,z+.002,insetR-insetL,insetT-insetB);posterMesh.material=posterMat;
    const item=pick(`poster-${poster.paper}`,'poster',`Poster · ${poster.venue}`,[cx,h*.54,z],[w,h,.18],{posters:true},[cx,0,1.15]);item.poster=poster;item.posterIndex=i;
  });
  for(const[material,batch]of batches){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));geometry.computeBoundingSphere();resources.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.name=`merged-${material.name}`;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);batch.p.length=0;batch.n.length=0;batch.uv.length=0;}
  pixels=null;cv.width=cv.height=1;
  let mediaPromise=null;
  function ensureMedia(){if(mediaPromise)return mediaPromise;
    const entries=[...videos.slice(0,3).map((v,i)=>({src:v.thumb,index:i,aspect:214/98})),...posters.map((p,i)=>({src:p.thumb,index:3+i,aspect:((i?105:137)*.68)/((i?135:130)*.605)}))];
    mediaPromise=Promise.all(entries.map(entry=>new Promise(resolve=>{const image=new Image();image.decoding='async';image.onload=()=>{const cellX=entry.index%2*512,cellY=Math.floor(entry.index/2)*256,aspect=image.width/image.height;
      const w=512*Math.min(1,aspect/entry.aspect),h=256*Math.min(1,entry.aspect/aspect);mg.fillStyle='#e8ddbd';mg.fillRect(cellX,cellY,512,256);mg.drawImage(image,cellX+(512-w)/2,cellY+(256-h)/2,w,h);mediaTexture.needsUpdate=true;resolve({src:entry.src,ok:true});};image.onerror=()=>resolve({src:entry.src,ok:false});image.src=worldAssetURL(entry.src);})));return mediaPromise;
  }
  let lastSlide=-1,dark=false;
  function update(time){const index=videos.length?Math.floor(time/4)%Math.min(3,videos.length):0;if(index!==lastSlide){setCell(screen.geometry,index);lastSlide=index;}}
  function setTheme(value){dark=!!value;front.color.set(dark?'#7d8797':'#ffffff');finishFront.color.set(dark?'#858b96':'#ffffff');signMat.color.set(dark?'#c3b694':'#ffffff');posterMat.color.set(dark?'#77808e':'#ffffff');projectionLight.intensity=dark?.17:.03;
    warmFront.color.set(dark?'#fff0d4':'#ffffff');[woodSide,fabricSide,stoneSide].forEach(m=>m.emissiveIntensity=dark?.05:0);lights.forEach(l=>l.intensity=dark?.47:.03);}
  setTheme(false);update(0);
  const bounds=new THREE.Box3(new THREE.Vector3(-365/85,0,-4.36),new THREE.Vector3(4.46,331/85,.96));
  const diagnostics={source:'assets/art/talks-painted.webp',sourceCrop:crop,sourcePixels:[1586,992],units:'old SVG pixels / 85',parts,
    triangles:triangleCount,staticDrawCalls:batches.size,mediaLazy:true,
    stage:{frontY:stageFrontY,backY:stageBackY,frontZ:stageFrontZ,backZ:stageBackZ,rakeDegrees:THREE.MathUtils.radToDeg(Math.atan2(stageBackY-stageFrontY,stageFrontZ-stageBackZ))},
    limitations:['Painted front surfaces retain baked source lighting. Real inferred sides and lamp sources add spatial depth; this is not recovered full PBR.',
      'Unseen back construction is inferred and the preserved front painting is prioritised for small camera yaw.',
      'Seated audience geometry follows the original small, blurred figures; it is not a collection of fully animated human rigs.']};
  return{root,bounds,stand,actionStand:{talk:{point:presentStand,facing:0,approach}},interactables,screen,update,setTheme,ensureMedia,diagnostics,colliders,colliderRadius,
    floorAt(x,z){const step=accessSteps.find(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ);if(step)return step.y;
      if(x>=-3.90&&x<=X(231)&&z>=-.42&&z<stageFrontZ)return stageY(z);
      return x>=X(231)&&x<=X(1366)&&z>=stageBackZ&&z<=stageFrontZ?stageY(z):0;},
    walkAreas:[...accessSteps,{minX:-3.90,maxX:X(231),minZ:-.42,maxZ:stageFrontZ,y:stageFrontY,ramp:{frontZ:stageFrontZ,backZ:stageBackZ,frontY:stageFrontY,backY:stageBackY}},
      {minX:X(231),maxX:X(1366),minZ:stageBackZ,maxZ:stageFrontZ,y:stageFrontY,ramp:{frontZ:stageFrontZ,backZ:stageBackZ,frontY:stageFrontY,backY:stageBackY}}],
    dispose(){for(const resource of resources)resource.dispose();for(const texture of acquired)releasePaintTexture(texture);root.clear();}};
}

export {createFaithfulTalks as createTalks};
