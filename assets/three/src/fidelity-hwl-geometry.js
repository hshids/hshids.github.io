import * as THREE from 'three';

export const UNIT=1/85;
export const px=x=>x*UNIT;
export const py=y=>(560-y)*UNIT;

// Complete small props. Only supported paper, art and photos use print maps.
export function createHWLProps({root,resources,materialForRole=null}={}) {
  const materials=new Map(),colours={wood:'#926344',darkWood:'#5d4031',plaster:'#eadbc0',stone:'#a6a8a1',floor:'#baaa88',roof:'#52616b',red:'#a64c40',brass:'#c5a66b',ivory:'#eee3cb',blue:'#6e919c',green:'#8ca77a',cloth:'#a88970',ink:'#222c27',paper:'#f3e8cd'};
  function material(role='wood',options={}) {
    if(role?.isMaterial)return role;
    const shared=materialForRole?.(role);if(shared&&!Object.keys(options).length)return shared;
    const key=role+JSON.stringify(options);if(materials.has(key))return materials.get(key);
    const m=new THREE.MeshStandardMaterial({color:colours[role]||role,roughness:role==='brass'?.46:role==='ink'?.31:.73,metalness:role==='brass'?.23:0,...options});m.name='HWL-complete-solid-'+role;materials.set(key,m);resources.add(m);return m;
  }
  function mesh(name,geometry,mat,position=[0,0,0],parent=root) {
    const object=new THREE.Mesh(geometry,typeof mat==='string'?material(mat):mat);object.name=name;object.position.fromArray(position);object.castShadow=true;object.receiveShadow=true;object.userData.roomSolid=true;parent.add(object);resources.add(geometry);return object;
  }
  function sphere(name,size,position,role='cloth',parent=root) {
    const object=mesh(name,new THREE.SphereGeometry(1,16,10),material(role),position,parent);object.scale.fromArray(size);return object;
  }
  function cylinder(name,radius,height,position,role='wood',parent=root,segments=12,radiusTop=radius) {
    return mesh(name,new THREE.CylinderGeometry(radiusTop,radius,height,segments,1,false),material(role),position,parent);
  }
  function tube(name,from,to,radius,role='wood',parent=root,segments=8,radiusTop=radius) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a),object=cylinder(name,radius,delta.length(),a.clone().add(b).multiplyScalar(.5).toArray(),role,parent,segments,radiusTop);object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return object;
  }
  function lathe(name,profile,position,role='wood',parent=root,segments=16) {
    return mesh(name,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments),material(role),position,parent);
  }
  function prism(name,points,depth,position,role='ivory',parent=root) {
    const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p))),geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.006,bevelThickness:.006});geometry.translate(0,0,-depth/2);return mesh(name,geometry,material(role),position,parent);
  }
  function print(name,texture,width,height,position,parent=root,{horizontal=false}={}) {
    const mat=new THREE.MeshStandardMaterial({map:texture,roughness:.87,metalness:0});mat.name='HWL-supported-printed-decoration-'+name;resources.add(mat);const object=mesh(name,new THREE.PlaneGeometry(width,height),mat,position,parent);object.castShadow=false;object.userData.roomSolid=false;if(horizontal)object.rotation.x=-Math.PI/2;return object;
  }
  function torus(name,radius,tubeRadius,position,role='brass',parent=root) {
    const object=mesh(name,new THREE.TorusGeometry(radius,tubeRadius,6,48),material(role),position,parent);object.rotation.x=-Math.PI/2;return object;
  }
  return {material,mesh,sphere,cylinder,tube,lathe,prism,print,torus};
}

// Preserve the authored Hello World! glyph paths and progressive brush timing.
export function createWritingInk({root,resources,deskTop,deskZ,onTip}) {
  const paperCorners=[[-97.61,515.29],[103.88,515.29],[91.91,500.55],[-93.62,500.55]],corners=paperCorners.map(([x],i)=>[px(x),deskTop+.016,deskZ+(i<2?.16:-.22)]);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=96;const context=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:.91,metalness:0});material.name='HWL-real-paper-progressive-handwritten-ink';resources.add(material);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([...corners[0],...corners[1],...corners[2],...corners[0],...corners[2],...corners[3]],3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1],2));geometry.computeVertexNormals();resources.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.name='true-desk-paper-handwritten-Hello-World';mesh.receiveShadow=true;root.add(mesh);
  const glyphPaths=['M1 10L1 1M1 5.4L6.6 5.1M7 1L6.7 10','M10 6.6Q14.8 6.9 14 4.9Q12.1 3.5 10.1 5.7Q8.6 9.9 14.4 9.3','M17.5 1L16.8 9.6Q17.3 10 18.4 9.5','M21.1 1L20.4 9.6Q20.9 10 22 9.5','M26.4 4.7C22.7 4.2 22.9 10.4 26.7 9.8C29.8 9.3 29.4 4.1 26.4 4.7','M35.4 1.1L36.7 10L40.7 3.1L41.8 10L46.2 1.2','M51.1 4.7C47.4 4.2 47.6 10.4 51.4 9.8C54.5 9.3 54.1 4.1 51.1 4.7','M56.7 9.8L57.1 4.8M57 6.7Q60 3.7 61 5.6','M63.9 1L63.2 9.6Q63.7 10 64.8 9.5','M69.2 4.9C65.6 4.2 65.3 10.4 69 9.8Q71.2 9.5 71.5 6.6M72.2 1L71.1 9.7','M76 1.1L75.2 7.3M75 9.7L75.02 9.9'];
  const glyphs=glyphPaths.map(d=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);return{path,length:path.getTotalLength()};});
  let active=false,elapsed=0,lastStep=-1,tip=null;
  function paint(progress) {
    const index=Math.min(10,Math.floor(progress)),fraction=THREE.MathUtils.clamp(progress-index,0,1),glyph=glyphs[index],point=glyph.path.getPointAtLength(glyph.length*fraction),gx=point.x-(index>=5?34.4:0),sx=.50*gx+.06*point.y+(index<5?49:47),sy=.008*gx+.46*point.y+(index<5?501.5:506.4),u=THREE.MathUtils.clamp((sx+97.61)/201.49,0,1),v=THREE.MathUtils.clamp(1-(sy-500.55)/14.74,0,1),[a,b,c,d]=corners;
    const position=a.map((_,j)=>u>=v?a[j]*(1-u)+b[j]*(u-v)+c[j]*v:a[j]*(1-v)+c[j]*u+d[j]*(v-u));position[1]+=.010;tip={position,normal:[0,1,0],glyph:index,fraction,active:active&&progress<glyphs.length};onTip?.(tip);
    const step=Math.floor(progress*60);if(step===lastStep)return;lastStep=step;context.fillStyle='#f3e8cd';context.fillRect(0,0,768,96);context.save();context.scale(768/201.49,96/14.74);context.translate(97.61,-500.55);context.strokeStyle='#382c24';context.lineWidth=1.02;context.lineCap='round';context.lineJoin='round';
    glyphs.forEach(({path,length},index)=>{const fraction=THREE.MathUtils.clamp(progress-index,0,1);if(!fraction)return;context.save();context.transform(.50,.008,.06,.46,index<5?49:47,index<5?501.5:506.4);if(index>=5)context.translate(-34.4,0);context.beginPath();const p0=path.getPointAtLength(0);context.moveTo(p0.x,p0.y);const count=Math.max(2,Math.ceil(length*7*fraction));for(let j=1;j<=count;j++){const p=path.getPointAtLength(j/count*length*fraction),previous=path.getPointAtLength((j-1)/count*length*fraction);if(Math.hypot(p.x-previous.x,p.y-previous.y)>.5)context.moveTo(p.x,p.y);else context.lineTo(p.x,p.y);}context.stroke();context.restore();});context.restore();texture.needsUpdate=true;
  }
  paint(0);
  return {corners,mesh,getTip:()=>tip,setActive(value){if(value&&!active){elapsed=0;lastStep=-1;}active=!!value;paint(elapsed/.64);},update(dt){if(active){elapsed=Math.min(glyphs.length*.64,elapsed+dt);paint(elapsed/.64);}},paper:{corners,normal:[0,1,0],centre:[px(3),deskTop+.016,deskZ-.03],helloStart:[px(49),deskTop+.026,deskZ-.195],helloRows:[{start:[px(49),deskTop+.026,deskZ-.195],scale:[.50,.008,.06,.46]},{start:[px(47),deskTop+.026,deskZ-.069],scale:[.50,.008,.06,.46]}]}};
}
