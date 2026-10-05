import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createLehighCampus} from './fidelity-campus-lehigh.js';
import {createCraftMaterials,applyCraftSurface,worldUV} from './fidelity-surface-materials.js';

/** Complete outdoor keepsakes, with coherent lit materials on every side.
 * Printed lettering is painted on real boards/metal, never an architectural
 * photograph. All old content IDs, action poses and mail callbacks remain. */
export async function createFaithfulEducationContact({data=globalThis.window?.HJ_DATA,quality='high'}={}) {
  const root=new THREE.Group();root.name='faithful-education-contact';
  const resources=new Set(),parts=[],batches=new Map(),lights=[],attachments=[];
  const surfaces=createCraftMaterials({name:'education-contact',quality,resources});
  const radial=quality==='low'?18:32,curves=quality==='low'?4:8;
  const material=(name,color,extra={})=>{const Material=extra.clearcoat?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;const m=new Material({color,roughness:.77,...extra});m.name=`ec-${name}`;resources.add(m);return m;};
  const stone=material('stone','#a89c85'),cream=material('limestone','#d5c6ac'),wood=material('oak','#89613e'),darkWood=material('dark-timber','#674a33');
  const bark=material('branch-bark','#846147'),leaf=material('oak-leaves','#7b9660'),leafLight=material('leaf-tips','#94a977');
  const ropeMat=material('hemp-rope','#bfaa82',{roughness:1}),roof=material('slate','#4d6277',{roughness:.66});
  // Healy Hall is Potomac gneiss, a grey stone with blue and brown in it, trimmed in pale sandstone
  const gtStone=material('georgetown-potomac-gneiss','#7c7d77'),gtTrim=material('georgetown-carved-sandstone','#c4ae88');
  const gtBlocks=['#7c7d77','#6f6a61','#858b88','#8e8475','#73777a'].map((c,i)=>material('georgetown-gneiss-block-'+i,c));
  const metal=material('davis-painted-metal','#bfc6bb',{metalness:.42,roughness:.40,envMapIntensity:.60});
  // UC Davis: Aggie blue and gold
  const navy=material('davis-aggie-blue','#22426e'),gold=material('brass','#c6a25d',{metalness:.4,roughness:.48}),rubber=material('bike-rubber','#414448');
  const aggieGold=material('davis-aggie-gold','#d6a630',{roughness:.6});
  const red=material('mailbox-red-enamel','#bf5347',{metalness:.16,roughness:.5,clearcoat:.18,clearcoatRoughness:.60}),mailInside=material('mailbox-interior','#373a3b');
  const glass=material('campus-recessed-glass','#738794',{roughness:.35,emissive:'#ffc979',emissiveIntensity:0});
  const lampMat=material('warm-lamp-glass','#bba573',{roughness:.3,emissive:'#ffe5aa',emissiveIntensity:0});
  const paper=material('letter-paper','#eee0bf'),ink=material('letter-crease','#b2a17f');
  for(const m of[stone,cream,gtTrim])applyCraftSurface(m,surfaces.stone);
  for(const m of[gtStone,...gtBlocks])applyCraftSurface(m,surfaces.granite);
  const realScale=new Set([stone,cream,gtStone,gtTrim,...gtBlocks]);   // these get UVs at a fixed real-world size
  applyCraftSurface(wood,surfaces.wood);applyCraftSurface(darkWood,surfaces.darkWood);applyCraftSurface(bark,surfaces.wood,{preserveRoughness:true});
  applyCraftSurface(roof,surfaces.roof,{preserveRoughness:true});applyCraftSurface(red,surfaces.red,{preserveRoughness:true});
  applyCraftSurface(paper,surfaces.paper);applyCraftSurface(ropeMat,surfaces.cloth,{preserveRoughness:true});applyCraftSurface(navy,surfaces.blue);
  const bannerFabric=material('campus-aggie-blue-banner','#22426e');applyCraftSurface(bannerFabric,surfaces.cloth);applyCraftSurface(aggieGold,surfaces.cloth,{preserveRoughness:true});
  const e=scene('education'),c=scene('contact');root.add(e.root,c.root);
  function scene(id){const group=new THREE.Group();group.name=`chapter-${id}-faithful`;return {id,root:group,walkAreas:[],colliders:[],interactables:[],actionStand:{},parts:[]};}
  const S=(x,y,w,h,nw,nh)=>({X:n=>(x+n*w/nw)/85,Y:n=>(560-y-n*h/nh)/85,point(n,p,z=0){return[this.X(n),this.Y(p),z];}});
  const bs=S(-277,386,170,174,663,677),ms=S(-46,400,222,160,711,478),phd=S(193,404,217,156,733,429);
  const post=S(13,407,74,149,222,336),signs=S(178,344.565,148,216,473,765),links=data?.person?.links||{};
  function add(st,name,g,m,p=[0,0,0],rotation=[0,0,0],parent=null,extra={}) {
    if(parent) {
      resources.add(g);const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.position.set(...p);mesh.rotation.set(...rotation);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
    }
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));
    g.computeBoundingBox();const part={name,scene:st.id,min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray(),construction:'closed lit polygonal solid',...extra};parts.push(part);st.parts.push(part);
    if(realScale.has(m)&&g.getAttribute('normal'))worldUV(g,.3);
    if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const key=`${st.id}/${m.uuid}`;if(!batches.has(key))batches.set(key,{st,m,gs:[]});batches.get(key).gs.push(g);return g;
  }
  function box(st,name,min,max,m=wood,parent=null){
    const size=max.map((v,i)=>v-min[i]);
    // Bevel only the pieces a visitor handles or reads. Brick courses and
    // structural wall cores keep their inexpensive, exactly seated topology.
    const crafted=/plaque|original-caption$|physical-forecourt|mailbox-(?:grounded-wood-leg|wood-ground-foot|under-box-support|lower-wood-crossbar|brass-slot-rim|door-attached-hinge|raised-brass-flag)|contact-link-rooted-wood-post|bike-leather-seat/.test(name);
    const radius=Math.min(.006,...size.map(v=>v*.13));
    const g=crafted?new RoundedBoxGeometry(...size,1,radius):new THREE.BoxGeometry(...size);
    if((m===wood||m===darkWood)&&size[0]>size[1]&&size[0]>=size[2])alongBoard(g);
    return add(st,name,g,m,min.map((v,i)=>(v+max[i])/2),undefined,parent);
  }
  function alongBoard(g){const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++){const u=uv.getX(i);uv.setXY(i,uv.getY(i),u);}return g;}
  function softExtrude(shape,depth,radius=.0012) {
    const r=Math.min(radius,depth*.16);
    const g=new THREE.ExtrudeGeometry(shape,{depth:depth-2*r,steps:1,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:1,curveSegments:curves});
    g.translate(0,0,r);return g;
  }
  const cyl=(st,name,rt,rb,h,p,m,segments=radial,rot=[0,0,0],parent=null)=>add(st,name,new THREE.CylinderGeometry(rt,rb,h,segments),m,p,rot,parent);
  function tube(st,name,start,end,r1,r2,m=bark,parent=null) {
    const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),delta=b.clone().sub(a);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
    return add(st,name,new THREE.CylinderGeometry(r2,r1,delta.length(),quality==='low'?6:10),m,a.add(b).multiplyScalar(.5).toArray(),new THREE.Euler().setFromQuaternion(q).toArray().slice(0,3),parent);
  }
  function polygon(st,name,outline,front,depth,m=wood,holes=[],parent=null) {
    const shape=new THREE.Shape(outline.map(v=>new THREE.Vector2(...v)));shape.holes=holes.map(h=>new THREE.Path(h.map(v=>new THREE.Vector2(...v))));
    const g=/contact-link-.*-solid-arrow/.test(name)?softExtrude(shape,depth,.002):new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:curves});
    if(m===wood&&/solid-arrow/.test(name))alongBoard(g);
    return add(st,name,g,m,[0,0,front-depth],undefined,parent);
  }
  function arch(w,h,cx=0,bottom=0){const q=new THREE.Shape();q.moveTo(cx-w/2,bottom);q.lineTo(cx+w/2,bottom);q.lineTo(cx+w/2,bottom+h-w/2);q.absarc(cx,bottom+h-w/2,w/2,0,Math.PI,false);q.lineTo(cx-w/2,bottom);return q;}
  function labelMaterial(name,text,width,height,color='#89613e',font='Georgia',fontWeight='bold') {
    const cv=document.createElement('canvas');cv.width=quality==='low'?512:1024;cv.height=Math.max(96,Math.round(cv.width*height/width));
    const ctx=cv.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,cv.width,cv.height);
    // Low-contrast grain and a cut inner border belong to the wooden face,
    // rather than another bright outlined interface card on top of the sign.
    ctx.lineWidth=1;ctx.strokeStyle='rgba(49,29,16,.075)';
    for(let j=0;j<26;j++){const yy=(j+.5)*cv.height/26;ctx.beginPath();for(let k=0;k<=12;k++){const xx=k*cv.width/12,wy=yy+Math.sin(k*.72+j*1.37)*cv.height*.009;k?ctx.lineTo(xx,wy):ctx.moveTo(xx,wy);}ctx.stroke();}
    ctx.lineWidth=Math.max(1,cv.height*.010);ctx.strokeStyle='#573d29';ctx.strokeRect(14,12,cv.width-28,cv.height-24);
    ctx.strokeStyle='rgba(232,204,154,.48)';ctx.strokeRect(15,13,cv.width-30,cv.height-26);
    ctx.textAlign='center';ctx.textBaseline='middle';const size=Math.min(cv.height*.57,cv.width/(Math.max(1,text.length)*.66));ctx.font=`${fontWeight} ${size}px ${font}`;
    const cut=Math.max(1,cv.height*.007);ctx.lineWidth=Math.max(1,cv.height*.012);ctx.strokeStyle='#4b3423';ctx.strokeText(text,cv.width/2,cv.height/2-cut,cv.width*.92);
    ctx.fillStyle='#b3905c';ctx.fillText(text,cv.width/2+cut,cv.height/2+cut,cv.width*.92);ctx.fillStyle='#f0d6a3';ctx.fillText(text,cv.width/2,cv.height/2,cv.width*.92);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;resources.add(tex);
    const label=material(name,'#ffffff',{map:tex,roughness:.82});
    // The glyph canvas remains the albedo: borrow only the shared wood relief,
    // never replace readable lettering with the neutral texture template.
    applyCraftSurface(label,surfaces.wood,{preserveRoughness:true});label.map=tex;return label;
  }
  function board(st,name,text,cx,cy,front,w,h=.31,depth=.065,m=wood) {
    box(st,name,[cx-w/2,cy-h/2,front-depth],[cx+w/2,cy+h/2,front],m);
    const label=labelMaterial(`${name}-printed-face`,text,w,h,`#${m.color.getHexString()}`);
    box(st,`${name}-inset-print`,[cx-w*.48,cy-h*.45,front-.002],[cx+w*.48,cy+h*.45,front+.001],label);
    attachments.push({name,surface:front,labelMinZ:front-.002,labelMaxZ:front+.001});
  }
  const coll=(st,id,minX,maxX,minZ,maxZ,maxY=4)=>st.colliders.push({id,minX,maxX,minZ,maxZ,minY:0,maxY});
  const pickMaterial=new THREE.MeshStandardMaterial({visible:false});pickMaterial.name='ec-hidden-ray-proxy';resources.add(pickMaterial);
  function target(st,id,type,point,title,extra={}) {
    const size=type==='school'?(id==='education-ms'?[.48,1.10,.20]:id==='education-phd'?[.68,1.18,.24]:[.80,.70,.22]):type==='link'?[1.40,.29,.12]:type==='mail'?[.64,.63,.14]:[.42,.45,.42];
    const geometry=new THREE.BoxGeometry(...size);resources.add(geometry);const object=new THREE.Mesh(geometry,pickMaterial);
    object.name=`interaction-${id}`;object.position.fromArray(point);object.visible=false;object.userData.interaction=id;object.userData.roomSolid=false;st.root.add(object);
    const item={id,type,point,title,focus:st.id,station:st.id,object,...extra};st.interactables.push(item);return item;
  }
  // This must happen before material merging: the name is a part manifest
  // entry, not a retained Mesh. A 6 mm finished lip clears the garden Y0 tiles.
  for(const st of [e,c])box(st,`${st.id}-physical-forecourt`,[st===e?-4.47:-4.15,-.085,-1.25],[st===e?4.83:4,.006,.65],stone);
  function caption(name,text,cx,w,z){board(e,`${name}-original-caption`,text,cx,.17,z,w);box(e,`${name}-caption-ground-foot`,[cx-.14,0,z-.09],[cx+.14,.046,z+.02],stone);coll(e,`${name}-original-caption-solid-low-board`,cx-w/2,cx+w/2,z-.065,z+.001,.325);}
  // Davis: closed metal tank, four actual legs and bracing, a full bicycle.
  {
    const s=bs,u=(170/663)/85,z=-.363,cx=s.X(383),floor=.105;
    box(e,'davis-original-stone-plinth',[s.X(0),0,-.87],[s.X(663),floor,.12],stone);
    const profile=[[0,s.Y(318)],[15*u,s.Y(318)],[58*u,s.Y(303)],[109*u,s.Y(283)],[139*u,s.Y(273)],[159*u,s.Y(251)],[151*u,s.Y(239)],[151*u,s.Y(123)],[168*u,s.Y(115)],[164*u,s.Y(101)],[145*u,s.Y(76)],[109*u,s.Y(54)],[66*u,s.Y(39)],[0,s.Y(33)]];
    add(e,'davis-unified-dome-tank-bowl',new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),radial),metal,[cx,0,z]);
    cyl(e,'davis-tank-cupola',.025,.052,s.Y(0)-s.Y(39),[cx,(s.Y(0)+s.Y(39))/2,z],metal,8);
    const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#bfc6bb';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#40546a';ctx.font='bold 66px Arial';ctx.textAlign='center';ctx.textBaseline='middle';for(const xx of [256,768])ctx.fillText('UC DAVIS',xx,128,425);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;resources.add(tex);const tankLettering=material('davis-printed-tank','#ffffff',{map:tex,metalness:.42,roughness:.40,envMapIntensity:.60});
    cyl(e,'davis-uc-davis-metal-lettering',151*u+.001,151*u+.001,s.Y(123)-s.Y(239),[cx,(s.Y(123)+s.Y(239))/2,z],tankLettering,radial,[0,-Math.PI/2,0]);
    for(const [name,yy]of [['lower',s.Y(239)],['upper',s.Y(123)]])add(e,`davis-tank-fine-weld-band-${name}`,new THREE.TorusGeometry(151*u+.002,.0045,5,radial),metal,[cx,yy,z],[Math.PI/2,0,0]);
    for(const [i,[tx,bx,zz]]of [[0,[277,243,-.03]],[1,[478,505,-.03]],[2,[260,228,-.65]],[3,[499,529,-.65]]]){
      tube(e,`davis-load-bearing-leg-${i}`,s.point(bx,620,zz),s.point(tx,274,zz),.053,.042,metal);
      box(e,`davis-grounded-foot-${i}`,[s.X(bx)-.095,floor,zz-.095],[s.X(bx)+.095,s.Y(620)+.018,zz+.095],cream);
    }
    for(const [i,[a,b]]of [[0,[[277,294,-.03],[505,600,-.03]]],[1,[[478,294,-.03],[243,600,-.03]]],[2,[[260,294,-.65],[529,600,-.65]]],[3,[[499,294,-.65],[228,600,-.65]]]])tube(e,`davis-cross-brace-${i}`,s.point(...a),s.point(...b),.012,.012,metal);
    tube(e,'davis-centre-water-pipe',s.point(378,610,z),s.point(378,310,z),.024,.024,metal);
    // The banner is a true thick printed fabric slab attached to its mast.
    tube(e,'davis-banner-mast',s.point(533,298,-.17),s.point(603,298,-.17),.009,.009,gold);
    polygon(e,'davis-blue-gold-banner',[[s.X(544),s.Y(304)],[s.X(600),s.Y(304)],[s.X(600),s.Y(443)],[s.X(573),s.Y(425)],[s.X(544),s.Y(443)]],-.17,.012,bannerFabric);
    polygon(e,'davis-banner-gold-band',[[s.X(544),s.Y(392)],[s.X(600),s.Y(392)],[s.X(600),s.Y(406)],[s.X(544),s.Y(406)]],-.17,.016,aggieGold);
    const wheelR=61*u,wheelY=floor+wheelR,bp=(xx,yy,zz=.19)=>[s.X(xx),s.Y(yy)+(wheelY-s.Y(581)),zz];
    for(const xx of [81,260]) {
      add(e,`davis-bike-tire-${xx}`,new THREE.TorusGeometry(wheelR,.018,6,radial),rubber,[s.X(xx),wheelY,.19]);
      add(e,`davis-bike-rim-${xx}`,new THREE.TorusGeometry(wheelR-.021,.004,4,radial),metal,[s.X(xx),wheelY,.19]);
      for(let j=0;j<8;j++){const a=j*Math.PI/4; tube(e,`davis-bike-spoke-${xx}-${j}`,[s.X(xx),wheelY,.19],[s.X(xx)+Math.cos(a)*(wheelR-.026),wheelY+Math.sin(a)*(wheelR-.026),.19],.002,.002,metal);}
      cyl(e,`davis-bike-hub-${xx}`,.012,.012,.07,[s.X(xx),wheelY,.19],metal,8,[Math.PI/2,0,0]);
    }
    for(const [name,path,r]of [
      ['front-fork',[[110,484],[81,581]],.009],['front-steering',[[113,456],[106,493]],.009],
      ['step-through-upper',[[111,493],[145,529],[197,554],[217,497]],.012],
      ['step-through-lower',[[108,509],[146,554],[177,583],[216,515]],.009],
      ['rear-triangle',[[216,514],[260,581],[177,583],[216,514]],.009],
      ['handlebar',[[110,456],[99,449],[102,439],[121,438]],.007],['seat-post',[[210,526],[215,496]],.009]])
      for(let j=0;j<path.length-1;j++)tube(e,`davis-bike-${name}-${j}`,bp(...path[j]),bp(...path[j+1]),r,r,navy);
    box(e,'davis-bike-leather-seat',[s.X(192),bp(0,499)[1],.168],[s.X(236),bp(0,488)[1],.223],darkWood);
    // An open wicker basket is built from bars, not an opaque front painting.
    const bx=s.X(77),by=bp(0,501)[1];box(e,'davis-bike-basket-base',[bx-.066,by-.048,.235],[bx+.066,by-.040,.35],wood);
    for(let j=0;j<5;j++)for(const zz of [.235,.35])tube(e,`davis-bike-basket-upright-${j}-${zz}`,[bx-.066+j*.033,by-.045,zz],[bx-.074+j*.037,by+.072,zz],.004,.004,wood);
    for(const yy of [by-.006,by+.033,by+.072]) {
      box(e,`davis-bike-basket-front-weave-${yy}`,[bx-.074,yy,.232],[bx+.074,yy+.005,.238],wood);
      box(e,`davis-bike-basket-back-weave-${yy}`,[bx-.074,yy,.347],[bx+.074,yy+.005,.353],wood);
    }
    tube(e,'davis-bike-kickstand',bp(187,583,.17),[s.X(186),floor,.27],.006,.006,metal);
    const lp=bp(68,524,.28);cyl(e,'davis-bike-lamp-housing',.023,.023,.04,[lp[0],lp[1],lp[2]-.012],metal,8,[Math.PI/2,0,0]);
    cyl(e,'davis-bike-lamp-lens',.019,.019,.006,[lp[0],lp[1],lp[2]+.011],lampMat,8,[Math.PI/2,0,0]);
    add(e,'davis-bike-lamp-attached-metal-bezel',new THREE.TorusGeometry(.0205,.0022,5,radial),metal,[lp[0],lp[1],lp[2]+.014]);
    const light=new THREE.PointLight('#ffdf9b',0,.75,2);light.name='davis-bicycle-warm-lamp';light.position.set(...lp);e.root.add(light);lights.push({light,intensity:.17});
    const beam=new THREE.SpotLight('#ffe2a5',0,1.1,.47,.65,2);beam.name='davis-bicycle-ground-beam';beam.position.set(...lp);beam.target.position.set(s.X(20),floor+.002,.5);e.root.add(beam,beam.target);lights.push({light:beam,intensity:.4});
    caption('bs','B.S. · UC Davis',-192/85,162/85,.39);
    target(e,'education-bs','school',s.point(370,210,.096),'B.S. · UC Davis',{school:'bs',focus:{education:'bs'}});
    coll(e,'davis-water-tower',s.X(215),s.X(545),-.87,.14,2.1);coll(e,'davis-bicycle',s.X(18),s.X(328),.10,.43,.75);
  }
  // Georgetown Healy Hall: each wing has real front/back/side window recesses.
  function brickCourses(st,name,outline,holes,p,a,depth=.035) {
    const minX=Math.min(...outline.map(v=>v[0])),maxX=Math.max(...outline.map(v=>v[0])),minY=Math.min(...outline.map(v=>v[1])),maxY=Math.max(...outline.map(v=>v[1]));
    const blocked=holes.map(h=>h.getPoints(curves)).map(q=>({l:Math.min(...q.map(v=>v.x))-.015,r:Math.max(...q.map(v=>v.x))+.015,b:Math.min(...q.map(v=>v.y))-.012,t:Math.max(...q.map(v=>v.y))+.012}));
    const inside=(xx,yy)=>{let ok=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const v=outline[i],w=outline[j];if((v[1]>yy)!==(w[1]>yy)&&xx<(w[0]-v[0])*(yy-v[1])/(w[1]-v[1])+v[0])ok=!ok;}return ok;};
    const bw=quality==='low'?.17:.13,bh=quality==='low'?.095:.078,pose=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,a,0)),new THREE.Vector3(1,1,1));
    for(let row=0,yy=minY+.005;yy+bh<maxY;row++,yy+=bh)for(let xx=minX-(row%2)*bw/2;xx<maxX;xx+=bw){
      const l=Math.max(minX+.004,xx+.004),r=Math.min(maxX-.004,xx+bw-.004),b=yy,t=yy+bh-.007;
      if(r-l<.025||![[l,b],[r,b],[l,t],[r,t]].every(q=>inside(...q))||blocked.some(q=>l<q.r&&r>q.l&&b<q.t&&t>q.b))continue;
      const g=new THREE.BoxGeometry(r-l,t-b,.009);g.translate((l+r)/2,(b+t)/2,depth+.0015);g.applyMatrix4(pose);add(st,`${name}-stone-block-${row}-${Math.round(xx*1000)}`,g,gtBlocks[((row*7+Math.round(xx*1000)*13)%gtBlocks.length+gtBlocks.length)%gtBlocks.length]);
    }
  }
  function campusWindow(st,name,w,h,p,a,door=false) {
    const pose=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,a,0)),new THREE.Vector3(1,1,1));
    const placed=(suffix,g,m,offset)=>{g.translate(...offset);g.applyMatrix4(pose);add(st,`${name}-${suffix}`,g,m);};
    const rim=arch(w+.024,h+.014,0,-.007);rim.holes=[new THREE.Path(arch(w,h).getPoints(curves))];
    placed('embedded-frame',softExtrude(rim,.023),gtTrim,[0,0,-.011]);
    placed('inset-pane',new THREE.ExtrudeGeometry(arch(w-.004,h-.007),{depth:.012,bevelEnabled:false,curveSegments:curves}),door?darkWood:glass,[0,.002,-.024]);
    placed('centre-mullion',new THREE.BoxGeometry(.005,h-w*.35,.006),gold,[0,(h-w*.35)/2,-.005]);
    if(!door)placed('cross-mullion',new THREE.BoxGeometry(w-.004,.005,.006),gold,[0,h*.54,-.005]);
    attachments.push({name,wallPoint:p,angle:a,frameBack:-.011,frameFront:.012,paneFront:-.012});
  }
  function wall(st,name,width,bottom,top,p,a,windows,m=gtStone) {
    const q=new THREE.Shape([new THREE.Vector2(-width/2,bottom),new THREE.Vector2(width/2,bottom),new THREE.Vector2(width/2,top),new THREE.Vector2(-width/2,top)]);
    q.holes=windows.map(w=>new THREE.Path(arch(w.w,w.h,w.x,w.y).getPoints(curves)));
    const depth=.035,g=new THREE.ExtrudeGeometry(q,{depth,bevelEnabled:false,curveSegments:curves});
    const wallP=[p[0]-depth*Math.sin(a),0,p[2]-depth*Math.cos(a)];add(st,name,g,m,wallP,[0,a,0]);
    brickCourses(st,name,[[-width/2,bottom],[width/2,bottom],[width/2,top],[-width/2,top]],windows.map(w=>arch(w.w,w.h,w.x,w.y)),wallP,a,depth);
    for(const w of windows)campusWindow(st,`${name}-${w.name}`,w.w,w.h,[p[0]+w.x*Math.cos(a),w.y,p[2]-w.x*Math.sin(a)],a,w.door);
  }
  function house(name,l,r,bottom,eave,peak,front,back,windows) {
    const cx=(l+r)/2,depth=front-back;
    for(const [side,z,a]of [['front',front,0],['back',back,Math.PI]]) {
      wall(e,`${name}-${side}-wall`,r-l,bottom,eave,[cx,0,z],a,windows.map(w=>({...w,x:(w.x-cx)*(a? -1:1)})));
      polygon(e,`${name}-${side}-stone-gable`,[[l,eave],[r,eave],[cx,peak]],z+(a?.035:0),.035,gtStone);
      brickCourses(e,`${name}-${side}-gable`,[[l*(a?-1:1),eave],[r*(a?-1:1),eave],[cx*(a?-1:1),peak]],[],[0,0,z-.035*(a?-1:1)],a,.035);
    }
    const sideWindows=[{name:'side-low',x:0,y:bottom+.065,w:.055,h:Math.min(.22,eave-bottom-.12)}];
    for(const [side,xx,a]of [['left',l,-Math.PI/2],['right',r,Math.PI/2]])wall(e,`${name}-${side}-wall`,depth,bottom,eave,[xx,0,(front+back)/2],a,sideWindows);
    box(e,`${name}-floor`,[l,bottom,back],[r,bottom+.026,front],stone);
    const half=(r-l)/2,rise=peak-eave,angle=Math.atan2(rise,half),span=(half+.03)/Math.cos(angle);
    for(const side of [-1,1]) {
      const p=[cx+side*(half+.03)/2,peak-rise*(half+.03)/(2*half)+.016/Math.cos(angle),(front+back)/2],rot=[0,0,-side*angle];
      add(e,`${name}-slate-roof-${side}`,new THREE.BoxGeometry(span,.032,depth+.07),roof,p,rot);
      const pose=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(1,1,1));
      const rows=Math.max(2,Math.ceil(span/(quality==='low'?.15:.105))),cols=Math.ceil((depth+.07)/(quality==='low'?.20:.145));
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const g=new THREE.BoxGeometry(span/rows-.004,.012,(depth+.07)/cols-.006);g.translate(-span/2+(i+.5)*span/rows,.019,-(depth+.07)/2+(j+.5)*(depth+.07)/cols);g.applyMatrix4(pose);add(e,`${name}-lapped-slate-${side}-${i}-${j}`,g,roof);}
    }
    cyl(e,`${name}-ridge`,.015,.015,depth+.07,[cx,peak+.021,(front+back)/2],roof,8,[Math.PI/2,0,0]);
  }
  {
    const s=ms,floor=.106;
    box(e,'georgetown-stone-foundation',[s.X(0),0,-.95],[s.X(711),floor,.10],stone);
    for(let j=0;j<12;j++)for(const zz of [.10,-.95])box(e,`georgetown-plinth-block-${j}-${zz}`,[s.X(0)+(s.X(711)-s.X(0))*j/12+.004,.009,zz-.004],[s.X(0)+(s.X(711)-s.X(0))*(j+1)/12-.004,.096,zz+.006],stone);
    const windows=(xs,ys=[320,385])=>xs.flatMap(xx=>ys.map(yy=>({name:`window-${xx}-${yy}`,x:s.X(xx),y:s.Y(yy)-.107,w:.046,h:.107})));
    house('georgetown-left-wing',s.X(53),s.X(208),floor,s.Y(298),s.Y(214),0,-.61,windows([83,112,173]));
    house('georgetown-middle-wing',s.X(250),s.X(385),floor,s.Y(299),s.Y(225),.016,-.65,[...windows([308,341],[316]),{name:'entrance',x:s.X(332),y:floor,w:.15,h:.20,door:true}]);
    house('georgetown-right-wing',s.X(469),s.X(660),floor,s.Y(301),s.Y(231),0,-.64,windows([490,549,578,631]));
    for(const [name,l,r,eave,peak,front,back]of [['slim-tower',209,250,209,145,.068,-.23],['clock-tower',386,468,114,25,.095,-.30],['right-tower',594,638,252,184,.075,-.23]]) {
      const left=s.X(l),right=s.X(r),cx=(left+right)/2,width=right-left,top=s.Y(eave),depth=front-back;
      const wh=Math.min(.12,width*.6),win=[{name:'lancet-low',x:0,y:.35,w:width*.33,h:.22},{name:'lancet-top',x:0,y:top-(name==='clock-tower'?.49:.31),w:width*.33,h:.16}];
      for(const [side,z,a]of [['front',front,0],['back',back,Math.PI]])wall(e,`georgetown-${name}-${side}`,width,floor,top,[cx,0,z],a,win);
      for(const [side,xx,a]of [['left',left,-Math.PI/2],['right',right,Math.PI/2]])wall(e,`georgetown-${name}-${side}`,depth,floor,top,[xx,0,(front+back)/2],a,win.map(w=>({...w,w:Math.min(wh,.073)})));
      box(e,`georgetown-${name}-floor`,[left,floor,back],[right,floor+.025,front],stone);
      box(e,`georgetown-${name}-upper-course`,[left-.014,top-.03,back-.014],[right+.014,top+.022,front+.014],gtTrim);
      // Four-sided closed pyramids have real depth, unlike the old XY spires.
      const spire=new THREE.ConeGeometry(Math.SQRT1_2,s.Y(peak)-top,4);spire.rotateY(Math.PI/4);spire.scale(width+.045,1,depth+.045);
      add(e,`georgetown-${name}-slate-spire`,spire,roof,[cx,(s.Y(peak)+top)/2,(front+back)/2]);
      cyl(e,`georgetown-${name}-finial`,.004,.006,.055,[cx,s.Y(peak)+.027,(front+back)/2],gold,6);
      for(const xx of [left,right])for(const z of [front,back])box(e,`georgetown-${name}-corner-${xx}-${z}`,[xx-.012,floor,z-.014],[xx+.012,top,z+.014],gtTrim);
      if(name==='clock-tower') {
        const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#d7c8a4';ctx.fillRect(0,0,256,256);ctx.fillStyle='#eee5cb';ctx.beginPath();ctx.arc(128,128,109,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#5d5546';ctx.lineWidth=8;ctx.stroke();
        ctx.lineWidth=5;for(let j=0;j<12;j++){const a=j*Math.PI/6;ctx.beginPath();ctx.moveTo(128+Math.sin(a)*85,128-Math.cos(a)*85);ctx.lineTo(128+Math.sin(a)*101,128-Math.cos(a)*101);ctx.stroke();}ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(128,62);ctx.lineTo(128,128);ctx.lineTo(180,153);ctx.stroke();
        const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;resources.add(tex);const clock=material('healy-clock-face','#ffffff',{map:tex,roughness:.82});
        for(const [side,z,a]of [['front',front,0],['back',back,Math.PI]]) {
          cyl(e,`georgetown-clock-${side}-rim`,.079,.079,.018,[cx,s.Y(157),z],gtTrim,radial,[Math.PI/2,0,0]);
          box(e,`georgetown-clock-${side}-printed-face`,[cx-.069,s.Y(157)-.069,z+(a?-.011:.007)],[cx+.069,s.Y(157)+.069,z+(a?-.007:.011)],clock);
        }
      }
    }
    for(let j=0;j<4;j++)box(e,`georgetown-grounded-door-step-${j}`,[s.X(332)-.16-j*.018,0,.047+j*.04],[s.X(332)+.16+j*.018,floor-j*.026,.088+j*.04],cream);
    for(let j=0;j<6;j++)add(e,`georgetown-low-shrub-${j}`,new THREE.DodecahedronGeometry(.065),leaf,[s.X(35+j*125),floor+.045,.025]);
    for(const xx of [s.X(300),s.X(365)])cyl(e,`georgetown-door-lamp-${xx}`,.013,.013,.038,[xx,.29,.075],lampMat,6);
    const light=new THREE.PointLight('#ffd89b',0,.6,2);light.name='georgetown-real-entry-lamp';light.position.set(s.X(332),.31,.18);e.root.add(light);lights.push({light,intensity:.13});
    caption('ms','M.S. · Georgetown',65/85,214/85,.40);
    target(e,'education-ms','school',s.point(426,192,.14),'M.S. · Georgetown',{school:'ms',focus:{education:'ms'}});coll(e,'georgetown-campus',s.X(51),s.X(666),-.95,.13,2);
  }
  const lehighCampus=createLehighCampus({source:phd,quality});e.root.add(lehighCampus.root);lehighCampus.resources.forEach(r=>resources.add(r));parts.push(...lehighCampus.parts);e.parts.push(...lehighCampus.parts);
  caption('phd','Ph.D. · Lehigh',301.5/85,209/85,.43);target(e,'education-phd','school',phd.point(320,198,.15),'Ph.D. · Lehigh',{school:'phd',focus:{education:'phd'}});coll(e,'lehigh-campus',phd.X(25),phd.X(723),-1.02,.25,2);
  // Grounded 360-degree branch sculptures; every leaf has physical thickness.
  function branch(st,name,points,radii) {
    for(let i=0;i<points.length-1;i++)tube(st,`${name}-segment-${i}`,points[i],points[i+1],radii[i],radii[i+1]);
    for(let i=1;i<points.length-1;i++)add(st,`${name}-joint-${i}`,new THREE.DodecahedronGeometry(radii[i]*1.04),bark,points[i]);
  }
  function leaves(st,name,p,size=.18) {
    for(let i=0;i<3;i++){const g=new THREE.DodecahedronGeometry(size*(1-i*.13));g.scale(1,.72,.83);add(st,`${name}-${i}`,g,i===1?leafLight:leaf,[p[0]+(i-1)*size*.7,p[1]+i*size*.16,p[2]+(i%2?size*.34:-size*.23)]);}
  }
  function rope(st,name,start,end){tube(st,name,start,end,.0045,.0045,ropeMat);for(const [i,p]of [start,end].entries())add(st,`${name}-knot-${i}`,new THREE.TorusGeometry(.009,.0025,4,8),ropeMat,p);}
  {
    branch(e,'education-rooted-branch',[[-3.98,0,-.1],[-4.01,.30,-.10],[-3.97,1.2,-.08],[-4.02,2.35,-.12],[-4.04,3.06,-.10]],[.16,.085,.06,.047,.008]);
    branch(e,'education-sign-support',[[-4.02,2.81,-.12],[-3.80,2.94,-.10],[-3.37,2.92,-.12],[-2.97,3.03,-.08]],[.046,.037,.021,.008]);
    for(const [i,p]of [[0,[-4.28,0,-.18]],[1,[-3.72,0,.01]],[2,[-3.97,0,-.43]]])tube(e,`education-ground-root-${i}`,[-3.98,.13,-.1],p,.08,.015,bark);
    board(e,'education-hanging-carved-plaque','EDUCATION',-300/85,(560-358)/85,.082,151/85,.31);
    rope(e,'education-left-rope',[-4.015,2.83,-.105],[-349/85,(560-345)/85,.061]);rope(e,'education-right-rope',[-3.02,3.014,-.09],[-251/85,(560-345)/85,.061]);
    // Two restrained narrow leaves, each solid, held by a fine stem.
    tube(e,'education-fine-leaf-stem',[-3.05,3.01,-.07],[-3.12,2.90,-.055],.005,.003,bark);
    for(const [i,p,a]of [[0,[-3.14,2.91,-.05],-.55],[1,[-3.08,2.94,-.05],.55]]){const g=new THREE.OctahedronGeometry(.045);g.scale(.26,1.5,.25);add(e,`education-thin-branch-leaf-${i}`,g,leaf,p,[0,0,a]);}
    coll(e,'education-rooted-branch',-4.13,-3.78,-.28,.18,3.2);
  }
  {
    const trunk=[[-2.7,0,-.14],[-2.61,.42,-.18],[-2.76,1.25,-.14],[-2.96,2.2,-.19],[-2.92,2.72,-.17],[-2.52,3.12,-.15]];
    branch(c,'contact-oak-trunk',trunk,[.29,.23,.20,.17,.12,.09]);
    const arm=[[-2.52,3.12,-.15],[-2.07,3.30,-.16],[-1.65,3.07,-.13],[-1.32,3.17,-.15],[-.83,3.14,-.13],[-.29,2.96,-.10]];
    branch(c,'contact-sign-support-branch',arm,[.09,.074,.057,.042,.027,.009]);
    for(const [i,points]of [[0,[[-2.87,2.57,-.18],[-3.05,3.15,-.24],[-2.80,3.50,-.20]]],[1,[[-2.07,3.30,-.16],[-1.74,3.65,-.22],[-1.22,3.74,-.19]]],[2,[[-1.32,3.17,-.15],[-1.02,3.60,-.07],[-.68,3.73,-.08]]],[3,[[-.57,3.05,-.12],[-.15,3.33,-.09],[.13,3.25,-.12]]]]){branch(c,`contact-oak-upper-branch-${i}`,points,[.05,.028,.008]);leaves(c,`contact-oak-leaf-cluster-${i}`,points[2],.18);}
    for(const [i,p]of [[0,[-3.62,0,.11]],[1,[-3.12,0,-.50]],[2,[-2.20,0,.05]],[3,[-1.65,0,-.07]],[4,[-2.52,0,-.62]]])branch(c,`contact-oak-ground-root-${i}`,[[-2.65,.24,-.15],[(p[0]-2.65)/2,.08,p[2]],p],[.14,.08,.01]);
    board(c,'contact-hanging-carved-plaque','CONTACT',-130/85,(560-344)/85,.042,130/85,.31);
    rope(c,'contact-left-plaque-rope',[-178/85,3.29,-.16],[-178/85,(560-331)/85,.027]);rope(c,'contact-right-plaque-rope',[-82/85,3.16,-.14],[-82/85,(560-331)/85,.027]);
    coll(c,'contact-oak-trunk',-3.11,-2.27,-.57,.19,3.4);
  }
  // Complete hollow arched postbox with genuine letter opening and closed rear.
  let mailed=false;const letterGroup=new THREE.Group();letterGroup.name='contact-animated-original-envelope';letterGroup.visible=false;c.root.add(letterGroup);
  const envelopeCentre=[43/85,(560-439.5)/85,.08];let flagPivot;
  {
    const cx=.61,bottom=1.03,w=.78,h=.78,front=.046,back=-.31;
    box(c,'contact-mailbox-stone-footing',[2/85,0,-.26],[98/85,.047,.40],stone);
    for(const [i,xx]of [[0,.35],[1,.88]]) {
      box(c,`mailbox-grounded-wood-leg-${i}`,[xx-.043,.047,-.12],[xx+.043,bottom+.025,.06],wood);
      box(c,`mailbox-wood-ground-foot-${i}`,[xx-.11,.047,-.20],[xx+.11,.092,.16],darkWood);
    }
    box(c,'mailbox-under-box-support',[cx-w/2-.045,1.005,-.32],[cx+w/2+.045,1.05,.082],wood);
    box(c,'mailbox-lower-wood-crossbar',[.31,.68,-.10],[.92,.75,.04],wood);
    const shape=arch(w,h,cx,bottom);shape.holes=[new THREE.Path(arch(w-.055,h-.035,cx,bottom+.025).getPoints(curves))];
    add(c,'mailbox-real-hollow-red-shell',softExtrude(shape,front-back,.0015),red,[0,0,back]);
    add(c,'mailbox-closed-rear',softExtrude(arch(w-.035,h-.018,cx,bottom+.008),.018,.0015),red,[0,0,back-.012]);
    c.mailSlot=post.point(91,92,.075);const slotX=c.mailSlot[0],slotY=c.mailSlot[1];
    const door=arch(w-.085,h-.055,cx,bottom+.033);door.holes=[new THREE.Path([new THREE.Vector2(slotX-.16,slotY-.043),new THREE.Vector2(slotX+.16,slotY-.043),new THREE.Vector2(slotX+.16,slotY+.043),new THREE.Vector2(slotX-.16,slotY+.043)])];
    add(c,'mailbox-recessed-door-with-real-slot',softExtrude(door,.025,.0015),red,[0,0,.023]);
    box(c,'mailbox-dark-letter-pocket',[slotX-.175,slotY-.06,-.22],[slotX+.175,slotY+.06,-.208],mailInside);
    for(const [i,yy]of [[0,slotY-.047],[1,slotY+.047]])box(c,`mailbox-brass-slot-rim-${i}`,[slotX-.177,yy-.009,.043],[slotX+.177,yy+.009,.064],gold);
    for(const yy of [1.18,1.43,1.62])box(c,`mailbox-door-attached-hinge-${yy}`,[.917,yy-.026,.036],[.961,yy+.026,.074],gold);
    cyl(c,'mailbox-brass-door-latch',.015,.015,.032,[.32,1.21,.061],gold,8,[Math.PI/2,0,0]);
    flagPivot=new THREE.Group();flagPivot.name='mailbox-brass-flag-real-hinge';flagPivot.position.set(80/85,(560-448)/85,.11);c.root.add(flagPivot);
    tube(c,'mailbox-flag-arm',[0,0,0],[0,.25,0],.009,.009,gold,flagPivot);box(c,'mailbox-raised-brass-flag',[0,.17,-.01],[.16,.26,.01],gold,flagPivot);
    flagPivot.rotation.z=-Math.PI/2;
    box(c,'mailbox-existing-envelope',[-11/85,-6.5/85,-.002],[11/85,6.5/85,.002],paper,letterGroup);
    for(const [i,a,b]of [[0,[-11/85,6.5/85,.0025],[0,-.012,.0025]],[1,[11/85,6.5/85,.0025],[0,-.012,.0025]]])tube(c,`letter-fold-${i}`,a,b,.0012,.0012,ink,letterGroup);
    const mailPoint=[post.X(91),0,.63];c.actionStand.mail={point:mailPoint,facing:Math.PI};target(c,'contact-mailbox','mail',c.mailSlot,'Email Hanjing',{href:links.email?`mailto:${links.email}`:null,stand:mailPoint,facing:Math.PI});coll(c,'contact-mailbox-post',post.X(18),post.X(198),-.34,.37,1.85);
  }
  {
    const cx=signs.X(244),postTop=signs.Y(0),front=.041;
    box(c,'contact-link-stone-ground-foot',[cx-.18,0,-.29],[cx+.18,.10,.11],stone);
    box(c,'contact-link-rooted-wood-post',[cx-.085,.10,-.25],[cx+.085,postTop-.045,-.08],wood);
    add(c,'contact-link-post-cap',new THREE.ConeGeometry(.143,.11,4),darkWood,[cx,postTop-.003,-.165],[0,Math.PI/4,0]);
    for(const [id,nativeY,text,href,direction]of [['scholar',173,'Scholar',links.scholar,-1],['linkedin',321,'LinkedIn',links.linkedin,1],['github',469,'GitHub',links.github,-1]]) {
      const cy=signs.Y(nativeY),w=1.55,h=.29,left=cx-w/2,right=cx+w/2;
      const outline=direction<0?[[left,cy],[left+.18,cy+h/2],[right,cy+h/2],[right,cy-h/2],[left+.18,cy-h/2]]:[[left,cy-h/2],[right-.18,cy-h/2],[right,cy],[right-.18,cy+h/2],[left,cy+h/2]];
      polygon(c,`contact-link-${id}-solid-arrow`,outline,front,.067,wood);
      const label=labelMaterial(`contact-${id}-carved-lettering`,text,w-.22,h);
      box(c,`contact-link-${id}-inset-print`,[cx-.55,cy-.124,front-.002],[cx+.55,cy+.124,front+.001],label);
      branch(c,`contact-link-${id}-cross-branch`,[[cx,cy+.24,-.17],[cx-.48,cy+.22,-.12],[cx-.59,cy+.20,-.11]],[.025,.015,.006]);
      branch(c,`contact-link-${id}-right-branch`,[[cx,cy+.24,-.17],[cx+.48,cy+.22,-.12],[cx+.59,cy+.20,-.11]],[.025,.015,.006]);
      rope(c,`contact-link-${id}-left-hemp`,[cx-.48,cy+.22,-.12],[cx-.48,cy+.12,.025]);rope(c,`contact-link-${id}-right-hemp`,[cx+.48,cy+.22,-.12],[cx+.48,cy+.12,.025]);
      target(c,`contact-${id}`,'link',signs.point(244,nativeY,.081),text,{href,key:id});
    }
    for(const [i,p]of [[0,[cx-.20,.08,-.15]],[1,[cx+.16,.09,-.18]]]){const g=new THREE.DodecahedronGeometry(.13);g.scale(1,.65,.75);add(c,`contact-post-ground-rock-${i}`,g,stone,p);}
    coll(c,'contact-carved-link-post',signs.X(187),signs.X(302),-.31,.17,2.6);
  }
  e.actionStand.cap={point:[.12,0,1.78],facing:Math.PI};e.actionStand.graduate=e.actionStand.cap;target(e,'education-graduation-ceremony','cap',[.12,.85,1.78],'Graduation cap',{stand:e.actionStand.cap.point,facing:Math.PI});
  e.walkAreas.push({minX:-4.4,maxX:4.8,minZ:.65,maxZ:2.9,y:0},{minX:-.38,maxX:.21,minZ:-1.16,maxZ:.65,y:0});
  c.walkAreas.push({minX:.31,maxX:.87,minZ:.615,maxZ:.98,y:0},{minX:-4.1,maxX:3.97,minZ:.65,maxZ:2.9,y:0},{minX:-.22,maxX:.18,minZ:-1.1,maxZ:.65,y:0},{minX:1.24,maxX:2.03,minZ:-1.1,maxZ:.65,y:0});
  let triangles=lehighCampus.diagnostics.triangles;
  for(const {st,m,gs}of batches.values()) {
    const converted=gs.map(g=>g.index?g.toNonIndexed():g),g=mergeGeometries(converted,false);if(!g)throw new Error(`Cannot merge ${st.id}/${m.name}`);
    for(const old of new Set([...gs,...converted]))old.dispose();g.computeBoundingSphere();resources.add(g);
    const mesh=new THREE.Mesh(g,m);mesh.name=`merged-${st.id}-${m.name}`;mesh.castShadow=mesh.receiveShadow=true;st.root.add(mesh);triangles+=g.attributes.position.count/3;
  }
  root.updateMatrixWorld(true);for(const st of [e,c])st.bounds=new THREE.Box3().setFromObject(st.root);
  const setTheme=dark=>{lehighCampus.setTheme(dark);glass.emissiveIntensity=dark?.85:0;lampMat.emissiveIntensity=dark?1.2:0;for(const {light,intensity}of lights)light.intensity=dark?intensity:0;};
  function setMailProgress(progress){const p=THREE.MathUtils.clamp(progress,0,1);if(p>=.86)mailed=true;const insert=THREE.MathUtils.smoothstep(p,.28,.75);letterGroup.visible=p>.19&&p<.77;letterGroup.position.set(envelopeCentre[0],THREE.MathUtils.lerp(envelopeCentre[1],c.mailSlot[1],insert),THREE.MathUtils.lerp(.275,-.05,insert));letterGroup.rotation.x=-Math.PI/2*THREE.MathUtils.smoothstep(p,.2,.68);flagPivot.rotation.z=mailed?0:-Math.PI/2*(1-THREE.MathUtils.smoothstep(p,.67,.95));}
  setTheme(false);setMailProgress(0);
  return {root,scenes:[e,c],setTheme,setMailProgress,update(){},dispose(){for(const r of resources)r.dispose?.();root.removeFromParent();},diagnostics:{construction:'Closed polygonal 360-degree outdoor school miniatures and contact props; opaque lit PBR surfaces, true recessed glazing and attached printed boards.',parts:parts.length,triangles,lehigh:lehighCampus.diagnostics,staticDrawCalls:batches.size+lehighCampus.diagnostics.drawCalls,lights:lights.length,sourceTextures:0,partManifest:parts,attachments,limitations:['Campus keepsakes intentionally retain small scale, not human-sized entrances.','Back and side details are interpreted from landmark architecture.']}};
}
