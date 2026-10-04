import * as THREE from 'three';

// Small, closed craft solids. A chamfered timber part has 44 triangles,
// rather than applying a multi-segment rounded cube to every wall block.
export function craftBoxChamfer(label,size,role='wood') {
  if(typeof role!=='string')return 0;
  const smallest=Math.min(...size),largest=Math.max(...size);
  if(smallest<.034||largest<.085)return 0;
  const timber=role==='wood'||role==='darkWood';
  const selected=timber||/board|plaque|closed-leaf|cabinet|bearing-cap|chest|table|stool|podium|lectern/.test(label);
  if(!selected||/continuous-core|wall|floor-block|paver|ceiling|threshold|apron/.test(label))return 0;
  // Remain inside the original box, preserving its bearing planes, door
  // envelope and collision bounds. Thin sheets/lattice keep their full face.
  return Math.min(.014,smallest*.14,largest*.04);
}

function faceWriter(grainAxis=null,size=null) {
  const positions=[],normals=[],uv=[];
  const tri=(a,b,c,normal)=>{
    const ab=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const ac=new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
    if(ab.cross(ac).dot(new THREE.Vector3(...normal))<0)[b,c]=[c,b];
    const dominant=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
    const available=[0,1,2].filter(i=>i!==dominant),vAxis=grainAxis===null?null:available.includes(grainAxis)?grainAxis:available.sort((a,b)=>size[b]-size[a])[0];
    const uAxis=vAxis===null?null:available.find(i=>i!==vAxis);
    for(const p of[a,b,c]){
      positions.push(...p);normals.push(...normal);
      uv.push(p[uAxis??(dominant===0?2:0)],p[vAxis??(dominant===1?2:1)]);
    }
  };
  const quad=(a,b,c,d,n)=>{tri(a,b,c,n);tri(a,c,d,n);};
  const finish=()=>{
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.computeBoundingBox();g.computeBoundingSphere();return g;
  };
  return{tri,quad,finish};
}

export function createCraftBoxGeometry(size,bevel=0,{grain=false}={}) {
  const grainAxis=grain?size.indexOf(Math.max(...size)):null;
  if(!(bevel>0)){
    const g=new THREE.BoxGeometry(...size);
    if(grain){
      const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
      for(let i=0;i<p.count;i++){
        const v=[p.getX(i),p.getY(i),p.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)],dominant=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
        const available=[0,1,2].filter(axis=>axis!==dominant),vAxis=available.includes(grainAxis)?grainAxis:available.sort((a,b)=>size[b]-size[a])[0],uAxis=available.find(axis=>axis!==vAxis);
        uv.setXY(i,v[uAxis],v[vAxis]);
      }
    }
    return g;
  }
  const half=size.map(v=>v/2),r=Math.min(bevel,...half.map(v=>v*.45)),inner=half.map(v=>v-r),w=faceWriter(grainAxis,size);
  for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){
    const other=[0,1,2].filter(i=>i!==axis),n=[0,0,0];n[axis]=sign;
    const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{
      const p=[0,0,0];p[axis]=sign*half[axis];p[other[0]]=a*inner[other[0]];p[other[1]]=b*inner[other[1]];return p;
    });w.quad(...points,n);
  }
  for(let axis=0;axis<3;axis++){
    const [a,b]=[0,1,2].filter(i=>i!==axis);
    for(const sa of[-1,1])for(const sb of[-1,1]){
      const p=(end,outerA)=>{
        const v=[0,0,0];v[axis]=end*inner[axis];v[a]=sa*(outerA?half[a]:inner[a]);v[b]=sb*(outerA?inner[b]:half[b]);return v;
      };
      const n=[0,0,0];n[a]=sa/Math.SQRT2;n[b]=sb/Math.SQRT2;
      w.quad(p(-1,true),p(1,true),p(1,false),p(-1,false),n);
    }
  }
  for(const sx of[-1,1])for(const sy of[-1,1])for(const sz of[-1,1]){
    const s=[sx,sy,sz],points=[0,1,2].map(axis=>half.map((h,i)=>s[i]*(axis===i?h:inner[i])));
    w.tri(...points,s.map(v=>v/Math.sqrt(3)));
  }
  const g=w.finish();g.parameters={width:size[0],height:size[1],depth:size[2]};
  g.userData.craft={kind:'closed-controlled-chamfer',triangles:44,bevel:r,grainAxis};return g;
}

// Extrude a convex arched section. Curved top normals are continuous;
// end caps and the bearing underside remain separate, outward faces.
function arcSolid({width,depth,height,segments,rolledLip=false}) {
  const positions=[],normals=[],uv=[],half=width/2,bottom=-height/2;
  const ringZ=rolledLip?[-depth/2,depth*.40,depth/2]:[-depth/2,depth/2];
  const tops=rolledLip?[height*.40,height/2,height*.44]:[height/2,height/2];
  const section=top=>{
    const points=[];
    for(let i=0;i<=segments;i++){
      const u=i/segments*2-1;
      points.push([u*half,top-height*.36*u*u]);
    }
    points.push([half,bottom],[-half,bottom]);return points;
  };
  const rings=ringZ.map((z,i)=>section(tops[i]).map(p=>[p[0],p[1],z]));
  const add=(a,b,c,na,nb=na,nc=na)=>{
    const cross=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).cross(new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
    if(cross.dot(new THREE.Vector3(...na))<0){[b,c]=[c,b];[nb,nc]=[nc,nb];}
    for(const[p,n]of[[a,na],[b,nb],[c,nc]]){positions.push(...p);normals.push(...n);uv.push((p[0]+half)/width,(p[2]+depth/2)/depth);}
  };
  const count=rings[0].length;
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<count;i++){
    const next=(i+1)%count,a=rings[j][i],b=rings[j][next],c=rings[j+1][next],d=rings[j+1][i];
    let na,nb;
    if(i<segments){
      // Analytic normals on the shallow curved crown; lip rise also changes
      // the longitudinal normal, so its highlight reads as a rolled edge.
      const dz=(tops[j+1]-tops[j])/(ringZ[j+1]-ringZ[j]);
      na=new THREE.Vector3(height*.72*(a[0]/half)/half,1,-dz).normalize().toArray();
      nb=new THREE.Vector3(height*.72*(b[0]/half)/half,1,-dz).normalize().toArray();
    }else{
      const delta=new THREE.Vector2(b[0]-a[0],b[1]-a[1]);na=nb=new THREE.Vector3(-delta.y,delta.x,0).normalize().toArray();
    }
    add(a,d,c,na,na,nb);add(a,c,b,na,nb,nb);
  }
  for(const [j,sign]of[[0,-1],[rings.length-1,1]])for(let i=1;i<count-1;i++)add(rings[j][0],rings[j][i],rings[j][i+1],[0,0,sign]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingBox();g.computeBoundingSphere();return g;
}

export function createCraftRoofTileGeometry({quality='high',width=.24,depth=.26,height=.042}={}) {
  const g=arcSolid({width,depth,height,segments:quality==='low'?4:6,rolledLip:quality!=='low'});
  g.userData.craft={kind:'closed-shallow-arc-tile',rolledLip:quality!=='low',triangles:g.attributes.position.count/3};return g;
}

export function createCraftRidgeGeometry({length,width=.20,height=.14,quality='high'}={}) {
  const g=arcSolid({width,depth:length,height,segments:quality==='low'?6:10});g.rotateY(Math.PI/2);g.computeBoundingBox();
  g.userData.craft={kind:'closed-rounded-ridge',triangles:g.attributes.position.count/3};return g;
}
