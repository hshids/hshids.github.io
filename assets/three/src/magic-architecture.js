import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createCraftMaterials} from './fidelity-surface-materials.js';
import {createCraftBoxGeometry} from './fidelity-craft-geometry.js';

/** Optional, building-owned joinery. No shell, route, collider or content changes.
 * Small authored details differ by building: bearing timber, window crowns,
 * a lecture-hall pennant, tank fasteners and mailbox joinery.
 * Visible warm glass is an emitter only; this module adds no lights/shadow maps.
 */
export function createMagicArchitecture({stations=[],quality='high',reduced=false}={}) {
  const low=quality==='low',segments=low?8:14,resources=new Set(),attachments=[],motion=[];
  const materials=createCraftMaterials({name:'magic-architecture',quality,resources});
  const glass=materials.glass.clone();glass.name='magic-architecture-frosted-lantern-glass';
  glass.color.set('#ecd3a2');glass.opacity=.43;glass.roughness=.38;
  glass.emissive.set('#f2c480');glass.emissiveIntensity=.075;resources.add(glass);
  const ember=new THREE.MeshStandardMaterial({name:'magic-architecture-contained-warm-wick',color:'#f3d5a0',
    emissive:'#f1b86b',emissiveIntensity:.34,roughness:.72});resources.add(ember);
  const rope=materials.cloth.clone();rope.name='magic-architecture-fine-hemp';rope.color.set('#b5a084');resources.add(rope);
  const diagnostics={version:1,quality,representatives:[],anchors:[],skipped:[],
    additionalPointLights:0,additionalShadowMaps:0,collidersAdded:0,originalInteractionsChanged:0,
    movingParts:[],limits:['Details stay on supported structural joints; no full decorative frame is repeated on every house.',
      'Warm lantern glass is self-lit and does not claim to illuminate walls.',
      'Integrated visual/contact review is required; CPU anchors do not establish visual quality.']};
  let disposed=false;
  const own=g=>{resources.add(g);return g;};
  function group(name,parent,position=[0,0,0]) {
    const g=new THREE.Group();g.name=name;g.position.fromArray(position);parent.add(g);return g;
  }
  function mesh(name,geometry,material,position,parent) {
    const m=new THREE.Mesh(own(geometry),material);m.name=name;m.position.fromArray(position);
    m.castShadow=m.receiveShadow=true;m.userData.roomSolid=true;parent.add(m);return m;
  }
  function box(name,size,position,role,parent,bevel=.009) {
    return mesh(name,createCraftBoxGeometry(size,low?bevel*.7:bevel,{grain:role==='wood'||role==='darkWood'}),materials[role],position,parent);
  }
  function line(name,a,b,r,material,parent) {
    const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const m=mesh(name,new THREE.CylinderGeometry(r,r,delta.length(),segments,1,false),material,
      new THREE.Vector3(...a).addScaledVector(delta,.5).toArray(),parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  function relief(name,points,depth,position,role,parent) {
    const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:!low,bevelSegments:1,
      bevelSize:.002,bevelThickness:.002,steps:1,curveSegments:low?4:8});
    g.translate(0,0,-depth/2);return mesh(name,g,materials[role],position,parent);
  }
  // Keep transparent glass and animated parents independent. Static surfaces
  // batch by actual material, rather than one draw call per tiny carving/peg.
  function batch(parent) {
    const bins=new Map();
    for(const m of parent.children.slice()) {
      if(!m.isMesh||m.material.transparent||m.userData.keepMesh)continue;
      m.updateMatrix();const source=m.geometry;
      const g=(source.index?source.toNonIndexed():source.clone()).applyMatrix4(m.matrix);
      if(!bins.has(m.material))bins.set(m.material,[]);bins.get(m.material).push({m,g});
    }
    for(const[material,list]of bins) {
      const merged=mergeGeometries(list.map(v=>v.g),false);
      if(!merged){list.forEach(v=>v.g.dispose());throw new Error('Architecture detail attributes disagree.');}
      const out=mesh(parent.name+'-joined-'+material.name,merged,material,[0,0,0],parent);
      out.userData.architectureDetail=true;
      out.castShadow=list.some(v=>v.m.castShadow);
      out.userData.roomSolid=list.some(v=>v.m.userData.roomSolid);
      for(const {m,g}of list){m.removeFromParent();g.dispose();m.geometry.dispose();resources.delete(m.geometry);}
    }
  }
  function attach(st) {
    const root=group('magic-architecture-'+st.id+'-physical-details',st.root);
    root.userData.architectureDetail=true;attachments.push(root);return root;
  }
  // Cast against the pre-existing roof only. The underside point is measured
  // in world space and returned in this building's own authoring coordinates.
  function roofContact(st,x,z,startY) {
    st.root.updateWorldMatrix(true,true);
    const roofs=[];st.root.traverse(m=>{
      if(!m.isMesh||m.material?.visible===false||m.userData.architectureDetail)return;
      const mats=Array.isArray(m.material)?m.material:[m.material];
      if(mats.some(mat=>mat.userData?.craft_role==='roof')||/roof|tile-skirt/.test(m.name))roofs.push(m);
    });
    const origin=st.root.localToWorld(new THREE.Vector3(x,startY,z));
    const direction=new THREE.Vector3(0,1,0).transformDirection(st.root.matrixWorld);
    const ray=new THREE.Raycaster(origin,direction,0,8*(st.scale||1));
    const hit=ray.intersectObjects(roofs,false)[0];
    if(!hit)return null;
    const p=st.root.worldToLocal(hit.point.clone());
    return {point:p.toArray(),object:hit.object.name,world:hit.point.toArray()};
  }
  function corbel(st,parent,x,z,ceiling) {
    const prefix=st.id==='research'?'library':st.id;
    const near=roofContact(st,x,z+.06,ceiling-.12),far=roofContact(st,x,z+.34,ceiling-.12);
    if(!near||!far){diagnostics.skipped.push({station:st.id,part:'bearing-corbel',x,reason:'No real roof underside.'});return;}
    const capTop=Math.min(near.point[1],far.point[1]);
    if(capTop<ceiling-.06||capTop>ceiling+.40){diagnostics.skipped.push({station:st.id,part:'bearing-corbel',x,reason:'Roof support lies outside the existing lintel interval.'});return;}
    const y0=ceiling-.155,h=capTop-y0;
    // Closed scroll-shaped knee; its root overlaps the existing column cap,
    // and its upper arm bears directly on the measured roof underside.
    const shape=new THREE.Shape();shape.moveTo(-.10,0);shape.lineTo(.035,0);
    shape.bezierCurveTo(.08,h*.16,.09,h*.51,.23,h*.56);
    shape.bezierCurveTo(.30,h*.60,.35,h*.75,.38,h-.036);
    shape.lineTo(.38,h-.015);shape.lineTo(-.10,h-.015);shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:!low,bevelSegments:1,
      bevelSize:.004,bevelThickness:.003,steps:1,curveSegments:low?4:9});
    g.rotateY(-Math.PI/2);g.translate(.07,0,0);
    mesh(prefix+'-carved-closed-bearing-knee-'+x,g,materials.wood,[x,y0,z],parent);
    // Two staggered arms are genuine solids, not coplanar decoration skins.
    for(const [i,u,d]of[[0,.045,.17],[1,.255,.20]]) {
      const width=i?.35:.27,cornerXZ=[[-width/2,-d/2],[width/2,-d/2],[width/2,d/2],[-width/2,d/2]];
      const contacts=cornerXZ.map(([dx,dz])=>roofContact(st,x+dx,z+u+dz,ceiling-.12));
      if(contacts.some(c=>!c))continue;
      // A horizontal box would cut through the curved eave at one end and
      // float at the other. Each bearing face follows its real roof corners.
      const top=contacts.map(c=>[c.point[0],c.point[1]+.004,c.point[2]]);
      const vertices=[...top,...top.map(p=>[p[0],p[1]-.046,p[2]])];
      const faces=[[0,3,2],[0,2,1],[4,5,6],[4,6,7],[0,1,5],[0,5,4],
        [1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]],positions=[],uv=[];
      for(const face of faces)for(const index of face){const p=vertices[index];positions.push(...p);uv.push(p[0],p[2]);}
      const arm=new THREE.BufferGeometry();arm.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      arm.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));arm.computeVertexNormals();
      mesh(prefix+'-roof-fitted-bearing-arm-'+x+'-'+i,arm,materials.wood,[0,0,0],parent);
    }
    for(const side of[-1,1]) {
      const carving=relief(prefix+'-inset-cloud-carving-'+x+'-'+side,
        [[-.005,0],[.105,.009],[.16,.043],[.11,.062],[.035,.053]],.014,
        [x+side*.080,y0+.045,z+.075],'darkWood',parent);
      carving.rotation.y=side*Math.PI/2;
    }
    diagnostics.anchors.push({station:st.id,kind:'timber-corbel',column:[x,ceiling-.04,z],
      roofNear:near,roofFar:far,connection:'Solid root overlaps column/lintel; upper arms embed 4mm into measured roof underside.'});
  }
  function lantern(st,parent,x,z,ceiling) {
    const contact=roofContact(st,x,z,ceiling-.12);if(!contact)return;
    const roofY=contact.point[1],pivot=group('library-small-night-lantern-top-fixed',parent,[x,roofY-.002,z]);
    box('library-lantern-roof-embedded-bearing-socket',[.090,.040,.080],[x,roofY+.009,z],'darkWood',parent,.006);
    // All pivot children rotate around the roof connection; the top of the
    // hemp cord remains fixed, and the bottom terminates in the housing cap.
    const drop=.27,cy=-drop-.15;
    line('library-continuous-hemp-hanger',[0,0,0],[0,-drop,0],.005,rope,pivot);
    const ring=mesh('library-housing-hanger-ring',new THREE.TorusGeometry(.021,.004,low?4:6,segments),materials.brass,[0,-drop+.010,0],pivot);
    ring.rotation.y=Math.PI/2;
    const profile=[new THREE.Vector2(0,-.146),new THREE.Vector2(.063,-.138),new THREE.Vector2(.086,-.105),
      new THREE.Vector2(.099,0),new THREE.Vector2(.086,.105),new THREE.Vector2(.063,.138),new THREE.Vector2(0,.146)];
    const shade=mesh('library-closed-frosted-glass-lantern',new THREE.LatheGeometry(profile,segments),glass,[0,cy,0],pivot);
    shade.castShadow=false;shade.userData.roomSolid=false;
    for(const sign of[-1,1]) {
      mesh('library-lantern-brass-cap-'+sign,new THREE.CylinderGeometry(.068,.068,.028,segments),materials.brass,[0,cy+sign*.151,0],pivot);
      mesh('library-lantern-rolled-rim-'+sign,new THREE.TorusGeometry(.071,.005,low?4:6,segments),materials.brass,[0,cy+sign*.134,0],pivot).rotation.x=Math.PI/2;
    }
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);
      line('library-lantern-cage-rib-'+i,[c*.060,cy-.136,s*.060],[c*.096,cy,s*.096],.003,materials.brass,pivot);
      line('library-lantern-cage-rib-upper-'+i,[c*.096,cy,s*.096],[c*.060,cy+.136,s*.060],.003,materials.brass,pivot);
    }
    const wick=mesh('library-contained-warm-wick',new THREE.CylinderGeometry(.018,.018,.12,low?6:8),ember,[0,cy,0],pivot);
    wick.castShadow=false;wick.userData.roomSolid=false;
    batch(pivot);motion.push({kind:'lantern',object:pivot,phase:1.4});
    diagnostics.anchors.push({station:st.id,kind:'suspended-lantern',roof:contact,
      ropeTop:[x,roofY-.002,z],housingTop:[x,roofY-drop-.002,z],connection:'Roof socket, continuous hemp cord, housing loop and capped glass.'});
    diagnostics.movingParts.push({station:st.id,kind:'lantern',maximumSwingRadians:.018,fixed:'roof attachment'});
  }
  function windowCrown(parent,{station='talks',x=-2.82,railY=2.2475,wallZ=2,windowWidth=1.14,rise=.19}={}) {
    const w=windowWidth+.115,strip=.040,steps=low?8:16,points=[],prefix=station==='talks'?'theatre':station;
    for(let i=0;i<=steps;i++){const a=Math.PI-i/steps*Math.PI;points.push([Math.cos(a)*w/2,Math.sin(a)*rise+strip/2]);}
    for(let i=steps;i>=0;i--){const a=Math.PI-i/steps*Math.PI;points.push([Math.cos(a)*(w/2-strip),Math.sin(a)*(rise-strip)-strip/2]);}
    relief(prefix+'-soft-arched-window-lintel',points,.055,[x,railY+.0175,wallZ+.116],'wood',parent);
    // The curved moulding is a supported window crown, not a new fake hole.
    for(const side of[-1,1])box(prefix+'-window-crown-bearing-foot-'+side,[.072,.066,.080],
      [x+side*(w/2-.021),railY+.0075,wallZ+.115],'darkWood',parent,.008);
    diagnostics.anchors.push({station,kind:'arched-window-crown',
      originalWindowRail:{centre:[x,railY,wallZ],outerFaceZ:wallZ+.11,width:windowWidth+.15},
      newBackFaceZ:wallZ+.0885,connection:'Moulding back enters original rail/wall; end feet bear on the original upper window rail.'});
  }
  function clothGeometry(w,h,columns,rows) {
    const points=[],uv=[],indices=[],rest=[];
    for(const side of[-1,1])for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++) {
      const u=col/columns,v=row/rows,x=(u-.5)*w,y=-v*h+.022*Math.sin(u*Math.PI)*v*v,z=side*.004;
      points.push(x,y,z);uv.push(u,v);rest.push({x,y,z,u,v});
    }
    const count=(rows+1)*(columns+1),at=(side,row,col)=>side*count+row*(columns+1)+col;
    for(let side=0;side<2;side++)for(let row=0;row<rows;row++)for(let col=0;col<columns;col++) {
      const a=at(side,row,col),b=at(side,row,col+1),c=at(side,row+1,col+1),d=at(side,row+1,col);
      if(side===0)indices.push(a,b,d,b,c,d);else indices.push(a,d,b,b,d,c);
    }
    const seam=(a,b)=>indices.push(a,b,b+count,a,b+count,a+count);
    for(let col=0;col<columns;col++){seam(at(0,0,col+1),at(0,0,col));seam(at(0,rows,col),at(0,rows,col+1));}
    for(let row=0;row<rows;row++){seam(at(0,row,0),at(0,row+1,0));seam(at(0,row+1,columns),at(0,row,columns));}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
    // Bounding sphere already includes the small authored wind envelope.
    g.boundingSphere.radius+=.05;return {geometry:g,rest};
  }
  function pennant(parent) {
    // The rightmost front post is x=2.0; bracket root embeds in its timber
    // face. A narrow banner lives outside the adjacent window's right edge.
    box('theatre-pennant-corner-post-mount',[.075,.095,.14],[1.97,3.30,2.079],'darkWood',parent,.009);
    line('theatre-bearing-banner-cantilever',[1.97,3.30,2.13],[1.745,3.30,2.18],.012,materials.brass,parent);
    line('theatre-banner-supported-upper-crossbar',[1.62,3.30,2.18],[1.87,3.30,2.18],.009,materials.brass,parent);
    line('theatre-banner-fixed-top-rail',[1.62,3.27,2.18],[1.87,3.27,2.18],.009,materials.brass,parent);
    for(const x of[1.66,1.83])line('theatre-banner-two-hemp-knots-'+x,[x,3.30,2.18],[x,3.267,2.18],.0035,rope,parent);
    const cloth=materials.blue.clone();cloth.name='magic-architecture-theatre-woven-blue';cloth.roughness=.89;
    cloth.userData.craft_role='cloth';resources.add(cloth);
    const {geometry,rest}=clothGeometry(.205,.37,low?2:4,low?4:8);
    const flag=mesh('theatre-closed-thin-cloth-pennant',geometry,cloth,[1.745,3.263,2.19],parent);
    flag.userData.keepMesh=true;
    motion.push({kind:'cloth',object:flag,rest,phase:2.1});
    diagnostics.anchors.push({station:'talks',kind:'small-pennant',post:[2,3.30,2],mount:[1.97,3.30,2.079],
      fixedTop:[1.745,3.263,2.19],clothBounds:{minX:1.6425,maxX:1.8475,bottomY:2.893},
      adjacentWindowRightX:1.55,connection:'Solid corner-post bracket, brass rod, two hemp knots and an immobile cloth top seam.'});
    diagnostics.movingParts.push({station:'talks',kind:'cloth',maxDepthMotion:.028,fixed:'all top-row vertices',shadow:'Actual position-buffer deformation; the shadow pass uses the same geometry.'});
  }
  function tankFasteners(st,parent) {
    // These coordinates come from the existing welded flange's actual solid
    // bounds, not an assumed 2D tank picture or the caption's picking proxy.
    const band=st.source?.parts?.find(p=>p.name==='davis-tank-fine-weld-band-upper');
    if(!band){diagnostics.skipped.push({station:st.id,part:'tank-fasteners',reason:'No existing welded flange metadata.'});return;}
    const centre=band.min.map((v,i)=>(v+band.max[i])/2),major=(band.max[0]-band.min[0])/2-.0045;
    let original=null;st.root.traverse(m=>{if(m.isMesh&&m.material?.name==='ec-davis-painted-metal')original=m.material;});
    if(!original){diagnostics.skipped.push({station:st.id,part:'tank-fasteners',reason:'Original tank metal material unavailable.'});return;}
    const metal=original.clone();metal.name='magic-architecture-davis-matching-steel';resources.add(metal);
    const count=low?8:12;
    for(let i=0;i<count;i++) {
      const a=i/count*Math.PI*2;
      mesh('davis-upper-flange-supported-small-fastener-'+i,new THREE.CylinderGeometry(.0075,.0075,.006,6),metal,
        [centre[0]+Math.cos(a)*major,centre[1]+.004,centre[2]+Math.sin(a)*major],parent);
    }
    diagnostics.anchors.push({station:st.id,kind:'tank-flange-fasteners',existingPart:band.name,
      flangeCentre:centre,flangeMajorRadius:major,fastenerCount:count,
      contact:'Hex heads enter the welded flange by 3.5mm; all fasteners remain above the UC DAVIS lettering.'});
  }
  function mailboxJoinery(parent) {
    for(const x of[.35,.88]) {
      const washer=mesh('contact-mailbox-post-crossbar-brass-washer-'+x,
        new THREE.TorusGeometry(.013,.0022,low?4:6,segments),materials.brass,[x,.715,.0615],parent);
      mesh('contact-mailbox-embedded-hex-pin-'+x,new THREE.CylinderGeometry(.009,.009,.012,6),materials.brass,[x,.715,.064],parent).rotation.x=Math.PI/2;
      washer.userData.roomSolid=true;
      diagnostics.anchors.push({station:'contact',kind:'mailbox-structural-pin',postFront:[x,.715,.060],
        pinCentre:[x,.715,.064],connection:'Pin embeds 2mm into the existing timber post; washer rests on the original front face, away from slot/letter/flag.'});
    }
  }

  for(const st of stations) {
    if(!st.root?.isObject3D||!['home','research','talks','education','writing','life','contact'].includes(st.id))continue;
    const parent=attach(st);
    if(st.id==='research') {
      corbel(st,parent,-3.14,-.31,2.486);corbel(st,parent,3.14,-.31,2.486);
      lantern(st,parent,3.38,.015,2.486);
    }else if(st.id==='talks'){windowCrown(parent);pennant(parent);}
    else if(st.id==='home') {
      const bounds=st.source?.rooms?.[0]?.bounds;
      if(bounds)for(const x of[bounds.min[0],bounds.max[0]])corbel(st,parent,x,bounds.max[2],bounds.max[1]);
      else diagnostics.skipped.push({station:st.id,part:'gatehall-joinery',reason:'No original gatehall room bounds.'});
    }else if(st.id==='life') {
      const bounds=st.source?.rooms?.[0]?.bounds;
      if(bounds)for(const x of[-1.32,1.32])corbel(st,parent,x,bounds.max[2],bounds.max[1]);
      else diagnostics.skipped.push({station:st.id,part:'home-veranda-joinery',reason:'No original home room bounds.'});
    }else if(st.id==='writing')windowCrown(parent,{station:'writing',x:4.28,railY:2.2675,wallZ:.60,windowWidth:1.10,rise:.15});
    else if(st.id==='education')tankFasteners(st,parent);
    else if(st.id==='contact')mailboxJoinery(parent);
    batch(parent);diagnostics.representatives.push(st.id);
  }
  function update(time=0) {
    if(disposed)return;
    for(const m of motion) {
      if(m.kind==='lantern') {
        m.object.rotation.z=reduced?0:.018*Math.sin(time*.63+m.phase);
        m.object.rotation.x=reduced?0:.008*Math.sin(time*.47+m.phase);
      }else {
        const p=m.object.geometry.attributes.position;
        for(let i=0;i<m.rest.length;i++) {
          const r=m.rest[i],weight=r.v*r.v;
          const bend=weight*(.013*Math.sin(r.u*Math.PI)+(reduced?0:.015*Math.sin(time*.76+m.phase+r.u*1.4-r.v)));
          p.setXYZ(i,r.x,r.y,r.z+bend);
        }
        p.needsUpdate=true;m.object.geometry.computeVertexNormals();
      }
    }
  }
  update(0);
  let triangles=0,drawCalls=0,geometryBytes=0;
  for(const root of attachments)root.traverse(m=>{
    if(!m.isMesh)return;drawCalls++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;
  });
  for(const r of resources)if(r.isBufferGeometry){for(const a of Object.values(r.attributes))geometryBytes+=a.array.byteLength;geometryBytes+=r.index?.array.byteLength||0;}
  Object.assign(diagnostics,{triangles,drawCalls,geometryBytes,materialCount:[...resources].filter(r=>r.isMaterial).length,
    textureOwnership:'One shared craft-material tier lease; no extra canvas, bitmap or per-detail texture.'});
  return {attachments,diagnostics,update,dispose(){
    if(disposed)return;disposed=true;for(const a of attachments){a.removeFromParent();a.clear();}
    resources.forEach(r=>r.dispose?.());resources.clear();motion.length=0;
  }};
}
