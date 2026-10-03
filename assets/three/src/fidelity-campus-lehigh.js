import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Small solid Packer Chapel keepsake. Window surrounds intersect their own
 * wall plane; each recess is a real opening with glass set inside it. */
export function createLehighCampus({source:s,quality='high'}) {
  const root=new THREE.Group();root.name='lehigh-complete-chapel';
  const resources=new Set(),parts=[],buckets=new Map(),attachments=[];
  const radial=quality==='low'?12:24,curves=quality==='low'?3:6;
  const mat=(name,color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});m.name=`lehigh-${name}`;resources.add(m);return m;};
  const stone=mat('warm-sandstone','#b69c75'),trim=mat('carved-limestone','#d0b88c'),base=mat('grounded-stone-plinth','#958a73');
  const roof=mat('soft-slate-roof','#485664',{roughness:.67}),lead=mat('window-lead-and-door-hardware','#45474b',{metalness:.25});
  const wood=mat('recessed-oak-door','#665139'),glass=mat('stained-glass','#667d83',{roughness:.42,emissive:'#ffc46d',emissiveIntensity:0});
  const roseGlass=mat('rose-amber-glass','#c19e73',{roughness:.45,emissive:'#ffd091',emissiveIntensity:0}),greenery=mat('rounded-campus-planting','#71815c');
  const x=n=>s.X(n),y=n=>s.Y(n);
  function add(name,g,m,p=[0,0,0],rotation=[0,0,0],extra={}) {
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));
    g.computeBoundingBox();parts.push({name,scene:'education',min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray(),construction:'closed polygonal chapel component',...extra});
    if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g);return g;
  }
  const box=(name,min,max,m=stone)=>add(name,new THREE.BoxGeometry(...max.map((v,i)=>v-min[i])),m,min.map((v,i)=>(v+max[i])/2));
  const cyl=(name,rt,rb,h,p,m,segments=radial,rot=[0,0,0])=>add(name,new THREE.CylinderGeometry(rt,rb,h,segments),m,p,rot);
  function arch(w,h,cx=0,bottom=0) {
    const q=new THREE.Shape();q.moveTo(cx-w/2,bottom);q.lineTo(cx+w/2,bottom);q.lineTo(cx+w/2,bottom+h-w/2);
    q.absarc(cx,bottom+h-w/2,w/2,0,Math.PI,false);q.lineTo(cx-w/2,bottom);return q;
  }
  const pathOf=shape=>new THREE.Path(shape.getPoints(curves));
  function brickCourses(name,outline,holes,thickness,p,angle) {
    const minX=Math.min(...outline.map(v=>v[0])),maxX=Math.max(...outline.map(v=>v[0])),minY=Math.min(...outline.map(v=>v[1])),maxY=Math.max(...outline.map(v=>v[1]));
    const blocked=holes.map(h=>h.getPoints(curves)).map(q=>({l:Math.min(...q.map(v=>v.x))-.018,r:Math.max(...q.map(v=>v.x))+.018,b:Math.min(...q.map(v=>v.y))-.012,t:Math.max(...q.map(v=>v.y))+.012}));
    const inside=(xx,yy)=>{let ok=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a[1]>yy)!==(b[1]>yy)&&xx<(b[0]-a[0])*(yy-a[1])/(b[1]-a[1])+a[0])ok=!ok;}return ok;};
    const bw=quality==='low'?.17:.135,bh=quality==='low'?.10:.082,pose=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,angle,0)),new THREE.Vector3(1,1,1));
    for(let row=0,yy=minY+.005;yy+bh<maxY;row++,yy+=bh)for(let xx=minX-(row%2)*bw/2;xx<maxX;xx+=bw) {
      const l=Math.max(minX+.004,xx+.004),r=Math.min(maxX-.004,xx+bw-.004),b=yy,t=yy+bh-.007;
      if(r-l<.028||![[l,b],[r,b],[l,t],[r,t]].every(q=>inside(...q))||blocked.some(q=>l<q.r&&r>q.l&&b<q.t&&t>q.b))continue;
      const g=new THREE.BoxGeometry(r-l,t-b,.009);g.translate((l+r)/2,(b+t)/2,thickness+.0015);g.applyMatrix4(pose);add(`${name}-stone-block-${row}-${Math.round(xx*1000)}`,g,stone);
    }
  }
  function slab(name,outline,holes,thickness,p,angle,m=stone) {
    const q=new THREE.Shape(outline.map(v=>new THREE.Vector2(...v)));q.holes=holes.map(h=>pathOf(h));
    const g=add(name,new THREE.ExtrudeGeometry(q,{depth:thickness,bevelEnabled:false,curveSegments:curves}),m,p,[0,angle,0]);
    if(m===stone)brickCourses(name,outline,holes,thickness,p,angle);return g;
  }
  // All decorative frames have one section inside the wall, never hovering.
  function panel(name,w,h,bottom,cx,plane,angle,isDoor=false) {
    const pose=new THREE.Matrix4().compose(new THREE.Vector3(cx,bottom,plane),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,angle,0)),new THREE.Vector3(1,1,1));
    const placed=(suffix,g,m,offset)=>{g.translate(...offset);g.applyMatrix4(pose);return add(`${name}-${suffix}`,g,m);};
    const rim=arch(w+.028,h+.018,-0,-.009);rim.holes=[pathOf(arch(w,h))];
    placed('attached-stone-frame',new THREE.ExtrudeGeometry(rim,{depth:.026,bevelEnabled:false,curveSegments:curves}),trim,[0,0,-.012]);
    placed('recessed-pane',new THREE.ExtrudeGeometry(arch(w-.006,h-.009),{depth:.012,bevelEnabled:false,curveSegments:curves}),isDoor?wood:glass,[0,.003,-.023]);
    placed('centre-lead',new THREE.BoxGeometry(.006,h-w*.3,.008),lead,[0,(h-w*.3)/2,-.004]);
    if(!isDoor)for(const f of [.35,.66])placed(`cross-lead-${f}`,new THREE.BoxGeometry(w-.008,.006,.008),lead,[0,h*f,-.004]);
    else placed('door-knob',new THREE.SphereGeometry(.007,8,4),lead,[w*.2,h*.43,.01]);
    attachments.push({name,wallPlane:plane,angle,frameBack:-.012,frameFront:.014,paneFront:-.011});
  }
  function nave(name,l,r,eave,peak,front,back,windows) {
    const middle=(l+r)/2,outline=[[l,.105],[r,.105],[r,eave],[middle,peak],[l,eave]];
    for(const [side,z,a]of [['front',front,0],['back',back,Math.PI]]) {
      const mirror=a===Math.PI?-1:1;
      const localOutline=outline.map(([xx,yy])=>[mirror*xx,yy]);
      const holes=windows.map(w=>w.circle?new THREE.Shape().absarc(mirror*w.x,w.y,w.r,0,Math.PI*2,false):arch(w.w,w.h,mirror*w.x,w.y));
      slab(`${name}-${side}-recessed-wall`,localOutline,holes,.04,[0,0,z-.04*mirror],a,stone);
      for(const w of windows)if(!w.circle)panel(`${name}-${side}-${w.name}`,w.w,w.h,w.y,w.x,z,a,w.door);
      else {
        add(`${name}-${side}-rose-attached-frame`,new THREE.TorusGeometry(w.r+.009,.014,6,radial),trim,[w.x,w.y,z],undefined);
        cyl(`${name}-${side}-rose-inset-glass`,w.r-.008,w.r-.008,.014,[w.x,w.y,z-.016*mirror],roseGlass,radial,[Math.PI/2,0,0]);
        for(let j=0;j<8;j++)add(`${name}-${side}-rose-tracery-${j}`,new THREE.BoxGeometry(.009,w.r*1.85,.009),trim,[w.x,w.y,z-.003*mirror],[0,0,j*Math.PI/8]);
      }
    }
    const depth=front-back;
    // End walls are physically cut around their windows as well.
    for(const [side,xx,a]of [['left',l,-Math.PI/2],['right',r,Math.PI/2]]) {
      const width=depth,centreZ=(front+back)/2,bottom=.29,h=.28,w=.10;
      slab(`${name}-${side}-end-wall`,[[-width/2,.105],[width/2,.105],[width/2,eave],[-width/2,eave]],[arch(w,h,0,bottom)],.04,[xx-.04*Math.sin(a),0,centreZ],a);
      const pose=new THREE.Matrix4().compose(new THREE.Vector3(xx,bottom,centreZ),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,a,0)),new THREE.Vector3(1,1,1));
      const rim=arch(w+.028,h+.018,0,-.009);rim.holes=[pathOf(arch(w,h))];
      const g=new THREE.ExtrudeGeometry(rim,{depth:.026,bevelEnabled:false,curveSegments:curves});g.translate(0,0,-.012);g.applyMatrix4(pose);add(`${name}-${side}-window-attached-frame`,g,trim);
      const pane=new THREE.ExtrudeGeometry(arch(w-.006,h-.009),{depth:.012,bevelEnabled:false,curveSegments:curves});pane.translate(0,.003,-.023);pane.applyMatrix4(pose);add(`${name}-${side}-window-recessed-pane`,pane,glass);
    }
    box(`${name}-floor`,[l,.105,back],[r,.125,front],base);
    const half=(r-l)/2,rise=peak-eave,angle=Math.atan2(rise,half),span=(half+.035)/Math.cos(angle);
    for(const side of [-1,1]) {
      const p=[middle+side*(half+.035)/2,peak-rise*(half+.035)/(2*half)+.018/Math.cos(angle),(front+back)/2],rot=[0,0,-side*angle];
      add(`${name}-slate-roof-${side}`,new THREE.BoxGeometry(span,.036,depth+.10),roof,p,rot);
      const pose=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(1,1,1));
      const rows=Math.max(2,Math.ceil(span/(quality==='low'?.15:.105))),columns=Math.ceil((depth+.10)/(quality==='low'?.20:.145));
      for(let a=0;a<rows;a++)for(let b=0;b<columns;b++) {
        const g=new THREE.BoxGeometry(span/rows-.004,.012,(depth+.10)/columns-.006);g.translate(-span/2+(a+.5)*span/rows,.021,-(depth+.10)/2+(b+.5)*(depth+.10)/columns);g.applyMatrix4(pose);add(`${name}-lapped-slate-${side}-${a}-${b}`,g,roof);
      }
    }
    cyl(`${name}-closed-ridge`,.018,.018,depth+.10,[middle,peak+.025,(front+back)/2],roof,8,[Math.PI/2,0,0]);
  }
  const floor=.105,front=.025,back=-.905;
  box('lehigh-grounded-foundation',[x(25),0,-1.02],[x(723),floor,.145],base);
  nave('lehigh-main-nave',x(215),x(427),y(132),y(23),front,back,[
    {name:'door',x:x(323),y:floor,w:.18,h:.40,door:true},
    ...[246,397].map(n=>({name:`lancet-${n}`,x:x(n),y:y(347),w:.067,h:.265})),
    {name:'rose',x:x(323),y:y(177),r:.215,circle:true}]);
  nave('lehigh-left-wing',x(48),x(215),y(183),y(109),-.007,-.80,
    [91,132,174].flatMap(n=>[257,347].map(v=>({name:`window-${n}-${v}`,x:x(n),y:y(v),w:.066,h:.202}))));
  nave('lehigh-right-link',x(427),x(489),y(183),y(145),-.034,-.72,
    [{name:'window',x:(x(427)+x(489))/2,y:.36,w:.07,h:.23}]);
  // A faceted cylindrical apse, its cornice and conical roof use ONE axis.
  const centre=[x(574),0,-.44],radius=x(693)-x(574),wallTop=y(160),apothem=radius*Math.cos(Math.PI/8),width=2*radius*Math.sin(Math.PI/8);
  for(let j=0;j<8;j++) {
    const a=j*Math.PI/4,xx=centre[0]+apothem*Math.sin(a),zz=centre[2]+apothem*Math.cos(a),hasWindow=j!==6;
    slab(`lehigh-apse-wall-${j}`,[[-width/2,floor],[width/2,floor],[width/2,wallTop],[-width/2,wallTop]],hasWindow?[arch(.09,.40,0,.27)]:[],.04,[xx-.04*Math.sin(a),0,zz-.04*Math.cos(a)],a);
    if(hasWindow) {
      const pose=new THREE.Matrix4().compose(new THREE.Vector3(xx,.27,zz),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,a,0)),new THREE.Vector3(1,1,1));
      const rim=arch(.118,.418,0,-.009);rim.holes=[pathOf(arch(.09,.40))];
      const g=new THREE.ExtrudeGeometry(rim,{depth:.026,bevelEnabled:false,curveSegments:curves});g.translate(0,0,-.012);g.applyMatrix4(pose);add(`lehigh-apse-window-${j}-attached-frame`,g,trim);
      const pane=new THREE.ExtrudeGeometry(arch(.084,.391),{depth:.012,bevelEnabled:false,curveSegments:curves});pane.translate(0,.003,-.023);pane.applyMatrix4(pose);add(`lehigh-apse-window-${j}-recessed-pane`,pane,glass);
    }
  }
  cyl('lehigh-apse-foot-course',radius+.018,radius+.018,.075,[centre[0],floor+.0375,centre[2]],base,8);
  cyl('lehigh-apse-floor',radius,radius,.022,[centre[0],floor+.011,centre[2]],base,8);
  cyl('lehigh-apse-cornice',radius+.027,radius+.027,.045,[centre[0],wallTop,centre[2]],trim,8);
  const apex=y(53),roofBase=wallTop+.022;
  cyl('lehigh-shared-axis-conical-roof',0,radius+.04,apex-roofBase,[centre[0],(apex+roofBase)/2,centre[2]],roof,8);
  cyl('lehigh-apse-attached-finial',.008,.012,.12,[centre[0],apex+.059,centre[2]],trim,8);
  for(let j=1;j<=4;j++) {
    const yy=roofBase+(apex-roofBase)*j/5,r=(radius+.04)*(1-j/5);
    cyl(`lehigh-apse-layered-slate-course-${j}`,r-.008,r+.011,.027,[centre[0],yy,centre[2]],roof,8);
  }
  for(let j=0;j<12;j++)box(`lehigh-foundation-front-block-${j}`,[x(25)+(x(723)-x(25))*j/12+.004,.009,.139],[x(25)+(x(723)-x(25))*(j+1)/12-.004,.095,.151],base);
  // Buttresses are embedded in the ACTUAL local wing wall plane.
  for(const [n,f,b,top]of [[48,-.007,-.80,y(187)],[215,front,back,y(146)],[427,front,back,y(146)]]) {
    box(`lehigh-front-buttress-${n}`,[x(n)-.025,floor,f-.015],[x(n)+.025,top,f+.035],trim);
    box(`lehigh-rear-buttress-${n}`,[x(n)-.025,floor,b-.035],[x(n)+.025,top,b+.015],trim);
  }
  for(let i=0;i<4;i++)box(`lehigh-door-step-${i}`,[x(323)-.16-i*.018,0,front+.04+i*.04],[x(323)+.16+i*.018,.105-i*.026,front+.08+i*.04],base);
  for(let j=0;j<5;j++)add(`lehigh-low-shrub-${j}`,new THREE.DodecahedronGeometry(.06),greenery,[x(55+j*22),floor+.047,.083]);
  const doorLight=new THREE.PointLight('#ffd29a',0,.65,2);doorLight.name='lehigh-real-entry-warm-light';doorLight.position.set(x(323),.56,.16);root.add(doorLight);
  let triangles=0;
  for(const [m,gs]of buckets) {
    const converted=gs.map(g=>g.index?g.toNonIndexed():g),g=mergeGeometries(converted,false);
    if(!g)throw new Error(`Cannot merge ${m.name}`);for(const old of new Set([...gs,...converted]))old.dispose();
    g.computeBoundingSphere();resources.add(g);const mesh=new THREE.Mesh(g,m);mesh.name=`lehigh-merged-${m.name}`;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);triangles+=g.attributes.position.count/3;
  }
  const setTheme=dark=>{glass.emissiveIntensity=dark?.95:0;roseGlass.emissiveIntensity=dark?.8:0;doorLight.intensity=dark?.14:0;};setTheme(false);
  return {root,resources,parts,setTheme,diagnostics:{triangles,drawCalls:buckets.size,groundY:0,apseAxis:[centre[0],centre[2]],attachments,style:'warm polygonal complete chapel with true window recesses'}};
}
